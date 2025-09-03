/**
 * NoiseFilter - 3-stage Noise Reduction Filter Chain
 *
 * Implements sophisticated noise filtering for voice detection:
 * 1. Highpass filter - Remove low frequency noise (below 80Hz)
 * 2. Lowpass filter - Remove high frequency noise (above 800Hz)
 * 3. Notch filter - Remove power line noise (60Hz)
 */
import type { NoiseFilterConfig } from '../types';
export declare class NoiseFilter {
    private audioContext;
    private config;
    private highpassFilter;
    private lowpassFilter;
    private notchFilter;
    private isConnected;
    private inputNode;
    private outputNode;
    constructor(audioContext: AudioContext, config?: NoiseFilterConfig);
    /**
     * Create the 3-stage filter chain
     */
    private createFilterChain;
    /**
     * Connect the filter chain between input and output nodes
     */
    connect(inputNode: AudioNode, outputNode?: AudioNode): AudioNode;
    /**
     * Disconnect the filter chain
     */
    disconnect(): void;
    /**
     * Update filter parameters dynamically
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