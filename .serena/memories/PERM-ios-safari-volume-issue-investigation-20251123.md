# iOS Safari 音量問題調査レポート

**作成日**: 2025-11-23
**最終更新**: 2025-11-23
**ステータス**: ✅ 解決済み（v8方式）

---

## 📋 問題概要

**iPhoneで準備ページの基音試聴がトレーニングページより音量が小さい**

- 準備ページ: マイクアクティブ状態で基音再生 → 音量が小さい
- トレーニングページ: マイク使用前に基音再生 → 音量が正常

---

## 🔬 根本原因

### WebKit Bug #218012
マイクがアクティブになると、iOS Safariは自動的に「play-and-record」オーディオカテゴリに切り替わり：
- スピーカールーティングが受話器（イヤピース）に変更
- 再生音量が自動的に抑制される

---

## ✅ 解決策（v8方式）

### 実装コード（preparation-pitchpro-cycle.js）

```javascript
// 1. マイクを一時停止
audioDetector.stopDetection();

// 2. audioSessionをplaybackに切り替え
navigator.audioSession.type = 'playback';

// 3. Tone.start()を強制実行（重要！）
// audioSession切り替え後に実行することで、AudioContextのルーティングが再設定される
await Tone.start();

// 4. 基音を再生
await pitchShifterInstance.playNote("C3", 1.0);

// 5. 再生完了後にaudioSessionを復元してマイク再開
setTimeout(() => {
    navigator.audioSession.type = 'play-and-record';
    audioDetector.startDetection();
}, 2600);
```

### 重要なポイント

| 順序 | 処理 | 必須 |
|-----|------|-----|
| 1 | マイク停止 | ✅ |
| 2 | `audioSession → playback` | ✅ |
| 3 | `Tone.start()` 強制実行 | ✅ **これが鍵** |
| 4 | `playNote()` | ✅ |
| 5 | `audioSession → play-and-record` 復元 | ✅ |
| 6 | マイク再開 | ✅ |

### なぜTone.start()が必要か

- `audioSession`を`playback`に切り替えただけでは、既存のAudioContextのルーティングは変わらない
- `Tone.start()`を呼び出すことで、AudioContextが新しい`audioSession`設定を反映する
- **切り替え後**に`Tone.start()`を実行することが重要

---

## 🔄 試行錯誤の履歴

| バージョン | アプローチ | 結果 |
|-----------|-----------|------|
| v1-v4 | audioSession切り替えのみ | ❌ 2回目以降音が出ない |
| v5 | audioSession切り替えを削除（トレーニングと統一） | ❌ 音量が非常に小さい |
| v6 | Tone.start()を条件付きで実行 | ❌ 効果なし |
| v7 | audioSession切り替え復活 + 復元タイミング修正 | △ 改善傾向 |
| **v8** | **audioSession切り替え後にTone.start()強制実行** | ✅ **解決** |

---

## 📊 動作確認結果

### パターン1：初回動線（音域テストあり）
- 準備ページ → 基音を視聴 → ✅ 正常な音量

### パターン2：再度トレーニング（音域スキップ）
- 準備ページ → 基音を視聴 → ✅ 正常な音量
- トレーニング → 基音再生 → ✅ 正常な音量

---

## 📚 参考リンク

- [WebKit Bug #218012](https://bugs.webkit.org/show_bug.cgi?id=218012) - Audio Volume reduces considerably on accepting the mic permissions
- [navigator.audioSession API](https://developer.apple.com/documentation/webkitjs/audiocontext) - iOS Safari固有のAPI

---

## 📁 関連ファイル

- `/PitchPro-SPA/pages/js/preparation-pitchpro-cycle.js` - 基音を視聴ボタンの処理（行2060-2135付近）
- `/PitchPro-SPA/js/controllers/trainingController.js` - トレーニングページの基音再生（行750-780付近）
