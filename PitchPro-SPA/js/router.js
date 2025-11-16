/**
 * Simple Hash Router for SPA
 * Based on vanilla JS + 自作SPA development roadmap
 */

class SimpleRouter {
    constructor() {
        this.routes = {
            'home': 'templates/home.html',
            'preparation': 'templates/preparation.html',
            'training': 'pages/training.html?v=20251116002',
            'result-session': 'pages/result-session.html',
            'records': 'pages/records.html',
            'results': 'pages/results-overview.html',
            'results-overview': 'pages/results-overview.html',
            'premium-analysis': 'pages/premium-analysis.html',
            'settings': 'pages/settings.html'
        };

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

        // クエリパラメータを分離してページ名のみを取得
        const page = hash.split('?')[0];
        console.log('🔍 [Debug Router] handleRouteChange called');
        console.log('🔍 [Debug Router] hash:', hash);
        console.log('🔍 [Debug Router] page:', page);
        console.log('Route changed to:', hash);
        console.log('Page name:', page);

        try {
            // 現在のページのクリーンアップ
            await this.cleanupCurrentPage();

            await this.loadPage(page, hash);
        } catch (error) {
            console.error('Route loading error:', error);
            // エラー時はホームページを表示
            await this.loadPage('home');
        }
    }

    async loadPage(page, fullHash = '') {
        const templatePath = this.routes[page];

        if (!templatePath) {
            console.warn(`Route not found: ${page}, loading home`);
            await this.loadPage('home');
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

            // 6. ページ固有のイベントリスナーを設定
            await this.setupPageEvents(page, fullHash);

            // 7. 現在のページを更新
            this.currentPage = page;

            console.log(`Page loaded: ${page}`);

        } catch (error) {
            console.error(`Error loading page ${page}:`, error);
            throw error;
        }
    }

    async setupPageEvents(page, fullHash) {
        // ページ固有のイベントリスナー設定
        switch (page) {
            case 'home':
                this.setupHomeEvents();
                break;
            case 'preparation':
                await this.setupPreparationEvents(fullHash);
                break;
            case 'training':
                await this.setupTrainingEvents(fullHash);
                break;
            case 'result-session':
                await this.setupResultSessionEvents(fullHash);
                break;
            case 'results':
            case 'results-overview':
                // HTML側のonloadで初期化されるため、ここでは何もしない
                break;
            case 'premium-analysis':
                this.setupPremiumAnalysisEvents();
                break;
            default:
                break;
        }

        // ブラウザバック防止を自動設定（グローバル管理）
        this.preventBrowserBack(page);
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

            // デバイス検出（PitchPro実装準拠）
            const userAgent = navigator.userAgent || navigator.vendor || window.opera;

            // 複数の判定方法を組み合わせた包括的な検出（PitchPro方式）
            const isIPhone = /iPhone/.test(userAgent);
            const isIPad = /iPad/.test(userAgent);
            const isMacintoshWithTouch = /Macintosh/.test(userAgent) && 'ontouchend' in document;
            const isIOSUserAgent = /iPad|iPhone|iPod/.test(userAgent);
            const isIOSPlatform = /iPad|iPhone|iPod/.test(navigator.platform || '');
            const isIOS = isIPhone || isIPad || isMacintoshWithTouch || isIOSUserAgent || isIOSPlatform;

            // デバイスタイプ判定
            let deviceType = 'pc';
            if (isIPhone) {
                deviceType = 'iphone';
            } else if (isIPad || isMacintoshWithTouch) {
                deviceType = 'ipad';
            } else if (isIOS) {
                // スクリーンサイズで判定（PitchPro方式）
                const screenWidth = window.screen.width;
                const screenHeight = window.screen.height;
                const maxDimension = Math.max(screenWidth, screenHeight);
                const minDimension = Math.min(screenWidth, screenHeight);

                // iPad判定: 長辺768px以上、または長辺700px以上かつ短辺500px以上
                if (maxDimension >= 768 || (maxDimension >= 700 && minDimension >= 500)) {
                    deviceType = 'ipad';
                } else {
                    deviceType = 'iphone';
                }
            }

            const volumeSettings = {
                pc: +8,      // +8dB: デバイス音量50%時に最適化
                iphone: +18, // +18dB: デバイス音量50%時に最適化
                ipad: +20    // +20dB: デバイス音量50%時に最適化（Tone.js推奨上限）
            };
            const deviceVolume = volumeSettings[deviceType] || +8;

            console.log(`📱 デバイス: ${deviceType}, 音量: ${deviceVolume}dB`);

            // 新規作成
            // ⚠️ IMPORTANT: attack/release値を変更する場合は、以下の2箇所も同時に変更すること
            // 1. /js/core/reference-tones.js (line 67, 69)
            // 2. /pages/js/preparation-pitchpro-cycle.js (line 839-840)
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

    async setupPreparationEvents(fullHash = '') {
        try {
            console.log('Setting up preparation page events with dynamic import...');
            console.log('Full hash:', fullHash);

            // 動的にpreparationControllerをインポート（キャッシュバスター追加）
            const { initializePreparationPage } = await import(`./controllers/preparationController.js?v=${Date.now()}`);

            // コントローラーの初期化関数を実行
            await initializePreparationPage();

        } catch (error) {
            console.error('Error setting up preparation page events:', error);
            throw error;
        }
    }

    async setupTrainingEvents(fullHash = '') {
        try {
            console.log('Setting up training page events with dynamic import...');
            console.log('Full hash:', fullHash);

            // 動的にtrainingControllerをインポート（キャッシュバスター追加）
            // 🔥 強制リロード: タイムスタンプ + ランダム値でキャッシュ完全無効化
            const { initializeTrainingPage } = await import(`./controllers/trainingController.js?v=${Date.now()}&r=${Math.random()}`);

            // コントローラーの初期化関数を実行
            await initializeTrainingPage();

        } catch (error) {
            // リダイレクトエラーは無視（意図的なリダイレクト）
            if (error.isRedirect) {
                console.log('✅ リダイレクト処理完了:', error.message);
                return;
            }
            console.error('Error setting up training page events:', error);
            throw error;
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