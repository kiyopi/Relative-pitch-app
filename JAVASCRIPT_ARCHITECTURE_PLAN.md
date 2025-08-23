# JavaScript アーキテクチャ再構築計画

## 📅 作成日: 2025-08-23
## 🎯 目的: JavaScriptコードの肥大化問題を解決し、保守可能な構造を確立

---

## 🔴 現状の深刻な問題

### 1. インラインスクリプトの肥大化
- **results-freemium-basic-8sessions.html**: 861行のインラインJavaScript
- **各resultsページ**: それぞれ数百行のスクリプト
- **合計**: 数千行のJavaScriptが無秩序に散在

### 2. コードの重複と試作の蓄積
```
現在の状況：
- セッション生成ロジック → 各ページで独自実装
- グラフ描画 → 何度も試作、古いコードが残存
- アニメーション → ページごとに異なる実装
- データ処理 → 統一されていない処理方式
```

### 3. 保守性の完全な欠如
- どの機能がどこにあるか不明
- 修正時の影響範囲が予測不可能
- デバッグが極めて困難
- テスト不可能

---

## 🎯 理想的なJavaScriptアーキテクチャ

### 1. モジュール構造
```
js/
├── core/
│   ├── constants.js        # 定数定義
│   ├── utils.js            # 汎用ユーティリティ
│   └── dom-helpers.js      # DOM操作ヘルパー
├── components/
│   ├── session-grid.js     # セッショングリッド
│   ├── stats-card.js       # 統計カード
│   ├── chart-manager.js    # グラフ管理
│   └── animation.js        # アニメーション
├── data/
│   ├── session-data.js     # セッションデータ処理
│   ├── grade-calculator.js # グレード計算
│   └── mock-data.js        # モックデータ
├── pages/
│   ├── results-overview.js # 総合評価ページ
│   ├── results-analysis.js # 詳細分析ページ
│   └── training.js         # トレーニングページ
└── app.js                   # アプリケーション初期化
```

### 2. 共通コンポーネント化

#### セッショングリッドコンポーネント
```javascript
// js/components/session-grid.js
export class SessionGrid {
    constructor(container, options = {}) {
        this.container = container;
        this.sessions = options.sessions || [];
        this.columns = options.columns || 8;
        this.onSessionClick = options.onSessionClick || null;
    }
    
    render() {
        // UIカタログ準拠のHTML生成
        const html = this.sessions.map(session => 
            this.createSessionBox(session)
        ).join('');
        
        this.container.innerHTML = `
            <div class="session-grid session-grid-${this.columns}">
                ${html}
            </div>
        `;
        
        this.attachEventListeners();
    }
    
    createSessionBox(session) {
        // CSS中心設計（Lucideアイコンは例外）
        const gradeClass = `session-box--${session.grade}`;
        return `
            <div class="session-box ${gradeClass}" data-session-id="${session.id}">
                <div class="session-number">セッション${session.id}</div>
                <div class="session-icon">
                    <i data-lucide="${session.icon}" style="width: 24px; height: 24px;"></i>
                </div>
            </div>
        `;
    }
}
```

#### グラフマネージャー
```javascript
// js/components/chart-manager.js
export class ChartManager {
    constructor(canvasId, type = 'line') {
        this.canvas = document.getElementById(canvasId);
        this.type = type;
        this.chart = null;
        this.defaultOptions = this.getDefaultOptions();
    }
    
    getDefaultOptions() {
        // 統一されたグラフオプション
        return {
            responsive: true,
            plugins: {
                legend: { display: false },
                tooltip: { 
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleColor: '#fff',
                    bodyColor: '#fff'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(255, 255, 255, 0.1)' },
                    ticks: { color: 'rgba(255, 255, 255, 0.7)' }
                },
                x: {
                    grid: { color: 'rgba(255, 255, 255, 0.1)' },
                    ticks: { color: 'rgba(255, 255, 255, 0.7)' }
                }
            }
        };
    }
    
    renderErrorTrend(data) {
        // 誤差推移グラフの統一実装
        if (this.chart) this.chart.destroy();
        
        this.chart = new Chart(this.canvas, {
            type: 'line',
            data: this.formatErrorData(data),
            options: {
                ...this.defaultOptions,
                plugins: {
                    ...this.defaultOptions.plugins,
                    annotation: {
                        annotations: {
                            zeroLine: {
                                type: 'line',
                                yMin: 0,
                                yMax: 0,
                                borderColor: 'rgba(255, 255, 255, 0.5)',
                                borderWidth: 1
                            }
                        }
                    }
                }
            }
        });
    }
}
```

### 3. データ処理の統一

```javascript
// js/data/grade-calculator.js
export class GradeCalculator {
    static GRADE_THRESHOLDS = {
        S: { maxError: 5, minAccuracy: 95 },
        A: { maxError: 10, minAccuracy: 90 },
        B: { maxError: 20, minAccuracy: 80 },
        C: { maxError: 30, minAccuracy: 70 },
        D: { maxError: 40, minAccuracy: 60 },
        E: { maxError: Infinity, minAccuracy: 0 }
    };
    
    static calculate(sessions) {
        const avgError = this.calculateAverageError(sessions);
        const accuracy = this.calculateAccuracy(sessions);
        
        for (const [grade, threshold] of Object.entries(this.GRADE_THRESHOLDS)) {
            if (avgError <= threshold.maxError && accuracy >= threshold.minAccuracy) {
                return grade;
            }
        }
        return 'E';
    }
    
    static calculateAverageError(sessions) {
        // 統一された誤差計算ロジック
        const errors = sessions.flatMap(s => s.notes.map(n => Math.abs(n.error)));
        return errors.reduce((sum, e) => sum + e, 0) / errors.length;
    }
}
```

### 4. ページ初期化の標準化

```javascript
// js/pages/results-overview.js
import { SessionGrid } from '../components/session-grid.js';
import { ChartManager } from '../components/chart-manager.js';
import { GradeCalculator } from '../data/grade-calculator.js';
import { animateNumber } from '../components/animation.js';

export class ResultsOverviewPage {
    constructor() {
        this.sessionGrid = null;
        this.chartManager = null;
        this.sessionData = [];
    }
    
    async init() {
        // データ取得
        this.sessionData = await this.loadSessionData();
        
        // コンポーネント初期化
        this.initSessionGrid();
        this.initChart();
        this.initStats();
        
        // Lucideアイコン初期化
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }
    
    initSessionGrid() {
        const container = document.getElementById('session-grid-container');
        this.sessionGrid = new SessionGrid(container, {
            sessions: this.sessionData,
            columns: 8,
            onSessionClick: (sessionId) => this.showSessionDetail(sessionId)
        });
        this.sessionGrid.render();
    }
}

// ページ読み込み時に初期化
document.addEventListener('DOMContentLoaded', () => {
    const page = new ResultsOverviewPage();
    page.init();
});
```

---

## 🚀 移行計画

### Phase 1: 共通コンポーネント抽出（1週目）
1. results-freemium-basic-8sessions.htmlから共通機能を特定
2. コンポーネントファイルを作成
3. 単体テストを作成

### Phase 2: データ処理統一（2週目）
1. グレード計算ロジックの統一
2. セッションデータ形式の標準化
3. モックデータの整理

### Phase 3: 段階的移行（3-4週目）
1. 新規作成ページから新アーキテクチャ適用
2. 既存ページを1つずつ移行
3. インラインスクリプトを削除

### Phase 4: 最適化（5週目）
1. バンドル化（Webpack/Vite）
2. 未使用コード削除
3. パフォーマンス最適化

---

## 📊 期待される効果

### 定量的効果
- **コード量**: 50%削減（重複排除）
- **ファイルサイズ**: 30%削減
- **読み込み速度**: 40%向上
- **保守時間**: 70%削減

### 定性的効果
- デバッグが容易に
- 新機能追加が簡単に
- テスト可能なコード
- チーム開発が可能に

---

## 🔧 技術選定

### 必須ツール
- **モジュールバンドラー**: Vite（高速、設定簡単）
- **リンター**: ESLint（コード品質保証）
- **フォーマッター**: Prettier（スタイル統一）
- **テストフレームワーク**: Vitest（Vite統合）

### 推奨ライブラリ
- **Chart.js**: グラフ描画（既に使用中）
- **Lucide**: アイコン（既に使用中）

---

## 📝 コーディング規約

### 命名規則
```javascript
// クラス: PascalCase
class SessionManager {}

// 関数・変数: camelCase
function calculateGrade() {}
const sessionData = [];

// 定数: UPPER_SNAKE_CASE
const MAX_SESSIONS = 12;
const GRADE_THRESHOLDS = {};

// プライベート: アンダースコアプレフィックス
class Component {
    _privateMethod() {}
}
```

### インポート/エクスポート
```javascript
// 名前付きエクスポート（推奨）
export { SessionGrid, SessionManager };

// デフォルトエクスポート（ページクラスのみ）
export default ResultsOverviewPage;

// インポート
import { SessionGrid } from './components/session-grid.js';
```

---

## ⚠️ 移行時の注意事項

1. **既存機能を壊さない** - 段階的移行で動作保証
2. **UIカタログとの整合性** - HTML構造は変更しない
3. **Lucideアイコンの特殊対応** - インラインスタイル維持
4. **パフォーマンス監視** - 移行前後で計測

---

## 成功基準

- [ ] インラインスクリプト0行
- [ ] 共通コンポーネント化100%
- [ ] コード重複率5%以下
- [ ] 単体テストカバレッジ80%以上
- [ ] 読み込み時間30%改善

---

更新履歴：
- 2025-08-23: 初版作成