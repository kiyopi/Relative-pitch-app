# ナビゲーション・リソース管理仕様書

**バージョン**: 1.0.0
**作成日**: 2025-10-22
**対象**: PitchPro-SPA（8va相対音感トレーニングアプリ）

---

## 📋 目次

1. [概要](#概要)
2. [用語定義](#用語定義)
3. [現状分析](#現状分析)
4. [仕様設計](#仕様設計)
5. [実装計画](#実装計画)
6. [テスト仕様](#テスト仕様)
7. [付録](#付録)

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
            if (window.sessionDataRecorder) {
                const currentSession = window.sessionDataRecorder.getCurrentSession();
                if (currentSession && !currentSession.completed) {
                    console.warn('⚠️ 未完了セッションあり - 途中データは破棄されます');
                    // 今後の実装: 自動保存機能を追加する場合はここで保存
                }
                window.sessionDataRecorder.resetSession();
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
| 1.0.0 | 2025-10-22 | 初版作成 | Claude |

---

**END OF SPECIFICATION**
