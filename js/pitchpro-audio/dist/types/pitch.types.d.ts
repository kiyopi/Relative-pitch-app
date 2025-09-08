export interface PitchDetectionResult {
    pitch: number;
    clarity: number;
    volume: number;
    timestamp: number;
    note?: NoteInfo;
}
export interface NoteInfo {
    name: string;
    octave: number;
    frequency: number;
    cents: number;
}
export interface AudioConfig {
    sampleRate: number;
    bufferSize: number;
    fftSize: number;
    smoothingTimeConstant: number;
    minDecibels: number;
    maxDecibels: number;
}
export interface DeviceSettings {
    sensitivity: number;
    noiseGate: number;
    clarityThreshold: number;
    minVolume: number;
    bufferMultiplier: number;
}
export interface PitchDetectorOptions {
    targetFPS?: number;
    enableSmoothing?: boolean;
    smoothingFactor?: number;
    pitchRange?: PitchRange;
    deviceOverrides?: Partial<DeviceSettings>;
}
export interface PitchRange {
    min: number;
    max: number;
}
export interface HarmonicAnalysis {
    fundamentalFrequency: number;
    harmonics: Harmonic[];
    inharmonicity: number;
    spectralCentroid: number;
}
export interface Harmonic {
    frequency: number;
    amplitude: number;
    phase: number;
    order: number;
}
export interface SpectralFeatures {
    centroid: number;
    spread: number;
    flux: number;
    rolloff: number;
    flatness: number;
    entropy: number;
}
export type PitchCallback = (result: PitchDetectionResult) => void;
export type ErrorCallback = (error: Error) => void;
export type StateChangeCallback = (state: DetectorState) => void;
export declare enum DetectorState {
    IDLE = "idle",
    INITIALIZING = "initializing",
    RUNNING = "running",
    PAUSED = "paused",
    ERROR = "error",
    STOPPED = "stopped"
}
export interface DeviceInfo {
    type: 'iPhone' | 'iPad' | 'Android' | 'Desktop' | 'Unknown';
    userAgent: string;
    hasTouch: boolean;
    screenSize: {
        width: number;
        height: number;
    };
}
export interface PerformanceMetrics {
    fps: number;
    latency: number;
    cpuUsage: number;
    memoryUsage: number;
    droppedFrames: number;
}
export interface AudioBuffer {
    data: Float32Array;
    sampleRate: number;
    timestamp: number;
    channelCount: number;
}
export interface FilterConfig {
    type: 'lowpass' | 'highpass' | 'bandpass' | 'notch';
    frequency: number;
    Q?: number;
    gain?: number;
}
export interface CalibrationData {
    referenceFrequency: number;
    calibrationOffset: number;
    temperatureCompensation: number;
    timestamp: number;
}
//# sourceMappingURL=pitch.types.d.ts.map