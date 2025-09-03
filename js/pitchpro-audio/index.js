"use strict";Object.defineProperty(exports,Symbol.toStringTag,{value:"Module"});const e=require("./MicrophoneController-mAu1_vZl.js"),o=require("./advanced.js"),i=require("./utils.js"),r=require("./DeviceDetection-D70AQWUJ.js");/**
 * PitchPro Audio Processing Library
 * High-precision pitch detection and audio processing for web applications
 * 
 * @version 1.0.0
 * @author PitchPro Team
 * @license MIT
 */const t="1.0.0",n=new Date().toISOString(),c={pitchDetector:{fftSize:4096,smoothing:.1,clarityThreshold:.8,minVolumeAbsolute:.01},audioManager:{sampleRate:44100,channelCount:1,echoCancellation:!1,noiseSuppression:!1,autoGainControl:!1},noiseFilter:{highpassFreq:80,lowpassFreq:800,notchFreq:60,Q:.7}};exports.AudioManager=e.AudioManager;exports.ErrorNotificationSystem=e.ErrorNotificationSystem;exports.MicrophoneController=e.MicrophoneController;exports.MicrophoneLifecycleManager=e.MicrophoneLifecycleManager;exports.NoiseFilter=e.NoiseFilter;exports.PitchDetector=e.PitchDetector;exports.CalibrationSystem=o.CalibrationSystem;exports.HarmonicCorrection=o.HarmonicCorrection;exports.VoiceAnalyzer=o.VoiceAnalyzer;exports.FrequencyUtils=i.FrequencyUtils;exports.MusicTheory=i.MusicTheory;exports.DeviceDetection=r.DeviceDetection;exports.BUILD_DATE=n;exports.DEFAULT_CONFIG=c;exports.VERSION=t;
//# sourceMappingURL=index.js.map
