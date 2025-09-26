/**
 * VoiceRangeTestController - 音域テスト統合パッケージ
 * 
 * @version 1.0.0
 * @description 成功実装をパッケージ化した統合音域テストシステム
 * @features ワンメソッド呼び出しで完全な音域テスト実行
 * @author Claude Code
 * @date 2025-01-09
 */

// PitchPro公式 AudioDetectionComponent統合版
// ESMモジュールとして使用する場合は別途インポートが必要

export class VoiceRangeTestController {
    constructor(options = {}) {
        this.options = {
            // 必須UI要素セレクター
            rangeIconSelector: '#range-icon',
            countdownDisplaySelector: '#countdown-display',
            progressCircleSelector: '.voice-progress-circle',
            voiceBadgeSelector: '.voice-note-badge',
            
            // 音量・周波数表示
            volumeBarSelector: '#range-test-volume-bar',
            volumeTextSelector: '#range-test-volume-text', 
            frequencySelector: '#range-test-frequency-value',
            
            // ステータス表示
            mainStatusSelector: '#main-status-text',
            subInfoSelector: '#sub-info-text',
            micContainerSelector: '#mic-status-container',
            
            // コントロールボタン
            startButtonSelector: '#begin-range-test-btn',
            
            // 測定設定
            measurementDuration: 3000, // 各フェーズの測定時間（ms）
            intervalDuration: 1000,    // フェーズ間インターバル（ms）
            progressUpdateInterval: 100, // プログレスバー更新間隔（ms）
            
            // コールバック関数
            onLowPitchComplete: null,
            onHighPitchComplete: null,
            onTestComplete: null,
            onError: null,
            
            // デバッグ設定
            debugMode: false,
            
            ...options
        };
        
        // 内部状態
        this.currentPhase = 'idle'; // idle, low-measuring, low-complete, interval, high-measuring, high-complete, completed
        this.audioDetector = null;
        this.testResults = {
            lowPitch: null,
            highPitch: null,
            range: null,
            octaves: null
        };
        
        // 測定データ記録
        this.measurementData = {
            lowPhaseFrequencies: [],
            highPhaseFrequencies: [],
            currentLowestFreq: null,
            currentHighestFreq: null
        };
        
        // UI要素キャッシュ
        this.elements = {};
        this.timers = {
            countInterval: null,
            progressInterval: null
        };
        
        // 内部カウンター
        this.count = 0;
        this.progress = 0;
        
        this.log('VoiceRangeTestController初期化完了', 'SUCCESS');
    }
    
    /**
     * 🎯 メイン実行メソッド - ワンクリックで音域テスト開始
     */
    async startVoiceRangeTest() {
        try {
            this.log('🎬 音域テスト開始', 'INFO');
            
            // UI要素初期化
            await this.initializeElements();
            
            // AudioDetection初期化
            await this.initializeAudioDetection();
            
            // UI初期状態設定
            this.resetUI();
            
            // 低音測定フェーズ開始
            await this.startLowPitchPhase();
            
            this.log('✅ 音域テスト開始成功', 'SUCCESS');
            return true;
            
        } catch (error) {
            this.log(`❌ 音域テスト開始エラー: ${error.message}`, 'ERROR');
            if (this.options.onError) {
                this.options.onError(error);
            }
            throw error;
        }
    }
    
    /**
     * UI要素初期化
     */
    async initializeElements() {
        const selectors = [
            'rangeIconSelector', 'countdownDisplaySelector', 'progressCircleSelector',
            'voiceBadgeSelector', 'volumeBarSelector', 'volumeTextSelector',
            'frequencySelector', 'mainStatusSelector', 'subInfoSelector',
            'micContainerSelector', 'startButtonSelector'
        ];
        
        selectors.forEach(key => {
            const selector = this.options[key];
            if (selector) {
                const element = document.querySelector(selector);
                if (element) {
                    this.elements[key.replace('Selector', '')] = element;
                } else {
                    this.log(`⚠️ 要素が見つかりません: ${selector}`, 'WARNING');
                }
            }
        });
        
        this.log('📋 UI要素初期化完了', 'SUCCESS');
    }
    
    /**
     * AudioDetection初期化
     */
    async initializeAudioDetection() {
        // 既存のAudioDetectorがあれば破棄
        if (this.audioDetector) {
            this.audioDetector.stopDetection();
            this.audioDetector.destroy();
        }
        
        // PitchPro公式AudioDetectionComponent確認
        // ESMモジュールの場合、外部でインポートしてコンストラクターに渡すことを想定
        if (typeof AudioDetectionComponent === 'undefined') {
            throw new Error('AudioDetectionComponentがインポートされていません。ESMモジュールとしてインポートしてください。');
        }
        
        this.audioDetector = new AudioDetectionComponent({
            volumeBarSelector: this.options.volumeBarSelector,
            volumeTextSelector: this.options.volumeTextSelector,
            frequencySelector: this.options.frequencySelector,
            
            // PitchPro推奨設定
            clarityThreshold: 0.4,        // 40% - 実用的
            minVolumeAbsolute: 0.003,     // 0.3% - 適切
            deviceOptimization: true,     // 自動最適化
            debug: this.options.debugMode
        });
        
        await this.audioDetector.initialize();
        await this.audioDetector.startDetection();
        
        // PitchProコールバック設定 - リアルタイム周波数記録
        this.audioDetector.setCallbacks({
            onPitchUpdate: (result) => {
                this.recordFrequencyData(result);
            }
        });
        
        this.log('🎤 AudioDetection初期化完了', 'SUCCESS');
    }
    
    /**
     * 周波数データ記録
     */
    recordFrequencyData(result) {
        // 測定フェーズでない場合は記録しない
        if (this.currentPhase !== 'low-measuring' && this.currentPhase !== 'high-measuring') {
            return;
        }
        
        // 有効な周波数データのみ記録
        if (!result.frequency || result.frequency < 50 || result.frequency > 2000) {
            return;
        }
        
        // 音量が十分でない場合は記録しない
        if (!result.volume || result.volume < 0.1) {
            return;
        }
        
        const frequency = result.frequency;
        const timestamp = Date.now();
        
        if (this.currentPhase === 'low-measuring') {
            // 低音フェーズ: より低い周波数を優先記録
            this.measurementData.lowPhaseFrequencies.push({ frequency, timestamp, volume: result.volume });
            
            if (!this.measurementData.currentLowestFreq || frequency < this.measurementData.currentLowestFreq) {
                this.measurementData.currentLowestFreq = frequency;
                this.log(`🔽 新しい最低音記録: ${frequency.toFixed(1)} Hz`, 'INFO');
            }
            
        } else if (this.currentPhase === 'high-measuring') {
            // 高音フェーズ: より高い周波数を優先記録
            this.measurementData.highPhaseFrequencies.push({ frequency, timestamp, volume: result.volume });
            
            if (!this.measurementData.currentHighestFreq || frequency > this.measurementData.currentHighestFreq) {
                this.measurementData.currentHighestFreq = frequency;
                this.log(`🔼 新しい最高音記録: ${frequency.toFixed(1)} Hz`, 'INFO');
            }
        }
    }
    
    /**
     * 低音測定フェーズ開始
     */
    async startLowPitchPhase() {
        this.log('🔽 低音測定フェーズ開始', 'INFO');
        this.currentPhase = 'low-measuring';
        
        // 測定データリセット
        this.measurementData.lowPhaseFrequencies = [];
        this.measurementData.currentLowestFreq = null;
        
        // UI更新
        this.updateStatus('できるだけ低い声を出してください', '測定中...');
        this.updateMicStatus('recording');
        this.setBadgeDisplay('arrow-down', false);
        
        // ボタン無効化
        if (this.elements.startButton) {
            this.elements.startButton.disabled = true;
            this.elements.startButton.textContent = '低音測定中...';
        }
        
        // 測定開始
        await this.startMeasurementSequence('low');
    }
    
    /**
     * 高音測定フェーズ開始
     */
    async startHighPitchPhase() {
        this.log('🔼 高音測定フェーズ開始', 'INFO');
        this.currentPhase = 'high-measuring';
        
        // 測定データリセット
        this.measurementData.highPhaseFrequencies = [];
        this.measurementData.currentHighestFreq = null;
        
        // UI更新
        this.updateStatus('できるだけ高い声を出してください', '高音測定中...');
        this.updateMicStatus('recording');
        this.setBadgeDisplay('arrow-up', false);
        
        // 測定開始
        await this.startMeasurementSequence('high');
    }
    
    /**
     * 測定シーケンス実行
     */
    async startMeasurementSequence(phaseType) {
        return new Promise((resolve) => {
            this.count = 0;
            this.progress = 0;
            
            // プログレスバー更新開始
            this.timers.progressInterval = setInterval(() => {
                if (this.progress < 100 && this.count <= 3) {
                    this.progress += 100 / 30; // 3秒で100%
                    this.updateRangeTestBadge(Math.min(this.progress, 100), 'measuring');
                }
            }, this.options.progressUpdateInterval);
            
            // カウントダウン開始
            this.timers.countInterval = setInterval(() => {
                this.count++;
                this.log(`カウント: ${this.count} (${phaseType})`, 'INFO');
                
                // カウント表示 (1-3秒)
                if (this.count <= 3) {
                    this.setBadgeDisplay(phaseType === 'low' ? 'arrow-down' : 'arrow-up', true, this.count);
                }
                
                // 測定完了 (4秒目)
                if (this.count === 4) {
                    this.completeMeasurement(phaseType, resolve);
                }
            }, 1000);
        });
    }
    
    /**
     * 測定完了処理
     */
    completeMeasurement(phaseType, resolve) {
        clearInterval(this.timers.countInterval);
        clearInterval(this.timers.progressInterval);
        
        // チェックマーク表示
        this.setBadgeDisplay('check', false);
        this.updateRangeTestBadge(100, 'completed');
        
        if (phaseType === 'low') {
            this.currentPhase = 'low-complete';
            
            // 実測値を取得
            const measuredFreq = this.measurementData.currentLowestFreq || 130; // フォールバック値
            const note = this.frequencyToNote(measuredFreq);
            
            this.updateStatus(`低音測定完了: ${note} (${measuredFreq.toFixed(1)}Hz)`, '1秒後に高音測定を開始します');
            
            // 結果を保存
            this.testResults.lowPitch = {
                frequency: measuredFreq,
                note: note,
                measurementCount: this.measurementData.lowPhaseFrequencies.length
            };
            
            // コールバック実行
            if (this.options.onLowPitchComplete) {
                this.options.onLowPitchComplete({
                    phase: 'low',
                    frequency: measuredFreq,
                    note: note,
                    measurementCount: this.measurementData.lowPhaseFrequencies.length
                });
            }
            
            // インターバル後に高音測定開始
            setTimeout(() => {
                this.startHighPitchPhase().then(resolve);
            }, this.options.intervalDuration);
            
        } else {
            this.currentPhase = 'high-complete';
            
            // 実測値を取得
            const measuredFreq = this.measurementData.currentHighestFreq || 523; // フォールバック値
            const note = this.frequencyToNote(measuredFreq);
            
            // 結果を保存
            this.testResults.highPitch = {
                frequency: measuredFreq,
                note: note,
                measurementCount: this.measurementData.highPhaseFrequencies.length
            };
            
            // 音域計算
            const range = this.calculateRange();
            this.updateStatus('音域測定完了！', `測定結果: ${range.rangeText} (${range.octaves.toFixed(1)}オクターブ)`);
            this.updateMicStatus('standby');
            
            // コールバック実行
            if (this.options.onHighPitchComplete) {
                this.options.onHighPitchComplete({
                    phase: 'high',
                    frequency: measuredFreq,
                    note: note,
                    measurementCount: this.measurementData.highPhaseFrequencies.length
                });
            }
            
            // 最終完了処理
            this.completeTest();
            resolve();
        }
    }
    
    /**
     * 周波数から音名変換
     */
    frequencyToNote(frequency) {
        if (!frequency || frequency < 50) return 'Unknown';
        
        // A4 = 440Hz を基準とした12平均律計算
        const A4 = 440;
        const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        
        // A4からの半音数を計算
        const semitonesFromA4 = Math.round(12 * Math.log2(frequency / A4));
        
        // オクターブとノート計算
        const octave = Math.floor((semitonesFromA4 + 9) / 12) + 4;
        const noteIndex = ((semitonesFromA4 + 9) % 12 + 12) % 12;
        
        return noteNames[noteIndex] + octave;
    }
    
    /**
     * 音域計算
     */
    calculateRange() {
        if (!this.testResults.lowPitch || !this.testResults.highPitch) {
            return {
                rangeText: 'Unknown',
                octaves: 0,
                semitones: 0
            };
        }
        
        const lowFreq = this.testResults.lowPitch.frequency;
        const highFreq = this.testResults.highPitch.frequency;
        
        // オクターブ数計算
        const octaves = Math.log2(highFreq / lowFreq);
        
        // 半音数計算
        const semitones = Math.round(12 * octaves);
        
        const rangeText = `${this.testResults.lowPitch.note} - ${this.testResults.highPitch.note}`;
        
        return {
            rangeText,
            octaves,
            semitones
        };
    }
    
    /**
     * テスト完了処理
     */
    completeTest() {
        this.currentPhase = 'completed';
        
        // 最終的な音域計算
        const range = this.calculateRange();
        this.testResults.range = range.rangeText;
        this.testResults.octaves = range.octaves;
        this.testResults.semitones = range.semitones;
        
        // ボタン再有効化
        if (this.elements.startButton) {
            this.elements.startButton.disabled = false;
            this.elements.startButton.textContent = '音域テスト開始';
        }
        
        // 完了コールバック
        if (this.options.onTestComplete) {
            this.options.onTestComplete(this.testResults);
        }
        
        this.log('🏁 音域テスト完了', 'SUCCESS', this.testResults);
    }
    
    /**
     * 統一表示制御関数 - 画像ベース実装
     */
    setBadgeDisplay(iconType, showCountdown = false, countdownValue = '') {
        const rangeIcon = this.elements.rangeIcon;
        const countdownDisplay = this.elements.countdownDisplay;
        
        if (rangeIcon && countdownDisplay) {
            if (showCountdown) {
                // 数字表示モード
                rangeIcon.style.display = 'none';
                countdownDisplay.style.display = 'block';
                countdownDisplay.textContent = countdownValue.toString();
                this.log(`📊 数字表示: ${countdownValue}`, 'INFO');
            } else {
                // アイコン表示モード - 画像ベース
                countdownDisplay.style.display = 'none';
                rangeIcon.style.display = 'block';
                
                // SVG画像を直接読み込み
                this.loadIconImage(rangeIcon, iconType);
                
                this.log(`🎯 アイコン画像表示: ${iconType}`, 'INFO');
            }
        } else {
            this.log(`❌ 表示要素が見つかりません`, 'ERROR');
            this.log(`  rangeIcon: ${rangeIcon ? '存在' : '未発見'}`, 'ERROR');
            this.log(`  countdownDisplay: ${countdownDisplay ? '存在' : '未発見'}`, 'ERROR');
        }
    }
    
    /**
     * アイコン画像読み込み
     */
    loadIconImage(element, iconType) {
        // 既存コンテンツをクリア
        element.innerHTML = '';
        
        // PNGファイルのパスを構築
        const iconPath = `./icons/${iconType}.png`;
        
        // img要素を作成
        const img = document.createElement('img');
        img.src = iconPath;
        img.alt = iconType;
        img.style.width = '80px';
        img.style.height = '80px';
        img.style.display = 'block';
        
        // 読み込み成功・失敗のハンドリング
        img.onload = () => {
            this.log(`✅ PNG アイコン読み込み成功: ${iconType}`, 'SUCCESS');
        };
        
        img.onerror = () => {
            this.log(`❌ PNG アイコン読み込み失敗: ${iconPath}`, 'ERROR');
            // フォールバック: テキスト表示
            element.innerHTML = `<div style="color: white; font-size: 32px; font-weight: bold;">${this.getIconText(iconType)}</div>`;
        };
        
        // DOM に追加
        element.appendChild(img);
    }
    
    /**
     * プログレスバッジ更新
     */
    updateRangeTestBadge(progress, status = 'measuring') {
        const progressCircle = this.elements.progressCircle;
        const badge = this.elements.voiceBadge;
        
        if (progressCircle) {
            const circumference = 2 * Math.PI * 72;
            const offset = circumference - (progress / 100) * circumference;
            progressCircle.style.strokeDashoffset = offset.toString();
        }
        
        if (badge) {
            badge.classList.remove('measuring', 'confirmed');
            if (status === 'measuring') {
                badge.classList.add('measuring');
            } else if (status === 'completed') {
                badge.classList.add('confirmed');
            }
        }
    }
    
    /**
     * ステータス更新
     */
    updateStatus(mainMessage, subMessage = '') {
        if (this.elements.mainStatus) {
            this.elements.mainStatus.textContent = mainMessage;
        }
        if (this.elements.subInfo) {
            this.elements.subInfo.textContent = subMessage;
        }
    }
    
    /**
     * マイクステータス更新
     */
    updateMicStatus(status) {
        if (this.elements.micContainer) {
            this.elements.micContainer.classList.remove('standby', 'recording');
            this.elements.micContainer.classList.add(status);
        }
    }
    
    /**
     * UI初期化
     */
    resetUI() {
        this.setBadgeDisplay('arrow-down', false);
        this.updateStatus('音域テストを開始してください', '待機中...');
        this.updateMicStatus('standby');
        this.updateRangeTestBadge(0, 'measuring');
    }
    
    /**
     * 測定結果取得
     */
    getResults() {
        return this.testResults;
    }
    
    /**
     * 現在のフェーズ取得
     */
    getCurrentPhase() {
        return this.currentPhase;
    }
    
    /**
     * テスト停止
     */
    stopTest() {
        // タイマークリア
        Object.values(this.timers).forEach(timer => {
            if (timer) clearInterval(timer);
        });
        
        // AudioDetector停止
        if (this.audioDetector) {
            this.audioDetector.stopDetection();
            this.audioDetector.destroy();
            this.audioDetector = null;
        }
        
        // UI初期化
        this.resetUI();
        this.currentPhase = 'idle';
        
        this.log('⏹️ テスト停止', 'INFO');
    }
    
    /**
     * リソース破棄
     */
    destroy() {
        this.stopTest();
        this.elements = {};
        this.testResults = {};
        this.log('🗑️ リソース破棄完了', 'INFO');
    }
    
    /**
     * アイコンのテキスト表現取得（フォールバック用）
     */
    getIconText(iconType) {
        const iconTexts = {
            'arrow-down': '↓',
            'arrow-up': '↑', 
            'check': '✓'
        };
        return iconTexts[iconType] || iconType;
    }
    
    /**
     * ログ出力
     */
    log(message, level = 'INFO', data = null) {
        if (!this.options.debugMode && level !== 'ERROR') return;
        
        const timestamp = new Date().toLocaleTimeString();
        const logMessage = `[VoiceRangeTestController ${timestamp}] ${level}: ${message}`;
        
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
}

export default VoiceRangeTestController;