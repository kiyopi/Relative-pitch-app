/**
 * ReloadManager - リロード検出・遷移管理システム
 *
 * 【目的】
 * - trainingページへの遷移時のリロード検出を一元管理
 * - リロード時は preparation へリダイレクトしてマイク許可を再取得
 * - normalTransitionフラグの設定漏れを防止
 * - コードの重複を削減し、保守性を向上
 *
 * 【使用方法】
 * // 遷移時（フラグ自動設定）
 * ReloadManager.navigateToTraining();
 *
 * // リロード検出（trainingController / result-session-controller 内）
 * if (ReloadManager.detectReload()) {
 *     ReloadManager.showReloadDialog();
 *     await ReloadManager.redirectToPreparation('リロード検出');
 * }
 *
 * 【設計思想】
 * - training ページへの遷移 = 常に initializeRandomModeTraining() でリセット
 * - sessionCounter は localStorage の完了済みセッションから自動計算されるため、
 *   リセットしても次のセッション番号は自動的に正しくなる
 * - リロード検出は preparation へのリダイレクトのためだけに使用
 *
 * 【v2.1.0更新】
 * - Safari での SPA 遷移誤検出を修正
 * - 古いAPI（performance.navigation）を優先し、新しいAPIをフォールバックに変更
 * - 古いAPIで type === 0 の場合、新しいAPIをスキップ
 *
 * @version 2.1.0
 * @date 2025-10-23
 */

class ReloadManager {
    /**
     * sessionStorage キー定数
     */
    static KEYS = {
        NORMAL_TRANSITION: 'normalTransitionToTraining',
        REDIRECT_COMPLETED: 'reloadRedirected'
    };

    /**
     * trainingページへの正常な遷移フラグを設定
     *
     * 【重要】この関数を呼び出さずにtrainingへ遷移すると、リロードとして誤検出される
     */
    static setNormalTransition() {
        sessionStorage.setItem(this.KEYS.NORMAL_TRANSITION, 'true');
        console.log('✅ [ReloadManager] 正常な遷移フラグを設定');
    }

    /**
     * リロード検出
     *
     * 【重要】trainingController の initializeTrainingPage() で最初に呼び出す
     *
     * @returns {boolean} true: リロード検出, false: 正常な遷移
     */
    static detectReload() {
        console.log('🔍 [ReloadManager] リロード検出開始');

        // 1. リダイレクト済みフラグをチェック（2回目の検出を防止）
        const alreadyRedirected = sessionStorage.getItem(this.KEYS.REDIRECT_COMPLETED);
        if (alreadyRedirected === 'true') {
            console.log('✅ [ReloadManager] リダイレクト済み - 2回目の検出をスキップ');
            sessionStorage.removeItem(this.KEYS.REDIRECT_COMPLETED);
            return false;
        }

        // 2. 正常な遷移フラグをチェック（preparation → training 等）
        const normalTransition = sessionStorage.getItem(this.KEYS.NORMAL_TRANSITION);
        console.log('🔍 [ReloadManager] normalTransition フラグ:', normalTransition);
        if (normalTransition === 'true') {
            sessionStorage.removeItem(this.KEYS.NORMAL_TRANSITION);
            console.log('✅ [ReloadManager] 正常な遷移を検出');
            return false;
        }

        // 3. Performance Navigation API で検出（Safari では最も信頼できる）
        if (performance.navigation) {
            const navType = performance.navigation.type;
            console.log('🔍 [ReloadManager] performance.navigation.type:', navType);

            if (navType === 1) {
                // TYPE_RELOAD
                console.log('✅ [ReloadManager] リロード検出（古いAPI）: type === 1');
                sessionStorage.setItem(this.KEYS.REDIRECT_COMPLETED, 'true');
                return true;
            } else if (navType === 0) {
                // TYPE_NAVIGATE - SPA遷移として扱い、新しいAPIをスキップ
                // Safari では新しいAPIが誤って "reload" を返すため、古いAPIを優先
                console.log('✅ [ReloadManager] 正常な遷移（古いAPI）: type === 0 - 新しいAPIをスキップ');
                return false;
            }
        }

        // 4. Navigation Timing API v2（古いAPIが存在しない場合のみ）
        const navEntries = performance.getEntriesByType('navigation');
        console.log('🔍 [ReloadManager] Navigation Timing API v2（フォールバック）:', navEntries);
        if (navEntries.length > 0) {
            console.log('🔍 [ReloadManager] navEntries[0].type:', navEntries[0].type);
            if (navEntries[0].type === 'reload') {
                console.log('✅ [ReloadManager] リロード検出（新しいAPI）: type === "reload"');
                sessionStorage.setItem(this.KEYS.REDIRECT_COMPLETED, 'true');
                return true;
            }
        }

        console.log('❌ [ReloadManager] リロード未検出 - 通常のSPA遷移として扱う');
        return false;
    }

    /**
     * リロード検出時のダイアログ表示
     */
    static showReloadDialog() {
        alert('リロードが検出されました。マイク設定のため準備ページに移動します。');
    }

    /**
     * preparationページへリダイレクト（モード情報保持）
     *
     * @param {string} reason - リダイレクトの理由（ログ用）
     * @param {string|null} mode - モード（省略時はURLから取得）
     * @param {string|null} session - セッション番号（省略可）
     */
    static async redirectToPreparation(reason = '', mode = null, session = null) {
        console.log(`🔄 [ReloadManager] preparationへリダイレクト: ${reason}`);

        // モード情報が指定されていない場合、URLから取得
        if (!mode) {
            const hash = window.location.hash.substring(1);
            const params = new URLSearchParams(hash.split('?')[1] || '');
            mode = params.get('mode') || 'random';
            session = params.get('session') || '';
        }

        // preparationへリダイレクト（モード情報を保持）
        const redirectParams = new URLSearchParams({
            redirect: 'training',
            mode: mode
        });
        if (session) redirectParams.set('session', session);

        window.location.hash = `preparation?${redirectParams.toString()}`;

        // リダイレクト完了まで待機
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    /**
     * trainingページへ遷移（正常な遷移フラグを自動設定）
     *
     * 【推奨】trainingへの遷移は必ずこのメソッドを使用すること
     *
     * @param {string|null} mode - モード（省略時はパラメータなし）
     * @param {string|null} session - セッション番号（省略可）
     */
    static navigateToTraining(mode = null, session = null) {
        // 正常な遷移フラグを自動設定
        this.setNormalTransition();

        // 遷移
        if (mode) {
            const params = new URLSearchParams({ mode });
            if (session) params.set('session', session);
            window.location.hash = `training?${params.toString()}`;
            console.log(`🚀 [ReloadManager] trainingへ遷移: mode=${mode}, session=${session || 'なし'}`);
        } else {
            window.location.hash = 'training';
            console.log('🚀 [ReloadManager] trainingへ遷移（パラメータなし）');
        }
    }

    /**
     * リダイレクトエラーを生成
     *
     * router.js で特別処理するためのエラーオブジェクト
     *
     * @returns {Error} リダイレクト用エラー
     */
    static createRedirectError() {
        const error = new Error('REDIRECT_TO_PREPARATION');
        error.isRedirect = true;
        return error;
    }
}

// グローバルスコープに公開
window.ReloadManager = ReloadManager;

console.log('✅ [ReloadManager] ロード完了');
