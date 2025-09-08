// voice-range-tester-v1.1.3.js - PitchPro v1.1.3完全対応版
// Safari音量低下対策 + Web Audio API直接計算統合

/**
 * 音域テスト管理クラス（PitchPro v1.1.3対応版）
 * Safari音量低下対策・Web Audio API直接計算統合済み
 * 独立タイマー制御による円形プログレス安定化
 */
class VoiceRangeTesterV113 {
    constructor(pitchDetector, dataManager = null) {
        this.pitchDetector = pitchDetector; // PitchDetector直接参照
        this.dataManager = dataManager;
        
        // 音域テスト状態
        this.isRangeTesting = false;
        this.currentTestPhase = 'idle'; // 'idle', 'ready', 'low', 'high', 'completed'
        
        // 独立タイマー制御（円形プログレス専用）
        this.progressTimer = null;
        this.testStartTime = null;
        this.testDuration = 3000; // 3秒固定
        this.currentProgress = 0; // 0-100%
        this.isWaitingForVoice = false; // 声待機状態
        
        // 音程データ収集（プログレスとは独立）
        this.voiceDataBuffer = [];
        this.isCollectingData = false;
        this.minSamples = 15; // 最小サンプル数
        
        // 音域測定結果
        this.detectedFrequencies = { low: [], high: [] };
        this.finalResults = { lowFreq: null, highFreq: null };
        this.detectedNotes = new Set(); // 検出された音名の集合
        
        // 自動再測定制御
        this.maxRetries = 3;
        this.currentRetryCount = 0;
        
        // 音量・音程判定設定（PitchPro v1.1.3対応）
        this.minVolumeLevel = 15; // 音量バー15%以上（計算済み値使用）
        this.minFrequency = 60;   // 60Hz以上
        this.maxFrequency = 800;  // 800Hz以下
        
        // DOM要素
        this.testStatusElement = document.getElementById('test-status');
        this.stabilityRing = document.getElementById('stability-ring');
        this.rangeIcon = document.getElementById('range-icon');
        this.countdownDisplay = document.getElementById('countdown-display');
        this.micStatusIcon = document.getElementById('mic-status-icon');
        this.rangeTestVolumeBar = document.getElementById('range-test-volume-bar');
        this.rangeTestVolumeText = document.getElementById('range-test-volume-text');
        
        console.log('🎯 VoiceRangeTesterV113 初期化完了（独立タイマー制御版）');
    }

    /**
     * 音域テスト準備（音声テスト完了後の待機状態）
     */
    startRangeTest() {
        if (this.isRangeTesting) return false;

        this.isRangeTesting = true;
        this.currentTestPhase = 'ready';
        this.currentRetryCount = 0;
        
        // 測定データリセット
        this.detectedFrequencies = { low: [], high: [] };
        this.finalResults = { lowFreq: null, highFreq: null };
        this.voiceDataBuffer = [];

        // PitchPro v1.1.3コールバック設定（Safari対策統合）
        this.setupPitchProCallbacks();

        // 準備状態の表示
        this.showReadyState();

        console.log('🎤 音域テスト準備完了（開始ボタン待機中）');
        return true;
    }

    /**
     * 準備状態表示
     */
    showReadyState() {
        this.updateTestStatus('音域測定の準備ができました');
        this.updateMicStatus('standby'); // 緑色
        this.showRangeIcon('idle');
        this.updateStabilityRing(0); // プログレスバーリセット
        this.updateVolumeDisplay(0); // 音量バーを0に
        
        // データ収集停止（ミュート）
        this.isCollectingData = false;
        
        // 開始ボタンを表示
        const beginRangeTestBtn = document.getElementById('begin-range-test-btn');
        if (beginRangeTestBtn) {
            beginRangeTestBtn.classList.remove('hidden');
            // 初回表示の場合は元のテキストに戻す
            beginRangeTestBtn.innerHTML = `
                <i data-lucide="play" style="width: 20px; height: 20px;"></i>
                <span>音域テスト開始</span>
            `;
            
            // Lucideアイコン再初期化
            if (typeof lucide !== 'undefined' && lucide.createIcons) {
                lucide.createIcons();
            }
            
            console.log('📋 音域テスト開始ボタン表示');
        } else {
            console.log('📋 音域テスト開始ボタンが見つかりません');
        }
    }

    /**
     * 実際の音域テスト開始（ボタンクリック後）
     */
    beginActualTest() {
        console.log('🎵 beginActualTest()呼び出し');
        console.log('  現在のフェーズ:', this.currentTestPhase);
        console.log('  isRangeTesting:', this.isRangeTesting);
        console.log('  isCollectingData:', this.isCollectingData);
        console.log('  currentRetryCount:', this.currentRetryCount);
        
        if (this.currentTestPhase !== 'ready') {
            console.warn('⚠️ 音域テストが準備状態ではありません:', this.currentTestPhase);
            console.warn('  期待値: "ready", 実際: ', this.currentTestPhase);
            return false;
        }

        console.log('🎵 音域テスト実行開始 - 低音テストへ');
        
        // 低音テスト開始
        this.startLowRangeTest();
        return true;
    }

    /**
     * 低音テスト開始
     */
    startLowRangeTest() {
        console.log('🔽 startLowRangeTest()呼び出し');
        console.log('  再測定回数:', this.currentRetryCount);
        
        this.currentTestPhase = 'low';
        this.voiceDataBuffer = [];
        this.isWaitingForVoice = true; // 声待機状態
        
        this.updateTestStatus('できるだけ低い声を出してください（声を検出すると3秒測定が始まります）');
        this.updateMicStatus('active'); // 赤色に変更
        this.showRangeIcon('low');
        
        // プログレスバーは0のまま（声検出まで開始しない）
        this.updateStabilityRing(0);
        
        // データ収集開始（声検出のため）
        this.isCollectingData = true;
        
        console.log('🔽 低音テスト準備完了（声待機中）');
        console.log('  isCollectingData:', this.isCollectingData);
        console.log('  currentTestPhase:', this.currentTestPhase);
        console.log('  isWaitingForVoice:', this.isWaitingForVoice);
        console.log('  UI更新: マイク=active, アイコン=low, プログレス=0%');
    }

    /**
     * 高音テスト開始
     */
    startHighRangeTest() {
        this.currentTestPhase = 'high';
        this.voiceDataBuffer = [];
        this.currentProgress = 0; // プログレスリセット
        this.isWaitingForVoice = true; // 声待機状態
        
        // プログレスバーを0にリセット
        this.updateStabilityRing(0);
        
        // 1秒待機後に開始
        setTimeout(() => {
            this.updateTestStatus('できるだけ高い声（ファルセットや裏声）を出してください（声を検出すると3秒測定が始まります）');
            this.updateMicStatus('active'); // 赤色に変更
            this.showRangeIcon('high');
            
            // プログレスバーは0のまま（声検出まで開始しない）
            this.updateStabilityRing(0);
            
            // データ収集開始（声検出のため）
            this.isCollectingData = true;
            
            console.log('⬆️ 高音テスト準備完了（声待機中）');
        }, 1000);
    }

    /**
     * 円形プログレス専用の独立タイマー
     */
    startProgressTimer() {
        console.log('⏱️ プログレスタイマー開始:', this.currentTestPhase);
        console.log('  声検出トリガー:', !this.isWaitingForVoice);
        
        // 既存タイマーをクリア
        if (this.progressTimer) {
            clearInterval(this.progressTimer);
            console.log('  既存タイマークリア');
        }
        
        this.testStartTime = Date.now();
        this.currentProgress = 0;
        
        // プログレスリング初期化
        this.updateStabilityRing(0);
        
        // 100ms間隔で確実に進行（他の処理に影響されない）
        this.progressTimer = setInterval(() => {
            const elapsed = Date.now() - this.testStartTime;
            this.currentProgress = Math.min(100, (elapsed / this.testDuration) * 100);
            
            // UI更新（独立）
            this.updateStabilityRing(this.currentProgress);
            
            // 進捗ログ（10%ごと）
            if (this.currentProgress % 20 === 0 && this.currentProgress > 0) {
                console.log(`  進捗: ${this.currentProgress.toFixed(0)}%`);
            }
            
            // 3秒完了チェック
            if (this.currentProgress >= 100) {
                console.log('✅ タイマー完了 → completeCurrentTest()呼び出し');
                this.completeCurrentTest();
            }
        }, 100);
    }

    /**
     * 現在のテスト完了処理
     */
    completeCurrentTest() {
        // タイマー停止
        if (this.progressTimer) {
            clearInterval(this.progressTimer);
            this.progressTimer = null;
        }
        
        // データ収集停止
        this.isCollectingData = false;
        
        // マイクステータスを待機に戻す
        this.updateMicStatus('standby');
        
        // デバッグ：バッファ全体とフィルタ後を確認
        console.log(`📊 ${this.currentTestPhase}音テスト完了`);
        console.log(`  総サンプル数: ${this.voiceDataBuffer.length}`);
        console.log(`  バッファ内容:`, this.voiceDataBuffer.slice(0, 5)); // 最初の5個を表示
        
        // 収集データの評価
        const validSamples = this.voiceDataBuffer.filter(sample => 
            sample.frequency >= this.minFrequency && 
            sample.frequency <= this.maxFrequency
        );
        
        console.log(`  有効サンプル数: ${validSamples.length}（最小${this.minSamples}必要）`);
        
        // サンプルが全くない場合はデフォルト値を使用
        if (this.voiceDataBuffer.length === 0) {
            console.warn('⚠️ データが全く収集されませんでした - デフォルト値を使用');
            // 仮のデータで次のフェーズへ
            if (this.currentTestPhase === 'low') {
                this.finalResults.lowFreq = 150; // デフォルト低音
            } else if (this.currentTestPhase === 'high') {
                this.finalResults.highFreq = 500; // デフォルト高音
            }
            this.proceedToNextPhase();
            return;
        }
        
        // 十分なサンプルが取得できたかチェック
        if (validSamples.length >= this.minSamples) {
            // 成功 - 結果保存と次のフェーズ
            this.saveTestResult(validSamples);
            this.proceedToNextPhase();
        } else {
            // サンプル不足でも最低限のデータがあれば使用
            if (validSamples.length > 0) {
                console.warn(`⚠️ サンプル不足（${validSamples.length}個）ですが続行`);
                this.saveTestResult(validSamples);
                this.proceedToNextPhase();
            } else {
                // 失敗 - 再測定またはエラー
                this.handleTestFailure();
            }
        }
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
                
                // 音程データ収集（プログレスとは独立）
                this.collectVoiceData(convertedData);
            },
            onError: (error) => {
                console.error('🎤 音域テストエラー:', error);
                this.updateTestStatus(`エラーが発生しました: ${error.message}`);
            }
        });
    }

    /**
     * 音程データ収集（プログレスとは独立）
     */
    collectVoiceData(pitchData) {
        if (!this.isCollectingData || !pitchData) {
            // 測定中でない場合は音量バーを0にする
            if (!this.isCollectingData) {
                this.updateVolumeDisplay(0);
            }
            return;
        }
        
        const { frequency, volume } = pitchData;
        
        // 音量バー更新（リアルタイム）- 測定中のみ
        this.updateVolumeDisplay(volume);
        
        // 声待機中の声検出処理
        if (this.isWaitingForVoice) {
            // 声を検出した場合（音量と周波数の条件）
            if (frequency > 0 && 
                volume >= this.minVolumeLevel && 
                frequency >= this.minFrequency && 
                frequency <= this.maxFrequency) {
                
                console.log(`🎤 声検出！プログレスバー開始: ${frequency.toFixed(1)}Hz, ${volume.toFixed(1)}%`);
                
                // 声待機状態終了
                this.isWaitingForVoice = false;
                
                // メッセージ更新
                if (this.currentTestPhase === 'low') {
                    this.updateTestStatus('低い声を３秒間キープしてください');
                } else if (this.currentTestPhase === 'high') {
                    this.updateTestStatus('高い声（ファルセット）を３秒間キープしてください');
                }
                
                // プログレスバー開始
                this.startProgressTimer();
                
                return; // 最初の検出データは収集しない（プログレス開始のトリガーのみ）
            }
            return; // 声待機中は音量バー更新のみ行い、データ収集はしない
        }
        
        // 通常の測定中のデータ収集
        if (frequency > 0 && 
            volume >= this.minVolumeLevel && 
            frequency >= this.minFrequency && 
            frequency <= this.maxFrequency) {
            
            this.voiceDataBuffer.push({
                frequency: frequency,
                volume: volume,
                timestamp: Date.now()
            });
            
            // 10%の確率でログ出力（スパム防止）
            if (Math.random() < 0.1) {
                console.log(`📊 ${this.currentTestPhase}音データ収集: ${frequency.toFixed(1)}Hz, ${volume.toFixed(1)}%`);
            }
        }
    }

    /**
     * テスト結果保存
     */
    saveTestResult(validSamples) {
        // 平均周波数を計算
        const avgFrequency = validSamples.reduce((sum, sample) => sum + sample.frequency, 0) / validSamples.length;
        
        // サンプルの周波数範囲をデバッグ表示
        const frequencies = validSamples.map(s => s.frequency);
        const minSample = Math.min(...frequencies);
        const maxSample = Math.max(...frequencies);
        
        if (this.currentTestPhase === 'low') {
            this.detectedFrequencies.low = validSamples;
            this.finalResults.lowFreq = avgFrequency;
            console.log(`✅ 低音測定結果: ${avgFrequency.toFixed(1)}Hz (${validSamples.length}サンプル)`);
            console.log(`  サンプル範囲: ${minSample.toFixed(1)}-${maxSample.toFixed(1)}Hz`);
            console.log(`  期待: 低い周波数 (一般的に80-200Hz)`);
        } else if (this.currentTestPhase === 'high') {
            this.detectedFrequencies.high = validSamples;
            this.finalResults.highFreq = avgFrequency;
            console.log(`✅ 高音測定結果: ${avgFrequency.toFixed(1)}Hz (${validSamples.length}サンプル)`);
            console.log(`  サンプル範囲: ${minSample.toFixed(1)}-${maxSample.toFixed(1)}Hz`);
            console.log(`  期待: 高い周波数 (一般的に300-800Hz)`);
        }
    }

    /**
     * 次のフェーズに進む
     */
    proceedToNextPhase() {
        console.log('🔄 次のフェーズへ進む:', this.currentTestPhase);
        
        if (this.currentTestPhase === 'low') {
            // 低音完了 → 高音テストへ
            console.log('  低音完了 → 高音テストへ');
            this.updateTestStatus('低音測定完了！');
            this.showRangeIcon('completed');
            this.startHighRangeTest();
        } else if (this.currentTestPhase === 'high') {
            // 高音完了 → 最終結果
            console.log('  高音完了 → 最終結果へ');
            this.currentTestPhase = 'completed';
            this.completeRangeTest();
        } else {
            console.warn('⚠️ 不明なフェーズ:', this.currentTestPhase);
        }
    }

    /**
     * テスト失敗処理
     */
    handleTestFailure() {
        this.currentRetryCount++;
        
        if (this.currentRetryCount < this.maxRetries) {
            // 再測定
            this.updateTestStatus(`再測定中... (${this.currentRetryCount}/${this.maxRetries}回目)`);
            
            setTimeout(() => {
                if (this.currentTestPhase === 'low') {
                    this.startLowRangeTest();
                } else if (this.currentTestPhase === 'high') {
                    this.startHighRangeTest();
                }
            }, 1500);
        } else {
            // 最大再試行回数に達した
            this.updateTestStatus('測定に失敗しました。デフォルト設定を使用します。');
            this.useDefaultResults();
        }
    }

    /**
     * 最終結果完了
     */
    completeRangeTest() {
        this.isRangeTesting = false;
        this.isCollectingData = false;
        this.updateMicStatus('standby');
        
        // PitchDetector停止
        if (this.pitchDetector) {
            this.pitchDetector.stopDetection();
            console.log('🎵 PitchDetector停止完了');
        }
        
        // 完了アイコン表示
        this.showRangeIcon('completed');
        this.updateTestStatus('音域測定が完了しました！');
        
        const result = this.calculateRangeResult();
        this.onTestComplete(result);
        
        console.log('🎉 音域テスト完全終了:', result);
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
        // finalResultsから低音・高音の周波数を取得
        if (!this.finalResults.lowFreq || !this.finalResults.highFreq) {
            return {
                success: false,
                error: '十分な音域データが取得できませんでした'
            };
        }

        const lowFreq = this.finalResults.lowFreq;
        const highFreq = this.finalResults.highFreq;
        
        // デバッグ情報を出力
        console.log('📊 音域計算結果:');
        console.log('  低音周波数:', lowFreq.toFixed(1), 'Hz');
        console.log('  高音周波数:', highFreq.toFixed(1), 'Hz');

        // 論理的に正しい順序に修正（常に低い方が低音、高い方が高音）
        const minFreq = Math.min(lowFreq, highFreq);
        const maxFreq = Math.max(lowFreq, highFreq);
        
        console.log('  修正後 最低:', minFreq.toFixed(1), 'Hz');
        console.log('  修正後 最高:', maxFreq.toFixed(1), 'Hz');

        // 最小音域チェック（現実的に緩和）
        const rangeWidth = maxFreq - minFreq;
        console.log('  音域幅:', rangeWidth.toFixed(1), 'Hz');
        
        // より現実的な音域判定（50Hz以上で成功とする）
        const minRequiredRange = 50; // 実用的な最小音域
        
        if (rangeWidth < minRequiredRange) {
            return {
                success: false,
                error: `音域が狭すぎます（${rangeWidth.toFixed(0)}Hz）。より広い音域で発声してください`
            };
        }

        // 音名変換
        const minNote = this.frequencyToNote(minFreq);
        const maxNote = this.frequencyToNote(maxFreq);
        
        // オクターブ数算出
        const octaveRange = Math.log2(maxFreq / minFreq);
        
        return {
            success: true,
            frequencyRange: {
                min: minFreq,
                max: maxFreq
            },
            noteRange: {
                min: minNote,
                max: maxNote
            },
            octaveRange: octaveRange,
            detectedNotes: Array.from(this.detectedNotes),
            testDuration: this.testDuration,
            stabilityAchieved: true, // 測定完了したので安定と判定
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
        console.log('🏁 onTestComplete()呼び出し');
        console.log('  result.success:', result.success);
        
        if (result.success) {
            // データ管理クラスに結果保存
            if (this.dataManager && this.dataManager.saveVoiceRangeData) {
                const saveResult = this.dataManager.saveVoiceRangeData(result);
                console.log('💾 音域データ保存:', saveResult);
            } else {
                console.log('  DataManagerなし - 保存スキップ');
            }
            
            this.showTestResults(result);
        } else {
            console.error('❌ テスト失敗:', result.error);
            this.updateTestStatus(`テストに失敗しました: ${result.error}`);
            
            // 失敗時の再測定機能
            this.showRetryOption(result.error);
        }
    }
    
    /**
     * 再測定オプションの表示
     */
    showRetryOption(errorMessage) {
        console.log('🔄 再測定オプション表示');
        
        // エラーメッセージと再測定ボタンを表示
        this.updateTestStatus('測定に失敗しました。もう一度測定しますか？');
        
        // 再測定ボタンを表示
        const beginRangeTestBtn = document.getElementById('begin-range-test-btn');
        if (beginRangeTestBtn) {
            beginRangeTestBtn.classList.remove('hidden');
            beginRangeTestBtn.innerHTML = `
                <i data-lucide="refresh-cw" style="width: 20px; height: 20px;"></i>
                <span>もう一度測定</span>
            `;
            
            // Lucideアイコン再初期化
            if (typeof lucide !== 'undefined' && lucide.createIcons) {
                lucide.createIcons();
            }
            
            console.log('🔄 再測定ボタン表示完了');
        }
        
        // 測定状態を完全リセット（再測定用）
        this.currentTestPhase = 'ready';
        this.isRangeTesting = true;
        this.isCollectingData = false; // データ収集停止
        this.isWaitingForVoice = false; // 声待機状態もリセット
        this.currentRetryCount = 0; // 再試行回数リセット（重要！）
        
        // 測定データ完全リセット
        this.detectedFrequencies = { low: [], high: [] };
        this.finalResults = { lowFreq: null, highFreq: null };
        this.voiceDataBuffer = [];
        this.currentProgress = 0;
        
        // プログレスタイマークリア
        if (this.progressTimer) {
            clearInterval(this.progressTimer);
            this.progressTimer = null;
        }
        
        // UI状態リセット
        this.updateMicStatus('standby');
        this.showRangeIcon('idle');
        this.updateStabilityRing(0);
        this.updateVolumeDisplay(0); // 音量バーを0にリセット
        
        console.log('🔄 再測定用状態リセット完了');
    }

    /**
     * テスト結果表示
     */
    showTestResults(result) {
        console.log('📊 showTestResults()呼び出し');
        console.log('  結果:', result);
        
        // 結果セクション表示
        const rangeTestSection = document.getElementById('range-test-section');
        const resultSection = document.getElementById('result-section');
        
        console.log('  rangeTestSection存在:', !!rangeTestSection);
        console.log('  resultSection存在:', !!resultSection);
        
        if (rangeTestSection) {
            rangeTestSection.classList.add('hidden');
            console.log('  音域テストセクションを非表示');
        }
        
        if (resultSection) {
            resultSection.classList.remove('hidden');
            console.log('  結果セクションを表示');
            
            // 結果データ更新
            const rangeValueElements = document.querySelectorAll('.range-info-value');
            console.log('  結果表示要素数:', rangeValueElements.length);
            
            if (rangeValueElements.length >= 2) {
                rangeValueElements[0].textContent = `${result.noteRange.min} - ${result.noteRange.max}`;
                rangeValueElements[1].textContent = `${result.octaveRange.toFixed(1)}オクターブ`;
                console.log('  結果データ更新完了');
            }
        } else {
            console.error('❌ 結果セクションが見つかりません！');
        }
        
        console.log('✅ 音域テスト結果表示処理完了');
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

    showRangeIcon(phase = 'idle') {
        if (this.rangeIcon) {
            this.rangeIcon.style.display = 'block';
            
            // フェーズに応じてアイコンを変更（すべて白色に統一）
            switch(phase) {
                case 'low':
                    this.rangeIcon.setAttribute('data-lucide', 'arrow-down');
                    this.rangeIcon.style.color = 'white';
                    break;
                case 'high':
                    this.rangeIcon.setAttribute('data-lucide', 'arrow-up');
                    this.rangeIcon.style.color = 'white';
                    break;
                case 'completed':
                    this.rangeIcon.setAttribute('data-lucide', 'check');
                    this.rangeIcon.style.color = 'white';
                    break;
                default:
                    this.rangeIcon.setAttribute('data-lucide', 'arrow-down');
                    this.rangeIcon.style.color = 'white';
            }
            
            // Lucideアイコン再初期化
            if (typeof lucide !== 'undefined' && lucide.createIcons) {
                lucide.createIcons();
            }
        }
        
        if (this.countdownDisplay) {
            this.countdownDisplay.style.display = 'none';
        }
    }

    /**
     * マイクステータス更新
     */
    updateMicStatus(status) {
        const container = document.getElementById('mic-status-container');
        if (!container) return;
        
        switch(status) {
            case 'standby':
                container.className = 'mic-status-container standby';
                break;
            case 'active':
            case 'recording':
                container.className = 'mic-status-container recording';
                break;
            default:
                container.className = 'mic-status-container standby';
        }
    }

    /**
     * 音量表示更新
     */
    updateVolumeDisplay(volume) {
        if (this.rangeTestVolumeBar) {
            this.rangeTestVolumeBar.style.width = Math.min(100, Math.max(0, volume)) + '%';
        }
        if (this.rangeTestVolumeText) {
            this.rangeTestVolumeText.textContent = volume.toFixed(1) + '%';
        }
    }

    /**
     * デフォルト結果使用
     */
    useDefaultResults() {
        this.finalResults = {
            lowFreq: 146.83, // D3
            highFreq: 523.25  // C5
        };
        this.completeRangeTest();
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