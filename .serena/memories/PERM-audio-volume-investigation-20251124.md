# 音量設定調査レポート (2025-11-24)

## 調査の背景

iPadの準備ページで基音試聴の音量が異常に小さくなる問題が発生。
以前は「最初の1回だけ小さく、2回目以降は正常」だったが、
現在は「何度タップしても小さいまま」という別の症状に変化。

## 時系列での変更履歴

### 基準点: edf9fc0 (2025-11-23 22:24) - iPhoneが正常動作していた状態

**device-detector.js:**
- PC: -12dB
- iPhone: -12dB
- iPad: -12dB
- Android: -12dB
- iPhone感度: 4.5x
- iPad感度: 7.0x

**reference-tones.js (v2.9.3):**
- iPad低音域(<130Hz): 0.6x
- iPad中低音域(130-260Hz): 0.75x
- iPhone/PC/Android低音域: 0.35x
- iPhone/PC/Android中低音域: 0.5x

### 問題を引き起こした変更の流れ

1. **60c6637 (10:43) - v2.9.4**: iPad velocity減衰撤廃
   - iPad低音域: 0.6x → 1.0x
   - iPad中低音域: 0.75x → 1.0x
   - 目的: iPadで基音が聞こえにくい問題を修正

2. **c2a780a (11:02)**: 音量大幅増加（問題のある変更）
   - iPad: -12dB → +20dB
   - iPhone: -12dB → +18dB
   - Android: -12dB → +18dB
   - **誤り**: 「mainブランチの設定を復元」と称して変更したが、
     feature/modular-spa-architectureでは-12dBが正しかった

3. **eb5dc1b (11:08)**: iPhone/Android音量を戻す
   - iPhone: +18dB → -12dB
   - Android: +18dB → -12dB
   - iPad: +20dB維持

4. **823cb4b (11:17)**: iPhone感度を下げる
   - iPhone: 4.5x → 3.5x
   - Android: 4.5x → 4.0x

5. **9dc6753 (11:29) - v2.9.5**: iPhone velocity減衰も撤廃（問題のある変更）
   - isIOS = isIPad || isIPhone に変更
   - iPhone低音域: 0.35x → 1.0x
   - iPhone中低音域: 0.5x → 1.0x

6. **a19a22d (11:43) - v2.9.6**: iPhone減衰を復元
   - isIPad のみで判定に戻す
   - iPhone低音域: 1.0x → 0.35x
   - iPhone中低音域: 1.0x → 0.5x
   - SAMPLE_VERSIONは2.9.3のまま更新忘れ

7. **e106882 (12:19)**: iPhone音量を0dBに
   - iPhone: -12dB → 0dB

8. **1289e1c**: SAMPLE_VERSION修正
   - 2.9.3 → 2.9.6

## 現在の設定値 vs edf9fc0

| 項目 | edf9fc0 | 現在 | 変化 |
|------|---------|------|------|
| PC音量 | -12dB | -12dB | 同じ |
| iPhone音量 | -12dB | 0dB | +12dB |
| iPad音量 | -12dB | +20dB | +32dB |
| Android音量 | -12dB | -12dB | 同じ |
| iPhone感度 | 4.5x | 3.5x | -22% |
| iPad感度 | 7.0x | 7.0x | 同じ |
| iPad velocity(低) | 0.6x | 1.0x | +67% |
| iPad velocity(中低) | 0.75x | 1.0x | +33% |
| iPhone velocity | 0.35x/0.5x | 0.35x/0.5x | 同じ |

## 問題の根本原因

Web版Claudeで作成した修正ブランチ(`claude/fix-ipad-audio-playback`)が
mainブランチをベースにしており、mainブランチには+18dB/+20dBの設定があった。

その後、「mainブランチの設定を復元」と称してc2a780aで音量を大幅に増加させたが、
これはfeature/modular-spa-architectureで正常動作していたedf9fc0の設定とは異なっていた。

## 再現されている問題

### iPad: 何度タップしても基音が小さい
- 現在の設定: +20dB音量 + velocity 1.0x（減衰なし）
- 結果: 音量が過大でTone.jsがクリッピングまたは異常動作

### iPhone: キャッシュクリア後の動作確認が必要
- 現在の設定: 0dB音量 + velocity 0.5x（減衰あり）
- edf9fc0では-12dBで正常動作していた

## 次のステップ

1. 各デバイスの特性を理論的に分析
2. edf9fc0の値の妥当性を検証
3. 現在の症状が設定値から論理的に説明できることを確認
4. デバイスごとの最適値を理論的にフィックス
