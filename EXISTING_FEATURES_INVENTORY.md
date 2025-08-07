# 既存優秀コア機能リスト - 移植価値評価

**作成日**: 2025-08-07  
**用途**: SvelteKit既存機能のVanilla TypeScript移植価値評価

---

## 🎵 1. 音響処理・音程検出関連

### **Pitchy統合による高精度検出システム** ⭐⭐⭐⭐⭐
- **実装場所**: `/svelte-prototype/src/lib/components/PitchDetector.svelte`
- **完成度**: 95% - McLeod Pitch Method（MPM）採用で5セント精度実現
- **実用性**: 極めて高い - 音程検出の核心技術
- **移植価値**: 必須 - アルゴリズムはフレームワーク非依存
```typescript
// 高精度基音検出（移植対象コア）
pitchDetector = PitchDetector.forFloat32Array(analyser.fftSize);
const [pitch, clarity] = pitchDetector.findPitch(buffer, audioContext.sampleRate);
```

### **統一AudioManagerシステム** ⭐⭐⭐⭐⭐
- **実装場所**: `/svelte-prototype/src/lib/audio/AudioManager.js`
- **完成度**: 95% - 複数AudioContext問題を根本解決
- **実用性**: 極めて高い - 音声システムの安定性基盤
- **移植価値**: 必須 - JavaScript Pure Logic
```javascript
// グローバル音声リソース管理（そのまま移植可能）
class AudioManager {
  // 1つのAudioContext・MediaStreamを全アプリで共有
  // 参照カウント管理による安全なクリーンアップ
}
```

### **3段階ノイズリダクション** ⭐⭐⭐⭐
- **実装場所**: AudioManager内フィルターチェーン
- **完成度**: 90% - ハイパス（80Hz）→ローパス（2kHz）→ノッチ（60Hz）
- **実用性**: 高い - 環境ノイズ耐性向上
- **移植価値**: 高い - Web Audio API標準実装
```javascript
// フィルターチェーン（Web Audio API標準）
const highpass = audioContext.createBiquadFilter();
const lowpass = audioContext.createBiquadFilter(); 
const notch = audioContext.createBiquadFilter();
```

### **動的倍音補正システム** ⭐⭐⭐⭐
- **実装場所**: `/svelte-prototype/src/lib/audio/HarmonicCorrection.js`
- **完成度**: 85% - 目標周波数に基づく動的しきい値調整
- **実用性**: 高い - 倍音誤検出の自動回避
- **移植価値**: 高い - Pure Algorithm
```javascript
// 動的オクターブ補正（アルゴリズムそのまま移植）
const correctionThreshold = maxTargetFreq * 0.55;
if (pitch < correctionThreshold && pitch * 2 >= correctedMin) {
    correctedPitch = pitch * 2; // オクターブ補正
}
```

---

## 🎮 2. トレーニングシステム

### **TrainingCoreコンポーネント** ⭐⭐⭐⭐⭐
- **実装場所**: `/svelte-prototype/src/lib/components/TrainingCore.svelte`
- **完成度**: 90% - 3モード統合基盤、プロパティベース動作制御
- **実用性**: 極めて高い - トレーニングの共通基盤
- **移植価値**: 高い - ロジックは移植、UI部分は再設計必要
```typescript
// モード別統合設計（制御ロジック移植、UI再設計）
export let mode = 'random'; // 'random' | 'continuous' | 'chromatic'
export let autoPlay = false;
export let sessionCount = 8;
```

### **音域選択システム** ⭐⭐⭐⭐
- **実装状況**: 完成（WORK_LOG_UPDATE.mdより）
- **完成度**: 90% - 4種類音域×8基音、重複回避システム
- **実用性**: 高い - ユーザーの声域に最適化
- **移植価値**: 高い - データ構造とアルゴリズム
```typescript
// 音域グループ（データ構造そのまま移植）
const voiceRanges = {
  low: ['F3', 'G3', 'Ab3', 'Bb3', 'C4', 'Db4', 'D4', 'Eb4'],
  middle: ['C4', 'Db4', 'D4', 'Eb4', 'E4', 'F4', 'Gb4', 'G4'],
  high: ['G4', 'Ab4', 'A4', 'Bb4', 'B4', 'C5', 'Db5', 'D5'],
  extended: ['F3', 'C4', 'G4', 'Db4', 'Ab4', 'D5', 'Bb3', 'E4']
};
```

### **基音再生システム（Tone.js + Salamander Piano）** ⭐⭐⭐⭐⭐
- **実装状況**: 完成済み（TrainingCore内）
- **完成度**: 95% - プロ品質ピアノ音源、デバイス別音量最適化
- **実用性**: 極めて高い - 相対音感トレーニングの核心
- **移植価値**: 必須 - Tone.jsはフレームワーク非依存
```javascript
// ピアノ音源（そのまま移植可能）
sampler = new Tone.Sampler({
  urls: { "C4": "C4.mp3" },
  baseUrl: "https://tonejs.github.io/audio/salamander/",
  release: 1.5
}).toDestination();
```

---

## 🖥️ 3. UI/UXコンポーネント

### **PitchDetectionDisplayコンポーネント** ⭐⭐⭐⭐
- **実装場所**: `/svelte-prototype/src/lib/components/PitchDetectionDisplay.svelte`
- **完成度**: 80% - リアルタイム表示、中央寄せ統一、3モード共通
- **実用性**: 高い - ユーザーフィードバックの核心
- **移植価値**: 中 - デザインパターン参考、実装は要再設計
- **移植課題**: Svelteリアクティビティ → DOM直接操作

### **VolumeBarコンポーネント** ⭐⭐⭐⭐⭐
- **実装場所**: `/svelte-prototype/src/lib/components/VolumeBar.svelte`
- **完成度**: 95% - iPhone WebKit問題対応済み、DOM直接操作
- **実用性**: 高い - リアルタイム音量表示
- **移植価値**: 低 - フレームワーク制約回避が目的、Vanilla TSでは不要
- **移植方針**: 標準的なCSS + JS実装で十分
```javascript
// iPhone WebKit対応（Vanilla TSでは不要な制約回避）
function updateVolumeBar(newVolume) {
  barElement.style.width = `${clampedVolume}%`;
  barElement.style.backgroundColor = color;
}
```

### **統合採点システム** ⭐⭐⭐⭐⭐
- **実装場所**: `/svelte-prototype/src/lib/components/scoring/UnifiedScoreResultFixed.svelte`
- **完成度**: 90% - UI混乱除去、明確な評価表示
- **実用性**: 極めて高い - 結果表示の完成形
- **移植価値**: 高い - デザイン・レイアウトパターン、データ構造
- **移植方針**: Web Components または TypeScript Class

---

## 💾 4. データ管理

### **SessionStorageManager統合システム** ⭐⭐⭐⭐⭐
- **実装場所**: `/svelte-prototype/src/lib/stores/sessionStorage.ts`
- **完成度**: 95% - Svelte Stores + localStorage統合、リアクティブ設計
- **実用性**: 極めて高い - 状態管理の完成形
- **移植価値**: 高い - データ構造と管理ロジック、リアクティビティは要再設計
- **移植方針**: EventEmitter または Observable パターン
```typescript
// リアクティブ派生ストア（Observer パターンに移植）
export const progressPercentage = derived(
  trainingProgress,
  $progress => Math.min(($progress.sessionHistory.length / 8) * 100, 100)
);
```

### **EvaluationEngine評価システム** ⭐⭐⭐⭐
- **実装状況**: 完成済み
- **完成度**: 85% - S-E級統合評価、統計的誤差吸収
- **実用性**: 高い - 科学的評価基盤
- **移植価値**: 高い - Pure Algorithm、計算ロジック
- **移植方針**: そのまま移植可能

---

## 🔧 5. 技術基盤

### **SvelteKit本格実装** ⭐⭐⭐⭐⭐
- **実装状況**: Next.jsから完全移行済み
- **完成度**: 95% - DOM直接操作、音響処理最適化、パフォーマンス優位
- **実用性**: 極めて高い
- **移植価値**: 参考のみ - 最適化手法やパフォーマンス知見を活用
- **移植方針**: Vanilla TS + Viteで同等性能実現

### **shadcn/ui CSS専用実装** ⭐⭐⭐⭐
- **実装成功**: CSSのみでshadcn/uiデザイン実現
- **完成度**: 80% - 既存コンポーネント競合回避
- **実用性**: 中 - デザインシステムとしての価値
- **移植価値**: 高い - CSSはそのまま活用可能
- **移植方針**: CSS変数 + ユーティリティクラス設計
```css
:global(.main-card) {
  border: 1px solid hsl(214.3 31.8% 91.4%) !important;
  background: hsl(0 0% 100%) !important;
  border-radius: 8px !important;
}
```

---

## 📊 移植価値総合評価

### **S級：必須移植（アルゴリズム・ロジック）**
| 機能 | 完成度 | 実用性 | 移植容易度 | 優先度 |
|-----|-------|-------|-----------|-------|
| Pitchy音程検出 | 95% | ⭐⭐⭐⭐⭐ | 高 | 最高 |
| AudioManager | 95% | ⭐⭐⭐⭐⭐ | 高 | 最高 |
| 基音再生システム | 95% | ⭐⭐⭐⭐⭐ | 高 | 最高 |
| SessionStorage設計 | 95% | ⭐⭐⭐⭐⭐ | 中 | 最高 |

### **A級：高価値移植（設計・パターン）**
| 機能 | 完成度 | 実用性 | 移植容易度 | 優先度 |
|-----|-------|-------|-----------|-------|
| 動的倍音補正 | 85% | ⭐⭐⭐⭐ | 高 | 高 |
| 音域選択システム | 90% | ⭐⭐⭐⭐ | 高 | 高 |
| EvaluationEngine | 85% | ⭐⭐⭐⭐ | 高 | 高 |
| shadcn/ui CSS | 80% | ⭐⭐⭐ | 高 | 高 |

### **B級：選択的移植（要再設計）**
| 機能 | 完成度 | 実用性 | 移植容易度 | 優先度 |
|-----|-------|-------|-----------|-------|
| TrainingCore | 90% | ⭐⭐⭐⭐⭐ | 低 | 中 |
| 統合採点表示 | 90% | ⭐⭐⭐⭐⭐ | 低 | 中 |
| PitchDetectionDisplay | 80% | ⭐⭐⭐⭐ | 低 | 中 |

### **C級：参考のみ（フレームワーク依存）**
| 機能 | 完成度 | 実用性 | 移植容易度 | 優先度 |
|-----|-------|-------|-----------|-------|
| VolumeBar DOM操作 | 95% | ⭐⭐⭐ | 不要 | 低 |
| Svelte リアクティビティ | 95% | ⭐⭐⭐ | 不適用 | 低 |

---

## 🎯 移植戦略方針

### **Phase 1: Core Algorithm移植（1週間）**
- Pitchy音程検出エンジン
- AudioManager音声基盤
- 基音再生システム
- 動的倍音補正

### **Phase 2: Data & Logic移植（1週間）** 
- SessionStorage設計
- EvaluationEngine
- 音域選択システム
- 3段階ノイズフィルタ

### **Phase 3: UI Components再設計（1-2週間）**
- Web Components ベース
- TypeScript Class Components
- CSS Design System（shadcn/ui風）

### **Phase 4: Integration & Optimization（1週間）**
- システム統合
- パフォーマンス最適化
- クロスブラウザ対応

---

**このインベントリを基に、効率的で高品質なVanilla TypeScript移植計画を策定します。**

**作成日**: 2025-08-07  
**対象**: SvelteKit → Vanilla TypeScript移植価値評価  
**重要**: 実用性と移植容易度を重視した優先順位付け