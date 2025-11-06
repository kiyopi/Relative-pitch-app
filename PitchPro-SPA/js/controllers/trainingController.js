/**
 * Training Controller - Integrated Implementation
 * PitchPro AudioDetectionComponent + PitchShifter統合版
 *
 * 🔥 VERSION: 2025-10-26-007 - 連続モード12音強制確保（音域不足時は高音側から追加）
 */

console.log('🔥🔥🔥 TrainingController.js VERSION: 2025-10-26-007 LOADED 🔥🔥🔥');

let isInitialized = false;
let pitchShifter = null;
let initializationPromise = null;
let audioDetector = null;
let currentIntervalIndex = 0;
let baseNoteInfo = null;
let selectedBaseNotes = []; // 全セッション分の基音リスト（トレーニング開始時に一括選定）
let usedBaseNotes = []; // 使用済み基音リスト（トレーニング内で重複防止）

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
        maxSessions: 12,
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

    // 【デバッグ】現在のURL確認
    console.log('🔍 [DEBUG] hash:', window.location.hash);

    // 【新規追加】URLパラメータからモード情報を取得
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash.split('?')[1] || '');
    const modeParam = params.get('mode');
    const directionParam = params.get('direction'); // 12音階モード方向パラメータ

    console.log('🔍 [DEBUG] modeパラメータ:', modeParam);
    console.log('🔍 [DEBUG] directionパラメータ:', directionParam);

    if (modeParam && modeConfig[modeParam]) {
        currentMode = modeParam;
        console.log(`✅ モード設定: ${currentMode} (${modeConfig[currentMode].title})`);
    } else {
        console.warn(`⚠️ モードパラメータ不正: ${modeParam} - デフォルト(random)を使用`);
        console.warn(`🔍 [DEBUG] 利用可能なモード:`, Object.keys(modeConfig));
        currentMode = 'random';
    }

    // 12音階モード方向をグローバル変数に保存
    if (currentMode === '12tone' && directionParam) {
        window.currentTrainingDirection = directionParam;
        console.log(`✅ 12音階モード方向: ${directionParam}`);
    }

    // 【NavigationManager統合】リロード検出 → preparationへリダイレクト
    if (NavigationManager.detectReload()) {
        console.warn('⚠️ リロード検出 - preparationへリダイレクト');

        // ユーザーに説明を表示
        NavigationManager.showReloadDialog();

        // preparationへリダイレクト（自動的にbeforeunload/popstate無効化）
        await NavigationManager.redirectToPreparation('リロード検出');

        // リダイレクトエラーをスロー（router.jsで特別扱い）
        throw NavigationManager.createRedirectError();
    }

    // Wait for Lucide
    await waitForLucide();

    // Load voice range data
    loadVoiceRangeData();

    // 【新規追加】音域データ必須チェック
    if (!checkVoiceRangeData()) {
        console.error('❌ 音域データが設定されていません');
        alert('音域テストを先に完了してください。');

        // preparationへリダイレクト（自動的にbeforeunload/popstate無効化）
        await NavigationManager.redirectToPreparation('音域テスト未完了');
        return;
    }

    // 【重要】モード別初期化処理を先に実行
    initializeModeTraining();

    // Initialize mode UI（初期化後に実行）
    initializeModeUI();

    // Update session progress UI
    updateSessionProgressUI();

    // 【ハイブリッド方式】ページ離脱警告を有効化（タブを閉じる・リロード対策）
    if (window.NavigationManager) {
        window.NavigationManager.enableNavigationWarning();
        console.log('✅ ページ離脱警告を有効化（タブを閉じる・リロード対策）');
    }

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

    // ブラウザバック防止はrouter.jsで自動管理されます

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

    // モード別アイコン設定
    const modeIcons = {
        'random': 'shuffle',
        'continuous': 'zap',
        '12tone': 'music'
    };

    // アイコンを更新
    const modeIcon = document.getElementById('training-mode-icon');
    if (modeIcon) {
        const iconName = modeIcons[currentMode] || 'shuffle';
        modeIcon.setAttribute('data-lucide', iconName);
        console.log(`✅ アイコン更新: ${iconName}`);
    }

    // ページタイトルを更新
    const pageTitle = document.getElementById('training-mode-title');
    if (pageTitle) {
        let titleText = config.title;

        // 12音階モードの場合、方向を追加
        if (currentMode === '12tone' && window.currentTrainingDirection) {
            const directionLabels = {
                'ascending': '（上昇）',
                'descending': '（下降）',
                'both': '（両方向）'
            };
            titleText += ` ${directionLabels[window.currentTrainingDirection] || ''}`;
        }

        pageTitle.textContent = titleText;
        console.log(`✅ タイトル更新: ${titleText}`);
    }

    // ページサブタイトルを更新
    const pageSubtitle = document.querySelector('.page-subtitle');
    if (pageSubtitle) {
        // 【修正】現在のモードのセッション数を正しく計算
        const allSessions = JSON.parse(localStorage.getItem('sessionData')) || [];
        const currentModeSessions = allSessions.filter(s => s.mode === currentMode);
        const sessionCounter = currentModeSessions.length;
        const currentSession = sessionCounter + 1;
        pageSubtitle.textContent = `セッション ${currentSession}/${config.maxSessions} 実施中`;
    }

    // アイコンを再描画
    lucide.createIcons();
}

/**
 * モード別初期化処理
 * - ランダムモード：セッションデータをクリアして0から開始
 * - 連続モード・12音階モード：既存セッションデータを保持して継続
 */
function initializeModeTraining() {
    const config = modeConfig[currentMode];
    console.log(`🆕 ${config.title}の初期化処理を実行`);

    // localStorageクリア処理は preparation-pitchpro-cycle.js が実行済み
    // ここではモード別の基音選定のみ実行
    console.log('ℹ️ sessionCounterはsession-data-recorder.jsが自動管理（localStorage最大IDと同期）');

    // 【新規】全セッション分の基音を事前に一括選定
    usedBaseNotes = []; // 使用済み基音リストをリセット（トレーニング開始時）
    selectedBaseNotes = selectAllBaseNotesForMode(config);

    // 最初のセッションの基音を事前に選択（ボタンクリック時の遅延を回避）
    preselectBaseNote();
}

/**
 * 基音を事前に選択（ボタンクリック時の遅延を回避）
 * 【新規】事前選定済みの配列から取得
 */
function preselectBaseNote() {
    // 現在のモードのセッション数を計算
    const allSessions = JSON.parse(localStorage.getItem('sessionData')) || [];
    const currentModeSessions = allSessions.filter(s => s.mode === currentMode);
    const sessionIndex = currentModeSessions.length;

    // 事前選定済みの配列から取得
    if (selectedBaseNotes && selectedBaseNotes.length > sessionIndex) {
        baseNoteInfo = selectedBaseNotes[sessionIndex];

        // 【追加】基音セット時のログを目立つように出力
        console.log('');
        console.log('═══════════════════════════════════════════════════');
        console.log(`🎼 [セッション ${sessionIndex + 1}/${selectedBaseNotes.length}] 基音セット完了`);
        console.log(`   現在の基音: ${baseNoteInfo.note} (${baseNoteInfo.frequency.toFixed(1)}Hz)`);
        console.log(`   選定モード: ${currentMode} (${modeConfig[currentMode]?.name || '不明'})`);
        console.log(`   全基音リスト: ${selectedBaseNotes.map(n => n.note).join(' → ')}`);
        console.log('═══════════════════════════════════════════════════');
        console.log('');
    } else {
        console.error(`❌ 基音配列が不足しています（必要: ${sessionIndex + 1}, 実際: ${selectedBaseNotes.length}）`);
        // フォールバック: 緊急用に即座に選定
        const availableNotes = getAvailableNotes();
        baseNoteInfo = availableNotes[Math.floor(Math.random() * availableNotes.length)];
        console.warn(`⚠️ フォールバック基音選択: ${baseNoteInfo.note}`);
    }
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

        // 【追加】基音再生時のログを強化
        const allSessions = JSON.parse(localStorage.getItem('sessionData')) || [];
        const currentModeSessions = allSessions.filter(s => s.mode === currentMode);
        const sessionIndex = currentModeSessions.length;

        console.log('');
        console.log('🔊🔊🔊 基音再生開始 🔊🔊🔊');
        console.log(`   セッション: ${sessionIndex + 1}/${modeConfig[currentMode].maxSessions}`);
        console.log(`   基音: ${baseNoteInfo.note} (${baseNoteInfo.frequency.toFixed(1)}Hz)`);
        console.log('');

        // 【追加】基音再生前にマイク検出を一時停止（MediaStreamは保持）
        if (audioDetector) {
            console.log('🎤 基音再生前にマイク検出を一時停止');
            try {
                audioDetector.stopDetection();
                console.log('✅ マイク検出停止完了（MediaStreamは保持）');
            } catch (error) {
                console.warn('⚠️ マイク停止エラー（無視して続行）:', error);
            }
        }

        await pitchShifter.playNote(baseNoteInfo.note, 1.0);

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
            // ボタンはドレミガイド完了まで無効のまま（重要！）
            // handleSessionComplete()で結果ページへ遷移するため、ここでは有効化しない
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
    console.log('🎤 マイクをオンにします');

    // AudioDetectionComponent初期化または再開
    try {
        if (!audioDetector) {
            // 初回セッション: 新規作成
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

            // NavigationManagerに登録（遷移時の自動破棄のため）
            if (window.NavigationManager) {
                window.NavigationManager.registerAudioDetector(audioDetector);
            }

            // コールバック設定
            audioDetector.setCallbacks({
                onPitchUpdate: (result) => {
                    handlePitchUpdate(result);
                },
                onError: (context, error) => {
                    console.error(`❌ AudioDetection Error [${context}]:`, error);
                }
            });
        } else {
            // 2回目以降: 既存のAudioDetectorを再開
            console.log('🎤 既存のAudioDetectorを再開');
        }

        // 音声検出開始（初回も2回目以降も実行）
        await audioDetector.startDetection();
        console.log('✅ マイクオン完了 - 音声検出開始');

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

    // 【修正】最初の200msを除外して前の音の余韻を回避
    const stepStartTime = stepData[0].timestamp;
    const validData = stepData.filter(d => d.timestamp - stepStartTime >= 200);

    let bestData;
    if (validData.length === 0) {
        console.warn(`⚠️ Step ${step} (${expectedNoteName}): 有効なデータがありません（全て立ち上がり期間）- 元データから選択`);
        // 有効なデータがない場合は元のstepDataから最も明瞭度が高いものを使用
        bestData = stepData.reduce((best, current) =>
            current.clarity > best.clarity ? current : best
        );
    } else {
        console.log(`✅ Step ${step} (${expectedNoteName}): 最初200ms除外後の有効データ ${validData.length}件`);
        // 有効なデータから最も明瞭度が高いデータを使用
        bestData = validData.reduce((best, current) =>
            current.clarity > best.clarity ? current : best
        );
    }

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

    // 【変更】audioDetectorのクリーンアップはNavigationManagerが自動実行
    // NavigationManager.navigate()で遷移時に自動的にstopDetection() + destroy()が呼ばれる
    // これにより、PitchPro警告アラート発火とpopstateイベント問題を根本解決

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

        // 【修正】現在のモードのセッション数を正しく計算
        const allSessions = JSON.parse(localStorage.getItem('sessionData')) || [];
        const currentModeSessions = allSessions.filter(s => s.mode === currentMode);
        const sessionNumber = currentModeSessions.length;
        console.log(`🔍 [DEBUG] モード別セッション数: ${currentMode}モード=${sessionNumber}セッション (全体=${allSessions.length}セッション)`);

        const config = modeConfig[currentMode];

        // モード別の処理分岐
        if (config.hasIndividualResults) {
            // ランダムモード：個別セッション結果ページへ遷移
            console.log(`📊 ランダムモード：セッション${sessionNumber}の結果ページへ遷移`);

            // 【統一ナビゲーション】NavigationManager.navigate()を使用
            if (window.NavigationManager) {
                window.NavigationManager.navigate('result-session', { session: sessionNumber });
            } else {
                window.location.hash = `result-session?session=${sessionNumber}`;
            }
            return;
        } else {
            // 連続チャレンジモード・12音階モード：自動継続または総合評価へ
            if (sessionNumber < config.maxSessions) {
                // 次のセッションへ自動継続
                console.log(`🔄 セッション${sessionNumber}完了 → セッション${sessionNumber + 1}へ自動継続（1秒後）`);

                const statusText = document.getElementById('training-status');
                const playButton = document.getElementById('play-base-note');

                if (statusText) {
                    statusText.textContent = `セッション${sessionNumber}完了！次のセッションを準備中...`;
                }

                if (playButton) {
                    playButton.innerHTML = '<i data-lucide="loader" style="width: 24px; height: 24px;"></i><span>準備中...</span>';
                    playButton.disabled = true;
                    playButton.classList.add('btn-disabled');
                    lucide.createIcons();
                }

                // UIをリセット
                const circles = document.querySelectorAll('.note-circle');
                circles.forEach(circle => {
                    circle.classList.remove('current', 'completed');
                });

                // セッション進行状況UIを更新
                updateSessionProgressUI();

                // 1秒後に次のセッションを自動開始
                setTimeout(() => {
                    console.log(`🎵 セッション${sessionNumber + 1}開始`);

                    // 次のセッションのために基音を事前選択
                    preselectBaseNote();

                    // トレーニング開始
                    startTraining();
                }, 1000);

                return;
            } else {
                // 全セッション完了：総合評価ページへ遷移
                console.log(`✅ 全${config.maxSessions}セッション完了！総合評価ページへ遷移`);

                // 【統一ナビゲーション】NavigationManager.navigate()を使用
                if (window.NavigationManager) {
                    window.NavigationManager.navigate('results-overview', { mode: currentMode });
                } else {
                    window.location.hash = `results-overview?mode=${currentMode}`;
                }
                return;
            }
        }
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
    usedBaseNotes = []; // 使用済み基音リストをリセット

    // ブラウザバック防止はrouter.jsで自動解除されます

    console.log('TrainingController reset');
}

// グローバルに公開（router.jsから呼び出し可能にする）
window.resetTrainingPageFlag = resetTrainingPageFlag;

// Page Visibilityハンドラーは削除
// PitchProの独自エラーダイアログに任せる仕様に変更

/**
 * セッション進行状況UIを更新
 */
function updateSessionProgressUI() {
    // 【修正】現在のモードのセッション数を正しく計算
    const allSessions = JSON.parse(localStorage.getItem('sessionData')) || [];
    const currentModeSessions = allSessions.filter(s => s.mode === currentMode);
    const sessionCounter = currentModeSessions.length;
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

    // 【追加】ページサブタイトルを更新
    const pageSubtitle = document.querySelector('.page-subtitle');
    if (pageSubtitle) {
        pageSubtitle.textContent = `セッション ${currentSession}/${totalSessions} 実施中`;
        console.log(`✅ サブタイトル更新: セッション ${currentSession}/${totalSessions} 実施中`);
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
            console.log('✅ 音域データ読み込み完了:', voiceRangeData);
            console.log('📋 voiceRangeData.results:', voiceRangeData.results);
            console.log('📋 voiceRangeData keys:', Object.keys(voiceRangeData));
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

    // 全音域を使用（快適範囲ではなく全範囲を使用）
    // 理由: 基音+1オクターブの範囲が必要なため、全音域から基音範囲を計算
    const rangeData = voiceRangeData.results;
    const { lowFreq, highFreq } = rangeData;

    console.log(`🎤 使用する音域: ${lowFreq.toFixed(1)}Hz - ${highFreq.toFixed(1)}Hz (${(Math.log2(highFreq / lowFreq)).toFixed(2)}オクターブ)`);
    console.log(`🎵 PitchShifter音符範囲: ${allNotes[0].note} (${allNotes[0].frequency.toFixed(1)}Hz) - ${allNotes[allNotes.length - 1].note} (${allNotes[allNotes.length - 1].frequency.toFixed(1)}Hz)`);
    console.log(`📐 基音として使える範囲: ${lowFreq.toFixed(1)}Hz - ${(highFreq / 2).toFixed(1)}Hz (基音+1オクターブが${highFreq.toFixed(1)}Hzに収まる)`);
    console.log(`📐 基音範囲のオクターブ数: ${(Math.log2((highFreq / 2) / lowFreq)).toFixed(2)}オクターブ`);

    // 音域内の音符のみをフィルタリング（基音+1オクターブが収まる範囲）
    let availableNotes = allNotes.filter(note => {
        const topFreq = note.frequency * 2; // 基音+1オクターブ
        const isInRange = note.frequency >= lowFreq && topFreq <= highFreq;
        return isInRange;
    });

    console.log(`🎵 理想的な基音（基音+1オクターブが完全に音域内）: ${availableNotes.length}音`);
    if (availableNotes.length > 0) {
        console.log(`   範囲: ${availableNotes[0].note} (${availableNotes[0].frequency.toFixed(1)}Hz) - ${availableNotes[availableNotes.length - 1].note} (${availableNotes[availableNotes.length - 1].frequency.toFixed(1)}Hz)`);
    }

    // 【連続チャレンジモード・12音階モード】12音に満たない場合は、音域上限側から追加
    // オクターブ相対音感トレーニングとして12音は必須
    if (availableNotes.length < 12 && (currentMode === 'continuous' || currentMode === '12tone')) {
        const neededNotes = 12 - availableNotes.length;
        const modeName = currentMode === 'continuous' ? '連続チャレンジモード' : '12音階モード';
        console.warn(`⚠️ [${modeName}] 音域不足: ${availableNotes.length}音 → 12音に拡張（${neededNotes}音追加）`);
        console.warn(`   推奨: 2.0オクターブ以上の音域（現在: ${(Math.log2(highFreq / lowFreq)).toFixed(2)}オクターブ）`);
        console.warn(`   ※ テスト期間中のため、音域不足でも12音確保を優先`);

        // 音域内の基音のうち、最高音を見つける
        const highestAvailableNote = availableNotes[availableNotes.length - 1];

        // 全音符リストから、最高基音より上の音を取得
        // 基音自体は音域内に収めるが、基音+1オクターブは音域外にはみ出すことを許容
        const higherNotes = allNotes.filter(note =>
            note.frequency > highestAvailableNote.frequency &&
            note.frequency <= highFreq // 基音自体は音域内に収める
        );

        console.log(`   候補: ${higherNotes.length}音 (${higherNotes.map(n => n.note).join(', ')})`);

        // 必要な分だけ追加
        const notesToAdd = higherNotes.slice(0, neededNotes);
        availableNotes = [...availableNotes, ...notesToAdd];

        console.log(`✅ 12音確保完了: ${availableNotes.map(n => n.note).join(', ')}`);
        console.log(`   ※ 追加された${neededNotes}音は基音+1オクターブが音域上限を若干超えますが、`);
        console.log(`     オクターブ相対音感トレーニングとして12音使用を優先します`);
    }

    console.log(`🎵 最終的な利用可能基音: ${availableNotes.length}音`);

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
 * 【統合】全セッション分の基音を一括選定
 * トレーニング開始時に呼び出し、全セッションの基音を事前に確定
 *
 * @param {Object} config - モード設定 (modeConfig[mode])
 * @returns {Array} 選定された基音の配列
 */
function selectAllBaseNotesForMode(config) {
    const availableNotes = getAvailableNotes();
    const maxSessions = config.maxSessions;
    const selectionType = config.baseNoteSelection;

    console.log(`📋 全${maxSessions}セッション分の基音を事前選定開始 (${selectionType})`);

    let selectedNotes;

    switch (selectionType) {
        case 'random_c3_octave':
            selectedNotes = selectRandomMode(availableNotes, maxSessions);
            break;
        case 'random_chromatic':
            selectedNotes = selectContinuousMode(availableNotes, maxSessions);
            break;
        case 'sequential_chromatic':
            selectedNotes = selectSequentialMode(availableNotes, maxSessions);
            break;
        default:
            console.error(`❌ 未知の選択タイプ: ${selectionType}`);
            selectedNotes = [];
    }

    console.log(`✅ 全${selectedNotes.length}セッション分の基音選定完了: ${selectedNotes.map(n => n.note).join(' → ')}`);
    return selectedNotes;
}

/**
 * ランダム基音モード（初級）: 白鍵のみ、ゾーン分割、重複なし
 */
function selectRandomMode(availableNotes, maxSessions) {
    const whiteKeys = availableNotes.filter(note => !note.note.includes('#'));
    console.log(`🎹 白鍵のみフィルタリング: ${availableNotes.length}音 → ${whiteKeys.length}音`);

    const octaves = getVoiceRangeOctaves();
    const numZones = octaves >= 2.0 ? 4 : octaves >= 1.5 ? 3 : 1;
    const selectedNotes = [];

    if (numZones === 1) {
        // 音域狭い: 完全ランダム（重複なし）
        const shuffled = [...whiteKeys].sort(() => Math.random() - 0.5);
        for (let i = 0; i < maxSessions && i < shuffled.length; i++) {
            selectedNotes.push(shuffled[i]);
        }
    } else {
        // ゾーン分割選択（重複なし）
        const sessionsPerZone = Math.ceil(maxSessions / numZones);
        const notesPerZone = Math.ceil(whiteKeys.length / numZones);

        for (let session = 0; session < maxSessions; session++) {
            const currentZone = Math.floor(session / sessionsPerZone);
            const zoneStart = currentZone * notesPerZone;
            const zoneEnd = Math.min((currentZone + 1) * notesPerZone, whiteKeys.length);
            const zoneNotes = whiteKeys.slice(zoneStart, zoneEnd);

            // ゾーン内で未使用の音を選択
            const unusedInZone = zoneNotes.filter(note =>
                !selectedNotes.some(selected => selected.note === note.note)
            );

            if (unusedInZone.length > 0) {
                selectedNotes.push(unusedInZone[Math.floor(Math.random() * unusedInZone.length)]);
            } else {
                // ゾーン内に未使用がない場合は全体から選択
                const unusedAll = whiteKeys.filter(note =>
                    !selectedNotes.some(selected => selected.note === note.note)
                );
                if (unusedAll.length > 0) {
                    selectedNotes.push(unusedAll[Math.floor(Math.random() * unusedAll.length)]);
                }
            }
        }
    }

    return selectedNotes;
}

/**
 * 連続チャレンジモード（中級）: 全音、重複なし（12セッション）
 */
function selectContinuousMode(availableNotes, maxSessions) {
    console.log(`📊 連続チャレンジモード: ${availableNotes.length}音から${maxSessions}セッション選定（重複なし）`);

    const selectedNotes = [];

    // 初回はランダム
    selectedNotes.push(availableNotes[Math.floor(Math.random() * availableNotes.length)]);

    // 2回目以降は重複を避けて選択
    for (let session = 1; session < maxSessions; session++) {
        const candidates = availableNotes.filter(note =>
            !selectedNotes.some(selected => selected.note === note.note)
        );

        if (candidates.length === 0) {
            console.error(`❌ セッション${session + 1}: 候補なし（重複回避失敗）`);
            break;
        }

        selectedNotes.push(candidates[Math.floor(Math.random() * candidates.length)]);
    }

    return selectedNotes;
}

/**
 * 12音階モード（上級）: クロマチック12音を順次使用
 */
function selectSequentialMode(availableNotes, maxSessions) {
    console.log(`🎹 12音階モード: クロマチック順次選択`);

    const selectedNotes = [];
    for (let session = 0; session < maxSessions; session++) {
        selectedNotes.push(availableNotes[session % availableNotes.length]);
    }

    return selectedNotes;
}
// 【削除】古い実装（selectNoteFromZone, selectNoteWithDistance, selectBaseNote）は削除しました
// 新しい実装（selectAllBaseNotesForMode）を使用してください
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
            // 【統一ナビゲーション】NavigationManager.navigate()を使用
            // NavigationManagerが自動的にaudioDetector破棄、beforeunload/popstate無効化を実行
            if (window.NavigationManager) {
                window.NavigationManager.navigate('home');
            } else {
                window.location.hash = 'home';
            }
            console.log('🏠 ユーザーがホームへの移動を承認');
        } else {
            console.log('🚫 ホームへの移動をキャンセル');
        }
    });

    console.log('✅ ホームボタンに確認ダイアログを設定');
}

/**
 * ブラウザバック防止はrouter.jsでグローバルに管理されています
 * （この機能は削除されました - router.jsを参照）
 */
