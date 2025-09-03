/**
 * FrequencyUtils - Frequency conversion and analysis utilities
 *
 * Provides utilities for converting between frequencies, notes, cents, and MIDI values
 * Includes musical interval calculations and frequency analysis functions
 */
import type { MusicalNote, MusicalInterval } from '../types';
export declare class FrequencyUtils {
    static readonly A4_FREQUENCY = 440;
    static readonly A4_MIDI_NUMBER = 69;
    static readonly NOTE_NAMES: string[];
    static readonly FLAT_NOTE_NAMES: string[];
    static readonly INTERVALS: {
        unison: number;
        minorSecond: number;
        majorSecond: number;
        minorThird: number;
        majorThird: number;
        perfectFourth: number;
        tritone: number;
        perfectFifth: number;
        minorSixth: number;
        majorSixth: number;
        minorSeventh: number;
        majorSeventh: number;
        octave: number;
    };
    /**
     * Convert frequency to MIDI note number
     */
    static frequencyToMidi(frequency: number): number;
    /**
     * Convert MIDI note number to frequency
     */
    static midiToFrequency(midiNumber: number): number;
    /**
     * Convert frequency to note name with octave
     */
    static frequencyToNote(frequency: number, useFlats?: boolean): MusicalNote;
    /**
     * Convert frequency to cents deviation from nearest semitone
     */
    static frequencyToCents(frequency: number): number;
    /**
     * Convert cents to frequency ratio
     */
    static centsToRatio(cents: number): number;
    /**
     * Convert frequency ratio to cents
     */
    static ratioToCents(ratio: number): number;
    /**
     * Get the closest note frequency to a given frequency
     */
    static getClosestNoteFrequency(frequency: number): number;
    /**
     * Calculate the interval between two frequencies in semitones
     */
    static getInterval(frequency1: number, frequency2: number): number;
    /**
     * Calculate the interval between two frequencies with direction
     */
    static getSignedInterval(fromFrequency: number, toFrequency: number): number;
    /**
     * Get musical interval information
     */
    static getIntervalInfo(semitones: number): MusicalInterval;
    /**
     * Check if frequency is within human vocal range
     */
    static isInVocalRange(frequency: number): boolean;
    /**
     * Check if frequency is in piano range
     */
    static isInPianoRange(frequency: number): boolean;
    /**
     * Get frequency range for a specific instrument
     */
    static getInstrumentRange(instrument: string): {
        min: number;
        max: number;
    } | null;
    /**
     * Generate a chromatic scale starting from a base frequency
     */
    static generateChromaticScale(baseFrequency: number, octaves?: number): number[];
    /**
     * Generate a major scale starting from a base frequency
     */
    static generateMajorScale(baseFrequency: number): number[];
    /**
     * Generate a minor scale starting from a base frequency
     */
    static generateMinorScale(baseFrequency: number): number[];
    /**
     * Find harmonics of a fundamental frequency
     */
    static findHarmonics(fundamental: number, maxHarmonic?: number): number[];
    /**
     * Check if a frequency could be a harmonic of a fundamental
     */
    static isHarmonic(frequency: number, fundamental: number, tolerance?: number): {
        isHarmonic: boolean;
        harmonicNumber: number | null;
        exactFrequency: number | null;
    };
    /**
     * Calculate the fundamental frequency from a suspected harmonic
     */
    static calculateFundamental(harmonicFrequency: number, harmonicNumber: number): number;
    /**
     * Convert frequency to scientific pitch notation
     */
    static frequencyToScientificPitch(frequency: number): string;
    /**
     * Convert scientific pitch notation to frequency
     */
    static scientificPitchToFrequency(scientificPitch: string): number;
    /**
     * Format frequency display with appropriate precision
     */
    static formatFrequency(frequency: number, decimalPlaces?: number): string;
    /**
     * Format cents display with sign
     */
    static formatCents(cents: number): string;
}
//# sourceMappingURL=FrequencyUtils.d.ts.map