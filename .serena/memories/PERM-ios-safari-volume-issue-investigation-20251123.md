# iOS Safari 音量問題調査レポート

**作成日**: 2025-11-23
**ステータス**: 調査完了・一部実装済み・追加対応検討中

---

## 📋 問題概要

**iPhoneで準備ページの基音試聴がトレーニングページより音量が小さい**

- 準備ページ: マイクアクティブ状態で基音再生 → 音量が小さい
- トレーニングページ: マイク使用前に基音再生 → 音量が正常

---

## 🔬 調査で発見したこと

### 1. iOS Safari `navigator.audioSession` API

| タイプ | 説明 |
|--------|------|
| `'playback'` | マイク無効化、音声出力が通常音量 |
| `'play-and-record'` | マイク有効、音声出力が抑制される可能性 |
| `'auto'` | デフォルト（状況依存） |

### 2. マイク使用時の影響

iOS Safariはマイク使用中に音声出力にエコーキャンセレーション処理を適用

---

## 🌐 Web調査で発見した根本原因

### WebKit Bug #218012

**マイクがアクティブになると、iOS Safariは自動的に「play-and-record」オーディオカテゴリに切り替わり、以下が発生**：

| 現象 | 詳細 |
|------|------|
| スピーカールーティング変更 | メインスピーカー → 受話器（イヤピース） |
| エコーキャンセレーション | 再生音量を自動的に下げる |
| 音質劣化 | 高忠実度 → 低忠実度 |

---

## 🛠️ 推奨される解決策（Web調査より）

### 方法1: `navigator.audioSession` API の正しい使用順序

```javascript
// ステップ1: マイクアクセス前にリセット
navigator.audioSession.type = 'auto';

// ステップ2: マイクアクセス
const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

// ステップ3: マイク取得後に設定（重要！この順序）
navigator.audioSession.type = 'play-and-record';

// ステップ4: マイク終了後（音声再生時）
navigator.audioSession.type = 'playback';
navigator.audioSession.type = 'auto'; // 高忠実度に復元
```

**⚠️ 重要**: `getUserMedia()` の**前に** `play-and-record` を設定すると、50%の確率で失敗する

### 方法2: エコーキャンセレーション無効化

```javascript
const stream = await navigator.mediaDevices.getUserMedia({ 
    audio: { 
        echoCancellation: false,
        autoGainControl: false,
        noiseSuppression: false
    }
});
```

### 方法3: 音声再生時にマイクを一時停止

- 基音再生前にマイクストリームを停止
- 再生完了後にマイクを再開

---

## ✅ 実装済みの修正（2025-11-23）

| ファイル | 修正内容 |
|---------|---------|
| `preparation-pitchpro-cycle.js` | 基音試聴前に `audioSession.type = 'playback'` を設定 |
| `trainingController.js` | マイクアクセス前に `audioSession.type = 'play-and-record'` を設定 |
| `voice-range-test.js` | 大量の「🔇」ログをコメントアウト |

### コミット履歴

1. `c2306ff`: iOS audioSession.type をマイクアクセス前に play-and-record に設定
2. `4cc882f`: 音域テストの大量デバッグログを抑制

---

## ⚠️ 残存する問題と原因

**音量差は依然として存在する理由**：

- 準備ページではマイクがアクティブな状態で `'playback'` を設定しているが、**マイクが動作中のため効果が限定的**
- WebKit Bug #218012 により、マイク使用中は音声出力が自動的に抑制される

---

## 📝 次のステップ候補

### 1. 基音再生時にマイクを一時停止する実装

```javascript
// 基音再生前
audioDetector.stopDetection();
navigator.audioSession.type = 'playback';

// 再生
await pitchShifterInstance.playNote("C4", 1.0);

// 再生完了後
navigator.audioSession.type = 'play-and-record';
audioDetector.startDetection();
```

### 2. audioSession の設定順序を修正

- マイク停止後に `'playback'` → `'auto'` の順で設定

### 3. トレーニングページでも同様のaudioSession管理を実装

- 基音再生時の音量を統一

---

## 📚 参考リンク

- [WebKit Bug #218012](https://bugs.webkit.org/show_bug.cgi?id=218012) - Audio Volume reduces considerably on accepting the mic permissions
- [WebKit Bug #282939](https://bugs.webkit.org/show_bug.cgi?id=282939) - 2024年11月報告の関連バグ
- [Stack Overflow - iOS Safari lowers audio playback volume when mic is in use](https://stackoverflow.com/questions/76083738/ios-safari-lowers-audio-playback-volume-when-mic-is-in-use)
- [Stack Overflow - iOS Safari switches audio output to speakers](https://stackoverflow.com/questions/79401143/ios-safari-switches-audio-output-to-speakers-when-starting-microphone-recording)

---

## 🔧 PitchProでの既存エコーキャンセレーション設定

現在のPitchPro設定（`pitchpro-v1.3.5.umd.js`）では既に以下が無効化されている：

```javascript
{
    echoCancellation: false,
    autoGainControl: false,
    noiseSuppression: false
}
```

これにより一定の効果はあるが、iOS Safariのシステムレベルの音声ルーティング変更は防げない。

---

## 📌 結論

iOS Safariの音量問題は**WebKitのシステムレベルのバグ**であり、完全な解決には：

1. **マイク停止 → 音声再生 → マイク再開** のフローが最も効果的
2. `navigator.audioSession` API の正しい順序での使用
3. 将来的なWebKitの修正を待つ

現時点では「基音再生時にマイクを一時停止する」実装が最も現実的な解決策。
