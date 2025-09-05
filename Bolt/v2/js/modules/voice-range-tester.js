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
        this.requiredStabilityTime = 3000; // 3秒間安定
        this.stableCount = 0;
        this.requiredStableFrames = Math.floor(this.requiredStabilityTime / 100); // 100ms間隔想定
        
        // 測定結果
        this.testResults = {
            lowestNote: null,
            lowestFrequency: null,
            highestNote: null,
            highestFrequency: null
        };
        
        // 安定性測定
        this.stabilityStartTime = null;
        
        // DOM要素
        this.testStatusElement = document.getElementById('test-status');
        this.testInstructionElement = document.getElementById('test-instruction-text');
        this.stabilityRing = document.getElementById('stability-ring');
        this.rangeIcon = document.getElementById('range-icon');
        this.countdownDisplay = document.getElementById('countdown-display');
        
        // テスト段階管理
        this.currentTestPhase = 'initial'; // 'initial', 'low-test', 'low-complete', 'high-test', 'high-complete'
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

        // 初期状態で3秒の準備時間を設ける
        this.setTestPhase('initial');
        this.updateStabilityRing(0);
        this.showRangeIcon();

        console.log('🎤 音域テスト開始 - 準備時間');
        
        // 3秒後に低音テストを開始
        setTimeout(() => {
            this.setTestPhase('low-test');
            this.showRangeIcon('low'); // 低音アイコンを表示してユーザーに指示
            console.log('🎤 低音テスト開始');
        }, 3000);
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
            this.updateTestStatus('待機中');
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
            this.updateTestStatus('測定中...');
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
                // 安定性開始時刻の記録
                if (this.stabilityStartTime === null) {
                    this.stabilityStartTime = Date.now();
                }
                
                // 経過時間計算
                const stabilityDuration = Date.now() - this.stabilityStartTime;
                
                // 進捗計算（0-100%）
                this.stabilityProgress = Math.min(100, (stabilityDuration / this.requiredStabilityTime) * 100);
                
                // カウントダウン表示更新（1秒、2秒、3秒）
                const currentSecond = Math.floor(stabilityDuration / 1000) + 1;
                if (currentSecond <= 3) {
                    this.updateCountdownDisplay(currentSecond);
                }
                
                // 3秒完了チェック
                if (stabilityDuration >= this.requiredStabilityTime) {
                    this.completeStabilityTest(frequency);
                    return;
                }
                
            } else {
                // 不安定時はリセット
                if (this.stabilityStartTime !== null) {
                    this.showResetMessage();
                }
                this.stabilityStartTime = null;
                this.stableCount = 0;
                this.stabilityProgress = 0;
                this.hideCountdown();
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
     * 音域テスト結果算出（修正版）
     */
    calculateRangeResult() {
        // testResultsから直接データを取得
        if (!this.testResults.lowestFrequency || !this.testResults.highestFrequency) {
            return {
                success: false,
                error: '音域データが不完全です'
            };
        }

        // オクターブ数算出
        const octaveRange = Math.log2(this.testResults.highestFrequency / this.testResults.lowestFrequency);
        
        return {
            success: true,
            frequencyRange: {
                min: this.testResults.lowestFrequency,
                max: this.testResults.highestFrequency
            },
            noteRange: {
                min: this.testResults.lowestNote,
                max: this.testResults.highestNote
            },
            octaveRange: octaveRange,
            detectedNotes: Array.from(this.detectedNotes),
            testDuration: this.testDuration,
            stabilityAchieved: true, // 3秒完了したので安定判定
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
            this.updateTestStatus('待機中');
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

    updateTestInstruction(message) {
        if (this.testInstructionElement) {
            this.testInstructionElement.textContent = message;
        }
    }

    setTestPhase(phase) {
        this.currentTestPhase = phase;
        
        // 仕様書準拠のメッセージ設定
        switch (phase) {
            case 'initial':
                this.updateTestInstruction('音域を測定します');
                this.updateTestStatus('待機中...');
                break;
            case 'low-test':
                this.updateTestInstruction('できるだけ低い声を出し３秒間キープしてください');
                this.updateTestStatus('測定中...');
                break;
            case 'low-complete':
                this.updateTestInstruction('測定完了');
                this.updateTestStatus('次の測定を準備しています...');
                break;
            case 'high-test':
                this.updateTestInstruction('できるだけ高い声を出し３秒間キープしてください');
                this.updateTestStatus('測定中...');
                break;
            case 'high-complete':
                this.updateTestInstruction('測定完了');
                this.updateTestStatus('音域測定が完了しました！');
                break;
        }
    }

    showResetMessage() {
        // リセット時の一時的メッセージ表示（仕様書準拠）
        this.updateTestStatus('リセットされました - 測定中...');
        
        // 1.5秒後に通常の「測定中...」に戻す
        setTimeout(() => {
            if (this.currentTestPhase === 'low-test' || this.currentTestPhase === 'high-test') {
                this.updateTestStatus('測定中...');
            }
        }, 1500);
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

    showRangeIcon(type = 'default') {
        if (this.rangeIcon) {
            this.rangeIcon.style.display = 'block';
            
            // アイコンの種類を変更
            if (type === 'low') {
                this.rangeIcon.setAttribute('data-lucide', 'arrow-down');
                lucide.createIcons(); // Lucideアイコンを再描画
            } else if (type === 'high') {
                this.rangeIcon.setAttribute('data-lucide', 'arrow-up');
                lucide.createIcons();
            } else if (type === 'complete') {
                this.rangeIcon.setAttribute('data-lucide', 'check');
                lucide.createIcons();
            }
        }
        if (this.countdownDisplay) {
            this.countdownDisplay.style.display = 'none';
        }
    }

    hideRangeIcon() {
        if (this.rangeIcon) {
            this.rangeIcon.style.display = 'none';
        }
    }

    updateCountdownDisplay(second) {
        if (this.countdownDisplay && second > 0) {
            this.countdownDisplay.textContent = second;
            this.countdownDisplay.style.display = 'block';
            
            // Lucideによって生成されたSVGアイコンを非表示にする
            const svgIcon = document.querySelector('#range-icon, [data-lucide="arrow-down"], [data-lucide="arrow-up"], [data-lucide="check"]');
            if (svgIcon) {
                svgIcon.style.display = 'none';
            }
        }
    }

    hideCountdown() {
        if (this.countdownDisplay) {
            this.countdownDisplay.style.display = 'none';
        }
        
        // Lucideによって生成されたSVGアイコンを再表示
        const svgIcon = document.querySelector('#range-icon, [data-lucide="arrow-down"], [data-lucide="arrow-up"], [data-lucide="check"]');
        if (svgIcon) {
            svgIcon.style.display = 'block';
        }
    }

    /**
     * 3秒安定性テスト完了処理
     */
    completeStabilityTest(frequency) {
        console.log(`✅ ${this.currentTestPhase}完了:`, frequency + 'Hz');
        
        // 結果記録
        this.recordRangeResult(frequency);
        
        // 完了エフェクト表示
        this.showRangeTestComplete();
        
        // フェーズ移行
        if (this.currentTestPhase === 'low-test') {
            // 低音テスト完了 → 高音テストへ
            setTimeout(() => {
                this.setTestPhase('high-test');
                this.showRangeIcon('high');
                this.stabilityStartTime = null;
                this.stabilityProgress = 0;
                this.updateStabilityRing(0);
                console.log('🎤 高音テスト開始');
            }, 3000);
            
        } else if (this.currentTestPhase === 'high-test') {
            // 高音テスト完了 → 結果表示へ
            setTimeout(() => {
                const finalResult = this.stopRangeTest();
                this.onTestComplete(finalResult);
            }, 2000);
        }
    }

    /**
     * 測定結果の記録（分割前コードから移植）
     */
    recordRangeResult(frequency) {
        const note = this.frequencyToNote(frequency);
        console.log(`🎯 ${this.currentTestPhase}音域検出完了: ${note} (${frequency.toFixed(1)}Hz)`);
        
        // 結果記録
        if (this.currentTestPhase === 'low-test') {
            this.testResults.lowestNote = note;
            this.testResults.lowestFrequency = frequency;
            
            // 低音設定完了メッセージを表示
            this.updateTestInstruction('測定完了');
            this.updateTestStatus('次の測定を準備しています...');
            
            console.log('⏱️ 高音域テストまで待機中...');
            setTimeout(() => {
                console.log('🔄 低音域 → 高音域テスト遷移');
                this.startHighRangeTest();
            }, 2000);
            
        } else if (this.currentTestPhase === 'high-test') {
            this.testResults.highestNote = note;
            this.testResults.highestFrequency = frequency;
            
            // 高音設定完了メッセージを表示
            this.updateTestInstruction('測定完了');
            this.updateTestStatus('音域測定が完了しました！');
            
            console.log('⏱️ 音域テスト結果計算中...');
            setTimeout(() => {
                console.log('🎉 音域テスト完了 → 結果画面表示');
                console.log('📊 testResults状態:', this.testResults);
                const finalResult = this.stopRangeTest();
                console.log('📋 finalResult:', finalResult);
                this.onTestComplete(finalResult);
            }, 2000);
        }
    }

    /**
     * 高音域テスト開始（分割前コードから移植）
     */
    startHighRangeTest() {
        console.log('🔊 高音域テスト開始');
        this.currentTestPhase = 'high-test';
        this.stabilityStartTime = null;
        this.stabilityProgress = 0;
        
        // アイコンとカウントダウン設定
        const rangeIcon = document.getElementById('range-icon');
        const countdownDisplay = document.getElementById('countdown-display');
        const voiceNoteBadge = document.querySelector('.voice-note-badge');
        
        if (rangeIcon) {
            rangeIcon.setAttribute('data-lucide', 'arrow-up');
            rangeIcon.style.display = 'block';
            rangeIcon.style.color = 'white';
            lucide.createIcons();
        }
        if (countdownDisplay) {
            countdownDisplay.style.display = 'none';
        }
        
        // 測定中エフェクト追加
        if (voiceNoteBadge) {
            voiceNoteBadge.classList.add('measuring');
        }
        
        // 円形プログレスバーリセット
        this.updateStabilityRing(0);
        
        // 3秒間のインターバルを追加
        this.updateTestInstruction('できるだけ高い声を出し３秒間キープしてください');
        this.updateTestStatus('3秒後に測定を開始します...');
        
        setTimeout(() => {
            this.updateTestStatus('待機中...');
            console.log('⏰ 3秒インターバル完了 - 高音域音声検出待機開始');
        }, 3000);
    }

    /**
     * 完了時のエフェクト表示（分割前コードから移植）
     */
    showRangeTestComplete() {
        const rangeIcon = document.getElementById('range-icon');
        const countdownDisplay = document.getElementById('countdown-display');
        const voiceNoteBadge = document.querySelector('.voice-note-badge');
        const stabilitySvg = document.getElementById('stability-ring');
        
        console.log(`✅ ${this.currentTestPhase}音域テスト完了`);
        
        // アイコンをチェックマークに変更
        if (rangeIcon && countdownDisplay) {
            countdownDisplay.style.display = 'none';
            rangeIcon.setAttribute('data-lucide', 'check');
            rangeIcon.style.color = '#22c55e'; // 緑色で成功を表現
            rangeIcon.style.display = 'block';
            lucide.createIcons();
        }
        
        // バッジアニメーション
        if (voiceNoteBadge) {
            voiceNoteBadge.classList.remove('measuring');
            voiceNoteBadge.classList.add('confirmed');
            setTimeout(() => {
                voiceNoteBadge.classList.remove('confirmed');
            }, 600);
        }
        
        // 円形プログレス完了エフェクト
        if (stabilitySvg) {
            stabilitySvg.classList.add('completed');
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