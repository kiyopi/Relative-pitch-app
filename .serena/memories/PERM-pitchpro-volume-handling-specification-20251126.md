# PitchPro 音量処理仕様（永久リファレンス）

## 目的
PitchProの音量処理ロジックを文書化し、今後の調査時間を削減する。

## バージョン
- PitchPro v1.3.5
- 日付: 2025-11-26

## デバイス別設定値

### getDeviceOptimizations()
```javascript
static getDeviceOptimizations(e,t){
    switch(e){
        case"iPad":
            return{
                sensitivity: 4,
                noiseGate: 0.06,
                volumeMultiplier: 2,
                smoothingFactor: 0.1
            };
        case"iPhone":
            return{
                sensitivity: 3.5,
                noiseGate: 0.06,
                volumeMultiplier: 2,
                smoothingFactor: 0.1
            };
        case"PC":
        default:
            return{
                sensitivity: 1.7,
                noiseGate: 0.023,
                volumeMultiplier: 2.5,
                smoothingFactor: 0.1
            };
    }
}
```

### デフォルト設定（getDefaultSpecs）
```javascript
{
    deviceType: "PC",
    isIOS: false,
    sensitivity: 1.7,
    noiseGate: 0.06,
    volumeMultiplier: 3,
    smoothingFactor: 0.1,
    divisor: 6,
    gainCompensation: 1,
    noiseThreshold: 7
}
```

## 設定項目の説明

### sensitivity（感度）
- マイク入力のゲイン倍率
- GainNodeのgain値として使用
- iPad: 4倍（マイク感度が低い）
- iPhone: 3.5倍
- PC: 1.7倍

### noiseGate（ノイズゲート）
- 環境ノイズ除去の閾値
- iPad/iPhone: 0.06（6%以下をカット）
- PC: 0.023（2.3%以下をカット）

### volumeMultiplier（音量表示倍率）
- UI表示用の音量スケーリング
- iPad/iPhone: 2倍
- PC: 2.5倍
- **重要**: これはPitchPro内部で使用され、result.volumeは既に正規化された値

### smoothingFactor（平滑化係数）
- 全デバイス共通: 0.1
- 音量変動を滑らかにする

## autoUpdateUI設定

### autoUpdateUI: true の動作
- PitchProが直接DOM要素を更新
- volumeBarSelector, volumeTextSelector, frequencySelectorを使用
- result.volumeの値をそのままパーセント表示
- **推奨設定**

### autoUpdateUI: false の動作
- PitchProはDOM更新しない
- コールバックでresult.volumeを受け取り、アプリ側で更新
- **問題**: 各ページで実装が異なると不整合発生

## 音量計算の正しい理解

### result.volumeの値
- 0〜1の範囲（正規化済み）
- PitchPro内部でvolumeMultiplierを適用済み
- 実際の発声時: 0.3〜0.6程度

### 表示用パーセント変換
```javascript
// 正しい計算（シンプル）
const displayPercent = result.volume * 100;
// 例: result.volume=0.45 → 45%表示
```

### 間違った計算
```javascript
// NG: 二重にmultiplierを掛けている
const displayPercent = result.volume * multiplier * 100;
// 結果: 100%超えで即座にマックス
```

## iOS Safari既知バグ

### WebKit Bug 230902
- getUserMedia()を複数回呼び出すと音量が半減
- AudioDetectorを破棄→再作成でトリガー
- **対策**: AudioDetectorは破棄せず、MediaStreamを保持

### 影響
- フッターホーム→準備ページ再開時に発生
- 音量バーが半分程度しか動かなくなる

### 対策
- cleanupAudioDetectorForHome()のような破棄処理を使わない
- ナビゲーション時もMediaStreamを維持
- 必要ならstopDetection()のみで停止

## 実装推奨事項

1. **autoUpdateUI: true を使用**
   - PitchProに任せることで統一性確保
   
2. **セレクター設定を正確に**
   - volumeBarSelector: 音量バー要素
   - volumeTextSelector: パーセント表示要素
   - frequencySelector: 周波数表示要素

3. **AudioDetector破棄を避ける**
   - iOS Safariバグ回避のため
   - ナビゲーション時はstopDetection()のみ

4. **デバイス検出はPitchProに任せる**
   - DeviceDetectorが自動判定
   - 手動で設定しない
