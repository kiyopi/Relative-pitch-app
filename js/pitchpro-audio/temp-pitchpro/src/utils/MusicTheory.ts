/**
 * MusicTheory - Musical theory utilities and calculations
 * 
 * Provides utilities for scales, chords, intervals, and musical analysis
 * Supports various temperaments and tuning systems
 */

import type { MusicalNote, MusicalInterval } from '../types';
import { FrequencyUtils } from './FrequencyUtils';

export class MusicTheory {
  // Scale patterns (in semitones from root)
  static readonly SCALE_PATTERNS = {
    major: [0, 2, 4, 5, 7, 9, 11],
    naturalMinor: [0, 2, 3, 5, 7, 8, 10],
    harmonicMinor: [0, 2, 3, 5, 7, 8, 11],
    melodicMinor: [0, 2, 3, 5, 7, 9, 11],
    dorian: [0, 2, 3, 5, 7, 9, 10],
    phrygian: [0, 1, 3, 5, 7, 8, 10],
    lydian: [0, 2, 4, 6, 7, 9, 11],
    mixolydian: [0, 2, 4, 5, 7, 9, 10],
    locrian: [0, 1, 3, 5, 6, 8, 10],
    pentatonicMajor: [0, 2, 4, 7, 9],
    pentatonicMinor: [0, 3, 5, 7, 10],
    blues: [0, 3, 5, 6, 7, 10],
    chromatic: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
  };

  // Chord patterns (in semitones from root)
  static readonly CHORD_PATTERNS = {
    major: [0, 4, 7],
    minor: [0, 3, 7],
    diminished: [0, 3, 6],
    augmented: [0, 4, 8],
    sus2: [0, 2, 7],
    sus4: [0, 5, 7],
    major7: [0, 4, 7, 11],
    minor7: [0, 3, 7, 10],
    dominant7: [0, 4, 7, 10],
    majorMaj7: [0, 4, 7, 11],
    halfDiminished7: [0, 3, 6, 10],
    diminished7: [0, 3, 6, 9],
    add9: [0, 4, 7, 14], // 14 = 2 + 12 (octave)
    major9: [0, 4, 7, 11, 14],
    minor9: [0, 3, 7, 10, 14]
  };

  // Circle of fifths
  static readonly CIRCLE_OF_FIFTHS = [
    'C', 'G', 'D', 'A', 'E', 'B', 'F#', 'C#', 'Ab', 'Eb', 'Bb', 'F'
  ];

  // Interval names
  static readonly INTERVAL_NAMES = {
    0: 'Perfect Unison',
    1: 'Minor Second',
    2: 'Major Second',
    3: 'Minor Third',
    4: 'Major Third',
    5: 'Perfect Fourth',
    6: 'Tritone',
    7: 'Perfect Fifth',
    8: 'Minor Sixth',
    9: 'Major Sixth',
    10: 'Minor Seventh',
    11: 'Major Seventh',
    12: 'Perfect Octave'
  };

  /**
   * Generate scale from root note
   */
  static generateScale(
    rootFrequency: number, 
    scaleType: keyof typeof MusicTheory.SCALE_PATTERNS = 'major'
  ): MusicalNote[] {
    const pattern = MusicTheory.SCALE_PATTERNS[scaleType];
    if (!pattern) {
      throw new Error(`Unknown scale type: ${scaleType}`);
    }

    return pattern.map(semitones => {
      const frequency = rootFrequency * Math.pow(2, semitones / 12);
      return FrequencyUtils.frequencyToNote(frequency);
    });
  }

  /**
   * Generate chord from root note
   */
  static generateChord(
    rootFrequency: number,
    chordType: keyof typeof MusicTheory.CHORD_PATTERNS = 'major'
  ): MusicalNote[] {
    const pattern = MusicTheory.CHORD_PATTERNS[chordType];
    if (!pattern) {
      throw new Error(`Unknown chord type: ${chordType}`);
    }

    return pattern.map(semitones => {
      const frequency = rootFrequency * Math.pow(2, semitones / 12);
      return FrequencyUtils.frequencyToNote(frequency);
    });
  }

  /**
   * Identify scale from a set of frequencies
   */
  static identifyScale(frequencies: number[]): Array<{
    scale: keyof typeof MusicTheory.SCALE_PATTERNS;
    confidence: number;
    root: MusicalNote;
  }> {
    if (frequencies.length < 3) {
      return [];
    }

    // Convert frequencies to note numbers relative to the lowest note
    const sortedFreqs = frequencies.sort((a, b) => a - b);
    const baseFreq = sortedFreqs[0];
    const intervals = sortedFreqs.map(freq => 
      Math.round(12 * Math.log2(freq / baseFreq))
    );

    const results: Array<{
      scale: keyof typeof MusicTheory.SCALE_PATTERNS;
      confidence: number;
      root: MusicalNote;
    }> = [];

    // Test each scale pattern
    Object.entries(MusicTheory.SCALE_PATTERNS).forEach(([scaleName, pattern]) => {
      // Test each possible root
      for (let rootOffset = 0; rootOffset < 12; rootOffset++) {
        const adjustedPattern = pattern.map(interval => (interval + rootOffset) % 12).sort((a, b) => a - b);
        const normalizedIntervals = intervals.map(interval => interval % 12).sort((a, b) => a - b);
        
        // Calculate confidence based on pattern matching
        let matches = 0;
        normalizedIntervals.forEach(interval => {
          if (adjustedPattern.includes(interval)) {
            matches++;
          }
        });

        const confidence = matches / Math.max(normalizedIntervals.length, adjustedPattern.length);
        
        if (confidence > 0.5) { // Only include reasonable matches
          const rootFreq = baseFreq * Math.pow(2, -rootOffset / 12);
          results.push({
            scale: scaleName as keyof typeof MusicTheory.SCALE_PATTERNS,
            confidence,
            root: FrequencyUtils.frequencyToNote(rootFreq)
          });
        }
      }
    });

    // Sort by confidence and return top matches
    return results
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 5);
  }

  /**
   * Identify chord from frequencies
   */
  static identifyChord(frequencies: number[]): Array<{
    chord: keyof typeof MusicTheory.CHORD_PATTERNS;
    confidence: number;
    root: MusicalNote;
    inversion?: number;
  }> {
    if (frequencies.length < 2) {
      return [];
    }

    const sortedFreqs = frequencies.sort((a, b) => a - b);
    const results: Array<{
      chord: keyof typeof MusicTheory.CHORD_PATTERNS;
      confidence: number;
      root: MusicalNote;
      inversion?: number;
    }> = [];

    // Test each chord pattern
    Object.entries(MusicTheory.CHORD_PATTERNS).forEach(([chordName, pattern]) => {
      // Test different inversions
      for (let inversion = 0; inversion < pattern.length; inversion++) {
        // Create inverted pattern
        const invertedPattern = [
          ...pattern.slice(inversion),
          ...pattern.slice(0, inversion).map(interval => interval + 12)
        ];

        // Test each possible bass note as root
        sortedFreqs.forEach((bassFreq, _bassIndex) => {
          const intervals = sortedFreqs.map(freq => 
            Math.round(12 * Math.log2(freq / bassFreq))
          );

          // Calculate confidence
          let matches = 0;
          const patternSet = new Set(invertedPattern);
          intervals.forEach(interval => {
            const normalizedInterval = interval % 12;
            if (patternSet.has(normalizedInterval) || patternSet.has(normalizedInterval + 12)) {
              matches++;
            }
          });

          const confidence = matches / Math.max(intervals.length, pattern.length);
          
          if (confidence > 0.6) {
            const rootFreq = inversion === 0 ? bassFreq : 
              bassFreq * Math.pow(2, -pattern[inversion] / 12);
            
            results.push({
              chord: chordName as keyof typeof MusicTheory.CHORD_PATTERNS,
              confidence,
              root: FrequencyUtils.frequencyToNote(rootFreq),
              inversion: inversion > 0 ? inversion : undefined
            });
          }
        });
      }
    });

    return results
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 3);
  }

  /**
   * Get the key signature for a given key
   */
  static getKeySignature(key: string, mode: 'major' | 'minor' = 'major'): {
    sharps: string[];
    flats: string[];
    accidentalCount: number;
  } {
    // Order of sharps: F# C# G# D# A# E# B#
    const sharpOrder = ['F', 'C', 'G', 'D', 'A', 'E', 'B'];
    // Order of flats: Bb Eb Ab Db Gb Cb Fb
    const flatOrder = ['B', 'E', 'A', 'D', 'G', 'C', 'F'];
    
    // Major key signatures
    const majorKeys = {
      'C': { sharps: 0, flats: 0 },
      'G': { sharps: 1, flats: 0 },
      'D': { sharps: 2, flats: 0 },
      'A': { sharps: 3, flats: 0 },
      'E': { sharps: 4, flats: 0 },
      'B': { sharps: 5, flats: 0 },
      'F#': { sharps: 6, flats: 0 },
      'C#': { sharps: 7, flats: 0 },
      'F': { sharps: 0, flats: 1 },
      'Bb': { sharps: 0, flats: 2 },
      'Eb': { sharps: 0, flats: 3 },
      'Ab': { sharps: 0, flats: 4 },
      'Db': { sharps: 0, flats: 5 },
      'Gb': { sharps: 0, flats: 6 },
      'Cb': { sharps: 0, flats: 7 }
    };

    // Adjust for minor keys (relative minor is 3 semitones below major)
    let keySignature = majorKeys[key as keyof typeof majorKeys];
    
    if (!keySignature && mode === 'minor') {
      // Find relative major
      const minorToMajor = {
        'A': 'C', 'E': 'G', 'B': 'D', 'F#': 'A', 'C#': 'E', 'G#': 'B', 'D#': 'F#', 'A#': 'C#',
        'D': 'F', 'G': 'Bb', 'C': 'Eb', 'F': 'Ab', 'Bb': 'Db', 'Eb': 'Gb', 'Ab': 'Cb'
      };
      
      const relativeMajor = minorToMajor[key as keyof typeof minorToMajor];
      if (relativeMajor) {
        keySignature = majorKeys[relativeMajor as keyof typeof majorKeys];
      }
    }

    if (!keySignature) {
      return { sharps: [], flats: [], accidentalCount: 0 };
    }

    const sharps = sharpOrder.slice(0, keySignature.sharps).map(note => note + '#');
    const flats = flatOrder.slice(0, keySignature.flats).map(note => note + 'b');
    
    return {
      sharps,
      flats,
      accidentalCount: keySignature.sharps || keySignature.flats
    };
  }

  /**
   * Calculate the harmonic series for a fundamental frequency
   */
  static getHarmonicSeries(fundamental: number, harmonicCount: number = 16): MusicalNote[] {
    const harmonics: MusicalNote[] = [];
    
    for (let i = 1; i <= harmonicCount; i++) {
      const frequency = fundamental * i;
      harmonics.push(FrequencyUtils.frequencyToNote(frequency));
    }
    
    return harmonics;
  }

  /**
   * Calculate just intonation ratios for common intervals
   */
  static getJustIntonationRatios(): { [key: string]: { ratio: number; cents: number } } {
    return {
      'unison': { ratio: 1/1, cents: 0 },
      'minorSecond': { ratio: 16/15, cents: 112 },
      'majorSecond': { ratio: 9/8, cents: 204 },
      'minorThird': { ratio: 6/5, cents: 316 },
      'majorThird': { ratio: 5/4, cents: 386 },
      'perfectFourth': { ratio: 4/3, cents: 498 },
      'tritone': { ratio: 45/32, cents: 590 },
      'perfectFifth': { ratio: 3/2, cents: 702 },
      'minorSixth': { ratio: 8/5, cents: 814 },
      'majorSixth': { ratio: 5/3, cents: 884 },
      'minorSeventh': { ratio: 16/9, cents: 996 },
      'majorSeventh': { ratio: 15/8, cents: 1088 },
      'octave': { ratio: 2/1, cents: 1200 }
    };
  }

  /**
   * Convert equal temperament interval to just intonation
   */
  static equalTemperamentToJustIntonation(semitones: number): {
    ratio: number;
    cents: number;
    closestJustInterval?: string;
    centsDeviation?: number;
  } {
    const equalTempCents = semitones * 100;
    const justRatios = MusicTheory.getJustIntonationRatios();
    
    // Find closest just intonation interval
    let closestInterval: string | undefined;
    let smallestDeviation = Infinity;
    
    Object.entries(justRatios).forEach(([intervalName, { cents }]) => {
      const deviation = Math.abs(equalTempCents - cents);
      if (deviation < smallestDeviation) {
        smallestDeviation = deviation;
        closestInterval = intervalName;
      }
    });
    
    const ratio = Math.pow(2, semitones / 12);
    
    return {
      ratio,
      cents: equalTempCents,
      closestJustInterval: closestInterval,
      centsDeviation: closestInterval ? smallestDeviation : undefined
    };
  }

  /**
   * Analyze melodic intervals in a sequence of notes
   */
  static analyzeMelody(frequencies: number[]): Array<{
    fromNote: MusicalNote;
    toNote: MusicalNote;
    interval: MusicalInterval;
    direction: 'up' | 'down' | 'same';
  }> {
    if (frequencies.length < 2) {
      return [];
    }

    const analysis: Array<{
      fromNote: MusicalNote;
      toNote: MusicalNote;
      interval: MusicalInterval;
      direction: 'up' | 'down' | 'same';
    }> = [];

    for (let i = 1; i < frequencies.length; i++) {
      const fromFreq = frequencies[i - 1];
      const toFreq = frequencies[i];
      
      const fromNote = FrequencyUtils.frequencyToNote(fromFreq);
      const toNote = FrequencyUtils.frequencyToNote(toFreq);
      
      const semitones = FrequencyUtils.getSignedInterval(fromFreq, toFreq);
      const interval = FrequencyUtils.getIntervalInfo(Math.abs(semitones));
      
      const direction = semitones > 0 ? 'up' : semitones < 0 ? 'down' : 'same';
      
      analysis.push({
        fromNote,
        toNote,
        interval,
        direction
      });
    }

    return analysis;
  }

  /**
   * Generate chord progressions in a given key
   */
  static generateChordProgression(
    key: string, 
    mode: 'major' | 'minor' = 'major',
    progression: number[] = [1, 4, 5, 1] // Roman numerals as scale degrees
  ): MusicalNote[][] {
    const rootFreq = FrequencyUtils.scientificPitchToFrequency(key + '4');
    if (rootFreq === 0) {
      throw new Error(`Invalid key: ${key}`);
    }

    const scale = MusicTheory.generateScale(rootFreq, mode === 'minor' ? 'naturalMinor' : 'major');
    const chords: MusicalNote[][] = [];

    progression.forEach(degree => {
      const chordRoot = scale[(degree - 1) % scale.length];
      const chordType = mode === 'major' 
        ? MusicTheory.getMajorScaleChordType(degree)
        : MusicTheory.getMinorScaleChordType(degree);
      
      const chord = MusicTheory.generateChord(chordRoot.frequency, chordType);
      chords.push(chord);
    });

    return chords;
  }

  /**
   * Get chord type for scale degree in major scale
   */
  private static getMajorScaleChordType(degree: number): keyof typeof MusicTheory.CHORD_PATTERNS {
    const chordTypes = ['major', 'minor', 'minor', 'major', 'major', 'minor', 'diminished'];
    return chordTypes[(degree - 1) % 7] as keyof typeof MusicTheory.CHORD_PATTERNS;
  }

  /**
   * Get chord type for scale degree in minor scale
   */
  private static getMinorScaleChordType(degree: number): keyof typeof MusicTheory.CHORD_PATTERNS {
    const chordTypes = ['minor', 'diminished', 'major', 'minor', 'minor', 'major', 'major'];
    return chordTypes[(degree - 1) % 7] as keyof typeof MusicTheory.CHORD_PATTERNS;
  }
}