// voice-range-tester-v1.1.3.js - PitchPro v1.1.3完全対応版
// Safari音量低下対策 + Web Audio API直接計算統合

/**
 * 音域テスト管理クラス（PitchPro v1.1.3対応版）
 * Safari音量低下対策・Web Audio API直接計算統合済み
 */
class VoiceRangeTesterV113 {
    constructor(pitchDetector, dataManager = null) {
        this.pitchDetector = pitchDetector; // PitchDetector直接参照
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
        
        // 安定性判定設定（緩和）
        this.stabilityThreshold = 12; // ±12Hz以内（従来8Hzから緩和）
        this.requiredStabilityTime = 1500; // 1.5秒間安定（従来2秒から短縮）
        this.stableCount = 0;
        this.requiredStableFrames = Math.floor(this.requiredStabilityTime / 100);
        
        // 音量・音程判定設定（PitchPro v1.1.3対応）
        this.minVolumeLevel = 15; // 音量バー15%以上（計算済み値使用）
        this.minFrequency = 60;   // 60Hz以上
        this.maxFrequency = 800;  // 800Hz以下
        
        // DOM要素
        this.testStatusElement = document.getElementById('test-status');
        this.stabilityRing = document.getElementById('stability-ring');
        this.rangeIcon = document.getElementById('range-icon');
        this.countdownDisplay = document.getElementById('countdown-display');
        
        console.log('🎯 VoiceRangeTesterV113 初期化完了（PitchPro v1.1.3対応）');
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

        this.updateTestStatus('音域テスト開始 - 低い声から高い声まで様々な高さで発声してください');
        this.updateStabilityRing(0);
        this.showRangeIcon();

        // PitchPro v1.1.3コールバック設定（Safari対策統合）
        this.setupPitchProCallbacks();

        console.log('🎤 音域テスト開始（PitchPro v1.1.3 + Safari対策）');
        return true;
    }

    /**
     * PitchPro v1.1.3コールバック設定（Safari音量低下対策統合）
     */
    setupPitchProCallbacks() {
        if (!this.pitchDetector) {
            console.error('❌ PitchDetector が利用できません');
            return;
        }

        this.pitchDetector.setCallbacks({
            onPitchUpdate: (result) => {
                if (!this.isRangeTesting || !result) return;
                
                // 【Safari音量低下問題根本解決】Web Audio APIから直接音量を高精度計算
                let volumeLevel = 0;
                
                try {
                    if (this.pitchDetector && this.pitchDetector.rawAnalyser) {
                        const bufferLength = this.pitchDetector.rawAnalyser.fftSize;
                        const dataArray = new Float32Array(bufferLength);
                        this.pitchDetector.rawAnalyser.getFloatTimeDomainData(dataArray);
                        
                        // 高精度RMS計算（Safari最適化版）
                        let sum = 0;
                        let maxValue = 0;
                        for (let i = 0; i < bufferLength; i++) {
                            const value = Math.abs(dataArray[i]);
                            sum += value * value;
                            maxValue = Math.max(maxValue, value);
                        }
                        
                        const rms = Math.sqrt(sum / bufferLength);
                        
                        // Safari対応：音域テスト専用設定（感度向上）
                        const baseMultiplier = 3200; // 音域テスト用に感度向上
                        const minThreshold = 0.0003;   // より低い閾値
                        const instantDropThreshold = 0.0015; // より敏感な即座ゼロ化
                        
                        // 音量計算：RMSとピーク値のバランス調整
                        const combinedVolume = (rms * 0.80) + (maxValue * 0.20);
                        
                        if (combinedVolume < instantDropThreshold) {
                            volumeLevel = 0;
                        } else if (combinedVolume < minThreshold) {
                            volumeLevel = 0;
                        } else {
                            volumeLevel = Math.min(100, Math.max(0, combinedVolume * baseMultiplier));
                        }
                    }
                } catch (error) {
                    // フォールバック：PitchProの値を使用
                    const rawVolume = result.volume || 0;
                    volumeLevel = Math.min(100, Math.max(0, rawVolume * 1000));
                }
                
                // PitchPro v1.1.3対応のデータ変換
                const convertedData = {
                    frequency: result.frequency || 0,
                    note: result.note || null,
                    volume: volumeLevel, // 計算済み音量レベル（0-100）
                    clarity: result.clarity || 0,
                    timestamp: Date.now()
                };
                
                // 音域テスト処理実行
                this.processPitchData(convertedData);
            },
            onError: (error) => {
                console.error('🎤 音域テストエラー:', error);
                this.updateTestStatus(`エラーが発生しました: ${error.message}`);
            }
        });
    }

    /**
     * リアルタイム音程データ処理（PitchPro v1.1.3対応）
     */
    processPitchData(pitchData) {
        if (!this.isRangeTesting || !pitchData) {
            return;
        }

        const { frequency, note, volume, clarity } = pitchData;
        
        // 音域テスト用の品質判定（緩和設定）
        if (frequency < this.minFrequency || frequency > this.maxFrequency) {
            this.updateTestStatus(`音程が範囲外です（${this.minFrequency}-${this.maxFrequency}Hz）`);
            return;
        }

        if (volume < this.minVolumeLevel) {
            this.updateTestStatus(`音量を上げてください（現在: ${volume.toFixed(1)}%）`);
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
        
        // 残り時間計算・表示更新
        const elapsed = Date.now() - this.testStartTime;
        const remaining = Math.max(0, this.testDuration - elapsed);
        
        if (remaining <= 0) {
            // テスト時間終了
            const result = this.stopRangeTest();
            this.onTestComplete(result);
        } else {
            const detectedCount = this.detectedNotes.size;
            const rangeWidth = this.frequencyRange.max - this.frequencyRange.min;
            this.updateTestStatus(
                `音域測定中... (残り${Math.ceil(remaining/1000)}秒) ` +
                `検出音域: ${rangeWidth > 0 ? rangeWidth.toFixed(0) + 'Hz幅' : '測定中'} ` +
                `音名: ${detectedCount}種類`
            );
        }
    }

    /**
     * 音域テスト停止
     */
    stopRangeTest() {
        if (!this.isRangeTesting) return false;

        this.isRangeTesting = false;
        this.testStartTime = null;
        
        // PitchDetector停止
        if (this.pitchDetector) {
            this.pitchDetector.stopDetection();
        }
        
        const result = this.calculateRangeResult();
        console.log('🎵 音域テスト完了:', result);
        
        return result;
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
     * 安定性チェック処理（緩和設定）
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
                this.stableCount = Math.max(0, this.stableCount - 1); // 緩やかな減少
                this.stabilityProgress = (this.stableCount / this.requiredStableFrames) * 100;
            }

            this.updateStabilityRing(this.stabilityProgress);
        }
    }

    /**
     * 周波数安定性チェック（緩和設定）
     */
    checkFrequencyStability() {
        if (this.voiceStabilityBuffer.length < 3) return false;

        const recent = this.voiceStabilityBuffer.slice(-3);
        const avg = recent.reduce((sum, freq) => sum + freq, 0) / recent.length;
        
        return recent.every(freq => Math.abs(freq - avg) <= this.stabilityThreshold);
    }

    /**
     * 音域テスト結果算出（改良版）
     */
    calculateRangeResult() {
        if (this.frequencyRange.min === Infinity || this.frequencyRange.max === -Infinity) {
            return {
                success: false,
                error: '十分な音域データが取得できませんでした'
            };
        }

        // 最小音域チェック（緩和）
        const rangeWidth = this.frequencyRange.max - this.frequencyRange.min;
        if (rangeWidth < 100) { // 100Hz以上必要（従来より緩和）
            return {
                success: false,
                error: `音域が狭すぎます（${rangeWidth.toFixed(0)}Hz）。より広い音域で発声してください`
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
            stabilityAchieved: this.stabilityProgress >= 60, // 60%以上で安定判定（従来80%から緩和）
            detectedAt: new Date().toISOString()
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
        
        console.log('✅ 音域テスト結果表示完了:', result);
    }

    /**
     * UI更新メソッド
     */
    updateTestStatus(message) {
        if (this.testStatusElement) {
            this.testStatusElement.textContent = message;
        }
        console.log('🎯 音域テスト状態:', message);
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
    
    /**
     * 手動停止
     */
    forceStop() {
        if (this.isRangeTesting) {
            const result = this.stopRangeTest();
            this.onTestComplete(result);
        }
    }
}

// モジュールエクスポート
window.VoiceRangeTesterV113 = VoiceRangeTesterV113;