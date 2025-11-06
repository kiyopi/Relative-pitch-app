# タスク完了時チェックリスト

## 作業完了前の必須確認

### 1. コード品質チェック
- [ ] インラインスタイル削除確認（style属性、JavaScriptインラインCSS）
- [ ] 既存UIコンポーネント活用確認（ui-catalog-essentials.html参照）
- [ ] 相対音感原則遵守（基音音名・周波数非表示）
- [ ] PitchPro音量取得方式確認（result.volume使用）

### 2. 動作確認
- [ ] PC（Chrome/Safari）での動作確認
- [ ] モバイル表示確認（レスポンシブ対応）
- [ ] 音声処理の正常動作確認
- [ ] エラーハンドリング確認

### 3. ファイル整理
- [ ] 不要なテストファイル削除
- [ ] コメント整理（TODO削除・更新）
- [ ] console.log削除（本番コード）

### 4. Git操作（完了時のみ）
```bash
git status  # 変更確認
git add .
git commit -m "feat/fix: [作業内容]"
git push origin feature/preparation-test-system
```

### 5. ドキュメント更新
- [ ] CLAUDE.md更新（重要な変更時）
- [ ] 仕様書との整合性確認
- [ ] 新機能の場合はREADME更新

## 注意事項
- 作業中のコミットは禁止（完全完了時のみ）
- テスト未完了時のプッシュ禁止
- 新規CSS作成前に必ずbase.css確認