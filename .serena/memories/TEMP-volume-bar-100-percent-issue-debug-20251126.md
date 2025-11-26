# 音量バー100%問題 デバッグ調査レポート

## 日付: 2025-11-26

## 問題の概要
iPhone/iPadで音量バーが常に100%を表示する問題

## 調査経緯

### 1. PitchPro v1.3.6 統合
- `setCallbacks()`が`_getProcessedResult()`を経由するよう修正されたv1.3.6を統合
- `result.volume`が0-1から0-100%に変更される破壊的変更に対応
- 各ファイルで`* 100`を削除（preparation-pitchpro-cycle.js, voice-range-test.js, trainingController.js）

### 2. 設定の違いを検証
テストページとアプリで設定の違いを確認：
- `fftSize`: テストページ=4096, アプリ=2048 → アプリを4096に変更
- `clarityThreshold`: テストページ=0.4, アプリ=0.85 → アプリを0.4に変更

**結果**: 設定を同じにしても100%問題は解決せず

### 3. 決定的な発見
**アプリ側にテストページをコピーして同一環境で比較テスト実施**

| 環境 | PitchProファイル | 最大音量値 | 結果 |
|------|-----------------|-----------|------|
| PitchProリポジトリのテストページ | dist/pitchpro.umd.js (v1.3.6) | 最大97.5% | ✅ 正常 |
| アプリ側のテストページ | js/core/pitchpro-v1.3.6.umd.js | 最大95.7% | ✅ 正常 |
| アプリ本体（準備・音域・トレーニング） | js/core/pitchpro-v1.3.6.umd.js | 常に100% | ❌ 問題 |

**結論**: 
- 同じPitchProファイル（v1.3.6）を使用
- テストページでは100%にならない（最大95.7%）
- アプリでは100%になる
- **PitchProファイル自体は正常、問題はアプリの初期化方法にある**

## 原因の特定

### テストページの設定（正常動作）
```javascript
audioDetector = new PitchPro.AudioDetectionComponent({
    volumeBarSelector: '#volumeBar',
    volumeTextSelector: '#volumeText',
    autoUpdateUI: true,
    deviceOptimization: true,
    debug: false
});
```

### アプリの設定（100%問題）
```javascript
window.PitchProConfig.getDefaultConfig({
    volumeBarSelector: '#volume-progress',
    ...
})
```

### PitchProConfigが追加している設定
- `clarityThreshold: 0.4`
- `fftSize: 4096`
- `minVolumeAbsolute: 0.020`
- `minFrequency: 60`
- `maxFrequency: 800`
- `enableHarmonicCorrection: true`
- `harmonicConfig: { enabled: true, historyWindow: 2000, minHistorySize: 8 }`
- `smoothing: 0.1`
- `notifications: { enabled: true, position: 'top-right', theme: 'dark' }`

## 次のステップ
1. アプリの`preparation-pitchpro-cycle.js`で`PitchProConfig`を使わず、テストページと同じシンプルな設定で初期化
2. どの設定が100%問題を引き起こしているか特定
3. 原因となる設定を修正または削除

## 関連ファイル
- `/PitchPro-SPA/js/core/pitchpro-v1.3.6.umd.js` - PitchProライブラリ
- `/PitchPro-SPA/js/core/pitchpro-config.js` - 統一設定モジュール（問題の可能性大）
- `/PitchPro-SPA/pages/js/preparation-pitchpro-cycle.js` - 準備ページ
- `/PitchPro-SPA/pages/js/voice-range-test.js` - 音域テスト
- `/PitchPro-SPA/js/controllers/trainingController.js` - トレーニングページ
- `/PitchPro-SPA/test-callback-volume-fix.html` - デバッグ用テストページ（正常動作確認済み）

## ログファイル
- `/log/log1.txt` - アプリ本体のログ（100%問題発生）
- `/log/log2.txt` - アプリ側テストページのログ（正常動作、最大95.7%）
- `/log/log7.txt` - PitchPro側調査レポート
