# 音量バー問題の調査結果と解決方針

## 調査日: 2025-11-26

## 問題の経緯

### 発端
- autoUpdateUI: true では音量が2倍になるバグが発生
- autoUpdateUI: false に切り替えて手動更新に変更
- しかし、フッターホームでホームに戻って再度トレーニングを開始すると音量バーが半分になる問題が発生

### 調査で判明した二重のバグ

#### バグ1: アプリ側の実装不統一
- 各ページ（preparation, training, voice-range-test）で音量バー更新の実装がバラバラだった
- autoUpdateUIの設定も統一されていなかった（pitchpro-config.jsのデフォルトがtrue、一部ページでfalse指定）

#### バグ2: iOS Safari固有の既知のバグ
- getUserMedia()を再呼び出しすると音量が低下する
- WebKit Bug 230902として報告されている
- Safari 15 / iOS 15以降のリグレッションバグ

### 検証結果

| デバイス | 1回目 | 2回目（フッターホーム後） | 変化 |
|---------|-------|-------------------------|------|
| **PC** | 12〜16% | 14〜18% | **ほぼ同じ** |
| **iPhone** | 45〜48% | 17〜24% | **約半分に低下** |

- PCでは問題なし
- iPhoneでのみ発生 → iOS Safari固有の問題と特定

## 試行した対策

### 1. VolumeUIHelper作成（アプリ側統一）
- `/js/core/volume-ui-helper.js` を新規作成
- 計算式: `rawVolume * 100`（multiplierは不要、PitchPro内部で正規化済み）
- 全ページで統一的にUI更新

### 2. pitchpro-config.jsのデフォルト値修正
- autoUpdateUI: true → false に変更
- VolumeUIHelper統一管理のため

### 3. cleanupAudioDetectorForHome()追加
- フッターホームでホームに戻る時にAudioDetectorをdestroy()
- **しかし、これがiOS Safariでは逆効果**（getUserMedia再呼び出しで音量低下）

## iOS Safari既知のバグの詳細

### WebKit Bug 230902
- URL: https://bugs.webkit.org/show_bug.cgi?id=230902
- 内容: MediaStreamTrackの音量が低くなるリグレッションバグ

### 複数getUserMedia呼び出しの問題
- 参考: https://webrtchacks.com/guide-to-safari-webrtc/
- 同じメディアタイプを再度getUserMedia()でリクエストすると、以前のトラックのmutedプロパティがtrueになる
- プログラムでアンミュートする方法がない

### 推奨される解決策
- MediaStreamを再利用する（getUserMediaを再呼び出ししない）
- MediaStream.clone()、addTrack()、removeTrack()で操作

## 今後の方針

### タスク1: PitchProのautoUpdateUI: trueに戻す
- VolumeUIHelperを削除
- pitchpro-config.jsのデフォルトをtrueに戻す
- 各ページからVolumeUIHelper呼び出しを削除

### タスク2: iOS Safari対策としてMediaStreamを保持
- cleanupAudioDetectorForHome()を削除または無効化
- フッターホームでもAudioDetectorをdestroy()しない
- 「トレーニングフロー外遷移でもAudioDetector保持（PitchPro管理に委譲）」の設計に戻す

### タスク3: 各ページでの実装統一確認
- autoUpdateUI: trueで全ページ統一
- PitchProのUI自動更新に任せる

## 関連ファイル

### 今回追加・修正したファイル（戻す対象）
- `/js/core/volume-ui-helper.js` - 削除
- `/js/core/pitchpro-config.js` - autoUpdateUIデフォルトをtrueに戻す
- `/index.html` - cleanupAudioDetectorForHome()削除、VolumeUIHelperのscriptタグ削除
- `/pages/js/preparation-pitchpro-cycle.js` - VolumeUIHelper呼び出し削除
- `/js/controllers/trainingController.js` - VolumeUIHelper呼び出し削除
- `/pages/js/voice-range-test.js` - VolumeUIHelper呼び出し削除

## 重要な教訓

1. **iOS Safariでは getUserMedia()を複数回呼び出さない**
2. **MediaStreamは可能な限り保持して再利用**
3. **デバイス固有の問題はPCとiPhone両方でテストして切り分ける**
4. **複数のバグが同時に発生している可能性を考慮する**
