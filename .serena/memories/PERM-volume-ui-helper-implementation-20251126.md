# VolumeUIHelper 統一音量バー更新システム (2025-11-26)

## 背景・経緯

### 問題
1. `autoUpdateUI: true` にすると音量が2倍になるバグが発生
2. バグ解消を試みるも解決できず
3. `autoUpdateUI: false` に統一して手動更新に切り替え
4. しかし手動更新のコードが各ファイルでバラバラに実装されていた
5. 結果: 動くファイルと動かないファイルが混在

### 解決策
**VolumeUIHelper** 統一ヘルパーを作成し、すべてのファイルから呼び出す形に統一

## ファイル構成

### 新規作成
- `/js/core/volume-ui-helper.js` - 統一音量バー・周波数表示更新ヘルパー

### 修正ファイル
- `/index.html` - VolumeUIHelperのscriptタグ追加
- `/pages/js/preparation-pitchpro-cycle.js` - VolumeUIHelper使用に変更
- `/js/controllers/trainingController.js` - VolumeUIHelper使用に変更
- `/pages/js/voice-range-test.js` - VolumeUIHelper使用に変更

## VolumeUIHelper API

```javascript
// デバイス別volumeMultiplierを取得
VolumeUIHelper.getVolumeMultiplier()  // DeviceDetector.getDeviceSensitivity()を使用

// 生の音量値を表示用パーセントに変換
VolumeUIHelper.calculateVolumePercent(rawVolume)  // rawVolume * multiplier * 100

// 音量バーを更新
VolumeUIHelper.updateVolumeBar(selector, rawVolume)

// 音量テキストを更新
VolumeUIHelper.updateVolumeText(selector, rawVolume)

// 周波数から音名を取得
VolumeUIHelper.frequencyToNoteName(frequency)  // 例: "C4", "A#3"

// 周波数表示を更新
VolumeUIHelper.updateFrequency(selector, frequency, options)

// PitchProのresultから一括更新（推奨）
VolumeUIHelper.updateFromResult(result, {
    volumeBar: '#volume-bar',
    volumeText: '#volume-text',
    frequency: '#frequency-display'
})
```

## 使用例

### preparation-pitchpro-cycle.js
```javascript
updateUIFromResult(result) {
    if (window.VolumeUIHelper) {
        window.VolumeUIHelper.updateFromResult(result, {
            volumeBar: this.uiElements.volumeBar,
            volumeText: this.uiElements.volumeText,
            frequency: this.uiElements.frequencyDisplay
        });
    }
}
```

### trainingController.js
```javascript
if (window.VolumeUIHelper) {
    window.VolumeUIHelper.updateVolumeBar('.mic-recognition-section .progress-fill', result.volume);
}
```

### voice-range-test.js
```javascript
if (window.VolumeUIHelper) {
    window.VolumeUIHelper.updateFromResult(result, {
        volumeBar: '#range-test-volume-bar',
        volumeText: '#range-test-volume-text',
        frequency: '#range-test-frequency-value'
    });
}
```

## 計算式

```javascript
// PitchProと同等の計算
displayPercent = Math.min(100, rawVolume * volumeMultiplier * 100)
```

### デバイス別volumeMultiplier（DeviceDetector.getDeviceSensitivity()）
| デバイス | multiplier |
|----------|------------|
| PC       | 4.0        |
| iPhone   | 4.5        |
| iPad     | 7.0        |
| Android  | 4.5        |

## 重要な教訓

1. **同じ処理が複数箇所にある時点で共通化を検討すべき**
2. **autoUpdateUIのバグが解消できないなら、アプリ側で統一管理が正しいアプローチ**
3. **調査結果は即座にメモに残し、繰り返しを防ぐ**
