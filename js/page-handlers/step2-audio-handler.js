/**
 * Step2AudioHandler - preparation-step2.html専用音声処理
 *
 * @version 1.0.0
 * @description GlobalAudioManagerを使用したシンプルなStep2音域テスト実装
 * @date 2025-01-29
 */

class Step2AudioHandler {
    constructor() {
        this.audioManager = window.globalAudioManager;
        this.currentPhase = 'idle'; // idle, measuring, completed
        this.measurementData = {
            frequencies: [],
            lowestFreq: null,
            highestFreq: null,
            measurements: 0
        };

        // UI要素（Step2固有）
        this.uiElements = {
            beginBtn: null,
            retryBtn: null,
            remeasureBtn: null,
            mainStatusText: null,
            subInfoText: null,
            rangeIcon: null,
            stabilityRing: null,
            resultsSection: null
        };

        // 測定設定
        this.config = {
            measurementDuration: 10000,  // 10秒間
            minMeasurements: 30,         // 最小測定回数
            updateInterval: 100          // 100ms間隔
        };
    }

    /**
     * Step2初期化
     */
    async initialize() {
        try {
            console.log('🔄 Step2AudioHandler: 初期化開始');

            // UI要素キャッシュ
            this.cacheUIElements();

            // Step1完了状態確認
            await this.checkStep1Completion();

            // GlobalAudioManager初期化（既に初期化済みの場合はスキップ）
            await this.audioManager.initialize();

            // Step2用UI要素に接続
            await this.audioManager.connectToPage('Step2-VoiceRange', {
                volumeBarSelector: '#range-test-volume-bar',
                volumeTextSelector: '#range-test-volume-text',
                frequencySelector: '#range-test-frequency-value'
            });

            // イベントリスナー設定
            this.setupEventListeners();

            // 初期UI状態設定
            this.updateUI('ready');

            console.log('✅ Step2AudioHandler: 初期化完了');
            return { success: true };

        } catch (error) {
            console.error('❌ Step2AudioHandler初期化失敗:', error);
            throw error;
        }
    }

    /**
     * UI要素キャッシュ
     */
    cacheUIElements() {
        this.uiElements.beginBtn = document.getElementById('begin-range-test-btn');
        this.uiElements.retryBtn = document.getElementById('retry-measurement-btn');
        this.uiElements.remeasureBtn = document.getElementById('remeasure-btn');
        this.uiElements.mainStatusText = document.getElementById('main-status-text');
        this.uiElements.subInfoText = document.getElementById('sub-info-text');
        this.uiElements.rangeIcon = document.getElementById('range-icon');
        this.uiElements.stabilityRing = document.getElementById('stability-ring');
        this.uiElements.resultsSection = document.getElementById('results-section');

        console.log('✅ Step2: UI要素キャッシュ完了');
    }

    /**
     * Step1完了状態確認
     */
    async checkStep1Completion() {
        const step1Completed = localStorage.getItem('step1Completed');
        const micPermission = localStorage.getItem('micPermissionGranted');

        if (step1Completed !== 'true' || micPermission !== 'true') {
            console.warn('⚠️ Step1未完了: Step1に戻ります');
            // Step1に戻る（実際の実装では適切な処理）
            // window.location.href = 'preparation-step1.html';
            return;
        }

        console.log('✅ Step1完了確認済み');
    }

    /**
     * イベントリスナー設定
     */
    setupEventListeners() {
        // 音域テスト開始ボタン
        if (this.uiElements.beginBtn) {
            this.uiElements.beginBtn.addEventListener('click', () => {
                this.startVoiceRangeTest();
            });
        }

        // 再測定ボタン
        if (this.uiElements.retryBtn) {
            this.uiElements.retryBtn.addEventListener('click', () => {
                this.retryMeasurement();
            });
        }

        // 結果画面の再測定ボタン
        if (this.uiElements.remeasureBtn) {
            this.uiElements.remeasureBtn.addEventListener('click', () => {
                this.retryMeasurement();
            });
        }

        console.log('✅ Step2: イベントリスナー設定完了');
    }

    /**
     * 音域テスト開始
     */
    async startVoiceRangeTest() {
        try {
            console.log('🎵 Step2: 音域テスト開始');

            this.currentPhase = 'measuring';
            this.resetMeasurementData();

            // コールバック設定
            this.audioManager.setPageCallbacks({
                onPitchUpdate: (result) => this.handlePitchUpdate(result),
                onVolumeUpdate: (volume) => this.handleVolumeUpdate(volume),
                onError: (error) => this.handleAudioError(error)
            });

            // 音声検出開始
            await this.audioManager.startDetection();

            // UI更新
            this.updateUI('measuring');

            // 測定タイマー開始
            this.startMeasurementTimer();

        } catch (error) {
            console.error('❌ 音域テスト開始失敗:', error);
            this.updateUI('error');
        }
    }

    /**
     * 測定タイマー開始
     */
    startMeasurementTimer() {
        let elapsed = 0;
        const interval = this.config.updateInterval;
        const duration = this.config.measurementDuration;

        const timer = setInterval(() => {
            elapsed += interval;
            const progress = (elapsed / duration) * 100;

            // プログレスリング更新
            this.updateProgressRing(progress);

            // 時間表示更新
            const remaining = Math.ceil((duration - elapsed) / 1000);
            this.updateStatusText(`音域測定中... ${remaining}秒`);

            // 測定完了
            if (elapsed >= duration) {
                clearInterval(timer);
                this.completeMeasurement();
            }
        }, interval);
    }

    /**
     * ピッチ更新処理
     */
    handlePitchUpdate(result) {
        if (this.currentPhase !== 'measuring') return;

        // 有効な音程データのみ記録
        if (result.frequency && result.volume > 0.1 && result.clarity > 0.5) {
            this.measurementData.frequencies.push({
                frequency: result.frequency,
                note: result.note,
                volume: result.volume,
                clarity: result.clarity,
                timestamp: Date.now()
            });

            // 最低音・最高音更新
            this.updateFrequencyRange(result.frequency);

            this.measurementData.measurements++;
        }
    }

    /**
     * 音量更新処理
     */
    handleVolumeUpdate(volume) {
        // PitchProが自動でUI更新するため、追加処理のみ
        if (volume > 0.3) {
            // 音量十分な場合の視覚的フィードバック
            this.updateRangeIcon('active');
        } else {
            this.updateRangeIcon('idle');
        }
    }

    /**
     * エラー処理
     */
    handleAudioError(error) {
        console.error('🚨 音域テスト音声エラー:', error);
        this.updateUI('error');
    }

    /**
     * 周波数範囲更新
     */
    updateFrequencyRange(frequency) {
        if (!this.measurementData.lowestFreq || frequency < this.measurementData.lowestFreq) {
            this.measurementData.lowestFreq = frequency;
        }
        if (!this.measurementData.highestFreq || frequency > this.measurementData.highestFreq) {
            this.measurementData.highestFreq = frequency;
        }
    }

    /**
     * 測定完了
     */
    completeMeasurement() {
        console.log('✅ 音域測定完了', this.measurementData);

        this.currentPhase = 'completed';
        this.audioManager.stopDetection();

        // 測定結果検証
        if (this.measurementData.measurements < this.config.minMeasurements) {
            console.warn('⚠️ 測定データ不足');
            this.updateUI('insufficient-data');
            return;
        }

        // 結果計算・保存
        const results = this.calculateResults();
        this.saveResults(results);

        // UI更新
        this.displayResults(results);
        this.updateUI('completed');
    }

    /**
     * 結果計算
     */
    calculateResults() {
        const { lowestFreq, highestFreq, frequencies } = this.measurementData;

        // 音程名変換（簡易版）
        const getNoteName = (freq) => {
            const A4 = 440;
            const C0 = A4 * Math.pow(2, -4.75);
            const halfSteps = Math.round(12 * Math.log2(freq / C0));
            const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
            const octave = Math.floor(halfSteps / 12);
            const note = noteNames[halfSteps % 12];
            return `${note}${octave}`;
        };

        const lowNote = getNoteName(lowestFreq);
        const highNote = getNoteName(highestFreq);
        const octaveRange = Math.log2(highestFreq / lowestFreq).toFixed(1);

        return {
            range: `${lowNote} - ${highNote}`,
            octaves: parseFloat(octaveRange),
            lowPitch: {
                frequency: lowestFreq,
                note: lowNote
            },
            highPitch: {
                frequency: highestFreq,
                note: highNote
            },
            measurements: frequencies.length,
            duration: this.config.measurementDuration / 1000,
            timestamp: new Date().toISOString()
        };
    }

    /**
     * 結果保存
     */
    saveResults(results) {
        localStorage.setItem('voiceRangeData', JSON.stringify(results));
        localStorage.setItem('step2Completed', 'true');
        console.log('✅ 音域テスト結果保存完了');
    }

    /**
     * 結果表示
     */
    displayResults(results) {
        // 基本結果表示
        document.getElementById('result-range').textContent = results.range;
        document.getElementById('result-octaves').textContent = `${results.octaves}オクターブ`;
        document.getElementById('result-low-freq').textContent =
            `${results.lowPitch.frequency.toFixed(1)} Hz (${results.lowPitch.note})`;
        document.getElementById('result-high-freq').textContent =
            `${results.highPitch.frequency.toFixed(1)} Hz (${results.highPitch.note})`;

        // 詳細統計
        const resultDetails = document.getElementById('result-details');
        if (resultDetails) {
            resultDetails.innerHTML = `
                <div class="result-info-row">
                    <span>📊 測定回数</span>
                    <span class="result-info-value">${results.measurements}回</span>
                </div>
                <div class="result-info-row">
                    <span>⏱️ 測定時間</span>
                    <span class="result-info-value">${results.duration}秒</span>
                </div>
            `;
        }

        // 結果セクション表示
        if (this.uiElements.resultsSection) {
            this.uiElements.resultsSection.classList.remove('hidden');
        }
    }

    /**
     * UI状態更新
     */
    updateUI(state) {
        switch (state) {
            case 'ready':
                this.updateStatusText('Step1完了！音域テストを開始してください');
                this.updateSubText('Step1完了・音域測定準備完了');
                if (this.uiElements.beginBtn) {
                    this.uiElements.beginBtn.disabled = false;
                }
                break;

            case 'measuring':
                this.updateStatusText('音域測定中...');
                this.updateSubText('低い音から高い音まで発声してください');
                if (this.uiElements.beginBtn) {
                    this.uiElements.beginBtn.disabled = true;
                }
                break;

            case 'completed':
                this.updateStatusText('音域測定完了！');
                this.updateSubText('結果を確認してください');
                break;

            case 'insufficient-data':
                this.updateStatusText('測定データが不足しています');
                this.updateSubText('再測定をお試しください');
                this.showRetryButton();
                break;

            case 'error':
                this.updateStatusText('測定中にエラーが発生しました');
                this.updateSubText('再測定をお試しください');
                this.showRetryButton();
                break;
        }
    }

    /**
     * ステータステキスト更新
     */
    updateStatusText(text) {
        if (this.uiElements.mainStatusText) {
            this.uiElements.mainStatusText.textContent = text;
        }
    }

    updateSubText(text) {
        if (this.uiElements.subInfoText) {
            this.uiElements.subInfoText.textContent = text;
        }
    }

    /**
     * プログレスリング更新
     */
    updateProgressRing(progress) {
        if (this.uiElements.stabilityRing) {
            const circle = this.uiElements.stabilityRing.querySelector('.voice-progress-circle');
            if (circle) {
                const circumference = 452;
                const offset = circumference - (progress / 100) * circumference;
                circle.style.strokeDashoffset = offset;
            }
        }
    }

    /**
     * 音域アイコン更新
     */
    updateRangeIcon(state) {
        if (!this.uiElements.rangeIcon) return;

        switch (state) {
            case 'active':
                this.uiElements.rangeIcon.classList.add('measuring');
                break;
            case 'idle':
                this.uiElements.rangeIcon.classList.remove('measuring');
                break;
        }
    }

    /**
     * 再測定ボタン表示
     */
    showRetryButton() {
        if (this.uiElements.retryBtn) {
            this.uiElements.retryBtn.classList.remove('btn-hidden');
        }
    }

    /**
     * 再測定実行
     */
    retryMeasurement() {
        console.log('🔄 音域テスト再測定');

        this.resetMeasurementData();

        if (this.uiElements.resultsSection) {
            this.uiElements.resultsSection.classList.add('hidden');
        }
        if (this.uiElements.retryBtn) {
            this.uiElements.retryBtn.classList.add('btn-hidden');
        }

        this.startVoiceRangeTest();
    }

    /**
     * 測定データリセット
     */
    resetMeasurementData() {
        this.measurementData = {
            frequencies: [],
            lowestFreq: null,
            highestFreq: null,
            measurements: 0
        };
    }

    /**
     * システム状態取得
     */
    getStatus() {
        return {
            currentPhase: this.currentPhase,
            measurementData: this.measurementData,
            audioManagerStatus: this.audioManager.getStatus()
        };
    }
}

// グローバル初期化
let step2AudioHandler;

document.addEventListener('DOMContentLoaded', async () => {
    try {
        step2AudioHandler = new Step2AudioHandler();
        await step2AudioHandler.initialize();
        console.log('🚀 Step2: 初期化完了');
    } catch (error) {
        console.error('🚨 Step2: 初期化失敗', error);
    }
});

// デバッグ用グローバルアクセス
if (typeof window !== 'undefined') {
    window.step2AudioHandler = step2AudioHandler;
}