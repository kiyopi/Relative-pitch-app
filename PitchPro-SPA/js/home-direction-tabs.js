/**
 * home-direction-tabs.js
 * ホームページの上行・下行タブナビゲーション管理
 * 注意: data-direction属性を持つタブのみを対象（詳細分析のdata-tabタブとは干渉しない）
 */

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

        // 初期表示時もボタンを更新
        const currentDirection = sessionStorage.getItem('trainingDirection') || 'ascending';
        this.updateTrainingButtons(currentDirection);

        console.log('✅ [HOME] Direction tabs initialized');
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
                // テキスト更新
                textSpan.textContent = isAscending ? '始める（上行）' : '始める（下行）';

                // アイコン更新
                if (iconElement && iconElement.tagName === 'svg') {
                    const newIcon = document.createElement('i');
                    newIcon.setAttribute('data-lucide', isAscending ? 'move-up-right' : 'move-down-right');
                    newIcon.style.width = '24px';
                    newIcon.style.height = '24px';
                    iconElement.replaceWith(newIcon);
                } else if (iconElement) {
                    iconElement.setAttribute('data-lucide', isAscending ? 'move-up-right' : 'move-down-right');
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

                // アイコン更新処理（Lucide再初期化のため）
                if (iconElement && iconElement.tagName === 'svg') {
                    const originalIcon = chromaticDir === 'ascending' ? 'trending-up' :
                                       chromaticDir === 'descending' ? 'trending-down' : 'repeat';
                    const newIcon = document.createElement('i');
                    newIcon.setAttribute('data-lucide', originalIcon);
                    newIcon.style.width = '20px';
                    newIcon.style.height = '20px';
                    iconElement.replaceWith(newIcon);
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
