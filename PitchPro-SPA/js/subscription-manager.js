/**
 * SubscriptionManager - 課金・サブスクリプション管理モジュール
 *
 * @version 1.0.0
 * @description 課金制御の一元管理、将来の決済システム統合に対応
 * @author Claude Code
 * @created 2025-01-14
 *
 * @features
 * - 課金フィルター統一制御
 * - プラン管理（無料/プレミアム）
 * - データ保存期間管理
 * - アクセス権限チェック
 * - 将来の決済システム統合準備
 *
 * @changelog
 * - v1.0.0 (2025-01-14): 初版実装
 *   - グローバル課金フィルター制御
 *   - プラン定義システム
 *   - DataManager連携API
 *   - 将来拡張メソッド仮実装
 */

class SubscriptionManager {
  static VERSION = '1.0.0';

  // === グローバル設定 ===

  /**
   * 課金フィルター一括制御フラグ
   * @TEMPORARY_DISABLE_FILTER テスト目的で課金フィルターを一時無効化中
   * @TODO 全機能動作確認後、false に変更すること
   */
  static DISABLE_PAYMENT_FILTER = true;

  // === プラン定義 ===

  /**
   * サブスクリプションプラン定義
   */
  static PLANS = {
    FREE: {
      id: 'free',
      name: '無料プラン',
      displayName: '無料プラン',
      dataRetentionDays: 7, // 7日間のデータ表示
      features: {
        randomMode: true, // ランダム基音モード
        continuousMode: false, // 連続チャレンジモード
        twelveToneMode: false, // 12音階モード
        statistics: true, // 基本統計
        detailedAnalysis: false, // 詳細分析
        dataExport: false, // データエクスポート
        weaknessTraining: false // 弱点練習モード
      },
      limits: {
        maxSessionsPerDay: -1, // 無制限
        maxLessonsPerDay: -1, // 無制限
        historyRetentionDays: 7 // 7日以内のみ表示
      }
    },
    PREMIUM: {
      id: 'premium',
      name: 'premium',
      displayName: 'プレミアムプラン',
      dataRetentionDays: -1, // 無制限
      features: {
        randomMode: true,
        continuousMode: true,
        twelveToneMode: true,
        statistics: true,
        detailedAnalysis: true,
        dataExport: true,
        weaknessTraining: true
      },
      limits: {
        maxSessionsPerDay: -1,
        maxLessonsPerDay: -1,
        historyRetentionDays: -1 // 無制限
      }
    }
  };

  /**
   * モードとプランの対応表
   */
  static MODE_ACCESS = {
    random: 'FREE', // 無料で利用可能
    continuous: 'PREMIUM', // プレミアム必須
    '12tone': 'PREMIUM' // プレミアム必須
  };

  // === 課金判定メソッド（統一API） ===

  /**
   * プレミアムプランが有効か判定
   * @param {Object} subscriptionData - サブスクリプションデータ
   * @returns {boolean} プレミアム有効かどうか
   */
  static isPremiumActive(subscriptionData) {
    if (!subscriptionData || !subscriptionData.premiumAccess) {
      return false;
    }

    const { status, subscriptionEnd } = subscriptionData.premiumAccess;

    // ステータスチェック
    if (status !== 'active') {
      return false;
    }

    // 有効期限チェック
    if (subscriptionEnd) {
      const now = new Date();
      const expiry = new Date(subscriptionEnd);
      return now < expiry;
    }

    // subscriptionEndがnullの場合は無期限として扱う
    return true;
  }

  /**
   * 課金フィルターを適用すべきか判定
   * @returns {boolean} フィルター適用すべきか
   */
  static shouldFilterData() {
    // テストモード時は常にフィルター無効
    if (this.DISABLE_PAYMENT_FILTER) {
      return false;
    }

    // 本番モード時は通常の課金判定
    return true;
  }

  /**
   * 現在のユーザープランを取得
   * @param {Object} subscriptionData - サブスクリプションデータ
   * @returns {Object} プラン情報
   */
  static getCurrentPlan(subscriptionData) {
    const isPremium = this.isPremiumActive(subscriptionData);
    return isPremium ? this.PLANS.PREMIUM : this.PLANS.FREE;
  }

  /**
   * モードへのアクセス権限チェック
   * @param {string} mode - モード名（'random', 'continuous', '12tone'）
   * @param {Object} subscriptionData - サブスクリプションデータ
   * @returns {Object} アクセス権限情報
   */
  static checkModeAccess(mode, subscriptionData) {
    // テストモード時は全モードアクセス可能
    if (this.DISABLE_PAYMENT_FILTER) {
      return {
        hasAccess: true,
        reason: 'test_mode',
        message: 'テストモード: 全モードアクセス可能'
      };
    }

    const requiredPlan = this.MODE_ACCESS[mode];

    // 無効なモード
    if (!requiredPlan) {
      return {
        hasAccess: false,
        reason: 'invalid_mode',
        message: '無効なモードです'
      };
    }

    // 無料モード
    if (requiredPlan === 'FREE') {
      return {
        hasAccess: true,
        reason: 'free_mode',
        message: '無料で利用可能'
      };
    }

    // プレミアムモード
    const isPremium = this.isPremiumActive(subscriptionData);
    if (isPremium) {
      return {
        hasAccess: true,
        reason: 'premium_active',
        message: 'プレミアムプランで利用可能'
      };
    }

    return {
      hasAccess: false,
      reason: 'premium_required',
      message: 'プレミアムプランが必要です',
      requiredPlan: this.PLANS.PREMIUM
    };
  }

  // === データフィルター適用 ===

  /**
   * プラン別にセッションデータをフィルター
   * @param {Array} sessions - 全セッションデータ
   * @param {Object} subscriptionData - サブスクリプションデータ
   * @returns {Object} フィルター結果
   */
  static filterSessionsByPlan(sessions, subscriptionData) {
    if (!sessions || sessions.length === 0) {
      return {
        filteredSessions: [],
        totalSessions: 0,
        visibleSessions: 0,
        hiddenSessions: 0,
        plan: this.getCurrentPlan(subscriptionData),
        isFiltered: false
      };
    }

    const isPremium = this.isPremiumActive(subscriptionData);
    const currentPlan = this.getCurrentPlan(subscriptionData);

    // テストモード or プレミアムプラン → フィルターなし
    if (this.DISABLE_PAYMENT_FILTER || isPremium) {
      return {
        filteredSessions: sessions,
        totalSessions: sessions.length,
        visibleSessions: sessions.length,
        hiddenSessions: 0,
        plan: currentPlan,
        isFiltered: false,
        message: this.DISABLE_PAYMENT_FILTER
          ? `⚠️ テストモード: 全${sessions.length}件を表示（課金フィルター無効）`
          : `✨ プレミアム: 全${sessions.length}件を表示`
      };
    }

    // 無料プラン → 7日以内のデータのみ表示
    const retentionDays = currentPlan.limits.historyRetentionDays;
    const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

    const filteredSessions = sessions.filter(session =>
      new Date(session.startTime) > cutoffDate
    );

    return {
      filteredSessions,
      totalSessions: sessions.length,
      visibleSessions: filteredSessions.length,
      hiddenSessions: sessions.length - filteredSessions.length,
      plan: currentPlan,
      isFiltered: true,
      message: `📊 無料プラン: ${sessions.length}件中${filteredSessions.length}件を表示（${retentionDays}日以内のみ）`,
      lockedMessage: `🔒 ${sessions.length - filteredSessions.length}件は非表示（プレミアムで全データ閲覧可能）`
    };
  }

  /**
   * データ保存期間（日数）を取得
   * @param {Object} subscriptionData - サブスクリプションデータ
   * @returns {number} 保存期間（-1は無制限）
   */
  static getDataRetentionDays(subscriptionData) {
    const currentPlan = this.getCurrentPlan(subscriptionData);
    return currentPlan.dataRetentionDays;
  }

  /**
   * データ保存情報を取得（設定画面用）
   * @param {Array} sessions - 全セッションデータ
   * @param {Object} subscriptionData - サブスクリプションデータ
   * @returns {Object} データ保存情報
   */
  static getDataRetentionInfo(sessions, subscriptionData) {
    const currentPlan = this.getCurrentPlan(subscriptionData);
    const isPremium = this.isPremiumActive(subscriptionData);
    const filterResult = this.filterSessionsByPlan(sessions, subscriptionData);

    if (sessions.length === 0) {
      return {
        retentionPeriod: currentPlan.dataRetentionDays === -1 ? 'unlimited' : `${currentPlan.dataRetentionDays}days`,
        oldestSession: null,
        oldestSessionDate: null,
        daysSinceOldest: 0,
        totalSessions: 0,
        visibleSessions: 0,
        hiddenSessions: 0,
        isPremium,
        plan: currentPlan
      };
    }

    const sortedSessions = [...sessions].sort((a, b) =>
      new Date(a.startTime) - new Date(b.startTime)
    );
    const oldestSession = sortedSessions[0];
    const daysSinceOldest = Math.floor(
      (new Date() - new Date(oldestSession.startTime)) / (1000 * 60 * 60 * 24)
    );

    return {
      retentionPeriod: currentPlan.dataRetentionDays === -1 ? 'unlimited' : `${currentPlan.dataRetentionDays}days`,
      oldestSession: oldestSession.startTime,
      oldestSessionDate: new Date(oldestSession.startTime).toLocaleDateString('ja-JP'),
      daysSinceOldest,
      totalSessions: filterResult.totalSessions,
      visibleSessions: filterResult.visibleSessions,
      hiddenSessions: filterResult.hiddenSessions,
      isPremium,
      plan: currentPlan
    };
  }

  // === データクリーンアップ管理 ===

  /**
   * セッションデータのクリーンアップ判定
   * @param {Array} sessions - 全セッションデータ
   * @param {Object} subscriptionData - サブスクリプションデータ
   * @returns {Object} クリーンアップ結果
   */
  static shouldCleanupSessions(sessions, subscriptionData) {
    const isPremium = this.isPremiumActive(subscriptionData);
    const currentPlan = this.getCurrentPlan(subscriptionData);

    if (sessions.length === 0) {
      return {
        shouldCleanup: false,
        reason: 'no_data',
        message: 'セッションデータなし'
      };
    }

    // 無料プラン: データ削除しない（表示制限のみ）
    if (!isPremium) {
      const filterResult = this.filterSessionsByPlan(sessions, subscriptionData);
      return {
        shouldCleanup: false,
        reason: 'free_plan_no_cleanup',
        message: `無料プラン: ${sessions.length}件保存中、${filterResult.visibleSessions}件表示可能`,
        visibleSessions: filterResult.visibleSessions,
        plan: currentPlan
      };
    }

    // プレミアムプラン: 容量チェックのみ
    const storageSize = this.estimateStorageSize(sessions);
    const maxSize = 4 * 1024 * 1024; // 4MB

    if (storageSize > maxSize) {
      return {
        shouldCleanup: true,
        reason: 'storage_exceeded',
        message: `容量超過: ${Math.round(storageSize / 1024 / 1024 * 100) / 100}MB / 4MB`,
        currentSize: storageSize,
        maxSize,
        plan: currentPlan
      };
    }

    return {
      shouldCleanup: false,
      reason: 'storage_normal',
      message: `容量正常: ${Math.round(storageSize / 1024 / 1024 * 100) / 100}MB / 4MB`,
      currentSize: storageSize,
      maxSize,
      plan: currentPlan
    };
  }

  /**
   * ストレージサイズを推定
   * @param {Array} sessions - セッションデータ
   * @returns {number} 推定サイズ（バイト）
   */
  static estimateStorageSize(sessions) {
    try {
      const jsonString = JSON.stringify(sessions);
      return new Blob([jsonString]).size;
    } catch (error) {
      console.error('❌ ストレージサイズ推定エラー:', error);
      return 0;
    }
  }

  // === 将来拡張メソッド（仮実装） ===

  /**
   * プレミアムプランへのアップグレード（仮実装）
   * @TODO 決済システム統合時に実装
   * @param {Object} paymentInfo - 決済情報
   * @returns {Promise<Object>} アップグレード結果
   */
  static async upgradeToPremium(paymentInfo) {
    console.warn('⚠️ upgradeToPremium: 仮実装（決済システム未統合）');

    // 仮実装: ローカルでプレミアムステータスを設定
    return {
      success: false,
      reason: 'not_implemented',
      message: '決済システムが未実装です',
      paymentInfo
    };
  }

  /**
   * サブスクリプションキャンセル（仮実装）
   * @TODO 決済システム統合時に実装
   * @returns {Promise<Object>} キャンセル結果
   */
  static async cancelSubscription() {
    console.warn('⚠️ cancelSubscription: 仮実装（決済システム未統合）');

    return {
      success: false,
      reason: 'not_implemented',
      message: '決済システムが未実装です'
    };
  }

  /**
   * クーポンコード検証（仮実装）
   * @TODO クーポンシステム統合時に実装
   * @param {string} couponCode - クーポンコード
   * @returns {Promise<Object>} 検証結果
   */
  static async validateCoupon(couponCode) {
    console.warn('⚠️ validateCoupon: 仮実装（クーポンシステム未統合）');

    return {
      isValid: false,
      reason: 'not_implemented',
      message: 'クーポンシステムが未実装です',
      couponCode
    };
  }

  /**
   * プラン変更履歴を記録（仮実装）
   * @TODO プラン管理システム統合時に実装
   * @param {string} fromPlan - 変更前プラン
   * @param {string} toPlan - 変更後プラン
   * @returns {Object} 記録結果
   */
  static logPlanChange(fromPlan, toPlan) {
    console.warn('⚠️ logPlanChange: 仮実装（プラン管理システム未統合）');

    return {
      success: false,
      reason: 'not_implemented',
      message: 'プラン管理システムが未実装です',
      change: { fromPlan, toPlan }
    };
  }

  // === デバッグ・テスト用メソッド ===

  /**
   * テストモードを有効/無効化
   * @param {boolean} enabled - 有効化するか
   */
  static setTestMode(enabled) {
    this.DISABLE_PAYMENT_FILTER = enabled;
    console.log(`${enabled ? '⚠️' : '✅'} テストモード: ${enabled ? '有効' : '無効'}`);
  }

  /**
   * 現在の設定状況を表示
   * @returns {Object} 設定情報
   */
  static getConfig() {
    return {
      version: this.VERSION,
      testMode: this.DISABLE_PAYMENT_FILTER,
      plans: this.PLANS,
      modeAccess: this.MODE_ACCESS
    };
  }

  /**
   * プラン情報を取得
   * @param {string} planId - プランID
   * @returns {Object|null} プラン情報
   */
  static getPlanInfo(planId) {
    const planKey = Object.keys(this.PLANS).find(
      key => this.PLANS[key].id === planId
    );
    return planKey ? this.PLANS[planKey] : null;
  }
}

// グローバル公開
window.SubscriptionManager = SubscriptionManager;

console.log('[SubscriptionManager] v1.0.0 Loaded');
console.log(`⚠️ テストモード: ${SubscriptionManager.DISABLE_PAYMENT_FILTER ? '有効' : '無効'}`);
