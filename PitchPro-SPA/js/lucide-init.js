/**
 * Lucideアイコン初期化共通モジュール
 * 全ページで使用するLucideアイコンの初期化処理
 */

// Lucideアイコン初期化（DOMが完全に準備できてから実行）
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔍 [LUCIDE-DEBUG] DOMContentLoaded fired');
    console.log('🔍 [LUCIDE-DEBUG] typeof lucide:', typeof lucide);
    console.log('🔍 [LUCIDE-DEBUG] lucide object:', lucide);

    if (typeof lucide !== 'undefined' && lucide.createIcons) {
        console.log('✅ [LUCIDE-DEBUG] Lucide library detected, createIcons exists');

        // data-lucideを持つ要素をカウント
        const iconElements = document.querySelectorAll('[data-lucide]');
        console.log(`🔍 [LUCIDE-DEBUG] Found ${iconElements.length} elements with data-lucide attribute`);

        // requestAnimationFrameを2回使用してDOMが完全に準備できるまで待機
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                try {
                    console.log('🎬 [LUCIDE-DEBUG] Calling lucide.createIcons()...');
                    lucide.createIcons();

                    // 初期化後にSVG要素をカウント
                    const svgElements = document.querySelectorAll('svg[class*="lucide"]');
                    console.log(`✅ [LUCIDE] Icons initialized successfully - Created ${svgElements.length} SVG elements`);

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
                    }
                } catch (error) {
                    console.warn('⚠️ [LUCIDE] Icon initialization failed (non-critical):', error.message);
                    console.error('⚠️ [LUCIDE-DEBUG] Full error:', error);
                    // Lucideアイコン初期化エラーは致命的ではないため、エラーを抑制
                }
            });
        });
    } else {
        console.error('❌ [LUCIDE] Lucide library not loaded');
        if (typeof lucide === 'undefined') {
            console.error('❌ [LUCIDE-DEBUG] lucide is undefined - CDN may be blocked or failed to load');
        } else if (!lucide.createIcons) {
            console.error('❌ [LUCIDE-DEBUG] lucide.createIcons is missing - wrong Lucide version?');
        }
    }
});