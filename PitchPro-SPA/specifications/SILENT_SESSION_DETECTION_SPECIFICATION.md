# 無音セッション検出機能 仕様書

**バージョン**: 0.3.0
**作成日**: 2025-11-27
**最終更新**: 2025-11-28
**ステータス**: 設計確定・実装待ち

---

## 0. 暫定措置（実装済み）

### 0.1 概要

無音セッション検出機能の本格実装前に、無音データの**表示問題**を暫定的に対応した。
将来的に本機能が実装されれば、無音セッションは保存されなくなるため、この暫定措置は「既存の汚染データ」への対処として残る。

### 0.2 実装済み内容（2025-11-28）

| ファイル | バージョン | 対応内容 |
|---------|----------|---------|
| `evaluation-calculator.js` | v2.2.0 | `avgError=null`時に`level:'invalid'`を返す |
| `DistributionChart.js` | v1.1.0 | 無音データを評価分布から除外（カウントしない） |
| `results-overview-controller.js` | v4.16.0 | 誤差推移グラフで無音セッションは`null`（線が途切れる） |
| `result-session-controller.js` | v3.5.1 | 全無音時のセッション評価表示対応 |

### 0.3 セッション評価ページ（ランダム基音モード）の表示

#### 全無音の場合（8音すべて無音）

| 項目 | 表示 |
|------|------|
| **ランクバッジ** | Practice（赤背景）+ mic-off アイコン（グレー） |
| **メッセージ** | 「音声が検出されませんでした」 |
| **平均誤差** | 「---」 |
| **アラート** | 「音声が検出されませんでした。マイクの設定や周囲の環境をご確認ください。」 |
| **評価分布** | total=0（全て0%表示） |
| **音別詳細** | 全て「---」+ mic-off アイコン + グレー背景 |

#### 一部無音の場合（例: 8音中3音が無音）

| 項目 | 表示 |
|------|------|
| **ランクバッジ** | 有効データ（5音）の平均誤差で評価 |
| **平均誤差** | 有効データの平均値（例: ±25.3¢） |
| **アラート** | 「8音中3音で音声が検出されませんでした。」 |
| **評価分布** | 有効データ（5音）のみで計算 |
| **音別詳細** | 無音は「---」、有効データは通常表示 |

### 0.4 総合評価ページの表示

#### 評価分布グラフ
- 無音データは**除外**（評価不能のためカウントしない）
- 有効データのみで Excellent/Good/Pass/Practice の分布を計算

#### 誤差推移グラフ
- 無音セッション（全データnull）は `null` を返す
- Chart.js は `null` の点を線で結ばない（途切れる）
- 有効データがあるセッションのみ点をプロット

#### セッショングリッド
- 全無音セッション: `session-invalid` クラス + mic-off アイコン
- 有効データありセッション: 通常の評価バッジ（Excellent/Good/Pass/Practice）

### 0.5 設計方針

**B案を採用**: Practiceバッジを流用
- Invalidバッジを新規追加するとUIが複雑になる
- 「練習が必要」という意味でPracticeは妥当
- mic-off アイコンで無音であることを視覚的に表現
- アラートで詳細メッセージを表示

---

## 1. 背景と目的

### 1.1 問題の発見

ドレミガイド中に無音（歌わなかった）場合、以下の問題が発生していた：

1. **誤差0として記録される問題**（✅ 修正済み）
   - 無音時、`detectedFrequency = 0` → `errorInCents = 0`（完璧）として記録
   - 全てExcellent評価になるバグ
   - **対応**: `errorInCents = null`で記録し、評価から除外（コミット `db3ed04`）

2. **無音データの表示問題**（✅ 暫定措置済み - セクション0参照）
   - 全無音時に評価が正しく表示されない問題
   - **対応**: セクション0の暫定措置を実装

3. **無効なセッションが履歴に残る問題**（⏳ 未対応 - 本機能で対応予定）
   - 無音のままトレーニングが進行した場合、意味のないデータが保存される
   - 履歴・統計が汚染される

### 1.2 相対音感トレーニングの観点

ドレミガイドは「ド→レ→ミ→ファ→ソ→ラ→シ→ド」と**連続して音程を歌う**トレーニング。

**1音でも無音があった場合の影響:**
```
例: 「ミ」が無音だった場合
ド → レ → (無音) → ファ → ソ → ラ → シ → ド

- 「レ→ミ」の音程感覚が練習できていない
- 「ミ→ファ」の音程感覚も練習できていない
- 連続性が途切れている = トレーニングとして不完全
```

**結論**: 1音でも無音があれば、そのセッションは相対音感トレーニングとして成立していない。

### 1.3 目的

- 無音セッションを検出し、ユーザーに通知する
- ユーザーに継続/中断の選択肢を提供する
- 無効なデータが履歴に蓄積されることを防ぐ

---

## 2. 機能要件（v0.3.0 確定版）

### 2.1 検出タイミング

| 項目 | 仕様 |
|-----|------|
| 検出タイミング | **1セッション（8音）終了後** |
| 検出条件 | **4音以上が無効**（`errorInCents === null`） |
| 検出対象 | 全トレーニングモード（ランダム/連続/12音階） |

**閾値の理由（v0.3.0で確定）**:
- **1-3音無音**: タイミングミス・緊張など「実力」として記録する価値がある
- **4音以上無音**: 半分以上欠損 = トレーニングとして成立しない → 中断
- **全8音無音**: 放置・マイク故障・環境問題 → 完全に無効

### 2.2 動作仕様（シンプル版）

**4音以上無音検出時の動作:**

```
セッション完了
  → handleSessionComplete()
  → 無音チェック（4音以上?）
    → Yes: タイマーキャンセル
           → cleanupIncompleteLesson()（データ削除）
           → sessionStorageにフラグ設定
           → NavigationManager.navigate('home')
           → ホームでアラート表示
    → No: 通常処理（保存・遷移）
```

**選択肢は不要**:
- 「続ける」「やめる」のダイアログは実装しない
- 4音以上無音 = トレーニング不成立なので、自動でホームへ戻す
- やめたい場合は既存のフッターホームボタンで対応可能

### 2.3 ホーム遷移後のアラート表示

```javascript
// ホーム初期化時
const silentData = sessionStorage.getItem('silentSessionDetected');
if (silentData) {
    sessionStorage.removeItem('silentSessionDetected');
    const { invalidCount, totalNotes } = JSON.parse(silentData);
    alert(`音声が検出されなかったため、トレーニングを中断しました。\n\n${totalNotes}音中${invalidCount}音で音声が検出されませんでした。\nマイクの設定や周囲の環境をご確認ください。`);
}
```

### 2.4 モード別動作（統一）

| モード | 4音以上無音時の動作 |
|-------|------------------|
| **ランダム基音** | ホームへ戻る + アラート表示 |
| **連続チャレンジ** | ホームへ戻る + アラート表示 |
| **12音階** | ホームへ戻る + アラート表示 |

**全モード共通**: 選択肢なし、自動でホームへ戻る

### 2.5 1-3音無音の場合

- **保存する**（現状の暫定措置で対応済み）
- 無音の音は `errorInCents = null` として記録
- 評価は有効データのみで計算
- セッション評価・総合評価ページで適切に表示（セクション0参照）

---

## 3. 技術仕様（v0.3.0 確定版）

### 3.1 無効データの判定

```javascript
// handleSessionComplete() 内で判定
const currentSession = sessionRecorder?.getCurrentSession();
if (currentSession?.pitchErrors) {
    const invalidCount = currentSession.pitchErrors.filter(e => e.errorInCents === null).length;
    if (invalidCount >= 4) {
        // 4音以上無音 → 中断処理
    }
}
```

### 3.2 処理フロー

```
変更後のフロー:
ドレミガイド完了
  → handleSessionComplete()
  → ページ離脱チェック（既存）
  → 無音チェック（4音以上?）
    → 4音以上無音:
        → nextSessionTimeoutId をキャンセル
        → sessionStorage にフラグ設定
        → cleanupIncompleteLesson()
        → NavigationManager.navigate('home')
        → return（以降の処理スキップ）
    → 3音以下:
        → 通常処理（保存・遷移）
```

### 3.3 変更対象ファイル

| ファイル | 変更内容 | 難易度 | 工数 |
|---------|---------|-------|------|
| `trainingController.js` | `handleSessionComplete()`に無音判定追加 | 低 | 15分 |
| `router.js` または `index.html` | ホーム初期化時にアラート表示 | 低 | 15分 |
| **合計** | | | **30分** |

**不要になった変更:**
- ~~`training.html` ダイアログHTML~~ → 不要
- ~~`training.css` ダイアログスタイル~~ → 不要
- ~~`session-data-recorder.js` メソッド追加~~ → 不要

### 3.4 実装コード（確定版）

```javascript
// trainingController.js - handleSessionComplete() 冒頭に追加
function handleSessionComplete() {
    // 【v4.0.40追加】ページ離脱チェック
    if (!isInitialized) {
        console.log('🛑 [handleSessionComplete] ページ離脱検出 - 処理をスキップ');
        return;
    }

    // 【v4.6.0追加】無音セッション検出（4音以上無音で中断）
    const currentSession = sessionRecorder?.getCurrentSession();
    if (currentSession?.pitchErrors) {
        const invalidCount = currentSession.pitchErrors.filter(e => e.errorInCents === null).length;
        if (invalidCount >= 4) {
            console.log(`🔇 無音検出: ${invalidCount}/8音 - トレーニング中断`);

            // タイマーキャンセル（連続モード用）
            if (nextSessionTimeoutId) {
                clearTimeout(nextSessionTimeoutId);
                nextSessionTimeoutId = null;
            }

            // フラグ設定（ホームでアラート表示用）
            sessionStorage.setItem('silentSessionDetected', JSON.stringify({
                invalidCount: invalidCount,
                totalNotes: 8
            }));

            // クリーンアップ + ホーム遷移
            cleanupIncompleteLesson();
            if (window.NavigationManager) {
                window.NavigationManager.navigate('home');
            } else {
                window.location.hash = 'home';
            }
            return;
        }
    }

    console.log('✅ トレーニング完了');
    // 以降は通常処理...
}
```

```javascript
// router.js または index.html - ホーム初期化時に追加
function checkSilentSessionAlert() {
    const silentData = sessionStorage.getItem('silentSessionDetected');
    if (silentData) {
        sessionStorage.removeItem('silentSessionDetected');
        const { invalidCount, totalNotes } = JSON.parse(silentData);

        // 少し遅延してから表示（ページ遷移完了後）
        setTimeout(() => {
            alert(`音声が検出されなかったため、トレーニングを中断しました。\n\n${totalNotes}音中${invalidCount}音で音声が検出されませんでした。\nマイクの設定や周囲の環境をご確認ください。`);
        }, 100);
    }
}
```

### 3.5 デバッグ用スキップフラグ

開発時に無音検出を無効化するためのフラグ:

```javascript
// trainingController.js
const DEBUG_SKIP_SILENT_CHECK = localStorage.getItem('debug_skipSilentCheck') === 'true';

// 無音チェック部分
if (!DEBUG_SKIP_SILENT_CHECK && invalidCount >= 4) {
    // 中断処理
}
```

**開発者コンソールで設定:**
```javascript
localStorage.setItem('debug_skipSilentCheck', 'true');  // 無効化
localStorage.setItem('debug_skipSilentCheck', 'false'); // 有効化（デフォルト）
```

---

## 4. リスクと対策

### 4.1 リスク一覧

| リスク | 影響度 | 発生確率 | 対策 |
|-------|-------|---------|------|
| **連続モードの自動継続タイマーとの競合** | 高 | 高 | ダイアログ表示前にタイマーをキャンセル |
| **モード別分岐の複雑化** | 中 | 中 | 共通処理を関数化、モード別は最小限に |
| **ダイアログ表示中の状態管理** | 中 | 中 | AudioDetector停止済み確認、フラグ管理 |
| **「続ける」時のセッションカウント** | 中 | 低 | 保存しないので自動的にカウントされない |
| **既存の2フラグシステムとの整合性** | 低 | 低 | ダイアログ中もページアクティブ状態維持 |

### 4.2 最大リスク: 連続モードの自動継続タイマー

**現状のコード** (`trainingController.js` 1443-1454行):
```javascript
nextSessionTimeoutId = setTimeout(() => {
    startTraining(); // 1秒後に次セッション自動開始
}, 1000);
```

**問題**: ダイアログ表示中にタイマーが発火すると、ダイアログを無視して次セッション開始。

**対策**:
```javascript
// handleSessionComplete() の無効判定前にタイマーをキャンセル
if (nextSessionTimeoutId) {
    clearTimeout(nextSessionTimeoutId);
    nextSessionTimeoutId = null;
    console.log('🛑 自動継続タイマーをキャンセル');
}
```

---

## 5. 実装計画（v0.3.0 確定版）

### 5.1 シンプル実装（全モード共通）

| 項目 | 内容 | 工数 |
|------|-----|------|
| **実装** | `handleSessionComplete()`に無音判定追加 | 15分 |
| **実装** | ホーム初期化時にアラート表示追加 | 15分 |
| **テスト** | 各モードで動作確認 | 15分 |
| **合計** | | **45分** |

### 5.2 実装手順

1. `trainingController.js`:
   - `handleSessionComplete()` 冒頭に無音判定追加
   - デバッグ用スキップフラグ追加
2. `router.js` または `index.html`:
   - ホーム初期化時に `checkSilentSessionAlert()` 呼び出し
3. テスト:
   - 4音以上無音 → ホーム遷移 + アラート表示確認
   - 3音以下無音 → 通常処理確認

### 5.3 実装時期

**後回し**: デバッグ効率の観点から、リリース直前に実装予定

理由:
- 実装中は常に声を出す必要があり、開発効率が低下
- デバッグ用スキップフラグで対応可能だが、煩雑
- 実装自体は30分程度で完了するため、後回しでもリスクなし

---

## 6. 代替案

### 6.1 案A: セッション終了後ダイアログ（本仕様）

- **メリット**: シンプル、確実な判定
- **デメリット**: 8音歌った後に「無効でした」と通知

### 6.2 案B: リアルタイム警告（小さな表示）

- セッション中に無音を検出したら、画面に小さな警告表示
- セッション終了後に無効率が高ければダイアログ

```
[ドレミガイド進行中]
  ド ✓  レ ✓  ミ ⚠️  ファ ✓  ...
                ↑
           「音声未検出」
```

- **メリット**: リアルタイムフィードバック
- **デメリット**: 実装複雑、UIが煩雑になる可能性

### 6.3 案C: 閾値方式

- 無効率50%以上（4音以上が無音）の場合のみダイアログ
- 少数の無音は許容して保存

- **メリット**: 軽微な問題は無視できる
- **デメリット**: 相対音感トレーニングの連続性を考えると、1音でも欠落は問題

---

## 7. 決定事項（v0.3.0 確定）

| 項目 | 決定内容 | 理由 |
|-----|----------|------|
| 検出タイミング | セッション終了後 | リアルタイムは不安定 |
| 検出条件 | **4音以上無効** | 1-3音は実力として記録、4音以上は不成立 |
| 選択肢 | **なし（自動ホーム遷移）** | 4音以上 = 不成立、続ける意味なし |
| アラート表示 | ホーム遷移後にalert() | トレーニング中断理由を説明 |
| 既存機能流用 | `cleanupIncompleteLesson()` | フッターホームボタンと同じ処理 |
| 実装時期 | **リリース直前** | デバッグ効率の観点 |

---

## 8. 更新履歴

| 日付 | バージョン | 内容 |
|-----|----------|------|
| 2025-11-28 | 0.3.0 | 設計確定版。閾値を4音以上に変更、選択肢を廃止、シンプル実装に変更 |
| 2025-11-28 | 0.2.0 | 暫定措置（セクション0）を追加。表示問題の対応を実装・文書化 |
| 2025-11-27 | 0.1.0 | 初版作成（ドラフト） |
