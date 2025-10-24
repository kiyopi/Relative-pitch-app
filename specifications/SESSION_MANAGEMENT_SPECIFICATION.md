# セッション管理仕様書

**バージョン**: 1.0.0
**作成日**: 2025-10-24
**目的**: セッションカウンター・localStorage管理の正確な仕様を定義

---

## 1. 概要

トレーニングアプリでは3つのモード（ランダム・連続・12音階）があり、それぞれセッション管理方法が異なります。
本仕様書では、SessionDataRecorderを中心としたセッション管理の正確な動作を定義します。

---

## 2. SessionDataRecorder 仕様

### 2.1 責任範囲

- sessionCounter の管理（自動インクリメント）
- localStorage 'sessionData' の管理
- 音程誤差データの記録

### 2.2 主要メソッド

#### constructor()
```javascript
const existingSessions = DataManager.getFromStorage('sessionData') || [];
this.sessionCounter = existingSessions.length > 0
    ? Math.max(...existingSessions.map(s => s.sessionId))
    : 0;
```
- localStorageから最大sessionIdを取得してsessionCounterを初期化
- localStorageが空の場合は0

#### startNewSession(baseNote, baseFrequency)
```javascript
// 1. localStorageと再同期（localStorage消去対策）
const existingSessions = DataManager.getFromStorage('sessionData') || [];
const maxId = existingSessions.length > 0
    ? Math.max(...existingSessions.map(s => s.sessionId))
    : 0;

// 2. sessionCounterが古い場合は再同期
if (this.sessionCounter < maxId) {
    this.sessionCounter = maxId;
}

// 3. インクリメント
this.sessionCounter++;

// 4. 新規セッション作成（localStorageには未保存）
this.currentSession = {
    sessionId: this.sessionCounter,
    mode: 'random', // ⚠️ ハードコード（要修正）
    baseNote: baseNote,
    baseFrequency: baseFrequency,
    startTime: Date.now(),
    pitchErrors: [],
    completed: false
};
```

**重要**:
- **呼び出しタイミング**: 基音再生時（trainingController.v2.js Line 435）
- **sessionCounter++**: このメソッド内で自動的に+1される
- **localStorage自動同期**: localStorageクリア後は自動的に0からスタート

#### completeSession()
```javascript
this.currentSession.completed = true;
this.currentSession.endTime = Date.now();
this.currentSession.duration = this.currentSession.endTime - this.currentSession.startTime;

// localStorageに保存
this.saveToStorage(this.currentSession);
```
- セッションを完了状態にしてlocalStorageに保存
- 呼び出しタイミング: 8音階完了時（trainingController.v2.js Line 685）

#### resetSession()
```javascript
this.currentSession = null;

// sessionCounterもlocalStorageと同期してリセット
const existingSessions = DataManager.getFromStorage('sessionData') || [];
this.sessionCounter = existingSessions.length > 0
    ? Math.max(...existingSessions.map(s => s.sessionId))
    : 0;
```
- エラー時などに使用（通常は使用しない）

### 2.3 現在の問題点

1. **mode がハードコード** (Line 43)
   ```javascript
   mode: 'random', // ⚠️ 連続/12音階モードに対応していない
   ```

2. **sessionCounter の直接操作**
   - trainingController.v2.js Line 206 で `sessionCounter = 0` に直接リセット
   - これは SessionDataRecorder の責任範囲を侵害している

---

## 3. localStorage 管理仕様

### 3.1 データ構造

```javascript
localStorage.setItem('sessionData', JSON.stringify([
    {
        sessionId: 1,
        mode: 'random',
        baseNote: 'C4',
        baseFrequency: 261.63,
        startTime: 1234567890,
        pitchErrors: [ /* ... */ ],
        completed: true,
        endTime: 1234567900,
        duration: 10000
    },
    // ... 最大100セッション
]));
```

### 3.2 クリアのタイミング

| タイミング | 場所 | 対象モード |
|----------|------|----------|
| **results-overview「新しいトレーニング」** | router.js Line 324-328 | ランダムモードのみ |
| **trainingページ初期化** | trainingController.v2.js Line 197-201 | ランダムモードのみ |

**クリア処理**:
```javascript
const allSessions = JSON.parse(localStorage.getItem('sessionData')) || [];
const otherModeSessions = allSessions.filter(s => s.mode !== 'random');
localStorage.setItem('sessionData', JSON.stringify(otherModeSessions));
```

### 3.3 問題点

1. **二重クリア**: router.jsとtrainingController.v2.jsで重複
2. **タイミングの不明確さ**: preparation → training でクリアされない

---

## 4. 3モードのフロー仕様

### 4.1 ランダム基音モード

```
preparation（音域テスト完了）
  ↓ [トレーニング開始ボタン]
  ↓ 必要な処理: なし（現状）
training (表示: セッション 1/8)
  ├─ initializeTrainingPage()
  ├─ initializeRandomModeTraining() ← localStorageクリア
  ├─ preselectBaseNote()
  └─ [基音スタートボタン]
    ↓
  ├─ startTraining()
  ├─ startNewSession() ← sessionCounter++ (0→1)
  ├─ 基音再生
  ├─ 8音階歌唱
  └─ handleSessionComplete()
    ↓
  └─ completeSession() ← localStorageに保存
    ↓
result-session (セッション評価表示)
  ├─ sessionId: 1 を表示
  └─ [次のセッションへボタン]
    ↓ 必要な処理: なし（sessionCounterは自動同期）
training (表示: セッション 2/8)
  ├─ initializeTrainingPage()
  ├─ 継続判定 ← completedSessions.length > 0
  ├─ initializeRandomModeTraining() スキップ ← ⚠️ バグ！基音未選択
  ├─ [基音スタートボタン]
    ↓
  ├─ startNewSession() ← sessionCounter++ (1→2)
  ... (繰り返し)
    ↓ 8セッション完了
results-overview (総合評価)
  └─ [新しいトレーニング開始ボタン]
    ↓ localStorageクリア（router.js）
training (セッション 1/8)
```

### 4.2 連続チャレンジモード / 12音階モード

```
preparation（音域テスト完了）
  ↓ [トレーニング開始ボタン]
  ↓ 必要な処理: モード情報をURLパラメータで渡す
training (表示: セッション 1/8 または 1/12)
  ├─ initializeTrainingPage()
  ├─ URLからモード取得
  ├─ localStorageクリア（該当モードのみ）
  ├─ preselectBaseNote()
  └─ [基音スタートボタン]
    ↓
  ├─ startNewSession() ← sessionCounter++ (0→1)
  ├─ 基音再生
  ├─ 8音階歌唱
  └─ handleSessionComplete()
    ├─ completeSession() ← localStorageに保存
    ├─ completedCount < maxSessions を判定
    └─ 次のセッション自動開始
      ↓
  ├─ preselectBaseNote()
  ├─ startNewSession() ← sessionCounter++ (1→2)
  ... (自動繰り返し)
    ↓ 8/12セッション完了
results-overview (総合評価)
```

---

## 5. 現在の実装の問題点まとめ

### 5.1 SessionDataRecorder

1. **mode がハードコード** → 連続/12音階モードに対応不可
2. **sessionCounter への直接アクセス** → カプセル化違反

### 5.2 trainingController.v2.js

1. **セッション継続判定の誤り** (Line 83-96)
   ```javascript
   if (completedRandomSessions.length > 0) {
       initializeRandomModeTraining() をスキップ // ← 基音未選択エラー！
   }
   ```
   - `initializeRandomModeTraining()`をスキップすると`preselectBaseNote()`も実行されない
   - 結果: 「基音が選択されていません」エラー

2. **localStorage二重クリア**
   - router.js と trainingController.v2.js で重複

3. **モード別処理の未実装**
   - `handleSessionComplete()` が常に result-session へ遷移
   - 連続/12音階モードの自動進行が未実装

### 5.3 ReloadManager

- sessionCounter を管理していない（正しい）
- 役割は明確（リロード検出とマイク許可再取得のみ）

---

## 6. 正しい設計方針

### 6.1 責任分担

| モジュール | 責任範囲 |
|----------|---------|
| **SessionDataRecorder** | sessionCounter管理、localStorage管理、音程誤差記録 |
| **trainingController.v2.js** | トレーニングフロー、UI制御、モード別処理 |
| **ReloadManager** | リロード検出、マイク許可再取得 |
| **router.js** | ページ遷移、results-overviewからのlocalStorageクリア |
| **preparation-pitchpro-cycle.js** | 音域テスト、preparationからのlocalStorageクリア |

### 6.2 sessionCounter 管理の原則

1. **自動インクリメント**: `startNewSession()` で自動的に+1
2. **自動同期**: localStorageとの同期は `startNewSession()` 内で自動実行
3. **直接操作禁止**: 外部から `sessionCounter = 0` などの直接操作は行わない
4. **表示用取得**: `getSessionNumber()` で取得

### 6.3 localStorage クリアの原則

1. **新規トレーニング開始時のみ**: preparation → training / results-overview → training
2. **モード別クリア**: 該当モードのみクリア（他モードは保持）
3. **一箇所で実行**: 重複を避ける

---

## 7. 次のステップ

1. SessionDataRecorder にモードパラメータを追加
2. trainingController.v2.js のセッション継続判定を削除
3. localStorage クリアを preparation-pitchpro-cycle.js に統一
4. handleSessionComplete() にモード別処理を実装

---

**このドキュメントは実装前の設計書です。実装後は実際の動作に合わせて更新してください。**
