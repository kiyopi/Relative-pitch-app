/**
 * Simple Hash Router for SPA
 * Based on vanilla JS + 自作SPA development roadmap
 */

class SimpleRouter {
    constructor() {
        this.routes = {
            'home': 'templates/home.html',
            'preparation': 'pages/preparation-step1.html',
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

        // 初期表示
        this.handleRouteChange();
    }

    async handleRouteChange() {
        // URLハッシュから現在のページを取得
        const hash = window.location.hash.substring(1) || 'home';
        console.log('Route changed to:', hash);

        try {
            await this.loadPage(hash);
        } catch (error) {
            console.error('Route loading error:', error);
            // エラー時はホームページを表示
            await this.loadPage('home');
        }
    }

    async loadPage(page) {
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
            this.setupPageEvents(page);

            console.log(`Page loaded: ${page}`);

        } catch (error) {
            console.error(`Error loading page ${page}:`, error);
            throw error;
        }
    }

    setupPageEvents(page) {
        // ページ固有のイベントリスナー設定
        switch (page) {
            case 'home':
                this.setupHomeEvents();
                break;
            case 'preparation':
                this.setupPreparationEvents();
                break;
            case 'training':
                this.setupTrainingEvents();
                break;
            default:
                break;
        }
    }

    setupHomeEvents() {
        // ホームページのボタンイベント設定
        const trainingButtons = document.querySelectorAll('[data-route]');

        trainingButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const route = e.currentTarget.getAttribute('data-route');
                const mode = e.currentTarget.getAttribute('data-mode');
                const session = e.currentTarget.getAttribute('data-session');

                // トレーニングモードのパラメータをハッシュに含める
                let hash = route;
                if (mode && session) {
                    hash += `?mode=${mode}&session=${session}`;
                }

                window.location.hash = hash;
            });
        });
    }

    setupPreparationEvents() {
        // preparation.htmlのイベント設定
        console.log('Setting up preparation page events');
        // TODO: 必要に応じてpreparation固有のイベントを追加
    }

    setupTrainingEvents() {
        // training.htmlのイベント設定
        console.log('Setting up training page events');
        // TODO: 必要に応じてtraining固有のイベントを追加
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