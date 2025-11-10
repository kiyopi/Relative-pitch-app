# fftSize設定による処理負荷問題

## 発見した根本原因の可能性
**PitchProConfig.js の fftSize: 4096 が処理負荷を増大させている**

### 証拠
1. v1.3.1でも v1.3.2でも「Adjusted FPS to 40 due to high load」が発生
2. PitchProConfigを導入したコミット cc48197 以降に問題が発生
3. PitchProConfig導入前は fftSize を指定せず（デフォルト2048と推定）

### fftSizeの影響
- **4096**: 高精度だが処理負荷が大きい → FPS低下（60→40）
- **2048**: 標準精度で処理が軽い → FPS正常

### パフォーマンスへの影響
```
fftSize: 4096
↓
FPS 60 → 40 に低下
↓
700msで取得できるフレーム数: 42 → 28 (33%減少)
↓
体感的に「判定時間が短い」
```

### fftSizeと音量バーの関係
- **音量バー**: 振幅を直接測定（FFT不使用）→ fftSizeと無関係
- **音程検出**: FFTで周波数分析 → fftSizeが影響

### 修正案（保留中）
`/PitchPro-SPA/js/core/pitchpro-config.js` Line 58:
```javascript
// 修正前
fftSize: 4096,

// 修正後（案）
fftSize: 2048,
```

## 次の調査ポイント
**ユーザー指摘**: 「今重要なのはsetCallbacksの有無です」

setCallbacksの実装状況を確認する必要あり。
