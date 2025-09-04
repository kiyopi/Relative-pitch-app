/**
 * MicrophoneController - High-level Microphone Management Interface
 *
 * Combines AudioManager, LifecycleManager, and ErrorNotificationSystem
 * Provides a simple, unified API for microphone control with error handling
 * Includes device detection, sensitivity management, and automatic recovery
 */
import type { DeviceSpecs, MediaStreamResources, MicrophoneControllerEvents, ErrorCallback, StateChangeCallback } from '../types';
export declare class MicrophoneController {
    private audioManager;
    private lifecycleManager;
    private errorSystem;
    private currentState;
    private isPermissionGranted;
    private lastError;
    private eventCallbacks;
    private deviceSpecs;
    constructor(audioManagerConfig?: {}, lifecycleConfig?: {}, showErrorNotifications?: boolean);
    /**
     * Set callback functions for events
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
     * Initialize microphone access and permissions
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
     * Force stop with complete cleanup
     */
    forceStop(): void;
    /**
     * Set microphone sensitivity
     */
    setSensitivity(sensitivity: number): void;
    /**
     * Get current microphone sensitivity
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
}
//# sourceMappingURL=MicrophoneController.d.ts.map