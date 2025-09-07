# 音域テスト機能 - 詳細仕様書

**バージョン**: 2.1.0  
**作成日**: 2025-09-04  
**更新日**: 2025-01-07  
**用途**: preparation.htmlページの音域テスト機能詳細仕様（test-voice-range.html実装準拠版）

---

## 🎯 目的と概要

### 機能目的
- **ユーザーの快適音域の特定**: 無理なく歌える音域を自動検出
- **個別最適化**: ユーザーに最適な基音を提案
- **トレーニング精度向上**: 音域に適した基音でより効果的な練習を実現
- **シンプルなUX**: 基準音なし・自由発声による直感的な測定方式

### ⚠️ 重要な実装仕様（v2.1.0での変更点）
1. **基準音は使用しない**: ユーザーが自由に発声する方式
2. **3秒間安定性判定**: 標準偏差による安定性判定（実測テストで最適値を決定予定）
3. **音程・周波数表示あり**: テストページでは詳細情報表示
4. **自動再測定**: 不安定な場合は自動的に再測定開始
5. **AudioDetectionComponent統合**: 統一音響検出コンポーネント使用
6. **リセット機能**: テストページでは廃止（簡略化）

### 実装場所
準備ページ（`preparation.html`）の音域テストセクション内

---

## 📊 テスト手順

### 1. 低音テスト（自由発声方式）
```javascript
const lowRangeTest = {
  testType: 'free_vocalization',    // 自由発声
  instruction: 'できるだけ低い声を出して３秒間キープしてください',
  stabilityDuration: 3000,          // 3秒間安定維持
  stabilityMethod: 'standard_deviation',  // 標準偏差による判定
  stabilityTolerance: 0.1,          // 平均周波数の10%以内で安定判定
  minSamples: 15,                   // 最低15サンプル必要
  autoRetry: true,                  // 失敗時は自動再測定
  minDetectionVolume: 0.001,        // AudioDetectionComponent準拠
  clarityThreshold: 0.6             // AudioDetectionComponent準拠
};
```

#### 実施フロー
1. **指示表示**: 「できるだけ低い声を出して３秒間キープしてください」
2. **音声検出**: リアルタイム周波数・音量・明瞭度検出開始
3. **進捗表示**: 横長プログレスバー（0→100%、3秒間）
4. **データ収集**: 有効なサンプルを3秒間収集
5. **安定性判定**: 標準偏差による安定性チェック（平均の10%以内）
6. **成功判定**: 十分なサンプル数（15以上）＋安定性確認で完了
7. **失敗時**: 自動的に再測定開始（「【再測定】できるだけ低い声を出して...」表示）

### 2. 高音テスト（自由発声方式）
```javascript
const highRangeTest = {
  testType: 'free_vocalization',    // 自由発声
  instruction: 'できるだけ高い声を出して３秒間キープしてください',
  stabilityDuration: 3000,          // 3秒間安定維持
  stabilityMethod: 'standard_deviation',  // 標準偏差による判定
  stabilityTolerance: 0.1,          // 平均周波数の10%以内で安定判定
  minSamples: 15,                   // 最低15サンプル必要
  autoRetry: true,                  // 失敗時は自動再測定
  waitBetweenTests: 1000,           // 低音→高音間の待機時間
  minDetectionVolume: 0.001,        // AudioDetectionComponent準拠
  clarityThreshold: 0.6             // AudioDetectionComponent準拠
};
```

#### 実施フロー
1. **指示表示**: 「できるだけ高い声を出して３秒間キープしてください」
2. **音声検出**: リアルタイム周波数・音量・明瞭度検出開始
3. **進捗表示**: 横長プログレスバー（0→100%、3秒間）
4. **データ収集**: 有効なサンプルを3秒間収集
5. **安定性判定**: 標準偏差による安定性チェック（平均の10%以内）
6. **成功判定**: 十分なサンプル数（15以上）＋安定性確認で完了
7. **結果計算**: 低音・高音の平均値計算と結果表示

---

## 🔢 音域判定アルゴリズム

### 快適音域の定義
```javascript
class VoiceRangeAnalyzer {
  calculateComfortableRange(lowNote, highNote) {
    // 快適音域 = 検出音域の80%範囲
    const rangeSemitones = this.semitoneDifference(lowNote, highNote);
    const comfortMargin = Math.floor(rangeSemitones * 0.1); // 上下10%カット
    
    return {
      low: this.transposeNote(lowNote, comfortMargin),
      high: this.transposeNote(highNote, -comfortMargin),
      octaves: rangeSemitones / 12,
      comfortableOctaves: (rangeSemitones - comfortMargin * 2) / 12
    };
  }
}
```

### 推奨基音の算出
```javascript
class BaseNoteRecommender {
  generateRecommendations(comfortableRange) {
    const centerFreq = this.geometricMean(
      comfortableRange.low.frequency, 
      comfortableRange.high.frequency
    );
    
    // 快適音域の中央値付近から±1オクターブで基音候補を生成
    const recommendations = [];
    const centerNote = this.frequencyToNote(centerFreq);
    
    // C3オクターブ（ランダムモード用）の候補
    const c3Candidates = ['C3', 'D3', 'E3', 'F3', 'G3', 'A3', 'B3', 'C4']
      .filter(note => this.isInComfortableRange(note, comfortableRange));
    
    // 全クロマチック（連続・12音階モード用）の候補
    const chromaticCandidates = this.generateChromaticRange(
      comfortableRange.low, comfortableRange.high
    );
    
    return {
      randomMode: c3Candidates,
      continuousMode: chromaticCandidates.slice(0, 8), // 8候補
      chromaticMode: chromaticCandidates // 全候補
    };
  }
}
```

---

## 🎨 UI表示仕様（実装準拠版）

### テスト進行表示
```html
<div class="voice-range-test">
  <!-- 上部指示エリア（右上にマイクアイコン配置） -->
  <div class="test-instruction-header">
    <h4 class="text-sub-title" id="test-instruction-text">音域を測定します</h4>
    <div class="test-instruction">
      <i data-lucide="mic" class="text-green-400" style="width: 24px; height: 24px;"></i>
    </div>
  </div>
  
  <!-- 中央の円形プログレスバーとアイコン -->
  <div class="voice-range-display-container">
    <svg class="voice-stability-svg" width="160" height="160" id="stability-ring">
      <circle cx="80" cy="80" r="72" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="16"/>
      <circle cx="80" cy="80" r="72" fill="none" stroke="#3b82f6" stroke-width="16" 
              stroke-dasharray="452" stroke-dashoffset="452" 
              transform="rotate(-90 80 80)" class="voice-progress-circle"/>
    </svg>
    <div class="voice-note-badge">
      <!-- 低音テスト: arrow-down（黄色）、高音テスト: arrow-up（赤色）、完了: check（緑色） -->
      <i data-lucide="arrow-down" id="range-icon" style="width: 80px; height: 80px; color: white;"></i>
      <!-- カウントダウン表示（1, 2, 3） -->
      <p class="countdown-text" id="countdown-display" style="display: none;">0</p>
    </div>
  </div>
  
  <!-- 下部ステータスメッセージ -->
  <p class="test-status" id="test-status">待機中...</p>
</div>
```

### メッセージ仕様
#### 上部メッセージ（test-instruction-text）
- 初期状態: `音域を測定します`
- 低音テスト: `できるだけ低い声を出し３秒間キープしてください`
- 低音完了: `測定完了`
- 高音テスト: `できるだけ高い声を出し３秒間キープしてください`
- 高音完了: `測定完了`

#### 下部メッセージ（test-status）
- 初期状態: `待機中...`
- 測定中: `測定中...`
- リセット時: `リセットされました - 測定中...` （1.5秒後に「測定中...」に戻る）
- 遷移待機: `次の測定を準備しています...`
- 最終完了: `音域測定が完了しました！`

### 結果表示
```html
<div class="voice-range-results">
  <h4>🎯 あなたの音域</h4>
  <div class="range-summary">
    <div class="range-display">
      <span class="low-note">A2</span>
      <span class="range-bar"></span>
      <span class="high-note">F5</span>
    </div>
    <div class="range-stats">
      <div class="octaves">2.6オクターブ</div>
      <div class="note-count">31音</div>
    </div>
  </div>
  
  <div class="recommendations">
    <h5>💡 推奨基音</h5>
    <div class="recommended-notes">
      <span class="note recommended">C3</span>
      <span class="note recommended">D3</span>
      <span class="note recommended">E3</span>
      <span class="note">F3</span>
      <span class="note">G3</span>
    </div>
    <p class="recommendation-text">
      快適に歌える基音は <strong>C3 - E3</strong> です。
      初心者モードではこれらの基音が自動選択されます。
    </p>
  </div>
</div>
```

---

## 🔧 技術実装詳細

### 音程検出パラメータ（test-voice-range.html実装準拠版）
```javascript
const rangeTestConfig = {
  // 安定性検出設定（実測テストで最適化予定）
  stabilityDuration: 3000,       // 3秒間測定必須
  stabilityMethod: 'standard_deviation',  // 標準偏差による判定
  stabilityTolerance: 0.1,       // 平均周波数の10%以内で安定判定
  minSamples: 15,                // 最低15サンプル必要
  
  // 音声検出設定（AudioDetectionComponent準拠）
  minVolumeAbsolute: 0.001,      // 最小音量閾値
  clarityThreshold: 0.6,         // 明瞭度閾値（現在0.3で緩和中）
  autoRetry: true,               // 失敗時は自動再測定
  
  // UI更新設定（テストページ仕様）
  progressType: 'horizontal',    // 横長プログレスバー
  progressUpdateRate: 100,       // プログレス更新間隔（ms）
  detailDisplay: true,           // 周波数・音量詳細表示
  logOutput: true,               // 詳細ログ出力
  
  // テスト間隔設定
  waitBetweenTests: 1000,        // 低音→高音テストの待機時間
  completionDelay: 1000,         // 完了エフェクト表示時間
  
  // 結果計算設定
  resultMethod: 'average',       // 平均値による算出
  displayFormat: 'frequency_hz', // Hz表示
  
  // デフォルト設定（エラー時）
  defaultRange: {
    low: 'C3',
    high: 'C5',
    octaves: 2.0
  }
};
```

### エラーハンドリング
```javascript
class RangeTestErrorHandler {
  handleTestFailure(phase, reason) {
    switch (reason) {
      case 'mic_not_detected':
        return 'マイクからの音声が検出されません';
      case 'too_quiet':
        return '声が小さすぎます。もう少し大きく歌ってください';
      case 'too_noisy':
        return '周囲が騒がしすぎます。静かな場所でお試しください';
      case 'pitch_unstable':
        return '音程が不安定です。安定した音で歌ってください';
      default:
        return 'テストを続行できません。デフォルト設定を使用します';
    }
  }
  
  fallbackToDefaults() {
    return {
      detectedRange: { low: 'C3', high: 'C5' },
      recommendations: {
        randomMode: ['C3', 'D3', 'E3', 'F3'],
        continuousMode: ['C3', 'D3', 'E3', 'F3', 'G3', 'A3', 'B3', 'C4'],
        chromaticMode: this.generateFullChromaticRange()
      }
    };
  }
}
```

---

## 🔍 デバイス品質判定機能

### 判定タイミング
マイク許可直後、音域テスト開始前に実施

### 判定内容
```javascript
function detectDeviceQuality() {
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  const sampleRate = audioContext.sampleRate;
  const userAgent = navigator.userAgent.toLowerCase();
  const isMobile = /mobile|android|iphone|ipad/.test(userAgent);
  
  // デバイス品質判定
  let quality = {
    level: '',           // 'high' | 'medium' | 'low'
    sampleRate: sampleRate,
    deviceType: isMobile ? 'mobile' : 'desktop',
    adjustmentFactor: 1.0,
    accuracyRange: '',
    userMessage: ''
  };
  
  if (sampleRate >= 48000 && !isMobile) {
    quality.level = 'high';
    quality.adjustmentFactor = 1.0;
    quality.accuracyRange = '±10¢';
    quality.userMessage = '高精度での測定が可能です。プロフェッショナルレベルの精度で音程を検出できます。';
  }
  else if (sampleRate >= 44100) {
    quality.level = 'medium';
    quality.adjustmentFactor = 1.15;
    quality.accuracyRange = '±15¢';
    quality.userMessage = '標準的な精度で測定します。一般的な音楽練習には十分な精度です。';
  }
  else {
    quality.level = 'low';
    quality.adjustmentFactor = 1.3;
    quality.accuracyRange = '±25¢';
    quality.userMessage = '基本的な精度での測定となります。相対的な音程の改善に注目してください。';
  }
  
  return quality;
}
```

### UI表示
```javascript
// マイクテスト画面での表示例
function displayDeviceQuality(quality) {
  const qualityDisplay = {
    high: {
      icon: '✨',
      color: '#22c55e',
      label: '高精度デバイス'
    },
    medium: {
      icon: '📱',
      color: '#3b82f6',
      label: '標準デバイス'
    },
    low: {
      icon: '⚠️',
      color: '#f59e0b',
      label: '基本デバイス'
    }
  };
  
  const info = qualityDisplay[quality.level];
  
  // UIに表示
  return `
    <div class="device-quality-info">
      <span class="quality-icon">${info.icon}</span>
      <span class="quality-label" style="color: ${info.color}">
        ${info.label}
      </span>
      <p class="quality-message">${quality.userMessage}</p>
      <small>測定精度: ${quality.accuracyRange}</small>
    </div>
  `;
}
```

### データ保存
```javascript
// LocalStorageに保存して全画面で利用
function saveDeviceQuality(quality) {
  const deviceInfo = {
    level: quality.level,
    adjustmentFactor: quality.adjustmentFactor,
    accuracyRange: quality.accuracyRange,
    detectedAt: new Date().toISOString(),
    sampleRate: quality.sampleRate,
    deviceType: quality.deviceType
  };
  
  localStorage.setItem('deviceQuality', JSON.stringify(deviceInfo));
}
```

### トレーニング時の活用
- **session.html**: 保存された調整係数を使用してリアルタイム評価
- **results.html**: 事前に調整済みの結果を表示
- **全体的な一貫性**: すべての画面で同じ基準を使用

---

## 📈 期待される効果

### ユーザー体験の向上
- **個別最適化**: 各ユーザーの音域に適したトレーニング
- **成功率向上**: 無理のない音域での練習により挫折率低下
- **継続性**: 快適な音域での練習により長期継続が可能
- **透明性**: デバイス性能による測定精度の事前開示
- **公平性**: デバイス格差を考慮した評価基準

### トレーニング精度の向上
- **基音最適化**: 推奨基音によりより正確な相対音感練習
- **モード別最適化**: 各トレーニングモードに適した基音提案
- **進捗管理**: 音域拡張の記録と可視化（将来機能）

---

---

## 📝 変更履歴

### v2.1.0 (2025-01-07)
- **AudioDetectionComponent統合**: 統一音響検出コンポーネント使用
- **安定性判定方式変更**: ±8Hz → 標準偏差による判定（実測テストで最適化予定）
- **閾値調整**: minVolumeAbsolute: 0.001, clarityThreshold: 0.6 (AudioDetectionComponent準拠)
- **UI仕様変更**: 横長プログレスバー + 詳細情報表示（テストページ）
- **自動再測定**: 不安定な場合は自動的に再測定開始
- **リセット機能廃止**: テストページでは簡略化
- **メッセージ統一**: 「できるだけ低い/高い声を出して３秒間キープしてください」

### v2.0.0 (2025-09-04)
- 初版リリース
- 基準音なし自由発声方式
- 3秒間安定性判定
- 円形プログレスバー仕様

---

**この音域テスト機能により、全ユーザーに最適化された相対音感トレーニング体験を提供します。**