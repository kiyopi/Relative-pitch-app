# SPA Architecture Specification
# SPAアーキテクチャ仕様書

**バージョン**: 1.2.0
**作成日**: 2025-10-29
**最終更新**: 2025-11-29
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
9. [ヘッダー・フッター表示制御](#ヘッダーフッター表示制御)
10. [トレーニングモード一覧](#トレーニングモード一覧)
11. [ナビゲーション安全機構](#ナビゲーション安全機構)

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

## ヘッダー・フッター表示制御

### 概要

本アプリケーションでは、ページの種類に応じてグローバルヘッダーとフッターナビゲーションの表示を動的に制御しています。

### グローバルヘッダーの表示制御

#### 表示対象ページ（v1.2.0更新）

**実装場所**: `/PitchPro-SPA/js/router.js` (loadPage()メソッド内)

```javascript
// ヘッダーの表示/非表示を切り替え
// ナビゲーションアイコンがあるページ（home, records, premium-analysis, settings, help）で表示
const appHeader = document.querySelector('.app-header');
const showHeaderPages = ['home', 'records', 'premium-analysis', 'settings', 'help'];
if (appHeader) {
    if (showHeaderPages.includes(page)) {
        appHeader.style.display = '';
    } else {
        appHeader.style.display = 'none';
    }
}
```

#### ページ別表示状況一覧

| ページ | グローバルヘッダー | フッターホームボタン | 理由 |
|--------|:--:|:--:|---------|
| **home** | ✅表示 | ❌非表示 | ナビゲーション機能あり |
| **records** | ✅表示 | ✅表示 | ナビゲーションボタンから遷移可能 |
| **premium-analysis** | ✅表示 | ✅表示 | ナビゲーションボタンから遷移可能 |
| **settings** | ✅表示 | ✅表示 | ナビゲーションボタンから遷移可能 |
| **help** | ✅表示 | ✅表示 | ナビゲーションボタンから遷移可能 |
| **preparation** | ❌非表示 | ✅表示 | トレーニングフロー中 |
| **training** | ❌非表示 | ✅表示 | トレーニングフロー中 |
| **result-session** | ❌非表示 | ✅表示 | トレーニングフロー中 |
| **results-overview** | ❌非表示 | ✅表示 | トレーニングフロー中 |

#### 設計思想

1. **ナビゲーション機能があるページ**: グローバルヘッダーを表示（記録、詳細分析、設定、ヘルプへの遷移を可能に）
2. **トレーニングフロー中のページ**: グローバルヘッダーを非表示（集中を妨げない・ページ固有のヘッダーを使用）
3. **フッターホームボタン**: ホームページ以外で常に表示（どこからでもホームに戻れる）

### グローバルヘッダーの構造

**実装場所**: `/PitchPro-SPA/index.html`

```html
<header class="app-header">
    <!-- ブランド部分（左側） -->
    <div class="header-brand">
        <div class="header-icon-wrapper">
            <div class="header-icon">
                <i data-lucide="music" class="icon-lg text-white"></i>
            </div>
        </div>
        <div>
            <h1>8va相対音感トレーニング</h1>
            <p>あなたの音感を科学的に向上させましょう</p>
        </div>
    </div>

    <!-- モバイル用ハンバーガーメニュー -->
    <button class="menu-toggle" id="menu-toggle">
        <i data-lucide="menu" class="icon-md"></i>
    </button>

    <!-- ナビゲーションボタン -->
    <nav class="header-nav" id="header-nav">
        <button class="nav-button" onclick="location.hash='records'">記録</button>
        <button class="nav-button" onclick="location.hash='premium-analysis'">詳細分析</button>
        <button class="nav-button" onclick="location.hash='settings'">設定</button>
        <button class="nav-button" onclick="location.hash='help'">ヘルプ</button>
        <button class="nav-button">共有</button>
    </nav>
</header>
```

### フッターナビゲーションの表示制御

**実装場所**: `/PitchPro-SPA/js/router.js`

```javascript
// フッターナビゲーションの表示/非表示を切り替え（ホームページ以外で表示）
const footerNav = document.getElementById('footer-nav');
if (footerNav) {
    if (page === 'home') {
        footerNav.style.display = 'none';
    } else {
        footerNav.style.display = 'flex';
    }
}
```

### マイク管理との独立性

**重要**: ヘッダー表示制御とAudioDetector（マイク管理）は完全に独立したシステムです。

- **ヘッダー制御**: ページIDに基づくシンプルな判定
- **AudioDetector管理**: NavigationManagerが責任を持つ
- **相互影響なし**: ヘッダーの表示/非表示がマイク権限に影響しない

---

## トレーニングモード一覧

本アプリケーションは3つのトレーニングモードを提供します。すべてのモード定義は`/js/mode-controller.js`で一元管理されています。

### モード定義の管理

**管理ファイル**: `/PitchPro-SPA/js/mode-controller.js` (v2.1.0)

**責任範囲**:
- モード定義の一元管理
- セッション数の動的計算
- モード名の統一管理
- 方向別表示名の管理（上行/下行）
- UI表示（アイコン・色・タイトル）の統一管理
- 1セッション標準時間の定義

### 1. ランダム基音モード (random)

**対象レベル**: 初級 (beginner)

**特徴**:
- **セッション数**: 8セッション/レッスン
- **基音選択**: 音域内ランダム基音、連続重複なし (`random_c3_octave`)
- **個別結果表示**: あり (`hasIndividualResults: true`)
- **音域調整**: なし (`hasRangeAdjustment: false`)
- **標準時間**: 13秒/セッション（基音2.5s + ガイド5.3s + 発声5.6s）

**UI設定**:
- アイコン: `shuffle` (Lucide Icons)
- 背景色: `gradient-catalog-green`
- サブタイトル色: `text-green-200`

**方向別表示名**:
- 上行: "ランダム基音モード 上行"
- 下行: "ランダム基音モード 下行"

**動作フロー**:
```
各セッション完了後 → result-sessionページへ遷移
→ 個別評価表示 → 次のセッションへ
```

### 2. 連続チャレンジモード (continuous)

**対象レベル**: 中級 (intermediate)

**特徴**:
- **セッション数**: 12セッション/レッスン
- **基音選択**: クロマチック12音、連続重複防止 (`random_chromatic`)
- **個別結果表示**: なし (`hasIndividualResults: false`)
- **音域調整**: なし (`hasRangeAdjustment: false`)
- **標準時間**: 13秒/セッション

**UI設定**:
- アイコン: `zap` (Lucide Icons)
- 背景色: `gradient-catalog-orange`
- サブタイトル色: `text-orange-200`

**方向別表示名**:
- 上行: "連続チャレンジモード 上行"
- 下行: "連続チャレンジモード 下行"

**動作フロー**:
```
12セッション連続実行 → ページ遷移なし
→ レッスン完了後に総合評価ページへ
```

### 3. 12音階モード (12tone)

**対象レベル**: 上級 (advanced)

**特徴**:
- **セッション数**: 12-24セッション/レッスン（方向性により動的変更）
  - 上昇: 12セッション
  - 下降: 12セッション
  - 両方向: 24セッション
- **基音選択**: 12音階順次使用 (`sequential_chromatic`)
- **個別結果表示**: なし (`hasIndividualResults: false`)
- **音域調整**: あり (`hasRangeAdjustment: true`)
- **標準時間**: 13秒/セッション

**UI設定**:
- アイコン: `music` (Lucide Icons)
- 背景色: `gradient-catalog-purple`
- サブタイトル色: `text-purple-200`

**方向別表示名**:
- 上昇: "12音階上昇モード 上行"
- 下降: "12音階下降モード 上行"
- 両方向: "12音階両方向モード 上行"

**動作フロー**:
```
12/24セッション連続実行 → ページ遷移なし
→ レッスン完了後に総合評価ページへ
```

### モード間の主要な違い

| 項目 | ランダム基音 | 連続チャレンジ | 12音階 |
|---|---|---|---|
| **セッション数** | 8 | 12 | 12-24（可変） |
| **基音選択** | ランダム | ランダム12音 | 順次12音 |
| **個別結果** | あり | なし | なし |
| **音域調整** | なし | なし | あり |
| **難易度** | 初級 | 中級 | 上級 |
| **ページ遷移** | 毎セッション後 | なし | なし |

### 将来の拡張計画

#### 4. 弱点練習モード（追加予定）

**対象レベル**: 初級〜上級（全レベル対応）

**計画中の特徴**:
- **セッション数**: 未定（ユーザーの弱点音程数に応じて動的変更）
- **基音選択**: 過去のトレーニングデータから苦手な音程を自動抽出
- **個別結果表示**: 未定
- **音域調整**: あり（予定）
- **モードID**: `weakness-practice`（仮）

**目的**:
- 過去のトレーニング記録から正答率の低い音程を特定
- 弱点音程を集中的にトレーニング
- 苦手克服による総合的な相対音感向上

**実装のための前提条件**:
- トレーニング記録データの蓄積
- 音程別の正答率分析システム
- 弱点抽出アルゴリズムの設計

**注意**: 現在は計画段階であり、実装時期は未定です。

---

### ModeController API

**主要メソッド**:

```javascript
// モード設定取得
ModeController.getMode('random')

// セッション数取得（動的計算対応）
ModeController.getSessionsPerLesson('12tone', { direction: 'both' }) // → 24

// モード名取得
ModeController.getModeName('random') // → 'ランダム基音モード'
ModeController.getModeName('random', true) // → 'ランダム基音'（短縮名）

// 表示名取得（方向パラメータ対応）
ModeController.getDisplayName('random', { scaleDirection: 'ascending' })
// → 'ランダム基音モード 上行'

// ページヘッダーUI更新
ModeController.updatePageHeader('continuous', {
    scaleDirection: 'descending',
    subtitleText: 'トレーニング準備'
})
```

**使用箇所**:
- `trainingController.js`: トレーニング実行
- `records-controller.js`: レッスングループ化、総トレーニング時間計算
- `session-data-recorder.js`: セッションデータ保存
- `results-overview-controller.js`: 総合評価ページ
- `preparation-pitchpro-cycle.js`: 準備ページサブタイトル表示

---

## ナビゲーション安全機構

### 準備ページスキップ機能の目的

#### UX改善の核心

本アプリケーションでは、**既にマイク許可と音域データが揃っているユーザー**に対して、準備ページをスキップしてトレーニングページへ直接遷移できる機能を提供しています。

**目的**:
- **2回目以降のトレーニングをスムーズに開始**: 初回の準備完了後、毎回準備ページを経由する必要がない
- **ユーザー体験の向上**: 総合評価ページから「次のステップ」ボタンで即座にトレーニング開始
- **効率的な学習フロー**: 繰り返しトレーニング時の手間を削減

#### スキップ可能な条件

以下の条件をすべて満たす場合、準備ページをスキップしてトレーニングページへ直接遷移できます：

1. **マイク許可取得済み**: `localStorage.micPermissionGranted === 'true'`
2. **音域データ登録済み**: `localStorage.voiceRangeData`が存在
3. **ページリロードではない**: 通常のSPA遷移（`performance.navigation.type !== 1`）
4. **ブラウザ権限が有効**: `navigator.permissions.query({name: 'microphone'})`が`granted`

#### スキップ可能な遷移元

| 遷移元ページ | スキップ対応 | 実装場所 |
|---|---|---|
| **ホームページ** | ✅ 対応 | router.js (line 722) |
| **総合評価ページ** | ✅ 対応 | results-overview-controller.js (12箇所) |
| **準備ページ** | N/A | 必ず経由（マイク許可取得） |
| **トレーニングページ** | N/A | 既にトレーニング中 |

#### 典型的なユーザーフロー

**初回トレーニング**:
```
ホーム → 準備ページ（マイク許可 + 音域テスト）
      → トレーニングページ → 総合評価
```

**2回目以降**:
```
総合評価 → 「次のステップ」ボタン
        → 準備ページスキップ ✨
        → トレーニングページ（直接開始）
```

または
```
ホーム → 「始める」ボタン
      → 準備ページスキップ ✨
      → トレーニングページ（直接開始）
```

### 3層防御アプローチによる安全性保証

#### 概要

準備ページスキップ機能は便利ですが、誤った判定をすると**トレーニングページでマイク許可ダイアログが再表示される**という問題が発生します。これを防ぐため、**3層防御アプローチ**による安全な準備スキップ判定システムを実装しています。

#### 発見された問題（v1.1.0で解決）

**発見された問題**（2025-11-19）:
- ホームページリロード後、`localStorage.micPermissionGranted=true`が残存
- 実際のMediaStreamはブラウザによって破棄済み
- 従来の`canSkipPreparation()`はlocalStorageのみをチェック
- 準備スキップ判定が誤ってtrueを返す
- トレーニングページで再度マイク許可ダイアログが表示される

### 3層防御アプローチ

**実装場所**: `/PitchPro-SPA/js/navigation-manager.js` (v4.3.4)

```javascript
static async canSkipPreparation() {
    // Layer 1: ページリロード検出（最も確実な防御）
    if (performance.navigation && performance.navigation.type === 1) {
        return false;
    }

    // Layer 2: localStorage確認（基本チェック）
    const micGranted = localStorage.getItem('micPermissionGranted') === 'true';
    const hasVoiceRange = !!localStorage.getItem('voiceRangeData');
    if (!micGranted || !hasVoiceRange) {
        return false;
    }

    // Layer 3: Permissions API（実際の権限状態確認）
    try {
        const permissionStatus = await navigator.permissions.query({ name: 'microphone' });
        if (permissionStatus.state !== 'granted') {
            return false;
        }
        return true;
    } catch (error) {
        return false; // 安全側にフォールバック
    }
}
```

### 3層防御の特性

#### Layer 1: ページリロード検出
- **API**: `performance.navigation.type === 1`
- **確実性**: リロード時は100%MediaStreamが破棄される
- **効率性**: 早期リターンで高速判定
- **影響範囲**: 最も一般的なケースを即座にブロック

#### Layer 2: localStorage確認
- **確認内容**: `micPermissionGranted` + `voiceRangeData`の存在
- **処理**: 同期的・軽量
- **役割**: 基本的なデータ存在チェック

#### Layer 3: Permissions API確認
- **確認内容**: ブラウザの実際の権限状態
- **処理**: 非同期（async/await）
- **フォールバック**: API未サポート時は準備ページへ誘導
- **信頼性**: 最も正確な権限状態を取得

### async/await対応の実装

**router.js** (line 699, 722):
```javascript
async setupHomeEvents() {  // async追加
    trainingButtons.forEach(button => {
        button.addEventListener('click', async (e) => {
            // ...
            const canSkip = await NavigationManager.canSkipPreparation();  // await追加
            // ...
        });
    });
}
```

**results-overview-controller.js** (12箇所):
```javascript
'next-step-random-practice': async () => {  // async追加
    if (window.NavigationManager) {
        const canSkip = await NavigationManager.canSkipPreparation();  // await追加
        // ...
    }
}
```

### テスト結果（全5ケース成功）

| # | テストケース | Layer検出 | 結果 |
|---|---|---|---|
| 1 | ホームリロード→準備経由 | Layer 1 | ✅ |
| 2 | 準備→トレーニング | N/A | ✅ |
| 3 | 総合評価→準備スキップ | 3層パス | ✅ |
| 4 | 総合評価リロード→準備経由 | Layer 1 | ✅ |
| 5 | 準備経由後のホーム→スキップ | 3層パス | ✅ |

### 設計の利点

1. **多層防御**: 単一の判定基準に依存しない
2. **早期リターン**: Layer 1で90%以上のケースを高速判定
3. **信頼性**: Permissions APIで実際の権限状態を確認
4. **フォールバック**: API未サポート時も安全に動作
5. **デバッグ容易性**: 各Layerで詳細ログ出力

### 詳細仕様

詳細な実装仕様、エッジケース処理、制限事項については以下のドキュメントを参照してください：

- `NAVIGATION_RELOAD_DETECTION_SPECIFICATION.md` (v2.2.0) - ナビゲーション・リロード検出仕様書

---

## 参考資料

### 関連ドキュメント
- `CLAUDE.md` - 開発ガイドライン・CSS設計
- `APP_SPECIFICATION.md` - アプリケーション仕様書
- `REQUIREMENTS_SPECIFICATION.md` - 要件定義書
- `TECHNICAL_SPECIFICATIONS.md` - 技術仕様書
- `NAVIGATION_RELOAD_DETECTION_SPECIFICATION.md` - ナビゲーション・リロード検出仕様書

### ファイルパス
- **index.html**: `/Users/isao/Documents/Relative-pitch-app/PitchPro-SPA/index.html`
- **router.js**: `/Users/isao/Documents/Relative-pitch-app/PitchPro-SPA/js/router.js`
- **navigation-manager.js**: `/Users/isao/Documents/Relative-pitch-app/PitchPro-SPA/js/navigation-manager.js`
- **mode-controller.js**: `/Users/isao/Documents/Relative-pitch-app/PitchPro-SPA/js/mode-controller.js`
- **pages/**: `/Users/isao/Documents/Relative-pitch-app/PitchPro-SPA/pages/`

---

## 更新履歴

### v1.2.0 (2025-11-29)
- **追加**: ヘッダー・フッター表示制御セクション
  - グローバルヘッダー表示対象ページを拡張（home, records, premium-analysis, settings, help）
  - ページ別表示状況一覧表
  - 設計思想の明文化
  - マイク管理との独立性を明記
- **更新**: 目次に新セクション追加

### v1.1.0 (2025-11-19)
- **追加**: トレーニングモード一覧セクション
  - 3モード完全解説（ランダム基音・連続チャレンジ・12音階）
  - モード間の主要な違い比較表
  - 将来の拡張計画（弱点練習モード追加予定）
- **追加**: ナビゲーション安全機構セクション
  - 準備ページスキップ機能の目的・UX改善効果
  - スキップ可能な条件（4項目）
  - スキップ可能な遷移元一覧表
  - 典型的なユーザーフロー（初回 vs 2回目以降）
  - 3層防御アプローチによる安全性保証
- **追加**: ModeController API仕様とモード間の違い比較表
- **追加**: 準備スキップ判定システムの詳細説明（3層防御）
- **追加**: async/await対応の実装詳細
- **追加**: テスト結果表（全5ケース成功）
- **更新**: 目次に新セクション追加
- **更新**: 参考資料にNAVIGATION_RELOAD_DETECTION_SPECIFICATION.md追加

### v1.0.0 (2025-10-29)
- 初版作成
- SPA構造とルーティングの基本仕様
- ファイル構成・スクリプト管理ルール
- ページ追加ガイドライン
- キャッシュバスター管理

---

**このドキュメントはプロジェクトの進行に応じて更新されます。**
