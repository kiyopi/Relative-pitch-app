# トレーニング記録ページ仕様書

**バージョン**: 1.0.0
**作成日**: 2025-11-11
**最終更新**: 2025-11-11

---

## 📋 概要

トレーニング記録ページ（records.html）の機能仕様を定義する。過去のトレーニング履歴をレッスン単位でグループ化し、モード別の統計情報を表示する。

### 対象ファイル
- `/PitchPro-SPA/pages/records.html`
- `/PitchPro-SPA/pages/js/records-controller.js`
- `/PitchPro-SPA/styles/results.css`
- `/PitchPro-SPA/styles/base.css`

---

## 🎯 ページの目的

### 主要機能
1. **モード別統計表示**: モードごとのレッスン数・平均誤差・最高グレードを分離表示
2. **レッスン履歴表示**: セッションをレッスン単位でグループ化して表示
3. **詳細分析へのナビゲーション**: 各レッスンの総合評価ページへリンク

### 設計思想
- **モード分離原則**: 異なる性質のモードを混在させず、それぞれ独立した統計として表示
- **レッスン単位管理**: 個別セッションではなくレッスン単位で履歴を管理

---

## 🏗️ データ構造

### セッションデータ（localStorage）

```javascript
{
    sessionId: 1,
    mode: 'random',  // 'random', 'continuous', '12tone'
    baseNote: 'C3',
    baseFrequency: 130.81,
    startTime: 1699999999999,
    endTime: 1700000099999,
    duration: 100000,
    pitchErrors: [
        {
            step: 0,
            expectedNote: 'C3',
            expectedFrequency: 130.81,
            detectedFrequency: 131.2,
            errorInCents: 5.2,
            clarity: 0.95,
            volume: 0.78,
            timestamp: 1699999999999
        },
        // ... 7音分
    ],
    completed: true,
    direction: 'both'  // 12音階モードのみ（optional）
}
```

---

### レッスンデータ（グループ化後）

```javascript
{
    mode: 'random',
    sessions: [session1, session2, ..., session8],  // 8 or 12 or 24セッション
    lessonNumber: 1,
    startTime: 1699999999999,
    endTime: 1700000099999
}
```

---

## 📊 モード別統計システム

### 設計背景

**なぜモード別統計が必要か**:
1. **性質の違い**: 各モードは異なる学習目的を持つ
   - ランダム基音: 基礎的な相対音感（8セッション）
   - 連続チャレンジ: 全12音の安定性（12セッション）
   - 12音階: 完全なクロマチック習得（12-24セッション）

2. **評価基準の違い**: セッション数が異なるため、混在統計は意味を持たない

3. **ユーザー理解の促進**: 各モードでの上達度を個別に把握できる

---

### 統計計算ロジック

#### calculateStatistics(sessions)

**処理フロー**:
```
1. セッション → レッスングループ化
2. レッスンをモード別に分類
3. モードごとに統計計算
   - レッスン数
   - 平均誤差（全レッスンの平均）
   - 最高グレード（S > A > B > C > D > E）
4. 連続記録日数計算
```

**実装**:
```javascript
function calculateStatistics(sessions) {
    const lessons = groupSessionsIntoLessons(sessions);

    const modeData = {};
    const modeNames = {
        'random': 'ランダム基音モード',
        'continuous': '連続チャレンジモード',
        'chromatic': '12音階モード',
        '12tone': '12音階モード'
    };

    // モード別にレッスンを分類
    lessons.forEach(lesson => {
        const mode = lesson.mode;
        if (!modeData[mode]) {
            modeData[mode] = { lessons: [], avgErrors: [], grades: [] };
        }
        modeData[mode].lessons.push(lesson);

        // 動的グレード計算
        const evaluation = window.EvaluationCalculator.calculateDynamicGrade(lesson.sessions);
        modeData[mode].avgErrors.push(Math.abs(evaluation.metrics.adjusted.avgError));
        modeData[mode].grades.push(evaluation.grade);
    });

    // モード別統計を生成
    const modeStats = Object.keys(modeData).map(mode => {
        const data = modeData[mode];
        const avgAccuracy = data.avgErrors.length > 0
            ? Math.round(data.avgErrors.reduce((a, b) => a + b, 0) / data.avgErrors.length)
            : 0;

        const gradeOrder = ['S', 'A', 'B', 'C', 'D', 'E'];
        const bestGrade = data.grades.reduce((best, grade) => {
            const currentIdx = gradeOrder.indexOf(grade);
            const bestIdx = gradeOrder.indexOf(best);
            return (currentIdx !== -1 && (bestIdx === -1 || currentIdx < bestIdx)) ? grade : best;
        }, '-');

        return {
            mode,
            modeName: modeNames[mode] || mode,
            lessonCount: data.lessons.length,
            avgAccuracy,
            bestGrade
        };
    });

    return {
        modeStats,
        streak: calculateStreak(sessions)
    };
}
```

---

### モード別統計カード表示

**HTML構造**:
```html
<div id="mode-statistics" class="flex flex-col gap-4">
    <!-- JavaScriptで動的生成 -->
</div>
```

**動的生成ロジック**:
```javascript
async function displayStatistics(stats) {
    const container = document.getElementById('mode-statistics');
    container.innerHTML = '';

    stats.modeStats.forEach(mode => {
        const modeCard = document.createElement('div');
        modeCard.className = 'glass-card';
        modeCard.innerHTML = `
            <h5 class="text-white font-medium mb-3">${mode.modeName}</h5>
            <div class="flex justify-around gap-4">
                <div class="flex flex-col items-center">
                    <div class="text-2xl font-bold text-blue-300">${mode.lessonCount}</div>
                    <div class="text-white-60 text-sm">レッスン数</div>
                </div>
                <div class="flex flex-col items-center">
                    <div class="text-2xl font-bold text-green-300">±${mode.avgAccuracy}</div>
                    <div class="text-white-60 text-sm">平均誤差（¢）</div>
                </div>
                <div class="flex flex-col items-center">
                    <div class="text-2xl font-bold text-yellow-300">${mode.bestGrade}</div>
                    <div class="text-white-60 text-sm">最高グレード</div>
                </div>
            </div>
        `;
        container.appendChild(modeCard);
    });
}
```

**CSS活用**:
- `.glass-card`: ガラスモーフィズムカード
- `.flex`, `.justify-around`, `.gap-4`: フレックスレイアウト
- `.text-blue-300`, `.text-green-300`, `.text-yellow-300`: カラークラス
- `.text-white-60`: 60%透明度の白テキスト

---

## 📚 レッスングループ化システム

### レッスングループ化ロジック

#### groupSessionsIntoLessons(sessions)

**処理フロー**:
```
1. モード別にセッションを分類
2. 各モードでセッションをsessionId順にソート
3. モードとdirectionからセッション数を判定
4. セッション数ごとにグループ化
5. グループ化されたレッスンを時系列ソート
```

**実装**:
```javascript
function groupSessionsIntoLessons(sessions) {
    const lessons = [];

    // モード別セッション数取得（動的計算対応）
    const getSessionsPerLesson = (mode, sessions) => {
        if (mode === 'random') return 8;
        if (mode === 'continuous') return 12;
        if (mode === 'chromatic' || mode === '12tone') {
            const firstSession = sessions[0];
            if (firstSession && firstSession.direction === 'both') {
                return 24; // 両方向
            }
            return 12; // 片方向
        }
        return 8; // デフォルト
    };

    // セッションをモード別に分類
    const sessionsByMode = {};
    sessions.forEach(session => {
        const mode = session.mode || 'random';
        if (!sessionsByMode[mode]) sessionsByMode[mode] = [];
        sessionsByMode[mode].push(session);
    });

    // モードごとにレッスン化
    Object.keys(sessionsByMode).forEach(mode => {
        const modeSessions = sessionsByMode[mode];
        const sessionsPerLesson = getSessionsPerLesson(mode, modeSessions);

        // sessionId順にソート
        modeSessions.sort((a, b) => a.sessionId - b.sessionId);

        // レッスン単位でグループ化
        for (let i = 0; i < modeSessions.length; i += sessionsPerLesson) {
            const lessonSessions = modeSessions.slice(i, i + sessionsPerLesson);

            // 完全なレッスンのみ記録
            if (lessonSessions.length === sessionsPerLesson) {
                lessons.push({
                    mode: mode,
                    sessions: lessonSessions,
                    lessonNumber: Math.floor(i / sessionsPerLesson) + 1,
                    startTime: lessonSessions[0].startTime,
                    endTime: lessonSessions[lessonSessions.length - 1].endTime ||
                            lessonSessions[lessonSessions.length - 1].startTime
                });
            }
        }
    });

    // 時系列ソート（新しい順）
    lessons.sort((a, b) => b.startTime - a.startTime);

    return lessons;
}
```

---

### 12音階モード両方向対応

**direction判定の重要性**:
```javascript
// セッションデータ例
{
    sessionId: 1,
    mode: '12tone',
    direction: 'both',  // ← この情報で24セッション判定
    ...
}
```

**判定ロジック**:
```javascript
if (firstSession && firstSession.direction === 'both') {
    return 24; // 上昇12 + 下降12
}
return 12; // 片方向のみ
```

**基音シーケンス**:
- **上昇**: C3 → C#3 → D3 → ... → B3（12セッション）
- **下降**: B3 → A#3 → A3 → ... → C3（12セッション）
- **両方向**: 上昇12 + 下降12 = 24セッション

---

## 🔄 レッスン詳細表示への遷移

### ナビゲーション仕様

**遷移パターン**:
```
records.html
    ↓ (レッスンカードクリック)
results-overview.html?mode=random&fromRecords=true
    ↓ (戻るボタン)
records.html
```

**URLパラメータ**:
- `mode`: モードID（'random', 'continuous', '12tone'）
- `fromRecords=true`: トレーニング記録からの遷移フラグ

---

### レッスンカード実装

**HTML構造**:
```html
<div class="glass-card lesson-card" onclick="viewLessonDetail('random', [session1, session2, ...])">
    <h4 class="heading-md">
        <i data-lucide="music"></i>
        <span>ランダム基音モード レッスン #1</span>
    </h4>
    <div class="flex items-center gap-4">
        <div class="flex flex-col items-center">
            <div class="text-lg font-bold text-yellow-300">A</div>
            <div class="text-white-60 text-sm">グレード</div>
        </div>
        <div class="flex flex-col items-center">
            <div class="text-lg font-bold text-green-300">±12</div>
            <div class="text-white-60 text-sm">平均誤差</div>
        </div>
        <div class="flex flex-col items-center">
            <div class="text-lg font-bold text-blue-300">87.5%</div>
            <div class="text-white-60 text-sm">成功率</div>
        </div>
    </div>
    <div class="text-sm text-white-60 mt-2">
        2025/11/11 14:30
    </div>
</div>
```

**遷移関数**:
```javascript
function viewLessonDetail(mode, sessions) {
    // 一時的にセッションデータを保存
    window.tempLessonSessions = sessions;

    // 総合評価ページへ遷移
    window.NavigationManager.navigate(`results-overview?mode=${mode}&fromRecords=true`);
}
```

---

## 🎨 UI設計原則

### CSS活用方針

**インライン禁止原則**:
- ❌ `style="display: flex; gap: 1rem;"`（禁止）
- ✅ `class="flex gap-4"`（推奨）

**使用CSSクラス**:
```css
/* レイアウト */
.flex                 /* display: flex */
.flex-col             /* flex-direction: column */
.items-center         /* align-items: center */
.justify-around       /* justify-content: space-around */
.gap-4                /* gap: 1rem */

/* 見出し */
.heading-md           /* 中見出し（アイコン付き） */

/* カラー */
.text-blue-300        /* 青色テキスト */
.text-green-300       /* 緑色テキスト */
.text-yellow-300      /* 黄色テキスト */
.text-white-60        /* 60%透明度白テキスト */

/* フォント */
.font-medium          /* font-weight: 500 */
.font-bold            /* font-weight: 700 */
.text-sm              /* font-size: 0.875rem */
.text-lg              /* font-size: 1.125rem */
.text-2xl             /* font-size: 1.5rem */

/* カード */
.glass-card           /* ガラスモーフィズムカード */
```

---

## 🔧 SPA重複宣言エラー対策

### 問題

**エラー内容**:
```
SyntaxError: Can't create duplicate variable: 'accuracyChartInstance'
```

**原因**:
- SPAでrecordsページに戻ると、スクリプトが再読み込みされる
- `let accuracyChartInstance = null;`が2回目の宣言でエラー

---

### 解決策

**変更前**:
```javascript
let accuracyChartInstance = null;
```

**変更後**:
```javascript
// Chart.jsインスタンスを保持（SPA対応: 再初期化時に破棄するため）
// グローバルスコープで管理して重複宣言エラーを回避
if (typeof window.accuracyChartInstance === 'undefined') {
    window.accuracyChartInstance = null;
}
```

**使用箇所の修正**:
```javascript
// 既存インスタンスを破棄
if (window.accuracyChartInstance) {
    window.accuracyChartInstance.destroy();
    window.accuracyChartInstance = null;
}

// 新規作成
window.accuracyChartInstance = new Chart(ctx, config);
```

---

## 🧹 クリーンアップ処理

### cleanupRecordsViewElements()

**目的**: 総合評価ページから戻った際に追加要素をクリーンアップ

**処理内容**:
```javascript
function cleanupRecordsViewElements() {
    // 戻るボタンを削除
    const backButton = document.getElementById('records-back-button');
    if (backButton) {
        backButton.remove();
        console.log('✅ [Records] 戻るボタンをクリーンアップ');
    }

    // 日時表示クラスを削除
    const pageSubtitle = document.querySelector('.page-subtitle');
    if (pageSubtitle && pageSubtitle.classList.contains('records-view-date')) {
        pageSubtitle.classList.remove('records-view-date');
        console.log('✅ [Records] 日時表示クラスをクリーンアップ');
    }
}
```

**呼び出しタイミング**:
```javascript
async function initRecords() {
    console.log('📊 トレーニング記録ページ初期化');

    // 総合評価ページから戻った際のクリーンアップ
    cleanupRecordsViewElements();

    // ... 以降の処理
}
```

---

## 📈 連続記録日数計算

### calculateStreak(sessions)

**処理フロー**:
```
1. セッションを日付単位でグループ化
2. 今日から逆順に連続日数をカウント
3. 日付の間が1日空いたら終了
```

**実装**:
```javascript
function calculateStreak(sessions) {
    if (!sessions || sessions.length === 0) return 0;

    // 日付単位でグループ化
    const dates = [...new Set(sessions.map(s => {
        const date = new Date(s.startTime);
        return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
    }))].sort().reverse();

    // 今日の日付
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;

    let streak = 0;
    let currentDate = new Date(today);

    for (const dateStr of dates) {
        const checkStr = `${currentDate.getFullYear()}-${currentDate.getMonth() + 1}-${currentDate.getDate()}`;

        if (dateStr === checkStr) {
            streak++;
            currentDate.setDate(currentDate.getDate() - 1);
        } else {
            break;
        }
    }

    return streak;
}
```

---

## 🔗 関連仕様書

- **MODE_CONTROLLER_SPECIFICATION.md**: モード管理統合システム
- **RESULTS_OVERVIEW_SPECIFICATION.md**: 総合評価ページ仕様
- **EVALUATION_SYSTEM_SPECIFICATION.md**: 動的グレード計算システム
- **DATA_MANAGEMENT_SPECIFICATION.md**: localStorage管理仕様
- **TRAINING_SPECIFICATION.md**: トレーニング実行仕様

---

## 📝 変更履歴

### v1.0.0 (2025-11-11)
- 初版作成
- モード別統計表示実装
- レッスングループ化ロジック完全実装
- 12音階モード両方向対応（24セッション）
- SPA重複宣言エラー対策実装
- クリーンアップ処理実装
