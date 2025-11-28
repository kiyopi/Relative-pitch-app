/**
 * premium-analysis-test-data-generator.js
 * 詳細分析ページ テストデータ生成スクリプト
 *
 * Version: 1.0.0
 * 作成日: 2025-11-27
 *
 * 使用方法:
 *   コンソールから実行:
 *   - TestDataGenerator.generateScenarioA()  // 成長ストーリー
 *   - TestDataGenerator.generateAll()        // 全シナリオ
 *   - TestDataGenerator.clearTestData()      // データクリア
 *   - TestDataGenerator.inspectData()        // データ確認
 */

(function() {
    'use strict';

    // ========================================
    // 定数定義
    // ========================================

    /**
     * 音名と周波数の対応表
     */
    const NOTE_FREQUENCIES = {
        'C2': 65.41,   'C#2': 69.30,  'D2': 73.42,   'D#2': 77.78,
        'E2': 82.41,   'F2': 87.31,   'F#2': 92.50,  'G2': 98.00,
        'G#2': 103.83, 'A2': 110.00,  'A#2': 116.54, 'B2': 123.47,

        'C3': 130.81,  'C#3': 138.59, 'D3': 146.83,  'D#3': 155.56,
        'E3': 164.81,  'F3': 174.61,  'F#3': 185.00, 'G3': 196.00,
        'G#3': 207.65, 'A3': 220.00,  'A#3': 233.08, 'B3': 246.94,

        'C4': 261.63,  'C#4': 277.18, 'D4': 293.66,  'D#4': 311.13,
        'E4': 329.63,  'F4': 349.23,  'F#4': 369.99, 'G4': 392.00,
        'G#4': 415.30, 'A4': 440.00,  'A#4': 466.16, 'B4': 493.88,

        'C5': 523.25,  'C#5': 554.37, 'D5': 587.33,  'D#5': 622.25,
        'E5': 659.25,  'F5': 698.46,  'F#5': 739.99, 'G5': 783.99
    };

    /**
     * 音名配列（半音順）
     */
    const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

    /**
     * 上行音程の半音数
     */
    const ASCENDING_SEMITONES = [0, 2, 4, 5, 7, 9, 11, 12];

    /**
     * 下行音程の半音数
     */
    const DESCENDING_SEMITONES = [0, -1, -3, -5, -7, -8, -10, -12];

    /**
     * 使用可能な基音リスト（音域テスト後に選ばれる範囲を想定）
     */
    const AVAILABLE_BASE_NOTES = [
        'C3', 'C#3', 'D3', 'D#3', 'E3', 'F3', 'F#3', 'G3', 'G#3', 'A3', 'A#3', 'B3',
        'C4', 'C#4', 'D4', 'D#4', 'E4', 'F4', 'F#4', 'G4'
    ];

    /**
     * モード設定
     */
    const MODE_CONFIGS = {
        'random-ascending': {
            mode: 'random',
            chromaticDirection: 'random',
            scaleDirection: 'ascending',
            sessionsPerLesson: 8
        },
        'random-descending': {
            mode: 'random',
            chromaticDirection: 'random',
            scaleDirection: 'descending',
            sessionsPerLesson: 8
        },
        'continuous-ascending': {
            mode: 'continuous',
            chromaticDirection: 'ascending',
            scaleDirection: 'ascending',
            sessionsPerLesson: 12
        },
        'continuous-descending': {
            mode: 'continuous',
            chromaticDirection: 'ascending',
            scaleDirection: 'descending',
            sessionsPerLesson: 12
        },
        '12tone-asc-ascending': {
            mode: '12tone',
            chromaticDirection: 'ascending',
            scaleDirection: 'ascending',
            sessionsPerLesson: 12
        },
        '12tone-asc-descending': {
            mode: '12tone',
            chromaticDirection: 'ascending',
            scaleDirection: 'descending',
            sessionsPerLesson: 12
        },
        '12tone-desc-ascending': {
            mode: '12tone',
            chromaticDirection: 'descending',
            scaleDirection: 'ascending',
            sessionsPerLesson: 12
        },
        '12tone-desc-descending': {
            mode: '12tone',
            chromaticDirection: 'descending',
            scaleDirection: 'descending',
            sessionsPerLesson: 12
        },
        '12tone-both-ascending': {
            mode: '12tone',
            chromaticDirection: 'both',
            scaleDirection: 'ascending',
            sessionsPerLesson: 24
        },
        '12tone-both-descending': {
            mode: '12tone',
            chromaticDirection: 'both',
            scaleDirection: 'descending',
            sessionsPerLesson: 24
        }
    };

    // ========================================
    // ヘルパー関数
    // ========================================

    /**
     * 半音数から音名を計算
     * @param {string} baseNote - 基音（例: "C4"）
     * @param {number} semitones - 半音数
     * @returns {string} 計算された音名
     */
    function calculateNoteFromSemitones(baseNote, semitones) {
        const baseName = baseNote.replace(/[0-9]/g, '');
        const baseOctave = parseInt(baseNote.match(/[0-9]/)[0]);
        const baseIndex = NOTE_NAMES.indexOf(baseName);

        let newIndex = baseIndex + semitones;
        let octaveOffset = Math.floor(newIndex / 12);
        newIndex = ((newIndex % 12) + 12) % 12;

        return NOTE_NAMES[newIndex] + (baseOctave + octaveOffset);
    }

    /**
     * 周波数を半音数から計算
     * @param {number} baseFreq - 基音周波数
     * @param {number} semitones - 半音数
     * @returns {number} 計算された周波数
     */
    function calculateFrequencyFromSemitones(baseFreq, semitones) {
        return baseFreq * Math.pow(2, semitones / 12);
    }

    /**
     * ランダムな基音を選択
     * @returns {object} { note, frequency }
     */
    function getRandomBaseNote() {
        const note = AVAILABLE_BASE_NOTES[Math.floor(Math.random() * AVAILABLE_BASE_NOTES.length)];
        return {
            note: note,
            frequency: NOTE_FREQUENCIES[note]
        };
    }

    /**
     * 正規分布に近いランダム値を生成
     * @param {number} mean - 平均
     * @param {number} stdDev - 標準偏差
     * @returns {number}
     */
    function gaussianRandom(mean, stdDev) {
        let u = 0, v = 0;
        while (u === 0) u = Math.random();
        while (v === 0) v = Math.random();
        const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
        return z * stdDev + mean;
    }

    /**
     * 範囲内に制限
     * @param {number} value
     * @param {number} min
     * @param {number} max
     * @returns {number}
     */
    function clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }

    /**
     * 日数前のタイムスタンプを取得
     * @param {number} daysAgo
     * @returns {number}
     */
    function getTimestampDaysAgo(daysAgo) {
        return Date.now() - daysAgo * 24 * 60 * 60 * 1000;
    }

    /**
     * ユニークなセッションIDを生成
     * @returns {number}
     */
    let sessionIdCounter = 1;
    function getNextSessionId() {
        // 既存データの最大IDを取得
        const existingData = JSON.parse(localStorage.getItem('sessionData') || '[]');
        if (existingData.length > 0 && sessionIdCounter === 1) {
            sessionIdCounter = Math.max(...existingData.map(s => s.sessionId)) + 1;
        }
        return sessionIdCounter++;
    }

    /**
     * レッスンIDを生成
     * @param {string} mode
     * @param {string} chromaticDirection
     * @param {string} scaleDirection
     * @param {number} timestamp
     * @returns {string}
     */
    function generateLessonId(mode, chromaticDirection, scaleDirection, timestamp) {
        return `lesson_${timestamp}_${mode}_${chromaticDirection}_${scaleDirection}`;
    }

    // ========================================
    // セッション生成関数
    // ========================================

    /**
     * pitchErrorsを生成
     * @param {string} baseNote - 基音
     * @param {number} baseFrequency - 基音周波数
     * @param {string} scaleDirection - 'ascending' | 'descending'
     * @param {object} errorConfig - 誤差設定 { stepErrors: [8], bias: number, variance: number }
     * @param {number} baseTimestamp - 基準タイムスタンプ
     * @returns {Array}
     */
    function generatePitchErrors(baseNote, baseFrequency, scaleDirection, errorConfig, baseTimestamp) {
        const semitones = scaleDirection === 'ascending' ? ASCENDING_SEMITONES : DESCENDING_SEMITONES;
        const pitchErrors = [];

        for (let step = 0; step < 8; step++) {
            const expectedNote = calculateNoteFromSemitones(baseNote, semitones[step]);
            const expectedFrequency = calculateFrequencyFromSemitones(baseFrequency, semitones[step]);

            // 誤差計算
            const stepError = errorConfig.stepErrors ? errorConfig.stepErrors[step] : errorConfig.baseError;
            const bias = errorConfig.bias || 0;
            const variance = errorConfig.variance || 10;

            // 誤差を生成（正規分布 + バイアス）
            let errorInCents = gaussianRandom(bias, variance);
            // ステップ固有の誤差を加味
            errorInCents += gaussianRandom(0, stepError * 0.3);
            // 絶対値が目標に近づくよう調整
            const targetAbsError = stepError;
            const currentAbsError = Math.abs(errorInCents);
            if (currentAbsError < targetAbsError * 0.5) {
                errorInCents = errorInCents > 0
                    ? targetAbsError * (0.5 + Math.random() * 0.5)
                    : -targetAbsError * (0.5 + Math.random() * 0.5);
            }

            // 検出周波数を誤差から計算
            const detectedFrequency = expectedFrequency * Math.pow(2, errorInCents / 1200);

            pitchErrors.push({
                step: step,
                expectedNote: expectedNote,
                expectedFrequency: Math.round(expectedFrequency * 100) / 100,
                detectedFrequency: Math.round(detectedFrequency * 100) / 100,
                errorInCents: Math.round(errorInCents * 10) / 10,
                clarity: clamp(0.7 + Math.random() * 0.25, 0.5, 0.95),
                volume: clamp(0.5 + Math.random() * 0.4, 0.3, 0.9),
                timestamp: baseTimestamp + step * 800 + Math.random() * 200
            });
        }

        return pitchErrors;
    }

    /**
     * 1セッションを生成
     * @param {object} config
     * @returns {object}
     */
    function generateSession(config) {
        const {
            modeKey,
            lessonId,
            sessionNumber,
            baseTimestamp,
            errorConfig
        } = config;

        const modeConfig = MODE_CONFIGS[modeKey];
        const baseNote = getRandomBaseNote();

        const startTime = baseTimestamp + sessionNumber * 10000; // 10秒間隔
        const duration = 6000 + Math.random() * 4000; // 6-10秒

        return {
            sessionId: getNextSessionId(),
            lessonId: lessonId,
            mode: modeConfig.mode,
            chromaticDirection: modeConfig.chromaticDirection,
            scaleDirection: modeConfig.scaleDirection,
            baseNote: baseNote.note,
            baseFrequency: baseNote.frequency,
            startTime: startTime,
            endTime: startTime + duration,
            timestamp: startTime,
            duration: Math.round(duration),
            completed: true,
            pitchErrors: generatePitchErrors(
                baseNote.note,
                baseNote.frequency,
                modeConfig.scaleDirection,
                errorConfig,
                startTime
            )
        };
    }

    /**
     * 1レッスン分のセッションを生成
     * @param {object} config
     * @returns {Array}
     */
    function generateLesson(config) {
        const {
            modeKey,
            baseTimestamp,
            errorConfig,
            sessionsCount // オプション：途中で終了する場合
        } = config;

        const modeConfig = MODE_CONFIGS[modeKey];
        const lessonId = generateLessonId(
            modeConfig.mode,
            modeConfig.chromaticDirection,
            modeConfig.scaleDirection,
            baseTimestamp
        );

        const numSessions = sessionsCount || modeConfig.sessionsPerLesson;
        const sessions = [];

        for (let i = 0; i < numSessions; i++) {
            sessions.push(generateSession({
                modeKey: modeKey,
                lessonId: lessonId,
                sessionNumber: i,
                baseTimestamp: baseTimestamp,
                errorConfig: errorConfig
            }));
        }

        return sessions;
    }

    // ========================================
    // シナリオ生成関数
    // ========================================

    /**
     * シナリオA: 初心者→中級への成長ストーリー
     */
    function generateScenarioA() {
        console.log('📊 シナリオA: 初心者→中級への成長ストーリーを生成中...');
        const sessions = [];

        // 1ヶ月目（60-90日前）: 初心者、フラット傾向
        const month1Config = {
            stepErrors: [15, 55, 40, 35, 30, 45, 65, 25], // 2度と7度が苦手
            bias: -10, // フラット傾向
            variance: 15
        };

        for (let i = 0; i < 8; i++) {
            const daysAgo = 90 - i * 3;
            sessions.push(...generateLesson({
                modeKey: 'random-ascending',
                baseTimestamp: getTimestampDaysAgo(daysAgo),
                errorConfig: month1Config
            }));
        }

        // 1.5ヶ月目（45-60日前）: 改善開始
        const month15Config = {
            stepErrors: [12, 45, 32, 28, 25, 38, 55, 20],
            bias: -5,
            variance: 12
        };

        for (let i = 0; i < 4; i++) {
            const daysAgo = 60 - i * 3;
            sessions.push(...generateLesson({
                modeKey: 'random-ascending',
                baseTimestamp: getTimestampDaysAgo(daysAgo),
                errorConfig: month15Config
            }));
        }
        for (let i = 0; i < 4; i++) {
            const daysAgo = 55 - i * 3;
            sessions.push(...generateLesson({
                modeKey: 'random-descending',
                baseTimestamp: getTimestampDaysAgo(daysAgo),
                errorConfig: month15Config
            }));
        }

        // 2ヶ月目（30-45日前）: 連続チャレンジ開始
        const month2Config = {
            stepErrors: [10, 38, 25, 22, 20, 30, 45, 18],
            bias: -2,
            variance: 10
        };

        for (let i = 0; i < 3; i++) {
            const daysAgo = 45 - i * 4;
            sessions.push(...generateLesson({
                modeKey: 'random-ascending',
                baseTimestamp: getTimestampDaysAgo(daysAgo),
                errorConfig: month2Config
            }));
        }
        for (let i = 0; i < 3; i++) {
            const daysAgo = 40 - i * 4;
            sessions.push(...generateLesson({
                modeKey: 'continuous-ascending',
                baseTimestamp: getTimestampDaysAgo(daysAgo),
                errorConfig: month2Config
            }));
        }

        // 3ヶ月目（0-30日前）: 中級到達、全モード挑戦
        const month3Config = {
            stepErrors: [8, 30, 20, 18, 16, 24, 35, 15],
            bias: 0,
            variance: 8
        };

        for (let i = 0; i < 2; i++) {
            sessions.push(...generateLesson({
                modeKey: 'random-ascending',
                baseTimestamp: getTimestampDaysAgo(25 - i * 5),
                errorConfig: month3Config
            }));
            sessions.push(...generateLesson({
                modeKey: 'random-descending',
                baseTimestamp: getTimestampDaysAgo(23 - i * 5),
                errorConfig: month3Config
            }));
            sessions.push(...generateLesson({
                modeKey: 'continuous-ascending',
                baseTimestamp: getTimestampDaysAgo(20 - i * 5),
                errorConfig: month3Config
            }));
            sessions.push(...generateLesson({
                modeKey: 'continuous-descending',
                baseTimestamp: getTimestampDaysAgo(18 - i * 5),
                errorConfig: month3Config
            }));
        }

        // 12音階モードに挑戦（直近）- 6種類すべて
        const advancedConfig = {
            stepErrors: [10, 32, 22, 20, 18, 26, 38, 16],
            bias: 2,
            variance: 10
        };

        // 上昇（基音進行）・上行（音階方向）
        sessions.push(...generateLesson({
            modeKey: '12tone-asc-ascending',
            baseTimestamp: getTimestampDaysAgo(12),
            errorConfig: advancedConfig
        }));
        // 上昇・下行
        sessions.push(...generateLesson({
            modeKey: '12tone-asc-descending',
            baseTimestamp: getTimestampDaysAgo(10),
            errorConfig: advancedConfig
        }));
        // 下降・上行
        sessions.push(...generateLesson({
            modeKey: '12tone-desc-ascending',
            baseTimestamp: getTimestampDaysAgo(8),
            errorConfig: advancedConfig
        }));
        // 下降・下行
        sessions.push(...generateLesson({
            modeKey: '12tone-desc-descending',
            baseTimestamp: getTimestampDaysAgo(6),
            errorConfig: advancedConfig
        }));
        // 両方向・上行
        sessions.push(...generateLesson({
            modeKey: '12tone-both-ascending',
            baseTimestamp: getTimestampDaysAgo(4),
            errorConfig: advancedConfig
        }));
        // 両方向・下行
        sessions.push(...generateLesson({
            modeKey: '12tone-both-descending',
            baseTimestamp: getTimestampDaysAgo(2),
            errorConfig: advancedConfig
        }));

        saveSessionData(sessions);
        console.log(`✅ シナリオA完了: ${sessions.length}セッション生成`);
        return sessions;
    }

    /**
     * シナリオB: 特定音程に弱点を持つユーザー
     */
    function generateScenarioB() {
        console.log('📊 シナリオB: 特定音程に弱点を持つユーザーを生成中...');
        const sessions = [];

        // 2度と7度が苦手、他は良好
        const errorConfig = {
            stepErrors: [10, 55, 18, 22, 15, 25, 60, 12],
            bias: 0,
            variance: 8
        };

        // 2度はシャープ傾向、7度はフラット傾向を個別に設定するため
        // カスタム生成
        for (let i = 0; i < 5; i++) {
            sessions.push(...generateLesson({
                modeKey: 'random-ascending',
                baseTimestamp: getTimestampDaysAgo(25 - i * 5),
                errorConfig: errorConfig
            }));
        }
        for (let i = 0; i < 5; i++) {
            sessions.push(...generateLesson({
                modeKey: 'random-descending',
                baseTimestamp: getTimestampDaysAgo(23 - i * 5),
                errorConfig: errorConfig
            }));
        }
        for (let i = 0; i < 5; i++) {
            sessions.push(...generateLesson({
                modeKey: 'continuous-ascending',
                baseTimestamp: getTimestampDaysAgo(20 - i * 4),
                errorConfig: errorConfig
            }));
        }

        saveSessionData(sessions);
        console.log(`✅ シナリオB完了: ${sessions.length}セッション生成`);
        return sessions;
    }

    /**
     * シナリオC: 上級者（S級チャレンジャー）
     */
    function generateScenarioC() {
        console.log('📊 シナリオC: 上級者（S級チャレンジャー）を生成中...');
        const sessions = [];

        const excellentConfig = {
            stepErrors: [8, 12, 10, 11, 9, 13, 15, 10],
            bias: 0,
            variance: 5
        };

        const goodConfig = {
            stepErrors: [10, 18, 14, 16, 12, 18, 22, 14],
            bias: 0,
            variance: 6
        };

        const advancedConfig = {
            stepErrors: [12, 22, 18, 20, 16, 22, 28, 18],
            bias: 0,
            variance: 7
        };

        // ランダム基音（大量の練習）
        for (let i = 0; i < 15; i++) {
            sessions.push(...generateLesson({
                modeKey: 'random-ascending',
                baseTimestamp: getTimestampDaysAgo(60 - i * 4),
                errorConfig: excellentConfig
            }));
        }
        for (let i = 0; i < 12; i++) {
            sessions.push(...generateLesson({
                modeKey: 'random-descending',
                baseTimestamp: getTimestampDaysAgo(58 - i * 4),
                errorConfig: excellentConfig
            }));
        }

        // 連続チャレンジ
        for (let i = 0; i < 10; i++) {
            sessions.push(...generateLesson({
                modeKey: 'continuous-ascending',
                baseTimestamp: getTimestampDaysAgo(45 - i * 4),
                errorConfig: goodConfig
            }));
        }
        for (let i = 0; i < 8; i++) {
            sessions.push(...generateLesson({
                modeKey: 'continuous-descending',
                baseTimestamp: getTimestampDaysAgo(43 - i * 4),
                errorConfig: goodConfig
            }));
        }

        // 12音階（各種）
        for (let i = 0; i < 5; i++) {
            sessions.push(...generateLesson({
                modeKey: '12tone-asc-ascending',
                baseTimestamp: getTimestampDaysAgo(25 - i * 4),
                errorConfig: advancedConfig
            }));
        }
        for (let i = 0; i < 4; i++) {
            sessions.push(...generateLesson({
                modeKey: '12tone-asc-descending',
                baseTimestamp: getTimestampDaysAgo(23 - i * 4),
                errorConfig: advancedConfig
            }));
        }
        for (let i = 0; i < 3; i++) {
            sessions.push(...generateLesson({
                modeKey: '12tone-desc-ascending',
                baseTimestamp: getTimestampDaysAgo(15 - i * 4),
                errorConfig: advancedConfig
            }));
        }
        for (let i = 0; i < 3; i++) {
            sessions.push(...generateLesson({
                modeKey: '12tone-desc-descending',
                baseTimestamp: getTimestampDaysAgo(13 - i * 4),
                errorConfig: advancedConfig
            }));
        }
        for (let i = 0; i < 2; i++) {
            sessions.push(...generateLesson({
                modeKey: '12tone-both-ascending',
                baseTimestamp: getTimestampDaysAgo(6 - i * 3),
                errorConfig: advancedConfig
            }));
        }
        for (let i = 0; i < 2; i++) {
            sessions.push(...generateLesson({
                modeKey: '12tone-both-descending',
                baseTimestamp: getTimestampDaysAgo(5 - i * 3),
                errorConfig: advancedConfig
            }));
        }

        saveSessionData(sessions);
        console.log(`✅ シナリオC完了: ${sessions.length}セッション生成`);
        return sessions;
    }

    /**
     * シナリオD: データ不足状態
     */
    function generateScenarioD() {
        console.log('📊 シナリオD: データ不足状態を生成中...');
        const sessions = [];

        const beginnerConfig = {
            stepErrors: [20, 50, 40, 35, 30, 45, 55, 25],
            bias: -5,
            variance: 15
        };

        // 不完全なレッスン（3セッションのみ）
        sessions.push(...generateLesson({
            modeKey: 'random-ascending',
            baseTimestamp: getTimestampDaysAgo(3),
            errorConfig: beginnerConfig,
            sessionsCount: 3 // 不完全
        }));

        saveSessionData(sessions);
        console.log(`✅ シナリオD完了: ${sessions.length}セッション生成（不完全レッスン）`);
        return sessions;
    }

    /**
     * シナリオE: エッジケース（バグ検出用）
     */
    function generateScenarioE() {
        console.log('📊 シナリオE: エッジケース（バグ検出用）を生成中...');
        const sessions = [];

        // 通常データ
        const normalConfig = {
            stepErrors: [25, 25, 25, 25, 25, 25, 25, 25],
            bias: 0,
            variance: 5
        };

        sessions.push(...generateLesson({
            modeKey: 'random-ascending',
            baseTimestamp: getTimestampDaysAgo(10),
            errorConfig: normalConfig
        }));

        // 外れ値を含むセッションを手動で追加
        const outlierSession = generateSession({
            modeKey: 'random-ascending',
            lessonId: generateLessonId('random', 'random', 'ascending', getTimestampDaysAgo(5)),
            sessionNumber: 0,
            baseTimestamp: getTimestampDaysAgo(5),
            errorConfig: normalConfig
        });
        // 外れ値を挿入
        outlierSession.pitchErrors[3].errorInCents = 850; // 800¢超
        outlierSession.pitchErrors[6].errorInCents = -870; // 800¢超
        sessions.push(outlierSession);

        // 古いデータ（180日前）
        sessions.push(...generateLesson({
            modeKey: 'random-ascending',
            baseTimestamp: getTimestampDaysAgo(180),
            errorConfig: {
                stepErrors: [60, 70, 55, 50, 45, 60, 75, 40],
                bias: -15,
                variance: 20
            }
        }));

        // 誤差ゼロのセッション
        const perfectSession = generateSession({
            modeKey: 'random-ascending',
            lessonId: generateLessonId('random', 'random', 'ascending', getTimestampDaysAgo(1)),
            sessionNumber: 0,
            baseTimestamp: getTimestampDaysAgo(1),
            errorConfig: { stepErrors: [0, 0, 0, 0, 0, 0, 0, 0], bias: 0, variance: 0 }
        });
        // 完璧な精度に修正
        perfectSession.pitchErrors.forEach(p => {
            p.errorInCents = 0;
            p.detectedFrequency = p.expectedFrequency;
        });
        sessions.push(perfectSession);

        saveSessionData(sessions);
        console.log(`✅ シナリオE完了: ${sessions.length}セッション生成（エッジケース含む）`);
        return sessions;
    }

    // ========================================
    // ユーティリティ関数
    // ========================================

    /**
     * セッションデータを保存
     * @param {Array} newSessions
     */
    function saveSessionData(newSessions) {
        const existingData = JSON.parse(localStorage.getItem('sessionData') || '[]');
        const mergedData = [...existingData, ...newSessions];
        localStorage.setItem('sessionData', JSON.stringify(mergedData));
        console.log(`💾 保存完了: 既存${existingData.length} + 新規${newSessions.length} = 合計${mergedData.length}セッション`);
    }

    /**
     * テストデータをクリア
     */
    function clearTestData() {
        localStorage.removeItem('sessionData');
        sessionIdCounter = 1;
        console.log('🗑️ テストデータをクリアしました');
    }

    /**
     * 現在のデータを確認
     */
    function inspectData() {
        const data = JSON.parse(localStorage.getItem('sessionData') || '[]');
        console.log('📋 現在のセッションデータ:');
        console.log(`  総セッション数: ${data.length}`);

        // モード別集計
        const modeCount = {};
        data.forEach(s => {
            const key = `${s.mode}-${s.scaleDirection}`;
            modeCount[key] = (modeCount[key] || 0) + 1;
        });
        console.log('  モード別セッション数:', modeCount);

        // レッスン数
        const lessonIds = [...new Set(data.map(s => s.lessonId))];
        console.log(`  総レッスン数: ${lessonIds.length}`);

        // 日付範囲
        if (data.length > 0) {
            const timestamps = data.map(s => s.timestamp);
            const oldest = new Date(Math.min(...timestamps));
            const newest = new Date(Math.max(...timestamps));
            console.log(`  日付範囲: ${oldest.toLocaleDateString()} 〜 ${newest.toLocaleDateString()}`);
        }

        return data;
    }

    /**
     * 全シナリオを生成
     */
    function generateAll() {
        console.log('📊 全シナリオを生成します...');
        clearTestData();
        generateScenarioA();
        generateScenarioB();
        // シナリオCは大量データなので個別に実行推奨
        // generateScenarioC();
        // シナリオD, Eはエッジケースなので個別に実行推奨
        console.log('✅ 全シナリオ生成完了（A, B）');
        console.log('💡 シナリオC（上級者大量データ）、D（データ不足）、E（エッジケース）は個別に実行してください');
        inspectData();
    }

    // ========================================
    // グローバル公開
    // ========================================

    window.TestDataGenerator = {
        // シナリオ生成
        generateScenarioA: generateScenarioA,
        generateScenarioB: generateScenarioB,
        generateScenarioC: generateScenarioC,
        generateScenarioD: generateScenarioD,
        generateScenarioE: generateScenarioE,
        generateAll: generateAll,

        // ユーティリティ
        clearTestData: clearTestData,
        inspectData: inspectData,

        // 低レベルAPI（カスタム生成用）
        generateLesson: generateLesson,
        generateSession: generateSession,
        saveSessionData: saveSessionData,

        // 定数（参照用）
        MODE_CONFIGS: MODE_CONFIGS,
        NOTE_FREQUENCIES: NOTE_FREQUENCIES
    };

    console.log('✅ TestDataGenerator loaded');
    console.log('📖 使用方法:');
    console.log('   TestDataGenerator.generateScenarioA()  // 成長ストーリー');
    console.log('   TestDataGenerator.generateAll()        // 推奨シナリオ一括生成');
    console.log('   TestDataGenerator.clearTestData()      // データクリア');
    console.log('   TestDataGenerator.inspectData()        // データ確認');

})();
