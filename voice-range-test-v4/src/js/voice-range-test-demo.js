/**
 * voice-range-test-demo.js - 音域テストデモページメインスクリプト
 *
 * @version 2.0.0
 * @description PitchPro v1.2.2対応版統合デモ
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

    document.getElementById('results-section').style.display = 'block';
    document.getElementById('stop-range-test-btn').style.display = 'none';
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
    }
};

// メイン初期化処理
document.addEventListener('DOMContentLoaded', async function() {
    // まず初期化を実行
    await initializeDemo();

    // PitchProライブラリ読み込み確認
    console.log('🔍 PitchPro v1.2.2 読み込み確認:');
    console.log('  PitchPro:', typeof PitchPro);
    console.log('  window.PitchPro:', window.PitchPro);

    // PitchProオブジェクトから必要なクラスを取得
    if (typeof PitchPro !== 'undefined' && PitchPro) {
        console.log('📌 PitchPro v1.2.2 検出成功');
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
            console.log('✅ AudioManager (v1.2.2) をグローバルスコープに追加');
        }
        if (PitchPro.PitchDetector) {
            window.PitchDetector = PitchPro.PitchDetector;
            console.log('✅ PitchDetector (v1.2.2) をグローバルスコープに追加');
        }
        if (PitchPro.AudioDetectionComponent) {
            window.AudioDetectionComponent = PitchPro.AudioDetectionComponent;
            console.log('✅ AudioDetectionComponent (v1.2.2) をグローバルスコープに追加');
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

    console.log('✅ VoiceRangeTestController デモ準備完了');
    console.log('📌 PitchPro v1.2.2 統合版');
    console.log('🎯 「ワンメソッド音域テスト開始」ボタンを押してテストしてください');
    console.log('🔧 デバッグ用: window.debugBadgeDisplay() で表示状態確認');
});

// 基本テスト実装（VoiceRangeTestControllerが利用できない場合のフォールバック）
async function startBasicTest() {
    console.log('📋 基本的なAudioDetectionComponentテスト開始（効率化版）');

    try {
        // グローバルインスタンスがない場合のみ作成
        if (!globalAudioDetector) {
            console.log('🔧 AudioDetectionComponent基本テスト用作成 (v1.2.2)');
            globalAudioDetector = new AudioDetectionComponent({
                volumeBarSelector: '#range-test-volume-bar',
                volumeTextSelector: '#range-test-volume-text',
                frequencySelector: '#range-test-frequency-value',
                debugMode: true,
                // PitchPro v1.2.2: 初期化時にコールバックを設定
                onPitchUpdate: (result) => {
                    if (result.pitch && result.note) {
                        console.log(`🎵 検出: ${result.note} (${result.pitch.toFixed(1)} Hz)`);
                    }
                }
            });

            await globalAudioDetector.initialize();
            console.log('✅ AudioDetectionComponent初期化成功 (v1.2.2)');
        }

        // PitchProのstart()メソッドを使用
        if (globalAudioDetector.start) {
            globalAudioDetector.start();
            console.log('🎯 PitchPro start()メソッド使用（基本テスト）');
        } else {
            globalAudioDetector.startDetection();
            console.log('🔄 startDetection()フォールバック使用（基本テスト）');
        }

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
    if (!globalState.micPermissionGranted) {
        showNotification('まずマイク許可を行ってください', 'warning');
        return;
    }

    try {
        console.log('🎬 改良版音域テスト開始（統合処理版）');
        globalState.currentPhase = 'waiting-for-voice';
        globalState.retryCount = 0;

        // 測定データリセット
        globalState.measurementData = {
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
            startTime: Date.now(),
            endTime: null
        };

        // 音量バーと円形プログレスをリセット
        resetVolumeDisplay();
        resetCircularProgress();

        // グローバルインスタンスがない場合のみ作成
        if (!globalAudioDetector) {
            console.log('🔧 AudioDetectionComponent初回作成 (v1.2.2)');
            globalAudioDetector = new AudioDetectionComponent({
                volumeBarSelector: '#range-test-volume-bar',
                volumeTextSelector: '#range-test-volume-text',
                frequencySelector: '#range-test-frequency-value',
                debugMode: true,
                // PitchPro v1.2.2: 初期化時にコールバックを設定
                onPitchUpdate: (result) => {
                    handleVoiceDetection(result, globalAudioDetector);
                },
                onVolumeUpdate: (volume) => {
                    // 音量更新処理（必要に応じて）
                },
                onError: (error) => {
                    console.error('❌ AudioDetectionComponent エラー:', error);
                }
            });

            await globalAudioDetector.initialize();
            console.log('✅ AudioDetectionComponent初期化完了 (v1.2.2)');
        }

        // PitchProのstart()メソッドを使用（効率的）
        if (globalAudioDetector.start) {
            globalAudioDetector.start();
            console.log('🎯 PitchPro start()メソッド使用');
        } else {
            // フォールバック: startDetection()使用
            globalAudioDetector.startDetection();
            console.log('🔄 startDetection()フォールバック使用');
        }

        document.getElementById('main-status-text').textContent = '低音域測定: 声を出してください';
        document.getElementById('sub-info-text').textContent = '声を認識したら自動で測定開始します';
        updateBadgeForWaiting('arrow-down');

        // マイクステータスを録音中（赤エフェクト）に更新
        updateMicStatus('recording');

        document.getElementById('begin-range-test-btn').style.display = 'none';
        document.getElementById('stop-range-test-btn').style.display = 'inline-block';
        document.getElementById('stop-detection-btn').style.display = 'inline-block';

        // 結果セクションを非表示
        document.getElementById('results-section').style.display = 'none';

        // グローバル参照を保持
        window.currentAudioDetector = globalAudioDetector;

    } catch (error) {
        console.error('❌ 音域テスト開始エラー:', error);
        showNotification('テスト開始エラー: ' + error.message, 'error');
    }
}

// 声検出ハンドラー
function handleVoiceDetection(result, audioDetector) {
    // 測定データを常に記録（音量が閾値以下でも）
    recordMeasurementData(result);

    // 音量が閾値を超えた場合のみフェーズ遷移
    if (!result.volume || result.volume < globalState.voiceDetectionThreshold) {
        return;
    }

    switch (globalState.currentPhase) {
        case 'waiting-for-voice':
            startLowPitchMeasurement(audioDetector);
            break;
        case 'waiting-for-voice-high':
            startHighPitchMeasurement(audioDetector);
            break;
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

    // runMeasurementPhaseで既に100%設定済みなので、直接チェックマーク表示
    setTimeout(() => {
        updateBadgeForConfirmed();
    }, 100); // 100ms待機
    
    // 低音域データ記録（仮想データ）
    const lowData = globalState.measurementData.lowPhase;
    lowData.lowestFreq = 150 + Math.random() * 50; // 150-200Hz
    lowData.lowestNote = 'F3-G3';
    lowData.avgVolume = 0.8 + Math.random() * 0.15; // 80-95%
    lowData.measurementTime = globalState.measurementDuration;
    
    // アイドルタイム開始
    globalState.idleTimer = setTimeout(() => {
        startHighPitchPhase();
    }, globalState.idleDuration);
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

    // runMeasurementPhaseで既に100%設定済みなので、直接チェックマーク表示
    setTimeout(() => {
        updateBadgeForConfirmed();
    }, 100); // 100ms待機
    
    // 高音域データ記録（仮想データ）
    const highData = globalState.measurementData.highPhase;
    highData.highestFreq = 350 + Math.random() * 150; // 350-500Hz
    highData.highestNote = 'F4-C5';
    highData.avgVolume = 0.75 + Math.random() * 0.20; // 75-95%
    highData.measurementTime = globalState.measurementDuration;
    
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
    console.log('🛑 全測定停止（統合処理版）');

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
        // PitchProのstop()メソッドを使用（推奨）
        if (globalAudioDetector.stop) {
            globalAudioDetector.stop();
            console.log('🎯 PitchPro stop()メソッド使用');
        } else {
            // フォールバック: stopDetection()使用
            globalAudioDetector.stopDetection();
            console.log('🔄 stopDetection()フォールバック使用');
        }
        
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
    document.getElementById('retry-measurement-btn').style.display = 'none';
    document.getElementById('begin-range-test-btn').style.display = 'inline-block';

    showNotification('測定を停止しました', 'info');
}

// 音声検出のみ停止（プログレス継続）
function stopVoiceDetectionOnly() {
    console.log('🚨 音声検出のみ停止（プログレス継続）');
    
    // AudioDetector効率的停止（破棄せず再利用のため停止のみ）
    if (globalAudioDetector) {
        // PitchProのstop()メソッドを使用（推奨）
        if (globalAudioDetector.stop) {
            globalAudioDetector.stop();
            console.log('🎯 PitchPro stop()メソッド使用（検出停止）');
        } else {
            // フォールバック: stopDetection()使用
            globalAudioDetector.stopDetection();
            console.log('🔄 stopDetection()フォールバック使用（検出停止）');
        }
        
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
