/**
 * TrainingAudioHandler - トレーニングページ汎用音声処理
 *
 * @version 1.0.0
 * @description GlobalAudioManagerを使用したトレーニング機能実装
 * @date 2025-01-29
 */

class TrainingAudioHandler {
    constructor(trainingMode = 'relative-pitch') {
        this.audioManager = window.globalAudioManager;
        this.trainingMode = trainingMode; // relative-pitch, interval-training, etc.
        this.currentSession = null;
        this.isListening = false;

        // トレーニング設定
        this.config = {
            listenTimeout: 5000,      // 5秒リスニングタイムアウト
            minConfidence: 0.7,       // 最小信頼度
            responseWindow: 3000      // 3秒応答窓
        };

        // セッションデータ
        this.sessionData = {
            startTime: null,
            answers: [],
            currentQuestion: null,
            score: 0,
            totalQuestions: 0
        };
    }

    /**
     * トレーニングハンドラー初期化
     */
    async initialize(selectors = {}) {
        try {
            console.log(`🔄 TrainingAudioHandler[${this.trainingMode}]: 初期化開始`);

            // 前提条件確認
            await this.checkPrerequisites();

            // GlobalAudioManager初期化（既に初期化済みの場合はスキップ）
            await this.audioManager.initialize();

            // トレーニング用UI要素に接続
            const defaultSelectors = {
                volumeBarSelector: '#training-volume-bar',
                volumeTextSelector: '#training-volume-text',
                frequencySelector: '#training-frequency-value'
            };

            const finalSelectors = { ...defaultSelectors, ...selectors };
            await this.audioManager.connectToPage(`Training-${this.trainingMode}`, finalSelectors);

            // トレーニング固有の初期化
            await this.initializeTrainingMode();

            console.log(`✅ TrainingAudioHandler[${this.trainingMode}]: 初期化完了`);
            return { success: true };

        } catch (error) {
            console.error(`❌ TrainingAudioHandler[${this.trainingMode}]初期化失敗:`, error);
            throw error;
        }
    }

    /**
     * 前提条件確認（Step1, Step2完了チェック）
     */
    async checkPrerequisites() {
        const step1Completed = localStorage.getItem('step1Completed');
        const step2Completed = localStorage.getItem('step2Completed');
        const voiceRangeData = localStorage.getItem('voiceRangeData');

        if (step1Completed !== 'true') {
            throw new Error('Step1（マイク許可・音声テスト）が未完了です');
        }

        if (step2Completed !== 'true' || !voiceRangeData) {
            console.warn('⚠️ Step2（音域テスト）未完了: 制限モードで動作');
            // 音域データなしでも一部トレーニングは可能
        }

        console.log('✅ トレーニング前提条件確認完了');
    }

    /**
     * トレーニングモード固有初期化
     */
    async initializeTrainingMode() {
        switch (this.trainingMode) {
            case 'relative-pitch':
                await this.initializeRelativePitchMode();
                break;
            case 'interval-training':
                await this.initializeIntervalTrainingMode();
                break;
            case 'pitch-matching':
                await this.initializePitchMatchingMode();
                break;
            default:
                console.log(`🔧 ${this.trainingMode}: 基本モードで初期化`);
        }
    }

    /**
     * 相対音感トレーニングモード初期化
     */
    async initializeRelativePitchMode() {
        console.log('🎵 相対音感トレーニングモード初期化');

        // 音域データ取得
        const rangeData = JSON.parse(localStorage.getItem('voiceRangeData') || '{}');
        if (rangeData.lowPitch && rangeData.highPitch) {
            this.config.userRange = {
                low: rangeData.lowPitch.frequency,
                high: rangeData.highPitch.frequency
            };
            console.log('✅ ユーザー音域設定:', this.config.userRange);
        }
    }

    /**
     * インターバルトレーニングモード初期化
     */
    async initializeIntervalTrainingMode() {
        console.log('🎼 インターバルトレーニングモード初期化');
        // インターバル固有の設定
    }

    /**
     * ピッチマッチングモード初期化
     */
    async initializePitchMatchingMode() {
        console.log('🎯 ピッチマッチングモード初期化');
        // ピッチマッチング固有の設定
    }

    /**
     * リスニングセッション開始
     */
    async startListening(questionData = null) {
        try {
            console.log(`🎧 ${this.trainingMode}: リスニング開始`);

            this.isListening = true;
            this.currentSession = {
                startTime: Date.now(),
                questionData,
                detectedPitches: []
            };

            // コールバック設定
            this.audioManager.setPageCallbacks({
                onPitchUpdate: (result) => this.handleTrainingPitchUpdate(result),
                onVolumeUpdate: (volume) => this.handleTrainingVolumeUpdate(volume),
                onError: (error) => this.handleTrainingAudioError(error)
            });

            // 音声検出開始
            await this.audioManager.startDetection();

            // タイムアウト設定
            this.setListeningTimeout();

            return { success: true, sessionId: this.currentSession.startTime };

        } catch (error) {
            console.error(`❌ ${this.trainingMode}: リスニング開始失敗`, error);
            throw error;
        }
    }

    /**
     * リスニング停止
     */
    stopListening() {
        console.log(`🔇 ${this.trainingMode}: リスニング停止`);

        this.isListening = false;
        this.audioManager.stopDetection();

        if (this.listenTimeout) {
            clearTimeout(this.listenTimeout);
            this.listenTimeout = null;
        }
    }

    /**
     * トレーニング用ピッチ更新処理
     */
    handleTrainingPitchUpdate(result) {
        if (!this.isListening || !this.currentSession) return;

        // 信頼度チェック
        if (result.clarity < this.config.minConfidence) return;

        // セッションにデータ記録
        this.currentSession.detectedPitches.push({
            frequency: result.frequency,
            note: result.note,
            volume: result.volume,
            clarity: result.clarity,
            timestamp: Date.now()
        });

        // トレーニングモード固有処理
        this.processTrainingPitch(result);
    }

    /**
     * トレーニングモード固有ピッチ処理
     */
    processTrainingPitch(result) {
        switch (this.trainingMode) {
            case 'relative-pitch':
                this.processRelativePitch(result);
                break;
            case 'interval-training':
                this.processIntervalTraining(result);
                break;
            case 'pitch-matching':
                this.processPitchMatching(result);
                break;
        }
    }

    /**
     * 相対音感ピッチ処理
     */
    processRelativePitch(result) {
        // 基音からの相対音程計算
        if (this.sessionData.currentQuestion && this.sessionData.currentQuestion.baseFreq) {
            const baseFreq = this.sessionData.currentQuestion.baseFreq;
            const ratio = result.frequency / baseFreq;
            const semitones = Math.round(12 * Math.log2(ratio));

            console.log(`🎵 相対音程検出: ${semitones}セミトーン (${result.note})`);

            // 答え判定
            this.checkRelativePitchAnswer(semitones);
        }
    }

    /**
     * インターバルトレーニングピッチ処理
     */
    processIntervalTraining(result) {
        // インターバル判定ロジック
        console.log(`🎼 インターバル検出: ${result.note} (${result.frequency.toFixed(1)}Hz)`);
    }

    /**
     * ピッチマッチングピッチ処理
     */
    processPitchMatching(result) {
        // ターゲット音程とのマッチング判定
        if (this.sessionData.currentQuestion && this.sessionData.currentQuestion.targetFreq) {
            const targetFreq = this.sessionData.currentQuestion.targetFreq;
            const cents = 1200 * Math.log2(result.frequency / targetFreq);

            console.log(`🎯 ピッチマッチング: ${cents.toFixed(1)}セント差`);

            // 許容範囲内かチェック（±50セント）
            if (Math.abs(cents) <= 50) {
                this.handleCorrectPitchMatch(cents);
            }
        }
    }

    /**
     * トレーニング用音量更新処理
     */
    handleTrainingVolumeUpdate(volume) {
        // PitchProが自動でUI更新するため、追加処理のみ
        if (volume > 0.2 && this.isListening) {
            // 音量十分時の視覚フィードバック
            this.showVolumeIndicator(true);
        } else {
            this.showVolumeIndicator(false);
        }
    }

    /**
     * トレーニング用エラー処理
     */
    handleTrainingAudioError(error) {
        console.error(`🚨 ${this.trainingMode}: 音声エラー`, error);
        this.stopListening();
        this.showErrorMessage('音声処理エラーが発生しました。再試行してください。');
    }

    /**
     * リスニングタイムアウト設定
     */
    setListeningTimeout() {
        this.listenTimeout = setTimeout(() => {
            console.log(`⏰ ${this.trainingMode}: リスニングタイムアウト`);
            this.stopListening();
            this.handleTimeout();
        }, this.config.listenTimeout);
    }

    /**
     * タイムアウト処理
     */
    handleTimeout() {
        console.log(`⏰ ${this.trainingMode}: 応答時間切れ`);
        // タイムアウト時の処理（モード固有）
    }

    /**
     * 答え判定（相対音感）
     */
    checkRelativePitchAnswer(detectedSemitones) {
        if (!this.sessionData.currentQuestion) return;

        const correctAnswer = this.sessionData.currentQuestion.expectedSemitones;
        const tolerance = 1; // ±1セミトーン許容

        if (Math.abs(detectedSemitones - correctAnswer) <= tolerance) {
            this.handleCorrectAnswer(detectedSemitones);
        } else {
            this.handleIncorrectAnswer(detectedSemitones, correctAnswer);
        }
    }

    /**
     * 正解処理
     */
    handleCorrectAnswer(answer) {
        console.log(`✅ ${this.trainingMode}: 正解! (${answer})`);
        this.sessionData.score++;
        this.stopListening();
        this.showFeedback('correct', answer);
    }

    /**
     * 不正解処理
     */
    handleIncorrectAnswer(answer, correct) {
        console.log(`❌ ${this.trainingMode}: 不正解 (回答: ${answer}, 正解: ${correct})`);
        this.stopListening();
        this.showFeedback('incorrect', { answer, correct });
    }

    /**
     * 正確なピッチマッチ処理
     */
    handleCorrectPitchMatch(cents) {
        console.log(`✅ ${this.trainingMode}: ピッチマッチ成功! (${cents.toFixed(1)}セント)`);
        this.sessionData.score++;
        this.stopListening();
        this.showFeedback('pitch-match', cents);
    }

    /**
     * フィードバック表示
     */
    showFeedback(type, data) {
        // UI固有のフィードバック表示（継承クラスで実装）
        console.log(`📢 フィードバック[${type}]:`, data);
    }

    /**
     * 音量インジケーター表示
     */
    showVolumeIndicator(active) {
        // UI固有の音量表示（継承クラスで実装）
    }

    /**
     * エラーメッセージ表示
     */
    showErrorMessage(message) {
        console.error(`🚨 ${this.trainingMode}: ${message}`);
        // UI固有のエラー表示（継承クラスで実装）
    }

    /**
     * セッション終了
     */
    endSession() {
        console.log(`🏁 ${this.trainingMode}: セッション終了`);

        this.stopListening();

        const sessionResult = {
            mode: this.trainingMode,
            score: this.sessionData.score,
            total: this.sessionData.totalQuestions,
            accuracy: this.sessionData.totalQuestions > 0
                ? (this.sessionData.score / this.sessionData.totalQuestions * 100).toFixed(1)
                : 0,
            duration: Date.now() - this.sessionData.startTime,
            answers: this.sessionData.answers
        };

        // 結果をlocalStorageに保存
        this.saveSessionResult(sessionResult);

        return sessionResult;
    }

    /**
     * セッション結果保存
     */
    saveSessionResult(result) {
        const existingResults = JSON.parse(localStorage.getItem('trainingResults') || '[]');
        existingResults.push(result);
        localStorage.setItem('trainingResults', JSON.stringify(existingResults));
        console.log('✅ セッション結果保存完了');
    }

    /**
     * システム状態取得
     */
    getStatus() {
        return {
            trainingMode: this.trainingMode,
            isListening: this.isListening,
            currentSession: this.currentSession,
            sessionData: this.sessionData,
            audioManagerStatus: this.audioManager.getStatus()
        };
    }

    /**
     * 設定更新
     */
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        console.log(`⚙️ ${this.trainingMode}: 設定更新`, this.config);
    }

    /**
     * リセット
     */
    reset() {
        this.stopListening();
        this.sessionData = {
            startTime: null,
            answers: [],
            currentQuestion: null,
            score: 0,
            totalQuestions: 0
        };
        this.currentSession = null;
        console.log(`🔄 ${this.trainingMode}: リセット完了`);
    }
}

// デバッグ用グローバルアクセス
if (typeof window !== 'undefined') {
    window.TrainingAudioHandler = TrainingAudioHandler;
}