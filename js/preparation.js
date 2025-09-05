// preparation.js - 音域テスト準備ページ用JavaScript
// 外部ファイル化: preparation.htmlのインラインスクリプトから移動

lucide.createIcons();

// デバイス検出（CRITICAL_DECISIONS_AND_INSIGHTS.md準拠 - iPadOS 13+バグ対策）
function detectDeviceWithSpecs() {
    const userAgent = navigator.userAgent; // toLowerCase削除（大文字小文字区別重要）
    
    // iPadOS 13+ 完全対応検出ロジック
    const isIPhone = /iPhone/.test(userAgent);
    const isIPad = /iPad/.test(userAgent);
    const isIPadOS = /Macintosh/.test(userAgent) && 'ontouchend' in document; // iPadOS 13+偽装対策
    const hasIOSNavigator = /iPad|iPhone|iPod/.test(userAgent);
    const hasIOSPlatform = /iPad|iPhone|iPod/.test((navigator).platform || '');
    
    // 複数方式による総合判定
    const isIOS = isIPhone || isIPad || isIPadOS || hasIOSNavigator || hasIOSPlatform;
    
    let deviceType = 'PC';
    let sensitivityMultiplier = 2.5; // 実機テスト済み設定
    let volumeBarScale = 2.5; // AudioDetectionComponent準拠（4.0→2.5）
    
    if (isIPhone) {
        deviceType = 'iPhone';
        sensitivityMultiplier = 3.5; // 実機テスト済み設定
        volumeBarScale = 4.5; // 実機テスト済み設定
    } else if (isIPad || isIPadOS) { // isIPadOS追加が重要
        deviceType = 'iPad';
        sensitivityMultiplier = 5.0; // 実機テスト済み設定
        volumeBarScale = 7.0; // 実機テスト済み設定
    } else if (isIOS) {
        deviceType = 'iOS Device';
        sensitivityMultiplier = 3.5; // フォールバック
        volumeBarScale = 4.5;
    }
    
    return {
        deviceType,
        sensitivityMultiplier,
        volumeBarScale,
        isIOS,
        debugInfo: {
            userAgent: userAgent,
            detectionMethods: {
                isIPhone,
                isIPad,
                isIPadOS, // iPadOS 13+検出状態
                hasIOSNavigator,
                hasIOSPlatform,
                touchSupport: 'ontouchend' in document
            }
        }
    };
}

// DOM要素の取得
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

// iPadOS 13+ 検出の詳細ログ
if (deviceSpecs.debugInfo.detectionMethods.isIPadOS) {
    console.log('⚠️ iPadOS 13+ 検出: Macintosh偽装を発見・iPad判定に修正', {
        userAgent: deviceSpecs.debugInfo.userAgent,
        touchSupport: deviceSpecs.debugInfo.detectionMethods.touchSupport,
        macintoshUA: /Macintosh/.test(deviceSpecs.debugInfo.userAgent),
        iPadUA: /iPad/.test(deviceSpecs.debugInfo.userAgent)
    });
}

// デバイス設定をlocalStorageに保存（後続ページで使用）
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
            // 音域テスト時は手動UI更新
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
    
    // 音域テスト状態管理
    let currentPhase = 'low'; // 'low' or 'high'
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
    
    // コネクターの更新
    if (stepNumber > 1) {
        const connector = document.getElementById(`connector-${stepNumber - 1}`);
        if (connector && status === 'completed') {
            connector.classList.add('active');
        }
    }
}

// セクション表示切り替え
function showSection(sectionToShow) {
    [permissionSection, audioTestSection, rangeTestSection, resultSection].forEach(section => {
        section.classList.add('hidden');
    });
    sectionToShow.classList.remove('hidden');
}

// 初期状態設定
updateStepStatus(1, 'active');

// オーディオプロセッサーインスタンス
let audioProcessor = null;

// VolumeBarControllerインスタンス（新統合システム）
let volumeBarController = null;

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

        // デバイス別感度設定適用
        console.log(`🔧 ${deviceSpecs.deviceType}用感度設定適用: ${deviceSpecs.sensitivityMultiplier}x`);
        
        // AudioDetectionComponent音域テスト用音量バー設定
        audioDetector.setCallbacks({
            onPitchUpdate: (result) => {
                // 音域テスト準備時は音量バー更新のみ
                updateVolumeBar(result);
            }
        });
        
        // 音域テスト開始可能にする
        const startResult = audioDetector.startDetection();
        console.log('🎤 音程検出開始結果:', startResult);
        
        // 音域テスト用音量バー更新関数
        function updateVolumeBar(result) {
            if (!result || result.volume <= 0) return;
            
            const volumeProgress = document.getElementById('volume-progress');
            const volumeValue = document.getElementById('volume-value');
            
            // AudioDetectionComponentと同じ計算
            const deviceSpecs = audioDetector.getStatus();
            const rawVolume = result.volume || 0;
            const adjustedVolume = rawVolume * deviceSpecs.volumeBarScale * deviceSpecs.sensitivityMultiplier;
            const volumePercent = Math.min(100, Math.max(0, adjustedVolume));
            
            if (volumeProgress) {
                volumeProgress.style.width = volumePercent + '%';
            }
            if (volumeValue) {
                volumeValue.textContent = volumePercent.toFixed(1) + '%';
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

// スキップボタン
const skipRangeTestBtn = document.getElementById('skip-range-test-btn');
                    volume: result?.volume,
                    volumeType: typeof result?.volume,
                    frequency: result?.frequency,
                    clarity: result?.clarity,
                    detectionActive: detectionActive
                });
                
                // 検出停止中は音量バー更新をスキップ（マイクミュート連動）
                console.log('🔍 detectionActive状態チェック:', detectionActive);
                if (!detectionActive) {
                    console.log('⏸️ 検出停止中のため音量バー更新をスキップ');
                    return;
                }
                console.log('▶️ detectionActive=trueのため処理継続');
                
                // リアルタイム音程処理
                handleRealPitchUpdate(result);
                
                // VolumeBarController統合システムで音量バー更新
                if (result && typeof result.volume === 'number' && volumeBarController) {
                    // VolumeBarControllerのコールバックを手動呼び出し
                    volumeBarController.handlePitchUpdate(result);
                    
                    // 使用状況ログ（既存システムと並行動作確認用）
                    if (result.volume > 0.01 && detectionActive && Math.random() < 0.1) {
                        console.log('🎚️ VolumeBarController統合システム使用中:', {
                            rawVolume: result.volume.toFixed(3),
                            deviceType: volumeBarController.getDeviceSpecs().deviceType,
                            volumeBarScale: volumeBarController.getDeviceSpecs().volumeBarScale
                        });
                    }
                }
                
                // 既存システム（フォールバック用、最終的に削除予定）
                if (result && typeof result.volume === 'number' && !volumeBarController) {
                    const rawVolume = result.volume || 0;
                    
                    // デバイス別音量バースケール（実機テスト済み設定）
                    let scale = 4.0; // PC標準（実機テスト済み）
                    if (deviceSpecs?.deviceType === 'iPhone') {
                        scale = 4.5; // iPhone: 感度3.5x, 音量バー4.5x
                    } else if (deviceSpecs?.deviceType === 'iPad') {
                        scale = 7.0; // iPad: 感度5.0x, 音量バー7.0x  
                    }
                    
                    // 基本音量計算
                    const adjustedVolume = rawVolume * scale * deviceSpecs.sensitivityMultiplier;
                    
                    // 0-100%制限
                    let volumePercent = Math.min(100, Math.max(0, adjustedVolume));
                    
                    const volumeProgress = document.getElementById('volume-progress');
                    const volumeValue = document.getElementById('volume-value');
                    
                    if (volumeProgress) {
                        volumeProgress.style.width = volumePercent + '%';
                    }
                    if (volumeValue) {
                        volumeValue.textContent = volumePercent.toFixed(0) + '%';
                    }
                    
                    // フォールバックシステム使用ログ
                    if (rawVolume > 0.01 && detectionActive && Math.random() < 0.1) {
                        console.log('⚠️ フォールバックシステム使用中:', {
                            rawVolume: rawVolume.toFixed(3),
                            scale: scale,
                            volumePercent: volumePercent.toFixed(1)
                        });
                    }
                }
            },
            onVolumeUpdate: (volume) => {
                console.log('🔊 onVolumeUpdate（分離方式）受信:', volume);
                handleVolumeUpdate(volume, deviceSpecs.volumeBarScale);
            },
            onError: (context, error) => handleAudioError(context, error),
            onStateChange: (state) => console.log('Audio state:', state)
        });
        
        // ステップ1完了、ステップ2へ
        updateStepStatus(1, 'completed');
        updateStepStatus(2, 'active');
        
        showSection(audioTestSection);
        startRealAudioDetection();
        
    } catch (error) {
        console.error('マイク許可エラー:', error);
        requestMicBtn.disabled = false;
        requestMicBtn.innerHTML = '<i data-lucide="alert-circle" style="width: 24px; height: 24px;"></i><span>マイク許可失敗 - 再試行</span>';
        lucide.createIcons();
        
        alert(`マイクの許可に失敗しました: ${error.message}`);
    }
});

// スキップボタン
const skipRangeTestBtn = document.getElementById('skip-range-test-btn');
const retestRangeBtn = document.getElementById('retest-range-btn');

if (skipRangeTestBtn) {
    skipRangeTestBtn.addEventListener('click', () => {
        // ステップ2完了、直接トレーニングへ
        updateStepStatus(2, 'completed');
        updateStepStatus(3, 'completed');
        window.location.href = 'training.html';
    });
}

if (retestRangeBtn) {
    retestRangeBtn.addEventListener('click', () => {
        // 音域データをクリアして再テスト
        localStorage.removeItem('voiceRangeData');
        
        // ステップ2完了、ステップ3へ
        updateStepStatus(2, 'completed');
        updateStepStatus(3, 'active');
        
        showSection(rangeTestSection);
        startRangeTest();
    });
}

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

// 再測定ボタン
const remeasureRangeBtn = document.getElementById('remeasure-range-btn');
if (remeasureRangeBtn) {
    remeasureRangeBtn.addEventListener('click', () => {
        // 音域データをクリアして再テスト
        localStorage.removeItem('voiceRangeData');
        
        // ステップ3をアクティブに戻す
        updateStepStatus(3, 'active');
        
        showSection(rangeTestSection);
        startRangeTest();
    });
}

// トレーニング開始ボタン
startTrainingBtn.addEventListener('click', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const mode = urlParams.get('mode') || 'random';
    const session = urlParams.get('session') || '1';
    window.location.href = `training.html?mode=${mode}&session=${session}`;
});

// 音域データ表示用の共通関数
function displaySavedRangeData(data, displayElement) {
    const savedRange = document.getElementById('saved-range');
    const savedOctaves = document.getElementById('saved-octaves');
    const savedDate = document.getElementById('saved-date');
    
    if (savedRange) savedRange.textContent = `${data.lowestNote} - ${data.highestNote}`;
    if (savedOctaves) savedOctaves.textContent = `${data.octaveCount}オクターブ`;
    if (savedDate) {
        const date = new Date(data.testDate);
        savedDate.textContent = date.toLocaleDateString('ja-JP');
    }
    
    // 表示要素を表示
    if (displayElement) {
        setTimeout(() => {
            displayElement.classList.remove('hidden');
            // displayElement.classList.add('fade-in-up'); // アニメーション無効化
        }, 200);
    }
}

// 実際のオーディオ検出処理
let detectionActive = false;
let detectedCDoPitches = [];

// 音量バー表示時間保証のための状態管理
let detectionStartTime = null;
const MIN_DETECTION_TIME = 2000; // 最低2秒間は音量バー表示を保証
const MIN_PITCH_DETECTIONS = 3;   // 最低3回の音程検出を要求

// 音声テスト状態管理
let isAudioTesting = false;
let audioTestStartTime = null;
let audioTestDuration = 15000; // 15秒
let detectedC4 = false;

// 進捗表示更新関数
function updateProgressDisplay(mainText, detailText) {
    const progressDisplay = document.getElementById('progress-display');
    const progressText = document.getElementById('progress-text');
    const progressDetail = document.getElementById('progress-detail');
    
    if (progressDisplay) {
        progressDisplay.style.display = 'block';
    }
    if (progressText) {
        progressText.textContent = mainText;
    }
    if (progressDetail) {
        progressDetail.textContent = detailText;
    }
}

// リアルタイム音程検出開始（改善版）
function startRealAudioDetection() {
    console.log('🎵 音声テスト開始（改善版）');
    
    isAudioTesting = true;
    audioTestStartTime = Date.now();
    detectedC4 = false;
    
    detectionActive = true;
    detectedCDoPitches = [];
    detectionStartTime = Date.now();
    
    audioProcessor.startDetection();
    
    // 進捗表示を更新
    updateProgressDisplay('声を出してください', '3秒間継続して発声してください');
    
    console.log('🕐 音声テスト開始時刻:', new Date(audioTestStartTime).toLocaleTimeString());
    
    // 15秒タイマー
    setTimeout(checkAudioTestComplete, audioTestDuration);
}

// リアルタイム音程更新ハンドラー
function handleRealPitchUpdate(result) {
    if (!detectionActive) {
        console.log('⏸️ detectionActive=false のため音程処理をスキップ');
        return;
    }
    
    // 詳細デバッグログ
    console.log('🎵 handleRealPitchUpdate呼び出し:', {
        result: result,
        resultKeys: result ? Object.keys(result) : 'null',
        frequency: result?.frequency,
        volume: result?.volume,
        clarity: result?.clarity,
        timestamp: new Date().toLocaleTimeString(),
        // 音域テスト状態デバッグ
        isVoiceRangeTesting: window.isVoiceRangeTesting,
        hasVoiceRangeTestData: !!window.voiceRangeTestData,
        voiceRangeTestDataKeys: window.voiceRangeTestData ? Object.keys(window.voiceRangeTestData) : null
    });
    
    // 音域テスト用のグローバル変数に保存
    window.lastDetectedFrequency = result.frequency;
    window.lastDetectedClarity = result.clarity;
    window.lastDetectedVolume = result.volume || 0;
    
    const volumeProgress = document.getElementById('volume-progress');
    const volumeValue = document.getElementById('volume-value');
    const frequencyValue = document.getElementById('frequency-value');
    
    // 音量表示更新（統合方式で処理済みのため、この処理は不要）
    // 統合方式のonPitchUpdateで音量バー更新を実行中
    
    // 周波数表示更新
    if (frequencyValue && result.frequency > 0) {
        const note = frequencyToNote(result.frequency);
        frequencyValue.textContent = `${result.frequency.toFixed(1)} Hz (${note})`;
        
        // 音声検出チェック（より広い範囲で人の声を検出）
        // 男性: 80-180Hz、女性: 165-330Hz、子供: 250-400Hz
        const volumePercent = window.lastVolumePercent || 0;
        const isFreqInRange = result.frequency >= 80 && result.frequency <= 400;
        const isVolumeOK = volumePercent >= 20;
        
        console.log('🎯 音声検出チェック（改善版）:', {
            frequency: result.frequency,
            clarity: result.clarity,
            volume: result.volume,
            volumePercent: volumePercent,
            isInRange: isFreqInRange,
            volumeOK: isVolumeOK,
            detectedC4: detectedC4
        });
        
        // 新しい音声検出ロジック（80-400Hz、音量20%以上）
        if (isAudioTesting && isFreqInRange && isVolumeOK) {
            if (!detectedC4) {
                detectedC4 = true;
                updateProgressDisplay('声を検出しました！', `${result.frequency.toFixed(1)}Hz - 安定した音声を検出中`);
                
                // 成功メッセージを早めに表示
                const detectionSuccess = document.getElementById('detection-success');
                if (detectionSuccess) {
                    detectionSuccess.style.display = 'flex';
                }
                
                setTimeout(() => {
                    if (isAudioTesting) {
                        completeAudioTest();
                    }
                }, 2000);
            }
        }
        
        // 音域テスト処理（グローバル変数経由）
        if (window.isVoiceRangeTesting && window.voiceRangeTestData) {
            console.log('🎯 音域テスト処理実行中:', {
                frequency: result.frequency,
                volume: result.volume,
                phase: window.voiceRangeTestData.phase,
                testDataComplete: !!window.voiceRangeTestData.measurementStartTime,
                detectedFreqsCount: window.voiceRangeTestData.detectedFrequencies?.length || 0
            });
            
            const testData = window.voiceRangeTestData;
            
            if (!testData.measurementStartTime) {
                testData.measurementStartTime = Date.now();
                updateProgressDisplay('測定中...', '3秒間継続して発声してください');
                if (testData.startCountdown) {
                    testData.startCountdown();
                }
            }
            
            const currentTime = Date.now();
            const elapsed = currentTime - testData.measurementStartTime;
            
            // 有効な周波数データを記録
            if (result.frequency > 0 && result.volume > 0.01 && result.clarity > 0.5) {
                testData.detectedFrequencies.push({
                    frequency: result.frequency,
                    time: elapsed,
                    volume: result.volume,
                    clarity: result.clarity
                });
                
                console.log('📊 音域テストデータ記録:', {
                    frequency: result.frequency.toFixed(1) + 'Hz',
                    elapsed: elapsed + 'ms',
                    totalSamples: testData.detectedFrequencies.length
                });
            }
            
            // 3秒経過で測定完了
            if (elapsed >= 3000) {
                window.isVoiceRangeTesting = false;
                testData.completePhaseMeasurement(testData.phase, testData.detectedFrequencies);
            }
        }
    }
}

// 音量更新ハンドラー（デバイス別最適化対応）
function handleVolumeUpdate(volume, volumeScale = null) {
    // 詳細デバッグログ
    console.log('📊 handleVolumeUpdate呼び出し:', {
        volume: volume,
        volumeScale: volumeScale,
        deviceSpecs: deviceSpecs?.volumeBarScale,
        timestamp: new Date().toLocaleTimeString()
    });
    
    // ボリュームレベルバー更新
    const volumeProgress = document.getElementById('volume-progress');
    if (volumeProgress) {
        // デバイス別音量バースケール適用
        const scale = volumeScale || deviceSpecs.volumeBarScale;
        const adjustedVolume = volume * scale;
        
        // volume値を0-100%に変換
        const volumePercent = Math.min(100, Math.max(0, adjustedVolume * 100));
        volumeProgress.style.width = volumePercent + '%';
        
        // グローバル変数に保存（音声テストで使用）
        window.lastVolumePercent = volumePercent;
        
        // 詳細ログ出力
        console.log('🎚️ 音量バー更新:', {
            rawVolume: volume,
            scale: scale,
            adjustedVolume: adjustedVolume,
            volumePercent: volumePercent,
            elementFound: !!volumeProgress
        });
        
        // デバッグ用ログ（デバイス最適化情報含む）
        if (scale !== 1.0) {
            console.log(`📊 Volume update [${deviceSpecs.deviceType}]:`, 
                `${volume.toFixed(3)} × ${scale}x = ${adjustedVolume.toFixed(3)} → ${volumePercent.toFixed(1)}%`);
        } else {
            console.log('📊 Volume update:', volume, '→', volumePercent + '%');
        }
    }
}

// オーディオエラーハンドラー
function handleAudioError(context, error) {
    console.error(`Audio Error [${context}]:`, error);
    detectionActive = false;
    
    const requestMicBtn = document.getElementById('request-mic-btn');
    requestMicBtn.disabled = false;
    requestMicBtn.innerHTML = '<i data-lucide="alert-circle" style="width: 24px; height: 24px;"></i><span>エラー - 再試行</span>';
    lucide.createIcons();
    
    alert(`オーディオエラー: ${error.message}\nページを更新して再試行してください。`);
}

// UI進捗表示更新（音程検出プログレス）
function updateDetectionProgress(detectionCount, elapsedTime, timeConditionMet, countConditionMet) {
    console.log('📱 updateDetectionProgress呼び出し:', {
        detectionCount, elapsedTime, timeConditionMet, countConditionMet
    });
    
    const voiceInstructionText = document.getElementById('voice-instruction-text');
    console.log('🎯 voice-instruction-text要素:', voiceInstructionText);
    
    if (!voiceInstructionText) {
        console.error('❌ voice-instruction-text要素が見つかりません！');
        return;
    }
    
    const timeProgress = Math.min(100, (elapsedTime / MIN_DETECTION_TIME) * 100);
    const countProgress = Math.min(100, (detectionCount / MIN_PITCH_DETECTIONS) * 100);
    
    let newText = '';
    
    if (timeConditionMet && countConditionMet) {
        newText = '✅ 検出完了！まもなく次のステップへ...';
    } else {
        const timeRemaining = Math.max(0, Math.ceil((MIN_DETECTION_TIME - elapsedTime) / 1000));
        const countRemaining = Math.max(0, MIN_PITCH_DETECTIONS - detectionCount);
        
        if (!timeConditionMet && !countConditionMet) {
            newText = `「ド」を継続 (${timeRemaining}秒, ${countRemaining}回検出必要)`;
        } else if (!timeConditionMet) {
            newText = `「ド」を継続 (あと${timeRemaining}秒)`;
        } else if (!countConditionMet) {
            newText = `「ド」を継続 (あと${countRemaining}回検出必要)`;
        }
    }
    
    console.log('📝 テキスト更新:', {
        oldText: voiceInstructionText.textContent,
        newText: newText
    });
    
    voiceInstructionText.textContent = newText;
    
    // 視覚的に目立たせるため、色も変更
    if (timeConditionMet && countConditionMet) {
        voiceInstructionText.style.color = '#22c55e'; // 緑色
    } else {
        voiceInstructionText.style.color = '#f59e0b'; // オレンジ色
    }
    
    // 専用進捗表示エリアも更新
    const progressText = document.getElementById('progress-text');
    const progressDetail = document.getElementById('progress-detail');
    
    if (progressText) {
        progressText.textContent = newText;
        progressText.style.color = timeConditionMet && countConditionMet ? '#22c55e' : '#ffffff';
        console.log('📊 progress-text更新完了:', newText);
    }
    
    if (progressDetail) {
        const timeRemaining = Math.max(0, Math.ceil((MIN_DETECTION_TIME - elapsedTime) / 1000));
        const countRemaining = Math.max(0, MIN_PITCH_DETECTIONS - detectionCount);
        const timePercent = Math.min(100, Math.round((elapsedTime / MIN_DETECTION_TIME) * 100));
        const countPercent = Math.min(100, Math.round((detectionCount / MIN_PITCH_DETECTIONS) * 100));
        
        progressDetail.textContent = `時間: ${timePercent}% (${timeRemaining}秒残り) | 回数: ${countPercent}% (${countRemaining}回残り)`;
        console.log('📊 progress-detail更新完了:', progressDetail.textContent);
    }
}

// 音声テスト完了チェック
function checkAudioTestComplete() {
    if (!isAudioTesting) return;
    
    if (detectedC4) {
        completeAudioTest();
    } else {
        // 時間切れ - 再試行を促す
        updateProgressDisplay('時間切れ', '80-400Hzの声で2秒間継続してください');
        audioTestStartTime = Date.now(); // タイマーリセット
        setTimeout(checkAudioTestComplete, audioTestDuration);
    }
}

// 音声テスト完了
function completeAudioTest() {
    isAudioTesting = false;
    
    // 音声検出停止
    if (audioProcessor) {
        audioProcessor.stopDetection();
        console.log('🎵 AudioProcessor停止完了');
    }
    
    // 音量バーリセット
    const volumeProgress = document.getElementById('volume-progress');
    const volumeValue = document.getElementById('volume-value');
    const frequencyValue = document.getElementById('frequency-value');
    
    if (volumeProgress) {
        volumeProgress.style.width = '0%';
    }
    if (volumeValue) {
        volumeValue.textContent = '0%';
    }
    if (frequencyValue) {
        frequencyValue.textContent = '0 Hz';
    }
    
    console.log('✅ 音声テスト完了');
    
    // 成功メッセージ表示
    const detectionSuccess = document.getElementById('detection-success');
    if (detectionSuccess) {
        detectionSuccess.style.display = 'flex';
    }
    
    // 進捗表示を隠す
    const progressDisplay = document.getElementById('progress-display');
    if (progressDisplay) {
        progressDisplay.style.display = 'none';
    }
    
    // 音域テストボタン表示
    const startRangeTestBtn = document.getElementById('start-range-test-btn');
    if (startRangeTestBtn) {
        startRangeTestBtn.classList.remove('hidden');
    }
    
    updateStepStatus(2, 'completed');
}

// 検出成功表示
function showDetectionSuccess() {
    console.log('🎉 showDetectionSuccess実行開始');
    
    detectionActive = false;
    audioProcessor.stopDetection();
    console.log('🛑 音程検出停止完了');
    
    // VolumeBarController統合システムで音量バーリセット
    if (volumeBarController) {
        console.log('🎚️ VolumeBarController.stop()でリセット実行');
        volumeBarController.stop(); // 統一されたリセット・停止処理
    } else {
        console.log('⚠️ VolumeBarControllerが利用不可のため手動リセット実行');
        // フォールバック: 手動リセット（VolumeBarController初期化失敗時）
        const volumeProgress = document.getElementById('volume-progress');
        const volumeValue = document.getElementById('volume-value');
        if (volumeProgress) {
            volumeProgress.style.transition = 'none';
            volumeProgress.style.width = '0%';
            volumeProgress.style.opacity = '0.3';
            setTimeout(() => {
                if (volumeProgress) {
                    volumeProgress.style.transition = 'width 0.5s ease';
                }
            }, 200);
        }
        if (volumeValue) {
            volumeValue.textContent = '0%';
        }
    }
    
    // 進捗表示エリアを非表示
    const progressDisplay = document.getElementById('progress-display');
    if (progressDisplay) {
        progressDisplay.style.display = 'none';
        console.log('📊 進捗表示エリアを非表示にしました');
    }
    
    const detectionSuccess = document.getElementById('detection-success');
    const startRangeBtn = document.getElementById('start-range-test-btn');
    const rangeSavedDisplay = document.getElementById('range-saved-display');
    
    console.log('📋 要素取得確認:', {
        detectionSuccess: !!detectionSuccess,
        startRangeBtn: !!startRangeBtn,
        rangeSavedDisplay: !!rangeSavedDisplay
    });
    
    if (detectionSuccess) {
        // 音声指示セクションを即座に非表示
        const voiceInstruction = document.querySelector('.voice-instruction');
        if (voiceInstruction) {
            // 即座に強制非表示（アニメーション問題を完全に回避）
            voiceInstruction.style.display = 'none';
            voiceInstruction.classList.add('hidden');
            voiceInstruction.classList.add('collapse-out');
            console.log('✅ voice-instruction セクションを強制非表示');
        }
        
        // アニメーション無効化（音量バー競合回避）
        // detectionSuccess.classList.remove('hidden'); // 既に表示済み
        // detectionSuccess.classList.add('fade-in-up'); // アニメーション無効化
        console.log('✅ detection-success セクション（アニメーション無効化済み）');
        
        // 既存の音域データをチェック
        const voiceRangeData = DataManager.getVoiceRangeData();
        const successMessage = document.getElementById('detection-success-message');
        
        if (voiceRangeData && rangeSavedDisplay) {
            // 既存データ表示
            if (successMessage) {
                successMessage.textContent = '「ド」の音程を検出できました！音域は設定済みです。';
            }
            displaySavedRangeData(voiceRangeData.results, rangeSavedDisplay);
        } else {
            // 新規音域テストが必要
            if (successMessage) {
                successMessage.textContent = '「ド」の音程を検出できました！音域テストに進みましょう。';
            }
            
            if (startRangeBtn) {
                setTimeout(() => {
                    startRangeBtn.classList.remove('hidden');
                    // startRangeBtn.classList.add('fade-in-up'); // アニメーション無効化
                }, 500);
            }
        }
    }
}

// 周波数から音名変換
function frequencyToNote(frequency) {
    const A4_FREQ = 440.0;
    const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    
    const semitones = Math.round(12 * Math.log2(frequency / A4_FREQ));
    const octave = Math.floor((semitones + 9) / 12) + 4;
    const noteIndex = (semitones + 9 + 120) % 12; // 負数対応
    
    return `${noteNames[noteIndex]}${octave}`;
}

// 音量シミュレーション（削除予定）
function startVolumeSimulation() {
    console.log('音量シミュレーション開始');
    
    const volumeProgress = document.getElementById('volume-progress');
    const volumeValue = document.getElementById('volume-value');
    const frequencyValue = document.getElementById('frequency-value');
    const detectionSuccess = document.getElementById('detection-success');
    const startRangeBtn = document.getElementById('start-range-test-btn');
    const rangeSavedDisplay = document.getElementById('range-saved-display');
    
    // 要素の存在確認
    if (!volumeProgress || !volumeValue || !frequencyValue) {
        console.error('必要な要素が見つかりません');
        return;
    }
    
    let detectionCount = 0;

    const interval = setInterval(() => {
        const volume = Math.floor(Math.random() * 30) + 50; // 50-80%
        // C4（ド）付近の周波数をシミュレート（261.6Hz前後）
        const frequency = (Math.random() * 20 + 251.6).toFixed(1); // 251.6-271.6Hz
        
        volumeProgress.style.width = volume + '%';
        volumeValue.textContent = volume + '%';
        
        // 周波数に音名を追加
        const isC4 = (frequency >= 255 && frequency <= 268);
        const note = isC4 ? ' (C4)' : ' (近似)';
        frequencyValue.textContent = frequency + ' Hz' + note;
        
        console.log(`周波数: ${frequency} Hz, C4判定: ${isC4}, カウント: ${detectionCount}`);
        
        // C4を検出したらカウント
        if (isC4) {
            detectionCount++;
            
            // 3回C4を検出したら成功と判定
            if (detectionCount >= 3) {
                console.log('検出成功！メッセージとボタンを表示');
                
                if (detectionSuccess && detectionSuccess.classList.contains('hidden')) {
                    // 成功メッセージとボタンを即座に表示（アニメーション無効化）
                    detectionSuccess.classList.remove('hidden');
                    // detectionSuccess.classList.add('fade-in-up'); // アニメーション無効化
                    
                    // 音域データをチェック（改善版 - DataManager使用）
                    console.log('🔍 音域データ存在チェック:', {
                        hasExistingRangeData: window.hasExistingRangeData,
                        existingRangeData: window.existingRangeData
                    });
                    
                    const successMessage = document.getElementById('detection-success-message');
                    
                    if (window.hasExistingRangeData && window.existingRangeData && rangeSavedDisplay) {
                        // 音域データが存在する場合（スキップ表示）
                        const data = window.existingRangeData;
                        const rangeDisplay = `${data.lowestNote} - ${data.highestNote}`;
                        
                        if (successMessage) {
                            successMessage.textContent = `「ド」の音程を検出できました！音域は設定済みです（${rangeDisplay}）。`;
                        }
                        
                        // 保存データを表示する共通関数を呼び出し
                        displaySavedRangeData(data, rangeSavedDisplay);
                        console.log('✅ 音域データ表示完了 - スキップオプション表示');
                        
                    } else {
                        // 新規音域テストが必要
                        console.log('📋 新規音域テスト準備');
                        if (successMessage) {
                            successMessage.textContent = '「ド」の音程を検出できました！音域テストに進みましょう。';
                        }
                        
                        if (startRangeTestBtn) {
                            setTimeout(() => {
                                startRangeTestBtn.classList.remove('hidden');
                                console.log('🎯 音域テストボタンを表示');
                            }, 200);
                        }
                    }
                    
                    // 音声指示セクションを高さ縮小で非表示
                    const voiceInstruction = document.querySelector('.voice-instruction');
                    if (voiceInstruction) {
                        voiceInstruction.classList.add('collapse-out');
                        // アニメーション完了後に非表示
                        setTimeout(() => {
                            voiceInstruction.classList.add('hidden');
                        }, 1000);
                    }
                    
                    // インターバルを停止
                    clearInterval(interval);
                }
            }
        }
    }, 800);
}

// 音域テスト実装（実際のオーディオ検出）
function startRangeTest() {
    console.log('🎵 音域テスト開始 - シンプル3秒測定版');
    
    // 音量バーリセット（VolumeBarController.stop()は使わずに手動リセット）
    console.log('🎚️ 音域テスト開始時の音量バー手動リセット');
    const volumeProgress = document.getElementById('volume-progress');
    const volumeValue = document.getElementById('volume-value');
    if (volumeProgress) {
        volumeProgress.style.width = '0%';
        volumeProgress.style.opacity = '1.0';
    }
    if (volumeValue) {
        volumeValue.textContent = '0%';
    }
    
    // VolumeBarController.stop()は呼ばない（コールバックを破壊する可能性があるため）
    if (false) { // 無効化
        console.log('⚠️ VolumeBarControllerが利用不可のため手動リセット実行（音域テスト開始時）');
        // フォールバック: 手動リセット（VolumeBarController初期化失敗時）
        const volumeProgress = document.getElementById('volume-progress');
        const volumeValue = document.getElementById('volume-value');
        if (volumeProgress) {
            volumeProgress.style.width = '0%';
            volumeProgress.style.opacity = '1.0'; // 透明度を通常に戻す
        }
        if (volumeValue) {
            volumeValue.textContent = '0%';
        }
    }
    
    // UI要素の取得
    const testInstructionText = document.getElementById('test-instruction-text');
    const testStatus = document.getElementById('test-status');
    
    // 音域テスト状態管理
    let currentPhase = 'low'; // 'low' or 'high'
    let testResults = {
        lowestNote: null,
        lowestFrequency: null,
        highestNote: null,
        highestFrequency: null
    };
    
    // 安定性検出用
    let stableFrequencies = [];
    let stabilityStartTime = null;
    let detectionInterval = null;
    
    // 音名とHzのマッピング
    const noteMapping = [
        { note: 'C2', frequency: 65.4 },
        { note: 'C#2', frequency: 69.3 },
        { note: 'D2', frequency: 73.4 },
        { note: 'D#2', frequency: 77.8 },
        { note: 'E2', frequency: 82.4 },
        { note: 'F2', frequency: 87.3 },
        { note: 'F#2', frequency: 92.5 },
        { note: 'G2', frequency: 98.0 },
        { note: 'G#2', frequency: 103.8 },
        { note: 'A2', frequency: 110.0 },
        { note: 'A#2', frequency: 116.5 },
        { note: 'B2', frequency: 123.5 },
        { note: 'C3', frequency: 130.8 },
        { note: 'C#3', frequency: 138.6 },
        { note: 'D3', frequency: 146.8 },
        { note: 'D#3', frequency: 155.6 },
        { note: 'E3', frequency: 164.8 },
        { note: 'F3', frequency: 174.6 },
        { note: 'F#3', frequency: 185.0 },
        { note: 'G3', frequency: 196.0 },
        { note: 'G#3', frequency: 207.7 },
        { note: 'A3', frequency: 220.0 },
        { note: 'A#3', frequency: 233.1 },
        { note: 'B3', frequency: 246.9 },
        { note: 'C4', frequency: 261.6 },
        { note: 'C#4', frequency: 277.2 },
        { note: 'D4', frequency: 293.7 },
        { note: 'D#4', frequency: 311.1 },
        { note: 'E4', frequency: 329.6 },
        { note: 'F4', frequency: 349.2 },
        { note: 'F#4', frequency: 370.0 },
        { note: 'G4', frequency: 392.0 },
        { note: 'G#4', frequency: 415.3 },
        { note: 'A4', frequency: 440.0 },
        { note: 'A#4', frequency: 466.2 },
        { note: 'B4', frequency: 493.9 },
        { note: 'C5', frequency: 523.3 },
        { note: 'C#5', frequency: 554.4 },
        { note: 'D5', frequency: 587.3 },
        { note: 'D#5', frequency: 622.3 },
        { note: 'E5', frequency: 659.3 },
        { note: 'F5', frequency: 698.5 },
        { note: 'F#5', frequency: 740.0 },
        { note: 'G5', frequency: 784.0 },
        { note: 'G#5', frequency: 830.6 },
        { note: 'A5', frequency: 880.0 }
    ];
    
    // 周波数から音名を取得
    function getClosestNote(frequency) {
        let closestNote = noteMapping[0];
        let minDifference = Math.abs(frequency - closestNote.frequency);
        
        for (const note of noteMapping) {
            const difference = Math.abs(frequency - note.frequency);
            if (difference < minDifference) {
                minDifference = difference;
                closestNote = note;
            }
        }
        
        return closestNote;
    }
    
    // 円形プログレスバーリセット関数
    function resetCircularProgress() {
        const stabilitySvg = document.getElementById('stability-ring');
        const progressCircle = stabilitySvg ? stabilitySvg.querySelector('.voice-progress-circle') : null;
        
        if (progressCircle) {
            progressCircle.style.strokeDashoffset = '452';
            progressCircle.style.transition = 'stroke-dashoffset 0.3s ease';
        }
        if (stabilitySvg) {
            stabilitySvg.classList.remove('completed');
        }
        
        console.log('🔄 円形プログレスバーリセット完了');
    }
    
    // 音域テスト完了時のエフェクト
    function showRangeTestComplete(phase, note, frequency) {
        const rangeIcon = document.getElementById('range-icon');
        const countdownDisplay = document.getElementById('countdown-display');
        const voiceNoteBadge = document.querySelector('.voice-note-badge');
        const stabilitySvg = document.getElementById('stability-ring');
        
        console.log(`✅ ${phase}音域テスト完了:`, { note: note.note, frequency: frequency.toFixed(1) + 'Hz' });
        
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
    
    // シンプル3秒測定システム
    function startSimpleRangeTest() {
        console.log('🎯 シンプル音域テスト開始');
        
        // 音域テスト状態管理
        let currentPhase = 'low'; // 'low' or 'high'
        let testResults = {
            lowestNote: null,
            lowestFrequency: null,
            highestNote: null,
            highestFrequency: null
        };
        
        // 低音テスト開始
        startPhaseTest('low');
        
        function startPhaseTest(phase) {
            console.log(`🎤 ${phase}音テスト開始 - 3秒継続測定`);
            currentPhase = phase;
            
            // UI更新
            updateTestUI(phase);
            
            // 3秒継続測定開始
            measureForThreeSeconds(phase);
        }
        
        function updateTestUI(phase) {
            const rangeIcon = document.getElementById('range-icon');
            const countdownDisplay = document.getElementById('countdown-display');
            
            if (rangeIcon) {
                rangeIcon.setAttribute('data-lucide', phase === 'low' ? 'arrow-down' : 'arrow-up');
                rangeIcon.style.display = 'block';
                rangeIcon.style.color = 'white';
                lucide.createIcons();
            }
            if (countdownDisplay) {
                countdownDisplay.style.display = 'none';
            }
            
            testInstructionText.textContent = '音域を測定します';
            testStatus.textContent = `できるだけ${phase === 'low' ? '低い' : '高い'}声で「あー」を３秒間発声してください`;
        }
        
        function measureForThreeSeconds(phase) {
            const measurementDuration = 3000;
            let measurementStartTime = null;
            let detectedFrequencies = [];
            let countdownInterval = null;
            
            console.log(`📊 ${phase}音3秒測定開始`);
            
            // 音声検出コールバック設定
            console.log('🔍 audioProcessor状態確認:', {
                hasAudioProcessor: !!audioProcessor,
                processorType: audioProcessor?.constructor?.name
            });
            
            if (audioProcessor) {
                // 音域テスト用フラグ設定
                window.isVoiceRangeTesting = true;
                window.voiceRangeTestData = {
                    phase: phase,
                    measurementStartTime: null, // コールバック内で設定される
                    detectedFrequencies: detectedFrequencies,
                    completePhaseMeasurement: completePhaseMeasurement,
                    startCountdown: startCountdown
                };
                
                console.log('✅ 音域テストフラグ設定完了:', {
                    isVoiceRangeTesting: window.isVoiceRangeTesting,
                    testDataPhase: window.voiceRangeTestData.phase,
                    timestamp: new Date().toLocaleTimeString()
                });
                
                console.log('🎯 音域テスト用グローバル変数設定完了 - 既存コールバックシステムを利用');
                
                // コールバック確認
                console.log('🔍 コールバック状況確認:', {
                    hasCallbacks: !!audioProcessor.callbacks,
                    callbackKeys: audioProcessor.callbacks ? Object.keys(audioProcessor.callbacks) : 'none',
                    onPitchUpdateType: typeof audioProcessor.callbacks?.onPitchUpdate,
                    onVolumeUpdateType: typeof audioProcessor.callbacks?.onVolumeUpdate
                });
                
                // 🔧 重要: 音域テスト用にコールバック再設定
                console.log('🔄 音域テスト用コールバック再設定中...');
                audioProcessor.setCallbacks({
                    onPitchUpdate: (result) => {
                        console.log('🎵 音域テスト専用コールバック受信:', {
                            result: result,
                            volume: result?.volume,
                            volumeType: typeof result?.volume,
                            frequency: result?.frequency,
                            clarity: result?.clarity,
                            detectionActive: detectionActive,
                            timestamp: new Date().toLocaleTimeString()
                        });
                        
                        if (!detectionActive) {
                            console.log('⏸️ 検出停止中のため音量バー更新をスキップ');
                            return;
                        }
                        
                        // リアルタイム音程処理
                        handleRealPitchUpdate(result);
                        
                        // VolumeBarController統合システムで音量バー更新
                        if (result && typeof result.volume === 'number' && volumeBarController) {
                            volumeBarController.handlePitchUpdate(result);
                        }
                    },
                    onVolumeUpdate: (volumePercent) => {
                        console.log('🔊 onVolumeUpdate（分離方式）受信:', volumePercent);
                        handleVolumeUpdate(volumePercent);
                    }
                });
                console.log('✅ 音域テスト用コールバック設定完了');
                
                // 音声検出開始（既存システムを利用）
                const startResult = audioProcessor.startDetection();
                console.log('🎤 音声検出開始結果:', startResult);
            } else {
                console.error('❌ audioProcessorが初期化されていません');
            }
            
            function startCountdown() {
                const rangeIcon = document.getElementById('range-icon');
                const countdownDisplay = document.getElementById('countdown-display');
                let second = 0;
                
                countdownInterval = setInterval(() => {
                    second++;
                    if (second <= 3) {
                        if (rangeIcon) rangeIcon.style.display = 'none';
                        if (countdownDisplay) {
                            countdownDisplay.textContent = second;
                            countdownDisplay.style.display = 'block';
                        }
                    }
                    if (second >= 3) {
                        clearInterval(countdownInterval);
                    }
                }, 1000);
            }
        }
        
        function completePhaseMeasurement(phase, frequencies) {
            console.log(`✅ ${phase}音測定完了:`, frequencies.length + '個のデータ取得');
            
            // 音声検出停止
            if (audioProcessor) {
                audioProcessor.stopDetection();
            }
            
            // 結果算出
            const result = calculatePhaseResult(phase, frequencies);
            
            if (result.success) {
                // 成功表示
                showPhaseComplete(phase, result);
                
                // 結果保存
                if (phase === 'low') {
                    testResults.lowestNote = result.note;
                    testResults.lowestFrequency = result.frequency;
                    
                    // 高音テストへ
                    setTimeout(() => {
                        startPhaseTest('high');
                    }, 3000);
                } else {
                    testResults.highestNote = result.note;
                    testResults.highestFrequency = result.frequency;
                    
                    // 全体完了
                    setTimeout(() => {
                        completeAllTests();
                    }, 2000);
                }
            } else {
                // 失敗 - 再測定
                showPhaseFailed(phase);
                setTimeout(() => {
                    startPhaseTest(phase);
                }, 2000);
            }
        }
        
        function calculatePhaseResult(phase, frequencies) {
            if (frequencies.length === 0) {
                return { success: false, error: '音声が検出されませんでした' };
            }
            
            // 有効な周波数の平均算出
            const validFrequencies = frequencies
                .filter(f => f.volume > 0.01 && f.clarity > 0.5)
                .map(f => f.frequency);
                
            if (validFrequencies.length < 10) {
                return { success: false, error: '安定した音声が不足です' };
            }
            
            const averageFreq = validFrequencies.reduce((a, b) => a + b, 0) / validFrequencies.length;
            const closestNote = findClosestNote(averageFreq);
            
            console.log(`📈 ${phase}音結果:`, {
                frequency: averageFreq.toFixed(1) + 'Hz',
                note: closestNote.note,
                samples: validFrequencies.length
            });
            
            return {
                success: true,
                frequency: averageFreq,
                note: closestNote.note,
                samples: validFrequencies.length
            };
        }
        
        function showPhaseComplete(phase, result) {
            const rangeIcon = document.getElementById('range-icon');
            
            if (rangeIcon) {
                rangeIcon.setAttribute('data-lucide', 'check');
                rangeIcon.style.color = '#22c55e';
                rangeIcon.style.display = 'block';
                lucide.createIcons();
            }
            
            updateProgressDisplay(
                `${phase === 'low' ? '低音' : '高音'}測定完了`,
                `${result.note} (${result.frequency.toFixed(1)}Hz)`
            );
        }
        
        function showPhaseFailed(phase) {
            updateProgressDisplay(
                '測定失敗',
                'もう一度、大きな声でお試しください'
            );
        }
        
        function completeAllTests() {
            console.log('🎉 音域テスト完全完了:', testResults);
            
            // データ保存
            const rangeData = {
                lowestNote: testResults.lowestNote,
                lowestFrequency: testResults.lowestFrequency,
                highestNote: testResults.highestNote,
                highestFrequency: testResults.highestFrequency,
                testDate: Date.now(),
                success: true
            };
            
            localStorage.setItem('voiceRangeData', JSON.stringify(rangeData));
            
            // 結果表示画面へ
            updateStepStatus(3, 'completed');
            showSection(resultSection);
            displayVoiceRangeResults(rangeData);
        }
        
        function displayVoiceRangeResults(data) {
            const lowestNote = document.getElementById('lowest-note');
            const highestNote = document.getElementById('highest-note');
            const octaveRange = document.getElementById('octave-range');
            
            if (lowestNote) lowestNote.textContent = data.lowestNote;
            if (highestNote) highestNote.textContent = data.highestNote;
            if (octaveRange) {
                const octaves = Math.log2(data.highestFrequency / data.lowestFrequency);
                octaveRange.textContent = octaves.toFixed(1) + 'オクターブ';
            }
        }
    }
    
    // 音名検索関数
    function findClosestNote(frequency) {
        let closest = noteMapping[0];
        let minDiff = Math.abs(frequency - closest.frequency);
        
        for (let i = 1; i < noteMapping.length; i++) {
            const diff = Math.abs(frequency - noteMapping[i].frequency);
            if (diff < minDiff) {
                minDiff = diff;
                closest = noteMapping[i];
            }
        }
        
        return closest;
    }
    
    // テスト開始
    startSimpleRangeTest();
    
    // 以下は古い実装（削除予定）
    function startLowRangeTest() {
        console.log('🔊 低音域テスト開始');
        currentPhase = 'low';
        stableFrequencies = [];
        stabilityStartTime = null;
        
        // アイコンとカウントダウン設定
        const rangeIcon = document.getElementById('range-icon');
        const countdownDisplay = document.getElementById('countdown-display');
        const voiceNoteBadge = document.querySelector('.voice-note-badge');
        
        if (rangeIcon) {
            rangeIcon.setAttribute('data-lucide', 'arrow-down');
            rangeIcon.style.display = 'block';
            rangeIcon.style.color = 'white';  // 白色に変更
            lucide.createIcons();
        }
        if (countdownDisplay) {
            countdownDisplay.style.display = 'none';
        }
        
        // 測定中エフェクト追加
        const testInstruction = document.querySelector('.test-instruction');
        if (voiceNoteBadge) {
            voiceNoteBadge.classList.add('measuring');
        }
        if (testInstruction) {
            testInstruction.classList.add('measuring');
        }
        
        // 円形プログレスバーリセット
        resetCircularProgress();
        
        // 3秒間のインターバルを追加
        testInstructionText.textContent = 'できるだけ低い声を出し３秒間キープしてください';
        testStatus.textContent = '3秒後に測定を開始します...';
        
        setTimeout(() => {
            testStatus.textContent = '待機中...';
            console.log('⏰ 3秒インターバル完了 - 音声検出待機開始');
            startContinuousDetection();
        }, 3000);
    }
    
    function startHighRangeTest() {
        console.log('🔊 高音域テスト開始');
        currentPhase = 'high';
        stableFrequencies = [];
        stabilityStartTime = null;
        
        // 高音テスト用にターゲット周波数リセット
        window.simulationTargetFreq = null;
        
        // アイコンとカウントダウン設定
        const rangeIcon = document.getElementById('range-icon');
        const countdownDisplay = document.getElementById('countdown-display');
        const voiceNoteBadge = document.querySelector('.voice-note-badge');
        
        if (rangeIcon) {
            rangeIcon.setAttribute('data-lucide', 'arrow-up');
            rangeIcon.style.display = 'block';
            rangeIcon.style.color = 'white';  // 白色に変更
            lucide.createIcons();
        }
        if (countdownDisplay) {
            countdownDisplay.style.display = 'none';
        }
        
        // 測定中エフェクト追加
        const testInstruction = document.querySelector('.test-instruction');
        if (testInstruction) {
            testInstruction.classList.add('measuring');
        }
        if (voiceNoteBadge) {
            voiceNoteBadge.classList.add('measuring');
        }
        
        // 円形プログレスバーリセット
        resetCircularProgress();
        
        // 3秒間のインターバルを追加
        testInstructionText.textContent = 'できるだけ高い声を出し３秒間キープしてください';
        testStatus.textContent = '3秒後に測定を開始します...';
        
        setTimeout(() => {
            testStatus.textContent = '待機中...';
            console.log('⏰ 3秒インターバル完了 - 音声検出待機開始');
            startContinuousDetection();
        }, 3000);
    }
    
    function startContinuousDetection() {
        const stabilitySvg = document.getElementById('stability-ring');
        const progressCircle = stabilitySvg ? stabilitySvg.querySelector('.voice-progress-circle') : null;
        const testStatus = document.getElementById('test-status');
        
        // 音声検出開始フラグ
        let voiceDetectionStarted = false;
        
        // 実際のオーディオ検出開始
        detectionActive = true;
        audioProcessor.startDetection();
        
        // VolumeBarController再開（音域テスト用）
        if (volumeBarController) {
            console.log('🎚️ VolumeBarController再開（音域テスト継続用）');
            try {
                // startメソッドを使って適切に再開
                volumeBarController.start();
                console.log('✅ VolumeBarController再開成功');
            } catch (error) {
                console.warn('⚠️ VolumeBarController再開エラー:', error);
                // フォールバック: 状態管理を直接更新
                volumeBarController.isActive = true;
                volumeBarController.startUpdateLoop();
            }
        }
        
        detectionInterval = setInterval(() => {
            // 実際の音程検出結果を使用（音量閾値も追加してノイズ除外）
            if (window.lastDetectedFrequency && window.lastDetectedFrequency > 0 && 
                window.lastDetectedClarity > 0.6 && window.lastDetectedVolume > 0.02) {  // 音量閾値を2%に設定
                const detectedHz = window.lastDetectedFrequency;
                
                // 初回音声検出時の処理
                if (!voiceDetectionStarted) {
                    voiceDetectionStarted = true;
                    console.log('🎤 ユーザーの声を検出 - 測定開始（音量:', (window.lastDetectedVolume * 100).toFixed(1), '%）');
                    if (testStatus) {
                        testStatus.textContent = '測定中...';
                    }
                }
                
                // 音名取得
                const closestNote = getClosestNote(detectedHz);
            
                // 安定性チェック（±8Hz以内で安定と判定） - 音声検出開始後のみ
                if (voiceDetectionStarted && (stableFrequencies.length === 0 || Math.abs(detectedHz - stableFrequencies[stableFrequencies.length - 1]) <= 8)) {
                stableFrequencies.push(detectedHz);
                
                // 安定性開始時刻記録
                if (stabilityStartTime === null) {
                    stabilityStartTime = Date.now();
                    console.log('⏱️ 安定性測定開始 - 3秒カウント開始');
                }
                
                // 3秒間安定性チェック
                const stabilityDuration = Date.now() - stabilityStartTime;
                const stabilityPercent = Math.min(100, (stabilityDuration / 3000) * 100);
                
                // カウントアップ表示（1, 2, 3）
                const countdownDisplay = document.getElementById('countdown-display');
                const rangeIcon = document.getElementById('range-icon');
                const elapsedTime = Math.floor(stabilityDuration / 1000);
                
                if (countdownDisplay && rangeIcon) {
                    // 音声検出中：アイコン非表示、数字表示
                    rangeIcon.style.display = 'none';
                    countdownDisplay.style.display = 'block';
                    countdownDisplay.textContent = Math.min(elapsedTime + 1, 3); // 1, 2, 3でカウントアップ
                }
                
                // 円形プログレスバー更新（SVG stroke-dashoffsetで表現） - 音声検出開始後のみ
                if (progressCircle) {
                    const circumference = 452; // 2π × 72 = 452
                    const offset = circumference - (circumference * stabilityPercent / 100);
                    progressCircle.style.strokeDashoffset = offset;
                }
                
                
                // 3秒達成
                if (stabilityDuration >= 3000) {
                    clearInterval(detectionInterval);
                    
                    // 測定中エフェクト停止
                    const testInstruction = document.querySelector('.test-instruction');
                    if (testInstruction) {
                        testInstruction.classList.remove('measuring');
                    }
                    
                    // 安定した周波数の平均を計算
                    const averageFreq = stableFrequencies.slice(-30).reduce((sum, freq) => sum + freq, 0) / Math.min(30, stableFrequencies.length);
                    const finalNote = getClosestNote(averageFreq);
                    
                    // 完了エフェクト表示
                    showRangeTestComplete(currentPhase, finalNote, averageFreq);
                    
                    setTimeout(() => {
                        recordRangeResult(finalNote, averageFreq);
                    }, 1000);
                }
                
            } else {
                // 安定性リセット（音が途絶えた）
                stableFrequencies = [detectedHz];
                stabilityStartTime = Date.now();
                
                // リセット時にメッセージ更新
                if (testStatus) {
                    testStatus.textContent = 'リセットされました - 測定中...';
                    setTimeout(() => {
                        testStatus.textContent = '測定中...';
                    }, 1500);
                }
                
                // 音が途絶えた：数字非表示、アイコン表示
                const countdownDisplay = document.getElementById('countdown-display');
                const rangeIcon = document.getElementById('range-icon');
                if (countdownDisplay && rangeIcon) {
                    countdownDisplay.style.display = 'none';
                    rangeIcon.style.display = 'block';
                }
                
                // 円形プログレスバーリセット（アニメーション付き）
                if (progressCircle) {
                    progressCircle.style.transition = 'stroke-dashoffset 0.3s ease-out';
                    progressCircle.style.strokeDashoffset = '452';
                    
                    // 少し遅れて通常のtransitionに戻す
                    setTimeout(() => {
                        progressCircle.style.transition = 'stroke-dashoffset 0.1s ease';
                    }, 300);
                }
                
                if (stabilitySvg) {
                    stabilitySvg.classList.remove('completed');
                }
            }
            } else if (voiceDetectionStarted && stabilityStartTime !== null) {
                // 音声が検出されなくなった（声が止まった）場合のリセット処理
                console.log('🔇 音声が途切れました - リセット');
                stableFrequencies = [];
                stabilityStartTime = null;
                voiceDetectionStarted = false;  // 音声検出フラグもリセット
                
                // リセット時にメッセージ更新
                if (testStatus) {
                    testStatus.textContent = 'リセットされました - 待機中...';
                    setTimeout(() => {
                        testStatus.textContent = '待機中...';
                    }, 1500);
                }
                
                // カウントダウン表示リセット
                const countdownDisplay = document.getElementById('countdown-display');
                const rangeIcon = document.getElementById('range-icon');
                if (countdownDisplay && rangeIcon) {
                    countdownDisplay.style.display = 'none';
                    rangeIcon.style.display = 'block';
                }
                
                // 円形プログレスバーリセット
                if (progressCircle) {
                    progressCircle.style.transition = 'stroke-dashoffset 0.3s ease-out';
                    progressCircle.style.strokeDashoffset = '452';
                    
                    setTimeout(() => {
                        progressCircle.style.transition = 'stroke-dashoffset 0.1s ease';
                    }, 300);
                }
                
                if (stabilitySvg) {
                    stabilitySvg.classList.remove('completed');
                }
            }
        }, 100);
    }
    
    function recordRangeResult(note, frequency) {
        console.log(`🎯 ${currentPhase}音域検出完了: ${note.note} (${frequency.toFixed(1)}Hz)`);
        
        // 結果記録
        if (currentPhase === 'low') {
            testResults.lowestNote = note.note;
            testResults.lowestFrequency = frequency;
            
            // 低音設定完了メッセージを表示
            if (testInstructionText) {
                testInstructionText.textContent = '測定完了';
            }
            if (testStatus) {
                testStatus.textContent = '次の測定を準備しています...';
            }
            
            console.log('⏱️ 高音域テストまで待機中...');
            setTimeout(() => {
                console.log('🔄 低音域 → 高音域テスト遷移');
                startHighRangeTest();  // 高音テスト内でも3秒インターバルがあるので合計6秒になる
            }, 2000); // 2秒に短縮（高音テスト内の3秒と合わせて合計5秒）
        } else {
            testResults.highestNote = note.note;
            testResults.highestFrequency = frequency;
            
            // 高音設定完了メッセージを表示
            if (testInstructionText) {
                testInstructionText.textContent = '測定完了';
            }
            if (testStatus) {
                testStatus.textContent = '音域測定が完了しました！';
            }
            
            console.log('⏱️ 音域テスト結果計算中...');
            setTimeout(() => {
                console.log('🎉 音域テスト完了 → 結果画面表示');
                finishRangeTest();
            }, 2000);
        }
    }
    
    function finishRangeTest() {
        console.log('音域テスト完了', testResults);
        
        // UI更新（段階表示削除により不要）
        
        // 結果計算
        const lowestNote = testResults.lowestNote || 'A2';
        const highestNote = testResults.highestNote || 'F5';
        const octaveCount = calculateOctaveRange(lowestNote, highestNote);
        
        // 結果表示セクション更新
        const rangeInfoRows = document.querySelectorAll('#result-section .range-info-row');
        if (rangeInfoRows.length >= 2) {
            const rangeSpan = rangeInfoRows[0].querySelector('.range-info-value');
            const octaveSpan = rangeInfoRows[1].querySelector('.range-info-value');
            
            if (rangeSpan) rangeSpan.textContent = `${lowestNote} - ${highestNote}`;
            if (octaveSpan) octaveSpan.textContent = `${octaveCount}オクターブ`;
        }
        
        // DataManager経由で保存
        const rangeResults = {
            lowestNote: lowestNote,
            highestNote: highestNote,
            comfortableRange: {
                min: lowestNote,
                max: highestNote,
                recommendedRoot: 'C4' // 基本推奨
            },
            lowestFrequency: testResults.lowestFrequency,
            highestFrequency: testResults.highestFrequency,
            octaveCount: octaveCount
        };
        
        const savedData = DataManager.saveVoiceRangeData(rangeResults);
        console.log('音域データ保存完了（DataManager）:', savedData);
        
        // ステップ3完了
        updateStepStatus(3, 'completed');
        
        // 結果セクション表示
        setTimeout(() => {
            showSection(resultSection);
        }, 1000);
    }
    
    function calculateOctaveRange(lowest, highest) {
        // 音名からMIDI番号への変換
        const noteToMidi = (noteName) => {
            const noteMap = { 'C': 0, 'C#': 1, 'D': 2, 'D#': 3, 'E': 4, 'F': 5, 'F#': 6, 'G': 7, 'G#': 8, 'A': 9, 'A#': 10, 'B': 11 };
            const match = noteName.match(/([A-G]#?)(\d+)/);
            if (!match) return 60; // C4 as default
            
            const [, note, octave] = match;
            return noteMap[note] + (parseInt(octave) + 1) * 12;
        };
        
        const lowestMidi = noteToMidi(lowest);
        const highestMidi = noteToMidi(highest);
        const semitonesRange = highestMidi - lowestMidi;
        
        return (semitonesRange / 12).toFixed(1);
    }
}

// ページ読み込み時の初期化処理
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 preparation.html読み込み完了 - 初期化開始');
    
    // 音域データのチェック（DataManager使用）
    const voiceRangeData = DataManager.getVoiceRangeData();
    console.log('🔍 保存済み音域データ確認:', voiceRangeData);
    
    if (voiceRangeData) {
        // 音域データが既に存在する場合の表示処理を改善
        console.log('✅ 音域データ発見 - スキップ表示を準備');
        
        // 音声テスト完了後に音域データ表示を実行する処理を設定
        // （showDetectionSuccess関数内で処理されるため、ここでは準備のみ）
        window.hasExistingRangeData = true;
        window.existingRangeData = voiceRangeData;
    } else {
        console.log('ℹ️ 音域データなし - 通常フローで進行');
        window.hasExistingRangeData = false;
    }
    
    // デバイス情報をUIに表示（デバッグ用）
    console.log('📱 検出されたデバイス情報:', {
        deviceType: deviceSpecs.deviceType,
        sensitivityMultiplier: deviceSpecs.sensitivityMultiplier,
        volumeBarScale: deviceSpecs.volumeBarScale,
        isIOS: deviceSpecs.isIOS
    });
});