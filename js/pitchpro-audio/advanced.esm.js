import { D as B } from "./DeviceDetection-DXJ36uZ7.mjs";
class F {
  constructor(e = {}) {
    this.historyBuffer = [], this.config = {
      historyWindowMs: 2e3,
      minConfidenceThreshold: 0.6,
      harmonicToleranceCents: 30,
      maxHarmonicNumber: 8,
      stabilityWeight: 0.7,
      volumeWeight: 0.3
    }, this.config = { ...this.config, ...e };
  }
  /**
   * Apply harmonic correction to detected frequency
   */
  correctFrequency(e, n = 1) {
    const t = Date.now();
    this.cleanHistory(t), this.addToHistory(e, n, t);
    const i = this.analyzeHarmonics(e);
    return i.confidence >= this.config.minConfidenceThreshold ? {
      correctedFreq: i.correctedFrequency,
      confidence: i.confidence,
      correctionApplied: Math.abs(i.correctedFrequency - e) > 1
    } : {
      correctedFreq: e,
      confidence: i.confidence,
      correctionApplied: !1
    };
  }
  /**
   * Analyze frequency for harmonic patterns
   */
  analyzeHarmonics(e) {
    if (this.historyBuffer.length < 3)
      return {
        correctedFrequency: e,
        confidence: 0.1
      };
    const n = this.historyBuffer.slice(-10).map((s) => s.frequency), t = this.findFundamentalCandidates(e);
    let i = {
      frequency: e,
      confidence: 0.1,
      harmonicNumber: 1
    };
    for (const s of t) {
      const a = this.calculateHarmonicConfidence(
        s.fundamental,
        s.harmonicNumber,
        n
      );
      a > i.confidence && (i = {
        frequency: s.fundamental,
        confidence: a,
        harmonicNumber: s.harmonicNumber
      });
    }
    return i.harmonicNumber > 1 && i.confidence > this.config.minConfidenceThreshold ? {
      correctedFrequency: i.frequency,
      confidence: i.confidence,
      harmonicNumber: i.harmonicNumber,
      fundamentalCandidate: i.frequency
    } : {
      correctedFrequency: e,
      confidence: i.confidence
    };
  }
  /**
   * Find potential fundamental frequencies for a given detected frequency
   */
  findFundamentalCandidates(e) {
    const n = [];
    for (let t = 2; t <= this.config.maxHarmonicNumber; t++) {
      const i = e / t;
      if (i < 60) continue;
      const s = i * t, a = Math.abs(1200 * Math.log2(e / s));
      if (a <= this.config.harmonicToleranceCents) {
        const c = 1 - a / this.config.harmonicToleranceCents;
        n.push({
          fundamental: i,
          harmonicNumber: t,
          likelihood: c
        });
      }
    }
    return n.push({
      fundamental: e,
      harmonicNumber: 1,
      likelihood: 0.5
    }), n.sort((t, i) => i.likelihood - t.likelihood);
  }
  /**
   * Calculate confidence that a frequency pattern represents a harmonic series
   */
  calculateHarmonicConfidence(e, n, t) {
    if (t.length < 3) return 0.1;
    let i = 0, s = 0;
    for (const o of t) {
      let r = Math.round(o / e);
      r < 1 && (r = 1);
      const f = e * r, u = Math.abs(1200 * Math.log2(o / f));
      if (u <= this.config.harmonicToleranceCents * 2) {
        const l = 1 - u / (this.config.harmonicToleranceCents * 2);
        i += l, s++;
      }
    }
    if (s === 0) return 0.1;
    const a = i / s, c = Math.min(s / t.length, 1);
    return Math.min(a * this.config.stabilityWeight + c * (1 - this.config.stabilityWeight), 1);
  }
  /**
   * Add frequency detection to history
   */
  addToHistory(e, n, t) {
    const i = Math.min(n, 1);
    let s = 0.5;
    if (this.historyBuffer.length > 0) {
      const c = this.historyBuffer[this.historyBuffer.length - 1].frequency, o = Math.max(e, c) / Math.min(e, c);
      s = Math.max(0, 1 - (o - 1) * 5);
    }
    const a = i * this.config.volumeWeight + s * (1 - this.config.volumeWeight);
    this.historyBuffer.push({
      frequency: e,
      confidence: a,
      timestamp: t,
      volume: n
    }), this.historyBuffer.length > 50 && this.historyBuffer.shift();
  }
  /**
   * Clean old entries from history
   */
  cleanHistory(e) {
    const n = e - this.config.historyWindowMs;
    this.historyBuffer = this.historyBuffer.filter((t) => t.timestamp > n);
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
    const e = this.historyBuffer.map((f) => f.frequency), n = this.historyBuffer.map((f) => f.confidence), t = n.reduce((f, u) => f + u, 0) / n.length, i = Math.min(...e), s = Math.max(...e), a = e.reduce((f, u) => f + u, 0) / e.length, c = e.reduce((f, u) => f + Math.pow(u - a, 2), 0) / e.length, o = Math.sqrt(c) / a, r = Math.max(0, 1 - o);
    return {
      historyLength: this.historyBuffer.length,
      averageConfidence: t,
      frequencyRange: { min: i, max: s },
      stabilityScore: r
    };
  }
  /**
   * Configure correction parameters
   */
  updateConfig(e) {
    this.config = { ...this.config, ...e };
  }
}
const b = {
  EXCELLENT: "excellent",
  GOOD: "good",
  FAIR: "fair",
  POOR: "poor"
};
class D {
  constructor(e = {}) {
    this.analysisBuffer = [], this.config = {
      analysisWindowMs: 3e3,
      stabilityThresholdCents: 20,
      vibratoMinRate: 4.5,
      vibratoMaxRate: 7.5,
      vibratoMinDepthCents: 50,
      breathinessThreshold: 0.3,
      minAnalysisTime: 1e3
    }, this.config = { ...this.config, ...e };
  }
  /**
   * Analyze voice characteristics from audio data
   */
  analyzeVoice(e, n, t, i) {
    const s = Date.now();
    this.addToBuffer(e, n, t, s), this.cleanBuffer(s);
    const a = this.calculateStability(), c = this.detectVibrato(), o = i ? this.analyzeBreathiness(i) : null, r = this.analyzeConsistency(), f = this.calculateOverallQuality(a, c, o, r), u = this.generateRecommendations(
      f,
      a,
      c,
      o,
      r
    );
    return {
      quality: f,
      stability: a,
      recommendations: u
    };
  }
  /**
   * Calculate pitch stability
   */
  calculateStability() {
    if (this.analysisBuffer.length < 10)
      return 0.5;
    const n = this.analysisBuffer.map((o) => o.frequency).filter((o) => o > 0);
    if (n.length < 5)
      return 0.3;
    const t = n.reduce((o, r) => o + r, 0) / n.length, i = n.reduce((o, r) => o + Math.pow(r - t, 2), 0) / n.length, c = Math.sqrt(i) / t * 1200;
    return Math.max(0, Math.min(1, 1 - c / 100));
  }
  /**
   * Detect vibrato characteristics
   */
  detectVibrato() {
    if (this.analysisBuffer.length < 30)
      return { detected: !1, rate: null, depth: null, regularity: null };
    const e = this.analysisBuffer.map((l) => l.frequency).filter((l) => l > 0);
    if (e.length < 20)
      return { detected: !1, rate: null, depth: null, regularity: null };
    const n = this.smoothFrequencies(e, 3), t = this.findExtrema(n);
    if (t.length < 4)
      return { detected: !1, rate: null, depth: null, regularity: null };
    const i = (this.analysisBuffer[this.analysisBuffer.length - 1].timestamp - this.analysisBuffer[0].timestamp) / 1e3, a = t.length / 2 / i, c = [];
    for (let l = 0; l < t.length - 1; l++) {
      const h = n[t[l].index], d = n[t[l + 1].index];
      if (h > 0 && d > 0) {
        const g = Math.abs(1200 * Math.log2(h / d));
        c.push(g);
      }
    }
    const o = c.length > 0 ? c.reduce((l, h) => l + h, 0) / c.length : 0, r = [];
    for (let l = 0; l < t.length - 2; l += 2) {
      const h = t[l + 2].index - t[l].index;
      r.push(h);
    }
    let f = 0;
    if (r.length > 2) {
      const l = r.reduce((d, g) => d + g, 0) / r.length, h = r.reduce((d, g) => d + Math.pow(g - l, 2), 0) / r.length;
      f = Math.max(0, 1 - Math.sqrt(h) / l);
    }
    return {
      detected: a >= this.config.vibratoMinRate && a <= this.config.vibratoMaxRate && o >= this.config.vibratoMinDepthCents,
      rate: a,
      depth: o,
      regularity: f
    };
  }
  /**
   * Analyze breathiness from spectral data
   */
  analyzeBreathiness(e) {
    const n = Math.floor(e.length * 0.1), t = e.slice(Math.floor(e.length * 0.7)), i = e.slice(0, n * 2).reduce((c, o) => c + o * o, 0), s = t.reduce((c, o) => c + o * o, 0);
    if (i === 0) return 1;
    const a = s / i;
    return Math.min(1, a);
  }
  /**
   * Analyze consistency over time
   */
  analyzeConsistency() {
    if (this.analysisBuffer.length < 10) return 0.5;
    const e = this.analysisBuffer.map((s) => s.volume), n = this.analysisBuffer.map((s) => s.clarity), t = this.calculateConsistencyScore(e), i = this.calculateConsistencyScore(n);
    return (t + i) / 2;
  }
  /**
   * Calculate consistency score for an array of values
   */
  calculateConsistencyScore(e) {
    if (e.length < 3) return 0.5;
    const n = e.reduce((s, a) => s + a, 0) / e.length, t = e.reduce((s, a) => s + Math.pow(a - n, 2), 0) / e.length, i = Math.sqrt(t) / (n || 1);
    return Math.max(0, Math.min(1, 1 - i));
  }
  /**
   * Calculate overall voice quality
   */
  calculateOverallQuality(e, n, t, i) {
    const s = {
      stability: 0.4,
      consistency: 0.3,
      breathiness: 0.2,
      vibrato: 0.1
    };
    let a = e * s.stability + i * s.consistency;
    return t !== null ? a += (1 - Math.min(t, 1)) * s.breathiness : a += 0.7 * s.breathiness, n.detected && n.regularity > 0.7 ? a += 0.9 * s.vibrato : n.detected ? a += 0.6 * s.vibrato : a += 0.5 * s.vibrato, a >= 0.85 ? b.EXCELLENT : a >= 0.7 ? b.GOOD : a >= 0.5 ? b.FAIR : b.POOR;
  }
  /**
   * Generate recommendations based on analysis
   */
  generateRecommendations(e, n, t, i, s) {
    const a = [];
    return n < 0.5 ? (a.push("音程の安定性を向上させるため、ゆっくりとした発声練習を行ってください"), a.push("腹式呼吸を意識して、息の流れを一定に保つ練習をしてください")) : n < 0.7 && a.push("音程の微調整練習で、より正確なピッチコントロールを目指しましょう"), s < 0.5 && (a.push("音量と音質の一貫性を保つため、定期的な発声練習を継続してください"), a.push("録音を聞き返して、自分の声の特徴を把握しましょう")), i !== null && i > 0.6 && (a.push("声の息漏れが気になります。発声時の喉の締まりを意識してください"), a.push("ハミング練習で、クリアな声質を目指しましょう")), t.detected ? t.regularity < 0.5 ? a.push("ビブラートの規則性を改善するため、メトロノームに合わせた練習をしてください") : t.rate > 7.5 && a.push("ビブラートの速度が速すぎます。よりゆったりとしたビブラートを練習してください") : (e === b.GOOD || e === b.EXCELLENT) && a.push("美しいビブラートの習得に挑戦してみましょう"), e === b.POOR ? (a.push("基礎的な発声練習から始めることをお勧めします"), a.push("専門的な指導を受けることを検討してください")) : e === b.EXCELLENT && a.push("素晴らしい声質です。この状態を維持する練習を続けてください"), a;
  }
  /**
   * Smooth frequency data using moving average
   */
  smoothFrequencies(e, n) {
    const t = [];
    for (let i = 0; i < e.length; i++) {
      let s = 0, a = 0;
      const c = Math.max(0, i - Math.floor(n / 2)), o = Math.min(e.length, i + Math.floor(n / 2) + 1);
      for (let r = c; r < o; r++)
        s += e[r], a++;
      t.push(s / a);
    }
    return t;
  }
  /**
   * Find local extrema (peaks and valleys) in frequency data
   */
  findExtrema(e) {
    const n = [];
    for (let t = 1; t < e.length - 1; t++) {
      const i = e[t - 1], s = e[t], a = e[t + 1];
      s > i && s > a ? n.push({ index: t, value: s, type: "peak" }) : s < i && s < a && n.push({ index: t, value: s, type: "valley" });
    }
    return n;
  }
  /**
   * Add data to analysis buffer
   */
  addToBuffer(e, n, t, i) {
    this.analysisBuffer.push({ frequency: e, volume: n, clarity: t, timestamp: i }), this.analysisBuffer.length > 200 && this.analysisBuffer.shift();
  }
  /**
   * Clean old data from buffer
   */
  cleanBuffer(e) {
    const n = e - this.config.analysisWindowMs;
    this.analysisBuffer = this.analysisBuffer.filter((t) => t.timestamp > n);
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
    const e = this.analysisBuffer.map((i) => i.volume), n = this.analysisBuffer.map((i) => i.clarity), t = this.analysisBuffer[this.analysisBuffer.length - 1].timestamp - this.analysisBuffer[0].timestamp;
    return {
      entryCount: this.analysisBuffer.length,
      timeSpanMs: t,
      averageVolume: e.reduce((i, s) => i + s, 0) / e.length,
      averageClarity: n.reduce((i, s) => i + s, 0) / n.length
    };
  }
}
class w {
  constructor() {
    this.calibrationData = null, this.isCalibrated = !1, this.calibrationInProgress = !1, this.deviceSpecs = B.getDeviceSpecs();
  }
  /**
   * Perform automatic calibration
   */
  async calibrate(e, n) {
    if (this.calibrationInProgress)
      throw new Error("Calibration already in progress");
    this.calibrationInProgress = !0;
    try {
      console.log("🎛️ [CalibrationSystem] Starting device calibration");
      const t = await this.measureBackgroundNoise(e, n), i = await this.calibrateVolumeLevels(e, n), s = await this.measureFrequencyResponse(e, n), a = this.calculateOptimalSettings(
        t,
        i,
        s
      );
      return this.calibrationData = {
        volumeOffset: i.offset,
        frequencyResponse: s,
        noiseProfile: t,
        optimalSettings: a
      }, this.isCalibrated = !0, this.calibrationInProgress = !1, console.log("✅ [CalibrationSystem] Calibration completed successfully"), {
        success: !0,
        calibrationData: this.calibrationData,
        recommendedSettings: a
      };
    } catch (t) {
      return console.error("❌ [CalibrationSystem] Calibration failed:", t), this.calibrationInProgress = !1, {
        success: !1,
        calibrationData: null,
        recommendedSettings: this.getDefaultSettings(),
        error: t
      };
    }
  }
  /**
   * Measure background noise levels
   */
  async measureBackgroundNoise(e, n, t = 2e3) {
    return new Promise((i) => {
      const s = e.createAnalyser();
      s.fftSize = 2048;
      const a = e.createMediaStreamSource(n);
      a.connect(s);
      const c = s.frequencyBinCount, o = new Float32Array(c), r = [], f = Date.now(), u = () => {
        if (Date.now() - f >= t) {
          const l = {};
          for (let h = 0; h < c; h++) {
            const d = h * e.sampleRate / s.fftSize;
            let g = 0;
            for (const v of r)
              g += v[h];
            l[Math.round(d)] = g / r.length;
          }
          a.disconnect(), i(l);
          return;
        }
        s.getFloatFrequencyData(o), r.push(new Float32Array(o)), setTimeout(u, 100);
      };
      u();
    });
  }
  /**
   * Calibrate volume levels
   */
  async calibrateVolumeLevels(e, n, t = 3e3) {
    return new Promise((i) => {
      const s = e.createAnalyser();
      s.fftSize = 1024;
      const a = e.createMediaStreamSource(n);
      a.connect(s);
      const c = s.fftSize, o = new Float32Array(c), r = [], f = Date.now(), u = () => {
        if (Date.now() - f >= t) {
          r.sort((C, m) => C - m);
          const d = r[0] || 0, g = r[r.length - 1] || 1, p = 0.3 - (r[Math.floor(r.length / 2)] || 0.5);
          a.disconnect(), i({
            offset: p,
            range: { min: d, max: g }
          });
          return;
        }
        s.getFloatTimeDomainData(o);
        let l = 0;
        for (let d = 0; d < c; d++)
          l += o[d] * o[d];
        const h = Math.sqrt(l / c);
        r.push(h), setTimeout(u, 50);
      };
      u();
    });
  }
  /**
   * Measure frequency response (simplified version)
   */
  async measureFrequencyResponse(e, n, t = 5e3) {
    return new Promise((i) => {
      const s = e.createAnalyser();
      s.fftSize = 4096;
      const a = e.createMediaStreamSource(n);
      a.connect(s);
      const c = s.frequencyBinCount, o = new Float32Array(c), r = {}, f = Date.now(), u = () => {
        if (Date.now() - f >= t) {
          const l = {};
          Object.keys(r).forEach((h) => {
            const d = parseInt(h), g = r[d], v = g.reduce((M, p) => M + p, 0) / g.length;
            l[d] = v;
          }), a.disconnect(), i(l);
          return;
        }
        s.getFloatFrequencyData(o);
        for (let l = 0; l < c; l++) {
          const h = Math.round(l * e.sampleRate / s.fftSize);
          h >= 80 && h <= 1e3 && (r[h] || (r[h] = []), r[h].push(o[l]));
        }
        setTimeout(u, 100);
      };
      u();
    });
  }
  /**
   * Calculate optimal settings based on calibration data
   */
  calculateOptimalSettings(e, n, t) {
    const i = this.getDefaultSettings(), s = Math.max(0.5, Math.min(2, 1 - n.offset)), a = i.sensitivity * s, o = Object.keys(e).map((m) => parseInt(m)).filter((m) => m >= 100 && m <= 800).map((m) => e[m]), r = o.length > 0 ? o.reduce((m, y) => m + y, 0) / o.length : -60, f = Math.max(-20, r + 10), u = Math.max(i.noiseGate, Math.abs(f) / 1e3), h = Object.keys(t).map((m) => parseInt(m)).sort((m, y) => m - y).map((m) => t[m]), d = h.slice(0, Math.floor(h.length * 0.3)), g = h.slice(
      Math.floor(h.length * 0.3),
      Math.floor(h.length * 0.7)
    ), v = h.slice(Math.floor(h.length * 0.7)), M = d.reduce((m, y) => m + y, 0) / d.length, p = g.reduce((m, y) => m + y, 0) / g.length, C = v.reduce((m, y) => m + y, 0) / v.length;
    return {
      sensitivity: Math.round(a * 10) / 10,
      noiseGate: Math.round(u * 1e3) / 1e3,
      volumeOffset: n.offset,
      filterSettings: {
        highpassFreq: M < p - 5 ? 100 : 80,
        // Stronger highpass if low freq is weak
        lowpassFreq: C > p + 3 ? 600 : 800,
        // Lower cutoff if high freq is strong
        notchFreq: 60,
        // Standard power line frequency
        highpassQ: 0.7,
        lowpassQ: 0.7,
        notchQ: 10
      },
      deviceAdjustments: {
        lowFreqCompensation: Math.max(0.8, Math.min(1.5, p / (M || -60))),
        highFreqCompensation: Math.max(0.8, Math.min(1.2, p / (C || -60)))
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
  applyCalibration(e) {
    if (!this.isCalibrated || !this.calibrationData)
      return console.warn("⚠️ [CalibrationSystem] No calibration data available"), !1;
    try {
      const n = this.calibrationData.optimalSettings;
      return e.setSensitivity && e.setSensitivity(n.sensitivity), e.setNoiseGate && e.setNoiseGate(n.noiseGate), e.updateFilterSettings && e.updateFilterSettings(n.filterSettings), console.log("✅ [CalibrationSystem] Calibration applied successfully"), !0;
    } catch (n) {
      return console.error("❌ [CalibrationSystem] Failed to apply calibration:", n), !1;
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
    this.isCalibrated = !1, this.calibrationInProgress = !1, this.calibrationData = null, console.log("🔄 [CalibrationSystem] Calibration reset");
  }
  /**
   * Save calibration data to localStorage
   */
  saveCalibration() {
    if (!this.isCalibrated || !this.calibrationData)
      return !1;
    try {
      const e = `pitchpro_calibration_${this.deviceSpecs.deviceType}`, n = {
        deviceSpecs: this.deviceSpecs,
        calibrationData: this.calibrationData,
        timestamp: Date.now()
      };
      return localStorage.setItem(e, JSON.stringify(n)), console.log("💾 [CalibrationSystem] Calibration saved"), !0;
    } catch (e) {
      return console.error("❌ [CalibrationSystem] Failed to save calibration:", e), !1;
    }
  }
  /**
   * Load calibration data from localStorage
   */
  loadCalibration() {
    try {
      const e = `pitchpro_calibration_${this.deviceSpecs.deviceType}`, n = localStorage.getItem(e);
      if (!n)
        return !1;
      const t = JSON.parse(n), i = 7 * 24 * 60 * 60 * 1e3;
      return Date.now() - t.timestamp > i ? (console.log("⏰ [CalibrationSystem] Saved calibration is too old, ignoring"), !1) : t.deviceSpecs.deviceType !== this.deviceSpecs.deviceType ? (console.log("📱 [CalibrationSystem] Device type mismatch, ignoring saved calibration"), !1) : (this.calibrationData = t.calibrationData, this.isCalibrated = !0, console.log("📂 [CalibrationSystem] Calibration loaded successfully"), !0);
    } catch (e) {
      return console.error("❌ [CalibrationSystem] Failed to load calibration:", e), !1;
    }
  }
}
export {
  w as CalibrationSystem,
  F as HarmonicCorrection,
  D as VoiceAnalyzer
};
//# sourceMappingURL=advanced.esm.js.map
