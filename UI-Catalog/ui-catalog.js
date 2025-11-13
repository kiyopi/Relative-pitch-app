// ui-catalog.js - UIカタログ専用JavaScript

// カタログナビゲーション自動生成
class CatalogNavigation {
    constructor() {
        this.catalogPages = [
            { file: 'ui-catalog-index.html', name: 'インデックス', color: '#60a5fa' },
            { file: 'ui-catalog-essentials.html', name: 'エッセンシャル', color: '#fbbf24' },
            { file: 'ui-catalog-top.html', name: 'トップページ', color: '#10b981' },
            { file: 'ui-catalog-components.html', name: 'コンポーネント', color: '#34d399' },
            { file: 'ui-catalog-results-session.html', name: 'セッション評価', color: '#a78bfa' },
            { file: 'ui-catalog-results-overall.html', name: '総合評価', color: '#fb923c' },
            { file: 'ui-catalog-results-analysis.html', name: '詳細分析', color: '#ef4444' },
            { file: 'ui-catalog-effects.html', name: 'エフェクト', color: '#8b5cf6' }
        ];
        this.init();
    }
    
    init() {
        const navContainer = document.getElementById('catalog-nav-links');
        if (!navContainer) return;
        
        const currentPage = window.location.pathname.split('/').pop();
        
        this.catalogPages.forEach(page => {
            const link = document.createElement('a');
            link.href = page.file;
            link.textContent = page.name;
            link.style.cssText = `
                color: ${page.color}; 
                text-decoration: none; 
                padding: 0.5rem 1rem; 
                border-radius: 0.5rem; 
                background: ${page.color}1a; 
                border: 1px solid ${page.color}33; 
                font-size: 0.875rem; 
                transition: all 0.3s ease;
                ${currentPage === page.file ? 'font-weight: bold; box-shadow: 0 0 0 2px ' + page.color + '66;' : ''}
            `;
            
            link.addEventListener('mouseenter', () => {
                link.style.background = page.color + '26';
                link.style.transform = 'translateY(-1px)';
            });
            
            link.addEventListener('mouseleave', () => {
                link.style.background = page.color + '1a';
                link.style.transform = 'translateY(0)';
            });
            
            navContainer.appendChild(link);
        });
    }
}

// コードサンプル管理システム
class CodeExampleManager {
    constructor() {
        this.examples = new Map();
        this.initializeExamples();
    }
    
    initializeExamples() {
        document.querySelectorAll('.code-example').forEach((example, index) => {
            const id = `code-example-${index}`;
            example.setAttribute('data-example-id', id);
            
            const copyBtn = example.querySelector('.code-copy-btn');
            if (copyBtn) {
                copyBtn.addEventListener('click', () => this.copyCode(id));
            }
        });
    }
    
    async copyCode(exampleId) {
        const example = document.querySelector(`[data-example-id="${exampleId}"]`);
        const codeSource = example.querySelector('.code-source pre');
        const copyBtn = example.querySelector('.code-copy-btn');
        
        if (!codeSource || !copyBtn) return;
        
        try {
            const codeText = codeSource.textContent;
            await navigator.clipboard.writeText(codeText);
            
            // ボタンの状態を変更
            const originalIcon = copyBtn.querySelector('i').getAttribute('data-lucide');
            const originalText = copyBtn.querySelector('.btn-text').textContent;
            
            copyBtn.classList.add('copied');
            copyBtn.querySelector('i').setAttribute('data-lucide', 'check');
            copyBtn.querySelector('.btn-text').textContent = 'コピー済み';
            
            // アイコンを更新
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
            
            // 2秒後に元に戻す
            setTimeout(() => {
                copyBtn.classList.remove('copied');
                copyBtn.querySelector('i').setAttribute('data-lucide', originalIcon);
                copyBtn.querySelector('.btn-text').textContent = originalText;
                
                if (typeof lucide !== 'undefined') {
                    lucide.createIcons();
                }
            }, 2000);
            
            console.log(`📋 [UI-CATALOG] Code copied for example: ${exampleId}`);
        } catch (err) {
            console.error('❌ [UI-CATALOG] Failed to copy code:', err);
        }
    }
    
    // 新しいコードサンプルを動的に作成する関数
    createExample(title, preview, code, containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        const exampleId = `code-example-${this.examples.size}`;
        
        const exampleHTML = `
            <div class="code-example" data-example-id="${exampleId}">
                <div class="code-example-header">
                    <span class="code-example-title">${title}</span>
                    <div class="code-example-actions">
                        <button class="code-copy-btn">
                            <i data-lucide="copy" style="width: 12px; height: 12px;"></i>
                            <span class="btn-text">コピー</span>
                        </button>
                    </div>
                </div>
                
                <div class="code-preview">
                    ${preview}
                </div>
                
                <div class="code-source">
                    <pre>${this.escapeHtml(code)}</pre>
                </div>
            </div>
        `;
        
        container.insertAdjacentHTML('beforeend', exampleHTML);
        
        // 新しく追加されたボタンにイベントリスナーを追加
        const newExample = container.querySelector(`[data-example-id="${exampleId}"]`);
        const copyBtn = newExample.querySelector('.code-copy-btn');
        copyBtn.addEventListener('click', () => this.copyCode(exampleId));
        
        // アイコンを初期化
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
        
        this.examples.set(exampleId, { title, preview, code });
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// UIカタログ初期化システム
class UICatalogManager {
    constructor() {
        this.codeExampleManager = null;
        this.init();
    }
    
    init() {
        document.addEventListener('DOMContentLoaded', () => {
            console.log('📄 [UI-CATALOG] DOM Content Loaded - starting initialization');
            
            // ナビゲーション初期化
            this.catalogNav = new CatalogNavigation();
            
            // アイコン初期化
            this.initializeIcons();
            
            // コードサンプル管理システムを初期化
            this.codeExampleManager = new CodeExampleManager();
            console.log('✅ [UI-CATALOG] Code example manager initialized');
            
            // 現在のページをナビゲーションでハイライト
            this.highlightCurrentPage();
            
            // コンポーネントの初期化
            this.initializeComponents();
        });
    }
    
    initializeIcons() {
        if (typeof lucide !== 'undefined' && lucide.createIcons) {
            lucide.createIcons();
            console.log('✅ [UI-CATALOG] Lucide icons initialized successfully');
        } else {
            console.error('❌ [UI-CATALOG] Lucide library not loaded');
        }
    }
    
    highlightCurrentPage() {
        const currentPage = window.location.pathname.split('/').pop();
        const navItems = document.querySelectorAll('.catalog-nav-item');
        
        navItems.forEach(item => {
            const href = item.getAttribute('href');
            if (href === currentPage) {
                item.classList.add('current');
                console.log(`🎯 [UI-CATALOG] Current page highlighted: ${currentPage}`);
            }
        });
    }
    
    initializeComponents() {
        setTimeout(() => {
            console.log('✨ [UI-CATALOG] All systems initialized');
            
            // カスタムイベントを発火（各カタログページで追加の初期化が必要な場合）
            document.dispatchEvent(new CustomEvent('uiCatalogReady', {
                detail: {
                    codeExampleManager: this.codeExampleManager
                }
            }));
        }, 500);
    }
    
    // 外部からアクセス可能なメソッド
    getCodeExampleManager() {
        return this.codeExampleManager;
    }
}

// 上行・下行タブナビゲーション初期化
class DirectionTabsManager {
    constructor() {
        this.init();
    }

    init() {
        document.addEventListener('DOMContentLoaded', () => {
            this.initializeDirectionTabs();
        });
    }

    initializeDirectionTabs() {
        const directionTabs = document.querySelectorAll('.tab-button[data-direction]');
        const directionPanels = document.querySelectorAll('.direction-info-panel');

        if (directionTabs.length === 0 || directionPanels.length === 0) {
            return; // タブが存在しないページではスキップ
        }

        directionTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const direction = tab.dataset.direction;

                // 全タブのactive削除
                directionTabs.forEach(t => t.classList.remove('active'));
                directionPanels.forEach(p => p.classList.remove('active'));

                // 選択されたタブとパネルをactive化
                tab.classList.add('active');
                const targetPanel = document.getElementById(`${direction}-info`);
                if (targetPanel) {
                    targetPanel.classList.add('active');
                }

                console.log(`🔀 [UI-CATALOG] Direction tab switched to: ${direction}`);
            });
        });

        console.log('✅ [UI-CATALOG] Direction tabs initialized');
    }
}

// グローバル変数として管理
let uiCatalogManager;
let codeExampleManager; // 後方互換性のため

// 初期化
if (typeof window !== 'undefined') {
    uiCatalogManager = new UICatalogManager();

    // 上行・下行タブマネージャーを初期化
    const directionTabsManager = new DirectionTabsManager();

    // 後方互換性のため、グローバルスコープでcodeExampleManagerも利用可能にする
    document.addEventListener('uiCatalogReady', (event) => {
        codeExampleManager = event.detail.codeExampleManager;
        window.codeExampleManager = codeExampleManager; // グローバルに追加
    });
}