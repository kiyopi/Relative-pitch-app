var qt = Object.defineProperty;
var kt = (u, t, e) => t in u ? qt(u, t, { enumerable: !0, configurable: !0, writable: !0, value: e }) : u[t] = e;
var N = (u, t, e) => kt(u, typeof t != "symbol" ? t + "" : t, e);
const w = class w {
  /**
   * Detect current device and return optimized specifications
   */
  static getDeviceSpecs() {
    if (w.cachedSpecs)
      return w.cachedSpecs;
    if (typeof window > "u" || typeof navigator > "u")
      return w.getDefaultSpecs();
    const t = navigator.userAgent, e = w.analyzeUserAgent(t);
    return w.cachedSpecs = e, console.log("📱 [DeviceDetection] Device analysis:", {
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
    e ? r = "iPhone" : i || s ? r = "iPad" : a && (r = w.detectIOSDeviceType());
    const c = w.getDeviceOptimizations(r, a);
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
          sensitivity: 2,
          // Lower sensitivity for cleaner signal
          noiseGate: 0.018,
          // Slightly higher noise gate
          divisor: 4,
          // Keep original divisor
          gainCompensation: 1.5,
          // Keep original gain compensation
          noiseThreshold: 12,
          // Keep original noise threshold
          smoothingFactor: 0.2
          // Keep original smoothing factor
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
          noiseThreshold: 5,
          // Adjusted noise threshold
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
      noiseThreshold: 5,
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
      deviceSpecs: w.getDeviceSpecs(),
      webAudioSupport: w.supportsWebAudio(),
      mediaDevicesSupport: w.supportsMediaDevices(),
      mediaRecorderSupport: w.supportsMediaRecorder(),
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
    return w.getDeviceSpecs().isIOS || /Android|webOS|BlackBerry|IEMobile|Opera Mini/i.test((navigator == null ? void 0 : navigator.userAgent) || "");
  }
  /**
   * Check if current device is tablet
   */
  static isTablet() {
    if (w.getDeviceSpecs().deviceType === "iPad") return !0;
    const e = (navigator == null ? void 0 : navigator.userAgent) || "";
    return /Android/i.test(e) && !/Mobile/i.test(e);
  }
  /**
   * Check if current device is desktop
   */
  static isDesktop() {
    return !w.isMobile() && !w.isTablet();
  }
  /**
   * Get recommended audio constraints for current device
   */
  static getOptimalAudioConstraints() {
    const t = w.getDeviceSpecs(), e = {
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
    w.cachedSpecs = null;
  }
  /**
   * Get device-specific debugging information
   */
  static getDebugInfo() {
    return {
      ...w.getDeviceCapabilities(),
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
w.cachedSpecs = null;
let at = w;
var z = /* @__PURE__ */ ((u) => (u.AUDIO_CONTEXT_ERROR = "AUDIO_CONTEXT_ERROR", u.MICROPHONE_ACCESS_DENIED = "MICROPHONE_ACCESS_DENIED", u.PITCH_DETECTION_ERROR = "PITCH_DETECTION_ERROR", u.BUFFER_OVERFLOW = "BUFFER_OVERFLOW", u.INVALID_SAMPLE_RATE = "INVALID_SAMPLE_RATE", u.DEVICE_NOT_SUPPORTED = "DEVICE_NOT_SUPPORTED", u.PROCESSING_TIMEOUT = "PROCESSING_TIMEOUT", u))(z || {});
class x extends Error {
  constructor(t, e, i) {
    super(t), this.name = "PitchProError", this.code = e, this.timestamp = /* @__PURE__ */ new Date(), this.context = i, Error.captureStackTrace && Error.captureStackTrace(this, x);
  }
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      timestamp: this.timestamp,
      context: this.context,
      stack: this.stack
    };
  }
}
class $ extends x {
  constructor(t, e) {
    super(t, "AUDIO_CONTEXT_ERROR", e), this.name = "AudioContextError";
  }
}
class Ft extends x {
  constructor(t, e) {
    super(t, "MICROPHONE_ACCESS_DENIED", e), this.name = "MicrophoneAccessError";
  }
}
class Ct extends x {
  constructor(t, e) {
    super(t, "PITCH_DETECTION_ERROR", e), this.name = "PitchDetectionError";
  }
}
function wt(u) {
  return [
    "BUFFER_OVERFLOW",
    "PROCESSING_TIMEOUT",
    "PITCH_DETECTION_ERROR"
    /* PITCH_DETECTION_ERROR */
  ].includes(u.code);
}
class T {
  /**
   * Generates user-friendly error messages with resolution steps
   * 
   * @param error - PitchProError instance
   * @returns Object containing user message and suggested actions
   */
  static getUserFriendlyMessage(t) {
    switch (t.code) {
      case "MICROPHONE_ACCESS_DENIED":
        return {
          title: "マイクアクセスが拒否されました",
          message: "ピッチ検出を行うには、マイクへのアクセス許可が必要です。",
          actions: [
            "ブラウザのアドレスバーにあるマイクアイコンをクリック",
            "「このサイトでマイクを許可する」を選択",
            "ページを再読み込みしてもう一度試す",
            "プライベートブラウジングモードを無効にする（Safariの場合）"
          ],
          severity: "high",
          canRetry: !0
        };
      case "AUDIO_CONTEXT_ERROR":
        return {
          title: "オーディオシステムエラー",
          message: "オーディオの初期化に失敗しました。デバイスの音響設定を確認してください。",
          actions: [
            "他のアプリケーションでマイクが使用中でないか確認",
            "ブラウザを再起動してもう一度試す",
            "システムの音響設定でマイクが有効になっているか確認",
            "外部マイクを使用している場合は接続を確認"
          ],
          severity: "high",
          canRetry: !0
        };
      case "PITCH_DETECTION_ERROR":
        return {
          title: "ピッチ検出エラー",
          message: "音程の検出中に一時的な問題が発生しました。",
          actions: [
            "マイクに向かって明確に歌ってみる",
            "周囲のノイズを減らす",
            "感度設定を調整する",
            "数秒待ってからもう一度試す"
          ],
          severity: "medium",
          canRetry: !0
        };
      case "BUFFER_OVERFLOW":
        return {
          title: "バッファオーバーフロー",
          message: "オーディオデータの処理が追いついていません。",
          actions: [
            "他のタブやアプリケーションを閉じる",
            "ブラウザのハードウェアアクセラレーションを有効にする",
            "より高性能なデバイスを使用する",
            "ページを再読み込みする"
          ],
          severity: "medium",
          canRetry: !0
        };
      case "PROCESSING_TIMEOUT":
        return {
          title: "処理タイムアウト",
          message: "オーディオ処理の応答時間が長すぎます。",
          actions: [
            "デバイスの負荷を減らす（他のアプリを閉じる）",
            "ネットワーク接続を確認する",
            "ブラウザを再起動する",
            "しばらく待ってからもう一度試す"
          ],
          severity: "medium",
          canRetry: !0
        };
      case "INVALID_SAMPLE_RATE":
        return {
          title: "サンプリングレート不適合",
          message: "お使いのデバイスのサンプリングレートがサポートされていません。",
          actions: [
            "システムの音響設定で44.1kHz または 48kHzに設定",
            "外部オーディオインターフェースの設定を確認",
            "デバイスドライバを更新",
            "別のマイクを試す"
          ],
          severity: "high",
          canRetry: !1
        };
      case "DEVICE_NOT_SUPPORTED":
        return {
          title: "デバイス非対応",
          message: "お使いのデバイスまたはブラウザはサポートされていません。",
          actions: [
            "Chrome、Firefox、Safari の最新版を使用",
            "より新しいデバイスを使用",
            "ブラウザの互換性情報を確認",
            "技術サポートにお問い合わせ"
          ],
          severity: "critical",
          canRetry: !1
        };
      default:
        return {
          title: "予期しないエラー",
          message: "システムで予期しない問題が発生しました。",
          actions: [
            "ページを再読み込み",
            "ブラウザを再起動",
            "しばらく時間をおいて再試行",
            "問題が続く場合はサポートへ連絡"
          ],
          severity: "medium",
          canRetry: !0
        };
    }
  }
  /**
   * Generates detailed technical error information for developers
   * 
   * @param error - PitchProError instance
   * @returns Formatted technical error details
   */
  static getTechnicalDetails(t) {
    return {
      errorCode: t.code,
      timestamp: t.timestamp.toISOString(),
      context: t.context || {},
      stackTrace: t.stack,
      diagnosticInfo: {
        userAgent: typeof navigator < "u" ? navigator.userAgent : "unknown",
        timestamp: Date.now(),
        url: typeof window < "u" ? window.location.href : "unknown",
        isRecoverable: wt(t)
      }
    };
  }
  /**
   * Creates formatted console error messages for development
   * 
   * @param error - PitchProError instance
   * @param context - Additional context information
   */
  static logError(t, e) {
    const i = this.getUserFriendlyMessage(t), s = this.getTechnicalDetails(t);
    console.group(`🚨 [PitchPro Error] ${i.title}`), console.log("👤 User Message:", i.message), console.log("📋 Suggested Actions:", i.actions), console.log("⚠️ Severity:", i.severity), console.log("🔄 Can Retry:", i.canRetry), console.log("🔧 Error Code:", s.errorCode), console.log("⏰ Timestamp:", s.timestamp), e && console.log("📍 Context:", e), s.context && Object.keys(s.context).length > 0 && console.log("🔍 Additional Context:", s.context), s.stackTrace && console.log("📜 Stack Trace:", s.stackTrace), console.groupEnd();
  }
  /**
   * Creates recovery suggestions based on error type and context
   * 
   * @param error - PitchProError instance
   * @param deviceType - Device type for specific recommendations
   * @returns Recovery strategy object
   */
  static getRecoveryStrategy(t, e) {
    const i = this.getUserFriendlyMessage(t), s = i.actions.slice(0, 2), n = i.actions.slice(2);
    let o = [];
    return e === "iPhone" || e === "iPad" ? o = [
      "感度を高めに設定（7.0x推奨）",
      "Safari使用を推奨",
      "iOS 14以上で使用",
      "低電力モードを無効にする"
    ] : e === "Android" ? o = [
      "Chrome使用を推奨",
      "バックグラウンドアプリを制限",
      "省電力モードを無効にする",
      "マイク権限を常に許可に設定"
    ] : o = [
      "安定したネットワーク環境で使用",
      "ブラウザを最新版に更新",
      "ハードウェアアクセラレーションを有効化",
      "外部ノイズの少ない環境で使用"
    ], {
      immediate: s,
      fallback: n,
      preventive: o
    };
  }
}
class zt {
  /**
   * Creates a new AudioManager instance with device-optimized configuration
   * 
   * @param config - Optional configuration to override defaults
   * @param config.sampleRate - Audio sample rate in Hz (default: 44100)
   * @param config.channelCount - Number of audio channels (default: 1)
   * @param config.echoCancellation - Enable echo cancellation (default: false)
   * @param config.noiseSuppression - Enable noise suppression (default: false)
   * @param config.autoGainControl - Enable auto gain control (default: false)
   * @param config.latency - Target latency in seconds (default: 0.1)
   * 
   * @example
   * ```typescript
   * // Basic usage with defaults
   * const audioManager = new AudioManager();
   * 
   * // Custom configuration
   * const audioManager = new AudioManager({
   *   sampleRate: 48000,
   *   echoCancellation: true,
   *   latency: 0.05
   * });
   * ```
   */
  constructor(t = {}) {
    this.audioContext = null, this.mediaStream = null, this.sourceNode = null, this.gainNode = null, this.analysers = /* @__PURE__ */ new Map(), this.filters = /* @__PURE__ */ new Map(), this.refCount = 0, this.initPromise = null, this.isInitialized = !1, this.lastError = null, this.gainMonitorInterval = null, this.config = {
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
   * Gets device-specific default sensitivity multiplier
   * 
   * @private
   * @returns Device-optimized sensitivity value (PC: 1.0x, iPhone: 3.0x, iPad: 7.0x)
   */
  _getDefaultSensitivity() {
    const t = at.getDeviceSpecs();
    return console.log(`🔧 [AudioManager] ${t.deviceType} detected - setting default sensitivity ${t.sensitivity}x`), t.sensitivity;
  }
  /**
   * Initializes audio resources including AudioContext and MediaStream
   * 
   * @description Safe to call multiple times - uses reference counting and health checks.
   * Automatically handles browser-specific quirks and device optimization.
   * 
   * @returns Promise resolving to audio resources
   * @throws {Error} If microphone permission is denied or AudioContext creation fails
   * 
   * @example
   * ```typescript
   * try {
   *   const { audioContext, mediaStream, sourceNode } = await audioManager.initialize();
   *   console.log('Audio initialized:', audioContext.state);
   * } catch (error) {
   *   console.error('Failed to initialize audio:', error.message);
   * }
   * ```
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
        trackStates: (i = this.mediaStream) == null ? void 0 : i.getTracks().map((n) => ({
          kind: n.kind,
          readyState: n.readyState,
          enabled: n.enabled,
          muted: n.muted
        }))
      }), this._cleanup(), this.isInitialized = !1, this.refCount = 0, await new Promise((n) => setTimeout(n, 100)), console.log("🔄 [AudioManager] Cleanup complete - starting re-initialization");
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
   * Performs the actual initialization process
   * 
   * @private
   * @returns Promise resolving to initialized audio resources
   * @throws {Error} If any step of initialization fails
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
            // HOTFIX: Enhanced AGC disable for all platforms to prevent level drop
            ...window.chrome && {
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
              googBeamforming: !1
              // Beamforming disable
            },
            // Mozilla-specific constraints
            ...navigator.userAgent.includes("Firefox") && {
              mozAutoGainControl: !1,
              // Mozilla AGC disable
              mozNoiseSuppression: !1
              // Mozilla noise suppression disable
            },
            // Safari compatibility: Explicit quality settings  
            sampleRate: this.config.sampleRate,
            channelCount: this.config.channelCount,
            sampleSize: 16,
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
      return this.gainNode || (this.gainNode = this.audioContext.createGain(), this.gainNode.gain.setValueAtTime(this.currentSensitivity, this.audioContext.currentTime), this.sourceNode.connect(this.gainNode), console.log(`✅ [AudioManager] GainNode creation complete (sensitivity: ${this.currentSensitivity}x)`), this.startGainMonitoring()), this.isInitialized = !0, this.refCount++, this.lastError = null, console.log(`🎤 [AudioManager] Initialization complete (refCount: ${this.refCount})`), {
        audioContext: this.audioContext,
        mediaStream: this.mediaStream,
        sourceNode: this.sourceNode
      };
    } catch (t) {
      const e = this._createStructuredError(t, "initialization");
      throw T.logError(e, "AudioManager initialization"), this.lastError = e, this.isInitialized = !1, this._cleanup(), e;
    }
  }
  /**
   * Create dedicated AnalyserNode
   * @param id - Analyser identifier
   * @param options - Option settings
   */
  createAnalyser(t, e = {}) {
    if (!this.isInitialized || !this.audioContext || !this.sourceNode) {
      const l = new $(
        "AudioManagerが初期化されていません。initialize()メソッドを最初に呼び出してください。",
        {
          operation: "createAnalyser",
          analyserId: t,
          currentState: {
            isInitialized: this.isInitialized,
            hasAudioContext: !!this.audioContext,
            hasSourceNode: !!this.sourceNode
          }
        }
      );
      throw T.logError(l, "Analyser creation"), l;
    }
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
      const l = this._createFilterChain();
      this.filters.set(t, l), c.connect(l.highpass), l.highpass.connect(l.lowpass), l.lowpass.connect(l.notch), l.notch.connect(r), console.log(`🔧 [AudioManager] Filtered Analyser created: ${t}`);
    } else
      c.connect(r), console.log(`🔧 [AudioManager] Raw signal Analyser created: ${t}`);
    return this.analysers.set(t, r), r;
  }
  /**
   * Create 3-stage noise reduction filter chain
   */
  _createFilterChain() {
    if (!this.audioContext) {
      const s = new $(
        "AudioContextが利用できません。ブラウザでオーディオ機能が無効になっているか、デバイスがサポートされていません。",
        {
          operation: "_createFilterChain",
          audioContextState: "null"
        }
      );
      throw T.logError(s, "Filter chain creation"), s;
    }
    const t = this.audioContext.createBiquadFilter();
    t.type = "highpass", t.frequency.setValueAtTime(80, this.audioContext.currentTime), t.Q.setValueAtTime(0.7, this.audioContext.currentTime);
    const e = this.audioContext.createBiquadFilter();
    e.type = "lowpass", e.frequency.setValueAtTime(800, this.audioContext.currentTime), e.Q.setValueAtTime(0.7, this.audioContext.currentTime);
    const i = this.audioContext.createBiquadFilter();
    return i.type = "notch", i.frequency.setValueAtTime(60, this.audioContext.currentTime), i.Q.setValueAtTime(10, this.audioContext.currentTime), { highpass: t, lowpass: e, notch: i };
  }
  /**
   * Removes a specific analyser and its associated filter chain
   * 
   * @param id - Unique identifier for the analyser to remove
   * 
   * @example
   * ```typescript
   * audioManager.removeAnalyser('pitch-detection');
   * ```
   */
  removeAnalyser(t) {
    if (this.analysers.has(t) && (this.analysers.get(t).disconnect(), this.analysers.delete(t), console.log(`🗑️ [AudioManager] Analyser removed: ${t}`)), this.filters.has(t)) {
      const e = this.filters.get(t);
      e.highpass.disconnect(), e.lowpass.disconnect(), e.notch.disconnect(), this.filters.delete(t), console.log(`🗑️ [AudioManager] Filter chain removed: ${t}`);
    }
  }
  /**
   * Adjusts microphone sensitivity with automatic gain monitoring
   * 
   * @param sensitivity - Sensitivity multiplier (0.1 ~ 10.0)
   * - 0.1-1.0: Reduced sensitivity for loud environments
   * - 1.0: Standard sensitivity (PC default)
   * - 3.0: iPhone optimized sensitivity
   * - 7.0: iPad optimized sensitivity
   * - 10.0: Maximum sensitivity for quiet environments
   * 
   * @example
   * ```typescript
   * // Set sensitivity for iPad
   * audioManager.setSensitivity(7.0);
   * 
   * // Reduce for loud environment
   * audioManager.setSensitivity(0.5);
   * ```
   */
  setSensitivity(t) {
    var i;
    const e = Math.max(0.1, Math.min(10, t));
    this.gainNode ? (this.gainNode.gain.setValueAtTime(e, ((i = this.audioContext) == null ? void 0 : i.currentTime) || 0), this.currentSensitivity = e, setTimeout(() => {
      var s;
      if (this.gainNode && Math.abs(this.gainNode.gain.value - e) > 0.1) {
        const n = new x(
          `ゲイン値のドリフトが検出されました。期待値: ${e}, 実際値: ${this.gainNode.gain.value}`,
          z.AUDIO_CONTEXT_ERROR,
          {
            operation: "setSensitivity_verification",
            expectedGain: e,
            actualGain: this.gainNode.gain.value,
            driftAmount: Math.abs(this.gainNode.gain.value - e)
          }
        );
        T.logError(n, "Gain drift detection"), this.gainNode.gain.setValueAtTime(e, ((s = this.audioContext) == null ? void 0 : s.currentTime) || 0);
      }
    }, 100), console.log(`🎤 [AudioManager] Microphone sensitivity updated: ${e.toFixed(1)}x`)) : (this.currentSensitivity = e, console.log(`🎤 [AudioManager] Microphone sensitivity set (awaiting initialization): ${e.toFixed(1)}x`));
  }
  /**
   * Get current microphone sensitivity
   */
  getSensitivity() {
    return this.currentSensitivity;
  }
  /**
   * HOTFIX: Start gain monitoring to prevent level drops
   */
  startGainMonitoring() {
    this.gainMonitorInterval && clearInterval(this.gainMonitorInterval), this.gainMonitorInterval = window.setInterval(() => {
      if (this.gainNode && this.audioContext) {
        const t = this.gainNode.gain.value, e = this.currentSensitivity;
        if (Math.abs(t - e) > e * 0.1) {
          const i = new x(
            `ゲインモニタリングでドリフト検出: 期待値 ${e}, 現在値 ${t}`,
            z.AUDIO_CONTEXT_ERROR,
            {
              operation: "gainMonitoring",
              expectedGain: e,
              currentGain: t,
              driftPercentage: (Math.abs(t - e) / e * 100).toFixed(1)
            }
          );
          T.logError(i, "Automatic gain monitoring"), this.gainNode.gain.setValueAtTime(e, this.audioContext.currentTime), console.log(`🔧 [AudioManager] Gain reset to: ${e}`);
        }
      }
    }, 2e3);
  }
  /**
   * HOTFIX: Stop gain monitoring
   */
  stopGainMonitoring() {
    this.gainMonitorInterval && (clearInterval(this.gainMonitorInterval), this.gainMonitorInterval = null);
  }
  /**
   * Get platform-specific settings according to specification
   * Complies with MICROPHONE_PLATFORM_SPECIFICATIONS.md
   */
  getPlatformSpecs() {
    const t = at.getDeviceSpecs();
    return {
      ...t,
      sensitivity: this.currentSensitivity || t.sensitivity
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
    var t;
    console.log("🧹 [AudioManager] Starting cleanup"), this.stopGainMonitoring();
    for (const e of this.analysers.keys())
      this.removeAnalyser(e);
    if (this.mediaStream) {
      const e = this.mediaStream.getTracks();
      console.log(`🛑 [AudioManager] Stopping MediaStream: ${e.length} tracks`), e.forEach((i, s) => {
        try {
          i.readyState !== "ended" ? (i.stop(), console.log(`🛑 [AudioManager] Track ${s} stop complete`)) : console.log(`⚠️ [AudioManager] Track ${s} already ended`);
        } catch (n) {
          const o = new x(
            `メディアトラック ${s} の停止中にエラーが発生しました: ${n.message}`,
            z.AUDIO_CONTEXT_ERROR,
            {
              operation: "track_cleanup",
              trackIndex: s,
              originalError: n.message,
              trackState: i.readyState
            }
          );
          T.logError(o, "Media track cleanup");
        }
      }), this.mediaStream = null;
    }
    if (this.audioContext && this.audioContext.state !== "closed") {
      try {
        this.audioContext.close(), console.log("🛑 [AudioManager] AudioContext close complete");
      } catch (e) {
        const i = new $(
          `AudioContextの終了中にエラーが発生しました: ${e.message}`,
          {
            operation: "audioContext_cleanup",
            contextState: (t = this.audioContext) == null ? void 0 : t.state,
            originalError: e.message
          }
        );
        T.logError(i, "AudioContext cleanup");
      }
      this.audioContext = null;
    }
    this.gainNode && (this.gainNode.disconnect(), this.gainNode = null), this.sourceNode && (this.sourceNode.disconnect(), this.sourceNode = null), this.isInitialized = !1, this.refCount = 0, this.initPromise = null, this.currentSensitivity = this._getDefaultSensitivity(), console.log("✅ [AudioManager] Cleanup complete");
  }
  /**
   * Creates structured error with enhanced context information
   * 
   * @private
   * @param error - Original error
   * @param operation - Operation that failed
   * @returns Structured PitchProError with context
   */
  _createStructuredError(t, e) {
    var i, s;
    return t.message.includes("Permission denied") || t.message.includes("NotAllowedError") || t.message.includes("permission") ? new Ft(
      "マイクへのアクセス許可が拒否されました。ブラウザの設定でマイクアクセスを許可してください。",
      {
        operation: e,
        originalError: t.message,
        deviceSpecs: this.getPlatformSpecs(),
        userAgent: typeof navigator < "u" ? navigator.userAgent : "unknown"
      }
    ) : t.message.includes("AudioContext") || t.message.includes("audio") || t.message.includes("context") ? new $(
      "オーディオシステムの初期化に失敗しました。デバイスの音響設定を確認するか、ブラウザを再起動してください。",
      {
        operation: e,
        originalError: t.message,
        audioContextState: ((i = this.audioContext) == null ? void 0 : i.state) || "none",
        sampleRate: ((s = this.audioContext) == null ? void 0 : s.sampleRate) || "unknown",
        deviceSpecs: this.getPlatformSpecs()
      }
    ) : new x(
      `${e}中に予期しないエラーが発生しました: ${t.message}`,
      z.AUDIO_CONTEXT_ERROR,
      {
        operation: e,
        originalError: t.message,
        stack: t.stack,
        currentState: {
          isInitialized: this.isInitialized,
          refCount: this.refCount,
          hasResources: !!(this.audioContext && this.mediaStream && this.sourceNode)
        }
      }
    );
  }
  /**
   * Gets current AudioManager status for debugging and monitoring
   * 
   * @returns Status object containing initialization state, reference count, and resource states
   * 
   * @example
   * ```typescript
   * const status = audioManager.getStatus();
   * console.log('AudioManager Status:', status);
   * console.log('Active analysers:', status.activeAnalysers);
   * ```
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
   * Performs comprehensive health check on MediaStream and tracks
   * 
   * @returns Health status object with detailed track information
   * 
   * @example
   * ```typescript
   * const health = audioManager.checkMediaStreamHealth();
   * if (!health.healthy) {
   *   console.warn('MediaStream health issue detected:', health);
   *   // Perform recovery actions
   * }
   * ```
   */
  checkMediaStreamHealth() {
    var s, n, o, a, r, c, l, m, d;
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
    const e = t.find((h) => h.kind === "audio");
    if (!e)
      return {
        mediaStreamActive: this.mediaStream.active,
        audioContextState: ((a = this.audioContext) == null ? void 0 : a.state) || "none",
        trackStates: t.map((h) => ({
          kind: h.kind,
          enabled: h.enabled,
          readyState: h.readyState,
          muted: h.muted
        })),
        healthy: !1
      };
    const i = t.map((h) => ({
      kind: h.kind,
      enabled: h.enabled,
      readyState: h.readyState,
      muted: h.muted
    }));
    return e.readyState === "ended" ? {
      mediaStreamActive: this.mediaStream.active,
      audioContextState: ((r = this.audioContext) == null ? void 0 : r.state) || "none",
      trackStates: i,
      healthy: !1
    } : e.enabled ? e.muted ? {
      mediaStreamActive: this.mediaStream.active,
      audioContextState: ((l = this.audioContext) == null ? void 0 : l.state) || "none",
      trackStates: i,
      healthy: !1
    } : this.mediaStream.active && e.readyState !== "live" ? {
      mediaStreamActive: this.mediaStream.active,
      audioContextState: ((m = this.audioContext) == null ? void 0 : m.state) || "none",
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
function Ot(u) {
  return u && u.__esModule && Object.prototype.hasOwnProperty.call(u, "default") ? u.default : u;
}
function D(u) {
  if (this.size = u | 0, this.size <= 1 || this.size & this.size - 1)
    throw new Error("FFT size must be a power of two and bigger than 1");
  this._csize = u << 1;
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
var $t = D;
D.prototype.fromComplexArray = function(t, e) {
  for (var i = e || new Array(t.length >>> 1), s = 0; s < t.length; s += 2)
    i[s >>> 1] = t[s];
  return i;
};
D.prototype.createComplexArray = function() {
  const t = new Array(this._csize);
  for (var e = 0; e < t.length; e++)
    t[e] = 0;
  return t;
};
D.prototype.toComplexArray = function(t, e) {
  for (var i = e || this.createComplexArray(), s = 0; s < i.length; s += 2)
    i[s] = t[s >>> 1], i[s + 1] = 0;
  return i;
};
D.prototype.completeSpectrum = function(t) {
  for (var e = this._csize, i = e >>> 1, s = 2; s < i; s += 2)
    t[e - s] = t[s], t[e - s + 1] = -t[s + 1];
};
D.prototype.transform = function(t, e) {
  if (t === e)
    throw new Error("Input and output buffers must be different");
  this._out = t, this._data = e, this._inv = 0, this._transform4(), this._out = null, this._data = null;
};
D.prototype.realTransform = function(t, e) {
  if (t === e)
    throw new Error("Input and output buffers must be different");
  this._out = t, this._data = e, this._inv = 0, this._realTransform4(), this._out = null, this._data = null;
};
D.prototype.inverseTransform = function(t, e) {
  if (t === e)
    throw new Error("Input and output buffers must be different");
  this._out = t, this._data = e, this._inv = 1, this._transform4();
  for (var i = 0; i < t.length; i++)
    t[i] /= this.size;
  this._out = null, this._data = null;
};
D.prototype._transform4 = function() {
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
  var c = this._inv ? -1 : 1, l = this.table;
  for (s >>= 2; s >= 2; s >>= 2) {
    n = e / s << 1;
    var m = n >>> 2;
    for (o = 0; o < e; o += n)
      for (var d = o + m, h = o, f = 0; h < d; h += 2, f += s) {
        const g = h, p = g + m, y = p + m, C = y + m, F = t[g], v = t[g + 1], b = t[p], I = t[p + 1], P = t[y], _ = t[y + 1], q = t[C], S = t[C + 1], A = F, k = v, B = l[f], V = c * l[f + 1], L = b * B - I * V, H = b * V + I * B, W = l[2 * f], X = c * l[2 * f + 1], J = P * W - _ * X, K = P * X + _ * W, Y = l[3 * f], Z = c * l[3 * f + 1], tt = q * Y - S * Z, et = q * Z + S * Y, it = A + J, G = k + K, j = A - J, st = k - K, nt = L + tt, Q = H + et, U = c * (L - tt), ot = c * (H - et), ct = it + nt, ht = G + Q, ut = it - nt, dt = G - Q, ft = j + ot, mt = st - U, gt = j - ot, pt = st + U;
        t[g] = ct, t[g + 1] = ht, t[p] = ft, t[p + 1] = mt, t[y] = ut, t[y + 1] = dt, t[C] = gt, t[C + 1] = pt;
      }
  }
};
D.prototype._singleTransform2 = function(t, e, i) {
  const s = this._out, n = this._data, o = n[e], a = n[e + 1], r = n[e + i], c = n[e + i + 1], l = o + r, m = a + c, d = o - r, h = a - c;
  s[t] = l, s[t + 1] = m, s[t + 2] = d, s[t + 3] = h;
};
D.prototype._singleTransform4 = function(t, e, i) {
  const s = this._out, n = this._data, o = this._inv ? -1 : 1, a = i * 2, r = i * 3, c = n[e], l = n[e + 1], m = n[e + i], d = n[e + i + 1], h = n[e + a], f = n[e + a + 1], g = n[e + r], p = n[e + r + 1], y = c + h, C = l + f, F = c - h, v = l - f, b = m + g, I = d + p, P = o * (m - g), _ = o * (d - p), q = y + b, S = C + I, A = F + _, k = v - P, B = y - b, V = C - I, L = F - _, H = v + P;
  s[t] = q, s[t + 1] = S, s[t + 2] = A, s[t + 3] = k, s[t + 4] = B, s[t + 5] = V, s[t + 6] = L, s[t + 7] = H;
};
D.prototype._realTransform4 = function() {
  var t = this._out, e = this._csize, i = this._width, s = 1 << i, n = e / s << 1, o, a, r = this._bitrev;
  if (n === 4)
    for (o = 0, a = 0; o < e; o += n, a++) {
      const yt = r[a];
      this._singleRealTransform2(o, yt >>> 1, s >>> 1);
    }
  else
    for (o = 0, a = 0; o < e; o += n, a++) {
      const yt = r[a];
      this._singleRealTransform4(o, yt >>> 1, s >>> 1);
    }
  var c = this._inv ? -1 : 1, l = this.table;
  for (s >>= 2; s >= 2; s >>= 2) {
    n = e / s << 1;
    var m = n >>> 1, d = m >>> 1, h = d >>> 1;
    for (o = 0; o < e; o += n)
      for (var f = 0, g = 0; f <= h; f += 2, g += s) {
        var p = o + f, y = p + d, C = y + d, F = C + d, v = t[p], b = t[p + 1], I = t[y], P = t[y + 1], _ = t[C], q = t[C + 1], S = t[F], A = t[F + 1], k = v, B = b, V = l[g], L = c * l[g + 1], H = I * V - P * L, W = I * L + P * V, X = l[2 * g], J = c * l[2 * g + 1], K = _ * X - q * J, Y = _ * J + q * X, Z = l[3 * g], tt = c * l[3 * g + 1], et = S * Z - A * tt, it = S * tt + A * Z, G = k + K, j = B + Y, st = k - K, nt = B - Y, Q = H + et, U = W + it, ot = c * (H - et), ct = c * (W - it), ht = G + Q, ut = j + U, dt = st + ct, ft = nt - ot;
        if (t[p] = ht, t[p + 1] = ut, t[y] = dt, t[y + 1] = ft, f === 0) {
          var mt = G - Q, gt = j - U;
          t[C] = mt, t[C + 1] = gt;
          continue;
        }
        if (f !== h) {
          var pt = st, bt = -nt, At = G, Tt = -j, Et = -c * ct, xt = -c * ot, Dt = -c * U, It = -c * Q, Nt = pt + Et, Rt = bt + xt, Pt = At + It, _t = Tt - Dt, vt = o + d - f, St = o + m - f;
          t[vt] = Nt, t[vt + 1] = Rt, t[St] = Pt, t[St + 1] = _t;
        }
      }
  }
};
D.prototype._singleRealTransform2 = function(t, e, i) {
  const s = this._out, n = this._data, o = n[e], a = n[e + i], r = o + a, c = o - a;
  s[t] = r, s[t + 1] = 0, s[t + 2] = c, s[t + 3] = 0;
};
D.prototype._singleRealTransform4 = function(t, e, i) {
  const s = this._out, n = this._data, o = this._inv ? -1 : 1, a = i * 2, r = i * 3, c = n[e], l = n[e + i], m = n[e + a], d = n[e + r], h = c + m, f = c - m, g = l + d, p = o * (l - d), y = h + g, C = f, F = -p, v = h - g, b = f, I = p;
  s[t] = y, s[t + 1] = 0, s[t + 2] = C, s[t + 3] = F, s[t + 4] = v, s[t + 5] = 0, s[t + 6] = b, s[t + 7] = I;
};
const Bt = /* @__PURE__ */ Ot($t);
class rt {
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
    N(this, "_inputLength");
    /** @private @type {FFT} */
    N(this, "_fft");
    /** @private @type {(size: number) => T} */
    N(this, "_bufferSupplier");
    /** @private @type {T} */
    N(this, "_paddedInputBuffer");
    /** @private @type {T} */
    N(this, "_transformBuffer");
    /** @private @type {T} */
    N(this, "_inverseBuffer");
    if (t < 1)
      throw new Error("Input length must be at least one");
    this._inputLength = t, this._fft = new Bt(Gt(2 * t)), this._bufferSupplier = e, this._paddedInputBuffer = this._bufferSupplier(this._fft.size), this._transformBuffer = this._bufferSupplier(2 * this._fft.size), this._inverseBuffer = this._bufferSupplier(2 * this._fft.size);
  }
  /**
   * A helper method to create an {@link Autocorrelator} using
   * {@link Float32Array} buffers.
   *
   * @param inputLength {number} the input array length to support
   * @returns {Autocorrelator<Float32Array>}
   */
  static forFloat32Array(t) {
    return new rt(
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
    return new rt(
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
    return new rt(t, (e) => Array(e));
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
function Vt(u) {
  const t = [];
  let e = !1, i = -1 / 0, s = -1;
  for (let n = 1; n < u.length - 1; n++)
    u[n - 1] <= 0 && u[n] > 0 ? (e = !0, s = n, i = u[n]) : u[n - 1] > 0 && u[n] <= 0 ? (e = !1, s !== -1 && t.push(s)) : e && u[n] > i && (i = u[n], s = n);
  return t;
}
function Lt(u, t) {
  const [e, i, s] = [u - 1, u, u + 1], [n, o, a] = [t[e], t[i], t[s]], r = n / 2 - o + a / 2, c = -(n / 2) * (i + s) + o * (e + s) - a / 2 * (e + i), l = n * i * s / 2 - o * e * s + a * e * i / 2, m = -c / (2 * r), d = r * m * m + c * m + l;
  return [m, d];
}
let Ht = class lt {
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
    N(this, "_autocorrelator");
    /** @private @type {T} */
    N(this, "_nsdfBuffer");
    /** @private @type {number} */
    N(this, "_clarityThreshold", 0.9);
    /** @private @type {number} */
    N(this, "_minVolumeAbsolute", 0);
    /** @private @type {number} */
    N(this, "_maxInputAmplitude", 1);
    this._autocorrelator = new rt(t, e), this._nsdfBuffer = e(t);
  }
  /**
   * A helper method to create an {@link PitchDetector} using {@link Float32Array} buffers.
   *
   * @param inputLength {number} the input array length to support
   * @returns {PitchDetector<Float32Array>}
   */
  static forFloat32Array(t) {
    return new lt(t, (e) => new Float32Array(e));
  }
  /**
   * A helper method to create an {@link PitchDetector} using {@link Float64Array} buffers.
   *
   * @param inputLength {number} the input array length to support
   * @returns {PitchDetector<Float64Array>}
   */
  static forFloat64Array(t) {
    return new lt(t, (e) => new Float64Array(e));
  }
  /**
   * A helper method to create an {@link PitchDetector} using `number[]` buffers.
   *
   * @param inputLength {number} the input array length to support
   * @returns {PitchDetector<number[]>}
   */
  static forNumberArray(t) {
    return new lt(t, (e) => Array(e));
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
    const i = Vt(this._nsdfBuffer);
    if (i.length === 0)
      return [0, 0];
    const s = Math.max(...i.map((r) => this._nsdfBuffer[r])), n = i.find(
      (r) => this._nsdfBuffer[r] >= this._clarityThreshold * s
    ), [o, a] = Lt(
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
function Gt(u) {
  return u--, u |= u >> 1, u |= u >> 2, u |= u >> 4, u |= u >> 8, u |= u >> 16, u++, u;
}
class jt {
  // 推奨45FPS（22ms、音楽演奏に適切）
  constructor(t = 45) {
    this.lastFrameTime = 0, this.nextFrameTime = 0, this.frameDrops = 0, this.MIN_FPS = 30, this.MAX_FPS = 60, this.OPTIMAL_FPS = 45, this.targetFPS = Math.max(this.MIN_FPS, Math.min(t, this.MAX_FPS)), this.frameInterval = 1e3 / this.targetFPS;
  }
  shouldProcess() {
    const t = performance.now();
    return this.nextFrameTime === 0 ? (this.nextFrameTime = t + this.frameInterval, this.lastFrameTime = t, !0) : t >= this.nextFrameTime ? (t - this.lastFrameTime > this.frameInterval * 1.5 && (this.frameDrops++, this.adjustFrameRate()), this.nextFrameTime = t + this.frameInterval, this.lastFrameTime = t, !0) : !1;
  }
  // CPU負荷に応じて動的にFPSを調整
  adjustFrameRate() {
    if (this.frameDrops > 5 && this.targetFPS > this.MIN_FPS) {
      this.targetFPS = Math.max(this.MIN_FPS, this.targetFPS - 5), this.frameInterval = 1e3 / this.targetFPS, this.frameDrops = 0;
      const t = performance.now();
      this.nextFrameTime = t + this.frameInterval, console.log(`Adjusted FPS to ${this.targetFPS} due to high load`);
    }
  }
  // パフォーマンス回復時にFPSを戻す
  recoverPerformance() {
    if (this.frameDrops === 0 && this.targetFPS < this.OPTIMAL_FPS) {
      this.targetFPS = Math.min(this.OPTIMAL_FPS, this.targetFPS + 5), this.frameInterval = 1e3 / this.targetFPS;
      const t = performance.now();
      this.nextFrameTime = t + this.frameInterval;
    }
  }
  reset() {
    this.lastFrameTime = 0, this.nextFrameTime = 0, this.frameDrops = 0, this.targetFPS = this.OPTIMAL_FPS, this.frameInterval = 1e3 / this.targetFPS;
  }
  getStats() {
    return {
      currentFPS: this.targetFPS,
      frameDrops: this.frameDrops,
      latency: this.frameInterval
    };
  }
}
class Xt {
  /**
   * Creates a new PitchDetector instance with optimized configuration
   * 
   * @param audioManager - AudioManager instance for resource management
   * @param config - Optional configuration to override defaults
   * @param config.fftSize - FFT size for frequency analysis (default: 4096)
   * @param config.smoothing - Smoothing factor for AnalyserNode (default: 0.1)
   * @param config.clarityThreshold - Minimum clarity for valid detection (default: 0.4)
   * @param config.minVolumeAbsolute - Minimum volume threshold (default: 0.003)
   * @param config.silenceDetection - Optional silence detection configuration
   * 
   * @example
   * ```typescript
   * // Basic usage
   * const pitchDetector = new PitchDetector(audioManager);
   * 
   * // Custom configuration
   * const pitchDetector = new PitchDetector(audioManager, {
   *   fftSize: 8192,
   *   clarityThreshold: 0.6,
   *   silenceDetection: {
   *     enabled: true,
   *     warningThreshold: 10000
   *   }
   * });
   * ```
   */
  constructor(t, e = {}) {
    this.pitchDetector = null, this.analyser = null, this.rawAnalyser = null, this.animationFrame = null, this.componentState = "uninitialized", this.isInitialized = !1, this.isDetecting = !1, this.lastError = null, this.analyserIds = [], this.currentVolume = 0, this.rawVolume = 0, this.currentFrequency = 0, this.detectedNote = "--", this.detectedOctave = null, this.pitchClarity = 0, this.volumeHistory = [0, 0, 0, 0, 0], this.stableVolume = 0, this.previousFrequency = 0, this.harmonicHistory = [], this.disableHarmonicCorrection = !1, this.callbacks = {}, this.deviceSpecs = null, this.silenceStartTime = null, this.silenceWarningTimer = null, this.silenceTimeoutTimer = null, this.isSilent = !1, this.hasWarned = !1, this.audioManager = t, this.config = {
      fftSize: 4096,
      smoothing: 0.1,
      clarityThreshold: 0.4,
      // 0.8から0.4に現実的な値に変更
      minVolumeAbsolute: 3e-3,
      // 0.01から0.003に現実的な値に変更
      ...e
    }, this.silenceDetectionConfig = {
      enabled: !1,
      warningThreshold: 15e3,
      // 15秒で警告
      timeoutThreshold: 3e4,
      // 30秒でタイムアウト
      minVolumeThreshold: 0.01,
      // 消音判定の音量閾値
      ...e.silenceDetection
    }, this.frameRateLimiter = new jt(45);
  }
  /**
   * Sets callback functions for pitch detection events
   * 
   * @param callbacks - Object containing callback functions
   * @param callbacks.onPitchUpdate - Called when pitch is detected
   * @param callbacks.onError - Called when errors occur
   * @param callbacks.onStateChange - Called when component state changes
   * 
   * @example
   * ```typescript
   * pitchDetector.setCallbacks({
   *   onPitchUpdate: (result) => {
   *     console.log(`Pitch: ${result.frequency}Hz, Note: ${result.note}`);
   *   },
   *   onError: (error) => {
   *     console.error('Detection error:', error.message);
   *   },
   *   onStateChange: (state) => {
   *     console.log('State changed to:', state);
   *   }
   * });
   * ```
   */
  setCallbacks(t) {
    this.callbacks = { ...this.callbacks, ...t };
  }
  /**
   * Initializes the pitch detector with audio resources and Pitchy engine
   * 
   * @description Sets up audio analysers, creates Pitchy detector instance, and initializes
   * device-specific configurations. Must be called before starting detection.
   * 
   * @returns Promise that resolves when initialization is complete
   * @throws {AudioContextError} If AudioManager initialization fails
   * @throws {PitchDetectionError} If Pitchy detector creation fails
   * 
   * @example
   * ```typescript
   * try {
   *   await pitchDetector.initialize();
   *   console.log('Pitch detector ready');
   * } catch (error) {
   *   console.error('Initialization failed:', error);
   * }
   * ```
   */
  async initialize() {
    var t, e, i, s;
    try {
      this.componentState = "initializing", this.lastError = null, console.log("🎙️ [PitchDetector] Starting initialization via AudioManager"), await this.audioManager.initialize(), this.deviceSpecs = this.audioManager.getPlatformSpecs(), console.log("📱 [PitchDetector] Device specs initialized:", this.deviceSpecs.deviceType), console.log("✅ [PitchDetector] AudioManager resources acquired");
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
      }), this.analyserIds.push(o), console.log("✅ [PitchDetector] Analysers created:", this.analyserIds), this.pitchDetector = Ht.forFloat32Array(this.analyser.fftSize), console.log(`[Debug] Pitchyインスタンス作成: ${!!this.pitchDetector}, FFTサイズ: ${this.analyser.fftSize}`), this.componentState = "ready", this.isInitialized = !0, (e = (t = this.callbacks).onStateChange) == null || e.call(t, this.componentState), console.log("✅ [PitchDetector] Initialization complete");
    } catch (n) {
      const o = n instanceof x ? n : new $(
        "PitchDetector initialization failed",
        {
          originalError: n instanceof Error ? n.message : String(n),
          audioContextState: this.audioManager.getStatus().audioContextState,
          deviceSpecs: this.deviceSpecs
        }
      );
      throw console.error("❌ [PitchDetector] Initialization error:", o.toJSON()), this.componentState = "error", this.lastError = o, this.isInitialized = !1, (s = (i = this.callbacks).onError) == null || s.call(i, o), n;
    }
  }
  /**
   * Starts real-time pitch detection with adaptive frame rate control
   * 
   * @description Begins the pitch detection loop using requestAnimationFrame.
   * Automatically manages performance optimization and device-specific adjustments.
   * 
   * @returns True if detection started successfully, false otherwise
   * 
   * @example
   * ```typescript
   * if (pitchDetector.startDetection()) {
   *   console.log('Pitch detection started');
   * } else {
   *   console.error('Failed to start detection');
   * }
   * ```
   */
  startDetection() {
    var t, e, i, s, n, o;
    if (this.componentState !== "ready") {
      const a = new Error(`Cannot start detection: component state is ${this.componentState}`);
      return (e = (t = this.callbacks).onError) == null || e.call(t, a), !1;
    }
    if (!this.analyser || !this.pitchDetector) {
      const a = new Ct(
        "ピッチ検出に必要なコンポーネントが初期化されていません。initialize()メソッドを先に呼び出してください。",
        {
          operation: "startDetection",
          hasAnalyser: !!this.analyser,
          hasPitchDetector: !!this.pitchDetector,
          componentState: this.componentState,
          isInitialized: this.isInitialized
        }
      );
      return T.logError(a, "Pitch detection startup"), this.componentState = "error", (s = (i = this.callbacks).onError) == null || s.call(i, a), !1;
    }
    return this.componentState = "detecting", this.isDetecting = !0, (o = (n = this.callbacks).onStateChange) == null || o.call(n, this.componentState), this.detectPitch(), !0;
  }
  /**
   * Stops pitch detection and cleans up detection loop
   * 
   * @description Cancels the detection loop, resets frame rate limiter,
   * and clears silence detection timers. Safe to call multiple times.
   * 
   * @example
   * ```typescript
   * pitchDetector.stopDetection();
   * console.log('Pitch detection stopped');
   * ```
   */
  stopDetection() {
    var t, e;
    this.isDetecting = !1, this.animationFrame && (cancelAnimationFrame(this.animationFrame), this.animationFrame = null), this.frameRateLimiter.reset(), this.resetSilenceTracking(), this.componentState === "detecting" && this.isInitialized && (this.componentState = "ready", (e = (t = this.callbacks).onStateChange) == null || e.call(t, this.componentState));
  }
  /**
   * Real-time pitch detection loop with adaptive frame rate
   */
  detectPitch() {
    var I, P, _, q;
    if (!this.frameRateLimiter.shouldProcess()) {
      this.animationFrame = requestAnimationFrame(() => this.detectPitch());
      return;
    }
    console.log(`[Debug] detectPitch呼び出し: detecting=${this.isDetecting}, analyser=${!!this.analyser}, rawAnalyser=${!!this.rawAnalyser}, pitchDetector=${!!this.pitchDetector}`);
    const t = this.audioManager.getStatus();
    if (console.log(`[Debug] AudioManager状態: context=${t.audioContextState}, stream=${t.mediaStreamActive}`), !this.isDetecting || !this.analyser || !this.rawAnalyser || !this.pitchDetector || !this.deviceSpecs) return;
    const e = this.analyser.fftSize, i = new Float32Array(e), s = new Float32Array(this.rawAnalyser.fftSize);
    this.analyser.getFloatTimeDomainData(i), this.rawAnalyser.getFloatTimeDomainData(s);
    const n = i.filter((S) => Math.abs(S) > 1e-4).length, o = Math.max(...i.map((S) => Math.abs(S)));
    console.log(`[Debug] バッファー分析: 非ゼロ値=${n}/${e}, 最大値=${o.toFixed(6)}`);
    let a = 0;
    for (let S = 0; S < e; S++)
      a += Math.abs(i[S]);
    const r = Math.sqrt(a / e);
    console.log(`[Debug] RMS計算: sum=${a.toFixed(6)}, rms=${r.toFixed(6)}`);
    const c = this.deviceSpecs, l = r * c.gainCompensation, m = Math.max(0, Math.min(
      100,
      l * 100 / c.divisor * 6 - c.noiseThreshold
    ));
    console.log(`[Debug] 音量計算: rms=${r.toFixed(6)}, adjustedRms=${l.toFixed(6)}, volumePercent=${m.toFixed(2)}%`), console.log(`[Debug] プラットフォーム設定: gain=${c.gainCompensation}, divisor=${c.divisor}, noise=${c.noiseThreshold}`);
    let d = 0;
    for (let S = 0; S < s.length; S++)
      d += Math.abs(s[S]);
    const h = Math.sqrt(d / s.length), f = Math.max(0, Math.min(
      100,
      h * c.gainCompensation * 100 / c.divisor * 6 - c.noiseThreshold
    ));
    this.volumeHistory.push(m), this.volumeHistory.length > 5 && this.volumeHistory.shift(), this.stableVolume = this.volumeHistory.reduce((S, A) => S + A, 0) / this.volumeHistory.length, this.currentVolume = this.stableVolume, this.rawVolume = f;
    const g = 44100;
    let p = 0, y = 0;
    try {
      const S = this.pitchDetector.findPitch(i, g);
      p = S[0] || 0, y = S[1] || 0;
    } catch (S) {
      const A = new Ct(
        "Pitch detection algorithm failed",
        {
          bufferLength: i.length,
          sampleRate: g,
          volume: this.currentVolume,
          originalError: S instanceof Error ? S.message : String(S)
        }
      );
      if (console.warn("⚠️ [PitchDetector] Pitch detection error (recoverable):", A.toJSON()), wt(A))
        p = 0, y = 0;
      else {
        (P = (I = this.callbacks).onError) == null || P.call(I, A);
        return;
      }
    }
    console.log(`[Debug] Pitchy結果: pitch=${(p == null ? void 0 : p.toFixed(1)) || "null"}, clarity=${(y == null ? void 0 : y.toFixed(3)) || "null"}, volume=${(_ = this.currentVolume) == null ? void 0 : _.toFixed(1)}%, sampleRate=${g.toString()}`), console.log(`[Debug] Pitchyバッファー: 最初5要素=${Array.from(i.slice(0, 5)).map((S) => S.toFixed(6)).join(", ")}`);
    const C = p >= 65 && p <= 1200;
    if (console.log(`[Debug] 判定条件: pitch=${!!p}, clarity=${y == null ? void 0 : y.toFixed(3)}>${this.config.clarityThreshold}, volume=${(q = this.currentVolume) == null ? void 0 : q.toFixed(1)}>0.4, range=${C}`), p && y > this.config.clarityThreshold && this.currentVolume > 0.4 && C) {
      let S = p;
      if (!this.disableHarmonicCorrection) {
        const k = Math.min(this.currentVolume / 100, 1);
        S = this.correctHarmonic(p, k);
      }
      this.currentFrequency = Math.round(S);
      const A = this.frequencyToNoteAndOctave(this.currentFrequency);
      this.detectedNote = A.note, this.detectedOctave = A.octave, this.pitchClarity = y;
    } else
      this.currentFrequency === 0 && this.resetHarmonicHistory(), this.currentFrequency = 0, this.detectedNote = "--", this.detectedOctave = null, this.pitchClarity = 0;
    const F = this.currentFrequency > 0 ? this.rawVolume : 0;
    this.processSilenceDetection(this.currentVolume);
    const v = {
      frequency: this.currentFrequency,
      note: this.detectedNote,
      octave: this.detectedOctave || void 0,
      clarity: this.pitchClarity,
      volume: F,
      cents: this.currentFrequency > 0 ? this.frequencyToCents(this.currentFrequency) : void 0
    };
    this.processAudioData(v), this.updateVisuals(v), this.frameRateLimiter.getStats().frameDrops === 0 && this.frameRateLimiter.recoverPerformance(), this.animationFrame = requestAnimationFrame(() => this.detectPitch());
  }
  /**
   * Harmonic correction system
   */
  correctHarmonic(t, e) {
    const i = Date.now(), s = 0.7, n = 1e3;
    this.harmonicHistory = this.harmonicHistory.filter((c) => i - c.timestamp < n);
    const o = Math.min(e * 1.5, 1), a = this.previousFrequency > 0 ? Math.max(0, 1 - Math.abs(t - this.previousFrequency) / this.previousFrequency) : 0.5, r = (o + a) / 2;
    if (this.harmonicHistory.push({ frequency: t, confidence: r, timestamp: i }), this.harmonicHistory.length >= 3) {
      const c = this.harmonicHistory.slice(-5), l = c.reduce((f, g) => f + g.frequency, 0) / c.length, m = c.reduce((f, g) => f + g.confidence, 0) / c.length, d = t / 2;
      if (Math.abs(d - l) / l < 0.1 && m > s)
        return console.log(`🔧 [PitchDetector] Octave correction: ${t}Hz → ${d}Hz`), this.previousFrequency = d, d;
      const h = t * 2;
      if (Math.abs(h - l) / l < 0.1 && m > s)
        return console.log(`🔧 [PitchDetector] Octave up correction: ${t}Hz → ${h}Hz`), this.previousFrequency = h, h;
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
   * Convert frequency to note name and octave
   */
  frequencyToNoteAndOctave(t) {
    const e = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
    if (t <= 0) return { note: "--", octave: null };
    const s = Math.round(12 * Math.log2(t / 440)), n = (s + 9 + 120) % 12, o = Math.floor((s + 9) / 12) + 4;
    return { note: e[n], octave: o };
  }
  /**
   * Convert frequency to cents deviation from nearest note
   */
  frequencyToCents(t) {
    const i = 12 * Math.log2(t / 440), s = Math.round(i), n = (i - s) * 100;
    return Math.round(n);
  }
  /**
   * Process silence detection logic
   */
  processSilenceDetection(t) {
    if (!this.silenceDetectionConfig.enabled)
      return;
    const e = Date.now(), i = this.silenceDetectionConfig.minVolumeThreshold || 0.01;
    if (t < i)
      this.isSilent || (this.isSilent = !0, this.silenceStartTime = e, this.hasWarned = !1, console.log("🔇 [PitchDetector] Silence detected, starting timer"), this.silenceDetectionConfig.warningThreshold && (this.silenceWarningTimer = window.setTimeout(() => {
        this.handleSilenceWarning();
      }, this.silenceDetectionConfig.warningThreshold)), this.silenceDetectionConfig.timeoutThreshold && (this.silenceTimeoutTimer = window.setTimeout(() => {
        this.handleSilenceTimeout();
      }, this.silenceDetectionConfig.timeoutThreshold)));
    else if (this.isSilent) {
      const n = this.silenceStartTime ? e - this.silenceStartTime : 0;
      console.log(`🔊 [PitchDetector] Voice recovered after ${n}ms of silence`), this.resetSilenceTracking(), this.silenceDetectionConfig.onSilenceRecovered && this.silenceDetectionConfig.onSilenceRecovered();
    }
  }
  /**
   * Handle silence warning
   */
  handleSilenceWarning() {
    if (!this.hasWarned && this.silenceStartTime) {
      const t = Date.now() - this.silenceStartTime;
      this.hasWarned = !0, console.log(`⚠️ [PitchDetector] Silence warning: ${t}ms`), this.silenceDetectionConfig.onSilenceWarning && this.silenceDetectionConfig.onSilenceWarning(t);
    }
  }
  /**
   * Handle silence timeout
   */
  handleSilenceTimeout() {
    console.log("⏰ [PitchDetector] Silence timeout reached"), this.silenceDetectionConfig.onSilenceTimeout && this.silenceDetectionConfig.onSilenceTimeout(), this.stopDetection(), this.resetSilenceTracking();
  }
  /**
   * Reset silence tracking state
   */
  resetSilenceTracking() {
    this.isSilent = !1, this.silenceStartTime = null, this.hasWarned = !1, this.silenceWarningTimer && (clearTimeout(this.silenceWarningTimer), this.silenceWarningTimer = null), this.silenceTimeoutTimer && (clearTimeout(this.silenceTimeoutTimer), this.silenceTimeoutTimer = null);
  }
  /**
   * Reset display state
   */
  resetDisplayState() {
    this.currentVolume = 0, this.rawVolume = 0, this.currentFrequency = 0, this.detectedNote = "--", this.detectedOctave = null, this.pitchClarity = 0, this.stableVolume = 0, this.volumeHistory = [0, 0, 0, 0, 0], this.resetHarmonicHistory(), this.resetSilenceTracking(), console.log("🔄 [PitchDetector] Display state reset");
  }
  /**
   * Enable/disable harmonic correction
   */
  setHarmonicCorrectionEnabled(t) {
    this.disableHarmonicCorrection = !t, t || this.resetHarmonicHistory();
  }
  /**
   * Update silence detection configuration
   */
  setSilenceDetectionConfig(t) {
    this.silenceDetectionConfig = {
      ...this.silenceDetectionConfig,
      ...t
    }, this.silenceDetectionConfig.enabled || this.resetSilenceTracking(), console.log("🔇 [PitchDetector] Silence detection config updated:", this.silenceDetectionConfig);
  }
  /**
   * Get current silence detection status
   */
  getSilenceStatus() {
    const t = this.silenceStartTime && this.isSilent ? Date.now() - this.silenceStartTime : null;
    return {
      isEnabled: this.silenceDetectionConfig.enabled || !1,
      isSilent: this.isSilent,
      silenceDuration: t,
      hasWarned: this.hasWarned
    };
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
   * Process audio data (high priority, runs at full speed)
   */
  processAudioData(t) {
    var e, i;
    (i = (e = this.callbacks).onPitchUpdate) == null || i.call(e, t);
  }
  /**
   * Update visual elements (lower priority, can be throttled)
   */
  updateVisuals(t) {
  }
  /**
   * Get current performance statistics
   */
  getPerformanceStats() {
    return this.frameRateLimiter.getStats();
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
    console.log("🧹 [PitchDetector] Starting cleanup"), this.stopDetection(), this.analyserIds.length > 0 && (this.audioManager.release(this.analyserIds), console.log("📤 [PitchDetector] Notified AudioManager of Analyser release:", this.analyserIds), this.analyserIds = []), this.componentState = "uninitialized", this.isInitialized = !1, this.lastError = null, this.analyser = null, this.rawAnalyser = null, this.pitchDetector = null, this.volumeHistory = [0, 0, 0, 0, 0], this.resetHarmonicHistory(), console.log("✅ [PitchDetector] Cleanup complete");
  }
  /**
   * Gets the latest pitch detection result without triggering new analysis
   * 
   * @description Returns the most recent detection result from the ongoing analysis.
   * Useful for UI updates and external monitoring without affecting detection performance.
   * 
   * @returns Latest pitch detection result or null if no detection is active
   * 
   * @example
   * ```typescript
   * const result = pitchDetector.getLatestResult();
   * if (result) {
   *   console.log(`Latest: ${result.note} - ${result.frequency.toFixed(1)}Hz`);
   *   console.log(`Volume: ${result.volume.toFixed(1)}%, Clarity: ${result.clarity.toFixed(2)}`);
   * }
   * ```
   */
  getLatestResult() {
    return !this.isDetecting || this.componentState !== "detecting" ? null : {
      frequency: this.currentFrequency,
      note: this.detectedNote,
      octave: this.detectedOctave ?? 0,
      volume: this.currentVolume,
      rawVolume: this.rawVolume,
      clarity: this.pitchClarity,
      timestamp: Date.now()
    };
  }
  /**
   * Destroys the PitchDetector and cleans up all resources
   * 
   * @example
   * ```typescript
   * pitchDetector.destroy();
   * console.log('PitchDetector destroyed and resources cleaned up');
   * ```
   */
  destroy() {
    this.stopDetection(), this.analyserIds.length > 0 && (this.audioManager.release(this.analyserIds), console.log("📤 [PitchDetector] Notified AudioManager of Analyser release:", this.analyserIds), this.analyserIds = []), this.componentState = "uninitialized", this.isInitialized = !1, this.lastError = null, this.analyser = null;
  }
  /**
   * Gets current PitchDetector status for debugging and monitoring
   * 
   * @returns Status object with component state and performance metrics
   */
  getStatus() {
    var t;
    return {
      componentState: this.componentState,
      isInitialized: this.isInitialized,
      isDetecting: this.isDetecting,
      isRunning: this.isDetecting,
      currentVolume: this.currentVolume,
      rawVolume: this.rawVolume,
      currentFrequency: this.currentFrequency,
      detectedNote: this.detectedNote,
      detectedOctave: this.detectedOctave,
      currentClarity: this.pitchClarity,
      lastError: this.lastError,
      frameRateStatus: (t = this.frameRateLimiter) == null ? void 0 : t.getStats(),
      deviceSpecs: this.deviceSpecs,
      hasRequiredComponents: !!(this.analyser && this.pitchDetector)
    };
  }
}
class Jt {
  /**
   * Creates a new NoiseFilter with configurable 3-stage filtering
   * 
   * @param audioContext - Web Audio API AudioContext instance
   * @param config - Optional filter configuration to override defaults
   * @param config.highpassFreq - Highpass cutoff frequency in Hz (default: 80)
   * @param config.lowpassFreq - Lowpass cutoff frequency in Hz (default: 800)  
   * @param config.notchFreq - Notch filter center frequency in Hz (default: 60)
   * @param config.highpassQ - Highpass filter Q factor (default: 0.7)
   * @param config.lowpassQ - Lowpass filter Q factor (default: 0.7)
   * @param config.notchQ - Notch filter Q factor (default: 10.0)
   * @param config.useFilters - Enable/disable entire filter chain (default: true)
   * 
   * @example
   * ```typescript
   * // Standard voice filtering
   * const voiceFilter = new NoiseFilter(audioContext);
   * 
   * // Custom instrument filtering  
   * const instrumentFilter = new NoiseFilter(audioContext, {
   *   highpassFreq: 60,   // Allow deeper frequencies
   *   lowpassFreq: 2000,  // Extended harmonic range
   *   notchQ: 20.0        // Sharper power line rejection
   * });
   * 
   * // Bypass filtering
   * const bypassFilter = new NoiseFilter(audioContext, {
   *   useFilters: false
   * });
   * ```
   */
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
      const e = new $(
        "ノイズフィルターチェーンの初期化に失敗しました。オーディオシステムのサポート状況を確認してください。",
        {
          operation: "createFilterChain",
          originalError: t.message,
          filterConfig: this.config,
          audioContextState: this.audioContext.state,
          sampleRate: this.audioContext.sampleRate
        }
      );
      throw T.logError(e, "NoiseFilter initialization"), console.error("❌ [NoiseFilter] Failed to create filter chain:", e.toJSON()), e;
    }
  }
  /**
   * Connects the filter chain between input and output nodes in audio processing pipeline
   * 
   * @description Creates audio connections through the 3-stage filter chain or bypasses
   * if filtering is disabled. Handles both inline filtering and return-node patterns.
   * 
   * @param inputNode - Source audio node (e.g., MediaStreamAudioSourceNode)
   * @param outputNode - Optional destination node (e.g., AnalyserNode)
   * @returns The final output node in the chain for further connections
   * 
   * @example
   * ```typescript
   * // Direct connection pattern
   * sourceNode.connect(noiseFilter.connect(inputNode, analyserNode));
   * 
   * // Chain connection pattern
   * const filteredNode = noiseFilter.connect(sourceNode);
   * filteredNode.connect(analyserNode);
   * 
   * // Bypass mode (useFilters: false)
   * const passthroughNode = noiseFilter.connect(sourceNode, analyserNode);
   * ```
   */
  connect(t, e) {
    if (!this.config.useFilters)
      return e && t.connect(e), t;
    if (!this.highpassFilter || !this.lowpassFilter || !this.notchFilter) {
      const i = new x(
        "ノイズフィルターが正しく初期化されていません。コンストラクタでuseFilters: trueで初期化してください。",
        z.AUDIO_CONTEXT_ERROR,
        {
          operation: "connect",
          useFilters: this.config.useFilters,
          hasHighpassFilter: !!this.highpassFilter,
          hasLowpassFilter: !!this.lowpassFilter,
          hasNotchFilter: !!this.notchFilter
        }
      );
      throw T.logError(i, "NoiseFilter connection"), i;
    }
    try {
      return this.disconnect(), this.inputNode = t, this.outputNode = e || null, t.connect(this.highpassFilter), this.highpassFilter.connect(this.lowpassFilter), this.lowpassFilter.connect(this.notchFilter), e && this.notchFilter.connect(e), this.isConnected = !0, console.log("🔗 [NoiseFilter] Filter chain connected"), this.notchFilter;
    } catch (i) {
      const s = new $(
        "ノイズフィルターの接続に失敗しました。オーディオノードの接続状態を確認してください。",
        {
          operation: "connect",
          originalError: i.message,
          hasInputNode: !!this.inputNode,
          hasOutputNode: !!this.outputNode,
          isConnected: this.isConnected,
          filterConfig: this.config
        }
      );
      throw T.logError(s, "NoiseFilter audio connection"), console.error("❌ [NoiseFilter] Connection failed:", s.toJSON()), s;
    }
  }
  /**
   * Disconnects all filter nodes and cleans up audio connections
   * 
   * @description Safely disconnects all filter nodes in the chain and resets
   * connection state. Safe to call multiple times.
   * 
   * @example
   * ```typescript
   * // Clean up when finished
   * noiseFilter.disconnect();
   * console.log('Filter chain disconnected');
   * ```
   */
  disconnect() {
    try {
      this.highpassFilter && this.highpassFilter.disconnect(), this.lowpassFilter && this.lowpassFilter.disconnect(), this.notchFilter && this.notchFilter.disconnect(), this.isConnected = !1, this.inputNode = null, this.outputNode = null, console.log("🔌 [NoiseFilter] Filter chain disconnected");
    } catch (t) {
      console.warn("⚠️ [NoiseFilter] Disconnect warning:", t);
    }
  }
  /**
   * Updates filter parameters dynamically during runtime
   * 
   * @param params - Object containing new filter parameters
   * @param params.highpassFreq - New highpass cutoff frequency in Hz
   * @param params.lowpassFreq - New lowpass cutoff frequency in Hz
   * @param params.notchFreq - New notch filter center frequency in Hz
   * @param params.highpassQ - New highpass filter Q factor
   * @param params.lowpassQ - New lowpass filter Q factor  
   * @param params.notchQ - New notch filter Q factor
   * 
   * @example
   * ```typescript
   * // Adapt filtering for different content
   * noiseFilter.updateFrequencies({
   *   highpassFreq: 100,  // More aggressive low-cut
   *   lowpassFreq: 1200   // Extended high-frequency range
   * });
   * 
   * // Adjust power line rejection
   * noiseFilter.updateFrequencies({
   *   notchFreq: 50,      // 50Hz power line (Europe)
   *   notchQ: 15.0        // Sharper notch
   * });
   * ```
   */
  updateFrequencies(t) {
    const e = this.audioContext.currentTime;
    try {
      t.highpassFreq !== void 0 && this.highpassFilter && (this.highpassFilter.frequency.setValueAtTime(t.highpassFreq, e), this.config.highpassFreq = t.highpassFreq), t.lowpassFreq !== void 0 && this.lowpassFilter && (this.lowpassFilter.frequency.setValueAtTime(t.lowpassFreq, e), this.config.lowpassFreq = t.lowpassFreq), t.notchFreq !== void 0 && this.notchFilter && (this.notchFilter.frequency.setValueAtTime(t.notchFreq, e), this.config.notchFreq = t.notchFreq), t.highpassQ !== void 0 && this.highpassFilter && (this.highpassFilter.Q.setValueAtTime(t.highpassQ, e), this.config.highpassQ = t.highpassQ), t.lowpassQ !== void 0 && this.lowpassFilter && (this.lowpassFilter.Q.setValueAtTime(t.lowpassQ, e), this.config.lowpassQ = t.lowpassQ), t.notchQ !== void 0 && this.notchFilter && (this.notchFilter.Q.setValueAtTime(t.notchQ, e), this.config.notchQ = t.notchQ), console.log("🔧 [NoiseFilter] Filter parameters updated:", t);
    } catch (i) {
      const s = new x(
        "フィルターパラメータの更新に失敗しました。指定した値が範囲外であるか、フィルターが無効になっている可能性があります。",
        z.INVALID_SAMPLE_RATE,
        {
          operation: "updateFrequencies",
          originalError: i.message,
          requestedParams: t,
          currentConfig: this.config,
          audioContextTime: this.audioContext.currentTime
        }
      );
      throw T.logError(s, "NoiseFilter parameter update"), console.error("❌ [NoiseFilter] Parameter update failed:", s.toJSON()), s;
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
      const i = new x(
        "フィルター応答の計算に失敗しました。デフォルト値を返します。",
        z.PROCESSING_TIMEOUT,
        {
          operation: "getFilterResponse",
          frequency: t,
          originalError: e.message,
          useFilters: this.config.useFilters
        }
      );
      return T.logError(i, "Filter response calculation"), console.warn("⚠️ [NoiseFilter] Filter response calculation failed:", i.toJSON()), { magnitude: 1, phase: 0 };
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
class Qt {
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
        const o = await this.audioManager.initialize();
        return this.isActive = !0, this.lastActivityTime = Date.now(), this.autoRecoveryAttempts = 0, this.startHealthMonitoring(), this.startIdleMonitoring(), this.startVisibilityMonitoring(), (e = (t = this.callbacks).onStateChange) == null || e.call(t, "active"), console.log("🟢 [MicrophoneLifecycleManager] Microphone activated"), o;
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
    }, n = () => {
      this.isPageVisible = !1, this.handleVisibilityChange();
    };
    document.addEventListener("visibilitychange", t), document.addEventListener("mousemove", e), document.addEventListener("keydown", e), document.addEventListener("click", e), document.addEventListener("scroll", e), document.addEventListener("touchstart", e), window.addEventListener("beforeunload", i), window.addEventListener("unload", i), window.addEventListener("focus", s), window.addEventListener("blur", n), this.eventListeners.set("visibilitychange", t), this.eventListeners.set("mousemove", e), this.eventListeners.set("keydown", e), this.eventListeners.set("click", e), this.eventListeners.set("scroll", e), this.eventListeners.set("touchstart", e), this.eventListeners.set("beforeunload", i), this.eventListeners.set("unload", i), this.eventListeners.set("focus", s), this.eventListeners.set("blur", n), console.log("👂 [MicrophoneLifecycleManager] Event listeners setup complete");
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
        const n = this.audioManager.checkMediaStreamHealth();
        this.lastHealthCheck = n, n.healthy || (console.warn("⚠️ [MicrophoneLifecycleManager] Unhealthy microphone state detected:", n), this.autoRecoveryAttempts < this.maxAutoRecoveryAttempts ? (this.autoRecoveryAttempts++, console.log(`🔧 [MicrophoneLifecycleManager] Attempting automatic recovery (${this.autoRecoveryAttempts}/${this.maxAutoRecoveryAttempts})`), setTimeout(async () => {
          var o, a;
          try {
            await this.audioManager.initialize(), console.log("✅ [MicrophoneLifecycleManager] Automatic recovery successful"), this.dispatchCustomEvent("pitchpro:lifecycle:autoRecoverySuccess", {});
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
class Ut {
  constructor() {
    if (this.container = null, this.notifications = /* @__PURE__ */ new Map(), this.notificationCounter = 0, this.defaultDuration = 5e3, this.maxNotifications = 0, this.cssClasses = {
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
    const n = document.createElement("div");
    if (n.className = this.cssClasses.message, n.textContent = e.message, i.appendChild(n), e.details && e.details.length > 0) {
      const a = document.createElement("div");
      a.className = this.cssClasses.details;
      const r = document.createElement("ul");
      r.style.margin = "0", r.style.paddingLeft = "16px", e.details.forEach((c) => {
        const l = document.createElement("li");
        l.textContent = c, r.appendChild(l);
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
class Kt {
  /**
   * Creates a new MicrophoneController with integrated management systems
   * 
   * @param audioManagerConfig - Configuration for AudioManager (optional)
   * @param audioManagerConfig.sampleRate - Audio sample rate (default: 44100)
   * @param audioManagerConfig.echoCancellation - Enable echo cancellation (default: false)
   * @param audioManagerConfig.autoGainControl - Enable auto gain control (default: false)
   * @param lifecycleConfig - Configuration for lifecycle management (optional)
   * @param lifecycleConfig.maxRetries - Maximum retry attempts (default: 3)
   * @param lifecycleConfig.retryDelayMs - Delay between retries (default: 1000)
   * @param showErrorNotifications - Enable visual error notifications (default: true)
   * 
   * @example
   * ```typescript
   * // Basic usage with defaults
   * const micController = new MicrophoneController();
   * 
   * // Custom configuration
   * const micController = new MicrophoneController(
   *   { sampleRate: 48000, echoCancellation: true },
   *   { maxRetries: 5, retryDelayMs: 2000 },
   *   false  // Disable error notifications
   * );
   * ```
   */
  constructor(t = {}, e = {}, i = !0) {
    this.currentState = "uninitialized", this.isPermissionGranted = !1, this.lastError = null, this.eventCallbacks = {}, this.deviceSpecs = null, this.audioManager = new zt(t), this.lifecycleManager = new Qt(this.audioManager, e), this.errorSystem = i ? new Ut() : null, this.setupEventHandlers(), this.detectDevice();
  }
  /**
   * Sets callback functions for microphone controller events
   * 
   * @param callbacks - Object containing event callback functions
   * @param callbacks.onStateChange - Called when controller state changes
   * @param callbacks.onError - Called when errors occur
   * @param callbacks.onPermissionChange - Called when microphone permission changes
   * @param callbacks.onSensitivityChange - Called when sensitivity is adjusted
   * @param callbacks.onDeviceChange - Called when device specifications are detected
   * 
   * @example
   * ```typescript
   * micController.setCallbacks({
   *   onStateChange: (state) => {
   *     console.log('Controller state:', state);
   *   },
   *   onError: (error) => {
   *     console.error('Microphone error:', error.message);
   *   },
   *   onDeviceChange: (specs) => {
   *     console.log(`Device: ${specs.deviceType}, Sensitivity: ${specs.sensitivity}x`);
   *   }
   * });
   * ```
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
   * Initializes microphone access with automatic device detection and permissions
   * 
   * @description Handles the complete initialization flow including device detection,
   * permission requests, resource acquisition, and error recovery. Automatically
   * applies device-specific optimizations and sets up monitoring systems.
   * 
   * @returns Promise resolving to audio resources (AudioContext, MediaStream, SourceNode)
   * @throws {Error} If microphone permission is denied or initialization fails
   * 
   * @example
   * ```typescript
   * try {
   *   const resources = await micController.initialize();
   *   console.log('Microphone ready:', resources.mediaStream.active);
   *   console.log('AudioContext state:', resources.audioContext.state);
   * } catch (error) {
   *   console.error('Failed to initialize microphone:', error.message);
   * }
   * ```
   */
  async initialize() {
    var t, e, i, s;
    try {
      this.updateState("initializing"), console.log("🎤 [MicrophoneController] Starting initialization");
      const n = await this.lifecycleManager.acquire();
      return this.isPermissionGranted = !0, this.updateState("ready"), this.lastError = null, (e = (t = this.eventCallbacks).onPermissionChange) == null || e.call(t, !0), this.dispatchCustomEvent("pitchpro:microphoneGranted", { stream: n.mediaStream }), console.log("✅ [MicrophoneController] Initialization complete"), n;
    } catch (n) {
      const o = this._createStructuredError(n, "initialization");
      throw T.logError(o, "MicrophoneController initialization"), console.error("❌ [MicrophoneController] Initialization failed:", o.toJSON()), this.isPermissionGranted = !1, this.handleError(n, "initialization"), (s = (i = this.eventCallbacks).onPermissionChange) == null || s.call(i, !1), this.dispatchCustomEvent("pitchpro:microphoneDenied", { error: n }), n;
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
   * Forcefully stops microphone with complete resource cleanup
   * 
   * @description Performs immediate and complete cleanup of all microphone resources,
   * resets permission state, and returns controller to uninitialized state.
   * Use when normal stop() is not sufficient or emergency cleanup is needed.
   * 
   * @example
   * ```typescript
   * // Emergency cleanup
   * micController.forceStop();
   * console.log('All microphone resources cleaned up');
   * ```
   */
  forceStop() {
    console.log("🚨 [MicrophoneController] Force stopping microphone"), this.lifecycleManager.forceRelease(), this.updateState("uninitialized"), this.isPermissionGranted = !1, console.log("✅ [MicrophoneController] Force stop complete");
  }
  /**
   * Sets microphone sensitivity with automatic validation and event notification
   * 
   * @param sensitivity - Sensitivity multiplier (0.1 ~ 10.0)
   * - 0.1-1.0: Reduced sensitivity for loud environments
   * - 1.0: Standard PC sensitivity
   * - 3.0: iPhone optimized
   * - 7.0: iPad optimized  
   * - 10.0: Maximum sensitivity for quiet environments
   * 
   * @example
   * ```typescript
   * // Set device-optimized sensitivity
   * micController.setSensitivity(7.0);  // iPad optimization
   * 
   * // Adjust for environment
   * micController.setSensitivity(0.5);  // Reduce for loud room
   * ```
   */
  setSensitivity(t) {
    var s, n;
    const e = this.audioManager.getSensitivity();
    this.audioManager.setSensitivity(t);
    const i = this.audioManager.getSensitivity();
    e !== i && (console.log(`🔧 [MicrophoneController] Sensitivity changed: ${e}x → ${i}x`), (n = (s = this.eventCallbacks).onSensitivityChange) == null || n.call(s, i), this.dispatchCustomEvent("pitchpro:sensitivityChanged", { sensitivity: i }));
  }
  /**
   * Gets current microphone sensitivity multiplier
   * 
   * @returns Current sensitivity value (0.1 ~ 10.0)
   * 
   * @example
   * ```typescript
   * const currentSensitivity = micController.getSensitivity();
   * console.log(`Current sensitivity: ${currentSensitivity}x`);
   * ```
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
      await new Promise((l) => {
        const m = () => {
          if (Date.now() >= o) {
            l();
            return;
          }
          const d = i.fftSize, h = new Float32Array(d);
          i.getFloatTimeDomainData(h);
          let f = 0;
          for (let y = 0; y < d; y++)
            f += Math.abs(h[y]);
          const p = Math.sqrt(f / d) * 100;
          if (p > s && (s = p), p > 5) {
            let y = 0, C = 0;
            for (let F = 1; F < d / 2; F++) {
              const v = Math.abs(h[F]);
              v > C && (C = v, y = F);
            }
            y > 0 && (n = y * 44100 / d);
          }
          requestAnimationFrame(m);
        };
        m();
      }), this.audioManager.removeAnalyser("microphone-test");
      const a = Date.now() - e, r = s > 1, c = n ? n.toFixed(0) : "none";
      return console.log(`🧪 [MicrophoneController] Microphone test complete: volume=${s.toFixed(2)}, frequency=${c}, duration=${a}ms`), {
        success: r,
        volume: s,
        frequency: n,
        duration: a
      };
    } catch (i) {
      const s = Date.now() - e, n = this._createStructuredError(i, "microphone_test");
      return T.logError(n, "Microphone functionality test"), console.error("❌ [MicrophoneController] Microphone test failed:", n.toJSON()), {
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
    var s, n;
    const i = t instanceof x ? t : this._createStructuredError(t, e);
    T.logError(i, `MicrophoneController ${e}`), console.error(`❌ [MicrophoneController] Error in ${e}:`, i.toJSON()), this.lastError = t, this.updateState("error"), this.errorSystem && (e === "initialization" || e === "lifecycle" ? this.errorSystem.showMicrophoneError(t, e) : this.errorSystem.showError(
      "マイクエラー",
      `${e}でエラーが発生しました: ${t.message}`,
      { priority: "medium" }
    )), (n = (s = this.eventCallbacks).onError) == null || n.call(s, t);
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
  /**
   * Creates structured error with enhanced context information
   * 
   * @private
   * @param error - Original error
   * @param operation - Operation that failed
   * @returns Structured PitchProError with context
   */
  _createStructuredError(t, e) {
    return t.message.includes("Permission denied") || t.message.includes("NotAllowedError") || t.message.includes("permission") || t.message.includes("denied") ? new Ft(
      "マイクへのアクセス許可が拒否されました。ブラウザの設定でマイクアクセスを許可してください。",
      {
        operation: e,
        originalError: t.message,
        deviceSpecs: this.deviceSpecs,
        permissionState: this.isPermissionGranted,
        controllerState: this.currentState,
        userAgent: typeof navigator < "u" ? navigator.userAgent : "unknown"
      }
    ) : t.message.includes("AudioContext") || t.message.includes("audio") || t.message.includes("context") || t.message.includes("initialization") ? new $(
      "オーディオシステムの初期化に失敗しました。デバイスの音響設定を確認するか、ブラウザを再起動してください。",
      {
        operation: e,
        originalError: t.message,
        controllerState: this.currentState,
        audioManagerStatus: this.audioManager.getStatus(),
        deviceSpecs: this.deviceSpecs
      }
    ) : new x(
      `${e}中に予期しないエラーが発生しました: ${t.message}`,
      z.MICROPHONE_ACCESS_DENIED,
      {
        operation: e,
        originalError: t.message,
        stack: t.stack,
        currentState: {
          controllerState: this.currentState,
          isPermissionGranted: this.isPermissionGranted,
          isActive: this.isActive(),
          isReady: this.isReady(),
          deviceSpecs: this.deviceSpecs
        }
      }
    );
  }
}
class Yt {
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
      const l = t * c, m = Math.abs(1200 * Math.log2(r / l));
      if (m <= this.config.harmonicToleranceCents * 2) {
        const d = 1 - m / (this.config.harmonicToleranceCents * 2);
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
    const t = this.historyBuffer.map((l) => l.frequency), e = this.historyBuffer.map((l) => l.confidence), i = e.reduce((l, m) => l + m, 0) / e.length, s = Math.min(...t), n = Math.max(...t), o = t.reduce((l, m) => l + m, 0) / t.length, a = t.reduce((l, m) => l + Math.pow(m - o, 2), 0) / t.length, r = Math.sqrt(a) / o, c = Math.max(0, 1 - r);
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
const O = {
  EXCELLENT: "excellent",
  GOOD: "good",
  FAIR: "fair",
  POOR: "poor"
};
class Zt {
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
    const o = this.calculateStability(), a = this.detectVibrato(), r = s ? this.analyzeBreathiness(s) : null, c = this.analyzeConsistency(), l = this.calculateOverallQuality(o, a, r, c), m = this.generateRecommendations(
      l,
      o,
      a,
      r,
      c
    );
    return {
      quality: l,
      stability: o,
      recommendations: m
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
      const h = e[i[d].index], f = e[i[d + 1].index];
      if (h > 0 && f > 0) {
        const g = Math.abs(1200 * Math.log2(h / f));
        a.push(g);
      }
    }
    const r = a.length > 0 ? a.reduce((d, h) => d + h, 0) / a.length : 0, c = [];
    for (let d = 0; d < i.length - 2; d += 2) {
      const h = i[d + 2].index - i[d].index;
      c.push(h);
    }
    let l = 0;
    if (c.length > 2) {
      const d = c.reduce((f, g) => f + g, 0) / c.length, h = c.reduce((f, g) => f + Math.pow(g - d, 2), 0) / c.length;
      l = Math.max(0, 1 - Math.sqrt(h) / d);
    }
    return {
      detected: o >= this.config.vibratoMinRate && o <= this.config.vibratoMaxRate && r >= this.config.vibratoMinDepthCents,
      rate: o,
      depth: r,
      regularity: l
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
    return i !== null ? o += (1 - Math.min(i, 1)) * n.breathiness : o += 0.7 * n.breathiness, e.detected && e.regularity > 0.7 ? o += 0.9 * n.vibrato : e.detected ? o += 0.6 * n.vibrato : o += 0.5 * n.vibrato, o >= 0.85 ? O.EXCELLENT : o >= 0.7 ? O.GOOD : o >= 0.5 ? O.FAIR : O.POOR;
  }
  /**
   * Generate recommendations based on analysis
   */
  generateRecommendations(t, e, i, s, n) {
    const o = [];
    return e < 0.5 ? (o.push("音程の安定性を向上させるため、ゆっくりとした発声練習を行ってください"), o.push("腹式呼吸を意識して、息の流れを一定に保つ練習をしてください")) : e < 0.7 && o.push("音程の微調整練習で、より正確なピッチコントロールを目指しましょう"), n < 0.5 && (o.push("音量と音質の一貫性を保つため、定期的な発声練習を継続してください"), o.push("録音を聞き返して、自分の声の特徴を把握しましょう")), s !== null && s > 0.6 && (o.push("声の息漏れが気になります。発声時の喉の締まりを意識してください"), o.push("ハミング練習で、クリアな声質を目指しましょう")), i.detected ? i.regularity < 0.5 ? o.push("ビブラートの規則性を改善するため、メトロノームに合わせた練習をしてください") : i.rate > 7.5 && o.push("ビブラートの速度が速すぎます。よりゆったりとしたビブラートを練習してください") : (t === O.GOOD || t === O.EXCELLENT) && o.push("美しいビブラートの習得に挑戦してみましょう"), t === O.POOR ? (o.push("基礎的な発声練習から始めることをお勧めします"), o.push("専門的な指導を受けることを検討してください")) : t === O.EXCELLENT && o.push("素晴らしい声質です。この状態を維持する練習を続けてください"), o;
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
class te {
  constructor() {
    this.calibrationData = null, this.isCalibrated = !1, this.calibrationInProgress = !1, this.deviceSpecs = at.getDeviceSpecs();
  }
  /**
   * Perform automatic calibration
   */
  async calibrate(t, e) {
    if (this.calibrationInProgress)
      throw new Error("Calibration already in progress");
    this.calibrationInProgress = !0;
    try {
      console.log("🎛️ [CalibrationSystem] Starting device calibration");
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
      }, this.isCalibrated = !0, this.calibrationInProgress = !1, console.log("✅ [CalibrationSystem] Calibration completed successfully"), {
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
      const a = n.frequencyBinCount, r = new Float32Array(a), c = [], l = Date.now(), m = () => {
        if (Date.now() - l >= i) {
          const d = {};
          for (let h = 0; h < a; h++) {
            const f = h * t.sampleRate / n.fftSize;
            let g = 0;
            for (const p of c)
              g += p[h];
            d[Math.round(f)] = g / c.length;
          }
          o.disconnect(), s(d);
          return;
        }
        n.getFloatFrequencyData(r), c.push(new Float32Array(r)), setTimeout(m, 100);
      };
      m();
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
      const a = n.fftSize, r = new Float32Array(a), c = [], l = Date.now(), m = () => {
        if (Date.now() - l >= i) {
          c.sort((F, v) => F - v);
          const f = c[0] || 0, g = c[c.length - 1] || 1, C = 0.3 - (c[Math.floor(c.length / 2)] || 0.5);
          o.disconnect(), s({
            offset: C,
            range: { min: f, max: g }
          });
          return;
        }
        n.getFloatTimeDomainData(r);
        let d = 0;
        for (let f = 0; f < a; f++)
          d += r[f] * r[f];
        const h = Math.sqrt(d / a);
        c.push(h), setTimeout(m, 50);
      };
      m();
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
      const a = n.frequencyBinCount, r = new Float32Array(a), c = {}, l = Date.now(), m = () => {
        if (Date.now() - l >= i) {
          const d = {};
          Object.keys(c).forEach((h) => {
            const f = parseInt(h), g = c[f], p = g.reduce((y, C) => y + C, 0) / g.length;
            d[f] = p;
          }), o.disconnect(), s(d);
          return;
        }
        n.getFloatFrequencyData(r);
        for (let d = 0; d < a; d++) {
          const h = Math.round(d * t.sampleRate / n.fftSize);
          h >= 80 && h <= 1e3 && (c[h] || (c[h] = []), c[h].push(r[d]));
        }
        setTimeout(m, 100);
      };
      m();
    });
  }
  /**
   * Calculate optimal settings based on calibration data
   */
  calculateOptimalSettings(t, e, i) {
    const s = this.getDefaultSettings(), n = Math.max(0.5, Math.min(2, 1 - e.offset)), o = s.sensitivity * n, r = Object.keys(t).map((v) => parseInt(v)).filter((v) => v >= 100 && v <= 800).map((v) => t[v]), c = r.length > 0 ? r.reduce((v, b) => v + b, 0) / r.length : -60, l = Math.max(-20, c + 10), m = Math.max(s.noiseGate, Math.abs(l) / 1e3), h = Object.keys(i).map((v) => parseInt(v)).sort((v, b) => v - b).map((v) => i[v]), f = h.slice(0, Math.floor(h.length * 0.3)), g = h.slice(
      Math.floor(h.length * 0.3),
      Math.floor(h.length * 0.7)
    ), p = h.slice(Math.floor(h.length * 0.7)), y = f.reduce((v, b) => v + b, 0) / f.length, C = g.reduce((v, b) => v + b, 0) / g.length, F = p.reduce((v, b) => v + b, 0) / p.length;
    return {
      sensitivity: Math.round(o * 10) / 10,
      noiseGate: Math.round(m * 1e3) / 1e3,
      volumeOffset: e.offset,
      filterSettings: {
        highpassFreq: y < C - 5 ? 100 : 80,
        // Stronger highpass if low freq is weak
        lowpassFreq: F > C + 3 ? 600 : 800,
        // Lower cutoff if high freq is strong
        notchFreq: 60,
        // Standard power line frequency
        highpassQ: 0.7,
        lowpassQ: 0.7,
        notchQ: 10
      },
      deviceAdjustments: {
        lowFreqCompensation: Math.max(0.8, Math.min(1.5, C / (y || -60))),
        highFreqCompensation: Math.max(0.8, Math.min(1.2, C / (F || -60)))
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
      return t.setSensitivity && t.setSensitivity(e.sensitivity), t.setNoiseGate && t.setNoiseGate(e.noiseGate), t.updateFilterSettings && t.updateFilterSettings(e.filterSettings), console.log("✅ [CalibrationSystem] Calibration applied successfully"), !0;
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
    this.isCalibrated = !1, this.calibrationInProgress = !1, this.calibrationData = null, console.log("🔄 [CalibrationSystem] Calibration reset");
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
      return localStorage.setItem(t, JSON.stringify(e)), console.log("💾 [CalibrationSystem] Calibration saved"), !0;
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
      return Date.now() - i.timestamp > s ? (console.log("⏰ [CalibrationSystem] Saved calibration is too old, ignoring"), !1) : i.deviceSpecs.deviceType !== this.deviceSpecs.deviceType ? (console.log("📱 [CalibrationSystem] Device type mismatch, ignoring saved calibration"), !1) : (this.calibrationData = i.calibrationData, this.isCalibrated = !0, console.log("📂 [CalibrationSystem] Calibration loaded successfully"), !0);
    } catch (t) {
      return console.error("❌ [CalibrationSystem] Failed to load calibration:", t), !1;
    }
  }
}
const M = class M {
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
  static frequencyToMidi(t) {
    return t <= 0 ? 0 : Math.round(12 * Math.log2(t / M.A4_FREQUENCY) + M.A4_MIDI_NUMBER);
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
  static midiToFrequency(t) {
    return M.A4_FREQUENCY * Math.pow(2, (t - M.A4_MIDI_NUMBER) / 12);
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
  static frequencyToNote(t, e = !1) {
    if (t <= 0)
      return {
        name: "--",
        octave: 0,
        midi: 0,
        frequency: 0
      };
    const i = M.frequencyToMidi(t), s = e ? M.FLAT_NOTE_NAMES : M.NOTE_NAMES, n = (i - 12) % 12, o = Math.floor((i - 12) / 12);
    return {
      name: s[n] + o,
      octave: o,
      midi: i,
      frequency: M.midiToFrequency(i)
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
  static frequencyToCents(t) {
    if (t <= 0) return 0;
    const e = 12 * Math.log2(t / M.A4_FREQUENCY) + M.A4_MIDI_NUMBER, i = Math.round(e), s = (e - i) * 100;
    return Math.round(s);
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
  static centsToRatio(t) {
    return Math.pow(2, t / 1200);
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
  static ratioToCents(t) {
    return t <= 0 ? 0 : Math.round(1200 * Math.log2(t));
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
  static getClosestNoteFrequency(t) {
    if (t <= 0) return 0;
    const e = M.frequencyToMidi(t);
    return M.midiToFrequency(e);
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
  static getInterval(t, e) {
    if (t <= 0 || e <= 0) return 0;
    const i = M.frequencyToMidi(t), s = M.frequencyToMidi(e);
    return Math.abs(s - i);
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
  static getSignedInterval(t, e) {
    if (t <= 0 || e <= 0) return 0;
    const i = M.frequencyToMidi(t);
    return M.frequencyToMidi(e) - i;
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
  static isInVocalRange(t) {
    return t >= 80 && t <= 1100;
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
  static isInPianoRange(t) {
    return t >= 27.5 && t <= 4186;
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
  static generateChromaticScale(t, e = 1) {
    const i = [];
    for (let s = 0; s < 12 * e; s++) {
      const n = t * Math.pow(2, s / 12);
      i.push(n);
    }
    return i;
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
  static generateMajorScale(t) {
    return [0, 2, 4, 5, 7, 9, 11, 12].map((i) => t * Math.pow(2, i / 12));
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
  static generateMinorScale(t) {
    return [0, 2, 3, 5, 7, 8, 10, 12].map((i) => t * Math.pow(2, i / 12));
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
  static findHarmonics(t, e = 8) {
    const i = [];
    for (let s = 1; s <= e; s++)
      i.push(t * s);
    return i;
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
    return M.frequencyToNote(t).name;
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
    const l = (n + 1) * 12 + o;
    return M.midiToFrequency(l);
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
M.A4_FREQUENCY = 440, M.A4_MIDI_NUMBER = 69, M.NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"], M.FLAT_NOTE_NAMES = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"], M.INTERVALS = {
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
let R = M;
const E = class E {
  /**
   * Generate scale from root note
   */
  static generateScale(t, e = "major") {
    const i = E.SCALE_PATTERNS[e];
    if (!i)
      throw new Error(`Unknown scale type: ${e}`);
    return i.map((s) => {
      const n = t * Math.pow(2, s / 12);
      return R.frequencyToNote(n);
    });
  }
  /**
   * Generate chord from root note
   */
  static generateChord(t, e = "major") {
    const i = E.CHORD_PATTERNS[e];
    if (!i)
      throw new Error(`Unknown chord type: ${e}`);
    return i.map((s) => {
      const n = t * Math.pow(2, s / 12);
      return R.frequencyToNote(n);
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
    return Object.entries(E.SCALE_PATTERNS).forEach(([o, a]) => {
      for (let r = 0; r < 12; r++) {
        const c = a.map((h) => (h + r) % 12).sort((h, f) => h - f), l = s.map((h) => h % 12).sort((h, f) => h - f);
        let m = 0;
        l.forEach((h) => {
          c.includes(h) && m++;
        });
        const d = m / Math.max(l.length, c.length);
        if (d > 0.5) {
          const h = i * Math.pow(2, -r / 12);
          n.push({
            scale: o,
            confidence: d,
            root: R.frequencyToNote(h)
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
    return Object.entries(E.CHORD_PATTERNS).forEach(([s, n]) => {
      for (let o = 0; o < n.length; o++) {
        const a = [
          ...n.slice(o),
          ...n.slice(0, o).map((r) => r + 12)
        ];
        e.forEach((r, c) => {
          const l = e.map(
            (f) => Math.round(12 * Math.log2(f / r))
          );
          let m = 0;
          const d = new Set(a);
          l.forEach((f) => {
            const g = f % 12;
            (d.has(g) || d.has(g + 12)) && m++;
          });
          const h = m / Math.max(l.length, n.length);
          if (h > 0.6) {
            const f = o === 0 ? r : r * Math.pow(2, -n[o] / 12);
            i.push({
              chord: s,
              confidence: h,
              root: R.frequencyToNote(f),
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
      l && (o = n[l]);
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
      i.push(R.frequencyToNote(n));
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
    const e = t * 100, i = E.getJustIntonationRatios();
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
      const s = t[i - 1], n = t[i], o = R.frequencyToNote(s), a = R.frequencyToNote(n), r = R.getSignedInterval(s, n), c = R.getIntervalInfo(Math.abs(r)), l = r > 0 ? "up" : r < 0 ? "down" : "same";
      e.push({
        fromNote: o,
        toNote: a,
        interval: c,
        direction: l
      });
    }
    return e;
  }
  /**
   * Generate chord progressions in a given key
   */
  static generateChordProgression(t, e = "major", i = [1, 4, 5, 1]) {
    const s = R.scientificPitchToFrequency(t + "4");
    if (s === 0)
      throw new Error(`Invalid key: ${t}`);
    const n = E.generateScale(s, e === "minor" ? "naturalMinor" : "major"), o = [];
    return i.forEach((a) => {
      const r = n[(a - 1) % n.length], c = e === "major" ? E.getMajorScaleChordType(a) : E.getMinorScaleChordType(a), l = E.generateChord(r.frequency, c);
      o.push(l);
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
E.SCALE_PATTERNS = {
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
}, E.CHORD_PATTERNS = {
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
}, E.CIRCLE_OF_FIFTHS = [
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
], E.INTERVAL_NAMES = {
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
let Mt = E;
const ee = "1.1.3", ie = (/* @__PURE__ */ new Date()).toISOString(), se = {
  pitchDetector: {
    fftSize: 4096,
    smoothing: 0.1,
    clarityThreshold: 0.4,
    // 現実的な値に修正
    minVolumeAbsolute: 3e-3
    // 現実的な値に修正
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
  ie as BUILD_DATE,
  te as CalibrationSystem,
  se as DEFAULT_CONFIG,
  at as DeviceDetection,
  Ut as ErrorNotificationSystem,
  R as FrequencyUtils,
  Yt as HarmonicCorrection,
  Kt as MicrophoneController,
  Qt as MicrophoneLifecycleManager,
  Mt as MusicTheory,
  Jt as NoiseFilter,
  Xt as PitchDetector,
  ee as VERSION,
  Zt as VoiceAnalyzer
};
//# sourceMappingURL=index.esm.js.map
