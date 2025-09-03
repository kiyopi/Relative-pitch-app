/**
 * HarmonicCorrection - Advanced harmonic detection and correction
 *
 * Provides sophisticated harmonic analysis and correction algorithms
 * Handles complex harmonic patterns, subharmonics, and frequency drift
 */
import type { HarmonicCorrectionResult } from '../types';
export declare class HarmonicCorrection {
    private historyBuffer;
    private config;
    constructor(config?: Partial<typeof HarmonicCorrection.prototype.config>);
    /**
     * Apply harmonic correction to detected frequency
     */
    correctFrequency(frequency: number, volume?: number): HarmonicCorrectionResult;
    /**
     * Analyze frequency for harmonic patterns
     */
    private analyzeHarmonics;
    /**
     * Find potential fundamental frequencies for a given detected frequency
     */
    private findFundamentalCandidates;
    /**
     * Calculate confidence that a frequency pattern represents a harmonic series
     */
    private calculateHarmonicConfidence;
    /**
     * Add frequency detection to history
     */
    private addToHistory;
    /**
     * Clean old entries from history
     */
    private cleanHistory;
    /**
     * Reset correction history
     */
    resetHistory(): void;
    /**
     * Get current analysis statistics
     */
    getAnalysisStats(): {
        historyLength: number;
        averageConfidence: number;
        frequencyRange: {
            min: number;
            max: number;
        } | null;
        stabilityScore: number;
    };
    /**
     * Configure correction parameters
     */
    updateConfig(newConfig: Partial<typeof this.config>): void;
}
//# sourceMappingURL=HarmonicCorrection.d.ts.map