/**
 * 最小機能オーディオプロセッサー
 * Web Audio API + pitchy直接実装
 */
class SimpleAudioProcessor {
  constructor() {
    this.audioContext = null;
    this.mediaStream = null;
    this.sourceNode = null;
    this.analyser = null;
    this.isDetecting = false;
    this.detectInterval = null;
    
    this.callbacks = {
      onPitchUpdate: null,
      onVolumeUpdate: null,
      onError: null
    };
    
    // pitchy検出器
    this.detector = null;
    this.bufferSize = 4096;
    this.buffer = new Float32Array(this.bufferSize);
  }

  async initialize() {
    try {
      console.log('🎤 SimpleAudioProcessor初期化開始');
      
      // AudioContext作成
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      await this.audioContext.resume();
      
      // マイクアクセス
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 44100,
          channelCount: 1,
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        }
      });
      
      // オーディオノード設定
      this.sourceNode = this.audioContext.createMediaStreamSource(this.mediaStream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = this.bufferSize;
      this.analyser.smoothingTimeConstant = 0.1;
      
      this.sourceNode.connect(this.analyser);
      
      // 基本音程検出準備完了
      
      console.log('✅ SimpleAudioProcessor初期化完了');
      return { success: true };
      
    } catch (error) {
      console.error('❌ 初期化エラー:', error);
      return { success: false, error: error.message };
    }
  }

  // pitchyを使わない基本実装

  setCallbacks(callbacks) {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  startDetection() {
    if (!this.analyser) {
      throw new Error('未初期化');
    }

    this.isDetecting = true;
    console.log('🎤 音程検出開始');
    
    this.detectInterval = setInterval(() => {
      this.processAudio();
    }, 16); // 60FPS
  }

  stopDetection() {
    this.isDetecting = false;
    if (this.detectInterval) {
      clearInterval(this.detectInterval);
      this.detectInterval = null;
    }
    console.log('🛑 音程検出停止');
  }

  processAudio() {
    // 音声データ取得
    this.analyser.getFloatTimeDomainData(this.buffer);
    
    // 音量計算（より敏感に）
    let sum = 0;
    for (let i = 0; i < this.buffer.length; i++) {
      sum += Math.abs(this.buffer[i]);
    }
    const volume = (sum / this.buffer.length) * 10; // 10倍で増幅
    
    // 音量コールバック
    if (this.callbacks.onVolumeUpdate) {
      this.callbacks.onVolumeUpdate(volume);
    }

    // 基本的な周波数検出（FFTベース）
    const frequency = this.detectPitchBasic();
    const clarity = volume > 0.01 ? 0.8 : 0.1; // 音量ベースの簡易clarity
    
    const result = {
      frequency: frequency || 0,
      clarity: clarity,
      volume: volume,
      note: frequency ? this.frequencyToNote(frequency) : '--'
    };

    // 音程コールバック
    if (this.callbacks.onPitchUpdate) {
      this.callbacks.onPitchUpdate(result);
    }
  }

  detectPitchBasic() {
    // FFTデータ取得
    const freqData = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(freqData);
    
    // 最大ピークを探す
    let maxIndex = 0;
    let maxValue = 0;
    
    for (let i = 1; i < freqData.length; i++) {
      if (freqData[i] > maxValue) {
        maxValue = freqData[i];
        maxIndex = i;
      }
    }
    
    if (maxValue < 50) return 0; // 音量が低すぎる
    
    // 周波数計算
    const frequency = maxIndex * this.audioContext.sampleRate / this.analyser.fftSize;
    
    // 人声範囲のみ（80-800Hz）
    if (frequency < 80 || frequency > 800) return 0;
    
    return frequency;
  }

  frequencyToNote(frequency) {
    const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const A4 = 440;
    const semitone = Math.round(12 * Math.log2(frequency / A4));
    const octave = Math.floor((semitone + 9) / 12) + 4;
    const note = noteNames[(semitone + 120) % 12];
    return `${note}${octave}`;
  }

  cleanup() {
    this.stopDetection();
    
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
    }
    
    if (this.sourceNode) {
      this.sourceNode.disconnect();
    }
    
    console.log('🧹 SimpleAudioProcessor解放完了');
  }
}

window.SimpleAudioProcessor = SimpleAudioProcessor;