# トレーニングコア機能：音程誤差検出システム

**作成日時**: 2025年1月12日 16:40
**種類**: 永続化メモリ（仕様・設計思想）

## 📋 最重要機能の定義

### アプリの核心価値
**ドレミガイドのアニメーションに合わせてユーザーが発声し、その声が期待される音程とどれだけの誤差が発生しているかを測定することが、このアプリの最も重要なトレーニング機能である。**

### 実装の目的
- 相対音感トレーニングの成果を定量的に測定
- リアルタイムフィードバックによる学習効果向上
- 誤差データの蓄積による進捗可視化

---

## 🎯 必要な実装機能

### 1. 期待音程の定義
```javascript
// ドレミガイドの各ステップで期待される音程
const expectedNotes = ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5'];
const expectedFrequencies = [261.63, 293.66, 329.63, 349.23, 392.00, 440.00, 493.88, 523.25]; // Hz

// 基音からの相対的な半音階差
const expectedSemitones = [0, 2, 4, 5, 7, 9, 11, 12]; // ドレミファソラシド
```

### 2. リアルタイム音程誤差計算
```javascript
function handlePitchUpdate(result) {
    // 現在のドレミガイドステップ
    const currentStep = currentIntervalIndex; // 0-7
    
    // 期待される音程（周波数）
    const expectedFrequency = expectedFrequencies[currentStep];
    
    // 検出された音程（周波数）
    const detectedFrequency = result.frequency;
    
    // 誤差計算（セント単位）
    const errorInCents = calculateCentError(detectedFrequency, expectedFrequency);
    
    // 誤差の可視化・フィードバック
    updatePitchErrorUI(errorInCents, result.clarity);
    
    // 誤差データの記録
    recordPitchError(currentStep, errorInCents, result.clarity, result.volume);
}

// セント単位の誤差計算（1オクターブ = 1200セント）
function calculateCentError(detected, expected) {
    return 1200 * Math.log2(detected / expected);
}
```

### 3. 誤差の可視化・フィードバック

#### リアルタイム表示
- **音程バー**: 期待音程を中心に、±50セント範囲で表示
- **色フィードバック**:
  - 緑: ±10セント以内（Excellent）
  - 黄: ±10-25セント（Good）
  - オレンジ: ±25-50セント（Pass）
  - 赤: ±50セント以上（Practice）
- **数値表示**: 誤差をセント単位で表示（例: "+12セント"）

#### UI要素案
```html
<!-- 音程誤差表示エリア -->
<div class="pitch-error-display">
    <div class="pitch-error-bar">
        <div class="pitch-error-marker" id="pitch-error-marker"></div>
    </div>
    <div class="pitch-error-value" id="pitch-error-value">0セント</div>
    <div class="pitch-accuracy-badge" id="pitch-accuracy-badge">Excellent</div>
</div>
```

### 4. 誤差データの記録・保存
```javascript
// セッションデータ構造
const sessionData = {
    mode: 'random',
    sessionId: 1,
    baseNote: 'C4',
    startTime: Date.now(),
    pitchErrors: [] // 各ステップの誤差データ
};

// 各ステップの誤差データ
const pitchErrorData = {
    step: 0, // 0-7 (ド-ド)
    expectedNote: 'C4',
    expectedFrequency: 261.63,
    detectedFrequency: 263.5,
    errorInCents: 12.3,
    clarity: 0.85,
    volume: 0.62,
    timestamp: Date.now()
};

// data-manager.jsを使用してlocalStorageに保存
function savePitchErrorData(sessionData) {
    // data-manager.jsの既存機能を活用
    window.DataManager.saveTrainingSession(sessionData);
}
```

---

## 🔧 現在の実装状況

### ✅ 実装済み
- AudioDetectionComponentによるリアルタイム音程検出
- `handlePitchUpdate(result)` コールバック関数
- ドレミガイドアニメーション（8ステップ）
- 音量バー表示

### ⚠️ 未実装（次のフェーズで必須）
- 期待音程との誤差計算ロジック
- 誤差の可視化UI（音程バー、色フィードバック、数値表示）
- 誤差データの記録・保存機能
- セッション終了時の評価サマリー

---

## 📊 実装優先順位

### Phase 1: 基本誤差検出（最優先）
1. 期待音程配列の定義（expectedFrequencies）
2. セント単位誤差計算関数（calculateCentError）
3. handlePitchUpdateでの誤差計算実装
4. コンソールログでの誤差確認

### Phase 2: 可視化・フィードバック
1. 音程誤差バーのHTML/CSS実装
2. リアルタイム色フィードバック
3. 数値表示・精度バッジ表示

### Phase 3: データ記録・評価
1. 誤差データ配列への記録
2. セッション終了時のサマリー計算
3. data-manager.jsへの保存
4. 結果ページでの可視化

---

## 🎓 重要な設計指針

### 相対音感トレーニングの本質
- **絶対音高ではなく相対音程が重要**: 基音からの音程関係を正確に把握
- **リアルタイムフィードバック**: 即座の修正で学習効果向上
- **定量的評価**: 進捗を数値化し、モチベーション維持

### 技術的考慮事項
- **PitchPro AudioDetectionComponent**: `result.frequency`, `result.clarity`, `result.volume`を活用
- **セント単位**: 音楽理論で標準的な音程誤差単位（1半音 = 100セント）
- **明瞭度フィルタ**: `clarity > 0.3` 以上で誤差計算実行（雑音除外）

---

## 📝 参考情報

### 音程誤差の評価基準（一般的な基準）
- **±5セント以内**: プロレベル
- **±10セント以内**: 優秀（ほとんど気づかない）
- **±25セント以内**: 良好（わずかにずれを感じる）
- **±50セント以内**: 及第点（明確にずれを感じる）
- **±50セント以上**: 要練習（半音近くずれている）

### 実装ファイル
- **trainingController.js**: 音程誤差検出ロジック実装
- **training.html**: 誤差表示UI追加
- **training.css**: 音程バー・フィードバックスタイル
- **data-manager.js**: 誤差データ保存

---

**このメモリは、トレーニング機能の核心である音程誤差検出システムの完全な実装ガイドです。今後の実装時に必ず参照してください。**
