# ナビゲーション・リソース管理仕様書

**バージョン**: 2.0.0
**作成日**: 2025-10-22
**最終更新**: 2025-10-23
**対象**: PitchPro-SPA（8va相対音感トレーニングアプリ）

---

## 📋 目次

1. [概要](#概要)
2. [用語定義](#用語定義)
3. [現状分析](#現状分析)
4. [仕様設計](#仕様設計)
5. [実装計画](#実装計画)
6. [ReloadManager統合（v2.0.0 大幅シンプル化）](#reloadmanager統合v200-大幅シンプル化)
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

## ReloadManager統合（v2.1.0 責任範囲の明確化）

### 概要

**実装日**: 2025-10-23
**最終更新**: 2025-10-24（v2.1.0 責任範囲明確化）
**目的**: リロード検出・ナビゲーション制御の一元管理

従来、リロード検出関連のコードが複数ファイルに散在し、`normalTransitionToTraining`フラグの設定漏れリスクがあった。ReloadManagerクラスを導入することで、コードの一元管理・保守性向上・設定漏れ防止を実現。

**v2.1.0での責任範囲明確化**:
コードレビューにより、ReloadManagerの責任範囲を明確化：
- **ReloadManagerの唯一の責任: リロード検出とマイク許可再取得**
- **sessionCounter管理は SessionDataRecorder の責任**
- **localStorage管理も SessionDataRecorder の責任**
- **リロード検出は preparation へのリダイレクトのためだけに使用**

v2.0.0で誤って ReloadManager に sessionCounter 管理の記述があったが、これは設計ミスであり削除。
SessionDataRecorder が正しく sessionCounter を管理する設計に修正。

### アーキテクチャ

```
ReloadManager (グローバルクラス) v2.0.0
├── setNormalTransition()       - 正常な遷移フラグを設定
├── detectReload()              - リロード検出
├── showReloadDialog()          - ダイアログ表示
├── redirectToPreparation()     - preparationへリダイレクト
├── navigateToTraining()        - trainingへ遷移（★フラグ自動設定）
└── createRedirectError()       - リダイレクトエラー生成

【v2.0.0で削除されたメソッド】
❌ setNewTrainingStart()        - 新規開始フラグ設定（不要）
❌ isNewTrainingStart()         - 新規開始フラグ確認（不要）
❌ isResumingAfterReload()      - リロード復帰確認（不要）
```

### クラス定義

**ファイル**: `/PitchPro-SPA/js/reload-manager.js`
**バージョン**: 2.0.0

```javascript
/**
 * ReloadManager - リロード検出・遷移管理システム
 *
 * 【目的】
 * - trainingページへの遷移時のリロード検出を一元管理
 * - リロード時は preparation へリダイレクトしてマイク許可を再取得
 * - normalTransitionフラグの設定漏れを防止
 * - コードの重複を削減し、保守性を向上
 *
 * 【責任範囲】v2.1.0
 * - リロード検出（detectReload）
 * - マイク許可再取得のための preparation リダイレクト
 * - normalTransition フラグ管理
 *
 * 【責任範囲外】
 * - sessionCounter 管理 → SessionDataRecorder の責任
 * - localStorage 管理 → SessionDataRecorder の責任
 * - トレーニングフロー制御 → trainingController.v2.js の責任
 *
 * @version 2.1.0
 * @date 2025-10-24
 */
class ReloadManager {
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
}
```

### 統合したファイル

| ファイル | 変更内容 | メリット |
|---------|---------|---------|
| **index.html** | `reload-manager.js` 読み込み追加 | グローバルに利用可能 |
| **trainingController.v2.js** | `detectReload()` 削除、`ReloadManager.detectReload()` 使用 | 78行削減 |
| **result-session-controller.js** | `ReloadManager.navigateToTraining()` 使用 | フラグ設定自動化 |
| **router.js** | `ReloadManager.navigateToTraining()` 使用 | フラグ設定自動化 |
| **preparation-pitchpro-cycle.js** | `ReloadManager.navigateToTraining()` 使用 (2箇所) | 統一性向上 |

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

**ReloadManager統合後（✅ 自動設定）**:
```javascript
// result-session-controller.js
button.onclick = () => {
    // ✅ フラグが自動設定される
    ReloadManager.navigateToTraining();
};
```

#### 2. モード・セッション情報付き遷移

```javascript
// preparation-pitchpro-cycle.js
const redirectInfo = window.preparationRedirectInfo;
if (redirectInfo && redirectInfo.redirect === 'training') {
    // モード情報を保持して遷移
    ReloadManager.navigateToTraining(redirectInfo.mode, redirectInfo.session);
} else {
    // 通常フロー
    ReloadManager.navigateToTraining();
}
```

#### 3. trainingController でのリロード検出・初期化処理

**従来の実装（❌ 複雑な判定ロジック）**:
```javascript
// trainingController.v2.js (v1.1.0 - 複雑な判定）
function detectReload() { /* ... 55行のコード ... */ }
function redirectToPreparationWithMode(reason = '') { /* ... 18行のコード ... */ }

export async function initializeTrainingPage() {
    if (ReloadManager.detectReload()) {
        ReloadManager.showReloadDialog();
        await ReloadManager.redirectToPreparation('リロード検出');
        throw ReloadManager.createRedirectError();
    }

    // 複雑な判定ロジック（約30行）
    const isNewStart = ReloadManager.isNewTrainingStart();
    const isResuming = ReloadManager.isResumingAfterReload();
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

**ReloadManager v2.1.0（✅ 正しい責任分担）**:
```javascript
// trainingController.v2.js (v2.1.0 - 正しい責任分担)
export async function initializeTrainingPage() {
    // 【ReloadManager の責任】リロード検出 → preparationへリダイレクト
    if (ReloadManager.detectReload()) {
        console.warn('⚠️ リロード検出 - preparationへリダイレクト');
        ReloadManager.showReloadDialog();
        await ReloadManager.redirectToPreparation('リロード検出');
        throw ReloadManager.createRedirectError();
    }

    // 音域データ必須チェック
    if (!checkVoiceRangeData()) {
        console.error('❌ 音域データが設定されていません');
        alert('音域テストを先に完了してください。');
        await ReloadManager.redirectToPreparation('音域テスト未完了');
        return;
    }

    // 【重要】sessionCounter 管理は SessionDataRecorder が担当
    // - startNewSession() で自動インクリメント
    // - localStorage と自動同期
    // - ReloadManager は一切関与しない

    // 基音選択（毎回必須）
    preselectBaseNote();

    // 以降の初期化処理...
}
```

**詳細な仕様は `SESSION_MANAGEMENT_SPECIFICATION.md` を参照**

### メリット

| 項目 | v1.0.0（従来） | v1.1.0（統合） | v2.0.0（シンプル化） |
|------|-------------|-------------|-------------------|
| **コードの一元管理** | 5ファイルに散在 | 1ファイルに集約 | 同左（さらに簡素化） |
| **設定漏れリスク** | 手動設定（5箇所） | 自動設定 | 同左 |
| **重複コード** | 73行の重複 | 0行（完全削除） | 同左 |
| **複雑な判定ロジック** | 各所に散在 | 一元管理 | **完全削除（67行削減）** |
| **保守性** | 低（変更時に5箇所修正必要） | 高（1箇所のみ） | **最高（シンプル設計）** |
| **テスト容易性** | 困難（5ファイル依存） | 容易（単一クラス） | 同左 |

**v2.0.0での追加削減**:
- ReloadManager: 不要なメソッド3つ削除
- trainingController.v2.js: 複雑な判定ロジック30行削除
- router.js, preparation-pitchpro-cycle.js: フラグ設定処理削除
- **合計**: 67行削減（v1.1.0 → v2.0.0）

### sessionStorage フラグ管理

| フラグ名 | 用途 | 設定タイミング | 削除タイミング | 状態 |
|---------|------|-------------|-------------|------|
| `normalTransitionToTraining` | 正常な遷移を識別 | `navigateToTraining()` 実行時 | `detectReload()` で確認後 | ✅ v2.0.0でも使用 |
| `reloadRedirected` | 2回目の検出を防止 | リロード検出時 | 2回目の `detectReload()` で確認後 | ✅ v2.0.0でも使用 |
| ~~`resumingAfterReload`~~ | ~~リロード復帰を識別~~ | ~~リダイレクト時~~ | ~~判定後~~ | ❌ v2.0.0で削除 |
| ~~`newTrainingStart`~~ | ~~新規開始を識別~~ | ~~home等から遷移時~~ | ~~判定後~~ | ❌ v2.0.0で削除 |

### フロー図

#### v2.1.0 正しい責任分担フロー

```
【trainingページでリロード（F5）】
training ページ（セッション2実行中）
  ↓
F5キー（リロード）
  ↓
trainingController.v2.js - initializeTrainingPage()
  ↓
【ReloadManager の責任】
ReloadManager.detectReload()
  ├─ normalTransition フラグ確認 → null
  ├─ performance.navigation.type === 1 → リロード検出
  ├─ sessionStorage.setItem('reloadRedirected', 'true')
  └─ return true
  ↓
ReloadManager.showReloadDialog()  ← ダイアログ表示
  ↓
ReloadManager.redirectToPreparation('リロード検出')
  ↓
#preparation へリダイレクト（マイク許可再取得）
```

**セッション管理の詳細フローは `SESSION_MANAGEMENT_SPECIFICATION.md` を参照**

#### v2.1.0での重要な修正点

1. **責任範囲の明確化**
   - ReloadManager: リロード検出とマイク許可再取得のみ
   - SessionDataRecorder: sessionCounter 管理と localStorage 管理
   - trainingController.v2.js: トレーニングフロー制御

2. **v2.0.0の設計ミスを修正**
   - ❌ 削除: "training ページへの遷移 = 常にリセット"
   - ❌ 削除: "sessionCounter は自動計算"
   - ✅ 正しい: SessionDataRecorder が startNewSession() で自動++

3. **リロード検出の役割**
   - preparation へのリダイレクトのみ
   - sessionCounter 管理には一切関与しない（v2.0.0で誤った記述があった）

### 今後の拡張可能性

1. **ダイレクトアクセス検出**:
   - `ReloadManager.detectDirectAccess()` メソッド追加
   - URLパラメータの検証・リダイレクト処理

2. **カスタムダイアログ**:
   - `showReloadDialog()` をカスタムモーダルに置き換え

3. **リダイレクト履歴管理**:
   - `sessionStorage` でリダイレクト履歴を記録
   - 無限ループ防止

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

---

## 改訂履歴

| バージョン | 日付 | 変更内容 | 担当者 |
|-----------|------|---------|--------|
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
