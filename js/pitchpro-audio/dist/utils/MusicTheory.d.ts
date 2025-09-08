/**
 * MusicTheory - Musical theory utilities and calculations
 *
 * Provides utilities for scales, chords, intervals, and musical analysis
 * Supports various temperaments and tuning systems
 */
import type { MusicalNote, MusicalInterval } from '../types';
export declare class MusicTheory {
    static readonly SCALE_PATTERNS: {
        major: number[];
        naturalMinor: number[];
        harmonicMinor: number[];
        melodicMinor: number[];
        dorian: number[];
        phrygian: number[];
        lydian: number[];
        mixolydian: number[];
        locrian: number[];
        pentatonicMajor: number[];
        pentatonicMinor: number[];
        blues: number[];
        chromatic: number[];
    };
    static readonly CHORD_PATTERNS: {
        major: number[];
        minor: number[];
        diminished: number[];
        augmented: number[];
        sus2: number[];
        sus4: number[];
        major7: number[];
        minor7: number[];
        dominant7: number[];
        majorMaj7: number[];
        halfDiminished7: number[];
        diminished7: number[];
        add9: number[];
        major9: number[];
        minor9: number[];
    };
    static readonly CIRCLE_OF_FIFTHS: string[];
    static readonly INTERVAL_NAMES: {
        0: string;
        1: string;
        2: string;
        3: string;
        4: string;
        5: string;
        6: string;
        7: string;
        8: string;
        9: string;
        10: string;
        11: string;
        12: string;
    };
    /**
     * Generate scale from root note
     */
    static generateScale(rootFrequency: number, scaleType?: keyof typeof MusicTheory.SCALE_PATTERNS): MusicalNote[];
    /**
     * Generate chord from root note
     */
    static generateChord(rootFrequency: number, chordType?: keyof typeof MusicTheory.CHORD_PATTERNS): MusicalNote[];
    /**
     * Identify scale from a set of frequencies
     */
    static identifyScale(frequencies: number[]): Array<{
        scale: keyof typeof MusicTheory.SCALE_PATTERNS;
        confidence: number;
        root: MusicalNote;
    }>;
    /**
     * Identify chord from frequencies
     */
    static identifyChord(frequencies: number[]): Array<{
        chord: keyof typeof MusicTheory.CHORD_PATTERNS;
        confidence: number;
        root: MusicalNote;
        inversion?: number;
    }>;
    /**
     * Get the key signature for a given key
     */
    static getKeySignature(key: string, mode?: 'major' | 'minor'): {
        sharps: string[];
        flats: string[];
        accidentalCount: number;
    };
    /**
     * Calculate the harmonic series for a fundamental frequency
     */
    static getHarmonicSeries(fundamental: number, harmonicCount?: number): MusicalNote[];
    /**
     * Calculate just intonation ratios for common intervals
     */
    static getJustIntonationRatios(): {
        [key: string]: {
            ratio: number;
            cents: number;
        };
    };
    /**
     * Convert equal temperament interval to just intonation
     */
    static equalTemperamentToJustIntonation(semitones: number): {
        ratio: number;
        cents: number;
        closestJustInterval?: string;
        centsDeviation?: number;
    };
    /**
     * Analyze melodic intervals in a sequence of notes
     */
    static analyzeMelody(frequencies: number[]): Array<{
        fromNote: MusicalNote;
        toNote: MusicalNote;
        interval: MusicalInterval;
        direction: 'up' | 'down' | 'same';
    }>;
    /**
     * Generate chord progressions in a given key
     */
    static generateChordProgression(key: string, mode?: 'major' | 'minor', progression?: number[]): MusicalNote[][];
    /**
     * Get chord type for scale degree in major scale
     */
    private static getMajorScaleChordType;
    /**
     * Get chord type for scale degree in minor scale
     */
    private static getMinorScaleChordType;
}
//# sourceMappingURL=MusicTheory.d.ts.map