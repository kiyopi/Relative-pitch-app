# Router Phase 2 統一初期化システム - 完全仕様書 v2.0

**作成日**: 2025-11-17 17:15  
**バージョン**: 2.0.0  
**目的**: 安全で強固な統一初期化システムの完全仕様定義  
**前提**: 問題分析レポート（PERM-router-phase2-design-problems-analysis-20251117-1700）の改善策を統合

---

## 📚 目次

1. [設計原則](#設計原則)
2. [アーキテクチャ概要](#アーキテクチャ概要)
3. [主要コンポーネント仕様](#主要コンポーネント仕様)
4. [ページ設定レジストリ](#ページ設定レジストリ)
5. [遷移制御メカニズム](#遷移制御メカニズム)
6. [依存関係管理システム](#依存関係管理システム)
7. [エラーハンドリング戦略](#エラーハンドリング戦略)
8. [クリーンアップ管理](#クリーンアップ管理)
9. [実装ガイドライン](#実装ガイドライン)
10. [テスト要件](#テスト要件)

---

## 🎯 設計原則

### **核心原則**

1. **単一責任の原則**: 各メソッドは1つの明確な責任のみを持つ
2. **競合状態の完全防止**: 複数遷移の同時実行を許可しない
3. **中断可能性**: 全ての非同期処理は中断可能
4. **エラー回復性**: すべてのエラーケースで適切な回復手段を提供
5. **状態の一貫性**: いかなる状況でも状態の矛盾を許さない
6. **設定ベース管理**: switch-case文ではなく、設定オブジェクトで管理
7. **グローバル状態の最小化**: グローバル変数は明示的に管理・クリーンアップ

### **非機能要件**

- **パフォーマンス**: 依存関係待機は並列実行で最大5秒以内
- **ユーザビリティ**: エラー時は明確なメッセージと回復手段を提供
- **保守性**: 新規ページ追加は3ステップで完了
- **デバッグ性**: 統一されたログフォーマットで問題特定が容易

---

## 🏗️ アーキテクチャ概要

### **システム構成図**

```
┌─────────────────────────────────────────────────────────────┐
│                    SimpleRouter                              │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌───────────────────────────────────────────────────┐      │
│  │         遷移制御層（Navigation Control）          │      │
│  ├───────────────────────────────────────────────────┤      │
│  │  - isNavigating: boolean                          │      │
│  │  - currentNavigationId: number                    │      │
│  │  - navigationAbortController: AbortController     │      │
│  └───────────────────────────────────────────────────┘      │
│                           ↓                                   │
│  ┌───────────────────────────────────────────────────┐      │
│  │         ページ管理層（Page Management）           │      │
│  ├───────────────────────────────────────────────────┤      │
│  │  - pageConfigs: Object<PageConfig>                │      │
│  │  - initializedPages: Set<string>                  │      │
│  │  - currentPage: string                            │      │
│  └───────────────────────────────────────────────────┘      │
│                           ↓                                   │
│  ┌───────────────────────────────────────────────────┐      │
│  │      依存関係管理層（Dependency Management）      │      │
│  ├───────────────────────────────────────────────────┤      │
│  │  - waitForDependencies()                          │      │
│  │  - waitForDependency()                            │      │
│  │  - waitForGlobalFunction()                        │      │
│  │  - getDependencyCheckFunction()                   │      │
│  └───────────────────────────────────────────────────┘      │
│                           ↓                                   │
│  ┌───────────────────────────────────────────────────┐      │
│  │       初期化実行層（Initialization Execution）    │      │
│  ├───────────────────────────────────────────────────┤      │
│  │  - setupPageEvents()                              │      │
│  │  - cleanupCurrentPage()                           │      │
│  └───────────────────────────────────────────────────┘      │
│                           ↓                                   │
│  ┌───────────────────────────────────────────────────┐      │
│  │     エラーハンドリング層（Error Handling）        │      │
│  ├───────────────────────────────────────────────────┤      │
│  │  - showInitializationError()                      │      │
│  │  - handleNavigationError()                        │      │
│  └───────────────────────────────────────────────────┘      │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### **データフロー**

```
ユーザーアクション（URLハッシュ変更）
    ↓
handleRouteChange()
    ↓
【遷移制御】既存遷移の中断 → 新規遷移開始
    ↓
cleanupCurrentPage()
    ↓
【設定ベースクリーンアップ】ページ固有リソース解放
    ↓
loadPage()
    ↓
【HTML読み込み】テンプレート取得 → DOM挿入
    ↓
setupPageEvents()
    ↓
【依存関係待機】ライブラリ → 初期化関数
    ↓
【初期化実行】グローバル関数呼び出し
    ↓
【状態更新】currentPage, initializedPages
    ↓
完了
```

---

## 📋 主要コンポーネント仕様

### **1. SimpleRouterクラス**

#### **プロパティ**

```typescript
class SimpleRouter {
    // ルート定義
    routes: Record<string, string>;
    
    // ページ設定レジストリ
    pageConfigs: Record<string, PageConfig>;
    
    // 遷移制御フラグ
    isNavigating: boolean;
    currentNavigationId: number;
    navigationAbortController: AbortController | null;
    
    // ページ管理
    currentPage: string | null;
    initializedPages: Set<string>;
    
    // DOM参照
    appRoot: HTMLElement;
}
```

#### **PageConfig型定義**

```typescript
interface PageConfig {
    // 初期化関数名（window[init]で呼び出される）
    init: string | null;
    
    // 依存ライブラリ（'Chart', 'DistributionChart', 'PitchPro'等）
    dependencies: string[];
    
    // 二重初期化防止フラグ（デフォルト: false）
    preventDoubleInit?: boolean;
    
    // クリーンアップ関数（ページ離脱時に呼ばれる）
    cleanup?: () => Promise<void>;
}
```

---

## 🔧 ページ設定レジストリ

### **完全な設定例**

```javascript
this.pageConfigs = {
    'home': {
        init: null,  // setupHomeEvents()で特別処理
        dependencies: []
    },
    
    'preparation': {
        init: 'initializePreparationPitchProCycle',
        dependencies: ['PitchPro'],
        cleanup: async () => {
            // PitchProリソースのクリーンアップ
            if (window.preparationManager) {
                await window.preparationManager.cleanupPitchPro();
            }
            
            // 初期化フラグをリセット
            if (window.resetPreparationPageFlag) {
                window.resetPreparationPageFlag();
            }
        }
    },
    
    'training': {
        init: 'initializeTrainingPage',
        dependencies: ['PitchPro'],
        cleanup: async () => {
            // 音声検出停止
            if (window.audioDetector) {
                window.audioDetector.stopDetection();
            }
            
            // マイクストリーム解放
            if (window.audioStream) {
                window.audioStream.getTracks().forEach(track => track.stop());
                window.audioStream = null;
            }
            
            // PitchShifter停止
            if (window.pitchShifterInstance?.dispose) {
                window.pitchShifterInstance.dispose();
                window.pitchShifterInstance = null;
            }
        }
    },
    
    'result-session': {
        init: 'initializeResultSessionPage',
        dependencies: []
    },
    
    'results-overview': {
        init: 'initResultsOverview',
        dependencies: ['Chart', 'DistributionChart'],
        preventDoubleInit: true  // 再初期化を防ぐ
    },
    
    'records': {
        init: 'initRecords',
        dependencies: ['Chart', 'DistributionChart']
    },
    
    'premium-analysis': {
        init: 'initPremiumAnalysis',
        dependencies: ['Chart']
    },
    
    'settings': {
        init: 'initSettings',
        dependencies: []
    }
};
```

### **設定ガイドライン**

#### **init関数の命名規則**

- **形式**: `initialize<PageName>` または `init<PageName>`
- **公開**: `window[init]` でグローバルに公開必須
- **例**: `window.initializePreparationPitchProCycle = async function() { ... }`

#### **dependencies指定**

- **利用可能な値**: `'Chart'`, `'DistributionChart'`, `'PitchPro'`
- **追加方法**: `getDependencyCheckFunction()`にチェック関数を追加

#### **preventDoubleInit使用基準**

- ✅ **使用すべき**: グラフ描画等、再初期化で問題が起きる場合
- ❌ **使用不要**: 再初期化しても問題ない場合

#### **cleanup関数実装基準**

- ✅ **必須**: グローバル変数を使用する場合
- ✅ **推奨**: Web Audio API等のリソースを使用する場合
- ⚠️ **注意**: async関数で実装し、Promiseを返す

---

## 🚦 遷移制御メカニズム

### **競合状態の完全防止**

```javascript
async handleRouteChange() {
    const hash = window.location.hash.substring(1) || 'home';
    const page = hash.split('?')[0];
    
    console.log(`📍 [Router] Route change requested: ${hash}`);
    
    // 【重要】既に遷移中の場合は前の遷移を中断
    if (this.isNavigating) {
        console.warn(`⚠️ [Router] Navigation in progress, aborting previous navigation`);
        if (this.navigationAbortController) {
            this.navigationAbortController.abort();
        }
    }
    
    // 新しい遷移を開始
    this.isNavigating = true;
    this.currentNavigationId++;
    const navigationId = this.currentNavigationId;
    this.navigationAbortController = new AbortController();
    const signal = this.navigationAbortController.signal;
    
    console.log(`🚀 [Router] Starting navigation ${navigationId} to: ${page}`);
    
    try {
        // クリーンアップ
        await this.cleanupCurrentPage();
        
        // 中断されていないか確認
        if (navigationId !== this.currentNavigationId) {
            console.log(`ℹ️ [Router] Navigation ${navigationId} was superseded`);
            return;
        }
        
        // ページロード
        await this.loadPage(page, hash, signal);
        
        console.log(`✅ [Router] Navigation ${navigationId} completed successfully`);
        
    } catch (error) {
        if (error.name === 'AbortError' || error.message === 'Aborted') {
            console.log(`ℹ️ [Router] Navigation ${navigationId} was aborted`);
        } else {
            console.error(`❌ [Router] Navigation ${navigationId} failed:`, error);
            
            // エラー時はホームページにフォールバック
            try {
                await this.loadPage('home', '', signal);
            } catch (fallbackError) {
                console.error(`❌ [Router] Fallback to home failed:`, fallbackError);
            }
        }
    } finally {
        // 遷移完了フラグをリセット
        this.isNavigating = false;
    }
}
```

### **中断メカニズムの仕組み**

#### **AbortControllerの使用**

```javascript
// handleRouteChange内で生成
this.navigationAbortController = new AbortController();
const signal = this.navigationAbortController.signal;

// 全ての非同期処理に渡す
await this.loadPage(page, hash, signal);
await this.setupPageEvents(page, fullHash, signal);
await this.waitForDependencies(dependencies, signal);
```

#### **中断チェックパターン**

```javascript
async waitWithAbort(checkFn, options = {}) {
    const { maxAttempts = 50, interval = 100, signal = null } = options;
    
    let attempts = 0;
    
    while (attempts < maxAttempts) {
        // 【重要】中断シグナルをチェック
        if (signal?.aborted) {
            throw new Error('Aborted');
        }
        
        if (checkFn()) {
            return true;
        }
        
        await new Promise(resolve => setTimeout(resolve, interval));
        attempts++;
    }
    
    return false;
}
```

---

## 🔗 依存関係管理システム

### **統一的な待機インターフェース**

```javascript
/**
 * 汎用待機ヘルパー（中断対応）
 * 
 * @param {Function} checkFn - チェック関数（trueを返すまで待機）
 * @param {Object} options - オプション
 * @param {number} options.maxAttempts - 最大試行回数（デフォルト: 50）
 * @param {number} options.interval - チェック間隔（ms、デフォルト: 100）
 * @param {AbortSignal} options.signal - 中断シグナル
 * @param {string} options.errorMessage - タイムアウト時のエラーメッセージ
 * @returns {Promise<boolean>} 成功でtrue、タイムアウトでfalse
 */
async waitWithAbort(checkFn, options = {}) {
    const {
        maxAttempts = 50,
        interval = 100,
        signal = null,
        errorMessage = 'Timeout'
    } = options;
    
    let attempts = 0;
    
    while (attempts < maxAttempts) {
        // 中断シグナルをチェック
        if (signal?.aborted) {
            throw new Error('Aborted');
        }
        
        if (checkFn()) {
            return true;
        }
        
        await new Promise(resolve => setTimeout(resolve, interval));
        attempts++;
    }
    
    // タイムアウト
    console.warn(`⚠️ [Router] ${errorMessage}`);
    return false;
}
```

### **グローバル関数の待機**

```javascript
/**
 * グローバル初期化関数の読み込みを待機
 * 
 * @param {string} functionName - 関数名
 * @param {AbortSignal} signal - 中断シグナル
 * @returns {Promise<boolean>} 成功でtrue、失敗でfalse
 * @throws {Error} 中断時に'Aborted'エラーをthrow
 */
async waitForGlobalFunction(functionName, signal) {
    console.log(`⏳ [Router] Waiting for global function: ${functionName}`);
    
    try {
        const success = await this.waitWithAbort(
            () => typeof window[functionName] === 'function',
            {
                maxAttempts: 50,
                interval: 100,
                signal,
                errorMessage: `Global function "${functionName}" not loaded after 5000ms`
            }
        );
        
        if (success) {
            console.log(`✅ [Router] Global function ${functionName} loaded`);
        } else {
            console.error(`❌ [Router] Timeout waiting for ${functionName}`);
        }
        
        return success;
        
    } catch (error) {
        if (error.message === 'Aborted') {
            throw error; // 上位で処理
        }
        console.error(`❌ [Router] Error waiting for ${functionName}:`, error);
        return false;
    }
}
```

### **依存ライブラリの待機**

```javascript
/**
 * 単一の依存ライブラリを待機
 * 
 * @param {string} dependency - 依存ライブラリ名
 * @param {AbortSignal} signal - 中断シグナル
 * @returns {Promise<boolean>} 成功でtrue、失敗でfalse
 * @throws {Error} 中断時に'Aborted'エラーをthrow
 */
async waitForDependency(dependency, signal) {
    console.log(`⏳ [Router] Waiting for dependency: ${dependency}`);
    
    const checkFunction = this.getDependencyCheckFunction(dependency);
    
    try {
        const success = await this.waitWithAbort(
            checkFunction,
            {
                maxAttempts: 50,
                interval: 100,
                signal,
                errorMessage: `Dependency "${dependency}" not loaded after 5000ms`
            }
        );
        
        if (success) {
            console.log(`✅ [Router] Dependency ${dependency} loaded`);
        } else {
            console.error(`❌ [Router] Timeout waiting for ${dependency}`);
        }
        
        return success;
        
    } catch (error) {
        if (error.message === 'Aborted') {
            throw error;
        }
        console.error(`❌ [Router] Error waiting for ${dependency}:`, error);
        return false;
    }
}

/**
 * 複数の依存ライブラリを並列待機（早期失敗検出）
 * 
 * @param {string[]} dependencies - 依存ライブラリ名の配列
 * @param {AbortSignal} signal - 中断シグナル
 * @throws {Error} いずれかの依存関係が失敗した場合
 */
async waitForDependencies(dependencies, signal) {
    if (!dependencies || dependencies.length === 0) {
        return;
    }
    
    console.log(`⏳ [Router] Waiting for dependencies: ${dependencies.join(', ')}`);
    
    // Promise.allSettledで並列待機（早期失敗検出）
    const results = await Promise.allSettled(
        dependencies.map(dep => this.waitForDependency(dep, signal))
    );
    
    // 失敗した依存関係を抽出
    const failedDeps = results
        .map((r, i) => ({ result: r, dep: dependencies[i] }))
        .filter(({ result }) => result.status === 'rejected' || result.value === false)
        .map(({ dep }) => dep);
    
    if (failedDeps.length > 0) {
        throw new Error(`Failed to load dependencies: ${failedDeps.join(', ')}`);
    }
    
    console.log(`✅ [Router] All dependencies loaded`);
}

/**
 * 依存関係のチェック関数を取得
 * 
 * @param {string} dependency - 依存ライブラリ名
 * @returns {Function} チェック関数（trueを返すと待機終了）
 */
getDependencyCheckFunction(dependency) {
    const checks = {
        'Chart': () => typeof window.Chart !== 'undefined',
        'DistributionChart': () => typeof window.DistributionChart !== 'undefined',
        'PitchPro': () => typeof window.PitchPro !== 'undefined'
    };
    
    const checkFn = checks[dependency];
    
    if (!checkFn) {
        console.warn(`⚠️ [Router] Unknown dependency: ${dependency}, skipping check`);
        return () => true; // 未知の依存関係は常にtrueを返す
    }
    
    return checkFn;
}
```

---

## ⚠️ エラーハンドリング戦略

### **エラー分類と対応**

| エラー種類 | 検出箇所 | 対応方法 | ユーザー影響 |
|---|---|---|---|
| 依存関係タイムアウト | waitForDependency | エラー表示 + ホーム遷移 | リカバリー可能 |
| 初期化関数未検出 | waitForGlobalFunction | エラー表示 + ホーム遷移 | リカバリー可能 |
| 初期化関数エラー | setupPageEvents | エラー表示 + 状態保持 | リカバリー可能 |
| ページ遷移中断 | handleRouteChange | ログ出力のみ | 影響なし |
| HTML読み込み失敗 | loadPage | ホームにフォールバック | リカバリー可能 |

### **統一エラー表示**

```javascript
/**
 * 初期化エラーを表示
 * 
 * @param {string} page - ページ識別子
 * @param {Error} error - エラーオブジェクト
 */
showInitializationError(page, error) {
    console.error(`❌ [Router] Failed to initialize page: ${page}`);
    console.error(`❌ [Router] Error:`, error);
    
    const appRoot = document.getElementById('app-root');
    if (!appRoot) {
        console.error(`❌ [Router] Cannot show error: app-root not found`);
        return;
    }
    
    // エラーメッセージを生成
    const errorMessage = error.message || '不明なエラーが発生しました';
    
    const errorHTML = `
        <div style="padding: 2rem; text-align: center; color: var(--color-error, #ef4444);">
            <div style="font-size: 3rem; margin-bottom: 1rem;">⚠️</div>
            <h3 style="font-size: 1.5rem; margin-bottom: 1rem;">ページの読み込みに失敗しました</h3>
            <p style="margin: 1rem 0; color: var(--text-secondary, #9ca3af); max-width: 500px; margin-left: auto; margin-right: auto;">
                ${errorMessage}
            </p>
            <div style="display: flex; gap: 1rem; justify-content: center; margin-top: 2rem;">
                <button onclick="location.reload()" 
                    style="padding: 0.75rem 1.5rem; 
                           background: var(--color-primary, #8b5cf6); 
                           color: white; 
                           border: none; 
                           border-radius: 8px; 
                           cursor: pointer; 
                           font-size: 1rem;
                           transition: opacity 0.2s;"
                    onmouseover="this.style.opacity='0.9'"
                    onmouseout="this.style.opacity='1'">
                    ページを再読み込み
                </button>
                <button onclick="location.hash='home'" 
                    style="padding: 0.75rem 1.5rem; 
                           background: transparent; 
                           color: var(--text-primary, white); 
                           border: 2px solid var(--border-color, rgba(255,255,255,0.2)); 
                           border-radius: 8px; 
                           cursor: pointer; 
                           font-size: 1rem;
                           transition: all 0.2s;"
                    onmouseover="this.style.borderColor='var(--color-primary, #8b5cf6)'"
                    onmouseout="this.style.borderColor='var(--border-color, rgba(255,255,255,0.2))'">
                    ホームに戻る
                </button>
            </div>
        </div>
    `;
    
    // 既存コンテンツを置き換え（追加ではなく）
    appRoot.innerHTML = errorHTML;
}
```

---

## 🧹 クリーンアップ管理

### **設定ベースクリーンアップ**

```javascript
/**
 * 現在のページのクリーンアップ
 */
async cleanupCurrentPage() {
    if (!this.currentPage) {
        console.log(`ℹ️ [Router] No current page to cleanup`);
        return;
    }
    
    console.log(`🧹 [Router] Cleaning up page: ${this.currentPage}`);
    
    try {
        // ブラウザバック防止を解除
        this.removeBrowserBackPrevention();
        
        const config = this.pageConfigs[this.currentPage];
        
        // 設定ベースのクリーンアップ関数を実行
        if (config?.cleanup) {
            console.log(`🧹 [Router] Running cleanup for: ${this.currentPage}`);
            await config.cleanup();
        }
        
        // preventDoubleInitフラグをリセット
        if (config?.preventDoubleInit) {
            this.initializedPages.delete(this.currentPage);
            console.log(`🔄 [Router] Reset initialization flag for: ${this.currentPage}`);
        }
        
        console.log(`✅ [Router] Cleanup complete for: ${this.currentPage}`);
        
    } catch (error) {
        console.warn(`⚠️ [Router] Cleanup error for ${this.currentPage}:`, error);
        // クリーンアップエラーは遷移を妨げない
    }
}
```

---

## 🔧 実装ガイドライン

### **新規ページ追加（3ステップ）**

#### **ステップ1: router.jsのpageConfigsに設定追加**

```javascript
this.pageConfigs = {
    // ... 既存の設定 ...
    
    'new-page': {
        init: 'initNewPage',
        dependencies: ['Chart'],  // 必要に応じて
        preventDoubleInit: false, // 必要に応じて
        cleanup: async () => {    // 必要に応じて
            // グローバル変数のクリーンアップ
            if (window.newPageInstance) {
                window.newPageInstance.destroy();
                window.newPageInstance = null;
            }
        }
    }
};
```

#### **ステップ2: コントローラーでグローバル関数公開**

```javascript
// new-page-controller.js
(function() {
    'use strict';
    
    async function initializeNewPage(fullHash) {
        console.log('🔧 新規ページ初期化開始');
        
        try {
            // ページ固有の初期化処理
            setupEventListeners();
            loadData();
            
            // Lucideアイコン初期化
            if (typeof window.initializeLucideIcons === 'function') {
                window.initializeLucideIcons({ immediate: true });
            }
            
            console.log('✅ 新規ページ初期化完了');
            
        } catch (error) {
            console.error('❌ 新規ページ初期化エラー:', error);
            throw error; // Router側でキャッチされる
        }
    }
    
    // 【重要】グローバル関数として公開（設定のinitと一致させる）
    window.initNewPage = initializeNewPage;
    
})();
```

#### **ステップ3: HTMLテンプレート作成**

```html
<!-- pages/new-page.html -->
<header class="page-header">
    <!-- ヘッダー内容 -->
</header>

<main class="narrow-main">
    <!-- メインコンテンツ -->
</main>

<!-- コントローラースクリプト（onload属性は不要） -->
<script src="pages/js/new-page-controller.js"></script>
```

以上で完了！router.jsのswitch-caseへの追加は不要です。

---

## ✅ テスト要件

### **機能テスト**

| テストケース | 検証内容 | 期待結果 |
|---|---|---|
| 通常遷移 | #home → #preparation | 正常に初期化 |
| 連続遷移 | #preparation → #training（即座） | 前の遷移が中断される |
| 依存関係待機 | Chart.js未ロード時に#records遷移 | 最大5秒待機後に初期化 |
| 初期化関数未検出 | init関数が存在しないページ遷移 | エラー表示 + ホーム遷移可能 |
| preventDoubleInit | results-overviewに2回遷移 | 1回目のみ初期化 |
| クリーンアップ | preparation → training | preparationリソース解放 |
| エラー回復 | 初期化エラー → ホームに戻る | 正常に回復 |

### **パフォーマンステスト**

| 指標 | 目標値 | 測定方法 |
|---|---|---|
| 依存関係待機時間 | 最大5秒 | console.logのタイムスタンプ |
| ページ遷移時間 | 1秒以内（依存関係除く） | Performance API |
| メモリリーク | なし | DevToolsメモリプロファイラ |

---

## 📊 実装工数見積もり

| フェーズ | 内容 | 推定工数 |
|---|---|---|
| Phase 1 | 遷移制御メカニズム実装 | 2時間 |
| Phase 2 | 依存関係管理システム実装 | 2時間 |
| Phase 3 | setupPageEvents完全実装 | 2時間 |
| Phase 4 | クリーンアップ管理実装 | 1.5時間 |
| Phase 5 | エラーハンドリング実装 | 1.5時間 |
| Phase 6 | テスト・検証 | 2時間 |
| Phase 7 | ドキュメント化 | 1時間 |
| **合計** | | **12時間** |

---

## 🎯 次のアクション

1. ✅ この仕様書をSerenaメモリに保存
2. ⏭️ ユーザーに仕様書を提示し、承認を得る
3. ⏭️ 承認後、Phase 1から順次実装開始
4. ⏭️ 各フェーズ完了時にコミット
5. ⏭️ 全フェーズ完了後、包括的テスト実施

---

**この仕様書は、安全で強固な統一初期化システムの完全な設計を定義しています。**
