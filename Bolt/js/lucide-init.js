/**
 * Lucideアイコン統一初期化スクリプト
 * 全てのHTMLファイルで確実にアイコンが表示されるようにする
 */

// グローバル初期化関数
function initializeLucideIcons() {
    if (typeof lucide !== 'undefined' && lucide.createIcons) {
        try {
            lucide.createIcons();
            console.log('✅ Lucideアイコンが正常に初期化されました');
            return true;
        } catch (error) {
            console.error('❌ Lucideアイコン初期化エラー:', error);
            return false;
        }
    } else {
        console.error('❌ Lucideライブラリが読み込まれていません');
        return false;
    }
}

// 複数回試行する安全な初期化
function ensureLucideIcons() {
    let attempts = 0;
    const maxAttempts = 5;
    
    function tryInitialize() {
        attempts++;
        
        if (initializeLucideIcons()) {
            return; // 成功
        }
        
        if (attempts < maxAttempts) {
            console.log(`🔄 Lucide初期化を再試行します (${attempts}/${maxAttempts})`);
            setTimeout(tryInitialize, 100 * attempts); // 遅延を段階的に増加
        } else {
            console.error('❌ Lucide初期化が最大試行回数に達しました');
        }
    }
    
    tryInitialize();
}

// DOM読み込み完了時の自動実行
document.addEventListener('DOMContentLoaded', ensureLucideIcons);

// ページ完全読み込み時のバックアップ
window.addEventListener('load', () => {
    setTimeout(ensureLucideIcons, 100);
});

// 手動初期化用のグローバル関数としてエクスポート
window.ensureLucideIcons = ensureLucideIcons;
window.initializeLucideIcons = initializeLucideIcons;