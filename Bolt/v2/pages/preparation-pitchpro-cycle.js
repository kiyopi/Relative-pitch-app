// preparation-pitchpro-cycle.js - PitchProサイクルベース実装
// 初期化 → スタート → リセット → 放棄 のサイクル設計

// Lucide初期化を確実に実行
if (typeof lucide !== 'undefined') {
    lucide.createIcons();
    console.log('✅ Lucide icons initialized');
} else {
    console.warn('⚠️ Lucide library not available');
}

// ===== PitchProサイクル管理システム =====

/**
 * PitchProサイクル統合管理クラス
 * 初期化 → スタート → リセット → 放棄 の4段階を管理
 */
class PitchProCycleManager {
    constructor() {
        // 単一インスタンス管理
        this.audioDetector = null;
        this.currentPhase = 'uninitialized'; // uninitialized, initialized, started, reset, abandoned
        this.deviceSpecs = null;

        // UI要素キャッシュ（v1.3.1キャッシュベース管理）
        this.uiElements = {
            // マイク許可フェーズ
            requestMicBtn: null,
            // 音声テストフェーズ
            volumeBar: null,
            volumeText: null,
            frequencyDisplay: null,
            voiceInstructionText: null,
            detectionSuccess: null,
            // 音域テストフェーズ（将来拡張用）
            rangeVolumeBar: null,
            rangeVolumeText: null,
            rangeFrequencyDisplay: null
        };

        // 状態管理
        this.state = {
            detectionActive: false,
            detectedPitches: [],
            detectionStartTime: null,
            currentMode: 'permission' // permission, audiotest, rangetest
        };

        // 設定値（PitchPro v1.3.1対応）
        this.config = {
            MIN_DETECTION_TIME: 1000,        // 1秒間
            MIN_FREQUENCY: 80,               // 最低周波数（人声範囲）
            MAX_FREQUENCY: 1200,             // 最高周波数（歌声上限）
            VOLUME_THRESHOLD: 0.1,           // 明確な音量（環境音除外）
            CLARITY_THRESHOLD: 0.8           // 高い明瞭度（雑音除外）
        };

        console.log('🔧 PitchProCycleManager 初期化完了');
    }

    /**
     * Phase 1: 初期化（Initialize）
     * デバイス検出、UI要素キャッシュ、AudioDetectionComponent作成
     */
    async initialize() {
        try {
            console.log('📋 Phase 1: 初期化開始');

            // デバイス検出（iPadOS 13+対応）
            this.deviceSpecs = this.detectDeviceWithSpecs();
            console.log(`🔍 デバイス検出結果: ${this.deviceSpecs.deviceType}`, this.deviceSpecs);

            // UI要素キャッシュ（v1.3.1キャッシュベース管理）
            this.cacheUIElements();

            // PitchPro グローバル確認
            if (typeof window.PitchPro === 'undefined') {
                throw new Error('PitchProライブラリが読み込まれていません');
            }

            if (typeof window.PitchPro.AudioDetectionComponent === 'undefined') {
                throw new Error('AudioDetectionComponentが見つかりません');
            }

            console.log('✅ PitchPro.AudioDetectionComponent確認完了');

            // PitchPro AudioDetectionComponent作成（仕様準拠）
            console.log('🔧 AudioDetectionComponent作成中...');
            this.audioDetector = new window.PitchPro.AudioDetectionComponent({
                volumeBarSelector: '#volume-progress',
                volumeTextSelector: '#volume-value',
                frequencySelector: '#frequency-value',
                noteSelector: null, // 音程表示は使用しない
                autoUpdateUI: true, // PitchProに自動更新を任せる
                debug: true
            });
            console.log('✅ AudioDetectionComponent作成完了（PitchPro仕様準拠）');

            // 初期化はボタンクリック時に行うため、ここではスキップ
            console.log('📌 AudioDetectionComponent.initialize()はボタンクリック時に実行されます');

            this.currentPhase = 'initialized';
            console.log('✅ Phase 1: 初期化完了');

            return { success: true, phase: 'initialized' };

        } catch (error) {
            console.error('❌ Phase 1: 初期化失敗 - 詳細情報:');
            console.error('Error type:', error.constructor.name);
            console.error('Error message:', error.message);
            console.error('Error stack:', error.stack);
            console.error('Full error object:', error);

            this.currentPhase = 'error';
            return { success: false, error: error.message, phase: 'error', fullError: error };
        }
    }

    /**
     * Phase 2: スタート（Start）
     * 音声検出開始、コールバック設定、UI状態更新
     */
    async startAudioDetection(mode = 'audiotest') {
        try {
            console.log(`📋 Phase 2: ${mode}スタート開始`);

            if (this.currentPhase !== 'initialized' && this.currentPhase !== 'reset') {
                throw new Error(`不正な状態からのスタート: ${this.currentPhase}`);
            }

            // モード別UI設定
            this.updateUISelectorsForMode(mode);

            // 状態初期化（タイマーは初回音声検出時に開始）
            this.state.detectionActive = true;
            this.state.detectedPitches = [];
            this.state.detectionStartTime = null; // 初回音声検出時に設定
            this.state.currentMode = mode;

            // コールバック設定（PitchPro標準）
            this.audioDetector.setCallbacks({
                onPitchUpdate: (result) => this.handlePitchUpdate(result),
                onVolumeUpdate: (volume) => this.handleVolumeUpdate(volume),
                onError: (context, error) => this.handleAudioError(context, error),
                onStateChange: (state) => console.log(`🎵 Audio state: ${state}`)
            });

            // 検出開始
            await this.audioDetector.startDetection();

            this.currentPhase = 'started';
            console.log(`✅ Phase 2: ${mode}スタート完了`);

            return { success: true, phase: 'started', mode: mode };

        } catch (error) {
            console.error(`❌ Phase 2: ${mode}スタート失敗:`, error);
            return { success: false, error: error.message, phase: this.currentPhase };
        }
    }

    /**
     * Phase 3: リセット（Reset）
     * UI要素切り替え、測定データクリア、状態初期化
     */
    async resetForNewMode(newMode) {
        try {
            console.log(`📋 Phase 3: ${this.state.currentMode} → ${newMode} リセット開始`);

            // 検出停止（PitchPro標準）
            if (this.audioDetector && this.state.detectionActive) {
                await this.audioDetector.stopDetection();
            }

            // PitchPro UIリセット実行（正しいメソッド使用）
            console.log('🔍 PitchPro resetDisplayElements()メソッド確認:', {
                audioDetectorExists: !!this.audioDetector,
                resetDisplayElementsExists: !!(this.audioDetector && this.audioDetector.resetDisplayElements),
                audioDetectorType: this.audioDetector ? this.audioDetector.constructor.name : 'null'
            });

            if (this.audioDetector && this.audioDetector.resetDisplayElements) {
                console.log('🚀 PitchPro resetDisplayElements()実行開始...');

                // reset前の音量バー状態を記録
                const volumeBar = document.getElementById('volume-progress');
                const volumeText = document.getElementById('volume-value');
                const beforeReset = {
                    volumeBarWidth: volumeBar ? volumeBar.style.width : 'null',
                    volumeTextContent: volumeText ? volumeText.textContent : 'null'
                };
                console.log('📊 resetDisplayElements前の状態:', beforeReset);

                // ✅ 正しいPitchProリセットメソッド実行
                await this.audioDetector.resetDisplayElements();

                // reset後の音量バー状態を確認
                const afterReset = {
                    volumeBarWidth: volumeBar ? volumeBar.style.width : 'null',
                    volumeTextContent: volumeText ? volumeText.textContent : 'null'
                };
                console.log('📊 resetDisplayElements後の状態:', afterReset);
                console.log('🔄 PitchPro resetDisplayElements()実行完了');

                // リセットが効果的だったか判定（PitchProは"0.0%"を設定する場合がある）
                const isResetEffective = (afterReset.volumeBarWidth === '0%' || afterReset.volumeBarWidth === '') &&
                                       (afterReset.volumeTextContent === '0%' || afterReset.volumeTextContent === '0.0%' || afterReset.volumeTextContent === '');
                console.log('✅ PitchPro resetDisplayElements()効果判定:', isResetEffective ? '有効' : '無効');

                if (!isResetEffective) {
                    console.warn('⚠️ PitchPro resetDisplayElements()が音量バーをリセットしなかった、手動リセット実行');
                    this.resetUIToInitialState();
                }
            } else {
                console.warn('⚠️ PitchPro resetDisplayElements()メソッド利用不可、手動リセットにフォールバック');
                this.resetUIToInitialState();
            }

            // UI要素切り替え（PitchPro標準機能優先）
            this.updateUISelectorsForMode(newMode);

            // 状態リセット
            this.state.detectionActive = false;
            this.state.detectedPitches = [];
            this.state.detectionStartTime = null;
            this.state.currentMode = newMode;

            this.currentPhase = 'reset';
            console.log(`✅ Phase 3: リセット完了 (${newMode}モード準備)`);

            return { success: true, phase: 'reset', mode: newMode };

        } catch (error) {
            console.error('❌ Phase 3: リセット失敗:', error);
            return { success: false, error: error.message, phase: this.currentPhase };
        }
    }

    /**
     * Phase 4: 放棄（Abandon）
     * 完全停止、リソース解放、UI完全リセット
     */
    async abandon() {
        try {
            console.log('📋 Phase 4: 放棄開始');

            // 検出停止
            if (this.audioDetector && this.state.detectionActive) {
                await this.audioDetector.stopDetection();
            }

            // リソース完全解放
            if (this.audioDetector) {
                await this.audioDetector.destroy();
                this.audioDetector = null;
            }

            // UI完全リセット（フォールバック手動操作）
            this.resetUIToInitialState();

            // 状態完全リセット
            this.state.detectionActive = false;
            this.state.detectedPitches = [];
            this.state.detectionStartTime = null;
            this.state.currentMode = 'permission';

            this.currentPhase = 'abandoned';
            console.log('✅ Phase 4: 放棄完了');

            return { success: true, phase: 'abandoned' };

        } catch (error) {
            console.error('❌ Phase 4: 放棄失敗:', error);
            return { success: false, error: error.message, phase: this.currentPhase };
        }
    }

    // ===== サポートメソッド =====

    /**
     * デバイス検出（iPadOS 13+対応）
     */
    detectDeviceWithSpecs() {
        const userAgent = navigator.userAgent;

        const isIPhone = /iPhone/.test(userAgent);
        const isIPad = /iPad/.test(userAgent);
        const isIPadOS = /Macintosh/.test(userAgent) && 'ontouchend' in document;
        const hasIOSNavigator = /iPad|iPhone|iPod/.test(userAgent);
        const hasIOSPlatform = /iPad|iPhone|iPod/.test(navigator.userAgent || '');

        const isIOS = isIPhone || isIPad || isIPadOS || hasIOSNavigator || hasIOSPlatform;

        let deviceType = 'PC';
        let sensitivityMultiplier = 2.5;
        let volumeBarScale = 4.0;

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
            debugInfo: { userAgent, detectionMethods: { isIPhone, isIPad, isIPadOS, hasIOSNavigator, hasIOSPlatform } }
        };
    }

    /**
     * UI要素キャッシュ（v1.3.1キャッシュベース管理）
     */
    cacheUIElements() {
        this.uiElements.requestMicBtn = document.getElementById('request-mic-btn');
        this.uiElements.volumeBar = document.getElementById('volume-progress');
        this.uiElements.volumeText = document.getElementById('volume-value');
        this.uiElements.frequencyDisplay = document.getElementById('frequency-value');
        this.uiElements.voiceInstructionText = document.getElementById('voice-instruction-text');
        this.uiElements.detectionSuccess = document.getElementById('detection-success');

        console.log('📦 UI要素キャッシュ完了:', Object.keys(this.uiElements).filter(k => this.uiElements[k]));
    }

    /**
     * モード別UI要素設定（PitchPro updateSelectors活用）
     */
    updateUISelectorsForMode(mode) {
        try {
            if (!this.audioDetector || !this.audioDetector.updateSelectors) {
                console.warn('⚠️ audioDetector.updateSelectors利用不可、フォールバック使用');
                return;
            }

            let selectors = {};

            switch (mode) {
                case 'audiotest':
                    selectors = {
                        volumeBarSelector: '#volume-progress',
                        volumeTextSelector: '#volume-value',
                        frequencySelector: '#frequency-value'
                    };
                    break;

                case 'rangetest':
                    selectors = {
                        volumeBarSelector: '#range-test-volume-bar',
                        volumeTextSelector: '#range-test-volume-text',
                        frequencySelector: '#range-test-frequency-value'
                    };
                    break;

                default:
                    console.warn(`⚠️ 未知のモード: ${mode}`);
                    return;
            }

            this.audioDetector.updateSelectors(selectors);
            console.log(`🔄 PitchPro updateSelectors完了 (${mode}モード):`, selectors);

        } catch (error) {
            console.warn('⚠️ PitchPro updateSelectors失敗、手動設定にフォールバック:', error);
        }
    }


    /**
     * UI完全リセット（フォールバック手動操作）
     */
    resetUIToInitialState() {
        // 音量バー
        if (this.uiElements.volumeBar) {
            this.uiElements.volumeBar.style.width = '0%';
        }
        if (this.uiElements.volumeText) {
            this.uiElements.volumeText.textContent = '0%';
        }

        // 周波数表示
        if (this.uiElements.frequencyDisplay) {
            this.uiElements.frequencyDisplay.textContent = '261.6 Hz (C4)';
        }

        // 進捗表示
        console.log('🔄 UI完全リセット完了（フォールバック手動操作）');
    }

    // ===== コールバックハンドラー =====

    /**
     * 音程更新ハンドラー（PitchProコールバック）
     */
    handlePitchUpdate(result) {
        if (!this.state.detectionActive) return;

        // 周波数表示はPitchProのautoUpdateUIに任せる（手動更新削除）

        // モード別処理
        switch (this.state.currentMode) {
            case 'audiotest':
                this.handleAudioTestPitchUpdate(result);
                break;
            case 'rangetest':
                this.handleRangeTestPitchUpdate(result);
                break;
        }
    }

    /**
     * 音声テスト用音程更新処理
     */
    handleAudioTestPitchUpdate(result) {
        // PitchProに完全委任: 音量バーが動く = 音声として認識済み
        // PitchProの内部判定を信頼し、独自フィルタリングは不要

        console.log(`🎤 PitchPro判定結果: freq:${result.frequency?.toFixed(1)}Hz vol:${result.volume?.toFixed(3)}`);

        // PitchProの判定 + 最小限の雑音除外フィルタ（100Hz-1000Hz範囲）
        const isPitchProDetectingVoice = result.volume > 0 && result.frequency >= 100 && result.frequency <= 1000;

        console.log(`🔍 判定詳細: vol>${0} = ${result.volume > 0}, freq>=${100} = ${result.frequency >= 100}, freq<=${1000} = ${result.frequency <= 1000}, 総合=${isPitchProDetectingVoice}`);

        if (isPitchProDetectingVoice) {
            console.log('✅ PitchPro音声認識中 - タイマー進行');

            // 初回の有効音声検出時にタイマーを開始
            if (!this.state.detectionStartTime) {
                this.state.detectionStartTime = Date.now();
                console.log('🎬 1秒タイマー開始');
            }

            const elapsedTime = Date.now() - this.state.detectionStartTime;
            console.log(`⏰ ${(elapsedTime/1000).toFixed(1)}秒 / 1.0秒`);

            // 1秒間の音声検出で成功
            if (elapsedTime >= this.config.MIN_DETECTION_TIME) {
                console.log('🎉 1秒経過 - 成功処理実行！');
                this.showDetectionSuccess();
            }
        } else {
            console.log(`❌ PitchPro音声未認識 (vol:${result.volume?.toFixed(3)})`);

            // PitchProが音声認識していない場合はタイマーをリセット
            if (this.state.detectionStartTime) {
                this.state.detectionStartTime = null;
                console.log('🔄 タイマーリセット（PitchPro音声未認識）');
            }
        }
    }

    /**
     * 音域テスト用音程更新処理（将来実装）
     */
    handleRangeTestPitchUpdate(result) {
        // 音域テスト統合時に実装
        console.log('🎵 音域テスト音程更新:', result);
    }

    /**
     * 音量更新ハンドラー
     */
    handleVolumeUpdate(volume) {
        // PitchProのキャッシュベース管理により自動更新されるため、
        // 追加処理のみここで実装
        console.log('🔊 音量更新:', volume);
    }

    /**
     * エラーハンドラー
     */
    handleAudioError(context, error) {
        console.error(`🚨 Audio Error [${context}]:`, error);
        this.state.detectionActive = false;

        // エラー時UI更新
        if (this.uiElements.requestMicBtn) {
            this.uiElements.requestMicBtn.disabled = false;
            this.uiElements.requestMicBtn.innerHTML = '<i data-lucide="alert-circle" style="width: 24px; height: 24px;"></i><span>エラー - 再試行</span>';
            lucide.createIcons();
        }
    }

    // ===== ユーティリティ関数 =====

    /**
     * 周波数から音程名変換
     */
    frequencyToNote(frequency) {
        const A4_FREQ = 440.0;
        const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

        const semitones = Math.round(12 * Math.log2(frequency / A4_FREQ));
        const octave = Math.floor((semitones + 9) / 12) + 4;
        const noteIndex = (semitones + 9 + 120) % 12;

        return `${noteNames[noteIndex]}${octave}`;
    }

    /**
     * 検出進捗更新（シンプル版）
     */
    updateDetectionProgress(elapsedTime) {
        const voiceInstructionText = document.getElementById('voice-instruction-text');

        if (!voiceInstructionText) {
            console.error('❌ voice-instruction-text要素が見つかりません！');
            return;
        }

        const timeRemaining = Math.max(0, Math.ceil((this.config.MIN_DETECTION_TIME - elapsedTime) / 1000));
        const newText = `音声を検出中... (あと${timeRemaining}秒)`;

        voiceInstructionText.textContent = newText;
        voiceInstructionText.style.color = '#f59e0b'; // オレンジ色

        // 専用進捗表示エリアも更新
        const progressText = document.getElementById('progress-text');

        if (progressText) {
            progressText.textContent = newText;
            progressText.style.color = '#ffffff';
        }
    }

    /**
     * 検出成功表示（preparation.jsから統合完了）
     */
    async showDetectionSuccess() {
        console.log('🎉 showDetectionSuccess実行開始');

        // PitchProサイクル: Phase 3 リセット実行
        const resetResult = await this.resetForNewMode('rangetest');
        if (!resetResult.success) {
            console.error('❌ PitchProリセット失敗:', resetResult.error);
            return;
        }

        console.log('🛑 音程検出停止完了 (PitchProサイクル管理)');

        // 🎵 UI状態更新：voice-instruction成功状態に変更
        const voiceInstructionIcon = document.querySelector('.voice-instruction-icon');
        if (voiceInstructionIcon) {
            // アニメーション停止
            const pulseElement = document.querySelector('.voice-instruction-pulse');
            if (pulseElement) {
                pulseElement.style.display = 'none';
                console.log('⏸️ voice-instruction-pulse アニメーション停止');
            }

            // アイコン変更とスタイル更新
            voiceInstructionIcon.innerHTML = '<i data-lucide="check" style="width: 32px; height: 32px; color: white;"></i>';
            voiceInstructionIcon.style.backgroundColor = '#22c55e'; // 緑色背景
            voiceInstructionIcon.style.borderRadius = '50%';

            // Lucideアイコンを再初期化
            lucide.createIcons();
            console.log('✅ voice-instruction-icon を成功状態に更新（緑背景＋チェックマーク）');
        }

        // 📝 説明文を更新
        const voiceInstructionText = document.getElementById('voice-instruction-text');
        if (voiceInstructionText) {
            voiceInstructionText.textContent = '音声を認識しました';
            console.log('📝 voice-instruction-text を成功メッセージに更新');
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
            // 検出成功メッセージを表示（voice-instructionは表示のまま）
            detectionSuccess.classList.remove('hidden');
            console.log('✅ detection-success セクション表示完了');

            // 既存の音域データをチェック
            let voiceRangeData = null;
            try {
                voiceRangeData = DataManager.getVoiceRangeData();
            } catch (error) {
                console.warn('⚠️ DataManager利用不可、ローカル確認にフォールバック');
                voiceRangeData = localStorage.getItem('voiceRangeData') ?
                    JSON.parse(localStorage.getItem('voiceRangeData')) : null;
            }

            // 🧪 テスト用：既存音域データがある場合をシミュレート（音域データなし確認のため一時無効化）
            /*
            if (!voiceRangeData) {
                console.log('🧪 テスト用音域データを作成');
                voiceRangeData = {
                    results: {
                        range: { lowest: 'A2', highest: 'F5' },
                        octaveRange: 2.6,
                        timestamp: Date.now()
                    }
                };
                console.log('🧪 テスト用データ:', voiceRangeData);
            }
            */

            console.log('🔍 音域データなしフローのテスト実行中:', !voiceRangeData ? '音域データなし' : '音域データあり');

            const successMessage = document.getElementById('detection-success-message');

            if (voiceRangeData && rangeSavedDisplay) {
                // 既存データ表示 - 音域データありの場合のメッセージ
                if (successMessage) {
                    successMessage.textContent = '音声テストは完了しました。トレーニング開始の準備ができています。';
                }

                // 1.5秒後にテスト中表示エリアを非表示 + 音域設定済み表示（チェックマークを見せる時間を確保）
                console.log('⏳ 1.5秒後に画面切り替えを実行します...');
                setTimeout(() => {
                    // テスト中表示エリアを非表示
                    const audioTestContent = document.getElementById('audio-test-content');
                    if (audioTestContent) {
                        audioTestContent.style.display = 'none';
                        console.log('📋 audio-test-content を非表示にしました（音域設定済みのため）');
                    }

                    // 音域設定済み表示を開始
                    this.displaySavedRangeData(voiceRangeData.results, rangeSavedDisplay);
                }, 1500);
            } else {
                // 新規音域テストが必要 - 音域データなしの場合のメッセージ
                if (successMessage) {
                    successMessage.textContent = '「ド」の音程を検出できました！音域テストに進みましょう。';
                }

                // 1.5秒後にテスト中表示エリアを非表示 + 音域テストボタン表示（チェックマークを見せる時間を確保）
                console.log('⏳ 1.5秒後に音域テストボタンを表示します...');
                setTimeout(() => {
                    // テスト中表示エリアを非表示
                    const audioTestContent = document.getElementById('audio-test-content');
                    if (audioTestContent) {
                        audioTestContent.style.display = 'none';
                        console.log('📋 audio-test-content を非表示にしました（新規音域テストのため）');
                    }

                    // 音域テストボタンを表示
                    if (startRangeBtn) {
                        startRangeBtn.classList.remove('hidden');
                        console.log('🎯 音域テストボタン表示完了');
                    }
                }, 1500);
            }
        }

        // ステップインジケーター更新
        updateStepStatus(2, 'completed');
        updateStepStatus(3, 'active');

        console.log('🎉 検出成功処理完了');
    }

    /**
     * 保存済み音域データ表示（preparation.jsから統合）
     */
    displaySavedRangeData(results, rangeSavedDisplay) {
        if (!results || !rangeSavedDisplay) return;

        const savedRange = document.getElementById('saved-range');
        const savedOctaves = document.getElementById('saved-octaves');
        const savedDate = document.getElementById('saved-date');

        if (savedRange && results.range) {
            savedRange.textContent = `${results.range.lowest} - ${results.range.highest}`;
        }

        if (savedOctaves && results.octaveRange) {
            savedOctaves.textContent = `${results.octaveRange.toFixed(1)}オクターブ`;
        }

        if (savedDate && results.timestamp) {
            const date = new Date(results.timestamp);
            savedDate.textContent = date.toLocaleDateString('ja-JP');
        }

        rangeSavedDisplay.classList.remove('hidden');
        console.log('📊 保存済み音域データ表示完了');
    }
}

// ===== グローバルインスタンス =====

// PitchProサイクル管理システム（単一インスタンス）
const pitchProCycleManager = new PitchProCycleManager();

// PitchPro グローバル変数確認
console.log('🔍 PitchPro availability check:', {
    PitchProExists: typeof PitchPro !== 'undefined',
    AudioDetectionComponentExists: typeof PitchPro?.AudioDetectionComponent !== 'undefined',
    windowPitchPro: typeof window.PitchPro !== 'undefined'
});

console.log('🎵 preparation-pitchpro-cycle.js 初期化完了');

// ===== DOM Ready時の初期化 =====

// 緊急修正: より確実なライブラリ読み込み待機
function waitForLibraries() {
    return new Promise((resolve) => {
        let attempts = 0;
        const maxAttempts = 50; // 5秒間待機

        function check() {
            attempts++;

            const pitchProLoaded = typeof window.PitchPro !== 'undefined' &&
                                 typeof window.PitchPro.AudioDetectionComponent !== 'undefined';
            const dataManagerLoaded = typeof DataManager !== 'undefined';
            const lucideLoaded = typeof lucide !== 'undefined';

            if (pitchProLoaded && dataManagerLoaded) {
                console.log('✅ 必須ライブラリ読み込み完了');
                resolve();
                return;
            }

            if (attempts >= maxAttempts) {
                console.error('❌ ライブラリ読み込みタイムアウト');
                resolve(); // タイムアウトしても続行
                return;
            }

            setTimeout(check, 100);
        }

        check();
    });
}

document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 DOMContentLoaded - 初期化開始');

    // ライブラリ読み込み待機
    console.log('⏳ ライブラリ読み込み待機中...');
    await waitForLibraries();

    // 基本要素の確認完了
    console.log('🔍 基本要素確認完了');

    // PitchProサイクル管理システム初期化
    console.log('🔧 PitchProサイクル管理システム初期化中...');

    let initResult;
    try {
        initResult = await pitchProCycleManager.initialize();
        console.log('🔍 初期化結果:', initResult);
    } catch (error) {
        console.error('🚨 初期化処理中に例外発生:', error);
        initResult = { success: false, error: error.message, fullError: error };
    }

    if (!initResult.success) {
        console.error('🚨 PitchProサイクル管理システム初期化失敗:', initResult.error);
        console.error('🚨 完全なエラー詳細:', initResult.fullError);

        // ボタンにエラー状態を表示
        if (requestMicBtn) {
            requestMicBtn.innerHTML = '<i data-lucide="alert-circle" style="width: 24px; height: 24px;"></i><span>初期化失敗 - 詳細はコンソールを確認</span>';
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
        }

        // エラーが発生してもマイクボタンの設定は続行
        console.log('⚠️ 初期化失敗でもボタン設定を続行');
    }

    // マイク許可ボタンイベント設定（必ず実行）
    console.log('🎤 マイク許可ボタンイベント設定開始');
    setupMicPermissionFlow();

    // ステップインジケーター初期化
    console.log('📊 ステップインジケーター初期化');
    updateStepStatus(1, 'active');

    console.log('✅ 全ての初期化処理完了');
});

// ===== マイク許可フロー =====

/**
 * マイク許可フローセットアップ
 * PitchProサイクル: 初期化 → スタート の流れ
 */
function setupMicPermissionFlow() {
    console.log('🔧 setupMicPermissionFlow開始');
    const requestMicBtn = document.getElementById('request-mic-btn');
    console.log('🔍 マイクボタン要素:', requestMicBtn);

    if (!requestMicBtn) {
        console.error('❌ マイク許可ボタンが見つかりません');
        // 緊急: 少し待ってから再試行
        setTimeout(() => {
            console.log('🔄 マイクボタン再検索...');
            setupMicPermissionFlow();
        }, 1000);
        return;
    }

    console.log('✅ イベントリスナーを設定します');

    // シンプルで確実なイベント設定（preparation-simple-test.htmlの成功パターン）
    requestMicBtn.addEventListener('click', async () => {
        console.log('🎤 マイク許可ボタンがクリックされました！');

        try {
            // ボタンを無効化してローディング表示
            requestMicBtn.disabled = true;
            requestMicBtn.innerHTML = '<i data-lucide="loader" style="width: 24px; height: 24px;"></i><span>許可を待っています...</span>';
            if (typeof lucide !== 'undefined') lucide.createIcons();

            // PitchProサイクル管理を使う場合
            if (typeof pitchProCycleManager !== 'undefined' && pitchProCycleManager && pitchProCycleManager.audioDetector) {
                // AudioDetectionComponentの初期化（v1.3.1では内部でマイク許可も処理）
                console.log('🎤 AudioDetectionComponent.initialize() 開始（マイク許可含む）');
                try {
                    await pitchProCycleManager.audioDetector.initialize();
                    console.log('✅ AudioDetectionComponent.initialize() 完了');
                    console.log('✅ マイク許可成功！');

                    // Phase 2: 音声テスト開始（状態管理を含む）
                    console.log('🎤 音声テスト開始');
                    const startResult = await pitchProCycleManager.startAudioDetection('audiotest');
                    if (!startResult.success) {
                        throw new Error(`音声テスト開始失敗: ${startResult.error}`);
                    }
                    console.log('✅ 音声テスト開始成功（PitchProサイクル管理）');

                } catch (initError) {
                    console.warn('⚠️ AudioDetectionComponent初期化エラー:', initError);
                }
            }

            // UI状態更新
            updateStepStatus(1, 'completed');
            updateStepStatus(2, 'active');

            // セクション切り替え（即座に実行）
            const permissionSection = document.getElementById('permission-section');
            const audioTestSection = document.getElementById('audio-test-section');

            if (permissionSection && audioTestSection) {
                permissionSection.classList.add('hidden');
                audioTestSection.classList.remove('hidden');
                console.log('✅ 音声テストセクションに切り替えました');
            }

            // ストリームは後でPitchProが使うので停止しない
            console.log('✅ マイク許可完了（ストリームは維持）');

        } catch (error) {
            console.error('❌ マイク許可エラー:', error);

            // エラー表示
            requestMicBtn.disabled = false;
            requestMicBtn.innerHTML = '<i data-lucide="alert-circle" style="width: 24px; height: 24px;"></i><span>許可に失敗 - 再試行</span>';
            if (typeof lucide !== 'undefined') lucide.createIcons();

            alert(`マイク許可エラー: ${error.message}`);
        }
    });

    // 再テストボタンのイベントリスナー
    const retestRangeBtn = document.getElementById('retest-range-btn');
    if (retestRangeBtn) {
        retestRangeBtn.addEventListener('click', async () => {
            console.log('🔄 音域再テストボタンがクリックされました');

            try {
                // 音域データを削除
                try {
                    if (typeof DataManager !== 'undefined' && DataManager.clearVoiceRangeData) {
                        DataManager.clearVoiceRangeData();
                        console.log('✅ DataManager経由で音域データを削除');
                    } else {
                        localStorage.removeItem('voiceRangeData');
                        console.log('✅ localStorage経由で音域データを削除');
                    }
                } catch (error) {
                    console.warn('⚠️ DataManager利用不可、localStorage直接削除にフォールバック');
                    localStorage.removeItem('voiceRangeData');
                }

                // 音域設定済み表示を非表示
                const rangeSavedDisplay = document.getElementById('range-saved-display');
                if (rangeSavedDisplay) {
                    rangeSavedDisplay.classList.add('hidden');
                    console.log('📋 音域設定済み表示を非表示にしました');
                }

                // ステップ2（音声テスト）を完了、ステップ3（音域テスト）をアクティブに
                updateStepStatus(2, 'completed');
                updateStepStatus(3, 'active');

                // 音域テストセクションに移動
                const audioTestSection = document.getElementById('audio-test-section');
                const rangeTestSection = document.getElementById('range-test-section');

                if (audioTestSection) audioTestSection.classList.add('hidden');
                if (rangeTestSection) rangeTestSection.classList.remove('hidden');

                console.log('✅ 音域テストセクションに移動完了');

            } catch (error) {
                console.error('❌ 音域再テスト処理エラー:', error);
                alert(`音域再テスト処理に失敗しました: ${error.message}`);
            }
        });
    }
}

/**
 * マイク許可ボタン状態更新
 */
function updateMicButtonState(state) {
    const requestMicBtn = document.getElementById('request-mic-btn');
    if (!requestMicBtn) return;

    switch (state) {
        case 'loading':
            requestMicBtn.disabled = true;
            requestMicBtn.innerHTML = '<i data-lucide="loader" style="width: 24px; height: 24px;"></i><span>許可を待っています...</span>';
            break;

        case 'error':
            requestMicBtn.disabled = false;
            requestMicBtn.innerHTML = '<i data-lucide="alert-circle" style="width: 24px; height: 24px;"></i><span>マイク許可失敗 - 再試行</span>';
            break;

        case 'success':
            requestMicBtn.disabled = true;
            requestMicBtn.innerHTML = '<i data-lucide="check-circle" style="width: 24px; height: 24px;"></i><span>許可完了</span>';
            break;

        default:
            requestMicBtn.disabled = false;
            requestMicBtn.innerHTML = '<i data-lucide="mic" style="width: 24px; height: 24px;"></i><span>マイクを許可</span>';
    }

    lucide.createIcons();
}

// ===== UI制御ユーティリティ =====

/**
 * ステップインジケーター更新
 */
function updateStepStatus(stepNumber, status) {
    const step = document.getElementById(`step-${stepNumber}`);
    if (!step) return;

    step.classList.remove('active', 'completed');
    if (status === 'active') {
        step.classList.add('active');
    } else if (status === 'completed') {
        step.classList.add('completed');
    }

    // コネクター更新
    if (stepNumber > 1) {
        const connector = document.getElementById(`connector-${stepNumber - 1}`);
        if (connector && status === 'completed') {
            connector.classList.add('active');
        }
    }
}

/**
 * セクション表示切り替え
 */
function showSection(sectionToShow) {
    const sections = [
        document.getElementById('permission-section'),
        document.getElementById('audio-test-section'),
        document.getElementById('range-test-section'),
        document.getElementById('result-section')
    ].filter(section => section !== null);

    sections.forEach(section => section.classList.add('hidden'));
    if (sectionToShow) {
        sectionToShow.classList.remove('hidden');
    }
}