# ヘルプページ仕様書

**バージョン**: 1.0.0
**作成日**: 2025-11-21
**ステータス**: 設計完了・実装待ち
**対象ブランチ**: 新規ブランチ `feature/help-page` で実装

---

## 📋 目次

1. [概要](#概要)
2. [コンテンツ構成](#コンテンツ構成)
3. [技術仕様](#技術仕様)
4. [UIデザイン仕様](#uiデザイン仕様)
5. [スタイル定義](#スタイル定義)
6. [実装時の注意事項](#実装時の注意事項)
7. [実装チェックリスト](#実装チェックリスト)

---

## 概要

### 目的
ユーザーがアプリの使い方、トレーニングモード、評価システムを理解できるヘルプページを提供する。

### ページ情報

| 項目 | 値 |
|------|-----|
| **ルート** | `#help` |
| **テンプレート** | `pages/help.html` |
| **コントローラー** | `pages/js/help-controller.js` |
| **依存関係** | なし（静的コンテンツ） |
| **二重初期化防止** | 不要（ステートレス） |

---

## コンテンツ構成

### セクション一覧（7セクション）

| # | セクション名 | アイコン | 色 | 内容 |
|---|-------------|---------|-----|------|
| 1 | このアプリについて | `target` | `text-green-300` | 相対音感トレーニングの目的・効果 |
| 2 | 使い方の流れ | `list-ordered` | `text-blue-300` | 音域テスト→トレーニング→評価の4ステップ |
| 3 | トレーニングモード | `layers` | `text-orange-300` | 3モード（初級・中級・上級）の説明 |
| 4 | 評価システム | `award` | `text-yellow-300` | グレード（S/A/B/C/D）・セント説明 |
| 5 | 上行/下行モード | `move-up-right` | `text-cyan-300` | 発声方向の違いと効果 |
| 6 | よくある質問 | `message-circle-question` | `text-pink-300` | FAQ（アコーディオン形式・5問） |
| 7 | トラブルシューティング | `wrench` | `text-red-300` | マイク問題・音問題・測定精度 |

### FAQ質問リスト（5問）

| # | 質問 |
|---|------|
| 1 | どのくらい練習すれば効果が出ますか？ |
| 2 | 絶対音感がなくても大丈夫ですか？ |
| 3 | イヤホンは必要ですか？ |
| 4 | 評価が低いのはなぜ？ |
| 5 | データは保存されますか？ |

---

## 技術仕様

### router.js への追加

```javascript
// routes オブジェクトに追加
'help': 'pages/help.html'

// pageConfigs に追加
'help': {
    init: 'initHelpPage',
    dependencies: [],
    preventDoubleInit: false  // ステートレスなため不要
}
```

### index.html への追加

```html
<!-- ヘッダーナビゲーションに追加 -->
<button class="nav-button" onclick="location.hash='help'" title="ヘルプ">
    <i data-lucide="help-circle" class="icon-md"></i>
    <span class="nav-text">ヘルプ</span>
</button>

<!-- コントローラー読み込み -->
<script src="pages/js/help-controller.js?v=20251121001"></script>
```

### コントローラー構成

```javascript
/**
 * ヘルプページコントローラー
 * @version 1.0.0
 */

/**
 * ヘルプページ初期化関数
 */
function initHelpPage() {
    console.log('🎯 [help] ページ初期化開始');

    // 1. FAQアコーディオン初期化
    setupFaqAccordion();

    // 2. Lucideアイコン初期化
    if (typeof window.initializeLucideIcons === 'function') {
        window.initializeLucideIcons({ immediate: true });
    }

    console.log('✅ [help] ページ初期化完了');
}

/**
 * FAQアコーディオン設定
 */
function setupFaqAccordion() {
    const faqItems = document.querySelectorAll('.faq-question');

    faqItems.forEach(button => {
        button.addEventListener('click', () => {
            const faqId = button.getAttribute('data-faq');
            const answer = document.getElementById(`faq-answer-${faqId}`);
            const icon = button.querySelector('.faq-icon');

            // トグル処理
            const isOpen = answer.classList.contains('open');

            // 他のFAQを閉じる（オプション）
            // closeAllFaqs();

            // 現在のFAQを開閉
            answer.classList.toggle('open');
            icon.classList.toggle('rotated');
        });
    });
}

// グローバル公開
window.initHelpPage = initHelpPage;

console.log('✅ [help] コントローラー読み込み完了');
```

---

## UIデザイン仕様

### ページヘッダー

```html
<div class="page-header">
    <div class="page-header-content">
        <div class="page-header-icon-wrapper">
            <div class="page-header-icon gradient-catalog-purple">
                <i data-lucide="help-circle" class="text-white" data-stroke-width="2" style="width: 36px; height: 36px;"></i>
            </div>
        </div>
        <div class="page-header-text">
            <h1 class="page-title">ヘルプ</h1>
            <p class="page-subtitle text-purple-200">使い方ガイド・よくある質問</p>
        </div>
    </div>
</div>
```

### セクションカード構成

```html
<!-- 標準セクション -->
<section class="glass-card">
    <h4 class="heading-md">
        <i data-lucide="[icon-name]" class="text-[color]-300"></i>
        <span>[セクション名]</span>
    </h4>

    <div class="flex flex-col gap-3">
        <!-- コンテンツ -->
    </div>
</section>
```

### ステップ表示（使い方の流れ）

```html
<div class="flex items-start gap-3">
    <div class="help-step-number">1</div>
    <div class="flex flex-col gap-1">
        <h5 class="text-body font-semibold text-white">ステップタイトル</h5>
        <p class="text-sm text-white-70">説明文</p>
    </div>
</div>
```

### モードカード（トレーニングモード）

```html
<div class="help-mode-card">
    <div class="flex items-center gap-3 mb-2">
        <div class="help-mode-icon gradient-catalog-[color]">
            <i data-lucide="[icon]" class="text-white" style="width: 20px; height: 20px;"></i>
        </div>
        <div>
            <h5 class="text-body font-semibold text-white">モード名</h5>
            <span class="text-xs text-[color]-300">レベル • セッション数</span>
        </div>
    </div>
    <p class="text-sm text-white-70">説明文</p>
</div>
```

### グレードバッジ（評価システム）

```html
<div class="help-grade-item">
    <span class="help-grade-badge grade-s">S</span>
    <span class="text-sm text-white-80">プロレベル（誤差±10セント以内）</span>
</div>
```

### FAQアコーディオン

```html
<div class="faq-item">
    <button class="faq-question" data-faq="1">
        <span>質問文</span>
        <i data-lucide="chevron-down" class="faq-icon"></i>
    </button>
    <div class="faq-answer" id="faq-answer-1">
        <p class="text-sm text-white-70">回答文</p>
    </div>
</div>
```

---

## スタイル定義

### スタイルシート構成

プロジェクトのパターンに従い、**ヘルプページ専用CSSファイルを新規作成**します。

| ファイル | 役割 |
|---------|------|
| `styles/help.css` | **新規作成** - ヘルプページ専用スタイル |
| `styles/base.css` | 共通コンポーネント（変更なし） |

### 新規作成ファイル: `styles/help.css`

**⚠️ 実装前の確認事項**:
1. base.cssに類似スタイルが存在しないか確認
2. UIカタログに追加して動作確認
3. iPadでの表示テスト必須

### index.htmlへのCSS読み込み追加

```html
<!-- 既存のCSS読み込み -->
<link rel="stylesheet" href="styles/base.css?v=...">
<link rel="stylesheet" href="styles/results.css?v=...">
<link rel="stylesheet" href="styles/training.css?v=...">
<link rel="stylesheet" href="styles/voice-range.css?v=...">
<link rel="stylesheet" href="styles/records.css?v=...">
<link rel="stylesheet" href="styles/premium-analysis.css?v=...">
<!-- 新規追加 -->
<link rel="stylesheet" href="styles/help.css?v=20251121001">
```

### help.css 完全定義

```css
/* =================================================
   help.css - ヘルプページ専用スタイル
   バージョン: 1.0.0
   作成日: 2025-11-21
   ================================================= */

/* --- ステップ番号 --- */
.help-step-number {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    min-width: 28px;
    background: linear-gradient(135deg, var(--blue-400), var(--blue-600));
    border-radius: 50%;
    font-size: 0.875rem;
    font-weight: 600;
    color: white;
}

/* --- モードカード（glass-card内で使用） --- */
.help-mode-card {
    background: rgba(255, 255, 255, 0.05);
    /* backdrop-filter削除: 親.glass-cardと重複してiPadで白化するため */
    border-radius: var(--radius-lg);
    padding: var(--space-4);
}

/* --- モードアイコン --- */
.help-mode-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    min-width: 36px;
    border-radius: var(--radius-lg);
}

/* --- 方向アイコン --- */
.help-direction-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    min-width: 36px;
    border-radius: var(--radius-lg);
}

/* --- グレードリスト --- */
.help-grade-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
}

.help-grade-item {
    display: flex;
    align-items: center;
    gap: var(--space-3);
}

/* --- グレードバッジ --- */
.help-grade-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    min-width: 32px;
    border-radius: var(--radius-md);
    font-size: 1rem;
    font-weight: 700;
}

.help-grade-badge.grade-s {
    background: linear-gradient(135deg, #fbbf24, #f59e0b);
    color: #1f2937;
}

.help-grade-badge.grade-a {
    background: linear-gradient(135deg, #a3a3a3, #737373);
    color: white;
}

.help-grade-badge.grade-b {
    background: linear-gradient(135deg, #fb923c, #ea580c);
    color: white;
}

.help-grade-badge.grade-c {
    background: linear-gradient(135deg, #4ade80, #22c55e);
    color: #1f2937;
}

.help-grade-badge.grade-d {
    background: linear-gradient(135deg, #60a5fa, #3b82f6);
    color: white;
}

/* --- FAQアコーディオン --- */
.faq-accordion {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
}

.faq-item {
    background: rgba(255, 255, 255, 0.05);
    /* backdrop-filter削除: 親.glass-cardと重複してiPadで白化するため */
    border-radius: var(--radius-lg);
    overflow: hidden;
}

.faq-question {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    padding: var(--space-4);
    background: transparent;
    border: none;
    color: white;
    font-size: 0.9375rem;
    font-weight: 500;
    text-align: left;
    cursor: pointer;
    transition: background 0.2s ease;
}

.faq-question:hover {
    background: rgba(255, 255, 255, 0.05);
}

.faq-icon {
    width: 20px;
    height: 20px;
    flex-shrink: 0;
    transition: transform 0.3s ease;
}

.faq-icon.rotated {
    transform: rotate(180deg);
}

.faq-answer {
    max-height: 0;
    overflow: hidden;
    transition: max-height 0.3s ease, padding 0.3s ease;
}

.faq-answer.open {
    max-height: 500px;
    padding: 0 var(--space-4) var(--space-4);
}

/* --- トラブルシューティング --- */
.help-trouble-item {
    background: rgba(255, 255, 255, 0.03);
    /* backdrop-filter削除: 親.glass-cardと重複してiPadで白化するため */
    border-radius: var(--radius-lg);
    padding: var(--space-4);
}

.help-trouble-list {
    list-style: none;
    padding: 0;
    margin: 0;
}

.help-trouble-list li {
    position: relative;
    padding-left: var(--space-4);
    margin-bottom: var(--space-2);
    color: var(--white-70);
    font-size: 0.875rem;
}

.help-trouble-list li::before {
    content: "•";
    position: absolute;
    left: 0;
    color: var(--white-40);
}

.help-trouble-list li:last-child {
    margin-bottom: 0;
}
```

---

## 実装時の注意事項

### 🚨 最重要事項

1. **インラインスタイル禁止**
   - JSでのインラインCSS記述を避ける
   - `element.style.xxx = "..."` は使用しない
   - CSSクラスで制御する

2. **重複スタイル確認**
   - base.cssに類似スタイルがないか必ず確認
   - 既存クラスを最大限活用

3. **iPad白化問題**
   - `glass-card`内の子要素には`backdrop-filter`を設定しない
   - コメントで理由を明記する
   ```css
   /* backdrop-filter削除: 親.glass-cardと重複してiPadで白化するため */
   ```

4. **アイコン初期化**
   - 必ず`window.initializeLucideIcons({ immediate: true })`を使用
   - 直接`lucide.createIcons()`は呼ばない

5. **アイコンバージョン互換性**
   - 本番環境はLucide v0.263.0固定
   - UIカタログで使用したアイコン名が異なる場合は変換が必要
   - 例: `triangle-alert` → `alert-triangle`

### ブランチ戦略

```bash
# 新規ブランチ作成
git checkout -b feature/help-page

# 実装完了後
git add .
git commit -m "feat(help): ヘルプページ実装"
git push origin feature/help-page

# PRを作成してfeature/modular-spa-architectureにマージ
```

---

## 実装チェックリスト

### 事前確認
- [ ] UIカタログで既存コンポーネント確認完了
- [ ] base.cssで重複スタイル確認完了
- [ ] Lucideアイコン名のバージョン互換性確認完了

### ファイル作成
- [ ] `styles/help.css` ヘルプページ専用スタイルシート作成
- [ ] `pages/help.html` テンプレート作成
- [ ] `pages/js/help-controller.js` コントローラー作成

### 設定追加
- [ ] router.js: routesに`'help': 'pages/help.html'`追加
- [ ] router.js: pageConfigsにhelp設定追加
- [ ] index.html: help.css読み込み追加
- [ ] index.html: ナビゲーションボタン追加
- [ ] index.html: コントローラー読み込み追加

### 動作確認
- [ ] PC（Chrome）で全セクション表示確認
- [ ] PC（Safari）で表示確認
- [ ] iPad（Safari）でglass-card白化問題なし確認
- [ ] iPhone（Safari）でレスポンシブ確認
- [ ] FAQアコーディオン開閉動作確認
- [ ] Lucideアイコン表示確認
- [ ] 他ページへの遷移・戻り動作確認
- [ ] コンソールエラーなし確認

### ドキュメント更新
- [ ] MODULE_ARCHITECTURE.md更新（必要に応じて）
- [ ] SPA_ARCHITECTURE_SPECIFICATION.md更新（routes追加）

---

## 参考資料

### 関連ドキュメント
- `SPA_ARCHITECTURE_SPECIFICATION.md` - SPAアーキテクチャ仕様
- `ROUTER_PAGE_INITIALIZATION_GUIDE.md` - Router統一初期化ガイド
- `UI-Catalog/ui-catalog-essentials.html` - UIカタログ

### 参考ページ
- `pages/settings.html` - 類似構成のページ
- `pages/records.html` - glass-card使用例

---

**このドキュメントは実装時に参照してください。**
