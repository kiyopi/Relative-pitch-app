/**
 * home-direction-tabs.js
 * ホームページの上行・下行タブナビゲーション管理 + クイックスタート機能
 * 注意: data-direction属性を持つタブのみを対象（詳細分析のdata-tabタブとは干渉しない）
 *
 * @version v202511291400
 * 【v202511291400修正内容】
 * - クイックスタート機能追加（前回のモード・方向で開始）
 * - localStorage永続化（pitchpro_last_mode, pitchpro_last_direction）
 * - 上行=青、下行=赤の色分け対応
 * 【v202511181300修正内容】
 * - ランダム基音・連続チャレンジのボタンにdata-direction属性を動的追加
 * - 準備ページ遷移時に方向パラメータが正しく渡されるように修正
 */

// クイックスタート設定のlocalStorageキー
const QUICK_START_MODE_KEY = 'pitchpro_last_mode';
const QUICK_START_DIRECTION_KEY = 'pitchpro_last_direction';

// 上行・下行タブナビゲーション初期化
class DirectionTabsManager {
    constructor() {
        this.init();
    }

    init() {
        // DOMContentLoadedが既に完了している場合を考慮
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                // Lucideアイコン初期化を待つ
                setTimeout(() => this.initializeDirectionTabs(), 200);
            });
        } else {
            // 既に完了している場合は即座に実行
            setTimeout(() => this.initializeDirectionTabs(), 200);
        }
    }

    initializeDirectionTabs() {
        // data-direction属性を持つタブのみを対象（詳細分析のdata-tabタブとは干渉しない）
        const directionTabs = document.querySelectorAll('.tab-button[data-direction]');
        const directionPanels = document.querySelectorAll('.direction-info-panel');

        if (directionTabs.length === 0 || directionPanels.length === 0) {
            return; // タブが存在しないページではスキップ
        }

        // クイックスタート初期化
        this.initializeQuickStart();

        // デフォルトで上行モードを設定
        if (!sessionStorage.getItem('trainingDirection')) {
            sessionStorage.setItem('trainingDirection', 'ascending');
        }

        directionTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const direction = tab.dataset.direction;

                // 全タブのactive削除（data-direction属性を持つタブのみ）
                directionTabs.forEach(t => t.classList.remove('active'));
                directionPanels.forEach(p => p.classList.remove('active'));

                // 選択されたタブとパネルをactive化
                tab.classList.add('active');
                const targetPanel = document.getElementById(`${direction}-info`);
                if (targetPanel) {
                    targetPanel.classList.add('active');
                }

                // sessionStorageに保存
                sessionStorage.setItem('trainingDirection', direction);

                // トレーニングモードボタンを更新
                this.updateTrainingButtons(direction);

                console.log(`🔀 [HOME] Direction tab switched to: ${direction}`);
            });
        });

        // 初期表示時: sessionStorageから復元
        const currentDirection = sessionStorage.getItem('trainingDirection') || 'ascending';

        // タブUIを復元
        directionTabs.forEach(t => t.classList.remove('active'));
        directionPanels.forEach(p => p.classList.remove('active'));

        const activeTab = document.querySelector(`.tab-button[data-direction="${currentDirection}"]`);
        const activePanel = document.getElementById(`${currentDirection}-info`);

        if (activeTab) {
            activeTab.classList.add('active');
        }
        if (activePanel) {
            activePanel.classList.add('active');
        }

        // ボタンを更新
        this.updateTrainingButtons(currentDirection);

        console.log(`✅ [HOME] Direction tabs initialized - restored to: ${currentDirection}`);
    }

    updateTrainingButtons(direction) {
        const isAscending = direction === 'ascending';

        // ランダム基音モード・連続チャレンジモードのボタン更新
        const simpleButtons = document.querySelectorAll('.mode-card[data-mode="random"] .btn, .mode-card[data-mode="continuous"] .btn');

        simpleButtons.forEach(button => {
            const textSpan = button.querySelector('span');
            let iconElement = button.querySelector('i[data-lucide]');

            if (!iconElement) {
                iconElement = button.querySelector('svg');
            }

            if (textSpan) {
                // data-direction属性を動的に設定
                button.setAttribute('data-direction', direction);

                // テキスト更新
                textSpan.textContent = isAscending ? '始める（上行）' : '始める（下行）';

                // アイコン更新（統一関数を使用）
                if (iconElement) {
                    const iconName = isAscending ? 'move-up-right' : 'move-down-right';
                    const iconWrapper = iconElement.parentElement;
                    if (typeof window.updateLucideIcon === 'function') {
                        window.updateLucideIcon(iconWrapper, iconName, {
                            width: '24px',
                            height: '24px'
                        });
                    }
                }

                // 色更更新
                if (isAscending) {
                    button.classList.remove('btn-danger');
                    button.classList.add('btn-primary');
                } else {
                    button.classList.remove('btn-primary');
                    button.classList.add('btn-danger');
                }
            }
        });

        // 12音階モードのボタン更新
        const twelvetoneButtons = document.querySelectorAll('.mode-card[data-mode="12tone"] .btn');

        twelvetoneButtons.forEach(button => {
            const chromaticDir = button.getAttribute('data-direction');
            const textSpan = button.querySelector('span');
            let iconElement = button.querySelector('i[data-lucide]');

            if (!iconElement) {
                iconElement = button.querySelector('svg');
            }

            if (textSpan && chromaticDir) {
                // data-direction属性に基づいてテキストを設定
                const modeText = chromaticDir === 'ascending' ? '上昇' :
                                chromaticDir === 'descending' ? '下降' : '両方向24回';

                textSpan.textContent = isAscending ? `${modeText}（上行）` : `${modeText}（下行）`;

                // アイコン更新処理（統一関数を使用）
                if (iconElement) {
                    const originalIcon = chromaticDir === 'ascending' ? 'trending-up' :
                                       chromaticDir === 'descending' ? 'trending-down' : 'repeat';
                    const iconWrapper = iconElement.parentElement;
                    if (typeof window.updateLucideIcon === 'function') {
                        window.updateLucideIcon(iconWrapper, originalIcon, {
                            width: '20px',
                            height: '20px'
                        });
                    }
                }

                // 色更新
                if (isAscending) {
                    button.classList.remove('btn-danger');
                    button.classList.add('btn-primary');
                } else {
                    button.classList.remove('btn-primary');
                    button.classList.add('btn-danger');
                }
            }
        });

        // Lucideアイコンを再初期化
        if (typeof window.initializeLucideIcons === 'function') {
            window.initializeLucideIcons({ immediate: true });
        }

        // クイックスタートはタブ切り替えと同期しない（前回設定を維持）
    }

    /**
     * クイックスタート初期化
     */
    initializeQuickStart() {
        const quickStartBtn = document.getElementById('quick-start-btn');
        if (!quickStartBtn) {
            console.log('ℹ️ [HOME] クイックスタートボタンなし');
            return;
        }

        // クリックイベント設定
        quickStartBtn.addEventListener('click', () => this.handleQuickStartClick());

        // 初期表示更新
        this.updateQuickStartButton();

        console.log('✅ [HOME] クイックスタート初期化完了');
    }

    /**
     * クイックスタートボタンの表示を更新
     */
    updateQuickStartButton() {
        const quickStartBtn = document.getElementById('quick-start-btn');
        const quickStartMode = document.getElementById('quick-start-mode');
        if (!quickStartBtn || !quickStartMode) return;

        // 前回の設定を取得（localStorage）、なければデフォルト
        const lastMode = localStorage.getItem(QUICK_START_MODE_KEY) || 'random';
        const lastDirection = localStorage.getItem(QUICK_START_DIRECTION_KEY) || 'ascending';

        // 現在のタブ選択状態を取得（sessionStorage優先）
        const currentDirection = sessionStorage.getItem('trainingDirection') || lastDirection;

        // ModeControllerからモード表示名を取得
        let displayName = 'ランダム基音 上行';
        if (typeof ModeController !== 'undefined' && ModeController.getDisplayName) {
            displayName = ModeController.getDisplayName(lastMode, {
                scaleDirection: currentDirection,
                useShortName: true
            });
        } else {
            // フォールバック
            const modeNames = {
                'random': 'ランダム基音',
                'continuous': '連続チャレンジ',
                '12tone': '12音階'
            };
            const directionNames = {
                'ascending': '上行',
                'descending': '下行'
            };
            displayName = `${modeNames[lastMode] || 'ランダム基音'} ${directionNames[currentDirection] || '上行'}`;
        }

        // テキスト更新
        quickStartMode.textContent = displayName;

        // 色更新（上行=青、下行=赤）
        if (currentDirection === 'descending') {
            quickStartBtn.classList.remove('btn-primary');
            quickStartBtn.classList.add('btn-danger');
        } else {
            quickStartBtn.classList.remove('btn-danger');
            quickStartBtn.classList.add('btn-primary');
        }

        console.log(`🔄 [HOME] クイックスタート更新: ${displayName}, direction=${currentDirection}`);
    }

    /**
     * クイックスタートボタンクリック処理
     */
    handleQuickStartClick() {
        // 前回の設定を取得
        const lastMode = localStorage.getItem(QUICK_START_MODE_KEY) || 'random';
        const currentDirection = sessionStorage.getItem('trainingDirection') || 'ascending';

        console.log(`🚀 [HOME] クイックスタート: mode=${lastMode}, direction=${currentDirection}`);

        // sessionStorageに方向を設定（準備ページで使用）
        sessionStorage.setItem('trainingDirection', currentDirection);

        // 準備ページへ遷移
        if (typeof NavigationManager !== 'undefined' && NavigationManager.navigate) {
            // NavigationManager経由で遷移
            const params = new URLSearchParams();
            params.set('mode', lastMode);
            params.set('session', '1');
            params.set('scaleDirection', currentDirection);
            window.location.hash = `preparation?${params.toString()}`;
        } else {
            // フォールバック
            window.location.hash = `preparation?mode=${lastMode}&session=1&scaleDirection=${currentDirection}`;
        }
    }
}

// 初期化
if (typeof window !== 'undefined') {
    const directionTabsManager = new DirectionTabsManager();

    // SPAのページ遷移後も再初期化（hashchangeイベント）
    window.addEventListener('hashchange', () => {
        // テンプレート読み込みを待つ（複数回チェック）
        let attempts = 0;
        const checkAndInit = () => {
            const directionTabs = document.querySelectorAll('.tab-button[data-direction]');
            if (directionTabs.length > 0) {
                if (directionTabsManager) {
                    directionTabsManager.initializeDirectionTabs();
                }
            } else if (attempts < 10) {
                attempts++;
                setTimeout(checkAndInit, 50);
            }
        };
        setTimeout(checkAndInit, 50);
    });
}
