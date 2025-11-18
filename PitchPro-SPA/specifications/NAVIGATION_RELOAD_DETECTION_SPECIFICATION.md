# Navigation & Reload Detection Specification
# ナビゲーション・リロード検出システム仕様書

**バージョン**: 2.1.0
**作成日**: 2025-11-18
**最終更新**: 2025-11-18
**プロジェクト**: 8va相対音感トレーニングアプリ

---

## 📋 目次

1. [概要](#概要)
2. [設計思想](#設計思想)
3. [2フラグシステム](#2フラグシステム)
4. [NavigationManager API](#navigationmanager-api)
5. [実装パターン](#実装パターン)
6. [フロー図](#フロー図)
7. [テストシナリオ](#テストシナリオ)
8. [トラブルシューティング](#トラブルシューティング)
9. [更新履歴](#更新履歴)

---

## 概要

### 目的
SPAにおけるページ遷移の正当性を検証し、リロード・ダイレクトアクセスを適切に検出・対処するシステム。

### 主要機能
1. **正常な遷移の証明**: 遷移証明フラグによる正当性の保証
2. **リロード検出**: ページ状態フラグによるリロードの検出
3. **ダイレクトアクセス検出**: フラグの不在による不正アクセスの検出
4. **モード情報保持**: リロード時のモード情報の維持

### 対象ページ
- `preparation`: 準備ページ（リロード不可、ダイレクトアクセス不可）
- `training`: トレーニングページ（リロード不可、ダイレクトアクセス不可）
- `result-session`: セッション結果ページ（リロード不可、ダイレクトアクセス不可）
  - **重要**: ランダム基音モードでのリロード時マイク許可放棄問題を防止
  - 次セッション開始時のマイク許可ダイアログ表示によるレッスン破綻を防止

---

## 設計思想

### 核心原則

#### 1. フラグの役割分離
**2つのフラグで2つの責任**:
- **遷移証明フラグ（一時的）**: 「この遷移は正常」という証明書
- **ページ状態フラグ（永続的）**: ページのライフサイクル管理

**アンチパターン（絶対に避ける）**:
```javascript
// ❌ 1つのフラグで2つの状態を判定（preparationページの旧設計）
if (preparationPageActive) {
    // リロード？ それとも正常な遷移直後？ 区別できない！
}
```

#### 2. タイミングの明確化
**遷移証明フラグ**:
- 設定: 遷移**前**（router.jsまたはNavigationManager）
- チェック: 遷移**後**（checkPageAccess内）
- 削除: チェック時に**即座**に削除

**ページ状態フラグ**:
- 設定: ページ初期化**完了後**（checkPageAccess内、正常な遷移時のみ）
- 削除: ページ**離脱時**（cleanupCurrentPage内）

#### 3. 既存パターンの踏襲
- trainingページの2フラグシステムが正常に動作
- preparationページも同じパターンに統一
- 新規ページも必ずこのパターンを適用

---

## 2フラグシステム

### フラグ一覧

| フラグ名 | sessionStorageキー | 役割 | ライフサイクル |
|---|---|---|---|
| normalTransitionToTraining | `normalTransitionToTraining` | training遷移の証明 | 遷移前設定 → 遷移後削除 |
| normalTransitionToPreparation | `normalTransitionToPreparation` | preparation遷移の証明 | 遷移前設定 → 遷移後削除 |
| normalTransitionToResultSession | `normalTransitionToResultSession` | result-session遷移の証明 | 遷移前設定 → 遷移後削除 |
| trainingPageActive | `trainingPageActive` | trainingページ状態 | 初期化後設定 → 離脱時削除 |
| preparationPageActive | `preparationPageActive` | preparationページ状態 | 初期化後設定 → 離脱時削除 |
| resultSessionPageActive | `resultSessionPageActive` | result-sessionページ状態 | 初期化後設定 → 離脱時削除 |

### フラグ設計の詳細

#### 遷移証明フラグ（normalTransition系）

**特性**:
- **一時的**: 1回の遷移のみ有効
- **自己削除**: チェック時に自動削除
- **遷移前設定**: hashchangeイベント発火前に設定

**使用例**:
```javascript
// 遷移前（router.js）
NavigationManager.setNormalTransitionToPreparation();
window.location.hash = 'preparation';

// 遷移後（checkPageAccess）
if (normalTransition === 'true') {
    sessionStorage.removeItem(this.KEYS.NORMAL_TRANSITION_PREPARATION);
    // 正常な遷移として処理
}
```

#### ページ状態フラグ（PageActive系）

**特性**:
- **永続的**: ページが存在する間保持
- **初期化後設定**: 正常な遷移確認後のみ設定
- **離脱時削除**: cleanupCurrentPageで削除

**使用例**:
```javascript
// 初期化後（checkPageAccess内、正常な遷移時）
sessionStorage.setItem('preparationPageActive', 'true');

// リロード検出時
const wasActive = sessionStorage.getItem('preparationPageActive') === 'true';
if (wasActive) {
    // リロード判定
}

// 離脱時（cleanupCurrentPage）
sessionStorage.removeItem('preparationPageActive');
```

---

## NavigationManager API

### KEYS定数

```javascript
static KEYS = {
    NORMAL_TRANSITION: 'normalTransitionToTraining',
    NORMAL_TRANSITION_PREPARATION: 'normalTransitionToPreparation',
    NORMAL_TRANSITION_RESULT_SESSION: 'normalTransitionToResultSession',
    REDIRECT_COMPLETED: 'reloadRedirected'
};
```

### 遷移証明フラグ設定メソッド

#### setNormalTransition()
```javascript
/**
 * trainingページへの正常な遷移フラグを設定
 *
 * 【重要】この関数を呼び出さずにtrainingへ遷移すると、リロードとして誤検出される
 */
static setNormalTransition() {
    sessionStorage.setItem(this.KEYS.NORMAL_TRANSITION, 'true');
    console.log('✅ [NavigationManager] 正常な遷移フラグを設定（training）');
}
```

#### setNormalTransitionToPreparation()
```javascript
/**
 * preparationページへの正常な遷移フラグを設定
 *
 * 【重要】この関数を呼び出さずにpreparationへ遷移すると、リロードとして誤検出される
 */
static setNormalTransitionToPreparation() {
    sessionStorage.setItem(this.KEYS.NORMAL_TRANSITION_PREPARATION, 'true');
    console.log('✅ [NavigationManager] 正常な遷移フラグを設定（preparation）');
}
```

#### setNormalTransitionToResultSession()
```javascript
/**
 * result-sessionページへの正常な遷移フラグを設定
 *
 * 【重要】この関数を呼び出さずにresult-sessionへ遷移すると、リロードとして誤検出される
 *
 * 【ランダム基音モード専用】
 * - 各セッション完了後にresult-sessionページへ遷移する
 * - リロード時はマイク許可放棄によりレッスン破綻の原因となる
 * - 次セッションのドレミガイド進行中にマイク許可ダイアログが表示されるのを防止
 */
static setNormalTransitionToResultSession() {
    sessionStorage.setItem(this.KEYS.NORMAL_TRANSITION_RESULT_SESSION, 'true');
    console.log('✅ [NavigationManager] 正常な遷移フラグを設定（result-session）');
}
```

### アクセス制御メソッド

#### checkPageAccess(page)
```javascript
/**
 * 統一アクセス制御チェック
 *
 * @param {string} page - ページ名
 * @returns {Promise<Object>} { shouldContinue: boolean, reason: string }
 */
static async checkPageAccess(page) {
    const config = this.PAGE_CONFIG[page];

    // 0. preparationページの正常な遷移フラグをチェック（最優先）
    if (page === 'preparation') {
        const normalTransition = sessionStorage.getItem(this.KEYS.NORMAL_TRANSITION_PREPARATION);
        if (normalTransition === 'true') {
            sessionStorage.removeItem(this.KEYS.NORMAL_TRANSITION_PREPARATION);
            console.log('✅ [NavigationManager] 正常な遷移検出（preparation）');

            // 正常な遷移なので preparationPageActive フラグを設定
            sessionStorage.setItem('preparationPageActive', 'true');
            console.log('✅ [NavigationManager] preparationPageActiveフラグを設定（正常な遷移）');

            return { shouldContinue: true, reason: 'continue' };
        }
    }

    // 1. preparationページのダイレクトアクセス検出
    if (page === 'preparation' && config?.directAccessRedirectTo) {
        const wasPreparationActive = sessionStorage.getItem('preparationPageActive') === 'true';
        if (!wasPreparationActive) {
            console.log('⚠️ [NavigationManager] preparationページへのダイレクトアクセス検出');
            if (config.directAccessMessage) {
                alert(config.directAccessMessage);
            }
            window.location.hash = config.directAccessRedirectTo;
            return { shouldContinue: false, reason: 'direct-access-preparation' };
        }
    }

    // 2. training/result-sessionページのダイレクトアクセス検出
    if (this.requiresPreparation(page)) {
        alert('トレーニングページは準備ページから開始してください。\nマイク設定のため準備ページに移動します。');
        await this.redirectToPreparation('ダイレクトアクセス検出');
        return { shouldContinue: false, reason: 'direct-access-training' };
    }

    // 3. リロード検出
    if (config?.preventReload && this.detectReload(page)) {
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

    // 4. すべてのチェックをパス - 初期化続行
    return { shouldContinue: true, reason: 'continue' };
}
```

### ナビゲーションメソッド

#### navigateToTraining(mode, session)
```javascript
/**
 * trainingページへ遷移（正常な遷移フラグを自動設定）
 *
 * 【推奨】trainingへの遷移は必ずこのメソッドを使用すること
 */
static navigateToTraining(mode = null, session = null) {
    console.log(`🚀 [NavigationManager] trainingへ遷移: mode=${mode}, session=${session}`);

    // 正常な遷移フラグを自動設定
    this.setNormalTransition();

    // 遷移先を構築
    let targetHash;
    if (mode) {
        const params = new URLSearchParams({ mode });
        if (session) params.set('session', session);
        targetHash = `training?${params.toString()}`;
    } else {
        targetHash = 'training';
    }

    window.location.hash = targetHash;
}
```

#### redirectToPreparation(reason, mode, session)
```javascript
/**
 * preparationページへリダイレクト（リロード時・ダイレクトアクセス時）
 *
 * @param {string} reason - リダイレクト理由
 * @param {string|null} mode - モード（省略時はsessionStorageから取得）
 * @param {string|null} session - セッション番号
 */
static async redirectToPreparation(reason = '', mode = null, session = null) {
    // モード情報取得（sessionStorage → URL → デフォルト）
    if (!mode) {
        mode = sessionStorage.getItem('currentMode');
        if (!mode) {
            const hash = window.location.hash.substring(1);
            const params = new URLSearchParams(hash.split('?')[1] || '');
            mode = params.get('mode');
        }
        if (!mode) {
            mode = 'random';
        }
    }

    console.log(`🔄 [NavigationManager] preparationへリダイレクト: ${reason} (mode: ${mode}, session: ${session})`);

    // リソース破棄・制約解除
    this.disableNavigationWarning();
    this.removeBrowserBackPrevention();

    // 正常な遷移フラグを設定（リダイレクト先での正常な遷移として扱う）
    this.setNormalTransitionToPreparation();

    // preparationへリダイレクト
    const redirectParams = new URLSearchParams({
        redirect: 'training',
        mode: mode
    });
    if (session) redirectParams.set('session', session);

    window.location.hash = `preparation?${redirectParams.toString()}`;
}
```

---

## 実装パターン

### パターン1: ホームから準備ページへの遷移

**router.js - setupHomeEvents()**:
```javascript
button.addEventListener('click', async (e) => {
    const route = e.currentTarget.getAttribute('data-route');
    const mode = e.currentTarget.getAttribute('data-mode');

    if (route === 'training') {
        NavigationManager.navigateToTraining(mode, session);
    } else if (route === 'preparation') {
        // 正常な遷移フラグを設定
        NavigationManager.setNormalTransitionToPreparation();

        // ハッシュ変更
        let hash = `preparation?mode=${mode}`;
        window.location.hash = hash;
    }
});
```

### パターン2: 準備ページからトレーニングページへの遷移

**preparation-pitchpro-cycle.js**:
```javascript
// トレーニング開始ボタン
startButton.addEventListener('click', () => {
    const mode = sessionStorage.getItem('currentMode');
    const direction = sessionStorage.getItem('trainingDirection');

    // NavigationManagerが自動的に遷移証明フラグを設定
    NavigationManager.navigateToTraining(mode, 1, null, direction);
});
```

### パターン3: トレーニングページリロード時のリダイレクト

**自動処理（checkPageAccess内）**:
```javascript
// リロード検出
if (config?.preventReload && this.detectReload(page)) {
    // ダイアログ表示
    alert(config.reloadMessage);

    // redirectToPreparation内で自動的に遷移証明フラグが設定される
    await this.redirectToPreparation('リロード検出');
}
```

---

## フロー図

### 正常な遷移フロー（ホーム → 準備）

```
┌─────────────────────────────────────────┐
│ ホームページ                             │
│ - 連続チャレンジモードボタンクリック      │
└─────────────────────────────────────────┘
                 ↓
┌─────────────────────────────────────────┐
│ router.js - setupHomeEvents()           │
│ - route === 'preparation'検出           │
└─────────────────────────────────────────┘
                 ↓
┌─────────────────────────────────────────┐
│ NavigationManager.                       │
│   setNormalTransitionToPreparation()    │
│ - normalTransitionToPreparation = true  │
└─────────────────────────────────────────┘
                 ↓
┌─────────────────────────────────────────┐
│ window.location.hash =                  │
│   'preparation?mode=continuous'         │
└─────────────────────────────────────────┘
                 ↓
┌─────────────────────────────────────────┐
│ hashchangeイベント発火                   │
│ router.js - loadPage('preparation')    │
└─────────────────────────────────────────┘
                 ↓
┌─────────────────────────────────────────┐
│ NavigationManager.checkPageAccess()     │
│ - normalTransitionToPreparation確認     │
└─────────────────────────────────────────┘
                 ↓
┌─────────────────────────────────────────┐
│ normalTransitionToPreparation === true  │
│ ✅ 正常な遷移と判定                      │
└─────────────────────────────────────────┘
                 ↓
┌─────────────────────────────────────────┐
│ フラグ処理                               │
│ - normalTransitionToPreparation削除     │
│ - preparationPageActive = true設定      │
└─────────────────────────────────────────┘
                 ↓
┌─────────────────────────────────────────┐
│ 準備ページ初期化続行                     │
│ - initializePreparationPitchProCycle()  │
└─────────────────────────────────────────┘
```

### ダイレクトアクセスフロー

```
┌─────────────────────────────────────────┐
│ 新しいタブ                               │
│ - URL直接入力: #preparation?mode=random │
└─────────────────────────────────────────┘
                 ↓
┌─────────────────────────────────────────┐
│ router.js - loadPage('preparation')    │
└─────────────────────────────────────────┘
                 ↓
┌─────────────────────────────────────────┐
│ NavigationManager.checkPageAccess()     │
│ - normalTransitionToPreparation確認     │
└─────────────────────────────────────────┘
                 ↓
┌─────────────────────────────────────────┐
│ normalTransitionToPreparation === null  │
│ ❌ 遷移証明なし                          │
└─────────────────────────────────────────┘
                 ↓
┌─────────────────────────────────────────┐
│ preparationPageActive確認               │
│ - preparationPageActive === null        │
└─────────────────────────────────────────┘
                 ↓
┌─────────────────────────────────────────┐
│ ⚠️ ダイレクトアクセス判定                 │
│ - ダイアログ表示                         │
│ - ホームへリダイレクト                   │
└─────────────────────────────────────────┘
```

### リロードフロー

```
┌─────────────────────────────────────────┐
│ 準備ページ表示中                         │
│ - preparationPageActive = true          │
└─────────────────────────────────────────┘
                 ↓
┌─────────────────────────────────────────┐
│ ブラウザリロード（⌘+R）                 │
└─────────────────────────────────────────┘
                 ↓
┌─────────────────────────────────────────┐
│ router.js - loadPage('preparation')    │
└─────────────────────────────────────────┘
                 ↓
┌─────────────────────────────────────────┐
│ NavigationManager.checkPageAccess()     │
│ - normalTransitionToPreparation確認     │
└─────────────────────────────────────────┘
                 ↓
┌─────────────────────────────────────────┐
│ normalTransitionToPreparation === null  │
│ ❌ 遷移証明なし                          │
└─────────────────────────────────────────┘
                 ↓
┌─────────────────────────────────────────┐
│ preparationPageActive確認               │
│ - preparationPageActive === true        │
│   （前回の初期化で設定済み）             │
└─────────────────────────────────────────┘
                 ↓
┌─────────────────────────────────────────┐
│ detectReload('preparation')             │
│ ✅ リロード判定                          │
└─────────────────────────────────────────┘
                 ↓
┌─────────────────────────────────────────┐
│ - リロードダイアログ表示                 │
│ - ホームへリダイレクト                   │
└─────────────────────────────────────────┘
```

---

## テストシナリオ

### テスト1: 準備ページリロード検出

**手順**:
1. ホーム → 準備ページへ正常に遷移
2. 準備ページでブラウザリロード（⌘+R）

**期待結果**:
- ✅ ダイアログ表示: 「リロードが検出されました。準備を最初からやり直すためホームページに移動します。」
- ✅ OK押下後、ホームページへリダイレクト

**検証ログ**:
```
リロード検出開始 (page: preparation)
normalTransition フラグ: null
⚠️ preparationPageActiveフラグ検出 - リロード確定
Page access blocked: reload
```

### テスト2: 準備ページ直接アクセス検出

**手順**:
1. 新しいタブを開く
2. URL直接入力: `#preparation?mode=random`

**期待結果**:
- ✅ ダイアログ表示: 「準備ページには正しいフローでアクセスしてください。ホームページに移動します。」
- ✅ OK押下後、ホームページへリダイレクト

**検証ログ**:
```
⚠️ preparationページへのダイレクトアクセス検出
Page access blocked: direct-access-preparation
```

### テスト3: トレーニングページリロード検出

**手順**:
1. ホーム → 準備 → トレーニングへ正常に遷移
2. トレーニングページでブラウザリロード（⌘+R）

**期待結果**:
- ✅ ダイアログ表示: 「リロードが検出されました。マイク設定のため準備ページに移動します。」
- ✅ OK押下後、準備ページ（mode=continuous）へリダイレクト
- ✅ サブタイトル: 「連続チャレンジモードの準備中」

**検証ログ**:
```
⚠️ trainingPageActiveフラグ検出 - リロード確定
sessionStorage.currentMode: continuous
preparationへリダイレクト: リロード検出 (mode: continuous)
✅ サブタイトル更新: 連続チャレンジモードの準備中
```

### テスト4: トレーニングページ直接アクセス検出

**手順**:
1. 新しいタブを開く
2. URL直接入力: `#training?mode=continuous&scaleDirection=ascending`

**期待結果**:
- ✅ ダイアログ表示: 「トレーニングページは準備ページから開始してください。マイク設定のため準備ページに移動します。」
- ✅ OK押下後、準備ページ（mode=continuous）へリダイレクト
- ✅ サブタイトル: 「連続チャレンジモードの準備中」

**検証ログ**:
```
⚠️ trainingへのダイレクトアクセス検出 - 準備ページ経由が必要
URLパラメータ.mode: continuous
preparationへリダイレクト: ダイレクトアクセス検出 (mode: continuous)
✅ サブタイトル更新: 連続チャレンジモードの準備中
```

### テスト5: 正常な遷移（ホーム → 準備）

**手順**:
1. ホームページで「連続チャレンジモード」ボタンをクリック

**期待結果**:
- ✅ ダイアログ表示なし
- ✅ 準備ページへ正常に遷移
- ✅ サブタイトル: 「連続チャレンジモードの準備中」

**検証ログ**:
```
✅ 正常な遷移フラグを設定（preparation）
✅ 正常な遷移検出（preparation）
✅ preparationPageActiveフラグを設定（正常な遷移）
✅ サブタイトル更新: 連続チャレンジモードの準備中
```

---

## トラブルシューティング

### 問題1: 正常な遷移でダイアログが表示される

**症状**:
ホームから準備ページへの遷移時にリロードダイアログが表示される。

**原因**:
遷移証明フラグの設定漏れ、または設定タイミングが遅い。

**解決策**:
```javascript
// ❌ 間違い: フラグ設定なし
window.location.hash = 'preparation';

// ✅ 正しい: フラグを先に設定
NavigationManager.setNormalTransitionToPreparation();
window.location.hash = 'preparation';
```

### 問題2: リロード検出が動作しない

**症状**:
準備ページでリロードしても、ダイアログが表示されずそのままページが表示される。

**原因**:
ページ状態フラグが設定されていない、またはクリーンアップされていない。

**解決策**:
```javascript
// checkPageAccess内で必ず設定
if (normalTransition === 'true') {
    sessionStorage.setItem('preparationPageActive', 'true');
}

// cleanupCurrentPage内で必ず削除
sessionStorage.removeItem('preparationPageActive');
```

### 問題3: モード情報が失われる

**症状**:
トレーニングページのリロード後、準備ページでモードが「ランダム基音」になっている。

**原因**:
`redirectToPreparation()`でモード情報の取得順序が間違っている。

**解決策**:
```javascript
// 優先順位: sessionStorage → URL → デフォルト
if (!mode) {
    mode = sessionStorage.getItem('currentMode');  // 最優先
    if (!mode) {
        const params = new URLSearchParams(hash.split('?')[1] || '');
        mode = params.get('mode');  // 次
    }
    if (!mode) {
        mode = 'random';  // 最後のフォールバック
    }
}
```

### 問題4: フラグが残り続ける

**症状**:
ページ遷移後もフラグが削除されず、sessionStorageに残り続ける。

**原因**:
フラグの削除処理が実行されていない。

**解決策**:
```javascript
// 遷移証明フラグは必ずチェック時に削除
if (normalTransition === 'true') {
    sessionStorage.removeItem(this.KEYS.NORMAL_TRANSITION_PREPARATION);
    // ... 続きの処理
}

// ページ状態フラグは必ず離脱時に削除
// cleanupCurrentPage内
sessionStorage.removeItem(page + 'PageActive');
```

---

## 更新履歴

### v2.1.0 (2025-11-18)
- **追加**: result-sessionページに2フラグシステムを完全適用
- **追加**: `KEYS.NORMAL_TRANSITION_RESULT_SESSION` 定数
- **追加**: `setNormalTransitionToResultSession()` メソッド
- **変更**: `checkPageAccess()` にresult-session完全チェックを追加
- **変更**: `navigate()` でresult-session遷移時に専用フラグを設定
- **変更**: PAGE_CONFIGのresult-sessionを `preventReload: true` に変更
- **修正**: result-session-controller.jsから重複checkPageAccess()呼び出しを削除
- **問題解決**: ランダム基音モードでのリロード時マイク許可放棄問題を防止
- **問題解決**: 次セッションのドレミガイド進行中にマイク許可ダイアログが表示される問題を防止
- **テスト**: 正常遷移・リロード検出の両シナリオで成功を確認

### v2.0.0 (2025-11-18)
- **破壊的変更**: preparationページを1フラグシステムから2フラグシステムに変更
- **追加**: `KEYS.NORMAL_TRANSITION_PREPARATION` 定数
- **追加**: `setNormalTransitionToPreparation()` メソッド
- **変更**: `checkPageAccess()` でpreparationページの正常な遷移を最優先チェック
- **変更**: `redirectToPreparation()` で遷移証明フラグを自動設定
- **修正**: router.jsでの直接的なフラグ設定を削除
- **テスト**: 全5テストシナリオで成功を確認

### v1.0.0 (2025-10-29)
- 初版作成
- trainingページの2フラグシステム実装
- preparationページの1フラグシステム実装（後にv2.0.0で修正）

---

## 参考資料

### 関連仕様書
- `SPA_ARCHITECTURE_SPECIFICATION.md`: SPA全体構造
- `ROUTER_PAGE_INITIALIZATION_GUIDE.md`: ページ初期化ガイド

### 関連Serenaメモリ
- `PERM-reload-detection-root-cause-analysis-20251118`: 根本原因分析
- `PERM-reload-navigation-refactoring-design-20251118`: リファクタリング完了報告

### 実装ファイル
- `/PitchPro-SPA/js/navigation-manager.js`: NavigationManagerクラス
- `/PitchPro-SPA/js/router.js`: SimpleRouterクラス
