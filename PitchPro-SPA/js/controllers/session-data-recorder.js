/**
 * セッションデータ記録モジュール
 * @version 3.0.0 - lessonID方式＋完全なモード管理統合
 * @description トレーニングセッションの音程誤差データを記録
 *
 * v3.0.0変更点（2025-11-11）:
 * - lessonId方式実装（セッションをレッスン単位で正確に管理）
 * - chromaticDirection追加（基音進行方向：random, ascending, descending等）
 * - scaleDirection追加（音階方向：ascending上行, descending下行）
 * - 後方互換性処理（既存のdirectionフィールド対応）
 *
 * v2.0.0変更点:
 * - プレミアムプラン判定統合
 * - 無料プランではランダムモードのみデータ保存なし
 * - 自動クリーンアップ実装（保存時）
 */

class SessionDataRecorder {
    constructor() {
        this.currentSession = null;

        // ページリロード時もセッションIDが衝突しないよう、localStorageから最大IDを取得
        const existingSessions = DataManager.getFromStorage('sessionData') || [];
        this.sessionCounter = existingSessions.length > 0
            ? Math.max(...existingSessions.map(s => s.sessionId))
            : 0;

        console.log(`📊 SessionDataRecorder初期化: sessionCounter = ${this.sessionCounter}`);
    }

    /**
     * 新しいセッションを開始
     * @param {string} baseNote - 基音（例: "C4"）
     * @param {number} baseFrequency - 基音周波数（Hz）
     * @param {string} mode - トレーニングモード（'random', 'continuous', '12tone'）
     * @param {object} options - オプション設定
     * @param {string} options.lessonId - レッスンID（必須）
     * @param {string} options.chromaticDirection - 基音進行方向（'random', 'ascending', 'descending', 'both'）
     * @param {string} options.scaleDirection - 音階方向（'ascending', 'descending'）
     * @param {string} options.direction - 【非推奨】後方互換性用（chromaticDirectionに変換される）
     */
    startNewSession(baseNote, baseFrequency, mode = 'random', options = {}) {
        // セッション開始前にlocalStorageと同期（localStorage消去対策）
        const existingSessions = DataManager.getFromStorage('sessionData') || [];
        const maxId = existingSessions.length > 0
            ? Math.max(...existingSessions.map(s => s.sessionId))
            : 0;

        // sessionCounterを常にlocalStorageと同期（クリア時も対応）
        if (this.sessionCounter !== maxId) {
            console.warn(`⚠️ sessionCounter不整合検出: 現在値=${this.sessionCounter}, localStorage最大値=${maxId}`);
            this.sessionCounter = maxId;
            console.log(`🔄 sessionCounterを再同期: ${this.sessionCounter}`);
        }

        this.sessionCounter++;

        // 後方互換性: direction → chromaticDirection変換
        const chromaticDirection = options.chromaticDirection || options.direction || 'random';
        const scaleDirection = options.scaleDirection || 'ascending';

        this.currentSession = {
            sessionId: this.sessionCounter,
            lessonId: options.lessonId || `legacy_lesson_${Date.now()}`, // レッスンID（必須）
            mode: mode,
            chromaticDirection: chromaticDirection, // 基音進行方向
            scaleDirection: scaleDirection,         // 音階方向
            baseNote: baseNote,
            baseFrequency: baseFrequency,
            startTime: Date.now(),
            pitchErrors: [],
            completed: false
        };

        console.log('📊 新しいセッション開始:', this.currentSession);
        console.log(`   lessonId: ${this.currentSession.lessonId}`);
        console.log(`   chromaticDirection: ${chromaticDirection}, scaleDirection: ${scaleDirection}`);

        return this.currentSession;
    }

    /**
     * 音程誤差を記録
     * @param {number} step - ステップ番号（0-7: ド-ド）
     * @param {string} expectedNote - 期待される音名（例: "C4"）
     * @param {number} expectedFrequency - 期待される周波数（Hz）
     * @param {number} detectedFrequency - 検出された周波数（Hz）
     * @param {number} clarity - 明瞭度（0-1）
     * @param {number} volume - 音量（0-1）
     */
    recordPitchError(step, expectedNote, expectedFrequency, detectedFrequency, clarity, volume) {
        if (!this.currentSession) {
            console.warn('⚠️ セッションが開始されていません');
            return;
        }

        // セント単位の誤差計算（1オクターブ = 1200セント）
        const errorInCents = this.calculateCentError(detectedFrequency, expectedFrequency);

        const pitchData = {
            step,
            expectedNote,
            expectedFrequency,
            detectedFrequency,
            errorInCents: parseFloat(errorInCents.toFixed(1)), // 小数点1位
            clarity: parseFloat(clarity.toFixed(3)),
            volume: parseFloat(volume.toFixed(3)),
            timestamp: Date.now()
        };

        this.currentSession.pitchErrors.push(pitchData);

        console.log(`📊 音程誤差記録 [Step ${step}]:`, pitchData);

        return pitchData;
    }

    /**
     * セント単位の誤差計算
     * @param {number} detected - 検出周波数
     * @param {number} expected - 期待周波数
     * @returns {number} セント単位の誤差
     */
    calculateCentError(detected, expected) {
        if (!detected || !expected || detected <= 0 || expected <= 0) {
            return 0;
        }
        return 1200 * Math.log2(detected / expected);
    }

    /**
     * セッションを完了してlocalStorageに保存
     * v2.1.0: 無料プランでも全データ保存（表示制限のみ）
     */
    completeSession() {
        if (!this.currentSession) {
            console.warn('⚠️ 完了するセッションがありません');
            return null;
        }

        this.currentSession.completed = true;
        this.currentSession.endTime = Date.now();
        this.currentSession.duration = this.currentSession.endTime - this.currentSession.startTime;

        console.log('✅ セッション完了:', this.currentSession);

        // 【v2.1.0】全モードでデータ保存（無料プランも含む）
        const subscriptionData = DataManager.getSubscriptionData();
        const isPremium = subscriptionData.premiumAccess.status === 'active';
        const mode = this.currentSession.mode;

        console.log(`📊 データ保存実行: モード=${mode}, プレミアム=${isPremium}`);

        // 無料プラン・プレミアム問わず全データ保存
        console.log('💾 localStorageに保存します');
        this.saveToStorage(this.currentSession);

        // 無料プランの場合は表示制限あり（DataManagerが管理）
        if (!isPremium) {
            console.log('ℹ️ 無料プラン: 7日以内のデータのみ表示（プレミアムで全データ閲覧可能）');
        }

        const completedSession = { ...this.currentSession };
        this.currentSession = null;

        return completedSession;
    }

    /**
     * localStorageにセッションデータを保存
     * v2.0.0: DataManager.saveSessionResultWithCleanup()を使用
     */
    saveToStorage(session) {
        try {
            // 【v2.0.0】自動クリーンアップ付きで保存
            DataManager.saveSessionResultWithCleanup(session);

            const allSessions = DataManager.getFromStorage('sessionData') || [];
            console.log(`✅ セッションデータ保存完了 (総セッション数: ${allSessions.length})`);
            console.log(`🧹 自動クリーンアップ実行済み`);

        } catch (error) {
            console.error('❌ セッションデータ保存エラー:', error);
        }
    }

    /**
     * 現在のセッション情報を取得
     */
    getCurrentSession() {
        return this.currentSession;
    }

    /**
     * セッション番号を取得
     */
    getSessionNumber() {
        return this.sessionCounter;
    }

    /**
     * セッションをリセット（エラー時など）
     */
    resetSession() {
        console.warn('⚠️ セッションをリセット');
        this.currentSession = null;

        // sessionCounterもlocalStorageと同期してリセット
        const existingSessions = DataManager.getFromStorage('sessionData') || [];
        this.sessionCounter = existingSessions.length > 0
            ? Math.max(...existingSessions.map(s => s.sessionId))
            : 0;

        console.log(`🔄 sessionCounterを再同期: ${this.sessionCounter}`);
    }
}

// グローバルインスタンス
window.sessionDataRecorder = new SessionDataRecorder();

// グローバル公開
window.SessionDataRecorder = SessionDataRecorder;
