/**
 * セッション結果ページコントローラー
 * @version 1.1.0
 *
 * 変更履歴:
 * - 1.1.0: リロード検出機能を追加（ReloadManager統合）
 */

// グローバル初期化関数（SPA用）
async function initializeResultSessionPage() {
    console.log('📊 セッション結果ページ初期化開始');

    // 【ReloadManager統合】リロード検出 → preparationへリダイレクト
    if (ReloadManager.detectReload()) {
        console.warn('⚠️ result-sessionでリロード検出 - preparationへリダイレクト');
        ReloadManager.showReloadDialog();
        await ReloadManager.redirectToPreparation('result-sessionでリロード検出');
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
        // localStorageから最新のセッションデータを取得
        const allSessions = DataManager.getFromStorage('sessionData') || [];

        if (allSessions.length === 0) {
            console.warn('⚠️ 保存されたセッションデータがありません');
            return null;
        }

        // 指定されたセッション番号のデータを取得（重複IDがある場合は最新のものを使用）
        const matchingSessions = allSessions.filter(s => s.sessionId === sessionNumber);

        if (matchingSessions.length === 0) {
            console.warn(`⚠️ セッションID ${sessionNumber} が見つかりません。最新セッションを使用します。`);
            const latestSession = allSessions[allSessions.length - 1];
            console.log(`📊 最新セッション使用: ID ${latestSession.sessionId}, 基音 ${latestSession.baseNote}`);
            return latestSession;
        }

        // 重複IDがある場合は最新のものを取得（配列の最後）
        const session = matchingSessions[matchingSessions.length - 1];

        if (matchingSessions.length > 1) {
            console.warn(`⚠️ セッションID ${sessionNumber} が${matchingSessions.length}件見つかりました。最新のものを使用します。`);
        }

        console.log(`📊 セッションデータ読み込み: ID ${session.sessionId}, 基音 ${session.baseNote} (${session.baseFrequency.toFixed(1)}Hz)`);
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

    // 平均誤差計算
    const errors = sessionData.pitchErrors.map(e => e.errorInCents);
    const avgError = errors.reduce((a, b) => a + b, 0) / errors.length;

    const avgErrorEl = document.getElementById('average-error');
    if (avgErrorEl) {
        avgErrorEl.textContent = `${avgError >= 0 ? '+' : ''}${avgError.toFixed(1)}¢`;
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
 * 評価分布を表示
 */
function displayEvaluationDistribution(pitchErrors) {
    const distribution = {
        excellent: 0,
        good: 0,
        pass: 0,
        practice: 0
    };

    pitchErrors.forEach(error => {
        const absError = Math.abs(error.errorInCents);
        if (absError <= 15) distribution.excellent++;
        else if (absError <= 25) distribution.good++;
        else if (absError <= 40) distribution.pass++;
        else distribution.practice++;
    });

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
            <i data-lucide="triangle-alert" class="text-red-300" style="width: 20px; height: 20px; flex-shrink: 0;"></i>
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
 * 精度バッジを表示
 */
function displayAccuracyBadge(avgError) {
    const badge = document.querySelector('.accuracy-badge');
    const message = document.querySelector('.trophy-section p');

    if (!badge || !message) return;

    // 既存のクラスを削除
    badge.className = 'accuracy-badge relative';

    if (avgError <= 15) {
        badge.classList.add('accuracy-badge-excellent');
        badge.innerHTML = '<i data-lucide="trophy" class="text-yellow-300 accuracy-icon"></i>';
        message.textContent = '素晴らしい精度！';
    } else if (avgError <= 25) {
        badge.classList.add('accuracy-badge-good');
        badge.innerHTML = '<i data-lucide="star" class="text-green-300 accuracy-icon"></i>';
        message.textContent = '良好な精度！';
    } else if (avgError <= 40) {
        badge.classList.add('accuracy-badge-pass');
        badge.innerHTML = '<i data-lucide="thumbs-up" class="text-blue-300 accuracy-icon"></i>';
        message.textContent = '合格ライン達成！';
    } else {
        badge.classList.add('accuracy-badge-practice');
        badge.innerHTML = '<i data-lucide="triangle-alert" class="text-red-300 accuracy-icon"></i>';
        message.textContent = '練習を続けましょう！';
    }

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
 * 詳細分析を表示
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
        let evalIcon = '';
        let evalColor = '';
        let iconTransform = '';

        if (absError <= 15) {
            evalIcon = 'trophy';
            evalColor = 'text-yellow-300';
        } else if (absError <= 25) {
            evalIcon = 'star';
            evalColor = 'text-green-300';
        } else if (absError <= 40) {
            evalIcon = 'thumbs-up';
            evalColor = 'text-blue-300';
            iconTransform = 'transform: translateY(-2px) translateX(2px);';
        } else {
            evalIcon = 'triangle-alert';
            evalColor = 'text-red-300';
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
                    <div class="${deviationClass}">${error.errorInCents >= 0 ? '+' : ''}${error.errorInCents}¢</div>
                    <div class="flex items-center justify-center">
                        <i data-lucide="${evalIcon}" class="${evalColor}" style="width: 28px; height: 28px; ${iconTransform}"></i>
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
            button.onclick = () => window.location.hash = 'results-overview';
            button.innerHTML = '<i data-lucide="trophy" style="width: 24px; height: 24px;"></i><span>総合評価を見る</span>';
            console.log('✅ 8セッション完了 - 総合評価ボタン表示');
        } else {
            // 次のセッションへ（ReloadManager統合）
            button.onclick = () => {
                ReloadManager.navigateToTraining();
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
        pitchErrors: [
            { step: 0, expectedNote: 'C4', errorInCents: 2.5 },
            { step: 1, expectedNote: 'D4', errorInCents: -5.3 },
            { step: 2, expectedNote: 'E4', errorInCents: 8.7 },
            { step: 3, expectedNote: 'F4', errorInCents: -3.2 },
            { step: 4, expectedNote: 'G4', errorInCents: 12.1 },
            { step: 5, expectedNote: 'A4', errorInCents: -7.8 },
            { step: 6, expectedNote: 'B4', errorInCents: 4.9 },
            { step: 7, expectedNote: 'C5', errorInCents: -1.6 }
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
