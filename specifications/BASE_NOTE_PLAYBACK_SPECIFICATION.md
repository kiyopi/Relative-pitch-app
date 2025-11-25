# 基音再生の最終実装仕様書

**バージョン**: 1.1.0
**作成日**: 2025-01-25
**最終更新**: 2025-01-25（v4.4.0音量システム統一）
**対象**: PC / iPhone / iPad / Android
**関連**: 音声テスト廃止後の統一実装

---

## 📋 目次

1. [概要](#1-概要)
2. [デバイス別音量設定](#2-デバイス別音量設定)
3. [基音再生フロー](#3-基音再生フロー)
4. [iOS Safari音量バグ対策](#4-ios-safari音量バグ対策)
5. [ユーザー音量調整機能](#5-ユーザー音量調整機能)
6. [実装コード詳細](#6-実装コード詳細)
7. [トラブルシューティング](#7-トラブルシューティング)

---

## 1. 概要

### 1.1 目的

PC、iPhone、iPad、Androidの全デバイスで統一的かつ最適な基音再生を実現する。

### 1.2 主要コンポーネント

| コンポーネント | 役割 | ファイル |
|--------------|------|---------|
| **DeviceDetector** | デバイス判定・最適化設定取得 | `js/core/device-detector.js` |
| **PitchShifter** | 基音再生エンジン（Tone.js Sampler） | `js/core/reference-tones.js` |
| **TrainingController** | トレーニングページ制御 | `js/controllers/trainingController.js` |
| **Settings Controller** | ユーザー音量調整 | `pages/js/settings-controller.js` |

### 1.3 音声テスト廃止の経緯

**削除日**: 2025-01-25
**理由**: 準備ページとトレーニングページで基音再生音量が異なる環境差問題
**代替実装**: 設定ページに5段階ティックスライダー（-20, -10, 0, +10, +20）
**詳細**: `/specifications/VOLUME_TEST_REMOVAL_HISTORY.md`

### 1.4 音量システム統一（v4.4.0）

**実施日**: 2025-01-25
**背景**: 音声テスト廃止に伴い、新旧2つの音量システムが混在していた

| システム | localStorage キー | 形式 | 使用箇所 |
|---------|-----------------|------|---------|
| **旧システム**（削除） | `pitchpro_volume_percent` | 0-100% | 準備ページ音量スライダー（削除済み） |
| **新システム**（統一） | `pitchpro_base_note_volume_offset` | -20～+20dB | 設定ページティックスライダー |

**修正内容**:
- `getSavedVolumeDb()`を新システムに統一
- 旧システムの`pitchpro_volume_percent`キーを完全削除
- trainingController.js、preparation-pitchpro-cycle.js、router.jsの3ファイルを修正

---

## 2. デバイス別音量設定

### 2.1 基準音量（DeviceDetector.getDeviceVolume()）

**実装箇所**: `js/core/device-detector.js:100-111`

| デバイス | 基準音量 | 根拠 | 実機テスト |
|---------|---------|------|-----------|
| **PC** | `-12dB` | Mac音量50%環境での適切な音量 | ✅ 完了 |
| **iPhone** | `+18dB` | デバイス音量50%時に最適化 | ✅ 完了 |
| **iPad** | `+12dB` | play-and-record統一後の適切な音量 | ✅ 完了 |
| **Android** | `+18dB` | iPhoneと同等の設定 | ⚠️ 要確認 |

```javascript
// device-detector.js
getDeviceVolume() {
    const device = this.getDeviceType();
    const volumeSettings = {
        pc: -12,       // -12dB
        iphone: +18,   // +18dB
        ipad: +12,     // +12dB
        android: +18   // +18dB
    };
    return volumeSettings[device] || -12;
}
```

### 2.2 音量バー表示倍率（DeviceDetector.getDeviceSensitivity()）

**用途**: マイク音量バーの表示感度（基音再生には無関係）

| デバイス | 感度倍率 | 用途 |
|---------|---------|------|
| **PC** | `4.0x` | PC内蔵マイク |
| **iPhone** | `4.5x` | iPhone最適化 |
| **iPad** | `7.0x` | iPad最適化 |
| **Android** | `4.5x` | iPhoneと同等 |

**注意**: この設定は音量バー表示のみに使用され、基音再生音量には影響しません。

### 2.3 デバイス判定ロジック

**実装箇所**: `js/core/device-detector.js:26-53`

```javascript
getDeviceType() {
    const userAgent = navigator.userAgent || navigator.vendor || window.opera;

    // Android判定（最優先）
    if (/android/i.test(userAgent)) {
        return 'android';
    }

    // iOS判定
    const isIPhone = /iPhone/.test(userAgent);
    const isIPad = /iPad/.test(userAgent);
    const isMacintoshWithTouch = /Macintosh/.test(userAgent) && 'ontouchend' in document;

    if (isIPhone) {
        return 'iphone';
    } else if (isIPad || isMacintoshWithTouch) {
        return 'ipad'; // iPadOS 13+対策
    } else {
        return 'pc';
    }
}
```

**重要**: iPadOS 13+は`navigator.userAgent`で"Macintosh"と偽装するため、タッチサポート判定が必須。

---

## 3. 基音再生フロー

### 3.1 トレーニングページでの基音再生

**実装箇所**: `js/controllers/trainingController.js:719-825`

#### フロー図

```
[基音スタートボタン押下]
         ↓
[PitchShifter初期化確認]
         ↓
[マイク検出停止] ← 基音を拾わないため
         ↓
[iOS: audioSession確認]（変更なし）
         ↓
[ユーザー音量オフセット取得]
         ↓
[音量設定適用]
    基準音量 + オフセット
         ↓
[基音再生] pitchShifter.playNote()
         ↓
[2.5秒待機]（基音再生時間）
         ↓
[ドレミガイド開始]
```

#### コード例

```javascript
// trainingController.js:719-825
async function playBaseNote() {
    console.log('=== 基音再生開始 ===');

    // ボタン無効化
    playButton.disabled = true;
    playButton.classList.add('btn-disabled');

    try {
        // 1. PitchShifter初期化確認
        if (!pitchShifter || !pitchShifter.isInitialized) {
            await initializePitchShifter();
        }

        // 2. マイク検出を停止（基音を拾わないため）
        if (audioDetector && audioDetector.isDetecting) {
            audioDetector.stopDetection();
        }

        // 3. iOS Safari対応（audioSession確認のみ、変更なし）
        if (navigator.audioSession) {
            console.log(`🔊 [iOS] audioSession.type (現在): ${navigator.audioSession.type}（変更なし）`);
        }

        // 4. ユーザー音量オフセットを適用
        const volumeOffset = getBaseNoteVolumeOffset();
        if (volumeOffset !== 0 && pitchShifter.setVolume) {
            const baseVolume = window.DeviceDetector?.getDeviceVolume() ?? -6;
            const adjustedVolume = baseVolume + volumeOffset;
            pitchShifter.setVolume(adjustedVolume);
            console.log(`🔊 音量オフセット適用: ${baseVolume}dB + ${volumeOffset > 0 ? '+' : ''}${volumeOffset}dB = ${adjustedVolume}dB`);
        }

        // 5. 基音再生
        await pitchShifter.playNote(baseNoteInfo.note, 1.0);

        // ... セッション記録開始等

    } catch (error) {
        console.error('❌ 基音再生エラー:', error);
    }
}
```

### 3.2 PitchShifter初期化

**実装箇所**: `js/controllers/trainingController.js:625-709`

```javascript
async function initializePitchShifter() {
    // 1. グローバルインスタンスが既に初期化済みなら使用
    if (window.pitchShifterInstance && window.pitchShifterInstance.isInitialized) {
        console.log('✅ Using global PitchShifter instance (initialized from home page)');
        pitchShifter = window.pitchShifterInstance;
        return pitchShifter;
    }

    // 2. ローカルインスタンスが既に初期化済みならそのまま返す
    if (pitchShifter && pitchShifter.isInitialized) {
        console.log('✅ PitchShifter already initialized (local instance)');
        return pitchShifter;
    }

    // 3. PitchShifterが利用可能になるまで待機（最大10秒）
    let attempts = 0;
    while (!window.PitchShifter && attempts < 100) {
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
    }

    if (!window.PitchShifter) {
        throw new Error('PitchShifterライブラリが読み込まれていません（10秒タイムアウト）');
    }

    // 4. 新規初期化
    const baseVolume = window.DeviceDetector?.getDeviceVolume() ?? -6;
    pitchShifter = new window.PitchShifter({
        baseUrl: 'audio/piano/',
        release: 2.5,
        volume: baseVolume
    });

    await pitchShifter.initialize();
    console.log('✅ PitchShifter初期化完了');

    // 5. iOS/iPadOS対応: AudioContext起動
    if (typeof Tone !== 'undefined' && Tone.context) {
        if (Tone.context.state !== 'running') {
            await Tone.context.resume();
            console.log('✅ AudioContext起動完了');
        }
    }

    // 6. グローバルインスタンスとして登録
    window.pitchShifterInstance = pitchShifter;
    return pitchShifter;
}
```

### 3.3 基音情報の取得

**実装箇所**: `js/controllers/trainingController.js` (mode-specific)

```javascript
// 基音情報オブジェクトの構造
const baseNoteInfo = {
    note: 'C4',              // 音名（例：C4, D#3）
    frequency: 261.63,       // 周波数（Hz）
    offset: 0                // 音域調整オフセット（12音階モードのみ）
};

// モード別基音選択
// - ランダム基音: C3オクターブからランダム
// - 連続チャレンジ: クロマチック12音からランダム
// - 12音階: 順次使用（C4, C#4, D4...B4）
```

---

## 4. iOS Safari音量バグ対策

### 4.1 問題の詳細

**WebKit Bug #218012**: iOS Safariでマイクがアクティブな状態で音声を再生すると、音量が極端に小さくなる。

**原因**: iOS Safariは`play-and-record`モードで音声を再生する際、自動的に出力先を**メインスピーカー**から**受話口（イヤスピーカー）**にルーティングする。

**参考**: https://bugs.webkit.org/show_bug.cgi?id=218012

### 4.2 準備ページでの対策（削除済み）

**音声テスト廃止（2025-01-25）に伴い、準備ページの基音プレビュー機能は削除されました。**

旧実装では以下の対策を実施していました：
- マイク一時停止 → audioSession切替(`playback`) → Tone.start()強制実行 → 基音再生 → 3秒後復元

### 4.3 トレーニングページでの対策（意図的に無効化）

**実装方針**: audioSession切替を**意図的に無効化**

**理由**: `playback`モードに切り替えると、2回目以降の基音再生で音が出なくなる問題が発生。

**現状の動作**:
- マイクを停止（stopDetection）
- audioSessionは変更しない（`play-and-record`のまま）
- 音量は小さくなるが、音が出ないよりはマシ

```javascript
// trainingController.js:794-800
// 【iOS Safari対応 v3】audioSession切り替えは行わない
// 理由: playbackモードに切り替えると2回目以降の基音再生で音が出なくなる問題が発生
// マイク停止（stopDetection）のみで対応し、audioSessionは変更しない
// WebKit Bug #218012 の回避策としては不完全だが、音が出ないよりは音量が小さい方がマシ
if (navigator.audioSession) {
    console.log(`🔊 [iOS] audioSession.type (現在): ${navigator.audioSession.type}（変更なし）`);
}
```

**2025-11-23時点での状況**:
- トレーニングページでの音量問題は**報告されていない**
- 準備ページでの対策（Tone.start()）が効果を持続している可能性

### 4.4 代替案の検討

**将来的な改善案**:
1. **WebKit Bug修正の監視**: バグが修正されれば対策不要
2. **統一メソッド化**: 準備ページと同様の対策を実装（要検証）
3. **ユーザー教育**: 「iPhoneの音量が小さい場合は設定で調整」

---

## 5. ユーザー音量調整機能

### 5.1 設定ページの音量スライダー

**実装日**: 2025-01-25
**目的**: 音声テスト廃止後の代替音量調整機能

#### UI仕様

**ファイル**: `pages/settings.html`

```html
<section class="glass-card">
    <h4 class="heading-md">
        <i data-lucide="volume-2" class="text-yellow-300"></i>
        <span>音量設定</span>
    </h4>

    <div class="flex flex-col gap-2">
        <h5 class="text-body font-semibold">基音の再生音量</h5>
        <p class="text-sm text-white-60 mb-2">トレーニング時の基音再生音量を調整します</p>

        <div class="tick-slider-container">
            <div class="tick-slider-wrapper">
                <input type="range"
                       class="tick-slider"
                       id="base-note-volume-slider"
                       min="-20"
                       max="20"
                       step="10"
                       value="0">

                <div class="tick-labels">
                    <span class="tick-label" data-value="-20">-20</span>
                    <span class="tick-label" data-value="-10">-10</span>
                    <span class="tick-label active" data-value="0">0</span>
                    <span class="tick-label" data-value="10">+10</span>
                    <span class="tick-label" data-value="20">+20</span>
                </div>
            </div>

            <div class="tick-slider-hint">
                音割れする場合は下げる / 聞こえにくい場合は上げる
            </div>
        </div>
    </div>
</section>
```

#### 5段階設定

| ラベル | オフセット | 用途 |
|-------|----------|------|
| -20 | -20dB | 音割れする場合（iPad miniで報告あり） |
| -10 | -10dB | やや大きい場合 |
| 0 | 0dB | デフォルト（DeviceDetector最適値） |
| +10 | +10dB | やや小さい場合 |
| +20 | +20dB | 聞こえにくい場合 |

### 5.2 localStorage永続化

**キー**: `pitchpro_base_note_volume_offset`
**値**: `-20`, `-10`, `0`, `10`, `20` （文字列）

**実装箇所**: `pages/js/settings-controller.js`

```javascript
const BASE_NOTE_VOLUME_KEY = 'pitchpro_base_note_volume_offset';

// 保存
function saveVolumeOffset(value) {
    try {
        localStorage.setItem(BASE_NOTE_VOLUME_KEY, value.toString());
        console.log(`💾 音量オフセット保存: ${value}dB`);
    } catch (e) {
        console.error('❌ 音量オフセット保存失敗:', e);
    }
}

// 読み込み
function getSavedVolumeOffset() {
    try {
        const saved = localStorage.getItem(BASE_NOTE_VOLUME_KEY);
        if (saved !== null) {
            const parsed = parseInt(saved, 10);
            if (!isNaN(parsed) && parsed >= -20 && parsed <= 20) {
                return parsed;
            }
        }
    } catch (e) {
        console.warn('⚠️ 音量オフセット読み込み失敗:', e);
    }
    return 0; // デフォルト値
}
```

### 5.3 音量計算式

**最終音量 = デバイス基準音量 + ユーザーオフセット**

**例**:

| デバイス | 基準音量 | ユーザー設定 | 最終音量 |
|---------|---------|------------|---------|
| iPhone | +18dB | 0 | +18dB |
| iPhone | +18dB | -10 | +8dB |
| iPhone | +18dB | +10 | +28dB |
| iPad | +12dB | 0 | +12dB |
| iPad | +12dB | -20 | -8dB |
| PC | -12dB | 0 | -12dB |
| PC | -12dB | +10 | -2dB |

**実装箇所**: `js/controllers/trainingController.js:802-809`

```javascript
// 音量オフセット適用
const volumeOffset = getBaseNoteVolumeOffset();
if (volumeOffset !== 0 && pitchShifter.setVolume) {
    const baseVolume = window.DeviceDetector?.getDeviceVolume() ?? -6;
    const adjustedVolume = baseVolume + volumeOffset;
    pitchShifter.setVolume(adjustedVolume);
    console.log(`🔊 音量オフセット適用: ${baseVolume}dB + ${volumeOffset > 0 ? '+' : ''}${volumeOffset}dB = ${adjustedVolume}dB`);
}
```

### 5.4 オフセット取得関数

**実装箇所**:
- `js/controllers/trainingController.js:142-156`
- `pages/js/preparation-pitchpro-cycle.js:25-38`
- `js/router.js:939-953`

```javascript
/**
 * 【v4.4.0統一】設定ページで保存された音量オフセットを取得
 * @returns {number} 音量オフセット（-20～+20、デフォルト0）
 */
function getBaseNoteVolumeOffset() {
    const KEY = 'pitchpro_base_note_volume_offset';
    try {
        const saved = localStorage.getItem(KEY);
        if (saved !== null) {
            const parsed = parseInt(saved, 10);
            if (!isNaN(parsed) && parsed >= -20 && parsed <= 20) {
                return parsed;
            }
        }
    } catch (e) {
        console.warn('⚠️ 音量オフセット読み込み失敗:', e);
    }
    return 0; // デフォルト値（オフセットなし）
}

/**
 * 【v4.4.0統一】保存済み音量設定を取得（dB値）
 * 設定ページのティックスライダーと同じキーを使用
 * @returns {number} dB値（DeviceDetector基準音量 + ユーザー調整オフセット）
 */
function getSavedVolumeDb() {
    const baseVolume = window.DeviceDetector?.getDeviceVolume() ?? -6;
    const volumeOffset = getBaseNoteVolumeOffset();
    return baseVolume + volumeOffset;
}
```

---

## 6. 実装コード詳細

### 6.1 PitchShifter（reference-tones.js）

**実装箇所**: `js/core/reference-tones.js`

```javascript
// PitchShifterクラスの初期化パラメータ
const pitchShifter = new PitchShifter({
    baseUrl: 'audio/piano/',  // ピアノ音源のベースURL
    release: 2.5,              // リリースタイム（秒）
    volume: -12                // 初期音量（dB）
});

// 音量設定メソッド
pitchShifter.setVolume(-6);  // 音量を-6dBに設定

// 音符再生メソッド
await pitchShifter.playNote('C4', 1.0);  // C4を1.0秒再生
```

### 6.2 音源ファイル

**配置場所**: `/audio/piano/`

**ファイル形式**: MP3（Tone.js Sampler対応）

**音符範囲**: C3～E5（PitchShifter.AVAILABLE_NOTES）

### 6.3 Tone.js設定

**バージョン**: v15.1.22
**読み込み**: ESM import（index.html）

```javascript
// index.html:67-87
import { PitchShifter } from './js/core/reference-tones.js?v=2.9.7';
import * as Tone from 'tone';

window.PitchShifter = PitchShifter;
window.Tone = Tone;
```

### 6.4 エンベロープ設定

**実装箇所**: `js/core/reference-tones.js`

```javascript
// Attack: 0.02秒（立ち上がり）
// Sustain: 1.0秒（持続）
// Release: 1.5秒（減衰）
// 合計: 2.52秒
```

**用途**: iOS Safariでのブチ音防止（audioSession復元タイミング計算）

---

## 7. トラブルシューティング

### 7.1 音が出ない場合

**確認項目**:

1. **PitchShifter初期化確認**
   ```javascript
   console.log('PitchShifter initialized:', pitchShifter?.isInitialized);
   ```

2. **AudioContext状態確認**
   ```javascript
   console.log('AudioContext state:', Tone.context.state);
   // 'running'であるべき
   ```

3. **音量設定確認**
   ```javascript
   console.log('Volume:', pitchShifter.sampler.volume.value);
   // -∞でないこと
   ```

4. **デバイス音量確認**（実機）
   - デバイスの物理音量ボタンで音量50%以上に設定

### 7.2 iPhone/iPadで音量が小さい場合

**原因**: WebKit Bug #218012（audioSession問題）

**対処法**:

1. **設定ページで音量オフセットを調整**
   - +10dBまたは+20dBに設定

2. **デバイス音量を上げる**
   - 物理音量ボタンで70%以上に設定

3. **マイクが停止していることを確認**
   ```javascript
   console.log('AudioDetector detecting:', audioDetector?.isDetecting);
   // falseであるべき
   ```

### 7.3 iPad miniで音割れする場合

**報告**: ユーザーのiPad miniで音割れ発生

**対処法**:

1. **設定ページで音量オフセットを下げる**
   - -10dBまたは-20dBに設定

2. **デバイス基準音量の確認**
   ```javascript
   console.log('Device volume:', DeviceDetector.getDeviceVolume());
   // iPadは+12dB
   ```

### 7.4 2回目以降の再生で音が出ない（トレーニングページ）

**原因**: audioSession切替による不具合（過去の問題）

**現状**: 意図的に無効化済み（問題報告なし）

**対処法**（問題が再発した場合）:
- audioSession切替を削除
- マイク停止のみで対応

### 7.5 デバッグログの確認

**基音再生時の正常ログ**:

```
=== 基音再生開始 ===
✅ PitchShifter already initialized (local instance)
🎤 AudioDetector停止
🔊 [iOS] audioSession.type (現在): play-and-record（変更なし）
🎚️ 音量オフセット適用: 0dB
🔊 音量オフセット適用: +18dB + +0dB = +18dB
🎵 基音再生: C4 (261.6Hz)
✅ 基音C4を再生しました
```

---

## 8. 関連仕様書

- `/specifications/VOLUME_TEST_REMOVAL_HISTORY.md` - 音声テスト廃止の経緯
- `/specifications/IOS_SAFARI_AUDIO_SESSION_SPECIFICATION.md` - iOS Safari音量バグ対策
- `/specifications/VOLUME_BAR_INTEGRATION_SPECIFICATION.md` - 音量バー統合仕様
- `js/core/device-detector.js` - デバイス検出統一モジュール

---

## 9. テスト項目チェックリスト

### 9.1 デバイス別テスト

- [ ] **PC**: 音量-12dBで適切に再生される
- [ ] **iPhone**: 音量+18dBで適切に再生される
- [ ] **iPad**: 音量+12dBで適切に再生される
- [ ] **Android**: 音量+18dBで適切に再生される（要実機確認）

### 9.2 音量オフセットテスト

- [ ] **オフセット0**: デフォルト音量で再生される
- [ ] **オフセット-20**: 音量が-20dB下がる
- [ ] **オフセット+20**: 音量が+20dB上がる
- [ ] **localStorage永続化**: リロード後も設定が保持される

### 9.3 iOS Safari特有のテスト

- [ ] **初回再生**: 音が正常に再生される
- [ ] **2回目以降**: 音が正常に再生される（8セッション連続）
- [ ] **マイク停止**: 基音再生中にマイクが停止している
- [ ] **audioSession**: 変更されず`play-and-record`のまま

### 9.4 エッジケーステスト

- [ ] **音量オフセット範囲外**: -20未満・+20超の値を保存しても正常動作
- [ ] **localStorage無効**: エラーが出ず、デフォルト値で動作
- [ ] **PitchShifter初期化失敗**: エラーメッセージが表示される
- [ ] **AudioContext起動失敗**: 適切にエラーハンドリングされる

---

**ドキュメント作成**: Claude Code Assistant
**レビュー**: 要実施
**承認**: 要確認
