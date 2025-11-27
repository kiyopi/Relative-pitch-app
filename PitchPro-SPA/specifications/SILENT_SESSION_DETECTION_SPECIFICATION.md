# 無音セッション検出機能 仕様書

**バージョン**: 0.2.0
**作成日**: 2025-11-27
**最終更新**: 2025-11-28
**ステータス**: 一部実装済み（暫定措置）

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

## 2. 機能要件

### 2.1 検出タイミング

| 項目 | 仕様 |
|-----|------|
| 検出タイミング | **1セッション（8音）終了後** |
| 検出条件 | 1音以上が無効（`errorInCents === null`） |
| 検出対象 | 全トレーニングモード（ランダム/連続/12音階） |

**理由**:
- リアルタイム検出（例: 連続3音無音で停止）は、ノイズを拾って連続判定が不安定になる
- セッション終了後なら、確実に無効音数をカウント可能

### 2.2 ダイアログ表示

無効データが検出された場合、以下のダイアログを表示：

```
┌─────────────────────────────────────────────┐
│  ⚠️ 音声が検出されませんでした              │
│                                             │
│  8音中 3音で音声が検出されませんでした。     │
│  マイクの設定や周囲の環境をご確認ください。   │
│                                             │
│  このセッションのデータは保存されません。     │
│                                             │
│  ┌─────────────┐    ┌─────────────┐        │
│  │   続ける    │    │   やめる    │        │
│  └─────────────┘    └─────────────┘        │
└─────────────────────────────────────────────┘
```

### 2.3 ユーザー選択肢

| 選択 | 動作 |
|-----|------|
| **続ける** | セッションデータを**保存せず**、次のセッションへ進む（または結果ページへ） |
| **やめる** | レッスン全体を中断し、ホームへ戻る（該当レッスンのデータは保存しない） |

### 2.4 モード別動作

| モード | 「続ける」時の動作 | 「やめる」時の動作 |
|-------|------------------|------------------|
| **ランダム基音** | 次セッションへ（結果ページスキップ） | ホームへ戻る |
| **連続チャレンジ** | 次セッションへ自動継続 | ホームへ戻る |
| **12音階** | 次セッションへ自動継続 | ホームへ戻る |

**重要**: 「続ける」を選んでも、**無効なセッションは保存されない**。

---

## 3. 技術仕様

### 3.1 無効データの判定

```javascript
// SessionDataRecorder.completeSession() または handleSessionComplete() 内で判定
function hasInvalidData(session) {
    if (!session.pitchErrors || session.pitchErrors.length === 0) {
        return true; // データなし = 無効
    }

    // 1音でも null があれば無効
    const invalidCount = session.pitchErrors.filter(e => e.errorInCents === null).length;
    return invalidCount > 0;
}

function getInvalidCount(session) {
    if (!session.pitchErrors) return 0;
    return session.pitchErrors.filter(e => e.errorInCents === null).length;
}
```

### 3.2 処理フロー

```
現在のフロー:
ドレミガイド完了
  → handleSessionComplete()
  → sessionRecorder.completeSession() [保存]
  → 遷移（結果ページ or 次セッション or 総合評価）

変更後のフロー:
ドレミガイド完了
  → handleSessionComplete()
  → 無効データチェック
    → 無効あり:
        → ダイアログ表示（非同期待機）
        → 「続ける」: 保存スキップ → 遷移
        → 「やめる」: レッスン中断 → ホームへ
    → 無効なし:
        → sessionRecorder.completeSession() [保存]
        → 遷移
```

### 3.3 変更対象ファイル

| ファイル | 変更内容 | 難易度 |
|---------|---------|-------|
| `trainingController.js` | `handleSessionComplete()`に無効判定・ダイアログ追加 | 中 |
| `session-data-recorder.js` | `hasInvalidData()`メソッド追加（オプション） | 低 |
| `training.html` | ダイアログHTML追加 | 低 |
| `training.css` | ダイアログスタイル追加 | 低 |

### 3.4 ダイアログ実装案

```html
<!-- training.html に追加 -->
<div id="silent-session-dialog" class="modal-overlay" style="display: none;">
    <div class="modal-content">
        <div class="modal-icon">
            <i data-lucide="mic-off" class="text-amber-400"></i>
        </div>
        <h3 class="modal-title">音声が検出されませんでした</h3>
        <p class="modal-message">
            8音中 <span id="invalid-count">0</span>音で音声が検出されませんでした。<br>
            マイクの設定や周囲の環境をご確認ください。
        </p>
        <p class="modal-note">このセッションのデータは保存されません。</p>
        <div class="modal-buttons">
            <button id="silent-dialog-continue" class="btn btn-primary">続ける</button>
            <button id="silent-dialog-quit" class="btn btn-outline">やめる</button>
        </div>
    </div>
</div>
```

```javascript
// trainingController.js に追加
function showSilentSessionDialog(invalidCount, totalNotes) {
    return new Promise((resolve) => {
        const dialog = document.getElementById('silent-session-dialog');
        const countSpan = document.getElementById('invalid-count');
        const continueBtn = document.getElementById('silent-dialog-continue');
        const quitBtn = document.getElementById('silent-dialog-quit');

        countSpan.textContent = invalidCount;
        dialog.style.display = 'flex';

        // Lucideアイコン初期化
        if (typeof window.initializeLucideIcons === 'function') {
            window.initializeLucideIcons({ immediate: true });
        }

        const cleanup = () => {
            dialog.style.display = 'none';
            continueBtn.removeEventListener('click', onContinue);
            quitBtn.removeEventListener('click', onQuit);
        };

        const onContinue = () => {
            cleanup();
            resolve('continue');
        };

        const onQuit = () => {
            cleanup();
            resolve('quit');
        };

        continueBtn.addEventListener('click', onContinue);
        quitBtn.addEventListener('click', onQuit);
    });
}
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

## 5. 実装計画

### 5.1 段階的実装（推奨）

| フェーズ | 内容 | 工数 |
|---------|-----|------|
| **Phase 1** | ランダムモードのみ対応 | 2時間 |
| **Phase 2** | 連続/12音階モード対応 | 2時間 |
| **Phase 3** | テスト・調整 | 1-2時間 |
| **合計** | | **5-6時間** |

### 5.2 Phase 1 詳細（ランダムモードのみ）

1. `training.html` にダイアログHTML追加
2. `training.css` にダイアログスタイル追加
3. `trainingController.js`:
   - `showSilentSessionDialog()` 関数追加
   - `handleSessionComplete()` に無効判定追加（ランダムモードのみ）
4. テスト: 無音でトレーニング → ダイアログ表示確認

### 5.3 Phase 2 詳細（連続/12音階対応）

1. `handleSessionComplete()` のモード分岐を調整
2. 自動継続タイマーのキャンセル処理追加
3. 「続ける」時の次セッション開始ロジック調整
4. テスト: 各モードで無音トレーニング → 正常動作確認

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

## 7. 決定事項（要確認）

| 項目 | 現在の想定 | 確認必要 |
|-----|----------|---------|
| 検出タイミング | セッション終了後 | ✓ |
| 検出条件 | 1音以上無効 | ✓ |
| 「続ける」時の動作 | 保存せず次へ | ✓ |
| 「やめる」時の動作 | レッスン中断、ホームへ | ✓ |
| 実装アプローチ | 段階的（Phase 1-3） | 要確認 |

---

## 8. 更新履歴

| 日付 | バージョン | 内容 |
|-----|----------|------|
| 2025-11-28 | 0.2.0 | 暫定措置（セクション0）を追加。表示問題の対応を実装・文書化 |
| 2025-11-27 | 0.1.0 | 初版作成（ドラフト） |
