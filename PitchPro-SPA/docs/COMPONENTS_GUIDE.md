# PitchPro-SPA コンポーネントガイド

**バージョン**: 1.1.0
**最終更新**: 2025-01-09

## 📋 目次

- [概要](#概要)
- [LoadingComponent](#loadingcomponent)
- [実装ガイドライン](#実装ガイドライン)

---

## 概要

PitchPro-SPAで使用する共通UIコンポーネントの使用方法と実装ガイドラインです。

### コンポーネント一覧

| コンポーネント | ファイルパス | 用途 | バージョン |
|--------------|-------------|------|-----------|
| LoadingComponent | `/js/components/loading-component.js` | ローディング表示 | 1.0.0 |

---

## LoadingComponent

### 📍 基本情報

**ファイルパス**: `/js/components/loading-component.js`
**グローバル変数**: `window.LoadingComponent`
**依存関係**:
- `base.css` (アニメーション定義)
- Lucide Icons

### 🎯 使用目的

データ読み込み中やAPI通信中に、ユーザーに処理中であることを視覚的に伝えるためのローディングインジケーターです。

### ✅ 実装条件（必須チェック）

LoadingComponentを実装すべき条件：

1. **データ取得に時間がかかる場合**
   - API通信（100ms以上）
   - localStorageからの大量データ読み込み
   - Chart.jsなどのグラフ描画

2. **ユーザーが待機する必要がある場合**
   - セッション履歴の読み込み
   - 統計情報の計算
   - 外部リソースの読み込み

3. **SPAページ遷移時**
   - 初期表示でデータが空の場合
   - 非同期処理が完了するまでの間

### 🚫 実装不要な場合

- 処理時間が50ms未満の場合
- ユーザー操作の即時フィードバック（ボタンクリック等）
- すでにデータがキャッシュされている場合

---

## 使用方法

### 1. HTML生成（静的）

HTMLファイル内で直接使用する場合：

```html
<!-- トレーニング記録ページの例 -->
<section class="glass-card">
    <!-- ローディング表示 -->
    <div class="flex flex-col items-center gap-3 py-8" id="stats-loading" style="display: flex;">
        <i data-lucide="loader-2" class="text-blue-300 animate-spin" style="width: 48px; height: 48px;"></i>
        <p class="text-white-60">統計情報を読み込み中...</p>
    </div>

    <!-- コンテンツ（初期非表示） -->
    <div id="stats-content" style="display: none;">
        <!-- データ表示 -->
    </div>
</section>
```

### 2. JavaScript生成（動的）

JavaScriptから動的に生成する場合：

```javascript
// 単一のローディング生成
const loadingHTML = LoadingComponent.create({
    id: 'stats-loading',
    color: 'blue',
    message: '統計情報を読み込み中...',
    size: '48px'  // オプション（デフォルト: 48px）
});

// HTMLに挿入
document.getElementById('container').innerHTML = loadingHTML;
```

### 3. 複数セクション生成

複数のローディングを一括生成：

```javascript
const loadings = LoadingComponent.createSet([
    { id: 'stats-loading', color: 'blue', message: '統計情報を読み込み中...' },
    { id: 'chart-loading', color: 'green', message: 'グラフを読み込み中...' },
    { id: 'sessions-loading', color: 'purple', message: 'トレーニング履歴を読み込み中...' }
]);

// 各セクションに挿入
document.getElementById('stats-section').innerHTML = loadings['stats-loading'];
document.getElementById('chart-section').innerHTML = loadings['chart-loading'];
```

---

## API リファレンス

### LoadingComponent.create(options)

ローディングHTML文字列を生成します。

**パラメータ**:

| 名前 | 型 | 必須 | デフォルト | 説明 |
|------|----|----|----------|------|
| id | string | ○ | - | 要素ID（例: 'stats-loading'） |
| color | string | - | 'blue' | アイコン色 |
| message | string | - | '読み込み中...' | 表示メッセージ |
| size | string | - | '48px' | アイコンサイズ |

**色オプション**:
- `blue` - 青色（統計情報用）
- `green` - 緑色（グラフ・成功系）
- `purple` - 紫色（履歴・一覧系）
- `orange` - オレンジ色（警告系）
- `yellow` - 黄色（注意系）
- `red` - 赤色（エラー系）

**戻り値**: HTML文字列

**使用例**:
```javascript
const html = LoadingComponent.create({
    id: 'data-loading',
    color: 'green',
    message: 'データを処理中...',
    size: '64px'
});
```

---

### LoadingComponent.toggle(sectionName, isLoading)

セクションのローディング/コンテンツ表示を切り替えます。

**パラメータ**:

| 名前 | 型 | 必須 | 説明 |
|------|----|----|------|
| sectionName | string | ○ | セクション名（例: 'stats'） |
| isLoading | boolean | - | true=ローディング表示、false=コンテンツ表示 |

**前提条件**:
- `{sectionName}-loading`という要素が存在する
- `{sectionName}-content`という要素が存在する

**使用例**:
```javascript
// ローディング表示
LoadingComponent.toggle('stats', true);

// データ読み込み処理
await fetchData();

// コンテンツ表示
LoadingComponent.toggle('stats', false);
```

---

### LoadingComponent.createError(options)

エラー表示HTML文字列を生成します。

**パラメータ**:

| 名前 | 型 | 必須 | デフォルト | 説明 |
|------|----|----|----------|------|
| id | string | ○ | - | 要素ID（例: 'stats-error'） |
| message | string | - | 'エラーが発生しました' | エラーメッセージ |
| actionText | string | - | null | アクションボタンテキスト |
| actionCallback | Function | - | null | アクションボタンコールバック |
| size | string | - | '48px' | アイコンサイズ |

**戻り値**: HTML文字列

**使用例**:
```javascript
const errorHTML = LoadingComponent.createError({
    id: 'stats-error',
    message: 'データの読み込みに失敗しました',
    actionText: '再読み込み',
    actionCallback: () => location.reload()
});

document.getElementById('container').innerHTML = errorHTML;
```

---

### LoadingComponent.showError(sectionName, message, actionText, actionCallback)

セクションをエラー表示に切り替えます。

**パラメータ**:

| 名前 | 型 | 必須 | 説明 |
|------|----|----|------|
| sectionName | string | ○ | セクション名（例: 'stats'） |
| message | string | ○ | エラーメッセージ |
| actionText | string | - | アクションボタンテキスト（オプション） |
| actionCallback | Function | - | アクションボタンコールバック（オプション） |

**前提条件**:
- `{sectionName}-loading`という要素が存在する
- `{sectionName}-content`という要素が存在する
- エラー要素が自動生成される

**使用例**:
```javascript
// シンプルなエラー表示
LoadingComponent.showError('stats', 'データの読み込みに失敗しました');

// アクションボタン付きエラー表示
LoadingComponent.showError('stats',
    'データの読み込みに失敗しました',
    '再試行',
    () => loadData()
);
```

---

### LoadingComponent.hideError(sectionName)

エラー表示を非表示にします。

**パラメータ**:

| 名前 | 型 | 必須 | 説明 |
|------|----|----|------|
| sectionName | string | ○ | セクション名 |

**使用例**:
```javascript
LoadingComponent.hideError('stats');
```

---

### LoadingComponent.hide(loadingId)

ローディングを非表示にします。

**パラメータ**:

| 名前 | 型 | 必須 | 説明 |
|------|----|----|------|
| loadingId | string | ○ | ローディング要素のID |

**使用例**:
```javascript
LoadingComponent.hide('stats-loading');
```

---

### LoadingComponent.show(loadingId)

ローディングを表示します。

**パラメータ**:

| 名前 | 型 | 必須 | 説明 |
|------|----|----|------|
| loadingId | string | ○ | ローディング要素のID |

**使用例**:
```javascript
LoadingComponent.show('stats-loading');
```

---

## 実装パターン

### パターン1: トレーニング記録ページ方式

**特徴**: セクション別にローディング表示

```javascript
async function loadTrainingRecords() {
    try {
        const sessions = DataManager.getSessionHistory(null, 50);

        if (!sessions || sessions.length === 0) {
            // データなし時は全ローディング非表示
            LoadingComponent.toggle('stats', false);
            LoadingComponent.toggle('chart', false);
            LoadingComponent.toggle('sessions', false);
            showNoDataMessage();
            return;
        }

        // 統計情報
        const stats = calculateStatistics(sessions);
        await displayStatistics(stats);
        LoadingComponent.toggle('stats', false);  // ローディング → コンテンツ

        // セッションリスト
        await displaySessionList(sessions);
        LoadingComponent.toggle('sessions', false);

        // グラフ
        await displayAccuracyChart(sessions);
        LoadingComponent.toggle('chart', false);

    } catch (error) {
        console.error('Error loading records:', error);
        // エラー時はエラー表示に切り替え（v1.1.0更新）
        LoadingComponent.showError('stats',
            'データの読み込みに失敗しました',
            '再読み込み',
            () => location.reload()
        );
    }
}
```

### パターン2: エラー処理統合パターン（推奨）

**特徴**: エラー時にshowError()で自動切り替え

```javascript
async function loadData() {
    try {
        // データ取得処理
        const data = await fetchData();

        // 成功時: コンテンツ表示
        displayData(data);
        LoadingComponent.toggle('stats', false);

    } catch (error) {
        console.error('Error:', error);
        // エラー時: エラー表示に自動切り替え
        LoadingComponent.showError('stats',
            'データの読み込みに失敗しました',
            '再試行',
            () => loadData()  // 再試行ボタンで同じ関数を呼び出し
        );
    }
}
```

### パターン3: シンプルな全画面ローディング

**特徴**: 1つのローディングで全体を管理

```javascript
async function loadData() {
    // ローディング表示
    LoadingComponent.show('page-loading');

    try {
        // データ取得
        const data = await fetchData();

        // データ表示
        displayData(data);

        // ローディング非表示
        LoadingComponent.hide('page-loading');
    } catch (error) {
        // エラー時: ローディング非表示してエラー表示
        LoadingComponent.hide('page-loading');
        LoadingComponent.showError('page',
            'エラーが発生しました',
            'ホームに戻る',
            () => window.location.hash = 'home'
        );
    }
}
```

### パターン4: 段階的ローディング

**特徴**: 複数の処理を段階的に表示

```javascript
async function loadComplexData() {
    // Phase 1: 基本データ読み込み
    LoadingComponent.show('basic-loading');
    const basicData = await fetchBasicData();
    displayBasicData(basicData);
    LoadingComponent.hide('basic-loading');

    // Phase 2: 詳細データ読み込み
    LoadingComponent.show('detail-loading');
    const detailData = await fetchDetailData();
    displayDetailData(detailData);
    LoadingComponent.hide('detail-loading');

    // Phase 3: グラフ生成
    LoadingComponent.show('chart-loading');
    await generateChart(basicData, detailData);
    LoadingComponent.hide('chart-loading');
}
```

---

## トラブルシューティング

### ❌ ローディングが消えない

**原因**: CSSの`.flex { display: flex !important }`が優先されている

**解決策**: `LoadingComponent.hide()`を使用（内部で`!important`対応済み）

```javascript
// ❌ 動かない
document.getElementById('loading').style.display = 'none';

// ✅ 正しい
LoadingComponent.hide('loading');
```

### ❌ アニメーションが動かない

**原因**: base.cssのアニメーション定義が読み込まれていない

**解決策**: index.htmlでbase.cssを読み込んでいることを確認

```html
<link rel="stylesheet" href="styles/base.css">
```

### ❌ アイコンが表示されない

**原因**: Lucideアイコンの初期化タイミング問題

**解決策**: ローディング表示後にアイコンを再初期化

```javascript
LoadingComponent.show('loading');

// Lucideアイコン再初期化
if (typeof window.initializeLucideIcons === 'function') {
    window.initializeLucideIcons({ immediate: true });
}
```

---

## ベストプラクティス

### ✅ DO（推奨）

1. **適切なタイミングでローディング表示**
   ```javascript
   LoadingComponent.show('loading');
   await longRunningTask();
   LoadingComponent.hide('loading');
   ```

2. **色を用途で使い分ける**
   - 統計情報: `blue`
   - グラフ: `green`
   - 履歴: `purple`

3. **エラー時もローディング非表示**
   ```javascript
   try {
       LoadingComponent.show('loading');
       await fetchData();
   } catch (error) {
       LoadingComponent.hide('loading');
       showError(error);
   }
   ```

4. **セクション別に管理**
   ```javascript
   // 各セクション独立してローディング管理
   LoadingComponent.toggle('stats', false);
   LoadingComponent.toggle('chart', false);
   ```

### ❌ DON'T（非推奨）

1. **直接style操作**
   ```javascript
   // ❌ 動かない可能性がある
   element.style.display = 'none';

   // ✅ 正しい
   LoadingComponent.hide('loading-id');
   ```

2. **不必要なローディング**
   ```javascript
   // ❌ 即座に完了する処理にローディング不要
   LoadingComponent.show('loading');
   const result = localStorage.getItem('key');
   LoadingComponent.hide('loading');
   ```

3. **ローディングの隠し忘れ**
   ```javascript
   // ❌ エラー時にローディングが残る
   LoadingComponent.show('loading');
   await fetchData();
   LoadingComponent.hide('loading');  // エラー時に実行されない
   ```

---

## 今後の拡張予定

- [ ] プログレス表示機能（0-100%）
- [ ] カスタムアイコン対応
- [ ] スケルトンローディング
- [ ] テキストのみローディング

---

## 参考実装

### 実装済みページ

1. **トレーニング記録ページ** (`/pages/records.html`)
   - セクション別ローディング（stats/chart/sessions）
   - 段階的コンテンツ表示
   - 実装ファイル: `/pages/js/records-controller.js`

---

**ドキュメント作成日**: 2025-01-09
**作成者**: Claude Code
**バージョン管理**: このドキュメントはコンポーネント更新時に随時更新されます
