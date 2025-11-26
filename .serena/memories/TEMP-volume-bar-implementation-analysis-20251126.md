# 音量バー実装の完全分析 (2025-11-26)

## 重要な経緯（ユーザーから確認）
1. **autoUpdateUI: true に統一** → 音量が2倍になるバグ発生
2. バグ解消を試みるも解決できず
3. **autoUpdateUI: false に統一して手動更新に切り替え**
4. 現在の問題:
   - 音域テストとトレーニングページでバーが動かない
   - 周波数の表示が0のまま

## 現在の問題（ユーザー報告）
- 「音量バーは20-30ぐらいで低いがどれも同じ動きのようにみえる」
- 「音域テストは周波数が０のまま」
- 音域テストとトレーニングページでバーが動かない

## PitchPro音量処理の仕組み

### result.volumeの値範囲
- **コールバックに渡されるresult.volume: 0-1の範囲**（生データ）

### デバイス別volumeMultiplier（PitchPro内部設定）
| デバイス | volumeMultiplier |
|----------|------------------|
| PC       | 3                |
| iPhone   | 4.5              |
| iPad     | 7                |

### 正しい計算式
- `displayVolume = Math.min(100, result.volume * volumeMultiplier)`

## 調査すべき問題

### 問題1: バーが動かない
- preparationでは動くがtraining/voice-range-testでは動かない
- コールバックが呼ばれているか確認必要
- DOM要素のセレクターが正しいか確認必要

### 問題2: 周波数が0のまま
- voice-range-test.jsのhandleVoiceDetectionに周波数更新がない可能性

### 問題3: 音量が低い（20-30%）
- volumeMultiplierが適用されていない
- `result.volume * 100` ではなく `result.volume * volumeMultiplier` が必要
