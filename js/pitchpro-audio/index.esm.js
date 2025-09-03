import { A as i, E as n, a as s, M as c, N as l, P as h } from "./MicrophoneController-D5dbELbV.mjs";
import { CalibrationSystem as f, HarmonicCorrection as m, VoiceAnalyzer as u } from "./advanced.esm.js";
import { FrequencyUtils as F, MusicTheory as y } from "./utils.esm.js";
import { D as M } from "./DeviceDetection-DXJ36uZ7.mjs";
/**
 * PitchPro Audio Processing Library
 * High-precision pitch detection and audio processing for web applications
 * 
 * @version 1.0.0
 * @author PitchPro Team
 * @license MIT
 */
const e = "1.0.0", o = (/* @__PURE__ */ new Date()).toISOString(), t = {
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
  i as AudioManager,
  o as BUILD_DATE,
  f as CalibrationSystem,
  t as DEFAULT_CONFIG,
  M as DeviceDetection,
  n as ErrorNotificationSystem,
  F as FrequencyUtils,
  m as HarmonicCorrection,
  s as MicrophoneController,
  c as MicrophoneLifecycleManager,
  y as MusicTheory,
  l as NoiseFilter,
  h as PitchDetector,
  e as VERSION,
  u as VoiceAnalyzer
};
//# sourceMappingURL=index.esm.js.map
