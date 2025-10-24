# トレーニング機能仕様書（SPA版）

**バージョン**: 3.1.2
**作成日**: 2025-10-23
**最終更新**: 2025-10-24

**変更履歴**:
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

```javascript
function recordStepPitchData(step) {
    if (!sessionRecorder) return;

    // このステップの音程データを取得（直近700ms間のデータ）
    const stepData = pitchDataBuffer.filter(d => d.step === step);

    // 基音からの期待周波数を計算
    const expectedFrequency = baseNoteInfo.frequency * Math.pow(2, semitoneSteps[step] / 12);
    const expectedNoteName = intervals[step]; // 相対音程名（ドレミ...）

    if (stepData.length === 0) {
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

    // 最も明瞭度が高いデータを使用
    const bestData = stepData.reduce((best, current) =>
        current.clarity > best.clarity ? current : best
    );

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
**解放**: `cleanupCurrentPage()` 内

```javascript
// 初期化
audioDetector = new window.PitchPro.AudioDetectionComponent({
    volumeBarSelector: '.mic-recognition-section .progress-fill',
    autoUpdateUI: true,
    debug: false
});
await audioDetector.initialize();

// 解放
if (window.audioDetector) {
    window.audioDetector.stopDetection();
}
```

### 7.2 PitchShifter

**初期化**: `initializePitchShifter()` 内（初回のみ）
**解放**: `cleanupCurrentPage()` 内

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
