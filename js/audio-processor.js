/**
 * 音声処理統合モジュール - pitchpro-audio連携
 * 
 * @version 1.0.0
 * @description pitchpro-audio-processingとdata-manager.jsの統合レイヤー
 * @author Claude Code
 * @features リアルタイム音程検出・セッション管理・エラーハンドリング
 */

class AudioProcessor {
  constructor() {
    this.audioManager = null;
    this.pitchDetector = null;
    this.micController = null;
    this.deviceSpecs = null;
    
    // 検出状態
    this.isDetecting = false;
    this.detectionCallbacks = {
      onPitchUpdate: null,
      onVolumeUpdate: null,
      onError: null,
      onStateChange: null
    };
    
    // パフォーマンス設定
    this.config = {
      pitchDetector: {
        fftSize: 4096,
        smoothing: 0.1,
        clarityThreshold: 0.6,
        minVolumeAbsolute: 0.01
      },
      audioManager: {
        sampleRate: 44100,
        channelCount: 1,
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false
      },
      detection: {
        updateInterval: 16, // 60FPS
        minClarityForEvaluation: 0.8
      }
    };
    
    // エラーハンドリング
    this.errorThresholds = {
      clarity: 0.6,
      volume: 30,
      frequency: { min: 65, max: 1200 }
    };
  }

  /**
   * オーディオシステムを初期化
   */
  async initialize() {
    try {
      // pitchpro-audioライブラリの動的インポート
      const { 
        AudioManager, 
        PitchDetector, 
        MicrophoneController,
        DeviceDetection 
      } = await this.loadPitchProLibrary();

      // デバイス検出
      this.deviceSpecs = DeviceDetection.getDeviceSpecs();
      console.log('📱 検出デバイス:', this.deviceSpecs);

      // デバイス別設定最適化
      this.optimizeConfigForDevice();

      // コンポーネント初期化
      this.micController = new MicrophoneController();
      this.audioManager = new AudioManager(this.config.audioManager);
      this.pitchDetector = new PitchDetector(this.audioManager, this.config.pitchDetector);

      // マイクコントローラーコールバック設定
      this.micController.setCallbacks({
        onError: (error) => this.handleError('microphone', error),
        onStateChange: (state) => this.handleStateChange(state)
      });

      // 音程検出コールバック設定
      this.pitchDetector.setCallbacks({
        onPitchUpdate: (result) => this.processPitchDetection(result)
      });

      // マイク初期化
      const resources = await this.micController.initialize();
      
      // 音程検出器初期化
      await this.pitchDetector.initialize();

      console.log('🎵 AudioProcessor初期化完了');
      return { success: true, deviceSpecs: this.deviceSpecs };
      
    } catch (error) {
      this.handleError('initialization', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * pitchpro-audioライブラリを動的ロード
   */
  async loadPitchProLibrary() {
    try {
      // ESModuleとして動的インポート
      const module = await import('./pitchpro-audio/index.esm.js');
      return module;
    } catch (error) {
      // フォールバック: CommonJSとして試行
      console.warn('ESModule読み込み失敗、CommonJSを試行:', error);
      const script = document.createElement('script');
      script.src = './js/pitchpro-audio/index.js';
      document.head.appendChild(script);
      
      return new Promise((resolve, reject) => {
        script.onload = () => {
          if (window.PitchPro) {
            resolve(window.PitchPro);
          } else {
            reject(new Error('PitchProライブラリ読み込み失敗'));
          }
        };
        script.onerror = reject;
      });
    }
  }

  /**
   * デバイス別設定最適化
   */
  optimizeConfigForDevice() {
    if (!this.deviceSpecs) return;

    // デバイス別感度調整
    const sensitivityMultiplier = this.deviceSpecs.sensitivity || 1.0;
    this.config.pitchDetector.minVolumeAbsolute *= sensitivityMultiplier;

    // iOS特別設定
    if (this.deviceSpecs.isIOS) {
      this.config.audioManager.echoCancellation = true;
      this.config.pitchDetector.smoothing = 0.2; // より滑らか
    }

    // ローエンドデバイス最適化
    if (this.deviceSpecs.deviceType === 'mobile' && this.deviceSpecs.isLowEnd) {
      this.config.pitchDetector.fftSize = 2048; // 軽量化
      this.config.detection.updateInterval = 32; // 30FPS
    }

    console.log('⚙️ デバイス最適化完了:', {
      感度: sensitivityMultiplier,
      FFTサイズ: this.config.pitchDetector.fftSize,
      更新間隔: this.config.detection.updateInterval
    });
  }

  /**
   * リアルタイム音程検出を開始
   */
  startDetection() {
    if (!this.pitchDetector) {
      throw new Error('AudioProcessor未初期化');
    }

    this.isDetecting = true;
    this.pitchDetector.startDetection();
    console.log('🎤 音程検出開始');
  }

  /**
   * 音程検出を停止
   */
  stopDetection() {
    if (this.pitchDetector && this.isDetecting) {
      this.pitchDetector.stopDetection();
      this.isDetecting = false;
      console.log('🛑 音程検出停止');
    }
  }

  /**
   * 音程検出結果を処理
   */
  processPitchDetection(pitchResult) {
    // データ品質検証
    const validation = this.validateDetectionResult(pitchResult);
    
    if (!validation.isValid) {
      console.warn('⚠️ 検出品質不足:', validation.issues);
      return;
    }

    // コールバック実行
    if (this.detectionCallbacks.onPitchUpdate) {
      this.detectionCallbacks.onPitchUpdate(pitchResult);
    }

    if (this.detectionCallbacks.onVolumeUpdate) {
      this.detectionCallbacks.onVolumeUpdate(pitchResult.volume);
    }
  }

  /**
   * 検出結果の品質検証
   */
  validateDetectionResult(result) {
    const issues = [];
    
    if (result.clarity < this.errorThresholds.clarity) {
      issues.push('clarity_low');
    }
    
    if (result.volume < this.errorThresholds.volume) {
      issues.push('volume_low');
    }
    
    if (result.frequency < this.errorThresholds.frequency.min || 
        result.frequency > this.errorThresholds.frequency.max) {
      issues.push('frequency_out_of_range');
    }

    return {
      isValid: issues.length === 0,
      issues,
      result
    };
  }

  /**
   * マイクテスト機能
   */
  async testMicrophone(duration = 5000) {
    if (!this.micController) {
      throw new Error('MicrophoneController未初期化');
    }

    try {
      const testResult = await this.micController.testMicrophone(duration);
      
      console.log('🧪 マイクテスト完了:', {
        成功: testResult.success,
        音量: testResult.volume?.toFixed(1),
        周波数: testResult.frequency?.toFixed(0),
        継続時間: testResult.duration + 'ms'
      });

      return testResult;
    } catch (error) {
      this.handleError('microphone_test', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 音域測定機能
   */
  async measureVoiceRange() {
    // TODO: VoiceAnalyzerを使用した音域測定実装
    // この機能は次期実装で追加予定
    console.log('🎯 音域測定機能：次期実装予定');
    return null;
  }

  /**
   * コールバック設定
   */
  setCallbacks(callbacks) {
    this.detectionCallbacks = { ...this.detectionCallbacks, ...callbacks };
  }

  /**
   * エラーハンドリング
   */
  handleError(context, error) {
    console.error(`[AudioProcessor] ${context}:`, error);
    
    // DataManagerにエラーログ保存
    const errorLog = {
      timestamp: new Date().toISOString(),
      context,
      error: error.message,
      deviceSpecs: this.deviceSpecs
    };

    // エラーコールバック実行
    if (this.detectionCallbacks.onError) {
      this.detectionCallbacks.onError(context, error);
    }
  }

  /**
   * 状態変更ハンドリング
   */
  handleStateChange(state) {
    console.log('🔄 AudioProcessor状態変更:', state);
    
    if (this.detectionCallbacks.onStateChange) {
      this.detectionCallbacks.onStateChange(state);
    }
  }

  /**
   * リソースクリーンアップ
   */
  cleanup() {
    this.stopDetection();
    
    if (this.micController) {
      this.micController.cleanup?.();
    }
    
    if (this.pitchDetector) {
      this.pitchDetector.cleanup?.();
    }
    
    if (this.audioManager) {
      this.audioManager.cleanup?.();
    }

    console.log('🧹 AudioProcessorリソース解放完了');
  }

  /**
   * ヘルスチェック
   */
  checkHealth() {
    if (!this.micController) {
      return { healthy: false, issues: ['not_initialized'] };
    }

    const micHealth = this.micController.checkHealth?.() || { healthy: true };
    
    return {
      healthy: micHealth.healthy && this.audioManager && this.pitchDetector,
      issues: micHealth.issues || [],
      deviceSpecs: this.deviceSpecs,
      isDetecting: this.isDetecting
    };
  }

  /**
   * 設定を動的更新
   */
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    
    // 音程検出器の設定更新
    if (this.pitchDetector && newConfig.pitchDetector) {
      this.pitchDetector.updateConfig?.(newConfig.pitchDetector);
    }
  }

  /**
   * デバイス品質レポート生成
   */
  generateDeviceReport() {
    const health = this.checkHealth();
    
    return {
      device: this.deviceSpecs,
      health,
      config: this.config,
      performance: {
        detectionActive: this.isDetecting,
        lastUpdate: new Date().toISOString()
      }
    };
  }
}

// グローバル公開
window.AudioProcessor = AudioProcessor;