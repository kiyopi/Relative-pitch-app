# 8va相対音感トレーニングアプリ

**科学的根拠に基づく相対音感トレーニングシステム**

## 🎯 プロジェクト概要

このアプリケーションは、音楽学習者やカラオケ愛好家向けの相対音感トレーニングシステムです。

- **ターゲット**: 音楽学習者（初級〜中級）、カラオケ愛好家
- **コア価値**: 歌唱力向上、音程精度改善、コミュニケーション能力向上
- **技術**: Vanilla JavaScript + Web Audio API + PitchPro音声処理ライブラリ

## 📁 プロジェクト構造

```
Relative-pitch-app/
├── PitchPro-SPA/          ★ メインアプリケーション（本番環境）
│   ├── index.html         ← エントリーポイント（SPAルーター）
│   ├── styles/
│   │   ├── base.css       ← 共通スタイル
│   │   ├── results.css    ← 結果表示スタイル
│   │   └── training.css   ← トレーニングスタイル
│   ├── js/
│   │   ├── router.js      ← SPAルーティングシステム
│   │   ├── controllers/
│   │   │   ├── preparationController.js  ← 準備画面
│   │   │   └── trainingController.js     ← トレーニング画面
│   │   └── ...
│   ├── pages/             ← HTMLテンプレート（SPA用フラグメント）
│   │   ├── home.html
│   │   ├── preparation.html
│   │   └── training.html
│   └── templates/         ← UIコンポーネント
│
├── UI-Catalog/            ★ UI開発リファレンス
│   ├── ui-catalog-index.html       ← カタログトップページ
│   ├── ui-catalog-essentials.html  ← 必須UIコンポーネント集
│   ├── ui-catalog-components.html  ← 詳細コンポーネント
│   ├── ui-catalog-results-*.html   ← 結果表示UI
│   ├── ui-catalog.css              ← カタログ表示専用CSS
│   └── ui-catalog.js               ← カタログ機能スクリプト
│
├── Bolt/                  ⚠️ 開発時デモページ（参照用・本番非使用）
│   └── v2/
│       └── pages/
│           └── index.html  ← 旧デモページ（使用禁止）
│
├── specifications/        📋 仕様書・設計ドキュメント
├── index.html             ← リダイレクト専用（PitchPro-SPA/index.htmlへ）
├── CLAUDE.md              ← 開発ガイドライン
└── README.md              ← このファイル
```

## 🚀 アプリケーションの起動

### 開発環境
```bash
# プロジェクトルートで開発サーバーを起動
npx http-server -p 8080

# ブラウザでアクセス
open http://localhost:8080
```

**重要**: ルート`index.html`は自動的に`PitchPro-SPA/index.html`にリダイレクトします。

### 直接アクセス
```
http://localhost:8080/PitchPro-SPA/index.html
```

## 📋 開発ワークフロー

### 1. 新機能開発時

**必ず以下の順序で確認してください:**

1. **UIカタログで既存コンポーネント確認**
   ```
   /UI-Catalog/ui-catalog-essentials.html
   ```
   → 既存のUIコンポーネントを最大限活用

2. **base.cssで共通スタイル確認**
   ```
   /PitchPro-SPA/styles/base.css
   ```
   → 重複スタイル作成を防止

3. **類似機能のコントローラー確認**
   ```
   /PitchPro-SPA/js/controllers/
   ```
   → 実装パターンの統一

### 2. スタイル実装

- ❌ **HTMLでのstyle属性使用禁止** (`<div style="...">`)
- ❌ **JavaScriptでのインラインCSS禁止** (`element.style.xxx = "..."`)
- ✅ **CSSクラスでスタイル定義** (base.css等)
- ✅ **JavaScriptではクラス追加/削除のみ** (`classList.add/remove`)

**例外が許可される場合:**
- Lucideアイコンのサイズ指定
- プログレスバーの動的width値
- 動的に計算される座標・サイズ

### 3. Git運用

```bash
# 作業ブランチ作成
git checkout -b feature/新機能名

# 開発作業...

# コミット
git add .
git commit -m "feat: 新機能実装"

# プッシュ
git push origin feature/新機能名
```

## 🎨 UIカタログの使い方

### UIカタログとは？

開発時の**UIリファレンス集**です。既存のUIコンポーネントを視覚的に確認できます。

### アクセス方法

```
http://localhost:8080/UI-Catalog/ui-catalog-index.html
```

### 主要カタログページ

| ページ | 用途 |
|--------|------|
| `ui-catalog-index.html` | 全カタログへのナビゲーション |
| `ui-catalog-essentials.html` | **最優先確認** - 基本UIコンポーネント集 |
| `ui-catalog-components.html` | 詳細コンポーネント・エフェクト |
| `ui-catalog-results-session.html` | セッション結果表示UI |
| `ui-catalog-results-overall.html` | 総合結果表示UI |

### 重要な原則

- **ui-catalog.css**: カタログ表示専用（実装には影響しない）
- **base.css**: 実際のアプリで使用する共通スタイル
- UIカタログで確認 → base.cssのクラスを使用 → 新規CSS作成は最小限

## 🛠 技術スタック

### フロントエンド
- **Vanilla JavaScript** - フレームワークなし
- **SPA (Single Page Application)** - ハッシュベースルーティング
- **CSS3** - レスポンシブデザイン、アニメーション

### 音声処理
- **Web Audio API** - ブラウザ標準音声処理
- **PitchPro v1.3.x** - 音程検出ライブラリ
- **Lucide Icons** - アイコンライブラリ

### データ管理
- **localStorage** - ブラウザローカルストレージ
- **JSON** - データ永続化形式

## 📱 トレーニングモード

### 1. ランダム基音モード（初級）
- **セッション数**: 8回
- **基音選択**: C3オクターブ内ランダム
- **目的**: 基本的な相対音感習得

### 2. 連続チャレンジモード（中級）
- **セッション数**: 8回
- **基音選択**: クロマチック12音からランダム
- **目的**: 多様な音程への適応力向上

### 3. 12音階モード（上級）
- **セッション数**: 12回
- **基音選択**: クロマチック12音を順次使用
- **目的**: 完全な相対音感習得、S級判定

## ⚠️ よくある間違い

### ❌ 間違い1: Boltフォルダのindex.htmlを編集
```
/Bolt/v2/pages/index.html  ← これは旧デモページです
```
**正**: `/PitchPro-SPA/index.html`を編集

### ❌ 間違い2: 新しいCSSクラスを作成
**正**: まず`ui-catalog-essentials.html`で既存コンポーネント確認

### ❌ 間違い3: インラインスタイル使用
```html
<div style="color: red;">NG</div>
```
**正**: CSSクラスで定義 → `<div class="text-red">OK</div>`

### ❌ 間違い4: UIカタログのスタイルを直接使用
```html
<link rel="stylesheet" href="../UI-Catalog/ui-catalog.css">
```
**正**: `base.css`のクラスを使用

## 📚 重要ドキュメント

- **CLAUDE.md**: 開発ガイドライン・作業方針
- **APP_SPECIFICATION.md**: アプリケーション仕様書
- **REQUIREMENTS_SPECIFICATION.md**: 要件定義書
- **TECHNICAL_SPECIFICATIONS.md**: 技術仕様書

## 🔗 リンク

- **リポジトリ**: https://github.com/kiyopi/Relative-pitch-app.git
- **作業ディレクトリ**: `/Users/isao/Documents/Relative-pitch-app`

## 🤝 貢献ガイドライン

1. **作業開始前**: UIカタログ・base.css・CLAUDE.mdを確認
2. **ブランチ運用**: feature/機能名 でブランチ作成
3. **コミット**: 作業完了時のみコミット（修正中は禁止）
4. **スタイル**: インライン記述禁止、CSSクラス使用

---

**© 2024 8va相対音感トレーニングアプリ v2**
