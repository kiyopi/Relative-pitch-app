/**
 * データ管理モジュール - pitchpro-audio統合版
 *
 * @version 2.1.0
 * @description pitchpro-audio-processing統合によるlocalStorageデータ管理
 * @author Claude Code
 * @features 課金制御・弱点分析・統計データ処理対応・プレミアムデータ保存期間管理
 *
 * @changelog
 * - v2.1.0 (2025-11-12): 廃止キー自動クリーンアップ機能追加
 *   - DEPRECATED_KEYS: 廃止キー一元管理配列
 *   - cleanupDeprecatedKeys(): アプリ起動時の自動クリーンアップ
 *   - resetAllData(): 廃止キーも削除するように改善
 * - v2.1.0 (2025-10-27): プレミアムデータ保存期間管理機能追加
 *   - cleanupSessionData(): プラン別自動クリーンアップ
 *   - saveSessionResultWithCleanup(): 保存時自動クリーンアップ
 *   - getDataRetentionInfo(): データ保存状況取得
 *   - checkStorageWarning(): 容量警告チェック
 */

class DataManager {
  static VERSION = '2.1.0';
  
  // localStorageキー定義
  static KEYS = {
    USER_SETTINGS: 'userSettings',
    VOICE_RANGE: 'voiceRangeData',
    SESSION_DATA: 'sessionData',
    OVERALL_EVALUATION: 'overallEvaluation',
    SUBSCRIPTION_DATA: 'subscriptionData',
    WEAKNESS_ANALYSIS: 'weaknessAnalysis',
    CUSTOM_MODE_SETTINGS: 'customModeSettings'
  };

  // 廃止されたキー（後方互換性のため自動削除対象）
  static DEPRECATED_KEYS = [
    'pitchpro_sessions' // v2.0.0以前で使用されていたキー
  ];

  // === ユーザー設定管理 ===
  
  /**
   * 初期ユーザー設定を作成
   */
  static initializeUserSettings() {
    const defaultSettings = {
      version: this.VERSION,
      userId: this.generateUUID(),
      subscription: {
        status: 'free',
        planType: 'basic',
        startDate: new Date().toISOString(),
        expiresAt: null
      },
      deviceCalibration: {
        micSensitivity: 1.0,
        noiseThreshold: 0.1,
        deviceQuality: 'medium'
      },
      preferences: {
        volume: 0.7,
        guideVolume: 0.8,
        theme: 'dark'
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    this.saveToStorage(this.KEYS.USER_SETTINGS, defaultSettings);
    return defaultSettings;
  }

  /**
   * ユーザー設定を取得
   */
  static getUserSettings() {
    const settings = this.getFromStorage(this.KEYS.USER_SETTINGS);
    if (!settings || settings.version !== this.VERSION) {
      return this.initializeUserSettings();
    }
    return settings;
  }

  /**
   * ユーザー設定を更新
   */
  static updateUserSettings(updates) {
    const settings = this.getUserSettings();
    const updatedSettings = {
      ...settings,
      ...updates,
      updatedAt: new Date().toISOString()
    };
    this.saveToStorage(this.KEYS.USER_SETTINGS, updatedSettings);
    return updatedSettings;
  }

  // === 音域データ管理 ===

  /**
   * 音域テスト結果を保存（簡略版対応）
   */
  static saveVoiceRangeData(rangeResults) {
    const rangeData = {
      version: this.VERSION,
      testDate: new Date().toISOString(),
      results: {
        lowestNote: rangeResults.lowestNote,       // 例: "C3"
        lowestFreq: rangeResults.lowestFreq,       // 例: 130.81
        highestNote: rangeResults.highestNote,     // 例: "G5"
        highestFreq: rangeResults.highestFreq,     // 例: 783.99
        range: rangeResults.range,                 // 例: "2オクターブ7半音"
        semitones: rangeResults.semitones,         // 例: 31
        comfortableRange: rangeResults.comfortableRange || null
      },
      isValid: true,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7日後
    };

    this.saveToStorage(this.KEYS.VOICE_RANGE, rangeData);
    console.log('✅ 音域データ保存完了:', rangeData);
    return rangeData;
  }

  /**
   * 音域データを取得（有効性チェック込み）
   */
  static getVoiceRangeData() {
    const rangeData = this.getFromStorage(this.KEYS.VOICE_RANGE);

    if (!rangeData || !rangeData.isValid) {
      return null;
    }

    // 有効期限チェック
    if (new Date(rangeData.expiresAt) < new Date()) {
      this.saveToStorage(this.KEYS.VOICE_RANGE, { ...rangeData, isValid: false });
      return null;
    }

    return rangeData;
  }

  /**
   * 音域データをクリア（再測定用）
   */
  static clearVoiceRangeData() {
    this.saveToStorage(this.KEYS.VOICE_RANGE, { isValid: false });
    console.log('🗑️ 音域データをクリアしました');
  }

  /**
   * Training用の基音候補を生成
   */
  static generateBasePitchCandidates() {
    const rangeData = this.getVoiceRangeData();

    if (!rangeData || !rangeData.results) {
      console.warn('⚠️ 音域データが存在しません。デフォルト範囲を使用します。');
      // デフォルト範囲（C3-C5: 一般的な音域）
      return this.generateCandidatesFromFrequency(130.81, 523.25);
    }

    const { lowestFreq, highestFreq } = rangeData.results;
    return this.generateCandidatesFromFrequency(lowestFreq, highestFreq);
  }

  /**
   * 周波数範囲から基音候補リストを生成
   */
  static generateCandidatesFromFrequency(lowestFreq, highestFreq) {
    const candidates = [];
    const startMidi = this.frequencyToMidi(lowestFreq);
    const endMidi = this.frequencyToMidi(highestFreq);

    console.log('🎵 基音候補生成:', {
      lowestFreq,
      highestFreq,
      startMidi,
      endMidi,
      range: `${endMidi - startMidi + 1}半音`
    });

    for (let midi = startMidi; midi <= endMidi; midi++) {
      candidates.push({
        midi: midi,
        frequency: this.midiToFrequency(midi),
        note: this.midiToNote(midi)
      });
    }

    console.log(`✅ ${candidates.length}個の基音候補を生成しました`);
    return candidates;
  }

  /**
   * ランダムに基音を選択（Training用）
   */
  static getRandomBasePitch() {
    const candidates = this.generateBasePitchCandidates();

    if (candidates.length === 0) {
      console.error('❌ 基音候補が0件のため選択できません');
      return null;
    }

    const randomIndex = Math.floor(Math.random() * candidates.length);
    const selected = candidates[randomIndex];

    console.log('🎲 ランダム基音選択:', selected);
    return selected;
  }

  // === 音程計算ヘルパー関数 ===

  /**
   * 周波数からMIDIノート番号に変換
   */
  static frequencyToMidi(freq) {
    return Math.round(12 * Math.log2(freq / 440) + 69);
  }

  /**
   * MIDIノート番号から周波数に変換
   */
  static midiToFrequency(midi) {
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  /**
   * MIDIノート番号から音名に変換（例: 60 -> "C4"）
   */
  static midiToNote(midi) {
    const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const octave = Math.floor(midi / 12) - 1;
    const note = notes[midi % 12];
    return `${note}${octave}`;
  }

  /**
   * 音名からMIDIノート番号に変換（例: "C4" -> 60）
   */
  static noteToMidi(noteName) {
    const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const match = noteName.match(/^([A-G]#?)(\d+)$/);

    if (!match) {
      console.error('❌ 無効な音名:', noteName);
      return null;
    }

    const note = match[1];
    const octave = parseInt(match[2]);
    const noteIndex = notes.indexOf(note);

    if (noteIndex === -1) {
      console.error('❌ 無効な音名:', note);
      return null;
    }

    return (octave + 1) * 12 + noteIndex;
  }

  /**
   * 2つの周波数間の半音数を計算
   */
  static calculateSemitones(freq1, freq2) {
    const midi1 = this.frequencyToMidi(freq1);
    const midi2 = this.frequencyToMidi(freq2);
    return Math.abs(midi2 - midi1);
  }

  // === セッションデータ管理 ===

  /**
   * セッション結果を保存
   * v2.1.0: 既存のsessionIdを保持するように修正
   */
  static saveSessionResult(sessionData) {
    const sessionRecord = {
      ...sessionData,
      version: this.VERSION,
      // 既存のsessionIdがあればそれを使用、なければ新規生成
      sessionId: sessionData.sessionId || this.generateUUID()
    };

    // 既存セッション履歴を取得
    const sessions = this.getFromStorage(this.KEYS.SESSION_DATA) || [];
    sessions.push(sessionRecord);

    // 最新100セッションのみ保持
    if (sessions.length > 100) {
      sessions.splice(0, sessions.length - 100);
    }

    this.saveToStorage(this.KEYS.SESSION_DATA, sessions);
    return sessionRecord;
  }

  /**
   * セッション履歴を取得
   * SubscriptionManagerに課金フィルターを委譲
   *
   * @param {string|null} mode - モードフィルター（'random', 'continuous', '12tone'）
   * @param {number} limit - 最大取得件数
   * @returns {Array} フィルター済みセッション配列
   */
  static getSessionHistory(mode = null, limit = 50) {
    const sessions = this.getFromStorage(this.KEYS.SESSION_DATA) || [];
    const subscriptionData = this.getSubscriptionData();

    // SubscriptionManagerで課金フィルター適用
    const filterResult = window.SubscriptionManager.filterSessionsByPlan(sessions, subscriptionData);

    // ログ出力
    if (filterResult.message) {
      console.log(filterResult.message);
    }
    if (filterResult.lockedMessage) {
      console.log(filterResult.lockedMessage);
    }

    let filteredSessions = filterResult.filteredSessions;

    // モードフィルター適用
    if (mode) {
      filteredSessions = filteredSessions.filter(session => session.mode === mode);
    }

    // ソート＆制限
    return filteredSessions
      .sort((a, b) => new Date(b.startTime) - new Date(a.startTime))
      .slice(0, limit);
  }

  /**
   * 最新セッションを取得
   */
  static getLatestSession(mode = null) {
    const sessions = this.getSessionHistory(mode, 1);
    return sessions.length > 0 ? sessions[0] : null;
  }

  // === プレミアムデータ保存期間管理 ===

  /**
   * セッションデータの自動クリーンアップ
   * SubscriptionManagerにクリーンアップ判定を委譲
   *
   * @returns {number} 表示可能なセッション数
   */
  static cleanupSessionData() {
    const subscriptionData = this.getSubscriptionData();
    const sessions = this.getFromStorage(this.KEYS.SESSION_DATA) || [];

    if (sessions.length === 0) {
      console.log('📊 クリーンアップ: セッションデータなし');
      return 0;
    }

    // SubscriptionManagerでクリーンアップ判定
    const cleanupResult = window.SubscriptionManager.shouldCleanupSessions(sessions, subscriptionData);

    console.log(cleanupResult.message);

    // クリーンアップが必要な場合（プレミアムで容量超過）
    if (cleanupResult.shouldCleanup && cleanupResult.reason === 'storage_exceeded') {
      const sortedSessions = sessions.sort((a, b) =>
        new Date(b.startTime) - new Date(a.startTime)
      );
      const trimmedSessions = sortedSessions.slice(0, 100);

      this.saveToStorage(this.KEYS.SESSION_DATA, trimmedSessions);
      console.log(`⚠️ プレミアム: 容量超過のため${sessions.length - 100}件削除`);
      console.log(`📊 残存セッション: 100件（最新のみ保持）`);
      return trimmedSessions.length;
    }

    // クリーンアップ不要
    return cleanupResult.visibleSessions || sessions.length;
  }

  /**
   * データ保存時の自動クリーンアップ付き保存
   *
   * @param {Object} sessionData - セッションデータ
   * @returns {Object} 保存されたセッション
   */
  static saveSessionResultWithCleanup(sessionData) {
    // 通常の保存処理
    const savedSession = this.saveSessionResult(sessionData);

    // 自動クリーンアップ実行
    console.log('🔄 自動クリーンアップ実行...');
    this.cleanupSessionData();

    return savedSession;
  }

  /**
   * データ保存状況を取得（設定画面・デバッグ用）
   * SubscriptionManagerにデータ保存情報取得を委譲
   *
   * @returns {Object} データ保存状況
   */
  static getDataRetentionInfo() {
    const subscriptionData = this.getSubscriptionData();
    const sessions = this.getFromStorage(this.KEYS.SESSION_DATA) || [];

    // SubscriptionManagerでデータ保存情報取得
    const retentionInfo = window.SubscriptionManager.getDataRetentionInfo(sessions, subscriptionData);

    // storageUsageを追加
    return {
      ...retentionInfo,
      storageUsage: this.getStorageUsage()
    };
  }

  /**
   * 容量警告チェック（UI表示用）
   *
   * @returns {Object} 警告情報
   */
  static checkStorageWarning() {
    const usage = this.getStorageUsage();
    const usagePercent = usage.usage;

    if (usagePercent >= 80) {
      return {
        level: 'critical',
        message: 'ストレージ容量が80%を超えています。古いデータが自動削除されます。',
        usagePercent,
        totalMB: usage.totalMB,
        shouldCleanup: true
      };
    } else if (usagePercent >= 60) {
      return {
        level: 'warning',
        message: 'ストレージ容量が60%を超えています。',
        usagePercent,
        totalMB: usage.totalMB,
        shouldCleanup: false
      };
    }

    return {
      level: 'normal',
      message: 'ストレージ容量は正常です。',
      usagePercent,
      totalMB: usage.totalMB,
      shouldCleanup: false
    };
  }

  // === 総合評価管理 ===

  /**
   * 総合評価結果を保存
   */
  static saveOverallEvaluation(evaluationData) {
    const evaluation = {
      ...evaluationData,
      version: this.VERSION,
      evaluationId: this.generateUUID()
    };

    const evaluations = this.getOverallEvaluations() || [];
    evaluations.push(evaluation);
    
    // 最新50評価のみ保持
    if (evaluations.length > 50) {
      evaluations.splice(0, evaluations.length - 50);
    }
    
    this.saveToStorage(this.KEYS.OVERALL_EVALUATION, evaluations);
    return evaluation;
  }

  /**
   * 総合評価履歴を取得
   */
  static getOverallEvaluations(mode = null, limit = 10) {
    const evaluations = this.getFromStorage(this.KEYS.OVERALL_EVALUATION) || [];
    
    let filtered = evaluations;
    if (mode) {
      filtered = evaluations.filter(evalData => evalData.mode === mode);
    }
    
    return filtered
      .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt))
      .slice(0, limit);
  }

  /**
   * 最新総合評価を取得
   */
  static getLatestEvaluation(mode) {
    const evaluations = this.getOverallEvaluations(mode, 1);
    return evaluations.length > 0 ? evaluations[0] : null;
  }

  // === 課金・アクセス制御 ===

  /**
   * モードアクセス権限チェック
   * SubscriptionManagerにアクセス権限判定を委譲
   *
   * @param {string} mode - モード名（'random', 'continuous', '12tone'）
   * @returns {Object} アクセス権限情報
   */
  static checkModeAccess(mode) {
    const subscriptionData = this.getSubscriptionData();

    // SubscriptionManagerでアクセス権限チェック
    return window.SubscriptionManager.checkModeAccess(mode, subscriptionData);
  }

  /**
   * サブスクリプションデータを取得
   */
  static getSubscriptionData() {
    const data = this.getFromStorage(this.KEYS.SUBSCRIPTION_DATA);
    
    if (!data) {
      const defaultData = {
        version: this.VERSION,
        userId: this.getUserSettings().userId,
        freeAccess: {
          randomMode: {
            totalSessions: 0,
            lastAccess: new Date().toISOString()
          }
        },
        premiumAccess: {
          status: 'expired',
          unlockedModes: [],
          subscriptionStart: null,
          subscriptionEnd: null,
          autoRenew: false
        },
        usageHistory: {
          monthlySessionCount: 0,
          lastBillingDate: null
        }
      };
      
      this.saveToStorage(this.KEYS.SUBSCRIPTION_DATA, defaultData);
      return defaultData;
    }
    
    return data;
  }

  /**
   * サブスクリプション状態を更新
   */
  static updateSubscriptionStatus(subscriptionInfo) {
    const data = this.getSubscriptionData();
    data.premiumAccess = {
      ...data.premiumAccess,
      ...subscriptionInfo
    };
    
    this.saveToStorage(this.KEYS.SUBSCRIPTION_DATA, data);
    return data;
  }

  // === 統計・分析機能 ===

  /**
   * ユーザー統計を生成
   */
  static generateUserStatistics() {
    // 【修正v1.1.0】Bug #8修正: 統計計算は全セッション対象
    const sessions = this.getSessionHistory(null, 1000);
    
    if (sessions.length === 0) {
      return null;
    }

    const totalSessions = sessions.length;
    const totalScore = sessions.reduce((sum, session) => sum + (session.sessionSummary?.totalScore || 0), 0);
    const averageScore = totalScore / totalSessions;
    
    const evaluationCounts = {
      excellent: 0,
      good: 0,
      pass: 0,
      practice: 0
    };
    
    sessions.forEach(session => {
      const summary = session.sessionSummary;
      if (summary) {
        evaluationCounts.excellent += summary.excellentCount || 0;
        evaluationCounts.good += summary.goodCount || 0;
        evaluationCounts.pass += summary.passCount || 0;
        evaluationCounts.practice += summary.practiceCount || 0;
      }
    });

    const totalNotes = Object.values(evaluationCounts).reduce((sum, count) => sum + count, 0);
    const excellenceRatio = totalNotes > 0 ? evaluationCounts.excellent / totalNotes : 0;

    return {
      totalSessions,
      averageScore: Math.round(averageScore * 10) / 10,
      excellenceRatio: Math.round(excellenceRatio * 1000) / 10, // パーセント
      evaluationDistribution: evaluationCounts,
      lastTrainingDate: sessions[0]?.startTime,
      totalTrainingTime: sessions.reduce((sum, session) => {
        if (session.startTime && session.endTime) {
          return sum + (new Date(session.endTime) - new Date(session.startTime));
        }
        return sum;
      }, 0)
    };
  }

  /**
   * 音程別の弱点を分析
   */
  static analyzeWeakIntervals() {
    // 【修正v1.1.0】Bug #9修正: 弱点分析は全セッション対象
    const sessions = this.getSessionHistory(null, 1000);
    const intervalStats = {};
    
    const intervals = ['do', 're', 'mi', 'fa', 'so', 'la', 'ti', 'do'];
    
    intervals.forEach(interval => {
      intervalStats[interval] = {
        attempts: 0,
        totalError: 0,
        excellentCount: 0,
        errorHistory: []
      };
    });
    
    sessions.forEach(session => {
      if (session.detectionResults) {
        session.detectionResults.forEach(result => {
          const interval = result.targetInterval;
          if (intervalStats[interval]) {
            intervalStats[interval].attempts++;
            intervalStats[interval].totalError += Math.abs(result.evaluation.centError);
            intervalStats[interval].errorHistory.push(result.evaluation.centError);
            
            if (result.evaluation.grade === 'Excellent') {
              intervalStats[interval].excellentCount++;
            }
          }
        });
      }
    });
    
    // 弱点計算
    const weaknessList = [];
    Object.keys(intervalStats).forEach(interval => {
      const stats = intervalStats[interval];
      if (stats.attempts > 0) {
        const averageError = stats.totalError / stats.attempts;
        const successRate = stats.excellentCount / stats.attempts;
        
        intervalStats[interval].averageError = Math.round(averageError * 10) / 10;
        intervalStats[interval].successRate = Math.round(successRate * 100) / 100;
        
        // 弱点判定（平均エラー25セント以上 または 成功率60%未満）
        if (averageError > 25 || successRate < 0.6) {
          weaknessList.push({
            interval,
            averageError: intervalStats[interval].averageError,
            successRate: intervalStats[interval].successRate,
            priority: averageError + (1 - successRate) * 50 // 重要度計算
          });
        }
      }
    });
    
    // 重要度順でソート
    weaknessList.sort((a, b) => b.priority - a.priority);
    
    return {
      intervalStatistics: intervalStats,
      weakIntervals: weaknessList.slice(0, 3), // 上位3つの弱点
      analysisDate: new Date().toISOString()
    };
  }

  // === 弱点練習モード対応（次期バージョン） ===
  
  /**
   * 弱点分析データを保存
   */
  static saveWeaknessAnalysis(analysisData) {
    const weaknessRecord = {
      ...analysisData,
      version: this.VERSION,
      userId: this.getUserSettings().userId,
      generatedAt: new Date().toISOString(),
      nextUpdateDue: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    };
    
    this.saveToStorage(this.KEYS.WEAKNESS_ANALYSIS, weaknessRecord);
    return weaknessRecord;
  }

  /**
   * 弱点分析データを取得
   */
  static getWeaknessAnalysis() {
    return this.getFromStorage(this.KEYS.WEAKNESS_ANALYSIS);
  }

  /**
   * カスタムトレーニングプランを生成
   */
  static generateCustomTrainingPlan(weaknessProfile) {
    const plan = {
      version: this.VERSION,
      modeId: `weakness_${Date.now()}`,
      createdAt: new Date().toISOString(),
      configuration: {
        targetIntervals: weaknessProfile.overallWeakness.slice(0, 3),
        sessionCount: 16,
        difficultyLevel: 'adaptive',
        baseNoteStrategy: 'user_comfortable_range',
        repetitionLogic: 'error_weighted'
      },
      aiRecommendations: {
        suggestedDuration: '5-8 minutes',
        optimalFrequency: 'daily',
        expectedImprovement: '25% in 2 weeks'
      }
    };
    
    this.saveToStorage(this.KEYS.CUSTOM_MODE_SETTINGS, plan);
    return plan;
  }

  // === pitchpro-audio統合処理 ===

  /**
   * pitchpro-audio検出結果をセッションデータに変換
   */
  static convertPitchProResult(pitchProData, targetFreq, targetInterval) {
    const { frequency, clarity, note, cents } = pitchProData;
    
    // 信頼度チェック
    if (clarity < 0.8) {
      return null; // 信頼度不足
    }
    
    // セント誤差計算（ターゲット周波数との差）
    const centError = cents;
    
    // 評価判定
    let grade, score;
    if (Math.abs(centError) <= 15) {
      grade = 'Excellent';
      score = 100;
    } else if (Math.abs(centError) <= 25) {
      grade = 'Good';
      score = 80;
    } else if (Math.abs(centError) <= 40) {
      grade = 'Pass';
      score = 60;
    } else {
      grade = 'Practice';
      score = 30;
    }

    return {
      targetInterval,
      targetFrequency: targetFreq,
      detectedData: pitchProData,
      evaluation: {
        centError: Math.round(centError * 10) / 10,
        grade,
        score
      },
      timestamp: new Date().toISOString()
    };
  }

  /**
   * セッション完了時の統計計算
   */
  static calculateSessionSummary(detectionResults) {
    console.log('📊 セッション統計計算開始:', {
      totalResults: detectionResults.length,
      sampleResult: detectionResults[0]
    });
    
    const validResults = detectionResults.filter(result => result !== null);
    
    if (validResults.length === 0) {
      console.error('❌ 有効な検出結果が0件のため統計計算失敗');
      return null;
    }

    const totalScore = validResults.reduce((sum, result) => sum + result.evaluation.score, 0) / validResults.length;
    const totalCentError = validResults.reduce((sum, result) => sum + Math.abs(result.evaluation.centError), 0) / validResults.length;
    
    const gradeCounts = {
      excellentCount: 0,
      goodCount: 0,
      passCount: 0,
      practiceCount: 0
    };
    
    validResults.forEach(result => {
      switch (result.evaluation.grade) {
        case 'Excellent': gradeCounts.excellentCount++; break;
        case 'Good': gradeCounts.goodCount++; break;
        case 'Pass': gradeCounts.passCount++; break;
        case 'Practice': gradeCounts.practiceCount++; break;
      }
    });

    const successRate = (gradeCounts.excellentCount + gradeCounts.goodCount + gradeCounts.passCount) / validResults.length;
    const stabilityFactor = this.calculateStabilityFactor(validResults);

    return {
      totalScore: Math.round(totalScore * 10) / 10,
      averageCentError: Math.round(totalCentError * 10) / 10,
      ...gradeCounts,
      successRate: Math.round(successRate * 100) / 100,
      stabilityFactor: Math.round(stabilityFactor * 100) / 100
    };
  }

  /**
   * 安定性係数を計算
   */
  static calculateStabilityFactor(results) {
    if (results.length < 2) return 1.0;
    
    const errors = results.map(r => Math.abs(r.evaluation.centError));
    const mean = errors.reduce((sum, error) => sum + error, 0) / errors.length;
    const variance = errors.reduce((sum, error) => sum + Math.pow(error - mean, 2), 0) / errors.length;
    const stdDev = Math.sqrt(variance);
    
    // 標準偏差が小さいほど安定性が高い（最大1.0）
    return Math.max(0.5, Math.min(1.0, 1.0 - (stdDev / 50)));
  }

  // === ヘルパー関数 ===

  /**
   * UUID v4生成
   */
  static generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  /**
   * localStorageへ保存
   */
  static saveToStorage(key, data) {
    try {
      localStorage.setItem(key, JSON.stringify(data));
      return true;
    } catch (error) {
      console.error(`localStorage保存エラー [${key}]:`, error);
      return false;
    }
  }

  /**
   * localStorageから取得
   */
  static getFromStorage(key) {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error(`localStorage取得エラー [${key}]:`, error);
      return null;
    }
  }

  /**
   * 全データをクリア（デバッグ用）
   */
  static clearAllData() {
    Object.values(this.KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
  }

  /**
   * データ整合性チェック
   */
  static validateDataIntegrity() {
    const issues = [];
    
    // ユーザー設定チェック
    const userSettings = this.getFromStorage(this.KEYS.USER_SETTINGS);
    if (!userSettings || userSettings.version !== this.VERSION) {
      issues.push('ユーザー設定バージョン不一致');
    }
    
    // 音域データチェック
    const voiceRange = this.getVoiceRangeData();
    if (!voiceRange) {
      issues.push('音域データ無効または期限切れ');
    }
    
    return {
      isValid: issues.length === 0,
      issues,
      checkedAt: new Date().toISOString()
    };
  }

  /**
   * データ使用量を取得
   */
  static getStorageUsage() {
    let totalSize = 0;
    const details = {};

    Object.values(this.KEYS).forEach(key => {
      const data = localStorage.getItem(key);
      const size = data ? new Blob([data]).size : 0;
      details[key] = size;
      totalSize += size;
    });

    return {
      totalSize,
      totalMB: Math.round(totalSize / 1024 / 1024 * 100) / 100,
      details,
      limit: 5 * 1024 * 1024, // 5MB目安
      usage: Math.round(totalSize / (5 * 1024 * 1024) * 100)
    };
  }

  // === データエクスポート/インポート機能 ===

  /**
   * 全データをエクスポート（JSON形式）
   * @returns {Object} エクスポートデータ
   */
  static exportAllData() {
    const exportData = {
      version: this.VERSION,
      exportDate: new Date().toISOString(),
      appVersion: '1.0.0',
      data: {}
    };

    // 全てのlocalStorageデータを収集
    Object.entries(this.KEYS).forEach(([keyName, storageKey]) => {
      const data = this.getFromStorage(storageKey);
      if (data) {
        exportData.data[keyName] = data;
      }
    });

    return exportData;
  }

  /**
   * データをJSONファイルとしてダウンロード
   */
  static downloadExportData() {
    try {
      const exportData = this.exportAllData();
      const jsonString = JSON.stringify(exportData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      // ダウンロードリンク生成
      const a = document.createElement('a');
      a.href = url;
      a.download = `pitchpro-data-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      console.log('✅ データエクスポート成功');
      return true;
    } catch (error) {
      console.error('❌ データエクスポート失敗:', error);
      return false;
    }
  }

  /**
   * JSONファイルからデータをインポート
   * @param {File} file - インポート対象のJSONファイル
   * @returns {Promise<Object>} インポート結果
   */
  static async importDataFromFile(file) {
    try {
      // ファイル読み込み
      const text = await file.text();
      const importData = JSON.parse(text);

      // バージョンチェック
      if (!importData.version) {
        throw new Error('無効なデータ形式です');
      }

      // データ復元
      const result = this.importData(importData);
      console.log('✅ データインポート成功');
      return result;
    } catch (error) {
      console.error('❌ データインポート失敗:', error);
      throw error;
    }
  }

  /**
   * データオブジェクトからインポート
   * @param {Object} importData - インポートデータ
   * @returns {Object} インポート結果
   */
  static importData(importData) {
    const result = {
      success: true,
      imported: [],
      skipped: [],
      errors: []
    };

    if (!importData.data) {
      throw new Error('データが見つかりません');
    }

    // 各データをlocalStorageに保存
    Object.entries(importData.data).forEach(([keyName, data]) => {
      try {
        const storageKey = this.KEYS[keyName];
        if (storageKey) {
          this.saveToStorage(storageKey, data);
          result.imported.push(keyName);
        } else {
          result.skipped.push(keyName);
        }
      } catch (error) {
        result.errors.push({ key: keyName, error: error.message });
      }
    });

    result.success = result.errors.length === 0;
    return result;
  }

  /**
   * トレーニング記録のみ削除
   */
  static resetTrainingData() {
    try {
      // 現在のトレーニングデータを削除
      localStorage.removeItem(this.KEYS.SESSION_DATA);
      localStorage.removeItem(this.KEYS.OVERALL_EVALUATION);
      localStorage.removeItem(this.KEYS.WEAKNESS_ANALYSIS);
      
      // 廃止されたトレーニング関連キーも削除
      this.DEPRECATED_KEYS.forEach(key => {
        localStorage.removeItem(key);
      });
      
      console.log('✅ トレーニング記録削除完了');
      return true;
    } catch (error) {
      console.error('❌ トレーニング記録削除失敗:', error);
      return false;
    }
  }

  /**
   * 特定のレッスンを削除
   *
   * @param {string} lessonId - 削除するレッスンのID
   * @returns {Object} { success: boolean, deletedCount: number, message: string }
   */
  static deleteLesson(lessonId) {
    try {
      if (!lessonId) {
        return {
          success: false,
          deletedCount: 0,
          message: 'レッスンIDが指定されていません'
        };
      }

      let deletedCount = 0;

      // 1. セッションデータから該当レッスンを削除
      const sessions = this.getFromStorage(this.KEYS.SESSION_DATA) || [];
      const filteredSessions = sessions.filter(session => session.lessonId !== lessonId);
      const sessionDeletedCount = sessions.length - filteredSessions.length;

      if (sessionDeletedCount > 0) {
        this.saveToStorage(this.KEYS.SESSION_DATA, filteredSessions);
        deletedCount += sessionDeletedCount;
        console.log(`✅ セッションデータから${sessionDeletedCount}件削除`);
      }

      // 2. 総合評価データから該当レッスンを削除
      const evaluations = this.getFromStorage(this.KEYS.OVERALL_EVALUATION) || [];
      const filteredEvaluations = evaluations.filter(evaluation => evaluation.lessonId !== lessonId);
      const evalDeletedCount = evaluations.length - filteredEvaluations.length;

      if (evalDeletedCount > 0) {
        this.saveToStorage(this.KEYS.OVERALL_EVALUATION, filteredEvaluations);
        deletedCount += evalDeletedCount;
        console.log(`✅ 総合評価データから${evalDeletedCount}件削除`);
      }

      if (deletedCount === 0) {
        return {
          success: false,
          deletedCount: 0,
          message: '指定されたレッスンIDが見つかりませんでした'
        };
      }

      console.log(`✅ レッスン削除完了: lessonId=${lessonId}, 削除件数=${deletedCount}`);
      return {
        success: true,
        deletedCount: deletedCount,
        message: `レッスンを削除しました（${deletedCount}件のデータを削除）`
      };

    } catch (error) {
      console.error('❌ レッスン削除失敗:', error);
      return {
        success: false,
        deletedCount: 0,
        message: `削除に失敗しました: ${error.message}`
      };
    }
  }

  /**
   * 音域テスト結果のみ削除
   */
  static resetVoiceRangeData() {
    try {
      localStorage.removeItem(this.KEYS.VOICE_RANGE);
      console.log('✅ 音域テスト結果削除完了');
      return true;
    } catch (error) {
      console.error('❌ 音域テスト結果削除失敗:', error);
      return false;
    }
  }

  /**
   * 廃止されたキーを自動検出・削除
   * アプリ起動時やデータ操作時に自動実行される
   */
  static cleanupDeprecatedKeys() {
    let removedCount = 0;

    this.DEPRECATED_KEYS.forEach(key => {
      if (localStorage.getItem(key) !== null) {
        localStorage.removeItem(key);
        removedCount++;
        console.log(`🗑️ 廃止キー削除: ${key}`);
      }
    });

    if (removedCount > 0) {
      console.log(`✅ 廃止キークリーンアップ完了: ${removedCount}件削除`);
    }

    return removedCount;
  }

  /**
   * 全データリセット（完全削除）
   */
  static resetAllData() {
    try {
      // DataManager.KEYSに定義されているキーを削除
      Object.values(this.KEYS).forEach(key => {
        localStorage.removeItem(key);
      });

      // 廃止されたキーも削除
      this.DEPRECATED_KEYS.forEach(key => {
        localStorage.removeItem(key);
      });

      console.log('✅ 全データリセット完了');
      return true;
    } catch (error) {
      console.error('❌ 全データリセット失敗:', error);
      return false;
    }
  }
}

// グローバル公開
window.DataManager = DataManager;