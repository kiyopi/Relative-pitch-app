/**
 * SimpleMicrophoneManager - 軽量マイク制御
 * 
 * @version 1.0.0
 * @description 自動回復機能なしのシンプルなマイク管理
 * @purpose PitchProライブラリと組み合わせて使用（マイク制御のみ担当）
 */

class SimpleMicrophoneManager {
    constructor(options = {}) {
        this.options = {
            sampleRate: 44100,
            channelCount: 1,
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false,
            debugMode: false,
            ...options
        };

        // 状態管理
        this.audioContext = null;
        this.mediaStream = null;
        this.analyserNode = null;
        this.micSource = null;
        this.isActive = false;
        
        // コールバック
        this.onAudioData = null;
        this.onError = null;
        
        this.log('SimpleMicrophoneManager初期化完了');
    }

    /**
     * マイク初期化・開始
     */
    async initialize() {
        try {
            this.log('マイク初期化開始');
            
            // AudioContext作成
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)({
                sampleRate: this.options.sampleRate
            });
            
            // MediaStream取得
            this.mediaStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: this.options.echoCancellation,
                    noiseSuppression: this.options.noiseSuppression,
                    autoGainControl: this.options.autoGainControl,
                    channelCount: this.options.channelCount,
                    sampleRate: this.options.sampleRate
                }
            });

            // Audio処理チェーン構築
            this.micSource = this.audioContext.createMediaStreamSource(this.mediaStream);
            this.analyserNode = this.audioContext.createAnalyser();
            this.analyserNode.fftSize = 2048;
            this.analyserNode.smoothingTimeConstant = 0.1;
            
            this.micSource.connect(this.analyserNode);
            // 注意: destination には接続しない（スピーカー出力回避）

            this.isActive = true;
            this.log('マイク初期化完了', 'SUCCESS');
            
            return { success: true };
            
        } catch (error) {
            this.log(`マイク初期化失敗: ${error.message}`, 'ERROR');
            this.handleError(error);
            return { success: false, error: error.message };
        }
    }

    /**
     * 音声データ取得開始
     */
    startAudioDataCapture(callback) {
        if (!this.isActive || !this.analyserNode) {
            throw new Error('マイクが初期化されていません');
        }

        this.onAudioData = callback;
        this.log('音声データ取得開始');
        
        // データ取得ループ開始
        this.dataLoop();
    }

    /**
     * 音声データループ（requestAnimationFrame使用）
     */
    dataLoop() {
        if (!this.isActive || !this.onAudioData) {
            return;
        }

        const bufferLength = this.analyserNode.frequencyBinCount;
        const audioData = new Float32Array(bufferLength);
        const frequencyData = new Uint8Array(bufferLength);
        
        // 時間領域データ（音量計算用）
        this.analyserNode.getFloatTimeDomainData(audioData);
        
        // 周波数領域データ（音程検出用）
        this.analyserNode.getByteFrequencyData(frequencyData);

        // 音量計算（RMS）
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
            sum += audioData[i] * audioData[i];
        }
        const volume = Math.sqrt(sum / bufferLength);

        // コールバック実行
        const audioInfo = {
            audioData: audioData,           // 時間領域データ
            frequencyData: frequencyData,   // 周波数領域データ
            volume: volume,                 // 音量（0-1）
            sampleRate: this.audioContext.sampleRate,
            timestamp: Date.now()
        };

        this.onAudioData(audioInfo);

        // 次のフレーム
        if (this.isActive) {
            requestAnimationFrame(() => this.dataLoop());
        }
    }

    /**
     * 停止・クリーンアップ
     */
    stop() {
        this.log('マイク停止開始');
        
        this.isActive = false;
        this.onAudioData = null;

        // MediaStream停止
        if (this.mediaStream) {
            this.mediaStream.getTracks().forEach(track => {
                this.log(`MediaStreamTrack停止: ${track.kind}`);
                track.stop();
            });
            this.mediaStream = null;
        }

        // AudioNode切断
        if (this.micSource) {
            this.micSource.disconnect();
            this.micSource = null;
        }

        if (this.analyserNode) {
            this.analyserNode.disconnect();
            this.analyserNode = null;
        }

        // AudioContext停止
        if (this.audioContext && this.audioContext.state !== 'closed') {
            this.audioContext.close();
            this.audioContext = null;
            this.log('AudioContext停止完了');
        }

        this.log('マイク停止完了', 'SUCCESS');
    }

    /**
     * 状態確認
     */
    getStatus() {
        return {
            isActive: this.isActive,
            hasMediaStream: !!this.mediaStream,
            hasAudioContext: !!this.audioContext,
            audioContextState: this.audioContext?.state || 'none',
            trackCount: this.mediaStream?.getTracks().length || 0
        };
    }

    /**
     * エラーハンドリング
     */
    handleError(error) {
        this.log(`エラー発生: ${error.message}`, 'ERROR');
        
        if (this.onError) {
            this.onError(error);
        }
        
        // エラー時は自動停止
        this.stop();
    }

    /**
     * コールバック設定
     */
    setErrorCallback(callback) {
        this.onError = callback;
    }

    /**
     * ログ出力
     */
    log(message, level = 'INFO') {
        if (this.options.debugMode) {
            console.log(`[SimpleMicrophoneManager] ${message}`);
        }
    }
}

/**
 * PitchProIntegrator - PitchProライブラリとの統合
 */
class PitchProIntegrator {
    constructor(options = {}) {
        this.options = {
            debugMode: false,
            ...options
        };
        
        this.micManager = null;
        this.pitchDetector = null;
        this.isDetecting = false;
        
        // コールバック
        this.onPitchResult = null;
        this.onVolumeUpdate = null;
        this.onError = null;
    }

    /**
     * 初期化
     */
    async initialize() {
        try {
            this.log('PitchPro統合初期化開始');

            // PitchProライブラリの必要部分のみ使用
            if (!window.PitchPro) {
                throw new Error('PitchProライブラリが読み込まれていません');
            }

            const { PitchDetector, DeviceDetection, FrequencyUtils } = window.PitchPro;

            // デバイス検出
            this.deviceSpecs = DeviceDetection.getDeviceSpecs();
            this.log(`デバイス検出: ${this.deviceSpecs.deviceType}`);

            // 軽量マイク管理初期化
            this.micManager = new SimpleMicrophoneManager({
                debugMode: this.options.debugMode
            });

            const micResult = await this.micManager.initialize();
            if (!micResult.success) {
                throw new Error(micResult.error);
            }

            // PitchDetector初期化（AudioManager使用せず）
            this.pitchDetector = new PitchDetector(null, {
                fftSize: 2048,
                smoothingTimeConstant: 0.1
            });

            this.log('PitchPro統合初期化完了', 'SUCCESS');
            return { success: true, deviceSpecs: this.deviceSpecs };

        } catch (error) {
            this.log(`初期化失敗: ${error.message}`, 'ERROR');
            return { success: false, error: error.message };
        }
    }

    /**
     * 検出開始
     */
    startDetection() {
        if (!this.micManager || !this.pitchDetector) {
            throw new Error('初期化されていません');
        }

        this.isDetecting = true;
        this.log('音程検出開始');

        // 音声データ取得開始
        this.micManager.startAudioDataCapture((audioInfo) => {
            if (!this.isDetecting) return;

            try {
                // 音量更新
                if (this.onVolumeUpdate) {
                    this.onVolumeUpdate(audioInfo.volume);
                }

                // 音程検出（PitchProライブラリ使用）
                // 注意: この部分は実際のPitchDetectorの実装に合わせて調整が必要
                const pitchResult = this.analysePitch(audioInfo);
                
                if (this.onPitchResult && pitchResult) {
                    this.onPitchResult(pitchResult);
                }

            } catch (error) {
                this.handleError(error);
            }
        });
    }

    /**
     * 音程解析（PitchProライブラリ活用）
     */
    analysePitch(audioInfo) {
        // この部分は実際のPitchDetectorの実装に合わせて実装
        // 現在は基本的な構造のみ提供
        return {
            frequency: 0,
            note: '--',
            cents: 0,
            clarity: 0,
            volume: audioInfo.volume
        };
    }

    /**
     * 停止
     */
    stopDetection() {
        this.log('音程検出停止');
        this.isDetecting = false;
        
        if (this.micManager) {
            this.micManager.stop();
        }
    }

    /**
     * コールバック設定
     */
    setCallbacks({ onPitchResult, onVolumeUpdate, onError }) {
        this.onPitchResult = onPitchResult;
        this.onVolumeUpdate = onVolumeUpdate;
        this.onError = onError;
    }

    /**
     * エラーハンドリング
     */
    handleError(error) {
        this.log(`エラー: ${error.message}`, 'ERROR');
        
        if (this.onError) {
            this.onError(error);
        }
    }

    /**
     * 完全クリーンアップ
     */
    cleanup() {
        this.stopDetection();
        
        if (this.micManager) {
            this.micManager.stop();
            this.micManager = null;
        }
        
        this.pitchDetector = null;
        this.log('クリーンアップ完了', 'SUCCESS');
    }

    /**
     * ログ出力
     */
    log(message, level = 'INFO') {
        if (this.options.debugMode) {
            console.log(`[PitchProIntegrator] ${message}`);
        }
    }
}

// グローバル公開
window.SimpleMicrophoneManager = SimpleMicrophoneManager;
window.PitchProIntegrator = PitchProIntegrator;