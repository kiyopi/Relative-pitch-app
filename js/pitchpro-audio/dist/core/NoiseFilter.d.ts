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
export declare class NoiseFilter {
    /** @private AudioContext for creating filter nodes */
    private audioContext;
    /** @private Complete filter configuration with defaults applied */
    private config;
    /** @private Highpass filter node for low-frequency noise removal */
    private highpassFilter;
    /** @private Lowpass filter node for high-frequency noise removal */
    private lowpassFilter;
    /** @private Notch filter node for power line noise elimination */
    private notchFilter;
    /** @private Filter chain connection state */
    private isConnected;
    /** @private Input node reference for disconnection */
    private inputNode;
    /** @private Output node reference for disconnection */
    private outputNode;
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
    constructor(audioContext: AudioContext, config?: NoiseFilterConfig);
    /**
     * Create the 3-stage filter chain
     */
    private createFilterChain;
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
    connect(inputNode: AudioNode, outputNode?: AudioNode): AudioNode;
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
    disconnect(): void;
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
    }): void;
    /**
     * Enable or disable the entire filter chain
     */
    setEnabled(enabled: boolean): void;
    /**
     * Get filter response at specific frequency (for visualization)
     */
    getFilterResponse(frequency: number): {
        magnitude: number;
        phase: number;
    };
    /**
     * Get current filter configuration
     */
    getConfig(): Required<NoiseFilterConfig>;
    /**
     * Get filter chain status
     */
    getStatus(): {
        isConnected: boolean;
        useFilters: boolean;
        hasFilters: boolean;
        filterTypes: string[];
        frequencies: {
            highpass: number;
            lowpass: number;
            notch: number;
        };
        qFactors: {
            highpass: number;
            lowpass: number;
            notch: number;
        };
    };
    /**
     * Get the final output node (for chaining)
     */
    getOutputNode(): AudioNode | null;
    /**
     * Cleanup and destroy filter nodes
     */
    destroy(): void;
    /**
     * Create a preset configuration for different scenarios
     */
    static getPresetConfig(preset: 'voice' | 'instrument' | 'wide' | 'minimal'): NoiseFilterConfig;
}
//# sourceMappingURL=NoiseFilter.d.ts.map