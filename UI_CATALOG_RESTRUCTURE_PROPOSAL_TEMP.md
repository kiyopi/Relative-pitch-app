# 🏗️ UIカタログ構造の再設計提案（Claude提案・作業後削除予定）

## 現在の問題
- ui-catalog-base.html が725行で管理困難
- 情報量が多すぎて使いにくい
- 単一ファイルによる保守性の低下

## 🎯 提案する新構造

### ベーステンプレート作成
- **ui-catalog-template.html** - 共通構造・スタイル・ナビゲーション

### 個別カタログファイル
```
├── ui-catalog-index.html          # 総合インデックス・ナビゲーション
├── ui-catalog-essentials.html     # 必須基本スタイル (200行程度)
├── ui-catalog-components.html     # 汎用コンポーネント
├── ui-catalog-results.html        # 既存(結果表示専用)
└── ui-catalog-advanced.html       # 高度なスタイル・エフェクト
```

### ベーステンプレート内容
- 共通ヘッダー・フッター
- 統一されたスタイル定義
- ナビゲーションシステム
- 基本JavaScript（Lucide初期化等）

## ✅ メリット
- **DRY原則**: 共通部分の重複排除
- **メンテナンス性**: 変更が1箇所で済む
- **一貫性**: 全カタログで統一UI
- **軽量化**: 各ファイルが適切サイズ

## 📋 作業順序
1. ui-catalog-template.html作成（共通構造・ベーステンプレート）
2. ui-catalog-index.html作成（総合インデックス・ナビゲーション）
3. ui-catalog-essentials.html作成（200行程度の必須基本スタイル）
4. ui-catalog-components.html作成（汎用コンポーネント）
5. ui-catalog-advanced.html作成（高度なスタイル・エフェクト）
6. 既存ui-catalog-results.htmlとの統合確認
7. 全カタログファイルのナビゲーション連携確認

## ⚠️ 注意事項
- 作業完了後、このドキュメントは削除する
- 既存のui-catalog-base.htmlは最後まで保持（バックアップとして）
- v2環境のCSS変数システムを活用する