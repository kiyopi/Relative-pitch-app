# モード別動線の違い - 重大バグ防止のための必須知識

**作成日**: 2025-11-12
**重要度**: ⚠️ 最高（理解不足で重大バグ発生）

---

## 🐛 今回発生した3つの重大バグ

### バグ1: モード別データ削除（第1のバグ）
- **ファイル**: `preparation-pitchpro-cycle.js` (line 1275-1293)
- **問題**: トレーニング開始時に同一モードの過去セッションを全削除
- **修正**: モード別データ削除機能を完全削除

### バグ2: lessonId生成バグ（第2のバグ）
- **ファイル**: `trainingController.js` (line 100-119, 888, 1504)
- **問題**: ランダム基音モードで8セッション中8個の異なるlessonIdが生成
- **修正**: sessionStorageによるlessonId永続化実装

### バグ3: 12音階モード早期完了バグ（第3のバグ）
- **ファイル**: `trainingController.js` (line 820-824)
- **問題**: 12音階上行完了後、下行モード開始時に1セッションで総合評価表示
- **根本原因**: セッション完了判定が「モード全体」でカウント（lessonId無視）
- **修正**: `filter(s => s.mode === currentMode)` → `filter(s => s.lessonId === currentLessonId)`

---

## 🔄 モード別の動線の違い（必ず理解すべき）

### ランダム基音モード（hasIndividualResults: true）

```
準備画面 → トレーニング(Session 1) → 【ページ遷移】→ セッション結果画面
  ↓                                     ↓「次のセッションへ」ボタン
  └─────────────────────────────────────┘
トレーニング(Session 2) → 【ページ遷移】→ セッション結果画面
  ↓ （8セッション繰り返し）
総合評価画面
```

**重要な特性**:
- 毎セッション後に**ページ遷移が発生**
- `currentLessonId`等のページスコープ変数は**リセットされる**
- sessionStorageで状態を保持する必要がある

### 連続チャレンジ・12音階モード（hasIndividualResults: false）

```
準備画面 → トレーニング(Session 1) → 【自動継続（1秒後）】
           トレーニング(Session 2) → 【自動継続（1秒後）】
           トレーニング(Session 3) → ...
           ↓ （12 or 24セッション連続実行）
           総合評価画面
```

**重要な特性**:
- セッション間で**ページ遷移なし**
- `currentLessonId`等のページスコープ変数は**保持される**
- sessionStorage不要（メモリ上で完結）

---

## ❌ 間違った実装パターン（バグ3の例）

```javascript
// モード全体でセッション数をカウント（間違い）
const currentModeSessions = allSessions.filter(s => s.mode === currentMode);
const sessionNumber = currentModeSessions.length;

if (sessionNumber >= config.maxSessions) {
    // 総合評価へ遷移
}
```

**なぜ間違いか**:
- 12音階上行（12セッション）完了 → localStorage内に12音階モード12セッション
- 12音階下行開始 → 1セッション完了時点で `currentMode === '12tone'` で13セッション
- `sessionNumber(13) >= maxSessions(12)` → **誤って総合評価表示**

---

## ✅ 正しい実装パターン

```javascript
// lessonId単位でセッション数をカウント（正解）
const currentLessonSessions = allSessions.filter(s => s.lessonId === currentLessonId);
const sessionNumber = currentLessonSessions.length;

if (sessionNumber >= config.maxSessions) {
    // 総合評価へ遷移
}
```

**なぜ正しいか**:
- lessonIdは準備画面で1度だけ生成され、全セッションに付与される
- ランダムモード: sessionStorageで保持（ページ遷移対応）
- 連続・12音階: メモリ上で保持（ページ遷移なし）
- **どちらのモードでも正しくカウントできる**

---

## 🛡️ バグ防止のためのチェックリスト

コーディング時に必ず確認すること:

1. **モードの特性理解**:
   - [ ] `hasIndividualResults`の値を確認
   - [ ] ページ遷移の有無を理解

2. **セッションカウント**:
   - [ ] モード単位ではなく**lessonId単位**でカウントしているか
   - [ ] `filter(s => s.mode === currentMode)` を使っていないか

3. **状態管理**:
   - [ ] ランダムモードでsessionStorageを使っているか
   - [ ] ページスコープ変数がリセットされることを理解しているか

4. **仕様書確認**:
   - [ ] `TRAINING_SPECIFICATION.md` 1.2節を読んだか
   - [ ] `MODE_CONTROLLER_SPECIFICATION.md`を確認したか

---

## 📚 関連ドキュメント

- **TRAINING_SPECIFICATION.md** (v3.4.0): 1.2節「モード別の動線の違い」
- **MODE_CONTROLLER_SPECIFICATION.md** (v2.0.0): hasIndividualResults定義
- **CLAUDE.md**: 注意事項10「モード別動線の理解必須」

---

## 💡 重要な教訓

**動線の違いを理解しないと、重大なバグを引き起こす**

- モード設定（`hasIndividualResults`）は単なるUI表示の問題ではない
- ページ遷移の有無がデータ管理ロジックに直結する
- lessonIdベースの設計はこの違いを吸収するための必須設計
- セッションカウントは**必ずlessonId単位**で行う

このメモリを読み返すことで、同様のバグを防ぐことができる。
