# Router統一ページ初期化システム 開発者ガイド

**バージョン**: 2.0.0
**最終更新**: 2025-01-17
**対象**: 開発者・保守担当者
**前提知識**: JavaScript基礎、SPA概念、Web Audio API基礎

---

## 📋 目次

1. [概要](#概要)
2. [アーキテクチャ](#アーキテクチャ)
3. [新規ページ追加手順](#新規ページ追加手順)
4. [pageConfigs詳細仕様](#pageconfigs詳細仕様)
5. [依存関係待機システム](#依存関係待機システム)
6. [二重初期化防止](#二重初期化防止)
7. [トラブルシューティング](#トラブルシューティング)
8. [ベストプラクティス](#ベストプラクティス)
9. [FAQ](#faq)
10. [参考資料](#参考資料)

---

## 概要

### このシステムの目的

**8va相対音感トレーニングアプリ**のSPA環境において、全ページの初期化処理を統一的に管理するシステムです。

**解決する課題**:
- ❌ **従来の問題**: 各ページが個別に初期化ロジックを実装、重複コードと保守困難
- ❌ **スクリプト読み込みの混乱**: テンプレートHTML内のscriptタグが実行されない
- ❌ **依存関係管理の欠如**: Chart.js、PitchPro等の読み込み完了を待機できない
- ❌ **二重初期化バグ**: 同じページを再訪時に初期化が重複実行される

**このシステムの解決策**:
- ✅ **統一初期化**: router.jsのpageConfigsレジストリで一元管理
- ✅ **スクリプト事前読み込み**: index.htmlで全コントローラーを事前読み込み
- ✅ **依存関係待機**: 非同期で依存ライブラリの読み込み完了を待機
- ✅ **二重初期化防止**: Router側とController側の二重防御システム

### システム構成要素

| 要素 | ファイル | 役割 |
|------|---------|------|
| **Router** | `/js/router.js` | ページ遷移・初期化管理 |
| **pageConfigs** | `router.js` 内レジストリ | ページ設定の一元管理 |
| **Controllers** | `/pages/js/*-controller.js` | 各ページの初期化ロジック |
| **index.html** | `/index.html` | コントローラー事前読み込み |
| **Templates** | `/pages/*.html` | ページHTMLテンプレート |

---

## アーキテクチャ

### システム全体フロー

```
┌─────────────────────────────────────────────────────────────┐
│ 1. アプリケーション起動                                        │
│    - index.html読み込み                                       │
│    - 全コントローラーJS事前読み込み（window.initXXX定義）      │
│    - router.js初期化                                          │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. ユーザーがページ遷移（例: #results-overview）              │
│    - hashChangeイベント発火                                   │
│    - router.handleRouteChange() 実行                          │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. Router処理フロー                                           │
│    ① cleanupCurrentPage() - 前ページのクリーンアップ          │
│    ② loadPage() - テンプレートHTML読み込み・挿入              │
│    ③ setupPageEvents() - 初期化処理実行                       │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. setupPageEvents() 詳細フロー                               │
│    ① pageConfigs[page]から設定取得                            │
│    ② preventDoubleInitチェック（既に初期化済み？）            │
│    ③ 依存関係待機（dependencies配列）                         │
│    ④ 初期化関数実行（window[config.init]()）                  │
│    ⑤ 初期化完了フラグセット（preventDoubleInit: true時）      │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 5. Controller初期化実行                                        │
│    - Controller内部の二重初期化防止チェック                    │
│    - DOM操作・イベント設定・データ読み込み                      │
│    - Lucideアイコン初期化                                      │
└─────────────────────────────────────────────────────────────┘
```

### pageConfigsレジストリ構造

**ファイル**: `/js/router.js` (Lines 32-68)

```javascript
this.pageConfigs = {
    'home': {
        init: null,  // setupHomeEvents()で特別処理
        dependencies: []
    },
    'preparation': {
        init: 'initializePreparationPitchProCycle',
        dependencies: ['PitchPro']
    },
    'training': {
        init: 'initializeTrainingPage',
        dependencies: ['PitchPro']
    },
    'results-overview': {
        init: 'initResultsOverview',
        dependencies: ['Chart', 'DistributionChart'],
        preventDoubleInit: true  // 二重初期化防止
    },
    'records': {
        init: 'initRecordsPage',
        dependencies: ['DistributionChart']
    },
    'premium-analysis': {
        init: 'initPremiumAnalysisPage',
        dependencies: ['Chart']
    },
    'settings': {
        init: 'initSettings',
        dependencies: []
    },
    'voice-range': {
        init: 'initVoiceRangeTest',
        dependencies: ['PitchPro']
    }
};
```

### 依存関係待機フロー

```
┌─────────────────────────────────────────────────────────────┐
│ waitForDependencies(['Chart', 'DistributionChart'])          │
└─────────────────────────────────────────────────────────────┘
                            ↓
        ┌───────────────────┴───────────────────┐
        │                                       │
┌───────▼──────┐                       ┌───────▼──────┐
│ Chart存在?    │                       │ DistChart存在?│
│ window.Chart │                       │ window.Dist..│
└───────┬──────┘                       └───────┬──────┘
        │ No                                   │ No
        ↓                                      ↓
┌───────────────┐                       ┌───────────────┐
│ 50ms待機       │                       │ 50ms待機       │
│ リトライ       │                       │ リトライ       │
└───────┬───────┘                       └───────┬───────┘
        │ タイムアウト5秒                        │
        ↓                                      ↓
┌───────────────┐                       ┌───────────────┐
│ ✅ 成功        │                       │ ✅ 成功        │
│ ❌ 失敗        │                       │ ❌ 失敗        │
└───────┬───────┘                       └───────┬───────┘
        └───────────────────┬───────────────────┘
                            ↓
                ┌───────────────────────┐
                │ すべて成功？           │
                │ Yes → 初期化実行      │
                │ No  → エラー表示      │
                └───────────────────────┘
```

### 二重初期化防止メカニズム

**二重防御システム**:

```
┌─────────────────────────────────────────────────────────────┐
│ 【防御Layer 1】Router側防止                                   │
│ - preventDoubleInit: true設定                                 │
│ - initializedPages Set管理                                    │
│ - cleanupCurrentPage()でフラグリセット                         │
└─────────────────────────────────────────────────────────────┘
                            ↓
              初期化関数呼び出し（1回目は実行、2回目は内部でブロック）
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 【防御Layer 2】Controller側防止                               │
│ - Controller内部でlet initialized = false;                   │
│ - 初期化関数内でif (initialized) return;                     │
│ - 初期化完了時にinitialized = true;                           │
└─────────────────────────────────────────────────────────────┘
```

**動作例（results-overview）**:

```javascript
// router.js setupPageEvents()
if (config.preventDoubleInit && this.initializedPages.has(page)) {
    console.log(`✅ [Router] Page "${page}" already initialized, skipping`);
    return;  // Router側で初期化呼び出し自体をスキップ
}

// results-overview-controller.js
let initialized = false;

window.initResultsOverview = async function(hash) {
    if (initialized) {
        console.warn('⚠️ [results-overview] 既に初期化済み - 二重初期化を防止しました');
        return;  // Controller側でも防止
    }

    // 初期化処理...
    initialized = true;
};
```

---

## 新規ページ追加手順

### ステップ1: コントローラーファイル作成

**ファイル**: `/pages/js/[page-name]-controller.js`

```javascript
/**
 * [ページ名]ページコントローラー
 * @version 1.0.0
 * @description [ページの説明]
 */

// 初期化済みフラグ（二重初期化防止が必要な場合）
let initialized = false;

/**
 * [ページ名]ページ初期化関数
 * @param {string} hash - URLハッシュ（例: #page-name or #page-name?id=123）
 * @returns {Promise<void>}
 */
async function initializePageName(hash) {
    try {
        // 【オプション】二重初期化防止
        if (initialized) {
            console.warn('⚠️ [page-name] 既に初期化済み - 二重初期化を防止しました');
            return;
        }

        console.log('🎯 [page-name] ページ初期化開始');
        console.log('📍 [page-name] Hash:', hash);

        // ========================================
        // 1. DOM要素取得
        // ========================================
        const container = document.getElementById('main-container');
        if (!container) {
            console.error('❌ [page-name] コンテナ要素が見つかりません');
            return;
        }

        // ========================================
        // 2. データ読み込み
        // ========================================
        const data = await loadData();
        console.log('✅ [page-name] データ読み込み完了:', data);

        // ========================================
        // 3. UI構築
        // ========================================
        renderUI(data);
        console.log('✅ [page-name] UI構築完了');

        // ========================================
        // 4. イベント設定
        // ========================================
        setupEventListeners();
        console.log('✅ [page-name] イベント設定完了');

        // ========================================
        // 5. Lucideアイコン初期化
        // ========================================
        if (typeof window.initializeLucideIcons === 'function') {
            window.initializeLucideIcons({ immediate: true });
            console.log('✅ [page-name] Lucideアイコン初期化完了');
        }

        // 【オプション】初期化完了フラグセット
        initialized = true;
        console.log('✅ [page-name] ページ初期化完了');

    } catch (error) {
        console.error('❌ [page-name] 初期化エラー:', error);
        showErrorMessage('ページの初期化に失敗しました');
    }
}

/**
 * データ読み込み
 * @returns {Promise<Object>}
 */
async function loadData() {
    // データ読み込みロジック
    return {};
}

/**
 * UI構築
 * @param {Object} data
 */
function renderUI(data) {
    // UI構築ロジック
}

/**
 * イベントリスナー設定
 */
function setupEventListeners() {
    // イベント設定ロジック
}

/**
 * エラーメッセージ表示
 * @param {string} message
 */
function showErrorMessage(message) {
    console.error(message);
    // エラー表示UI更新
}

// ========================================
// グローバル公開（Router用）
// ========================================
window.initPageName = initializePageName;

console.log('✅ [page-name] コントローラー読み込み完了');
```

### ステップ2: index.htmlに追加

**ファイル**: `/index.html`

```html
<!-- 【v2.0.0追加】Router統一初期化システム用コントローラー -->
<script src="pages/js/records-controller.js?v=20251115014"></script>
<script src="pages/js/results-overview-controller.js?v=20251116009"></script>
<script src="pages/js/settings-controller.js?v=20251109002"></script>
<script src="pages/js/premium-analysis-calculator.js?v=20251110001"></script>
<script src="pages/js/premium-analysis-controller.js?v=20251110001"></script>
<!-- 👇 新規追加 -->
<script src="pages/js/page-name-controller.js?v=20250117001"></script>
```

**重要**:
- ✅ キャッシュバスター`?v=YYYYMMDDXXX`を必ず付ける
- ✅ 他のコントローラーと同じセクションに配置
- ✅ 依存関係がある場合は読み込み順序に注意

### ステップ3: pageConfigsに登録

**ファイル**: `/js/router.js`

```javascript
this.pageConfigs = {
    // ... 既存のページ設定 ...

    // 👇 新規追加
    'page-name': {
        init: 'initPageName',  // window.initPageNameと一致させる
        dependencies: [],       // 依存ライブラリ（Chart, DistributionChart, PitchPro等）
        preventDoubleInit: false  // 必要に応じてtrue
    }
};
```

**設定項目**:
- `init`: コントローラーで公開した関数名（`window.initXXX`）
- `dependencies`: 依存ライブラリの配列（詳細は後述）
- `preventDoubleInit`: 二重初期化防止の有効化

### ステップ4: テンプレートHTML作成

**ファイル**: `/pages/page-name.html`

```html
<!-- SPA用テンプレート: page-name -->
<div class="container">
    <!-- ページヘッダー -->
    <div class="page-header">
        <div class="page-header-content">
            <div class="page-header-icon-wrapper">
                <div class="page-header-icon gradient-catalog-purple">
                    <i data-lucide="layout" class="text-white"></i>
                </div>
            </div>
            <div class="page-header-text">
                <h1 class="page-title">[ページタイトル]</h1>
                <p class="page-subtitle text-purple-200">[サブタイトル]</p>
            </div>
        </div>
    </div>

    <!-- メインコンテンツ -->
    <main class="wide-main" id="main-container">
        <!-- JavaScriptで動的生成 -->
    </main>
</div>

<!-- 👇 コントローラーはindex.htmlで読み込み済みのためコメントアウト -->
<!-- <script src="pages/js/page-name-controller.js"></script> -->
```

**重要**:
- ❌ テンプレートHTML内に`<script>`タグを記述しない
- ❌ 重複読み込みを避ける
- ✅ コメントで理由を明記

### ステップ5: ナビゲーション追加

**ファイル**: `/index.html` または該当箇所

```html
<!-- ヘッダーナビゲーション -->
<button class="nav-button" onclick="location.hash='page-name'" title="[説明]">
    <i data-lucide="layout" class="icon-md"></i>
    <span class="nav-text">[表示名]</span>
</button>
```

**または**:

```javascript
// JavaScriptでの遷移
window.NavigationManager.navigate('page-name');
```

### ステップ6: テスト実施

**テスト項目**:

1. ✅ **初期化成功確認**
   - Consoleで`✅ [page-name] ページ初期化完了`が表示されるか
   - DOM要素が正しく生成されているか
   - Lucideアイコンが表示されているか

2. ✅ **依存関係待機確認**（依存関係がある場合）
   - Consoleで`⏳ [Router] Waiting for dependencies: ...`が表示されるか
   - 依存ライブラリ読み込み後に初期化されるか

3. ✅ **二重初期化防止確認**（preventDoubleInit: trueの場合）
   - ページに訪問 → 他ページへ → 再訪問
   - Consoleで`⚠️ [page-name] 既に初期化済み`が表示されるか

4. ✅ **エラーハンドリング確認**
   - 依存関係が読み込まれない場合のエラー表示
   - データ読み込み失敗時のエラー表示

### ステップ7: ドキュメント更新

**更新対象**:
- `MODULE_ARCHITECTURE.md`: モジュール構成図に追加
- `README.md`: ページ一覧に追加
- `PHASE3_TEST_PLAN.md`: テストケース追加（必要に応じて）

---

## pageConfigs詳細仕様

### 基本構造

```javascript
'page-name': {
    init: string | null,           // 初期化関数名
    dependencies: string[],        // 依存ライブラリ配列
    preventDoubleInit: boolean     // 二重初期化防止（オプション）
}
```

### プロパティ詳細

#### `init` (string | null)

**説明**: ページ初期化時に呼び出すグローバル関数名

**指定方法**:
- コントローラーで `window.initXXX = function() {}` と公開した関数名を指定
- `null`の場合は特別処理（homeページのみ）

**例**:
```javascript
// Controller側
window.initResultsOverview = async function(hash) { /* ... */ };

// Router側 pageConfigs
'results-overview': {
    init: 'initResultsOverview',  // 👈 一致させる
    // ...
}
```

**注意**:
- ❌ 関数が存在しない場合は`❌ [Router] Init function "initXXX" not found`エラー
- ✅ index.htmlで事前読み込みされていることを確認

#### `dependencies` (string[])

**説明**: ページ初期化前に読み込み完了を待機するライブラリの配列

**利用可能な依存関係**:
- `'Chart'` - Chart.js（グラフ表示に必要）
- `'DistributionChart'` - 評価分布グラフコンポーネント
- `'PitchPro'` - 音声処理ライブラリ

**チェック方法**:
```javascript
// Routerは以下の存在をチェック
window.Chart           // Chart.js
window.DistributionChart // 評価分布グラフ
window.PitchPro        // 音声処理
```

**例**:
```javascript
// Chart.jsとDistributionChartが必要な場合
'results-overview': {
    init: 'initResultsOverview',
    dependencies: ['Chart', 'DistributionChart'],
    // ...
}

// PitchProのみが必要な場合
'preparation': {
    init: 'initializePreparationPitchProCycle',
    dependencies: ['PitchPro']
}

// 依存関係なし
'settings': {
    init: 'initSettings',
    dependencies: []
}
```

**待機ロジック**:
- 50msポーリング
- 最大5秒タイムアウト
- すべての依存関係が揃うまで初期化を遅延

#### `preventDoubleInit` (boolean)

**説明**: ページ再訪時に初期化を防止するフラグ

**デフォルト**: `false`（省略可能）

**使用ケース**:
- ✅ **Chart.js描画があるページ**: グラフの二重描画を防止
- ✅ **イベントリスナー多数**: イベントの多重登録を防止
- ✅ **重い初期化処理**: パフォーマンス最適化

**例**:
```javascript
'results-overview': {
    init: 'initResultsOverview',
    dependencies: ['Chart', 'DistributionChart'],
    preventDoubleInit: true  // 👈 二重初期化防止
}
```

**動作フロー**:
```javascript
// 1回目訪問
setupPageEvents('results-overview')
  → initializedPages.has('results-overview') = false
  → initResultsOverview() 実行
  → initializedPages.add('results-overview')

// 他ページに移動
cleanupCurrentPage()
  → initializedPages.delete('results-overview')  // フラグリセット

// 2回目訪問
setupPageEvents('results-overview')
  → initializedPages.has('results-overview') = false
  → initResultsOverview() 実行
  → Controller内部で initialized = true をチェック
  → 二重防御により初期化本体スキップ
```

**注意**:
- Router側のフラグはページ離脱時にリセットされる
- Controller側の内部フラグで確実に防止される
- **二重防御システム**により高い信頼性を実現

### 完全な設定例

```javascript
this.pageConfigs = {
    // ========================================
    // 1. 依存関係なし・二重初期化防止なし
    // ========================================
    'settings': {
        init: 'initSettings',
        dependencies: []
    },

    // ========================================
    // 2. PitchPro依存・二重初期化防止なし
    // ========================================
    'preparation': {
        init: 'initializePreparationPitchProCycle',
        dependencies: ['PitchPro']
    },

    // ========================================
    // 3. Chart依存・二重初期化防止なし
    // ========================================
    'premium-analysis': {
        init: 'initPremiumAnalysisPage',
        dependencies: ['Chart']
    },

    // ========================================
    // 4. 複数依存・二重初期化防止あり
    // ========================================
    'results-overview': {
        init: 'initResultsOverview',
        dependencies: ['Chart', 'DistributionChart'],
        preventDoubleInit: true  // グラフ二重描画防止
    },

    // ========================================
    // 5. 特別処理（homeページのみ）
    // ========================================
    'home': {
        init: null,  // setupHomeEvents()で別途処理
        dependencies: []
    }
};
```

---

## 依存関係待機システム

### waitForDependencies() 詳細仕様

**ファイル**: `/js/router.js` (Lines 277-312)

```javascript
/**
 * 依存関係の読み込み完了を待機
 * @param {string[]} dependencies - 依存ライブラリ名の配列
 * @returns {Promise<boolean>} すべて読み込み完了でtrue、タイムアウトでfalse
 */
async waitForDependencies(dependencies) {
    const timeout = 5000; // 5秒タイムアウト
    const pollInterval = 50; // 50msポーリング
    const startTime = Date.now();

    console.log(`⏳ [Router] Waiting for dependencies: ${dependencies.join(',')}`);

    for (const dep of dependencies) {
        let attempts = 0;

        while (!window[dep]) {
            if (Date.now() - startTime > timeout) {
                console.error(`❌ [Router] Timeout waiting for: ${dep}`);
                return false;
            }

            await new Promise(resolve => setTimeout(resolve, pollInterval));
            attempts++;
        }

        console.log(`✅ [Router] Dependency ready: ${dep} (Attempt ${attempts})`);
    }

    return true;
}
```

### 依存関係の追加方法

#### 新しいライブラリを依存関係に追加する場合

**STEP 1: ライブラリをindex.htmlで読み込み**

```html
<!-- 例: 新しいグラフライブラリ -->
<script src="https://cdn.jsdelivr.net/npm/d3@7.8.5/dist/d3.min.js"></script>
```

**STEP 2: グローバルオブジェクトを確認**

```javascript
// ブラウザのコンソールで確認
console.log(window.d3); // d3オブジェクトが存在するか確認
```

**STEP 3: pageConfigsのdependenciesに追加**

```javascript
'new-page': {
    init: 'initNewPage',
    dependencies: ['d3'],  // 👈 グローバルオブジェクト名を指定
}
```

**STEP 4: waitForDependencies()が自動的にチェック**

```javascript
// Routerが自動的にwindow.d3の存在をチェック
while (!window['d3']) {
    // 50msごとにチェック、5秒でタイムアウト
}
```

### タイムアウト処理

**タイムアウト時の動作**:

```javascript
// router.js showInitializationError()
showInitializationError(page, dependencies) {
    const appRoot = document.getElementById('app-root');
    if (!appRoot) return;

    appRoot.innerHTML = `
        <div class="flex flex-col items-center gap-4 py-12">
            <i data-lucide="alert-triangle" class="text-red-300" style="width: 64px; height: 64px;"></i>
            <h2 class="text-2xl font-bold text-white">ページの読み込みに失敗しました</h2>
            <p class="text-white-60">必要なライブラリ (${dependencies.join(', ')}) の読み込みを待機中にタイムアウトしました。</p>
            <button onclick="location.reload()" class="btn btn-primary">
                <i data-lucide="refresh-cw"></i>
                <span>再読み込み</span>
            </button>
        </div>
    `;
}
```

**ユーザーへの影響**:
- エラーメッセージ表示
- 再読み込みボタン提供
- コンソールに詳細ログ出力

---

## 二重初期化防止

### なぜ二重初期化が問題なのか

**問題1: Chart.js二重描画**
```javascript
// 1回目の初期化
const chart1 = new Chart(ctx, config); // Canvas要素にグラフ描画

// 2回目の初期化（同じページを再訪）
const chart2 = new Chart(ctx, config); // エラー: Canvasが既に使用中
// Error: Canvas is already in use. Chart with ID '0' must be destroyed before the canvas can be reused.
```

**問題2: イベントリスナー多重登録**
```javascript
// 1回目の初期化
button.addEventListener('click', handleClick);

// 2回目の初期化
button.addEventListener('click', handleClick);

// 結果: ボタンクリック時にhandleClick()が2回実行される
```

**問題3: データ多重読み込み**
```javascript
// 1回目の初期化
await fetchDataFromAPI(); // 1秒かかる

// 2回目の初期化
await fetchDataFromAPI(); // また1秒かかる（無駄）
```

### 二重防御システムの実装

#### Router側防止（防御Layer 1）

**ファイル**: `/js/router.js`

```javascript
class Router {
    constructor() {
        // 初期化済みページを管理するSet
        this.initializedPages = new Set();
    }

    async setupPageEvents(page, fullHash) {
        const config = this.pageConfigs[page];

        // 👇 Router側防止
        if (config.preventDoubleInit && this.initializedPages.has(page)) {
            console.log(`✅ [Router] Page "${page}" already initialized, skipping`);
            return;  // 初期化関数呼び出しをスキップ
        }

        // 依存関係待機...
        // 初期化関数実行...

        // 👇 初期化完了をマーク
        if (config.preventDoubleInit) {
            this.initializedPages.add(page);
        }
    }

    cleanupCurrentPage() {
        const config = this.pageConfigs[this.currentPage];

        // 👇 ページ離脱時にフラグリセット
        if (config && config.preventDoubleInit && this.initializedPages.has(this.currentPage)) {
            this.initializedPages.delete(this.currentPage);
            console.log(`🔄 [Router] Reset initialization flag for: ${this.currentPage}`);
        }
    }
}
```

**動作**:
- 1回目訪問: `initializedPages.has('page') = false` → 初期化実行
- 2回目訪問: `initializedPages.has('page') = true` → 初期化スキップ
- ページ離脱: `initializedPages.delete('page')` → フラグリセット

**注意**:
- Router側の防止は、ページ離脱時にリセットされる
- **完全な防止はController側の内部チェックに依存**

#### Controller側防止（防御Layer 2）

**ファイル**: `/pages/js/*-controller.js`

```javascript
// 👇 モジュールスコープで初期化フラグ保持
let initialized = false;

window.initPageName = async function(hash) {
    // 👇 Controller側防止（絶対防御）
    if (initialized) {
        console.warn('⚠️ [page-name] 既に初期化済み - 二重初期化を防止しました');
        return;  // 初期化本体をスキップ
    }

    try {
        // 初期化処理...
        console.log('🎯 [page-name] ページ初期化開始');

        // DOM操作...
        // イベント設定...
        // Chart描画...

        // 👇 初期化完了フラグセット
        initialized = true;
        console.log('✅ [page-name] ページ初期化完了');

    } catch (error) {
        console.error('❌ [page-name] 初期化エラー:', error);
    }
};
```

**動作**:
- 1回目実行: `initialized = false` → 初期化実行 → `initialized = true`
- 2回目実行: `initialized = true` → return（本体スキップ）
- **ページリロードまでフラグ保持** → 絶対防止

### 実際の動作例（log5.txtより）

**1回目訪問**:
```
Line 185: 🎯 [Router] Initializing page "results-overview" with initResultsOverview()
Line 186: === 総合評価ページ初期化開始 ===
Line 187: 📊 [results-overview] 現在のハッシュ: #results-overview
Line 188-202: （完全な初期化処理実行）
```

**ページ離脱（homeへ）**:
```
Line 205: 🔄 [Router] Reset initialization flag for: results-overview
```

**2回目訪問**:
```
Line 233: 🎯 [Router] Initializing page "results-overview" with initResultsOverview()
Line 234: ⚠️ [results-overview] 既に初期化済み - 二重初期化を防止しました
```

**重要な観察点**:
- ✅ Router側はフラグをリセットしたため、`initResultsOverview()`を呼び出した
- ✅ Controller側の内部チェックで初期化本体をスキップした
- ✅ `=== 総合評価ページ初期化開始 ===` ログが2回目に出力されなかった
- ✅ **二重防御により確実に防止**

### preventDoubleInit使用判断基準

**必ず使用するケース**:
- ✅ Chart.js等のCanvas描画があるページ
- ✅ イベントリスナーを多数登録するページ
- ✅ 重いデータ読み込みがあるページ

**使用不要なケース**:
- ❌ 単純なDOM生成のみのページ
- ❌ 毎回最新データが必要なページ
- ❌ ステートレスなページ

---

## トラブルシューティング

### 問題1: "Init function not found" エラー

**エラーメッセージ**:
```
❌ [Router] Init function "initSettings" not found for page "settings"
```

**原因**:
- コントローラーがindex.htmlで読み込まれていない
- コントローラーの読み込みタイミングが遅い
- window.initXXXの関数名がpageConfigsと一致していない

**解決方法**:

**STEP 1: index.htmlでの読み込み確認**
```bash
# index.htmlを確認
grep "settings-controller.js" PitchPro-SPA/index.html
```

**STEP 2: コントローラーのグローバル公開確認**
```javascript
// settings-controller.js
// ❌ 間違い: グローバル公開していない
function initSettings() { /* ... */ }

// ✅ 正しい: グローバル公開
window.initSettings = function() { /* ... */ };
```

**STEP 3: pageConfigsの関数名確認**
```javascript
// router.js
'settings': {
    init: 'initSettings',  // 👈 window.initSettingsと一致させる
    // ...
}
```

**STEP 4: ブラウザコンソールで確認**
```javascript
// ページ読み込み後にコンソールで実行
console.log(typeof window.initSettings); // "function"と表示されるべき
```

### 問題2: 依存関係タイムアウト

**エラーメッセージ**:
```
❌ [Router] Timeout waiting for: Chart
```

**原因**:
- Chart.jsの読み込みに失敗
- ネットワーク遅延
- CDNの障害

**解決方法**:

**STEP 1: ライブラリ読み込み確認**
```html
<!-- index.html -->
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.js"></script>
```

**STEP 2: ネットワークタブ確認**
- ブラウザのデベロッパーツール → Network
- chart.umd.jsが200 OKで読み込まれているか確認

**STEP 3: グローバルオブジェクト確認**
```javascript
// コンソールで確認
console.log(window.Chart); // Chartオブジェクトが存在するか
```

**STEP 4: タイムアウト時間調整（必要に応じて）**
```javascript
// router.js waitForDependencies()
const timeout = 5000; // 5秒 → 10000に変更（10秒）
```

### 問題3: 二重初期化が防止されない

**症状**:
- ページを再訪すると初期化が2回実行される
- Chart.jsのエラーが出る
- イベントが多重発火する

**原因**:
- preventDoubleInitがfalse（または未設定）
- Controller側の初期化フラグがない
- フラグのリセットタイミング問題

**解決方法**:

**STEP 1: pageConfigs確認**
```javascript
// router.js
'results-overview': {
    init: 'initResultsOverview',
    dependencies: ['Chart', 'DistributionChart'],
    preventDoubleInit: true  // 👈 trueに設定
}
```

**STEP 2: Controller内部フラグ確認**
```javascript
// results-overview-controller.js
// 👇 モジュールスコープで定義
let initialized = false;

window.initResultsOverview = async function(hash) {
    // 👇 必ずチェック
    if (initialized) {
        console.warn('⚠️ 既に初期化済み');
        return;
    }

    // 初期化処理...

    // 👇 必ずセット
    initialized = true;
};
```

**STEP 3: ログ確認**
```
# 1回目訪問
🎯 [Router] Initializing page "results-overview" with initResultsOverview()
=== 総合評価ページ初期化開始 ===

# ページ離脱
🔄 [Router] Reset initialization flag for: results-overview

# 2回目訪問
🎯 [Router] Initializing page "results-overview" with initResultsOverview()
⚠️ [results-overview] 既に初期化済み - 二重初期化を防止しました
```

**STEP 4: 初期化開始ログが2回目に出ないことを確認**
- `=== 総合評価ページ初期化開始 ===` が2回目に出力されないことを確認
- 出力される場合は、内部フラグチェックが機能していない

### 問題4: テンプレートHTML内のscriptが実行されない

**症状**:
- template内の`<script>`タグが実行されない
- 変数が未定義エラー
- イベントが設定されない

**原因**:
- innerHTML挿入されたscriptタグは実行されない（セキュリティ制約）
- SPA環境の仕様

**解決方法**:

**❌ 間違い: テンプレート内にscript記述**
```html
<!-- pages/settings.html -->
<div class="container">
    <!-- コンテンツ -->
</div>

<!-- これは実行されない -->
<script>
    console.log('This will NOT execute');
</script>
```

**✅ 正しい: index.htmlで事前読み込み**
```html
<!-- index.html -->
<script src="pages/js/settings-controller.js"></script>
```

```html
<!-- pages/settings.html -->
<div class="container">
    <!-- コンテンツ -->
</div>

<!-- コメントアウト -->
<!-- <script src="pages/js/settings-controller.js"></script> -->
```

### 問題5: 重複変数宣言エラー

**エラーメッセージ**:
```
SyntaxError: Can't create duplicate variable: 'EvaluationCalculator'
```

**原因**:
- index.htmlとテンプレートHTMLの両方で同じスクリプトを読み込んでいる
- 同じ変数が2回宣言される

**解決方法**:

**STEP 1: 重複読み込み箇所を特定**
```bash
# EvaluationCalculatorの読み込み箇所を検索
grep -r "evaluation-calculator.js" PitchPro-SPA/
```

**STEP 2: index.htmlの読み込みを優先**
```html
<!-- index.html（残す） -->
<script src="js/evaluation-calculator.js"></script>
```

**STEP 3: テンプレートの読み込みをコメントアウト**
```html
<!-- records.html（コメントアウト） -->
<!-- 【v2.0.0】index.htmlで読み込み済みのためコメントアウト -->
<!-- <script src="js/evaluation-calculator.js"></script> -->
```

---

## ベストプラクティス

### 1. コントローラーの構造化

**推奨構造**:
```javascript
/**
 * [ページ名]コントローラー
 * @version 1.0.0
 */

// ========================================
// モジュールスコープ変数
// ========================================
let initialized = false;
let currentData = null;

// ========================================
// メイン初期化関数（Router用）
// ========================================
async function initializePageName(hash) {
    if (initialized) return;

    try {
        console.log('🎯 [page-name] 初期化開始');

        await loadData();
        renderUI();
        setupEvents();
        initializeLucide();

        initialized = true;
        console.log('✅ [page-name] 初期化完了');
    } catch (error) {
        handleError(error);
    }
}

// ========================================
// データ処理関数
// ========================================
async function loadData() { /* ... */ }
function processData(data) { /* ... */ }

// ========================================
// UI構築関数
// ========================================
function renderUI() { /* ... */ }
function createHeader() { /* ... */ }
function createContent() { /* ... */ }

// ========================================
// イベント処理関数
// ========================================
function setupEvents() { /* ... */ }
function handleButtonClick() { /* ... */ }

// ========================================
// ユーティリティ関数
// ========================================
function initializeLucide() { /* ... */ }
function handleError(error) { /* ... */ }

// ========================================
// グローバル公開
// ========================================
window.initPageName = initializePageName;
```

### 2. ログ出力の統一

**推奨フォーマット**:
```javascript
// 🎯 初期化開始
console.log('🎯 [page-name] 初期化開始');

// ✅ 成功
console.log('✅ [page-name] データ読み込み完了:', data);

// ⏳ 待機中
console.log('⏳ [page-name] API通信中...');

// ⚠️ 警告
console.warn('⚠️ [page-name] 既に初期化済み');

// ❌ エラー
console.error('❌ [page-name] 初期化エラー:', error);

// 📊 データ情報
console.log('📊 [page-name] 取得データ件数:', count);

// 🔄 リセット
console.log('🔄 [page-name] フラグリセット');
```

**メリット**:
- ログが視覚的に分かりやすい
- フィルタリングが容易
- デバッグ効率向上

### 3. エラーハンドリング

**基本パターン**:
```javascript
async function initializePageName(hash) {
    try {
        // 初期化処理...

    } catch (error) {
        console.error('❌ [page-name] 初期化エラー:', error);

        // ユーザーへのエラー表示
        showErrorMessage('ページの初期化に失敗しました。再読み込みしてください。');

        // エラー詳細をログ
        console.error('Error stack:', error.stack);

        // 必要に応じてエラー報告
        reportError(error);
    }
}

function showErrorMessage(message) {
    const container = document.getElementById('app-root');
    if (!container) return;

    container.innerHTML = `
        <div class="flex flex-col items-center gap-4 py-12">
            <i data-lucide="alert-triangle" class="text-red-300" style="width: 64px; height: 64px;"></i>
            <h2 class="text-2xl font-bold text-white">エラー</h2>
            <p class="text-white-60">${message}</p>
            <button onclick="location.reload()" class="btn btn-primary">
                <i data-lucide="refresh-cw"></i>
                <span>再読み込み</span>
            </button>
        </div>
    `;

    if (typeof window.initializeLucideIcons === 'function') {
        window.initializeLucideIcons({ immediate: true });
    }
}
```

### 4. 依存関係の最小化

**原則**:
- 必要最小限の依存関係のみ指定
- 不要な依存は削除

**例**:
```javascript
// ❌ 不要な依存関係
'settings': {
    init: 'initSettings',
    dependencies: ['Chart', 'DistributionChart']  // ❌ グラフ使わないのに指定
}

// ✅ 必要最小限
'settings': {
    init: 'initSettings',
    dependencies: []  // ✅ 依存なし
}
```

### 5. パフォーマンス最適化

**ローディング表示**:
```javascript
async function initializePageName(hash) {
    // ローディング表示
    showLoading();

    try {
        // 重い処理...
        await loadHeavyData();

        // ローディング非表示
        hideLoading();

        // UI構築
        renderUI();

    } catch (error) {
        hideLoading();
        handleError(error);
    }
}
```

**非同期処理の並列化**:
```javascript
// ❌ 順次実行（遅い）
const data1 = await fetchData1();
const data2 = await fetchData2();
const data3 = await fetchData3();

// ✅ 並列実行（速い）
const [data1, data2, data3] = await Promise.all([
    fetchData1(),
    fetchData2(),
    fetchData3()
]);
```

### 6. テスト容易性

**テスト用フック**:
```javascript
// テスト用に内部状態を公開（開発環境のみ）
if (typeof window.__TEST__ !== 'undefined') {
    window.__TEST__.pageNameState = {
        initialized,
        currentData,
        // ... other state
    };
}
```

**手動リセット関数**:
```javascript
// デバッグ用にリセット関数を公開
window.resetPageName = function() {
    initialized = false;
    currentData = null;
    console.log('🔄 [page-name] 状態をリセットしました');
};
```

---

## FAQ

### Q1: homeページだけ特別扱いなのはなぜ？

**A**: homeページは以下の理由で特別処理されています:

1. **初期表示ページ**: アプリ起動時に必ず表示される
2. **setupHomeEvents()専用関数**: Direction Tabs等の特殊な初期化ロジック
3. **依存関係なし**: 音声処理やグラフが不要

```javascript
// router.js setupPageEvents()
if (page === 'home') {
    this.setupHomeEvents();  // 専用関数で処理
    this.preventBrowserBack(page);
    return;
}
```

### Q2: pageConfigsのinitをnullにできるのはhomeだけ？

**A**: はい、homeページのみ特別にnullを許可しています。他のページは必ず初期化関数名を指定する必要があります。

### Q3: 依存関係の読み込み順序は重要？

**A**: いいえ、依存関係の配列内の順序は重要ではありません。`waitForDependencies()`はすべての依存関係が揃うまで待機します。

```javascript
// この2つは同じ動作
dependencies: ['Chart', 'DistributionChart']
dependencies: ['DistributionChart', 'Chart']
```

### Q4: preventDoubleInitをすべてのページで有効にすべき？

**A**: いいえ、必要なページのみに設定してください。

**有効にすべきケース**:
- Chart.js等のCanvas描画
- 重いイベントリスナー登録
- 重いデータ読み込み

**不要なケース**:
- 単純なDOM生成
- 毎回最新データが必要
- ステートレスなページ

### Q5: テンプレートHTML内でJavaScriptを書きたい場合は？

**A**: 絶対に避けてください。以下の理由があります:

1. **innerHTML挿入されたscriptは実行されない**
2. **保守性の低下**: コードが分散する
3. **テストの困難さ**: 動作確認が難しい

**正しいアプローチ**:
- コントローラーファイルで実装
- index.htmlで事前読み込み
- window.initXXXで公開

### Q6: 新しい依存関係を追加する際の注意点は？

**A**: 以下の手順を守ってください:

1. **index.htmlでライブラリ読み込み**
2. **グローバルオブジェクト名を確認**
3. **pageConfigsに追加**
4. **タイムアウト時間を考慮**（大きいライブラリは遅延する可能性）

### Q7: Routerの初期化タイミングを変更できる？

**A**: 可能ですが、推奨しません。現在のタイミング（DOMContentLoaded）は以下の理由で最適です:

- DOM構築完了後に実行
- スクリプト読み込み完了後
- ユーザー操作前

### Q8: 複数のコントローラーで共通処理を共有したい

**A**: ユーティリティモジュールを作成してください:

```javascript
// js/utils/page-utils.js
window.PageUtils = {
    showLoading(containerId) { /* ... */ },
    hideLoading(containerId) { /* ... */ },
    showError(message) { /* ... */ },
    initializeLucide() { /* ... */ }
};
```

```javascript
// 各コントローラーで使用
PageUtils.showLoading('main-container');
```

### Q9: デバッグログを本番環境で無効にしたい

**A**: 環境変数でログレベルを制御してください:

```javascript
// config.js
window.APP_CONFIG = {
    DEBUG: true  // 開発: true, 本番: false
};

// controller.js
function log(message) {
    if (window.APP_CONFIG.DEBUG) {
        console.log(message);
    }
}
```

### Q10: ページ遷移アニメーションを追加できる？

**A**: はい、router.jsのloadPage()で実装可能です:

```javascript
async loadPage(page) {
    const appRoot = document.getElementById('app-root');

    // フェードアウト
    appRoot.style.opacity = '0';
    await new Promise(resolve => setTimeout(resolve, 300));

    // HTML挿入
    const html = await fetch(`pages/${page}.html`).then(r => r.text());
    appRoot.innerHTML = html;

    // フェードイン
    appRoot.style.opacity = '1';
}
```

---

## 参考資料

### 関連ドキュメント

- **Phase 3 テスト結果**: `PHASE3_TEST_RESULTS.md` - テスト詳細と発見された問題
- **Phase 3 テスト計画**: `PHASE3_TEST_PLAN.md` - 29テスト項目の詳細手順
- **モジュールアーキテクチャ**: `MODULE_ARCHITECTURE.md` - 全体構造とモジュール関係
- **アプリケーション仕様**: `APP_SPECIFICATION.md` - アプリ全体の仕様

### コード参照

- **Router本体**: `/js/router.js` (Lines 1-700)
- **pageConfigs**: `/js/router.js` (Lines 32-68)
- **setupPageEvents**: `/js/router.js` (Lines 217-275)
- **waitForDependencies**: `/js/router.js` (Lines 277-312)
- **cleanupCurrentPage**: `/js/router.js` (Lines 634-640)

### コントローラー実装例

- **results-overview-controller.js**: 二重初期化防止の完全実装例
- **records-controller.js**: DistributionChart依存の実装例
- **settings-controller.js**: 依存関係なしの実装例
- **preparation-pitchpro-cycle.js**: PitchPro依存の実装例

### 外部リソース

- **Chart.js公式**: https://www.chartjs.org/
- **Lucide Icons**: https://lucide.dev/
- **Web Audio API**: https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API

---

**このガイドに関する質問・フィードバック**:
- GitHub Issues: https://github.com/kiyopi/Relative-pitch-app/issues
- 開発者: Claude Code

**最終更新**: 2025-01-17
**次回更新予定**: 新機能追加時または仕様変更時
