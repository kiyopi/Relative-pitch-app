/**
 * Component Integration System
 * Phase 3: UIコンポーネント統合システム
 *
 * 全UIコンポーネントの統一インターフェース
 * 動的インポート・ファクトリーパターン・統一初期化を提供
 */

// ===== コンポーネント統合マネージャー =====
export class ComponentManager {
    constructor() {
        this.registeredComponents = new Map();
        this.instances = new Map();
    }

    /**
     * コンポーネントを登録
     * @param {string} name - コンポーネント名
     * @param {Function} componentClass - コンポーネントクラス
     * @param {string} importPath - インポートパス（動的インポート用）
     */
    register(name, componentClass, importPath = null) {
        this.registeredComponents.set(name, {
            class: componentClass,
            importPath,
            instances: new Map()
        });
    }

    /**
     * コンポーネントを動的インポートで登録
     * @param {string} name - コンポーネント名
     * @param {string} importPath - インポートパス
     */
    registerLazy(name, importPath) {
        this.registeredComponents.set(name, {
            class: null,
            importPath,
            instances: new Map()
        });
    }

    /**
     * コンポーネントを作成
     * @param {string} name - コンポーネント名
     * @param {string|Element} container - コンテナ要素
     * @param {Object} options - オプション
     * @param {string} instanceId - インスタンスID（省略時は自動生成）
     */
    async create(name, container, options = {}, instanceId = null) {
        const componentData = this.registeredComponents.get(name);

        if (!componentData) {
            throw new Error(`Component "${name}" is not registered`);
        }

        // 動的インポートが必要な場合
        if (!componentData.class && componentData.importPath) {
            try {
                const module = await import(componentData.importPath);
                const ComponentClass = module[name] || module.default;
                componentData.class = ComponentClass;
            } catch (error) {
                console.error(`Failed to import component "${name}":`, error);
                throw error;
            }
        }

        if (!componentData.class) {
            throw new Error(`Component class for "${name}" is not available`);
        }

        // インスタンス作成
        const instance = new componentData.class(container, options);

        // インスタンスID生成
        if (!instanceId) {
            instanceId = `${name}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        }

        // インスタンス登録
        componentData.instances.set(instanceId, instance);

        console.log(`Component "${name}" created with ID: ${instanceId}`);
        return { instance, instanceId };
    }

    /**
     * インスタンスを取得
     * @param {string} name - コンポーネント名
     * @param {string} instanceId - インスタンスID
     */
    getInstance(name, instanceId) {
        const componentData = this.registeredComponents.get(name);
        if (!componentData) return null;

        return componentData.instances.get(instanceId);
    }

    /**
     * コンポーネントの全インスタンスを取得
     * @param {string} name - コンポーネント名
     */
    getAllInstances(name) {
        const componentData = this.registeredComponents.get(name);
        if (!componentData) return [];

        return Array.from(componentData.instances.values());
    }

    /**
     * インスタンスを破棄
     * @param {string} name - コンポーネント名
     * @param {string} instanceId - インスタンスID
     */
    destroy(name, instanceId) {
        const componentData = this.registeredComponents.get(name);
        if (!componentData) return false;

        const instance = componentData.instances.get(instanceId);
        if (!instance) return false;

        // インスタンスのdestroyメソッドを呼び出し
        if (typeof instance.destroy === 'function') {
            instance.destroy();
        }

        componentData.instances.delete(instanceId);
        console.log(`Component "${name}" instance "${instanceId}" destroyed`);
        return true;
    }

    /**
     * コンポーネントの全インスタンスを破棄
     * @param {string} name - コンポーネント名
     */
    destroyAll(name) {
        const componentData = this.registeredComponents.get(name);
        if (!componentData) return 0;

        let destroyedCount = 0;
        for (const [instanceId, instance] of componentData.instances) {
            if (typeof instance.destroy === 'function') {
                instance.destroy();
            }
            destroyedCount++;
        }

        componentData.instances.clear();
        console.log(`Destroyed ${destroyedCount} instances of component "${name}"`);
        return destroyedCount;
    }

    /**
     * 全コンポーネントの全インスタンスを破棄
     */
    destroyAllComponents() {
        let totalDestroyed = 0;
        for (const [name] of this.registeredComponents) {
            totalDestroyed += this.destroyAll(name);
        }
        console.log(`Total destroyed instances: ${totalDestroyed}`);
        return totalDestroyed;
    }

    /**
     * 登録されたコンポーネント一覧を取得
     */
    getRegisteredComponents() {
        return Array.from(this.registeredComponents.keys());
    }
}

// ===== ファクトリー関数 =====

/**
 * ステップインジケーター作成ファクトリー
 * @param {string|Element} container - コンテナ
 * @param {Object} options - オプション
 */
export async function createStepIndicator(container, options = {}) {
    return await componentManager.create('StepIndicator', container, options);
}

/**
 * プログレスバー作成ファクトリー
 * @param {string|Element} container - コンテナ
 * @param {Object} options - オプション
 */
export async function createProgressBar(container, options = {}) {
    return await componentManager.create('ProgressBar', container, options);
}

/**
 * 音量バー作成ファクトリー（ProgressBarの特殊化）
 * @param {string|Element} container - コンテナ
 * @param {Object} options - オプション
 */
export async function createVolumeBar(container, options = {}) {
    const volumeOptions = {
        variant: 'volume',
        color: 'green',
        showText: true,
        ...options
    };
    return await createProgressBar(container, volumeOptions);
}

/**
 * 評価分布バー作成ファクトリー（ProgressBarの特殊化）
 * @param {string|Element} container - コンテナ
 * @param {string} evaluationType - 評価タイプ
 * @param {number} count - カウント
 * @param {number} total - 全体数
 * @param {Object} options - 追加オプション
 */
export async function createEvaluationBar(container, evaluationType, count, total, options = {}) {
    const evalOptions = {
        variant: 'evaluation',
        color: evaluationType,
        showText: true,
        ...options
    };

    const { instance, instanceId } = await createProgressBar(container, evalOptions);

    // 評価データを設定
    instance.setEvaluationData(evaluationType, count, total);

    return { instance, instanceId };
}

// ===== グローバルコンポーネントマネージャー =====
export const componentManager = new ComponentManager();

// ===== 初期化とコンポーネント登録 =====
export async function initializeComponents() {
    console.log('Initializing PitchPro UI Components...');

    try {
        // コンポーネントを動的インポートで登録
        componentManager.registerLazy('StepIndicator', './ui/StepIndicator.js');
        componentManager.registerLazy('ProgressBar', './ui/ProgressBar.js');

        // 他のコンポーネントも追加予定
        // componentManager.registerLazy('ModeCard', './ui/ModeCard.js');
        // componentManager.registerLazy('GlassCard', './ui/GlassCard.js');
        // componentManager.registerLazy('VoiceInstruction', './ui/VoiceInstruction.js');

        console.log('✅ Component registration completed');
        console.log('Available components:', componentManager.getRegisteredComponents());

        return componentManager;

    } catch (error) {
        console.error('❌ Component initialization failed:', error);
        throw error;
    }
}

// ===== ユーティリティ関数 =====

/**
 * DOM要素が存在するかチェック
 * @param {string|Element} selector - セレクター or 要素
 */
export function checkContainer(selector) {
    if (typeof selector === 'string') {
        const element = document.querySelector(selector);
        if (!element) {
            console.warn(`Container not found: ${selector}`);
            return null;
        }
        return element;
    }
    return selector;
}

/**
 * 複数のコンポーネントを一括作成
 * @param {Array} componentConfigs - コンポーネント設定配列
 */
export async function createComponents(componentConfigs) {
    const results = [];

    for (const config of componentConfigs) {
        try {
            const { type, container, options = {}, instanceId = null } = config;
            const result = await componentManager.create(type, container, options, instanceId);
            results.push({ ...result, type, success: true });
        } catch (error) {
            console.error(`Failed to create component:`, config, error);
            results.push({ type: config.type, success: false, error });
        }
    }

    return results;
}

/**
 * ページクリーンアップ用：全インスタンス破棄
 */
export function cleanupPageComponents() {
    console.log('🧹 Cleaning up page components...');
    const destroyedCount = componentManager.destroyAllComponents();
    console.log(`✅ Cleanup completed. Destroyed ${destroyedCount} component instances.`);
    return destroyedCount;
}

// ===== デフォルトエクスポート =====
export default {
    ComponentManager,
    componentManager,
    initializeComponents,
    createStepIndicator,
    createProgressBar,
    createVolumeBar,
    createEvaluationBar,
    createComponents,
    cleanupPageComponents,
    checkContainer
};