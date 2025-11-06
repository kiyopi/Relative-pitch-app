/**
 * TypeScript type definitions for PitchPro Audio Processing
 */

// AudioManager types
export interface AudioManagerConfig {
  sampleRate?: number;
  channelCount?: number;
  echoCancellation?: boolean;
  noiseSuppression?: boolean;
  autoGainControl?: boolean;
  latency?: number;
}

// PitchDetector types
export interface PitchDetectorConfig {
  fftSize?: number;
  smoothing?: number;
  clarityThreshold?: number;
  minVolumeAbsolute?: number;
  noiseGate?: number;        // v1.1.8: DeviceDetection最適化対応
  deviceOptimization?: boolean;
  silenceDetection?: SilenceDetectionConfig;
}

// Silence detection types
export interface SilenceDetectionConfig {
  enabled?: boolean;
  warningThreshold?: number;    // 警告までの時間（ms）
  timeoutThreshold?: number;    // タイムアウトまでの時間（ms）
  minVolumeThreshold?: number;  // 消音判定の音量閾値
  onSilenceWarning?: (duration: number) => void;
  onSilenceTimeout?: () => void;
  onSilenceRecovered?: () => void;
}

export interface PitchDetectionResult {
  frequency: number;
  note: string;
  octave?: number;
  clarity: number;
  volume: number;
  rawVolume?: number;
  cents?: number;
  timestamp?: number;
}

// NoiseFilter types
export interface NoiseFilterConfig {
  highpassFreq?: number;
  lowpassFreq?: number;
  notchFreq?: number;
  highpassQ?: number;
  lowpassQ?: number;
  notchQ?: number;
  useFilters?: boolean;
}

// HarmonicCorrection types
export interface HarmonicCorrectionResult {
  correctedFreq: number;
  confidence: number;
  correctionApplied: boolean;
}

// ErrorNotification types
export interface NotificationConfig {
  type: 'error' | 'warning' | 'success' | 'info';
  title: string;
  message: string;
  details?: string[];
  solution?: string;
  autoHide?: boolean;
  duration?: number;
  priority?: 'low' | 'medium' | 'high';
}

export interface NotificationElement extends HTMLElement {
  'data-notification-id': string;
}

// Music theory types
export interface MusicalNote {
  name: string;
  octave: number;
  midi: number;
  frequency: number;
}

export interface MusicalInterval {
  name: string;
  semitones: number;
  cents: number;
  ratio: number;
}

// Voice analysis types
export interface VoiceAnalysis {
  quality: VoiceQuality;
  stability: number;
  recommendations: string[];
}

export const VoiceQuality = {
  EXCELLENT: 'excellent' as const,
  GOOD: 'good' as const,
  FAIR: 'fair' as const,
  POOR: 'poor' as const
};

export type VoiceQuality = typeof VoiceQuality[keyof typeof VoiceQuality];

export const AccuracyLevel = {
  PERFECT: 'perfect' as const,
  EXCELLENT: 'excellent' as const,
  GOOD: 'good' as const,
  FAIR: 'fair' as const,
  POOR: 'poor' as const
};

export type AccuracyLevel = typeof AccuracyLevel[keyof typeof AccuracyLevel];

export interface AccuracyResult {
  accuracy: AccuracyLevel;
  centsOff: number;
  score: number;
}

// Device detection types
export interface DeviceSpecs {
  deviceType: 'iPhone' | 'iPad' | 'PC';
  isIOS: boolean;
  sensitivity: number;
  noiseGate: number;
  divisor: number;
  gainCompensation: number;
  noiseThreshold: number;
  smoothingFactor: number;
}

// Lifecycle management types
export interface MediaStreamResources {
  audioContext: AudioContext;
  mediaStream: MediaStream;
  sourceNode: MediaStreamAudioSourceNode;
}

export interface HealthStatus {
  mediaStreamActive: boolean;
  audioContextState: string;
  trackStates: TrackState[];
  healthy: boolean;
  refCount?: number;
}

export interface TrackState {
  kind: string;
  enabled: boolean;
  readyState: MediaStreamTrackState;
  muted: boolean;
}

// Event types
export interface MicrophoneControllerEvents {
  'pitchpro:microphoneGranted': CustomEvent<{ stream: MediaStream }>;
  'pitchpro:microphoneDenied': CustomEvent<{ error: Error }>;
  'pitchpro:microphoneStopped': CustomEvent;
  'pitchpro:microphoneMuted': CustomEvent<{ timestamp: number; controllerState: string }>;
  'pitchpro:microphoneUnmuted': CustomEvent<{ timestamp: number; controllerState: string }>;
  'pitchpro:sensitivityChanged': CustomEvent<{ sensitivity: number }>;
  'pitchpro:noiseGateChanged': CustomEvent<{ threshold: number }>;
  'pitchpro:deviceDetected': CustomEvent<{ specs: DeviceSpecs }>;
}

export interface LifecycleEvents {
  'pitchpro:lifecycle:trackEnded': CustomEvent<{ track: MediaStreamTrack }>;
  'pitchpro:lifecycle:trackMuted': CustomEvent<{ track: MediaStreamTrack }>;
  'pitchpro:lifecycle:trackUnmuted': CustomEvent<{ track: MediaStreamTrack }>;
  'pitchpro:lifecycle:autoRecoverySuccess': CustomEvent;
  'pitchpro:lifecycle:autoRecoveryFailed': CustomEvent<{ error: Error }>;
  'pitchpro:lifecycle:maxRecoveryAttemptsReached': CustomEvent<{ attempts: number; lastHealthStatus: any }>;
  'pitchpro:lifecycle:monitoringRestarted': CustomEvent<{ reason: string; refCount: number }>;
}

// Callback types
export type PitchCallback = (result: PitchDetectionResult) => void;
export type ErrorCallback = (error: Error) => void;
export type StateChangeCallback = (state: string) => void;