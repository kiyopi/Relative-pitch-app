# DistributionChartコンポーネント仕様書

## 📋 基本情報
- 作成日: 2025-11-15
- バージョン: 1.0.0
- ファイルパス: `/js/components/DistributionChart.js`

## 🎯 目的

セッション評価・総合評価・トレーニング記録で共通使用する評価分布バーを表示するコンポーネント。
統一されたアニメーションと改善トレンド表示機能を提供。

## 🔧 主要機能

1. **評価分布計算**: Excellent/Good/Pass/Practiceの4段階評価を集計
2. **改善トレンド計算**: 過去1週間 vs 全期間平均の比較
3. **アニメーション**: プログレスバーの滑らかな伸長アニメーション（0.8秒）
4. **モード別フィルタリング**: 特定モードのセッションのみ集計可能

## 📊 評価基準

```javascript
// EvaluationCalculator.evaluatePitchError() に基づく
Excellent: ±20¢以内
Good:      ±50¢以内
Pass:      ±70¢以内
Practice:  ±70¢超
```

## 🎨 表示形式

### 基本表示（改善トレンドなし）
```
🏆 Excellent  ████████████████████████  75%  180
⭐ Good       ██████░░░░░░░░░░░░░░░░  15%   36
👍 Pass       ███░░░░░░░░░░░░░░░░░░░   8%   19
📝 Practice   █░░░░░░░░░░░░░░░░░░░░   2%    5
```

### 拡張表示（改善トレンド付き）
```
🏆 Excellent  ████████████████████████  75%  180
⭐ Good       ██████░░░░░░░░░░░░░░░░  15%   36
👍 Pass       ███░░░░░░░░░░░░░░░░░░░   8%   19
📝 Practice   █░░░░░░░░░░░░░░░░░░░░   2%    5

📈 直近の成長（過去1週間 vs 全期間平均）
・Excellent率: 82% (全期間比 +7% ↑) 改善中！
・Practice減少: 2音 (3音減少) 苦手な音が減少
```

## 🔧 メソッド仕様

### calculateDistribution(sessionData)

**目的**: セッションデータから評価分布を計算

**引数**:
```javascript
sessionData: Array<{
    pitchErrors: Array<{
        errorInCents: number
    }>
}>
```

**戻り値**:
```javascript
{
    excellent: number,  // Excellent評価の音数
    good: number,       // Good評価の音数
    pass: number,       // Pass評価の音数
    practice: number,   // Practice評価の音数
    total: number       // 全音数
}
```

**処理フロー**:
1. 各セッションのpitchErrorsを反復
2. EvaluationCalculator.evaluatePitchError()で評価
3. 評価レベル別にカウント

### calculateTrend(allSessions, period)

**目的**: 改善トレンドを計算

**引数**:
```javascript
allSessions: Array<Session>  // 全セッションデータ
period: 'week' | 'month'     // 比較期間
```

**戻り値**:
```javascript
{
    excellentRate: number,      // 直近期間のExcellent率（%）
    excellentChange: number,    // 全期間平均との差分（%）
    practiceCount: number,      // 直近期間のPractice数
    practiceChange: number,     // 全期間平均との差分（音数）
    trend: 'improving' | 'stable' | 'declining',  // トレンド
    periodLabel: string         // '過去1週間' | '過去1ヶ月'
} | null
```

**処理フロー**:
1. 期間のカットオフ日時を計算
2. 全期間と直近期間の評価分布を計算
3. Excellent率の変化を計算
4. Practice数の変化を計算
5. トレンド判定（improving/stable/declining）

**データ不足時**: `null`を返す

### render(options)

**目的**: 評価分布をDOMにレンダリング

**引数**:
```javascript
{
    containerId: string,         // コンテナ要素のID（必須）
    sessionData: Array<Session>, // セッションデータ（必須）
    showTrend: boolean,          // 改善トレンド表示（デフォルト: false）
    trendPeriod: 'week' | 'month', // トレンド期間（デフォルト: 'week'）
    animate: boolean,            // アニメーション有効化（デフォルト: true）
    showDescription: boolean     // 説明文表示（デフォルト: true）
}
```

**処理フロー**:
1. コンテナ要素の取得
2. 評価分布の計算
3. 改善トレンドの計算（showTrend=trueの場合）
4. HTMLの生成
5. DOMへの挿入
6. アニメーションの実行
7. Lucideアイコン初期化

### animateBars(container)

**目的**: プログレスバーのアニメーション実行

**引数**:
```javascript
container: HTMLElement  // コンテナ要素
```

**処理**:
1. `.distribution-bar`クラスを持つ要素を取得
2. `data-width`属性から目標幅を取得
3. `requestAnimationFrame`で次フレームに幅を設定
4. CSS transitionでアニメーション実行

**アニメーション仕様**:
```css
transition: width 0.8s ease-out;
```

## 🎨 CSS クラス

### 必要なCSSクラス（base.css）

```css
/* プログレスバー */
.progress-bar {
    height: 10px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 4px;
    overflow: hidden;
}

.progress-fill-custom {
    height: 100%;
    border-radius: 4px;
}

/* 評価カラー */
.color-eval-gold { background: linear-gradient(90deg, #fbbf24, #f59e0b); }
.color-eval-good { background: linear-gradient(90deg, #10b981, #059669); }
.color-eval-pass { background: linear-gradient(90deg, #3b82f6, #2563eb); }
.color-eval-practice { background: linear-gradient(90deg, #ef4444, #dc2626); }

/* アニメーション */
.distribution-bar {
    transition: width 0.8s ease-out;
}
```

## 📝 使用例

### セッション評価ページ
```javascript
DistributionChart.render({
    containerId: 'distribution-container',
    sessionData: [currentSession],
    showTrend: false,
    animate: true,
    showDescription: false
});
```

### 総合評価ページ
```javascript
DistributionChart.render({
    containerId: 'distribution-container',
    sessionData: allSessions,
    showTrend: false,
    animate: true,
    showDescription: true
});
```

### トレーニング記録ページ
```javascript
DistributionChart.render({
    containerId: 'distribution-container',
    sessionData: getAllSessionsData(),
    showTrend: true,
    trendPeriod: 'week',
    animate: true,
    showDescription: true
});
```

### モード別フィルタリング
```javascript
// ランダム基音モードのみ
const filteredSessions = allSessions.flatMap(lesson => 
    lesson.mode === 'random' ? lesson.sessions : []
);

DistributionChart.render({
    containerId: 'distribution-container',
    sessionData: filteredSessions,
    showTrend: true,
    animate: true
});
```

## 🔄 既存コードからの移行

### Before（results-overview-controller.js）
```javascript
function displayOverallDistribution(sessionData) {
    const distribution = {
        excellent: 0,
        good: 0,
        pass: 0,
        practice: 0
    };
    
    // ... 計算ロジック ...
    
    container.innerHTML = `
        <!-- HTML生成 -->
    `;
}
```

### After
```javascript
DistributionChart.render({
    containerId: 'distribution-container',
    sessionData: sessionData,
    showTrend: false,
    animate: true,
    showDescription: true
});
```

## ⚠️ 注意事項

1. **データ形式**: sessionDataは必ず`pitchErrors`プロパティを持つこと
2. **コンテナID**: renderの前にHTMLでコンテナを用意すること
3. **Lucide初期化**: `window.initializeLucideIcons`が存在する前提
4. **EvaluationCalculator依存**: `window.EvaluationCalculator.evaluatePitchError()`が必須
5. **アニメーション**: 初期表示時のみアニメーション実行（再レンダリング時は即座に反映）

## 🧪 テスト項目

1. **基本表示**: 評価分布が正しく表示されるか
2. **アニメーション**: プログレスバーが0%から目標値まで伸長するか
3. **改善トレンド**: showTrend=trueで正しいトレンドが表示されるか
4. **データなし**: sessionData=[]で適切なメッセージが表示されるか
5. **Lucideアイコン**: アイコンが正しく表示されるか
6. **モード別**: フィルタリングしたデータで正しく計算されるか

## 🔗 関連ファイル

- `/js/components/DistributionChart.js` (本体)
- `/js/components/index.js` (エクスポート)
- `/styles/base.css` (CSS定義)
- `/js/evaluation-calculator.js` (評価ロジック)

## 📋 変更履歴
- 2025-11-15: 初版作成
