/**
 * ミニマルSPA司令塔 - PitchPro継承テスト用
 * @version 1.0.0
 */

// グローバル状態管理
let sharedAudioDetector = null;
let currentPage = null;
let micPermissionManager = null; // マイク許可管理コンポーネント

// ログ出力関数
function log(message, type = 'info') {
    const timestamp = new Date().toLocaleTimeString();
    const statusLog = document.getElementById('status-log');
    const icon = type === 'error' ? '❌' : type === 'success' ? '✅' : '📝';

    const logEntry = document.createElement('div');
    logEntry.textContent = `${timestamp} ${icon} ${message}`;
    statusLog.appendChild(logEntry);
    statusLog.scrollTop = statusLog.scrollHeight;

    console.log(`[${type.toUpperCase()}] ${message}`);
}

// ページ切り替え機能
export async function showPage(pageName, options = {}) {
    log(`ページ切り替え開始: ${pageName}`);

    try {
        // 1. ナビゲーションボタン更新
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.page === pageName);
        });

        // 2. テンプレート読み込み
        log(`テンプレート読み込み中: templates/${pageName}.html`);
        const response = await fetch(`templates/${pageName}.html`);

        if (!response.ok) {
            throw new Error(`テンプレート読み込み失敗: ${response.status}`);
        }

        const html = await response.text();

        // 3. HTML挿入
        const mainContainer = document.getElementById('app-main');
        mainContainer.innerHTML = html;
        log(`テンプレート挿入完了: ${pageName}`);

        // 4. Lucideアイコン初期化
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }

        // 5. PitchProインスタンス管理
        await handlePitchProInstance(pageName);

        // 6. ページ固有初期化（awaitが抜けていた！）
        await initializePage(pageName, options);

        currentPage = pageName;
        log(`ページ切り替え完了: ${pageName}`, 'success');

    } catch (error) {
        log(`ページ切り替えエラー: ${pageName} - ${error.message}`, 'error');
        showErrorPage(error.message);
    }
}

// PitchProインスタンス管理（修正版：初期化はユーザー操作時）
async function handlePitchProInstance(pageName) {
    try {
        // ページ読み込み時は何もしない（重要！）
        log(`PitchProインスタンス管理: ${pageName} - 初期化はボタンクリック時に実行`);
    } catch (error) {
        log(`PitchPro管理エラー: ${error.message}`, 'error');
        throw error;
    }
}

// ページ固有UIセレクター取得
function getUISelectorsForPage(pageName) {
    const selectorMap = {
        'mic-test': {
            volumeBarSelector: '#mic-test-volume-bar',
            volumeTextSelector: '#mic-test-volume-text',
            frequencySelector: '#mic-test-frequency'
        },
        'audio-test': {
            volumeBarSelector: '#audio-test-volume-bar',
            volumeTextSelector: '#audio-test-volume-text',
            frequencySelector: '#audio-test-frequency'
        }
    };

    return selectorMap[pageName] || null;
}

// ページ固有初期化
async function initializePage(pageName, options) {
    const pageInitializers = {
        'mic-test': initializeMicTestPage,
        'audio-test': initializeAudioTestPage
    };

    const initializer = pageInitializers[pageName];
    if (initializer) {
        // グローバル変数を確実に渡す
        if (!sharedAudioDetector) {
            log('警告: sharedAudioDetectorが未初期化です', 'error');
        }
        await initializer(sharedAudioDetector, options);
    }
}

// マイクテストページ初期化
async function initializeMicTestPage(audioDetector) {
    log('マイクテストページ初期化開始');

    // MicPermissionManagerコンポーネントを初期化
    if (!micPermissionManager) {
        micPermissionManager = new window.MicPermissionManager({
            debugMode: true,
            onPermissionGranted: (stream) => {
                log('📱 マイク許可が付与されました', 'success');
            },
            onPermissionDenied: (error) => {
                log(`📱 マイク許可が拒否されました: ${error.message}`, 'error');
            },
            onPitchProReady: (instance) => {
                log('📱 PitchProインスタンス準備完了', 'success');
                sharedAudioDetector = instance; // グローバル変数に保存
            },
            onError: (error) => {
                log(`📱 エラー発生: ${error.message}`, 'error');
            }
        });
        log('MicPermissionManagerコンポーネント初期化完了');
    }

    const startBtn = document.getElementById('start-mic-test');
    if (startBtn) {
        log('マイクテストボタン発見');

        startBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            log('マイクテストボタンクリックイベント発火');

            try {
                // コンポーネントを使用して2段階初期化
                const result = await micPermissionManager.initialize();
                log('✅ 2段階初期化完了', 'success');

                // UIセレクター設定
                const selectors = getUISelectorsForPage('mic-test');
                if (selectors) {
                    micPermissionManager.setUISelectors(selectors);
                }

                // 音声検出開始
                await micPermissionManager.startDetection();
                log('音声検出開始成功', 'success');

                // 次のページへのボタンを有効化
                const nextBtn = document.getElementById('go-to-audio-test');
                if (nextBtn) {
                    nextBtn.disabled = false;
                    nextBtn.textContent = '音声テストページへ ✅';
                }

            } catch (error) {
                log(`音声検出開始エラー: ${error.message}`, 'error');
                console.error('詳細エラー:', error);
            }
        });
    } else {
        log('エラー: マイクテストボタンが見つかりません', 'error');
    }

    const nextBtn = document.getElementById('go-to-audio-test');
    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            showPage('audio-test');
        });
    }
}

// 音声テストページ初期化
async function initializeAudioTestPage(audioDetector) {
    log('音声テストページ初期化開始');

    // micPermissionManagerが存在する場合、それを使用
    if (micPermissionManager && micPermissionManager.getStatus().isInitialized) {
        try {
            log('MicPermissionManagerで音声検出再開中...');

            // UIセレクター更新
            const selectors = getUISelectorsForPage('audio-test');
            if (selectors) {
                micPermissionManager.setUISelectors(selectors);
            }

            // コールバック設定
            micPermissionManager.setCallbacks({
                onPitchUpdate: (result) => {
                    if (result.frequency > 100) {
                        log(`音声検出: ${result.frequency.toFixed(1)}Hz (${result.note || 'unknown'})`);

                        // 検出ログに追加
                        const logDiv = document.getElementById('detection-log');
                        if (logDiv) {
                            const timestamp = new Date().toLocaleTimeString();
                            logDiv.textContent = `${timestamp}: ${result.frequency.toFixed(1)}Hz - ${result.note || 'unknown'}\n` + logDiv.textContent;
                        }
                    }
                },
                onError: (error) => {
                    log(`音声検出エラー: ${error.message}`, 'error');
                }
            });

            // 音声検出再開
            await micPermissionManager.startDetection();
            log('音声検出再開成功（マイク許可継承確認）', 'success');

            // 成功チェックマーク更新
            document.getElementById('check-no-dialog').textContent = '✅';
            document.getElementById('check-audio-detection').textContent = '✅';

        } catch (error) {
            log(`音声テスト初期化エラー: ${error.message}`, 'error');
        }
    } else {
        log('警告: MicPermissionManagerが未初期化です。マイクテストページで初期化してください。', 'error');
    }

    const backBtn = document.getElementById('back-to-mic-test');
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            showPage('mic-test');
        });
    }
}

// エラーページ表示
function showErrorPage(errorMessage) {
    const mainContainer = document.getElementById('app-main');
    mainContainer.innerHTML = `
        <div class="error-page">
            <h3>❌ エラーが発生しました</h3>
            <p>${errorMessage}</p>
            <button onclick="window.location.reload()">再読み込み</button>
        </div>
    `;
}

// ナビゲーション設定
function setupNavigation() {
    document.addEventListener('click', (e) => {
        if (e.target.matches('.nav-btn')) {
            const page = e.target.dataset.page;
            showPage(page);
        }
    });
}

// アプリケーション初期化
async function initializeApp() {
    log('アプリケーション初期化開始');

    // ライブラリ読み込み確認
    log(`PitchProライブラリ確認: ${typeof window.PitchPro !== 'undefined' ? 'OK' : 'NG'}`);
    if (window.PitchPro) {
        log(`AudioDetectionComponent確認: ${typeof window.PitchPro.AudioDetectionComponent !== 'undefined' ? 'OK' : 'NG'}`);
    }
    log(`globalAudioManager確認: ${typeof window.globalAudioManager !== 'undefined' ? 'OK' : 'NG'}`);

    try {
        setupNavigation();
        await showPage('mic-test');
        log('アプリケーション初期化完了', 'success');
    } catch (error) {
        log(`アプリケーション初期化失敗: ${error.message}`, 'error');
        console.error('詳細エラー:', error);
    }
}

// DOM読み込み完了時に初期化
document.addEventListener('DOMContentLoaded', initializeApp);

// グローバル関数として公開
window.testSpa = { showPage, log };