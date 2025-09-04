/**
 * トレーニングセッション管理モジュール
 * 
 * @version 1.0.0
 * @description AudioProcessorとDataManagerを統合したトレーニング実行エンジン
 * @author Claude Code
 * @features セッション管理・評価計算・進行制御・結果保存
 */

class TrainingSession {
  constructor(mode = 'random') {
    this.mode = mode;
    this.sessionNumber = 1;
    this.maxSessions = this.getMaxSessionsForMode(mode);
    
    // セッション状態
    this.currentState = 'idle'; // idle | preparing | active | evaluating | completed
    this.startTime = null;
    this.endTime = null;
    
    // 音程検出関連
    this.audioProcessor = null;
    this.currentInterval = 'do'; // 現在の目標音程
    this.currentTargetFreq = 261.63; // C4
    this.baseFrequency = 261.63; // 基音
    
    // セッション結果
    this.detectionResults = [];
    this.sessionSummary = null;
    
    // 音程進行
    this.intervals = ['do', 're', 'mi', 'fa', 'so', 'la', 'ti', 'do'];
    this.currentIntervalIndex = 0;
    
    // タイマー・進行管理
    this.progressTimer = null;
    this.evaluationTimeout = null;
    
    // UI更新コールバック
    this.uiCallbacks = {
      onSessionStart: null,
      onIntervalChange: null,
      onPitchUpdate: null,
      onSessionComplete: null,
      onError: null
    };
  }

  /**
   * モード別最大セッション数取得
   */
  getMaxSessionsForMode(mode) {
    switch (mode) {
      case 'random': return 8;
      case 'continuous': return 12;
      case 'twelve': return 12; // 可変（12-24）
      case 'weakness': return 16;
      default: return 8;
    }
  }

  /**
   * トレーニングシステム初期化
   */
  async initializeTraining() {
    try {
      // AudioProcessorを初期化
      this.audioProcessor = new AudioProcessor();
      const initResult = await this.audioProcessor.initialize();
      
      if (!initResult.success) {
        throw new Error(`オーディオ初期化失敗: ${initResult.error}`);
      }

      // AudioProcessorコールバック設定
      console.log('🔧 AudioProcessorコールバック設定開始');
      this.audioProcessor.setCallbacks({
        onPitchUpdate: (result) => {
          console.log('📡 AudioProcessorからのコールバック受信:', result);
          this.handlePitchDetection(result);
        },
        onError: (context, error) => this.handleAudioError(context, error),
        onStateChange: (state) => this.handleAudioStateChange(state)
      });
      console.log('✅ AudioProcessorコールバック設定完了');

      // アクセス権限チェック
      const accessCheck = DataManager.checkModeAccess(this.mode);
      if (!accessCheck.hasAccess) {
        throw new Error(`モードアクセス拒否: ${accessCheck.reason}`);
      }

      // 音域データ取得
      const voiceRange = DataManager.getVoiceRangeData();
      if (!voiceRange) {
        throw new Error('音域データが無効です。準備ページで音域テストを実行してください。');
      }

      // 基音設定
      this.setupBaseFrequency(voiceRange);

      console.log('🎯 TrainingSession初期化完了:', {
        mode: this.mode,
        maxSessions: this.maxSessions,
        baseFreq: this.baseFrequency.toFixed(1) + 'Hz'
      });

      return { success: true };
      
    } catch (error) {
      this.handleError('initialization', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 基音周波数設定
   */
  setupBaseFrequency(voiceRange) {
    const comfortableRange = voiceRange.results.comfortableRange;
    
    if (this.mode === 'random') {
      // ランダム基音モード：快適音域内からランダム選択
      this.baseFrequency = this.generateRandomBaseFrequency(comfortableRange);
    } else {
      // その他モード：推奨基音を使用
      this.baseFrequency = this.parseNoteToFrequency(comfortableRange.recommendedRoot);
    }
    
    this.updateTargetFrequency();
  }

  /**
   * ランダム基音生成
   */
  generateRandomBaseFrequency(comfortableRange) {
    // 快適音域内でオクターブを考慮したランダム選択
    const baseNotes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const randomNote = baseNotes[Math.floor(Math.random() * baseNotes.length)];
    
    // 音域に合わせたオクターブ選択（簡略実装）
    const octave = 4; // 仮実装：C4基準
    return this.parseNoteToFrequency(`${randomNote}${octave}`);
  }

  /**
   * 音名から周波数に変換（簡略実装）
   */
  parseNoteToFrequency(note) {
    // TODO: pitchpro-audio MusicTheoryユーティリティを活用
    const A4_FREQ = 440.0;
    
    // 仮実装：C4 = 261.63Hz
    if (note.startsWith('C4') || note === 'C') return 261.63;
    if (note.startsWith('D4') || note === 'D') return 293.66;
    if (note.startsWith('E4') || note === 'E') return 329.63;
    if (note.startsWith('F4') || note === 'F') return 349.23;
    if (note.startsWith('G4') || note === 'G') return 392.00;
    if (note.startsWith('A4') || note === 'A') return 440.00;
    if (note.startsWith('B4') || note === 'B') return 493.88;
    
    return 261.63; // デフォルトC4
  }

  /**
   * 現在の目標周波数を更新
   */
  updateTargetFrequency() {
    const intervalSemitones = {
      'do': 0, 're': 2, 'mi': 4, 'fa': 5,
      'so': 7, 'la': 9, 'ti': 11
    };
    
    const semitones = intervalSemitones[this.currentInterval] || 0;
    this.currentTargetFreq = this.baseFrequency * Math.pow(2, semitones / 12);
  }

  /**
   * セッション開始
   */
  async startSession() {
    console.log('📍 startSession()開始, currentState:', this.currentState);
    
    if (this.currentState !== 'idle') {
      console.warn('⚠️ セッション重複開始防止');
      return;
    }

    try {
      console.log('📍 ステップ1: 状態をpreparingに変更');
      this.currentState = 'preparing';
      this.startTime = new Date().toISOString();
      this.detectionResults = [];
      this.currentIntervalIndex = 0;
      this.currentInterval = this.intervals[0];
      
      console.log('📍 ステップ2: ターゲット周波数更新');
      this.updateTargetFrequency();

      console.log('📍 ステップ3: UI通知, コールバック存在:', !!this.uiCallbacks.onSessionStart);
      // UI通知
      if (this.uiCallbacks.onSessionStart) {
        this.uiCallbacks.onSessionStart({
          session: this.sessionNumber,
          maxSessions: this.maxSessions,
          mode: this.mode,
          baseFreq: this.baseFrequency
        });
      }

      console.log('📍 ステップ4: 音程検出開始前, audioProcessor存在:', !!this.audioProcessor);
      // 音程検出開始
      console.log('🎵 音程検出開始指示');
      this.audioProcessor.startDetection();
      this.currentState = 'active';
      console.log('✅ 状態をactiveに変更、音程検出待機中');
      
      // 音程進行タイマー開始（ドレミファソラシドを5.3秒で進行）
      this.startIntervalProgression();
      
      console.log('🚀 セッション開始:', {
        session: this.sessionNumber,
        mode: this.mode,
        baseFreq: this.baseFrequency.toFixed(1) + 'Hz'
      });

    } catch (error) {
      this.handleError('session_start', error);
    }
  }

  /**
   * 音程進行制御
   */
  startIntervalProgression() {
    const intervalDuration = 5300 / 8; // 約663ms per interval
    
    this.progressTimer = setInterval(() => {
      if (this.currentIntervalIndex < this.intervals.length - 1) {
        this.currentIntervalIndex++;
        this.currentInterval = this.intervals[this.currentIntervalIndex];
        this.updateTargetFrequency();
        
        // UI更新通知
        if (this.uiCallbacks.onIntervalChange) {
          this.uiCallbacks.onIntervalChange({
            interval: this.currentInterval,
            index: this.currentIntervalIndex,
            targetFreq: this.currentTargetFreq
          });
        }
        
        console.log(`🎵 音程進行: ${this.currentInterval} (${this.currentTargetFreq.toFixed(1)}Hz)`);
      } else {
        // セッション完了
        this.completeCurrentSession();
      }
    }, intervalDuration);
  }

  /**
   * 音程検出結果ハンドリング
   */
  handlePitchDetection(pitchResult) {
    if (this.currentState !== 'active') return;

    // DataManagerで評価変換
    const sessionResult = DataManager.convertPitchProResult(
      pitchResult,
      this.currentTargetFreq,
      this.currentInterval
    );

    console.log('🎤 音程検出結果処理:', {
      pitchResult: pitchResult,
      targetFreq: this.currentTargetFreq,
      interval: this.currentInterval,
      sessionResult: sessionResult,
      resultsCount: this.detectionResults.length
    });

    if (sessionResult) {
      this.detectionResults.push(sessionResult);
      
      // UI更新通知
      if (this.uiCallbacks.onPitchUpdate) {
        this.uiCallbacks.onPitchUpdate({
          result: sessionResult,
          interval: this.currentInterval,
          progress: this.currentIntervalIndex / this.intervals.length
        });
      }
    }
  }

  /**
   * 現在のセッション完了
   */
  async completeCurrentSession() {
    if (this.currentState === 'completed') return;
    
    this.currentState = 'evaluating';
    this.endTime = new Date().toISOString();
    
    // タイマー停止
    if (this.progressTimer) {
      clearInterval(this.progressTimer);
      this.progressTimer = null;
    }
    
    // 音程検出停止
    this.audioProcessor.stopDetection();

    // セッション統計計算
    this.sessionSummary = DataManager.calculateSessionSummary(this.detectionResults);
    
    if (!this.sessionSummary) {
      this.handleError('session_evaluation', new Error('セッション統計計算失敗'));
      return;
    }

    // セッション結果保存
    const sessionData = {
      mode: this.mode,
      sessionNumber: this.sessionNumber,
      startTime: this.startTime,
      endTime: this.endTime,
      baseNote: {
        frequency: this.baseFrequency,
        note: this.frequencyToNote(this.baseFrequency),
        rangeOffset: 0
      },
      detectionResults: this.detectionResults,
      sessionSummary: this.sessionSummary,
      completed: true
    };

    const savedSession = DataManager.saveSessionResult(sessionData);
    this.currentState = 'completed';

    // セッション完了UI通知
    if (this.uiCallbacks.onSessionComplete) {
      this.uiCallbacks.onSessionComplete({
        sessionData: savedSession,
        summary: this.sessionSummary,
        isLastSession: this.sessionNumber >= this.maxSessions
      });
    }

    console.log('✅ セッション完了:', {
      session: this.sessionNumber,
      score: this.sessionSummary.totalScore,
      accuracy: this.sessionSummary.averageCentError + '¢'
    });

    // 全セッション完了チェック
    if (this.sessionNumber >= this.maxSessions) {
      await this.completeAllSessions();
    }
  }

  /**
   * 全セッション完了処理
   */
  async completeAllSessions() {
    console.log('🏁 全セッション完了');
    
    // TODO: 総合評価計算・保存
    // DynamicGradeCalculatorとの統合は次期実装
    
    // UI通知
    if (this.uiCallbacks.onAllSessionsComplete) {
      this.uiCallbacks.onAllSessionsComplete({
        mode: this.mode,
        totalSessions: this.sessionNumber,
        // overallEvaluation: finalEvaluation
      });
    }
  }

  /**
   * 次のセッションを準備
   */
  prepareNextSession() {
    if (this.sessionNumber >= this.maxSessions) {
      console.log('🎯 全セッション完了済み');
      return false;
    }

    this.sessionNumber++;
    this.currentState = 'idle';
    this.detectionResults = [];
    this.sessionSummary = null;
    
    // ランダム基音モードでは新しい基音を生成
    if (this.mode === 'random') {
      const voiceRange = DataManager.getVoiceRangeData();
      if (voiceRange) {
        this.setupBaseFrequency(voiceRange);
      }
    }

    console.log(`🔄 次セッション準備完了: ${this.sessionNumber}/${this.maxSessions}`);
    return true;
  }

  /**
   * セッション中断
   */
  abortSession() {
    this.currentState = 'idle';
    
    // タイマー停止
    if (this.progressTimer) {
      clearInterval(this.progressTimer);
      this.progressTimer = null;
    }
    
    if (this.evaluationTimeout) {
      clearTimeout(this.evaluationTimeout);
      this.evaluationTimeout = null;
    }
    
    // 音程検出停止
    if (this.audioProcessor) {
      this.audioProcessor.stopDetection();
    }
    
    console.log('🛑 セッション中断');
  }

  /**
   * 周波数から音名に変換（簡略実装）
   */
  frequencyToNote(frequency) {
    // TODO: pitchpro-audio MusicTheoryユーティリティを活用
    const A4_FREQ = 440.0;
    const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    
    // 簡略計算
    const semitones = Math.round(12 * Math.log2(frequency / A4_FREQ));
    const octave = Math.floor((semitones + 9) / 12) + 4;
    const noteIndex = (semitones + 9) % 12;
    
    return `${noteNames[noteIndex]}${octave}`;
  }

  /**
   * UI更新コールバック設定
   */
  setUICallbacks(callbacks) {
    this.uiCallbacks = { ...this.uiCallbacks, ...callbacks };
  }

  /**
   * オーディオエラーハンドリング
   */
  handleAudioError(context, error) {
    console.error(`[TrainingSession] Audio Error [${context}]:`, error);
    
    if (this.uiCallbacks.onError) {
      this.uiCallbacks.onError(context, error);
    }
  }

  /**
   * オーディオ状態変更ハンドリング
   */
  handleAudioStateChange(state) {
    console.log(`🔄 Audio State: ${state}`);
  }

  /**
   * 一般エラーハンドリング
   */
  handleError(context, error) {
    console.error(`[TrainingSession] Error [${context}]:`, error);
    
    if (this.uiCallbacks.onError) {
      this.uiCallbacks.onError(context, error);
    }
  }

  /**
   * セッション統計取得
   */
  getSessionStats() {
    return {
      mode: this.mode,
      currentSession: this.sessionNumber,
      maxSessions: this.maxSessions,
      state: this.currentState,
      currentInterval: this.currentInterval,
      baseFrequency: this.baseFrequency,
      detectionCount: this.detectionResults.length,
      sessionSummary: this.sessionSummary
    };
  }

  /**
   * リソースクリーンアップ
   */
  cleanup() {
    this.abortSession();
    
    if (this.audioProcessor) {
      this.audioProcessor.cleanup();
      this.audioProcessor = null;
    }
    
    console.log('🧹 TrainingSession破棄完了');
  }
}

// グローバル公開
window.TrainingSession = TrainingSession;