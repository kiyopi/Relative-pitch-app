/**
 * Simple Hash Router for SPA
 * Based on vanilla JS + 自作SPA development roadmap
 */

class SimpleRouter {
    constructor() {
        this.routes = {
            'home': 'templates/home.html',
            'preparation': 'templates/preparation.html?v=20251117001',
            'training': 'pages/training.html?v=20251117002',
            'result-session': 'pages/result-session.html',
            'records': 'pages/records.html',
            'results': 'pages/results-overview.html',
            'results-overview': 'pages/results-overview.html',
            'premium-analysis': 'pages/premium-analysis.html',
            'settings': 'pages/settings.html'
        };

        /**
         * ページ初期化設定レジストリ
         *
         * 【新規ページ追加方法】
         * 1. pageConfigsに設定を追加
         * 2. コントローラーでwindow.initXXXを公開
         * 3. 以上で完了（setupPageEventsのswitch-case不要）
         *
         * @property {string} init - グローバル初期化関数名
         * @property {Array<string>} dependencies - 依存ライブラリ（'Chart', 'DistributionChart', 'PitchPro'）
         * @property {boolean} preventDoubleInit - 二重初期化防止フラグ
         */
        this.pageConfigs = {
            'home': {
                init: null,  // setupHomeEvents()で特別処理（setupPageEvents内で直接呼び出し）
                dependencies: []
            },
            'preparation': {
                init: 'initializePreparationPitchProCycle',
                dependencies: ['PitchPro']
            },
            'training': {
                init: 'initializeTrainingPage',
                dependencies: ['PitchPro']
            },
            'result-session': {
                init: 'initializeResultSessionPage',
                dependencies: []
            },
            'results-overview': {
                init: 'initResultsOverview',
                dependencies: ['Chart', 'DistributionChart'],
                preventDoubleInit: true
            },
            'records': {
                init: 'initRecords',
                dependencies: ['Chart', 'DistributionChart']
            },
            'premium-analysis': {
                init: 'initPremiumAnalysis',
                dependencies: ['Chart']
            },
            'settings': {
                init: 'initSettings',
                dependencies: []
            }
        };

        // 初期化済みフラグ管理（二重初期化防止用）
        this.initializedPages = new Set();

        // 【Phase 1追加】遷移制御フラグ（競合状態防止）
        this.isNavigating = false;
        this.currentNavigationId = 0;
        this.navigationAbortController = null;

        this.appRoot = document.getElementById('app-root');
        this.currentPage = null; // 現在のページを追跡
        this.init();
    }

    init() {
        // 廃止されたlocalStorageキーをクリーンアップ
        if (typeof window.DataManager !== 'undefined' && typeof DataManager.cleanupDeprecatedKeys === 'function') {
            DataManager.cleanupDeprecatedKeys();
        }

        // リスナー設定
        window.addEventListener('hashchange', () => this.handleRouteChange());

        // 【削除v2025-11-16】DOMContentLoadedイベントリスナー
        // 理由: constructor実行時に即座にhandleRouteChange()を呼び出しているため、
        // DOMContentLoadedでの再実行は不要であり、二重読み込みの原因となる
        // window.addEventListener('DOMContentLoaded', () => this.handleRouteChange());

        // 【重要】pagehideイベントでのクリーンアップは削除
        // 理由: タブ切り替えでもpagehideが発火し、ブラウザバック防止が解除されてしまう
        // SPAではhashchangeイベント（ページ遷移時）でのクリーンアップで十分

        // 初期表示（即座に実行）
        this.handleRouteChange();
    }

    async handleRouteChange() {
        // URLハッシュから現在のページを取得
        const hash = window.location.hash.substring(1) || 'home';
        const page = hash.split('?')[0];

        console.log(`📍 [Router] Route change requested: ${hash}`);

        // 【Phase 1】既に遷移中の場合は前の遷移を中断
        if (this.isNavigating) {
            console.warn(`⚠️ [Router] Navigation in progress, aborting previous navigation`);
            if (this.navigationAbortController) {
                this.navigationAbortController.abort();
            }
        }

        // 【Phase 1】新しい遷移を開始
        this.isNavigating = true;
        this.currentNavigationId++;
        const navigationId = this.currentNavigationId;
        this.navigationAbortController = new AbortController();
        const signal = this.navigationAbortController.signal;

        console.log(`🚀 [Router] Starting navigation ${navigationId} to: ${page}`);

        try {
            // クリーンアップ
            await this.cleanupCurrentPage();

            // 【Phase 1】中断されていないか確認
            if (navigationId !== this.currentNavigationId) {
                console.log(`ℹ️ [Router] Navigation ${navigationId} was superseded`);
                return;
            }

            // ページロード（signalを渡す）
            await this.loadPage(page, hash, signal);

            console.log(`✅ [Router] Navigation ${navigationId} completed successfully`);

        } catch (error) {
            if (error.name === 'AbortError' || error.message === 'Aborted') {
                console.log(`ℹ️ [Router] Navigation ${navigationId} was aborted`);
            } else {
                console.error(`❌ [Router] Navigation ${navigationId} failed:`, error);

                // エラー時はホームページにフォールバック
                try {
                    await this.loadPage('home', '', signal);
                } catch (fallbackError) {
                    console.error(`❌ [Router] Fallback to home failed:`, fallbackError);
                }
            }
        } finally {
            // 【Phase 1】遷移完了フラグをリセット
            this.isNavigating = false;
        }
    }

    async loadPage(page, fullHash = '', signal = null) {
        const templatePath = this.routes[page];

        if (!templatePath) {
            console.warn(`Route not found: ${page}, loading home`);
            await this.loadPage('home', '', signal);
            return;
        }

        try {
            // 1. HTMLテンプレートを読み込み（キャッシュ回避）
            const response = await fetch(`${templatePath}?v=${Date.now()}`);

            if (!response.ok) {
                throw new Error(`Failed to load ${templatePath}: ${response.status}`);
            }

            const html = await response.text();

            // 2. アプリルートにHTMLを挿入
            this.appRoot.innerHTML = html;

            // 2.5. HTMLに含まれるスクリプトを手動で実行（SPAでinnerHTMLはスクリプトを実行しないため）
            const scriptTags = this.appRoot.querySelectorAll('script');
            scriptTags.forEach(oldScript => {
                const newScript = document.createElement('script');

                // 属性をコピー
                Array.from(oldScript.attributes).forEach(attr => {
                    newScript.setAttribute(attr.name, attr.value);
                });

                // スクリプト内容をコピー
                newScript.textContent = oldScript.textContent;

                // 古いスクリプトを新しいスクリプトに置き換え（これで実行される）
                oldScript.parentNode.replaceChild(newScript, oldScript);
            });

            // 3. DOMの更新が完了するまで待機（次のフレームまで）
            await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));

            // 4. ヘッダーの表示/非表示を切り替え（ホームページのみ表示）
            const appHeader = document.querySelector('.app-header');
            if (appHeader) {
                if (page === 'home') {
                    appHeader.style.display = '';
                } else {
                    appHeader.style.display = 'none';
                }
            }

            // 4.5. フッターナビゲーションの表示/非表示を切り替え（ホームページ以外で表示）
            const footerNav = document.getElementById('footer-nav');
            if (footerNav) {
                if (page === 'home') {
                    footerNav.style.display = 'none';
                } else {
                    footerNav.style.display = 'flex';
                }
            }

            // 5. Lucideアイコンを再描画（統合初期化関数を使用）
            if (typeof window.initializeLucideIcons === 'function') {
                window.initializeLucideIcons();
            } else {
                console.warn('⚠️ [Router] initializeLucideIcons function not found');
            }

            // 6. ページ固有のイベントリスナーを設定（signalを渡す）
            await this.setupPageEvents(page, fullHash, signal);

            // 7. 現在のページを更新
            this.currentPage = page;

            console.log(`✅ [Router] Page loaded: ${page}`);

        } catch (error) {
            console.error(`Error loading page ${page}:`, error);
            throw error;
        }
    }

    /**
     * 【Phase 3】統一ページ初期化メソッド（v2.0.0 - 設定ベース実装）
     *
     * 【動作概要】
     * 1. pageConfigsから設定を読み込み
     * 2. 依存ライブラリの読み込みを待機（中断対応）
     * 3. グローバル初期化関数の読み込みを待機（Phase 2ヘルパー使用）
     * 4. 初期化関数を実行
     * 5. 二重初期化を防止
     *
     * @param {string} page - ページ識別子
     * @param {string} fullHash - フルハッシュURL
     * @param {AbortSignal} signal - 中断シグナル
     */
    async setupPageEvents(page, fullHash, signal = null) {
        try {
            // homeページは特別処理（Routerクラスのメソッドを直接使用）
            if (page === 'home') {
                this.setupHomeEvents();
                this.preventBrowserBack(page);
                return;
            }

            // 1. ページ設定を取得
            const config = this.pageConfigs[page];

            if (!config) {
                console.warn(`⚠️ [Router] No config found for page: ${page}`);
                this.preventBrowserBack(page);
                return;
            }

            // 2. 二重初期化チェック
            if (config.preventDoubleInit && this.initializedPages.has(page)) {
                console.log(`✅ [Router] Page "${page}" already initialized, skipping`);
                this.preventBrowserBack(page);
                return;
            }

            // 3. 依存関係の待機（Phase 2の新実装を使用）
            if (config.dependencies && config.dependencies.length > 0) {
                try {
                    await this.waitForDependencies(config.dependencies, signal);
                } catch (error) {
                    // 中断の場合はthrow、それ以外はエラー処理
                    if (error.message === 'Aborted') {
                        throw error;
                    }
                    throw new Error(`Dependencies failed: ${error.message}`);
                }
            }

            // 4. グローバル初期化関数の待機と実行
            if (config.init) {
                // 4.1. 初期化関数の読み込みを待機（Phase 2のヘルパー使用）
                const success = await this.waitForGlobalFunction(config.init, signal);

                if (!success) {
                    throw new Error(`Initialization function not found: ${config.init}`);
                }

                // 4.2. 初期化関数を実行
                const initFunction = window[config.init];
                console.log(`🎯 [Router] Initializing page "${page}" with ${config.init}()`);
                await initFunction(fullHash);

                // 4.3. 初期化済みフラグを設定
                if (config.preventDoubleInit) {
                    this.initializedPages.add(page);
                }
            }

            // 5. ブラウザバック防止を自動設定
            this.preventBrowserBack(page);

        } catch (error) {
            // 中断エラーはそのままthrow
            if (error.message === 'Aborted') {
                console.log(`ℹ️ [Router] Page initialization aborted: ${page}`);
                throw error;
            }

            // その他のエラーは処理
            console.error(`❌ [Router] Error initializing page "${page}":`, error);
            this.showInitializationError(page, error);
            this.preventBrowserBack(page);
        }
    }

    /**
     * 【Phase 2】汎用待機ヘルパー（中断対応）
     *
     * @param {Function} checkFn - チェック関数（trueを返すまで待機）
     * @param {Object} options - オプション
     * @param {number} options.maxAttempts - 最大試行回数（デフォルト: 50）
     * @param {number} options.interval - チェック間隔（ms、デフォルト: 100）
     * @param {AbortSignal} options.signal - 中断シグナル
     * @param {string} options.errorMessage - タイムアウト時のエラーメッセージ
     * @returns {Promise<boolean>} 成功でtrue、タイムアウトでfalse
     * @throws {Error} 中断時に'Aborted'エラーをthrow
     */
    async waitWithAbort(checkFn, options = {}) {
        const {
            maxAttempts = 50,
            interval = 100,
            signal = null,
            errorMessage = 'Timeout'
        } = options;

        let attempts = 0;

        while (attempts < maxAttempts) {
            // 中断シグナルをチェック
            if (signal?.aborted) {
                throw new Error('Aborted');
            }

            if (checkFn()) {
                return true;
            }

            await new Promise(resolve => setTimeout(resolve, interval));
            attempts++;
        }

        // タイムアウト
        console.warn(`⚠️ [Router] ${errorMessage}`);
        return false;
    }

    /**
     * 【Phase 2】グローバル初期化関数の読み込みを待機
     *
     * @param {string} functionName - 関数名
     * @param {AbortSignal} signal - 中断シグナル
     * @returns {Promise<boolean>} 成功でtrue、失敗でfalse
     * @throws {Error} 中断時に'Aborted'エラーをthrow
     */
    async waitForGlobalFunction(functionName, signal) {
        console.log(`⏳ [Router] Waiting for global function: ${functionName}`);

        try {
            const success = await this.waitWithAbort(
                () => typeof window[functionName] === 'function',
                {
                    maxAttempts: 50,
                    interval: 100,
                    signal,
                    errorMessage: `Global function "${functionName}" not loaded after 5000ms`
                }
            );

            if (success) {
                console.log(`✅ [Router] Global function ${functionName} loaded`);
            } else {
                console.error(`❌ [Router] Timeout waiting for ${functionName}`);
            }

            return success;

        } catch (error) {
            if (error.message === 'Aborted') {
                throw error; // 上位で処理
            }
            console.error(`❌ [Router] Error waiting for ${functionName}:`, error);
            return false;
        }
    }

    /**
     * 【Phase 2】複数の依存関係を並列待機（早期失敗検出）
     *
     * @param {string[]} dependencies - 依存ライブラリ名の配列
     * @param {AbortSignal} signal - 中断シグナル
     * @throws {Error} いずれかの依存関係が失敗した場合
     */
    async waitForDependencies(dependencies, signal) {
        if (!dependencies || dependencies.length === 0) {
            return;
        }

        console.log(`⏳ [Router] Waiting for dependencies: ${dependencies.join(', ')}`);

        // Promise.allSettledで並列待機（早期失敗検出）
        const results = await Promise.allSettled(
            dependencies.map(dep => this.waitForDependency(dep, signal))
        );

        // 失敗した依存関係を抽出
        const failedDeps = results
            .map((r, i) => ({ result: r, dep: dependencies[i] }))
            .filter(({ result }) => result.status === 'rejected' || result.value === false)
            .map(({ dep }) => dep);

        if (failedDeps.length > 0) {
            throw new Error(`Failed to load dependencies: ${failedDeps.join(', ')}`);
        }

        console.log(`✅ [Router] All dependencies loaded`);
    }

    /**
     * 【Phase 2】単一の依存関係を待機（中断対応版）
     *
     * @param {string} dependency - 依存ライブラリ名
     * @param {AbortSignal} signal - 中断シグナル
     * @returns {Promise<boolean>} 準備完了でtrue、タイムアウトでfalse
     * @throws {Error} 中断時に'Aborted'エラーをthrow
     */
    async waitForDependency(dependency, signal) {
        console.log(`⏳ [Router] Waiting for dependency: ${dependency}`);

        const checkFunction = this.getDependencyCheckFunction(dependency);

        try {
            const success = await this.waitWithAbort(
                checkFunction,
                {
                    maxAttempts: 50,
                    interval: 100,
                    signal,
                    errorMessage: `Dependency "${dependency}" not loaded after 5000ms`
                }
            );

            if (success) {
                console.log(`✅ [Router] Dependency ${dependency} loaded`);
            } else {
                console.error(`❌ [Router] Timeout waiting for ${dependency}`);
            }

            return success;

        } catch (error) {
            if (error.message === 'Aborted') {
                throw error;
            }
            console.error(`❌ [Router] Error waiting for ${dependency}:`, error);
            return false;
        }
    }

    /**
     * 依存関係のチェック関数を取得
     * @param {string} dependency - 依存ライブラリ名
     * @returns {Function} チェック関数
     */
    getDependencyCheckFunction(dependency) {
        switch (dependency) {
            case 'Chart':
                return () => typeof window.Chart !== 'undefined';
            case 'DistributionChart':
                return () => typeof window.DistributionChart !== 'undefined';
            case 'PitchPro':
                return () => typeof window.PitchPro !== 'undefined';
            default:
                console.warn(`⚠️ [Router] Unknown dependency: ${dependency}`);
                return () => true; // 未知の依存関係は常にtrueを返す
        }
    }

    /**
     * 初期化エラー表示
     * @param {string} page - ページ識別子
     * @param {Array<string>} dependencies - 失敗した依存関係
     */
    showInitializationError(page, dependencies) {
        console.error(`❌ [Router] Failed to initialize page: ${page}`);
        console.error(`❌ [Router] Missing dependencies: ${dependencies.join(', ')}`);

        // ユーザーへのエラーメッセージ表示（オプション）
        const appRoot = document.getElementById('app-root');
        if (appRoot && dependencies.length > 0) {
            const errorHTML = `
                <div style="padding: 2rem; text-align: center; color: var(--color-error, #ef4444);">
                    <h3>ページの読み込みに失敗しました</h3>
                    <p>必要なライブラリの読み込みに時間がかかっています。</p>
                    <p>ページを再読み込みしてください。</p>
                    <button onclick="location.reload()" style="margin-top: 1rem; padding: 0.5rem 1rem; background: var(--color-primary, #8b5cf6); color: white; border: none; border-radius: 4px; cursor: pointer;">
                        再読み込み
                    </button>
                </div>
            `;
            // 既存コンテンツの下にエラーを追加（既存コンテンツは保持）
            const errorDiv = document.createElement('div');
            errorDiv.innerHTML = errorHTML;
            appRoot.appendChild(errorDiv);
        }
    }

    setupHomeEvents() {
        // ホームページのボタンイベント設定
        const trainingButtons = document.querySelectorAll('[data-route]');

        trainingButtons.forEach(button => {
            button.addEventListener('click', async (e) => {
                const route = e.currentTarget.getAttribute('data-route');
                const mode = e.currentTarget.getAttribute('data-mode');
                const session = e.currentTarget.getAttribute('data-session');
                const direction = e.currentTarget.getAttribute('data-direction'); // 12音階モード用

                // トレーニングページへの遷移時のみ、PitchShifter初期化を開始
                // 準備ページは ensurePitchShifterInitialized() で必要時に初期化するため除外
                if (route === 'training') {
                    console.log('🎹 トレーニング開始 - PitchShifter初期化開始...');
                    this.initializePitchShifterBackground();
                }

                // 【NavigationManager統合】training へ直接遷移する場合
                if (route === 'training') {
                    NavigationManager.navigateToTraining(mode, session);
                } else {
                    // training以外のルート（preparation等）
                    let hash = route;
                    if (mode || session || direction) {
                        const params = new URLSearchParams();
                        if (mode) params.set('mode', mode);
                        if (session) params.set('session', session);
                        if (direction) params.set('direction', direction); // 12音階モード方向パラメータ追加
                        // 【削除】ホームからの通常遷移では redirect パラメータ不要
                        // redirect パラメータは総合評価ページからの遷移や
                        // リロード時のリダイレクトなど特別なケースでのみ使用
                        hash += `?${params.toString()}`;
                    }
                    window.location.hash = hash;
                }
            });
        });
    }

    // PitchShifterをバックグラウンドで初期化（完了を待たない）
    async initializePitchShifterBackground() {
        try {
            // PitchShifterが既にロードされているか確認
            let attempts = 0;
            while (!window.PitchShifter && attempts < 50) {
                await new Promise(resolve => setTimeout(resolve, 100));
                attempts++;
            }

            if (!window.PitchShifter) {
                console.warn('⚠️ PitchShifterがロードされていません（5秒タイムアウト）');
                return;
            }

            // 既に初期化済みかチェック
            if (window.pitchShifterInstance && window.pitchShifterInstance.isInitialized) {
                console.log('✅ PitchShifter already initialized');
                return;
            }

            // DeviceDetectorから音量設定を取得（統一設定）
            const deviceVolume = window.DeviceDetector?.getDeviceVolume() ?? -6;
            const deviceType = window.DeviceDetector?.getDeviceType() ?? 'pc';
            console.log(`🔊 PitchShifter音量: ${deviceVolume}dB (デバイス: ${deviceType}, DeviceDetector統一設定)`);

            // 新規作成
            // ⚠️ IMPORTANT: attack/release値を変更する場合は、以下の2箇所も同時に変更すること
            // 1. /js/core/reference-tones.js (line 67, 69)
            // 2. /pages/js/preparation-pitchpro-cycle.js (line 808-809)
            window.pitchShifterInstance = new window.PitchShifter({
                baseUrl: 'audio/piano/',
                attack: 0.02,
                release: 1.5,
                volume: deviceVolume
            });

            // バックグラウンドで初期化（完了を待たない）
            window.pitchShifterInstance.initialize()
                .then(() => {
                    console.log('✅ PitchShifter初期化完了（バックグラウンド）');
                })
                .catch(error => {
                    console.warn('⚠️ PitchShifter初期化失敗（バックグラウンド）:', error);
                });

        } catch (error) {
            console.warn('⚠️ PitchShifter初期化エラー（バックグラウンド）:', error);
        }
    }

    async setupResultSessionEvents(fullHash = '') {
        try {
            console.log('Setting up result-session page events...');
            console.log('Full hash:', fullHash);

            // result-session-controller.jsのグローバル関数を呼び出し
            if (typeof initializeResultSessionPage === 'function') {
                await initializeResultSessionPage();
            } else {
                console.error('❌ initializeResultSessionPage function not found');
            }

        } catch (error) {
            console.error('Error setting up result-session page events:', error);
            throw error;
        }
    }

    // setupResultsOverviewEvents() は削除されました
    // results-overview.htmlのonloadで直接初期化されるため、Router側での初期化は不要
    // これにより、二重初期化問題が解決されます

    setupPremiumAnalysisEvents() {
        console.log('Setting up premium-analysis page events...');

        // ページ初期化関数を実行（スクリプトロードを待つ）
        setTimeout(() => {
            console.log('🔍 [Router] Checking for initPremiumAnalysis...');
            if (typeof window.initPremiumAnalysis === 'function') {
                console.log('✅ [Router] initPremiumAnalysis found, calling...');
                window.initPremiumAnalysis();
            } else {
                console.error('❌ [Router] initPremiumAnalysis function not found');
                console.log('🔍 [Router] window keys:', Object.keys(window).filter(k => k.includes('init')));
            }
        }, 300);
    }

    // 現在のページのクリーンアップ
    async cleanupCurrentPage() {
        try {
            // ブラウザバック防止を自動解除（グローバル管理）
            this.removeBrowserBackPrevention();

            // preparationページからの離脱時のクリーンアップ
            if (this.currentPage === 'preparation') {
                console.log('Cleaning up preparation page resources...');

                // PitchProリソースのクリーンアップ
                if (typeof window.preparationManager !== 'undefined' && window.preparationManager) {
                    await window.preparationManager.cleanupPitchPro();
                }

                // 初期化フラグをリセット
                if (typeof window.resetPreparationPageFlag === 'function') {
                    window.resetPreparationPageFlag();
                    console.log('Preparation page flag reset');
                }
            }

            // trainingページからの離脱時のクリーンアップ
            if (this.currentPage === 'training') {
                console.log('Cleaning up training page resources...');

                // 音声検出停止
                if (window.audioDetector) {
                    console.log('🛑 AudioDetector停止中...');
                    window.audioDetector.stopDetection();
                }

                // マイクストリーム明示的解放
                if (window.audioStream) {
                    console.log('🎤 マイクストリーム解放中...');
                    window.audioStream.getTracks().forEach(track => track.stop());
                    window.audioStream = null;
                }

                // PitchShifter停止（メソッドが存在する場合）
                if (window.pitchShifterInstance) {
                    console.log('🎹 PitchShifter停止中...');
                    if (typeof window.pitchShifterInstance.dispose === 'function') {
                        window.pitchShifterInstance.dispose();
                    }
                    window.pitchShifterInstance = null;
                }

                // セッションデータ処理
                // ※リロード後の一時的な離脱の場合はリセットしない
                // （NavigationManager.isResumingAfterReload()で判定されるため、ここではリセット不要）
                if (window.sessionDataRecorder) {
                    const currentSession = window.sessionDataRecorder.getCurrentSession();
                    if (currentSession && !currentSession.completed) {
                        console.warn('⚠️ 未完了セッションあり - 途中データは破棄されます');
                    }
                    // resetSession()は呼ばない（sessionCounterを保持）
                    // window.sessionDataRecorder.resetSession();
                }

                // 初期化フラグリセット
                if (typeof window.resetTrainingPageFlag === 'function') {
                    window.resetTrainingPageFlag();
                    console.log('Training page flag reset');
                }

                console.log('✅ Training page cleanup complete');
            }

            // 【v2.0.0追加】二重初期化防止フラグのリセット
            // preventDoubleInitが有効なページ（results-overview等）の初期化フラグをクリア
            const config = this.pageConfigs[this.currentPage];
            if (config && config.preventDoubleInit && this.initializedPages.has(this.currentPage)) {
                this.initializedPages.delete(this.currentPage);
                console.log(`🔄 [Router] Reset initialization flag for: ${this.currentPage}`);
            }

        } catch (error) {
            console.warn('Page cleanup error:', error);
            // クリーンアップエラーは警告レベルで続行
        }
    }

    /**
     * ブラウザバック防止を有効化（NavigationManagerに完全委譲）
     * @param {string} page - ページ名
     */
    preventBrowserBack(page) {
        // トレーニング記録からの遷移時はブラウザバック防止をスキップ
        const hash = window.location.hash.substring(1);
        const params = new URLSearchParams(hash.split('?')[1] || '');
        const fromRecords = params.get('fromRecords') === 'true';

        if (fromRecords && page === 'results-overview') {
            console.log('📍 [Router] トレーニング記録からの遷移 - ブラウザバック防止をスキップ');
            return;
        }

        // NavigationManagerに完全委譲（設定もNavigationManagerで管理）
        if (window.NavigationManager) {
            window.NavigationManager.preventBrowserBack(page);
        }
    }

    /**
     * ブラウザバック防止を解除（NavigationManagerに委譲）
     */
    removeBrowserBackPrevention() {
        // NavigationManagerに委譲
        if (window.NavigationManager) {
            window.NavigationManager.removeBrowserBackPrevention();
        }
    }

    // ナビゲーション用のヘルパーメソッド
    navigate(page, params = {}) {
        let hash = page;

        const paramString = Object.keys(params)
            .map(key => `${key}=${params[key]}`)
            .join('&');

        if (paramString) {
            hash += `?${paramString}`;
        }

        window.location.hash = hash;
    }
}

// ルーター初期化
const router = new SimpleRouter();
window.router = router; // グローバルアクセス用