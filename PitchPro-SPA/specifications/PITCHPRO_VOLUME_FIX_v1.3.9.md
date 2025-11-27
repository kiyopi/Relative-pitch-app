# PitchPro v1.3.9 音量計算修正仕様書

**作成日**: 2025-11-27
**バージョン**: v1.0.0
**関連Issue**: iPhone音量バー100%張り付き問題

---

## 1. 問題の概要

### 1.1 症状
- iPhoneでマイクテスト・音域テスト・トレーニング画面の音量バーが常に100%に張り付く
- 通常の発声でもrawVolume 33%以上で即座に100%到達
- 音量バーが正常に動作せず、ユーザー体験を著しく損なう

### 1.2 影響範囲
- preparation-pitchpro-cycle.js（マイクテスト）
- voice-range-test.js（音域テスト）
- trainingController.js（トレーニング）

---

## 2. 根本原因分析

### 2.1 二重増幅問題

PitchPro内部で音量値が複数回増幅されていた：

```
最終音量 = rawVolume × RMS_TO_PERCENT_FACTOR × volumeMultiplier
         = rawVolume × 100 × 3 (iPhone)
         = rawVolume × 300
```

さらにGainNodeでsensitivity（3.5x）が適用されていたため：

```
実効増幅率 = sensitivity × RMS_TO_PERCENT × volumeMultiplier
          = 3.5 × 100 × 3
          = 1050倍（理論値）

実測では約2100倍の増幅が観測された
```

### 2.2 100%到達の閾値

修正前（v1.3.8）:
```
rawVolume × 3 = 100%
rawVolume = 33.3%
```

つまり、rawVolumeが33.3%を超えると即座に100%にキャップされていた。

### 2.3 ログ証拠（log4.txt）

```
🔊 ノイズ確認: rawVolume:37.69% → volume:100.00%
🔊 ノイズ確認: rawVolume:33.79% → volume:100.00%
🔊 ノイズ確認: rawVolume:34.20% → volume:100.00%
```

---

## 3. 修正内容

### 3.1 PitchPro v1.3.9 変更点

| パラメータ | 修正前 (v1.3.8) | 修正後 (v1.3.9) | 効果 |
|-----------|----------------|----------------|------|
| iPhone volumeMultiplier | 3 | 2 | 50%で100%到達（33%→50%） |
| iPhone noiseGate | 0.028 | 0.04 | 環境ノイズ誤検知を低減 |
| iPad volumeMultiplier | 4 | 4 | 変更なし |
| PC volumeMultiplier | 2.5 | 2.5 | 変更なし |

### 3.2 updateSelectorsバグ修正

**問題**: `audioDetector.updateSelectors()`を呼び出した際、`autoUpdateUI`設定が無視されるバグ

**修正**: autoUpdateUI設定が正しく反映されるように修正

### 3.3 trainingController.js 変更

```javascript
// 修正前: 手動更新とautoUpdateUIが混在
autoUpdateUI: false  // 手動で音量バー更新

// 修正後: PitchPro標準のUI更新を使用
autoUpdateUI: true   // PitchProに任せる
```

---

## 4. 修正効果検証

### 4.1 修正後のログ（log6.txt）

```
🔊 [DEBUG v4.0.26 PREP] deviceSpecs: {volumeMultiplier: 2, noiseGate: 0.04, ...}
PitchPro v1.3.9 PitchDetector created with config: ...

🔊 ノイズ確認: rawVolume:6.81% → volume:13.62%   (正常: 6.81 × 2 = 13.62)
🔊 ノイズ確認: rawVolume:11.67% → volume:23.33%  (正常: 11.67 × 2 = 23.34)
🔊 ノイズ確認: rawVolume:12.10% → volume:24.21%  (正常: 12.10 × 2 = 24.20)
```

### 4.2 トレーニング画面の動作

```
📊 [TrainingVolumeBarDebug] style.width: "36.444546%"
📊 [TrainingVolumeBarDebug] style.width: "61.259562%"
📊 [TrainingVolumeBarDebug] style.width: "84.955283%"
📊 [TrainingVolumeBarDebug] style.width: "88.57138%"
```

音量バーが36%→61%→85%→88%と適切な範囲で動作。

---

## 5. デバイス別設定一覧（v1.3.11）

| デバイス | sensitivity | volumeMultiplier | noiseGate | 100%到達rawVolume |
|---------|-------------|-----------------|-----------|-------------------|
| iPhone | 2.0 | 2 | 0.08 | 50% |
| iPad | 2.5 | 3 | 0.05 | 33% |
| PC | 1.7 | 2.5 | 0.023 | 40% |

### 5.1 v1.3.10追加修正（iPhoneノイズ対策）

| パラメータ | v1.3.9 | v1.3.10 | 理由 |
|-----------|--------|---------|------|
| iPhone sensitivity | 3.5 | 2.0 | 環境ノイズの絶対量を削減 |
| iPhone noiseGate | 0.04 | 0.08 | 感度低下後も残るノイズを確実にカット |

### 5.2 v1.3.11追加修正（iPad最適化）

| パラメータ | v1.3.10 | v1.3.11 | 理由 |
|-----------|---------|---------|------|
| iPad sensitivity | 4.0 | 2.5 | 感度を下げ、ノイズフロアを低減し、100%飽和を防止 |
| iPad volumeMultiplier | 4 | 3.0 | 表示倍率を下げ、ボリュームバーの挙動を自然に |
| iPad noiseGate | 0.023 | 0.05 | ノイズゲートを引き上げ、静寂時の誤検知（測定失敗の原因）を防止 |

---

## 6. 残存課題

### 6.1 音域テストのノイズ誤検知

- 症状: 音域テスト開始直後にノイズを拾い、低音域測定が失敗しやすい
- 原因: voice-range-test.jsの`lowFreqVolumeThreshold`が低すぎる可能性
- 対策: v1.3.10でsensitivity 3.5→2.0、noiseGate 0.04→0.08に調整

### 6.2 iOS Safariリロード時の音量半減

- 症状: フッターホームでホームに戻り、リロード後に音量が半減
- 原因: WebKit Bug 230902（getUserMedia再呼び出しで音量半減）
- 対策: リロード検出時のvolumeMultiplier補正、または警告表示

---

## 7. 関連ファイル

- `/PitchPro-SPA/js/core/pitchpro-v1.3.6.umd.js` - PitchProライブラリ（v1.3.9内容）
- `/PitchPro-SPA/js/core/pitchpro-config.js` - 統一設定モジュール
- `/PitchPro-SPA/js/controllers/trainingController.js` - トレーニング画面
- `/PitchPro-SPA/pages/js/preparation-pitchpro-cycle.js` - 準備画面
- `/PitchPro-SPA/pages/js/voice-range-test.js` - 音域テスト

---

## 8. 変更履歴

| 日付 | バージョン | 変更内容 |
|------|-----------|---------|
| 2025-11-27 | v1.0.0 | 初版作成 - 二重増幅問題と修正内容を記録 |
| 2025-11-27 | v1.1.0 | v1.3.10追加 - iPhoneノイズ対策（sensitivity 2.0、noiseGate 0.08） |
| 2025-11-27 | v1.2.0 | v1.3.11追加 - iPad最適化（sensitivity 2.5、volumeMultiplier 3、noiseGate 0.05） |
