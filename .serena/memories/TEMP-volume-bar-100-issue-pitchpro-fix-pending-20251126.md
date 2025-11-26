# 音量バー100%問題 - PitchPro修正待ち

## 作成日: 2025-11-26

## 問題の状況

### 症状
- iPhone/iPadのトレーニングページで音量バーが100%に固定される
- PCでは正常に動作

### 根本原因（PitchPro側で特定済み）
1. `setCallbacks()`（924-942行目）がonPitchUpdateを直接PitchDetectorに渡している
2. これにより`handlePitchUpdate()`がバイパスされ、`_getProcessedResult()`が呼ばれない
3. 結果として、コールバックに生のRMS値が渡される（正規化されていない値）

### 設計意図との不整合
- fe81537コミットで「音量値一貫性問題を解決」として`_getProcessedResult()`が導入された
- f0d9f31コミットで`setCallbacks()`が追加されたが、`_getProcessedResult()`経由で処理する設計を見落としていた

## 実施済みの作業（SPA側）

### 1. プログレスバーID統一
- **training.html**: `id="training-volume-progress"` を追加（83行目）
- **trainingController.js**: セレクターを `#training-volume-progress` に統一
- **navigation-manager.js**: 個別IDでリセット処理を実装

### 2. 一時的な回避策（効果なし）
- `autoUpdateUI: false` に設定
- `handlePitchUpdate()` で手動更新、iOS端末は0.5倍補正を適用
- **結果**: 改善されず、音量バーは100%のまま

## 次のアクション

### PitchPro側の修正（待機中）
`setCallbacks()`が`_getProcessedResult()`経由で処理されるよう修正が必要

### PitchPro修正後のSPA側対応
1. trainingController.jsの手動補正コードを削除
2. `autoUpdateUI: true` に戻す（または適切な設定に調整）
3. iPhone/iPadで動作確認

## 関連ファイル

### SPA側
- `/pages/training.html` - 音量バー要素（id="training-volume-progress"）
- `/js/controllers/trainingController.js` - AudioDetectionComponent設定
- `/js/navigation-manager.js` - 音量バーリセット処理

### PitchPro側
- `setCallbacks()`メソッド（924-942行目）
- `handlePitchUpdate()`メソッド
- `_getProcessedResult()`メソッド

## 備考
- 音程検出のオクターブエラー（-1100〜-1400セント）も観測されているが、これは別問題
- 低音域テストの失敗増加との関連性は未調査
