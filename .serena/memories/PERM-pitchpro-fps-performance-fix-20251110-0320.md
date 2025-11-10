# PitchPro FPS低下問題の根本修正（2025-11-10完了）

## 📋 問題の概要

### 発生していた症状
1. **FPS低下の頻発**: "Adjusted FPS to 40 due to high load" が連続発生
2. **データ収集数の不足**: 期待値40-42件に対し、実際は12-15件しか収集できない
3. **音量バー不安定**: 動作するが遅れ・停止が発生
4. **測定精度の低下**: データ点が少ないため200ms除外ロジックの効果が限定的

### 直接の原因
- **smoothing: 0.25** がハードコード（DeviceDetection.ts）
- **FPS低下閾値が厳しすぎ** (期待間隔の1.5倍で即座にFPS削減)

---

## 🔧 実施した修正内容

### 修正1: smoothing値の根本修正

**ファイル**: `/Users/isao/Documents/pitchpro-audio-processing/src/utils/DeviceDetection.ts`

**修正箇所**: Lines 121, 129, 138, 155

**修正内容**:
```typescript
// 修正前（全デバイス）
smoothingFactor: 0.25

// 修正後（全デバイス）
smoothingFactor: 0.1  // CPU負荷軽減: 0.25→0.1
```

**対象デバイス**:
- iPad (Line 121)
- iPhone (Line 129)
- PC (Line 138)
- デフォルト (Line 155)

---

### 修正2: FPS低下閾値の緩和

**ファイル**: `/Users/isao/Documents/pitchpro-audio-processing/src/utils/performance-optimized.ts`

**修正箇所**: Line 39

**修正内容**:
```typescript
// 修正前
if (actualElapsed > this.frameInterval * 1.5) {  // 1.5倍で即FPS低下
    this.frameDrops++;
    this.adjustFrameRate();
}

// 修正後
if (actualElapsed > this.frameInterval * 2.0) {  // 2.0倍に緩和
    this.frameDrops++;
    this.adjustFrameRate();
}
```

**理由**:
- 1.5倍閾値は厳しすぎて、一時的なCPU負荷変動でも即座にFPS低下
- 2.0倍に緩和することで、本当に高負荷の時のみFPS調整を実行
- ブラウザのバックグラウンド処理等の影響を吸収

---

## 📊 修正結果の検証

### ✅ smoothing値の確認（成功）
```
PitchPro v1.3.2 PitchDetector created with config:
{fftSize: 2048, smoothing: 0.1, clarityThreshold: 0.4, ...}
```
- **期待値**: `smoothing: 0.1`
- **実際値**: `smoothing: 0.1` ✅

### 期待される改善効果

1. **FPS低下メッセージの大幅減少**
   - "Adjusted FPS to 40 due to high load" が大幅に減少または消滅
   - 60 FPSを安定して維持

2. **データ収集数の改善**
   - 修正前: 12-15件/700ms (40 FPS相当)
   - 修正後: 40-42件/700ms (60 FPS相当)

3. **音量バーの安定化**
   - 遅れ・停止が解消
   - リアルタイム更新が安定

4. **測定精度の向上**
   - より多くのデータ点で200ms除外ロジックが正確に機能
   - 異常値（-208¢等）のさらなる減少

---

## 🎯 技術的洞察

### smoothing値の影響
- **0.9** (PitchDetector デフォルト): 重い処理、過度な平滑化
- **0.25** (DeviceDetection デフォルト): 中程度の処理
- **0.1** (最適値): 最小限の平滑化、CPU効率重視

### FPS閾値設定の考え方
- **1.5倍**: 過敏、一時的な負荷変動でも反応
- **2.0倍**: 適切、顕著なフレーム落ちのみ検出
- **2.5倍以上**: 鈍感、負荷検出が遅れる可能性

### AdaptiveFrameRateLimiterの仕組み
```typescript
// フレーム間隔の監視
const actualElapsed = now - this.lastFrameTime;

// 閾値超過でフレーム落ちカウント
if (actualElapsed > this.frameInterval * 2.0) {
    this.frameDrops++;
    this.adjustFrameRate();  // 5回累積で5 FPS削減
}
```

---

## 🚨 重要な教訓

### 1. PitchProの設定優先順位
```
DeviceDetection (ハードコード)
  ↓ 優先
AudioDetectionComponent (config引数)
  ↓ 優先
アプリケーション側の設定
```

**結論**: アプリケーション側で`smoothing: 0.1`を指定しても、DeviceDetection内部で0.25に上書きされる

### 2. ライブラリの根本修正の必要性
- アプリケーション側の修正だけでは不十分
- ライブラリ内部のハードコード値を直接修正する必要がある
- ビルド・デプロイのフローを理解することが重要

### 3. 段階的な閾値調整
- 最初は保守的な閾値（1.5倍）で実装
- 実運用で過敏すぎることが判明
- データに基づいて閾値を緩和（2.0倍）

### 4. ブラウザキャッシュの影響
- プライベートブラウズモードでの検証が必須
- キャッシュバスター（`?v=YYYYMMDDHHH`）の適切な運用
- Safari は特に強力なキャッシュを持つ

---

## 📝 デプロイ手順

```bash
# 1. PitchProライブラリの修正
cd /Users/isao/Documents/pitchpro-audio-processing
# DeviceDetection.ts と performance-optimized.ts を修正

# 2. ビルド
npm run build

# 3. アプリケーションにコピー
cp dist/pitchpro.umd.js \
   /Users/isao/Documents/Relative-pitch-app/PitchPro-SPA/js/core/pitchpro-v1.3.2.umd.js

# 4. キャッシュバスター更新
# index.html の ?v=YYYYMMDDHHH をインクリメント

# 5. プライベートブラウズモードで検証
```

---

## 🔗 関連情報

### 関連ファイル
- `/pitchpro-audio-processing/src/utils/DeviceDetection.ts`
- `/pitchpro-audio-processing/src/utils/performance-optimized.ts`
- `/Relative-pitch-app/PitchPro-SPA/js/core/pitchpro-config.js`
- `/Relative-pitch-app/PitchPro-SPA/index.html`

### 関連仕様書
- `CRITICAL_DECISIONS_AND_INSIGHTS.md`: デバイス検出バグ対策
- `VOLUME_BAR_INTEGRATION_SPECIFICATION.md`: 音量バー統合システム
- `TRAINING_SPECIFICATION.md`: トレーニング測定精度改善

### 過去の修正履歴
1. **2025-01-07**: VolumeBarController統合システム完成
2. **2025-01-09**: iPadOS 13+デバイス判定バグ完全修正
3. **2025-10-29**: 前の音の残響除外ロジック実装（200ms除外）
4. **2025-11-10**: smoothing値修正 + FPS閾値緩和（本修正）

---

## ⚠️ 今後の注意事項

### PitchProライブラリ更新時
- DeviceDetection.ts の `smoothingFactor` が0.1であることを確認
- performance-optimized.ts の閾値が2.0倍であることを確認
- 新規デバイス追加時も0.1を使用

### パフォーマンスチューニング
- FPS低下が頻発する場合: 閾値を2.5倍に緩和検討
- FPS低下が全く発生しない場合: 閾値を1.8倍に厳格化検討
- デバイス別の最適化: 必要に応じてデバイス別閾値の実装

### 測定精度の継続監視
- データ収集数が40件を下回る場合: FPS維持の再確認
- 異常値（±180¢超）が増加する場合: 200ms除外ロジックの再検証
- ユーザーフィードバック: 音量バーの応答性・トレーニング体験

---

**修正完了日**: 2025-11-10  
**修正者**: Claude + User  
**検証状態**: プライベートブラウズで部分検証済み（smoothing: 0.1確認）、FPS改善は次回検証予定