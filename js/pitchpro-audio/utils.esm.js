import { D as N } from "./DeviceDetection-DXJ36uZ7.mjs";
const i = class i {
  /**
   * Convert frequency to MIDI note number
   */
  static frequencyToMidi(t) {
    return t <= 0 ? 0 : Math.round(12 * Math.log2(t / i.A4_FREQUENCY) + i.A4_MIDI_NUMBER);
  }
  /**
   * Convert MIDI note number to frequency
   */
  static midiToFrequency(t) {
    return i.A4_FREQUENCY * Math.pow(2, (t - i.A4_MIDI_NUMBER) / 12);
  }
  /**
   * Convert frequency to note name with octave
   */
  static frequencyToNote(t, e = !1) {
    if (t <= 0)
      return {
        name: "--",
        octave: 0,
        midi: 0,
        frequency: 0
      };
    const n = i.frequencyToMidi(t), r = e ? i.FLAT_NOTE_NAMES : i.NOTE_NAMES, o = (n - 12) % 12, a = Math.floor((n - 12) / 12);
    return {
      name: r[o] + a,
      octave: a,
      midi: n,
      frequency: i.midiToFrequency(n)
    };
  }
  /**
   * Convert frequency to cents deviation from nearest semitone
   */
  static frequencyToCents(t) {
    if (t <= 0) return 0;
    const e = 12 * Math.log2(t / i.A4_FREQUENCY) + i.A4_MIDI_NUMBER, n = Math.round(e), r = (e - n) * 100;
    return Math.round(r);
  }
  /**
   * Convert cents to frequency ratio
   */
  static centsToRatio(t) {
    return Math.pow(2, t / 1200);
  }
  /**
   * Convert frequency ratio to cents
   */
  static ratioToCents(t) {
    return t <= 0 ? 0 : Math.round(1200 * Math.log2(t));
  }
  /**
   * Get the closest note frequency to a given frequency
   */
  static getClosestNoteFrequency(t) {
    if (t <= 0) return 0;
    const e = i.frequencyToMidi(t);
    return i.midiToFrequency(e);
  }
  /**
   * Calculate the interval between two frequencies in semitones
   */
  static getInterval(t, e) {
    if (t <= 0 || e <= 0) return 0;
    const n = i.frequencyToMidi(t), r = i.frequencyToMidi(e);
    return Math.abs(r - n);
  }
  /**
   * Calculate the interval between two frequencies with direction
   */
  static getSignedInterval(t, e) {
    if (t <= 0 || e <= 0) return 0;
    const n = i.frequencyToMidi(t);
    return i.frequencyToMidi(e) - n;
  }
  /**
   * Get musical interval information
   */
  static getIntervalInfo(t) {
    const e = {
      0: "Perfect Unison",
      1: "Minor Second",
      2: "Major Second",
      3: "Minor Third",
      4: "Major Third",
      5: "Perfect Fourth",
      6: "Tritone",
      7: "Perfect Fifth",
      8: "Minor Sixth",
      9: "Major Sixth",
      10: "Minor Seventh",
      11: "Major Seventh",
      12: "Perfect Octave"
    }, n = (t % 12 + 12) % 12, r = Math.floor(t / 12), o = e[n] || "Unknown";
    return {
      name: r > 0 ? `${o} + ${r} octave(s)` : o,
      semitones: t,
      cents: t * 100,
      ratio: Math.pow(2, t / 12)
    };
  }
  /**
   * Check if frequency is within human vocal range
   */
  static isInVocalRange(t) {
    return t >= 80 && t <= 1100;
  }
  /**
   * Check if frequency is in piano range
   */
  static isInPianoRange(t) {
    return t >= 27.5 && t <= 4186;
  }
  /**
   * Get frequency range for a specific instrument
   */
  static getInstrumentRange(t) {
    return {
      piano: { min: 27.5, max: 4186 },
      guitar: { min: 82.4, max: 1397 },
      // E2 to F6
      violin: { min: 196, max: 3520 },
      // G3 to A7
      cello: { min: 65.4, max: 1397 },
      // C2 to F6
      voice_bass: { min: 87.3, max: 349 },
      // F2 to F4
      voice_tenor: { min: 131, max: 523 },
      // C3 to C5
      voice_alto: { min: 175, max: 698 },
      // F3 to F5
      voice_soprano: { min: 262, max: 1047 }
      // C4 to C6
    }[t] || null;
  }
  /**
   * Generate a chromatic scale starting from a base frequency
   */
  static generateChromaticScale(t, e = 1) {
    const n = [];
    for (let r = 0; r < 12 * e; r++) {
      const o = t * Math.pow(2, r / 12);
      n.push(o);
    }
    return n;
  }
  /**
   * Generate a major scale starting from a base frequency
   */
  static generateMajorScale(t) {
    return [0, 2, 4, 5, 7, 9, 11, 12].map((n) => t * Math.pow(2, n / 12));
  }
  /**
   * Generate a minor scale starting from a base frequency
   */
  static generateMinorScale(t) {
    return [0, 2, 3, 5, 7, 8, 10, 12].map((n) => t * Math.pow(2, n / 12));
  }
  /**
   * Find harmonics of a fundamental frequency
   */
  static findHarmonics(t, e = 8) {
    const n = [];
    for (let r = 1; r <= e; r++)
      n.push(t * r);
    return n;
  }
  /**
   * Check if a frequency could be a harmonic of a fundamental
   */
  static isHarmonic(t, e, n = 0.05) {
    if (e <= 0 || t <= 0)
      return { isHarmonic: !1, harmonicNumber: null, exactFrequency: null };
    const r = t / e, o = Math.round(r);
    return o >= 1 && Math.abs(r - o) <= n ? {
      isHarmonic: !0,
      harmonicNumber: o,
      exactFrequency: e * o
    } : { isHarmonic: !1, harmonicNumber: null, exactFrequency: null };
  }
  /**
   * Calculate the fundamental frequency from a suspected harmonic
   */
  static calculateFundamental(t, e) {
    return e <= 0 || t <= 0 ? 0 : t / e;
  }
  /**
   * Convert frequency to scientific pitch notation
   */
  static frequencyToScientificPitch(t) {
    return i.frequencyToNote(t).name;
  }
  /**
   * Convert scientific pitch notation to frequency
   */
  static scientificPitchToFrequency(t) {
    const e = t.match(/^([A-G][#b]?)(-?\d+)$/);
    if (!e) return 0;
    const [, n, r] = e, o = parseInt(r, 10);
    let a = 0;
    const c = n[0], s = n.slice(1);
    a = {
      C: 0,
      D: 2,
      E: 4,
      F: 5,
      G: 7,
      A: 9,
      B: 11
    }[c] || 0, s === "#" ? a += 1 : s === "b" && (a -= 1);
    const l = (o + 1) * 12 + a;
    return i.midiToFrequency(l);
  }
  /**
   * Format frequency display with appropriate precision
   */
  static formatFrequency(t, e = 1) {
    return t === 0 ? "0 Hz" : t < 0.1 ? "<0.1 Hz" : t >= 1e4 ? `${Math.round(t / 1e3)}k Hz` : `${t.toFixed(e)} Hz`;
  }
  /**
   * Format cents display with sign
   */
  static formatCents(t) {
    return t === 0 ? "0¢" : `${t > 0 ? "+" : ""}${t}¢`;
  }
};
i.A4_FREQUENCY = 440, i.A4_MIDI_NUMBER = 69, i.NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"], i.FLAT_NOTE_NAMES = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"], i.INTERVALS = {
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
let u = i;
const m = class m {
  /**
   * Generate scale from root note
   */
  static generateScale(t, e = "major") {
    const n = m.SCALE_PATTERNS[e];
    if (!n)
      throw new Error(`Unknown scale type: ${e}`);
    return n.map((r) => {
      const o = t * Math.pow(2, r / 12);
      return u.frequencyToNote(o);
    });
  }
  /**
   * Generate chord from root note
   */
  static generateChord(t, e = "major") {
    const n = m.CHORD_PATTERNS[e];
    if (!n)
      throw new Error(`Unknown chord type: ${e}`);
    return n.map((r) => {
      const o = t * Math.pow(2, r / 12);
      return u.frequencyToNote(o);
    });
  }
  /**
   * Identify scale from a set of frequencies
   */
  static identifyScale(t) {
    if (t.length < 3)
      return [];
    const e = t.sort((a, c) => a - c), n = e[0], r = e.map(
      (a) => Math.round(12 * Math.log2(a / n))
    ), o = [];
    return Object.entries(m.SCALE_PATTERNS).forEach(([a, c]) => {
      for (let s = 0; s < 12; s++) {
        const h = c.map((f) => (f + s) % 12).sort((f, d) => f - d), l = r.map((f) => f % 12).sort((f, d) => f - d);
        let M = 0;
        l.forEach((f) => {
          h.includes(f) && M++;
        });
        const p = M / Math.max(l.length, h.length);
        if (p > 0.5) {
          const f = n * Math.pow(2, -s / 12);
          o.push({
            scale: a,
            confidence: p,
            root: u.frequencyToNote(f)
          });
        }
      }
    }), o.sort((a, c) => c.confidence - a.confidence).slice(0, 5);
  }
  /**
   * Identify chord from frequencies
   */
  static identifyChord(t) {
    if (t.length < 2)
      return [];
    const e = t.sort((r, o) => r - o), n = [];
    return Object.entries(m.CHORD_PATTERNS).forEach(([r, o]) => {
      for (let a = 0; a < o.length; a++) {
        const c = [
          ...o.slice(a),
          ...o.slice(0, a).map((s) => s + 12)
        ];
        e.forEach((s, h) => {
          const l = e.map(
            (d) => Math.round(12 * Math.log2(d / s))
          );
          let M = 0;
          const p = new Set(c);
          l.forEach((d) => {
            const T = d % 12;
            (p.has(T) || p.has(T + 12)) && M++;
          });
          const f = M / Math.max(l.length, o.length);
          if (f > 0.6) {
            const d = a === 0 ? s : s * Math.pow(2, -o[a] / 12);
            n.push({
              chord: r,
              confidence: f,
              root: u.frequencyToNote(d),
              inversion: a > 0 ? a : void 0
            });
          }
        });
      }
    }), n.sort((r, o) => o.confidence - r.confidence).slice(0, 3);
  }
  /**
   * Get the key signature for a given key
   */
  static getKeySignature(t, e = "major") {
    const n = ["F", "C", "G", "D", "A", "E", "B"], r = ["B", "E", "A", "D", "G", "C", "F"], o = {
      C: { sharps: 0, flats: 0 },
      G: { sharps: 1, flats: 0 },
      D: { sharps: 2, flats: 0 },
      A: { sharps: 3, flats: 0 },
      E: { sharps: 4, flats: 0 },
      B: { sharps: 5, flats: 0 },
      "F#": { sharps: 6, flats: 0 },
      "C#": { sharps: 7, flats: 0 },
      F: { sharps: 0, flats: 1 },
      Bb: { sharps: 0, flats: 2 },
      Eb: { sharps: 0, flats: 3 },
      Ab: { sharps: 0, flats: 4 },
      Db: { sharps: 0, flats: 5 },
      Gb: { sharps: 0, flats: 6 },
      Cb: { sharps: 0, flats: 7 }
    };
    let a = o[t];
    if (!a && e === "minor") {
      const l = {
        A: "C",
        E: "G",
        B: "D",
        "F#": "A",
        "C#": "E",
        "G#": "B",
        "D#": "F#",
        "A#": "C#",
        D: "F",
        G: "Bb",
        C: "Eb",
        F: "Ab",
        Bb: "Db",
        Eb: "Gb",
        Ab: "Cb"
      }[t];
      l && (a = o[l]);
    }
    if (!a)
      return { sharps: [], flats: [], accidentalCount: 0 };
    const c = n.slice(0, a.sharps).map((h) => h + "#"), s = r.slice(0, a.flats).map((h) => h + "b");
    return {
      sharps: c,
      flats: s,
      accidentalCount: a.sharps || a.flats
    };
  }
  /**
   * Calculate the harmonic series for a fundamental frequency
   */
  static getHarmonicSeries(t, e = 16) {
    const n = [];
    for (let r = 1; r <= e; r++) {
      const o = t * r;
      n.push(u.frequencyToNote(o));
    }
    return n;
  }
  /**
   * Calculate just intonation ratios for common intervals
   */
  static getJustIntonationRatios() {
    return {
      unison: { ratio: 1 / 1, cents: 0 },
      minorSecond: { ratio: 16 / 15, cents: 112 },
      majorSecond: { ratio: 9 / 8, cents: 204 },
      minorThird: { ratio: 6 / 5, cents: 316 },
      majorThird: { ratio: 5 / 4, cents: 386 },
      perfectFourth: { ratio: 4 / 3, cents: 498 },
      tritone: { ratio: 45 / 32, cents: 590 },
      perfectFifth: { ratio: 3 / 2, cents: 702 },
      minorSixth: { ratio: 8 / 5, cents: 814 },
      majorSixth: { ratio: 5 / 3, cents: 884 },
      minorSeventh: { ratio: 16 / 9, cents: 996 },
      majorSeventh: { ratio: 15 / 8, cents: 1088 },
      octave: { ratio: 2 / 1, cents: 1200 }
    };
  }
  /**
   * Convert equal temperament interval to just intonation
   */
  static equalTemperamentToJustIntonation(t) {
    const e = t * 100, n = m.getJustIntonationRatios();
    let r, o = 1 / 0;
    return Object.entries(n).forEach(([c, { cents: s }]) => {
      const h = Math.abs(e - s);
      h < o && (o = h, r = c);
    }), {
      ratio: Math.pow(2, t / 12),
      cents: e,
      closestJustInterval: r,
      centsDeviation: r ? o : void 0
    };
  }
  /**
   * Analyze melodic intervals in a sequence of notes
   */
  static analyzeMelody(t) {
    if (t.length < 2)
      return [];
    const e = [];
    for (let n = 1; n < t.length; n++) {
      const r = t[n - 1], o = t[n], a = u.frequencyToNote(r), c = u.frequencyToNote(o), s = u.getSignedInterval(r, o), h = u.getIntervalInfo(Math.abs(s)), l = s > 0 ? "up" : s < 0 ? "down" : "same";
      e.push({
        fromNote: a,
        toNote: c,
        interval: h,
        direction: l
      });
    }
    return e;
  }
  /**
   * Generate chord progressions in a given key
   */
  static generateChordProgression(t, e = "major", n = [1, 4, 5, 1]) {
    const r = u.scientificPitchToFrequency(t + "4");
    if (r === 0)
      throw new Error(`Invalid key: ${t}`);
    const o = m.generateScale(r, e === "minor" ? "naturalMinor" : "major"), a = [];
    return n.forEach((c) => {
      const s = o[(c - 1) % o.length], h = e === "major" ? m.getMajorScaleChordType(c) : m.getMinorScaleChordType(c), l = m.generateChord(s.frequency, h);
      a.push(l);
    }), a;
  }
  /**
   * Get chord type for scale degree in major scale
   */
  static getMajorScaleChordType(t) {
    return ["major", "minor", "minor", "major", "major", "minor", "diminished"][(t - 1) % 7];
  }
  /**
   * Get chord type for scale degree in minor scale
   */
  static getMinorScaleChordType(t) {
    return ["minor", "diminished", "major", "minor", "minor", "major", "major"][(t - 1) % 7];
  }
};
m.SCALE_PATTERNS = {
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
}, m.CHORD_PATTERNS = {
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
  add9: [0, 4, 7, 14],
  // 14 = 2 + 12 (octave)
  major9: [0, 4, 7, 11, 14],
  minor9: [0, 3, 7, 10, 14]
}, m.CIRCLE_OF_FIFTHS = [
  "C",
  "G",
  "D",
  "A",
  "E",
  "B",
  "F#",
  "C#",
  "Ab",
  "Eb",
  "Bb",
  "F"
], m.INTERVAL_NAMES = {
  0: "Perfect Unison",
  1: "Minor Second",
  2: "Major Second",
  3: "Minor Third",
  4: "Major Third",
  5: "Perfect Fourth",
  6: "Tritone",
  7: "Perfect Fifth",
  8: "Minor Sixth",
  9: "Major Sixth",
  10: "Minor Seventh",
  11: "Major Seventh",
  12: "Perfect Octave"
};
let S = m;
export {
  N as DeviceDetection,
  u as FrequencyUtils,
  S as MusicTheory
};
//# sourceMappingURL=utils.esm.js.map
