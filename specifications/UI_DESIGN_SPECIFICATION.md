# UI設計仕様書

**バージョン**: 1.0.0
**最終更新**: 2025年1月24日
**対象アプリ**: 8va相対音感トレーニングアプリ

---

## 📋 目次

1. [Lucideアイコンシステム](#lucideアイコンシステム)
2. [UIコンポーネント](#uiコンポーネント)
3. [レイアウトシステム](#レイアウトシステム)
4. [カラーシステム](#カラーシステム)
5. [CSS設計思想](#css設計思想)
6. [UIカタログ活用方法](#uiカタログ活用方法)

---

## Lucideアイコンシステム

### 基本情報

- **ライブラリ**: Lucide Icons v0.263.1（安定版）
- **CDN**: `https://unpkg.com/lucide@0.263.1/dist/umd/lucide.js`
- **初期化モジュール**: `/js/lucide-init.js`

### グローバル初期化関数

すべてのLucideアイコン初期化は**統一されたグローバル関数**を使用します。

#### 関数仕様

```javascript
/**
 * Lucideアイコンを初期化するグローバル関数
 * @param {Object} options - オプション設定
 * @param {boolean} options.immediate - 即座に実行（デフォルト: false）
 * @param {boolean} options.debug - デバッグログ出力（デフォルト: false）
 * @returns {boolean} 初期化成功/失敗
 */
window.initializeLucideIcons(options = {})
```

#### 使用パターン

| 用途 | コード | 説明 |
|------|--------|------|
| **ページ読み込み・遷移** | `window.initializeLucideIcons()` | requestAnimationFrame×2で待機後に実行 |
| **メニュー切り替え** | `window.initializeLucideIcons({ immediate: true })` | 即座に実行（待機なし） |
| **デバッグ** | `window.initializeLucideIcons({ debug: true })` | 詳細ログ出力 |

#### 実装箇所

| ファイル | 実装内容 | 呼び出しタイミング |
|----------|----------|-------------------|
| `lucide-init.js` | グローバル関数定義 | DOMContentLoaded時に自動実行 |
| `router.js` | ページ遷移時の初期化 | HTMLテンプレート読み込み後 |
| `index.html` | メニューアイコン切り替え | ハンバーガーメニュークリック時 |

### アイコンサイズクラス

| クラス | サイズ | 用途 |
|--------|--------|------|
| `.icon-xs` | 12px × 12px | リストアイテム内の小アイコン |
| `.icon-sm` | 16px × 16px | 通常テキスト横の小アイコン |
| `.icon-md` | 24px × 24px | 標準アイコン（最も一般的） |
| `.icon-lg` | 32px × 32px | 大アイコン（統計カード等） |
| `.icon-xl` | 40px × 40px | 特大アイコン |
| `.icon-2xl` | 48px × 48px | 超特大アイコン |
| `.icon-3xl` | 64px × 64px | 最大サイズアイコン |

### アイコンカラークラス

| クラス | カラー | 用途 |
|--------|--------|------|
| `.text-white` | #ffffff | 通常の白アイコン |
| `.text-green-300` | #86efac | 成功・正解・チェックマーク |
| `.text-blue-300` | #93c5fd | 情報・統計・グラフ |
| `.text-yellow-300` | #fde047 | 注目・スター・ハイライト |
| `.text-purple-200` | #ddd6fe | 特殊機能・アクセント |

### 使用例

#### 基本的なアイコン表示
```html
<i data-lucide="music" class="icon-lg text-green-300"></i>
```

#### 見出しとアイコンの組み合わせ
```html
<h4 class="heading-md">
    <i data-lucide="bar-chart-3" class="text-blue-300"></i>
    <span>評価分布</span>
</h4>
```

#### リストアイテム内のアイコン
```html
<li>
    <i data-lucide="check" class="icon-xs text-green-300"></i>
    基本的な相対音感
</li>
```

#### ボタン内のアイコン（インラインスタイル許可）
```html
<button class="btn btn-primary">
    <span>始める</span>
    <i data-lucide="music" style="width: 24px; height: 24px;"></i>
</button>
```

### 重要な注意事項

#### ✅ 推奨される使い方
- アイコンサイズは`.icon-*`クラスで指定
- 色は`.text-*`クラスで指定
- `window.initializeLucideIcons()`で統一初期化

#### ❌ 避けるべき使い方
- `lucide.createIcons()`を直接呼び出さない（統一関数を使用）
- インラインスタイルでサイズ指定しない（`.icon-*`クラス使用）
- 絵文字を使用しない（必ずLucideアイコンを使用）

---

## UIコンポーネント

### Glass Card（グラスカード）

背景が透明で、磨りガラス効果のあるカードコンポーネント。

#### クラス一覧

| クラス | 用途 |
|--------|------|
| `.glass-card` | 標準サイズのグラスカード |
| `.glass-card-sm` | 小サイズ（統計カード等） |

#### CSS仕様
```css
.glass-card {
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 1rem;
  padding: 1.5rem;
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
}
```

#### 使用例
```html
<div class="glass-card">
    <h4 class="heading-md">
        <i data-lucide="bar-chart-3" class="text-blue-300"></i>
        <span>評価分布</span>
    </h4>
    <!-- カードコンテンツ -->
</div>
```

### プログレスバー

#### 基本構造
```html
<div class="progress-bar [modifier]">
    <div class="progress-fill-[type] [color-class]" style="width: 75%;"></div>
</div>
```

#### モディファイアクラス

| クラス | 説明 |
|--------|------|
| `.progress-bar` | 基本プログレスバー |
| `.progress-bar.flex` | フレックスレイアウト内で使用 |
| `.progress-bar.with-margin` | 下マージン付き |

#### 内側バーの種類

| クラス | 用途 |
|--------|------|
| `.progress-fill` | グラデーション用（進行バー） |
| `.progress-fill-custom` | カスタム色用（評価分布バー） |

#### グラデーションカラー（進行バー用）

| クラス | 用途 |
|--------|------|
| `.gradient-catalog-blue` | セッション進行バー |
| `.gradient-catalog-green` | 基本プログレスバー |
| `.gradient-catalog-purple` | 特殊プログレスバー |
| `.gradient-catalog-orange` | 警告プログレスバー |
| `.gradient-catalog-red` | エラープログレスバー |

#### 評価カラー（評価分布バー用）

| クラス | カラー | 用途 |
|--------|--------|------|
| `.color-eval-gold` | 金色 | Excellent評価 |
| `.color-eval-good` | 緑色 | Good評価 |
| `.color-eval-pass` | 青色 | Pass評価 |
| `.color-eval-practice` | 赤色 | Practice評価 |

#### 使用例

##### セッション進行バー
```html
<div class="progress-bar with-margin">
    <div class="progress-fill gradient-catalog-blue" style="width: 25%;"></div>
</div>
<div>セッション 2 / 8</div>
```

##### 評価分布バー
```html
<div class="flex items-center gap-3">
    <i data-lucide="trophy" class="text-yellow-300" style="width: 20px; height: 20px;"></i>
    <div class="progress-bar flex">
        <div class="progress-fill-custom color-eval-gold" style="width: 37.5%;"></div>
    </div>
    <span class="text-sm text-white-60" style="min-width: 20px; text-align: right;">3</span>
</div>
```

### ボタン

#### クラス一覧

| クラス | 説明 |
|--------|------|
| `.btn` | ボタン基本クラス（必須） |
| `.btn-primary` | プライマリボタン（青背景） |
| `.btn-secondary` | セカンダリボタン（グレー背景） |
| `.btn-success` | 成功ボタン（緑背景） |
| `.btn-warning` | 警告ボタン（オレンジ背景） |
| `.btn-danger` | 危険ボタン（赤背景） |

#### 使用例
```html
<button class="btn btn-primary">
    <span>始める</span>
    <i data-lucide="music" style="width: 24px; height: 24px;"></i>
</button>
```

### バッジ

#### クラス一覧

| クラス | 用途 |
|--------|------|
| `.difficulty-badge.beginner` | 初級バッジ（緑） |
| `.difficulty-badge.intermediate` | 中級バッジ（青） |
| `.difficulty-badge.advanced` | 上級バッジ（紫） |
| `.difficulty-badge.coming-soon` | 次期版バッジ（グレー） |

#### 使用例
```html
<span class="difficulty-badge beginner">初級</span>
```

### 見出しクラス

#### クラス一覧

| クラス | アイコンサイズ | フォントサイズ | 用途 |
|--------|---------------|---------------|------|
| `.heading-sm` | 20px | 1rem | 小見出し |
| `.heading-md` | 24px | 1.25rem | 中見出し |
| `.heading-lg` | 28px | 1.5rem | 大見出し |

#### CSS仕様
```css
.heading-md {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 1.25rem;
  font-weight: 600;
  margin-bottom: 1rem;
}

.heading-md i {
  width: 24px;
  height: 24px;
  flex-shrink: 0;
}
```

#### 使用例
```html
<h4 class="heading-md">
    <i data-lucide="bar-chart-3" class="text-blue-300"></i>
    <span>評価分布</span>
</h4>
```

#### ⚠️ 重要な注意事項
- `.heading-*`クラスには既に`.flex .items-center .gap-3`が含まれているため、**追加で指定しない**
- アイコンサイズも自動設定されるため、`.icon-*`クラスは**不要**

---

## レイアウトシステム

### Flexboxクラス

| クラス | CSS | 用途 |
|--------|-----|------|
| `.flex` | `display: flex` | フレックスコンテナ |
| `.flex-col` | `flex-direction: column` | 縦方向配置 |
| `.items-center` | `align-items: center` | 垂直中央揃え |
| `.justify-center` | `justify-content: center` | 水平中央揃え |
| `.justify-between` | `justify-content: space-between` | 両端揃え |
| `.flex-1` | `flex: 1` | 伸縮可能 |
| `.w-full` | `width: 100%` | 幅100% |

### Gridクラス

| クラス | CSS | 用途 |
|--------|-----|------|
| `.grid` | `display: grid` | グリッドコンテナ |
| `.grid-cols-1` | `grid-template-columns: 1fr` | 1列グリッド |
| `.grid-cols-2` | `grid-template-columns: repeat(2, 1fr)` | 2列グリッド |
| `.grid-cols-3` | `grid-template-columns: repeat(3, 1fr)` | 3列グリッド |
| `.grid-cols-4` | `grid-template-columns: repeat(4, 1fr)` | 4列グリッド |

#### レスポンシブ対応

| クラス | 適用条件 | CSS |
|--------|----------|-----|
| `.md:grid-cols-3` | 768px以上 | 3列グリッド |
| `.md:grid-cols-4` | 768px以上 | 4列グリッド |
| `.md:grid-cols-6` | 768px以上 | 6列グリッド |

### Gap/Spaceクラス

#### Gap（Flexbox/Grid用）

| クラス | サイズ | 用途 |
|--------|--------|------|
| `.gap-1` | 0.25rem (4px) | 最小ギャップ |
| `.gap-2` | 0.5rem (8px) | 小ギャップ |
| `.gap-3` | 0.75rem (12px) | 標準ギャップ |
| `.gap-4` | 1rem (16px) | 中ギャップ |
| `.gap-6` | 1.5rem (24px) | 大ギャップ |
| `.gap-8` | 2rem (32px) | 特大ギャップ |

#### Space（縦方向マージン）

| クラス | 効果 |
|--------|------|
| `.space-y-2` | 子要素間に8pxマージン |
| `.space-y-3` | 子要素間に12pxマージン |
| `.space-y-4` | 子要素間に16pxマージン |

### マージンクラス

| クラス | CSS | 用途 |
|--------|-----|------|
| `.m-0` | `margin: 0` | マージンなし |
| `.mb-0` | `margin-bottom: 0` | 下マージンなし |
| `.mb-4` | `margin-bottom: 1rem` | 下マージン16px |
| `.mb-6` | `margin-bottom: 1.5rem` | 下マージン24px |
| `.mb-8` | `margin-bottom: 2rem` | 下マージン32px |

### レイアウト組み合わせ例

#### 水平中央揃え + ギャップ
```html
<div class="flex items-center gap-3">
    <i data-lucide="music" class="icon-md text-blue-300"></i>
    <span>トレーニング開始</span>
</div>
```

#### 垂直配置 + スペース
```html
<div class="flex flex-col space-y-4">
    <div>項目1</div>
    <div>項目2</div>
    <div>項目3</div>
</div>
```

---

## カラーシステム

### テキストカラー

#### 基本カラー

| クラス | カラー | 用途 |
|--------|--------|------|
| `.text-white` | #ffffff | 通常テキスト |
| `.text-white-90` | rgba(255, 255, 255, 0.9) | 90%透明度 |
| `.text-white-80` | rgba(255, 255, 255, 0.8) | 80%透明度 |
| `.text-white-70` | rgba(255, 255, 255, 0.7) | 70%透明度 |
| `.text-white-60` | rgba(255, 255, 255, 0.6) | 60%透明度（補足テキスト） |

#### アクセントカラー

| クラス | カラー | 用途 |
|--------|--------|------|
| `.text-purple-200` | #ddd6fe | 紫アクセント |
| `.text-yellow-300` | #fde047 | 黄色（注目要素） |
| `.text-green-300` | #86efac | 緑（成功・正解） |
| `.text-blue-300` | #93c5fd | 青（情報・統計） |
| `.text-green-200` | 薄緑 | 補足テキスト |

### フォントサイズ

| クラス | サイズ | 用途 |
|--------|--------|------|
| `.text-xs` | 0.75rem | 極小テキスト |
| `.text-sm` | 0.875rem | 小テキスト |
| `.text-lg` | 1.125rem | 大テキスト |
| `.text-xl` | 1.25rem | 特大テキスト |
| `.text-2xl` | 1.5rem | 見出し |
| `.text-4xl` | 2.25rem | メイン見出し |

### フォントウェイト

| クラス | ウェイト | 用途 |
|--------|----------|------|
| `.font-medium` | 500 | 中太字 |
| `.font-semibold` | 600 | セミボールド |
| `.font-bold` | 700 | 太字 |

### CSS変数

#### カラー変数

```css
:root {
  /* ガラスモーフィズム */
  --glass-bg: rgba(255, 255, 255, 0.08);
  --glass-border: rgba(255, 255, 255, 0.15);
  --glass-hover: rgba(255, 255, 255, 0.12);

  /* 基本カラー */
  --color-primary: #3b82f6;
  --color-success: #10b981;
  --color-warning: #f59e0b;
  --color-error: #ef4444;

  /* テキストカラー */
  --text-white: #ffffff;
  --text-white-90: rgba(255, 255, 255, 0.9);
  --text-white-80: rgba(255, 255, 255, 0.8);
  --text-white-70: rgba(255, 255, 255, 0.7);
  --text-white-60: rgba(255, 255, 255, 0.6);

  /* 背景カラー */
  --bg-primary: #0f172a;
  --bg-secondary: #1e293b;
  --bg-accent: #581c87;
}
```

#### スペース変数

```css
:root {
  --space-1: 0.25rem;   /* 4px */
  --space-2: 0.5rem;    /* 8px */
  --space-3: 0.75rem;   /* 12px */
  --space-4: 1rem;      /* 16px */
  --space-5: 1.25rem;   /* 20px */
  --space-6: 1.5rem;    /* 24px */
  --space-8: 2rem;      /* 32px */
  --space-10: 2.5rem;   /* 40px */
  --space-12: 3rem;     /* 48px */
}
```

#### ボーダー半径変数

```css
:root {
  --radius-sm: 0.125rem;    /* 2px */
  --radius-md: 0.375rem;    /* 6px */
  --radius-lg: 0.5rem;      /* 8px */
  --radius-xl: 0.75rem;     /* 12px */
  --radius-2xl: 1rem;       /* 16px */
  --radius-3xl: 1.5rem;     /* 24px */
}
```

---

## CSS設計思想

### CSS階層構造

```
base.css (アプリ基本スタイル)
├── CSS変数定義
├── リセットCSS
├── 共通ユーティリティクラス
├── Lucideアイコンサイズクラス
├── レイアウトクラス（Flexbox, Grid）
├── UIコンポーネント（Glass Card, Button, Badge等）
└── ページ固有スタイル（Header, Footer等）

results.css (結果表示専用)
├── 結果表示に特化したスタイル
└── 評価分布バー、グラフ等

training.css (トレーニング専用)
├── トレーニングに特化したスタイル
└── 音域テスト、マイクテスト等

[機能名]-test.css (テストページ専用)
└── テスト機能に特化したスタイル（本番環境から完全分離）
```

### インライン記述禁止原則

#### ❌ 禁止事項

```html
<!-- HTMLでのstyle属性使用禁止 -->
<div style="display: flex; gap: 12px;">...</div>

<!-- JavaScriptでのインラインCSS禁止 -->
<script>
  element.style.display = 'flex';
  element.style.gap = '12px';
</script>

<!-- HTMLファイル内<style>タグ禁止 -->
<style>
  .my-class { color: red; }
</style>
```

#### ✅ 正しいアプローチ

```html
<!-- CSSクラスでスタイル定義 -->
<div class="flex gap-3">...</div>

<!-- JavaScriptではクラス追加/削除のみ -->
<script>
  element.classList.add('active');
  element.classList.remove('hidden');
</script>
```

#### 例外が許可される場合

| 用途 | 例 | 理由 |
|------|-----|------|
| **Lucideアイコンサイズ** | `style="width: 24px; height: 24px;"` | ボタン内での特殊サイズ指定 |
| **プログレスバー幅** | `style="width: 75%;"` | 動的に計算される値 |
| **レイアウト固定値** | `style="flex-shrink: 0; min-width: 20px;"` | 特定要素の調整 |

### テスト専用CSS分離ルール

#### 基本方針
- **完全分離**: すべてのテストページは専用CSSファイルで管理
- **命名規則**: `[機能名]-test.css`（例：`voice-range-test.css`）
- **配置場所**: テストページと同じディレクトリ構造内
- **本番環境保護**: 本番用CSSにテスト専用スタイルの混入を禁止

#### 実装例
```html
<!-- テストページのCSS読み込み順序 -->
<link rel="stylesheet" href="../../Bolt/v2/styles/base.css">
<link rel="stylesheet" href="../../Bolt/v2/styles/results.css">
<link rel="stylesheet" href="css/voice-range-test.css"> <!-- 専用CSS -->
```

---

## UIカタログ活用方法

### UIカタログとは

**場所**: `/UI-Catalog/ui-catalog-essentials.html`

UIカタログは、アプリで使用可能なすべてのUIコンポーネントを視覚的に確認できるリファレンスページです。

### 作業開始前の必須チェック

#### チェック順序

1. **UIカタログ確認**: `Read ui-catalog-essentials.html`で既存コンポーネント確認（最優先）
2. **共通スタイル確認**: `Grep base.css [関連キーワード]`で既存スタイル検索
3. **類似実装確認**: 類似機能のページを`Read`して実装パターン確認

#### 新規スタイル作成前の確認

```
新しいスタイル作成前 → 「UIカタログに既存しませんか？」
ボタン作成前 → 「ui-catalog-essentials.htmlのボタンセクションを確認しましたか？」
レイアウト変更前 → 「UIカタログで同じパターンはありませんか？」
```

### UIカタログの構成

| セクション | 内容 |
|-----------|------|
| **Glass Cards** | グラスカード各種 |
| **Buttons** | ボタンスタイル各種 |
| **Progress Bars** | プログレスバー各種 |
| **Badges** | バッジ各種 |
| **Typography** | 見出し・テキストスタイル |
| **Icons** | Lucideアイコン使用例 |
| **Layouts** | レイアウトパターン |

### 無駄作業防止チェック

#### 作業開始前の厳格確認

1. **既存スタイル存在確認**
   ```bash
   Grep base.css [作成予定のクラス名]
   ```
   - 結果: 既存 → そのまま使用（新規作成禁止）
   - 結果: なし → 新規作成可能

2. **修正対象の明確化**
   - UIカタログ表示部分: ui-catalog.css管理、修正不要
   - UIカタログ実装例: `<div class="code-sample">`内、修正必要
   - 実際のページ: 本番実装、修正必要

3. **作業実行前の最終確認**
   - 「この修正は本当に必要ですか？」
   - 「既存のスタイルで対応できませんか？」
   - 「修正対象を正しく特定していますか？」

---

## ベストプラクティス

### Lucideアイコン

✅ **推奨**
- `window.initializeLucideIcons()`で統一初期化
- `.icon-*`クラスでサイズ指定
- `.text-*`クラスで色指定

❌ **非推奨**
- `lucide.createIcons()`の直接呼び出し
- インラインスタイルでのサイズ指定
- 絵文字の使用

### UIコンポーネント

✅ **推奨**
- UIカタログで既存コンポーネントを確認
- 既存クラスの組み合わせで実装
- レスポンシブ対応を考慮

❌ **非推奨**
- 既存確認なしでの新規CSS作成
- インラインスタイルの多用
- コンポーネントの重複実装

### レイアウト

✅ **推奨**
- Flexbox/Gridクラスの活用
- Gap/Spaceクラスで適切な間隔
- CSS変数の使用

❌ **非推奨**
- インラインスタイルでのレイアウト
- ハードコードされた数値
- 複雑なネスト構造

---

## トラブルシューティング

### Lucideアイコンが表示されない

#### 確認項目

1. **CDN読み込み確認**
   ```
   ブラウザコンソール: lucide オブジェクトが存在するか確認
   ```

2. **初期化ログ確認**
   ```
   🔍 [LUCIDE] DOMContentLoaded fired - initializing icons...
   ✅ [LUCIDE] Icons initialized successfully - Created 25 SVG elements
   ```

3. **data-lucide属性確認**
   ```html
   <!-- 正しい -->
   <i data-lucide="music" class="icon-lg text-green-300"></i>

   <!-- 間違い -->
   <i class="lucide-music icon-lg text-green-300"></i>
   ```

4. **SVG要素生成確認**
   ```
   ブラウザ検証ツール: <i>タグ内に<svg>が生成されているか確認
   ```

### プログレスバーが正しく表示されない

#### 確認項目

1. **基本構造確認**
   ```html
   <div class="progress-bar">
       <div class="progress-fill gradient-catalog-green" style="width: 75%;"></div>
   </div>
   ```

2. **widthスタイル指定確認**
   - インラインスタイルで`width: XX%;`が設定されているか

3. **色クラス指定確認**
   - グラデーション: `.gradient-catalog-*`
   - 評価カラー: `.color-eval-*`

### レイアウトが崩れる

#### 確認項目

1. **既存クラスの重複確認**
   ```html
   <!-- 間違い: .heading-mdに既にflexが含まれている -->
   <h4 class="heading-md flex items-center gap-3">

   <!-- 正しい -->
   <h4 class="heading-md">
   ```

2. **インラインスタイルの混在確認**
   - インラインスタイルとCSSクラスが競合していないか

3. **レスポンシブ対応確認**
   - モバイル/PC両方で表示確認

---

## 参考リンク

- **Lucide Icons公式**: https://lucide.dev/
- **UIカタログ**: `/UI-Catalog/ui-catalog-essentials.html`
- **base.css**: `/PitchPro-SPA/styles/base.css`
- **CLAUDE.md**: `/CLAUDE.md`（開発ガイドライン）

---

**変更履歴**

| バージョン | 日付 | 変更内容 |
|-----------|------|----------|
| 1.0.0 | 2025-01-24 | 初版作成 |
