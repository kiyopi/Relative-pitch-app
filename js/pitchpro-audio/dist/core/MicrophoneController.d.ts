/**
 * MicrophoneController - High-level Unified Microphone Management Interface
 *
 * @description Provides a comprehensive, easy-to-use API that combines AudioManager,
 * MicrophoneLifecycleManager, and ErrorNotificationSystem into a single interface.
 * Handles device detection, permission management, sensitivity adjustment, and
 * automatic error recovery with user-friendly notifications.
 *
 * @example
 * ```typescript
 * const micController = new MicrophoneController();
 *
 * // Set up event callbacks
 * micController.setCallbacks({
 *   onStateChange: (state) => console.log('State:', state),
 *   onError: (error) => console.error('Error:', error.message),
 *   onDeviceChange: (specs) => console.log('Device:', specs.deviceType)
 * });
 *
 * // Initialize and start
 * const resources = await micController.initialize();
 * console.log('Microphone ready:', resources.mediaStream.active);
 * ```
 *
 * @version 1.1.3
 * @since 1.0.0
 */
import type { DeviceSpecs, MediaStreamResources, MicrophoneControllerEvents, ErrorCallback, StateChangeCallback } from '../types';
import { AudioManager } from './AudioManager';
export declare class MicrophoneController {
    /** @readonly AudioManager instance for low-level audio resource management */
    readonly audioManager: AudioManager;
    /** @private Lifecycle manager for safe resource handling */
    private lifecycleManager;
    /** @private Error notification system for user feedback */
    private errorSystem;
    /** @private Current controller state */
    private currentState;
    /** @private Microphone permission granted flag */
    private isPermissionGranted;
    /** @private Last error encountered during operations */
    private lastError;
    /** @private Event callback functions */
    private eventCallbacks;
    /** @private Device-specific optimization specifications */
    private deviceSpecs;
    /**
     * Creates a new MicrophoneController with integrated management systems
     *
     * @param audioManagerConfig - Configuration for AudioManager (optional)
     * @param audioManagerConfig.sampleRate - Audio sample rate (default: 44100)
     * @param audioManagerConfig.echoCancellation - Enable echo cancellation (default: false)
     * @param audioManagerConfig.autoGainControl - Enable auto gain control (default: false)
     * @param lifecycleConfig - Configuration for lifecycle management (optional)
     * @param lifecycleConfig.maxRetries - Maximum retry attempts (default: 3)
     * @param lifecycleConfig.retryDelayMs - Delay between retries (default: 1000)
     * @param showErrorNotifications - Enable visual error notifications (default: true)
     *
     * @example
     * ```typescript
     * // Basic usage with defaults
     * const micController = new MicrophoneController();
     *
     * // Custom configuration
     * const micController = new MicrophoneController(
     *   { sampleRate: 48000, echoCancellation: true },
     *   { maxRetries: 5, retryDelayMs: 2000 },
     *   false  // Disable error notifications
     * );
     * ```
     */
    constructor(audioManagerConfig?: {}, lifecycleConfig?: {}, showErrorNotifications?: boolean);
    /**
     * Sets callback functions for microphone controller events
     *
     * @param callbacks - Object containing event callback functions
     * @param callbacks.onStateChange - Called when controller state changes
     * @param callbacks.onError - Called when errors occur
     * @param callbacks.onPermissionChange - Called when microphone permission changes
     * @param callbacks.onSensitivityChange - Called when sensitivity is adjusted
     * @param callbacks.onDeviceChange - Called when device specifications are detected
     *
     * @example
     * ```typescript
     * micController.setCallbacks({
     *   onStateChange: (state) => {
     *     console.log('Controller state:', state);
     *   },
     *   onError: (error) => {
     *     console.error('Microphone error:', error.message);
     *   },
     *   onDeviceChange: (specs) => {
     *     console.log(`Device: ${specs.deviceType}, Sensitivity: ${specs.sensitivity}x`);
     *   }
     * });
     * ```
     */
    setCallbacks(callbacks: {
        onStateChange?: StateChangeCallback;
        onError?: ErrorCallback;
        onPermissionChange?: (granted: boolean) => void;
        onSensitivityChange?: (sensitivity: number) => void;
        onDeviceChange?: (specs: DeviceSpecs) => void;
    }): void;
    /**
     * Setup internal event handlers
     */
    private setupEventHandlers;
    /**
     * Detect device specifications
     */
    private detectDevice;
    /**
     * Initializes microphone access with automatic device detection and permissions
     *
     * @description Handles the complete initialization flow including device detection,
     * permission requests, resource acquisition, and error recovery. Automatically
     * applies device-specific optimizations and sets up monitoring systems.
     *
     * @returns Promise resolving to audio resources (AudioContext, MediaStream, SourceNode)
     * @throws {Error} If microphone permission is denied or initialization fails
     *
     * @example
     * ```typescript
     * try {
     *   const resources = await micController.initialize();
     *   console.log('Microphone ready:', resources.mediaStream.active);
     *   console.log('AudioContext state:', resources.audioContext.state);
     * } catch (error) {
     *   console.error('Failed to initialize microphone:', error.message);
     * }
     * ```
     */
    initialize(): Promise<MediaStreamResources>;
    /**
     * Request microphone permission (alias for initialize)
     */
    requestPermission(): Promise<boolean>;
    /**
     * Check if microphone permission is granted
     */
    checkPermissionStatus(): Promise<'granted' | 'denied' | 'prompt'>;
    /**
     * Stop microphone and release resources
     */
    stop(): void;
    /**
     * Forcefully stops microphone with complete resource cleanup
     *
     * @description Performs immediate and complete cleanup of all microphone resources,
     * resets permission state, and returns controller to uninitialized state.
     * Use when normal stop() is not sufficient or emergency cleanup is needed.
     *
     * @example
     * ```typescript
     * // Emergency cleanup
     * micController.forceStop();
     * console.log('All microphone resources cleaned up');
     * ```
     */
    forceStop(): void;
    /**
     * Sets microphone sensitivity with automatic validation and event notification
     *
     * @param sensitivity - Sensitivity multiplier (0.1 ~ 10.0)
     * - 0.1-1.0: Reduced sensitivity for loud environments
     * - 1.0: Standard PC sensitivity
     * - 3.0: iPhone optimized
     * - 7.0: iPad optimized
     * - 10.0: Maximum sensitivity for quiet environments
     *
     * @example
     * ```typescript
     * // Set device-optimized sensitivity
     * micController.setSensitivity(7.0);  // iPad optimization
     *
     * // Adjust for environment
     * micController.setSensitivity(0.5);  // Reduce for loud room
     * ```
     */
    setSensitivity(sensitivity: number): void;
    /**
     * Gets current microphone sensitivity multiplier
     *
     * @returns Current sensitivity value (0.1 ~ 10.0)
     *
     * @example
     * ```typescript
     * const currentSensitivity = micController.getSensitivity();
     * console.log(`Current sensitivity: ${currentSensitivity}x`);
     * ```
     */
    getSensitivity(): number;
    /**
     * Get device specifications
     */
    getDeviceSpecs(): DeviceSpecs | null;
    /**
     * Get current state
     */
    getState(): string;
    /**
     * Check if microphone is active
     */
    isActive(): boolean;
    /**
     * Check if microphone is ready (initialized but not active)
     */
    isReady(): boolean;
    /**
     * Check if permission is granted
     */
    hasPermission(): boolean;
    /**
     * Get comprehensive status
     */
    getStatus(): {
        state: "error" | "active" | "uninitialized" | "initializing" | "ready";
        isPermissionGranted: boolean;
        isActive: boolean;
        isReady: boolean;
        sensitivity: number;
        deviceSpecs: DeviceSpecs | null;
        lastError: Error | null;
        audioManagerStatus: {
            isInitialized: boolean;
            refCount: number;
            audioContextState: string;
            mediaStreamActive: boolean;
            activeAnalysers: string[];
            activeFilters: string[];
            lastError: Error | null;
            currentSensitivity: number;
        };
        lifecycleStatus: {
            refCount: number;
            isActive: boolean;
            isPageVisible: boolean;
            isUserActive: boolean;
            lastActivityTime: number;
            timeSinceActivity: number;
            autoRecoveryAttempts: number;
            lastHealthCheck: import("../types").HealthStatus | null;
            audioManagerStatus: {
                isInitialized: boolean;
                refCount: number;
                audioContextState: string;
                mediaStreamActive: boolean;
                activeAnalysers: string[];
                activeFilters: string[];
                lastError: Error | null;
                currentSensitivity: number;
            };
        };
    };
    /**
     * Perform health check
     */
    checkHealth(): import("../types").HealthStatus;
    /**
     * Test microphone functionality
     */
    testMicrophone(durationMs?: number): Promise<{
        success: boolean;
        volume: number;
        frequency: number | null;
        duration: number;
        error?: Error;
    }>;
    /**
     * Update internal state and notify
     */
    private updateState;
    /**
     * Handle errors with notification system
     */
    private handleError;
    /**
     * Dispatch custom DOM event
     */
    private dispatchCustomEvent;
    /**
     * Add event listener for microphone events
     */
    addEventListener<K extends keyof MicrophoneControllerEvents>(type: K, listener: (event: MicrophoneControllerEvents[K]) => void): void;
    /**
     * Remove event listener for microphone events
     */
    removeEventListener<K extends keyof MicrophoneControllerEvents>(type: K, listener: (event: MicrophoneControllerEvents[K]) => void): void;
    /**
     * Cleanup and destroy all resources
     */
    destroy(): void;
    /**
     * Creates structured error with enhanced context information
     *
     * @private
     * @param error - Original error
     * @param operation - Operation that failed
     * @returns Structured PitchProError with context
     */
    private _createStructuredError;
}
//# sourceMappingURL=MicrophoneController.d.ts.map