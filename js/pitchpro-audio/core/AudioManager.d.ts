/**
 * AudioManager - Framework-agnostic Global Audio Resource Management System
 *
 * Purpose: Solve multiple AudioContext issues
 * - Share single AudioContext across entire application
 * - Reuse single MediaStream across all components
 * - Safe resource management and cleanup
 */
import type { AudioManagerConfig, MediaStreamResources, HealthStatus, DeviceSpecs } from '../types';
export declare class AudioManager {
    private audioContext;
    private mediaStream;
    private sourceNode;
    private gainNode;
    private analysers;
    private filters;
    private refCount;
    private initPromise;
    private isInitialized;
    private lastError;
    private currentSensitivity;
    private config;
    constructor(config?: AudioManagerConfig);
    /**
     * Get device-dependent default sensitivity
     */
    private _getDefaultSensitivity;
    /**
     * Initialize audio resources
     * Safe to call multiple times (singleton-like behavior)
     */
    initialize(): Promise<MediaStreamResources>;
    /**
     * Actual initialization process
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
     * Remove specific analyser
     */
    removeAnalyser(id: string): void;
    /**
     * Adjust microphone sensitivity
     * @param sensitivity - Sensitivity multiplier (0.1 ~ 10.0)
     */
    setSensitivity(sensitivity: number): void;
    /**
     * Get current microphone sensitivity
     */
    getSensitivity(): number;
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
     * Get current status (for debugging)
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
     * MediaStream health status check
     */
    checkMediaStreamHealth(): HealthStatus;
}
//# sourceMappingURL=AudioManager.d.ts.map