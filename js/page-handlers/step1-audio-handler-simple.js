/**
 * Step1AudioHandler - シンプル版（構文エラー修正）
 */

class Step1AudioHandler {
    constructor() {
        this.audioManager = window.globalAudioManager;
        this.currentSection = 'permission';
        this.detectionActive = false;
        this.detectedPitches = [];

        // UI要素
        this.uiElements = {
            requestMicBtn: null,
            stepIndicators: {
                step1: null,
                step2: null,
                step3: null
            },
            connectors: {
                connector1: null,
                connector2: null
            },
            detectionSuccess: null,
            startRangeTestBtn: null
        };
    }

    async initialize() {
        try {
            console.log('🔄 Step1AudioHandler: 初期化開始');

            // Lucideアイコン初期化
            this.initializeLucideIcons();

            // UI要素キャッシュ
            this.cacheUIElements();

            // GlobalAudioManager初期化
            await this.audioManager.initialize();

            // localStorage状態確認
            this.checkPreviousPermissions();

            // イベントリスナー設定
            this.setupEventListeners();

            console.log('✅ Step1AudioHandler: 初期化完了');
            return { success: true };

        } catch (error) {
            console.error('❌ Step1AudioHandler初期化失敗:', error);
            throw error;
        }
    }

    initializeLucideIcons() {
        if (typeof lucide !== 'undefined' && typeof lucide.createIcons === 'function') {
            lucide.createIcons();
            console.log('✅ Step1: Lucideアイコン初期化完了');
        } else {
            console.warn('⚠️ Step1: Lucideライブラリが見つかりません');
        }
    }

    cacheUIElements() {
        this.uiElements.requestMicBtn = document.getElementById('request-mic-btn');
        this.uiElements.stepIndicators.step1 = document.getElementById('step-1');
        this.uiElements.stepIndicators.step2 = document.getElementById('step-2');
        this.uiElements.stepIndicators.step3 = document.getElementById('step-3');
        this.uiElements.connectors.connector1 = document.getElementById('connector-1');
        this.uiElements.connectors.connector2 = document.getElementById('connector-2');
        this.uiElements.detectionSuccess = document.getElementById('detection-success');
        this.uiElements.startRangeTestBtn = document.getElementById('start-range-test-btn');

        console.log('✅ Step1: UI要素キャッシュ完了');
    }

    checkPreviousPermissions() {
        const micPermission = localStorage.getItem('micPermissionGranted');
        const rangeData = localStorage.getItem('voiceRangeData');

        if (micPermission === 'true') {
            console.log('✅ マイク許可済み（localStorage）');
            this.updateStepIndicator('step1', 'completed');
        }

        if (rangeData) {
            console.log('✅ 音域データ存在（localStorage）');
            this.updateStepIndicator('step2', 'completed');
            this.showRangeSavedDisplay();
        }
    }

    setupEventListeners() {
        // マイク許可ボタン
        if (this.uiElements.requestMicBtn) {
            console.log('✅ Step1: マイク許可ボタン見つかりました', this.uiElements.requestMicBtn);
            this.uiElements.requestMicBtn.addEventListener('click', () => {
                console.log('🎤 Step1: マイク許可ボタンクリック');
                this.requestMicrophonePermission();
            });
        } else {
            console.error('❌ Step1: マイク許可ボタンが見つかりません (#request-mic-btn)');
        }

        // 音域テスト開始ボタン
        if (this.uiElements.startRangeTestBtn) {
            this.uiElements.startRangeTestBtn.addEventListener('click', () => {
                this.navigateToStep2();
            });
        }

        console.log('✅ Step1: イベントリスナー設定完了');
    }

    async requestMicrophonePermission() {
        try {
            console.log('🎤 Step1: マイク許可要求開始');

            // GlobalAudioManagerを通じてPitchPro初期化（マイク許可含む）
            const pitchPro = await this.audioManager.initialize();

            // Step1用のUI要素に接続
            await this.audioManager.connectToPage('Step1-Permission', {
                volumeBarSelector: '#volume-progress',
                volumeTextSelector: '#volume-value',
                frequencySelector: '#frequency-value'
            });

            console.log('✅ マイク許可成功！');

            // localStorage保存
            localStorage.setItem('micPermissionGranted', 'true');
            localStorage.setItem('micPermissionTimestamp', new Date().toISOString());

            // UI更新
            this.updateStepIndicator('step1', 'completed');
            this.showAudioTestSection();

        } catch (error) {
            console.error('❌ マイク許可失敗:', error);
            this.showPermissionError(error.message);
        }
    }

    async startAudioTest() {
        try {
            console.log('🎵 Step1: 音声テスト開始');

            // コールバック設定
            this.audioManager.setPageCallbacks({
                onPitchUpdate: (result) => this.handlePitchUpdate(result),
                onVolumeUpdate: (volume) => this.handleVolumeUpdate(volume),
                onError: (error) => this.handleAudioError(error)
            });

            // 音声検出開始
            await this.audioManager.startDetection();
            this.detectionActive = true;

            // UI更新
            this.updateInstructionText('「ド」を発声してください');

        } catch (error) {
            console.error('❌ 音声テスト開始失敗:', error);
        }
    }

    handlePitchUpdate(result) {
        if (!this.detectionActive) return;

        // 「ド」の検出（C4周辺 261.6Hz）
        if (result.note && result.note.includes('C') && result.volume > 0.1) {
            this.detectedPitches.push({
                note: result.note,
                frequency: result.frequency,
                volume: result.volume,
                timestamp: Date.now()
            });

            // 充分な検出があれば成功
            if (this.detectedPitches.length >= 5) {
                this.completeAudioTest();
            }
        }
    }

    handleVolumeUpdate(volume) {
        // PitchProが自動でUI更新するため、追加処理のみ
        if (volume > 0.2) {
            console.log(`🔊 音量検出: ${(volume * 100).toFixed(1)}%`);
        }
    }

    handleAudioError(error) {
        console.error('🚨 音声処理エラー:', error);
        this.showAudioError(error.message);
    }

    completeAudioTest() {
        console.log('✅ 音声テスト完了');

        this.detectionActive = false;
        this.audioManager.stopDetection();

        // UI更新
        this.updateStepIndicator('step2', 'completed');
        this.showDetectionSuccess();

        // 音域テストボタン表示
        if (this.uiElements.startRangeTestBtn) {
            this.uiElements.startRangeTestBtn.classList.remove('hidden');
        }
    }

    navigateToStep2() {
        console.log('🔄 Step2へ遷移');
        localStorage.setItem('step1Completed', 'true');
        window.location.href = 'preparation-step2.html';
    }

    updateStepIndicator(stepId, status) {
        const element = this.uiElements.stepIndicators[stepId];
        if (!element) return;

        element.className = `step-indicator ${status}`;
        console.log(`✅ ${stepId}: ${status}`);
    }

    showAudioTestSection() {
        const audioTestSection = document.getElementById('audio-test-section');
        const permissionSection = document.getElementById('permission-section');

        if (permissionSection) {
            permissionSection.classList.add('hidden');
        }
        if (audioTestSection) {
            audioTestSection.classList.remove('hidden');
            this.startAudioTest();
        }
    }

    showDetectionSuccess() {
        if (this.uiElements.detectionSuccess) {
            this.uiElements.detectionSuccess.classList.remove('hidden');
        }

        this.updateInstructionText('音声検出完了！音域テストに進んでください。');
    }

    showRangeSavedDisplay() {
        const rangeSavedDisplay = document.getElementById('range-saved-display');
        if (rangeSavedDisplay) {
            rangeSavedDisplay.classList.remove('hidden');
        }
    }

    updateInstructionText(text) {
        const instructionText = document.getElementById('voice-instruction-text');
        if (instructionText) {
            instructionText.textContent = text;
        }
    }

    showPermissionError(message) {
        console.error('🚨 マイク許可エラー:', message);
    }

    showAudioError(message) {
        console.error('🚨 音声処理エラー:', message);
    }

    getStatus() {
        return {
            currentSection: this.currentSection,
            detectionActive: this.detectionActive,
            detectedPitchesCount: this.detectedPitches.length,
            audioManagerStatus: this.audioManager.getStatus()
        };
    }
}

// グローバル初期化
let step1AudioHandler;

// 初期化関数
async function initializeStep1Handler() {
    try {
        console.log('🔄 Step1Handler初期化開始...');
        step1AudioHandler = new Step1AudioHandler();
        await step1AudioHandler.initialize();

        // グローバルアクセス設定
        window.step1AudioHandler = step1AudioHandler;

        console.log('🚀 Step1: 初期化完了');
        return step1AudioHandler;
    } catch (error) {
        console.error('🚨 Step1: 初期化失敗', error);
        throw error;
    }
}

// 即座に実行
console.log('📦 Step1AudioHandler-Simple読み込み完了');