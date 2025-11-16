# preparation.html ドキュメント

## 📚 ドキュメント一覧

### 📋 [PREPARATION_HTML_SPECIFICATION.md](./PREPARATION_HTML_SPECIFICATION.md)
**preparation.htmlの詳細技術仕様書**

- **対象**: 開発者・保守担当者
- **内容**: HTML構造、JavaScript制御、依存関係の完全解説
- **用途**: コード理解、デバッグ、機能拡張

**主要セクション**:
- 📊 HTML構造分析（325行の詳細解説）
- 🎮 JavaScript制御（preparation.js + voice-range-test-demo.js）
- 🔧 重要な修正履歴（globalAudioDetectorスコープ問題等）
- 📋 重要なID・クラス一覧（50+個の要素）

### 🚀 [PREPARATION_REFACTORING_GUIDE.md](./PREPARATION_REFACTORING_GUIDE.md)
**リファクタリング実行ガイド**

- **対象**: リファクタリング実行者
- **内容**: 現状分析、改善戦略、段階的移行プラン
- **用途**: コード改善、保守性向上、テスタビリティ向上

**主要セクション**:
- 🏗️ コンポーネント分離戦略
- 📁 理想的なファイル構造
- 🚀 7ステップの段階的移行プラン
- ⚠️ リスク管理と成功指標

## 🎯 ドキュメントの使い方

### 新規開発者向け
1. **[PREPARATION_HTML_SPECIFICATION.md](./PREPARATION_HTML_SPECIFICATION.md)を読む**
   - preparation.htmlの全体構造を理解
   - 重要なID・クラスを把握
   - JavaScript制御フローを理解

2. **実際のファイルを参照**
   - `/pages/preparation.html` - メインHTML
   - `/pages/js/preparation.js` - メインJavaScript
   - `/pages/js/voice-range-test-demo.js` - 音域テスト統合

### リファクタリング実行者向け
1. **現状理解**
   - [PREPARATION_HTML_SPECIFICATION.md](./PREPARATION_HTML_SPECIFICATION.md)で技術詳細を把握
   - 実際のコードで動作確認

2. **リファクタリング計画**
   - [PREPARATION_REFACTORING_GUIDE.md](./PREPARATION_REFACTORING_GUIDE.md)で戦略確認
   - 段階的移行プランに従って実行

### デバッグ時
1. **問題の特定**
   - SPECIFICATION.mdのID・クラス一覧で対象要素特定
   - JavaScript制御セクションで処理フロー確認

2. **修正履歴確認**
   - 過去の重要な修正（globalAudioDetectorスコープ問題等）を参考
   - 同様の問題パターンを回避

## 🔄 更新方針

### ドキュメント更新が必要な場合
- **HTML構造変更時**: SPECIFICATION.mdのHTML構造分析を更新
- **JavaScript追加・変更時**: 制御フロー、重要な関数の解説を更新
- **新機能追加時**: 該当セクションの詳細を追記
- **リファクタリング実行時**: REFACTORING_GUIDE.mdの進捗・結果を反映

### 更新手順
1. 変更内容を該当ドキュメントに反映
2. バージョン番号更新（1.0.0 → 1.1.0等）
3. 「最終更新」日付更新
4. 変更点をREADME.mdの変更履歴に追記

## 📈 現在の開発状況

### ✅ 完了済み
- **🎯 音域テスト統合完了**: マイク許可〜結果表示の完全フロー実装
- **🔧 globalAudioDetectorスコープ問題解決**: 55箇所の参照修正
- **🎨 3秒円形プログレスバー**: 正常動作確認
- **📄 詳細ドキュメント作成**: 技術仕様・リファクタリングガイド完備
- **🗂️ ファイル構成整理**: js/preparation.js統合、不要ファイル削除

### 🚀 次期開発予定
- **トレーニング機能実装**: preparation.htmlからtraining.htmlへの連携
- **データ永続化強化**: localStorage統合、音域データ保存
- **リファクタリング実行**: 保守性・テスタビリティ向上

## 🏆 技術的成果

### 解決した重要問題
1. **PitchPro二重初期化問題**: サイクル管理による解決
2. **変数スコープ問題**: window.globalAudioDetector統一参照
3. **円形プログレスバー非動作**: handleVoiceDetection正常実行
4. **結果表示問題**: 必要HTML要素追加・動的データ表示

### 技術的特徴
- **PitchPro v1.3.1完全対応**: 最新音声処理ライブラリ
- **レスポンシブUI**: モバイル・PC両対応
- **本番品質コード**: デバッグコード整理済み
- **包括的エラーハンドリング**: 測定失敗時の代替フロー

## 📞 サポート・質問

### 技術的質問
- **HTML構造について**: PREPARATION_HTML_SPECIFICATION.md参照
- **リファクタリングについて**: PREPARATION_REFACTORING_GUIDE.md参照
- **修正履歴について**: 各ドキュメントの「重要な修正履歴」セクション参照

### バグ報告・改善提案
問題を発見した場合は、以下の情報と共に報告してください：
- 発生セクション（マイク許可・音声テスト・音域テスト・結果表示）
- ブラウザ・デバイス情報
- 再現手順
- 期待される動作

---

**最終更新**: 2025年1月
**ドキュメントバージョン**: 1.0.0
**対象preparation.htmlバージョン**: 統合完了版（mainブランチ）