# isNewNavigation()の設計見直し考察

**作成日**: 2025-11-22
**関連Issue**: PC NavigationManagerバグ（SPA遷移の誤検出）

## 根本的問題

### 現在の実装の問題点

```javascript
static isNewNavigation() {
    const navEntries = performance.getEntriesByType('navigation');
    if (navEntries.length > 0) {
        const navType = navEntries[0].type;
        return navType === 'navigate';
    }
    // ...
}
```

**問題**: `performance.getEntriesByType('navigation')`は**ページの初回ロード時**のナビゲーションタイプを返す。SPAではページリロードしない限り、この値は**常に最初のロード時の値のまま**。

つまり：
- ユーザーがブックマークでアクセス → `navigate`
- その後SPA内で遷移 → **まだ`navigate`のまま**（更新されない）

## 本来検出したいもの

| シナリオ | 期待する判定 | 現在の判定 |
|---------|-------------|-----------|
| ブックマークからアクセス | ✅ 新規ナビゲーション | ✅ navigate |
| URL直接入力 | ✅ 新規ナビゲーション | ✅ navigate |
| SPA内遷移（準備→トレーニング） | ❌ SPA遷移 | ❌ navigate（誤判定）|
| リロード | ❌ リロード | ✅ reload |
| ブラウザバック | ❌ 履歴操作 | ✅ back_forward |

## 設計見直しの方向性

### アプローチ1: フラグベースの完全移行（推奨）

`isNewNavigation()`を廃止し、**2フラグシステムのみで判定**する。

```javascript
// 新しい設計: isNewNavigation()を使わない
static async checkPageAccess(page) {
    // trainingページのアクセス検証
    if (page === 'training') {
        const hasNormalTransition = sessionStorage.getItem(this.KEYS.NORMAL_TRANSITION) === 'true';
        const wasPageActive = sessionStorage.getItem('trainingPageActive') === 'true';
        
        if (hasNormalTransition) {
            // 正常なSPA遷移
            console.log('✅ 正常なSPA遷移（フラグあり）');
            sessionStorage.removeItem(this.KEYS.NORMAL_TRANSITION);
            return { shouldContinue: true };
        }
        
        if (wasPageActive) {
            // リロード検出（別ロジックで処理）
            return this.handleReload(page);
        }
        
        // フラグなし = ダイレクトアクセス
        console.log('⚠️ ダイレクトアクセス検出（フラグなし）');
        return this.handleDirectAccess(page);
    }
}
```

**メリット**:
- Navigation Timing APIの制約に依存しない
- 2フラグシステムとの整合性が完全
- PCとiPhoneの挙動差がなくなる

**デメリット**:
- フラグが残存するエッジケースへの対応が必要

### アプローチ2: セッション開始時刻との比較

```javascript
static isNewNavigation() {
    // セッション開始時刻を記録
    const sessionStart = sessionStorage.getItem('sessionStartTime');
    const now = Date.now();
    
    if (!sessionStart) {
        // 初回アクセス
        sessionStorage.setItem('sessionStartTime', now.toString());
        return true;
    }
    
    // セッション開始から十分な時間が経過していれば、SPA内遷移
    const elapsed = now - parseInt(sessionStart);
    return elapsed < 1000; // 1秒以内なら新規ナビゲーション
}
```

**問題点**: タイミング依存で不安定

### アプローチ3: hashchange イベントの追跡

```javascript
// router.js で hashchange を追跡
static spaNavigationOccurred = false;

window.addEventListener('hashchange', () => {
    NavigationManager.spaNavigationOccurred = true;
});

// navigation-manager.js
static isNewNavigation() {
    // SPA遷移が一度でも発生していれば、新規ナビゲーションではない
    return !this.spaNavigationOccurred;
}
```

**問題点**: 初回ハッシュ付きアクセス（`#training?mode=...`）では`hashchange`が発火しない

### アプローチ4: Performance APIとフラグの組み合わせ（現在の修正 v4.6.2）

```javascript
static isNewNavigation() {
    // Navigation Timing APIで基本判定
    const navType = performance.getEntriesByType('navigation')[0]?.type;
    return navType === 'navigate';
}

// checkPageAccess()内で追加フィルタ
const hasNormalTransitionFlag = sessionStorage.getItem(this.KEYS.NORMAL_TRANSITION) === 'true';
if (page === 'training' && this.isNewNavigation() && !hasNormalTransitionFlag) {
    // ダイレクトアクセス
}
```

**現状の修正（v4.6.2）はこのアプローチ4**

## 推奨: アプローチ1への段階的移行

**Phase 1（現在）**: アプローチ4で暫定対応
- v4.6.2の修正で即座の問題を解決

**Phase 2（将来）**: `isNewNavigation()`の役割を縮小
- 2フラグシステムを主軸に
- `isNewNavigation()`は補助的な情報として使用（ログ出力等）

**Phase 3（最終）**: `isNewNavigation()`の廃止検討
- すべてのダイレクトアクセス検出を`NORMAL_TRANSITION`フラグベースに統一
- Navigation Timing APIへの依存を完全排除

## 仕様書への反映事項

この設計見直しを`NAVIGATION_RELOAD_DETECTION_SPECIFICATION.md`に追記すべき項目：

1. **`isNewNavigation()`の制約事項**: SPAでは正確な判定ができない理由
2. **2フラグシステムとの関係**: フラグが優先、APIは補助
3. **将来の方向性**: フラグベース完全移行の計画

## 関連ファイル

- `PitchPro-SPA/js/navigation-manager.js` - isNewNavigation()実装
- `specifications/NAVIGATION_RELOAD_DETECTION_SPECIFICATION.md` - v4.6.1仕様
- `specifications/SPA_DEVELOPMENT_JOURNEY_AND_ARCHITECTURE.md` - 2フラグシステム設計

## v4.6.2での暫定修正内容

```javascript
// navigation-manager.js lines 609-640
const hasNormalTransitionFlag = sessionStorage.getItem(this.KEYS.NORMAL_TRANSITION) === 'true';
if (page === 'training' && this.isNewNavigation() && !hasNormalTransitionFlag) {
    console.log('🔍 [v4.6.2] trainingページへの新規ナビゲーション検出（フラグなし）');
    // ダイレクトアクセス処理...
} else if (page === 'training' && hasNormalTransitionFlag) {
    console.log('✅ [v4.6.2] 正常なSPA遷移検出（NORMAL_TRANSITIONフラグあり）- ダイレクトアクセス検出スキップ');
}
```

この修正は**仕様書の2フラグシステム設計思想に準拠**した妥当な回避策。
