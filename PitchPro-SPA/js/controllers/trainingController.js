/**
 * Training Controller - Integrated Implementation
 * PitchPro AudioDetectionComponent + PitchShifter統合版
 *
 * 🔥 VERSION: v4.5.1 (2025-11-23) - タイマークリーンアップ強化
 *
 * 【v4.5.1修正内容】
 * - ページ離脱時のタイマークリーンアップ強化
 * - doremiGuideTimeoutId: ドレミガイド開始タイマー（2.5秒）
 * - nextSessionTimeoutId: 次セッション開始タイマー（1秒）
 * - resetTrainingPageFlag()で両タイマーをクリア
 * - 中断されたトレーニングのタイマーが新しいトレーニングに影響する問題を修正
 *
 * 【v4.5.0修正内容】
 * - マイク事前チェック追加: initializeTrainingPage()でgetUserMedia()を実行
 * - ドレミガイド中のダイアログ防止: 基音再生前にマイク許可を確認
 * - SPA化の恩恵活用: ここで取得した許可はドレミガイドでそのまま使用可能
 * - エラーハンドリング: 許可拒否・デバイスエラー時は準備ページへリダイレクト
 *
 * 【v4.0.22修正内容】
 * - 下行モード拡張条件緩和: 10%余裕を追加（基音-1オクターブが音域下限の90%以上）
 * - 候補音0問題解決: 厳しすぎる条件により候補が見つからない問題を修正
 * - 上行モードと統一: 両方向で10%余裕を持たせる設計に統一
 *
 * 【v4.0.21修正内容】
 * - 下行モード音域拡張修正: 低音側への拡張ロジック実装（従来は高音側のみ）
 * - 拡張方向の適正化: 上行モードは高音側、下行モードは低音側に拡張
 * - 12音階下行モード修正: 音域不足時に12音確保できずクラッシュする問題を解決
 * - 拡張失敗時の詳細ログ追加: 音域・方向情報を明示的に出力
 *
 * 【v4.0.20修正内容】
 * - ボタンテキスト変更実装: 「基音を再生」→「再生中...」→「準備中...」（連続・12音階のみ）
 * - HTMLシンプル化: 複雑なdata-state構造を削除、シンプルなspan要素のみ
 * - 最軽量実装: textContentのみ使用、Lucideアイコン更新なし、DOM操作最小限
 * - ブチ音対策完了後の実装: PC音量削減（v4.0.18）により基音再生中の変更が安全に
 *
 * 【v4.0.19修正内容】
 * - setupHomeButton関数削除: index.htmlのhandleFooterHomeButtonClick()で代替済み
 * - data-state属性削除: ボタン状態管理をdisabled制御のみに統一（v4.0.10で対応済み）
 * - コード整理: 基音再生時の負担軽減で不要になったコードの完全削除
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

console.log('🔥🔥🔥 TrainingController.js VERSION: v4.0.26 (2025-11-26) LOADED 🔥🔥🔥');

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

// 【v4.0.21追加】タイマーID保持（ページ離脱時のクリーンアップ用）
let doremiGuideTimeoutId = null;   // ドレミガイド開始用タイマー（2.5秒）
let nextSessionTimeoutId = null;   // 次セッション開始用タイマー（1秒）

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
 * 【v4.3.0】設定ページで保存された基音再生音量オフセットを取得
 * @returns {number} -20〜+20のオフセット値（デフォルト0）
 */
function getBaseNoteVolumeOffset() {
    const KEY = 'pitchpro_base_note_volume_offset';
    try {
        const saved = localStorage.getItem(KEY);
        if (saved !== null) {
            const parsed = parseInt(saved, 10);
            if (!isNaN(parsed) && parsed >= -20 && parsed <= 20) {
                return parsed;
            }
        }
    } catch (e) {
        console.warn('⚠️ 音量オフセット読み込み失敗:', e);
    }
    return 0;
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
        if (chromaticDirection === 'up' || chromaticDirection === 'ascending') badgeText = '上昇';
        else if (chromaticDirection === 'down' || chromaticDirection === 'descending') badgeText = '下降';
        else if (chromaticDirection === 'both') badgeText = '両方向';

        chromaticBadge.textContent = badgeText;
        container.appendChild(chromaticBadge);
    }

    console.log(`🏷️ バッジ更新: 音階=${scaleDirection}, 基音=${chromaticDirection || 'なし'}`);
}

// トレーニングモード管理
let currentMode = 'random'; // 'random' | 'continuous' | '12tone'
let voiceRangeData = null; // 音域データ

// 【v2.4.0】モード設定はModeControllerに一元化
// 旧modeConfig定義は削除 - window.ModeController.getMode(modeId)を使用すること
// 参照: /js/mode-controller.js

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

    // 【v2.4.0】ModeControllerでモード有効性チェック
    if (modeParam && window.ModeController && window.ModeController.getMode(modeParam)) {
        currentMode = modeParam;
        console.log(`✅ モード設定: ${currentMode} (${window.ModeController.getModeName(currentMode)})`);
    } else {
        console.warn(`⚠️ モードパラメータ不正: ${modeParam} - デフォルト(random)を使用`);
        console.warn(`🔍 [DEBUG] 利用可能なモード:`, window.ModeController?.getValidModeIds() || ['random', 'continuous', '12tone']);
        currentMode = 'random';
    }

    // 【v4.0.6追加】SPA環境でのグローバル変数リセット
    // 前回のトレーニングセッションのlessonIdが残っている場合があるため、必ずnullにリセット
    currentLessonId = null;
    console.log('🔄 currentLessonIdをリセット（SPA環境対策）');

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
        // 【v2.4.0】maxSessionsの動的変更は不要 - ModeController.getSessionsPerLesson()で対応
        const expectedSessions = window.ModeController.getSessionsPerLesson('12tone', { direction: directionParam });
        console.log(`✅ 12音階モード: maxSessions=${expectedSessions}（ModeController管理）`);
    }

    // 音階方向・基音方向バッジを更新（DOM読み込み後に実行）
    setTimeout(() => {
        updateDirectionBadges(currentScaleDirection, chromaticDirectionForBadge);

        // ページタイトルを更新（ModeController使用、デフォルトで短縮形）
        const pageTitleElement = document.getElementById('training-mode-title');
        if (pageTitleElement && window.ModeController) {
            const options = {
                direction: directionParam,
                scaleDirection: currentScaleDirection
            };
            const displayName = window.ModeController.getDisplayName(currentMode, options);
            pageTitleElement.textContent = displayName;
            console.log(`✅ ページタイトル更新: ${displayName}`);
        }
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

    // 【v4.3.0削除】beforeunload警告を削除（リロード時のUX改善）
    // ダイレクトアクセス検出により、マイク許可問題は根本解決済み
    // リロード時はアプリのアラートのみ表示（ダイアログ1つでスムーズ）

    // 【v4.5.0追加】マイク事前チェック - ドレミガイド中のダイアログ出現を防止
    // SPA化により、ここで取得したマイク許可はドレミガイドでそのまま使用可能
    // 基音再生（PitchShifter）はマイク不要なので、ダイアログ表示中も問題なし
    try {
        // 【iOS Safari対応】audioSession を 'play-and-record' に設定
        // 準備ページで 'playback' に設定されている場合があるため、マイクアクセス前にリセット
        if (navigator.audioSession) {
            try {
                const currentType = navigator.audioSession.type;
                console.log(`🎤 [iOS] audioSession.type (現在): ${currentType}`);
                if (currentType !== 'play-and-record') {
                    navigator.audioSession.type = 'play-and-record';
                    console.log('🎤 [iOS] audioSession.type を "play-and-record" に設定');
                }
            } catch (sessionError) {
                console.warn('⚠️ audioSession設定失敗（続行）:', sessionError);
            }
        }

        console.log('🎤 [v4.5.0] マイク事前チェック開始...');
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        console.log('✅ [v4.5.0] マイク許可確認完了 - MediaStream取得成功');

        // MediaStreamは保持せず、許可状態の確認のみ
        // AudioDetectorが後で独自にMediaStreamを取得する
        stream.getTracks().forEach(track => track.stop());
        console.log('🔄 [v4.5.0] 確認用MediaStreamを解放（AudioDetectorが再取得）');
    } catch (error) {
        console.error('❌ [v4.5.0] マイク許可取得失敗:', error);

        // マイク許可が拒否された場合は準備ページへリダイレクト
        if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
            alert('マイクの使用が許可されていません。\nトレーニングにはマイクが必要です。');
            await NavigationManager.redirectToPreparation('マイク許可拒否');
            return;
        }

        // その他のエラー（デバイスなし等）
        alert(`マイクエラー: ${error.message}\nマイクが正しく接続されているか確認してください。`);
        await NavigationManager.redirectToPreparation('マイクエラー');
        return;
    }

    // Setup button (常に再登録)
    const playButton = document.getElementById('play-base-note');
    if (playButton) {
        console.log('✅ ボタン発見:', playButton);

        // 古いイベントリスナーを削除してから新規登録
        const newButton = playButton.cloneNode(true);
        playButton.parentNode.replaceChild(newButton, playButton);

        newButton.addEventListener('click', () => {
            console.log('🎯 ボタンクリック検出');
            startTraining();
        });
        console.log('✅ イベントリスナー登録完了（再登録）');

        // 【v4.0.21】初期化完了後にボタンを有効化
        newButton.disabled = false;
        newButton.classList.remove('btn-disabled');
        const buttonText = newButton.querySelector('span');
        if (buttonText) {
            buttonText.textContent = '基音を再生';
        }
        console.log('✅ 基音ボタンを有効化（初期化完了）');
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
    // 【v2.4.0】ModeController統合
    const modeName = window.ModeController?.getModeName(currentMode) || currentMode;
    console.log(`📋 現在のモード: ${modeName}`);

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
    // 【v2.4.0】ModeController統合
    const modeConfig = window.ModeController?.getMode(currentMode);
    const modeName = window.ModeController?.getModeName(currentMode) || currentMode;
    console.log(`🆕 ${modeName}の初期化処理を実行`);

    // localStorageクリア処理は preparation-pitchpro-cycle.js が実行済み
    // ここではモード別の基音選定のみ実行
    console.log('ℹ️ sessionCounterはsession-data-recorder.jsが自動管理（localStorage最大IDと同期）');

    // 【新規】全セッション分の基音を事前に一括選定
    usedBaseNotes = []; // 使用済み基音リストをリセット（トレーニング開始時）
    selectedBaseNotes = selectAllBaseNotesForMode(modeConfig);

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
        console.log(`   選定モード: ${currentMode} (${window.ModeController?.getModeName(currentMode) || '不明'})`);
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

/**
 * 【v4.4.0統一】保存済み音量設定を取得（dB値）
 * 設定ページのティックスライダーと同じキーを使用
 * @returns {number} dB値（DeviceDetector基準音量 + ユーザー調整オフセット）
 */
function getSavedVolumeDb() {
    const baseVolume = window.DeviceDetector?.getDeviceVolume() ?? -6;
    const volumeOffset = getBaseNoteVolumeOffset(); // 新システム使用
    return baseVolume + volumeOffset;
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

        // 【DEBUG】現在のPitchShifter音量を確認
        if (pitchShifter.sampler && pitchShifter.sampler.volume) {
            console.log(`🔊 [DEBUG] PitchShifter現在の音量: ${pitchShifter.sampler.volume.value}dB`);
        }

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

        // 【Issue #2修正】保存済み音量を優先、なければDeviceDetectorデフォルト
        const savedVolumeDb = getSavedVolumeDb();
        const deviceType = getDeviceType();
        console.log(`📱 デバイス: ${deviceType}, 音量: ${savedVolumeDb.toFixed(1)}dB (保存済み設定復元)`);

        // 保存済み音量を設定
        pitchShifter = new window.PitchShifter({
            baseUrl: 'audio/piano/',
            release: 2.5,
            volume: savedVolumeDb
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

    // ボタン無効化 + テキスト変更
    playButton.disabled = true;
    playButton.classList.add('btn-disabled');

    // 【v4.0.20】ボタンテキストを「再生中...」に変更
    const buttonText = playButton.querySelector('span');
    if (buttonText) {
        buttonText.textContent = '再生中...';
    }

    try {
        // 【v4.0.11】getUserMedia()削除 - レスポンス速度改善
        // リファクタリング前の実装に戻す（マイク許可は準備ページで確認済み）
        // バックグラウンド復帰後のマイク失効は、AudioDetectionComponent初期化時に
        // 自動的に検出・エラー表示されるため、ここでの確認は不要

        // 初回クリック時はPitchShifter初期化を実行
        if (!pitchShifter || !pitchShifter.isInitialized) {
            console.log('⏳ 初回クリック - PitchShifter初期化開始');

            // ボタンテキストを「準備中...」に変更（初期化待ち表示）
            if (buttonText) {
                buttonText.textContent = '準備中...';
            }

            await initializePitchShifter();
            console.log('✅ 初期化完了！次回から即座に再生されます');

            // ボタンテキストを「再生中...」に戻す
            if (buttonText) {
                buttonText.textContent = '再生中...';
            }
        }

        // 【v4.0.10】基音再生中はDOM操作を一切しない
        // DOM操作（setAttribute, innerHTML, textContent等）は
        // Tone.jsのオーディオレンダリングと競合してブチ音の原因になる

        // 【v4.0.21】iOS/iPadOS対応のAudioContext初期化は
        // reference-tones.js playNote()内に統合（v2.9.2）

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

        // 【v4.1.3改善】基音再生中は検出を停止（MediaStream保持）
        // mute()だけでは検出ループが継続し、BLOCKEDログが大量出力される問題に対応
        // 【v4.1.4修正】audioDetectorが未初期化の場合はNavigationManagerから取得
        const detectorToStop = audioDetector || window.NavigationManager?.currentAudioDetector || window.globalAudioDetector;
        if (detectorToStop) {
            console.log('🎤 基音再生前に検出を停止（MediaStream保持）');
            try {
                detectorToStop.stopDetection();
                console.log('⏹️ 検出停止完了 - MediaStreamは健全');
            } catch (error) {
                console.warn('⚠️ stopDetection()エラー（無視して続行）:', error);
            }
        } else {
            console.log('⚠️ AudioDetectorが未初期化のため停止スキップ');
        }

        // 【iOS Safari対応 v3】audioSession切り替えは行わない
        // 理由: playbackモードに切り替えると2回目以降の基音再生で音が出なくなる問題が発生
        // マイク停止（stopDetection）のみで対応し、audioSessionは変更しない
        // WebKit Bug #218012 の回避策としては不完全だが、音が出ないよりは音量が小さい方がマシ
        if (navigator.audioSession) {
            console.log(`🔊 [iOS] audioSession.type (現在): ${navigator.audioSession.type}（変更なし）`);
        }

        // 【v4.3.0】設定ページの音量オフセットを適用
        const volumeOffset = getBaseNoteVolumeOffset();
        if (volumeOffset !== 0 && pitchShifter.setVolume) {
            const baseVolume = window.DeviceDetector?.getDeviceVolume() ?? -6;
            const adjustedVolume = baseVolume + volumeOffset;
            pitchShifter.setVolume(adjustedVolume);
            console.log(`🔊 音量オフセット適用: ${baseVolume}dB + ${volumeOffset > 0 ? '+' : ''}${volumeOffset}dB = ${adjustedVolume}dB`);
        }

        await pitchShifter.playNote(baseNoteInfo.note, 1.0);

        // 【v4.2.2改善】基音再生後はマイクオフのまま（ドレミガイド開始時にオン）
        // 基音の音を拾わないようにするため

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
        // 【v4.0.21】タイマーIDを保存（ページ離脱時のクリーンアップ用）
        doremiGuideTimeoutId = setTimeout(async () => {
            // 【iOS Safari対応 v3】audioSession切り替えを行わないため、復元も不要
            // audioSessionは変更していないので、そのままマイクを再開

            // 【v4.2.2追加】ドレミガイド開始時にマイクオン（基音の音を拾わないため）
            if (audioDetector) {
                console.log('🔊 ドレミガイド開始 - マイクオン');
                await audioDetector.startDetection();
                console.log('▶️ マイク検出開始完了');
            }

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
        // 【v4.0.0改善】3段階の優先順位でAudioDetector取得
        // 1. NavigationManager.currentAudioDetectorが健全 → 再利用
        // 2. window.globalAudioDetectorが健全 → 再利用
        // 3. 新規作成

        let shouldCreateNew = false;
        let reusedSource = null;

        // 優先度1: NavigationManager.currentAudioDetectorをチェック
        if (window.NavigationManager?.currentAudioDetector) {
            const verification = window.NavigationManager.verifyAudioDetectorState(
                window.NavigationManager.currentAudioDetector
            );

            if (verification.canReuse) {
                console.log('✅ [Phase2] NavigationManager.currentAudioDetectorを再利用');
                audioDetector = window.NavigationManager.currentAudioDetector;
                window.audioDetector = audioDetector;
                reusedSource = 'NavigationManager';
            } else {
                console.warn(`⚠️ [Phase2] NavigationManager.currentAudioDetector異常: ${verification.reason}`);
                shouldCreateNew = true;
            }
        }
        // 優先度2: window.globalAudioDetectorをチェック
        else if (window.globalAudioDetector) {
            const verification = window.NavigationManager?.verifyAudioDetectorState(window.globalAudioDetector);

            if (verification && verification.canReuse) {
                console.log('✅ [Phase2] window.globalAudioDetectorを再利用');
                audioDetector = window.globalAudioDetector;
                window.audioDetector = audioDetector;

                // 【v4.0.5修正】再利用時はregister不要
                // NavigationManagerは既に保持しているため、registerすると既存を破棄してしまう
                reusedSource = 'globalAudioDetector';
            } else {
                console.warn('⚠️ [Phase2] window.globalAudioDetector異常または検証失敗');
                shouldCreateNew = true;
            }
        }
        // 優先度3: 新規作成
        else {
            shouldCreateNew = true;
        }

        // 新規作成が必要な場合
        if (shouldCreateNew) {
            console.log('🎤 [Phase2] AudioDetectionComponent新規作成');

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

            // グローバルに公開（Router cleanup用）
            window.audioDetector = audioDetector;

            // 【v4.0.5修正】新規作成時のみNavigationManagerに登録
            // 既存AudioDetectorの破棄を避けるため、新規作成時のみregister
            if (window.NavigationManager) {
                window.NavigationManager.registerAudioDetector(audioDetector);
                console.log('✅ [v4.0.5] 新規作成AudioDetectorをNavigationManagerに登録');
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
            // 再利用の場合: UIセレクターを更新
            console.log(`🔄 [Phase2] AudioDetectorを再利用（ソース: ${reusedSource}）`);
            console.log('🔄 UIセレクターを更新中...');
            await audioDetector.updateSelectors({
                volumeBarSelector: '.mic-recognition-section .progress-fill',
                volumeTextSelector: null,
                frequencySelector: null,
                noteSelector: null
            });
            console.log('✅ UIセレクター更新完了');

            // 【DEBUG v4.0.26】UIキャッシュ状態とdeviceSpecsを確認
            const status = audioDetector.getStatus();
            console.log('🔍 [DEBUG] AudioDetector状態:', {
                state: status.state,
                autoUpdateUI: status.config?.autoUpdateUI,
                volumeBarSelector: status.config?.volumeBarSelector,
                uiElements: Object.keys(status.config || {}).filter(k => k.includes('Selector'))
            });
            // 【DEBUG v4.0.26】deviceSpecs確認（問題調査用）- getStatus()はdeviceSpecsを直接返す
            console.log('🔊 [DEBUG v4.0.26 TRAINING] deviceSpecs:', {
                volumeMultiplier: status.deviceSpecs?.volumeMultiplier,
                noiseGate: status.deviceSpecs?.noiseGate,
                sensitivity: status.deviceSpecs?.sensitivity,
                deviceType: status.deviceSpecs?.deviceType
            });

            // コールバック設定（再利用でも必要）
            audioDetector.setCallbacks({
                onPitchUpdate: (result) => {
                    handlePitchUpdate(result);
                },
                onError: (context, error) => {
                    console.error(`❌ AudioDetection Error [${context}]:`, error);
                }
            });
        }

        // 【v4.0.4追加】preparationでミュートされたマイクを再有効化
        // preparationページ完了時にmute()されているため、ここでunmute()が必要
        if (audioDetector.microphoneController && reusedSource) {
            try {
                audioDetector.microphoneController.unmute();
                console.log('🔊 マイクのミュート解除（preparationから引き継ぎ）');
            } catch (error) {
                console.warn('⚠️ マイクアンミュートエラー（無視して続行）:', error);
            }
        }

        // 【v4.0.25】AudioContextがsuspendedの場合は再開
        // iPad/iPhoneで基音再生後にAudioContextがsuspendedに戻る問題への対処
        const audioManager = audioDetector?.pitchDetector?.audioManager;
        if (audioManager?.audioContext) {
            const ctxState = audioManager.audioContext.state;
            console.log(`🔍 [v4.0.25] AudioContext状態確認: ${ctxState}`);
            if (ctxState === 'suspended' || ctxState === 'interrupted') {
                console.log('🔄 [v4.0.25] AudioContext再開中...');
                await audioManager.audioContext.resume();
                console.log(`✅ [v4.0.25] AudioContext再開完了: ${audioManager.audioContext.state}`);
            }
        }

        // 音声検出開始（初回も2回目以降も実行）
        // 【v4.2.0改善】PitchPro v1.3.5で冪等性対応済み - 状態チェック不要
        await audioDetector.startDetection();
        console.log('✅ マイクオン完了 - 音声検出開始');

        // 【DEBUG v4.0.24】startDetection後の状態を確認
        const statusAfter = audioDetector.getStatus();
        console.log('🔍 [DEBUG] startDetection後:', {
            state: statusAfter.state,
            pitchDetectorState: statusAfter.pitchDetectorStatus?.componentState,
            uiUpdateTimer: audioDetector.uiUpdateTimer ? 'active' : 'null'
        });

        // 【DEBUG v4.0.24】DOM要素の存在確認
        const volumeBarElement = document.querySelector('.mic-recognition-section .progress-fill');
        console.log('🔍 [DEBUG] 音量バーDOM要素:', volumeBarElement ? '存在' : '見つからない');

    } catch (error) {
        console.error('❌ AudioDetectionComponent初期化失敗:', error);

        // マイクバッジをエラー状態に
        if (micBadge) {
            micBadge.classList.remove('measuring');
        }

        // エラーメッセージ表示
        alert('マイクの初期化に失敗しました。\n\nマイクの権限を確認してページを再読み込みしてください。');
        return; // トレーニングを中断
    }

    // 【重要】audioDetectorが正常に動作しているか確認
    if (!audioDetector || !window.audioDetector) {
        console.error('❌ audioDetectorが初期化されていません');
        alert('音声検出システムの初期化に失敗しました。\n\nページを再読み込みしてください。');
        return;
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
let lastCallbackLog = null; // コールバック呼び出し確認用
let pitchDataBuffer = []; // 各ステップの音程データを一時保存
function handlePitchUpdate(result) {
    // AudioDetectionComponentからのresultは直接PitchProの形式
    // result: { frequency, clarity, volume, note }

    // 【デバッグ】コールバックが呼ばれていることを確認（3秒に1回）
    if (!lastCallbackLog || Date.now() - lastCallbackLog > 3000) {
        console.log(`🔔 [DEBUG] handlePitchUpdate called - frequency: ${result.frequency?.toFixed(1) || 'null'}, clarity: ${result.clarity?.toFixed(2) || 'null'}, volume: ${(result.volume * 100).toFixed(1)}%`);
        lastCallbackLog = Date.now();
    }

    // 【v4.0.32】autoUpdateUI: trueのため、音量バー更新はPitchProに任せる
    // iOS Safari既知バグ（WebKit Bug 230902）対策のためVolumeUIHelper方式を廃止

    // 【v4.1.0修正】音程検出条件を強化
    // 問題: 無音時（音量2-3%）でも環境ノイズが「明瞭な音」として誤検出される
    // 対策: 明瞭度0.25以上 AND 音量5%以上を必須条件とする
    const MIN_CLARITY = 0.25;
    const MIN_VOLUME = 0.05;  // 5% - 環境ノイズを除外する閾値

    // 音程検出のログ（デバッグ用）
    if (result.frequency && result.clarity > MIN_CLARITY && result.volume > MIN_VOLUME) {
        // 1秒に1回だけログ出力
        if (!lastPitchLog || Date.now() - lastPitchLog > 1000) {
            console.log(`🎵 音程検出: ${result.frequency.toFixed(1)}Hz (${result.note || ''}), 明瞭度: ${result.clarity.toFixed(2)}, 音量: ${(result.volume * 100).toFixed(1)}%`);
            lastPitchLog = Date.now();
        }

        // 音程データをバッファに追加（明瞭度・音量条件を満たすデータのみ収集）
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

    // 【v4.2.1追加】セッション完了時に検出を停止（準備中の音量バー動作を防止）
    if (audioDetector) {
        audioDetector.stopDetection();
        console.log('⏹️ セッション完了 - 検出停止');
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

        // 【修正v3.4.0】現在のlessonIdのセッション数を正しく計算（モード全体ではなくレッスン単位）
        // 【v3.5.0】SessionDataManagerを使用して統一管理
        const sessionNumber = window.SessionDataManager
            ? window.SessionDataManager.getSessionCount({ lessonId: currentLessonId })
            : 0;
        const totalSessions = window.SessionDataManager
            ? window.SessionDataManager.getSessionCount()
            : 0;
        console.log(`🔍 [DEBUG] レッスン別セッション数: lessonId=${currentLessonId}, ${sessionNumber}セッション (全体=${totalSessions}セッション)`);

        // 【v2.4.0】ModeController統合
        const modeConfig = window.ModeController?.getMode(currentMode);

        // モード別の処理分岐
        if (modeConfig?.hasIndividualResults) {
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

                    // 【v4.0.20】ボタンテキストを「準備中...」に変更
                    const buttonText = playButton.querySelector('span');
                    if (buttonText) {
                        buttonText.textContent = '準備中...';
                    }
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
                // 【v4.0.21】タイマーIDを保存（ページ離脱時のクリーンアップ用）
                nextSessionTimeoutId = setTimeout(() => {
                    nextSessionTimeoutId = null; // 実行後はクリア
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

    // 【v4.0.21追加】タイマーをクリア（ページ離脱時の中断対応）
    if (doremiGuideTimeoutId) {
        clearTimeout(doremiGuideTimeoutId);
        doremiGuideTimeoutId = null;
        console.log('⏱️ ドレミガイドタイマーをクリア');
    }
    if (nextSessionTimeoutId) {
        clearTimeout(nextSessionTimeoutId);
        nextSessionTimeoutId = null;
        console.log('⏱️ 次セッション開始タイマーをクリア');
    }

    // ブラウザバック防止はrouter.jsで自動解除されます

    console.log('TrainingController reset');
}

// グローバルに公開（router.jsから呼び出し可能にする）
window.initializeTrainingPage = initializeTrainingPage;
window.resetTrainingPageFlag = resetTrainingPageFlag;

// Page Visibilityハンドラーは削除
// PitchProの独自エラーダイアログに任せる仕様に変更

/**
 * セッション進行状況UIを更新
 */
function updateSessionProgressUI() {
    // 【修正v4.0.0】SessionManager統合: 重複コード削減
    // 【v2.4.0】ModeController統合
    const modeName = window.ModeController?.getModeName(currentMode) || currentMode;

    console.log(`📊 セッション進行状況: ${sessionManager.getProgressText()} (${modeName})`);

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
        console.log('🔍 音域データチェック: データなしまたはresultsなし');
        return false;
    }

    // 新形式のみサポート: results.lowFreq, results.highFreq
    const rangeData = voiceRangeData.results;
    if (!rangeData.lowFreq || !rangeData.highFreq) {
        console.log('🔍 音域データチェック: lowFreq/highFreqなし');
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

    // 【v2.4.0】ModeController統合 - モード別最小音数チェック
    const requiredNotes = window.ModeController?.getRequiredBaseNotes(currentMode) || 8;
    const modeName = window.ModeController?.getModeName(currentMode) || currentMode;

    if (requiredNotes > 0 && availableNotes.length < requiredNotes) {
        const neededNotes = requiredNotes - availableNotes.length;
        console.warn(`⚠️ [${modeName}] 音域不足: ${availableNotes.length}音 → ${requiredNotes}音に拡張（${neededNotes}音追加）`);
        console.warn(`   推奨: 2.0オクターブ以上の音域（現在: ${(Math.log2(highFreq / lowFreq)).toFixed(2)}オクターブ）`);
        console.warn(`   ※ テスト期間中のため、音域不足でも${requiredNotes}音確保を優先`);

        let notesToAdd = [];

        if (currentScaleDirection === 'descending') {
            // 【下行モード】低音側に拡張
            const lowestAvailableNote = availableNotes[0];

            // 全音符リストから、最低基音より下の音を取得
            // 基音-1オクターブが音域下限の90%以上（10%余裕）
            const lowerNotes = allNotes.filter(note =>
                note.frequency < lowestAvailableNote.frequency &&
                note.frequency / 2 >= lowFreq * 0.9 // 基音-1オクターブが音域下限の90%以上（10%余裕）
            );

            console.log(`   候補（低音側拡張）: ${lowerNotes.length}音 (${lowerNotes.map(n => n.note).join(', ')})`);

            // 必要な分だけ追加（低い音から順に）
            notesToAdd = lowerNotes.slice(-neededNotes); // 最も高い側からneededNotes個取得

            // 低音側に追加するため、配列の先頭に挿入
            availableNotes = [...notesToAdd, ...availableNotes];

            if (notesToAdd.length > 0) {
                console.log(`✅ ${requiredNotes}音確保完了: ${availableNotes.map(n => n.note).join(', ')}`);
                console.log(`   ※ 追加された${notesToAdd.length}音は基音-1オクターブが音域下限を若干下回りますが、`);
                console.log(`     オクターブ相対音感トレーニングとして${requiredNotes}音使用を優先します`);
            }
        } else {
            // 【上行モード】高音側に拡張（従来ロジック）
            const highestAvailableNote = availableNotes[availableNotes.length - 1];

            // 全音符リストから、最高基音より上の音を取得
            // 基音+1オクターブが音域上限に収まるように調整
            const higherNotes = allNotes.filter(note =>
                note.frequency > highestAvailableNote.frequency &&
                note.frequency * 2 <= highFreq * 1.1 // 基音+1オクターブが音域上限に収まる（10%余裕）
            );

            console.log(`   候補（高音側拡張）: ${higherNotes.length}音 (${higherNotes.map(n => n.note).join(', ')})`);

            // 必要な分だけ追加
            notesToAdd = higherNotes.slice(0, neededNotes);
            availableNotes = [...availableNotes, ...notesToAdd];

            if (notesToAdd.length > 0) {
                console.log(`✅ 高音側から${notesToAdd.length}音追加: ${notesToAdd.map(n => n.note).join(', ')}`);
                console.log(`   ※ 追加された${notesToAdd.length}音は基音+1オクターブが音域上限を若干超えますが、`);
                console.log(`     オクターブ相対音感トレーニングとして${requiredNotes}音使用を優先します`);
            }

            // 【v2.10.0追加】高音側で不足した場合、低音側にも拡張
            const stillNeeded = requiredNotes - availableNotes.length;
            if (stillNeeded > 0) {
                console.log(`   ⚠️ 高音側拡張後も${stillNeeded}音不足 → 低音側にも拡張を試行`);
                const lowestAvailableNote = availableNotes[0];

                // 基音-1オクターブが音域下限の90%以上（10%余裕）
                const lowerNotes = allNotes.filter(note =>
                    note.frequency < lowestAvailableNote.frequency &&
                    note.frequency / 2 >= lowFreq * 0.9
                );

                console.log(`   候補（低音側拡張）: ${lowerNotes.length}音 (${lowerNotes.map(n => n.note).join(', ')})`);

                // 必要な分だけ追加（高い音から順に）
                const lowerNotesToAdd = lowerNotes.slice(-stillNeeded);
                if (lowerNotesToAdd.length > 0) {
                    availableNotes = [...lowerNotesToAdd, ...availableNotes];
                    notesToAdd = [...notesToAdd, ...lowerNotesToAdd];
                    console.log(`✅ 低音側から${lowerNotesToAdd.length}音追加: ${lowerNotesToAdd.map(n => n.note).join(', ')}`);
                }
            }
        }

        // 最終確認ログ
        if (availableNotes.length >= requiredNotes) {
            console.log(`✅ ${requiredNotes}音確保完了: ${availableNotes.map(n => n.note).join(', ')}`);
        }

        // 拡張失敗時の警告
        if (notesToAdd.length === 0) {
            console.error(`❌ 拡張失敗: 候補音が見つかりませんでした`);
            console.error(`   音域: ${lowFreq.toFixed(1)}Hz - ${highFreq.toFixed(1)}Hz`);
            console.error(`   ${currentScaleDirection === 'descending' ? '低音側' : '高音側'}に拡張できる音がありません`);
        }
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
 * @param {Object} config - モード設定 (ModeController.getMode(modeId))
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
        // 【v2.10.0追加】フォールバック: 利用可能な音を繰り返し使用してセッション数を確保
        console.warn(`⚠️ フォールバック: ${actualCount}音を繰り返し使用して${maxSessions}セッションを実行`);
        for (let session = 0; session < maxSessions; session++) {
            const note = chromaticNotes[session % actualCount];
            if (note) {
                selectedNotes.push(note);
            }
        }
        console.log(`⚠️ フォールバック選択: ${selectedNotes.map(n => n.note).join(' → ')}`);
        return selectedNotes;
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
// 【削除】古い実装（selectNoteFromZone, selectNoteWithDistance, selectBaseNote, setupHomeButton）は削除しました
// 新しい実装（selectAllBaseNotesForMode）を使用してください
// ホームボタンはindex.htmlのhandleFooterHomeButtonClick()で管理されています

/**
 * ブラウザバック防止はrouter.jsでグローバルに管理されています
 * （この機能は削除されました - router.jsを参照）
 */
