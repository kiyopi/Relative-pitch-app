/**
 * CalibrationSystem - Device-specific audio calibration and optimization
 * 
 * Automatically calibrates audio processing parameters based on device capabilities
 * Handles microphone sensitivity, noise characteristics, and frequency response
 */

import type { DeviceSpecs } from '../types';
import { DeviceDetection } from '../utils/DeviceDetection';

export class CalibrationSystem {
  private deviceSpecs: DeviceSpecs;
  private calibrationData: {
    volumeOffset: number;
    frequencyResponse: { [frequency: number]: number };
    noiseProfile: { [frequency: number]: number };
    optimalSettings: {
      sensitivity: number;
      noiseGate: number;
      filterSettings: any;
    };
  } | null = null;

  private isCalibrated = false;
  private calibrationInProgress = false;

  constructor() {
    this.deviceSpecs = DeviceDetection.getDeviceSpecs();
  }

  /**
   * Perform automatic calibration
   */
  async calibrate(audioContext: AudioContext, mediaStream: MediaStream): Promise<{
    success: boolean;
    calibrationData: any;
    recommendedSettings: any;
    error?: Error;
  }> {
    if (this.calibrationInProgress) {
      throw new Error('Calibration already in progress');
    }

    this.calibrationInProgress = true;

    try {
      console.log('🎛️ [CalibrationSystem] Starting device calibration');

      // Step 1: Measure background noise
      const noiseProfile = await this.measureBackgroundNoise(audioContext, mediaStream);

      // Step 2: Calibrate volume levels
      const volumeCalibration = await this.calibrateVolumeLevels(audioContext, mediaStream);

      // Step 3: Measure frequency response (simplified)
      const frequencyResponse = await this.measureFrequencyResponse(audioContext, mediaStream);

      // Step 4: Determine optimal settings
      const optimalSettings = this.calculateOptimalSettings(
        noiseProfile,
        volumeCalibration,
        frequencyResponse
      );

      this.calibrationData = {
        volumeOffset: volumeCalibration.offset,
        frequencyResponse,
        noiseProfile,
        optimalSettings
      };

      this.isCalibrated = true;
      this.calibrationInProgress = false;

      console.log('✅ [CalibrationSystem] Calibration completed successfully');

      return {
        success: true,
        calibrationData: this.calibrationData,
        recommendedSettings: optimalSettings
      };

    } catch (error) {
      console.error('❌ [CalibrationSystem] Calibration failed:', error);
      this.calibrationInProgress = false;
      
      return {
        success: false,
        calibrationData: null,
        recommendedSettings: this.getDefaultSettings(),
        error: error as Error
      };
    }
  }

  /**
   * Measure background noise levels
   */
  private async measureBackgroundNoise(
    audioContext: AudioContext,
    mediaStream: MediaStream,
    durationMs: number = 2000
  ): Promise<{ [frequency: number]: number }> {
    return new Promise((resolve) => {
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048;
      
      const source = audioContext.createMediaStreamSource(mediaStream);
      source.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Float32Array(bufferLength);
      const measurements: Float32Array[] = [];

      const startTime = Date.now();

      const measureNoise = () => {
        if (Date.now() - startTime >= durationMs) {
          // Calculate average noise profile
          const avgNoise: { [frequency: number]: number } = {};
          
          for (let bin = 0; bin < bufferLength; bin++) {
            const frequency = (bin * audioContext.sampleRate) / (analyser.fftSize);
            let sum = 0;
            
            for (const measurement of measurements) {
              sum += measurement[bin];
            }
            
            avgNoise[Math.round(frequency)] = sum / measurements.length;
          }

          source.disconnect();
          resolve(avgNoise);
          return;
        }

        analyser.getFloatFrequencyData(dataArray);
        measurements.push(new Float32Array(dataArray));
        
        setTimeout(measureNoise, 100);
      };

      measureNoise();
    });
  }

  /**
   * Calibrate volume levels
   */
  private async calibrateVolumeLevels(
    audioContext: AudioContext,
    mediaStream: MediaStream,
    durationMs: number = 3000
  ): Promise<{ offset: number; range: { min: number; max: number } }> {
    return new Promise((resolve) => {
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 1024;
      
      const source = audioContext.createMediaStreamSource(mediaStream);
      source.connect(analyser);

      const bufferLength = analyser.fftSize;
      const dataArray = new Float32Array(bufferLength);
      const volumeMeasurements: number[] = [];

      const startTime = Date.now();

      const measureVolume = () => {
        if (Date.now() - startTime >= durationMs) {
          // Analyze volume distribution
          volumeMeasurements.sort((a, b) => a - b);
          
          const min = volumeMeasurements[0] || 0;
          const max = volumeMeasurements[volumeMeasurements.length - 1] || 1;
          const median = volumeMeasurements[Math.floor(volumeMeasurements.length / 2)] || 0.5;
          
          // Calculate offset to center dynamic range
          const targetCenter = 0.3; // Aim for 30% as comfortable speaking level
          const offset = targetCenter - median;

          source.disconnect();
          resolve({
            offset,
            range: { min, max }
          });
          return;
        }

        analyser.getFloatTimeDomainData(dataArray);
        
        // Calculate RMS
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i] * dataArray[i];
        }
        const rms = Math.sqrt(sum / bufferLength);
        volumeMeasurements.push(rms);
        
        setTimeout(measureVolume, 50);
      };

      measureVolume();
    });
  }

  /**
   * Measure frequency response (simplified version)
   */
  private async measureFrequencyResponse(
    audioContext: AudioContext,
    mediaStream: MediaStream,
    durationMs: number = 5000
  ): Promise<{ [frequency: number]: number }> {
    return new Promise((resolve) => {
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 4096;
      
      const source = audioContext.createMediaStreamSource(mediaStream);
      source.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Float32Array(bufferLength);
      const responseMap: { [frequency: number]: number[] } = {};

      const startTime = Date.now();

      const measureResponse = () => {
        if (Date.now() - startTime >= durationMs) {
          // Calculate average response for each frequency
          const avgResponse: { [frequency: number]: number } = {};
          
          Object.keys(responseMap).forEach(freqStr => {
            const frequency = parseInt(freqStr);
            const measurements = responseMap[frequency];
            const avg = measurements.reduce((sum, val) => sum + val, 0) / measurements.length;
            avgResponse[frequency] = avg;
          });

          source.disconnect();
          resolve(avgResponse);
          return;
        }

        analyser.getFloatFrequencyData(dataArray);
        
        // Store measurements for key frequencies
        for (let bin = 0; bin < bufferLength; bin++) {
          const frequency = Math.round((bin * audioContext.sampleRate) / (analyser.fftSize));
          
          // Focus on vocal range
          if (frequency >= 80 && frequency <= 1000) {
            if (!responseMap[frequency]) {
              responseMap[frequency] = [];
            }
            responseMap[frequency].push(dataArray[bin]);
          }
        }
        
        setTimeout(measureResponse, 100);
      };

      measureResponse();
    });
  }

  /**
   * Calculate optimal settings based on calibration data
   */
  private calculateOptimalSettings(
    noiseProfile: { [frequency: number]: number },
    volumeCalibration: any,
    frequencyResponse: { [frequency: number]: number }
  ): any {
    const baseSettings = this.getDefaultSettings();

    // Adjust sensitivity based on volume calibration
    const sensitivityAdjustment = Math.max(0.5, Math.min(2.0, 1.0 - volumeCalibration.offset));
    const adjustedSensitivity = baseSettings.sensitivity * sensitivityAdjustment;

    // Adjust noise gate based on background noise
    const noiseFrequencies = Object.keys(noiseProfile).map(f => parseInt(f));
    const vocalRangeNoise = noiseFrequencies
      .filter(f => f >= 100 && f <= 800)
      .map(f => noiseProfile[f]);
    
    const avgNoise = vocalRangeNoise.length > 0 ? 
      vocalRangeNoise.reduce((sum, val) => sum + val, 0) / vocalRangeNoise.length : -60;
    
    const noiseGateAdjustment = Math.max(-20, avgNoise + 10); // 10dB above average noise
    const adjustedNoiseGate = Math.max(baseSettings.noiseGate, Math.abs(noiseGateAdjustment) / 1000);

    // Analyze frequency response for filter adjustments
    const frequencyKeys = Object.keys(frequencyResponse).map(f => parseInt(f)).sort((a, b) => a - b);
    const responseLevels = frequencyKeys.map(f => frequencyResponse[f]);
    
    // Simple frequency response correction
    const lowFreqResponse = responseLevels.slice(0, Math.floor(responseLevels.length * 0.3));
    const midFreqResponse = responseLevels.slice(
      Math.floor(responseLevels.length * 0.3),
      Math.floor(responseLevels.length * 0.7)
    );
    const highFreqResponse = responseLevels.slice(Math.floor(responseLevels.length * 0.7));

    const lowAvg = lowFreqResponse.reduce((sum, val) => sum + val, 0) / lowFreqResponse.length;
    const midAvg = midFreqResponse.reduce((sum, val) => sum + val, 0) / midFreqResponse.length;
    const highAvg = highFreqResponse.reduce((sum, val) => sum + val, 0) / highFreqResponse.length;

    return {
      sensitivity: Math.round(adjustedSensitivity * 10) / 10,
      noiseGate: Math.round(adjustedNoiseGate * 1000) / 1000,
      volumeOffset: volumeCalibration.offset,
      filterSettings: {
        highpassFreq: lowAvg < (midAvg - 5) ? 100 : 80, // Stronger highpass if low freq is weak
        lowpassFreq: highAvg > (midAvg + 3) ? 600 : 800, // Lower cutoff if high freq is strong
        notchFreq: 60, // Standard power line frequency
        highpassQ: 0.7,
        lowpassQ: 0.7,
        notchQ: 10.0
      },
      deviceAdjustments: {
        lowFreqCompensation: Math.max(0.8, Math.min(1.5, midAvg / (lowAvg || -60))),
        highFreqCompensation: Math.max(0.8, Math.min(1.2, midAvg / (highAvg || -60)))
      }
    };
  }

  /**
   * Get default settings for current device
   */
  private getDefaultSettings(): any {
    return {
      sensitivity: this.deviceSpecs.sensitivity,
      noiseGate: this.deviceSpecs.noiseGate,
      volumeOffset: 0,
      filterSettings: {
        highpassFreq: 80,
        lowpassFreq: 800,
        notchFreq: 60,
        highpassQ: 0.7,
        lowpassQ: 0.7,
        notchQ: 10.0
      }
    };
  }

  /**
   * Apply calibrated settings to audio processing
   */
  applyCalibration(audioProcessor: any): boolean {
    if (!this.isCalibrated || !this.calibrationData) {
      console.warn('⚠️ [CalibrationSystem] No calibration data available');
      return false;
    }

    try {
      const settings = this.calibrationData.optimalSettings;
      
      // Apply settings to audio processor
      if (audioProcessor.setSensitivity) {
        audioProcessor.setSensitivity(settings.sensitivity);
      }
      
      if (audioProcessor.setNoiseGate) {
        audioProcessor.setNoiseGate(settings.noiseGate);
      }
      
      if (audioProcessor.updateFilterSettings) {
        audioProcessor.updateFilterSettings(settings.filterSettings);
      }

      console.log('✅ [CalibrationSystem] Calibration applied successfully');
      return true;

    } catch (error) {
      console.error('❌ [CalibrationSystem] Failed to apply calibration:', error);
      return false;
    }
  }

  /**
   * Get calibration status
   */
  getCalibrationStatus(): {
    isCalibrated: boolean;
    inProgress: boolean;
    deviceSpecs: DeviceSpecs;
    calibrationData: any;
  } {
    return {
      isCalibrated: this.isCalibrated,
      inProgress: this.calibrationInProgress,
      deviceSpecs: this.deviceSpecs,
      calibrationData: this.calibrationData
    };
  }

  /**
   * Reset calibration
   */
  reset(): void {
    this.isCalibrated = false;
    this.calibrationInProgress = false;
    this.calibrationData = null;
    
    console.log('🔄 [CalibrationSystem] Calibration reset');
  }

  /**
   * Save calibration data to localStorage
   */
  saveCalibration(): boolean {
    if (!this.isCalibrated || !this.calibrationData) {
      return false;
    }

    try {
      const calibrationKey = `pitchpro_calibration_${this.deviceSpecs.deviceType}`;
      const dataToSave = {
        deviceSpecs: this.deviceSpecs,
        calibrationData: this.calibrationData,
        timestamp: Date.now()
      };

      localStorage.setItem(calibrationKey, JSON.stringify(dataToSave));
      console.log('💾 [CalibrationSystem] Calibration saved');
      return true;

    } catch (error) {
      console.error('❌ [CalibrationSystem] Failed to save calibration:', error);
      return false;
    }
  }

  /**
   * Load calibration data from localStorage
   */
  loadCalibration(): boolean {
    try {
      const calibrationKey = `pitchpro_calibration_${this.deviceSpecs.deviceType}`;
      const savedData = localStorage.getItem(calibrationKey);
      
      if (!savedData) {
        return false;
      }

      const parsedData = JSON.parse(savedData);
      
      // Check if calibration is recent (within 7 days)
      const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
      if (Date.now() - parsedData.timestamp > maxAge) {
        console.log('⏰ [CalibrationSystem] Saved calibration is too old, ignoring');
        return false;
      }

      // Verify device compatibility
      if (parsedData.deviceSpecs.deviceType !== this.deviceSpecs.deviceType) {
        console.log('📱 [CalibrationSystem] Device type mismatch, ignoring saved calibration');
        return false;
      }

      this.calibrationData = parsedData.calibrationData;
      this.isCalibrated = true;
      
      console.log('📂 [CalibrationSystem] Calibration loaded successfully');
      return true;

    } catch (error) {
      console.error('❌ [CalibrationSystem] Failed to load calibration:', error);
      return false;
    }
  }
}