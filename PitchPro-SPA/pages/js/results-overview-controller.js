console.log('🚀 [results-overview-controller] Script loaded - START');

/**
 * results-overview-controller.js
 * 総合評価ページコントローラー
 * Version: 1.0.0
 *
 * 【責任範囲】
 * - セッションデータの読み込みとフィルタリング
 * - 総合評価UIの更新（グレード・統計情報・評価分布）
 * - セッショングリッド表示
 * - セッション詳細分析の表示・ナビゲーション
 * - Chart.js誤差推移グラフの初期化
 * - シェア機能（X・LINE・Facebook・リンクコピー）
 *
 * 【依存関係】
 * - DataManager: セッションデータ取得
 * - EvaluationCalculator: 評価計算（v2.1.0統合評価関数）
 * - Chart.js: 誤差推移グラフ描画
 * - window.initializeLucideIcons: アイコン初期化
 */

// デバッグモード設定（false = 詳細ログ無効化）
const DEBUG_MODE = false;

/**
 * 総合評価ページの初期化（即座にグローバル定義）
 */
window.initResultsOverview = async function() {
    console.log('📊 総合評価ページ初期化開始');

    // DataManagerから全セッションデータを取得
    const allSessionData = loadAllSessionData();

    if (!allSessionData || allSessionData.length === 0) {
        console.warn('⚠️ セッションデータが見つかりません。ダミーデータを表示します。');
        showDummyOverview();
        return;
    }

    // URLパラメータからモードを取得
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash.split('?')[1] || '');
    const currentMode = params.get('mode') || 'random';
    if (DEBUG_MODE) {
        console.log(`🔍 [DEBUG] 現在のモード: ${currentMode}`);
        console.log(`🔍 [DEBUG] URL hash: ${window.location.hash}`);
    }

    // 全セッションのモード分布を表示（デバッグ）
    if (DEBUG_MODE) {
        const modeDistribution = {};
        allSessionData.forEach(s => {
            modeDistribution[s.mode] = (modeDistribution[s.mode] || 0) + 1;
        });
        console.log('📊 [DEBUG] モード別セッション数:', modeDistribution);
    }

    // 現在のモードのセッションのみフィルタリング
    const sessionData = allSessionData.filter(s => s.mode === currentMode);
    console.log(`✅ セッションデータ取得: ${currentMode}モード=${sessionData.length}セッション (全体=${allSessionData.length}セッション)`);

    // フィルタリング済みセッションデータをグローバル変数に保存
    // showSessionDetail関数で参照するため
    window.filteredSessionData = sessionData;
    window.currentMode = currentMode;

    // フィルタリング後のセッションIDリストを表示（デバッグ）
    if (DEBUG_MODE && sessionData.length > 0) {
        const sessionIds = sessionData.map(s => `#${s.sessionId}(${s.mode})`).join(', ');
        console.log(`🔍 [DEBUG] フィルタリング済みセッション: ${sessionIds}`);
    }

    if (sessionData.length === 0) {
        console.warn(`⚠️ ${currentMode}モードのセッションデータが見つかりません。`);
        showDummyOverview();
        return;
    }

    // 動的グレード計算
    const evaluation = window.EvaluationCalculator.calculateDynamicGrade(sessionData);
    console.log('✅ 評価結果:', evaluation);

    // UI更新
    updateOverviewUI(evaluation, sessionData);

    // Chart.js初期化
    if (typeof Chart !== 'undefined') {
        initializeCharts(sessionData);
    }

    // Lucideアイコン再初期化（統合初期化関数を使用）
    if (typeof window.initializeLucideIcons === 'function') {
        window.initializeLucideIcons({ immediate: true });
    }

    // ナビゲーションボタンのイベントリスナーを追加
    const prevBtn = document.getElementById('prev-session-btn');
    const nextBtn = document.getElementById('next-session-btn');

    if (prevBtn) {
        prevBtn.addEventListener('click', window.navigateToPrevSession);
    }

    if (nextBtn) {
        nextBtn.addEventListener('click', window.navigateToNextSession);
    }

    // 初回表示時は最新（最後）のセッションを表示
    if (sessionData && sessionData.length > 0) {
        const latestIndex = sessionData.length - 1;
        if (DEBUG_MODE) {
            console.log(`🔍 [DEBUG] 初回表示: インデックス ${latestIndex} (最新セッション)`);
        }
        window.showSessionDetail(latestIndex);
    }

    // ヘルプボタンのイベントリスナーを設定（SPAのinnerHTML挿入後に実行）
    console.log('🔧 [initResultsOverview] Setting up help button event listeners');
    const helpButtons = document.querySelectorAll('.help-icon-btn');
    console.log('🔧 [initResultsOverview] Found help buttons:', helpButtons.length);

    helpButtons.forEach((btn, index) => {
        // 既存のリスナーを削除してから追加（重複防止）
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);

        // ボタンの位置で判別（最初のボタンは総合グレード用）
        if (index === 0) {
            newBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('🔵 Grade help button clicked');
                toggleGradePopover();
            });
            console.log('✅ Grade help button listener added');
        } else {
            newBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('🟢 Session rank help button clicked');
                toggleSessionRankPopover();
            });
            console.log('✅ Session rank help button listener added');
        }
    });
}

/**
 * 全セッションデータを読み込み
 */
function loadAllSessionData() {
    try {
        const data = DataManager.getFromStorage('sessionData') || [];
        console.log('📊 読み込んだセッションデータ:', data);
        return data;
    } catch (error) {
        console.error('❌ セッションデータ読み込みエラー:', error);
        return [];
    }
}

/**
 * 総合評価UIを更新
 */
function updateOverviewUI(evaluation, sessionData) {
    console.log('🎨 UI更新開始:', evaluation);

    // モード名更新
    const modeTitleEl = document.getElementById('main-mode-title');
    if (modeTitleEl) {
        modeTitleEl.textContent = evaluation.modeInfo.name;
    }

    // サブタイトル更新
    const subtitleEl = document.querySelector('.page-subtitle');
    if (subtitleEl) {
        const totalNotes = evaluation.metrics.raw.totalNotes;
        subtitleEl.textContent = `${sessionData.length}セッション (${totalNotes}音) の総合評価`;
    }

    // グレードアイコン更新
    updateGradeIcon(evaluation.grade);

    // 統計情報更新
    updateStatistics(evaluation, sessionData);

    // 達成メッセージ更新
    const messageEl = document.getElementById('share-message');
    if (messageEl) {
        let message = evaluation.displayInfo.achievements;

        // グレード未達成の場合、詳細情報を追加
        if (!evaluation.gradeResult.achievedBy.avgError || !evaluation.gradeResult.achievedBy.excellence) {
            const grade = evaluation.grade;
            const threshold = evaluation.gradeResult.thresholds;
            const actual = evaluation.metrics.adjusted;

            message = `${grade}級基準未達成\n`;

            // 平均誤差の達成状況
            if (!evaluation.gradeResult.achievedBy.avgError) {
                const diff = (actual.avgError - threshold.avgError).toFixed(1);
                message += `平均誤差: ${actual.avgError.toFixed(1)}¢（目標${threshold.avgError}¢以下、あと${diff}¢改善必要）\n`;
            } else {
                message += `平均誤差: ${actual.avgError.toFixed(1)}¢（目標${threshold.avgError}¢以下 ✓）\n`;
            }

            // 優秀率の達成状況
            if (!evaluation.gradeResult.achievedBy.excellence) {
                const diff = ((threshold.excellence - actual.excellenceRate) * 100).toFixed(1);
                message += `優秀率: ${(actual.excellenceRate * 100).toFixed(1)}%（目標${(threshold.excellence * 100).toFixed(0)}%以上、あと${diff}%改善必要）`;
            } else {
                message += `優秀率: ${(actual.excellenceRate * 100).toFixed(1)}%（目標${(threshold.excellence * 100).toFixed(0)}%以上 ✓）`;
            }
        }

        messageEl.textContent = message;
    }

    // 評価分布表示
    displayOverallDistribution(sessionData);

    // セッショングリッド表示
    displaySessionGrid(sessionData);
}

/**
 * グレードアイコンを更新
 */
function updateGradeIcon(grade) {
    const iconContainer = document.querySelector('.rank-icon .rank-circle');
    if (!iconContainer) return;

    // グレード別アイコン・色設定
    const gradeConfig = {
        'S': { icon: 'crown', class: 'rank-circle-s', color: 'gold' },
        'A': { icon: 'medal', class: 'rank-circle-a', color: 'silver' },
        'B': { icon: 'award', class: 'rank-circle-b', color: 'orange' },
        'C': { icon: 'smile', class: 'rank-circle-c', color: 'green' },
        'D': { icon: 'meh', class: 'rank-circle-d', color: 'blue' },
        'E': { icon: 'frown', class: 'rank-circle-e', color: 'red' }
    };

    const config = gradeConfig[grade] || gradeConfig['B'];

    // クラスをリセット
    iconContainer.className = `rank-circle rank-md ${config.class}`;

    // アイコン更新
    iconContainer.innerHTML = `
        <i data-lucide="${config.icon}" class="text-white rank-circle-icon"></i>
        <button class="help-icon-btn text-white">
            <i data-lucide="help-circle" class="icon-help"></i>
        </button>
    `;
}

/**
 * 統計情報を更新
 */
function updateStatistics(evaluation, sessionData) {
    // グレード
    const gradeEl = document.getElementById('dynamic-grade');
    if (gradeEl) {
        gradeEl.textContent = evaluation.grade;
    }

    // 平均誤差
    const avgErrorEl = document.querySelector('.avg-error');
    if (avgErrorEl) {
        const avgError = evaluation.metrics.adjusted.avgError;
        avgErrorEl.textContent = `±${avgError.toFixed(1)}¢`;
    }

    // 優秀率
    const excellenceRateEl = document.getElementById('excellence-rate');
    if (excellenceRateEl) {
        const excellenceRate = evaluation.metrics.adjusted.excellenceRate;
        excellenceRateEl.textContent = `${(excellenceRate * 100).toFixed(1)}%`;
    }

    // 最大誤差計算
    let maxError = 0;
    sessionData.forEach(session => {
        if (session.pitchErrors) {
            session.pitchErrors.forEach(error => {
                const absError = Math.abs(error.errorInCents);
                if (absError > maxError) {
                    maxError = absError;
                }
            });
        }
    });

    const maxErrorEl = document.querySelector('.max-error');
    if (maxErrorEl) {
        maxErrorEl.textContent = `±${maxError.toFixed(1)}¢`;
    }

    // セッション数
    const sessionCountEl = document.querySelector('.session-count');
    if (sessionCountEl) {
        sessionCountEl.textContent = sessionData.length;
    }
}

/**
 * 総合評価分布を表示
 */
function displayOverallDistribution(sessionData) {
    const distribution = {
        excellent: 0,
        good: 0,
        pass: 0,
        practice: 0
    };

    let total = 0;

    sessionData.forEach(session => {
        if (!session.pitchErrors) return;

        session.pitchErrors.forEach(error => {
            const absError = Math.abs(error.errorInCents);
            total++;

            // v2.1.0: EvaluationCalculator統合評価関数を使用
            const evaluation = window.EvaluationCalculator.evaluatePitchError(absError);
            distribution[evaluation.level]++;
        });
    });

    const container = document.querySelector('.glass-card .flex.flex-col.gap-3');
    if (!container) return;

    container.innerHTML = `
        <!-- Excellent -->
        <div class="flex items-center gap-3">
            <i data-lucide="trophy" class="text-yellow-300" style="width: 20px; height: 20px; flex-shrink: 0;"></i>
            <div class="progress-bar flex">
                <div class="progress-fill-custom color-eval-gold" style="width: ${(distribution.excellent / total * 100).toFixed(1)}%;"></div>
            </div>
            <span class="text-sm text-white-60" style="min-width: 20px; text-align: right;">${distribution.excellent}</span>
        </div>

        <!-- Good -->
        <div class="flex items-center gap-3">
            <i data-lucide="star" class="text-green-300" style="width: 20px; height: 20px; flex-shrink: 0;"></i>
            <div class="progress-bar flex">
                <div class="progress-fill-custom color-eval-good" style="width: ${(distribution.good / total * 100).toFixed(1)}%;"></div>
            </div>
            <span class="text-sm text-white-60" style="min-width: 20px; text-align: right;">${distribution.good}</span>
        </div>

        <!-- Pass -->
        <div class="flex items-center gap-3">
            <i data-lucide="thumbs-up" class="text-blue-300" style="width: 20px; height: 20px; flex-shrink: 0;"></i>
            <div class="progress-bar flex">
                <div class="progress-fill-custom color-eval-pass" style="width: ${(distribution.pass / total * 100).toFixed(1)}%;"></div>
            </div>
            <span class="text-sm text-white-60" style="min-width: 20px; text-align: right;">${distribution.pass}</span>
        </div>

        <!-- Practice -->
        <div class="flex items-center gap-3">
            <i data-lucide="alert-triangle" class="text-red-300" style="width: 20px; height: 20px; flex-shrink: 0;"></i>
            <div class="progress-bar flex">
                <div class="progress-fill-custom color-eval-practice" style="width: ${(distribution.practice / total * 100).toFixed(1)}%;"></div>
            </div>
            <span class="text-sm text-white-60" style="min-width: 20px; text-align: right;">${distribution.practice}</span>
        </div>
    `;

    // Lucideアイコン再初期化（統合初期化関数を使用）
    if (typeof window.initializeLucideIcons === 'function') {
        window.initializeLucideIcons({ immediate: true });
    }
}

/**
 * セッショングリッドを表示（UIカタログパターン準拠）
 */
function displaySessionGrid(sessionData) {
    const container = document.getElementById('session-grid-container');
    if (!container) return;

    // セッション数に応じたグリッドクラスを決定
    const sessionCount = sessionData.length;
    let gridClass = 'sessions-grid-8';
    if (sessionCount === 12) gridClass = 'sessions-grid-12';
    else if (sessionCount === 24) gridClass = 'sessions-grid-24';

    const sessionBoxes = sessionData.map((session, index) => {
        // 【追加】外れ値を除外した平均誤差を計算（固定閾値180¢）
        const errors = session.pitchErrors
            ? session.pitchErrors.map(e => Math.abs(e.errorInCents))
            : [];

        const outlierThreshold = 180; // 全デバイス共通の固定閾値

        const validErrors = errors.filter(e => e <= outlierThreshold);
        const outlierCount = errors.length - validErrors.length;

        const avgError = validErrors.length > 0
            ? validErrors.reduce((sum, e) => sum + e, 0) / validErrors.length
            : errors.reduce((sum, e) => sum + e, 0) / errors.length;

        // 統合評価関数を使用（v2.1.0: EvaluationCalculator統合）
        const evaluation = window.EvaluationCalculator.evaluateAverageError(avgError);
        const badgeClass = `session-${evaluation.level}`;

        return `
            <div class="session-box ${badgeClass}"
                 data-session-index="${index}"
                 data-outlier-count="${outlierCount}"
                 onclick="window.showSessionDetail(${index})">
                <div class="session-number">${index + 1}</div>
                <div class="session-icon">
                    <i data-lucide="${evaluation.icon}" class="${evaluation.color}"></i>
                </div>
            </div>
        `;
    }).join('');

    container.innerHTML = `
        <div class="${gridClass}">
            ${sessionBoxes}
        </div>
    `;

    // Lucideアイコンを初期化
    if (typeof window.initializeLucideIcons === 'function') {
        window.initializeLucideIcons({ immediate: true });
    }
}

/**
 * セッション詳細を表示（UIカタログパターン準拠）
 */
// グローバル変数として定義（SPA再実行時の重複エラー回避）
if (typeof window.currentSessionIndex === 'undefined') {
    window.currentSessionIndex = 0;
}

window.showSessionDetail = function(sessionIndex) {
    // フィルタリング済みセッションデータを使用（グローバル変数から取得）
    const sessionData = window.filteredSessionData || [];

    if (DEBUG_MODE) {
        console.log('📊 [showSessionDetail] 取得したセッションデータ:', sessionData);
        console.log('📊 [showSessionDetail] セッション数:', sessionData.length);
        console.log('📊 [showSessionDetail] 要求されたインデックス:', sessionIndex);
        console.log('📊 [showSessionDetail] 現在のモード:', window.currentMode);
    }

    if (!sessionData || sessionData.length === 0) {
        console.warn('⚠️ トレーニング履歴が見つかりません');
        return;
    }

    if (!sessionData[sessionIndex]) {
        console.warn(`⚠️ セッション${sessionIndex + 1}のデータが見つかりません`);
        return;
    }

    window.currentSessionIndex = sessionIndex;
    const session = sessionData[sessionIndex];

    if (DEBUG_MODE) {
        console.log('📊 [showSessionDetail] 選択されたセッション:', session);
        console.log('🔍 [DEBUG] セッションモード:', session.mode);
    }

    // 1. .selectedクラスを更新
    document.querySelectorAll('.session-box').forEach((box, idx) => {
        if (idx === sessionIndex) {
            box.classList.add('selected');
        } else {
            box.classList.remove('selected');
        }
    });

    // 2. 【追加】外れ値を除外した平均誤差を計算（固定閾値180¢）
    const errors = session.pitchErrors
        ? session.pitchErrors.map(e => Math.abs(e.errorInCents))
        : [];

    const outlierThreshold = 180; // 全デバイス共通の固定閾値

    const validErrors = errors.filter(e => e <= outlierThreshold);
    const outlierCount = errors.length - validErrors.length;
    const outlierFiltered = outlierCount > 0;

    let avgError;
    if (validErrors.length > 0) {
        avgError = validErrors.reduce((sum, e) => sum + e, 0) / validErrors.length;
        console.log(`📊 外れ値除外: ${outlierCount}音除外（${outlierThreshold}¢超）、有効音: ${validErrors.length}/${errors.length}`);
    } else {
        avgError = errors.reduce((sum, e) => sum + e, 0) / errors.length;
        console.warn('⚠️ すべての音が外れ値と判定されました。元の値を使用します。');
    }

    // 3. タイトルを更新
    const titleSpan = document.querySelector('.detail-analysis-title span:last-child');
    if (titleSpan) titleSpan.textContent = `セッション${sessionIndex + 1}`;

    // 4. 基音を更新
    const baseNoteEl = document.querySelector('.score-base-note');
    if (baseNoteEl) baseNoteEl.textContent = session.baseNote || 'C4';

    // 5. 精度バッジを更新（v2.0.0: EvaluationCalculator統合）
    const badge = document.querySelector('.accuracy-badge');
    const message = document.querySelector('.rank-grid-center p');
    if (badge && message) {
        badge.className = 'accuracy-badge accuracy-badge-container';

        // 統合評価関数を使用
        const evaluation = window.EvaluationCalculator.evaluateAverageError(avgError);

        badge.classList.add(`accuracy-badge-${evaluation.level}`);
        badge.innerHTML = `
            <i data-lucide="${evaluation.icon}" class="${evaluation.color} accuracy-icon"></i>
            <button class="help-icon-btn help-icon-btn-positioned">
                <i data-lucide="help-circle" style="width: 20px !important; height: 20px !important; min-width: 20px !important; min-height: 20px !important; max-width: 20px !important; max-height: 20px !important; font-size: 20px !important;"></i>
            </button>
        `;
        message.textContent = evaluation.message;
    }

    // 6. 平均誤差を更新
    const avgErrorEl = document.querySelector('.score-average');
    if (avgErrorEl) avgErrorEl.textContent = `±${avgError.toFixed(1)}¢`;

    // 7. 音別詳細結果を表示（v2.0.0: EvaluationCalculator統合 + 外れ値アイコン）
    const container = document.getElementById('detail-note-results');
    if (container && session.pitchErrors) {
        const noteNames = ['ド', 'レ', 'ミ', 'ファ', 'ソ', 'ラ', 'シ', 'ド'];
        container.innerHTML = '';

        session.pitchErrors.forEach((error, index) => {
            const absError = Math.abs(error.errorInCents);

            // 【追加】外れ値判定
            const isOutlier = absError > outlierThreshold;

            // 統合評価関数を使用（外れ値でない場合）
            let evaluation;
            if (isOutlier) {
                evaluation = {
                    icon: 'alert-circle',
                    color: 'text-amber-400',
                    label: '外れ値'
                };
            } else {
                evaluation = window.EvaluationCalculator.evaluatePitchError(absError);
            }

            const deviationClass = error.errorInCents >= 0 ? 'text-pitch-deviation-plus' : 'text-pitch-deviation-minus';

            const noteElement = document.createElement('div');
            noteElement.className = 'note-result-item';
            noteElement.innerHTML = `
                <div class="flex items-center justify-between">
                    <div class="flex items-center gap-4">
                        <div>
                            <div class="text-sub-title">${noteNames[index]}</div>
                        </div>
                        <div>
                            <div class="text-body">目標 ${error.expectedFrequency.toFixed(0)}Hz</div>
                            <div class="text-body">実音 ${error.detectedFrequency.toFixed(0)}Hz</div>
                        </div>
                    </div>
                    <div class="flex items-center gap-3">
                        <div class="${deviationClass}">${error.errorInCents >= 0 ? '+' : ''}${error.errorInCents.toFixed(1)}¢</div>
                        <div class="flex items-center justify-center">
                            <i data-lucide="${evaluation.icon}" class="${evaluation.color}" style="width: 28px; height: 28px;"></i>
                        </div>
                    </div>
                </div>
            `;
            container.appendChild(noteElement);
        });
    }

    // 【追加】外れ値説明セクション表示
    displayOutlierExplanationOverview(outlierFiltered, outlierCount, outlierThreshold);

    // 8. Lucideアイコンを再初期化
    if (typeof window.initializeLucideIcons === 'function') {
        window.initializeLucideIcons({ immediate: true });
    }

    // 9. ナビゲーションボタンの状態を更新
    updateNavigationButtons();
}

/**
 * 前のセッションに移動
 */
window.navigateToPrevSession = function() {
    if (window.currentSessionIndex > 0) {
        window.showSessionDetail(window.currentSessionIndex - 1);
    }
}

/**
 * 次のセッションに移動
 */
window.navigateToNextSession = function() {
    // フィルタリング済みセッションデータを使用
    const sessionData = window.filteredSessionData || [];

    if (window.currentSessionIndex < sessionData.length - 1) {
        window.showSessionDetail(window.currentSessionIndex + 1);
    }
}

/**
 * ナビゲーションボタンの有効/無効を更新
 */
function updateNavigationButtons() {
    // フィルタリング済みセッションデータを使用
    const sessionData = window.filteredSessionData || [];

    if (!sessionData || sessionData.length === 0) return;

    const prevBtn = document.getElementById('prev-session-btn');
    const nextBtn = document.getElementById('next-session-btn');

    if (prevBtn) {
        prevBtn.disabled = window.currentSessionIndex === 0;
        prevBtn.style.opacity = window.currentSessionIndex === 0 ? '0.5' : '1';
        prevBtn.style.cursor = window.currentSessionIndex === 0 ? 'not-allowed' : 'pointer';
    }

    if (nextBtn) {
        nextBtn.disabled = window.currentSessionIndex >= sessionData.length - 1;
        nextBtn.style.opacity = window.currentSessionIndex >= sessionData.length - 1 ? '0.5' : '1';
        nextBtn.style.cursor = window.currentSessionIndex >= sessionData.length - 1 ? 'not-allowed' : 'pointer';
    }
}

/**
 * Chart.js初期化
 */
// Chartインスタンスをグローバルに保存（SPA再実行時に破棄するため）
if (typeof window.resultsOverviewChart === 'undefined') {
    window.resultsOverviewChart = null;
}

function initializeCharts(sessionData) {
    const canvas = document.getElementById('error-trend-chart');
    if (!canvas) return;

    // 既存のChartインスタンスがあれば破棄
    if (window.resultsOverviewChart) {
        window.resultsOverviewChart.destroy();
        window.resultsOverviewChart = null;
    }

    const ctx = canvas.getContext('2d');

    // セッション別平均誤差データ（符号付き: + = シャープ, - = フラット）
    const labels = sessionData.map((_, i) => `S${i + 1}`);
    const data = sessionData.map(session => {
        if (!session.pitchErrors || session.pitchErrors.length === 0) return 0;
        // 外れ値除外（180¢超）
        const validErrors = session.pitchErrors.filter(e => Math.abs(e.errorInCents) <= 180);
        if (validErrors.length === 0) return 0;
        // 符号付き平均（Math.abs()を使わない）
        const sum = validErrors.reduce((s, e) => s + e.errorInCents, 0);
        return parseFloat((sum / validErrors.length).toFixed(1));
    });

    window.resultsOverviewChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: '平均誤差（+ シャープ傾向 / - フラット傾向）',
                data: data,
                borderColor: 'rgba(255, 255, 255, 0.9)',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                borderWidth: 2,
                tension: 0.3,
                pointRadius: 5,
                pointBackgroundColor: 'rgba(255, 255, 255, 0.9)',
                pointBorderColor: 'rgba(59, 130, 246, 1)',
                pointBorderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                title: {
                    display: true,
                    text: '平均誤差の推移（+ シャープ傾向 / - フラット傾向）',
                    color: '#fff',
                    font: {
                        size: 14,
                        weight: 'normal'
                    },
                    padding: {
                        bottom: 20
                    }
                },
                annotation: {
                    annotations: {
                        zeroLine: {
                            type: 'line',
                            yMin: 0,
                            yMax: 0,
                            borderColor: 'rgba(34, 197, 94, 0.8)',
                            borderWidth: 3,
                            label: {
                                display: true,
                                content: '目標 (0¢)',
                                position: 'end',
                                backgroundColor: 'rgba(34, 197, 94, 0.8)',
                                color: '#fff',
                                font: { size: 11 }
                            }
                        },
                        excellentTop: {
                            type: 'line',
                            yMin: 20,
                            yMax: 20,
                            borderColor: 'rgba(251, 191, 36, 0.3)',
                            borderWidth: 1,
                            borderDash: [5, 5]
                        },
                        excellentBottom: {
                            type: 'line',
                            yMin: -20,
                            yMax: -20,
                            borderColor: 'rgba(251, 191, 36, 0.3)',
                            borderWidth: 1,
                            borderDash: [5, 5]
                        },
                        goodTop: {
                            type: 'line',
                            yMin: 35,
                            yMax: 35,
                            borderColor: 'rgba(34, 197, 94, 0.3)',
                            borderWidth: 1,
                            borderDash: [5, 5]
                        },
                        goodBottom: {
                            type: 'line',
                            yMin: -35,
                            yMax: -35,
                            borderColor: 'rgba(34, 197, 94, 0.3)',
                            borderWidth: 1,
                            borderDash: [5, 5]
                        },
                        sharpZone: {
                            type: 'box',
                            yMin: 0,
                            yMax: 60,
                            backgroundColor: 'rgba(239, 68, 68, 0.05)',
                            borderWidth: 0
                        },
                        flatZone: {
                            type: 'box',
                            yMin: -60,
                            yMax: 0,
                            backgroundColor: 'rgba(59, 130, 246, 0.05)',
                            borderWidth: 0
                        }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const value = context.parsed.y;
                            const sign = value >= 0 ? '+' : '';
                            const tendency = value > 0 ? 'シャープ傾向' : value < 0 ? 'フラット傾向' : '目標通り';
                            return `${sign}${value}¢ (${tendency})`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    min: -70,
                    max: 70,
                    ticks: {
                        color: '#fff',
                        callback: function(value) {
                            return value >= 0 ? `+${value}¢` : `${value}¢`;
                        }
                    },
                    grid: {
                        color: function(context) {
                            if (context.tick.value === 0) {
                                return 'rgba(34, 197, 94, 0.3)';
                            }
                            return 'rgba(255, 255, 255, 0.1)';
                        },
                        lineWidth: function(context) {
                            return context.tick.value === 0 ? 2 : 1;
                        }
                    }
                },
                x: {
                    ticks: { color: '#fff' },
                    grid: { color: 'rgba(255, 255, 255, 0.1)' }
                }
            }
        }
    });
}

/**
 * ダミーデータ表示
 */
function showDummyOverview() {
    console.log('📊 ダミーデータで総合評価を表示');

    const dummySessions = Array.from({ length: 8 }, (_, i) => ({
        sessionId: i + 1,
        mode: 'random',
        baseNote: ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5'][i],
        pitchErrors: Array.from({ length: 8 }, (_, j) => ({
            step: j,
            errorInCents: (Math.random() - 0.5) * 30,
            expectedFrequency: 261.63 * Math.pow(2, j / 12),
            detectedFrequency: 261.63 * Math.pow(2, j / 12) * (1 + (Math.random() - 0.5) * 0.03)
        }))
    }));

    // グローバル変数に保存
    window.filteredSessionData = dummySessions;
    window.currentMode = 'random';

    const evaluation = window.EvaluationCalculator.calculateDynamicGrade(dummySessions);
    updateOverviewUI(evaluation, dummySessions);

    if (typeof Chart !== 'undefined') {
        initializeCharts(dummySessions);
    }
}

/**
 * シェア機能
 */
function getShareText() {
    const grade = document.querySelector('#dynamic-grade')?.textContent || 'B';
    const error = document.querySelector('.avg-error')?.textContent || '±18.2¢';
    const sessions = document.querySelector('.session-count')?.textContent || '8';

    return `🎵 8va相対音感トレーニングで【${grade}級】獲得！\n平均誤差: ${error}\n${sessions}セッション完走！`;
}

window.shareToTwitter = function(event) {
    event.preventDefault();
    const text = encodeURIComponent(getShareText());
    const url = encodeURIComponent(window.location.href);
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, '_blank');
}

window.shareToLine = function(event) {
    event.preventDefault();
    const text = encodeURIComponent(getShareText() + '\n' + window.location.href);
    window.open(`https://social-plugins.line.me/lineit/share?text=${text}`, '_blank');
}

window.shareToFacebook = function(event) {
    event.preventDefault();
    const url = encodeURIComponent(window.location.href);
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank');
}

window.copyShareText = function(event) {
    event.preventDefault();
    const text = getShareText() + '\n' + window.location.href;

    navigator.clipboard.writeText(text).then(() => {
        const btn = event.currentTarget;
        btn.classList.add('copied');
        setTimeout(() => btn.classList.remove('copied'), 2000);
    });
}

/**
 * DOMContentLoaded時の初期化（直接ページアクセス時用）
 */
document.addEventListener('DOMContentLoaded', async function() {
    console.log('📊 [DOMContentLoaded] results-overview初期化');

    // Lucideアイコン初期化（統合初期化関数を使用）
    if (typeof window.initializeLucideIcons === 'function') {
        window.initializeLucideIcons({ immediate: true });
    }

    // 総合評価ページ初期化（DOMContentLoaded経由）
    await window.initResultsOverview();
});

/**
 * 外れ値説明セクションを表示（総合評価ページ用）
 */
function displayOutlierExplanationOverview(outlierFiltered, outlierCount, outlierThreshold) {
    // 外れ値説明用のコンテナを探す
    let explanationContainer = document.getElementById('outlier-explanation-overview-container');

    // コンテナがなければ作成
    if (!explanationContainer) {
        explanationContainer = document.createElement('div');
        explanationContainer.id = 'outlier-explanation-overview-container';
        // warning-alertスタイルはコンテナではなく内部要素に適用

        // 詳細分析セクションの後に挿入
        const detailedAnalysis = document.querySelector('.glass-card:has(#detail-note-results)');
        if (detailedAnalysis && detailedAnalysis.nextSibling) {
            detailedAnalysis.parentNode.insertBefore(explanationContainer, detailedAnalysis.nextSibling);
        } else if (detailedAnalysis) {
            detailedAnalysis.parentNode.appendChild(explanationContainer);
        }
    }

    // 外れ値がある場合のみ表示
    if (outlierFiltered) {
        explanationContainer.innerHTML = `
            <div class="warning-alert">
                <i data-lucide="alert-circle" class="text-amber-400"></i>
                <div>
                    <p><strong>外れ値について</strong></p>
                    <p>このセッションで<strong>${outlierCount}音</strong>が外れ値として除外されました。外れ値とは<strong>${outlierThreshold}¢（約${(outlierThreshold / 100).toFixed(1)}半音）を超える大きな誤差</strong>のことです。これは測定エラーの可能性もありますが、特定の音程が本当に苦手な場合もあります。平均誤差の計算精度を保つため、これらの値は除外されていますが、詳細分析で確認することをおすすめします。</p>
                </div>
            </div>
        `;

        // Lucideアイコン再初期化
        if (typeof window.initializeLucideIcons === 'function') {
            window.initializeLucideIcons({ immediate: true });
        }
    } else {
        explanationContainer.innerHTML = '';
    }
}

/**
 * 総合グレード説明ポップオーバーの切り替え
 */
function toggleGradePopover() {
    console.log('🔵 toggleGradePopover called');
    const popover = document.getElementById('grade-popover');
    console.log('🔵 grade-popover element:', popover);
    if (popover) {
        popover.classList.toggle('show');
        console.log('🔵 Toggled show class, current classes:', popover.className);
    } else {
        console.error('❌ grade-popover element not found');
    }
}

/**
 * セッション精度ランク説明ポップオーバーの切り替え
 */
function toggleSessionRankPopover() {
    console.log('🟢 toggleSessionRankPopover called');
    const popover = document.getElementById('session-rank-popover');
    console.log('🟢 session-rank-popover element:', popover);
    if (popover) {
        popover.classList.toggle('show');
        console.log('🟢 Toggled show class, current classes:', popover.className);
    } else {
        console.error('❌ session-rank-popover element not found');
    }
}

// ポップオーバー外クリックで閉じる（DOMContentLoaded後に登録）
document.addEventListener('DOMContentLoaded', function() {
    document.addEventListener('click', function(event) {
        const gradePopover = document.getElementById('grade-popover');
        const sessionRankPopover = document.getElementById('session-rank-popover');
        const helpBtn = event.target.closest('.help-icon-btn, .rank-info-btn');
        const popoverContent = event.target.closest('.rank-popover');

        // ヘルプボタンまたはポップオーバー内クリックは無視
        if (!helpBtn && !popoverContent) {
            if (gradePopover && gradePopover.classList.contains('show')) {
                gradePopover.classList.remove('show');
            }
            if (sessionRankPopover && sessionRankPopover.classList.contains('show')) {
                sessionRankPopover.classList.remove('show');
            }
        }
    });
});

// グローバルに公開
window.toggleGradePopover = toggleGradePopover;
window.toggleSessionRankPopover = toggleSessionRankPopover;

// グローバル関数が定義されたことを通知
console.log('✅ [results-overview-controller] window.initResultsOverview defined');
console.log('✅ [results-overview-controller] window.toggleGradePopover:', typeof window.toggleGradePopover);
console.log('✅ [results-overview-controller] window.toggleSessionRankPopover:', typeof window.toggleSessionRankPopover);
