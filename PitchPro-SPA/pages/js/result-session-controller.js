/**
 * セッション結果ページコントローラー
 * @version 2.5.1
 * @lastUpdate 2025-11-18
 *
 * 変更履歴:
 * - 2.5.1: Bug修正 - displayEvaluationDistribution関数名の衝突解決
 *   - records-controller.jsと関数名が重複していた問題を修正
 *   - 関数名をdisplaySessionEvaluationDistribution()に変更
 *   - グラフが表示されない問題を解決
 * - 2.5.0: 2フラグシステム統一 - preparation/trainingと同じアクセス制御
 *   - checkPageAccess()による統一的なリロード検出・ダイレクトアクセス防止
 *   - normalTransitionToResultSession + resultSessionPageActive の2フラグ運用
 *   - リロード時のマイク許可放棄 → 次セッションでのダイアログ出現問題を解決
 *   - ドレミガイド進行中のマイク許可ダイアログ表示によるレッスン破綻を防止
 * - 2.4.0: SessionManager統合 - 統一的なlessonId管理
 *   - SessionManager.getCurrent()でグローバルインスタンスから取得
 *   - sessionStorageへの直接アクセスをSessionManager経由に変更
 *   - lessonId取得の一貫性向上・バグ防止
 * - 2.3.0: Bug修正 - リロード検出を再度復活（trainingページと統一）
 *   - リロード時にcurrentLessonIdを削除してpreparationページへリダイレクト
 *   - 次のセッション継続時のマイク許可問題を解決
 *   - 他のページ（training・preparation）と挙動を統一
 * - 2.2.0: Bug修正 - 総合評価ページへの遷移時にlessonIdが誤って取得される問題を修正
 *   - updateNextSessionButton(): find()で最初に見つかったセッション（古いlessonId）を返す問題
 *   - 修正: sessionStorageから直接currentLessonIdを取得するように変更
 *   - 影響: 8セッション完了後の「総合評価を見る」ボタンが正しいlessonIdで遷移
 * - 2.1.0: リロード検出を完全削除（表示専用ページのため不要）← v2.3.0で撤回
 *   - バックグラウンド長時間後の誤検出問題を根本解決
 *   - ダイレクトアクセス・リロードを同じように扱う
 *   - データがない場合はダミーデータ表示で対応
 * - 2.0.0: 評価基準をv2.0.0に更新（科学的バランス型・デバイス誤差考慮）
 *   - 個別音符評価: ±15¢→±20¢, ±25¢→±35¢, ±40¢→±50¢
 *   - セッション総合バッジ: 同じ閾値に統一
 * - 1.3.0: リロード検出を復活（NavigationManager改善により誤検出を解消）
 * - 1.2.0: リロード検出を削除（表示専用ページのため不要）← 誤検出のため一時削除
 * - 1.1.0: リロード検出機能を追加（NavigationManager統合）
 */

// グローバル初期化関数（SPA用）
async function initializeResultSessionPage() {
    console.log('📊 セッション結果ページ初期化開始');

    // 【v2.5.0】アクセス制御はrouter.jsで実行済み
    // 2フラグシステム: normalTransitionToResultSession + resultSessionPageActive
    // - router.js の checkPageAccess() で既にリロード検出・ダイレクトアクセス防止済み
    // - ここで再度呼ぶと、normalTransitionフラグが削除済みのため誤検出する
    // - 従って、コントローラー側では checkPageAccess() を呼ばない

    // URLハッシュからセッション番号を取得
    const hash = window.location.hash.substring(1); // '#'を削除
    const params = new URLSearchParams(hash.split('?')[1] || '');
    const sessionNumber = parseInt(params.get('session')) || 1;

    console.log('セッション番号:', sessionNumber);

    // DataManagerから最新セッションデータを取得
    const sessionData = await loadSessionData(sessionNumber);

    if (sessionData) {
        // UIを更新
        updateSessionUI(sessionData, sessionNumber);
    } else {
        console.warn('⚠️ セッションデータが見つかりません。ダミーデータを表示します。');
        showDummyData(sessionNumber);
    }

    // Lucideアイコン再初期化
    if (typeof window.initializeLucideIcons === 'function') {
        window.initializeLucideIcons({ immediate: true });
    }
}

// SPAでない場合の従来のDOMContentLoaded初期化も残す
if (!window.location.pathname.includes('index.html')) {
    document.addEventListener('DOMContentLoaded', initializeResultSessionPage);
}

/**
 * セッションデータを読み込み
 */
async function loadSessionData(sessionNumber) {
    try {
        // 【追加】ランダムモード用の一時保持データを優先的に使用
        if (window.currentSessionResult) {
            console.log('📦 一時保持されたセッション結果を使用:', window.currentSessionResult);
            const result = window.currentSessionResult;
            // 使用後は削除
            delete window.currentSessionResult;
            return result;
        }

        // localStorageから最新のセッションデータを取得
        const allSessions = DataManager.getFromStorage('sessionData') || [];

        if (allSessions.length === 0) {
            console.warn('⚠️ 保存されたセッションデータがありません');
            return null;
        }

        // 【修正v4.1.0】SessionManager統合 - グローバルインスタンスから取得
        let currentLessonId = null;
        if (window.SessionManager) {
            const sessionManager = SessionManager.getCurrent();
            if (sessionManager) {
                currentLessonId = sessionManager.getLessonId();
                console.log(`✅ [SessionManager] lessonId取得: ${currentLessonId}`);
            }
        }

        if (!currentLessonId) {
            console.warn('⚠️ SessionManagerからlessonId取得失敗 - 最新セッション使用');
            const latestSession = allSessions[allSessions.length - 1];
            console.log(`📊 最新セッション使用: ID ${latestSession.sessionId}, lessonId ${latestSession.lessonId}`);
            return latestSession;
        }

        console.log(`🔍 [DEBUG] 現在のlessonId: ${currentLessonId}`);

        // 【修正v4.0.3】現在のlessonIdのセッションのみをフィルタリング
        const currentLessonSessions = allSessions.filter(s => s.lessonId === currentLessonId);
        console.log(`🔍 [DEBUG] lessonId=${currentLessonId}のセッション数: ${currentLessonSessions.length}`);

        // sessionNumberは1から始まるので、配列インデックスに変換（-1）
        const sessionIndex = sessionNumber - 1;

        if (sessionIndex < 0 || sessionIndex >= currentLessonSessions.length) {
            console.warn(`⚠️ セッション番号 ${sessionNumber} が範囲外です（1-${currentLessonSessions.length}）。最新セッションを使用します。`);
            const session = currentLessonSessions[currentLessonSessions.length - 1];
            console.log(`📊 最新セッション使用: ID ${session.sessionId}, 基音 ${session.baseNote}`);
            return session;
        }

        // 指定された番号のセッションを取得
        const session = currentLessonSessions[sessionIndex];
        console.log(`📊 セッションデータ読み込み: 番号 ${sessionNumber}, ID ${session.sessionId}, lessonId ${session.lessonId}, 基音 ${session.baseNote} (${session.baseFrequency.toFixed(1)}Hz)`);
        return session;

    } catch (error) {
        console.error('❌ セッションデータ読み込みエラー:', error);
        return null;
    }
}

/**
 * UIを更新
 */
function updateSessionUI(sessionData, sessionNumber) {
    console.log('📊 UIを更新:', sessionData);
    console.log('📊 pitchErrors:', sessionData.pitchErrors);

    // ヘッダー更新
    const pageTitle = document.querySelector('.page-title');
    if (pageTitle) {
        pageTitle.textContent = `セッション ${sessionNumber} 完了！`;
    }

    const pageSubtitle = document.querySelector('.page-subtitle');
    if (pageSubtitle) {
        pageSubtitle.textContent = `基音 ${sessionData.baseNote || 'C4'} - 8音の評価結果`;
    }

    // 進行バー更新
    const progressFill = document.querySelector('.progress-fill');
    const sessionBadge = document.querySelector('.session-badge');
    const progressPercentage = (sessionNumber / 8) * 100;

    if (progressFill) {
        progressFill.style.width = `${progressPercentage}%`;
    }

    if (sessionBadge) {
        sessionBadge.textContent = `セッション ${sessionNumber}/8`;
    }

    // 基音表示
    const baseNoteEl = document.getElementById('session-base-note');
    if (baseNoteEl) {
        baseNoteEl.textContent = sessionData.baseNote || 'C4';
    }

    // セッションの音程誤差データがあるか確認
    if (!sessionData.pitchErrors || sessionData.pitchErrors.length === 0) {
        console.warn('⚠️ 音程誤差データがありません');
        console.warn('⚠️ セッションデータ全体:', sessionData);
        // ダミーデータで表示を続行
        sessionData.pitchErrors = Array.from({ length: 8 }, (_, i) => ({
            step: i,
            expectedNote: ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5'][i],
            errorInCents: (Math.random() - 0.5) * 30
        }));
        console.log('✅ ダミーデータを生成:', sessionData.pitchErrors);
    }

    // 【追加】外れ値情報を計算（固定閾値180¢）
    const errors = sessionData.pitchErrors.map(e => Math.abs(e.errorInCents));
    const outlierThreshold = 180; // 全デバイス共通の固定閾値

    const validErrors = errors.filter(e => e <= outlierThreshold);
    const outlierCount = errors.length - validErrors.length;
    const outlierFiltered = outlierCount > 0;

    // 平均誤差計算（外れ値除外後）
    let avgError;
    if (validErrors.length > 0) {
        avgError = validErrors.reduce((sum, e) => sum + e, 0) / validErrors.length;
        console.log(`📊 外れ値除外: ${outlierCount}音除外（${outlierThreshold}¢超）、有効音: ${validErrors.length}/${errors.length}`);
    } else {
        avgError = errors.reduce((sum, e) => sum + e, 0) / errors.length;
        console.warn('⚠️ すべての音が外れ値と判定されました。元の値を使用します。');
    }

    const avgErrorEl = document.getElementById('average-error');
    if (avgErrorEl) {
        avgErrorEl.textContent = `±${avgError.toFixed(1)}¢`;
    }

    // 【追加】外れ値情報を表示（平均誤差の下）
    displayOutlierNotice(outlierFiltered, outlierCount);

    // 評価分布計算・表示（外れ値除外）
    const validPitchErrors = sessionData.pitchErrors.filter(e => Math.abs(e.errorInCents) <= outlierThreshold);
    displaySessionEvaluationDistribution(validPitchErrors, outlierCount);

    // 精度ランク表示
    displayAccuracyBadge(Math.abs(avgError));

    // 詳細分析表示（外れ値アイコン表示）
    displayDetailedAnalysis(sessionData.pitchErrors, outlierThreshold);

    // 【追加】外れ値説明セクション表示（詳細分析の下）
    displayOutlierExplanation(outlierFiltered, outlierCount, outlierThreshold);

    // 次のセッションボタン更新
    updateNextSessionButton(sessionNumber);

    // ローディング非表示・コンテンツ表示
    if (window.LoadingComponent) {
        window.LoadingComponent.toggle('session-result', false);
    }
}

/**
 * セッション評価分布を表示（v3.0.0: DistributionChart統合、ヘルプボタン対応）
 * @param {Array} pitchErrors - 音程誤差データ（外れ値除外済み）
 * @param {number} outlierCount - 除外された外れ値の数
 */
function displaySessionEvaluationDistribution(pitchErrors, outlierCount = 0) {
    console.log('📊 [displaySessionEvaluationDistribution] DistributionChart.render() 呼び出し開始');

    if (typeof window.DistributionChart === 'undefined') {
        console.error('❌ DistributionChart コンポーネントが読み込まれていません');
        return;
    }

    // セッションデータ形式に変換（DistributionChartは複数セッション対応）
    const sessionData = [{
        pitchErrors: pitchErrors.map(error => ({ errorInCents: error.errorInCents }))
    }];

    // ヘルプボタンを挿入
    const helpButtonContainer = document.getElementById('session-distribution-help-button-container');
    if (helpButtonContainer && typeof window.DistributionChart.getHelpButton === 'function') {
        helpButtonContainer.innerHTML = window.DistributionChart.getHelpButton('session-distribution-chart');
        console.log('✅ [displayEvaluationDistribution] ヘルプボタン挿入完了');
    }

    // DistributionChartで評価分布を表示
    window.DistributionChart.render({
        containerId: 'session-distribution-chart',
        sessionData: sessionData,
        showTrend: false,
        animate: true,
        showDescription: true,   // 説明文を表示
        showHelpButton: true     // ポップオーバー生成フラグ
    });

    console.log('✅ [displaySessionEvaluationDistribution] DistributionChart.render() 完了');
}

/**
 * 精度バッジを表示（v2.0.0: EvaluationCalculator統合）
 */
function displayAccuracyBadge(avgError) {
    const badge = document.querySelector('.accuracy-badge');
    const message = document.querySelector('.trophy-section p');

    if (!badge || !message) return;

    // 統合評価関数を使用
    const evaluation = EvaluationCalculator.evaluateAverageError(avgError);

    // 既存のクラスを削除
    badge.className = 'accuracy-badge relative';

    badge.classList.add(`accuracy-badge-${evaluation.level}`);
    badge.innerHTML = `
        <i data-lucide="${evaluation.icon}" class="${evaluation.color} accuracy-icon"></i>
        <!-- ヘルプボタン -->
        <button class="rank-info-btn help-btn-position" onclick="toggleRankPopover()">
            <i data-lucide="help-circle" class="text-white icon-help"></i>
        </button>
        <!-- 精度ランク説明ポップオーバー -->
        <div id="rank-popover" class="rank-popover">
            <button class="popover-close-btn" onclick="toggleRankPopover()">
                <i data-lucide="x" class="icon-help"></i>
            </button>
            <h4 class="popover-title">精度ランク</h4>
            <div class="rank-item">
                <i data-lucide="trophy" class="text-yellow-300 icon-md shrink-0"></i>
                <div>
                    <div class="rank-name rank-name-excellent">Excellent</div>
                    <div class="rank-range">±15セント以内</div>
                </div>
            </div>
            <div class="rank-item">
                <i data-lucide="star" class="text-green-300 icon-md shrink-0"></i>
                <div>
                    <div class="rank-name rank-name-good">Good</div>
                    <div class="rank-range">15～25セント</div>
                </div>
            </div>
            <div class="rank-item">
                <i data-lucide="thumbs-up" class="text-blue-300 icon-md shrink-0"></i>
                <div>
                    <div class="rank-name rank-name-pass">Pass</div>
                    <div class="rank-range">25～40セント</div>
                </div>
            </div>
            <div class="rank-item">
                <i data-lucide="alert-triangle" class="text-red-300 icon-md shrink-0"></i>
                <div>
                    <div class="rank-name rank-name-practice">Practice</div>
                    <div class="rank-range">40セント以上</div>
                </div>
            </div>
        </div>
    `;
    message.textContent = evaluation.message;

    // Lucideアイコン再初期化
    if (typeof window.initializeLucideIcons === 'function') {
        window.initializeLucideIcons({ immediate: true });
    }
}

/**
 * 詳細分析を表示（v2.0.0: EvaluationCalculator統合）
 */
function displayDetailedAnalysis(pitchErrors, outlierThreshold) {
    const container = document.getElementById('note-results');
    if (!container) {
        console.warn('⚠️ #note-resultsコンテナが見つかりません');
        return;
    }

    const noteNames = ['ド', 'レ', 'ミ', 'ファ', 'ソ', 'ラ', 'シ', 'ド'];
    container.innerHTML = '';

    pitchErrors.forEach((error, index) => {
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
            evaluation = EvaluationCalculator.evaluatePitchError(absError);
        }

        const iconTransform = evaluation.icon === 'thumbs-up' ? 'transform: translateY(-2px) translateX(2px);' : '';
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
                    <div class="${deviationClass}">${error.errorInCents >= 0 ? '+' : ''}${error.errorInCents}¢</div>
                    <div class="flex items-center justify-center">
                        <i data-lucide="${evaluation.icon}" class="${evaluation.color}" style="width: 28px; height: 28px; ${iconTransform}"></i>
                    </div>
                </div>
            </div>
        `;
        container.appendChild(noteElement);
    });

    // Lucideアイコン再初期化
    if (typeof window.initializeLucideIcons === 'function') {
        window.initializeLucideIcons({ immediate: true });
    }
}

/**
 * 次のセッションボタンを更新
 */
function updateNextSessionButton(sessionNumber) {
    const buttons = document.querySelectorAll('.btn-next-session');

    // 【修正v4.2.0】SessionManager統合 - グローバルインスタンスから取得
    const allSessions = DataManager.getFromStorage('sessionData') || [];

    let currentLessonId = null;
    if (window.SessionManager) {
        const sessionManager = SessionManager.getCurrent();
        if (sessionManager) {
            currentLessonId = sessionManager.getLessonId();
            console.log(`✅ [SessionManager] lessonId取得: ${currentLessonId}`);
        }
    }

    if (!currentLessonId) {
        console.error('❌ SessionManagerからlessonId取得失敗');
        return;
    }

    const currentLessonSessions = allSessions.filter(s => s.lessonId === currentLessonId && s.completed);
    const completedSessionsInLesson = currentLessonSessions.length;
    const currentMode = currentLessonSessions[0]?.mode || 'random';

    // SessionManagerから最大セッション数を取得（存在する場合）
    const maxSessions = window.sessionManager ? window.sessionManager.getMaxSessions() : 8;

    console.log(`📊 レッスン別セッション進行: lessonId=${currentLessonId}, ${completedSessionsInLesson}/${maxSessions}セッション完了`);

    buttons.forEach(button => {
        if (completedSessionsInLesson >= maxSessions) {
            // 8セッション完了時は総合評価へ
            button.onclick = () => {
                // 【修正v4.1.0】Bug修正: sessionStorageのcurrentLessonIdを直接使用
                // 問題: find()は最初に見つかったセッション（古いlessonId）を返してしまう
                // 解決: Line 406で既に取得済みのcurrentLessonIdを使用
                const lessonId = currentLessonId;

                console.log(`📋 総合評価ページへ遷移: lessonId=${lessonId} (sessionStorageから取得)`);

                // 【統一ナビゲーション】NavigationManager.navigate()を使用
                if (window.NavigationManager) {
                    window.NavigationManager.navigate('results-overview', {
                        mode: currentMode,
                        lessonId: lessonId
                    });
                } else {
                    window.location.hash = `results-overview?mode=${currentMode}&lessonId=${lessonId}`;
                }
            };
            button.innerHTML = '<i data-lucide="trophy" class="icon-md"></i><span>総合評価を見る</span>';
            console.log('✅ 8セッション完了 - 総合評価ボタン表示');
        } else {
            // 次のセッションへ（NavigationManager統合）
            button.onclick = () => {
                // 【変更】removeBrowserBackPrevention()はNavigationManagerが自動実行
                NavigationManager.navigateToTraining();
            };
            button.innerHTML = '<i data-lucide="arrow-right" style="width: 24px; height: 24px;"></i><span>次の基音へ</span>';
            console.log(`➡️ セッション${completedSessionsInLesson + 1}/${maxSessions} - 次のセッションボタン表示`);
        }
    });

    // Lucideアイコン再初期化
    if (typeof window.initializeLucideIcons === 'function') {
        window.initializeLucideIcons({ immediate: true });
    }
}

/**
 * ダミーデータを表示
 */
function showDummyData(sessionNumber) {
    console.log('📊 ダミーデータを表示');

    const dummySession = {
        sessionId: sessionNumber,
        baseNote: 'C4',
        baseFrequency: 261.63,
        pitchErrors: [
            { step: 0, expectedNote: 'C4', expectedFrequency: 261.63, detectedFrequency: 262.15, errorInCents: 2.5 },
            { step: 1, expectedNote: 'D4', expectedFrequency: 293.66, detectedFrequency: 292.74, errorInCents: -5.3 },
            { step: 2, expectedNote: 'E4', expectedFrequency: 329.63, detectedFrequency: 331.47, errorInCents: 8.7 },
            { step: 3, expectedNote: 'F4', expectedFrequency: 349.23, detectedFrequency: 348.54, errorInCents: -3.2 },
            { step: 4, expectedNote: 'G4', expectedFrequency: 392.00, detectedFrequency: 394.71, errorInCents: 12.1 },
            { step: 5, expectedNote: 'A4', expectedFrequency: 440.00, detectedFrequency: 437.62, errorInCents: -7.8 },
            { step: 6, expectedNote: 'B4', expectedFrequency: 493.88, detectedFrequency: 495.64, errorInCents: 4.9 },
            { step: 7, expectedNote: 'C5', expectedFrequency: 523.25, detectedFrequency: 522.39, errorInCents: -1.6 }
        ]
    };

    updateSessionUI(dummySession, sessionNumber);
}

/**
 * ランク説明ポップオーバーの切り替え
 */
function toggleRankPopover() {
    const popover = document.getElementById('rank-popover');
    if (popover) {
        popover.classList.toggle('show');
    }
}

// ポップオーバー外クリックで閉じる
document.addEventListener('click', function(event) {
    const popover = document.getElementById('rank-popover');
    const helpBtn = event.target.closest('.rank-info-btn, .help-icon-btn');
    const popoverContent = event.target.closest('.rank-popover');

    // ヘルプボタンまたはポップオーバー内クリックは無視
    if (popover && !helpBtn && !popoverContent && popover.classList.contains('show')) {
        popover.classList.remove('show');
    }
});

/**
 * 外れ値情報を表示（平均誤差の下に簡潔な通知）
 */
function displayOutlierNotice(outlierFiltered, outlierCount) {
    // 既存の外れ値通知を探す
    let existingNotice = document.getElementById('outlier-notice');

    // 外れ値がない場合は削除
    if (!outlierFiltered) {
        if (existingNotice) {
            existingNotice.remove();
        }
        return;
    }

    // 外れ値がある場合は表示
    if (!existingNotice) {
        // 新規作成
        existingNotice = document.createElement('div');
        existingNotice.id = 'outlier-notice';
        existingNotice.className = 'warning-alert';

        // score-gridの後に挿入
        const scoreGrid = document.querySelector('.score-grid');
        if (scoreGrid && scoreGrid.parentNode) {
            scoreGrid.parentNode.insertBefore(existingNotice, scoreGrid.nextSibling);
        }
    }

    // 内容を更新
    existingNotice.innerHTML = `
        <i data-lucide="alert-circle" class="text-amber-400"></i>
        <p>${outlierCount}音が目標の音程よりも大幅にずれています。外れ値として評価から除外しています。</p>
    `;

    // Lucideアイコン再初期化
    if (typeof window.initializeLucideIcons === 'function') {
        window.initializeLucideIcons({ immediate: true });
    }
}

/**
 * 外れ値説明セクションを表示（詳細分析の下）
 */
function displayOutlierExplanation(outlierFiltered, outlierCount, outlierThreshold) {
    // 外れ値説明用のコンテナを探す
    let explanationContainer = document.getElementById('outlier-explanation-container');

    // コンテナがなければ作成
    if (!explanationContainer) {
        explanationContainer = document.createElement('div');
        explanationContainer.id = 'outlier-explanation-container';
        // warning-alertスタイルはコンテナではなく内部要素に適用

        // 詳細分析セクションの後に挿入
        const detailedAnalysis = document.querySelector('.glass-card:has(#note-results)');
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

// グローバルに公開
window.toggleRankPopover = toggleRankPopover;
window.initializeResultSessionPage = initializeResultSessionPage;
