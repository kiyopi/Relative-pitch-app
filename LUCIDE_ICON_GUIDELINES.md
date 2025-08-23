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

UIカタログで検証済みの主要アイコン：
- `crown` - グレードS/A級（64px）
- `medal` - グレードB級（64px）
- `award` - 達成表示（28px）
- `trophy` - 評価Excellent（24px）
- `star` - 評価Good（24px）
- `thumbs-up` - 評価Pass（24px）
- `triangle-alert` - 評価Practice（24px）
- `play-circle` - 再生ボタン（32px）
- `home` - ホームボタン（16px）
- `arrow-right` - ナビゲーション（16px）

---

## ⚠️ 最重要事項

**UIカタログに記載されている実装が絶対的な基準です。**
**独自の判断でサイズや実装方法を変更しないでください。**
**必ず検証済みの実装をそのまま使用してください。**

---

更新履歴：
- 2025-08-23: 初版作成（UIカタログ準拠の重要性を明記）