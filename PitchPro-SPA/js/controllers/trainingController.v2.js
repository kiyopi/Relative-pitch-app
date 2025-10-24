/**
 * Training Controller - Integrated Implementation
 * PitchPro AudioDetectionComponent + PitchShifter統合版
 *
 * 🔥 VERSION: 2025-10-24-01:00 - セッション継続判定を追加
 */

console.log('🔥🔥🔥 TrainingController.js VERSION: 2025-10-24-01:00 LOADED 🔥🔥🔥');

let isInitialized = false;
let pitchShifter = null;
let initializationPromise = null;
let audioDetector = null;
let currentIntervalIndex = 0;
let baseNoteInfo = null;
let previousBaseNote = null; // 前回の基音（中級モード用）

// セッションデータ記録用
let sessionRecorder = null;

// 相対音程（ドレミ...）と半音ステップの対応
const intervals = ['ド', 'レ', 'ミ', 'ファ', 'ソ', 'ラ', 'シ', 'ド'];
const semitoneSteps = [0, 2, 4, 5, 7, 9, 11, 12]; // ド=0, レ=+2半音, ミ=+4半音...

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

    // 【ReloadManager統合】リロード検出 → preparationへリダイレクト
    if (ReloadManager.detectReload()) {
        console.warn('⚠️ リロード検出 - preparationへリダイレクト');

        // ユーザーに説明を表示
        ReloadManager.showReloadDialog();

        // preparationへリダイレクト
        await ReloadManager.redirectToPreparation('リロード検出');

        // リダイレクトエラーをスロー（router.jsで特別扱い）
        throw ReloadManager.createRedirectError();
    }

    // Wait for Lucide
    await waitForLucide();

    // Load voice range data
    loadVoiceRangeData();

    // 【新規追加】音域データ必須チェック
    if (!checkVoiceRangeData()) {
        console.error('❌ 音域データが設定されていません');
        alert('音域テストを先に完了してください。');
        await ReloadManager.redirectToPreparation('音域テスト未完了');
        return;
    }

    // 基音選択（毎回必須）
    // SessionDataRecorderが自動的にsessionCounterを管理するため、
    // セッション継続判定は不要。基音は毎回選択する。
    preselectBaseNote();

    // Initialize mode UI（リセット後に実行）
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

    // ホームボタンに確認ダイアログを追加
    setupHomeButton();

    // ブラウザバック防止を有効化
    preventBrowserBack();

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

/**
 * ランダムモード新規開始処理（統合初期化）
 * - sessionCounterを0にリセット
 * - 前回の基音をクリア
 * - 基音を事前選択
 */
function initializeRandomModeTraining() {
    console.log('🆕 ランダムモード新規開始処理を実行');

    // localStorageクリアは preparation-pitchpro-cycle.js に統一されました

    // sessionDataRecorder のリセット（currentSession のみ）
    // sessionCounterはSessionDataRecorderが自動管理するため、直接操作しない
    if (window.sessionDataRecorder) {
        window.sessionDataRecorder.currentSession = null;
        console.log('🔄 currentSession をクリア');
    }

    // 前回の基音をクリア（中級モード用）
    previousBaseNote = null;
    console.log('🔄 previousBaseNoteリセット');

    // 基音を事前に選択（ボタンクリック時の遅延を回避）
    preselectBaseNote();
}

/**
 * 基音を事前に選択（ボタンクリック時の遅延を回避）
 */
function preselectBaseNote() {
    const config = modeConfig[currentMode];
    const sessionCounter = window.sessionDataRecorder ? window.sessionDataRecorder.getSessionNumber() : 0;
    const selectedNote = selectBaseNote(config.baseNoteSelection, sessionCounter);

    baseNoteInfo = selectedNote;
    console.log(`🎵 基音を事前選択: ${selectedNote.note} (${selectedNote.frequency.toFixed(1)}Hz)`);
}

// デバイス検出（PitchPro実装準拠）
function getDeviceType() {
    const userAgent = navigator.userAgent || navigator.vendor || window.opera;

    // 複数の判定方法を組み合わせた包括的な検出（PitchPro方式）
    const isIPhone = /iPhone/.test(userAgent);
    const isIPad = /iPad/.test(userAgent);
    const isMacintoshWithTouch = /Macintosh/.test(userAgent) && 'ontouchend' in document;
    const isIOSUserAgent = /iPad|iPhone|iPod/.test(userAgent);
    const isIOSPlatform = /iPad|iPhone|iPod/.test(navigator.platform || '');
    const isIOS = isIPhone || isIPad || isMacintoshWithTouch || isIOSUserAgent || isIOSPlatform;

    // デバイスタイプ判定
    if (isIPhone) {
        return 'iphone';
    } else if (isIPad || isMacintoshWithTouch) {
        return 'ipad';
    } else if (isIOS) {
        // スクリーンサイズで判定（PitchPro方式）
        return detectIOSDeviceTypeByScreen();
    } else {
        return 'pc';
    }
}

// スクリーンサイズによるiOS デバイスタイプ判定（PitchPro実装）
function detectIOSDeviceTypeByScreen() {
    const screenWidth = window.screen.width;
    const screenHeight = window.screen.height;
    const maxDimension = Math.max(screenWidth, screenHeight);
    const minDimension = Math.min(screenWidth, screenHeight);

    // iPad判定: 長辺768px以上、または長辺700px以上かつ短辺500px以上
    if (maxDimension >= 768 || (maxDimension >= 700 && minDimension >= 500)) {
        return 'ipad';
    } else {
        return 'iphone';
    }
}

// デバイス別音量設定（実機テストで最適化）
function getDeviceVolume() {
    const device = getDeviceType();
    const volumeSettings = {
        pc: +8,      // +8dB: デバイス音量50%時に最適化
        iphone: +18, // +18dB: デバイス音量50%時に最適化
        ipad: +20    // +20dB: デバイス音量50%時に最適化（Tone.js推奨上限）
    };
    return volumeSettings[device] || +8;
}

// PitchShifter初期化（シングルトンパターン + グローバルインスタンス活用）
async function initializePitchShifter() {
    // 1. グローバルインスタンスが既に初期化済みなら使用
    if (window.pitchShifterInstance && window.pitchShifterInstance.isInitialized) {
        console.log('✅ Using global PitchShifter instance (initialized from home page)');
        pitchShifter = window.pitchShifterInstance;

        // デバイス別音量設定を適用（グローバルインスタンスの音量を更新）
        const deviceVolume = getDeviceVolume();
        const deviceType = getDeviceType();
        console.log(`🔊 音量更新: ${deviceType}用に${deviceVolume}dBに設定`);
        pitchShifter.setVolume(deviceVolume);

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

        // iOS/iPadOS対応: 初期化後にAudioContextを確実に起動
        if (typeof Tone !== 'undefined' && Tone.context) {
            if (Tone.context.state !== 'running') {
                console.log('🔊 AudioContext起動中（初期化後）... (state:', Tone.context.state + ')');
                await Tone.context.resume();
                console.log('✅ AudioContext起動完了（初期化後） (state:', Tone.context.state + ')');
            } else {
                console.log('✅ AudioContext既に起動済み (state:', Tone.context.state + ')');
            }
        }

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
            console.log('🔊 AudioContext状態確認... (state:', Tone.context.state + ')');

            // Tone.start()を明示的に呼び出し（iOS/iPadOS対応）
            if (Tone.context.state === 'suspended') {
                console.log('🔊 Tone.start()実行中...');
                await Tone.start();
                console.log('✅ Tone.start()完了 (state:', Tone.context.state + ')');
            }

            // resume()で確実に起動
            if (Tone.context.state !== 'running') {
                console.log('🔊 AudioContext再開中... (state:', Tone.context.state + ')');
                await Tone.context.resume();
                console.log('✅ AudioContext再開完了 (state:', Tone.context.state + ')');

                // 安定化のため少し待機（iOS/iPadOS対策）
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }

        // 事前選択済みの基音を使用して再生（2秒）
        if (!baseNoteInfo) {
            console.error('❌ 基音が選択されていません');
            throw new Error('基音が選択されていません');
        }

        console.log(`🎵 基音再生開始: ${baseNoteInfo.note} (${baseNoteInfo.frequency.toFixed(1)}Hz)`);
        await pitchShifter.playNote(baseNoteInfo.note, 2);
        console.log('🎵 基音再生:', baseNoteInfo);

        // セッションデータ記録開始
        if (window.sessionDataRecorder) {
            sessionRecorder = window.sessionDataRecorder;
            sessionRecorder.startNewSession(baseNoteInfo.note, baseNoteInfo.frequency, currentMode);
            console.log('📊 セッションデータ記録開始 (mode:', currentMode, ')');
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
    // 注: ガイド表示は相対音程（ドレミ...）を使用
    const guideCount = 8; // ド～ド（1オクターブ）

    // 音程データバッファをリセット
    pitchDataBuffer = [];

    for (let i = 0; i < guideCount; i++) {
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

        // 期待される周波数を計算してログ出力
        const expectedFreq = baseNoteInfo.frequency * Math.pow(2, semitoneSteps[i] / 12);
        console.log(`🎵 音程: ${intervals[i]} (+${semitoneSteps[i]}半音, 期待: ${expectedFreq.toFixed(1)}Hz)`);

        // ユーザーの発声時間を確保（700ms間隔）
        await new Promise(resolve => setTimeout(resolve, 700));
    }

    // 最後の音符を完了状態に & データ記録
    circles[guideCount - 1]?.classList.remove('current');
    circles[guideCount - 1]?.classList.add('completed');
    recordStepPitchData(guideCount - 1);

    currentIntervalIndex = guideCount;

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
        if (currentIntervalIndex < intervals.length) {
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

    // 基音からの期待される周波数を計算（正しい計算）
    const expectedFrequency = baseNoteInfo.frequency * Math.pow(2, semitoneSteps[step] / 12);
    const expectedNoteName = intervals[step]; // 相対音程名（ドレミ...）

    if (stepData.length === 0) {
        console.warn(`⚠️ Step ${step} (${expectedNoteName}): 音程データが記録されていません`);
        // ダミーデータで記録（エラー回避）
        sessionRecorder.recordPitchError(
            step,
            expectedNoteName,
            expectedFrequency,
            0,  // 検出周波数なし
            0,  // 明瞭度なし
            0   // 音量なし
        );
        return;
    }

    // 最も明瞭度が高いデータを使用
    const bestData = stepData.reduce((best, current) =>
        current.clarity > best.clarity ? current : best
    );

    // セント誤差を計算（デバッグ用）
    const centError = 1200 * Math.log2(bestData.frequency / expectedFrequency);

    sessionRecorder.recordPitchError(
        step,
        expectedNoteName,           // 相対音程名（ドレミ...）
        expectedFrequency,          // 期待される周波数（基音ベース）
        bestData.frequency,         // 実際に検出された周波数
        bestData.clarity,
        bestData.volume
    );

    console.log(`📊 Step ${step} (${expectedNoteName}) データ記録:`);
    console.log(`   期待: ${expectedFrequency.toFixed(1)}Hz`);
    console.log(`   検出: ${bestData.frequency.toFixed(1)}Hz`);
    console.log(`   誤差: ${centError >= 0 ? '+' : ''}${centError.toFixed(1)}¢`);
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

        // ページ遷移前にpopstateイベントリスナーを削除
        removeBrowserBackPrevention();

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

    // popstateイベントリスナーを削除
    removeBrowserBackPrevention();

    console.log('TrainingController reset');
}

// グローバルに公開（router.jsから呼び出し可能にする）
window.resetTrainingPageFlag = resetTrainingPageFlag;

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
 * 音域データの存在と妥当性をチェック
 * @returns {boolean} データが有効な場合true
 */
function checkVoiceRangeData() {
    // 音域データが存在しない
    if (!voiceRangeData || !voiceRangeData.results) {
        return false;
    }

    // comfortableRangeの存在確認
    const rangeData = voiceRangeData.results.comfortableRange || voiceRangeData.results;
    if (!rangeData.lowFreq || !rangeData.highFreq) {
        return false;
    }

    // オクターブ数が1以上か確認
    const octaves = Math.log2(rangeData.highFreq / rangeData.lowFreq);
    if (octaves < 1.0) {
        console.warn(`⚠️ オクターブ数不足: ${octaves.toFixed(2)}オクターブ（1.0以上必要）`);
        return false;
    }

    return true;
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

    // 快適範囲（comfortableRange）を優先使用、なければ全音域を使用
    const rangeData = voiceRangeData.results.comfortableRange || voiceRangeData.results;
    const { lowFreq, highFreq } = rangeData;

    console.log(`🎤 使用する音域: ${lowFreq.toFixed(1)}Hz - ${highFreq.toFixed(1)}Hz (${(Math.log2(highFreq / lowFreq)).toFixed(2)}オクターブ)`);
    console.log(`🎵 PitchShifter音符範囲: ${allNotes[0].note} (${allNotes[0].frequency.toFixed(1)}Hz) - ${allNotes[allNotes.length - 1].note} (${allNotes[allNotes.length - 1].frequency.toFixed(1)}Hz)`);

    // 音域内の音符のみをフィルタリング（基音+1オクターブが収まる範囲）
    const availableNotes = allNotes.filter(note => {
        const topFreq = note.frequency * 2; // 基音+1オクターブ
        const isInRange = note.frequency >= lowFreq && topFreq <= highFreq;
        return isInRange;
    });

    console.log(`🎵 利用可能な基音: ${availableNotes.length}音`);
    if (availableNotes.length > 0) {
        console.log(`   範囲: ${availableNotes[0].note} (${availableNotes[0].frequency.toFixed(1)}Hz) - ${availableNotes[availableNotes.length - 1].note} (${availableNotes[availableNotes.length - 1].frequency.toFixed(1)}Hz)`);
    } else {
        console.warn(`⚠️ 音域内に利用可能な基音がありません`);
        console.warn(`   必要範囲: ${lowFreq.toFixed(1)}Hz - ${(highFreq / 2).toFixed(1)}Hz (基音+1オクターブが${highFreq.toFixed(1)}Hzに収まる範囲)`);
        console.warn(`   PitchShifter最低音: ${allNotes[0].frequency.toFixed(1)}Hz`);
    }

    // 利用可能な基音がない場合、音域の中央付近の音を使用（フォールバック）
    if (availableNotes.length === 0) {
        console.warn('⚠️ フォールバック: 音域中央付近の音を選択');
        const midFreq = (lowFreq + highFreq) / 2;
        const fallbackNotes = allNotes.filter(note =>
            Math.abs(note.frequency - midFreq) < midFreq * 0.3 // 中央±30%の範囲
        );

        if (fallbackNotes.length > 0) {
            console.log(`✅ フォールバック基音: ${fallbackNotes.length}音 (${fallbackNotes[0].note} - ${fallbackNotes[fallbackNotes.length - 1].note})`);
            return fallbackNotes;
        }

        console.error('❌ フォールバック失敗: 全範囲を使用');
        return allNotes;
    }

    return availableNotes;
}

/**
 * 音域のオクターブ数を計算
 * @returns {number} オクターブ数
 */
function getVoiceRangeOctaves() {
    if (!voiceRangeData || !voiceRangeData.results) {
        return 0;
    }
    const rangeData = voiceRangeData.results.comfortableRange || voiceRangeData.results;
    return Math.log2(rangeData.highFreq / rangeData.lowFreq);
}

/**
 * ゾーン分割選択（初級モード用）
 * @param {Array} availableNotes - 利用可能な音符リスト
 * @param {number} sessionIndex - セッション番号（0始まり）
 * @param {number} totalSessions - 総セッション数
 * @returns {Object} 選択された音符
 */
function selectNoteFromZone(availableNotes, sessionIndex, totalSessions) {
    const octaves = getVoiceRangeOctaves();

    // 音域に応じたゾーン数を決定
    let numZones;
    if (octaves >= 2.0) {
        numZones = 4; // 理想的: 4ゾーン分割
    } else if (octaves >= 1.5) {
        numZones = 3; // 緩和: 3ゾーン分割
    } else {
        // 1-1.5オクターブ: 完全ランダム
        const randomNote = availableNotes[Math.floor(Math.random() * availableNotes.length)];
        console.log(`🎲 完全ランダム選択（音域狭い: ${octaves.toFixed(2)}オクターブ）: ${randomNote.note}`);
        return randomNote;
    }

    // セッションをゾーンに割り当て
    const sessionsPerZone = Math.ceil(totalSessions / numZones);
    const currentZone = Math.floor(sessionIndex / sessionsPerZone);

    // ゾーン範囲を計算
    const notesPerZone = Math.ceil(availableNotes.length / numZones);
    const zoneStart = currentZone * notesPerZone;
    const zoneEnd = Math.min((currentZone + 1) * notesPerZone, availableNotes.length);

    // ゾーン内からランダム選択
    const zoneNotes = availableNotes.slice(zoneStart, zoneEnd);
    const selectedNote = zoneNotes[Math.floor(Math.random() * zoneNotes.length)];

    console.log(`🎯 ゾーン${currentZone + 1}/${numZones}から選択（${octaves.toFixed(2)}オクターブ）: ${selectedNote.note}`);
    return selectedNote;
}

/**
 * 前回から一定距離を確保したランダム選択（中級モード用）
 * @param {Array} availableNotes - 利用可能な音符リスト
 * @returns {Object} 選択された音符
 */
function selectNoteWithDistance(availableNotes) {
    // 前回の基音がない場合は完全ランダム
    if (!previousBaseNote) {
        const randomNote = availableNotes[Math.floor(Math.random() * availableNotes.length)];
        console.log(`🎲 初回選択: ${randomNote.note}`);
        return randomNote;
    }

    const octaves = getVoiceRangeOctaves();

    // 音域に応じた除外半音数を決定
    let excludeSemitones;
    if (octaves >= 2.0) {
        excludeSemitones = 5; // 理想的: ±5半音以内を除外
    } else if (octaves >= 1.5) {
        excludeSemitones = 3; // 緩和: ±3半音以内を除外
    } else {
        // 1-1.5オクターブ: 完全ランダム（除外なし）
        const randomNote = availableNotes[Math.floor(Math.random() * availableNotes.length)];
        console.log(`🎲 完全ランダム選択（音域狭い: ${octaves.toFixed(2)}オクターブ）: ${randomNote.note}`);
        return randomNote;
    }

    // 前回の周波数から半音数を計算して除外
    const filteredNotes = availableNotes.filter(note => {
        const semitoneDistance = Math.abs(Math.round(12 * Math.log2(note.frequency / previousBaseNote.frequency)));
        return semitoneDistance > excludeSemitones;
    });

    // 除外後の選択肢がない場合は完全ランダム（フォールバック）
    if (filteredNotes.length === 0) {
        console.warn(`⚠️ 除外後の選択肢なし - 完全ランダム選択`);
        const randomNote = availableNotes[Math.floor(Math.random() * availableNotes.length)];
        return randomNote;
    }

    const selectedNote = filteredNotes[Math.floor(Math.random() * filteredNotes.length)];
    const semitoneDistance = Math.round(12 * Math.log2(selectedNote.frequency / previousBaseNote.frequency));
    console.log(`🎯 距離確保選択（前回から${Math.abs(semitoneDistance)}半音、±${excludeSemitones}半音除外）: ${selectedNote.note}`);
    return selectedNote;
}

/**
 * モード別基音選択ロジック
 * @param {string} selectionType - 'random_c3_octave' | 'random_chromatic' | 'sequential_chromatic'
 * @param {number} sessionIndex - セッション番号（0始まり）
 * @returns {Object} 選択された音符情報
 */
function selectBaseNote(selectionType, sessionIndex = 0) {
    const availableNotes = getAvailableNotes();

    let selectedNote;

    switch (selectionType) {
        case 'random_c3_octave':
            // ランダム基音モード（初級）: ゾーン分割による分散選択
            const config = modeConfig['random'];
            selectedNote = selectNoteFromZone(availableNotes, sessionIndex, config.maxSessions);
            console.log(`🎲 ランダム基音モード（初級）: ${selectedNote.note} (${selectedNote.frequency.toFixed(1)}Hz)`);
            break;

        case 'random_chromatic':
            // 連続チャレンジモード（中級）: 前回から一定距離を確保したランダム選択
            selectedNote = selectNoteWithDistance(availableNotes);
            console.log(`🎯 連続チャレンジモード（中級）: ${selectedNote.note} (${selectedNote.frequency.toFixed(1)}Hz)`);
            // 次回のために前回の基音を保存
            previousBaseNote = selectedNote;
            break;

        case 'sequential_chromatic':
            // 12音階モード（上級）: クロマチック12音を順次使用
            selectedNote = availableNotes[sessionIndex % availableNotes.length];
            console.log(`🎹 12音階モード（上級）: セッション${sessionIndex + 1} - ${selectedNote.note} (${selectedNote.frequency.toFixed(1)}Hz)`);
            break;

        default:
            console.warn(`⚠️ 未知の選択タイプ: ${selectionType} - ランダム選択`);
            selectedNote = availableNotes[Math.floor(Math.random() * availableNotes.length)];
    }

    return selectedNote;
}

/**
 * ホームボタンに確認ダイアログを追加
 * トレーニング中のデータ損失を防止
 */
function setupHomeButton() {
    const homeBtn = document.getElementById('btn-home-training');
    if (!homeBtn) {
        console.warn('⚠️ ホームボタンが見つかりません (id: btn-home-training)');
        return;
    }

    homeBtn.addEventListener('click', (e) => {
        e.preventDefault();

        const confirmed = confirm(
            'トレーニング中です。\n' +
            'ホームに戻ると進行中のデータが失われます。\n' +
            '本当にホームに戻りますか？'
        );

        if (confirmed) {
            // ページ遷移前にpopstateイベントリスナーを削除
            removeBrowserBackPrevention();

            // router.js の cleanupCurrentPage() が自動実行される
            window.location.hash = 'home';
            console.log('🏠 ユーザーがホームへの移動を承認');
        } else {
            console.log('🚫 ホームへの移動をキャンセル');
        }
    });

    console.log('✅ ホームボタンに確認ダイアログを設定');
}

/**
 * ブラウザバック防止
 * トレーニング中の誤操作によるデータ損失を防止
 */
let popStateHandler = null; // イベントハンドラを保持

function preventBrowserBack() {
    // 既存のハンドラがあれば削除
    if (popStateHandler) {
        window.removeEventListener('popstate', popStateHandler);
        console.log('🔄 既存のpopstateハンドラを削除');
    }

    // ダミーのエントリーを追加
    history.pushState(null, '', location.href);
    console.log('📍 ブラウザバック防止: ダミーエントリー追加');

    // popstateイベントでconfirmation表示
    popStateHandler = function(event) {
        const confirmed = confirm(
            'トレーニング中です。\n' +
            '戻ると進行中のデータが失われます。\n' +
            '本当に戻りますか？'
        );

        if (confirmed) {
            // クリーンアップ処理を実行（router.js が自動実行）
            console.log('🔙 ユーザーがブラウザバックを承認');
            removeBrowserBackPrevention();
            history.back();
        } else {
            // 戻らない（ダミーエントリーを再追加）
            history.pushState(null, '', location.href);
            console.log('🚫 ブラウザバックをキャンセル');
        }
    };

    window.addEventListener('popstate', popStateHandler);
    console.log('✅ ブラウザバック防止イベントリスナー登録完了');
}

/**
 * ブラウザバック防止を解除
 * ページ遷移前に呼び出して、popstateイベントリスナーを削除
 */
function removeBrowserBackPrevention() {
    if (popStateHandler) {
        window.removeEventListener('popstate', popStateHandler);
        popStateHandler = null;
        console.log('✅ popstateイベントリスナーを削除');
    }
}
