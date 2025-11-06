/**
 * FrequencyUtils - Comprehensive Frequency Conversion and Musical Analysis Utilities
 * 
 * @description Provides essential utilities for converting between frequencies, musical notes,
 * cents deviation, and MIDI values. Includes advanced musical interval calculations and
 * frequency analysis functions optimized for pitch detection and music applications.
 * 
 * **Key Features:**
 * - Frequency ↔ MIDI note conversion with A4=440Hz reference
 * - Musical note name resolution with enharmonic support
 * - Cents deviation calculation for pitch accuracy
 * - Musical interval analysis and recognition
 * - Octave detection and normalization
 * 
 * @example
 * ```typescript
 * // Basic frequency conversion
 * const note = FrequencyUtils.frequencyToNote(440);
 * console.log(note); // { name: 'A', octave: 4, midi: 69, frequency: 440 }
 * 
 * // Pitch accuracy analysis
 * const cents = FrequencyUtils.frequencyToCents(445, 440);
 * console.log(cents); // +19.56 cents sharp
 * 
 * // Musical interval calculation
 * const interval = FrequencyUtils.getInterval(523.25, 261.63);
 * console.log(interval); // Perfect octave
 * ```
 * 
 * @version 1.1.3
 * @since 1.0.0
 */

import type { MusicalNote, MusicalInterval } from '../types';

export class FrequencyUtils {
  /** Standard reference frequency for A4 note (440 Hz) */
  static readonly A4_FREQUENCY = 440;
  
  /** MIDI note number for A4 (69) */
  static readonly A4_MIDI_NUMBER = 69;
  
  /** Sharp note names in chromatic order */
  static readonly NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  
  /** Flat note names in chromatic order */
  static readonly FLAT_NOTE_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
  
  /** Common musical intervals mapped to semitone values */
  static readonly INTERVALS = {
    unison: 0,
    minorSecond: 1,
    majorSecond: 2,
    minorThird: 3,
    majorThird: 4,
    perfectFourth: 5,
    tritone: 6,
    perfectFifth: 7,
    minorSixth: 8,
    majorSixth: 9,
    minorSeventh: 10,
    majorSeventh: 11,
    octave: 12
  };

  /**
   * Converts frequency in Hz to MIDI note number
   * 
   * @param frequency - Input frequency in Hz
   * @returns MIDI note number (0-127, where 69 = A4 = 440Hz)
   * 
   * @example
   * ```typescript
   * const midiNote = FrequencyUtils.frequencyToMidi(440);
   * console.log(midiNote); // 69 (A4)
   * 
   * const midiNote2 = FrequencyUtils.frequencyToMidi(261.63);
   * console.log(midiNote2); // 60 (C4)
   * ```
   */
  static frequencyToMidi(frequency: number): number {
    if (frequency <= 0) return 0;
    return Math.round(12 * Math.log2(frequency / FrequencyUtils.A4_FREQUENCY) + FrequencyUtils.A4_MIDI_NUMBER);
  }

  /**
   * Converts MIDI note number to frequency in Hz
   * 
   * @param midiNumber - MIDI note number (0-127)
   * @returns Frequency in Hz
   * 
   * @example
   * ```typescript
   * const frequency = FrequencyUtils.midiToFrequency(69);
   * console.log(frequency); // 440 (A4)
   * 
   * const frequency2 = FrequencyUtils.midiToFrequency(60);
   * console.log(frequency2); // 261.63 (C4)
   * ```
   */
  static midiToFrequency(midiNumber: number): number {
    return FrequencyUtils.A4_FREQUENCY * Math.pow(2, (midiNumber - FrequencyUtils.A4_MIDI_NUMBER) / 12);
  }

  /**
   * Converts frequency to musical note with octave detection and enharmonic support
   * 
   * @param frequency - Input frequency in Hz
   * @param useFlats - Use flat notation instead of sharps (default: false)
   * @returns Musical note object with name, octave, MIDI number, and exact frequency
   * 
   * @example
   * ```typescript
   * const note1 = FrequencyUtils.frequencyToNote(440);
   * console.log(note1); // { name: 'A4', octave: 4, midi: 69, frequency: 440 }
   * 
   * const note2 = FrequencyUtils.frequencyToNote(466.16, true);
   * console.log(note2); // { name: 'Bb4', octave: 4, midi: 70, frequency: 466.164... }
   * 
   * // Invalid frequency handling
   * const invalid = FrequencyUtils.frequencyToNote(-10);
   * console.log(invalid); // { name: '--', octave: 0, midi: 0, frequency: 0 }
   * ```
   */
  static frequencyToNote(frequency: number, useFlats = false): MusicalNote {
    if (frequency <= 0) {
      return {
        name: '--',
        octave: 0,
        midi: 0,
        frequency: 0
      };
    }

    const midiNumber = FrequencyUtils.frequencyToMidi(frequency);
    const noteNames = useFlats ? FrequencyUtils.FLAT_NOTE_NAMES : FrequencyUtils.NOTE_NAMES;
    
    const noteIndex = (midiNumber - 12) % 12; // C0 = MIDI 12
    const octave = Math.floor((midiNumber - 12) / 12);
    const noteName = noteNames[noteIndex];
    
    return {
      name: noteName + octave,
      octave,
      midi: midiNumber,
      frequency: FrequencyUtils.midiToFrequency(midiNumber)
    };
  }

  /**
   * Calculates cents deviation from the nearest semitone for pitch accuracy analysis
   * 
   * @description Converts frequency to cents deviation, where 100 cents = 1 semitone.
   * Positive values indicate sharp pitch, negative values indicate flat pitch.
   * 
   * @param frequency - Input frequency in Hz
   * @returns Cents deviation from nearest semitone (-50 to +50 cents)
   * 
   * @example
   * ```typescript
   * const cents1 = FrequencyUtils.frequencyToCents(440);
   * console.log(cents1); // 0 (A4 is perfectly in tune)
   * 
   * const cents2 = FrequencyUtils.frequencyToCents(445);
   * console.log(cents2); // +20 (20 cents sharp)
   * 
   * const cents3 = FrequencyUtils.frequencyToCents(435);
   * console.log(cents3); // -20 (20 cents flat)
   * ```
   */
  static frequencyToCents(frequency: number): number {
    if (frequency <= 0) return 0;
    
    const midiNumber = 12 * Math.log2(frequency / FrequencyUtils.A4_FREQUENCY) + FrequencyUtils.A4_MIDI_NUMBER;
    const nearestMidi = Math.round(midiNumber);
    const centsDeviation = (midiNumber - nearestMidi) * 100;
    
    return Math.round(centsDeviation);
  }

  /**
   * Converts cents to frequency ratio for interval calculations
   * 
   * @description Calculates the frequency multiplier for a given cent value.
   * Useful for transposition and interval calculations.
   * 
   * @param cents - Cents value (100 cents = 1 semitone)
   * @returns Frequency ratio multiplier
   * 
   * @example
   * ```typescript
   * const ratio1 = FrequencyUtils.centsToRatio(1200);
   * console.log(ratio1); // 2.0 (1200 cents = 1 octave = 2x frequency)
   * 
   * const ratio2 = FrequencyUtils.centsToRatio(700);
   * console.log(ratio2); // ~1.498 (700 cents ≈ perfect fifth)
   * 
   * // Apply ratio to transpose frequency
   * const newFreq = 440 * FrequencyUtils.centsToRatio(100); // 440 * semitone ratio
   * console.log(newFreq); // ~466.16 (A# above A4)
   * ```
   */
  static centsToRatio(cents: number): number {
    return Math.pow(2, cents / 1200);
  }

  /**
   * Converts frequency ratio to cents for interval analysis
   * 
   * @description Calculates the cent value for a given frequency ratio.
   * Useful for analyzing musical intervals and pitch relationships.
   * 
   * @param ratio - Frequency ratio (higher frequency / lower frequency)
   * @returns Cents value (positive for ascending intervals)
   * 
   * @example
   * ```typescript
   * const cents1 = FrequencyUtils.ratioToCents(2.0);
   * console.log(cents1); // 1200 (octave)
   * 
   * const cents2 = FrequencyUtils.ratioToCents(1.5);
   * console.log(cents2); // 702 (perfect fifth)
   * 
   * const cents3 = FrequencyUtils.ratioToCents(880 / 440);
   * console.log(cents3); // 1200 (A4 to A5 = octave)
   * ```
   */
  static ratioToCents(ratio: number): number {
    if (ratio <= 0) return 0;
    return Math.round(1200 * Math.log2(ratio));
  }

  /**
   * Finds the exact frequency of the closest equal temperament note
   * 
   * @description Rounds the input frequency to the nearest semitone frequency
   * in equal temperament tuning. Useful for pitch correction and reference.
   * 
   * @param frequency - Input frequency in Hz
   * @returns Exact frequency of the closest note in Hz
   * 
   * @example
   * ```typescript
   * const closest1 = FrequencyUtils.getClosestNoteFrequency(445);
   * console.log(closest1); // 440 (closest to A4)
   * 
   * const closest2 = FrequencyUtils.getClosestNoteFrequency(470);
   * console.log(closest2); // 466.16 (closest to A#4/Bb4)
   * 
   * const closest3 = FrequencyUtils.getClosestNoteFrequency(260);
   * console.log(closest3); // 261.63 (closest to C4)
   * ```
   */
  static getClosestNoteFrequency(frequency: number): number {
    if (frequency <= 0) return 0;
    
    const midiNumber = FrequencyUtils.frequencyToMidi(frequency);
    return FrequencyUtils.midiToFrequency(midiNumber);
  }

  /**
   * Calculates the absolute interval between two frequencies in semitones
   * 
   * @description Determines the musical interval size between two frequencies,
   * always returning a positive value regardless of frequency order.
   * 
   * @param frequency1 - First frequency in Hz
   * @param frequency2 - Second frequency in Hz
   * @returns Absolute interval in semitones (always positive)
   * 
   * @example
   * ```typescript
   * const interval1 = FrequencyUtils.getInterval(440, 880);
   * console.log(interval1); // 12 (octave)
   * 
   * const interval2 = FrequencyUtils.getInterval(880, 440);
   * console.log(interval2); // 12 (same interval, order doesn't matter)
   * 
   * const interval3 = FrequencyUtils.getInterval(440, 659.25);
   * console.log(interval3); // 7 (perfect fifth)
   * ```
   */
  static getInterval(frequency1: number, frequency2: number): number {
    if (frequency1 <= 0 || frequency2 <= 0) return 0;
    
    const midi1 = FrequencyUtils.frequencyToMidi(frequency1);
    const midi2 = FrequencyUtils.frequencyToMidi(frequency2);
    
    return Math.abs(midi2 - midi1);
  }

  /**
   * Calculates the signed interval between two frequencies with direction
   * 
   * @description Determines the musical interval with direction information.
   * Positive values indicate ascending intervals, negative values indicate descending.
   * 
   * @param fromFrequency - Starting frequency in Hz
   * @param toFrequency - Target frequency in Hz
   * @returns Signed interval in semitones (positive = ascending, negative = descending)
   * 
   * @example
   * ```typescript
   * const interval1 = FrequencyUtils.getSignedInterval(440, 880);
   * console.log(interval1); // +12 (ascending octave)
   * 
   * const interval2 = FrequencyUtils.getSignedInterval(880, 440);
   * console.log(interval2); // -12 (descending octave)
   * 
   * const interval3 = FrequencyUtils.getSignedInterval(261.63, 392);
   * console.log(interval3); // +7 (ascending perfect fifth)
   * ```
   */
  static getSignedInterval(fromFrequency: number, toFrequency: number): number {
    if (fromFrequency <= 0 || toFrequency <= 0) return 0;
    
    const midi1 = FrequencyUtils.frequencyToMidi(fromFrequency);
    const midi2 = FrequencyUtils.frequencyToMidi(toFrequency);
    
    return midi2 - midi1;
  }

  /**
   * Provides comprehensive musical interval information and analysis
   * 
   * @description Converts semitone count to detailed interval information including
   * name, cents value, and frequency ratio. Handles compound intervals with octaves.
   * 
   * @param semitones - Interval size in semitones
   * @returns Musical interval object with name, semitones, cents, and ratio
   * 
   * @example
   * ```typescript
   * const fifth = FrequencyUtils.getIntervalInfo(7);
   * console.log(fifth);
   * // { name: 'Perfect Fifth', semitones: 7, cents: 700, ratio: 1.498... }
   * 
   * const compound = FrequencyUtils.getIntervalInfo(19);
   * console.log(compound);
   * // { name: 'Perfect Fifth + 1 octave(s)', semitones: 19, cents: 1900, ratio: 2.996... }
   * 
   * const unison = FrequencyUtils.getIntervalInfo(0);
   * console.log(unison);
   * // { name: 'Perfect Unison', semitones: 0, cents: 0, ratio: 1.0 }
   * ```
   */
  static getIntervalInfo(semitones: number): MusicalInterval {
    const intervalNames = {
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

    const normalizedSemitones = ((semitones % 12) + 12) % 12;
    const octaves = Math.floor(semitones / 12);
    
    const baseName = intervalNames[normalizedSemitones as keyof typeof intervalNames] || 'Unknown';
    const name = octaves > 0 ? `${baseName} + ${octaves} octave(s)` : baseName;
    
    return {
      name,
      semitones,
      cents: semitones * 100,
      ratio: Math.pow(2, semitones / 12)
    };
  }

  /**
   * Checks if frequency falls within typical human vocal range
   * 
   * @description Tests whether a frequency is within the fundamental vocal range
   * of approximately 80Hz to 1100Hz, covering bass to soprano voices.
   * 
   * @param frequency - Input frequency in Hz
   * @returns True if frequency is within vocal range, false otherwise
   * 
   * @example
   * ```typescript
   * const isVocal1 = FrequencyUtils.isInVocalRange(220);
   * console.log(isVocal1); // true (A3, typical male voice)
   * 
   * const isVocal2 = FrequencyUtils.isInVocalRange(50);
   * console.log(isVocal2); // false (below vocal range)
   * 
   * const isVocal3 = FrequencyUtils.isInVocalRange(2000);
   * console.log(isVocal3); // false (above fundamental vocal range)
   * ```
   */
  static isInVocalRange(frequency: number): boolean {
    // Human vocal range roughly 80Hz to 1100Hz
    return frequency >= 80 && frequency <= 1100;
  }

  /**
   * Checks if frequency falls within standard piano key range
   * 
   * @description Tests whether a frequency is within the range of a standard
   * 88-key piano, from A0 (27.5Hz) to C8 (4186Hz).
   * 
   * @param frequency - Input frequency in Hz
   * @returns True if frequency is within piano range, false otherwise
   * 
   * @example
   * ```typescript
   * const isPiano1 = FrequencyUtils.isInPianoRange(440);
   * console.log(isPiano1); // true (A4, middle of piano range)
   * 
   * const isPiano2 = FrequencyUtils.isInPianoRange(20);
   * console.log(isPiano2); // false (below piano range)
   * 
   * const isPiano3 = FrequencyUtils.isInPianoRange(5000);
   * console.log(isPiano3); // false (above piano range)
   * ```
   */
  static isInPianoRange(frequency: number): boolean {
    // Piano range A0 (27.5Hz) to C8 (4186Hz)
    return frequency >= 27.5 && frequency <= 4186;
  }

  /**
   * Retrieves frequency range specifications for common instruments
   * 
   * @description Returns the typical fundamental frequency range for various
   * instruments and voice types. Useful for instrument-specific audio processing.
   * 
   * @param instrument - Instrument name (piano, guitar, violin, cello, voice_bass, voice_tenor, voice_alto, voice_soprano)
   * @returns Object with min/max frequencies in Hz, or null if instrument not found
   * 
   * @example
   * ```typescript
   * const guitarRange = FrequencyUtils.getInstrumentRange('guitar');
   * console.log(guitarRange); // { min: 82.4, max: 1397 } (E2 to F6)
   * 
   * const bassRange = FrequencyUtils.getInstrumentRange('voice_bass');
   * console.log(bassRange); // { min: 87.3, max: 349 } (F2 to F4)
   * 
   * const unknown = FrequencyUtils.getInstrumentRange('kazoo');
   * console.log(unknown); // null (instrument not in database)
   * ```
   */
  static getInstrumentRange(instrument: string): { min: number; max: number } | null {
    const ranges = {
      piano: { min: 27.5, max: 4186 },
      guitar: { min: 82.4, max: 1397 }, // E2 to F6
      violin: { min: 196, max: 3520 },  // G3 to A7
      cello: { min: 65.4, max: 1397 },  // C2 to F6
      voice_bass: { min: 87.3, max: 349 }, // F2 to F4
      voice_tenor: { min: 131, max: 523 }, // C3 to C5
      voice_alto: { min: 175, max: 698 },  // F3 to F5
      voice_soprano: { min: 262, max: 1047 } // C4 to C6
    };

    return ranges[instrument as keyof typeof ranges] || null;
  }

  /**
   * Generates chromatic scale frequencies from a base frequency
   * 
   * @description Creates an array of frequencies representing a chromatic scale
   * (all 12 semitones) starting from the given base frequency.
   * 
   * @param baseFrequency - Starting frequency in Hz
   * @param octaves - Number of octaves to generate (default: 1)
   * @returns Array of frequencies representing the chromatic scale
   * 
   * @example
   * ```typescript
   * const chromaticC4 = FrequencyUtils.generateChromaticScale(261.63, 1);
   * console.log(chromaticC4);
   * // [261.63, 277.18, 293.66, 311.13, 329.63, 349.23, 369.99, 392.00, 415.30, 440.00, 466.16, 493.88, 523.25]
   * 
   * const chromatic2Oct = FrequencyUtils.generateChromaticScale(440, 2);
   * console.log(chromatic2Oct.length); // 24 (2 octaves × 12 semitones)
   * ```
   */
  static generateChromaticScale(baseFrequency: number, octaves = 1): number[] {
    const frequencies: number[] = [];
    
    for (let i = 0; i < 12 * octaves; i++) {
      const frequency = baseFrequency * Math.pow(2, i / 12);
      frequencies.push(frequency);
    }
    
    return frequencies;
  }

  /**
   * Generates major scale frequencies from a base frequency
   * 
   * @description Creates an array of frequencies representing a major scale
   * using the pattern W-W-H-W-W-W-H (whole step, half step intervals).
   * 
   * @param baseFrequency - Starting frequency in Hz (tonic note)
   * @returns Array of 8 frequencies representing the major scale (including octave)
   * 
   * @example
   * ```typescript
   * const cMajor = FrequencyUtils.generateMajorScale(261.63); // C4 major
   * console.log(cMajor);
   * // [261.63, 293.66, 329.63, 349.23, 392.00, 440.00, 493.88, 523.25]
   * // [C4,     D4,     E4,     F4,     G4,     A4,     B4,     C5]
   * 
   * const gMajor = FrequencyUtils.generateMajorScale(392); // G4 major
   * console.log(gMajor.length); // 8 notes (including octave)
   * ```
   */
  static generateMajorScale(baseFrequency: number): number[] {
    // Major scale pattern: W-W-H-W-W-W-H (W=whole step=2 semitones, H=half step=1 semitone)
    const pattern = [0, 2, 4, 5, 7, 9, 11, 12];
    
    return pattern.map(semitones => baseFrequency * Math.pow(2, semitones / 12));
  }

  /**
   * Generates natural minor scale frequencies from a base frequency
   * 
   * @description Creates an array of frequencies representing a natural minor scale
   * using the pattern W-H-W-W-H-W-W (whole step, half step intervals).
   * 
   * @param baseFrequency - Starting frequency in Hz (tonic note)
   * @returns Array of 8 frequencies representing the natural minor scale (including octave)
   * 
   * @example
   * ```typescript
   * const aMinor = FrequencyUtils.generateMinorScale(440); // A4 minor
   * console.log(aMinor);
   * // [440.00, 493.88, 523.25, 587.33, 659.25, 698.46, 783.99, 880.00]
   * // [A4,     B4,     C5,     D5,     E5,     F5,     G5,     A5]
   * 
   * const dMinor = FrequencyUtils.generateMinorScale(293.66); // D4 minor
   * console.log(dMinor.length); // 8 notes (including octave)
   * ```
   */
  static generateMinorScale(baseFrequency: number): number[] {
    // Natural minor scale pattern: W-H-W-W-H-W-W
    const pattern = [0, 2, 3, 5, 7, 8, 10, 12];
    
    return pattern.map(semitones => baseFrequency * Math.pow(2, semitones / 12));
  }

  /**
   * Calculates harmonic series frequencies for a given fundamental
   * 
   * @description Generates the harmonic series by multiplying the fundamental
   * frequency by integer values. Essential for understanding timbre and overtones.
   * 
   * @param fundamental - Fundamental frequency in Hz
   * @param maxHarmonic - Maximum harmonic number to calculate (default: 8)
   * @returns Array of harmonic frequencies including the fundamental
   * 
   * @example
   * ```typescript
   * const harmonics = FrequencyUtils.findHarmonics(220, 5); // A3 harmonics
   * console.log(harmonics);
   * // [220, 440, 660, 880, 1100] (A3, A4, E5, A5, C#6)
   * 
   * const allHarmonics = FrequencyUtils.findHarmonics(100, 8);
   * console.log(allHarmonics.length); // 8 harmonics
   * ```
   */
  static findHarmonics(fundamental: number, maxHarmonic = 8): number[] {
    const harmonics: number[] = [];
    
    for (let i = 1; i <= maxHarmonic; i++) {
      harmonics.push(fundamental * i);
    }
    
    return harmonics;
  }

  /**
   * Analyzes whether a frequency is a harmonic of a fundamental frequency
   * 
   * @description Tests if the given frequency matches a harmonic of the fundamental
   * within the specified tolerance. Returns detailed harmonic analysis.
   * 
   * @param frequency - Frequency to test in Hz
   * @param fundamental - Fundamental frequency in Hz
   * @param tolerance - Tolerance for harmonic matching (default: 0.05 = 5%)
   * @returns Object containing harmonic analysis results
   * 
   * @example
   * ```typescript
   * const result1 = FrequencyUtils.isHarmonic(440, 220);
   * console.log(result1);
   * // { isHarmonic: true, harmonicNumber: 2, exactFrequency: 440 }
   * 
   * const result2 = FrequencyUtils.isHarmonic(665, 220, 0.1);
   * console.log(result2);
   * // { isHarmonic: true, harmonicNumber: 3, exactFrequency: 660 } (within 10% tolerance)
   * 
   * const result3 = FrequencyUtils.isHarmonic(450, 220);
   * console.log(result3);
   * // { isHarmonic: false, harmonicNumber: null, exactFrequency: null }
   * ```
   */
  static isHarmonic(frequency: number, fundamental: number, tolerance = 0.05): {
    isHarmonic: boolean;
    harmonicNumber: number | null;
    exactFrequency: number | null;
  } {
    if (fundamental <= 0 || frequency <= 0) {
      return { isHarmonic: false, harmonicNumber: null, exactFrequency: null };
    }

    const ratio = frequency / fundamental;
    const nearestInteger = Math.round(ratio);
    
    // Check if the ratio is close to an integer (within tolerance)
    if (nearestInteger >= 1 && Math.abs(ratio - nearestInteger) <= tolerance) {
      return {
        isHarmonic: true,
        harmonicNumber: nearestInteger,
        exactFrequency: fundamental * nearestInteger
      };
    }

    return { isHarmonic: false, harmonicNumber: null, exactFrequency: null };
  }

  /**
   * Calculate the fundamental frequency from a suspected harmonic
   */
  static calculateFundamental(harmonicFrequency: number, harmonicNumber: number): number {
    if (harmonicNumber <= 0 || harmonicFrequency <= 0) return 0;
    return harmonicFrequency / harmonicNumber;
  }

  /**
   * Convert frequency to scientific pitch notation
   */
  static frequencyToScientificPitch(frequency: number): string {
    const note = FrequencyUtils.frequencyToNote(frequency);
    return note.name;
  }

  /**
   * Convert scientific pitch notation to frequency
   */
  static scientificPitchToFrequency(scientificPitch: string): number {
    const match = scientificPitch.match(/^([A-G][#b]?)(-?\d+)$/);
    if (!match) return 0;

    const [, noteName, octaveStr] = match;
    const octave = parseInt(octaveStr, 10);
    
    // Convert note name to semitone offset from C
    let semitoneOffset = 0;
    const baseNote = noteName[0];
    const accidental = noteName.slice(1);
    
    const baseOffsets: { [key: string]: number } = {
      'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11
    };
    
    semitoneOffset = baseOffsets[baseNote] || 0;
    
    if (accidental === '#') {
      semitoneOffset += 1;
    } else if (accidental === 'b') {
      semitoneOffset -= 1;
    }
    
    // Calculate MIDI number (C4 = MIDI 60)
    const midiNumber = (octave + 1) * 12 + semitoneOffset;
    
    return FrequencyUtils.midiToFrequency(midiNumber);
  }

  /**
   * Format frequency display with appropriate precision
   */
  static formatFrequency(frequency: number, decimalPlaces = 1): string {
    if (frequency === 0) return '0 Hz';
    if (frequency < 0.1) return '<0.1 Hz';
    if (frequency >= 10000) return `${Math.round(frequency / 1000)}k Hz`;
    
    return `${frequency.toFixed(decimalPlaces)} Hz`;
  }

  /**
   * Format cents display with sign
   */
  static formatCents(cents: number): string {
    if (cents === 0) return '0¢';
    const sign = cents > 0 ? '+' : '';
    return `${sign}${cents}¢`;
  }
}