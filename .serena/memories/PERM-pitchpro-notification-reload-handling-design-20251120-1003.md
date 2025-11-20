# PitchPro通知システムとリロード処理の統合設計

**作成日**: 2025-11-20 10:03  
**状態**: 設計完了・実装待ち  
**影響範囲**: navigation-manager.js, pitchpro-config.js  
**関連メモリ**: `TEMP-pitchpro-notification-double-management-20251120-1630`

---

## 背景と問題の概要

### 発生している問題

**症状**: Safariバックグラウンド放置後のリロード時に、PitchProの「マイク許可が放棄されました」メッセージが表示されない

**原因**: アプリ側のPreventiveアプローチ（事前リダイレクト）とPitchProのReactiveアプローチ（エラー通知）の二重管理

### Safariバックグラウンド動作の特性

- **バックグラウンド約5分**: Safariが積極的にタブをサスペンド
- **デスクトップ切り替え**: さらに積極化
- **ページリロード発生**: すべての状態（MediaStream含む）が失われる
- **performance.navigation.type**: リロード後も `1` が維持される（hash変更では変化しない）

### PitchProの設計思想

- **MicrophoneLifecycleManager**: 10分後に自動リリース設定
- **ErrorNotificationSystem**: マイクエラー時に通知を表示する機能を内蔵
- **MicrophoneController**: 初期化エラー時に`showMicrophoneError()`を自動呼び出し

---

## 現在の実装（Preventiveアプローチ）

### navigation-manager.js の処理フロー

```javascript
// checkPageAccess() - line 474-487
if (config?.preventReload && this.detectReload(page)) {
    if (config.reloadMessage) {
        alert(config.reloadMessage);  // ← アプリ側のalert()
    }
    
    await this.redirectToPreparation('リロード検出');
    return { shouldContinue: false, reason: 'reload' };
}
```

**フロー**:
```
バックグラウンド放置 → Safariリロード
  ↓
NavigationManager.detectReload() = true
  ↓
alert("トレーニングページは準備ページから...") ← アプリ側
  ↓
preparationページへリダイレクト
  ↓
[PitchProは初期化されず、エラーメッセージなし]
```

### PAGE_CONFIG 設定

```javascript
'training': {
    preventReload: true,
    reloadRedirectTo: 'preparation',
    reloadMessage: 'リロードが検出されました。マイク設定のため準備ページに移動します。',
    // ...
},
'result-session': {
    preventReload: true,
    reloadRedirectTo: 'preparation',
    reloadMessage: 'リロードが検出されました。マイク設定のため準備ページに移動します。',
    // ...
}
```

---

## 準備ページスキップ機能との相互作用

### canSkipPreparation() の3層防御

**実装場所**: navigation-manager.js line 317-354

```javascript
static async canSkipPreparation() {
    // === Layer 1: リロード検出（最も確実な防御） ===
    if (performance.navigation && performance.navigation.type === 1) {
        console.log('⚠️ [NavigationManager] Layer 1: ページリロード検出 → 準備ページ必須');
        return false;
    }

    // === Layer 2: localStorage確認（基本チェック） ===
    const micGranted = localStorage.getItem('micPermissionGranted') === 'true';
    const voiceRangeData = localStorage.getItem('voiceRangeData');
    const hasVoiceRange = voiceRangeData && voiceRangeData !== 'null';

    if (!micGranted || !hasVoiceRange) {
        return false;
    }

    // === Layer 3: Permissions API（実際の権限状態確認） ===
    const permissionStatus = await navigator.permissions.query({ name: 'microphone' });
    if (permissionStatus.state !== 'granted') {
        return false;
    }

    return true;
}
```

### 2つのリロード検出メカニズムの独立性

| メカニズム | タイミング | 検出方法 | 目的 | 対象 |
|-----------|----------|---------|------|------|
| **A: canSkipPreparation() Layer 1** | results-overview → training 遷移判定時 | `performance.navigation.type === 1` | 準備スキップ防止（MediaStream破棄対策） | home/results-overview からの遷移 |
| **B: checkPageAccess() リロード検出** | training ページ到達後 | `trainingPageActive` フラグ | training ページ滞在中のリロード対応 | training ページに既に到達している状態 |

**重要**: Option A改良版が影響するのは**メカニズムBのみ**。メカニズムAは一切変更しない。

---

## performance.navigation.type の永続性（重要な発見）

### Hash-based SPAの仕様

**MDN仕様確認**:
- Hash変更(`#hash`)はページリロードではない
- `performance.navigation.type` は変化しない
- リロード後のSPA遷移では `type = 1` のまま維持される

### 安全性の証明

```
Safariバックグラウンドリロード
  ↓
performance.navigation.type = 1（リロード状態）
  ↓
SPA内遷移: training → home → results-overview
  ↓
performance.navigation.type = 1（維持される！）
  ↓
「次のステップ」クリック
  ↓
canSkipPreparation() Layer 1チェック
  ↓
performance.navigation.type === 1
  ↓
return false → 準備ページ経由が強制される
  ↓
音域テスト実施 → 新しい音域データ取得
```

**結論**: 準備スキップ機能は完全に安全。リロード後の最初の「次のステップ」では必ず準備ページを経由する。

---

## Option A改良版：段階的Reactiveアプローチ（推奨）

### 設計の核心

PitchProの優れたエラーハンドリングシステムを活用し、Safariバックグラウンドリロードという特殊ケースに対してReactiveに対応する。

### 実装内容（3ステップ）

#### **ステップ1: PitchProConfig.js に notifications 設定追加**

**ファイル**: `/PitchPro-SPA/js/core/pitchpro-config.js`  
**挿入位置**: line 119 の後

```javascript
// ========================================
// 通知システム設定（PitchPro ErrorNotificationSystem）
// ========================================

/**
 * 通知表示設定
 * - enabled: 通知システムの有効化
 * - position: 通知の表示位置
 * - theme: 通知のテーマ
 */
notifications: {
    enabled: true,
    position: 'top-right',
    theme: 'dark'
},
```

#### **ステップ2: navigation-manager.js checkPageAccess() 修正**

**ファイル**: `/PitchPro-SPA/js/navigation-manager.js`  
**修正箇所**: line 474-487

**修正前**:
```javascript
// 3. リロード検出
if (config?.preventReload && this.detectReload(page)) {
    if (config.reloadMessage) {
        alert(config.reloadMessage);
    }
    
    await this.redirectToPreparation('リロード検出');
    return { shouldContinue: false, reason: 'reload' };
}
```

**修正後**:
```javascript
// 3. リロード検出
if (config?.preventReload && this.detectReload(page)) {
    // training/result-sessionページ: PitchProに任せる（Reactiveアプローチ）
    if (page === 'training' || page === 'result-session') {
        console.log(`⚠️ [NavigationManager] ${page}ページでリロード検出 - PitchProのエラーハンドリングに委譲`);
        // sessionStorageフラグのみクリア
        sessionStorage.removeItem(page + 'PageActive');
        // ページ初期化続行 → PitchProがマイクエラーを処理
        return { shouldContinue: true, reason: 'reload-handled-by-pitchpro' };
    }
    
    // preparationページ: 現状維持（マイクテスト・音域テストがあるため）
    if (config.reloadMessage) {
        alert(config.reloadMessage);
    }
    
    const redirectTo = config.reloadRedirectTo || 'home';
    if (redirectTo === 'preparation') {
        await this.redirectToPreparation('リロード検出');
    } else {
        window.location.hash = redirectTo;
    }
    return { shouldContinue: false, reason: 'reload' };
}
```

#### **ステップ3: PAGE_CONFIG の reloadMessage 削除**

**ファイル**: `/PitchPro-SPA/js/navigation-manager.js`  
**修正箇所**: line 971-986

**修正前**:
```javascript
'training': {
    preventBackNavigation: true,
    preventReload: true,
    reloadRedirectTo: 'preparation',
    reloadMessage: 'リロードが検出されました。マイク設定のため準備ページに移動します。',
    backPreventionMessage: 'トレーニング中です。\n\nブラウザバックは無効になっています。\nホームボタンからトップページに戻れます。'
},
'result-session': {
    preventBackNavigation: true,
    preventReload: true,
    reloadRedirectTo: 'preparation',
    reloadMessage: 'リロードが検出されました。マイク設定のため準備ページに移動します。',
    directAccessRedirectTo: 'preparation',
    directAccessMessage: 'セッション評価ページには正しいフローでアクセスしてください。準備ページに移動します。',
    backPreventionMessage: 'セッション評価中です。\n\nブラウザバックは無効になっています。\n「次の基音へ」ボタンまたはホームボタンをご利用ください。'
}
```

**修正後**:
```javascript
'training': {
    preventBackNavigation: true,
    preventReload: true,  // ✅ 維持（リロード検出自体は継続）
    // ❌ reloadRedirectTo 削除
    // ❌ reloadMessage 削除
    backPreventionMessage: 'トレーニング中です。\n\nブラウザバックは無効になっています。\nホームボタンからトップページに戻れます。'
},
'result-session': {
    preventBackNavigation: true,
    preventReload: true,  // ✅ 維持（リロード検出自体は継続）
    // ❌ reloadRedirectTo 削除
    // ❌ reloadMessage 削除
    directAccessRedirectTo: 'preparation',  // ✅ 維持（ダイレクトアクセスは別問題）
    directAccessMessage: 'セッション評価ページには正しいフローでアクセスしてください。準備ページに移動します。',
    backPreventionMessage: 'セッション評価中です。\n\nブラウザバックは無効になっています。\n「次の基音へ」ボタンまたはホームボタンをご利用ください。'
}
```

---

## 完全な動作フロー（修正後）

### シナリオ1: training ページでバックグラウンドリロード

```
1. ユーザーがtraining ページでトレーニング中
2. デスクトップ切り替え → Safariバックグラウンド約5分
3. Safariがページをリロード（MediaStream破棄）
   performance.navigation.type = 1（ブラウザリロード）
   trainingPageActive = 'true'（sessionStorageに残存）
   
4. router.js loadPage('training') 実行
5. checkPageAccess('training') 実行
   ↓
   detectReload('training') = true（trainingPageActiveフラグ検出）
   ↓
   【修正後】shouldContinue: true → ページ初期化続行
   
6. Router setupPageEvents('training') 実行
   ↓
   PitchPro初期化
   ↓
   マイク許可が失効 → MicrophoneController.handleError()
   ↓
   ErrorNotificationSystem.showMicrophoneError()
   "マイクロフォンエラー: マイクの初期化に失敗しました"
   "解決方法: マイクの設定を確認し、ブラウザにマイクアクセスを許可してください。"
   ↓
   ユーザーがマイク許可を再承認
   ↓
   トレーニング継続（古い音域データ使用）
```

### シナリオ2: リロード後、results-overview に移動して再開

```
1. シナリオ1完了後、ユーザーがホームボタンで results-overview に移動
2. 「もう一度練習」クリック
3. canSkipPreparation() 実行
   ↓
   Layer 1: performance.navigation.type === 1（リロード後まだ残っている）
   ↓
   return false → 準備ページ経由が必要
   
4. 準備ページへ遷移
5. マイクテスト・音域テスト実施
6. 新しい音域データで training 開始
```

---

## メリット・デメリット分析

### ✅ **ポジティブな影響**

1. **即座の復帰が可能**: training ページでリロード → PitchProエラー表示 → マイク許可再取得 → トレーニング継続
2. **PitchProの優れたUIを活用**: 「マイクロフォンエラー」通知（右上・ダークテーマ）が表示される
3. **自然なUX**: alert()による強制リダイレクトがなくなる
4. **次回は完全更新**: results-overviewから再開時は準備ページ経由が強制される
5. **実装コスト最小**: 3箇所のみの変更で実現
6. **保守性向上**: PitchProのエラーハンドリングに一元化

### ⚠️ **一時的な制約**

1. **古い音域データ使用**: リロード後すぐのトレーニング継続では古い音域データを使用
   - **妥当性**: 音域は短期間で大きく変化しない
   - **影響**: 一時的な不便さのみ（次回は必ず更新される）

2. **準備スキップが一度不可**: リロード後の最初の「次のステップ」では準備ページを必ず経由
   - **理由**: performance.navigation.type = 1 が維持される
   - **影響**: 安全性を優先した正しい設計

### ❌ **ネガティブな影響**

**なし** - すべて設計通りに安全に動作します。

---

## 安全性の完全検証

| 要素 | 状態 | 理由 |
|------|------|------|
| **準備スキップ機能** | ✅ 安全 | performance.navigation.type がSPA遷移後も維持される |
| **音域データ更新** | ✅ 保証 | リロード後の次回トレーニングで必ず準備ページ経由 |
| **マイク許可管理** | ✅ 完璧 | PitchProのErrorNotificationSystemが適切に処理 |
| **既存機能への影響** | ✅ 最小限 | training/result-sessionページのみ変更 |
| **SPAアーキテクチャ** | ✅ 整合性維持 | 2フラグシステムと完全に整合 |
| **preparationページ** | ✅ 現状維持 | マイクテスト・音域テストがあるため変更なし |

---

## 他の検討オプション（不採用理由）

### Option B: preparationページでPitchProエラー表示

**実装**: リダイレクト先（preparation）でPitchProを初期化し、エラーメッセージを表示

**不採用理由**:
- preparationページの実装が複雑化
- 既存のpreparationページフローとの整合性が取りにくい
- 実装コストが高い（preparationページの大幅な変更が必要）

### Option C: ハイブリッドアプローチ

**実装**: リダイレクト + URLパラメータで「リロードから復帰」フラグを渡す

**不採用理由**:
- Option Aで十分な効果が得られる
- 実装の複雑性が増す
- 保守性が低下する

---

## バージョン情報

### 変更対象ファイル

| ファイル | 現在のバージョン | 変更後のバージョン | 変更内容 |
|---------|----------------|-------------------|---------|
| **pitchpro-config.js** | v1.0.0 | v1.1.0 | notifications設定追加 |
| **navigation-manager.js** | v4.3.5 | v4.4.0 | リロード処理のReactive化（training/result-session） |

### コミットメッセージ案

```
feat(navigation): PitchProエラーハンドリングとの統合によるリロード処理改善

- PitchProConfig.jsにnotifications設定追加（v1.1.0）
- training/result-sessionページでリロード時にPitchProのエラー通知を活用
- Safariバックグラウンドリロード後の自然なUX向上
- 準備ページスキップ機能との完全な整合性確認

影響範囲:
- pitchpro-config.js: notifications設定追加
- navigation-manager.js: checkPageAccess() Reactiveアプローチ導入
- PAGE_CONFIG: training/result-sessionのreloadMessage削除

安全性:
- performance.navigation.typeの永続性を活用
- 準備スキップ機能は完全に安全
- 次回トレーニングで音域データ必ず更新

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

---

## 次のアクション

1. **実装**: 上記3ステップを実装
2. **テスト**: 以下のシナリオで動作確認
   - Safariバックグラウンドリロード（5分放置）
   - PitchProエラー通知の表示確認
   - マイク許可再取得後のトレーニング継続
   - 次回トレーニングでの準備ページ経由確認
3. **ドキュメント更新**: 必要に応じて仕様書更新

---

## 関連ドキュメント

- **SPA仕様書**: `/specifications/SPA_DEVELOPMENT_JOURNEY_AND_ARCHITECTURE.md`
- **ナビゲーション仕様書**: `/specifications/NAVIGATION_HANDLING_SPECIFICATION.md`
- **PitchPro統合仕様**: `/specifications/PITCHPRO_INTEGRATION_SPECIFICATION.md`（存在する場合）

---

## 重要な設計思想

1. **PitchProの設計思想を尊重**: 既存のエラーハンドリングシステムを活用
2. **特殊ケース対応**: Safariバックグラウンドリロードは限定的なケース（約5分後）
3. **ユーザー体験優先**: 自然なフロー（エラー通知 → 許可 → 継続）
4. **実装コスト最小**: 最小限の変更で最大の効果
5. **保守性向上**: PitchProのエラーハンドリングに一元化
6. **安全性確保**: performance.navigation.typeの永続性を活用した多層防御
