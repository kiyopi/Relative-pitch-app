# 下行モード追加の見積もり

**作成日**: 2025-11-07
**カテゴリ**: 機能追加見積もり
**対象**: 8va相対音感トレーニングアプリ

---

## 📊 背景・要件

### 現状の問題
- **2オクターブ音域**: 低い1オクターブのみが基音として使用可能
- **高い1オクターブ**: 基音として使用できず、測定対象音としてのみ機能
- **上行のみ**: ド→レ→ミ→...→ドのみ対応

### 下行モード導入の効果
- **音域の完全活用**: 高い1オクターブも基音として使用可能
- **トレーニングバリエーション**: 上行/下行の両方を練習できる
- **難易度向上**: 下行は上行より難しく、より高度なトレーニングに

---

## 📋 実装タスク詳細

### Phase 1: データ構造・仕様書更新 (作業量: 小)

**タスク**:
1. `modeConfig`に`direction`パラメータ追加
   - 上行: `ascending` / 下行: `descending`
2. 仕様書更新
   - `TRAINING_SPECIFICATION.md`
   - `BASE_NOTE_SELECTION_SPECIFICATION.md`
   - `DATA_MANAGEMENT_SPECIFICATION.md`

**成果物**:
```javascript
const modeConfig = {
    random: {
        maxSessions: 8,
        title: 'ランダム基音モード',
        directions: ['ascending', 'descending'],
        baseNoteSelection: 'random_c3_octave'
    }
};
```

**推定時間**: 1-2時間

---

### Phase 2: 基音選択ロジックの拡張 (作業量: 中)

**タスク**:
1. `generateAllNotes()`の拡張
   - 上行: `低音 ~ (高音 - 1オクターブ)`
   - 下行: `(低音 + 1オクターブ) ~ 高音`
2. 選択関数の修正
   - `selectRandomMode()`: 下行対応
   - `selectContinuousMode()`: 下行対応
   - `selectSequentialMode()`: 下行対応

**実装例**:
```javascript
function generateAllNotes(lowFreq, highFreq, direction = 'ascending') {
    if (direction === 'ascending') {
        // 基音範囲: 低音 ~ (高音 - 1オクターブ)
        const maxBaseFreq = highFreq / 2;
    } else if (direction === 'descending') {
        // 基音範囲: (低音 + 1オクターブ) ~ 高音
        const minBaseFreq = lowFreq * 2;
    }
}
```

**推定時間**: 3-4時間

---

### Phase 3: トレーニングフローの拡張 (作業量: 中)

**タスク**:
1. 音程計算の反転
   - 上行: `基音 + セミトーン`
   - 下行: `基音 - セミトーン`
2. UI表示の調整（音名表示の逆順）
3. セッションデータに`direction`フィールド追加

**実装例**:
```javascript
function getTargetFrequency(baseFreq, step, direction) {
    if (direction === 'ascending') {
        return baseFreq * Math.pow(2, intervals[step] / 12);
    } else {
        return baseFreq / Math.pow(2, intervals[step] / 12);
    }
}
```

**推定時間**: 3-4時間

---

### Phase 4: UI/UX実装 (作業量: 中)

**タスク**:
1. モード選択画面の追加
   - ホームページに上行/下行選択ボタン追加
2. トレーニングページのUI調整
   - ページタイトルに方向表示（例: `ランダム基音モード（下行）`）
   - 下行アイコンの追加（Lucide: `arrow-down`）
3. 結果ページの対応
   - セッション結果に方向表示
   - 総合評価で上行/下行を区別

**HTML例**:
```html
<div class="mode-card">
    <h3>ランダム基音モード</h3>
    <div class="direction-buttons">
        <button class="btn btn-primary" data-mode="random" data-direction="ascending">
            <i data-lucide="arrow-up"></i>
            <span>上行</span>
        </button>
        <button class="btn btn-primary" data-mode="random" data-direction="descending">
            <i data-lucide="arrow-down"></i>
            <span>下行</span>
        </button>
    </div>
</div>
```

**推定時間**: 3-4時間

---

### Phase 5: 評価システムの調整 (作業量: 小)

**タスク**:
1. 評価基準の検証（下行も上行と同じ基準で問題ないか）
2. グレード計算の拡張（上行/下行を別々に評価するか）

**推定時間**: 1-2時間

---

### Phase 6: テスト・デバッグ (作業量: 中)

**タスク**:
1. 単体テスト（基音選択ロジック、音程計算）
2. 統合テスト（上行→下行の切り替え、データ保存・読み込み）
3. 実機テスト（PC・iPhone・iPad）

**推定時間**: 2-3時間

---

## ⏱️ 作業時間見積もり

| Phase | 内容 | 作業量 | 推定時間 |
|-------|------|--------|----------|
| Phase 1 | データ構造・仕様書更新 | 小 | 1-2時間 |
| Phase 2 | 基音選択ロジック拡張 | 中 | 3-4時間 |
| Phase 3 | トレーニングフロー拡張 | 中 | 3-4時間 |
| Phase 4 | UI/UX実装 | 中 | 3-4時間 |
| Phase 5 | 評価システム調整 | 小 | 1-2時間 |
| Phase 6 | テスト・デバッグ | 中 | 2-3時間 |
| **合計** | | | **13-19時間** |

---

## 🎯 推奨実装アプローチ

### アプローチA: 段階的実装（推奨）
1. **ステップ1**: ランダムモードのみ下行対応（5-7時間）
2. **ステップ2**: 実機テスト・調整（2-3時間）
3. **ステップ3**: 他モードに展開（6-9時間）

**メリット**:
- リスク分散
- 早期フィードバック
- 段階的デバッグ

### アプローチB: 一括実装
- 全モード一度に実装（13-19時間）
- リスク高、デバッグ時間増加の可能性

---

## 🚀 実装後のメリット

1. **音域の完全活用**: 2オクターブ全体を基音として使用可能
2. **トレーニング効果向上**: 上行・下行両方の練習
3. **難易度バリエーション**: 初心者→上級者まで対応
4. **ユーザー満足度向上**: より充実したトレーニング体験

---

## 📝 重要な設計判断

### 基音範囲の計算
- **上行**: 基音 + 1オクターブが音域内に収まる必要がある
  - 基音範囲: `低音 ~ (高音 - 1オクターブ)`
- **下行**: 基音 - 1オクターブが音域内に収まる必要がある
  - 基音範囲: `(低音 + 1オクターブ) ~ 高音`

### データ構造
- `sessionData`に`direction`フィールド追加
- `modeConfig`に`directions`配列追加（上行/下行の選択可否）

### UI/UX
- モード選択画面で上行/下行を明確に選択
- トレーニング中は方向を表示（アイコン + テキスト）
- 結果ページで上行/下行を区別して表示

---

## 🔗 関連ファイル

- `/PitchPro-SPA/js/controllers/trainingController.js`
- `/PitchPro-SPA/specifications/TRAINING_SPECIFICATION.md`
- `/PitchPro-SPA/specifications/BASE_NOTE_SELECTION_SPECIFICATION.md`
- `/PitchPro-SPA/specifications/DATA_MANAGEMENT_SPECIFICATION.md`
