import { PitchDetector as F } from "pitchy";
class A {
  constructor(t = {}) {
    this.audioContext = null, this.mediaStream = null, this.sourceNode = null, this.gainNode = null, this.analysers = /* @__PURE__ */ new Map(), this.filters = /* @__PURE__ */ new Map(), this.refCount = 0, this.initPromise = null, this.isInitialized = !1, this.lastError = null, this.config = {
      sampleRate: 44100,
      channelCount: 1,
      echoCancellation: !1,
      noiseSuppression: !1,
      autoGainControl: !1,
      latency: 0.1,
      ...t
    }, this.currentSensitivity = this._getDefaultSensitivity();
  }
  /**
   * Get device-dependent default sensitivity
   */
  _getDefaultSensitivity() {
    switch (this.getPlatformSpecs().deviceType) {
      case "iPad":
        return console.log("🔧 [AudioManager] iPad detected - setting default sensitivity 7.0x"), 7;
      case "iPhone":
        return console.log("🔧 [AudioManager] iPhone detected - setting default sensitivity 3.0x"), 3;
      default:
        return console.log("🔧 [AudioManager] PC detected - setting default sensitivity 1.0x"), 1;
    }
  }
  /**
   * Initialize audio resources
   * Safe to call multiple times (singleton-like behavior)
   */
  async initialize() {
    var t, e, i;
    if (this.initPromise)
      return this.initPromise;
    if (this.isInitialized && this.audioContext && this.mediaStream) {
      const s = this.checkMediaStreamHealth();
      if (s.healthy)
        return this.refCount++, {
          audioContext: this.audioContext,
          mediaStream: this.mediaStream,
          sourceNode: this.sourceNode
        };
      console.warn("⚠️ [AudioManager] Unhealthy MediaStream detected - force re-initialization:", s), console.log("🔄 [AudioManager] Unhealthy MediaStream details:", {
        mediaStreamActive: (t = this.mediaStream) == null ? void 0 : t.active,
        trackCount: (e = this.mediaStream) == null ? void 0 : e.getTracks().length,
        trackStates: (i = this.mediaStream) == null ? void 0 : i.getTracks().map((o) => ({
          kind: o.kind,
          readyState: o.readyState,
          enabled: o.enabled,
          muted: o.muted
        }))
      }), this._cleanup(), this.isInitialized = !1, this.refCount = 0, await new Promise((o) => setTimeout(o, 100)), console.log("🔄 [AudioManager] Cleanup complete - starting re-initialization");
    }
    this.initPromise = this._doInitialize();
    try {
      const s = await this.initPromise;
      return this.initPromise = null, s;
    } catch (s) {
      throw this.initPromise = null, s;
    }
  }
  /**
   * Actual initialization process
   */
  async _doInitialize() {
    try {
      if (console.log("🎤 [AudioManager] Starting initialization"), this.audioContext || (this.audioContext = new (window.AudioContext || window.webkitAudioContext)(), console.log("✅ [AudioManager] AudioContext creation complete")), this.audioContext.state === "suspended" && (await this.audioContext.resume(), console.log("✅ [AudioManager] AudioContext resume complete")), !this.mediaStream) {
        const t = this.getPlatformSpecs();
        console.log(`🔍 [AudioManager] Device detection: ${t.deviceType}`, navigator.userAgent), console.log(`🔍 [AudioManager] Touch support: ${"ontouchend" in document}`);
        const e = {
          audio: {
            // Basic settings: Safari WebKit stability focused
            echoCancellation: this.config.echoCancellation,
            noiseSuppression: this.config.noiseSuppression,
            autoGainControl: this.config.autoGainControl,
            // iOS specific: Ultra high sensitivity settings
            ...t.isIOS && {
              googAutoGainControl: !1,
              // Google AGC complete disable
              googNoiseSuppression: !1,
              // Google noise suppression disable
              googEchoCancellation: !1,
              // Google echo cancellation disable
              googHighpassFilter: !1,
              // Google highpass filter disable
              googTypingNoiseDetection: !1,
              // Typing noise detection disable
              googBeamforming: !1,
              // Beamforming disable
              mozAutoGainControl: !1,
              // Mozilla AGC disable
              mozNoiseSuppression: !1
              // Mozilla noise suppression disable
            },
            // Safari compatibility: Explicit quality settings
            sampleRate: this.config.sampleRate,
            channelCount: this.config.channelCount,
            sampleSize: 16,
            // Safari WebKit additional stabilization settings
            latency: this.config.latency,
            // 100ms latency tolerance
            volume: 1,
            // Volume normalization
            // Flexible device selection (Safari compatibility)
            deviceId: { ideal: "default" }
          }
        };
        console.log("🎤 [AudioManager] Getting MediaStream with Safari-compatible settings:", e), this.mediaStream = await navigator.mediaDevices.getUserMedia(e), console.log("✅ [AudioManager] MediaStream acquisition complete");
      }
      if (!this.sourceNode) {
        this.sourceNode = this.audioContext.createMediaStreamSource(this.mediaStream), console.log("✅ [AudioManager] SourceNode creation complete");
        const t = this.mediaStream.getTracks();
        console.log("🎤 [AudioManager] MediaStream tracks:", t.map((e) => ({
          kind: e.kind,
          label: e.label,
          enabled: e.enabled,
          readyState: e.readyState,
          muted: e.muted
        })));
      }
      return this.gainNode || (this.gainNode = this.audioContext.createGain(), this.gainNode.gain.value = this.currentSensitivity, this.sourceNode.connect(this.gainNode), console.log(`✅ [AudioManager] GainNode creation complete (sensitivity: ${this.currentSensitivity}x)`)), this.isInitialized = !0, this.refCount++, this.lastError = null, console.log(`🎤 [AudioManager] Initialization complete (refCount: ${this.refCount})`), {
        audioContext: this.audioContext,
        mediaStream: this.mediaStream,
        sourceNode: this.sourceNode
      };
    } catch (t) {
      throw console.error("❌ [AudioManager] Initialization error:", t), this.lastError = t, this.isInitialized = !1, this._cleanup(), t;
    }
  }
  /**
   * Create dedicated AnalyserNode
   * @param id - Analyser identifier
   * @param options - Option settings
   */
  createAnalyser(t, e = {}) {
    if (!this.isInitialized || !this.audioContext || !this.sourceNode)
      throw new Error("AudioManager not initialized. Call initialize() first.");
    this.removeAnalyser(t);
    const {
      fftSize: i = 2048,
      smoothingTimeConstant: s = 0.8,
      minDecibels: o = -90,
      maxDecibels: n = -10,
      useFilters: a = !0
    } = e, r = this.audioContext.createAnalyser();
    r.fftSize = Math.min(i, 2048), r.smoothingTimeConstant = Math.max(s, 0.7), r.minDecibels = Math.max(o, -80), r.maxDecibels = Math.min(n, -10);
    let h = this.gainNode || this.sourceNode;
    if (a) {
      const c = this._createFilterChain();
      this.filters.set(t, c), h.connect(c.highpass), c.highpass.connect(c.lowpass), c.lowpass.connect(c.notch), c.notch.connect(r), console.log(`🔧 [AudioManager] Filtered Analyser created: ${t}`);
    } else
      h.connect(r), console.log(`🔧 [AudioManager] Raw signal Analyser created: ${t}`);
    return this.analysers.set(t, r), r;
  }
  /**
   * Create 3-stage noise reduction filter chain
   */
  _createFilterChain() {
    if (!this.audioContext)
      throw new Error("AudioContext not available");
    const t = this.audioContext.createBiquadFilter();
    t.type = "highpass", t.frequency.setValueAtTime(80, this.audioContext.currentTime), t.Q.setValueAtTime(0.7, this.audioContext.currentTime);
    const e = this.audioContext.createBiquadFilter();
    e.type = "lowpass", e.frequency.setValueAtTime(800, this.audioContext.currentTime), e.Q.setValueAtTime(0.7, this.audioContext.currentTime);
    const i = this.audioContext.createBiquadFilter();
    return i.type = "notch", i.frequency.setValueAtTime(60, this.audioContext.currentTime), i.Q.setValueAtTime(10, this.audioContext.currentTime), { highpass: t, lowpass: e, notch: i };
  }
  /**
   * Remove specific analyser
   */
  removeAnalyser(t) {
    if (this.analysers.has(t) && (this.analysers.get(t).disconnect(), this.analysers.delete(t), console.log(`🗑️ [AudioManager] Analyser removed: ${t}`)), this.filters.has(t)) {
      const e = this.filters.get(t);
      e.highpass.disconnect(), e.lowpass.disconnect(), e.notch.disconnect(), this.filters.delete(t), console.log(`🗑️ [AudioManager] Filter chain removed: ${t}`);
    }
  }
  /**
   * Adjust microphone sensitivity
   * @param sensitivity - Sensitivity multiplier (0.1 ~ 10.0)
   */
  setSensitivity(t) {
    const e = Math.max(0.1, Math.min(10, t));
    this.gainNode ? (this.gainNode.gain.value = e, this.currentSensitivity = e, console.log(`🎤 [AudioManager] Microphone sensitivity updated: ${e.toFixed(1)}x`)) : (this.currentSensitivity = e, console.log(`🎤 [AudioManager] Microphone sensitivity set (awaiting initialization): ${e.toFixed(1)}x`));
  }
  /**
   * Get current microphone sensitivity
   */
  getSensitivity() {
    return this.currentSensitivity;
  }
  /**
   * Get platform-specific settings according to specification
   * Complies with MICROPHONE_PLATFORM_SPECIFICATIONS.md
   */
  getPlatformSpecs() {
    const t = /iPhone/.test(navigator.userAgent), e = /iPad/.test(navigator.userAgent), i = /Macintosh/.test(navigator.userAgent) && "ontouchend" in document, s = t || e || i;
    return {
      deviceType: e || i ? "iPad" : t ? "iPhone" : "PC",
      isIOS: s,
      // Volume calculation divisor (important: this value determines sensitivity)
      divisor: s ? 4 : 6,
      // iPhone/iPad: 4.0, PC: 6.0
      // Volume correction (iPhone/iPad low frequency cut response)  
      gainCompensation: s ? 1.5 : 1,
      // iPhone/iPad: 1.5, PC: 1.0
      // Noise threshold (basis for 0% display during silence)
      noiseThreshold: s ? 12 : 15,
      // iPhone/iPad: 12, PC: 15
      // Smoothing (minimal)
      smoothingFactor: 0.2,
      // Common to both platforms
      // Additional device-specific settings
      sensitivity: this.currentSensitivity,
      noiseGate: s ? 0.01 : 0.02
    };
  }
  /**
   * Decrement reference count and cleanup
   */
  release(t = []) {
    t.forEach((e) => this.removeAnalyser(e)), this.refCount = Math.max(0, this.refCount - 1), console.log(`📉 [AudioManager] Reference count decremented: ${this.refCount}`), this.refCount <= 0 && (console.log("🧹 [AudioManager] Starting full resource cleanup"), this._cleanup());
  }
  /**
   * Force cleanup (for emergency use)
   */
  forceCleanup() {
    console.log("🚨 [AudioManager] Force cleanup executed"), this._cleanup();
  }
  /**
   * Internal cleanup process
   */
  _cleanup() {
    console.log("🧹 [AudioManager] Starting cleanup");
    for (const t of this.analysers.keys())
      this.removeAnalyser(t);
    if (this.mediaStream) {
      const t = this.mediaStream.getTracks();
      console.log(`🛑 [AudioManager] Stopping MediaStream: ${t.length} tracks`), t.forEach((e, i) => {
        try {
          e.readyState !== "ended" ? (e.stop(), console.log(`🛑 [AudioManager] Track ${i} stop complete`)) : console.log(`⚠️ [AudioManager] Track ${i} already ended`);
        } catch (s) {
          console.warn(`⚠️ [AudioManager] Track ${i} stop error:`, s);
        }
      }), this.mediaStream = null;
    }
    if (this.audioContext && this.audioContext.state !== "closed") {
      try {
        this.audioContext.close(), console.log("🛑 [AudioManager] AudioContext close complete");
      } catch (t) {
        console.warn("⚠️ [AudioManager] AudioContext close error:", t);
      }
      this.audioContext = null;
    }
    this.gainNode && (this.gainNode.disconnect(), this.gainNode = null), this.sourceNode && (this.sourceNode.disconnect(), this.sourceNode = null), this.isInitialized = !1, this.refCount = 0, this.initPromise = null, this.currentSensitivity = this._getDefaultSensitivity(), console.log("✅ [AudioManager] Cleanup complete");
  }
  /**
   * Get current status (for debugging)
   */
  getStatus() {
    var t, e;
    return {
      isInitialized: this.isInitialized,
      refCount: this.refCount,
      audioContextState: ((t = this.audioContext) == null ? void 0 : t.state) || "none",
      mediaStreamActive: ((e = this.mediaStream) == null ? void 0 : e.active) || !1,
      activeAnalysers: Array.from(this.analysers.keys()),
      activeFilters: Array.from(this.filters.keys()),
      lastError: this.lastError,
      currentSensitivity: this.currentSensitivity
    };
  }
  /**
   * MediaStream health status check
   */
  checkMediaStreamHealth() {
    var s, o, n, a, r, h, c, p, u;
    if (!this.mediaStream)
      return {
        mediaStreamActive: !1,
        audioContextState: ((s = this.audioContext) == null ? void 0 : s.state) || "none",
        trackStates: [],
        healthy: !1
      };
    if (!this.mediaStream.active)
      return {
        mediaStreamActive: !1,
        audioContextState: ((o = this.audioContext) == null ? void 0 : o.state) || "none",
        trackStates: [],
        healthy: !1
      };
    const t = this.mediaStream.getTracks();
    if (t.length === 0)
      return {
        mediaStreamActive: this.mediaStream.active,
        audioContextState: ((n = this.audioContext) == null ? void 0 : n.state) || "none",
        trackStates: [],
        healthy: !1
      };
    const e = t.find((l) => l.kind === "audio");
    if (!e)
      return {
        mediaStreamActive: this.mediaStream.active,
        audioContextState: ((a = this.audioContext) == null ? void 0 : a.state) || "none",
        trackStates: t.map((l) => ({
          kind: l.kind,
          enabled: l.enabled,
          readyState: l.readyState,
          muted: l.muted
        })),
        healthy: !1
      };
    const i = t.map((l) => ({
      kind: l.kind,
      enabled: l.enabled,
      readyState: l.readyState,
      muted: l.muted
    }));
    return e.readyState === "ended" ? {
      mediaStreamActive: this.mediaStream.active,
      audioContextState: ((r = this.audioContext) == null ? void 0 : r.state) || "none",
      trackStates: i,
      healthy: !1
    } : e.enabled ? e.muted ? {
      mediaStreamActive: this.mediaStream.active,
      audioContextState: ((c = this.audioContext) == null ? void 0 : c.state) || "none",
      trackStates: i,
      healthy: !1
    } : this.mediaStream.active && e.readyState !== "live" ? {
      mediaStreamActive: this.mediaStream.active,
      audioContextState: ((p = this.audioContext) == null ? void 0 : p.state) || "none",
      trackStates: i,
      healthy: !1
    } : {
      mediaStreamActive: this.mediaStream.active,
      audioContextState: ((u = this.audioContext) == null ? void 0 : u.state) || "none",
      trackStates: i,
      healthy: !0,
      refCount: this.refCount
    } : {
      mediaStreamActive: this.mediaStream.active,
      audioContextState: ((h = this.audioContext) == null ? void 0 : h.state) || "none",
      trackStates: i,
      healthy: !1
    };
  }
}
class E {
  constructor(t, e = {}) {
    this.pitchDetector = null, this.analyser = null, this.rawAnalyser = null, this.animationFrame = null, this.componentState = "uninitialized", this.isInitialized = !1, this.isDetecting = !1, this.lastError = null, this.analyserIds = [], this.currentVolume = 0, this.rawVolume = 0, this.currentFrequency = 0, this.detectedNote = "--", this.pitchClarity = 0, this.volumeHistory = [], this.stableVolume = 0, this.previousFrequency = 0, this.harmonicHistory = [], this.disableHarmonicCorrection = !1, this.callbacks = {}, this.audioManager = t, this.config = {
      fftSize: 4096,
      smoothing: 0.1,
      clarityThreshold: 0.8,
      minVolumeAbsolute: 0.01,
      ...e
    }, this.deviceSpecs = this.audioManager.getPlatformSpecs();
  }
  /**
   * Set callback functions
   */
  setCallbacks(t) {
    this.callbacks = { ...this.callbacks, ...t };
  }
  /**
   * Initialize pitch detector with external AudioContext
   */
  async initialize() {
    var t, e, i, s;
    try {
      this.componentState = "initializing", this.lastError = null, console.log("🎙️ [PitchDetector] Starting initialization via AudioManager"), await this.audioManager.initialize(), console.log("✅ [PitchDetector] AudioManager resources acquired");
      const o = `pitch-detector-filtered-${Date.now()}`;
      this.analyser = this.audioManager.createAnalyser(o, {
        fftSize: this.config.fftSize,
        smoothingTimeConstant: this.config.smoothing,
        minDecibels: -90,
        maxDecibels: -10,
        useFilters: !0
      }), this.analyserIds.push(o);
      const n = `pitch-detector-raw-${Date.now()}`;
      this.rawAnalyser = this.audioManager.createAnalyser(n, {
        fftSize: this.config.fftSize,
        smoothingTimeConstant: this.config.smoothing,
        minDecibels: -90,
        maxDecibels: -10,
        useFilters: !1
      }), this.analyserIds.push(n), console.log("✅ [PitchDetector] Analysers created:", this.analyserIds), this.pitchDetector = F.forFloat32Array(this.analyser.fftSize), this.componentState = "ready", this.isInitialized = !0, (e = (t = this.callbacks).onStateChange) == null || e.call(t, this.componentState), console.log("✅ [PitchDetector] Initialization complete");
    } catch (o) {
      throw console.error("❌ [PitchDetector] Initialization error:", o), this.componentState = "error", this.lastError = o, this.isInitialized = !1, (s = (i = this.callbacks).onError) == null || s.call(i, o), o;
    }
  }
  /**
   * Start pitch detection
   */
  startDetection() {
    var t, e, i, s, o, n;
    if (this.componentState !== "ready") {
      const a = new Error(`Cannot start detection: component state is ${this.componentState}`);
      return (e = (t = this.callbacks).onError) == null || e.call(t, a), !1;
    }
    if (!this.analyser || !this.pitchDetector) {
      const a = new Error("Required components not available");
      return this.componentState = "error", (s = (i = this.callbacks).onError) == null || s.call(i, a), !1;
    }
    return this.componentState = "detecting", this.isDetecting = !0, (n = (o = this.callbacks).onStateChange) == null || n.call(o, this.componentState), this.detectPitch(), !0;
  }
  /**
   * Stop pitch detection
   */
  stopDetection() {
    var t, e;
    this.isDetecting = !1, this.animationFrame && (cancelAnimationFrame(this.animationFrame), this.animationFrame = null), this.componentState === "detecting" && this.isInitialized && (this.componentState = "ready", (e = (t = this.callbacks).onStateChange) == null || e.call(t, this.componentState));
  }
  /**
   * Real-time pitch detection loop
   */
  detectPitch() {
    var y, S;
    if (!this.isDetecting || !this.analyser || !this.rawAnalyser || !this.pitchDetector) return;
    const t = this.analyser.fftSize, e = new Float32Array(t), i = new Float32Array(this.rawAnalyser.fftSize);
    this.analyser.getFloatTimeDomainData(e), this.rawAnalyser.getFloatTimeDomainData(i);
    let s = 0;
    for (let m = 0; m < t; m++)
      s += Math.abs(e[m]);
    const o = Math.sqrt(s / t), n = this.deviceSpecs, a = o * n.gainCompensation, r = Math.max(0, Math.min(
      100,
      a * 100 / n.divisor * 6 - n.noiseThreshold
    ));
    let h = 0;
    for (let m = 0; m < i.length; m++)
      h += Math.abs(i[m]);
    const c = Math.sqrt(h / i.length), p = Math.max(0, Math.min(
      100,
      c * n.gainCompensation * 100 / n.divisor * 6 - n.noiseThreshold
    ));
    this.volumeHistory.push(r), this.volumeHistory.length > 5 && this.volumeHistory.shift(), this.stableVolume = this.volumeHistory.reduce((m, w) => m + w, 0) / this.volumeHistory.length, this.currentVolume = this.stableVolume, this.rawVolume = p;
    const u = this.audioManager.getStatus().audioContextState, l = 44100, [d, f] = this.pitchDetector.findPitch(e, l), C = d >= 65 && d <= 1200;
    if (d && f > this.config.clarityThreshold && this.currentVolume > 30 && C) {
      let m = d;
      if (!this.disableHarmonicCorrection) {
        const w = Math.min(this.currentVolume / 100, 1);
        m = this.correctHarmonic(d, w);
      }
      this.currentFrequency = Math.round(m), this.detectedNote = this.frequencyToNote(this.currentFrequency), this.pitchClarity = f;
    } else
      this.currentFrequency === 0 && this.resetHarmonicHistory(), this.currentFrequency = 0, this.detectedNote = "--", this.pitchClarity = 0;
    const g = this.currentFrequency > 0 ? this.rawVolume : 0, M = {
      frequency: this.currentFrequency,
      note: this.detectedNote,
      clarity: this.pitchClarity,
      volume: g,
      cents: this.currentFrequency > 0 ? this.frequencyToCents(this.currentFrequency) : void 0
    };
    (S = (y = this.callbacks).onPitchUpdate) == null || S.call(y, M), this.animationFrame = requestAnimationFrame(() => this.detectPitch());
  }
  /**
   * Harmonic correction system
   */
  correctHarmonic(t, e) {
    const i = Date.now(), s = 0.7, o = 1e3;
    this.harmonicHistory = this.harmonicHistory.filter((h) => i - h.timestamp < o);
    const n = Math.min(e * 1.5, 1), a = this.previousFrequency > 0 ? Math.max(0, 1 - Math.abs(t - this.previousFrequency) / this.previousFrequency) : 0.5, r = (n + a) / 2;
    if (this.harmonicHistory.push({ frequency: t, confidence: r, timestamp: i }), this.harmonicHistory.length >= 3) {
      const h = this.harmonicHistory.slice(-5), c = h.reduce((d, f) => d + f.frequency, 0) / h.length, p = h.reduce((d, f) => d + f.confidence, 0) / h.length, u = t / 2;
      if (Math.abs(u - c) / c < 0.1 && p > s)
        return console.log(`🔧 [PitchDetector] Octave correction: ${t}Hz → ${u}Hz`), this.previousFrequency = u, u;
      const l = t * 2;
      if (Math.abs(l - c) / c < 0.1 && p > s)
        return console.log(`🔧 [PitchDetector] Octave up correction: ${t}Hz → ${l}Hz`), this.previousFrequency = l, l;
    }
    return this.previousFrequency = t, t;
  }
  /**
   * Reset harmonic correction history
   */
  resetHarmonicHistory() {
    this.harmonicHistory = [], this.previousFrequency = 0;
  }
  /**
   * Convert frequency to note name
   */
  frequencyToNote(t) {
    const e = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
    if (t <= 0) return "--";
    const s = Math.round(12 * Math.log2(t / 440)), o = (s + 9 + 120) % 12, n = Math.floor((s + 9) / 12) + 4;
    return e[o] + n;
  }
  /**
   * Convert frequency to cents deviation from nearest note
   */
  frequencyToCents(t) {
    const i = 12 * Math.log2(t / 440), s = Math.round(i), o = (i - s) * 100;
    return Math.round(o);
  }
  /**
   * Reset display state
   */
  resetDisplayState() {
    this.currentVolume = 0, this.rawVolume = 0, this.currentFrequency = 0, this.detectedNote = "--", this.pitchClarity = 0, this.stableVolume = 0, this.volumeHistory = [], this.resetHarmonicHistory(), console.log("🔄 [PitchDetector] Display state reset");
  }
  /**
   * Enable/disable harmonic correction
   */
  setHarmonicCorrectionEnabled(t) {
    this.disableHarmonicCorrection = !t, t || this.resetHarmonicHistory();
  }
  /**
   * Get initialization status
   */
  getIsInitialized() {
    return this.isInitialized && this.componentState === "ready";
  }
  /**
   * Get current state
   */
  getState() {
    return {
      componentState: this.componentState,
      isInitialized: this.isInitialized,
      isDetecting: this.isDetecting,
      lastError: this.lastError,
      hasRequiredComponents: !!(this.analyser && this.pitchDetector)
    };
  }
  /**
   * Get current detection result
   */
  getCurrentResult() {
    return {
      frequency: this.currentFrequency,
      note: this.detectedNote,
      clarity: this.pitchClarity,
      volume: this.currentFrequency > 0 ? this.rawVolume : 0
    };
  }
  /**
   * Reinitialize detector
   */
  async reinitialize() {
    console.log("🔄 [PitchDetector] Starting reinitialization"), this.cleanup(), await new Promise((t) => setTimeout(t, 100)), await this.initialize(), console.log("✅ [PitchDetector] Reinitialization complete");
  }
  /**
   * Cleanup resources
   */
  cleanup() {
    console.log("🧹 [PitchDetector] Starting cleanup"), this.stopDetection(), this.analyserIds.length > 0 && (this.audioManager.release(this.analyserIds), console.log("📤 [PitchDetector] Notified AudioManager of Analyser release:", this.analyserIds), this.analyserIds = []), this.componentState = "uninitialized", this.isInitialized = !1, this.lastError = null, this.analyser = null, this.rawAnalyser = null, this.pitchDetector = null, this.volumeHistory = [], this.resetHarmonicHistory(), console.log("✅ [PitchDetector] Cleanup complete");
  }
}
class q {
  constructor(t, e = {}) {
    this.highpassFilter = null, this.lowpassFilter = null, this.notchFilter = null, this.isConnected = !1, this.inputNode = null, this.outputNode = null, this.audioContext = t, this.config = {
      highpassFreq: 80,
      lowpassFreq: 800,
      notchFreq: 60,
      highpassQ: 0.7,
      lowpassQ: 0.7,
      notchQ: 10,
      useFilters: !0,
      ...e
    }, this.createFilterChain();
  }
  /**
   * Create the 3-stage filter chain
   */
  createFilterChain() {
    if (!this.config.useFilters) {
      console.log("🔇 [NoiseFilter] Filters disabled - bypassing filter chain");
      return;
    }
    try {
      this.highpassFilter = this.audioContext.createBiquadFilter(), this.highpassFilter.type = "highpass", this.highpassFilter.frequency.setValueAtTime(this.config.highpassFreq, this.audioContext.currentTime), this.highpassFilter.Q.setValueAtTime(this.config.highpassQ, this.audioContext.currentTime), this.lowpassFilter = this.audioContext.createBiquadFilter(), this.lowpassFilter.type = "lowpass", this.lowpassFilter.frequency.setValueAtTime(this.config.lowpassFreq, this.audioContext.currentTime), this.lowpassFilter.Q.setValueAtTime(this.config.lowpassQ, this.audioContext.currentTime), this.notchFilter = this.audioContext.createBiquadFilter(), this.notchFilter.type = "notch", this.notchFilter.frequency.setValueAtTime(this.config.notchFreq, this.audioContext.currentTime), this.notchFilter.Q.setValueAtTime(this.config.notchQ, this.audioContext.currentTime), console.log("✅ [NoiseFilter] 3-stage filter chain created", {
        highpass: `${this.config.highpassFreq}Hz (Q=${this.config.highpassQ})`,
        lowpass: `${this.config.lowpassFreq}Hz (Q=${this.config.lowpassQ})`,
        notch: `${this.config.notchFreq}Hz (Q=${this.config.notchQ})`
      });
    } catch (t) {
      throw console.error("❌ [NoiseFilter] Failed to create filter chain:", t), new Error(`NoiseFilter initialization failed: ${t}`);
    }
  }
  /**
   * Connect the filter chain between input and output nodes
   */
  connect(t, e) {
    if (!this.config.useFilters)
      return e && t.connect(e), t;
    if (!this.highpassFilter || !this.lowpassFilter || !this.notchFilter)
      throw new Error("NoiseFilter not properly initialized");
    try {
      return this.disconnect(), this.inputNode = t, this.outputNode = e || null, t.connect(this.highpassFilter), this.highpassFilter.connect(this.lowpassFilter), this.lowpassFilter.connect(this.notchFilter), e && this.notchFilter.connect(e), this.isConnected = !0, console.log("🔗 [NoiseFilter] Filter chain connected"), this.notchFilter;
    } catch (i) {
      throw console.error("❌ [NoiseFilter] Connection failed:", i), new Error(`NoiseFilter connection failed: ${i}`);
    }
  }
  /**
   * Disconnect the filter chain
   */
  disconnect() {
    try {
      this.highpassFilter && this.highpassFilter.disconnect(), this.lowpassFilter && this.lowpassFilter.disconnect(), this.notchFilter && this.notchFilter.disconnect(), this.isConnected = !1, this.inputNode = null, this.outputNode = null, console.log("🔌 [NoiseFilter] Filter chain disconnected");
    } catch (t) {
      console.warn("⚠️ [NoiseFilter] Disconnect warning:", t);
    }
  }
  /**
   * Update filter parameters dynamically
   */
  updateFrequencies(t) {
    const e = this.audioContext.currentTime;
    try {
      t.highpassFreq !== void 0 && this.highpassFilter && (this.highpassFilter.frequency.setValueAtTime(t.highpassFreq, e), this.config.highpassFreq = t.highpassFreq), t.lowpassFreq !== void 0 && this.lowpassFilter && (this.lowpassFilter.frequency.setValueAtTime(t.lowpassFreq, e), this.config.lowpassFreq = t.lowpassFreq), t.notchFreq !== void 0 && this.notchFilter && (this.notchFilter.frequency.setValueAtTime(t.notchFreq, e), this.config.notchFreq = t.notchFreq), t.highpassQ !== void 0 && this.highpassFilter && (this.highpassFilter.Q.setValueAtTime(t.highpassQ, e), this.config.highpassQ = t.highpassQ), t.lowpassQ !== void 0 && this.lowpassFilter && (this.lowpassFilter.Q.setValueAtTime(t.lowpassQ, e), this.config.lowpassQ = t.lowpassQ), t.notchQ !== void 0 && this.notchFilter && (this.notchFilter.Q.setValueAtTime(t.notchQ, e), this.config.notchQ = t.notchQ), console.log("🔧 [NoiseFilter] Filter parameters updated:", t);
    } catch (i) {
      throw console.error("❌ [NoiseFilter] Parameter update failed:", i), new Error(`NoiseFilter parameter update failed: ${i}`);
    }
  }
  /**
   * Enable or disable the entire filter chain
   */
  setEnabled(t) {
    if (t !== this.config.useFilters) {
      if (this.config.useFilters = t, this.isConnected && this.inputNode) {
        const e = this.outputNode;
        this.disconnect(), t && (this.highpassFilter || this.createFilterChain()), this.connect(this.inputNode, e || void 0);
      }
      console.log(`🔘 [NoiseFilter] Filters ${t ? "enabled" : "disabled"}`);
    }
  }
  /**
   * Get filter response at specific frequency (for visualization)
   */
  getFilterResponse(t) {
    if (!this.config.useFilters || !this.highpassFilter || !this.lowpassFilter || !this.notchFilter)
      return { magnitude: 1, phase: 0 };
    try {
      const e = new Float32Array([t]), i = new Float32Array(1), s = new Float32Array(1);
      this.highpassFilter.getFrequencyResponse(e, i, s);
      const o = i[0];
      this.lowpassFilter.getFrequencyResponse(e, i, s);
      const n = i[0];
      this.notchFilter.getFrequencyResponse(e, i, s);
      const a = i[0];
      return {
        magnitude: o * n * a,
        phase: s[0]
      };
    } catch (e) {
      return console.warn("⚠️ [NoiseFilter] Filter response calculation failed:", e), { magnitude: 1, phase: 0 };
    }
  }
  /**
   * Get current filter configuration
   */
  getConfig() {
    return { ...this.config };
  }
  /**
   * Get filter chain status
   */
  getStatus() {
    return {
      isConnected: this.isConnected,
      useFilters: this.config.useFilters,
      hasFilters: !!(this.highpassFilter && this.lowpassFilter && this.notchFilter),
      filterTypes: this.config.useFilters ? ["highpass", "lowpass", "notch"] : [],
      frequencies: {
        highpass: this.config.highpassFreq,
        lowpass: this.config.lowpassFreq,
        notch: this.config.notchFreq
      },
      qFactors: {
        highpass: this.config.highpassQ,
        lowpass: this.config.lowpassQ,
        notch: this.config.notchQ
      }
    };
  }
  /**
   * Get the final output node (for chaining)
   */
  getOutputNode() {
    return !this.config.useFilters || !this.notchFilter ? this.inputNode || null : this.notchFilter;
  }
  /**
   * Cleanup and destroy filter nodes
   */
  destroy() {
    console.log("🗑️ [NoiseFilter] Destroying filter chain"), this.disconnect(), this.highpassFilter = null, this.lowpassFilter = null, this.notchFilter = null, console.log("✅ [NoiseFilter] Cleanup complete");
  }
  /**
   * Create a preset configuration for different scenarios
   */
  static getPresetConfig(t) {
    switch (t) {
      case "voice":
        return {
          highpassFreq: 80,
          // Remove breath noise
          lowpassFreq: 800,
          // Focus on vocal fundamentals
          notchFreq: 60,
          // Remove power line hum
          highpassQ: 0.7,
          lowpassQ: 0.7,
          notchQ: 10,
          useFilters: !0
        };
      case "instrument":
        return {
          highpassFreq: 40,
          // Preserve low fundamentals
          lowpassFreq: 2e3,
          // Allow more harmonics
          notchFreq: 60,
          // Remove power line hum
          highpassQ: 0.5,
          lowpassQ: 0.5,
          notchQ: 8,
          useFilters: !0
        };
      case "wide":
        return {
          highpassFreq: 20,
          // Minimal low cut
          lowpassFreq: 5e3,
          // Minimal high cut
          notchFreq: 60,
          // Only power line filtering
          highpassQ: 0.3,
          lowpassQ: 0.3,
          notchQ: 5,
          useFilters: !0
        };
      case "minimal":
        return {
          highpassFreq: 60,
          // Just power line region
          lowpassFreq: 8e3,
          // Very high cutoff
          notchFreq: 60,
          // Power line only
          highpassQ: 0.1,
          lowpassQ: 0.1,
          notchQ: 3,
          useFilters: !0
        };
      default:
        return {
          useFilters: !1
        };
    }
  }
}
class x {
  constructor(t, e = {}) {
    if (this.refCount = 0, this.isActive = !1, this.lastHealthCheck = null, this.healthCheckInterval = null, this.idleCheckInterval = null, this.visibilityCheckInterval = null, this.lastActivityTime = Date.now(), this.isPageVisible = !0, this.isUserActive = !0, this.autoRecoveryAttempts = 0, this.maxAutoRecoveryAttempts = 3, this.eventListeners = /* @__PURE__ */ new Map(), this.config = {
      healthCheckIntervalMs: 5e3,
      // 5 seconds
      idleTimeoutMs: 3e5,
      // 5 minutes
      autoRecoveryDelayMs: 2e3,
      // 2 seconds
      maxIdleTimeBeforeRelease: 6e5
      // 10 minutes
    }, this.callbacks = {}, this.audioManager = t, this.config = { ...this.config, ...e }, typeof window > "u") {
      console.log("🔇 [MicrophoneLifecycleManager] SSR environment detected - skipping initialization");
      return;
    }
    this.setupEventListeners();
  }
  /**
   * Set callback functions
   */
  setCallbacks(t) {
    this.callbacks = { ...this.callbacks, ...t };
  }
  /**
   * Acquire microphone resources (with reference counting)
   */
  async acquire() {
    var t, e, i, s;
    this.refCount++, console.log(`🎤 [MicrophoneLifecycleManager] Acquiring resources (refCount: ${this.refCount})`);
    try {
      if (!this.isActive) {
        const n = await this.audioManager.initialize();
        return this.isActive = !0, this.lastActivityTime = Date.now(), this.autoRecoveryAttempts = 0, this.startHealthMonitoring(), this.startIdleMonitoring(), this.startVisibilityMonitoring(), (e = (t = this.callbacks).onStateChange) == null || e.call(t, "active"), console.log("🟢 [MicrophoneLifecycleManager] Microphone activated"), n;
      }
      return this.updateActivity(), await this.audioManager.initialize();
    } catch (o) {
      throw console.error("❌ [MicrophoneLifecycleManager] Failed to acquire resources:", o), this.refCount = Math.max(0, this.refCount - 1), (s = (i = this.callbacks).onError) == null || s.call(i, o), o;
    }
  }
  /**
   * Release microphone resources (with reference counting)
   */
  release() {
    var t, e;
    this.refCount = Math.max(0, this.refCount - 1), console.log(`📉 [MicrophoneLifecycleManager] Releasing resources (refCount: ${this.refCount})`), this.refCount <= 0 && (this.stopAllMonitoring(), this.audioManager.release(), this.isActive = !1, (e = (t = this.callbacks).onStateChange) == null || e.call(t, "inactive"), console.log("🔴 [MicrophoneLifecycleManager] Microphone deactivated"));
  }
  /**
   * Force release all resources (emergency cleanup)
   */
  forceRelease() {
    var t, e;
    console.log("🚨 [MicrophoneLifecycleManager] Force release - cleaning up all resources"), this.refCount = 0, this.stopAllMonitoring(), this.audioManager.forceCleanup(), this.isActive = !1, (e = (t = this.callbacks).onStateChange) == null || e.call(t, "inactive");
  }
  /**
   * Setup page lifecycle event listeners
   */
  setupEventListeners() {
    const t = () => {
      this.isPageVisible = !document.hidden, this.handleVisibilityChange();
    }, e = () => {
      this.updateActivity();
    }, i = () => {
      this.forceRelease();
    }, s = () => {
      this.isPageVisible = !0, this.handleVisibilityChange();
    }, o = () => {
      this.isPageVisible = !1, this.handleVisibilityChange();
    };
    document.addEventListener("visibilitychange", t), document.addEventListener("mousemove", e), document.addEventListener("keydown", e), document.addEventListener("click", e), document.addEventListener("scroll", e), document.addEventListener("touchstart", e), window.addEventListener("beforeunload", i), window.addEventListener("unload", i), window.addEventListener("focus", s), window.addEventListener("blur", o), this.eventListeners.set("visibilitychange", t), this.eventListeners.set("mousemove", e), this.eventListeners.set("keydown", e), this.eventListeners.set("click", e), this.eventListeners.set("scroll", e), this.eventListeners.set("touchstart", e), this.eventListeners.set("beforeunload", i), this.eventListeners.set("unload", i), this.eventListeners.set("focus", s), this.eventListeners.set("blur", o), console.log("👂 [MicrophoneLifecycleManager] Event listeners setup complete");
  }
  /**
   * Handle page visibility changes
   */
  handleVisibilityChange() {
    this.isActive && (this.isPageVisible ? (console.log("👁️ [MicrophoneLifecycleManager] Page became visible - resuming monitoring"), this.updateActivity(), setTimeout(() => {
      this.performHealthCheck();
    }, 1e3)) : (console.log("🙈 [MicrophoneLifecycleManager] Page became hidden - reducing monitoring frequency"), setTimeout(() => {
      !this.isPageVisible && this.isActive && Date.now() - this.lastActivityTime > this.config.maxIdleTimeBeforeRelease && (console.log("⏰ [MicrophoneLifecycleManager] Long inactivity detected - releasing resources"), this.forceRelease());
    }, this.config.maxIdleTimeBeforeRelease)));
  }
  /**
   * Update user activity timestamp
   */
  updateActivity() {
    this.lastActivityTime = Date.now(), this.isUserActive = !0;
  }
  /**
   * Start health monitoring
   */
  startHealthMonitoring() {
    this.healthCheckInterval && clearInterval(this.healthCheckInterval), this.healthCheckInterval = window.setInterval(() => {
      this.performHealthCheck();
    }, this.config.healthCheckIntervalMs), console.log(`💓 [MicrophoneLifecycleManager] Health monitoring started (${this.config.healthCheckIntervalMs}ms interval)`);
  }
  /**
   * Start idle monitoring
   */
  startIdleMonitoring() {
    this.idleCheckInterval && clearInterval(this.idleCheckInterval), this.idleCheckInterval = window.setInterval(() => {
      this.checkIdleTimeout();
    }, 3e4), console.log("😴 [MicrophoneLifecycleManager] Idle monitoring started");
  }
  /**
   * Start visibility monitoring
   */
  startVisibilityMonitoring() {
    this.visibilityCheckInterval && clearInterval(this.visibilityCheckInterval), this.visibilityCheckInterval = window.setInterval(() => {
      this.isPageVisible && this.isActive && this.performHealthCheck();
    }, 1e4), console.log("👁️ [MicrophoneLifecycleManager] Visibility monitoring started");
  }
  /**
   * Perform comprehensive health check
   */
  async performHealthCheck() {
    var t, e, i, s;
    if (this.isActive)
      try {
        const o = this.audioManager.checkMediaStreamHealth();
        this.lastHealthCheck = o, o.healthy || (console.warn("⚠️ [MicrophoneLifecycleManager] Unhealthy microphone state detected:", o), this.autoRecoveryAttempts < this.maxAutoRecoveryAttempts ? (this.autoRecoveryAttempts++, console.log(`🔧 [MicrophoneLifecycleManager] Attempting automatic recovery (${this.autoRecoveryAttempts}/${this.maxAutoRecoveryAttempts})`), setTimeout(async () => {
          var n, a;
          try {
            await this.audioManager.initialize(), console.log("✅ [MicrophoneLifecycleManager] Automatic recovery successful"), this.dispatchCustomEvent("pitchpro:lifecycle:autoRecoverySuccess", {});
          } catch (r) {
            console.error("❌ [MicrophoneLifecycleManager] Automatic recovery failed:", r), (a = (n = this.callbacks).onError) == null || a.call(n, r), this.dispatchCustomEvent("pitchpro:lifecycle:autoRecoveryFailed", { error: r });
          }
        }, this.config.autoRecoveryDelayMs)) : (console.error("❌ [MicrophoneLifecycleManager] Maximum recovery attempts reached - manual intervention required"), (e = (t = this.callbacks).onError) == null || e.call(t, new Error("Microphone health check failed - maximum recovery attempts exceeded"))));
      } catch (o) {
        console.error("❌ [MicrophoneLifecycleManager] Health check failed:", o), (s = (i = this.callbacks).onError) == null || s.call(i, o);
      }
  }
  /**
   * Check for idle timeout
   */
  checkIdleTimeout() {
    if (!this.isActive) return;
    const t = Date.now() - this.lastActivityTime;
    t > this.config.idleTimeoutMs && this.isUserActive && (console.log("😴 [MicrophoneLifecycleManager] User idle detected"), this.isUserActive = !1), t > this.config.maxIdleTimeBeforeRelease && (console.log("⏰ [MicrophoneLifecycleManager] Extreme idle detected - auto-releasing resources"), this.forceRelease());
  }
  /**
   * Stop all monitoring intervals
   */
  stopAllMonitoring() {
    this.healthCheckInterval && (clearInterval(this.healthCheckInterval), this.healthCheckInterval = null), this.idleCheckInterval && (clearInterval(this.idleCheckInterval), this.idleCheckInterval = null), this.visibilityCheckInterval && (clearInterval(this.visibilityCheckInterval), this.visibilityCheckInterval = null), console.log("⏹️ [MicrophoneLifecycleManager] All monitoring stopped");
  }
  /**
   * Dispatch custom event
   */
  dispatchCustomEvent(t, e) {
    if (typeof window > "u") return;
    const i = new CustomEvent(t, { detail: e });
    window.dispatchEvent(i);
  }
  /**
   * Get current status
   */
  getStatus() {
    return {
      refCount: this.refCount,
      isActive: this.isActive,
      isPageVisible: this.isPageVisible,
      isUserActive: this.isUserActive,
      lastActivityTime: this.lastActivityTime,
      timeSinceActivity: Date.now() - this.lastActivityTime,
      autoRecoveryAttempts: this.autoRecoveryAttempts,
      lastHealthCheck: this.lastHealthCheck,
      audioManagerStatus: this.audioManager.getStatus()
    };
  }
  /**
   * Update configuration
   */
  updateConfig(t) {
    this.config = { ...this.config, ...t }, this.isActive && (this.stopAllMonitoring(), this.startHealthMonitoring(), this.startIdleMonitoring(), this.startVisibilityMonitoring()), console.log("🔧 [MicrophoneLifecycleManager] Configuration updated:", t);
  }
  /**
   * Cleanup and destroy
   */
  destroy() {
    console.log("🗑️ [MicrophoneLifecycleManager] Destroying lifecycle manager"), this.stopAllMonitoring(), this.forceRelease(), this.eventListeners.forEach((t, e) => {
      e.includes("window:") ? window.removeEventListener(e.replace("window:", ""), t) : document.removeEventListener(e, t);
    }), this.eventListeners.clear(), console.log("✅ [MicrophoneLifecycleManager] Cleanup complete");
  }
}
class b {
  constructor() {
    if (this.container = null, this.notifications = /* @__PURE__ */ new Map(), this.notificationCounter = 0, this.defaultDuration = 5e3, this.maxNotifications = 5, this.cssClasses = {
      container: "pitchpro-notifications",
      notification: "pitchpro-notification",
      title: "pitchpro-notification-title",
      message: "pitchpro-notification-message",
      details: "pitchpro-notification-details",
      solution: "pitchpro-notification-solution",
      closeButton: "pitchpro-notification-close",
      error: "pitchpro-notification-error",
      warning: "pitchpro-notification-warning",
      success: "pitchpro-notification-success",
      info: "pitchpro-notification-info",
      high: "pitchpro-notification-priority-high",
      medium: "pitchpro-notification-priority-medium",
      low: "pitchpro-notification-priority-low"
    }, typeof window > "u") {
      console.log("🔇 [ErrorNotificationSystem] SSR environment detected - skipping initialization");
      return;
    }
    this.initializeContainer(), this.injectCSS();
  }
  /**
   * Create and inject the notification container into the DOM
   */
  initializeContainer() {
    let t = document.querySelector(`.${this.cssClasses.container}`);
    t ? (this.container = t, console.log("📋 [ErrorNotificationSystem] Using existing notification container")) : (this.container = document.createElement("div"), this.container.className = this.cssClasses.container, this.container.setAttribute("role", "alert"), this.container.setAttribute("aria-live", "polite"), document.body.appendChild(this.container), console.log("📋 [ErrorNotificationSystem] Notification container created"));
  }
  /**
   * Inject default CSS styles
   */
  injectCSS() {
    if (document.querySelector("#pitchpro-notifications-styles"))
      return;
    const t = `
      .${this.cssClasses.container} {
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 10000;
        max-width: 400px;
        pointer-events: none;
      }

      .${this.cssClasses.notification} {
        background: white;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
        margin-bottom: 12px;
        padding: 16px;
        pointer-events: auto;
        position: relative;
        animation: slideIn 0.3s ease-out;
        transition: opacity 0.3s ease-in-out, transform 0.3s ease-in-out;
      }

      .${this.cssClasses.notification}.removing {
        opacity: 0;
        transform: translateX(100%);
      }

      @keyframes slideIn {
        from {
          opacity: 0;
          transform: translateX(100%);
        }
        to {
          opacity: 1;
          transform: translateX(0);
        }
      }

      .${this.cssClasses.notification}.${this.cssClasses.error} {
        border-left: 4px solid #ef4444;
      }

      .${this.cssClasses.notification}.${this.cssClasses.warning} {
        border-left: 4px solid #f59e0b;
      }

      .${this.cssClasses.notification}.${this.cssClasses.success} {
        border-left: 4px solid #10b981;
      }

      .${this.cssClasses.notification}.${this.cssClasses.info} {
        border-left: 4px solid #3b82f6;
      }

      .${this.cssClasses.title} {
        font-weight: 600;
        font-size: 14px;
        color: #1f2937;
        margin-bottom: 4px;
        padding-right: 24px;
      }

      .${this.cssClasses.message} {
        font-size: 13px;
        color: #4b5563;
        margin-bottom: 8px;
        line-height: 1.4;
      }

      .${this.cssClasses.details} {
        font-size: 12px;
        color: #6b7280;
        margin-bottom: 8px;
        padding-left: 12px;
        border-left: 2px solid #e5e7eb;
      }

      .${this.cssClasses.details} li {
        margin-bottom: 2px;
      }

      .${this.cssClasses.solution} {
        font-size: 12px;
        color: #059669;
        background: #ecfdf5;
        border: 1px solid #a7f3d0;
        border-radius: 4px;
        padding: 8px;
        margin-top: 8px;
      }

      .${this.cssClasses.closeButton} {
        position: absolute;
        top: 12px;
        right: 12px;
        background: none;
        border: none;
        font-size: 18px;
        color: #9ca3af;
        cursor: pointer;
        padding: 0;
        width: 20px;
        height: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .${this.cssClasses.closeButton}:hover {
        color: #6b7280;
      }

      .${this.cssClasses.notification}.${this.cssClasses.high} {
        border-width: 2px;
        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
      }

      @media (max-width: 640px) {
        .${this.cssClasses.container} {
          top: 10px;
          left: 10px;
          right: 10px;
          max-width: none;
        }
      }
    `, e = document.createElement("style");
    e.id = "pitchpro-notifications-styles", e.textContent = t, document.head.appendChild(e);
  }
  /**
   * Show a notification
   */
  show(t) {
    if (!this.container)
      return console.warn("⚠️ [ErrorNotificationSystem] Container not available - cannot show notification"), "";
    const e = `notification-${++this.notificationCounter}`, i = this.createNotificationElement(e, t);
    if (this.notifications.size >= this.maxNotifications) {
      const s = Array.from(this.notifications.keys())[0];
      this.remove(s);
    }
    if (this.container.appendChild(i), this.notifications.set(e, i), t.autoHide !== !1) {
      const s = t.duration || this.defaultDuration;
      setTimeout(() => {
        this.remove(e);
      }, s);
    }
    return console.log(`📢 [ErrorNotificationSystem] Notification shown: ${t.type} - ${t.title}`), e;
  }
  /**
   * Create notification DOM element
   */
  createNotificationElement(t, e) {
    const i = document.createElement("div");
    i.className = [
      this.cssClasses.notification,
      this.cssClasses[e.type],
      e.priority ? this.cssClasses[e.priority] : ""
    ].filter(Boolean).join(" "), i["data-notification-id"] = t;
    const s = document.createElement("div");
    s.className = this.cssClasses.title, s.textContent = e.title, i.appendChild(s);
    const o = document.createElement("div");
    if (o.className = this.cssClasses.message, o.textContent = e.message, i.appendChild(o), e.details && e.details.length > 0) {
      const a = document.createElement("div");
      a.className = this.cssClasses.details;
      const r = document.createElement("ul");
      r.style.margin = "0", r.style.paddingLeft = "16px", e.details.forEach((h) => {
        const c = document.createElement("li");
        c.textContent = h, r.appendChild(c);
      }), a.appendChild(r), i.appendChild(a);
    }
    if (e.solution) {
      const a = document.createElement("div");
      a.className = this.cssClasses.solution, a.textContent = e.solution, i.appendChild(a);
    }
    const n = document.createElement("button");
    return n.className = this.cssClasses.closeButton, n.innerHTML = "×", n.setAttribute("aria-label", "Close notification"), n.addEventListener("click", () => {
      this.remove(t);
    }), i.appendChild(n), i;
  }
  /**
   * Remove a specific notification
   */
  remove(t) {
    const e = this.notifications.get(t);
    e && (e.classList.add("removing"), setTimeout(() => {
      e.parentNode && e.parentNode.removeChild(e), this.notifications.delete(t);
    }, 300), console.log(`🗑️ [ErrorNotificationSystem] Notification removed: ${t}`));
  }
  /**
   * Clear all notifications
   */
  clearAll() {
    Array.from(this.notifications.keys()).forEach((e) => this.remove(e)), console.log("🧹 [ErrorNotificationSystem] All notifications cleared");
  }
  /**
   * Show error notification (convenience method)
   */
  showError(t, e, i = {}) {
    return this.show({
      type: "error",
      title: t,
      message: e,
      priority: "high",
      autoHide: !1,
      // Errors should be manually dismissed
      ...i
    });
  }
  /**
   * Show warning notification (convenience method)
   */
  showWarning(t, e, i = {}) {
    return this.show({
      type: "warning",
      title: t,
      message: e,
      priority: "medium",
      duration: 8e3,
      // Longer duration for warnings
      ...i
    });
  }
  /**
   * Show success notification (convenience method)
   */
  showSuccess(t, e, i = {}) {
    return this.show({
      type: "success",
      title: t,
      message: e,
      priority: "low",
      duration: 3e3,
      // Shorter duration for success messages
      ...i
    });
  }
  /**
   * Show info notification (convenience method)
   */
  showInfo(t, e, i = {}) {
    return this.show({
      type: "info",
      title: t,
      message: e,
      priority: "low",
      ...i
    });
  }
  /**
   * Show microphone error with common solutions
   */
  showMicrophoneError(t, e) {
    return this.showError(
      "マイクロフォンエラー",
      `マイクの初期化に失敗しました: ${t.message}`,
      {
        details: e ? [`発生箇所: ${e}`, `エラー詳細: ${t.name}`] : [`エラー詳細: ${t.name}`],
        solution: "マイクの設定を確認し、ブラウザにマイクアクセスを許可してください。",
        priority: "high"
      }
    );
  }
  /**
   * Show audio context error
   */
  showAudioContextError(t) {
    return this.showError(
      "オーディオシステムエラー",
      `音声処理システムの初期化に失敗しました: ${t.message}`,
      {
        details: [
          "ブラウザがWeb Audio APIに対応していない可能性があります",
          "または、音声デバイスに問題が発生しています"
        ],
        solution: "ブラウザを最新版に更新するか、別のブラウザで試してください。",
        priority: "high"
      }
    );
  }
  /**
   * Show network/loading error
   */
  showLoadingError(t, e) {
    return this.showError(
      "読み込みエラー",
      `${t}の読み込みに失敗しました: ${e.message}`,
      {
        details: [
          "ネットワーク接続を確認してください",
          "ブラウザのキャッシュをクリアしてみてください"
        ],
        solution: "ページを再読み込みするか、しばらく待ってから再度お試しください。",
        priority: "medium"
      }
    );
  }
  /**
   * Get current notification count
   */
  getNotificationCount() {
    return this.notifications.size;
  }
  /**
   * Get all notification IDs
   */
  getNotificationIds() {
    return Array.from(this.notifications.keys());
  }
  /**
   * Check if a specific notification exists
   */
  hasNotification(t) {
    return this.notifications.has(t);
  }
  /**
   * Update configuration
   */
  updateConfig(t) {
    t.defaultDuration !== void 0 && (this.defaultDuration = t.defaultDuration), t.maxNotifications !== void 0 && (this.maxNotifications = t.maxNotifications), console.log("🔧 [ErrorNotificationSystem] Configuration updated:", t);
  }
  /**
   * Destroy the notification system
   */
  destroy() {
    console.log("🗑️ [ErrorNotificationSystem] Destroying notification system"), this.clearAll(), this.container && this.container.parentNode && this.container.parentNode.removeChild(this.container);
    const t = document.querySelector("#pitchpro-notifications-styles");
    t && t.parentNode && t.parentNode.removeChild(t), this.container = null, this.notifications.clear(), console.log("✅ [ErrorNotificationSystem] Cleanup complete");
  }
}
class N {
  constructor(t = {}, e = {}, i = !0) {
    this.currentState = "uninitialized", this.isPermissionGranted = !1, this.lastError = null, this.eventCallbacks = {}, this.deviceSpecs = null, this.audioManager = new A(t), this.lifecycleManager = new x(this.audioManager, e), this.errorSystem = i ? new b() : null, this.setupEventHandlers(), this.detectDevice();
  }
  /**
   * Set callback functions for events
   */
  setCallbacks(t) {
    this.eventCallbacks = { ...this.eventCallbacks, ...t };
  }
  /**
   * Setup internal event handlers
   */
  setupEventHandlers() {
    this.lifecycleManager.setCallbacks({
      onStateChange: (t) => {
        this.updateState(t === "active" ? "active" : "ready");
      },
      onError: (t) => {
        this.handleError(t, "lifecycle");
      }
    });
  }
  /**
   * Detect device specifications
   */
  detectDevice() {
    var t, e;
    this.deviceSpecs = this.audioManager.getPlatformSpecs(), console.log("📱 [MicrophoneController] Device detected:", this.deviceSpecs), (e = (t = this.eventCallbacks).onDeviceChange) == null || e.call(t, this.deviceSpecs), this.dispatchCustomEvent("pitchpro:deviceDetected", { specs: this.deviceSpecs });
  }
  /**
   * Initialize microphone access and permissions
   */
  async initialize() {
    var t, e, i, s;
    try {
      this.updateState("initializing"), console.log("🎤 [MicrophoneController] Starting initialization");
      const o = await this.lifecycleManager.acquire();
      return this.isPermissionGranted = !0, this.updateState("ready"), this.lastError = null, (e = (t = this.eventCallbacks).onPermissionChange) == null || e.call(t, !0), this.dispatchCustomEvent("pitchpro:microphoneGranted", { stream: o.mediaStream }), console.log("✅ [MicrophoneController] Initialization complete"), o;
    } catch (o) {
      throw console.error("❌ [MicrophoneController] Initialization failed:", o), this.isPermissionGranted = !1, this.handleError(o, "initialization"), (s = (i = this.eventCallbacks).onPermissionChange) == null || s.call(i, !1), this.dispatchCustomEvent("pitchpro:microphoneDenied", { error: o }), o;
    }
  }
  /**
   * Request microphone permission (alias for initialize)
   */
  async requestPermission() {
    try {
      return await this.initialize(), !0;
    } catch {
      return !1;
    }
  }
  /**
   * Check if microphone permission is granted
   */
  async checkPermissionStatus() {
    if (typeof navigator > "u" || !navigator.mediaDevices)
      return "denied";
    try {
      return (await navigator.permissions.query({ name: "microphone" })).state;
    } catch {
      try {
        return (await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: !1,
            noiseSuppression: !1,
            autoGainControl: !1
          }
        })).getTracks().forEach((e) => e.stop()), "granted";
      } catch {
        return "denied";
      }
    }
  }
  /**
   * Stop microphone and release resources
   */
  stop() {
    console.log("🛑 [MicrophoneController] Stopping microphone"), this.lifecycleManager.release(), this.updateState("ready"), this.dispatchCustomEvent("pitchpro:microphoneStopped", {}), console.log("✅ [MicrophoneController] Microphone stopped");
  }
  /**
   * Force stop with complete cleanup
   */
  forceStop() {
    console.log("🚨 [MicrophoneController] Force stopping microphone"), this.lifecycleManager.forceRelease(), this.updateState("uninitialized"), this.isPermissionGranted = !1, console.log("✅ [MicrophoneController] Force stop complete");
  }
  /**
   * Set microphone sensitivity
   */
  setSensitivity(t) {
    var s, o;
    const e = this.audioManager.getSensitivity();
    this.audioManager.setSensitivity(t);
    const i = this.audioManager.getSensitivity();
    e !== i && (console.log(`🔧 [MicrophoneController] Sensitivity changed: ${e}x → ${i}x`), (o = (s = this.eventCallbacks).onSensitivityChange) == null || o.call(s, i), this.dispatchCustomEvent("pitchpro:sensitivityChanged", { sensitivity: i }));
  }
  /**
   * Get current microphone sensitivity
   */
  getSensitivity() {
    return this.audioManager.getSensitivity();
  }
  /**
   * Get device specifications
   */
  getDeviceSpecs() {
    return this.deviceSpecs;
  }
  /**
   * Get current state
   */
  getState() {
    return this.currentState;
  }
  /**
   * Check if microphone is active
   */
  isActive() {
    return this.currentState === "active";
  }
  /**
   * Check if microphone is ready (initialized but not active)
   */
  isReady() {
    return this.currentState === "ready";
  }
  /**
   * Check if permission is granted
   */
  hasPermission() {
    return this.isPermissionGranted;
  }
  /**
   * Get comprehensive status
   */
  getStatus() {
    return {
      state: this.currentState,
      isPermissionGranted: this.isPermissionGranted,
      isActive: this.isActive(),
      isReady: this.isReady(),
      sensitivity: this.getSensitivity(),
      deviceSpecs: this.deviceSpecs,
      lastError: this.lastError,
      audioManagerStatus: this.audioManager.getStatus(),
      lifecycleStatus: this.lifecycleManager.getStatus()
    };
  }
  /**
   * Perform health check
   */
  checkHealth() {
    return this.audioManager.checkMediaStreamHealth();
  }
  /**
   * Test microphone functionality
   */
  async testMicrophone(t = 2e3) {
    const e = Date.now();
    try {
      !this.isReady() && !this.isActive() && await this.initialize();
      const i = this.audioManager.createAnalyser("microphone-test", {
        fftSize: 1024,
        smoothingTimeConstant: 0.8
      });
      let s = 0, o = null;
      const n = e + t;
      await new Promise((c) => {
        const p = () => {
          if (Date.now() >= n) {
            c();
            return;
          }
          const u = i.fftSize, l = new Float32Array(u);
          i.getFloatTimeDomainData(l);
          let d = 0;
          for (let g = 0; g < u; g++)
            d += Math.abs(l[g]);
          const C = Math.sqrt(d / u) * 100;
          if (C > s && (s = C), C > 5) {
            let g = 0, M = 0;
            for (let y = 1; y < u / 2; y++) {
              const S = Math.abs(l[y]);
              S > M && (M = S, g = y);
            }
            g > 0 && (o = g * 44100 / u);
          }
          requestAnimationFrame(p);
        };
        p();
      }), this.audioManager.removeAnalyser("microphone-test");
      const a = Date.now() - e, r = s > 1, h = o ? o.toFixed(0) : "none";
      return console.log(`🧪 [MicrophoneController] Microphone test complete: volume=${s.toFixed(2)}, frequency=${h}, duration=${a}ms`), {
        success: r,
        volume: s,
        frequency: o,
        duration: a
      };
    } catch (i) {
      const s = Date.now() - e;
      return console.error("❌ [MicrophoneController] Microphone test failed:", i), {
        success: !1,
        volume: 0,
        frequency: null,
        duration: s,
        error: i
      };
    }
  }
  /**
   * Update internal state and notify
   */
  updateState(t) {
    var e, i;
    if (this.currentState !== t) {
      const s = this.currentState;
      this.currentState = t, console.log(`🔄 [MicrophoneController] State changed: ${s} → ${t}`), (i = (e = this.eventCallbacks).onStateChange) == null || i.call(e, t);
    }
  }
  /**
   * Handle errors with notification system
   */
  handleError(t, e) {
    var i, s;
    console.error(`❌ [MicrophoneController] Error in ${e}:`, t), this.lastError = t, this.updateState("error"), this.errorSystem && (e === "initialization" || e === "lifecycle" ? this.errorSystem.showMicrophoneError(t, e) : this.errorSystem.showError(
      "マイクエラー",
      `${e}でエラーが発生しました: ${t.message}`,
      { priority: "medium" }
    )), (s = (i = this.eventCallbacks).onError) == null || s.call(i, t);
  }
  /**
   * Dispatch custom DOM event
   */
  dispatchCustomEvent(t, e) {
    if (typeof window > "u") return;
    const i = new CustomEvent(t, { detail: e });
    window.dispatchEvent(i);
  }
  /**
   * Add event listener for microphone events
   */
  addEventListener(t, e) {
    typeof window > "u" || window.addEventListener(t, e);
  }
  /**
   * Remove event listener for microphone events
   */
  removeEventListener(t, e) {
    typeof window > "u" || window.removeEventListener(t, e);
  }
  /**
   * Cleanup and destroy all resources
   */
  destroy() {
    var t;
    console.log("🗑️ [MicrophoneController] Destroying controller"), this.forceStop(), this.lifecycleManager.destroy(), (t = this.errorSystem) == null || t.destroy(), this.eventCallbacks = {}, this.currentState = "uninitialized", this.isPermissionGranted = !1, this.lastError = null, this.deviceSpecs = null, console.log("✅ [MicrophoneController] Cleanup complete");
  }
}
export {
  A,
  b as E,
  x as M,
  q as N,
  E as P,
  N as a
};
//# sourceMappingURL=MicrophoneController-D5dbELbV.mjs.map
