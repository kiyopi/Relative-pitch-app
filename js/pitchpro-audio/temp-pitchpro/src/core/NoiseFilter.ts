/**
 * NoiseFilter - Advanced 3-Stage Noise Reduction Filter Chain
 * 
 * @description Implements sophisticated cascade filtering optimized for voice detection
 * and pitch analysis. Removes environmental noise while preserving vocal frequencies
 * essential for accurate pitch detection.
 * 
 * **Filter Stages:**
 * 1. **Highpass Filter** (80Hz) - Removes low-frequency environmental noise, breathing sounds
 * 2. **Lowpass Filter** (800Hz) - Removes high-frequency noise while preserving vocal harmonics  
 * 3. **Notch Filter** (60Hz) - Eliminates electrical power line interference
 * 
 * @example
 * ```typescript
 * const noiseFilter = new NoiseFilter(audioContext, {
 *   highpassFreq: 100,  // More aggressive low-cut
 *   lowpassFreq: 1000,  // Extended high-frequency range
 *   useFilters: true
 * });
 * 
 * // Connect in audio chain
 * sourceNode.connect(noiseFilter.connect(inputNode, analyserNode));
 * ```
 * 
 * @version 1.1.3
 * @since 1.0.0
 */

import type { NoiseFilterConfig } from '../types';
import { 
  AudioContextError,
  PitchProError,
  ErrorCode,
  ErrorMessageBuilder
} from '../utils/errors';

export class NoiseFilter {
  /** @private AudioContext for creating filter nodes */
  private audioContext: AudioContext;
  
  /** @private Complete filter configuration with defaults applied */
  private config: Required<NoiseFilterConfig>;
  
  /** @private Highpass filter node for low-frequency noise removal */
  private highpassFilter: BiquadFilterNode | null = null;
  
  /** @private Lowpass filter node for high-frequency noise removal */
  private lowpassFilter: BiquadFilterNode | null = null;
  
  /** @private Notch filter node for power line noise elimination */
  private notchFilter: BiquadFilterNode | null = null;
  
  /** @private Filter chain connection state */
  private isConnected = false;
  
  /** @private Input node reference for disconnection */
  private inputNode: AudioNode | null = null;
  
  /** @private Output node reference for disconnection */
  private outputNode: AudioNode | null = null;

  /**
   * Creates a new NoiseFilter with configurable 3-stage filtering
   * 
   * @param audioContext - Web Audio API AudioContext instance
   * @param config - Optional filter configuration to override defaults
   * @param config.highpassFreq - Highpass cutoff frequency in Hz (default: 80)
   * @param config.lowpassFreq - Lowpass cutoff frequency in Hz (default: 800)  
   * @param config.notchFreq - Notch filter center frequency in Hz (default: 60)
   * @param config.highpassQ - Highpass filter Q factor (default: 0.7)
   * @param config.lowpassQ - Lowpass filter Q factor (default: 0.7)
   * @param config.notchQ - Notch filter Q factor (default: 10.0)
   * @param config.useFilters - Enable/disable entire filter chain (default: true)
   * 
   * @example
   * ```typescript
   * // Standard voice filtering
   * const voiceFilter = new NoiseFilter(audioContext);
   * 
   * // Custom instrument filtering  
   * const instrumentFilter = new NoiseFilter(audioContext, {
   *   highpassFreq: 60,   // Allow deeper frequencies
   *   lowpassFreq: 2000,  // Extended harmonic range
   *   notchQ: 20.0        // Sharper power line rejection
   * });
   * 
   * // Bypass filtering
   * const bypassFilter = new NoiseFilter(audioContext, {
   *   useFilters: false
   * });
   * ```
   */
  constructor(audioContext: AudioContext, config: NoiseFilterConfig = {}) {
    this.audioContext = audioContext;
    this.config = {
      highpassFreq: 80,
      lowpassFreq: 800,
      notchFreq: 60,
      highpassQ: 0.7,
      lowpassQ: 0.7,
      notchQ: 10.0,
      useFilters: true,
      ...config
    };
    
    this.createFilterChain();
  }

  /**
   * Create the 3-stage filter chain
   */
  private createFilterChain(): void {
    if (!this.config.useFilters) {
      console.log('🔇 [NoiseFilter] Filters disabled - bypassing filter chain');
      return;
    }

    try {
      // 1. Highpass filter (remove low frequency noise: cut below 80Hz)
      this.highpassFilter = this.audioContext.createBiquadFilter();
      this.highpassFilter.type = 'highpass';
      this.highpassFilter.frequency.setValueAtTime(this.config.highpassFreq, this.audioContext.currentTime);
      this.highpassFilter.Q.setValueAtTime(this.config.highpassQ, this.audioContext.currentTime);

      // 2. Lowpass filter (remove high frequency noise: cut above 800Hz)
      this.lowpassFilter = this.audioContext.createBiquadFilter();
      this.lowpassFilter.type = 'lowpass';
      this.lowpassFilter.frequency.setValueAtTime(this.config.lowpassFreq, this.audioContext.currentTime);
      this.lowpassFilter.Q.setValueAtTime(this.config.lowpassQ, this.audioContext.currentTime);

      // 3. Notch filter (remove power line noise: 60Hz)
      this.notchFilter = this.audioContext.createBiquadFilter();
      this.notchFilter.type = 'notch';
      this.notchFilter.frequency.setValueAtTime(this.config.notchFreq, this.audioContext.currentTime);
      this.notchFilter.Q.setValueAtTime(this.config.notchQ, this.audioContext.currentTime);

      console.log('✅ [NoiseFilter] 3-stage filter chain created', {
        highpass: `${this.config.highpassFreq}Hz (Q=${this.config.highpassQ})`,
        lowpass: `${this.config.lowpassFreq}Hz (Q=${this.config.lowpassQ})`,
        notch: `${this.config.notchFreq}Hz (Q=${this.config.notchQ})`
      });

    } catch (error) {
      const structuredError = new AudioContextError(
        'ノイズフィルターチェーンの初期化に失敗しました。オーディオシステムのサポート状況を確認してください。',
        {
          operation: 'createFilterChain',
          originalError: (error as Error).message,
          filterConfig: this.config,
          audioContextState: this.audioContext.state,
          sampleRate: this.audioContext.sampleRate
        }
      );
      
      ErrorMessageBuilder.logError(structuredError, 'NoiseFilter initialization');
      console.error('❌ [NoiseFilter] Failed to create filter chain:', structuredError.toJSON());
      throw structuredError;
    }
  }

  /**
   * Connects the filter chain between input and output nodes in audio processing pipeline
   * 
   * @description Creates audio connections through the 3-stage filter chain or bypasses
   * if filtering is disabled. Handles both inline filtering and return-node patterns.
   * 
   * @param inputNode - Source audio node (e.g., MediaStreamAudioSourceNode)
   * @param outputNode - Optional destination node (e.g., AnalyserNode)
   * @returns The final output node in the chain for further connections
   * 
   * @example
   * ```typescript
   * // Direct connection pattern
   * sourceNode.connect(noiseFilter.connect(inputNode, analyserNode));
   * 
   * // Chain connection pattern
   * const filteredNode = noiseFilter.connect(sourceNode);
   * filteredNode.connect(analyserNode);
   * 
   * // Bypass mode (useFilters: false)
   * const passthroughNode = noiseFilter.connect(sourceNode, analyserNode);
   * ```
   */
  connect(inputNode: AudioNode, outputNode?: AudioNode): AudioNode {
    if (!this.config.useFilters) {
      // Bypass filtering - direct connection
      if (outputNode) {
        inputNode.connect(outputNode);
      }
      return inputNode;
    }

    if (!this.highpassFilter || !this.lowpassFilter || !this.notchFilter) {
      const error = new PitchProError(
        'ノイズフィルターが正しく初期化されていません。コンストラクタでuseFilters: trueで初期化してください。',
        ErrorCode.AUDIO_CONTEXT_ERROR,
        {
          operation: 'connect',
          useFilters: this.config.useFilters,
          hasHighpassFilter: !!this.highpassFilter,
          hasLowpassFilter: !!this.lowpassFilter,
          hasNotchFilter: !!this.notchFilter
        }
      );
      
      ErrorMessageBuilder.logError(error, 'NoiseFilter connection');
      throw error;
    }

    try {
      // Disconnect any existing connections
      this.disconnect();

      // Store references
      this.inputNode = inputNode;
      this.outputNode = outputNode || null;

      // Create filter chain: input → highpass → lowpass → notch → output
      inputNode.connect(this.highpassFilter);
      this.highpassFilter.connect(this.lowpassFilter);
      this.lowpassFilter.connect(this.notchFilter);
      
      if (outputNode) {
        this.notchFilter.connect(outputNode);
      }

      this.isConnected = true;

      console.log('🔗 [NoiseFilter] Filter chain connected');
      
      // Return the final node in the chain (notch filter) for further connections
      return this.notchFilter!;

    } catch (error) {
      const connectionError = new AudioContextError(
        'ノイズフィルターの接続に失敗しました。オーディオノードの接続状態を確認してください。',
        {
          operation: 'connect',
          originalError: (error as Error).message,
          hasInputNode: !!this.inputNode,
          hasOutputNode: !!this.outputNode,
          isConnected: this.isConnected,
          filterConfig: this.config
        }
      );
      
      ErrorMessageBuilder.logError(connectionError, 'NoiseFilter audio connection');
      console.error('❌ [NoiseFilter] Connection failed:', connectionError.toJSON());
      throw connectionError;
    }
  }

  /**
   * Disconnects all filter nodes and cleans up audio connections
   * 
   * @description Safely disconnects all filter nodes in the chain and resets
   * connection state. Safe to call multiple times.
   * 
   * @example
   * ```typescript
   * // Clean up when finished
   * noiseFilter.disconnect();
   * console.log('Filter chain disconnected');
   * ```
   */
  disconnect(): void {
    try {
      if (this.highpassFilter) {
        this.highpassFilter.disconnect();
      }
      if (this.lowpassFilter) {
        this.lowpassFilter.disconnect();
      }
      if (this.notchFilter) {
        this.notchFilter.disconnect();
      }
      
      this.isConnected = false;
      this.inputNode = null;
      this.outputNode = null;

      console.log('🔌 [NoiseFilter] Filter chain disconnected');

    } catch (error) {
      console.warn('⚠️ [NoiseFilter] Disconnect warning:', error);
    }
  }

  /**
   * Updates filter parameters dynamically during runtime
   * 
   * @param params - Object containing new filter parameters
   * @param params.highpassFreq - New highpass cutoff frequency in Hz
   * @param params.lowpassFreq - New lowpass cutoff frequency in Hz
   * @param params.notchFreq - New notch filter center frequency in Hz
   * @param params.highpassQ - New highpass filter Q factor
   * @param params.lowpassQ - New lowpass filter Q factor  
   * @param params.notchQ - New notch filter Q factor
   * 
   * @example
   * ```typescript
   * // Adapt filtering for different content
   * noiseFilter.updateFrequencies({
   *   highpassFreq: 100,  // More aggressive low-cut
   *   lowpassFreq: 1200   // Extended high-frequency range
   * });
   * 
   * // Adjust power line rejection
   * noiseFilter.updateFrequencies({
   *   notchFreq: 50,      // 50Hz power line (Europe)
   *   notchQ: 15.0        // Sharper notch
   * });
   * ```
   */
  updateFrequencies(params: {
    highpassFreq?: number;
    lowpassFreq?: number;
    notchFreq?: number;
    highpassQ?: number;
    lowpassQ?: number;
    notchQ?: number;
  }): void {
    const currentTime = this.audioContext.currentTime;

    try {
      if (params.highpassFreq !== undefined && this.highpassFilter) {
        this.highpassFilter.frequency.setValueAtTime(params.highpassFreq, currentTime);
        this.config.highpassFreq = params.highpassFreq;
      }

      if (params.lowpassFreq !== undefined && this.lowpassFilter) {
        this.lowpassFilter.frequency.setValueAtTime(params.lowpassFreq, currentTime);
        this.config.lowpassFreq = params.lowpassFreq;
      }

      if (params.notchFreq !== undefined && this.notchFilter) {
        this.notchFilter.frequency.setValueAtTime(params.notchFreq, currentTime);
        this.config.notchFreq = params.notchFreq;
      }

      if (params.highpassQ !== undefined && this.highpassFilter) {
        this.highpassFilter.Q.setValueAtTime(params.highpassQ, currentTime);
        this.config.highpassQ = params.highpassQ;
      }

      if (params.lowpassQ !== undefined && this.lowpassFilter) {
        this.lowpassFilter.Q.setValueAtTime(params.lowpassQ, currentTime);
        this.config.lowpassQ = params.lowpassQ;
      }

      if (params.notchQ !== undefined && this.notchFilter) {
        this.notchFilter.Q.setValueAtTime(params.notchQ, currentTime);
        this.config.notchQ = params.notchQ;
      }

      console.log('🔧 [NoiseFilter] Filter parameters updated:', params);

    } catch (error) {
      const updateError = new PitchProError(
        'フィルターパラメータの更新に失敗しました。指定した値が範囲外であるか、フィルターが無効になっている可能性があります。',
        ErrorCode.INVALID_SAMPLE_RATE,
        {
          operation: 'updateFrequencies',
          originalError: (error as Error).message,
          requestedParams: params,
          currentConfig: this.config,
          audioContextTime: this.audioContext.currentTime
        }
      );
      
      ErrorMessageBuilder.logError(updateError, 'NoiseFilter parameter update');
      console.error('❌ [NoiseFilter] Parameter update failed:', updateError.toJSON());
      throw updateError;
    }
  }

  /**
   * Enable or disable the entire filter chain
   */
  setEnabled(enabled: boolean): void {
    if (enabled === this.config.useFilters) {
      return; // No change needed
    }

    this.config.useFilters = enabled;

    if (this.isConnected && this.inputNode) {
      // Reconnect with new settings
      const savedOutputNode = this.outputNode;
      this.disconnect();
      
      if (enabled) {
        // Recreate filters if they were destroyed
        if (!this.highpassFilter) {
          this.createFilterChain();
        }
      }
      
      this.connect(this.inputNode, savedOutputNode || undefined);
    }

    console.log(`🔘 [NoiseFilter] Filters ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Get filter response at specific frequency (for visualization)
   */
  getFilterResponse(frequency: number): { magnitude: number; phase: number } {
    if (!this.config.useFilters || !this.highpassFilter || !this.lowpassFilter || !this.notchFilter) {
      return { magnitude: 1.0, phase: 0.0 };
    }

    try {
      // Create frequency array for single frequency
      const frequencyArray = new Float32Array([frequency]);
      const magnitudeArray = new Float32Array(1);
      const phaseArray = new Float32Array(1);

      // Calculate combined response (simplified - in practice you'd need to chain the calculations)
      this.highpassFilter.getFrequencyResponse(frequencyArray, magnitudeArray, phaseArray);
      const highpassMagnitude = magnitudeArray[0];
      
      this.lowpassFilter.getFrequencyResponse(frequencyArray, magnitudeArray, phaseArray);
      const lowpassMagnitude = magnitudeArray[0];
      
      this.notchFilter.getFrequencyResponse(frequencyArray, magnitudeArray, phaseArray);
      const notchMagnitude = magnitudeArray[0];

      // Combined magnitude (multiply individual filter responses)
      const combinedMagnitude = highpassMagnitude * lowpassMagnitude * notchMagnitude;
      
      return { 
        magnitude: combinedMagnitude, 
        phase: phaseArray[0] 
      };

    } catch (error) {
      const responseError = new PitchProError(
        'フィルター応答の計算に失敗しました。デフォルト値を返します。',
        ErrorCode.PROCESSING_TIMEOUT,
        {
          operation: 'getFilterResponse',
          frequency,
          originalError: (error as Error).message,
          useFilters: this.config.useFilters
        }
      );
      
      ErrorMessageBuilder.logError(responseError, 'Filter response calculation');
      console.warn('⚠️ [NoiseFilter] Filter response calculation failed:', responseError.toJSON());
      return { magnitude: 1.0, phase: 0.0 };
    }
  }

  /**
   * Get current filter configuration
   */
  getConfig(): Required<NoiseFilterConfig> {
    return { ...this.config };
  }

  /**
   * Get filter chain status
   */
  getStatus() {
    return {
      isConnected: this.isConnected,
      useFilters: this.config.useFilters,
      hasFilters: !!(this.highpassFilter && this.lowpassFilter && this.notchFilter),
      filterTypes: this.config.useFilters ? ['highpass', 'lowpass', 'notch'] : [],
      frequencies: {
        highpass: this.config.highpassFreq,
        lowpass: this.config.lowpassFreq,
        notch: this.config.notchFreq
      },
      qFactors: {
        highpass: this.config.highpassQ,
        lowpass: this.config.lowpassQ,
        notch: this.config.notchQ
      }
    };
  }

  /**
   * Get the final output node (for chaining)
   */
  getOutputNode(): AudioNode | null {
    if (!this.config.useFilters || !this.notchFilter) {
      return this.inputNode || null; // Bypass mode
    }
    return this.notchFilter;
  }

  /**
   * Cleanup and destroy filter nodes
   */
  destroy(): void {
    console.log('🗑️ [NoiseFilter] Destroying filter chain');
    
    this.disconnect();
    
    // Note: Filter nodes are automatically garbage collected
    // when disconnected and no longer referenced
    this.highpassFilter = null;
    this.lowpassFilter = null;
    this.notchFilter = null;
    
    console.log('✅ [NoiseFilter] Cleanup complete');
  }

  /**
   * Create a preset configuration for different scenarios
   */
  static getPresetConfig(preset: 'voice' | 'instrument' | 'wide' | 'minimal'): NoiseFilterConfig {
    switch (preset) {
      case 'voice':
        return {
          highpassFreq: 80,   // Remove breath noise
          lowpassFreq: 800,   // Focus on vocal fundamentals
          notchFreq: 60,      // Remove power line hum
          highpassQ: 0.7,
          lowpassQ: 0.7,
          notchQ: 10.0,
          useFilters: true
        };
        
      case 'instrument':
        return {
          highpassFreq: 40,   // Preserve low fundamentals
          lowpassFreq: 2000,  // Allow more harmonics
          notchFreq: 60,      // Remove power line hum
          highpassQ: 0.5,
          lowpassQ: 0.5,
          notchQ: 8.0,
          useFilters: true
        };
        
      case 'wide':
        return {
          highpassFreq: 20,   // Minimal low cut
          lowpassFreq: 5000,  // Minimal high cut
          notchFreq: 60,      // Only power line filtering
          highpassQ: 0.3,
          lowpassQ: 0.3,
          notchQ: 5.0,
          useFilters: true
        };
        
      case 'minimal':
        return {
          highpassFreq: 60,   // Just power line region
          lowpassFreq: 8000,  // Very high cutoff
          notchFreq: 60,      // Power line only
          highpassQ: 0.1,
          lowpassQ: 0.1,
          notchQ: 3.0,
          useFilters: true
        };
        
      default:
        return {
          useFilters: false
        };
    }
  }
}