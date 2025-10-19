# AudioDetectionComponent - 完全ドキュメント

**バージョン**: 2.0.0  
**作成日**: 2025年1月7日  
**更新日**: 2025年1月7日  
**用途**: PitchPro.jsライブラリの統一音響検出コンポーネント

---

## 📋 概要

AudioDetectionComponentは、PitchPro.jsライブラリをベースとした統一音響検出システムです。Web Audio APIを使用して高精度な音程・音量・音名の検出を行い、UI要素の自動更新機能を提供します。

### 🎯 主要特徴

- **UI自動更新**: セレクター指定によるDOM要素の自動更新
- **マルチデバイス対応**: PC/iPhone/iPad の自動最適化
- **iPadOS 13+完全対応**: タッチデバイス検出の完全実装
- **高精度検出**: FFT解析による正確な音程検出
- **統一API**: 一貫性のあるシンプルなAPI設計

---

## 🚀 基本使用方法

### 1. 基本的な初期化

```javascript
// 最小構成
const audioDetector = new AudioDetectionComponent();
await audioDetector.initialize();

// UI自動更新付き
const audioDetector = new AudioDetectionComponent({
    frequencySelector: '#frequency-display',
    noteSelector: '#note-display',
    volumeBarSelector: '#volume-bar',
    volumePercentSelector: '#volume-percent'
});
await audioDetector.initialize();
```

### 2. 検出の開始と停止

```javascript
// 検出開始
const success = audioDetector.startDetection();
if (success) {
    console.log('検出開始成功');
}

// 検出停止
audioDetector.stopDetection();

// リソース解放
audioDetector.dispose();
```

### 3. コールバック設定

```javascript
// 基本コールバック
audioDetector.setCallbacks({
    onPitchUpdate: (result) => {
        console.log('周波数:', result.frequency);
        console.log('音名:', result.note);
        console.log('音量:', result.volume);
        console.log('明瞭度:', result.clarity);
    },
    onError: (error) => {
        console.error('エラー:', error);
    }
});

// UI自動更新無効化
audioDetector.setCallbacks({
    onPitchUpdate: (result) => {
        // カスタム処理のみ
    }
}, { disableAutoUI: true });
```

---

## 🔧 設定オプション

### コンストラクタオプション

```javascript
const options = {
    // 音響設定
    fftSize: 4096,              // FFTサイズ
    clarityThreshold: 0.4,      // 明瞭度閾値（v1.1.8最適化値）
    minVolumeAbsolute: 0.003,   // 最小音量閾値（v1.1.8最適化値）
    debug: true,                // デバッグモード
    autoUpdateUI: true,         // UI自動更新
    uiUpdateInterval: 33,       // UI更新間隔(ms)
    
    // マイク設定
    echoCancellation: false,     // エコーキャンセレーション
    noiseSuppression: false,     // ノイズサプレッション
    autoGainControl: false,      // 自動ゲインコントロール
    
    // UI自動更新用セレクター
    frequencySelector: '#freq',  // 周波数表示要素
    noteSelector: '#note',       // 音名表示要素
    volumeBarSelector: '#vol-bar', // 音量バー要素
    volumeTextSelector: '#vol-text' // 音量テキスト表示要素
};

const audioDetector = new AudioDetectionComponent(options);
```

### デバイス別自動最適化

```javascript
// 自動検出されるデバイス設定
PC: {
    sensitivityMultiplier: 2.5,
    volumeBarScale: 3.0
}

iPhone: {
    sensitivityMultiplier: 3.5,
    volumeBarScale: 4.5
}

iPad: {
    sensitivityMultiplier: 5.0,
    volumeBarScale: 7.0
}
```

---

## 📊 結果データ構造

### onPitchUpdate コールバックの result オブジェクト

```javascript
{
    frequency: 440.0,        // 周波数 (Hz)
    note: "A4",              // 音名とオクターブ
    volume: 0.1234,          // 音量 (0.0-1.0)
    clarity: 0.85,           // 明瞭度 (0.0-1.0)
    timestamp: 1641234567890 // タイムスタンプ
}
```

### getStatus() メソッドの戻り値

```javascript
{
    isDetecting: true,                    // 検出中かどうか
    deviceType: "iPad",                  // 検出されたデバイス
    volumeBarScale: 7.0,                 // 音量バー倍率
    sensitivityMultiplier: 5.0,          // 感度倍率
    hasCallback: true                    // コールバック設定済みかどうか
}
```

---

## 🎨 UI自動更新機能

### HTML要素の要件

```html
<!-- 周波数表示 -->
<span id="frequency-display">-- Hz</span>

<!-- 音名表示 -->
<span id="note-display">--</span>

<!-- 音量パーセント表示 -->
<span id="volume-percent">0.0%</span>

<!-- 音量バー -->
<div class="progress-bar">
    <div id="volume-bar" class="progress-fill" style="width: 0%;"></div>
</div>
```

### 更新される内容

- **周波数**: `"440.1 Hz"` 形式で表示
- **音名**: `"A4"`, `"C#3"` 等の形式で表示
- **音量パーセント**: `"45.2%"` 形式で表示
- **音量バー**: style.width プロパティが更新される

---

## 🔍 デバイス検出ロジック

### iPadOS 13+ 完全対応

```javascript
// 検出メソッド
const isIPhone = /iPhone/.test(userAgent);
const isIPad = /iPad/.test(userAgent);
const isIPadOS = /Macintosh/.test(userAgent) && 'ontouchend' in document;
const hasIOSNavigator = /iPad|iPhone|iPod/.test(userAgent);
const hasIOSPlatform = /iPad|iPhone|iPod/.test(navigator.platform || '');

// 最終判定
const isIOS = isIPhone || isIPad || isIPadOS || hasIOSNavigator || hasIOSPlatform;
```

### デバイス別最適化理由

- **PC**: 標準的な音声入力、適度な感度調整
- **iPhone**: モバイルマイクの特性に合わせた高感度設定
- **iPad**: より大きなデバイス、最高感度での最適化

---

## 🛠 高度な使用例

### 1. カスタムUI更新

```javascript
const audioDetector = new AudioDetectionComponent({
    // セレクター指定なしで初期化
});

await audioDetector.initialize();

audioDetector.setCallbacks({
    onPitchUpdate: (result) => {
        // カスタムUI更新
        updateCustomFrequencyDisplay(result.frequency);
        updateCustomVolumeBar(result.volume);
        
        // 音域チェック
        if (result.frequency > 0 && result.frequency < 200) {
            document.getElementById('range-warning').style.display = 'block';
        }
    }
}, { disableAutoUI: true }); // 自動UI更新を無効化
```

### 2. 音域テスト実装

```javascript
class VoiceRangeTest {
    constructor() {
        this.audioDetector = new AudioDetectionComponent({
            clarityThreshold: 0.5,
            minVolumeAbsolute: 0.001
        });
        
        this.detectedNotes = [];
        this.testPhase = 'low'; // 'low' | 'high' | 'complete'
    }
    
    async initialize() {
        await this.audioDetector.initialize();
        
        this.audioDetector.setCallbacks({
            onPitchUpdate: (result) => {
                if (result.frequency > 0 && result.clarity > 0.6) {
                    this.analyzeNote(result);
                }
            }
        });
    }
    
    analyzeNote(result) {
        const frequency = result.frequency;
        const note = result.note;
        
        if (this.testPhase === 'low' && frequency < 300) {
            this.recordLowNote(note, frequency);
        } else if (this.testPhase === 'high' && frequency > 300) {
            this.recordHighNote(note, frequency);
        }
    }
    
    startTest() {
        this.audioDetector.startDetection();
    }
    
    stopTest() {
        this.audioDetector.stopDetection();
    }
}

// 使用例
const rangeTest = new VoiceRangeTest();
await rangeTest.initialize();
rangeTest.startTest();
```

### 3. リアルタイム楽器チューナー

```javascript
class InstrumentTuner {
    constructor(targetNote = 'A4', targetFreq = 440.0) {
        this.targetNote = targetNote;
        this.targetFreq = targetFreq;
        this.tolerance = 5.0; // Hz
        
        this.audioDetector = new AudioDetectionComponent({
            frequencySelector: '#tuner-frequency',
            noteSelector: '#tuner-note',
            clarityThreshold: 0.7
        });
    }
    
    async initialize() {
        await this.audioDetector.initialize();
        
        this.audioDetector.setCallbacks({
            onPitchUpdate: (result) => {
                if (result.frequency > 0) {
                    this.updateTunerStatus(result);
                }
            }
        });
    }
    
    updateTunerStatus(result) {
        const diff = result.frequency - this.targetFreq;
        const diffCents = Math.round(1200 * Math.log2(result.frequency / this.targetFreq));
        
        let status = 'sharp';
        if (Math.abs(diff) < this.tolerance) {
            status = 'in-tune';
        } else if (diff < 0) {
            status = 'flat';
        }
        
        // UI更新
        this.updateTunerDisplay(result.frequency, diffCents, status);
    }
    
    updateTunerDisplay(frequency, cents, status) {
        document.getElementById('tuner-cents').textContent = cents > 0 ? `+${cents}` : cents;
        document.getElementById('tuner-status').className = `tuner-status ${status}`;
        
        // 針の位置更新（-50〜+50セント）
        const needlePosition = Math.max(-50, Math.min(50, cents));
        document.getElementById('tuner-needle').style.transform = 
            `rotate(${needlePosition * 1.8}deg)`; // -90〜+90度
    }
}

// 使用例
const tuner = new InstrumentTuner('A4', 440.0);
await tuner.initialize();
tuner.audioDetector.startDetection();
```

---

## 🔧 トラブルシューティング

### 1. マイクアクセス権限問題

```javascript
try {
    await audioDetector.initialize();
} catch (error) {
    if (error.message.includes('Permission denied')) {
        alert('マイクロフォンのアクセス許可が必要です。ブラウザ設定を確認してください。');
    }
}
```

### 2. 音量バーが反応しない

```javascript
// 音量閾値の調整
const audioDetector = new AudioDetectionComponent({
    minVolumeAbsolute: 0.0001, // より低い閾値に設定
    volumeBarSelector: '#volume-bar'
});
```

### 3. iPadで検出されない

```javascript
// デバイス情報の確認
const status = audioDetector.getStatus();
console.log('検出されたデバイス:', status.deviceType);
console.log('感度設定:', status.sensitivityMultiplier);

// 手動でiPad設定を強制
audioDetector.volumeBarScale = 7.0;
```

### 4. 周波数検出が不安定

```javascript
// より厳しい明瞭度設定
const audioDetector = new AudioDetectionComponent({
    clarityThreshold: 0.8, // より高い明瞭度を要求
    smoothing: 0.2,        // より強いスムージング
    fftSize: 8192         // より高い解像度
});
```

---

## 📚 APIリファレンス

### コンストラクタ

#### `new AudioDetectionComponent(options)`

AudioDetectionComponentの新しいインスタンスを作成します。

**パラメータ:**
- `options` (Object, optional): 設定オプション

**戻り値:**
- AudioDetectionComponentインスタンス

### メソッド

#### `async initialize()`

システムを初期化し、マイクアクセス権限を取得します。

**戻り値:**
- Promise<boolean>: 初期化成功時はtrue

#### `startDetection()`

音程検出を開始します。

**戻り値:**
- boolean: 開始成功時はtrue

#### `stopDetection()`

音程検出を停止します。

#### `setCallbacks(callbacks, options)`

コールバック関数を設定します。

**パラメータ:**
- `callbacks` (Object): コールバック関数オブジェクト
  - `onPitchUpdate` (Function): 音程更新コールバック
  - `onError` (Function): エラーコールバック
- `options` (Object, optional): オプション設定
  - `disableAutoUI` (boolean): UI自動更新を無効化

#### `getStatus()`

現在のシステム状態を取得します。

**戻り値:**
- Object: ステータス情報オブジェクト

#### `dispose()`

リソースを解放し、システムをクリーンアップします。

---

## 📈 パフォーマンスと制限事項

### パフォーマンス

- **CPU使用率**: 1-3% (現代的なブラウザ)
- **メモリ使用量**: 約10-20MB
- **レイテンシ**: 10-50ms (デバイス依存)
- **更新頻度**: 約60Hz (ブラウザのrequestAnimationFrame依存)

### 制限事項

- **HTTPS必須**: マイクアクセスにはHTTPS環境が必要
- **ブラウザ対応**: Chrome 66+, Firefox 60+, Safari 11+推奨
- **同時インスタンス**: 1アプリケーションにつき1インスタンス推奨
- **バックグラウンド**: タブが非アクティブ時は検出が一時停止される場合あり

---

## 🎯 ベストプラクティス

### 1. 適切な初期化順序

```javascript
// ✅ 推奨
const audioDetector = new AudioDetectionComponent(options);
await audioDetector.initialize();
audioDetector.setCallbacks(callbacks);
const success = audioDetector.startDetection();

// ❌ 非推奨
const audioDetector = new AudioDetectionComponent(options);
audioDetector.startDetection(); // 初期化前の開始
```

### 2. エラーハンドリング

```javascript
// ✅ 推奨
try {
    await audioDetector.initialize();
    const success = audioDetector.startDetection();
    if (!success) {
        throw new Error('検出開始に失敗しました');
    }
} catch (error) {
    console.error('AudioDetectionComponent エラー:', error);
    // ユーザーにエラーメッセージを表示
}
```

### 3. リソース管理

```javascript
// ページ離脱時のクリーンアップ
window.addEventListener('beforeunload', () => {
    if (audioDetector) {
        audioDetector.dispose();
    }
});

// React等のSPAでは適切なクリーンアップ
useEffect(() => {
    return () => {
        audioDetector?.dispose();
    };
}, []);
```

### 4. UI設計のベストプラクティス

```javascript
// UI自動更新と手動更新の使い分け
const audioDetector = new AudioDetectionComponent({
    // 標準的な表示は自動更新
    frequencySelector: '#frequency',
    noteSelector: '#note',
    volumeBarSelector: '#volume-bar'
});

audioDetector.setCallbacks({
    onPitchUpdate: (result) => {
        // カスタム処理のみ手動実装
        updateSpecialVisualization(result);
        updateAnalyticsData(result);
    }
});
```

---

## 🔄 バージョン履歴

### v2.0.0 (2025-01-07)
- UI自動更新機能の完全実装
- iPadOS 13+完全対応
- デバイス別最適化の自動設定
- test-ui-integration.html準拠の統一実装
- 90%のコード重複問題解決

### v1.0.0 (2025-01-06)
- 初期実装
- PitchPro.js統合
- 基本的な音程検出機能

---

## 📞 サポート・お問い合わせ

AudioDetectionComponentに関するお問い合わせやバグレポートは、プロジェクトリポジトリのIssuesページまでお願いします。

**リポジトリ**: https://github.com/kiyopi/Relative-pitch-app  
**ドキュメント**: 本ファイル  
**テストページ**: `pitchpro-complete-demo.html`

---

**このドキュメントは、AudioDetectionComponentの完全な使用方法とベストプラクティスを提供し、効率的な音響アプリケーション開発を支援します。**