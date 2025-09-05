// device-manager.js - デバイス検出・設定管理モジュール
// PitchProのDeviceDetectionクラス統合版

/**
 * PitchProのDeviceDetectionクラスを活用したデバイス管理クラス
 * 既存のdetectDeviceWithSpecs()関数を統合・最適化
 */
class DeviceManager {
    constructor() {
        this.deviceSpecs = null;
        this.pitchProDeviceDetection = null;
    }

    /**
     * デバイス検出の初期化
     * PitchProのDeviceDetectionクラスが利用可能な場合はそれを使用
     * フォールバックでカスタム検出ロジック使用
     */
    async initialize() {
        try {
            // PitchProのDeviceDetectionクラス使用を試行
            if (window.PitchPro && window.PitchPro.DeviceDetection) {
                this.pitchProDeviceDetection = window.PitchPro.DeviceDetection;
                const specs = this.pitchProDeviceDetection.getDeviceSpecs();
                
                // PitchProの結果をカスタム形式に変換
                this.deviceSpecs = this.convertPitchProSpecs(specs);
                console.log('🎯 PitchPro DeviceDetectionクラス使用');
            } else {
                // フォールバック: カスタム検出ロジック
                this.deviceSpecs = this.detectDeviceWithCustomLogic();
                console.log('🔄 カスタムデバイス検出ロジック使用');
            }

            console.log(`🔍 デバイス検出結果: ${this.deviceSpecs.deviceType}`, this.deviceSpecs);
            
            // iPadOS 13+ 検出の詳細ログ
            if (this.deviceSpecs.debugInfo?.detectionMethods?.isIPadOS) {
                console.log('⚠️ iPadOS 13+ 検出: Macintosh偽装を発見・iPad判定に修正', {
                    userAgent: this.deviceSpecs.debugInfo.userAgent,
                    touchSupport: this.deviceSpecs.debugInfo.detectionMethods.touchSupport
                });
            }

            return this.deviceSpecs;
        } catch (error) {
            console.error('❌ デバイス検出エラー:', error);
            // 緊急フォールバック: PC設定
            this.deviceSpecs = this.getDefaultSpecs();
            return this.deviceSpecs;
        }
    }

    /**
     * PitchProのDeviceSpecs形式をカスタム形式に変換
     */
    convertPitchProSpecs(pitchProSpecs) {
        const deviceType = pitchProSpecs.deviceType || 'PC';
        const customSpecs = this.getDeviceOptimizations(deviceType);
        
        return {
            deviceType: deviceType,
            sensitivityMultiplier: customSpecs.sensitivityMultiplier,
            volumeBarScale: customSpecs.volumeBarScale,
            isIOS: pitchProSpecs.isIOS || false,
            debugInfo: {
                userAgent: navigator.userAgent,
                detectionMethods: {
                    isIPhone: deviceType === 'iPhone',
                    isIPad: deviceType === 'iPad',
                    isIPadOS: deviceType === 'iPad' && /Macintosh/.test(navigator.userAgent),
                    touchSupport: 'ontouchend' in document
                },
                pitchProSpecs: pitchProSpecs
            }
        };
    }

    /**
     * デバイス別の音量バースケール算出
     */
    calculateVolumeBarScale(deviceType) {
        switch (deviceType) {
            case 'iPad':
                return 7.0;
            case 'iPhone':
                return 4.5;
            case 'PC':
            default:
                return 3.0; // PC向け音量バー感度（100%張り付き防止）
        }
    }

    /**
     * デバイス別最適化設定（AUDIO_LIBRARY_DESIGN.md準拠）
     */
    getDeviceOptimizations(deviceType) {
        switch (deviceType) {
            case 'iPad':
                return {
                    sensitivityMultiplier: 5.0, // 実機テスト確定値
                    volumeBarScale: 7.0,
                    volumeThreshold: 1.5,
                    clarityThreshold: 0.6
                };
            case 'iPhone':
                return {
                    sensitivityMultiplier: 3.5, // test-ui-integration.html実績値
                    volumeBarScale: 4.5,
                    volumeThreshold: 1.5,
                    clarityThreshold: 0.6
                };
            case 'PC':
            default:
                return {
                    sensitivityMultiplier: 2.5, // 実機テスト確定値
                    volumeBarScale: 3.0, // PC向け音量バー感度（100%張り付き防止）
                    volumeThreshold: 1.5,
                    clarityThreshold: 0.6
                };
        }
    }

    /**
     * カスタムデバイス検出ロジック（CRITICAL_DECISIONS_AND_INSIGHTS.md準拠）
     * PitchProが利用できない場合のフォールバック
     */
    detectDeviceWithCustomLogic() {
        const userAgent = navigator.userAgent;
        
        // iPadOS 13+ 完全対応検出ロジック
        const isIPhone = /iPhone/.test(userAgent);
        const isIPad = /iPad/.test(userAgent);
        const isIPadOS = /Macintosh/.test(userAgent) && 'ontouchend' in document;
        const hasIOSNavigator = /iPad|iPhone|iPod/.test(userAgent);
        const hasIOSPlatform = /iPad|iPhone|iPod/.test(navigator.platform || '');
        
        const isIOS = isIPhone || isIPad || isIPadOS || hasIOSNavigator || hasIOSPlatform;
        
        let deviceType = 'PC';
        
        if (isIPhone) {
            deviceType = 'iPhone';
        } else if (isIPad || isIPadOS) {
            deviceType = 'iPad';
        } else if (isIOS) {
            deviceType = 'iPhone'; // フォールバック
        }
        
        const optimizations = this.getDeviceOptimizations(deviceType);
        
        return {
            deviceType,
            sensitivityMultiplier: optimizations.sensitivityMultiplier,
            volumeBarScale: optimizations.volumeBarScale,
            isIOS,
            debugInfo: {
                userAgent: userAgent,
                detectionMethods: {
                    isIPhone,
                    isIPad,
                    isIPadOS,
                    hasIOSNavigator,
                    hasIOSPlatform,
                    touchSupport: 'ontouchend' in document
                }
            }
        };
    }

    /**
     * デフォルトスペック（緊急フォールバック）
     */
    getDefaultSpecs() {
        return {
            deviceType: 'PC',
            sensitivityMultiplier: 2.5,
            volumeBarScale: 3.0, // PC向け音量バー感度（100%張り付き防止）
            isIOS: false,
            debugInfo: {
                userAgent: navigator.userAgent,
                detectionMethods: {
                    isIPhone: false,
                    isIPad: false,
                    isIPadOS: false,
                    touchSupport: 'ontouchend' in document
                }
            }
        };
    }

    /**
     * デバイス設定をlocalStorageに保存
     */
    saveToStorage() {
        if (!this.deviceSpecs) return false;

        try {
            const deviceSettings = {
                deviceType: this.deviceSpecs.deviceType,
                sensitivityMultiplier: this.deviceSpecs.sensitivityMultiplier,
                volumeBarScale: this.deviceSpecs.volumeBarScale,
                isIOS: this.deviceSpecs.isIOS,
                detectedAt: new Date().toISOString(),
                userAgent: this.deviceSpecs.debugInfo.userAgent
            };
            
            localStorage.setItem('deviceSettings', JSON.stringify(deviceSettings));
            console.log('💾 デバイス設定をlocalStorageに保存完了');
            return true;
        } catch (error) {
            console.warn('⚠️ デバイス設定の保存に失敗:', error);
            return false;
        }
    }

    /**
     * localStorageからデバイス設定を読み込み
     */
    static loadFromStorage() {
        try {
            const saved = localStorage.getItem('deviceSettings');
            if (saved) {
                const deviceSettings = JSON.parse(saved);
                console.log('📱 保存済みデバイス設定を読み込み:', deviceSettings);
                return deviceSettings;
            }
        } catch (error) {
            console.warn('⚠️ デバイス設定の読み込みに失敗:', error);
        }
        return null;
    }

    /**
     * 現在のデバイススペックを取得
     */
    getSpecs() {
        return this.deviceSpecs;
    }

    /**
     * 特定プロパティの取得（後方互換性）
     */
    getDeviceType() {
        return this.deviceSpecs?.deviceType || 'PC';
    }

    getSensitivityMultiplier() {
        return this.deviceSpecs?.sensitivityMultiplier || 2.5;
    }

    getVolumeBarScale() {
        return this.deviceSpecs?.volumeBarScale || 4.0;
    }

    isIOSDevice() {
        return this.deviceSpecs?.isIOS || false;
    }
}

// モジュールエクスポート
window.DeviceManager = DeviceManager;