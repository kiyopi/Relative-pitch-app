/**
 * RecordingController - 収録制御メソッド統合システム
 * 
 * @version 4.0.0
 * @description v4.0音域テスト向け完全統合型収録制御システム
 * @features UI状態・アニメーション・フロー制御の一元化
 * @author Claude Code
 * @date 2025-01-09
 */

class RecordingController {
    constructor(options = {}) {
        this.options = {
            // UI要素セレクター
            micTestVolumeBar: '#volume-progress',
            micTestVolumeText: '#volume-percentage',
            rangeTestVolumeBar: '#range-test-volume-bar',
            rangeTestVolumeText: '#range-test-volume-text',
            rangeTestFrequency: '#range-test-frequency-value',
            
            // 制御要素
            micTestButton: '#start-mic-test',
            rangeTestStartButton: '#start-range-test',
            recordButtons: '.record-btn',
            
            // 状態表示要素
            statusDisplay: '#recording-status',
            progressDisplay: '#test-progress',
            
            // アニメーション制御
            enableAnimations: true,
            animationDuration: 500,
            
            // デバッグ設定
            debugMode: false,
            
            ...options
        };
        
        // 状態管理
        this.currentPhase = 'initial'; // initial, mic-test, range-test, recording, completed
        this.isRecording = false;
        this.recordingData = [];
        this.currentNote = null;
        
        // PitchPro統合関連
        this.audioDetector = null;
        this.volumeBarController = null;
        
        // UI要素キャッシュ
        this.elements = {};
        this.cacheElements();
        
        // イベントリスナー管理
        this.eventListeners = new Map();
        
        this.log('RecordingController初期化完了', 'SUCCESS');
    }
    
    /**
     * UI要素をキャッシュ
     */
    cacheElements() {
        const selectors = [
            'micTestVolumeBar',
            'micTestVolumeText', 
            'rangeTestVolumeBar',
            'rangeTestVolumeText',
            'rangeTestFrequency',
            'micTestButton',
            'rangeTestStartButton',
            'statusDisplay',
            'progressDisplay'
        ];
        
        selectors.forEach(key => {
            const selector = this.options[key];
            if (selector) {
                const element = document.querySelector(selector);
                if (element) {
                    this.elements[key] = element;
                } else {
                    this.log(`要素が見つかりません: ${selector}`, 'WARNING');
                }
            }
        });
        
        // 記録ボタンを別途取得（複数要素）
        this.elements.recordButtons = document.querySelectorAll(this.options.recordButtons);
    }
    
    /**
     * 初期化処理
     */
    async initialize() {
        try {
            this.log('初期化開始', 'INFO');
            
            // イベントリスナー設定
            this.setupEventListeners();
            
            // 初期UI状態設定
            this.updateUIState('initial');
            
            this.log('初期化完了', 'SUCCESS');
            return true;
        } catch (error) {
            this.log(`初期化エラー: ${error.message}`, 'ERROR');
            throw error;
        }
    }
    
    /**
     * イベントリスナー設定
     */
    setupEventListeners() {
        // マイクテスト開始ボタン
        if (this.elements.micTestButton) {
            this.addEventListener(this.elements.micTestButton, 'click', () => {
                this.startMicTest();
            });
        }
        
        // 音域テスト開始ボタン
        if (this.elements.rangeTestStartButton) {
            this.addEventListener(this.elements.rangeTestStartButton, 'click', () => {
                this.startRangeTest();
            });
        }
        
        // 記録ボタン
        this.elements.recordButtons.forEach((button, index) => {
            this.addEventListener(button, 'click', () => {
                this.handleRecordButton(button, index);
            });
        });
    }
    
    /**
     * イベントリスナー追加（管理付き）
     */
    addEventListener(element, event, handler) {
        const key = `${element.id || element.className}_${event}`;
        
        // 既存のリスナーを削除
        if (this.eventListeners.has(key)) {
            const oldHandler = this.eventListeners.get(key);
            element.removeEventListener(event, oldHandler);
        }
        
        // 新しいリスナーを追加
        element.addEventListener(event, handler);
        this.eventListeners.set(key, handler);
    }
    
    /**
     * マイクテスト開始
     */
    async startMicTest() {
        try {
            this.log('マイクテスト開始', 'INFO');
            this.currentPhase = 'mic-test';
            
            // UI状態更新
            this.updateUIState('mic-test');
            this.updateStatus('マイクテスト実行中...');
            
            // PitchPro AudioDetectionComponent初期化（マイクテスト用）
            if (this.audioDetector) {
                this.audioDetector.destroy();
            }
            
            const { AudioDetectionComponent } = await import('./pitch-pro-integration.js');
            this.audioDetector = new AudioDetectionComponent({
                volumeBarSelector: this.options.micTestVolumeBar,
                volumeTextSelector: this.options.micTestVolumeText,
                enableFrequencyDetection: false, // マイクテストでは音程検出無効
                debugMode: this.options.debugMode
            });
            
            await this.audioDetector.initialize();
            await this.audioDetector.startDetection();
            
            // マイクテスト用コールバック設定
            this.audioDetector.setCallbacks({
                onVolumeUpdate: (result) => {
                    // CLAUDE.mdの重要教訓: 必ずresult.volumeを使用
                    const volume = result.volume;
                    this.handleMicTestVolumeUpdate(volume);
                },
                onError: (error) => {
                    this.handleAudioError(error);
                }
            });
            
            this.log('マイクテスト開始完了', 'SUCCESS');
            
        } catch (error) {
            this.log(`マイクテスト開始エラー: ${error.message}`, 'ERROR');
            this.updateStatus('マイクテストでエラーが発生しました');
            throw error;
        }
    }
    
    /**
     * 音域テスト開始 
     */
    async startRangeTest() {
        try {
            this.log('音域テスト開始', 'INFO');
            this.currentPhase = 'range-test';
            
            // UI状態更新
            this.updateUIState('range-test');
            this.updateStatus('音域テスト準備中...');
            
            // CLAUDE.mdの重要教訓: AudioDetectionComponentはdestroy() → 再作成が必須
            if (this.audioDetector) {
                this.audioDetector.stopDetection();
                this.audioDetector.destroy();
            }
            
            // 音域テスト用AudioDetectionComponent再作成
            const { AudioDetectionComponent } = await import('./pitch-pro-integration.js');
            this.audioDetector = new AudioDetectionComponent({
                volumeBarSelector: this.options.rangeTestVolumeBar,
                volumeTextSelector: this.options.rangeTestVolumeText,
                frequencySelector: this.options.rangeTestFrequency,
                enableFrequencyDetection: true, // 音域テストでは音程検出有効
                debugMode: this.options.debugMode
            });
            
            await this.audioDetector.initialize();
            await this.audioDetector.startDetection();
            
            // 音域テスト用コールバック設定
            this.audioDetector.setCallbacks({
                onPitchUpdate: (result) => {
                    // CLAUDE.mdの重要教訓: 必ずresult.volumeを使用
                    const volume = result.volume;
                    const frequency = result.frequency;
                    const clarity = result.clarity;
                    
                    this.handleRangeTestUpdate(volume, frequency, clarity);
                },
                onError: (error) => {
                    this.handleAudioError(error);
                }
            });
            
            this.updateStatus('音域テスト開始しました。声を出して音域を測定してください。');
            this.log('音域テスト開始完了', 'SUCCESS');
            
        } catch (error) {
            this.log(`音域テスト開始エラー: ${error.message}`, 'ERROR');
            this.updateStatus('音域テストでエラーが発生しました');
            throw error;
        }
    }
    
    /**
     * 記録ボタンハンドラー
     */
    handleRecordButton(button, noteIndex) {
        if (this.currentPhase !== 'range-test') {
            this.log('音域テストが開始されていません', 'WARNING');
            return;
        }
        
        const noteName = this.getNoteNameByIndex(noteIndex);
        
        if (this.isRecording) {
            // 記録停止
            this.stopRecording(noteName, noteIndex);
        } else {
            // 記録開始
            this.startRecording(noteName, noteIndex, button);
        }
    }
    
    /**
     * 記録開始
     */
    startRecording(noteName, noteIndex, button) {
        try {
            this.log(`記録開始: ${noteName}`, 'INFO');
            
            this.isRecording = true;
            this.currentNote = { name: noteName, index: noteIndex };
            this.recordingData = [];
            
            // ボタン状態更新（アニメーション開始）
            this.updateRecordButtonState(button, 'recording');
            this.updateStatus(`${noteName}を記録中...`);
            
            // 記録用タイマー開始（3秒後に自動停止）
            this.recordingTimer = setTimeout(() => {
                this.stopRecording(noteName, noteIndex);
            }, 3000);
            
        } catch (error) {
            this.log(`記録開始エラー: ${error.message}`, 'ERROR');
            this.isRecording = false;
            this.currentNote = null;
        }
    }
    
    /**
     * 記録停止
     */
    stopRecording(noteName, noteIndex) {
        try {
            this.log(`記録停止: ${noteName}`, 'INFO');
            
            if (this.recordingTimer) {
                clearTimeout(this.recordingTimer);
                this.recordingTimer = null;
            }
            
            // 記録データ処理
            const recordingResult = this.processRecordingData(noteName, this.recordingData);
            
            // ボタン状態更新（完了状態）
            const button = this.elements.recordButtons[noteIndex];
            if (button) {
                this.updateRecordButtonState(button, 'completed', recordingResult);
            }
            
            this.isRecording = false;
            this.currentNote = null;
            this.updateStatus(`${noteName}の記録が完了しました`);
            
            // 全音域記録完了チェック
            this.checkAllNotesRecorded();
            
        } catch (error) {
            this.log(`記録停止エラー: ${error.message}`, 'ERROR');
        }
    }
    
    /**
     * マイクテスト音量更新処理
     */
    handleMicTestVolumeUpdate(volume) {
        // 音量バーは既にAudioDetectionComponentで更新されている
        // 追加の処理がある場合はここに記述
        
        if (volume > 50) { // 50%以上の音量が検出された場合
            // マイクテスト成功の視覚的フィードバック
            this.showMicTestSuccess();
        }
    }
    
    /**
     * 音域テスト更新処理
     */
    handleRangeTestUpdate(volume, frequency, clarity) {
        // 音量バー・周波数表示は既にAudioDetectionComponentで更新されている
        
        // 記録中の場合、データを蓄積
        if (this.isRecording && this.currentNote) {
            this.recordingData.push({
                timestamp: Date.now(),
                volume,
                frequency,
                clarity,
                noteName: this.currentNote.name
            });
        }
        
        // リアルタイムフィードバック
        this.updateRealTimeFeedback(volume, frequency, clarity);
    }
    
    /**
     * 記録データ処理
     */
    processRecordingData(noteName, data) {
        if (!data || data.length === 0) {
            return { success: false, reason: 'データなし' };
        }
        
        // 音量・周波数・明瞭度の平均値計算
        const avgVolume = data.reduce((sum, d) => sum + d.volume, 0) / data.length;
        const validFrequencies = data.filter(d => d.frequency > 0);
        const avgFrequency = validFrequencies.length > 0 
            ? validFrequencies.reduce((sum, d) => sum + d.frequency, 0) / validFrequencies.length 
            : 0;
        const avgClarity = data.reduce((sum, d) => sum + d.clarity, 0) / data.length;
        
        // 記録成功判定
        const isSuccess = avgVolume > 30 && avgFrequency > 0 && avgClarity > 0.4;
        
        const result = {
            noteName,
            success: isSuccess,
            avgVolume,
            avgFrequency,
            avgClarity,
            dataPoints: data.length,
            reason: isSuccess ? '記録成功' : this.getFailureReason(avgVolume, avgFrequency, avgClarity)
        };
        
        this.log(`記録処理完了: ${noteName}`, 'INFO', result);
        return result;
    }
    
    /**
     * UI状態更新
     */
    updateUIState(phase) {
        const body = document.body;
        
        // フェーズクラス更新
        body.classList.remove('phase-initial', 'phase-mic-test', 'phase-range-test', 'phase-recording');
        body.classList.add(`phase-${phase}`);
        
        // 各フェーズに応じたUI制御
        switch (phase) {
            case 'initial':
                this.showSection('mic-test-section');
                break;
            case 'mic-test':
                this.showSection('mic-test-section');
                this.enableElement(this.elements.rangeTestStartButton, false);
                break;
            case 'range-test':
                this.showSection('range-test-section');
                this.enableElement(this.elements.micTestButton, false);
                break;
        }
        
        this.currentPhase = phase;
    }
    
    /**
     * 記録ボタン状態更新
     */
    updateRecordButtonState(button, state, result = null) {
        if (!button) return;
        
        // 既存状態クラス削除
        button.classList.remove('recording', 'completed', 'failed');
        
        switch (state) {
            case 'recording':
                button.classList.add('recording');
                button.textContent = '記録中...';
                break;
            case 'completed':
                if (result && result.success) {
                    button.classList.add('completed');
                    button.textContent = '✓ 完了';
                } else {
                    button.classList.add('failed');
                    button.textContent = '× 失敗';
                }
                break;
            case 'idle':
            default:
                button.textContent = '記録';
                break;
        }
    }
    
    /**
     * ステータス表示更新
     */
    updateStatus(message, type = 'info') {
        if (this.elements.statusDisplay) {
            this.elements.statusDisplay.textContent = message;
            this.elements.statusDisplay.className = `status-${type}`;
        }
        
        this.log(`ステータス更新: ${message}`, type.toUpperCase());
    }
    
    /**
     * ユーティリティ: 音符名取得
     */
    getNoteNameByIndex(index) {
        const noteNames = ['C3', 'D3', 'E3', 'F3', 'G3', 'A3', 'B3', 'C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5'];
        return noteNames[index] || `Note${index}`;
    }
    
    /**
     * ユーティリティ: セクション表示
     */
    showSection(sectionId) {
        const section = document.getElementById(sectionId);
        if (section) {
            section.style.display = 'block';
            if (this.options.enableAnimations) {
                section.style.opacity = '0';
                setTimeout(() => {
                    section.style.opacity = '1';
                }, 50);
            }
        }
    }
    
    /**
     * ユーティリティ: 要素有効/無効化
     */
    enableElement(element, enabled) {
        if (!element) return;
        
        if (enabled) {
            element.removeAttribute('disabled');
            element.classList.remove('disabled');
        } else {
            element.setAttribute('disabled', 'true');
            element.classList.add('disabled');
        }
    }
    
    /**
     * ログ出力
     */
    log(message, level = 'INFO', data = null) {
        if (!this.options.debugMode && level !== 'ERROR') return;
        
        const timestamp = new Date().toLocaleTimeString();
        const logMessage = `[RecordingController ${timestamp}] ${level}: ${message}`;
        
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
     * クリーンアップ処理
     */
    destroy() {
        try {
            this.log('クリーンアップ開始', 'INFO');
            
            // タイマークリア
            if (this.recordingTimer) {
                clearTimeout(this.recordingTimer);
            }
            
            // AudioDetector破棄
            if (this.audioDetector) {
                this.audioDetector.destroy();
                this.audioDetector = null;
            }
            
            // イベントリスナー削除
            this.eventListeners.forEach((handler, key) => {
                const [elementKey, event] = key.split('_');
                const element = this.elements[elementKey];
                if (element) {
                    element.removeEventListener(event, handler);
                }
            });
            this.eventListeners.clear();
            
            this.log('クリーンアップ完了', 'SUCCESS');
        } catch (error) {
            this.log(`クリーンアップエラー: ${error.message}`, 'ERROR');
        }
    }
}

export default RecordingController;