# モジュール型SPA実装手順書

## 📋 実装ロードマップ

### 実装方針
- **段階的移行**: 既存コードを段階的にモジュール化
- **リスク最小化**: 各Phase完了時点で動作検証
- **後方互換性**: 既存ファイルをバックアップ保持
- **テスト優先**: 各段階で動作確認必須

## 🏗️ Phase 1: 基盤構築（リスク: 低）

### 1.1 ディレクトリ構造準備
```bash
# 新規ディレクトリ作成
mkdir -p Bolt/v2/pages/templates
mkdir -p Bolt/v2/pages/js/controllers  
mkdir -p Bolt/v2/pages/js/shared
mkdir -p Bolt/v2/pages/js/utils

# バックアップディレクトリ
mkdir -p Bolt/v2/pages/backup-legacy
```

### 1.2 app.html作成（メインアプリケーション）
```html
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>8va相対音感トレーニングアプリ</title>
    
    <!-- 既存CSS活用 -->
    <link rel="stylesheet" href="css/system.css">
    <link rel="stylesheet" href="css/base.css">
    <link rel="stylesheet" href="css/results.css">
</head>
<body class="dark-theme">
    <div class="app-container">
        <main id="app-main" class="app-main">
            <!-- 初期ローディング -->
            <div id="loading-screen" class="loading-screen">
                <i data-lucide="loader-2" class="animate-spin"></i>
                <p>初期化中...</p>
            </div>
        </main>
    </div>

    <!-- 既存ライブラリ -->
    <script src="https://unpkg.com/lucide@latest/dist/umd/lucide.js"></script>
    <script src="../../../js/pitchpro-audio/pitchpro-v1.3.1.umd.js"></script>
    
    <!-- 司令塔 -->
    <script type="module" src="js/app.js"></script>
</body>
</html>
```

### 1.3 app.js司令塔作成
```javascript
// js/app.js - アプリケーション司令塔
let sharedAudioManager = null;
let currentPage = null;

// ページ切り替え機能
export async function showPage(pageName, options = {}) {
    const mainContainer = document.getElementById('app-main');
    
    try {
        // 1. テンプレート読み込み
        const response = await fetch(`templates/${pageName}.html`);
        const html = await response.text();
        
        // 2. HTML挿入
        mainContainer.innerHTML = html;
        
        // 3. Lucideアイコン初期化
        if (typeof lucide !== 'undefined') lucide.createIcons();
        
        // 4. ページ専用コントローラー読み込み
        const controllerModule = await import(`./controllers/${pageName}.js`);
        await controllerModule.initialize(sharedAudioManager, options);
        
        currentPage = pageName;
        console.log(`✅ ページ切り替え完了: ${pageName}`);
        
    } catch (error) {
        console.error(`❌ ページ読み込みエラー: ${pageName}`, error);
        showErrorPage(error.message);
    }
}

// アプリケーション初期化
async function initializeApp() {
    console.log('🚀 アプリケーション初期化開始');
    
    // 準備ページから開始
    await showPage('preparation');
}

// DOM読み込み完了時に初期化
document.addEventListener('DOMContentLoaded', initializeApp);

// グローバル関数として公開
window.app = { showPage };
```

### 1.4 共通モジュール整備
```javascript
// js/shared/global-audio-manager.js（既存から移動）
// js/shared/data-manager.js（既存から移動） 
// js/shared/navigation.js（新規作成）
```

## 🏗️ Phase 2: テンプレート分離（リスク: 中）

### 2.1 preparation.htmlテンプレート作成
```bash
# 既存preparation-step1.htmlの必要部分を抽出
# templates/preparation.html として保存
# 3ステップ統合UI（permission → audio-test → range-test → result）
```

#### テンプレート構造
```html
<!-- templates/preparation.html -->
<div class="preparation-container">
    <!-- Step 1: マイク許可 -->
    <section id="permission-section" class="test-section">
        <!-- 既存のマイク許可UI -->
    </section>
    
    <!-- Step 2: 音声テスト -->
    <section id="audio-test-section" class="test-section hidden">
        <!-- 既存の音声テストUI -->
    </section>
    
    <!-- Step 3: 音域テスト -->
    <section id="range-test-section" class="test-section hidden">
        <!-- 既存の音域テストUI -->
    </section>
    
    <!-- 結果・遷移 -->
    <section id="preparation-result-section" class="test-section hidden">
        <!-- トレーニング開始・スキップボタン -->
    </section>
</div>
```

### 2.2 training-random.htmlテンプレート作成
```html
<!-- templates/training-random.html -->
<div class="training-container">
    <div class="training-header">
        <h2>ランダム基音モード</h2>
        <div class="progress-indicator">
            <!-- セッション進行表示 -->
        </div>
    </div>
    
    <div class="training-content">
        <!-- 音程判定UI -->
        <!-- 回答ボタン -->
        <!-- 結果フィードバック -->
    </div>
</div>
```

### 2.3 results.htmlテンプレート作成
```html
<!-- templates/results.html -->
<div class="results-container">
    <!-- 結果統計表示 -->
    <!-- 評価分布グラフ -->
    <!-- 次のアクション -->
</div>
```

## 🏗️ Phase 3: コントローラーモジュール化（リスク: 高）

### 3.1 preparation.js作成
```javascript
// js/controllers/preparation.js
export async function initialize(audioManager, options) {
    // 既存preparation-controller.jsロジックを移植
    // マイク許可 → 音声テスト → 音域テスト
    // 完了時にapp.showPage('training-random')で遷移
}

// UI状態管理
function showStep(stepName) { /* ... */ }
async function handleMicRequest() { /* ... */ }
async function handleRangeTest() { /* ... */ }
```

### 3.2 training-random.js作成
```javascript
// js/controllers/training-random.js
export async function initialize(audioManager, options) {
    // ランダム基音トレーニングロジック
    // 8セッション管理
    // 完了時にapp.showPage('results')で遷移
}
```

### 3.3 results.js作成
```javascript
// js/controllers/results.js
export async function initialize(audioManager, options) {
    // 結果表示・統計計算
    // 再開・継続オプション
}
```

## 🏗️ Phase 4: 統合・テスト（リスク: 中）

### 4.1 フロー統合テスト
1. **app.html起動確認**
2. **preparation完了 → training遷移確認**
3. **training完了 → results遷移確認**
4. **マイク許可状態継承確認**

### 4.2 レガシーファイル整理
```bash
# バックアップ移動
mv preparation-step1.html backup-legacy/
mv preparation-step2.html backup-legacy/
mv preparation-controller.js backup-legacy/

# 新システムがapp.htmlに統合済み
```

## 📋 実装チェックリスト

### Phase 1完了条件
- [ ] app.htmlでローディング画面表示
- [ ] app.jsでテンプレート読み込み動作
- [ ] 共通モジュール（data-manager.js等）正常動作

### Phase 2完了条件  
- [ ] templates/preparation.html正常表示
- [ ] 既存CSSスタイルが適用される
- [ ] UI要素（ボタン、プログレスバー等）正常表示

### Phase 3完了条件
- [ ] preparation.js単体動作確認
- [ ] マイク許可フローが完全動作
- [ ] 音域テストが完全動作
- [ ] PitchProインスタンス状態継承

### Phase 4完了条件
- [ ] preparation → training → results完全フロー
- [ ] マイク許可ダイアログ再表示なし
- [ ] パフォーマンス問題なし
- [ ] エラーハンドリング完備

## ⚠️ リスク対策

### 高リスク要素
1. **PitchProインスタンス管理**
   - 対策: グローバル変数で厳密管理
   - テスト: 各ページ遷移でconsole.log確認

2. **非同期読み込みエラー**
   - 対策: try-catch徹底とフォールバック画面
   - テスト: ネットワークエラーシミュレーション

3. **既存CSSとの競合**
   - 対策: テンプレート内でクラス名確認
   - テスト: 既存ページとの視覚比較

### 緊急時計画
- **即座に元の構成に戻せる**: レガシーファイルから復元
- **段階的ロールバック**: Phase単位での切り戻し
- **最小限動作保証**: マイク許可だけでも動作する状態維持

---

**作成日**: 2025年1月30日  
**推定実装時間**: Phase 1-2: 2-3時間、Phase 3-4: 4-5時間  
**実装優先度**: Phase 1 → Phase 2 → Phase 3 → Phase 4