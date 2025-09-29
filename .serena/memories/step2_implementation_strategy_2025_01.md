# Step2実装戦略 - 段階的設計アプローチ

## 🎯 設計方針（ログファイルから）

### 責務の明確化
- **Step1責務**: 「音域テストに進む準備ができた」という意思表示まで
- **Step2責務**: 遷移してきたユーザーを迎え入れ、音域テストの実行に集中

### DataManager活用による堅牢な状態管理
- localStorageの直接操作より抽象化層を使用
- セッションデータによる安全なページ間遷移
- 状態確認による予期しないアクセスの防止

### PitchPro状態の安全な引き継ぎ
```javascript
// 遷移前のクリーンアップ
audioDetector.microphoneController.reset();
// 次ページでのクリーンな再開始
const audioDetector = await window.globalAudioManager.getInstance();
```

## 🏗️ 段階的実装戦略

### Phase 1: データ引き継ぎ戦略の設計・検証
#### 1.1 DataManager活用パターンの調査
- [ ] 既存DataManagerの機能確認
- [ ] sessionDataとlocalStorageの使い分け
- [ ] 引き継ぎデータ項目の定義

#### 1.2 Step1遷移ロジックの設計
- [ ] PitchProリセット手順の確立
- [ ] 安全な状態保存メソッドの設計
- [ ] エラーハンドリング戦略

### Phase 2: Step2受け入れロジックの設計・実装
#### 2.1 Step1完了状態の検証機能
- [ ] DataManagerによる状態確認
- [ ] 未完了時の適切な処理
- [ ] エラー画面・リダイレクト機能

#### 2.2 Step2専用初期化の設計
- [ ] GlobalAudioManager.getInstance()パターン適用
- [ ] Step2用UIセレクター設定
- [ ] 音域テスト固有のコールバック設計

### Phase 3: 音域テスト機能の統合・最適化
#### 3.1 既存音域テストロジックの統合
- [ ] voice-range-test-demo.jsからの移植
- [ ] Step1確立パターンとの統合
- [ ] 測定データの構造設計

#### 3.2 動作確認・最適化
- [ ] Phase1-2の統合テスト
- [ ] 実際のStep1→Step2遷移テスト
- [ ] エラーケースの検証

## 🔍 優先確認項目

### 1. DataManagerの現状確認
- 既存の機能と使用可能なメソッド
- sessionDataとlocalStorageの仕様
- 現在の使用状況

### 2. Step1の現在の遷移実装
- 現在の遷移ボタンの動作
- 保存されているデータ項目
- 遷移時の処理フロー

### 3. voice-range-test-demo.js分析
- Step2で統合すべき既存音域テスト機能
- 現在の実装状況と問題点
- Step1パターンとの統合方法

## 🚨 重要な制約

### Step1確立パターンの厳格な適用
- GlobalAudioManager.getInstance()のみ使用
- ページ側で完全制御
- 責務分離アーキテクチャ遵守

### 段階的検証の徹底
- 各Phase完了時の動作確認必須
- いきなりの大幅修正は禁止
- 小さな変更での段階的改善

## 📝 次のアクション
1. DataManagerの詳細機能確認
2. Step1現在の遷移実装の調査
3. voice-range-test-demo.jsの分析