/**
 * MicrophoneManager - 安定したマイク制御システム
 * 
 * 前回のpitch-trainingプロジェクトで安定動作していたマイク制御を復活
 * PitchProライブラリの複雑なMicrophoneControllerは使わず、
 * 基本的なAudioManagerとPitchDetectorのみを使用
 */

class MicrophoneManager {
  constructor() {
    // AudioManager（前回の安定版）を使用
    this.audioManager = window.audioManagerStable;
    
    // PitchProライブラリ（基本機能のみ）
    this.pitchDetector = null;
    
    // 状態管理
    this.isInitialized = false;
    this.isDetecting = false;
    this.isPermissionGranted = false;
    
    // コールバック
    this.callbacks = {
      onPitchUpdate: null,
      onVolumeUpdate: null,
      onError: null,
      onPermissionChange: null,
      onStateChange: null
    };
    
    // 音量計算用
    this.volumeAnalyser = null;
    this.volumeDataArray = null;
    this.volumeUpdateInterval = null;
    
    // プラットフォーム設定
    this.platformSpecs = null;
    
    console.log('📱 [MicrophoneManager] 初期化完了（安定版AudioManager使用）');
  }

  /**
   * コールバック設定
   */
  setCallbacks(callbacks) {
    this.callbacks = { ...this.callbacks, ...callbacks };
    console.log('📞 [MicrophoneManager] コールバック設定完了:', Object.keys(callbacks));
  }

  /**
   * マイク許可チェック
   */
  async checkPermission() {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        return 'denied';
      }

      // 権限APIを使用して確認
      if (navigator.permissions) {
        try {
          const result = await navigator.permissions.query({ name: 'microphone' });
          return result.state; // 'granted', 'denied', 'prompt'
        } catch (e) {
          console.log('🔍 [MicrophoneManager] 権限API使用不可 - フォールバック実行');
        }
      }

      // フォールバック: 実際にアクセスしてみる
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          audio: { 
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false
          } 
        });
        stream.getTracks().forEach(track => track.stop());
        return 'granted';
      } catch {
        return 'denied';
      }
    } catch (error) {
      console.error('❌ [MicrophoneManager] 権限チェックエラー:', error);
      return 'denied';
    }
  }

  /**
   * 初期化（マイク許可要求含む）
   */
  async initialize() {
    try {
      console.log('🎤 [MicrophoneManager] 初期化開始');
      
      this._updateState('initializing');

      // 1. AudioManager初期化（安定版）
      console.log('🔧 [MicrophoneManager] AudioManager初期化中...');
      const audioResources = await this.audioManager.initialize();
      console.log('✅ [MicrophoneManager] AudioManager初期化完了');

      // 2. プラットフォーム設定取得
      this.platformSpecs = this.audioManager.getPlatformSpecs();
      console.log('🔧 [MicrophoneManager] プラットフォーム設定:', this.platformSpecs);

      // 3. PitchDetector初期化（PitchProライブラリ基本機能）
      if (window.PitchPro && window.PitchPro.PitchDetector) {
        console.log('🔧 [MicrophoneManager] PitchDetector初期化中...');
        
        // 軽量なPitchDetector設定
        const pitchConfig = {
          fftSize: 4096,
          smoothing: 0.1,
          clarityThreshold: 0.6,
          minVolumeAbsolute: 0.01
        };
        
        this.pitchDetector = new window.PitchPro.PitchDetector(
          audioResources.audioContext,
          pitchConfig
        );
        
        // AudioManagerのAnalyserを使用してPitchDetectorに接続
        const analyser = this.audioManager.createAnalyser('pitch-detection', {
          fftSize: 4096,
          smoothingTimeConstant: 0.1,
          useFilters: true // ノイズフィルタリング有効
        });
        
        // PitchDetectorにAnalyserを設定
        this.pitchDetector.setAnalyser(analyser);
        
        console.log('✅ [MicrophoneManager] PitchDetector初期化完了');
      } else {
        console.warn('⚠️ [MicrophoneManager] PitchProライブラリが見つかりません');
      }

      // 4. 音量検出用Analyser作成
      this._setupVolumeDetection();

      // 5. 権限状態更新
      this.isPermissionGranted = true;
      this.isInitialized = true;
      
      this._updateState('ready');
      this._notifyPermissionChange(true);

      console.log('✅ [MicrophoneManager] 全体初期化完了');
      
      return {
        audioContext: audioResources.audioContext,
        mediaStream: audioResources.mediaStream,
        platformSpecs: this.platformSpecs
      };

    } catch (error) {
      console.error('❌ [MicrophoneManager] 初期化エラー:', error);
      
      this.isPermissionGranted = false;
      this.isInitialized = false;
      
      this._updateState('error');
      this._notifyPermissionChange(false);
      this._notifyError(error);
      
      throw error;
    }
  }

  /**
   * 音量検出システム設定
   */
  _setupVolumeDetection() {
    try {
      // 音量専用Analyser作成
      this.volumeAnalyser = this.audioManager.createAnalyser('volume-detection', {
        fftSize: 1024,
        smoothingTimeConstant: 0.3,
        useFilters: false // 音量は生信号で検出
      });
      
      this.volumeDataArray = new Float32Array(this.volumeAnalyser.fftSize);
      
      console.log('✅ [MicrophoneManager] 音量検出システム設定完了');
    } catch (error) {
      console.error('❌ [MicrophoneManager] 音量検出システム設定エラー:', error);
    }
  }

  /**
   * 音程検出開始
   */
  startDetection() {
    if (!this.isInitialized) {
      throw new Error('MicrophoneManager not initialized. Call initialize() first.');
    }

    if (this.isDetecting) {
      console.log('⚠️ [MicrophoneManager] 既に検出中です');
      return;
    }

    try {
      console.log('🎵 [MicrophoneManager] 音程検出開始');
      
      // 1. PitchDetector開始
      if (this.pitchDetector) {
        this.pitchDetector.startDetection();
        
        // PitchDetectorのコールバック設定
        this.pitchDetector.setCallbacks({
          onPitchUpdate: (result) => {
            if (this.callbacks.onPitchUpdate) {
              this.callbacks.onPitchUpdate(result);
            }
          },
          onError: (error) => {
            this._notifyError(error);
          }
        });
      }

      // 2. 音量検出開始
      this._startVolumeDetection();

      this.isDetecting = true;
      this._updateState('detecting');

      console.log('✅ [MicrophoneManager] 音程検出開始完了');
      
    } catch (error) {
      console.error('❌ [MicrophoneManager] 検出開始エラー:', error);
      this._notifyError(error);
      throw error;
    }
  }

  /**
   * 音量検出開始
   */
  _startVolumeDetection() {
    if (!this.volumeAnalyser || !this.volumeDataArray) {
      console.warn('⚠️ [MicrophoneManager] 音量検出システム未初期化');
      return;
    }

    // 音量更新ループ開始
    const updateVolume = () => {
      if (!this.isDetecting) return;

      try {
        // 音量データ取得
        this.volumeAnalyser.getFloatTimeDomainData(this.volumeDataArray);

        // RMS音量計算（プラットフォーム対応）
        let sum = 0;
        for (let i = 0; i < this.volumeDataArray.length; i++) {
          sum += Math.abs(this.volumeDataArray[i]);
        }
        
        const rms = Math.sqrt(sum / this.volumeDataArray.length);
        const { divisor, gainCompensation, noiseThreshold } = this.platformSpecs;
        
        // プラットフォーム別音量計算
        let volume = (rms * 100 * gainCompensation) / divisor;
        
        // ノイズ閾値以下は0%
        if (volume < noiseThreshold) {
          volume = 0;
        }
        
        // 100%上限
        volume = Math.min(100, volume);

        // 音量コールバック通知
        if (this.callbacks.onVolumeUpdate) {
          this.callbacks.onVolumeUpdate({
            volume: volume,
            rms: rms,
            threshold: noiseThreshold,
            deviceType: this.platformSpecs.deviceType
          });
        }

      } catch (error) {
        console.error('❌ [MicrophoneManager] 音量計算エラー:', error);
      }

      // 次の更新をスケジュール（60fps）
      this.volumeUpdateInterval = requestAnimationFrame(updateVolume);
    };

    updateVolume();
    console.log('🔊 [MicrophoneManager] 音量検出開始');
  }

  /**
   * 検出停止
   */
  stopDetection() {
    if (!this.isDetecting) {
      console.log('⚠️ [MicrophoneManager] 検出は既に停止しています');
      return;
    }

    try {
      console.log('🛑 [MicrophoneManager] 検出停止中...');

      // 1. PitchDetector停止
      if (this.pitchDetector) {
        this.pitchDetector.stopDetection();
      }

      // 2. 音量検出停止
      if (this.volumeUpdateInterval) {
        cancelAnimationFrame(this.volumeUpdateInterval);
        this.volumeUpdateInterval = null;
      }

      this.isDetecting = false;
      this._updateState('ready');

      console.log('✅ [MicrophoneManager] 検出停止完了');
      
    } catch (error) {
      console.error('❌ [MicrophoneManager] 検出停止エラー:', error);
      this._notifyError(error);
    }
  }

  /**
   * マイク感度設定
   */
  setSensitivity(sensitivity) {
    if (this.audioManager) {
      this.audioManager.setSensitivity(sensitivity);
      console.log(`🎤 [MicrophoneManager] マイク感度設定: ${sensitivity}x`);
    }
  }

  /**
   * 現在の感度取得
   */
  getSensitivity() {
    return this.audioManager ? this.audioManager.getSensitivity() : 1.0;
  }

  /**
   * デバイス情報取得
   */
  getDeviceInfo() {
    return this.platformSpecs;
  }

  /**
   * 状態取得
   */
  getStatus() {
    return {
      isInitialized: this.isInitialized,
      isDetecting: this.isDetecting,
      isPermissionGranted: this.isPermissionGranted,
      audioManagerStatus: this.audioManager ? this.audioManager.getStatus() : null,
      platformSpecs: this.platformSpecs
    };
  }

  /**
   * クリーンアップ
   */
  cleanup() {
    console.log('🧹 [MicrophoneManager] クリーンアップ開始');

    // 検出停止
    this.stopDetection();

    // AudioManager Analyser削除
    if (this.audioManager) {
      this.audioManager.removeAnalyser('pitch-detection');
      this.audioManager.removeAnalyser('volume-detection');
      this.audioManager.release(['pitch-detection', 'volume-detection']);
    }

    // PitchDetector クリーンアップ
    if (this.pitchDetector) {
      this.pitchDetector.cleanup();
      this.pitchDetector = null;
    }

    // 状態リセット
    this.isInitialized = false;
    this.isDetecting = false;
    this.isPermissionGranted = false;
    this.volumeAnalyser = null;
    this.volumeDataArray = null;

    console.log('✅ [MicrophoneManager] クリーンアップ完了');
  }

  /**
   * 強制クリーンアップ
   */
  forceCleanup() {
    console.log('🚨 [MicrophoneManager] 強制クリーンアップ実行');
    this.cleanup();
    
    // AudioManagerも強制クリーンアップ
    if (this.audioManager) {
      this.audioManager.forceCleanup();
    }
  }

  // 内部通知メソッド
  _updateState(state) {
    if (this.callbacks.onStateChange) {
      this.callbacks.onStateChange(state);
    }
  }

  _notifyPermissionChange(granted) {
    if (this.callbacks.onPermissionChange) {
      this.callbacks.onPermissionChange(granted);
    }
  }

  _notifyError(error) {
    if (this.callbacks.onError) {
      this.callbacks.onError(error);
    }
  }
}

// グローバル露出（使用可能にする）
if (typeof window !== 'undefined') {
  window.MicrophoneManager = MicrophoneManager;
}