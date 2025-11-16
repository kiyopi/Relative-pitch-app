console.log('🚀 [results-overview-controller] Script loaded - START v4.0.0 (2025-11-16)');

/**
 * results-overview-controller.js
 * 総合評価ページコントローラー
 * Version: 4.0.0
 * Date: 2025-11-16
 * Changelog:
 *   v4.0.0 - 【パフォーマンス最適化】二重初期化防止・Lucide過剰呼び出し削減（89%削減）
 *   v3.6.0 - fromRecords時のURLパラメータ優先、modeInfo.id→modeInfo.mode修正
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
 * - SessionManager: 統一的なlessonId管理（v1.1.0追加）
 * - Chart.js: 誤差推移グラフ描画
 * - window.initializeLucideIcons: アイコン初期化
 *
 * 【変更履歴】
 * - 1.1.0: SessionManager統合 - SessionManager.getCurrent()優先使用
 *   - URLパラメータのlessonIdより、SessionManager経由を優先
 *   - フォールバック: URL → localStorage最新セッション
 *   - 統一的なlessonId管理でバグ防止
 */

// デバッグモード設定（false = 詳細ログ無効化）
const DEBUG_MODE = true;

// 🛡️ 二重初期化防止フラグ
let isResultsOverviewInitialized = false;

/**
 * 総合評価ページの初期化（即座にグローバル定義）
 */
window.initResultsOverview = async function initResultsOverview() {
    // 🛡️ 二重初期化防止ガード
    if (isResultsOverviewInitialized) {
        console.warn('⚠️ [results-overview] 既に初期化済み - 二重初期化を防止しました');
        return;
    }

    console.log('=== 総合評価ページ初期化開始 ===');
    isResultsOverviewInitialized = true;

    // ローディング状態を表示
    LoadingComponent.toggle('stats', true);

    // 全セッションデータを取得
    const hash = window.location.hash;
    const allSessionData = window.SessionDataManager 
        ? window.SessionDataManager.getAllSessions() 
        : (JSON.parse(localStorage.getItem('sessionData')) || []);

    console.log(`📊 全セッションデータ取得: ${allSessionData.length}セッション`);

    if (allSessionData.length === 0) {
        console.warn('⚠️ セッションデータが見つかりません');
        LoadingComponent.toggle('stats', false);
        return;
    }

    // モード・lessonId・scaleDirectionの取得（優先順位：URL > SessionManager）
    let currentMode = 'random';
    let lessonId = null;
    let scaleDirection = null;

    // URLパラメータを最初に取得
    const params = new URLSearchParams(hash.split('?')[1] || '');
    const fromRecords = params.get('fromRecords') === 'true';
    const urlLessonId = params.get('lessonId');
    const urlMode = params.get('mode');
    const urlScaleDirection = params.get('scaleDirection');

    // 【修正v4.0.8】URLパラメータを最優先（lessonIdがあれば常に優先）
    if (urlLessonId) {
        lessonId = urlLessonId;
        currentMode = urlMode || 'random';
        scaleDirection = urlScaleDirection || 'ascending';
        console.log(`✅ [URL優先] lessonId=${lessonId}, mode=${currentMode}, scaleDirection=${scaleDirection}`);
    } else if (window.SessionManager) {
        // SessionManagerから取得（lessonIdがURLにない場合のみ）
        const sessionManager = SessionManager.getCurrent();
        if (sessionManager) {
            currentMode = sessionManager.getMode();
            lessonId = sessionManager.getLessonId();
            scaleDirection = sessionManager.getScaleDirection();
            console.log(`✅ [SessionManager] lessonId=${lessonId}, mode=${currentMode}, scaleDirection=${scaleDirection}`);
        }
    }
    
    if (DEBUG_MODE) {
        console.log(`🔍 [DEBUG] 現在のモード: ${currentMode}`);
        console.log(`🔍 [DEBUG] lessonId: ${lessonId || 'なし（全体表示）'}`);
        console.log(`🔍 [DEBUG] scaleDirection: ${scaleDirection || 'なし'}`);
        console.log(`🔍 [DEBUG] トレーニング記録から遷移: ${fromRecords}`);
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

    // セッションデータのフィルタリング
    let sessionData;

    // 【修正v4.0.8】SessionDataManager.getCompleteSessionsByLessonId()を使用
    if (lessonId) {
        console.log(`🔍 [DEBUG] 完全レッスンチェック開始 - lessonId: ${lessonId}`);
        
        // 完全なレッスンのみ取得
        sessionData = window.SessionDataManager
            ? window.SessionDataManager.getCompleteSessionsByLessonId(lessonId, currentMode, scaleDirection)
            : allSessionData.filter(s => s.lessonId === lessonId);

        if (sessionData.length === 0) {
            // 不完全レッスンまたは存在しないlessonId
            const rawSessions = allSessionData.filter(s => s.lessonId === lessonId);
            if (rawSessions.length > 0) {
                console.error(`❌ 不完全レッスン: ${lessonId} (${rawSessions.length}セッション)`);
                alert(`このレッスンは未完了です。\n正常な評価を表示できません。\n\nトレーニング記録ページに戻ります。`);
            } else {
                console.error(`❌ lessonIdが見つかりません: ${lessonId}`);
                alert(`指定されたレッスンが見つかりません。\n\nトレーニング記録ページに戻ります。`);
            }
            window.location.hash = '#training-records';
            return;
        }

        console.log(`✅ 完全レッスン取得成功: ${sessionData.length}セッション`);
    } else if (scaleDirection) {
        // scaleDirection指定あり：モード+scaleDirectionでフィルタリング
        sessionData = allSessionData.filter(s => 
            s.mode === currentMode && 
            (s.scaleDirection || 'ascending') === scaleDirection
        );
        console.log(`✅ ${currentMode}モード（${scaleDirection}）のセッションデータ取得: ${sessionData.length}セッション`);
    } else {
        // 通常のモード別フィルタリング（後方互換性）
        sessionData = allSessionData.filter(s => s.mode === currentMode);
        console.log(`✅ セッションデータ取得: ${currentMode}モード=${sessionData.length}セッション (全体=${allSessionData.length}セッション)`);
    }

    // フィルタリング済みセッションデータをグローバル変数に保存
    // showSessionDetail関数で参照するため
    window.filteredSessionData = sessionData;
    window.currentMode = currentMode;

    // フィルタリング後のセッションIDリストを表示（デバッグ）
    if (DEBUG_MODE) {
        console.log('🔍 [DEBUG] フィルタリング後のセッションID:', sessionData.map(s => s.sessionId));
    }

    // 総合評価計算（2ea4305の修正を維持）
    const overallEvaluation = EvaluationCalculator.calculateDynamicGrade(sessionData);
    console.log('📊 総合評価計算完了:', overallEvaluation);

    // UI更新（トレーニング記録からの遷移フラグとscaleDirectionを渡す）
    updateOverviewUI(overallEvaluation, sessionData, fromRecords, scaleDirection);

    // Chart.js初期化
    if (typeof Chart !== 'undefined') {
        initializeCharts(sessionData);
    }

    // トレーニング記録からの遷移の場合、UI要素を調整
    if (fromRecords) {
        // DOMが完全に更新されるまで少し待機
        setTimeout(() => {
            handleRecordsViewMode();
        }, 100);
    }

    // ローディング状態を非表示
    LoadingComponent.toggle('stats', false);

    // 🎨 Lucideアイコン一括初期化（最後に1回のみ）
    if (typeof window.initializeLucideIcons === 'function') {
        console.log('🎨 [results-overview] Lucideアイコン一括初期化');
        window.initializeLucideIcons({ immediate: true });
    }

    console.log('=== 総合評価ページ初期化完了 ===');
}

/**
 * 全セッションデータを読み込み
 */
function loadAllSessionData() {
    console.log('🔍 [loadAllSessionData] 関数開始');
    console.log('🔍 [loadAllSessionData] DataManager存在チェック:', typeof DataManager);

    try {
        if (typeof DataManager === 'undefined') {
            console.error('❌ DataManagerが未定義です');
            return [];
        }

        let data = DataManager.getFromStorage('sessionData') || [];
        console.log('📊 読み込んだセッションデータ:', data);
        console.log('📊 データ件数:', data.length);

        // 誤ったlessonIdの修復（グローバル関数を使用）
        if (typeof window.repairIncorrectLessonIds === 'function') {
            console.log('🔧 [loadAllSessionData] lessonId修復機能を実行');
            data = window.repairIncorrectLessonIds(data);
        } else {
            console.warn('⚠️ [loadAllSessionData] repairIncorrectLessonIds関数が見つかりません');
        }

        return data;
    } catch (error) {
        console.error('❌ セッションデータ読み込みエラー:', error);
        return [];
    }
}

/**
 * 総合評価UIを更新
 * @param {Object} evaluation - 評価結果
 * @param {Array} sessionData - セッションデータ
 * @param {Boolean} fromRecords - トレーニング記録からの遷移フラグ
 * @param {String} scaleDirection - 音階方向 (ascending/descending)
 */
function updateOverviewUI(evaluation, sessionData, fromRecords = false, scaleDirection = null) {
    console.log('🎨 UI更新開始:', evaluation);

    // セッションデータから基音方向（chromaticDirection）を取得（12音階モード用）
    const chromaticDirection = sessionData && sessionData.length > 0
        ? sessionData[0].chromaticDirection
        : null;

    // 音階方向が指定されていない場合、セッションデータから取得
    if (!scaleDirection && sessionData && sessionData.length > 0) {
        scaleDirection = sessionData[0].scaleDirection || 'ascending';
    }

    // ModeControllerでページヘッダーを一括更新
    if (window.ModeController) {
        const totalNotes = evaluation.metrics.raw.totalNotes;
        const subtitleText = `${sessionData.length}セッション (${totalNotes}音) の総合評価`;

        window.ModeController.updatePageHeader(evaluation.modeInfo.mode, {
            chromaticDirection: chromaticDirection,
            scaleDirection: scaleDirection,
            subtitleText: fromRecords ? null : subtitleText // トレーニング記録からの遷移時は日時表示を保持
        });

        // 総合評価カード内のモード名も更新（#main-mode-title）
        const modeTitleEl = document.getElementById('main-mode-title');
        console.log(`🔍 [DEBUG] #main-mode-title要素:`, modeTitleEl);
        if (modeTitleEl) {
            // ModeControllerと同じフォーマットでタイトルを生成
            const titleText = window.ModeController.generatePageTitle(evaluation.modeInfo.mode, {
                chromaticDirection: chromaticDirection,
                scaleDirection: scaleDirection
            });
            modeTitleEl.textContent = titleText;
            console.log(`✅ [main-mode-title] モード名更新: ${titleText}`);
        } else {
            console.error(`❌ #main-mode-title要素が見つかりません`);
        }
    } else {
        console.error('❌ ModeControllerが見つかりません');

        // フォールバック: 従来の方法でモード名更新
        const modeTitleEl = document.getElementById('main-mode-title');
        if (modeTitleEl) {
            modeTitleEl.textContent = evaluation.modeInfo.name;
        }

        // サブタイトル更新（トレーニング記録からの遷移時は日時表示を保持）
        const subtitleEl = document.querySelector('.page-subtitle');
        if (subtitleEl && !subtitleEl.classList.contains('records-view-date')) {
            const totalNotes = evaluation.metrics.raw.totalNotes;
            subtitleEl.textContent = `${sessionData.length}セッション (${totalNotes}音) の総合評価`;
        }
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

    // 次のステップ表示（トレーニング記録からの遷移時はスキップ）
    if (!fromRecords) {
        // 【修正v4.0.7】chromaticDirectionとscaleDirectionの両方を渡す
        displayNextSteps(currentMode, evaluation, chromaticDirection, scaleDirection);
    }
}

/**
 * グレードアイコンを更新
 */
function updateGradeIcon(grade) {
    const iconContainer = document.querySelector('.rank-icon .rank-circle');
    if (!iconContainer) return;

    // グレード別アイコン・色設定
    const gradeConfig = {
        'S': { icon: 'crown', class: 'rank-circle-s', color: 'gold', customSvg: true },
        'A': { icon: 'medal', class: 'rank-circle-a', color: 'silver' },
        'B': { icon: 'award', class: 'rank-circle-b', color: 'orange' },
        'C': { icon: 'smile', class: 'rank-circle-c', color: 'green' },
        'D': { icon: 'meh', class: 'rank-circle-d', color: 'blue' },
        'E': { icon: 'frown', class: 'rank-circle-e', color: 'red' }
    };

    const config = gradeConfig[grade] || gradeConfig['B'];

    // クラスをリセット
    iconContainer.className = `rank-circle rank-md ${config.class}`;

    // アイコン更新（S級のみカスタムSVG使用）
    let iconHtml = '';
    if (config.customSvg && grade === 'S') {
        // 最新版crownのSVGを直接埋め込み
        iconHtml = `
            <svg xmlns="http://www.w3.org/2000/svg" class="text-white rank-circle-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M11.562 3.266a.5.5 0 0 1 .876 0L15.39 8.87a1 1 0 0 0 1.516.294L21.183 5.5a.5.5 0 0 1 .798.519l-2.834 10.246a1 1 0 0 1-.956.734H5.81a1 1 0 0 1-.957-.734L2.02 6.02a.5.5 0 0 1 .798-.519l4.276 3.664a1 1 0 0 0 1.516-.294z"></path>
                <path d="M5 21h14"></path>
            </svg>
        `;
    } else {
        iconHtml = `<i data-lucide="${config.icon}" class="text-white rank-circle-icon"></i>`;
    }

    iconContainer.innerHTML = `
        ${iconHtml}
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
}

/**
 * セッショングリッドを表示（UIカタログパターン準拠）
 */
function displaySessionGrid(sessionData) {
    console.log('📊 [displaySessionGrid] 関数開始');
    console.log('📊 [displaySessionGrid] sessionData:', sessionData);
    console.log('📊 [displaySessionGrid] sessionData.length:', sessionData.length);
    
    const container = document.getElementById('session-grid-container');
    console.log('📊 [displaySessionGrid] container要素:', container);
    if (!container) {
        console.error('❌ session-grid-container が見つかりません');
        return;
    }

    // セッション数に応じたグリッドクラスを決定
    const sessionCount = sessionData.length;
    console.log('📊 [displaySessionGrid] sessionCount:', sessionCount);
    
    let gridClass = 'sessions-grid-8';
    if (sessionCount === 12) gridClass = 'sessions-grid-12';
    else if (sessionCount === 24) gridClass = 'sessions-grid-24';
    console.log('📊 [displaySessionGrid] gridClass:', gridClass);

    console.log('📊 [displaySessionGrid] map処理開始...');
    const sessionBoxes = sessionData.map((session, index) => {
        console.log(`📊 [displaySessionGrid] セッション ${index + 1} 処理開始`);
        
        // 【追加】外れ値を除外した平均誤差を計算（固定閾値180¢）
        const errors = session.pitchErrors
            ? session.pitchErrors.map(e => Math.abs(e.errorInCents))
            : [];
        console.log(`📊 [displaySessionGrid] セッション ${index + 1} errors:`, errors);

        const outlierThreshold = 180; // 全デバイス共通の固定閾値

        const validErrors = errors.filter(e => e <= outlierThreshold);
        const outlierCount = errors.length - validErrors.length;
        console.log(`📊 [displaySessionGrid] セッション ${index + 1} validErrors:`, validErrors.length, 'outliers:', outlierCount);

        const avgError = validErrors.length > 0
            ? validErrors.reduce((sum, e) => sum + e, 0) / validErrors.length
            : errors.reduce((sum, e) => sum + e, 0) / errors.length;
        console.log(`📊 [displaySessionGrid] セッション ${index + 1} avgError:`, avgError);

        // 統合評価関数を使用（v2.1.0: EvaluationCalculator統合）
        const evaluation = window.EvaluationCalculator.evaluateAverageError(avgError);
        console.log(`📊 [displaySessionGrid] セッション ${index + 1} evaluation:`, evaluation);
        
        const badgeClass = `session-${evaluation.level}`;
        console.log(`📊 [displaySessionGrid] セッション ${index + 1} badgeClass:`, badgeClass);

        const html = `
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
        console.log(`📊 [displaySessionGrid] セッション ${index + 1} HTML生成完了`);
        return html;
    }).join('');

    console.log('📊 [displaySessionGrid] map処理完了');
    console.log('📊 [displaySessionGrid] sessionBoxes.length:', sessionBoxes.length);
    console.log('📊 [displaySessionGrid] sessionBoxes (最初の100文字):', sessionBoxes.substring(0, 100));

    const finalHTML = `
        <div class="${gridClass}">
            ${sessionBoxes}
        </div>
    `;
    console.log('📊 [displaySessionGrid] finalHTML (最初の200文字):', finalHTML.substring(0, 200));
    
    container.innerHTML = finalHTML;
    console.log('📊 [displaySessionGrid] container.innerHTML設定完了');
    console.log('📊 [displaySessionGrid] 関数終了');
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
                <i data-lucide="help-circle" class="icon-help"></i>
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

    // 8. ナビゲーションボタンの状態を更新
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
 * 次のステップを表示
 * @param {string} currentMode - 現在のモード（random, continuous, 12tone等）
 * @param {object} evaluation - 評価結果（将来の拡張用、現在未使用）
 * @param {string} chromaticDirection - 12音階モードの基音方向（ascending, descending, both）
 * @param {string} scaleDirection - 音階方向（ascending, descending）
 */
function displayNextSteps(currentMode, evaluation, chromaticDirection = null, scaleDirection = 'ascending') {
    const container = document.getElementById('next-steps-container');
    if (!container) return;

    // 将来の拡張: evaluationのグレードに応じてメッセージをカスタマイズ可能
    // 例: evaluation.grade === 'A'なら「次のレベルに挑戦」を強調表示

    // モード別の次のステップ定義（将来の下行モード対応含む）
    const nextStepsConfig = {
        'random': {
            practice: {
                icon: 'repeat',
                iconBg: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                title: 'もっと練習する',
                description: '毎日5分の継続練習でさらなる上達を目指しましょう',
                buttonText: '同じモードで再挑戦',
                actionId: 'next-step-random-practice'
            },
            upgrade: {
                icon: 'arrow-up-circle',
                iconBg: 'linear-gradient(135deg, #10b981, #059669)',
                title: '次のレベルに挑戦',
                description: '連続チャレンジモードで半音を含む12音に挑戦',
                buttonText: '連続チャレンジを開始',
                actionId: 'next-step-random-upgrade'
            },
            records: {
                icon: 'trending-up',
                iconBg: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
                title: '成長の軌跡を確認',
                description: 'トレーニング記録であなたの上達を可視化',
                buttonText: '記録を見る',
                actionId: 'next-step-random-records'
            }
        },
        'continuous': {
            practice: {
                icon: 'repeat',
                iconBg: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                title: 'もっと練習する',
                description: '週3回・15分の集中練習で実用レベルを完全習得',
                buttonText: '同じモードで再挑戦',
                actionId: 'next-step-continuous-practice'
            },
            upgrade: {
                icon: 'arrow-up-circle',
                iconBg: 'linear-gradient(135deg, #10b981, #059669)',
                title: '12音階モードに挑戦',
                description: 'プロレベルの完璧な12音律習得を目指す',
                buttonText: '12音階モードを開始',
                actionId: 'next-step-continuous-upgrade'
            },
            records: {
                icon: 'trending-up',
                iconBg: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
                title: '成長の軌跡を確認',
                description: 'トレーニング記録であなたの上達を可視化',
                buttonText: '記録を見る',
                actionId: 'next-step-continuous-records'
            }
        },
        // 将来の下行モード対応（未実装）
        'random-down': {
            practice: {
                icon: 'repeat',
                iconBg: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                title: 'もっと練習する',
                description: '下行での音程感覚をさらに磨きましょう',
                buttonText: '同じモードで再挑戦',
                actionId: 'next-step-random-down-practice'
            },
            upgrade: {
                icon: 'arrow-up-circle',
                iconBg: 'linear-gradient(135deg, #10b981, #059669)',
                title: '次のレベルに挑戦',
                description: '連続チャレンジ（下行）で半音を含む12音に挑戦',
                buttonText: '連続チャレンジ（下行）',
                actionId: 'next-step-random-down-upgrade'
            },
            records: {
                icon: 'trending-up',
                iconBg: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
                title: '成長の軌跡を確認',
                description: 'トレーニング記録であなたの上達を可視化',
                buttonText: '記録を見る',
                actionId: 'next-step-random-down-records'
            }
        },
        'continuous-down': {
            practice: {
                icon: 'repeat',
                iconBg: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                title: 'もっと練習する',
                description: '下行での12音律システム習得を完成させましょう',
                buttonText: '同じモードで再挑戦',
                actionId: 'next-step-continuous-down-practice'
            },
            upgrade: {
                icon: 'lock',
                iconBg: 'linear-gradient(135deg, #6b7280, #4b5563)',
                title: '12音階モード（下行）',
                description: 'プロレベルの下行完璧習得（準備中）',
                buttonText: '準備中',
                actionId: null,
                disabled: true
            },
            records: {
                icon: 'trending-up',
                iconBg: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
                title: '成長の軌跡を確認',
                description: 'トレーニング記録であなたの上達を可視化',
                buttonText: '記録を見る',
                actionId: 'next-step-continuous-down-records'
            }
        },
        '12tone-ascending': {
            practice: {
                icon: 'repeat',
                iconBg: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                title: 'もっと練習する',
                description: '12音階上昇モードでさらなる精度向上を目指す',
                buttonText: '同じモードで再挑戦',
                actionId: 'next-step-12tone-ascending-practice'
            },
            upgrade: {
                icon: 'arrow-down-circle',
                iconBg: 'linear-gradient(135deg, #10b981, #059669)',
                title: '下降モードに挑戦',
                description: '12音階下降モードで下行音程感覚を習得',
                buttonText: '12音階下降を開始',
                actionId: 'next-step-12tone-ascending-upgrade'
            },
            records: {
                icon: 'trending-up',
                iconBg: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
                title: '成長の軌跡を確認',
                description: 'トレーニング記録であなたの上達を可視化',
                buttonText: '記録を見る',
                actionId: 'next-step-12tone-ascending-records'
            }
        },
        '12tone-descending': {
            practice: {
                icon: 'repeat',
                iconBg: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                title: 'もっと練習する',
                description: '12音階下降モードでさらなる精度向上を目指す',
                buttonText: '同じモードで再挑戦',
                actionId: 'next-step-12tone-descending-practice'
            },
            upgrade: {
                icon: 'arrow-left-right',
                iconBg: 'linear-gradient(135deg, #f59e0b, #d97706)',
                title: '両方向モードに挑戦',
                description: '12音階両方向モードで完全習得を目指す',
                buttonText: '12音階両方向を開始',
                actionId: 'next-step-12tone-descending-upgrade'
            },
            records: {
                icon: 'trending-up',
                iconBg: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
                title: '成長の軌跡を確認',
                description: 'トレーニング記録であなたの上達を可視化',
                buttonText: '記録を見る',
                actionId: 'next-step-12tone-descending-records'
            }
        },
        '12tone-both': {
            practice: {
                icon: 'repeat',
                iconBg: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                title: 'もっと練習する',
                description: '12音階両方向モードで完全習得を継続',
                buttonText: '同じモードで再挑戦',
                actionId: 'next-step-12tone-both-practice'
            },
            upgrade: {
                icon: 'trophy',
                iconBg: 'linear-gradient(135deg, #f59e0b, #d97706)',
                title: '最上級モード達成',
                description: 'おめでとうございます！全モードをマスターしました',
                buttonText: '完了',
                actionId: null,
                disabled: true
            },
            records: {
                icon: 'trending-up',
                iconBg: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
                title: '成長の軌跡を確認',
                description: 'トレーニング記録であなたの上達を可視化',
                buttonText: '記録を見る',
                actionId: 'next-step-12tone-both-records'
            }
        }
    };

    // 【修正v4.0.7】現在のモードの設定を取得（12音階モードはchromaticDirectionで判定）
    let modeKey = currentMode;
    if (currentMode === '12tone' && chromaticDirection) {
        modeKey = `12tone-${chromaticDirection}`;
    }
    const config = nextStepsConfig[modeKey] || nextStepsConfig['random'];

    // ModeControllerで完全なモード名を生成（description表示用）
    let fullModeName = '';
    if (window.ModeController) {
        fullModeName = window.ModeController.generatePageTitle(currentMode, {
            chromaticDirection: chromaticDirection,
            scaleDirection: scaleDirection
        });
    }

    // 3つのカードを生成
    const cards = ['practice', 'upgrade', 'records'];
    container.innerHTML = cards.map(cardType => {
        const card = config[cardType];
        const disabledClass = card.disabled ? 'disabled' : '';

        // 【修正v4.0.7】descriptionに完全なモード名（上昇・下降と上行・下行を含む）を表示
        let description = card.description;
        if (fullModeName && currentMode === '12tone') {
            // 「12音階上昇モード」「12音階下降モード」「12音階両方向モード」を完全なモード名に置換
            description = description.replace(/12音階(?:上昇|下降|両方向)?モード/, fullModeName);
        }

        return `
            <div class="next-step-card ${disabledClass}" ${card.actionId ? `data-action-id="${card.actionId}"` : ''}>
                <div class="next-step-card-icon" style="background: ${card.iconBg};">
                    <i data-lucide="${card.icon}" class="text-white" style="width: 24px; height: 24px;"></i>
                </div>
                <h3 class="next-step-card-title">${card.title}</h3>
                <p class="next-step-card-description">${description}</p>
                <button class="btn ${card.disabled ? 'btn-outline' : 'btn-primary'}" ${card.disabled ? 'disabled' : ''}>
                    ${card.buttonText}
                </button>
            </div>
        `;
    }).join('');

    // イベントリスナーを追加
    container.querySelectorAll('.next-step-card').forEach(card => {
        const actionId = card.getAttribute('data-action-id');
        if (actionId) {
            card.addEventListener('click', () => handleNextStepAction(actionId));
        }
    });
}

/**
 * 次のステップアクション処理
 * @param {string} actionId - アクションID
 */
function handleNextStepAction(actionId) {
    console.log('🎯 Next step action:', actionId);

    const actions = {
        // ランダム基音モード
        'next-step-random-practice': () => window.location.hash = 'preparation?mode=random',
        'next-step-random-upgrade': () => window.location.hash = 'preparation?mode=continuous',
        'next-step-random-records': () => {
            sessionStorage.clear();
            window.location.hash = 'records';
        },

        // 連続チャレンジモード
        'next-step-continuous-practice': () => window.location.hash = 'preparation?mode=continuous',
        'next-step-continuous-upgrade': () => window.location.hash = 'preparation?mode=12tone&direction=ascending',
        'next-step-continuous-records': () => {
            sessionStorage.clear();
            window.location.hash = 'records';
        },

        // 12音階モード（上昇）
        'next-step-12tone-ascending-practice': () => window.location.hash = 'preparation?mode=12tone&direction=ascending',
        'next-step-12tone-ascending-upgrade': () => window.location.hash = 'preparation?mode=12tone&direction=descending',
        'next-step-12tone-ascending-records': () => {
            sessionStorage.clear();
            window.location.hash = 'records';
        },

        // 12音階モード（下降）
        'next-step-12tone-descending-practice': () => window.location.hash = 'preparation?mode=12tone&direction=descending',
        'next-step-12tone-descending-upgrade': () => window.location.hash = 'preparation?mode=12tone&direction=both',
        'next-step-12tone-descending-records': () => {
            sessionStorage.clear();
            window.location.hash = 'records';
        },

        // 12音階モード（両方向）
        'next-step-12tone-both-practice': () => window.location.hash = 'preparation?mode=12tone&direction=both',
        'next-step-12tone-both-records': () => {
            sessionStorage.clear();
            window.location.hash = 'records';
        },

        // 下行モード（将来実装）
        'next-step-random-down-practice': () => window.location.hash = 'preparation?mode=random-down',
        'next-step-random-down-upgrade': () => window.location.hash = 'preparation?mode=continuous-down',
        'next-step-random-down-records': () => {
            sessionStorage.clear();
            window.location.hash = 'records';
        },

        'next-step-continuous-down-practice': () => window.location.hash = 'preparation?mode=continuous-down',
        'next-step-continuous-down-records': () => {
            sessionStorage.clear();
            window.location.hash = 'records';
        }
    };

    const action = actions[actionId];
    if (action) {
        action();
    } else {
        console.warn('⚠️ Unknown action ID:', actionId);
    }
}

/**
 * DOMContentLoaded時の初期化（直接ページアクセス時用）
 */
document.addEventListener('DOMContentLoaded', async function() {
    console.log('📊 [DOMContentLoaded] results-overview初期化');

    // Lucideアイコン初期化（統合初期化関数を使用）
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

/**
 * トレーニング記録からの遷移時のUI調整
 * - 次のステップセクションを非表示
 * - プレミアム比較セクションを非表示
 * - トレーニング記録へ戻るボタンを追加
 */
function handleRecordsViewMode() {
    console.log('📊 [Records View Mode] UI調整開始');

    // 重複実行防止チェック
    if (document.getElementById('records-back-button')) {
        console.log('⚠️ すでにUI調整済み、スキップします');
        return;
    }

    // 次のステップセクションを非表示（テキストで検索）
    const allSections = document.querySelectorAll('main.wide-main > section.glass-card');
    console.log(`📊 [Records View Mode] 検索対象セクション数: ${allSections.length}`);

    allSections.forEach(section => {
        const heading = section.querySelector('h2.heading-md span, h2 span');
        if (heading) {
            const text = heading.textContent.trim();
            console.log(`📊 [Records View Mode] セクション見出し: "${text}"`);
            if (text === '次のステップ') {
                section.style.display = 'none';
                console.log('✅ 次のステップセクションを非表示化');
            } else if (text === '無料版 vs プレミアム版') {
                section.style.display = 'none';
                console.log('✅ プレミアム比較セクションを非表示化');
            }
        }
    });

    // ページヘッダーに実行日を追加
    const pageSubtitle = document.querySelector('.page-subtitle');
    if (pageSubtitle && window.filteredSessionData && window.filteredSessionData.length > 0) {
        const latestSession = window.filteredSessionData[window.filteredSessionData.length - 1];
        const date = new Date(latestSession.startTime);
        const dateStr = `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
        pageSubtitle.textContent = `実行日時: ${dateStr}`;
        pageSubtitle.classList.add('records-view-date'); // 上書き防止フラグ
        console.log('✅ 実行日時を表示');
    }

    // トレーニング記録へ戻るボタンを追加（containerの一番下に配置）
    const container = document.querySelector('.container.container-results-overview');
    if (container) {
        const backButtonWrapper = document.createElement('div');
        backButtonWrapper.id = 'records-back-button'; // ID追加で重複防止
        backButtonWrapper.style.textAlign = 'center';
        backButtonWrapper.style.marginTop = '2rem';
        backButtonWrapper.style.marginBottom = '2rem';
        backButtonWrapper.innerHTML = `
            <button class="btn btn-outline" onclick="window.NavigationManager.navigate('records')">
                <i data-lucide="arrow-left"></i>
                <span>トレーニング記録に戻る</span>
            </button>
        `;
        // containerの一番下に追加
        container.appendChild(backButtonWrapper);
        console.log('✅ トレーニング記録へ戻るボタンを追加');
    }
}

// グローバルに公開
window.toggleGradePopover = toggleGradePopover;
window.toggleSessionRankPopover = toggleSessionRankPopover;

// グローバル関数が定義されたことを通知
console.log('✅ [results-overview-controller] window.initResultsOverview defined');
console.log('✅ [results-overview-controller] window.toggleGradePopover:', typeof window.toggleGradePopover);
console.log('✅ [results-overview-controller] window.toggleSessionRankPopover:', typeof window.toggleSessionRankPopover);
