var c = Object.defineProperty;
var f = (s, e, i) => e in s ? c(s, e, { enumerable: !0, configurable: !0, writable: !0, value: i }) : s[e] = i;
var n = (s, e, i) => f(s, typeof e != "symbol" ? e + "" : e, i);
import * as l from "tone";
const t = class t {
  constructor(e = {}) {
    n(this, "sampler", null);
    n(this, "config");
    n(this, "isInitialized", !1);
    n(this, "isPlaying", !1);
    this.config = {
      baseUrl: e.baseUrl || "/audio/piano/",
      release: e.release ?? 2.5,
      // Longer release for natural piano decay
      volume: e.volume ?? -6,
      noteRange: e.noteRange || t.AVAILABLE_NOTES.map((i) => i.note)
    };
  }
  /**
   * Initialize the PitchShifter system
   */
  async initialize() {
    if (this.isInitialized) {
      console.warn("⚠️ [PitchShifter] Already initialized");
      return;
    }
    try {
      console.log("🎹 [PitchShifter] Initializing..."), l.getContext().state !== "running" && (await l.start(), console.log("🔊 [PitchShifter] AudioContext started")), this.sampler = new l.Sampler({
        urls: {
          C4: "C4.mp3"
        },
        baseUrl: this.config.baseUrl,
        release: this.config.release
      }).toDestination(), this.sampler.volume.value = this.config.volume, console.log("📥 [PitchShifter] Loading audio sample..."), await l.loaded(), this.isInitialized = !0, console.log("✅ [PitchShifter] Initialization complete");
    } catch (e) {
      throw console.error("❌ [PitchShifter] Initialization failed:", e), new Error(`PitchShifter initialization failed: ${e}`);
    }
  }
  /**
   * Play a note with the specified pitch
   *
   * @param note - Note name (e.g., "C4", "D4")
   * @param duration - Duration in seconds (default: 2)
   * @param velocity - Velocity 0-1 (default: 0.8)
   */
  async playNote(e, i = 2, o = 0.8) {
    if (!this.isInitialized || !this.sampler)
      throw new Error("PitchShifter not initialized. Call initialize() first.");
    if (this.isPlaying) {
      console.warn("⚠️ [PitchShifter] Already playing, skipping");
      return;
    }
    try {
      this.isPlaying = !0;
      const a = t.AVAILABLE_NOTES.find((r) => r.note === e);
      if (!a)
        throw new Error(`Invalid note: ${e}`);
      console.log(`🎵 [PitchShifter] Playing ${e} (${a.frequency.toFixed(2)}Hz) for ${i}s`), this.sampler.triggerAttack(e, void 0, o), setTimeout(() => {
        this.sampler && (this.sampler.triggerRelease(e), console.log(`🔇 [PitchShifter] Released ${e}`)), this.isPlaying = !1;
      }, i * 1e3);
    } catch (a) {
      throw this.isPlaying = !1, console.error("❌ [PitchShifter] Play note failed:", a), a;
    }
  }
  /**
   * Play a random note from available range
   *
   * @param duration - Duration in seconds (default: 2)
   * @returns The note info that was played
   */
  async playRandomNote(e = 2) {
    const i = t.AVAILABLE_NOTES[Math.floor(Math.random() * t.AVAILABLE_NOTES.length)];
    return console.log(`🎲 [PitchShifter] Random note selected: ${i.note} (${i.japaneseName})`), await this.playNote(i.note, e), i;
  }
  /**
   * Stop currently playing note immediately
   */
  stopNote(e) {
    if (!this.sampler) {
      console.warn("⚠️ [PitchShifter] Not initialized");
      return;
    }
    this.sampler.triggerRelease(e), this.isPlaying = !1, console.log(`🛑 [PitchShifter] Stopped ${e}`);
  }
  /**
   * Stop all currently playing notes
   */
  stopAll() {
    if (!this.sampler) {
      console.warn("⚠️ [PitchShifter] Not initialized");
      return;
    }
    this.sampler.releaseAll(), this.isPlaying = !1, console.log("🛑 [PitchShifter] Stopped all notes");
  }
  /**
   * Set volume in dB
   */
  setVolume(e) {
    if (!this.sampler) {
      console.warn("⚠️ [PitchShifter] Not initialized");
      return;
    }
    this.sampler.volume.value = e, console.log(`🔊 [PitchShifter] Volume set to ${e}dB`);
  }
  /**
   * Get note info by note name
   */
  static getNoteInfo(e) {
    return t.AVAILABLE_NOTES.find((i) => i.note === e);
  }
  /**
   * Get note info by frequency (finds closest match)
   */
  static getNoteByFrequency(e) {
    let i = t.AVAILABLE_NOTES[0], o = Math.abs(e - i.frequency);
    for (const a of t.AVAILABLE_NOTES) {
      const r = Math.abs(e - a.frequency);
      r < o && (o = r, i = a);
    }
    return i;
  }
  /**
   * Check if currently playing
   */
  isCurrentlyPlaying() {
    return this.isPlaying;
  }
  /**
   * Dispose of resources
   */
  dispose() {
    this.sampler && (this.sampler.dispose(), this.sampler = null), this.isInitialized = !1, this.isPlaying = !1, console.log("🗑️ [PitchShifter] Disposed");
  }
};
/** 利用可能な音符リスト */
n(t, "AVAILABLE_NOTES", [
  { note: "C4", frequency: 261.63, japaneseName: "ド（低）" },
  { note: "C#4", frequency: 277.18, japaneseName: "ド♯（低）" },
  { note: "D4", frequency: 293.66, japaneseName: "レ（低）" },
  { note: "D#4", frequency: 311.13, japaneseName: "レ♯（低）" },
  { note: "E4", frequency: 329.63, japaneseName: "ミ（低）" },
  { note: "F4", frequency: 349.23, japaneseName: "ファ（低）" },
  { note: "F#4", frequency: 369.99, japaneseName: "ファ♯（低）" },
  { note: "G4", frequency: 392, japaneseName: "ソ（低）" },
  { note: "G#4", frequency: 415.3, japaneseName: "ソ♯（低）" },
  { note: "A4", frequency: 440, japaneseName: "ラ（中）" },
  { note: "A#4", frequency: 466.16, japaneseName: "ラ♯（中）" },
  { note: "B4", frequency: 493.88, japaneseName: "シ（中）" },
  { note: "C5", frequency: 523.25, japaneseName: "ド（高）" },
  { note: "D5", frequency: 587.33, japaneseName: "レ（高）" },
  { note: "E5", frequency: 659.25, japaneseName: "ミ（高）" }
]);
let h = t;
export {
  h as PitchShifter
};
//# sourceMappingURL=index.js.map
