# 音量バー統合仕様書 (VOLUME_BAR_INTEGRATION_SPECIFICATION)

**バージョン**: 1.3.0
**最終更新**: 2025-01-25
**作成者**: Claude Code

## 変更履歴

- **v1.3.0 (2025-01-25)**: 音量テスト廃止に伴う仕様更新
  - 準備ページの音量スライダー削除に伴い、v1.1.0の永続化機能は廃止
  - 設定ページのティックスライダー（`pitchpro_base_note_volume_offset`）に統合
  - 詳細: `/specifications/VOLUME_TEST_REMOVAL_HISTORY.md`
- **v1.2.0 (2025-11-23)**: iOS Safari AudioSession関連情報追加
  - 関連仕様書への参照追加: `IOS_SAFARI_AUDIO_SESSION_SPECIFICATION.md`
  - iOS Safariでマイクアクティブ時に音量が小さくなる問題（WebKit Bug #218012）の対策情報
- **v1.1.0 (2025-11-22)**: 基音再生音量の永続化機能追加（Issue #2対応）- **廃止**
- **v1.0.0 (2025-01-07)**: 初版作成  

## 🎯 概要

PitchProライブラリと音量バー表示システムの統合仕様書。VolumeBarControllerコンポーネントを使用した統一音量制御システムの実装方法を定義。

---

## 🔊 基音再生音量の永続化 (v1.3.0更新)

### 概要

**v1.3.0（2025-01-25）で大幅変更**: 準備ページの音量スライダーは削除され、設定ページのティックスライダーに統合されました。

### 変更の経緯

**v1.1.0（廃止）**: 準備ページに音量スライダーがあり、`pitchpro_volume_percent`（0-100%）で保存
**v1.3.0（現行）**: 設定ページのティックスライダー（-20, -10, 0, +10, +20）で`pitchpro_base_note_volume_offset`に保存

**削除理由**: 準備ページとトレーニングページで環境差があり、音量が異なる問題が発生したため。
**詳細**: `/specifications/VOLUME_TEST_REMOVAL_HISTORY.md`、`/specifications/BASE_NOTE_PLAYBACK_SPECIFICATION.md`を参照。

### 現在の実装（v1.3.0）

#### 1. 保存形式

```javascript
// localStorageキー
const BASE_NOTE_VOLUME_KEY = 'pitchpro_base_note_volume_offset';

// 保存値: -20, -10, 0, +10, +20 のdB値
// 0 = デバイスデフォルト音量（オフセットなし）
```

#### 2. 実装箇所

| ファイル | 役割 |
|---------|------|
| `pages/js/settings-controller.js` | 音量オフセット保存・ティックスライダー制御 |
| `js/controllers/trainingController.js` | オフセット取得・音量適用 |
| `pages/js/preparation-pitchpro-cycle.js` | PitchShifter初期化時にオフセット適用 |
| `js/router.js` | バックグラウンド初期化時にオフセット適用 |

#### 3. ヘルパー関数

```javascript
// 音量オフセットを取得
function getBaseNoteVolumeOffset() {
    const KEY = 'pitchpro_base_note_volume_offset';
    try {
        const saved = localStorage.getItem(KEY);
        if (saved !== null) {
            const parsed = parseInt(saved, 10);
            if (!isNaN(parsed) && parsed >= -20 && parsed <= 20) {
                return parsed;
            }
        }
    } catch (e) {
        console.warn('⚠️ 音量オフセット読み込み失敗:', e);
    }
    return 0; // デフォルト値（オフセットなし）
}

// 保存済み音量設定を取得（dB値）
function getSavedVolumeDb() {
    const baseVolume = window.DeviceDetector?.getDeviceVolume() ?? -6;
    const volumeOffset = getBaseNoteVolumeOffset();
    return baseVolume + volumeOffset;
}
```

---

## ⚠️ 重要な注意事項

### 音量値取得方法（重要）

**❌ 間違った実装（動作しない）:**
```javascript
// PitchDetectorインスタンスの内部プロパティに直接アクセス（存在しないか更新されない）
const rawVolume = pitchProInstance.rawVolume || 0;
const currentVolume = pitchProInstance.currentVolume || 0;
const stableVolume = pitchProInstance.stableVolume || 0;
```

**✅ 正しい実装（動作する）:**
```javascript
// コールバック方式でresult.volumeから取得
pitchDetector.setCallbacks({
    onPitchUpdate: (result) => {
        if (result && result.volume !== undefined) {
            const volume = result.volume; // この値を使用
            // 音量バー更新処理
        }
    }
});
```

## 🔧 VolumeBarController仕様

### 基本構造

```javascript
class VolumeBarController {
    // デバイス別最適設定（実機テスト済み）
    detectDevice() {
        // PC: 感度2.5x、音量バー4.0x
        // iPhone: 感度3.5x、音量バー4.5x
        // iPad: 感度5.0x、音量バー7.0x
    }
    
    // 音量計算式
    calculateVolume(rawVolume) {
        return rawVolume * volumeBarScale * sensitivityMultiplier;
    }
}
```

### 必須オプション

```javascript
const controller = new VolumeBarController({
    updateInterval: 50,          // 20fps更新
    enableSmoothing: false,      // スムージング無効（推奨）
    debugMode: false,            // 本番では無効
    autoDetectDevice: true       // デバイス自動検出
});
```

## 📱 デバイス別設定（実機テスト済み）

### PC環境
```javascript
{
    deviceType: 'PC',
    sensitivityMultiplier: 2.5,
    volumeBarScale: 4.0,
    // 総合増幅: 2.5 × 4.0 = 10倍
}
```

### iPhone環境
```javascript
{
    deviceType: 'iPhone',
    sensitivityMultiplier: 3.5,
    volumeBarScale: 4.5,
    // 総合増幅: 3.5 × 4.5 = 15.75倍
}
```

### iPad環境
```javascript
{
    deviceType: 'iPad',
    sensitivityMultiplier: 5.0,
    volumeBarScale: 7.0,
    // 総合増幅: 5.0 × 7.0 = 35倍
}
```

### 共通設定
```javascript
{
    volumeThreshold: 1.5,        // 音量閾値（全デバイス共通）
    clarityThreshold: 0.6,       // 明瞭度閾値（全デバイス共通）
}
```

## 🚀 実装パターン

### パターン1: シンプル実装
```javascript
// 1行での初期化と開始
const controller = await VolumeBarController.createSimple(['volume-bar-1']);
await controller.start();
```

### パターン2: 詳細実装
```javascript
const controller = new VolumeBarController({
    enableSmoothing: false,
    debugMode: true
});

// 音量バー登録
controller.addVolumeBar('main-bar', 'volume-bar-element');

// カスタムコールバック
controller.onVolumeUpdate = (data) => {
    console.log(`音量: ${data.processed}%`);
};

// 初期化と開始
await controller.initialize();
await controller.start();
```

## 📊 HTML構造要件

### 基本的な音量バー構造
```html
<div id="volume-bar-1">
    <div class="flex items-center gap-3">
        <i data-lucide="volume-2" class="text-yellow-300"></i>
        <div class="progress-bar flex-1">
            <div class="progress-fill gradient-catalog-green" style="width: 0%;"></div>
        </div>
        <span class="volume-percent text-sm text-white-60">0.0%</span>
    </div>
</div>
```

### 必要なCSSクラス
- `.progress-fill` または `.volume-progress` または `[data-volume-bar]` - プログレスバー
- `.volume-text` または `.volume-percent` または `[data-volume-text]` - パーセント表示

## 🔄 PitchPro統合手順

### 1. PitchPro初期化（推奨設定）
```javascript
const audioManager = new window.PitchPro.AudioManager({
    sampleRate: 44100,
    channelCount: 1,
    echoCancellation: false,
    noiseSuppression: false,
    autoGainControl: false,
    // iOS向け追加設定
    googAutoGainControl: false,
    googNoiseSuppression: false,
    mozAutoGainControl: false,
    mozNoiseSuppression: false
});

const pitchDetector = new window.PitchPro.PitchDetector(audioManager, {
    fftSize: 4096,
    smoothing: 0.1,
    clarityThreshold: 0.6,
    minVolumeAbsolute: 0.01
});
```

### 2. コールバック設定（重要）
```javascript
pitchDetector.setCallbacks({
    onPitchUpdate: (result) => {
        if (result && result.volume !== undefined) {
            // 重要: result.volumeを使用
            const volume = calculateVolume(result.volume);
            updateVolumeBar(volume);
        }
    },
    onError: (error) => {
        console.error('音程検出エラー:', error);
    }
});
```

### 3. 音量計算
```javascript
function calculateVolume(rawVolume) {
    const deviceSpecs = detectDevice();
    return rawVolume * deviceSpecs.volumeBarScale * deviceSpecs.sensitivityMultiplier;
}
```

## ⚠️ トラブルシューティング

### 音量バーが動かない場合

1. **音量値取得の確認**
   ```javascript
   // デバッグ用：音量値を確認
   pitchDetector.setCallbacks({
       onPitchUpdate: (result) => {
           console.log('Raw volume:', result.volume);
           console.log('Processed volume:', calculateVolume(result.volume));
       }
   });
   ```

2. **コールバック設定の確認**
   - `result.volume`が`undefined`でないか確認
   - コールバックが正しく呼ばれているか確認

3. **DOM要素の確認**
   - `.progress-fill`クラスの要素が存在するか確認
   - `style.width`が正しく設定されているか確認

### 感度が不適切な場合

```javascript
// リアルタイム感度調整
controller.updateDeviceSpecs({
    volumeBarScale: 5.0  // 感度を上げる
});
```

## 📝 実装チェックリスト

- [ ] PitchProライブラリの読み込み確認
- [ ] VolumeBarControllerの読み込み確認
- [ ] HTML構造の準備（progress-bar, volume-percent）
- [ ] コールバック方式での音量取得実装
- [ ] デバイス別設定の適用
- [ ] エラーハンドリングの実装
- [ ] デバッグモードでの動作確認
- [ ] 実機テスト（PC/iPhone/iPad）

## 🔧 デバッグ機能

### デバッグ情報取得
```javascript
const debugInfo = controller.getDebugInfo();
console.log(debugInfo);
// 出力例:
// {
//   isActive: true,
//   currentVolume: "45.3%",
//   deviceSpecs: { deviceType: "PC", volumeBarScale: 4.0 },
//   lastPitchResult: { volume: 0.453, frequency: 440.0, note: "A4" }
// }
```

### コンソールログ有効化
```javascript
const controller = new VolumeBarController({
    debugMode: true  // 詳細ログを出力
});
```

## 📚 参考実装

- **シンプル実装例**: `/test-volume-controller.html`
- **統合テスト例**: `/test-ui-integration.html`
- **コンポーネントテスト例**: `/Bolt/v2/pages/volume-bar-test.html`

---

## 🔗 関連仕様書

| 仕様書 | 関連内容 |
|--------|----------|
| `IOS_SAFARI_AUDIO_SESSION_SPECIFICATION.md` | iOS Safari特有の音量問題（WebKit Bug #218012）対策 |
| `TRAINING_SPECIFICATION.md` | 基音再生音量の永続化機能、トレーニングフロー |
| `MICROPHONE_BACKGROUND_RESILIENCE.md` | マイクバックグラウンド復帰仕様 |

### iOS Safari音量問題について

iOS Safariでは、マイクがアクティブな状態で音声を再生すると音量が極端に小さくなる問題があります（WebKit Bug #218012）。詳細は`IOS_SAFARI_AUDIO_SESSION_SPECIFICATION.md`を参照してください。

---

**重要**: この仕様書に従って実装することで、全デバイスでの安定した音量バー動作を保証できます。特に音量値取得方法（コールバック方式）の遵守が必須です。
