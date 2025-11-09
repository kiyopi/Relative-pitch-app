/**
 * Loading Component
 *
 * @version 1.1.0
 * @description 共通ローディング表示・エラー表示コンポーネント
 *
 * 使用方法:
 * const loading = LoadingComponent.create({
 *   id: 'stats-loading',
 *   color: 'blue',
 *   message: '統計情報を読み込み中...'
 * });
 *
 * エラー表示:
 * const error = LoadingComponent.createError({
 *   id: 'stats-error',
 *   message: 'データの読み込みに失敗しました',
 *   actionText: '再読み込み',
 *   actionCallback: () => location.reload()
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
     * エラー表示HTML要素を生成
     * @param {Object} options - オプション
     * @param {string} options.id - 要素ID
     * @param {string} options.message - エラーメッセージ
     * @param {string} options.actionText - アクションボタンテキスト（オプション）
     * @param {Function} options.actionCallback - アクションボタンコールバック（オプション）
     * @param {string} options.size - アイコンサイズ（default: '48px'）
     * @returns {string} HTML文字列
     */
    static createError({ id, message = 'エラーが発生しました', actionText = null, actionCallback = null, size = '48px' }) {
        const actionButton = actionText && actionCallback
            ? `<button class="btn btn-outline" onclick="LoadingComponent.handleErrorAction('${id}')">${actionText}</button>`
            : '';

        // コールバックを保存（グローバルマップで管理）
        if (actionCallback) {
            if (!window._loadingComponentCallbacks) {
                window._loadingComponentCallbacks = new Map();
            }
            window._loadingComponentCallbacks.set(id, actionCallback);
        }

        return `
<div class="flex flex-col items-center gap-3 py-8" id="${id}" style="display: flex;">
    <i data-lucide="alert-triangle" class="text-red-300" style="width: ${size}; height: ${size};"></i>
    <p class="text-white-60">${message}</p>
    ${actionButton}
</div>`.trim();
    }

    /**
     * エラーアクションハンドラー（内部使用）
     * @param {string} id - エラー要素ID
     */
    static handleErrorAction(id) {
        if (window._loadingComponentCallbacks && window._loadingComponentCallbacks.has(id)) {
            const callback = window._loadingComponentCallbacks.get(id);
            callback();
        }
    }

    /**
     * エラー表示に切り替え
     * @param {string} sectionName - セクション名
     * @param {string} message - エラーメッセージ
     * @param {string} actionText - アクションボタンテキスト（オプション）
     * @param {Function} actionCallback - アクションボタンコールバック（オプション）
     */
    static showError(sectionName, message, actionText = null, actionCallback = null) {
        const loadingId = `${sectionName}-loading`;
        const contentId = `${sectionName}-content`;
        const errorId = `${sectionName}-error`;

        // ローディングとコンテンツを非表示
        const loadingEl = document.getElementById(loadingId);
        const contentEl = document.getElementById(contentId);
        if (loadingEl) loadingEl.style.setProperty('display', 'none', 'important');
        if (contentEl) contentEl.style.display = 'none';

        // エラー表示を作成または更新
        let errorEl = document.getElementById(errorId);
        if (!errorEl) {
            // エラー要素が存在しない場合は作成して挿入
            const parent = loadingEl ? loadingEl.parentElement : contentEl?.parentElement;
            if (parent) {
                const errorHTML = this.createError({
                    id: errorId,
                    message,
                    actionText,
                    actionCallback
                });
                parent.insertAdjacentHTML('beforeend', errorHTML);

                // Lucideアイコン再初期化
                if (typeof window.initializeLucideIcons === 'function') {
                    window.initializeLucideIcons({ immediate: true });
                } else if (typeof lucide !== 'undefined') {
                    lucide.createIcons();
                }
            }
        } else {
            // 既存のエラー要素を表示
            errorEl.style.setProperty('display', 'flex', 'important');
        }
    }

    /**
     * エラー表示を非表示
     * @param {string} sectionName - セクション名
     */
    static hideError(sectionName) {
        const errorId = `${sectionName}-error`;
        const errorEl = document.getElementById(errorId);
        if (errorEl) {
            errorEl.style.setProperty('display', 'none', 'important');
        }
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
