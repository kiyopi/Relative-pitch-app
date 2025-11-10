/**
 * premium-analysis-calculator.js
 * プレミアム分析計算ロジック
 * Version: 1.0.0
 *
 * 【責任範囲】
 * - Tab 1: 音程精度分析の計算
 * - Tab 2: エラーパターン分析の計算
 * - Tab 3: 練習プラン生成（ルールベース）
 * - Tab 4: 成長記録の計算
 *
 * 【依存関係】
 * - なし（純粋な計算ロジック）
 */

window.PremiumAnalysisCalculator = {
    /**
     * Tab 1: 音程精度分析の計算
     * @param {Array} sessionData - セッションデータ配列
     * @returns {Object} 音程精度分析結果
     */
    calculateIntervalAccuracy(sessionData) {
        if (!sessionData || sessionData.length === 0) {
            return null;
        }

        // 全ステップのピッチエラーを収集
        const allErrors = [];
        const intervalErrors = { 2: [], 3: [], 4: [], 5: [], 6: [], 7: [], 8: [] };

        sessionData.forEach(session => {
            if (!session.steps || !Array.isArray(session.steps)) return;

            session.steps.forEach(step => {
                if (step.pitchError !== undefined && step.pitchError !== null) {
                    const absError = Math.abs(step.pitchError);
                    allErrors.push(absError);

                    // 音程間隔別に分類
                    const interval = step.interval;
                    if (interval >= 2 && interval <= 8) {
                        intervalErrors[interval].push(absError);
                    }
                }
            });
        });

        // 平均音程精度
        const averageError = allErrors.length > 0
            ? allErrors.reduce((sum, e) => sum + e, 0) / allErrors.length
            : 0;

        // 音程間隔別精度
        const intervalAccuracy = {};
        Object.keys(intervalErrors).forEach(interval => {
            const errors = intervalErrors[interval];
            intervalAccuracy[interval] = errors.length > 0
                ? errors.reduce((sum, e) => sum + e, 0) / errors.length
                : 0;
        });

        // 上行・下行比較（Phase 4で実装予定のため、現在はnull）
        const ascendingDescending = null;

        return {
            averageError: Math.round(averageError * 10) / 10,
            intervalAccuracy,
            ascendingDescending,
            totalDataPoints: allErrors.length
        };
    },

    /**
     * Tab 2: エラーパターン分析の計算
     * @param {Array} sessionData - セッションデータ配列
     * @returns {Object} エラーパターン分析結果
     */
    calculateErrorPatterns(sessionData) {
        if (!sessionData || sessionData.length === 0) {
            return null;
        }

        // シャープ・フラット傾向
        let sharpCount = 0;
        let flatCount = 0;
        const intervalTendency = { 2: [], 3: [], 4: [], 5: [], 6: [], 7: [], 8: [] };

        sessionData.forEach(session => {
            if (!session.steps || !Array.isArray(session.steps)) return;

            session.steps.forEach(step => {
                if (step.pitchError !== undefined && step.pitchError !== null) {
                    const error = step.pitchError;

                    // シャープ・フラット集計
                    if (error > 0) {
                        sharpCount++;
                    } else if (error < 0) {
                        flatCount++;
                    }

                    // 音程間隔別傾向
                    const interval = step.interval;
                    if (interval >= 2 && interval <= 8) {
                        intervalTendency[interval].push(error);
                    }
                }
            });
        });

        // シャープ傾向の割合
        const totalCount = sharpCount + flatCount;
        const sharpPercentage = totalCount > 0
            ? Math.round((sharpCount / totalCount) * 100)
            : 50;

        // 音程拡大・縮小パターン
        const intervalExpansion = {};
        Object.keys(intervalTendency).forEach(interval => {
            const errors = intervalTendency[interval];
            if (errors.length > 0) {
                const avgError = errors.reduce((sum, e) => sum + e, 0) / errors.length;
                const semitones = Math.round((avgError / 100) * 10) / 10; // セント→半音
                intervalExpansion[interval] = {
                    semitones,
                    tendency: semitones > 0.1 ? '拡大' : semitones < -0.1 ? '縮小' : '正確'
                };
            }
        });

        return {
            sharpPercentage,
            flatPercentage: 100 - sharpPercentage,
            intervalExpansion
        };
    },

    /**
     * Tab 4: 成長記録の計算
     * @param {Array} sessionData - セッションデータ配列
     * @returns {Object} 成長記録分析結果
     */
    calculateGrowthRecords(sessionData) {
        if (!sessionData || sessionData.length === 0) {
            return null;
        }

        // タイムスタンプでソート
        const sortedSessions = [...sessionData].sort((a, b) => a.timestamp - b.timestamp);

        // 1ヶ月前の境界タイムスタンプ
        const now = Date.now();
        const oneMonthAgo = now - 30 * 24 * 60 * 60 * 1000;

        // 古いセッション（1ヶ月より前）と最近のセッション
        const oldSessions = sortedSessions.filter(s => s.timestamp < oneMonthAgo);
        const recentSessions = sortedSessions.filter(s => s.timestamp >= oneMonthAgo);

        // データが不足している場合は中央で分割
        let oldSessionsForCalc, recentSessionsForCalc;
        if (oldSessions.length === 0 || recentSessions.length === 0) {
            const midpoint = Math.floor(sortedSessions.length / 2);
            oldSessionsForCalc = sortedSessions.slice(0, midpoint);
            recentSessionsForCalc = sortedSessions.slice(midpoint);
        } else {
            oldSessionsForCalc = oldSessions;
            recentSessionsForCalc = recentSessions;
        }

        // 月間成長比較
        const oldAverage = this._calculateAverageError(oldSessionsForCalc);
        const recentAverage = this._calculateAverageError(recentSessionsForCalc);
        const monthlyGrowth = oldAverage - recentAverage;

        // 音程間隔別成長
        const intervalGrowth = {};
        for (let interval = 2; interval <= 8; interval++) {
            const oldErrors = this._getIntervalErrors(oldSessionsForCalc, interval);
            const recentErrors = this._getIntervalErrors(recentSessionsForCalc, interval);

            const oldAvg = oldErrors.length > 0
                ? oldErrors.reduce((sum, e) => sum + e, 0) / oldErrors.length
                : 0;
            const recentAvg = recentErrors.length > 0
                ? recentErrors.reduce((sum, e) => sum + e, 0) / recentErrors.length
                : 0;

            intervalGrowth[interval] = {
                oldAverage: Math.round(oldAvg * 10) / 10,
                recentAverage: Math.round(recentAvg * 10) / 10,
                improvement: Math.round((oldAvg - recentAvg) * 10) / 10
            };
        }

        // TOP3改善・停滞
        const sortedGrowth = Object.entries(intervalGrowth).sort((a, b) => b[1].improvement - a[1].improvement);
        const top3Improved = sortedGrowth.slice(0, 3).map(([interval, data]) => ({
            interval: parseInt(interval),
            ...data
        }));
        const top3Stagnant = sortedGrowth.slice(-3).reverse().map(([interval, data]) => ({
            interval: parseInt(interval),
            ...data
        }));

        // 時系列パフォーマンス分析
        const timeSeriesAnalysis = this._analyzeTimeSeries(sessionData);

        return {
            monthlyComparison: {
                oldAverage: Math.round(oldAverage * 10) / 10,
                recentAverage: Math.round(recentAverage * 10) / 10,
                improvement: Math.round(monthlyGrowth * 10) / 10
            },
            intervalGrowth,
            top3Improved,
            top3Stagnant,
            timeSeriesAnalysis
        };
    },

    /**
     * Tab 3: 練習プラン生成（ルールベース）
     * @param {Object} intervalAccuracy - Tab 1の音程精度結果
     * @param {Object} errorPatterns - Tab 2のエラーパターン結果
     * @param {Object} growthRecords - Tab 4の成長記録結果
     * @returns {Object} 練習プラン
     */
    generatePracticePlan(intervalAccuracy, errorPatterns, growthRecords) {
        if (!intervalAccuracy || !errorPatterns || !growthRecords) {
            return null;
        }

        const plan = [];

        // 優先度1: 精度が最も低い音程TOP2
        const sortedAccuracy = Object.entries(intervalAccuracy.intervalAccuracy)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 2);

        if (sortedAccuracy.length > 0) {
            const intervals = sortedAccuracy.map(([interval]) => interval + '度').join('・');
            plan.push({
                priority: 1,
                level: '緊急',
                title: `${intervals}の大きな音程強化`,
                description: 'ピアノ音源と比較しながら、ゆっくり正確に歌う練習を重点的に行いましょう。',
                exercises: [
                    'ピアノで基音を鳴らし、目標音程をゆっくり歌う',
                    'メトロノームで4拍かけて音程を移動する練習',
                    '半音階で音程感覚を確認'
                ]
            });
        }

        // 優先度2: シャープ・フラット傾向の修正
        const hasSharpTendency = errorPatterns.sharpPercentage > 60;
        const hasFlatTendency = errorPatterns.sharpPercentage < 40;

        if (hasSharpTendency) {
            plan.push({
                priority: 2,
                level: '重要',
                title: 'シャープ傾向の修正トレーニング',
                description: '音程を高めに歌う癖があります。意識的に低めを狙う練習をしましょう。',
                exercises: [
                    'チューナーアプリで視覚的に確認しながら練習',
                    '下行音程（高→低）を重点的に練習',
                    '基音を長く聴いてから歌い始める'
                ]
            });
        } else if (hasFlatTendency) {
            plan.push({
                priority: 2,
                level: '重要',
                title: 'フラット傾向の修正トレーニング',
                description: '音程を低めに歌う癖があります。意識的に高めを狙う練習をしましょう。',
                exercises: [
                    'チューナーアプリで視覚的に確認しながら練習',
                    '上行音程（低→高）を重点的に練習',
                    '音程を「届かせる」イメージで歌う'
                ]
            });
        }

        // 優先度3: 成長が停滞している音程
        const stagnantIntervals = growthRecords.top3Stagnant
            .filter(item => item.improvement < 5)
            .slice(0, 2);

        if (stagnantIntervals.length > 0) {
            const intervals = stagnantIntervals.map(item => item.interval + '度').join('・');
            plan.push({
                priority: 3,
                level: '推奨',
                title: `${intervals}の改善強化`,
                description: '成長が停滞しています。新しいアプローチで練習しましょう。',
                exercises: [
                    '異なる基音で同じ音程を練習',
                    '目を閉じて音程イメージを強化',
                    '録音して自己分析'
                ]
            });
        }

        return plan;
    },

    /**
     * ヘルパー: 平均エラー計算
     */
    _calculateAverageError(sessions) {
        const errors = [];
        sessions.forEach(session => {
            if (session.steps && Array.isArray(session.steps)) {
                session.steps.forEach(step => {
                    if (step.pitchError !== undefined && step.pitchError !== null) {
                        errors.push(Math.abs(step.pitchError));
                    }
                });
            }
        });
        return errors.length > 0 ? errors.reduce((sum, e) => sum + e, 0) / errors.length : 0;
    },

    /**
     * ヘルパー: 特定音程のエラー取得
     */
    _getIntervalErrors(sessions, interval) {
        const errors = [];
        sessions.forEach(session => {
            if (session.steps && Array.isArray(session.steps)) {
                session.steps.forEach(step => {
                    if (step.interval === interval && step.pitchError !== undefined && step.pitchError !== null) {
                        errors.push(Math.abs(step.pitchError));
                    }
                });
            }
        });
        return errors;
    },

    /**
     * ヘルパー: 時系列パフォーマンス分析
     */
    _analyzeTimeSeries(sessionData) {
        // セッション内の前半・後半比較
        const earlySteps = [];
        const lateSteps = [];

        sessionData.forEach(session => {
            if (session.steps && session.steps.length >= 8) {
                earlySteps.push(...session.steps.slice(0, 4));
                lateSteps.push(...session.steps.slice(4, 8));
            }
        });

        const earlyAvg = this._calculateAverageErrorFromSteps(earlySteps);
        const lateAvg = this._calculateAverageErrorFromSteps(lateSteps);
        const learningEffect = earlyAvg - lateAvg;

        // 疲労パターン（セッション内精度低下）
        const fatigueData = sessionData.map(session => {
            if (!session.steps || session.steps.length < 8) return 0;
            const firstHalf = session.steps.slice(0, 4);
            const secondHalf = session.steps.slice(4, 8);
            const firstAvg = this._calculateAverageErrorFromSteps(firstHalf);
            const secondAvg = this._calculateAverageErrorFromSteps(secondHalf);
            return secondAvg - firstAvg;
        });

        const avgFatigue = fatigueData.length > 0
            ? fatigueData.reduce((sum, f) => sum + f, 0) / fatigueData.length
            : 0;

        return {
            learningEffect: {
                earlyAverage: Math.round(earlyAvg * 10) / 10,
                lateAverage: Math.round(lateAvg * 10) / 10,
                improvement: Math.round(learningEffect * 10) / 10
            },
            fatiguePattern: {
                averageFatigue: Math.round(avgFatigue * 10) / 10,
                recommendation: avgFatigue > 3 ? '短時間集中型の練習が効果的です' : '現在の練習時間が適切です'
            }
        };
    },

    /**
     * ヘルパー: ステップ配列から平均エラー計算
     */
    _calculateAverageErrorFromSteps(steps) {
        const errors = steps
            .filter(step => step.pitchError !== undefined && step.pitchError !== null)
            .map(step => Math.abs(step.pitchError));
        return errors.length > 0 ? errors.reduce((sum, e) => sum + e, 0) / errors.length : 0;
    }
};

console.log('✅ PremiumAnalysisCalculator loaded');
