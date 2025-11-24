/**
 * PitchShifter - Tone.js Sampler Wrapper
 * @version 2.9.3
 * @date 2025-11-23
 * @changelog
 *   - 2025-11-23 v2.9.3: iPad低音域音量強化
 *     - iPad検出（iPadOS 13+のMacintosh偽装対応）
 *     - 低音域: iPad 0.6x, その他 0.35x
 *     - 中低音域: iPad 0.75x, その他 0.5x
 *   - 2025-11-23 v2.9.2: AudioContext初期化ロジックの統一
 *     - 準備ページ・トレーニングページで同一の基音再生処理を実行
 *     - iOS/iPadOS対応: Tone.start() + resume()の統一呼び出し
 *     - trainingController.jsの重複コードを削除
 *   - 2025-10-29 v2.9.0: エンベロープ調整（attack:0.02s + release:1.5s）
 *     - アタック時間0.02s（高速応答）
 *     - サステイン1.0s（適度な長さ）
 *     - リリース1.5s（自然な減衰）
 *     - 合計2.52s
 *   - 2025-10-29 v2.8.0: エンベロープ微調整（attack:0.03s + release:2.0s）
 *     - アタック時間を0.03sに調整（ノイズ軽減）
 *     - 短いサステイン（0.5s）で簡潔に
 *     - 長いリリース（2.0s）で自然な減衰
 *     - 合計2.53s
 *   - 2025-10-29 v2.7.0: エンベロープ最終調整（attack:0.01s + release:2.0s）
 *     - 超高速アタック（0.01s）で即座の応答
 *     - 短いサステイン（0.5s）で簡潔に
 *     - 長いリリース（2.0s）で自然な減衰
 *     - 合計2.51s
 *   - 2025-10-29 v2.6.0: エンベロープ最適化（attack:0.02s + release:1.5s）
 *     - 高速アタック（0.02s）で即座の応答
 *     - 適度なリリース（1.5s）で自然な減衰
 *     - 再生時間1.0s、合計2.52s
 *   - 2025-10-29 v2.5.0: 2秒完結設計（attack:0.05s + release:0.5s）
 *     - リリース時間を0.5sに短縮（2秒以内完結）
 *     - アタック時間は0.05sを維持（ノイズ軽減）
 *     - カーブをlinearに変更してレイテンシ削減
 *   - 2025-10-29 v2.4.0: エンベロープ微調整（attack:0.05s + release:2.0s）
 *     - アタック時間を0.05sに調整（ノイズ軽減とレスポンスのバランス）
 *     - リリース時間は2.0sを維持（安定性重視）
 *     - カーブをlinearに変更してレイテンシ削減
 *   - 2025-10-29 v2.3.0: クリッキングノイズ対策（attack:0.1s + release:2.0s）
 *     - アタック時間を0.1sに延長（ブチ音対策）
 *     - リリース時間は2.0sを維持（安定性重視）
 *     - カーブをlinearに変更してレイテンシ削減
 *   - 2025-10-28 v2.2.0: エンベロープ再調整（attack:0.01s + release:2.0s）
 *     - 高速アタック（0.01s）で即座の応答
 *     - リリース時間を2.0sに延長（安定性重視）
 *     - カーブをlinearに変更してレイテンシ削減
 *   - 2025-10-28 v2.1.0: エンベロープ最適化（attack:0.01s + release:1.0s）
 *     - 高速アタック（0.01s）で即座の応答
 *     - 適度なリリース（1.0s）で音の分離を改善
 *     - カーブをlinearに変更してレイテンシ削減
 *   - 2025-10-28 v2.0.0: シンプル戦略に回帰（C3単一サンプルで安定性重視）
 *   - 2025-10-28: 複雑なサンプルマッピングを廃止し、シンプルで確実な実装に
 *   - 2025-10-28: クリッキングノイズ対策強化（attack: 0.15秒、安定化待機100ms）
 *   - 2025-10-28: 低音域の音量バランス調整・音割れ対策強化
 *   - 2025-10-28: キャッシュバスター実装（クエリパラメータでバージョン管理）
 */
const SAMPLE_VERSION = "2.9.3";
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
      // ⚠️ IMPORTANT: この値を変更する場合は、以下の2箇所も同時に変更すること
      // 1. /js/router.js (line 264-265)
      // 2. /pages/js/preparation-pitchpro-cycle.js (line 839-840)
      release: e.release ?? 1.5,
      // Natural release (1.5s) for smooth decay
      attack: e.attack ?? 0.02,
      // Fast attack (0.02s) for immediate response
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
      console.log("🎹 [PitchShifter] Initializing..."), l.getContext().state !== "running" && (await l.start(), console.log("🔊 [PitchShifter] AudioContext started"));

      // Single sample strategy: C3 as base (optimized for low-mid range)
      // C3 (130.81Hz) provides better balance for typical vocal range
      // Low notes (C2-B2): -12 to -1 semitones (downward shift)
      // Mid notes (C3-B3): 0 to +11 semitones (minimal shift)
      // High notes (C4-E5): +12 to +24 semitones (upward shift)
      const sampleUrls = {
        "C3": `C3.mp3?v=${SAMPLE_VERSION}`
      };

      console.log(`📦 [PitchShifter] Sample version: ${SAMPLE_VERSION}`);

      this.sampler = new l.Sampler({
        urls: sampleUrls,
        baseUrl: this.config.baseUrl,
        release: this.config.release,
        attack: this.config.attack,
        // Using config values for optimal envelope
        curve: "linear",
        // Linear curve for minimal latency and clicking noise reduction
        onload: () => {
          console.log("✅ [PitchShifter] Samples loaded successfully");
        },
        onerror: (error) => {
          console.warn("⚠️ [PitchShifter] Some samples failed to load, using available samples:", error);
          // Tone.js will automatically fall back to available samples
        }
      }).toDestination();

      this.sampler.volume.value = this.config.volume;
      console.log("📥 [PitchShifter] Loading audio samples...");
      await l.loaded();

      this.isInitialized = !0, console.log("✅ [PitchShifter] Initialization complete - attack:0.02s + sustain:1.0s + release:1.5s (2.52s total)");
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

      // 【v2.9.2統合】iOS/iPadOS対応: AudioContext初期化の統一ロジック
      // 準備ページ・トレーニングページで同一の処理を実行
      const audioContext = l.getContext();
      console.log(`🔊 [PitchShifter] AudioContext状態確認 (state: ${audioContext.state})`);

      // Tone.start()を明示的に呼び出し（iOS/iPadOS対応）
      if (audioContext.state === "suspended") {
        console.log("🔊 [PitchShifter] Tone.start()実行中...");
        await l.start();
        console.log(`✅ [PitchShifter] Tone.start()完了 (state: ${audioContext.state})`);
      }

      // resume()で確実に起動
      if (audioContext.state !== "running") {
        console.log(`🔊 [PitchShifter] AudioContext再開中... (state: ${audioContext.state})`);
        await audioContext.resume();
        console.log(`✅ [PitchShifter] AudioContext再開完了 (state: ${audioContext.state})`);
        // 安定化のため待機（iOS/iPadOS対策）
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // 【追加】Tone.js内部準備のための短時間待機（クリッキングノイズ対策）
      await new Promise(resolve => setTimeout(resolve, 10));

      // 【追加】低音域の音量バランス調整（v2.9.3: iPad対応強化）
      // iPad検出: iPadOS 13+はMacintoshを偽装するため、タッチ判定も使用
      const userAgent = navigator.userAgent;
      const isIPad = /iPad/.test(userAgent) || (/Macintosh/.test(userAgent) && 'ontouchend' in document);

      // C2-B2 (65-123Hz): 低音域の音量調整
      // C3-B3 (130-246Hz): 中低音域の音量調整
      // C4以上: 1.0x velocity (通常音量)
      // iOS（iPad/iPhone）: スピーカー特性を考慮して音量を維持（減衰なし）
      // v2.9.5: iPhone低音域の減衰も撤廃（iPad同様）
      const isIPhone = /iPhone/.test(userAgent);
      const isIOS = isIPad || isIPhone;
      let adjustedVelocity = o;
      if (a.frequency < 130) {
        // 低音域: iOS 1.0x（減衰なし）, その他 0.35x
        adjustedVelocity = isIOS ? o : o * 0.35;
        console.log(`🔉 [PitchShifter] Low bass adjustment${isIOS ? ' (iOS, no reduction)' : ''}: velocity ${o.toFixed(2)} → ${adjustedVelocity.toFixed(2)}`);
      } else if (a.frequency < 260) {
        // 中低音域: iOS 1.0x（減衰なし）, その他 0.5x
        adjustedVelocity = isIOS ? o : o * 0.5;
        console.log(`🔉 [PitchShifter] Mid-low adjustment${isIOS ? ' (iOS, no reduction)' : ''}: velocity ${o.toFixed(2)} → ${adjustedVelocity.toFixed(2)}`);
      }

      // 【DEBUG】再生直前のsampler音量を確認
      console.log(`🔊 [DEBUG] sampler.volume.value: ${this.sampler.volume.value}dB`);
      // 【DEBUG v2.9.2】AudioContext状態とTone.js Destination確認
      const ctx = l.getContext();
      console.log(`🔊 [DEBUG] AudioContext state: ${ctx.state}`);
      console.log(`🔊 [DEBUG] Tone.Destination volume: ${l.getDestination().volume.value}dB`);
      console.log(`🎵 [PitchShifter] Playing ${e} (${a.frequency.toFixed(2)}Hz) for ${i}s at velocity ${adjustedVelocity.toFixed(2)}`);

      // 【修正】即座に再生開始（オフセットなし）
      // triggerAttack/triggerReleaseの分離により低音域でのノイズを防止
      this.sampler.triggerAttack(e, void 0, adjustedVelocity);

      // 指定時間後にリリース
      setTimeout(() => {
        this.sampler && (this.sampler.triggerRelease(e), console.log(`🔇 [PitchShifter] Released ${e}`));
        this.isPlaying = !1;
        console.log(`✅ [PitchShifter] Playback completed ${e}`);
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
/** 利用可能な音符リスト（低音域～高音域まで拡張） */
n(t, "AVAILABLE_NOTES", [
  // 低音域（C2-B2）- 男性・低音域対応
  { note: "C2", frequency: 65.41, japaneseName: "ド（超低）" },
  { note: "C#2", frequency: 69.30, japaneseName: "ド♯（超低）" },
  { note: "D2", frequency: 73.42, japaneseName: "レ（超低）" },
  { note: "D#2", frequency: 77.78, japaneseName: "レ♯（超低）" },
  { note: "E2", frequency: 82.41, japaneseName: "ミ（超低）" },
  { note: "F2", frequency: 87.31, japaneseName: "ファ（超低）" },
  { note: "F#2", frequency: 92.50, japaneseName: "ファ♯（超低）" },
  { note: "G2", frequency: 98.00, japaneseName: "ソ（超低）" },
  { note: "G#2", frequency: 103.83, japaneseName: "ソ♯（超低）" },
  { note: "A2", frequency: 110.00, japaneseName: "ラ（超低）" },
  { note: "A#2", frequency: 116.54, japaneseName: "ラ♯（超低）" },
  { note: "B2", frequency: 123.47, japaneseName: "シ（超低）" },

  // 中低音域（C3-B3）- 一般的な男性音域・女性低音域
  { note: "C3", frequency: 130.81, japaneseName: "ド（中低）" },
  { note: "C#3", frequency: 138.59, japaneseName: "ド♯（中低）" },
  { note: "D3", frequency: 146.83, japaneseName: "レ（中低）" },
  { note: "D#3", frequency: 155.56, japaneseName: "レ♯（中低）" },
  { note: "E3", frequency: 164.81, japaneseName: "ミ（中低）" },
  { note: "F3", frequency: 174.61, japaneseName: "ファ（中低）" },
  { note: "F#3", frequency: 185.00, japaneseName: "ファ♯（中低）" },
  { note: "G3", frequency: 196.00, japaneseName: "ソ（中低）" },
  { note: "G#3", frequency: 207.65, japaneseName: "ソ♯（中低）" },
  { note: "A3", frequency: 220.00, japaneseName: "ラ（中低）" },
  { note: "A#3", frequency: 233.08, japaneseName: "ラ♯（中低）" },
  { note: "B3", frequency: 246.94, japaneseName: "シ（中低）" },

  // 中音域（C4-E5）- 一般的な女性音域・混声合唱中心域
  { note: "C4", frequency: 261.63, japaneseName: "ド（中）" },
  { note: "C#4", frequency: 277.18, japaneseName: "ド♯（中）" },
  { note: "D4", frequency: 293.66, japaneseName: "レ（中）" },
  { note: "D#4", frequency: 311.13, japaneseName: "レ♯（中）" },
  { note: "E4", frequency: 329.63, japaneseName: "ミ（中）" },
  { note: "F4", frequency: 349.23, japaneseName: "ファ（中）" },
  { note: "F#4", frequency: 369.99, japaneseName: "ファ♯（中）" },
  { note: "G4", frequency: 392.00, japaneseName: "ソ（中）" },
  { note: "G#4", frequency: 415.30, japaneseName: "ソ♯（中）" },
  { note: "A4", frequency: 440.00, japaneseName: "ラ（中）" },
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
