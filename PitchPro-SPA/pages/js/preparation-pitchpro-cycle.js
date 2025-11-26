/**
 * preparation-pitchpro-cycle.js - PitchProサイクルベース実装
 * 初期化 → スタート → リセット → 放棄 のサイクル設計
 *
 * Changelog:
 *   v1.1.0 (2025-11-19) - preparation → training遷移をNavigationManager統一API使用に変更
 *                         AudioDetector保持のため、トレーニングフロー内遷移を正しく管理
 */

// Lucide初期化はDOMContentLoadedイベント内で実行（HTMLが読み込まれた後）

// ===== グローバル変数 =====
// 【v4.7.0削除】micPermissionListenerAddedフラグ廃止
// 理由: SPAでは毎回新しいDOM要素が作成されるため、フラグ管理は不要
// 詳細: SPA_DEVELOPMENT_JOURNEY_AND_ARCHITECTURE.md 参照

// ===== デバッグ設定 =====
const DEBUG_MIC_TEST = true; // マイクテスト詳細ログ（🎤 PitchPro検出、⏰ 経過時間）- ノイズレベル確認のため一時的にtrue
const DEBUG_NOISE_LEVEL = true; // 【デバッグ用】ノイズレベル確認用ログ（rawVolume含む）

// ===== 【v4.4.0統一】音量永続化ヘルパー関数 =====
// 設定ページのティックスライダーと同じキーを使用

/**
 * 設定ページの音量オフセット（dB）を取得
 * @returns {number} -20〜+20のdB値（未保存の場合は0）
 */
function getBaseNoteVolumeOffset() {
    const KEY = 'pitchpro_base_note_volume_offset';
    try {
        const saved = localStorage.getItem(KEY);
        if (saved !== null) {
            const parsed = parseInt(saved, 10);
            if (!isNaN(parsed) && parsed >= -20 && parsed <= 20) {
                return parsed;
            }
        }
    } catch (e) {
        console.warn('⚠️ 音量オフセット読み込み失敗:', e);
    }
    return 0; // デフォルト値（オフセットなし）
}

/**
 * 保存済み音量設定を取得（dB値）
 * @returns {number} dB値（DeviceDetector基準音量 + ユーザー調整オフセット）
 */
function getSavedVolumeDb() {
    const baseVolume = window.DeviceDetector?.getDeviceVolume() ?? -6;
    const volumeOffset = getBaseNoteVolumeOffset();
    return baseVolume + volumeOffset;
}

/**
 * 【v4.1.0】MediaStream健全性検証関数
 * iOS Safariで一度破棄したMediaStreamを再取得した際に、
 * 実際に音声データが流れているかを検証する
 *
 * @param {Object} audioDetector - AudioDetectionComponentインスタンス
 * @returns {Promise<{healthy: boolean, reason?: string, details?: Object}>}
 */
async function verifyMediaStreamHealth(audioDetector) {
    // 【ログ削減】冗長なログを削除
    // console.log('🔍 [v4.1.0] MediaStream健全性検証開始...');

    try {
        // 1. AudioDetectorの基本状態確認
        if (!audioDetector) {
            return { healthy: false, reason: 'AudioDetector未定義' };
        }

        // 2. MicrophoneControllerへのアクセス
        const micController = audioDetector.microphoneController;
        if (!micController) {
            return { healthy: false, reason: 'MicrophoneController未取得' };
        }

        // 3. AudioManagerへのアクセス
        const audioManager = micController.audioManager;
        if (!audioManager) {
            return { healthy: false, reason: 'AudioManager未取得' };
        }

        // 4. MediaStream存在確認
        const mediaStream = audioManager.mediaStream || audioManager._mediaStream;
        if (!mediaStream) {
            return { healthy: false, reason: 'MediaStream未取得' };
        }

        // 5. トラック状態確認
        const audioTracks = mediaStream.getAudioTracks();
        if (audioTracks.length === 0) {
            return { healthy: false, reason: 'オーディオトラックなし' };
        }

        const track = audioTracks[0];
        const trackState = {
            enabled: track.enabled,
            muted: track.muted,
            readyState: track.readyState
        };

        // 【ログ削減】console.log('🔍 [v4.1.0] トラック状態:', trackState);

        // 6. トラックがliveでない場合は失敗
        if (track.readyState !== 'live') {
            return {
                healthy: false,
                reason: `トラック状態が異常: ${track.readyState}`,
                details: trackState
            };
        }

        // 7. トラックがmutedの場合は失敗
        if (track.muted) {
            return {
                healthy: false,
                reason: 'トラックがミュート状態',
                details: trackState
            };
        }

        // 8. 実際の音声データ検証（AnalyserNodeを使用）
        const analyser = audioManager.analyserNode ||
                        audioManager.filteredAnalyser ||
                        audioManager.rawAnalyser;

        if (analyser) {
            const dataArray = new Float32Array(analyser.fftSize);
            analyser.getFloatTimeDomainData(dataArray);

            // 少なくとも一部のデータが非ゼロであることを確認
            const hasNonZeroData = dataArray.some(v => v !== 0);
            // 【ログ削減】
            // console.log('🔍 [v4.1.0] AnalyserNode データ検証:', {
            //     hasNonZeroData,
            //     sampleValues: Array.from(dataArray.slice(0, 10))
            // });

            // 注: 静かな環境では全てゼロになる可能性があるため、
            // ここでは警告のみとし、失敗とはしない
            if (!hasNonZeroData) {
                console.warn('⚠️ [v4.1.0] AnalyserNodeデータが全てゼロ（静かな環境の可能性）');
            }
        }

        // 9. AudioContext状態確認（suspended/interrupted両方を処理）
        const audioContext = audioManager.audioContext;
        if (audioContext && (audioContext.state === 'suspended' || audioContext.state === 'interrupted')) {
            console.log(`🔄 [v4.1.1] AudioContext ${audioContext.state}検出 - resume実行`);
            try {
                await audioContext.resume();
                console.log('✅ [v4.1.1] AudioContext resume完了, 新状態:', audioContext.state);
            } catch (resumeError) {
                console.warn('⚠️ [v4.1.1] AudioContext resume失敗:', resumeError);
                // interrupted状態でresume失敗の場合、再初期化が必要
                if (audioContext.state === 'interrupted') {
                    return {
                        healthy: false,
                        reason: `AudioContext ${audioContext.state}からの復帰失敗`,
                        details: { audioContextState: audioContext.state }
                    };
                }
            }
        }

        // 10. 健全性確認完了
        return {
            healthy: true,
            details: {
                trackState,
                audioContextState: audioContext?.state,
                mediaStreamActive: mediaStream.active
            }
        };

    } catch (error) {
        console.error('❌ [v4.1.0] MediaStream健全性検証エラー:', error);
        return {
            healthy: false,
            reason: `検証エラー: ${error.message}`,
            error
        };
    }
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

        // 設定値（PitchPro v1.3.2対応）
        this.config = {
            MIN_DETECTION_TIME: 1000        // 1秒間
            // PitchProの内部最適化を信頼し、独自フィルタは使用しない
        };
    }

    /**
     * Phase 1: 初期化（Initialize）
     * デバイス検出、UI要素キャッシュ、AudioDetectionComponent作成
     */
    async initialize() {
        try {
            // UI要素キャッシュ（v1.3.1キャッシュベース管理）
            this.cacheUIElements();

            // PitchPro グローバル確認
            if (typeof window.PitchPro === 'undefined') {
                throw new Error('PitchProライブラリが読み込まれていません');
            }

            if (typeof window.PitchPro.AudioDetectionComponent === 'undefined') {
                throw new Error('AudioDetectionComponentが見つかりません');
            }


            // PitchPro AudioDetectionComponent作成（統一設定モジュール使用）
            this.audioDetector = new window.PitchPro.AudioDetectionComponent(
                window.PitchProConfig.getDefaultConfig({
                    // UI要素セレクター（preparation固有）
                    volumeBarSelector: '#volume-progress',
                    volumeTextSelector: '#volume-value',
                    frequencySelector: '#frequency-value',
                    noteSelector: null,

                    // preparation固有設定
                    deviceOptimization: true,
                    debug: false  // 【ログ削減】iPadコンソール安定化のためfalse
                })
            );

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

            // 【v4.1.1追加】AudioDetectorがmute状態の場合はunmute()を呼ぶ
            // preparationページ再訪問時（総合評価→次のステップなど）にmute状態が残っている問題に対応
            if (this.audioDetector && this.audioDetector.microphoneController) {
                const isMuted = this.audioDetector.microphoneController.isMuted();
                if (isMuted) {
                    console.log('🔊 [v4.1.1] AudioDetectorがmute状態のため、unmute()を実行');
                    try {
                        this.audioDetector.microphoneController.unmute();
                        console.log('✅ AudioDetector unmute完了');
                    } catch (unmuteError) {
                        console.warn('⚠️ unmute()エラー（続行）:', unmuteError);
                    }
                }
            }

            // 既に開始されている場合は、一度停止してからリスタート
            if (this.currentPhase === 'started' || this.state.detectionActive) {
                console.log('⚠️ 既に開始されているため、一度停止してから再開します');
                console.log(`   現在のフェーズ: ${this.currentPhase}, 検出中: ${this.state.detectionActive}`);

                try {
                    await this.audioDetector.stopDetection();
                    this.state.detectionActive = false;
                    this.currentPhase = 'initialized'; // フェーズをリセット
                    // 少し待機してリソースが解放されるのを待つ
                    await new Promise(resolve => setTimeout(resolve, 100));
                    console.log('✅ 停止完了、再開準備完了');
                } catch (stopError) {
                    console.warn('⚠️ 停止エラー（続行）:', stopError);
                    // エラーでも続行（フェーズとフラグはリセット）
                    this.state.detectionActive = false;
                    this.currentPhase = 'initialized';
                }
            }

            if (this.currentPhase !== 'initialized' && this.currentPhase !== 'reset') {
                console.warn(`⚠️ 想定外の状態からのスタート: ${this.currentPhase} → 強制的にinitializedに変更`);
                this.currentPhase = 'initialized';
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
            // 【v4.2.0改善】PitchPro v1.3.5で冪等性対応済み - 状態チェック不要
            await this.audioDetector.startDetection();
            console.log('✅ 検出開始完了');

            this.currentPhase = 'started';

            return { success: true, phase: 'started', mode: mode };

        } catch (error) {
            console.error(`❌ Phase 2: ${mode}スタート失敗:`, error);
            this.state.detectionActive = false;
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

        // 音量バー・周波数表示は autoUpdateUI: true により自動更新される
        // trainingController.js・voice-range-test.jsと統一

        // モード別処理
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
        // PitchProの内部最適化を完全に信頼
        // PitchProが値を返している = 有効な音声として認識済み

        if (DEBUG_MIC_TEST) {
            console.log(`🎤 PitchPro検出: freq:${result.frequency?.toFixed(1)}Hz vol:${(result.volume * 100)?.toFixed(1)}% clarity:${result.clarity?.toFixed(2)}`);
        }

        // 【デバッグ用】ノイズレベル確認 - rawVolumeとvolumeの差分を確認
        if (DEBUG_NOISE_LEVEL) {
            const rawVol = result.rawVolume !== undefined ? (result.rawVolume * 100).toFixed(2) : 'N/A';
            const processedVol = (result.volume * 100).toFixed(2);
            const noiseGateApplied = result.volume === 0 && result.rawVolume > 0;
            console.log(`🔊 ノイズ確認: rawVolume:${rawVol}% → volume:${processedVol}% ${noiseGateApplied ? '【ノイズゲート適用】' : ''}`);
        }

        // PitchProが有効な音声データを返している場合のみタイマー進行
        const isValidVoice = result.volume > 0 && result.frequency > 0;

        if (isValidVoice) {
            // 初回の有効音声検出時にタイマーを開始
            if (!this.state.detectionStartTime) {
                this.state.detectionStartTime = Date.now();
                if (DEBUG_MIC_TEST) console.log('🎬 音声検出タイマー開始');
            }

            const elapsedTime = Date.now() - this.state.detectionStartTime;
            if (DEBUG_MIC_TEST) console.log(`⏰ 経過時間: ${(elapsedTime/1000).toFixed(1)}秒 / 1.0秒`);

            // 1秒間の音声検出で成功
            if (elapsedTime >= this.config.MIN_DETECTION_TIME) {
                console.log('🎉 1秒間の音声検出完了 - 成功処理実行');
                this.showDetectionSuccess();
            }
        } else {
            // 音声未検出時はタイマーをリセット
            if (this.state.detectionStartTime) {
                this.state.detectionStartTime = null;
                console.log('🔄 タイマーリセット（音声未検出）');
            }
        }
    }


    /**
     * 音量更新ハンドラー
     */
    handleVolumeUpdate(volume) {
        // PitchProのキャッシュベース管理により自動更新されるため、
        // 追加処理のみここで実装
        // 【ログ削減】高頻度のため無効化
        // if (DEBUG_MIC_TEST) console.log('🔊 音量更新:', volume);
    }

    /**
     * エラーハンドラー
     */
    handleAudioError(context, error) {
        console.error(`🚨 Audio Error [${context}]:`, error);
        this.state.detectionActive = false;

        // 自動復旧ロジック: 最大試行回数到達エラーの場合
        if (error.code === 'MICROPHONE_ACCESS_DENIED' &&
            error.context?.maxAttemptsReached) {
            console.log('🔄 Auto-recovering from max attempts error...');

            setTimeout(async () => {
                if (this.audioDetector) {
                    await this.audioDetector.reset();
                    console.log('✅ PitchPro reset complete');

                    // UIをリセット状態に戻す
                    if (this.uiElements.requestMicBtn) {
                        this.uiElements.requestMicBtn.disabled = false;
                        this.uiElements.requestMicBtn.innerHTML = '<i data-lucide="mic" style="width: 24px; height: 24px;"></i><span>マイク許可</span>';
                        window.initializeLucideIcons && window.initializeLucideIcons({ immediate: true });
                    }
                }
            }, 1000);
            return;
        }

        // 既存のエラー時UI更新
        if (this.uiElements.requestMicBtn) {
            this.uiElements.requestMicBtn.disabled = false;
            this.uiElements.requestMicBtn.innerHTML = '<i data-lucide="alert-circle" style="width: 24px; height: 24px;"></i><span>エラー - 再試行</span>';
            window.initializeLucideIcons && window.initializeLucideIcons({ immediate: true });
        }
    }

    // ===== ユーティリティ関数 =====

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

        // 【v4.1.2改善】AudioDetectorは継続してtrainingに引き継ぐ
        // stopDetection()で検出ループを停止、MediaStreamは保持される
        if (this.audioDetector) {
            this.audioDetector.resetDisplayElements(); // PitchPro標準メソッドでUIリセット
            this.state.detectionActive = false; // 内部状態のみ更新
            console.log('🔄 UI要素リセット完了（AudioDetectorはtrainingに引き継ぎ）');

            // 【v4.1.2修正】stopDetection()で検出ループを完全停止（MediaStream保持）
            // PitchDetector.stopDetection()はMediaStreamに触れず、検出ループのみ停止
            // mute()だけでは検出ループが継続し、BLOCKEDログが大量出力される問題に対応
            try {
                this.audioDetector.stopDetection();
                console.log('⏹️ AudioDetector検出停止（MediaStream保持、state: ready）');
            } catch (error) {
                console.warn('⚠️ stopDetection()エラー（無視して続行）:', error);
            }
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

            // アイコン変更とスタイル更新（SVGを直接挿入）
            voiceInstructionIcon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 32px; height: 32px; color: white;"><path d="M20 6 9 17l-5-5"></path></svg>`;
            voiceInstructionIcon.style.backgroundColor = '#22c55e'; // 緑色背景
            voiceInstructionIcon.style.borderRadius = '50%';

            // 🔧 修正: window.initializeLucideIcons && window.initializeLucideIcons({ immediate: true })を呼ばない（全体の再初期化を避ける）
            // 代わりに上記でSVGを直接挿入済み
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

            // 既存の音域データをチェック（DataManager + localStorage両方確認）
            let voiceRangeData = null;
            try {
                // DataManagerから取得を試行
                if (typeof DataManager !== 'undefined' && DataManager.getVoiceRangeData) {
                    voiceRangeData = DataManager.getVoiceRangeData();
                    console.log('DataManager結果:', voiceRangeData);
                }

                // DataManagerでデータが取得できない場合、localStorageを確認
                if (!voiceRangeData) {
                    const localData = localStorage.getItem('voiceRangeData');
                    if (localData) {
                        voiceRangeData = JSON.parse(localData);
                        console.log('localStorage結果:', voiceRangeData);
                    }
                }
            } catch (error) {
                console.warn('⚠️ DataManager利用不可、localStorage確認にフォールバック');
                const localData = localStorage.getItem('voiceRangeData');
                if (localData) {
                    voiceRangeData = JSON.parse(localData);
                }
            }

            console.log('🔍 音域データチェック結果:', !voiceRangeData ? '音域データなし' : '音域データあり');

            const successMessage = document.getElementById('detection-success-message');

            // 音声テスト完了メッセージを表示
            if (successMessage) {
                successMessage.textContent = '「ド」の音程を検出できました！';
            }

            // 1.5秒後に次のステップへ進む
            // 音量調整機能は削除済み（backup/volume-test-featureブランチに保存）
            console.log('⏳ 1.5秒後に次のステップを表示します...');
            setTimeout(async () => {
                // audio-test-contentを非表示
                const audioTestContent = document.getElementById('audio-test-content');
                if (audioTestContent) {
                    audioTestContent.style.display = 'none';
                    console.log('✅ audio-test-content を非表示にしました');
                }

                // 検出中の成功メッセージを非表示
                if (detectionSuccess) {
                    detectionSuccess.classList.add('hidden');
                    console.log('✅ detection-success を非表示にしました');
                }

                // Lucideアイコン初期化
                if (typeof lucide !== 'undefined') {
                    window.initializeLucideIcons && window.initializeLucideIcons({ immediate: true });
                    console.log('✅ Lucideアイコン初期化完了');
                }

                if (voiceRangeData && rangeSavedDisplay) {
                    // 音域データあり - 音域設定済み表示
                    // 音声テスト完了メッセージは不要（全て完了済みのため）

                    // セクションタイトルと説明を「準備完了」に変更
                    const audioTestTitle = document.getElementById('audio-test-title');
                    const sectionDescription = document.getElementById('audio-test-description');
                    if (audioTestTitle) {
                        audioTestTitle.textContent = '準備完了';
                        console.log('✅ セクションタイトルを「準備完了」に変更');
                    }
                    if (sectionDescription) {
                        sectionDescription.textContent = 'トレーニング開始ボタンでトレーニングを始めましょう　音域テストの再測定も可能です';
                        console.log('✅ セクション説明を更新');
                    }

                    this.displaySavedRangeData(voiceRangeData, rangeSavedDisplay);
                    console.log('✅ 音域データ表示完了（音声テスト完了メッセージは非表示）');
                } else {
                    // 音域データなし - 音声テスト完了メッセージ＋音域テストボタン表示
                    const audioTestCompleted = document.getElementById('audio-test-completed');
                    if (audioTestCompleted) {
                        audioTestCompleted.classList.remove('hidden');
                        console.log('✅ audio-test-completed を表示しました');
                    }
                    // localStorage保存（Step1完了データ）
                    localStorage.setItem('audioTestCompleted', 'true');
                    localStorage.setItem('audioTestTimestamp', new Date().toISOString());
                    localStorage.setItem('step1Completed', 'true');

                    // 音域テストボタンを表示
                    if (startRangeBtn) {
                        startRangeBtn.classList.remove('hidden');
                        console.log('🎯 音域テストセクション移動ボタン表示完了');
                    }
                }
            }, 1500);
        }

        // ステップインジケーター更新
        updateStepStatus(2, 'completed');
        updateStepStatus(3, 'active');

        console.log('🎉 検出成功処理完了');
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

            // Step2ページに遷移（SPA対応 - 実際には使用されない）
            console.log('🔄 preparation-step2へ遷移中...');
            if (window.NavigationManager) {
                window.NavigationManager.navigate('preparation-step2');
            } else {
                window.location.hash = 'preparation-step2';
            }

        } catch (error) {
            console.error('❌ Step2遷移処理エラー:', error);
            alert('Step2への遷移でエラーが発生しました。再度お試しください。');
        }
    }

    /**
     * PitchShifter初期化を確実に実施
     */
    async ensurePitchShifterInitialized() {
        try {
            // 既に初期化済みの場合はスキップ
            if (window.pitchShifterInstance?.isInitialized) {
                console.log('✅ PitchShifter already initialized');
                return;
            }

            console.log('🎹 PitchShifter初期化開始...');

            // PitchShifterクラスが読み込まれるまで待機
            let attempts = 0;
            while (!window.PitchShifter && attempts < 50) {
                await new Promise(resolve => setTimeout(resolve, 100));
                attempts++;
            }

            if (!window.PitchShifter) {
                console.warn('⚠️ PitchShifterがロードされていません（5秒タイムアウト）');
                return;
            }

            // 【Issue #2修正】保存済み音量を優先、なければDeviceDetectorデフォルト
            const savedVolumeDb = getSavedVolumeDb();
            const deviceType = window.DeviceDetector?.getDeviceType() ?? 'pc';
            console.log(`🔊 PitchShifter音量: ${savedVolumeDb.toFixed(1)}dB (デバイス: ${deviceType}, 保存済み設定復元)`);

            // 新規作成または再作成
            // ⚠️ IMPORTANT: attack/release値を変更する場合は、以下の2箇所も同時に変更すること
            // 1. /js/core/reference-tones.js (line 67, 69)
            // 2. /js/router.js (line 439-440)
            window.pitchShifterInstance = new window.PitchShifter({
                baseUrl: 'audio/piano/',
                attack: 0.02,
                release: 1.5,
                volume: savedVolumeDb
            });

            // 初期化
            await window.pitchShifterInstance.initialize();
            console.log('✅ PitchShifter初期化完了');

        } catch (error) {
            console.warn('⚠️ PitchShifter初期化エラー:', error);
        }
    }

    /**
     * PitchPro v1.3.1統合管理システム - FAQ推奨クリーンアップ
     */
    async cleanupPitchPro() {
        console.log('🧹 PitchProリソースクリーンアップ開始（統合管理）');

        if (this.audioDetector) {
            await this.audioDetector.microphoneController.reset();
            this.audioDetector = null;
            console.log('✅ システム完全リセット＆インスタンス削除完了（FAQ推奨）');
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

// ===== SPA対応: 初期化関数をグローバルに公開 =====

/**
 * SPA環境での初期化関数
 * preparationControllerから呼び出される
 */
window.initializePreparationPitchProCycle = async function() {
    console.log('🚀 initializePreparationPitchProCycle - 初期化開始（SPA対応）');

    // SPA環境でのリロード対策: グローバルフラグをリセット
    micPermissionListenerAdded = false;

    // 【v4.1.0追加】URLパラメータからモード情報を取得してUI更新
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash.split('?')[1] || '');
    const modeParam = params.get('mode') || 'random';
    const directionParam = params.get('direction');

    console.log('🔍 [preparation] モードパラメータ:', modeParam);
    console.log('🔍 [preparation] 方向パラメータ:', directionParam);

    // 【修正v4.0.6】準備ページ初期化時にsessionStorageをクリア（中断レッスン復元防止）
    // 注意: trainingDirectionは残す（clearSessionStorageはcurrentLessonIdとcurrentModeのみクリア）
    if (window.SessionManager) {
        window.SessionManager.clearSessionStorage();
        console.log('✅ sessionStorageクリア（準備ページ初期化・新規レッスン開始）');
    }

    // random/continuousモードの場合、directionParamはscaleDirection
    // 12toneモードの場合、directionParamはchromaticDirection
    // sessionStorageを更新（総合評価からの動線に対応）
    if (directionParam && (modeParam === 'random' || modeParam === 'continuous')) {
        sessionStorage.setItem('trainingDirection', directionParam);
        console.log(`✅ sessionStorage更新: trainingDirection = ${directionParam}`);
    }

    // ModeControllerでモード表示名を取得（デフォルトで短縮形）
    if (window.ModeController) {
        const options = {};
        if (modeParam === '12tone') {
            // 12音階モード: directionはchromaticDirection
            options.direction = directionParam;
            // scaleDirectionはsessionStorageから取得
            options.scaleDirection = sessionStorage.getItem('trainingDirection') || 'ascending';
        } else {
            // random/continuousモード: directionはscaleDirection
            options.scaleDirection = directionParam || sessionStorage.getItem('trainingDirection') || 'ascending';
        }
        const displayName = window.ModeController.getDisplayName(modeParam, options);
        const subtitle = document.getElementById('preparation-mode-subtitle');
        if (subtitle) {
            subtitle.textContent = `${displayName}の準備中`;
            console.log(`✅ サブタイトル更新: ${displayName}の準備中`);
        }
    } else {
        console.warn('⚠️ ModeControllerが利用できません');
    }

    // 【v4.1.0追加】モード情報をグローバル変数に保存（トレーニング遷移時に使用）
    window.preparationRedirectInfo = {
        mode: modeParam,
        direction: directionParam
    };
    console.log('✅ preparationRedirectInfo保存:', window.preparationRedirectInfo);

    // ========================================================================
    // ⚠️ デバッグ用: Lucide初期化を無効化（元のコードは下のコメントアウト部分）
    // ========================================================================
    // 注意: Lucideアイコン初期化はrouter.jsで既に実行されているため、
    // ここで再度実行すると非表示要素（hidden）内のアイコンが正しく処理されない問題が発生する。
    // そのため、ここでのLucide初期化は削除。
    // 必要に応じて、個別の要素表示時にwindow.initializeLucideIcons && window.initializeLucideIcons({ immediate: true })を呼び出すこと。
    // ========================================================================

    /*
    // 元のコード（デバッグ完了後に戻す）
    // Lucideアイコン初期化（最優先）
    if (typeof lucide !== 'undefined') {
        window.initializeLucideIcons && window.initializeLucideIcons({ immediate: true });
        console.log('✅ Lucideアイコン初期化完了');
    } else {
        console.warn('⚠️ Lucideライブラリが読み込まれていません');
    }
    */

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
        const requestMicBtn = document.getElementById('request-mic-btn');
        if (requestMicBtn) {
            requestMicBtn.innerHTML = '<i data-lucide="alert-circle" style="width: 24px; height: 24px;"></i><span>初期化失敗 - 詳細はコンソールを確認</span>';
            if (typeof lucide !== 'undefined') {
                window.initializeLucideIcons && window.initializeLucideIcons({ immediate: true });
            }
        }

        // エラーが発生してもマイクボタンの設定は続行
        console.log('⚠️ 初期化失敗でもボタン設定を続行');
    }

    // マイク許可ボタンイベント設定（必ず実行）
    console.log('🎤 マイク許可ボタンイベント設定開始');
    setupMicPermissionFlow();

    // 音量調整機能は削除済み（backup/volume-test-featureブランチに保存）

    // ステップインジケーター初期化
    console.log('📊 ステップインジケーター初期化');
    updateStepStatus(1, 'active');

    // 🔍 ページロード時の音域データ存在チェックは無効化
    // 理由: マイク許可が必須のため、常にマイク許可セクションから開始
    // 音域データの存在チェックはマイク許可完了後に実施
    // await checkAndDisplayExistingRangeData();

    console.log('✅ 全ての初期化処理完了');
};

// スタンドアロンページでの動作維持（後方互換性）
if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', async () => {
        // スタンドアロンページとして直接開かれた場合のみ実行
        if (window.location.pathname.includes('preparation-step1.html')) {
            console.log('🚀 DOMContentLoaded - スタンドアロンモードで初期化');
            await window.initializePreparationPitchProCycle();
        }
    });
}

// ===== マイク許可フロー =====

/**
 * マイク許可フローセットアップ
 * PitchProサイクル: 初期化 → スタート の流れ
 */
function setupMicPermissionFlow() {
    console.log('🔧 setupMicPermissionFlow開始');

    const requestMicBtn = document.getElementById('request-mic-btn');

    if (!requestMicBtn) {
        console.error('❌ マイク許可ボタンが見つかりません');
        // 緊急: 少し待ってから再試行
        setTimeout(() => {
            console.log('🔄 マイクボタン再検索...');
            setupMicPermissionFlow();
        }, 1000);
        return;
    }

    // 既にイベントリスナーが追加されている場合はスキップ
    if (micPermissionListenerAdded) {
        console.log('✅ イベントリスナーは既に設定済み（スキップ）');
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
            if (typeof lucide !== 'undefined') window.initializeLucideIcons && window.initializeLucideIcons({ immediate: true });

            // 【v4.6.0】既存のglobalAudioDetectorを再利用できるかチェック
            const existingDetector = window.globalAudioDetector;
            let canReuseExisting = false;

            if (existingDetector) {
                console.log('🔍 [v4.6.0] 既存のglobalAudioDetector発見 - 再利用可能性をチェック...');
                const healthCheck = await verifyMediaStreamHealth(existingDetector);
                if (healthCheck.healthy) {
                    console.log('✅ [v4.6.0] 既存のAudioDetector再利用可能:', healthCheck.details);
                    canReuseExisting = true;

                    // pitchProCycleManagerに既存のAudioDetectorを設定
                    pitchProCycleManager.audioDetector = existingDetector;
                } else {
                    console.log('⚠️ [v4.6.0] 既存のAudioDetector再利用不可:', healthCheck.reason);
                    // 既存のAudioDetectorを破棄して新規作成
                    try {
                        existingDetector.destroy && await existingDetector.destroy();
                    } catch (e) {
                        console.warn('⚠️ 既存AudioDetector破棄エラー（続行）:', e);
                    }
                    window.globalAudioDetector = null;
                }
            }

            // PitchProサイクル管理を使う場合
            if (typeof pitchProCycleManager !== 'undefined' && pitchProCycleManager && pitchProCycleManager.audioDetector) {
                // 【v4.6.0】既存を再利用する場合はクリーンアップをスキップ
                if (!canReuseExisting) {
                    // リロード後の古いリソースを完全にクリーンアップ
                    console.log('🧹 リロード後クリーンアップ開始...');
                    try {
                        if (pitchProCycleManager.audioDetector.microphoneController) {
                            await pitchProCycleManager.audioDetector.stopDetection();
                            console.log('✅ 既存の検出を停止');
                        }
                    } catch (cleanupError) {
                        console.warn('⚠️ クリーンアップエラー（続行）:', cleanupError);
                    }
                }

                // 【v4.6.0】既存を再利用する場合は初期化をスキップ
                if (canReuseExisting) {
                    console.log('✅ [v4.6.0] 既存のAudioDetectorを再利用 - 初期化スキップ');
                    console.log('✅ マイク許可成功！（既存ストリーム再利用）');
                } else {
                    // AudioDetectionComponentの初期化（v1.3.1では内部でマイク許可も処理）
                    console.log('🎤 AudioDetectionComponent.initialize() 開始（マイク許可含む）');
                    try {
                        await pitchProCycleManager.audioDetector.initialize();
                        console.log('✅ AudioDetectionComponent.initialize() 完了');

                        // 初期化後、少し待ってからマイクストリームが安定するのを待つ
                        console.log('⏳ マイクストリーム安定化待機中...');
                        await new Promise(resolve => setTimeout(resolve, 500));
                        console.log('✅ マイクストリーム安定化完了');

                        // 【v4.1.0】MediaStream健全性検証（iOS Safari再取得問題対策）
                        const streamHealthCheck = await verifyMediaStreamHealth(pitchProCycleManager.audioDetector);
                        if (!streamHealthCheck.healthy) {
                            console.error('❌ MediaStream健全性検証失敗:', streamHealthCheck.reason);
                            throw new Error(`MediaStream検証失敗: ${streamHealthCheck.reason}`);
                        }
                        console.log('✅ MediaStream健全性検証完了:', streamHealthCheck);

                        console.log('✅ マイク許可成功！');

                        // 【iOS Safari対応 v3】マイク初期化直後にaudioSessionを明示的に設定
                        // これにより、基音を試聴ボタン押下時にautoではなくplay-and-recordから開始される
                        if (navigator.audioSession) {
                            try {
                                navigator.audioSession.type = 'play-and-record';
                                console.log('🔊 [iOS] audioSession.type を "play-and-record" に初期設定');
                            } catch (sessionError) {
                                console.warn('⚠️ audioSession初期設定失敗（続行）:', sessionError);
                            }
                        }

                    } catch (initError) {
                        console.error('❌ AudioDetectionComponent初期化エラー:', initError);
                        // 【v4.1.0】初期化エラー時は上位にスローして適切に処理
                        throw initError;
                    }
                }

                // 【共通処理】localStorage保存（新規・再利用両方で実行）
                localStorage.setItem('micPermissionGranted', 'true');
                localStorage.setItem('micPermissionTimestamp', new Date().toISOString());
                console.log('💾 micPermissionGranted localStorage保存完了');

                // Phase 2: 音声テスト開始（状態管理を含む）
                // 注: 音声テストは常に実施（マイク動作確認のため必須）
                // 音域データの分岐は音声テスト完了後に実施
                console.log('🎤 音声テスト開始');
                const startResult = await pitchProCycleManager.startAudioDetection('audiotest');
                if (!startResult.success) {
                    throw new Error(`音声テスト開始失敗: ${startResult.error}`);
                }
                console.log('✅ 音声テスト開始成功（PitchProサイクル管理）');

                // 音声テストセクションを表示
                const audioTestSection = document.getElementById('audio-test-section');
                if (audioTestSection) {
                    audioTestSection.classList.remove('hidden');
                    console.log('✅ 音声テストセクションを表示');
                }

                // 【Phase3改善】AudioDetectionComponentインスタンスをグローバルに共有（将来のStep2連携用）
                window.globalAudioDetector = pitchProCycleManager.audioDetector;
                window.audioDetector = pitchProCycleManager.audioDetector;
                console.log('✅ globalAudioDetectorをStep2連携用に設定');

                // 【Phase3追加】NavigationManagerに登録（MediaStream保持のため）
                if (window.NavigationManager) {
                    window.NavigationManager.registerAudioDetector(pitchProCycleManager.audioDetector);
                    console.log('✅ NavigationManagerにAudioDetectorを登録');
                } else {
                    console.warn('⚠️ NavigationManagerが見つかりません');
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
            if (typeof lucide !== 'undefined') window.initializeLucideIcons && window.initializeLucideIcons({ immediate: true });

            alert(`マイク許可エラー: ${error.message}`);
        }
    });

    // イベントリスナー追加完了フラグを立てる
    micPermissionListenerAdded = true;
    console.log('✅ マイク許可ボタンのイベントリスナー設定完了（重複防止フラグON）');

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
                if (rangeTestSection) {
                    rangeTestSection.classList.remove('hidden');

                    // Lucideアイコン初期化（mic-status-containerのアイコン表示確保）
                    if (typeof lucide !== 'undefined') {
                        window.initializeLucideIcons && window.initializeLucideIcons({ immediate: true });
                        console.log('✅ Lucideアイコン初期化完了（音域テストセクション表示時）');
                    }
                }

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

                // 音域設定済み表示を非表示
                const rangeSavedDisplay = document.getElementById('range-saved-display');
                if (rangeSavedDisplay) {
                    rangeSavedDisplay.classList.add('hidden');
                }

                // 音声テストセクションを非表示、音域テストセクションを表示
                const audioTestSection = document.getElementById('audio-test-section');
                const rangeTestSection = document.getElementById('range-test-section');

                if (audioTestSection) {
                    audioTestSection.classList.add('hidden');
                }
                if (rangeTestSection) {
                    rangeTestSection.classList.remove('hidden');

                    // Lucideアイコン初期化（mic-status-containerのアイコン表示確保）
                    if (typeof lucide !== 'undefined') {
                        window.initializeLucideIcons && window.initializeLucideIcons({ immediate: true });
                        console.log('✅ Lucideアイコン初期化完了（音域テストセクション表示時）');
                    }
                }

                console.log('✅ 音域テストセクションへ移動しました（再測定モード）');

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

            // ページ遷移前にPitchShifterを停止（音量テスト機能削除後も安全のため残す）
            if (window.pitchShifterInstance) {
                try {
                    await window.pitchShifterInstance.stop();
                    console.log('✅ PitchShifter停止完了（トレーニング遷移前）');
                } catch (e) {
                    console.warn('⚠️ PitchShifter停止エラー（無視）:', e);
                }
            }

            try {
                // 【新規追加】モード情報を先に取得
                const redirectInfo = window.preparationRedirectInfo;
                const mode = redirectInfo?.mode || 'random';

                // 【新規追加】12音階モード用音域チェック
                const canContinue = await check12ToneVoiceRange(mode);
                if (!canContinue) {
                    console.log('⚠️ ユーザーが音域テストをやり直すことを選択');
                    return; // トレーニング開始を中断
                }

                // 音域データ確認済みフラグ
                localStorage.setItem('rangeDataConfirmed', 'true');
                localStorage.setItem('step1CompletedViaExistingData', 'true');

                // 【変更】PitchProリソースは破棄せずMediaStreamを保持
                // trainingページで同じMediaStreamを再利用し、マイク許可を再要求しない
                console.log('📌 PitchProリソースを保持（MediaStream再利用のため）');

                // 【修正v4.0.5】トレーニング開始時にsessionStorageをクリア（中断レッスン復元防止）
                if (mode === 'random') {
                    // ランダムモード：sessionStorageをクリア
                    if (window.SessionManager) {
                        window.SessionManager.clearSessionStorage();
                        console.log('✅ sessionStorageクリア（音域設定済み表示からのトレーニング開始）');
                    }
                }

                // 【変更】ブラウザバック防止解除はNavigationManagerが自動実行
                // NavigationManager.navigateToTraining()内でremoveBrowserBackPrevention()が自動的に呼ばれる

                // モード情報を確実に取得（優先順位: redirectInfo > window.preparationRedirectInfo）
                const finalMode = redirectInfo?.mode || window.preparationRedirectInfo?.mode || 'random';
                const finalSession = redirectInfo?.session || window.preparationRedirectInfo?.session || null;
                const finalDirection = redirectInfo?.direction || window.preparationRedirectInfo?.direction || null;

                // 上行・下行の方向をsessionStorageから取得
                const scaleDirection = sessionStorage.getItem('trainingDirection') || 'ascending';

                console.log(`📍 モード情報を保持して遷移: mode=${finalMode}, session=${finalSession || 'なし'}, direction=${finalDirection || 'なし'}, scaleDirection=${scaleDirection}`);

                // 【v4.2.3修正】NavigationManager統一メソッド使用（beforeunload自動無効化）
                NavigationManager.navigateToTraining(finalMode, finalSession, finalDirection, scaleDirection);

            } catch (error) {
                console.error('❌ トレーニング開始処理エラー:', error);
                alert(`トレーニング開始処理に失敗しました: ${error.message}`);
            }
        });
    }

    // 音域テストセクション移動ボタン（Step2へ移動）
    const startRangeTestBtn = document.getElementById('start-range-test-btn');
    if (startRangeTestBtn) {
        startRangeTestBtn.addEventListener('click', async () => {
            console.log('🎤 音域テストセクションへ移動ボタンがクリックされました');
            try {
                // 確実な画面切り替え処理
                const audioTestSection = document.getElementById('audio-test-section');
                const rangeTestSection = document.getElementById('range-test-section');

                if (audioTestSection) {
                    audioTestSection.classList.add('hidden');
                    console.log('✅ audio-test-section を非表示にしました');
                }
                if (rangeTestSection) {
                    rangeTestSection.classList.remove('hidden');
                    console.log('✅ range-test-section を表示しました');

                    // Lucideアイコン初期化（mic-status-containerのアイコン表示確保）
                    if (typeof lucide !== 'undefined') {
                        window.initializeLucideIcons && window.initializeLucideIcons({ immediate: true });
                        console.log('✅ Lucideアイコン初期化完了（音域テストセクション表示時）');
                    }
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

    // 音域テスト開始ボタン（実際のテスト開始）
    const beginRangeTestBtn = document.getElementById('begin-range-test-btn');
    if (beginRangeTestBtn) {
        beginRangeTestBtn.addEventListener('click', async () => {
            console.log('🎵 音域テスト開始ボタンがクリックされました');
            try {
                // AudioDetectorインスタンスを取得（グローバルから）
                const audioDetector = window.globalAudioDetector || pitchProCycleManager.audioDetector;

                if (!audioDetector) {
                    throw new Error('AudioDetectorインスタンスが見つかりません。マイク許可から再度開始してください。');
                }

                // voice-range-test.jsのstartVoiceRangeTest関数を呼び出し
                if (typeof startVoiceRangeTest === 'function') {
                    await startVoiceRangeTest(audioDetector);
                    console.log('✅ 音域テスト開始完了');
                } else {
                    console.error('❌ startVoiceRangeTest関数が見つかりません');
                    alert('音域テスト機能の読み込みに失敗しました');
                }
            } catch (error) {
                console.error('❌ 音域テスト開始エラー:', error);
                alert(`音域テスト開始に失敗しました: ${error.message}`);
            }
        });
    }

    // 再測定ボタン
    const remeasureBtn = document.getElementById('remeasure-btn');
    if (remeasureBtn) {
        remeasureBtn.addEventListener('click', async () => {
            console.log('🔄 再測定ボタンがクリックされました');

            // 🎵 v3.1.16修正: リトライカウンターと測定データを完全リセット
            if (typeof globalState !== 'undefined') {
                globalState.retryCount = 0;
                globalState.highRetryCount = 0;
                globalState.currentPhase = 'idle';

                // 測定データも初期化
                if (globalState.measurementData) {
                    globalState.measurementData.lowPhase = {
                        frequencies: [],
                        lowestFreq: null,
                        lowestNote: null,
                        avgVolume: 0,
                        measurementTime: 0
                    };
                    globalState.measurementData.highPhase = {
                        frequencies: [],
                        highestFreq: null,
                        highestNote: null,
                        avgVolume: 0,
                        measurementTime: 0
                    };
                    globalState.measurementData.startTime = null;
                    globalState.measurementData.endTime = null;
                }

                console.log('✅ リトライカウンターと測定データを完全リセット');
            }

            // 結果セクションを非表示、音域テストを再表示
            const resultsSection = document.getElementById('results-section');
            if (resultsSection) {
                resultsSection.classList.add('hidden');
            }

            // 測定UI要素を再表示
            const mainStatusText = document.getElementById('main-status-text');
            const rangeTestLayoutFlex = document.querySelector('.range-test-layout-flex');
            const subInfoText = document.getElementById('sub-info-text');
            const detectionMeters = document.querySelector('.detection-meters');
            const controlButtons = document.querySelector('#range-test-section > .text-center.mt-6');
            const micStatusContainer = document.getElementById('mic-status-container');

            if (mainStatusText) {
                mainStatusText.style.display = '';
                mainStatusText.textContent = '「音域テスト開始」ボタンでテストを開始してください';
            }
            if (rangeTestLayoutFlex) rangeTestLayoutFlex.style.display = '';
            if (subInfoText) {
                subInfoText.style.display = '';
                subInfoText.textContent = '待機中...';
                subInfoText.classList.remove('error');
            }
            if (detectionMeters) detectionMeters.style.display = '';
            if (controlButtons) controlButtons.style.display = '';
            if (micStatusContainer) {
                micStatusContainer.style.display = '';  // CSSのdisplay: flexを使用
                // マイクステータスを待機状態にリセット
                if (typeof updateMicStatus === 'function') {
                    updateMicStatus('standby');
                }
            }

            // バッジと円形プログレスバーを初期状態にリセット
            if (typeof updateBadgeForWaiting === 'function') {
                updateBadgeForWaiting('arrow-down');
            }
            if (typeof updateCircularProgressInstantly === 'function') {
                updateCircularProgressInstantly(0);
            }

            // 🎵 v3.1.16修正: Stepインジケーターとコネクターをリセット
            const step3 = document.getElementById('step-3');
            const connector2 = document.getElementById('connector-2');
            if (step3) {
                step3.classList.remove('completed', 'active');
                step3.classList.add('pending');
            }
            if (connector2) {
                connector2.classList.remove('completed');
            }
            console.log('✅ Stepインジケーターをリセット');

            // retry-measurement-btnのクラスをクリーンアップ
            const retryMeasurementBtn = document.getElementById('retry-measurement-btn');
            if (retryMeasurementBtn) {
                retryMeasurementBtn.classList.remove('btn-visible-inline');
                retryMeasurementBtn.classList.add('btn-hidden');
            }

            // 音域テスト開始ボタンを表示（自動開始せずユーザーに準備させる）
            const beginRangeTestBtn = document.getElementById('begin-range-test-btn');
            if (beginRangeTestBtn) {
                beginRangeTestBtn.classList.remove('btn-hidden');
            }

            // 🎵 v3.1.17修正: トレーニング開始ボタンを再表示（完全失敗時に非表示にされている可能性があるため）
            const completeRangeTestBtn2 = document.getElementById('complete-range-test-btn');
            if (completeRangeTestBtn2) {
                completeRangeTestBtn2.style.display = '';
            }
        });
    }

    // トレーニング開始ボタン（音域テスト完了後）
    const completeRangeTestBtn = document.getElementById('complete-range-test-btn');
    if (completeRangeTestBtn) {
        completeRangeTestBtn.addEventListener('click', async () => {
            console.log('🚀 トレーニング開始ボタン（音域テスト完了後）がクリックされました');

            // ページ遷移前にPitchShifterを停止（音量テスト機能削除後も安全のため残す）
            if (window.pitchShifterInstance) {
                try {
                    await window.pitchShifterInstance.stop();
                    console.log('✅ PitchShifter停止完了（トレーニング遷移前）');
                } catch (e) {
                    console.warn('⚠️ PitchShifter停止エラー（無視）:', e);
                }
            }

            // 【新規追加】モード情報を先に取得
            const redirectInfo = window.preparationRedirectInfo;
            const mode = redirectInfo?.mode || 'random';

            // 【新規追加】12音階モード用音域チェック
            const canContinue = await check12ToneVoiceRange(mode);
            if (!canContinue) {
                console.log('⚠️ ユーザーが音域テストをやり直すことを選択');
                return; // トレーニング開始を中断
            }

            // 【変更】PitchProリソースは破棄せずMediaStreamを保持
            // trainingページで同じMediaStreamを再利用し、マイク許可を再要求しない
            console.log('📌 PitchProリソースを保持（MediaStream再利用のため）');

            if (mode === 'random') {
                // ランダムモード：毎回セッションデータをクリア
                // 【v2.0.0】SessionDataManagerを使用して統一管理
                const beforeCount = window.SessionDataManager
                    ? window.SessionDataManager.getSessionCount()
                    : 0;
                console.log(`🔍 [localStorage] クリア前のセッション数: ${beforeCount}`);
                console.log(`🔍 [localStorage] 対象モード: ${mode}`);

                if (window.SessionDataManager) {
                    window.SessionDataManager.clearSessionsByMode(mode);
                } else {
                    console.error('❌ SessionDataManagerが見つかりません');
                }

                const afterCount = window.SessionDataManager
                    ? window.SessionDataManager.getSessionCount()
                    : 0;
                console.log(`🔍 [localStorage] クリア後のセッション数: ${afterCount}`);

                // 【修正v4.0.5】sessionStorageもクリア（中断レッスンの復元を防止）
                if (window.SessionManager) {
                    window.SessionManager.clearSessionStorage();
                    console.log('✅ sessionStorageもクリアしました（中断レッスン復元防止）');
                }

                // SessionDataRecorderをlocalStorageと同期（重要！）
                if (window.sessionDataRecorder) {
                    window.sessionDataRecorder.resetSession();
                }
            } else {
                // 連続チャレンジモード・12音階モード：セッションデータを保持
                console.log(`✅ ${mode}モード：セッションデータを保持（クリアしない）`);
            }

            // 【変更】ブラウザバック防止解除はNavigationManagerが自動実行
            // NavigationManager.navigateToTraining()内でremoveBrowserBackPrevention()が自動的に呼ばれる

            // モード情報を確実に取得（優先順位: redirectInfo > window.preparationRedirectInfo）
            const finalMode = redirectInfo?.mode || window.preparationRedirectInfo?.mode || 'random';
            const finalSession = redirectInfo?.session || window.preparationRedirectInfo?.session || null;
            const finalDirection = redirectInfo?.direction || window.preparationRedirectInfo?.direction || null;

            // 上行・下行の方向をsessionStorageから取得
            const scaleDirection = sessionStorage.getItem('trainingDirection') || 'ascending';

            console.log(`📍 モード情報を保持して遷移: mode=${finalMode}, session=${finalSession || 'なし'}, direction=${finalDirection || 'なし'}, scaleDirection=${scaleDirection}`);

            // NavigationManager統一API使用（AudioDetector保持のため）
            const navParams = { mode: finalMode, scaleDirection: scaleDirection };
            if (finalSession) navParams.session = finalSession;
            if (finalDirection) navParams.direction = finalDirection;

            if (window.NavigationManager) {
                NavigationManager.navigate('training', navParams);
            } else {
                // フォールバック（NavigationManagerがない場合）
                const params = new URLSearchParams(navParams);
                window.location.hash = `training?${params.toString()}`;
            }
        });
    }

}

// ===== ユーティリティ関数 =====

/**
 * ページロード時の音域データ存在チェック
 * 音域データが既に保存されている場合、音域設定済み表示を直接表示
 */
async function checkAndDisplayExistingRangeData() {
    console.log('🔍 ページロード時の音域データ存在チェック開始');

    // 音域データ取得（DataManager + localStorage両方確認）
    let voiceRangeData = null;
    try {
        // DataManagerから取得を試行
        if (typeof DataManager !== 'undefined' && DataManager.getVoiceRangeData) {
            voiceRangeData = DataManager.getVoiceRangeData();
            console.log('DataManager結果:', voiceRangeData);
        }

        // DataManagerでデータが取得できない場合、localStorageを確認
        if (!voiceRangeData) {
            const localData = localStorage.getItem('voiceRangeData');
            if (localData) {
                voiceRangeData = JSON.parse(localData);
                console.log('localStorage結果:', voiceRangeData);
            }
        }
    } catch (error) {
        console.warn('⚠️ DataManager利用不可、localStorage確認にフォールバック');
        const localData = localStorage.getItem('voiceRangeData');
        if (localData) {
            voiceRangeData = JSON.parse(localData);
        }
    }

    // 音域データがない場合は通常フロー
    if (!voiceRangeData) {
        console.log('ℹ️ 音域データなし - 通常フロー（マイク許可から開始）');
        return;
    }

    console.log('✅ 音域データ発見 - 音域設定済み表示を直接表示します');

    // UI要素取得
    const permissionSection = document.getElementById('permission-section');
    const audioTestSection = document.getElementById('audio-test-section');
    const rangeTestSection = document.getElementById('range-test-section');
    const audioTestContent = document.getElementById('audio-test-content');
    const rangeSavedDisplay = document.getElementById('range-saved-display');

    // Step 1: マイク許可セクションを非表示
    if (permissionSection) {
        permissionSection.style.display = 'none';
        console.log('✅ マイク許可セクションを非表示');
    }

    // Step 2: 音声テストセクションを表示状態にして、コンテンツを切り替え
    if (audioTestSection) {
        audioTestSection.classList.remove('hidden');

        // セクションタイトルを「準備完了」に変更
        const audioTestTitle = document.getElementById('audio-test-title');
        const sectionDescription = audioTestSection.querySelector('.section-description');
        if (audioTestTitle) {
            audioTestTitle.textContent = '準備完了';
            console.log('✅ セクションタイトルを「準備完了」に変更');
        }
        if (sectionDescription) {
            sectionDescription.textContent = '音域設定が完了しています';
            console.log('✅ セクション説明を更新');
        }

        // ステップインジケーターのラベルも「音域テスト」に変更
        const step2Label = document.getElementById('step-2-label');
        if (step2Label) {
            step2Label.textContent = '音域テスト';
            console.log('✅ ステップ2ラベルを「音域テスト」に変更');
        }

        // 音声テストコンテンツを非表示
        if (audioTestContent) {
            audioTestContent.classList.add('hidden');
            console.log('✅ 音声テストコンテンツを非表示');
        }

        // 音域設定済み表示を表示
        if (rangeSavedDisplay) {
            rangeSavedDisplay.classList.remove('hidden');

            // 保存済みデータを表示
            if (pitchProCycleManager && pitchProCycleManager.displaySavedRangeData) {
                pitchProCycleManager.displaySavedRangeData(voiceRangeData, rangeSavedDisplay);
                console.log('✅ 音域設定済みデータ表示完了');
            }
        }

        console.log('✅ 音声テストセクションを音域設定済み表示モードで表示');
    }

    // Step 3: 音域テストセクションは非表示のまま（必要に応じて再測定で表示）
    if (rangeTestSection) {
        rangeTestSection.classList.add('hidden');
        console.log('✅ 音域テストセクションは非表示のまま');
    }

    // Step 4: ステップインジケーター更新
    updateStepStatus(1, 'completed');
    updateStepStatus(2, 'completed');
    updateStepStatus(3, 'completed');
    console.log('✅ ステップインジケーター更新完了（全て完了状態）');

    // Step 5: Lucideアイコン初期化（音域設定済み表示のアイコン用）
    // DOM操作が完全に反映されるまで少し待機
    await new Promise(resolve => setTimeout(resolve, 100));

    if (typeof lucide !== 'undefined') {
        window.initializeLucideIcons && window.initializeLucideIcons({ immediate: true });
        console.log('✅ Lucideアイコン再初期化完了');
    } else {
        console.warn('⚠️ Lucideライブラリが見つかりません');
    }

    console.log('🎉 音域設定済み表示の初期表示完了');
}

/**
 * 12音階モード用音域チェック
 * 2オクターブ未満の場合、ユーザーに確認ダイアログを表示
 * @param {string} mode - トレーニングモード
 * @returns {Promise<boolean>} true: 続行, false: キャンセル
 */
async function check12ToneVoiceRange(mode) {
    // 12音階モード以外はチェックスキップ
    if (mode !== '12tone') {
        return true;
    }

    // 「今後表示しない」設定を確認
    const skipWarning = localStorage.getItem('skip12ToneVoiceRangeWarning');
    if (skipWarning === 'true') {
        console.log('✅ [12音階モード] 音域警告スキップ（ユーザー設定）');
        return true;
    }

    // 音域データ取得
    let voiceRangeData = null;
    try {
        if (typeof DataManager !== 'undefined' && DataManager.getVoiceRangeData) {
            voiceRangeData = DataManager.getVoiceRangeData();
        }
        if (!voiceRangeData) {
            const localData = localStorage.getItem('voiceRangeData');
            if (localData) {
                voiceRangeData = JSON.parse(localData);
            }
        }
    } catch (error) {
        console.error('❌ 音域データ取得エラー:', error);
        return true; // データ取得失敗時は続行
    }

    if (!voiceRangeData || !voiceRangeData.results) {
        console.warn('⚠️ [12音階モード] 音域データなし - チェックスキップ');
        return true;
    }

    // オクターブ数を計算
    const { lowFreq, highFreq } = voiceRangeData.results;
    const octaveRange = Math.log2(highFreq / lowFreq);

    console.log(`🔍 [12音階モード] 音域チェック: ${octaveRange.toFixed(2)}オクターブ`);

    // 2.0オクターブ以上なら問題なし
    if (octaveRange >= 2.0) {
        console.log('✅ [12音階モード] 音域OK: 2.0オクターブ以上');
        return true;
    }

    // 2.0オクターブ未満 - 警告ダイアログを表示
    console.warn(`⚠️ [12音階モード] 音域不足: ${octaveRange.toFixed(2)}オクターブ（推奨: 2.0オクターブ以上）`);

    return showVoiceRangeWarningDialog(octaveRange);
}

/**
 * 音域不足警告ダイアログを表示
 * @param {number} octaveRange - 現在のオクターブ数
 * @returns {Promise<boolean>} true: 続行, false: キャンセル
 */
function showVoiceRangeWarningDialog(octaveRange) {
    return new Promise((resolve) => {
        // ダイアログHTML生成（ランク詳細ポップオーバースタイル準拠）
        const dialogHTML = `
            <div id="voice-range-warning-dialog" class="modal-overlay" style="
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(15, 23, 42, 0.4);
                backdrop-filter: blur(8px);
                -webkit-backdrop-filter: blur(8px);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
            ">
                <div style="
                    max-width: 500px;
                    margin: 20px;
                    padding: 24px;
                    background: rgba(30, 41, 59, 0.95);
                    border: 1px solid rgba(148, 163, 184, 0.2);
                    border-radius: 12px;
                    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.2);
                ">
                    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">
                        <i data-lucide="alert-triangle" style="width: 32px; height: 32px; color: #fbbf24; flex-shrink: 0;"></i>
                        <h3 style="color: white; font-size: 1.25rem; font-weight: 600; margin: 0;">音域が不足しています</h3>
                    </div>
                    
                    <div style="background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 8px; padding: 16px; margin-bottom: 16px;">
                        <div style="color: #fca5a5; font-size: 0.875rem; margin-bottom: 8px;">
                            <strong>現在の音域:</strong> ${octaveRange.toFixed(2)}オクターブ
                        </div>
                        <div style="color: #fca5a5; font-size: 0.875rem;">
                            <strong>推奨音域:</strong> 2.0オクターブ以上
                        </div>
                    </div>
                    
                    <p style="color: rgba(255, 255, 255, 0.8); font-size: 0.875rem; line-height: 1.5; margin-bottom: 16px;">
                        12音階トレーニングには12音が必要ですが、現在の音域では不足しています。<br>
                        不足分は高音域から自動的に追加されますが、一部の音が発声困難な可能性があります。<br>
                        <strong style="color: #fbbf24;">このままトレーニングを開始しますか？</strong>
                    </p>
                    
                    <div style="margin-bottom: 20px;">
                        <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; color: rgba(255, 255, 255, 0.8); font-size: 0.875rem;">
                            <input type="checkbox" id="skip-warning-checkbox" style="width: 16px; height: 16px; cursor: pointer;">
                            <span>今後この警告を表示しない</span>
                        </label>
                    </div>
                    
                    <div style="display: flex; gap: 12px;">
                        <button id="retest-voice-range-btn" class="btn btn-outline" style="flex: 1;">
                            <i data-lucide="rotate-ccw" style="width: 20px; height: 20px;"></i>
                            <span>音域テストをやり直す</span>
                        </button>
                        <button id="continue-anyway-btn" class="btn btn-primary" style="flex: 1;">
                            <i data-lucide="arrow-right" style="width: 20px; height: 20px;"></i>
                            <span>このまま開始</span>
                        </button>
                    </div>
                </div>
            </div>
        `;

        // ダイアログをDOMに追加
        const dialogContainer = document.createElement('div');
        dialogContainer.innerHTML = dialogHTML;
        document.body.appendChild(dialogContainer);

        // Lucideアイコン初期化
        if (typeof lucide !== 'undefined') {
            window.initializeLucideIcons && window.initializeLucideIcons({ immediate: true });
        }

        // ボタンイベント設定
        const retestBtn = document.getElementById('retest-voice-range-btn');
        const continueBtn = document.getElementById('continue-anyway-btn');
        const skipCheckbox = document.getElementById('skip-warning-checkbox');

        retestBtn.addEventListener('click', () => {
            // 「今後表示しない」設定を保存
            if (skipCheckbox.checked) {
                localStorage.setItem('skip12ToneVoiceRangeWarning', 'true');
                console.log('✅ 音域警告スキップ設定を保存');
            }
            
            // ダイアログを削除
            document.body.removeChild(dialogContainer);
            
            // 準備ページの音域テストセクションへ移動
            const rangeTestSection = document.getElementById('range-test-section');
            if (rangeTestSection) {
                rangeTestSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
            
            resolve(false); // キャンセル
        });

        continueBtn.addEventListener('click', () => {
            // 「今後表示しない」設定を保存
            if (skipCheckbox.checked) {
                localStorage.setItem('skip12ToneVoiceRangeWarning', 'true');
                console.log('✅ 音域警告スキップ設定を保存');
            }
            
            // ダイアログを削除
            document.body.removeChild(dialogContainer);
            
            resolve(true); // 続行
        });
    });
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

    window.initializeLucideIcons && window.initializeLucideIcons({ immediate: true });
}

// setupVolumeAdjustmentControls()は削除済み（backup/volume-test-featureブランチに保存）
// 音量調整機能（基音試聴ボタン、音量スライダー）はトレーニングページとの音量差問題により廃止

// ===== UI制御ユーティリティ =====

/**
 * ステップインジケーター更新
 * 【v4.6.0】Step状態をsessionStorageに保存（リロード時のStep別判定用）
 */
function updateStepStatus(stepNumber, status) {
    const step = document.getElementById(`step-${stepNumber}`);
    if (!step) return;

    step.classList.remove('active', 'completed');
    if (status === 'active') {
        step.classList.add('active');
        // 【v4.6.0】アクティブになったStepをsessionStorageに保存
        sessionStorage.setItem('preparationCurrentStep', stepNumber.toString());
        console.log(`📍 [v4.6.0] preparationCurrentStep = ${stepNumber} (active)`);
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

