/**
 * voice-range-test-demo.js - 音域テストデモページメインスクリプト
 *
 * @version 2.0.0
 * @description PitchPro v1.3.1対応版統合デモ
 * @date 2025-01-16
 */

// VoiceRangeTestControllerの動的インポート
let VoiceRangeTestController;

// グローバルなaudioDetectorインスタンス（window.globalAudioDetectorとして共有）
// ローカル変数削除 - window.globalAudioDetectorを直接使用

// 初期化関数
async function initializeDemo() {
    // 注意: VoiceRangeTestController は統合版では使用しない
    console.log('📋 音域テストデモ初期化完了（統合版）');
}

// デバッグ用関数削除済み

// 結果表示関数
function displayResults(results) {
    document.getElementById('result-range').textContent = results.range || '-';
    document.getElementById('result-octaves').textContent = results.octaves ? `${results.octaves}オクターブ` : '-';
    document.getElementById('result-low-freq').textContent = results.lowPitch ?
        `${results.lowPitch.frequency.toFixed(1)} Hz (${results.lowPitch.note})` : '-';
    document.getElementById('result-high-freq').textContent = results.highPitch ?
        `${results.highPitch.frequency.toFixed(1)} Hz (${results.highPitch.note})` : '-';

    // 音域テストセクションを非表示にし、結果セクションを表示
    document.getElementById('range-test-section').classList.add('hidden');
    document.getElementById('result-section').classList.remove('hidden');

    console.log('📋 測定結果表示完了');
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
// この関数は削除されました

// 🧪 デバッグ表示を更新（表示がONの時のみ実行）
// この関数は削除されました

// 🧪 デバッグ表示の切り替え
// この関数は削除されました

// 🧪 デバッグデータをリセット
// この関数は削除されました

// 🧪 デバッグ状態を更新する便利関数
// この関数は削除されました

// マイクステータス管理関数
function updateMicStatus(status) {
    const micContainer = document.getElementById('mic-status-container');
    const micIcon = document.getElementById('mic-status-icon');
    const micButton = document.getElementById('request-mic-permission');

    if (micContainer) {
        // 既存のクラスをクリア
        micContainer.classList.remove('standby', 'recording', 'muted', 'interval');

        // 新しいステータスを適用
        switch (status) {
            case 'standby':
                micContainer.classList.add('standby');
                if (micIcon) {
                    micIcon.setAttribute('data-lucide', 'mic');
                    lucide.createIcons(); // Lucideアイコンを再描画
                }
                console.log('🎤 マイクステータス: 待機中');
                break;
            case 'recording':
                micContainer.classList.add('recording');
                if (micIcon) {
                    micIcon.setAttribute('data-lucide', 'mic');
                    lucide.createIcons(); // Lucideアイコンを再描画
                }
                console.log('🎤 マイクステータス: 録音中（赤エフェクト）');
                break;
            case 'interval':
                micContainer.classList.add('interval');
                if (micIcon) {
                    micIcon.setAttribute('data-lucide', 'mic');
                    lucide.createIcons(); // Lucideアイコンを再描画
                }
                console.log('🎤 マイクステータス: インターバル（青エフェクト）');
                break;
            case 'muted':
                micContainer.classList.add('muted');
                if (micIcon) {
                    micIcon.setAttribute('data-lucide', 'mic-off');
                    lucide.createIcons(); // Lucideアイコンを再描画
                }
                console.log('🎤 マイクステータス: ミュート中');
                break;
            default:
                micContainer.classList.add('standby');
                if (micIcon) {
                    micIcon.setAttribute('data-lucide', 'mic');
                    lucide.createIcons(); // Lucideアイコンを再描画
                }
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
            case 'interval':
                micButton.classList.add('mic-permitted');
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
    highRetryCount: 0, // 高音測定用の独立したリトライカウンター
    maxRetries: 3,
    voiceDetectionThreshold: 0.15, // 音量閾値

    measurementDuration: 3000, // 3秒
    idleDuration: 3000, // 3秒

    // 🎵 音声安定性チェック用（雑音排除）- 設定を緩和
    voiceStability: {
        recentDetections: [], // 最近の検出結果を保持
        requiredStableCount: 2, // 安定判定に必要な連続検出回数（3→2に緩和）
        maxHistoryAge: 800, // 履歴保持時間 (ms)（1000→800に短縮）
        minFrequencyForVoice: 70, // 人間の声と判定する最低周波数 (Hz)（80→70に緩和）
        maxFrequencyForVoice: 2500 // 人間の声と判定する最高周波数 (Hz)（2000→2500に緩和）
    },

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
        endTime: null,
        // 測定成功判定の最小要件
        minRequiredDataPoints: 20 // 3秒間で最低20個のデータが必要（約6-7fps相当）
    }
};;;
/**
 * 音声の安定性をチェックして雑音を排除します
 * @param {Object} result - PitchProからの検出結果
 * @returns {boolean} true: 安定した音声と判定, false: 雑音または不安定
 */
function isStableVoiceDetection(result) {
    const now = Date.now();
    const stability = globalState.voiceStability;
    
    // 音量チェック
    if (!result.volume || result.volume < globalState.voiceDetectionThreshold) {
        return false;
    }
    
    // 音程チェック：周波数と音程名の両方が必要
    if (!result.frequency || !result.note) {
        console.log('🔇 音程が検出されていません:', {
            frequency: result.frequency,
            note: result.note
        });
        return false;
    }
    
    // 人間の声の周波数範囲チェック
    if (result.frequency < stability.minFrequencyForVoice || 
        result.frequency > stability.maxFrequencyForVoice) {
        console.log('🚫 人間の声の範囲外:', {
            frequency: result.frequency,
            range: `${stability.minFrequencyForVoice}-${stability.maxFrequencyForVoice}Hz`
        });
        return false;
    }
    
    // 古い履歴を削除
    stability.recentDetections = stability.recentDetections.filter(
        detection => now - detection.timestamp < stability.maxHistoryAge
    );
    
    // 現在の検出を履歴に追加
    stability.recentDetections.push({
        timestamp: now,
        frequency: result.frequency,
        note: result.note,
        volume: result.volume
    });
    
    // 安定判定に必要な検出回数に達しているかチェック
    if (stability.recentDetections.length < stability.requiredStableCount) {
        console.log('🟡 音声安定性チェック中:', {
            detectionCount: stability.recentDetections.length,
            required: stability.requiredStableCount,
            note: result.note,
            frequency: result.frequency.toFixed(1)
        });
        return false;
    }
    
    // 🔧 周波数の安定性チェック（緩和版）
    const frequencies = stability.recentDetections.map(d => d.frequency);
    const avgFreq = frequencies.reduce((sum, f) => sum + f, 0) / frequencies.length;
    const maxDeviation = Math.max(...frequencies.map(f => Math.abs(f - avgFreq)));
    const allowedDeviation = avgFreq * 0.2; // 平均周波数の20%以内（10%→20%に緩和）
    
    if (maxDeviation > allowedDeviation) {
        // 周波数が不安定（緩和版） - ログ簡素化
        console.log('⚠️ 周波数が不安定:', {
            avgFreq: avgFreq.toFixed(1),
            maxDeviation: maxDeviation.toFixed(1),
            allowedDeviation: allowedDeviation.toFixed(1),
            frequencies: frequencies.map(f => f.toFixed(1))
        });
        return false;
    }
    
    // 🔧 音量の安定性チェック（緩和版）
    const volumes = stability.recentDetections.map(d => d.volume);
    const avgVolume = volumes.reduce((sum, v) => sum + v, 0) / volumes.length;
    const minVolume = Math.min(...volumes);
    
    if (minVolume < globalState.voiceDetectionThreshold * 0.6) { // 0.8→0.6に緩和
        console.log('🔉 音量が不安定（緩和版）:', {
            avgVolume: (avgVolume * 100).toFixed(1) + '%',
            minVolume: (minVolume * 100).toFixed(1) + '%',
            threshold: (globalState.voiceDetectionThreshold * 0.6 * 100).toFixed(1) + '%'
        });
        return false;
    }
    
    console.log('✅ 安定した音声を検出（緩和版）:', {
        note: result.note,
        frequency: result.frequency.toFixed(1) + 'Hz',
        volume: (result.volume * 100).toFixed(1) + '%',
        detectionCount: stability.recentDetections.length,
        avgFreq: avgFreq.toFixed(1) + 'Hz',
        freqStability: maxDeviation.toFixed(1) + 'Hz',
        volumeStability: (avgVolume * 100).toFixed(1) + '%'
    });
    
    return true;
}

/**
 * 音声安定性データをリセットします
 */
function resetVoiceStability() {
    globalState.voiceStability.recentDetections = [];
    console.log('🔄 音声安定性データをリセット');
}

// メイン初期化処理
document.addEventListener('DOMContentLoaded', async function() {
    // まず初期化を実行
    await initializeDemo();

    // PitchProライブラリ読み込み確認
    // PitchPro v1.3.1確認
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

    // 注意: マイク許可は preparation-pitchpro-cycle.js で処理される

    // 🎯 音域テスト開始ボタンはpreparation-controller.jsで制御されます

    // 🔄 再測定ボタン（シングルページフロー対応）
    const retryMeasurementBtn = document.getElementById('retry-measurement-btn');
    if (retryMeasurementBtn) {
        retryMeasurementBtn.addEventListener('click', async () => {
            console.log('🔄 再測定ボタンがクリックされました');
            console.log('📋 現在のフェーズ:', globalState.currentPhase);
            console.log('リトライ回数:', globalState.retryCount, '/', globalState.maxRetries);
            await retryCurrentMeasurement();
        });
    }

    // 🔄 再測定ボタン（結果画面用・シングルページフロー対応）
    const remeasureRangeBtn = document.getElementById('remeasure-range-btn');
    if (remeasureRangeBtn) {
        remeasureRangeBtn.addEventListener('click', async () => {
            console.log('🔄 再測定ボタン（結果画面）がクリックされました');

            // 保存済みの音域データをクリア
            if (window.DataManager) {
                window.DataManager.clearVoiceRangeData();
                console.log('📋 音域データをクリアしました');
            }

            // 音域テストセクションに戻る
            const resultSection = document.getElementById('result-section');
            const rangeTestSection = document.getElementById('range-test-section');
            if (resultSection) resultSection.classList.add('hidden');
            if (rangeTestSection) rangeTestSection.classList.remove('hidden');

            // 音域設定済み表示を非表示
            const rangeSavedDisplay = document.getElementById('range-saved-display');
            if (rangeSavedDisplay) {
                rangeSavedDisplay.classList.add('hidden');
            }

            // 音域テストの状態をリセット
            globalState.currentPhase = 'idle';
            globalState.retryCount = 0;
            globalState.lowPitchData = [];
            globalState.highPitchData = [];

            console.log('🎯 音域テストの再開始準備完了');
        });
    }

    console.log('✅ VoiceRangeTestController デモ準備完了');
    console.log('📌 PitchPro v1.3.0 統合版');
    console.log('🎯 「ワンメソッド音域テスト開始」ボタンを押してテストしてください');
});

// 基本テスト実装（VoiceRangeTestControllerが利用できない場合のフォールバック）
async function startBasicTest() {
    console.log('📋 基本的なAudioDetectionComponentテスト開始（効率化版）');

    try {
        // 共有インスタンス優先使用 - 二重初期化回避
        if (window.globalAudioDetector) {
            console.log('✅ 既存の共有AudioDetectorインスタンスを使用 - 二重初期化回避');

            // 音域テスト用UI要素に切り替え
            try {
                window.window.globalAudioDetector.updateSelectors({
                    volumeBarSelector: '#range-test-volume-bar',
                    volumeTextSelector: '#range-test-volume-text',
                    frequencySelector: '#range-test-frequency-value'
                });
                console.log('✅ 共有インスタンスのUI要素を音域テスト用に切り替え完了');
            } catch (error) {
                console.warn('⚠️ updateSelectors失敗、既存設定を使用:', error);
            }
        } else {
            console.log('🔧 フォールバック: 新規AudioDetectionComponent作成 (v1.3.0確実動作版)');

            // フォールバック用の新規作成
            window.globalAudioDetector = new AudioDetectionComponent({
                volumeBarSelector: '#range-test-volume-bar',
                volumeTextSelector: '#range-test-volume-text',
                frequencySelector: '#range-test-frequency-value',
                debugMode: true,
                // コンストラクタでコールバック設定
                onPitchUpdate: (result) => {
                    if (result.frequency && result.note) {
                        console.log(`🎵 検出: ${result.note} (${result.frequency.toFixed(1)} Hz)`);
                    }
                },
                onError: (error) => {
                    console.error('❌ 基本テストエラー:', error);
                }
            });

            await window.window.globalAudioDetector.initialize();
            console.log('✅ AudioDetectionComponent初期化成功 (v1.3.0確実動作版)');
        }

        // PitchProのstart()メソッドを使用
        if (window.window.globalAudioDetector.start) {
            window.window.globalAudioDetector.start();
            console.log('🎯 PitchPro start()メソッド使用（基本テスト）');
        } else {
            window.window.globalAudioDetector.startDetection();
            console.log('🔄 startDetection()フォールバック使用（基本テスト）');
        }

        // ステータス更新
        document.getElementById('main-status-text').textContent = 'マイク入力を検出中...';
        document.getElementById('sub-info-text').textContent = '声を出してテストしてください';


    } catch (error) {
        console.error('❌ 基本テストエラー:', error);
        showNotification('基本テストエラー: ' + error.message, 'error');
    }
}

// 注意: マイク許可機能は preparation-pitchpro-cycle.js で統合処理される

// 音域テスト開始
async function startVoiceRangeTest(audioDetectorInstance) { // 引数を追加
    console.log('🎯 音域テスト開始 (v1.3.1修正版)');

    try {
        // 🎵 音声安定性データをリセット（雑音排除機能初期化）
        resetVoiceStability();

        // 既存のボタン状態を更新（シングルページフロー対応）
        const beginBtn = document.getElementById('begin-range-test-btn');
        if (beginBtn) {
            beginBtn.classList.add('btn-hidden');
        }

        // マイクステータスを録音中に変更
        updateMicStatus('recording');

        // グローバル状態を初期化
        globalState.currentPhase = 'waiting-for-voice';
        globalState.measurementData.startTime = Date.now();
        console.log('📋 フェーズ設定完了:', {
            currentPhase: globalState.currentPhase,
            threshold: globalState.voiceDetectionThreshold
        });

        // 引数で渡された初期化済みインスタンスを使用
        if (!audioDetectorInstance) {
            throw new Error('AudioDetectorインスタンスが提供されませんでした。');
        }
        window.globalAudioDetector = audioDetectorInstance; // グローバルにセット

        // UIセレクタとコールバックを設定
        await window.globalAudioDetector.updateSelectors({
            volumeBarSelector: '#range-test-volume-bar',
            volumeTextSelector: '#range-test-volume-text',
            frequencySelector: '#range-test-frequency-value'
        });
        window.globalAudioDetector.setCallbacks({
            onPitchUpdate: (result) => {
                handleVoiceDetection(result, window.globalAudioDetector);
            }
        });

        // 検出を開始
        await window.globalAudioDetector.startDetection();

        // UI更新（シングルページフロー対応）
        const mainStatusText = document.getElementById('main-status-text');
        if (mainStatusText) {
            mainStatusText.textContent = '３秒間できるだけ低い声で「あー」と発声しましょう';
        }
        
        const subInfoText = document.getElementById('sub-info-text');
        if (subInfoText) {
            subInfoText.textContent = '安定した声を認識したら自動で測定開始します';
        }

        console.log('✅ 音域テスト開始完了');

    } catch (error) {
        console.error('❌ 音域テスト開始エラー:', error);
        showNotification(`音域テスト開始に失敗しました: ${error.message}`, 'error');
        
        // エラー時は元の状態に戻す（シングルページフロー対応）
        const beginBtn = document.getElementById('begin-range-test-btn');
        if (beginBtn) {
            beginBtn.classList.remove('btn-hidden');
            beginBtn.classList.add('btn-visible-inline');
        }
        updateMicStatus('standby');
    }
}

// 声検出ハンドラー
function handleVoiceDetection(result, audioDetector) {
    // 音声検出処理（本番用 - デバッグカウンター削除済み）

    // 測定データを常に記録（音量が閾値以下でも）
    recordMeasurementData(result);

    // 測定開始判定のみ厳格な雑音排除を適用
    if (globalState.currentPhase === 'waiting-for-voice' || globalState.currentPhase === 'waiting-for-voice-high') {
        // 🎵 測定開始時のみ厳格な音声安定性チェック（雑音排除）
        if (!isStableVoiceDetection(result)) {
            // 安定性チェックで失敗した場合は早期リターン
            // isStableVoiceDetection内で詳細なログが出力される
            return;
        }

        console.log('🔊 安定した音声検出 - 測定開始:', {
            currentPhase: globalState.currentPhase,
            volume: result.volume,
            frequency: result.frequency,
            note: result.note
        });

        // 測定開始の判定
        switch (globalState.currentPhase) {
            case 'waiting-for-voice':
                console.log('🎯 低音測定開始');
                startLowPitchMeasurement(audioDetector);
                break;
            case 'waiting-for-voice-high':
                console.log('🎯 高音測定開始');
                startHighPitchMeasurement(audioDetector);
                break;
        }
    } else {
        // 測定中は基本的な音量チェックのみ（緩い判定）
        if (result.volume && result.volume >= globalState.voiceDetectionThreshold * 0.5) {
            console.log('🔊 測定中音声データ記録:', {
                currentPhase: globalState.currentPhase,
                volume: result.volume,
                frequency: result.frequency,
                note: result.note
            });
        }
    }
}

// 測定データ記録
function recordMeasurementData(result) {
    // 無効なデータをフィルタリング
    if (!result.frequency || !result.volume) {
        console.log('🔇 データ記録スキップ:', {
            phase: globalState.currentPhase,
            frequency: result.frequency || 'なし',
            volume: result.volume || 'なし',
            reason: !result.frequency ? '周波数なし' : '音量なし'
        });
        return;
    }

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

        // 低音データ記録ログ（5個おきに出力）
        if (data.frequencies.length % 5 === 0) {
            console.log('🔽 低音データ記録中:', {
                'データ数': data.frequencies.length,
                '最新音程': `${result.frequency.toFixed(1)} Hz (${result.note})`,
                '最低音': data.lowestFreq ? `${data.lowestFreq.toFixed(1)} Hz (${data.lowestNote})` : 'なし'
            });
        }
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

        // 高音データ記録ログ（5個おきに出力）
        if (data.frequencies.length % 5 === 0) {
            console.log('🔼 高音データ記録中:', {
                'データ数': data.frequencies.length,
                '最新音程': `${result.frequency.toFixed(1)} Hz (${result.note})`,
                '最高音': data.highestFreq ? `${data.highestFreq.toFixed(1)} Hz (${data.highestNote})` : 'なし'
            });
        }
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

    // 快適音域計算（検出音域の80%）
    const comfortableRange = calculateComfortableVoiceRange(lowData.lowestFreq, highData.highestFreq);

    return {
        lowNote: lowData.lowestNote,
        highNote: highData.highestNote,
        lowFreq: lowData.lowestFreq,
        highFreq: highData.highestFreq,
        octaves: parseFloat(octaves.toFixed(2)),
        semitones: semitones,
        range: `${lowData.lowestNote} - ${highData.highestNote}`,
        // 快適音域情報を追加
        comfortableRange: comfortableRange,
        totalMeasurementTime: globalState.measurementData.endTime - globalState.measurementData.startTime,
        lowPhaseDataCount: lowData.frequencies.length,
        highPhaseDataCount: highData.frequencies.length,
        avgLowVolume: Math.round(lowData.avgVolume * 100),
        avgHighVolume: Math.round(highData.avgVolume * 100)
    };
}

/**
 * 快適音域を計算します（検出音域の80%）
 * @param {number} lowestFreq - 検出された最低周波数
 * @param {number} highestFreq - 検出された最高周波数
 * @returns {Object} 快適音域の情報
 */
function calculateComfortableVoiceRange(lowestFreq, highestFreq) {
    // 音域の中心を対数スケールで計算
    const centerFreqLog = (Math.log2(lowestFreq) + Math.log2(highestFreq)) / 2;
    const centerFreq = Math.pow(2, centerFreqLog);
    
    // 全音域の半分の範囲（オクターブ）
    const fullRangeOctaves = Math.log2(highestFreq / lowestFreq);
    
    // 快適音域は全音域の80%
    const comfortableRangeOctaves = fullRangeOctaves * 0.8;
    const halfComfortableRange = comfortableRangeOctaves / 2;
    
    // 快適音域の最低・最高周波数を計算
    const comfortableLowFreq = centerFreq / Math.pow(2, halfComfortableRange);
    const comfortableHighFreq = centerFreq * Math.pow(2, halfComfortableRange);
    
    // 周波数を音程名に変換
    const comfortableLowNote = frequencyToNote(comfortableLowFreq);
    const comfortableHighNote = frequencyToNote(comfortableHighFreq);
    
    return {
        lowFreq: Math.round(comfortableLowFreq * 10) / 10,
        highFreq: Math.round(comfortableHighFreq * 10) / 10,
        lowNote: comfortableLowNote,
        highNote: comfortableHighNote,
        range: `${comfortableLowNote} - ${comfortableHighNote}`,
        octaves: parseFloat(comfortableRangeOctaves.toFixed(2)),
        semitones: Math.round(comfortableRangeOctaves * 12),
        percentage: 80 // 元音域に対する割合
    };
}

/**
 * 周波数を音程名に変換します（簡易版）
 * @param {number} frequency - 周波数 (Hz)
 * @returns {string} 音程名 (例: "C4", "A#3")
 */
function frequencyToNote(frequency) {
    const A4 = 440.0;
    const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    
    // A4からの半音数を計算
    const semitonesFromA4 = Math.round(12 * Math.log2(frequency / A4));
    
    // オクターブとノートインデックスを計算
    const octave = 4 + Math.floor((semitonesFromA4 + 9) / 12);
    const noteIndex = (semitonesFromA4 + 9) % 12;
    
    // 負の値の処理
    const adjustedNoteIndex = noteIndex < 0 ? noteIndex + 12 : noteIndex;
    const adjustedOctave = noteIndex < 0 ? octave - 1 : octave;
    
    return `${noteNames[adjustedNoteIndex]}${adjustedOctave}`;
}

/**
 * 測定品質を評価し、適切なバッジとメッセージを返します
 * @param {Object} measurementData - globalState.measurementData
 * @returns {Object} { level: string, badge: string, message: string, score: number }
 */
function assessMeasurementQuality(measurementData) {
    const lowData = measurementData.lowPhase;
    const highData = measurementData.highPhase;
    
    const totalDataCount = lowData.frequencies.length + highData.frequencies.length;
    const retryCount = globalState.retryCount;
    const measurementTime = measurementData.endTime - measurementData.startTime;
    
    // データ充実度スコア (0-40点)
    let dataScore = 0;
    if (totalDataCount >= 50) dataScore = 40;
    else if (totalDataCount >= 30) dataScore = 30;
    else if (totalDataCount >= 15) dataScore = 20;
    else if (totalDataCount >= 5) dataScore = 10;
    
    // 測定成功率スコア (0-30点)
    let successScore = 0;
    if (retryCount === 0) successScore = 30;
    else if (retryCount === 1) successScore = 20;
    else if (retryCount === 2) successScore = 10;
    else if (retryCount >= 3) successScore = 5;
    
    // 測定時間効率スコア (0-20点)
    let timeScore = 0;
    const timeInSeconds = measurementTime / 1000;
    if (timeInSeconds <= 10) timeScore = 20;
    else if (timeInSeconds <= 15) timeScore = 15;
    else if (timeInSeconds <= 25) timeScore = 10;
    else timeScore = 5;
    
    // 音量安定性スコア (0-10点)
    let volumeScore = 0;
    const avgVolume = (lowData.avgVolume + highData.avgVolume) / 2;
    if (avgVolume >= 0.3) volumeScore = 10;
    else if (avgVolume >= 0.2) volumeScore = 7;
    else if (avgVolume >= 0.15) volumeScore = 5;
    else volumeScore = 2;
    
    const totalScore = dataScore + successScore + timeScore + volumeScore;
    
    // 品質レベル判定
    if (totalScore >= 85) {
        return {
            level: 'excellent',
            badge: '🏆',
            message: '優秀な測定結果',
            score: totalScore,
            details: {
                dataScore,
                successScore,
                timeScore,
                volumeScore,
                totalDataCount,
                retryCount,
                timeInSeconds: timeInSeconds.toFixed(1),
                avgVolume: (avgVolume * 100).toFixed(1)
            }
        };
    } else if (totalScore >= 70) {
        return {
            level: 'good',
            badge: '🥇',
            message: '良好な測定結果',
            score: totalScore,
            details: {
                dataScore,
                successScore,
                timeScore,
                volumeScore,
                totalDataCount,
                retryCount,
                timeInSeconds: timeInSeconds.toFixed(1),
                avgVolume: (avgVolume * 100).toFixed(1)
            }
        };
    } else if (totalScore >= 50) {
        return {
            level: 'acceptable',
            badge: '🥉',
            message: '測定完了',
            score: totalScore,
            details: {
                dataScore,
                successScore,
                timeScore,
                volumeScore,
                totalDataCount,
                retryCount,
                timeInSeconds: timeInSeconds.toFixed(1),
                avgVolume: (avgVolume * 100).toFixed(1)
            }
        };
    } else {
        return {
            level: 'partial',
            badge: '📊',
            message: '部分的な測定結果',
            score: totalScore,
            details: {
                dataScore,
                successScore,
                timeScore,
                volumeScore,
                totalDataCount,
                retryCount,
                timeInSeconds: timeInSeconds.toFixed(1),
                avgVolume: (avgVolume * 100).toFixed(1)
            }
        };
    }
}

// 音域テスト結果表示
function displayVoiceRangeResults(results) {
    // 音域テストセクションを非表示にし、結果セクションを表示
    document.getElementById('range-test-section').classList.add('hidden');
    document.getElementById('result-section').classList.remove('hidden');

    // Step 3を完了状態に更新
    const step3 = document.getElementById('step-3');
    const connector2 = document.getElementById('connector-2');
    if (step3) {
        step3.classList.remove('pending', 'active');
        step3.classList.add('completed');
    }
    if (connector2) {
        connector2.classList.add('completed');
    }

    // 基本情報
    document.getElementById('result-range').textContent = results.range;
    document.getElementById('result-octaves').textContent = `${results.octaves}オクターブ (${results.semitones}半音)`;
    document.getElementById('result-low-freq').textContent = `${results.lowFreq.toFixed(1)} Hz (${results.lowNote})`;
    document.getElementById('result-high-freq').textContent = `${results.highFreq.toFixed(1)} Hz (${results.highNote})`;

    // 測定品質評価を実行
    const quality = assessMeasurementQuality(globalState.measurementData);
    // 詳細統計は開発用ログのみ（ユーザー表示なし）
    const detailsEl = document.getElementById('result-details');
    if (detailsEl) {
        // ユーザー向けにはシンプルな情報のみ表示
        detailsEl.innerHTML = `
            <div class="result-info-row">
                <span>🎵 快適音域 (推奨範囲)</span>
                <span class="result-info-value">${results.comfortableRange ? results.comfortableRange.range : '計算中...'}</span>
            </div>
        `;
    }

    console.log('✅ 音域テスト完了 - 結果表示');
    console.log('音域範囲:', results.range, '|', `${results.octaves}オクターブ`);
    if (results.comfortableRange) {
        console.log('快適音域:', results.comfortableRange.range);
    }

}

/**
 * 測定と円形プログレスバーの更新を完全に同期させて実行します。
 * @param {number} duration - 測定時間 (ms)
 * @param {function} onComplete - 測定完了時に呼び出すコールバック関数
 */
function runMeasurementPhase(duration, onComplete) {
    console.log(`🎬 統合測定フェーズ開始: ${duration}ms`);

    const progressCircle = document.querySelector('.voice-progress-circle');

    if (!progressCircle) {
        console.error('❌ .voice-progress-circle要素が見つかりません！');
        return;
    }

    const startTime = performance.now();
    let animationFrameId = null;

    // 瞬時にプログレスを0%にリセット
    progressCircle.classList.remove('progress-linear-animation', 'progress-smooth-animation');
    progressCircle.classList.add('progress-no-animation');
    updateCircularProgress(0);

    // DOMの更新を強制的に反映させる（リフロー）
    progressCircle.offsetHeight;

    // アニメーションを再有効化
    progressCircle.classList.remove('progress-no-animation', 'progress-smooth-animation');
    progressCircle.classList.add('progress-linear-animation');

    function tick(currentTime) {
        const elapsedTime = currentTime - startTime;
        const progress = Math.min((elapsedTime / duration) * 100, 100);

        // 経過秒数を計算（1秒、2秒、3秒）
        const elapsedSeconds = Math.floor(elapsedTime / 1000) + 1;
        const maxSeconds = Math.ceil(duration / 1000);

        // フェーズに応じたカウントダウンテキスト表示
        if (elapsedSeconds <= maxSeconds) {
            const currentPhase = globalState.currentPhase;
            let measurementType = '';

            if (currentPhase === 'measuring-low') {
                measurementType = '低音測定中';
            } else if (currentPhase === 'measuring-high') {
                measurementType = '高音測定中';
            } else {
                measurementType = '測定中';
            }

            document.getElementById('sub-info-text').textContent = `${measurementType}... ${elapsedSeconds}秒`;
        }

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
    console.log('🔍 startLowPitchMeasurement実行 - 円形プログレスバー開始予定');
    globalState.currentPhase = 'measuring-low';

    // シングルページフロー対応: 安全なDOM要素アクセス
    const mainStatusText = document.getElementById('main-status-text');
    if (mainStatusText) {
        mainStatusText.textContent = 'できるだけ低い声をキープしましょう';
    }
    
    const subInfoText = document.getElementById('sub-info-text');
    if (subInfoText) {
        subInfoText.textContent = '低音測定中...';
        subInfoText.classList.add('measuring');
    }

    // バッジアニメーションを開始
    updateBadgeForMeasuring();

    // 古いタイマーを削除し、新しい統合関数を呼び出す
    runMeasurementPhase(globalState.measurementDuration, completeLowPitchMeasurement);
}

// 低音測定完了
function completeLowPitchMeasurement() {
    console.log('✅ 低音域測定完了');
    globalState.currentPhase = 'idle-low';

    // 測定中アニメーションを停止
    document.getElementById('sub-info-text').classList.remove('measuring');

    // 測定結果の検証 - 厳格化された条件
    const lowData = globalState.measurementData.lowPhase;
    const dataCount = lowData.frequencies.length;
    const minRequired = globalState.measurementData.minRequiredDataPoints;
    const hasValidData = dataCount >= minRequired && lowData.lowestFreq;

    console.log('低音測定データ検証:', {
        'データ数': dataCount,
        '最低必要数': minRequired,
        '最低音': lowData.lowestFreq ? `${lowData.lowestFreq.toFixed(1)} Hz (${lowData.lowestNote})` : 'なし',
        '判定結果': hasValidData ? '✅ 成功' : '❌ 失敗'
    });

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

        // 円形プログレスバーを即座にリセット
        updateCircularProgressInstantly(0);

        // 低音測定完了時の待機表示
        document.getElementById('main-status-text').textContent = '低音測定完了！高音測定に進みます...';
        document.getElementById('sub-info-text').textContent = '待機中...';
        
        // インターバル時に音声検出を停止してマイクを青に変更

        // PitchProのupdateSelectors()を使用してUIリセットを試行
        if (window.globalAudioDetector && window.globalAudioDetector.updateSelectors) {
            try {
                // 同じセレクターで更新することでUIリセット効果を狙う
                window.window.globalAudioDetector.updateSelectors({
                    volumeBarSelector: '#range-test-volume-bar',
                    volumeTextSelector: '#range-test-volume-text', 
                    frequencySelector: '#range-test-frequency-value'
                });
                console.log('🔄 PitchPro updateSelectors()でUIリセット実行');
            } catch (error) {
                console.warn('⚠️ updateSelectors()失敗:', error);
                // フォールバック: 従来の方法
                window.globalAudioDetector.stopDetection();
                console.log('🔇 フォールバック: stopDetection()実行');
            }
        } else if (window.globalAudioDetector && window.globalAudioDetector.stopDetection) {
            window.globalAudioDetector.stopDetection();
            console.log('🔇 インターバル中: 音声検出を一時停止');
        }

        // 念のため手動でも音量バーをリセット
        resetVolumeDisplay();
        console.log('📊 音量バーをリセット');

        updateMicStatus('interval');

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

    // 円形プログレスバーと音量バーを即座にリセット
    updateCircularProgressInstantly(0);
    resetVolumeDisplay();

    // リトライ回数チェック
    if (globalState.retryCount < globalState.maxRetries) {
        globalState.retryCount++;

        // 失敗表示
        updateBadgeForFailure();
        document.getElementById('main-status-text').textContent = `低音測定失敗 - 再測定します (${globalState.retryCount}/${globalState.maxRetries})`;
        document.getElementById('sub-info-text').textContent = 'より大きな声で低い音を出してください';

        // 再測定ボタンを表示
        document.getElementById('retry-measurement-btn').classList.remove('btn-hidden');
        document.getElementById('retry-measurement-btn').classList.add('btn-visible-inline');

        showNotification('低音の検出に失敗しました。再測定してください。', 'warning');

        // 2秒後に自動再測定開始
        setTimeout(() => {
            retryLowPitchMeasurement();
        }, 2000);

    } else {
        // 最大リトライ回数に達した場合
        console.error('❌ 低音測定: 最大リトライ回数に達しました');

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
    document.getElementById('retry-measurement-btn').classList.add('btn-hidden');

    // 待機状態に戻す
    globalState.currentPhase = 'waiting-for-voice';
    document.getElementById('main-status-text').textContent = '３秒間できるだけ低い声で「あー」と発声しましょう（再測定）';
    document.getElementById('sub-info-text').textContent = 'より大きく、より低い音で歌ってください';

    // バッジを待機状態に戻す
    updateBadgeForWaiting('arrow-down');
}

// 高音測定の再試行
function retryHighPitchMeasurement() {
    console.log(`🔄 高音測定再試行 (${globalState.highRetryCount}回目)`);

    // 再測定ボタンを非表示
    document.getElementById('retry-measurement-btn').classList.add('btn-hidden');

    // 高音測定データをクリア
    globalState.measurementData.highPhase = {
        frequencies: [],
        highestFreq: null,
        highestNote: null,
        avgVolume: 0,
        measurementTime: 0
    };

    // 高音測定の待機状態に戻す
    globalState.currentPhase = 'waiting-for-voice-high';
    document.getElementById('main-status-text').textContent = '３秒間できるだけ高い声で「あー」と発声しましょう（再測定）';
    document.getElementById('sub-info-text').textContent = 'より大きく、より高い音で歌ってください';

    // バッジを高音待機状態に戻す
    updateBadgeForWaiting('arrow-up');

}

// バッジの失敗表示
function updateBadgeForFailure() {
    const rangeIcon = document.getElementById('range-icon');
    const badge = document.querySelector('.voice-note-badge');

    if (rangeIcon && badge) {
        // 白い❌アイコンを表示
        rangeIcon.innerHTML = '<i data-lucide="x" style="width: 80px; height: 80px; color: white !important;"></i>';
        rangeIcon.classList.remove('measuring');
        rangeIcon.classList.add('range-icon-visible');
        rangeIcon.classList.remove('range-icon-hidden');

        // バッジに失敗スタイルを適用（赤背景）
        badge.classList.remove('measuring', 'confirmed');
        badge.classList.add('failure');

        // 強制的に赤色スタイルを適用
        badge.style.backgroundColor = '#ef4444';
        badge.style.border = 'none';
    }

    // 失敗時は再測定ボタンを表示
    document.getElementById('retry-measurement-btn').classList.remove('btn-hidden');
    document.getElementById('retry-measurement-btn').classList.add('btn-visible-inline');

    lucide.createIcons();
}

// バッジのエラー表示
function updateBadgeForError() {
    const rangeIcon = document.getElementById('range-icon');
    const badge = document.querySelector('.voice-note-badge');

    if (rangeIcon) {
        rangeIcon.innerHTML = '<i data-lucide="alert-triangle" style="width: 80px; height: 80px; color: #f59e0b;"></i>';
        rangeIcon.classList.remove('measuring');
    }

    if (badge) {
        badge.classList.remove('measuring', 'confirmed');
        badge.classList.add('failure');
    }

    // エラー時も再測定ボタンを表示
    document.getElementById('retry-measurement-btn').classList.remove('btn-hidden');
    document.getElementById('retry-measurement-btn').classList.add('btn-visible-inline');

    lucide.createIcons();
}

// 高音測定失敗時の処理
function handleHighPitchMeasurementFailure() {
    console.log('🔄 高音測定失敗 - 対処開始');

    // 円形プログレスバーと音量バーを即座にリセット
    updateCircularProgressInstantly(0);
    resetVolumeDisplay();

    // リトライ回数チェック（高音測定用の独立したカウンター）
    if (!globalState.highRetryCount) {
        globalState.highRetryCount = 0;
    }

    if (globalState.highRetryCount < globalState.maxRetries) {
        globalState.highRetryCount++;

        // 失敗表示
        updateBadgeForFailure();
        document.getElementById('main-status-text').textContent = `高音測定失敗 - 再測定します (${globalState.highRetryCount}/${globalState.maxRetries})`;
        document.getElementById('sub-info-text').textContent = 'より大きな声で高い音を出してください';

        // 再測定ボタンを表示
        document.getElementById('retry-measurement-btn').classList.remove('btn-hidden');
        document.getElementById('retry-measurement-btn').classList.add('btn-visible-inline');

        showNotification('高音の検出に失敗しました。再測定してください。', 'warning');

        // 2秒後に自動再測定開始
        setTimeout(() => {
            retryHighPitchMeasurement();
        }, 2000);

    } else {
        // 最大リトライ回数に達した場合、低音データがあるかチェック
        console.error('❌ 高音測定: 最大リトライ回数に達しました');

        const lowData = globalState.measurementData.lowPhase;
        const dataCount = lowData.frequencies.length;
        const minRequired = globalState.measurementData.minRequiredDataPoints;
        const hasLowData = dataCount >= minRequired && lowData.lowestFreq;

        if (hasLowData) {
            // 低音データがある場合: 部分的な結果として表示
            console.log('低音データのみで部分結果を表示');

            updateBadgeForConfirmed();
            document.getElementById('main-status-text').textContent = '測定完了！低音域の結果を表示します';
            document.getElementById('sub-info-text').textContent = '低音域のデータでトレーニング開始可能です';

            showNotification('低音域のデータを取得しました。トレーニングを開始できます', 'success');

            // PitchPro AudioDetector停止（音量バー・マイクも自動リセット）
            if (window.globalAudioDetector) {
                if (window.globalAudioDetector.stop) {
                    window.globalAudioDetector.stop();
                    console.log('🎯 PitchPro stop()メソッド使用（高音測定失敗・部分結果）');
                } else {
                    window.globalAudioDetector.stopDetection();
                    console.log('🔄 PitchPro stopDetection()使用（高音測定失敗・部分結果）');
                }
                console.log('✅ PitchProが音量バー・マイク状態も自動リセット');
            }

            // UI要素リセット
                document.getElementById('begin-range-test-btn').classList.remove('btn-hidden');
            document.getElementById('begin-range-test-btn').classList.add('btn-visible-inline');

            // マイクステータス表示の更新（PitchProが実際の処理を担当）
            updateMicStatus('standby');

            // 部分的な結果を表示
            setTimeout(() => {
                const results = calculatePartialVoiceRange();
                displayResults(results);
            }, 2000);

        } else {
            // 両方とも失敗した場合
            console.error('❌ 低音・高音両方の測定に失敗');

            // PitchPro AudioDetector停止（音量バー・マイクも自動リセット）
            if (window.globalAudioDetector) {
                if (window.globalAudioDetector.stop) {
                    window.globalAudioDetector.stop();
                    console.log('🎯 PitchPro stop()メソッド使用（測定完全失敗）');
                } else {
                    window.globalAudioDetector.stopDetection();
                    console.log('🔄 PitchPro stopDetection()使用（測定完全失敗）');
                }
                console.log('✅ PitchProが音量バー・マイク状態も自動リセット');
            }

            updateBadgeForError();
            document.getElementById('main-status-text').textContent = '音域測定に失敗しました';
            document.getElementById('sub-info-text').textContent = '再測定ボタンを押してやり直してください';

            // UI要素リセット
                document.getElementById('begin-range-test-btn').classList.remove('btn-hidden');
            document.getElementById('begin-range-test-btn').classList.add('btn-visible-inline');

            // マイクステータス表示の更新（PitchProが実際の処理を担当）
            updateMicStatus('standby');

            // 再測定ボタンを表示
            document.getElementById('retry-measurement-btn').classList.remove('btn-hidden');
        document.getElementById('retry-measurement-btn').classList.add('btn-visible-inline');

            showNotification('音域測定に失敗しました。環境を確認して再測定してください。', 'error');
        }
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

    // 🎵 音声安定性データをリセット（高音測定用に初期化）
    resetVoiceStability();

    // 円形プログレスバーを瞬時にリセット（アニメーション無効）
    updateCircularProgressInstantly(0);

    // 音声検出を再開してマイクステータスを録音中（赤）に戻す

    // 既存の検出を停止してから再開する
    if (window.globalAudioDetector) {
        // 既に検出中の場合は一旦停止
        if (window.globalAudioDetector.stopDetection) {
            window.globalAudioDetector.stopDetection();
            console.log('🛑 既存の音声検出を停止');
        }

        // 少し待ってから再開（状態遷移を確実にするため）
        setTimeout(() => {
            if (window.globalAudioDetector.startDetection) {
                window.globalAudioDetector.startDetection();
                console.log('🎤 高音測定開始: 音声検出を再開');
            }
        }, 100);
    }
    updateMicStatus('recording');

    // UI更新
    document.getElementById('main-status-text').textContent = '３秒間できるだけ高い声で「あー」と発声しましょう';
    document.getElementById('sub-info-text').textContent = '安定した声を認識したら自動で測定開始します';
    updateBadgeForWaiting('arrow-up');
}

// 高音測定開始
function startHighPitchMeasurement() {
    console.log('🎯 高音域測定開始 (新方式)');
    globalState.currentPhase = 'measuring-high';

    document.getElementById('main-status-text').textContent = 'できるだけ高い声をキープしましょう';
    document.getElementById('sub-info-text').textContent = '高音測定中...';
    document.getElementById('sub-info-text').classList.add('measuring');

    // バッジアニメーションを開始
    updateBadgeForMeasuring();

    // 古いタイマーを削除し、新しい統合関数を呼び出す
    runMeasurementPhase(globalState.measurementDuration, completeHighPitchMeasurement);
}

// 高音測定完了
function completeHighPitchMeasurement() {
    console.log('✅ 高音域測定完了');
    globalState.currentPhase = 'completed';
    globalState.measurementData.endTime = Date.now();

    // 測定中アニメーションを停止
    document.getElementById('sub-info-text').classList.remove('measuring');

    // 測定結果の検証 - 厳格化された条件
    const highData = globalState.measurementData.highPhase;
    const dataCount = highData.frequencies.length;
    const minRequired = globalState.measurementData.minRequiredDataPoints;
    const hasValidData = dataCount >= minRequired && highData.highestFreq;

    console.log('高音測定データ検証:', {
        'データ数': dataCount,
        '最低必要数': minRequired,
        '最高音': highData.highestFreq ? `${highData.highestFreq.toFixed(1)} Hz (${highData.highestNote})` : 'なし',
        '判定結果': hasValidData ? '✅ 成功' : '❌ 失敗'
    });

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

    } else {
        console.warn('⚠️ 高音域測定失敗 - データが記録されませんでした');

        // 失敗時の処理（高音測定は最後なので、結果表示に進む）
        handleHighPitchMeasurementFailure();
        return; // 早期リターンで以下の処理をスキップ
    }
    
    // PitchPro AudioDetector停止（音量バー・マイクも自動リセット）
    if (window.globalAudioDetector) {
        if (window.globalAudioDetector.stop) {
            window.globalAudioDetector.stop();
            console.log('🎯 PitchPro stop()メソッド使用（測定完了）');
        } else {
            window.globalAudioDetector.stopDetection();
            console.log('🔄 PitchPro stopDetection()使用（測定完了）');
        }
        console.log('✅ PitchProが音量バー・マイク状態も自動リセット');
    }

    // 音量バーを手動でリセット（PitchProが自動でリセットしない場合の保険）
    resetVolumeDisplay();
    // 高音測定完了: 音量バーリセット

    // 結果計算と表示
    const results = calculateVoiceRange();
    if (results) {
        displayVoiceRangeResults(results);
    }

    // UI要素の表示切り替え（テスト完了時）
    document.getElementById('begin-range-test-btn').classList.remove('btn-visible-inline');
    document.getElementById('begin-range-test-btn').classList.add('btn-hidden');

    // テスト完了時は再測定ボタンを表示（結果画面にも同じボタンがあるため）
    document.getElementById('retry-measurement-btn').classList.remove('btn-hidden');
    document.getElementById('retry-measurement-btn').classList.add('btn-visible-inline');

    // 上部テキスト表示のリセット
    document.getElementById('main-status-text').textContent = '音域テスト完了！結果を確認してください';
    document.getElementById('sub-info-text').textContent = '結果画面で詳細をご確認いただけます';

    // マイクステータス表示の更新（PitchProが実際の処理を担当）
    updateMicStatus('standby');

    // 円形プログレスバーを瞬時にリセット
    setTimeout(() => {
        updateCircularProgressInstantly(0);
    }, 1000);

    showNotification('音域テスト完了！', 'success');
}

// 再測定
async function retryCurrentMeasurement() {
    console.log('🔄 retryCurrentMeasurement() 開始');
    console.log('📋 現在のフェーズ:', globalState.currentPhase);
    console.log('リトライ回数チェック:', globalState.retryCount, '>=', globalState.maxRetries);

    if (globalState.retryCount >= globalState.maxRetries) {
        console.log('❌ 最大再試行回数に達しました');
        showNotification('最大再試行回数に達しました', 'error');
        return;
    }

    globalState.retryCount++;
    console.log(`🔄 再測定 (${globalState.retryCount}/${globalState.maxRetries})`);

    clearTimeout(globalState.measurementTimer);
    clearTimeout(globalState.idleTimer);

    if (globalState.currentPhase.includes('low')) {
        console.log('📉 低音再測定モード');
        globalState.currentPhase = 'waiting-for-voice';
        document.getElementById('main-status-text').textContent = '３秒間できるだけ低い声で「あー」と発声しましょう（再測定）';
        document.getElementById('sub-info-text').textContent = 'より大きく、より低い音で歌ってください';
        updateBadgeForWaiting('arrow-down');

        // 音声検出が停止している場合は再開
        console.log('🎤 低音再測定 - 音声検出確認');
        updateMicStatus('recording');
        if (window.globalAudioDetector && !window.globalAudioDetector.isDetecting) {
            await window.globalAudioDetector.startDetection();
        }
    } else if (globalState.currentPhase.includes('high')) {
        console.log('📈 高音再測定モード');
        globalState.currentPhase = 'waiting-for-voice-high';
        document.getElementById('main-status-text').textContent = '３秒間できるだけ高い声で「あー」と発声しましょう（再測定）';
        document.getElementById('sub-info-text').textContent = 'より大きく、より高い音で歌ってください';
        updateBadgeForWaiting('arrow-up');

        // 音声検出が停止している場合は再開
        console.log('🎤 高音再測定 - 音声検出確認');
        updateMicStatus('recording');
        if (window.globalAudioDetector && !window.globalAudioDetector.isDetecting) {
            await window.globalAudioDetector.startDetection();
        }
    } else if (globalState.currentPhase === 'completed') {
        console.log('🔄 完了状態からの再測定 - 最初から開始');
        // 測定結果をリセット
        globalState.minDetectedFreq = null;
        globalState.maxDetectedFreq = null;
        globalState.retryCount = 0; // 完了状態からは回数リセット
        globalState.highRetryCount = 0;

        // 低音測定から再開
        globalState.currentPhase = 'waiting-for-voice';
        document.getElementById('main-status-text').textContent = '３秒間できるだけ低い声で「あー」と発声しましょう';
        document.getElementById('sub-info-text').textContent = '安定した声を認識したら自動で測定開始します';
        updateBadgeForWaiting('arrow-down');

        // 結果表示を非表示
        document.getElementById('results-section').classList.add('hidden');

        // ボタン状態を調整
        document.getElementById('retry-measurement-btn').classList.add('btn-hidden');

        // 音声検出を再開
        console.log('🎤 音声検出を再開します');
        updateMicStatus('recording');
        if (window.globalAudioDetector) {
            await window.globalAudioDetector.startDetection();
        }
    } else {
        console.log('⚠️ 不明なフェーズ:', globalState.currentPhase);
    }

    // 再測定ボタンを非表示
    document.getElementById('retry-measurement-btn').classList.remove('btn-visible-inline');
    document.getElementById('retry-measurement-btn').classList.add('btn-hidden');

    console.log('✅ 再測定処理完了');
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
    if (window.globalAudioDetector) {
        // PitchPro v1.3.0修正版: stopDetection()メソッド使用
        window.globalAudioDetector.stopDetection();
        console.log('🎯 PitchPro v1.3.0修正版: stopDetection()で音声検出停止');
        
        // インスタンスは破棄せず再利用のため保持
        window.currentAudioDetector = window.globalAudioDetector;
    }

    // 状態リセット
    globalState.currentPhase = 'idle';
    globalState.retryCount = 0;
    globalState.highRetryCount = 0; // 高音測定リトライカウンターもリセット

    // 円形プログレスのみリセット（音量バーはPitchProが自動リセット）
    resetCircularProgress();

    // マイクステータス表示の更新（PitchProが実際の処理を担当）
    updateMicStatus('standby');

    document.getElementById('main-status-text').textContent = 'テスト停止';
    document.getElementById('sub-info-text').textContent = '待機中...';
    updateBadgeForWaiting('arrow-down');

    document.getElementById('retry-measurement-btn').classList.add('btn-hidden');
    document.getElementById('begin-range-test-btn').classList.remove('btn-hidden');
    document.getElementById('begin-range-test-btn').classList.add('btn-visible-inline');

    showNotification('測定を停止しました', 'info');
}

// 音量表示リセット（PitchPro標準機能優先）
function resetVolumeDisplay() {
    // PitchProのupdateSelectors()を優先使用
    if (window.globalAudioDetector && window.globalAudioDetector.updateSelectors) {
        try {
            console.log('🔄 PitchPro updateSelectors()で音量バーリセット');
            window.globalAudioDetector.updateSelectors({
                volumeBarSelector: '#range-test-volume-bar',
                volumeTextSelector: '#range-test-volume-text',
                frequencySelector: '#range-test-frequency-value'
            });
            return; // 成功した場合は手動リセット不要
        } catch (error) {
            console.warn('⚠️ PitchPro updateSelectors()失敗、手動リセットに切り替え:', error);
        }
    }

    // フォールバック: 手動リセット
    console.log('手動で音量バーリセット（フォールバック）');
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
        progressCircle.classList.remove('progress-linear-animation', 'progress-smooth-animation');
    progressCircle.classList.add('progress-no-animation');
        progressCircle.style.strokeDashoffset = offset;
        console.log(`⚡ 円形プログレス瞬時更新: ${progress}%`);
        
        // アニメーション再有効化を大幅に遅らせる
        setTimeout(() => {
            progressCircle.classList.remove('progress-no-animation', 'progress-linear-animation');
        progressCircle.classList.add('progress-smooth-animation');
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
        progressCircle.classList.remove('progress-linear-animation', 'progress-smooth-animation');
    progressCircle.classList.add('progress-no-animation');
        progressCircle.style.strokeDashoffset = '452'; // 瞬時に0%に戻す
        console.log('⚡ 円形プログレス瞬時リセット');
        
        // 少し後でアニメーションを再有効化
        setTimeout(() => {
            progressCircle.classList.remove('progress-no-animation', 'progress-linear-animation');
        progressCircle.classList.add('progress-smooth-animation');
        }, 50);
    }
}

function startCircularProgressAnimation() {
    const progressCircle = document.querySelector('.voice-progress-circle');
    if (progressCircle) {
        progressCircle.classList.remove('progress-no-animation', 'progress-linear-animation');
        progressCircle.classList.add('progress-smooth-animation');
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
    const badge = document.querySelector('.voice-note-badge');

    if (rangeIcon && badge) {
        const iconSrc = iconType === 'arrow-up' ? './icons/arrow-up.png' : './icons/arrow-down.png';
        // インラインスタイルを削除し、CSSクラスで制御
        rangeIcon.innerHTML = `<img src="${iconSrc}" alt="${iconType}" class="range-icon-img">`;
        rangeIcon.classList.add('range-icon-visible');
        rangeIcon.classList.remove('range-icon-hidden');

        // アイコンと背景の両方からmeasuringクラスを削除
        rangeIcon.classList.remove('measuring', 'range-icon-confirmed');
        badge.classList.remove('measuring', 'confirmed', 'failure');
    }

    // 待機状態では再測定ボタンを非表示
    document.getElementById('retry-measurement-btn').classList.add('btn-hidden');
}

function updateBadgeForMeasuring() {
    const rangeIcon = document.getElementById('range-icon');
    const badge = document.querySelector('.voice-note-badge');

    if (badge) {
        badge.classList.add('measuring');
        badge.classList.remove('confirmed');
    }

    // 矢印アイコンにもmeasuringクラスを追加してフェードアニメーション開始
    if (rangeIcon) {
        rangeIcon.classList.add('measuring');
        rangeIcon.classList.remove('range-icon-confirmed');
    }

    // 再測定ボタンは失敗時のみ表示（測定開始時は非表示のまま・シングルページフロー対応）
    const retryMeasurementBtn = document.getElementById('retry-measurement-btn');
    if (retryMeasurementBtn) {
        retryMeasurementBtn.classList.add('btn-hidden');
    }
}

function updateBadgeForConfirmed() {
    const rangeIcon = document.getElementById('range-icon');
    const badge = document.querySelector('.voice-note-badge');

    if (rangeIcon && badge) {
        // measuringクラスを削除してフェードアニメーション停止
        rangeIcon.classList.remove('measuring');

        // インラインスタイルを削除し、CSSクラスで制御
        rangeIcon.innerHTML = '<img src="./icons/check.png" alt="測定完了" class="range-icon-img">';
        rangeIcon.classList.add('range-icon-visible');
        rangeIcon.classList.remove('range-icon-hidden');

        // チェックマークバウンズアニメーション（一回のみ）
        rangeIcon.classList.add('range-icon-confirmed');

        // アニメーション終了後にクラスを削除
        setTimeout(() => {
            rangeIcon.classList.remove('range-icon-confirmed');
        }, 600);

        // クラス更新（緑の背景継続のため）
        badge.classList.add('confirmed');
        badge.classList.remove('measuring');
    }
    document.getElementById('retry-measurement-btn').classList.add('btn-hidden');
}

// ===== グローバルスコープに公開 =====
// preparation.htmlで呼び出すため、startVoiceRangeTest関数をグローバルスコープに公開
window.startVoiceRangeTest = startVoiceRangeTest;
console.log('✅ startVoiceRangeTest関数をグローバルスコープに公開完了');
