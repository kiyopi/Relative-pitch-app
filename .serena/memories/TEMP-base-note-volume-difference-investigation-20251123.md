# 基音再生音量差異の調査結果（2025-11-23）

## 問題の症状
- **報告**: iPhoneで準備ページの基音試聴と、トレーニングページの基音再生で、後者の方が2倍以上の音量が出る
- **PCでは再現しない**: PCでは音量差異は感じられない
- **音程に関係なく発生**: 低音・高音関係なく、トレーニングページの方が音量が大きい

## 調査で確認した共通点（原因ではない）
| 項目 | 準備ページ | トレーニングページ |
|------|-----------|------------------|
| PitchShifterインスタンス | `window.pitchShifterInstance` | 同じグローバルインスタンスを使用 |
| sampler.volume | -12dB | -12dB |
| Tone.Destination volume | 0dB | 0dB |
| AudioContext state | running | running |
| playNote呼び出し | `playNote("C4", 1.0)` | `playNote(baseNoteInfo.note, 1.0)` |

## 発見した違い（原因の可能性が高い）

### 準備ページ（preparation-pitchpro-cycle.js 行2049-2055付近）
```javascript
// playNote() を直接呼び出し
// Tone.start() や Tone.context.resume() を呼んでいない
await window.pitchShifterInstance.playNote("C4", 1.0);
```

### トレーニングページ（trainingController.js 行727-746）
```javascript
// iOS/iPadOS対応: AudioContextを明示的にresume（ユーザーインタラクション時に必須）
if (typeof Tone !== 'undefined' && Tone.context) {
    console.log('🔊 AudioContext状態確認... (state:', Tone.context.state + ')');

    // Tone.start()を明示的に呼び出し（iOS/iPadOS対応）
    if (Tone.context.state === 'suspended') {
        console.log('🔊 Tone.start()実行中...');
        await Tone.start();
        console.log('✅ Tone.start()完了 (state:', Tone.context.state + ')');
    }

    // resume()で確実に起動
    if (Tone.context.state !== 'running') {
        console.log('🔊 AudioContext再開中... (state:', Tone.context.state + ')');
        await Tone.context.resume();
        console.log('✅ AudioContext再開完了 (state:', Tone.context.state + ')');

        // 安定化のため少し待機（iOS/iPadOS対策）
        await new Promise(resolve => setTimeout(resolve, 100));
    }
}

await pitchShifter.playNote(baseNoteInfo.note, 1.0);
```

## 仮説
- iOS では `Tone.start()` を呼び出すことで、Web Audio API の音量制限が解除される
- 準備ページではこの処理がないため、音量が抑制されている
- トレーニングページでは明示的に `Tone.start()` を呼んでいるため、フル音量で再生される
- PCでは `Tone.start()` の有無に関係なく音量が同じため、問題が発生しない

## 注記
- `reference-tones.js` の `playNote()` メソッド内にも `AudioContext.resume()` 処理があるが（行143-151）、`Tone.start()` は呼んでいない
- ログでは両ページとも `AudioContext state: running` だが、iOS の音量制限は別の仕組みで動作している可能性

## 推奨される修正
準備ページの基音試聴ボタンのクリックハンドラーに、トレーニングページと同じ `Tone.start()` / `Tone.context.resume()` 処理を追加する

## 関連ファイル
- `/PitchPro-SPA/pages/js/preparation-pitchpro-cycle.js` - 行2049-2055付近
- `/PitchPro-SPA/js/controllers/trainingController.js` - 行727-746
- `/PitchPro-SPA/js/core/reference-tones.js` - playNoteメソッド

## ステータス
- **調査**: 完了
- **原因特定**: Tone.start() の呼び出し有無が原因の可能性が高い
- **修正**: 未実装（ユーザー確認待ち）
