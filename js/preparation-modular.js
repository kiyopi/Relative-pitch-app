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
        
        // VolumeBarComponent削除: voice-range-test-v4と同様にAudioDetectionComponentのみ使用
        console.log('⚠️ VolumeBarComponent無効化 - AudioDetectionComponentのみ使用（voice-range-test-v4統一）');

        // 🚨 重要デバッグ: 音量バーが動く原因を特定
        setTimeout(() => {
            const volumeProgress = document.getElementById('volume-progress');
            if (volumeProgress) {
                console.log('🔍 音量バー要素の現在の状態:', {
                    width: volumeProgress.style.width,
                    parentHTML: volumeProgress.parentElement.outerHTML,
                    hasDataVolume: volumeProgress.hasAttribute('data-volume'),
                    dataVolume: volumeProgress.getAttribute('data-volume')
                });

                // 音量バーの変更を監視
                const observer = new MutationObserver((mutations) => {
                    mutations.forEach((mutation) => {
                        if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
                            const newWidth = volumeProgress.style.width;
                            if (newWidth && newWidth !== '0%') {
                                console.log('🚨 音量バー変更検知!', {
                                    newWidth,
                                    timestamp: Date.now(),
                                    stack: new Error().stack
                                });
                            }
                        }
                    });
                });

                observer.observe(volumeProgress, {
                    attributes: true,
                    attributeFilter: ['style', 'data-volume']
                });

                console.log('👁️ 音量バー監視開始 - 変更が検知されれば原因が特定できます');
            }
        }, 1000);
        
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
            
            // voice-range-test-v4最適化パターン：AudioDetectionComponent使用
            if (!window.PitchPro || !window.PitchPro.AudioDetectionComponent) {
                throw new Error('PitchPro v1.3.1またはAudioDetectionComponentが読み込まれていません');
            }

            const { AudioDetectionComponent } = window.PitchPro;

            // デバイス最適化設定
            const deviceSpecs = deviceManager ? deviceManager.getSpecs() : {
                sensitivityMultiplier: 2.5,
                volumeBarScale: 4.0
            };

            // AudioDetectionComponent初期化（voice-range-test-v4推奨設定）
            const audioDetector = new AudioDetectionComponent({
                volumeBarSelector: '#volume-progress',
                volumeTextSelector: '#volume-value',
                frequencySelector: '#frequency-value',

                // PitchPro推奨設定（音程検出精度向上）
                clarityThreshold: 0.4,        // 0.6 → 0.4で検出しやすく
                minVolumeAbsolute: 0.003,     // 0.01 → 0.003で感度向上

                // デバイス別最適化
                sensitivityMultiplier: deviceSpecs.sensitivityMultiplier,
                volumeBarScale: deviceSpecs.volumeBarScale
            });

            await audioDetector.initialize();
            console.log('✅ AudioDetectionComponent初期化完了');

            // AudioDetectionComponent状態確認（デバッグ用）
            console.log('📊 AudioDetectionComponent詳細:', {
                clarityThreshold: 0.4,
                minVolumeAbsolute: 0.003,
                volumeBarSelector: '#volume-progress',
                volumeTextSelector: '#volume-value',
                frequencySelector: '#frequency-value'
            });

            // グローバル変数に保存（後で使用）
            window.preparationAudioDetector = audioDetector;
            
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
 * 音声テスト開始（voice-range-test-v4最適化版）
 */
function startAudioTest() {
    // グローバル変数から取得
    const audioDetector = window.preparationAudioDetector;
    if (!audioDetector) {
        console.error('❌ AudioDetectionComponent が初期化されていません');
        return;
    }

    isAudioTesting = true;
    audioTestStartTime = Date.now();
    detectedC4 = false;

    console.log('🎯 voice-range-test-v4統一処理開始 - AudioDetectionComponent使用');

    // 🔍 重要デバッグ: setCallbacksが正常に動作するかテスト
    console.log('🧪 AudioDetectionComponent.setCallbacks テスト開始');

    // voice-range-test-v4統一：AudioDetectionComponentコールバック設定
    audioDetector.setCallbacks({
        onPitchUpdate: (result) => {
            // 🚨 コールバックが呼ばれることを確認（最重要）
            console.log('🟢 onPitchUpdate コールバック呼び出し確認！', {
                isAudioTesting,
                hasResult: !!result,
                timestamp: Date.now()
            });

            if (!isAudioTesting || !result) {
                console.log('🟡 早期リターン:', { isAudioTesting, hasResult: !!result });
                return;
            }

            // voice-range-test-v4と同じエラーハンドリング
            if (typeof result.volume === 'undefined' || typeof result.frequency === 'undefined') {
                console.warn('⚠️ 無効なresultオブジェクト:', result);
                return;
            }

            const frequency = Math.max(0, result.frequency || 0);
            // 🔧 重要修正: PitchProのvolume(0-1)を%(0-100)に変換
            const volume = Math.max(0, Math.min(100, (result.volume || 0) * 100));

            // デバッグログ（必要時のみ）
            if (Math.random() < 0.1) { // 10%の確率で表示
                console.log(`🎚️ 音声データ: ${frequency.toFixed(1)}Hz, ${volume.toFixed(1)}%`);
            }

            // 🔧 ノイズ誤検出防止: 音量10%以上かつ周波数80Hz以上で成功
            if (volume >= 10 && frequency >= 80) {
                if (!detectedC4) {
                    detectedC4 = true;
                    console.log(`✅ 音声検出成功: ${frequency.toFixed(1)}Hz, ${volume.toFixed(1)}%`);
                    updateProgressDisplay('声を検出しました！', `音量検出完了`);

                    // 成功メッセージを表示
                    if (detectionSuccess) {
                        detectionSuccess.classList.remove('hidden');
                        detectionSuccess.classList.add('flex');
                    }

                    // ✅ 改善: 音声検出後すぐに完了処理（遅延削除）
                    setTimeout(() => {
                        if (isAudioTesting) {
                            completeAudioTest();
                        }
                    }, 500); // 2秒 → 0.5秒（UI更新確認用の最小遅延）
                }
            }
        },
        onError: (error) => {
            console.error('🎤 音声テストエラー:', error);
            showErrorMessage('音声処理でエラーが発生しました');
        }
    });

    // voice-range-test-v4統一：検出開始
    console.log('🚀 AudioDetectionComponent.startDetection() 実行前');

    const success = audioDetector.startDetection();

    console.log('📊 startDetection() 実行結果:', {
        success,
        audioDetectorExists: !!audioDetector,
        audioDetectorType: typeof audioDetector,
        hasStartDetection: typeof audioDetector.startDetection === 'function'
    });

    if (success) {
        console.log('🎵 voice-range-test-v4統一音声テスト開始成功');
        console.log('🔍 検出条件: 音量5%以上（voice-range-test-v4準拠）');
        console.log('⏱️ コールバック待機中...音声を出してください');
        updateProgressDisplay('声を出してください', '音量が検出されるまで発声してください');

        // 15秒タイマー
        setTimeout(checkAudioTestComplete, audioTestDuration);
    } else {
        console.error('❌ AudioDetectionComponent.startDetection()が失敗');
        console.error('🔧 AudioDetectionComponent詳細:', audioDetector);
        showErrorMessage('音声テスト開始に失敗しました');
    }
}

// 古いコールバック関数を削除（直接PitchDetectorコールバックに統合済み）

/**
 * 進捗表示更新
 */
function updateProgressDisplay(mainText, detailText) {
    if (progressDisplay) {
        progressDisplay.classList.remove('hidden');
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
 * 音声テスト完了（voice-range-test-v4最適化版）
 */
function completeAudioTest() {
    isAudioTesting = false;

    // AudioDetectionComponent停止
    const audioDetector = window.preparationAudioDetector;
    if (audioDetector) {
        audioDetector.stopDetection();
        console.log('🎵 AudioDetectionComponent停止完了');

        // UI要素を手動でリセット（確実な方法）
        if (volumeProgress) {
            volumeProgress.style.width = '0%';
        }
        if (volumeValue) {
            volumeValue.textContent = '0%';
        }
        if (frequencyValue) {
            frequencyValue.textContent = '0 Hz';
        }
    }

    console.log('✅ 音声テスト完了（最適化版）');

    // 🎯 音声テストセクション内のUI更新
    const voiceInstructionText = document.getElementById('voice-instruction-text');
    if (voiceInstructionText) {
        voiceInstructionText.textContent = '音声を認識しました';
        console.log('✅ 音声指示テキスト更新完了');
    }

    // 音声指示アイコンをチェックマークに変更（直接HTML変更）
    const voiceInstructionContainer = document.querySelector('.voice-instruction-icon');
    if (voiceInstructionContainer) {
        console.log('🔍 音声指示アイコンコンテナ発見:', voiceInstructionContainer);
        // 直接HTMLを置き換える確実な方法
        voiceInstructionContainer.innerHTML = '<i data-lucide="check" style="width: 32px; height: 32px; color: white;"></i>';
        // 新しいアイコンを初期化
        lucide.createIcons({
            target: voiceInstructionContainer
        });
        console.log('✅ 音声指示アイコン → チェックマーク変更完了（直接HTML変更）');
    } else {
        console.error('❌ .voice-instruction-icon が見つかりません');
    }

    // 🎯 voice-instruction-icon の背景を緑色に変更
    if (voiceInstructionContainer) {
        // CSSクラスで成功状態に変更
        voiceInstructionContainer.classList.add('success');
        console.log('✅ voice-instruction-icon背景 → 緑色変更完了');
    }

    // 🎯 リップルアニメーション停止（CSS疑似要素のアニメーション停止）
    const voiceInstructionElement = document.querySelector('.voice-instruction');
    if (voiceInstructionElement) {
        // CSS疑似要素のアニメーションを停止
        voiceInstructionElement.classList.add('ripple-stopped');
        console.log('✅ リップルアニメーション停止完了（疑似要素）');
    }

    // pulse要素も確実に非表示
    const voiceInstructionPulse = document.querySelector('.voice-instruction-pulse');
    if (voiceInstructionPulse) {
        voiceInstructionPulse.classList.add('hidden');
        console.log('✅ pulse要素も非表示完了');
    }

    // 成功メッセージ表示（flexレイアウトを維持）
    if (detectionSuccess) {
        detectionSuccess.classList.remove('hidden');
        detectionSuccess.classList.add('flex');
    }

    // 進捗表示を隠す
    if (progressDisplay) {
        progressDisplay.classList.add('hidden');
    }

    // 音域データの有無で分岐
    if (dataManager) {
        const savedRange = dataManager.getVoiceRangeData();
        if (savedRange && savedRange.success) {
            // 音域データが保存されている場合
            console.log('📱 保存済み音域データあり - スキップ画面表示');
            showSavedRangeDisplay(savedRange);

            // 音域保存表示を表示
            if (rangeSavedDisplay) {
                rangeSavedDisplay.classList.remove('hidden');
            }
        } else {
            // 音域データがない場合
            console.log('📱 音域データなし - 音域テスト開始ボタン表示');
            if (startRangeTestBtn) {
                startRangeTestBtn.classList.remove('hidden');
            }
        }
    } else {
        // dataManagerがない場合はデフォルト動作
        if (startRangeTestBtn) {
            startRangeTestBtn.classList.remove('hidden');
        }
    }

    // 音域テスト開始ボタン表示と同時に音符アイコンをチェックアイコンに変更
    const voiceInstructionIcon = document.querySelector('.voice-instruction-icon');
    const musicIcon = document.querySelector('.voice-instruction-icon i[data-lucide="music"]');

    if (voiceInstructionIcon && musicIcon) {
        console.log('🎵 音符アイコンをチェックアイコンに変更開始');

        // 音符アイコンをcheckアイコンに変更
        musicIcon.setAttribute('data-lucide', 'check');

        // 背景を緑に変更
        voiceInstructionIcon.classList.add('success');

        // Lucideアイコンを再初期化（重要）
        if (window.lucide && window.lucide.createIcons) {
            window.lucide.createIcons();
        }

        console.log('✅ 音符アイコン→チェックアイコン変更完了・背景緑変更完了');
    } else {
        console.warn('⚠️ 音符アイコン要素が見つかりません');
    }

    updateStepStatus(2, 'completed');
}

/**
 * 音域テスト開始ボタンイベント（voice-range-test-v4最適化版）
 */
if (startRangeTestBtn) {
    startRangeTestBtn.addEventListener('click', async () => {
        const audioDetector = window.preparationAudioDetector;
        if (!voiceRangeTester || !audioDetector) {
            showErrorMessage('システムが正常に初期化されていません');
            return;
        }

        console.log('🎵 音域テスト開始（UI切り替え最適化版）');
        currentPhase = 'range-test';
        showSection(rangeTestSection);
        updateStepStatus(3, 'active');

        // 🎯 ユーザーリクエスト実装: 音域テスト開始時のUI完全変更
        const testInstructionText = document.getElementById('test-instruction-text');
        const rangeIcon = document.getElementById('range-icon');

        if (testInstructionText) {
            testInstructionText.textContent = '「ド」を発声してください';
            console.log('✅ 音域テスト: テキスト変更完了');
        }

        if (rangeIcon) {
            console.log('🔍 音域テストアイコン発見:', rangeIcon);
            // 直接HTML置き換えによる確実な変更
            rangeIcon.outerHTML = '<i data-lucide="check" id="range-icon" style="width: 80px; height: 80px; color: white; display: block;"></i>';
            // 新しいアイコンを初期化
            const newRangeIcon = document.getElementById('range-icon');
            if (newRangeIcon) {
                const iconContainer = newRangeIcon.closest('.voice-note-badge');
                if (iconContainer) {
                    lucide.createIcons({
                        target: iconContainer
                    });
                }
            }
            console.log('✅ 音域テスト: アイコン変更完了（直接HTML変更）');

            // 背景を緑色に変更
            const voiceNoteBadge = rangeIcon.closest('.voice-note-badge');
            if (voiceNoteBadge) {
                voiceNoteBadge.classList.add('confirmed');
                console.log('✅ 音域テスト: 背景変更完了');
            }
        }

        // UI切り替え最適化（voice-range-test-v4パターン）
        try {
            // 1. 検出停止
            audioDetector.stopDetection();

            // 2. リソース破棄
            audioDetector.destroy();

            // 3. 音域テスト用セレクターで再作成
            const { AudioDetectionComponent } = window.PitchPro;
            const deviceSpecs = deviceManager ? deviceManager.getSpecs() : {
                sensitivityMultiplier: 2.5,
                volumeBarScale: 4.0
            };

            const rangeAudioDetector = new AudioDetectionComponent({
                // 音域テスト用UI要素（rangeTestSection内の要素）
                volumeBarSelector: '#range-volume-bar',  // 音域テスト画面の音量バー
                volumeTextSelector: '#range-volume-text', // 音域テスト画面の音量テキスト
                frequencySelector: '#range-frequency',   // 音域テスト画面の周波数表示

                // PitchPro推奨設定
                clarityThreshold: 0.4,
                minVolumeAbsolute: 0.003,
                sensitivityMultiplier: deviceSpecs.sensitivityMultiplier,
                volumeBarScale: deviceSpecs.volumeBarScale
            });

            // 4. 再初期化
            await rangeAudioDetector.initialize();

            // グローバル変数更新
            window.preparationAudioDetector = rangeAudioDetector;

            console.log('✅ AudioDetectionComponent音域テスト用に切り替え完了');
        } catch (error) {
            console.error('❌ UI切り替えエラー:', error);
            showErrorMessage('音域テスト準備でエラーが発生しました');
            return;
        }

        // VoiceRangeTesterのコールバック設定（最適化版AudioDetectionComponent使用）
        const rangeAudioDetector = window.preparationAudioDetector;
        rangeAudioDetector.setCallbacks({
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
        rangeAudioDetector.startDetection();
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
 * 再測定ボタンイベント（voice-range-test-v4最適化版）
 */
if (remeasureRangeBtn) {
    remeasureRangeBtn.addEventListener('click', () => {
        const audioDetector = window.preparationAudioDetector;
        if (!audioDetector || !voiceRangeTester) {
            showErrorMessage('システムが正常に初期化されていません');
            return;
        }

        console.log('🔄 音域再測定開始（最適化版）');
        currentPhase = 'range-test';
        showSection(rangeTestSection);
        updateStepStatus(3, 'active');

        // AudioDetectionComponentコールバック再設定
        audioDetector.setCallbacks({
            onPitchUpdate: (result) => {
                voiceRangeTester.processPitchData(result);
            },
            onError: (error) => {
                console.error('🎤 音域再測定エラー:', error);
                showErrorMessage('音域再測定中にエラーが発生しました');
            }
        });

        // 音域テスト再開
        voiceRangeTester.startRangeTest();
        audioDetector.startDetection();
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
 * 再テストボタンイベント（voice-range-test-v4最適化版）
 */
if (retestRangeBtn) {
    retestRangeBtn.addEventListener('click', async () => {
        console.log('🔄 音域データクリアして再テスト（最適化版）');

        // 既存AudioDetectionComponentのクリーンアップ
        const audioDetector = window.preparationAudioDetector;
        if (audioDetector) {
            audioDetector.stopDetection();
            audioDetector.destroy();
        }

        // 保存済みデータをクリア
        if (dataManager && dataManager.clearVoiceRangeData) {
            dataManager.clearVoiceRangeData();
        }

        // 表示をリセット
        if (rangeSavedDisplay) {
            rangeSavedDisplay.classList.add('hidden');
        }

        // 音声テスト用AudioDetectionComponentを再作成
        try {
            const { AudioDetectionComponent } = window.PitchPro;
            const deviceSpecs = deviceManager ? deviceManager.getSpecs() : {
                sensitivityMultiplier: 2.5,
                volumeBarScale: 4.0
            };

            const newAudioDetector = new AudioDetectionComponent({
                volumeBarSelector: '#volume-progress',
                volumeTextSelector: '#volume-value',
                frequencySelector: '#frequency-value',
                clarityThreshold: 0.4,
                minVolumeAbsolute: 0.003,
                sensitivityMultiplier: deviceSpecs.sensitivityMultiplier,
                volumeBarScale: deviceSpecs.volumeBarScale
            });

            await newAudioDetector.initialize();
            window.preparationAudioDetector = newAudioDetector;

            console.log('✅ 音声テスト用AudioDetectionComponent再初期化完了');
        } catch (error) {
            console.error('❌ AudioDetectionComponent再初期化エラー:', error);
            showErrorMessage('システム再初期化でエラーが発生しました');
            return;
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
    
    if (result.success) {
        currentPhase = 'result';
        showSection(resultSection);
        updateStepStatus(3, 'completed');
        
        // 結果表示更新は VoiceRangeTester 内で処理済み
    } else {
        showErrorMessage(result.error);
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

// voice-range-test-v4最適化：ページ離脱時のクリーンアップ
window.addEventListener('beforeunload', () => {
    const audioDetector = window.preparationAudioDetector;
    if (audioDetector) {
        console.log('🧹 ページ離脱時のクリーンアップ実行');
        audioDetector.stopDetection();
        audioDetector.destroy();
        window.preparationAudioDetector = null;
    }
});

console.log('🎯 モジュール統合版 preparation.js 読み込み完了（voice-range-test-v4最適化済み）');