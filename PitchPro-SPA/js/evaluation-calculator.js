/**
 * セッション評価計算モジュール
 *
 * @version 2.1.0
 * @description DYNAMIC_GRADE_LOGIC_SPECIFICATION.md準拠の動的グレード計算システム
 * @features モード別評価・デバイス品質補正・12音律理論対応
 *
 * Changelog:
 *   v2.1.0 (2025-11-27) - 無音検出（null誤差）対応
 *     - errorInCents === null のデータを無効な測定として除外
 *     - invalidCount（無効測定数）をメトリクスに追加
 *     - 無音時にExcellent評価になるバグを修正
 *
 *   v2.0.0 (2025-11-27) - 評価計算の一元管理
 *     - OUTLIER_THRESHOLD定数を追加（800¢）
 *     - extractSessionMetrics()を追加（単一セッション用）
 *     - 各コントローラーの重複ロジックを統一
 */

class EvaluationCalculator {
  static VERSION = '2.1.0';

  /**
   * 外れ値閾値（警告用、除外なし）
   * 全コントローラーでこの定数を参照すること
   */
  static OUTLIER_THRESHOLD = 800;

  /**
   * 単一セッションのメトリクスを抽出
   * result-session-controller, results-overview-controller等で使用
   *
   * @param {Array} pitchErrors - 音程誤差配列 [{errorInCents: number|null}, ...]
   * @returns {Object} { avgError, outlierCount, outlierFiltered, errors, totalNotes, invalidCount }
   *
   * v2.1.0: errorInCents === null（無音等）のデータを除外して計算
   */
  static extractSessionMetrics(pitchErrors) {
    if (!pitchErrors || pitchErrors.length === 0) {
      return {
        avgError: null,
        outlierCount: 0,
        outlierFiltered: false,
        errors: [],
        totalNotes: 0,
        invalidCount: 0,
        allInvalid: true
      };
    }

    // v2.1.0: 有効なデータ（errorInCents !== null）のみ抽出
    const validErrors = pitchErrors.filter(e => e.errorInCents !== null);
    const invalidCount = pitchErrors.length - validErrors.length;

    if (invalidCount > 0) {
      console.warn(`⚠️ 無効な測定データ: ${invalidCount}件を評価から除外`);
    }

    // v2.2.0: 有効なデータがない場合はavgError: nullを返す
    // avgError: 0だと完璧な音程と判定されてしまうため
    if (validErrors.length === 0) {
      return {
        avgError: null,
        outlierCount: 0,
        outlierFiltered: false,
        errors: [],
        totalNotes: 0,
        invalidCount,
        allInvalid: true
      };
    }

    const errors = validErrors.map(e => Math.abs(e.errorInCents));
    const outlierCount = errors.filter(e => e > this.OUTLIER_THRESHOLD).length;
    const avgError = errors.reduce((sum, e) => sum + e, 0) / errors.length;

    return {
      avgError: Math.round(avgError * 10) / 10,
      outlierCount,
      outlierFiltered: outlierCount > 0,
      errors,
      totalNotes: validErrors.length,
      invalidCount,
      allInvalid: false
    };
  }

  /**
   * メイン関数: 動的グレード計算
   * @param {Array} sessionData - セッションデータ配列
   * @returns {Object} 評価結果オブジェクト
   */
  static calculateDynamicGrade(sessionData, totalSessionsInLesson = null) {
    console.log('📊 動的グレード計算開始:', sessionData);
    if (totalSessionsInLesson !== null) {
        console.log(`📋 [Override] totalSessionsInLesson指定: ${totalSessionsInLesson}`);
    }

    // 1. モード検出（totalSessionsInLessonが指定されている場合は優先使用）
    const modeInfo = this.detectMode(sessionData, totalSessionsInLesson);
    console.log('✅ モード検出:', modeInfo);

    // 2. デバイス品質検出
    const deviceInfo = this.detectDeviceQuality();
    console.log('✅ デバイス品質:', deviceInfo);

    // 3. 基本メトリクス計算（デバイス品質を渡す）
    const basicMetrics = this.calculateBasicMetrics(sessionData, deviceInfo);
    console.log('✅ 基本メトリクス:', basicMetrics);

    // 4. 技術制約調整
    const metricsWithAdjustment = this.applyTechnicalAdjustment(basicMetrics, deviceInfo);
    console.log('✅ 調整後メトリクス:', metricsWithAdjustment);

    // 5. モード別基準取得
    const thresholdInfo = this.getModeSpecificThresholds(modeInfo.actualSessions);
    console.log('✅ モード別基準:', thresholdInfo);

    // 6. グレード判定
    const gradeResult = this.determineGrade(metricsWithAdjustment.adjusted, thresholdInfo.thresholds);
    console.log('✅ グレード判定:', gradeResult);

    // 7. 結果統合
    return {
      grade: gradeResult.grade,
      modeInfo,
      deviceInfo,
      metrics: metricsWithAdjustment,
      thresholdInfo,
      gradeResult,
      displayInfo: {
        modeName: modeInfo.name,
        deviceQuality: deviceInfo.message,
        gradeDescription: this.getGradeDescription(gradeResult.grade),
        achievements: this.generateAchievementMessage(gradeResult, modeInfo)
      }
    };
  }

  /**
   * 1. モード検出ロジック
   */
  static detectMode(sessionData, totalSessionsInLesson = null) {
    // totalSessionsInLessonが指定されている場合は優先使用
    const sessionCount = totalSessionsInLesson !== null ? totalSessionsInLesson : sessionData.length;

    // ModeControllerからモード定義を取得
    const modeMap = {
      8: {
        mode: 'random',
        name: window.ModeController ? window.ModeController.getModeName('random') : 'ランダム基音モード',
        level: '初級',
        target: 'カラオケ・合唱レベル'
      },
      12: {
        mode: 'continuous',
        name: window.ModeController ? window.ModeController.getModeName('continuous') : '連続チャレンジモード',
        level: '中級',
        target: '実用的相対音感レベル'
      },
      '12tone': {
        mode: '12tone',
        name: window.ModeController ? window.ModeController.getModeName('12tone') : '12音階モード',
        level: '上級',
        target: 'プロフェッショナルレベル'
      }
    };

    // セッションデータからモード情報を取得して優先判定
    const firstSession = sessionData[0];
    if (firstSession && firstSession.mode === '12tone') {
      return { ...modeMap['12tone'], actualSessions: sessionCount };
    }

    // 最も近いモードを選択（フォールバック）
    if (sessionCount <= 8) return { ...modeMap[8], actualSessions: sessionCount };
    if (sessionCount <= 12) return { ...modeMap[12], actualSessions: sessionCount };
    return { ...modeMap['12tone'], actualSessions: sessionCount };
  }

  /**
   * 2. デバイス品質検出ロジック（v2.1.0簡素化版）
   * 【変更内容】高性能デバイスカテゴリ除外（PC専用で制約が厳しいため）
   * 【新基準】標準(factor 1.0, ±15¢) / 低性能(factor 1.2, ±20¢)
   * 【根拠】仕様書「デバイス測定誤差 ±10〜15¢」に準拠
   */
  static detectDeviceQuality() {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const sampleRate = audioContext.sampleRate;

      let quality, factor, accuracy, message;

      // 標準デバイス判定（44.1kHz以上 - ほぼ全てのデバイス）
      if (sampleRate >= 44100) {
        quality = 'standard';
        factor = 1.0;
        accuracy = '±15¢';
        message = '標準精度で測定中（約±15¢のデバイス誤差を含む）';
      }
      // 低性能デバイス判定（44.1kHz未満 - レアケース）
      else {
        quality = 'low';
        factor = 1.2;
        accuracy = '±20¢';
        message = '限定的精度での測定（約±20¢の誤差を含む可能性）。相対的な改善傾向に注目してください';
      }

      audioContext.close();
      return { quality, factor, accuracy, message, sampleRate };

    } catch (error) {
      console.warn('AudioContext detection failed:', error);
      return {
        quality: 'standard',
        factor: 1.0,
        accuracy: '±15¢',
        message: '標準精度で測定中',
        sampleRate: 'unknown'
      };
    }
  }

  /**
   * 3. 基本メトリクス計算ロジック
   * @param {Array} sessionData - セッションデータ配列
   * @param {Object} deviceInfo - デバイス品質情報
   *
   * v2.1.0: errorInCents === null（無音等）のデータを除外して計算
   */
  static calculateBasicMetrics(sessionData, deviceInfo = null) {
    let totalError = 0;
    let totalNotes = 0;
    let excellentNotes = 0;
    let errors = [];
    let invalidCount = 0;

    // 各セッションから音程データを分析
    sessionData.forEach(session => {
      if (!session.pitchErrors || !Array.isArray(session.pitchErrors)) {
        console.warn('⚠️ セッションに音程誤差データがありません:', session);
        return;
      }

      session.pitchErrors.forEach(note => {
        // v2.1.0: 無効なデータ（null）をスキップ
        if (note.errorInCents === null) {
          invalidCount++;
          return;
        }

        const absError = Math.abs(note.errorInCents);

        totalError += absError;
        totalNotes++;
        errors.push(absError);

        // 【修正】優秀音判定を±30¢以内に緩和（±20¢はプロレベルすぎる）
        if (absError <= 30) {
          excellentNotes++;
        }
      });
    });

    // 無効データがある場合は警告
    if (invalidCount > 0) {
      console.warn(`⚠️ 無効な測定データ: ${invalidCount}件を評価から除外（無音等）`);
    }

    // データがない場合のフォールバック
    if (totalNotes === 0) {
      console.warn('⚠️ 有効な音程データが存在しません。ダミーデータを使用します。');
      return {
        avgError: 50.0,
        excellenceRate: 0.5,
        stability: 15.0,
        totalNotes: 0,
        excellentNotes: 0,
        outlierFiltered: false,
        invalidCount
      };
    }

    // すべてのデータで平均誤差を計算（除外なし）
    const avgError = totalError / totalNotes;

    // 警告用フラグ（評価計算には影響しない）- 定数を使用
    const outlierCount = errors.filter(e => e > this.OUTLIER_THRESHOLD).length;
    const outlierFiltered = outlierCount > 0;

    if (outlierFiltered) {
      console.log(`⚠️ 警告: ${outlierCount}音が${this.OUTLIER_THRESHOLD}¢を超えています（全${errors.length}音）`);
    }

    // 優秀音割合計算
    const excellenceRate = excellentNotes / totalNotes;

    // 安定性計算（標準偏差）- 全データで計算
    const mean = errors.reduce((a, b) => a + b, 0) / errors.length;
    const variance = errors.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / errors.length;
    const stability = Math.sqrt(variance);

    return {
      avgError: Math.round(avgError * 10) / 10,
      excellenceRate: Math.round(excellenceRate * 1000) / 1000,
      stability: Math.round(stability * 10) / 10,
      totalNotes,
      excellentNotes,
      outlierFiltered,
      outlierCount,
      outlierThreshold: this.OUTLIER_THRESHOLD, // 定数を参照
      invalidCount
    };
  }

  /**
   * デバイス品質に応じた誤差マージンを取得
   */
  static getDeviceErrorMargin(quality) {
    const margins = {
      high: 10,   // ±10¢
      medium: 15, // ±15¢
      low: 25     // ±25¢
    };
    return margins[quality] || 10;
  }

  /**
   * 4. 技術制約調整ロジック（v2.1.0更新）
   * 【変更内容】標準デバイス(factor 1.0)で調整なし、低性能のみ1.2倍緩和
   * 【効果】ほとんどのユーザーが公平な評価を受けられる
   */
  static applyTechnicalAdjustment(basicMetrics, deviceInfo) {
    const adjustedMetrics = {
      avgError: basicMetrics.avgError / deviceInfo.factor,
      excellenceRate: basicMetrics.excellenceRate,
      stability: basicMetrics.stability / deviceInfo.factor,
      totalNotes: basicMetrics.totalNotes,
      excellentNotes: basicMetrics.excellentNotes
    };

    return {
      raw: basicMetrics,
      adjusted: adjustedMetrics,
      adjustmentInfo: {
        factor: deviceInfo.factor,
        quality: deviceInfo.quality,
        explanation: deviceInfo.factor === 1.0
          ? '標準精度で測定（デバイス誤差 ±15¢を含む）'
          : `${deviceInfo.quality}デバイスのため、${deviceInfo.factor}倍の調整を適用`
      }
    };
  }

  /**
   * 5. モード別基準定義
   * 【修正】優秀音基準を±30¢に変更したため、全体的に基準を緩和
   * 【修正】外れ値除外により平均誤差が改善されるため、基準を適正化
   */
  static getModeSpecificThresholds(actualSessions) {
    let sessionCount;
    if (actualSessions <= 8) sessionCount = 8;
    else if (actualSessions <= 12) sessionCount = 12;
    else sessionCount = 24;

    const thresholds = {
      8: {  // ランダム基音（初級）- 技術制約考慮の寛容基準
        S: { avgError: 25, excellence: 0.70 },  // 修正前: 30, 0.75
        A: { avgError: 35, excellence: 0.60 },  // 修正前: 40, 0.65
        B: { avgError: 45, excellence: 0.50 },  // 修正前: 50, 0.55
        C: { avgError: 55, excellence: 0.40 },  // 修正前: 60, 0.45
        D: { avgError: 65, excellence: 0.30 },  // 修正前: 70, 0.35
        E: { avgError: 80, excellence: 0.20 }   // 修正前: 80, 0.25
      },
      12: { // 連続チャレンジ（中級）- 標準基準
        S: { avgError: 20, excellence: 0.75 },  // 修正前: 25, 0.80
        A: { avgError: 30, excellence: 0.65 },  // 修正前: 35, 0.70
        B: { avgError: 40, excellence: 0.55 },  // 修正前: 45, 0.60
        C: { avgError: 50, excellence: 0.45 },  // 修正前: 55, 0.50
        D: { avgError: 60, excellence: 0.35 },  // 修正前: 65, 0.40
        E: { avgError: 75, excellence: 0.25 }   // 修正前: 75, 0.30
      },
      24: { // 12音階（上級）- より厳格基準
        S: { avgError: 15, excellence: 0.80 },  // 修正前: 20, 0.85
        A: { avgError: 25, excellence: 0.70 },  // 修正前: 30, 0.75
        B: { avgError: 35, excellence: 0.60 },  // 修正前: 40, 0.65
        C: { avgError: 45, excellence: 0.50 },  // 修正前: 50, 0.55
        D: { avgError: 55, excellence: 0.40 },  // 修正前: 60, 0.45
        E: { avgError: 70, excellence: 0.30 }   // 修正前: 70, 0.35
      }
    };

    return {
      thresholds: thresholds[sessionCount],
      sessionCount,
      explanation: `${sessionCount}セッション${sessionCount === 8 ? '（初級）' : sessionCount === 12 ? '（中級）' : '（上級）'}基準適用`
    };
  }

  /**
   * 6. グレード判定ロジック
   */
  static determineGrade(adjustedMetrics, thresholds) {
    const grades = ['S', 'A', 'B', 'C', 'D', 'E'];

    for (const grade of grades) {
      const threshold = thresholds[grade];

      // 両条件を満たす必要がある
      if (adjustedMetrics.avgError <= threshold.avgError &&
          adjustedMetrics.excellenceRate >= threshold.excellence) {
        return {
          grade,
          achievedBy: {
            avgError: true,
            excellence: true
          },
          thresholds: threshold
        };
      }
    }

    // すべての基準を満たさない場合（個別達成状況を判定）
    return {
      grade: 'E',
      achievedBy: {
        avgError: adjustedMetrics.avgError <= thresholds.E.avgError,
        excellence: adjustedMetrics.excellenceRate >= thresholds.E.excellence
      },
      thresholds: thresholds.E
    };
  }

  /**
   * グレード説明の生成
   */
  static getGradeDescription(grade) {
    const descriptions = {
      'S': { message: 'プロレベル！レコーディング品質の精度です', icon: 'crown', color: 'gold' },
      'A': { message: '素晴らしい！楽器アンサンブルに対応できます', icon: 'award', color: 'silver' },
      'B': { message: '実用レベル！合唱や弾き語りに最適です', icon: 'star', color: 'orange' },
      'C': { message: '基礎習得！カラオケや趣味演奏を楽しめます', icon: 'smile', color: 'green' },
      'D': { message: '練習中！基礎をしっかり身につけましょう', icon: 'meh', color: 'blue' },
      'E': { message: '基礎から！一歩ずつ確実に向上していきます', icon: 'frown', color: 'red' }
    };

    return descriptions[grade] || descriptions['E'];
  }

  /**
   * 達成メッセージの生成
   */
  static generateAchievementMessage(gradeResult, modeInfo) {
    const level = modeInfo.level;
    const grade = gradeResult.grade;

    return `${level}レベルで${grade}級達成！${modeInfo.target}に向けて順調に成長中です。`;
  }

  /**
   * 個別音程評価（v2.0.0: 科学的バランス型評価基準）
   * @param {number} absError - 絶対誤差（セント）
   * @returns {Object} { level: 'excellent'|'good'|'pass'|'practice', icon, color, cssClass }
   */
  static evaluatePitchError(absError) {
    // v2.2.0: 無効な入力（null, undefined, NaN）は「無効」評価を返す
    if (absError === null || absError === undefined || isNaN(absError)) {
      return {
        level: 'invalid',
        icon: 'mic-off',
        color: 'text-gray-400',
        cssClass: 'color-eval-invalid',
        message: '音声が検出されませんでした'
      };
    }

    if (absError <= 20) {
      return {
        level: 'excellent',
        icon: 'trophy',
        color: 'text-yellow-300',
        cssClass: 'color-eval-gold',
        message: '素晴らしい精度！'
      };
    } else if (absError <= 35) {
      return {
        level: 'good',
        icon: 'star',
        color: 'text-green-300',
        cssClass: 'color-eval-good',
        message: '良好な精度！'
      };
    } else if (absError <= 50) {
      return {
        level: 'pass',
        icon: 'thumbs-up',
        color: 'text-blue-300',
        cssClass: 'color-eval-pass',
        message: '合格ライン達成！'
      };
    } else {
      return {
        level: 'practice',
        icon: 'alert-triangle',
        color: 'text-red-300',
        cssClass: 'color-eval-practice',
        message: '練習を続けましょう！'
      };
    }
  }

  /**
   * 平均誤差評価（セッションバッジ用）
   * @param {number} avgError - 平均誤差（セント）
   * @returns {Object} { level, icon, color, cssClass, message }
   */
  static evaluateAverageError(avgError) {
    return this.evaluatePitchError(avgError);
  }

  /**
   * 評価分布の計算
   * @param {Array} pitchErrors - 音程誤差配列
   * @returns {Object} { excellent, good, pass, practice, invalid }
   *
   * v2.1.0: errorInCents === null のデータは invalid としてカウント
   */
  static calculateDistribution(pitchErrors) {
    const distribution = {
      excellent: 0,
      good: 0,
      pass: 0,
      practice: 0,
      invalid: 0
    };

    pitchErrors.forEach(error => {
      // v2.1.0: 無効なデータは invalid としてカウント
      if (error.errorInCents === null) {
        distribution.invalid++;
        return;
      }
      const absError = Math.abs(error.errorInCents);
      const evaluation = this.evaluatePitchError(absError);
      distribution[evaluation.level]++;
    });

    return distribution;
  }
}

// グローバル公開
window.EvaluationCalculator = EvaluationCalculator;
