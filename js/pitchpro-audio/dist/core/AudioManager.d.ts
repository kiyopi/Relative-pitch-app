/**
 * AudioManager - Framework-agnostic Global Audio Resource Management System
 *
 * @description Provides centralized management of Web Audio API resources with automatic
 * device optimization, reference counting, and health monitoring. Solves common issues
 * with AudioContext sharing and MediaStream lifecycle management.
 *
 * @example
 * ```typescript
 * const audioManager = new AudioManager({
 *   sampleRate: 44100,
 *   echoCancellation: false,
 *   autoGainControl: false
 * });
 *
 * const resources = await audioManager.initialize();
 * const analyser = audioManager.createAnalyser('pitch-detection');
 * ```
 *
 * @version 1.1.3
 * @since 1.0.0
 */
import type { AudioManagerConfig, MediaStreamResources, HealthStatus, DeviceSpecs } from '../types';
export declare class AudioManager {
    /** @private Global AudioContext instance shared across the application */
    private audioContext;
    /** @private MediaStream from user's microphone */
    private mediaStream;
    /** @private Source node for audio processing pipeline */
    private sourceNode;
    /** @private Gain node for microphone sensitivity adjustment */
    private gainNode;
    /** @private Map of analyser nodes by identifier for reuse */
    private analysers;
    /** @private Map of filter chains for noise reduction */
    private filters;
    /** @private Reference count for safe resource sharing */
    private refCount;
    /** @private Promise to prevent duplicate initialization */
    private initPromise;
    /** @private Initialization state flag */
    private isInitialized;
    /** @private Last error encountered during operations */
    private lastError;
    /** @private Current microphone sensitivity multiplier */
    private currentSensitivity;
    /** @private Interval ID for gain monitoring (hotfix v1.1.3) */
    private gainMonitorInterval;
    /** @private AudioManager configuration */
    private config;
    /**
     * Creates a new AudioManager instance with device-optimized configuration
     *
     * @param config - Optional configuration to override defaults
     * @param config.sampleRate - Audio sample rate in Hz (default: 44100)
     * @param config.channelCount - Number of audio channels (default: 1)
     * @param config.echoCancellation - Enable echo cancellation (default: false)
     * @param config.noiseSuppression - Enable noise suppression (default: false)
     * @param config.autoGainControl - Enable auto gain control (default: false)
     * @param config.latency - Target latency in seconds (default: 0.1)
     *
     * @example
     * ```typescript
     * // Basic usage with defaults
     * const audioManager = new AudioManager();
     *
     * // Custom configuration
     * const audioManager = new AudioManager({
     *   sampleRate: 48000,
     *   echoCancellation: true,
     *   latency: 0.05
     * });
     * ```
     */
    constructor(config?: AudioManagerConfig);
    /**
     * Gets device-specific default sensitivity multiplier
     *
     * @private
     * @returns Device-optimized sensitivity value (PC: 1.0x, iPhone: 3.0x, iPad: 7.0x)
     */
    private _getDefaultSensitivity;
    /**
     * Initializes audio resources including AudioContext and MediaStream
     *
     * @description Safe to call multiple times - uses reference counting and health checks.
     * Automatically handles browser-specific quirks and device optimization.
     *
     * @returns Promise resolving to audio resources
     * @throws {Error} If microphone permission is denied or AudioContext creation fails
     *
     * @example
     * ```typescript
     * try {
     *   const { audioContext, mediaStream, sourceNode } = await audioManager.initialize();
     *   console.log('Audio initialized:', audioContext.state);
     * } catch (error) {
     *   console.error('Failed to initialize audio:', error.message);
     * }
     * ```
     */
    initialize(): Promise<MediaStreamResources>;
    /**
     * Performs the actual initialization process
     *
     * @private
     * @returns Promise resolving to initialized audio resources
     * @throws {Error} If any step of initialization fails
     */
    private _doInitialize;
    /**
     * Create dedicated AnalyserNode
     * @param id - Analyser identifier
     * @param options - Option settings
     */
    createAnalyser(id: string, options?: {
        fftSize?: number;
        smoothingTimeConstant?: number;
        minDecibels?: number;
        maxDecibels?: number;
        useFilters?: boolean;
    }): AnalyserNode;
    /**
     * Create 3-stage noise reduction filter chain
     */
    private _createFilterChain;
    /**
     * Removes a specific analyser and its associated filter chain
     *
     * @param id - Unique identifier for the analyser to remove
     *
     * @example
     * ```typescript
     * audioManager.removeAnalyser('pitch-detection');
     * ```
     */
    removeAnalyser(id: string): void;
    /**
     * Adjusts microphone sensitivity with automatic gain monitoring
     *
     * @param sensitivity - Sensitivity multiplier (0.1 ~ 10.0)
     * - 0.1-1.0: Reduced sensitivity for loud environments
     * - 1.0: Standard sensitivity (PC default)
     * - 3.0: iPhone optimized sensitivity
     * - 7.0: iPad optimized sensitivity
     * - 10.0: Maximum sensitivity for quiet environments
     *
     * @example
     * ```typescript
     * // Set sensitivity for iPad
     * audioManager.setSensitivity(7.0);
     *
     * // Reduce for loud environment
     * audioManager.setSensitivity(0.5);
     * ```
     */
    setSensitivity(sensitivity: number): void;
    /**
     * Get current microphone sensitivity
     */
    getSensitivity(): number;
    /**
     * HOTFIX: Start gain monitoring to prevent level drops
     */
    private startGainMonitoring;
    /**
     * HOTFIX: Stop gain monitoring
     */
    private stopGainMonitoring;
    /**
     * Get platform-specific settings according to specification
     * Complies with MICROPHONE_PLATFORM_SPECIFICATIONS.md
     */
    getPlatformSpecs(): DeviceSpecs;
    /**
     * Decrement reference count and cleanup
     */
    release(analyserIds?: string[]): void;
    /**
     * Force cleanup (for emergency use)
     */
    forceCleanup(): void;
    /**
     * Internal cleanup process
     */
    private _cleanup;
    /**
     * Creates structured error with enhanced context information
     *
     * @private
     * @param error - Original error
     * @param operation - Operation that failed
     * @returns Structured PitchProError with context
     */
    private _createStructuredError;
    /**
     * Gets current AudioManager status for debugging and monitoring
     *
     * @returns Status object containing initialization state, reference count, and resource states
     *
     * @example
     * ```typescript
     * const status = audioManager.getStatus();
     * console.log('AudioManager Status:', status);
     * console.log('Active analysers:', status.activeAnalysers);
     * ```
     */
    getStatus(): {
        isInitialized: boolean;
        refCount: number;
        audioContextState: string;
        mediaStreamActive: boolean;
        activeAnalysers: string[];
        activeFilters: string[];
        lastError: Error | null;
        currentSensitivity: number;
    };
    /**
     * Performs comprehensive health check on MediaStream and tracks
     *
     * @returns Health status object with detailed track information
     *
     * @example
     * ```typescript
     * const health = audioManager.checkMediaStreamHealth();
     * if (!health.healthy) {
     *   console.warn('MediaStream health issue detected:', health);
     *   // Perform recovery actions
     * }
     * ```
     */
    checkMediaStreamHealth(): HealthStatus;
}
//# sourceMappingURL=AudioManager.d.ts.map