# iOS Safari 音量問題調査レポート

**作成日**: 2025-11-23
**最終更新**: 2025-11-23
**ステータス**: 調査完了・方針変更・トレーニングページと統一

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

### 2. WebKit Bug #218012

**マイクがアクティブになると、iOS Safariは自動的に「play-and-record」オーディオカテゴリに切り替わり、以下が発生**：

| 現象 | 詳細 |
|------|------|
| スピーカールーティング変更 | メインスピーカー → 受話器（イヤピース） |
| エコーキャンセレーション | 再生音量を自動的に下げる |
| 音質劣化 | 高忠実度 → 低忠実度 |

---

## ⚠️ audioSession切り替えの副作用

### 発見された問題

**playbackモードに切り替えると2回目以降の基音再生で音が出なくなる**

- トレーニングページで先に発見（trainingController.js 行770-773のコメント参照）
- 準備ページでも同様の問題が発生することを確認（2025-11-23）

### 症状

1. ホーム → 準備 → 基音を視聴 → 音が出る ✅
2. トレーニング中 → ホームに戻る → 再度準備 → 基音を視聴 → 音が出ない ❌

### 原因

- `audioSession.type = 'playback'` への切り替えが、ページ遷移後に影響を残している
- 2回目のセッションでAudioContextまたはTone.jsの状態が不整合になる

---

## ✅ 最終的な実装方針（2025-11-23）

### トレーニングページと統一

**audioSession切り替えは行わず、マイク停止のみで対応**

理由:
- 音量が小さいよりも「音が出ない」方が致命的
- WebKit Bug #218012 の完全な回避策は存在しない
- トレーニングページと準備ページで同じ方式を使用することで一貫性を保つ

### 実装コード（preparation-pitchpro-cycle.js）

```javascript
// 【iOS Safari対応 v5】audioSession切り替えは行わない（トレーニングページと統一）
// 理由: playbackモードに切り替えると2回目以降の基音再生で音が出なくなる問題が発生
// マイク停止（stopDetection）のみで対応し、audioSessionは変更しない
// WebKit Bug #218012 の回避策としては不完全だが、音が出ないよりは音量が小さい方がマシ
if (navigator.audioSession) {
    console.log(`🔊 [iOS] audioSession.type (現在): ${navigator.audioSession.type}（変更なし）`);
}

// C3を再生（Tone.js Sampler経由）
await window.pitchShifterInstance.playNote("C3", 1.0);
```

---

## 📊 変更履歴

| 日付 | 変更内容 |
|------|---------|
| 2025-11-23 | 初回調査・audioSession切り替え実装 |
| 2025-11-23 | 副作用発見・方針変更（audioSession切り替え削除） |

---

## 📚 参考リンク

- [WebKit Bug #218012](https://bugs.webkit.org/show_bug.cgi?id=218012) - Audio Volume reduces considerably on accepting the mic permissions
- [WebKit Bug #282939](https://bugs.webkit.org/show_bug.cgi?id=282939) - 2024年11月報告の関連バグ

---

## 📌 結論

iOS Safariの音量問題は**WebKitのシステムレベルのバグ**であり、`audioSession`の切り替えは副作用が大きい。

**採用した方式**: マイク停止のみで対応（audioSession変更なし）
- 音量は多少小さくなるが、確実に音が出る
- トレーニングページと同じ方式で一貫性を保つ
