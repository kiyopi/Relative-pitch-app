/**
 * トレーニング記録ページコントローラー
 *
 * @version 2.5.0
 * @date 2025-11-15
 * @description トレーニング履歴の表示・統計計算・グラフ描画
 * @changelog
 *   v2.5.0 (2025-11-15) - 上段統計項目のレイアウト完全リニューアル
 *                         サブタイトル+アイコン+数値の1行形式に統一
 *                         「総トレーニング日数」「開始日 (経過日数)」「継続トレーニング日数」
 *   v2.4.0 (2025-11-15) - 統計表示の改善
 *                         開始日を「2025/11/10」形式に変更
 *                         総平均誤差にランクアイコン・色を追加
 *   v2.3.1 (2025-11-15) - 開始日取得ロジック修正
 *                         timestamp/startTime/completedAtの優先順で日付取得（Bug修正）
 *   v2.3.0 (2025-11-15) - 統計セクションの表記統一
 *                         すべて「数値」+「ラベル」形式に統一（連続0日 → 0 + 連続日数）
 *   v2.2.0 (2025-11-15) - 統計セクションのレイアウト変更
 *                         上段を横並び3項目に変更（累計日数/開始日/連続記録）
 *   v2.1.0 (2025-11-14) - repairIncorrectLessonIds()修復機能を無効化
 *                         理由: SessionManager導入後はバグ発生せず、正常データを誤統合するリスクを回避
 *   v2.0.1 (2025-11-14) - sessionStorage.clear()をviewLessonDetail()に追加
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
    console.log('📊 [Records] トレーニング記録ページ初期化開始 v2.1.0 (2025-11-14)');

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
        // 【修正v2.1.0】Bug #7修正: トレーニング履歴ページでは全件取得
        const sessions = DataManager.getSessionHistory(null, 1000); // 全モード、最大1000件（実質全件）
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

        // 評価分布を表示
        try {
            await displayEvaluationDistribution(sessions);
        } catch (error) {
            console.error('[Records] Error displaying evaluation distribution:', error);
        } finally {
            hideLoading('distribution');
        }

        // モード別統計を表示
        try {
            await displayModeStatistics(stats);
        } catch (error) {
            console.error('[Records] Error displaying mode statistics:', error);
        } finally {
            hideLoading('mode-stats');
        }

        // セッションリストを表示
        try {
            await displaySessionList(sessions);
        } catch (error) {
            console.error('[Records] Error displaying session list:', error);
        } finally {
            hideLoading('sessions');
        }

        // データあり時の表示制御（CSSクラス使用）
        const noDataMessage = document.getElementById('no-data-message');
        if (noDataMessage) {
            noDataMessage.classList.add('hidden');
        }

        const chartSection = document.getElementById('chart-section');
        if (chartSection) {
            chartSection.classList.remove('hidden');
        }

        const actionButtons = document.getElementById('action-buttons-section');
        if (actionButtons) {
            actionButtons.classList.remove('hidden');
        }

        // セッションコンテンツを確実に表示
        const sessionsContent = document.getElementById('sessions-content');
        if (sessionsContent) {
            sessionsContent.classList.remove('hidden');
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
    console.log(`[Records] hideLoading called for section: ${section}`);
    // LoadingComponentを使用して確実にローディングを非表示
    if (window.LoadingComponent) {
        window.LoadingComponent.toggle(section, false);
        console.log(`[Records] LoadingComponent.toggle(${section}, false) executed`);
    } else {
        console.error('[Records] LoadingComponent not found!');
    }
}

/**
 * すべてのローディング表示を非表示
 */
function hideAllLoading() {
    hideLoading('stats');
    hideLoading('distribution');
    hideLoading('mode-stats');
    hideLoading('sessions');
}

    /**
     * 統計を計算（モード+方向別）
     * @version 4.0.0 - モード+音階方向別統計計算
     */
function calculateStatistics(sessions) {
    // レッスン単位にグループ化
    const lessons = groupSessionsIntoLessons(sessions);

    console.log(`📊 [Statistics] 総セッション数: ${sessions.length}, グループ化後レッスン数: ${lessons.length}`);

    // モード+音階方向別に統計を計算
    const modeData = {};
    const modeNames = {
        'random': 'ランダム基音',
        'continuous': '連続チャレンジ',
        'chromatic': '12音階',
        '12tone': '12音階'
    };
    const scaleDirectionNames = {
        'ascending': '上行',
        'descending': '下行'
    };
    const chromaticDirectionNames = {
        'random': 'ランダム',
        'ascending': '上昇',
        'descending': '下降',
        'both': '両方向'
    };

    lessons.forEach(lesson => {
        const mode = lesson.mode;
        const scaleDirection = lesson.scaleDirection || 'ascending';
        const chromaticDirection = lesson.chromaticDirection || 'random';
        const key = `${mode}_${chromaticDirection}_${scaleDirection}`;  // 'random_random_ascending', '12tone_both_ascending', etc.

        console.log(`📊 [Statistics] レッスン処理: モード=${mode}, 音階方向=${scaleDirection}, セッション数=${lesson.sessions.length}`);

        if (!modeData[key]) {
            modeData[key] = {
                mode,
                chromaticDirection,
                scaleDirection,
                lessons: [],
                avgErrors: [],
                grades: []
            };
        }

        modeData[key].lessons.push(lesson);

        // レッスン全体の評価を計算
        try {
            const evaluation = window.EvaluationCalculator.calculateDynamicGrade(lesson.sessions);
            modeData[key].avgErrors.push(Math.abs(evaluation.metrics.adjusted.avgError));
            modeData[key].grades.push(evaluation.grade);
        } catch (error) {
            console.warn('[Records] モード別統計計算エラー:', error, lesson);
        }
    });

    // モード+方向別統計を作成
    const modeStats = Object.keys(modeData).map(key => {
        const data = modeData[key];
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

        const modeName = modeNames[data.mode] || data.mode;
        const scaleDirectionName = scaleDirectionNames[data.scaleDirection] || data.scaleDirection;
        const chromaticDirectionName = chromaticDirectionNames[data.chromaticDirection] || data.chromaticDirection;

        // 完全なモード名の生成（createLessonCardと同じロジック）
        let fullName;
        if (data.mode === '12tone' || data.mode === 'chromatic') {
            // 12音階モード: 「12音階（両方向・上行）」のように基音進行方向も表示
            fullName = `${modeName}（${chromaticDirectionName}・${scaleDirectionName}）`;
        } else {
            // ランダム基音・連続チャレンジ: 「ランダム基音（上行）」のように音階方向のみ
            fullName = `${modeName}（${scaleDirectionName}）`;
        }

        console.log(`📊 [Statistics] ${fullName}: レッスン数=${data.lessons.length}, 平均誤差=${avgAccuracy}, 最高グレード=${bestGrade}`);

        return {
            mode: data.mode,
            chromaticDirection: data.chromaticDirection,
            scaleDirection: data.scaleDirection,
            modeName: fullName,
            lessonCount: data.lessons.length,
            avgAccuracy,
            bestGrade
        };
    });

    console.log(`📊 [Statistics] モード+方向別統計: ${modeStats.length}種類`, modeStats);

    // === 追加統計データの計算 ===

    // 総レッスン数・総セッション数
    const totalLessons = lessons.length;
    const totalSessions = sessions.length;

    // 総トレーニング時間（秒 → 時間・分形式）
    const totalDurationSeconds = sessions.reduce((sum, session) => {
        return sum + (session.duration || 0);
    }, 0);
    const totalHours = Math.floor(totalDurationSeconds / 3600);
    const totalMinutes = Math.round((totalDurationSeconds % 3600) / 60);
    const totalDurationFormatted = totalHours > 0 
        ? `${totalHours}h${totalMinutes}m` 
        : `${totalMinutes}m`;

    // 全体の平均誤差（全レッスンの平均誤差を集計）
    const allAvgErrors = [];
    lessons.forEach(lesson => {
        try {
            const evaluation = window.EvaluationCalculator.calculateDynamicGrade(lesson.sessions);
            allAvgErrors.push(Math.abs(evaluation.metrics.adjusted.avgError));
        } catch (error) {
            // エラーは無視
        }
    });
    const overallAvgError = allAvgErrors.length > 0
        ? Math.round(allAvgErrors.reduce((a, b) => a + b, 0) / allAvgErrors.length)
        : 0;

    // トレーニング期間情報
    let firstTrainingDate = null;
    let lastTrainingDate = null;
    let trainingDays = 0;
    let daysSinceStart = 0;

    if (sessions.length > 0) {
        // 【修正v2.3.1】timestamp/startTime/completedAtの優先順で日付取得
        const sortedSessions = [...sessions].sort((a, b) => {
            const timeA = a.timestamp || a.startTime || a.completedAt || 0;
            const timeB = b.timestamp || b.startTime || b.completedAt || 0;
            return timeA - timeB;
        });
        
        const firstSessionTime = sortedSessions[0].timestamp || sortedSessions[0].startTime || sortedSessions[0].completedAt;
        const lastSessionTime = sortedSessions[sortedSessions.length - 1].timestamp || 
                                sortedSessions[sortedSessions.length - 1].startTime || 
                                sortedSessions[sortedSessions.length - 1].completedAt;
        
        firstTrainingDate = new Date(firstSessionTime);
        lastTrainingDate = new Date(lastSessionTime);

        // ユニークな日付の数（実際にトレーニングした日数）
        const uniqueDates = new Set(
            sessions.map(session => {
                const sessionTime = session.timestamp || session.startTime || session.completedAt;
                const date = new Date(sessionTime);
                return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
            })
        );
        trainingDays = uniqueDates.size;

        // 開始からの経過日数
        const today = new Date();
        daysSinceStart = Math.floor((today - firstTrainingDate) / (1000 * 60 * 60 * 24));

        console.log(`📊 [Statistics] 期間情報: 開始=${firstTrainingDate.toLocaleDateString()}, 最新=${lastTrainingDate.toLocaleDateString()}, 経過日数=${daysSinceStart}, 実トレーニング日数=${trainingDays}`);
    }

    // 連続記録日数を計算
    const streak = calculateStreak(sessions);

    return {
        modeStats,
        streak,
        totalLessons,
        totalSessions,
        totalDurationFormatted,
        overallAvgError,
        firstTrainingDate,
        lastTrainingDate,
        trainingDays,
        daysSinceStart
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
 * グレード別色クラスを取得（UIカタログ準拠）
 * @param {string} grade - グレード（S/A/B/C/D/E/-）
 * @returns {string} 色クラス
 */
function getGradeColor(grade) {
    const gradeColors = {
        'S': 'text-yellow-300',  // 金色（プロレベル）
        'A': 'text-gray-300',    // 銀色（楽器アンサンブル）
        'B': 'text-orange-300',  // 銅色（合唱・弾き語り）
        'C': 'text-green-300',   // 緑色（カラオケ・趣味）
        'D': 'text-blue-300',    // 青色（練習中）
        'E': 'text-red-300',     // 赤色（基礎から）
        '-': 'text-white-60'
    };
    return gradeColors[grade] || 'text-white-60';
}

/**
 * グレードに対応するLucideアイコン名を返す（UIカタログ準拠）
 * @param {string} grade - グレード文字列 (S, A, B, C, D, E, -)
 * @returns {string} Lucideアイコン名
 */
function getGradeIcon(grade) {
    const gradeIcons = {
        'S': 'crown',           // 王冠（プロレベル）
        'A': 'medal',           // メダル（楽器アンサンブル）
        'B': 'award',           // トロフィー（合唱・弾き語り）
        'C': 'smile',           // 笑顔（カラオケ・趣味）
        'D': 'meh',             // 普通顔（練習中）
        'E': 'frown',           // 困り顔（基礎から）
        '-': 'minus'
    };
    return gradeIcons[grade] || 'minus';
}

    /**
     * 統計を表示
     */
async function displayStatistics(stats) {
    // 総トレーニング日数
    document.getElementById('training-days-number').textContent = `${stats.trainingDays}日`;

    // 開始日 (経過日数を含む)
    let startInfo = '-';
    if (stats.firstTrainingDate) {
        const firstDate = stats.firstTrainingDate instanceof Date
            ? stats.firstTrainingDate
            : new Date(stats.firstTrainingDate);

        if (!isNaN(firstDate.getTime())) {
            // 「2025/11/10 (5日経過)」形式
            const dateStr = `${firstDate.getFullYear()}/${firstDate.getMonth() + 1}/${firstDate.getDate()}`;
            startInfo = `${dateStr} (${stats.daysSinceStart}日経過)`;
        }
    }
    document.getElementById('training-start-info').textContent = startInfo;

    // 継続トレーニング日数
    document.getElementById('streak-days').textContent = `${stats.streak}日`;

    // 4つの数値カード
    document.getElementById('lessons-count').textContent = stats.totalLessons;
    document.getElementById('sessions-count').textContent = stats.totalSessions;
    document.getElementById('total-duration').textContent = stats.totalDurationFormatted;
    
    // 総平均誤差（ランクアイコン + 色付き）
    // 平均誤差からランクを判定
    let grade = '-';
    if (stats.overallAvgError <= 15) grade = 'S';
    else if (stats.overallAvgError <= 25) grade = 'A';
    else if (stats.overallAvgError <= 40) grade = 'B';
    else if (stats.overallAvgError <= 60) grade = 'C';
    else if (stats.overallAvgError <= 90) grade = 'D';
    else grade = 'E';

    const gradeIcon = getGradeIcon(grade);
    const gradeColor = getGradeColor(grade);

    // アイコンを更新
    const iconEl = document.getElementById('average-error-icon');
    if (iconEl) {
        iconEl.setAttribute('data-lucide', gradeIcon);
        iconEl.className = gradeColor;
        iconEl.style.width = '20px';
        iconEl.style.height = '20px';
    }

    // 値を更新（色も適用）
    const valueEl = document.getElementById('average-error-value');
    if (valueEl) {
        valueEl.textContent = `±${stats.overallAvgError}¢`;
        valueEl.className = gradeColor;
    }

    console.log(`📊 [Display] 上段: ${stats.trainingDays}日, ${startInfo}, 連続${stats.streak}日`);
    console.log(`📊 [Display] 数値カード: レッスン=${stats.totalLessons}, セッション=${stats.totalSessions}, 総時間=${stats.totalDurationFormatted}, 平均誤差=±${stats.overallAvgError}¢ (${grade})`);

    // Lucideアイコン再初期化（統合初期化関数を使用）
    if (typeof window.initializeLucideIcons === 'function') {
        window.initializeLucideIcons({ immediate: true });
    }

    // レンダリング完了まで待機
    await new Promise(resolve => setTimeout(resolve, 0));
}

/**
 * モード別統計を表示
 * @param {Object} stats - 統計データ
 */
async function displayModeStatistics(stats) {
    console.log('[Records] Displaying mode statistics...');
    console.log('[Records] stats.modeStats:', stats.modeStats);

    try {
        // モード別統計を表示（テーブル + モバイルカード）
        const container = document.getElementById('mode-statistics');
        if (!container) {
            console.error('[Records] mode-statistics container not found!');
            return;
        }
        console.log('[Records] mode-statistics container found');
        
        container.innerHTML = '';

        // デスクトップ版テーブル（グレードアイコン追加）
        const tableHTML = `
        <table class="mode-stats-table">
            <thead>
                <tr>
                    <th>モード</th>
                    <th>レッスン数</th>
                    <th>平均誤差</th>
                    <th>最高</th>
                </tr>
            </thead>
            <tbody>
                ${stats.modeStats.map(mode => `
                    <tr>
                        <td>${mode.modeName}</td>
                        <td>${mode.lessonCount}</td>
                        <td>±${mode.avgAccuracy}¢</td>
                        <td>
                            <div class="grade-cell">
                                <i data-lucide="${getGradeIcon(mode.bestGrade)}" class="${getGradeColor(mode.bestGrade)}" style="width: 16px; height: 16px;"></i>
                                <span class="${getGradeColor(mode.bestGrade)}">${mode.bestGrade}</span>
                            </div>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;

        // モバイル版カード（1カード内に全モード、横線区切り）
        const mobileHTML = `
        <div class="mode-stats-mobile">
            ${stats.modeStats.map((mode, index) => `
                ${index > 0 ? '<hr class="mode-divider" />' : ''}
                <div class="mode-stat-item">
                    <div class="mode-name">${mode.modeName}</div>
                    <div class="mode-stats-row">
                        <span>${mode.lessonCount}回</span>
                        <span>±${mode.avgAccuracy}¢</span>
                        <span class="${getGradeColor(mode.bestGrade)}">
                            <i data-lucide="${getGradeIcon(mode.bestGrade)}" style="width: 14px; height: 14px;"></i>
                            ${mode.bestGrade}
                        </span>
                    </div>
                </div>
            `).join('')}
        </div>
    `;

        container.innerHTML = tableHTML + mobileHTML;
        console.log('[Records] Mode statistics HTML rendered');

        // Lucideアイコン再初期化（統合初期化関数を使用）
        if (typeof window.initializeLucideIcons === 'function') {
            window.initializeLucideIcons({ immediate: true });
        }

        // レンダリング完了まで待機
        await new Promise(resolve => setTimeout(resolve, 0));
        console.log('[Records] displayModeStatistics completed');
    } catch (error) {
        console.error('[Records] Error in displayModeStatistics:', error);
        throw error;
    }
}

/**
 * 評価分布を表示（DistributionChart統合）
 * @param {Array} sessions - セッションデータ配列
 */
async function displayEvaluationDistribution(sessions) {
    console.log('[Records] Displaying evaluation distribution...');

    // ヘルプボタンをヘッダーに挿入
    const helpButtonContainer = document.getElementById('distribution-help-button');
    if (helpButtonContainer && window.DistributionChart) {
        helpButtonContainer.innerHTML = window.DistributionChart.getHelpButton('distribution-chart-container');
    }

    // DistributionChartをレンダリング
    if (window.DistributionChart) {
        window.DistributionChart.render({
            containerId: 'distribution-chart-container',
            sessionData: sessions,
            showTrend: true,
            trendPeriod: 'week',
            animate: true,
            showDescription: true,
            showHelpButton: true
        });
    } else {
        console.error('[Records] DistributionChart component not loaded');
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

    // 全カード追加後にLucideアイコンを一括初期化
    if (typeof window.initializeLucideIcons === 'function') {
        window.initializeLucideIcons({ immediate: true });
    }
}

/**
 * 誤ったlessonIdを持つセッションを検出・修復
 * （startTraining()が毎回lessonIdを生成していたバグで作成されたデータ対応）
 *
 * 【v2.1.0】修復機能を無効化
 * 理由:
 *   1. SessionManager導入後はlessonIdバグは発生しない（trainingController.js 252行目で初回のみ生成）
 *   2. 全データにlessonIdが存在する（migrateOldSessions()で旧データも変換済み）
 *   3. 修復関数が正常データを誤判定（独立した複数レッスンを1つに統合してしまう）
 *   4. 将来の仕様変更時にも誤動作のリスクがある
 *
 * @param {Array} sessions - セッション配列
 * @returns {Array} 修復済みセッション配列
 */
window.repairIncorrectLessonIds = function repairIncorrectLessonIds(sessions) {
    console.log('ℹ️ [Repair] lessonId修復機能は無効化されています（SessionManager導入済み）');
    console.log('   理由: 正常なデータを誤って統合するリスクを回避');

    // 修復せずにそのまま返す
    return sessions;

    /* ===== 以下、無効化されたコード（参照用に保持） =====

    console.log('🔍 [Repair] lessonId修復チェック開始');

    // sessionIdでソート（連続セッションを検出するため）
    sessions.sort((a, b) => a.sessionId - b.sessionId);

    let repairCount = 0;
    let currentGroup = [];

    for (let i = 0; i < sessions.length; i++) {
        const session = sessions[i];

        // lessonIdがない場合はスキップ（migrateOldSessionsで処理）
        if (!session.lessonId) {
            continue;
        }

        currentGroup.push(session);

        // 次のセッションを確認
        const nextSession = sessions[i + 1];
        const isLastSession = !nextSession;
        const isDifferentLesson = nextSession && (
            nextSession.mode !== session.mode ||
            nextSession.chromaticDirection !== session.chromaticDirection ||
            nextSession.scaleDirection !== session.scaleDirection
        );

        // グループ終了条件：最後のセッション or 次が異なるレッスン
        if (isLastSession || isDifferentLesson) {
            // モード別の期待セッション数
            let expectedSessions = 8;
            if (session.mode === 'continuous') expectedSessions = 12;
            if (session.mode === 'chromatic' || session.mode === '12tone') {
                expectedSessions = (session.chromaticDirection === 'both') ? 24 : 12;
            }

            // グループ内のlessonIdがすべて異なる場合 = 修復が必要
            const uniqueLessonIds = new Set(currentGroup.map(s => s.lessonId));
            const needsRepair = currentGroup.length === expectedSessions && uniqueLessonIds.size === expectedSessions;

            if (needsRepair) {
                // 最も古いタイムスタンプのlessonIdを基準とする
                const oldestLessonId = currentGroup
                    .map(s => s.lessonId)
                    .sort()[0]; // 辞書順でソート（タイムスタンプ部分で比較）

                console.log(`🔧 [Repair] ${session.mode}モードのセッション${currentGroup[0].sessionId}-${currentGroup[currentGroup.length - 1].sessionId}を修復`);
                console.log(`   修復前: ${uniqueLessonIds.size}個の異なるlessonId`);
                console.log(`   修復後: ${oldestLessonId}に統一`);

                // すべてのセッションに同じlessonIdを割り当て
                currentGroup.forEach(s => {
                    s.lessonId = oldestLessonId;
                });

                repairCount += currentGroup.length - 1; // 1つは元々正しいのでカウントから除外
            }

            // グループリセット
            currentGroup = [];
        }
    }

    if (repairCount > 0) {
        console.log(`✅ [Repair] ${repairCount}個のセッションのlessonIdを修復完了`);

        // 修復したデータをlocalStorageに保存（DataManagerのキーに合わせる）
        // 【v2.0.0】SessionDataManagerを使用して統一管理
        if (window.SessionDataManager) {
            if (window.SessionDataManager.saveAllSessions(sessions)) {
                console.log('💾 [Repair] 修復済みデータをlocalStorageに保存完了');
            } else {
                console.error('❌ [Repair] localStorage保存エラー');
            }
        } else {
            console.error('❌ SessionDataManagerが見つかりません');
        }
    } else {
        console.log('✅ [Repair] 修復が必要なセッションはありませんでした');
    }

    return sessions;

    ===== 無効化されたコード終了 ===== */
}

/**
 * 既存データのマイグレーション処理（後方互換性）
 * @param {Array} sessions - セッション配列
 * @returns {Array} マイグレーション済みセッション配列
 */
function migrateOldSessions(sessions) {
    let legacyLessonCounter = {};  // モード別のレガシーレッスンカウンター

    return sessions.map(session => {
        // 既にlessonIdがある場合はそのまま
        if (session.lessonId) {
            return session;
        }

        // lessonIdがない = 旧データ
        console.log(`🔄 [Migration] セッション${session.sessionId}をマイグレーション`);

        // 後方互換性: direction → chromaticDirection
        if (!session.chromaticDirection) {
            session.chromaticDirection = session.direction || 'random';
        }

        // 後方互換性: scaleDirection追加
        if (!session.scaleDirection) {
            session.scaleDirection = 'ascending';  // デフォルト値
        }

        // レガシーlessonID生成（モード別カウンター使用）
        const mode = session.mode || 'random';
        if (!legacyLessonCounter[mode]) {
            legacyLessonCounter[mode] = 1;
        }

        // モード別セッション数で判定
        let sessionsPerLesson = 8;
        if (mode === 'continuous') sessionsPerLesson = 12;
        if (mode === 'chromatic' || mode === '12tone') {
            // 【修正v2.1.0】Bug #10修正: directionプロパティはchromaticDirectionが正しい
            sessionsPerLesson = (session.chromaticDirection === 'both') ? 24 : 12;
        }

        // 8個ごと（or 12個/24個ごと）に同じlessonIDを割り当て
        const lessonNum = Math.floor((session.sessionId - 1) / sessionsPerLesson) + 1;
        session.lessonId = `legacy_lesson_${mode}_${session.chromaticDirection}_${session.scaleDirection}_${lessonNum}`;

        console.log(`   → lessonId: ${session.lessonId}`);

        return session;
    });
}

/**
 * セッションをレッスン単位にグループ化（lessonId方式）
 * @param {Array} sessions - 全セッション
 * @returns {Array} レッスン配列
 */
function groupSessionsIntoLessons(sessions) {
    console.log('🔍 [Grouping] レッスングループ化開始（lessonId方式）');
    console.log(`🔍 [Grouping] 総セッション数: ${sessions.length}`);

    // 誤ったlessonIdの修復（startTraining()バグで生成されたデータ対応）
    const repairedSessions = repairIncorrectLessonIds(sessions);

    // 旧データのマイグレーション
    const migratedSessions = migrateOldSessions(repairedSessions);

    // lessonIdでグループ化
    const lessonMap = {};

    migratedSessions.forEach(session => {
        const lessonId = session.lessonId;

        if (!lessonId) {
            console.warn(`⚠️ [Grouping] セッション${session.sessionId}にlessonIdがありません（スキップ）`);
            return;
        }

        if (!lessonMap[lessonId]) {
            lessonMap[lessonId] = {
                lessonId: lessonId,
                mode: session.mode || 'random',
                chromaticDirection: session.chromaticDirection || 'random',
                scaleDirection: session.scaleDirection || 'ascending',
                sessions: [],
                startTime: session.startTime,
                endTime: session.startTime
            };
        }

        lessonMap[lessonId].sessions.push(session);

        // 開始・終了時刻を更新
        if (session.startTime < lessonMap[lessonId].startTime) {
            lessonMap[lessonId].startTime = session.startTime;
        }
        if ((session.endTime || session.startTime) > lessonMap[lessonId].endTime) {
            lessonMap[lessonId].endTime = session.endTime || session.startTime;
        }
    });

    // レッスン配列に変換
    const lessons = Object.values(lessonMap);

    console.log(`✅ [Grouping] グループ化完了: ${lessons.length}レッスン`);

    // デバッグ: レッスン情報表示
    lessons.forEach(lesson => {
        console.log(`   - ${lesson.mode}（${lesson.scaleDirection}）: ${lesson.sessions.length}セッション [${lesson.lessonId}]`);
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

    // 音階方向を日本語に変換
    const scaleDirectionNames = {
        'ascending': '上行',
        'descending': '下行'
    };
    const scaleDirectionName = scaleDirectionNames[lesson.scaleDirection] || lesson.scaleDirection || '上行';

    // 基音進行方向を日本語に変換
    const chromaticDirectionNames = {
        'random': 'ランダム',
        'ascending': '上昇',
        'descending': '下降',
        'both': '両方向'
    };
    const chromaticDirectionName = chromaticDirectionNames[lesson.chromaticDirection] || lesson.chromaticDirection || 'ランダム';

    // 完全なモード名の生成
    let fullModeName;
    if (lesson.mode === '12tone' || lesson.mode === 'chromatic') {
        // 12音階モード: 「12音階（両方向・上行）」のように基音進行方向も表示
        fullModeName = `${modeName}（${chromaticDirectionName}・${scaleDirectionName}）`;
    } else {
        // ランダム基音・連続チャレンジ: 「ランダム基音（上行）」のように音階方向のみ
        fullModeName = `${modeName}（${scaleDirectionName}）`;
    }

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
                    <div class="text-white font-medium">${fullModeName}</div>
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

    return card;
}

/**
 * レッスン詳細を表示
 * @param {Object} lesson - レッスンデータ
 */
function viewLessonDetail(lesson) {
    console.log('🔍 [viewLessonDetail] レッスンデータ:', lesson);
    console.log('🔍 [viewLessonDetail] lessonId:', lesson.lessonId);
    console.log('🔍 [viewLessonDetail] sessions数:', lesson.sessions?.length);
    console.log('🔍 [viewLessonDetail] セッションのlessonId:', lesson.sessions?.map(s => s.lessonId));

    // sessionStorageをクリア（古いlessonIdが残らないように）
    sessionStorage.clear();
    console.log('🗑️ [viewLessonDetail] sessionStorageをクリアしました');

    // 総合評価ページへ遷移（モード + 音階方向 + lessonId + トレーニング記録からの遷移フラグ付き）
    window.NavigationManager.navigate('results-overview', {
        mode: lesson.mode,
        scaleDirection: lesson.scaleDirection || 'ascending',
        lessonId: lesson.lessonId,
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

    const labels = chartSessions.map((_s, idx) => `${idx + 1}`);

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

    // セッションコンテンツを非表示、データなしメッセージを表示（CSSクラス使用）
    const sessionsContent = document.getElementById('sessions-content');
    if (sessionsContent) {
        sessionsContent.classList.add('hidden');
    }

    const noDataMessage = document.getElementById('no-data-message');
    if (noDataMessage) {
        noDataMessage.classList.remove('hidden');
    }

    const recordsCount = document.getElementById('records-count');
    if (recordsCount) {
        recordsCount.textContent = '0件';
    }

    // グラフセクションを非表示
    const chartSection = document.getElementById('chart-section');
    if (chartSection) {
        chartSection.classList.add('hidden');
    }

    // アクションボタンセクションを表示（データなし時も「新しいトレーニングを開始」ボタンを表示）
    const actionButtons = document.getElementById('action-buttons-section');
    if (actionButtons) {
        actionButtons.classList.remove('hidden');
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
