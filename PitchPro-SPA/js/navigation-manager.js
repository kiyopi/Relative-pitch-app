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
 * 【v3.1.0更新】
 * - trainingページ途中離脱時のsessionStorageクリーンアップ機能追加
 * - result-session・results-overview・training以外への遷移時にcurrentLessonIdを自動削除
 * - これにより、途中離脱後の新規トレーニングで古いlessonIdが使用される問題を解決
 *
 * 【v4.2.3更新】
 * - detectReload()のチェック順序を修正（normalTransitionフラグを最優先に変更）
 * - preparation → trainingの正常な遷移で誤ってリロード判定される問題を修正
 * - normalTransition検出時にtrainingPageActiveフラグもクリアするように改善
 *
 * 【v4.3.1更新】
 * - popstateハンドラーでの許可された遷移時にnormalTransitionフラグを設定
 * - preparation → trainingの遷移がpopstateイベント経由の場合も正常に動作するように修正
 *
 * 【v4.3.2更新】
 * - result-sessionページに2フラグシステムを完全適用
 * - normalTransitionToResultSession専用フラグ追加
 * - checkPageAccess()にresult-session完全チェック追加
 * - ランダム基音モードでのリロード時マイク許可放棄問題を解決
 * - ドレミガイド進行中のマイク許可ダイアログ表示によるレッスン破綻を防止
 *
 * 【v4.3.3更新】
 * - 'results'エイリアス削除（'results-overview'のみに統一）
 * - results-overviewにダイレクトアクセス制御追加
 * - 未使用コード削除（showReloadDialog, redirectTo）
 * - PAGE_CONFIG・ALLOWED_TRANSITIONSから'results'削除
 * - コードベースのクリーンアップ完了（47行削減）
 *
 * 【v4.3.5更新】
 * - バックグラウンド放置セッションの古いフラグ誤検出問題を解決
 * - navigateToTraining()で古いtrainingPageActiveフラグを予防的にクリア
 * - 新規トレーニング開始時に「準備ページから開始してください」誤表示を防止
 * - バックグラウンド → 新規トレーニング開始フローの安定性向上
 *
 * 【v4.4.0更新】
 * - PitchProエラーハンドリングとの統合によるリロード処理改善
 * - training/result-sessionページでリロード時にPitchProのエラー通知を活用（Reactiveアプローチ）
 * - Safariバックグラウンドリロード後の自然なUX向上（alert()削除、PitchProに委譲）
 * - preparationページは現状維持（マイクテスト・音域テストがあるため）
 * - PAGE_CONFIG: training/result-sessionのreloadMessage・reloadRedirectTo削除
 *
 * 【v4.4.1更新】
 * - デスクトップ切り替え時のリロード誤検出問題を解決
 * - pageActiveフラグチェック内にvisibilitychange時間確認を統合
 * - 1秒未満 + 可視状態 = デスクトップ切り替え（誤検出防止）
 * - 1秒以上経過 = 本当のリロード（正しく検出）
 * - 順序変更不要で安全性確保（過去の失敗パターンを回避）
 *
 * 【v4.4.2更新】
 * - preparationページリロード後のクリーンアップを徹底
 * - preparationPageActiveフラグの確実なクリア（2段階alert()回避）
 * - REDIRECT_COMPLETEDフラグで2回目の検出を防止
 * - リロードメッセージの明確化（ユーザー混乱の解消）
 * - Hybridアプローチの明確化（preparation=Preventive, training/result-session=Reactive）
 *
 * 【v4.6.1更新】
 * - trainingダイレクトアクセス時のリダイレクト先を改善
 * - Navigation Timing API v2で新規ナビゲーション（ブックマーク等）を検出
 * - isNewNavigation()メソッド追加: navigate/reload/back_forwardを区別
 * - validateTrainingParams()メソッド追加: mode/direction/startNoteを検証
 * - モード情報なし → ホームへリダイレクト（モード選択画面）
 * - chromaticモードで基音なし → ホームへリダイレクト
 * - モード情報あり → preparationへリダイレクト（マイク準備）
 * - sessionStorageフラグ残存による誤検出を防止（新規ナビゲーション時にクリア）
 *
 * @version 4.6.1
 * @date 2025-11-22
 */

class NavigationManager {
    /**
     * sessionStorage キー定数
     */
    static KEYS = {
        NORMAL_TRANSITION: 'normalTransitionToTraining',
        NORMAL_TRANSITION_PREPARATION: 'normalTransitionToPreparation',
        NORMAL_TRANSITION_RESULT_SESSION: 'normalTransitionToResultSession',
        REDIRECT_COMPLETED: 'reloadRedirected'
    };

    /**
     * 最後のvisibilitychange発生時刻（ウィンドウ切り替え誤検出防止用）
     */
    static lastVisibilityChange = 0;

    /**
     * visibilitychange監視を初期化
     */
    static initVisibilityTracking() {
        if (!this.visibilityTrackingInitialized) {
            document.addEventListener('visibilitychange', async () => {
                this.lastVisibilityChange = Date.now();
                console.log('🔍 [NavigationManager] visibilitychange検出:', document.hidden ? 'hidden' : 'visible');
                console.log('🔍 [NavigationManager] lastVisibilityChange更新:', this.lastVisibilityChange);
                console.log('🔍 [NavigationManager] 現在のURL:', window.location.href);
                console.log('🔍 [NavigationManager] performance.navigation.type:', performance.navigation?.type);

                // 【v4.5.0】ページ可視状態復帰時にAudioContextをresumeする（iOS Safari対応）
                // MicrophoneLifecycleManagerはモニタリング再開のみでAudioContext.resume()を呼ばないため
                if (!document.hidden && window.globalAudioDetector) {
                    try {
                        const audioManager = window.globalAudioDetector.audioManager ||
                                            window.globalAudioDetector._audioManager ||
                                            window.globalAudioDetector.microphoneController?.audioManager;

                        if (audioManager?.audioContext && audioManager.audioContext.state === 'suspended') {
                            console.log('🔄 [NavigationManager] AudioContext suspended検出 - resume実行');
                            await audioManager.audioContext.resume();
                            console.log('✅ [NavigationManager] AudioContext resume完了');
                        }
                    } catch (e) {
                        console.warn('⚠️ [NavigationManager] AudioContext resume失敗:', e);
                    }
                }

                // グラフ状態のデバッグログ
                const chartLoading = document.getElementById('chart-loading');
                const chartContent = document.getElementById('chart-content');
                if (chartLoading && chartContent) {
                    console.log('📊 [DEBUG] chart-loading display:', chartLoading.style.display);
                    console.log('📊 [DEBUG] chart-content display:', chartContent.style.display);
                    console.log('📊 [DEBUG] window.resultsOverviewChart exists:', !!window.resultsOverviewChart);
                }
            });
            this.visibilityTrackingInitialized = true;
            console.log('✅ [NavigationManager] visibilitychange監視を初期化');
        }
    }

    /**
     * trainingページへの正常な遷移フラグを設定
     *
     * 【重要】この関数を呼び出さずにtrainingへ遷移すると、リロードとして誤検出される
     */
    static setNormalTransition() {
        sessionStorage.setItem(this.KEYS.NORMAL_TRANSITION, 'true');
        console.log('✅ [NavigationManager] 正常な遷移フラグを設定（training）');
    }

    /**
     * preparationページへの正常な遷移フラグを設定
     *
     * 【重要】この関数を呼び出さずにpreparationへ遷移すると、リロードとして誤検出される
     */
    static setNormalTransitionToPreparation() {
        sessionStorage.setItem(this.KEYS.NORMAL_TRANSITION_PREPARATION, 'true');
        console.log('✅ [NavigationManager] 正常な遷移フラグを設定（preparation）');
    }

    /**
     * result-sessionページへの正常な遷移フラグを設定
     *
     * 【重要】この関数を呼び出さずにresult-sessionへ遷移すると、リロードとして誤検出される
     */
    static setNormalTransitionToResultSession() {
        sessionStorage.setItem(this.KEYS.NORMAL_TRANSITION_RESULT_SESSION, 'true');
        console.log('✅ [NavigationManager] 正常な遷移フラグを設定（result-session）');
    }

    /**
     * 【v4.3.0】リロード検出（汎用化）
     *
     * 【重要】router.js の loadPage() で最初に呼び出す
     *
     * @param {string|null} page - ページ名（省略時は後方互換性モード）
     * @returns {boolean} true: リロード検出, false: 正常な遷移
     */
    static detectReload(page = null) {
        console.log(`🔍 [NavigationManager] リロード検出開始 (page: ${page || 'なし'})`);

        // 0. visibilitychange監視を初期化（初回のみ）
        this.initVisibilityTracking();

        // 1. 正常な遷移フラグをチェック（最優先）
        // preparation → training 等の正常な遷移を最初に除外
        const normalTransition = sessionStorage.getItem(this.KEYS.NORMAL_TRANSITION);
        console.log('🔍 [NavigationManager] normalTransition フラグ:', normalTransition);
        if (normalTransition === 'true') {
            sessionStorage.removeItem(this.KEYS.NORMAL_TRANSITION);

            // 正常な遷移なので、ページアクティブフラグもクリア
            if (page) {
                sessionStorage.removeItem(page + 'PageActive');
                console.log(`✅ [NavigationManager] ${page}PageActiveフラグをクリア（正常な遷移）`);
            }
            // 後方互換性: trainingPageActiveもクリア
            sessionStorage.removeItem('trainingPageActive');

            console.log('✅ [NavigationManager] 正常な遷移を検出');
            return false;
        }

        // 2. リダイレクト済みフラグをチェック（2回目の検出を防止）
        const alreadyRedirected = sessionStorage.getItem(this.KEYS.REDIRECT_COMPLETED);
        if (alreadyRedirected === 'true') {
            console.log('✅ [NavigationManager] リダイレクト済み - 2回目の検出をスキップ');
            sessionStorage.removeItem(this.KEYS.REDIRECT_COMPLETED);
            return false;
        }

        // 3. 【v4.3.6】ページアクティブフラグチェック（動的）
        // ページが前回アクティブだった = リロードまたはクラッシュ
        // ただし、デスクトップ切り替えの誤検出を防止
        if (page) {
            const wasPageActive = sessionStorage.getItem(page + 'PageActive');
            if (wasPageActive === 'true') {
                // デスクトップ切り替えの可能性を確認
                const timeSinceVisibilityChange = Date.now() - this.lastVisibilityChange;

                // 1秒未満 + ページが可視状態 = デスクトップ切り替え
                if (timeSinceVisibilityChange < 1000 && document.visibilityState === 'visible') {
                    console.log(`✅ [NavigationManager] デスクトップ切り替え検出 - リロードではない (${timeSinceVisibilityChange}ms)`);
                    // pageActiveフラグは保持（次回のリロード検出用）
                    return false;
                }

                // 本当のリロード
                console.log(`⚠️ [v4.3.6] ${page}PageActiveフラグ検出 - リロード確定 (visibilitychangeから${timeSinceVisibilityChange}ms経過)`);
                sessionStorage.removeItem(page + 'PageActive');
                return true;  // リロード検出
            }
        }

        // 後方互換性: trainingPageActiveもチェック（同様の誤検出防止ロジック適用）
        const wasTrainingActive = sessionStorage.getItem('trainingPageActive');
        if (wasTrainingActive === 'true') {
            // デスクトップ切り替えの可能性を確認
            const timeSinceVisibilityChange = Date.now() - this.lastVisibilityChange;

            // 1秒未満 + ページが可視状態 = デスクトップ切り替え
            if (timeSinceVisibilityChange < 1000 && document.visibilityState === 'visible') {
                console.log(`✅ [NavigationManager] デスクトップ切り替え検出（後方互換） - リロードではない (${timeSinceVisibilityChange}ms)`);
                // trainingPageActiveフラグは保持（次回のリロード検出用）
                return false;
            }

            // 本当のリロード
            console.log(`⚠️ [後方互換] trainingPageActiveフラグ検出 - リロード確定 (visibilitychangeから${timeSinceVisibilityChange}ms経過)`);
            sessionStorage.removeItem('trainingPageActive');
            return true;  // リロード検出
        }

        // 4. ウィンドウ切り替え誤検出を防止（1秒以内のvisibilitychangeは除外）
        const timeSinceVisibilityChange = Date.now() - this.lastVisibilityChange;
        console.log('🔍 [NavigationManager] 最後のvisibilitychangeからの経過時間:', timeSinceVisibilityChange + 'ms');

        // 1秒以内 OR lastVisibilityChangeが記録されていない（初期値0）場合
        if (timeSinceVisibilityChange < 1000 || this.lastVisibilityChange === 0) {
            if (this.lastVisibilityChange === 0) {
                console.log('✅ [NavigationManager] visibilitychange未記録 - 長時間バックグラウンドまたは初回アクセス');
            } else {
                console.log('✅ [NavigationManager] ウィンドウ切り替え検出 - リロードではない');
            }

            // さらに、ページが実際に表示されている（visible）か確認
            if (document.visibilityState === 'visible') {
                console.log('✅ [NavigationManager] ページ可視状態確認 - バックグラウンドからの復帰');
                return false;
            }
        }

        // 5. Navigation Timing API v2（モダンAPI優先）
        const navEntries = performance.getEntriesByType('navigation');
        console.log('🔍 [NavigationManager] Navigation Timing API v2:', navEntries);
        if (navEntries.length > 0) {
            const navType = navEntries[0].type;
            console.log('🔍 [NavigationManager] navEntries[0].type:', navType);
            if (navType === 'reload') {
                console.log('✅ [NavigationManager] リロード検出（Navigation Timing API v2）: type === "reload"');
                sessionStorage.setItem(this.KEYS.REDIRECT_COMPLETED, 'true');
                return true;
            } else {
                console.log('✅ [NavigationManager] 正常な遷移（Navigation Timing API v2）: type === "' + navType + '"');
                return false;
            }
        }

        // 6. フォールバック: 古いAPI（非推奨だが念のため）
        if (performance.navigation && performance.navigation.type === 1) {
            console.log('⚠️ [NavigationManager] リロード検出（古いAPI・フォールバック）: type === 1');
            sessionStorage.setItem(this.KEYS.REDIRECT_COMPLETED, 'true');
            return true;
        }

        console.log('❌ [NavigationManager] リロード未検出 - 通常のSPA遷移として扱う');
        return false;
    }

    /**
     * 【v4.6.1】新規ナビゲーション検出（ブックマーク・URL直接入力等）
     *
     * Navigation Timing API v2を使用して、SPA内遷移と新規ナビゲーションを区別
     * - 'navigate': 新規ナビゲーション（ブックマーク、URL入力、外部リンク）
     * - 'reload': リロード
     * - 'back_forward': 戻る/進む
     *
     * @returns {boolean} true: 新規ナビゲーション, false: SPA内遷移またはリロード
     */
    static isNewNavigation() {
        const navEntries = performance.getEntriesByType('navigation');
        if (navEntries.length > 0) {
            const navType = navEntries[0].type;
            console.log(`🔍 [NavigationManager] Navigation type: ${navType}`);
            return navType === 'navigate';
        }
        // フォールバック: 古いAPI
        if (performance.navigation) {
            const isNavigate = performance.navigation.type === 0; // TYPE_NAVIGATE
            console.log(`🔍 [NavigationManager] Navigation type (legacy): ${performance.navigation.type} (navigate: ${isNavigate})`);
            return isNavigate;
        }
        return false;
    }

    /**
     * 【v4.6.1】trainingページアクセス時のパラメータ検証
     *
     * URLパラメータからモード・方向・基音を取得し、ModeControllerに委譲して検証
     * 新規モード追加時はModeController.modesのみ更新すればOK
     *
     * @returns {Object} { isValid: boolean, reason: string, message: string, params: object }
     */
    static validateTrainingParams() {
        const hash = window.location.hash.substring(1);
        const urlParams = new URLSearchParams(hash.split('?')[1] || '');

        const params = {
            mode: urlParams.get('mode'),
            direction: urlParams.get('direction'),  // デフォルト値は設定しない（必須パラメータ）
            startNote: urlParams.get('startNote'),
            chromaticDirection: urlParams.get('chromaticDirection')
        };

        console.log(`🔍 [NavigationManager] Training params from URL:`, params);

        // ModeControllerが利用可能か確認
        if (typeof window.ModeController === 'undefined' || !window.ModeController.validateTrainingParams) {
            console.warn('⚠️ [NavigationManager] ModeController.validateTrainingParams not available, using fallback');
            // フォールバック: 基本的なチェックのみ
            if (!params.mode) {
                return { isValid: false, reason: 'no-mode', message: 'モードが指定されていません。', params };
            }
            if (!params.direction) {
                return { isValid: false, reason: 'no-direction', message: '方向が指定されていません。', params };
            }
            return { isValid: true, reason: 'valid', message: 'パラメータは有効です（フォールバック）。', params };
        }

        // ModeControllerに検証を委譲
        const result = window.ModeController.validateTrainingParams(params);

        return {
            isValid: result.isValid,
            reason: result.reason,
            message: result.message,
            params
        };
    }

    /**
     * 【v4.3.0】ダイレクトアクセス検出（準備ページ経由が必要かチェック）
     *
     * トレーニングページ・セッション評価ページは必ず準備ページ経由でアクセスさせる
     * ブックマークからの直接アクセスを検出し、準備ページにリダイレクトする
     *
     * 【重要】マイク許可が必須のため、準備ページ経由を強制
     * - ダイレクトアクセス → マイク許可なし → 基音再生時にダイアログ → セッション破綻
     *
     * @param {string} page - チェック対象のページ名
     * @returns {boolean} true: 準備ページ経由が必要, false: 直接アクセス可能
     */
    static requiresPreparation(page) {
        // トレーニング・セッション評価以外は準備不要
        if (page !== 'training' && page !== 'result-session') {
            return false;
        }

        console.log(`🔍 [NavigationManager] ${page}へのアクセス経路チェック開始`);

        // 1. 正常な遷移フラグチェック（最優先）
        const hasNormalTransition = sessionStorage.getItem(this.KEYS.NORMAL_TRANSITION) === 'true';
        if (hasNormalTransition) {
            console.log('✅ [NavigationManager] 正常な遷移フラグ検出 - 準備ページ経由済み');
            return false;  // 準備ページを経由している
        }

        // 2. ページアクティブフラグチェック（リロード検出と重複しないように）
        const wasPageActive = sessionStorage.getItem(page + 'PageActive') === 'true';
        if (wasPageActive) {
            console.log('✅ [NavigationManager] ページアクティブフラグ検出 - リロード検出で処理');
            return false;  // リロード検出で処理される
        }

        // 3. ダイレクトアクセス検出
        console.log(`⚠️ [NavigationManager] ${page}へのダイレクトアクセス検出 - 準備ページ経由が必要`);
        return true;
    }

    /**
     * 【v4.4.0】準備ページをスキップしてトレーニング直行できるか判定（4層防御アプローチ）
     *
     * 【目的】
     * 総合評価ページからのレッスン開始時、既にマイク許可・音域データが揃っている場合、
     * 準備ページをスキップしてトレーニングページへ直接遷移することでUXを向上させる。
     *
     * 【安定性重視の4層防御】
     * - Layer 1: ページリロード検出 → リロード時は必ず準備ページへ（MediaStream破棄対策）
     * - Layer 2: localStorage確認 → 基本的なデータ存在チェック
     * - Layer 3: Permissions API → 実際のマイク権限状態を確認
     * - Layer 4: AudioDetector存在・有効性確認 → AudioDetectorが初期化済みで再利用可能かチェック
     *
     * 【条件（すべて満たす必要あり）】
     * 1. ページリロードではない（performance.navigation.type !== 1）
     * 2. マイク許可済み（localStorage: micPermissionGranted = 'true'）
     * 3. 音域データあり（localStorage: voiceRangeData が存在）
     * 4. 実際のマイク権限が'granted'状態（Permissions API確認）
     * 5. AudioDetectorが初期化済みで健全（verifyAudioDetectorState確認）
     *
     * @returns {Promise<boolean>} true: 準備スキップ可能, false: 準備ページ経由が必要
     */
    static async canSkipPreparation() {
        // === Layer 1: リロード検出（最も確実な防御） ===
        // ページリロード時はMediaStreamが破棄されるため準備必須
        if (performance.navigation && performance.navigation.type === 1) {
            console.log('⚠️ [NavigationManager] Layer 1: ページリロード検出 → 準備ページ必須');
            return false;
        }

        // === Layer 2: localStorage確認（基本チェック） ===
        const micGranted = localStorage.getItem('micPermissionGranted') === 'true';
        const voiceRangeData = localStorage.getItem('voiceRangeData');
        const hasVoiceRange = voiceRangeData && voiceRangeData !== 'null';

        if (!micGranted || !hasVoiceRange) {
            console.log(`⚠️ [NavigationManager] Layer 2: localStorage不足 (mic: ${micGranted}, range: ${hasVoiceRange}) → 準備ページ必須`);
            return false;
        }

        // === Layer 3: Permissions API（実際の権限状態確認） ===
        try {
            // Permissions APIでマイク権限の実際の状態を確認
            const permissionStatus = await navigator.permissions.query({ name: 'microphone' });

            if (permissionStatus.state !== 'granted') {
                console.log(`⚠️ [NavigationManager] Layer 3: マイク許可が失効 (state: ${permissionStatus.state}) → 準備ページ必須`);
                return false;
            }

            // === Layer 4: AudioDetector存在・有効性確認（v4.4.0追加） ===
            // マイク許可とlocalStorageがあっても、AudioDetectorが未初期化または異常状態の場合は準備必須
            if (!this.currentAudioDetector) {
                console.log('⚠️ [NavigationManager] Layer 4: AudioDetector未初期化 → 準備ページ必須');
                return false;
            }

            const verification = this.verifyAudioDetectorState(this.currentAudioDetector);
            if (!verification.canReuse) {
                console.log(`⚠️ [NavigationManager] Layer 4: AudioDetector異常 (${verification.reason}) → 準備ページ必須`);
                return false;
            }

            // すべてのチェックをパス
            console.log('✅ [NavigationManager] 4層すべてパス → 準備スキップ可能');
            return true;

        } catch (error) {
            // Permissions API未サポート時は安全側に倒す
            console.warn('⚠️ [NavigationManager] Layer 3: Permissions API未サポート → 安全のため準備ページへ', error);
            return false;
        }
    }

    /**
     * 【v4.3.1】ページアクセス制御の統一チェック
     *
     * ダイレクトアクセス検出・リロード検出を統一的に処理し、
     * 必要に応じてリダイレクトを実行する
     *
     * router.jsから呼び出される統一エントリーポイント
     *
     * @param {string} page - チェック対象のページ名
     * @returns {Promise<Object>} { shouldContinue: boolean, reason: string }
     *   - shouldContinue: true = ページ初期化を続行, false = リダイレクト済み（初期化中断）
     *   - reason: 中断理由（'direct-access-preparation', 'direct-access-training', 'reload', 'continue'）
     */
    static async checkPageAccess(page) {
        const config = this.PAGE_CONFIG[page];

        // 0. preparationページの正常な遷移フラグをチェック（最優先）
        if (page === 'preparation') {
            const normalTransition = sessionStorage.getItem(this.KEYS.NORMAL_TRANSITION_PREPARATION);
            if (normalTransition === 'true') {
                sessionStorage.removeItem(this.KEYS.NORMAL_TRANSITION_PREPARATION);
                console.log('✅ [NavigationManager] 正常な遷移検出（preparation）');

                // 正常な遷移なので preparationPageActive フラグを設定
                sessionStorage.setItem('preparationPageActive', 'true');
                console.log('✅ [NavigationManager] preparationPageActiveフラグを設定（正常な遷移）');

                return { shouldContinue: true, reason: 'continue' };
            }
        }

        // 1. preparationページのダイレクトアクセス検出
        // （normalTransitionフラグがない場合のみここに到達）
        if (page === 'preparation' && config?.directAccessRedirectTo) {
            const wasPreparationActive = sessionStorage.getItem('preparationPageActive') === 'true';
            if (!wasPreparationActive) {
                console.log('⚠️ [NavigationManager] preparationページへのダイレクトアクセス検出');

                if (config.directAccessMessage) {
                    alert(config.directAccessMessage);
                }

                window.location.hash = config.directAccessRedirectTo;
                return { shouldContinue: false, reason: 'direct-access-preparation' };
            }
        }

        // 1-2. result-sessionページの正常な遷移フラグをチェック（最優先）
        if (page === 'result-session') {
            const normalTransition = sessionStorage.getItem(this.KEYS.NORMAL_TRANSITION_RESULT_SESSION);
            if (normalTransition === 'true') {
                sessionStorage.removeItem(this.KEYS.NORMAL_TRANSITION_RESULT_SESSION);
                console.log('✅ [NavigationManager] 正常な遷移検出（result-session）');

                // 正常な遷移なので resultSessionPageActive フラグを設定
                sessionStorage.setItem('resultSessionPageActive', 'true');
                console.log('✅ [NavigationManager] resultSessionPageActiveフラグを設定（正常な遷移）');

                return { shouldContinue: true, reason: 'continue' };
            }
        }

        // 1-3. result-sessionページのダイレクトアクセス検出
        // （normalTransitionフラグがない場合のみここに到達）
        if (page === 'result-session' && config?.directAccessRedirectTo) {
            const wasResultSessionActive = sessionStorage.getItem('resultSessionPageActive') === 'true';
            if (!wasResultSessionActive) {
                console.log('⚠️ [NavigationManager] result-sessionページへのダイレクトアクセス検出');

                if (config.directAccessMessage) {
                    alert(config.directAccessMessage);
                }

                await this.redirectToPreparation('result-sessionページへのダイレクトアクセス検出');
                return { shouldContinue: false, reason: 'direct-access-result-session' };
            }
        }

        // 1-4. results-overviewページのダイレクトアクセス検出
        if (page === 'results-overview' && config?.directAccessRedirectTo) {
            // 正常な遷移経路チェック：training完了 or result-session完了 or records遷移
            const hasCompletedTraining = sessionStorage.getItem('trainingPageActive') === 'true';
            const hasCompletedResultSession = sessionStorage.getItem('resultSessionPageActive') === 'true';

            // レコードページからの遷移チェック
            // 【デバッグ】URLハッシュ確認
            console.log('🔍 [DEBUG] window.location.hash:', window.location.hash);
            const hashParts = window.location.hash.split('?');
            console.log('🔍 [DEBUG] hashParts:', hashParts);
            const params = new URLSearchParams(hashParts[1] || '');
            const isFromRecords = params.get('fromRecords') === 'true';
            console.log('🔍 [DEBUG] fromRecords param:', params.get('fromRecords'), 'isFromRecords:', isFromRecords);
            console.log('🔍 [DEBUG] hasCompletedTraining:', hasCompletedTraining);
            console.log('🔍 [DEBUG] hasCompletedResultSession:', hasCompletedResultSession);

            if (isFromRecords) {
                console.log('✅ [NavigationManager] レコードページからの正常な遷移を検出');
            }

            if (!hasCompletedTraining && !hasCompletedResultSession && !isFromRecords) {
                console.log('⚠️ [NavigationManager] results-overviewページへのダイレクトアクセス検出');

                if (config.directAccessMessage) {
                    alert(config.directAccessMessage);
                }

                window.location.hash = config.directAccessRedirectTo;
                return { shouldContinue: false, reason: 'direct-access-results-overview' };
            }
        }

        // 2. trainingページのダイレクトアクセス検出
        // 【v4.6.1】新規ナビゲーション（ブックマーク等）の場合、URLパラメータで判定
        // 【v4.6.2修正】NORMAL_TRANSITIONフラグがある場合は正常なSPA遷移として判定
        const hasNormalTransitionFlag = sessionStorage.getItem(this.KEYS.NORMAL_TRANSITION) === 'true';
        if (page === 'training' && this.isNewNavigation() && !hasNormalTransitionFlag) {
            console.log('🔍 [v4.6.2] trainingページへの新規ナビゲーション検出（フラグなし）');

            // sessionStorageフラグをクリア（古い状態を引き継がない）
            sessionStorage.removeItem('trainingPageActive');
            sessionStorage.removeItem(this.KEYS.NORMAL_TRANSITION);

            const validation = this.validateTrainingParams();

            if (!validation.isValid) {
                // パラメータ不足 → ホームへリダイレクト（モード選択から）
                console.log(`⚠️ [v4.6.1] パラメータ不足: ${validation.reason}`);

                // ModeControllerから返されたメッセージを使用（ホームへの案内を追加）
                const alertMessage = `${validation.message}\nホーム画面からやり直してください。`;
                alert(alertMessage);
                window.location.hash = 'home';
                return { shouldContinue: false, reason: `direct-access-training-${validation.reason}` };
            } else {
                // パラメータ有効 → preparationへリダイレクト（マイク準備が必要）
                const mode = validation.params?.mode;
                console.log(`✅ [v4.6.1] パラメータ有効 - preparationへリダイレクト (mode: ${mode})`);
                alert('トレーニングページは準備ページから開始してください。\nマイク設定のため準備ページに移動します。');
                await this.redirectToPreparation('ダイレクトアクセス検出（パラメータ有効）');
                return { shouldContinue: false, reason: 'direct-access-training-to-preparation' };
            }
        } else if (page === 'training' && hasNormalTransitionFlag) {
            // 【v4.6.2】正常なSPA遷移 - ダイレクトアクセス検出をスキップ
            console.log('✅ [v4.6.2] 正常なSPA遷移検出（NORMAL_TRANSITIONフラグあり）- ダイレクトアクセス検出スキップ');
        }

        // 従来のダイレクトアクセス検出（SPA内遷移でフラグがない場合）
        if (this.requiresPreparation(page)) {
            alert('トレーニングページは準備ページから開始してください。\nマイク設定のため準備ページに移動します。');
            await this.redirectToPreparation('ダイレクトアクセス検出');
            return { shouldContinue: false, reason: 'direct-access-training' };
        }

        // 3. リロード検出
        if (config?.preventReload && this.detectReload(page)) {
            // training/result-sessionページ: PitchProに任せる（Reactiveアプローチ）
            if (page === 'training' || page === 'result-session') {
                console.log(`⚠️ [NavigationManager] ${page}ページでリロード検出 - PitchProのエラーハンドリングに委譲`);
                // sessionStorageフラグのみクリア
                sessionStorage.removeItem(page + 'PageActive');
                // ページ初期化続行 → PitchProがマイクエラーを処理
                return { shouldContinue: true, reason: 'reload-handled-by-pitchpro' };
            }

            // 【v4.6.0】preparationページ: 常にページ継続（Step 1から再開）
            // 理由: セクション表示/非表示の複雑さを考慮し、統一動作でバグ防止
            if (page === 'preparation') {
                console.log('✅ [v4.6.0] preparationリロード検出 - ページ継続（Step 1から再開）');
                sessionStorage.removeItem('preparationPageActive');
                sessionStorage.removeItem('preparationCurrentStep');
                return { shouldContinue: true, reason: 'preparation-reload-continue' };
            }

            // その他のページ: 従来通りのPreventiveアプローチ
            if (config.reloadMessage) {
                alert(config.reloadMessage);
            }

            // 【v4.4.2】preparationPageActiveフラグを確実にクリア
            // （detectReload内で削除されているはずだが、念のため再確認）
            if (page === 'preparation') {
                sessionStorage.removeItem('preparationPageActive');
                sessionStorage.removeItem('preparationCurrentStep');
                console.log('✅ [NavigationManager] preparationフラグをクリア（リロード検出後）');
            }

            // 【v4.4.2】リダイレクト完了フラグを設定（2回目の検出を防止）
            sessionStorage.setItem(this.KEYS.REDIRECT_COMPLETED, 'true');
            console.log('✅ [NavigationManager] リダイレクト完了フラグを設定');

            const redirectTo = config.reloadRedirectTo || 'home';
            if (redirectTo === 'preparation') {
                await this.redirectToPreparation('リロード検出');
            } else {
                window.location.hash = redirectTo;
            }
            return { shouldContinue: false, reason: 'reload' };
        }

        // 4. すべてのチェックをパス - 初期化続行
        return { shouldContinue: true, reason: 'continue' };
    }

    /**
     * 【v4.3.0】preparationページへリダイレクト（モード情報保持）
     *
     * @param {string} reason - リダイレクトの理由（ログ用）
     * @param {string|null} mode - モード（省略時はURLから取得）
     * @param {string|null} session - セッション番号（省略可）
     */
    static async redirectToPreparation(reason = '', mode = null, session = null) {
        // モード情報が指定されていない場合、sessionStorage → URLの順で取得
        if (!mode) {
            // 1. sessionStorageから取得（最優先・リロード時に正確なモード保持）
            mode = sessionStorage.getItem('currentMode');
            console.log(`🔍 [NavigationManager] sessionStorage.currentMode: ${mode}`);

            // 2. sessionStorageになければURLから取得
            if (!mode) {
                const hash = window.location.hash.substring(1);
                const params = new URLSearchParams(hash.split('?')[1] || '');
                mode = params.get('mode');
                console.log(`🔍 [NavigationManager] URLパラメータ.mode: ${mode}`);
            }

            // 3. それでもなければデフォルト
            if (!mode) {
                mode = 'random';
                console.log(`🔍 [NavigationManager] デフォルトモード使用: ${mode}`);
            }
        }

        // セッション番号も同様に取得
        if (!session) {
            session = sessionStorage.getItem('currentSession') || '';
            if (!session) {
                const hash = window.location.hash.substring(1);
                const params = new URLSearchParams(hash.split('?')[1] || '');
                session = params.get('session') || '';
            }
        }

        console.log(`🔄 [NavigationManager] preparationへリダイレクト: ${reason} (mode: ${mode}, session: ${session})`);

        // PitchProリソース破棄・ナビゲーション制約解除
        if (this.currentAudioDetector) {
            console.log('🧹 [NavigationManager] PitchProクリーンアップ開始');
            this._destroyAudioDetector(this.currentAudioDetector);
            this.currentAudioDetector = null;
        }

        this.disableNavigationWarning();
        this.removeBrowserBackPrevention();
        console.log('✅ [NavigationManager] ナビゲーション制約を自動解除');

        // 【v4.3.2】正常な遷移フラグを設定（リダイレクト先での正常な遷移として扱う）
        this.setNormalTransitionToPreparation();

        // preparationへリダイレクト（redirect='training'パラメータ追加）
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
     * @param {string|null} direction - 12音階モード方向（'ascending' | 'descending'）
     * @param {string|null} scaleDirection - 音階の上行・下行方向（'ascending' | 'descending'）
     */
    static navigateToTraining(mode = null, session = null, direction = null, scaleDirection = null) {
        console.log(`🚀 [NavigationManager] trainingへ遷移: mode=${mode || 'なし'}, session=${session || 'なし'}, direction=${direction || 'なし'}, scaleDirection=${scaleDirection || 'なし'}`);

        // 【v4.3.5】古いtrainingPageActiveフラグをクリアして誤検出防止
        // バックグラウンドで放置されたセッションのフラグが残っている場合、
        // 新しいトレーニング開始時にリロードとして誤検出されるため削除
        const oldFlag = sessionStorage.getItem('trainingPageActive');
        if (oldFlag === 'true') {
            sessionStorage.removeItem('trainingPageActive');
            console.log('🧹 [NavigationManager] 古いtrainingPageActiveフラグを削除（新規トレーニング開始のため）');
        }

        // 正常な遷移フラグを自動設定
        this.setNormalTransition();

        // 【v4.3.3追加】PitchShifter初期化を自動実行（バックグラウンド）
        // トレーニング開始時に基音再生が即座にできるよう、事前に初期化
        if (window.router && typeof window.router.initializePitchShifterBackground === 'function') {
            window.router.initializePitchShifterBackground();
            console.log('🎹 [NavigationManager] PitchShifter初期化開始（自動）');
        }

        // 遷移先を構築
        let targetHash;
        if (mode) {
            const params = new URLSearchParams({ mode });
            if (session) params.set('session', session);
            if (direction) params.set('direction', direction); // 12音階モード方向パラメータ追加
            if (scaleDirection) params.set('scaleDirection', scaleDirection); // 上行・下行方向パラメータ追加
            targetHash = `training?${params.toString()}`;
        } else {
            targetHash = 'training';
        }

        console.log('🔍 [DEBUG] targetHash:', targetHash);

        // safeNavigateを使用してpopstate/beforeunloadを回避
        this.safeNavigate(targetHash);
    }

    // ==========================================
    // 統一ナビゲーションシステム（v4.0.0）
    // ==========================================

    /**
     * 現在のAudioDetectorインスタンス
     * PitchProマイク状態監視対応のため、遷移前に自動破棄
     */
    static currentAudioDetector = null;

    /**
     * AudioDetectorを登録
     * ページ側でaudioDetectorを初期化した際に呼び出す
     *
     * @param {Object} audioDetector - AudioDetectionComponentインスタンス
     */
    static registerAudioDetector(audioDetector) {
        // 【v4.6.1】同じインスタンスの場合は破棄しない
        if (this.currentAudioDetector === audioDetector) {
            console.log('ℹ️ [NavigationManager] 同一AudioDetector再登録 - スキップ');
            return;
        }

        // 既存インスタンスがある場合は先に破棄
        if (this.currentAudioDetector) {
            console.warn('⚠️ [NavigationManager] 既存AudioDetectorを破棄');
            this._destroyAudioDetector(this.currentAudioDetector);
        }

        this.currentAudioDetector = audioDetector;
        console.log('✅ [NavigationManager] AudioDetector登録完了');
    }

    /**
     * 遷移がトレーニングフロー内かどうか判定
     *
     * @param {string} from - 遷移元ページ
     * @param {string} to - 遷移先ページ
     * @returns {boolean} true: フロー内（MediaStream保持）, false: フロー外（破棄）
     */
    static isTrainingFlow(from, to) {
        // トレーニングフロー内の遷移パターン
        const trainingFlowPatterns = [
            ['training', 'result-session'],      // セッション完了
            ['result-session', 'training'],      // 次のセッション
            ['preparation', 'training'],         // 準備完了
            ['result-session', 'results-overview'], // 8セッション完了（ランダム基音）
            ['training', 'results-overview'],    // 12-24セッション完了（12音階モード）
            ['results-overview', 'preparation'], // 総合評価から次のモード開始（practice/upgrade）
            ['results-overview', 'home'],        // 総合評価からホーム（マイク保持、再開時に準備スキップ）
        ];

        return trainingFlowPatterns.some(
            ([source, dest]) => from === source && to === dest
        );
    }

    /**
     * AudioDetectorの状態を検証
     * PitchProの組み込みメソッドを活用
     *
     * @param {Object} audioDetector - AudioDetectionComponent instance
     * @returns {Object} { isValid: boolean, reason: string, canReuse: boolean }
     */
    static verifyAudioDetectorState(audioDetector) {
        if (!audioDetector) {
            return {
                isValid: false,
                reason: 'audioDetector is null',
                canReuse: false
            };
        }

        try {
            // 1. AudioDetectionComponent の状態取得
            const status = audioDetector.getStatus();

            if (!status) {
                return {
                    isValid: false,
                    reason: 'getStatus() returned null',
                    canReuse: false
                };
            }

            // 2. MicrophoneController の状態確認
            const micStatus = status.micControllerStatus;

            if (!micStatus) {
                return {
                    isValid: false,
                    reason: 'MicrophoneController not initialized',
                    canReuse: false
                };
            }

            // 3. MicrophoneController.isReady チェック
            const isReady = micStatus.isReady;

            if (!isReady) {
                return {
                    isValid: false,
                    reason: `MicrophoneController not ready (state: ${micStatus.state})`,
                    canReuse: false
                };
            }

            // 4. MediaStream 健全性チェック（v4.0.7改善: mute状態を考慮）
            const health = audioDetector.microphoneController?.checkHealth();
            const isMuted = audioDetector.microphoneController?.isMuted();

            // 【v4.0.9修正】プロパティ名を"isHealthy"→"healthy"に修正
            // PitchProのcheckHealth()は"healthy"プロパティを返す（"isHealthy"ではない）
            console.log('🔍 [v4.0.9] Health Check Details:', {
                healthy: health?.healthy,
                isMuted: isMuted,
                mediaStreamActive: health?.mediaStreamActive,
                audioContextState: health?.audioContextState,
                trackStates: health?.trackStates
            });

            // 【v4.0.7重要】mute状態でもMediaStreamが有効なら再利用可能
            // preparation完了時にmute()されているため、mute=trueでもhealthyと判定する
            if (!health || (!health.healthy && !isMuted)) {
                console.warn(`⚠️ [v4.0.9] MediaStream unhealthy detected:`, {
                    hasHealth: !!health,
                    healthy: health?.healthy,
                    isMuted: isMuted,
                    mediaStreamActive: health?.mediaStreamActive,
                    trackStates: health?.trackStates
                });
                return {
                    isValid: false,
                    reason: `MediaStream unhealthy (muted: ${isMuted})`,
                    canReuse: false
                };
            }

            // mute状態の場合は警告ログのみ
            if (isMuted) {
                console.log('ℹ️ [NavigationManager] AudioDetector is muted but MediaStream is valid - reusable');
            }

            // 5. すべてのチェック通過
            return {
                isValid: true,
                reason: isMuted ? 'AudioDetector is muted but healthy' : 'AudioDetector is healthy and ready',
                canReuse: true
            };

        } catch (error) {
            console.error('❌ [NavigationManager] State verification error:', error);
            return {
                isValid: false,
                reason: `Verification error: ${error.message}`,
                canReuse: false
            };
        }
    }

    /**
     * AudioDetectorの破棄（内部メソッド）
     * PitchPro警告アラート発火を防止し、popstateイベント問題を根本解決
     *
     * @param {Object} audioDetector - AudioDetectionComponentインスタンス
     * @private
     */
    static _destroyAudioDetector(audioDetector) {
        if (!audioDetector) return;

        try {
            // PitchProの推奨手順
            audioDetector.stopDetection();
            console.log('🛑 [NavigationManager] 音声検出停止');

            // 【修正v4.0.23】PitchProのresetDisplayElements()を使用してUI要素をリセット
            if (typeof audioDetector.resetDisplayElements === 'function') {
                audioDetector.resetDisplayElements();
                console.log('🔄 [NavigationManager] PitchPro UI要素リセット完了');
            } else {
                // フォールバック: 手動でリセット
                this._resetVolumeBar();
            }

            // 【重要】MediaStream完全解放
            // destroy()を呼ばないと、バックグラウンドでマイクが開いたままになり、
            // 長時間経過後にPitchProが警告アラートを表示してpopstateイベントが発火する問題が発生
            audioDetector.destroy();
            console.log('🗑️ [NavigationManager] AudioDetector破棄完了 - マイクストリーム解放');

        } catch (error) {
            console.error('❌ [NavigationManager] AudioDetector破棄エラー:', error);
        }
    }

    /**
     * 音量バーを手動リセット（フォールバック用）
     * @private
     */
    static _resetVolumeBar() {
        try {
            // preparationページ
            const volumeProgress = document.getElementById('volume-progress');
            if (volumeProgress) {
                volumeProgress.style.width = '0%';
            }

            // trainingページ（ID指定に統一）
            const trainingVolumeProgress = document.getElementById('training-volume-progress');
            if (trainingVolumeProgress) {
                trainingVolumeProgress.style.width = '0%';
            }

            // 音域テストページ
            const rangeTestVolumeBar = document.getElementById('range-test-volume-bar');
            if (rangeTestVolumeBar) {
                rangeTestVolumeBar.style.width = '0%';
            }

            console.log(`🔄 [NavigationManager] 手動音量バーリセット完了`);
        } catch (error) {
            console.error('❌ [NavigationManager] 音量バーリセットエラー:', error);
        }
    }

    /**
     * 統一ナビゲーションメソッド
     * すべてのページ遷移はこのメソッドを使用することを推奨
     *
     * 【自動処理】
     * - PitchProリソース自動破棄（警告アラート防止）
     * - beforeunload/popstate自動無効化
     * - 正常な遷移フラグ自動設定
     *
     * @param {string} page - 遷移先ページ ('home', 'training', 'result-session', 'results', 'results-overview'等)
     * @param {Object} params - URLパラメータ (mode, session等)
     *
     * @example
     * // ホームへ遷移
     * NavigationManager.navigate('home');
     *
     * // トレーニングへ遷移（モード指定）
     * NavigationManager.navigate('training', { mode: 'random', session: 1 });
     *
     * // 結果ページへ遷移
     * NavigationManager.navigate('results-overview');
     */
    static navigate(page, params = {}) {
        console.log(`🚀 [NavigationManager] 統一ナビゲーション: ${page}`, params);

        // 現在のページを取得
        const currentPage = window.location.hash.split('?')[0].substring(1);

        // 1. 【改善v4.6.0】AudioDetector管理 - PitchPro MicrophoneLifecycleManagerに委譲
        //    → 全ての遷移: AudioDetectorを保持（PitchProのアイドル監視が自動管理）
        //    → iOS Safari MediaStream再取得問題の回避
        //    → 準備ページに戻った時、既存のAudioDetectorを再利用可能
        if (this.currentAudioDetector) {
            const isTraining = this.isTrainingFlow(currentPage, page);

            if (isTraining) {
                // トレーニングフロー内の遷移: AudioDetectorをそのまま保持
                // 音声検出の開始/停止は各ページのControllerが管理
                console.log('🔄 [NavigationManager] トレーニングフロー内遷移: AudioDetector保持');
                console.log('📝 [NavigationManager] 音声検出管理は各ページControllerに委譲');

            } else {
                // 【v4.6.0変更】トレーニングフロー外の遷移でも即座に破棄しない
                // PitchPro MicrophoneLifecycleManagerのアイドル監視に任せる
                // これによりiOS SafariのMediaStream再取得問題を回避
                console.log('🔄 [NavigationManager] トレーニングフロー外遷移: AudioDetector保持（PitchPro管理に委譲）');
                console.log('📝 [NavigationManager] MicrophoneLifecycleManagerのアイドル監視が自動でリソース管理');

                // 注: globalAudioDetectorは保持したまま
                // 準備ページに戻った時に再利用可能
            }
        }

        // 2. beforeunload/popstateを無効化
        this.disableNavigationWarning();
        this.removeBrowserBackPrevention();

        // 3. 正常な遷移フラグを設定（各ページ専用フラグ）
        if (page === 'training') {
            this.setNormalTransition();
        } else if (page === 'result-session') {
            this.setNormalTransitionToResultSession();
        } else if (page === 'preparation') {
            this.setNormalTransitionToPreparation();
        }

        // 4. 【追加v3.1.0】途中離脱時のsessionStorageクリーンアップ
        //    trainingページからの遷移で、遷移先がトレーニング継続に関係ない場合はクリア
        if (currentPage === 'training') {
            // トレーニング継続に必要なページ以外への遷移時はcurrentLessonIdをクリア
            const shouldPreserveLesson =
                page === 'result-session' ||  // セッション結果（次のセッション継続）
                page === 'results-overview' || // 総合評価（8セッション完了）
                page === 'training';           // トレーニング再開

            if (!shouldPreserveLesson) {
                const currentLessonId = sessionStorage.getItem('currentLessonId');
                if (currentLessonId) {
                    sessionStorage.removeItem('currentLessonId');
                    console.log(`🔄 [NavigationManager] トレーニング途中離脱検出: currentLessonId削除 (${currentLessonId} → ${page})`);
                }
            } else {
                console.log(`✅ [NavigationManager] トレーニング継続: currentLessonId保持 (training → ${page})`);
            }
        }

        // 5. ハッシュ構築
        let targetHash = page;
        if (Object.keys(params).length > 0) {
            const urlParams = new URLSearchParams(params);
            targetHash = `${page}?${urlParams.toString()}`;
        }

        // 6. 遷移実行
        window.location.hash = targetHash;
        console.log(`✅ [NavigationManager] 遷移完了: ${targetHash}`);
    }

    // ==========================================
    // ページ離脱警告（beforeunload）
    // ==========================================

    /**
     * beforeunloadハンドラー
     */
    static beforeUnloadHandler = null;

    /**
     * ページ離脱警告を有効化（タブを閉じる・リロード対策）
     */
    static enableNavigationWarning() {
        this.beforeUnloadHandler = (e) => {
            e.preventDefault();
            e.returnValue = ''; // ブラウザ標準の警告メッセージ
            return '';
        };
        window.addEventListener('beforeunload', this.beforeUnloadHandler);
        console.log('✅ [NavigationManager] ページ離脱警告を有効化');
    }

    /**
     * ページ離脱警告を無効化
     */
    static disableNavigationWarning() {
        if (this.beforeUnloadHandler) {
            window.removeEventListener('beforeunload', this.beforeUnloadHandler);
            this.beforeUnloadHandler = null;
            console.log('✅ [NavigationManager] ページ離脱警告を無効化');
        }
    }

    /**
     * 安全な遷移メソッド
     * beforeunloadとpopstateの両方を無効化してから遷移
     *
     * @param {string} hash - 遷移先のハッシュ
     */
    static safeNavigate(hash) {
        console.log(`🔒 [NavigationManager] 安全な遷移開始: ${hash}`);

        // 1. beforeunloadを無効化
        this.disableNavigationWarning();

        // 2. popstateハンドラーを削除
        this.removeBrowserBackPrevention();

        // 3. 遷移（ダイアログが出ない）
        window.location.hash = hash;
        console.log(`✅ [NavigationManager] 遷移完了: ${hash}`);
    }

    // ==========================================
    // ブラウザバック防止機能（v3.0.0で追加、v4.0.0で改善）
    // ==========================================

    /**
     * 許可された遷移先のマップ（ダイアログを表示しない遷移）
     *
     * 【重要】このマップは「ブラウザバック防止対象ページ」からの正当な遷移のみを定義
     * - ブラウザバック防止対象: preparation, training, result-session, results-overview
     * - 非対象ページ（home, records等）は定義不要（ブラウザバック自由）
     */
    static allowedTransitions = new Map([
        ['preparation', ['training', 'home']],
        ['training', ['result-session', 'results-overview', 'home']],
        ['result-session', ['training', 'results-overview', 'home']],
        ['results-overview', ['home', 'preparation', 'records', 'training']]
    ]);

    /**
     * 【v4.3.0拡張】ページ制御設定（ブラウザバック防止・リロード検出）
     */
    static PAGE_CONFIG = {
        'preparation': {
            preventBackNavigation: true,
            preventReload: true,  // リロード不可（マイク設定・音域テストリセット防止）
            reloadRedirectTo: 'home',  // リロード時のリダイレクト先
            reloadMessage: '準備ページがリロードされました。\n\nマイクテストと音域テストを最初からやり直すため、ホームページに移動します。\n\n再開する場合は、ホームから希望のモードを選択してください。',
            directAccessRedirectTo: 'home',  // ダイレクトアクセス時のリダイレクト先
            directAccessMessage: '準備ページには正しいフローでアクセスしてください。ホームページに移動します。',
            backPreventionMessage: 'トレーニング準備中です。\n\nブラウザバックは無効になっています。\nホームボタンからトップページに戻れます。'
        },
        'training': {
            preventBackNavigation: true,
            preventReload: true,  // リロード検出は継続（PitchProのエラーハンドリングに委譲）
            backPreventionMessage: 'トレーニング中です。\n\nブラウザバックは無効になっています。\nホームボタンからトップページに戻れます。'
        },
        'result-session': {
            preventBackNavigation: true,
            preventReload: true,  // リロード検出は継続（PitchProのエラーハンドリングに委譲）
            directAccessRedirectTo: 'preparation',  // ダイレクトアクセス時のリダイレクト先
            directAccessMessage: 'セッション評価ページには正しいフローでアクセスしてください。準備ページに移動します。',
            backPreventionMessage: 'セッション評価中です。\n\nブラウザバックは無効になっています。\n「次の基音へ」ボタンまたはホームボタンをご利用ください。'
        },
        'results-overview': {
            preventBackNavigation: true,
            preventReload: false,  // リロード可能（評価データは保存済み）
            directAccessRedirectTo: 'home',  // ダイレクトアクセス時のリダイレクト先
            directAccessMessage: '総合評価ページには正しいフローでアクセスしてください。ホームページに移動します。',
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

        // popstateハンドラーを定義（許可リスト対応 + ダイアログ通知 + PitchPro警告検出）
        this.popStateHandler = () => {
            // 【v4.0.0追加】PitchPro警告アラート検出
            // 万一、バックグラウンド長時間放置等でPitchProが警告を出した場合のフォールバック
            if (this.currentAudioDetector) {
                const verification = this.verifyAudioDetectorState(this.currentAudioDetector);

                if (!verification.isValid) {
                    console.error('🚨 [NavigationManager] PitchPro警告検出: AudioDetector異常', verification);
                    console.warn(`⚠️ [NavigationManager] 異常理由: ${verification.reason}`);

                    // 異常状態のAudioDetectorを破棄
                    this._destroyAudioDetector(this.currentAudioDetector);
                    this.currentAudioDetector = null;

                    // globalAudioDetectorもクリア
                    if (window.globalAudioDetector) {
                        window.globalAudioDetector = null;
                    }

                    console.log('🔄 [NavigationManager] 次ページでAudioDetector再作成が必要');
                } else {
                    console.log('✅ [NavigationManager] AudioDetector健全性確認完了');
                }
            }

            const newHash = window.location.hash.substring(1);
            const newPage = newHash.split('?')[0];

            // 許可された遷移先ならダイアログを表示しない
            const allowedPages = this.allowedTransitions.get(page) || [];
            if (allowedPages.includes(newPage)) {
                console.log(`✅ [NavigationManager] 許可された遷移: ${page} → ${newPage}`);

                // 【v4.3.0追加】training/result-sessionへの遷移時はnormalTransitionフラグを設定
                // popstateによる遷移でもrequiresPreparation()が正常に動作するように
                if (newPage === 'training' || newPage === 'result-session') {
                    this.setNormalTransition();
                    console.log(`✅ [NavigationManager] normalTransitionフラグ設定 (popstate: ${page} → ${newPage})`);
                }

                return; // ダイアログを表示せずに遷移を許可
            }

            // 意図しないブラウザバックのみダイアログ表示
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

// 【重要】visibilitychange監視を即座に初期化（PitchProより先に登録）
NavigationManager.initVisibilityTracking();

console.log('✅ [NavigationManager] ロード完了');
