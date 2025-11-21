/**
 * FlagManager - sessionStorage フラグ管理ヘルパー
 *
 * 【目的】
 * - NavigationManagerで使用するフラグの一元管理
 * - フラグの設定・取得・削除のAPI統一
 * - デバッグログの統一
 * - フラグのライフサイクル管理
 *
 * 【使用方法】
 * // フラグ設定
 * FlagManager.setTransitionFlag('preparation');
 *
 * // フラグ確認
 * if (FlagManager.hasTransitionFlag('preparation')) { ... }
 *
 * // フラグ削除
 * FlagManager.clearTransitionFlag('preparation');
 *
 * // デバッグ
 * FlagManager.debugFlags(); // 全フラグ状態を表示
 *
 * @version 1.0.0
 * @date 2025-11-20
 */

class FlagManager {
    /**
     * フラグキー定義
     */
    static KEYS = {
        // 遷移証明フラグ（一時的・遷移直後に削除）
        TRANSITION: {
            TRAINING: 'normalTransitionToTraining',
            PREPARATION: 'normalTransitionToPreparation',
            RESULT_SESSION: 'normalTransitionToResultSession'
        },

        // ページ状態フラグ（永続的・ページ離脱時に削除）
        PAGE_ACTIVE: {
            PREPARATION: 'preparationPageActive',
            TRAINING: 'trainingPageActive',
            RESULT_SESSION: 'resultSessionPageActive'
        },

        // 制御フラグ
        CONTROL: {
            REDIRECT_COMPLETED: 'reloadRedirected'
        },

        // データフラグ
        DATA: {
            CURRENT_MODE: 'currentMode',
            CURRENT_SESSION: 'currentSession',
            CURRENT_LESSON_ID: 'currentLessonId'
        }
    };

    /**
     * フラグ種別の定義
     */
    static TYPE = {
        TRANSITION: 'transition',
        PAGE_ACTIVE: 'pageActive',
        CONTROL: 'control',
        DATA: 'data'
    };

    // =====================================
    // 遷移証明フラグ（Transition Flags）
    // =====================================

    /**
     * 遷移証明フラグを設定
     * @param {string} page - ページ名（'training', 'preparation', 'result-session'）
     */
    static setTransitionFlag(page) {
        const key = this._getTransitionKey(page);
        if (!key) {
            console.error(`❌ [FlagManager] Invalid page for transition flag: ${page}`);
            return;
        }

        sessionStorage.setItem(key, 'true');
        console.log(`✅ [FlagManager] Transition flag set: ${key}`);
    }

    /**
     * 遷移証明フラグを確認
     * @param {string} page - ページ名
     * @returns {boolean}
     */
    static hasTransitionFlag(page) {
        const key = this._getTransitionKey(page);
        return key ? sessionStorage.getItem(key) === 'true' : false;
    }

    /**
     * 遷移証明フラグを削除
     * @param {string} page - ページ名
     */
    static clearTransitionFlag(page) {
        const key = this._getTransitionKey(page);
        if (!key) return;

        sessionStorage.removeItem(key);
        console.log(`🗑️ [FlagManager] Transition flag cleared: ${key}`);
    }

    /**
     * 遷移証明フラグのキーを取得（内部ヘルパー）
     */
    static _getTransitionKey(page) {
        const pageUpper = page.toUpperCase().replace('-', '_');
        return this.KEYS.TRANSITION[pageUpper] || null;
    }

    // =====================================
    // ページ状態フラグ（Page Active Flags）
    // =====================================

    /**
     * ページ状態フラグを設定
     * @param {string} page - ページ名
     */
    static setPageActiveFlag(page) {
        const key = this._getPageActiveKey(page);
        if (!key) {
            console.error(`❌ [FlagManager] Invalid page for active flag: ${page}`);
            return;
        }

        sessionStorage.setItem(key, 'true');
        console.log(`✅ [FlagManager] Page active flag set: ${key}`);
    }

    /**
     * ページ状態フラグを確認
     * @param {string} page - ページ名
     * @returns {boolean}
     */
    static hasPageActiveFlag(page) {
        const key = this._getPageActiveKey(page);
        return key ? sessionStorage.getItem(key) === 'true' : false;
    }

    /**
     * ページ状態フラグを削除
     * @param {string} page - ページ名
     */
    static clearPageActiveFlag(page) {
        const key = this._getPageActiveKey(page);
        if (!key) return;

        sessionStorage.removeItem(key);
        console.log(`🗑️ [FlagManager] Page active flag cleared: ${key}`);
    }

    /**
     * ページ状態フラグのキーを取得（内部ヘルパー）
     */
    static _getPageActiveKey(page) {
        const pageUpper = page.toUpperCase().replace('-', '_');
        return this.KEYS.PAGE_ACTIVE[pageUpper] || null;
    }

    // =====================================
    // 制御フラグ（Control Flags）
    // =====================================

    /**
     * リダイレクト完了フラグを設定
     */
    static setRedirectCompleted() {
        sessionStorage.setItem(this.KEYS.CONTROL.REDIRECT_COMPLETED, 'true');
        console.log(`✅ [FlagManager] Redirect completed flag set`);
    }

    /**
     * リダイレクト完了フラグを確認
     * @returns {boolean}
     */
    static hasRedirectCompleted() {
        return sessionStorage.getItem(this.KEYS.CONTROL.REDIRECT_COMPLETED) === 'true';
    }

    /**
     * リダイレクト完了フラグを削除
     */
    static clearRedirectCompleted() {
        sessionStorage.removeItem(this.KEYS.CONTROL.REDIRECT_COMPLETED);
        console.log(`🗑️ [FlagManager] Redirect completed flag cleared`);
    }

    // =====================================
    // データフラグ（Data Flags）
    // =====================================

    /**
     * 現在のモードを設定
     * @param {string} mode - モード名
     */
    static setCurrentMode(mode) {
        if (mode) {
            sessionStorage.setItem(this.KEYS.DATA.CURRENT_MODE, mode);
            console.log(`📝 [FlagManager] Current mode set: ${mode}`);
        }
    }

    /**
     * 現在のモードを取得
     * @returns {string|null}
     */
    static getCurrentMode() {
        return sessionStorage.getItem(this.KEYS.DATA.CURRENT_MODE);
    }

    /**
     * 現在のセッション番号を設定
     * @param {string|number} session - セッション番号
     */
    static setCurrentSession(session) {
        if (session) {
            sessionStorage.setItem(this.KEYS.DATA.CURRENT_SESSION, String(session));
            console.log(`📝 [FlagManager] Current session set: ${session}`);
        }
    }

    /**
     * 現在のセッション番号を取得
     * @returns {string|null}
     */
    static getCurrentSession() {
        return sessionStorage.getItem(this.KEYS.DATA.CURRENT_SESSION);
    }

    /**
     * 現在のレッスンIDを設定
     * @param {string} lessonId - レッスンID
     */
    static setCurrentLessonId(lessonId) {
        if (lessonId) {
            sessionStorage.setItem(this.KEYS.DATA.CURRENT_LESSON_ID, lessonId);
            console.log(`📝 [FlagManager] Current lesson ID set: ${lessonId}`);
        }
    }

    /**
     * 現在のレッスンIDを取得
     * @returns {string|null}
     */
    static getCurrentLessonId() {
        return sessionStorage.getItem(this.KEYS.DATA.CURRENT_LESSON_ID);
    }

    /**
     * 現在のレッスンIDを削除
     */
    static clearCurrentLessonId() {
        sessionStorage.removeItem(this.KEYS.DATA.CURRENT_LESSON_ID);
        console.log(`🗑️ [FlagManager] Current lesson ID cleared`);
    }

    // =====================================
    // 一括操作
    // =====================================

    /**
     * ページ関連の全フラグをクリア
     * @param {string} page - ページ名
     */
    static clearPageFlags(page) {
        console.log(`🧹 [FlagManager] Clearing all flags for page: ${page}`);
        this.clearTransitionFlag(page);
        this.clearPageActiveFlag(page);
    }

    /**
     * 全ての遷移証明フラグをクリア
     */
    static clearAllTransitionFlags() {
        console.log(`🧹 [FlagManager] Clearing all transition flags`);
        Object.values(this.KEYS.TRANSITION).forEach(key => {
            sessionStorage.removeItem(key);
        });
    }

    /**
     * 全ての制御フラグをクリア
     */
    static clearAllControlFlags() {
        console.log(`🧹 [FlagManager] Clearing all control flags`);
        Object.values(this.KEYS.CONTROL).forEach(key => {
            sessionStorage.removeItem(key);
        });
    }

    // =====================================
    // デバッグ・ユーティリティ
    // =====================================

    /**
     * 全フラグの状態を表示（デバッグ用）
     */
    static debugFlags() {
        console.group('🔍 [FlagManager] Current Flag States');

        console.group('🚦 Transition Flags');
        Object.entries(this.KEYS.TRANSITION).forEach(([name, key]) => {
            const value = sessionStorage.getItem(key);
            console.log(`${name}: ${value || '(not set)'}`);
        });
        console.groupEnd();

        console.group('📄 Page Active Flags');
        Object.entries(this.KEYS.PAGE_ACTIVE).forEach(([name, key]) => {
            const value = sessionStorage.getItem(key);
            console.log(`${name}: ${value || '(not set)'}`);
        });
        console.groupEnd();

        console.group('⚙️ Control Flags');
        Object.entries(this.KEYS.CONTROL).forEach(([name, key]) => {
            const value = sessionStorage.getItem(key);
            console.log(`${name}: ${value || '(not set)'}`);
        });
        console.groupEnd();

        console.group('📊 Data Flags');
        Object.entries(this.KEYS.DATA).forEach(([name, key]) => {
            const value = sessionStorage.getItem(key);
            console.log(`${name}: ${value || '(not set)'}`);
        });
        console.groupEnd();

        console.groupEnd();
    }

    /**
     * 全フラグの状態をオブジェクトとして取得
     * @returns {Object}
     */
    static getAllFlags() {
        return {
            transition: Object.fromEntries(
                Object.entries(this.KEYS.TRANSITION).map(([name, key]) =>
                    [name, sessionStorage.getItem(key)]
                )
            ),
            pageActive: Object.fromEntries(
                Object.entries(this.KEYS.PAGE_ACTIVE).map(([name, key]) =>
                    [name, sessionStorage.getItem(key)]
                )
            ),
            control: Object.fromEntries(
                Object.entries(this.KEYS.CONTROL).map(([name, key]) =>
                    [name, sessionStorage.getItem(key)]
                )
            ),
            data: Object.fromEntries(
                Object.entries(this.KEYS.DATA).map(([name, key]) =>
                    [name, sessionStorage.getItem(key)]
                )
            )
        };
    }

    /**
     * フラグの存在確認（汎用）
     * @param {string} key - フラグキー
     * @returns {boolean}
     */
    static has(key) {
        return sessionStorage.getItem(key) !== null;
    }

    /**
     * フラグの取得（汎用）
     * @param {string} key - フラグキー
     * @returns {string|null}
     */
    static get(key) {
        return sessionStorage.getItem(key);
    }

    /**
     * フラグの設定（汎用）
     * @param {string} key - フラグキー
     * @param {string} value - 値
     */
    static set(key, value) {
        sessionStorage.setItem(key, value);
        console.log(`📝 [FlagManager] Flag set: ${key} = ${value}`);
    }

    /**
     * フラグの削除（汎用）
     * @param {string} key - フラグキー
     */
    static clear(key) {
        sessionStorage.removeItem(key);
        console.log(`🗑️ [FlagManager] Flag cleared: ${key}`);
    }
}

// グローバルに公開
window.FlagManager = FlagManager;

console.log('✅ [FlagManager] Loaded (v1.0.0)');
