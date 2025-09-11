/**
 * PitchPro統合モジュール - AudioDetectionComponent統合版
 * 
 * @version 4.0.0
 * @description v4.0音域テスト向けPitchPro完全統合システム
 * @features AudioDetectionComponent統合・エラーハンドリング・デバイス最適化
 * @author Claude Code
 * @date 2025-01-09
 */

/**
 * AudioDetectionComponent - PitchPro統合音声検出コンポーネント
 * 
 * PitchPro README準拠:
 * - AudioDetectionComponentを直接使用（公式実装）
 * - updateSelectors()メソッドで音量バー切り替え対応
 * - 最適化されたデフォルト値を使用（clarityThreshold: 0.4等）
 * - 音量値取得は必ずコールバック方式result.volumeを使用
 */
class AudioDetectionComponent {
    constructor(options = {}) {
        this.options = {
            // UI要素セレクター（updateSelectors()で変更可能）
            volumeBarSelector: '#volume-progress',
            volumeTextSelector: '#volume-percentage', 
            frequencySelector: '#frequency-value',
            noteSelector: null,
            
            // 音声検出設定（PitchPro README推奨値）
            clarityThreshold: 0.4,        // 40% - 実用的な信頼性閾値
            minVolumeAbsolute: 0.003,     // 0.3% - 適切な最小音量
            fftSize: 4096,                // 高精度FFT
            smoothing: 0.1,               // 最小限の平滑化
            
            // デバイス最適化設定
            deviceOptimization: true,     // 自動デバイス最適化
            enableHarmonicCorrection: true, // 倍音補正有効
            
            // デバッグ設定
            debugMode: false,
            debug: false,
            
            ...options
        };
        
        // PitchPro統合インスタンス（公式実装準拠）
        this.audioDetector = null;
        
        // UI要素キャッシュ（updateSelectors()で更新可能）
        this.cachedElements = {
            volumeBar: null,
            volumeText: null,
            frequencyElement: null,
            noteElement: null
        };
        
        // 状態管理
        this.isInitialized = false;
        this.isDetecting = false;
        this.isDestroyed = false;
        
        // コールバック管理
        this.callbacks = {
            onVolumeUpdate: null,
            onPitchUpdate: null,
            onError: null,
            onStateChange: null
        };
        
        // 現在データ
        this.currentData = {
            volume: 0,
            frequency: 0,
            clarity: 0,
            note: '--',
            timestamp: 0
        };
        
        this.log('AudioDetectionComponent (PitchPro準拠版) 初期化完了', 'SUCCESS');
    }
    
    
    
    /**
     * 初期化処理（PitchPro公式AudioDetectionComponent使用）
     */
    async initialize() {
        if (this.isDestroyed) {
            throw new Error('破棄されたインスタンスは再初期化できません');
        }
        
        if (this.isInitialized) {
            this.log('既に初期化済みです', 'WARNING');
            return true;
        }
        
        try {
            this.log('PitchPro AudioDetectionComponent 初期化開始', 'INFO');
            
            // PitchProライブラリ読み込み確認
            if (!window.PitchPro) {
                throw new Error('PitchProライブラリが読み込まれていません');
            }
            
            // UI要素キャッシュ
            this.cacheUIElements();
            
            // PitchPro公式AudioDetectionComponent作成
            const { AudioDetectionComponent } = window.PitchPro;
            
            if (!AudioDetectionComponent) {
                throw new Error('AudioDetectionComponentが利用できません');
            }
            
            this.audioDetector = new AudioDetectionComponent({
                volumeBarSelector: this.options.volumeBarSelector,
                volumeTextSelector: this.options.volumeTextSelector,
                frequencySelector: this.options.frequencySelector,
                noteSelector: this.options.noteSelector,
                
                // PitchPro推奨設定
                clarityThreshold: this.options.clarityThreshold,
                minVolumeAbsolute: this.options.minVolumeAbsolute,
                deviceOptimization: this.options.deviceOptimization,
                enableHarmonicCorrection: this.options.enableHarmonicCorrection,
                debug: this.options.debugMode
            });
            
            // PitchPro AudioDetectionComponent初期化
            await this.audioDetector.initialize();
            
            // コールバック設定
            this.audioDetector.setCallbacks({
                onPitchUpdate: (result) => this.handlePitchUpdate(result),
                onError: (error) => this.handleError('PITCH_DETECTION_ERROR', error),
                onStateChange: (state) => this.notifyStateChange(state)
            });
            
            this.isInitialized = true;
            this.notifyStateChange('initialized');
            
            this.log('PitchPro AudioDetectionComponent 初期化完了', 'SUCCESS');
            return true;
            
        } catch (error) {
            this.log(`初期化エラー: ${error.message}`, 'ERROR');
            this.handleError('INITIALIZATION_FAILED', error);
            throw error;
        }
    }
    
    /**
     * UI要素キャッシュ（updateSelectors()対応）
     */
    cacheUIElements() {
        // 音量バー
        if (this.options.volumeBarSelector) {
            this.cachedElements.volumeBar = document.querySelector(this.options.volumeBarSelector);
            if (!this.cachedElements.volumeBar) {
                this.log(`音量バー要素が見つかりません: ${this.options.volumeBarSelector}`, 'WARNING');
            }
        }
        
        // 音量テキスト
        if (this.options.volumeTextSelector) {
            this.cachedElements.volumeText = document.querySelector(this.options.volumeTextSelector);
            if (!this.cachedElements.volumeText) {
                this.log(`音量テキスト要素が見つかりません: ${this.options.volumeTextSelector}`, 'WARNING');
            }
        }
        
        // 周波数表示
        if (this.options.frequencySelector) {
            this.cachedElements.frequencyElement = document.querySelector(this.options.frequencySelector);
            if (!this.cachedElements.frequencyElement) {
                this.log(`周波数要素が見つかりません: ${this.options.frequencySelector}`, 'WARNING');
            }
        }
        
        // 音名表示
        if (this.options.noteSelector) {
            this.cachedElements.noteElement = document.querySelector(this.options.noteSelector);
            if (!this.cachedElements.noteElement) {
                this.log(`音名要素が見つかりません: ${this.options.noteSelector}`, 'WARNING');
            }
        }
        
        this.log('UI要素キャッシュ完了', 'INFO');
    }
    
    /**
     * セレクター更新（PitchPro公式機能）
     */
    updateSelectors(newSelectors) {
        if (!this.isInitialized || !this.audioDetector) {
            this.log('初期化前にセレクターを更新しようとしました', 'WARNING');
            return;
        }
        
        try {
            this.log('セレクター更新開始', 'INFO');
            
            // オプション更新
            this.options = { ...this.options, ...newSelectors };
            
            // PitchPro公式updateSelectors()使用
            if (this.audioDetector.updateSelectors) {
                this.audioDetector.updateSelectors(newSelectors);
                this.log('PitchPro updateSelectors() 実行完了', 'SUCCESS');
            } else {
                this.log('updateSelectors()が利用できません - 手動切り替え実行', 'WARNING');
            }
            
            // UI要素キャッシュ更新
            this.cacheUIElements();
            
            this.log('セレクター更新完了', 'SUCCESS');
            
        } catch (error) {
            this.log(`セレクター更新エラー: ${error.message}`, 'ERROR');
            this.handleError('SELECTOR_UPDATE_FAILED', error);
        }
    }
    
    
    
    
    
    /**
     * 検出開始（PitchPro公式）
     */
    async startDetection() {
        if (!this.isInitialized || !this.audioDetector) {
            throw new Error('初期化が完了していません');
        }
        
        if (this.isDetecting) {
            this.log('検出は既に開始されています', 'WARNING');
            return true;
        }
        
        try {
            this.log('PitchPro検出開始', 'INFO');
            
            // PitchPro公式startDetection()使用
            const success = await this.audioDetector.startDetection();
            
            if (success) {
                this.isDetecting = true;
                this.notifyStateChange('detecting');
                this.log('PitchPro検出開始完了', 'SUCCESS');
                return true;
            } else {
                throw new Error('PitchPro検出開始に失敗しました');
            }
            
        } catch (error) {
            this.log(`検出開始エラー: ${error.message}`, 'ERROR');
            this.handleError('DETECTION_START_FAILED', error);
            throw error;
        }
    }
    
    /**
     * 検出停止（PitchPro公式）
     */
    stopDetection() {
        if (!this.isDetecting) {
            this.log('検出は既に停止されています', 'WARNING');
            return;
        }
        
        try {
            this.log('PitchPro検出停止', 'INFO');
            
            if (this.audioDetector) {
                this.audioDetector.stopDetection();
            }
            
            this.isDetecting = false;
            this.notifyStateChange('stopped');
            
            this.log('PitchPro検出停止完了', 'SUCCESS');
            
        } catch (error) {
            this.log(`検出停止エラー: ${error.message}`, 'ERROR');
            this.handleError('DETECTION_STOP_FAILED', error);
        }
    }
    
    /**
     * 音声データ更新処理（PitchPro公式コールバック）
     */
    handlePitchUpdate(result) {
        try {
            // PitchPro公式結果を使用
            const volume = result.volume || 0;
            const frequency = result.frequency || 0;
            const clarity = result.clarity || 0;
            const note = result.note || '--';
            const timestamp = result.timestamp || Date.now();
            
            // データ更新
            this.currentData = {
                volume,
                frequency,
                clarity,
                note,
                timestamp
            };
            
            // PitchProが自動でUI更新するが、手動更新も可能
            if (this.audioDetector.updateUI) {
                this.audioDetector.updateUI(result);
            } else {
                // フォールバック: 手動UI更新
                this.manualUIUpdate(result);
            }
            
            // カスタムコールバック実行
            if (this.callbacks.onVolumeUpdate) {
                this.callbacks.onVolumeUpdate(result);
            }
            
            if (this.callbacks.onPitchUpdate) {
                this.callbacks.onPitchUpdate(result);
            }
            
        } catch (error) {
            this.log(`音声データ更新エラー: ${error.message}`, 'ERROR');
            this.handleError('DATA_UPDATE_FAILED', error);
        }
    }
    
    /**
     * 手動UI更新（PitchProのupdateUI()が利用できない場合のフォールバック）
     */
    manualUIUpdate(result) {
        // 音量バー更新
        if (this.cachedElements.volumeBar && result.volume !== undefined) {
            const displayVolume = Math.min(100, Math.max(0, result.volume));
            this.cachedElements.volumeBar.style.width = `${displayVolume}%`;
        }
        
        // 音量テキスト更新
        if (this.cachedElements.volumeText && result.volume !== undefined) {
            const displayVolume = Math.round(result.volume);
            this.cachedElements.volumeText.textContent = `${displayVolume}%`;
        }
        
        // 周波数表示更新
        if (this.cachedElements.frequencyElement && result.frequency > 0) {
            this.cachedElements.frequencyElement.textContent = `${result.frequency.toFixed(1)} Hz`;
        }
        
        // 音名表示更新
        if (this.cachedElements.noteElement && result.note) {
            this.cachedElements.noteElement.textContent = result.note;
        }
    }
    
    /**
     * 状態取得（PitchPro公式）
     */
    getStatus() {
        const baseStatus = {
            isInitialized: this.isInitialized,
            isDetecting: this.isDetecting,
            isDestroyed: this.isDestroyed,
            currentData: this.currentData,
            options: this.options
        };
        
        if (this.audioDetector && this.audioDetector.getStatus) {
            return {
                ...baseStatus,
                pitchProStatus: this.audioDetector.getStatus()
            };
        }
        
        return baseStatus;
    }
    
    /**
     * コールバック設定
     */
    setCallbacks(callbacks) {
        if (typeof callbacks.onVolumeUpdate === 'function') {
            this.callbacks.onVolumeUpdate = callbacks.onVolumeUpdate;
        }
        
        if (typeof callbacks.onPitchUpdate === 'function') {
            this.callbacks.onPitchUpdate = callbacks.onPitchUpdate;
        }
        
        if (typeof callbacks.onError === 'function') {
            this.callbacks.onError = callbacks.onError;
        }
        
        if (typeof callbacks.onStateChange === 'function') {
            this.callbacks.onStateChange = callbacks.onStateChange;
        }
        
        this.log('コールバック設定完了', 'INFO');
    }
    
    /**
     * エラーハンドリング
     */
    handleError(type, error) {
        this.errorCount++;
        this.lastErrorTime = Date.now();
        
        const errorInfo = {
            type,
            message: error?.message || error,
            count: this.errorCount,
            timestamp: this.lastErrorTime,
            deviceType: this.deviceSpecs.type
        };
        
        this.log(`エラー発生 [${type}]: ${errorInfo.message}`, 'ERROR', errorInfo);
        
        // エラーコールバック実行
        if (this.callbacks.onError) {
            this.callbacks.onError(errorInfo);
        }
        
        // 連続エラー対処
        if (this.errorCount >= this.maxErrors) {
            this.log('最大エラー数に達しました。検出を停止します', 'ERROR');
            this.stopDetection();
        }
    }
    
    /**
     * 状態変更通知
     */
    notifyStateChange(state) {
        if (this.callbacks.onStateChange) {
            this.callbacks.onStateChange({
                state,
                isInitialized: this.isInitialized,
                isDetecting: this.isDetecting,
                timestamp: Date.now()
            });
        }
    }
    
    /**
     * 現在のデータ取得
     */
    getCurrentData() {
        return { ...this.currentData };
    }
    
    /**
     * 統計情報取得
     */
    getStats() {
        return {
            errorCount: this.errorCount,
            lastErrorTime: this.lastErrorTime,
            deviceType: this.deviceSpecs.type,
            isInitialized: this.isInitialized,
            isDetecting: this.isDetecting,
            isDestroyed: this.isDestroyed
        };
    }
    
    /**
     * ログ出力
     */
    log(message, level = 'INFO', data = null) {
        if (!this.options.debugMode && level !== 'ERROR') return;
        
        const timestamp = new Date().toLocaleTimeString();
        const logMessage = `[AudioDetectionComponent ${timestamp}] ${level}: ${message}`;
        
        switch (level) {
            case 'ERROR':
                console.error(logMessage, data);
                break;
            case 'WARNING':
                console.warn(logMessage, data);
                break;
            case 'SUCCESS':
                console.log(`%c${logMessage}`, 'color: green', data);
                break;
            default:
                console.log(logMessage, data);
        }
    }
    
    /**
     * リソース破棄（PitchPro公式destroy()使用）
     */
    destroy() {
        if (this.isDestroyed) {
            this.log('既に破棄されています', 'WARNING');
            return;
        }
        
        try {
            this.log('PitchProリソース破棄開始', 'INFO');
            
            // 検出停止
            this.stopDetection();
            
            // PitchPro AudioDetectionComponent破棄
            if (this.audioDetector) {
                if (this.audioDetector.destroy) {
                    this.audioDetector.destroy();
                } else if (this.audioDetector.cleanup) {
                    this.audioDetector.cleanup();
                }
                this.audioDetector = null;
            }
            
            // コールバッククリア
            this.callbacks = {};
            
            // UI要素参照クリア
            this.cachedElements = {
                volumeBar: null,
                volumeText: null,
                frequencyElement: null,
                noteElement: null
            };
            
            // 状態リセット
            this.isInitialized = false;
            this.isDetecting = false;
            this.isDestroyed = true;
            
            this.log('PitchProリソース破棄完了', 'SUCCESS');
            
        } catch (error) {
            this.log(`リソース破棄エラー: ${error.message}`, 'ERROR');
        }
    }
}

// VoiceRangeTesterV113 - 音域テスト統合クラス（既存実装との互換性維持）
class VoiceRangeTesterV113 {
    constructor(options = {}) {
        this.options = {
            targetNotes: [
                { name: 'C3', frequency: 130.8 },
                { name: 'D3', frequency: 146.8 },
                { name: 'E3', frequency: 164.8 },
                { name: 'F3', frequency: 174.6 },
                { name: 'G3', frequency: 196.0 },
                { name: 'A3', frequency: 220.0 },
                { name: 'B3', frequency: 246.9 },
                { name: 'C4', frequency: 261.6 },
                { name: 'D4', frequency: 293.7 },
                { name: 'E4', frequency: 329.6 },
                { name: 'F4', frequency: 349.2 },
                { name: 'G4', frequency: 392.0 },
                { name: 'A4', frequency: 440.0 },
                { name: 'B4', frequency: 493.9 },
                { name: 'C5', frequency: 523.3 }
            ],
            tolerancePercent: 5.0,
            minRecordingDuration: 2.0,
            ...options
        };
        
        this.results = new Map();
        this.audioDetector = null;
        
        this.log('VoiceRangeTesterV113初期化完了', 'SUCCESS');
    }
    
    /**
     * AudioDetectionComponent設定
     */
    setAudioDetector(audioDetector) {
        this.audioDetector = audioDetector;
    }
    
    /**
     * 音域測定実行
     */
    async measureRange(noteName, duration = 3000) {
        if (!this.audioDetector) {
            throw new Error('AudioDetectionComponentが設定されていません');
        }
        
        const targetNote = this.options.targetNotes.find(n => n.name === noteName);
        if (!targetNote) {
            throw new Error(`未対応の音名: ${noteName}`);
        }
        
        const measurementData = [];
        const startTime = Date.now();
        
        return new Promise((resolve) => {
            const collectData = (result) => {
                measurementData.push({
                    volume: result.volume,
                    frequency: result.frequency,
                    clarity: result.clarity,
                    timestamp: result.timestamp
                });
            };
            
            // データ収集開始
            this.audioDetector.setCallbacks({
                onPitchUpdate: collectData
            });
            
            // 指定時間後に測定完了
            setTimeout(() => {
                const result = this.analyzeMeasurementData(noteName, targetNote, measurementData);
                this.results.set(noteName, result);
                resolve(result);
            }, duration);
        });
    }
    
    /**
     * 測定データ分析
     */
    analyzeMeasurementData(noteName, targetNote, data) {
        if (data.length === 0) {
            return {
                noteName,
                success: false,
                reason: 'データなし',
                confidence: 0
            };
        }
        
        // 有効なデータのみ抽出
        const validData = data.filter(d => d.volume > 30 && d.frequency > 0 && d.clarity > 0.4);
        
        if (validData.length === 0) {
            return {
                noteName,
                success: false,
                reason: '有効なデータなし',
                confidence: 0
            };
        }
        
        // 平均値計算
        const avgFrequency = validData.reduce((sum, d) => sum + d.frequency, 0) / validData.length;
        const avgVolume = validData.reduce((sum, d) => sum + d.volume, 0) / validData.length;
        const avgClarity = validData.reduce((sum, d) => sum + d.clarity, 0) / validData.length;
        
        // 精度計算
        const frequencyError = Math.abs(avgFrequency - targetNote.frequency) / targetNote.frequency * 100;
        const isAccurate = frequencyError <= this.options.tolerancePercent;
        
        const confidence = Math.max(0, 100 - frequencyError * 2) * (avgClarity / 1.0) * (Math.min(avgVolume, 100) / 100);
        
        return {
            noteName,
            targetFrequency: targetNote.frequency,
            measuredFrequency: avgFrequency,
            frequencyError: frequencyError,
            avgVolume,
            avgClarity,
            confidence,
            success: isAccurate && confidence > 60,
            reason: isAccurate ? '測定成功' : `周波数誤差: ${frequencyError.toFixed(1)}%`
        };
    }
    
    /**
     * 結果取得
     */
    getResults() {
        return Array.from(this.results.values());
    }
    
    /**
     * ログ出力
     */
    log(message, level = 'INFO', data = null) {
        const timestamp = new Date().toLocaleTimeString();
        const logMessage = `[VoiceRangeTesterV113 ${timestamp}] ${level}: ${message}`;
        
        switch (level) {
            case 'ERROR':
                console.error(logMessage, data);
                break;
            case 'SUCCESS':
                console.log(`%c${logMessage}`, 'color: green', data);
                break;
            default:
                console.log(logMessage, data);
        }
    }
}

export { AudioDetectionComponent, VoiceRangeTesterV113 };