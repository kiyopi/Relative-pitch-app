# PitchPro Audio Processing - リリース手順書

## 📋 リリース作業チェックリスト

### 事前準備

- [ ] 1. **機能開発・バグ修正完了確認**
  - [ ] 全ての対象機能が実装済み
  - [ ] テストが正常に通る
  - [ ] コードレビュー完了

- [ ] 2. **ローカルテスト実行**
  ```bash
  npm test
  npm run typecheck
  npm run lint
  ```

### バージョン更新

- [ ] 3. **package.json バージョン更新**
  ```bash
  # 例: 1.1.7 → 1.1.8
  npm version patch  # パッチバージョン
  npm version minor  # マイナーバージョン
  npm version major  # メジャーバージョン
  ```

- [ ] 4. **ソースコード内バージョン更新**
  - [ ] `src/index.ts` - VERSION定数とJSDoc
  - [ ] `CLAUDE.md` - 現在のバージョン欄
  - [ ] `README.md` - バージョン表記があれば更新

### ドキュメント更新

- [ ] 5. **CHANGELOG.md 更新**
  - [ ] 新バージョンのエントリー追加
  - [ ] 機能追加・バグ修正・破壊的変更を分類
  - [ ] 技術的詳細とファイル行数を記載

- [ ] 6. **リリースノート作成**
  - [ ] `RELEASE-v{VERSION}.md` 作成
  - [ ] ユーザー向けの説明
  - [ ] マイグレーションガイド
  - [ ] 既知の問題・制限事項

### HTMLファイルのバージョン更新

- [ ] 7. **デモファイルのバージョン表記確認**
  ```bash
  # 古いバージョン番号を検索
  grep -r "v1\.1\.[0-9]" *.html
  ```
  - [ ] `index.html` - タイトル、バージョンバッジ、ステータス、ログ
  - [ ] `frequency-reset-test.html` - ログメッセージ
  - [ ] `test-*.html` - その他テストファイル
  - [ ] `demos/` ディレクトリ内ファイル

### ビルドとテスト

- [ ] 8. **フルビルド実行**
  ```bash
  npm run build
  ```

- [ ] 9. **生成ファイル確認**
  - [ ] `dist/pitchpro.umd.js` - UMDファイル
  - [ ] `dist/pitchpro.umd.js.map` - ソースマップ
  - [ ] `dist/index.esm.js` - ESMファイル
  - [ ] `dist/index.js` - CommonJSファイル
  - [ ] `dist/index.d.ts` - 型定義ファイル

- [ ] 10. **バージョン付きファイル作成**
  ```bash
  # アプリケーション用ファイル名
  cp dist/pitchpro.umd.js dist/pitchpro-v{VERSION}.umd.js
  ```

### Git操作

- [ ] 11. **変更をコミット**
  ```bash
  git add -A
  git commit -m "feat: v{VERSION} - [リリース内容の簡潔な説明]

  🎯 Generated with Claude Code
  
  Co-Authored-By: Claude <noreply@anthropic.com>"
  ```

- [ ] 12. **mainブランチにプッシュ**
  ```bash
  git push origin main
  ```

- [ ] 13. **Gitタグ作成・プッシュ**
  ```bash
  git tag v{VERSION}
  git push origin v{VERSION}
  ```

### GitHub Release

- [ ] 14. **GitHubリリース作成**
  - [ ] https://github.com/kiyopi/pitchpro-audio-processing/releases/new にアクセス
  - [ ] タグ: `v{VERSION}` を選択
  - [ ] タイトル: `v{VERSION} - [リリース内容]`
  - [ ] 説明: `RELEASE-v{VERSION}.md` の内容をコピー

- [ ] 15. **アセットファイルアップロード**
  - [ ] `dist/pitchpro.umd.js`
  - [ ] `dist/pitchpro.umd.js.map`
  - [ ] `dist/pitchpro-v{VERSION}.umd.js` ※重要
  - [ ] `dist/index.esm.js` (オプション)
  - [ ] `dist/index.js` (オプション)

- [ ] 16. **リリース公開**
  - [ ] "Publish release" クリック

### npm パッケージ公開

- [ ] 17. **npm ログイン確認**
  ```bash
  npm whoami
  # ログインしていない場合
  npm login
  ```

- [ ] 18. **パッケージ公開**
  ```bash
  npm publish
  ```

- [ ] 19. **公開確認**
  ```bash
  npm view @pitchpro/audio-processing version
  ```

### 最終確認

- [ ] 20. **ダウンロードテスト**
  ```bash
  # GitHubからのダウンロード確認
  curl -I "https://github.com/kiyopi/pitchpro-audio-processing/releases/download/v{VERSION}/pitchpro.umd.js"
  ```

- [ ] 21. **npm インストールテスト**
  ```bash
  # 別ディレクトリで確認
  mkdir test-install && cd test-install
  npm init -y
  npm install @pitchpro/audio-processing@{VERSION}
  ```

- [ ] 22. **リリースノート確認**
  - [ ] GitHubリリースページが正常に表示される
  - [ ] アセットファイルがダウンロード可能
  - [ ] npmページが更新されている

### 通知・報告

- [ ] 23. **開発チームへの報告**
  - [ ] リリース完了の通知
  - [ ] 主要な変更点の説明
  - [ ] 既知の問題があれば報告

- [ ] 24. **ドキュメント最終更新**
  - [ ] README.md の "Latest Release" リンク更新
  - [ ] 必要に応じてマイグレーションガイド更新

## 🚨 トラブルシューティング

### よくある問題と解決策

1. **npm publish でエラー**
   ```bash
   # バージョンが既に存在する場合
   npm version patch
   npm publish
   ```

2. **GitHubリリースでアセットが見つからない**
   - ファイル名を確認（pitchpro.umd.js vs pitchpro-v{VERSION}.umd.js）
   - アップロード完了まで待機

3. **タグが認識されない**
   ```bash
   git push origin v{VERSION} --force
   ```

4. **ビルドエラー**
   ```bash
   rm -rf dist node_modules
   npm install
   npm run build
   ```

## 📝 リリース後の確認項目

- [ ] GitHubリリースページが正常表示
- [ ] npm パッケージページが更新済み
- [ ] アセットファイルがダウンロード可能
- [ ] 新機能が正常動作（サンプルアプリで確認）
- [ ] 既存機能に問題がないことを確認

## ⚠️ 注意事項

1. **破壊的変更がある場合**
   - メジャーバージョンを上げる
   - マイグレーションガイドを詳細に記載
   - 事前にチームと合意

2. **緊急パッチの場合**
   - ホットフィックスブランチから直接リリース
   - 必要最小限の変更に留める
   - 速やかにmainブランチにマージ

3. **実験的機能**
   - ベータ版としてリリース (例: 1.2.0-beta.1)
   - 本番環境での使用は推奨しない旨を明記

---

**このチェックリストに従って作業することで、品質の高いリリースを継続的に提供できます。**