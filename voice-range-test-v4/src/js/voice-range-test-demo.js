/**
 * voice-range-test-demo.js - 音域テストデモページメインスクリプト
 *
 * @version 2.0.0
 * @description PitchPro v1.3.0対応版統合デモ
 * @date 2025-01-16
 */

// VoiceRangeTestControllerの動的インポート
let VoiceRangeTestController;

// グローバルなaudioDetectorインスタンス（効率的な再利用のため）
let globalAudioDetector = null;

// 初期化関数
async function initializeDemo() {
    try {
        const module = await import('./voice-range-test-controller.js');
        VoiceRangeTestController = module.VoiceRangeTestController;
        console.log('✅ VoiceRangeTestController loaded successfully');
    } catch (error) {
        console.warn('⚠️ VoiceRangeTestController import failed:', error);
        console.log('📋 デモは基本機能のみで動作します');
    }
}

// デバッグ用: 表示制御を確認する関数
window.debugBadgeDisplay = function() {
    const rangeIcon = document.getElementById('range-icon');
    const countdownDisplay = document.getElementById('countdown-display');
    console.log('🔍 現在の表示状態:');
    console.log('  rangeIcon.style.display:', rangeIcon.style.display);
    console.log('  rangeIcon.innerHTML:', rangeIcon.innerHTML);
    console.log('  countdownDisplay.style.display:', countdownDisplay.style.display);
    console.log('  countdownDisplay.textContent:', countdownDisplay.textContent);
};

// 結果表示関数
function displayResults(results) {
    document.getElementById('result-range').textContent = results.range || '-';
    document.getElementById('result-octaves').textContent = results.octaves ? `${results.octaves}オクターブ` : '-';
    document.getElementById('result-low-freq').textContent = results.lowPitch ?
        `${results.lowPitch.frequency.toFixed(1)} Hz (${results.lowPitch.note})` : '-';
    document.getElementById('result-high-freq').textContent = results.highPitch ?
        `${results.highPitch.frequency.toFixed(1)} Hz (${results.highPitch.note})` : '-';

    // 🧪 デバッグ情報を結果詳細に追加
    if (globalState.debugData.detectionCount > 0) {
        const resultDetails = document.getElementById('result-details');
        if (resultDetails) {
            resultDetails.innerHTML = `
                <div class="result-info-row">
                    <span>🧪 総検出回数</span>
                    <span class="result-info-value">${globalState.debugData.detectionCount}回</span>
                </div>
                <div class="result-info-row">
                    <span>🧪 検出範囲</span>
                    <span class="result-info-value">${globalState.debugData.tempRange || '-'}</span>
                </div>
                <div class="result-info-row">
                    <span>🧪 最低検出音程</span>
                    <span class="result-info-value">${globalState.debugData.minNote || '-'}</span>
                </div>
                <div class="result-info-row">
                    <span>🧪 最低検出周波数</span>
                    <span class="result-info-value">${globalState.debugData.minFreq ? `${globalState.debugData.minFreq.toFixed(1)} Hz` : '-'}</span>
                </div>
                <div class="result-info-row">
                    <span>🧪 最高検出音程</span>
                    <span class="result-info-value">${globalState.debugData.maxNote || '-'}</span>
                </div>
                <div class="result-info-row">
                    <span>🧪 最高検出周波数</span>
                    <span class="result-info-value">${globalState.debugData.maxFreq ? `${globalState.debugData.maxFreq.toFixed(1)} Hz` : '-'}</span>
                </div>
            `;
        }
    }

    document.getElementById('results-section').style.display = 'block';
    document.getElementById('stop-range-test-btn').style.display = 'none';

    console.log('📋 測定結果表示完了 (デバッグ情報含む)');
}

// 通知表示関数
function showNotification(message, type = 'info') {
    const colors = {
        success: '#10b981',
        error: '#ef4444',
        info: '#3b82f6',
        warning: '#f59e0b'
    };

    console.log(`%c${message}`, `color: ${colors[type]}; font-weight: bold;`);

    // TODO: 実際の通知UIを実装する場合はここに追加
}

// 🧪 デバッグデータを更新（表示状態に関係なく常に実行）
function updateDebugData(pitchResult = null) {
    // 現在の検出情報を更新
    if (pitchResult) {
        globalState.debugData.currentNote = pitchResult.note || null;
        globalState.debugData.currentFreq = pitchResult.frequency || null;
        globalState.debugData.currentVolume = pitchResult.volume || null;
        globalState.debugData.detectionCount++;

        // 音程が検出された場合、範囲を更新
        if (pitchResult.frequency) {
            const freq = pitchResult.frequency;

            // 最低音・最高音の更新
            if (!globalState.debugData.minFreq || freq < globalState.debugData.minFreq) {
                globalState.debugData.minFreq = freq;
                globalState.debugData.minNote = pitchResult.note;
            }
            if (!globalState.debugData.maxFreq || freq > globalState.debugData.maxFreq) {
                globalState.debugData.maxFreq = freq;
                globalState.debugData.maxNote = pitchResult.note;
            }

            // 暫定音域の計算
            if (globalState.debugData.minNote && globalState.debugData.maxNote) {
                globalState.debugData.tempRange = `${globalState.debugData.minNote} ～ ${globalState.debugData.maxNote}`;
            }
        }
    }
}

// 🧪 デバッグ表示を更新（表示がONの時のみ実行）
function updateDebugDisplay() {
    if (!globalState.debugData.isVisible) return;

    // HTML要素を更新
    const elements = {
        'debug-detection-status': globalState.debugData.detectionStatus,
        'debug-mic-status': globalState.debugData.micStatus,
        'debug-current-note': globalState.debugData.currentNote || '-',
        'debug-current-freq': globalState.debugData.currentFreq ? `${globalState.debugData.currentFreq.toFixed(1)} Hz` : '- Hz',
        'debug-current-volume': globalState.debugData.currentVolume ? `${globalState.debugData.currentVolume.toFixed(1)}%` : '- %',
        'debug-min-note': globalState.debugData.minNote || '-',
        'debug-min-freq': globalState.debugData.minFreq ? `${globalState.debugData.minFreq.toFixed(1)} Hz` : '- Hz',
        'debug-max-note': globalState.debugData.maxNote || '-',
        'debug-max-freq': globalState.debugData.maxFreq ? `${globalState.debugData.maxFreq.toFixed(1)} Hz` : '- Hz',
        'debug-temp-range': globalState.debugData.tempRange || '-',
        'debug-detection-count': `${globalState.debugData.detectionCount}回`
    };

    Object.entries(elements).forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    });
}

// 🧪 デバッグ表示の切り替え
function toggleDebugDisplay() {
    globalState.debugData.isVisible = !globalState.debugData.isVisible;

    const debugCard = document.getElementById('debug-range-data');
    const toggleButton = document.getElementById('toggle-debug-display');

    if (debugCard) {
        debugCard.style.display = globalState.debugData.isVisible ? 'block' : 'none';
    }

    if (toggleButton) {
        toggleButton.textContent = globalState.debugData.isVisible ? 'デバッグ表示OFF' : 'デバッグ表示ON';
        toggleButton.className = globalState.debugData.isVisible ? 'btn btn-warning btn-sm' : 'btn btn-secondary btn-sm';
    }

    // 表示をONにした時、蓄積されたデータを即座に表示
    if (globalState.debugData.isVisible) {
        updateDebugDisplay();
    }

    console.log(`🧪 デバッグ表示: ${globalState.debugData.isVisible ? 'ON' : 'OFF'}`);
}

// 🧪 デバッグデータをリセット
function resetDebugData() {
    globalState.debugData.currentNote = null;
    globalState.debugData.currentFreq = null;
    globalState.debugData.currentVolume = null;
    globalState.debugData.detectionCount = 0;
    globalState.debugData.minFreq = null;
    globalState.debugData.maxFreq = null;
    globalState.debugData.minNote = null;
    globalState.debugData.maxNote = null;
    globalState.debugData.tempRange = null;
    // システム状態はリセットしない（現在の状態を保持）

    // 表示をリセット
    updateDebugDisplay();
    console.log('🧪 デバッグデータをリセット');
}

// 🧪 デバッグ状態を更新する便利関数
function updateDebugStatus(detectionStatus = null, micStatus = null) {
    if (detectionStatus !== null) {
        globalState.debugData.detectionStatus = detectionStatus;
    }
    if (micStatus !== null) {
        globalState.debugData.micStatus = micStatus;
    }
    updateDebugDisplay();
}

// マイクステータス管理関数
function updateMicStatus(status) {
    const micContainer = document.getElementById('mic-status-container');
    const micButton = document.getElementById('request-mic-permission');

    if (micContainer) {
        // 既存のクラスをクリア
        micContainer.classList.remove('standby', 'recording');

        // 新しいステータスを適用
        switch (status) {
            case 'standby':
                micContainer.classList.add('standby');
                console.log('🎤 マイクステータス: 待機中');
                break;
            case 'recording':
                micContainer.classList.add('recording');
                console.log('🎤 マイクステータス: 録音中（赤エフェクト）');
                break;
            default:
                micContainer.classList.add('standby');
                console.log('🎤 マイクステータス: デフォルト（待機中）');
        }
    }

    // マイクボタンの状態も更新
    if (micButton) {
        micButton.classList.remove('mic-idle', 'mic-permitted', 'mic-active');

        switch (status) {
            case 'standby':
                if (globalState.micPermissionGranted) {
                    micButton.classList.add('mic-permitted');
                } else {
                    micButton.classList.add('mic-idle');
                }
                break;
            case 'recording':
                micButton.classList.add('mic-active');
                break;
            default:
                micButton.classList.add('mic-idle');
        }
    }
}

// グローバル状態管理
let globalState = {
    micPermissionGranted: false,
    currentPhase: 'idle', // idle, waiting-for-voice, measuring-low, idle-low, waiting-for-voice-high, measuring-high, idle-high, completed
    measurementTimer: null,
    measurementAnimationId: null, // requestAnimationFrame ID for unified measurement
    idleTimer: null,
    retryCount: 0,
    maxRetries: 3,
    voiceDetectionThreshold: 0.15, // 音量閾値
    measurementDuration: 3000, // 3秒
    idleDuration: 3000, // 3秒

    // 測定データ収集
    measurementData: {
        lowPhase: {
            frequencies: [],
            lowestFreq: null,
            lowestNote: null,
            avgVolume: 0,
            measurementTime: 0
        },
        highPhase: {
            frequencies: [],
            highestFreq: null,
            highestNote: null,
            avgVolume: 0,
            measurementTime: 0
        },
        startTime: null,
        endTime: null
    },

    // 🧪 デバッグ表示用データ
    debugData: {
        isVisible: false,
        currentNote: null,
        currentFreq: null,
        currentVolume: null,
        detectionCount: 0,
        minFreq: null,
        maxFreq: null,
        minNote: null,
        maxNote: null,
        tempRange: null,
        detectionStatus: '待機中',
        micStatus: '未許可'
    }
};

// メイン初期化処理
document.addEventListener('DOMContentLoaded', async function() {
    // まず初期化を実行
    await initializeDemo();

    // PitchProライブラリ読み込み確認
    console.log('🔍 PitchPro v1.3.0 読み込み確認:');
    console.log('  PitchPro:', typeof PitchPro);
    console.log('  window.PitchPro:', window.PitchPro);

    // PitchProオブジェクトから必要なクラスを取得
    if (typeof PitchPro !== 'undefined' && PitchPro) {
        console.log('📌 PitchPro v1.3.0 検出成功');
        console.log('  PitchPro.AudioManager:', PitchPro.AudioManager);
        console.log('  PitchPro.PitchDetector:', PitchPro.PitchDetector);
        console.log('  PitchPro.AudioDetectionComponent:', PitchPro.AudioDetectionComponent);

        // バージョン情報表示の更新
        const adcStatus = document.getElementById('adc-status');
        if (adcStatus) {
            adcStatus.textContent = PitchPro.AudioDetectionComponent ? '利用可能' : '利用不可';
            adcStatus.style.color = PitchPro.AudioDetectionComponent ? '#10b981' : '#ef4444';
        }

        // デバイス最適化情報
        const deviceOpt = document.getElementById('device-opt');
        if (deviceOpt && PitchPro.DeviceDetection) {
            const specs = PitchPro.DeviceDetection.getDeviceSpecs();
            deviceOpt.textContent = `${specs.deviceType} (感度: ${specs.sensitivity}x)`;
        }

        // グローバルスコープに追加（後方互換性のため）
        if (PitchPro.AudioManager) {
            window.AudioManager = PitchPro.AudioManager;
            console.log('✅ AudioManager (v1.3.0) をグローバルスコープに追加');
        }
        if (PitchPro.PitchDetector) {
            window.PitchDetector = PitchPro.PitchDetector;
            console.log('✅ PitchDetector (v1.3.0) をグローバルスコープに追加');
        }
        if (PitchPro.AudioDetectionComponent) {
            window.AudioDetectionComponent = PitchPro.AudioDetectionComponent;
            console.log('✅ AudioDetectionComponent (v1.3.0) をグローバルスコープに追加');
        }
    }

    // 必須クラスの存在確認
    if (typeof AudioDetectionComponent === 'undefined') {
        console.error('❌ AudioDetectionComponentが読み込まれていません');
        showNotification('PitchProライブラリの読み込みに失敗しました', 'error');
        return;
    }

    // Lucideアイコン初期化
    lucide.createIcons();

    let controller = null;

    // 🎤 マイク許可ボタン
    document.getElementById('request-mic-permission').addEventListener('click', async () => {
        await requestMicrophonePermission();
    });

    // 🎯 音域テスト開始ボタン
    document.getElementById('begin-range-test-btn').addEventListener('click', async () => {
        await startVoiceRangeTest();
    });

    // 🔄 再測定ボタン
    document.getElementById('retry-measurement-btn').addEventListener('click', async () => {
        await retryCurrentMeasurement();
    });

    // 停止ボタン
    document.getElementById('stop-range-test-btn').addEventListener('click', () => {
        if (controller) {
            controller.stopTest();
            showNotification('テスト停止', 'info');
            document.getElementById('stop-range-test-btn').style.display = 'none';
        }
    });

    // 🚨 検出停止ボタン (音声検出のみ停止、プログレス継続)
    document.getElementById('stop-detection-btn').addEventListener('click', () => {
        stopVoiceDetectionOnly();
    });

    // 🧪 デバッグ表示切り替えボタン
    document.getElementById('toggle-debug-display').addEventListener('click', () => {
        toggleDebugDisplay();
    });

    console.log('✅ VoiceRangeTestController デモ準備完了');
    console.log('📌 PitchPro v1.3.0 統合版');
    console.log('🎯 「ワンメソッド音域テスト開始」ボタンを押してテストしてください');
    console.log('🔧 デバッグ用: window.debugBadgeDisplay() で表示状態確認');
    console.log('🧪 デバッグ表示: 「デバッグ表示ON」ボタンでリアルタイム音域データ確認');
});

// 基本テスト実装（VoiceRangeTestControllerが利用できない場合のフォールバック）
async function startBasicTest() {
    console.log('📋 基本的なAudioDetectionComponentテスト開始（効率化版）');

    try {
        // グローバルインスタンスがない場合のみ作成
        if (!globalAudioDetector) {
            console.log('🔧 AudioDetectionComponent基本テスト用作成 (v1.3.0確実動作版)');

            // コンストラクタパターンで確実に動作
            globalAudioDetector = new AudioDetectionComponent({
                volumeBarSelector: '#range-test-volume-bar',
                volumeTextSelector: '#range-test-volume-text',
                frequencySelector: '#range-test-frequency-value',
                debugMode: true,
                // コンストラクタでコールバック設定
                onPitchUpdate: (result) => {
                    if (result.frequency && result.note) {
                        console.log(`🎵 検出: ${result.note} (${result.frequency.toFixed(1)} Hz)`);
                    }
                    // 🧪 デバッグデータ更新（常に実行）
                    updateDebugData(result);
                    // 🧪 デバッグ表示更新（表示ON時のみ）
                    updateDebugDisplay();
                },
                onError: (error) => {
                    console.error('❌ 基本テストエラー:', error);
                }
            });

            await globalAudioDetector.initialize();
            console.log('✅ AudioDetectionComponent初期化成功 (v1.3.0確実動作版)');
        }

        // PitchProのstart()メソッドを使用
        if (globalAudioDetector.start) {
            globalAudioDetector.start();
            console.log('🎯 PitchPro start()メソッド使用（基本テスト）');
        } else {
            globalAudioDetector.startDetection();
            console.log('🔄 startDetection()フォールバック使用（基本テスト）');
        }

        // 🧪 デバッグ状態更新
        updateDebugStatus('基本テスト中', '録音中');

        // ステータス更新
        document.getElementById('main-status-text').textContent = 'マイク入力を検出中...';
        document.getElementById('sub-info-text').textContent = '声を出してテストしてください';

        // 停止ボタン表示
        document.getElementById('stop-range-test-btn').style.display = 'inline-block';
        document.getElementById('stop-range-test-btn').onclick = () => {
            // 効率的停止
            if (globalAudioDetector.stop) {
                globalAudioDetector.stop();
                console.log('🎯 PitchPro stop()メソッド使用（基本テスト停止）');
            } else {
                globalAudioDetector.stopDetection();
                console.log('🔄 stopDetection()フォールバック使用（基本テスト停止）');
            }
            showNotification('基本テスト停止', 'info');
            document.getElementById('stop-range-test-btn').style.display = 'none';
        };

    } catch (error) {
        console.error('❌ 基本テストエラー:', error);
        showNotification('基本テストエラー: ' + error.message, 'error');
    }
}

// マイク許可要求
async function requestMicrophonePermission() {
    try {
        const micStatusText = document.getElementById('mic-status-text');
        const micButton = document.getElementById('request-mic-permission');
        const testButton = document.getElementById('begin-range-test-btn');

        micStatusText.textContent = 'マイク許可要求中...';
        micButton.disabled = true;

        // マイク許可要求
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

        // すぐに停止（許可確認のみ）
        stream.getTracks().forEach(track => track.stop());

        globalState.micPermissionGranted = true;
        micStatusText.textContent = '✅ マイク許可済み';
        micStatusText.style.color = '#10b981';
        micButton.textContent = '✅ 許可済み';
        micButton.disabled = true;
        testButton.disabled = false;

        document.getElementById('main-status-text').textContent = '音域テスト開始ボタンを押してください';

        // マイクステータスを許可済み状態に更新
        updateMicStatus('standby');

        // 🧪 デバッグ状態更新
        updateDebugStatus(null, '許可済み');

        showNotification('マイク許可が完了しました', 'success');

    } catch (error) {
        console.error('❌ マイク許可エラー:', error);
        const micStatusText = document.getElementById('mic-status-text');
        micStatusText.textContent = '❌ マイク許可が拒否されました';
        micStatusText.style.color = '#ef4444';

        document.getElementById('request-mic-permission').disabled = false;
        showNotification('マイク許可が必要です', 'error');
    }
}

// 音域テスト開始
async function startVoiceRangeTest() {
    console.log('🎯 音域テスト開始 (v1.3.0修正版)');

    try {
        // 🧪 デバッグデータをリセット
        resetDebugData();

        // 既存のボタン状態を更新
        document.getElementById('begin-range-test-btn').style.display = 'none';
        document.getElementById('stop-range-test-btn').style.display = 'inline-flex';
        document.getElementById('stop-detection-btn').style.display = 'inline-flex';

        // マイクステータスを録音中に変更
        updateMicStatus('recording');

        // グローバル状態を初期化
        globalState.currentPhase = 'waiting-for-voice';
        globalState.measurementData.startTime = Date.now();
        console.log('📋 フェーズ設定完了:', {
            currentPhase: globalState.currentPhase,
            threshold: globalState.voiceDetectionThreshold
        });

        // グローバルインスタンスがない場合のみ作成
        if (!globalAudioDetector) {
            console.log('🔧 AudioDetectionComponent初回作成 (v1.3.0対応版)');
            console.log('📋 setCallbacks()メソッド問題のため、コンストラクタパターンを使用');

            // コンストラクタパターンで確実に動作させる
            globalAudioDetector = new AudioDetectionComponent({
                volumeBarSelector: '#range-test-volume-bar',
                volumeTextSelector: '#range-test-volume-text',
                frequencySelector: '#range-test-frequency-value',
                debugMode: true,
                // v1.3.0対応版: コンストラクタでコールバック設定
                onPitchUpdate: (result) => {
                    console.log('🎵 音程検出 (確実動作版):', result);
                    // 🧪 デバッグデータ更新（常に実行）
                    updateDebugData(result);
                    // 🧪 デバッグ表示更新（表示ON時のみ）
                    updateDebugDisplay();
                    handleVoiceDetection(result, globalAudioDetector);
                },
                onError: (error) => {
                    console.error('❌ 検出エラー (確実動作版):', error);
                },
                onVolumeUpdate: (volume) => {
                    // 音量更新処理（必要に応じて）
                }
            });

            await globalAudioDetector.initialize();
            console.log('✅ AudioDetectionComponent初期化完了 (v1.3.0対応版)');
        }

        // PitchPro v1.3.0: startDetection()メソッド
        globalAudioDetector.startDetection();
        console.log('🎯 PitchPro v1.3.0: startDetection()で音声検出開始');

        // 🧪 デバッグ状態更新
        updateDebugStatus('音声検出中', '録音中');

        document.getElementById('main-status-text').textContent = '低音域測定: 声を出してください';
        document.getElementById('sub-info-text').textContent = '声を認識したら自動で測定開始します';

        // アニメーション開始
        const rangeIcon = document.getElementById('range-icon');
        if (rangeIcon) {
            rangeIcon.classList.add('measuring');
        }

        console.log('✅ 音域テスト開始完了');

    } catch (error) {
        console.error('❌ 音域テスト開始エラー:', error);
        showNotification(`音域テスト開始に失敗しました: ${error.message}`, 'error');
        
        // エラー時は元の状態に戻す
        document.getElementById('begin-range-test-btn').style.display = 'inline-flex';
        document.getElementById('stop-range-test-btn').style.display = 'none';
        document.getElementById('stop-detection-btn').style.display = 'none';
        updateMicStatus('standby');
    }
}

// 声検出ハンドラー
function handleVoiceDetection(result, audioDetector) {
    console.log('🎵 handleVoiceDetection呼び出し:', {
        result: result,
        volume: result?.volume,
        frequency: result?.frequency,
        note: result?.note,
        currentPhase: globalState.currentPhase,
        threshold: globalState.voiceDetectionThreshold
    });

    // 測定データを常に記録（音量が閾値以下でも）
    recordMeasurementData(result);

    // 音量が閾値を超えた場合のみフェーズ遷移
    if (!result.volume || result.volume < globalState.voiceDetectionThreshold) {
        console.log('🔇 音量が閾値以下:', {
            volume: result.volume,
            threshold: globalState.voiceDetectionThreshold
        });
        return;
    }

    console.log('🔊 音量閾値超過 - フェーズ遷移チェック:', {
        currentPhase: globalState.currentPhase,
        volume: result.volume
    });

    switch (globalState.currentPhase) {
        case 'waiting-for-voice':
            console.log('🎯 低音測定開始');
            startLowPitchMeasurement(audioDetector);
            break;
        case 'waiting-for-voice-high':
            console.log('🎯 高音測定開始');
            startHighPitchMeasurement(audioDetector);
            break;
        default:
            console.log('🤔 予期しないフェーズ:', globalState.currentPhase);
    }
}

// 測定データ記録
function recordMeasurementData(result) {
    if (!result.frequency || !result.volume) return;

    const timestamp = Date.now();
    const currentPhase = globalState.currentPhase;

    // 低音測定フェーズ
    if (currentPhase === 'measuring-low') {
        const data = globalState.measurementData.lowPhase;
        data.frequencies.push({
            frequency: result.frequency,
            note: result.note,
            volume: result.volume,
            timestamp: timestamp
        });

        // 最低音記録
        if (!data.lowestFreq || result.frequency < data.lowestFreq) {
            data.lowestFreq = result.frequency;
            data.lowestNote = result.note;
        }

        // 平均音量計算
        const totalVolume = data.frequencies.reduce((sum, d) => sum + d.volume, 0);
        data.avgVolume = totalVolume / data.frequencies.length;
    }

    // 高音測定フェーズ
    if (currentPhase === 'measuring-high') {
        const data = globalState.measurementData.highPhase;
        data.frequencies.push({
            frequency: result.frequency,
            note: result.note,
            volume: result.volume,
            timestamp: timestamp
        });

        // 最高音記録
        if (!data.highestFreq || result.frequency > data.highestFreq) {
            data.highestFreq = result.frequency;
            data.highestNote = result.note;
        }

        // 平均音量計算
        const totalVolume = data.frequencies.reduce((sum, d) => sum + d.volume, 0);
        data.avgVolume = totalVolume / data.frequencies.length;
    }
}

// 音域計算
function calculateVoiceRange() {
    const lowData = globalState.measurementData.lowPhase;
    const highData = globalState.measurementData.highPhase;

    if (!lowData.lowestFreq || !highData.highestFreq) {
        return null;
    }

    // オクターブ数計算
    const octaves = Math.log2(highData.highestFreq / lowData.lowestFreq);

    // 半音数計算
    const semitones = Math.round(octaves * 12);

    return {
        lowNote: lowData.lowestNote,
        highNote: highData.highestNote,
        lowFreq: lowData.lowestFreq,
        highFreq: highData.highestFreq,
        octaves: parseFloat(octaves.toFixed(2)),
        semitones: semitones,
        range: `${lowData.lowestNote} - ${highData.highestNote}`,
        totalMeasurementTime: globalState.measurementData.endTime - globalState.measurementData.startTime,
        lowPhaseDataCount: lowData.frequencies.length,
        highPhaseDataCount: highData.frequencies.length,
        avgLowVolume: Math.round(lowData.avgVolume * 100),
        avgHighVolume: Math.round(highData.avgVolume * 100)
    };
}

// 音域テスト結果表示
function displayVoiceRangeResults(results) {
    // 結果セクションを表示
    document.getElementById('results-section').style.display = 'block';

    // 基本情報
    document.getElementById('result-range').textContent = results.range;
    document.getElementById('result-octaves').textContent = `${results.octaves}オクターブ (${results.semitones}半音)`;
    document.getElementById('result-low-freq').textContent = `${results.lowFreq.toFixed(1)} Hz (${results.lowNote})`;
    document.getElementById('result-high-freq').textContent = `${results.highFreq.toFixed(1)} Hz (${results.highNote})`;

    // 詳細統計があれば表示
    const detailsEl = document.getElementById('result-details');
    if (detailsEl) {
        detailsEl.innerHTML = `
            <div class="result-info-row">
                <span>測定時間</span>
                <span class="result-info-value">${(results.totalMeasurementTime / 1000).toFixed(1)}秒</span>
            </div>
            <div class="result-info-row">
                <span>低音域データ数</span>
                <span class="result-info-value">${results.lowPhaseDataCount}件</span>
            </div>
            <div class="result-info-row">
                <span>高音域データ数</span>
                <span class="result-info-value">${results.highPhaseDataCount}件</span>
            </div>
            <div class="result-info-row">
                <span>平均音量 (低音)</span>
                <span class="result-info-value">${results.avgLowVolume}%</span>
            </div>
            <div class="result-info-row">
                <span>平均音量 (高音)</span>
                <span class="result-info-value">${results.avgHighVolume}%</span>
            </div>
        `;
    }

    console.log('📊 音域テスト結果:', results);
}

/**
 * 測定と円形プログレスバーの更新を完全に同期させて実行します。
 * @param {number} duration - 測定時間 (ms)
 * @param {function} onComplete - 測定完了時に呼び出すコールバック関数
 */
function runMeasurementPhase(duration, onComplete) {
    console.log(`🎬 統合測定フェーズ開始: ${duration}ms`);

    const progressCircle = document.querySelector('.voice-progress-circle');
    if (!progressCircle) return;

    const startTime = performance.now();
    let animationFrameId = null;

    // 瞬時にプログレスを0%にリセット
    progressCircle.style.transition = 'none';
    updateCircularProgress(0);

    // DOMの更新を強制的に反映させる（リフロー）
    progressCircle.offsetHeight;

    // アニメーションを再有効化
    progressCircle.style.transition = 'stroke-dashoffset 0.1s linear';

    function tick(currentTime) {
        const elapsedTime = currentTime - startTime;
        const progress = Math.min((elapsedTime / duration) * 100, 100);

        // UIを更新
        updateCircularProgress(progress);

        if (elapsedTime < duration) {
            // 測定が完了していなければ、次のフレームを要求
            animationFrameId = requestAnimationFrame(tick);
        } else {
            // 測定完了
            updateCircularProgress(100); // 確実に100%にする
            console.log('✅ 統合測定フェーズ完了 - プログレス100%設定');
            
            // プログレスバーのアニメーションが完了するまで少し待つ
            setTimeout(() => {
                console.log('✅ プログレスバーアニメーション完了 - コールバック実行');
                if (onComplete) {
                    onComplete(); // 完了時のコールバックを呼び出す
                }
            }, 150); // 0.1s のアニメーション + 50ms のマージン
        }
    }

    // アニメーションループを開始
    animationFrameId = requestAnimationFrame(tick);

    // 途中で停止できるように、animationFrameIdをグローバルに保持（任意）
    globalState.measurementAnimationId = animationFrameId;
}

// 低音測定開始
function startLowPitchMeasurement() {
    console.log('🎯 低音域測定開始 (新方式)');
    globalState.currentPhase = 'measuring-low';

    document.getElementById('main-status-text').textContent = '低音域を測定中...';

    // 古いタイマーを削除し、新しい統合関数を呼び出す
    runMeasurementPhase(globalState.measurementDuration, completeLowPitchMeasurement);
}

// 低音測定完了
function completeLowPitchMeasurement() {
    console.log('✅ 低音域測定完了');
    globalState.currentPhase = 'idle-low';

    // 測定結果の検証
    const lowData = globalState.measurementData.lowPhase;
    const hasValidData = lowData.frequencies.length > 0 && lowData.lowestFreq;

    if (hasValidData) {
        console.log('✅ 低音域測定成功:', {
            dataCount: lowData.frequencies.length,
            lowestFreq: lowData.lowestFreq,
            lowestNote: lowData.lowestNote
        });

        // 成功時: チェックマーク表示
        setTimeout(() => {
            updateBadgeForConfirmed();
        }, 100);

        // 🧪 デバッグ状態更新
        updateDebugStatus('低音測定完了', '録音中');

        // アイドルタイム開始
        globalState.idleTimer = setTimeout(() => {
            startHighPitchPhase();
        }, globalState.idleDuration);

    } else {
        console.warn('⚠️ 低音域測定失敗 - データが記録されませんでした');

        // 失敗時の処理
        handleLowPitchMeasurementFailure();
    }
}

// 低音測定失敗時の処理
function handleLowPitchMeasurementFailure() {
    console.log('🔄 低音測定失敗 - 対処開始');

    // リトライ回数チェック
    if (globalState.retryCount < globalState.maxRetries) {
        globalState.retryCount++;

        // 🧪 デバッグ状態更新
        updateDebugStatus(`低音測定失敗 (${globalState.retryCount}/${globalState.maxRetries})`, '録音中');

        // 失敗表示
        updateBadgeForFailure();
        document.getElementById('main-status-text').textContent = `低音測定失敗 - 再測定します (${globalState.retryCount}/${globalState.maxRetries})`;
        document.getElementById('sub-info-text').textContent = 'より大きな声で低い音を出してください';

        // 再測定ボタンを表示
        document.getElementById('retry-measurement-btn').style.display = 'inline-flex';

        showNotification('低音の検出に失敗しました。再測定してください。', 'warning');

        // 2秒後に自動再測定開始
        setTimeout(() => {
            retryLowPitchMeasurement();
        }, 2000);

    } else {
        // 最大リトライ回数に達した場合
        console.error('❌ 低音測定: 最大リトライ回数に達しました');

        // 🧪 デバッグ状態更新
        updateDebugStatus('低音測定諦め', '録音中');

        updateBadgeForError();
        document.getElementById('main-status-text').textContent = '低音測定をスキップします';
        document.getElementById('sub-info-text').textContent = '高音測定に進みます';

        showNotification('低音測定をスキップして高音測定に進みます', 'info');

        // 高音測定に強制進行
        setTimeout(() => {
            startHighPitchPhase();
        }, 3000);
    }
}

// 低音測定の再試行
function retryLowPitchMeasurement() {
    console.log(`🔄 低音測定再試行 (${globalState.retryCount}回目)`);

    // 再測定ボタンを非表示
    document.getElementById('retry-measurement-btn').style.display = 'none';

    // 待機状態に戻す
    globalState.currentPhase = 'waiting-for-voice';
    document.getElementById('main-status-text').textContent = '低音域測定: 声を出してください（再測定）';
    document.getElementById('sub-info-text').textContent = 'より大きく、より低い音で歌ってください';

    // バッジを待機状態に戻す
    updateBadgeForWaiting('arrow-down');
}

// バッジの失敗表示
function updateBadgeForFailure() {
    const rangeIcon = document.getElementById('range-icon');
    if (rangeIcon) {
        rangeIcon.innerHTML = '<i data-lucide="x" style="width: 80px; height: 80px; color: #ef4444;"></i>';
        rangeIcon.classList.remove('measuring');
    }
    lucide.createIcons();
}

// バッジのエラー表示
function updateBadgeForError() {
    const rangeIcon = document.getElementById('range-icon');
    if (rangeIcon) {
        rangeIcon.innerHTML = '<i data-lucide="alert-triangle" style="width: 80px; height: 80px; color: #f59e0b;"></i>';
        rangeIcon.classList.remove('measuring');
    }
    lucide.createIcons();
}

// 高音測定失敗時の処理
function handleHighPitchMeasurementFailure() {
    console.log('🔄 高音測定失敗 - 対処開始');

    // 高音測定は最後なので、低音データがあるかチェック
    const lowData = globalState.measurementData.lowPhase;
    const hasLowData = lowData.frequencies.length > 0 && lowData.lowestFreq;

    if (hasLowData) {
        // 低音データがある場合: 部分的な結果として表示
        console.log('📊 低音データのみで部分結果を表示');

        // 🧪 デバッグ状態更新
        updateDebugStatus('高音測定失敗・部分結果表示', '録音停止');

        updateBadgeForError();
        document.getElementById('main-status-text').textContent = '高音測定失敗 - 低音域のみの結果を表示';
        document.getElementById('sub-info-text').textContent = '低音域の測定結果のみ利用可能です';

        showNotification('高音測定に失敗しましたが、低音域の結果を表示します', 'warning');

        // 部分的な結果を表示
        setTimeout(() => {
            const results = calculatePartialVoiceRange();
            displayResults(results);
        }, 2000);

    } else {
        // 両方とも失敗した場合
        console.error('❌ 低音・高音両方の測定に失敗');

        // 🧪 デバッグ状態更新
        updateDebugStatus('測定完全失敗', '録音停止');

        updateBadgeForError();
        document.getElementById('main-status-text').textContent = '音域測定に失敗しました';
        document.getElementById('sub-info-text').textContent = '再測定ボタンを押してやり直してください';

        // 再測定ボタンを表示
        document.getElementById('retry-measurement-btn').style.display = 'inline-flex';

        showNotification('音域測定に失敗しました。環境を確認して再測定してください。', 'error');
    }
}

// 部分的な音域計算（低音データのみ）
function calculatePartialVoiceRange() {
    const lowData = globalState.measurementData.lowPhase;

    // 低音データのみの場合
    return {
        range: `${lowData.lowestNote} ～ (高音測定失敗)`,
        octaves: '測定不完全',
        lowPitch: {
            frequency: lowData.lowestFreq,
            note: lowData.lowestNote
        },
        highPitch: null,
        totalMeasurementTime: Date.now() - globalState.measurementData.startTime,
        lowPhaseDataCount: lowData.frequencies.length,
        highPhaseDataCount: 0,
        avgLowVolume: (lowData.avgVolume * 100).toFixed(1),
        avgHighVolume: '測定失敗',
        measurementQuality: '部分的'
    };
}

// 高音測定フェーズ開始
function startHighPitchPhase() {
    console.log('🔼 高音測定フェーズ開始');
    globalState.currentPhase = 'waiting-for-voice-high';

    // 円形プログレスバーを瞬時にリセット（アニメーション無効）
    updateCircularProgressInstantly(0);
    
    // UI更新
    document.getElementById('main-status-text').textContent = '高音域測定: 声を出してください';
    document.getElementById('sub-info-text').textContent = '声を認識したら自動で測定開始します';
    updateBadgeForWaiting('arrow-up');
}

// 高音測定開始
function startHighPitchMeasurement() {
    console.log('🎯 高音域測定開始 (新方式)');
    globalState.currentPhase = 'measuring-high';

    document.getElementById('main-status-text').textContent = '高音域を測定中...';

    // 古いタイマーを削除し、新しい統合関数を呼び出す
    runMeasurementPhase(globalState.measurementDuration, completeHighPitchMeasurement);
}

// 高音測定完了
function completeHighPitchMeasurement() {
    console.log('✅ 高音域測定完了');
    globalState.currentPhase = 'completed';
    globalState.measurementData.endTime = Date.now();

    // 測定結果の検証
    const highData = globalState.measurementData.highPhase;
    const hasValidData = highData.frequencies.length > 0 && highData.highestFreq;

    if (hasValidData) {
        console.log('✅ 高音域測定成功:', {
            dataCount: highData.frequencies.length,
            highestFreq: highData.highestFreq,
            highestNote: highData.highestNote
        });

        // 成功時: チェックマーク表示
        setTimeout(() => {
            updateBadgeForConfirmed();
        }, 100);

        // 🧪 デバッグ状態更新
        updateDebugStatus('高音測定完了', '録音中');

    } else {
        console.warn('⚠️ 高音域測定失敗 - データが記録されませんでした');

        // 失敗時の処理（高音測定は最後なので、結果表示に進む）
        handleHighPitchMeasurementFailure();
        return; // 早期リターンで以下の処理をスキップ
    }
    
    // AudioDetector効率的停止
    if (globalAudioDetector) {
        if (globalAudioDetector.stop) {
            globalAudioDetector.stop();
            console.log('🎯 PitchPro stop()メソッド使用（測定完了）');
        } else {
            globalAudioDetector.stopDetection();
            console.log('🔄 stopDetection()フォールバック使用（測定完了）');
        }
    }
    
    // 結果計算と表示
    const results = calculateVoiceRange();
    if (results) {
        displayVoiceRangeResults(results);
    }
    
    // 音量バーリセット
    resetVolumeDisplay();

    // UI更新
    document.getElementById('stop-range-test-btn').style.display = 'none';
    document.getElementById('stop-detection-btn').style.display = 'none';
    document.getElementById('begin-range-test-btn').style.display = 'inline-block';

    // マイクステータスを待機状態に戻す
    updateMicStatus('standby');

    // 円形プログレスバーを瞬時にリセット
    setTimeout(() => {
        updateCircularProgressInstantly(0);
    }, 1000);

    showNotification('音域テスト完了！', 'success');
}

// 再測定
async function retryCurrentMeasurement() {
    if (globalState.retryCount >= globalState.maxRetries) {
        showNotification('最大再試行回数に達しました', 'error');
        return;
    }

    globalState.retryCount++;
    console.log(`🔄 再測定 (${globalState.retryCount}/${globalState.maxRetries})`);

    clearTimeout(globalState.measurementTimer);
    clearTimeout(globalState.idleTimer);

    if (globalState.currentPhase.includes('low')) {
        globalState.currentPhase = 'waiting-for-voice';
        document.getElementById('main-status-text').textContent = '低音域測定: 声を出してください（再測定）';
        updateBadgeForWaiting('arrow-down');
    } else if (globalState.currentPhase.includes('high')) {
        globalState.currentPhase = 'waiting-for-voice-high';
        document.getElementById('main-status-text').textContent = '高音域測定: 声を出してください（再測定）';
        updateBadgeForWaiting('arrow-up');
    }

    showNotification(`再測定を開始します (${globalState.retryCount}回目)`, 'info');
}

// 全測定停止
function stopAllMeasurements() {
    console.log('🛑 全測定停止（v1.3.0修正版）');

    // 新しい統合測定のanimationFrameを停止
    if (globalState.measurementAnimationId) {
        cancelAnimationFrame(globalState.measurementAnimationId);
        globalState.measurementAnimationId = null;
    }

    // 従来のタイマー停止（互換性のため）
    clearTimeout(globalState.measurementTimer);
    clearTimeout(globalState.idleTimer);

    // 円形プログレスタイマー停止（互換性のため）
    if (globalState.progressTimer) {
        clearInterval(globalState.progressTimer);
        globalState.progressTimer = null;
    }

    // AudioDetector効率的停止（破棄せず再利用のため停止のみ）
    if (globalAudioDetector) {
        // PitchPro v1.3.0修正版: stopDetection()メソッド使用
        globalAudioDetector.stopDetection();
        console.log('🎯 PitchPro v1.3.0修正版: stopDetection()で音声検出停止');
        
        // インスタンスは破棄せず再利用のため保持
        window.currentAudioDetector = globalAudioDetector;
    }

    // 状態リセット
    globalState.currentPhase = 'idle';
    globalState.retryCount = 0;

    // UI リセット（音量バーと円形プログレス）
    resetVolumeDisplay();
    resetCircularProgress();

    // マイクステータスを待機状態に戻す
    updateMicStatus('standby');

    document.getElementById('main-status-text').textContent = 'テスト停止';
    document.getElementById('sub-info-text').textContent = '待機中...';
    updateBadgeForWaiting('arrow-down');

    document.getElementById('stop-range-test-btn').style.display = 'none';
    document.getElementById('stop-detection-btn').style.display = 'none';
    document.getElementById('retry-measurement-btn').style.display = 'none';
    document.getElementById('begin-range-test-btn').style.display = 'inline-block';

    showNotification('測定を停止しました', 'info');
}

// 音声検出のみ停止（プログレス継続）
function stopVoiceDetectionOnly() {
    console.log('🚨 音声検出のみ停止（プログレス継続）');
    
    // AudioDetector効率的停止（破棄せず再利用のため停止のみ）
    if (globalAudioDetector) {
        // PitchPro v1.3.0修正版: stopDetection()メソッド復活
        globalAudioDetector.stopDetection();
        console.log('🎯 PitchPro v1.3.0修正版: stopDetection()で音声検出停止');
        
        // インスタンスは破棄せず再利用のため保持
        window.currentAudioDetector = globalAudioDetector;
    }

    // 音量バーと周波数表示のリセット
    resetVolumeDisplay();
    
    // ボタン表示を調整
    document.getElementById('stop-detection-btn').style.display = 'none';
    document.getElementById('stop-range-test-btn').style.display = 'inline-block';
    
    // ステータス更新
    document.getElementById('main-status-text').textContent = '音声検出停止中（プログレス継続）';
    document.getElementById('sub-info-text').textContent = '円形プログレスは継続実行中です';
    
    showNotification('音声検出を停止しました（プログレス継続中）', 'info');
}

// 音量表示リセット
function resetVolumeDisplay() {
    const volumeBar = document.getElementById('range-test-volume-bar');
    const volumeText = document.getElementById('range-test-volume-text');
    const frequency = document.getElementById('range-test-frequency-value');

    if (volumeBar) {
        volumeBar.style.width = '0%';
    }
    if (volumeText) {
        volumeText.textContent = '0%';
    }
    if (frequency) {
        frequency.textContent = '0 Hz';
    }
}

// 円形プログレスバー制御関数
function updateCircularProgress(progress) {
    const progressCircle = document.querySelector('.voice-progress-circle');
    if (progressCircle) {
        const circumference = 2 * Math.PI * 72; // r=72の円周
        const offset = circumference - (progress / 100) * circumference;
        progressCircle.style.strokeDashoffset = offset;
        console.log(`🔄 円形プログレス更新: ${progress}% (offset: ${offset})`);
    }
}

// 瞬時プログレス更新（アニメーション制御）
function updateCircularProgressInstantly(progress) {
    const progressCircle = document.querySelector('.voice-progress-circle');
    if (progressCircle) {
        const circumference = 2 * Math.PI * 72;
        const offset = circumference - (progress / 100) * circumference;
        
        // アニメーション完全無効化
        progressCircle.style.transition = 'none';
        progressCircle.style.strokeDashoffset = offset;
        console.log(`⚡ 円形プログレス瞬時更新: ${progress}%`);
        
        // アニメーション再有効化を大幅に遅らせる
        setTimeout(() => {
            progressCircle.style.transition = 'stroke-dashoffset 0.3s ease';
        }, 200); // 20ms → 200ms
    }
}

function resetCircularProgress() {
    const progressCircle = document.querySelector('.voice-progress-circle');
    if (progressCircle) {
        progressCircle.style.strokeDashoffset = '452'; // 初期状態（0%）
        console.log('🔄 円形プログレス初期化');
    }
}

function resetCircularProgressInstantly() {
    const progressCircle = document.querySelector('.voice-progress-circle');
    if (progressCircle) {
        // アニメーションを一時的に無効化
        progressCircle.style.transition = 'none';
        progressCircle.style.strokeDashoffset = '452'; // 瞬時に0%に戻す
        console.log('⚡ 円形プログレス瞬時リセット');
        
        // 少し後でアニメーションを再有効化
        setTimeout(() => {
            progressCircle.style.transition = 'stroke-dashoffset 0.3s ease';
        }, 50);
    }
}

function startCircularProgressAnimation() {
    const progressCircle = document.querySelector('.voice-progress-circle');
    if (progressCircle) {
        progressCircle.style.transition = 'stroke-dashoffset 0.3s ease';
        console.log('🎬 円形プログレスアニメーション開始');
    }
}

// 測定中の円形プログレス更新
// 統合測定制御関数（同期方式）
// この関数は runMeasurementPhase() に置き換えられました
function startMeasurementWithSyncedProgress(duration = 3000) {
    console.warn('⚠️ この関数は非推奨です。runMeasurementPhase() を使用してください。');
    // 互換性のため、新しい関数を呼び出す
    runMeasurementPhase(duration, () => {
        console.log('✅ 互換性モードで測定完了');
    });
}

// 旧関数（互換性のため残す）
// この関数は runMeasurementPhase() に置き換えられました
function startMeasurementProgress(duration) {
    console.warn('⚠️ この関数は非推奨です。runMeasurementPhase() を使用してください。');
    // 互換性のため、新しい関数を呼び出す（コールバックなしで実行のみ）
    runMeasurementPhase(duration, null);
}

// PitchProメソッド統合処理
// この関数は runMeasurementPhase() に置き換えられました
function startMeasurementWithProgress() {
    console.warn('⚠️ この関数は非推奨です。runMeasurementPhase() を使用してください。');
    // 新しい統合関数を使用
    runMeasurementPhase(globalState.measurementDuration, () => {
        console.log('✅ 測定開始統合処理完了（新方式）');
    });
}

// この関数は runMeasurementPhase() の統合により不要になりました
function resetMeasurementWithProgress() {
    console.warn('⚠️ この関数は非推奨です。runMeasurementPhase() では自動でリセットされます。');
    
    // runMeasurementPhase() は開始時に自動的にプログレスをリセットするため、
    // 手動でのリセットは不要です。互換性のため最小限の処理のみ実行
    resetCircularProgress();
    
    console.log('✅ 最小限のリセット処理完了');
}

// フェーズ完了処理（同期制御）
// この関数は runMeasurementPhase() の統合により不要になりました
function completeMeasurementPhase() {
    console.warn('⚠️ この関数は非推奨です。runMeasurementPhase() のコールバックを使用してください。');
    
    // runMeasurementPhase() のコールバック機能により、この複雑な制御は不要になりました
    // 互換性のため最小限の処理のみ実行
    updateCircularProgress(100);
    updateBadgeForConfirmed();
    
    console.log('✅ 最小限のフェーズ完了処理');
}

// 高音フェーズ開始（瞬時リセット）
// この関数は既存の startHighPitchPhase() に置き換えられました
function startHighPitchPhaseWithSync() {
    console.warn('⚠️ この関数は非推奨です。startHighPitchPhase() を使用してください。');
    // 既存の関数を呼び出す
    startHighPitchPhase();
}

// テスト最終化（瞬時リセット）
// この関数の機能は completeHighPitchMeasurement() に統合されました
function finalizeTestWithSync() {
    console.warn('⚠️ この関数は非推奨です。completeHighPitchMeasurement() を使用してください。');
    
    // 既存の関数で必要な処理は既に実行されているため、
    // 重複を避けてメッセージのみ出力
    console.log('✅ テスト最終化処理は completeHighPitchMeasurement() で実行済み');
}

// バッジ表示更新関数
function updateBadgeForWaiting(iconType) {
    const rangeIcon = document.getElementById('range-icon');
    const countdownDisplay = document.getElementById('countdown-display');
    const badge = document.querySelector('.voice-note-badge');

    if (rangeIcon && countdownDisplay && badge) {
        const iconSrc = iconType === 'arrow-up' ? './icons/arrow-up.png' : './icons/arrow-down.png';
        // インラインスタイルを削除し、CSSクラスで制御
        rangeIcon.innerHTML = `<img src="${iconSrc}" alt="${iconType}" class="range-icon-img">`;
        rangeIcon.style.display = 'block';
        countdownDisplay.style.display = 'none';
        badge.classList.remove('measuring', 'confirmed');
    }
}

function updateBadgeForMeasuring() {
    const badge = document.querySelector('.voice-note-badge');
    if (badge) {
        badge.classList.add('measuring');
        badge.classList.remove('confirmed');
    }
    document.getElementById('retry-measurement-btn').style.display = 'inline-block';
}

function updateBadgeForConfirmed() {
    const rangeIcon = document.getElementById('range-icon');
    const countdownDisplay = document.getElementById('countdown-display');
    const badge = document.querySelector('.voice-note-badge');

    if (rangeIcon && countdownDisplay && badge) {
        // インラインスタイルを削除し、CSSクラスで制御
        rangeIcon.innerHTML = '<img src="./icons/check.png" alt="測定完了" class="range-icon-img">';
        rangeIcon.style.display = 'block';
        countdownDisplay.style.display = 'none';

        // クラス更新（緑の背景継続のため）
        badge.classList.add('confirmed');
        badge.classList.remove('measuring');

        // アニメーション用の一時的なクラスを追加
        badge.classList.add('confirming-animation');

        // アニメーション完了後にアニメーション用クラスのみを削除
        setTimeout(() => {
            badge.classList.remove('confirming-animation');
            // confirmedクラスは残して緑の背景を継続
        }, 600); // 0.6s のアニメーション時間と同じ
    }
    document.getElementById('retry-measurement-btn').style.display = 'none';
}
