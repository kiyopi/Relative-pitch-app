# 開発用コマンド一覧

## プロジェクト実行
```bash
# 開発サーバー起動（Vite使用時）
npm run dev

# ビルド
npm run build

# プレビュー
npm run preview
```

## テスト・検証
```bash
# 音域テストページ確認
open voice-range-test-v4/src/voice-range-test-demo.html

# UIカタログ確認
open ui-catalog-essentials.html

# 統合テスト
open test-ui-integration.html
```

## Git操作
```bash
# 現在のブランチ確認
git status

# 変更確認
git diff

# コミット（作業完了時）
git add .
git commit -m "feat: [機能説明]"
git push origin feature/preparation-test-system
```

## ファイル検索（Darwin/macOS）
```bash
# ファイル検索
find . -name "*.js" -type f

# 内容検索（ripgrep推奨）
rg "PitchPro" --type js

# ディレクトリ確認
ls -la
```

## 依存関係
```bash
# パッケージインストール
npm install

# パッケージ更新確認
npm outdated
```

## 重要な確認コマンド
```bash
# base.css確認（既存スタイル検索）
grep "progress-bar" Bolt/v2/styles/base.css

# PitchPro実装確認
grep -r "AudioDetectionComponent" js/
```