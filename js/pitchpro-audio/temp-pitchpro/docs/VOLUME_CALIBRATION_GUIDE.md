# Volume Calibration Guide - 音量調整ガイド

## 重要な警告 ⚠️

**以下の設定値は慎重に調整された最適値です。安易に変更しないでください。**

## 正しい設定値（検証済み）

### PitchDetector.ts
```typescript
// 音量計算式のスケーリング係数
const volumePercent = Math.max(0, Math.min(100, 
  (adjustedRms * 100) / platformSpecs.divisor * 25 - platformSpecs.noiseThreshold
));
// スケーリング係数: 25 ← この値を変更しないこと！
```

### DeviceDetection.ts
```typescript
// PC用設定
case 'PC':
default:
  return {
    sensitivity: 1.0,
    noiseGate: 0.02,
    divisor: 6.0,
    gainCompensation: 1.0,
    noiseThreshold: 5.0,  // ← この値を変更しないこと！
    smoothingFactor: 0.2
  };

// iPhone用設定
case 'iPhone':
  return {
    sensitivity: 2.0,
    noiseGate: 0.018,
    divisor: 4.0,
    gainCompensation: 1.5,
    noiseThreshold: 1.0,  // モバイル用は1.0のまま
    smoothingFactor: 0.2
  };

// iPad用設定
case 'iPad':
  return {
    sensitivity: 7.0,
    noiseGate: 0.01,
    divisor: 4.0,
    gainCompensation: 1.5,
    noiseThreshold: 1.0,  // モバイル用は1.0のまま
    smoothingFactor: 0.2
  };
```

## 期待される動作

### 正常な音量レベル
- **無音時**: 0-2%
- **ささやき声**: 5-15%
- **通常の会話**: 20-50%
- **大声**: 50-80%
- **叫び声**: 80-100%

### ゲイン設定による変化
- **ゲイン 1.0x**: 最大約20%（通常会話）
- **ゲイン 2.0x**: 最大約40%（通常会話）
- **ゲイン 5.0x**: 最大約50%（通常会話）

## よくある間違い ❌

### 1. スケーリング係数を大きくしすぎる
```typescript
// ❌ 間違い - 敏感すぎる
* 120 - platformSpecs.noiseThreshold  // 少しの音で100%になる

// ✅ 正しい
* 25 - platformSpecs.noiseThreshold   // 適切な感度
```

### 2. noiseThresholdを小さくしすぎる
```typescript
// ❌ 間違い - 無音時でも高い値を示す
noiseThreshold: 0.5  // PC用で0.5は小さすぎる

// ✅ 正しい
noiseThreshold: 5.0  // PC用の適切な値
```

### 3. 両方を同時に調整する
**絶対にやってはいけません！** パラメータは一つずつ調整し、その都度テストしてください。

## テスト方法

### 1. 基本テスト（推奨）
```bash
# ビルド
npm run build

# 開発サーバー起動
npm run dev

# テストページを開く
open http://localhost:5173/gain-verification-test.html
```

### 2. 確認ポイント
- [ ] 無音時に0-2%の範囲内か
- [ ] 通常の声で20-50%の範囲内か
- [ ] ゲイン5.0xで50%前後に到達するか
- [ ] オーディオシステムエラーが発生しないか

### 3. 音量バーテスト
```bash
open http://localhost:5173/volume-debug.html
```
- [ ] 音量バーが滑らかに動くか
- [ ] 反応が自然か
- [ ] 100%で張り付かないか

## トラブルシューティング

### 問題: 音量が50%を超えない
**原因**: スケーリング係数が小さすぎる
**解決策**: まずテスト環境を確認。正常なら設定値は変更しない。

### 問題: 無音時でも高い値を示す
**原因**: noiseThresholdが小さすぎる
**解決策**: PC用は5.0、モバイル用は1.0が適切。

### 問題: ゲインエラーが発生する
**原因**: AudioDetectionComponentの自動sensitivity設定との競合
**解決策**: 
1. `gain-verification-test.html`でテスト（シンプル）
2. AudioDetectionComponentの設定を確認

### 問題: 音量が過敏すぎる
**原因**: スケーリング係数が大きすぎる
**解決策**: 25に戻す。

## 重要な計算式の理解

```typescript
// 音量計算の流れ
1. RMS値を取得（0.0 - 1.0の範囲）
2. ゲイン補正を適用: adjustedRms = rms * platformSpecs.gainCompensation
3. パーセント変換: (adjustedRms * 100) / platformSpecs.divisor
4. スケーリング: * 25
5. ノイズ除去: - platformSpecs.noiseThreshold
6. 範囲制限: Math.max(0, Math.min(100, ...))
```

## デバイス別の違い

| デバイス | divisor | noiseThreshold | gainCompensation |
|---------|---------|----------------|------------------|
| PC      | 6.0     | 5.0            | 1.0              |
| iPhone  | 4.0     | 1.0            | 1.5              |
| iPad    | 4.0     | 1.0            | 1.5              |

## 変更履歴

### 2025-09-09
- **問題**: 音量が50%を超えない
- **試行錯誤**:
  - スケーリング係数: 25 → 120 → 50 → 67 → **25**（元に戻す）
  - noiseThreshold: 5.0 → 0.5 → **5.0**（元に戻す）
- **結論**: 元の値が最適だった

## まとめ

**「動いているものは触るな」の原則を忘れずに。**

パラメータ調整が必要と思った場合は、必ず：
1. 現在の値をバックアップ
2. 一つずつ変更
3. 各変更後にテスト
4. 問題があれば即座に元に戻す

---

*このドキュメントは音量調整で迷った時の羅針盤です。必ず参照してください。*