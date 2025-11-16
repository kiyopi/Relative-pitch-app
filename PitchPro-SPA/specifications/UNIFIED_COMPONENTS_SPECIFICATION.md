# 統一コンポーネント・マネージャー仕様書

**バージョン**: 1.0.0
**作成日**: 2025-11-16
**最終更新日**: 2025-11-16

## 📋 目的

このドキュメントは、PitchPro-SPAアプリケーション全体で使用される統一コンポーネント・マネージャーの完全なリファレンスです。これにより：

- **一貫性の確保**: 全ページで同じメソッドを使用
- **保守性の向上**: 変更箇所を一元管理
- **バグ削減**: 直接DOM操作や重複コードを排除
- **開発効率化**: 既存コンポーネントの再利用

---

## 🎯 統一コンポーネント・マネージャー一覧

### 1. ModeController（モード管理）
**ファイル**: `/PitchPro-SPA/js/mode-controller.js`
**役割**: トレーニングモードの管理、ページヘッダー更新、モード情報取得

#### 利用可能メソッド（9個）

| メソッド名 | 役割 | 使用例 |
|---|---|---|
| `updatePageHeader(modeId, options)` | ページヘッダーのタイトル・モード名・スケール方向を更新 | `ModeController.updatePageHeader('random', { scaleDirection: 'ascending' })` |
| `generatePageTitle(modeId, options)` | ページタイトルHTML生成 | `const html = ModeController.generatePageTitle('random', { scaleDirection: 'ascending' })` |
| `getMode(modeId)` | モード情報オブジェクト取得 | `const mode = ModeController.getMode('random')` |
| `getModeName(modeId)` | モード表示名取得 | `const name = ModeController.getModeName('random')` |
| `getSessionsPerLesson(modeId)` | レッスンあたりのセッション数取得 | `const count = ModeController.getSessionsPerLesson('continuous')` |
| `toTrainingConfig(modeId)` | トレーニング設定オブジェクト変換 | `const config = ModeController.toTrainingConfig('random')` |
| `extractDirection(options)` | オプションからスケール方向抽出 | `const dir = ModeController.extractDirection({ scaleDirection: 'descending' })` |
| `getAllModes()` | 全モード情報取得 | `const modes = ModeController.getAllModes()` |

#### ❌ 置き換えるべき古いパターン

```javascript
// ❌ 古いパターン（直接DOM操作）
document.getElementById('page-title').textContent = 'ランダム基音モード';
document.getElementById('mode-name').textContent = 'ランダム基音';
document.getElementById('scale-direction').textContent = '上行';

// ✅ 推奨パターン（ModeController使用）
ModeController.updatePageHeader('random', { scaleDirection: 'ascending' });
```

---

### 2. LoadingComponent（ローディング状態管理）
**ファイル**: `/PitchPro-SPA/js/components/loading-component.js`
**役割**: ローディング表示・非表示、エラー表示の統一管理

#### 利用可能メソッド（8個）

| メソッド名 | 役割 | 使用例 |
|---|---|---|
| `toggle(section, show)` | ローディング表示/非表示切り替え | `LoadingComponent.toggle('stats', false)` |
| `show(section)` | ローディング表示 | `LoadingComponent.show('stats')` |
| `hide(section)` | ローディング非表示 | `LoadingComponent.hide('stats')` |
| `showError(section, message, actionButton)` | エラー表示 | `LoadingComponent.showError('stats', 'データ読み込み失敗')` |
| `hideError(section)` | エラー非表示 | `LoadingComponent.hideError('stats')` |
| `create(section)` | ローディングHTML生成 | `const html = LoadingComponent.create({ id: 'stats-loading', color: 'blue' })` |
| `createError(section)` | エラーHTML生成 | `const html = LoadingComponent.createError({ id: 'stats-error' })` |
| `createSet(sections)` | 複数セクションのローディングHTML生成 | `const html = LoadingComponent.createSet(['stats', 'chart'])` |

#### ❌ 置き換えるべき古いパターン

```javascript
// ❌ 古いパターン（手動DOM操作）
document.getElementById('loading-spinner').style.display = 'block';
document.getElementById('content').style.display = 'none';

// ✅ 推奨パターン（LoadingComponent使用）
LoadingComponent.show('stats');

// データ読み込み完了後
LoadingComponent.hide('stats');
```

---

### 3. SessionDataManager（セッションデータ管理）
**ファイル**: `/PitchPro-SPA/js/session-data-manager.js`
**役割**: セッションデータのフィルタリング、完全レッスンの取得

#### 利用可能メソッド（13個）

| メソッド名 | 役割 | 使用例 |
|---|---|---|
| `getAllSessions()` | 全セッション取得 | `const sessions = SessionDataManager.getAllSessions()` |
| `getCompleteSessionsByLessonId(lessonId, mode, scaleDirection)` | 完全レッスンのセッション取得（12/12 or 24/24） | `const sessions = SessionDataManager.getCompleteSessionsByLessonId('lesson-123', 'random', 'ascending')` |
| `getCompleteLessons(sessions)` | 完全レッスンのみフィルタリング | `const complete = SessionDataManager.getCompleteLessons(allSessions)` |
| `getSessionsByLessonId(lessonId)` | レッスンID別セッション取得 | `const sessions = SessionDataManager.getSessionsByLessonId('lesson-123')` |
| `getSessionsByMode(mode)` | モード別セッション取得 | `const sessions = SessionDataManager.getSessionsByMode('random')` |
| `getSessionsByFilters(filters)` | フィルタ条件別セッション取得 | `const sessions = SessionDataManager.getSessionsByFilters({ mode: 'random', scaleDirection: 'ascending' })` |
| `clearAllSessions()` | 全セッションデータ削除 | `SessionDataManager.clearAllSessions()` |
| `addSession(sessionData)` | セッション追加 | `SessionDataManager.addSession({ lessonId: 'lesson-123', ... })` |
| `updateSession(sessionId, updates)` | セッション更新 | `SessionDataManager.updateSession('session-123', { completed: true })` |
| `deleteSession(sessionId)` | セッション削除 | `SessionDataManager.deleteSession('session-123')` |
| `getLatestSession()` | 最新セッション取得 | `const latest = SessionDataManager.getLatestSession()` |
| `getSessionCount()` | セッション総数取得 | `const count = SessionDataManager.getSessionCount()` |
| `exportSessions()` | セッションデータエクスポート | `const json = SessionDataManager.exportSessions()` |

#### ❌ 置き換えるべき古いパターン

```javascript
// ❌ 古いパターン（直接localStorage操作）
const sessions = JSON.parse(localStorage.getItem('training_sessions')) || [];
const filtered = sessions.filter(s => s.mode === 'random' && s.scaleDirection === 'ascending');

// ✅ 推奨パターン（SessionDataManager使用）
const sessions = SessionDataManager.getSessionsByFilters({
    mode: 'random',
    scaleDirection: 'ascending'
});
```

---

### 4. EvaluationCalculator（評価計算）
**ファイル**: `/PitchPro-SPA/js/evaluation-calculator.js`
**役割**: 動的グレード計算、音程誤差評価、基本メトリクス計算

#### 利用可能メソッド（13個）

| メソッド名 | 役割 | 使用例 |
|---|---|---|
| `calculateDynamicGrade(sessionData)` | 動的グレード計算（デバイス品質考慮） | `const grade = EvaluationCalculator.calculateDynamicGrade(sessions)` |
| `evaluateAverageError(avgError)` | 平均誤差の評価（Excellent/Good/Pass/Practice） | `const eval = EvaluationCalculator.evaluateAverageError(15.5)` |
| `evaluatePitchError(errorInCents)` | 個別音程誤差の評価 | `const eval = EvaluationCalculator.evaluatePitchError(12.3)` |
| `detectMode(sessionData)` | セッションデータからモード検出 | `const mode = EvaluationCalculator.detectMode(sessions)` |
| `detectDeviceQuality()` | デバイス品質検出（High/Medium/Low） | `const quality = EvaluationCalculator.detectDeviceQuality()` |
| `calculateBasicMetrics(sessionData)` | 基本メトリクス計算（平均誤差、標準偏差等） | `const metrics = EvaluationCalculator.calculateBasicMetrics(sessions)` |
| `calculateGradeDistribution(sessionData)` | グレード分布計算 | `const dist = EvaluationCalculator.calculateGradeDistribution(sessions)` |
| `calculateProgressRate(sessionData)` | 進捗率計算 | `const rate = EvaluationCalculator.calculateProgressRate(sessions)` |
| `calculateWeakIntervals(sessionData)` | 弱点音程分析 | `const weak = EvaluationCalculator.calculateWeakIntervals(sessions)` |
| `generateNextSteps(evaluation)` | 次のステップ生成 | `const steps = EvaluationCalculator.generateNextSteps(evaluation)` |
| `formatEvaluation(evaluation)` | 評価データフォーマット | `const formatted = EvaluationCalculator.formatEvaluation(evaluation)` |
| `exportEvaluation(evaluation)` | 評価データエクスポート | `const json = EvaluationCalculator.exportEvaluation(evaluation)` |
| `VERSION` | バージョン情報 | `console.log(EvaluationCalculator.VERSION)` |

#### ❌ 置き換えるべき古いパターン

```javascript
// ❌ 古いパターン（手動計算）
const sum = sessions.reduce((acc, s) => acc + s.averageError, 0);
const avgError = sum / sessions.length;
let grade;
if (avgError < 12) grade = 'Excellent';
else if (avgError < 25) grade = 'Good';
else if (avgError < 50) grade = 'Pass';
else grade = 'Practice';

// ✅ 推奨パターン（EvaluationCalculator使用）
const evaluation = EvaluationCalculator.calculateDynamicGrade(sessions);
const grade = evaluation.grade;
```

---

### 5. Lucide統一初期化（アイコン管理）
**ファイル**: `/PitchPro-SPA/js/lucide-init.js`
**役割**: Lucideアイコンの統一初期化、個別アイコン更新

#### 利用可能メソッド（2個）

| メソッド名 | 役割 | 使用例 |
|---|---|---|
| `window.initializeLucideIcons(options)` | 全アイコン一括初期化 | `window.initializeLucideIcons({ immediate: true, debug: false })` |
| `window.updateLucideIcon(target, iconName, attributes)` | 個別アイコン更新 | `window.updateLucideIcon('#my-icon', 'check-circle', { class: 'text-green-500' })` |

#### ❌ 置き換えるべき古いパターン

```javascript
// ❌ 古いパターン1（直接呼び出し）
lucide.createIcons();

// ❌ 古いパターン2（innerHTML with icon）
element.innerHTML = '<i data-lucide="check-circle"></i>';
lucide.createIcons();

// ❌ 古いパターン3（setAttribute）
const icon = document.createElement('i');
icon.setAttribute('data-lucide', 'check-circle');
element.appendChild(icon);
lucide.createIcons();

// ✅ 推奨パターン1（統一初期化）
window.initializeLucideIcons({ immediate: true });

// ✅ 推奨パターン2（個別更新）
window.updateLucideIcon('#my-icon', 'check-circle', { class: 'text-green-500' });
```

#### 🔍 Lucide過剰呼び出しの問題

**症状**: `initializeLucideIcons()`が1ファイル内で複数回呼ばれる
- results-overview-controller.js: **9回呼び出し**（89%削減可能）

**解決策**: ページ初期化の最後に**1回だけ**呼び出す

```javascript
// ❌ 悪い例（複数回呼び出し）
async function initResultsOverview() {
    updateHeader();
    window.initializeLucideIcons({ immediate: true }); // ❌

    updateStats();
    window.initializeLucideIcons({ immediate: true }); // ❌

    updateChart();
    window.initializeLucideIcons({ immediate: true }); // ❌
}

// ✅ 良い例（1回のみ呼び出し）
async function initResultsOverview() {
    updateHeader();
    updateStats();
    updateChart();

    // 最後に1回だけ呼び出し
    window.initializeLucideIcons({ immediate: true });
}
```

---

### 6. DataManager（データ管理統合）
**ファイル**: `/PitchPro-SPA/js/data-manager.js`
**役割**: localStorage統一管理、音域データ管理、セッション保存・取得

#### 主要メソッド（55個 - 一部抜粋）

| カテゴリ | メソッド名 | 役割 |
|---|---|---|
| **設定管理** | `getUserSettings()` | ユーザー設定取得 |
|  | `updateUserSettings(settings)` | ユーザー設定更新 |
|  | `initializeUserSettings()` | ユーザー設定初期化 |
| **音域管理** | `getVoiceRangeData()` | 音域データ取得 |
|  | `saveVoiceRangeData(data)` | 音域データ保存 |
|  | `clearVoiceRangeData()` | 音域データ削除 |
| **セッション管理** | `saveSessionResult(result)` | セッション結果保存 |
|  | `getSessionHistory(filters)` | セッション履歴取得 |
|  | `getLatestSession()` | 最新セッション取得 |
|  | `cleanupSessionData()` | 古いセッションデータ削除 |
| **評価管理** | `saveOverallEvaluation(evaluation)` | 総合評価保存 |
|  | `getOverallEvaluations()` | 総合評価一覧取得 |
|  | `getLatestEvaluation()` | 最新評価取得 |
| **データ分析** | `analyzeWeakIntervals(sessions)` | 弱点音程分析 |
|  | `generateUserStatistics()` | ユーザー統計生成 |
|  | `calculateSessionSummary(sessions)` | セッションサマリー計算 |
| **インポート/エクスポート** | `exportAllData()` | 全データエクスポート |
|  | `importData(data)` | データインポート |
|  | `downloadExportData()` | エクスポートデータダウンロード |
| **ストレージ管理** | `getStorageUsage()` | ストレージ使用量取得 |
|  | `checkStorageWarning()` | ストレージ警告チェック |
|  | `validateDataIntegrity()` | データ整合性検証 |
| **データリセット** | `resetAllData()` | 全データリセット |
|  | `resetTrainingData()` | トレーニングデータリセット |
|  | `resetVoiceRangeData()` | 音域データリセット |

---

### 7. NavigationManager（ナビゲーション管理）
**ファイル**: `/PitchPro-SPA/js/navigation-manager.js`
**役割**: ページ遷移管理、リロード検出、ブラウザバック防止

#### 主要メソッド（22個 - 一部抜粋）

| カテゴリ | メソッド名 | 役割 |
|---|---|---|
| **ナビゲーション** | `navigate(page, params)` | ページ遷移 |
|  | `safeNavigate(page, params)` | 安全なページ遷移（エラーハンドリング） |
|  | `navigateToTraining(mode, options)` | トレーニングページ遷移 |
| **リロード検出** | `detectReload()` | リロード検出・処理 |
|  | `setNormalTransition()` | 通常遷移フラグ設定 |
| **警告管理** | `enableNavigationWarning()` | ナビゲーション警告有効化 |
|  | `disableNavigationWarning()` | ナビゲーション警告無効化 |
| **ブラウザバック** | `preventBrowserBack()` | ブラウザバック防止 |
|  | `removeBrowserBackPrevention()` | ブラウザバック防止解除 |
| **オーディオ管理** | `registerAudioDetector(detector)` | AudioDetector登録 |
|  | `_destroyAudioDetector()` | AudioDetector破棄 |

---

### 8. SubscriptionManager（サブスクリプション管理）
**ファイル**: `/PitchPro-SPA/js/subscription-manager.js`
**役割**: プラン管理、モードアクセス制御、データ保持期間管理

#### 主要メソッド（20個 - 一部抜粋）

| カテゴリ | メソッド名 | 役割 |
|---|---|---|
| **プラン管理** | `getCurrentPlan()` | 現在のプラン取得 |
|  | `getPlanInfo()` | プラン情報取得 |
|  | `isPremiumActive()` | プレミアムアクティブ確認 |
| **アクセス制御** | `checkModeAccess(mode)` | モードアクセス権確認 |
|  | `filterSessionsByPlan(sessions)` | プラン別セッションフィルタリング |
| **データ保持** | `getDataRetentionDays()` | データ保持日数取得 |
|  | `getDataRetentionInfo()` | データ保持情報取得 |
|  | `shouldCleanupSessions(session)` | セッション削除判定 |
| **課金管理** | `upgradeToPremium()` | プレミアムアップグレード |
|  | `cancelSubscription()` | サブスクリプションキャンセル |
|  | `validateCoupon(code)` | クーポンコード検証 |

---

## 📖 実装時のベストプラクティス

### 1. **初期化は1回のみ**
```javascript
// ❌ 悪い例
function updateUI() {
    updateHeader();
    window.initializeLucideIcons({ immediate: true });
    updateStats();
    window.initializeLucideIcons({ immediate: true });
}

// ✅ 良い例
function updateUI() {
    updateHeader();
    updateStats();
    window.initializeLucideIcons({ immediate: true }); // 最後に1回
}
```

### 2. **統一メソッドを優先使用**
```javascript
// ❌ 悪い例（直接DOM操作）
document.getElementById('page-title').textContent = 'ランダム基音モード';

// ✅ 良い例（統一メソッド使用）
ModeController.updatePageHeader('random', { scaleDirection: 'ascending' });
```

### 3. **データ取得は統一マネージャー経由**
```javascript
// ❌ 悪い例（直接localStorage）
const sessions = JSON.parse(localStorage.getItem('training_sessions')) || [];

// ✅ 良い例（統一マネージャー使用）
const sessions = SessionDataManager.getAllSessions();
```

### 4. **ローディング状態の統一管理**
```javascript
// ❌ 悪い例（手動DOM操作）
document.getElementById('spinner').style.display = 'block';
fetchData().then(() => {
    document.getElementById('spinner').style.display = 'none';
});

// ✅ 良い例（LoadingComponent使用）
LoadingComponent.show('stats');
fetchData().then(() => {
    LoadingComponent.hide('stats');
});
```

---

## 🚨 既知の問題パターン

### 問題1: Lucide過剰初期化
**症状**: 1ファイル内で`initializeLucideIcons()`が複数回呼ばれる
**影響**: パフォーマンス低下、不要な再描画
**解決策**: 初期化の最後に1回のみ呼び出す

**発見箇所**:
- `/PitchPro-SPA/pages/js/results-overview-controller.js`: 9回（89%削減可能）

### 問題2: 直接lucide.createIcons()呼び出し
**症状**: 統一メソッドを使わず直接`lucide.createIcons()`を呼び出し
**影響**: 一貫性の欠如、Safari互換性問題のリスク
**解決策**: `window.initializeLucideIcons()`に置き換え

**発見箇所**:
- `/voice-range-test.js` (line 1331)
- `/preparation-pitchpro-cycle.js` (8箇所)
- `/result-session-controller.js` (2箇所)
- `/records-controller.js` (line 530)

### 問題3: ModeController未使用
**症状**: ページヘッダー更新を手動DOM操作で実装
**影響**: コードの重複、保守性の低下
**解決策**: `ModeController.updatePageHeader()`使用

### 問題4: LoadingComponent未使用
**症状**: ローディング表示を手動DOM操作で実装
**影響**: 一貫性の欠如、エラーハンドリングの不足
**解決策**: `LoadingComponent.show/hide()`使用

---

## 🔍 調査が必要な箇所

以下のファイルで統一メソッドが使われていない可能性があります：

### Lucide関連
- [ ] `/voice-range-test.js` - 直接lucide.createIcons()呼び出し
- [ ] `/preparation-pitchpro-cycle.js` - innerHTML with icon
- [ ] `/result-session-controller.js` - innerHTML with icon
- [ ] `/records-controller.js` - setAttribute data-lucide

### ModeController関連
- [ ] 全コントローラーファイル - ページヘッダー手動更新の確認

### LoadingComponent関連
- [ ] 全コントローラーファイル - 手動ローディング表示の確認

### SessionDataManager関連
- [ ] 全コントローラーファイル - 直接localStorage操作の確認

---

## 📝 更新履歴

| 日付 | バージョン | 変更内容 |
|---|---|---|
| 2025-11-16 | 1.0.0 | 初版作成、全統一コンポーネント・マネージャーのドキュメント化 |

---

## 🔗 関連ドキュメント

- `/PitchPro-SPA/docs/MODULE_ARCHITECTURE.md` - モジュールアーキテクチャ全体像
- `/PitchPro-SPA/docs/COMPONENTS_GUIDE.md` - コンポーネント使用ガイド
- `/CLAUDE.md` - 開発ガイドライン全般
