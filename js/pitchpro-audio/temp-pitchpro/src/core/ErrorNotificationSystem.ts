/**
 * ErrorNotificationSystem - Framework-agnostic Error Display and Notification
 * 
 * Provides error messaging functionality that can be displayed on any page
 * Includes different notification types, auto-hide functionality, and priority management
 * Framework-agnostic implementation using vanilla DOM manipulation
 */

import type { NotificationConfig, NotificationElement } from '../types';

export class ErrorNotificationSystem {
  private container: HTMLElement | null = null;
  private notifications = new Map<string, NotificationElement>();
  private notificationCounter = 0;
  private defaultDuration = 5000; // 5 seconds
  private maxNotifications = 0; // 初期実装: 制限なし
  
  // CSS classes for styling
  private cssClasses = {
    container: 'pitchpro-notifications',
    notification: 'pitchpro-notification',
    title: 'pitchpro-notification-title',
    message: 'pitchpro-notification-message',
    details: 'pitchpro-notification-details',
    solution: 'pitchpro-notification-solution',
    closeButton: 'pitchpro-notification-close',
    error: 'pitchpro-notification-error',
    warning: 'pitchpro-notification-warning',
    success: 'pitchpro-notification-success',
    info: 'pitchpro-notification-info',
    high: 'pitchpro-notification-priority-high',
    medium: 'pitchpro-notification-priority-medium',
    low: 'pitchpro-notification-priority-low'
  };

  constructor() {
    // SSR compatibility
    if (typeof window === 'undefined') {
      console.log('🔇 [ErrorNotificationSystem] SSR environment detected - skipping initialization');
      return;
    }
    
    this.initializeContainer();
    this.injectCSS();
  }

  /**
   * Create and inject the notification container into the DOM
   */
  private initializeContainer(): void {
    // Check if container already exists
    let existingContainer = document.querySelector(`.${this.cssClasses.container}`);
    
    if (!existingContainer) {
      this.container = document.createElement('div');
      this.container.className = this.cssClasses.container;
      this.container.setAttribute('role', 'alert');
      this.container.setAttribute('aria-live', 'polite');
      
      // Add to document body
      document.body.appendChild(this.container);
      
      console.log('📋 [ErrorNotificationSystem] Notification container created');
    } else {
      this.container = existingContainer as HTMLElement;
      console.log('📋 [ErrorNotificationSystem] Using existing notification container');
    }
  }

  /**
   * Inject default CSS styles
   */
  private injectCSS(): void {
    // Check if styles already exist
    if (document.querySelector('#pitchpro-notifications-styles')) {
      return;
    }

    const css = `
      .${this.cssClasses.container} {
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 10000;
        max-width: 400px;
        pointer-events: none;
      }

      .${this.cssClasses.notification} {
        background: white;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
        margin-bottom: 12px;
        padding: 16px;
        pointer-events: auto;
        position: relative;
        animation: slideIn 0.3s ease-out;
        transition: opacity 0.3s ease-in-out, transform 0.3s ease-in-out;
      }

      .${this.cssClasses.notification}.removing {
        opacity: 0;
        transform: translateX(100%);
      }

      @keyframes slideIn {
        from {
          opacity: 0;
          transform: translateX(100%);
        }
        to {
          opacity: 1;
          transform: translateX(0);
        }
      }

      .${this.cssClasses.notification}.${this.cssClasses.error} {
        border-left: 4px solid #ef4444;
      }

      .${this.cssClasses.notification}.${this.cssClasses.warning} {
        border-left: 4px solid #f59e0b;
      }

      .${this.cssClasses.notification}.${this.cssClasses.success} {
        border-left: 4px solid #10b981;
      }

      .${this.cssClasses.notification}.${this.cssClasses.info} {
        border-left: 4px solid #3b82f6;
      }

      .${this.cssClasses.title} {
        font-weight: 600;
        font-size: 14px;
        color: #1f2937;
        margin-bottom: 4px;
        padding-right: 24px;
      }

      .${this.cssClasses.message} {
        font-size: 13px;
        color: #4b5563;
        margin-bottom: 8px;
        line-height: 1.4;
      }

      .${this.cssClasses.details} {
        font-size: 12px;
        color: #6b7280;
        margin-bottom: 8px;
        padding-left: 12px;
        border-left: 2px solid #e5e7eb;
      }

      .${this.cssClasses.details} li {
        margin-bottom: 2px;
      }

      .${this.cssClasses.solution} {
        font-size: 12px;
        color: #059669;
        background: #ecfdf5;
        border: 1px solid #a7f3d0;
        border-radius: 4px;
        padding: 8px;
        margin-top: 8px;
      }

      .${this.cssClasses.closeButton} {
        position: absolute;
        top: 12px;
        right: 12px;
        background: none;
        border: none;
        font-size: 18px;
        color: #9ca3af;
        cursor: pointer;
        padding: 0;
        width: 20px;
        height: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .${this.cssClasses.closeButton}:hover {
        color: #6b7280;
      }

      .${this.cssClasses.notification}.${this.cssClasses.high} {
        border-width: 2px;
        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
      }

      @media (max-width: 640px) {
        .${this.cssClasses.container} {
          top: 10px;
          left: 10px;
          right: 10px;
          max-width: none;
        }
      }
    `;

    const style = document.createElement('style');
    style.id = 'pitchpro-notifications-styles';
    style.textContent = css;
    document.head.appendChild(style);
  }

  /**
   * Show a notification
   */
  show(config: NotificationConfig): string {
    if (!this.container) {
      console.warn('⚠️ [ErrorNotificationSystem] Container not available - cannot show notification');
      return '';
    }

    // Generate unique ID
    const id = `notification-${++this.notificationCounter}`;

    // Create notification element
    const notification = this.createNotificationElement(id, config);

    // Remove oldest notification if we're at the limit
    if (this.notifications.size >= this.maxNotifications) {
      const oldestId = Array.from(this.notifications.keys())[0];
      this.remove(oldestId);
    }

    // Add to container and tracking
    this.container.appendChild(notification);
    this.notifications.set(id, notification);

    // Auto-hide if configured
    if (config.autoHide !== false) {
      const duration = config.duration || this.defaultDuration;
      setTimeout(() => {
        this.remove(id);
      }, duration);
    }

    console.log(`📢 [ErrorNotificationSystem] Notification shown: ${config.type} - ${config.title}`);
    
    return id;
  }

  /**
   * Create notification DOM element
   */
  private createNotificationElement(id: string, config: NotificationConfig): NotificationElement {
    const notification = document.createElement('div') as unknown as NotificationElement;
    notification.className = [
      this.cssClasses.notification,
      this.cssClasses[config.type],
      config.priority ? this.cssClasses[config.priority] : ''
    ].filter(Boolean).join(' ');
    notification['data-notification-id'] = id;

    // Title
    const title = document.createElement('div');
    title.className = this.cssClasses.title;
    title.textContent = config.title;
    notification.appendChild(title);

    // Message
    const message = document.createElement('div');
    message.className = this.cssClasses.message;
    message.textContent = config.message;
    notification.appendChild(message);

    // Details (if provided)
    if (config.details && config.details.length > 0) {
      const details = document.createElement('div');
      details.className = this.cssClasses.details;
      
      const list = document.createElement('ul');
      list.style.margin = '0';
      list.style.paddingLeft = '16px';
      
      config.details.forEach(detail => {
        const item = document.createElement('li');
        item.textContent = detail;
        list.appendChild(item);
      });
      
      details.appendChild(list);
      notification.appendChild(details);
    }

    // Solution (if provided)
    if (config.solution) {
      const solution = document.createElement('div');
      solution.className = this.cssClasses.solution;
      solution.textContent = config.solution;
      notification.appendChild(solution);
    }

    // Close button
    const closeButton = document.createElement('button');
    closeButton.className = this.cssClasses.closeButton;
    closeButton.innerHTML = '×';
    closeButton.setAttribute('aria-label', 'Close notification');
    closeButton.addEventListener('click', () => {
      this.remove(id);
    });
    notification.appendChild(closeButton);

    return notification;
  }

  /**
   * Remove a specific notification
   */
  remove(id: string): void {
    const notification = this.notifications.get(id);
    if (!notification) {
      return;
    }

    // Add removing class for exit animation
    notification.classList.add('removing');

    // Remove from DOM after animation
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
      this.notifications.delete(id);
    }, 300);

    console.log(`🗑️ [ErrorNotificationSystem] Notification removed: ${id}`);
  }

  /**
   * Clear all notifications
   */
  clearAll(): void {
    const ids = Array.from(this.notifications.keys());
    ids.forEach(id => this.remove(id));
    
    console.log('🧹 [ErrorNotificationSystem] All notifications cleared');
  }

  /**
   * Show error notification (convenience method)
   */
  showError(title: string, message: string, options: Partial<NotificationConfig> = {}): string {
    return this.show({
      type: 'error',
      title,
      message,
      priority: 'high',
      autoHide: false, // Errors should be manually dismissed
      ...options
    });
  }

  /**
   * Show warning notification (convenience method)
   */
  showWarning(title: string, message: string, options: Partial<NotificationConfig> = {}): string {
    return this.show({
      type: 'warning',
      title,
      message,
      priority: 'medium',
      duration: 8000, // Longer duration for warnings
      ...options
    });
  }

  /**
   * Show success notification (convenience method)
   */
  showSuccess(title: string, message: string, options: Partial<NotificationConfig> = {}): string {
    return this.show({
      type: 'success',
      title,
      message,
      priority: 'low',
      duration: 3000, // Shorter duration for success messages
      ...options
    });
  }

  /**
   * Show info notification (convenience method)
   */
  showInfo(title: string, message: string, options: Partial<NotificationConfig> = {}): string {
    return this.show({
      type: 'info',
      title,
      message,
      priority: 'low',
      ...options
    });
  }

  /**
   * Show microphone error with common solutions
   */
  showMicrophoneError(error: Error, context?: string): string {
    // Common solutions for microphone errors
    // const commonSolutions = [
    //   'ブラウザにマイクアクセスを許可してください',
    //   'マイクが他のアプリケーションで使用されていないか確認してください',
    //   'ブラウザを再起動して再度お試しください',
    //   'デバイスの設定でマイクが有効になっていることを確認してください'
    // ];

    return this.showError(
      'マイクロフォンエラー',
      `マイクの初期化に失敗しました: ${error.message}`,
      {
        details: context ? [`発生箇所: ${context}`, `エラー詳細: ${error.name}`] : [`エラー詳細: ${error.name}`],
        solution: 'マイクの設定を確認し、ブラウザにマイクアクセスを許可してください。',
        priority: 'high'
      }
    );
  }

  /**
   * Show audio context error
   */
  showAudioContextError(error: Error): string {
    return this.showError(
      'オーディオシステムエラー',
      `音声処理システムの初期化に失敗しました: ${error.message}`,
      {
        details: [
          'ブラウザがWeb Audio APIに対応していない可能性があります',
          'または、音声デバイスに問題が発生しています'
        ],
        solution: 'ブラウザを最新版に更新するか、別のブラウザで試してください。',
        priority: 'high'
      }
    );
  }

  /**
   * Show network/loading error
   */
  showLoadingError(resource: string, error: Error): string {
    return this.showError(
      '読み込みエラー',
      `${resource}の読み込みに失敗しました: ${error.message}`,
      {
        details: [
          'ネットワーク接続を確認してください',
          'ブラウザのキャッシュをクリアしてみてください'
        ],
        solution: 'ページを再読み込みするか、しばらく待ってから再度お試しください。',
        priority: 'medium'
      }
    );
  }

  /**
   * Get current notification count
   */
  getNotificationCount(): number {
    return this.notifications.size;
  }

  /**
   * Get all notification IDs
   */
  getNotificationIds(): string[] {
    return Array.from(this.notifications.keys());
  }

  /**
   * Check if a specific notification exists
   */
  hasNotification(id: string): boolean {
    return this.notifications.has(id);
  }

  /**
   * Update configuration
   */
  updateConfig(config: {
    defaultDuration?: number;
    maxNotifications?: number;
  }): void {
    if (config.defaultDuration !== undefined) {
      this.defaultDuration = config.defaultDuration;
    }
    if (config.maxNotifications !== undefined) {
      this.maxNotifications = config.maxNotifications;
    }
    
    console.log('🔧 [ErrorNotificationSystem] Configuration updated:', config);
  }

  /**
   * Destroy the notification system
   */
  destroy(): void {
    console.log('🗑️ [ErrorNotificationSystem] Destroying notification system');
    
    this.clearAll();
    
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
    
    // Remove injected CSS
    const styleElement = document.querySelector('#pitchpro-notifications-styles');
    if (styleElement && styleElement.parentNode) {
      styleElement.parentNode.removeChild(styleElement);
    }
    
    this.container = null;
    this.notifications.clear();
    
    console.log('✅ [ErrorNotificationSystem] Cleanup complete');
  }
}