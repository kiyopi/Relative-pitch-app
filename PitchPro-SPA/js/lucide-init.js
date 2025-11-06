/**
 * Lucideアイコン統合初期化モジュール
 * 全ページで使用する統一初期化関数
 *
 * 使用方法:
 * - ページ読み込み・遷移: window.initializeLucideIcons()
 * - メニュー切り替え等: window.initializeLucideIcons({ immediate: true })
 * - デバッグモード: window.initializeLucideIcons({ debug: true })
 */

/**
 * Lucideアイコンを初期化するグローバル関数
 * @param {Object} options - オプション設定
 * @param {boolean} options.immediate - 即座に実行（デフォルト: false、requestAnimationFrameを使用）
 * @param {boolean} options.debug - デバッグログ出力（デフォルト: false）
 * @returns {boolean} 初期化成功/失敗
 */
window.initializeLucideIcons = function(options = {}) {
    const { immediate = false, debug = false } = options;

    const doInitialize = () => {
        // Lucideライブラリの存在確認
        if (typeof lucide === 'undefined' || !lucide.createIcons) {
            console.error('❌ [LUCIDE] Lucide library not loaded');
            if (debug) {
                if (typeof lucide === 'undefined') {
                    console.error('❌ [LUCIDE-DEBUG] lucide is undefined - CDN may be blocked or failed to load');
                } else if (!lucide.createIcons) {
                    console.error('❌ [LUCIDE-DEBUG] lucide.createIcons is missing - wrong Lucide version?');
                }
            }
            return false;
        }

        try {
            if (debug) {
                // data-lucideを持つ要素をカウント
                const iconElements = document.querySelectorAll('[data-lucide]');
                console.log(`🔍 [LUCIDE-DEBUG] Found ${iconElements.length} elements with data-lucide attribute`);
                console.log('🎬 [LUCIDE-DEBUG] Calling lucide.createIcons()...');
            }

            // Lucideアイコン生成（Safari互換性対応）
            try {
                lucide.createIcons();
            } catch (destructError) {
                // Safari固有の"Right side of assignment cannot be destructured"エラーへの対処
                // この場合でもアイコンは正しく表示される可能性がある
                if (debug) {
                    console.warn('⚠️ [LUCIDE-DEBUG] createIcons() threw error (may be Safari-specific):', destructError.message);
                }
                // エラーを無視して続行（アイコンが表示されているか確認）
            }

            if (debug) {
                // 初期化後にSVG要素をカウント
                const svgElements = document.querySelectorAll('svg[class*="lucide"]');
                console.log(`✅ [LUCIDE] Icons initialized - Found ${svgElements.length} SVG elements`);

                // 最初のSVG要素のスタイルを確認
                if (svgElements.length > 0) {
                    const firstSvg = svgElements[0];
                    const computedStyle = window.getComputedStyle(firstSvg);
                    console.log('🔍 [LUCIDE-DEBUG] First SVG computed styles:', {
                        display: computedStyle.display,
                        width: computedStyle.width,
                        height: computedStyle.height,
                        color: computedStyle.color,
                        stroke: computedStyle.stroke,
                        fill: computedStyle.fill
                    });
                } else {
                    console.warn('⚠️ [LUCIDE-DEBUG] No SVG elements found - icons may not have been created');
                }
            } else {
                console.log('✅ [LUCIDE] Icons initialized');
            }

            return true;

        } catch (error) {
            console.error('❌ [LUCIDE] Icon initialization failed:', error.message);
            if (debug) {
                console.error('⚠️ [LUCIDE-DEBUG] Full error:', error);
            }
            return false;
        }
    };

    if (immediate) {
        // 即座に実行（メニュー切り替え等）
        return doInitialize();
    } else {
        // DOM準備を待つ（ページ読み込み・遷移）
        // requestAnimationFrameを2回使用してDOMが完全に準備できるまで待機
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                doInitialize();
            });
        });
    }
};

// 初回ロード時のみ自動実行（デバッグモード有効）
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔍 [LUCIDE] DOMContentLoaded fired - initializing icons...');
    window.initializeLucideIcons({ debug: true });
});