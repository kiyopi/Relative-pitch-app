/**
 * Preparation Controller - SPA版（正規版連携）
 *
 * 正規版のpreparation-pitchpro-cycle.js + voice-range-test.jsを
 * SPA環境で使用するための軽量ラッパー
 *
 * 正規版の実装（3,000行以上の完全なロジック）をそのまま活用し、
 * マイク許可（AudioDetectionComponentインスタンス）をページ間で引き継ぐ
 */

/**
 * URLパラメータを取得
 * @returns {Object} URLパラメータ { redirect, mode, session, direction }
 */
function getUrlParams() {
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash.split('?')[1] || '');

    return {
        redirect: params.get('redirect'),
        mode: params.get('mode'),
        session: params.get('session'),
        direction: params.get('direction') // 12音階モード方向パラメータ
    };
}

/**
 * リダイレクト情報を取得（メッセージ表示用）
 * @param {Object} urlParams - URLパラメータ
 * @returns {Object|null} リダイレクト情報 { redirect, mode, session }
 */
function getRedirectInfo(urlParams) {
    // redirectパラメータがある場合のみredirectInfoを生成
    // ホームページからの通常遷移ではメッセージを表示しない
    if (!urlParams.redirect) return null;

    return {
        redirect: urlParams.redirect,
        mode: urlParams.mode,
        session: urlParams.session,
        direction: urlParams.direction // 【追加v4.0.7】12音階モード方向パラメータ
    };
}

/**
 * モード別サブタイトルを更新
 * @param {string} mode - トレーニングモード
 * @param {string|null} direction - 12音階モード方向
 */
function updateModeSubtitle(mode, direction = null) {
    const subtitleElement = document.getElementById('preparation-mode-subtitle');
    if (!subtitleElement) return;

    // 【修正v4.0.7】ModeControllerを使用してモード名を生成（direction情報を含む完全なタイトル）
    let subtitle = 'トレーニングモード';
    if (window.ModeController) {
        subtitle = window.ModeController.generatePageTitle(mode, {
            chromaticDirection: direction,
            scaleDirection: 'ascending' // デフォルト（上行モード）
        });
    }

    subtitleElement.textContent = subtitle;
    console.log(`✅ [PreparationController] サブタイトル更新: ${subtitle}`);
}

/**
 * リダイレクトメッセージを表示
 * @param {Object} info - リダイレクト情報
 */
function showRedirectMessage(info) {
    // 【修正v4.0.7】ModeControllerを使用してモード名を生成（direction情報を含む完全なタイトル）
    let modeName = 'トレーニング';
    if (window.ModeController) {
        modeName = window.ModeController.generatePageTitle(info.mode, {
            chromaticDirection: info.direction,
            scaleDirection: 'ascending' // デフォルト（上行モード）
        });
    }

    // UI にメッセージを表示
    const messageContainer = document.getElementById('redirect-message');
    if (messageContainer) {
        messageContainer.innerHTML = `
            <div class="glass-card" style="background: rgba(59, 130, 246, 0.1); border: 1px solid rgba(59, 130, 246, 0.3); padding: 12px; margin-bottom: 16px; border-radius: 8px;">
                <div style="display: flex; align-items: center; gap: 12px;">
                    <i data-lucide="info" style="width: 24px; height: 24px; color: #60a5fa; flex-shrink: 0;"></i>
                    <div>
                        <div style="color: #93c5fd; font-weight: 600;">${modeName}</div>
                        <div style="color: #93c5fd; font-size: 14px; margin-top: 4px;">
                            準備完了後、トレーニングページに移動します
                        </div>
                    </div>
                </div>
            </div>
        `;
        // Lucideアイコンを再描画
        if (typeof lucide !== 'undefined') {
            if (typeof window.initializeLucideIcons === 'function') window.initializeLucideIcons({ immediate: true });
        }
    }
}

export async function initializePreparationPage() {
    console.log('🚀 PreparationController initializing (SPA version)...');

    // 【デバッグ】現在のURL確認
    console.log('🔍 [DEBUG] hash:', window.location.hash);

    // URLパラメータを取得
    const urlParams = getUrlParams();
    console.log('🔍 [DEBUG] urlParams:', urlParams);

    // モード情報が必須（mode パラメータがない場合はエラー）
    if (!urlParams.mode) {
        console.warn('⚠️ [DEBUG] モード情報なし - URLパラメータを確認してください');
        console.warn('⚠️ [DEBUG] URLにmode=continuous等のパラメータが必要です');
        alert('モード選択エラー：ホームページからモードを選択してください。');
        window.location.hash = 'home';
        return;
    }

    // 【重要】モード情報を常に保存（音域テスト完了時に使用）
    window.preparationRedirectInfo = {
        mode: urlParams.mode,
        session: urlParams.session,
        direction: urlParams.direction // 12音階モード方向パラメータ
    };
    console.log('✅ [DEBUG] モード情報を保存:', window.preparationRedirectInfo);

    // サブタイトルをモード別に更新
    updateModeSubtitle(urlParams.mode, urlParams.direction);

    // リダイレクト情報を取得（メッセージ表示用）
    const redirectInfo = getRedirectInfo(urlParams);
    console.log('🔍 [DEBUG] redirectInfo:', redirectInfo);

    // redirectパラメータがある場合のみメッセージを表示
    if (redirectInfo) {
        console.log(`📍 リダイレクト先: ${redirectInfo.redirect}?mode=${redirectInfo.mode}&session=${redirectInfo.session || 'なし'}`);
        showRedirectMessage(redirectInfo);
    }

    // 正規版の初期化関数を呼び出す
    if (typeof window.initializePreparationPitchProCycle === 'function') {
        await window.initializePreparationPitchProCycle();
        console.log('✅ 正規版の初期化完了（preparation-pitchpro-cycle.js）');
    } else {
        console.error('❌ window.initializePreparationPitchProCycle が見つかりません');
        console.error('確認: pages/js/preparation-pitchpro-cycle.js が正しく読み込まれていますか？');
    }
}

/**
 * リセット関数（router.jsから呼び出される）
 *
 * 注意: 正規版は状態をwindow.globalAudioDetectorで管理するため、
 * SPA環境では特別なリセット処理は不要
 */
export function resetPreparationPageFlag() {
    console.log('PreparationController reset (SPA version)');
    // window.globalAudioDetectorはSPA全体で共有されるため、リセット不要
}
