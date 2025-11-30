/**
 * revenuecat-config.js
 * RevenueCat課金システム設定・初期化
 * @version 1.0.0
 * @date 2025-11-30
 */

// RevenueCat APIキー（テスト用）
const REVENUECAT_API_KEY = 'test_TOGsPuIHRNyeJNRXHVRwwetnSaY';

// 課金プラン定義
const SUBSCRIPTION_PLANS = {
    FREE: 'free',
    PREMIUM: 'premium'
};

// 無料で使える機能
const FREE_FEATURES = [
    'random-ascending',  // ランダム基音（上行）
    'random-descending'  // ランダム基音（下行）
];

// プレミアム限定機能
const PREMIUM_FEATURES = [
    'continuous-ascending',   // 連続チャレンジ（上行）
    'continuous-descending',  // 連続チャレンジ（下行）
    'chromatic-ascending',    // 12音階（上行）
    'chromatic-descending',   // 12音階（下行）
    'chromatic-both',         // 12音階（両方向）
    'premium-analysis'        // プレミアム分析
];

// 無料トライアル期間（日数）
const FREE_TRIAL_DAYS = 7;

/**
 * RevenueCat初期化
 */
async function initializeRevenueCat() {
    // Purchases SDKが読み込まれているか確認
    if (typeof Purchases === 'undefined') {
        console.error('❌ [RevenueCat] SDK not loaded');
        return null;
    }

    try {
        // ユーザーIDを取得（Firebase認証から）
        const appUserId = window.currentUser?.uid || null;

        // RevenueCat設定
        const purchases = Purchases.Purchases.configure({
            apiKey: REVENUECAT_API_KEY,
            appUserId: appUserId
        });

        console.log('✅ [RevenueCat] 初期化完了', appUserId ? `(User: ${appUserId})` : '(Anonymous)');

        // グローバルに公開
        window.revenueCatPurchases = purchases;

        return purchases;
    } catch (error) {
        console.error('❌ [RevenueCat] 初期化エラー:', error);
        return null;
    }
}

/**
 * ユーザーの課金状態を確認
 * @returns {Promise<Object>} 課金情報
 */
async function checkSubscriptionStatus() {
    if (!window.revenueCatPurchases) {
        console.warn('⚠️ [RevenueCat] Not initialized');
        return { isPremium: false, isTrialing: false };
    }

    try {
        const customerInfo = await window.revenueCatPurchases.getCustomerInfo();

        // アクティブなエンタイトルメントを確認
        const isPremium = customerInfo.entitlements.active['premium'] !== undefined;
        const isTrialing = customerInfo.entitlements.active['premium']?.periodType === 'trial';

        console.log('📊 [RevenueCat] 課金状態:', { isPremium, isTrialing });

        return {
            isPremium,
            isTrialing,
            customerInfo
        };
    } catch (error) {
        console.error('❌ [RevenueCat] 課金状態確認エラー:', error);
        return { isPremium: false, isTrialing: false };
    }
}

/**
 * 機能がアクセス可能かチェック
 * @param {string} featureId - 機能ID（モード名など）
 * @returns {Promise<boolean>} アクセス可能かどうか
 */
async function canAccessFeature(featureId) {
    // 無料機能は常にアクセス可能
    if (FREE_FEATURES.includes(featureId)) {
        return true;
    }

    // プレミアム機能の場合は課金状態を確認
    if (PREMIUM_FEATURES.includes(featureId)) {
        const { isPremium, isTrialing } = await checkSubscriptionStatus();
        return isPremium || isTrialing;
    }

    // 未定義の機能はデフォルトでアクセス可能
    return true;
}

/**
 * 利用可能なパッケージ（プラン）を取得
 * @returns {Promise<Array>} パッケージ一覧
 */
async function getAvailablePackages() {
    if (!window.revenueCatPurchases) {
        console.warn('⚠️ [RevenueCat] Not initialized');
        return [];
    }

    try {
        const offerings = await window.revenueCatPurchases.getOfferings();

        if (offerings.current) {
            console.log('📦 [RevenueCat] 利用可能なパッケージ:', offerings.current.availablePackages);
            return offerings.current.availablePackages;
        }

        return [];
    } catch (error) {
        console.error('❌ [RevenueCat] パッケージ取得エラー:', error);
        return [];
    }
}

/**
 * 購入処理
 * @param {Object} packageToPurchase - 購入するパッケージ
 * @returns {Promise<Object>} 購入結果
 */
async function purchasePackage(packageToPurchase) {
    if (!window.revenueCatPurchases) {
        throw new Error('RevenueCat not initialized');
    }

    try {
        const { customerInfo } = await window.revenueCatPurchases.purchase({
            rcPackage: packageToPurchase
        });

        console.log('✅ [RevenueCat] 購入成功');

        return {
            success: true,
            customerInfo
        };
    } catch (error) {
        if (error.userCancelled) {
            console.log('ℹ️ [RevenueCat] ユーザーがキャンセル');
            return { success: false, cancelled: true };
        }

        console.error('❌ [RevenueCat] 購入エラー:', error);
        throw error;
    }
}

// グローバルに公開
window.RevenueCatManager = {
    initialize: initializeRevenueCat,
    checkStatus: checkSubscriptionStatus,
    canAccess: canAccessFeature,
    getPackages: getAvailablePackages,
    purchase: purchasePackage,
    FREE_FEATURES,
    PREMIUM_FEATURES,
    FREE_TRIAL_DAYS
};

console.log('💰 [RevenueCat] Config loaded');
