/**
 * AudioDetectionComponent - Unified Audio Detection with Automatic UI Updates
 *
 * @description High-level integration component that combines PitchDetector functionality
 * with automatic UI updates, device optimization, and comprehensive error handling.
 * Designed to simplify audio detection integration in relative pitch training applications.
 *
 * @example
 * ```typescript
 * const audioDetector = new AudioDetectionComponent({
 *   volumeBarSelector: '#volume-bar',
 *   frequencySelector: '#frequency-display',
 *   clarityThreshold: 0.4,
 *   minVolumeAbsolute: 0.003
 * });
 *
 * await audioDetector.initialize();
 *
 * audioDetector.setCallbacks({
 *   onPitchUpdate: (result) => {
 *     console.log('音程検出:', result);
 *     // { frequency: 261.6, note: 'C4', volume: 45.2 }
 *   },
 *   onError: (error) => {
 *     console.error('検出エラー:', error);
 *   }
 * });
 *
 * audioDetector.startDetection();
 * ```
 *
 * @version 1.0.0
 * @since 1.0.0
 */
import { PitchProError } from '../utils/errors';
import type { PitchDetectionResult, DeviceSpecs } from '../types';
/**
 * Configuration interface for AudioDetectionComponent
 */
export interface AudioDetectionConfig {
    volumeBarSelector?: string;
    volumeTextSelector?: string;
    frequencySelector?: string;
    noteSelector?: string;
    clarityThreshold?: number;
    minVolumeAbsolute?: number;
    fftSize?: number;
    smoothing?: number;
    deviceOptimization?: boolean;
    uiUpdateInterval?: number;
    autoUpdateUI?: boolean;
    debug?: boolean;
    logPrefix?: string;
}
/**
 * Callback functions for AudioDetectionComponent events
 */
export interface AudioDetectionCallbacks {
    onPitchUpdate?: (result: PitchDetectionResult) => void;
    onVolumeUpdate?: (volume: number) => void;
    onStateChange?: (state: 'uninitialized' | 'initializing' | 'ready' | 'detecting' | 'stopped' | 'error') => void;
    onError?: (error: PitchProError) => void;
    onDeviceDetected?: (deviceSpecs: DeviceSpecs) => void;
}
/**
 * Device-specific optimization settings
 */
interface DeviceSettings {
    volumeMultiplier: number;
    sensitivityMultiplier: number;
    minVolumeAbsolute: number;
}
export declare class AudioDetectionComponent {
    /** @private Configuration with applied defaults */
    private config;
    /** @private AudioManager instance for resource management */
    private audioManager;
    /** @private PitchDetector instance for pitch detection */
    private pitchDetector;
    /** @private MicrophoneController for high-level microphone management */
    private micController;
    /** @private Current component state */
    private currentState;
    /** @private Event callbacks */
    private callbacks;
    /** @private Device specifications */
    private deviceSpecs;
    /** @private Device-specific settings */
    private deviceSettings;
    /** @private UI update interval ID */
    private uiUpdateTimer;
    /** @private UI elements cache */
    private uiElements;
    /** @private Last error encountered */
    private lastError;
    /** @private Initialization state */
    private isInitialized;
    /**
     * Creates a new AudioDetectionComponent with automatic device optimization
     *
     * @param config - Configuration options for the component
     * @param config.volumeBarSelector - CSS selector for volume bar element
     * @param config.volumeTextSelector - CSS selector for volume text element
     * @param config.frequencySelector - CSS selector for frequency display element
     * @param config.noteSelector - CSS selector for note display element
     * @param config.clarityThreshold - Minimum clarity for pitch detection (0-1, default: 0.4)
     * @param config.minVolumeAbsolute - Minimum volume threshold (default: 0.003)
     * @param config.fftSize - FFT size for analysis (default: 4096)
     * @param config.smoothing - Smoothing factor (default: 0.1)
     * @param config.deviceOptimization - Enable automatic device optimization (default: true)
     * @param config.uiUpdateInterval - UI update interval in ms (default: 50)
     * @param config.autoUpdateUI - Enable automatic UI updates (default: true)
     * @param config.debug - Enable debug logging (default: false)
     * @param config.logPrefix - Prefix for log messages (default: '🎵 AudioDetection')
     *
     * @example
     * ```typescript
     * // Basic usage with automatic device optimization
     * const audioDetector = new AudioDetectionComponent({
     *   volumeBarSelector: '#volume-bar',
     *   frequencySelector: '#frequency-display'
     * });
     *
     * // Advanced configuration for range testing
     * const audioDetector = new AudioDetectionComponent({
     *   volumeBarSelector: '#range-test-volume-bar',
     *   volumeTextSelector: '#range-test-volume-text',
     *   frequencySelector: '#range-test-frequency-value',
     *   clarityThreshold: 0.3,
     *   minVolumeAbsolute: 0.001,
     *   deviceOptimization: true,
     *   debug: true
     * });
     * ```
     */
    constructor(config?: AudioDetectionConfig);
    /**
     * Initializes the audio detection system with device optimization
     *
     * @description Performs complete initialization including microphone permissions,
     * audio context setup, device detection, and UI element binding.
     *
     * @returns Promise resolving when initialization is complete
     * @throws {AudioContextError} If audio system initialization fails
     * @throws {MicrophoneAccessError} If microphone permission is denied
     *
     * @example
     * ```typescript
     * try {
     *   await audioDetector.initialize();
     *   console.log('Audio detection ready!');
     * } catch (error) {
     *   console.error('Initialization failed:', error.message);
     *   // Handle specific error types
     *   if (error instanceof MicrophoneAccessError) {
     *     // Show permission guidance
     *   }
     * }
     * ```
     */
    initialize(): Promise<void>;
    /**
     * Sets callback functions for audio detection events
     *
     * @param callbacks - Object containing callback functions
     * @param callbacks.onPitchUpdate - Called when pitch is detected
     * @param callbacks.onVolumeUpdate - Called when volume changes
     * @param callbacks.onStateChange - Called when component state changes
     * @param callbacks.onError - Called when errors occur
     * @param callbacks.onDeviceDetected - Called when device is detected
     *
     * @example
     * ```typescript
     * audioDetector.setCallbacks({
     *   onPitchUpdate: (result) => {
     *     console.log(`${result.note} - ${result.frequency.toFixed(1)}Hz`);
     *   },
     *   onVolumeUpdate: (volume) => {
     *     console.log(`Volume: ${volume.toFixed(1)}%`);
     *   },
     *   onError: (error) => {
     *     console.error('Detection error:', error.message);
     *   }
     * });
     * ```
     */
    setCallbacks(callbacks: AudioDetectionCallbacks): void;
    /**
     * Starts pitch detection and automatic UI updates
     *
     * @returns True if detection started successfully, false otherwise
     * @throws {PitchProError} If component is not initialized or detection fails
     *
     * @example
     * ```typescript
     * if (audioDetector.startDetection()) {
     *   console.log('Detection started successfully');
     * } else {
     *   console.log('Failed to start detection');
     * }
     * ```
     */
    startDetection(): boolean;
    /**
     * Stops pitch detection and UI updates
     *
     * @example
     * ```typescript
     * audioDetector.stopDetection();
     * console.log('Detection stopped');
     * ```
     */
    stopDetection(): void;
    /**
     * Manually updates UI elements with current audio data
     *
     * @param result - Pitch detection result to display
     *
     * @example
     * ```typescript
     * const result = {
     *   frequency: 440,
     *   note: 'A4',
     *   volume: 75.5,
     *   clarity: 0.8
     * };
     * audioDetector.updateUI(result);
     * ```
     */
    updateUI(result: PitchDetectionResult): void;
    /**
     * Destroys the component and cleans up all resources
     *
     * @example
     * ```typescript
     * // Clean up when component is no longer needed
     * audioDetector.destroy();
     * ```
     */
    destroy(): void;
    /**
     * Gets current component status for debugging
     *
     * @returns Status object with current state information
     */
    getStatus(): {
        state: "error" | "uninitialized" | "initializing" | "ready" | "detecting" | "stopped";
        isInitialized: boolean;
        deviceSpecs: DeviceSpecs | null;
        deviceSettings: DeviceSettings | null;
        config: Required<AudioDetectionConfig>;
        lastError: PitchProError | null;
        pitchDetectorStatus: {
            componentState: "error" | "uninitialized" | "initializing" | "ready" | "detecting";
            isInitialized: boolean;
            isDetecting: boolean;
            isRunning: boolean;
            currentVolume: number;
            rawVolume: number;
            currentFrequency: number;
            detectedNote: string;
            detectedOctave: number | null;
            currentClarity: number;
            lastError: Error | null;
            frameRateStatus: {
                currentFPS: number;
                frameDrops: number;
                /**
                 * Device-specific optimization settings
                 */
                latency: number;
            };
            deviceSpecs: DeviceSpecs | null;
            hasRequiredComponents: boolean;
        } | undefined;
        micControllerStatus: {
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
        } | undefined;
    };
    /**
     * Detects device type and applies optimization settings
     * @private
     */
    private detectAndOptimizeDevice;
    /**
     * Caches UI elements for efficient updates
     * @private
     */
    private cacheUIElements;
    /**
     * Handles pitch update events from PitchDetector
     * @private
     */
    private handlePitchUpdate;
    /**
     * Starts UI update timer
     * @private
     */
    private startUIUpdates;
    /**
     * Stops UI update timer
     * @private
     */
    private stopUIUpdates;
    /**
     * Updates component state and notifies callbacks
     * @private
     */
    private updateState;
    /**
     * Handles errors with proper logging and callback notification
     * @private
     */
    private handleError;
    /**
     * Creates structured error with context information
     * @private
     */
    private createStructuredError;
    /**
     * Debug logging utility
     * @private
     */
    private debugLog;
}
export {};
//# sourceMappingURL=AudioDetectionComponent.d.ts.map