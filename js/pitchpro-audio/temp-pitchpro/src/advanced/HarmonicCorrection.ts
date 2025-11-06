/**
 * HarmonicCorrection - Advanced harmonic detection and correction
 * 
 * Provides sophisticated harmonic analysis and correction algorithms
 * Handles complex harmonic patterns, subharmonics, and frequency drift
 */

import type { HarmonicCorrectionResult } from '../types';

export class HarmonicCorrection {
  private historyBuffer: Array<{
    frequency: number;
    confidence: number;
    timestamp: number;
    volume: number;
  }> = [];
  
  private config = {
    historyWindowMs: 2000,
    minConfidenceThreshold: 0.6,
    harmonicToleranceCents: 30,
    maxHarmonicNumber: 8,
    stabilityWeight: 0.7,
    volumeWeight: 0.3
  };

  constructor(config: Partial<typeof HarmonicCorrection.prototype.config> = {}) {
    this.config = { ...this.config, ...config };
  }

  /**
   * Apply harmonic correction to detected frequency
   */
  correctFrequency(frequency: number, volume: number = 1.0): HarmonicCorrectionResult {
    const now = Date.now();
    
    // Clean old history
    this.cleanHistory(now);
    
    // Add current detection to history
    this.addToHistory(frequency, volume, now);
    
    // Analyze for harmonic patterns
    const analysis = this.analyzeHarmonics(frequency);
    
    // Apply correction if confidence is high enough
    if (analysis.confidence >= this.config.minConfidenceThreshold) {
      return {
        correctedFreq: analysis.correctedFrequency,
        confidence: analysis.confidence,
        correctionApplied: Math.abs(analysis.correctedFrequency - frequency) > 1.0
      };
    }
    
    return {
      correctedFreq: frequency,
      confidence: analysis.confidence,
      correctionApplied: false
    };
  }

  /**
   * Analyze frequency for harmonic patterns
   */
  private analyzeHarmonics(frequency: number): {
    correctedFrequency: number;
    confidence: number;
    harmonicNumber?: number;
    fundamentalCandidate?: number;
  } {
    if (this.historyBuffer.length < 3) {
      return {
        correctedFrequency: frequency,
        confidence: 0.1
      };
    }

    // Get recent stable frequencies
    const recentFrequencies = this.historyBuffer
      .slice(-10)
      .map(entry => entry.frequency);

    // Look for fundamental candidates
    const fundamentalCandidates = this.findFundamentalCandidates(frequency);
    
    let bestCandidate = {
      frequency,
      confidence: 0.1,
      harmonicNumber: 1
    };

    // Test each fundamental candidate
    for (const candidate of fundamentalCandidates) {
      const confidence = this.calculateHarmonicConfidence(
        candidate.fundamental,
        candidate.harmonicNumber,
        recentFrequencies
      );
      
      if (confidence > bestCandidate.confidence) {
        bestCandidate = {
          frequency: candidate.fundamental,
          confidence,
          harmonicNumber: candidate.harmonicNumber
        };
      }
    }

    // If we found a likely harmonic, correct to fundamental
    if (bestCandidate.harmonicNumber > 1 && bestCandidate.confidence > this.config.minConfidenceThreshold) {
      return {
        correctedFrequency: bestCandidate.frequency,
        confidence: bestCandidate.confidence,
        harmonicNumber: bestCandidate.harmonicNumber,
        fundamentalCandidate: bestCandidate.frequency
      };
    }

    return {
      correctedFrequency: frequency,
      confidence: bestCandidate.confidence
    };
  }

  /**
   * Find potential fundamental frequencies for a given detected frequency
   */
  private findFundamentalCandidates(frequency: number): Array<{
    fundamental: number;
    harmonicNumber: number;
    likelihood: number;
  }> {
    const candidates: Array<{
      fundamental: number;
      harmonicNumber: number;
      likelihood: number;
    }> = [];

    // Check if this could be a harmonic of a lower fundamental
    for (let harmonicNum = 2; harmonicNum <= this.config.maxHarmonicNumber; harmonicNum++) {
      const fundamental = frequency / harmonicNum;
      
      // Skip if fundamental is too low for human voice
      if (fundamental < 60) continue;
      
      // Calculate likelihood based on how close it is to exact harmonic ratio
      const exactHarmonic = fundamental * harmonicNum;
      const centDeviation = Math.abs(1200 * Math.log2(frequency / exactHarmonic));
      
      if (centDeviation <= this.config.harmonicToleranceCents) {
        const likelihood = 1.0 - (centDeviation / this.config.harmonicToleranceCents);
        candidates.push({
          fundamental,
          harmonicNumber: harmonicNum,
          likelihood
        });
      }
    }

    // Also consider the frequency itself as fundamental (no correction)
    candidates.push({
      fundamental: frequency,
      harmonicNumber: 1,
      likelihood: 0.5
    });

    return candidates.sort((a, b) => b.likelihood - a.likelihood);
  }

  /**
   * Calculate confidence that a frequency pattern represents a harmonic series
   */
  private calculateHarmonicConfidence(
    fundamental: number,
    _harmonicNumber: number,
    recentFrequencies: number[]
  ): number {
    if (recentFrequencies.length < 3) return 0.1;

    let totalConfidence = 0;
    let validMeasurements = 0;

    // Check how well recent frequencies fit the harmonic pattern
    for (const freq of recentFrequencies) {
      // Find the closest harmonic to this frequency
      let closestHarmonicNum = Math.round(freq / fundamental);
      if (closestHarmonicNum < 1) closestHarmonicNum = 1;
      
      const expectedFreq = fundamental * closestHarmonicNum;
      const centDeviation = Math.abs(1200 * Math.log2(freq / expectedFreq));
      
      if (centDeviation <= this.config.harmonicToleranceCents * 2) {
        const confidence = 1.0 - (centDeviation / (this.config.harmonicToleranceCents * 2));
        totalConfidence += confidence;
        validMeasurements++;
      }
    }

    if (validMeasurements === 0) return 0.1;

    // Average confidence, weighted by stability
    const avgConfidence = totalConfidence / validMeasurements;
    
    // Add stability bonus if we have consistent measurements
    const stabilityBonus = Math.min(validMeasurements / recentFrequencies.length, 1.0);
    
    return Math.min(avgConfidence * this.config.stabilityWeight + stabilityBonus * (1 - this.config.stabilityWeight), 1.0);
  }

  /**
   * Add frequency detection to history
   */
  private addToHistory(frequency: number, volume: number, timestamp: number): void {
    // Calculate confidence based on volume and stability
    const volumeConfidence = Math.min(volume, 1.0);
    let stabilityConfidence = 0.5;
    
    if (this.historyBuffer.length > 0) {
      const lastFreq = this.historyBuffer[this.historyBuffer.length - 1].frequency;
      const freqRatio = Math.max(frequency, lastFreq) / Math.min(frequency, lastFreq);
      stabilityConfidence = Math.max(0, 1.0 - (freqRatio - 1.0) * 5); // Penalty for large jumps
    }
    
    const confidence = volumeConfidence * this.config.volumeWeight + 
                      stabilityConfidence * (1 - this.config.volumeWeight);
    
    this.historyBuffer.push({
      frequency,
      confidence,
      timestamp,
      volume
    });
    
    // Limit buffer size
    if (this.historyBuffer.length > 50) {
      this.historyBuffer.shift();
    }
  }

  /**
   * Clean old entries from history
   */
  private cleanHistory(currentTime: number): void {
    const cutoffTime = currentTime - this.config.historyWindowMs;
    this.historyBuffer = this.historyBuffer.filter(entry => entry.timestamp > cutoffTime);
  }

  /**
   * Reset correction history
   */
  resetHistory(): void {
    this.historyBuffer = [];
  }

  /**
   * Get current analysis statistics
   */
  getAnalysisStats(): {
    historyLength: number;
    averageConfidence: number;
    frequencyRange: { min: number; max: number } | null;
    stabilityScore: number;
  } {
    if (this.historyBuffer.length === 0) {
      return {
        historyLength: 0,
        averageConfidence: 0,
        frequencyRange: null,
        stabilityScore: 0
      };
    }

    const frequencies = this.historyBuffer.map(entry => entry.frequency);
    const confidences = this.historyBuffer.map(entry => entry.confidence);
    
    const avgConfidence = confidences.reduce((sum, conf) => sum + conf, 0) / confidences.length;
    const minFreq = Math.min(...frequencies);
    const maxFreq = Math.max(...frequencies);
    
    // Calculate stability as inverse of coefficient of variation
    const mean = frequencies.reduce((sum, freq) => sum + freq, 0) / frequencies.length;
    const variance = frequencies.reduce((sum, freq) => sum + Math.pow(freq - mean, 2), 0) / frequencies.length;
    const coefficientOfVariation = Math.sqrt(variance) / mean;
    const stabilityScore = Math.max(0, 1.0 - coefficientOfVariation);

    return {
      historyLength: this.historyBuffer.length,
      averageConfidence: avgConfidence,
      frequencyRange: { min: minFreq, max: maxFreq },
      stabilityScore
    };
  }

  /**
   * Configure correction parameters
   */
  updateConfig(newConfig: Partial<typeof this.config>): void {
    this.config = { ...this.config, ...newConfig };
  }
}