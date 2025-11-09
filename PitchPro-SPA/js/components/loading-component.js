/**
 * Loading Component
 *
 * @version 1.0.0
 * @description 共通ローディング表示コンポーネント
 *
 * 使用方法:
 * const loading = LoadingComponent.create({
 *   id: 'stats-loading',
 *   color: 'blue',
 *   message: '統計情報を読み込み中...'
 * });
 *
 * 色オプション: blue, green, purple, orange, yellow, red
 */

class LoadingComponent {
    /**
     * ローディングHTML要素を生成
     * @param {Object} options - オプション
     * @param {string} options.id - 要素ID
     * @param {string} options.color - アイコン色（blue, green, purple, orange, yellow, red）
     * @param {string} options.message - 表示メッセージ
     * @param {string} options.size - アイコンサイズ（default: '48px'）
     * @returns {string} HTML文字列
     */
    static create({ id, color = 'blue', message = '読み込み中...', size = '48px' }) {
        const colorClass = `text-${color}-300`;

        return `
<div class="flex flex-col items-center gap-3 py-8" id="${id}" style="display: flex;">
    <i data-lucide="loader-2" class="${colorClass} animate-spin" style="width: ${size}; height: ${size};"></i>
    <p class="text-white-60">${message}</p>
</div>`.trim();
    }

    /**
     * 複数セクション用のローディングセットを生成
     * @param {Array} sections - セクション配列
     * @returns {Object} セクション名をキーとしたHTML文字列オブジェクト
     *
     * 使用例:
     * const loadings = LoadingComponent.createSet([
     *   { id: 'stats-loading', color: 'blue', message: '統計情報を読み込み中...' },
     *   { id: 'chart-loading', color: 'green', message: 'グラフを読み込み中...' }
     * ]);
     */
    static createSet(sections) {
        const result = {};
        sections.forEach(section => {
            result[section.id] = this.create(section);
        });
        return result;
    }

    /**
     * ローディングを非表示にする
     * @param {string} loadingId - ローディング要素のID
     */
    static hide(loadingId) {
        const loadingEl = document.getElementById(loadingId);
        if (loadingEl) {
            // CSSの.flex { display: flex !important }を上書き
            loadingEl.style.setProperty('display', 'none', 'important');
        }
    }

    /**
     * ローディングを表示する
     * @param {string} loadingId - ローディング要素のID
     */
    static show(loadingId) {
        const loadingEl = document.getElementById(loadingId);
        if (loadingEl) {
            loadingEl.style.setProperty('display', 'flex', 'important');
        }
    }

    /**
     * セクションのローディング/コンテンツ切り替え
     * @param {string} sectionName - セクション名（'stats', 'chart', 'sessions'等）
     * @param {boolean} isLoading - ローディング表示するか
     */
    static toggle(sectionName, isLoading = true) {
        const loadingId = `${sectionName}-loading`;
        const contentId = `${sectionName}-content`;

        const loadingEl = document.getElementById(loadingId);
        const contentEl = document.getElementById(contentId);

        if (isLoading) {
            // ローディング表示
            if (loadingEl) loadingEl.style.setProperty('display', 'flex', 'important');
            if (contentEl) contentEl.style.display = 'none';
        } else {
            // コンテンツ表示
            if (loadingEl) loadingEl.style.setProperty('display', 'none', 'important');
            if (contentEl) contentEl.style.display = 'block';
        }
    }
}

// グローバルに公開
window.LoadingComponent = LoadingComponent;

console.log('[LoadingComponent] Loaded');
