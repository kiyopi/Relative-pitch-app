# 音域テスト機能 - 詳細仕様書 v3.1

**バージョン**: 3.1.8
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

### ⚠️ v3.1.8の主要変更点（最新）
1. **発声期間計算の根本的修正**: 有効な周波数データ（frequency > 0）のみで発声期間を計算
2. **無音フレーム除外**: 測定ウィンドウ内の無音データを発声期間から完全除外
3. **誤判定の防止**: 1秒発声 + 2秒無音 = 3秒成功という誤判定を根本的に解決
4. **詳細ログ出力**: 全データ数・有効データ数・実際の発声期間を明確に表示
5. **低音・高音測定の両方に適用**: 一貫した期間計算ロジックの確保

### ⚠️ v3.1.7の主要変更点
1. **再試行時の状態リセット**: 低音・高音測定の再試行時にresetVoiceStability()を追加
2. **継続検出タイムスタンプのクリア**: 前回の測定状態が残らないように完全リセット
3. **高音域での1秒成功問題の完全解決**: 再試行時も厳格な基準を適用

### ⚠️ v3.1.6の主要変更点
1. **継続検出を100Hz以下に制限**: 高音域での1秒以内成功を防止
2. **高音域は通常の安定性チェック**: 厳格な基準で高精度測定

### ⚠️ v3.1.5の主要変更点
1. **低音域用の代替基準追加**: 70-100Hzの声を1秒以上継続検出で測定開始
2. **低音域の許容偏差拡大**: 40%に拡大（30% → 40%）
3. **測定開始の確実性向上**: 安定性チェックと継続検出の2つの基準を併用

### ⚠️ v3.1.4の主要変更点
1. **インターバル中の音声検出停止**: 低音測定完了から高音測定開始までの間、音量バー更新を停止

### ⚠️ v3.1.3の主要変更点
1. **実際の発声期間チェック追加**: 最初と最後のデータのタイムスタンプ差を検証
2. **60fps以上での1秒成功を防止**: 最低1.5秒の発声期間を要求
3. **判定基準の厳格化**: データ数・連続性・発声期間の3つを総合判定

### ⚠️ v3.1.2の主要変更点
1. **低音域での周波数安定性チェック緩和**: 100Hz以下で30% → 40%許容偏差
2. **80Hz付近の低音測定開始を確実化**: 低音域特有の周波数揺れに対応
3. **高音域の精度は維持**: 100Hz超は従来通り20%の精度維持

### ⚠️ v3.1.1の主要変更点
1. **最低データ数要件の適正化**: 20個 → 60個に変更（3秒間の測定時間との整合性確保）
2. **理論的根拠の明確化**: Attack(1秒) + Sustain(2秒/60データ) + Release(0.3秒許容)
3. **測定品質の向上**: 2秒間の安定発声を保証（30fps想定）

### ⚠️ v3.1の主要変更点
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

### 測定成功の判定基準（v3.1.1更新）
```javascript
const measurementQualityCriteria = {
  excellent: {
    dataCount: '>= 80',        // 3秒間のうち約2.7秒発声（30fps想定）
    stabilityRate: '>= 90%',
    retryCount: 0,
    badge: '🏆'
  },
  good: {
    dataCount: '>= 60',        // 最低基準（2秒間の安定発声相当）
    stabilityRate: '>= 80%',
    retryCount: '<= 1',
    badge: '✅'
  },
  acceptable: {
    dataCount: '>= 50',        // やや不足（約1.7秒発声）
    stabilityRate: '>= 70%',
    retryCount: '<= 2',
    badge: '👍'
  },
  partial: {
    dataCount: '< 50',         // 不十分（1.7秒未満）
    stabilityRate: '< 70%',
    retryCount: '>= 3',
    badge: '⚠️'
  }
};

// 理論的根拠
// 30fps想定: 3秒 × 30fps = 90フレーム
// 60個 = 90フレーム × 67% = 2秒間の発声相当
// 80個 = 90フレーム × 89% = 2.7秒間の発声相当
```

---

## 🎙️ 発声期間計算ロジック（v3.1.8修正版）

### 問題の背景

v3.1.3で発声期間チェックを追加したが、以下の重大なバグが存在していました：

```javascript
// ❌ 誤った実装（v3.1.7以前）
const firstDataTime = lowData.frequencies[0].timestamp;
const lastDataTime = lowData.frequencies[lowData.frequencies.length - 1].timestamp;
const actualVocalizationDuration = lastDataTime - firstDataTime;
```

**問題点**:
- 全てのデータポイントのタイムスタンプを使用
- 周波数が検出されない無音フレーム（frequency = 0）も含まれる
- 実際の発声: 1秒、その後無音: 2秒 → 計算結果: 3秒（誤）

### v3.1.8の修正内容

```javascript
// ✅ 正しい実装（v3.1.8）
// 有効な周波数データ（frequency > 0）のみをフィルタリング
const validFrequencyData = lowData.frequencies.filter(d => d.frequency && d.frequency > 0);

if (validFrequencyData.length > 0) {
    const firstDataTime = validFrequencyData[0].timestamp;
    const lastDataTime = validFrequencyData[validFrequencyData.length - 1].timestamp;
    actualVocalizationDuration = lastDataTime - firstDataTime;
}

console.log('🔍 発声期間詳細分析:', {
    '全データ数': dataCount,
    '有効データ数': validFrequencyData.length,
    '実際の発声期間': (actualVocalizationDuration / 1000).toFixed(2) + '秒',
    '最低要求期間': (minVocalizationDuration / 1000) + '秒'
});
```

### 期待される効果

**修正前の誤判定例**:
```
ユーザー行動: 1秒発声 → 2秒無音
全データ数: 72個（3秒 × 24fps相当）
計算された期間: 3.07秒
判定: ✅ 成功（誤）
```

**修正後の正確な判定**:
```
ユーザー行動: 1秒発声 → 2秒無音
全データ数: 72個
有効データ数: 24個（1秒分のみ）
計算された期間: 1.0秒
判定: ❌ 失敗（正）
```

### 実装箇所

この修正は以下の2箇所に適用されています：
1. `completeLowPitchMeasurement()` - 低音測定完了時
2. `completeHighPitchMeasurement()` - 高音測定完了時

### 判定基準の整合性

v3.1.8により、3つの判定基準が完全に機能します：
1. **データ数**: 60個以上（2秒間の安定発声）
2. **連続性**: 0.3秒以上の無音なし（hasContinuityFailureフラグ）
3. **発声期間**: 1.5秒以上の実際の発声時間（**有効データのみで計算**）

---

## 🔄 バージョン管理

### v3.1.8 (2025-01-21) 🆕
- **発声期間計算の根本的バグ修正**: 有効な周波数データ（frequency > 0）のみで期間を計算
- **無音フレーム除外**: 測定ウィンドウ内の無音データを発声期間から完全除外
- **誤判定の防止**: 1秒発声 + 2秒無音 = 3秒成功という誤判定を根本的に解決
- **詳細ログ出力追加**: 全データ数・有効データ数・実際の発声期間を明確に表示
- **低音・高音測定の両方に適用**: completeLowPitchMeasurement()とcompleteHighPitchMeasurement()の両方を修正
- **判定基準の完全統合**: データ数・連続性・発声期間の3軸判定が正確に機能

### v3.1.7 (2025-01-21)
- **再試行時の状態リセット**: 低音・高音測定の再試行時にresetVoiceStability()を追加
- **継続検出タイムスタンプのクリア**: 前回の測定状態が残らないように完全リセット
- **高音域での1秒成功問題の完全解決**: 再試行時も厳格な基準を適用

### v3.1.6 (2025-01-21)
- **継続検出を100Hz以下に制限**: 高音域での1秒以内成功を防止
- **高音域は通常の安定性チェック**: 厳格な基準で高精度測定

### v3.1.5 (2025-01-21)
- **低音域用の代替基準追加**: 70-100Hzの声を1秒以上継続検出で測定開始
- **低音域の許容偏差拡大**: 40%に拡大（30% → 40%）
- **測定開始の確実性向上**: 安定性チェックと継続検出の2つの基準を併用

### v3.1.4 (2025-01-21)
- **インターバル中の音声検出停止**: 低音測定完了から高音測定開始までの間、音量バー更新を停止

### v3.1.3 (2025-01-21)
- **実際の発声期間チェック追加**: timestampを利用した実発声時間の検証機能実装（⚠️ バグあり - v3.1.8で修正）
- **60fps以上環境での誤検出防止**: データ数のみの判定では1秒で成功してしまう問題を修正
- **最低発声期間の設定**: 1.5秒以上の連続発声を要求（3秒測定の50%）
- **判定基準の3軸化**: データ数（60個以上）・連続性（0.3秒以上の無音なし）・発声期間（1.5秒以上）
- **ログ出力の拡充**: 発声期間と期間判定結果を追加表示
- **低音・高音測定の両方に適用**: 一貫した品質基準の確保

### v3.1.2 (2025-01-21)
- **低音域の周波数安定性チェック緩和**: 100Hz以下で許容偏差を20% → 30%に拡大
- **低音域対応の理論的根拠**: 低音は物理的に周波数が揺れやすい特性を考慮
- **80Hz付近での測定開始を確実化**: 低音域での測定失敗を大幅に削減
- **高音域の精度維持**: 100Hz超は従来通り20%の許容偏差を維持
- **ログ出力の改善**: deviationRateを表示し、適用された基準を明確化

### v3.1.1 (2025-01-21)
- **最低データ数要件の適正化**: `minRequiredDataPoints: 20 → 60`に変更
- **理論的根拠の明確化**: Attack(1秒) + Sustain(2秒/60データ) + Release(0.3秒許容)
- **3秒間測定との整合性確保**: 2秒間の安定発声を保証（30fps想定で67%発声率）
- **測定品質指標の更新**: 新基準に基づく品質判定基準の見直し
- **一般的な音域測定標準との整合**: ToneGym等の3秒標準、他ツールの1-2秒安定発声要件を考慮

### v3.1.0 (2025-01-21)
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
