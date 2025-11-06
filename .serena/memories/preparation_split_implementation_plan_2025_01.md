# Preparation分割実装計画

## 📁 ベースファイル構造分析完了

### test-pitchpro-cycle.html（Step1ベース）
- ✅ ページヘッダー（Preparationタイトル）
- ✅ ステップインジケーター（Step1,2,3表示）
- ✅ マイク許可セクション（#permission-section）
- ✅ 音声テストセクション（#audio-test-section）
- ❌ 音域設定済み表示（#range-saved-display）→ 削除予定
- ✅ PitchPro統合済み、動作確認済み

### voice-range-test-demo.html（Step2ベース）
- ✅ ページヘッダー（音域テスト専用デザイン）
- ❌ マイク許可セクション → Step1完了チェックに変更
- ✅ 音域テスト実行エリア
- ✅ 測定結果表示機能
- ✅ PitchPro統合済み、動作確認済み

## 🔄 具体的実装計画

### Phase A: preparation-step1.html作成
**ベース**: test-pitchpro-cycle.html

#### A1: ファイル複製と基本調整
- test-pitchpro-cycle.htmlをコピー
- タイトル変更: "準備 - Step1"
- ステップインジケーター調整（Step1,2アクティブ、Step3未来）

#### A2: 不要部分削除
- #range-saved-display セクション完全削除
- 音域テスト関連のJavaScript削除
- 音域テスト関連のCSS削除（必要に応じて）

#### A3: Step2遷移機能追加
- 音声テスト完了時の処理変更
- localStorage保存: micPermissionGranted, audioTestCompleted
- Step2への遷移ボタン追加
- window.location.href = 'preparation-step2.html'

#### A4: UI調整
- Step3インジケーターを非表示または未来状態に
- 説明文をStep1専用に調整

### Phase B: preparation-step2.html作成
**ベース**: voice-range-test-demo.html

#### B1: ファイル複製と基本調整
- voice-range-test-demo.htmlをコピー
- タイトル変更: "準備 - Step2"
- ページヘッダーをPreparation仕様に統一

#### B2: Step1完了チェック機能追加
- ページ読み込み時のlocalStorageチェック
- 未完了時のリダイレクト: window.location.href = 'preparation-step1.html'
- 完了状態の表示: "Step1完了済み"

#### B3: マイク許可セクション調整
- 既存のマイク許可ボタンを隠すかStep1完了表示に変更
- または完全削除してStep1完了メッセージのみ表示

#### B4: ステップインジケーター追加
- test-pitchpro-cycle.htmlからステップインジケーターをコピー
- Step1,2完了、Step3アクティブ状態に設定

#### B5: トレーニング遷移機能追加
- 音域テスト完了時の処理変更
- localStorage保存: voiceRangeData, rangeTestCompleted
- training.htmlへの遷移ボタン追加
- window.location.href = '../training.html'

### Phase C: 動作テスト
#### C1: Step1単体テスト
- マイク許可動作確認
- 音声テスト動作確認
- localStorage保存確認
- Step2遷移確認

#### C2: Step2単体テスト
- Step1完了チェック動作確認
- 音域テスト動作確認
- 結果表示確認
- training遷移確認

#### C3: 連携テスト
- Step1 → Step2の完全フロー確認
- データ引き継ぎ確認
- PitchPro独立性確認（二重初期化なし）

### Phase D: 最終調整
#### D1: CSS統一
- 両ページのスタイル統一
- ステップインジケーター同期
- レスポンシブ対応確認

#### D2: エラーハンドリング
- 直接Step2アクセス時の処理
- localStorage削除時の処理
- ブラウザバック対応

#### D3: 本番配置
- 既存preparation.htmlのバックアップ
- ファイル配置
- リンク更新（index.htmlなど）

## 🎯 期待される成果
1. **PitchPro二重初期化問題の完全解決**
2. **各ページの独立性確保**
3. **動作確認済みコードの最大活用**
4. **保守性・デバッグ容易性の向上**
5. **段階的で安全な実装**

## 📅 推定作業時間
- Phase A: 2-3時間
- Phase B: 2-3時間  
- Phase C: 1-2時間
- Phase D: 1時間
- **合計**: 6-9時間

## 🚨 注意点
- 各Phase完了時に必ず動作確認
- localStorage連携の徹底テスト
- PitchProインスタンスの独立性確認
- 元ファイルのバックアップ必須

## 記録日
2025年1月28日

## 状態
実装準備完了 - Phase A開始可能