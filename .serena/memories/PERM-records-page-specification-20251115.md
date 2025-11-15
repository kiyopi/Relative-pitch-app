# トレーニング記録ページ 正式仕様書

## 📋 ドキュメント情報
- **作成日**: 2025-11-15
- **バージョン**: 1.0.0
- **ステータス**: 最終確定版
- **対象ファイル**: `/pages/records.html`, `/pages/js/records-controller.js`
- **関連ブランチ**: feature/modular-spa-architecture

---

## 🎯 1. ページ概要

### 1.1 目的
トレーニング記録ページは、ユーザーの**継続的なモチベーション維持**と**全体的な進捗把握**を目的とした、シンプルで直感的なダッシュボードページである。

### 1.2 ターゲットユーザー
- 定期的にトレーニングを実施しているユーザー
- 自分の成長を確認したいユーザー
- 継続記録を維持したいユーザー

### 1.3 提供価値
- ✅ **一目で分かる成長**: 視覚的なフィードバックで成長を実感
- ✅ **シンプルで直感的**: 複雑な分析は不要、見やすさ重視
- ✅ **ポジティブフィードバック**: 改善トレンドや連続記録でモチベーション向上
- ✅ **高速表示**: データ量が多くても快適に閲覧可能

### 1.4 詳細分析ページとの差別化

| 項目 | トレーニング記録ページ | 詳細分析ページ |
|------|---------------------|---------------|
| 目的 | モチベーション維持 | 深い洞察・弱点発見 |
| 情報量 | シンプル・要約 | 詳細・科学的 |
| グラフ | 評価分布のみ | 複数のグラフ・分析 |
| 表示速度 | 高速 | やや重い |
| ターゲット | 全ユーザー | 上級ユーザー |

---

## 📊 2. 機能要件

### 2.1 セクション構成（確定版）

```
1. トレーニング統計
2. 評価分布
3. モード別統計
4. トレーニング履歴
```

---

### 2.2 セクション1: トレーニング統計

#### 2.2.1 目的
全体的なトレーニング活動の概要を一目で把握できるようにする。

#### 2.2.2 表示項目

**上段（2列レイアウト）:**
- **左側**: 連続記録バッジ
  - 連続記録日数（`streakDays`）
  - 表示形式: 「X日間連続記録達成！」
  - アイコン: 🔥 (flame)
  - 強調表示: 大きなフォント、目立つ色

- **右側**: トレーニング期間情報
  - 開始日（`startDate`）
  - 経過日数（`totalDays`）
  - トレーニング実施日数（`trainingDays`）
  - 表示形式: 「MM/DD開始（X日経過）」「X日間トレーニング」

**下段（4つの数値カード）:**
1. 総レッスン数（`totalLessons`）
2. 総セッション数（`totalSessions`）
3. 総トレーニング時間（`totalTime`）
4. 全体平均誤差（`overallAvgError`）

#### 2.2.3 データ仕様

```javascript
{
    // 継続状況
    streakDays: Number,           // 連続記録日数（今日から遡って何日連続か）
    startDate: String,            // 'YYYY-MM-DD' 最初のセッション日時
    totalDays: Number,            // 開始日から今日まで何日経過したか
    trainingDays: Number,         // 実際にトレーニングした日数（ユニーク日数）
    
    // 総計
    totalLessons: Number,         // 総レッスン数（lessonIdのユニーク数）
    totalSessions: Number,        // 総セッション数（全セッションカウント）
    totalTime: String,            // 'XXhYYm' 形式（endTime - startTimeの累積）
    overallAvgError: Number       // 全音の平均誤差（絶対値、小数点1桁）
}
```

#### 2.2.4 計算ロジック

```javascript
// 連続記録日数
function calculateStreak(sessions) {
    const dates = sessions.map(s => new Date(s.startTime).toDateString());
    const uniqueDates = [...new Set(dates)].sort((a, b) => new Date(b) - new Date(a));
    
    let streak = 0;
    for (let i = 0; i < uniqueDates.length; i++) {
        const checkDate = new Date();
        checkDate.setDate(checkDate.getDate() - i);
        if (uniqueDates.includes(checkDate.toDateString())) {
            streak++;
        } else {
            break;
        }
    }
    return streak;
}

// 総トレーニング時間
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

// トレーニング日数
function calculateTrainingDays(sessions) {
    const dates = sessions.map(s => new Date(s.startTime).toDateString());
    return new Set(dates).size;
}

// 全体平均誤差
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

### 2.3 セクション2: 評価分布

#### 2.3.1 目的
全セッションの各音の精度評価を視覚的に表示し、改善トレンドでモチベーションを向上させる。

#### 2.3.2 表示項目
- 評価分布プログレスバー（Excellent/Good/Pass/Practice）
- 各評価の割合（%）と件数
- 改善トレンド（過去1週間 vs 全体平均）
- ヘルプボタン（精度ランク説明）

#### 2.3.3 コンポーネント仕様
- **使用コンポーネント**: DistributionChart
- **ファイル**: `/js/components/DistributionChart.js`
- **メソッド**: `DistributionChart.render()`

#### 2.3.4 呼び出しパラメータ

```javascript
window.DistributionChart.render({
    containerId: 'distribution-chart',
    sessionData: sessions,      // 全セッションデータ
    showTrend: true,            // 改善トレンド表示
    trendPeriod: 'week',        // 過去1週間
    animate: true,              // アニメーション有効
    showDescription: true,      // 説明文表示
    showHelpButton: true        // ヘルプボタン＋ポップオーバー
});
```

#### 2.3.5 優先度が高い理由
- **視覚的インパクト**: プログレスバーのアニメーションで成長を実感
- **モチベーション向上**: 改善トレンドでポジティブフィードバック
- **直感的理解**: 数値テーブルより先に視覚的な分布を確認

---

### 2.4 セクション3: モード別統計

#### 2.4.1 目的
10種類のトレーニングモードごとの統計をコンパクトに一覧表示する。

#### 2.4.2 表示項目
- モード名（日本語、音階方向・基音進行方向含む）
- レッスン数
- 平均誤差（±XX¢）
- 最高グレード（S/A/B/C/D/E）

#### 2.4.3 10種類のモード
1. ランダム基音（上行）
2. ランダム基音（下行）
3. 連続チャレンジ（上行）
4. 連続チャレンジ（下行）
5. 12音階（ランダム・上行）
6. 12音階（ランダム・下行）
7. 12音階（上昇・上行）
8. 12音階（上昇・下行）
9. 12音階（下降・上行）
10. 12音階（下降・下行）

#### 2.4.4 レイアウト方式

**デスクトップ（768px以上）: テーブル形式**
- 理由: 10種類を縦に並べても見やすい
- 利点: 比較しやすい、コンパクト

**モバイル（767px以下）: カード形式**
- 理由: テーブルは小画面で見づらい
- 利点: タップしやすい、情報が整理される

#### 2.4.5 データ計算

```javascript
// モード+方向別にグループ化
const key = `${mode}_${chromaticDirection}_${scaleDirection}`;

// 平均誤差
const avgAccuracy = avgErrors.reduce((a, b) => a + b, 0) / avgErrors.length;

// 最高グレード
const gradeOrder = ['S', 'A', 'B', 'C', 'D', 'E'];
const bestGrade = grades.reduce((best, grade) => {
    const currentIdx = gradeOrder.indexOf(grade);
    const bestIdx = gradeOrder.indexOf(best);
    return (currentIdx !== -1 && currentIdx < bestIdx) ? grade : best;
}, '-');
```

---

### 2.5 セクション4: トレーニング履歴

#### 2.5.1 目的
最近のトレーニング活動を確認し、詳細な総合評価ページへの導線を提供する。

#### 2.5.2 表示項目
- 最新10件のレッスンカード
- 各カード: モード名、日時、セッション数、グレード、平均誤差
- 全件数表示（「X件」）
- クリックで総合評価ページへ遷移

#### 2.5.3 レスポンシブレイアウト

**デスクトップ: 1行レイアウト**
```
🎵 モード名（方向）  │  日時 · セッション数  │  🏆 グレード  ±誤差  >
```

**モバイル: 縦配置レイアウト（最適化）**
```
🎵 モード名
   （方向）

日時
セッション数

🏆 グレード  ±誤差  >
```

**モバイル最適化の理由**:
- 1行レイアウトはiPhoneで情報が詰まりすぎる
- タップ領域が小さくユーザビリティが低い
- 縦配置で情報整理、タップ領域拡大

#### 2.5.4 将来の拡張（保留）
- 月別表示
- セレクター選択で簡易総合評価表示
- 専用の履歴閲覧ページ分離の可能性

**保留理由**:
- 詳細分析ページでの履歴表示方法が未確定
- 詳細分析ページ実装時に最適なUI/UXを決定

---

## 🎨 3. 設計思想

### 3.1 ページ設計の核心コンセプト

#### 3.1.1 モチベーション維持優先
- **分析より感情**: 詳細な分析は詳細分析ページで、ここでは成長実感を優先
- **ポジティブフィードバック**: 連続記録、改善トレンドなど前向きな情報を強調
- **シンプル**: 複雑なグラフや分析は排除、一目で理解できる

#### 3.1.2 モバイルファースト設計
- **スマホで見やすい**: セクション順序、レイアウトはモバイル優先
- **タップしやすい**: 十分なタップ領域、余白の確保
- **縦スクロール**: 横スクロールや複雑な操作は避ける

#### 3.1.3 視覚優先の情報設計
- **数値より視覚**: 評価分布はプログレスバー、統計は数値カード
- **色とアイコン**: Lucideアイコンと色で情報を直感的に理解
- **アニメーション**: 適度なアニメーションで視覚的魅力向上

### 3.2 セクション順序の根拠

```
1. トレーニング統計    ← 全体像を把握
2. 評価分布            ← 視覚的に成長を実感（優先度UP）
3. モード別統計        ← 詳細な数値を確認
4. トレーニング履歴    ← 最近の活動を確認
```

**評価分布 > モード別統計の順序**:
- 評価分布は視覚的（プログレスバー）でインパクトがある
- モード別統計はテーブル形式で数値中心、詳細情報
- ユーザーはまず視覚的な成長実感 → 詳細な統計の流れが自然

### 3.3 削除した機能とその理由

#### グレード推移グラフ（Chart.js）を削除
- **理由**: 詳細分析ページで実装予定
- **根拠**: トレーニング記録ページはシンプルさ重視、複雑なグラフは不要
- **代替**: 評価分布の改善トレンドで成長を可視化

---

## 💻 4. 技術仕様

### 4.1 依存関係

#### コンポーネント依存
```javascript
// 必須コンポーネント
- window.DistributionChart      // 評価分布表示
- window.EvaluationCalculator   // 動的グレード計算
- window.LoadingComponent        // ローディング管理
- window.DataManager             // セッションデータ取得
- window.NavigationManager       // ページ遷移
- window.initializeLucideIcons   // アイコン初期化
```

#### 外部ライブラリ
```html
<!-- Lucideアイコン -->
<script src="https://unpkg.com/lucide@0.263.0/dist/umd/lucide.js"></script>

<!-- Chart.js（削除済み） -->
<!-- グレード推移グラフを削除したため不要 -->
```

### 4.2 パフォーマンス要件

#### データ量
- **想定最大**: 1000件のセッション
- **表示件数**: 履歴は最新10件のみ
- **計算量**: O(n)のシンプルな集計のみ

#### 表示速度
- **目標**: 500セッションで200ms以内
- **実測**: 50セッションで2ms（体感的に即座）

#### 最適化手法
```javascript
// 段階的レンダリング
async function displaySections() {
    await displayStatistics();     // 統計表示
    await displayDistribution();   // 評価分布表示
    await displayModeStats();      // モード別統計表示
    await displayHistory();        // 履歴表示（非同期で段階的）
}

// LoadingComponent活用
LoadingComponent.toggle('stats', false);      // 各セクション完了時にローディング解除
LoadingComponent.toggle('distribution', false);
```

### 4.3 エラーハンドリング

#### データなし状態
```javascript
if (!sessions || sessions.length === 0) {
    hideAllLoading();
    showNoDataMessage();
    return;
}
```

#### 計算エラー
```javascript
try {
    const evaluation = window.EvaluationCalculator.calculateDynamicGrade(lesson.sessions);
} catch (error) {
    console.warn('[Records] 評価計算エラー:', error, lesson);
    // フォールバック処理
}
```

### 4.4 ローディング管理

各セクションに専用のローディング表示:
- `stats-loading` / `stats-content`
- `distribution-loading` / `distribution-content`
- `chart-loading` / `chart-content`（削除済み）
- `sessions-loading` / `sessions-content`

---

## 🎨 5. UI/UX仕様

### 5.1 レスポンシブブレイクポイント

```css
/* モバイル */
@media (max-width: 767px) {
  .mode-stats-table { display: none; }
  .mode-stats-mobile { display: flex; }
  .lesson-card-desktop { display: none; }
  .lesson-card-mobile { display: block; }
}

/* デスクトップ */
@media (min-width: 768px) {
  .mode-stats-table { display: table; }
  .mode-stats-mobile { display: none; }
  .lesson-card-desktop { display: block; }
  .lesson-card-mobile { display: none; }
}
```

### 5.2 アニメーション仕様

#### 評価分布プログレスバー
```css
.distribution-bar {
    transition: width 0.8s ease-out;
}
```

#### ローディングアニメーション
```html
<i data-lucide="loader-2" class="animate-spin"></i>
```

### 5.3 カラーパレット

#### グレード色
```css
.grade-S { color: var(--text-yellow-300); }  /* 金色 */
.grade-A { color: var(--text-green-300); }   /* 緑色 */
.grade-B { color: var(--text-blue-300); }    /* 青色 */
.grade-C { color: var(--text-orange-300); }  /* オレンジ */
.grade-D { color: var(--text-red-300); }     /* 赤色 */
.grade-E { color: var(--text-gray-300); }    /* グレー */
```

#### アイコン色
```css
.text-orange-300  /* 🔥 連続記録 */
.text-purple-300  /* 🎯 評価分布 */
.text-blue-300    /* 🔲 モード別統計 */
.text-blue-300    /* 📅 トレーニング履歴 */
```

---

## 🔗 6. 他ページとの関係

### 6.1 総合評価ページへの遷移

```javascript
// 履歴カードクリック時
function viewLessonDetail(lesson) {
    sessionStorage.clear();  // 古いデータをクリア
    
    window.NavigationManager.navigate('results-overview', {
        mode: lesson.mode,
        scaleDirection: lesson.scaleDirection,
        lessonId: lesson.lessonId,
        fromRecords: 'true'   // トレーニング記録から遷移フラグ
    });
}
```

### 6.2 詳細分析ページとの違い

| 機能 | トレーニング記録 | 詳細分析 |
|------|----------------|---------|
| グラフ | 評価分布のみ | 複数グラフ |
| 統計 | 基本統計のみ | 詳細分析 |
| 履歴 | 最新10件 | 全件・月別表示 |
| 音程分析 | なし | あり |
| 弱点分析 | なし | あり |
| 練習プラン提案 | なし | あり |

### 6.3 将来の統合計画

詳細分析ページ実装時に検討する項目:
- 履歴閲覧機能の分離
- セレクター選択での簡易評価表示
- グラフ表示の詳細分析ページへの統合

---

## 📋 7. 実装チェックリスト

### Phase 1: トレーニング統計の充実
- [ ] 総トレーニング時間計算関数 (`calculateTotalTime`)
- [ ] トレーニング日数計算関数 (`calculateTrainingDays`)
- [ ] 全体平均誤差計算関数 (`calculateOverallAvgError`)
- [ ] 開始日・経過日数計算
- [ ] 4つの数値カードHTML生成
- [ ] 2段レイアウト実装

### Phase 2: 評価分布セクション追加
- [ ] records.htmlに評価分布セクション追加
- [ ] `displayEvaluationDistribution()` 関数実装
- [ ] LoadingComponent統合
- [ ] ヘルプボタン統合
- [ ] セクション順序調整（モード別統計より前）

### Phase 3: モード別統計テーブル化
- [ ] `.mode-stats-table` CSS作成
- [ ] モバイル用 `.mode-stats-mobile` CSS作成
- [ ] `displayStatistics()` テーブル生成に変更
- [ ] レスポンシブ切り替え実装

### Phase 4: 履歴モバイル最適化
- [ ] `.lesson-card-mobile` CSS作成
- [ ] 縦配置レイアウトHTML実装
- [ ] レスポンシブ切り替えCSS追加
- [ ] タップ領域拡大確認

### Phase 5: 動作確認
- [ ] 全セクション表示確認
- [ ] アニメーション動作確認
- [ ] Lucideアイコン初期化確認
- [ ] デスクトップ表示確認
- [ ] モバイル表示確認（iPhone実機）
- [ ] ページ遷移確認

---

## 📁 8. 関連ファイル

### 新規作成
- `/js/components/DistributionChart.js` ✅

### 主要修正対象
- `/pages/records.html` - HTML構造
- `/pages/js/records-controller.js` - コントローラーロジック
- `/styles/base.css` - 共通スタイル（テーブル、カード）

### 参照ドキュメント
- `PERM-records-page-final-layout-20251115` - レイアウト図
- `PERM-distribution-chart-component-spec-20251115` - DistributionChart仕様
- `APP_SPECIFICATION.md` - アプリケーション全体仕様

---

## 🔄 9. 変更履歴

### v1.0.0 (2025-11-15)
- 正式仕様書初版作成
- 設計思想・データ仕様・技術仕様を完全定義
- 他ページとの関係性明確化

---

## 📝 10. 備考

### 設計判断の記録
このページの設計では、「モチベーション維持」を最優先とし、複雑な分析機能は詳細分析ページに委譲する方針を採用した。これにより、ユーザーは気軽に進捗を確認でき、継続的なトレーニングへのモチベーションを維持できる。

### 実装時の注意事項
- グレード推移グラフは実装しない（詳細分析ページで実装予定）
- 履歴拡張機能は保留（詳細分析ページ設計時に判断）
- すべての統計計算はO(n)のシンプルなロジックで実装
- モバイルレイアウトは実機テスト必須
