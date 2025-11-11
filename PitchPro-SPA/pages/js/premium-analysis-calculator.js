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
     * 脳内処理パターン分析の計算（脳内ピアノ理論）
     * @param {Array} sessionData - セッションデータ配列
     * @returns {Object} 脳内処理パターン分析結果
     */
    calculateBrainProcessingPattern(sessionData) {
        if (!sessionData || sessionData.length === 0) {
            return null;
        }

        // 脳内処理グループ定義
        const LEFT_BRAIN_NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#'];
        const BOTH_BRAIN_NOTES = ['G', 'G#', 'A', 'A#', 'B'];

        // 音名正規化（B♭表記統一）
        const normalizeNoteName = (note) => {
            const noteMap = {
                'A#': 'B♭',
                'Bb': 'B♭'
            };
            return noteMap[note] || note;
        };

        // 左脳処理音データ
        const leftBrainErrors = [];
        const leftBrainNotes = {};

        // 両脳処理音データ
        const bothBrainErrors = [];
        const bothBrainNotes = {
            'G': [],
            'G#': [],
            'A': [],
            'B♭': [],
            'B': []
        };

        // セッションデータから音階別エラーを収集
        sessionData.forEach(session => {
            if (!session.steps || !Array.isArray(session.steps)) return;

            session.steps.forEach(step => {
                if (step.pitchError === undefined || step.pitchError === null) return;
                if (!step.note) return;

                const absError = Math.abs(step.pitchError);
                const baseNote = step.note.replace(/[0-9]/g, ''); // オクターブ番号削除

                // 左脳処理音
                if (LEFT_BRAIN_NOTES.includes(baseNote)) {
                    leftBrainErrors.push(absError);
                    if (!leftBrainNotes[baseNote]) {
                        leftBrainNotes[baseNote] = [];
                    }
                    leftBrainNotes[baseNote].push(absError);
                }
                // 両脳処理音
                else if (BOTH_BRAIN_NOTES.includes(baseNote)) {
                    bothBrainErrors.push(absError);
                    const normalizedNote = normalizeNoteName(baseNote);
                    if (bothBrainNotes[normalizedNote]) {
                        bothBrainNotes[normalizedNote].push(absError);
                    }
                }
            });
        });

        // 平均計算ヘルパー
        const calcAverage = (errors) => {
            if (errors.length === 0) return 0;
            return errors.reduce((sum, e) => sum + e, 0) / errors.length;
        };

        // 左脳処理音の統計
        const leftBrainAvg = calcAverage(leftBrainErrors);
        const leftBrainCount = leftBrainErrors.length;

        // 両脳処理音の統計
        const bothBrainAvg = calcAverage(bothBrainErrors);
        const bothBrainCount = bothBrainErrors.length;

        // 各音の平均計算
        const bothBrainNoteStats = {};
        Object.keys(bothBrainNotes).forEach(note => {
            const errors = bothBrainNotes[note];
            bothBrainNoteStats[note] = {
                avgError: calcAverage(errors),
                count: errors.length
            };
        });

        // 処理難易度の差
        const difficulty = bothBrainAvg - leftBrainAvg;
        const difficultyPercentage = leftBrainAvg > 0
            ? ((difficulty / leftBrainAvg) * 100)
            : 0;

        return {
            leftBrain: {
                avgError: parseFloat(leftBrainAvg.toFixed(1)),
                count: leftBrainCount,
                notes: LEFT_BRAIN_NOTES
            },
            bothBrain: {
                avgError: parseFloat(bothBrainAvg.toFixed(1)),
                count: bothBrainCount,
                notes: ['G', 'G#', 'A', 'B♭', 'B'],
                noteStats: bothBrainNoteStats
            },
            difficulty: {
                difference: parseFloat(difficulty.toFixed(1)),
                percentage: parseFloat(difficultyPercentage.toFixed(1)),
                isHarder: difficulty > 0,
                analysis: difficulty > 5
                    ? '両脳処理音は左脳処理音より明確に難しい傾向があります。脳内ピアノ理論により予測される傾向と一致しています。'
                    : difficulty > 0
                    ? '両脳処理音はやや難しい傾向が見られます。'
                    : '両グループ間で明確な差は見られません。'
            }
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
    },

    /**
     * モード別分析の計算
     * @param {Array} sessionData - セッションデータ配列
     * @returns {Object} モード別分析結果
     */
    calculateModeAnalysis(sessionData) {
        if (!sessionData || sessionData.length === 0) {
            return null;
        }

        // モード定義
        const MODE_DEFINITIONS = {
            'random': { name: 'ランダム基音', displayName: 'ランダム基音（標準）', color: 'blue', icon: 'shuffle', parentMode: 'random', direction: null },
            'random-ascending': { name: 'ランダム基音', displayName: 'ランダム基音（上行）', color: 'blue', icon: 'arrow-up', parentMode: 'random', direction: 'ascending' },
            'random-descending': { name: 'ランダム基音', displayName: 'ランダム基音（下行）', color: 'blue', icon: 'arrow-down', parentMode: 'random', direction: 'descending' },
            'continuous': { name: '連続チャレンジ', displayName: '連続チャレンジ（標準）', color: 'green', icon: 'zap', parentMode: 'continuous', direction: null },
            'continuous-ascending': { name: '連続チャレンジ', displayName: '連続チャレンジ（上行）', color: 'green', icon: 'arrow-up', parentMode: 'continuous', direction: 'ascending' },
            'continuous-descending': { name: '連続チャレンジ', displayName: '連続チャレンジ（下行）', color: 'green', icon: 'arrow-down', parentMode: 'continuous', direction: 'descending' },
            'twelve-ascending': { name: '12音階', displayName: '12音階（上昇）', color: 'purple', icon: 'trending-up', parentMode: 'twelve', direction: 'ascending' },
            'twelve-descending': { name: '12音階', displayName: '12音階（下降）', color: 'purple', icon: 'trending-down', parentMode: 'twelve', direction: 'descending' },
            'twelve-both': { name: '12音階', displayName: '12音階（両方向）', color: 'purple', icon: 'repeat', parentMode: 'twelve', direction: 'both' }
        };

        const PARENT_MODES = {
            'random': { name: 'ランダム基音', color: 'blue', icon: 'shuffle', variants: ['random', 'random-ascending', 'random-descending'] },
            'continuous': { name: '連続チャレンジ', color: 'green', icon: 'zap', variants: ['continuous', 'continuous-ascending', 'continuous-descending'] },
            'twelve': { name: '12音階', color: 'purple', icon: 'music', variants: ['twelve-ascending', 'twelve-descending', 'twelve-both'] }
        };

        // モードキーの正規化
        const normalizeMode = (session) => {
            const mode = session.mode || 'random';
            const direction = session.direction || null;

            if (mode === 'twelve' || mode === '12tone') {
                const dir = direction || 'ascending';
                return `twelve-${dir}`;
            }

            if (direction && direction !== 'both') {
                return `${mode}-${direction}`;
            }

            return mode;
        };

        // モード別にセッションを分類
        const modeGroups = {};
        sessionData.forEach(session => {
            const modeKey = normalizeMode(session);
            if (!modeGroups[modeKey]) {
                modeGroups[modeKey] = [];
            }
            modeGroups[modeKey].push(session);
        });

        // 各モードの統計計算
        const modeStats = {};
        Object.keys(modeGroups).forEach(modeKey => {
            const sessions = modeGroups[modeKey];
            if (sessions.length === 0) return;

            const modeInfo = MODE_DEFINITIONS[modeKey];
            if (!modeInfo) return;

            const avgError = this._calculateAverageError(sessions);
            const successRate = this._calculateSuccessRate(sessions);

            modeStats[modeKey] = {
                modeKey: modeKey,
                name: modeInfo.name,
                displayName: modeInfo.displayName,
                color: modeInfo.color,
                icon: modeInfo.icon,
                parentMode: modeInfo.parentMode,
                direction: modeInfo.direction,
                totalSessions: sessions.length,
                level: this._calculateMasteryLevel(modeKey, sessions),
                masteryRate: this._calculateMasteryRate(modeKey, sessions),
                avgErrorOld: this._calculatePeriodAverage(sessions, 90, 30),
                avgErrorRecent: this._calculatePeriodAverage(sessions, 30, 0),
                successRateOld: this._calculateSuccessRate(sessions, 90, 30),
                successRateRecent: this._calculateSuccessRate(sessions, 30, 0),
                bestError: this._findBestError(sessions),
                bestDate: this._findBestDate(sessions),
                intervalStats: this._calculateIntervalStatsForMode(sessions),
                characteristics: this._analyzeCharacteristics(modeKey, sessions, modeInfo),
                timeSeriesData: this._prepareTimeSeriesData(sessions, 30)
            };

            // 改善率計算
            if (modeStats[modeKey].avgErrorOld > 0 && modeStats[modeKey].avgErrorRecent > 0) {
                const improvement = modeStats[modeKey].avgErrorOld - modeStats[modeKey].avgErrorRecent;
                modeStats[modeKey].improvementPercent = Math.round((improvement / modeStats[modeKey].avgErrorOld) * 100);
                modeStats[modeKey].improvementAbsolute = Math.round(improvement * 10) / 10;
            } else {
                modeStats[modeKey].improvementPercent = 0;
                modeStats[modeKey].improvementAbsolute = 0;
            }

            modeStats[modeKey].successRateImprovement = Math.round((modeStats[modeKey].successRateRecent - modeStats[modeKey].successRateOld) * 100);
        });

        // 親モード別に統計を集約
        const parentModeStats = {};
        Object.keys(PARENT_MODES).forEach(parentKey => {
            const parentInfo = PARENT_MODES[parentKey];
            const variants = parentInfo.variants;

            const variantStats = {};
            let totalSessions = 0;
            let weightedLevel = 0;
            let weightedMasteryRate = 0;

            variants.forEach(variantKey => {
                if (modeStats[variantKey]) {
                    variantStats[variantKey] = modeStats[variantKey];
                    totalSessions += modeStats[variantKey].totalSessions;
                    weightedLevel += modeStats[variantKey].level * modeStats[variantKey].totalSessions;
                    weightedMasteryRate += modeStats[variantKey].masteryRate * modeStats[variantKey].totalSessions;
                }
            });

            if (totalSessions > 0) {
                parentModeStats[parentKey] = {
                    name: parentInfo.name,
                    color: parentInfo.color,
                    icon: parentInfo.icon,
                    totalSessions: totalSessions,
                    averageLevel: Math.round(weightedLevel / totalSessions * 10) / 10,
                    averageMasteryRate: Math.round(weightedMasteryRate / totalSessions),
                    variants: variantStats,
                    variantCount: Object.keys(variantStats).length
                };
            }
        });

        return {
            modeStats,
            parentModeStats
        };
    },

    // モード分析用ヘルパーメソッド
    _calculateAverageError(sessions) {
        const allErrors = [];
        sessions.forEach(session => {
            if (session.steps && Array.isArray(session.steps)) {
                session.steps.forEach(step => {
                    if (step.pitchError !== undefined && step.pitchError !== null) {
                        allErrors.push(Math.abs(step.pitchError));
                    }
                });
            }
        });
        return allErrors.length > 0 ? allErrors.reduce((sum, e) => sum + e, 0) / allErrors.length : 0;
    },

    _calculateSuccessRate(sessions, daysAgo = null, daysRecent = null) {
        let filteredSessions = sessions;

        if (daysAgo !== null && daysRecent !== null) {
            const now = Date.now();
            const startTime = now - (daysAgo * 24 * 60 * 60 * 1000);
            const endTime = now - (daysRecent * 24 * 60 * 60 * 1000);

            filteredSessions = sessions.filter(s => {
                const sessionTime = new Date(s.startTime || s.timestamp).getTime();
                return sessionTime >= endTime && sessionTime < startTime;
            });
        }

        if (filteredSessions.length === 0) return 0;

        let successCount = 0;
        let totalSteps = 0;

        filteredSessions.forEach(session => {
            if (session.steps && Array.isArray(session.steps)) {
                session.steps.forEach(step => {
                    totalSteps++;
                    if (step.grade && (step.grade === 'Excellent' || step.grade === 'Good')) {
                        successCount++;
                    }
                });
            }
        });

        return totalSteps > 0 ? successCount / totalSteps : 0;
    },

    _calculatePeriodAverage(sessions, daysAgo, daysRecent) {
        const now = Date.now();
        const startTime = now - (daysAgo * 24 * 60 * 60 * 1000);
        const endTime = now - (daysRecent * 24 * 60 * 60 * 1000);

        const periodSessions = sessions.filter(s => {
            const sessionTime = new Date(s.startTime || s.timestamp).getTime();
            return sessionTime >= endTime && sessionTime < startTime;
        });

        return this._calculateAverageError(periodSessions);
    },

    _calculateMasteryLevel(modeKey, sessions) {
        const totalSessions = sessions.length;
        const avgError = this._calculateAverageError(sessions);
        const successRate = this._calculateSuccessRate(sessions);

        // 基準値定義
        const thresholds = {
            'random': { sessions: [5, 15, 30, 50, 80, 120, 180, 250, 350, 500], avgError: [50, 40, 30, 25, 20, 15, 12, 10, 8, 6], successRate: [0.5, 0.6, 0.7, 0.75, 0.8, 0.85, 0.9, 0.92, 0.95, 0.97] },
            'random-ascending': { sessions: [3, 10, 20, 35, 55, 80, 120, 170, 230, 320], avgError: [55, 45, 35, 30, 25, 20, 16, 13, 10, 8], successRate: [0.45, 0.55, 0.65, 0.7, 0.75, 0.8, 0.85, 0.88, 0.92, 0.95] },
            'random-descending': { sessions: [3, 10, 20, 35, 55, 80, 120, 170, 230, 320], avgError: [60, 50, 40, 35, 30, 25, 20, 17, 13, 10], successRate: [0.4, 0.5, 0.6, 0.65, 0.7, 0.75, 0.8, 0.85, 0.9, 0.93] },
            'continuous': { sessions: [3, 10, 20, 35, 55, 80, 110, 150, 200, 300], avgError: [60, 50, 40, 35, 30, 25, 20, 17, 14, 12], successRate: [0.4, 0.5, 0.6, 0.65, 0.7, 0.75, 0.8, 0.85, 0.88, 0.9] },
            'continuous-ascending': { sessions: [2, 8, 15, 28, 45, 65, 90, 125, 170, 240], avgError: [65, 55, 45, 40, 35, 30, 25, 22, 18, 15], successRate: [0.35, 0.45, 0.55, 0.6, 0.65, 0.7, 0.75, 0.8, 0.85, 0.88] },
            'continuous-descending': { sessions: [2, 8, 15, 28, 45, 65, 90, 125, 170, 240], avgError: [70, 60, 50, 45, 40, 35, 30, 27, 22, 18], successRate: [0.3, 0.4, 0.5, 0.55, 0.6, 0.65, 0.7, 0.75, 0.8, 0.85] },
            'twelve-ascending': { sessions: [2, 8, 15, 25, 40, 60, 85, 115, 150, 200], avgError: [70, 60, 50, 45, 40, 35, 30, 27, 24, 20], successRate: [0.3, 0.4, 0.5, 0.55, 0.6, 0.65, 0.7, 0.75, 0.8, 0.85] },
            'twelve-descending': { sessions: [2, 8, 15, 25, 40, 60, 85, 115, 150, 200], avgError: [75, 65, 55, 50, 45, 40, 35, 32, 28, 25], successRate: [0.25, 0.35, 0.45, 0.5, 0.55, 0.6, 0.65, 0.7, 0.75, 0.8] },
            'twelve-both': { sessions: [1, 5, 10, 18, 30, 45, 65, 90, 120, 160], avgError: [80, 70, 60, 55, 50, 45, 40, 37, 33, 30], successRate: [0.2, 0.3, 0.4, 0.45, 0.5, 0.55, 0.6, 0.65, 0.7, 0.75] }
        };

        const threshold = thresholds[modeKey] || thresholds['random'];

        const sessionLevel = this._findLevel(totalSessions, threshold.sessions);
        const errorLevel = this._findLevel(avgError, threshold.avgError, true);
        const rateLevel = this._findLevel(successRate, threshold.successRate);

        return Math.floor((sessionLevel * 0.4 + errorLevel * 0.3 + rateLevel * 0.3) * 10) / 10;
    },

    _calculateMasteryRate(modeKey, sessions) {
        const level = this._calculateMasteryLevel(modeKey, sessions);
        return Math.min(Math.round(level * 10), 100);
    },

    _findLevel(value, thresholds, reverse = false) {
        if (reverse) {
            for (let i = thresholds.length - 1; i >= 0; i--) {
                if (value <= thresholds[i]) {
                    return i + 1;
                }
            }
            return 1;
        } else {
            for (let i = 0; i < thresholds.length; i++) {
                if (value <= thresholds[i]) {
                    return i + 1;
                }
            }
            return thresholds.length;
        }
    },

    _findBestError(sessions) {
        let bestError = Infinity;
        sessions.forEach(session => {
            if (session.steps && Array.isArray(session.steps)) {
                session.steps.forEach(step => {
                    if (step.pitchError !== undefined && step.pitchError !== null) {
                        const absError = Math.abs(step.pitchError);
                        if (absError < bestError) {
                            bestError = absError;
                        }
                    }
                });
            }
        });
        return bestError === Infinity ? 0 : Math.round(bestError * 10) / 10;
    },

    _findBestDate(sessions) {
        let bestError = Infinity;
        let bestDate = null;
        sessions.forEach(session => {
            const sessionError = this._calculateAverageError([session]);
            if (sessionError < bestError) {
                bestError = sessionError;
                bestDate = session.startTime || session.timestamp;
            }
        });
        return bestDate;
    },

    _calculateIntervalStatsForMode(sessions) {
        const intervalErrors = { 2: [], 3: [], 4: [], 5: [], 6: [], 7: [], 8: [] };

        sessions.forEach(session => {
            if (session.steps && Array.isArray(session.steps)) {
                session.steps.forEach(step => {
                    if (step.pitchError !== undefined && step.pitchError !== null && step.interval) {
                        const interval = step.interval;
                        if (interval >= 2 && interval <= 8) {
                            intervalErrors[interval].push(Math.abs(step.pitchError));
                        }
                    }
                });
            }
        });

        const stats = {};
        Object.keys(intervalErrors).forEach(interval => {
            const errors = intervalErrors[interval];
            if (errors.length > 0) {
                stats[interval] = {
                    average: Math.round((errors.reduce((sum, e) => sum + e, 0) / errors.length) * 10) / 10,
                    count: errors.length
                };
            }
        });

        return stats;
    },

    _analyzeCharacteristics(modeKey, sessions, modeInfo) {
        const characteristics = [];
        const direction = modeInfo.direction;

        if (direction === 'ascending') {
            characteristics.push('上行音程の練習');
        } else if (direction === 'descending') {
            characteristics.push('下行音程の練習');
        } else if (direction === 'both') {
            characteristics.push('上昇・下降の両方を練習中');
        } else {
            characteristics.push('標準的な音程練習');
        }

        return characteristics;
    },

    _prepareTimeSeriesData(sessions, days) {
        const now = Date.now();
        const startTime = now - (days * 24 * 60 * 60 * 1000);

        const recentSessions = sessions.filter(s => {
            const sessionTime = new Date(s.startTime || s.timestamp).getTime();
            return sessionTime >= startTime;
        });

        return recentSessions.map(session => ({
            date: session.startTime || session.timestamp,
            avgError: this._calculateAverageError([session])
        }));
    }
};

console.log('✅ PremiumAnalysisCalculator loaded (with Mode Analysis)');
