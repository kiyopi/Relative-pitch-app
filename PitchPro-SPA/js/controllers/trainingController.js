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

export async function initializeTrainingPage() {
    console.log('TrainingController initializing...');

    // Wait for Lucide
    await waitForLucide();

    // Initialize mode UI
    initializeModeUI();

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
    lucide.createIcons();
}

// デバイス検出
function getDeviceType() {
    const userAgent = navigator.userAgent || navigator.vendor || window.opera;
    const isIPhone = /iPhone/.test(userAgent);
    const isIPad = /iPad/.test(userAgent) || (/Macintosh/.test(userAgent) && 'ontouchend' in document);
    return isIPhone ? 'iphone' : isIPad ? 'ipad' : 'pc';
}

// デバイス別音量設定
function getDeviceVolume() {
    const device = getDeviceType();
    const volumeSettings = {
        pc: -6,
        iphone: -4,
        ipad: -5
    };
    return volumeSettings[device] || -6;
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
        // 初回クリック時は初期化を実行
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

        // ランダム基音再生（2秒）と同時にインターバル開始（2.5秒）
        const baseNoteInfo = await pitchShifter.playRandomNote(2);
        console.log('🎵 基音再生:', baseNoteInfo);

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

// インターバルカウントダウン（2.5秒間、各0.5秒）
function startIntervalCountdown(squares) {
    // すべての四角をリセット
    squares.forEach(sq => sq.classList.remove('consumed'));

    // 0.5秒ごとに1つずつ消費（2.5秒で5個完了）
    let count = 0;
    const intervalTimer = setInterval(() => {
        if (count < squares.length) {
            squares[count].classList.add('consumed');
            count++;
            console.log(`⏱️ インターバル進行: ${count}/5 (${count * 0.5}秒経過)`);
        } else {
            clearInterval(intervalTimer);
            console.log('✅ インターバル完了（2.5秒）');
        }
    }, 500); // 0.5秒間隔
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

    for (let i = 0; i < noteSequence.length; i++) {
        // 前の音符を完了状態に
        if (i > 0) {
            circles[i - 1]?.classList.remove('current');
            circles[i - 1]?.classList.add('completed');
        }

        // 現在の音符をハイライト
        circles[i]?.classList.add('current');
        console.log(`🎵 音程: ${intervals[i]} (${noteSequence[i]})`);

        // ユーザーの発声時間を確保（700ms間隔）
        await new Promise(resolve => setTimeout(resolve, 700));

        currentIntervalIndex = i + 1;
    }

    // 最後の音符を完了状態に
    circles[noteSequence.length - 1]?.classList.remove('current');
    circles[noteSequence.length - 1]?.classList.add('completed');

    // トレーニング完了
    handleSessionComplete();
}

// リアルタイム音程更新ハンドラ
let lastPitchLog = null;
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
    }
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
