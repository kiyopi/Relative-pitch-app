/**
 * VolumeBarComponent - 再利用可能な音量バーコンポーネント
 * 
 * @version 1.0.0
 * @description 音量表示用プログレスバーの統一コンポーネント
 * @features リセット・アニメーション制御・デバイス別最適化対応
 */

class VolumeBarComponent {
    constructor(elementId, options = {}) {
        // デフォルトオプション
        this.options = {
            minValue: 0,                    // 最小表示値
            maxValue: 100,                  // 最大表示値
            animationDuration: 300,         // アニメーション時間(ms)
            deviceOptimization: true,       // デバイス別最適化有効
            debugMode: false,               // デバッグモード
            ...options
        };

        // DOM要素取得
        this.element = document.getElementById(elementId);
        if (!this.element) {
            throw new Error(`音量バーコンポーネント要素が見つかりません: ${elementId}`);
        }

        this.volumeProgress = this.element.querySelector('.volume-progress');
        this.volumeText = this.element.querySelector('.volume-text');

        if (!this.volumeProgress) {
            throw new Error(`音量バー進行要素 (.volume-progress) が見つかりません: ${elementId}`);
        }

        // 状態管理
        this.currentVolume = 0;
        this.isAnimating = false;
        this.animationId = null;
        
        // デバイス別設定
        if (this.options.deviceOptimization) {
            this.deviceSpecs = this.detectDevice();
            this.log(`デバイス検出完了: ${this.deviceSpecs.deviceType} (スケール: ${this.deviceSpecs.volumeScale}x)`);
        }

        // 初期化完了
        this.log(`音量バーコンポーネント初期化完了: ${elementId}`, 'SUCCESS');
    }

    /**
     * 音量更新（メインメソッド）
     * @param {number} volumePercent - 音量パーセンテージ (0-100)
     * @param {Object} options - 更新オプション
     */
    updateVolume(volumePercent, options = {}) {
        const updateOptions = {
            immediate: false,           // 即座に更新（アニメーション無し）
            forceUpdate: false,         // 同じ値でも強制更新
            preserveAnimation: false,   // 既存アニメーション設定を維持
            ...options
        };

        // 値の正規化
        let normalizedVolume = Math.min(this.options.maxValue, Math.max(this.options.minValue, volumePercent));
        
        // デバイス別最適化適用
        if (this.options.deviceOptimization && this.deviceSpecs) {
            normalizedVolume = this.applyDeviceOptimization(normalizedVolume);
        }

        // 同値更新チェック
        if (!updateOptions.forceUpdate && Math.abs(this.currentVolume - normalizedVolume) < 0.1) {
            return; // 変化が小さい場合はスキップ
        }

        // アニメーション制御
        if (!updateOptions.preserveAnimation) {
            if (updateOptions.immediate) {
                this.volumeProgress.style.transition = 'none';
            } else {
                this.volumeProgress.style.transition = `width ${this.options.animationDuration}ms ease`;
            }
        }

        // DOM更新実行
        this.volumeProgress.style.width = normalizedVolume + '%';
        this.volumeProgress.setAttribute('data-volume', normalizedVolume);
        
        if (this.volumeText) {
            this.volumeText.textContent = Math.round(normalizedVolume) + '%';
        }

        // デバッグ: DOM更新確認
        if (this.options.debugMode && normalizedVolume > 0) {
            console.log(`[VolumeBar] DOM更新: width=${this.volumeProgress.style.width}, text=${this.volumeText ? this.volumeText.textContent : 'なし'}`);
        }

        // 状態更新
        this.currentVolume = normalizedVolume;

        // ログを1秒間隔で制限（パフォーマンス向上）
        if (!this.lastLogTime || Date.now() - this.lastLogTime > 1000) {
            this.log(`音量更新: ${normalizedVolume.toFixed(1)}% (immediate: ${updateOptions.immediate})`);
            this.lastLogTime = Date.now();
        }
    }

    /**
     * 音量バーリセット
     * @param {Object} options - リセットオプション
     */
    reset(options = {}) {
        const resetOptions = {
            immediate: true,            // デフォルトで即座にリセット
            clearAnimation: true,       // アニメーション状態もクリア
            ...options
        };

        this.updateVolume(0, { 
            immediate: resetOptions.immediate,
            forceUpdate: true 
        });

        if (resetOptions.clearAnimation && this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.isAnimating = false;
            this.animationId = null;
        }

        this.log('音量バーリセット完了', 'SUCCESS');
    }

    /**
     * 音量アニメーションテスト
     */
    startAnimationTest() {
        if (this.isAnimating) {
            this.log('アニメーションテスト既に実行中', 'WARNING');
            return;
        }

        this.isAnimating = true;
        let step = 0;
        const maxSteps = 100;

        const animate = () => {
            const volume = Math.sin(step * 0.1) * 40 + 50; // 10-90%の波形
            this.updateVolume(volume, { immediate: false });
            
            step++;
            if (step < maxSteps && this.isAnimating) {
                this.animationId = requestAnimationFrame(animate);
            } else {
                this.stopAnimationTest();
            }
        };

        this.log('音量アニメーションテスト開始', 'INFO');
        animate();
    }

    /**
     * アニメーションテスト停止
     */
    stopAnimationTest() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        
        this.isAnimating = false;
        this.reset();
        this.log('音量アニメーションテスト停止', 'INFO');
    }

    /**
     * デバイス別最適化適用
     * @param {number} volume - 元の音量値
     * @returns {number} 最適化後の音量値
     */
    applyDeviceOptimization(volume) {
        if (!this.deviceSpecs) return volume;

        // デバイス別スケール適用
        let optimizedVolume = volume * this.deviceSpecs.volumeScale;

        // 最小値保証（音声検出時）
        if (volume > 0.1) {
            optimizedVolume = Math.max(5, optimizedVolume); // 最小5%保証
        }

        return Math.min(100, optimizedVolume);
    }

    /**
     * デバイス検出（軽量版）
     */
    detectDevice() {
        const userAgent = navigator.userAgent;
        
        // iOS検出（iPadOS 13+対応）
        const isIPhone = /iPhone/.test(userAgent);
        const isIPad = /iPad/.test(userAgent) || (/Macintosh/.test(userAgent) && 'ontouchend' in document);
        const isIOS = isIPhone || isIPad;
        
        let deviceType = 'PC';
        let volumeScale = 2.0; // PC標準スケール
        
        if (isIPhone) {
            deviceType = 'iPhone';
            volumeScale = 2.0; // iPhone設定
        } else if (isIPad) {
            deviceType = 'iPad';  
            volumeScale = 2.5; // iPad設定
        }
        
        return {
            deviceType,
            volumeScale,
            isIOS,
            userAgent: userAgent.substring(0, 100) + '...' // 短縮版
        };
    }

    /**
     * 現在の音量値取得
     */
    getCurrentVolume() {
        return this.currentVolume;
    }

    /**
     * 設定変更
     * @param {Object} newOptions - 新しいオプション
     */
    updateOptions(newOptions) {
        this.options = { ...this.options, ...newOptions };
        this.log(`設定更新完了: ${Object.keys(newOptions).join(', ')}`);
    }

    /**
     * デバッグ情報取得
     */
    getDebugInfo() {
        return {
            elementId: this.element?.id || 'unknown',
            currentVolume: this.currentVolume,
            isAnimating: this.isAnimating,
            options: this.options,
            deviceSpecs: this.deviceSpecs,
            hasVolumeProgress: !!this.volumeProgress,
            hasVolumeText: !!this.volumeText
        };
    }

    /**
     * コンポーネント破棄
     */
    destroy() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
        
        this.isAnimating = false;
        this.element = null;
        this.volumeProgress = null;
        this.volumeText = null;
        
        this.log('音量バーコンポーネント破棄完了', 'SUCCESS');
    }

    /**
     * ログ出力（デバッグモード時のみ）
     * @param {string} message - ログメッセージ
     * @param {string} level - ログレベル
     */
    log(message, level = 'INFO') {
        if (this.options.debugMode) {
            const elementId = this.element?.id || 'unknown';
            console.log(`[VolumeBar:${elementId}] ${message}`);
        }
    }
}

/**
 * 音量バーマネージャー - 複数のバーを統一管理
 */
class VolumeBarManager {
    constructor(options = {}) {
        this.bars = new Map();
        this.globalOptions = {
            debugMode: false,
            deviceOptimization: true,
            ...options
        };
        
        this.log('音量バーマネージャー初期化完了', 'SUCCESS');
    }

    /**
     * 音量バー追加
     * @param {string} id - バーID
     * @param {string} elementId - DOM要素ID
     * @param {Object} options - 個別オプション
     */
    addVolumeBar(id, elementId, options = {}) {
        const mergedOptions = { ...this.globalOptions, ...options };
        
        try {
            const volumeBar = new VolumeBarComponent(elementId, mergedOptions);
            this.bars.set(id, volumeBar);
            this.log(`音量バー追加: ${id} -> ${elementId}`, 'SUCCESS');
            return volumeBar;
        } catch (error) {
            this.log(`音量バー追加失敗: ${error.message}`, 'ERROR');
            throw error;
        }
    }

    /**
     * 全音量バー更新
     * @param {number} volume - 音量値
     * @param {Object} options - 更新オプション
     */
    updateAllVolumes(volume, options = {}) {
        this.bars.forEach((bar, id) => {
            try {
                bar.updateVolume(volume, options);
            } catch (error) {
                this.log(`音量バー ${id} 更新失敗: ${error.message}`, 'ERROR');
            }
        });
    }

    /**
     * 全音量バーリセット
     */
    resetAll(options = {}) {
        this.bars.forEach((bar, id) => {
            try {
                bar.reset(options);
            } catch (error) {
                this.log(`音量バー ${id} リセット失敗: ${error.message}`, 'ERROR');
            }
        });
        
        this.log('全音量バーリセット完了', 'SUCCESS');
    }

    /**
     * 音量バー取得
     * @param {string} id - バーID
     */
    getVolumeBar(id) {
        return this.bars.get(id);
    }

    /**
     * 音量バー削除
     * @param {string} id - バーID
     */
    removeVolumeBar(id) {
        const bar = this.bars.get(id);
        if (bar) {
            bar.destroy();
            this.bars.delete(id);
            this.log(`音量バー削除: ${id}`, 'SUCCESS');
        }
    }

    /**
     * 全破棄
     */
    destroyAll() {
        this.bars.forEach((bar, id) => {
            bar.destroy();
        });
        this.bars.clear();
        this.log('全音量バー破棄完了', 'SUCCESS');
    }

    /**
     * デバッグ情報取得
     */
    getDebugInfo() {
        const barsInfo = {};
        this.bars.forEach((bar, id) => {
            barsInfo[id] = bar.getDebugInfo();
        });

        return {
            totalBars: this.bars.size,
            globalOptions: this.globalOptions,
            bars: barsInfo
        };
    }

    /**
     * ログ出力
     */
    log(message, level = 'INFO') {
        if (this.globalOptions.debugMode) {
            console.log(`[VolumeBarManager] ${message}`);
        }
    }
}

// グローバル公開
window.VolumeBarComponent = VolumeBarComponent;
window.VolumeBarManager = VolumeBarManager;