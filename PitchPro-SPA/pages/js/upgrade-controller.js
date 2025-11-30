/**
 * upgrade-controller.js - アップグレード画面コントローラー
 * @version 1.0.0
 * @date 2025-11-30
 */

console.log('🚀 [upgrade-controller] Script loaded');

/**
 * アップグレードページ初期化
 */
window.initUpgradePage = async function() {
    console.log('📦 [Upgrade] 初期化開始');

    // Lucideアイコン初期化
    if (typeof window.initializeLucideIcons === 'function') {
        window.initializeLucideIcons({ immediate: true });
    }

    // 状態に応じたUI更新
    await updateUpgradeUI();

    // イベントリスナー設定
    setupUpgradeEventListeners();

    console.log('✅ [Upgrade] 初期化完了');
};

/**
 * UIを現在の状態に合わせて更新
 */
async function updateUpgradeUI() {
    const isLoggedIn = !!window.currentUser;

    // ログイン状態でステータスアイコンを更新
    updateStatusSection(isLoggedIn);

    if (!isLoggedIn) {
        // 未ログイン
        showActionGroup('action-login');
        return;
    }

    // RevenueCatの課金状態を確認
    if (!window.RevenueCatManager) {
        console.warn('⚠️ [Upgrade] RevenueCatManager not available');
        showActionGroup('action-upgrade');
        return;
    }

    try {
        const { isPremium, isTrialing, customerInfo } = await window.RevenueCatManager.checkStatus();

        if (isPremium && !isTrialing) {
            // プレミアム利用中
            showActionGroup('action-premium');
            updateStatusForPremium();
        } else if (isTrialing) {
            // トライアル中
            showActionGroup('action-trial');
            updateStatusForTrial(customerInfo);
        } else {
            // 無料プラン
            showActionGroup('action-upgrade');
        }
    } catch (error) {
        console.error('❌ [Upgrade] 課金状態確認エラー:', error);
        showActionGroup('action-upgrade');
    }
}

/**
 * ステータスセクションを更新
 */
function updateStatusSection(isLoggedIn) {
    const statusIcon = document.getElementById('status-icon');
    const statusLabel = document.getElementById('status-label');
    const statusValue = document.getElementById('status-value');

    if (!isLoggedIn) {
        statusIcon.innerHTML = '<i data-lucide="user-x" class="text-white-60 icon-lg"></i>';
        statusLabel.textContent = 'ログイン状態';
        statusValue.textContent = '未ログイン';
    } else {
        statusIcon.innerHTML = '<i data-lucide="user" class="text-white icon-lg"></i>';
        statusLabel.textContent = '現在のプラン';
        statusValue.textContent = '無料プラン';
    }

    // アイコン再初期化
    if (typeof window.initializeLucideIcons === 'function') {
        window.initializeLucideIcons({ immediate: true });
    }
}

/**
 * プレミアム利用中のステータス更新
 */
function updateStatusForPremium() {
    const statusIcon = document.getElementById('status-icon');
    const statusValue = document.getElementById('status-value');

    statusIcon.innerHTML = '<i data-lucide="crown" class="text-yellow-300 icon-lg"></i>';
    statusValue.textContent = 'プレミアム';
    statusValue.classList.add('text-yellow-300');

    if (typeof window.initializeLucideIcons === 'function') {
        window.initializeLucideIcons({ immediate: true });
    }
}

/**
 * トライアル中のステータス更新
 */
function updateStatusForTrial(customerInfo) {
    const statusIcon = document.getElementById('status-icon');
    const statusValue = document.getElementById('status-value');
    const trialRemaining = document.getElementById('trial-remaining');

    statusIcon.innerHTML = '<i data-lucide="clock" class="text-blue-300 icon-lg"></i>';
    statusValue.textContent = '無料トライアル中';
    statusValue.classList.add('text-blue-300');

    // トライアル残り日数を計算
    if (customerInfo?.entitlements?.active?.premium?.expirationDate) {
        const expirationDate = new Date(customerInfo.entitlements.active.premium.expirationDate);
        const now = new Date();
        const daysRemaining = Math.ceil((expirationDate - now) / (1000 * 60 * 60 * 24));

        if (trialRemaining) {
            trialRemaining.textContent = `残り ${daysRemaining} 日`;
        }
    }

    if (typeof window.initializeLucideIcons === 'function') {
        window.initializeLucideIcons({ immediate: true });
    }
}

/**
 * アクショングループを表示
 */
function showActionGroup(groupId) {
    // すべてのアクショングループを非表示
    const groups = ['action-login', 'action-upgrade', 'action-premium', 'action-trial'];
    groups.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });

    // 指定されたグループを表示
    const targetGroup = document.getElementById(groupId);
    if (targetGroup) {
        targetGroup.style.display = 'block';
    }
}

/**
 * イベントリスナー設定
 */
function setupUpgradeEventListeners() {
    // アップグレードボタン
    const upgradeBtn = document.getElementById('upgrade-btn');
    if (upgradeBtn) {
        upgradeBtn.addEventListener('click', handleUpgrade);
    }

    // サブスクリプション管理ボタン
    const manageBtn = document.getElementById('manage-subscription-btn');
    if (manageBtn) {
        manageBtn.addEventListener('click', handleManageSubscription);
    }
}

/**
 * アップグレード処理
 */
async function handleUpgrade() {
    console.log('🛒 [Upgrade] 購入処理開始');

    const upgradeBtn = document.getElementById('upgrade-btn');
    const loadingSection = document.getElementById('upgrade-loading');
    const errorSection = document.getElementById('upgrade-error');
    const errorMessage = document.getElementById('upgrade-error-message');

    // エラーをクリア
    errorSection.style.display = 'none';

    // ローディング表示
    upgradeBtn.disabled = true;
    loadingSection.style.display = 'flex';

    try {
        // パッケージを取得
        const packages = await window.RevenueCatManager.getPackages();

        if (packages.length === 0) {
            throw new Error('利用可能なプランがありません');
        }

        console.log('📦 [Upgrade] パッケージ:', packages);

        // 最初のパッケージ（premium_monthly）を購入
        const result = await window.RevenueCatManager.purchase(packages[0]);

        if (result.success) {
            console.log('✅ [Upgrade] 購入成功');
            // UIを更新
            await updateUpgradeUI();

            // 成功メッセージ
            alert('プレミアムプランへのアップグレードが完了しました！');
        } else if (result.cancelled) {
            console.log('ℹ️ [Upgrade] ユーザーがキャンセル');
        }
    } catch (error) {
        console.error('❌ [Upgrade] 購入エラー:', error);
        errorMessage.textContent = error.message || '購入処理中にエラーが発生しました';
        errorSection.style.display = 'flex';
    } finally {
        // ローディング非表示
        upgradeBtn.disabled = false;
        loadingSection.style.display = 'none';

        // Lucideアイコン再初期化（ローディングアイコン用）
        if (typeof window.initializeLucideIcons === 'function') {
            window.initializeLucideIcons({ immediate: true });
        }
    }
}

/**
 * サブスクリプション管理
 */
function handleManageSubscription() {
    console.log('⚙️ [Upgrade] サブスクリプション管理');

    // RevenueCatのカスタマーポータルを開く（Web SDKではサポートが限定的）
    // 代替：設定ページへ誘導またはサポートへの案内
    alert('サブスクリプションの管理は、お使いのデバイスの設定からApp Store/Google Playで行えます。\n\nWebからの管理機能は準備中です。');
}

console.log('✅ [upgrade-controller] window.initUpgradePage defined');
