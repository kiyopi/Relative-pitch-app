# 音量設定の最適値（理論的導出）

## 確定した最適設定

### device-detector.js - getDeviceVolume()

```javascript
getDeviceVolume() {
    const device = this.getDeviceType();
    const volumeSettings = {
        pc: -12,       // -12dB: 外部スピーカー接続想定、クリッピング防止
        iphone: -12,   // -12dB: 内蔵スピーカーで十分、低音は自然減衰
        ipad: -12,     // -12dB: 大スピーカーで十分、+20dBはクリッピング原因
        android: -12   // -12dB: PCと同等の安全マージン
    };
    return volumeSettings[device] || -12;
}
```

### device-detector.js - getDeviceSensitivity()

```javascript
getDeviceSensitivity() {
    const device = this.getDeviceType();
    const sensitivitySettings = {
        pc: 4.0,       // 4.0x: PC内蔵マイク標準
        iphone: 4.5,   // 4.5x: 高品質マイク、適度な感度
        ipad: 7.0,     // 7.0x: マイク-スピーカー距離大、高感度必要
        android: 4.5   // 4.5x: iPhoneと同等
    };
    return sensitivitySettings[device] || 4.0;
}
```

### reference-tones.js - velocity減衰ロジック

```javascript
// iPad検出
const userAgent = navigator.userAgent;
const isIPad = /iPad/.test(userAgent) || (/Macintosh/.test(userAgent) && 'ontouchend' in document);

let adjustedVelocity = o;
if (a.frequency < 130) {
    // 低音域: iPad 0.6x, その他 0.35x
    adjustedVelocity = isIPad ? o * 0.6 : o * 0.35;
} else if (a.frequency < 260) {
    // 中低音域: iPad 0.75x, その他 0.5x
    adjustedVelocity = isIPad ? o * 0.75 : o * 0.5;
}
```

## 理論的根拠

### Tone.js dB設定について

- 0dB = 基準音量（フルスケール）
- -6dB = 約50%音量
- -12dB = 約25%音量
- +6dB = 約200%音量（クリッピング危険）
- +20dB = 約1000%音量（深刻なクリッピング/歪み）

**+20dBは絶対に使ってはいけない**
Tone.js推奨上限は+6dB程度。+20dBはデジタルクリッピングを引き起こす。

### デバイススピーカー特性

| デバイス | 低音再生能力 | C3(130Hz)再生 |
|----------|-------------|--------------|
| iPad | 60-140Hz程度まで | 可能（限界付近） |
| iPhone | 200Hz以上が主 | 困難 |
| PC | 外部依存 | 依存 |

### velocity減衰の必要性

低音域をフルvelocityで再生すると：
1. スピーカーの物理的限界で歪み発生
2. デジタル処理でクリッピング発生
3. 結果として聞き取りにくい音になる

適度に減衰させることで：
1. スピーカーの動作範囲内に収まる
2. クリーンな音質を維持
3. 実際に聞こえやすくなる

## 問題設定の分析

### +20dB + velocity 1.0xが問題を起こす理由

1. +20dB = 10倍増幅 → デジタルクリッピング
2. velocity 1.0x = 最大振幅 → クリッピング悪化
3. Web Audio API/ブラウザが過負荷検出
4. 保護機能が音量を強制抑制
5. 結果: 「何度タップしても小さい」

### -12dB + velocity 0.75xが正常な理由

1. 安全なマージンでクリッピングなし
2. iPadスピーカーの動作範囲内
3. クリーンな音質で正常再生
4. AudioContext初期化問題は別途対応（AudioContext resume）

## 参照コミット

- **edf9fc0**: 正常動作していた設定（この設定に戻すべき）
- **c2a780a**: 問題を引き起こした変更（mainブランチの誤った設定を取り込んだ）

## 注意事項

1. mainブランチには+18dB/+20dBの設定があるが、これは実機テスト不十分
2. feature/modular-spa-architectureでは-12dB統一が正解
3. Web版Claudeで作成したブランチはmainをベースにしていることがある
4. マージ時には設定値の変更に注意

## SAMPLE_VERSION

reference-tones.jsのSAMPLE_VERSIONは、velocity減衰ロジックの変更時に更新すること。
現在は2.9.6だが、edf9fc0の設定に戻す場合は2.9.3相当のロジックになる。
