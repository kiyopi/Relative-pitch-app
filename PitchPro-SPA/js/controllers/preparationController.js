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
 * リダイレクト情報を取得
 * @returns {Object|null} リダイレクト情報 { redirect, mode, session }
 */
function getRedirectInfo() {
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash.split('?')[1] || '');

    const redirect = params.get('redirect');
    const mode = params.get('mode');
    const session = params.get('session');

    if (!redirect) return null;

    return { redirect, mode, session };
}

/**
 * リダイレクトメッセージを表示
 * @param {Object} info - リダイレクト情報
 */
function showRedirectMessage(info) {
    const modeNames = {
        'random': 'ランダム基音トレーニング',
        'continuous': '連続チャレンジモード',
        '12tone': '12音階モード'
    };
    const modeName = modeNames[info.mode] || 'トレーニング';

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
                            準備完了後、自動的にトレーニングに移動します
                        </div>
                    </div>
                </div>
            </div>
        `;
        // Lucideアイコンを再描画
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }
}

export async function initializePreparationPage() {
    console.log('🚀 PreparationController initializing (SPA version)...');

    // 【新規追加】リダイレクト情報を取得
    const redirectInfo = getRedirectInfo();
    if (redirectInfo) {
        console.log(`📍 リダイレクト先: ${redirectInfo.redirect}?mode=${redirectInfo.mode}&session=${redirectInfo.session || 'なし'}`);
        showRedirectMessage(redirectInfo);
        // グローバル変数に保存（音域テスト完了時に使用）
        window.preparationRedirectInfo = redirectInfo;
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
