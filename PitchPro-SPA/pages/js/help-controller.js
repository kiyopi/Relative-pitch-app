/**
 * ヘルプページコントローラー
 * @version 1.0.0
 * @description FAQアコーディオン管理、Lucideアイコン初期化
 */

/**
 * ヘルプページ初期化関数
 * Router統一初期化システムから呼び出される
 */
function initHelpPage() {
    console.log('🎯 [help] ページ初期化開始');

    // 1. FAQアコーディオン初期化
    setupFaqAccordion();

    // 2. Lucideアイコン初期化
    if (typeof window.initializeLucideIcons === 'function') {
        window.initializeLucideIcons({ immediate: true });
    } else if (typeof lucide !== 'undefined' && lucide.createIcons) {
        // フォールバック（非推奨）
        console.warn('⚠️ [help] initializeLucideIcons未定義、lucide.createIcons使用');
        lucide.createIcons();
    }

    console.log('✅ [help] ページ初期化完了');
}

/**
 * FAQアコーディオン設定
 * 各FAQ項目にクリックイベントを設定
 */
function setupFaqAccordion() {
    const faqItems = document.querySelectorAll('.faq-question');

    if (faqItems.length === 0) {
        console.warn('⚠️ [help] FAQ項目が見つかりません');
        return;
    }

    faqItems.forEach(button => {
        // 既存のイベントリスナーを削除（二重登録防止）
        button.replaceWith(button.cloneNode(true));
    });

    // 新しい要素を取得してイベント設定
    document.querySelectorAll('.faq-question').forEach(button => {
        button.addEventListener('click', handleFaqClick);
    });

    console.log(`✅ [help] FAQアコーディオン設定完了 (${faqItems.length}項目)`);
}

/**
 * FAQクリックハンドラー
 * @param {Event} event - クリックイベント
 */
function handleFaqClick(event) {
    const button = event.currentTarget;
    const faqId = button.getAttribute('data-faq');
    const answer = document.getElementById(`faq-answer-${faqId}`);
    const icon = button.querySelector('.faq-icon');

    if (!answer) {
        console.error(`❌ [help] FAQ回答要素が見つかりません: faq-answer-${faqId}`);
        return;
    }

    // トグル処理
    const isOpen = answer.classList.contains('open');

    // 現在のFAQを開閉
    answer.classList.toggle('open');

    if (icon) {
        icon.classList.toggle('rotated');
    }

    console.log(`📖 [help] FAQ ${faqId} ${isOpen ? '閉じる' : '開く'}`);
}

/**
 * すべてのFAQを閉じる（オプション機能）
 * 必要に応じてhandleFaqClick内で呼び出す
 */
function closeAllFaqs() {
    document.querySelectorAll('.faq-answer.open').forEach(answer => {
        answer.classList.remove('open');
    });
    document.querySelectorAll('.faq-icon.rotated').forEach(icon => {
        icon.classList.remove('rotated');
    });
}

// グローバル公開
window.initHelpPage = initHelpPage;
window.closeAllFaqs = closeAllFaqs;

console.log('✅ [help] コントローラー読み込み完了');
