/**
 * PitchPro Audio Processing Library
 * High-precision pitch detection and audio processing for web applications
 * 
 * @version 1.1.8
 * @author PitchPro Team
 * @license MIT
 */

// Core exports
export { AudioManager } from './core/AudioManager';
export { PitchDetector } from './core/PitchDetector';
export { NoiseFilter } from './core/NoiseFilter';
export { MicrophoneLifecycleManager } from './core/MicrophoneLifecycleManager';
export type { LifecycleManagerConfig } from './core/MicrophoneLifecycleManager';
export { MicrophoneController } from './core/MicrophoneController';
export type { MicrophoneControllerConfig } from './core/MicrophoneController';
export { ErrorNotificationSystem } from './core/ErrorNotificationSystem';

// Component exports
export { AudioDetectionComponent } from './components/AudioDetectionComponent';
export type { AudioDetectionConfig, AudioDetectionCallbacks } from './components/AudioDetectionComponent';

// Advanced exports
export { HarmonicCorrection } from './advanced/HarmonicCorrection';
export { VoiceAnalyzer } from './advanced/VoiceAnalyzer';
export { CalibrationSystem } from './advanced/CalibrationSystem';

// Utils exports
export { FrequencyUtils } from './utils/FrequencyUtils';
export { MusicTheory } from './utils/MusicTheory';
export { DeviceDetection } from './utils/DeviceDetection';
export { Logger, LogLevel, defaultLogger, debug, info, warn, error } from './utils/Logger';
export type { LogContext, LogEntry } from './utils/Logger';
export { MicrophoneHealthError } from './utils/errors';

// Type exports
export type {
  AudioManagerConfig,
  PitchDetectorConfig,
  PitchDetectionResult,
  NoiseFilterConfig,
  HarmonicCorrectionResult,
  NotificationConfig,
  MusicalNote,
  MusicalInterval,
  VoiceAnalysis,
  DeviceSpecs
} from './types';

// Constants
export const VERSION = '1.1.8';
export const BUILD_DATE = new Date().toISOString();

// Default configurations
export const DEFAULT_CONFIG = {
  pitchDetector: {
    fftSize: 4096,
    smoothing: 0.1,
    clarityThreshold: 0.4,    // 現実的な値に修正
    minVolumeAbsolute: 0.003  // 現実的な値に修正
  },
  audioManager: {
    sampleRate: 44100,
    channelCount: 1,
    echoCancellation: false,
    noiseSuppression: false,
    autoGainControl: false
  },
  noiseFilter: {
    highpassFreq: 80,
    lowpassFreq: 800,
    notchFreq: 60,
    Q: 0.7
  }
} as const;