/**
 * CalibrationSystem - Device-specific audio calibration and optimization
 *
 * Automatically calibrates audio processing parameters based on device capabilities
 * Handles microphone sensitivity, noise characteristics, and frequency response
 */
import type { DeviceSpecs } from '../types';
export declare class CalibrationSystem {
    private deviceSpecs;
    private calibrationData;
    private isCalibrated;
    private calibrationInProgress;
    constructor();
    /**
     * Perform automatic calibration
     */
    calibrate(audioContext: AudioContext, mediaStream: MediaStream): Promise<{
        success: boolean;
        calibrationData: any;
        recommendedSettings: any;
        error?: Error;
    }>;
    /**
     * Measure background noise levels
     */
    private measureBackgroundNoise;
    /**
     * Calibrate volume levels
     */
    private calibrateVolumeLevels;
    /**
     * Measure frequency response (simplified version)
     */
    private measureFrequencyResponse;
    /**
     * Calculate optimal settings based on calibration data
     */
    private calculateOptimalSettings;
    /**
     * Get default settings for current device
     */
    private getDefaultSettings;
    /**
     * Apply calibrated settings to audio processing
     */
    applyCalibration(audioProcessor: any): boolean;
    /**
     * Get calibration status
     */
    getCalibrationStatus(): {
        isCalibrated: boolean;
        inProgress: boolean;
        deviceSpecs: DeviceSpecs;
        calibrationData: any;
    };
    /**
     * Reset calibration
     */
    reset(): void;
    /**
     * Save calibration data to localStorage
     */
    saveCalibration(): boolean;
    /**
     * Load calibration data from localStorage
     */
    loadCalibration(): boolean;
}
//# sourceMappingURL=CalibrationSystem.d.ts.map