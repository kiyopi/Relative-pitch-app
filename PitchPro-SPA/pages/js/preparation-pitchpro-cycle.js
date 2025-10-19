// preparation-pitchpro-cycle.js - PitchProサイクルベース実装
// 初期化 → スタート → リセット → 放棄 のサイクル設計

// Lucide初期化はDOMContentLoadedイベント内で実行（HTMLが読み込まれた後）

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

        // 設定値（PitchPro v1.3.1対応）
        this.config = {
            MIN_DETECTION_TIME: 1000,        // 1秒間
            // PitchProの内部最適化を信頼し、独自フィルタは使用しない
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


            // PitchPro AudioDetectionComponent作成（v1.3.1統合管理システム）
            this.audioDetector = new window.PitchPro.AudioDetectionComponent({
                volumeBarSelector: '#volume-progress',
                volumeTextSelector: '#volume-value',
                frequencySelector: '#frequency-value',
                noteSelector: null, // 音程表示は使用しない
                autoUpdateUI: true, // PitchProに自動更新を任せる
                debug: true
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

        // autoUpdateUI: true のため、PitchProが自動でUI更新
        // ここではモード別のロジック処理のみ実行

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

        console.log(`🎤 PitchPro検出: freq:${result.frequency?.toFixed(1)}Hz vol:${(result.volume * 100)?.toFixed(1)}% clarity:${result.clarity?.toFixed(2)}`);

        // PitchProが有効な音声データを返している場合のみタイマー進行
        const isValidVoice = result.volume > 0 && result.frequency > 0;

        if (isValidVoice) {
            // 初回の有効音声検出時にタイマーを開始
            if (!this.state.detectionStartTime) {
                this.state.detectionStartTime = Date.now();
                console.log('🎬 音声検出タイマー開始');
            }

            const elapsedTime = Date.now() - this.state.detectionStartTime;
            console.log(`⏰ 経過時間: ${(elapsedTime/1000).toFixed(1)}秒 / 1.0秒`);

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

            if (voiceRangeData && rangeSavedDisplay) {
                // 既存データ表示 - 音域データありの場合のメッセージ
                if (successMessage) {
                    successMessage.textContent = '音声テストは完了しました。トレーニング開始の準備ができています。';
                }

                // 1.5秒後に画面切り替えを実行します
                console.log('⏳ 1.5秒後に画面切り替えを実行します...');
                setTimeout(() => {
                    // 音声テスト部分のみを非表示（セクション全体は表示したまま）
                    const audioTestContent = document.getElementById('audio-test-content');
                    if (audioTestContent) {
                        audioTestContent.classList.add('hidden');
                        console.log('📋 audio-test-content のみを非表示にしました（音域設定済み表示のため）');
                    }

                    // 音域設定済み表示を開始
                    // voiceRangeData全体を渡すように修正（timestampが親レベルにあるため）
                    this.displaySavedRangeData(voiceRangeData, rangeSavedDisplay);
                }, 1500);
            } else {
                // 新規音域テストが必要 - 音域データなしの場合のメッセージ
                if (successMessage) {
                    successMessage.textContent = '「ド」の音程を検出できました！音域テストに進みましょう。';
                }

                // localStorage保存（Step1完了データ）
                localStorage.setItem('audioTestCompleted', 'true');
                localStorage.setItem('audioTestTimestamp', new Date().toISOString());
                localStorage.setItem('step1Completed', 'true');

                // 1.5秒後にaudio-test-contentを非表示にして、音域テストセクション移動ボタンを表示
                console.log('⏳ 1.5秒後に音域テストセクション移動ボタンを表示します...');
                setTimeout(() => {
                    // audio-test-contentを非表示
                    const audioTestContent = document.getElementById('audio-test-content');
                    if (audioTestContent) {
                        audioTestContent.style.display = 'none';
                        console.log('✅ audio-test-content を非表示にしました');
                    }

                    // 音域テストセクション移動ボタンを表示
                    if (startRangeBtn) {
                        // ボタンはHTMLのまま「音域テストを開始」で表示
                        // イベントリスナーは後のコード（line 1057-1088）で設定済み
                        startRangeBtn.classList.remove('hidden');
                        console.log('🎯 音域テストセクション移動ボタン表示完了');
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

document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 DOMContentLoaded - 初期化開始');

    // Lucideアイコン初期化（最優先）
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
        console.log('✅ Lucideアイコン初期化完了');
    } else {
        console.warn('⚠️ Lucideライブラリが読み込まれていません');
    }

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

                    // localStorage保存（新規追加）
                    localStorage.setItem('micPermissionGranted', 'true');
                    localStorage.setItem('micPermissionTimestamp', new Date().toISOString());
                    console.log('💾 micPermissionGranted localStorage保存完了');

                    // Phase 2: 音声テスト開始（状態管理を含む）
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

                    // AudioDetectionComponentインスタンスをグローバルに共有（将来のStep2連携用）
                    window.globalAudioDetector = pitchProCycleManager.audioDetector;
                    console.log('✅ globalAudioDetectorをStep2連携用に設定');

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
                if (rangeTestSection) {
                    rangeTestSection.classList.remove('hidden');

                    // Lucideアイコン初期化（mic-status-containerのアイコン表示確保）
                    if (typeof lucide !== 'undefined') {
                        lucide.createIcons();
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
                        lucide.createIcons();
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
                        lucide.createIcons();
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
                // voice-range-test-demo.jsのstartVoiceRangeTest関数を呼び出し
                if (typeof startVoiceRangeTest === 'function') {
                    await startVoiceRangeTest(pitchProCycleManager.audioDetector);
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

            // PitchProリソースのクリーンアップ
            await pitchProCycleManager.cleanupPitchPro();

            // training.htmlへ遷移
            console.log('🚀 training.htmlに遷移中...');
            window.location.href = '../training.html';
        });
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

