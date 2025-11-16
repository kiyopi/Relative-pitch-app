/**
 * SessionDataManager - sessionData（localStorage）管理専門クラス
 *
 * @version 1.0.0
 * @description トレーニングセッションデータのlocalStorage管理を一元化
 *
 * 【責任範囲】
 * - sessionData（localStorage）の読み取り・書き込み
 * - lessonId単位のセッション取得・削除
 * - mode単位のセッション取得・削除
 * - 全セッションの取得・保存
 *
 * 【依存関係】
 * - localStorage: sessionDataの永続化
 *
 * 【使用箇所】
 * - SessionManager: セッション数カウント・データ取得
 * - trainingController.js: セッション初期化・完了チェック
 * - router.js: モード別クリア処理
 * - preparation-pitchpro-cycle.js: レッスン開始前クリア
 * - index.html: 未完了レッスン削除
 * - records-controller.js: データ修復
 *
 * 【重要な設計思想】
 * - Single Source of Truth: localStorage.getItem('sessionData')への唯一のアクセスポイント
 * - DRY原則: 重複コードを排除し、バグリスクを軽減
 * - エラーハンドリング: JSON.parse()のエラーを適切に処理
 * - 一貫性: 全ての操作でlocalStorageとの同期を保証
 *
 * 【統合による改善】
 * - 9箇所の重複コード削減
 * - localStorage操作のバグリスク軽減
 * - sessionData構造変更時の影響範囲を最小化
 */

class SessionDataManager {
    /**
     * localStorageキー
     * @private
     * @static
     */
    static STORAGE_KEY = 'sessionData';

    // ===== 基本操作 =====

    /**
     * 全セッションデータを取得
     *
     * @returns {Array} セッション配列（取得失敗時は空配列）
     *
     * @example
     * const sessions = SessionDataManager.getAllSessions();
     * console.log(`全セッション数: ${sessions.length}`);
     */
    static getAllSessions() {
        try {
            const data = localStorage.getItem(this.STORAGE_KEY);
            return data ? JSON.parse(data) : [];
        } catch (error) {
            console.error('❌ SessionDataManager: getAllSessions()エラー', error);
            return [];
        }
    }

    /**
     * 全セッションデータを保存
     *
     * @param {Array} sessions - セッション配列
     * @returns {boolean} 保存成功時true
     *
     * @example
     * const sessions = [{ sessionId: 1, lessonId: 'lesson_123', ... }];
     * SessionDataManager.saveAllSessions(sessions);
     */
    static saveAllSessions(sessions) {
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(sessions));
            console.log(`💾 SessionDataManager: ${sessions.length}セッション保存完了`);
            return true;
        } catch (error) {
            console.error('❌ SessionDataManager: saveAllSessions()エラー', error);
            return false;
        }
    }

    /**
     * セッションデータを追加
     *
     * @param {Object} sessionData - セッションデータ
     * @returns {boolean} 追加成功時true
     *
     * @example
     * const session = {
     *     sessionId: 1,
     *     lessonId: 'lesson_123',
     *     mode: 'random',
     *     completed: true
     * };
     * SessionDataManager.addSession(session);
     */
    static addSession(sessionData) {
        try {
            const allSessions = this.getAllSessions();
            allSessions.push(sessionData);
            return this.saveAllSessions(allSessions);
        } catch (error) {
            console.error('❌ SessionDataManager: addSession()エラー', error);
            return false;
        }
    }

    // ===== lessonId単位の操作 =====

    /**
     * 特定のlessonIdのセッションを取得
     *
     * @param {string} lessonId - レッスンID
     * @returns {Array} セッション配列
     *
     * @example
     * const sessions = SessionDataManager.getSessionsByLessonId('lesson_123');
     * console.log(`レッスン内セッション数: ${sessions.length}`);
     */
    static getSessionsByLessonId(lessonId) {
        if (!lessonId) {
            console.warn('⚠️ SessionDataManager: lessonIdが未指定');
            return [];
        }

        const allSessions = this.getAllSessions();
        return allSessions.filter(s => s.lessonId === lessonId);
    }

    /**
     * 特定のlessonIdのセッションを削除
     *
     * @param {string} lessonId - レッスンID
     * @returns {number} 削除されたセッション数
     *
     * @example
     * const deleted = SessionDataManager.clearSessionsByLessonId('lesson_123');
     * console.log(`${deleted}セッション削除完了`);
     */
    static clearSessionsByLessonId(lessonId) {
        if (!lessonId) {
            console.warn('⚠️ SessionDataManager: lessonIdが未指定');
            return 0;
        }

        const allSessions = this.getAllSessions();
        const beforeCount = allSessions.length;
        const remaining = allSessions.filter(s => s.lessonId !== lessonId);
        const deletedCount = beforeCount - remaining.length;

        this.saveAllSessions(remaining);
        console.log(`🗑️ SessionDataManager: lessonId=${lessonId}, ${deletedCount}セッション削除`);

        return deletedCount;
    }

    // ===== mode単位の操作 =====

    /**
     * 特定のmodeのセッションを取得
     *
     * @param {string} mode - モードID (random, continuous, 12tone)
     * @returns {Array} セッション配列
     *
     * @example
     * const sessions = SessionDataManager.getSessionsByMode('random');
     * console.log(`ランダムモードセッション数: ${sessions.length}`);
     */
    static getSessionsByMode(mode) {
        if (!mode) {
            console.warn('⚠️ SessionDataManager: modeが未指定');
            return [];
        }

        const allSessions = this.getAllSessions();
        return allSessions.filter(s => s.mode === mode);
    }

    /**
     * 特定のmodeのセッションを削除
     *
     * @param {string} mode - モードID (random, continuous, 12tone)
     * @returns {number} 削除されたセッション数
     *
     * @example
     * const deleted = SessionDataManager.clearSessionsByMode('random');
     * console.log(`${deleted}セッション削除完了`);
     */
    static clearSessionsByMode(mode) {
        if (!mode) {
            console.warn('⚠️ SessionDataManager: modeが未指定');
            return 0;
        }

        const allSessions = this.getAllSessions();
        const beforeCount = allSessions.length;
        const remaining = allSessions.filter(s => s.mode !== mode);
        const deletedCount = beforeCount - remaining.length;

        this.saveAllSessions(remaining);
        console.log(`🗑️ SessionDataManager: mode=${mode}, ${deletedCount}セッション削除`);

        return deletedCount;
    }

    // ===== 高度な操作 =====

    /**
     * 複数の条件でセッションを取得
     *
     * @param {Object} filters - フィルター条件
     * @param {string} [filters.lessonId] - レッスンID
     * @param {string} [filters.mode] - モードID
     * @param {boolean} [filters.completed] - 完了フラグ
     * @returns {Array} セッション配列
     *
     * @example
     * // 完了済みのランダムモードセッションを取得
     * const sessions = SessionDataManager.getSessionsByFilters({
     *     mode: 'random',
     *     completed: true
     * });
     */
    static getSessionsByFilters(filters = {}) {
        let sessions = this.getAllSessions();

        if (filters.lessonId) {
            sessions = sessions.filter(s => s.lessonId === filters.lessonId);
        }

        if (filters.mode) {
            sessions = sessions.filter(s => s.mode === filters.mode);
        }

        if (filters.completed !== undefined) {
            sessions = sessions.filter(s => s.completed === filters.completed);
        }

        return sessions;
    }

    /**
     * 全セッションデータをクリア
     *
     * @returns {boolean} クリア成功時true
     *
     * @example
     * SessionDataManager.clearAllSessions();
     */
    static clearAllSessions() {
        try {
            localStorage.removeItem(this.STORAGE_KEY);
            console.log('🗑️ SessionDataManager: 全セッションデータをクリア');
            return true;
        } catch (error) {
            console.error('❌ SessionDataManager: clearAllSessions()エラー', error);
            return false;
        }
    }

    /**
     * セッション数を取得（高速版）
     *
     * @param {Object} filters - フィルター条件（オプション）
     * @returns {number} セッション数
     *
     * @example
     * // 全セッション数
     * const total = SessionDataManager.getSessionCount();
     *
     * // 特定レッスンのセッション数
     * const count = SessionDataManager.getSessionCount({ lessonId: 'lesson_123' });
     */
    static getSessionCount(filters = {}) {
        if (Object.keys(filters).length === 0) {
            // フィルターなし：全セッション数
            const allSessions = this.getAllSessions();
            return allSessions.length;
        }

        // フィルターあり：条件に合うセッション数
        const sessions = this.getSessionsByFilters(filters);
        return sessions.length;
    }

    // ===== デバッグ用 =====

    /**
     * デバッグ情報を出力
     */

    // ===== フィルタリング機能（不完全データ除外） =====

    /**
     * 特定のlessonIdの完全なセッションを取得
     * 
     * 不完全なレッスン（期待セッション数に満たない）は空配列を返す。
     * トレーニング記録・総合評価・詳細分析で使用。
     *
     * @param {string} lessonId - レッスンID
     * @param {string} mode - モードID (random, continuous, 12tone)
     * @param {string} chromaticDirection - 音階方向 (ascending, descending, ascending_descending)
     * @returns {Array} 完全なセッション配列（不完全な場合は空配列）
     *
     * @example
     * // 12音階上行モードのlessonが完全か確認
     * const sessions = SessionDataManager.getCompleteSessionsByLessonId(
     *     'lesson_123', '12tone', 'ascending'
     * );
     * if (sessions.length > 0) {
     *     console.log('完全なレッスン:', sessions);
     * }
     */
    static getCompleteSessionsByLessonId(lessonId, mode, chromaticDirection) {
        if (!lessonId) {
            console.warn('⚠️ SessionDataManager: lessonIdが未指定');
            return [];
        }

        const allSessions = this.getAllSessions();
        const lessonSessions = allSessions.filter(s => s.lessonId === lessonId);

        // 期待セッション数を取得
        const expectedSessions = window.ModeController
            ? window.ModeController.getSessionsPerLesson(mode, { direction: chromaticDirection })
            : 12; // デフォルト（12音階モード）

        // 完全なレッスンのみ返す
        if (lessonSessions.length >= expectedSessions) {
            console.log(`✅ [SessionDataManager] 完全レッスン: ${lessonId} (${lessonSessions.length}/${expectedSessions})`);
            return lessonSessions;
        }

        console.warn(`⚠️ [SessionDataManager] 不完全レッスン除外: ${lessonId} (${lessonSessions.length}/${expectedSessions})`);
        return [];
    }

    /**
     * 完全なレッスンのみをグループ化して取得
     * 
     * 全セッションをlessonId単位でグループ化し、不完全なレッスンを除外。
     * トレーニング記録・詳細分析で使用。
     *
     * @returns {Array} 完全なレッスン配列（各要素: { lessonId, mode, sessions, ... }）
     *
     * @example
     * const completeLessons = SessionDataManager.getCompleteLessons();
     * completeLessons.forEach(lesson => {
     *     console.log(`レッスン: ${lesson.mode}, セッション数: ${lesson.sessions.length}`);
     * });
     */
    static getCompleteLessons(sessions = null) {
        // 引数がない場合はlocalStorageから取得
        const allSessions = sessions !== null ? sessions : this.getAllSessions();

        // lessonIdでグループ化
        const lessonMap = {};
        allSessions.forEach(session => {
            const lessonId = session.lessonId;
            if (!lessonMap[lessonId]) {
                lessonMap[lessonId] = {
                    lessonId: lessonId,
                    mode: session.mode,
                    chromaticDirection: session.scaleDirection || session.chromaticDirection || 'ascending',
                    scaleDirection: session.scaleDirection || 'ascending',
                    startTime: session.startTime,
                    endTime: session.endTime || session.startTime,
                    sessions: []
                };
            }
            lessonMap[lessonId].sessions.push(session);

            // 開始・終了時刻を更新
            if (session.startTime < lessonMap[lessonId].startTime) {
                lessonMap[lessonId].startTime = session.startTime;
            }
            if ((session.endTime || session.startTime) > lessonMap[lessonId].endTime) {
                lessonMap[lessonId].endTime = session.endTime || session.startTime;
            }
        });

        // 完全なレッスンのみフィルタリング
        const lessons = Object.values(lessonMap);
        const completeLessons = lessons.filter(lesson => {
            const expectedSessions = window.ModeController
                ? window.ModeController.getSessionsPerLesson(lesson.mode, {
                    direction: lesson.chromaticDirection
                })
                : 8; // デフォルト（ランダムモード）

            const isComplete = lesson.sessions.length >= expectedSessions;
            if (!isComplete) {
                console.warn(`⚠️ [SessionDataManager] 不完全レッスン除外: ${lesson.mode}（${lesson.sessions.length}/${expectedSessions}セッション）[${lesson.lessonId}]`);
            }
            return isComplete;
        });

        console.log(`📊 [SessionDataManager] 全レッスン: ${lessons.length}件, 完全レッスン: ${completeLessons.length}件`);
        return completeLessons;
    }

    static debug() {
        const allSessions = this.getAllSessions();
        console.log('=== SessionDataManager Debug Info ===');
        console.log('Total Sessions:', allSessions.length);

        // mode別集計
        const modeGroups = {};
        allSessions.forEach(s => {
            modeGroups[s.mode] = (modeGroups[s.mode] || 0) + 1;
        });
        console.log('Mode Breakdown:', modeGroups);

        // lessonId別集計
        const lessonGroups = {};
        allSessions.forEach(s => {
            lessonGroups[s.lessonId] = (lessonGroups[s.lessonId] || 0) + 1;
        });
        console.log('Lesson Breakdown:', lessonGroups);

        console.log('=====================================');
    }
}

// グローバルに公開
window.SessionDataManager = SessionDataManager;

console.log('✅ SessionDataManager初期化完了');
