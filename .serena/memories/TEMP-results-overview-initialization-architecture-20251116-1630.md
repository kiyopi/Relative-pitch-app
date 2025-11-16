# 総合評価ページ初期化アーキテクチャ分析

## 呼び出しルート（現在 + 将来）

### 1. トレーニング完了時（直接遷移）
- **遷移元**: training.html → results-overview.html
- **パラメータ**: `?mode=12tone&lessonId=xxx&scaleDirection=ascending`
- **要件**: 
  - 次のステップ表示: ✅ 必要
  - セッション詳細: ✅ 表示
  - グラフ表示: ✅ 表示
  - fromRecords: ❌ false

### 2. トレーニング記録から（履歴参照）
- **遷移元**: records.html → results-overview.html
- **パラメータ**: `?mode=12tone&lessonId=xxx&scaleDirection=ascending&fromRecords=true`
- **要件**:
  - 次のステップ表示: ❌ 非表示（handleRecordsViewMode()で制御）
  - セッション詳細: ✅ 表示
  - グラフ表示: ✅ 表示
  - fromRecords: ✅ true

### 3. 詳細分析から（将来実装）
- **遷移元**: premium-analysis.html → results-overview.html
- **パラメータ**: `?mode=12tone&lessonId=xxx&fromAnalysis=true`
- **要件**:
  - 次のステップ表示: ❌ 非表示
  - セッション詳細: ✅ 表示
  - グラフ表示: ✅ 表示
  - fromAnalysis: ✅ true

## 現在の問題：二重初期化

### 原因1: Router.jsのinit()
```javascript
init() {
    window.addEventListener('hashchange', () => this.handleRouteChange());
    window.addEventListener('DOMContentLoaded', () => this.handleRouteChange()); // ← 問題
    
    this.handleRouteChange(); // ← 即座実行
}
```

- init()で即座に実行 → 1回目
- DOMContentLoadedで実行 → 2回目

### 原因2: Router.jsのsetupResultsOverviewEvents()
```javascript
setupResultsOverviewEvents() {
    setTimeout(() => {
        if (typeof window.initResultsOverview === 'function') {
            window.initResultsOverview(); // ← Router.jsからも呼ぶ
        }
    }, 300);
}
```

### 原因3: results-overview.htmlのonload
```html
<script src="pages/js/results-overview-controller.js" onload="initResultsOverviewPage()"></script>
<script>
    async function initResultsOverviewPage() {
        await window.initResultsOverview(); // ← HTMLからも呼ぶ
    }
</script>
```

**結果**: 同じページ遷移で2-3回initResultsOverview()が呼ばれる

## 理想的な設計原則

### 1. 単一責任の原則
- **Router.js**: ページ遷移とHTMLロードのみ
- **HTML**: スクリプト読み込み完了後の初期化トリガー
- **Controller.js**: 実際の初期化ロジック

### 2. 冪等性の保証
- 何度呼ばれても安全
- 二重実行防止ガード

### 3. パラメータベース制御
- fromRecords, fromAnalysis, lessonId等で動作を制御
- 条件分岐は1箇所（initResultsOverview内）

### 4. 依存性の明確化
- スクリプト読み込み完了を確実に待つ
- 非同期処理の完了を保証

## 推奨する解決策（3段階）

### Phase 1: 即座の修正（最小限の変更）
**目的**: 二重初期化を即座に防ぐ

1. ✅ **Router.jsのsetupResultsOverviewEvents()を空にする**
   ```javascript
   setupResultsOverviewEvents() {
       console.log('Setting up results-overview page events...');
       // HTMLのonloadに任せるため、ここでは何もしない
   }
   ```

2. ✅ **initResultsOverview()に二重実行防止ガード追加**
   ```javascript
   window.initResultsOverview = async function initResultsOverview() {
       if (window._resultsOverviewInitializing) {
           console.log('⚠️ 既に初期化中のため、スキップします');
           return;
       }
       window._resultsOverviewInitializing = true;
       
       try {
           // 初期化処理
       } finally {
           window._resultsOverviewInitializing = false;
       }
   }
   ```

**影響範囲**: results-overview関連のみ  
**リスク**: 低  
**効果**: 即座に二重初期化を防止

### Phase 2: Router.jsの根本修正（中期）
**目的**: 他のページも含めた根本的な改善

3. ✅ **Router.jsのinit()からDOMContentLoadedリスナーを削除**
   ```javascript
   init() {
       window.addEventListener('hashchange', () => this.handleRouteChange());
       // DOMContentLoadedリスナーを削除（init()呼び出し時点でDOM準備済み）
       
       this.handleRouteChange(); // 初期表示
   }
   ```

**影響範囲**: 全ページ  
**リスク**: 中（他ページの動作確認必要）  
**効果**: 全ページで二重実行を防止

### Phase 3: アーキテクチャの統一（長期）
**目的**: すべてのページで統一された初期化パターン

4. ✅ **全ページのonload初期化パターンを統一**
   - Router.jsはHTMLロードのみ
   - 各ページのHTMLがonloadで初期化関数を呼ぶ
   - 各初期化関数に二重実行防止ガード

**影響範囲**: 全ページ  
**リスク**: 中  
**効果**: 保守性・拡張性の向上

## 今回の作業推奨

1. **Phase 1のステップ1と2を実施**（即座修正）
2. **動作確認**
   - トレーニング完了 → 総合評価
   - トレーニング記録 → 総合評価
3. **問題なければPhase 2を実施**（根本修正）
4. **Phase 3は別タスクとして計画**（長期改善）

この段階的アプローチで：
- ✅ 安全に修正できる
- ✅ トレーニング記録、詳細分析からの呼び出しに対応
- ✅ 冪等性を保証
- ✅ 将来的な拡張にも対応
