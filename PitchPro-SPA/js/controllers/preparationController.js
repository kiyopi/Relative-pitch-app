// preparation-pitchpro-cycle.js - PitchProサイクルベース実装
// 初期化 → スタート → リセット → 放棄 のサイクル設計

// Lucide初期化を確実に実行
if (typeof lucide !== 'undefined') {
    lucide.createIcons();
} else {
}

// ===== UIコンポーネントインポート =====
import { createStepIndicator, createProgressBar } from '../components/index.js';

// グローバルコンポーネントインスタンス
let stepIndicatorComponent = null;
let volumeProgressComponent = null;

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
        };

        // 状態管理
        this.state = {
            detectionActive: false,
            detectedPitches: [],
            detectionStartTime: null,
            currentMode: 'permission' // permission, audiotest
        };

        // 設定値（PitchProデフォルト設定を使用）
        this.config = {
            MIN_DETECTION_TIME: 1000,        // 1秒間（UI用のみ）
            // PitchProのデフォルト閾値を使用（上書きしない）
        };

    }

    /**
     * Phase 1: 初期化（Initialize）
     * デバイス検出、UI要素キャッシュ、AudioDetectionComponent作成
     */
    async initialize() {
        try {

            // デバイス検出（iPadOS 13+対応）
            this.deviceSpecs = this.detectDeviceWithSpecs();

            // UI要素キャッシュ（v1.3.1キャッシュベース管理）
            this.cacheUIElements();

            // PitchPro グローバル確認
            if (typeof window.PitchPro === 'undefined') {
                throw new Error('PitchProライブラリが読み込まれていません');
            }

            if (typeof window.PitchPro.AudioDetectionComponent === 'undefined') {
                throw new Error('AudioDetectionComponentが見つかりません');
            }


            // PitchPro AudioDetectionComponent作成（デフォルト設定使用）
            this.audioDetector = new window.PitchPro.AudioDetectionComponent({
                volumeBarSelector: '#volume-progress',
                volumeTextSelector: '#volume-value',
                frequencySelector: '#frequency-value',
                noteSelector: null, // 音程表示は使用しない
                autoUpdateUI: true, // PitchProの最適化されたUI更新を使用
                debug: true,
                // PitchProのデフォルト閾値を明示的に使用
                clarityThreshold: 0.4,  // デフォルト値（0.8から0.4に変更）
                volumeThreshold: 0.003  // デフォルト値（0.1から0.003に変更）
            });

            // v1.3.1統合管理システム - デバイス自動最適化
            if (this.audioDetector.detectAndOptimizeDevice) {
                await this.audioDetector.detectAndOptimizeDevice();
                console.log('✅ デバイス自動最適化完了（統合管理）');
            }

            // 初期化はボタンクリック時に行うため、ここではスキップ

            this.currentPhase = 'initialized';

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

            if (this.currentPhase !== 'initialized' && this.currentPhase !== 'reset') {
                throw new Error(`不正な状態からのスタート: ${this.currentPhase}`);
            }

            // 状態初期化（タイマーは初回音声検出時に開始）
            this.state.detectionActive = true;
            this.state.detectedPitches = [];
            this.state.detectionStartTime = null; // 初回音声検出時に設定
            this.state.currentMode = mode;

            // 【重要】コールバック設定を最初に行う
            this.audioDetector.setCallbacks({
                onPitchUpdate: (result) => this.handlePitchUpdate(result),
                onVolumeUpdate: (volume) => this.handleVolumeUpdate(volume),
                onError: (context, error) => this.handleAudioError(context, error),
                onStateChange: (state) => {}
            });
            console.log('✅ コールバック設定完了（最初）');

            // モード別UI設定（コールバック設定の後）
            this.updateUISelectorsForMode(mode);

            // updateSelectors()でコールバックがクリアされるため、再度設定
            this.audioDetector.setCallbacks({
                onPitchUpdate: (result) => this.handlePitchUpdate(result),
                onVolumeUpdate: (volume) => this.handleVolumeUpdate(volume),
                onError: (context, error) => this.handleAudioError(context, error),
                onStateChange: (state) => {}
            });
            console.log('✅ コールバック再設定完了（updateSelectors後）');

            // 検出開始
            await this.audioDetector.startDetection();

            this.currentPhase = 'started';

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

            // 検出停止（PitchPro標準）
            if (this.audioDetector && this.state.detectionActive) {
                await this.audioDetector.stopDetection();
            }

            // PitchPro UIリセット実行（正しいメソッド使用）

            if (this.audioDetector && this.audioDetector.resetDisplayElements) {

                // reset前の音量バー状態を記録
                const volumeBar = document.getElementById('volume-progress');
                const volumeText = document.getElementById('volume-value');
                const beforeReset = {
                    volumeBarWidth: volumeBar ? volumeBar.style.width : 'null',
                    volumeTextContent: volumeText ? volumeText.textContent : 'null'
                };

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

        // 【重要】autoUpdateUI: trueの場合、PitchProが自動でUI更新を行うため、
        // ここでは手動UI更新を行わない（競合によるちらつきを防止）

        // モード別処理（アプリケーションロジックのみ）
        switch (this.state.currentMode) {
            case 'audiotest':
                this.handleAudioTestPitchUpdate(result);
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

        // PitchPro v1.3.1統合管理システム - FAQ推奨の完全リセット
        if (this.audioDetector) {
            await this.audioDetector.microphoneController.reset();
            this.state.detectionActive = false;
            console.log('🔄 システム完全リセット完了（FAQ推奨統合管理）');
        }

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

            // 既存の音域データをチェック（DataManager）
            let voiceRangeData = null;
            try {
                if (typeof DataManager !== 'undefined' && DataManager.getVoiceRangeData) {
                    voiceRangeData = DataManager.getVoiceRangeData();
                    console.log('🔍 DataManager音域データ:', voiceRangeData);
                }
            } catch (error) {
                console.warn('⚠️ DataManager利用エラー:', error);
            }

            // UI要素取得
            const noRangeActions = document.getElementById('no-range-data-actions');
            const hasRangeActions = document.getElementById('has-range-data-actions');
            const savedRangeInfo = document.getElementById('saved-range-info');
            const audioTestContent = document.getElementById('audio-test-content');

            console.log('📋 UI要素取得:', {
                noRangeActions: !!noRangeActions,
                hasRangeActions: !!hasRangeActions,
                savedRangeInfo: !!savedRangeInfo
            });

            // 1.5秒後に分岐処理を実行
            setTimeout(() => {
                // 音声テストコンテンツを非表示
                if (audioTestContent) {
                    audioTestContent.classList.add('hidden');
                    console.log('✅ audio-test-content を非表示');
                }

                if (voiceRangeData && voiceRangeData.results) {
                    // 音域データあり - トレーニング開始 or 再測定
                    console.log('✅ 音域データ検出 - トレーニング開始可能');

                    if (noRangeActions) noRangeActions.classList.add('hidden');
                    if (hasRangeActions) hasRangeActions.classList.remove('hidden');

                    // 保存済み音域データを表示
                    if (savedRangeInfo) {
                        const { lowestNote, highestNote, range } = voiceRangeData.results;
                        savedRangeInfo.textContent = `${lowestNote} - ${highestNote} (${range})`;
                    }

                    // イベントリスナー設定
                    this.setupRangeDataActions();

                } else {
                    // 音域データなし - 音域テストへ進む
                    console.log('⚠️ 音域データなし - 音域テスト必要');

                    if (hasRangeActions) hasRangeActions.classList.add('hidden');
                    if (noRangeActions) noRangeActions.classList.remove('hidden');

                    // イベントリスナー設定
                    this.setupNoRangeDataActions();
                }
            }, 1500);
        }

        console.log('🎉 検出成功処理完了');
    }

    /**
     * 音域データあり時のアクション設定
     */
    setupRangeDataActions() {
        const remeasureBtn = document.getElementById('remeasure-range-btn');
        const skipToTrainingBtn = document.getElementById('skip-to-training-btn');

        if (remeasureBtn) {
            remeasureBtn.addEventListener('click', () => {
                console.log('🔄 音域再測定開始');
                this.showRangeTestSection();
            });
        }

        if (skipToTrainingBtn) {
            skipToTrainingBtn.addEventListener('click', () => {
                console.log('🎯 トレーニングページへ遷移');
                window.location.hash = 'training';
            });
        }
    }

    /**
     * 音域データなし時のアクション設定
     */
    setupNoRangeDataActions() {
        const gotoRangeTestBtn = document.getElementById('goto-range-test-btn');

        if (gotoRangeTestBtn) {
            gotoRangeTestBtn.addEventListener('click', () => {
                console.log('📊 音域テストセクションへ移動');
                this.showRangeTestSection();
            });
        }
    }

    /**
     * 音域テストセクションを表示
     */
    showRangeTestSection() {
        // 音声テストセクションを非表示
        const audioTestSection = document.getElementById('audio-test-section');
        if (audioTestSection) {
            audioTestSection.classList.add('hidden');
        }

        // 音域テストセクションを表示
        const rangeTestSection = document.getElementById('range-test-section');
        if (rangeTestSection) {
            rangeTestSection.classList.remove('hidden');
            console.log('✅ 音域テストセクション表示完了');
        }

        // ステップインジケーター更新
        updateStepStatus(2, 'completed');
        updateStepStatus(3, 'active');
    }

    /**
     * 保存済み音域データ表示（preparation.jsから統合）
     */
    displaySavedRangeData(voiceRangeData, rangeSavedDisplay) {
        if (!voiceRangeData || !rangeSavedDisplay) return;

        const savedRange = document.getElementById('saved-range');
        const savedOctaves = document.getElementById('saved-octaves');
        const savedDate = document.getElementById('saved-date');

        // voiceRangeData.resultsまたはvoiceRangeData自体を確認
        const results = voiceRangeData.results || voiceRangeData;

        // rangeフィールドの処理を修正
        if (savedRange && results.range) {
            // results.rangeが文字列の場合（"A2 - F5"形式）
            if (typeof results.range === 'string') {
                savedRange.textContent = results.range;
            }
            // results.rangeがオブジェクトの場合（{lowest: "A2", highest: "F5"}形式）
            else if (results.range.lowest && results.range.highest) {
                savedRange.textContent = `${results.range.lowest} - ${results.range.highest}`;
            }
        }

        // octavesフィールドの処理を修正（octaveRangeまたはoctavesを確認）
        if (savedOctaves) {
            if (results.octaves !== undefined) {
                savedOctaves.textContent = `${results.octaves.toFixed(1)}オクターブ`;
            } else if (results.octaveRange !== undefined) {
                savedOctaves.textContent = `${results.octaveRange.toFixed(1)}オクターブ`;
            }
        }

        // timestampの確認（親レベルまたはresultsレベル）
        if (savedDate) {
            const timestamp = voiceRangeData.timestamp || results.timestamp;
            if (timestamp) {
                const date = new Date(timestamp);
                savedDate.textContent = date.toLocaleDateString('ja-JP');
            }
        }

        rangeSavedDisplay.classList.remove('hidden');
        console.log('📊 保存済み音域データ表示完了');
    }

    /**
     * Step2への遷移処理
     */
    async transitionToStep2() {
        console.log('🚀 Step2遷移処理開始');

        try {
            // Step1完了データの最終保存
            const step1CompletionData = {
                micPermissionGranted: localStorage.getItem('micPermissionGranted'),
                audioTestCompleted: localStorage.getItem('audioTestCompleted'),
                step1CompletedAt: new Date().toISOString()
            };

            localStorage.setItem('step1CompletionData', JSON.stringify(step1CompletionData));
            console.log('💾 Step1完了データ保存:', step1CompletionData);

            // PitchProインスタンスのクリーンアップ（統合管理）
            await this.cleanupPitchPro();

            // Step2ページに遷移
            console.log('🔄 preparation-step2.htmlに遷移中...');
            window.location.href = 'preparation-step2.html';

        } catch (error) {
            console.error('❌ Step2遷移処理エラー:', error);
            alert('Step2への遷移でエラーが発生しました。再度お試しください。');
        }
    }

    /**
     * PitchPro v1.3.1統合管理システム - FAQ推奨クリーンアップ
     */
    async cleanupPitchPro() {
        console.log('🧹 PitchProリソースクリーンアップ開始（統合管理）');

        if (this.audioDetector) {
            try {
                // 音声検出を停止
                if (typeof this.audioDetector.stopDetection === 'function') {
                    await this.audioDetector.stopDetection();
                    console.log('✅ 音声検出停止完了');
                }

                // マイクロフォンコントローラーリセット
                if (this.audioDetector.microphoneController) {
                    await this.audioDetector.microphoneController.reset();
                    console.log('✅ マイクロフォンコントローラーリセット完了');
                }

                // AudioDetectionComponentのdestroyメソッドを呼び出し（存在する場合）
                if (typeof this.audioDetector.destroy === 'function') {
                    await this.audioDetector.destroy();
                    console.log('✅ AudioDetectionComponent破棄完了');
                }

                this.audioDetector = null;
                console.log('✅ システム完全リセット＆インスタンス削除完了（FAQ推奨）');

            } catch (error) {
                console.warn('⚠️ クリーンアップ中にエラーが発生:', error.message);
                // エラーが発生してもインスタンスはnullにする
                this.audioDetector = null;
            }
        }

        // UIコンポーネントのクリーンアップ
        try {
            if (stepIndicatorComponent && stepIndicatorComponent.instance) {
                stepIndicatorComponent.instance.destroy();
                stepIndicatorComponent = null;
                console.log('✅ StepIndicatorコンポーネント破棄完了');
            }

            if (volumeProgressComponent && volumeProgressComponent.instance) {
                volumeProgressComponent.instance.destroy();
                volumeProgressComponent = null;
                console.log('✅ VolumeProgressコンポーネント破棄完了');
            }
        } catch (error) {
            console.warn('⚠️ UIコンポーネントクリーンアップエラー:', error.message);
        }

        this.currentPhase = 'abandoned';
        this.state.detectionActive = false;
        console.log('🧹 PitchProリソースクリーンアップ完了（統合管理）');
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

            // Step 1: 明示的にマイク許可要求（ブラウザのダイアログを確実に表示）
            console.log('🎤 ブラウザのマイク許可ダイアログを表示します...');
            console.log('🔍 navigator.mediaDevices:', navigator.mediaDevices);
            console.log('🔍 getUserMedia available:', typeof navigator.mediaDevices?.getUserMedia);

            let stream;
            try {
                console.log('📞 getUserMedia() 呼び出し開始...');
                stream = await navigator.mediaDevices.getUserMedia({
                    audio: {
                        sampleRate: 44100,
                        channelCount: 1,
                        echoCancellation: false,
                        noiseSuppression: false,
                        autoGainControl: false
                    }
                });
                console.log('✅ マイク許可が完了しました！');
                console.log('📊 Stream tracks:', stream.getTracks());

                // 一旦ストリームを停止（PitchProが再度取得する）
                stream.getTracks().forEach(track => {
                    console.log(`🛑 Stopping track: ${track.kind} - ${track.label}`);
                    track.stop();
                });

            } catch (permissionError) {
                console.error('❌ マイク許可が拒否されました:', permissionError);
                console.error('❌ Error name:', permissionError.name);
                console.error('❌ Error message:', permissionError.message);
                throw permissionError;
            }

            // Step 2: PitchProサイクル管理でAudioDetectionComponentを初期化
            console.log('🔍 Checking preparationManager:', typeof window.preparationManager, window.preparationManager);
            if (window.preparationManager && window.preparationManager.audioDetector) {
                console.log('🎤 AudioDetectionComponent.initialize() 開始');
                try {
                    // 【重要】ここでawaitを確実に待つ
                    await window.preparationManager.audioDetector.initialize();
                    console.log('✅ AudioDetectionComponent.initialize() 完了');

                    // localStorage保存
                    localStorage.setItem('micPermissionGranted', 'true');
                    localStorage.setItem('micPermissionTimestamp', new Date().toISOString());
                    console.log('💾 micPermissionGranted localStorage保存完了');

                    // Step 3: 音声テスト開始（初期化完了後にのみ実行）
                    console.log('🎤 音声テスト開始');
                    const startResult = await window.preparationManager.startAudioDetection('audiotest');
                    if (!startResult.success) {
                        throw new Error(`音声テスト開始失敗: ${startResult.error}`);
                    }
                    console.log('✅ 音声テスト開始成功（PitchProサイクル管理）');

                    // AudioDetectionComponentインスタンスをグローバルに共有
                    window.globalAudioDetector = window.preparationManager.audioDetector;
                    console.log('✅ globalAudioDetectorをStep2連携用に設定');

                } catch (initError) {
                    console.error('❌ AudioDetectionComponent初期化エラー:', initError);
                    throw initError;
                }
            } else {
                console.error('❌ preparationManager または audioDetector が見つかりません');
            }

            // Step 4: すべての初期化が完了した後にUI更新を実行
            console.log('🎉 すべての初期化が完了 - UI切り替えを開始');

            // UI状態更新
            updateStepStatus(1, 'completed');
            updateStepStatus(2, 'active');

            // セクション切り替え（すべての処理完了後に実行）
            const permissionSection = document.getElementById('permission-section');
            const audioTestSection = document.getElementById('audio-test-section');

            if (permissionSection && audioTestSection) {
                permissionSection.classList.add('hidden');
                audioTestSection.classList.remove('hidden');
                console.log('✅ 音声テストセクションに切り替えました');
            }

            console.log('✅ マイク許可フロー完全完了');

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

    // 🔄 再測定ボタン（音域設定済み表示画面用）- Step2遷移に変更
    const remeasureRangeBtn = document.getElementById('remeasure-range-btn');
    if (remeasureRangeBtn) {
        remeasureRangeBtn.addEventListener('click', async () => {
            console.log('🔄 再測定ボタン（音域設定済み表示）がクリックされました');

            try {
                // 音域データを削除（再測定のため）
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

                // PitchProリソースのクリーンアップ（統合管理）
                await pitchProCycleManager.cleanupPitchPro();

                // Step2（音域テスト）へ遷移
                console.log('🔄 Step2（音域テスト）に遷移中...');
                window.location.href = 'preparation-step2.html';

            } catch (error) {
                console.error('❌ 音域再測定処理エラー:', error);
                alert(`音域再測定処理に失敗しました: ${error.message}`);
            }
        });
    }

    // 🚀 トレーニング開始ボタン（音域設定済み表示画面用）- training.html遷移に変更
    const skipRangeTestBtn = document.getElementById('skip-range-test-btn');
    if (skipRangeTestBtn) {
        skipRangeTestBtn.addEventListener('click', async () => {
            console.log('🚀 トレーニング開始ボタン（音域設定済み表示）がクリックされました');

            try {
                // 音域データ確認済みフラグ
                localStorage.setItem('rangeDataConfirmed', 'true');
                localStorage.setItem('step1CompletedViaExistingData', 'true');

                // PitchProリソースのクリーンアップ（統合管理）
                await pitchProCycleManager.cleanupPitchPro();

                // training.htmlへ遷移
                console.log('🚀 training.htmlに遷移中...');
                window.location.href = '../training.html';

            } catch (error) {
                console.error('❌ トレーニング開始処理エラー:', error);
                alert(`トレーニング開始処理に失敗しました: ${error.message}`);
            }
        });
    }

    // 音域テスト開始ボタンのイベントリスナー（test-preparation-original.jsの成功パターン）
    const startRangeTestBtn = document.getElementById('start-range-test-btn');
    if (startRangeTestBtn) {
        startRangeTestBtn.addEventListener('click', async () => {
            console.log('🎤 音域テストセクションへ移動ボタンがクリックされました');
            try {
                // 確実な画面切り替え処理（test-preparation-original.jsと同じ）
                const audioTestSection = document.getElementById('audio-test-section');
                const rangeTestSection = document.getElementById('range-test-section');

                if (audioTestSection) {
                    audioTestSection.classList.add('hidden');
                    console.log('✅ audio-test-section を非表示にしました');
                }
                if (rangeTestSection) {
                    rangeTestSection.classList.remove('hidden');
                    console.log('✅ range-test-section を表示しました');
                }

                // ステップインジケーター更新
                updateStepStatus(2, 'completed');
                updateStepStatus(3, 'active');

                console.log('✅ 音域テストセクションへの移動完了');
            } catch (error) {
                console.error('❌ 音域テストセクション移動エラー:', error);
                alert(`音域テストセクションへの移動に失敗しました: ${error.message}`);
            }
        });
    } else {
        console.warn('⚠️ 音域テストを開始ボタンが見つかりません（後で設定される可能性があります）');
    }

}

// ===== ユーティリティ関数 =====


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
 * ステップインジケーター更新（新コンポーネント使用）
 */
function updateStepStatus(stepNumber, status) {
    // 新コンポーネントが存在する場合は使用
    if (stepIndicatorComponent) {
        if (status === 'active') {
            stepIndicatorComponent.instance.setCurrentStep(stepNumber - 1);
        } else if (status === 'completed') {
            stepIndicatorComponent.instance.completeStep(stepNumber - 1);
            // 次のステップをアクティブにする場合
            if (stepNumber < 3) {
                stepIndicatorComponent.instance.setCurrentStep(stepNumber);
            }
        }
        return;
    }

    // フォールバック：従来の実装
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

// ===== SPA用エクスポート関数 =====

/**
 * preparation ページ初期化関数
 * ルーターから動的インポート時に呼び出される
 */
/**
 * 必要なスクリプトを動的に読み込む
 */
async function loadRequiredScripts() {
    const scriptsToLoad = [
        '../js/data-manager.js',
        'pages/js/core/pitchpro-v1.3.1.umd.js'
    ];

    for (const scriptSrc of scriptsToLoad) {
        // 既に読み込まれているかチェック
        if (!document.querySelector(`script[src="${scriptSrc}"]`)) {
            await new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = scriptSrc;
                script.onload = resolve;
                script.onerror = reject;
                document.head.appendChild(script);
            });
        }
    }
}

// 初期化済みフラグ（重複初期化防止）
let isPreparationPageInitialized = false;

// フラグリセット関数（ページ遷移時に呼ばれる）
export function resetPreparationPageFlag() {
    console.log('🔄 Resetting preparation page initialization flag');
    isPreparationPageInitialized = false;
}

// グローバルに公開（router.jsから呼び出し可能にする）
window.resetPreparationPageFlag = resetPreparationPageFlag;

export async function initializePreparationPage() {
    // 重複初期化チェック
    if (isPreparationPageInitialized) {
        console.warn('⚠️ Preparation page already initialized, skipping...');
        return;
    }

    console.log('Initializing preparation page...');
    isPreparationPageInitialized = true;

    try {
        // 必要なライブラリの確認
        if (typeof window.PitchPro === 'undefined') {
            console.warn('PitchPro library not loaded, some features may not work');
        }
        if (typeof DataManager === 'undefined') {
            console.warn('DataManager not loaded, some features may not work');
        }

        // UIコンポーネントを初期化（オプション - エラーでも続行）
        try {
            await initializeUIComponents();
        } catch (uiError) {
            console.warn('UI components initialization failed, using fallback:', uiError);
        }

        // PitchProCycleManager を初期化
        if (typeof window.preparationManager === 'undefined') {
            window.preparationManager = new PitchProCycleManager();
        }

        // ページ固有の初期化処理
        const initResult = await window.preparationManager.initialize();
        if (!initResult.success) {
            console.warn('PitchProCycleManager initialization failed:', initResult.error);
        }

        // マイク許可フローセットアップ（SPA用）
        setupMicPermissionFlow();

        // ステップインジケーター初期化
        updateStepStatus(1, 'active');

        console.log('Preparation page initialized successfully');
    } catch (error) {
        console.error('Preparation page initialization failed:', error);
        throw error;
    }
}

/**
 * UIコンポーネント初期化
 */
async function initializeUIComponents() {
    try {
        console.log('🎨 UIコンポーネント初期化開始...');

        // ステップインジケーター初期化
        const stepContainer = document.querySelector('.step-indicators-container, .step-indicator-container, #step-indicators');
        if (stepContainer) {
            stepIndicatorComponent = await createStepIndicator(stepContainer, {
                currentStep: 0,
                onStepChange: (stepIndex, stepInfo) => {
                    console.log(`✅ ステップ変更: ${stepIndex} - ${stepInfo?.label}`);
                }
            });
            console.log('✅ StepIndicatorコンポーネント初期化完了');
        } else {
            console.warn('⚠️ ステップインジケーターコンテナが見つかりません');
        }

        // 音量プログレスバー初期化（VolumeBarController互換）
        const volumeContainer = document.querySelector('#volume-progress-container, .volume-bar-container');
        if (volumeContainer) {
            volumeProgressComponent = await createProgressBar(volumeContainer, {
                variant: 'volume',
                color: 'green',
                showText: true,
                onProgressUpdate: (_, percentage) => {
                    console.log(`🔊 音量更新: ${percentage.toFixed(1)}%`);
                }
            });
            console.log('✅ VolumeProgressコンポーネント初期化完了');
        }

        console.log('🎨 UIコンポーネント初期化完了');

    } catch (error) {
        console.warn('⚠️ UIコンポーネント初期化エラー（フォールバック使用）:', error);
        // エラーが発生しても処理は継続（従来のUI制御を使用）
    }
}

