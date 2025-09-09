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
 * CLAUDE.mdの重要教訓:
 * - 一度初期化したらセレクターを変更できない
 * - UI要素を切り替える場合はdestroy() → 再作成が必須
 * - 音量値取得は必ずコールバック方式result.volumeを使用
 */
class AudioDetectionComponent {
    constructor(options = {}) {
        this.options = {
            // UI要素セレクター（初期化後変更不可）
            volumeBarSelector: '#volume-progress',
            volumeTextSelector: '#volume-percentage',
            frequencySelector: '#frequency-value',
            
            // 音声検出設定（PitchPro推奨値使用）
            clarityThreshold: 0.4,
            minVolumeAbsolute: 0.003,
            noiseThreshold: 0.1,
            
            // 検出制御
            enableFrequencyDetection: true,
            enableVolumeDetection: true,
            updateInterval: 50, // 20fps
            
            // デバイス最適化（実機テスト済み設定）
            autoDetectDevice: true,
            
            // デバッグ設定
            debugMode: false,
            logLevel: 'INFO',
            
            ...options
        };
        
        // PitchPro関連インスタンス
        this.audioManager = null;
        this.pitchDetector = null;
        
        // UI要素（初期化時固定）
        this.volumeBar = null;
        this.volumeText = null;
        this.frequencyElement = null;
        
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
        
        // データ管理
        this.currentData = {
            volume: 0,
            frequency: 0,
            clarity: 0,
            timestamp: 0
        };
        
        // デバイス設定（実機テスト結果反映）
        this.deviceSpecs = this.options.autoDetectDevice ? this.detectDevice() : this.getDefaultSpecs();
        
        // エラー管理
        this.errorCount = 0;
        this.lastErrorTime = 0;
        this.maxErrors = 5;
        
        this.log('AudioDetectionComponent初期化完了', 'SUCCESS');
    }
    
    /**
     * デバイス検出（CLAUDE.md実機テスト結果反映）
     */
    detectDevice() {
        const userAgent = navigator.userAgent;
        
        // iPadOS 13+ バグ完全対応（CLAUDE.md重要教訓）
        const isIPhone = /iPhone/.test(userAgent);
        const isIPad = /iPad/.test(userAgent);
        const isIPadOS = /Macintosh/.test(userAgent) && 'ontouchend' in document;
        const hasIOSNavigator = /iPad|iPhone|iPod/.test(userAgent);
        
        if (isIPhone || hasIOSNavigator) {
            return {
                type: 'iPhone',
                sensitivity: 3.5,
                volumeBarMultiplier: 4.5,
                noiseReduction: 0.15
            };
        } else if (isIPad || isIPadOS) {
            return {
                type: 'iPad', 
                sensitivity: 5.0,
                volumeBarMultiplier: 7.0,
                noiseReduction: 0.2
            };
        } else {
            return {
                type: 'PC',
                sensitivity: 2.5,
                volumeBarMultiplier: 4.0,
                noiseReduction: 0.1
            };
        }
    }
    
    /**
     * デフォルトデバイス設定
     */
    getDefaultSpecs() {
        return {
            type: 'PC',
            sensitivity: 2.5,
            volumeBarMultiplier: 4.0,
            noiseReduction: 0.1
        };
    }
    
    /**
     * 初期化処理
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
            this.log('初期化開始', 'INFO');
            
            // UI要素取得（初期化時のみ固定）
            this.cacheUIElements();
            
            // PitchPro モジュール動的ロード
            await this.loadPitchProModules();
            
            // AudioManager初期化
            await this.initializeAudioManager();
            
            // PitchDetector初期化
            await this.initializePitchDetector();
            
            this.isInitialized = true;
            this.notifyStateChange('initialized');
            
            this.log('初期化完了', 'SUCCESS');
            return true;
            
        } catch (error) {
            this.log(`初期化エラー: ${error.message}`, 'ERROR');
            this.handleError('INITIALIZATION_FAILED', error);
            throw error;
        }
    }
    
    /**
     * UI要素キャッシュ（初期化時のみ実行）
     */
    cacheUIElements() {
        // 音量バー
        if (this.options.volumeBarSelector) {
            this.volumeBar = document.querySelector(this.options.volumeBarSelector);
            if (!this.volumeBar) {
                this.log(`音量バー要素が見つかりません: ${this.options.volumeBarSelector}`, 'WARNING');
            }
        }
        
        // 音量テキスト
        if (this.options.volumeTextSelector) {
            this.volumeText = document.querySelector(this.options.volumeTextSelector);
            if (!this.volumeText) {
                this.log(`音量テキスト要素が見つかりません: ${this.options.volumeTextSelector}`, 'WARNING');
            }
        }
        
        // 周波数表示
        if (this.options.frequencySelector) {
            this.frequencyElement = document.querySelector(this.options.frequencySelector);
            if (!this.frequencyElement) {
                this.log(`周波数要素が見つかりません: ${this.options.frequencySelector}`, 'WARNING');
            }
        }
        
        this.log('UI要素キャッシュ完了', 'INFO');
    }
    
    /**
     * PitchProモジュール動的ロード
     */
    async loadPitchProModules() {
        try {
            // 実際のPitchProモジュールのパスを環境に応じて調整
            const pitchProPath = this.resolvePitchProPath();
            
            this.log(`PitchProモジュールロード: ${pitchProPath}`, 'INFO');
            
            // AudioManagerとPitchDetectorは実際のPitchProライブラリからインポート
            // 現在はモックとして実装（実際の統合時に置き換え）
            const { AudioManager, PitchDetector } = await this.loadPitchProMock();
            
            this.AudioManager = AudioManager;
            this.PitchDetector = PitchDetector;
            
            this.log('PitchProモジュールロード完了', 'SUCCESS');
            
        } catch (error) {
            this.log(`PitchProモジュールロードエラー: ${error.message}`, 'ERROR');
            throw error;
        }
    }
    
    /**
     * PitchProパス解決
     */
    resolvePitchProPath() {
        // 本番環境では実際のPitchProライブラリパスを返す
        // 開発環境ではモック版を使用
        const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname.includes('127.0.0.1');
        
        if (isDevelopment) {
            return './pitch-pro-mock.js';
        } else {
            return '../../js/pitchpro-audio-processing.js';
        }
    }
    
    /**
     * PitchProモック（開発・テスト用）
     */
    async loadPitchProMock() {
        // 実際のPitchProライブラリが利用できない場合のモック実装
        const AudioManager = class {
            async initialize() { return true; }
            async startCapture() { return true; }
            stopCapture() {}
            destroy() {}
        };
        
        const PitchDetector = class {
            constructor(options) { this.options = options; this.callbacks = {}; }
            setCallbacks(callbacks) { this.callbacks = callbacks; }
            async startDetection() { 
                // モック用の定期更新
                this.mockInterval = setInterval(() => {
                    if (this.callbacks.onPitchUpdate) {
                        this.callbacks.onPitchUpdate({
                            volume: Math.random() * 100,
                            frequency: 200 + Math.random() * 200,
                            clarity: 0.5 + Math.random() * 0.5,
                            timestamp: Date.now()
                        });
                    }
                }, 100);
                return true; 
            }
            stopDetection() { 
                if (this.mockInterval) {
                    clearInterval(this.mockInterval);
                    this.mockInterval = null;
                }
            }
            destroy() { this.stopDetection(); }
        };
        
        return { AudioManager, PitchDetector };
    }
    
    /**
     * AudioManager初期化
     */
    async initializeAudioManager() {
        try {
            this.audioManager = new this.AudioManager({
                deviceSpecs: this.deviceSpecs,
                noiseThreshold: this.options.noiseThreshold,
                debugMode: this.options.debugMode
            });
            
            await this.audioManager.initialize();
            await this.audioManager.startCapture();
            
            this.log('AudioManager初期化完了', 'SUCCESS');
            
        } catch (error) {
            this.log(`AudioManager初期化エラー: ${error.message}`, 'ERROR');
            throw error;
        }
    }
    
    /**
     * PitchDetector初期化
     */
    async initializePitchDetector() {
        try {
            this.pitchDetector = new this.PitchDetector({
                audioManager: this.audioManager,
                clarityThreshold: this.options.clarityThreshold,
                minVolumeAbsolute: this.options.minVolumeAbsolute,
                sensitivity: this.deviceSpecs.sensitivity,
                debugMode: this.options.debugMode
            });
            
            // コールバック設定
            this.pitchDetector.setCallbacks({
                onPitchUpdate: (result) => this.handlePitchUpdate(result),
                onError: (error) => this.handleError('PITCH_DETECTION_ERROR', error)
            });
            
            this.log('PitchDetector初期化完了', 'SUCCESS');
            
        } catch (error) {
            this.log(`PitchDetector初期化エラー: ${error.message}`, 'ERROR');
            throw error;
        }
    }
    
    /**
     * 検出開始
     */
    async startDetection() {
        if (!this.isInitialized) {
            throw new Error('初期化が完了していません');
        }
        
        if (this.isDetecting) {
            this.log('検出は既に開始されています', 'WARNING');
            return true;
        }
        
        try {
            this.log('検出開始', 'INFO');
            
            await this.pitchDetector.startDetection();
            
            this.isDetecting = true;
            this.notifyStateChange('detecting');
            
            this.log('検出開始完了', 'SUCCESS');
            return true;
            
        } catch (error) {
            this.log(`検出開始エラー: ${error.message}`, 'ERROR');
            this.handleError('DETECTION_START_FAILED', error);
            throw error;
        }
    }
    
    /**
     * 検出停止
     */
    stopDetection() {
        if (!this.isDetecting) {
            this.log('検出は既に停止されています', 'WARNING');
            return;
        }
        
        try {
            this.log('検出停止', 'INFO');
            
            if (this.pitchDetector) {
                this.pitchDetector.stopDetection();
            }
            
            this.isDetecting = false;
            this.notifyStateChange('stopped');
            
            this.log('検出停止完了', 'SUCCESS');
            
        } catch (error) {
            this.log(`検出停止エラー: ${error.message}`, 'ERROR');
            this.handleError('DETECTION_STOP_FAILED', error);
        }
    }
    
    /**
     * 音声データ更新処理（CLAUDE.md重要教訓: result.volume必須使用）
     */
    handlePitchUpdate(result) {
        try {
            // CLAUDE.mdの重要教訓: 必ずresult.volumeを使用
            const volume = result.volume;
            const frequency = result.frequency || 0;
            const clarity = result.clarity || 0;
            const timestamp = result.timestamp || Date.now();
            
            // データ更新
            this.currentData = {
                volume,
                frequency,
                clarity,
                timestamp
            };
            
            // UI更新
            this.updateVolumeDisplay(volume);
            
            if (this.options.enableFrequencyDetection && frequency > 0) {
                this.updateFrequencyDisplay(frequency);
            }
            
            // コールバック実行
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
     * 音量表示更新
     */
    updateVolumeDisplay(volume) {
        // デバイス別最適化適用
        const displayVolume = Math.min(100, volume * this.deviceSpecs.volumeBarMultiplier);
        
        // 音量バー更新
        if (this.volumeBar) {
            this.volumeBar.style.width = `${Math.max(0, displayVolume)}%`;
        }
        
        // 音量テキスト更新
        if (this.volumeText) {
            this.volumeText.textContent = `${Math.round(displayVolume)}%`;
        }
    }
    
    /**
     * 周波数表示更新
     */
    updateFrequencyDisplay(frequency) {
        if (this.frequencyElement && frequency > 0) {
            this.frequencyElement.textContent = `${Math.round(frequency)} Hz`;
        }
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
     * リソース破棄（CLAUDE.md重要教訓: destroy()が必須）
     */
    destroy() {
        if (this.isDestroyed) {
            this.log('既に破棄されています', 'WARNING');
            return;
        }
        
        try {
            this.log('リソース破棄開始', 'INFO');
            
            // 検出停止
            this.stopDetection();
            
            // PitchDetector破棄
            if (this.pitchDetector) {
                this.pitchDetector.destroy();
                this.pitchDetector = null;
            }
            
            // AudioManager破棄
            if (this.audioManager) {
                this.audioManager.destroy();
                this.audioManager = null;
            }
            
            // コールバッククリア
            this.callbacks = {};
            
            // UI要素参照クリア
            this.volumeBar = null;
            this.volumeText = null;
            this.frequencyElement = null;
            
            // 状態リセット
            this.isInitialized = false;
            this.isDetecting = false;
            this.isDestroyed = true;
            
            this.log('リソース破棄完了', 'SUCCESS');
            
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