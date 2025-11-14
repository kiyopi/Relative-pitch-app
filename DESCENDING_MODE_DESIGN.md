# 下行モード実装設計書

**作成日**: 2025-11-14
**バージョン**: 1.0.0

## 📋 目次

1. [概要](#概要)
2. [上行・下行の違い](#上行下行の違い)
3. [現在の実装状況](#現在の実装状況)
4. [実装が必要な差分](#実装が必要な差分)
5. [実装計画](#実装計画)

---

## 概要

下行モードは、基音から**オクターブ下のド**まで下降する音階トレーニングです。

### 基本動作

**上行モード（現在）**:
```
基音C4 → ド(C4) → レ(D4) → ミ(E4) → ファ(F4) → ソ(G4) → ラ(A4) → シ(B4) → ド(C5)
```

**下行モード（実装予定）**:
```
基音C4 → ド(C4) → シ(B3) → ラ(A3) → ソ(G3) → ファ(F3) → ミ(E3) → レ(D3) → ド(C3)
```

---

## 上行・下行の違い

### 1. 半音ステップの違い

**上行モード**:
```javascript
const semitoneSteps = [0, 2, 4, 5, 7, 9, 11, 12];
// ド=0, レ=+2, ミ=+4, ファ=+5, ソ=+7, ラ=+9, シ=+11, ド=+12
```

**下行モード**:
```javascript
const semitoneSteps = [0, -2, -4, -5, -7, -9, -11, -12];
// ド=0, シ=-2, ラ=-4, ソ=-5, ファ=-7, ミ=-9, レ=-11, ド=-12
```

### 2. 音程名の違い

**上行モード**:
```javascript
const intervals = ['ド', 'レ', 'ミ', 'ファ', 'ソ', 'ラ', 'シ', 'ド'];
```

**下行モード**:
```javascript
const intervals = ['ド', 'シ', 'ラ', 'ソ', 'ファ', 'ミ', 'レ', 'ド'];
```

### 3. 周波数計算の違い

**上行モード**:
```javascript
const expectedFreq = baseNoteInfo.frequency * Math.pow(2, semitoneSteps[i] / 12);
// 例: C4 (261.6Hz) → C5 (523.2Hz) へ上昇
```

**下行モード**:
```javascript
const expectedFreq = baseNoteInfo.frequency * Math.pow(2, semitoneSteps[i] / 12);
// 例: C4 (261.6Hz) → C3 (130.8Hz) へ下降
// semitoneStepsが負の値のため自動的に下降
```

---

## 現在の実装状況

### ✅ すでに実装済み

1. **UIレイヤー**
   - ✅ ホームページの上行・下行タブナビゲーション
   - ✅ sessionStorageでの方向選択の永続化
   - ✅ トレーニングモードボタンの動的更新

2. **パラメータ受け渡し**
   - ✅ `currentScaleDirection` グローバル変数 (line 22)
   - ✅ URLパラメータ `scaleDirection` の読み取り (line 69)
   - ✅ セッションデータへの `scaleDirection` 保存 (line 128, 164, 573)

3. **12音階モードの上昇・下降**
   - ✅ 12音階モードの chromatic ascending/descending 実装済み (line 1515-1555)
   - ⚠️ これは「基音の変化パターン」であり、「音階の進行方向」ではない

### ❌ 未実装

1. **音階ステップの切り替えロジック**
   - ❌ `currentScaleDirection` に基づく `semitoneSteps` の動的生成
   - ❌ `intervals` 配列の動的生成

2. **UI表示の切り替え**
   - ❌ トレーニング画面での音程名表示（ド→レ→ミ vs ド→シ→ラ）
   - ❌ プログレスバーの表示順序

3. **データ記録**
   - ✅ `scaleDirection` はすでにセッションデータに保存されている
   - ✅ 結果画面での方向表示は自動的に対応

---

## 実装が必要な差分

### 1. 定数の動的生成

**現在の実装**（固定値）:
```javascript
const intervals = ['ド', 'レ', 'ミ', 'ファ', 'ソ', 'ラ', 'シ', 'ド'];
const semitoneSteps = [0, 2, 4, 5, 7, 9, 11, 12];
```

**必要な実装**（動的生成）:
```javascript
function getScaleSteps(direction) {
    if (direction === 'descending') {
        return {
            intervals: ['ド', 'シ', 'ラ', 'ソ', 'ファ', 'ミ', 'レ', 'ド'],
            semitoneSteps: [0, -2, -4, -5, -7, -9, -11, -12]
        };
    } else {
        return {
            intervals: ['ド', 'レ', 'ミ', 'ファ', 'ソ', 'ラ', 'シ', 'ド'],
            semitoneSteps: [0, 2, 4, 5, 7, 9, 11, 12]
        };
    }
}
```

### 2. UI表示の更新箇所

#### (1) プログレスバー (line 730-732あたり)
```javascript
// 現在
console.log(`🎵 音程: ${intervals[i]} (+${semitoneSteps[i]}半音, 期待: ${expectedFreq.toFixed(1)}Hz)`);

// 修正後
const sign = currentScaleDirection === 'descending' ? '-' : '+';
console.log(`🎵 音程: ${intervals[i]} (${sign}${Math.abs(semitoneSteps[i])}半音, 期待: ${expectedFreq.toFixed(1)}Hz)`);
```

#### (2) 音程カウンター表示
```javascript
// HTML: <span id="interval-name">ド</span>
document.getElementById('interval-name').textContent = intervals[currentIntervalIndex];
```

#### (3) セッション完了メッセージ
```javascript
// 現在
console.log('✅ 8音階すべての測定が完了しました');

// 修正不要（音階数は同じなので変更なし）
```

### 3. データ記録の確認

**すでに実装済み**:
```javascript
// line 128
scaleDirection: currentScaleDirection

// line 573
scaleDirection: currentScaleDirection,  // 音階方向
```

**結果画面での表示**:
- `result-session-controller.js` が `scaleDirection` を読み取って表示
- 追加実装は不要

---

## 実装計画

### Phase 1: コア機能実装（必須）

#### 1.1 音階ステップ生成関数の追加
**ファイル**: `/PitchPro-SPA/js/controllers/trainingController.js`
**挿入位置**: line 29-30の直後

```javascript
/**
 * 音階方向に応じた音階ステップを生成
 * @param {string} direction - 'ascending' または 'descending'
 * @returns {Object} { intervals: string[], semitoneSteps: number[] }
 */
function getScaleSteps(direction) {
    if (direction === 'descending') {
        return {
            intervals: ['ド', 'シ', 'ラ', 'ソ', 'ファ', 'ミ', 'レ', 'ド'],
            semitoneSteps: [0, -2, -4, -5, -7, -9, -11, -12]
        };
    } else {
        return {
            intervals: ['ド', 'レ', 'ミ', 'ファ', 'ソ', 'ラ', 'シ', 'ド'],
            semitoneSteps: [0, 2, 4, 5, 7, 9, 11, 12]
        };
    }
}
```

#### 1.2 定数を変数に変更
**変更箇所**: line 28-29

```javascript
// 変更前
const intervals = ['ド', 'レ', 'ミ', 'ファ', 'ソ', 'ラ', 'シ', 'ド'];
const semitoneSteps = [0, 2, 4, 5, 7, 9, 11, 12];

// 変更後
let intervals = ['ド', 'レ', 'ミ', 'ファ', 'ソ', 'ラ', 'シ', 'ド'];
let semitoneSteps = [0, 2, 4, 5, 7, 9, 11, 12];
```

#### 1.3 トレーニング初期化時に音階ステップを設定
**変更箇所**: line 86の直後

```javascript
// 音階方向の設定
currentScaleDirection = scaleDirectionParam || 'ascending';
console.log(`✅ 音階方向設定: ${currentScaleDirection}`);

// ✅ 追加: 音階ステップの動的生成
const scaleSteps = getScaleSteps(currentScaleDirection);
intervals = scaleSteps.intervals;
semitoneSteps = scaleSteps.semitoneSteps;
console.log(`🎵 音階ステップ設定: ${intervals.join('→')}`);
console.log(`🎵 半音ステップ: ${semitoneSteps.join(', ')}`);
```

### Phase 2: UI表示の調整（推奨）

#### 2.1 ログメッセージの改善
**変更箇所**: line 730-732あたり

```javascript
// 変更前
console.log(`🎵 音程: ${intervals[i]} (+${semitoneSteps[i]}半音, 期待: ${expectedFreq.toFixed(1)}Hz)`);

// 変更後
const semitoneDiff = semitoneSteps[i];
const sign = semitoneDiff >= 0 ? '+' : '';
console.log(`🎵 音程: ${intervals[i]} (${sign}${semitoneDiff}半音, 期待: ${expectedFreq.toFixed(1)}Hz)`);
```

### Phase 3: テスト（必須）

#### 3.1 上行モードのテスト
1. ホームページで「上行モード」タブを選択
2. ランダム基音モード開始
3. 音階が「ド→レ→ミ→ファ→ソ→ラ→シ→ド」と進むことを確認
4. 周波数が上昇することを確認

#### 3.2 下行モードのテスト
1. ホームページで「下行モード」タブを選択
2. ランダム基音モード開始
3. 音階が「ド→シ→ラ→ソ→ファ→ミ→レ→ド」と進むことを確認
4. 周波数が下降することを確認

#### 3.3 データ記録のテスト
1. 下行モードでセッション完了
2. セッション結果画面で「下行モード」と表示されることを確認
3. localStorageに `scaleDirection: 'descending'` が保存されることを確認

#### 3.4 モード切り替えのテスト
1. 上行モードでセッション開始
2. ブラウザバックでホームに戻る
3. 下行モードに切り替え
4. 新しいセッション開始
5. 正しく下行音階が使用されることを確認

---

## 重要な注意事項

### ⚠️ 混同しやすい概念

1. **音階方向（scale direction）**: 今回実装する「上行・下行」
   - ド→レ→ミ（上行） vs ド→シ→ラ（下行）
   - 全モードに適用可能

2. **基音進行方向（chromatic direction）**: すでに実装済みの「上昇・下降」
   - C→C#→D（上昇） vs C→B→A#（下降）
   - 12音階モードのみ

### ✅ すでに実装済みの機能

- URLパラメータ `scaleDirection` の受け渡し
- sessionStorageでの状態保持
- セッションデータへの方向記録
- 結果画面での方向表示

### 🎯 実装のポイント

1. **最小限の変更**: 定数を変数に変更し、初期化時に動的生成するだけ
2. **既存ロジックの再利用**: 周波数計算式は変更不要（semitoneStepsが負になるだけ）
3. **後方互換性**: 上行モードは既存の動作を完全に維持

---

## まとめ

下行モード実装は、既存の仕組みを最大限活用することで、最小限のコード変更で実現できます。

**変更箇所**:
1. 音階ステップ生成関数の追加（約20行）
2. 定数 → 変数への変更（2行）
3. 初期化時の動的生成処理（約5行）

**総変更量**: 約30行のコード追加・変更

**テスト時間**: 約30分（各モード×各方向のテスト）

**実装難易度**: 低（既存システムへの自然な拡張）
