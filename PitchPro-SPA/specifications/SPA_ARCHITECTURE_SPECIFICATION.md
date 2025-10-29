# SPA Architecture Specification
# SPAアーキテクチャ仕様書

**バージョン**: 1.0.0
**作成日**: 2025-10-29
**最終更新**: 2025-10-29
**プロジェクト**: 8va相対音感トレーニングアプリ

---

## 📋 目次

1. [概要](#概要)
2. [技術スタック](#技術スタック)
3. [SPA構造とルーティング](#spa構造とルーティング)
4. [ファイル構成](#ファイル構成)
5. [スクリプト管理ルール](#スクリプト管理ルール)
6. [ページ追加ガイドライン](#ページ追加ガイドライン)
7. [キャッシュバスター管理](#キャッシュバスター管理)
8. [重要な設計原則](#重要な設計原則)

---

## 概要

### アプリケーションの構造
本アプリケーションは**ハイブリッドSPA (Single Page Application)** として実装されています。

- **エントリーポイント**: `/PitchPro-SPA/index.html`
- **ルーター**: `/PitchPro-SPA/js/router.js`
- **ページテンプレート**: `/PitchPro-SPA/pages/` ディレクトリ

### ハイブリッドSPAとは
- 基本はSPA構造（ページ遷移せずDOM書き換え）
- ページテンプレートに**ページ固有のスクリプト**を含めることが可能
- router.jsが動的にスクリプトを実行する仕組み

---

## 技術スタック

### 実際の実装技術
```
フロントエンド: Vanilla JavaScript (ES6+)
アーキテクチャ: Hybrid SPA
ルーティング: 自作router.js (ハッシュベースルーティング)
音声処理: Web Audio API + PitchPro (独自ライブラリ)
UIライブラリ: Lucide Icons v0.263.0
デプロイ: GitHub Pages
```

### 注意事項
- **TypeScript + Viteへの移行は計画段階**（現在は未実装）
- 要件定義書に記載の「Mantine + Cloudflare Pages」は初期計画であり、実装は異なる

---

## SPA構造とルーティング

### router.jsの動作仕様

#### 基本動作フロー
```
1. ユーザーがリンクをクリック (例: #home, #training)
2. router.jsがhashchangeイベントを検知
3. 対応するHTMLテンプレートを/pages/から取得 (fetch)
4. #app-root内のDOMを書き換え (innerHTML)
5. テンプレート内の<script>タグを抽出・実行
6. Lucideアイコンを初期化
```

#### ルーティング定義
ファイル: `/PitchPro-SPA/js/router.js` (lines 10-20)

```javascript
this.routes = {
    'home': 'pages/home.html',
    'preparation': 'pages/preparation-step1.html',
    'training': 'pages/training.html',
    'result-session': 'pages/result-session.html',
    'results': 'pages/results-overview.html',
    'records': 'pages/records.html'
};
```

#### スクリプト実行の仕組み
ファイル: `/PitchPro-SPA/js/router.js` (lines 82-97)

```javascript
// 2.5. HTMLに含まれるスクリプトを手動で実行
const scriptTags = this.appRoot.querySelectorAll('script');
scriptTags.forEach(oldScript => {
    const newScript = document.createElement('script');
    if (oldScript.src) {
        newScript.src = oldScript.src;
    } else {
        newScript.textContent = oldScript.textContent;
    }
    document.body.appendChild(newScript);
    oldScript.remove();
});
```

**重要**: この仕組みにより、ページテンプレート内のスクリプトが実行される。

---

## ファイル構成

### ディレクトリ構造
```
PitchPro-SPA/
├── index.html                    # エントリーポイント（共通スクリプト読み込み）
├── styles/
│   ├── base.css                  # 共通スタイル（1,108行）
│   ├── results.css               # 結果表示専用スタイル
│   ├── training.css              # トレーニング専用スタイル
│   └── voice-range.css           # 音域テスト専用スタイル
├── js/
│   ├── router.js                 # SPAルーター
│   ├── data-manager.js           # データ管理（localStorage）
│   ├── navigation-manager.js     # ナビゲーション制御
│   ├── evaluation-calculator.js  # 評価計算
│   ├── lucide-init.js            # Lucideアイコン統合初期化
│   ├── core/
│   │   ├── pitchpro-v1.3.1.umd.js      # 音声処理ライブラリ
│   │   └── reference-tones.js          # PitchShifter (Tone.js使用)
│   └── controllers/
│       ├── session-data-recorder.js    # セッションデータ記録
│       └── result-session-controller.js # セッション結果コントローラー
└── pages/
    ├── home.html                 # ホーム画面
    ├── preparation-step1.html    # トレーニング準備画面
    ├── training.html             # トレーニング画面
    ├── result-session.html       # セッション結果画面（SPAテンプレート）
    ├── results-overview.html     # 総合評価画面
    └── records.html              # トレーニング記録画面
```

### ファイルの種類と役割

#### 1. エントリーポイント: `index.html`
**役割**:
- アプリケーション全体の骨格を提供
- **共通スクリプト・スタイルシートを一度だけ読み込む**
- SPAルーター（router.js）を起動

**読み込まれる共通スクリプト**:
```html
<!-- CSS -->
<link rel="stylesheet" href="styles/base.css?v=20251029003">
<link rel="stylesheet" href="styles/results.css?v=20251029003">
<link rel="stylesheet" href="styles/training.css?v=20251029003">
<link rel="stylesheet" href="styles/voice-range.css?v=20251029003">

<!-- Lucide Icons (v0.263.0 固定) -->
<script src="https://unpkg.com/lucide@0.263.0/dist/umd/lucide.js"></script>

<!-- 基盤システム -->
<script src="js/data-manager.js?v=20251029003"></script>
<script src="js/navigation-manager.js?v=20251029003"></script>
<script src="js/evaluation-calculator.js?v=20251029003"></script>
<script src="js/controllers/session-data-recorder.js?v=20251029003"></script>
<script src="js/controllers/result-session-controller.js?v=20251029003"></script>
<script src="js/core/pitchpro-v1.3.1.umd.js?v=20251029003"></script>

<!-- 音域テスト -->
<script src="pages/js/voice-range-test.js?v=20251029003"></script>

<!-- PitchShifter (動的読み込み) -->
<script>
    const script = document.createElement('script');
    script.src = `pages/js/preparation-pitchpro-cycle.js?t=${Date.now()}`;
    document.head.appendChild(script);
</script>

<!-- Tone.js (ESM) -->
<script type="importmap">
{
    "imports": {
        "tone": "https://cdn.jsdelivr.net/npm/tone@15.1.22/+esm"
    }
}
</script>
<script type="module">
    import { PitchShifter } from './js/core/reference-tones.js?v=2.9.0&t=1128536049&nocache=1';
    import * as Tone from 'tone';
    window.PitchShifter = PitchShifter;
    window.Tone = Tone;
</script>

<!-- Lucide統合初期化 -->
<script src="js/lucide-init.js?v=20251028009"></script>

<!-- SPAルーター -->
<script src="js/router.js?v=20251028009"></script>
```

#### 2. ページテンプレート: `/pages/*.html`
**役割**:
- ページ固有のコンテンツ（HTML）を提供
- **ページ固有のスクリプトを含めることが可能**（router.jsが実行）

**2つのタイプ**:

##### タイプA: SPAテンプレート（推奨）
**特徴**:
- `<!DOCTYPE html>`, `<head>`, `<body>`タグなし
- **共通スクリプトを含めない**（index.htmlで読み込み済み）
- ページ固有のスクリプトのみ含める

**例**: `result-session.html`
```html
<!-- SPA用テンプレート: result-session
     このファイルはindex.htmlのrouter.jsから読み込まれます。
     スクリプトタグは不要（index.htmlで既に読み込み済み）
-->
<div class="container">
    <!-- ページコンテンツ -->
</div>
```

##### タイプB: 完全HTMLページ（レガシー）
**特徴**:
- `<!DOCTYPE html>`, `<head>`, `<body>`タグあり
- ページ固有のスクリプトを含める（例: Chart.js）
- **共通スクリプトを含めない**（重複防止）

**例**: `results-overview.html`
```html
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <title>総合評価</title>
    <!-- 共通スタイルシートは不要（index.htmlで読み込み済み） -->
</head>
<body>
    <div class="container">
        <!-- ページコンテンツ -->
    </div>

    <!-- ページ固有スクリプト（Chart.js等） -->
    <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.js"></script>
    <script>
        // ページ固有のロジック
    </script>
</body>
</html>
```

---

## スクリプト管理ルール

### 🚨 重要な原則

#### ❌ 禁止事項
1. **ページテンプレートで共通スクリプトを読み込まない**
   - `data-manager.js`
   - `pitchpro-v1.3.1.umd.js`
   - `lucide-init.js`
   - `navigation-manager.js`
   - `evaluation-calculator.js`
   - `session-data-recorder.js`
   - `voice-range-test.js`

2. **Lucide Icons CDNを重複読み込みしない**
   ```html
   <!-- ❌ 禁止 -->
   <script src="https://unpkg.com/lucide@latest/dist/umd/lucide.js"></script>
   ```

#### ✅ 許可事項
1. **ページ固有のスクリプト読み込み**
   - Chart.js（グラフ表示ページのみ）
   - ページ固有のロジック（インラインスクリプト）

2. **index.htmlで読み込み済みのグローバル変数使用**
   ```javascript
   // ✅ 使用可能
   window.DataManager
   window.NavigationManager
   window.EvaluationCalculator
   window.sessionDataRecorder
   window.initializeLucideIcons({ immediate: true })
   ```

### スクリプト重複チェック方法

#### 新しいページを作成する前に確認
```bash
# index.htmlで読み込まれているスクリプトを確認
grep '<script' /Users/isao/Documents/Relative-pitch-app/PitchPro-SPA/index.html

# ページテンプレートでスクリプト重複がないか確認
grep -r '<script src=".*data-manager.js' PitchPro-SPA/pages/
grep -r '<script src=".*pitchpro' PitchPro-SPA/pages/
grep -r 'lucide@' PitchPro-SPA/pages/
```

---

## ページ追加ガイドライン

### 新しいページを追加する手順

#### STEP 1: ページテンプレートを作成
```bash
# ファイル作成
touch /Users/isao/Documents/Relative-pitch-app/PitchPro-SPA/pages/new-page.html
```

**テンプレート構造（推奨）**:
```html
<!-- SPA用テンプレート: new-page
     このファイルはindex.htmlのrouter.jsから読み込まれます。
-->
<div class="container">
    <!-- ページヘッダー -->
    <header class="page-header">
        <div class="page-header-content">
            <div class="page-header-icon-wrapper">
                <div class="page-header-icon gradient-catalog-blue">
                    <i data-lucide="[icon-name]" class="text-white"></i>
                </div>
            </div>
            <div class="page-header-text">
                <h1 class="page-title">ページタイトル</h1>
                <p class="page-subtitle text-green-200">サブタイトル</p>
            </div>
        </div>
    </header>

    <!-- メインコンテンツ -->
    <main class="narrow-main">
        <!-- コンテンツ -->
    </main>
</div>

<!-- ページ固有のスクリプト（必要な場合のみ） -->
<script>
    // ページ固有のロジック
    console.log('✅ new-page loaded');
</script>
```

#### STEP 2: router.jsにルート追加
ファイル: `/PitchPro-SPA/js/router.js`

```javascript
this.routes = {
    'home': 'pages/home.html',
    'preparation': 'pages/preparation-step1.html',
    'training': 'pages/training.html',
    'result-session': 'pages/result-session.html',
    'results': 'pages/results-overview.html',
    'records': 'pages/records.html',
    'new-page': 'pages/new-page.html' // 追加
};
```

#### STEP 3: ナビゲーションリンク追加
ファイル: `/PitchPro-SPA/index.html`

```html
<nav class="header-nav" id="header-nav">
    <button class="nav-button" onclick="location.hash='new-page'" title="新しいページ">
        <i data-lucide="[icon-name]" class="icon-md"></i>
        <span class="nav-text">新ページ</span>
    </button>
</nav>
```

#### STEP 4: 動作確認
```bash
# ローカルサーバー起動
cd /Users/isao/Documents/Relative-pitch-app/PitchPro-SPA
python3 -m http.server 8000

# ブラウザで確認
# http://localhost:8000/#new-page
```

#### STEP 5: 確認項目チェックリスト
- [ ] ページが正しく表示される
- [ ] Lucideアイコンが表示される
- [ ] コンソールにエラーがない
- [ ] 他のページへの遷移が正常に動作する
- [ ] スクリプト重複エラーがない

---

## キャッシュバスター管理

### キャッシュバスターとは
ブラウザのキャッシュを無効化し、**最新のファイルを強制的に読み込ませる**仕組み。

### 形式
```
?v=YYYYMMDD[revision]
```

### 更新タイミング
- CSSファイル修正時
- JavaScriptファイル修正時
- 重要な機能追加・修正時

### 更新手順

#### STEP 1: バージョン番号を決定
```
現在: v20251029003
次回: v20251029004 (同日の場合)
次回: v20251030001 (翌日の場合)
```

#### STEP 2: index.htmlを一括更新
```bash
# sedコマンドで一括置換
sed -i '' 's/?v=20251029003/?v=20251029004/g' /Users/isao/Documents/Relative-pitch-app/PitchPro-SPA/index.html
```

#### STEP 3: 更新確認
```bash
grep '?v=' /Users/isao/Documents/Relative-pitch-app/PitchPro-SPA/index.html
```

#### STEP 4: コミット
```bash
git add PitchPro-SPA/index.html
git commit -m "chore: キャッシュバスター更新 v20251029004"
```

### 現在のキャッシュバスターバージョン
**v20251029003** (2025-10-29時点)

---

## 重要な設計原則

### 1. DRY原則（Don't Repeat Yourself）
- 共通スクリプトは**index.htmlで一度だけ読み込む**
- ページテンプレートでは重複読み込みしない

### 2. 責任分離
- **index.html**: 共通リソース管理・アプリケーション骨格
- **router.js**: ルーティング・ページ切り替え
- **pages/*.html**: ページ固有のコンテンツ・ロジック

### 3. グローバル変数の活用
```javascript
// index.htmlで定義されたグローバル変数
window.DataManager            // データ管理
window.NavigationManager      // ナビゲーション制御
window.EvaluationCalculator   // 評価計算
window.sessionDataRecorder    // セッションデータ記録
window.initializeLucideIcons  // Lucideアイコン初期化
```

### 4. エラー防止チェック
新しいページ作成時、以下を必ず確認：
```
✅ index.htmlで読み込み済みのスクリプトを重複させない
✅ Lucide Icons CDNを重複読み込みしない
✅ router.jsにルート定義を追加
✅ キャッシュバスターを適切に管理
✅ コンソールでエラーがないことを確認
```

---

## トラブルシューティング

### よくあるエラーと解決方法

#### エラー1: DataManager重複定義
```
[Error] SyntaxError: Can't create duplicate variable: 'DataManager'
```
**原因**: ページテンプレートで`data-manager.js`を重複読み込みしている
**解決**: ページテンプレートから該当スクリプトタグを削除

#### エラー2: Lucideアイコンが表示されない
```
[Warning] <i data-lucide="icon-name"></i> icon name was not found
```
**原因**:
1. Lucide v0.263.0に存在しないアイコン名を使用
2. `initializeLucideIcons()`が実行されていない

**解決**:
1. アイコン名をv0.263.0互換に変更（CLAUDE.md参照）
2. ページスクリプト内で`window.initializeLucideIcons({ immediate: true })`を実行

#### エラー3: MIME typeエラー
```
[Error] Refused to execute as script because "X-Content-Type-Options: nosniff"
```
**原因**: 重複スクリプト読み込みによるCORSエラー
**解決**: スクリプト重複を削除

---

## 参考資料

### 関連ドキュメント
- `CLAUDE.md` - 開発ガイドライン・CSS設計
- `APP_SPECIFICATION.md` - アプリケーション仕様書
- `REQUIREMENTS_SPECIFICATION.md` - 要件定義書
- `TECHNICAL_SPECIFICATIONS.md` - 技術仕様書

### ファイルパス
- **index.html**: `/Users/isao/Documents/Relative-pitch-app/PitchPro-SPA/index.html`
- **router.js**: `/Users/isao/Documents/Relative-pitch-app/PitchPro-SPA/js/router.js`
- **pages/**: `/Users/isao/Documents/Relative-pitch-app/PitchPro-SPA/pages/`

---

**このドキュメントはプロジェクトの進行に応じて更新されます。**
