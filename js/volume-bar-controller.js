/**
 * VolumeBarController - 統一音量バー制御コンポーネント
 * 
 * @version 1.0.0
 * @description PitchPro統合・実機テスト済み設定を含む音量バー制御システム
 * @features デバイス別最適化・リアルタイム更新・スムージング制御
 */

class VolumeBarController {
    constructor(options = {}) {
        // デフォルト設定
        this.options = {
            updateInterval: 50,          // 更新間隔(ms) - 20fps
            enableSmoothing: false,      // スムージング有効/無効
            smoothingFactor: 0.3,        // スムージング係数
            minChangeThreshold: 1.0,     // 最小変化閾値(%)
            debugMode: false,            // デバッグモード
            autoDetectDevice: true,      // デバイス自動検出
            ...options
        };

        // 音量バー要素管理
        this.volumeBars = new Map();
        
        // PitchPro関連
        this.audioManager = null;
        this.pitchDetector = null;
        this.isActive = false;
        this.updateLoop = null;
        
        // 音量値管理
        this.currentVolume = 0;
        this.smoothedVolume = 0;
        this.volumeHistory = [];
        
        // デバイス設定（実機テスト結果反映）
        this.deviceSpecs = this.options.autoDetectDevice ? this.detectDevice() : this.getDefaultSpecs();
        
        // コールバック
        this.onVolumeUpdate = null;
        this.onError = null;
        
        this.log('VolumeBarController初期化完了', 'SUCCESS');
    }

    /**
     * デバイス検出（実機テスト結果反映）
     */
    detectDevice() {
        const userAgent = navigator.userAgent;
        const isIPhone = /iPhone/.test(userAgent);
        const isIPad = /iPad/.test(userAgent) || (/Macintosh/.test(userAgent) && 'ontouchend' in document);
        const isIPadOS = /Macintosh/.test(userAgent) && 'ontouchend' in document;
        
        let deviceType = 'PC';
        let sensitivityMultiplier = 2.5;  // 実機テスト結果
        let volumeBarScale = 4.0;         // PC向け感度さらに向上
        
        if (isIPhone) {
            deviceType = 'iPhone';
            sensitivityMultiplier = 3.5;  // 実機テスト結果
            volumeBarScale = 4.5;          // 実機テスト結果
        } else if (isIPad || isIPadOS) {
            deviceType = 'iPad';
            sensitivityMultiplier = 5.0;  // 実機テスト結果
            volumeBarScale = 7.0;          // 実機テスト結果
        }
        
        const specs = {
            deviceType,
            sensitivityMultiplier,
            volumeBarScale,
            isIOS: isIPhone || isIPad || isIPadOS,
            // 実機テスト済み共通設定
            volumeThreshold: 1.5,          // 全デバイス共通最適値
            clarityThreshold: 0.6,         // 全デバイス共通最適値
        };
        
        this.log(`デバイス検出: ${deviceType} (感度: ${sensitivityMultiplier}x, 音量バー: ${volumeBarScale}x)`, 'INFO');
        
        return specs;
    }

    /**
     * デフォルトスペック取得
     */
    getDefaultSpecs() {
        return {
            deviceType: 'PC',
            sensitivityMultiplier: 2.5,
            volumeBarScale: 4.0,  // PC向け感度さらに向上
            isIOS: false,
            volumeThreshold: 1.5,
            clarityThreshold: 0.6
        };
    }

    /**
     * PitchPro初期化
     */
    async initialize() {
        try {
            this.log('PitchPro初期化開始', 'INFO');
            
            if (!window.PitchPro) {
                throw new Error('PitchProライブラリが読み込まれていません');
            }
            
            const { AudioManager, PitchDetector } = window.PitchPro;
            
            // AudioManager初期化（実機テスト済み設定）
            this.audioManager = new AudioManager({
                sampleRate: 44100,
                channelCount: 1,
                echoCancellation: false,
                noiseSuppression: false,
                autoGainControl: false,
                // iOS向け追加設定
                ...(this.deviceSpecs.isIOS && {
                    googAutoGainControl: false,
                    googNoiseSuppression: false,
                    googEchoCancellation: false,
                    googHighpassFilter: false,
                    mozAutoGainControl: false,
                    mozNoiseSuppression: false
                })
            });
            
            await this.audioManager.initialize();
            
            // マイク感度設定（デバイス別）
            if (this.audioManager.setSensitivity) {
                this.audioManager.setSensitivity(this.deviceSpecs.sensitivityMultiplier);
            }
            
            // PitchDetector初期化
            this.pitchDetector = new PitchDetector(this.audioManager, {
                fftSize: 4096,
                smoothing: 0.1,
                clarityThreshold: this.deviceSpecs.clarityThreshold,
                minVolumeAbsolute: 0.01
            });
            
            await this.pitchDetector.initialize();
            
            // コールバック設定
            this.pitchDetector.setCallbacks({
                onPitchUpdate: (result) => this.handlePitchUpdate(result),
                onError: (error) => this.handleError(error)
            });
            
            this.log('PitchPro初期化完了', 'SUCCESS');
            return true;
            
        } catch (error) {
            this.log(`初期化エラー: ${error.message}`, 'ERROR');
            if (this.onError) {
                this.onError(error);
            }
            throw error;
        }
    }

    /**
     * 音程更新ハンドラー
     */
    handlePitchUpdate(result) {
        if (!result || result.volume === undefined) return;
        
        // 生の音量値を保存
        this.lastPitchResult = result;
        
        // カスタムコールバック実行
        if (this.onVolumeUpdate) {
            const processedVolume = this.calculateVolume(result.volume);
            this.onVolumeUpdate({
                raw: result.volume,
                processed: processedVolume,
                frequency: result.frequency,
                note: result.note
            });
        }
    }

    /**
     * エラーハンドラー
     */
    handleError(error) {
        this.log(`エラー: ${error.message}`, 'ERROR');
        if (this.onError) {
            this.onError(error);
        }
    }

    /**
     * 音量計算（実機テスト済み計算式）
     */
    calculateVolume(rawVolume) {
        // 基本増幅: volumeBarScale × sensitivityMultiplier
        let volume = rawVolume * this.deviceSpecs.volumeBarScale * this.deviceSpecs.sensitivityMultiplier;
        
        // スムージング処理（有効時のみ）
        if (this.options.enableSmoothing) {
            // 履歴に追加
            this.volumeHistory.push(volume);
            if (this.volumeHistory.length > 3) {
                this.volumeHistory.shift();
            }
            
            // 移動平均
            const averageVolume = this.volumeHistory.reduce((sum, v) => sum + v, 0) / this.volumeHistory.length;
            
            // 指数移動平均
            this.smoothedVolume = this.smoothedVolume + this.options.smoothingFactor * (averageVolume - this.smoothedVolume);
            
            // 最小変化量チェック
            const volumeDifference = Math.abs(this.smoothedVolume - this.currentVolume);
            if (volumeDifference < this.options.minChangeThreshold && this.smoothedVolume > 0.5) {
                return this.currentVolume; // 変化が小さい場合は前回値を維持
            }
            
            volume = this.smoothedVolume;
        }
        
        // 0-100%に制限
        volume = Math.min(100, Math.max(0, volume));
        this.currentVolume = volume;
        
        return volume;
    }

    /**
     * 音量バー追加
     */
    addVolumeBar(id, element) {
        if (typeof element === 'string') {
            element = document.getElementById(element);
        }
        
        if (!element) {
            this.log(`音量バー要素が見つかりません: ${id}`, 'ERROR');
            return false;
        }
        
        this.volumeBars.set(id, element);
        this.log(`音量バー追加: ${id}`, 'INFO');
        return true;
    }

    /**
     * 音量バー削除
     */
    removeVolumeBar(id) {
        if (this.volumeBars.has(id)) {
            this.volumeBars.delete(id);
            this.log(`音量バー削除: ${id}`, 'INFO');
            return true;
        }
        return false;
    }

    /**
     * 検出開始
     */
    async start() {
        try {
            if (!this.pitchDetector) {
                await this.initialize();
            }
            
            this.pitchDetector.startDetection();
            this.isActive = true;
            
            // 更新ループ開始
            this.startUpdateLoop();
            
            this.log('音量検出開始', 'SUCCESS');
            return true;
            
        } catch (error) {
            this.log(`開始エラー: ${error.message}`, 'ERROR');
            return false;
        }
    }

    /**
     * 検出停止
     */
    stop() {
        if (this.pitchDetector) {
            this.pitchDetector.stopDetection();
        }
        
        this.isActive = false;
        this.stopUpdateLoop();
        
        // 音量バーリセット
        this.updateAllVolumeBars(0);
        
        // 状態リセット
        this.currentVolume = 0;
        this.smoothedVolume = 0;
        this.volumeHistory = [];
        
        this.log('音量検出停止', 'INFO');
    }

    /**
     * 更新ループ開始
     */
    startUpdateLoop() {
        if (this.updateLoop) return;
        
        this.updateLoop = setInterval(() => {
            if (!this.lastPitchResult) return;
            
            const volume = this.calculateVolume(this.lastPitchResult.volume || 0);
            this.updateAllVolumeBars(volume);
            
            // デバッグ表示
            if (this.options.debugMode && Math.random() < 0.1) {
                this.log(`音量: Raw=${(this.lastPitchResult.volume || 0).toFixed(2)}, ` +
                        `Processed=${volume.toFixed(1)}%, ` +
                        `Scale=${this.deviceSpecs.volumeBarScale}x, ` +
                        `Sens=${this.deviceSpecs.sensitivityMultiplier}x`, 'DEBUG');
            }
            
        }, this.options.updateInterval);
    }

    /**
     * 更新ループ停止
     */
    stopUpdateLoop() {
        if (this.updateLoop) {
            clearInterval(this.updateLoop);
            this.updateLoop = null;
        }
    }

    /**
     * 全音量バー更新
     */
    updateAllVolumeBars(volumePercent) {
        this.log(`🎚️ 音量バー更新開始: ${volumePercent}%, 登録数: ${this.volumeBars.size}`, 'DEBUG');
        
        this.volumeBars.forEach((element, id) => {
            this.log(`🔍 音量バー更新中: ID=${id}, Element=${element?.tagName}`, 'DEBUG');
            
            // プログレスバー形式の場合
            const progressBar = element.querySelector('.progress-fill, .volume-progress, [data-volume-bar]');
            if (progressBar) {
                this.log(`✅ プログレスバー発見: ${progressBar.tagName}.${progressBar.className} → ${volumePercent}%`, 'DEBUG');
                progressBar.style.width = volumePercent + '%';
            } else {
                this.log(`❌ プログレスバーが見つかりません: セレクタ=".progress-fill, .volume-progress, [data-volume-bar]"`, 'DEBUG');
            }
            
            // パーセント表示の場合
            const percentText = element.querySelector('.volume-text, .volume-percent, [data-volume-text]');
            if (percentText) {
                this.log(`✅ パーセント表示発見: ${percentText.tagName}.${percentText.className} → ${volumePercent.toFixed(1)}%`, 'DEBUG');
                percentText.textContent = volumePercent.toFixed(1) + '%';
            } else {
                this.log(`❌ パーセント表示が見つかりません: セレクタ=".volume-text, .volume-percent, [data-volume-text]"`, 'DEBUG');
            }
            
            // VolumeBarComponentインスタンスの場合
            if (element.updateVolume && typeof element.updateVolume === 'function') {
                element.updateVolume(volumePercent);
            }
        });
        
        this.log(`🎚️ 音量バー更新完了: ${volumePercent}%`, 'DEBUG');
    }

    /**
     * デバイス設定取得
     */
    getDeviceSpecs() {
        return { ...this.deviceSpecs };
    }

    /**
     * デバイス設定更新
     */
    updateDeviceSpecs(specs) {
        this.deviceSpecs = { ...this.deviceSpecs, ...specs };
        this.log(`デバイス設定更新: ${JSON.stringify(specs)}`, 'INFO');
    }

    /**
     * オプション更新
     */
    updateOptions(options) {
        this.options = { ...this.options, ...options };
        this.log(`オプション更新: ${JSON.stringify(options)}`, 'INFO');
    }

    /**
     * クリーンアップ
     */
    async cleanup() {
        this.stop();
        
        if (this.pitchDetector) {
            this.pitchDetector.cleanup();
            this.pitchDetector = null;
        }
        
        if (this.audioManager) {
            // AudioManager cleanup if available
            this.audioManager = null;
        }
        
        this.volumeBars.clear();
        
        this.log('クリーンアップ完了', 'SUCCESS');
    }

    /**
     * ログ出力
     */
    log(message, level = 'INFO') {
        if (this.options.debugMode || level === 'ERROR') {
            const levelEmoji = {
                'DEBUG': '🔍',
                'INFO': 'ℹ️',
                'SUCCESS': '✅',
                'WARNING': '⚠️',
                'ERROR': '❌'
            }[level] || '📝';
            
            console.log(`${levelEmoji} [VolumeBarController] ${message}`);
        }
    }

    /**
     * デバッグ情報取得
     */
    getDebugInfo() {
        return {
            isActive: this.isActive,
            currentVolume: this.currentVolume.toFixed(1) + '%',
            smoothedVolume: this.smoothedVolume.toFixed(1) + '%',
            deviceSpecs: this.deviceSpecs,
            options: this.options,
            volumeBarsCount: this.volumeBars.size,
            lastPitchResult: this.lastPitchResult ? {
                volume: (this.lastPitchResult.volume || 0).toFixed(2),
                frequency: this.lastPitchResult.frequency?.toFixed(1),
                note: this.lastPitchResult.note
            } : null
        };
    }
}

// 簡単に使用できるファクトリー関数
VolumeBarController.createSimple = async function(volumeBarIds = [], options = {}) {
    const controller = new VolumeBarController(options);
    
    // 音量バー要素を追加
    volumeBarIds.forEach(id => {
        controller.addVolumeBar(id, id);
    });
    
    // 初期化
    await controller.initialize();
    
    return controller;
};

// グローバル公開
window.VolumeBarController = VolumeBarController;