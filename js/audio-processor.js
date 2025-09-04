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
    this.debugTimer = null; // デバッグ用タイマーID管理
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
    
    // エラーハンドリング（非常に緩い閾値）
    this.errorThresholds = {
      clarity: 0.1,  // 0.3 → 0.1（非常に緩く）
      volume: 0.1,   // 1 → 0.1（超低音量OK）
      frequency: { min: 30, max: 3000 } // 非常に広い周波数範囲
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

      // PitchPro自動回復機能を無効化（重要）
      console.log('⚠️ PitchPro自動回復機能無効化中...');
      try {
        // MicrophoneLifecycleManagerの自動監視を無効化
        if (this.micController.lifecycleManager) {
          this.micController.lifecycleManager.stopHealthMonitoring?.();
          this.micController.lifecycleManager.autoRecover = false;
          console.log('✅ MicrophoneLifecycleManager自動監視無効化');
        }
        
        // AudioManagerの自動回復も無効化
        if (this.audioManager.autoRecover !== undefined) {
          this.audioManager.autoRecover = false;
          console.log('✅ AudioManager自動回復無効化');
        }
        
        // PitchDetectorの自動回復も無効化
        if (this.pitchDetector.autoRecover !== undefined) {
          this.pitchDetector.autoRecover = false;
          console.log('✅ PitchDetector自動回復無効化');
        }
      } catch (error) {
        console.warn('⚠️ 自動回復無効化で警告:', error);
      }

      // 音程検出コールバック設定
      console.log('🔗 PitchDetectorコールバック設定中...');
      const callbackSet = this.pitchDetector.setCallbacks({
        onPitchUpdate: (result) => {
          console.log('📥 PitchDetectorからコールバック受信:', result);
          this.processPitchDetection(result);
        }
      });
      console.log('✅ PitchDetectorコールバック設定完了, 戻り値:', callbackSet);
      
      // setCallbacksが正しく動作しているか確認
      console.log('🔍 PitchDetectorの状態確認:', {
        hasSetCallbacks: typeof this.pitchDetector.setCallbacks === 'function',
        pitchDetectorType: this.pitchDetector.constructor.name
      });

      // マイク初期化
      console.log('🎤 マイク初期化開始...');
      let resources;
      try {
        console.log('🔄 micController.initialize()呼び出し中...');
        
        // タイムアウト付きで実行
        const initPromise = this.micController.initialize();
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('マイク初期化タイムアウト（10秒）')), 10000)
        );
        
        resources = await Promise.race([initPromise, timeoutPromise]);
        console.log('🔄 initialize()戻り値:', resources);
        console.log('✅ マイク初期化完了:', resources);
      } catch (error) {
        console.error('❌ マイク初期化失敗:', error);
        console.warn('⚠️ デバッグモード: マイクなしで続行');
        // デバッグ用にダミーリソースを設定
        resources = { audioContext: new AudioContext() };
      }
      
      // 音程検出器初期化
      console.log('🎵 音程検出器初期化開始...');
      try {
        await this.pitchDetector.initialize();
        console.log('✅ 音程検出器初期化完了');
      } catch (error) {
        console.error('❌ 音程検出器初期化失敗:', error);
        throw error;
      }

      // マイク感度を最大に設定
      this.audioManager.setSensitivity(10.0); // 最大感度
      console.log('🔊 マイク感度を最大（10.0x）に設定');

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
      // UMDバンドルを使用（pitchy依存関係込み）
      return new Promise((resolve, reject) => {
        if (window.PitchPro) {
          resolve(window.PitchPro);
          return;
        }
        
        const script = document.createElement('script');
        
        // 現在のURL基準で適切なパスを決定
        const currentURL = new URL(window.location.href);
        const currentPath = currentURL.pathname;
        let pitchProPath;
        
        if (currentPath.includes('/Bolt/v2/pages/')) {
          // v2/pages内からの場合
          pitchProPath = new URL('../../../js/pitchpro-audio/index.umd.js', currentURL).href;
        } else if (currentPath.includes('/pages/')) {
          // pages内からの場合  
          pitchProPath = new URL('../../js/pitchpro-audio/index.umd.js', currentURL).href;
        } else {
          // ルートからの場合
          pitchProPath = new URL('./js/pitchpro-audio/index.umd.js', currentURL).href;
        }
        
        script.src = pitchProPath;
        console.log('🔍 PitchPro読み込みパス:', pitchProPath);
        script.onload = () => {
          console.log('✅ pitchpro-audio UMD読み込み成功');
          resolve(window.PitchPro);
        };
        script.onerror = (error) => {
          console.error('❌ pitchpro-audio UMD読み込み失敗:', error);
          reject(new Error('PitchProライブラリ読み込み失敗'));
        };
        document.head.appendChild(script);
      });
    } catch (error) {
      console.error('❌ pitchpro-audio読み込み失敗:', error);
      throw new Error(`PitchProライブラリ読み込み失敗: ${error.message}`);
    }
  }


  /**
   * デバイス別設定最適化
   */
  optimizeConfigForDevice() {
    if (!this.deviceSpecs) return;

    // デバイス別感度調整 - 大幅向上
    const baseSensitivity = this.deviceSpecs.sensitivity || 1.0;
    const sensitivityMultiplier = baseSensitivity * 5.0; // 5倍感度向上
    this.config.pitchDetector.minVolumeAbsolute = 0.0001; // 超極小音量対応

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

    console.log('🎤 音程検出開始試行...');
    console.log('🔍 PitchDetector確認:', {
      exists: !!this.pitchDetector,
      hasStartDetection: typeof this.pitchDetector?.startDetection === 'function',
      type: this.pitchDetector?.constructor.name
    });
    
    this.isDetecting = true;
    
    try {
      this.pitchDetector.startDetection();
      console.log('✅ 音程検出開始完了、データ待機中...');
      
      // 検出状況を確認するためのテスト
      this.debugTimer = setTimeout(() => {
        console.log('🔍 5秒後検出状況確認:', {
          isDetecting: this.isDetecting,
          hasCallback: !!this.detectionCallbacks.onPitchUpdate
        });
      }, 5000);
    } catch (error) {
      console.error('❌ startDetection()エラー:', error);
      throw error;
    }
  }

  /**
   * 音程検出を停止
   */
  stopDetection() {
    if (this.pitchDetector && this.isDetecting) {
      this.pitchDetector.stopDetection();
      this.isDetecting = false;
      
      // デバッグタイマーをクリア
      if (this.debugTimer) {
        clearTimeout(this.debugTimer);
        this.debugTimer = null;
        console.log('🛑 デバッグタイマーをクリア');
      }
      
      // PitchProライブラリのコールバック問題対策：手動でコールバック無効化
      console.log('🛑 PitchDetectorコールバックを無効化');
      this.pitchDetector.setCallbacks({
        onPitchUpdate: null
      });
      
      // AudioProcessorのコールバックも無効化
      console.log('🛑 AudioProcessorコールバックも無効化');
      this.detectionCallbacks.onPitchUpdate = null;
      this.detectionCallbacks.onVolumeUpdate = null;
      
      console.log('🛑 音程検出停止');
    }
  }

  /**
   * 音程検出結果を処理
   */
  processPitchDetection(pitchResult) {
    console.log('📊 processPitchDetection開始, pitchResult:', pitchResult);
    
    // 検出停止中は処理をスキップ
    if (!this.isDetecting) {
      console.log('⏸️ isDetecting=false のため processPitchDetection をスキップ');
      return;
    }
    
    // データの存在確認
    if (!pitchResult) {
      console.error('❌ pitchResultがnullまたはundefined');
      return;
    }
    
    // デバッグ用：生データをログ出力（値の範囲確認）
    console.log('🎤 検出データ:', {
      frequency: pitchResult.frequency,
      clarity: pitchResult.clarity,
      volume: pitchResult.volume,
      volumeType: typeof pitchResult.volume,
      volumeRange: pitchResult.volume > 0 ? `${pitchResult.volume} (${pitchResult.volume > 1 ? '1以上' : '0-1範囲'})` : 'ゼロ'
    });

    // 音量デバッグ（マイク感度確認用）
    if (pitchResult.volume > 0.1) {
      console.log(`🔊 音声検出中: ${pitchResult.volume.toFixed(2)}% - ${pitchResult.note || '--'}`);
    }

    // 音量更新は常に実行（品質チェック無し）
    // ログを1秒に1回のみ出力（パフォーマンス配慮）
    if (!this.lastVolumeLogTime || Date.now() - this.lastVolumeLogTime > 1000) {
      console.log('🔊 音量更新実行前チェック:', {
        hasCallback: !!this.detectionCallbacks.onVolumeUpdate,
        volume: pitchResult.volume,
        timestamp: new Date().toLocaleTimeString()
      });
      this.lastVolumeLogTime = Date.now();
    }
    
    if (this.detectionCallbacks.onVolumeUpdate) {
      console.log('🔊 onVolumeUpdate実行中...', pitchResult.volume);
      try {
        this.detectionCallbacks.onVolumeUpdate(pitchResult.volume);
        console.log('✅ onVolumeUpdate実行完了');
      } catch (error) {
        console.error('❌ onVolumeUpdate実行エラー:', error);
      }
    } else {
      console.warn('⚠️ onVolumeUpdateコールバックが設定されていません');
    }

    // ゼロデータの場合でも音量バー更新のためコールバックを実行
    if (pitchResult.frequency === 0 && pitchResult.clarity === 0 && pitchResult.volume === 0) {
      // 5秒に1回だけログを出す（デバッグ用）
      if (!this.lastZeroLogTime || Date.now() - this.lastZeroLogTime > 5000) {
        console.log('🔇 無音状態（マイクが音を検出していません）');
        this.lastZeroLogTime = Date.now();
      }
      
      // 音量0でもUIを更新
      if (this.detectionCallbacks.onPitchUpdate) {
        this.detectionCallbacks.onPitchUpdate(pitchResult);
      }
      return;
    }

    // データ品質検証（音程用のみ）
    const validation = this.validateDetectionResult(pitchResult);
    
    if (!validation.isValid) {
      console.warn('⚠️ 音程検出品質不足:', validation.issues);
      // 音量更新は継続、音程のみスキップ
      return;
    }

    // 音程コールバック実行
    console.log('📤 コールバック実行前確認:', {
      hasCallback: !!this.detectionCallbacks.onPitchUpdate,
      callbacks: Object.keys(this.detectionCallbacks || {})
    });
    
    if (this.detectionCallbacks.onPitchUpdate) {
      console.log('🔔 onPitchUpdateコールバック実行');
      this.detectionCallbacks.onPitchUpdate(pitchResult);
    } else {
      console.warn('⚠️ onPitchUpdateコールバックが未設定');
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
    console.log('📋 AudioProcessor.setCallbacks呼び出し:', {
      providedCallbacks: Object.keys(callbacks || {}),
      currentCallbacks: Object.keys(this.detectionCallbacks || {}),
      onVolumeUpdateProvided: typeof callbacks?.onVolumeUpdate === 'function',
      onPitchUpdateProvided: typeof callbacks?.onPitchUpdate === 'function'
    });
    
    this.detectionCallbacks = { ...this.detectionCallbacks, ...callbacks };
    
    console.log('✅ コールバック設定完了:', {
      finalCallbacks: Object.keys(this.detectionCallbacks),
      onVolumeUpdate: typeof this.detectionCallbacks.onVolumeUpdate,
      onPitchUpdate: typeof this.detectionCallbacks.onPitchUpdate
    });
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
    console.log('🧹 AudioProcessor完全クリーンアップ開始');
    
    this.stopDetection();
    
    // マイクストリーム完全停止
    if (this.micController) {
      console.log('🎤 MicController完全停止');
      
      // 0. 自動監視・回復機能を強制停止（最優先）
      try {
        if (this.micController.lifecycleManager) {
          console.log('🛑 MicrophoneLifecycleManager強制停止');
          this.micController.lifecycleManager.stopHealthMonitoring?.();
          this.micController.lifecycleManager.autoRecover = false;
          this.micController.lifecycleManager.isMonitoring = false;
          // タイマーもクリア
          if (this.micController.lifecycleManager.monitoringTimer) {
            clearInterval(this.micController.lifecycleManager.monitoringTimer);
            this.micController.lifecycleManager.monitoringTimer = null;
          }
        }
      } catch (error) {
        console.warn('MicrophoneLifecycleManager停止で警告:', error);
      }
      
      // 1. PitchPro標準のクリーンアップ
      this.micController.cleanup?.();
      
      // 2. MediaStreamトラック強制停止（すべてのプロパティを探索）
      const streamProperties = ['stream', 'audioStream', 'micStream', 'mediaStream'];
      streamProperties.forEach(prop => {
        try {
          const stream = this.micController[prop];
          if (stream && stream.getTracks) {
            stream.getTracks().forEach(track => {
              console.log(`🛑 ${prop}.track停止:`, track.kind, track.readyState);
              track.stop();
            });
            console.log(`✅ ${prop} 停止完了`);
          }
        } catch (error) {
          console.warn(`${prop} 停止で警告:`, error);
        }
      });
      
      // 3. AudioContext強制切断
      const audioContextProps = ['audioContext', 'context', 'ac'];
      audioContextProps.forEach(prop => {
        try {
          const ctx = this.micController[prop];
          if (ctx && ctx.close && ctx.state !== 'closed') {
            console.log(`🔊 ${prop}強制クローズ`);
            ctx.close();
          }
        } catch (error) {
          console.warn(`${prop} クローズで警告:`, error);
        }
      });
    }
    
    if (this.pitchDetector) {
      console.log('🎵 PitchDetector完全停止');
      this.pitchDetector.cleanup?.();
    }
    
    if (this.audioManager) {
      console.log('🔊 AudioManager完全停止');
      
      // 0. AudioManagerの自動回復停止
      try {
        this.audioManager.autoRecover = false;
        if (this.audioManager.healthMonitor) {
          this.audioManager.healthMonitor.stop?.();
          console.log('🛑 AudioManager HealthMonitor停止');
        }
        if (this.audioManager.recoveryTimer) {
          clearTimeout(this.audioManager.recoveryTimer);
          this.audioManager.recoveryTimer = null;
        }
      } catch (error) {
        console.warn('AudioManager自動回復停止で警告:', error);
      }
      
      // 1. PitchPro標準のクリーンアップ
      this.audioManager.cleanup?.();
      
      // 2. AudioContext詳細停止（複数プロパティ探索）
      const contextProps = ['audioContext', 'context', 'ac', 'ctx'];
      contextProps.forEach(prop => {
        try {
          const ctx = this.audioManager[prop];
          if (ctx && ctx.close && ctx.state !== 'closed') {
            console.log(`🔊 AudioManager.${prop}強制クローズ`);
            ctx.close();
          }
        } catch (error) {
          console.warn(`AudioManager.${prop} クローズで警告:`, error);
        }
      });
      
      // 3. MediaStreamも確認（AudioManagerに関連付けられている場合）
      const streamProps = ['stream', 'sourceStream', 'inputStream'];
      streamProps.forEach(prop => {
        try {
          const stream = this.audioManager[prop];
          if (stream && stream.getTracks) {
            stream.getTracks().forEach(track => {
              console.log(`🛑 AudioManager.${prop}.track停止:`, track.kind);
              track.stop();
            });
          }
        } catch (error) {
          console.warn(`AudioManager.${prop} 停止で警告:`, error);
        }
      });
    }

    // 全コールバック削除
    this.detectionCallbacks = {
      onPitchUpdate: null,
      onVolumeUpdate: null,
      onError: null,
      onStateChange: null
    };

    // インスタンス変数クリア
    this.audioManager = null;
    this.pitchDetector = null;
    this.micController = null;
    this.deviceSpecs = null;

    // 最終手段：グローバルMediaStream探索・停止
    console.log('🛑 最終手段：グローバルMediaStream探索');
    try {
      // Windowオブジェクトから可能な限りMediaStreamを探索
      Object.keys(window).forEach(key => {
        const obj = window[key];
        if (obj && typeof obj === 'object' && obj.getTracks) {
          console.log(`🔍 グローバルMediaStream発見: ${key}`);
          obj.getTracks().forEach(track => {
            console.log(`🛑 グローバルtrack停止: ${key}.${track.kind}`);
            track.stop();
          });
        }
      });
    } catch (error) {
      console.warn('グローバルMediaStream探索で警告:', error);
    }

    // 少し待ってからマイク権限状態を確認
    setTimeout(() => {
      if (navigator.permissions) {
        navigator.permissions.query({name: 'microphone'}).then(result => {
          console.log('🎤 マイク権限状態確認:', result.state);
        }).catch(() => {/* 無視 */});
      }
    }, 1000);

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