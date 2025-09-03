/**
 * PitchDetector - Framework-agnostic High-precision Pitch Detection
 *
 * Based on Pitchy library with McLeod Pitch Method
 * Includes harmonic correction, noise filtering, and device-specific optimization
 */
import type { PitchDetectorConfig, PitchDetectionResult, PitchCallback, ErrorCallback, StateChangeCallback } from '../types';
import { AudioManager } from './AudioManager';
export declare class PitchDetector {
    private audioManager;
    private pitchDetector;
    private analyser;
    private rawAnalyser;
    private animationFrame;
    private componentState;
    private isInitialized;
    private isDetecting;
    private lastError;
    private analyserIds;
    private currentVolume;
    private rawVolume;
    private currentFrequency;
    private detectedNote;
    private pitchClarity;
    private volumeHistory;
    private stableVolume;
    private previousFrequency;
    private harmonicHistory;
    private config;
    private disableHarmonicCorrection;
    private callbacks;
    private deviceSpecs;
    constructor(audioManager: AudioManager, config?: PitchDetectorConfig);
    /**
     * Set callback functions
     */
    setCallbacks(callbacks: {
        onPitchUpdate?: PitchCallback;
        onError?: ErrorCallback;
        onStateChange?: StateChangeCallback;
    }): void;
    /**
     * Initialize pitch detector with external AudioContext
     */
    initialize(): Promise<void>;
    /**
     * Start pitch detection
     */
    startDetection(): boolean;
    /**
     * Stop pitch detection
     */
    stopDetection(): void;
    /**
     * Real-time pitch detection loop
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
     * Convert frequency to note name
     */
    private frequencyToNote;
    /**
     * Convert frequency to cents deviation from nearest note
     */
    private frequencyToCents;
    /**
     * Reset display state
     */
    resetDisplayState(): void;
    /**
     * Enable/disable harmonic correction
     */
    setHarmonicCorrectionEnabled(enabled: boolean): void;
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
     * Reinitialize detector
     */
    reinitialize(): Promise<void>;
    /**
     * Cleanup resources
     */
    cleanup(): void;
}
//# sourceMappingURL=PitchDetector.d.ts.map