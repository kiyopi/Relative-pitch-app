/**
 * VoiceRangeUI - 音域テストUI管理システム
 * 
 * @version 4.0.0
 * @description v4.0音域テスト向けUI状態・アニメーション統合管理
 * @features リアルタイムフィードバック・進捗表示・視覚的状態管理
 * @author Claude Code
 * @date 2025-01-09
 */

class VoiceRangeUI {
    constructor(options = {}) {
        this.options = {
            // アニメーション設定
            enableAnimations: true,
            animationDuration: 500,
            pulseInterval: 1000,
            
            // 進捗表示設定
            totalNotes: 15,
            showProgress: true,
            
            // フィードバック設定
            volumeThresholds: {
                low: 20,
                medium: 50,
                high: 80
            },
            clarityThreshold: 0.4,
            
            // デバッグ設定
            debugMode: false,
            
            ...options
        };
        
        // UI状態管理
        this.currentPhase = 'initial';
        this.completedNotes = new Set();
        this.recordingNote = null;
        this.animationFrames = new Map();
        
        // 要素キャッシュ
        this.elements = {};
        this.cacheUIElements();
        
        // アニメーション制御
        this.animations = {
            recording: null,
            feedback: null,
            progress: null
        };
        
        this.log('VoiceRangeUI初期化完了', 'SUCCESS');
    }
    
    /**
     * UI要素キャッシュ
     */
    cacheUIElements() {
        const selectors = {
            // セクション要素
            micTestSection: '#mic-test-section',
            rangeTestSection: '#range-test-section',
            resultsSection: '#results-section',
            
            // ステータス表示
            statusDisplay: '#recording-status',
            progressDisplay: '#test-progress',
            phaseIndicator: '#current-phase',
            
            // 音量バー関連
            micVolumeBar: '#volume-progress',
            micVolumeText: '#volume-percentage',
            rangeVolumeBar: '#range-test-volume-bar',
            rangeVolumeText: '#range-test-volume-text',
            
            // 周波数表示
            frequencyDisplay: '#range-test-frequency-value',
            noteNameDisplay: '#current-note-name',
            
            // ボタン要素
            micTestButton: '#start-mic-test',
            rangeStartButton: '#start-range-test',
            completedButton: '#range-test-completed',
            
            // 進捗表示
            progressBar: '#overall-progress-bar',
            progressText: '#progress-text',
            notesList: '#notes-progress-list'
        };
        
        Object.keys(selectors).forEach(key => {
            const element = document.querySelector(selectors[key]);
            if (element) {
                this.elements[key] = element;
            } else {
                this.log(`UI要素が見つかりません: ${selectors[key]}`, 'WARNING');
            }
        });
        
        // 記録ボタン取得（複数）
        this.elements.recordButtons = document.querySelectorAll('.record-btn');
        
        this.log(`UI要素キャッシュ完了: ${Object.keys(this.elements).length}個`, 'INFO');
    }
    
    /**
     * 初期化処理
     */
    initialize() {
        try {
            this.log('UI初期化開始', 'INFO');
            
            // 初期状態設定
            this.setPhase('initial');
            this.updateProgress(0, this.options.totalNotes);
            this.updateStatus('マイクテストボタンを押して音声入力をテストしてください');
            
            // CSS変数設定（アニメーション用）
            this.setCSSVariables();
            
            this.log('UI初期化完了', 'SUCCESS');
            return true;
        } catch (error) {
            this.log(`UI初期化エラー: ${error.message}`, 'ERROR');
            throw error;
        }
    }
    
    /**
     * CSS変数設定
     */
    setCSSVariables() {
        const root = document.documentElement;
        root.style.setProperty('--animation-duration', `${this.options.animationDuration}ms`);
        root.style.setProperty('--pulse-interval', `${this.options.pulseInterval}ms`);
    }
    
    /**
     * フェーズ変更
     */
    setPhase(phase) {
        this.log(`フェーズ変更: ${this.currentPhase} → ${phase}`, 'INFO');
        
        const previousPhase = this.currentPhase;
        this.currentPhase = phase;
        
        // body要素にフェーズクラス適用
        const body = document.body;
        body.classList.remove(`phase-${previousPhase}`);
        body.classList.add(`phase-${phase}`);
        
        // フェーズインジケーター更新
        this.updatePhaseIndicator(phase);
        
        // フェーズ別UI制御
        this.handlePhaseTransition(previousPhase, phase);
    }
    
    /**
     * フェーズ遷移処理
     */
    handlePhaseTransition(from, to) {
        switch (to) {
            case 'initial':
                this.showSection('micTestSection');
                this.hideSection('rangeTestSection');
                this.hideSection('resultsSection');
                break;
                
            case 'mic-test':
                this.showSection('micTestSection');
                this.startMicTestAnimation();
                this.disableButton('rangeStartButton');
                break;
                
            case 'range-test':
                this.hideSection('micTestSection');
                this.showSection('rangeTestSection');
                this.stopMicTestAnimation();
                this.startRangeTestUI();
                break;
                
            case 'completed':
                this.showSection('resultsSection');
                this.stopAllAnimations();
                this.showCompletionAnimation();
                break;
        }
    }
    
    /**
     * ステータス更新
     */
    updateStatus(message, type = 'info', duration = null) {
        if (!this.elements.statusDisplay) return;
        
        this.elements.statusDisplay.textContent = message;
        this.elements.statusDisplay.className = `status status-${type}`;
        
        // 一時的な表示の場合
        if (duration) {
            setTimeout(() => {
                this.elements.statusDisplay.classList.add('fade-out');
            }, duration);
        }
        
        this.log(`ステータス更新: ${message} [${type}]`, 'INFO');
    }
    
    /**
     * 進捗更新
     */
    updateProgress(completed, total = this.options.totalNotes) {
        const percentage = Math.round((completed / total) * 100);
        
        // 進捗バー更新
        if (this.elements.progressBar) {
            this.elements.progressBar.style.width = `${percentage}%`;
        }
        
        // 進捗テキスト更新
        if (this.elements.progressText) {
            this.elements.progressText.textContent = `${completed}/${total} (${percentage}%)`;
        }
        
        // 進捗表示更新
        if (this.elements.progressDisplay) {
            this.elements.progressDisplay.textContent = `進捗: ${completed}/${total}音域`;
        }
        
        this.log(`進捗更新: ${completed}/${total} (${percentage}%)`, 'INFO');
    }
    
    /**
     * 音量バー更新（視覚的フィードバック付き）
     */
    updateVolumeDisplay(element, volume, showFeedback = true) {
        if (!element) return;
        
        // 音量バー更新
        element.style.width = `${Math.max(0, Math.min(100, volume))}%`;
        
        // 視覚的フィードバック
        if (showFeedback) {
            this.applyVolumeFeedback(element, volume);
        }
    }
    
    /**
     * 音量フィードバック適用
     */
    applyVolumeFeedback(element, volume) {
        const parent = element.closest('.volume-bar-container, .progress-bar');
        if (!parent) return;
        
        // 既存フィードバッククラス削除
        parent.classList.remove('volume-low', 'volume-medium', 'volume-high', 'volume-excellent');
        
        // 音量レベルに応じたフィードバック
        if (volume < this.options.volumeThresholds.low) {
            parent.classList.add('volume-low');
        } else if (volume < this.options.volumeThresholds.medium) {
            parent.classList.add('volume-medium');
        } else if (volume < this.options.volumeThresholds.high) {
            parent.classList.add('volume-high');
        } else {
            parent.classList.add('volume-excellent');
        }
    }
    
    /**
     * 周波数表示更新
     */
    updateFrequencyDisplay(frequency, noteName = null) {
        // 周波数数値表示
        if (this.elements.frequencyDisplay) {
            const displayText = frequency > 0 ? `${Math.round(frequency)} Hz` : '-- Hz';
            this.elements.frequencyDisplay.textContent = displayText;
        }
        
        // 音名表示
        if (this.elements.noteNameDisplay && noteName) {
            this.elements.noteNameDisplay.textContent = noteName;
            this.elements.noteNameDisplay.classList.add('note-detected');
            
            // 一定時間後にクラス削除
            setTimeout(() => {
                this.elements.noteNameDisplay.classList.remove('note-detected');
            }, 1000);
        }
    }
    
    /**
     * 記録ボタン状態更新
     */
    updateRecordButton(button, state, result = null) {
        if (!button) return;
        
        // 既存状態クラス削除
        button.classList.remove('idle', 'recording', 'completed', 'failed');
        
        switch (state) {
            case 'recording':
                button.classList.add('recording');
                this.startRecordingAnimation(button);
                this.recordingNote = button.dataset.note;
                break;
                
            case 'completed':
                button.classList.add('completed');
                this.stopRecordingAnimation(button);
                this.showSuccessAnimation(button);
                this.completedNotes.add(button.dataset.note);
                this.recordingNote = null;
                break;
                
            case 'failed':
                button.classList.add('failed');
                this.stopRecordingAnimation(button);
                this.showFailureAnimation(button, result?.reason);
                this.recordingNote = null;
                break;
                
            case 'idle':
            default:
                button.classList.add('idle');
                this.stopRecordingAnimation(button);
                this.recordingNote = null;
                break;
        }
        
        this.updateProgress(this.completedNotes.size);
    }
    
    /**
     * マイクテストアニメーション開始
     */
    startMicTestAnimation() {
        if (!this.options.enableAnimations || !this.elements.micVolumeBar) return;
        
        const animate = () => {
            if (this.currentPhase !== 'mic-test') return;
            
            // マイクテスト用の脈動アニメーション
            this.elements.micVolumeBar.classList.add('mic-test-pulse');
            
            this.animations.recording = requestAnimationFrame(() => {
                setTimeout(animate, this.options.pulseInterval);
            });
        };
        
        animate();
        this.log('マイクテストアニメーション開始', 'INFO');
    }
    
    /**
     * 記録アニメーション開始
     */
    startRecordingAnimation(button) {
        if (!this.options.enableAnimations || !button) return;
        
        button.classList.add('recording-pulse');
        
        const animate = () => {
            if (!button.classList.contains('recording')) return;
            
            button.style.transform = 'scale(1.05)';
            
            setTimeout(() => {
                if (button.classList.contains('recording')) {
                    button.style.transform = 'scale(1.0)';
                    setTimeout(animate, 500);
                }
            }, 500);
        };
        
        animate();
    }
    
    /**
     * 成功アニメーション表示
     */
    showSuccessAnimation(button) {
        if (!this.options.enableAnimations || !button) return;
        
        button.classList.add('success-flash');
        
        // アニメーション後クラス削除
        setTimeout(() => {
            button.classList.remove('success-flash');
        }, this.options.animationDuration);
    }
    
    /**
     * 失敗アニメーション表示
     */
    showFailureAnimation(button, reason = null) {
        if (!this.options.enableAnimations || !button) return;
        
        button.classList.add('failure-shake');
        
        // 失敗理由表示
        if (reason) {
            this.showTooltip(button, reason, 'error');
        }
        
        // アニメーション後クラス削除
        setTimeout(() => {
            button.classList.remove('failure-shake');
        }, this.options.animationDuration);
    }
    
    /**
     * 完了アニメーション表示
     */
    showCompletionAnimation() {
        if (!this.options.enableAnimations) return;
        
        // 全体的な完了アニメーション
        document.body.classList.add('completion-celebration');
        
        setTimeout(() => {
            document.body.classList.remove('completion-celebration');
        }, 2000);
        
        this.log('完了アニメーション表示', 'SUCCESS');
    }
    
    /**
     * ツールチップ表示
     */
    showTooltip(element, message, type = 'info') {
        // 既存ツールチップ削除
        const existingTooltip = element.querySelector('.tooltip');
        if (existingTooltip) {
            existingTooltip.remove();
        }
        
        // 新しいツールチップ作成
        const tooltip = document.createElement('div');
        tooltip.className = `tooltip tooltip-${type}`;
        tooltip.textContent = message;
        
        element.appendChild(tooltip);
        
        // 3秒後に削除
        setTimeout(() => {
            tooltip.remove();
        }, 3000);
    }
    
    /**
     * セクション表示
     */
    showSection(sectionKey) {
        const section = this.elements[sectionKey];
        if (!section) return;
        
        section.style.display = 'block';
        
        if (this.options.enableAnimations) {
            section.style.opacity = '0';
            section.style.transform = 'translateY(20px)';
            
            requestAnimationFrame(() => {
                section.style.opacity = '1';
                section.style.transform = 'translateY(0)';
            });
        }
        
        this.log(`セクション表示: ${sectionKey}`, 'INFO');
    }
    
    /**
     * セクション非表示
     */
    hideSection(sectionKey) {
        const section = this.elements[sectionKey];
        if (!section) return;
        
        if (this.options.enableAnimations) {
            section.style.opacity = '0';
            section.style.transform = 'translateY(-20px)';
            
            setTimeout(() => {
                section.style.display = 'none';
            }, this.options.animationDuration);
        } else {
            section.style.display = 'none';
        }
    }
    
    /**
     * ボタン有効/無効化
     */
    disableButton(buttonKey, disabled = true) {
        const button = this.elements[buttonKey];
        if (!button) return;
        
        if (disabled) {
            button.setAttribute('disabled', 'true');
            button.classList.add('disabled');
        } else {
            button.removeAttribute('disabled');
            button.classList.remove('disabled');
        }
    }
    
    /**
     * フェーズインジケーター更新
     */
    updatePhaseIndicator(phase) {
        if (!this.elements.phaseIndicator) return;
        
        const phaseLabels = {
            'initial': '準備',
            'mic-test': 'マイクテスト',
            'range-test': '音域測定',
            'completed': '完了'
        };
        
        this.elements.phaseIndicator.textContent = phaseLabels[phase] || phase;
        this.elements.phaseIndicator.className = `phase-indicator phase-${phase}`;
    }
    
    /**
     * リアルタイムフィードバック表示
     */
    showRealTimeFeedback(volume, frequency, clarity) {
        // 音量フィードバック
        if (this.elements.rangeVolumeBar) {
            this.updateVolumeDisplay(this.elements.rangeVolumeBar, volume, true);
        }
        
        // 周波数フィードバック
        if (frequency > 0) {
            this.updateFrequencyDisplay(frequency);
            
            // 音程の明瞭度に基づく視覚的フィードバック
            const clarityClass = clarity > this.options.clarityThreshold ? 'clear' : 'unclear';
            if (this.elements.frequencyDisplay) {
                this.elements.frequencyDisplay.className = `frequency-display ${clarityClass}`;
            }
        }
        
        // 記録中の特別フィードバック
        if (this.recordingNote) {
            this.showRecordingFeedback(volume, frequency, clarity);
        }
    }
    
    /**
     * 記録中フィードバック
     */
    showRecordingFeedback(volume, frequency, clarity) {
        const isGoodVolume = volume > 30;
        const isGoodFrequency = frequency > 0;
        const isGoodClarity = clarity > this.options.clarityThreshold;
        
        const overallQuality = isGoodVolume && isGoodFrequency && isGoodClarity;
        
        // 記録品質インジケーター更新
        const indicator = document.getElementById('recording-quality-indicator');
        if (indicator) {
            indicator.className = `quality-indicator ${overallQuality ? 'good' : 'poor'}`;
            indicator.textContent = overallQuality ? '良好' : '調整中';
        }
    }
    
    /**
     * 全アニメーション停止
     */
    stopAllAnimations() {
        // アニメーションフレーム停止
        this.animationFrames.forEach((frame, key) => {
            cancelAnimationFrame(frame);
        });
        this.animationFrames.clear();
        
        // CSS アニメーションクラス削除
        document.querySelectorAll('.recording-pulse, .mic-test-pulse, .success-flash, .failure-shake')
            .forEach(el => {
                el.classList.remove('recording-pulse', 'mic-test-pulse', 'success-flash', 'failure-shake');
            });
        
        this.log('全アニメーション停止', 'INFO');
    }
    
    /**
     * マイクテストアニメーション停止
     */
    stopMicTestAnimation() {
        if (this.elements.micVolumeBar) {
            this.elements.micVolumeBar.classList.remove('mic-test-pulse');
        }
        
        if (this.animations.recording) {
            cancelAnimationFrame(this.animations.recording);
            this.animations.recording = null;
        }
    }
    
    /**
     * 記録アニメーション停止
     */
    stopRecordingAnimation(button) {
        if (!button) return;
        
        button.classList.remove('recording-pulse');
        button.style.transform = 'scale(1.0)';
    }
    
    /**
     * 音域テストUI開始
     */
    startRangeTestUI() {
        this.log('音域テストUI開始', 'INFO');
        
        // 記録ボタンの初期状態設定
        this.elements.recordButtons.forEach(button => {
            this.updateRecordButton(button, 'idle');
        });
        
        // 進捗リセット
        this.completedNotes.clear();
        this.updateProgress(0);
        
        // 初期メッセージ表示
        this.updateStatus('任意の音域記録ボタンを押して音域測定を開始してください');
    }
    
    /**
     * ログ出力
     */
    log(message, level = 'INFO', data = null) {
        if (!this.options.debugMode && level !== 'ERROR') return;
        
        const timestamp = new Date().toLocaleTimeString();
        const logMessage = `[VoiceRangeUI ${timestamp}] ${level}: ${message}`;
        
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
            this.log('UIクリーンアップ開始', 'INFO');
            
            // アニメーション停止
            this.stopAllAnimations();
            
            // CSS クラス削除
            document.body.classList.remove(
                'phase-initial', 'phase-mic-test', 'phase-range-test', 'phase-completed'
            );
            
            // 要素キャッシュクリア
            this.elements = {};
            
            this.log('UIクリーンアップ完了', 'SUCCESS');
        } catch (error) {
            this.log(`UIクリーンアップエラー: ${error.message}`, 'ERROR');
        }
    }
}

export default VoiceRangeUI;