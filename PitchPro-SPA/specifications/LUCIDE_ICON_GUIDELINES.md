# Lucideアイコン実装ガイドライン

## 📅 作成日: 2025-08-23
## ⚠️ 重要度: 最高

---

## 🔴 Lucideアイコンの特殊事情

### 問題の概要
Lucideアイコンは、CSSクラスでのサイズ指定が正しく適用されないケースが多数存在する。試行錯誤の結果、**インラインスタイルでのサイズ指定が唯一の確実な方法**と判明。

### 重要な原則
> **UIカタログに記載されているLucideアイコンの実装は、すべて検証済み**
> 
> UIカタログの実装方法を厳密に守ることが、表示問題を回避する唯一の方法

---

## 🚨 バージョン管理とSafari互換性（2025-10-24追加）

### 重大な問題: Safari互換性エラーとアイコン名非互換性

#### 問題1: Safari互換性エラー

**症状**:
```
TypeError: Right side of assignment cannot be destructured
```

**原因**:
- Lucide **@latest版**（最新版）はSafariのstrict modeで動作不安定
- SafariはJavaScriptモジュールを常にstrict modeで評価
- strict modeでは`this`がグローバルオブジェクトに変換されず、UMD形式で問題発生

**解決策**:
```html
<!-- ❌ Safari互換性問題あり -->
<script src="https://cdn.jsdelivr.net/npm/lucide@latest/dist/umd/lucide.min.js"></script>

<!-- ✅ Safari完全対応 -->
<script src="https://unpkg.com/lucide@0.263.0/dist/umd/lucide.js"></script>
```

#### 問題2: アイコン名の非互換性

**原因**:
- 新バージョン（v0.400以降）で追加されたアイコン名はv0.263.0に存在しない
- UIカタログは最新版を使用しているため、アイコン名の変換が必須

**アイコン名対応表**:

| UIカタログ（最新版） | 本番環境（v0.263.0） | 用途 |
|---|---|---|
| `triangle-alert` | `alert-triangle` | 警告・エラー表示 |
| `circle-check-big` | `check-circle` | 成功・完了表示 |
| `file-chart-column-increasing` | `bar-chart-2` | 統計・グラフ表示 |
| `grid-3x3` | `grid` | グリッド・一覧表示 |

### バージョン固定の必須ルール

**本番環境（PitchPro-SPA）**:
```html
<!-- ✅ 必ずこのバージョンを使用 -->
<script src="https://unpkg.com/lucide@0.263.0/dist/umd/lucide.js"></script>
```

**UIカタログ**:
```html
<!-- UIカタログのみ最新版使用可能 -->
<script src="https://cdn.jsdelivr.net/npm/lucide@latest/dist/umd/lucide.min.js"></script>
```

### 実装時の必須手順

#### STEP 1: UIカタログでデザイン確認
```bash
# UIカタログで視覚的なデザインを確認
Read /UI-Catalog/ui-catalog-essentials.html
```

#### STEP 2: アイコン名の変換チェック
```bash
# UIカタログからコピーしたHTMLのアイコン名をチェック
Grep "data-lucide=" [ファイル名]

# 非互換アイコンを検索
Grep "triangle-alert|circle-check-big|file-chart-column-increasing|grid-3x3" [ファイル名]
```

#### STEP 3: 一括置換実行
```bash
sed -i '' \
  -e 's/file-chart-column-increasing/bar-chart-2/g' \
  -e 's/triangle-alert/alert-triangle/g' \
  -e 's/grid-3x3/grid/g' \
  -e 's/circle-check-big/check-circle/g' \
  [ファイル名]
```

#### STEP 4: 動作確認
```bash
# コンソールで警告がないか確認
# "[Warning] icon name was not found" が出たら修正漏れ
```

### よくあるエラーと対処法

#### エラー1: アイコンが表示されない
```
[Warning] <i data-lucide="triangle-alert"></i> icon name was not found
```
**対処**: `triangle-alert` → `alert-triangle` に変更

#### エラー2: Safari互換性エラー
```
TypeError: Right side of assignment cannot be destructured
```
**対処**: Lucideバージョンを`@latest` → `@0.263.0`に変更

#### エラー3: アイコンの一部のみ表示される
- **原因**: 新旧アイコン名が混在している
- **対処**: 全ファイルで非互換アイコンを検索して置換

### 禁止事項

- ❌ **本番環境で`@latest`使用禁止** - Safari互換性問題発生
- ❌ **UIカタログのアイコン名をそのまま使用禁止** - バージョン非互換
- ❌ **アイコン名変換の確認を省略禁止** - 実装後に警告大量発生

### 推奨事項

- ✅ **UIカタログ確認時にアイコン名をメモ** - 実装時の変換漏れ防止
- ✅ **新規ページ実装後は必ず全アイコン検証** - 警告ログを確認
- ✅ **v0.263.0互換アイコンのリスト作成** - チーム全体で共有

---

## ✅ 実装ルール

### 1. UIカタログ準拠の絶対原則
```html
<!-- UIカタログで検証済みの実装例 -->
<!-- この通りに実装すること（1pxも変更しない） -->
<i data-lucide="crown" style="width: 64px; height: 64px;"></i>
<i data-lucide="trophy" style="width: 24px; height: 24px;"></i>
<i data-lucide="star" style="width: 32px; height: 32px;"></i>
```

### 2. 標準サイズ定義
UIカタログで検証済みの標準サイズ：
- **xs**: 16px × 16px（小アイコン）
- **sm**: 20px × 20px（モバイル用）
- **md**: 24px × 24px（標準サイズ）
- **lg**: 32px × 32px（強調用）
- **xl**: 64px × 64px（グレードアイコン等）
- **xxl**: 80px × 80px（特大表示）

### 3. JavaScript での実装
```javascript
// アイコンサイズ定数（UIカタログ準拠）
const LUCIDE_SIZES = {
    xs: 'width: 16px; height: 16px;',
    sm: 'width: 20px; height: 20px;',
    md: 'width: 24px; height: 24px;',
    lg: 'width: 32px; height: 32px;',
    xl: 'width: 64px; height: 64px;',
    xxl: 'width: 80px; height: 80px;'
};

// 使用例
function createIcon(iconName, size = 'md') {
    return `<i data-lucide="${iconName}" style="${LUCIDE_SIZES[size]}"></i>`;
}
```

---

## 🚫 絶対にやってはいけないこと

### 1. CSSクラスでのサイズ指定
```css
/* ❌ 動作しない可能性が高い */
.icon-large {
    width: 64px;
    height: 64px;
}
```
```html
<!-- ❌ 表示が崩れる -->
<i data-lucide="crown" class="icon-large"></i>
```

### 2. UIカタログと異なるサイズ指定
```html
<!-- ❌ UIカタログで64pxと定義されているものを変更 -->
<i data-lucide="crown" style="width: 60px; height: 60px;"></i>

<!-- ✅ UIカタログ通り -->
<i data-lucide="crown" style="width: 64px; height: 64px;"></i>
```

### 3. transform での拡大縮小
```html
<!-- ❌ 表示品質が劣化する -->
<i data-lucide="star" style="width: 24px; height: 24px; transform: scale(2);"></i>

<!-- ✅ 適切なサイズを直接指定 -->
<i data-lucide="star" style="width: 48px; height: 48px;"></i>
```

---

## 📋 実装チェックリスト

### 新しいアイコンを使用する前に
- [ ] UIカタログで該当アイコンの検証済み実装を確認
- [ ] 指定されているサイズを正確に確認
- [ ] インラインスタイルでのサイズ指定を確認

### 実装時
- [ ] UIカタログのコードを完全にコピー
- [ ] サイズ値を1pxも変更していない
- [ ] style属性が正しく記述されている

### 動作確認
- [ ] すべてのブラウザで正しく表示される
- [ ] レスポンシブ時も崩れない
- [ ] アニメーション適用時も正常

---

## 🔍 UIカタログでの確認方法

1. `ui-catalog.html` を開く
2. 「アイコン使用方法」セクションを確認
3. 該当アイコンの実装例を探す
4. **そのままコピー&ペースト**

```html
<!-- UIカタログの実装例をそのまま使用 -->
<!-- 例：総合評価グレードアイコン -->
<div class="rank-circle rank-circle-b">
    <i data-lucide="crown" style="width: 64px; height: 64px;"></i>
</div>
```

---

## 💡 トラブルシューティング

### アイコンが表示されない
1. UIカタログの実装と完全一致しているか確認
2. lucide.createIcons() が呼ばれているか確認
3. インラインスタイルが正しく記述されているか確認

### サイズが適用されない
1. **必ずインラインスタイルを使用する**
2. width と height の両方を指定する
3. 単位（px）を忘れずに記述する

### レスポンシブ対応
```javascript
// モバイルとデスクトップで異なるサイズが必要な場合
function createResponsiveIcon(iconName) {
    // JavaScript で画面サイズを判定
    const isMobile = window.innerWidth < 768;
    const size = isMobile ? LUCIDE_SIZES.sm : LUCIDE_SIZES.md;
    return `<i data-lucide="${iconName}" style="${size}"></i>`;
}
```

---

## 📊 検証済みアイコンリスト

UIカタログで検証済みの主要アイコン（**v0.263.0互換名を使用**）：
- `crown` - グレードS/A級（64px）
- `medal` - グレードB級（64px）
- `award` - 達成表示（28px）
- `trophy` - 評価Excellent（24px）
- `star` - 評価Good（24px）
- `thumbs-up` - 評価Pass（24px）
- `alert-triangle` - 評価Practice・警告（24px） ※UIカタログでは`triangle-alert`
- `check-circle` - 成功・完了（24px） ※UIカタログでは`circle-check-big`
- `bar-chart-2` - 統計・グラフ（36px） ※UIカタログでは`file-chart-column-increasing`
- `grid` - グリッド・一覧（24px） ※UIカタログでは`grid-3x3`
- `play-circle` - 再生ボタン（32px）
- `home` - ホームボタン（16px）
- `arrow-right` - ナビゲーション（16px）
- `chevron-left` - 前へ（24px）
- `chevron-right` - 次へ（24px）

---

## ⚠️ 最重要事項

**UIカタログに記載されている実装が絶対的な基準です。**
**独自の判断でサイズや実装方法を変更しないでください。**
**必ず検証済みの実装をそのまま使用してください。**

---

更新履歴：
- 2025-08-23: 初版作成（UIカタログ準拠の重要性を明記）
- 2025-10-24: バージョン管理セクション追加（Safari互換性・アイコン名非互換性対応）