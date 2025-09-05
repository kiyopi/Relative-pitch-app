// preparation-modular.js - モジュール統合版
// 新しいモジュール化システムを活用したクリーンな実装

lucide.createIcons();

// グローバル変数
let deviceManager = null;
let audioController = null;
let voiceRangeTester = null;
let dataManager = null;
let volumeBarController = null; // VolumeBarController追加
let volumeBarComponent = null; // VolumeBarComponent追加

// DOM要素の取得
const requestMicBtn = document.getElementById('request-mic-btn');
const startRangeTestBtn = document.getElementById('start-range-test-btn');
const startTrainingBtn = document.getElementById('start-training-btn');
const remeasureRangeBtn = document.getElementById('remeasure-range-btn');
const retestRangeBtn = document.getElementById('retest-range-btn');
const skipRangeTestBtn = document.getElementById('skip-range-test-btn');

const permissionSection = document.getElementById('permission-section');
const audioTestSection = document.getElementById('audio-test-section');
const rangeTestSection = document.getElementById('range-test-section');
const resultSection = document.getElementById('result-section');
const rangeSavedDisplay = document.getElementById('range-saved-display');

// UI表示要素
const volumeProgress = document.getElementById('volume-progress');
const volumeValue = document.getElementById('volume-value');
const frequencyValue = document.getElementById('frequency-value');
const detectionSuccess = document.getElementById('detection-success');
const progressDisplay = document.getElementById('progress-display');
const progressText = document.getElementById('progress-text');
const progressDetail = document.getElementById('progress-detail');

// 音声テスト状態
let currentPhase = 'permission'; // permission, audio-test, range-test, result
let audioTestStartTime = null;
let audioTestDuration = 15000; // 15秒
let isAudioTesting = false;
let detectedC4 = false;

/**
 * システム初期化
 */
async function initializeSystem() {
    try {
        console.log('🚀 モジュール統合システム初期化開始');
        
        // DeviceManager初期化
        deviceManager = new DeviceManager();
        const deviceSpecs = await deviceManager.initialize();
        await deviceManager.saveToStorage();
        
        // DataManager確認（静的クラス）
        if (window.DataManager) {
            dataManager = window.DataManager; // 静的クラスなのでそのまま使用
            console.log('📊 DataManager統合完了');
        }
        
        // VoiceRangeTester初期化
        voiceRangeTester = new VoiceRangeTester(deviceManager, dataManager);
        
        // AudioController初期化（ボタン押下時まで保留）
        audioController = new AudioController(deviceManager);
        
        // test-ui-integration.html成功パターン：直接PitchPro初期化は後で実行
        console.log('✅ AudioController準備完了（初期化は音声テスト開始時）');
        
        // VolumeBarComponent初期化（シンプル版）
        if (window.VolumeBarComponent) {
            try {
                const volumeProgressElement = document.getElementById('volume-progress');
                if (volumeProgressElement) {
                    const meterGroup = volumeProgressElement.parentElement.parentElement;
                    meterGroup.id = 'volume-bar-container';
                    
                    volumeBarComponent = new window.VolumeBarComponent('volume-bar-container', {
                        debugMode: false, // デバッグ無効化
                        deviceOptimization: false
                    });
                    console.log('✅ VolumeBarComponent初期化完了');
                }
            } catch (error) {
                console.error('❌ VolumeBarComponent初期化エラー:', error.message);
            }
        }
        
        console.log('✅ VolumeBarController統合完了');
        
        // 保存済み音域データの確認
        checkSavedVoiceRange();
        
        console.log('✅ モジュール統合システム初期化完了');
        
    } catch (error) {
        console.error('❌ システム初期化エラー:', error);
        showErrorMessage('システム初期化に失敗しました');
    }
}

/**
 * 保存済み音域データの確認
 */
function checkSavedVoiceRange() {
    if (!dataManager) return;
    
    const savedRange = dataManager.getVoiceRangeData();
    if (savedRange && savedRange.success) {
        console.log('📱 保存済み音域データ発見:', savedRange);
        showSavedRangeDisplay(savedRange);
    }
}

/**
 * 保存済み音域表示
 */
function showSavedRangeDisplay(rangeData) {
    if (!rangeSavedDisplay) return;
    
    // データ表示更新
    const savedRange = document.getElementById('saved-range');
    const savedOctaves = document.getElementById('saved-octaves');
    const savedDate = document.getElementById('saved-date');
    
    if (savedRange) {
        savedRange.textContent = `${rangeData.noteRange.min} - ${rangeData.noteRange.max}`;
    }
    if (savedOctaves) {
        savedOctaves.textContent = `${rangeData.octaveRange.toFixed(1)}オクターブ`;
    }
    if (savedDate) {
        const date = new Date(rangeData.detectedAt || Date.now());
        savedDate.textContent = date.toLocaleDateString('ja-JP');
    }
    
    // 表示切り替え
    rangeSavedDisplay.classList.remove('hidden');
}

/**
 * ステップインジケーター更新
 */
function updateStepStatus(stepNumber, status) {
    const step = document.getElementById(`step-${stepNumber}`);
    const connector = document.getElementById(`connector-${stepNumber}`);
    
    if (!step) return;
    
    // 状態クラスをリセット
    step.classList.remove('active', 'completed', 'pending');
    if (connector) {
        connector.classList.remove('active', 'completed');
    }
    
    // 新しい状態を適用
    step.classList.add(status);
    if (connector && status === 'completed') {
        connector.classList.add('completed');
    }
    
    // アクティブ状態の特別処理
    if (status === 'active' && connector) {
        connector.classList.add('active');
    }
}

/**
 * セクション表示切り替え
 */
function showSection(targetSection) {
    const sections = [permissionSection, audioTestSection, rangeTestSection, resultSection];
    
    sections.forEach(section => {
        if (section) {
            section.classList.add('hidden');
        }
    });
    
    if (targetSection) {
        targetSection.classList.remove('hidden');
    }
}

/**
 * マイク許可ボタンイベント
 */
if (requestMicBtn) {
    requestMicBtn.addEventListener('click', async () => {
        try {
            console.log('🎤 マイク初期化開始');
            requestMicBtn.disabled = true;
            requestMicBtn.innerHTML = '<i data-lucide="loader" style="width: 24px; height: 24px;"></i><span>初期化中...</span>';
            lucide.createIcons();
            
            // test-ui-integration.html成功パターン：直接PitchPro初期化
            if (!window.PitchPro) {
                throw new Error('PitchProライブラリが読み込まれていません');
            }
            
            const { AudioManager, PitchDetector } = window.PitchPro;
            
            // AudioManager初期化（AGC完全無効化 - test-ui-integration.html準拠）
            const audioManager = new AudioManager({
                sampleRate: 44100,
                channelCount: 1,
                echoCancellation: false,
                noiseSuppression: false,
                autoGainControl: false,
                googAutoGainControl: false,
                googNoiseSuppression: false,
                googEchoCancellation: false,
                googHighpassFilter: false,
                mozAutoGainControl: false,
                mozNoiseSuppression: false
            });
            
            await audioManager.initialize();
            console.log('✅ AudioManager初期化完了');
            
            // PitchDetector初期化
            const pitchDetector = new PitchDetector(audioManager, {
                fftSize: 4096,
                smoothing: 0.1,
                clarityThreshold: 0.6,
                minVolumeAbsolute: 0.01
            });
            
            await pitchDetector.initialize();
            console.log('✅ PitchDetector初期化完了');
            
            // デバイス最適化設定適用
            const deviceSpecs = deviceManager ? deviceManager.getSpecs() : { sensitivityMultiplier: 2.5 };
            audioManager.setSensitivity(deviceSpecs.sensitivityMultiplier);
            console.log(`✅ マイク感度を${deviceSpecs.sensitivityMultiplier}xに設定`);
            
            // グローバル変数に保存（後で使用）
            window.preparationAudioManager = audioManager;
            window.preparationPitchDetector = pitchDetector;
            
            console.log('✅ マイク初期化完了');
            updateStepStatus(1, 'completed');
            updateStepStatus(2, 'active');
            
            currentPhase = 'audio-test';
            showSection(audioTestSection);
            startAudioTest();
            
        } catch (error) {
            console.error('❌ マイク初期化エラー:', error);
            showErrorMessage(`マイク初期化に失敗: ${error.message}`);
            
            requestMicBtn.disabled = false;
            requestMicBtn.innerHTML = '<i data-lucide="mic" style="width: 24px; height: 24px;"></i><span>マイクを許可</span>';
            lucide.createIcons();
        }
    });
}

/**
 * 音声テスト開始
 */
function startAudioTest() {
    // グローバル変数から取得
    const pitchDetector = window.preparationPitchDetector;
    if (!pitchDetector) {
        console.error('❌ PitchDetector が初期化されていません');
        return;
    }
    
    isAudioTesting = true;
    audioTestStartTime = Date.now();
    detectedC4 = false;
    
    // test-ui-integration.html成功パターン：直接PitchDetectorコールバック
    pitchDetector.setCallbacks({
        onPitchUpdate: (result) => {
            if (!isAudioTesting || !result) return;
            
            const { frequency, note } = result;
            let volumePercent = 0; // volumePercentを先に定義
            
            // test-ui-integration.html成功パターン：PitchProから直接音量取得
            if (result.volume !== undefined) {
                const rawVolume = result.volume || 0;
                
                // test-ui-integration.htmlと同じ計算式
                const deviceSpecs = deviceManager ? deviceManager.getSpecs() : { sensitivityMultiplier: 2.5, volumeBarScale: 3.0 };
                const volumeBarScale = deviceSpecs.volumeBarScale || 3.0;
                const adjustedVolume = rawVolume * volumeBarScale * deviceSpecs.sensitivityMultiplier;
                volumePercent = Math.min(100, Math.max(0, adjustedVolume)); // volumePercentに代入
                
                // 直接HTML操作（test-ui-integration.html成功パターン）
                if (volumeProgress) {
                    volumeProgress.style.width = volumePercent + '%';
                }
                if (volumeValue) {
                    volumeValue.textContent = volumePercent.toFixed(1) + '%';
                }
                
                // 10%の確率でログ出力（スパム防止）
                if (Math.random() < 0.1) {
                    console.log(`🎚️ 音量バー更新: Raw=${rawVolume.toFixed(3)}, Final=${volumePercent.toFixed(1)}%`);
                }
            }
            
            // 周波数表示更新（音程表示なし、検出停止時は0Hz）
            if (frequencyValue) {
                if (frequency > 0) {
                    frequencyValue.textContent = `${frequency.toFixed(1)} Hz`;
                } else {
                    frequencyValue.textContent = '0 Hz';
                }
            }
            
            // 音声検出チェック（より広い範囲で人の声を検出）
            // 男性: 80-180Hz、女性: 165-330Hz、子供: 250-400Hz
            if (frequency >= 80 && frequency <= 400 && volumePercent >= 20) {
                if (!detectedC4) {
                    detectedC4 = true;
                    updateProgressDisplay('声を検出しました！', `${frequency.toFixed(1)}Hz - 安定した音声を検出中`);
                    
                    // 成功メッセージを早めに表示（flexレイアウトを維持）
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
        },
        onError: (error) => {
            console.error('🎤 音声テストエラー:', error);
            showErrorMessage('音声テスト中にエラーが発生しました');
        }
    });
    
    // 検出開始
    const success = pitchDetector.startDetection();
    if (success) {
        console.log('🎵 音声テスト開始');
        updateProgressDisplay('声を出してください', '3秒間継続して発声してください');
        
        // 15秒タイマー
        setTimeout(checkAudioTestComplete, audioTestDuration);
    } else {
        showErrorMessage('音声テスト開始に失敗しました');
    }
}

// 古いコールバック関数を削除（直接PitchDetectorコールバックに統合済み）

/**
 * 進捗表示更新
 */
function updateProgressDisplay(mainText, detailText) {
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

/**
 * 音声テスト完了チェック
 */
function checkAudioTestComplete() {
    if (!isAudioTesting) return;
    
    if (detectedC4) {
        completeAudioTest();
    } else {
        // 時間切れ - 再試行を促す
        updateProgressDisplay('時間切れ', '130-180Hzの声で2秒間継続してください');
        audioTestStartTime = Date.now(); // タイマーリセット
        setTimeout(checkAudioTestComplete, audioTestDuration);
    }
}

/**
 * 音声テスト完了
 */
function completeAudioTest() {
    isAudioTesting = false;
    
    // 直接PitchDetector停止
    const pitchDetector = window.preparationPitchDetector;
    if (pitchDetector) {
        pitchDetector.stopDetection();
        console.log('🎵 PitchDetector停止完了');
    }
    
    // 音量バーリセット
    if (volumeProgress) {
        volumeProgress.style.width = '0%';
    }
    if (volumeValue) {
        volumeValue.textContent = '0%';
    }
    
    // 周波数表示を0Hzにリセット
    if (frequencyValue) {
        frequencyValue.textContent = '0 Hz';
    }
    
    console.log('✅ 音声テスト完了');
    
    // 成功メッセージ表示（flexレイアウトを維持）
    if (detectionSuccess) {
        detectionSuccess.style.display = 'flex';
    }
    
    // 進捗表示を隠す
    if (progressDisplay) {
        progressDisplay.style.display = 'none';
    }
    
    // 音域テストボタン表示
    if (startRangeTestBtn) {
        startRangeTestBtn.classList.remove('hidden');
    }
    
    updateStepStatus(2, 'completed');
}

/**
 * 音域テスト開始ボタンイベント
 */
if (startRangeTestBtn) {
    startRangeTestBtn.addEventListener('click', () => {
        const pitchDetector = window.preparationPitchDetector;
        if (!voiceRangeTester || !pitchDetector) {
            showErrorMessage('システムが正常に初期化されていません');
            return;
        }
        
        console.log('🎵 音域テスト開始');
        currentPhase = 'range-test';
        showSection(rangeTestSection);
        updateStepStatus(3, 'active');
        
        // VoiceRangeTesterのコールバック設定（直接PitchDetector使用）
        pitchDetector.setCallbacks({
            onPitchUpdate: (result) => {
                voiceRangeTester.processPitchData(result);
            },
            onError: (error) => {
                console.error('🎤 音域テストエラー:', error);
                showErrorMessage('音域テスト中にエラーが発生しました');
            }
        });
        
        // 音域テスト開始
        voiceRangeTester.startRangeTest();
        pitchDetector.startDetection();
    });
}

/**
 * トレーニング開始ボタンイベント
 */
if (startTrainingBtn) {
    startTrainingBtn.addEventListener('click', () => {
        console.log('🏃 トレーニング開始');
        // training.htmlへリダイレクト
        window.location.href = './training.html';
    });
}

/**
 * 再測定ボタンイベント
 */
if (remeasureRangeBtn) {
    remeasureRangeBtn.addEventListener('click', () => {
        const pitchDetector = window.preparationPitchDetector;
        if (!pitchDetector) {
            showErrorMessage('システムが正常に初期化されていません');
            return;
        }
        
        console.log('🔄 音域再測定開始');
        currentPhase = 'range-test';
        showSection(rangeTestSection);
        updateStepStatus(3, 'active');
        
        // VoiceRangeTesterのコールバック再設定
        pitchDetector.setCallbacks({
            onPitchUpdate: (result) => {
                voiceRangeTester.processPitchData(result);
            }
        });
        
        // 音域テスト再開
        voiceRangeTester.startRangeTest();
        pitchDetector.startDetection();
    });
}

/**
 * スキップボタンイベント
 */
if (skipRangeTestBtn) {
    skipRangeTestBtn.addEventListener('click', () => {
        console.log('⏩ 音域テストをスキップしてトレーニング開始');
        window.location.href = './training.html';
    });
}

/**
 * 再テストボタンイベント
 */
if (retestRangeBtn) {
    retestRangeBtn.addEventListener('click', () => {
        console.log('🔄 音域データクリアして再テスト');
        
        // 保存済みデータをクリア
        if (dataManager && dataManager.clearVoiceRangeData) {
            dataManager.clearVoiceRangeData();
        }
        
        // 表示をリセット
        if (rangeSavedDisplay) {
            rangeSavedDisplay.classList.add('hidden');
        }
        
        // 音声テストから再開
        currentPhase = 'audio-test';
        showSection(audioTestSection);
        updateStepStatus(1, 'completed');
        updateStepStatus(2, 'active');
        updateStepStatus(3, 'pending');
        
        startAudioTest();
    });
}

/**
 * エラーメッセージ表示
 */
function showErrorMessage(message) {
    console.error('❌ エラー:', message);
    alert(`エラー: ${message}`);
}

/**
 * VoiceRangeTesterの結果処理
 */
function handleRangeTestComplete(result) {
    console.log('🎵 音域テスト結果:', result);
    
    if (result && result.success) {
        currentPhase = 'result';
        showSection(resultSection);
        updateStepStatus(3, 'completed');
        
        // 結果表示更新は VoiceRangeTester 内で処理済み
    } else {
        const errorMessage = (result && result.error) ? result.error : '音域テスト中に不明なエラーが発生しました';
        showErrorMessage(errorMessage);
    }
}

// VoiceRangeTesterの完了イベントをフック（ページ読み込み後に実行）
function setupVoiceRangeTesterHook() {
    if (window.VoiceRangeTester && window.VoiceRangeTester.prototype) {
        const originalOnTestComplete = window.VoiceRangeTester.prototype.onTestComplete;
        if (originalOnTestComplete) {
            window.VoiceRangeTester.prototype.onTestComplete = function(result) {
                originalOnTestComplete.call(this, result);
                handleRangeTestComplete(result);
            };
            console.log('✅ VoiceRangeTesterフック設定完了');
        }
    }
}

// ページ読み込み完了時の初期化
document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 preparation-modular.js 読み込み完了');
    initializeSystem();
    
    // モジュール読み込み完了を待ってフック設定
    setTimeout(setupVoiceRangeTesterHook, 100);
});

console.log('🎯 モジュール統合版 preparation.js 読み込み完了');