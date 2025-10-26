# 基音選択ロジック仕様書

**バージョン**: 1.0.0
**作成日**: 2025-10-26
**対象システム**: 8va相対音感トレーニングアプリ
**関連ファイル**: `trainingController.v2.js`

---

## 📋 目次

1. [概要](#概要)
2. [音域推奨基準](#音域推奨基準)
3. [基音選択の基本原則](#基音選択の基本原則)
4. [モード別選択ロジック](#モード別選択ロジック)
5. [音域不足時の対応](#音域不足時の対応)
6. [実装詳細](#実装詳細)

---

## 概要

### 目的
オクターブ相対音感トレーニングにおいて、ユーザーの音域に適した基音を選択し、12音すべてを重複なく使用することで、効果的なトレーニングを実現する。

### 設計思想
- **オクターブトレーニングの本質**: 基音から+12半音（1オクターブ）までの音程を歌うため、基音+1オクターブが音域内に収まる必要がある
- **12音の重要性**: クロマチック12音すべてを使用することで、相対音感の完全な習得を目指す
- **音域不足への対応**: 理想的には2.0オクターブ推奨だが、不足時も12音確保を優先

---

## 音域推奨基準

### 推奨音域: 2.0オクターブ以上

**理由:**
```
全音域: 2.0オクターブ
基音として使える範囲: 全音域 - 1.0オクターブ = 1.0オクターブ
利用可能な基音: クロマチック12音
```

**計算式:**
```javascript
基音範囲 = 音域最低音 〜 (音域最高音 / 2)
基音範囲のオクターブ数 = log2(音域最高音 / 2 / 音域最低音)
```

### 最小音域: 1.9オクターブ

**現実的な最小値:**
- 基音範囲: 約0.9オクターブ（約10-11音）
- 不足分: 高音側から追加して12音確保
- トレーニング実施可能だが、音域上限を若干超える音が発生

### 音域不足時の警告

**音域が2.0オクターブ未満の場合:**
```
⚠️ 音域不足: 10音 → 12音に拡張（2音追加）
推奨: 2.0オクターブ以上の音域（現在: 1.89オクターブ）
※ 追加された2音は基音+1オクターブが音域上限を若干超えますが、
  オクターブ相対音感トレーニングとして12音使用を優先します
```

---

## 基音選択の基本原則

### 原則1: 事前一括選定

**従来の問題点:**
- セッションごとに基音を選定 → 重複が発生しやすい
- previousBaseNote管理 → 複雑で保守困難

**改善後の設計:**
```javascript
// トレーニング開始時に全セッション分の基音を一括選定
selectedBaseNotes = selectAllBaseNotesForMode(config);

// 各セッションでは配列から取得するのみ
baseNoteInfo = selectedBaseNotes[sessionIndex];
```

### 原則2: 重複回避

**連続チャレンジモード・12音階モード:**
- 12セッション = 12音 → 完全に重複なし
- 各音が1回ずつ使用される

**ランダムモード:**
- 8セッション = 白鍵のみ → 重複なし
- ゾーン分割で音域全体をカバー

### 原則3: 距離制約の動的調整

**音数が十分な場合（12音以上）:**
```javascript
excludeSemitones = 0; // 距離制約なし（重複回避のみ）
```

**音数が不足の場合（12音未満）:**
```javascript
excludeSemitones = octaves >= 2.0 ? 5 : octaves >= 1.5 ? 3 : 1;
// 距離で分散させる
```

---

## モード別選択ロジック

### ランダム基音モード（初級・8セッション）

**対象音:** 白鍵のみ（C, D, E, F, G, A, B）

**選定方法:**
1. 音域を4ゾーンに分割
2. 各ゾーンから2音ずつランダム選択
3. 重複なし保証

**実装コード:**
```javascript
if (selectionType === 'random_c3_octave') {
    const whiteKeys = availableNotes.filter(note => !note.note.includes('#'));
    const zoneSize = Math.floor(whiteKeys.length / 4);

    for (let zone = 0; zone < 4; zone++) {
        const zoneStart = zone * zoneSize;
        const zoneEnd = zone === 3 ? whiteKeys.length : (zone + 1) * zoneSize;
        const zoneNotes = whiteKeys.slice(zoneStart, zoneEnd);

        // 各ゾーンから2音選択
        for (let i = 0; i < 2; i++) {
            const randomIndex = Math.floor(Math.random() * zoneNotes.length);
            const selectedNote = zoneNotes.splice(randomIndex, 1)[0];
            selectedNotes.push(selectedNote);
        }
    }
}
```

### 連続チャレンジモード（中級・12セッション）

**対象音:** クロマチック12音（#含む）

**選定方法:**
1. 初回: ランダムに1音選択
2. 2回目以降: 重複なし + 距離制約（音数に応じて調整）
3. 12音すべてを1回ずつ使用

**実装コード:**
```javascript
if (selectionType === 'random_chromatic') {
    // 距離制約の設定: 12音確保済みなので距離制約なし
    const excludeSemitones = 0;

    // 初回はランダム
    selectedNotes.push(availableNotes[Math.floor(Math.random() * availableNotes.length)]);

    // 2回目以降は重複なし
    for (let session = 1; session < maxSessions; session++) {
        let candidates = availableNotes.filter(note =>
            !selectedNotes.some(selected => selected.note === note.note)
        );

        selectedNotes.push(candidates[Math.floor(Math.random() * candidates.length)]);
    }
}
```

### 12音階モード（上級・12-24セッション）

**対象音:** クロマチック12音（順次使用）

**選定方法:**
1. 音域内の12音を順番に使用
2. 24セッションの場合は2周

**実装コード:**
```javascript
if (selectionType === 'sequential_chromatic') {
    for (let session = 0; session < maxSessions; session++) {
        selectedNotes.push(availableNotes[session % availableNotes.length]);
    }
}
```

---

## 音域不足時の対応

### 問題の定義

**理想的な状態:**
```
音域: 2.0オクターブ以上
基音範囲: 1.0オクターブ以上
利用可能な基音: 12音以上
```

**音域不足の状態:**
```
音域: 1.9オクターブ
基音範囲: 0.9オクターブ
利用可能な基音: 10音（不足2音）
```

### 解決策: 高音側からの追加

**設計思想:**
- オクターブ相対音感トレーニングとして12音は必須
- 音域が不足していても、ユーザーは事前説明で納得済み
- 基音+1オクターブが若干音域外に出ても許容

**実装ロジック:**
```javascript
// 【連続チャレンジモード専用】12音に満たない場合は、音域上限から追加
if (availableNotes.length < 12 && currentMode === 'continuous') {
    const neededNotes = 12 - availableNotes.length;
    console.warn(`⚠️ 音域不足: ${availableNotes.length}音 → 12音に拡張（${neededNotes}音追加）`);
    console.warn(`   推奨: 2.0オクターブ以上の音域（現在: ${octaves.toFixed(2)}オクターブ）`);

    // 音域内の基音のうち、最高音を見つける
    const highestAvailableNote = availableNotes[availableNotes.length - 1];

    // 全音符リストから、最高基音より上の音を取得
    const higherNotes = allNotes.filter(note =>
        note.frequency > highestAvailableNote.frequency &&
        note.frequency <= highFreq // 基音自体は音域内に収める
    );

    // 必要な分だけ追加
    const notesToAdd = higherNotes.slice(0, neededNotes);
    availableNotes = [...availableNotes, ...notesToAdd];

    console.log(`✅ 12音確保完了: ${availableNotes.map(n => n.note).join(', ')}`);
    console.log(`   ※ 追加された${neededNotes}音は基音+1オクターブが音域上限を若干超えますが、`);
    console.log(`     オクターブ相対音感トレーニングとして12音使用を優先します`);
}
```

### 追加される音の特性

**例（音域1.89オクターブの場合）:**
```
理想的な10音: F#2, G2, G#2, A2, A#2, B2, C3, C#3, D3, D#3
  → これらの基音+1オクターブは完全に音域内

追加される2音: E3, F3
  → 基音自体は音域内
  → 基音+1オクターブ（E4, F4）が音域上限を若干超える
  → ユーザーには若干高い音を出す必要があると事前説明済み
```

---

## 実装詳細

### getAvailableNotes()

**目的:** 音域に基づいて利用可能な基音リストを取得

**処理フロー:**
1. 全音域データを取得（快適範囲ではなく全範囲を使用）
2. 基音+1オクターブが音域内に収まる音をフィルタリング
3. 連続チャレンジモードで12音未満の場合、高音側から追加

**コード例:**
```javascript
function getAvailableNotes() {
    const allNotes = window.PitchShifter.AVAILABLE_NOTES;
    const rangeData = voiceRangeData.results;
    const { lowFreq, highFreq } = rangeData;

    // 音域内の音符のみをフィルタリング（基音+1オクターブが収まる範囲）
    let availableNotes = allNotes.filter(note => {
        const topFreq = note.frequency * 2; // 基音+1オクターブ
        const isInRange = note.frequency >= lowFreq && topFreq <= highFreq;
        return isInRange;
    });

    // 【連続チャレンジモード専用】12音確保処理
    if (availableNotes.length < 12 && currentMode === 'continuous') {
        // ... 高音側から追加
    }

    return availableNotes;
}
```

### selectAllBaseNotesForMode()

**目的:** モード別に全セッション分の基音を事前に一括選定

**パラメータ:**
- `config`: モード設定（maxSessions, baseNoteSelection等）

**戻り値:**
- `Array<{note: string, frequency: number}>`: 全セッション分の基音配列

**処理フロー:**
1. 利用可能な基音リストを取得
2. モード別ロジックで選定
3. 重複チェック
4. ログ出力

**コード例:**
```javascript
function selectAllBaseNotesForMode(config) {
    const availableNotes = getAvailableNotes();
    const maxSessions = config.maxSessions;
    const selectionType = config.baseNoteSelection;
    const selectedNotes = [];

    console.log(`📋 全${maxSessions}セッション分の基音を事前選定開始 (${selectionType})`);

    // モード別ロジック
    if (selectionType === 'random_c3_octave') {
        // ランダムモード
    } else if (selectionType === 'random_chromatic') {
        // 連続チャレンジモード
    } else if (selectionType === 'sequential_chromatic') {
        // 12音階モード
    }

    console.log(`✅ 全${selectedNotes.length}セッション分の基音選定完了: ${selectedNotes.map(n => n.note).join(' → ')}`);
    return selectedNotes;
}
```

### preselectBaseNote()

**目的:** 各セッション開始時に基音を配列から取得

**処理フロー:**
1. 完了済みセッション数を取得
2. selectedBaseNotes配列から対応する基音を取得
3. ログ出力

**コード例:**
```javascript
function preselectBaseNote() {
    const allSessions = JSON.parse(localStorage.getItem('sessionData')) || [];
    const currentModeSessions = allSessions.filter(s => s.mode === currentMode);
    const sessionIndex = currentModeSessions.length;

    if (selectedBaseNotes && selectedBaseNotes.length > sessionIndex) {
        baseNoteInfo = selectedBaseNotes[sessionIndex];

        console.log('═══════════════════════════════════════════════════');
        console.log(`🎼 [セッション ${sessionIndex + 1}/${selectedBaseNotes.length}] 基音セット完了`);
        console.log(`   基音: ${baseNoteInfo.note} (${baseNoteInfo.frequency.toFixed(1)}Hz)`);
        console.log(`   全基音: ${selectedBaseNotes.map(n => n.note).join(' → ')}`);
        console.log('═══════════════════════════════════════════════════');
    }
}
```

---

## ログ出力例

### 正常ケース（2.0オクターブ以上）

```
🎤 使用する音域: 87.96Hz - 352.0Hz (2.00オクターブ)
📐 基音として使える範囲: 87.96Hz - 176.0Hz
📐 基音範囲のオクターブ数: 1.00オクターブ
🎵 理想的な基音（基音+1オクターブが完全に音域内）: 12音
   範囲: F2 (87.3Hz) - E3 (164.8Hz)
🎵 最終的な利用可能基音: 12音
📋 全12セッション分の基音を事前選定開始 (random_chromatic)
📊 利用可能音数: 12音 → 距離制約なし（重複回避のみ）
✅ 全12セッション分の基音選定完了: F2 → C3 → G#2 → D#3 → A#2 → F#2 → C#3 → G2 → D3 → A2 → E3 → B2
```

### 音域不足ケース（1.9オクターブ）

```
🎤 使用する音域: 87.96Hz - 325.55Hz (1.89オクターブ)
📐 基音として使える範囲: 87.96Hz - 162.78Hz
📐 基音範囲のオクターブ数: 0.89オクターブ
🎵 理想的な基音（基音+1オクターブが完全に音域内）: 10音
   範囲: F#2 (92.5Hz) - D#3 (155.6Hz)
⚠️ 音域不足: 10音 → 12音に拡張（2音追加）
   推奨: 2.0オクターブ以上の音域（現在: 1.89オクターブ）
   候補: 12音 (E3, F3, F#3, G3, G#3, A3, A#3, B3, C4, C#4, D4, D#4)
✅ 12音確保完了: F#2, G2, G#2, A2, A#2, B2, C3, C#3, D3, D#3, E3, F3
   ※ 追加された2音は基音+1オクターブが音域上限を若干超えますが、
     オクターブ相対音感トレーニングとして12音使用を優先します
🎵 最終的な利用可能基音: 12音
📋 全12セッション分の基音を事前選定開始 (random_chromatic)
📊 利用可能音数: 12音 → 距離制約なし（重複回避のみ）
✅ 全12セッション分の基音選定完了: A2 → F3 → D#3 → E3 → G#2 → G2 → C#3 → A#2 → D3 → C3 → B2 → F#2
```

---

## バージョン履歴

### v1.0.0 (2025-10-26)
- 初版作成
- 2.0オクターブ推奨基準の明確化
- 音域不足時の12音確保ロジック実装
- モード別選択ロジックの詳細化
- 事前一括選定方式への変更

---

## 関連ドキュメント

- `VOICE_RANGE_INTEGRATION_SPECIFICATION.md` - 音域テスト統合仕様
- `TRAINING_MODE_SPECIFICATION.md` - トレーニングモード仕様
- `DATA_MANAGEMENT_SPECIFICATION.md` - データ管理仕様

---

**このドキュメントは実装の基準となる公式仕様書です。**
**実装時は必ずこの仕様に準拠してください。**
