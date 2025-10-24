# セッション管理修正タスク一覧

**作成日**: 2025-10-24
**目的**: SESSION_MANAGEMENT_SPECIFICATION.md に基づく実装修正の完全なタスクリスト

---

## 📋 修正タスク全体像

SESSION_MANAGEMENT_SPECIFICATION.md の「7. 次のステップ」に基づく実装修正。

---

## 🎯 Phase 1: 基盤修正（最優先）

### Task 1.1: SessionDataRecorder の修正

**ファイル**: `/PitchPro-SPA/js/controllers/session-data-recorder.js`

**修正内容**:
1. `startNewSession()` に mode パラメータを追加
   - 現在: `startNewSession(baseNote, baseFrequency)`
   - 修正後: `startNewSession(baseNote, baseFrequency, mode = 'random')`

2. mode のハードコードを削除
   - 現在 (Line 43): `mode: 'random',`
   - 修正後: `mode: mode,`

**コード例**:
```javascript
startNewSession(baseNote, baseFrequency, mode = 'random') {
    // localStorage と同期
    const existingSessions = DataManager.getFromStorage('sessionData') || [];
    const maxId = existingSessions.length > 0
        ? Math.max(...existingSessions.map(s => s.sessionId))
        : 0;
    
    if (this.sessionCounter < maxId) {
        this.sessionCounter = maxId;
    }
    
    this.sessionCounter++;
    
    this.currentSession = {
        sessionId: this.sessionCounter,
        mode: mode,  // ← 動的に設定
        baseNote: baseNote,
        baseFrequency: baseFrequency,
        startTime: Date.now(),
        pitchErrors: [],
        completed: false
    };
    
    return this.currentSession;
}
```

**影響範囲**:
- trainingController.v2.js の startNewSession() 呼び出し箇所を修正

---

## 🎯 Phase 2: trainingController.v2.js の修正（中核）

### Task 2.1: セッション継続判定の削除

**ファイル**: `/PitchPro-SPA/js/controllers/trainingController.v2.js`

**削除対象** (Line 83-96):
```javascript
// 【v2.0.1修正】セッション継続判定を追加 ← 削除
const existingSessions = JSON.parse(localStorage.getItem('sessionData')) || [];
const completedRandomSessions = existingSessions.filter(s => s.mode === 'random' && s.completed);

if (completedRandomSessions.length > 0) {
    console.log(`🔄 セッション継続中: ${completedRandomSessions.length}セッション完了済み`);
    console.log('   → initializeRandomModeTraining() をスキップ（データ保持）');
} else {
    console.log('🆕 新規トレーニング開始 - セッションデータをリセット');
    initializeRandomModeTraining();
}
```

**修正後**:
```javascript
// 基音選択（毎回必須）
preselectBaseNote();
```

**理由**: 
- v2.0.1の間違った実装を削除
- 基音選択は毎回実行する必要がある
- SessionDataRecorder が自動的に sessionCounter を管理

---

### Task 2.2: initializeRandomModeTraining() の修正

**ファイル**: `/PitchPro-SPA/js/controllers/trainingController.v2.js`

**削除対象** (Line 203-208):
```javascript
// sessionCounterを0にリセット（ランダムモード専用）
if (window.sessionDataRecorder) {
    window.sessionDataRecorder.currentSession = null;
    window.sessionDataRecorder.sessionCounter = 0;  // ← 削除
    console.log('🔄 sessionCounterリセット: 0');
}
```

**修正後**:
```javascript
// sessionDataRecorder のリセット（currentSession のみ）
if (window.sessionDataRecorder) {
    window.sessionDataRecorder.currentSession = null;
    console.log('🔄 currentSession をクリア');
}
```

**理由**: 
- sessionCounter の直接操作は SessionDataRecorder の責任範囲を侵害
- SessionDataRecorder が自動的に管理

---

### Task 2.3: startNewSession() 呼び出し時に mode を渡す

**ファイル**: `/PitchPro-SPA/js/controllers/trainingController.v2.js`

**修正対象** (Line 435):
```javascript
// 現在
sessionRecorder.startNewSession(baseNoteInfo.note, baseNoteInfo.frequency);

// 修正後
sessionRecorder.startNewSession(baseNoteInfo.note, baseNoteInfo.frequency, currentMode);
```

**理由**: Task 1.1 で mode パラメータを追加したため

---

### Task 2.4: handleSessionComplete() にモード別処理を追加

**ファイル**: `/PitchPro-SPA/js/controllers/trainingController.v2.js`

**修正対象** (Line 683-691):
```javascript
// 現在（常に result-session へ遷移）
const sessionNumber = sessionRecorder.getSessionNumber();
window.location.hash = `result-session?session=${sessionNumber}`;
return;
```

**修正後**:
```javascript
const config = modeConfig[currentMode];
const sessionNumber = sessionRecorder.getSessionNumber();

if (config.hasIndividualResults) {
    // ランダムモード: result-session へ遷移
    window.location.hash = `result-session?session=${sessionNumber}`;
    return;
} else {
    // 連続/12音階モード: 次のセッション or 総合評価
    const allSessions = JSON.parse(localStorage.getItem('sessionData')) || [];
    const completedCount = allSessions.filter(s => s.mode === currentMode && s.completed).length;
    
    if (completedCount >= config.maxSessions) {
        // 全セッション完了 → 総合評価
        window.location.hash = 'results-overview';
    } else {
        // 次のセッション自動開始
        console.log(`🔄 次のセッション開始: ${completedCount + 1}/${config.maxSessions}`);
        preselectBaseNote();
        resetTrainingUI();
        // ボタンを「基音スタート」に戻す等の処理
    }
}
```

---

### Task 2.5: ブラウザバック防止の実装

**ファイル**: `/PitchPro-SPA/js/controllers/trainingController.v2.js`

**追加する関数**:
```javascript
function preventBrowserBack() {
    // ダミーのエントリーを追加
    history.pushState(null, '', location.href);

    // popstateイベントでconfirmation表示
    window.addEventListener('popstate', function(event) {
        const confirmed = confirm(
            'トレーニング中です。\n' +
            '戻ると進行中のデータが失われます。\n' +
            '本当に戻りますか？'
        );

        if (confirmed) {
            // クリーンアップ処理を実行（router.js が自動実行）
            history.back();
        } else {
            // 戻らない（ダミーエントリーを再追加）
            history.pushState(null, '', location.href);
        }
    });
}
```

**呼び出し箇所** (initializeTrainingPage() 内):
```javascript
export async function initializeTrainingPage() {
    // ... 既存の初期化処理 ...

    preselectBaseNote();
    setupHomeButton();  // Task 2.6
    preventBrowserBack();  // ← ここで呼び出し
}
```

---

### Task 2.6: ホームボタンに確認ダイアログを追加

**ファイル**: `/PitchPro-SPA/js/controllers/trainingController.v2.js`

**追加する関数**:
```javascript
function setupHomeButton() {
    const homeBtn = document.getElementById('btn-home-training');
    if (!homeBtn) return;

    homeBtn.addEventListener('click', (e) => {
        e.preventDefault();

        const confirmed = confirm(
            'トレーニング中です。\n' +
            'ホームに戻ると進行中のデータが失われます。\n' +
            '本当にホームに戻りますか？'
        );

        if (confirmed) {
            // router.js の cleanupCurrentPage() が自動実行される
            window.location.hash = 'home';
        }
    });
}
```

**呼び出し箇所** (initializeTrainingPage() 内):
```javascript
export async function initializeTrainingPage() {
    // ... 既存の初期化処理 ...

    preselectBaseNote();
    setupHomeButton();  // ← ここで呼び出し
    preventBrowserBack();
}
```

---

## 🎯 Phase 3: HTMLファイルの修正

### Task 3.1: training.html の修正

**ファイル**: `/PitchPro-SPA/pages/training.html`

**修正対象** (Line 146):
```html
<!-- 現在 -->
<button class="btn btn-outline" onclick="window.location.hash='home'">
    <i data-lucide="home"></i>
    <span>ホームに戻る</span>
</button>

<!-- 修正後 -->
<button class="btn btn-outline" id="btn-home-training">
    <i data-lucide="home"></i>
    <span>ホームに戻る</span>
</button>
```

**変更点**:
- onclick 削除
- id="btn-home-training" 追加

---

## 🎯 Phase 4: localStorage クリアの統一

### Task 4.1: preparation-pitchpro-cycle.js に localStorage クリアを追加

**ファイル**: `/PitchPro-SPA/pages/js/preparation-pitchpro-cycle.js`

**修正対象** (Line 1259, 1467 の直前):
```javascript
// 「トレーニング開始」ボタンクリック時
// localStorage のセッションデータをクリア
const allSessions = JSON.parse(localStorage.getItem('sessionData')) || [];
const mode = redirectInfo?.mode || 'random';
const otherModeSessions = allSessions.filter(s => s.mode !== mode);
localStorage.setItem('sessionData', JSON.stringify(otherModeSessions));
console.log(`✅ ${mode}モードのセッションデータをクリアしました`);

ReloadManager.navigateToTraining(redirectInfo.mode, redirectInfo.session);
```

---

### Task 4.2: trainingController.v2.js の localStorage クリアを削除

**ファイル**: `/PitchPro-SPA/js/controllers/trainingController.v2.js`

**削除対象** (Line 197-201):
```javascript
// localStorageのランダムモードセッションデータをクリア
const allSessions = JSON.parse(localStorage.getItem('sessionData')) || [];
const otherModeSessions = allSessions.filter(s => s.mode !== 'random');
localStorage.setItem('sessionData', JSON.stringify(otherModeSessions));
console.log('🗑️ ランダムモードのセッションデータをクリア');
```

**理由**: preparation-pitchpro-cycle.js に統一するため

---

## 🎯 Phase 5: その他のページ

### Task 5.1: result-session-controller.js にブラウザバック防止

**ファイル**: `/PitchPro-SPA/pages/js/result-session-controller.js`

**追加する関数**:
```javascript
function preventBrowserBack() {
    history.pushState(null, '', location.href);

    window.addEventListener('popstate', function(event) {
        const confirmed = confirm(
            'セッション評価表示中です。\n' +
            '戻ると次のセッションに進めません。\n' +
            '本当に戻りますか？'
        );

        if (confirmed) {
            history.back();
        } else {
            history.pushState(null, '', location.href);
        }
    });
}
```

**呼び出し箇所** (initializeResultSessionPage() 内):
```javascript
export async function initializeResultSessionPage() {
    // リロード検出
    if (ReloadManager.detectReload()) {
        // ...
    }

    // ... 既存の初期化処理 ...

    preventBrowserBack();  // ← 追加
}
```

---

### Task 5.2: results-overview にブラウザバック防止（オプション）

**ファイル**: router.js の setupResultsOverviewEvents()

**追加コード**:
```javascript
setupResultsOverviewEvents() {
    console.log('Setting up results-overview page events...');

    // ブラウザバック防止
    preventBrowserBack();

    // ... 既存の処理 ...
}

function preventBrowserBack() {
    history.pushState(null, '', location.href);

    window.addEventListener('popstate', function(event) {
        const confirmed = confirm(
            '総合評価表示中です。\n' +
            '戻ると評価データが失われる可能性があります。\n' +
            '本当に戻りますか？'
        );

        if (confirmed) {
            history.back();
        } else {
            history.pushState(null, '', location.href);
        }
    });
}
```

---

## ✅ 実装の優先順位

### 最優先（必須）
1. **Phase 1**: SessionDataRecorder の修正（基盤）
2. **Phase 2 (Task 2.1-2.3)**: trainingController.v2.js の基本修正
3. **Phase 3**: training.html の修正

### 高優先（重要）
4. **Phase 2 (Task 2.5-2.6)**: ブラウザバック防止・ホームボタン
5. **Phase 4**: localStorage クリアの統一

### 中優先（機能追加）
6. **Phase 2 (Task 2.4)**: モード別処理（連続/12音階対応）
7. **Phase 5**: その他のページのブラウザバック防止

---

## 🔍 テスト項目

各Phase完了後にテストすべき項目:

### Phase 1 完了後
- [ ] sessionCounter が localStorage と同期している
- [ ] mode が正しく保存される

### Phase 2 (Task 2.1-2.3) 完了後
- [ ] 基音が毎回選択される
- [ ] sessionCounter が正しく増加する（1→2→3...）
- [ ] ログに「基音が選択されていません」エラーが出ない

### Phase 2 (Task 2.5-2.6) 完了後
- [ ] ブラウザバックで確認ダイアログが表示される
- [ ] ホームボタンで確認ダイアログが表示される
- [ ] キャンセル時にページ遷移しない
- [ ] OK時にクリーンアップが実行される

### Phase 4 完了後
- [ ] preparation からのトレーニング開始時に localStorage がクリアされる
- [ ] results-overview からのトレーニング開始時に localStorage がクリアされる
- [ ] result-session からの遷移時は localStorage が保持される

---

## 📝 注意事項

1. **段階的に実装**: 各Phaseごとにコミット・テストを実施
2. **バックアップ**: 修正前にファイルのバックアップを取る
3. **ログ確認**: 各修正後にブラウザコンソールでログを確認
4. **キャッシュクリア**: テスト時は必ずブラウザキャッシュをクリア

---

**このメモリは実装完了後に削除してください**
