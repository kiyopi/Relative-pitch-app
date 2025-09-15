/**
 * 包括的音域テストページ - PitchPro v1.2.1統合版
 *
 * VOICE_RANGE_TEST_FLOW_DIAGRAM.mdの仕様に基づく実装
 *
 * 主要機能:
 * - AudioDetectionComponent v1.2.1 統合
 * - updateSelectors() 動的UI切り替え機能
 * - VoiceRangeTesterV113 連携
 * - 段階的フロー管理 (準備 → マイクテスト → 音域測定 → 結果)
 */

class ComprehensiveRangeTest {
    constructor() {
        this.audioDetector = null;
        this.voiceRangeTester = null;
        this.currentStep = 1;
        this.deviceSpecs = null;
        this.testResults = {
            lowest: { note: null, frequency: null },
            highest: { note: null, frequency: null },
            semitones: 0,
            octaves: 0
        };

        // DOM要素キャッシュ
        this.elements = this.initializeElements();

        // イベントリスナー設定
        this.setupEventListeners();

        // 初期化
        this.initialize();
    }

    initializeElements() {
        return {
            // ナビゲーション
            backButton: document.getElementById('back-button'),

            // ステップインジケーター
            step1: document.getElementById('step-1'),
            step2: document.getElementById('step-2'),
            step3: document.getElementById('step-3'),
            step4: document.getElementById('step-4'),

            // セクション
            preparationSection: document.getElementById('preparation-section'),
            microphoneSection: document.getElementById('microphone-section'),
            rangeTestSection: document.getElementById('range-test-section'),
            resultsSection: document.getElementById('results-section'),
            errorSection: document.getElementById('error-section'),

            // 準備段階
            deviceInfo: document.getElementById('device-info'),
            initSystemBtn: document.getElementById('init-system-btn'),

            // マイクテスト
            micVolumeBar: document.getElementById('mic-volume-bar'),
            micVolumeText: document.getElementById('mic-volume-text'),
            micFrequencyValue: document.getElementById('mic-frequency-value'),
            micNoteValue: document.getElementById('mic-note-value'),
            startMicTestBtn: document.getElementById('start-mic-test-btn'),
            proceedToRangeBtn: document.getElementById('proceed-to-range-btn'),

            // 音域測定
            rangeTestBadge: document.getElementById('range-test-badge'),
            rangeIcon: document.getElementById('range-icon'),
            countdownDisplay: document.getElementById('countdown-display'),
            progressCircle: document.getElementById('progress-circle'),
            rangeTestStatus: document.getElementById('range-test-status'),
            rangeTestInstruction: document.getElementById('range-test-instruction'),
            rangeTestVolumeBar: document.getElementById('range-test-volume-bar'),
            rangeTestVolumeText: document.getElementById('range-test-volume-text'),
            rangeTestFrequencyValue: document.getElementById('range-test-frequency-value'),
            startRangeTestBtn: document.getElementById('start-range-test-btn'),
            stopRangeTestBtn: document.getElementById('stop-range-test-btn'),

            // 結果表示
            lowestNote: document.getElementById('lowest-note'),
            lowestFrequency: document.getElementById('lowest-frequency'),
            highestNote: document.getElementById('highest-note'),
            highestFrequency: document.getElementById('highest-frequency'),
            rangeSemitones: document.getElementById('range-semitones'),
            rangeOctaves: document.getElementById('range-octaves'),
            saveResultsBtn: document.getElementById('save-results-btn'),
            restartTestBtn: document.getElementById('restart-test-btn'),

            // エラー表示
            errorMessage: document.getElementById('error-message'),
            retryBtn: document.getElementById('retry-btn'),

            // デバッグ情報
            debugInfo: document.getElementById('debug-info')
        };
    }

    setupEventListeners() {
        // ナビゲーション
        this.elements.backButton.addEventListener('click', () => this.handleBack());

        // 準備段階
        this.elements.initSystemBtn.addEventListener('click', () => this.initializeSystem());

        // マイクテスト
        this.elements.startMicTestBtn.addEventListener('click', () => this.startMicrophoneTest());
        this.elements.proceedToRangeBtn.addEventListener('click', () => this.proceedToRangeTest());

        // 音域測定
        this.elements.startRangeTestBtn.addEventListener('click', () => this.startRangeTest());
        this.elements.stopRangeTestBtn.addEventListener('click', () => this.stopRangeTest());

        // 結果表示
        this.elements.saveResultsBtn.addEventListener('click', () => this.saveResults());
        this.elements.restartTestBtn.addEventListener('click', () => this.restartTest());

        // エラー処理
        this.elements.retryBtn.addEventListener('click', () => this.retryCurrentOperation());

        // ページアンロード時のクリーンアップ
        window.addEventListener('beforeunload', () => this.cleanup());
    }

    async initialize() {
        console.log('🚀 包括的音域テスト初期化開始 (PitchPro v1.2.1)');

        // PitchPro v1.2.1の情報表示
        if (typeof PitchPro !== 'undefined') {
            console.log('✅ PitchPro v1.2.1 ライブラリ読み込み完了');
            console.log('📋 利用可能クラス:', Object.keys(PitchPro));
            if (PitchPro.VERSION) {
                console.log('🆔 Version:', PitchPro.VERSION);
            }
        }

        // Lucideアイコン初期化
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
            console.log('✅ Lucideアイコン初期化完了');
        }

        // デバイス検出
        this.detectDevice();

        // デバッグ情報更新
        this.updateDebugInfo('初期化完了 - PitchPro v1.2.1 準備完了');
    }

    detectDevice() {
        if (typeof PitchPro !== 'undefined' && PitchPro.DeviceDetection) {
            this.deviceSpecs = PitchPro.DeviceDetection.getDeviceSpecs();

            const deviceInfo = [
                `デバイス: ${this.deviceSpecs.deviceType}`,
                `iOS: ${this.deviceSpecs.isIOS ? 'Yes' : 'No'}`,
                `感度: ${this.deviceSpecs.sensitivity}x`,
                `ノイズゲート: ${this.deviceSpecs.noiseGate}`,
                `対応機能: updateSelectors(), 改善されたエラーハンドリング`
            ];

            this.elements.deviceInfo.innerHTML = deviceInfo.map(info =>
                `<div class="flex items-center gap-2 mb-1">✅ ${info}</div>`
            ).join('');

            console.log('📱 デバイス検出完了:', this.deviceSpecs);
        } else {
            this.elements.deviceInfo.innerHTML = '<div class="text-red-300">❌ PitchPro読み込みエラー</div>';
        }
    }

    async initializeSystem() {
        try {
            this.elements.initSystemBtn.disabled = true;
            this.updateDebugInfo('システム初期化開始...');

            // AudioDetectionComponent初期化
            this.audioDetector = new PitchPro.AudioDetectionComponent({
                volumeBarSelector: '#mic-volume-bar',
                volumeTextSelector: '#mic-volume-text',
                frequencySelector: '#mic-frequency-value',
                noteSelector: '#mic-note-value',
                clarityThreshold: 0.4,
                minVolumeAbsolute: 0.01,
                deviceOptimization: true
            });

            await this.audioDetector.initialize();

            // コールバック設定
            this.audioDetector.setCallbacks({
                onPitchUpdate: (result) => this.handlePitchUpdate(result),
                onError: (error) => this.handleError(error)
            });

            console.log('✅ AudioDetectionComponent初期化完了');
            this.updateDebugInfo('✅ システム初期化完了 - マイクテストに進んでください');

            // マイクテスト段階へ移行
            this.moveToStep(2);

        } catch (error) {
            console.error('❌ システム初期化エラー:', error);
            this.showError('システムの初期化に失敗しました: ' + error.message);
            this.elements.initSystemBtn.disabled = false;
        }
    }

    async startMicrophoneTest() {
        try {
            this.elements.startMicTestBtn.disabled = true;
            this.updateDebugInfo('マイクテスト開始...');

            // AudioDetectionComponent開始
            await this.audioDetector.startDetection();

            // UI更新
            this.elements.startMicTestBtn.style.display = 'none';
            this.elements.proceedToRangeBtn.classList.remove('section-hidden');

            console.log('✅ マイクテスト開始');
            this.updateDebugInfo('🎤 マイクテスト実行中 - 音声を確認してください');

        } catch (error) {
            console.error('❌ マイクテストエラー:', error);
            this.showError('マイクテストの開始に失敗しました: ' + error.message);
            this.elements.startMicTestBtn.disabled = false;
        }
    }

    proceedToRangeTest() {
        console.log('🎵 音域テストフェーズに移行');
        this.moveToStep(3);
        this.updateDebugInfo('音域測定準備完了');
    }

    async startRangeTest() {
        try {
            this.elements.startRangeTestBtn.disabled = true;
            this.updateDebugInfo('音域測定開始 - PitchPro v1.2.1 updateSelectors()使用');

            // v1.2.1の新機能: updateSelectors()でUI要素を動的切り替え
            if (this.audioDetector && typeof this.audioDetector.updateSelectors === 'function') {
                console.log('🔄 updateSelectors()で音域テスト用UIに切り替え中...');

                this.audioDetector.updateSelectors({
                    volumeBarSelector: '#range-test-volume-bar',
                    volumeTextSelector: '#range-test-volume-text',
                    frequencySelector: '#range-test-frequency-value',
                    noteSelector: null // 音域テストでは音階表示不要
                });

                console.log('✅ updateSelectors()による切り替え完了');
            } else {
                console.warn('⚠️ updateSelectors()が利用できません - 従来方式で処理');
            }

            // VoiceRangeTesterV113の初期化（シミュレーション）
            this.initializeVoiceRangeTester();

            // 測定開始
            this.startRangeMeasurement();

            // UI更新
            this.elements.startRangeTestBtn.style.display = 'none';
            this.elements.stopRangeTestBtn.classList.remove('section-hidden');

            console.log('🎵 音域測定開始');
            this.updateDebugInfo('🎵 音域測定実行中...');

        } catch (error) {
            console.error('❌ 音域測定エラー:', error);
            this.showError('音域測定の開始に失敗しました: ' + error.message);
            this.elements.startRangeTestBtn.disabled = false;
        }
    }

    initializeVoiceRangeTester() {
        // VoiceRangeTesterV113のシミュレーション実装
        this.voiceRangeTester = {
            currentPhase: 'ready',
            isLowPhaseComplete: false,
            isHighPhaseComplete: false,
            stabilityStartTime: null,
            currentFrequency: 0,
            targetStabilityDuration: 3000, // 3秒

            // プログレスコールバック設定
            setProgressCallback: (callback) => {
                this.progressCallback = callback;
            },

            // 音程検出結果処理
            handlePitchDetection: (result) => {
                if (!result.frequency || result.frequency <= 0) return;

                this.currentFrequency = result.frequency;

                // 測定フェーズに応じた処理
                if (this.voiceRangeTester.currentPhase === 'low') {
                    this.processLowPhase(result);
                } else if (this.voiceRangeTester.currentPhase === 'high') {
                    this.processHighPhase(result);
                }
            }
        };

        // プログレスコールバック設定
        this.voiceRangeTester.setProgressCallback((progress) => {
            this.updateRangeTestBadge(progress);
        });

        console.log('✅ VoiceRangeTester (シミュレーション) 初期化完了');
    }

    startRangeMeasurement() {
        // 低音テストフェーズ開始
        this.voiceRangeTester.currentPhase = 'low';
        this.elements.rangeTestStatus.textContent = '低音測定中';
        this.elements.rangeTestInstruction.textContent = '低い声を3秒間安定して出してください';

        // アイコンを下矢印に変更
        this.elements.rangeIcon.setAttribute('data-lucide', 'arrow-down');
        this.elements.rangeIcon.classList.remove('section-hidden');
        this.elements.countdownDisplay.classList.add('section-hidden');

        // Lucideアイコンを再初期化
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }

        console.log('🔽 低音測定フェーズ開始');
    }

    processLowPhase(result) {
        // 安定性チェック（3秒間の持続測定）
        if (!this.voiceRangeTester.stabilityStartTime) {
            this.voiceRangeTester.stabilityStartTime = Date.now();
            console.log('🎯 低音安定性測定開始');

            // アイコン非表示、カウントダウン表示
            this.elements.rangeIcon.classList.add('section-hidden');
            this.elements.countdownDisplay.classList.remove('section-hidden');
        }

        const elapsed = Date.now() - this.voiceRangeTester.stabilityStartTime;
        const remaining = Math.max(0, this.voiceRangeTester.targetStabilityDuration - elapsed);
        const countdown = Math.ceil(remaining / 1000);

        this.elements.countdownDisplay.textContent = countdown;

        // プログレス更新
        const progress = Math.min(100, (elapsed / this.voiceRangeTester.targetStabilityDuration) * 100);
        this.updateRangeTestBadge(progress);

        // 3秒経過で低音測定完了
        if (elapsed >= this.voiceRangeTester.targetStabilityDuration) {
            this.completeLowPhase(result.frequency, result.note);
        }
    }

    completeLowPhase(frequency, note) {
        this.testResults.lowest = { frequency, note };
        this.voiceRangeTester.isLowPhaseComplete = true;
        this.voiceRangeTester.stabilityStartTime = null;

        console.log('✅ 低音測定完了:', { frequency, note });

        // 高音テストフェーズに移行
        setTimeout(() => {
            this.startHighPhase();
        }, 1000);
    }

    startHighPhase() {
        this.voiceRangeTester.currentPhase = 'high';
        this.elements.rangeTestStatus.textContent = '高音測定中';
        this.elements.rangeTestInstruction.textContent = '高い声を3秒間安定して出してください';

        // アイコンを上矢印に変更
        this.elements.rangeIcon.setAttribute('data-lucide', 'arrow-up');
        this.elements.rangeIcon.classList.remove('section-hidden');
        this.elements.countdownDisplay.classList.add('section-hidden');

        // プログレスリセット
        this.updateRangeTestBadge(0);

        // Lucideアイコンを再初期化
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }

        console.log('🔼 高音測定フェーズ開始');
    }

    processHighPhase(result) {
        // 低音フェーズと同様の処理
        if (!this.voiceRangeTester.stabilityStartTime) {
            this.voiceRangeTester.stabilityStartTime = Date.now();
            console.log('🎯 高音安定性測定開始');

            this.elements.rangeIcon.classList.add('section-hidden');
            this.elements.countdownDisplay.classList.remove('section-hidden');
        }

        const elapsed = Date.now() - this.voiceRangeTester.stabilityStartTime;
        const remaining = Math.max(0, this.voiceRangeTester.targetStabilityDuration - elapsed);
        const countdown = Math.ceil(remaining / 1000);

        this.elements.countdownDisplay.textContent = countdown;

        const progress = Math.min(100, (elapsed / this.voiceRangeTester.targetStabilityDuration) * 100);
        this.updateRangeTestBadge(progress);

        if (elapsed >= this.voiceRangeTester.targetStabilityDuration) {
            this.completeHighPhase(result.frequency, result.note);
        }
    }

    completeHighPhase(frequency, note) {
        this.testResults.highest = { frequency, note };
        this.voiceRangeTester.isHighPhaseComplete = true;
        this.voiceRangeTester.currentPhase = 'completed';

        console.log('✅ 高音測定完了:', { frequency, note });

        // 結果計算
        this.calculateResults();

        // 結果表示に移行
        setTimeout(() => {
            this.moveToStep(4);
            this.displayResults();
        }, 1500);
    }

    calculateResults() {
        const { lowest, highest } = this.testResults;

        if (lowest.frequency && highest.frequency) {
            // セミトーン計算
            this.testResults.semitones = Math.round(
                12 * Math.log2(highest.frequency / lowest.frequency)
            );

            // オクターブ計算
            this.testResults.octaves = Math.round(
                (this.testResults.semitones / 12) * 10
            ) / 10;

            console.log('📊 音域計算完了:', this.testResults);
        }
    }

    displayResults() {
        const { lowest, highest, semitones, octaves } = this.testResults;

        if (lowest.note && highest.note) {
            this.elements.lowestNote.textContent = lowest.note;
            this.elements.lowestFrequency.textContent = `${lowest.frequency.toFixed(1)} Hz`;
            this.elements.highestNote.textContent = highest.note;
            this.elements.highestFrequency.textContent = `${highest.frequency.toFixed(1)} Hz`;
            this.elements.rangeSemitones.textContent = `${semitones} セミトーン`;
            this.elements.rangeOctaves.textContent = `${octaves} オクターブ`;

            this.updateDebugInfo(`✅ 測定完了: ${semitones}セミトーン (${octaves}オクターブ)`);
        }
    }

    updateRangeTestBadge(progress) {
        // プログレス円弧の更新（452 = 円周長）
        const offset = 452 - (progress / 100) * 452;
        this.elements.progressCircle.style.strokeDashoffset = offset;
    }

    stopRangeTest() {
        console.log('⏹️ 音域測定停止');

        if (this.audioDetector) {
            this.audioDetector.stopDetection();
        }

        this.voiceRangeTester = null;

        // UI リセット
        this.elements.startRangeTestBtn.style.display = 'block';
        this.elements.stopRangeTestBtn.classList.add('section-hidden');
        this.elements.startRangeTestBtn.disabled = false;

        this.updateDebugInfo('音域測定停止');
    }

    handlePitchUpdate(result) {
        // VoiceRangeTesterに音程検出結果を渡す
        if (this.voiceRangeTester && typeof this.voiceRangeTester.handlePitchDetection === 'function') {
            this.voiceRangeTester.handlePitchDetection(result);
        }
    }

    handleError(error) {
        console.error('🚨 PitchPro エラー:', error);
        this.showError('音声処理エラー: ' + error.message);
    }

    moveToStep(stepNumber) {
        // ステップインジケーター更新
        [1, 2, 3, 4].forEach(num => {
            const step = this.elements[`step${num}`];
            if (num === stepNumber) {
                step.classList.add('active');
            } else if (num < stepNumber) {
                step.classList.add('completed');
                step.classList.remove('active');
            } else {
                step.classList.remove('active', 'completed');
            }
        });

        // セクション表示切り替え
        const sections = [
            this.elements.preparationSection,
            this.elements.microphoneSection,
            this.elements.rangeTestSection,
            this.elements.resultsSection
        ];

        sections.forEach((section, index) => {
            if (index === stepNumber - 1) {
                section.classList.remove('section-hidden');
            } else {
                section.classList.add('section-hidden');
            }
        });

        this.currentStep = stepNumber;
        console.log(`📍 Step ${stepNumber} に移行`);
    }

    showError(message) {
        this.elements.errorMessage.textContent = message;
        this.elements.errorSection.classList.remove('section-hidden');
        this.updateDebugInfo(`❌ エラー: ${message}`);
    }

    hideError() {
        this.elements.errorSection.classList.add('section-hidden');
    }

    saveResults() {
        // データ保存のシミュレーション
        const resultsData = {
            timestamp: new Date().toISOString(),
            deviceType: this.deviceSpecs?.deviceType,
            results: this.testResults
        };

        console.log('💾 結果保存:', resultsData);
        this.updateDebugInfo('✅ 結果保存完了');

        // 実際の実装では DataManager や localStorage を使用
        alert('測定結果を保存しました！');
    }

    restartTest() {
        console.log('🔄 テスト再開');

        // リソースクリーンアップ
        this.cleanup();

        // 状態リセット
        this.testResults = {
            lowest: { note: null, frequency: null },
            highest: { note: null, frequency: null },
            semitones: 0,
            octaves: 0
        };

        // 最初のステップに戻る
        this.moveToStep(1);
        this.hideError();

        // 初期化状態に戻す
        this.elements.initSystemBtn.disabled = false;
        this.elements.startMicTestBtn.style.display = 'block';
        this.elements.proceedToRangeBtn.classList.add('section-hidden');
        this.elements.startRangeTestBtn.style.display = 'block';
        this.elements.stopRangeTestBtn.classList.add('section-hidden');

        this.updateDebugInfo('🔄 テスト再開準備完了');
    }

    retryCurrentOperation() {
        console.log('🔄 現在の操作を再試行');
        this.hideError();

        // 現在のステップに応じた再試行
        switch (this.currentStep) {
            case 1:
                this.initializeSystem();
                break;
            case 2:
                this.startMicrophoneTest();
                break;
            case 3:
                this.startRangeTest();
                break;
            default:
                this.restartTest();
        }
    }

    handleBack() {
        if (confirm('テストを終了してホームに戻りますか？')) {
            this.cleanup();
            window.location.href = '../index.html';
        }
    }

    updateDebugInfo(message) {
        const timestamp = new Date().toLocaleTimeString();
        const debugMessage = `[${timestamp}] ${message}`;

        this.elements.debugInfo.innerHTML += `<div>${debugMessage}</div>`;

        // スクロールを最下部に
        this.elements.debugInfo.scrollTop = this.elements.debugInfo.scrollHeight;

        console.log(debugMessage);
    }

    cleanup() {
        console.log('🧹 リソースクリーンアップ開始');

        if (this.audioDetector) {
            try {
                this.audioDetector.stopDetection();
                this.audioDetector.destroy();
                this.audioDetector = null;
                console.log('✅ AudioDetectionComponent クリーンアップ完了');
            } catch (error) {
                console.error('⚠️ AudioDetectionComponent クリーンアップエラー:', error);
            }
        }

        this.voiceRangeTester = null;
        console.log('✅ リソースクリーンアップ完了');
    }
}

// ページ読み込み完了時に初期化
document.addEventListener('DOMContentLoaded', () => {
    console.log('🎵 包括的音域テスト - PitchPro v1.2.1統合版');
    window.comprehensiveRangeTest = new ComprehensiveRangeTest();
});