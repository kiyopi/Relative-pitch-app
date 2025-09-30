/**
 * Lucideアイコン初期化共通モジュール
 * 全ページで使用するLucideアイコンの初期化処理
 */

// Lucideアイコン初期化
document.addEventListener('DOMContentLoaded', function() {
    if (typeof lucide !== 'undefined' && lucide.createIcons) {
        lucide.createIcons();
        console.log('✅ [LUCIDE] Icons initialized successfully');
    } else {
        console.error('❌ [LUCIDE] Lucide library not loaded');
    }
});