// voice-range-tester.js - 音域テスト専用モジュール
// preparation.jsから音域テスト機能を分離

/**
 * 音域テスト管理クラス
 * 音域測定、安定性判定、結果保存を担当
 */
class VoiceRangeTester {
    constructor(deviceManager, dataManager) {
        this.deviceManager = deviceManager;
        this.dataManager = dataManager;
        
        // 音域テスト状態
        this.isRangeTesting = false;
        this.testStartTime = null;
        this.testDuration = 60000; // 60秒
        this.voiceStabilityBuffer = [];
        this.bufferSize = 10;
        
        // 音域測定結果
        this.detectedNotes = new Set();
        this.frequencyRange = { min: Infinity, max: -Infinity };
        this.currentNote = null;
        this.stabilityProgress = 0;
        
        // 安定性判定設定
        this.stabilityThreshold = 8; // ±8Hz以内
        this.requiredStabilityTime = 2000; // 2秒間安定
        this.stableCount = 0;
        this.requiredStableFrames = Math.floor(this.requiredStabilityTime / 100); // 100ms間隔想定
        
        // DOM要素
        this.testStatusElement = document.getElementById('test-status');
        this.stabilityRing = document.getElementById('stability-ring');
        this.rangeIcon = document.getElementById('range-icon');
        this.countdownDisplay = document.getElementById('countdown-display');
    }

    /**
     * 音域テスト開始
     */
    startRangeTest() {
        if (this.isRangeTesting) return false;

        this.isRangeTesting = true;
        this.testStartTime = Date.now();
        
        // 測定データリセット
        this.detectedNotes.clear();
        this.frequencyRange = { min: Infinity, max: -Infinity };
        this.voiceStabilityBuffer = [];
        this.stabilityProgress = 0;
        this.stableCount = 0;

        this.updateTestStatus('音域テスト開始 - 様々な高さで発声してください');
        this.updateStabilityRing(0);
        this.showRangeIcon();

        console.log('🎤 音域テスト開始');
        return true;
    }

    /**
     * 音域テスト停止
     */
    stopRangeTest() {
        if (!this.isRangeTesting) return false;

        this.isRangeTesting = false;
        this.testStartTime = null;
        
        const result = this.calculateRangeResult();
        console.log('🎵 音域テスト完了:', result);
        
        return result;
    }

    /**
     * リアルタイム音程データ処理
     */
    processPitchData(pitchResult) {
        if (!this.isRangeTesting || !pitchResult || pitchResult.frequency <= 0) {
            return;
        }

        const { frequency, note, volume, clarity } = pitchResult;
        
        // 十分な音量と明瞭度の確認
        const deviceSpecs = this.deviceManager.getSpecs();
        const minVolume = deviceSpecs?.isIOS ? 0.8 : 1.2; // iOS向け低閾値
        
        if (volume < minVolume || clarity < 0.5) {
            this.updateTestStatus('音量を上げて、はっきりと発声してください');
            return;
        }

        // 音域範囲更新
        this.updateFrequencyRange(frequency);
        
        // 音名記録
        if (note) {
            this.detectedNotes.add(note);
            this.currentNote = note;
        }

        // 安定性判定
        this.processStabilityCheck(frequency);
        
        // 残り時間計算
        const elapsed = Date.now() - this.testStartTime;
        const remaining = Math.max(0, this.testDuration - elapsed);
        
        if (remaining <= 0) {
            // テスト時間終了
            const result = this.stopRangeTest();
            this.onTestComplete(result);
        } else {
            this.updateTestStatus(`音域測定中... (残り${Math.ceil(remaining/1000)}秒)`);
        }
    }

    /**
     * 周波数範囲更新
     */
    updateFrequencyRange(frequency) {
        if (frequency < this.frequencyRange.min) {
            this.frequencyRange.min = frequency;
        }
        if (frequency > this.frequencyRange.max) {
            this.frequencyRange.max = frequency;
        }
    }

    /**
     * 安定性チェック処理
     */
    processStabilityCheck(frequency) {
        this.voiceStabilityBuffer.push(frequency);
        
        if (this.voiceStabilityBuffer.length > this.bufferSize) {
            this.voiceStabilityBuffer.shift();
        }

        if (this.voiceStabilityBuffer.length >= 3) {
            const isStable = this.checkFrequencyStability();
            
            if (isStable) {
                this.stableCount++;
                this.stabilityProgress = Math.min(100, (this.stableCount / this.requiredStableFrames) * 100);
            } else {
                this.stableCount = Math.max(0, this.stableCount - 2); // 不安定時は減少
                this.stabilityProgress = (this.stableCount / this.requiredStableFrames) * 100;
            }

            this.updateStabilityRing(this.stabilityProgress);
        }
    }

    /**
     * 周波数安定性チェック
     */
    checkFrequencyStability() {
        if (this.voiceStabilityBuffer.length < 3) return false;

        const recent = this.voiceStabilityBuffer.slice(-3);
        const avg = recent.reduce((sum, freq) => sum + freq, 0) / recent.length;
        
        return recent.every(freq => Math.abs(freq - avg) <= this.stabilityThreshold);
    }

    /**
     * 音域テスト結果算出
     */
    calculateRangeResult() {
        if (this.frequencyRange.min === Infinity || this.frequencyRange.max === -Infinity) {
            return {
                success: false,
                error: '十分な音域データが取得できませんでした'
            };
        }

        // 音名変換
        const minNote = this.frequencyToNote(this.frequencyRange.min);
        const maxNote = this.frequencyToNote(this.frequencyRange.max);
        
        // オクターブ数算出
        const octaveRange = Math.log2(this.frequencyRange.max / this.frequencyRange.min);
        
        return {
            success: true,
            frequencyRange: {
                min: this.frequencyRange.min,
                max: this.frequencyRange.max
            },
            noteRange: {
                min: minNote,
                max: maxNote
            },
            octaveRange: octaveRange,
            detectedNotes: Array.from(this.detectedNotes),
            testDuration: this.testDuration,
            stabilityAchieved: this.stabilityProgress >= 80 // 80%以上で安定判定
        };
    }

    /**
     * 周波数から音名変換
     */
    frequencyToNote(frequency) {
        const A4 = 440;
        const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        
        const semitoneFromA4 = Math.round(12 * Math.log2(frequency / A4));
        const octave = Math.floor((semitoneFromA4 + 9) / 12) + 4;
        const noteIndex = ((semitoneFromA4 + 9) % 12 + 12) % 12;
        
        return noteNames[noteIndex] + octave;
    }

    /**
     * テスト完了時の処理
     */
    onTestComplete(result) {
        if (result.success) {
            // データ管理クラスに結果保存
            if (this.dataManager && this.dataManager.saveVoiceRangeData) {
                const saveResult = this.dataManager.saveVoiceRangeData(result);
                console.log('💾 音域データ保存:', saveResult);
            }
            
            this.showTestResults(result);
        } else {
            this.updateTestStatus(`テストに失敗しました: ${result.error}`);
        }
    }

    /**
     * テスト結果表示
     */
    showTestResults(result) {
        // 結果セクション表示
        const rangeTestSection = document.getElementById('range-test-section');
        const resultSection = document.getElementById('result-section');
        
        if (rangeTestSection) rangeTestSection.classList.add('hidden');
        if (resultSection) {
            resultSection.classList.remove('hidden');
            
            // 結果データ更新
            const rangeValueElements = document.querySelectorAll('.range-info-value');
            if (rangeValueElements.length >= 2) {
                rangeValueElements[0].textContent = `${result.noteRange.min} - ${result.noteRange.max}`;
                rangeValueElements[1].textContent = `${result.octaveRange.toFixed(1)}オクターブ`;
            }
        }
    }

    /**
     * UI更新メソッド
     */
    updateTestStatus(message) {
        if (this.testStatusElement) {
            this.testStatusElement.textContent = message;
        }
    }

    updateStabilityRing(progress) {
        if (this.stabilityRing) {
            const circle = this.stabilityRing.querySelector('.voice-progress-circle');
            if (circle) {
                const circumference = 452; // 2π * 72
                const offset = circumference - (progress / 100) * circumference;
                circle.style.strokeDashoffset = offset;
            }
        }
    }

    showRangeIcon() {
        if (this.rangeIcon) {
            this.rangeIcon.style.display = 'block';
        }
        if (this.countdownDisplay) {
            this.countdownDisplay.style.display = 'none';
        }
    }

    /**
     * テスト状態取得
     */
    isActive() {
        return this.isRangeTesting;
    }

    getProgress() {
        if (!this.isRangeTesting || !this.testStartTime) return 0;
        
        const elapsed = Date.now() - this.testStartTime;
        return Math.min(100, (elapsed / this.testDuration) * 100);
    }
}

// モジュールエクスポート
window.VoiceRangeTester = VoiceRangeTester;