# V2開発プロセス - UIコンポーネント開発手順書

## 🎯 基本原則

### **CSS-centric設計**
- UIカタログを単一情報源（Single Source of Truth）とする
- 既存CSSクラスを最大限活用
- 推測でスタイル作成禁止

### **段階的確認プロセス**
1. **既存確認** → 2. **適切配置** → 3. **正しい構造** → 4. **クラス適用**

---

## 📋 必須確認プロセス（4ステップ）

### **Step 1: 既存確認**
```bash
# 必要なCSSクラスの存在確認
Grep [クラス名] /path/to/styles/
Grep [関連キーワード] /path/to/styles/
```

**確認対象:**
- `system.css` - 全ページ共通スタイル
- `base.css` - v2共通コンポーネント
- `results.css` - results専用スタイル

### **Step 2: 適切配置**
```
共通コンポーネント → base.css
ページ専用コンポーネント → 該当ページCSS
全体共通スタイル → system.css（既存活用）
```

### **Step 3: 正しい構造**
```html
<!-- UIカタログの構造を忠実に再現 -->
<section class="catalog-section">
  <h3>タイトル</h3>
  <div class="component-grid grid-cols-X">
    <div class="component-item text-center">
      <!-- コンポーネント内容 -->
    </div>
  </div>
  <div class="code-sample">
    <!-- 使用例コード -->
  </div>
</section>
```

### **Step 4: クラス適用**
```html
<!-- 適切なバリアントクラスを指定 -->
<div class="page-header-icon page-header-icon-purple">
  <i data-lucide="icon-name" style="width: Xpx; height: Xpx;"></i>
</div>
```

---

## 🏗️ ファイル役割分担

### **UIカタログ系**
- `ui-catalog.html` - 全ページ共通コンポーネント
- `ui-components-results.html` - results専用コンポーネント

### **CSS分割**
- ~~`system.css` - 全ページ共通スタイル（廃止）~~
- `base.css` - v2共通コンポーネント（全ページ読み込み）
- `results.css` - results専用スタイル（results系ページのみ読み込み）

### **🚨 CSS読み込みルール（絶対遵守）**
- **❌ 禁止**: `system.css`の読み込み（v2環境では使用禁止）
- **✅ 必須**: 各ページで適切なCSSファイルのみ読み込み

#### **ページ別CSS読み込みパターン**
```html
<!-- トップページ（index.html） -->
<link rel="stylesheet" href="../styles/base.css">

<!-- 統合評価ページ（results-overview.html） -->
<link rel="stylesheet" href="../styles/base.css">
<link rel="stylesheet" href="../styles/results.css">

<!-- UIカタログ（results系） -->
<link rel="stylesheet" href="../styles/base.css">
<link rel="stylesheet" href="../styles/results.css">
```

### **ページファイル**
- `index.html` - トップページ
- `results-overview.html` - 統合評価ページ

---

## ⚠️ 禁止事項

### **やってはいけないこと**
- ❌ 推測でCSS作成
- ❌ UIカタログ確認なしでコンポーネント作成
- ❌ 既存クラス検索なしでスタイル追加
- ❌ 要求を曖昧なまま作業開始
- ❌ 重複コンポーネント作成
- ❌ **system.cssの読み込み（v2環境では絶対禁止）**

### **必須確認ポイント**
```
新しいスタイル作成前 → 「base.css/results.cssに既存しませんか？」
ボタン作成前 → 「ui-catalogのボタンセクションを確認しましたか？」
レイアウト変更前 → 「他ページで同じパターンはありませんか？」
CSS読み込み前 → 「system.cssを使用していませんか？（v2では禁止）」
```

### **⚡ CSS読み込み確認フロー**
```
1. HTML編集時 → link要素確認
2. system.css発見 → 即座に適切なファイルに変更
3. 不足スタイル → system.cssから該当ファイルにコピー
4. 動作確認 → エラーがあれば追加移行
```

---

## 🔧 実際の作業例

### **例1: ページヘッダーアイコン修正**
```
1. 問題発見: ヘッダーアイコンにスタイルが当たらない
2. 既存確認: Grep page-header-icon → system.cssに存在確認
3. 構造確認: UIカタログで正しい構造確認
4. 修正実行: 適切なバリアントクラス追加
```

**修正前:**
```html
<i data-lucide="music" class="page-header-icon" style="width: 48px; height: 48px;"></i>
```

**修正後:**
```html
<div class="page-header-icon page-header-icon-green">
  <i data-lucide="music" style="width: 48px; height: 48px;"></i>
</div>
```

### **例2: 新しいコンポーネント追加**
```
1. UIカタログ確認: 既存コンポーネントの確認
2. CSS検索: 必要クラスの存在確認
3. 配置決定: 共通 or 専用の判断
4. 構造移植: UIカタログから忠実に移植
```

---

## 📝 TodoWrite活用

### **必須項目**
すべての作業でtodoリストに以下を含める：
- [ ] UIカタログでコンポーネント確認完了
- [ ] system.css共通スタイル確認完了
- [ ] 他ページとの一貫性確認完了

### **進捗管理**
- タスク開始時: `in_progress`に変更
- 完了時: 即座に`completed`に変更
- 新しい課題発見時: 新タスク追加

---

## 🎯 品質保証

### **コミット前チェック**
- [ ] 全ページでスタイル適用確認
- [ ] UIカタログとの一貫性確認
- [ ] レスポンシブ対応確認
- [ ] 重複コード排除確認

### **継続的改善**
- 各作業後にプロセス有効性確認
- 問題発生時はプロセス改善
- ドキュメント更新継続

---

**このプロセスを守ることで、一貫性のある高品質なUIコンポーネントを効率的に開発できます。**