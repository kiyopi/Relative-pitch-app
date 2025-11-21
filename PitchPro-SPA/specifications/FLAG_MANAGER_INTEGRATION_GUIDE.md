# FlagManager統合ガイド

**作成日**: 2025-11-20
**バージョン**: 1.0.0
**対象**: NavigationManager v4.4.2+

---

## 📋 目次

1. [概要](#概要)
2. [FlagManagerの目的](#flagmanagerの目的)
3. [使用例（修正前・修正後の比較）](#使用例修正前修正後の比較)
4. [NavigationManagerへの段階的統合計画](#navigationmanagerへの段階的統合計画)
5. [デバッグ方法](#デバッグ方法)

---

## 概要

NavigationManagerで使用している複数のsessionStorageフラグを一元管理するヘルパークラス`FlagManager`を導入しました。

### 解決する問題

**修正前の問題点**:
```javascript
// フラグが散在していて管理が困難
sessionStorage.setItem('normalTransitionToTraining', 'true');
sessionStorage.setItem('preparationPageActive', 'true');
sessionStorage.setItem('reloadRedirected', 'true');
sessionStorage.setItem('currentMode', 'continuous');

// フラグキーの命名が統一されていない
const flag1 = sessionStorage.getItem('normalTransitionToPreparation');
const flag2 = sessionStorage.getItem('preparationPageActive');
const flag3 = sessionStorage.getItem(this.KEYS.REDIRECT_COMPLETED);

// デバッグが困難
console.log('normalTransitionToTraining:', sessionStorage.getItem('normalTransitionToTraining'));
console.log('preparationPageActive:', sessionStorage.getItem('preparationPageActive'));
// ... 各フラグを個別に確認
```

**修正後の改善**:
```javascript
// 統一されたAPI
FlagManager.setTransitionFlag('training');
FlagManager.setPageActiveFlag('preparation');
FlagManager.setRedirectCompleted();
FlagManager.setCurrentMode('continuous');

// 読みやすい確認
if (FlagManager.hasTransitionFlag('preparation')) { ... }

// 簡単なデバッグ
FlagManager.debugFlags(); // 全フラグ一覧表示
```

---

## FlagManagerの目的

1. **フラグの一元管理** - 全フラグをFlagManagerで統一管理
2. **API統一** - 設定・取得・削除のインターフェース統一
3. **デバッグ容易化** - 全フラグ状態の一覧表示機能
4. **命名規則統一** - フラグキーの命名を統一
5. **ライフサイクル管理** - フラグの自動クリーンアップ

---

## 使用例（修正前・修正後の比較）

### 例1: 遷移証明フラグの設定

**修正前**:
```javascript
static setNormalTransition() {
    sessionStorage.setItem(this.KEYS.NORMAL_TRANSITION, 'true');
    console.log('✅ [NavigationManager] 正常な遷移フラグを設定（training）');
}
```

**修正後**:
```javascript
static setNormalTransition() {
    FlagManager.setTransitionFlag('training');
}
```

### 例2: ページ状態フラグの確認

**修正前**:
```javascript
const wasPreparationActive = sessionStorage.getItem('preparationPageActive') === 'true';
if (!wasPreparationActive) {
    console.log('⚠️ [NavigationManager] preparationページへのダイレクトアクセス検出');
    // ...
}
```

**修正後**:
```javascript
if (!FlagManager.hasPageActiveFlag('preparation')) {
    console.log('⚠️ [NavigationManager] preparationページへのダイレクトアクセス検出');
    // ...
}
```

### 例3: フラグのクリーンアップ

**修正前**:
```javascript
sessionStorage.removeItem('normalTransitionToPreparation');
sessionStorage.removeItem('preparationPageActive');
console.log('✅ preparationPageActiveフラグをクリア（正常な遷移）');
```

**修正後**:
```javascript
FlagManager.clearPageFlags('preparation'); // 一括クリア
```

### 例4: リダイレクト完了フラグ

**修正前**:
```javascript
sessionStorage.setItem(this.KEYS.REDIRECT_COMPLETED, 'true');
console.log('✅ [NavigationManager] リダイレクト完了フラグを設定');

// 確認
const alreadyRedirected = sessionStorage.getItem(this.KEYS.REDIRECT_COMPLETED);
if (alreadyRedirected === 'true') {
    sessionStorage.removeItem(this.KEYS.REDIRECT_COMPLETED);
    return false;
}
```

**修正後**:
```javascript
FlagManager.setRedirectCompleted();

// 確認
if (FlagManager.hasRedirectCompleted()) {
    FlagManager.clearRedirectCompleted();
    return false;
}
```

### 例5: データフラグの管理

**修正前**:
```javascript
mode = sessionStorage.getItem('currentMode');
session = sessionStorage.getItem('currentSession') || '';
const currentLessonId = sessionStorage.getItem('currentLessonId');
```

**修正後**:
```javascript
mode = FlagManager.getCurrentMode();
session = FlagManager.getCurrentSession() || '';
const currentLessonId = FlagManager.getCurrentLessonId();
```

---

## NavigationManagerへの段階的統合計画

### Phase 1: 新規メソッドでの使用（低リスク）

**対象**: 新しく追加するメソッドや修正するメソッド

**実装例**:
```javascript
static setNormalTransitionToPreparation() {
    FlagManager.setTransitionFlag('preparation');
}

static setNormalTransition() {
    FlagManager.setTransitionFlag('training');
}
```

**メリット**: 既存コードに影響しない

---

### Phase 2: detectReload()の段階的移行（中リスク）

**修正前**:
```javascript
static detectReload(page = null) {
    // 1. 正常な遷移フラグをチェック
    const normalTransition = sessionStorage.getItem(this.KEYS.NORMAL_TRANSITION);
    if (normalTransition === 'true') {
        sessionStorage.removeItem(this.KEYS.NORMAL_TRANSITION);
        if (page) {
            sessionStorage.removeItem(page + 'PageActive');
        }
        sessionStorage.removeItem('trainingPageActive');
        return false;
    }
    // ...
}
```

**修正後**:
```javascript
static detectReload(page = null) {
    // 1. 正常な遷移フラグをチェック
    if (FlagManager.hasTransitionFlag('training')) {
        FlagManager.clearTransitionFlag('training');
        if (page) {
            FlagManager.clearPageActiveFlag(page);
        }
        FlagManager.clearPageActiveFlag('training'); // 後方互換性
        return false;
    }
    // ...
}
```

---

### Phase 3: checkPageAccess()の完全移行（中リスク）

**修正前**:
```javascript
if (page === 'preparation') {
    const normalTransition = sessionStorage.getItem(this.KEYS.NORMAL_TRANSITION_PREPARATION);
    if (normalTransition === 'true') {
        sessionStorage.removeItem(this.KEYS.NORMAL_TRANSITION_PREPARATION);
        sessionStorage.setItem('preparationPageActive', 'true');
        return { shouldContinue: true, reason: 'continue' };
    }
}
```

**修正後**:
```javascript
if (page === 'preparation') {
    if (FlagManager.hasTransitionFlag('preparation')) {
        FlagManager.clearTransitionFlag('preparation');
        FlagManager.setPageActiveFlag('preparation');
        return { shouldContinue: true, reason: 'continue' };
    }
}
```

---

### Phase 4: KEYS定数の段階的削除（低リスク）

FlagManager統合完了後、NavigationManager.KEYSは不要になる

**修正前**:
```javascript
static KEYS = {
    NORMAL_TRANSITION: 'normalTransitionToTraining',
    NORMAL_TRANSITION_PREPARATION: 'normalTransitionToPreparation',
    NORMAL_TRANSITION_RESULT_SESSION: 'normalTransitionToResultSession',
    REDIRECT_COMPLETED: 'reloadRedirected'
};
```

**修正後**:
```javascript
// 削除可能（FlagManagerで管理）
```

---

## デバッグ方法

### 全フラグの状態を表示

**ブラウザコンソールで実行**:
```javascript
FlagManager.debugFlags();
```

**出力例**:
```
🔍 [FlagManager] Current Flag States
  🚦 Transition Flags
    TRAINING: (not set)
    PREPARATION: true
    RESULT_SESSION: (not set)
  📄 Page Active Flags
    PREPARATION: true
    TRAINING: (not set)
    RESULT_SESSION: (not set)
  ⚙️ Control Flags
    REDIRECT_COMPLETED: true
  📊 Data Flags
    CURRENT_MODE: continuous
    CURRENT_SESSION: 1
    CURRENT_LESSON_ID: lesson_1763636512_continuous_ascending
```

### フラグ状態をオブジェクトとして取得

```javascript
const flags = FlagManager.getAllFlags();
console.log(JSON.stringify(flags, null, 2));
```

### 個別フラグの確認

```javascript
// 遷移証明フラグ
console.log('Preparation transition:', FlagManager.hasTransitionFlag('preparation'));

// ページ状態フラグ
console.log('Preparation active:', FlagManager.hasPageActiveFlag('preparation'));

// データフラグ
console.log('Current mode:', FlagManager.getCurrentMode());
```

---

## 統合時の注意事項

### 1. 後方互換性の維持

FlagManager導入後も、既存の`sessionStorage`直接アクセスコードは動作する

**理由**: FlagManagerは内部で`sessionStorage`を使用しているため

### 2. 段階的な移行を推奨

一度に全コードを変更するのではなく、Phase 1 → 2 → 3 → 4の順に進める

### 3. テスト重要性

各Phaseの実装後、以下をテスト:
- ダイレクトアクセス検出
- リロード検出
- デスクトップ切り替え検出
- 正常な遷移フロー
- ブラウザバック防止

### 4. ログの確認

FlagManagerは統一されたログフォーマットを使用:
```
✅ [FlagManager] Transition flag set: normalTransitionToPreparation
🗑️ [FlagManager] Page active flag cleared: preparationPageActive
```

---

## FlagManagerのAPI一覧

### 遷移証明フラグ

| メソッド | 説明 |
|---------|------|
| `setTransitionFlag(page)` | 遷移証明フラグを設定 |
| `hasTransitionFlag(page)` | 遷移証明フラグを確認 |
| `clearTransitionFlag(page)` | 遷移証明フラグを削除 |

### ページ状態フラグ

| メソッド | 説明 |
|---------|------|
| `setPageActiveFlag(page)` | ページ状態フラグを設定 |
| `hasPageActiveFlag(page)` | ページ状態フラグを確認 |
| `clearPageActiveFlag(page)` | ページ状態フラグを削除 |

### 制御フラグ

| メソッド | 説明 |
|---------|------|
| `setRedirectCompleted()` | リダイレクト完了フラグを設定 |
| `hasRedirectCompleted()` | リダイレクト完了フラグを確認 |
| `clearRedirectCompleted()` | リダイレクト完了フラグを削除 |

### データフラグ

| メソッド | 説明 |
|---------|------|
| `setCurrentMode(mode)` | 現在のモードを設定 |
| `getCurrentMode()` | 現在のモードを取得 |
| `setCurrentSession(session)` | 現在のセッション番号を設定 |
| `getCurrentSession()` | 現在のセッション番号を取得 |
| `setCurrentLessonId(lessonId)` | 現在のレッスンIDを設定 |
| `getCurrentLessonId()` | 現在のレッスンIDを取得 |
| `clearCurrentLessonId()` | 現在のレッスンIDを削除 |

### 一括操作

| メソッド | 説明 |
|---------|------|
| `clearPageFlags(page)` | ページ関連の全フラグをクリア |
| `clearAllTransitionFlags()` | 全ての遷移証明フラグをクリア |
| `clearAllControlFlags()` | 全ての制御フラグをクリア |

### デバッグ・ユーティリティ

| メソッド | 説明 |
|---------|------|
| `debugFlags()` | 全フラグの状態を表示 |
| `getAllFlags()` | 全フラグの状態をオブジェクトとして取得 |
| `has(key)` | フラグの存在確認（汎用） |
| `get(key)` | フラグの取得（汎用） |
| `set(key, value)` | フラグの設定（汎用） |
| `clear(key)` | フラグの削除（汎用） |

---

## まとめ

FlagManagerの導入により、NavigationManagerのフラグ管理が大幅に改善されます：

✅ **可読性向上**: 意図が明確なAPI
✅ **保守性向上**: 一元管理によるコード重複削減
✅ **デバッグ容易化**: 統一されたログフォーマット、一覧表示機能
✅ **エラー削減**: 統一されたインターフェースによるタイポ防止
✅ **拡張性向上**: 新しいフラグの追加が容易

段階的な統合により、安全にNavigationManagerを改善できます。
