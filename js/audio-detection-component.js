/**
 * AudioDetectionComponent - 統一された音響検出コンポーネント
 * test-ui-integration.html の動作確認済み実装をベースに作成
 * 
 * 使用方法:
 * const detector = new AudioDetectionComponent(options);
 * await detector.initialize();
 * detector.setCallbacks({ onPitchUpdate: callback });
 * detector.startDetection();
 */

class AudioDetectionComponent {
    constructor(options = {}) {
        this.options = {
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
            mozNoiseSuppression: false,
            
            // PitchDetector設定（test-ui-integration.html準拠）
            fftSize: 4096,
            smoothing: 0.1,
            clarityThreshold: 0.6,
            minVolumeAbsolute: 0.001,  // よりスムーズな音量バー動作のため
            
            // UI要素のセレクター（オプション）
            frequencySelector: null,
            noteSelector: null,
            volumeBarSelector: null,
            volumePercentSelector: null,
            
            ...options
        };
        
        this.audioManager = null;
        this.pitchDetector = null;
        this.isDetecting = false;
        this.callbacks = {};
        
        // デバイス検出と最適化設定
        this.deviceSpecs = this.detectDeviceWithSpecs();
        this.volumeBarScale = this.deviceSpecs.volumeBarScale;
        
        console.log('🎤 AudioDetectionComponent初期化:', {
            deviceType: this.deviceSpecs.deviceType,
            volumeBarScale: this.volumeBarScale,
            sensitivityMultiplier: this.deviceSpecs.sensitivityMultiplier
        });
    }
    
    /**
     * デバイス検出 (test-ui-integration.html から完全コピー)
     */
    detectDeviceWithSpecs() {
        const userAgent = navigator.userAgent;
        
        // iPadOS 13+ 完全対応検出ロジック
        const isIPhone = /iPhone/.test(userAgent);
        const isIPad = /iPad/.test(userAgent);
        const isIPadOS = /Macintosh/.test(userAgent) && 'ontouchend' in document;
        const hasIOSNavigator = /iPad|iPhone|iPod/.test(userAgent);
        const hasIOSPlatform = /iPad|iPhone|iPod/.test((navigator.platform || ''));
        
        const isIOS = isIPhone || isIPad || isIPadOS || hasIOSNavigator || hasIOSPlatform;
        
        let deviceType = 'PC';
        let sensitivityMultiplier = 2.5;
        let volumeBarScale = 3.0;  // PC最適化: 4.0→2.5→3.0（感度調整）
        
        if (isIPhone) {
            deviceType = 'iPhone';
            sensitivityMultiplier = 3.5;
            volumeBarScale = 4.5;
        } else if (isIPad || isIPadOS) {
            deviceType = 'iPad';
            sensitivityMultiplier = 5.0;
            volumeBarScale = 7.0;
        } else if (isIOS) {
            deviceType = 'iOS Device';
            sensitivityMultiplier = 3.5;
            volumeBarScale = 4.5;
        }
        
        return {
            deviceType,
            sensitivityMultiplier,
            volumeBarScale,
            isIOS,
            debugInfo: {
                userAgent,
                detectionMethods: {
                    isIPhone, isIPad, isIPadOS, hasIOSNavigator, hasIOSPlatform,
                    touchSupport: 'ontouchend' in document
                }
            }
        };
    }
    
    /**
     * システム初期化
     */
    async initialize() {
        try {
            console.log('🎤 AudioDetectionComponent初期化開始...');
            
            if (!window.PitchPro) {
                throw new Error('PitchProライブラリが読み込まれていません');
            }
            
            const { AudioManager, PitchDetector } = window.PitchPro;
            
            // AudioManager初期化（実際のAPI - test-ui-integration.html準拠）
            this.audioManager = new AudioManager(this.options);
            await this.audioManager.initialize();
            console.log('✅ AudioManager初期化完了');
            
            // PitchDetector初期化
            this.pitchDetector = new PitchDetector(this.audioManager, {
                fftSize: this.options.fftSize,
                smoothing: this.options.smoothing,
                clarityThreshold: this.options.clarityThreshold,
                minVolumeAbsolute: this.options.minVolumeAbsolute
            });
            
            await this.pitchDetector.initialize();
            console.log('✅ PitchDetector初期化完了');
            
            // マイク感度設定（test-ui-integration.html準拠）
            if (this.audioManager.setSensitivity) {
                this.audioManager.setSensitivity(this.deviceSpecs.sensitivityMultiplier);
                console.log(`🎚️ マイク感度設定: ${this.deviceSpecs.sensitivityMultiplier}x`);
            }
            
            // デフォルトコールバック設定
            this.setupDefaultCallbacks();
            
            console.log('🎉 AudioDetectionComponent初期化完了');
            return true;
            
        } catch (error) {
            console.error('❌ AudioDetectionComponent初期化エラー:', error);
            throw error;
        }
    }
    
    /**
     * デフォルトコールバック設定 (test-ui-integration.html の実装)
     */
    setupDefaultCallbacks() {
        this.pitchDetector.setCallbacks({
            onPitchUpdate: (result) => {
                if (result) {
                    // UI要素更新（セレクターが指定されている場合）
                    this.updateUI(result);
                    
                    // カスタムコールバック実行
                    if (this.callbacks.onPitchUpdate) {
                        this.callbacks.onPitchUpdate(result);
                    }
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
     * UI要素更新 (test-ui-integration.html と完全に同じロジック)
     */
    updateUI(result) {
        // 周波数表示
        if (this.options.frequencySelector) {
            const freqEl = document.querySelector(this.options.frequencySelector);
            if (freqEl) {
                freqEl.textContent = result.frequency > 0 ? result.frequency.toFixed(1) : '--';
            }
        }
        
        // 音名表示
        if (this.options.noteSelector) {
            const noteEl = document.querySelector(this.options.noteSelector);
            if (noteEl) {
                noteEl.textContent = result.note || '--';
            }
        }
        
        // 音量バー更新 (test-ui-integration.html と完全に同じ計算)
        if (this.options.volumeBarSelector) {
            const rawVolume = result.volume || 0;
            // 実行時設定変更に対応: this.volumeBarScaleを使用
            const currentVolumeBarScale = this.volumeBarScale || this.deviceSpecs.volumeBarScale;
            const adjustedVolume = rawVolume * currentVolumeBarScale * this.deviceSpecs.sensitivityMultiplier;
            const volumePercent = Math.min(100, Math.max(0, adjustedVolume));
            
            // デバッグログ（数回に1回のみ）
            if (Math.random() < 0.01) {
                console.log('🎚️ 音量計算デバッグ:', {
                    rawVolume: rawVolume.toFixed(4),
                    currentVolumeBarScale,
                    sensitivityMultiplier: this.deviceSpecs.sensitivityMultiplier,
                    adjustedVolume: adjustedVolume.toFixed(2),
                    volumePercent: volumePercent.toFixed(1)
                });
            }
            
            const volumeBarEl = document.querySelector(this.options.volumeBarSelector);
            if (volumeBarEl) {
                volumeBarEl.style.width = volumePercent + '%';
            }
            
            if (this.options.volumePercentSelector) {
                const volumePercentEl = document.querySelector(this.options.volumePercentSelector);
                if (volumePercentEl) {
                    volumePercentEl.textContent = volumePercent.toFixed(1) + '%';
                }
            }
        }
    }
    
    /**
     * カスタムコールバック設定
     */
    setCallbacks(callbacks, options = {}) {
        this.callbacks = { ...callbacks };
        
        // カスタムコールバック専用モード（UI更新を無効化）
        if (options.disableAutoUI) {
            this.pitchDetector.setCallbacks({
                onPitchUpdate: (result) => {
                    // カスタムコールバックのみ実行（UI自動更新なし）
                    if (this.callbacks.onPitchUpdate) {
                        this.callbacks.onPitchUpdate(result);
                    }
                },
                onError: (error) => {
                    console.error('🎤 音程検出エラー:', error);
                    if (this.callbacks.onError) {
                        this.callbacks.onError(error);
                    }
                }
            });
        } else {
            // UI自動更新 + カスタムコールバック併用モード
            this.pitchDetector.setCallbacks({
                onPitchUpdate: (result) => {
                    if (result) {
                        // UI要素更新（セレクターが指定されている場合）
                        this.updateUI(result);
                        
                        // カスタムコールバック実行
                        if (this.callbacks.onPitchUpdate) {
                            this.callbacks.onPitchUpdate(result);
                        }
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
    }
    
    /**
     * 検出開始
     */
    startDetection() {
        if (!this.pitchDetector) {
            console.error('❌ PitchDetectorが初期化されていません');
            return false;
        }
        
        try {
            const success = this.pitchDetector.startDetection();
            this.isDetecting = success;
            
            if (success) {
                console.log('🎤 音程検出開始');
                if (this.callbacks.onDetectionStart) {
                    this.callbacks.onDetectionStart();
                }
            } else {
                console.error('❌ 音程検出開始失敗');
            }
            
            return success;
            
        } catch (error) {
            console.error('❌ 検出開始エラー:', error);
            return false;
        }
    }
    
    /**
     * 検出停止
     */
    stopDetection() {
        if (!this.pitchDetector) return;
        
        try {
            this.pitchDetector.stopDetection();
            this.isDetecting = false;
            
            console.log('🛑 音程検出停止');
            if (this.callbacks.onDetectionStop) {
                this.callbacks.onDetectionStop();
            }
            
        } catch (error) {
            console.error('❌ 検出停止エラー:', error);
        }
    }
    
    /**
     * 現在の状態取得
     */
    getStatus() {
        return {
            isDetecting: this.isDetecting,
            deviceType: this.deviceSpecs.deviceType,
            volumeBarScale: this.volumeBarScale,
            sensitivityMultiplier: this.deviceSpecs.sensitivityMultiplier,
            hasCallback: !!this.callbacks.onPitchUpdate
        };
    }
    
    /**
     * リソース解放
     */
    dispose() {
        this.stopDetection();
        
        if (this.audioManager) {
            // AudioManagerのリソース解放があれば実行
            this.audioManager = null;
        }
        
        if (this.pitchDetector) {
            this.pitchDetector = null;
        }
        
        this.callbacks = {};
        console.log('🗑️ AudioDetectionComponent リソース解放完了');
    }
}

// グローバルに公開
window.AudioDetectionComponent = AudioDetectionComponent;