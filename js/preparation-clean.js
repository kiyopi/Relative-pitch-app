// preparation-clean.js - 音域テスト準備ページ用JavaScript（クリーンアップ版）
// AudioDetectionComponent統合・シンプル実装

lucide.createIcons();

// デバイス検出（CRITICAL_DECISIONS_AND_INSIGHTS.md準拠 - iPadOS 13+バグ対策）
function detectDeviceWithSpecs() {
    const userAgent = navigator.userAgent;
    
    // iPadOS 13+ 完全対応検出ロジック
    const isIPhone = /iPhone/.test(userAgent);
    const isIPad = /iPad/.test(userAgent);
    const isIPadOS = /Macintosh/.test(userAgent) && 'ontouchend' in document;
    const hasIOSNavigator = /iPad|iPhone|iPod/.test(userAgent);
    const hasIOSPlatform = /iPad|iPhone|iPod/.test((navigator).platform || '');
    
    const isIOS = isIPhone || isIPad || isIPadOS || hasIOSNavigator || hasIOSPlatform;
    
    let deviceType = 'PC';
    let sensitivityMultiplier = 2.5;
    let volumeBarScale = 3.0; // PC感度調整: 4.0→2.5→3.0

    if (isIPhone) {
        deviceType = 'iPhone';
        sensitivityMultiplier = 3.5;
        volumeBarScale = 4.5;
    } else if (isIPad || isIPadOS) {
        deviceType = 'iPad';
        sensitivityMultiplier = 5.0;
        volumeBarScale = 7.0;
    } else if (isIOS) {
        deviceType = 'iOS Device';
        sensitivityMultiplier = 3.5;
        volumeBarScale = 4.5;
    }
    
    return {
        deviceType,
        sensitivityMultiplier,
        volumeBarScale,
        isIOS,
        debugInfo: {
            userAgent,
            detectionMethods: {
                isIPhone, isIPad, isIPadOS, hasIOSNavigator, hasIOSPlatform,
                touchSupport: 'ontouchend' in document
            }
        }
    };
}

// DOM要素取得
const requestMicBtn = document.getElementById('request-mic-btn');
const startRangeTestBtn = document.getElementById('start-range-test-btn');
const startTrainingBtn = document.getElementById('start-training-btn');

const permissionSection = document.getElementById('permission-section');
const audioTestSection = document.getElementById('audio-test-section');
const rangeTestSection = document.getElementById('range-test-section');
const resultSection = document.getElementById('result-section');

// グローバルデバイス設定
const deviceSpecs = detectDeviceWithSpecs();
console.log(`🔍 デバイス検出結果: ${deviceSpecs.deviceType}`, deviceSpecs);

// デバイス設定をlocalStorageに保存
try {
    const deviceSettings = {
        deviceType: deviceSpecs.deviceType,
        sensitivityMultiplier: deviceSpecs.sensitivityMultiplier,
        volumeBarScale: deviceSpecs.volumeBarScale,
        isIOS: deviceSpecs.isIOS,
        detectedAt: new Date().toISOString(),
        userAgent: deviceSpecs.debugInfo.userAgent
    };
    localStorage.setItem('deviceSettings', JSON.stringify(deviceSettings));
    console.log('💾 デバイス設定をlocalStorageに保存完了');
} catch (error) {
    console.warn('⚠️ デバイス設定の保存に失敗:', error);
}

// AudioDetectionComponent 初期化
let audioDetector = null;

async function initializeAudioDetection() {
    try {
        console.log('🎤 AudioDetectionComponent初期化開始...');
        
        audioDetector = new AudioDetectionComponent({
            // UI要素セレクター指定で周波数・音名表示を有効化（preparation.html準拠）
            frequencySelector: '#frequency-value'
        });
        
        await audioDetector.initialize();
        console.log('✅ AudioDetectionComponent初期化完了');
        return true;
        
    } catch (error) {
        console.error('❌ AudioDetectionComponent初期化エラー:', error);
        return false;
    }
}

// シンプル音域テスト実装（test-voice-range.htmlベース）
async function startSimpleVoiceRangeTest() {
    console.log('🎯 シンプル音域テスト開始');
    
    if (!audioDetector) {
        console.error('❌ AudioDetectionComponent未初期化');
        return;
    }
    
    let currentPhase = 'low';
    let isVoiceRangeTesting = false;
    let voiceRangeTestData = null;
    
    function initializeTestPhase(phase) {
        isVoiceRangeTesting = true;
        currentPhase = phase;
        
        voiceRangeTestData = {
            phase: phase,
            measurementStartTime: null,
            detectedFrequencies: [],
            results: {
                lowestNote: null,
                highestNote: null
            }
        };
        
        console.log(`🎤 ${phase}音測定開始`);
        
        // UI更新
        const testInstructionText = document.getElementById('test-instruction-text');
        const testStatus = document.getElementById('test-status');
        
        if (phase === 'low') {
            if (testInstructionText) testInstructionText.textContent = 'できるだけ低い声で「あー」を3秒間発声してください';
            if (testStatus) testStatus.textContent = '低音域テスト実行中...';
        } else {
            if (testInstructionText) testInstructionText.textContent = 'できるだけ高い声で「あー」を3秒間発声してください';
            if (testStatus) testStatus.textContent = '高音域テスト実行中...';
        }
    }
    
    function handleVoiceRangeUpdate(result) {
        if (!isVoiceRangeTesting || !voiceRangeTestData || !result || result.frequency <= 0) {
            return;
        }
        
        // 測定開始時刻設定
        if (!voiceRangeTestData.measurementStartTime) {
            voiceRangeTestData.measurementStartTime = Date.now();
            console.log('⏱️ 3秒測定開始');
        }
        
        // 有効な周波数データを記録
        if (result.frequency > 50 && result.volume > 0.01 && result.clarity > 0.5) {
            voiceRangeTestData.detectedFrequencies.push({
                frequency: result.frequency,
                time: Date.now() - voiceRangeTestData.measurementStartTime,
                volume: result.volume,
                clarity: result.clarity
            });
            
            // 進捗表示更新
            const elapsed = Date.now() - voiceRangeTestData.measurementStartTime;
            const progress = Math.min(100, (elapsed / 3000) * 100);
            
            // 3秒経過で測定完了
            if (elapsed >= 3000) {
                completePhaseMeasurement();
            }
        }
    }
    
    function completePhaseMeasurement() {
        console.log(`✅ ${currentPhase}音測定完了`);
        
        if (voiceRangeTestData.detectedFrequencies.length === 0) {
            console.error('❌ 有効な音声データが検出されませんでした');
            return;
        }
        
        // 最低/最高周波数を計算
        const frequencies = voiceRangeTestData.detectedFrequencies.map(d => d.frequency);
        const avgFreq = frequencies.reduce((a, b) => a + b) / frequencies.length;
        
        if (currentPhase === 'low') {
            voiceRangeTestData.results.lowestNote = avgFreq;
            console.log(`📊 低音結果: ${avgFreq.toFixed(1)}Hz`);
            
            // 高音測定に移行
            setTimeout(() => {
                initializeTestPhase('high');
                
                // 音域テスト用コールバック再設定
                audioDetector.setCallbacks({
                    onPitchUpdate: handleVoiceRangeUpdate
                });
                
                audioDetector.startDetection();
            }, 1000);
            
        } else {
            voiceRangeTestData.results.highestNote = avgFreq;
            console.log(`📊 高音結果: ${avgFreq.toFixed(1)}Hz`);
            
            // テスト完了
            finishVoiceRangeTest();
        }
    }
    
    function finishVoiceRangeTest() {
        console.log('🎉 音域テスト完了');
        isVoiceRangeTesting = false;
        
        const results = voiceRangeTestData.results;
        const range = (results.highestNote - results.lowestNote).toFixed(1);
        
        console.log(`📋 最終結果 - 低音:${results.lowestNote.toFixed(1)}Hz, 高音:${results.highestNote.toFixed(1)}Hz, 範囲:${range}Hz`);
        
        // 結果をlocalStorageに保存
        const voiceRangeData = {
            results: {
                lowestNote: results.lowestNote.toFixed(1),
                highestNote: results.highestNote.toFixed(1),
                range: range
            },
            timestamp: new Date().toISOString()
        };
        
        localStorage.setItem('voiceRangeData', JSON.stringify(voiceRangeData));
        
        // UI更新
        const testStatus = document.getElementById('test-status');
        if (testStatus) {
            testStatus.textContent = '音域測定完了！結果を保存しました。';
        }
        
        // 次のステップへ
        updateStepStatus(3, 'completed');
        showTrainingSection();
    }
    
    // 低音測定開始
    initializeTestPhase('low');
    
    // 音域テスト用コールバック設定
    audioDetector.setCallbacks({
        onPitchUpdate: handleVoiceRangeUpdate
    });
    
    const startResult = audioDetector.startDetection();
    console.log(`🎤 検出開始結果: ${startResult}`);
    
    return startResult;
}

// ステップインジケーター更新
function updateStepStatus(stepNumber, status) {
    const step = document.getElementById(`step-${stepNumber}`);
    if (step) {
        step.classList.remove('active', 'completed');
        if (status === 'active') {
            step.classList.add('active');
        } else if (status === 'completed') {
            step.classList.add('completed');
        }
    }
}

// セクション表示切り替え
function showSection(sectionToShow) {
    [permissionSection, audioTestSection, rangeTestSection, resultSection].forEach(section => {
        if (section) section.classList.add('hidden');
    });
    sectionToShow.classList.remove('hidden');
}

// トレーニングセクション表示
function showTrainingSection() {
    showSection(resultSection);
}

// 初期状態設定
updateStepStatus(1, 'active');

// マイク許可ボタン
requestMicBtn.addEventListener('click', async () => {
    try {
        requestMicBtn.disabled = true;
        requestMicBtn.innerHTML = '<i data-lucide="loader" style="width: 24px; height: 24px;"></i><span>許可を待っています...</span>';
        lucide.createIcons();

        // AudioDetectionComponent初期化
        console.log(`🚀 AudioDetectionComponent初期化開始（${deviceSpecs.deviceType}用最適化）...`);
        const initResult = await initializeAudioDetection();
        
        if (!initResult) {
            throw new Error('AudioDetectionComponent初期化失敗');
        }

        // マイク正常性テスト用変数（80-400Hz範囲、3秒検出）
        let micTestStartTime = null;
        let validFrequencyCount = 0;
        const REQUIRED_DURATION = 3000; // 3秒
        const MIN_FREQUENCY = 80;
        const MAX_FREQUENCY = 400;
        const REQUIRED_SAMPLES = 30; // 約3秒分のサンプル数

        // AudioDetectionComponent音域テスト用音量バー設定
        audioDetector.setCallbacks({
            onPitchUpdate: (result) => {
                // 音域テスト準備時は音量バー更新と周波数表示
                updateVolumeBar(result);
                updateFrequencyDisplay(result);
                
                // マイク正常性テスト（80-400Hz範囲で3秒検出）
                checkMicrophoneNormality(result);
            }
        });
        
        // 音域テスト開始可能にする
        const startResult = audioDetector.startDetection();
        console.log('🎤 音程検出開始結果:', startResult);
        
        // 音域テスト用音量バー更新関数（修正版）
        function updateVolumeBar(result) {
            const volumeProgress = document.getElementById('volume-progress');
            const volumeValue = document.getElementById('volume-value');
            
            // 無音時は完全に0にする
            if (!result || result.volume <= 0.001) {
                if (volumeProgress) volumeProgress.style.width = '0%';
                if (volumeValue) volumeValue.textContent = '0.0%';
                return;
            }
            
            // AudioDetectionComponentと同じ計算（感度向上）
            const deviceSpecs = audioDetector.getStatus();
            const rawVolume = result.volume || 0;
            
            // 感度を2倍に向上（test-audio-component.htmlで確認済み）
            const enhancedSensitivity = deviceSpecs.sensitivityMultiplier * 2.0;
            const adjustedVolume = rawVolume * deviceSpecs.volumeBarScale * enhancedSensitivity;
            const volumePercent = Math.min(100, Math.max(0, adjustedVolume));
            
            if (volumeProgress) {
                volumeProgress.style.width = volumePercent + '%';
            }
            if (volumeValue) {
                volumeValue.textContent = volumePercent.toFixed(1) + '%';
            }
            
            // デバッグログ（稀に出力）
            if (Math.random() < 0.05) {
                console.log('🎚️ 音量バーデバッグ:', {
                    rawVolume: rawVolume.toFixed(4),
                    volumeBarScale: deviceSpecs.volumeBarScale,
                    enhancedSensitivity,
                    volumePercent: volumePercent.toFixed(1)
                });
            }
        }
        
        // 周波数表示更新関数（preparation.html形式）
        function updateFrequencyDisplay(result) {
            const frequencyEl = document.getElementById('frequency-value');
            
            if (!frequencyEl) return;
            
            if (!result || result.frequency <= 0) {
                frequencyEl.textContent = '-- Hz (-)';
                return;
            }
            
            const frequency = result.frequency.toFixed(1);
            const note = result.note || '--';
            frequencyEl.textContent = `${frequency} Hz (${note})`;
        }
        
        // マイク正常性チェック関数（80-400Hz範囲、3秒継続）
        function checkMicrophoneNormality(result) {
            if (!result || result.frequency <= 0 || result.volume <= 0.01) {
                // 無音時はリセット
                if (micTestStartTime) {
                    console.log('⚠️ 無音により正常性テストリセット');
                    micTestStartTime = null;
                    validFrequencyCount = 0;
                }
                return;
            }
            
            // 80-400Hz範囲内の周波数チェック
            if (result.frequency >= MIN_FREQUENCY && result.frequency <= MAX_FREQUENCY) {
                // 初回検出時に開始時刻記録
                if (!micTestStartTime) {
                    micTestStartTime = Date.now();
                    validFrequencyCount = 0;
                    console.log(`🎤 マイク正常性テスト開始 (${result.frequency.toFixed(1)}Hz)`);
                    
                    // 進捗エリア表示
                    const progressDisplay = document.getElementById('progress-display');
                    if (progressDisplay) {
                        progressDisplay.style.display = 'block';
                    }
                }
                
                validFrequencyCount++;
                const elapsed = Date.now() - micTestStartTime;
                const progress = Math.min(100, (validFrequencyCount / REQUIRED_SAMPLES) * 100);
                
                // 進捗表示更新
                const progressText = document.getElementById('progress-text');
                const progressDetail = document.getElementById('progress-detail');
                if (progressText) {
                    progressText.textContent = `音声検出中 (${result.frequency.toFixed(1)}Hz)`;
                }
                if (progressDetail) {
                    progressDetail.textContent = `進捗: ${validFrequencyCount}/${REQUIRED_SAMPLES}サンプル (${(elapsed/1000).toFixed(1)}秒)`;
                }
                
                // 十分なサンプル数と3秒経過で完了
                if (validFrequencyCount >= REQUIRED_SAMPLES && elapsed >= REQUIRED_DURATION) {
                    console.log('✅ マイク正常性テスト完了 - 80-400Hz範囲で3秒継続検出');
                    
                    // UI更新
                    const detectionSuccess = document.getElementById('detection-success');
                    const detectionSuccessMessage = document.getElementById('detection-success-message');
                    const startRangeTestBtn = document.getElementById('start-range-test-btn');
                    const progressDisplay = document.getElementById('progress-display');
                    
                    if (detectionSuccess) detectionSuccess.style.display = 'block';
                    if (detectionSuccessMessage) {
                        detectionSuccessMessage.textContent = `マイクが正常に動作しています (${MIN_FREQUENCY}-${MAX_FREQUENCY}Hz範囲、3秒継続)。音域テストに進みましょう。`;
                    }
                    if (startRangeTestBtn) {
                        startRangeTestBtn.classList.remove('hidden');
                        startRangeTestBtn.style.display = 'block';
                    }
                    if (progressDisplay) {
                        progressDisplay.style.display = 'none';
                    }
                    
                    // テスト完了フラグ
                    micTestStartTime = null;
                    validFrequencyCount = 0;
                }
                
            } else {
                // 範囲外の周波数の場合はリセット
                if (micTestStartTime) {
                    console.log(`⚠️ 範囲外周波数により正常性テストリセット (${result.frequency.toFixed(1)}Hz)`);
                    micTestStartTime = null;
                    validFrequencyCount = 0;
                    
                    const progressDisplay = document.getElementById('progress-display');
                    if (progressDisplay) {
                        progressDisplay.style.display = 'none';
                    }
                }
            }
        }
        
        // マイク許可完了、次のステップへ
        updateStepStatus(1, 'completed');
        updateStepStatus(2, 'active');
        showSection(audioTestSection);
        
        console.log('✅ AudioDetectionComponent初期化・マイク許可完了');
        
    } catch (error) {
        console.error('❌ マイク許可エラー:', error);
        requestMicBtn.innerHTML = '<i data-lucide="mic" style="width: 24px; height: 24px;"></i><span>マイクロフォンを許可する</span>';
        requestMicBtn.disabled = false;
        lucide.createIcons();
    }
});

// 音域テスト開始ボタン（新シンプル実装）
startRangeTestBtn.addEventListener('click', async () => {
    // ステップ2完了、ステップ3へ
    updateStepStatus(2, 'completed');
    updateStepStatus(3, 'active');
    
    showSection(rangeTestSection);
    
    // 新しいシンプル音域テスト実行
    try {
        await startSimpleVoiceRangeTest();
    } catch (error) {
        console.error('❌ 音域テスト実行エラー:', error);
    }
});

// トレーニング開始ボタン
startTrainingBtn.addEventListener('click', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const mode = urlParams.get('mode') || 'random';
    const session = urlParams.get('session') || '1';
    window.location.href = `training.html?mode=${mode}&session=${session}`;
});

console.log('🚀 preparation-clean.js読み込み完了');