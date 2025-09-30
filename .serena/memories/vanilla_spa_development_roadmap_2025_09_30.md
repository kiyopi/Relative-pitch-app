# Vanilla JS + 自作SPA 開発ロードマップ (2025年9月30日)

## 🎯 最終目標
ブラウザのページ再読み込みを一切行わずに、preparation.html → training.html → results-overview.html のような画面遷移を実現し、その間PitchProインスタンスやユーザーの状態をメモリ上で維持し続けるアプリケーションを構築する。

## 根本的な問題解決
- **マイク許可ダイアログの再表示問題**: ページリロードがなくなることで完全解決
- **PitchProインスタンス管理**: メモリ上での永続的な保持
- **状態管理の簡素化**: グローバル変数の混乱を防ぐ

## Phase 1: ルーターと動的ビューの導入（ページ遷移問題の根本解決）

### 目的
物理的なページ遷移 (window.location.href) をなくし、単一のindex.html内でUIを動的に書き換える仕組みを構築する。

### 実装内容

#### 1. index.htmlを唯一のシェルにする
- 現在のindex.htmlをアプリケーションの唯一の入り口（シェルまたは器）とする
- ヘッダーやフッターなど、全ページで共通の要素のみを残す
- メインコンテンツ部分は`<main id="app-root"></main>`のような空のコンテナにする

#### 2. 各ページをHTMLテンプレート化する
- preparation-step1.html, preparation-step2.html, training.htmlなどの`<body>`内のメインコンテンツ部分を個別のHTMLファイルとして保存
- 保存先: `templates/preparation.html`, `templates/training.html`など

#### 3. シンプルな「ハッシュルーター」を作成する
- URLの#（ハッシュ）部分を使ってページを管理
- `js/router.js`に実装

**基本ロジック**:
- URLが`index.html#preparation`に変わったら、`fetch('templates/preparation.html')`でHTMLを読み込み、`#app-root`の中身を書き換える
- URLが`index.html#training`に変わったら、`fetch('templates/training.html')`でHTMLを読み込む

#### 4. ナビゲーションを更新する
- すべての`onclick="window.location.href='...'"`を`<a href="#preparation">`のようにハッシュリンクに置き換え

### ✅ Phase 1完了時の効果
- ページ遷移問題が完全に解決
- ブラウザはリロードされなくなる
- globalAudioManagerやPitchProインスタンスはアプリケーションを閉じるまでメモリ上に保持
- マイク許可ダイアログは二度と表示されない

## Phase 2: ページコントローラーへの責務分離

### 目的
テンプレートを読み込んだ後に、そのページ専用のJavaScriptロジックを実行する仕組みを構築し、コードをページ単位で整理する。

### 実装内容

#### 1. ページ専用コントローラーの作成
- preparation-step1.htmlやpreparation-step2.htmlの巨大な`<script>`タグのロジックを分割
- 保存先: `js/controllers/preparationController.js`, `js/controllers/trainingController.js`など

#### 2. ルーターを拡張する
- `js/router.js`を拡張し、テンプレート読み込み後に対応するコントローラーJSを動的インポート

**実装例**:
```javascript
async function handleRouteChange() {
    const page = location.hash.substring(1) || 'home'; // #home

    // 1. テンプレートを読み込み
    const response = await fetch(`templates/${page}.html`);
    document.getElementById('app-root').innerHTML = await response.text();

    // 2. 対応するコントローラーを動的に読み込んで実行
    if (page === 'preparation') {
        const { initializePreparationPage } = await import('./controllers/preparationController.js');
        initializePreparationPage();
    }
    lucide.createIcons(); // UIが更新されたのでアイコンを再描画
}

window.addEventListener('hashchange', handleRouteChange);
handleRouteChange(); // 初期表示
```

### ✅ Phase 2完了時の効果
- HTML（見た目）とJavaScript（動作）が完全に分離
- 各ページのロジックが独立したファイルになる
- コードの見通しが劇的に改善

## Phase 3: UIコンポーネントの抽象化

### 目的
繰り返し使われるUI部品を、再利用可能なコンポーネントとしてカプセル化し、HTML構造への依存を減らす。

### 実装内容

#### 1. コンポーネントの特定
- ステップインジケーター
- 音量バー
- 結果表示カード
- ドレミガイド
- 進行バー

#### 2. クラスまたは関数として実装
- `js/components/`フォルダに作成
- HTML要素を生成し、イベント処理を内部に持つJavaScriptクラス

**実装例**:
```javascript
class StepIndicator {
    constructor(container, options) {
        this.container = container;
        this.currentStep = options.currentStep;
        this.render();
    }
    
    render() {
        // HTML生成とイベント処理
    }
}

// 使用例
new StepIndicator('#steps-container', { currentStep: 2 });
```

### 既存資産の活用
- **MicPermissionManager**: すでにコンポーネント化済み
- **VolumeBarController**: 実装済み
- **GlobalAudioManager**: PitchPro管理

### ✅ Phase 3完了時の効果
- コードの重複が減少
- UIの一貫性が保持
- レイアウト修正時にJavaScriptを壊すリスクが減少

## Phase 4: 状態管理の一元化

### 目的
グローバル変数を減らし、アプリケーションの状態を単一の信頼できる情報源（ストア）で管理する。

### 実装内容

#### 1. ストアオブジェクトの作成
`js/store.js`にアプリケーション状態を保持する単一オブジェクト定義

```javascript
const AppStore = {
    state: {
        currentUser: null,
        currentMode: null,
        voiceRangeData: null,
        pitchProInstance: null,
        micPermissionManager: null,
        sessionData: {},
        trainingHistory: []
    },
    
    // 状態変更メソッド
    setUser(user) {
        this.state.currentUser = user;
        this.notify('userChanged', user);
    },
    
    startTrainingMode(mode) {
        this.state.currentMode = mode;
        this.notify('modeChanged', mode);
    },
    
    setVoiceRange(data) {
        this.state.voiceRangeData = data;
        localStorage.setItem('voiceRange', JSON.stringify(data));
    }
}
```

#### 2. 状態変更のルール化
- 状態変更は専用関数経由でのみ可能
- 直接的な状態操作を禁止

#### 3. 変更通知の仕組み（オプション）
- イベントディスパッチャー実装
- 状態変更時に関連UIコンポーネントへ通知

### ✅ Phase 4完了時の効果
- データの流れが予測可能
- デバッグが容易
- 大規模化しても破綻しにくい堅牢な構造

## 実装優先順位と期待効果

### 最優先: Phase 1
- **理由**: マイク許可問題の根本解決
- **効果**: ユーザー体験の劇的改善
- **期間**: 1週間

### 次優先: Phase 2
- **理由**: コード整理とメンテナンス性向上
- **効果**: 開発効率の向上
- **期間**: 1週間

### 段階的実装: Phase 3-4
- **理由**: 長期的な保守性と拡張性
- **効果**: 堅牢なアーキテクチャ確立
- **期間**: 2-3週間

## 技術的メリット

### SPAアーキテクチャの利点
1. **状態保持**: PitchProインスタンスの永続化
2. **パフォーマンス**: ページリロードなしの高速遷移
3. **UX向上**: シームレスな画面切り替え
4. **開発効率**: モジュール化による保守性向上

### 音声処理特化の利点
1. **マイク許可**: 一度の許可で全画面利用可能
2. **リアルタイム処理**: 中断なしの音声検出
3. **データ連携**: 画面間でのスムーズなデータ共有

## リスクと対策

### 潜在的リスク
1. **初期実装の複雑性**: ルーター構築の学習コスト
2. **デバッグの難易度**: 非同期処理の増加
3. **ブラウザ互換性**: History APIのサポート

### 対策
1. **段階的実装**: Phase 1から順次実装
2. **詳細ログ**: デバッグ用ログシステム構築
3. **フォールバック**: ハッシュベースルーティング採用

## まとめ

このロードマップに従うことで、現在の物理的ページ遷移による問題を根本的に解決し、真のシングルページアプリケーションを構築できる。特にPhase 1の実装により、マイク許可ダイアログの再表示問題が完全に解決され、ユーザー体験が劇的に向上する。

Vanilla JavaScriptでの実装により、音声処理の特殊要件に完全に対応しながら、モダンなSPAアーキテクチャを実現できる。

## 作成日
2025年9月30日

## ステータス
✅ ロードマップ策定完了
🔄 Phase 1実装準備中