# 音域テスト機能 - 詳細仕様書

**バージョン**: 1.0.0  
**作成日**: 2025-08-09  
**用途**: マイクテストページの音域テスト機能詳細仕様

---

## 🎯 目的と概要

### 機能目的
- **ユーザーの快適音域の特定**: 無理なく歌える音域を自動検出
- **個別最適化**: ユーザーに最適な基音を提案
- **トレーニング精度向上**: 音域に適した基音でより効果的な練習を実現

### 実装場所
マイクテストページ（`/microphone-test`）の準備プロセス内

---

## 📊 テスト手順

### 1. 低音テスト
```javascript
const lowRangeTest = {
  startNote: 'C3',         // 開始音（130.81Hz）
  direction: 'descending', // 下降方向
  stepSize: 1,             // 半音ずつ
  endCondition: 'userLimit', // ユーザーが歌えなくなるまで
  testRange: ['C3', 'C2', 'C1'], // テスト範囲
  instruction: 'このトーンに合わせて「ラ」で歌ってください'
};
```

#### 実施フロー
1. **開始音再生**: C3（130.81Hz）を2秒再生
2. **発声指示**: 「この音に合わせて歌ってください」
3. **検出**: ユーザーの発声を3秒間検出
4. **判定**: 基準音から±50セント以内で「成功」判定
5. **次の音へ**: B2 → A#2 → A2... と下降
6. **終了条件**: 連続2回失敗または最低音B1到達

### 2. 高音テスト
```javascript
const highRangeTest = {
  startNote: 'C4',         // 開始音（261.63Hz）
  direction: 'ascending',  // 上昇方向
  stepSize: 1,             // 半音ずつ
  endCondition: 'userLimit', // ユーザーが歌えなくなるまで
  testRange: ['C4', 'C5', 'C6'], // テスト範囲
  instruction: 'このトーンに合わせて「ラ」で歌ってください'
};
```

#### 実施フロー
1. **開始音再生**: C4（261.63Hz）を2秒再生
2. **発声指示**: 「この音に合わせて歌ってください」
3. **検出**: ユーザーの発声を3秒間検出
4. **判定**: 基準音から±50セント以内で「成功」判定
5. **次の音へ**: C#4 → D4 → D#4... と上昇
6. **終了条件**: 連続2回失敗または最高音C6到達

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

## 🎨 UI表示仕様

### テスト進行表示
```html
<div class="voice-range-test">
  <div class="test-header">
    <h3>🎵 音域テスト</h3>
    <div class="progress-indicator">
      <span class="phase active">低音テスト</span>
      <span class="phase">高音テスト</span>
      <span class="phase">結果表示</span>
    </div>
  </div>
  
  <div class="current-test">
    <div class="note-display">
      <div class="note-name">A2</div>
      <div class="frequency">110.0 Hz</div>
    </div>
    <div class="instruction">
      この音に合わせて「ラ」で歌ってください
    </div>
    <div class="detection-feedback">
      <div class="status detecting">検出中...</div>
      <div class="pitch-meter"><!-- 音程メーター --></div>
    </div>
  </div>
</div>
```

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

### 音程検出パラメータ
```javascript
const rangeTestConfig = {
  // 検出設定
  detectionTime: 3000,        // 3秒間検出
  stabilityThreshold: 0.8,    // 安定度しきい値
  accuracyThreshold: 50,      // ±50セント許容
  
  // テスト設定
  playbackTime: 2000,         // 基準音再生時間
  pauseBetweenNotes: 500,     // 音程間の休憩
  maxFailures: 2,             // 最大連続失敗回数
  
  // 音域設定
  minTestNote: 'B1',          // 最低テスト音（61.74Hz）
  maxTestNote: 'C6',          // 最高テスト音（1046.50Hz）
  defaultRange: {             // デフォルト音域（テスト失敗時）
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

## 📈 期待される効果

### ユーザー体験の向上
- **個別最適化**: 各ユーザーの音域に適したトレーニング
- **成功率向上**: 無理のない音域での練習により挫折率低下
- **継続性**: 快適な音域での練習により長期継続が可能

### トレーニング精度の向上
- **基音最適化**: 推奨基音によりより正確な相対音感練習
- **モード別最適化**: 各トレーニングモードに適した基音提案
- **進捗管理**: 音域拡張の記録と可視化（将来機能）

---

**この音域テスト機能により、全ユーザーに最適化された相対音感トレーニング体験を提供します。**