/**
 * Preparation Controller - SPA版（正規版連携）
 *
 * 正規版のpreparation-pitchpro-cycle.js + voice-range-test.jsを
 * SPA環境で使用するための軽量ラッパー
 *
 * 正規版の実装（3,000行以上の完全なロジック）をそのまま活用し、
 * マイク許可（AudioDetectionComponentインスタンス）をページ間で引き継ぐ
 */

export async function initializePreparationPage() {
    console.log('🚀 PreparationController initializing (SPA version)...');

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
