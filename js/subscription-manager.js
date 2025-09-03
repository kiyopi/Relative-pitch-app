/**
 * サブスクリプション管理モジュール
 * 
 * @version 1.0.0
 * @description 課金制御・モードアクセス管理・UI制限実装
 * @author Claude Code
 * @features 無料/プレミアム判定・モード制限・課金誘導UI
 */

class SubscriptionManager {
  constructor() {
    // プラン定義
    this.PLANS = {
      FREE: 'free',
      PREMIUM: 'premium',
      TRIAL: 'trial'
    };
    
    // モードアクセス権限
    this.MODE_ACCESS = {
      random: [this.PLANS.FREE, this.PLANS.PREMIUM, this.PLANS.TRIAL],
      continuous: [this.PLANS.PREMIUM, this.PLANS.TRIAL],
      twelve: [this.PLANS.PREMIUM, this.PLANS.TRIAL],
      weakness: [this.PLANS.PREMIUM] // 将来実装
    };
    
    // 課金プラン情報
    this.PRICING = {
      monthly: {
        price: 980,
        currency: 'JPY',
        period: 'month',
        features: [
          '全モード無制限アクセス',
          '詳細分析レポート',
          '弱点練習モード（近日公開）',
          '広告非表示',
          'AI個別指導'
        ]
      }
    };
    
    // 現在の状態
    this.currentSubscription = null;
    this.isInitialized = false;
  }

  /**
   * 初期化
   */
  async initialize() {
    try {
      // DataManagerから購読情報取得
      this.currentSubscription = DataManager.getSubscriptionData();
      
      // 有効期限チェック
      this.validateSubscription();
      
      // UI更新
      this.updateUIRestrictions();
      
      this.isInitialized = true;
      console.log('📊 SubscriptionManager初期化完了:', {
        status: this.currentSubscription.premiumAccess.status,
        expiresAt: this.currentSubscription.premiumAccess.subscriptionEnd
      });
      
      return { success: true };
      
    } catch (error) {
      console.error('SubscriptionManager初期化失敗:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * サブスクリプション有効性検証
   */
  validateSubscription() {
    const premiumAccess = this.currentSubscription.premiumAccess;
    
    if (premiumAccess.status === 'active') {
      const now = new Date();
      const expiry = new Date(premiumAccess.subscriptionEnd);
      
      if (now > expiry) {
        // 期限切れ処理
        this.currentSubscription.premiumAccess.status = 'expired';
        DataManager.updateSubscriptionStatus({
          status: 'expired'
        });
        
        console.log('⚠️ サブスクリプション期限切れ');
        this.showExpirationNotice();
      }
    }
  }

  /**
   * モードアクセス権限チェック
   */
  checkModeAccess(mode) {
    const plan = this.getCurrentPlan();
    const allowedPlans = this.MODE_ACCESS[mode] || [];
    
    const hasAccess = allowedPlans.includes(plan);
    
    return {
      hasAccess,
      plan,
      reason: hasAccess ? 'access_granted' : 'premium_required',
      mode
    };
  }

  /**
   * 現在のプラン取得
   */
  getCurrentPlan() {
    const status = this.currentSubscription?.premiumAccess?.status;
    
    switch (status) {
      case 'active':
        return this.PLANS.PREMIUM;
      case 'trial':
        return this.PLANS.TRIAL;
      default:
        return this.PLANS.FREE;
    }
  }

  /**
   * UI制限更新
   */
  updateUIRestrictions() {
    const plan = this.getCurrentPlan();
    
    // モードカードの制限表示更新
    this.updateModeCards(plan);
    
    // ナビゲーション制限
    this.updateNavigation(plan);
    
    // プレミアムバッジ表示
    this.updatePremiumBadge(plan);
  }

  /**
   * モードカード制限表示
   */
  updateModeCards(plan) {
    const modeCards = document.querySelectorAll('.mode-card');
    
    modeCards.forEach(card => {
      const mode = card.dataset.mode;
      if (!mode) return;
      
      const access = this.checkModeAccess(mode);
      
      if (!access.hasAccess) {
        // ロック表示追加
        this.addLockOverlay(card);
        
        // クリックイベント上書き
        card.onclick = (e) => {
          e.preventDefault();
          this.showUpgradeModal(mode);
        };
      } else {
        // ロック解除
        this.removeLockOverlay(card);
      }
    });
  }

  /**
   * ロックオーバーレイ追加
   */
  addLockOverlay(card) {
    // 既存のオーバーレイがある場合は削除
    const existingOverlay = card.querySelector('.lock-overlay');
    if (existingOverlay) return;
    
    const overlay = document.createElement('div');
    overlay.className = 'lock-overlay';
    overlay.innerHTML = `
      <div class="lock-content">
        <i data-lucide="lock" class="icon-lg text-yellow-300"></i>
        <span class="text-sm font-bold text-yellow-300">プレミアム限定</span>
      </div>
    `;
    
    card.style.position = 'relative';
    card.appendChild(overlay);
    
    // Lucideアイコン再生成
    if (window.lucide) {
      lucide.createIcons();
    }
  }

  /**
   * ロックオーバーレイ削除
   */
  removeLockOverlay(card) {
    const overlay = card.querySelector('.lock-overlay');
    if (overlay) {
      overlay.remove();
    }
  }

  /**
   * アップグレードモーダル表示
   */
  showUpgradeModal(mode) {
    // 既存モーダル削除
    const existingModal = document.getElementById('upgrade-modal');
    if (existingModal) {
      existingModal.remove();
    }
    
    const modal = document.createElement('div');
    modal.id = 'upgrade-modal';
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-content glass-card">
        <div class="modal-header">
          <h3 class="text-2xl font-bold text-white">プレミアムプランへアップグレード</h3>
          <button class="btn-close" onclick="this.closest('.modal-overlay').remove()">
            <i data-lucide="x" class="icon-md text-white"></i>
          </button>
        </div>
        
        <div class="modal-body">
          <div class="text-center mb-6">
            <i data-lucide="crown" class="icon-xl text-yellow-300 mb-4"></i>
            <p class="text-white-80 mb-4">
              このモードはプレミアムプラン限定です。<br>
              すべての機能を解放して、音感を飛躍的に向上させましょう！
            </p>
          </div>
          
          <div class="pricing-card">
            <div class="pricing-header">
              <h4 class="text-xl font-bold text-white">月額プラン</h4>
              <div class="price">
                <span class="currency">¥</span>
                <span class="amount">${this.PRICING.monthly.price}</span>
                <span class="period">/月</span>
              </div>
            </div>
            
            <ul class="feature-list">
              ${this.PRICING.monthly.features.map(feature => `
                <li class="feature-item">
                  <i data-lucide="check-circle" class="icon-sm text-green-300"></i>
                  <span class="text-white-80">${feature}</span>
                </li>
              `).join('')}
            </ul>
            
            <div class="action-buttons">
              <button class="btn btn-premium btn-lg" onclick="subscriptionManager.startSubscription()">
                <i data-lucide="zap" class="icon-md"></i>
                <span>今すぐアップグレード</span>
              </button>
              <button class="btn btn-ghost btn-lg" onclick="this.closest('.modal-overlay').remove()">
                <span>後で検討</span>
              </button>
            </div>
            
            <p class="text-sm text-white-60 text-center mt-4">
              いつでもキャンセル可能 • 7日間返金保証
            </p>
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Lucideアイコン生成
    if (window.lucide) {
      lucide.createIcons();
    }
    
    // モーダル外クリックで閉じる
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    });
  }

  /**
   * サブスクリプション開始処理
   */
  async startSubscription() {
    try {
      console.log('💳 サブスクリプション開始処理...');
      
      // TODO: 実際の決済処理実装
      // Stripe / PayPal / App Store / Google Play統合
      
      // デモ用：即座にプレミアム有効化
      const now = new Date();
      const expiresAt = new Date(now);
      expiresAt.setMonth(expiresAt.getMonth() + 1);
      
      DataManager.updateSubscriptionStatus({
        status: 'active',
        planType: 'monthly',
        subscriptionStart: now.toISOString(),
        subscriptionEnd: expiresAt.toISOString(),
        unlockedModes: ['continuous', 'twelve', 'weakness'],
        autoRenew: true
      });
      
      // UI更新
      this.currentSubscription = DataManager.getSubscriptionData();
      this.updateUIRestrictions();
      
      // モーダル削除
      const modal = document.getElementById('upgrade-modal');
      if (modal) {
        modal.remove();
      }
      
      // 成功メッセージ
      this.showSuccessMessage('プレミアムプランへようこそ！全機能が解放されました。');
      
      return { success: true };
      
    } catch (error) {
      console.error('サブスクリプション開始エラー:', error);
      this.showErrorMessage('申し訳ございません。処理中にエラーが発生しました。');
      return { success: false, error: error.message };
    }
  }

  /**
   * サブスクリプションキャンセル
   */
  async cancelSubscription() {
    try {
      console.log('🚫 サブスクリプションキャンセル処理...');
      
      // TODO: 実際のキャンセル処理
      
      DataManager.updateSubscriptionStatus({
        status: 'expired',
        autoRenew: false
      });
      
      this.currentSubscription = DataManager.getSubscriptionData();
      this.updateUIRestrictions();
      
      this.showSuccessMessage('サブスクリプションをキャンセルしました。');
      
      return { success: true };
      
    } catch (error) {
      console.error('キャンセルエラー:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * ナビゲーション制限更新
   */
  updateNavigation(plan) {
    // 記録ページの制限
    const recordsNav = document.querySelector('[href*="records"]');
    if (recordsNav && plan === this.PLANS.FREE) {
      const parent = recordsNav.closest('.nav-button');
      if (parent) {
        parent.classList.add('nav-restricted');
        parent.title = 'プレミアム限定機能';
      }
    }
  }

  /**
   * プレミアムバッジ表示
   */
  updatePremiumBadge(plan) {
    const header = document.querySelector('.header-brand');
    if (!header) return;
    
    // 既存バッジ削除
    const existingBadge = document.getElementById('premium-badge');
    if (existingBadge) {
      existingBadge.remove();
    }
    
    if (plan === this.PLANS.PREMIUM) {
      const badge = document.createElement('div');
      badge.id = 'premium-badge';
      badge.className = 'premium-badge';
      badge.innerHTML = `
        <i data-lucide="crown" class="icon-sm text-yellow-300"></i>
        <span class="text-xs font-bold text-yellow-300">PREMIUM</span>
      `;
      
      header.appendChild(badge);
      
      if (window.lucide) {
        lucide.createIcons();
      }
    }
  }

  /**
   * 期限切れ通知表示
   */
  showExpirationNotice() {
    const notice = document.createElement('div');
    notice.className = 'expiration-notice';
    notice.innerHTML = `
      <div class="notice-content">
        <i data-lucide="alert-circle" class="icon-md text-yellow-300"></i>
        <span class="text-white">プレミアムプランの有効期限が切れました</span>
        <button class="btn btn-sm btn-premium" onclick="subscriptionManager.showUpgradeModal()">
          更新する
        </button>
      </div>
    `;
    
    document.body.insertBefore(notice, document.body.firstChild);
    
    if (window.lucide) {
      lucide.createIcons();
    }
  }

  /**
   * 成功メッセージ表示
   */
  showSuccessMessage(message) {
    this.showToast(message, 'success');
  }

  /**
   * エラーメッセージ表示
   */
  showErrorMessage(message) {
    this.showToast(message, 'error');
  }

  /**
   * トースト通知表示
   */
  showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <i data-lucide="${type === 'success' ? 'check-circle' : 'alert-circle'}" 
         class="icon-md text-white"></i>
      <span class="text-white">${message}</span>
    `;
    
    document.body.appendChild(toast);
    
    if (window.lucide) {
      lucide.createIcons();
    }
    
    // アニメーション後に削除
    setTimeout(() => {
      toast.classList.add('toast-fade-out');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  /**
   * 使用統計取得
   */
  getUsageStats() {
    const subscription = this.currentSubscription;
    const freeAccess = subscription.freeAccess.randomMode;
    
    return {
      plan: this.getCurrentPlan(),
      freeSessionsUsed: freeAccess.totalSessions,
      lastAccess: freeAccess.lastAccess,
      premiumStatus: subscription.premiumAccess.status,
      monthlyUsage: subscription.usageHistory.monthlySessionCount
    };
  }
}

// グローバル公開
window.SubscriptionManager = SubscriptionManager;

// 自動初期化
document.addEventListener('DOMContentLoaded', () => {
  window.subscriptionManager = new SubscriptionManager();
  window.subscriptionManager.initialize();
});