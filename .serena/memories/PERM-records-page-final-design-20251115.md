# トレーニング記録ページ最終設計書

## 📋 作成日時
- 作成日: 2025-11-15
- バージョン: 1.0.0
- 関連ブランチ: feature/modular-spa-architecture

## 🎯 設計コンセプト

### ページの役割分担

#### トレーニング記録ページ (records.html)
**目的**: 継続のモチベーション維持・全体的な進捗把握

**求められるもの**:
- ✅ 一目で分かる成長
- ✅ シンプルで直感的
- ✅ ポジティブフィードバック
- ✅ 高速表示

**表示内容**:
1. トレーニング統計（継続状況・総計）
2. グレード推移グラフ（シンプル版）
3. 精度評価の分布 + 改善トレンド
4. モード別統計（テーブル形式）
5. トレーニング履歴（最新10件）

#### 詳細分析ページ (premium-analysis.html)
**目的**: 深い洞察・弱点発見・科学的分析

**表示内容**:
- 音程別精度分析
- エラーパターン分析
- 練習プラン提案
- 成長記録詳細

---

## 🎨 グラフ設計の重要な決定

### グレード推移グラフ（トレーニング記録用）

**仕様**:
```javascript
{
    type: 'line',                      // 折れ線グラフ
    yAxis: ['S', 'A', 'B', 'C', 'D', 'E'],  // グレードのみ
    xAxis: [1, 2, 3, ...],             // レッスン番号（通し）
    dataPoints: 20,                    // 最新20件固定
    height: '200px',                   // コンパクト
    modeFilter: true,                  // モード選択可能
    interaction: false,                // ツールチップなし
}
```

**補足テキスト**:
- A以上獲得率（直近10回）
- 改善傾向（上昇/横ばい/下降）

**理由**:
- グレード = 分かりやすい、モチベーション維持
- 誤差（¢） = 詳細分析ページで表示
- レッスン単位 = データポイント削減、iPhoneでも見やすい

---

## 🏆 評価分布コンポーネント統一設計

### DistributionChartコンポーネント

**ファイル**: `/js/components/DistributionChart.js`

**主要メソッド**:
1. `calculateDistribution(sessionData)` - 評価分布計算
2. `calculateTrend(allSessions, period)` - 改善トレンド計算
3. `render(options)` - HTML生成とアニメーション
4. `animateBars(container)` - プログレスバーアニメーション

**使用箇所**:
- セッション評価ページ（1セッション、トレンドなし）
- 総合評価ページ（全セッション、トレンドなし）
- トレーニング記録ページ（全セッション、トレンドあり）

**アニメーション**:
```css
.distribution-bar {
    transition: width 0.8s ease-out;
}
```

### 改善トレンド仕様

**計算ロジック**:
```javascript
{
    excellentRate: 82,              // 直近期間のExcellent率
    excellentChange: +7,            // 全期間平均との差分
    practiceCount: 2,               // 直近期間のPractice数
    practiceChange: -3,             // 全期間平均との差分
    trend: 'improving',             // improving/stable/declining
    periodLabel: '過去1週間'        // 表示用ラベル
}
```

**表示例**:
```
📈 直近の成長（過去1週間 vs 全期間平均）
・Excellent率: 82% (全期間比 +7% ↑) 改善中！
・Practice減少: 2音 (3音減少) 苦手な音が減少
```

---

## 📊 トレーニング統計セクション

### 追加データ項目

```javascript
{
    // 継続状況
    streakDays: 12,                    // 連続記録日数
    startDate: '2025-10-15',           // トレーニング開始日
    totalDays: 45,                     // 開始からの総日数
    trainingDays: 28,                  // 実際にトレーニングした日数
    
    // 総計
    totalLessons: 52,                  // 総レッスン数
    totalSessions: 416,                // 総セッション数
    totalTime: '12h30m',               // 総トレーニング時間
    overallAvgError: 45.2              // 全体平均誤差
}
```

### レイアウト

**2段構成**:
1. 連続記録バッジ（左）+ トレーニング期間（右）
2. 4つの総計値を横並び

---

## 🎯 モード別統計テーブル設計

### テーブル構造

```html
<table class="mode-stats-table">
    <thead>
        <tr>
            <th>モード</th>
            <th>レッスン</th>
            <th>平均誤差</th>
            <th>最高グレード</th>
        </tr>
    </thead>
    <tbody>
        <!-- JavaScriptで動的生成 -->
    </tbody>
</table>
```

### グレードアイコン

```javascript
gradeIcons: {
    'S': '🏆',
    'A': '🥇',
    'B': '🥈',
    'C': '🥉',
    'D': '🎯',
    'E': '📝'
}
```

### モード表示

現在10種類（上行・下行それぞれ）:
- ランダム基音（上行/下行）
- 連続チャレンジ（上行/下行）
- 12音階（ランダム・上行/下行）
- 12音階（上昇・上行/下行）
- 12音階（下降・上行/下行）

---

## 📱 トレーニング履歴のモバイル対応

### デスクトップ版
```html
<div class="lesson-card">
    <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
            <i data-lucide="music"></i>
            <div>
                <div>ランダム基音（上行）</div>
                <div>11/14 15:30 · 8セッション</div>
            </div>
        </div>
        <div class="flex items-center gap-4">
            <div>🏆 A</div>
            <div>±42.3¢</div>
            <button>詳細 ></button>
        </div>
    </div>
</div>
```

### モバイル版
```html
<div class="lesson-card-mobile">
    <div class="flex items-center gap-3 mb-2">
        <i data-lucide="music"></i>
        <div>
            <div>ランダム基音（上行）</div>
            <div>11/14 15:30</div>
        </div>
    </div>
    <div class="flex items-center justify-between">
        <div>🏆 A</div>
        <div>±42.3¢</div>
        <button>詳細 ></button>
    </div>
</div>
```

### レスポンシブ対応
```css
@media (min-width: 768px) {
    .lesson-card { /* 横並び */ }
}
@media (max-width: 767px) {
    .lesson-card-mobile { /* 縦積み */ }
}
```

---

## 🔗 詳細分析ページへの誘導

### 配置場所
評価分布セクションの直下

### ボタンデザイン
```html
<a href="#premium-analysis" class="btn btn-secondary" 
   onclick="window.NavigationManager.navigate('premium-analysis')">
    <i data-lucide="bar-chart-2"></i>
    <span>もっと詳しく分析する</span>
    <i data-lucide="chevron-right"></i>
</a>
```

---

## 📋 実装タスク一覧

### Phase 1: 基盤整備（1.5-2h）
- DistributionChartコンポーネント実装
- コンポーネントエクスポート
- CSSアニメーション追加

### Phase 2: 統計セクション拡充（2h）
- 統計データ計算関数追加
- HTML構造更新
- 表示ロジック実装

### Phase 3: グレード推移グラフ（3h）
- レッスン単位のグレード集約
- Chart.jsグラフ実装
- モード選択ボタン実装
- 補足テキスト計算

### Phase 4: 評価分布統合（30min）
- DistributionChart統合
- DistributionChart呼び出し

### Phase 5: モード別統計テーブル化（1h）
- テーブルHTML構造作成
- テーブルCSS追加
- テーブル生成ロジック

### Phase 6: 履歴モバイル対応（45min）
- レスポンシブCSS追加
- 詳細ボタン追加

### Phase 7: 既存ページ移行（40min）
- セッション評価ページ移行
- 総合評価ページ移行

**総所要時間**: 約9-10時間

---

## 🎯 重要な設計判断

### 1. グラフはグレード中心
**理由**: 
- モチベーション維持が目的
- 誤差（¢）は詳細分析ページで
- シンプルで一目で分かる

### 2. 評価分布に改善トレンド追加
**理由**:
- 成長の実感が得られる
- 先週比で改善が分かる
- ポジティブフィードバック

### 3. 評価分布コンポーネント統一
**理由**:
- 3箇所で同じ表示を使用
- アニメーション統一
- 保守性向上

### 4. モード別統計はテーブル形式
**理由**:
- 10種類のモードをコンパクトに表示
- カード形式では縦に長すぎる
- 比較しやすい

### 5. レッスン単位でグラフ集約
**理由**:
- データポイント削減（50セッション → 6-7レッスン）
- iPhoneでの視認性向上
- 成長トレンドが明確

---

## 📁 関連ファイル

### 新規作成
- `/js/components/DistributionChart.js`

### 主要修正対象
- `/pages/records.html`
- `/pages/js/records-controller.js`
- `/styles/base.css`

### 移行対象
- `/pages/js/result-session-controller.js`
- `/pages/js/results-overview-controller.js`

---

## 🔄 変更履歴
- 2025-11-15: 初版作成
