# トレーニング機能仕様書（SPA版）

**バージョン**: 3.2.0
**作成日**: 2025-10-23
**最終更新**: 2025-10-29

**変更履歴**:
- v3.2.0 (2025-10-29): 音程測定精度の根本的改善
  - **問題**: 前の音の残響（高明瞭度）が次の音の立ち上がり期間（低明瞭度）より優先選択され、異常値（-191.8¢等）が発生
  - **解決**: 測定開始から最初の200msを除外し、残り500msの安定期間から最高明瞭度データを選択
  - **効果**: 異常値（±150¢超）が完全消滅、測定精度が正常範囲に収まる
  - **実装**: `recordStepPitchData()`に200ms除外ロジック追加、フォールバック処理実装
  - **副次的改善**: 外れ値除外ロジック削除により、実際のユーザーパフォーマンスを正確に評価
- v3.1.8 (2025-10-28): クリッキングノイズ対策強化
  - attack時間を100ms → 150msに延長（クリッキングノイズ完全解消）
  - AudioContext安定化待機時間を50ms → 100msに延長
  - Tone.js内部準備のための10ms待機追加（triggerAttack前）
  - 「一度だけブチっ」という稀なクリッキングノイズに対応
- v3.1.7 (2025-10-28): 音割れ対策強化・低音域の音量バランス調整
  - attack時間を50ms → 100msに延長（音割れ防止）
  - 低音域（C2-B2）の音量を50%に低減
  - 中低音域（C3-B3）の音量を70%に低減
- v3.1.6 (2025-10-28): キャッシュバスター実装
  - SAMPLE_VERSIONによるクエリパラメータバージョン管理
  - ブラウザキャッシュ強制更新対応
- v3.1.5 (2025-10-28): 複数サンプル対応実装
  - C2, C3, C4, C5の4つのオクターブサンプル追加
  - ピッチシフト範囲を±24半音 → ±6半音に削減
  - 低音域クリッキングノイズの大幅軽減
- v3.1.4 (2025-10-28): Tone.js Samplerノイズ軽減設定
  - attack: 0.05秒、curve: exponentialの実装
- v3.1.3 (2025-10-24): PitchPro完全停止処理の実装
  - handleSessionComplete()でaudioDetector.destroy()を追加
  - マイクストリームを完全に解放することで、バックグラウンド復帰時の警告アラート問題を解決
  - stopDetection()だけでは不十分で、destroy()が必須であることを明記
  - バックグラウンド長時間放置時のpopstateイベント誤発火を防止
- v3.1.2 (2025-10-24): ブラウザバック防止とTone.js統合の改善
  - ブラウザバック防止処理の順序変更（alert → pushState）により確実なダイアログ表示を実現
  - removeBrowserBackPrevention()をrouter.js・preparation-pitchpro-cycle.jsに統合実装
  - Tone.jsグローバル公開によるリロード後AudioContext問題を解決
  - 基音再生ボタンの無音問題を完全解決
- v3.1.1 (2025-10-23): 設計判断の根拠を追加
  - preparationページのリロード挙動を明記
  - training/preparationページの設計判断の根拠を追加
  - なぜpreparationはリダイレクトしないのかを説明
- v3.1.0 (2025-10-23): ナビゲーション処理拡張
  - リロード時のpreparationリダイレクト追加
  - ダイレクトアクセス時のモード維持機能追加
  - preparationからの自動復帰処理追加
- v3.0.0 (2025-10-23): SPA版として新規作成
  - SPAアーキテクチャ対応
  - SessionDataRecorder統合仕様
  - 適応的基音選択アルゴリズム
  - ナビゲーション処理仕様
  - リソースライフサイクル管理

---

## 📑 目次

1. [アーキテクチャ概要](#1-アーキテクチャ概要)
2. [セッション管理](#2-セッション管理)
3. [基音選択アルゴリズム](#3-基音選択アルゴリズム)
4. [トレーニング初期化](#4-トレーニング初期化)
5. [トレーニングフロー](#5-トレーニングフロー)
6. [ナビゲーション処理](#6-ナビゲーション処理)
7. [リソース管理](#7-リソース管理)
8. [UI仕様](#8-ui仕様)
9. [エラーハンドリング](#9-エラーハンドリング)
10. [データ永続化](#10-データ永続化)

---

## 1. アーキテクチャ概要

### 1.1 SPAルーティング

**方式**: ハッシュベースルーティング
**ルーター**: `/PitchPro-SPA/js/router.js`

```
ルーティング例:
#home                  → ホームページ
#preparation          → 音域テスト
#training             → トレーニングページ
#result-session       → セッション結果
#results-overview     → 総合評価
```

### 1.2 主要コンポーネント

```javascript
// trainingController.js
- トレーニングロジック制御
- 基音選択アルゴリズム
- 音声検出・再生管理
- UI状態管理

// session-data-recorder.js
- セッションID管理
- 音程誤差データ記録
- localStorage永続化

// router.js
- ページ遷移制御
- リソースクリーンアップ
- ページ初期化
```

### 1.3 技術スタック

- **音声再生**: PitchShifter (Tone.js)
  - index.htmlでTone.jsをグローバル公開（`window.Tone`）
  - リロード後のAudioContext再開処理に必要
- **音声検出**: AudioDetectionComponent (PitchPro)
- **音程計算**: セント単位誤差計算
- **データ保存**: localStorage (DataManager)

### 1.4 AudioContext管理

**問題の背景（v3.1.2で解決）**:

リロード後、基音再生ボタンを押しても音が鳴らない問題が発生していました。

**根本原因**:
- trainingController.jsは`Tone.context`にアクセスしてAudioContextの状態確認・再開処理を実行
- しかし、`Tone`がグローバルスコープに公開されていなかった
- そのため`typeof Tone !== 'undefined'`が常にfalseとなり、AudioContext再開処理がスキップされる
- リロード後、AudioContextが`suspended`状態のままとなり音が鳴らない

**解決方法**:

```javascript
// index.html - Tone.jsグローバル公開
<script type="module">
    import { PitchShifter } from './js/core/reference-tones.js';
    import * as Tone from 'tone';

    window.PitchShifter = PitchShifter;
    window.Tone = Tone;  // グローバル公開（重要！）

    console.log('✅ PitchShifter loaded globally');
    console.log('✅ Tone.js loaded globally');
</script>
```

**AudioContext再開処理**:

```javascript
// trainingController.js - startTraining()
if (typeof Tone !== 'undefined' && Tone.context) {
    console.log('🔊 AudioContext状態確認... (state:', Tone.context.state + ')');

    // Tone.start()を明示的に呼び出し（iOS/iPadOS対応）
    if (Tone.context.state === 'suspended') {
        await Tone.start();
    }

    // resume()で確実に起動
    if (Tone.context.state !== 'running') {
        await Tone.context.resume();
        await new Promise(resolve => setTimeout(resolve, 100));
    }
}
```

**期待される動作**:

リロード → マイク許可 → 音量テスト → 音域保存済み → トレーニング開始 → 基音再生ボタン押下で、正常に音が鳴る。

---

## 2. セッション管理

### 2.1 SessionDataRecorder

**ファイル**: `/PitchPro-SPA/js/controllers/session-data-recorder.js`

#### コンストラクタ
```javascript
class SessionDataRecorder {
    constructor() {
        this.currentSession = null;

        // localStorage同期してsessionCounter初期化
        const existingSessions = DataManager.getFromStorage('sessionData') || [];
        this.sessionCounter = existingSessions.length > 0
            ? Math.max(...existingSessions.map(s => s.sessionId))
            : 0;
    }
}
```

#### 主要メソッド

**startNewSession(baseNote, baseFrequency)**
```javascript
// localStorage同期チェック（localStorage消去対策）
const existingSessions = DataManager.getFromStorage('sessionData') || [];
const maxId = existingSessions.length > 0
    ? Math.max(...existingSessions.map(s => s.sessionId))
    : 0;

// 不整合検出時の再同期
if (this.sessionCounter < maxId) {
    this.sessionCounter = maxId;
}

this.sessionCounter++;

this.currentSession = {
    sessionId: this.sessionCounter,
    mode: 'random',
    baseNote: baseNote,
    baseFrequency: baseFrequency,
    startTime: Date.now(),
    pitchErrors: [],
    completed: false
};
```

**recordPitchError(step, expectedNote, expectedFrequency, detectedFrequency, clarity, volume)**
```javascript
// セント単位の誤差計算
const errorInCents = 1200 * Math.log2(detectedFrequency / expectedFrequency);

const pitchData = {
    step,
    expectedNote,
    expectedFrequency,
    detectedFrequency,
    errorInCents: parseFloat(errorInCents.toFixed(1)),
    clarity: parseFloat(clarity.toFixed(3)),
    volume: parseFloat(volume.toFixed(3)),
    timestamp: Date.now()
};

this.currentSession.pitchErrors.push(pitchData);
```

**completeSession()**
```javascript
this.currentSession.completed = true;
this.currentSession.endTime = Date.now();
this.currentSession.duration = this.currentSession.endTime - this.currentSession.startTime;

// localStorageに保存（最大100セッション）
const existingSessions = DataManager.getFromStorage('sessionData') || [];
existingSessions.push(this.currentSession);
const recentSessions = existingSessions.slice(-100);
DataManager.saveToStorage('sessionData', recentSessions);

const completedSession = { ...this.currentSession };
this.currentSession = null;

return completedSession;
```

**resetSession()**
```javascript
this.currentSession = null;

// localStorageと同期してリセット
const existingSessions = DataManager.getFromStorage('sessionData') || [];
this.sessionCounter = existingSessions.length > 0
    ? Math.max(...existingSessions.map(s => s.sessionId))
    : 0;
```

### 2.2 セッションデータ構造

```javascript
{
    sessionId: 1,                    // 一意のセッション番号
    mode: 'random',                  // モード識別
    baseNote: 'C4',                  // 基音音名
    baseFrequency: 261.63,           // 基音周波数（Hz）
    startTime: 1706000000000,        // 開始タイムスタンプ
    endTime: 1706000010000,          // 終了タイムスタンプ
    duration: 10000,                 // 所要時間（ms）
    completed: true,                 // 完了フラグ
    pitchErrors: [                   // 各ステップの音程データ
        {
            step: 0,                    // ステップ番号（0-7: ド-ド）
            expectedNote: 'ド',         // 期待される相対音程
            expectedFrequency: 261.63,  // 期待周波数
            detectedFrequency: 262.5,   // 検出周波数
            errorInCents: 5.7,          // セント単位誤差
            clarity: 0.85,              // 明瞭度（0-1）
            volume: 0.65,               // 音量（0-1）
            timestamp: 1706000005000    // 記録タイムスタンプ
        },
        // ... ステップ1-7のデータ
    ]
}
```

---

## 3. 基音選択アルゴリズム

### 3.1 音域に応じた適応的選択

**実装場所**: `trainingController.js` - `selectBaseNote()`

#### 音域オクターブ数の計算
```javascript
function getVoiceRangeOctaves() {
    if (!voiceRangeData || !voiceRangeData.results) {
        return 0;
    }
    const rangeData = voiceRangeData.results.comfortableRange || voiceRangeData.results;
    return Math.log2(rangeData.highFreq / rangeData.lowFreq);
}
```

### 3.2 初級モード（ランダム基音モード）

**選択方式**: ゾーン分割による分散選択

#### アルゴリズム
```javascript
function selectNoteFromZone(availableNotes, sessionIndex, totalSessions) {
    const octaves = getVoiceRangeOctaves();

    // 音域に応じたゾーン数を決定
    let numZones;
    if (octaves >= 2.0) {
        numZones = 4; // 4ゾーン分割
    } else if (octaves >= 1.5) {
        numZones = 3; // 3ゾーン分割
    } else {
        // 1-1.5オクターブ: 完全ランダム
        return availableNotes[Math.floor(Math.random() * availableNotes.length)];
    }

    // セッションをゾーンに割り当て
    const sessionsPerZone = Math.ceil(totalSessions / numZones);
    const currentZone = Math.floor(sessionIndex / sessionsPerZone);

    // ゾーン範囲を計算
    const notesPerZone = Math.ceil(availableNotes.length / numZones);
    const zoneStart = currentZone * notesPerZone;
    const zoneEnd = Math.min((currentZone + 1) * notesPerZone, availableNotes.length);

    // ゾーン内からランダム選択
    const zoneNotes = availableNotes.slice(zoneStart, zoneEnd);
    const selectedNote = zoneNotes[Math.floor(Math.random() * zoneNotes.length)];

    return selectedNote;
}
```

#### ゾーン分割例（8セッション、2オクターブ以上）
```
セッション1-2: 低音ゾーン（availableNotes[0] - availableNotes[n/4]）
セッション3-4: 中低音ゾーン（availableNotes[n/4] - availableNotes[n/2]）
セッション5-6: 中高音ゾーン（availableNotes[n/2] - availableNotes[3n/4]）
セッション7-8: 高音ゾーン（availableNotes[3n/4] - availableNotes[n]）
```

**効果**: 離れた音程で違いが明確 → 初心者に優しい

### 3.3 中級モード（連続チャレンジモード）

**選択方式**: 前回から一定距離を確保したランダム選択

#### アルゴリズム
```javascript
function selectNoteWithDistance(availableNotes) {
    // 前回の基音がない場合は完全ランダム
    if (!previousBaseNote) {
        return availableNotes[Math.floor(Math.random() * availableNotes.length)];
    }

    const octaves = getVoiceRangeOctaves();

    // 音域に応じた除外半音数を決定
    let excludeSemitones;
    if (octaves >= 2.0) {
        excludeSemitones = 5; // ±5半音以内を除外
    } else if (octaves >= 1.5) {
        excludeSemitones = 3; // ±3半音以内を除外
    } else {
        // 1-1.5オクターブ: 完全ランダム
        return availableNotes[Math.floor(Math.random() * availableNotes.length)];
    }

    // 前回の周波数から半音数を計算して除外
    const filteredNotes = availableNotes.filter(note => {
        const semitoneDistance = Math.abs(Math.round(12 * Math.log2(note.frequency / previousBaseNote.frequency)));
        return semitoneDistance > excludeSemitones;
    });

    // 除外後の選択肢がない場合は完全ランダム（フォールバック）
    if (filteredNotes.length === 0) {
        return availableNotes[Math.floor(Math.random() * availableNotes.length)];
    }

    const selectedNote = filteredNotes[Math.floor(Math.random() * filteredNotes.length)];

    // 次回のために前回の基音を保存
    previousBaseNote = selectedNote;

    return selectedNote;
}
```

**効果**: 近すぎず遠すぎない適度な難易度 → 識別能力向上

### 3.4 上級モード（12音階モード）

**選択方式**: 順次選択（既存仕様）

```javascript
case 'sequential_chromatic':
    selectedNote = availableNotes[sessionIndex % availableNotes.length];
    break;
```

**効果**: 全音階を体系的に学習 → 完全な相対音感習得

### 3.5 音域別動作まとめ

| 音域 | 初級モード | 中級モード | 上級モード |
|------|------------|------------|------------|
| 2.0オクターブ以上 | 4ゾーン分割 | ±5半音除外 | 順次選択 |
| 1.5-2.0オクターブ | 3ゾーン分割 | ±3半音除外 | 順次選択 |
| 1.0-1.5オクターブ | 完全ランダム | 完全ランダム | 順次選択 |
| 1.0オクターブ未満 | preparationページへリダイレクト | - | - |

---

## 4. トレーニング初期化

### 4.1 統合初期化処理

**実装場所**: `trainingController.js` - `initializeRandomModeTraining()`

#### 処理内容
```javascript
function initializeRandomModeTraining() {
    console.log('🆕 ランダムモード新規開始処理を実行');

    // 1. sessionCounterを0にリセット
    if (window.sessionDataRecorder) {
        window.sessionDataRecorder.currentSession = null;
        window.sessionDataRecorder.sessionCounter = 0;
        console.log('🔄 sessionCounterリセット: 0');
    }

    // 2. 前回の基音をクリア（中級モード用）
    previousBaseNote = null;
    console.log('🔄 previousBaseNoteリセット');

    // 3. 基音を事前に選択（ボタンクリック時の遅延を回避）
    preselectBaseNote();
}
```

**呼び出しタイミング**: `initializeTrainingPage()` 内で自動実行

### 4.2 基音事前選択

**実装場所**: `trainingController.js` - `preselectBaseNote()`

#### 処理内容
```javascript
function preselectBaseNote() {
    const config = modeConfig[currentMode];
    const sessionCounter = window.sessionDataRecorder ? window.sessionDataRecorder.getSessionNumber() : 0;
    const selectedNote = selectBaseNote(config.baseNoteSelection, sessionCounter);

    baseNoteInfo = selectedNote;
    console.log(`🎵 基音を事前選択: ${selectedNote.note} (${selectedNote.frequency.toFixed(1)}Hz)`);
}
```

**メリット**: ボタンクリック時の遅延を回避、即座に再生開始可能

### 4.3 音域データチェック

**実装場所**: `trainingController.js` - `checkVoiceRangeData()`

#### チェック項目
```javascript
function checkVoiceRangeData() {
    // 1. 音域データが存在しない
    if (!voiceRangeData || !voiceRangeData.results) {
        return false;
    }

    // 2. comfortableRangeの存在確認
    const rangeData = voiceRangeData.results.comfortableRange || voiceRangeData.results;
    if (!rangeData.lowFreq || !rangeData.highFreq) {
        return false;
    }

    // 3. オクターブ数が1以上か確認
    const octaves = Math.log2(rangeData.highFreq / rangeData.lowFreq);
    if (octaves < 1.0) {
        console.warn(`⚠️ オクターブ数不足: ${octaves.toFixed(2)}オクターブ（1.0以上必要）`);
        return false;
    }

    return true;
}
```

**チェック失敗時**: preparationページへリダイレクト

---

## 5. トレーニングフロー

### 5.1 基本フロー

```
1. initializeTrainingPage() 実行
   ↓
2. 音域データ読み込み
   ↓
3. 音域データチェック（1.0オクターブ以上必須）
   ↓ (失敗) → preparationページへリダイレクト
   ↓ (成功)
4. initializeRandomModeTraining() 実行
   - sessionCounter = 0
   - previousBaseNote = null
   - 基音を事前選択
   ↓
5. 「基音スタート」ボタン表示
   ↓
6. ユーザーがボタンクリック
   ↓
7. startTraining() 実行
   - 事前選択済みの基音を即座に再生（2秒）
   - セッションデータ記録開始
   - インターバルカウントダウン（2.5秒）
   ↓
8. startDoremiGuide() 実行
   - AudioDetectionComponent初期化
   - マイク許可取得
   - 音声検出開始
   - ドレミガイド進行（8ステップ × 700ms = 5.6秒）
   ↓
9. handleSessionComplete() 実行
   - 音声検出停止
   - セッションデータ完了
   - result-sessionページへ遷移
```

### 5.2 startTraining() 詳細

```javascript
async function startTraining() {
    // ボタン無効化
    playButton.disabled = true;
    playButton.classList.add('btn-disabled');

    try {
        // 1. PitchShifter初期化（初回のみ）
        if (!pitchShifter || !pitchShifter.isInitialized) {
            await initializePitchShifter();
        }

        // 2. AudioContext起動（iOS/iPadOS対応）
        if (typeof Tone !== 'undefined' && Tone.context) {
            if (Tone.context.state === 'suspended') {
                await Tone.start();
            }
            if (Tone.context.state !== 'running') {
                await Tone.context.resume();
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }

        // 3. 事前選択済みの基音を使用して再生
        if (!baseNoteInfo) {
            console.error('❌ 基音が選択されていません');
            throw new Error('基音が選択されていません');
        }

        console.log(`🎵 基音再生開始: ${baseNoteInfo.note} (${baseNoteInfo.frequency.toFixed(1)}Hz)`);
        await pitchShifter.playNote(baseNoteInfo.note, 2);

        // 4. セッションデータ記録開始
        if (window.sessionDataRecorder) {
            sessionRecorder = window.sessionDataRecorder;
            sessionRecorder.startNewSession(baseNoteInfo.note, baseNoteInfo.frequency);
        }

        // 5. インターバルカウントダウン（2.5秒）
        startIntervalCountdown(progressSquares);

        // 6. 2.5秒後にドレミガイド開始
        setTimeout(() => {
            playButton.disabled = false;
            playButton.classList.remove('btn-disabled');
            startDoremiGuide();
        }, 2500);

    } catch (error) {
        console.error('❌ トレーニング失敗:', error);
        // エラーハンドリング
    }
}
```

### 5.3 ドレミガイド進行

```javascript
async function startDoremiGuide() {
    const circles = document.querySelectorAll('.note-circle');
    currentIntervalIndex = 0;

    // マイクバッジをアニメーション状態に
    if (micBadge) {
        micBadge.classList.add('measuring');
    }

    // AudioDetectionComponent初期化
    audioDetector = new window.PitchPro.AudioDetectionComponent({
        volumeBarSelector: '.mic-recognition-section .progress-fill',
        volumeTextSelector: null,
        frequencySelector: null,
        noteSelector: null,
        autoUpdateUI: true,
        debug: false
    });

    await audioDetector.initialize();

    // コールバック設定
    audioDetector.setCallbacks({
        onPitchUpdate: (result) => {
            handlePitchUpdate(result);
        },
        onError: (context, error) => {
            console.error(`❌ AudioDetection Error [${context}]:`, error);
        }
    });

    // 音声検出開始
    await audioDetector.startDetection();

    // 音程データバッファをリセット
    pitchDataBuffer = [];

    // 8ステップのガイド進行
    for (let i = 0; i < 8; i++) {
        currentIntervalIndex = i;

        // 前のステップを完了状態に
        if (i > 0) {
            circles[i - 1]?.classList.remove('current');
            circles[i - 1]?.classList.add('completed');
            recordStepPitchData(i - 1);
        }

        // 現在のステップをハイライト
        circles[i]?.classList.add('current');

        // 期待周波数をログ出力
        const expectedFreq = baseNoteInfo.frequency * Math.pow(2, semitoneSteps[i] / 12);
        console.log(`🎵 音程: ${intervals[i]} (+${semitoneSteps[i]}半音, 期待: ${expectedFreq.toFixed(1)}Hz)`);

        // ユーザーの発声時間を確保（700ms）
        await new Promise(resolve => setTimeout(resolve, 700));
    }

    // 最後のステップを完了
    circles[7]?.classList.remove('current');
    circles[7]?.classList.add('completed');
    recordStepPitchData(7);

    currentIntervalIndex = 8;

    // トレーニング完了
    handleSessionComplete();
}
```

### 5.4 音程データ記録

**v3.2.0での重要な改善**: 前の音の残響を除外し、測定精度を根本的に向上

```javascript
function recordStepPitchData(step) {
    if (!sessionRecorder) return;

    // このステップの音程データを取得（直近700ms間のデータ）
    const stepData = pitchDataBuffer.filter(d => d.step === step);

    // 基音からの期待周波数を計算
    const expectedFrequency = baseNoteInfo.frequency * Math.pow(2, semitoneSteps[step] / 12);
    const expectedNoteName = intervals[step]; // 相対音程名（ドレミ...）

    if (stepData.length === 0) {
        console.warn(`⚠️ Step ${step} (${expectedNoteName}): 音程データが記録されていません`);
        // ダミーデータで記録（エラー回避）
        sessionRecorder.recordPitchError(
            step,
            expectedNoteName,
            expectedFrequency,
            0,  // 検出周波数なし
            0,  // 明瞭度なし
            0   // 音量なし
        );
        return;
    }

    // 【v3.2.0 新機能】最初の200msを除外して前の音の余韻を回避
    const stepStartTime = stepData[0].timestamp;
    const validData = stepData.filter(d => d.timestamp - stepStartTime >= 200);

    let bestData;
    if (validData.length === 0) {
        console.warn(`⚠️ Step ${step} (${expectedNoteName}): 有効なデータがありません（全て立ち上がり期間）- 元データから選択`);
        // 有効なデータがない場合は元のstepDataから最も明瞭度が高いものを使用
        bestData = stepData.reduce((best, current) =>
            current.clarity > best.clarity ? current : best
        );
    } else {
        console.log(`✅ Step ${step} (${expectedNoteName}): 最初200ms除外後の有効データ ${validData.length}件`);
        // 有効なデータから最も明瞭度が高いデータを使用
        bestData = validData.reduce((best, current) =>
            current.clarity > best.clarity ? current : best
        );
    }

    // セント誤差を計算
    const centError = 1200 * Math.log2(bestData.frequency / expectedFrequency);

    sessionRecorder.recordPitchError(
        step,
        expectedNoteName,
        expectedFrequency,
        bestData.frequency,
        bestData.clarity,
        bestData.volume
    );

    console.log(`📊 Step ${step} (${expectedNoteName}) データ記録:`);
    console.log(`   期待: ${expectedFrequency.toFixed(1)}Hz`);
    console.log(`   検出: ${bestData.frequency.toFixed(1)}Hz`);
    console.log(`   誤差: ${centError >= 0 ? '+' : ''}${centError.toFixed(1)}¢`);
}
```

#### v3.2.0改善の詳細

**問題の背景**:
- 各ステップ700msの測定ウィンドウ内で、前の音の残響（安定した高明瞭度）が次の音の立ち上がり期間（不安定な低明瞭度）より選択されていた
- 例: レ (185Hz) → ミ (208Hz) の遷移時、ミの測定でレの残響185Hzが選ばれ、-191.8¢の異常値が発生

**解決策**:
1. **200ms除外**: 測定開始から最初の200msを除外 → 前の音の残響期間を回避
2. **500ms安定期間**: 残り500msの安定期間から最高明瞭度データを選択 → 正確な測定
3. **フォールバック処理**: 有効データがない場合は元データから選択 → エラー回避

**効果**:
- ✅ 異常値（±150¢超）が完全消滅
- ✅ 測定精度が正常範囲（±150¢以内）に収束
- ✅ 評価システムの信頼性向上

### 5.5 セッション完了処理

```javascript
function handleSessionComplete() {
    console.log('✅ トレーニング完了');

    // 音声検出停止
    if (audioDetector) {
        audioDetector.stopDetection();
    }

    // マイクバッジを通常状態に戻す
    const micBadge = document.getElementById('mic-badge');
    if (micBadge) {
        micBadge.classList.remove('measuring');
    }

    // 音量バーをリセット
    const volumeBar = document.querySelector('.mic-recognition-section .progress-fill');
    if (volumeBar) {
        volumeBar.style.width = '0%';
    }

    // セッションデータを保存
    if (sessionRecorder) {
        const completedSession = sessionRecorder.completeSession();
        console.log('✅ セッションデータ保存完了:', completedSession);

        // セッション結果ページへ遷移
        const sessionNumber = sessionRecorder.getSessionNumber();
        window.location.hash = `result-session?session=${sessionNumber}`;
        return;
    }

    // sessionRecorderがない場合のフォールバック
    console.warn('⚠️ SessionDataRecorderが利用できません');
}
```

---

## 6. ナビゲーション処理

### 6.1 ページ遷移制御

**実装場所**: `router.js`

#### ハッシュ変更検出
```javascript
window.addEventListener('hashchange', () => this.handleRouteChange());
```

#### クリーンアップ処理
```javascript
async cleanupCurrentPage() {
    try {
        // trainingページからの離脱時
        if (this.currentPage === 'training') {
            console.log('Cleaning up training page resources...');

            // 音声検出停止
            if (window.audioDetector) {
                window.audioDetector.stopDetection();
            }

            // マイクストリーム解放
            if (window.audioStream) {
                window.audioStream.getTracks().forEach(track => track.stop());
                window.audioStream = null;
            }

            // PitchShifter停止
            if (window.pitchShifterInstance) {
                if (typeof window.pitchShifterInstance.dispose === 'function') {
                    window.pitchShifterInstance.dispose();
                }
                window.pitchShifterInstance = null;
            }

            // セッションデータ処理
            if (window.sessionDataRecorder) {
                const currentSession = window.sessionDataRecorder.getCurrentSession();
                if (currentSession && !currentSession.completed) {
                    console.warn('⚠️ 未完了セッションあり - 途中データは破棄されます');
                }
                window.sessionDataRecorder.resetSession();
            }

            // 初期化フラグリセット
            if (typeof window.resetTrainingPageFlag === 'function') {
                window.resetTrainingPageFlag();
            }

            console.log('✅ Training page cleanup complete');
        }

    } catch (error) {
        console.warn('Page cleanup error:', error);
    }
}
```

### 6.2 ブラウザバック対応

#### 6.2.1 NavigationManager統合

**実装場所**: `js/navigation-manager.js` (v3.0.0)

NavigationManagerがナビゲーション・遷移管理・ブラウザバック防止を一元管理します。

**主要機能**:
- リロード検出・遷移管理
- ブラウザバック防止ページの設定とハンドラー管理
- normalTransitionフラグの自動設定

#### 6.2.2 ブラウザバック防止実装

**対象ページ**: training, result-session, results, results-overview

**実装方式**: popstateハンドラー + history.pushState()

```javascript
// navigation-manager.js
preventBrowserBack(page) {
    const config = this.PAGE_CONFIG[page];
    if (!config || !config.preventBackNavigation) return;

    // ダミーエントリーを複数追加（より確実な防止）
    history.pushState(null, '', location.href);
    history.pushState(null, '', location.href);

    // popstateハンドラーを定義（重要：alert → pushState の順序）
    this.popStateHandler = () => {
        // ユーザーに通知（OKを押すしか選択肢なし）
        alert(message);

        // OKを押した後にダミーエントリーを複数再追加して履歴スタックを補充
        // この順序により、何度バックしても必ずダイアログが表示される
        history.pushState(null, '', location.href);
        history.pushState(null, '', location.href);
    };

    window.addEventListener('popstate', this.popStateHandler);
}
```

**重要な設計判断（v3.1.2）**:
- **alert() → pushState() の順序**: alert()は同期処理なので、ユーザーがOKを押した後に履歴スタックを補充できる
- **修正前の問題**: pushState() → alert() の順序だと、2-4回のバック操作で履歴スタックが枯渇してバックが成功してしまう
- **修正後の効果**: 何度ブラウザバックを押してもダイアログが必ず表示され、ページ遷移を完全に防止

#### 6.2.3 removeBrowserBackPrevention()の統合実装

**実装場所**: router.js, preparation-pitchpro-cycle.js

ブラウザバック防止を解除してから遷移することで、不要なダイアログ表示を防ぎます。

```javascript
// router.js - setupResultsOverviewEvents()
if (window.NavigationManager) {
    window.NavigationManager.removeBrowserBackPrevention();
}
NavigationManager.navigateToTraining();

// preparation-pitchpro-cycle.js - トレーニング開始ボタン（2箇所）
if (window.NavigationManager) {
    window.NavigationManager.removeBrowserBackPrevention();
}
NavigationManager.navigateToTraining(redirectInfo.mode, redirectInfo.session);
```

#### 6.2.4 通常のページ遷移

**動作**:
- ハッシュ変更 → `hashchange` イベント発火
- `handleRouteChange()` → `cleanupCurrentPage()` 実行
- リソース解放 → 新しいページ読み込み

**例**:
```
#training → ブラウザバック → #home
  ↓
cleanupCurrentPage() 実行
  - AudioDetector停止
  - マイクストリーム解放
  - PitchShifter停止
  - セッションリセット
  ↓
loadPage('home') 実行
```

### 6.3 リロード対応

#### 6.3.0 preparation ページのリロード

**設計方針**: preparation ページに留まる（リダイレクトしない）

**実装場所**: `router.js` - `cleanupCurrentPage()`（既存実装）

```javascript
// router.js - 既存実装
async cleanupCurrentPage() {
    try {
        // preparationページからの離脱時のクリーンアップ
        if (this.currentPage === 'preparation') {
            console.log('Cleaning up preparation page resources...');

            // PitchProリソースのクリーンアップ
            if (typeof window.preparationManager !== 'undefined' && window.preparationManager) {
                await window.preparationManager.cleanupPitchPro();
            }

            // 初期化フラグをリセット
            if (typeof window.resetPreparationPageFlag === 'function') {
                window.resetPreparationPageFlag();
                console.log('Preparation page flag reset');
            }
        }
        // ...
    } catch (error) {
        console.warn('Page cleanup error:', error);
    }
}
```

**処理フロー**:
```
preparation ページで音域テスト中
  ↓
リロード実行（F5キー）
  ↓
pagehide イベント
  ↓
cleanupCurrentPage() 実行
  - PitchPro リソース解放
  - 初期化フラグリセット
  ↓
ページ再読み込み
  ↓
preparation ページ再表示（❌ リダイレクトなし）
  ↓
initializePreparationPage() 実行
  - 初期状態に戻る
  ↓
ユーザーが「音域テスト開始」ボタンをクリック
  ↓
マイク許可から再取得
  ↓
音域テスト実行
```

**設計判断**: preparation はマイク許可を取得する場所なので、リロード後にマイク許可ダイアログが再表示されても本来の目的を果たしている。リダイレクト不要。

#### 6.3.1 training ページのリロード

**設計方針**: トレーニング中のリロードは MediaStream が解放されるため、preparationページへ自動リダイレクト

##### リロード検出

**実装場所**: `trainingController.js` - `initializeTrainingPage()`

```javascript
function detectReload() {
    // Performance Navigation API で検出
    if (performance.navigation && performance.navigation.type === 1) {
        return true; // TYPE_RELOAD
    }

    // Navigation Timing API v2（新しいブラウザ）
    const navEntries = performance.getEntriesByType('navigation');
    if (navEntries.length > 0 && navEntries[0].type === 'reload') {
        return true;
    }

    return false;
}
```

##### リロード時の処理フロー

```
#trainingでリロード
  ↓
pagehide イベント
  ↓
cleanupCurrentPage() 実行
  - すべてのリソース解放
  ↓
ページ再読み込み
  ↓
initializeTrainingPage() 実行
  ↓
detectReload() → true
  ↓
alert('リロードが検出されました。マイク設定のため準備ページに移動します。')
  ↓
window.location.hash = 'preparation'
```

##### 実装コード

```javascript
export async function initializeTrainingPage() {
    console.log('🚀 TrainingController initializing...');

    // 【新規】リロード検出 → preparationへリダイレクト
    const isReload = detectReload();
    if (isReload) {
        console.warn('⚠️ リロード検出 - preparationへリダイレクト');
        alert('リロードが検出されました。マイク設定のため準備ページに移動します。');
        window.location.hash = 'preparation';
        return;
    }

    // 既存のチェック処理...
    if (!checkVoiceRangeData()) {
        console.error('❌ 音域データが設定されていません');
        alert('音域テストを先に完了してください。');
        window.location.hash = 'preparation';
        return;
    }

    // 通常の初期化処理...
    await initializeRandomModeTraining();
}
```

#### 6.3.2 設計判断の根拠

**なぜ training ページはリダイレクトするのか？**

| 項目 | 説明 |
|------|------|
| **前提条件** | マイク許可取得済み・音域測定済み・トレーニングに集中できる状態 |
| **リロード時の問題** | MediaStream が解放され、次回の `getUserMedia()` でマイク許可ダイアログが再表示される可能性 |
| **ユーザー体験への影響** | トレーニング中断・集中力の低下・不快感 |
| **対策** | preparation へリダイレクトし、確実に MediaStream を再取得 |

**preparation ページはリダイレクトしないのか？**

| 項目 | 説明 |
|------|------|
| **ページの目的** | マイク許可を取得する・音域を測定する・トレーニングの準備をする |
| **リロード時の動作** | preparation ページに留まり、クリーンアップ後に初期状態に戻る |
| **マイク許可ダイアログ** | 再表示されても問題なし（本来の目的を果たしている） |
| **ユーザー体験** | 「音域テスト開始」ボタンをクリックしてマイク許可から再開 → 自然な流れ |

**設計原則**

```
preparation ページ = マイク許可を取得する場所
  → リロードでマイク許可ダイアログが出ても許容範囲
  → リダイレクト不要

training ページ = トレーニング実行中
  → リロードでマイク許可ダイアログが出るのは望ましくない
  → preparation へリダイレクトして確実に準備を完了
```

### 6.4 ダイレクトアクセス対応（モード維持）

**設計方針**: ブックマークからのダイレクトアクセス時、モード情報を保持して preparationへリダイレクト

#### 6.4.1 処理フロー

```
#training?mode=random&session=8 でアクセス
  ↓
initializeTrainingPage() 実行
  ↓
checkVoiceRangeData()
  ↓ (音域データなし)
redirectToPreparationWithMode('音域テスト未完了')
  ↓
window.location.hash = 'preparation?redirect=training&mode=random&session=8'
```

#### 6.4.2 モード情報保持リダイレクト

**実装場所**: `trainingController.js`

```javascript
function redirectToPreparationWithMode(reason = '') {
    // 現在のモード・セッション情報を取得
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash.split('?')[1] || '');
    const mode = params.get('mode') || currentMode || 'random';
    const session = params.get('session') || '';

    console.log(`🔄 preparationへリダイレクト: ${reason}`);

    // preparationへリダイレクト（モード情報を保持）
    const redirectParams = new URLSearchParams({
        redirect: 'training',
        mode: mode
    });
    if (session) redirectParams.set('session', session);

    window.location.hash = `preparation?${redirectParams.toString()}`;
}
```

#### 6.4.3 音域データチェック拡張

```javascript
export async function initializeTrainingPage() {
    console.log('🚀 TrainingController initializing...');

    // リロード検出
    const isReload = detectReload();
    if (isReload) {
        console.warn('⚠️ リロード検出 - preparationへリダイレクト');
        window.location.hash = 'preparation';
        return;
    }

    // 音域データチェック（モード情報保持）
    if (!checkVoiceRangeData()) {
        console.error('❌ 音域データが設定されていません');
        alert('音域テストを先に完了してください。');
        redirectToPreparationWithMode('音域テスト未完了');
        return;
    }

    // 通常の初期化処理...
    await initializeRandomModeTraining();
}
```

### 6.5 preparationからの自動復帰

**実装場所**: `preparationController.js`

#### 6.5.1 リダイレクト情報検出

```javascript
export async function initializePreparationPage() {
    console.log('🚀 PreparationController initializing...');

    // リダイレクト情報を取得
    const redirectInfo = getRedirectInfo();
    if (redirectInfo) {
        showRedirectMessage(redirectInfo);
        // グローバル変数に保存（音域テスト完了時に使用）
        window.preparationRedirectInfo = redirectInfo;
    }

    // 既存の初期化処理...
}

function getRedirectInfo() {
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash.split('?')[1] || '');

    const redirect = params.get('redirect');
    const mode = params.get('mode');
    const session = params.get('session');

    if (!redirect) return null;

    return { redirect, mode, session };
}
```

#### 6.5.2 リダイレクトメッセージ表示

```javascript
function showRedirectMessage(info) {
    const modeNames = {
        'random': 'ランダム基音トレーニング',
        'continuous': '連続チャレンジモード',
        'chromatic': '12音階モード'
    };
    const modeName = modeNames[info.mode] || 'トレーニング';

    // UI にメッセージを表示
    const messageContainer = document.getElementById('redirect-message');
    if (messageContainer) {
        messageContainer.innerHTML = `
            <div class="glass-card" style="background: rgba(59, 130, 246, 0.1); border: 1px solid rgba(59, 130, 246, 0.3);">
                <div style="display: flex; align-items: center; gap: 12px;">
                    <i data-lucide="info" style="width: 24px; height: 24px; color: #60a5fa;"></i>
                    <div>
                        <div style="color: #93c5fd; font-weight: 600;">${modeName}</div>
                        <div style="color: #93c5fd; font-size: 14px; margin-top: 4px;">
                            準備完了後、自動的にトレーニングに移動します
                        </div>
                    </div>
                </div>
            </div>
        `;
        lucide.createIcons();
    }
}
```

#### 6.5.3 自動復帰処理

```javascript
async function onVoiceRangeTestCompleted() {
    console.log('✅ 音域テスト完了');

    // MediaStreamを確実に取得したことをlocalStorageに記録
    localStorage.setItem('mic-test-completed', 'true');
    localStorage.setItem('mic-permission-timestamp', Date.now().toString());

    // リダイレクト情報を確認
    const redirectInfo = window.preparationRedirectInfo;

    if (redirectInfo && redirectInfo.redirect === 'training') {
        console.log(`🔄 ${redirectInfo.mode} トレーニングへ自動リダイレクト`);

        // 0.5秒待機してからリダイレクト
        setTimeout(() => {
            const params = new URLSearchParams({ mode: redirectInfo.mode });
            if (redirectInfo.session) params.set('session', redirectInfo.session);

            window.location.hash = `training?${params.toString()}`;
        }, 500);
    } else {
        // 通常のフロー: モード選択画面を表示
        showTrainingModeSelection();
    }
}
```

#### 6.5.4 完全な処理フロー図

```
【リロード時】
#training → リロード
  ↓
preparationへリダイレクト
  ↓
音域テスト完了
  ↓
#training へ自動復帰（新規セッション開始）

【ダイレクトアクセス時】
#training?mode=random&session=8 でアクセス
  ↓
音域データなし検出
  ↓
#preparation?redirect=training&mode=random&session=8 へリダイレクト
  ↓
リダイレクト情報を表示
  ↓
音域テスト完了
  ↓
#training?mode=random&session=8 へ自動復帰
```

---

## 7. リソース管理

### 7.1 AudioDetector

**初期化**: `startDoremiGuide()` 内
**解放**: `handleSessionComplete()` 内（v3.1.3で改善）

```javascript
// 初期化
audioDetector = new window.PitchPro.AudioDetectionComponent({
    volumeBarSelector: '.mic-recognition-section .progress-fill',
    autoUpdateUI: true,
    debug: false
});
await audioDetector.initialize();

// 解放（v3.1.3重要改善）
if (audioDetector) {
    audioDetector.stopDetection();  // 音声検出を停止

    // 【重要】マイクストリームを完全に解放
    // destroy()を呼ばないと、バックグラウンドでマイクが開いたままになり、
    // 長時間経過後にPitchProが警告アラートを表示してpopstateイベントが発火する
    audioDetector.destroy();
}
```

**重要な注意点（v3.1.3）**:
- `stopDetection()`だけではマイクストリームが解放されない
- `destroy()`を必ず呼び出してリソースを完全に解放する
- これを行わないと、バックグラウンド復帰時にPitchProの警告アラートが表示され、ブラウザバック防止のダイアログが誤発火する問題が発生する

### 7.2 PitchShifter（Tone.js Sampler）

**初期化**: `initializePitchShifter()` 内（初回のみ）
**解放**: `cleanupCurrentPage()` 内

#### 7.2.1 基本設定

```javascript
// 初期化（グローバルインスタンス活用）
if (window.pitchShifterInstance && window.pitchShifterInstance.isInitialized) {
    pitchShifter = window.pitchShifterInstance;
    return pitchShifter;
}

window.pitchShifterInstance = new window.PitchShifter({
    baseUrl: 'audio/piano/',
    release: 2.5,
    volume: deviceVolume
});

await pitchShifter.initialize();

// 解放
if (window.pitchShifterInstance) {
    if (typeof window.pitchShifterInstance.dispose === 'function') {
        window.pitchShifterInstance.dispose();
    }
    window.pitchShifterInstance = null;
}
```

#### 7.2.2 Tone.js Samplerノイズ軽減設定（v3.1.4-3.1.7）

**背景**: 基音再生時にプチノイズ（クリック音）・音割れが発生する問題に対応

**v3.1.5更新**: 複数サンプル対応による低音域ノイズ軽減
**v3.1.6更新**: キャッシュバスター実装による確実な更新配信
**v3.1.7更新**: 音割れ対策強化・低音域の音量バランス調整

**実装**: `/js/core/reference-tones.js` (v1.2.0)

```javascript
/**
 * PitchShifter - Tone.js Sampler Wrapper
 * @version 1.1.1
 */
const SAMPLE_VERSION = "1.1.1";

// 複数オクターブサンプルによるピッチシフトアーティファクト軽減
// キャッシュバスター: クエリパラメータでバージョン管理
const sampleUrls = {
    C2: `C2.mp3?v=${SAMPLE_VERSION}`,  // Bass range (C2-B2)
    C3: `C3.mp3?v=${SAMPLE_VERSION}`,  // Low-mid range (C3-B3)
    C4: `C4.mp3?v=${SAMPLE_VERSION}`,  // Mid range (C4-B4) - Always available
    C5: `C5.mp3?v=${SAMPLE_VERSION}`   // High range (C5-E5)
};

console.log(`📦 [PitchShifter] Sample version: ${SAMPLE_VERSION}`);

this.sampler = new Tone.Sampler({
    urls: sampleUrls,
    baseUrl: this.config.baseUrl,
    release: this.config.release,
    attack: 0.05,              // 50ms fade-in（推奨: 0.005-0.05秒）
    curve: "exponential",      // より自然な振幅エンベロープ
    onload: () => {
        console.log("✅ [PitchShifter] Samples loaded successfully");
    },
    onerror: (error) => {
        console.warn("⚠️ [PitchShifter] Some samples failed to load, using available samples:", error);
        // Tone.js will automatically fall back to available samples
    }
}).toDestination();
```

**設定の根拠**:

1. **キャッシュバスター（v3.1.6新規追加）**
   - **実装方法**: クエリパラメータ `?v=1.1.1` をサンプルURLに付与
   - **仕組み**: ブラウザは異なるURLとして認識し、キャッシュをバイパス
   - **更新方法**: `SAMPLE_VERSION` を変更するだけで全ユーザーに最新ファイル配信
   - **実際のURL例**: `/audio/piano/C2.mp3?v=1.1.1`
   - **効果**: サンプルファイル更新時に確実に新しいファイルが読み込まれる

2. **複数サンプル対応（v3.1.5新規追加）**
   - 各オクターブごとに専用サンプルを配置
   - 最大ピッチシフト量: ±6半音（半オクターブ）に制限
   - **根本原因**: C4単一サンプルから低音域（C2-B2）への-24半音シフトでアーティファクト発生
   - **効果**: ピッチシフト量を75%削減し、特に低音域でのクリックノイズを軽減
   - **フォールバック**: サンプル読み込み失敗時はC4のみで動作（Tone.js自動フォールバック）
   - **音質改善**: 各音域で最適なサンプルを使用することで、より自然で高品質なピアノサウンドを実現

3. **attack: 0.15秒（150ms）** （v3.1.8で100ms→150msに延長）
   - Tone.js推奨範囲: 0.005-0.05秒（通常）→ クリッキングノイズ・音割れ対策で延長
   - 15ms（初期）→ 50ms（v3.1.4）→ 100ms（v3.1.7）→ 150ms（v3.1.8）
   - 音割れ・クリッピング防止、および「一度だけブチっ」という稀なクリッキングノイズ対策
   - 150msは人間の耳には気づかない程度の短時間
   - AudioContext安定化待機（50ms→100ms）、Tone.js内部準備待機（10ms）も追加実装

4. **curve: "exponential"**
   - デフォルト: attackCurve="linear", releaseCurve="exponential"
   - Sampler推奨設定: "exponential"（より自然な音）
   - 振幅エンベロープが人間の聴覚特性に合致

5. **低音域の音量バランス調整（v3.1.7新規追加）**
   - **C2-B2 (65-123Hz)**: velocity × 0.5（低音の響きを抑制）
   - **C3-B3 (130-246Hz)**: velocity × 0.7（中低音を控えめに）
   - **C4以上 (260Hz~)**: velocity × 1.0（通常音量）
   - **理由**: 低音域サンプルの倍音が強く、音割れの原因となるため
   - **効果**: 全音域で均一な音量感・音割れの大幅軽減

**音源ファイル情報**:

配置場所: `/PitchPro-SPA/audio/piano/`

| ファイル名 | サイズ | 対応音域 | 用途 |
|-----------|--------|---------|------|
| C2.mp3 | 419KB | C2-B2 | 低音域専用サンプル |
| C3.mp3 | 256KB | C3-B3 | 中低音域専用サンプル |
| C4.mp3 | 214KB | C4-B4 | 中音域専用サンプル（基準） |
| C5.mp3 | 173KB | C5-E5 | 高音域専用サンプル |

**音質改善効果**:
- **ピッチシフト量削減**: 最大±24半音 → ±6半音（75%削減）
- **クリックノイズ軽減**: 低音域での顕著なノイズが大幅に改善
- **自然な音質**: 各音域で最適なサンプルを使用し、高品質なピアノサウンドを実現

**参考情報**:

- Tone.js Issue #328: Samplerのattack終了時・release開始時のクリックノイズ既知の問題
- Tone.js Issue #803: ピッチシフトアーティファクト削減方法
- 適切なattack値とexponential curveで軽減可能
- ゼロ値（attack: 0.0）はクリックノイズの原因となるため非推奨
- **ピッチシフト量が大きいほどアーティファクトが顕著**（複数サンプルで解決）

**サンプルファイル生成方法**:

`/audio/piano/generate_samples.py`を使用してC4.mp3から他のオクターブを生成:

```bash
# 依存ライブラリインストール
pip install librosa soundfile numpy

# サンプル生成実行
cd PitchPro-SPA/audio/piano
python generate_samples.py
```

**代替設定**（ノイズが残る場合）:
- attack: 0.1秒（100ms）に延長
- 異なるcurveタイプの試行: "sine", "cosine", "bounce", "ripple"
- より密なサンプル配置: C2, D2, E2, ... (2半音ごと)

### 7.3 マイクストリーム

**取得**: `AudioDetectionComponent.initialize()` 内で自動取得
**解放**: `cleanupCurrentPage()` 内

```javascript
// 解放
if (window.audioStream) {
    window.audioStream.getTracks().forEach(track => track.stop());
    window.audioStream = null;
}
```

### 7.4 リソースライフサイクル

```
トレーニングページ表示
  ↓
initializeTrainingPage()
  - 音域データ読み込み（localStorage）
  - 基音事前選択
  ↓
startTraining() クリック
  - PitchShifter初期化（初回のみ）
  - 基音再生
  ↓
startDoremiGuide()
  - AudioDetector初期化
  - マイクストリーム取得
  ↓
トレーニング完了 or ページ離脱
  ↓
cleanupCurrentPage()
  - AudioDetector停止
  - マイクストリーム解放
  - PitchShifter停止
  - セッションリセット
```

---

## 8. UI仕様

### 8.1 モード設定

```javascript
const modeConfig = {
    random: {
        maxSessions: 8,
        title: 'ランダム基音モード',
        hasIndividualResults: true,
        baseNoteSelection: 'random_c3_octave'
    },
    continuous: {
        maxSessions: 8,
        title: '連続チャレンジモード',
        hasIndividualResults: false,
        baseNoteSelection: 'random_chromatic'
    },
    '12tone': {
        maxSessions: 12,
        title: '12音階モード',
        hasIndividualResults: false,
        baseNoteSelection: 'sequential_chromatic',
        hasRangeAdjustment: true
    }
};
```

### 8.2 ボタン状態遷移

#### 初期状態
```html
<button id="play-base-note">
    <i data-lucide="volume-2" style="width: 24px; height: 24px;"></i>
    <span>基音スタート</span>
</button>
```

#### 初期化中
```html
<button id="play-base-note" disabled class="btn-disabled">
    <i data-lucide="loader" style="width: 24px; height: 24px;"></i>
    <span>初期化中...</span>
</button>
```

#### 再生中
```html
<button id="play-base-note" disabled class="btn-disabled">
    <i data-lucide="volume-2" style="width: 24px; height: 24px;"></i>
    <span>再生中...</span>
</button>
```

#### トレーニング中
```html
<button id="play-base-note" disabled class="btn-disabled">
    <i data-lucide="volume-2" style="width: 24px; height: 24px;"></i>
    <span>基音スタート</span>
</button>
```

### 8.3 プログレスバー

```javascript
function updateSessionProgressUI() {
    const sessionCounter = window.sessionDataRecorder ? window.sessionDataRecorder.getSessionNumber() : 0;
    const currentSession = sessionCounter + 1;
    const config = modeConfig[currentMode];
    const totalSessions = config.maxSessions;

    // 進行バーを更新
    const progressFill = document.querySelector('.progress-section .progress-fill');
    if (progressFill) {
        const progressPercentage = (sessionCounter / totalSessions) * 100;
        progressFill.style.width = `${progressPercentage}%`;
    }

    // セッションバッジを更新
    const sessionBadge = document.querySelector('.session-badge');
    if (sessionBadge) {
        sessionBadge.textContent = `セッション ${currentSession}/${totalSessions}`;
    }
}
```

### 8.4 ドレミガイド表示

```html
<!-- 8つの音符サークル -->
<div class="note-circles">
    <div class="note-circle">ド</div>
    <div class="note-circle">レ</div>
    <div class="note-circle">ミ</div>
    <div class="note-circle">ファ</div>
    <div class="note-circle">ソ</div>
    <div class="note-circle">ラ</div>
    <div class="note-circle">シ</div>
    <div class="note-circle">ド</div>
</div>
```

**状態遷移**:
```css
.note-circle                /* 初期状態: グレー */
.note-circle.current       /* 現在のステップ: ブルー */
.note-circle.completed     /* 完了ステップ: グリーン */
```

### 8.5 音量バー

```html
<div class="mic-recognition-section">
    <div class="progress-bar">
        <div class="progress-fill" style="width: 0%;"></div>
    </div>
</div>
```

**更新**: `AudioDetectionComponent` が自動更新（autoUpdateUI: true）

---

## 9. エラーハンドリング

### 9.1 音域データ不足

```javascript
if (!checkVoiceRangeData()) {
    console.error('❌ 音域データが設定されていません');
    alert('音域テストを先に完了してください。');
    window.location.hash = 'preparation';
    return;
}
```

### 9.2 PitchShifter初期化失敗

```javascript
try {
    await initializePitchShifter();
} catch (error) {
    console.error('❌ PitchShifter初期化失敗:', error);
    playButton.disabled = false;
    playButton.classList.remove('btn-disabled');
    playButton.innerHTML = '<i data-lucide="alert-circle"></i><span>エラー - 再試行</span>';
    alert(`エラーが発生しました: ${error.message}`);
}
```

### 9.3 AudioDetector初期化失敗

```javascript
try {
    audioDetector = new window.PitchPro.AudioDetectionComponent({...});
    await audioDetector.initialize();
} catch (error) {
    console.error('❌ AudioDetectionComponent初期化失敗:', error);
    // マイク許可がない場合は準備ページへ
    if (error.name === 'NotAllowedError') {
        alert('マイク許可が必要です。');
        window.location.hash = 'preparation';
    }
}
```

### 9.4 基音選択失敗

```javascript
if (!baseNoteInfo) {
    console.error('❌ 基音が選択されていません');
    throw new Error('基音が選択されていません');
}
```

---

## 10. データ永続化

### 10.1 localStorage構造

```javascript
// セッションデータ
localStorage.setItem('sessionData', JSON.stringify([
    {
        sessionId: 1,
        mode: 'random',
        baseNote: 'C4',
        baseFrequency: 261.63,
        startTime: 1706000000000,
        endTime: 1706000010000,
        duration: 10000,
        completed: true,
        pitchErrors: [...]
    },
    // ... 最大100セッション
]));

// 音域データ
localStorage.setItem('voiceRangeData', JSON.stringify({
    results: {
        comfortableRange: {
            lowFreq: 130.81,
            highFreq: 523.25
        }
    }
}));
```

### 10.2 DataManager活用

```javascript
// 保存
DataManager.saveToStorage('sessionData', sessions);

// 取得
const sessions = DataManager.getFromStorage('sessionData');
```

### 10.3 データ保持期限

- **セッションデータ**: 最大100セッション（古いものから自動削除）
- **音域データ**: 手動削除するまで保持

---

## 11. 今後の拡張予定

### 11.1 中級・上級モード実装

**連続チャレンジモード（continuous）**:
- 12セッション連続
- セッション間の自動遷移（2秒インターバル）
- 総合評価のみ

**12音階モード（12tone）**:
- 12音階すべてを順次使用
- 音域調整機能
- S級判定可能

### 11.2 結果表示機能強化

- セッション別詳細分析
- 音程ごとの誤差グラフ
- 成長記録グラフ
- ランキング機能

### 11.3 トレーニング設定

- 再生速度調整
- ドレミガイド速度調整
- 音色選択（ピアノ以外）

---

## 📝 変更履歴

### v3.0.0 (2025-01-23)
- SPA版として新規作成
- SessionDataRecorder統合仕様追加
- 適応的基音選択アルゴリズム追加
- ナビゲーション処理仕様追加
- リソースライフサイクル管理仕様追加
- トレーニング統合初期化仕様追加

---

## 📚 関連ドキュメント

- **ナビゲーション処理仕様**: `/specifications/NAVIGATION_HANDLING_SPECIFICATION.md`
- **音量バー統合仕様**: `/specifications/VOLUME_BAR_INTEGRATION_SPECIFICATION.md`
- **プロジェクト開発ガイドライン**: `/CLAUDE.md`
