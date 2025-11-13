/**
 * SessionManager - セッション管理専門クラス
 *
 * @version 2.1.0
 * @description トレーニングセッションの管理を一元化
 *
 * 【責任範囲】
 * - 現在のレッスンIDの管理
 * - セッション数のカウント（lessonId単位）
 * - レッスン完了判定
 * - モード設定への統一アクセス
 * - sessionStorage管理
 * - グローバルインスタンス管理（v2.0.0追加）
 *
 * 【依存関係】
 * - ModeController: モード定義の取得
 * - SessionDataManager: sessionDataの統一管理（v2.1.0追加）
 * - sessionStorage: lessonId・mode永続化
 *
 * 【使用箇所】
 * - trainingController.js: セッション管理
 * - result-session-controller.js: lessonId取得（v2.0.0追加）
 * - results-overview-controller.js: lessonId取得（v2.0.0追加）
 *
 * 【重要な設計思想】
 * - lessonId単位でセッションをカウント（Bug #11対策）
 * - ModeControllerを唯一の情報源とする
 * - 不変性: インスタンス作成後はmode/lessonIdは変更不可
 * - Single Source of Truth: getCurrent()で統一的にアクセス（v2.0.0追加）
 *
 * 【v2.0.0更新】
 * - グローバルインスタンス管理機能追加（getCurrent/setCurrent/clearCurrent）
 * - 便利なゲッター追加（getLessonId/getMode/getScaleDirection/getChromaticDirection）
 * - 全コントローラーで統一的にlessonId取得可能に
 */

class SessionManager {
    /**
     * SessionManagerインスタンスを作成
     *
     * @param {string} mode - モードID (random, continuous, 12tone)
     * @param {string} lessonId - 現在のレッスンID
     * @param {Object} options - 追加オプション
     * @param {string} options.chromaticDirection - 基音進行方向 (random, ascending, descending, both)
     * @param {string} options.scaleDirection - 音階方向 (ascending, descending)
     *
     * @throws {Error} モードIDが無効な場合
     *
     * @example
     * // ランダム基音モード
     * const manager = new SessionManager('random', 'lesson_123456_random_random_ascending');
     *
     * // 12音階モード（両方向）
     * const options = { chromaticDirection: 'both', scaleDirection: 'ascending' };
     * const manager = new SessionManager('12tone', 'lesson_123456_12tone_both_ascending', options);
     */
    constructor(mode, lessonId, options = {}) {
        if (!mode || !lessonId) {
            throw new Error('SessionManager: mode and lessonId are required');
        }

        this.mode = mode;
        this.lessonId = lessonId;
        this.options = options;

        // ModeControllerから設定を取得
        if (!window.ModeController) {
            throw new Error('SessionManager: ModeController not found');
        }

        this.modeConfig = window.ModeController.getMode(mode);
        if (!this.modeConfig) {
            throw new Error(`SessionManager: Invalid mode: ${mode}`);
        }

        // セッション数を動的に取得（12音階モードの両方向対応）
        this.maxSessions = window.ModeController.getSessionsPerLesson(mode, {
            direction: options.chromaticDirection
        });

        console.log(`✅ SessionManager初期化: mode=${mode}, lessonId=${lessonId}, maxSessions=${this.maxSessions}`);
    }

    // ===== セッション数管理 =====

    /**
     * 現在のレッスンのセッション数を取得
     * 【重要】lessonId単位でカウント（Bug #11対策）
     * 【v2.1.0】SessionDataManagerを使用して統一管理
     *
     * @returns {number} セッション数
     */
    getCurrentSessionCount() {
        if (!window.SessionDataManager) {
            console.error('❌ SessionManager: SessionDataManagerが見つかりません');
            return 0;
        }

        return window.SessionDataManager.getSessionCount({ lessonId: this.lessonId });
    }

    /**
     * 次のセッション番号を取得（1-indexed）
     *
     * @returns {number} 次のセッション番号（例: 1, 2, 3...）
     */
    getNextSessionNumber() {
        return this.getCurrentSessionCount() + 1;
    }

    /**
     * 現在のセッション番号を取得（1-indexed）
     * getCurrentSessionCount() + 1と同じだが、意味的に明確
     *
     * @returns {number} 現在のセッション番号
     */
    getCurrentSessionNumber() {
        return this.getNextSessionNumber();
    }

    /**
     * レッスンが完了したかチェック
     *
     * @returns {boolean} 完了していればtrue
     */
    isLessonComplete() {
        return this.getCurrentSessionCount() >= this.maxSessions;
    }

    /**
     * 最大セッション数を取得
     *
     * @returns {number} 最大セッション数
     */
    getMaxSessions() {
        return this.maxSessions;
    }

    // ===== UI表示用メソッド =====

    /**
     * 進行率を取得（0-100%）
     *
     * @returns {number} 進行率（小数点以下切り捨て）
     */
    getProgressPercentage() {
        const count = this.getCurrentSessionCount();
        return Math.floor((count / this.maxSessions) * 100);
    }

    /**
     * セッション進行状況の文字列を取得
     *
     * @returns {string} "3/8" 形式の文字列
     *
     * @example
     * manager.getProgressText(); // "3/8"
     */
    getProgressText() {
        return `${this.getCurrentSessionNumber()}/${this.maxSessions}`;
    }

    /**
     * セッション進行状況の詳細文字列を取得
     *
     * @returns {string} "セッション 3/8 実施中" 形式の文字列
     *
     * @example
     * manager.getProgressDetailText(); // "セッション 3/8 実施中"
     */
    getProgressDetailText() {
        return `セッション ${this.getProgressText()} 実施中`;
    }

    // ===== データ取得 =====

    /**
     * 現在のレッスンの全セッションを取得
     * 【v2.1.0】SessionDataManagerを使用して統一管理
     *
     * @returns {Array} セッション配列
     */
    getCurrentLessonSessions() {
        if (!window.SessionDataManager) {
            console.error('❌ SessionManager: SessionDataManagerが見つかりません');
            return [];
        }

        return window.SessionDataManager.getSessionsByLessonId(this.lessonId);
    }

    // ===== モード情報 =====

    /**
     * モード名を取得
     *
     * @param {boolean} useShortName - 短縮名を使用するか
     * @returns {string} モード名
     *
     * @example
     * manager.getModeName(); // "ランダム基音モード"
     * manager.getModeName(true); // "ランダム基音"
     */
    getModeName(useShortName = false) {
        return window.ModeController.getModeName(this.mode, useShortName);
    }

    /**
     * 個別結果表示が必要かチェック
     *
     * @returns {boolean} ランダムモードの場合true
     */
    hasIndividualResults() {
        return this.modeConfig.hasIndividualResults || false;
    }

    /**
     * モードIDを取得
     *
     * @returns {string} モードID
     */
    getModeId() {
        return this.mode;
    }

    /**
     * レッスンIDを取得
     *
     * @returns {string} レッスンID
     */
    getLessonId() {
        return this.lessonId;
    }

    // ===== sessionStorage管理 =====

    /**
     * sessionStorageにlessonId・modeを保存
     * 個別結果画面から戻った際の復元用
     */
    saveToSessionStorage() {
        sessionStorage.setItem('currentLessonId', this.lessonId);
        sessionStorage.setItem('currentMode', this.mode);
        console.log(`💾 SessionManager: sessionStorageに保存 (mode=${this.mode}, lessonId=${this.lessonId})`);
    }

    /**
     * sessionStorageからlessonId・modeを復元してインスタンス作成
     *
     * @static
     * @param {Object} options - 追加オプション（chromaticDirection等）
     * @returns {SessionManager|null} SessionManagerインスタンス、または復元失敗時null
     *
     * @example
     * const manager = SessionManager.restoreFromSessionStorage();
     * if (manager) {
     *     console.log('復元成功:', manager.getProgressText());
     * }
     */
    static restoreFromSessionStorage(options = {}) {
        const lessonId = sessionStorage.getItem('currentLessonId');
        const mode = sessionStorage.getItem('currentMode');

        if (lessonId && mode) {
            console.log(`🔄 SessionManager: sessionStorageから復元 (mode=${mode}, lessonId=${lessonId})`);
            try {
                return new SessionManager(mode, lessonId, options);
            } catch (error) {
                console.error('❌ SessionManager復元エラー:', error);
                return null;
            }
        }

        console.log('ℹ️ SessionManager: sessionStorageに復元データなし');
        return null;
    }

    /**
     * sessionStorageをクリア
     *
     * @static
     */
    static clearSessionStorage() {
        sessionStorage.removeItem('currentLessonId');
        sessionStorage.removeItem('currentMode');
        console.log('🗑️ SessionManager: sessionStorageクリア完了');
    }

    // ===== グローバルインスタンス管理 =====

    /**
     * グローバルSessionManagerインスタンス
     * @private
     * @static
     */
    static _currentInstance = null;

    /**
     * 現在のSessionManagerインスタンスを取得
     * sessionStorageから自動復元を試みる
     *
     * @static
     * @returns {SessionManager|null} 現在のインスタンス
     *
     * @example
     * const manager = SessionManager.getCurrent();
     * if (manager) {
     *     const lessonId = manager.getLessonId();
     * }
     */
    static getCurrent() {
        // キャッシュされたインスタンスがあればそれを返す
        if (this._currentInstance) {
            return this._currentInstance;
        }

        // sessionStorageから復元を試みる
        this._currentInstance = this.restoreFromSessionStorage();
        return this._currentInstance;
    }

    /**
     * グローバルインスタンスを設定
     *
     * @static
     * @param {SessionManager} instance - SessionManagerインスタンス
     */
    static setCurrent(instance) {
        this._currentInstance = instance;
        console.log(`✅ SessionManager.setCurrent: ${instance.lessonId}`);
    }

    /**
     * グローバルインスタンスをクリア
     *
     * @static
     */
    static clearCurrent() {
        this._currentInstance = null;
        this.clearSessionStorage();
        console.log('🗑️ SessionManager.clearCurrent: インスタンスクリア完了');
    }

    // ===== 便利なゲッター =====

    /**
     * lessonIdを取得
     *
     * @returns {string} lessonId
     */
    getLessonId() {
        return this.lessonId;
    }

    /**
     * modeを取得
     *
     * @returns {string} mode
     */
    getMode() {
        return this.mode;
    }

    /**
     * scaleDirectionを取得
     *
     * @returns {string} scaleDirection
     */
    getScaleDirection() {
        return this.options.scaleDirection || 'ascending';
    }

    /**
     * chromaticDirectionを取得
     *
     * @returns {string} chromaticDirection
     */
    getChromaticDirection() {
        return this.options.chromaticDirection || 'random';
    }

    // ===== デバッグ用 =====

    /**
     * デバッグ情報を出力
     */
    debug() {
        console.log('=== SessionManager Debug Info ===');
        console.log('Mode:', this.mode);
        console.log('LessonId:', this.lessonId);
        console.log('Max Sessions:', this.maxSessions);
        console.log('Current Count:', this.getCurrentSessionCount());
        console.log('Progress:', this.getProgressText());
        console.log('Is Complete:', this.isLessonComplete());
        console.log('Mode Name:', this.getModeName());
        console.log('Has Individual Results:', this.hasIndividualResults());
        console.log('Scale Direction:', this.getScaleDirection());
        console.log('Chromatic Direction:', this.getChromaticDirection());
        console.log('=================================');
    }
}

// グローバルに公開
window.SessionManager = SessionManager;

console.log('✅ SessionManager初期化完了');
