# ヘルプページ実装状況メモ

## 作成日: 2025-11-21

## 作業ブランチ
- `feature/help-page`

## 完了した作業

### 1. 仕様書作成
- `/PitchPro-SPA/specifications/HELP_PAGE_SPECIFICATION.md` 作成済み

### 2. 基本ファイル作成
- `/PitchPro-SPA/pages/help.html` - ヘルプページHTML
- `/PitchPro-SPA/styles/help.css` - ヘルプページ専用CSS
- `/PitchPro-SPA/pages/js/help-controller.js` - FAQアコーディオン制御

### 3. Router統合
- `router.js` に help ページルート追加済み
- `index.html` に help.css, help-controller.js 読み込み追加済み

### 4. コンテンツ実装済みセクション
- 使い方の流れ（準備フェーズ詳細含む）
- トレーニングモード説明（3モード）
- 方向タブ説明（上行・下行）
- 評価グレード説明（S/A/B/C/D）
- 音域について
- 用語説明（セント、基音、目標音）
- FAQ（アコーディオン形式）
- トラブルシューティング

### 5. help.css カスタムクラス追加（未コミット）
以下のクラスを追加済み：
```css
.help-icon-text      /* 16pxアイコン+テキスト横並び */
.help-icon-text-sm   /* 14pxアイコン+テキスト横並び */
.help-mode-icon i    /* モードアイコン内20px */
.help-direction-icon i /* 方向アイコン内20px */
.help-info-box       /* 情報ボックス */
.help-mode-disabled  /* 無効状態（opacity: 0.6） */
.help-header-icon    /* ページヘッダー36px */
.help-btn-icon       /* ボタン内18px */
```

### 6. UIカタログ追加（未コミット）
- `ui-catalog-essentials.html` に「ヘルプページ専用スタイル」セクション追加
- `help.css` リンク追加

## 未完了の作業

### 1. help.html インラインスタイル削除
- 現在23箇所のインラインスタイルが残っている
- 新規作成したカスタムクラスで置き換え必要

### 2. コミット
- help.css のカスタムクラス追加
- ui-catalog-essentials.html のヘルプセクション追加
- help.html のインラインスタイル削除

## インラインスタイル置換パターン

```html
<!-- Before -->
<div class="flex items-center gap-2">
    <i data-lucide="icon" style="width: 16px; height: 16px; flex-shrink: 0;"></i>
    <span>テキスト</span>
</div>

<!-- After -->
<div class="help-icon-text">
    <i data-lucide="icon" class="text-color"></i>
    <span>テキスト</span>
</div>
```

| インラインスタイル | 置換クラス |
|------------------|-----------|
| `width: 36px; height: 36px;` | `help-header-icon` |
| `width: 20px; height: 20px;` | `.help-mode-icon i` 等で自動適用 |
| `width: 18px; height: 18px;` | `help-btn-icon` |
| `width: 16px; height: 16px; flex-shrink: 0;` | `.help-icon-text i` で自動適用 |
| `width: 14px; height: 14px; flex-shrink: 0;` | `.help-icon-text-sm i` で自動適用 |
| `opacity: 0.6;` | `help-mode-disabled` |
| `background: rgba(...); padding: 12px; border-radius: 8px;` | `help-info-box` |

## 関連コミット履歴
- `bd1f962` feat(help): ヘルプページコンテンツ拡充 - 音域・用語説明追加
- その他キャッシュバスター更新コミット

## 注意事項
- VS CodeとCursorで同一リポジトリを開いていたため、ブランチ同期問題が発生
- 作業再開時は `feature/help-page` ブランチで継続
