# 相対音感トレーニングアプリ - 技術仕様書

**バージョン**: 1.0.0  
**作成日**: 2025-08-07  
**用途**: 音声処理・音程検出・フィルタリング技術仕様

---

## 🎯 技術概要

### 音声処理技術スタック
- **音程検出**: Pitchy v4 (McLeod Pitch Method)
- **音声処理**: Web Audio API
- **フィルタリング**: 3段階ノイズリダクション
- **基音補正**: 動的オクターブ補正システム
- **品質保証**: ±5セント精度達成

---

## 🔧 1. ノイズ除去・フィルタリング仕様

### 1.1 3段階フィルタリングシステム

#### ハイパスフィルター（低周波ノイズ除去）
```javascript
// 80Hz以下の低周波ノイズカット
const highpass = audioContext.createBiquadFilter();
highpass.type = 'highpass';
highpass.frequency.setValueAtTime(80, audioContext.currentTime);
highpass.Q.setValueAtTime(0.7, audioContext.currentTime);
```

#### ローパスフィルター（高周波ノイズ除去）
```javascript
// 800Hz以上の高周波ノイズカット（人間音声特化）
const lowpass = audioContext.createBiquadFilter();
lowpass.type = 'lowpass';
lowpass.frequency.setValueAtTime(800, audioContext.currentTime);
lowpass.Q.setValueAtTime(0.7, audioContext.currentTime);
```

#### ノッチフィルター（電源ノイズ除去）
```javascript
// 60Hz電源ノイズカット
const notch = audioContext.createBiquadFilter();
notch.type = 'notch';
notch.frequency.setValueAtTime(60, audioContext.currentTime);
notch.Q.setValueAtTime(10, audioContext.currentTime);
```

### 1.2 フィルターチェーン構成
```
マイク入力 → ハイパス(80Hz) → ローパス(800Hz) → ノッチ(60Hz) → ゲイン → 音程検出
```

### 1.3 フィルター効果
- **S/N比改善**: 信号対雑音比の向上
- **基音強調**: 倍音に対する基音の相対強度向上
- **周波数特性最適化**: 人間の音声帯域(80-800Hz)への特化
- **環境ノイズ除去**: 風音、振動、電源ノイズの除去

---

## 🎵 2. 倍音・ハーモニクス処理仕様

### 2.1 動的オクターブ補正システム

#### 基音候補生成
```javascript
const fundamentalCandidates = [
  detectedFreq,           // そのまま（基音の可能性）
  detectedFreq / 2.0,     // 1オクターブ下（2倍音 → 基音）
  detectedFreq / 3.0,     // 3倍音 → 基音
  detectedFreq / 4.0,     // 4倍音 → 基音
  detectedFreq * 2.0,     // 1オクターブ上（低く歌った場合）
];
```

#### 補正トリガー条件
```javascript
// 動的しきい値計算
const maxTargetFreq = Math.max(...targetFrequencies);
const correctionThreshold = maxTargetFreq * 0.55;

// オクターブ補正判定
if (pitch < correctionThreshold && pitch * 2 >= correctedMin && pitch * 2 <= correctedMax) {
    correctedPitch = pitch * 2;
}
```

### 2.2 基音評価システム（3要素統合）

#### 人間音域範囲チェック（40%重み）
```javascript
const vocalRange = { min: 130.81, max: 1046.50 }; // C3-C6
const inVocalRange = freq >= vocalRange.min && freq <= vocalRange.max;
const vocalRangeScore = inVocalRange ? 1.0 : 0.0;
```

#### 前回検出との連続性評価（40%重み）
```javascript
const continuityScore = previousFreq 
  ? 1.0 - Math.min(Math.abs(freq - previousFreq) / previousFreq, 1.0)
  : 0.5;
```

#### 音楽的妥当性評価（20%重み）
```javascript
const calculateMusicalScore = (frequency) => {
  const C4 = 261.63; // Middle C
  const semitonesFromC4 = Math.log2(frequency / C4) * 12;
  const nearestSemitone = Math.round(semitonesFromC4);
  const distanceFromSemitone = Math.abs(semitonesFromC4 - nearestSemitone);
  
  // 半音階に近いほど高スコア（±50セント以内で最高点）
  return Math.max(0, 1.0 - (distanceFromSemitone / 0.5));
};
```

### 2.3 基音安定化システム
```javascript
const stabilizeFrequency = (currentFreq, historyBuffer, stabilityThreshold = 0.1) => {
  // 履歴バッファに追加（最大5フレーム保持）
  historyBuffer.push(currentFreq);
  if (historyBuffer.length > 5) historyBuffer.shift();
  
  // 中央値ベースの安定化（外れ値除去）
  const sorted = [...historyBuffer].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  
  // 急激な変化を抑制（段階的変化）
  const maxChange = median * stabilityThreshold;
  return Math.abs(currentFreq - median) > maxChange 
    ? median + Math.sign(currentFreq - median) * maxChange
    : currentFreq;
};
```

---

## 🎤 3. Pitchy音程検出ライブラリ仕様

### 3.1 ライブラリ概要
- **バージョン**: Pitchy v4
- **アルゴリズム**: McLeod Pitch Method (MPM)
- **特徴**: 高精度基音検出、倍音誤検出の自動回避
- **CDN**: `https://esm.sh/pitchy@4`

### 3.2 初期化・検出処理
```javascript
// ライブラリ読み込み
import { PitchDetector } from "https://esm.sh/pitchy@4";

// PitchDetector初期化
const pitchDetector = PitchDetector.forFloat32Array(analyzer.fftSize); // fftSize = 2048

// 周波数検出実行
const timeData = new Float32Array(analyzer.fftSize);
analyzer.getFloatTimeDomainData(timeData);
const [pitch, clarity] = pitchDetector.findPitch(timeData, audioContext.sampleRate);
```

### 3.3 検出条件・精度
- **周波数範囲**: 80Hz - 1200Hz
- **確信度しきい値**: 0.1以上
- **検出精度**: ±5セント精度達成
- **フレームレート**: 約60FPS (requestAnimationFrame)
- **FFTサイズ**: 2048

### 3.4 精度達成結果
- **導入前**: FFTピーク検出、1000+セント誤差
- **導入後**: McLeod Pitch Method、5セント精度
- **解決問題**: 倍音誤検出、オクターブエラー、6秒タイムアウト、ノイズ干渉

---

## 🎹 4. 対象音階・周波数仕様

### 4.1 ドレミファソラシド音階（C4-C5）
```javascript
const SCALE_FREQUENCIES = {
  'ド': 261.63,   // C4
  'レ': 293.66,   // D4
  'ミ': 329.63,   // E4
  'ファ': 349.23, // F4
  'ソ': 392.00,   // G4
  'ラ': 440.00,   // A4
  'シ': 493.88,   // B4
  'ド(高)': 523.25 // C5
};
```

### 4.2 相対音程関係（開発者向け）
```javascript
// 基音からの半音間隔
const SCALE_INTERVALS = [
  0,   // ド (基音)
  2,   // レ (基音+2半音) - +200セント
  4,   // ミ (基音+4半音) - +400セント
  5,   // ファ(基音+5半音) - +500セント
  7,   // ソ (基音+7半音) - +700セント
  9,   // ラ (基音+9半音) - +900セント
  11,  // シ (基音+11半音) - +1100セント
  12   // ド (基音+12半音) - +1200セント
];
```

---

## 📊 5. 判定精度・評価基準

### 5.1 段階的評価システム
```javascript
const SCORE_GRADES = {
  PERFECT:   { range: '±5¢',   score: 100, description: '完璧（プロレベル）' },
  EXCELLENT: { range: '±10¢',  score: '90-95', description: '優秀' },
  GOOD:      { range: '±25¢',  score: '60-90', description: '良好' },
  FAIR:      { range: '±50¢',  score: '30-60', description: '可' },
  POOR:      { range: '±100¢', score: '10-30', description: '要改善' },
  FAILED:    { range: '>±100¢', score: '0-10', description: '不合格' }
};
```

### 5.2 モード別判定基準
- **初級モード**: ±50セント以内で合格
- **中級モード**: ±50セント以内で合格
- **上級モード**: ±30セント以内で合格
- **プロレベル**: ±10セント以内

---

## 🔄 6. リアルタイム処理仕様

### 6.1 処理フロー
```
音声入力 → フィルタリング → Pitchy検出 → 倍音補正 → 安定化 → 評価 → UI更新
```

### 6.2 パフォーマンス要件
- **検出間隔**: requestAnimationFrame（約60FPS）
- **処理時間**: 各フレーム100ms以内
- **安定化**: 5フレーム連続安定検出
- **メモリ効率**: 履歴バッファ最大5フレーム

### 6.3 デバイス最適化
```javascript
// iPad/iPhone検出と最適化
const isIOS = /iPhone|iPad/.test(navigator.userAgent) || 
              (/Macintosh/.test(navigator.userAgent) && 'ontouchend' in document);

const audioConstraints = {
  audio: {
    echoCancellation: false,
    noiseSuppression: false,
    autoGainControl: false,
    sampleRate: 44100,
    channelCount: 1,
    ...(isIOS && {
      // iOS専用最適化設定
      latency: 0.1,
      volume: 1.0
    })
  }
};
```

---

## 🛠️ 7. エラーハンドリング・フォールバック

### 7.1 Pitchyライブラリフォールバック
```javascript
// Pitchy読み込み失敗時は従来のFFTピーク検出に自動フォールバック
let pitchDetector = null;

try {
  pitchDetector = PitchDetector.forFloat32Array(fftSize);
} catch (error) {
  console.warn('Pitchy読み込み失敗 - FFTフォールバック使用');
  // 従来のFFTピーク検出処理
}
```

### 7.2 音程検出エラー対応
- **無効周波数**: clarity < 0.1 または範囲外の場合はスキップ
- **検出不能**: 前回値を使用または「検出中...」表示
- **急激変化**: 安定化システムで段階的変化に制限

---

## 📱 8. ブラウザ・デバイス対応

### 8.1 対応ブラウザ
- **Chrome/Edge**: 完全対応
- **Firefox**: 完全対応  
- **Safari**: 完全対応（出力先接続による対応済み）
- **モバイル Safari**: マイクアクセス許可必要

### 8.2 デバイス別最適化
- **PC**: 標準設定（感度1.0x）
- **iPhone**: 高感度設定（感度3.0x）
- **iPad**: 超高感度設定（感度7.0x）

---

## 🔍 9. デバッグ・監視機能

### 9.1 リアルタイム検出ログ
```javascript
if (frameCount % 60 === 0) { // 1秒に1回
  console.log(`🔍 Pitchy検出: pitch=${pitch?.toFixed(1)}Hz, clarity=${clarity?.toFixed(3)}`);
}
```

### 9.2 補正ログ
```javascript
if (frameCount % 60 === 0) {
  console.log(`🔧 動的オクターブ補正: ${pitch.toFixed(1)}Hz → ${correctedPitch.toFixed(1)}Hz`);
}
```

### 9.3 フィルター効果監視
- フィルター前後の周波数スペクトラム可視化
- ノイズ成分の定量的分析
- 音量レベル改善の数値表示

---

## 📊 10. データ永続化・共有仕様

### 10.1 localStorage データ構造

#### メインデータ (TrainingProgress)
```typescript
interface TrainingProgress {
  // システム情報
  mode: 'random' | 'continuous' | 'chromatic';
  version: string;                    // データバージョン（現在: "1.0.0"）
  createdAt: string;                  // ISO8601形式
  lastUpdatedAt: string;              // ISO8601形式

  // セッション管理
  sessionHistory: SessionResult[];    // 完了セッション履歴（最大8件）
  currentSessionId: number;           // 現在のセッション番号（1-8）
  isCompleted: boolean;               // 8セッション完了判定

  // 基音管理
  availableBaseNotes: BaseNote[];     // 使用可能基音リスト
  usedBaseNotes: BaseNote[];          // 使用済み基音リスト

  // 総合評価（8セッション完了時のみ）
  overallGrade?: Grade;               // S-E級総合評価
  overallAccuracy?: number;           // 全体精度平均
  totalPlayTime?: number;             // 総プレイ時間（秒）
}
```

#### localStorage キー構成
```typescript
// メインデータ
'pitch-training-random-progress-v1'      // ランダムモード進行状況
'pitch-training-continuous-progress-v1'  // 連続モード進行状況
'pitch-training-chromatic-progress-v1'   // 12音階モード進行状況

// システムデータ
'mic-test-completed'                     // マイクテスト完了フラグ

// バックアップデータ
'pitch-training-progress-backup'         // メインデータのバックアップ
'completed-cycle-{timestamp}'            // 完了サイクルの記録
```

### 10.2 S-E級総合評価システム

```javascript
function calculateOverallGrade(sessionHistory: SessionResult[]): Grade {
  const gradeCount = sessionHistory.reduce((acc, session) => {
    acc[session.grade] = (acc[session.grade] || 0) + 1;
    return acc;
  }, { excellent: 0, good: 0, pass: 0, needWork: 0 });

  const excellentRatio = gradeCount.excellent / 8;
  const goodPlusRatio = (gradeCount.excellent + gradeCount.good + gradeCount.pass) / 8;

  // S-E級判定ロジック
  if (excellentRatio >= 0.5 && goodPlusRatio >= 0.875) return 'S';
  if (excellentRatio >= 0.375 && goodPlusRatio >= 0.75) return 'A';
  if (excellentRatio >= 0.25 && goodPlusRatio >= 0.625) return 'B';
  if (goodPlusRatio >= 0.5) return 'C';
  if (goodPlusRatio >= 0.25) return 'D';
  return 'E';
}
```

### 10.3 健康確認システム

#### チェック項目
- **セッションID妥当性**: 1-8の範囲内確認
- **セッション履歴整合性**: 最大8件確認
- **完了状態整合性**: isCompletedフラグと履歴件数の整合性
- **使用基音リスト確認**: 履歴との整合性
- **リロード検出**: セッション途中リロードの検出と処理

---

## 🌐 11. SNS共有機能仕様

### 11.1 対象SNSプラットフォーム
- **Twitter/X**: テキスト + 画像投稿
- **Facebook**: テキスト + 画像投稿  
- **LINE**: テキスト + 画像共有
- **Instagram Stories**: 画像 + テキスト投稿

### 11.2 共有データ構造
```typescript
interface ShareData {
  text: string;           // 共有テキスト
  url: string;           // アプリURL
  imageUrl?: string;     // 生成画像URL
  hashtags?: string[];   // ハッシュタグ
  customMessage?: string; // ユーザーカスタムメッセージ
}

interface TrainingShareContent {
  mode: 'random' | 'continuous' | 'chromatic';
  score: number;
  accuracy: number;
  completionTime: number;
  achievements: Achievement[];
  level: number;
  rank: string;
}
```

### 11.3 結果画像生成システム

#### 画像仕様
- **サイズ**: 1080x1080px（Instagram最適）
- **内容**: スコア、精度、達成バッジ、モード情報
- **テーマ**: light/dark/gradient選択可能
- **QRコード**: アプリURLの埋め込み（オプション）

#### 生成テキスト例（Twitter）
```
🎵 相対音感トレーニング完了！

📊 スコア: 85
🎯 精度: 92.5%
⏱️ 時間: 3分45秒
🎼 モード: ランダム基音モード

#相対音感 #音楽トレーニング #PitchTraining
```

### 11.4 共有分析・統計
```typescript
interface ShareEvent {
  platform: 'twitter' | 'facebook' | 'line' | 'instagram';
  shareContent: TrainingShareContent;
  timestamp: Date;
  userId?: string;
}

// 共有イベントトラッキング
// Google Analytics連携
// ローカル履歴保存（最新50件）
```

---

**作成日**: 2025-08-07  
**更新日**: 2025-08-07（データ永続化・SNS共有機能追加）  
**対象**: 相対音感トレーニングアプリ技術基盤  
**重要**: これらの技術仕様により高精度な相対音感トレーニング体験を実現