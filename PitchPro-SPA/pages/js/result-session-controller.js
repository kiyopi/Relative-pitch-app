/**
 * セッション結果ページコントローラー
 * @version 2.0.0
 *
 * 変更履歴:
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

    // 【v1.3.0変更】リロード検出を復活
    // NavigationManager が改善され、古いAPI（performance.navigation.type）を優先するため、
    // Safari での SPA 遷移誤検出が解消された
    // 手動リロード（F5）の場合は preparation へリダイレクトし、マイク許可を再取得
    if (NavigationManager.detectReload()) {
        console.warn('⚠️ result-sessionでリロード検出 - preparationへリダイレクト');
        NavigationManager.showReloadDialog();
        await NavigationManager.redirectToPreparation('result-sessionでリロード検出');
        return; // リダイレクト後は以降の処理を実行しない
    }

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
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
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

        // 【修正】現在のモードを取得（最新セッションのモード）
        const latestSession = allSessions[allSessions.length - 1];
        const currentMode = latestSession.mode;
        console.log(`🔍 [DEBUG] 現在のモード: ${currentMode}`);

        // 現在のモードのセッションのみをフィルタリング
        const currentModeSessions = allSessions.filter(s => s.mode === currentMode);
        console.log(`🔍 [DEBUG] ${currentMode}モードのセッション数: ${currentModeSessions.length}`);

        // sessionNumberは1から始まるので、配列インデックスに変換（-1）
        const sessionIndex = sessionNumber - 1;

        if (sessionIndex < 0 || sessionIndex >= currentModeSessions.length) {
            console.warn(`⚠️ セッション番号 ${sessionNumber} が範囲外です（1-${currentModeSessions.length}）。最新セッションを使用します。`);
            const session = currentModeSessions[currentModeSessions.length - 1];
            console.log(`📊 最新セッション使用: ID ${session.sessionId}, 基音 ${session.baseNote}`);
            return session;
        }

        // 指定された番号のセッションを取得
        const session = currentModeSessions[sessionIndex];
        console.log(`📊 セッションデータ読み込み: 番号 ${sessionNumber}, ID ${session.sessionId}, 基音 ${session.baseNote} (${session.baseFrequency.toFixed(1)}Hz)`);
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

    // 平均誤差計算（絶対値の平均 - 音程のズレの大きさを測定）
    const errors = sessionData.pitchErrors.map(e => e.errorInCents);
    const avgError = errors.reduce((sum, e) => sum + Math.abs(e), 0) / errors.length;

    const avgErrorEl = document.getElementById('average-error');
    if (avgErrorEl) {
        avgErrorEl.textContent = `±${avgError.toFixed(1)}¢`;
    }

    // 評価分布計算・表示
    displayEvaluationDistribution(sessionData.pitchErrors);

    // 精度ランク表示
    displayAccuracyBadge(Math.abs(avgError));

    // 詳細分析表示
    displayDetailedAnalysis(sessionData.pitchErrors);

    // 次のセッションボタン更新
    updateNextSessionButton(sessionNumber);
}

/**
 * 評価分布を表示（v2.0.0: EvaluationCalculator統合）
 */
function displayEvaluationDistribution(pitchErrors) {
    // 統合評価関数を使用
    const distribution = EvaluationCalculator.calculateDistribution(pitchErrors);
    const total = pitchErrors.length;
    const container = document.querySelector('.flex.flex-col.gap-3.px-4');

    if (!container) return;

    container.innerHTML = `
        <!-- Excellent -->
        <div class="flex items-center gap-3">
            <i data-lucide="trophy" class="text-yellow-300" style="width: 20px; height: 20px; flex-shrink: 0;"></i>
            <div class="progress-bar flex">
                <div class="progress-fill-custom color-eval-gold" style="width: ${(distribution.excellent / total * 100)}%;"></div>
            </div>
            <span class="text-sm text-white-60" style="min-width: 20px; text-align: right;">${distribution.excellent}</span>
        </div>

        <!-- Good -->
        <div class="flex items-center gap-3">
            <i data-lucide="star" class="text-green-300" style="width: 20px; height: 20px; flex-shrink: 0;"></i>
            <div class="progress-bar flex">
                <div class="progress-fill-custom color-eval-good" style="width: ${(distribution.good / total * 100)}%;"></div>
            </div>
            <span class="text-sm text-white-60" style="min-width: 20px; text-align: right;">${distribution.good}</span>
        </div>

        <!-- Pass -->
        <div class="flex items-center gap-3">
            <i data-lucide="thumbs-up" class="text-blue-300" style="width: 20px; height: 20px; flex-shrink: 0;"></i>
            <div class="progress-bar flex">
                <div class="progress-fill-custom color-eval-pass" style="width: ${(distribution.pass / total * 100)}%;"></div>
            </div>
            <span class="text-sm text-white-60" style="min-width: 20px; text-align: right;">${distribution.pass}</span>
        </div>

        <!-- Practice -->
        <div class="flex items-center gap-3">
            <i data-lucide="alert-triangle" class="text-red-300" style="width: 20px; height: 20px; flex-shrink: 0;"></i>
            <div class="progress-bar flex">
                <div class="progress-fill-custom color-eval-practice" style="width: ${(distribution.practice / total * 100)}%;"></div>
            </div>
            <span class="text-sm text-white-60" style="min-width: 20px; text-align: right;">${distribution.practice}</span>
        </div>
    `;

    // Lucideアイコン再初期化
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
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
    badge.innerHTML = `<i data-lucide="${evaluation.icon}" class="${evaluation.color} accuracy-icon"></i>`;
    message.textContent = evaluation.message;

    // ヘルプボタンを再追加
    badge.innerHTML += `
        <button class="rank-info-btn help-btn-position" onclick="toggleRankPopover()">
            <i data-lucide="help-circle" class="text-white" style="width: 20px !important; height: 20px !important;"></i>
        </button>
    `;

    // Lucideアイコン再初期化
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
}

/**
 * 詳細分析を表示（v2.0.0: EvaluationCalculator統合）
 */
function displayDetailedAnalysis(pitchErrors) {
    const container = document.getElementById('note-results');
    if (!container) {
        console.warn('⚠️ #note-resultsコンテナが見つかりません');
        return;
    }

    const noteNames = ['ド', 'レ', 'ミ', 'ファ', 'ソ', 'ラ', 'シ', 'ド'];
    container.innerHTML = '';

    pitchErrors.forEach((error, index) => {
        const absError = Math.abs(error.errorInCents);

        // 統合評価関数を使用
        const evaluation = EvaluationCalculator.evaluatePitchError(absError);

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
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
}

/**
 * 次のセッションボタンを更新
 */
function updateNextSessionButton(sessionNumber) {
    const buttons = document.querySelectorAll('.btn-next-session');

    // localStorageから現在のモードのセッション数を取得
    const allSessions = DataManager.getFromStorage('sessionData') || [];
    const currentMode = 'random'; // 現在はランダムモードのみ実装
    const completedSessionsInMode = allSessions.filter(s => s.mode === currentMode && s.completed).length;

    console.log(`📊 モード別セッション進行: ${currentMode}モードで${completedSessionsInMode}/8セッション完了`);

    buttons.forEach(button => {
        if (completedSessionsInMode >= 8) {
            // 8セッション完了時は総合評価へ
            button.onclick = () => {
                // 【統一ナビゲーション】NavigationManager.navigate()を使用
                if (window.NavigationManager) {
                    window.NavigationManager.navigate('results-overview');
                } else {
                    window.location.hash = 'results-overview';
                }
            };
            button.innerHTML = '<i data-lucide="trophy" style="width: 24px; height: 24px;"></i><span>総合評価を見る</span>';
            console.log('✅ 8セッション完了 - 総合評価ボタン表示');
        } else {
            // 次のセッションへ（NavigationManager統合）
            button.onclick = () => {
                // 【変更】removeBrowserBackPrevention()はNavigationManagerが自動実行
                NavigationManager.navigateToTraining();
            };
            button.innerHTML = '<i data-lucide="arrow-right" style="width: 24px; height: 24px;"></i><span>次の基音へ</span>';
            console.log(`➡️ セッション${completedSessionsInMode + 1}/8 - 次のセッションボタン表示`);
        }
    });

    // Lucideアイコン再初期化
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
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
    const helpBtn = event.target.closest('.rank-info-btn');

    if (popover && !helpBtn && popover.classList.contains('show')) {
        popover.classList.remove('show');
    }
});

// グローバルに公開
window.toggleRankPopover = toggleRankPopover;
window.initializeResultSessionPage = initializeResultSessionPage;
