# PitchPro統合手順書 - preparation.html本格実装

**作成日**: 2025年1月26日
**対象**: preparation.htmlへのPitchPro統合実装
**ベース**: test-pitchpro-cycle.html + voice-range-test-v4の段階的測定ロジック

---

## 🎯 統合目標

- test-pitchpro-cycle.htmlで確立したPitchPro統合をpreparation.htmlに適用
- voice-range-test-v4の段階的測定ロジック（低音→高音フェーズ）を統合
- モバイル対応・タイミング修正の保持
- 既存UI構造の最大限活用

---

## 📋 Phase 1: 基盤準備（Step 1-3）

### **Step 1: 現在のpreparation.htmlの分析**
- [ ] preparation.htmlの現在のJavaScript読み込み構造を確認
- [ ] 既存のmodular設計（preparation-modular.js等）の状況分析
- [ ] UIセクション構造の確認（permission, audio-test, range-test, result）

### **Step 2: JavaScript統合戦略の決定**
- [ ] test-pitchpro-cycle.htmlのpreparation-pitchpro-cycle.jsをベースとして採用
- [ ] 既存preparation.htmlのスクリプト読み込みをPitchPro統合版に変更
- [ ] 不要なmodular設計スクリプトの削除・統合

### **Step 3: PitchProライブラリ統合**
- [ ] pitchpro-v1.3.1.umd.jsの読み込み追加
- [ ] data-manager.jsの統合（データ管理統一）
- [ ] lucideアイコン初期化の統合

---

## 📋 Phase 2: HTML構造統合（Step 4-6）

### **Step 4: audio-test-sectionの強化**
- [ ] test-pitchpro-cycle.htmlのaudio-test-content構造を統合
- [ ] voice-instruction、meter-groupをaudio-test-contentで囲む
- [ ] 進捗表示エリア（progress-display）の統合
- [ ] モバイル対応アイコンサイズ指定の適用

### **Step 5: range-test-sectionの強化**
- [ ] voice-range-test-v4のプログレスリング構造を統合
- [ ] 段階的測定用のUI要素追加（低音フェーズ、高音フェーズ）
- [ ] リアルタイム音量・周波数表示の最適化
- [ ] countdown-display、stability-ringの統合

### **Step 6: result-sectionの強化**
- [ ] voice-range-test-v4の詳細統計表示を統合
- [ ] 測定フェーズ別結果表示の追加
- [ ] デバッグ情報表示の統合（開発時）

---

## 📋 Phase 3: JavaScript機能統合（Step 7-10）

### **Step 7: PreparationApp基本クラス統合**
- [ ] test-pitchpro-cycle.htmlのPreparationAppクラスを移植
- [ ] デバイス検出・PitchPro初期化部分の統合
- [ ] エラーハンドリングシステムの統合

### **Step 8: AudioDetectionComponent統合**
- [ ] マイクテスト用AudioDetectionComponentの実装
- [ ] 音域テスト用AudioDetectionComponentの実装
- [ ] セクション切り替え時のdestroy() → 新規作成ロジック
- [ ] UI要素セレクターの動的変更対応

### **Step 9: 段階的音域測定ロジック統合**
- [ ] voice-range-test-v4のVoiceRangeTestControllerロジックを抽出
- [ ] 低音フェーズ測定の実装
- [ ] 高音フェーズ測定の実装
- [ ] フェーズ間インターバル・プログレス表示
- [ ] 測定結果統合・統計計算

### **Step 10: フロー統合・タイミング調整**
- [ ] マイク許可 → 音声テスト → 音域テスト → 結果表示のフロー統合
- [ ] 1.5秒チェックマーク表示タイミングの適用
- [ ] 音域データ有無による分岐ロジック
- [ ] エラー状態・リトライ機能の統合

---

## 📋 Phase 4: UI・UX改善（Step 11-13）

### **Step 11: モバイル対応統合**
- [ ] training.cssのモバイル対応修正を適用
- [ ] アイコンサイズ強制指定（32px、!important）
- [ ] ボタン順序調整（column-reverse）
- [ ] 入れ子glass-card背景問題修正

### **Step 12: アニメーション・視覚効果統合**
- [ ] プログレスリングアニメーション
- [ ] カウントダウン表示
- [ ] フェーズ切り替え時の視覚フィードバック
- [ ] 音程検出時のリアルタイム表示

### **Step 13: エラーハンドリング・フォールバック**
- [ ] PitchPro初期化失敗時の対応
- [ ] マイク許可失敗時の対応
- [ ] 音域測定失敗時の対応
- [ ] デバイス別最適化設定の適用

---

## 📋 Phase 5: テスト・検証（Step 14-16）

### **Step 14: 機能テスト**
- [ ] マイク許可フローのテスト
- [ ] 音声テスト（「ド」検出）のテスト
- [ ] 段階的音域測定（低音→高音）のテスト
- [ ] 結果表示・統計情報のテスト

### **Step 15: デバイス別テスト**
- [ ] PC（Chrome、Safari）でのテスト
- [ ] iPhone（Safari）でのテスト
- [ ] iPad（Safari）でのテスト
- [ ] モバイルUI表示の確認

### **Step 16: 統合テスト・最適化**
- [ ] 音域データ有無両パターンのテスト
- [ ] エラー状態からの回復テスト
- [ ] パフォーマンス・メモリリーク確認
- [ ] 最終調整・コード最適化

---

## 🔧 実装時の注意事項

### **必須遵守事項**
- **インライン記述禁止**: HTMLのstyle属性使用禁止（Lucideアイコンサイズ、プログレスバー幅除く）
- **既存スタイル活用**: base.css、training.cssの既存クラス最優先使用
- **PitchPro仕様準拠**: 公式仕様に従った実装、独自改造の禁止

### **統合優先順位**
1. **test-pitchpro-cycle.html実装**: 確立された基盤を最優先
2. **voice-range-test-v4ロジック**: 段階的測定の価値ある部分のみ抽出
3. **既存UI構造**: preparation.htmlの構造を最大限保持

### **品質保証**
- **各Step完了時**: 動作確認必須
- **Phase完了時**: 統合テスト実施
- **エラー発生時**: 前Stepに戻って原因分析

---

## 📊 進捗管理

各Stepの完了時にチェックボックスを更新し、問題発生時は詳細を記録してください。

**開始日**: 2025年1月26日
**予定完了**: Phase別に段階実装
**最終目標**: PitchPro統合版preparation.htmlの完成

---

**このファイルは統合作業中に更新・詳細化されます**