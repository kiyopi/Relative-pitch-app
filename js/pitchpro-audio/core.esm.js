var qt = Object.defineProperty;
var Bt = (m, t, e) => t in m ? qt(m, t, { enumerable: !0, configurable: !0, writable: !0, value: e }) : m[t] = e;
var T = (m, t, e) => Bt(m, typeof t != "symbol" ? t + "" : t, e);
const N = class N {
  static log(...t) {
    N.CONSOLE_ENABLED && console.log(...t);
  }
  static warn(...t) {
    console.warn(...t);
  }
  static error(...t) {
    console.error(...t);
  }
  static debug(...t) {
    N.DEBUG_ENABLED && console.log("[DEBUG]", ...t);
  }
  static setDebugEnabled(t) {
    N.DEBUG_ENABLED = t;
  }
  static setConsoleEnabled(t) {
    N.CONSOLE_ENABLED = t;
  }
  static getStatus() {
    return {
      debug: N.DEBUG_ENABLED,
      console: N.CONSOLE_ENABLED
    };
  }
};
N.DEBUG_ENABLED = !1, N.CONSOLE_ENABLED = !1;
let l = N;
class zt {
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
        return l.log("🔧 [AudioManager] iPad detected - setting default sensitivity 7.0x"), 7;
      case "iPhone":
        return l.log("🔧 [AudioManager] iPhone detected - setting default sensitivity 3.0x"), 3;
      default:
        return l.log("🔧 [AudioManager] PC detected - setting default sensitivity 1.0x"), 1;
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
      console.warn("⚠️ [AudioManager] Unhealthy MediaStream detected - force re-initialization:", s), l.log("🔄 [AudioManager] Unhealthy MediaStream details:", {
        mediaStreamActive: (t = this.mediaStream) == null ? void 0 : t.active,
        trackCount: (e = this.mediaStream) == null ? void 0 : e.getTracks().length,
        trackStates: (i = this.mediaStream) == null ? void 0 : i.getTracks().map((n) => ({
          kind: n.kind,
          readyState: n.readyState,
          enabled: n.enabled,
          muted: n.muted
        }))
      }), this._cleanup(), this.isInitialized = !1, this.refCount = 0, await new Promise((n) => setTimeout(n, 100)), l.log("🔄 [AudioManager] Cleanup complete - starting re-initialization");
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
      if (l.log("🎤 [AudioManager] Starting initialization"), this.audioContext || (this.audioContext = new (window.AudioContext || window.webkitAudioContext)(), l.log("✅ [AudioManager] AudioContext creation complete")), this.audioContext.state === "suspended" && (await this.audioContext.resume(), l.log("✅ [AudioManager] AudioContext resume complete")), !this.mediaStream) {
        const t = this.getPlatformSpecs();
        l.log(`🔍 [AudioManager] Device detection: ${t.deviceType}`, navigator.userAgent), l.log(`🔍 [AudioManager] Touch support: ${"ontouchend" in document}`);
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
        l.log("🎤 [AudioManager] Getting MediaStream with Safari-compatible settings:", e), this.mediaStream = await navigator.mediaDevices.getUserMedia(e), l.log("✅ [AudioManager] MediaStream acquisition complete");
      }
      if (!this.sourceNode) {
        this.sourceNode = this.audioContext.createMediaStreamSource(this.mediaStream), l.log("✅ [AudioManager] SourceNode creation complete");
        const t = this.mediaStream.getTracks();
        l.log("🎤 [AudioManager] MediaStream tracks:", t.map((e) => ({
          kind: e.kind,
          label: e.label,
          enabled: e.enabled,
          readyState: e.readyState,
          muted: e.muted
        })));
      }
      return this.gainNode || (this.gainNode = this.audioContext.createGain(), this.gainNode.gain.value = this.currentSensitivity, this.sourceNode.connect(this.gainNode), l.log(`✅ [AudioManager] GainNode creation complete (sensitivity: ${this.currentSensitivity}x)`)), this.isInitialized = !0, this.refCount++, this.lastError = null, l.log(`🎤 [AudioManager] Initialization complete (refCount: ${this.refCount})`), {
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
      minDecibels: n = -90,
      maxDecibels: o = -10,
      useFilters: a = !0
    } = e, r = this.audioContext.createAnalyser();
    r.fftSize = Math.min(i, 2048), r.smoothingTimeConstant = Math.max(s, 0.7), r.minDecibels = Math.max(n, -80), r.maxDecibels = Math.min(o, -10);
    let c = this.gainNode || this.sourceNode;
    if (a) {
      const h = this._createFilterChain();
      this.filters.set(t, h), c.connect(h.highpass), h.highpass.connect(h.lowpass), h.lowpass.connect(h.notch), h.notch.connect(r), l.log(`🔧 [AudioManager] Filtered Analyser created: ${t}`);
    } else
      c.connect(r), l.log(`🔧 [AudioManager] Raw signal Analyser created: ${t}`);
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
    if (this.analysers.has(t) && (this.analysers.get(t).disconnect(), this.analysers.delete(t), l.log(`🗑️ [AudioManager] Analyser removed: ${t}`)), this.filters.has(t)) {
      const e = this.filters.get(t);
      e.highpass.disconnect(), e.lowpass.disconnect(), e.notch.disconnect(), this.filters.delete(t), l.log(`🗑️ [AudioManager] Filter chain removed: ${t}`);
    }
  }
  /**
   * Adjust microphone sensitivity
   * @param sensitivity - Sensitivity multiplier (0.1 ~ 10.0)
   */
  setSensitivity(t) {
    const e = Math.max(0.1, Math.min(10, t));
    this.gainNode ? (this.gainNode.gain.value = e, this.currentSensitivity = e, l.log(`🎤 [AudioManager] Microphone sensitivity updated: ${e.toFixed(1)}x`)) : (this.currentSensitivity = e, l.log(`🎤 [AudioManager] Microphone sensitivity set (awaiting initialization): ${e.toFixed(1)}x`));
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
    t.forEach((e) => this.removeAnalyser(e)), this.refCount = Math.max(0, this.refCount - 1), l.log(`📉 [AudioManager] Reference count decremented: ${this.refCount}`), this.refCount <= 0 && (l.log("🧹 [AudioManager] Starting full resource cleanup"), this._cleanup());
  }
  /**
   * Force cleanup (for emergency use)
   */
  forceCleanup() {
    l.log("🚨 [AudioManager] Force cleanup executed"), this._cleanup();
  }
  /**
   * Internal cleanup process
   */
  _cleanup() {
    l.log("🧹 [AudioManager] Starting cleanup");
    for (const t of this.analysers.keys())
      this.removeAnalyser(t);
    if (this.mediaStream) {
      const t = this.mediaStream.getTracks();
      l.log(`🛑 [AudioManager] Stopping MediaStream: ${t.length} tracks`), t.forEach((e, i) => {
        try {
          e.readyState !== "ended" ? (e.stop(), l.log(`🛑 [AudioManager] Track ${i} stop complete`)) : l.log(`⚠️ [AudioManager] Track ${i} already ended`);
        } catch (s) {
          console.warn(`⚠️ [AudioManager] Track ${i} stop error:`, s);
        }
      }), this.mediaStream = null;
    }
    if (this.audioContext && this.audioContext.state !== "closed") {
      try {
        this.audioContext.close(), l.log("🛑 [AudioManager] AudioContext close complete");
      } catch (t) {
        console.warn("⚠️ [AudioManager] AudioContext close error:", t);
      }
      this.audioContext = null;
    }
    this.gainNode && (this.gainNode.disconnect(), this.gainNode = null), this.sourceNode && (this.sourceNode.disconnect(), this.sourceNode = null), this.isInitialized = !1, this.refCount = 0, this.initPromise = null, this.currentSensitivity = this._getDefaultSensitivity(), l.log("✅ [AudioManager] Cleanup complete");
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
    var s, n, o, a, r, c, h, p, d;
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
        audioContextState: ((n = this.audioContext) == null ? void 0 : n.state) || "none",
        trackStates: [],
        healthy: !1
      };
    const t = this.mediaStream.getTracks();
    if (t.length === 0)
      return {
        mediaStreamActive: this.mediaStream.active,
        audioContextState: ((o = this.audioContext) == null ? void 0 : o.state) || "none",
        trackStates: [],
        healthy: !1
      };
    const e = t.find((u) => u.kind === "audio");
    if (!e)
      return {
        mediaStreamActive: this.mediaStream.active,
        audioContextState: ((a = this.audioContext) == null ? void 0 : a.state) || "none",
        trackStates: t.map((u) => ({
          kind: u.kind,
          enabled: u.enabled,
          readyState: u.readyState,
          muted: u.muted
        })),
        healthy: !1
      };
    const i = t.map((u) => ({
      kind: u.kind,
      enabled: u.enabled,
      readyState: u.readyState,
      muted: u.muted
    }));
    return e.readyState === "ended" ? {
      mediaStreamActive: this.mediaStream.active,
      audioContextState: ((r = this.audioContext) == null ? void 0 : r.state) || "none",
      trackStates: i,
      healthy: !1
    } : e.enabled ? e.muted ? {
      mediaStreamActive: this.mediaStream.active,
      audioContextState: ((h = this.audioContext) == null ? void 0 : h.state) || "none",
      trackStates: i,
      healthy: !1
    } : this.mediaStream.active && e.readyState !== "live" ? {
      mediaStreamActive: this.mediaStream.active,
      audioContextState: ((p = this.audioContext) == null ? void 0 : p.state) || "none",
      trackStates: i,
      healthy: !1
    } : {
      mediaStreamActive: this.mediaStream.active,
      audioContextState: ((d = this.audioContext) == null ? void 0 : d.state) || "none",
      trackStates: i,
      healthy: !0,
      refCount: this.refCount
    } : {
      mediaStreamActive: this.mediaStream.active,
      audioContextState: ((c = this.audioContext) == null ? void 0 : c.state) || "none",
      trackStates: i,
      healthy: !1
    };
  }
}
function Pt(m) {
  return m && m.__esModule && Object.prototype.hasOwnProperty.call(m, "default") ? m.default : m;
}
function E(m) {
  if (this.size = m | 0, this.size <= 1 || this.size & this.size - 1)
    throw new Error("FFT size must be a power of two and bigger than 1");
  this._csize = m << 1;
  for (var t = new Array(this.size * 2), e = 0; e < t.length; e += 2) {
    const r = Math.PI * e / this.size;
    t[e] = Math.cos(r), t[e + 1] = -Math.sin(r);
  }
  this.table = t;
  for (var i = 0, s = 1; this.size > s; s <<= 1)
    i++;
  this._width = i % 2 === 0 ? i - 1 : i, this._bitrev = new Array(1 << this._width);
  for (var n = 0; n < this._bitrev.length; n++) {
    this._bitrev[n] = 0;
    for (var o = 0; o < this._width; o += 2) {
      var a = this._width - o - 2;
      this._bitrev[n] |= (n >>> o & 3) << a;
    }
  }
  this._out = null, this._data = null, this._inv = 0;
}
var kt = E;
E.prototype.fromComplexArray = function(t, e) {
  for (var i = e || new Array(t.length >>> 1), s = 0; s < t.length; s += 2)
    i[s >>> 1] = t[s];
  return i;
};
E.prototype.createComplexArray = function() {
  const t = new Array(this._csize);
  for (var e = 0; e < t.length; e++)
    t[e] = 0;
  return t;
};
E.prototype.toComplexArray = function(t, e) {
  for (var i = e || this.createComplexArray(), s = 0; s < i.length; s += 2)
    i[s] = t[s >>> 1], i[s + 1] = 0;
  return i;
};
E.prototype.completeSpectrum = function(t) {
  for (var e = this._csize, i = e >>> 1, s = 2; s < i; s += 2)
    t[e - s] = t[s], t[e - s + 1] = -t[s + 1];
};
E.prototype.transform = function(t, e) {
  if (t === e)
    throw new Error("Input and output buffers must be different");
  this._out = t, this._data = e, this._inv = 0, this._transform4(), this._out = null, this._data = null;
};
E.prototype.realTransform = function(t, e) {
  if (t === e)
    throw new Error("Input and output buffers must be different");
  this._out = t, this._data = e, this._inv = 0, this._realTransform4(), this._out = null, this._data = null;
};
E.prototype.inverseTransform = function(t, e) {
  if (t === e)
    throw new Error("Input and output buffers must be different");
  this._out = t, this._data = e, this._inv = 1, this._transform4();
  for (var i = 0; i < t.length; i++)
    t[i] /= this.size;
  this._out = null, this._data = null;
};
E.prototype._transform4 = function() {
  var t = this._out, e = this._csize, i = this._width, s = 1 << i, n = e / s << 1, o, a, r = this._bitrev;
  if (n === 4)
    for (o = 0, a = 0; o < e; o += n, a++) {
      const g = r[a];
      this._singleTransform2(o, g, s);
    }
  else
    for (o = 0, a = 0; o < e; o += n, a++) {
      const g = r[a];
      this._singleTransform4(o, g, s);
    }
  var c = this._inv ? -1 : 1, h = this.table;
  for (s >>= 2; s >= 2; s >>= 2) {
    n = e / s << 1;
    var p = n >>> 2;
    for (o = 0; o < e; o += n)
      for (var d = o + p, u = o, f = 0; u < d; u += 2, f += s) {
        const g = u, S = g + p, v = S + p, M = v + p, w = t[g], y = t[g + 1], C = t[S], x = t[S + 1], I = t[v], q = t[v + 1], z = t[M], P = t[M + 1], k = w, _ = y, R = h[f], H = c * h[f + 1], L = C * R - x * H, $ = C * H + x * R, U = h[2 * f], W = c * h[2 * f + 1], K = I * U - q * W, X = I * W + q * U, J = h[3 * f], Y = c * h[3 * f + 1], Z = z * J - P * Y, tt = z * Y + P * J, et = k + K, O = _ + X, G = k - K, it = _ - X, st = L + Z, Q = $ + tt, j = c * (L - Z), nt = c * ($ - tt), rt = et + st, ct = O + Q, lt = et - st, ht = O - Q, ut = G + nt, dt = it - j, ft = G - nt, mt = it + j;
        t[g] = rt, t[g + 1] = ct, t[S] = ut, t[S + 1] = dt, t[v] = lt, t[v + 1] = ht, t[M] = ft, t[M + 1] = mt;
      }
  }
};
E.prototype._singleTransform2 = function(t, e, i) {
  const s = this._out, n = this._data, o = n[e], a = n[e + 1], r = n[e + i], c = n[e + i + 1], h = o + r, p = a + c, d = o - r, u = a - c;
  s[t] = h, s[t + 1] = p, s[t + 2] = d, s[t + 3] = u;
};
E.prototype._singleTransform4 = function(t, e, i) {
  const s = this._out, n = this._data, o = this._inv ? -1 : 1, a = i * 2, r = i * 3, c = n[e], h = n[e + 1], p = n[e + i], d = n[e + i + 1], u = n[e + a], f = n[e + a + 1], g = n[e + r], S = n[e + r + 1], v = c + u, M = h + f, w = c - u, y = h - f, C = p + g, x = d + S, I = o * (p - g), q = o * (d - S), z = v + C, P = M + x, k = w + q, _ = y - I, R = v - C, H = M - x, L = w - q, $ = y + I;
  s[t] = z, s[t + 1] = P, s[t + 2] = k, s[t + 3] = _, s[t + 4] = R, s[t + 5] = H, s[t + 6] = L, s[t + 7] = $;
};
E.prototype._realTransform4 = function() {
  var t = this._out, e = this._csize, i = this._width, s = 1 << i, n = e / s << 1, o, a, r = this._bitrev;
  if (n === 4)
    for (o = 0, a = 0; o < e; o += n, a++) {
      const pt = r[a];
      this._singleRealTransform2(o, pt >>> 1, s >>> 1);
    }
  else
    for (o = 0, a = 0; o < e; o += n, a++) {
      const pt = r[a];
      this._singleRealTransform4(o, pt >>> 1, s >>> 1);
    }
  var c = this._inv ? -1 : 1, h = this.table;
  for (s >>= 2; s >= 2; s >>= 2) {
    n = e / s << 1;
    var p = n >>> 1, d = p >>> 1, u = d >>> 1;
    for (o = 0; o < e; o += n)
      for (var f = 0, g = 0; f <= u; f += 2, g += s) {
        var S = o + f, v = S + d, M = v + d, w = M + d, y = t[S], C = t[S + 1], x = t[v], I = t[v + 1], q = t[M], z = t[M + 1], P = t[w], k = t[w + 1], _ = y, R = C, H = h[g], L = c * h[g + 1], $ = x * H - I * L, U = x * L + I * H, W = h[2 * g], K = c * h[2 * g + 1], X = q * W - z * K, J = q * K + z * W, Y = h[3 * g], Z = c * h[3 * g + 1], tt = P * Y - k * Z, et = P * Z + k * Y, O = _ + X, G = R + J, it = _ - X, st = R - J, Q = $ + tt, j = U + et, nt = c * ($ - tt), rt = c * (U - et), ct = O + Q, lt = G + j, ht = it + rt, ut = st - nt;
        if (t[S] = ct, t[S + 1] = lt, t[v] = ht, t[v + 1] = ut, f === 0) {
          var dt = O - Q, ft = G - j;
          t[M] = dt, t[M + 1] = ft;
          continue;
        }
        if (f !== u) {
          var mt = it, Mt = -st, bt = O, wt = -G, Ft = -c * rt, At = -c * nt, xt = -c * j, Et = -c * Q, Tt = mt + Ft, Dt = Mt + At, Nt = bt + Et, It = wt - xt, yt = o + d - f, vt = o + p - f;
          t[yt] = Tt, t[yt + 1] = Dt, t[vt] = Nt, t[vt + 1] = It;
        }
      }
  }
};
E.prototype._singleRealTransform2 = function(t, e, i) {
  const s = this._out, n = this._data, o = n[e], a = n[e + i], r = o + a, c = o - a;
  s[t] = r, s[t + 1] = 0, s[t + 2] = c, s[t + 3] = 0;
};
E.prototype._singleRealTransform4 = function(t, e, i) {
  const s = this._out, n = this._data, o = this._inv ? -1 : 1, a = i * 2, r = i * 3, c = n[e], h = n[e + i], p = n[e + a], d = n[e + r], u = c + p, f = c - p, g = h + d, S = o * (h - d), v = u + g, M = f, w = -S, y = u - g, C = f, x = S;
  s[t] = v, s[t + 1] = 0, s[t + 2] = M, s[t + 3] = w, s[t + 4] = y, s[t + 5] = 0, s[t + 6] = C, s[t + 7] = x;
};
const _t = /* @__PURE__ */ Pt(kt);
class ot {
  /**
   * Constructs a new {@link Autocorrelator} able to handle input arrays of the
   * given length.
   *
   * @param inputLength {number} the input array length to support. This
   * `Autocorrelator` will only support operation on arrays of this length.
   * @param bufferSupplier {(length: number) => T} the function to use for
   * creating buffers, accepting the length of the buffer to create and
   * returning a new buffer of that length. The values of the returned buffer
   * need not be initialized in any particular way.
   */
  constructor(t, e) {
    /** @private @readonly @type {number} */
    T(this, "_inputLength");
    /** @private @type {FFT} */
    T(this, "_fft");
    /** @private @type {(size: number) => T} */
    T(this, "_bufferSupplier");
    /** @private @type {T} */
    T(this, "_paddedInputBuffer");
    /** @private @type {T} */
    T(this, "_transformBuffer");
    /** @private @type {T} */
    T(this, "_inverseBuffer");
    if (t < 1)
      throw new Error("Input length must be at least one");
    this._inputLength = t, this._fft = new _t($t(2 * t)), this._bufferSupplier = e, this._paddedInputBuffer = this._bufferSupplier(this._fft.size), this._transformBuffer = this._bufferSupplier(2 * this._fft.size), this._inverseBuffer = this._bufferSupplier(2 * this._fft.size);
  }
  /**
   * A helper method to create an {@link Autocorrelator} using
   * {@link Float32Array} buffers.
   *
   * @param inputLength {number} the input array length to support
   * @returns {Autocorrelator<Float32Array>}
   */
  static forFloat32Array(t) {
    return new ot(
      t,
      (e) => new Float32Array(e)
    );
  }
  /**
   * A helper method to create an {@link Autocorrelator} using
   * {@link Float64Array} buffers.
   *
   * @param inputLength {number} the input array length to support
   * @returns {Autocorrelator<Float64Array>}
   */
  static forFloat64Array(t) {
    return new ot(
      t,
      (e) => new Float64Array(e)
    );
  }
  /**
   * A helper method to create an {@link Autocorrelator} using `number[]`
   * buffers.
   *
   * @param inputLength {number} the input array length to support
   * @returns {Autocorrelator<number[]>}
   */
  static forNumberArray(t) {
    return new ot(t, (e) => Array(e));
  }
  /**
   * Returns the supported input length.
   *
   * @returns {number} the supported input length
   */
  get inputLength() {
    return this._inputLength;
  }
  /**
   * Autocorrelates the given input data.
   *
   * @param input {ArrayLike<number>} the input data to autocorrelate
   * @param output {T} the output buffer into which to write the autocorrelated
   * data. If not provided, a new buffer will be created.
   * @returns {T} `output`
   */
  autocorrelate(t, e = this._bufferSupplier(t.length)) {
    if (t.length !== this._inputLength)
      throw new Error(
        `Input must have length ${this._inputLength} but had length ${t.length}`
      );
    for (let s = 0; s < t.length; s++)
      this._paddedInputBuffer[s] = t[s];
    for (let s = t.length; s < this._paddedInputBuffer.length; s++)
      this._paddedInputBuffer[s] = 0;
    this._fft.realTransform(this._transformBuffer, this._paddedInputBuffer), this._fft.completeSpectrum(this._transformBuffer);
    const i = this._transformBuffer;
    for (let s = 0; s < i.length; s += 2)
      i[s] = i[s] * i[s] + i[s + 1] * i[s + 1], i[s + 1] = 0;
    this._fft.inverseTransform(this._inverseBuffer, this._transformBuffer);
    for (let s = 0; s < t.length; s++)
      e[s] = this._inverseBuffer[2 * s];
    return e;
  }
}
function Rt(m) {
  const t = [];
  let e = !1, i = -1 / 0, s = -1;
  for (let n = 1; n < m.length - 1; n++)
    m[n - 1] <= 0 && m[n] > 0 ? (e = !0, s = n, i = m[n]) : m[n - 1] > 0 && m[n] <= 0 ? (e = !1, s !== -1 && t.push(s)) : e && m[n] > i && (i = m[n], s = n);
  return t;
}
function Ht(m, t) {
  const [e, i, s] = [m - 1, m, m + 1], [n, o, a] = [t[e], t[i], t[s]], r = n / 2 - o + a / 2, c = -(n / 2) * (i + s) + o * (e + s) - a / 2 * (e + i), h = n * i * s / 2 - o * e * s + a * e * i / 2, p = -c / (2 * r), d = r * p * p + c * p + h;
  return [p, d];
}
let Lt = class at {
  /**
   * Constructs a new {@link PitchDetector} able to handle input arrays of the
   * given length.
   *
   * @param inputLength {number} the input array length to support. This
   * `PitchDetector` will only support operation on arrays of this length.
   * @param bufferSupplier {(inputLength: number) => T} the function to use for
   * creating buffers, accepting the length of the buffer to create and
   * returning a new buffer of that length. The values of the returned buffer
   * need not be initialized in any particular way.
   */
  constructor(t, e) {
    /** @private @type {Autocorrelator<T>} */
    T(this, "_autocorrelator");
    /** @private @type {T} */
    T(this, "_nsdfBuffer");
    /** @private @type {number} */
    T(this, "_clarityThreshold", 0.9);
    /** @private @type {number} */
    T(this, "_minVolumeAbsolute", 0);
    /** @private @type {number} */
    T(this, "_maxInputAmplitude", 1);
    this._autocorrelator = new ot(t, e), this._nsdfBuffer = e(t);
  }
  /**
   * A helper method to create an {@link PitchDetector} using {@link Float32Array} buffers.
   *
   * @param inputLength {number} the input array length to support
   * @returns {PitchDetector<Float32Array>}
   */
  static forFloat32Array(t) {
    return new at(t, (e) => new Float32Array(e));
  }
  /**
   * A helper method to create an {@link PitchDetector} using {@link Float64Array} buffers.
   *
   * @param inputLength {number} the input array length to support
   * @returns {PitchDetector<Float64Array>}
   */
  static forFloat64Array(t) {
    return new at(t, (e) => new Float64Array(e));
  }
  /**
   * A helper method to create an {@link PitchDetector} using `number[]` buffers.
   *
   * @param inputLength {number} the input array length to support
   * @returns {PitchDetector<number[]>}
   */
  static forNumberArray(t) {
    return new at(t, (e) => Array(e));
  }
  /**
   * Returns the supported input length.
   *
   * @returns {number} the supported input length
   */
  get inputLength() {
    return this._autocorrelator.inputLength;
  }
  /**
   * Sets the clarity threshold used when identifying the correct pitch (the constant
   * `k` from the MPM paper). The value must be between 0 (exclusive) and 1
   * (inclusive), with the most suitable range being between 0.8 and 1.
   *
   * @param threshold {number} the clarity threshold
   */
  set clarityThreshold(t) {
    if (!Number.isFinite(t) || t <= 0 || t > 1)
      throw new Error("clarityThreshold must be a number in the range (0, 1]");
    this._clarityThreshold = t;
  }
  /**
   * Sets the minimum detectable volume, as an absolute number between 0 and
   * `maxInputAmplitude`, inclusive, to consider in a sample when detecting the
   * pitch. If a sample fails to meet this minimum volume, `findPitch` will
   * return a clarity of 0.
   *
   * Volume is calculated as the RMS (root mean square) of the input samples.
   *
   * @param volume {number} the minimum volume as an absolute amplitude value
   */
  set minVolumeAbsolute(t) {
    if (!Number.isFinite(t) || t < 0 || t > this._maxInputAmplitude)
      throw new Error(
        `minVolumeAbsolute must be a number in the range [0, ${this._maxInputAmplitude}]`
      );
    this._minVolumeAbsolute = t;
  }
  /**
   * Sets the minimum volume using a decibel measurement. Must be less than or
   * equal to 0: 0 indicates the loudest possible sound (see
   * `maxInputAmplitude`), -10 is a sound with a tenth of the volume of the
   * loudest possible sound, etc.
   *
   * Volume is calculated as the RMS (root mean square) of the input samples.
   *
   * @param db {number} the minimum volume in decibels, with 0 being the loudest
   * sound
   */
  set minVolumeDecibels(t) {
    if (!Number.isFinite(t) || t > 0)
      throw new Error("minVolumeDecibels must be a number <= 0");
    this._minVolumeAbsolute = this._maxInputAmplitude * 10 ** (t / 10);
  }
  /**
   * Sets the maximum amplitude of an input reading. Must be greater than 0.
   *
   * @param amplitude {number} the maximum amplitude (absolute value) of an input reading
   */
  set maxInputAmplitude(t) {
    if (!Number.isFinite(t) || t <= 0)
      throw new Error("maxInputAmplitude must be a number > 0");
    this._maxInputAmplitude = t;
  }
  /**
   * Returns the pitch detected using McLeod Pitch Method (MPM) along with a
   * measure of its clarity.
   *
   * The clarity is a value between 0 and 1 (potentially inclusive) that
   * represents how "clear" the pitch was. A clarity value of 1 indicates that
   * the pitch was very distinct, while lower clarity values indicate less
   * definite pitches.
   *
   * @param input {ArrayLike<number>} the time-domain input data
   * @param sampleRate {number} the sample rate at which the input data was
   * collected
   * @returns {[number, number]} the detected pitch, in Hz, followed by the
   * clarity. If a pitch cannot be determined from the input, such as if the
   * volume is too low (see `minVolumeAbsolute` and `minVolumeDecibels`), this
   * will be `[0, 0]`.
   */
  findPitch(t, e) {
    if (this._belowMinimumVolume(t)) return [0, 0];
    this._nsdf(t);
    const i = Rt(this._nsdfBuffer);
    if (i.length === 0)
      return [0, 0];
    const s = Math.max(...i.map((r) => this._nsdfBuffer[r])), n = i.find(
      (r) => this._nsdfBuffer[r] >= this._clarityThreshold * s
    ), [o, a] = Ht(
      // @ts-expect-error resultIndex is guaranteed to be defined
      n,
      this._nsdfBuffer
    );
    return [e / o, Math.min(a, 1)];
  }
  /**
   * Returns whether the input audio data is below the minimum volume allowed by
   * the pitch detector.
   *
   * @private
   * @param input {ArrayLike<number>}
   * @returns {boolean}
   */
  _belowMinimumVolume(t) {
    if (this._minVolumeAbsolute === 0) return !1;
    let e = 0;
    for (let i = 0; i < t.length; i++)
      e += t[i] ** 2;
    return Math.sqrt(e / t.length) < this._minVolumeAbsolute;
  }
  /**
   * Computes the NSDF of the input and stores it in the internal buffer. This
   * is equation (9) in the McLeod pitch method paper.
   *
   * @private
   * @param input {ArrayLike<number>}
   */
  _nsdf(t) {
    this._autocorrelator.autocorrelate(t, this._nsdfBuffer);
    let e = 2 * this._nsdfBuffer[0], i;
    for (i = 0; i < this._nsdfBuffer.length && e > 0; i++)
      this._nsdfBuffer[i] = 2 * this._nsdfBuffer[i] / e, e -= t[i] ** 2 + t[t.length - i - 1] ** 2;
    for (; i < this._nsdfBuffer.length; i++)
      this._nsdfBuffer[i] = 0;
  }
};
function $t(m) {
  return m--, m |= m >> 1, m |= m >> 2, m |= m >> 4, m |= m >> 8, m |= m >> 16, m++, m;
}
const V = class V {
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
      this.componentState = "initializing", this.lastError = null, V.DEBUG_MODE && l.log("🎙️ [PitchDetector] Starting initialization via AudioManager"), await this.audioManager.initialize(), V.DEBUG_MODE && l.log("✅ [PitchDetector] AudioManager resources acquired");
      const n = `pitch-detector-filtered-${Date.now()}`;
      this.analyser = this.audioManager.createAnalyser(n, {
        fftSize: this.config.fftSize,
        smoothingTimeConstant: this.config.smoothing,
        minDecibels: -90,
        maxDecibels: -10,
        useFilters: !0
      }), this.analyserIds.push(n);
      const o = `pitch-detector-raw-${Date.now()}`;
      this.rawAnalyser = this.audioManager.createAnalyser(o, {
        fftSize: this.config.fftSize,
        smoothingTimeConstant: this.config.smoothing,
        minDecibels: -90,
        maxDecibels: -10,
        useFilters: !1
      }), this.analyserIds.push(o), V.DEBUG_MODE && l.log("✅ [PitchDetector] Analysers created:", this.analyserIds), this.pitchDetector = Lt.forFloat32Array(this.analyser.fftSize), this.componentState = "ready", this.isInitialized = !0, (e = (t = this.callbacks).onStateChange) == null || e.call(t, this.componentState), V.DEBUG_MODE && l.log("✅ [PitchDetector] Initialization complete");
    } catch (n) {
      throw console.error("❌ [PitchDetector] Initialization error:", n), this.componentState = "error", this.lastError = n, this.isInitialized = !1, (s = (i = this.callbacks).onError) == null || s.call(i, n), n;
    }
  }
  /**
   * Start pitch detection
   */
  startDetection() {
    var t, e, i, s, n, o;
    if (this.componentState !== "ready") {
      const a = new Error(`Cannot start detection: component state is ${this.componentState}`);
      return (e = (t = this.callbacks).onError) == null || e.call(t, a), !1;
    }
    if (!this.analyser || !this.pitchDetector) {
      const a = new Error("Required components not available");
      return this.componentState = "error", (s = (i = this.callbacks).onError) == null || s.call(i, a), !1;
    }
    return this.componentState = "detecting", this.isDetecting = !0, (o = (n = this.callbacks).onStateChange) == null || o.call(n, this.componentState), this.detectPitch(), !0;
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
    var w, y;
    if (!this.isDetecting || !this.analyser || !this.rawAnalyser || !this.pitchDetector) return;
    const t = this.analyser.fftSize, e = new Float32Array(t), i = new Float32Array(this.rawAnalyser.fftSize);
    this.analyser.getFloatTimeDomainData(e), this.rawAnalyser.getFloatTimeDomainData(i);
    let s = 0;
    for (let C = 0; C < t; C++)
      s += Math.abs(e[C]);
    const n = Math.sqrt(s / t), o = this.deviceSpecs, a = n * o.gainCompensation, r = Math.max(0, Math.min(
      100,
      a * 100 / o.divisor * 6 - o.noiseThreshold
    ));
    let c = 0;
    for (let C = 0; C < i.length; C++)
      c += Math.abs(i[C]);
    const h = Math.sqrt(c / i.length), p = Math.max(0, Math.min(
      100,
      h * o.gainCompensation * 100 / o.divisor * 6 - o.noiseThreshold
    ));
    this.volumeHistory.push(r), this.volumeHistory.length > 5 && this.volumeHistory.shift(), this.stableVolume = this.volumeHistory.reduce((C, x) => C + x, 0) / this.volumeHistory.length, this.currentVolume = this.stableVolume, this.rawVolume = p;
    const d = this.audioManager.getStatus().audioContextState, u = 44100, [f, g] = this.pitchDetector.findPitch(e, u), S = f >= 65 && f <= 1200;
    if (f && g > this.config.clarityThreshold && this.currentVolume > 30 && S) {
      let C = f;
      if (!this.disableHarmonicCorrection) {
        const x = Math.min(this.currentVolume / 100, 1);
        C = this.correctHarmonic(f, x);
      }
      this.currentFrequency = Math.round(C), this.detectedNote = this.frequencyToNote(this.currentFrequency), this.pitchClarity = g;
    } else
      this.currentFrequency === 0 && this.resetHarmonicHistory(), this.currentFrequency = 0, this.detectedNote = "--", this.pitchClarity = 0;
    const v = this.currentFrequency > 0 ? this.rawVolume : 0, M = {
      frequency: this.currentFrequency,
      note: this.detectedNote,
      clarity: this.pitchClarity,
      volume: v,
      cents: this.currentFrequency > 0 ? this.frequencyToCents(this.currentFrequency) : void 0
    };
    (y = (w = this.callbacks).onPitchUpdate) == null || y.call(w, M), this.animationFrame = requestAnimationFrame(() => this.detectPitch());
  }
  /**
   * Harmonic correction system
   */
  correctHarmonic(t, e) {
    const i = Date.now(), s = 0.7, n = 1e3;
    this.harmonicHistory = this.harmonicHistory.filter((c) => i - c.timestamp < n);
    const o = Math.min(e * 1.5, 1), a = this.previousFrequency > 0 ? Math.max(0, 1 - Math.abs(t - this.previousFrequency) / this.previousFrequency) : 0.5, r = (o + a) / 2;
    if (this.harmonicHistory.push({ frequency: t, confidence: r, timestamp: i }), this.harmonicHistory.length >= 3) {
      const c = this.harmonicHistory.slice(-5), h = c.reduce((f, g) => f + g.frequency, 0) / c.length, p = c.reduce((f, g) => f + g.confidence, 0) / c.length, d = t / 2;
      if (Math.abs(d - h) / h < 0.1 && p > s)
        return l.log(`🔧 [PitchDetector] Octave correction: ${t}Hz → ${d}Hz`), this.previousFrequency = d, d;
      const u = t * 2;
      if (Math.abs(u - h) / h < 0.1 && p > s)
        return l.log(`🔧 [PitchDetector] Octave up correction: ${t}Hz → ${u}Hz`), this.previousFrequency = u, u;
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
    const s = Math.round(12 * Math.log2(t / 440)), n = (s + 9 + 120) % 12, o = Math.floor((s + 9) / 12) + 4;
    return e[n] + o;
  }
  /**
   * Convert frequency to cents deviation from nearest note
   */
  frequencyToCents(t) {
    const i = 12 * Math.log2(t / 440), s = Math.round(i), n = (i - s) * 100;
    return Math.round(n);
  }
  /**
   * Reset display state
   */
  resetDisplayState() {
    this.currentVolume = 0, this.rawVolume = 0, this.currentFrequency = 0, this.detectedNote = "--", this.pitchClarity = 0, this.stableVolume = 0, this.volumeHistory = [], this.resetHarmonicHistory(), l.log("🔄 [PitchDetector] Display state reset");
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
    l.log("🔄 [PitchDetector] Starting reinitialization"), this.cleanup(), await new Promise((t) => setTimeout(t, 100)), await this.initialize(), l.log("✅ [PitchDetector] Reinitialization complete");
  }
  /**
   * Cleanup resources
   */
  cleanup() {
    l.log("🧹 [PitchDetector] Starting cleanup"), this.stopDetection(), this.analyserIds.length > 0 && (this.audioManager.release(this.analyserIds), l.log("📤 [PitchDetector] Notified AudioManager of Analyser release:", this.analyserIds), this.analyserIds = []), this.componentState = "uninitialized", this.isInitialized = !1, this.lastError = null, this.analyser = null, this.rawAnalyser = null, this.pitchDetector = null, this.volumeHistory = [], this.resetHarmonicHistory(), l.log("✅ [PitchDetector] Cleanup complete");
  }
};
V.DEBUG_MODE = !1;
let Ct = V;
class Qt {
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
      l.log("🔇 [NoiseFilter] Filters disabled - bypassing filter chain");
      return;
    }
    try {
      this.highpassFilter = this.audioContext.createBiquadFilter(), this.highpassFilter.type = "highpass", this.highpassFilter.frequency.setValueAtTime(this.config.highpassFreq, this.audioContext.currentTime), this.highpassFilter.Q.setValueAtTime(this.config.highpassQ, this.audioContext.currentTime), this.lowpassFilter = this.audioContext.createBiquadFilter(), this.lowpassFilter.type = "lowpass", this.lowpassFilter.frequency.setValueAtTime(this.config.lowpassFreq, this.audioContext.currentTime), this.lowpassFilter.Q.setValueAtTime(this.config.lowpassQ, this.audioContext.currentTime), this.notchFilter = this.audioContext.createBiquadFilter(), this.notchFilter.type = "notch", this.notchFilter.frequency.setValueAtTime(this.config.notchFreq, this.audioContext.currentTime), this.notchFilter.Q.setValueAtTime(this.config.notchQ, this.audioContext.currentTime), l.log("✅ [NoiseFilter] 3-stage filter chain created", {
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
      return this.disconnect(), this.inputNode = t, this.outputNode = e || null, t.connect(this.highpassFilter), this.highpassFilter.connect(this.lowpassFilter), this.lowpassFilter.connect(this.notchFilter), e && this.notchFilter.connect(e), this.isConnected = !0, l.log("🔗 [NoiseFilter] Filter chain connected"), this.notchFilter;
    } catch (i) {
      throw console.error("❌ [NoiseFilter] Connection failed:", i), new Error(`NoiseFilter connection failed: ${i}`);
    }
  }
  /**
   * Disconnect the filter chain
   */
  disconnect() {
    try {
      this.highpassFilter && this.highpassFilter.disconnect(), this.lowpassFilter && this.lowpassFilter.disconnect(), this.notchFilter && this.notchFilter.disconnect(), this.isConnected = !1, this.inputNode = null, this.outputNode = null, l.log("🔌 [NoiseFilter] Filter chain disconnected");
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
      t.highpassFreq !== void 0 && this.highpassFilter && (this.highpassFilter.frequency.setValueAtTime(t.highpassFreq, e), this.config.highpassFreq = t.highpassFreq), t.lowpassFreq !== void 0 && this.lowpassFilter && (this.lowpassFilter.frequency.setValueAtTime(t.lowpassFreq, e), this.config.lowpassFreq = t.lowpassFreq), t.notchFreq !== void 0 && this.notchFilter && (this.notchFilter.frequency.setValueAtTime(t.notchFreq, e), this.config.notchFreq = t.notchFreq), t.highpassQ !== void 0 && this.highpassFilter && (this.highpassFilter.Q.setValueAtTime(t.highpassQ, e), this.config.highpassQ = t.highpassQ), t.lowpassQ !== void 0 && this.lowpassFilter && (this.lowpassFilter.Q.setValueAtTime(t.lowpassQ, e), this.config.lowpassQ = t.lowpassQ), t.notchQ !== void 0 && this.notchFilter && (this.notchFilter.Q.setValueAtTime(t.notchQ, e), this.config.notchQ = t.notchQ), l.log("🔧 [NoiseFilter] Filter parameters updated:", t);
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
      l.log(`🔘 [NoiseFilter] Filters ${t ? "enabled" : "disabled"}`);
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
      const n = i[0];
      this.lowpassFilter.getFrequencyResponse(e, i, s);
      const o = i[0];
      this.notchFilter.getFrequencyResponse(e, i, s);
      const a = i[0];
      return {
        magnitude: n * o * a,
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
    l.log("🗑️ [NoiseFilter] Destroying filter chain"), this.disconnect(), this.highpassFilter = null, this.lowpassFilter = null, this.notchFilter = null, l.log("✅ [NoiseFilter] Cleanup complete");
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
class Vt {
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
      l.log("🔇 [MicrophoneLifecycleManager] SSR environment detected - skipping initialization");
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
    this.refCount++, l.log(`🎤 [MicrophoneLifecycleManager] Acquiring resources (refCount: ${this.refCount})`);
    try {
      if (!this.isActive) {
        const o = await this.audioManager.initialize();
        return this.isActive = !0, this.lastActivityTime = Date.now(), this.autoRecoveryAttempts = 0, this.startHealthMonitoring(), this.startIdleMonitoring(), this.startVisibilityMonitoring(), (e = (t = this.callbacks).onStateChange) == null || e.call(t, "active"), l.log("🟢 [MicrophoneLifecycleManager] Microphone activated"), o;
      }
      return this.updateActivity(), await this.audioManager.initialize();
    } catch (n) {
      throw console.error("❌ [MicrophoneLifecycleManager] Failed to acquire resources:", n), this.refCount = Math.max(0, this.refCount - 1), (s = (i = this.callbacks).onError) == null || s.call(i, n), n;
    }
  }
  /**
   * Release microphone resources (with reference counting)
   */
  release() {
    var t, e;
    this.refCount = Math.max(0, this.refCount - 1), l.log(`📉 [MicrophoneLifecycleManager] Releasing resources (refCount: ${this.refCount})`), this.refCount <= 0 && (this.stopAllMonitoring(), this.audioManager.release(), this.isActive = !1, (e = (t = this.callbacks).onStateChange) == null || e.call(t, "inactive"), l.log("🔴 [MicrophoneLifecycleManager] Microphone deactivated"));
  }
  /**
   * Force release all resources (emergency cleanup)
   */
  forceRelease() {
    var t, e;
    l.log("🚨 [MicrophoneLifecycleManager] Force release - cleaning up all resources"), this.refCount = 0, this.stopAllMonitoring(), this.audioManager.forceCleanup(), this.isActive = !1, (e = (t = this.callbacks).onStateChange) == null || e.call(t, "inactive");
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
    }, n = () => {
      this.isPageVisible = !1, this.handleVisibilityChange();
    };
    document.addEventListener("visibilitychange", t), document.addEventListener("mousemove", e), document.addEventListener("keydown", e), document.addEventListener("click", e), document.addEventListener("scroll", e), document.addEventListener("touchstart", e), window.addEventListener("beforeunload", i), window.addEventListener("unload", i), window.addEventListener("focus", s), window.addEventListener("blur", n), this.eventListeners.set("visibilitychange", t), this.eventListeners.set("mousemove", e), this.eventListeners.set("keydown", e), this.eventListeners.set("click", e), this.eventListeners.set("scroll", e), this.eventListeners.set("touchstart", e), this.eventListeners.set("beforeunload", i), this.eventListeners.set("unload", i), this.eventListeners.set("focus", s), this.eventListeners.set("blur", n), l.log("👂 [MicrophoneLifecycleManager] Event listeners setup complete");
  }
  /**
   * Handle page visibility changes
   */
  handleVisibilityChange() {
    this.isActive && (this.isPageVisible ? (l.log("👁️ [MicrophoneLifecycleManager] Page became visible - resuming monitoring"), this.updateActivity(), setTimeout(() => {
      this.performHealthCheck();
    }, 1e3)) : (l.log("🙈 [MicrophoneLifecycleManager] Page became hidden - reducing monitoring frequency"), setTimeout(() => {
      !this.isPageVisible && this.isActive && Date.now() - this.lastActivityTime > this.config.maxIdleTimeBeforeRelease && (l.log("⏰ [MicrophoneLifecycleManager] Long inactivity detected - releasing resources"), this.forceRelease());
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
    }, this.config.healthCheckIntervalMs), l.log(`💓 [MicrophoneLifecycleManager] Health monitoring started (${this.config.healthCheckIntervalMs}ms interval)`);
  }
  /**
   * Start idle monitoring
   */
  startIdleMonitoring() {
    this.idleCheckInterval && clearInterval(this.idleCheckInterval), this.idleCheckInterval = window.setInterval(() => {
      this.checkIdleTimeout();
    }, 3e4), l.log("😴 [MicrophoneLifecycleManager] Idle monitoring started");
  }
  /**
   * Start visibility monitoring
   */
  startVisibilityMonitoring() {
    this.visibilityCheckInterval && clearInterval(this.visibilityCheckInterval), this.visibilityCheckInterval = window.setInterval(() => {
      this.isPageVisible && this.isActive && this.performHealthCheck();
    }, 1e4), l.log("👁️ [MicrophoneLifecycleManager] Visibility monitoring started");
  }
  /**
   * Perform comprehensive health check
   */
  async performHealthCheck() {
    var t, e, i, s;
    if (this.isActive)
      try {
        const n = this.audioManager.checkMediaStreamHealth();
        this.lastHealthCheck = n, n.healthy || (console.warn("⚠️ [MicrophoneLifecycleManager] Unhealthy microphone state detected:", n), this.autoRecoveryAttempts < this.maxAutoRecoveryAttempts ? (this.autoRecoveryAttempts++, l.log(`🔧 [MicrophoneLifecycleManager] Attempting automatic recovery (${this.autoRecoveryAttempts}/${this.maxAutoRecoveryAttempts})`), setTimeout(async () => {
          var o, a;
          try {
            await this.audioManager.initialize(), l.log("✅ [MicrophoneLifecycleManager] Automatic recovery successful"), this.dispatchCustomEvent("pitchpro:lifecycle:autoRecoverySuccess", {});
          } catch (r) {
            console.error("❌ [MicrophoneLifecycleManager] Automatic recovery failed:", r), (a = (o = this.callbacks).onError) == null || a.call(o, r), this.dispatchCustomEvent("pitchpro:lifecycle:autoRecoveryFailed", { error: r });
          }
        }, this.config.autoRecoveryDelayMs)) : (console.error("❌ [MicrophoneLifecycleManager] Maximum recovery attempts reached - manual intervention required"), (e = (t = this.callbacks).onError) == null || e.call(t, new Error("Microphone health check failed - maximum recovery attempts exceeded"))));
      } catch (n) {
        console.error("❌ [MicrophoneLifecycleManager] Health check failed:", n), (s = (i = this.callbacks).onError) == null || s.call(i, n);
      }
  }
  /**
   * Check for idle timeout
   */
  checkIdleTimeout() {
    if (!this.isActive) return;
    const t = Date.now() - this.lastActivityTime;
    t > this.config.idleTimeoutMs && this.isUserActive && (l.log("😴 [MicrophoneLifecycleManager] User idle detected"), this.isUserActive = !1), t > this.config.maxIdleTimeBeforeRelease && (l.log("⏰ [MicrophoneLifecycleManager] Extreme idle detected - auto-releasing resources"), this.forceRelease());
  }
  /**
   * Stop all monitoring intervals
   */
  stopAllMonitoring() {
    this.healthCheckInterval && (clearInterval(this.healthCheckInterval), this.healthCheckInterval = null), this.idleCheckInterval && (clearInterval(this.idleCheckInterval), this.idleCheckInterval = null), this.visibilityCheckInterval && (clearInterval(this.visibilityCheckInterval), this.visibilityCheckInterval = null), l.log("⏹️ [MicrophoneLifecycleManager] All monitoring stopped");
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
    this.config = { ...this.config, ...t }, this.isActive && (this.stopAllMonitoring(), this.startHealthMonitoring(), this.startIdleMonitoring(), this.startVisibilityMonitoring()), l.log("🔧 [MicrophoneLifecycleManager] Configuration updated:", t);
  }
  /**
   * Cleanup and destroy
   */
  destroy() {
    l.log("🗑️ [MicrophoneLifecycleManager] Destroying lifecycle manager"), this.stopAllMonitoring(), this.forceRelease(), this.eventListeners.forEach((t, e) => {
      e.includes("window:") ? window.removeEventListener(e.replace("window:", ""), t) : document.removeEventListener(e, t);
    }), this.eventListeners.clear(), l.log("✅ [MicrophoneLifecycleManager] Cleanup complete");
  }
}
class Ot {
  constructor() {
    if (this.container = null, this.notifications = /* @__PURE__ */ new Map(), this.notificationCounter = 0, this.defaultDuration = 5e3, this.maxNotifications = 3, this.cssClasses = {
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
      l.log("🔇 [ErrorNotificationSystem] SSR environment detected - skipping initialization");
      return;
    }
    this.initializeContainer(), this.injectCSS();
  }
  /**
   * Create and inject the notification container into the DOM
   */
  initializeContainer() {
    let t = document.querySelector(`.${this.cssClasses.container}`);
    t ? (this.container = t, l.log("📋 [ErrorNotificationSystem] Using existing notification container")) : (this.container = document.createElement("div"), this.container.className = this.cssClasses.container, this.container.setAttribute("role", "alert"), this.container.setAttribute("aria-live", "polite"), document.body.appendChild(this.container), l.log("📋 [ErrorNotificationSystem] Notification container created"));
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
    return l.log(`📢 [ErrorNotificationSystem] Notification shown: ${t.type} - ${t.title}`), e;
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
    const n = document.createElement("div");
    if (n.className = this.cssClasses.message, n.textContent = e.message, i.appendChild(n), e.details && e.details.length > 0) {
      const a = document.createElement("div");
      a.className = this.cssClasses.details;
      const r = document.createElement("ul");
      r.style.margin = "0", r.style.paddingLeft = "16px", e.details.forEach((c) => {
        const h = document.createElement("li");
        h.textContent = c, r.appendChild(h);
      }), a.appendChild(r), i.appendChild(a);
    }
    if (e.solution) {
      const a = document.createElement("div");
      a.className = this.cssClasses.solution, a.textContent = e.solution, i.appendChild(a);
    }
    const o = document.createElement("button");
    return o.className = this.cssClasses.closeButton, o.innerHTML = "×", o.setAttribute("aria-label", "Close notification"), o.addEventListener("click", () => {
      this.remove(t);
    }), i.appendChild(o), i;
  }
  /**
   * Remove a specific notification
   */
  remove(t) {
    const e = this.notifications.get(t);
    e && (e.classList.add("removing"), setTimeout(() => {
      e.parentNode && e.parentNode.removeChild(e), this.notifications.delete(t);
    }, 300), l.log(`🗑️ [ErrorNotificationSystem] Notification removed: ${t}`));
  }
  /**
   * Clear all notifications
   */
  clearAll() {
    Array.from(this.notifications.keys()).forEach((e) => this.remove(e)), l.log("🧹 [ErrorNotificationSystem] All notifications cleared");
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
    t.defaultDuration !== void 0 && (this.defaultDuration = t.defaultDuration), t.maxNotifications !== void 0 && (this.maxNotifications = t.maxNotifications), l.log("🔧 [ErrorNotificationSystem] Configuration updated:", t);
  }
  /**
   * Destroy the notification system
   */
  destroy() {
    l.log("🗑️ [ErrorNotificationSystem] Destroying notification system"), this.clearAll(), this.container && this.container.parentNode && this.container.parentNode.removeChild(this.container);
    const t = document.querySelector("#pitchpro-notifications-styles");
    t && t.parentNode && t.parentNode.removeChild(t), this.container = null, this.notifications.clear(), l.log("✅ [ErrorNotificationSystem] Cleanup complete");
  }
}
class jt {
  constructor(t = {}, e = {}, i = !0) {
    this.currentState = "uninitialized", this.isPermissionGranted = !1, this.lastError = null, this.eventCallbacks = {}, this.deviceSpecs = null, this.audioManager = new zt(t), this.lifecycleManager = new Vt(this.audioManager, e), this.errorSystem = i ? new Ot() : null, this.setupEventHandlers(), this.detectDevice();
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
    this.deviceSpecs = this.audioManager.getPlatformSpecs(), l.log("📱 [MicrophoneController] Device detected:", this.deviceSpecs), (e = (t = this.eventCallbacks).onDeviceChange) == null || e.call(t, this.deviceSpecs), this.dispatchCustomEvent("pitchpro:deviceDetected", { specs: this.deviceSpecs });
  }
  /**
   * Initialize microphone access and permissions
   */
  async initialize() {
    var t, e, i, s;
    try {
      this.updateState("initializing"), l.log("🎤 [MicrophoneController] Starting initialization");
      const n = await this.lifecycleManager.acquire();
      return this.isPermissionGranted = !0, this.updateState("ready"), this.lastError = null, (e = (t = this.eventCallbacks).onPermissionChange) == null || e.call(t, !0), this.dispatchCustomEvent("pitchpro:microphoneGranted", { stream: n.mediaStream }), l.log("✅ [MicrophoneController] Initialization complete"), n;
    } catch (n) {
      throw console.error("❌ [MicrophoneController] Initialization failed:", n), this.isPermissionGranted = !1, this.handleError(n, "initialization"), (s = (i = this.eventCallbacks).onPermissionChange) == null || s.call(i, !1), this.dispatchCustomEvent("pitchpro:microphoneDenied", { error: n }), n;
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
    l.log("🛑 [MicrophoneController] Stopping microphone"), this.lifecycleManager.release(), this.updateState("ready"), this.dispatchCustomEvent("pitchpro:microphoneStopped", {}), l.log("✅ [MicrophoneController] Microphone stopped");
  }
  /**
   * Force stop with complete cleanup
   */
  forceStop() {
    l.log("🚨 [MicrophoneController] Force stopping microphone"), this.lifecycleManager.forceRelease(), this.updateState("uninitialized"), this.isPermissionGranted = !1, l.log("✅ [MicrophoneController] Force stop complete");
  }
  /**
   * Set microphone sensitivity
   */
  setSensitivity(t) {
    var s, n;
    const e = this.audioManager.getSensitivity();
    this.audioManager.setSensitivity(t);
    const i = this.audioManager.getSensitivity();
    e !== i && (l.log(`🔧 [MicrophoneController] Sensitivity changed: ${e}x → ${i}x`), (n = (s = this.eventCallbacks).onSensitivityChange) == null || n.call(s, i), this.dispatchCustomEvent("pitchpro:sensitivityChanged", { sensitivity: i }));
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
      let s = 0, n = null;
      const o = e + t;
      await new Promise((h) => {
        const p = () => {
          if (Date.now() >= o) {
            h();
            return;
          }
          const d = i.fftSize, u = new Float32Array(d);
          i.getFloatTimeDomainData(u);
          let f = 0;
          for (let v = 0; v < d; v++)
            f += Math.abs(u[v]);
          const S = Math.sqrt(f / d) * 100;
          if (S > s && (s = S), S > 5) {
            let v = 0, M = 0;
            for (let w = 1; w < d / 2; w++) {
              const y = Math.abs(u[w]);
              y > M && (M = y, v = w);
            }
            v > 0 && (n = v * 44100 / d);
          }
          requestAnimationFrame(p);
        };
        p();
      }), this.audioManager.removeAnalyser("microphone-test");
      const a = Date.now() - e, r = s > 1, c = n ? n.toFixed(0) : "none";
      return l.log(`🧪 [MicrophoneController] Microphone test complete: volume=${s.toFixed(2)}, frequency=${c}, duration=${a}ms`), {
        success: r,
        volume: s,
        frequency: n,
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
      this.currentState = t, l.log(`🔄 [MicrophoneController] State changed: ${s} → ${t}`), (i = (e = this.eventCallbacks).onStateChange) == null || i.call(e, t);
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
    l.log("🗑️ [MicrophoneController] Destroying controller"), this.forceStop(), this.lifecycleManager.destroy(), (t = this.errorSystem) == null || t.destroy(), this.eventCallbacks = {}, this.currentState = "uninitialized", this.isPermissionGranted = !1, this.lastError = null, this.deviceSpecs = null, l.log("✅ [MicrophoneController] Cleanup complete");
  }
}
class Ut {
  constructor(t = {}) {
    this.historyBuffer = [], this.config = {
      historyWindowMs: 2e3,
      minConfidenceThreshold: 0.6,
      harmonicToleranceCents: 30,
      maxHarmonicNumber: 8,
      stabilityWeight: 0.7,
      volumeWeight: 0.3
    }, this.config = { ...this.config, ...t };
  }
  /**
   * Apply harmonic correction to detected frequency
   */
  correctFrequency(t, e = 1) {
    const i = Date.now();
    this.cleanHistory(i), this.addToHistory(t, e, i);
    const s = this.analyzeHarmonics(t);
    return s.confidence >= this.config.minConfidenceThreshold ? {
      correctedFreq: s.correctedFrequency,
      confidence: s.confidence,
      correctionApplied: Math.abs(s.correctedFrequency - t) > 1
    } : {
      correctedFreq: t,
      confidence: s.confidence,
      correctionApplied: !1
    };
  }
  /**
   * Analyze frequency for harmonic patterns
   */
  analyzeHarmonics(t) {
    if (this.historyBuffer.length < 3)
      return {
        correctedFrequency: t,
        confidence: 0.1
      };
    const e = this.historyBuffer.slice(-10).map((n) => n.frequency), i = this.findFundamentalCandidates(t);
    let s = {
      frequency: t,
      confidence: 0.1,
      harmonicNumber: 1
    };
    for (const n of i) {
      const o = this.calculateHarmonicConfidence(
        n.fundamental,
        n.harmonicNumber,
        e
      );
      o > s.confidence && (s = {
        frequency: n.fundamental,
        confidence: o,
        harmonicNumber: n.harmonicNumber
      });
    }
    return s.harmonicNumber > 1 && s.confidence > this.config.minConfidenceThreshold ? {
      correctedFrequency: s.frequency,
      confidence: s.confidence,
      harmonicNumber: s.harmonicNumber,
      fundamentalCandidate: s.frequency
    } : {
      correctedFrequency: t,
      confidence: s.confidence
    };
  }
  /**
   * Find potential fundamental frequencies for a given detected frequency
   */
  findFundamentalCandidates(t) {
    const e = [];
    for (let i = 2; i <= this.config.maxHarmonicNumber; i++) {
      const s = t / i;
      if (s < 60) continue;
      const n = s * i, o = Math.abs(1200 * Math.log2(t / n));
      if (o <= this.config.harmonicToleranceCents) {
        const a = 1 - o / this.config.harmonicToleranceCents;
        e.push({
          fundamental: s,
          harmonicNumber: i,
          likelihood: a
        });
      }
    }
    return e.push({
      fundamental: t,
      harmonicNumber: 1,
      likelihood: 0.5
    }), e.sort((i, s) => s.likelihood - i.likelihood);
  }
  /**
   * Calculate confidence that a frequency pattern represents a harmonic series
   */
  calculateHarmonicConfidence(t, e, i) {
    if (i.length < 3) return 0.1;
    let s = 0, n = 0;
    for (const r of i) {
      let c = Math.round(r / t);
      c < 1 && (c = 1);
      const h = t * c, p = Math.abs(1200 * Math.log2(r / h));
      if (p <= this.config.harmonicToleranceCents * 2) {
        const d = 1 - p / (this.config.harmonicToleranceCents * 2);
        s += d, n++;
      }
    }
    if (n === 0) return 0.1;
    const o = s / n, a = Math.min(n / i.length, 1);
    return Math.min(o * this.config.stabilityWeight + a * (1 - this.config.stabilityWeight), 1);
  }
  /**
   * Add frequency detection to history
   */
  addToHistory(t, e, i) {
    const s = Math.min(e, 1);
    let n = 0.5;
    if (this.historyBuffer.length > 0) {
      const a = this.historyBuffer[this.historyBuffer.length - 1].frequency, r = Math.max(t, a) / Math.min(t, a);
      n = Math.max(0, 1 - (r - 1) * 5);
    }
    const o = s * this.config.volumeWeight + n * (1 - this.config.volumeWeight);
    this.historyBuffer.push({
      frequency: t,
      confidence: o,
      timestamp: i,
      volume: e
    }), this.historyBuffer.length > 50 && this.historyBuffer.shift();
  }
  /**
   * Clean old entries from history
   */
  cleanHistory(t) {
    const e = t - this.config.historyWindowMs;
    this.historyBuffer = this.historyBuffer.filter((i) => i.timestamp > e);
  }
  /**
   * Reset correction history
   */
  resetHistory() {
    this.historyBuffer = [];
  }
  /**
   * Get current analysis statistics
   */
  getAnalysisStats() {
    if (this.historyBuffer.length === 0)
      return {
        historyLength: 0,
        averageConfidence: 0,
        frequencyRange: null,
        stabilityScore: 0
      };
    const t = this.historyBuffer.map((h) => h.frequency), e = this.historyBuffer.map((h) => h.confidence), i = e.reduce((h, p) => h + p, 0) / e.length, s = Math.min(...t), n = Math.max(...t), o = t.reduce((h, p) => h + p, 0) / t.length, a = t.reduce((h, p) => h + Math.pow(p - o, 2), 0) / t.length, r = Math.sqrt(a) / o, c = Math.max(0, 1 - r);
    return {
      historyLength: this.historyBuffer.length,
      averageConfidence: i,
      frequencyRange: { min: s, max: n },
      stabilityScore: c
    };
  }
  /**
   * Configure correction parameters
   */
  updateConfig(t) {
    this.config = { ...this.config, ...t };
  }
}
const B = {
  EXCELLENT: "excellent",
  GOOD: "good",
  FAIR: "fair",
  POOR: "poor"
};
class Wt {
  constructor(t = {}) {
    this.analysisBuffer = [], this.config = {
      analysisWindowMs: 3e3,
      stabilityThresholdCents: 20,
      vibratoMinRate: 4.5,
      vibratoMaxRate: 7.5,
      vibratoMinDepthCents: 50,
      breathinessThreshold: 0.3,
      minAnalysisTime: 1e3
    }, this.config = { ...this.config, ...t };
  }
  /**
   * Analyze voice characteristics from audio data
   */
  analyzeVoice(t, e, i, s) {
    const n = Date.now();
    this.addToBuffer(t, e, i, n), this.cleanBuffer(n);
    const o = this.calculateStability(), a = this.detectVibrato(), r = s ? this.analyzeBreathiness(s) : null, c = this.analyzeConsistency(), h = this.calculateOverallQuality(o, a, r, c), p = this.generateRecommendations(
      h,
      o,
      a,
      r,
      c
    );
    return {
      quality: h,
      stability: o,
      recommendations: p
    };
  }
  /**
   * Calculate pitch stability
   */
  calculateStability() {
    if (this.analysisBuffer.length < 10)
      return 0.5;
    const e = this.analysisBuffer.map((r) => r.frequency).filter((r) => r > 0);
    if (e.length < 5)
      return 0.3;
    const i = e.reduce((r, c) => r + c, 0) / e.length, s = e.reduce((r, c) => r + Math.pow(c - i, 2), 0) / e.length, a = Math.sqrt(s) / i * 1200;
    return Math.max(0, Math.min(1, 1 - a / 100));
  }
  /**
   * Detect vibrato characteristics
   */
  detectVibrato() {
    if (this.analysisBuffer.length < 30)
      return { detected: !1, rate: null, depth: null, regularity: null };
    const t = this.analysisBuffer.map((d) => d.frequency).filter((d) => d > 0);
    if (t.length < 20)
      return { detected: !1, rate: null, depth: null, regularity: null };
    const e = this.smoothFrequencies(t, 3), i = this.findExtrema(e);
    if (i.length < 4)
      return { detected: !1, rate: null, depth: null, regularity: null };
    const s = (this.analysisBuffer[this.analysisBuffer.length - 1].timestamp - this.analysisBuffer[0].timestamp) / 1e3, o = i.length / 2 / s, a = [];
    for (let d = 0; d < i.length - 1; d++) {
      const u = e[i[d].index], f = e[i[d + 1].index];
      if (u > 0 && f > 0) {
        const g = Math.abs(1200 * Math.log2(u / f));
        a.push(g);
      }
    }
    const r = a.length > 0 ? a.reduce((d, u) => d + u, 0) / a.length : 0, c = [];
    for (let d = 0; d < i.length - 2; d += 2) {
      const u = i[d + 2].index - i[d].index;
      c.push(u);
    }
    let h = 0;
    if (c.length > 2) {
      const d = c.reduce((f, g) => f + g, 0) / c.length, u = c.reduce((f, g) => f + Math.pow(g - d, 2), 0) / c.length;
      h = Math.max(0, 1 - Math.sqrt(u) / d);
    }
    return {
      detected: o >= this.config.vibratoMinRate && o <= this.config.vibratoMaxRate && r >= this.config.vibratoMinDepthCents,
      rate: o,
      depth: r,
      regularity: h
    };
  }
  /**
   * Analyze breathiness from spectral data
   */
  analyzeBreathiness(t) {
    const e = Math.floor(t.length * 0.1), i = t.slice(Math.floor(t.length * 0.7)), s = t.slice(0, e * 2).reduce((a, r) => a + r * r, 0), n = i.reduce((a, r) => a + r * r, 0);
    if (s === 0) return 1;
    const o = n / s;
    return Math.min(1, o);
  }
  /**
   * Analyze consistency over time
   */
  analyzeConsistency() {
    if (this.analysisBuffer.length < 10) return 0.5;
    const t = this.analysisBuffer.map((n) => n.volume), e = this.analysisBuffer.map((n) => n.clarity), i = this.calculateConsistencyScore(t), s = this.calculateConsistencyScore(e);
    return (i + s) / 2;
  }
  /**
   * Calculate consistency score for an array of values
   */
  calculateConsistencyScore(t) {
    if (t.length < 3) return 0.5;
    const e = t.reduce((n, o) => n + o, 0) / t.length, i = t.reduce((n, o) => n + Math.pow(o - e, 2), 0) / t.length, s = Math.sqrt(i) / (e || 1);
    return Math.max(0, Math.min(1, 1 - s));
  }
  /**
   * Calculate overall voice quality
   */
  calculateOverallQuality(t, e, i, s) {
    const n = {
      stability: 0.4,
      consistency: 0.3,
      breathiness: 0.2,
      vibrato: 0.1
    };
    let o = t * n.stability + s * n.consistency;
    return i !== null ? o += (1 - Math.min(i, 1)) * n.breathiness : o += 0.7 * n.breathiness, e.detected && e.regularity > 0.7 ? o += 0.9 * n.vibrato : e.detected ? o += 0.6 * n.vibrato : o += 0.5 * n.vibrato, o >= 0.85 ? B.EXCELLENT : o >= 0.7 ? B.GOOD : o >= 0.5 ? B.FAIR : B.POOR;
  }
  /**
   * Generate recommendations based on analysis
   */
  generateRecommendations(t, e, i, s, n) {
    const o = [];
    return e < 0.5 ? (o.push("音程の安定性を向上させるため、ゆっくりとした発声練習を行ってください"), o.push("腹式呼吸を意識して、息の流れを一定に保つ練習をしてください")) : e < 0.7 && o.push("音程の微調整練習で、より正確なピッチコントロールを目指しましょう"), n < 0.5 && (o.push("音量と音質の一貫性を保つため、定期的な発声練習を継続してください"), o.push("録音を聞き返して、自分の声の特徴を把握しましょう")), s !== null && s > 0.6 && (o.push("声の息漏れが気になります。発声時の喉の締まりを意識してください"), o.push("ハミング練習で、クリアな声質を目指しましょう")), i.detected ? i.regularity < 0.5 ? o.push("ビブラートの規則性を改善するため、メトロノームに合わせた練習をしてください") : i.rate > 7.5 && o.push("ビブラートの速度が速すぎます。よりゆったりとしたビブラートを練習してください") : (t === B.GOOD || t === B.EXCELLENT) && o.push("美しいビブラートの習得に挑戦してみましょう"), t === B.POOR ? (o.push("基礎的な発声練習から始めることをお勧めします"), o.push("専門的な指導を受けることを検討してください")) : t === B.EXCELLENT && o.push("素晴らしい声質です。この状態を維持する練習を続けてください"), o;
  }
  /**
   * Smooth frequency data using moving average
   */
  smoothFrequencies(t, e) {
    const i = [];
    for (let s = 0; s < t.length; s++) {
      let n = 0, o = 0;
      const a = Math.max(0, s - Math.floor(e / 2)), r = Math.min(t.length, s + Math.floor(e / 2) + 1);
      for (let c = a; c < r; c++)
        n += t[c], o++;
      i.push(n / o);
    }
    return i;
  }
  /**
   * Find local extrema (peaks and valleys) in frequency data
   */
  findExtrema(t) {
    const e = [];
    for (let i = 1; i < t.length - 1; i++) {
      const s = t[i - 1], n = t[i], o = t[i + 1];
      n > s && n > o ? e.push({ index: i, value: n, type: "peak" }) : n < s && n < o && e.push({ index: i, value: n, type: "valley" });
    }
    return e;
  }
  /**
   * Add data to analysis buffer
   */
  addToBuffer(t, e, i, s) {
    this.analysisBuffer.push({ frequency: t, volume: e, clarity: i, timestamp: s }), this.analysisBuffer.length > 200 && this.analysisBuffer.shift();
  }
  /**
   * Clean old data from buffer
   */
  cleanBuffer(t) {
    const e = t - this.config.analysisWindowMs;
    this.analysisBuffer = this.analysisBuffer.filter((i) => i.timestamp > e);
  }
  /**
   * Reset analysis buffer
   */
  reset() {
    this.analysisBuffer = [];
  }
  /**
   * Get current buffer statistics
   */
  getBufferStats() {
    if (this.analysisBuffer.length === 0)
      return { entryCount: 0, timeSpanMs: 0, averageVolume: 0, averageClarity: 0 };
    const t = this.analysisBuffer.map((s) => s.volume), e = this.analysisBuffer.map((s) => s.clarity), i = this.analysisBuffer[this.analysisBuffer.length - 1].timestamp - this.analysisBuffer[0].timestamp;
    return {
      entryCount: this.analysisBuffer.length,
      timeSpanMs: i,
      averageVolume: t.reduce((s, n) => s + n, 0) / t.length,
      averageClarity: e.reduce((s, n) => s + n, 0) / e.length
    };
  }
}
const F = class F {
  /**
   * Detect current device and return optimized specifications
   */
  static getDeviceSpecs() {
    if (F.cachedSpecs)
      return F.cachedSpecs;
    if (typeof window > "u" || typeof navigator > "u")
      return F.getDefaultSpecs();
    const t = navigator.userAgent, e = F.analyzeUserAgent(t);
    return F.cachedSpecs = e, l.log("📱 [DeviceDetection] Device analysis:", {
      userAgent: t.substring(0, 100) + "...",
      deviceType: e.deviceType,
      isIOS: e.isIOS,
      sensitivity: e.sensitivity,
      divisor: e.divisor
    }), e;
  }
  /**
   * Analyze user agent string and determine device specifications
   */
  static analyzeUserAgent(t) {
    const e = /iPhone/.test(t), i = /iPad/.test(t), s = /Macintosh/.test(t) && "ontouchend" in document, n = /iPad|iPhone|iPod/.test(t), o = /iPad|iPhone|iPod/.test(navigator.platform || ""), a = e || i || s || n || o;
    let r = "PC";
    e ? r = "iPhone" : i || s ? r = "iPad" : a && (r = F.detectIOSDeviceType());
    const c = F.getDeviceOptimizations(r, a);
    return {
      deviceType: r,
      isIOS: a,
      sensitivity: c.sensitivity,
      noiseGate: c.noiseGate,
      divisor: c.divisor,
      gainCompensation: c.gainCompensation,
      noiseThreshold: c.noiseThreshold,
      smoothingFactor: c.smoothingFactor
    };
  }
  /**
   * Detect iOS device type when specific detection fails
   */
  static detectIOSDeviceType() {
    const t = window.screen.width, e = window.screen.height, i = Math.max(t, e), s = Math.min(t, e);
    return i >= 768 || i >= 700 && s >= 500 ? "iPad" : "iPhone";
  }
  /**
   * Get device-specific optimization parameters
   */
  static getDeviceOptimizations(t, e) {
    switch (t) {
      case "iPad":
        return {
          sensitivity: 7,
          // High sensitivity for iPad microphones
          noiseGate: 0.01,
          // Low noise gate
          divisor: 4,
          // Volume calculation divisor
          gainCompensation: 1.5,
          // Gain compensation for low-frequency cut
          noiseThreshold: 12,
          // Noise threshold for silence detection
          smoothingFactor: 0.2
          // Smoothing factor
        };
      case "iPhone":
        return {
          sensitivity: 3,
          // Medium-high sensitivity for iPhone
          noiseGate: 0.015,
          // Medium noise gate
          divisor: 4,
          // Volume calculation divisor
          gainCompensation: 1.5,
          // Gain compensation
          noiseThreshold: 12,
          // Noise threshold
          smoothingFactor: 0.2
          // Smoothing factor
        };
      case "PC":
      default:
        return {
          sensitivity: 1,
          // Standard sensitivity for PC
          noiseGate: 0.02,
          // Higher noise gate for PC microphones
          divisor: 6,
          // Different volume calculation for PC
          gainCompensation: 1,
          // No additional gain compensation needed
          noiseThreshold: 15,
          // Higher noise threshold
          smoothingFactor: 0.2
          // Standard smoothing
        };
    }
  }
  /**
   * Get default specifications for SSR or fallback
   */
  static getDefaultSpecs() {
    return {
      deviceType: "PC",
      isIOS: !1,
      sensitivity: 1,
      noiseGate: 0.02,
      divisor: 6,
      gainCompensation: 1,
      noiseThreshold: 15,
      smoothingFactor: 0.2
    };
  }
  /**
   * Check if device supports Web Audio API
   */
  static supportsWebAudio() {
    return typeof window < "u" && (typeof window.AudioContext < "u" || typeof window.webkitAudioContext < "u");
  }
  /**
   * Check if device supports MediaDevices API
   */
  static supportsMediaDevices() {
    return typeof navigator < "u" && typeof navigator.mediaDevices < "u" && typeof navigator.mediaDevices.getUserMedia < "u";
  }
  /**
   * Check if device supports MediaRecorder API
   */
  static supportsMediaRecorder() {
    return typeof window < "u" && typeof window.MediaRecorder < "u";
  }
  /**
   * Get comprehensive device capabilities
   */
  static getDeviceCapabilities() {
    return {
      deviceSpecs: F.getDeviceSpecs(),
      webAudioSupport: F.supportsWebAudio(),
      mediaDevicesSupport: F.supportsMediaDevices(),
      mediaRecorderSupport: F.supportsMediaRecorder(),
      touchSupport: "ontouchend" in document,
      userAgent: typeof navigator < "u" ? navigator.userAgent : "Unknown",
      screenSize: typeof window < "u" ? {
        width: window.screen.width,
        height: window.screen.height,
        pixelRatio: window.devicePixelRatio
      } : null,
      language: typeof navigator < "u" ? navigator.language : "Unknown",
      platform: typeof navigator < "u" && navigator.platform || "Unknown"
    };
  }
  /**
   * Check if current device is mobile
   */
  static isMobile() {
    return F.getDeviceSpecs().isIOS || /Android|webOS|BlackBerry|IEMobile|Opera Mini/i.test((navigator == null ? void 0 : navigator.userAgent) || "");
  }
  /**
   * Check if current device is tablet
   */
  static isTablet() {
    if (F.getDeviceSpecs().deviceType === "iPad") return !0;
    const e = (navigator == null ? void 0 : navigator.userAgent) || "";
    return /Android/i.test(e) && !/Mobile/i.test(e);
  }
  /**
   * Check if current device is desktop
   */
  static isDesktop() {
    return !F.isMobile() && !F.isTablet();
  }
  /**
   * Get recommended audio constraints for current device
   */
  static getOptimalAudioConstraints() {
    const t = F.getDeviceSpecs(), e = {
      audio: {
        echoCancellation: !1,
        noiseSuppression: !1,
        autoGainControl: !1,
        sampleRate: 44100,
        channelCount: 1,
        sampleSize: 16,
        // latency: 0.1, // Not supported in MediaTrackConstraints
        // volume: 1.0, // Not supported in MediaTrackConstraints
        deviceId: { ideal: "default" }
      }
    };
    return t.isIOS && e.audio && typeof e.audio == "object" && (e.audio = {
      ...e.audio,
      // Disable all browser-level processing for iOS
      googAutoGainControl: !1,
      googNoiseSuppression: !1,
      googEchoCancellation: !1,
      googHighpassFilter: !1,
      googTypingNoiseDetection: !1,
      googBeamforming: !1,
      mozAutoGainControl: !1,
      mozNoiseSuppression: !1
    }), e;
  }
  /**
   * Clear cached device specifications (for testing)
   */
  static clearCache() {
    F.cachedSpecs = null;
  }
  /**
   * Get device-specific debugging information
   */
  static getDebugInfo() {
    return {
      ...F.getDeviceCapabilities(),
      detectionMethods: {
        userAgentIPhone: /iPhone/.test((navigator == null ? void 0 : navigator.userAgent) || ""),
        userAgentIPad: /iPad/.test((navigator == null ? void 0 : navigator.userAgent) || ""),
        userAgentMacintosh: /Macintosh/.test((navigator == null ? void 0 : navigator.userAgent) || ""),
        touchSupport: "ontouchend" in document,
        navigatorPlatform: (navigator == null ? void 0 : navigator.platform) || "Unknown",
        screenAspectRatio: typeof window < "u" ? (window.screen.width / window.screen.height).toFixed(2) : "Unknown"
      }
    };
  }
};
F.cachedSpecs = null;
let gt = F;
class Kt {
  constructor() {
    this.calibrationData = null, this.isCalibrated = !1, this.calibrationInProgress = !1, this.deviceSpecs = gt.getDeviceSpecs();
  }
  /**
   * Perform automatic calibration
   */
  async calibrate(t, e) {
    if (this.calibrationInProgress)
      throw new Error("Calibration already in progress");
    this.calibrationInProgress = !0;
    try {
      l.log("🎛️ [CalibrationSystem] Starting device calibration");
      const i = await this.measureBackgroundNoise(t, e), s = await this.calibrateVolumeLevels(t, e), n = await this.measureFrequencyResponse(t, e), o = this.calculateOptimalSettings(
        i,
        s,
        n
      );
      return this.calibrationData = {
        volumeOffset: s.offset,
        frequencyResponse: n,
        noiseProfile: i,
        optimalSettings: o
      }, this.isCalibrated = !0, this.calibrationInProgress = !1, l.log("✅ [CalibrationSystem] Calibration completed successfully"), {
        success: !0,
        calibrationData: this.calibrationData,
        recommendedSettings: o
      };
    } catch (i) {
      return console.error("❌ [CalibrationSystem] Calibration failed:", i), this.calibrationInProgress = !1, {
        success: !1,
        calibrationData: null,
        recommendedSettings: this.getDefaultSettings(),
        error: i
      };
    }
  }
  /**
   * Measure background noise levels
   */
  async measureBackgroundNoise(t, e, i = 2e3) {
    return new Promise((s) => {
      const n = t.createAnalyser();
      n.fftSize = 2048;
      const o = t.createMediaStreamSource(e);
      o.connect(n);
      const a = n.frequencyBinCount, r = new Float32Array(a), c = [], h = Date.now(), p = () => {
        if (Date.now() - h >= i) {
          const d = {};
          for (let u = 0; u < a; u++) {
            const f = u * t.sampleRate / n.fftSize;
            let g = 0;
            for (const S of c)
              g += S[u];
            d[Math.round(f)] = g / c.length;
          }
          o.disconnect(), s(d);
          return;
        }
        n.getFloatFrequencyData(r), c.push(new Float32Array(r)), setTimeout(p, 100);
      };
      p();
    });
  }
  /**
   * Calibrate volume levels
   */
  async calibrateVolumeLevels(t, e, i = 3e3) {
    return new Promise((s) => {
      const n = t.createAnalyser();
      n.fftSize = 1024;
      const o = t.createMediaStreamSource(e);
      o.connect(n);
      const a = n.fftSize, r = new Float32Array(a), c = [], h = Date.now(), p = () => {
        if (Date.now() - h >= i) {
          c.sort((w, y) => w - y);
          const f = c[0] || 0, g = c[c.length - 1] || 1, M = 0.3 - (c[Math.floor(c.length / 2)] || 0.5);
          o.disconnect(), s({
            offset: M,
            range: { min: f, max: g }
          });
          return;
        }
        n.getFloatTimeDomainData(r);
        let d = 0;
        for (let f = 0; f < a; f++)
          d += r[f] * r[f];
        const u = Math.sqrt(d / a);
        c.push(u), setTimeout(p, 50);
      };
      p();
    });
  }
  /**
   * Measure frequency response (simplified version)
   */
  async measureFrequencyResponse(t, e, i = 5e3) {
    return new Promise((s) => {
      const n = t.createAnalyser();
      n.fftSize = 4096;
      const o = t.createMediaStreamSource(e);
      o.connect(n);
      const a = n.frequencyBinCount, r = new Float32Array(a), c = {}, h = Date.now(), p = () => {
        if (Date.now() - h >= i) {
          const d = {};
          Object.keys(c).forEach((u) => {
            const f = parseInt(u), g = c[f], S = g.reduce((v, M) => v + M, 0) / g.length;
            d[f] = S;
          }), o.disconnect(), s(d);
          return;
        }
        n.getFloatFrequencyData(r);
        for (let d = 0; d < a; d++) {
          const u = Math.round(d * t.sampleRate / n.fftSize);
          u >= 80 && u <= 1e3 && (c[u] || (c[u] = []), c[u].push(r[d]));
        }
        setTimeout(p, 100);
      };
      p();
    });
  }
  /**
   * Calculate optimal settings based on calibration data
   */
  calculateOptimalSettings(t, e, i) {
    const s = this.getDefaultSettings(), n = Math.max(0.5, Math.min(2, 1 - e.offset)), o = s.sensitivity * n, r = Object.keys(t).map((y) => parseInt(y)).filter((y) => y >= 100 && y <= 800).map((y) => t[y]), c = r.length > 0 ? r.reduce((y, C) => y + C, 0) / r.length : -60, h = Math.max(-20, c + 10), p = Math.max(s.noiseGate, Math.abs(h) / 1e3), u = Object.keys(i).map((y) => parseInt(y)).sort((y, C) => y - C).map((y) => i[y]), f = u.slice(0, Math.floor(u.length * 0.3)), g = u.slice(
      Math.floor(u.length * 0.3),
      Math.floor(u.length * 0.7)
    ), S = u.slice(Math.floor(u.length * 0.7)), v = f.reduce((y, C) => y + C, 0) / f.length, M = g.reduce((y, C) => y + C, 0) / g.length, w = S.reduce((y, C) => y + C, 0) / S.length;
    return {
      sensitivity: Math.round(o * 10) / 10,
      noiseGate: Math.round(p * 1e3) / 1e3,
      volumeOffset: e.offset,
      filterSettings: {
        highpassFreq: v < M - 5 ? 100 : 80,
        // Stronger highpass if low freq is weak
        lowpassFreq: w > M + 3 ? 600 : 800,
        // Lower cutoff if high freq is strong
        notchFreq: 60,
        // Standard power line frequency
        highpassQ: 0.7,
        lowpassQ: 0.7,
        notchQ: 10
      },
      deviceAdjustments: {
        lowFreqCompensation: Math.max(0.8, Math.min(1.5, M / (v || -60))),
        highFreqCompensation: Math.max(0.8, Math.min(1.2, M / (w || -60)))
      }
    };
  }
  /**
   * Get default settings for current device
   */
  getDefaultSettings() {
    return {
      sensitivity: this.deviceSpecs.sensitivity,
      noiseGate: this.deviceSpecs.noiseGate,
      volumeOffset: 0,
      filterSettings: {
        highpassFreq: 80,
        lowpassFreq: 800,
        notchFreq: 60,
        highpassQ: 0.7,
        lowpassQ: 0.7,
        notchQ: 10
      }
    };
  }
  /**
   * Apply calibrated settings to audio processing
   */
  applyCalibration(t) {
    if (!this.isCalibrated || !this.calibrationData)
      return console.warn("⚠️ [CalibrationSystem] No calibration data available"), !1;
    try {
      const e = this.calibrationData.optimalSettings;
      return t.setSensitivity && t.setSensitivity(e.sensitivity), t.setNoiseGate && t.setNoiseGate(e.noiseGate), t.updateFilterSettings && t.updateFilterSettings(e.filterSettings), l.log("✅ [CalibrationSystem] Calibration applied successfully"), !0;
    } catch (e) {
      return console.error("❌ [CalibrationSystem] Failed to apply calibration:", e), !1;
    }
  }
  /**
   * Get calibration status
   */
  getCalibrationStatus() {
    return {
      isCalibrated: this.isCalibrated,
      inProgress: this.calibrationInProgress,
      deviceSpecs: this.deviceSpecs,
      calibrationData: this.calibrationData
    };
  }
  /**
   * Reset calibration
   */
  reset() {
    this.isCalibrated = !1, this.calibrationInProgress = !1, this.calibrationData = null, l.log("🔄 [CalibrationSystem] Calibration reset");
  }
  /**
   * Save calibration data to localStorage
   */
  saveCalibration() {
    if (!this.isCalibrated || !this.calibrationData)
      return !1;
    try {
      const t = `pitchpro_calibration_${this.deviceSpecs.deviceType}`, e = {
        deviceSpecs: this.deviceSpecs,
        calibrationData: this.calibrationData,
        timestamp: Date.now()
      };
      return localStorage.setItem(t, JSON.stringify(e)), l.log("💾 [CalibrationSystem] Calibration saved"), !0;
    } catch (t) {
      return console.error("❌ [CalibrationSystem] Failed to save calibration:", t), !1;
    }
  }
  /**
   * Load calibration data from localStorage
   */
  loadCalibration() {
    try {
      const t = `pitchpro_calibration_${this.deviceSpecs.deviceType}`, e = localStorage.getItem(t);
      if (!e)
        return !1;
      const i = JSON.parse(e), s = 7 * 24 * 60 * 60 * 1e3;
      return Date.now() - i.timestamp > s ? (l.log("⏰ [CalibrationSystem] Saved calibration is too old, ignoring"), !1) : i.deviceSpecs.deviceType !== this.deviceSpecs.deviceType ? (l.log("📱 [CalibrationSystem] Device type mismatch, ignoring saved calibration"), !1) : (this.calibrationData = i.calibrationData, this.isCalibrated = !0, l.log("📂 [CalibrationSystem] Calibration loaded successfully"), !0);
    } catch (t) {
      return console.error("❌ [CalibrationSystem] Failed to load calibration:", t), !1;
    }
  }
}
const b = class b {
  /**
   * Convert frequency to MIDI note number
   */
  static frequencyToMidi(t) {
    return t <= 0 ? 0 : Math.round(12 * Math.log2(t / b.A4_FREQUENCY) + b.A4_MIDI_NUMBER);
  }
  /**
   * Convert MIDI note number to frequency
   */
  static midiToFrequency(t) {
    return b.A4_FREQUENCY * Math.pow(2, (t - b.A4_MIDI_NUMBER) / 12);
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
    const i = b.frequencyToMidi(t), s = e ? b.FLAT_NOTE_NAMES : b.NOTE_NAMES, n = (i - 12) % 12, o = Math.floor((i - 12) / 12);
    return {
      name: s[n] + o,
      octave: o,
      midi: i,
      frequency: b.midiToFrequency(i)
    };
  }
  /**
   * Convert frequency to cents deviation from nearest semitone
   */
  static frequencyToCents(t) {
    if (t <= 0) return 0;
    const e = 12 * Math.log2(t / b.A4_FREQUENCY) + b.A4_MIDI_NUMBER, i = Math.round(e), s = (e - i) * 100;
    return Math.round(s);
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
    const e = b.frequencyToMidi(t);
    return b.midiToFrequency(e);
  }
  /**
   * Calculate the interval between two frequencies in semitones
   */
  static getInterval(t, e) {
    if (t <= 0 || e <= 0) return 0;
    const i = b.frequencyToMidi(t), s = b.frequencyToMidi(e);
    return Math.abs(s - i);
  }
  /**
   * Calculate the interval between two frequencies with direction
   */
  static getSignedInterval(t, e) {
    if (t <= 0 || e <= 0) return 0;
    const i = b.frequencyToMidi(t);
    return b.frequencyToMidi(e) - i;
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
    }, i = (t % 12 + 12) % 12, s = Math.floor(t / 12), n = e[i] || "Unknown";
    return {
      name: s > 0 ? `${n} + ${s} octave(s)` : n,
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
    const i = [];
    for (let s = 0; s < 12 * e; s++) {
      const n = t * Math.pow(2, s / 12);
      i.push(n);
    }
    return i;
  }
  /**
   * Generate a major scale starting from a base frequency
   */
  static generateMajorScale(t) {
    return [0, 2, 4, 5, 7, 9, 11, 12].map((i) => t * Math.pow(2, i / 12));
  }
  /**
   * Generate a minor scale starting from a base frequency
   */
  static generateMinorScale(t) {
    return [0, 2, 3, 5, 7, 8, 10, 12].map((i) => t * Math.pow(2, i / 12));
  }
  /**
   * Find harmonics of a fundamental frequency
   */
  static findHarmonics(t, e = 8) {
    const i = [];
    for (let s = 1; s <= e; s++)
      i.push(t * s);
    return i;
  }
  /**
   * Check if a frequency could be a harmonic of a fundamental
   */
  static isHarmonic(t, e, i = 0.05) {
    if (e <= 0 || t <= 0)
      return { isHarmonic: !1, harmonicNumber: null, exactFrequency: null };
    const s = t / e, n = Math.round(s);
    return n >= 1 && Math.abs(s - n) <= i ? {
      isHarmonic: !0,
      harmonicNumber: n,
      exactFrequency: e * n
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
    return b.frequencyToNote(t).name;
  }
  /**
   * Convert scientific pitch notation to frequency
   */
  static scientificPitchToFrequency(t) {
    const e = t.match(/^([A-G][#b]?)(-?\d+)$/);
    if (!e) return 0;
    const [, i, s] = e, n = parseInt(s, 10);
    let o = 0;
    const a = i[0], r = i.slice(1);
    o = {
      C: 0,
      D: 2,
      E: 4,
      F: 5,
      G: 7,
      A: 9,
      B: 11
    }[a] || 0, r === "#" ? o += 1 : r === "b" && (o -= 1);
    const h = (n + 1) * 12 + o;
    return b.midiToFrequency(h);
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
b.A4_FREQUENCY = 440, b.A4_MIDI_NUMBER = 69, b.NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"], b.FLAT_NOTE_NAMES = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"], b.INTERVALS = {
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
let D = b;
const A = class A {
  /**
   * Generate scale from root note
   */
  static generateScale(t, e = "major") {
    const i = A.SCALE_PATTERNS[e];
    if (!i)
      throw new Error(`Unknown scale type: ${e}`);
    return i.map((s) => {
      const n = t * Math.pow(2, s / 12);
      return D.frequencyToNote(n);
    });
  }
  /**
   * Generate chord from root note
   */
  static generateChord(t, e = "major") {
    const i = A.CHORD_PATTERNS[e];
    if (!i)
      throw new Error(`Unknown chord type: ${e}`);
    return i.map((s) => {
      const n = t * Math.pow(2, s / 12);
      return D.frequencyToNote(n);
    });
  }
  /**
   * Identify scale from a set of frequencies
   */
  static identifyScale(t) {
    if (t.length < 3)
      return [];
    const e = t.sort((o, a) => o - a), i = e[0], s = e.map(
      (o) => Math.round(12 * Math.log2(o / i))
    ), n = [];
    return Object.entries(A.SCALE_PATTERNS).forEach(([o, a]) => {
      for (let r = 0; r < 12; r++) {
        const c = a.map((u) => (u + r) % 12).sort((u, f) => u - f), h = s.map((u) => u % 12).sort((u, f) => u - f);
        let p = 0;
        h.forEach((u) => {
          c.includes(u) && p++;
        });
        const d = p / Math.max(h.length, c.length);
        if (d > 0.5) {
          const u = i * Math.pow(2, -r / 12);
          n.push({
            scale: o,
            confidence: d,
            root: D.frequencyToNote(u)
          });
        }
      }
    }), n.sort((o, a) => a.confidence - o.confidence).slice(0, 5);
  }
  /**
   * Identify chord from frequencies
   */
  static identifyChord(t) {
    if (t.length < 2)
      return [];
    const e = t.sort((s, n) => s - n), i = [];
    return Object.entries(A.CHORD_PATTERNS).forEach(([s, n]) => {
      for (let o = 0; o < n.length; o++) {
        const a = [
          ...n.slice(o),
          ...n.slice(0, o).map((r) => r + 12)
        ];
        e.forEach((r, c) => {
          const h = e.map(
            (f) => Math.round(12 * Math.log2(f / r))
          );
          let p = 0;
          const d = new Set(a);
          h.forEach((f) => {
            const g = f % 12;
            (d.has(g) || d.has(g + 12)) && p++;
          });
          const u = p / Math.max(h.length, n.length);
          if (u > 0.6) {
            const f = o === 0 ? r : r * Math.pow(2, -n[o] / 12);
            i.push({
              chord: s,
              confidence: u,
              root: D.frequencyToNote(f),
              inversion: o > 0 ? o : void 0
            });
          }
        });
      }
    }), i.sort((s, n) => n.confidence - s.confidence).slice(0, 3);
  }
  /**
   * Get the key signature for a given key
   */
  static getKeySignature(t, e = "major") {
    const i = ["F", "C", "G", "D", "A", "E", "B"], s = ["B", "E", "A", "D", "G", "C", "F"], n = {
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
    let o = n[t];
    if (!o && e === "minor") {
      const h = {
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
      h && (o = n[h]);
    }
    if (!o)
      return { sharps: [], flats: [], accidentalCount: 0 };
    const a = i.slice(0, o.sharps).map((c) => c + "#"), r = s.slice(0, o.flats).map((c) => c + "b");
    return {
      sharps: a,
      flats: r,
      accidentalCount: o.sharps || o.flats
    };
  }
  /**
   * Calculate the harmonic series for a fundamental frequency
   */
  static getHarmonicSeries(t, e = 16) {
    const i = [];
    for (let s = 1; s <= e; s++) {
      const n = t * s;
      i.push(D.frequencyToNote(n));
    }
    return i;
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
    const e = t * 100, i = A.getJustIntonationRatios();
    let s, n = 1 / 0;
    return Object.entries(i).forEach(([a, { cents: r }]) => {
      const c = Math.abs(e - r);
      c < n && (n = c, s = a);
    }), {
      ratio: Math.pow(2, t / 12),
      cents: e,
      closestJustInterval: s,
      centsDeviation: s ? n : void 0
    };
  }
  /**
   * Analyze melodic intervals in a sequence of notes
   */
  static analyzeMelody(t) {
    if (t.length < 2)
      return [];
    const e = [];
    for (let i = 1; i < t.length; i++) {
      const s = t[i - 1], n = t[i], o = D.frequencyToNote(s), a = D.frequencyToNote(n), r = D.getSignedInterval(s, n), c = D.getIntervalInfo(Math.abs(r)), h = r > 0 ? "up" : r < 0 ? "down" : "same";
      e.push({
        fromNote: o,
        toNote: a,
        interval: c,
        direction: h
      });
    }
    return e;
  }
  /**
   * Generate chord progressions in a given key
   */
  static generateChordProgression(t, e = "major", i = [1, 4, 5, 1]) {
    const s = D.scientificPitchToFrequency(t + "4");
    if (s === 0)
      throw new Error(`Invalid key: ${t}`);
    const n = A.generateScale(s, e === "minor" ? "naturalMinor" : "major"), o = [];
    return i.forEach((a) => {
      const r = n[(a - 1) % n.length], c = e === "major" ? A.getMajorScaleChordType(a) : A.getMinorScaleChordType(a), h = A.generateChord(r.frequency, c);
      o.push(h);
    }), o;
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
A.SCALE_PATTERNS = {
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
}, A.CHORD_PATTERNS = {
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
}, A.CIRCLE_OF_FIFTHS = [
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
], A.INTERVAL_NAMES = {
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
let St = A;
/**
 * PitchPro Audio Processing Library
 * High-precision pitch detection and audio processing for web applications
 * 
 * @version 1.0.0
 * @author PitchPro Team
 * @license MIT
 */
const Xt = "1.0.0", Jt = (/* @__PURE__ */ new Date()).toISOString(), Yt = {
  pitchDetector: {
    fftSize: 4096,
    smoothing: 0.1,
    clarityThreshold: 0.8,
    minVolumeAbsolute: 0.01
  },
  audioManager: {
    sampleRate: 44100,
    channelCount: 1,
    echoCancellation: !1,
    noiseSuppression: !1,
    autoGainControl: !1
  },
  noiseFilter: {
    highpassFreq: 80,
    lowpassFreq: 800,
    notchFreq: 60,
    Q: 0.7
  }
};
export {
  zt as AudioManager,
  Jt as BUILD_DATE,
  Kt as CalibrationSystem,
  Yt as DEFAULT_CONFIG,
  gt as DeviceDetection,
  Ot as ErrorNotificationSystem,
  D as FrequencyUtils,
  Ut as HarmonicCorrection,
  jt as MicrophoneController,
  Vt as MicrophoneLifecycleManager,
  St as MusicTheory,
  Qt as NoiseFilter,
  Ct as PitchDetector,
  Xt as VERSION,
  Wt as VoiceAnalyzer
};
//# sourceMappingURL=index.esm.js.map
