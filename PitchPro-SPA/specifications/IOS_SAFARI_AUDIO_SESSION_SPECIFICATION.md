# iOS Safari AudioSession仕様書

**バージョン**: 1.0.0
**作成日**: 2025-11-23
**最終更新**: 2025-11-23
**作成者**: Claude Code

## 変更履歴

- **v1.0.0 (2025-11-23)**: 初版作成
  - WebKit Bug #218012の対策として準備ページv9実装完了
  - トレーニングページでの意図的な無効化理由を文書化

---

## 1. 概要

### 1.1 本仕様書の目的

iOS Safariにおける音声再生とマイク入力の競合問題（WebKit Bug #218012）への対策を文書化し、将来のメンテナンスと問題発生時のトラブルシューティングを支援する。

### 1.2 対象ブラウザ

- iOS Safari（iPhone/iPad）
- iPadOS Safari（iPad）
- 対象バージョン: iOS 13以降

### 1.3 関連ファイル

| ファイル | 役割 |
|---------|------|
| `pages/js/preparation-pitchpro-cycle.js` | 準備ページの基音試聴ボタン処理（v9実装） |
| `js/controllers/trainingController.js` | トレーニングページの基音再生処理（意図的に無効化） |
| `js/core/reference-tones.js` | PitchShifter（Tone.js Sampler）による音声再生 |

---

## 2. 問題の詳細

### 2.1 WebKit Bug #218012

**バグ概要**: iOS Safariでマイクがアクティブな状態で音声を再生すると、音量が極端に小さくなる。

**原因**: iOS Safariは、マイクがアクティブな状態（`play-and-record`モード）で音声を再生する際、自動的に出力先を**メインスピーカー**から**受話口（イヤスピーカー）**にルーティングする。

**参考**: https://bugs.webkit.org/show_bug.cgi?id=218012

### 2.2 技術的背景

#### navigator.audioSession API

iOS Safariは`navigator.audioSession`という独自APIを提供している。

```javascript
// audioSession.type の値
'auto'            // デフォルト、システムが自動選択
'playback'        // 音声再生専用モード（メインスピーカー使用）
'play-and-record' // 再生と録音の両方（受話口にルーティングされる問題あり）
```

#### 問題発生のメカニズム

1. マイクを使用開始 → audioSessionが`play-and-record`に自動変更
2. 音声を再生 → 受話口にルーティング → **音量が極端に小さい**
3. ユーザーには音が聞こえないか、非常に小さく聞こえる

### 2.3 影響範囲

| ページ | 基音再生タイミング | マイク状態 | 影響 |
|--------|-------------------|----------|------|
| 準備ページ | 「基音を試聴」ボタン押下時 | アクティブ | **影響あり** |
| トレーニングページ | 「基音を再生」ボタン押下時 | アクティブ | **影響あり** |

---

## 3. 対応方針

### 3.1 準備ページ（v9実装）

#### 採用した解決策

マイク停止 + audioSession切替 + Tone.start()強制実行 + 3秒後復元

#### 実装フロー

```
1. マイク一時停止（stopDetection）
   ↓
2. audioSessionを'playback'に切替
   ↓
3. Tone.start()を強制実行（★重要）
   ↓
4. 基音を再生（C3, 1秒）
   ↓
5. 3000ms後にaudioSession復元（'play-and-record'）
   ↓
6. マイク再開（startDetection）
```

#### なぜTone.start()が必要か

audioSessionを`playback`に切り替えただけでは、AudioContextのルーティングは更新されない。`Tone.start()`を呼び出すことで、AudioContextが新しいaudioSession設定を採用し、メインスピーカーへのルーティングが有効になる。

#### 3秒待機の理由（ブチ音防止）

音のエンベロープ:
- Attack: 0.02秒
- Sustain: 1.0秒
- Release: 1.5秒
- **合計: 2.52秒**

audioSession復元タイミング:
- 2600ms → ブチ音発生（リリース中に復元）
- **3000ms → 問題なし**（リリース完了後500msの余裕）

#### コード（preparation-pitchpro-cycle.js）

```javascript
// 【iOS Safari対応 v9】基音再生時の音量問題対策
// WebKit Bug #218012: マイクアクティブ時に音声出力が受話口にルーティングされる

// 1. マイク一時停止
audioDetector.stopDetection();
micWasActive = true;
console.log('🎤 [iOS] マイク一時停止');

// 2. audioSessionを'playback'に切替
if (navigator.audioSession) {
    navigator.audioSession.type = 'playback';
    console.log('🔊 [iOS] audioSession.type → playback');
}

// 3. Tone.start()を強制実行（★これが鍵）
if (typeof Tone !== 'undefined') {
    await Tone.start();
    await new Promise(resolve => setTimeout(resolve, 50));
}

// 4. 基音を再生
await window.pitchShifterInstance.playNote("C3", 1.0);

// 5. 3秒後に復元（ブチ音防止）
setTimeout(async () => {
    // audioSession復元
    if (navigator.audioSession) {
        navigator.audioSession.type = 'play-and-record';
    }
    // マイク再開
    if (micWasActive && audioDetector) {
        audioDetector.startDetection();
    }
}, 3000);
```

### 3.2 トレーニングページ（意図的に無効化）

#### 無効化の理由

トレーニングページでは、audioSession切替を**意図的に無効化**している。

**問題**: `playback`モードに切り替えると、2回目以降の基音再生で音が出なくなる問題が発生した。

**推測される原因**:
- トレーニングページでは8セッション連続で基音再生が行われる
- audioSession切替の頻繁な実行がAudioContextの状態を不安定にする
- 準備ページと異なり、連続再生のユースケースでは問題が顕在化

#### 現状の対応（trainingController.js）

```javascript
// 【iOS Safari対応 v3】audioSession切り替えは行わない
// 理由: playbackモードに切り替えると2回目以降の基音再生で音が出なくなる問題が発生
// マイク停止（stopDetection）のみで対応し、audioSessionは変更しない
// WebKit Bug #218012 の回避策としては不完全だが、音が出ないよりは音量が小さい方がマシ
if (navigator.audioSession) {
    console.log(`🔊 [iOS] audioSession.type (現在): ${navigator.audioSession.type}（変更なし）`);
}

await pitchShifter.playNote(baseNoteInfo.note, 1.0);
```

#### 現状の動作

2025-11-23時点でトレーニングページでの音量問題は**報告されていない**。

推測される理由:
- 準備ページでv9対策を実施した後、トレーニングページに遷移するフローになっている
- 準備ページでの`Tone.start()`呼び出しがAudioContextの状態を適切に設定している可能性
- または、トレーニングページ遷移時にaudioSessionの状態がリセットされている可能性

---

## 4. 実装バージョン履歴

### 準備ページの試行履歴

| バージョン | 内容 | 結果 |
|-----------|------|------|
| v5 | audioSession切替削除（トレーニングと統一） | ❌ 音が非常に小さい |
| v6 | Tone.start()を条件付きで実行 | ❌ 効果なし（既にrunning状態） |
| v7 | audioSession切替復活 | △ 部分的改善 |
| v8 | audioSession切替後にTone.start()強制実行 | ✅ **音量問題解決** |
| v9 | audioSession復元タイミングを3秒に延長 | ✅ **ブチ音問題解決** |

### 重要な発見

**v8での発見**: audioSession切替だけでは不十分。切替後に`Tone.start()`を呼び出すことで、AudioContextが新しいルーティング設定を採用する。

**v9での発見**: 音のリリースフェーズ中にaudioSessionを復元するとブチ音が発生。音の完全終了後に復元する必要がある。

---

## 5. トラブルシューティング

### 5.1 音量が小さい場合

**確認項目**:
1. audioSessionが`playback`に切り替わっているか
2. `Tone.start()`が呼び出されているか
3. マイクが停止されているか

**デバッグログ**:
```
🎤 [iOS] マイク一時停止
🔊 [iOS] audioSession.type → playback
🔊 Tone.start()を強制実行...
✅ Tone.start()完了 (state: running)
✅ 基音C3を再生しました
```

### 5.2 ブチ音が発生する場合

**確認項目**:
1. audioSession復元タイミングが音の完全終了後か
2. 音のエンベロープ設定（attack + sustain + release）を確認
3. 復元タイミングを延長（500ms以上の余裕を確保）

**計算式**:
```
復元タイミング = attack + sustain + release + 余裕時間
             = 0.02 + 1.0 + 1.5 + 0.5
             = 3.02秒 ≒ 3000ms
```

### 5.3 2回目以降の再生で音が出ない場合

**これはトレーニングページで発生した問題**。

対処法:
- audioSession切替を無効化し、マイク停止のみで対応
- 連続再生シナリオではaudioSession切替を避ける

---

## 6. 将来の検討事項

### 6.1 統一メソッド化の検討

現時点では準備ページとトレーニングページで異なる対応をしているが、将来的に統一メソッド化を検討する場合は以下を考慮する必要がある:

- 連続再生（8セッション）での安定性
- audioSession切替の頻度制限
- AudioContextのライフサイクル管理

### 6.2 WebKit Bug修正の監視

WebKit Bug #218012が修正された場合、本対策は不要になる可能性がある。定期的にバグステータスを確認し、修正されたら対策コードの削除を検討する。

---

## 7. 関連仕様書

- `VOLUME_BAR_INTEGRATION_SPECIFICATION.md` - 音量バー統合仕様書
- `TRAINING_SPECIFICATION.md` - トレーニング機能仕様書
- `MICROPHONE_BACKGROUND_RESILIENCE.md` - マイクバックグラウンド復帰仕様書

---

## 8. 参考リンク

- [WebKit Bug #218012](https://bugs.webkit.org/show_bug.cgi?id=218012)
- [navigator.audioSession API](https://developer.apple.com/documentation/webkitjs/audiosession)
- [Tone.js Documentation](https://tonejs.github.io/)
