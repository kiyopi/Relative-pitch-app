/**
 * BaseComponent - 全UIコンポーネントの基底クラス
 * Phase 3: UIコンポーネント抽象化 - 共通機能提供
 */

export class BaseComponent {
    constructor(container, options = {}) {
        this.container = typeof container === 'string'
            ? document.querySelector(container)
            : container;

        if (!this.container) {
            throw new Error(`Container not found: ${container}`);
        }

        this.options = { ...this.defaultOptions, ...options };
        this.element = null;
        this.isRendered = false;
        this.eventListeners = new Map(); // イベントリスナー管理

        // 自動初期化
        if (this.options.autoRender) {
            this.render();
        }
    }

    /**
     * デフォルトオプション（サブクラスでオーバーライド）
     */
    get defaultOptions() {
        return {
            autoRender: true,
            className: '',
            id: ''
        };
    }

    /**
     * DOM要素を作成（サブクラスで実装必須）
     */
    createElement() {
        throw new Error('createElement must be implemented by subclass');
    }

    /**
     * コンポーネントをレンダリング
     */
    render() {
        if (this.isRendered) {
            console.warn('Component is already rendered');
            return this;
        }

        this.element = this.createElement();

        // IDとクラス名を設定
        if (this.options.id) {
            this.element.id = this.options.id;
        }

        if (this.options.className) {
            this.element.classList.add(...this.options.className.split(' '));
        }

        this.container.appendChild(this.element);
        this.isRendered = true;

        this.afterRender();
        return this;
    }

    /**
     * レンダリング後の処理（サブクラスでオーバーライド可能）
     */
    afterRender() {
        // Lucideアイコンの初期化
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }

    /**
     * コンポーネントを破棄
     */
    destroy() {
        if (!this.isRendered) {
            return;
        }

        // イベントリスナーをクリーンアップ
        this.eventListeners.forEach((listeners, element) => {
            listeners.forEach(({ event, handler }) => {
                element.removeEventListener(event, handler);
            });
        });
        this.eventListeners.clear();

        // DOM要素を削除
        if (this.element && this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }

        this.isRendered = false;
        this.element = null;
    }

    /**
     * CSSクラスを追加
     */
    addClass(className) {
        if (this.element) {
            this.element.classList.add(className);
        }
        return this;
    }

    /**
     * CSSクラスを削除
     */
    removeClass(className) {
        if (this.element) {
            this.element.classList.remove(className);
        }
        return this;
    }

    /**
     * CSSクラスをトグル
     */
    toggleClass(className) {
        if (this.element) {
            this.element.classList.toggle(className);
        }
        return this;
    }

    /**
     * 表示/非表示
     */
    show() {
        this.removeClass('hidden');
        return this;
    }

    hide() {
        this.addClass('hidden');
        return this;
    }

    toggle() {
        this.toggleClass('hidden');
        return this;
    }

    /**
     * イベントリスナーを追加（自動クリーンアップ付き）
     */
    on(event, handler, element = null) {
        const target = element || this.element;
        if (!target) return this;

        target.addEventListener(event, handler);

        // クリーンアップのためにリスナーを記録
        if (!this.eventListeners.has(target)) {
            this.eventListeners.set(target, []);
        }
        this.eventListeners.get(target).push({ event, handler });

        return this;
    }

    /**
     * 属性を設定
     */
    setAttribute(name, value) {
        if (this.element) {
            this.element.setAttribute(name, value);
        }
        return this;
    }

    /**
     * 属性を取得
     */
    getAttribute(name) {
        return this.element ? this.element.getAttribute(name) : null;
    }

    /**
     * スタイルを設定
     */
    setStyle(property, value) {
        if (this.element) {
            this.element.style[property] = value;
        }
        return this;
    }

    /**
     * 要素を検索
     */
    querySelector(selector) {
        return this.element ? this.element.querySelector(selector) : null;
    }

    querySelectorAll(selector) {
        return this.element ? this.element.querySelectorAll(selector) : [];
    }

    /**
     * オプションを更新
     */
    updateOptions(newOptions) {
        this.options = { ...this.options, ...newOptions };
        return this;
    }

    /**
     * コンポーネントの状態を取得
     */
    getState() {
        return {
            isRendered: this.isRendered,
            options: this.options,
            hasElement: !!this.element
        };
    }
}