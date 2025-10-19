/**
 * VoiceAnalyzer - Advanced voice quality and analysis
 * 
 * Analyzes voice characteristics, stability, and provides recommendations
 * Includes vibrato detection, breathiness analysis, and vocal health indicators
 */

import type { VoiceAnalysis } from '../types';
import { VoiceQuality } from '../types';

export class VoiceAnalyzer {
  private analysisBuffer: Array<{
    frequency: number;
    volume: number;
    clarity: number;
    timestamp: number;
  }> = [];
  
  private config = {
    analysisWindowMs: 3000,
    stabilityThresholdCents: 20,
    vibratoMinRate: 4.5,
    vibratoMaxRate: 7.5,
    vibratoMinDepthCents: 50,
    breathinessThreshold: 0.3,
    minAnalysisTime: 1000
  };

  constructor(config: Partial<typeof VoiceAnalyzer.prototype.config> = {}) {
    this.config = { ...this.config, ...config };
  }

  /**
   * Analyze voice characteristics from audio data
   */
  analyzeVoice(
    frequency: number, 
    volume: number, 
    clarity: number,
    spectralData?: Float32Array
  ): VoiceAnalysis {
    const timestamp = Date.now();
    
    // Add to analysis buffer
    this.addToBuffer(frequency, volume, clarity, timestamp);
    
    // Clean old data
    this.cleanBuffer(timestamp);
    
    // Perform comprehensive analysis
    const stability = this.calculateStability();
    const vibrato = this.detectVibrato();
    const breathiness = spectralData ? this.analyzeBreathiness(spectralData) : null;
    const consistency = this.analyzeConsistency();
    
    // Calculate overall quality
    const quality = this.calculateOverallQuality(stability, vibrato, breathiness, consistency);
    
    // Generate recommendations
    const recommendations = this.generateRecommendations(
      quality,
      stability,
      vibrato,
      breathiness,
      consistency
    );

    return {
      quality,
      stability,
      recommendations
    };
  }

  /**
   * Calculate pitch stability
   */
  private calculateStability(): number {
    if (this.analysisBuffer.length < 10) {
      return 0.5; // Neutral stability for insufficient data
    }

    const frequencies = this.analysisBuffer.map(entry => entry.frequency);
    const validFrequencies = frequencies.filter(freq => freq > 0);
    
    if (validFrequencies.length < 5) {
      return 0.3; // Low stability for sparse data
    }

    // Calculate coefficient of variation
    const mean = validFrequencies.reduce((sum, freq) => sum + freq, 0) / validFrequencies.length;
    const variance = validFrequencies.reduce((sum, freq) => sum + Math.pow(freq - mean, 2), 0) / validFrequencies.length;
    const standardDeviation = Math.sqrt(variance);
    const coefficientOfVariation = standardDeviation / mean;
    
    // Convert to cents for musical relevance
    const deviationCents = coefficientOfVariation * 1200;
    
    // Map to 0-1 stability score
    return Math.max(0, Math.min(1, 1 - (deviationCents / 100)));
  }

  /**
   * Detect vibrato characteristics
   */
  private detectVibrato(): {
    detected: boolean;
    rate: number | null;
    depth: number | null;
    regularity: number | null;
  } {
    if (this.analysisBuffer.length < 30) {
      return { detected: false, rate: null, depth: null, regularity: null };
    }

    const frequencies = this.analysisBuffer.map(entry => entry.frequency).filter(f => f > 0);
    if (frequencies.length < 20) {
      return { detected: false, rate: null, depth: null, regularity: null };
    }

    // Smooth the frequency data
    const smoothed = this.smoothFrequencies(frequencies, 3);
    
    // Find peaks and valleys
    const extrema = this.findExtrema(smoothed);
    
    if (extrema.length < 4) {
      return { detected: false, rate: null, depth: null, regularity: null };
    }

    // Calculate vibrato rate (cycles per second)
    const timeSpan = (this.analysisBuffer[this.analysisBuffer.length - 1].timestamp - 
                     this.analysisBuffer[0].timestamp) / 1000;
    const cycles = extrema.length / 2; // pairs of peaks and valleys
    const rate = cycles / timeSpan;

    // Calculate vibrato depth (in cents)
    const depths = [];
    for (let i = 0; i < extrema.length - 1; i++) {
      const freq1 = smoothed[extrema[i].index];
      const freq2 = smoothed[extrema[i + 1].index];
      if (freq1 > 0 && freq2 > 0) {
        const cents = Math.abs(1200 * Math.log2(freq1 / freq2));
        depths.push(cents);
      }
    }

    const averageDepth = depths.length > 0 ? 
      depths.reduce((sum, depth) => sum + depth, 0) / depths.length : 0;

    // Calculate regularity (consistency of periods)
    const periods = [];
    for (let i = 0; i < extrema.length - 2; i += 2) {
      const period = extrema[i + 2].index - extrema[i].index;
      periods.push(period);
    }

    let regularity = 0;
    if (periods.length > 2) {
      const periodMean = periods.reduce((sum, p) => sum + p, 0) / periods.length;
      const periodVariance = periods.reduce((sum, p) => sum + Math.pow(p - periodMean, 2), 0) / periods.length;
      regularity = Math.max(0, 1 - (Math.sqrt(periodVariance) / periodMean));
    }

    // Determine if vibrato is detected
    const detected = rate >= this.config.vibratoMinRate && 
                    rate <= this.config.vibratoMaxRate &&
                    averageDepth >= this.config.vibratoMinDepthCents;

    return {
      detected,
      rate: rate,
      depth: averageDepth,
      regularity
    };
  }

  /**
   * Analyze breathiness from spectral data
   */
  private analyzeBreathiness(spectralData: Float32Array): number {
    // Analyze high-frequency noise content relative to fundamental
    const fundamentalBin = Math.floor(spectralData.length * 0.1); // Rough estimate
    const noiseBins = spectralData.slice(Math.floor(spectralData.length * 0.7)); // High frequency content
    
    const fundamentalEnergy = spectralData.slice(0, fundamentalBin * 2)
      .reduce((sum, val) => sum + val * val, 0);
    
    const noiseEnergy = noiseBins.reduce((sum, val) => sum + val * val, 0);
    
    if (fundamentalEnergy === 0) return 1.0; // Maximum breathiness if no fundamental
    
    const noiseRatio = noiseEnergy / fundamentalEnergy;
    return Math.min(1.0, noiseRatio);
  }

  /**
   * Analyze consistency over time
   */
  private analyzeConsistency(): number {
    if (this.analysisBuffer.length < 10) return 0.5;

    const volumes = this.analysisBuffer.map(entry => entry.volume);
    const clarities = this.analysisBuffer.map(entry => entry.clarity);
    
    // Calculate consistency metrics
    const volumeConsistency = this.calculateConsistencyScore(volumes);
    const clarityConsistency = this.calculateConsistencyScore(clarities);
    
    return (volumeConsistency + clarityConsistency) / 2;
  }

  /**
   * Calculate consistency score for an array of values
   */
  private calculateConsistencyScore(values: number[]): number {
    if (values.length < 3) return 0.5;

    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const coefficientOfVariation = Math.sqrt(variance) / (mean || 1);
    
    return Math.max(0, Math.min(1, 1 - coefficientOfVariation));
  }

  /**
   * Calculate overall voice quality
   */
  private calculateOverallQuality(
    stability: number,
    vibrato: any,
    breathiness: number | null,
    consistency: number
  ): VoiceQuality {
    // Weight factors for different aspects
    const weights = {
      stability: 0.4,
      consistency: 0.3,
      breathiness: 0.2,
      vibrato: 0.1
    };

    let score = stability * weights.stability + consistency * weights.consistency;
    
    // Breathiness penalty (lower is better for breathiness)
    if (breathiness !== null) {
      score += (1 - Math.min(breathiness, 1)) * weights.breathiness;
    } else {
      score += 0.7 * weights.breathiness; // Neutral if no data
    }
    
    // Vibrato bonus for controlled vibrato
    if (vibrato.detected && vibrato.regularity > 0.7) {
      score += 0.9 * weights.vibrato;
    } else if (vibrato.detected) {
      score += 0.6 * weights.vibrato;
    } else {
      score += 0.5 * weights.vibrato;
    }

    // Map score to quality levels
    if (score >= 0.85) return VoiceQuality.EXCELLENT;
    if (score >= 0.7) return VoiceQuality.GOOD;
    if (score >= 0.5) return VoiceQuality.FAIR;
    return VoiceQuality.POOR;
  }

  /**
   * Generate recommendations based on analysis
   */
  private generateRecommendations(
    quality: VoiceQuality,
    stability: number,
    vibrato: any,
    breathiness: number | null,
    consistency: number
  ): string[] {
    const recommendations: string[] = [];

    // Stability recommendations
    if (stability < 0.5) {
      recommendations.push('音程の安定性を向上させるため、ゆっくりとした発声練習を行ってください');
      recommendations.push('腹式呼吸を意識して、息の流れを一定に保つ練習をしてください');
    } else if (stability < 0.7) {
      recommendations.push('音程の微調整練習で、より正確なピッチコントロールを目指しましょう');
    }

    // Consistency recommendations
    if (consistency < 0.5) {
      recommendations.push('音量と音質の一貫性を保つため、定期的な発声練習を継続してください');
      recommendations.push('録音を聞き返して、自分の声の特徴を把握しましょう');
    }

    // Breathiness recommendations
    if (breathiness !== null && breathiness > 0.6) {
      recommendations.push('声の息漏れが気になります。発声時の喉の締まりを意識してください');
      recommendations.push('ハミング練習で、クリアな声質を目指しましょう');
    }

    // Vibrato recommendations
    if (vibrato.detected) {
      if (vibrato.regularity < 0.5) {
        recommendations.push('ビブラートの規則性を改善するため、メトロノームに合わせた練習をしてください');
      } else if (vibrato.rate > 7.5) {
        recommendations.push('ビブラートの速度が速すぎます。よりゆったりとしたビブラートを練習してください');
      }
    } else if (quality === VoiceQuality.GOOD || quality === VoiceQuality.EXCELLENT) {
      recommendations.push('美しいビブラートの習得に挑戦してみましょう');
    }

    // General recommendations based on quality
    if (quality === VoiceQuality.POOR) {
      recommendations.push('基礎的な発声練習から始めることをお勧めします');
      recommendations.push('専門的な指導を受けることを検討してください');
    } else if (quality === VoiceQuality.EXCELLENT) {
      recommendations.push('素晴らしい声質です。この状態を維持する練習を続けてください');
    }

    return recommendations;
  }

  /**
   * Smooth frequency data using moving average
   */
  private smoothFrequencies(frequencies: number[], windowSize: number): number[] {
    const smoothed: number[] = [];
    
    for (let i = 0; i < frequencies.length; i++) {
      let sum = 0;
      let count = 0;
      
      const start = Math.max(0, i - Math.floor(windowSize / 2));
      const end = Math.min(frequencies.length, i + Math.floor(windowSize / 2) + 1);
      
      for (let j = start; j < end; j++) {
        sum += frequencies[j];
        count++;
      }
      
      smoothed.push(sum / count);
    }
    
    return smoothed;
  }

  /**
   * Find local extrema (peaks and valleys) in frequency data
   */
  private findExtrema(data: number[]): Array<{ index: number; value: number; type: 'peak' | 'valley' }> {
    const extrema: Array<{ index: number; value: number; type: 'peak' | 'valley' }> = [];
    
    for (let i = 1; i < data.length - 1; i++) {
      const prev = data[i - 1];
      const curr = data[i];
      const next = data[i + 1];
      
      if (curr > prev && curr > next) {
        extrema.push({ index: i, value: curr, type: 'peak' });
      } else if (curr < prev && curr < next) {
        extrema.push({ index: i, value: curr, type: 'valley' });
      }
    }
    
    return extrema;
  }

  /**
   * Add data to analysis buffer
   */
  private addToBuffer(frequency: number, volume: number, clarity: number, timestamp: number): void {
    this.analysisBuffer.push({ frequency, volume, clarity, timestamp });
    
    // Limit buffer size
    if (this.analysisBuffer.length > 200) {
      this.analysisBuffer.shift();
    }
  }

  /**
   * Clean old data from buffer
   */
  private cleanBuffer(currentTime: number): void {
    const cutoffTime = currentTime - this.config.analysisWindowMs;
    this.analysisBuffer = this.analysisBuffer.filter(entry => entry.timestamp > cutoffTime);
  }

  /**
   * Reset analysis buffer
   */
  reset(): void {
    this.analysisBuffer = [];
  }

  /**
   * Get current buffer statistics
   */
  getBufferStats(): {
    entryCount: number;
    timeSpanMs: number;
    averageVolume: number;
    averageClarity: number;
  } {
    if (this.analysisBuffer.length === 0) {
      return { entryCount: 0, timeSpanMs: 0, averageVolume: 0, averageClarity: 0 };
    }

    const volumes = this.analysisBuffer.map(entry => entry.volume);
    const clarities = this.analysisBuffer.map(entry => entry.clarity);
    const timeSpan = this.analysisBuffer[this.analysisBuffer.length - 1].timestamp - this.analysisBuffer[0].timestamp;

    return {
      entryCount: this.analysisBuffer.length,
      timeSpanMs: timeSpan,
      averageVolume: volumes.reduce((sum, vol) => sum + vol, 0) / volumes.length,
      averageClarity: clarities.reduce((sum, clarity) => sum + clarity, 0) / clarities.length
    };
  }
}