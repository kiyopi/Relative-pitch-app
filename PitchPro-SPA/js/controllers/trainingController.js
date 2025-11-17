/**
 * Training Controller - Integrated Implementation
 * PitchPro AudioDetectionComponent + PitchShifter統合版
 *
 * 🔥 VERSION: v4.0.17 (2025-11-16) - 消えた時の背景を音量バー風に改善
 *
 * 【v4.0.17修正内容】
 * - 消えた時の背景改善: 音量バー背景と同じスタイルに変更
 * - background: rgba(255, 255, 255, 0.12) + border: rgba(255, 255, 255, 0.15)
 * - opacity: 0.3 → 1.0で視認性向上
 * - 青バーは元の#60a5faに戻す
 *
 * 【v4.0.15修正内容】
 * - レイアウトずれ修正: border追加時の高さ変化を防止
 * - box-sizing設定: borderを含めて高さ10pxに統一
 * - 常時border確保: transparent borderで高さを一定に保つ
 *
 * 【v4.0.14修正内容】
 * - インターバルバー色修正: 濃い青に戻して視認性向上（opacity: 0.3 → 1.0）
 * - 連続セッション対応: ドレミガイド終了時にインターバルを確実にリセット
 * - アニメーション方向修正: 濃い青 → 薄い白の正しい方向に修正
 *
 * 【v4.0.13修正内容】
 * - CSS Animation化: 基音再生中のDOM操作を完全排除（残りブチ音対策）
 * - setInterval削除: 833ms間隔の4回のDOM操作を完全削除
 * - iPhone/PC挙動統一: アニメーションリセット処理でデバイス間の差異を解消
 * - レスポンス最適化: 基音再生前に1回のみDOM操作、再生中は完全にCSS任せ
 *
 * 【v4.0.12修正内容】
 * - 非同期処理検証: 非同期化による効果なし・潜在的リスクあり
 * - 同期処理に戻す: AudioDetectorの状態管理の安定性を優先
 * - 処理順序保証: stopDetection完了後に基音再生、2.5秒後にstartDetection
 *
 * 【v4.0.11修正内容】
 * - getUserMedia()削除: リファクタリング前の実装に戻し、レスポンス速度を改善
 * - レスポンス最適化: ボタン押下から基音再生までの遅延を最小化
 * - マイク許可: 準備ページで確認済み、AudioDetectionComponent初期化時に自動検出
 *
 * 【v4.0.10修正内容】（2025-11-16）
 * - DOM操作完全排除: 基音再生中のsetAttribute/innerHTML/textContent等を全削除
 * - ブチ音根本対策: Tone.jsオーディオレンダリングとDOM操作の競合を完全回避
 * - シンプル化: ボタンはdisabled制御のみ、状態表示は削除
 *
 * 【v4.0.9修正内容】（2025-11-16）
 * - innerHTML完全排除: 基音再生ボタンの全状態をdata-state属性で管理（8箇所）
 * - タイミング完璧化: DOM操作ゼロでメインスレッドブロック完全回避
 * - ブチ音解消: Lucide初期化処理を完全削除、オーディオ処理との競合ゼロ
 * - ラグ解消: 属性変更のみ（超高速）、innerHTML/createIcons()のオーバーヘッド完全削除
 *
 * 【v4.0.8修正内容】（2025-11-16）
 * - 音量リセット問題修正: グローバルインスタンス使用時、準備フェーズの音量設定を維持
 * - Lucide初期化最適化: innerHTML後に統一関数を使用（Safari互換性保証、6箇所）
 * - タイミング最適化: ドレミガイド開始タイミングのコメントを正確に修正
 */

console.log('🔥🔥🔥 TrainingController.js VERSION: v4.0.17 (2025-11-16) LOADED 🔥🔥🔥');

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
let currentLessonId = null;      // 現在のレッスンID
let currentScaleDirection = 'ascending';  // 現在の音階方向（'ascending', 'descending'）

// 【v4.0.0追加】SessionManager統合
let sessionManager = null;       // セッション管理専門クラス

// 相対音程（ドレミ...）と半音ステップの対応
// 【下行モード対応】音階方向に応じて動的に変更されるため let に変更
let intervals = ['ド', 'レ', 'ミ', 'ファ', 'ソ', 'ラ', 'シ', 'ド'];
let semitoneSteps = [0, 2, 4, 5, 7, 9, 11, 12]; // ド=0, レ=+2半音, ミ=+4半音...

/**
 * 音階方向に応じた音階ステップを生成
 * @param {string} direction - 'ascending' または 'descending'
 * @returns {Object} { intervals: string[], semitoneSteps: number[] }
 */
function getScaleSteps(direction) {
    if (direction === 'descending') {
        return {
            intervals: ['ド', 'シ', 'ラ', 'ソ', 'ファ', 'ミ', 'レ', 'ド'],
            semitoneSteps: [0, -2, -4, -5, -7, -9, -11, -12]
        };
    } else {
        return {
            intervals: ['ド', 'レ', 'ミ', 'ファ', 'ソ', 'ラ', 'シ', 'ド'],
            semitoneSteps: [0, 2, 4, 5, 7, 9, 11, 12]
        };
    }
}

/**
 * ドレミガイドのHTMLを動的に生成
 * @param {string[]} intervals - 音程名の配列 ['ド', 'レ', 'ミ', ...] または ['ド', 'シ', 'ラ', ...]
 */
function updateDoremiGuide(intervals) {
    const noteCirclesContainer = document.querySelector('.note-circles');
    if (!noteCirclesContainer) {
        console.warn('⚠️ .note-circles要素が見つかりません');
        return;
    }

    // 既存のnote-circleを全削除
    noteCirclesContainer.innerHTML = '';

    // 新しいnote-circleを生成
    intervals.forEach((noteName, index) => {
        const noteCircle = document.createElement('div');
        noteCircle.className = 'note-circle';
        noteCircle.setAttribute('data-note', noteName);
        noteCircle.textContent = noteName;
        noteCirclesContainer.appendChild(noteCircle);
    });

    console.log(`🎵 ドレミガイド更新: ${intervals.join('→')}`);
}

/**
 * 音階方向・基音方向のバッジを動的に生成
 * @param {string} scaleDirection - 音階方向 'ascending' | 'descending'
 * @param {string|null} chromaticDirection - 基音方向 'up' | 'down' | 'both' | null (12音階モードのみ)
 */
function updateDirectionBadges(scaleDirection, chromaticDirection = null) {
    const container = document.getElementById('direction-badges-container');
    if (!container) {
        console.warn('⚠️ direction-badges-container要素が見つかりません');
        return;
    }

    // 既存のバッジを全削除
    container.innerHTML = '';

    // 音階方向バッジ（常に表示）
    const scaleBadge = document.createElement('span');
    scaleBadge.className = `direction-badge ${scaleDirection}`;
    scaleBadge.textContent = scaleDirection === 'ascending' ? '上行' : '下行';
    container.appendChild(scaleBadge);

    // 基音方向バッジ（12音階モードのみ）
    if (chromaticDirection) {
        const chromaticBadge = document.createElement('span');
        chromaticBadge.className = `direction-badge chromatic-${chromaticDirection}`;
        
        let badgeText = '';
        if (chromaticDirection === 'up') badgeText = '上昇';
        else if (chromaticDirection === 'down') badgeText = '下降';
        else if (chromaticDirection === 'both') badgeText = '両方向';
        
        chromaticBadge.textContent = badgeText;
        container.appendChild(chromaticBadge);
    }

    console.log(`🏷️ バッジ更新: 音階=${scaleDirection}, 基音=${chromaticDirection || 'なし'}`);
}

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
    const directionParam = params.get('direction'); // クロマチック方向パラメータ（12音階モード用）
    const scaleDirectionParam = params.get('scaleDirection'); // 音階方向パラメータ（'ascending', 'descending'）

    console.log('🔍 [DEBUG] modeパラメータ:', modeParam);
    console.log('🔍 [DEBUG] directionパラメータ:', directionParam);
    console.log('🔍 [DEBUG] scaleDirectionパラメータ:', scaleDirectionParam);

    if (modeParam && modeConfig[modeParam]) {
        currentMode = modeParam;
        console.log(`✅ モード設定: ${currentMode} (${modeConfig[currentMode].title})`);
    } else {
        console.warn(`⚠️ モードパラメータ不正: ${modeParam} - デフォルト(random)を使用`);
        console.warn(`🔍 [DEBUG] 利用可能なモード:`, Object.keys(modeConfig));
        currentMode = 'random';
    }

    // 音階方向の設定
    // まずURLパラメータをチェック、なければsessionStorageから取得
    const scaleDirectionFromStorage = sessionStorage.getItem('trainingDirection');
    currentScaleDirection = scaleDirectionParam || scaleDirectionFromStorage || 'ascending';
    console.log(`✅ 音階方向設定: ${currentScaleDirection} (URLパラメータ: ${scaleDirectionParam}, sessionStorage: ${scaleDirectionFromStorage})`);

    // 音階ステップの動的生成
    const scaleSteps = getScaleSteps(currentScaleDirection);
    intervals = scaleSteps.intervals;
    semitoneSteps = scaleSteps.semitoneSteps;
    console.log(`🎵 音階ステップ設定: ${intervals.join('→')}`);
    console.log(`🎵 半音ステップ: ${semitoneSteps.join(', ')}`);

    // ドレミガイドを更新（DOM読み込み後に実行）
    setTimeout(() => {
        updateDoremiGuide(intervals);
    }, 100);

    // 12音階モード方向をグローバル変数に保存
    let chromaticDirectionForBadge = null;
    if (currentMode === '12tone' && directionParam) {
        window.currentTrainingDirection = directionParam;
        chromaticDirectionForBadge = directionParam;
        console.log(`✅ 12音階モード方向: ${directionParam}`);

        // 両方向の場合はmaxSessionsを24に変更
        if (directionParam === 'both') {
            modeConfig['12tone'].maxSessions = 24;
            console.log(`✅ 12音階モード両方向: maxSessions=24に設定`);
        } else {
            modeConfig['12tone'].maxSessions = 12;
            console.log(`✅ 12音階モード片方向: maxSessions=12に設定`);
        }
    }

    // 音階方向・基音方向バッジを更新（DOM読み込み後に実行）
    setTimeout(() => {
        updateDirectionBadges(currentScaleDirection, chromaticDirectionForBadge);
    }, 100);

    // レッスンID生成（トレーニング全体で1つのレッスンID）
    // sessionStorageから復元を試みる（個別結果画面からの戻り対応）
    const storedLessonId = sessionStorage.getItem('currentLessonId');

    // 【修正v4.0.1】sessionStorageのlessonIdが現在のモードと一致するか確認
    // 【追加v4.0.1】完了済みレッスンの復元を防止
    let isValidStoredLessonId = false;
    if (storedLessonId) {
        // lessonIdからモード情報を抽出（lesson_1234567890_mode_dir_scaleDir形式）
        const lessonIdParts = storedLessonId.split('_');
        const storedMode = lessonIdParts.length >= 3 ? lessonIdParts[2] : null;

        if (storedMode !== currentMode) {
            console.warn(`⚠️ lessonId検証失敗: モード不一致 (stored=${storedMode}, current=${currentMode})`);
            console.warn(`   前のモードのlessonIdが残っていました - 新規生成します`);
            SessionManager.clearSessionStorage();
        } else {
            // モード一致確認後、完了済みレッスンかチェック
            const lessonSessions = window.SessionDataManager
                ? window.SessionDataManager.getSessionsByLessonId(storedLessonId)
                : [];

            // 動的にmaxSessionsを取得（12音階モード対応）
            const tempOptions = {
                chromaticDirection: directionParam || 'random',
                scaleDirection: currentScaleDirection
            };
            const expectedMaxSessions = window.ModeController.getSessionsPerLesson(currentMode, tempOptions);

            if (lessonSessions.length >= expectedMaxSessions) {
                console.warn(`⚠️ lessonId検証失敗: 完了済みレッスン (${lessonSessions.length}/${expectedMaxSessions}セッション)`);
                console.warn(`   完了済みレッスンのlessonIdが残っていました - 新規生成します`);
                SessionManager.clearSessionStorage();
            } else {
                isValidStoredLessonId = true;
                console.log(`✅ lessonId検証成功: モード一致 + 未完了 (${lessonSessions.length}/${expectedMaxSessions}セッション)`);
            }
        }
    }

    if (isValidStoredLessonId) {
        // sessionStorageに保存されたlessonIdを復元（モード一致確認済み）
        currentLessonId = storedLessonId;
        console.log(`✅ レッスンID復元（sessionStorage）: ${currentLessonId}`);
    } else if (!currentLessonId) {
        // 初回のみ生成
        const timestamp = Date.now();
        const chromaticDir = directionParam || 'random';
        currentLessonId = `lesson_${timestamp}_${currentMode}_${chromaticDir}_${currentScaleDirection}`;
        console.log(`✅ レッスンID生成（初回）: ${currentLessonId}`);

        // sessionStorageに保存（個別結果画面から戻る際の保持用）
        sessionStorage.setItem('currentLessonId', currentLessonId);
    } else {
        console.log(`✅ レッスンID継続使用: ${currentLessonId}`);
    }

    // 【v4.0.0追加】SessionManager初期化
    try {
        const sessionOptions = {
            chromaticDirection: directionParam || 'random',
            scaleDirection: currentScaleDirection
        };
        sessionManager = new SessionManager(currentMode, currentLessonId, sessionOptions);
        console.log(`✅ SessionManager初期化完了: ${sessionManager.getProgressText()}`);

        // グローバルインスタンスとして登録（v2.0.0統合）
        SessionManager.setCurrent(sessionManager);

        // sessionStorageに保存（個別結果画面から戻る際の保持用）
        sessionManager.saveToSessionStorage();
    } catch (error) {
        console.error('❌ SessionManager初期化エラー:', error);
        throw new Error('SessionManager初期化に失敗しました');
    }

    // Wait for Lucide
    await waitForLucide();

    // Load voice range data
    loadVoiceRangeData();

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

        // 【v4.0.9】初期状態（data-state属性で管理）
        newButton.setAttribute('data-state', 'idle');

        newButton.addEventListener('click', () => {
            console.log('🎯 ボタンクリック検出');
            startTraining();
        });
        console.log('✅ イベントリスナー登録完了（再登録）');
    } else {
        console.error('❌ play-base-noteボタンが見つかりません');
    }

    // ホームボタンはフッターナビゲーションで管理（index.html の handleFooterHomeButtonClick）
    // setupHomeButton(); // 削除: フッターで確認ダイアログ付きホームボタンを提供

    // ブラウザバック防止はrouter.jsで自動管理されます

    isInitialized = true;
    console.log('TrainingController initialized');
}

function waitForLucide() {
    return new Promise((resolve) => {
        if (typeof lucide !== 'undefined') {
            if (typeof window.initializeLucideIcons === 'function') window.initializeLucideIcons({ immediate: true });
            resolve();
        } else {
            const interval = setInterval(() => {
                if (typeof lucide !== 'undefined') {
                    clearInterval(interval);
                    if (typeof window.initializeLucideIcons === 'function') window.initializeLucideIcons({ immediate: true });
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

    // 音階方向を取得
    const scaleDirection = sessionStorage.getItem('trainingDirection') || 'ascending';

    // ModeControllerでページヘッダーを一括更新
    if (window.ModeController) {
        window.ModeController.updatePageHeader(currentMode, {
            chromaticDirection: window.currentTrainingDirection, // 12音階モードの基音方向
            scaleDirection: scaleDirection,
            subtitleText: sessionManager.getProgressDetailText() // サブタイトルテキスト
        });
    } else {
        console.error('❌ ModeControllerが見つかりません');
    }
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
    // 【修正v4.0.0】SessionManager統合: 重複コード削減
    const sessionIndex = sessionManager.getCurrentSessionCount();

    // 事前選定済みの配列から取得
    if (selectedBaseNotes && selectedBaseNotes.length > sessionIndex) {
        baseNoteInfo = selectedBaseNotes[sessionIndex];

        // 【追加】基音セット時のログを目立つように出力
        console.log('');
        console.log('═══════════════════════════════════════════════════');
        console.log(`🎼 [セッション ${sessionIndex + 1}/${selectedBaseNotes.length}] 基音セット完了`);
        console.log(`   現在の基音: ${baseNoteInfo.note} (${baseNoteInfo.frequency.toFixed(1)}Hz)`);
        console.log(`   選定モード: ${currentMode} (${modeConfig[currentMode]?.title || '不明'})`);
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

// ========================================
// デバイス検出（DeviceDetectorモジュール使用）
// ========================================
// 以下の関数はDeviceDetectorモジュールに統合済み
// window.DeviceDetector.getDeviceType()
// window.DeviceDetector.getDeviceVolume()
// 互換性のために残してあるラッパー関数（将来的に削除推奨）

/**
 * @deprecated DeviceDetector.getDeviceType()を使用してください
 */
function getDeviceType() {
    return window.DeviceDetector.getDeviceType();
}

/**
 * @deprecated DeviceDetector.getDeviceVolume()を使用してください
 */
function getDeviceVolume() {
    return window.DeviceDetector.getDeviceVolume();
}

// PitchShifter初期化（シングルトンパターン + グローバルインスタンス活用）
async function initializePitchShifter() {
    // 1. グローバルインスタンスが既に初期化済みなら使用
    if (window.pitchShifterInstance && window.pitchShifterInstance.isInitialized) {
        console.log('✅ Using global PitchShifter instance (initialized from home page)');
        pitchShifter = window.pitchShifterInstance;

        // 【v4.0.8修正】グローバルインスタンスは準備フェーズで音量調整済み
        // ユーザーの音量スライダー設定を尊重するため、setVolume()を呼ばない
        console.log('🔊 準備フェーズの音量設定を維持（ユーザー調整を尊重）');

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
        // 【v4.0.11】getUserMedia()削除 - レスポンス速度改善
        // リファクタリング前の実装に戻す（マイク許可は準備ページで確認済み）
        // バックグラウンド復帰後のマイク失効は、AudioDetectionComponent初期化時に
        // 自動的に検出・エラー表示されるため、ここでの確認は不要

        // 初回クリック時はPitchShifter初期化を実行
        if (!pitchShifter || !pitchShifter.isInitialized) {
            console.log('⏳ 初回クリック - PitchShifter初期化開始');
            await initializePitchShifter();
            console.log('✅ 初期化完了！次回から即座に再生されます');
        }

        // 【v4.0.10】基音再生中はDOM操作を一切しない
        // DOM操作（setAttribute, innerHTML, textContent等）は
        // Tone.jsのオーディオレンダリングと競合してブチ音の原因になる

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

        // 【修正v4.0.0】SessionManager統合: 重複コード削減
        console.log('');
        console.log('🔊🔊🔊 基音再生開始 🔊🔊🔊');
        console.log(`   セッション: ${sessionManager.getProgressText()}`);
        console.log(`   基音: ${baseNoteInfo.note} (${baseNoteInfo.frequency.toFixed(1)}Hz)`);
        console.log('');

        // 【v4.0.12】同期処理: AudioDetectorの状態管理の安定性を優先
        // stopDetection完了を待ってから基音再生を開始（処理順序を保証）
        if (audioDetector) {
            console.log('🎤 基音再生前にマイク検出を一時停止');
            try {
                await audioDetector.stopDetection();
                console.log('✅ マイク検出停止完了（MediaStreamは保持）');
            } catch (error) {
                console.warn('⚠️ マイク停止エラー（無視して続行）:', error);
            }
        }

        await pitchShifter.playNote(baseNoteInfo.note, 1.0);

        // セッションデータ記録開始
        if (window.sessionDataRecorder) {
            sessionRecorder = window.sessionDataRecorder;

            // セッションオプション設定
            const chromaticDirection = window.currentTrainingDirection || 'random';
            const sessionOptions = {
                lessonId: currentLessonId,                     // レッスンID（必須）
                chromaticDirection: chromaticDirection,        // 基音進行方向
                scaleDirection: currentScaleDirection,         // 音階方向
                // 後方互換性のため旧directionフィールドも含める
                direction: chromaticDirection
            };

            sessionRecorder.startNewSession(baseNoteInfo.note, baseNoteInfo.frequency, currentMode, sessionOptions);
            console.log('📊 セッションデータ記録開始');
            console.log(`   lessonId: ${currentLessonId}`);
            console.log(`   mode: ${currentMode}`);
            console.log(`   chromaticDirection: ${chromaticDirection}`);
            console.log(`   scaleDirection: ${currentScaleDirection}`);
        } else {
            console.warn('⚠️ SessionDataRecorderが読み込まれていません');
        }

        // 基音再生と同時にインターバルカウントダウン開始（2.5秒、各0.5秒）
        console.log('⏱️ ドレミガイド開始インターバル開始（2.5秒）');
        startIntervalCountdown(progressSquares);

        // 【v4.0.8】2.5秒後にドレミガイド開始
        // 基音総再生時間: attack(0.02s) + sustain(1.0s) + release(2.5s) = 3.52s
        // ドレミガイド開始時は基音のreleaseフェーズ中（自然な音の重なり）
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
        // 【v4.0.10】DOM操作完全排除 - ブチ音対策
        if (statusText) {
            statusText.textContent = 'エラーが発生しました';
        }
        alert(`エラーが発生しました: ${error.message}`);
    }
}

// 【v4.0.13】CSS Animation方式: 基音再生中のDOM操作を完全排除
// インターバルカウントダウン（2.5秒間、3ブロック）
function startIntervalCountdown(squares) {
    if (squares.length === 0) return;

    // 親要素を取得
    const progressSquaresContainer = squares[0].parentElement;
    if (!progressSquaresContainer) return;

    // 1. リセット: アニメーションクラスを削除（即座にリセット）
    progressSquaresContainer.classList.remove('countdown-active');

    // 2. 各squareにanimation-delay設定（0ms, 833ms, 1666ms）
    const blocksToUse = 3;
    const blockInterval = 833; // 約833ms

    squares.forEach((sq, index) => {
        if (index < blocksToUse) {
            sq.style.animationDelay = `${index * blockInterval}ms`;
        }
    });

    // 3. 次のフレームでアニメーション開始（1回のDOM操作のみ）
    // requestAnimationFrameで確実にリセット後にアニメーション開始
    requestAnimationFrame(() => {
        progressSquaresContainer.classList.add('countdown-active');
        console.log('⏱️ インターバルカウントダウン開始（CSS Animation）');
        console.log('   0ms: 1個目 | 833ms: 2個目 | 1666ms: 3個目');
    });

    // 4. 2.5秒後に完了ログ出力（視覚確認用）
    setTimeout(() => {
        console.log('✅ インターバル完了（2.5秒）- CSS Animation方式');
    }, 2500);
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

            // 統一設定モジュールを使用（倍音補正・周波数範囲を統一管理）
            audioDetector = new window.PitchPro.AudioDetectionComponent(
                window.PitchProConfig.getDefaultConfig({
                    volumeBarSelector: '.mic-recognition-section .progress-fill',
                    volumeTextSelector: null,
                    frequencySelector: null,
                    noteSelector: null,
                    smoothing: 0.1  // 🔥 DeviceDetectionの0.25を上書き（CPU負荷軽減）
                })
            );

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

            // 🔥 v1.3.2対応: UIキャッシュを明示的に再構築
            console.log('🔄 UIキャッシュを再構築中...');
            await audioDetector.updateSelectors({
                volumeBarSelector: '.mic-recognition-section .progress-fill'
            });
            console.log('✅ UIキャッシュ再構築完了');
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
        const semitoneDiff = semitoneSteps[i];
        const sign = semitoneDiff >= 0 ? '+' : '';
        console.log(`🎵 音程: ${intervals[i]} (${sign}${semitoneDiff}半音, 期待: ${expectedFreq.toFixed(1)}Hz)`);

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
    if (result.frequency && result.clarity > 0.25) {
        // 1秒に1回だけログ出力
        if (!lastPitchLog || Date.now() - lastPitchLog > 1000) {
            console.log(`🎵 音程検出: ${result.frequency.toFixed(1)}Hz (${result.note || ''}), 明瞭度: ${result.clarity.toFixed(2)}, 音量: ${(result.volume * 100).toFixed(1)}%`);
            lastPitchLog = Date.now();
        }

        // 音程データをバッファに追加（明瞭度0.25以上で収集 - 精度とデータ量のバランス最適化）
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

        // 【修正v3.4.0】現在のlessonIdのセッション数を正しく計算（モード全体ではなくレッスン単位）
        // 【v3.5.0】SessionDataManagerを使用して統一管理
        const sessionNumber = window.SessionDataManager
            ? window.SessionDataManager.getSessionCount({ lessonId: currentLessonId })
            : 0;
        const totalSessions = window.SessionDataManager
            ? window.SessionDataManager.getSessionCount()
            : 0;
        console.log(`🔍 [DEBUG] レッスン別セッション数: lessonId=${currentLessonId}, ${sessionNumber}セッション (全体=${totalSessions}セッション)`);

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
            // 【修正v4.0.0】SessionManager統合: isLessonComplete()で判定
            if (!sessionManager.isLessonComplete()) {
                // 次のセッションへ自動継続
                console.log(`🔄 セッション${sessionNumber}完了 → セッション${sessionNumber + 1}へ自動継続（1秒後）`);

                const statusText = document.getElementById('training-status');
                const playButton = document.getElementById('play-base-note');

                if (statusText) {
                    statusText.textContent = `セッション${sessionNumber}完了！次のセッションを準備中...`;
                }

                if (playButton) {
                    // 【v4.0.10】DOM操作完全排除 - ブチ音対策
                    playButton.disabled = true;
                    playButton.classList.add('btn-disabled');
                }

                // UIをリセット
                const circles = document.querySelectorAll('.note-circle');
                circles.forEach(circle => {
                    circle.classList.remove('current', 'completed');
                });

                // 【v4.0.14】インターバルカウントダウンをリセット（連続チャレンジ用）
                const progressSquares = document.querySelectorAll('#progress-squares .progress-square');
                if (progressSquares.length > 0 && progressSquares[0].parentElement) {
                    progressSquares[0].parentElement.classList.remove('countdown-active');
                    console.log('🔄 インターバルカウントダウンリセット（次セッション準備）');
                }

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
                // 【修正v4.0.0】SessionManager統合: getMaxSessions()使用
                console.log(`✅ 全${sessionManager.getMaxSessions()}セッション完了！総合評価ページへ遷移`);

                // 【重要】完了したレッスンのlessonIdを保存（遷移前にリセットしない）
                const completedLessonId = currentLessonId;
                console.log(`📋 完了したレッスンID: ${completedLessonId}`);

                // レッスンID・音階方向をリセット（次回トレーニング用）
                currentLessonId = null;
                currentScaleDirection = 'ascending';

                // 【修正v4.0.1】SessionManager統合: clearSessionStorage()使用
                SessionManager.clearSessionStorage();
                console.log('🔄 currentLessonId・currentScaleDirectionをリセット（sessionStorageクリア）');

                // 【統一ナビゲーション】NavigationManager.navigate()を使用
                // 【修正v3.5.0】lessonIdを渡して、完了したレッスンのみを表示
                if (window.NavigationManager) {
                    window.NavigationManager.navigate('results-overview', {
                        mode: currentMode,
                        lessonId: completedLessonId  // 完了したレッスンのみ表示
                    });
                } else {
                    window.location.hash = `results-overview?mode=${currentMode}&lessonId=${completedLessonId}`;
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

    // 【v4.0.9】ボタンを「もう一度」に変更 - innerHTML排除・タイミング完璧化
    const button = document.getElementById('play-base-note');
    button.setAttribute('data-state', 'retry');
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

    if (typeof window.initializeLucideIcons === 'function') window.initializeLucideIcons({ immediate: true });
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
    // 【修正v4.0.0】SessionManager統合: 重複コード削減
    const config = modeConfig[currentMode];

    console.log(`📊 セッション進行状況: ${sessionManager.getProgressText()} (${config.title})`);

    // 進行バーを更新
    const progressFill = document.querySelector('.progress-section .progress-fill');
    if (progressFill) {
        progressFill.style.width = `${sessionManager.getProgressPercentage()}%`;
    }

    // セッションバッジを更新
    const sessionBadge = document.querySelector('.session-badge');
    if (sessionBadge) {
        sessionBadge.textContent = `セッション ${sessionManager.getProgressText()}`;
    }

    // 【追加】ページサブタイトルを更新
    const pageSubtitle = document.querySelector('.page-subtitle');
    if (pageSubtitle) {
        // 【修正v4.0.0】SessionManager統合: getProgressDetailText()使用
        pageSubtitle.textContent = sessionManager.getProgressDetailText();
        console.log(`✅ サブタイトル更新: ${sessionManager.getProgressDetailText()}`);
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

    // 全音域データを使用（comfortableRangeは廃止）
    // 理由: comfortableRangeの計算ロジックが存在せず、全音域で十分
    const rangeData = voiceRangeData.results;
    if (!rangeData.lowFreq || !rangeData.highFreq) {
        return false;
    }

    // オクターブ数が1以上か確認
    const octaves = Math.log2(rangeData.highFreq / rangeData.lowFreq);
    console.log(`🔍 音域検証: ${octaves.toFixed(2)}オクターブ (${rangeData.lowFreq.toFixed(1)}Hz - ${rangeData.highFreq.toFixed(1)}Hz)`);

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

    if (currentScaleDirection === 'descending') {
        console.log(`📐 基音として使える範囲（下行モード）: ${(lowFreq * 2).toFixed(1)}Hz - ${highFreq.toFixed(1)}Hz (基音-1オクターブが${lowFreq.toFixed(1)}Hzに収まる)`);
        console.log(`📐 基音範囲のオクターブ数: ${(Math.log2(highFreq / (lowFreq * 2))).toFixed(2)}オクターブ`);
    } else {
        console.log(`📐 基音として使える範囲（上行モード）: ${lowFreq.toFixed(1)}Hz - ${(highFreq / 2).toFixed(1)}Hz (基音+1オクターブが${highFreq.toFixed(1)}Hzに収まる)`);
        console.log(`📐 基音範囲のオクターブ数: ${(Math.log2((highFreq / 2) / lowFreq)).toFixed(2)}オクターブ`);
    }

    // 音域内の音符のみをフィルタリング（音階方向に応じて範囲を調整）
    let availableNotes = allNotes.filter(note => {
        if (currentScaleDirection === 'descending') {
            // 下行モード: 基音-1オクターブが音域内に収まる
            const bottomFreq = note.frequency / 2; // 基音-1オクターブ
            const isInRange = bottomFreq >= lowFreq && note.frequency <= highFreq;
            return isInRange;
        } else {
            // 上行モード: 基音+1オクターブが音域内に収まる
            const topFreq = note.frequency * 2; // 基音+1オクターブ
            const isInRange = note.frequency >= lowFreq && topFreq <= highFreq;
            return isInRange;
        }
    });

    const directionText = currentScaleDirection === 'descending' ? '基音-1オクターブ' : '基音+1オクターブ';
    console.log(`🎵 理想的な基音（${directionText}が完全に音域内）: ${availableNotes.length}音`);
    if (availableNotes.length > 0) {
        console.log(`   範囲: ${availableNotes[0].note} (${availableNotes[0].frequency.toFixed(1)}Hz) - ${availableNotes[availableNotes.length - 1].note} (${availableNotes[availableNotes.length - 1].frequency.toFixed(1)}Hz)`);
    }

    // 【モード別最小音数チェック】音域不足の場合は自動拡張
    let requiredNotes = 0;
    let modeName = '';

    if (currentMode === 'random') {
        requiredNotes = 8; // ランダム基音モードは8音必須
        modeName = 'ランダム基音モード';
    } else if (currentMode === 'continuous' || currentMode === '12tone') {
        requiredNotes = 12; // 連続チャレンジ・12音階モードは12音必須
        modeName = currentMode === 'continuous' ? '連続チャレンジモード' : '12音階モード';
    }

    if (requiredNotes > 0 && availableNotes.length < requiredNotes) {
        const neededNotes = requiredNotes - availableNotes.length;
        console.warn(`⚠️ [${modeName}] 音域不足: ${availableNotes.length}音 → ${requiredNotes}音に拡張（${neededNotes}音追加）`);
        console.warn(`   推奨: 2.0オクターブ以上の音域（現在: ${(Math.log2(highFreq / lowFreq)).toFixed(2)}オクターブ）`);
        console.warn(`   ※ テスト期間中のため、音域不足でも${requiredNotes}音確保を優先`);

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

        console.log(`✅ ${requiredNotes}音確保完了: ${availableNotes.map(n => n.note).join(', ')}`);
        console.log(`   ※ 追加された${neededNotes}音は基音+1オクターブが音域上限を若干超えますが、`);
        console.log(`     オクターブ相対音感トレーニングとして${requiredNotes}音使用を優先します`);
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
    // 【修正v4.0.0】SessionManager統合: getMaxSessions()使用
    const maxSessions = sessionManager.getMaxSessions();
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
 * 配列をシャッフルするヘルパー関数（Fisher-Yates アルゴリズム）
 */
function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

/**
 * ランダム基音モード（初級）: 白鍵のみ、連続重複なし
 * v2.0.0: 連続重複防止 + ゾーン順序ランダム化
 */
function selectRandomMode(availableNotes, maxSessions) {
    const whiteKeys = availableNotes.filter(note => !note.note.includes('#'));
    console.log(`🎹 白鍵のみフィルタリング: ${availableNotes.length}音 → ${whiteKeys.length}音`);

    const octaves = getVoiceRangeOctaves();
    const numZones = octaves >= 2.0 ? 4 : octaves >= 1.5 ? 3 : 1;
    const selectedNotes = [];

    if (numZones === 1) {
        // 音域狭い: 完全ランダム（連続重複のみ回避）
        console.log(`📍 ゾーン分割なし（${octaves.toFixed(2)}オクターブ）- 連続重複回避モード`);
        let lastNote = null;
        for (let i = 0; i < maxSessions; i++) {
            // 前回と異なる音を候補にする
            let candidates = whiteKeys.filter(note =>
                !lastNote || note.note !== lastNote.note
            );

            // 候補がない場合は全体から選択（通常はありえない）
            if (candidates.length === 0) {
                candidates = whiteKeys;
            }

            const newNote = candidates[Math.floor(Math.random() * candidates.length)];
            selectedNotes.push(newNote);
            lastNote = newNote;
        }
    } else {
        // ゾーン分割選択（重複なし + ゾーン順序ランダム化 + 連続重複回避）
        const sessionsPerZone = Math.ceil(maxSessions / numZones);
        const notesPerZone = Math.ceil(whiteKeys.length / numZones);

        // ゾーンリストを作成
        const zones = [];
        for (let z = 0; z < numZones; z++) {
            const zoneStart = z * notesPerZone;
            const zoneEnd = Math.min((z + 1) * notesPerZone, whiteKeys.length);
            zones.push(whiteKeys.slice(zoneStart, zoneEnd));
        }

        // ゾーン順序をランダム化
        const zoneOrder = shuffleArray([...Array(numZones).keys()]);
        console.log(`🎲 ゾーン順序をランダム化: ${zoneOrder.join(' → ')} (${numZones}ゾーン)`);

        let lastNote = null;
        for (let session = 0; session < maxSessions; session++) {
            const zoneIndex = zoneOrder[Math.floor(session / sessionsPerZone) % numZones];
            const zoneNotes = zones[zoneIndex];

            // 優先順位1: ゾーン内で未使用 + 前回と異なる音
            let candidates = zoneNotes.filter(note =>
                !selectedNotes.some(selected => selected.note === note.note) &&
                (!lastNote || note.note !== lastNote.note)
            );

            // 優先順位2: ゾーン内で未使用（前回と同じでも許容）
            if (candidates.length === 0) {
                candidates = zoneNotes.filter(note =>
                    !selectedNotes.some(selected => selected.note === note.note)
                );
            }

            // 優先順位3: 全体から未使用 + 前回と異なる音
            if (candidates.length === 0) {
                candidates = whiteKeys.filter(note =>
                    !selectedNotes.some(selected => selected.note === note.note) &&
                    (!lastNote || note.note !== lastNote.note)
                );
            }

            // 優先順位4: 全体から未使用（フォールバック）
            if (candidates.length === 0) {
                candidates = whiteKeys.filter(note =>
                    !selectedNotes.some(selected => selected.note === note.note)
                );
            }

            // 【修正v4.0.2】優先順位5: 全白鍵使用済みの場合、前回と異なる音なら重複許可
            if (candidates.length === 0) {
                candidates = whiteKeys.filter(note =>
                    !lastNote || note.note !== lastNote.note
                );
                if (candidates.length > 0) {
                    console.warn(`⚠️ 全白鍵使用済み（${selectedNotes.length}/${maxSessions}セッション）- 重複許可モードで選択`);
                }
            }

            // 【修正v4.0.2】優先順位6: 最後のフォールバック（前回と同じでも許可）
            if (candidates.length === 0) {
                candidates = whiteKeys;
                console.error(`❌ 候補なし - 完全ランダム選択（${selectedNotes.length}/${maxSessions}セッション）`);
            }

            if (candidates.length > 0) {
                const newNote = candidates[Math.floor(Math.random() * candidates.length)];
                selectedNotes.push(newNote);
                lastNote = newNote;
            } else {
                console.error(`❌ 致命的エラー: 基音選択失敗（${selectedNotes.length}/${maxSessions}セッション）`);
            }
        }
    }

    return selectedNotes;
}

/**
 * 連続チャレンジモード（中級）: 全音、重複なし、連続重複防止（12セッション）
 * v2.0.0: 連続重複防止機能追加
 * v3.0.0: オクターブ跳躍機能追加（音域2.5オクターブ以上の場合）
 */
function selectContinuousMode(availableNotes, maxSessions) {
    // 音域データからオクターブ数を取得
    let octaves = 2.0; // デフォルト値
    let enableOctaveVariation = false;

    if (voiceRangeData && voiceRangeData.results) {
        const { lowFreq, highFreq } = voiceRangeData.results;
        octaves = Math.log2(highFreq / lowFreq);
        enableOctaveVariation = octaves >= 2.5;
    }

    console.log(`📊 連続チャレンジモード: ${availableNotes.length}音から${maxSessions}セッション選定`);
    console.log(`   音域: ${octaves.toFixed(2)}オクターブ`);
    console.log(`   オクターブ跳躍: ${enableOctaveVariation ? '有効' : '無効'} (2.5オクターブ以上で有効化)`);

    if (enableOctaveVariation) {
        return selectContinuousModeWithOctaveVariation(availableNotes, maxSessions);
    } else {
        return selectContinuousModeBasic(availableNotes, maxSessions);
    }
}

/**
 * 連続チャレンジモード: 基本実装（オクターブ跳躍なし）
 * 音域2.5オクターブ未満の場合に使用
 */
function selectContinuousModeBasic(availableNotes, maxSessions) {
    console.log(`   モード: 基本（連続重複防止のみ）`);

    const selectedNotes = [];
    let lastNote = null;

    for (let session = 0; session < maxSessions; session++) {
        // 優先順位1: 未使用 + 前回と異なる音
        let candidates = availableNotes.filter(note =>
            !selectedNotes.some(selected => selected.note === note.note) &&
            (!lastNote || note.note !== lastNote.note)
        );

        // 優先順位2: 未使用のみ（前回と同じでも許容・フォールバック）
        if (candidates.length === 0) {
            candidates = availableNotes.filter(note =>
                !selectedNotes.some(selected => selected.note === note.note)
            );
        }

        if (candidates.length === 0) {
            console.error(`❌ セッション${session + 1}: 候補なし（重複回避失敗）`);
            break;
        }

        const newNote = candidates[Math.floor(Math.random() * candidates.length)];
        selectedNotes.push(newNote);
        lastNote = newNote;
    }

    console.log(`✅ 連続チャレンジモード基音選定完了: ${selectedNotes.map(n => n.note).join(' → ')}`);
    return selectedNotes;
}

/**
 * 連続チャレンジモード: オクターブ跳躍実装（音域2.5オクターブ以上）
 * 異なるオクターブの同じ音名を使用可能（例: C3, E4, G2, A3）
 * 音程間隔分析への影響を最小化するため、音名の重複は避ける
 */
function selectContinuousModeWithOctaveVariation(availableNotes, maxSessions) {
    console.log(`   モード: オクターブ跳躍（音名重複なし・オクターブ跳躍あり）`);

    const allNotes = window.PitchShifter.AVAILABLE_NOTES;
    const { lowFreq, highFreq } = voiceRangeData.results;

    // 音域内の全音符（基音+1オクターブが音域内に収まる）
    const notesInRange = allNotes.filter(note => {
        const topFreq = note.frequency * 2;
        return note.frequency >= lowFreq && topFreq <= highFreq;
    });

    console.log(`   音域内利用可能音: ${notesInRange.length}音`);

    // 音名のみでグループ化（例: C3, C4 → "C"）
    const noteNameGroups = {};
    notesInRange.forEach(note => {
        const noteName = note.note.replace(/\d+$/, ''); // C3 → C
        if (!noteNameGroups[noteName]) {
            noteNameGroups[noteName] = [];
        }
        noteNameGroups[noteName].push(note);
    });

    const uniqueNoteNames = Object.keys(noteNameGroups);
    console.log(`   使用可能音名: ${uniqueNoteNames.length}種類 (${uniqueNoteNames.join(', ')})`);

    const selectedNotes = [];
    const usedNoteNames = new Set(); // 使用済み音名（C, D, E等）
    let lastNote = null;

    for (let session = 0; session < maxSessions; session++) {
        // 優先順位1: 未使用音名 + 前回と異なる音名
        let candidateNoteNames = uniqueNoteNames.filter(noteName =>
            !usedNoteNames.has(noteName) &&
            (!lastNote || noteName !== lastNote.note.replace(/\d+$/, ''))
        );

        // 優先順位2: 未使用音名のみ（フォールバック）
        if (candidateNoteNames.length === 0) {
            candidateNoteNames = uniqueNoteNames.filter(noteName =>
                !usedNoteNames.has(noteName)
            );
        }

        // 優先順位3: 全音名から選択（12セッション超過時）
        if (candidateNoteNames.length === 0) {
            candidateNoteNames = uniqueNoteNames.filter(noteName =>
                !lastNote || noteName !== lastNote.note.replace(/\d+$/, '')
            );
        }

        if (candidateNoteNames.length === 0) {
            console.error(`❌ セッション${session + 1}: 候補なし（重複回避失敗）`);
            break;
        }

        // ランダムに音名を選択
        const selectedNoteName = candidateNoteNames[Math.floor(Math.random() * candidateNoteNames.length)];

        // その音名の中からランダムにオクターブを選択
        const notesForName = noteNameGroups[selectedNoteName];
        const selectedNote = notesForName[Math.floor(Math.random() * notesForName.length)];

        selectedNotes.push(selectedNote);
        usedNoteNames.add(selectedNoteName);
        lastNote = selectedNote;
    }

    console.log(`✅ 連続チャレンジモード基音選定完了（オクターブ跳躍）: ${selectedNotes.map(n => n.note).join(' → ')}`);
    console.log(`   音域跳躍例: ${selectedNotes.slice(0, 4).map(n => `${n.note} (${n.frequency.toFixed(1)}Hz)`).join(' → ')}`);

    return selectedNotes;
}

/**
 * 12音階モード（上級）: クロマチック12音を順次使用
 */
function selectSequentialMode(availableNotes, maxSessions) {
    console.log(`🎹 12音階モード: クロマチック順次選択 (${maxSessions}セッション)`);

    const selectedNotes = [];
    const chromaticNotes = availableNotes.slice(0, 12); // 最初の12音（クロマチック）
    const actualCount = chromaticNotes.length;

    // getAvailableNotes()で既に12音確保されているはず（音域不足時は高音域から自動追加）
    if (actualCount < 12) {
        console.error(`❌ [12音階モード] 致命的エラー: 12音確保に失敗（実際: ${actualCount}音）`);
        console.error(`   → getAvailableNotes()の自動拡張ロジックを確認してください`);
    } else {
        console.log(`✅ [12音階モード] クロマチック12音確保完了: ${chromaticNotes.map(n => n.note).join(' → ')}`);
    }

    if (maxSessions === 12) {
        // 片方向（上昇 or 下降）- 常に12セッション
        const direction = window.currentTrainingDirection;
        if (direction === 'descending') {
            // 下降: B → C（12セッション）
            for (let i = 11; i >= 0; i--) {
                selectedNotes.push(chromaticNotes[i]);
            }
            console.log(`🔽 下降モード（12セッション）: ${selectedNotes.map(n => n.note).join(' → ')}`);
        } else {
            // 上昇: C → B（12セッション）
            for (let i = 0; i < 12; i++) {
                selectedNotes.push(chromaticNotes[i]);
            }
            console.log(`🔼 上昇モード（12セッション）: ${selectedNotes.map(n => n.note).join(' → ')}`);
        }
    } else if (maxSessions === 24) {
        // 両方向: 上昇12 + 下降12 - 常に24セッション
        // 上昇: C → B（12セッション）
        for (let i = 0; i < 12; i++) {
            selectedNotes.push(chromaticNotes[i]);
        }
        // 下降: B → C（12セッション）
        for (let i = 11; i >= 0; i--) {
            selectedNotes.push(chromaticNotes[i]);
        }
        console.log(`🔼🔽 両方向モード（24セッション）: 上昇12 + 下降12`);
        console.log(`  上昇: ${selectedNotes.slice(0, 12).map(n => n.note).join(' → ')}`);
        console.log(`  下降: ${selectedNotes.slice(12, 24).map(n => n.note).join(' → ')}`);
    } else {
        // フォールバック: 繰り返し
        for (let session = 0; session < maxSessions; session++) {
            selectedNotes.push(chromaticNotes[session % 12]);
        }
        console.warn(`⚠️ 予期しないセッション数: ${maxSessions}`);
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
            // レッスンID・音階方向をリセット（中断時）
            currentLessonId = null;
            currentScaleDirection = 'ascending';
            sessionStorage.removeItem('currentLessonId'); // sessionStorageもクリア
            console.log('🔄 トレーニング中断: currentLessonId・currentScaleDirectionをリセット（sessionStorageもクリア）');

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
