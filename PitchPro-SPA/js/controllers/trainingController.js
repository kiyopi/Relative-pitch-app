/**
 * Training Controller - Integrated Implementation
 * PitchPro AudioDetectionComponent + PitchShifter統合版
 */

let isInitialized = false;
let pitchShifter = null;
let initializationPromise = null;
let audioDetector = null;
let currentIntervalIndex = 0;
let baseNoteInfo = null;
const intervals = ['ド', 'レ', 'ミ', 'ファ', 'ソ', 'ラ', 'シ', 'ド'];

// セッションデータ記録用
let sessionRecorder = null;
let expectedNotes = ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5'];
let expectedFrequencies = [261.63, 293.66, 329.63, 349.23, 392.00, 440.00, 493.88, 523.25];

// トレーニングモード管理
let currentMode = 'random'; // 'random' | 'continuous' | '12tone'
let voiceRangeData = null; // 音域データ

// モード設定
const modeConfig = {
    random: {
        maxSessions: 8,
        title: 'ランダム基音モード',
        hasIndividualResults: true,
        baseNoteSelection: 'random_c3_octave'
    },
    continuous: {
        maxSessions: 8,
        title: '連続チャレンジモード',
        hasIndividualResults: false,
        baseNoteSelection: 'random_chromatic'
    },
    '12tone': {
        maxSessions: 12,
        title: '12音階モード',
        hasIndividualResults: false,
        baseNoteSelection: 'sequential_chromatic',
        hasRangeAdjustment: true
    }
};

export async function initializeTrainingPage() {
    console.log('TrainingController initializing...');

    // Wait for Lucide
    await waitForLucide();

    // Load voice range data
    loadVoiceRangeData();

    // Initialize mode UI
    initializeModeUI();

    // Update session progress UI
    updateSessionProgressUI();

    // Setup button (常に再登録)
    const playButton = document.getElementById('play-base-note');
    if (playButton) {
        console.log('✅ ボタン発見:', playButton);

        // 古いイベントリスナーを削除してから新規登録
        const newButton = playButton.cloneNode(true);
        playButton.parentNode.replaceChild(newButton, playButton);

        // 初期状態（HTMLと同じアイコン）
        newButton.innerHTML = '<i data-lucide="volume-2" style="width: 24px; height: 24px;"></i><span>基音スタート</span>';
        lucide.createIcons();

        newButton.addEventListener('click', () => {
            console.log('🎯 ボタンクリック検出');
            startTraining();
        });
        console.log('✅ イベントリスナー登録完了（再登録）');
    } else {
        console.error('❌ play-base-noteボタンが見つかりません');
    }

    // デバッグ用：マイク許可ボタン
    const debugMicButton = document.getElementById('debug-mic-permission');
    if (debugMicButton) {
        debugMicButton.addEventListener('click', async () => {
            console.log('🎤 デバッグ：マイク許可取得開始');
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                stream.getTracks().forEach(track => track.stop());
                console.log('✅ マイク許可取得完了');
            } catch (error) {
                console.error('❌ マイク許可拒否:', error);
            }
        });
        console.log('✅ デバッグ用マイク許可ボタン登録完了');
    }

    isInitialized = true;
    console.log('TrainingController initialized');
}

function waitForLucide() {
    return new Promise((resolve) => {
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
            resolve();
        } else {
            const interval = setInterval(() => {
                if (typeof lucide !== 'undefined') {
                    clearInterval(interval);
                    lucide.createIcons();
                    resolve();
                }
            }, 100);
        }
    });
}

function initializeModeUI() {
    console.log('Initializing mode UI...');

    // モード設定を取得
    const config = modeConfig[currentMode];
    console.log(`📋 現在のモード: ${config.title}`);

    // ページタイトルを更新
    const pageTitle = document.querySelector('.page-title');
    if (pageTitle) {
        pageTitle.textContent = config.title;
    }

    // ページサブタイトルを更新
    const pageSubtitle = document.querySelector('.page-subtitle');
    if (pageSubtitle) {
        const sessionCounter = window.sessionDataRecorder ? window.sessionDataRecorder.getSessionNumber() : 0;
        const currentSession = sessionCounter + 1;
        pageSubtitle.textContent = `セッション ${currentSession}/${config.maxSessions} 実施中`;
    }

    // アイコンを再描画
    lucide.createIcons();
}

// デバイス検出
function getDeviceType() {
    const userAgent = navigator.userAgent || navigator.vendor || window.opera;
    const isIPhone = /iPhone/.test(userAgent);
    const isIPad = /iPad/.test(userAgent) || (/Macintosh/.test(userAgent) && 'ontouchend' in document);
    return isIPhone ? 'iphone' : isIPad ? 'ipad' : 'pc';
}

// デバイス別音量設定（実機テストで最適化）
function getDeviceVolume() {
    const device = getDeviceType();
    const volumeSettings = {
        pc: +6,      // +6dB: 約2倍音量（デフォルト-6dBから+12dB）
        iphone: +8,  // +8dB: 約2.5倍音量（iPhone音量不足対策）
        ipad: +10    // +10dB: 約3倍音量（iPad音量不足対策）
    };
    return volumeSettings[device] || +6;
}

// PitchShifter初期化（シングルトンパターン + グローバルインスタンス活用）
async function initializePitchShifter() {
    // 1. グローバルインスタンスが既に初期化済みなら使用
    if (window.pitchShifterInstance && window.pitchShifterInstance.isInitialized) {
        console.log('✅ Using global PitchShifter instance (initialized from home page)');
        pitchShifter = window.pitchShifterInstance;
        return pitchShifter;
    }

    // 2. ローカルインスタンスが既に初期化済みならそのまま返す
    if (pitchShifter && pitchShifter.isInitialized) {
        console.log('✅ PitchShifter already initialized (local instance)');
        return pitchShifter;
    }

    // 3. 初期化中なら同じPromiseを返す
    if (initializationPromise) {
        console.log('⏳ PitchShifter initialization in progress, waiting...');
        return initializationPromise;
    }

    // 4. 新規初期化開始（フォールバック: 直接アクセス/リダイレクト後等）
    initializationPromise = (async () => {
        console.log('🎹 PitchShifter初期化中（フォールバック: 直接アクセス or リダイレクト後）...');

        // PitchShifterが利用可能になるまで待機（最大10秒）
        let attempts = 0;
        while (!window.PitchShifter && attempts < 100) {
            if (attempts === 0 || attempts % 10 === 0) {
                console.log(`⏳ PitchShifter待機中... (${attempts + 1}/100)`);
            }
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }

        if (!window.PitchShifter) {
            console.error('❌ PitchShifterが読み込まれませんでした');
            console.error('window.PitchShifter:', window.PitchShifter);
            console.error('利用可能なグローバル変数:', Object.keys(window).filter(k => k.includes('Pitch') || k.includes('Tone')));
            initializationPromise = null;
            throw new Error('PitchShifterライブラリが読み込まれていません（10秒タイムアウト）');
        }

        console.log('✅ PitchShifter利用可能:', typeof window.PitchShifter);

        const deviceVolume = getDeviceVolume();
        const deviceType = getDeviceType();
        console.log(`📱 デバイス: ${deviceType}, 音量: ${deviceVolume}dB`);

        // デバイス別最適化音量を設定
        pitchShifter = new window.PitchShifter({
            baseUrl: 'audio/piano/',
            release: 2.5,
            volume: deviceVolume
        });

        await pitchShifter.initialize();
        console.log('✅ PitchShifter初期化完了（フォールバック）');

        // グローバルインスタンスとして登録
        window.pitchShifterInstance = pitchShifter;

        initializationPromise = null;
        return pitchShifter;
    })();

    return initializationPromise;
}

async function startTraining() {
    console.log('🚀 トレーニング開始');

    const playButton = document.getElementById('play-base-note');
    const statusText = document.getElementById('training-status');
    const progressSquares = document.querySelectorAll('#progress-squares .progress-square');

    if (!playButton) return;

    // ボタン無効化
    playButton.disabled = true;
    playButton.classList.add('btn-disabled');

    try {
        // 初回クリック時はPitchShifter初期化を実行
        if (!pitchShifter || !pitchShifter.isInitialized) {
            console.log('⏳ 初回クリック - PitchShifter初期化開始');
            playButton.innerHTML = '<i data-lucide="loader" style="width: 24px; height: 24px;"></i><span>初期化中...</span>';
            lucide.createIcons();

            await initializePitchShifter();
            console.log('✅ 初期化完了！次回から即座に再生されます');
        }

        // 再生開始
        playButton.innerHTML = '<i data-lucide="volume-2" style="width: 24px; height: 24px;"></i><span>再生中...</span>';
        lucide.createIcons();

        if (statusText) {
            statusText.textContent = '基音を再生中...';
        }

        // iOS/iPadOS対応: AudioContextを明示的にresume（ユーザーインタラクション時に必須）
        if (typeof Tone !== 'undefined' && Tone.context) {
            if (Tone.context.state !== 'running') {
                console.log('🔊 AudioContext再開中... (state:', Tone.context.state + ')');
                await Tone.context.resume();
                console.log('✅ AudioContext再開完了 (state:', Tone.context.state + ')');
            }
        }

        // モード別基音選択と再生（2秒）
        const config = modeConfig[currentMode];
        const sessionCounter = window.sessionDataRecorder ? window.sessionDataRecorder.getSessionNumber() : 0;
        const selectedNote = selectBaseNote(config.baseNoteSelection, sessionCounter);
        await pitchShifter.playNote(selectedNote.note, 2);
        baseNoteInfo = selectedNote;
        console.log('🎵 基音再生:', baseNoteInfo);

        // セッションデータ記録開始
        if (window.sessionDataRecorder) {
            sessionRecorder = window.sessionDataRecorder;
            sessionRecorder.startNewSession(baseNoteInfo.note, baseNoteInfo.frequency);
            console.log('📊 セッションデータ記録開始');
        } else {
            console.warn('⚠️ SessionDataRecorderが読み込まれていません');
        }

        // 基音再生と同時にインターバルカウントダウン開始（2.5秒、各0.5秒）
        console.log('⏱️ ドレミガイド開始インターバル開始（2.5秒）');
        startIntervalCountdown(progressSquares);

        // 2.5秒後（基音2秒 + 0.5秒待機）にドレミガイド開始
        setTimeout(() => {
            playButton.disabled = false;
            playButton.classList.remove('btn-disabled');
            playButton.innerHTML = '<i data-lucide="volume-2" style="width: 24px; height: 24px;"></i><span>基音スタート</span>';
            lucide.createIcons();
            if (statusText) {
                statusText.textContent = 'ドレミガイドに合わせて発声しましょう';
            }
            console.log('🎵 ドレミガイド開始');
            startDoremiGuide();
        }, 2500);

    } catch (error) {
        console.error('❌ トレーニング失敗:', error);
        playButton.disabled = false;
        playButton.classList.remove('btn-disabled');
        playButton.innerHTML = '<i data-lucide="alert-circle" style="width: 24px; height: 24px;"></i><span>エラー - 再試行</span>';
        lucide.createIcons();
        if (statusText) {
            statusText.textContent = 'エラーが発生しました';
        }
        alert(`エラーが発生しました: ${error.message}`);
    }
}

// インターバルカウントダウン（2.5秒間、3ブロック）
function startIntervalCountdown(squares) {
    // すべての四角をリセット
    squares.forEach(sq => sq.classList.remove('consumed'));

    // 最初の3個のみ使用（2.5秒で3個完了、各約0.83秒）
    const blocksToUse = 3;
    const intervalDuration = 2500; // 2.5秒
    const blockInterval = intervalDuration / blocksToUse; // 約833ms

    let count = 0;
    const intervalTimer = setInterval(() => {
        if (count < blocksToUse) {
            squares[count].classList.add('consumed');
            count++;
            console.log(`⏱️ インターバル進行: ${count}/${blocksToUse} (${(count * blockInterval / 1000).toFixed(2)}秒経過)`);
        } else {
            clearInterval(intervalTimer);
            console.log('✅ インターバル完了（2.5秒）');
        }
    }, blockInterval); // 約833ms間隔
}

// ドレミガイド開始
async function startDoremiGuide() {
    const circles = document.querySelectorAll('.note-circle');
    const micBadge = document.getElementById('mic-badge');
    currentIntervalIndex = 0;

    // マイクバッジを認識中アニメーションに
    if (micBadge) {
        micBadge.classList.add('measuring');
    }

    console.log('🎵 ドレミガイド開始');

    // AudioDetectionComponent初期化（ブラウザが許可を記憶しているため2回目以降はダイアログ不要）
    try {
        console.log('🎤 AudioDetectionComponent初期化中...');
        audioDetector = new window.PitchPro.AudioDetectionComponent({
            volumeBarSelector: '.mic-recognition-section .progress-fill',
            volumeTextSelector: null,
            frequencySelector: null,
            noteSelector: null,
            autoUpdateUI: true,
            debug: false
        });

        await audioDetector.initialize();
        console.log('✅ AudioDetectionComponent初期化完了');

        // コールバック設定
        audioDetector.setCallbacks({
            onPitchUpdate: (result) => {
                handlePitchUpdate(result);
            },
            onError: (context, error) => {
                console.error(`❌ AudioDetection Error [${context}]:`, error);
            }
        });

        // 音声検出開始
        await audioDetector.startDetection();
        console.log('✅ 音声検出開始');

    } catch (error) {
        console.error('❌ AudioDetectionComponent初期化失敗:', error);
    }

    // ドレミガイド進行（ユーザーが基音をもとに発声、アプリは音を鳴らさない）
    const noteSequence = ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5'];

    // 音程データバッファをリセット
    pitchDataBuffer = [];

    for (let i = 0; i < noteSequence.length; i++) {
        currentIntervalIndex = i;

        // 前の音符を完了状態に & データ記録
        if (i > 0) {
            circles[i - 1]?.classList.remove('current');
            circles[i - 1]?.classList.add('completed');

            // 前のステップのデータを記録
            recordStepPitchData(i - 1);
        }

        // 現在の音符をハイライト
        circles[i]?.classList.add('current');
        console.log(`🎵 音程: ${intervals[i]} (${noteSequence[i]})`);

        // ユーザーの発声時間を確保（700ms間隔）
        await new Promise(resolve => setTimeout(resolve, 700));
    }

    // 最後の音符を完了状態に & データ記録
    circles[noteSequence.length - 1]?.classList.remove('current');
    circles[noteSequence.length - 1]?.classList.add('completed');
    recordStepPitchData(noteSequence.length - 1);

    currentIntervalIndex = noteSequence.length;

    // トレーニング完了
    handleSessionComplete();
}

// リアルタイム音程更新ハンドラ
let lastPitchLog = null;
let pitchDataBuffer = []; // 各ステップの音程データを一時保存
function handlePitchUpdate(result) {
    // AudioDetectionComponentからのresultは直接PitchProの形式
    // result: { frequency, clarity, volume, note }

    // 音量バーは autoUpdateUI: true により自動更新される

    // 音程検出のログ（デバッグ用）
    if (result.frequency && result.clarity > 0.3) {
        // 1秒に1回だけログ出力
        if (!lastPitchLog || Date.now() - lastPitchLog > 1000) {
            console.log(`🎵 音程検出: ${result.frequency.toFixed(1)}Hz (${result.note || ''}), 明瞭度: ${result.clarity.toFixed(2)}, 音量: ${(result.volume * 100).toFixed(1)}%`);
            lastPitchLog = Date.now();
        }

        // 音程データをバッファに追加（明瞭度が十分な場合のみ）
        if (currentIntervalIndex < expectedNotes.length) {
            pitchDataBuffer.push({
                step: currentIntervalIndex,
                frequency: result.frequency,
                clarity: result.clarity,
                volume: result.volume,
                timestamp: Date.now()
            });
        }
    }
}

/**
 * 各ステップの音程データを記録
 */
function recordStepPitchData(step) {
    if (!sessionRecorder) return;

    // このステップの音程データを取得（直近700ms間のデータ）
    const stepData = pitchDataBuffer.filter(d => d.step === step);

    if (stepData.length === 0) {
        console.warn(`⚠️ Step ${step}: 音程データが記録されていません`);
        // ダミーデータで記録（エラー回避）
        sessionRecorder.recordPitchError(
            step,
            expectedNotes[step],
            expectedFrequencies[step],
            0,
            0,
            0
        );
        return;
    }

    // 最も明瞭度が高いデータを使用
    const bestData = stepData.reduce((best, current) =>
        current.clarity > best.clarity ? current : best
    );

    // 基音からの相対周波数を計算
    const relativeFrequency = bestData.frequency * Math.pow(2, step / 12);

    sessionRecorder.recordPitchError(
        step,
        expectedNotes[step],
        expectedFrequencies[step],
        relativeFrequency,
        bestData.clarity,
        bestData.volume
    );

    console.log(`📊 Step ${step} データ記録: ${bestData.frequency.toFixed(1)}Hz → ${relativeFrequency.toFixed(1)}Hz`);
}

// セッション完了ハンドラ
function handleSessionComplete() {
    console.log('✅ トレーニング完了');

    // 音声検出停止
    if (audioDetector) {
        audioDetector.stopDetection();
    }

    // マイクバッジを通常状態に戻す
    const micBadge = document.getElementById('mic-badge');
    if (micBadge) {
        micBadge.classList.remove('measuring');
    }

    // 音量バーをリセット
    const volumeBar = document.querySelector('.mic-recognition-section .progress-fill');
    if (volumeBar) {
        volumeBar.style.width = '0%';
        console.log('🔄 音量バーリセット');
    }

    // セッションデータを保存
    if (sessionRecorder) {
        const completedSession = sessionRecorder.completeSession();
        console.log('✅ セッションデータ保存完了:', completedSession);

        // セッション結果ページへ遷移（SPAのハッシュルーティング）
        const sessionNumber = sessionRecorder.getSessionNumber();
        window.location.hash = `result-session?session=${sessionNumber}`;
        return; // 以降の処理はスキップ
    }

    // sessionRecorderがない場合のフォールバック（開発中）
    console.warn('⚠️ SessionDataRecorderが利用できません。結果ページへの遷移をスキップします。');

    // ステータステキスト更新
    const statusText = document.getElementById('training-status');
    if (statusText) {
        statusText.textContent = 'トレーニング完了！もう一度挑戦できます';
    }

    // ボタンを「もう一度」に変更
    const button = document.getElementById('play-base-note');
    button.innerHTML = '<i data-lucide="refresh-cw" style="width: 24px; height: 24px;"></i><span>もう一度</span>';
    button.disabled = false;
    button.classList.remove('btn-disabled');

    // 古いonclickを削除して新しいイベントリスナーを設定
    const newButton = button.cloneNode(true);
    button.parentNode.replaceChild(newButton, button);

    newButton.addEventListener('click', () => {
        console.log('🔄 トレーニング再開');
        // ドレミガイドの状態をリセット
        const circles = document.querySelectorAll('.note-circle');
        circles.forEach(circle => {
            circle.classList.remove('current', 'completed');
        });
        // ステータステキストをリセット
        if (statusText) {
            statusText.textContent = 'ガイドに合わせて発声しましょう';
        }
        // トレーニング再開
        startTraining();
    });

    lucide.createIcons();
}

export function resetTrainingPageFlag() {
    isInitialized = false;
    console.log('TrainingController reset');
}

/**
 * セッション進行状況UIを更新
 */
function updateSessionProgressUI() {
    // セッションカウンターを取得
    const sessionCounter = window.sessionDataRecorder ? window.sessionDataRecorder.getSessionNumber() : 0;
    const currentSession = sessionCounter + 1; // 次のセッション番号
    const config = modeConfig[currentMode];
    const totalSessions = config.maxSessions;

    console.log(`📊 セッション進行状況: ${currentSession}/${totalSessions} (${config.title})`);

    // 進行バーを更新
    const progressFill = document.querySelector('.progress-section .progress-fill');
    if (progressFill) {
        const progressPercentage = (sessionCounter / totalSessions) * 100;
        progressFill.style.width = `${progressPercentage}%`;
    }

    // セッションバッジを更新
    const sessionBadge = document.querySelector('.session-badge');
    if (sessionBadge) {
        sessionBadge.textContent = `セッション ${currentSession}/${totalSessions}`;
    }
}

/**
 * 音域データを読み込む
 */
function loadVoiceRangeData() {
    try {
        const localData = localStorage.getItem('voiceRangeData');
        if (localData) {
            voiceRangeData = JSON.parse(localData);
            console.log('✅ 音域データ読み込み完了:', voiceRangeData.results);
        } else {
            console.warn('⚠️ 音域データが見つかりません - デフォルト範囲を使用します');
            voiceRangeData = null;
        }
    } catch (error) {
        console.error('❌ 音域データ読み込みエラー:', error);
        voiceRangeData = null;
    }
}

/**
 * 音域に基づいて利用可能な音符リストを取得
 * @returns {Array} 利用可能な音符情報の配列
 */
function getAvailableNotes() {
    const allNotes = window.PitchShifter.AVAILABLE_NOTES;

    if (!voiceRangeData || !voiceRangeData.results) {
        console.warn('⚠️ 音域データなし - 全範囲を使用');
        return allNotes;
    }

    const { lowFreq, highFreq } = voiceRangeData.results;

    // 音域内の音符のみをフィルタリング（基音+1オクターブが収まる範囲）
    const availableNotes = allNotes.filter(note => {
        const topFreq = note.frequency * 2; // 基音+1オクターブ
        return note.frequency >= lowFreq && topFreq <= highFreq;
    });

    console.log(`🎵 利用可能な基音: ${availableNotes.length}音 (${availableNotes[0]?.note} - ${availableNotes[availableNotes.length - 1]?.note})`);

    return availableNotes.length > 0 ? availableNotes : allNotes;
}

/**
 * モード別基音選択ロジック
 * @param {string} selectionType - 'random_c3_octave' | 'random_chromatic' | 'sequential_chromatic'
 * @param {number} sessionIndex - セッション番号（0始まり）
 * @returns {Object} 選択された音符情報
 */
function selectBaseNote(selectionType, sessionIndex = 0) {
    const availableNotes = getAvailableNotes();

    switch (selectionType) {
        case 'random_c3_octave':
            // ランダム基音モード: 音域内のC3オクターブ範囲からランダム選択
            const c3OctaveNotes = availableNotes.filter(note =>
                note.frequency >= 261.63 && note.frequency <= 523.25
            );
            const randomC3Note = c3OctaveNotes[Math.floor(Math.random() * c3OctaveNotes.length)];
            console.log(`🎲 ランダム基音モード: ${randomC3Note.note} (${randomC3Note.japaneseName})`);
            return randomC3Note;

        case 'random_chromatic':
            // 連続チャレンジモード: 音域内のクロマチック12音からランダム選択
            const randomNote = availableNotes[Math.floor(Math.random() * availableNotes.length)];
            console.log(`🎲 連続チャレンジモード: ${randomNote.note} (${randomNote.japaneseName})`);
            return randomNote;

        case 'sequential_chromatic':
            // 12音階モード: クロマチック12音を順次使用
            const chromaticNote = availableNotes[sessionIndex % availableNotes.length];
            console.log(`🎹 12音階モード: セッション${sessionIndex + 1} - ${chromaticNote.note} (${chromaticNote.japaneseName})`);
            return chromaticNote;

        default:
            console.warn(`⚠️ 未知の選択タイプ: ${selectionType} - ランダム選択`);
            return availableNotes[Math.floor(Math.random() * availableNotes.length)];
    }
}
