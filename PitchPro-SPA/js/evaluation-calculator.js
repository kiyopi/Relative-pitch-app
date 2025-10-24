/**
 * セッション評価計算モジュール
 *
 * @version 1.0.0
 * @description DYNAMIC_GRADE_LOGIC_SPECIFICATION.md準拠の動的グレード計算システム
 * @features モード別評価・デバイス品質補正・12音律理論対応
 */

class EvaluationCalculator {
  static VERSION = '1.0.0';

  /**
   * メイン関数: 動的グレード計算
   * @param {Array} sessionData - セッションデータ配列
   * @returns {Object} 評価結果オブジェクト
   */
  static calculateDynamicGrade(sessionData) {
    console.log('📊 動的グレード計算開始:', sessionData);

    // 1. モード検出
    const modeInfo = this.detectMode(sessionData);
    console.log('✅ モード検出:', modeInfo);

    // 2. デバイス品質検出
    const deviceInfo = this.detectDeviceQuality();
    console.log('✅ デバイス品質:', deviceInfo);

    // 3. 基本メトリクス計算
    const basicMetrics = this.calculateBasicMetrics(sessionData);
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
  static detectMode(sessionData) {
    const sessionCount = sessionData.length;

    const modeMap = {
      8: {
        mode: 'random',
        name: 'ランダム基音モード',
        level: '初級',
        target: 'カラオケ・合唱レベル'
      },
      12: {
        mode: 'continuous',
        name: '連続チャレンジモード',
        level: '中級',
        target: '実用的相対音感レベル'
      },
      '12tone': {
        mode: '12tone',
        name: '12音階モード',
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
   * 2. デバイス品質検出ロジック
   */
  static detectDeviceQuality() {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const sampleRate = audioContext.sampleRate;
      const userAgent = navigator.userAgent.toLowerCase();
      const isMobile = /mobile|android|iphone|ipad/.test(userAgent);

      let quality, factor, accuracy, message;

      // 高性能デバイス判定
      if (sampleRate >= 48000 && !isMobile) {
        quality = 'high';
        factor = 1.0;
        accuracy = '±10¢';
        message = '高精度での測定が可能です';
      }
      // 一般的デバイス判定
      else if (sampleRate >= 44100) {
        quality = 'medium';
        factor = 1.15;
        accuracy = '±15¢';
        message = '一般的な精度で測定中（約±15¢の誤差を含む可能性）';
      }
      // 低性能デバイス判定
      else {
        quality = 'low';
        factor = 1.3;
        accuracy = '±25¢';
        message = '限定的精度での測定（約±25¢の誤差を含む可能性）。相対的な改善傾向に注目してください';
      }

      audioContext.close();
      return { quality, factor, accuracy, message, sampleRate };

    } catch (error) {
      console.warn('AudioContext detection failed:', error);
      return {
        quality: 'medium',
        factor: 1.15,
        accuracy: '±15¢',
        message: '標準精度で測定中',
        sampleRate: 'unknown'
      };
    }
  }

  /**
   * 3. 基本メトリクス計算ロジック
   */
  static calculateBasicMetrics(sessionData) {
    let totalError = 0;
    let totalNotes = 0;
    let excellentNotes = 0;
    let errors = [];

    // 各セッションから音程データを分析
    sessionData.forEach(session => {
      if (!session.pitchErrors || !Array.isArray(session.pitchErrors)) {
        console.warn('⚠️ セッションに音程誤差データがありません:', session);
        return;
      }

      session.pitchErrors.forEach(note => {
        const absError = Math.abs(note.errorInCents);

        totalError += absError;
        totalNotes++;
        errors.push(absError);

        // 優秀音判定（±20¢以内）
        if (absError <= 20) {
          excellentNotes++;
        }
      });
    });

    // データがない場合のフォールバック
    if (totalNotes === 0) {
      console.warn('⚠️ 音程データが存在しません。ダミーデータを使用します。');
      return {
        avgError: 50.0,
        excellenceRate: 0.5,
        stability: 15.0,
        totalNotes: 0,
        excellentNotes: 0
      };
    }

    // 平均誤差計算
    const avgError = totalError / totalNotes;

    // 優秀音割合計算
    const excellenceRate = excellentNotes / totalNotes;

    // 安定性計算（標準偏差）
    const mean = errors.reduce((a, b) => a + b, 0) / errors.length;
    const variance = errors.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / errors.length;
    const stability = Math.sqrt(variance);

    return {
      avgError: Math.round(avgError * 10) / 10,
      excellenceRate: Math.round(excellenceRate * 1000) / 1000,
      stability: Math.round(stability * 10) / 10,
      totalNotes,
      excellentNotes
    };
  }

  /**
   * 4. 技術制約調整ロジック
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
        explanation: `${deviceInfo.quality}デバイスのため、${deviceInfo.factor}倍の調整を適用`
      }
    };
  }

  /**
   * 5. モード別基準定義
   */
  static getModeSpecificThresholds(actualSessions) {
    let sessionCount;
    if (actualSessions <= 8) sessionCount = 8;
    else if (actualSessions <= 12) sessionCount = 12;
    else sessionCount = 24;

    const thresholds = {
      8: {  // ランダム基音（初級）- 技術制約考慮の寛容基準
        S: { avgError: 30, excellence: 0.75 },
        A: { avgError: 40, excellence: 0.65 },
        B: { avgError: 50, excellence: 0.55 },
        C: { avgError: 60, excellence: 0.45 },
        D: { avgError: 70, excellence: 0.35 },
        E: { avgError: 80, excellence: 0.25 }
      },
      12: { // 連続チャレンジ（中級）- 標準基準
        S: { avgError: 25, excellence: 0.80 },
        A: { avgError: 35, excellence: 0.70 },
        B: { avgError: 45, excellence: 0.60 },
        C: { avgError: 55, excellence: 0.50 },
        D: { avgError: 65, excellence: 0.40 },
        E: { avgError: 75, excellence: 0.30 }
      },
      24: { // 12音階（上級）- より厳格基準
        S: { avgError: 20, excellence: 0.85 },
        A: { avgError: 30, excellence: 0.75 },
        B: { avgError: 40, excellence: 0.65 },
        C: { avgError: 50, excellence: 0.55 },
        D: { avgError: 60, excellence: 0.45 },
        E: { avgError: 70, excellence: 0.35 }
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

    // すべての基準を満たさない場合
    return {
      grade: 'E',
      achievedBy: {
        avgError: false,
        excellence: false
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
}

// グローバル公開
window.EvaluationCalculator = EvaluationCalculator;
