/**
 * NavigationManager - ナビゲーション・遷移管理システム
 *
 * 【目的】
 * - リロード検出・遷移管理・ブラウザバック防止を一元管理
 * - リロード時は preparation へリダイレクトしてマイク許可を再取得
 * - ブラウザバック防止ページの設定とハンドラー管理を完全統合
 * - normalTransitionフラグの設定漏れを防止
 * - コードの重複を削減し、保守性を向上
 *
 * 【使用方法】
 * // 遷移時（フラグ自動設定）
 * NavigationManager.navigateToTraining();
 *
 * // リロード検出（trainingController / result-session-controller 内）
 * if (NavigationManager.detectReload()) {
 *     NavigationManager.showReloadDialog();
 *     await NavigationManager.redirectToPreparation('リロード検出');
 * }
 *
 * // ブラウザバック防止（router.jsから自動呼び出し）
 * NavigationManager.preventBrowserBack(page, confirmMessage);
 * NavigationManager.removeBrowserBackPrevention();
 *
 * 【設計思想】
 * - training ページへの遷移 = 常に initializeRandomModeTraining() でリセット
 * - sessionCounter は localStorage の完了済みセッションから自動計算されるため、
 *   リセットしても次のセッション番号は自動的に正しくなる
 * - リロード検出は preparation へのリダイレクトのためだけに使用
 * - ブラウザバック防止はページ設定に基づいて自動管理
 *
 * 【v3.0.0更新】
 * - ReloadManager → NavigationManager にリネーム
 * - ブラウザバック防止機能を統合（router.jsから移動）
 * - ページ単位のナビゲーション制御を一元化
 *
 * 【v2.1.0更新】
 * - Safari での SPA 遷移誤検出を修正
 * - 古いAPI（performance.navigation）を優先し、新しいAPIをフォールバックに変更
 * - 古いAPIで type === 0 の場合、新しいAPIをスキップ
 *
 * @version 3.0.0
 * @date 2025-10-24
 */

class NavigationManager {
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
        console.log('✅ [NavigationManager] 正常な遷移フラグを設定');
    }

    /**
     * リロード検出
     *
     * 【重要】trainingController の initializeTrainingPage() で最初に呼び出す
     *
     * @returns {boolean} true: リロード検出, false: 正常な遷移
     */
    static detectReload() {
        console.log('🔍 [NavigationManager] リロード検出開始');

        // 1. リダイレクト済みフラグをチェック（2回目の検出を防止）
        const alreadyRedirected = sessionStorage.getItem(this.KEYS.REDIRECT_COMPLETED);
        if (alreadyRedirected === 'true') {
            console.log('✅ [NavigationManager] リダイレクト済み - 2回目の検出をスキップ');
            sessionStorage.removeItem(this.KEYS.REDIRECT_COMPLETED);
            return false;
        }

        // 2. 正常な遷移フラグをチェック（preparation → training 等）
        const normalTransition = sessionStorage.getItem(this.KEYS.NORMAL_TRANSITION);
        console.log('🔍 [NavigationManager] normalTransition フラグ:', normalTransition);
        if (normalTransition === 'true') {
            sessionStorage.removeItem(this.KEYS.NORMAL_TRANSITION);
            console.log('✅ [NavigationManager] 正常な遷移を検出');
            return false;
        }

        // 3. Performance Navigation API で検出（Safari では最も信頼できる）
        if (performance.navigation) {
            const navType = performance.navigation.type;
            console.log('🔍 [NavigationManager] performance.navigation.type:', navType);

            if (navType === 1) {
                // TYPE_RELOAD
                console.log('✅ [NavigationManager] リロード検出（古いAPI）: type === 1');
                sessionStorage.setItem(this.KEYS.REDIRECT_COMPLETED, 'true');
                return true;
            } else if (navType === 0) {
                // TYPE_NAVIGATE - SPA遷移として扱い、新しいAPIをスキップ
                // Safari では新しいAPIが誤って "reload" を返すため、古いAPIを優先
                console.log('✅ [NavigationManager] 正常な遷移（古いAPI）: type === 0 - 新しいAPIをスキップ');
                return false;
            }
        }

        // 4. Navigation Timing API v2（古いAPIが存在しない場合のみ）
        const navEntries = performance.getEntriesByType('navigation');
        console.log('🔍 [NavigationManager] Navigation Timing API v2（フォールバック）:', navEntries);
        if (navEntries.length > 0) {
            console.log('🔍 [NavigationManager] navEntries[0].type:', navEntries[0].type);
            if (navEntries[0].type === 'reload') {
                console.log('✅ [NavigationManager] リロード検出（新しいAPI）: type === "reload"');
                sessionStorage.setItem(this.KEYS.REDIRECT_COMPLETED, 'true');
                return true;
            }
        }

        console.log('❌ [NavigationManager] リロード未検出 - 通常のSPA遷移として扱う');
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
        console.log(`🔄 [NavigationManager] preparationへリダイレクト: ${reason}`);

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
            console.log(`🚀 [NavigationManager] trainingへ遷移: mode=${mode}, session=${session || 'なし'}`);
        } else {
            window.location.hash = 'training';
            console.log('🚀 [NavigationManager] trainingへ遷移（パラメータなし）');
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

    // ==========================================
    // ブラウザバック防止機能（v3.0.0で追加）
    // ==========================================

    /**
     * ブラウザバック防止が必要なページの設定
     */
    static PAGE_CONFIG = {
        'training': {
            preventBackNavigation: true,
            backPreventionMessage: 'トレーニング中です。\n\nブラウザバックは無効になっています。\nホームボタンからトップページに戻れます。'
        },
        'result-session': {
            preventBackNavigation: true,
            backPreventionMessage: 'セッション評価中です。\n\nブラウザバックは無効になっています。\n「次の基音へ」ボタンまたはホームボタンをご利用ください。'
        },
        'results': {
            preventBackNavigation: true,
            backPreventionMessage: '総合評価画面です。\n\nブラウザバックは無効になっています。\nホームボタンまたは「新しいトレーニングを始める」ボタンをご利用ください。'
        },
        'results-overview': {
            preventBackNavigation: true,
            backPreventionMessage: '総合評価画面です。\n\nブラウザバックは無効になっています。\nホームボタンまたは「新しいトレーニングを始める」ボタンをご利用ください。'
        }
    };

    /**
     * popstateイベントハンドラー（インスタンス変数）
     */
    static popStateHandler = null;

    /**
     * ブラウザバック防止を有効化（自動設定）
     * @param {string} page - ページ名
     */
    static preventBrowserBack(page) {
        // ページ設定を取得
        const config = this.PAGE_CONFIG[page];
        if (!config || !config.preventBackNavigation) {
            console.log(`📍 [NavigationManager] ブラウザバック防止不要: ${page}`);
            return;
        }

        // 既存のハンドラーをクリーンアップ
        if (this.popStateHandler) {
            window.removeEventListener('popstate', this.popStateHandler);
            console.log('🔄 [NavigationManager] 既存のpopstateハンドラを削除');
        }

        const message = config.backPreventionMessage;

        // ダミーエントリーを複数追加（より確実な防止）
        history.pushState(null, '', location.href);
        history.pushState(null, '', location.href);
        console.log(`📍 [NavigationManager] ブラウザバック防止: ダミーエントリー追加×2 (${page})`);
        console.log(`📝 [NavigationManager] 通知メッセージ: ${message}`);

        // popstateハンドラーを定義（ダイアログ通知 + 完全禁止）
        this.popStateHandler = () => {
            // ユーザーに通知（OKを押すしか選択肢なし）
            alert(message);

            // OKを押した後にダミーエントリーを複数再追加して履歴スタックを補充
            // この順序により、何度バックしても必ずダイアログが表示される
            history.pushState(null, '', location.href);
            history.pushState(null, '', location.href);

            console.log(`🚫 [NavigationManager] ブラウザバックを無効化・通知表示 (${page})`);
        };

        // イベントリスナーを登録
        window.addEventListener('popstate', this.popStateHandler);
        console.log(`✅ [NavigationManager] ブラウザバック防止イベントリスナー登録完了 (${page})`);
    }

    /**
     * ブラウザバック防止を解除
     */
    static removeBrowserBackPrevention() {
        if (this.popStateHandler) {
            window.removeEventListener('popstate', this.popStateHandler);
            this.popStateHandler = null;
            console.log('✅ [NavigationManager] popstateイベントリスナーを削除');
        }
    }
}

// グローバルスコープに公開
window.NavigationManager = NavigationManager;

console.log('✅ [NavigationManager] ロード完了');
