/**
 * トレーニング記録ページコントローラー
 *
 * @version 2.0.0
 * @description トレーニング履歴の表示・統計計算・グラフ描画
 *
 * 【責任範囲】
 * - トレーニングセッション履歴の読み込みと表示
 * - 統計計算（連続記録日数・平均誤差・最高グレード）
 * - Chart.js精度推移グラフの描画
 * - データなし状態の適切な表示
 * - 動的評価計算（EvaluationCalculator統合）
 *
 * 【依存関係】
 * - DataManager: セッションデータ取得
 * - EvaluationCalculator: 動的グレード計算（v2.0.0: 動的計算方式）
 * - Chart.js: グラフ描画
 * - window.initializeLucideIcons: アイコン初期化
 *
 * 【v2.0.0 重要変更】
 * - 評価基準変更対応: セッションデータから動的に評価を計算
 * - パフォーマンス: 50セッション2ms（体感的に即座）
 * - データ一貫性: 過去データも最新基準で評価
 */

console.log('[Records] Controller loading...');

// Chart.jsインスタンスを保持（SPA対応: 再初期化時に破棄するため）
// グローバルスコープで管理して重複宣言エラーを回避
if (typeof window.accuracyChartInstance === 'undefined') {
    window.accuracyChartInstance = null;
}

/**
 * トレーニング記録ページの初期化（SPA対応）
 */
window.initRecords = async function() {
    console.log('📊 [Records] トレーニング記録ページ初期化開始');

    try {
        // DOMの準備が完了するまで待機（SPAでのDOM挿入完了を保証）
        await new Promise(resolve => {
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', resolve, { once: true });
            } else {
                // すでにDOMContentLoaded済み（SPAページ遷移時）
                setTimeout(resolve, 0);
            }
        });

        // 総合評価ページから戻った際のクリーンアップ
        cleanupRecordsViewElements();

        // データ取得と表示
        loadTrainingRecords();

        // Lucideアイコン初期化（統合初期化関数を使用）
        if (typeof window.initializeLucideIcons === 'function') {
            window.initializeLucideIcons({ immediate: true });
            console.log('[Records] Lucide icons initialized');
        } else if (typeof lucide !== 'undefined') {
            lucide.createIcons();
            console.log('[Records] Lucide icons initialized (fallback)');
        }
    } catch (error) {
        console.error('[Records] 初期化エラー:', error);
    }
};

/**
 * トレーニング記録を読み込んで表示
 */
async function loadTrainingRecords() {
    console.log('[Records] Loading training records...');

    try {
        // DataManagerからセッション履歴を取得
        const sessions = DataManager.getSessionHistory(null, 50); // 全モード、最大50件
        console.log(`[Records] Loaded ${sessions ? sessions.length : 0} sessions`);
        if (sessions && sessions.length > 0) {
            console.log('[Records] First session sample:', sessions[0]);
        }

        if (!sessions || sessions.length === 0) {
            hideAllLoading();
            showNoDataMessage();
            return;
        }

        // 統計を計算（非同期で段階的に表示）
        const stats = calculateStatistics(sessions);
        console.log('[Records] Statistics:', stats);

        // 統計情報を表示
        await displayStatistics(stats);
        hideLoading('stats');

        // セッションリストを表示
        await displaySessionList(sessions);
        hideLoading('sessions');

        // グラフを表示
        await displayAccuracyChart(sessions);
        hideLoading('chart');

        // データあり時の表示制御
        const noDataMessage = document.getElementById('no-data-message');
        if (noDataMessage) {
            noDataMessage.style.setProperty('display', 'none', 'important');
        }
        document.getElementById('chart-section').style.display = 'block';
        document.getElementById('action-buttons-section').style.display = 'block';

        // セッションコンテンツを確実に表示
        const sessionsContent = document.getElementById('sessions-content');
        if (sessionsContent) {
            sessionsContent.style.display = 'block';
        }

    } catch (error) {
        console.error('[Records] Error loading records:', error);
        hideAllLoading();
        showNoDataMessage();
    }
}

/**
 * ローディング表示を非表示にしてコンテンツを表示
 * @param {string} section - 'stats' | 'chart' | 'sessions'
 */
function hideLoading(section) {
    // LoadingComponentを使用して確実にローディングを非表示
    window.LoadingComponent.toggle(section, false);
}

/**
 * すべてのローディング表示を非表示
 */
function hideAllLoading() {
    hideLoading('stats');
    hideLoading('chart');
    hideLoading('sessions');
}

    /**
     * 統計を計算（モード別）
     * @version 3.0.0 - モード別統計計算
     */
function calculateStatistics(sessions) {
    // レッスン単位にグループ化
    const lessons = groupSessionsIntoLessons(sessions);

    console.log(`📊 [Statistics] 総セッション数: ${sessions.length}, グループ化後レッスン数: ${lessons.length}`);

    // モード別に統計を計算
    const modeData = {};
    const modeNames = {
        'random': 'ランダム基音モード',
        'continuous': '連続チャレンジモード',
        'chromatic': '12音階モード',
        '12tone': '12音階モード'
    };

    lessons.forEach(lesson => {
        const mode = lesson.mode;
        console.log(`📊 [Statistics] レッスン処理: モード=${mode}, セッション数=${lesson.sessions.length}`);
        if (!modeData[mode]) {
            modeData[mode] = {
                lessons: [],
                avgErrors: [],
                grades: []
            };
        }

        modeData[mode].lessons.push(lesson);

        // レッスン全体の評価を計算
        try {
            const evaluation = window.EvaluationCalculator.calculateDynamicGrade(lesson.sessions);
            modeData[mode].avgErrors.push(Math.abs(evaluation.metrics.adjusted.avgError));
            modeData[mode].grades.push(evaluation.grade);
        } catch (error) {
            console.warn('[Records] モード別統計計算エラー:', error, lesson);
        }
    });

    // モード別統計を作成
    const modeStats = Object.keys(modeData).map(mode => {
        const data = modeData[mode];
        const avgAccuracy = data.avgErrors.length > 0
            ? Math.round(data.avgErrors.reduce((a, b) => a + b, 0) / data.avgErrors.length)
            : 0;

        // 最高グレード
        const gradeOrder = ['S', 'A', 'B', 'C', 'D', 'E'];
        const bestGrade = data.grades.reduce((best, grade) => {
            const currentIdx = gradeOrder.indexOf(grade);
            const bestIdx = gradeOrder.indexOf(best);
            return (currentIdx !== -1 && (bestIdx === -1 || currentIdx < bestIdx)) ? grade : best;
        }, '-');

        console.log(`📊 [Statistics] モード=${mode}: レッスン数=${data.lessons.length}, 平均誤差=${avgAccuracy}, 最高グレード=${bestGrade}`);

        return {
            mode,
            modeName: modeNames[mode] || mode,
            lessonCount: data.lessons.length,
            avgAccuracy,
            bestGrade
        };
    });

    console.log(`📊 [Statistics] モード別統計: ${modeStats.length}モード`, modeStats);

    // 連続記録日数を計算
    const streak = calculateStreak(sessions);

    return {
        modeStats,
        streak
    };
}

    /**
     * 連続記録日数を計算
     */
function calculateStreak(sessions) {
    if (sessions.length === 0) return 0;

    // セッションを日付でグループ化
    const dates = sessions.map(s => {
        const date = new Date(s.startTime || s.completedAt);
        return date.toDateString();
    });

    const uniqueDates = [...new Set(dates)].sort((a, b) =>
        new Date(b) - new Date(a)
    );

    // 今日から遡って連続日数をカウント
    const today = new Date().toDateString();
    let streak = 0;

    for (let i = 0; i < uniqueDates.length; i++) {
        const checkDate = new Date();
        checkDate.setDate(checkDate.getDate() - i);
        const checkDateStr = checkDate.toDateString();

        if (uniqueDates.includes(checkDateStr)) {
            streak++;
        } else {
            break;
        }
    }

    return streak;
}

    /**
     * 統計を表示（モード別）
     */
async function displayStatistics(stats) {
    document.getElementById('streak-count').textContent = stats.streak;

    // 改善状況メッセージ（全体の傾向を表示）
    const statusEl = document.getElementById('improvement-status');
    const totalLessons = stats.modeStats.reduce((sum, mode) => sum + mode.lessonCount, 0);
    statusEl.textContent = `総レッスン数: ${totalLessons}`;
    statusEl.className = 'text-lg text-blue-300';

    // モード別統計を表示
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

    // Lucideアイコン再初期化
    if (typeof window.initializeLucideIcons === 'function') {
        window.initializeLucideIcons({ immediate: true });
    }

    // レンダリング完了まで待機
    await new Promise(resolve => setTimeout(resolve, 0));
}

    /**
     * セッション一覧を表示
     */
async function displaySessionList(sessions) {
    const container = document.getElementById('recent-sessions');
    const countEl = document.getElementById('records-count');

    // セッションをレッスン単位にグループ化
    const lessons = groupSessionsIntoLessons(sessions);

    countEl.textContent = `${lessons.length}件`;
    container.innerHTML = '';

    // 最新10件のみ表示
    const displayLessons = lessons.slice(0, 10);

    // 非同期で段階的に表示（UX向上）
    for (const lesson of displayLessons) {
        const lessonCard = createLessonCard(lesson);
        container.appendChild(lessonCard);
        // 次のフレームまで待機（レンダリングを段階的に実行）
        await new Promise(resolve => setTimeout(resolve, 0));
    }
}

/**
 * セッションをレッスン単位にグループ化
 * @param {Array} sessions - 全セッション
 * @returns {Array} レッスン配列
 */
function groupSessionsIntoLessons(sessions) {
    const lessons = [];

    // モード別のセッション数定義（動的判定関数）
    const getSessionsPerLesson = (mode, sessions) => {
        if (mode === 'random') return 8;
        if (mode === 'continuous') return 12;
        if (mode === 'chromatic' || mode === '12tone') {
            // 12音階モードは方向性で判定
            const firstSession = sessions[0];
            if (firstSession && firstSession.direction === 'both') {
                return 24; // 両方向
            }
            return 12; // 片方向（上昇/下降）
        }
        return 8; // デフォルト
    };

    // モード別にセッションを分類
    const sessionsByMode = {};
    sessions.forEach(session => {
        const mode = session.mode || 'random';
        if (!sessionsByMode[mode]) {
            sessionsByMode[mode] = [];
        }
        sessionsByMode[mode].push(session);
    });

    console.log('🔍 [Grouping] 総セッション数:', sessions.length);
    console.log('🔍 [Grouping] モード別セッション数:', Object.keys(sessionsByMode).map(m => `${m}: ${sessionsByMode[m].length}`).join(', '));

    // 各モードでグループ化
    Object.keys(sessionsByMode).forEach(mode => {
        const modeSessions = sessionsByMode[mode];
        const sessionsPerLesson = getSessionsPerLesson(mode, modeSessions);

        console.log(`🔍 [Grouping] ${mode}モード: ${modeSessions.length}セッション → ${sessionsPerLesson}セッション/レッスンで分割`);

        // セッションIDでソート（古い順）
        modeSessions.sort((a, b) => a.sessionId - b.sessionId);

        // グループ化
        for (let i = 0; i < modeSessions.length; i += sessionsPerLesson) {
            const lessonSessions = modeSessions.slice(i, i + sessionsPerLesson);

            console.log(`🔍 [Grouping] ${mode} レッスン${Math.floor(i / sessionsPerLesson) + 1}: ${lessonSessions.length}/${sessionsPerLesson}セッション`);

            // レッスンが完了しているか確認（必要なセッション数が揃っているか）
            if (lessonSessions.length === sessionsPerLesson) {
                lessons.push({
                    mode: mode,
                    sessions: lessonSessions,
                    lessonNumber: Math.floor(i / sessionsPerLesson) + 1,
                    startTime: lessonSessions[0].startTime,
                    endTime: lessonSessions[lessonSessions.length - 1].endTime || lessonSessions[lessonSessions.length - 1].startTime
                });
                console.log(`✅ [Grouping] ${mode} レッスン${Math.floor(i / sessionsPerLesson) + 1} 追加完了`);
            } else {
                console.log(`⚠️ [Grouping] ${mode} レッスン${Math.floor(i / sessionsPerLesson) + 1} スキップ（未完了）`);
            }
        }
    });

    // 最新順にソート
    lessons.sort((a, b) => b.startTime - a.startTime);

    return lessons;
}

/**
 * レッスンカードを作成（レッスン = 複数セッションのグループ）
 * @param {Object} lesson - レッスンデータ
 * @returns {HTMLElement} カード要素
 */
function createLessonCard(lesson) {
    const card = document.createElement('div');
    card.className = 'glass-card';
    card.style.cursor = 'pointer';
    card.onclick = () => viewLessonDetail(lesson);

    const date = new Date(lesson.startTime);
    const dateStr = `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;

    // レッスン全体の評価を計算
    let grade = '-';
    let averageError = 0;

    try {
        // 全セッションで評価計算
        const evaluation = window.EvaluationCalculator.calculateDynamicGrade(lesson.sessions);
        grade = evaluation.grade;
        averageError = evaluation.metrics.adjusted.avgError;
    } catch (error) {
        console.warn('[Records] 評価計算エラー:', error, lesson);
    }

    // モード名を日本語に変換
    const modeNames = {
        'random': 'ランダム基音',
        'continuous': '連続チャレンジ',
        'chromatic': '12音階',
        '12tone': '12音階'
    };
    const modeName = modeNames[lesson.mode] || lesson.mode;

    // グレードに応じた色
    const gradeColors = {
        'S': 'text-yellow-300',
        'A': 'text-green-300',
        'B': 'text-blue-300',
        'C': 'text-orange-300',
        'D': 'text-red-300',
        'E': 'text-gray-300'
    };
    const gradeColor = gradeColors[grade] || 'text-white';

    card.innerHTML = `
        <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
                <i data-lucide="music" class="text-blue-300" style="width: 20px; height: 20px;"></i>
                <div>
                    <div class="text-white font-medium">${modeName}モード</div>
                    <div class="text-white-60 text-sm">${dateStr} · ${lesson.sessions.length}セッション</div>
                </div>
            </div>
            <div class="flex items-center gap-4">
                <div class="text-center">
                    <div class="${gradeColor} text-xl font-bold">${grade}</div>
                    <div class="text-white-60 text-sm">グレード</div>
                </div>
                <div class="text-center">
                    <div class="text-white text-lg">±${Math.abs(averageError).toFixed(1)}¢</div>
                    <div class="text-white-60 text-sm">平均誤差</div>
                </div>
            </div>
        </div>
    `;

    // Lucideアイコン初期化
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }

    return card;
}

/**
 * レッスン詳細を表示
 * @param {Object} lesson - レッスンデータ
 */
function viewLessonDetail(lesson) {
    // 総合評価ページへ遷移（モード + トレーニング記録からの遷移フラグ付き）
    window.NavigationManager.navigate('results-overview', {
        mode: lesson.mode,
        fromRecords: 'true'
    });
}

    /**
     * セッションカードを作成（旧版・互換性のため残す）
     * @version 2.0.0 - 動的評価計算統合
     */
function createSessionCard(session) {
    const card = document.createElement('div');
    card.className = 'glass-card';
    card.style.cursor = 'pointer';
    card.onclick = () => viewSessionDetail(session);

    const date = new Date(session.startTime || session.completedAt || Date.now());
    const dateStr = `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;

    // v2.0.0: 動的評価計算（最新の評価基準で計算）
    let grade = '-';
    let averageError = 0;

    try {
        if (session.pitchErrors && session.pitchErrors.length > 0) {
            // EvaluationCalculatorで動的計算
            const evaluation = window.EvaluationCalculator.calculateDynamicGrade([session]);
            grade = evaluation.grade;
            averageError = evaluation.metrics.adjusted.avgError;
        } else {
            // フォールバック: 保存済み評価データを使用（レガシーデータ対応）
            grade = session.grade || session.overallGrade || session.evaluationGrade ||
                   (session.finalEvaluation && session.finalEvaluation.dynamicGrade) ||
                   (session.evaluation && session.evaluation.grade) || '-';
            averageError = session.averageError ?? session.avgError ??
                          (session.sessionSummary && session.sessionSummary.averageCentError) ??
                          (session.evaluation && session.evaluation.averageError) ?? 0;
        }
    } catch (error) {
        console.warn('[Records] 評価計算エラー:', error, session);
        // エラー時はフォールバック
        grade = '-';
        averageError = 0;
    }

    // グレードに応じた色（仕様書準拠: S/A/B/C/D/E級のみ）
    const gradeColors = {
        'S': 'text-yellow-300',    // プロレベル（金色）
        'A': 'text-green-300',     // 優秀（緑色）
        'B': 'text-blue-300',      // 良好（青色）
        'C': 'text-orange-300',    // 合格（オレンジ色）
        'D': 'text-red-300',       // 要練習（赤色）
        'E': 'text-gray-300'       // 基礎レベル（グレー）
    };
    const gradeColor = gradeColors[grade] || 'text-white';

    card.innerHTML = `
        <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
                <i data-lucide="music" class="text-blue-300" style="width: 20px; height: 20px;"></i>
                <div>
                    <div class="text-white font-medium">${session.mode === 'random' ? 'ランダム' : session.mode === 'continuous' ? '連続' : '12音階'}モード</div>
                    <div class="text-white-60 text-sm">${dateStr}</div>
                </div>
            </div>
            <div class="flex items-center gap-4">
                <div class="text-center">
                    <div class="${gradeColor} text-xl font-bold">${grade}</div>
                    <div class="text-white-60 text-xs">グレード</div>
                </div>
                <div class="text-center">
                    <div class="text-white text-lg">±${Math.abs(averageError).toFixed(1)}¢</div>
                    <div class="text-white-60 text-xs">平均誤差</div>
                </div>
                <i data-lucide="chevron-right" class="text-white-40" style="width: 20px; height: 20px;"></i>
            </div>
        </div>
    `;

    // Lucideアイコン再初期化
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }

    return card;
}

    /**
     * セッション詳細を表示
     */
function viewSessionDetail(session) {
    console.log('[Records] Viewing session detail:', session);
    // TODO: 詳細表示実装（将来のフェーズ）
    alert('セッション詳細表示は今後実装予定です');
}

    /**
     * 精度推移グラフを表示
     * @version 2.0.0 - 動的評価計算統合
     */
async function displayAccuracyChart(sessions) {
    const canvas = document.getElementById('accuracyChart');
    if (!canvas) return;

    // 既存のチャートインスタンスを破棄（SPA対応: 再初期化時の重複防止）
    if (window.accuracyChartInstance) {
        window.accuracyChartInstance.destroy();
        window.accuracyChartInstance = null;
    }

    const ctx = canvas.getContext('2d');

    // 最新20件を取得して逆順（古い→新しい）
    const chartSessions = sessions.slice(0, 20).reverse();

    const labels = chartSessions.map((s, idx) => `${idx + 1}`);

    // v2.0.0: 動的評価計算で平均誤差を取得
    const data = chartSessions.map(session => {
        try {
            if (session.pitchErrors && session.pitchErrors.length > 0) {
                const evaluation = window.EvaluationCalculator.calculateDynamicGrade([session]);
                return Math.abs(evaluation.metrics.adjusted.avgError).toFixed(1);
            } else {
                // フォールバック
                const error = session.averageError ?? session.avgError ??
                             (session.sessionSummary && session.sessionSummary.averageCentError) ??
                             (session.evaluation && session.evaluation.averageError) ?? 0;
                return Math.abs(error).toFixed(1);
            }
        } catch (error) {
            console.warn('[Records] グラフデータ計算エラー:', error, session);
            return 0;
        }
    });

    window.accuracyChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: '平均誤差（¢）',
                data: data,
                borderColor: 'rgba(52, 211, 153, 1)',
                backgroundColor: 'rgba(52, 211, 153, 0.1)',
                tension: 0.3,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: '誤差（セント）',
                        color: 'rgba(255, 255, 255, 0.7)'
                    },
                    ticks: {
                        color: 'rgba(255, 255, 255, 0.7)'
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'セッション',
                        color: 'rgba(255, 255, 255, 0.7)'
                    },
                    ticks: {
                        color: 'rgba(255, 255, 255, 0.7)'
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    }
                }
            }
        }
    });

    // グラフ描画完了まで待機
    await new Promise(resolve => setTimeout(resolve, 0));
}

    /**
     * データなしメッセージを表示
     */
function showNoDataMessage() {
    // すべてのローディングを非表示
    hideAllLoading();

    // 統計コンテンツを表示してデフォルト値を設定
    const statsContent = document.getElementById('stats-content');
    if (statsContent) statsContent.style.display = 'block';

    document.getElementById('streak-count').textContent = '0';

    // 改善状況メッセージを更新
    const statusEl = document.getElementById('improvement-status');
    statusEl.textContent = 'トレーニングを開始しましょう';
    statusEl.className = 'text-lg text-blue-300';

    // モード別統計コンテナをクリア
    const modeStatsContainer = document.getElementById('mode-statistics');
    if (modeStatsContainer) {
        modeStatsContainer.innerHTML = '<p class="text-white-60 text-center">まだトレーニングデータがありません</p>';
    }

    // セッションコンテンツを非表示、データなしメッセージを表示
    const sessionsContent = document.getElementById('sessions-content');
    if (sessionsContent) sessionsContent.style.display = 'none';

    document.getElementById('no-data-message').style.display = 'flex';
    document.getElementById('records-count').textContent = '0件';

    // グラフセクションを非表示
    const chartSection = document.getElementById('chart-section');
    if (chartSection) {
        chartSection.style.display = 'none';
    }

    // アクションボタンセクションを表示（データなし時も「新しいトレーニングを開始」ボタンを表示）
    const actionButtons = document.getElementById('action-buttons-section');
    if (actionButtons) {
        actionButtons.style.display = 'block';
    }
}

/**
 * 総合評価ページから戻った際のクリーンアップ
 * - 戻るボタン削除
 * - 日時表示クラス削除
 */
function cleanupRecordsViewElements() {
    // 総合評価ページの戻るボタンを削除
    const backButton = document.getElementById('records-back-button');
    if (backButton) {
        backButton.remove();
        console.log('✅ [Records] 戻るボタンをクリーンアップ');
    }

    // 日時表示クラスを削除（サブタイトルが通常表示に戻るように）
    const pageSubtitle = document.querySelector('.page-subtitle');
    if (pageSubtitle && pageSubtitle.classList.contains('records-view-date')) {
        pageSubtitle.classList.remove('records-view-date');
        console.log('✅ [Records] 日時表示クラスをクリーンアップ');
    }
}

console.log('[Records] Controller loaded');
