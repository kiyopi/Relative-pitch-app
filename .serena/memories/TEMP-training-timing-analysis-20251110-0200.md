# トレーニング処理速度低下の根本原因調査

## 重要な証言
**ユーザー**: 「この最後のドも以前は短いと感じていませんでした」
**ユーザー**: 「1.3.2よりは改善していますがやはり問題は1.3.1ではなく何かが処理の邪魔をしている」

## 確認された事実
1. for loopの構造は以前から変わっていない
2. v1.3.1でも「Adjusted FPS to 40 due to high load」が発生
3. v1.3.2よりv1.3.1の方が改善している（処理が軽い）
4. しかし、以前と比べると体感的に処理が遅い

## 仮説: PitchProConfigが原因
PitchProConfigで追加されたパラメータが処理負荷を増やしている可能性：

### PitchProConfigで追加されたパラメータ
1. `fftSize: 4096` - 高精度FFT（処理負荷大）
2. `enableHarmonicCorrection: true` - 倍音補正（処理追加）
3. `clarityThreshold: 0.4`
4. `minVolumeAbsolute: 0.003`
5. `smoothing: 0.1`
6. `minFrequency: 80`
7. `maxFrequency: 800`

### 特に疑わしいパラメータ
- **fftSize: 4096** - デフォルトは2048、2倍の処理負荷
- **enableHarmonicCorrection: true** - 追加の倍音分析処理

## 次の調査ステップ
1. PitchProConfigを一時的に無効化してテスト
2. または、fftSizeを2048に下げてテスト
3. enableHarmonicCorrectionをfalseにしてテスト
