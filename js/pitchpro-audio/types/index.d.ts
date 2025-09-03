/**
 * TypeScript type definitions for PitchPro Audio Processing
 */
export interface AudioManagerConfig {
    sampleRate?: number;
    channelCount?: number;
    echoCancellation?: boolean;
    noiseSuppression?: boolean;
    autoGainControl?: boolean;
    latency?: number;
}
export interface PitchDetectorConfig {
    fftSize?: number;
    smoothing?: number;
    clarityThreshold?: number;
    minVolumeAbsolute?: number;
}
export interface PitchDetectionResult {
    frequency: number;
    note: string;
    clarity: number;
    volume: number;
    cents?: number;
}
export interface NoiseFilterConfig {
    highpassFreq?: number;
    lowpassFreq?: number;
    notchFreq?: number;
    highpassQ?: number;
    lowpassQ?: number;
    notchQ?: number;
    useFilters?: boolean;
}
export interface HarmonicCorrectionResult {
    correctedFreq: number;
    confidence: number;
    correctionApplied: boolean;
}
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
export interface VoiceAnalysis {
    quality: VoiceQuality;
    stability: number;
    recommendations: string[];
}
export declare const VoiceQuality: {
    EXCELLENT: "excellent";
    GOOD: "good";
    FAIR: "fair";
    POOR: "poor";
};
export type VoiceQuality = typeof VoiceQuality[keyof typeof VoiceQuality];
export declare const AccuracyLevel: {
    PERFECT: "perfect";
    EXCELLENT: "excellent";
    GOOD: "good";
    FAIR: "fair";
    POOR: "poor";
};
export type AccuracyLevel = typeof AccuracyLevel[keyof typeof AccuracyLevel];
export interface AccuracyResult {
    accuracy: AccuracyLevel;
    centsOff: number;
    score: number;
}
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
export interface MicrophoneControllerEvents {
    'pitchpro:microphoneGranted': CustomEvent<{
        stream: MediaStream;
    }>;
    'pitchpro:microphoneDenied': CustomEvent<{
        error: Error;
    }>;
    'pitchpro:microphoneStopped': CustomEvent;
    'pitchpro:sensitivityChanged': CustomEvent<{
        sensitivity: number;
    }>;
    'pitchpro:noiseGateChanged': CustomEvent<{
        threshold: number;
    }>;
    'pitchpro:deviceDetected': CustomEvent<{
        specs: DeviceSpecs;
    }>;
}
export interface LifecycleEvents {
    'pitchpro:lifecycle:trackEnded': CustomEvent<{
        track: MediaStreamTrack;
    }>;
    'pitchpro:lifecycle:trackMuted': CustomEvent<{
        track: MediaStreamTrack;
    }>;
    'pitchpro:lifecycle:trackUnmuted': CustomEvent<{
        track: MediaStreamTrack;
    }>;
    'pitchpro:lifecycle:autoRecoverySuccess': CustomEvent;
    'pitchpro:lifecycle:autoRecoveryFailed': CustomEvent<{
        error: Error;
    }>;
}
export type PitchCallback = (result: PitchDetectionResult) => void;
export type ErrorCallback = (error: Error) => void;
export type StateChangeCallback = (state: string) => void;
//# sourceMappingURL=index.d.ts.map