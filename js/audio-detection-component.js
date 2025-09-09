/**
 * AudioDetectionComponent - PitchProベースの音声検出コンポーネント
 * 
 * 既存のPitchProライブラリ（AudioManager + PitchDetector）をラップして
 * 統合UI自動更新機能を提供する高レベルコンポーネント
 */
class AudioDetectionComponent {
    constructor(config = {}) {
        // システム変数
        this.audioManager = null;
        this.pitchDetector = null;
        this.isInitialized = false;
        this.isDetecting = false;
        this.callbacks = {};
        
        // UI要素
        this.volumeBarElement = null;
        this.volumeTextElement = null;
        this.frequencyElement = null;
        this.noteElement = null;
        
        // 設定
        this.config = {
            // UI要素セレクター
            volumeBarSelector: null,
            volumeTextSelector: null,
            frequencySelector: null,
            noteSelector: null,
            
            // 検出設定
            clarityThreshold: 0.4,
            minVolumeAbsolute: 0.003,
            
            // デバイス最適化
            deviceOptimization: true,
            
            // UI更新レート
            uiUpdateInterval: 50, // 20fps
            
            // デバッグ
            debug: false,
            logPrefix: '🎵 AudioDetection',
            
            ...config
        };
        
        // UI更新タイマー
        this.uiUpdateTimer = null;
        
        console.log(`${this.config.logPrefix} [AudioDetectionComponent] 初期化完了`);
    }
    
    /**
     * コールバック設定
     */
    setCallbacks(callbacks) {
        this.callbacks = { ...this.callbacks, ...callbacks };
    }
    
    /**
     * 初期化
     */
    async initialize() {
        try {
            console.log(`${this.config.logPrefix} [AudioDetectionComponent] 初期化開始`);
            
            // PitchProライブラリの確認
            if (!window.PitchPro) {
                throw new Error('PitchProライブラリが読み込まれていません');
            }
            
            const { AudioManager, PitchDetector } = window.PitchPro;
            
            // AudioManager初期化
            this.audioManager = new AudioManager({
                sampleRate: 44100,
                channelCount: 1,
                echoCancellation: false,
                noiseSuppression: false,
                autoGainControl: false
            });
            
            await this.audioManager.initialize();
            
            // デバイス最適化
            if (this.config.deviceOptimization) {
                const deviceSpecs = this.audioManager.getPlatformSpecs();
                this.audioManager.setSensitivity(deviceSpecs.sensitivity);
                console.log(`${this.config.logPrefix} デバイス最適化: ${deviceSpecs.deviceType} (${deviceSpecs.sensitivity}x)`);
                
                // コールバック通知
                if (this.callbacks.onDeviceDetected) {
                    this.callbacks.onDeviceDetected({
                        deviceType: deviceSpecs.deviceType,
                        deviceConfig: deviceSpecs
                    });
                }
            }
            
            // PitchDetector初期化
            this.pitchDetector = new PitchDetector(this.audioManager, {
                fftSize: 4096,
                smoothing: 0.1,
                clarityThreshold: this.config.clarityThreshold,
                minVolumeAbsolute: this.config.minVolumeAbsolute
            });
            
            // PitchDetectorのコールバック設定
            this.pitchDetector.setCallbacks({
                onPitchUpdate: (result) => {
                    this.handlePitchUpdate(result);
                },
                onStateChange: (state) => {
                    if (this.callbacks.onStateChange) {
                        this.callbacks.onStateChange(state);
                    }
                },
                onError: (error) => {
                    if (this.callbacks.onError) {
                        this.callbacks.onError(error);
                    }
                }
            });
            
            await this.pitchDetector.initialize();
            
            // UI要素の取得
            this.initializeUIElements();
            
            this.isInitialized = true;
            console.log(`${this.config.logPrefix} [AudioDetectionComponent] 初期化完了`);
            
            return true;
            
        } catch (error) {
            console.error(`${this.config.logPrefix} [AudioDetectionComponent] 初期化エラー:`, error);
            if (this.callbacks.onError) {
                this.callbacks.onError(error);
            }
            throw error;
        }
    }
    
    /**
     * UI要素の取得
     */
    initializeUIElements() {
        if (this.config.volumeBarSelector) {
            this.volumeBarElement = document.querySelector(this.config.volumeBarSelector);
        }
        if (this.config.volumeTextSelector) {
            this.volumeTextElement = document.querySelector(this.config.volumeTextSelector);
        }
        if (this.config.frequencySelector) {
            this.frequencyElement = document.querySelector(this.config.frequencySelector);
        }
        if (this.config.noteSelector) {
            this.noteElement = document.querySelector(this.config.noteSelector);
        }
        
        console.log(`${this.config.logPrefix} UI要素取得完了:`, {
            volumeBar: !!this.volumeBarElement,
            volumeText: !!this.volumeTextElement,
            frequency: !!this.frequencyElement,
            note: !!this.noteElement
        });
    }
    
    /**
     * 検出開始
     */
    startDetection() {
        if (!this.isInitialized) {
            console.error(`${this.config.logPrefix} [AudioDetectionComponent] 初期化されていません`);
            return false;
        }
        
        try {
            const success = this.pitchDetector.startDetection();
            if (success) {
                this.isDetecting = true;
                this.startUIUpdates();
                console.log(`${this.config.logPrefix} [AudioDetectionComponent] 検出開始`);
            }
            return success;
        } catch (error) {
            console.error(`${this.config.logPrefix} [AudioDetectionComponent] 検出開始エラー:`, error);
            if (this.callbacks.onError) {
                this.callbacks.onError(error);
            }
            return false;
        }
    }
    
    /**
     * 検出停止
     */
    stopDetection() {
        if (this.pitchDetector) {
            this.pitchDetector.stopDetection();
        }
        this.isDetecting = false;
        this.stopUIUpdates();
        console.log(`${this.config.logPrefix} [AudioDetectionComponent] 検出停止`);
    }
    
    /**
     * UI更新開始
     */
    startUIUpdates() {
        if (this.uiUpdateTimer) {
            clearInterval(this.uiUpdateTimer);
        }
        
        this.uiUpdateTimer = setInterval(() => {
            if (this.isDetecting && this.pitchDetector) {
                const result = this.pitchDetector.getLatestResult();
                if (result) {
                    this.updateUI(result);
                }
            }
        }, this.config.uiUpdateInterval);
    }
    
    /**
     * UI更新停止
     */
    stopUIUpdates() {
        if (this.uiUpdateTimer) {
            clearInterval(this.uiUpdateTimer);
            this.uiUpdateTimer = null;
        }
    }
    
    /**
     * ピッチ更新処理
     */
    handlePitchUpdate(result) {
        // コールバック通知
        if (this.callbacks.onPitchUpdate) {
            this.callbacks.onPitchUpdate(result);
        }
        
        // 音量更新
        if (this.callbacks.onVolumeUpdate) {
            this.callbacks.onVolumeUpdate(result.volume);
        }
    }
    
    /**
     * UI更新
     */
    updateUI(result) {
        try {
            // 音量バー更新
            if (this.volumeBarElement && typeof result.volume === 'number') {
                const volumePercent = Math.min(100, Math.max(0, result.volume));
                this.volumeBarElement.style.width = `${volumePercent}%`;
            }
            
            // 音量テキスト更新
            if (this.volumeTextElement && typeof result.volume === 'number') {
                this.volumeTextElement.textContent = `${result.volume.toFixed(1)}%`;
            }
            
            // 周波数更新
            if (this.frequencyElement && typeof result.frequency === 'number') {
                if (result.frequency > 0) {
                    this.frequencyElement.textContent = `${result.frequency.toFixed(1)} Hz`;
                } else {
                    this.frequencyElement.textContent = '-- Hz';
                }
            }
            
            // 音程更新
            if (this.noteElement) {
                if (result.note && result.note !== '--') {
                    this.noteElement.textContent = result.note;
                } else {
                    this.noteElement.textContent = '--';
                }
            }
            
        } catch (error) {
            if (this.config.debug) {
                console.warn(`${this.config.logPrefix} UI更新エラー:`, error);
            }
        }
    }
    
    /**
     * 破棄
     */
    destroy() {
        console.log(`${this.config.logPrefix} [AudioDetectionComponent] 破棄開始`);
        
        this.stopDetection();
        
        if (this.pitchDetector) {
            this.pitchDetector.destroy();
            this.pitchDetector = null;
        }
        
        if (this.audioManager) {
            this.audioManager.forceCleanup();
            this.audioManager = null;
        }
        
        this.isInitialized = false;
        this.callbacks = {};
        
        console.log(`${this.config.logPrefix} [AudioDetectionComponent] 破棄完了`);
    }
    
    /**
     * 状態取得
     */
    getStatus() {
        return {
            isInitialized: this.isInitialized,
            isDetecting: this.isDetecting,
            audioManager: this.audioManager ? this.audioManager.getStatus() : null,
            pitchDetector: this.pitchDetector ? this.pitchDetector.getStatus() : null
        };
    }
}

// グローバルエクスポート
if (typeof window !== 'undefined') {
    window.AudioDetectionComponent = AudioDetectionComponent;
    
    // PitchProオブジェクトが存在する場合はそこにも追加
    if (window.PitchPro) {
        window.PitchPro.AudioDetectionComponent = AudioDetectionComponent;
    }
    
    console.log('✅ AudioDetectionComponent グローバル登録完了');
}