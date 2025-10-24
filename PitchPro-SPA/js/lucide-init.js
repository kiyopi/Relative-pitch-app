/**
 * Lucideアイコン初期化共通モジュール
 * 全ページで使用するLucideアイコンの初期化処理
 */

// Lucideアイコン初期化（安全なエラーハンドリング付き）
document.addEventListener('DOMContentLoaded', function() {
    if (typeof lucide !== 'undefined' && lucide.createIcons) {
        try {
            lucide.createIcons();
            console.log('✅ [LUCIDE] Icons initialized successfully');
        } catch (error) {
            console.warn('⚠️ [LUCIDE] Icon initialization failed (non-critical):', error.message);
            // Lucideアイコン初期化エラーは致命的ではないため、エラーを抑制
        }
    } else {
        console.error('❌ [LUCIDE] Lucide library not loaded');
    }
});