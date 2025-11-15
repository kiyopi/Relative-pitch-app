# トレーニング記録ページ 改訂版設計書

## 📋 作成日時
- 作成日: 2025-11-15
- バージョン: 3.0.0（最終確定版）
- 前版からの変更: セクション順序変更（評価分布↔モード別統計）、履歴モバイル最適化、トレーニング統計充実

## 🎯 最終決定事項

### セクション順序（確定）
```
1. トレーニング統計（充実版：4つの数値カード）
2. 評価分布（優先度UP：視覚的でモチベーション向上）
3. モード別統計（テーブル化：10種類をコンパクト表示）
4. トレーニング履歴（モバイル最適化：縦配置）
```

### 削除項目
- ❌ **グレード推移グラフ（Chart.js）**: 詳細分析ページで実装
- 理由: トレーニング記録ページはモチベーション維持が目的、詳細な分析は専用ページで

### 保留項目
- ⏸️ **履歴セクション拡張**: 詳細分析ページ設計時に判断
- 理由: 詳細分析ページでの履歴表示方法が未確定、将来的に専用の履歴閲覧ページを分離する可能性

---

## 📱 最終レイアウト構成

### セクション順序（モバイルファースト）

```
1. トレーニング統計
   - 連続記録バッジ（左）+ 開始日・経過日数・トレーニング日数（右）
   - 4つの数値カード（レッスン・セッション・時間・平均誤差）

2. 評価分布（新規追加・優先度UP）
   - DistributionChart
   - 改善トレンド表示（過去1週間 vs 全体平均）
   - ヘルプボタン

3. モード別統計（テーブル化）
   - 10種類のモードをコンパクト表示
   - レッスン数・平均誤差・最高グレード

4. トレーニング履歴（モバイル最適化）
   - 最新10件（現状維持）
   - レッスンカードクリックで総合評価ページへ遷移
   - モバイル版は縦配置で見やすく

[新しいトレーニング開始ボタン]
```

---

## 📊 トレーニング統計セクション（充実版）

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

### レイアウト（2段構成）

**上段（左右2列）:**
```
🔥 12日間連続記録達成！  │  📅 10/15開始（45日経過）
                         │  📖 28日間トレーニング
```

**下段（4つの数値カード）:**
```
┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐
│  52  │ │ 416  │ │12h30m│ │±45¢ │
│レッスン│ │セッション│ │総時間│ │平均誤差│
└──────┘ └──────┘ └──────┘ └──────┘
```

### 実装

```javascript
// 総トレーニング時間の計算
function calculateTotalTime(sessions) {
    let totalMs = 0;
    sessions.forEach(session => {
        if (session.endTime && session.startTime) {
            totalMs += (session.endTime - session.startTime);
        }
    });
    const hours = Math.floor(totalMs / (1000 * 60 * 60));
    const minutes = Math.floor((totalMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h${minutes}m`;
}

// トレーニング日数の計算
function calculateTrainingDays(sessions) {
    const dates = sessions.map(s => {
        const date = new Date(s.startTime);
        return date.toDateString();
    });
    return new Set(dates).size;
}

// 全体平均誤差の計算
function calculateOverallAvgError(sessions) {
    let totalError = 0;
    let count = 0;
    sessions.forEach(session => {
        if (session.pitchErrors) {
            session.pitchErrors.forEach(error => {
                totalError += Math.abs(error.errorInCents);
                count++;
            });
        }
    });
    return count > 0 ? (totalError / count).toFixed(1) : 0;
}
```

---

## 🎯 評価分布セクション（新規追加・優先度UP）

### 配置変更の理由
- **視覚的インパクト**: プログレスバーのアニメーションでモチベーション向上
- **改善実感**: 過去1週間のトレンド表示で成長を体感
- **モード別統計との差別化**: テーブル（数値中心）より先に視覚的な分布を表示

### HTML構造

```html
<section class="glass-card">
  <!-- ローディング -->
  <div id="distribution-loading" class="flex flex-col items-center gap-3 py-8" style="display: flex;">
    <i data-lucide="loader-2" class="text-purple-300 animate-spin" style="width: 48px; height: 48px;"></i>
    <p class="text-white-60">評価分布を読み込み中...</p>
  </div>
  
  <!-- コンテンツ -->
  <div id="distribution-content" style="display: none;">
    <div class="section-header-row">
      <h4 class="heading-md">
        <i data-lucide="bar-chart-3" class="text-purple-300"></i>
        <span>評価分布</span>
      </h4>
      <div id="distribution-help-button" class="section-header-help"></div>
    </div>
    <div id="distribution-chart"></div>
  </div>
</section>
```

### JavaScript実装（records-controller.js）

```javascript
async function displayEvaluationDistribution(sessions) {
    // ヘルプボタン挿入
    const helpButtonContainer = document.getElementById('distribution-help-button');
    helpButtonContainer.innerHTML = window.DistributionChart.getHelpButton('distribution-chart');
    
    // DistributionChart描画
    window.DistributionChart.render({
        containerId: 'distribution-chart',
        sessionData: sessions,
        showTrend: true,           // 改善トレンド表示
        trendPeriod: 'week',       // 過去1週間
        animate: true,
        showDescription: true,
        showHelpButton: true       // ポップオーバー生成
    });
    
    // ローディング非表示
    LoadingComponent.toggle('distribution', false);
}
```

---

## 🔲 モード別統計テーブル設計

### デスクトップ版（テーブル）

```html
<table class="mode-stats-table">
    <thead>
        <tr>
            <th>モード</th>
            <th>レッスン数</th>
            <th>平均誤差</th>
            <th>最高</th>
        </tr>
    </thead>
    <tbody>
        <!-- JavaScriptで動的生成 -->
    </tbody>
</table>
```

### モバイル版（カード）

```html
<div class="mode-stats-mobile">
  <div class="mode-stat-card">
    <div class="mode-name">ランダム基音（上行）</div>
    <div class="mode-stats-row">
      <span>12回</span>
      <span>±42¢</span>
      <span class="text-green-300">A</span>
    </div>
  </div>
</div>
```

### CSS設計

```css
/* デスクトップ: テーブル表示 */
.mode-stats-table {
  width: 100%;
  border-collapse: collapse;
}

.mode-stats-table th {
  text-align: left;
  padding: 0.75rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  color: var(--text-white-60);
  font-size: 0.875rem;
}

.mode-stats-table td {
  padding: 0.75rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  color: var(--text-white);
}

/* モバイル: カード表示 */
@media (max-width: 767px) {
  .mode-stats-table {
    display: none;
  }
  
  .mode-stats-mobile {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }
  
  .mode-stat-card {
    padding: 0.75rem;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 8px;
  }
  
  .mode-name {
    font-weight: 500;
    margin-bottom: 0.5rem;
  }
  
  .mode-stats-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
}

@media (min-width: 768px) {
  .mode-stats-mobile {
    display: none;
  }
}
```

---

## 📅 トレーニング履歴のモバイル最適化

### デスクトップ版（1行レイアウト）
```html
<div class="glass-card lesson-card-desktop">
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
      <i data-lucide="chevron-right"></i>
    </div>
  </div>
</div>
```

### モバイル版（縦配置レイアウト）- 最適化

```html
<div class="glass-card lesson-card-mobile">
  <!-- モード名 -->
  <div class="flex items-center gap-3 mb-2">
    <i data-lucide="music"></i>
    <div>
      <div class="font-medium">ランダム基音</div>
      <div class="text-sm">（上行）</div>
    </div>
  </div>
  
  <!-- 日時・セッション数 -->
  <div class="text-sm text-white-70 mb-2">
    <div>11/14 15:30</div>
    <div>8セッション</div>
  </div>
  
  <!-- グレード・誤差・矢印 -->
  <div class="flex items-center justify-between">
    <div class="flex items-center gap-3">
      <div class="text-green-300 text-xl">🏆 A</div>
      <div class="text-white">±42.3¢</div>
    </div>
    <i data-lucide="chevron-right"></i>
  </div>
</div>
```

### レスポンシブ対応

```css
/* デスクトップ */
@media (min-width: 768px) {
  .lesson-card-desktop { display: block; }
  .lesson-card-mobile { display: none; }
}

/* モバイル */
@media (max-width: 767px) {
  .lesson-card-desktop { display: none; }
  .lesson-card-mobile { display: block; }
}
```

**改善ポイント**:
- ✅ 縦に配置して情報を整理
- ✅ タップ領域拡大（カード全体がタップ可能）
- ✅ 余白を持たせて見やすく
- ✅ グレード・誤差を強調表示
- ✅ iPhoneでのレイアウト崩れを解消

---

## 📋 実装タスク

### Phase 1: トレーニング統計の充実（1時間）
- [ ] 総トレーニング時間計算関数
- [ ] トレーニング日数計算関数
- [ ] 全体平均誤差計算関数
- [ ] 4つの数値カードHTML生成
- [ ] レイアウト調整（2段構成）

### Phase 2: 評価分布セクション追加（30分）
- [ ] records.htmlに評価分布セクション追加
- [ ] records-controllerでdisplayEvaluationDistribution()実装
- [ ] LoadingComponent統合
- [ ] ヘルプボタン統合
- [ ] セクション順序調整（モード別統計より前に配置）

### Phase 3: モード別統計テーブル化（1時間）
- [ ] mode-stats-table CSS作成
- [ ] レスポンシブ対応CSS追加
- [ ] displayStatistics()をテーブル生成に変更
- [ ] モバイル版カード表示実装

### Phase 4: 履歴モバイル最適化（30分）
- [ ] lesson-card-mobile CSS作成
- [ ] 縦配置レイアウトHTML実装
- [ ] レスポンシブ切り替えCSS追加
- [ ] タップ領域拡大

### Phase 5: 動作確認（15分）
- [ ] 全セクション表示確認
- [ ] アニメーション動作確認
- [ ] Lucideアイコン初期化確認
- [ ] モバイル表示確認
- [ ] iPhoneレイアウト確認

**総所要時間**: 約3時間

---

## 🎯 重要な設計判断の記録

### 1. セクション順序の決定理由

**評価分布 → モード別統計の順序**:
- 評価分布は視覚的（プログレスバー）でモチベーション向上効果が高い
- モード別統計はテーブル形式で数値中心、詳細情報
- ユーザーはまず視覚的な成長実感を得てから、詳細な統計を確認する流れが自然

### 2. トレーニング統計を充実させた理由

**4つの数値カード追加**:
- レッスン数・セッション数だけでは情報が不足
- 総時間・平均誤差があることで全体像を把握できる
- モチベーション維持には具体的な数値が重要

### 3. 履歴のモバイル最適化理由

**縦配置レイアウト採用**:
- iPhoneでの1行レイアウトは情報が詰まりすぎて見づらい
- タップ領域が小さくユーザビリティが低い
- 縦配置で情報を整理し、タップ領域を拡大

### 4. グラフを削除した理由
- トレーニング記録ページ = モチベーション維持・シンプル
- 詳細分析ページ = 深い洞察・科学的分析
- 役割分担を明確化

### 5. モード別統計をテーブル化した理由
- 10種類のモードをカード表示すると縦に長すぎる
- テーブルならコンパクトに一覧表示可能
- モバイルではカード形式に戻してレスポンシブ対応

### 6. 履歴拡張を保留した理由
- 詳細分析ページでの履歴表示方法が未確定
- 専用の履歴閲覧ページを分離する可能性
- 早期の複雑化を避ける

---

## 📁 関連ファイル

### 新規作成
- `/js/components/DistributionChart.js` ✅

### 主要修正対象
- `/pages/records.html`
- `/pages/js/records-controller.js`
- `/styles/base.css` (mode-stats-table, stat-card, lesson-card-mobile追加)

---

## 🔄 変更履歴
- 2025-11-15 v3.0.0: 最終確定版（セクション順序変更、履歴モバイル最適化、統計充実）
- 2025-11-15 v2.0.0: グラフ削除、テーブル化、履歴保留
- 2025-11-15 v1.0.0: 初版作成
