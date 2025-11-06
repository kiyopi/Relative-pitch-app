/**
 * PitchDetector - Framework-agnostic High-precision Pitch Detection Engine
 * 
 * @description Provides real-time pitch detection using the McLeod Pitch Method (Pitchy library)
 * with advanced features including configurable harmonic correction, adaptive frame rate control,
 * noise filtering, TypedArray-optimized volume history, and device-specific optimization for
 * consistent cross-platform performance. Supports development-mode debug logging and comprehensive
 * performance monitoring.
 * 
 * @features
 * - **McLeod Pitch Method**: Industry-standard pitch detection algorithm
 * - **Harmonic Correction**: Configurable octave jump detection and correction
 * - **Adaptive Performance**: Dynamic frame rate adjustment (30-60 FPS)
 * - **TypedArray Optimization**: High-performance buffer operations
 * - **Device Optimization**: Platform-specific sensitivity adjustments
 * - **Silence Detection**: Configurable timeout and warning system
 * - **Development Debug**: Conditional debug logging for development builds
 * 
 * @example
 * ```typescript
 * // Basic usage with default configuration
 * const pitchDetector = new PitchDetector(audioManager);
 * 
 * // Advanced configuration with custom settings
 * const pitchDetector = new PitchDetector(audioManager, {
 *   fftSize: 4096,
 *   clarityThreshold: 0.4,
 *   minVolumeAbsolute: 0.003,
 *   harmonicCorrection: {
 *     enabled: true,
 *     confidenceThreshold: 0.7,
 *     historyWindow: 1000,
 *     frequencyThreshold: 0.1
 *   },
 *   volumeHistory: {
 *     historyLength: 5,
 *     useTypedArray: true
 *   },
 *   silenceDetection: {
 *     enabled: true,
 *     warningThreshold: 15000,
 *     timeoutThreshold: 30000
 *   }
 * });
 * 
 * await pitchDetector.initialize();
 * 
 * pitchDetector.setCallbacks({
 *   onPitchUpdate: (result) => {
 *     console.log(`Detected: ${result.note} (${result.frequency.toFixed(1)}Hz)`);
 *     console.log(`Clarity: ${(result.clarity * 100).toFixed(1)}%, Volume: ${result.volume.toFixed(1)}%`);
 *   },
 *   onError: (error) => {
 *     console.error('Detection error:', error.message);
 *   },
 *   onStateChange: (state) => {
 *     console.log('Detection state:', state);
 *   }
 * });
 * 
 * pitchDetector.startDetection();
 * ```
 * 
 * @version 1.1.3
 * @since 1.0.0
 */

import { PitchDetector as PitchyDetector } from 'pitchy';
import type { 
  PitchDetectorConfig, 
  PitchDetectionResult, 
  PitchCallback,
  ErrorCallback,
  StateChangeCallback,
  DeviceSpecs,
  SilenceDetectionConfig
} from '../types';

/**
 * Configuration for harmonic correction system
 * @interface HarmonicCorrectionConfig
 */
export interface HarmonicCorrectionConfig {
  /** @description Enable/disable harmonic correction (default: true) */
  enabled?: boolean;
  /** @description Confidence threshold for corrections (0-1, default: 0.7) */
  confidenceThreshold?: number;
  /** @description Time window for harmonic history in ms (default: 1000) */
  historyWindow?: number;
  /** @description Frequency difference threshold for octave detection (0-1, default: 0.1) */
  frequencyThreshold?: number;
}

/**
 * Configuration for volume history optimization
 * @interface VolumeHistoryConfig
 */
export interface VolumeHistoryConfig {
  /** @description Number of frames to keep in volume history (default: 5) */
  historyLength?: number;
  /** @description Use optimized TypedArray buffer (default: false) */
  useTypedArray?: boolean;
}
import { AudioManager } from './AudioManager';
import { AdaptiveFrameRateLimiter } from '../utils/performance-optimized';
import { 
  PitchProError, 
  AudioContextError, 
  PitchDetectionError, 
  isRecoverableError,
  ErrorMessageBuilder
} from '../utils/errors';

export class PitchDetector {
  /** @private AudioManager instance for resource management */
  private audioManager: AudioManager;
  
  /** @private Pitchy library detector instance for McLeod Pitch Method */
  private pitchDetector: PitchyDetector<Float32Array> | null = null;
  
  /** @private AnalyserNode with noise filtering applied */
  private analyser: AnalyserNode | null = null;
  
  /** @private Raw AnalyserNode for unfiltered volume measurement */
  private rawAnalyser: AnalyserNode | null = null;
  
  /** @private RequestAnimationFrame ID for detection loop */
  private animationFrame: number | null = null;
  
  /** @private Adaptive frame rate controller for optimal performance */
  private frameRateLimiter: AdaptiveFrameRateLimiter;
  
  /** @private Current component state for lifecycle management */
  private componentState: 'uninitialized' | 'initializing' | 'ready' | 'detecting' | 'error' = 'uninitialized';
  
  /** @private Initialization completion flag */
  private isInitialized = false;
  
  /** @private Detection active flag */
  private isDetecting = false;
  
  /** @private Last error encountered during operations */
  private lastError: Error | null = null;
  
  /** @private Array of analyser IDs for cleanup management */
  private analyserIds: string[] = [];
  
  /** @private Current processed volume level (0-100) */
  private currentVolume = 0;
  
  /** @private Raw volume level before processing (0-100) */
  private rawVolume = 0;
  
  /** @private Currently detected frequency in Hz (preserves decimal precision) */
  private currentFrequency = 0;
  
  /** @private Detected musical note name */
  private detectedNote = '--';
  
  /** @private Detected octave number */
  private detectedOctave: number | null = null;
  
  /** @private Pitch detection clarity/confidence (0-1) */
  private pitchClarity = 0;
  
  /** @private Circular buffer for volume stabilization */
  private volumeHistory: number[] | Float32Array = [];
  
  /** @private Stabilized volume after filtering */
  private stableVolume = 0;
  
  /** @private Previous frequency for harmonic correction */
  // @ts-ignore - Used in correctHarmonic method for frequency tracking
  private previousFrequency = 0;
  
  /** @private History buffer for harmonic analysis */
  private harmonicHistory: Array<{frequency: number, confidence: number, timestamp: number}> = [];
  
  /** @private PitchDetector configuration with defaults applied */
  private config: Required<Omit<PitchDetectorConfig, 'silenceDetection'>> & { 
    silenceDetection?: SilenceDetectionConfig 
  };
  
  /** @private Harmonic correction configuration */
  private harmonicConfig: Required<HarmonicCorrectionConfig>;
  
  /** @private Volume history configuration */
  private volumeHistoryConfig: Required<VolumeHistoryConfig>;
  
  /** @private Flag to disable harmonic correction */
  private disableHarmonicCorrection = false;
  
  /** @private Callback functions for events */
  private callbacks: {
    onPitchUpdate?: PitchCallback;
    onError?: ErrorCallback;
    onStateChange?: StateChangeCallback;
  } = {};
  
  /** @private Device-specific optimization parameters */
  private deviceSpecs: DeviceSpecs | null = null;
  
  /** @private Silence detection configuration */
  private silenceDetectionConfig: SilenceDetectionConfig;
  
  /** @private Timestamp when silence started */
  private silenceStartTime: number | null = null;
  
  /** @private Timer ID for silence warning */
  private silenceWarningTimer: number | null = null;
  
  /** @private Timer ID for silence timeout */
  private silenceTimeoutTimer: number | null = null;
  
  /** @private Current silence state flag */
  private isSilent = false;
  
  /** @private Silence warning already issued flag */
  private hasWarned = false;

  /**
   * Creates a new PitchDetector instance with comprehensive configuration options
   * 
   * @description Initializes a high-performance pitch detection engine with configurable
   * harmonic correction, optimized volume history buffers, and device-specific optimizations.
   * The constructor applies sensible defaults while allowing fine-grained control over all
   * detection parameters and performance characteristics.
   * 
   * @param audioManager - AudioManager instance for resource management and audio context access
   * @param config - Optional configuration object to customize detection behavior
   * @param config.fftSize - FFT size for frequency analysis (default: 4096, recommended: 2048-8192)
   * @param config.smoothing - Smoothing factor for AnalyserNode (default: 0.1, range: 0-1)
   * @param config.clarityThreshold - Minimum clarity for valid detection (default: 0.4, range: 0-1)
   * @param config.minVolumeAbsolute - Minimum volume threshold (default: 0.003, range: 0.001-0.01)
   * @param config.harmonicCorrection - Harmonic correction configuration
   * @param config.harmonicCorrection.enabled - Enable octave jump correction (default: true)
   * @param config.harmonicCorrection.confidenceThreshold - Confidence required for correction (default: 0.7)
   * @param config.harmonicCorrection.historyWindow - Time window for harmonic analysis in ms (default: 1000)
   * @param config.harmonicCorrection.frequencyThreshold - Frequency difference threshold (default: 0.1)
   * @param config.volumeHistory - Volume history buffer configuration
   * @param config.volumeHistory.historyLength - Number of frames to average (default: 10)
   * @param config.volumeHistory.useTypedArray - Use TypedArray for better performance (default: true)
   * @param config.silenceDetection - Silence detection and timeout configuration
   * @param config.silenceDetection.enabled - Enable silence detection (default: false)
   * @param config.silenceDetection.warningThreshold - Warning timeout in ms (default: 15000)
   * @param config.silenceDetection.timeoutThreshold - Hard timeout in ms (default: 30000)
   * 
   * @example
   * ```typescript
   * // Minimal configuration (uses optimized defaults)
   * const pitchDetector = new PitchDetector(audioManager);
   * 
   * // Performance-optimized configuration for music applications
   * const pitchDetector = new PitchDetector(audioManager, {
   *   fftSize: 4096,           // Good balance of accuracy and performance
   *   clarityThreshold: 0.5,   // Higher threshold for cleaner detection
   *   minVolumeAbsolute: 0.002, // Sensitive to quiet sounds
   *   harmonicCorrection: {
   *     enabled: true,
   *     confidenceThreshold: 0.8, // Conservative octave correction
   *     historyWindow: 1500,       // Longer analysis window
   *     frequencyThreshold: 0.08   // Tighter frequency matching
   *   },
   *   volumeHistory: {
   *     historyLength: 7,      // More smoothing
   *     useTypedArray: true    // Maximum performance
   *   }
   * });
   * 
   * // Educational/debugging configuration
   * const pitchDetector = new PitchDetector(audioManager, {
   *   fftSize: 8192,           // High resolution for analysis
   *   clarityThreshold: 0.3,   // Lower threshold to see more detections
   *   harmonicCorrection: {
   *     enabled: false         // Disable to see raw algorithm output
   *   },
   *   volumeHistory: {
   *     historyLength: 3,      // Less smoothing for immediate response
   *     useTypedArray: false   // Standard arrays for easier debugging
   *   },
   *   silenceDetection: {
   *     enabled: true,
   *     warningThreshold: 10000, // 10 second warning
   *     timeoutThreshold: 20000  // 20 second timeout
   *   }
   * });
   * ```
   */
  constructor(
    audioManager: AudioManager, 
    config: PitchDetectorConfig & {
      harmonicCorrection?: Partial<HarmonicCorrectionConfig>;
      volumeHistory?: Partial<VolumeHistoryConfig>;
    } = {}
  ) {
    this.audioManager = audioManager;
    this.config = {
      fftSize: 4096,
      smoothing: 0.9, // 揺れ防止のため強化 (0.1 → 0.9)
      clarityThreshold: 0.4,    // 0.8から0.4に現実的な値に変更
      minVolumeAbsolute: 0.010, // v1.1.8: 音程変化対応極限調整 (0.011→0.010)
      noiseGate: 0.02,          // v1.1.8: デフォルトnoiseGate値
      deviceOptimization: true, // v1.1.8: デバイス最適化デフォルト有効
      ...config
    };
    
    // Initialize harmonic correction configuration
    this.harmonicConfig = {
      enabled: true,
      confidenceThreshold: 0.7,
      historyWindow: 1000,
      frequencyThreshold: 0.1,
      ...config.harmonicCorrection
    };
    
    // Initialize volume history configuration (prefer TypedArray for better performance)
    this.volumeHistoryConfig = {
      historyLength: 10, // 音程変化対応のため大幅短縮 (12 -> 10) - 高応答性重視
      useTypedArray: true, // Enable by default for better performance
      ...config.volumeHistory
    };
    
    // Initialize volume history buffer
    this.initializeVolumeHistory();
    
    // Set disableHarmonicCorrection based on harmonic config
    this.disableHarmonicCorrection = !this.harmonicConfig.enabled;
    
    // Initialize silence detection configuration
    this.silenceDetectionConfig = {
      enabled: false,
      warningThreshold: 15000,  // 15秒で警告
      timeoutThreshold: 30000,  // 30秒でタイムアウト
      minVolumeThreshold: 0.01, // 消音判定の音量閾値
      ...config.silenceDetection
    };
    
    // Note: getPlatformSpecs() will be called during initialize() to avoid timing issues
    
    // Initialize performance optimization
    this.frameRateLimiter = new AdaptiveFrameRateLimiter(45); // 45FPS optimal for music
  }

  /**
   * Sets callback functions for pitch detection events
   * 
   * @description Configures event handlers for real-time pitch detection results,
   * errors, and state changes. Callbacks are called at the adaptive frame rate
   * (typically 30-60 FPS) during active detection.
   * 
   * @param callbacks - Object containing callback functions
   * @param callbacks.onPitchUpdate - Called when valid pitch is detected with frequency, note, clarity, and volume data
   * @param callbacks.onError - Called when recoverable or non-recoverable errors occur during detection
   * @param callbacks.onStateChange - Called when component transitions between states (uninitialized/ready/detecting/error)
   * 
   * @example
   * ```typescript
   * pitchDetector.setCallbacks({
   *   onPitchUpdate: (result) => {
   *     // Real-time pitch data (30-60 times per second)
   *     console.log(`Pitch: ${result.frequency.toFixed(2)}Hz`);
   *     console.log(`Note: ${result.note}, Octave: ${result.octave}`);
   *     console.log(`Clarity: ${(result.clarity * 100).toFixed(1)}%`);
   *     console.log(`Volume: ${result.volume.toFixed(1)}%`);
   *     
   *     // Cents deviation from perfect tuning
   *     if (result.cents !== undefined) {
   *       console.log(`Tuning: ${result.cents > 0 ? '+' : ''}${result.cents} cents`);
   *     }
   *   },
   *   onError: (error) => {
   *     console.error('Detection error:', error.message);
   *     
   *     // Handle specific error types
   *     if (error instanceof PitchDetectionError) {
   *       console.log('Pitch detection algorithm error - may be recoverable');
   *     } else if (error instanceof AudioContextError) {
   *       console.log('Audio system error - requires reinitialization');
   *     }
   *   },
   *   onStateChange: (state) => {
   *     console.log('Detection state changed to:', state);
   *     
   *     // React to state changes
   *     switch (state) {
   *       case 'ready':
   *         console.log('PitchDetector initialized and ready');
   *         break;
   *       case 'detecting':
   *         console.log('Active pitch detection started');
   *         break;
   *       case 'error':
   *         console.log('Error state - check error callback for details');
   *         break;
   *     }
   *   }
   * });
   * ```
   */
  setCallbacks(callbacks: {
    onPitchUpdate?: PitchCallback;
    onError?: ErrorCallback;
    onStateChange?: StateChangeCallback;
  }): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

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
  async initialize(): Promise<void> {
    try {
      this.componentState = 'initializing';
      this.lastError = null;
      
      console.log('🎙️ [PitchDetector] Starting initialization via AudioManager');
      
      // Get shared resources from AudioManager
      await this.audioManager.initialize();
      
      // Initialize device specifications after AudioManager is ready
      this.deviceSpecs = this.audioManager.getPlatformSpecs();
      console.log('📱 [PitchDetector] Device specs initialized:', this.deviceSpecs.deviceType);
      
      console.log('✅ [PitchDetector] AudioManager resources acquired');
      
      // Create dedicated Analyser (with filters)
      const filteredAnalyserId = `pitch-detector-filtered-${Date.now()}`;
      this.analyser = this.audioManager.createAnalyser(filteredAnalyserId, {
        fftSize: this.config.fftSize,
        smoothingTimeConstant: this.config.smoothing,
        minDecibels: -90,
        maxDecibels: -10,
        useFilters: true
      });
      this.analyserIds.push(filteredAnalyserId);
      
      // Create raw signal Analyser (for comparison)
      const rawAnalyserId = `pitch-detector-raw-${Date.now()}`;
      this.rawAnalyser = this.audioManager.createAnalyser(rawAnalyserId, {
        fftSize: this.config.fftSize,
        smoothingTimeConstant: this.config.smoothing,
        minDecibels: -90,
        maxDecibels: -10,
        useFilters: false
      });
      this.analyserIds.push(rawAnalyserId);
      
      console.log('✅ [PitchDetector] Analysers created:', this.analyserIds);
      
      // Initialize PitchDetector
      this.pitchDetector = PitchyDetector.forFloat32Array(this.analyser.fftSize);
      
      // Development-only Pitchy instance debug logging
      if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'development') {
        console.log(`[Debug] Pitchyインスタンス作成: ${!!this.pitchDetector}, FFTサイズ: ${this.analyser.fftSize}`);
      }
      
      // Initialization complete
      this.componentState = 'ready';
      this.isInitialized = true;
      
      // Notify state change
      this.callbacks.onStateChange?.(this.componentState);
      
      console.log('✅ [PitchDetector] Initialization complete');
      
    } catch (error) {
      // Convert to structured error
      const pitchError = error instanceof PitchProError 
        ? error 
        : new AudioContextError(
            'PitchDetector initialization failed',
            {
              originalError: error instanceof Error ? error.message : String(error),
              audioContextState: this.audioManager.getStatus().audioContextState,
              deviceSpecs: this.deviceSpecs
            }
          );
          
      console.error('❌ [PitchDetector] Initialization error:', pitchError.toJSON());
      this.componentState = 'error';
      this.lastError = pitchError;
      this.isInitialized = false;
      
      // Notify with structured error
      this.callbacks.onError?.(pitchError);
      
      throw error;
    }
  }

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
  startDetection(): boolean {
    if (this.componentState !== 'ready') {
      const error = new Error(`Cannot start detection: component state is ${this.componentState}`);
      this.callbacks.onError?.(error);
      return false;
    }
    
    if (!this.analyser || !this.pitchDetector) {
      const error = new PitchDetectionError(
        'ピッチ検出に必要なコンポーネントが初期化されていません。initialize()メソッドを先に呼び出してください。',
        {
          operation: 'startDetection',
          hasAnalyser: !!this.analyser,
          hasPitchDetector: !!this.pitchDetector,
          componentState: this.componentState,
          isInitialized: this.isInitialized
        }
      );
      
      ErrorMessageBuilder.logError(error, 'Pitch detection startup');
      this.componentState = 'error';
      this.callbacks.onError?.(error);
      return false;
    }
    
    this.componentState = 'detecting';
    this.isDetecting = true;
    this.callbacks.onStateChange?.(this.componentState);
    this.detectPitch();
    return true;
  }

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
  stopDetection(): void {
    this.isDetecting = false;
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
    
    // Reset frame rate limiter
    this.frameRateLimiter.reset();
    
    // Reset silence detection
    this.resetSilenceTracking();
    
    // Return state to ready (if initialized)
    if (this.componentState === 'detecting' && this.isInitialized) {
      this.componentState = 'ready';
      this.callbacks.onStateChange?.(this.componentState);
    }
  }

  /**
   * Real-time pitch detection loop with adaptive frame rate
   * @private
   * @description Main detection loop optimized for performance with minimal
   * redundant calculations and efficient buffer operations
   */
  private detectPitch(): void {
    // デバッグモード判定（本番環境ではログを無効化）
    const IS_DEBUG_MODE = typeof process !== 'undefined' && process.env?.NODE_ENV === 'development' || 
                          typeof window !== 'undefined';
    
    // Batch timestamp retrieval for performance
    const frameStartTime = performance.now();
    
    // Check if we should process this frame based on adaptive FPS
    if (!this.frameRateLimiter.shouldProcess()) {
      // Skip this frame but schedule next
      this.animationFrame = requestAnimationFrame(() => this.detectPitch());
      return;
    }
    // Development-only debug logging
    if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'development') {
      console.log(`[Debug] detectPitch呼び出し: detecting=${this.isDetecting}, analyser=${!!this.analyser}, rawAnalyser=${!!this.rawAnalyser}, pitchDetector=${!!this.pitchDetector}`);
      
      const audioManagerStatus = this.audioManager.getStatus();
      console.log(`[Debug] AudioManager状態: context=${audioManagerStatus.audioContextState}, stream=${audioManagerStatus.mediaStreamActive}`);
    }
    
    if (!this.isDetecting || !this.analyser || !this.rawAnalyser || !this.pitchDetector || !this.deviceSpecs) return;
    
    const bufferLength = this.analyser.fftSize;
    const buffer = new Float32Array(bufferLength);
    const rawBuffer = new Float32Array(this.rawAnalyser.fftSize);
    
    this.analyser.getFloatTimeDomainData(buffer);
    this.rawAnalyser.getFloatTimeDomainData(rawBuffer);
    
    // Development-only buffer analysis debug logging
    if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'development') {
      const nonZeroCount = buffer.filter(val => Math.abs(val) > 0.0001).length;
      const maxValue = Math.max(...buffer.map(val => Math.abs(val)));
      console.log(`[Debug] バッファー分析: 非ゼロ値=${nonZeroCount}/${bufferLength}, 最大値=${maxValue.toFixed(6)}`);
    }
    
    // Volume calculation (filtered)
    let sum = 0;
    for (let i = 0; i < bufferLength; i++) {
      sum += Math.abs(buffer[i]);
    }
    const rms = Math.sqrt(sum / bufferLength);
    
    // Development-only RMS calculation debug logging
    if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'development') {
      console.log(`[Debug] RMS計算: sum=${sum.toFixed(6)}, rms=${rms.toFixed(6)}`);
    }
    
    // Platform-specific volume calculation
    const platformSpecs = this.deviceSpecs;
    const adjustedRms = rms * platformSpecs.gainCompensation;
    
    // 音量計算用定数定義
    const SCALING_FACTOR = 400; // RMS値からパーセント表示への変換係数
    const NOISE_GATE_SCALING_FACTOR = 1500; // ノイズゲート閾値計算用係数 
    // ハードクリッピング（シンプルなリニア変換）
    const rawVolumeValue = adjustedRms * SCALING_FACTOR;
    const volumePercent = Math.min(100, Math.max(0, rawVolumeValue));
    
    // ブラウザ環境でのデバッグログ（デバッグモード時のみ）
    if (IS_DEBUG_MODE) {
      console.log(`[Debug] 音量計算詳細:`);
      console.log(`  rms=${rms.toFixed(6)}`);
      console.log(`  adjustedRms=${adjustedRms.toFixed(6)}`);
      console.log(`  SCALING_FACTOR=${SCALING_FACTOR}`);
      console.log(`  計算前: adjustedRms * SCALING_FACTOR = ${rawVolumeValue.toFixed(6)}`);
      console.log(`  計算後volumePercent=${volumePercent.toFixed(2)}%`);
      console.log(`  クリップされた？: ${rawVolumeValue > 100 ? 'YES' : 'NO'}`);
      console.log(`  プラットフォーム: gain=${platformSpecs.gainCompensation}, divisor=${platformSpecs.divisor}`);
    }
    
    // Raw volume calculation (pre-filter)
    let rawSum = 0;
    for (let i = 0; i < rawBuffer.length; i++) {
      rawSum += Math.abs(rawBuffer[i]);
    }
    const rawRms = Math.sqrt(rawSum / rawBuffer.length);
    const rawAdjustedRms = rawRms * platformSpecs.gainCompensation;
    const rawVolumePercent = Math.min(100, Math.max(0, rawAdjustedRms * SCALING_FACTOR));
    
    // Volume stabilization with configurable history length
    this.addToVolumeHistory(volumePercent);
    this.stableVolume = this.calculateVolumeAverage();
    
    // 平滑化結果のデバッグログ
    if (IS_DEBUG_MODE) {
      console.log(`[Debug] 平滑化結果: volumePercent=${volumePercent.toFixed(2)}%, stableVolume=${this.stableVolume.toFixed(2)}%`);
    }
    
    // ★★★ ノイズゲート処理の追加 ★★★
    const NOISE_GATE_THRESHOLD = this.config.minVolumeAbsolute * NOISE_GATE_SCALING_FACTOR; // 0.015 * 1500 = 22.5%
    const isSignalBelowNoiseGate = volumePercent < NOISE_GATE_THRESHOLD; // 平滑化前の値で判定
    
    // ノイズゲート判定のデバッグログ
    if (IS_DEBUG_MODE) {
      console.log(`[Debug] ノイズゲート判定:`);
      console.log(`  閾値: ${NOISE_GATE_THRESHOLD.toFixed(2)}%`);
      console.log(`  現在値: ${volumePercent.toFixed(2)}%`);
      console.log(`  判定: ${isSignalBelowNoiseGate ? 'ノイズとしてブロック' : '有効信号として通過'}`);
    }
    
    if (isSignalBelowNoiseGate) {
      // 閾値以下の場合は、検出結果をクリアするが、stableVolumeは保持（スムージング維持）
      this.currentVolume = 0;
      this.rawVolume = 0;
      // this.stableVolume = 0; <- 削除：スムージング履歴を保持
      this.currentFrequency = 0;
      this.detectedNote = '--';
      this.detectedOctave = null;
      this.pitchClarity = 0;
      this.resetHarmonicHistory();
      
      if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'development') {
        console.log(`[Debug] ノイズゲート作動: 入力音量=${volumePercent.toFixed(3)} < 閾値=${NOISE_GATE_THRESHOLD}, stableVolume=${this.stableVolume.toFixed(3)}（保持）`);
      }
    } else {
      // 閾値以上の信号がある場合のみ、ピッチ検出を実行
      this.currentVolume = this.stableVolume;
      this.rawVolume = rawVolumePercent;
      
      // Pitch detection (using PitchDetector) with error handling
      // AudioContextから実際のサンプルレートを動的に取得する
      const sampleRate = this.analyser.context?.sampleRate || 44100; // フォールバック値
      let pitch = 0;
      let clarity = 0;
    
    try {
      const pitchResult = this.pitchDetector.findPitch(buffer, sampleRate);
      pitch = pitchResult[0] || 0;
      clarity = pitchResult[1] || 0;
    } catch (error) {
      // Handle pitch detection errors gracefully
      const pitchError = new PitchDetectionError(
        'Pitch detection algorithm failed',
        {
          bufferLength: buffer.length,
          sampleRate,
          volume: this.currentVolume,
          originalError: error instanceof Error ? error.message : String(error)
        }
      );
      
      console.warn('⚠️ [PitchDetector] Pitch detection error (recoverable):', pitchError.toJSON());
      
      // For recoverable errors, continue with zero values
      if (isRecoverableError(pitchError)) {
        pitch = 0;
        clarity = 0;
      } else {
        // For non-recoverable errors, notify callback
        this.callbacks.onError?.(pitchError);
        return;
      }
    }
    
    // Development-only Pitchy results debug logging
    if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'development') {
      console.log(`[Debug] Pitchy結果: pitch=${pitch?.toFixed(1) || 'null'}, clarity=${clarity?.toFixed(3) || 'null'}, volume=${this.currentVolume?.toFixed(1)}%, sampleRate=${sampleRate.toString()}`);
      console.log(`[Debug] Pitchyバッファー: 最初5要素=${Array.from(buffer.slice(0, 5)).map(v => v.toFixed(6)).join(', ')}`);
    }
    
    // Human vocal range filtering (practical adjustment)
    // Optimized for actual human voice range:
    // - Low range: 65Hz and above (C2 and above, considering male lowest vocal range)  
    // - High range: 1200Hz and below (practical singing range)
    // - Exclude extreme low frequency noise (G-1, etc.) reliably
    const isValidVocalRange = pitch >= 65 && pitch <= 1200;
    
    // Development-only decision criteria debug logging
    if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'development') {
      console.log(`[Debug] 判定条件: pitch=${!!pitch}, clarity=${clarity?.toFixed(3)}>${this.config.clarityThreshold}, volume=${this.currentVolume?.toFixed(1)}>${this.config.minVolumeAbsolute}, range=${isValidVocalRange}`);
    }
    
    if (pitch && clarity > this.config.clarityThreshold && this.currentVolume > this.config.minVolumeAbsolute && isValidVocalRange) {
      let finalFreq = pitch;
      
      // Harmonic correction control
      if (!this.disableHarmonicCorrection) {
        // Apply unified harmonic correction system (pass volume information)
        const normalizedVolume = Math.min(this.currentVolume / 100, 1.0); // Normalize to 0-1
        finalFreq = this.correctHarmonic(pitch, normalizedVolume);
      }
      
      // Update frequency display (preserve decimal precision)
      this.currentFrequency = finalFreq;
      const noteInfo = this.frequencyToNoteAndOctave(this.currentFrequency);
      this.detectedNote = noteInfo.note;
      this.detectedOctave = noteInfo.octave;
      this.pitchClarity = clarity;
      
    } else {
      // Clear harmonic correction history when signal is weak
      if (this.currentFrequency === 0) {
        this.resetHarmonicHistory();
      }
      
      // Clear frequency display
      this.currentFrequency = 0;
      this.detectedNote = '--';
      this.detectedOctave = null;
      this.pitchClarity = 0;
      }
    } // else節の終了
    
    // 最後に、表示音量を決定するロジック - ノイズゲート適用
    const displayVolume = isSignalBelowNoiseGate ? 0 : this.stableVolume; // ノイズゲート適用後の表示値
    
    // Process silence detection
    this.processSilenceDetection(this.currentVolume);
    
    // Send data to callback
    const result: PitchDetectionResult = {
      frequency: this.currentFrequency,
      note: this.detectedNote,
      octave: this.detectedOctave || undefined,
      clarity: this.pitchClarity,
      volume: displayVolume,
      cents: this.currentFrequency > 0 ? this.frequencyToCents(this.currentFrequency) : undefined
    };
    
    // Separate visual updates from audio processing
    this.processAudioData(result);
    this.updateVisuals(result);
    
    // Performance optimization: batch timing operations
    const frameEndTime = performance.now();
    const frameProcessTime = frameEndTime - frameStartTime;
    
    // Check performance and adjust frame rate if needed
    const stats = this.frameRateLimiter.getStats();
    if (stats.frameDrops === 0) {
      this.frameRateLimiter.recoverPerformance();
    }
    
    // Performance monitoring (development only)
    if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'development' && frameProcessTime > 16.67) { // > 60fps threshold
      console.warn(`[PitchDetector] Frame processing took ${frameProcessTime.toFixed(2)}ms (>16.67ms threshold)`);
    }
    
    this.animationFrame = requestAnimationFrame(() => this.detectPitch());
  }

  /**
   * Harmonic correction system with configurable parameters
   * 
   * @private
   * @description Analyzes frequency history to detect and correct harmonic errors
   * like octave jumping. Uses configurable confidence thresholds and time windows
   * to balance correction accuracy with responsiveness.
   * 
   * @param frequency - The detected frequency to potentially correct
   * @param volume - The current volume level for confidence calculation
   * @returns The corrected frequency or original if no correction needed
   */
  private correctHarmonic(frequency: number, volume: number): number {
    if (!this.harmonicConfig.enabled) {
      this.previousFrequency = frequency;
      return frequency;
    }

    const now = performance.now();

    // 履歴から古いデータを削除
    this.harmonicHistory = this.harmonicHistory.filter(
      h => now - h.timestamp < this.harmonicConfig.historyWindow
    );

    // ★【重要】履歴には補正前の「生の周波数」のみを追加する
    this.harmonicHistory.push({ frequency: frequency, confidence: volume, timestamp: now });

    if (this.harmonicHistory.length < 8) { // 十分な履歴が溜まるまで補正しない（5→8に厳格化）
      this.previousFrequency = frequency;
      return frequency;
    }

    // 履歴内の平均周波数を計算
    const avgFrequency = this.harmonicHistory.reduce((sum, h) => sum + h.frequency, 0) / this.harmonicHistory.length;

    const octaveUp = frequency * 2;
    const octaveDown = frequency / 2;
    const diffCurrent = Math.abs(frequency - avgFrequency);
    const diffUp = Math.abs(octaveUp - avgFrequency);
    const diffDown = Math.abs(octaveDown - avgFrequency);

    let correctedFrequency = frequency;

    // 現在の周波数よりも、オクターブ下のほうが履歴の平均に近い場合、オクターブ下と判断
    if (diffDown < diffCurrent && diffDown < diffUp) {
      correctedFrequency = octaveDown;
      if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'development') {
        console.log(`🔧 [PitchDetector] Octave correction DOWN: ${frequency.toFixed(1)}Hz → ${correctedFrequency.toFixed(1)}Hz (avg: ${avgFrequency.toFixed(1)}Hz)`);
      }
    } 
    // 現在の周波数よりも、オクターブ上のほうが履歴の平均に近い場合、オクターブ上と判断
    else if (diffUp < diffCurrent && diffUp < diffDown) {
      correctedFrequency = octaveUp;
      if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'development') {
        console.log(`🔧 [PitchDetector] Octave correction UP: ${frequency.toFixed(1)}Hz → ${correctedFrequency.toFixed(1)}Hz (avg: ${avgFrequency.toFixed(1)}Hz)`);
      }
    }

    // 補正後の周波数をpreviousFrequencyとして保持
    this.previousFrequency = correctedFrequency;
    return correctedFrequency;
  }

  /**
   * Reset harmonic correction history and frequency tracking
   * 
   * @private
   * @description Clears the frequency history buffer used for harmonic correction
   * and resets the previous frequency reference. Called when signal quality is poor
   * or when restarting detection to prevent incorrect corrections.
   */
  private resetHarmonicHistory(): void {
    this.harmonicHistory = [];
    this.previousFrequency = 0;
  }

  /**
   * Convert frequency to musical note name and octave number
   * 
   * @private
   * @description Converts a frequency in Hz to standard musical notation using
   * equal temperament tuning (A4 = 440Hz). Calculates semitone distances
   * and maps to chromatic scale positions.
   * 
   * @param frequency - Input frequency in Hz
   * @returns Object containing note name (C, C#, D, etc.) and octave number
   * 
   * @example
   * ```typescript
   * frequencyToNoteAndOctave(440) // { note: 'A', octave: 4 }
   * frequencyToNoteAndOctave(261.63) // { note: 'C', octave: 4 }
   * ```
   */
  private frequencyToNoteAndOctave(frequency: number): { note: string; octave: number | null } {
    const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const A4 = 440;
    
    if (frequency <= 0) return { note: '--', octave: null };
    
    const semitonesFromA4 = Math.round(12 * Math.log2(frequency / A4));
    const noteIndex = (semitonesFromA4 + 9 + 120) % 12;
    const octave = Math.floor((semitonesFromA4 + 9) / 12) + 4;
    
    return { note: noteNames[noteIndex], octave };
  }
  

  /**
   * Convert frequency to cents deviation from the nearest semitone
   * 
   * @private
   * @description Calculates the pitch deviation in cents (1/100th of a semitone)
   * from the nearest equal temperament note. Positive values indicate sharp,
   * negative values indicate flat.
   * 
   * @param frequency - Input frequency in Hz
   * @returns Cents deviation (-50 to +50 cents from nearest note)
   * 
   * @example
   * ```typescript
   * frequencyToCents(440) // 0 (exactly A4)
   * frequencyToCents(446) // ~25 cents sharp
   * frequencyToCents(435) // ~-20 cents flat
   * ```
   */
  private frequencyToCents(frequency: number): number {
    const A4 = 440;
    const semitonesFromA4 = 12 * Math.log2(frequency / A4);
    const nearestSemitone = Math.round(semitonesFromA4);
    const centsDeviation = (semitonesFromA4 - nearestSemitone) * 100;
    return Math.round(centsDeviation);
  }

  /**
   * Process silence detection logic and manage timeout handlers
   * 
   * @private
   * @description Monitors volume levels to detect periods of silence and triggers
   * appropriate warnings and timeouts. Manages silence detection state and timers
   * to provide automatic recovery from idle states.
   * 
   * @param currentVolume - Current volume level to evaluate for silence
   */
  private processSilenceDetection(currentVolume: number): void {
    if (!this.silenceDetectionConfig.enabled) {
      return;
    }
    
    const now = Date.now();
    const volumeThreshold = this.silenceDetectionConfig.minVolumeThreshold || 0.01;
    const isCurrentlySilent = currentVolume < volumeThreshold;
    
    if (isCurrentlySilent) {
      // Start tracking silence if not already doing so
      if (!this.isSilent) {
        this.isSilent = true;
        this.silenceStartTime = now;
        this.hasWarned = false;
        
        console.log('🔇 [PitchDetector] Silence detected, starting timer');
        
        // Schedule warning
        if (this.silenceDetectionConfig.warningThreshold) {
          this.silenceWarningTimer = window.setTimeout(() => {
            this.handleSilenceWarning();
          }, this.silenceDetectionConfig.warningThreshold);
        }
        
        // Schedule timeout
        if (this.silenceDetectionConfig.timeoutThreshold) {
          this.silenceTimeoutTimer = window.setTimeout(() => {
            this.handleSilenceTimeout();
          }, this.silenceDetectionConfig.timeoutThreshold);
        }
      }
    } else {
      // Voice detected - reset silence tracking
      if (this.isSilent) {
        const silenceDuration = this.silenceStartTime ? now - this.silenceStartTime : 0;
        console.log(`🔊 [PitchDetector] Voice recovered after ${silenceDuration}ms of silence`);
        
        this.resetSilenceTracking();
        
        // Notify recovery
        if (this.silenceDetectionConfig.onSilenceRecovered) {
          this.silenceDetectionConfig.onSilenceRecovered();
        }
      }
    }
  }
  
  /**
   * Handle silence warning
   */
  private handleSilenceWarning(): void {
    if (!this.hasWarned && this.silenceStartTime) {
      const duration = Date.now() - this.silenceStartTime;
      this.hasWarned = true;
      
      console.log(`⚠️ [PitchDetector] Silence warning: ${duration}ms`);
      
      if (this.silenceDetectionConfig.onSilenceWarning) {
        this.silenceDetectionConfig.onSilenceWarning(duration);
      }
    }
  }
  
  /**
   * Handle silence timeout
   */
  private handleSilenceTimeout(): void {
    console.log('⏰ [PitchDetector] Silence timeout reached');
    
    if (this.silenceDetectionConfig.onSilenceTimeout) {
      this.silenceDetectionConfig.onSilenceTimeout();
    }
    
    // Optionally stop detection on timeout
    this.stopDetection();
    this.resetSilenceTracking();
  }
  
  /**
   * Reset silence tracking state
   */
  private resetSilenceTracking(): void {
    this.isSilent = false;
    this.silenceStartTime = null;
    this.hasWarned = false;
    
    // Clear timers
    if (this.silenceWarningTimer) {
      clearTimeout(this.silenceWarningTimer);
      this.silenceWarningTimer = null;
    }
    
    if (this.silenceTimeoutTimer) {
      clearTimeout(this.silenceTimeoutTimer);
      this.silenceTimeoutTimer = null;
    }
  }

  /**
   * Reset display state and immediately update UI elements
   */
  resetDisplayState(): void {
    this.currentVolume = 0;
    this.rawVolume = 0;
    this.currentFrequency = 0;
    this.detectedNote = '--';
    this.detectedOctave = null;
    this.pitchClarity = 0;
    this.stableVolume = 0;
    
    // Clear buffers
    this.initializeVolumeHistory();
    
    // Reset harmonic correction
    this.resetHarmonicHistory();
    
    // Reset silence detection
    this.resetSilenceTracking();
    
    console.log('🔄 [PitchDetector] Display state reset');
    
    // Immediately update UI to reflect reset state by forcing a manual update
    this.forceUIUpdate();
    console.log('✅ [PitchDetector] UI forcefully updated to reflect reset state');
  }

  /**
   * Force UI update with current internal state (reset values)
   * @private
   */
  private forceUIUpdate(): void {
    try {
      // Reset common volume bar selectors
      const volumeBarSelectors = [
        '#volume-bar', '#mic-volume-bar', '#range-volume-bar', '#practice-volume-bar',
        '[id*="volume-bar"]', '.volume-bar'
      ];
      
      volumeBarSelectors.forEach(selector => {
        const element = document.querySelector(selector);
        if (element) {
          if (element instanceof HTMLProgressElement) {
            element.value = 0;
          } else {
            (element as HTMLElement).style.width = '0%';
          }
        }
      });

      // Reset common volume text selectors
      const volumeTextSelectors = [
        '#volume-text', '#mic-volume-text', '#range-volume-text', '#practice-volume-text',
        '[id*="volume-text"]', '.volume-text'
      ];
      
      volumeTextSelectors.forEach(selector => {
        const element = document.querySelector(selector);
        if (element) {
          element.textContent = '0.0%';
        }
      });

      // Reset common frequency selectors
      const frequencySelectors = [
        '#frequency', '#mic-frequency', '#range-frequency', '#practice-frequency',
        '[id*="frequency"]', '.frequency', '#freq-1', '#freq-2', '#freq-3'
      ];
      
      frequencySelectors.forEach(selector => {
        const element = document.querySelector(selector);
        if (element) {
          element.textContent = '0.0 Hz';
        }
      });

      // Reset common note selectors
      const noteSelectors = [
        '#note', '#note-display', '#mic-note', '#range-note', '#practice-note',
        '[id*="note"]', '.note', '.note-display'
      ];
      
      noteSelectors.forEach(selector => {
        const element = document.querySelector(selector);
        if (element) {
          element.textContent = '--';
        }
      });
    } catch (error) {
      console.warn('⚠️ [PitchDetector] Error in forceUIUpdate:', (error as Error).message);
    }
  }

  /**
   * Enable/disable harmonic correction
   */
  setHarmonicCorrectionEnabled(enabled: boolean): void {
    this.disableHarmonicCorrection = !enabled;
    if (!enabled) {
      this.resetHarmonicHistory();
    }
  }
  
  /**
   * Update silence detection configuration
   */
  setSilenceDetectionConfig(config: Partial<SilenceDetectionConfig>): void {
    this.silenceDetectionConfig = {
      ...this.silenceDetectionConfig,
      ...config
    };
    
    // Reset tracking if disabled
    if (!this.silenceDetectionConfig.enabled) {
      this.resetSilenceTracking();
    }
    
    console.log('🔇 [PitchDetector] Silence detection config updated:', this.silenceDetectionConfig);
  }
  
  /**
   * Get current silence detection status
   */
  getSilenceStatus(): {
    isEnabled: boolean;
    isSilent: boolean;
    silenceDuration: number | null;
    hasWarned: boolean;
  } {
    const silenceDuration = this.silenceStartTime && this.isSilent 
      ? Date.now() - this.silenceStartTime 
      : null;
      
    return {
      isEnabled: this.silenceDetectionConfig.enabled || false,
      isSilent: this.isSilent,
      silenceDuration,
      hasWarned: this.hasWarned
    };
  }

  /**
   * Get initialization status
   */
  getIsInitialized(): boolean {
    return this.isInitialized && this.componentState === 'ready';
  }

  /**
   * Get current state
   */
  getState() {
    return {
      componentState: this.componentState,
      isInitialized: this.isInitialized,
      isDetecting: this.isDetecting,
      lastError: this.lastError,
      hasRequiredComponents: !!(this.analyser && this.pitchDetector)
    };
  }

  /**
   * Get current detection result
   */
  getCurrentResult(): PitchDetectionResult {
    return {
      frequency: this.currentFrequency,
      note: this.detectedNote,
      clarity: this.pitchClarity,
      volume: this.currentFrequency > 0 ? this.rawVolume : 0
    };
  }

  /**
   * Process audio data with high priority for real-time callback delivery
   * 
   * @private
   * @description Handles critical audio processing that requires low latency.
   * Runs at the full adaptive frame rate (30-60 FPS) to ensure responsive
   * pitch detection callbacks for real-time applications.
   * 
   * @param result - Complete pitch detection result to process
   */
  private processAudioData(result: PitchDetectionResult): void {
    // Critical audio processing that needs low latency
    // This runs at the full adaptive frame rate (30-60 FPS)
    
    // Callback for real-time audio processing
    this.callbacks.onPitchUpdate?.(result);
  }
  
  /**
   * Update visual elements with lower priority rendering
   * 
   * @private
   * @description Handles visual updates that can be throttled to maintain performance.
   * Visual rendering can be limited to 30 FPS without affecting audio processing quality.
   * The underscore prefix indicates intentional parameter non-use.
   * 
   * @param _result - Pitch detection result (unused, handled by UI layer)
   */
  private updateVisuals(_result: PitchDetectionResult): void {
    // Visual updates can be throttled to 30 FPS
    // This is handled by the UI layer if needed
    
    // The callback can decide to throttle visual updates
    // For now, we pass through all updates
    // Note: result parameter prefixed with _ to indicate intentional non-use
  }
  
  /**
   * Get current performance statistics
   */
  getPerformanceStats(): {
    currentFPS: number;
    frameDrops: number;
    latency: number;
  } {
    return this.frameRateLimiter.getStats();
  }
  
  /**
   * Reinitialize detector
   */
  async reinitialize(): Promise<void> {
    console.log('🔄 [PitchDetector] Starting reinitialization');
    
    // Cleanup current state
    this.cleanup();
    
    // Short wait to ensure resource release
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Execute reinitialization
    await this.initialize();
    
    console.log('✅ [PitchDetector] Reinitialization complete');
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    console.log('🧹 [PitchDetector] Starting cleanup');
    
    this.stopDetection();
    
    // Notify AudioManager to release created Analysers
    if (this.analyserIds.length > 0) {
      this.audioManager.release(this.analyserIds);
      console.log('📤 [PitchDetector] Notified AudioManager of Analyser release:', this.analyserIds);
      this.analyserIds = [];
    }
    
    // Reset state
    this.componentState = 'uninitialized';
    this.isInitialized = false;
    this.lastError = null;
    
    // Clear references (actual resources managed by AudioManager)
    this.analyser = null;
    this.rawAnalyser = null;
    this.pitchDetector = null;
    
    // Clear history
    this.initializeVolumeHistory();
    this.resetHarmonicHistory();
    
    console.log('✅ [PitchDetector] Cleanup complete');
  }

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
  getLatestResult(): PitchDetectionResult | null {
    if (!this.isDetecting || this.componentState !== 'detecting') {
      return null;
    }

    return {
      frequency: this.currentFrequency,
      note: this.detectedNote,
      octave: this.detectedOctave ?? 0,
      volume: this.currentVolume,
      rawVolume: this.rawVolume,
      clarity: this.pitchClarity,
      timestamp: Date.now()
    };
  }

  /**
   * Destroys the PitchDetector and cleans up all resources
   * 
   * @example
   * ```typescript
   * pitchDetector.destroy();
   * console.log('PitchDetector destroyed and resources cleaned up');
   * ```
   */
  destroy(): void {
    this.stopDetection();
    
    // Notify AudioManager to release created Analysers
    if (this.analyserIds.length > 0) {
      this.audioManager.release(this.analyserIds);
      console.log('📤 [PitchDetector] Notified AudioManager of Analyser release:', this.analyserIds);
      this.analyserIds = [];
    }
    
    // Reset state
    this.componentState = 'uninitialized';
    this.isInitialized = false;
    this.lastError = null;
    
    // Clear references (actual resources managed by AudioManager)
    this.analyser = null;
  }

  /**
   * Gets current PitchDetector status for debugging and monitoring
   * 
   * @returns Status object with component state and performance metrics
   */
  getStatus() {
    return {
      componentState: this.componentState,
      isInitialized: this.isInitialized,
      isDetecting: this.isDetecting,
      isRunning: this.isDetecting,
      currentVolume: this.currentVolume,
      rawVolume: this.rawVolume,
      currentFrequency: this.currentFrequency,
      detectedNote: this.detectedNote,
      detectedOctave: this.detectedOctave,
      currentClarity: this.pitchClarity,
      lastError: this.lastError,
      frameRateStatus: this.frameRateLimiter?.getStats(),
      deviceSpecs: this.deviceSpecs,
      hasRequiredComponents: !!(this.analyser && this.pitchDetector),
      harmonicConfig: this.harmonicConfig,
      volumeHistoryConfig: this.volumeHistoryConfig
    };
  }

  /**
   * Initialize volume history buffer based on configuration
   * 
   * @private
   * @description Creates either a regular array or TypedArray buffer based on config
   */
  private initializeVolumeHistory(): void {
    const length = this.volumeHistoryConfig.historyLength;
    
    if (this.volumeHistoryConfig.useTypedArray) {
      this.volumeHistory = new Float32Array(length);
    } else {
      this.volumeHistory = new Array(length).fill(0);
    }
  }

  /**
   * Add new volume value to history buffer with efficient circular buffer operation
   * 
   * @private
   * @param volume - Volume value to add to history
   */
  private addToVolumeHistory(volume: number): void {
    if (this.volumeHistory instanceof Float32Array) {
      // Efficient circular buffer for TypedArray
      this.volumeHistory.copyWithin(0, 1);
      this.volumeHistory[this.volumeHistory.length - 1] = volume;
    } else {
      // Traditional array operations
      this.volumeHistory.push(volume);
      if (this.volumeHistory.length > this.volumeHistoryConfig.historyLength) {
        this.volumeHistory.shift();
      }
    }
  }

  /**
   * Calculate average volume from history buffer
   * 
   * @private
   * @returns Average volume value
   */
  private calculateVolumeAverage(): number {
    if (this.volumeHistory instanceof Float32Array) {
      let sum = 0;
      for (let i = 0; i < this.volumeHistory.length; i++) {
        sum += this.volumeHistory[i];
      }
      return sum / this.volumeHistory.length;
    } else {
      return this.volumeHistory.reduce((sum, v) => sum + v, 0) / this.volumeHistory.length;
    }
  }

  /**
   * Update harmonic correction configuration
   * 
   * @param config - Partial harmonic correction configuration to update
   */
  updateHarmonicConfig(config: Partial<HarmonicCorrectionConfig>): void {
    this.harmonicConfig = { ...this.harmonicConfig, ...config };
    
    // Reset harmonic history when configuration changes
    this.resetHarmonicHistory();
    
    if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'development') {
      console.log('🔧 [PitchDetector] Harmonic correction config updated:', this.harmonicConfig);
    }
  }

  /**
   * Update volume history configuration
   * 
   * @param config - Partial volume history configuration to update
   */
  updateVolumeHistoryConfig(config: Partial<VolumeHistoryConfig>): void {
    this.volumeHistoryConfig = { ...this.volumeHistoryConfig, ...config };
    
    // Reinitialize volume history with new configuration
    this.initializeVolumeHistory();
    
    if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'development') {
      console.log('📊 [PitchDetector] Volume history config updated:', this.volumeHistoryConfig);
    }
  }
}