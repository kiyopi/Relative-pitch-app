# SPAページタイトル管理機能の提案

**作成日**: 2025-11-23
**ステータス**: 📋 提案・レビュー中

---

## 1. 現状の問題

### 1.1 症状

- ブラウザの履歴に「8va相対音感トレーニング - ホーム」しか表示されない
- 複数タブを開いた際にページの区別ができない
- ブラウザの「戻る」ボタン長押しで履歴一覧を見ても全て同じタイトル

### 1.2 原因

SPAでは`index.html`の`<title>`タグがそのまま使われ続ける:

```html
<!-- index.html Line 13 -->
<title>8va相対音感トレーニング - ホーム</title>
```

ページ遷移はハッシュベースのルーティング（`#preparation`, `#training`等）で行われるが、`document.title`の更新処理が存在しない。

---

## 2. 現在のSPAアーキテクチャ

### 2.1 ルーティング方式

| 項目 | 値 |
|------|-----|
| 方式 | ハッシュベースルーティング |
| イベント | `hashchange` |
| URL例 | `index.html#preparation`, `index.html#training?mode=random` |

### 2.2 ページ一覧

| ページ | ハッシュ | 現在のタイトル | 期待するタイトル |
|--------|---------|---------------|-----------------|
| ホーム | `#home` | ホーム | ホーム |
| 準備 | `#preparation` | ホーム | 準備 |
| トレーニング | `#training` | ホーム | トレーニング |
| 個別結果 | `#result-session` | ホーム | セッション結果 |
| 総合評価 | `#results-overview` | ホーム | 総合評価 |
| 記録 | `#records` | ホーム | トレーニング記録 |
| 詳細分析 | `#premium-analysis` | ホーム | 詳細分析 |
| 設定 | `#settings` | ホーム | 設定 |
| ヘルプ | `#help` | ホーム | ヘルプ |

### 2.3 History API の現在の使用状況

```javascript
// navigation-manager.js
// ブラウザバック防止のために使用
history.pushState(null, '', location.href);  // Line 1227, 1228, 1281, 1282
```

**注意**: 現在`history.pushState`は**ブラウザバック防止**のみに使用されており、タイトル管理には使用されていない。

---

## 3. 修正案

### 3.1 実装方針

`pageConfigs`に`title`プロパティを追加し、`loadPage()`完了時に`document.title`を更新する。

### 3.2 修正箇所

#### 3.2.1 router.js - pageConfigs にタイトル追加

```javascript
this.pageConfigs = {
    'home': {
        init: null,
        dependencies: [],
        title: 'ホーム'  // 追加
    },
    'preparation': {
        init: 'initializePreparationPitchProCycle',
        dependencies: ['PitchPro'],
        title: '準備'  // 追加
        // ... cleanup
    },
    'training': {
        init: 'initializeTrainingPage',
        dependencies: ['PitchPro'],
        title: 'トレーニング'  // 追加
        // ... cleanup
    },
    'result-session': {
        init: 'initializeResultSessionPage',
        dependencies: [],
        title: 'セッション結果'  // 追加
    },
    'results-overview': {
        init: 'initResultsOverview',
        dependencies: ['Chart', 'DistributionChart'],
        preventDoubleInit: true,
        title: '総合評価'  // 追加
        // ... cleanup
    },
    'records': {
        init: 'initRecords',
        dependencies: ['Chart', 'DistributionChart'],
        title: 'トレーニング記録'  // 追加
        // ... cleanup
    },
    'premium-analysis': {
        init: 'initPremiumAnalysis',
        dependencies: ['Chart'],
        title: '詳細分析'  // 追加
    },
    'settings': {
        init: 'initSettings',
        dependencies: [],
        title: '設定'  // 追加
    },
    'help': {
        init: 'initHelpPage',
        dependencies: [],
        preventDoubleInit: false,
        title: 'ヘルプ'  // 追加
        // ... cleanup
    }
};
```

#### 3.2.2 router.js - loadPage() にタイトル更新処理追加

```javascript
async loadPage(page, fullHash = '', signal = null) {
    // ... 既存処理 ...

    // 7. 現在のページを更新
    this.currentPage = page;

    // 【v2.13.0追加】ページタイトルを更新
    this.updatePageTitle(page);

    console.log(`✅ [Router] Page loaded: ${page}`);
}

/**
 * 【v2.13.0追加】ページタイトルを更新
 * @param {string} page - ページ名
 */
updatePageTitle(page) {
    const config = this.pageConfigs[page];
    const pageTitle = config?.title || page;
    const fullTitle = `8va相対音感トレーニング - ${pageTitle}`;

    document.title = fullTitle;
    console.log(`📝 [Router] Page title updated: ${fullTitle}`);
}
```

---

## 4. 影響範囲分析

### 4.1 影響を受けるファイル

| ファイル | 変更内容 | リスク |
|----------|---------|--------|
| `router.js` | pageConfigs にtitle追加、updatePageTitle()メソッド追加 | 低 |

### 4.2 影響を受けないファイル

| ファイル | 理由 |
|----------|------|
| `navigation-manager.js` | history.pushStateはブラウザバック防止専用、タイトルとは独立 |
| 各コントローラー | router.jsが一元管理するため変更不要 |
| テンプレートHTML | タイトルはJavaScriptで動的に設定 |

### 4.3 既存機能への影響

| 機能 | 影響 |
|------|------|
| ブラウザバック防止 | ❌ なし - NavigationManagerが独立管理 |
| ページ遷移 | ❌ なし - loadPage()完了後の処理追加のみ |
| 履歴管理 | ✅ 改善 - 各ページのタイトルが履歴に反映 |
| リロード対応 | ❌ なし - hashchangeイベントで処理 |
| ダイレクトアクセス | ❌ なし - 初期化時にも適用 |

---

## 5. History API との関係

### 5.1 現在の挙動

```
ユーザー操作: ホーム → 準備 → トレーニング
履歴スタック:
  [1] index.html#home (タイトル: ホーム)
  [2] index.html#preparation (タイトル: ホーム)  ← 問題
  [3] index.html#training (タイトル: ホーム)    ← 問題
```

### 5.2 修正後の挙動

```
ユーザー操作: ホーム → 準備 → トレーニング
履歴スタック:
  [1] index.html#home (タイトル: ホーム)
  [2] index.html#preparation (タイトル: 準備)       ← 改善
  [3] index.html#training (タイトル: トレーニング)  ← 改善
```

### 5.3 タイトル反映の仕組み

ハッシュベースルーティングでは、`hashchange`イベント発火時にブラウザが自動的に履歴エントリを作成する。
この時点で`document.title`が履歴エントリに記録されるため、`loadPage()`完了時に`document.title`を更新すれば、**次の遷移時**から正しいタイトルが記録される。

**注意**: 現在表示中のページのタイトルを変更しても、既に作成された履歴エントリのタイトルは変わらない。
これはブラウザの仕様であり、完全な解決には`history.replaceState()`の使用が必要になる可能性がある。

---

## 6. 代替案の検討

### 6.1 案A: document.title のみ更新（推奨・シンプル）

**メリット**:
- 実装がシンプル
- 既存のルーティング構造に影響なし
- タブのタイトルは確実に変わる

**デメリット**:
- 履歴エントリのタイトルは「次の遷移時」から反映（現在ページは変わらない可能性）

### 6.2 案B: history.replaceState() を併用

```javascript
updatePageTitle(page) {
    const config = this.pageConfigs[page];
    const pageTitle = config?.title || page;
    const fullTitle = `8va相対音感トレーニング - ${pageTitle}`;

    document.title = fullTitle;

    // 現在の履歴エントリのタイトルも更新
    history.replaceState(
        history.state,
        fullTitle,
        location.href
    );
}
```

**メリット**:
- 現在の履歴エントリのタイトルも即座に更新される

**デメリット**:
- NavigationManagerのhistory.pushState()と競合する可能性
- ブラウザバック防止機能に影響を与える可能性がある
- 追加のテストが必要

### 6.3 推奨

**案A（document.titleのみ）**から始め、問題があれば案Bに拡張する。

---

## 7. テスト計画

### 7.1 基本テスト

| テスト項目 | 期待結果 |
|-----------|---------|
| ホーム → 準備 | タブタイトルが「準備」に変わる |
| 準備 → トレーニング | タブタイトルが「トレーニング」に変わる |
| トレーニング → 総合評価 | タブタイトルが「総合評価」に変わる |
| ページリロード | タイトルが正しく設定される |
| ダイレクトアクセス（#records直接）| タイトルが「トレーニング記録」になる |

### 7.2 履歴テスト

| テスト項目 | 期待結果 |
|-----------|---------|
| 「戻る」ボタン長押し | 各ページのタイトルが表示される |
| 複数タブ開く | 各タブで異なるタイトルが表示される |

### 7.3 既存機能確認

| テスト項目 | 期待結果 |
|-----------|---------|
| ブラウザバック | 無効化されている（NavigationManager） |
| リロード後の挙動 | 正しいページに遷移/リダイレクト |

---

## 8. ナビゲーション安定化への貢献

### 8.1 現在のNavigationManagerの課題

NavigationManagerは以下の方法でリロード/ダイレクトアクセスを検出している:

```javascript
// sessionStorageフラグによる遷移証明
static KEYS = {
    NORMAL_TRANSITION: 'normalTransitionToTraining',
    NORMAL_TRANSITION_PREPARATION: 'normalTransitionToPreparation',
    NORMAL_TRANSITION_RESULT_SESSION: 'normalTransitionToResultSession',
    REDIRECT_COMPLETED: 'reloadRedirected'
};

// visibilitychange + タイムスタンプによるデスクトップ切り替え検出
static lastVisibilityChange = 0;
```

**課題**:
- フラグ管理が複雑（4種類のフラグ）
- ページごとに個別のフラグが必要
- フラグのクリアタイミングが重要

### 8.2 ページタイトルによる状態追跡の可能性

ページタイトルを活用することで、**補助的な状態追跡**が可能:

```javascript
// 現在のページを特定
function getCurrentPageFromTitle() {
    const title = document.title;
    const match = title.match(/8va相対音感トレーニング - (.+)/);
    return match ? match[1] : 'unknown';
}

// ナビゲーション検証
function validateNavigation(expectedPage) {
    const currentPage = getCurrentPageFromTitle();
    if (currentPage !== expectedPage) {
        console.warn(`⚠️ ページ不整合: 期待=${expectedPage}, 実際=${currentPage}`);
        return false;
    }
    return true;
}
```

### 8.3 安定化への貢献ポイント

| 項目 | 現状 | タイトル管理後 |
|------|------|---------------|
| **デバッグ容易性** | ハッシュのみで判断 | タイトル+ハッシュで確認可能 |
| **履歴追跡** | 全て同じタイトル | ページごとに識別可能 |
| **状態整合性チェック** | フラグのみ | タイトルも併用可能 |
| **ユーザー体験** | 履歴が区別できない | 履歴でページを識別可能 |

### 8.4 統合実装案

```javascript
// router.js - loadPage完了時
async loadPage(page, fullHash = '', signal = null) {
    // ... 既存処理 ...

    // 7. 現在のページを更新
    this.currentPage = page;

    // 【v2.13.0追加】ページタイトルを更新
    this.updatePageTitle(page);

    // 【v2.13.0追加】状態整合性ログ
    console.log(`📝 [Router] Page state: hash=${page}, title=${document.title}`);

    console.log(`✅ [Router] Page loaded: ${page}`);
}

updatePageTitle(page) {
    const config = this.pageConfigs[page];
    const pageTitle = config?.title || page;
    const fullTitle = `8va相対音感トレーニング - ${pageTitle}`;

    document.title = fullTitle;

    // 状態整合性チェック（デバッグ用）
    if (this.currentPage !== page) {
        console.warn(`⚠️ [Router] Page state mismatch: currentPage=${this.currentPage}, loadedPage=${page}`);
    }
}
```

---

## 9. 結論

### 9.1 推奨アクション

1. **案A（document.titleのみ更新）**を実装
2. `pageConfigs`に`title`プロパティを追加
3. `loadPage()`完了時に`updatePageTitle()`を呼び出し
4. 基本テストと履歴テストを実行
5. 問題があれば案Bに拡張を検討

### 9.2 リスク評価

| リスク | レベル | 理由 |
|--------|--------|------|
| 既存機能への影響 | 🟢 低 | 追加処理のみ、既存ロジックに変更なし |
| NavigationManagerとの競合 | 🟢 低 | 案Aでは独立した処理 |
| テスト工数 | 🟢 低 | 基本的なナビゲーションテストで確認可能 |

### 9.3 工数見積もり

| 作業 | 時間 |
|------|------|
| 実装 | 15分 |
| テスト | 30分 |
| ドキュメント更新 | 15分 |
| **合計** | **1時間** |

### 9.4 期待される効果

| 効果 | 説明 |
|------|------|
| **UX向上** | ブラウザ履歴・タブでページを識別可能 |
| **デバッグ向上** | タイトルでページ状態を即座に確認 |
| **安定性向上** | 状態整合性チェックの補助手段として活用可能 |
| **将来の拡張性** | history.replaceState()統合への基盤 |

---

## 9. 関連ドキュメント

- `NAVIGATION_HANDLING_SPECIFICATION.md` - ナビゲーション管理仕様
- `ROUTER_PAGE_INITIALIZATION_GUIDE.md` - Router初期化ガイド
- `SPA_DEVELOPMENT_JOURNEY_AND_ARCHITECTURE.md` - SPAアーキテクチャ全体

---

**レポート作成**: Claude Code
**レビュー日**: 2025-11-23
