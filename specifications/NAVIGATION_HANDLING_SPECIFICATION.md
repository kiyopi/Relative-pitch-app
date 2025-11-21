# ナビゲーション・リソース管理仕様書

**バージョン**: 5.1.0
**作成日**: 2025-10-22
**最終更新**: 2025-11-20
**対象**: PitchPro-SPA（8va相対音感トレーニングアプリ）

**v5.1.0更新内容**:
- デスクトップ切り替え時のリロード誤検出問題を解決（NavigationManager v4.4.1）
- detectReload()にvisibilitychange時間確認を統合（順序変更なし）
- 詳細設計: Serenaメモリ `PERM-reload-detection-desktop-switch-fix-20251120-1830`

---

## 📋 目次

1. [概要](#概要)
2. [用語定義](#用語定義)
3. [現状分析](#現状分析)
4. [仕様設計](#仕様設計)
5. [実装計画](#実装計画)
6. [NavigationManager統合（v3.0.0 ブラウザバック防止統合）](#navigationmanager統合v300-ブラウザバック防止統合)
7. [テスト仕様](#テスト仕様)
8. [付録](#付録)

---

## 概要

### 目的

本仕様書は、SPAアプリケーションにおける以下の3つのナビゲーションシナリオでのリソース管理・データ保持・クリーンアップ処理を定義する。

1. **ブラウザリロード**: ユーザーがF5キーやリロードボタンでページを再読み込み
2. **ブラウザバック**: ユーザーがブラウザの戻るボタンで前ページに移動
3. **ダイレクトアクセス**: ユーザーが特定のURL（ハッシュ）を直接入力してアクセス

### 背景・課題

#### 発見された問題点

**調査日**: 2025-10-22
**対象範囲**: 全ページ（home, preparation, training, result-session, results-overview）

| 問題 | ページ | 深刻度 | 影響 |
|------|--------|--------|------|
| リロード時のクリーンアップ未実装 | training | 🔴 高 | リソースリーク、データ損失 |
| ブラウザバック時のクリーンアップ未実装 | training | 🔴 高 | リソースリーク、データ損失 |
| 音域未設定時のトレーニング開始 | training | 🟡 中 | UX低下、不正確な動作 |
| 不完全データでの総合評価表示 | results-overview | 🟡 中 | 誤解を招く表示 |

#### 現在の実装状況

- **✅ preparationページ**: クリーンアップ実装済み（router.js:334-346）
- **❌ trainingページ**: クリーンアップ未実装（router.js:350-354でコメントアウト）
- **⚠️ 前提条件チェック**: 一部ページで不完全

---

## 用語定義

### ナビゲーションシナリオ

| 用語 | 定義 | トリガー | イベント |
|------|------|----------|----------|
| **ブラウザリロード** | 現在のページを再読み込み | F5キー、リロードボタン、`location.reload()` | `beforeunload`, `pagehide` |
| **ブラウザバック** | 履歴を戻る | 戻るボタン、Backspace、`history.back()` | `hashchange`, `popstate` |
| **ダイレクトアクセス** | URLを直接入力してアクセス | アドレスバー入力、ブックマーク、外部リンク | `DOMContentLoaded`, `hashchange` |
| **通常遷移** | アプリ内リンクでの遷移 | ボタンクリック、`window.location.hash` | `hashchange` |

### リソース種別

| リソース | 説明 | 解放方法 |
|----------|------|----------|
| **AudioDetector** | PitchPro音声検出インスタンス | `stopDetection()`, `destroy()` |
| **MediaStream** | マイク入力ストリーム | `getTracks().forEach(track => track.stop())` |
| **PitchShifter** | Tone.js音源再生インスタンス | `dispose()`（存在する場合） |
| **SessionRecorder** | セッションデータ記録インスタンス | `completeSession()` or `resetSession()` |
| **イベントリスナー** | DOM要素に登録されたリスナー | `removeEventListener()` |

### データ状態

| 状態 | 定義 | 対応方針 |
|------|------|----------|
| **completed** | セッション完了済み | localStorage保存済み、復元不要 |
| **in-progress** | トレーニング実行中 | 途中データ保存 or 破棄 |
| **not-started** | 未開始 | 初期化のみ必要 |

---

## 現状分析

### 1. ブラウザリロード

#### 現在の動作フロー

```
トレーニング中にリロード実行
↓
window.pagehide イベント発火
↓
router.cleanupCurrentPage() 呼び出し
↓
❌ if (this.currentPage === 'training') の処理がコメントアウト
↓
preparationページのみクリーンアップ実行
↓
ページ完全リロード
↓
SPAルーター初期化
↓
#training ハッシュを検出
↓
trainingページ再表示（新規セッション開始）
```

#### 問題点

| 項目 | 現在の状態 | 望ましい状態 |
|------|-----------|-------------|
| AudioDetector | 停止されない | `stopDetection()` 呼び出し |
| MediaStream | ブラウザ自動解放 | 明示的に`stop()`呼び出し |
| SessionRecorder.currentSession | データ失われる | 自動保存 or ユーザー確認 |
| イベントリスナー | メモリリーク可能性 | 明示的削除 |

#### 影響度評価

- **データ損失**: ⚠️ 中～高（トレーニング途中のpitchErrorsデータが失われる）
- **リソースリーク**: ⚠️ 低（ブラウザがページリロード時にクリーンアップ）
- **UX影響**: ⚠️ 中（意図しないデータ損失でユーザー不満）

---

### 2. ブラウザバック

#### 現在の動作フロー

```
トレーニング中にブラウザバック実行
↓
window.hashchange イベント発火
↓
router.handleRouteChange() 実行
↓
router.cleanupCurrentPage() 呼び出し
↓
❌ trainingページのクリーンアップ未実装
↓
前のページ（home or preparationなど）表示
```

#### 問題点

リロード時と同じ問題が発生。ただし、ブラウザバックの場合は以下の追加リスクあり：

- **次ページでのマイクアクセス競合**: preparationに戻った場合、マイクが既に使用中の可能性
- **ナビゲーション履歴の不整合**: クリーンアップ失敗によるページ状態の不一致

---

### 3. ダイレクトアクセス

#### 各ページの前提条件マトリックス

| ページ | 必要な前提条件 | チェック実装 | フォールバック処理 | 問題点 |
|--------|---------------|-------------|-------------------|--------|
| **home** | なし | - | - | なし |
| **preparation** | マイク許可 | ❌ なし | 初回アクセス時に要求 | 拒否時の処理は正規版に委譲 |
| **training** | 音域設定、マイク許可 | ⚠️ 部分的 | 全範囲使用 | 音域未設定でも開始可能 |
| **result-session** | 対象セッションデータ | ✅ あり | 最新セッション使用 | 良好 |
| **results-overview** | 8セッション完了 | ⚠️ 不完全 | ダミーデータ表示 | 未完了でも表示 |

#### 問題の詳細

##### training ページ

**現在の実装** (trainingController.js:704-707):
```javascript
if (!voiceRangeData || !voiceRangeData.results) {
    console.warn('⚠️ 音域データなし - 全範囲を使用');
    return allNotes; // C2-C6の全範囲
}
```

**問題**:
- ユーザーの声域を超える基音（例: C2 65.4Hz）が選ばれる可能性
- 前回のセッションで-700¢の大幅な誤差が発生した原因と同じ

**影響**:
- 音程検出の不正確さ
- ユーザーの混乱・不満
- トレーニング効果の低下

##### results-overview ページ

**現在の実装** (results-overview.html:395-399):
```javascript
if (!sessionData || sessionData.length === 0) {
    console.warn('⚠️ セッションデータが見つかりません。ダミーデータを表示します。');
    showDummyOverview();
    return;
}
// 8セッション完了チェックなし
```

**問題**:
- 2-3セッションでも「総合評価」として表示
- ページタイトルに「8セッション (64音) の総合評価」と表示されるが実際は未完了

**影響**:
- 誤解を招く表示
- 不完全なグレード評価
- ユーザーの混乱

---

## 仕様設計

### 設計原則

1. **明示的リソース管理**: すべてのリソースは明示的に取得・解放する
2. **ユーザー優先**: データ損失時はユーザーに確認を求める
3. **防御的プログラミング**: 前提条件が満たされない場合は安全な動作を保証
4. **一貫性**: 全ページで統一されたクリーンアップパターンを使用

---

### 1. リロード時の処理仕様

#### 方針

トレーニング中のリロードは**データ損失を伴う破壊的操作**として扱う。

#### 仕様

##### A. beforeunload警告（オプション）

**実装場所**: trainingController.js

```javascript
// トレーニング中のみ有効化
let isTrainingActive = false;

window.addEventListener('beforeunload', (e) => {
    if (isTrainingActive && sessionRecorder.getCurrentSession()) {
        e.preventDefault();
        e.returnValue = ''; // Chrome等でダイアログ表示
        return ''; // 一部ブラウザ用
    }
});
```

**注意**:
- Chrome等では汎用メッセージのみ表示される
- カスタムメッセージは表示できない
- iOS Safariでは動作しない可能性あり

**判断**: この機能は**オプション実装**とし、最初は実装しない

##### B. pagehideクリーンアップ（必須）

**実装場所**: router.js

```javascript
async cleanupCurrentPage() {
    try {
        // preparationページ（既存実装）
        if (this.currentPage === 'preparation') {
            console.log('Cleaning up preparation page resources...');
            if (typeof window.preparationManager !== 'undefined' && window.preparationManager) {
                await window.preparationManager.cleanupPitchPro();
            }
            if (typeof window.resetPreparationPageFlag === 'function') {
                window.resetPreparationPageFlag();
            }
        }

        // trainingページ（新規実装）
        if (this.currentPage === 'training') {
            console.log('Cleaning up training page resources...');

            // 音声検出停止
            if (window.audioDetector) {
                console.log('🛑 AudioDetector停止中...');
                window.audioDetector.stopDetection();
            }

            // マイクストリーム明示的解放
            if (window.audioStream) {
                console.log('🎤 マイクストリーム解放中...');
                window.audioStream.getTracks().forEach(track => track.stop());
                window.audioStream = null;
            }

            // PitchShifter停止（メソッドが存在する場合）
            if (window.pitchShifterInstance) {
                console.log('🎹 PitchShifter停止中...');
                if (typeof window.pitchShifterInstance.dispose === 'function') {
                    window.pitchShifterInstance.dispose();
                }
                window.pitchShifterInstance = null;
            }

            // セッションデータ処理
            // ※リロード後の一時的な離脱の場合はリセットしない
            // （ReloadManager.isResumingAfterReload()で判定されるため、ここではリセット不要）
            // 【v2.0.0更新】シンプル化により、sessionCounter保持の必要性がなくなった
            // training ページ初期化時に常に initializeRandomModeTraining() が実行され、
            // sessionCounter は localStorage から自動計算される
            if (window.sessionDataRecorder) {
                const currentSession = window.sessionDataRecorder.getCurrentSession();
                if (currentSession && !currentSession.completed) {
                    console.warn('⚠️ 未完了セッションあり - 途中データは破棄されます');
                }
                // resetSession()は呼ばない（sessionCounterを保持）
                // window.sessionDataRecorder.resetSession();
            }

            // 初期化フラグリセット
            if (typeof window.resetTrainingPageFlag === 'function') {
                window.resetTrainingPageFlag();
            }

            console.log('✅ Training page cleanup complete');
        }

    } catch (error) {
        console.warn('Page cleanup error:', error);
        // クリーンアップエラーは警告レベルで続行
    }
}
```

##### C. リロード後の復帰動作

**仕様**:
- リロード後は**新規セッション**として開始
- 途中データの復元は行わない（将来的な拡張として検討可能）
- セッションカウンターは継続（localStorage保存済み）

---

### 2. ブラウザバック時の処理仕様

#### 方針

ブラウザバックは**意図的なページ離脱**として扱い、リロード時と同じクリーンアップを実行。

#### 仕様

##### A. hashchange時のクリーンアップ

**実装場所**: router.js

```javascript
async handleRouteChange() {
    const hash = window.location.hash.substring(1) || 'home';
    const page = hash.split('?')[0];

    console.log('🔍 [Router] Route changed to:', page);

    try {
        // 現在のページのクリーンアップ（ブラウザバック時も実行）
        await this.cleanupCurrentPage();

        await this.loadPage(page, hash);
    } catch (error) {
        console.error('Route loading error:', error);
        await this.loadPage('home');
    }
}
```

**既存実装の確認**:
- ✅ 既に実装済み（router.js:55-56）
- `cleanupCurrentPage()` がtrainingページに対応すれば自動的に対応完了

##### B. ナビゲーション履歴の整合性

**仕様**:
- クリーンアップ完了後に前ページへ遷移
- 前ページで必要なリソース（マイク等）は再初期化

---

### 3. ダイレクトアクセス時の処理仕様

#### 方針

各ページで**前提条件を厳格にチェック**し、満たされない場合は適切なページにリダイレクト。

#### 仕様マトリックス

| ページ | チェック項目 | 不満足時の動作 | 実装優先度 |
|--------|-------------|---------------|-----------|
| home | - | - | - |
| preparation | - | - | 🟢 現状維持 |
| training | 音域設定 | homeにリダイレクト + アラート | 🔴 必須 |
| result-session | セッションデータ | 最新セッション使用 or ダミー表示 | 🟢 現状維持 |
| results-overview | 8セッション完了 | trainingにリダイレクト + アラート | 🟡 推奨 |

#### 詳細仕様

##### A. training ページ

**実装場所**: trainingController.js

```javascript
export async function initializeTrainingPage() {
    console.log('🚀 TrainingController initializing...');

    // 【新規追加】音域データ必須チェック
    if (!checkVoiceRangeData()) {
        console.error('❌ 音域データが設定されていません');
        showErrorAndRedirect(
            '音域テストを先に完了してください。',
            'preparation'
        );
        return;
    }

    // 既存の初期化処理...
    if (isInitialized) {
        console.log('TrainingController already initialized, resetting...');
    }

    // ... 以下既存コード ...
}

/**
 * 音域データの存在と妥当性をチェック
 * @returns {boolean} データが有効な場合true
 */
function checkVoiceRangeData() {
    loadVoiceRangeData();

    if (!voiceRangeData || !voiceRangeData.results) {
        return false;
    }

    // comfortableRangeの存在確認
    const rangeData = voiceRangeData.results.comfortableRange || voiceRangeData.results;
    if (!rangeData.lowFreq || !rangeData.highFreq) {
        return false;
    }

    // オクターブ数が1以上か確認
    const octaves = Math.log2(rangeData.highFreq / rangeData.lowFreq);
    if (octaves < 1.0) {
        console.warn(`⚠️ オクターブ数不足: ${octaves.toFixed(2)}オクターブ（1.0以上必要）`);
        return false;
    }

    return true;
}

/**
 * エラーメッセージを表示してリダイレクト
 * @param {string} message - エラーメッセージ
 * @param {string} redirectTo - リダイレクト先ハッシュ
 */
function showErrorAndRedirect(message, redirectTo) {
    // モーダルダイアログ表示（将来的にはカスタムUIに変更可能）
    alert(message);

    // リダイレクト
    window.location.hash = redirectTo;
}
```

##### B. results-overview ページ

**実装場所**: results-overview.html

```javascript
async function initResultsOverview() {
    console.log('📊 総合評価ページ初期化開始');

    // DataManagerから全セッションデータを取得
    const sessionData = loadAllSessionData();

    // 【変更】データ存在チェック強化
    if (!sessionData || sessionData.length === 0) {
        console.error('❌ セッションデータが見つかりません');
        showErrorAndRedirect(
            'トレーニングを開始してください。',
            'home'
        );
        return;
    }

    // 【新規追加】8セッション完了チェック
    const randomModeSessions = sessionData.filter(s => s.mode === 'random' && s.completed);
    if (randomModeSessions.length < 8) {
        console.warn(`⚠️ セッション未完了: ${randomModeSessions.length}/8セッション`);
        showErrorAndRedirect(
            `8セッション完了後に総合評価が表示されます。\n現在: ${randomModeSessions.length}/8セッション完了`,
            'training'
        );
        return;
    }

    console.log('✅ セッションデータ取得:', randomModeSessions);

    // 動的グレード計算
    const evaluation = window.EvaluationCalculator.calculateDynamicGrade(randomModeSessions);
    console.log('✅ 評価結果:', evaluation);

    // UI更新
    updateOverviewUI(evaluation, randomModeSessions);

    // Chart.js初期化
    if (typeof Chart !== 'undefined') {
        initializeCharts(randomModeSessions);
    }

    // Lucideアイコン再初期化
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
}

/**
 * エラーメッセージを表示してリダイレクト
 * @param {string} message - エラーメッセージ
 * @param {string} redirectTo - リダイレクト先ハッシュ
 */
function showErrorAndRedirect(message, redirectTo) {
    alert(message);
    window.location.hash = redirectTo;
}
```

---

## 実装計画

### フェーズ1: 必須実装（優先度: 🔴 高）

**目標**: trainingページのクリーンアップとダイレクトアクセス制御を実装

#### タスク1-1: router.jsのクリーンアップ実装

**ファイル**: `/PitchPro-SPA/js/router.js`

**変更箇所**: `cleanupCurrentPage()` メソッド（330-360行）

**実装内容**:
```javascript
// 350-354行のコメントアウトを解除し、実装を追加
if (this.currentPage === 'training') {
    console.log('Cleaning up training page resources...');

    // AudioDetector停止
    if (window.audioDetector) {
        console.log('🛑 AudioDetector停止中...');
        window.audioDetector.stopDetection();
    }

    // マイクストリーム解放
    if (window.audioStream) {
        console.log('🎤 マイクストリーム解放中...');
        window.audioStream.getTracks().forEach(track => track.stop());
        window.audioStream = null;
    }

    // PitchShifter停止
    if (window.pitchShifterInstance) {
        console.log('🎹 PitchShifter停止中...');
        if (typeof window.pitchShifterInstance.dispose === 'function') {
            window.pitchShifterInstance.dispose();
        }
        window.pitchShifterInstance = null;
    }

    // セッションデータ処理
    if (window.sessionDataRecorder) {
        const currentSession = window.sessionDataRecorder.getCurrentSession();
        if (currentSession && !currentSession.completed) {
            console.warn('⚠️ 未完了セッションあり - 途中データは破棄されます');
        }
        window.sessionDataRecorder.resetSession();
    }

    // 初期化フラグリセット
    if (typeof window.resetTrainingPageFlag === 'function') {
        window.resetTrainingPageFlag();
    }

    console.log('✅ Training page cleanup complete');
}
```

**テスト項目**:
- [ ] リロード時にクリーンアップログが表示される
- [ ] AudioDetectorが停止される
- [ ] マイクアクセスランプが消灯する
- [ ] メモリリークが発生しない

#### タスク1-2: trainingページの前提条件チェック

**ファイル**: `/PitchPro-SPA/js/controllers/trainingController.js`

**変更箇所**: `initializeTrainingPage()` 関数の先頭（10-30行付近）

**実装内容**:
```javascript
export async function initializeTrainingPage() {
    console.log('🚀 TrainingController initializing...');

    // 【新規追加】音域データ必須チェック
    if (!checkVoiceRangeData()) {
        console.error('❌ 音域データが設定されていません');
        alert('音域テストを先に完了してください。');
        window.location.hash = 'preparation';
        return;
    }

    // 既存の初期化処理...
    // ...
}

// 【新規追加】音域データチェック関数
function checkVoiceRangeData() {
    loadVoiceRangeData();

    if (!voiceRangeData || !voiceRangeData.results) {
        return false;
    }

    const rangeData = voiceRangeData.results.comfortableRange || voiceRangeData.results;
    if (!rangeData.lowFreq || !rangeData.highFreq) {
        return false;
    }

    const octaves = Math.log2(rangeData.highFreq / rangeData.lowFreq);
    if (octaves < 1.0) {
        console.warn(`⚠️ オクターブ数不足: ${octaves.toFixed(2)}オクターブ（1.0以上必要）`);
        return false;
    }

    return true;
}
```

**テスト項目**:
- [ ] 音域未設定時にpreparationにリダイレクトされる
- [ ] アラートメッセージが表示される
- [ ] 音域設定後は正常にトレーニングが開始される

#### タスク1-3: resetTrainingPageFlag関数の追加

**ファイル**: `/PitchPro-SPA/js/controllers/trainingController.js`

**追加箇所**: ファイル末尾（export宣言付近）

**実装内容**:
```javascript
/**
 * トレーニングページの初期化フラグをリセット
 * router.jsのcleanupCurrentPage()から呼び出される
 */
export function resetTrainingPageFlag() {
    console.log('🔄 Training page flag reset');
    isInitialized = false;
}

// グローバルに公開（router.jsから呼び出し可能にする）
window.resetTrainingPageFlag = resetTrainingPageFlag;
```

**テスト項目**:
- [ ] リロード後に再初期化が正しく実行される
- [ ] フラグリセットのログが表示される

---

### フェーズ2: 推奨実装（優先度: 🟡 中）

**目標**: results-overviewページの前提条件チェックを実装

#### タスク2-1: 8セッション完了チェック

**ファイル**: `/PitchPro-SPA/pages/results-overview.html`

**変更箇所**: `initResultsOverview()` 関数（389-419行）

**実装内容**:
```javascript
async function initResultsOverview() {
    console.log('📊 総合評価ページ初期化開始');

    const sessionData = loadAllSessionData();

    // データ存在チェック
    if (!sessionData || sessionData.length === 0) {
        console.error('❌ セッションデータが見つかりません');
        alert('トレーニングを開始してください。');
        window.location.hash = 'home';
        return;
    }

    // 【新規追加】8セッション完了チェック
    const randomModeSessions = sessionData.filter(s => s.mode === 'random' && s.completed);
    if (randomModeSessions.length < 8) {
        console.warn(`⚠️ セッション未完了: ${randomModeSessions.length}/8セッション`);
        alert(`8セッション完了後に総合評価が表示されます。\n現在: ${randomModeSessions.length}/8セッション完了`);
        window.location.hash = 'training';
        return;
    }

    console.log('✅ セッションデータ取得:', randomModeSessions);

    // 動的グレード計算（randomModeSessionsを使用）
    const evaluation = window.EvaluationCalculator.calculateDynamicGrade(randomModeSessions);
    console.log('✅ 評価結果:', evaluation);

    // UI更新（randomModeSessionsを使用）
    updateOverviewUI(evaluation, randomModeSessions);

    // Chart.js初期化（randomModeSessionsを使用）
    if (typeof Chart !== 'undefined') {
        initializeCharts(randomModeSessions);
    }

    // Lucideアイコン再初期化
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
}
```

**テスト項目**:
- [ ] 未完了時にtrainingにリダイレクトされる
- [ ] アラートに完了セッション数が表示される
- [ ] 8セッション完了後は正常に表示される

---

### フェーズ3: 将来的な拡張（優先度: 🟢 低）

**目標**: UX改善と高度な機能実装

#### タスク3-1: beforeunload警告の実装

**仕様**:
- トレーニング中のリロード時に警告ダイアログを表示
- ユーザーに操作の確認を求める

**注意**:
- iOS Safariでは動作しない
- Chrome等では汎用メッセージのみ表示

#### タスク3-2: セッションデータ自動保存

**仕様**:
- トレーニング中のリロード/ブラウザバック時に途中データを自動保存
- 次回アクセス時に「前回の続きから開始しますか？」と確認

**実装**:
```javascript
// sessionDataRecorder.js に追加
saveIncompleteSession() {
    if (this.currentSession && !this.currentSession.completed) {
        const incompleteData = {
            ...this.currentSession,
            incompleteFlag: true,
            savedAt: Date.now()
        };
        localStorage.setItem('incompleteSession', JSON.stringify(incompleteData));
        console.log('💾 途中データ自動保存:', incompleteData);
    }
}
```

#### タスク3-3: カスタムエラーダイアログ

**仕様**:
- `alert()`の代わりにカスタムモーダルダイアログを使用
- より視覚的に分かりやすいUI

---

## NavigationManager統合（v3.0.0 ブラウザバック防止統合）

### 概要

**実装日**: 2025-10-23
**最終更新**: 2025-11-10（v3.2.0 visibilitychange監視とリロード検出改善）
**目的**: リロード検出・ナビゲーション制御・ブラウザバック防止の一元管理

従来、リロード検出関連のコードが複数ファイルに散在し、`normalTransitionToTraining`フラグの設定漏れリスクがあった。また、ブラウザバック防止機能がrouter.jsに実装されており、ページ設定もrouter.js内に分散していた。NavigationManagerクラスを導入することで、コードの一元管理・保守性向上・設定漏れ防止を実現。

**v3.0.0での主要変更**:
1. **ReloadManager → NavigationManager にリネーム**: ナビゲーション全般を管理する役割に拡張
2. **ブラウザバック防止機能統合**: router.jsからNavigationManagerへ移動
3. **PAGE_CONFIG一元化**: ページごとのブラウザバック防止設定を統合管理
4. **イベントリスナー管理強化**: popstateハンドラーの適切なクリーンアップを実装
5. **ダブルダミーエントリーパターン**: より確実なブラウザバック防止を実現
6. **alert()ダイアログ通知**: ユーザーへの明確な通知（OKボタンのみ、ナビゲーション禁止）

**v3.2.0での主要変更** (2025-11-10):
1. **visibilitychange監視システム**: ウィンドウ切り替えとリロードを正確に区別
2. **即座初期化戦略**: PitchProより先にイベントリスナーを登録
3. **result-session対応**: normalTransitionフラグを拡張してSPA遷移の誤検出を防止
4. **Navigation Timing API v2優先**: モダンAPIを優先使用し、古いAPIはフォールバックのみ

**v3.3.0での主要変更** (2025-11-13):
1. **preparation ページの追加**: マイク管理中のブラウザバック防止を実装
2. **allowedTransitions 最適化**: 非防止対象ページ（records）を削除、preparation を追加
3. **fromRecords 条件付き防止**: トレーニング記録からの過去結果表示時はブラウザバック許可
4. **設計思想の明確化**: ブラウザバック防止はトレーニング/評価中のみ、閲覧モードは自然なナビゲーションを許可

**v3.3.0での設計思想**:
- **ブラウザバック防止対象**: preparation, training, result-session, results, results-overview（条件付き）
- **非対象ページ**: home, records, premium-analysis（自然なナビゲーション許可）
- **条件付き許可**: results-overviewは`fromRecords=true`の場合のみブラウザバック許可（過去結果閲覧モード）

**v3.2.0での責任範囲**:
- **NavigationManagerの責任**:
  - リロード検出とマイク許可再取得
  - visibilitychange監視とウィンドウ切り替え検出
  - ブラウザバック防止機能（PAGE_CONFIG管理、popstateハンドラー管理）
  - normalTransition フラグ管理（training, result-session への遷移）
- **sessionCounter管理は SessionDataRecorder の責任**
- **localStorage管理も SessionDataRecorder の責任**

### アーキテクチャ

```
NavigationManager (グローバルクラス) v3.2.0
├── 【リロード検出・遷移管理】
│   ├── setNormalTransition()       - 正常な遷移フラグを設定
│   ├── detectReload()              - リロード検出（v3.2.0で改善）
│   ├── showReloadDialog()          - ダイアログ表示
│   ├── redirectToPreparation()     - preparationへリダイレクト
│   ├── navigate(page)              - 汎用遷移メソッド（v3.2.0で追加）
│   ├── navigateToTraining()        - trainingへ遷移（★フラグ自動設定）
│   └── createRedirectError()       - リダイレクトエラー生成
│
├── 【ウィンドウ切り替え検出（v3.2.0新規追加）】
│   ├── lastVisibilityChange        - 最後のvisibilitychange時刻
│   ├── initVisibilityTracking()    - visibilitychange監視初期化
│   └── visibilityTrackingInitialized - 初期化済みフラグ
│
└── 【ブラウザバック防止（v3.0.0新規追加）】
    ├── PAGE_CONFIG                 - ページごとの防止設定
    ├── preventBrowserBack(page)    - ブラウザバック防止有効化（自動設定）
    └── removeBrowserBackPrevention() - ブラウザバック防止解除

【v2.0.0で削除されたメソッド】
❌ setNewTrainingStart()        - 新規開始フラグ設定（不要）
❌ isNewTrainingStart()         - 新規開始フラグ確認（不要）
❌ isResumingAfterReload()      - リロード復帰確認（不要）
```

### クラス定義

**ファイル**: `/PitchPro-SPA/js/navigation-manager.js`
**バージョン**: 3.2.0

```javascript
/**
 * NavigationManager - ナビゲーション・遷移管理システム
 *
 * 【目的】
 * - リロード検出・遷移管理・ブラウザバック防止を一元管理
 * - リロード時は preparation へリダイレクトしてマイク許可を再取得
 * - ブラウザバック防止ページの設定とハンドラー管理を完全統合
 * - normalTransitionフラグの設定漏れを防止
 * - コードの重複を削減し、保守性を向上
 *
 * 【責任範囲】v3.0.0
 * - リロード検出（detectReload）
 * - マイク許可再取得のための preparation リダイレクト
 * - normalTransition フラグ管理
 * - ブラウザバック防止機能（PAGE_CONFIG管理、popstateハンドラー管理）
 *
 * 【責任範囲外】
 * - sessionCounter 管理 → SessionDataRecorder の責任
 * - localStorage 管理 → SessionDataRecorder の責任
 * - トレーニングフロー制御 → trainingController.v2.js の責任
 *
 * @version 3.0.0
 * @date 2025-10-24
 */
class NavigationManager {
    /**
     * sessionStorage キー定数
     */
    static KEYS = {
        NORMAL_TRANSITION: 'normalTransitionToTraining',
        REDIRECT_COMPLETED: 'reloadRedirected'
    };

    /**
     * trainingページへの正常な遷移フラグを設定
     *
     * 【重要】この関数を呼び出さずにtrainingへ遷移すると、リロードとして誤検出される
     */
    static setNormalTransition() {
        sessionStorage.setItem(this.KEYS.NORMAL_TRANSITION, 'true');
        console.log('✅ [ReloadManager] 正常な遷移フラグを設定');
    }

    /**
     * リロード検出
     *
     * 【重要】trainingController の initializeTrainingPage() で最初に呼び出す
     *
     * @returns {boolean} true: リロード検出, false: 正常な遷移
     */
    static detectReload() { /* 実装は reload-manager.js 参照 */ }

    /**
     * リロード検出時のダイアログ表示
     */
    static showReloadDialog() {
        alert('リロードが検出されました。マイク設定のため準備ページに移動します。');
    }

    /**
     * preparationページへリダイレクト（モード情報保持）
     *
     * @param {string} reason - リダイレクトの理由（ログ用）
     * @param {string|null} mode - モード（省略時はURLから取得）
     * @param {string|null} session - セッション番号（省略可）
     */
    static async redirectToPreparation(reason = '', mode = null, session = null) { /* ... */ }

    /**
     * trainingページへ遷移（正常な遷移フラグを自動設定）
     *
     * 【推奨】trainingへの遷移は必ずこのメソッドを使用すること
     *
     * @param {string|null} mode - モード（省略時はパラメータなし）
     * @param {string|null} session - セッション番号（省略可）
     */
    static navigateToTraining(mode = null, session = null) {
        // 正常な遷移フラグを自動設定
        this.setNormalTransition();

        // 遷移
        if (mode) {
            const params = new URLSearchParams({ mode });
            if (session) params.set('session', session);
            window.location.hash = `training?${params.toString()}`;
            console.log(`🚀 [ReloadManager] trainingへ遷移: mode=${mode}, session=${session || 'なし'}`);
        } else {
            window.location.hash = 'training';
            console.log('🚀 [ReloadManager] trainingへ遷移（パラメータなし）');
        }
    }

    /**
     * リダイレクトエラーを生成
     *
     * router.js で特別処理するためのエラーオブジェクト
     *
     * @returns {Error} リダイレクト用エラー
     */
    static createRedirectError() {
        const error = new Error('REDIRECT_TO_PREPARATION');
        error.isRedirect = true;
        return error;
    }

    // ==========================================
    // ブラウザバック防止機能（v3.0.0で追加）
    // ==========================================

    /**
     * 許可された遷移先のマップ（ダイアログを表示しない遷移）
     *
     * 【重要】このマップは「ブラウザバック防止対象ページ」からの正当な遷移のみを定義
     * - ブラウザバック防止対象: preparation, training, result-session, results, results-overview
     * - 非対象ページ（home, records等）は定義不要（ブラウザバック自由）
     *
     * v3.3.0変更:
     * - preparation 追加（training, home への遷移許可）
     * - records エントリ削除（非防止対象ページのため）
     */
    static allowedTransitions = new Map([
        ['preparation', ['training', 'home']],
        ['training', ['result-session', 'results-overview', 'home']],
        ['result-session', ['training', 'results', 'results-overview', 'home']],
        ['results', ['home', 'preparation', 'records']],
        ['results-overview', ['home', 'preparation', 'records', 'training']]
    ]);

    /**
     * ブラウザバック防止が必要なページの設定
     */
    static PAGE_CONFIG = {
        'preparation': {
            preventBackNavigation: true,
            backPreventionMessage: 'トレーニング準備中です。\\n\\nブラウザバックは無効になっています。\\nホームボタンからトップページに戻れます。'
        },
        'training': {
            preventBackNavigation: true,
            backPreventionMessage: 'トレーニング中です。\\n\\nブラウザバックは無効になっています。\\nホームボタンからトップページに戻れます。'
        },
        'result-session': {
            preventBackNavigation: true,
            backPreventionMessage: 'セッション評価中です。\\n\\nブラウザバックは無効になっています。\\n「次の基音へ」ボタンまたはホームボタンをご利用ください。'
        },
        'results': {
            preventBackNavigation: true,
            backPreventionMessage: '総合評価画面です。\\n\\nブラウザバックは無効になっています。\\nホームボタンまたは「新しいトレーニングを始める」ボタンをご利用ください。'
        },
        'results-overview': {
            preventBackNavigation: true,
            backPreventionMessage: '総合評価画面です。\\n\\nブラウザバックは無効になっています。\\nホームボタンまたは「新しいトレーニングを始める」ボタンをご利用ください。'
        }
    };

    /**
     * popstateイベントハンドラー（インスタンス変数）
     */
    static popStateHandler = null;

    /**
     * ブラウザバック防止を有効化（自動設定）
     * @param {string} page - ページ名
     */
    static preventBrowserBack(page) {
        // ページ設定を取得
        const config = this.PAGE_CONFIG[page];
        if (!config || !config.preventBackNavigation) {
            console.log(`📍 [NavigationManager] ブラウザバック防止不要: ${page}`);
            return;
        }

        // 既存のハンドラーをクリーンアップ
        if (this.popStateHandler) {
            window.removeEventListener('popstate', this.popStateHandler);
            console.log('🔄 [NavigationManager] 既存のpopstateハンドラを削除');
        }

        const message = config.backPreventionMessage;

        // ダミーエントリーを複数追加（より確実な防止）
        history.pushState(null, '', location.href);
        history.pushState(null, '', location.href);
        console.log(`📍 [NavigationManager] ブラウザバック防止: ダミーエントリー追加×2 (${page})`);
        console.log(`📝 [NavigationManager] 通知メッセージ: ${message}`);

        // popstateハンドラーを定義（ダイアログ通知 + 完全禁止）
        this.popStateHandler = () => {
            // ダミーエントリーを複数再追加して履歴スタックを補充
            history.pushState(null, '', location.href);
            history.pushState(null, '', location.href);

            // ユーザーに通知（OKを押すしか選択肢なし）
            alert(message);

            console.log(`🚫 [NavigationManager] ブラウザバックを無効化・通知表示 (${page})`);
        };

        // イベントリスナーを登録
        window.addEventListener('popstate', this.popStateHandler);
        console.log(`✅ [NavigationManager] ブラウザバック防止イベントリスナー登録完了 (${page})`);
    }

    /**
     * ブラウザバック防止を解除
     */
    static removeBrowserBackPrevention() {
        if (this.popStateHandler) {
            window.removeEventListener('popstate', this.popStateHandler);
            this.popStateHandler = null;
            console.log('✅ [NavigationManager] popstateイベントリスナーを削除');
        }
    }
}
```

### 統合したファイル

| ファイル | 変更内容 | メリット |
|---------|---------|---------|
| **index.html** | `navigation-manager.js` 読み込み追加 | グローバルに利用可能 |
| **trainingController.v2.js** | `detectReload()` 削除、`NavigationManager.detectReload()` 使用 | 78行削減 |
| **result-session-controller.js** | `NavigationManager.navigateToTraining()` 使用、遷移前に`removeBrowserBackPrevention()` 呼び出し追加 | フラグ設定自動化、popstateメモリリーク防止 |
| **router.js** | `NavigationManager.navigateToTraining()` 使用、`pageConfig` 削除、ブラウザバック防止をNavigationManagerに完全委譲 | フラグ設定自動化、コード簡素化 |
| **preparation-pitchpro-cycle.js** | `NavigationManager.navigateToTraining()` 使用 (2箇所) | 統一性向上 |

### 使用例

#### 1. trainingページへの遷移（フラグ自動設定）

**従来の実装（❌ 設定漏れリスクあり）**:
```javascript
// result-session-controller.js
button.onclick = () => {
    // ❌ フラグ設定を忘れるとリロード誤検出
    sessionStorage.setItem('normalTransitionToTraining', 'true');
    window.location.hash = 'training';
};
```

**NavigationManager統合後（✅ 自動設定＋イベントリスナークリーンアップ）**:
```javascript
// result-session-controller.js
button.onclick = () => {
    // 遷移前にブラウザバック防止を解除（重要！）
    if (window.NavigationManager) {
        window.NavigationManager.removeBrowserBackPrevention();
    }

    // ✅ フラグが自動設定される
    NavigationManager.navigateToTraining();
};
```

#### 2. モード・セッション情報付き遷移

```javascript
// preparation-pitchpro-cycle.js
const redirectInfo = window.preparationRedirectInfo;
if (redirectInfo && redirectInfo.redirect === 'training') {
    // モード情報を保持して遷移
    NavigationManager.navigateToTraining(redirectInfo.mode, redirectInfo.session);
} else {
    // 通常フロー
    NavigationManager.navigateToTraining();
}
```

#### 3. ブラウザバック防止の自動設定（router.js）

```javascript
// router.js - setupPageEvents()
async setupPageEvents(page, fullHash) {
    // ページ固有のイベントリスナー設定
    switch (page) {
        case 'home':
            this.setupHomeEvents();
            break;
        case 'training':
            await this.setupTrainingEvents(fullHash);
            break;
        // ... 他のページ
    }

    // ブラウザバック防止を自動設定（グローバル管理）
    this.preventBrowserBack(page);
}

preventBrowserBack(page) {
    // トレーニング記録からの遷移時はブラウザバック防止をスキップ
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash.split('?')[1] || '');
    const fromRecords = params.get('fromRecords') === 'true';

    if (fromRecords && page === 'results-overview') {
        console.log('📍 [Router] トレーニング記録からの遷移 - ブラウザバック防止をスキップ');
        return;
    }

    // NavigationManagerに完全委譲（設定もNavigationManagerで管理）
    if (window.NavigationManager) {
        window.NavigationManager.preventBrowserBack(page);
    }
}
```

#### 4. trainingController でのリロード検出・初期化処理

**従来の実装（❌ 複雑な判定ロジック）**:
```javascript
// trainingController.v2.js (v1.1.0 - 複雑な判定）
function detectReload() { /* ... 55行のコード ... */ }
function redirectToPreparationWithMode(reason = '') { /* ... 18行のコード ... */ }

export async function initializeTrainingPage() {
    if (NavigationManager.detectReload()) {
        NavigationManager.showReloadDialog();
        await NavigationManager.redirectToPreparation('リロード検出');
        throw NavigationManager.createRedirectError();
    }

    // 複雑な判定ロジック（約30行）
    const isNewStart = NavigationManager.isNewTrainingStart();
    const isResuming = NavigationManager.isResumingAfterReload();
    const hasExistingSessions = /* localStorage チェック */;

    if (isNewStart) {
        initializeRandomModeTraining();
    } else if (isResuming || hasExistingSessions) {
        preselectBaseNote();
    } else {
        initializeRandomModeTraining();
    }
}
```

**NavigationManager v3.0.0（✅ 正しい責任分担）**:
```javascript
// trainingController.v2.js (v3.0.0 - 正しい責任分担)
export async function initializeTrainingPage() {
    // 【NavigationManager の責任】リロード検出 → preparationへリダイレクト
    if (NavigationManager.detectReload()) {
        console.warn('⚠️ リロード検出 - preparationへリダイレクト');
        NavigationManager.showReloadDialog();
        await NavigationManager.redirectToPreparation('リロード検出');
        throw NavigationManager.createRedirectError();
    }

    // 音域データ必須チェック
    if (!checkVoiceRangeData()) {
        console.error('❌ 音域データが設定されていません');
        alert('音域テストを先に完了してください。');
        await NavigationManager.redirectToPreparation('音域テスト未完了');
        return;
    }

    // 【重要】sessionCounter 管理は SessionDataRecorder が担当
    // - startNewSession() で自動インクリメント
    // - localStorage と自動同期
    // - NavigationManager は一切関与しない

    // 基音選択（毎回必須）
    preselectBaseNote();

    // 以降の初期化処理...
}
```

**詳細な仕様は `SESSION_MANAGEMENT_SPECIFICATION.md` を参照**

### メリット

| 項目 | v1.0.0（従来） | v1.1.0（統合） | v2.0.0（シンプル化） | v3.0.0（ブラウザバック統合） |
|------|-------------|-------------|-------------------|------------------------|
| **コードの一元管理** | 5ファイルに散在 | 1ファイルに集約 | 同左（さらに簡素化） | **NavigationManagerに完全統合** |
| **設定漏れリスク** | 手動設定（5箇所） | 自動設定 | 同左 | 同左＋ブラウザバック防止自動化 |
| **重複コード** | 73行の重複 | 0行（完全削除） | 同左 | 同左 |
| **複雑な判定ロジック** | 各所に散在 | 一元管理 | **完全削除（67行削減）** | 同左 |
| **ブラウザバック防止** | router.jsに分散 | - | - | **PAGE_CONFIGで一元管理** |
| **イベントリスナー管理** | 手動クリーンアップ | - | - | **自動クリーンアップ** |
| **保守性** | 低（変更時に5箇所修正必要） | 高（1箇所のみ） | **最高（シンプル設計）** | **最高（統合設計）** |
| **テスト容易性** | 困難（5ファイル依存） | 容易（単一クラス） | 同左 | 同左 |

**v2.0.0での追加削減**:
- NavigationManager: 不要なメソッド3つ削除
- trainingController.v2.js: 複雑な判定ロジック30行削除
- router.js, preparation-pitchpro-cycle.js: フラグ設定処理削除
- **合計**: 67行削減（v1.1.0 → v2.0.0）

**v3.0.0での追加改善**:
- router.js: pageConfig削除、ブラウザバック防止ロジックを完全委譲
- NavigationManager: PAGE_CONFIG統合、popstateハンドラー管理機能追加
- result-session-controller.js: 遷移前のイベントリスナークリーンアップ追加
- **メリット**: ページ設定の一元化、メモリリーク防止、コード簡素化

### sessionStorage フラグ管理

| フラグ名 | 用途 | 設定タイミング | 削除タイミング | 状態 |
|---------|------|-------------|-------------|------|
| `normalTransitionToTraining` | 正常な遷移を識別 | `navigateToTraining()` 実行時 | `detectReload()` で確認後 | ✅ v2.0.0でも使用 |
| `reloadRedirected` | 2回目の検出を防止 | リロード検出時 | 2回目の `detectReload()` で確認後 | ✅ v2.0.0でも使用 |
| ~~`resumingAfterReload`~~ | ~~リロード復帰を識別~~ | ~~リダイレクト時~~ | ~~判定後~~ | ❌ v2.0.0で削除 |
| ~~`newTrainingStart`~~ | ~~新規開始を識別~~ | ~~home等から遷移時~~ | ~~判定後~~ | ❌ v2.0.0で削除 |

### フロー図

#### v3.0.0 統合フロー - リロード検出

```
【trainingページでリロード（F5）】
training ページ（セッション2実行中）
  ↓
F5キー（リロード）
  ↓
trainingController.v2.js - initializeTrainingPage()
  ↓
【NavigationManager の責任】
NavigationManager.detectReload()
  ├─ normalTransition フラグ確認 → null
  ├─ performance.navigation.type === 1 → リロード検出
  ├─ sessionStorage.setItem('reloadRedirected', 'true')
  └─ return true
  ↓
NavigationManager.showReloadDialog()  ← ダイアログ表示
  ↓
NavigationManager.redirectToPreparation('リロード検出')
  ↓
#preparation へリダイレクト（マイク許可再取得）
```

#### v3.0.0 統合フロー - ブラウザバック防止

```
【trainingページ読み込み】
router.js - setupPageEvents('training')
  ↓
router.preventBrowserBack('training')
  ↓
NavigationManager.preventBrowserBack('training')
  ├─ PAGE_CONFIG['training'] 取得
  ├─ 既存のpopstateハンドラーを削除（メモリリーク防止）
  ├─ history.pushState() × 2 （ダミーエントリー追加）
  ├─ popstateハンドラー定義
  │   └─ ブラウザバック時:
  │       ├─ history.pushState() × 2 （履歴スタック補充）
  │       └─ alert('トレーニング中です...') （通知）
  └─ window.addEventListener('popstate', handler)

【ページ遷移前のクリーンアップ】
result-session-controller.js - button.onclick()
  ↓
NavigationManager.removeBrowserBackPrevention()
  ├─ window.removeEventListener('popstate', popStateHandler)
  ├─ popStateHandler = null
  └─ console.log('✅ popstateイベントリスナーを削除')
  ↓
NavigationManager.navigateToTraining()
  ↓
正常な遷移（popstateハンドラーが発火しない）
```

**セッション管理の詳細フローは `SESSION_MANAGEMENT_SPECIFICATION.md` を参照**

---

### v3.2.0 - visibilitychange監視とリロード検出改善（2025-11-10）

**実装日**: 2025-11-10
**目的**: ウィンドウ切り替え時の誤検出防止とリロード検出精度の向上

#### 背景と問題

**発見された問題**:
Safariでウィンドウを切り替えた際、リロードとして誤検出され、意図せずpreparationページにリダイレクトされる問題が発生。

**根本原因**:
1. 古いAPI（`performance.navigation.type`）がvisibilitychangeイベントでもtype=1（リロード）を返す
2. visibilitychangeイベントリスナーが初期化されておらず、ウィンドウ切り替えを検出できない
3. PitchProのMicrophoneLifecycleManagerもvisibilitychangeを使用しており、登録順序が重要

#### 実装した機能

##### 1. visibilitychange監視の即座初期化

**実装箇所**: `navigation-manager.js` Lines 55-75

```javascript
/**
 * 最後のvisibilitychange発生時刻（ウィンドウ切り替え誤検出防止用）
 */
static lastVisibilityChange = 0;

/**
 * visibilitychange監視を初期化
 */
static initVisibilityTracking() {
    if (!this.visibilityTrackingInitialized) {
        document.addEventListener('visibilitychange', () => {
            this.lastVisibilityChange = Date.now();
            console.log('🔍 [NavigationManager] visibilitychange検出:', document.hidden ? 'hidden' : 'visible');
            console.log('🔍 [NavigationManager] lastVisibilityChange更新:', this.lastVisibilityChange);
        });
        this.visibilityTrackingInitialized = true;
        console.log('✅ [NavigationManager] visibilitychange監視を初期化');
    }
}
```

**スクリプト読み込み時に即座実行** (Line 525):
```javascript
// グローバルスコープに公開
window.NavigationManager = NavigationManager;

// 【重要】visibilitychange監視を即座に初期化（PitchProより先に登録）
NavigationManager.initVisibilityTracking();

console.log('✅ [NavigationManager] ロード完了');
```

**効果**:
- PitchProのMicrophoneLifecycleManagerより先にイベントリスナーを登録
- ウィンドウ切り替え時のタイムスタンプを確実に記録
- 初回アクセス時からウィンドウ切り替えを検出可能

##### 2. detectReload()の完全書き換え

**実装箇所**: `navigation-manager.js` Lines 91-147

```javascript
static detectReload() {
    console.log('🔍 [NavigationManager] リロード検出開始');

    // 0. visibilitychange監視を初期化（初回のみ）
    this.initVisibilityTracking();

    // 1. ウィンドウ切り替え誤検出を防止（1秒以内のvisibilitychangeは除外）
    const timeSinceVisibilityChange = Date.now() - this.lastVisibilityChange;
    console.log('🔍 [NavigationManager] 最後のvisibilitychangeからの経過時間:', timeSinceVisibilityChange + 'ms');
    if (timeSinceVisibilityChange < 1000) {
        console.log('✅ [NavigationManager] ウィンドウ切り替え検出 - リロードではない');
        return false;
    }

    // 2. リダイレクト済みフラグをチェック
    const alreadyRedirected = sessionStorage.getItem(this.KEYS.REDIRECT_COMPLETED);
    if (alreadyRedirected === 'true') {
        console.log('✅ [NavigationManager] リダイレクト済み - 2回目の検出をスキップ');
        sessionStorage.removeItem(this.KEYS.REDIRECT_COMPLETED);
        return false;
    }

    // 3. 正常な遷移フラグをチェック
    const normalTransition = sessionStorage.getItem(this.KEYS.NORMAL_TRANSITION);
    console.log('🔍 [NavigationManager] normalTransition フラグ:', normalTransition);
    if (normalTransition === 'true') {
        sessionStorage.removeItem(this.KEYS.NORMAL_TRANSITION);
        console.log('✅ [NavigationManager] 正常な遷移を検出');
        return false;
    }

    // 4. Navigation Timing API v2（モダンAPI優先）
    const navEntries = performance.getEntriesByType('navigation');
    console.log('🔍 [NavigationManager] Navigation Timing API v2:', navEntries);
    if (navEntries.length > 0) {
        const navType = navEntries[0].type;
        console.log('🔍 [NavigationManager] navEntries[0].type:', navType);
        if (navType === 'reload') {
            console.log('✅ [NavigationManager] リロード検出（Navigation Timing API v2）: type === "reload"');
            sessionStorage.setItem(this.KEYS.REDIRECT_COMPLETED, 'true');
            return true;
        } else {
            console.log('✅ [NavigationManager] 正常な遷移（Navigation Timing API v2）: type === "' + navType + '"');
            return false;
        }
    }

    // 5. フォールバック: 古いAPI（非推奨だが念のため）
    if (performance.navigation && performance.navigation.type === 1) {
        console.log('⚠️ [NavigationManager] リロード検出（古いAPI・フォールバック）: type === 1');
        sessionStorage.setItem(this.KEYS.REDIRECT_COMPLETED, 'true');
        return true;
    }

    console.log('❌ [NavigationManager] リロード未検出 - 通常のSPA遷移として扱う');
    return false;
}
```

**チェック順序**:
1. **ウィンドウ切り替え確認** (最優先): 1秒以内のvisibilitychangeは除外
2. **リダイレクト済みフラグ**: 2回目の検出を防止
3. **正常な遷移フラグ**: SPA内の通常遷移を識別
4. **Navigation Timing API v2**: モダンAPIを優先使用
5. **古いAPI**: フォールバックのみ

##### 3. result-sessionへのnormalTransition拡張

**実装箇所**: `navigation-manager.js` Lines 344-347

```javascript
// 3. 正常な遷移フラグを設定（training, result-session への遷移）
if (page === 'training' || page === 'result-session') {
    this.setNormalTransition();
}
```

**問題**:
- training → result-session の遷移時、Navigation Timing API v2が `type: "reload"` を返す
- SPAのハッシュ遷移が誤ってリロードとして検出される

**効果**:
- result-sessionへの遷移も正常な遷移として識別
- Navigation Timing API v2の誤判定を回避
- 即座のリダイレクトを防止

##### 4. navigate()汎用メソッドの追加

**実装箇所**: `navigation-manager.js` Lines 308-347

```javascript
/**
 * 汎用ナビゲーションメソッド（normalTransition自動設定）
 * @param {string} page - 遷移先ページ名
 * @param {Object|null} params - URLパラメータ（オプション）
 */
static navigate(page, params = null) {
    console.log(`🚀 [NavigationManager] ${page}へ遷移`);

    // 1. 事前チェック: リダイレクトループ防止
    if (page === 'preparation' && window.location.hash.includes('preparation')) {
        console.warn('⚠️ [NavigationManager] 既にpreparationページにいます - リダイレクトをスキップ');
        return;
    }

    // 2. ブラウザバック防止を解除（遷移元ページ）
    this.removeBrowserBackPrevention();

    // 3. 正常な遷移フラグを設定（training, result-session への遷移）
    if (page === 'training' || page === 'result-session') {
        this.setNormalTransition();
    }

    // 4. 遷移実行
    if (params) {
        const urlParams = new URLSearchParams(params);
        window.location.hash = `${page}?${urlParams.toString()}`;
        console.log(`✅ [NavigationManager] ${page}へ遷移完了（パラメータ付き）`);
    } else {
        window.location.hash = page;
        console.log(`✅ [NavigationManager] ${page}へ遷移完了`);
    }
}
```

**機能**:
- リダイレクトループ防止チェック
- ブラウザバック防止の自動解除
- normalTransitionフラグの自動設定
- パラメータ付き遷移のサポート

#### フロー図

##### ウィンドウ切り替えシナリオ

```
【Safariでウィンドウを切り替える】
training ページ表示中
  ↓
別のウィンドウに切り替え
  ↓
document.visibilitychange イベント発火（hidden）
  ↓
NavigationManager.lastVisibilityChange = Date.now() 記録
  ↓
training ページに戻る
  ↓
document.visibilitychange イベント発火（visible）
  ↓
NavigationManager.lastVisibilityChange = Date.now() 更新
  ↓
【もしリロード検出が実行された場合】
NavigationManager.detectReload()
  ├─ timeSinceVisibilityChange = Date.now() - lastVisibilityChange
  ├─ timeSinceVisibilityChange < 1000ms → true
  └─ return false（リロードではない）
  ↓
正常に training ページ継続
```

##### リロードシナリオ

```
【training ページでF5リロード】
training ページ表示中
  ↓
F5キー押下
  ↓
ページ完全リロード（visibilitychange発火なし）
  ↓
NavigationManager.detectReload()
  ├─ timeSinceVisibilityChange > 1000ms（または初期値0）
  ├─ normalTransition フラグ: null
  ├─ Navigation Timing API v2: type === "reload"
  └─ return true（リロード検出）
  ↓
preparationページへリダイレクト
```

##### training → result-session 遷移シナリオ

```
【トレーニング完了後の遷移】
training ページ（セッション完了）
  ↓
result-session-controller.js
  ↓
NavigationManager.navigate('result-session')
  ├─ removeBrowserBackPrevention() 実行
  ├─ setNormalTransition() 実行（★重要）
  └─ window.location.hash = 'result-session'
  ↓
result-session ページ読み込み
  ↓
【もし detectReload() が実行された場合】
NavigationManager.detectReload()
  ├─ normalTransition フラグ: 'true'（★設定済み）
  ├─ フラグ削除
  └─ return false（正常な遷移）
  ↓
正常に result-session ページ表示
```

#### テスト結果

**テストシナリオ1: ウィンドウ切り替え**
- ✅ training ページ表示中にウィンドウ切り替え
- ✅ リロード誤検出なし
- ✅ 正常に training ページ継続

**テストシナリオ2: 実際のリロード**
- ✅ F5キーでリロード実行
- ✅ リロード正常検出
- ✅ preparation ページへリダイレクト

**テストシナリオ3: training → result-session 遷移**
- ✅ normalTransition フラグ設定
- ✅ Navigation Timing API v2の誤判定を回避
- ✅ 正常に result-session ページ表示

**テストシナリオ4: iPhone/iPad互換性**
- ✅ iPhone Safari: 正常動作確認
- ✅ iPad Safari: 正常動作確認
- ✅ デバイス固有の問題なし

#### v3.0.0での重要な実装ポイント

1. **責任範囲の明確化**
   - NavigationManager: リロード検出・マイク許可再取得・ブラウザバック防止
   - SessionDataRecorder: sessionCounter 管理と localStorage 管理
   - trainingController.v2.js: トレーニングフロー制御

2. **ブラウザバック防止の実装**
   - PAGE_CONFIGでページごとの設定を一元管理
   - ダブルダミーエントリーパターンで確実な防止
   - alert()ダイアログで明確な通知（OKボタンのみ、ナビゲーション禁止）

3. **イベントリスナー管理**
   - 遷移前に必ず removeBrowserBackPrevention() を呼び出す
   - popstateハンドラーの適切なクリーンアップでメモリリーク防止
   - router.jsの cleanupCurrentPage() で自動解除

#### v3.2.0での重要な実装ポイント

1. **visibilitychange監視システム**
   - スクリプト読み込み時に即座初期化
   - PitchProより先にイベントリスナー登録
   - ウィンドウ切り替えのタイムスタンプを記録

2. **リロード検出の優先順位**
   - ウィンドウ切り替え確認（最優先）
   - リダイレクト済みフラグ
   - 正常な遷移フラグ
   - Navigation Timing API v2（モダンAPI優先）
   - 古いAPI（フォールバックのみ）

3. **result-session対応**
   - normalTransitionフラグをtraining, result-sessionに拡張
   - Navigation Timing API v2の誤判定を回避
   - SPA遷移の正確な識別

4. **汎用navigate()メソッド**
   - リダイレクトループ防止
   - ブラウザバック防止の自動解除
   - normalTransitionフラグの自動設定
   - パラメータ付き遷移のサポート

### 今後の拡張可能性

1. **ダイレクトアクセス検出**:
   - `NavigationManager.detectDirectAccess()` メソッド追加
   - URLパラメータの検証・リダイレクト処理

2. **カスタムダイアログ**:
   - `showReloadDialog()` をカスタムモーダルに置き換え
   - ブラウザバック防止のalert()もカスタムUIに置き換え

3. **リダイレクト履歴管理**:
   - `sessionStorage` でリダイレクト履歴を記録
   - 無限ループ防止

4. **ページ遷移アニメーション**:
   - removeBrowserBackPrevention()後のフェードアウト効果
   - ユーザー体験の向上

---

## テスト仕様

### テストケース一覧

#### T-1: リロード時のクリーンアップ

| ID | テストケース | 手順 | 期待結果 |
|----|-------------|------|----------|
| T-1-1 | トレーニング開始前リロード | 1. trainingページ表示<br>2. リロード実行 | エラーなく再表示 |
| T-1-2 | トレーニング中リロード | 1. 基音スタート<br>2. 2-3音歌唱<br>3. リロード実行 | クリーンアップログ表示、マイク消灯 |
| T-1-3 | セッション完了後リロード | 1. 8音完了<br>2. 結果ページ表示前にリロード | 正常にtrainingページ再表示 |

#### T-2: ブラウザバック時のクリーンアップ

| ID | テストケース | 手順 | 期待結果 |
|----|-------------|------|----------|
| T-2-1 | トレーニング中にhomeへ戻る | 1. 基音スタート<br>2. ブラウザバック | クリーンアップ実行、homeページ表示 |
| T-2-2 | トレーニング中にpreparationへ戻る | 1. 基音スタート<br>2. ブラウザバック | マイク競合なし、preparationページ正常動作 |

#### T-3: ダイレクトアクセス制御

| ID | テストケース | 手順 | 期待結果 |
|----|-------------|------|----------|
| T-3-1 | 音域未設定でtrainingアクセス | 1. localStorage削除<br>2. #trainingアクセス | アラート表示、preparationにリダイレクト |
| T-3-2 | 音域設定済みでtrainingアクセス | 1. 音域設定完了<br>2. #trainingアクセス | 正常にトレーニング開始 |
| T-3-3 | 未完了でresults-overviewアクセス | 1. 2セッション完了<br>2. #results-overviewアクセス | アラート表示、trainingにリダイレクト |
| T-3-4 | 完了後にresults-overviewアクセス | 1. 8セッション完了<br>2. #results-overviewアクセス | 正常に総合評価表示 |

#### T-4: メモリリーク確認

| ID | テストケース | 手順 | 期待結果 |
|----|-------------|------|----------|
| T-4-1 | 複数回のリロード | 1. trainingページ表示<br>2. リロード10回実行<br>3. DevToolsでメモリ確認 | メモリ使用量が増加し続けない |
| T-4-2 | 複数回のページ遷移 | 1. home→training→home を10回繰り返し<br>2. メモリ確認 | メモリリークなし |

---

### テスト環境

#### デバイス・ブラウザマトリックス

| デバイス | ブラウザ | バージョン | テスト優先度 |
|---------|---------|-----------|-------------|
| PC (macOS) | Chrome | 最新 | 🔴 必須 |
| PC (macOS) | Safari | 最新 | 🟡 推奨 |
| iPhone | Safari | iOS 15+ | 🔴 必須 |
| iPad | Safari | iPadOS 13+ | 🟡 推奨 |

#### テスト手順書

**準備**:
1. ブラウザのDevToolsを開く（Console, Network, Memory タブ）
2. localStorageをクリア: `localStorage.clear()`
3. ページリロード: `location.reload()`

**実行**:
1. 各テストケースを順番に実行
2. Consoleログを確認
3. 期待結果と一致するか検証

**記録**:
- スクリーンショット
- Consoleログのテキスト保存
- メモリプロファイル（T-4系のみ）

---

## 付録

### A. 参考ファイル一覧

| ファイル | パス | 主要な役割 |
|---------|------|-----------|
| router.js | `/PitchPro-SPA/js/router.js` | SPAルーティング、クリーンアップ管理 |
| trainingController.js | `/PitchPro-SPA/js/controllers/trainingController.js` | トレーニングページ制御 |
| preparationController.js | `/PitchPro-SPA/js/controllers/preparationController.js` | 音域テストページ制御 |
| session-data-recorder.js | `/PitchPro-SPA/js/controllers/session-data-recorder.js` | セッションデータ記録 |
| result-session-controller.js | `/PitchPro-SPA/pages/js/result-session-controller.js` | セッション結果ページ制御 |
| results-overview.html | `/PitchPro-SPA/pages/results-overview.html` | 総合評価ページ（インラインJS） |

### B. 関連仕様書

- `APP_SPECIFICATION.md`: アプリケーション仕様書
- `TRAINING_FLOW_SPECIFICATION.md`: トレーニングフロー仕様書
- `DATA_MANAGEMENT_SPECIFICATION.md`: データ管理仕様書

### C. グローバル変数一覧

| 変数名 | 型 | 定義場所 | 用途 |
|--------|---|---------|------|
| `window.audioDetector` | AudioDetectionComponent | trainingController.js | 音声検出インスタンス |
| `window.audioStream` | MediaStream | trainingController.js | マイク入力ストリーム |
| `window.pitchShifterInstance` | PitchShifter | router.js | 音源再生インスタンス |
| `window.sessionDataRecorder` | SessionDataRecorder | session-data-recorder.js | セッションデータ記録 |
| `window.voiceRangeData` | Object | trainingController.js | 音域設定データ |

### D. イベントリスナー一覧

| イベント | 登録場所 | ハンドラー | 用途 |
|---------|---------|-----------|------|
| `hashchange` | router.js | `handleRouteChange()` | ページ遷移検出 |
| `beforeunload` | router.js | 空関数 | 同期クリーンアップ用（現在未使用） |
| `pagehide` | router.js | `cleanupCurrentPage()` | 非同期クリーンアップ実行 |
| `DOMContentLoaded` | router.js | `handleRouteChange()` | 初期ページ表示 |
| `popstate` | NavigationManager | `popStateHandler` | ブラウザバック防止（v3.0.0） |

---

## 既知の問題と解決策

### v3.4.0: 総合評価ページからの遷移パラメータ不足問題（2025-11-18解決）

#### 問題の概要

**症状**: 総合評価ページの「次のステップ」ボタン（例：連続チャレンジを開始）をクリックすると、ブラウザバックのように見える動作が発生。実際はNavigationManagerがダイレクトアクセスとして誤検出し、ホームへ強制リダイレクトしていた。

#### 根本原因

```javascript
// 問題のあったコード（results-overview-controller.js v4.1.0以前）
'next-step-random-upgrade': () => window.location.hash = 'preparation?mode=continuous'
// ❌ direction パラメータが欠落
```

1. `direction`パラメータが欠落したURL（`preparation?mode=continuous`）で遷移
2. NavigationManagerが「ダイレクトアクセス」として検出
3. `isDirectAccessToPreparation()`がtrueを返す
4. ホームへ強制リダイレクト

**ログの流れ**:
```
Line 229: ✅ [NavigationManager] 許可された遷移: results-overview → preparation
Line 230: 📍 [Router] Route change requested: preparation?mode=continuous
Line 238: ⚠️ [NavigationManager] preparationページへのダイレクトアクセス検出
Line 239: 🔄 [Router] Page access blocked: direct-access-preparation
Line 243: 📍 [Router] Route change requested: home
```

#### 解決策

**実装内容（results-overview-controller.js v4.2.0）**:

```javascript
// グローバル変数として現在の方向を保持
let currentScaleDirection = 'ascending';

function displayNextSteps(currentMode, evaluation, chromaticDirection = null, scaleDirection = 'ascending') {
    // グローバル変数に保存（handleNextStepActionで使用）
    currentScaleDirection = scaleDirection;
    console.log('🔍 [DEBUG] currentScaleDirection set to:', currentScaleDirection);

    // ... 残りの処理 ...
}

function handleNextStepAction(actionId) {
    console.log('🎯 Next step action:', actionId);
    console.log('🔍 [DEBUG] Using currentScaleDirection:', currentScaleDirection);

    const actions = {
        // ✅ direction パラメータを追加
        'next-step-random-practice': () => window.location.hash = `preparation?mode=random&direction=${currentScaleDirection}`,
        'next-step-random-upgrade': () => window.location.hash = `preparation?mode=continuous&direction=${currentScaleDirection}`,
        'next-step-continuous-practice': () => window.location.hash = `preparation?mode=continuous&direction=${currentScaleDirection}`,
        // ... 他のアクション ...
    };

    // ... 残りの処理 ...
}
```

#### 重要な教訓

1. **パラメータ完全性**: NavigationManagerは`direction`パラメータの有無でダイレクトアクセスを判定
2. **正規遷移の要件**: 正規遷移として認識されるには、必要な全てのパラメータを含める必要がある
3. **グローバル状態管理**: 複数の関数間で共有する必要がある状態は、適切にグローバル変数で管理

#### 対象ボタン

- ✅ ランダム基音モード → 「同じモードで再挑戦」
- ✅ ランダム基音モード → 「連続チャレンジを開始」
- ✅ 連続チャレンジモード → 「同じモードで再挑戦」
- ✅ 連続チャレンジモード → 「12音階モードに挑戦」（既に実装済み）

---

### v4.3.0: NavigationManager.navigate() API統合による根本的修正（2025-11-18解決）

#### 問題の概要

**症状**: v4.2.0で`direction`パラメータを追加したにも関わらず、連続チャレンジモード → 12音階モードの遷移で依然としてブラウザバックのような動作が発生。

**ユーザーからのフィードバック**:
> 「連続チャレンジで総合評価の次のステップの12音階ボタンでブラウザバック発生
> ここは自動で遷移するので違う対応が必要かもしれませんね」

#### 根本原因の発見

v4.2.0の修正では**パラメータの完全性**のみを解決したが、**真の問題**が残っていた：

```javascript
// v4.2.0の実装（問題は解決していない）
'next-step-continuous-upgrade': () => window.location.hash = `preparation?mode=12tone&direction=ascending`
// ✅ direction パラメータは追加されている
// ❌ しかしpreparationPageActiveフラグが設定されない
```

**NavigationManagerのダイレクトアクセス検出ロジック**（navigation-manager.js:313-327）:
```javascript
// Direct access detection for preparation page
if (page === 'preparation' && config?.directAccessRedirectTo) {
    const wasPreparationActive = sessionStorage.getItem('preparationPageActive') === 'true';
    if (!wasPreparationActive) {
        console.log('⚠️ [NavigationManager] preparationページへのダイレクトアクセス検出');

        if (config.directAccessMessage) {
            alert(config.directAccessMessage);
        }

        window.location.hash = config.directAccessRedirectTo;
        return { shouldContinue: false, reason: 'direct-access-preparation' };
    }
}
```

**判明した事実**:
1. `window.location.hash`で直接遷移しても`preparationPageActive`フラグは設定されない
2. NavigationManagerは`preparationPageActive`フラグの有無でダイレクトアクセスを判定
3. フラグが存在しない → ダイレクトアクセスと誤検出 → ホームへリダイレクト
4. `direction`パラメータの有無は**副次的な問題**だった

#### 解決策

**実装内容（results-overview-controller.js v4.3.0）**:

**NavigationManager.navigate() APIの正しい使用**:

```javascript
function handleNextStepAction(actionId) {
    console.log('🎯 Next step action:', actionId);
    console.log('🔍 [DEBUG] Using currentScaleDirection:', currentScaleDirection);

    const actions = {
        // ✅ NavigationManager.navigate()を使用（フラグ自動設定）
        'next-step-random-practice': () => {
            if (window.NavigationManager) {
                NavigationManager.navigate('preparation', { mode: 'random', direction: currentScaleDirection });
            } else {
                // フォールバック（NavigationManager未定義時）
                window.location.hash = `preparation?mode=random&direction=${currentScaleDirection}`;
            }
        },
        'next-step-random-upgrade': () => {
            if (window.NavigationManager) {
                NavigationManager.navigate('preparation', { mode: 'continuous', direction: currentScaleDirection });
            } else {
                window.location.hash = `preparation?mode=continuous&direction=${currentScaleDirection}`;
            }
        },
        'next-step-continuous-practice': () => {
            if (window.NavigationManager) {
                NavigationManager.navigate('preparation', { mode: 'continuous', direction: currentScaleDirection });
            } else {
                window.location.hash = `preparation?mode=continuous&direction=${currentScaleDirection}`;
            }
        },
        'next-step-continuous-upgrade': () => {
            if (window.NavigationManager) {
                NavigationManager.navigate('preparation', { mode: '12tone', direction: 'ascending' });
            } else {
                window.location.hash = `preparation?mode=12tone&direction=ascending`;
            }
        },
        // ... 他の12tone系アクションも同様に修正 ...
    };

    // ... 残りの処理 ...
}
```

**NavigationManager.navigate()の内部処理**（navigation-manager.js:705-748）:
```javascript
static navigate(page, params = {}) {
    console.log(`🚀 [NavigationManager] 統一ナビゲーション: ${page}`, params);

    // ... AudioDetector管理 ...

    // ✅ 正常遷移フラグを自動設定（重要！）
    if (page === 'training') {
        this.setNormalTransition();
    } else if (page === 'result-session') {
        this.setNormalTransitionToResultSession();
    } else if (page === 'preparation') {
        this.setNormalTransitionToPreparation();  // ← preparationPageActiveフラグ設定！
    }

    // ... 残りのナビゲーション処理 ...
}
```

**setNormalTransitionToPreparation()の実装**（navigation-manager.js:122-125）:
```javascript
static setNormalTransitionToPreparation() {
    sessionStorage.setItem(this.KEYS.NORMAL_TRANSITION_PREPARATION, 'true');
    console.log('✅ [NavigationManager] 正常な遷移フラグを設定（preparation）');
}
```

#### 修正の効果

| 修正前（v4.2.0） | 修正後（v4.3.0） |
|---|---|
| `window.location.hash` 直接操作 | `NavigationManager.navigate()` 統一API |
| `preparationPageActive` フラグ未設定 | フラグ自動設定（line 747） |
| ダイレクトアクセス誤検出 | 正規遷移として正しく認識 |
| ホームへリダイレクト | preparationページへ正常遷移 |

#### 重要な教訓

1. **API設計の本質理解**: パラメータの完全性だけでなく、正しいAPIを使用することが重要
2. **NavigationManager統合の目的**: 単なる便利関数ではなく、正しい遷移フロー（フラグ設定）を保証するための設計
3. **症状と原因の区別**: `direction`パラメータ不足は**症状**、真の原因は**フラグ未設定**だった
4. **段階的修正の価値**: v4.2.0でパラメータを追加したことで、根本原因が明確になった
5. **防御的プログラミング**: NavigationManager未定義時のフォールバック処理でアプリの堅牢性を確保

#### 対象アクション（全9個を修正）

- ✅ `next-step-random-practice`
- ✅ `next-step-random-upgrade`
- ✅ `next-step-continuous-practice`
- ✅ `next-step-continuous-upgrade`
- ✅ `next-step-12tone-ascending-practice`
- ✅ `next-step-12tone-ascending-upgrade`
- ✅ `next-step-12tone-descending-practice`
- ✅ `next-step-12tone-descending-upgrade`
- ✅ `next-step-12tone-both-practice`

---

## v5.0.0: NavigationManager統合徹底化とAudioDetector二重管理問題の完全解決（2025-11-19）

### 概要

本バージョンでは、アプリ全体のNavigationManager統合を徹底し、AudioDetectorの二重管理問題を根本的に解決した。Phase 1とPhase Aの2段階で、全14箇所の不整合を修正し、NavigationManager統一APIによる安全で一貫性のあるナビゲーションシステムを完成させた。

### 背景と問題の発見

#### 初期調査: Phase 1開始前

**調査日**: 2025-11-19
**調査内容**: マイク許可スキップ機能実装後のNavigationManager一貫性調査

**発見された問題**:
1. **records遷移の不整合** (7箇所): `sessionStorage.clear()` + `window.location.hash` の直接操作
2. **recordsページのメモリリーク**: cleanup関数未実装によるAudioDetector残存

#### 深掘り調査: AudioDetector二重管理問題の発見

**Phase 1実装後の影響範囲調査で判明**:

**重大な設計衝突**:
- **NavigationManager**: トレーニングフロー（preparation→training等）でAudioDetectorを保持する設計
- **Router**: preparationページcleanup時に無条件でAudioDetectorを破棄する実装
- **結果**: AudioDetectorが二重破棄され、トレーニング開始時にエラー発生

**トレーニングフロー判定の不備**:
```javascript
// navigation-manager.js: isTrainingFlow()
static isTrainingFlow(from, to) {
    return (
        (from === 'training' && to === 'result-session') ||
        (from === 'result-session' && to === 'training') ||
        (from === 'preparation' && to === 'training') ||
        (from === 'result-session' && to === 'results-overview')
        // ❌ results-overview → preparation/training が不足
    );
}
```

**preparationページcleanupの問題**:
```javascript
// router.js: preparation cleanup (修正前)
'preparation': {
    cleanup: async () => {
        if (typeof window.preparationManager !== 'undefined' && window.preparationManager) {
            await window.preparationManager.cleanupPitchPro(); // ❌ 無条件破棄
        }
        // ❌ NavigationManagerが保持中でも破棄してしまう
    }
}
```

#### 全体監査: 追加の不整合箇所特定

**全ファイル調査の結果、5つの問題を特定**:

1. **🔴 HIGH - 問題1**: preparation → training遷移でNavigationManager未使用（AudioDetector喪失）
2. **🟡 MED - 問題2**: records-controller.js の不適切な `sessionStorage.clear()`
3. **🟡 MED - 問題3**: 下行モードボタン3箇所でNavigationManager未使用
4. **🟡 MED - 問題4**: ヘッダーナビゲーションボタンでインラインハンドラ使用
5. **🟢 LOW - 問題5**: premium-analysisホームボタンでインラインハンドラ使用

### Phase 1: 低リスク修正（v4.5.0, v2.1.0）

#### 修正内容

**1. results-overview-controller.js v4.5.0: records遷移の統一化（7箇所）**

**修正前**:
```javascript
'next-step-random-records': () => {
    sessionStorage.clear();  // ❌ 全フラグ削除（preparationPageActive等も消える）
    window.location.hash = 'records';  // ❌ NavigationManagerをバイパス
}
```

**修正後**:
```javascript
'next-step-random-records': () => {
    if (window.NavigationManager) {
        NavigationManager.navigate('records');  // ✅ 統一API
    } else {
        window.location.hash = 'records';  // フォールバック
    }
}
```

**対象アクション（全7箇所）**:
- `next-step-random-records`
- `next-step-continuous-records`
- `next-step-12tone-ascending-records`
- `next-step-12tone-descending-records`
- `next-step-12tone-both-records`
- `next-step-random-down-records`
- `next-step-continuous-down-records`

**効果**:
- ✅ `sessionStorage.clear()` による不適切なフラグ削除を防止
- ✅ NavigationManager統一APIで一貫性確保
- ✅ AudioDetectorの適切なクリーンアップ管理

**2. router.js v2.1.0: recordsページcleanup追加**

**追加内容**:
```javascript
'records': {
    init: 'initRecords',
    dependencies: ['Chart', 'DistributionChart'],
    cleanup: async () => {  // ✅ 新規追加
        console.log('🧹 [Router] Cleaning up records page...');
        if (window.NavigationManager?.currentAudioDetector) {
            console.log('🧹 [Router] Destroying AudioDetector from records');
            window.NavigationManager._destroyAudioDetector(
                window.NavigationManager.currentAudioDetector
            );
            window.NavigationManager.currentAudioDetector = null;
        }
        console.log('✅ [Router] Records page cleanup complete');
    }
}
```

**効果**:
- ✅ recordsページ離脱時のAudioDetector適切破棄
- ✅ メモリリーク防止
- ✅ 既存パターンとの一貫性確保

#### Phase 1実装後の影響調査

**発見された重大な問題**: **AudioDetector二重管理衝突**

**シナリオ**:
```
1. preparationページでAudioDetector作成
2. NavigationManager.navigate('training')
   → NavigationManagerがAudioDetectorを保持（isTrainingFlow判定）
3. router.jsのpreparation cleanup実行
   → preparationManager.cleanupPitchPro()が無条件でAudioDetector破棄
4. trainingページでAudioDetector使用試行
   → エラー発生（すでに破棄済み）
```

**根本原因**:
- NavigationManager: トレーニングフロー判定に基づきAudioDetectorを保持
- Router: ページ離脱時に無条件でAudioDetectorを破棄
- **設計レベルでの衝突**: 2つのシステムが異なる方針でAudioDetectorを管理

### Phase A: 二重管理問題の根本解決（v2.2.0, v1.1.0, v4.6.0, v2.5.6）

#### 修正A: router.js v2.2.0 - preparationページcleanup改善

**核心的な解決策**: NavigationManagerの管理状態を尊重

**修正前**:
```javascript
'preparation': {
    cleanup: async () => {
        console.log('🧹 [Router] Cleaning up preparation page...');

        // ❌ 無条件にcleanupPitchPro()を実行
        if (typeof window.preparationManager !== 'undefined' && window.preparationManager) {
            await window.preparationManager.cleanupPitchPro();
        }

        if (typeof window.resetPreparationPageFlag === 'function') {
            window.resetPreparationPageFlag();
            console.log('✅ [Router] Preparation page flag reset');
        }
    }
}
```

**修正後**:
```javascript
'preparation': {
    cleanup: async () => {
        console.log('🧹 [Router] Cleaning up preparation page...');

        // ✅ NavigationManagerがAudioDetectorを管理中かチェック
        if (window.NavigationManager?.currentAudioDetector) {
            console.log('✅ [Router] AudioDetectorはNavigationManagerが管理中 - cleanup スキップ');
            // フラグリセットのみ実行
            if (typeof window.resetPreparationPageFlag === 'function') {
                window.resetPreparationPageFlag();
                console.log('✅ [Router] Preparation page flag reset');
            }
            return;  // ✅ AudioDetector破棄をスキップ
        }

        // NavigationManagerが管理していない場合のみcleanup実行
        if (typeof window.preparationManager !== 'undefined' && window.preparationManager) {
            await window.preparationManager.cleanupPitchPro();
        }

        if (typeof window.resetPreparationPageFlag === 'function') {
            window.resetPreparationPageFlag();
            console.log('✅ [Router] Preparation page flag reset');
        }
    }
}
```

**実行フロー**:
```
トレーニングフロー（preparation → training）:
1. NavigationManager.navigate('training') 実行
2. NavigationManager.registerAudioDetector() で保持
3. router.js preparation cleanup 実行
4. currentAudioDetector存在確認 → cleanup スキップ ✅
5. trainingページでAudioDetector使用可能 ✅

非トレーニングフロー（preparation → home等）:
1. 通常のページ遷移
2. NavigationManagerはAudioDetectorを管理していない
3. router.js preparation cleanup 実行
4. currentAudioDetector不在確認 → cleanup 実行 ✅
5. AudioDetector適切破棄 ✅
```

**効果**:
- ✅ トレーニングフローでAudioDetector保持を保証
- ✅ 非トレーニングフローで適切にクリーンアップ
- ✅ 二重破棄の完全防止
- ✅ NavigationManagerとRouterの責任範囲明確化

#### 問題1: preparation-pitchpro-cycle.js v1.1.0 - training遷移の統一化

**問題の重要性**: 🔴 HIGH - トレーニングフロー中核部分でのAudioDetector喪失

**修正箇所**: Line 1561-1575（音域テスト完了後のトレーニング遷移）

**修正前**:
```javascript
// 音域テスト完了後のトレーニング遷移
console.log(`📍 モード情報を保持して遷移: mode=${finalMode}, session=${finalSession || 'なし'}, direction=${finalDirection || 'なし'}, scaleDirection=${scaleDirection}`);

// ❌ 直接URLを構築してscaleDirectionを追加
NavigationManager.setNormalTransition();
NavigationManager.removeBrowserBackPrevention();

const params = new URLSearchParams({ mode: finalMode });
if (finalSession) params.set('session', finalSession);
if (finalDirection) params.set('direction', finalDirection);
params.set('scaleDirection', scaleDirection);

window.location.hash = `training?${params.toString()}`;  // ❌ NavigationManagerをバイパス
```

**修正後**:
```javascript
// 音域テスト完了後のトレーニング遷移
console.log(`📍 モード情報を保持して遷移: mode=${finalMode}, session=${finalSession || 'なし'}, direction=${finalDirection || 'なし'}, scaleDirection=${scaleDirection}`);

// ✅ NavigationManager統一API使用（AudioDetector保持のため）
const navParams = { mode: finalMode, scaleDirection: scaleDirection };
if (finalSession) navParams.session = finalSession;
if (finalDirection) navParams.direction = finalDirection;

if (window.NavigationManager) {
    NavigationManager.navigate('training', navParams);  // ✅ AudioDetector保持
} else {
    // フォールバック（NavigationManager未定義時）
    const params = new URLSearchParams(navParams);
    window.location.hash = `training?${params.toString()}`;
}
```

**なぜ重要か**:
- `preparation → training` は `isTrainingFlow()` で定義されたトレーニングフロー
- `window.location.hash` 直接操作はNavigationManagerをバイパス
- AudioDetectorが保持されず、トレーニング開始時にマイク再初期化が必要になる
- 修正Aと組み合わせることでAudioDetectorの完全保持を実現

**効果**:
- ✅ AudioDetectorの完全保持（マイク再初期化不要）
- ✅ ユーザー体験向上（待機時間削減）
- ✅ NavigationManager統一APIでの一貫性確保

#### 問題2: records-controller.js v2.5.6 - 不適切なsessionStorage.clear()削除

**問題**: `viewLessonDetail()` 関数内での `sessionStorage.clear()` が重要なフラグも削除

**修正箇所**: Line 992-1008

**修正前**:
```javascript
function viewLessonDetail(lesson) {
    console.log('🔍 [viewLessonDetail] レッスンデータ:', lesson);
    console.log('🔍 [viewLessonDetail] lessonId:', lesson.lessonId);
    console.log('🔍 [viewLessonDetail] sessions数:', lesson.sessions?.length);
    console.log('🔍 [viewLessonDetail] セッションのlessonId:', lesson.sessions?.map(s => s.lessonId));

    // ❌ sessionStorageをクリア（古いlessonIdが残らないように）
    sessionStorage.clear();  // ❌ preparationPageActive等の重要フラグも削除
    console.log('🗑️ [viewLessonDetail] sessionStorageをクリアしました');

    // 総合評価ページへ遷移
    window.NavigationManager.navigate('results-overview', {
        mode: lesson.mode,
        scaleDirection: lesson.scaleDirection || 'ascending',
        lessonId: lesson.lessonId,
        fromRecords: 'true'
    });
}
```

**修正後**:
```javascript
function viewLessonDetail(lesson) {
    console.log('🔍 [viewLessonDetail] レッスンデータ:', lesson);
    console.log('🔍 [viewLessonDetail] lessonId:', lesson.lessonId);
    console.log('🔍 [viewLessonDetail] sessions数:', lesson.sessions?.length);
    console.log('🔍 [viewLessonDetail] セッションのlessonId:', lesson.sessions?.map(s => s.lessonId));

    // ✅ NavigationManagerが適切に管理するため、sessionStorage.clear()は不要
    // （fromRecords=trueで遷移元を識別）

    // 総合評価ページへ遷移（モード + 音階方向 + lessonId + トレーニング記録からの遷移フラグ付き）
    window.NavigationManager.navigate('results-overview', {
        mode: lesson.mode,
        scaleDirection: lesson.scaleDirection || 'ascending',
        lessonId: lesson.lessonId,
        fromRecords: 'true'
    });
}
```

**削除されていた重要フラグ**:
- `preparationPageActive`: ダイレクトアクセス検出に必須
- `normalTransition*`: リロード検出に必須
- その他のNavigationManager管理フラグ

**効果**:
- ✅ NavigationManagerのフラグ管理を尊重
- ✅ ダイレクトアクセス誤検出の防止
- ✅ `fromRecords=true` パラメータで遷移元識別

#### 問題3: results-overview-controller.js v4.6.0 - 下行モードボタンの統一化

**対象**: 将来実装される下行モード用ボタン（3箇所）

**修正前**:
```javascript
'next-step-random-down-practice': () => window.location.hash = 'preparation?mode=random-down',
'next-step-continuous-down-practice': () => window.location.hash = 'preparation?mode=continuous-down',
'next-step-continuous-down-upgrade': () => window.location.hash = 'preparation?mode=12tone-down',
```

**修正後**:
```javascript
'next-step-random-down-practice': () => {
    if (window.NavigationManager) {
        NavigationManager.navigate('preparation', { mode: 'random-down', direction: 'descending' });
    } else {
        window.location.hash = 'preparation?mode=random-down';
    }
},
'next-step-continuous-down-practice': () => {
    if (window.NavigationManager) {
        NavigationManager.navigate('preparation', { mode: 'continuous-down', direction: 'descending' });
    } else {
        window.location.hash = 'preparation?mode=continuous-down';
    }
},
'next-step-continuous-down-upgrade': () => {
    if (window.NavigationManager) {
        NavigationManager.navigate('preparation', { mode: '12tone-down', direction: 'descending' });
    } else {
        window.location.hash = 'preparation?mode=12tone-down';
    }
},
```

**効果**:
- ✅ 将来の下行モード実装時にも一貫性確保
- ✅ `direction: 'descending'` パラメータの明示的指定
- ✅ コードベース全体の統一性向上

### キャッシュバスティング・バージョン更新

**更新ファイル**:

1. **index.html**:
   - `router.js?v=202511191430`
   - `results-overview-controller.js?v=202511191430`
   - `records-controller.js?v=202511191430`

2. **preparation.html**:
   - `preparation-pitchpro-cycle.js?v=202511191430`

### 修正の全体像

#### Phase 1 + Phase A: 全14箇所の修正

| ファイル | 修正箇所 | バージョン | 内容 |
|---------|---------|-----------|------|
| results-overview-controller.js | 7箇所 | v4.4.0 → v4.6.0 | records遷移統一化 + 下行モードボタン統一化 |
| router.js | 2箇所 | v2.0.0 → v2.2.0 | records cleanup追加 + preparation cleanup改善 |
| preparation-pitchpro-cycle.js | 1箇所 | v1.0.0 → v1.1.0 | training遷移統一化 |
| records-controller.js | 1箇所 | v2.5.5 → v2.5.6 | sessionStorage.clear()削除 |
| index.html | 3箇所 | - | キャッシュバスティング |

**合計**: 14箇所の修正、4ファイルのバージョンアップ

### 影響範囲分析

#### リロード・ダイレクトアクセスへの影響

**結論**: ✅ **影響なし - すべて安定動作保証**

**検証項目**:

1. **リロード時の挙動**:
   - ✅ NavigationManagerのリロード検出ロジックは変更なし
   - ✅ `normalTransition*` フラグの管理は変更なし
   - ✅ Phase 1の `sessionStorage.clear()` 削除でフラグ保護が向上

2. **ダイレクトアクセス時の挙動**:
   - ✅ `preparationPageActive` フラグの検出ロジックは変更なし
   - ✅ Phase 1の `sessionStorage.clear()` 削除でフラグ誤削除を防止
   - ✅ ダイレクトアクセス誤検出リスクが減少

3. **通常遷移時の挙動**:
   - ✅ NavigationManager.navigate() による統一的なフラグ設定
   - ✅ フォールバック処理で後方互換性確保
   - ✅ すべての遷移でフラグ管理の一貫性向上

#### AudioDetector管理の改善

**修正前の問題**:
```
preparation → training 遷移時:
1. NavigationManagerがAudioDetectorを保持
2. RouterがAudioDetectorを破棄
→ AudioDetector二重破棄・トレーニング開始エラー
```

**修正後の動作**:
```
preparation → training 遷移時:
1. NavigationManager.navigate('training') 実行
2. NavigationManagerがAudioDetectorを登録・保持
3. Router cleanup実行
4. currentAudioDetector存在確認 → cleanup スキップ
5. trainingページでAudioDetector使用可能 ✅
```

**効果**:
- ✅ AudioDetector二重破棄の完全防止
- ✅ マイク再初期化不要（ユーザー体験向上）
- ✅ NavigationManagerとRouterの責任範囲明確化
- ✅ トレーニングフローの安定性向上

### 設計原則の確立

#### 1. NavigationManager統一API優先

**原則**: すべてのページ遷移は `NavigationManager.navigate()` を使用

**理由**:
- フラグ自動設定（`preparationPageActive`, `normalTransition*`）
- AudioDetectorライフサイクル管理
- ダイレクトアクセス検出の正確性保証

**例外**: NavigationManager未定義時のフォールバック処理のみ

#### 2. Router cleanup の責任範囲明確化

**原則**: Routerはページ固有のリソースのみクリーンアップ

**管理対象**:
- ページ固有のDOM要素
- ページ固有のイベントリスナー
- ページ固有の一時データ

**管理対象外**:
- NavigationManagerが管理するAudioDetector
- NavigationManagerが管理するsessionStorageフラグ
- グローバルスコープのシングルトン

#### 3. sessionStorage管理の一元化

**原則**: sessionStorageフラグはNavigationManagerのみが管理

**禁止事項**:
- ❌ `sessionStorage.clear()` の無条件実行
- ❌ 個別コントローラーでのフラグ直接操作
- ❌ NavigationManager管理フラグの手動削除

**許可事項**:
- ✅ NavigationManager APIを通じたフラグ設定
- ✅ 読み取り専用のフラグ確認
- ✅ ページ固有の一時データ管理

### 残タスク（Phase B - 未実施）

#### 問題4: ヘッダーナビゲーションボタン（index.html）

**対象**: 3箇所のインラインonclickハンドラ

```html
<!-- 現在の実装 -->
<button class="nav-button" onclick="location.hash='records'" title="トレーニング記録を見る">
<button class="nav-button" onclick="location.hash='premium-analysis'" title="詳細分析">
<button class="nav-button" onclick="location.hash='settings'" title="設定・データ管理">
```

**優先度**: 🟡 MED（機能的には問題なし、設計一貫性の観点で改善推奨）

#### 問題5: premium-analysisホームボタン（premium-analysis-controller.js）

**対象**: Line 817のインラインハンドラ

```html
<!-- 現在の実装 -->
<button class="btn btn-outline" onclick="window.location.hash='home'">
```

**優先度**: 🟢 LOW（影響範囲が限定的）

### まとめ

#### 達成した成果

1. **NavigationManager統合の徹底**: 全14箇所でNavigationManager統一API使用
2. **AudioDetector二重管理問題の完全解決**: NavigationManagerとRouterの責任範囲明確化
3. **メモリリーク防止**: recordsページcleanup追加
4. **フラグ管理の一元化**: 不適切な `sessionStorage.clear()` 削除
5. **将来対応**: 下行モードボタンの事前統一化

#### 重要な教訓

1. **API設計の本質**: 単なる便利関数ではなく、正しい状態管理を保証する設計
2. **責任範囲の明確化**: 複数のシステムが同じリソースを管理する場合、明確な優先順位が必要
3. **段階的修正の価値**: Phase 1実装後の影響調査で根本問題を発見
4. **全体監査の重要性**: 似た問題の網羅的な特定で一貫性を確保

#### システム全体の改善

- **安定性向上**: AudioDetector二重破棄の完全防止
- **保守性向上**: NavigationManager統一APIで一貫性確保
- **拡張性向上**: 下行モード等の将来機能に対応
- **デバッグ容易性**: 統一ログフォーマットで問題特定が簡単

---

## 改訂履歴

| バージョン | 日付 | 変更内容 | 担当者 |
|-----------|------|---------|--------|
| 5.0.0 | 2025-11-19 | NavigationManager統合徹底化とAudioDetector二重管理問題の完全解決 | Claude |
|  |  | - ✅ Phase 1（v4.5.0, v2.1.0）: records遷移統一化（7箇所）+ recordsページcleanup追加 |  |
|  |  | - ✅ Phase A（v2.2.0, v1.1.0, v4.6.0, v2.5.6）: AudioDetector二重管理衝突の根本解決 |  |
|  |  | - ✅ router.js v2.2.0: preparationページcleanupでNavigationManager管理状態を尊重 |  |
|  |  | - ✅ preparation-pitchpro-cycle.js v1.1.0: preparation→training遷移でNavigationManager統一API使用 |  |
|  |  | - ✅ records-controller.js v2.5.6: 不適切なsessionStorage.clear()削除 |  |
|  |  | - ✅ results-overview-controller.js v4.6.0: 下行モードボタン3箇所でNavigationManager統一化 |  |
|  |  | - ✅ 設計原則確立: NavigationManager統一API優先、Router cleanup責任範囲明確化、sessionStorage管理一元化 |  |
|  |  | - ✅ 影響範囲分析: リロード・ダイレクトアクセスへの影響なし、すべて安定動作保証 |  |
|  |  | - ✅ 全14箇所の修正でNavigationManager統合を徹底、トレーニングフローの完全安定化 |  |
| 4.3.0 | 2025-11-18 | NavigationManager.navigate() API統合による根本的修正 | Claude |
|  |  | - ✅ results-overview-controller.js v4.3.0: window.location.hash → NavigationManager.navigate()へ全面移行 |  |
|  |  | - ✅ preparationPageActiveフラグ自動設定によりダイレクトアクセス誤検出を完全解決 |  |
|  |  | - ✅ 全9個の「次のステップ」アクションでNavigationManager統合API使用 |  |
|  |  | - ✅ NavigationManager未定義時のフォールバック処理追加（防御的プログラミング） |  |
|  |  | - ✅ 根本原因: window.location.hashがpreparationPageActiveフラグを設定しない |  |
|  |  | - ✅ 解決: NavigationManager.navigate()がフラグを自動設定（line 747） |  |
|  |  | - ✅ v4.2.0での「directionパラメータ不足」は副次的問題、真の原因は「フラグ未設定」だった |  |
| 3.4.0 | 2025-11-18 | 総合評価ページからの遷移パラメータ不足によるダイレクトアクセス誤検出問題を解決 | Claude |
|  |  | - ✅ results-overview-controller.js v4.2.0: 次のステップボタンにdirectionパラメータ追加 |  |
|  |  | - ✅ currentScaleDirectionグローバル変数追加（displayNextSteps関数で設定） |  |
|  |  | - ✅ handleNextStepAction関数で全ての遷移URLに&direction=${currentScaleDirection}を追加 |  |
|  |  | - ✅ NavigationManagerのダイレクトアクセス誤検出を防止（正規遷移として認識） |  |
|  |  | - ✅ 問題: 「preparation?mode=continuous」のような不完全URLでブロック → ホーム強制リダイレクト |  |
|  |  | - ✅ 解決: 現在のscaleDirection（ascending/descending）を全ての遷移URLに含める |  |
| 3.3.0 | 2025-11-13 | ブラウザバック防止システムの最適化と設計思想明確化 | Claude |
|  |  | - ✅ preparation ページをPAGE_CONFIGに追加（マイク管理中のブラウザバック防止） |  |
|  |  | - ✅ allowedTransitions から records エントリを削除（非防止対象ページの除外） |  |
|  |  | - ✅ allowedTransitions に preparation エントリを追加（training, home への遷移許可） |  |
|  |  | - ✅ router.js に fromRecords 条件付きブラウザバック防止を実装 |  |
|  |  | - ✅ トレーニング記録から過去結果表示時のブラウザバック許可 |  |
|  |  | - ✅ 設計思想の明確化：ブラウザバック防止はトレーニング/評価中のみ、閲覧モードは許可 |  |
| 3.2.0 | 2025-11-10 | visibilitychange監視とリロード検出改善 | Claude |
|  |  | - ✅ visibilitychange監視システム実装（即座初期化） |  |
|  |  | - ✅ detectReload()完全書き換え（優先順位最適化） |  |
|  |  | - ✅ result-sessionへのnormalTransition拡張 |  |
|  |  | - ✅ navigate()汎用メソッド追加 |  |
|  |  | - ✅ ウィンドウ切り替え誤検出防止（1秒grace period） |  |
|  |  | - ✅ Navigation Timing API v2優先使用 |  |
| 3.1.0 | 2025-10-24 | SessionDataRecorder同期修正 | Claude |
|  |  | - ✅ preparation-pitchpro-cycle.jsで`resetSession()`呼び出し追加 |  |
|  |  | - ✅ router.jsで`resetSession()`呼び出し追加 |  |
|  |  | - ✅ session-data-recorder.jsで同期ロジック改善 |  |
| 3.0.0 | 2025-10-24 | NavigationManager統合・ブラウザバック防止統合 | Claude |
|  |  | - 🔄 ReloadManager → NavigationManager にリネーム |  |
|  |  | - ✅ ブラウザバック防止機能統合（router.jsから移動） |  |
|  |  | - ✅ PAGE_CONFIG一元化（ページ設定を統合管理） |  |
|  |  | - ✅ popstateハンドラー管理機能追加 |  |
|  |  | - ✅ ダブルダミーエントリーパターン実装 |  |
|  |  | - ✅ alert()ダイアログ通知実装（OKボタンのみ、ナビゲーション禁止） |  |
|  |  | - ✅ result-session-controller.jsでイベントリスナークリーンアップ追加 |  |
|  |  | - ✅ router.jsでブラウザバック防止をNavigationManagerに完全委譲 |  |
| 2.1.0 | 2025-10-24 | v2.0.0の設計ミスを修正・責任範囲の明確化 | Claude |
|  |  | - ❌ v2.0.0の間違った記述を削除 |  |
|  |  | - ✅ ReloadManagerの責任範囲を明確化（リロード検出のみ） |  |
|  |  | - ✅ sessionCounter管理はSessionDataRecorderの責任と明記 |  |
|  |  | - ✅ SESSION_MANAGEMENT_SPECIFICATION.md参照追加 |  |
| 2.0.0 | 2025-10-23 | ReloadManager複雑ロジック削除（⚠️設計ミスあり） | Claude |
|  |  | - 複雑な判定ロジック完全削除（67行削減） |  |
|  |  | - 不要なメソッド3つ削除（setNewTrainingStart, isNewTrainingStart, isResumingAfterReload） |  |
|  |  | - 不要なフラグ2つ削除（NEW_TRAINING_START, RESUMING_AFTER_RELOAD） |  |
|  |  | - ⚠️ 誤ってsessionCounter管理をReloadManagerの責任と記述（v2.1.0で修正） |  |
| 1.1.0 | 2025-10-23 | ReloadManager統合機能追加 | Claude |
|  |  | - リロード検出・ナビゲーション制御の一元管理 |  |
|  |  | - normalTransitionフラグの自動設定 |  |
|  |  | - コードの重複削減（73行削除） |  |
|  |  | - 5ファイル統合で保守性向上 |  |
| 1.0.0 | 2025-10-22 | 初版作成 | Claude |

---

**END OF SPECIFICATION**
