# 音域テスト機能 - 詳細仕様書 v3.1

**バージョン**: 3.1.0
**最終更新日**: 2025-01-21
**基準実装**: voice-range-test-demo.js (PitchPro v1.3.0対応版)
**用途**: 音域テスト機能の完全仕様書（理論・実装・UI統合版）

---

## 🎯 目的と概要

### 機能目的
- **ユーザーの快適音域の特定**: 無理なく歌える音域を自動検出
- **個別最適化**: ユーザーに最適な基音を提案
- **トレーニング精度向上**: 音域に適した基音でより効果的な練習を実現
- **シンプルなUX**: 基準音なし・自由発声による直感的な測定方式

### ⚠️ v3.1の主要変更点（最新）
1. **音声連続性チェック**: 測定中の無音検出によるフラグベース失敗判定（0.3秒以上の無音でフラグ設定）
2. **遅延判定方式**: 測定中はフラグのみ設定、3秒完了後に失敗判定を実施
3. **ユーザーメッセージ強化**: 「3秒間継続して発声してください」の明確な指示
4. **失敗フロー全体図**: 連続性チェックを含む完全なフロー図を追加

### v3.0の主要変更点
1. **PitchPro v1.3.0対応**: コンストラクタパターン採用、iPhone/iPad最適化
2. **音量閾値の実証値採用**: 15%（0.15）を標準閾値として確定
3. **詳細なフェーズ管理**: 7段階の状態遷移による精密な制御
4. **測定失敗時の高度な処理**: 3回リトライ、部分結果表示、測定スキップ機能
5. **デバッグ機能の標準化**: リアルタイムデータ表示、統計情報の可視化
6. **UIアイコンのPNG化**: より柔軟なビジュアル表現

---

## 📊 テスト手順

### フェーズ管理システム
```javascript
const measurementPhases = {
  'idle': '待機状態',
  'waiting-for-voice': '音声検出待機（低音）',
  'measuring-low': '低音測定中',
  'idle-low': '低音測定完了・待機',
  'waiting-for-voice-high': '音声検出待機（高音）',
  'measuring-high': '高音測定中',
  'completed': '測定完了'
};
```

### 1. 低音テスト（自由発声方式）
```javascript
const lowRangeTest = {
  testType: 'free_vocalization',    // 自由発声
  instruction: '低音域測定: 声を出してください',
  voiceDetectionThreshold: 0.15,    // 音量閾値 15%（実証値）
  measurementDuration: 3000,        // 3秒間測定

  // 測定データ収集
  dataCollection: {
    recordingPhase: 'measuring-low',
    updateMethod: 'recordMeasurementData()',
    storedData: {
      frequencies: [],      // 周波数履歴
      lowestFreq: null,    // 最低周波数
      lowestNote: null,    // 最低音程
      avgVolume: 0         // 平均音量
    }
  },

  // 失敗時処理
  failureHandling: {
    maxRetries: 3,
    retryDelay: 2000,      // 2秒後に自動リトライ
    skipOption: true,      // 最大リトライ後は高音測定へスキップ

    // 音声連続性チェック（v3.1新機能）
    continuityCheck: {
      enabled: true,
      maxSilentFrames: 10,     // 最大無音フレーム数（約0.3秒）
      silentThreshold: 0.03,   // 音量閾値の20%（0.15 * 0.2 = 0.03）
      judgmentTiming: 'deferred',  // 遅延判定（3秒完了後に判定）
      useFlagBased: true       // フラグベース方式を使用
    }
  }
};
```

#### 実施フロー（実装準拠）
1. **初期状態**: `currentPhase = 'waiting-for-voice'`
2. **音声検出**: 音量が15%を超えたら`startLowPitchMeasurement()`
3. **測定実行**: `runMeasurementPhase(3000, completeLowPitchMeasurement)`
4. **プログレス更新**: requestAnimationFrameによる円形プログレス更新
5. **データ記録**: `recordMeasurementData()`で継続的にデータ収集
   - **連続性チェック（v3.1）**: 音声データの連続性を監視
     - 有効な音声検出 → 無音カウンターリセット
     - 無音検出 → 無音カウンター++
     - 連続10フレーム無音（約0.3秒） → **`hasContinuityFailure`フラグを設定**（測定は継続）
6. **完了判定**: 3秒経過後`completeLowPitchMeasurement()`実行
   - **連続性フラグチェック**: `hasContinuityFailure`が`true`の場合は失敗判定
7. **成功/失敗処理**:
   - 成功: チェックマーク表示 → 高音テストへ
   - 失敗: `handleLowPitchMeasurementFailure()` → リトライまたはスキップ

### 2. 高音テスト（自由発声方式）
```javascript
const highRangeTest = {
  testType: 'free_vocalization',    // 自由発声
  instruction: '高音域測定: 声を出してください',
  voiceDetectionThreshold: 0.15,    // 音量閾値 15%（実証値）
  measurementDuration: 3000,        // 3秒間測定
  idleDuration: 3000,               // 低音→高音間の待機時間

  // 測定データ収集
  dataCollection: {
    recordingPhase: 'measuring-high',
    updateMethod: 'recordMeasurementData()',
    storedData: {
      frequencies: [],      // 周波数履歴
      highestFreq: null,   // 最高周波数
      highestNote: null,   // 最高音程
      avgVolume: 0         // 平均音量
    }
  },

  // 失敗時処理
  failureHandling: {
    maxRetries: 3,
    retryDelay: 2000,
    partialResultSupport: true,  // 低音データのみでも部分結果表示
    fallbackCalculation: 'calculatePartialVoiceRange()',

    // 音声連続性チェック（v3.1新機能）
    continuityCheck: {
      enabled: true,
      maxSilentFrames: 10,
      silentThreshold: 0.03,
      judgmentTiming: 'deferred',  // 遅延判定（3秒完了後に判定）
      useFlagBased: true       // フラグベース方式を使用
    }
  }
};
```

---

## 🔢 音域判定アルゴリズム

### 音程確定条件（実装準拠）
```javascript
// 音程が確定される条件
const pitchConfirmationCriteria = {
  // 基本条件（PitchPro v1.3.0）
  requiredFields: ['result.frequency', 'result.note', 'result.volume'],

  // 音量閾値判定
  volumeThreshold: 0.15,  // 15%以上で有効

  // フェーズ限定記録
  recordingPhases: ['measuring-low', 'measuring-high'],

  // 実装コード
  isValidPitch: (result, globalState) => {
    return result.frequency &&
           result.note &&
           result.volume >= globalState.voiceDetectionThreshold &&
           ['measuring-low', 'measuring-high'].includes(globalState.currentPhase);
  }
};
```

### 快適音域の定義（理論）
```javascript
class VoiceRangeAnalyzer {
  calculateComfortableRange(lowFreq, highFreq) {
    // 快適音域 = 検出音域の80%範囲
    const octaves = Math.log2(highFreq / lowFreq);
    const semitones = Math.round(octaves * 12);

    return {
      lowFreq: lowFreq,
      highFreq: highFreq,
      octaves: parseFloat(octaves.toFixed(2)),
      semitones: semitones,
      range: `${this.frequencyToNote(lowFreq)} - ${this.frequencyToNote(highFreq)}`,
      comfortableOctaves: octaves * 0.8  // 80%を快適範囲とする
    };
  }
}
```

### 推奨基音の算出（理論）
```javascript
class BaseNoteRecommender {
  generateRecommendations(voiceRange) {
    const centerFreq = Math.sqrt(voiceRange.lowFreq * voiceRange.highFreq);  // 幾何平均
    const centerNote = this.frequencyToNote(centerFreq);

    // モード別推奨基音
    return {
      randomMode: this.filterC3Octave(centerNote, voiceRange),     // C3オクターブから選択
      continuousMode: this.generateContinuousRange(centerNote, 8), // 連続8音
      chromaticMode: this.generateFullChromatic(voiceRange)        // 全半音階
    };
  }
}
```

---

## 🎨 UI表示仕様（実装準拠版）

### 音域テストバッジ構造（最新実装）
```html
<div class="voice-range-display-container">
  <!-- 円形プログレスバー（SVG） -->
  <svg class="voice-stability-svg" width="160" height="160" id="stability-ring">
    <circle cx="80" cy="80" r="72" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="16"/>
    <circle cx="80" cy="80" r="72" fill="none" stroke="#3b82f6" stroke-width="16"
            stroke-dasharray="452" stroke-dashoffset="452"
            transform="rotate(-90 80 80)" class="voice-progress-circle"/>
  </svg>

  <!-- 中央アイコン/カウントダウン -->
  <div class="voice-note-badge">
    <!-- PNGアイコン使用（v3.0新機能） -->
    <div id="range-icon" style="display: block;">
      <img src="./icons/arrow-down.png" alt="下向き矢印" style="width: 80px; height: 80px;">
    </div>
    <!-- カウントダウン表示 -->
    <p class="countdown-text" id="countdown-display" style="display: none;">3</p>
  </div>
</div>
```

### アイコン状態管理
```javascript
// 低音測定待機
updateBadgeForWaiting('arrow-down');  // arrow-down.png表示

// 測定中（3秒カウントダウン）
function startCountdown() {
  rangeIcon.style.display = 'none';
  countdownDisplay.style.display = 'block';
  countdownDisplay.textContent = secondsRemaining;
}

// 測定成功
updateBadgeForConfirmed();  // チェックマークアイコン

// 測定失敗
updateBadgeForFailure();    // Xアイコン（Lucide）

// エラー警告
updateBadgeForError();      // 警告三角アイコン（Lucide）
```

### デバッグ表示パネル（v3.0新機能）
```html
<!-- 🧪 テスト用: リアルタイム音域データ表示 -->
<div class="glass-card" id="debug-range-data" style="display: none;">
  <h3>🧪 テスト表示: リアルタイム音域データ</h3>

  <!-- システム状態 -->
  <div class="result-info-container">
    <div class="result-info-row">
      <span>🎛️ 音声検出状態</span>
      <span id="debug-detection-status">待機中</span>
    </div>
  </div>

  <!-- 現在の検出情報 -->
  <div class="result-info-container">
    <div class="result-info-row">
      <span>🎵 現在の音程</span>
      <span id="debug-current-note">-</span>
    </div>
    <div class="result-info-row">
      <span>📊 現在の周波数</span>
      <span id="debug-current-freq">- Hz</span>
    </div>
  </div>

  <!-- 測定範囲情報 -->
  <div class="result-info-container">
    <div class="result-info-row">
      <span>🔽 検出最低音</span>
      <span id="debug-min-note">-</span>
    </div>
    <div class="result-info-row">
      <span>🔼 検出最高音</span>
      <span id="debug-max-note">-</span>
    </div>
  </div>
</div>
```

---

## 🔧 技術実装詳細

### PitchPro v1.3.0 統合設定
```javascript
// v3.0: コンストラクタパターン（setCallbacks廃止）
const audioDetector = new AudioDetectionComponent({
  // UI要素セレクター
  volumeBarSelector: '#range-test-volume-bar',
  volumeTextSelector: '#range-test-volume-text',
  frequencySelector: '#range-test-frequency-value',

  // デバッグ設定
  debugMode: true,  // 開発時のみ有効

  // v1.3.0: コンストラクタでコールバック設定
  onPitchUpdate: (result) => {
    // デバッグデータ更新（常に実行）
    updateDebugData(result);
    // デバッグ表示更新（表示ON時のみ）
    updateDebugDisplay();
    // 音声検出ハンドリング
    handleVoiceDetection(result, audioDetector);
  },

  onError: (error) => {
    console.error('❌ 検出エラー:', error);
  },

  onVolumeUpdate: (volume) => {
    // 音量更新処理（必要に応じて）
  }
});

// 初期化と開始
await audioDetector.initialize();
audioDetector.startDetection();
```

### 測定データ管理構造
```javascript
const globalState = {
  // フェーズ管理
  currentPhase: 'idle',

  // 測定設定
  voiceDetectionThreshold: 0.15,    // 音量閾値 15%
  measurementDuration: 3000,        // 3秒測定
  idleDuration: 3000,               // 待機時間

  // リトライ管理
  retryCount: 0,
  maxRetries: 3,

  // 音声連続性チェック（v3.1新機能）
  silentFrameCount: 0,              // 無音フレームカウンター
  maxSilentFrames: 10,              // 最大無音フレーム数（約0.3秒）
  hasContinuityFailure: false,      // 連続性失敗フラグ（遅延判定用）

  // 測定データ
  measurementData: {
    lowPhase: {
      frequencies: [],
      lowestFreq: null,
      lowestNote: null,
      avgVolume: 0,
      measurementTime: 0
    },
    highPhase: {
      frequencies: [],
      highestFreq: null,
      highestNote: null,
      avgVolume: 0,
      measurementTime: 0
    },
    startTime: null,
    endTime: null
  },

  // デバッグデータ（v3.0新機能）
  debugData: {
    isVisible: false,
    currentNote: null,
    currentFreq: null,
    currentVolume: null,
    detectionCount: 0,
    minFreq: null,
    maxFreq: null,
    minNote: null,
    maxNote: null,
    tempRange: null,
    detectionStatus: '待機中',
    micStatus: '未許可'
  }
};
```

### 統合測定フェーズ実行
```javascript
/**
 * 測定と円形プログレスバーの更新を完全に同期させて実行
 * requestAnimationFrameによる60FPSアニメーション
 */
function runMeasurementPhase(duration, onComplete) {
  const progressCircle = document.querySelector('.voice-progress-circle');
  const startTime = performance.now();

  // プログレスを0%にリセット
  progressCircle.style.transition = 'none';
  updateCircularProgress(0);
  progressCircle.offsetHeight;  // 強制リフロー
  progressCircle.style.transition = 'stroke-dashoffset 0.1s linear';

  function tick(currentTime) {
    const elapsedTime = currentTime - startTime;
    const progress = Math.min((elapsedTime / duration) * 100, 100);

    updateCircularProgress(progress);

    if (elapsedTime < duration) {
      requestAnimationFrame(tick);
    } else {
      updateCircularProgress(100);
      setTimeout(() => {
        if (onComplete) onComplete();
      }, 150);  // アニメーション完了待機
    }
  }

  requestAnimationFrame(tick);
}
```

### エラーハンドリング（高度な失敗処理）
```javascript
// 低音測定失敗時の処理
function handleLowPitchMeasurementFailure() {
  if (globalState.retryCount < globalState.maxRetries) {
    globalState.retryCount++;

    // UIフィードバック
    updateBadgeForFailure();
    document.getElementById('main-status-text').textContent =
      `低音測定失敗 - 再測定します (${globalState.retryCount}/${globalState.maxRetries})`;

    // 自動リトライ
    setTimeout(() => {
      retryLowPitchMeasurement();
    }, 2000);

  } else {
    // 最大リトライ到達 - 高音測定へスキップ
    updateBadgeForError();
    document.getElementById('main-status-text').textContent = '低音測定をスキップします';
    showNotification('低音測定をスキップして高音測定に進みます', 'info');

    setTimeout(() => {
      startHighPitchPhase();
    }, 3000);
  }
}

// 部分的な音域計算（低音データのみ）
function calculatePartialVoiceRange() {
  const lowData = globalState.measurementData.lowPhase;

  return {
    range: `${lowData.lowestNote} 〜 (高音測定失敗)`,
    octaves: '測定不完全',
    lowPitch: {
      frequency: lowData.lowestFreq,
      note: lowData.lowestNote
    },
    highPitch: null,
    measurementQuality: '部分的'
  };
}
```

### 連続性チェック処理（v3.1新機能）

#### フラグベース遅延判定の実装
```javascript
/**
 * 測定データ記録と音声連続性チェック（フラグベース方式）
 * 測定中に音声が途切れた場合はフラグを設定するが、測定は継続
 * 実際の失敗判定は3秒完了後に実施
 */
function recordMeasurementData(result) {
  const currentPhase = globalState.currentPhase;

  // 🎵 v3.1新機能: 測定中のみ音声連続性チェック
  if (currentPhase === 'measuring-low' || currentPhase === 'measuring-high') {
    // 有効な音声データの判定（音量閾値の20%以上）
    const isValidVoice = result.frequency &&
                         result.volume &&
                         result.volume >= globalState.voiceDetectionThreshold * 0.2;

    if (!isValidVoice) {
      // 無音フレームカウント
      globalState.silentFrameCount++;

      if (globalState.silentFrameCount > globalState.maxSilentFrames) {
        // 連続無音検出 → フラグを立てる（即座には中断しない）
        if (!globalState.hasContinuityFailure) {
          console.warn('⚠️ 音声途切れ検出: 連続性失敗フラグを設定');
          console.warn(`📊 無音フレーム数: ${globalState.silentFrameCount}フレーム（約${Math.round(globalState.silentFrameCount * 33)}ms相当）`);
          globalState.hasContinuityFailure = true;
        }
        // 測定は継続（3秒後に判定）
      }
    } else {
      // 有効な音声検出 → カウンターリセット
      globalState.silentFrameCount = 0;
    }
  }

  // データ記録処理（既存ロジック）
  if (!result.frequency || !result.volume) return;

  // 測定フェーズ別データ記録...
}

/**
 * 低音測定完了時の連続性フラグチェック
 * 3秒経過後にフラグを確認し、失敗判定を実施
 */
function completeLowPitchMeasurement() {
  const lowData = globalState.measurementData.lowPhase;
  const dataCount = lowData.frequencies.length;
  const minRequired = 15;
  const hasValidData = dataCount >= minRequired && lowData.lowestFreq !== null;

  // 🎵 v3.1新機能: 連続性失敗フラグをチェック
  const hasContinuityError = globalState.hasContinuityFailure;

  console.log('低音測定データ検証:', {
    'データ数': dataCount,
    '最低必要数': minRequired,
    '最低音': lowData.lowestFreq ? `${lowData.lowestFreq.toFixed(1)} Hz (${lowData.lowestNote})` : 'なし',
    '連続性': hasContinuityError ? '❌ 途切れあり' : '✅ 正常',
    '判定結果': (hasValidData && !hasContinuityError) ? '✅ 成功' : '❌ 失敗'
  });

  if (hasValidData && !hasContinuityError) {
    // 成功処理
    console.log('✅ 低音測定成功');
    // ... 成功処理の続き
  } else {
    // 失敗処理
    console.warn('❌ 低音測定失敗');
    if (hasContinuityError) {
      document.getElementById('sub-info-text').textContent = '3秒間継続して発声してください';
    }
    handleLowPitchMeasurementFailure();
  }
}

/**
 * 測定開始時のフラグリセット
 * 各測定開始時に無音カウンターと連続性フラグをリセット
 */
function startLowPitchMeasurement() {
  // 🎵 v3.1新機能: 無音カウンターと連続性フラグをリセット
  globalState.silentFrameCount = 0;
  globalState.hasContinuityFailure = false;
  console.log('🔄 無音カウンター・連続性フラグリセット完了');

  // ... 測定開始処理の続き
}
```

#### 失敗フロー全体図

```
【測定開始】
  ↓
【無音カウンター・連続性フラグをリセット】
  ↓
【3秒間タイマー開始】
  ↓
【データ収集ループ（30-60FPS）】
  ├─ 音声検出あり
  │  ├─ データ記録
  │  └─ 無音カウンターリセット
  │
  ├─ 音声検出なし（音量 < 閾値の20%）
  │  └─ 無音カウンター++
  │      ↓
  │    【カウンター > 10フレーム？】
  │      ├─ NO → 継続
  │      └─ YES → 【hasContinuityFailure = true】
  │                 ↓
  │               ⚠️ フラグ設定（測定は継続）
  │                 ↓
  │               【データ収集継続】
  │
  └─ 【3秒経過】
      ↓
    completeLowPitchMeasurement()
      ↓
    【連続性フラグチェック】
      ├─ hasContinuityFailure = false → ✅ 成功
      │                                   ↓
      │                                 チェックマーク表示
      │                                   ↓
      │                                 高音測定へ移行
      │
      └─ hasContinuityFailure = true → ❌ 失敗
                                         ↓
                                       失敗メッセージ表示
                                       「3秒間継続して発声してください」
                                         ↓
                                       handleLowPitchMeasurementFailure()
                                         ↓
                                       【リトライ判定】
                                         ├─ リトライ < 3回 → 再測定
                                         └─ リトライ >= 3回 → スキップ
```

---

## 🔍 デバイス最適化（PitchPro v1.3.0）

### デバイス検出と最適化
```javascript
// PitchPro v1.3.0 内蔵のデバイス検出
if (PitchPro.DeviceDetection) {
  const specs = PitchPro.DeviceDetection.getDeviceSpecs();

  // デバイス別最適化設定
  const deviceSettings = {
    'PC': {
      sensitivity: 2.5,
      volumeMultiplier: 4.0,
      description: 'PC最適化設定'
    },
    'iPhone': {
      sensitivity: 3.5,
      volumeMultiplier: 4.5,
      description: 'iPhone最適化設定'
    },
    'iPad': {
      sensitivity: 5.0,
      volumeMultiplier: 7.0,
      description: 'iPad最適化設定'
    }
  };

  console.log(`🎛️ デバイス: ${specs.deviceType} (感度: ${specs.sensitivity}x)`);
}
```

---

## 📈 期待される効果

### ユーザー体験の向上
- **個別最適化**: 各ユーザーの音域に適したトレーニング
- **成功率向上**: 実証済み15%閾値による確実な検出
- **視覚的フィードバック**: 円形プログレスとアイコンによる直感的UI
- **失敗時の配慮**: 自動リトライと部分結果による挫折防止

### 開発者体験の向上（v3.0新機能）
- **デバッグパネル**: リアルタイムデータ確認
- **詳細ログ**: 音程確定条件の可視化
- **統計情報**: 測定品質の定量評価

---

## 📊 測定品質指標

### 測定成功の判定基準
```javascript
const measurementQualityCriteria = {
  excellent: {
    dataCount: '>= 30',
    stabilityRate: '>= 90%',
    retryCount: 0,
    badge: '🏆'
  },
  good: {
    dataCount: '>= 20',
    stabilityRate: '>= 80%',
    retryCount: '<= 1',
    badge: '✅'
  },
  acceptable: {
    dataCount: '>= 15',
    stabilityRate: '>= 70%',
    retryCount: '<= 2',
    badge: '👍'
  },
  partial: {
    dataCount: '< 15',
    stabilityRate: '< 70%',
    retryCount: '>= 3',
    badge: '⚠️'
  }
};
```

---

## 🔄 バージョン管理

### v3.1.0 (2025-01-21) 🆕
- **音声連続性チェック**: 測定中の無音検出によるフラグベース失敗判定機能追加
- **遅延判定方式**: 測定中はフラグのみ設定、3秒完了後に失敗判定を実施
- **無音フレームカウンター**: 最大10フレーム（約0.3秒）の連続無音で`hasContinuityFailure`フラグ設定
- **完了時失敗判定**: `completeLowPitchMeasurement()`および`completeHighPitchMeasurement()`でフラグチェック
- **ユーザーメッセージ強化**: 「3秒間継続して発声してください」の明確な指示
- **失敗フロー全体図**: フラグベース連続性チェックを含む完全なフロー図を追加
- **globalState拡張**: `silentFrameCount`、`maxSilentFrames`、`hasContinuityFailure`プロパティ追加

### v3.0.0 (2025-01-20)
- **PitchPro v1.3.0完全対応**: コンストラクタパターン、デバイス最適化
- **音量閾値確定**: 15%（0.15）を実証値として採用
- **7段階フェーズ管理**: より精密な状態制御
- **高度な失敗処理**: 3回リトライ、部分結果、測定スキップ
- **デバッグ機能標準化**: リアルタイム表示、統計情報
- **UIアイコンPNG化**: 柔軟なビジュアル表現
- **統合測定関数**: requestAnimationFrameによる同期実行

### 今後の拡張予定
- WebGL による高度なビジュアライゼーション
- 機械学習による音域予測
- 複数ユーザープロファイル管理
- 音域履歴のトラッキング

---

**この音域テスト仕様により、理論と実装が統合された高品質な相対音感トレーニング体験を提供します。**
