/**
 * PitchDetector - Framework-agnostic High-precision Pitch Detection Engine
 *
 * @description Provides real-time pitch detection using the McLeod Pitch Method (Pitchy library)
 * with advanced features including harmonic correction, adaptive frame rate control,
 * noise filtering, and device-specific optimization for consistent cross-platform performance.
 *
 * @example
 * ```typescript
 * const pitchDetector = new PitchDetector(audioManager, {
 *   fftSize: 4096,
 *   clarityThreshold: 0.4,
 *   minVolumeAbsolute: 0.003
 * });
 *
 * await pitchDetector.initialize();
 *
 * pitchDetector.setCallbacks({
 *   onPitchUpdate: (result) => {
 *     console.log(`Detected: ${result.note} (${result.frequency.toFixed(1)}Hz)`);
 *   }
 * });
 *
 * pitchDetector.startDetection();
 * ```
 *
 * @version 1.1.3
 * @since 1.0.0
 */
import type { PitchDetectorConfig, PitchDetectionResult, PitchCallback, ErrorCallback, StateChangeCallback, DeviceSpecs, SilenceDetectionConfig } from '../types';
import { AudioManager } from './AudioManager';
export declare class PitchDetector {
    /** @private AudioManager instance for resource management */
    private audioManager;
    /** @private Pitchy library detector instance for McLeod Pitch Method */
    private pitchDetector;
    /** @private AnalyserNode with noise filtering applied */
    private analyser;
    /** @private Raw AnalyserNode for unfiltered volume measurement */
    private rawAnalyser;
    /** @private RequestAnimationFrame ID for detection loop */
    private animationFrame;
    /** @private Adaptive frame rate controller for optimal performance */
    private frameRateLimiter;
    /** @private Current component state for lifecycle management */
    private componentState;
    /** @private Initialization completion flag */
    private isInitialized;
    /** @private Detection active flag */
    private isDetecting;
    /** @private Last error encountered during operations */
    private lastError;
    /** @private Array of analyser IDs for cleanup management */
    private analyserIds;
    /** @private Current processed volume level (0-100) */
    private currentVolume;
    /** @private Raw volume level before processing (0-100) */
    private rawVolume;
    /** @private Currently detected frequency in Hz */
    private currentFrequency;
    /** @private Detected musical note name */
    private detectedNote;
    /** @private Detected octave number */
    private detectedOctave;
    /** @private Pitch detection clarity/confidence (0-1) */
    private pitchClarity;
    /** @private Circular buffer for volume stabilization */
    private volumeHistory;
    /** @private Stabilized volume after filtering */
    private stableVolume;
    /** @private Previous frequency for harmonic correction */
    private previousFrequency;
    /** @private History buffer for harmonic analysis */
    private harmonicHistory;
    /** @private PitchDetector configuration with defaults applied */
    private config;
    /** @private Flag to disable harmonic correction */
    private disableHarmonicCorrection;
    /** @private Callback functions for events */
    private callbacks;
    /** @private Device-specific optimization parameters */
    private deviceSpecs;
    /** @private Silence detection configuration */
    private silenceDetectionConfig;
    /** @private Timestamp when silence started */
    private silenceStartTime;
    /** @private Timer ID for silence warning */
    private silenceWarningTimer;
    /** @private Timer ID for silence timeout */
    private silenceTimeoutTimer;
    /** @private Current silence state flag */
    private isSilent;
    /** @private Silence warning already issued flag */
    private hasWarned;
    /**
     * Creates a new PitchDetector instance with optimized configuration
     *
     * @param audioManager - AudioManager instance for resource management
     * @param config - Optional configuration to override defaults
     * @param config.fftSize - FFT size for frequency analysis (default: 4096)
     * @param config.smoothing - Smoothing factor for AnalyserNode (default: 0.1)
     * @param config.clarityThreshold - Minimum clarity for valid detection (default: 0.4)
     * @param config.minVolumeAbsolute - Minimum volume threshold (default: 0.003)
     * @param config.silenceDetection - Optional silence detection configuration
     *
     * @example
     * ```typescript
     * // Basic usage
     * const pitchDetector = new PitchDetector(audioManager);
     *
     * // Custom configuration
     * const pitchDetector = new PitchDetector(audioManager, {
     *   fftSize: 8192,
     *   clarityThreshold: 0.6,
     *   silenceDetection: {
     *     enabled: true,
     *     warningThreshold: 10000
     *   }
     * });
     * ```
     */
    constructor(audioManager: AudioManager, config?: PitchDetectorConfig);
    /**
     * Sets callback functions for pitch detection events
     *
     * @param callbacks - Object containing callback functions
     * @param callbacks.onPitchUpdate - Called when pitch is detected
     * @param callbacks.onError - Called when errors occur
     * @param callbacks.onStateChange - Called when component state changes
     *
     * @example
     * ```typescript
     * pitchDetector.setCallbacks({
     *   onPitchUpdate: (result) => {
     *     console.log(`Pitch: ${result.frequency}Hz, Note: ${result.note}`);
     *   },
     *   onError: (error) => {
     *     console.error('Detection error:', error.message);
     *   },
     *   onStateChange: (state) => {
     *     console.log('State changed to:', state);
     *   }
     * });
     * ```
     */
    setCallbacks(callbacks: {
        onPitchUpdate?: PitchCallback;
        onError?: ErrorCallback;
        onStateChange?: StateChangeCallback;
    }): void;
    /**
     * Initializes the pitch detector with audio resources and Pitchy engine
     *
     * @description Sets up audio analysers, creates Pitchy detector instance, and initializes
     * device-specific configurations. Must be called before starting detection.
     *
     * @returns Promise that resolves when initialization is complete
     * @throws {AudioContextError} If AudioManager initialization fails
     * @throws {PitchDetectionError} If Pitchy detector creation fails
     *
     * @example
     * ```typescript
     * try {
     *   await pitchDetector.initialize();
     *   console.log('Pitch detector ready');
     * } catch (error) {
     *   console.error('Initialization failed:', error);
     * }
     * ```
     */
    initialize(): Promise<void>;
    /**
     * Starts real-time pitch detection with adaptive frame rate control
     *
     * @description Begins the pitch detection loop using requestAnimationFrame.
     * Automatically manages performance optimization and device-specific adjustments.
     *
     * @returns True if detection started successfully, false otherwise
     *
     * @example
     * ```typescript
     * if (pitchDetector.startDetection()) {
     *   console.log('Pitch detection started');
     * } else {
     *   console.error('Failed to start detection');
     * }
     * ```
     */
    startDetection(): boolean;
    /**
     * Stops pitch detection and cleans up detection loop
     *
     * @description Cancels the detection loop, resets frame rate limiter,
     * and clears silence detection timers. Safe to call multiple times.
     *
     * @example
     * ```typescript
     * pitchDetector.stopDetection();
     * console.log('Pitch detection stopped');
     * ```
     */
    stopDetection(): void;
    /**
     * Real-time pitch detection loop with adaptive frame rate
     */
    private detectPitch;
    /**
     * Harmonic correction system
     */
    private correctHarmonic;
    /**
     * Reset harmonic correction history
     */
    private resetHarmonicHistory;
    /**
     * Convert frequency to note name and octave
     */
    private frequencyToNoteAndOctave;
    /**
     * Convert frequency to cents deviation from nearest note
     */
    private frequencyToCents;
    /**
     * Process silence detection logic
     */
    private processSilenceDetection;
    /**
     * Handle silence warning
     */
    private handleSilenceWarning;
    /**
     * Handle silence timeout
     */
    private handleSilenceTimeout;
    /**
     * Reset silence tracking state
     */
    private resetSilenceTracking;
    /**
     * Reset display state
     */
    resetDisplayState(): void;
    /**
     * Enable/disable harmonic correction
     */
    setHarmonicCorrectionEnabled(enabled: boolean): void;
    /**
     * Update silence detection configuration
     */
    setSilenceDetectionConfig(config: Partial<SilenceDetectionConfig>): void;
    /**
     * Get current silence detection status
     */
    getSilenceStatus(): {
        isEnabled: boolean;
        isSilent: boolean;
        silenceDuration: number | null;
        hasWarned: boolean;
    };
    /**
     * Get initialization status
     */
    getIsInitialized(): boolean;
    /**
     * Get current state
     */
    getState(): {
        componentState: "error" | "uninitialized" | "initializing" | "ready" | "detecting";
        isInitialized: boolean;
        isDetecting: boolean;
        lastError: Error | null;
        hasRequiredComponents: boolean;
    };
    /**
     * Get current detection result
     */
    getCurrentResult(): PitchDetectionResult;
    /**
     * Process audio data (high priority, runs at full speed)
     */
    private processAudioData;
    /**
     * Update visual elements (lower priority, can be throttled)
     */
    private updateVisuals;
    /**
     * Get current performance statistics
     */
    getPerformanceStats(): {
        currentFPS: number;
        frameDrops: number;
        latency: number;
    };
    /**
     * Reinitialize detector
     */
    reinitialize(): Promise<void>;
    /**
     * Cleanup resources
     */
    cleanup(): void;
    /**
     * Gets the latest pitch detection result without triggering new analysis
     *
     * @description Returns the most recent detection result from the ongoing analysis.
     * Useful for UI updates and external monitoring without affecting detection performance.
     *
     * @returns Latest pitch detection result or null if no detection is active
     *
     * @example
     * ```typescript
     * const result = pitchDetector.getLatestResult();
     * if (result) {
     *   console.log(`Latest: ${result.note} - ${result.frequency.toFixed(1)}Hz`);
     *   console.log(`Volume: ${result.volume.toFixed(1)}%, Clarity: ${result.clarity.toFixed(2)}`);
     * }
     * ```
     */
    getLatestResult(): PitchDetectionResult | null;
    /**
     * Destroys the PitchDetector and cleans up all resources
     *
     * @example
     * ```typescript
     * pitchDetector.destroy();
     * console.log('PitchDetector destroyed and resources cleaned up');
     * ```
     */
    destroy(): void;
    /**
     * Gets current PitchDetector status for debugging and monitoring
     *
     * @returns Status object with component state and performance metrics
     */
    getStatus(): {
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
            latency: number;
        };
        deviceSpecs: DeviceSpecs | null;
        hasRequiredComponents: boolean;
    };
}
//# sourceMappingURL=PitchDetector.d.ts.map