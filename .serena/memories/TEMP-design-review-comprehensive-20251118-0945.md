# 徹底的設計レビュー: リロード・ナビゲーション制御システム (2025-11-18)

## レビュー観点

### 1. リロード検出のタイミング問題 ⚠️ **重大な問題発見**

#### 現在の理解
- `trainingPageActive`フラグは**前回のセッション**から残っている（sessionStorage）
- リロード時、ページが再読み込みされてもsessionStorageは保持される

#### 提案設計のシーケンス
```
【リロード前】
trainingページ表示中
trainingPageActive = 'true' (sessionStorageに保存済み)

【リロードボタン押下】
beforeunloadダイアログ → リロード選択
ページ完全リロード

【リロード後】
1. router.js読み込み
2. hashchangeイベント発火
3. handleRouteChange() → loadPage('training')
4. ★ここでリロード検出したい★
5. detectReload()を呼ぶ
6. 前回のtrainingPageActiveフラグを検出 → return true
```

#### 問題: フラグの設定タイミング

**間違った実装案（初期の提案）**:
```javascript
async loadPage(page) {
    // ❌ 間違い: フラグを先に設定
    if (config?.preventReload) {
        sessionStorage.setItem('trainingPageActive', 'true');
    }
    
    // リロード検出
    if (config?.preventReload && NavigationManager.detectReload()) {
        // 前回のフラグが既に上書きされている！
    }
}
```

**正しい実装**:
```javascript
async loadPage(page) {
    const config = NavigationManager.PAGE_CONFIG[page];
    
    // 1. リロード検出（フラグ設定の前）
    if (config?.preventReload && NavigationManager.detectReload()) {
        // 前回のフラグを検出できる
        await NavigationManager.redirectToPreparation('リロード検出');
        return;
    }
    
    // 2. フラグ設定（初期化開始）
    if (config?.preventReload) {
        sessionStorage.setItem('trainingPageActive', 'true');
    }
    
    try {
        // 3. ページ初期化
        await this.setupPageEvents(page, fullHash, signal);
        
        // 4. 初期化成功 → フラグ削除
        if (config?.preventReload) {
            sessionStorage.removeItem('trainingPageActive');
        }
    } catch (error) {
        // エラー時もフラグ削除
        if (config?.preventReload) {
            sessionStorage.removeItem('trainingPageActive');
        }
        throw error;
    }
}
```

### 2. フラグ名の汎用化問題 ⚠️ **重大な問題発見**

#### 現在の実装
- `trainingPageActive`はハードコード
- detectReload()内でハードコード検出

#### 提案設計の問題
```javascript
// 複数ページでリロード検出する場合
sessionStorage.setItem('trainingPageActive', 'true');
sessionStorage.setItem('preparationPageActive', 'true');
```

しかし、detectReload()は現在：
```javascript
static detectReload() {
    const wasTrainingActive = sessionStorage.getItem('trainingPageActive'); // ← ハードコード
}
```

#### 解決策: detectReload()にページ名を渡す

**修正が必要**:
```javascript
// navigation-manager.js
static detectReload(page = null) {
    // normalTransitionチェック（最優先）
    const normalTransition = sessionStorage.getItem(this.KEYS.NORMAL_TRANSITION);
    if (normalTransition === 'true') {
        sessionStorage.removeItem(this.KEYS.NORMAL_TRANSITION);
        // ページ指定がある場合、そのフラグもクリア
        if (page) {
            sessionStorage.removeItem(page + 'PageActive');
        }
        return false;
    }
    
    // ページ指定がある場合、そのページのフラグをチェック
    if (page) {
        const wasPageActive = sessionStorage.getItem(page + 'PageActive');
        if (wasPageActive === 'true') {
            sessionStorage.removeItem(page + 'PageActive');
            return true;
        }
    }
    
    // 後方互換性: trainingPageActiveもチェック
    const wasTrainingActive = sessionStorage.getItem('trainingPageActive');
    if (wasTrainingActive === 'true') {
        sessionStorage.removeItem('trainingPageActive');
        return true;
    }
    
    // 他のチェック（visibilitychange、Navigation Timing API）
    // ...
}

// router.js
if (config?.preventReload && NavigationManager.detectReload(page)) {
    // リロード検出
}
```

### 3. redirectToPreparation()の汎用化問題 ⚠️ **設計不足**

#### 現在の実装
- `redirectToPreparation()`はpreparation専用

#### 提案設計
```javascript
'training': {
    preventReload: true,
    reloadRedirectTo: 'preparation', // ← preparationにリダイレクト
}
```

しかし、リダイレクト先が'preparation'以外の場合は？

#### 解決策: 汎用的なredirectTo()メソッド

**新規メソッド追加が必要**:
```javascript
// navigation-manager.js
static async redirectTo(targetPage, reason = '', mode = null, session = null) {
    console.log(`🔄 [NavigationManager] ${targetPage}へリダイレクト: ${reason}`);
    
    // PitchProリソース破棄
    if (this.currentAudioDetector) {
        this._destroyAudioDetector(this.currentAudioDetector);
        this.currentAudioDetector = null;
    }
    
    // beforeunload/popstate無効化
    this.disableNavigationWarning();
    this.removeBrowserBackPrevention();
    
    // リダイレクト実行
    const params = new URLSearchParams();
    if (mode) params.set('mode', mode);
    if (session) params.set('session', session);
    
    const hash = params.toString() ? `${targetPage}?${params.toString()}` : targetPage;
    window.location.hash = hash;
    
    await new Promise(resolve => setTimeout(resolve, 100));
}

// redirectToPreparation()は内部でredirectTo()を呼ぶ
static async redirectToPreparation(reason = '', mode = null, session = null) {
    // モード情報の取得ロジック（既存）
    if (!mode) {
        const hash = window.location.hash.substring(1);
        const params = new URLSearchParams(hash.split('?')[1] || '');
        mode = params.get('mode') || 'random';
    }
    
    // 汎用redirectTo()を使用
    await this.redirectTo('preparation', reason, mode, session);
}
```

### 4. setupPageEvents()との統合問題 ⚠️ **実装箇所の確認必要**

#### 現在のrouter.js構造
```javascript
async loadPage(page, fullHash, signal) {
    // 1. HTMLテンプレート読み込み
    const html = await fetch(templatePath);
    this.appRoot.innerHTML = html;
    
    // 2. スクリプトタグ実行
    // ...
    
    // 3. Lucideアイコン初期化
    // ...
    
    // 4. setupPageEvents()呼び出し
    await this.setupPageEvents(page, fullHash, signal);
}

async setupPageEvents(page, fullHash, signal) {
    // 1. ページ設定取得
    const config = this.pageConfigs[page];
    
    // 2. 依存関係待機
    // ...
    
    // 3. 初期化関数実行
    await initFunction(fullHash); // ← trainingController.js等
    
    // 4. ブラウザバック防止設定
    this.preventBrowserBack(page);
}
```

#### リロード検出をどこに挿入するか

**候補A: loadPage()の最初**
```javascript
async loadPage(page, fullHash, signal) {
    // ★ここでリロード検出★
    const config = NavigationManager.PAGE_CONFIG[page];
    if (config?.preventReload && NavigationManager.detectReload(page)) {
        await NavigationManager.redirectToPreparation('リロード検出');
        return; // 以降の処理をスキップ
    }
    
    // HTMLテンプレート読み込み
    // ...
}
```

**メリット**: HTMLロード前にリダイレクト確定（効率的）
**デメリット**: HTMLロード前なので、エラー表示ができない

**候補B: setupPageEvents()の最初**
```javascript
async setupPageEvents(page, fullHash, signal) {
    // ★ここでリロード検出★
    const config = NavigationManager.PAGE_CONFIG[page];
    if (config?.preventReload && NavigationManager.detectReload(page)) {
        await NavigationManager.redirectToPreparation('リロード検出');
        return;
    }
    
    // ページ設定取得
    // ...
}
```

**メリット**: HTMLロード後なので、エラー表示可能
**デメリット**: 無駄にHTMLをロードしてしまう

**推奨**: 候補A（効率優先）

### 5. エラーハンドリング問題 ⚠️ **現在のエラー処理を確認**

#### 現在のrouter.js
```javascript
async handleRouteChange() {
    try {
        await this.loadPage(page, hash, signal);
    } catch (error) {
        if (error.name === 'AbortError') {
            // 中断
        } else {
            console.error(`Navigation failed:`, error);
            // ホームページにフォールバック
            await this.loadPage('home', '', signal);
        }
    }
}
```

#### 提案設計でのエラー
```javascript
async loadPage(page, fullHash, signal) {
    if (config?.preventReload && NavigationManager.detectReload(page)) {
        await redirectToPreparation();
        return; // ← エラーではない、正常なreturn
    }
}
```

**問題なし**: エラーをthrowしないので、try-catchに引っかからない

#### trainingController.jsの現在のエラー処理削除

**削除するコード**:
```javascript
// trainingController.js Line 360-371
if (NavigationManager.detectReload()) {
    console.warn('⚠️ リロード検出 - preparationへリダイレクト');
    NavigationManager.showReloadDialog();
    await NavigationManager.redirectToPreparation('リロード検出');
    throw NavigationManager.createRedirectError(); // ← これを削除
}
```

**router.jsのエラー処理も削除**:
```javascript
// router.js Line 391-392
// 「REDIRECT_TO_PREPARATION」エラーの特別処理は不要になる
```

### 6. beforeunload設定のタイミング問題 ✅ **問題なし**

#### 現在の実装
```javascript
// trainingController.js Line 399
setTimeout(() => {
    NavigationManager.enableNavigationWarning();
}, 500);
```

#### 提案設計でリロード検出→リダイレクトする場合
```javascript
async loadPage(page) {
    if (detectReload(page)) {
        await redirectToPreparation();
        return; // ← trainingController.jsは実行されない
    }
    
    await setupPageEvents(page); // ← ここでtrainingController.js実行
}
```

**動作**:
- リロード検出時: trainingController.jsが実行されない → beforeunloadも設定されない（正常）
- 通常遷移時: trainingController.jsが実行される → beforeunloadが設定される（正常）

**問題なし**

### 7. normalTransitionフラグとの整合性 ✅ **問題なし**

#### 通常のSPA遷移
```
preparation → training遷移
1. NavigationManager.navigateToTraining()呼び出し
2. setNormalTransition()でフラグ設定
3. safeNavigate()でhash変更
4. hashchangeイベント → loadPage('training')
5. detectReload(page)呼び出し
6. normalTransitionフラグチェック（最優先）→ return false
7. ページ初期化
```

**問題なし**: normalTransitionフラグが最優先でチェックされる

### 8. 無限ループの可能性 ✅ **問題なし**

#### シナリオ
```
loadPage('training')
→ detectReload() → true
→ redirectToPreparation()
→ window.location.hash = 'preparation'
→ hashchangeイベント → loadPage('preparation')
→ preparation.preventReload = false なのでスキップ
→ 初期化実行
```

**問題なし**: preparationはpreventReload: falseなので無限ループにならない

### 9. フラグ削除のタイミング問題 ⚠️ **詳細検討必要**

#### detectReload()内でのフラグ削除

現在の実装:
```javascript
static detectReload(page) {
    // normalTransitionの場合
    if (normalTransition === 'true') {
        sessionStorage.removeItem('normalTransition');
        sessionStorage.removeItem('trainingPageActive'); // ← ここで削除
        return false;
    }
    
    // リロードの場合
    const wasPageActive = sessionStorage.getItem(page + 'PageActive');
    if (wasPageActive === 'true') {
        sessionStorage.removeItem(page + 'PageActive'); // ← ここで削除
        return true;
    }
}
```

つまり、detectReload()を呼んだ時点でフラグは削除される。

#### loadPage()での追加削除は不要

**修正後の実装**:
```javascript
async loadPage(page, fullHash, signal) {
    const config = NavigationManager.PAGE_CONFIG[page];
    
    // リロード検出（detectReload内でフラグ削除される）
    if (config?.preventReload && NavigationManager.detectReload(page)) {
        if (config.reloadMessage) {
            alert(config.reloadMessage);
        }
        const redirectTo = config.reloadRedirectTo || 'preparation';
        await NavigationManager.redirectTo(redirectTo, 'リロード検出');
        return;
    }
    
    // フラグ設定（初期化開始）
    if (config?.preventReload) {
        sessionStorage.setItem(page + 'PageActive', 'true');
    }
    
    try {
        // HTMLロード・初期化
        // ...（既存のコード）
        
        await this.setupPageEvents(page, fullHash, signal);
        
        // 初期化成功 → フラグ削除
        if (config?.preventReload) {
            sessionStorage.removeItem(page + 'PageActive');
        }
    } catch (error) {
        // エラー時もフラグ削除
        if (config?.preventReload) {
            sessionStorage.removeItem(page + 'PageActive');
        }
        throw error;
    }
    
    this.currentPage = page;
}
```

### 10. PAGE_CONFIG設定の完全性チェック ✅ **設計完了**

#### 推奨設定
```javascript
static PAGE_CONFIG = {
    'preparation': {
        preventBackNavigation: true,
        preventReload: false, // リロード可能
        backPreventionMessage: 'トレーニング準備中です。\n\nブラウザバックは無効になっています。\nホームボタンからトップページに戻れます。'
    },
    'training': {
        preventBackNavigation: true,
        preventReload: true, // リロード不可
        reloadRedirectTo: 'preparation', // リダイレクト先
        reloadMessage: 'リロードが検出されました。マイク設定のため準備ページに移動します。',
        backPreventionMessage: 'トレーニング中です。\n\nブラウザバックは無効になっています。\nホームボタンからトップページに戻れます。'
    },
    'result-session': {
        preventBackNavigation: true,
        preventReload: false, // リロード可能（データは保存済み）
        backPreventionMessage: 'セッション評価中です。\n\nブラウザバックは無効になっています。\n「次の基音へ」ボタンまたはホームボタンをご利用ください。'
    },
    'results': {
        preventBackNavigation: true,
        preventReload: false,
        backPreventionMessage: '総合評価画面です。\n\nブラウザバックは無効になっています。\nホームボタンまたは「新しいトレーニングを始める」ボタンをご利用ください。'
    },
    'results-overview': {
        preventBackNavigation: true,
        preventReload: false,
        backPreventionMessage: '総合評価画面です。\n\nブラウザバックは無効になっています。\nホームボタンまたは「新しいトレーニングを始める」ボタンをご利用ください。'
    }
};
```

### 11. router.jsとnavigation-manager.jsの責任分担 ✅ **明確化完了**

#### router.js
- ページ遷移全体の管理
- リロード検出（loadPage内）
- ページ初期化（setupPageEvents）
- エラーハンドリング

#### navigation-manager.js
- リロード検出ロジック（detectReload）
- リダイレクト処理（redirectTo, redirectToPreparation）
- beforeunload管理（enableNavigationWarning, disableNavigationWarning）
- popstate管理（preventBrowserBack, removeBrowserBackPrevention）
- フラグ管理（setNormalTransition）

#### controller.js（trainingController.js等）
- ページ固有の初期化処理のみ
- リロード検出は行わない（router.jsに移管）

## 最終的な実装方針

### 変更箇所サマリー

#### 1. navigation-manager.js
- `detectReload(page = null)`: ページ名を引数で受け取る
- `redirectTo(targetPage, reason, mode, session)`: 汎用リダイレクトメソッド追加
- `redirectToPreparation()`: 内部でredirectTo()を呼ぶように変更
- `createRedirectError()`: 削除（不要）
- `PAGE_CONFIG`: preventReloadプロパティ追加

#### 2. router.js
- `loadPage()`: リロード検出処理を追加（HTMLロード前）
- エラーハンドリング: REDIRECT_TO_PREPARATIONの特別処理を削除

#### 3. trainingController.js
- Line 360-371: リロード検出処理を削除
- Line 207: trainingPageActiveフラグ設定を削除（router.jsに移管）
- Line 388: trainingPageActiveフラグ削除を削除（router.jsに移管）

### 実装優先順位

1. **navigation-manager.js修正** - 基盤ロジック
2. **router.js修正** - リロード検出統合
3. **trainingController.js修正** - 不要コード削除
4. **動作確認** - 全シナリオテスト

## 懸念事項と確認ポイント

### ⚠️ 残存する懸念

1. **detectReload()の引数追加の影響範囲**
   - 既存の呼び出し箇所を全て確認必要
   - 後方互換性の維持（引数なしでも動作）

2. **PAGE_CONFIGとpageConfigsの統合**
   - NavigationManager.PAGE_CONFIGとrouter.pageConfigsが別々
   - 統合すべきか？それとも役割分担維持？

3. **redirectTo()の実装詳細**
   - モード情報の引き継ぎロジック
   - preparation以外へのリダイレクト対応

4. **エッジケース**
   - 初期化中にエラー → フラグ削除確認
   - 複数タブでの動作（sessionStorageはタブ独立）
   - ブラウザバック中のリロード

## 結論

**設計は基本的に正しい**が、以下の詳細実装が必要：

1. ✅ リロード検出のタイミング: loadPage()の最初（HTMLロード前）
2. ⚠️ フラグ名の汎用化: detectReload(page)に引数追加
3. ⚠️ リダイレクトの汎用化: redirectTo()メソッド追加
4. ✅ エラーハンドリング: エラーthrow不要、単純なreturn
5. ✅ beforeunload設定: 提案設計で問題なし
6. ✅ normalTransitionフラグ: 整合性あり
7. ✅ 無限ループ: 発生しない
8. ⚠️ フラグ削除: detectReload()内で削除、try-catchでも削除
9. ✅ PAGE_CONFIG設定: 完全性あり
10. ✅ 責任分担: 明確化完了

**総合評価**: 設計は健全だが、実装詳細の詰めが必要
