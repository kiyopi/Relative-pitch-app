/**
 * MicrophoneLifecycleManager - Page transition and idle detection microphone control
 * 
 * Manages microphone lifecycle across page transitions, idle periods, and redirects
 * Implements reference counting for safe resource management
 * Handles SSR compatibility and automatic recovery
 */

import type { 
  MediaStreamResources, 
  HealthStatus,
  LifecycleEvents,
  StateChangeCallback,
  ErrorCallback
} from '../types';
import { AudioManager } from './AudioManager';
import { Logger, LogLevel } from '../utils/Logger';
import { MicrophoneHealthError } from '../utils/errors';

export interface LifecycleManagerConfig {
  healthCheckIntervalMs?: number;
  idleTimeoutMs?: number;
  autoRecoveryDelayMs?: number;
  maxIdleTimeBeforeRelease?: number;
  maxAutoRecoveryAttempts?: number;
  logLevel?: LogLevel;
  enableDetailedLogging?: boolean;
}

export class MicrophoneLifecycleManager {
  private audioManager: AudioManager;
  private refCount = 0;
  private isActive = false;
  private lastHealthCheck: HealthStatus | null = null;
  private logger: Logger;
  
  // Monitoring intervals
  private healthCheckInterval: number | null = null;
  private idleCheckInterval: number | null = null;
  private visibilityCheckInterval: number | null = null;
  
  // State tracking
  private lastActivityTime = Date.now();
  private isPageVisible = true;
  private isUserActive = true;
  private autoRecoveryAttempts = 0;
  
  // Event listeners storage for cleanup
  private eventListeners = new Map<string, { target: EventTarget; listener: EventListener; eventName: string }>();
  
  // Configuration
  private config: Required<LifecycleManagerConfig>;
  
  // Callbacks
  private callbacks: {
    onStateChange?: StateChangeCallback;
    onError?: ErrorCallback;
  } = {};

  constructor(audioManager: AudioManager, userConfig: LifecycleManagerConfig = {}) {
    this.audioManager = audioManager;
    
    // Apply configuration with defaults
    this.config = {
      healthCheckIntervalMs: userConfig.healthCheckIntervalMs ?? 5000,     // 5 seconds
      idleTimeoutMs: userConfig.idleTimeoutMs ?? 300000,                   // 5 minutes
      autoRecoveryDelayMs: userConfig.autoRecoveryDelayMs ?? 2000,         // 2 seconds
      maxIdleTimeBeforeRelease: userConfig.maxIdleTimeBeforeRelease ?? 600000, // 10 minutes
      maxAutoRecoveryAttempts: userConfig.maxAutoRecoveryAttempts ?? 3,
      logLevel: userConfig.logLevel ?? LogLevel.INFO,
      enableDetailedLogging: userConfig.enableDetailedLogging ?? false
    };

    // Initialize logger
    this.logger = new Logger(
      this.config.logLevel,
      'MicrophoneLifecycleManager',
      {
        component: 'MicrophoneLifecycleManager',
        enableDetailedLogging: this.config.enableDetailedLogging
      }
    );
    
    // SSR compatibility check
    if (typeof window === 'undefined') {
      this.logger.info('SSR environment detected - skipping initialization');
      return;
    }
    
    this.logger.debug('Initializing MicrophoneLifecycleManager', {
      config: this.config
    });
    
    this.setupEventListeners();
  }

  /**
   * Set callback functions
   */
  setCallbacks(callbacks: {
    onStateChange?: StateChangeCallback;
    onError?: ErrorCallback;
  }): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  /**
   * Helper method to add event listener with automatic tracking for cleanup
   * Currently not used but available for future event listener management improvements
   */
  /* private addTrackedEventListener(
    target: EventTarget,
    eventName: string, 
    listener: EventListener,
    options?: AddEventListenerOptions
  ): void {
    const key = `${eventName}-${Date.now()}-${Math.random()}`;
    
    target.addEventListener(eventName, listener, options);
    this.eventListeners.set(key, { target, listener, eventName });
    
    this.logger.debug('Event listener added', {
      eventName,
      target: target.constructor.name,
      totalListeners: this.eventListeners.size
    });
  } */

  /**
   * Helper method to remove all tracked event listeners
   */
  private removeAllTrackedEventListeners(): void {
    this.logger.debug('Removing all tracked event listeners', {
      count: this.eventListeners.size
    });

    this.eventListeners.forEach(({ target, listener, eventName }, key) => {
      try {
        target.removeEventListener(eventName, listener);
      } catch (error) {
        this.logger.warn('Failed to remove event listener', {
          eventName,
          key,
          error: (error as Error).message
        });
      }
    });
    
    this.eventListeners.clear();
    this.logger.debug('All event listeners removed');
  }

  /**
   * Acquire microphone resources (with reference counting)
   */
  async acquire(): Promise<MediaStreamResources> {
    this.refCount++;
    
    console.log(`🎤 [MicrophoneLifecycleManager] Acquiring resources (refCount: ${this.refCount})`);
    
    try {
      // Initialize AudioManager if not already active
      if (!this.isActive) {
        const resources = await this.audioManager.initialize();
        this.isActive = true;
        this.lastActivityTime = Date.now();
        this.autoRecoveryAttempts = 0;
        
        // Start monitoring
        this.startHealthMonitoring();
        this.startIdleMonitoring();
        this.startVisibilityMonitoring();
        
        this.callbacks.onStateChange?.('active');
        
        console.log('🟢 [MicrophoneLifecycleManager] Microphone activated');
        return resources;
      }
      
      // Already active - just update activity and return existing resources
      this.updateActivity();
      const resources = await this.audioManager.initialize();
      return resources;
      
    } catch (error) {
      console.error('❌ [MicrophoneLifecycleManager] Failed to acquire resources:', error);
      this.refCount = Math.max(0, this.refCount - 1);
      this.callbacks.onError?.(error as Error);
      throw error;
    }
  }

  /**
   * Release microphone resources (with reference counting)
   */
  release(): void {
    this.refCount = Math.max(0, this.refCount - 1);
    
    console.log(`📉 [MicrophoneLifecycleManager] Releasing resources (refCount: ${this.refCount})`);
    
    // Only stop monitoring and cleanup when no references remain
    if (this.refCount <= 0) {
      this.stopAllMonitoring();
      this.audioManager.release();
      this.isActive = false;
      
      this.callbacks.onStateChange?.('inactive');
      
      console.log('🔴 [MicrophoneLifecycleManager] Microphone deactivated');
    }
  }

  /**
   * Force release all resources (emergency cleanup)
   */
  forceRelease(): void {
    console.log('🚨 [MicrophoneLifecycleManager] Force release - cleaning up all resources');
    
    this.refCount = 0;
    this.stopAllMonitoring();
    this.audioManager.forceCleanup();
    this.isActive = false;
    
    this.callbacks.onStateChange?.('inactive');
  }

  /**
   * Setup page lifecycle event listeners
   */
  private setupEventListeners(): void {
    // Page visibility change
    const visibilityChangeHandler = () => {
      this.isPageVisible = !document.hidden;
      this.handleVisibilityChange();
    };
    
    // User activity tracking
    const activityHandler = () => {
      this.updateActivity();
    };
    
    // Page unload / beforeunload
    const unloadHandler = () => {
      this.forceRelease();
    };
    
    // Page focus / blur
    const focusHandler = () => {
      this.isPageVisible = true;
      this.handleVisibilityChange();
    };
    
    const blurHandler = () => {
      this.isPageVisible = false;
      this.handleVisibilityChange();
    };
    
    // Add event listeners
    document.addEventListener('visibilitychange', visibilityChangeHandler);
    document.addEventListener('mousemove', activityHandler);
    document.addEventListener('keydown', activityHandler);
    document.addEventListener('click', activityHandler);
    document.addEventListener('scroll', activityHandler);
    document.addEventListener('touchstart', activityHandler);
    window.addEventListener('beforeunload', unloadHandler);
    window.addEventListener('unload', unloadHandler);
    window.addEventListener('focus', focusHandler);
    window.addEventListener('blur', blurHandler);
    
    // Store references for cleanup
    this.eventListeners.set('visibilitychange', { target: document, listener: visibilityChangeHandler, eventName: 'visibilitychange' });
    this.eventListeners.set('mousemove', { target: document, listener: activityHandler, eventName: 'mousemove' });
    this.eventListeners.set('keydown', { target: document, listener: activityHandler, eventName: 'keydown' });
    this.eventListeners.set('click', { target: document, listener: activityHandler, eventName: 'click' });
    this.eventListeners.set('scroll', { target: document, listener: activityHandler, eventName: 'scroll' });
    this.eventListeners.set('touchstart', { target: document, listener: activityHandler, eventName: 'touchstart' });
    this.eventListeners.set('beforeunload', { target: window, listener: unloadHandler, eventName: 'beforeunload' });
    this.eventListeners.set('unload', { target: window, listener: unloadHandler, eventName: 'unload' });
    this.eventListeners.set('focus', { target: window, listener: focusHandler, eventName: 'focus' });
    this.eventListeners.set('blur', { target: window, listener: blurHandler, eventName: 'blur' });
    
    console.log('👂 [MicrophoneLifecycleManager] Event listeners setup complete');
  }

  /**
   * Handle page visibility changes
   */
  private handleVisibilityChange(): void {
    if (!this.isActive) return;
    
    if (this.isPageVisible) {
      console.log('👁️ [MicrophoneLifecycleManager] Page became visible - resuming monitoring');
      this.updateActivity();
      
      // Check microphone health after page becomes visible
      setTimeout(() => {
        this.performHealthCheck();
      }, 1000);
      
    } else {
      console.log('🙈 [MicrophoneLifecycleManager] Page became hidden - reducing monitoring frequency');
      
      // Consider releasing resources if page stays hidden for too long
      setTimeout(() => {
        if (!this.isPageVisible && this.isActive) {
          const timeSinceActivity = Date.now() - this.lastActivityTime;
          if (timeSinceActivity > this.config.maxIdleTimeBeforeRelease) {
            console.log('⏰ [MicrophoneLifecycleManager] Long inactivity detected - releasing resources');
            this.forceRelease();
          }
        }
      }, this.config.maxIdleTimeBeforeRelease);
    }
  }

  /**
   * Update user activity timestamp
   */
  private updateActivity(): void {
    this.lastActivityTime = Date.now();
    this.isUserActive = true;
  }

  /**
   * Start health monitoring
   */
  private startHealthMonitoring(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    
    this.healthCheckInterval = window.setInterval(() => {
      this.performHealthCheck();
    }, this.config.healthCheckIntervalMs);
    
    console.log(`💓 [MicrophoneLifecycleManager] Health monitoring started (${this.config.healthCheckIntervalMs}ms interval)`);
  }

  /**
   * Start idle monitoring
   */
  private startIdleMonitoring(): void {
    if (this.idleCheckInterval) {
      clearInterval(this.idleCheckInterval);
    }
    
    this.idleCheckInterval = window.setInterval(() => {
      this.checkIdleTimeout();
    }, 30000); // Check every 30 seconds
    
    console.log('😴 [MicrophoneLifecycleManager] Idle monitoring started');
  }

  /**
   * Start visibility monitoring
   */
  private startVisibilityMonitoring(): void {
    if (this.visibilityCheckInterval) {
      clearInterval(this.visibilityCheckInterval);
    }
    
    this.visibilityCheckInterval = window.setInterval(() => {
      // Additional visibility-based health checks
      if (this.isPageVisible && this.isActive) {
        this.performHealthCheck();
      }
    }, 10000); // Check every 10 seconds when visible
    
    console.log('👁️ [MicrophoneLifecycleManager] Visibility monitoring started');
  }

  /**
   * Perform comprehensive health check
   */
  private async performHealthCheck(): Promise<void> {
    if (!this.isActive) return;
    
    try {
      const healthStatus = this.audioManager.checkMediaStreamHealth();
      this.lastHealthCheck = healthStatus;
      
      if (!healthStatus.healthy) {
        this.logger.warn('Unhealthy microphone state detected', { healthStatus });
        
        // Attempt automatic recovery
        if (this.autoRecoveryAttempts < this.config.maxAutoRecoveryAttempts) {
          this.autoRecoveryAttempts++;
          
          this.logger.warn('Attempting automatic recovery', {
            attempt: this.autoRecoveryAttempts,
            maxAttempts: this.config.maxAutoRecoveryAttempts,
            healthStatus
          });
          
          setTimeout(async () => {
            try {
              await this.audioManager.initialize(); // This will trigger re-initialization if needed
              this.logger.info('Automatic recovery successful', {
                attempt: this.autoRecoveryAttempts,
                totalAttempts: this.autoRecoveryAttempts
              });
              
              // Reset recovery attempts on success
              this.autoRecoveryAttempts = 0;
              
              // Dispatch success event
              this.dispatchCustomEvent('pitchpro:lifecycle:autoRecoverySuccess', {});
              
            } catch (error) {
              this.logger.error('Automatic recovery failed', error as Error, {
                attempt: this.autoRecoveryAttempts,
                maxAttempts: this.config.maxAutoRecoveryAttempts
              });
              this.callbacks.onError?.(error as Error);
              
              // Dispatch failure event
              this.dispatchCustomEvent('pitchpro:lifecycle:autoRecoveryFailed', { error });
            }
          }, this.config.autoRecoveryDelayMs);
          
        } else {
          // Create detailed error with health status context
          const healthError = new MicrophoneHealthError(
            `Microphone health check failed after ${this.autoRecoveryAttempts} recovery attempts. Monitoring stopped to prevent infinite error loop.`,
            healthStatus,
            this.autoRecoveryAttempts,
            {
              operation: 'performHealthCheck',
              maxAttemptsReached: true,
              monitoringStopped: true
            }
          );

          this.logger.error('Maximum recovery attempts reached - stopping health checks', healthError, {
            attempts: this.autoRecoveryAttempts,
            maxAttempts: this.config.maxAutoRecoveryAttempts,
            healthStatus
          });
          
          // Stop all monitoring to prevent infinite error loop
          // Reason: After maxAutoRecoveryAttempts, we assume the microphone is permanently unavailable
          // and continued monitoring would only generate more errors without resolution
          this.stopAllMonitoring();
          
          // Mark as inactive to prevent further health checks
          // This ensures that the lifecycle manager stops consuming resources
          this.isActive = false;
          
          this.callbacks.onError?.(healthError);
          
          // Dispatch final error event for external monitoring
          this.dispatchCustomEvent('pitchpro:lifecycle:maxRecoveryAttemptsReached', { 
            attempts: this.autoRecoveryAttempts,
            lastHealthStatus: healthStatus 
          });
        }
      } else {
        // Reset recovery attempts on healthy status
        if (this.autoRecoveryAttempts > 0) {
          this.logger.info('Microphone health restored, resetting recovery attempts', {
            previousAttempts: this.autoRecoveryAttempts,
            healthStatus
          });
          this.autoRecoveryAttempts = 0;
        }
      }
      
    } catch (error) {
      this.logger.error('Health check failed', error as Error, {
        operation: 'performHealthCheck',
        isActive: this.isActive,
        attempts: this.autoRecoveryAttempts
      });
      this.callbacks.onError?.(error as Error);
    }
  }

  /**
   * Check for idle timeout
   */
  private checkIdleTimeout(): void {
    if (!this.isActive) return;
    
    const timeSinceActivity = Date.now() - this.lastActivityTime;
    const isIdle = timeSinceActivity > this.config.idleTimeoutMs;
    
    if (isIdle && this.isUserActive) {
      console.log('😴 [MicrophoneLifecycleManager] User idle detected');
      this.isUserActive = false;
      
      // Optionally reduce monitoring frequency during idle
      // But don't automatically release - let the application decide
    }
    
    // Check for extreme idle (auto-release)
    if (timeSinceActivity > this.config.maxIdleTimeBeforeRelease) {
      console.log('⏰ [MicrophoneLifecycleManager] Extreme idle detected - auto-releasing resources');
      this.forceRelease();
    }
  }

  /**
   * Stop all monitoring intervals
   */
  private stopAllMonitoring(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
    
    if (this.idleCheckInterval) {
      clearInterval(this.idleCheckInterval);
      this.idleCheckInterval = null;
    }
    
    if (this.visibilityCheckInterval) {
      clearInterval(this.visibilityCheckInterval);
      this.visibilityCheckInterval = null;
    }
    
    console.log('⏹️ [MicrophoneLifecycleManager] All monitoring stopped');
  }

  /**
   * Dispatch custom event
   */
  private dispatchCustomEvent(eventName: keyof LifecycleEvents, detail: any): void {
    if (typeof window === 'undefined') return;
    
    const event = new CustomEvent(eventName, { detail });
    window.dispatchEvent(event);
  }

  /**
   * Get current status
   */
  getStatus() {
    return {
      refCount: this.refCount,
      isActive: this.isActive,
      isPageVisible: this.isPageVisible,
      isUserActive: this.isUserActive,
      lastActivityTime: this.lastActivityTime,
      timeSinceActivity: Date.now() - this.lastActivityTime,
      autoRecoveryAttempts: this.autoRecoveryAttempts,
      lastHealthCheck: this.lastHealthCheck,
      audioManagerStatus: this.audioManager.getStatus()
    };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<typeof this.config>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Restart monitoring with new intervals if active
    if (this.isActive) {
      this.stopAllMonitoring();
      this.startHealthMonitoring();
      this.startIdleMonitoring();
      this.startVisibilityMonitoring();
    }
    
    console.log('🔧 [MicrophoneLifecycleManager] Configuration updated:', newConfig);
  }

  /**
   * Reset recovery attempts and restart monitoring if needed
   * This method provides manual intervention capability for max recovery attempts errors
   */
  resetRecoveryAttempts(): void {
    const previousAttempts = this.autoRecoveryAttempts;
    this.autoRecoveryAttempts = 0;
    
    this.logger.info('Recovery attempts reset manually', {
      previousAttempts,
      refCount: this.refCount,
      wasActive: this.isActive,
      hasMonitoring: !!this.healthCheckInterval
    });
    
    // If monitoring was stopped due to max attempts, restart it
    // This only happens when refCount > 0 (someone still needs the microphone)
    if (!this.healthCheckInterval && this.refCount > 0) {
      this.logger.info('Restarting monitoring after manual reset', {
        refCount: this.refCount,
        reason: 'Manual recovery reset with active references'
      });
      
      this.isActive = true;
      this.startHealthMonitoring();
      this.startIdleMonitoring();
      this.startVisibilityMonitoring();
      
      // Dispatch event to notify listeners of monitoring restart
      this.dispatchCustomEvent('pitchpro:lifecycle:monitoringRestarted', {
        reason: 'Manual recovery reset',
        refCount: this.refCount
      });
    }
  }

  /**
   * Cleanup and destroy
   */
  destroy(): void {
    this.logger.info('Destroying MicrophoneLifecycleManager', {
      refCount: this.refCount,
      isActive: this.isActive,
      autoRecoveryAttempts: this.autoRecoveryAttempts,
      listenerCount: this.eventListeners.size
    });
    
    // Stop all monitoring
    this.stopAllMonitoring();
    
    // Force release resources
    // This ensures all microphone streams are properly closed
    this.forceRelease();
    
    // Remove all tracked event listeners using the helper method
    this.removeAllTrackedEventListeners();
    
    // Reset state
    this.isActive = false;
    this.refCount = 0;
    this.autoRecoveryAttempts = 0;
    
    this.logger.info('MicrophoneLifecycleManager cleanup complete');
  }
}