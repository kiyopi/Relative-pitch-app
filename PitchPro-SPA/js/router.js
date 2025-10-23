/**
 * Simple Hash Router for SPA
 * Based on vanilla JS + 自作SPA development roadmap
 */

class SimpleRouter {
    constructor() {
        this.routes = {
            'home': 'templates/home.html',
            'preparation': 'templates/preparation.html',
            'training': 'pages/training.html',
            'result-session': 'pages/result-session.html',
            'records': 'pages/records.html',
            'results': 'pages/results-overview.html',
            'results-overview': 'pages/results-overview.html'
        };

        this.appRoot = document.getElementById('app-root');
        this.currentPage = null; // 現在のページを追跡
        this.init();
    }

    init() {
        // リスナー設定
        window.addEventListener('hashchange', () => this.handleRouteChange());
        window.addEventListener('DOMContentLoaded', () => this.handleRouteChange());

        // ページアンロード時のクリーンアップ（同期実行）
        window.addEventListener('beforeunload', () => {
            // beforeunloadは同期的に実行される必要があるため、
            // 非同期クリーンアップは実行しない（代わりにpagehideを使用）
        });
        window.addEventListener('pagehide', () => {
            // pagehideでクリーンアップを実行（非同期で問題ない）
            this.cleanupCurrentPage().catch(console.error);
        });

        // 初期表示
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

            // 5. Lucideアイコンを再描画
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
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
                this.setupResultsOverviewEvents();
                break;
            default:
                break;
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

                // トレーニング/準備ページへの遷移時、PitchShifter初期化を開始
                if (route === 'training' || route === 'preparation') {
                    console.log('🎹 トレーニング開始 - PitchShifter初期化開始...');
                    this.initializePitchShifterBackground();
                }

                // 【ReloadManager統合】training へ直接遷移する場合
                if (route === 'training') {
                    ReloadManager.navigateToTraining(mode, session);
                } else {
                    // training以外のルート（preparation等）
                    let hash = route;
                    if (mode && session) {
                        hash += `?mode=${mode}&session=${session}`;
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
            window.pitchShifterInstance = new window.PitchShifter({
                baseUrl: 'audio/piano/',
                release: 2.5,
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

            // 動的にtrainingControllerをインポート（v2ファイル使用、キャッシュバスター追加）
            const { initializeTrainingPage } = await import(`./controllers/trainingController.v2.js?v=${Date.now()}`);

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

    setupResultsOverviewEvents() {
        console.log('Setting up results-overview page events...');

        // 新しいトレーニング開始ボタン
        const newTrainingBtn = document.getElementById('btn-new-training');
        if (newTrainingBtn) {
            newTrainingBtn.addEventListener('click', () => {
                console.log('🆕 新しいトレーニング開始ボタンがクリックされました');

                // ランダムモードのセッションデータをlocalStorageからクリア
                const allSessions = JSON.parse(localStorage.getItem('sessionData')) || [];
                const otherSessions = allSessions.filter(s => s.mode !== 'random');
                localStorage.setItem('sessionData', JSON.stringify(otherSessions));
                console.log('✅ ランダムモードのセッションデータをクリアしました');

                // トレーニングページに遷移（ReloadManager統合）
                // ※sessionCounterリセット・基音選択はtrainingController.jsで自動実行
                ReloadManager.navigateToTraining();
            });
            console.log('✅ 新しいトレーニング開始ボタンのイベントリスナー設定完了');
        } else {
            console.warn('⚠️ btn-new-training が見つかりません');
        }
    }

    // 現在のページのクリーンアップ
    async cleanupCurrentPage() {
        try {
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
                // （ReloadManager.isResumingAfterReload()で判定されるため、ここではリセット不要）
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