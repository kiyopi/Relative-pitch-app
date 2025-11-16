# AdvisoryMessageController 仕様書

**バージョン**: 1.0.0
**作成日**: 2025-11-16
**最終更新日**: 2025-11-16
**ステータス**: 設計完了・実装待機

---

## 📋 目次

1. [概要](#概要)
2. [設計思想](#設計思想)
3. [責任範囲](#責任範囲)
4. [クラス設計](#クラス設計)
5. [メソッド仕様](#メソッド仕様)
6. [データ構造](#データ構造)
7. [使用例](#使用例)
8. [将来の拡張計画](#将来の拡張計画)
9. [依存関係](#依存関係)
10. [実装優先順位](#実装優先順位)

---

## 概要

**AdvisoryMessageController** は、ユーザーへのアドバイス・ガイダンスメッセージを統一管理するコントローラーです。次のステップ提案、セッション分析アドバイス、トレーニング中のヒントなど、アプリケーション全体でユーザーに提示するメッセージを一元的に生成します。

### 解決する課題

**現状の問題**:
- 各ページ・機能でアドバイスメッセージがハードコードされている
- 文字列置換による不安定なメッセージ生成（正規表現の脆弱性）
- モード追加・変更時に複数箇所の修正が必要
- ModeController と重複するロジックが存在
- メッセージの一貫性が保証されていない

**解決策**:
- アドバイスメッセージ生成を一元化
- ModeController と連携した動的メッセージ生成
- モード進行ロジックの明確な定義
- 拡張可能な設計（AI生成メッセージへの対応も視野）

---

## 設計思想

### 1. 単一責任の原則

AdvisoryMessageController は「アドバイスメッセージの生成」のみに責任を持ち、以下は行わない：
- モード情報の管理（ModeController の責任）
- セッションデータの保存（DataManager の責任）
- UI のレンダリング（各 Controller の責任）

### 2. 設定とロジックの分離

```
設定層（静的）: アイコン、色、ボタンテキスト
ロジック層（動的）: タイトル・説明文の生成、モード進行
```

### 3. 拡張性の確保

- 新しいアドバイスタイプの追加が容易
- 将来の AI メッセージ生成への移行が可能
- A/B テストによるメッセージ最適化に対応

### 4. 一貫性の保証

- すべてのモード名は ModeController.generatePageTitle() 経由で生成
- メッセージテンプレートの統一的な管理
- モード進行パスの明確な定義

---

## 責任範囲

### ✅ AdvisoryMessageController の責任

1. **次のステップ提案（Next Steps）**
   - 練習継続カード（Practice）のメッセージ生成
   - 次のレベルカード（Upgrade）のメッセージ生成
   - トレーニング記録カード（Records）のメッセージ生成

2. **セッション分析アドバイス（Session Analysis）**
   - 評価結果に基づく改善提案
   - 強み・弱みの分析メッセージ
   - 具体的なトレーニング推奨

3. **トレーニング中のヒント（Training Tips）**
   - ステップ進行中のガイダンス
   - エラー頻発時のアドバイス
   - 音程別の攻略ヒント

4. **評価結果メッセージ（Evaluation Messages）**
   - グレード達成メッセージ
   - 成長記録メッセージ
   - モチベーション向上メッセージ

### ❌ AdvisoryMessageController の責任外

- モード情報の管理（ModeController）
- セッションデータの保存・取得（DataManager, SessionDataManager）
- UI 要素のレンダリング（各ページ Controller）
- ユーザー操作のハンドリング（各ページ Controller）
- 評価計算（EvaluationCalculator）

---

## クラス設計

### クラス構造

```javascript
class AdvisoryMessageController {
    constructor() {
        this.modeController = window.ModeController;
        this.messageTemplates = this._initializeTemplates();
        this.modeProgression = this._initializeModeProgression();
    }

    // === 公開メソッド（Public Methods） ===

    /**
     * 次のステップ情報を生成
     */
    getNextSteps(currentMode, evaluation, chromaticDirection, scaleDirection) { }

    /**
     * セッション分析アドバイスを生成
     */
    getSessionAdvice(sessionResult, mode, options) { }

    /**
     * トレーニング中のヒントを生成
     */
    getTrainingTips(mode, step, performance) { }

    /**
     * 評価結果メッセージを生成
     */
    getEvaluationMessage(grade, metrics, context) { }

    // === 内部メソッド（Private Methods） ===

    _initializeTemplates() { }
    _initializeModeProgression() { }
    _getNextMode(currentMode, chromaticDirection) { }
    _getPracticeCard(currentMode, currentModeName, evaluation) { }
    _getUpgradeCard(currentMode, nextModeInfo) { }
    _getRecordsCard() { }
    _analyzeWeakness(sessionResult) { }
    _generateImprovement Advice(weakness) { }
}
```

---

## メソッド仕様

### 1. getNextSteps()

**目的**: 総合評価ページの「次のステップ」3カードの情報を生成

**シグネチャ**:
```javascript
getNextSteps(currentMode, evaluation, chromaticDirection = null, scaleDirection = 'ascending')
```

**パラメータ**:
- `currentMode` (string): 現在のモード ('random', 'continuous', '12tone')
- `evaluation` (object): EvaluationCalculator の評価結果
- `chromaticDirection` (string|null): 12音階モードの基音方向 ('ascending', 'descending', 'both')
- `scaleDirection` (string): 音階方向 ('ascending', 'descending')

**戻り値**: `Array<CardInfo>`
```javascript
[
    {
        type: 'practice',        // カードタイプ
        icon: 'repeat',          // Lucide アイコン名
        iconBg: 'linear-gradient(...)', // アイコン背景グラデーション
        title: 'もっと練習する',  // カードタイトル
        description: '...',      // 説明文（動的生成）
        buttonText: '...',       // ボタンテキスト
        actionId: 'next-step-random-practice', // アクションID
        disabled: false          // 無効化フラグ（オプション）
    },
    // ... upgrade, records カード
]
```

**生成ロジック**:

#### Practice カード
```javascript
// 成績に応じたメッセージパターン
if (evaluation.grade === 'S' || evaluation.grade === 'A') {
    description = `${currentModeName}で完璧を目指して継続練習`;
} else if (evaluation.grade === 'B' || evaluation.grade === 'C') {
    description = `${currentModeName}でさらなる精度向上を目指す`;
} else {
    description = `${currentModeName}の基礎をしっかり習得しましょう`;
}
```

#### Upgrade カード
```javascript
// 次のモード情報を取得
const nextModeInfo = this._getNextMode(currentMode, chromaticDirection);

if (!nextModeInfo) {
    // 最上級到達
    return {
        title: '最上級モード達成',
        description: 'おめでとうございます！全モードをマスターしました',
        disabled: true
    };
}

// 次のモード名を生成
const nextModeName = this.modeController.generatePageTitle(
    nextModeInfo.mode,
    {
        chromaticDirection: nextModeInfo.chromaticDirection,
        scaleDirection: nextModeInfo.scaleDirection
    }
);

// 成績に応じたメッセージ
if (evaluation.grade === 'S' || evaluation.grade === 'A') {
    description = `${nextModeName}に挑戦して更なる高みを目指しましょう`;
} else {
    description = `${nextModeName}でプロレベルの習得を目指す`;
}
```

#### Records カード
```javascript
// 固定メッセージ
{
    type: 'records',
    title: '成長の軌跡を確認',
    description: 'トレーニング記録であなたの上達を可視化',
    buttonText: '記録を見る'
}
```

---

### 2. getSessionAdvice()

**目的**: セッション詳細分析でのアドバイスメッセージ生成

**シグネチャ**:
```javascript
getSessionAdvice(sessionResult, mode, options = {})
```

**パラメータ**:
- `sessionResult` (object): セッション結果データ
  ```javascript
  {
      sessionId: 'session_xxx',
      avgError: 18.5,
      excellenceRate: 0.625,
      evaluationCounts: { excellent: 5, good: 2, pass: 1, practice: 0 },
      mode: '12tone',
      chromaticDirection: 'ascending',
      scaleDirection: 'ascending'
  }
  ```
- `mode` (string): モード ID
- `options` (object): オプション設定
  ```javascript
  {
      includeWeakness: true,     // 弱点分析を含める
      includeTips: true,         // 具体的ヒントを含める
      verbosity: 'detailed'      // 詳細度 ('brief', 'normal', 'detailed')
  }
  ```

**戻り値**: `object`
```javascript
{
    summary: '素晴らしい精度です！この調子で継続しましょう。',
    weakness: {
        type: 'interval',        // 弱点タイプ ('interval', 'timing', 'consistency')
        intervals: ['長3度', '完全5度'], // 弱点音程
        advice: '長3度と完全5度の判定精度を重点的に...'
    },
    tips: [
        '音程を聴いた直後に脳内で再現してみましょう',
        '基音からの距離感を意識すると精度が向上します'
    ],
    motivation: '優秀率62.5%達成！次はS級を目指しましょう！'
}
```

**生成ロジック**:

```javascript
getSessionAdvice(sessionResult, mode, options = {}) {
    const { avgError, excellenceRate, evaluationCounts } = sessionResult;

    // サマリーメッセージ
    let summary = '';
    if (excellenceRate >= 0.875) {
        summary = '完璧な精度です！プロレベルの音感を維持しましょう。';
    } else if (excellenceRate >= 0.75) {
        summary = '素晴らしい精度です！この調子で継続しましょう。';
    } else if (excellenceRate >= 0.5) {
        summary = '良好な結果です。さらなる精度向上を目指しましょう。';
    } else if (avgError > 50) {
        summary = '音程の聴き取りに集中し、ゆっくり確実に判定しましょう。';
    } else {
        summary = '基礎からしっかり練習を重ねましょう。';
    }

    // 弱点分析
    let weakness = null;
    if (options.includeWeakness) {
        weakness = this._analyzeWeakness(sessionResult);
    }

    // 具体的ヒント
    let tips = [];
    if (options.includeTips) {
        tips = this._generateTips(sessionResult, weakness);
    }

    // モチベーションメッセージ
    const motivation = this._generateMotivation(sessionResult);

    return { summary, weakness, tips, motivation };
}
```

---

### 3. getTrainingTips()

**目的**: トレーニング中のリアルタイムヒント生成（将来実装）

**シグネチャ**:
```javascript
getTrainingTips(mode, step, performance)
```

**パラメータ**:
- `mode` (string): 現在のモード
- `step` (number): 現在のステップ番号（0-7 or 0-11）
- `performance` (object): リアルタイムパフォーマンス指標
  ```javascript
  {
      recentErrors: [5.2, -8.1, 12.3],  // 直近3回の誤差
      consecutivePractice: 2,            // 連続Practice評価回数
      averageResponseTime: 2.5           // 平均応答時間（秒）
  }
  ```

**戻り値**: `string | null`

**使用場面**:
- ステップ開始時のガイダンス
- 連続してPractice評価が出た時
- 特定の音程で苦戦している時

---

### 4. getEvaluationMessage()

**目的**: 評価結果に応じた達成メッセージ生成

**シグネチャ**:
```javascript
getEvaluationMessage(grade, metrics, context = {})
```

**パラメータ**:
- `grade` (string): グレード ('S', 'A', 'B', 'C', 'D', 'E')
- `metrics` (object): 評価指標
- `context` (object): コンテキスト情報（初達成、連続達成など）

**戻り値**: `object`
```javascript
{
    title: 'S級ランク達成！',
    message: 'プロフェッショナルレベルの音感を獲得しました！',
    badge: 'gold-master',
    shareText: 'S級ランク達成！完璧な音感を習得しました！'
}
```

---

## データ構造

### モード進行マップ (modeProgression)

```javascript
{
    'random': {
        next: { mode: 'continuous', chromaticDirection: null, scaleDirection: 'ascending' },
        description: '連続チャレンジモードで半音を含む12音に挑戦'
    },
    'continuous': {
        next: { mode: '12tone', chromaticDirection: 'ascending', scaleDirection: 'ascending' },
        description: '12音階上昇モードでプロレベルの習得を目指す'
    },
    '12tone-ascending': {
        next: { mode: '12tone', chromaticDirection: 'descending', scaleDirection: 'ascending' },
        description: '12音階下降モードで下行音程感覚を習得'
    },
    '12tone-descending': {
        next: { mode: '12tone', chromaticDirection: 'both', scaleDirection: 'ascending' },
        description: '12音階両方向モードで完全習得を目指す'
    },
    '12tone-both': {
        next: null,  // 最上級
        description: '全モード制覇！'
    }
}
```

### メッセージテンプレート (messageTemplates)

```javascript
{
    practice: {
        highPerformance: '{modeName}で完璧を目指して継続練習',
        mediumPerformance: '{modeName}でさらなる精度向上を目指す',
        lowPerformance: '{modeName}の基礎をしっかり習得しましょう',
        consistent: '安定した精度を維持しています。この調子で継続！'
    },

    sessionAdvice: {
        excellent: '完璧な精度です！プロレベルの音感を維持しましょう。',
        good: '素晴らしい精度です！この調子で継続しましょう。',
        pass: '良好な結果です。さらなる精度向上を目指しましょう。',
        needsPractice: '基礎からしっかり練習を重ねましょう。'
    },

    weakness: {
        interval: '{intervals}の判定精度を重点的に練習しましょう',
        timing: '焦らずゆっくり判定することで精度が向上します',
        consistency: '安定した判定を心がけましょう'
    },

    tips: [
        '音程を聴いた直後に脳内で再現してみましょう',
        '基音からの距離感を意識すると精度が向上します',
        '正解した音程は脳内ピアノに記憶されています',
        '難しい音程は基音を再度確認してから判定しましょう'
    ]
}
```

---

## 使用例

### Example 1: 総合評価ページでの次のステップ表示

```javascript
// results-overview-controller.js

function displayNextSteps(currentMode, evaluation, chromaticDirection, scaleDirection) {
    const container = document.getElementById('next-steps-container');
    if (!container) return;

    // AdvisoryMessageController から次のステップ情報を取得
    const cards = window.AdvisoryMessageController.getNextSteps(
        currentMode,
        evaluation,
        chromaticDirection,
        scaleDirection
    );

    // カードをレンダリング
    container.innerHTML = cards.map(card => `
        <div class="next-step-card ${card.disabled ? 'disabled' : ''}"
             ${card.actionId ? `data-action-id="${card.actionId}"` : ''}>
            <div class="next-step-card-icon" style="background: ${card.iconBg};">
                <i data-lucide="${card.icon}" style="width: 24px; height: 24px;"></i>
            </div>
            <h3 class="next-step-card-title">${card.title}</h3>
            <p class="next-step-card-description">${card.description}</p>
            <button class="btn ${card.disabled ? 'btn-outline' : 'btn-primary'}"
                    ${card.disabled ? 'disabled' : ''}>
                ${card.buttonText}
            </button>
        </div>
    `).join('');

    // Lucide アイコン初期化
    if (typeof window.initializeLucideIcons === 'function') {
        window.initializeLucideIcons({ immediate: true });
    }

    // イベントリスナーを追加
    container.querySelectorAll('.next-step-card').forEach(card => {
        const actionId = card.getAttribute('data-action-id');
        if (actionId) {
            card.addEventListener('click', () => handleNextStepAction(actionId));
        }
    });
}
```

### Example 2: セッション詳細分析でのアドバイス表示

```javascript
// results-overview-controller.js

function displaySessionAdvice(sessionResult, mode) {
    // アドバイス情報を取得
    const advice = window.AdvisoryMessageController.getSessionAdvice(
        sessionResult,
        mode,
        {
            includeWeakness: true,
            includeTips: true,
            verbosity: 'detailed'
        }
    );

    // サマリー表示
    const summaryEl = document.getElementById('session-advice-summary');
    if (summaryEl) {
        summaryEl.textContent = advice.summary;
    }

    // 弱点分析表示
    if (advice.weakness) {
        const weaknessEl = document.getElementById('session-weakness');
        if (weaknessEl) {
            weaknessEl.innerHTML = `
                <h4>改善ポイント</h4>
                <p>${advice.weakness.advice}</p>
            `;
        }
    }

    // ヒント表示
    if (advice.tips.length > 0) {
        const tipsEl = document.getElementById('session-tips');
        if (tipsEl) {
            tipsEl.innerHTML = `
                <h4>トレーニングのヒント</h4>
                <ul>
                    ${advice.tips.map(tip => `<li>${tip}</li>`).join('')}
                </ul>
            `;
        }
    }

    // モチベーションメッセージ
    const motivationEl = document.getElementById('session-motivation');
    if (motivationEl) {
        motivationEl.textContent = advice.motivation;
    }
}
```

### Example 3: トレーニング中のヒント表示（将来実装）

```javascript
// training-controller.js

async function onStepComplete(step, result) {
    // パフォーマンス分析
    const performance = {
        recentErrors: recentStepResults.map(r => r.error),
        consecutivePractice: countConsecutivePractice(),
        averageResponseTime: calculateAverageResponseTime()
    };

    // ヒント取得
    const tip = window.AdvisoryMessageController.getTrainingTips(
        currentMode,
        step,
        performance
    );

    // ヒント表示（連続Practice評価時など）
    if (tip && performance.consecutivePractice >= 2) {
        showTrainingTip(tip);
    }
}
```

---

## 将来の拡張計画

### Phase 1: 基本実装（v1.0.0）

**対象**: 次のステップ提案（Next Steps）

**実装内容**:
- `getNextSteps()` メソッド実装
- モード進行マップの定義
- Practice/Upgrade/Records カード生成ロジック
- results-overview-controller.js への統合

**完了条件**:
- [ ] 全モードで次のステップが正しく表示される
- [ ] モード名が ModeController 経由で生成される
- [ ] 文字列置換ロジックが完全削除される

---

### Phase 2: セッション分析（v1.1.0）

**対象**: セッション詳細分析でのアドバイス

**実装内容**:
- `getSessionAdvice()` メソッド実装
- 弱点分析ロジック（`_analyzeWeakness()`）
- ヒント生成ロジック（`_generateTips()`）
- モチベーションメッセージ生成

**完了条件**:
- [ ] セッション結果に応じたアドバイスが表示される
- [ ] 弱点音程が正しく特定される
- [ ] 具体的な改善提案が提示される

---

### Phase 3: トレーニングヒント（v1.2.0）

**対象**: トレーニング中のリアルタイムガイダンス

**実装内容**:
- `getTrainingTips()` メソッド実装
- リアルタイムパフォーマンス分析
- 状況に応じたヒント表示ロジック
- training-controller.js への統合

**完了条件**:
- [ ] 連続Practice評価時にヒントが表示される
- [ ] 特定音程で苦戦時にアドバイスが出る
- [ ] ヒント表示がトレーニングを妨げない

---

### Phase 4: AI メッセージ生成（v2.0.0）

**対象**: AI による個別最適化メッセージ

**実装内容**:
- ユーザーの学習履歴分析
- パーソナライズされたアドバイス生成
- A/B テストによる効果測定
- 外部 API（OpenAI 等）との連携

**完了条件**:
- [ ] ユーザーごとに最適化されたメッセージが生成される
- [ ] メッセージ効果が測定・改善される
- [ ] AI 生成と静的メッセージの切り替えが可能

---

## 依存関係

### 必須依存

- **ModeController**: モード名生成に使用
  - `window.ModeController.generatePageTitle()`

- **EvaluationCalculator**: 評価結果の構造に依存
  - `evaluation.grade`
  - `evaluation.metrics`
  - `evaluation.gradeResult`

### オプション依存

- **SessionDataManager**: 学習履歴分析に使用（Phase 2以降）
- **DataManager**: ユーザー設定の取得（Phase 3以降）

### 逆依存（このコントローラーを使用するモジュール）

- **results-overview-controller.js**: 次のステップ表示
- **training-records-controller.js**: セッション分析（Phase 2）
- **training-controller.js**: リアルタイムヒント（Phase 3）

---

## 実装優先順位

### 🔴 高優先度（Phase 1 - v1.0.0）

1. **getNextSteps() 実装**
   - 理由: 既存の文字列置換ロジックが不安定
   - 影響: 総合評価ページのユーザー体験に直結
   - 工数: 4-6時間

2. **モード進行マップ定義**
   - 理由: モード追加時の修正箇所を一元化
   - 影響: 保守性・拡張性の大幅向上
   - 工数: 2-3時間

3. **results-overview-controller.js 統合**
   - 理由: 既存のハードコードを削除
   - 影響: コード品質の向上
   - 工数: 2-3時間

**Phase 1 合計工数**: 8-12時間

---

### 🟡 中優先度（Phase 2 - v1.1.0）

1. **getSessionAdvice() 実装**
   - 理由: セッション詳細分析の価値向上
   - 影響: ユーザーの上達支援
   - 工数: 6-8時間

2. **弱点分析ロジック**
   - 理由: 具体的な改善提案の提供
   - 影響: トレーニング効果の向上
   - 工数: 4-6時間

**Phase 2 合計工数**: 10-14時間

---

### 🟢 低優先度（Phase 3以降）

1. **getTrainingTips() 実装** (Phase 3)
   - 工数: 8-12時間

2. **AI メッセージ生成** (Phase 4)
   - 工数: 20-30時間

---

## テスト方針

### 単体テスト

```javascript
describe('AdvisoryMessageController', () => {
    describe('getNextSteps', () => {
        it('random モードで連続チャレンジへの遷移を提案する', () => {
            const controller = new AdvisoryMessageController();
            const evaluation = { grade: 'B', metrics: { /* ... */ } };

            const cards = controller.getNextSteps('random', evaluation, null, 'ascending');

            expect(cards[1].title).toBe('次のレベルに挑戦');
            expect(cards[1].description).toContain('連続チャレンジモード 上行');
        });

        it('12tone-both モードで最上級達成を表示する', () => {
            const controller = new AdvisoryMessageController();
            const evaluation = { grade: 'S', metrics: { /* ... */ } };

            const cards = controller.getNextSteps('12tone', evaluation, 'both', 'ascending');

            expect(cards[1].disabled).toBe(true);
            expect(cards[1].title).toBe('最上級モード達成');
        });
    });

    describe('getSessionAdvice', () => {
        it('優秀率75%以上で高評価メッセージを返す', () => {
            const controller = new AdvisoryMessageController();
            const sessionResult = {
                avgError: 15.2,
                excellenceRate: 0.875,
                evaluationCounts: { excellent: 7, good: 1, pass: 0, practice: 0 }
            };

            const advice = controller.getSessionAdvice(sessionResult, '12tone');

            expect(advice.summary).toContain('素晴らしい');
        });
    });
});
```

### 統合テスト

- ModeController との連携テスト
- 各モードでの次のステップ表示テスト
- セッション詳細分析ページでの表示テスト

---

## 実装ファイル

### 新規作成

- **`/PitchPro-SPA/js/advisory-message-controller.js`**
  - AdvisoryMessageController クラス本体
  - グローバルインスタンス初期化

### 修正対象

- **`/PitchPro-SPA/pages/js/results-overview-controller.js`**
  - displayNextSteps() の完全書き換え
  - nextStepsConfig の削除
  - 文字列置換ロジックの削除

- **`/PitchPro-SPA/index.html`**
  - advisory-message-controller.js の読み込み追加

---

## 変更履歴

| バージョン | 日付 | 変更内容 |
|---|---|---|
| 1.0.0 | 2025-11-16 | 初版作成・設計完了 |

---

## 参考資料

- [MODE_CONTROLLER_SPECIFICATION.md](./MODE_CONTROLLER_SPECIFICATION.md)
- [EVALUATION_SYSTEM_SPECIFICATION.md](./EVALUATION_SYSTEM_SPECIFICATION.md)
- [TRAINING_SPECIFICATION.md](./TRAINING_SPECIFICATION.md)

---

**作成者**: Claude Code
**レビュー**: 未実施
**承認**: 未実施
