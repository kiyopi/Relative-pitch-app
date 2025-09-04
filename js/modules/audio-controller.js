// audio-controller.js - 音声処理統合モジュール
// PitchPro連携とマイクロフォン制御を統合

/**
 * 音声処理統合コントローラー
 * マイク初期化、音程検出、コールバック管理を担当
 */
class AudioController {
    constructor(deviceManager) {
        this.deviceManager = deviceManager;
        
        // PitchPro関連
        this.audioManager = null;
        this.pitchDetector = null;
        this.isInitialized = false;
        this.isDetecting = false;
        
        // 音声処理設定
        this.audioConfig = {
            sampleRate: 44100,
            channelCount: 1,
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false,
            googAutoGainControl: false,
            googNoiseSuppression: false,
            googEchoCancellation: false,
            googHighpassFilter: false,
            mozAutoGainControl: false,
            mozNoiseSuppression: false
        };
        
        // 検出設定
        this.detectionConfig = {
            fftSize: 4096,
            smoothing: 0.1,
            clarityThreshold: 0.6,
            minVolumeAbsolute: 0.01
        };
        
        // コールバック
        this.callbacks = {
            onPitchUpdate: null,
            onVolumeUpdate: null,
            onError: null,
            onInitialized: null,
            onDetectionStart: null,
            onDetectionStop: null
        };
    }

    /**
     * 音声システム初期化
     */
    async initialize() {
        if (this.isInitialized) {
            console.log('🎤 AudioController既に初期化済み');
            return { success: true, message: 'すでに初期化されています' };
        }

        try {
            // PitchProライブラリ確認 - 少し待ってリトライ
            if (!window.PitchPro) {
                console.log('🔄 PitchProライブラリ読み込み待機中...');
                await new Promise(resolve => setTimeout(resolve, 500)); // 500ms待機
                
                if (!window.PitchPro) {
                    throw new Error('PitchProライブラリが読み込まれていません');
                }
            }

            const { AudioManager, PitchDetector } = window.PitchPro;
            
            // デバイス設定適用
            const deviceSpecs = this.deviceManager.getSpecs();
            console.log('🔧 デバイス別設定適用:', deviceSpecs);

            // AudioManager初期化
            this.audioManager = new AudioManager(this.audioConfig);
            await this.audioManager.initialize();
            
            // デバイス別感度設定
            this.audioManager.setSensitivity(deviceSpecs.sensitivityMultiplier);
            console.log(`🎚️ マイク感度設定: ${deviceSpecs.sensitivityMultiplier}x`);

            // PitchDetector初期化
            this.pitchDetector = new PitchDetector(this.audioManager, this.detectionConfig);
            await this.pitchDetector.initialize();

            // コールバック設定
            this.setupPitchDetectorCallbacks();

            this.isInitialized = true;
            console.log('✅ AudioController初期化完了');

            // 初期化完了コールバック
            if (this.callbacks.onInitialized) {
                this.callbacks.onInitialized({ success: true, deviceSpecs });
            }

            return { 
                success: true, 
                message: '音声システム初期化完了',
                deviceSpecs 
            };

        } catch (error) {
            console.error('❌ AudioController初期化エラー:', error);
            
            if (this.callbacks.onError) {
                this.callbacks.onError(error);
            }

            return { 
                success: false, 
                message: `初期化失敗: ${error.message}`,
                error 
            };
        }
    }

    /**
     * PitchDetectorのコールバック設定
     */
    setupPitchDetectorCallbacks() {
        this.pitchDetector.setCallbacks({
            onPitchUpdate: (result) => {
                if (result && this.callbacks.onPitchUpdate) {
                    // デバイス別音量スケーリング
                    const scaledResult = this.applyDeviceScaling(result);
                    this.callbacks.onPitchUpdate(scaledResult);
                }
                
                if (result && this.callbacks.onVolumeUpdate) {
                    this.callbacks.onVolumeUpdate({
                        volume: result.volume,
                        scaledVolume: this.calculateScaledVolume(result.volume)
                    });
                }
            },
            onError: (error) => {
                console.error('🎤 音程検出エラー:', error);
                if (this.callbacks.onError) {
                    this.callbacks.onError(error);
                }
            }
        });
    }

    /**
     * デバイス別スケーリング適用
     */
    applyDeviceScaling(pitchResult) {
        const deviceSpecs = this.deviceManager.getSpecs();
        
        return {
            ...pitchResult,
            scaledVolume: this.calculateScaledVolume(pitchResult.volume),
            deviceType: deviceSpecs.deviceType,
            sensitivityMultiplier: deviceSpecs.sensitivityMultiplier
        };
    }

    /**
     * 音量スケーリング計算
     */
    calculateScaledVolume(rawVolume) {
        const deviceSpecs = this.deviceManager.getSpecs();
        const baseScale = 2.0; // ベース倍率
        
        return rawVolume * baseScale * deviceSpecs.volumeBarScale;
    }

    /**
     * 音程検出開始
     */
    startDetection() {
        if (!this.isInitialized) {
            const error = new Error('先にinitialize()を実行してください');
            if (this.callbacks.onError) {
                this.callbacks.onError(error);
            }
            return { success: false, message: 'システム未初期化' };
        }

        if (this.isDetecting) {
            return { success: true, message: '検出は既に開始されています' };
        }

        try {
            const success = this.pitchDetector.startDetection();
            
            if (success) {
                this.isDetecting = true;
                console.log('🎵 音程検出開始');
                
                if (this.callbacks.onDetectionStart) {
                    this.callbacks.onDetectionStart();
                }
                
                return { success: true, message: '音程検出開始' };
            } else {
                throw new Error('音程検出の開始に失敗しました');
            }
        } catch (error) {
            console.error('❌ 検出開始エラー:', error);
            
            if (this.callbacks.onError) {
                this.callbacks.onError(error);
            }
            
            return { success: false, message: error.message, error };
        }
    }

    /**
     * 音程検出停止
     */
    stopDetection() {
        if (!this.isDetecting) {
            return { success: true, message: '検出は停止中です' };
        }

        try {
            this.pitchDetector.stopDetection();
            this.isDetecting = false;
            console.log('🔇 音程検出停止');
            
            if (this.callbacks.onDetectionStop) {
                this.callbacks.onDetectionStop();
            }
            
            return { success: true, message: '音程検出停止' };
        } catch (error) {
            console.error('❌ 検出停止エラー:', error);
            
            if (this.callbacks.onError) {
                this.callbacks.onError(error);
            }
            
            return { success: false, message: error.message, error };
        }
    }

    /**
     * マイク感度調整
     */
    setSensitivity(multiplier) {
        if (!this.audioManager) {
            return { success: false, message: 'AudioManager未初期化' };
        }

        try {
            this.audioManager.setSensitivity(multiplier);
            console.log(`🎚️ マイク感度を${multiplier}xに設定`);
            return { success: true, message: `感度を${multiplier}xに調整` };
        } catch (error) {
            console.error('❌ 感度調整エラー:', error);
            return { success: false, message: error.message, error };
        }
    }

    /**
     * 検出設定更新
     */
    updateDetectionConfig(config) {
        if (!this.pitchDetector) {
            return { success: false, message: 'PitchDetector未初期化' };
        }

        try {
            // 設定をマージ
            this.detectionConfig = { ...this.detectionConfig, ...config };
            
            // PitchDetectorに適用（可能な場合）
            if (this.pitchDetector.updateConfig) {
                this.pitchDetector.updateConfig(this.detectionConfig);
            }
            
            console.log('⚙️ 検出設定を更新:', config);
            return { success: true, message: '検出設定更新完了' };
        } catch (error) {
            console.error('❌ 設定更新エラー:', error);
            return { success: false, message: error.message, error };
        }
    }

    /**
     * コールバック登録
     */
    setCallback(eventName, callback) {
        if (this.callbacks.hasOwnProperty(eventName)) {
            this.callbacks[eventName] = callback;
            console.log(`📞 コールバック登録: ${eventName}`);
        } else {
            console.warn(`⚠️ 未知のコールバック名: ${eventName}`);
        }
    }

    /**
     * 複数コールバック一括登録
     */
    setCallbacks(callbackMap) {
        Object.entries(callbackMap).forEach(([eventName, callback]) => {
            this.setCallback(eventName, callback);
        });
    }

    /**
     * システムクリーンアップ
     */
    cleanup() {
        try {
            if (this.isDetecting) {
                this.stopDetection();
            }
            
            if (this.pitchDetector) {
                this.pitchDetector = null;
            }
            
            if (this.audioManager) {
                // AudioManagerのクリーンアップがあれば実行
                if (this.audioManager.cleanup) {
                    this.audioManager.cleanup();
                }
                this.audioManager = null;
            }
            
            this.isInitialized = false;
            console.log('🧹 AudioController クリーンアップ完了');
            
        } catch (error) {
            console.error('❌ クリーンアップエラー:', error);
        }
    }

    /**
     * 状態取得
     */
    getStatus() {
        return {
            isInitialized: this.isInitialized,
            isDetecting: this.isDetecting,
            deviceSpecs: this.deviceManager?.getSpecs(),
            audioConfig: this.audioConfig,
            detectionConfig: this.detectionConfig
        };
    }
}

// モジュールエクスポート
window.AudioController = AudioController;