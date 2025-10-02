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
            'records': 'pages/records.html',
            'results': 'pages/results-overview.html'
        };

        this.appRoot = document.getElementById('app-root');
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
            // 1. HTMLテンプレートを読み込み
            const response = await fetch(templatePath);

            if (!response.ok) {
                throw new Error(`Failed to load ${templatePath}: ${response.status}`);
            }

            const html = await response.text();

            // 2. アプリルートにHTMLを挿入
            this.appRoot.innerHTML = html;

            // 3. Lucideアイコンを再描画
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }

            // 4. ページ固有のイベントリスナーを設定
            await this.setupPageEvents(page, fullHash);

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

                // トレーニングモードのパラメータをハッシュに含める
                let hash = route;
                if (mode && session) {
                    hash += `?mode=${mode}&session=${session}`;
                }

                window.location.hash = hash;
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

            // デバイス検出
            const userAgent = navigator.userAgent || navigator.vendor || window.opera;
            const isIPhone = /iPhone/.test(userAgent);
            const isIPad = /iPad/.test(userAgent) || (/Macintosh/.test(userAgent) && 'ontouchend' in document);
            const deviceType = isIPhone ? 'iphone' : isIPad ? 'ipad' : 'pc';

            const volumeSettings = {
                pc: -6,
                iphone: -4,
                ipad: -5
            };
            const deviceVolume = volumeSettings[deviceType] || -6;

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

            // 動的にpreparationControllerをインポート
            const { initializePreparationPage } = await import('./controllers/preparationController.js');

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

            // 動的にtrainingControllerをインポート
            const { initializeTrainingPage } = await import('./controllers/trainingController.js');

            // コントローラーの初期化関数を実行
            await initializeTrainingPage();

        } catch (error) {
            console.error('Error setting up training page events:', error);
            throw error;
        }
    }

    // 現在のページのクリーンアップ
    async cleanupCurrentPage() {
        try {
            // preparationページのクリーンアップ
            if (typeof window.preparationManager !== 'undefined' && window.preparationManager) {
                console.log('Cleaning up preparation page resources...');
                await window.preparationManager.cleanupPitchPro();
            }

            // preparationページの初期化フラグをリセット
            if (typeof window.resetPreparationPageFlag === 'function') {
                window.resetPreparationPageFlag();
            }

            // 他のページのクリーンアップもここに追加可能
            // if (typeof window.trainingManager !== 'undefined' && window.trainingManager) {
            //     await window.trainingManager.cleanup();
            // }

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