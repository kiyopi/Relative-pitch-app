# Navigation & Reload Detection Specification
# ナビゲーション・リロード検出システム仕様書

**バージョン**: 2.4.0
**作成日**: 2025-11-18
**最終更新**: 2025-11-22
**プロジェクト**: 8va相対音感トレーニングアプリ

---

## 📋 目次

1. [概要](#概要)
2. [設計思想](#設計思想)
3. [2フラグシステム](#2フラグシステム)
4. [準備スキップ判定システム](#準備スキップ判定システム)
5. [NavigationManager API](#navigationmanager-api)
6. [実装パターン](#実装パターン)
7. [フロー図](#フロー図)
8. [テストシナリオ](#テストシナリオ)
9. [トラブルシューティング](#トラブルシューティング)
10. [更新履歴](#更新履歴)

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
- `preparation`: 準備ページ（リロード時ページ継続・Step 1から再開、ダイレクトアクセス不可）
  - **v4.6.0**: リロード時はホームへリダイレクトせず、ページ継続してStep 1から再開
  - 理由: セクション表示/非表示の複雑さを考慮し、統一動作でバグ防止
- `training`: トレーニングページ（リロード時ページ継続・PitchProに委譲、ダイレクトアクセス不可）
  - **v4.5.0**: マイク事前チェック追加でドレミガイド中のダイアログ出現を防止
  - **v4.6.1**: ダイレクトアクセス時のパラメータ検証強化・リダイレクト先分岐
- `result-session`: セッション結果ページ（リロード時ページ継続・データ復元、ダイレクトアクセス不可）
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

## 準備スキップ判定システム

### 概要

総合評価ページやホームページから、既にマイク許可・音域データが揃っている場合に準備ページをスキップしてトレーニングページへ直接遷移する機能。

### 設計背景（v2.2.0で追加）

#### 発見された問題（2025-11-19）

**症状**:
ホームページリロード後に「始める」ボタンを押すと、localStorageには`micPermissionGranted=true`が残っているが、実際のMediaStreamはブラウザによって破棄されている。従来の`canSkipPreparation()`はlocalStorageのみをチェックしていたため、準備スキップ判定が誤ってtrueを返し、トレーニングページで再度マイク許可ダイアログが表示される問題が発生。

**根本原因**:
```javascript
// 従来の実装（問題あり）
static canSkipPreparation() {
    const micGranted = localStorage.getItem('micPermissionGranted') === 'true';
    const hasVoiceRange = !!localStorage.getItem('voiceRangeData');
    return micGranted && hasVoiceRange;  // ← localStorageのみで判定
}
```

- localStorage: ページリロード後も保持される
- MediaStream: ページリロード後は破棄される
- 判定の不整合により、準備スキップが誤って実行される

### 3層防御アプローチ（v2.2.0実装）

安定性を最優先し、3つの異なる層で準備スキップ可否を判定：

#### Layer 1: ページリロード検出
```javascript
if (performance.navigation && performance.navigation.type === 1) {
    console.log('⚠️ Layer 1: ページリロード検出 → 準備ページ必須');
    return false;
}
```

**特性**:
- **最も確実な防御**: リロード時は確実にMediaStreamが破棄される
- **即座に判定**: 他のチェックを実行する前に早期リターン
- **効率的**: パフォーマンスへの影響が最小

#### Layer 2: localStorage確認
```javascript
const micGranted = localStorage.getItem('micPermissionGranted') === 'true';
const hasVoiceRange = !!localStorage.getItem('voiceRangeData');

if (!micGranted || !hasVoiceRange) {
    console.log(`⚠️ Layer 2: localStorage不足 (mic: ${micGranted}, range: ${hasVoiceRange}) → 準備ページ必須`);
    return false;
}
```

**特性**:
- **基本的なデータ存在チェック**: 最低限必要なデータの確認
- **軽量**: 同期的な処理で高速
- **フォールバック**: Layer 3が失敗した場合の基本判定

#### Layer 3: Permissions API確認
```javascript
try {
    const permissionStatus = await navigator.permissions.query({ name: 'microphone' });
    if (permissionStatus.state !== 'granted') {
        console.log(`⚠️ Layer 3: マイク許可が失効 (state: ${permissionStatus.state}) → 準備ページ必須`);
        return false;
    }

    console.log('✅ 3層すべてパス → 準備スキップ可能');
    return true;
} catch (error) {
    console.warn('⚠️ Layer 3: Permissions API未サポート → 安全のため準備ページへ', error);
    return false;
}
```

**特性**:
- **ブラウザの実際の権限状態を確認**: 最も信頼性の高い判定
- **非同期処理**: async/await対応
- **フォールバック**: API未サポート時は安全側に倒す

### 実装詳細

#### NavigationManager.canSkipPreparation()（v2.2.0）

```javascript
/**
 * 【v4.3.4】準備ページをスキップしてトレーニング直行できるか判定（3層防御アプローチ）
 *
 * 【安定性重視の3層防御】
 * - Layer 1: ページリロード検出 → リロード時は必ず準備ページへ（MediaStream破棄対策）
 * - Layer 2: localStorage確認 → 基本的なデータ存在チェック
 * - Layer 3: Permissions API → 実際のマイク権限状態を確認
 *
 * @returns {Promise<boolean>} true: 準備スキップ可能, false: 準備ページ経由が必要
 */
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
        console.log(`⚠️ [NavigationManager] Layer 2: localStorage不足 (mic: ${micGranted}, range: ${hasVoiceRange}) → 準備ページ必須`);
        return false;
    }

    // === Layer 3: Permissions API（実際の権限状態確認） ===
    try {
        const permissionStatus = await navigator.permissions.query({ name: 'microphone' });

        if (permissionStatus.state !== 'granted') {
            console.log(`⚠️ [NavigationManager] Layer 3: マイク許可が失効 (state: ${permissionStatus.state}) → 準備ページ必須`);
            return false;
        }

        console.log('✅ [NavigationManager] 3層すべてパス → 準備スキップ可能');
        return true;

    } catch (error) {
        console.warn('⚠️ [NavigationManager] Layer 3: Permissions API未サポート → 安全のため準備ページへ', error);
        return false;
    }
}
```

#### async/await対応（全13箇所）

**router.js - setupHomeEvents()** (line 699):
```javascript
async setupHomeEvents() {  // ← async追加
    trainingButtons.forEach(button => {
        button.addEventListener('click', async (e) => {
            // ...
            if (route === 'preparation') {
                const canSkip = await NavigationManager.canSkipPreparation();  // ← await追加
                // ...
            }
        });
    });
}
```

**results-overview-controller.js** (12箇所):
```javascript
// 全てのnext-stepボタンハンドラ
'next-step-random-practice': async () => {  // ← async追加
    if (window.NavigationManager) {
        const canSkip = await NavigationManager.canSkipPreparation();  // ← await追加
        // ...
    }
}
```

### テスト結果（全5ケース成功）

| # | テストケース | ページ遷移 | 3層防御動作 | 結果 |
|---|---|---|---|---|
| 1 | **ホームリロード→準備経由** | home → preparation | **Layer 1検出** | ✅ 成功 |
| 2 | **準備→トレーニング** | preparation → training | 判定不要 | ✅ 成功 |
| 3 | **総合評価→準備スキップ** | results-overview → training | **3層すべてパス** | ✅ 成功 |
| 4 | **総合評価リロード→準備経由** | results-overview → preparation | **Layer 1検出** | ✅ 成功 |
| 5 | **準備経由後のホーム→スキップ** | home → training | **3層すべてパス** | ✅ 成功 |

#### テストケース詳細

**ケース1: ホームリロード→準備経由**
```
ホームページをリロード
↓
Layer 1: performance.navigation.type === 1 検出
↓
⚠️ ページリロード検出 → 準備ページ必須
↓
準備ページへ正常遷移 ✅
```

**ケース3: 総合評価→準備スキップ**
```
総合評価ページ（リロードなし）
↓
Layer 1: リロードではない（通過）
Layer 2: localStorage確認（通過）
Layer 3: Permissions API（granted、通過）
↓
✅ 3層すべてパス → 準備スキップ可能
↓
トレーニングページへ直接遷移 ✅
許可ダイアログなし ✅
```

**ケース5: 準備経由後のホーム→スキップ**
```
準備ページでマイク許可取得
↓
ホームボタンでホームへ（SPA遷移）
  - NavigationManager: MediaStream適切に破棄
  - localStorage: 許可状態保持
  - Permissions API: granted保持
↓
連続チャレンジボタン押下
↓
Layer 1: リロードではない（通過）
Layer 2: localStorage確認（通過）
Layer 3: Permissions API（granted、通過）
↓
✅ 3層すべてパス → 準備スキップ可能
↓
トレーニングページへ直接遷移 ✅
新規MediaStream取得（許可ダイアログなし） ✅
```

### 設計の利点

1. **多層防御**: 単一の判定基準に依存しない
2. **早期リターン**: Layer 1で最も一般的なケースを高速判定
3. **信頼性**: Permissions APIで実際の権限状態を確認
4. **フォールバック**: API未サポート時も安全に動作
5. **デバッグ容易性**: 各Layerで詳細ログ出力

### 制限事項

#### Permissions APIの制約

**確認内容**: ユーザーが過去にマイク許可を与えたかどうか
**確認できないこと**: 現在有効なMediaStreamが存在するか

**例**: 準備ページでマイク許可後にリロードした場合
- Permissions API: `granted`（過去に許可済み）
- MediaStream: 破棄済み（新規取得が必要）
- 判定: Layer 1のリロード検出が必須

#### Edge Case処理

**準備ページでMediaStream破棄→ホーム→トレーニング**:
```
準備ページでMediaStream適切に破棄
↓
ホームへSPA遷移（リロードではない）
↓
3層すべてパス → 準備スキップ
↓
トレーニングページで新規MediaStream取得 ✅
許可ダイアログなし（既に許可済みのため） ✅
```

**動作**: 正常（トレーニングページで自動的にMediaStream再取得）
**理由**: ユーザーは既に許可済み、スムーズに再取得可能

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

    // 2. trainingページのダイレクトアクセス検出【v4.6.1強化】
    // 新規ナビゲーション（ブックマーク・URL直接入力等）の場合のみ検出
    if (page === 'training' && this.isNewNavigation()) {
        // フラグクリア（古いセッションの影響を排除）
        sessionStorage.removeItem('trainingPageActive');
        sessionStorage.removeItem(this.KEYS.NORMAL_TRANSITION);

        // パラメータ検証（ModeControllerに委譲）
        const validation = this.validateTrainingParams();

        if (!validation.isValid) {
            // パラメータ不足・無効 → ホームへリダイレクト
            const alertMessage = `${validation.message}\nホーム画面からやり直してください。`;
            alert(alertMessage);
            window.location.hash = 'home';
            return { shouldContinue: false, reason: `direct-access-training-${validation.reason}` };
        } else {
            // パラメータ有効 → preparationへリダイレクト
            alert('トレーニングページは準備ページから開始してください。\nマイク設定のため準備ページに移動します。');
            await this.redirectToPreparation('ダイレクトアクセス検出（パラメータ有効）');
            return { shouldContinue: false, reason: 'direct-access-training-to-preparation' };
        }
    }

    // 3. result-sessionページのダイレクトアクセス検出
    if (page === 'result-session' && this.requiresPreparation(page)) {
        alert('セッション結果ページは準備ページから開始してください。');
        await this.redirectToPreparation('ダイレクトアクセス検出');
        return { shouldContinue: false, reason: 'direct-access-result-session' };
    }

    // 4. リロード検出
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

    // 5. すべてのチェックをパス - 初期化続行
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

#### isNewNavigation() 【v4.6.1追加】
```javascript
/**
 * 新規ナビゲーション検出（ブックマーク・URL直接入力等）
 * Navigation Timing API v2を使用して判定
 *
 * @returns {boolean} 新規ナビゲーションの場合true
 */
static isNewNavigation() {
    const navEntries = performance.getEntriesByType('navigation');
    if (navEntries.length > 0) {
        const navType = navEntries[0].type;
        // 'navigate' = 新規ナビゲーション（URL入力、ブックマーク、リンククリック）
        // 'reload' = リロード
        // 'back_forward' = 戻る/進む
        return navType === 'navigate';
    }

    // フォールバック（古いブラウザ対応）
    if (performance.navigation) {
        return performance.navigation.type === 0;  // TYPE_NAVIGATE
    }

    return false;
}
```

#### validateTrainingParams() 【v4.6.1追加】
```javascript
/**
 * trainingページアクセス時のパラメータ検証
 * ModeControllerに検証ロジックを委譲
 *
 * @returns {Object} { isValid: boolean, reason: string, message: string, params: Object }
 */
static validateTrainingParams() {
    const hash = window.location.hash.substring(1);
    const urlParams = new URLSearchParams(hash.split('?')[1] || '');

    const params = {
        mode: urlParams.get('mode'),
        direction: urlParams.get('direction'),  // デフォルト値なし（必須）
        startNote: urlParams.get('startNote'),
        chromaticDirection: urlParams.get('chromaticDirection')
    };

    // ModeControllerに検証を委譲
    if (typeof window.ModeController !== 'undefined' && window.ModeController.validateTrainingParams) {
        const result = window.ModeController.validateTrainingParams(params);
        return {
            isValid: result.isValid,
            reason: result.reason,
            message: result.message,
            params
        };
    }

    // フォールバック（ModeController未ロード時）
    const validModes = ['random', 'continuous', '12tone'];
    const validDirections = ['ascending', 'descending'];

    if (!params.mode) {
        return { isValid: false, reason: 'no-mode', message: 'トレーニングモードが指定されていません。', params };
    }
    if (!validModes.includes(params.mode)) {
        return { isValid: false, reason: 'invalid-mode', message: `無効なトレーニングモードです: ${params.mode}`, params };
    }
    if (!params.direction) {
        return { isValid: false, reason: 'no-direction', message: '音階方向（上行/下行）が指定されていません。', params };
    }
    if (!validDirections.includes(params.direction)) {
        return { isValid: false, reason: 'invalid-direction', message: `無効な音階方向です: ${params.direction}`, params };
    }
    if (params.mode === '12tone' && !params.startNote) {
        return { isValid: false, reason: 'chromatic-no-startnote', message: '12音階モードには基音の指定が必要です。', params };
    }

    return { isValid: true, reason: 'valid', message: 'パラメータは有効です。', params };
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

### テスト4: トレーニングページ直接アクセス検出（パラメータ有効）【v4.6.1】

**手順**:
1. 新しいタブを開く
2. URL直接入力: `#training?mode=continuous&direction=ascending`

**期待結果**:
- ✅ ダイアログ表示: 「トレーニングページは準備ページから開始してください。マイク設定のため準備ページに移動します。」
- ✅ OK押下後、準備ページへリダイレクト（パラメータ引き継ぎ）
- ✅ サブタイトル: 「連続チャレンジ 上行の準備中」

**検証ログ**:
```
⚠️ trainingへのダイレクトアクセス検出 - 準備ページ経由が必要
パラメータ検証: valid（mode=continuous, direction=ascending）
preparationへリダイレクト: ダイレクトアクセス検出（パラメータ有効）
✅ サブタイトル更新: 連続チャレンジ 上行の準備中
```

### テスト4-1: トレーニングページ直接アクセス検出（モードなし）【v4.6.1】

**手順**:
1. 新しいタブを開く
2. URL直接入力: `#training`（パラメータなし）

**期待結果**:
- ✅ ダイアログ表示: 「トレーニングモードが指定されていません。ホーム画面からやり直してください。」
- ✅ OK押下後、ホームページへリダイレクト

**検証ログ**:
```
⚠️ trainingへのダイレクトアクセス検出
パラメータ検証: no-mode
ホームへリダイレクト: direct-access-training-no-mode
```

### テスト4-2: トレーニングページ直接アクセス検出（方向なし）【v4.6.1】

**手順**:
1. 新しいタブを開く
2. URL直接入力: `#training?mode=random`（方向パラメータなし）

**期待結果**:
- ✅ ダイアログ表示: 「音階方向（上行/下行）が指定されていません。ホーム画面からやり直してください。」
- ✅ OK押下後、ホームページへリダイレクト

**検証ログ**:
```
⚠️ trainingへのダイレクトアクセス検出
パラメータ検証: no-direction（mode=random, direction=null）
ホームへリダイレクト: direct-access-training-no-direction
```

### テスト4-3: トレーニングページ直接アクセス検出（12音階・基音なし）【v4.6.1】

**手順**:
1. 新しいタブを開く
2. URL直接入力: `#training?mode=12tone&direction=ascending`（基音パラメータなし）

**期待結果**:
- ✅ ダイアログ表示: 「12音階モードには基音の指定が必要です。ホーム画面からやり直してください。」
- ✅ OK押下後、ホームページへリダイレクト

**検証ログ**:
```
⚠️ trainingへのダイレクトアクセス検出
パラメータ検証: chromatic-no-startnote（mode=12tone, direction=ascending, startNote=null）
ホームへリダイレクト: direct-access-training-chromatic-no-startnote
```

### テスト4-4: トレーニングページ直接アクセス検出（無効なモード）【v4.6.1】

**手順**:
1. 新しいタブを開く
2. URL直接入力: `#training?mode=invalid&direction=ascending`（存在しないモード）

**期待結果**:
- ✅ ダイアログ表示: 「無効なトレーニングモードです: invalid ホーム画面からやり直してください。」
- ✅ OK押下後、ホームページへリダイレクト

**検証ログ**:
```
⚠️ trainingへのダイレクトアクセス検出
パラメータ検証: invalid-mode（providedMode=invalid）
ホームへリダイレクト: direct-access-training-invalid-mode
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

### v2.4.0 (2025-11-22)
- **追加**: trainingダイレクトアクセス時のパラメータ検証強化（v4.6.1）
  - Navigation Timing API v2で新規ナビゲーション（ブックマーク等）を検出
  - `isNewNavigation()`メソッド追加: navigate/reload/back_forwardを区別
  - ModeControllerに`validateTrainingParams()`メソッドを追加（一元管理）
  - パラメータ検証をNavigationManagerからModeControllerに委譲
- **変更**: ダイレクトアクセス時のリダイレクト先を分岐
  - モード情報なし → ホームへリダイレクト（モード選択画面）
  - 方向情報なし → ホームへリダイレクト（必須パラメータ）
  - 12音階モードで基音なし → ホームへリダイレクト
  - パラメータ有効 → preparationへリダイレクト（マイク準備）
- **変更**: direction（音階方向）を必須パラメータに変更（デフォルト値なし）
- **追加**: 新規モード追加時の保守性向上
  - ModeController.modesのみ更新すればOK
  - validModes配列のハードコードを廃止
- **追加**: `ModeController.getValidModeIds()`メソッド

### v2.3.0 (2025-11-22)
- **変更**: preparationページのリロード動作を統一化（v4.6.0）
  - リロード時: ホームへリダイレクトせず、ページ継続してStep 1から再開
  - 理由: セクション表示/非表示の複雑さを考慮し、統一動作でバグ防止
  - ユーザー心理: リロード = やり直しが自然な認識
- **追加**: `preparationCurrentStep`フラグ（preparation-pitchpro-cycle.jsで管理）
- **変更**: navigation-manager.js checkPageAccess()のpreparation判定を簡素化
- **変更**: router.js cleanupCurrentPage()でpreparationCurrentStepをクリア
- **削除**: preparationページのStep別複雑な判定ロジック（シンプル化）
- **関連**: trainingページ v4.5.0 マイク事前チェック追加との整合性確保

### v2.2.0 (2025-11-19)
- **追加**: 準備スキップ判定システムの3層防御アプローチ実装
- **追加**: `canSkipPreparation()`メソッドの完全書き換え（同期→非同期）
- **変更**: router.js setupHomeEvents()をasync対応（line 699）
- **変更**: results-overview-controller.js 全12箇所のnext-stepボタンをasync/await対応
- **問題解決**: ホームリロード後の準備スキップ誤判定問題を完全解決
  - Layer 1: `performance.navigation.type === 1`でリロード検出
  - Layer 2: localStorage確認（micPermissionGranted + voiceRangeData）
  - Layer 3: Permissions API確認（navigator.permissions.query）
- **テスト**: 全5テストケース成功（リロード検出・準備スキップ・Edge Case）
- **安定性向上**: MediaStream破棄後のリロード時に準備ページへ確実に誘導
- **パフォーマンス**: Layer 1早期リターンにより高速判定
- **コミット**: b9d154e "fix(navigation): 準備スキップ判定の3層防御アプローチ実装（v4.3.4）"

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
