/**
 * ErrorNotificationSystem - Framework-agnostic Error Display and Notification
 *
 * Provides error messaging functionality that can be displayed on any page
 * Includes different notification types, auto-hide functionality, and priority management
 * Framework-agnostic implementation using vanilla DOM manipulation
 */
import type { NotificationConfig } from '../types';
export declare class ErrorNotificationSystem {
    private container;
    private notifications;
    private notificationCounter;
    private defaultDuration;
    private maxNotifications;
    private cssClasses;
    constructor();
    /**
     * Create and inject the notification container into the DOM
     */
    private initializeContainer;
    /**
     * Inject default CSS styles
     */
    private injectCSS;
    /**
     * Show a notification
     */
    show(config: NotificationConfig): string;
    /**
     * Create notification DOM element
     */
    private createNotificationElement;
    /**
     * Remove a specific notification
     */
    remove(id: string): void;
    /**
     * Clear all notifications
     */
    clearAll(): void;
    /**
     * Show error notification (convenience method)
     */
    showError(title: string, message: string, options?: Partial<NotificationConfig>): string;
    /**
     * Show warning notification (convenience method)
     */
    showWarning(title: string, message: string, options?: Partial<NotificationConfig>): string;
    /**
     * Show success notification (convenience method)
     */
    showSuccess(title: string, message: string, options?: Partial<NotificationConfig>): string;
    /**
     * Show info notification (convenience method)
     */
    showInfo(title: string, message: string, options?: Partial<NotificationConfig>): string;
    /**
     * Show microphone error with common solutions
     */
    showMicrophoneError(error: Error, context?: string): string;
    /**
     * Show audio context error
     */
    showAudioContextError(error: Error): string;
    /**
     * Show network/loading error
     */
    showLoadingError(resource: string, error: Error): string;
    /**
     * Get current notification count
     */
    getNotificationCount(): number;
    /**
     * Get all notification IDs
     */
    getNotificationIds(): string[];
    /**
     * Check if a specific notification exists
     */
    hasNotification(id: string): boolean;
    /**
     * Update configuration
     */
    updateConfig(config: {
        defaultDuration?: number;
        maxNotifications?: number;
    }): void;
    /**
     * Destroy the notification system
     */
    destroy(): void;
}
//# sourceMappingURL=ErrorNotificationSystem.d.ts.map