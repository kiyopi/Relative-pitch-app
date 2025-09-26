// preparation-minimal.js - マイク許可 + 音量テストのみ

// DOM要素の取得
const requestMicBtn = document.getElementById('request-mic-btn');
const permissionSection = document.getElementById('permission-section');
const audioTestSection = document.getElementById('audio-test-section');
const rangeTestSection = document.getElementById('range-test-section');
const resultSection = document.getElementById('result-section');

// デバイス検出（device-manager.jsから）
let deviceSpecs = {
    deviceType: 'PC',
    sensitivityMultiplier: 2.5,
    volumeBarScale: 3.0,
    isIOS: false
};

// DeviceManagerを初期化（非同期処理）
if (window.DeviceManager) {
    const deviceManager = new DeviceManager();
    deviceManager.initialize().then(specs => {
        deviceSpecs = specs;
        console.log('🔍 デバイス検出完了:', deviceSpecs);
    }).catch(error => {
        console.warn('⚠️ デバイス検出失敗、デフォルト設定使用:', error);
    });
}

// 音声処理インスタンス
let audioProcessor = null;
let detectionActive = false;
let voiceDetectionStartTime = null; // 音声検出開始時刻（80Hz以上1秒間継続検出用）

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

// マイク許可ボタン（preparation.jsから完全コピー）
requestMicBtn.addEventListener('click', async () => {
    try {
        requestMicBtn.disabled = true;
        requestMicBtn.innerHTML = '<i data-lucide="loader" style="width: 24px; height: 24px;"></i><span>許可を待っています...</span>';
        lucide.createIcons();

        // デバイス別最適化AudioProcessor初期化
        console.log(`🚀 AudioProcessor初期化開始（${deviceSpecs.deviceType}用最適化）...`);
        audioProcessor = new AudioProcessor();
        console.log('📦 AudioProcessorインスタンス作成完了');

        const initResult = await audioProcessor.initialize();
        console.log('🔍 初期化結果:', initResult);

        if (!initResult.success) {
            console.error('❌ AudioProcessor初期化失敗:', initResult.error);
            throw new Error(initResult.error);
        }

        // デバイス別感度設定適用
        console.log(`🔧 ${deviceSpecs.deviceType}用感度設定適用: ${deviceSpecs.sensitivityMultiplier}x`);

        // オーディオコールバック設定
        audioProcessor.setCallbacks({
            onPitchUpdate: (result) => {
                console.log('🎵 onPitchUpdate統合コールバック受信:', {
                    result: result,
                    volume: result?.volume,
                    frequency: result?.frequency,
                    clarity: result?.clarity,
                    detectionActive: detectionActive
                });

                // 検出停止中は音量バー更新をスキップ
                if (!detectionActive) {
                    console.log('⏸️ 検出停止中のため音量バー更新をスキップ');
                    return;
                }

                // リアルタイム音程処理
                handlePitchUpdate(result);

                // 音量表示更新（既存の関数を使用）
                updateVolumeBar(result.volume);
                updateFrequencyDisplay(result.frequency);
            },
            onError: (context, error) => handleAudioError(context, error)
        });

        // マイク許可成功
        requestMicBtn.innerHTML = '<i data-lucide="check-circle" style="width: 24px; height: 24px;"></i><span>マイク許可完了</span>';
        lucide.createIcons();
        console.log('✅ マイク許可・AudioProcessor初期化完了');

        // ステップ1完了、ステップ2へ
        updateStepStatus(1, 'completed');
        updateStepStatus(2, 'active');

        showSection(audioTestSection);
        startAudioTest();

    } catch (error) {
        console.error('❌ マイク許可エラー:', error);
        requestMicBtn.disabled = false;
        requestMicBtn.innerHTML = '<i data-lucide="alert-circle" style="width: 24px; height: 24px;"></i><span>エラー - 再試行</span>';
        lucide.createIcons();
        alert(`マイクの許可に失敗しました: ${error.message}\nページを更新して再試行してください。`);
    }
});

// 音声テスト開始
function startAudioTest() {
    detectionActive = true;
    detectedCDoPitches = [];
    audioProcessor.startDetection();
}

// 音程更新ハンドラー
function handlePitchUpdate(result) {
    if (!detectionActive) return;

    // 音量バー更新
    updateVolumeBar(result.volume);

    // 周波数表示更新
    updateFrequencyDisplay(result.frequency);

    // 🎤 音声検出条件: 80Hz以上の周波数を1秒間継続検出
    const MIN_FREQUENCY = 80; // Hz - 雑音を除外する最低周波数
    const MIN_CLARITY = 0.15;  // 音程の明瞭度
    const MIN_VOLUME = 0.03;   // 最小音量
    
    if (result.frequency >= MIN_FREQUENCY && 
        result.clarity > MIN_CLARITY && 
        result.volume > MIN_VOLUME) {
        
        // 有効な音声を検出
        if (!voiceDetectionStartTime) {
            voiceDetectionStartTime = Date.now();
            console.log(`🎤 音声検出開始: ${result.frequency.toFixed(1)}Hz`);
        }
        
        // 1秒間継続検出をチェック
        const detectionDuration = Date.now() - voiceDetectionStartTime;
        if (detectionDuration >= 1000) { // 1秒 = 1000ms
            console.log(`✅ 音声検出成功: ${detectionDuration}ms間継続検出`);
            showDetectionSuccess();
        }
    } else {
        // 条件を満たさない場合は検出をリセット
        if (voiceDetectionStartTime) {
            console.log(`⚠️ 音声検出中断: 周波数=${result.frequency.toFixed(1)}Hz`);
            voiceDetectionStartTime = null;
        }
    }
}

// 音量バー更新
function updateVolumeBar(volume) {
    const volumeProgress = document.getElementById('volume-progress');
    const volumeValue = document.getElementById('volume-value');

    if (volumeProgress && volumeValue) {
        // 適切な音量スケーリング（PitchProの音量値は0.0-1.0の範囲）
        let multiplier = 100; // 基本倍率（1桁下げて調整）

        // デバイス別調整
        if (deviceSpecs.deviceType === 'iPhone') multiplier = 150;
        else if (deviceSpecs.deviceType === 'iPad') multiplier = 200;
        else if (deviceSpecs.deviceType === 'PC') multiplier = 120;

        const adjustedVolume = volume * multiplier;
        const volumePercent = Math.min(100, Math.max(0, adjustedVolume));

        console.log(`🎤 音量詳細: 元値=${volume.toFixed(4)}, 倍率=${multiplier}, 結果=${volumePercent.toFixed(1)}%`);

        volumeProgress.style.width = volumePercent + '%';
        volumeValue.textContent = volumePercent.toFixed(0) + '%';
    }
}

// 周波数表示更新
function updateFrequencyDisplay(frequency) {
    const frequencyValue = document.getElementById('frequency-value');
    if (frequencyValue && frequency > 0) {
        const note = frequencyToNote(frequency);
        frequencyValue.textContent = `${frequency.toFixed(1)} Hz (${note})`;
    }
}

// 周波数から音名変換
function frequencyToNote(frequency) {
    const A4_FREQ = 440.0;
    const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

    const semitones = Math.round(12 * Math.log2(frequency / A4_FREQ));
    const octave = Math.floor((semitones + 9) / 12) + 4;
    const noteIndex = (semitones + 9 + 120) % 12;

    return `${noteNames[noteIndex]}${octave}`;
}

// 検出成功表示
function showDetectionSuccess() {
    detectionActive = false;
    
    // 🎯 PitchPro標準ライフサイクル: 停止 → リセット
    audioProcessor.stopDetection();
    
    // 🔄 PitchProの標準reset()メソッドでUI状態を初期化
    if (audioProcessor.reset) {
        audioProcessor.reset();
        console.log('✅ PitchPro reset()メソッド実行完了');
    } else {
        console.warn('⚠️ PitchPro reset()メソッドが利用できません - 手動リセット実行');
        
        // フォールバック: 手動リセット
        const volumeProgress = document.getElementById('volume-progress');
        const volumeValue = document.getElementById('volume-value');
        const frequencyValue = document.getElementById('frequency-value');
        
        if (volumeProgress) volumeProgress.style.width = '0%';
        if (volumeValue) volumeValue.textContent = '0%';
        if (frequencyValue) frequencyValue.textContent = '--- Hz';
    }

    // 🎵 UI状態更新（PitchProの管轄外）
    const voiceInstructionIcon = document.querySelector('.voice-instruction-icon');
    if (voiceInstructionIcon) {
        // アニメーション停止
        const pulseElement = document.querySelector('.voice-instruction-pulse');
        if (pulseElement) {
            pulseElement.style.display = 'none';
        }

        // アイコン変更とスタイル更新（padding削除でサイズ維持）
        voiceInstructionIcon.innerHTML = '<i data-lucide="check" style="width: 32px; height: 32px; color: white;"></i>';
        voiceInstructionIcon.style.backgroundColor = '#22c55e'; // 緑色背景
        voiceInstructionIcon.style.borderRadius = '50%';
        // paddingを削除（CSSの64pxサイズを維持）
        
        // Lucideアイコンを再初期化
        lucide.createIcons();
    }

    // 📝 説明文を更新
    const voiceInstructionText = document.getElementById('voice-instruction-text');
    if (voiceInstructionText) {
        voiceInstructionText.textContent = '音声を認識しました';
    }

    // ✅ 成功メッセージ表示
    const detectionSuccess = document.getElementById('detection-success');
    const startRangeBtn = document.getElementById('start-range-test-btn');

    if (detectionSuccess) {
        detectionSuccess.classList.remove('hidden');
    }

    if (startRangeBtn) {
        setTimeout(() => {
            startRangeBtn.classList.remove('hidden');
        }, 500);
    }

    console.log('✅ 音声テスト完了 - PitchProリセット＋UI更新完了');
}

// エラーハンドラー
function handleAudioError(context, error) {
    console.error(`Audio Error [${context}]:`, error);
    detectionActive = false;

    requestMicBtn.disabled = false;
    requestMicBtn.innerHTML = '<i data-lucide="alert-circle" style="width: 24px; height: 24px;"></i><span>エラー - 再試行</span>';
    lucide.createIcons();

    alert(`オーディオエラー: ${error.message}`);
}

// 音域テストボタン（音域テスト機能は後で実装）
document.getElementById('start-range-test-btn').addEventListener('click', () => {
    updateStepStatus(2, 'completed');
    updateStepStatus(3, 'active');
    showSection(rangeTestSection);

    // TODO: 音域テスト機能を実装
    alert('音域テスト機能は実装予定です');
});

console.log('🎵 preparation-minimal.js 初期化完了');