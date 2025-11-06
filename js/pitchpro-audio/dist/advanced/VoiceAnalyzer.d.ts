/**
 * VoiceAnalyzer - Advanced voice quality and analysis
 *
 * Analyzes voice characteristics, stability, and provides recommendations
 * Includes vibrato detection, breathiness analysis, and vocal health indicators
 */
import type { VoiceAnalysis } from '../types';
export declare class VoiceAnalyzer {
    private analysisBuffer;
    private config;
    constructor(config?: Partial<typeof VoiceAnalyzer.prototype.config>);
    /**
     * Analyze voice characteristics from audio data
     */
    analyzeVoice(frequency: number, volume: number, clarity: number, spectralData?: Float32Array): VoiceAnalysis;
    /**
     * Calculate pitch stability
     */
    private calculateStability;
    /**
     * Detect vibrato characteristics
     */
    private detectVibrato;
    /**
     * Analyze breathiness from spectral data
     */
    private analyzeBreathiness;
    /**
     * Analyze consistency over time
     */
    private analyzeConsistency;
    /**
     * Calculate consistency score for an array of values
     */
    private calculateConsistencyScore;
    /**
     * Calculate overall voice quality
     */
    private calculateOverallQuality;
    /**
     * Generate recommendations based on analysis
     */
    private generateRecommendations;
    /**
     * Smooth frequency data using moving average
     */
    private smoothFrequencies;
    /**
     * Find local extrema (peaks and valleys) in frequency data
     */
    private findExtrema;
    /**
     * Add data to analysis buffer
     */
    private addToBuffer;
    /**
     * Clean old data from buffer
     */
    private cleanBuffer;
    /**
     * Reset analysis buffer
     */
    reset(): void;
    /**
     * Get current buffer statistics
     */
    getBufferStats(): {
        entryCount: number;
        timeSpanMs: number;
        averageVolume: number;
        averageClarity: number;
    };
}
//# sourceMappingURL=VoiceAnalyzer.d.ts.map