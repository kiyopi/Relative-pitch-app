# ナビゲーション制御システム分析 (2025-11-18)

## 現在の問題の全体像

### ユーザーが報告した問題
1. トレーニングページでリロードボタン押下
2. **システムダイアログ（beforeunload）**が出現 → 「ページを移動」を選択
3. **アプリ側のダイアログ（alert）**が出現 → 「リロード検出、preparationへリダイレクト」
4. preparationページに飛ばずに**ランダム基音モードのトレーニングページ**になる（メチャクチャな動作）

### ログから判明した実際の動作フロー

#### Phase 1: リロード実行（Line 1-42）
- Line 1-4: `visibilitychange`検出（タブが非表示）
- Line 5-10: PitchProリソースクリーンアップ
- ページリロード開始

#### Phase 2: trainingページ初期化開始（Line 43-118）
- Line 54-55: `trainingPageActive`フラグをセット
- Line 77-79: `detectReload()`がリロード検出（`normalTransition`フラグなし + `trainingPageActive`フラグあり）
- Line 80: `showReloadDialog()` → **アプリ側ダイアログ出現**
- Line 81: `redirectToPreparation()`呼び出し
- Line 84: `window.location.hash = 'preparation?...'`でpreparationへ遷移開始
- Line 101-108: **エラー`REDIRECT_TO_PREPARATION`発生**
- Line 111-118: **なぜかtrainingページ初期化が完了してしまう**

#### Phase 3: preparationページ初期化（Line 120-175）
- Line 128-175: preparationページ正常初期化

### 問題点の特定

#### 1. リダイレクト処理の設計ミス
```javascript
// trainingController.js Line 360-370
if (NavigationManager.detectReload()) {
    NavigationManager.showReloadDialog();  // alert()
    await NavigationManager.redirectToPreparation('リロード検出');
    throw NavigationManager.createRedirectError();  // ← エラーthrow
}
```

**問題**:
- `redirectToPreparation()`が既に`window.location.hash`を変更済み（Line 235）
- その後エラーをthrowしても、trainingページ初期化が継続してしまう
- router.jsはエラーを検出するが、既にページ遷移が開始されている

#### 2. beforeunloadとpopstateの複雑な相互作用

**beforeunload（タブを閉じる・リロード防止）**:
- `enableNavigationWarning()`: trainingController.js Line 399で500ms遅延後に設定
- `disableNavigationWarning()`: `safeNavigate()`や`redirectToPreparation()`で無効化

**popstate（ブラウザバック防止）**:
- `preventBrowserBack()`: router.jsがページロード時に自動設定
- `removeBrowserBackPrevention()`: `safeNavigate()`や`redirectToPreparation()`で削除
- **popstateハンドラー内でalert()表示** → 許可されていない遷移の場合

#### 3. sessionStorageフラグの管理

**normalTransitionフラグ**:
- `setNormalTransition()`: 正常な遷移開始時に設定
- `detectReload()`で最優先チェック
- 正常な遷移なら即座に削除

**trainingPageActiveフラグ**:
- trainingController.js Line 207で初期化開始時にセット
- trainingController.js Line 388で初期化完了時に削除
- リロード時は削除されず残る → リロード検出の根拠

## 根本的な設計問題

### 問題1: リダイレクトをエラーとして扱っている
- リダイレクトは正常な処理であり、エラーではない
- エラーthrowの後も処理が継続してしまう仕組み

### 問題2: router.jsとcontroller.jsの責任分離が不明確
- リロード検出をcontroller.jsで実行
- ページ初期化の途中で遷移が発生
- router.jsは既に次のページ初期化を開始

### 問題3: ページ遷移中の状態管理が不完全
- `redirectToPreparation()`がhash変更
- その後エラーthrow
- router.jsがエラーを検出
- しかし2つのページが同時初期化される

## 正しい設計の候補

### 候補A: Router統合方式（推奨）
**責任分離**:
- **router.js**: ページ初期化**前**にリロード検出・リダイレクト判定
- **controller.js**: リロード検出不要、純粋な初期化処理のみ

**メリット**:
- 単純明快な責任分離
- ページ初期化前に遷移が確定
- エラーthrow不要

**実装イメージ**:
```javascript
// router.js
async loadPage(page) {
    // 【最優先】リロード検出（trainingページのみ）
    if (page === 'training' && NavigationManager.detectReload()) {
        NavigationManager.showReloadDialog();
        await NavigationManager.redirectToPreparation('リロード検出');
        return; // ページ初期化をスキップ
    }
    
    // 通常のページ初期化
    await this.initializePage(page);
}
```

### 候補B: Controller即座リターン方式
**現状維持**:
- controller.jsでリロード検出
- エラーthrowではなく即座にreturn

**問題**:
- `redirectToPreparation()`が既にhash変更済み
- router.jsが次のページ初期化を開始
- 責任分離が不明確

### 候補C: フラグベース遅延リダイレクト方式
**アイデア**:
- リロード検出時に`shouldRedirect`フラグをセット
- router.jsがフラグを検出してリダイレクト

**問題**:
- 複雑すぎる
- フラグ管理が増える

## 推奨設計: 候補A（Router統合方式）

### 設計原則
1. **責任の明確化**: router.jsがページ遷移全体を管理
2. **単一責任**: controller.jsは純粋な初期化のみ
3. **シンプルさ**: エラーthrowやフラグ管理を最小化

### 実装方針
1. router.jsの`loadPage()`メソッドに、ページ初期化**前**のリロード検出を追加
2. trainingController.jsからリロード検出処理を削除
3. `createRedirectError()`を削除（不要）
4. beforeunload/popstateの管理をそのまま維持

### 変更箇所
- **router.js**: `loadPage()`メソッド修正
- **trainingController.js**: Line 360-371削除
- **navigation-manager.js**: `createRedirectError()`削除

### メリット
- 単純明快な処理フロー
- 2つのページ同時初期化の問題が完全解決
- エラーハンドリング不要
- 将来的な拡張性も確保
