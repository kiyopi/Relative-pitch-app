# ModeController仕様書

**バージョン**: 2.4.0
**作成日**: 2025-11-11
**最終更新**: 2025-11-22

**変更履歴**:
- v2.4.0 (2025-11-22): trainingController.jsのmodeConfig完全統合
  - **trainingController.jsの重複modeConfig定義を削除**
  - 各モードに`requiredBaseNotes`プロパティ追加（音域内必要最小基音数）
  - `getRequiredBaseNotes(modeId)`メソッド追加
  - `validateTrainingParams(params)`メソッド追加（v2.3.0）
  - `getValidModeIds()`メソッド追加（v2.3.0）
  - NavigationManager v4.6.1でパラメータ検証にModeController活用
- v2.0.1 (2025-11-16): UI一貫性向上のための統合使用拡大
  - **preparationController.js**: リダイレクトメッセージとサブタイトルで`generatePageTitle()`使用
  - **results-overview-controller.js**: 次のステップボタンのdescriptionで`generatePageTitle()`使用
  - **records-controller.js**: 不完全レッスンフィルタリングで`getSessionsPerLesson()`使用
  - **効果**: モード名表示の完全な一元管理、方向情報（上昇・下降、上行・下行）の一貫性確保
- v2.0.0 (2025-11-12): UI色設定追加、`updatePageHeader()`メソッド実装

---

## 📋 概要

全トレーニングモードの定義と設定を一元管理する統合コントローラー。モード情報の分散を防ぎ、将来的なモード追加に対応できるスケーラブルな設計を実現する。

### 対象ファイル
- `/PitchPro-SPA/js/mode-controller.js`

### 使用箇所
- `trainingController.js`: トレーニング実行時のモード設定取得、ページヘッダー更新
- `records-controller.js`: レッスングループ化時のセッション数取得、不完全レッスンフィルタリング（v2.0.1追加）
- `session-data-recorder.js`: セッションデータ保存時のモード情報取得
- `results-overview-controller.js`: 総合評価ページヘッダー更新、次のステップボタンラベル生成（v2.0.1追加）
- `preparationController.js`: リダイレクトメッセージ、サブタイトル生成（v2.0.1追加）

---

## 🎯 設計思想

### 問題認識

**従来の問題点**:
```javascript
// trainingController.js
const modeConfig = {
    'random': { maxSessions: 8, title: 'ランダム基音モード' },
    'continuous': { maxSessions: 12, title: '連続チャレンジモード' },
    '12tone': { maxSessions: 12, title: '12音階モード' }
};

// records-controller.js
const modeSessionCounts = {
    'random': 8,
    'continuous': 12,
    'chromatic': 12,  // ← 古い名称
    '12tone': 12
};

// results-overview-controller.js
const modeNames = {
    'random': 'ランダム基音モード',
    'continuous': '連続チャレンジモード',
    'chromatic': '12音階モード',  // ← 名称不一致
    '12tone': '12音階モード'
};
```

**問題点**:
1. **モード定義の分散**: 同じ情報が複数ファイルに記載
2. **名称不一致**: `chromatic` vs `12tone`の混在
3. **保守性の低下**: 新モード追加時に複数ファイルの修正が必要
4. **動的計算の困難**: 12音階モードの両方向(24回)対応が複雑化

### 解決アプローチ

**Single Source of Truth (SSOT)** の実現:
```javascript
// mode-controller.js（唯一の真実の情報源）
const ModeController = {
    modes: {
        'random': { id: 'random', name: 'ランダム基音モード', sessionsPerLesson: 8, ... },
        'continuous': { id: 'continuous', name: '連続チャレンジモード', sessionsPerLesson: 12, ... },
        '12tone': {
            id: '12tone',
            name: '12音階モード',
            sessionsPerLesson: (options) => options.direction === 'both' ? 24 : 12,
            directions: { 'ascending': {...}, 'descending': {...}, 'both': {...} }
        }
    }
};
```

---

## 🏗️ アーキテクチャ

### データ構造

#### モード定義オブジェクト

```javascript
{
    id: string,                    // モードID（'random', 'continuous', '12tone'）
    name: string,                  // 表示名（'ランダム基音モード'）
    shortName: string,             // 短縮名（'ランダム基音'）
    description: string,           // 説明文
    sessionsPerLesson: number | function,  // セッション数（固定値 or 動的計算関数）
    requiredBaseNotes: number,     // 音域内に必要な最小基音数（v2.4.0追加）
    baseNoteSelection: string,     // 基音選択方式
    hasIndividualResults: boolean, // セッション個別結果表示の有無
    hasRangeAdjustment: boolean,   // 音域調整機能の有無
    difficulty: string,            // 難易度（'beginner', 'intermediate', 'advanced'）
    icon: string,                  // Lucideアイコン名
    chromaticDirectionOptions?: object,  // 基音進行方向オプション（v2.0.0追加）
    scaleDirectionOptions?: object       // 音階方向オプション（v2.0.0追加）
}
```

---

### 🆕 v2.0.0: 2次元モード管理システム

#### 基音進行方向（chromaticDirection）

トレーニングセッション間での基音の進行方向を指定：

```javascript
chromaticDirectionOptions: {
    'random': {
        id: 'random',
        name: 'ランダム',
        description: '音域内でランダムに基音を選択'
    },
    'ascending': {
        id: 'ascending',
        name: '上昇',
        description: '半音ずつ上昇（C→C#→D...）'
    },
    'descending': {
        id: 'descending',
        name: '下降',
        description: '半音ずつ下降（C→B→A#...）'
    },
    'both': {
        id: 'both',
        name: '両方向',
        description: '上昇12音+下降12音（24セッション）',
        sessionsMultiplier: 2  // セッション数を2倍にする
    }
}
```

**適用モード**:
- ✅ ランダム基音モード（random）
- ✅ 連続チャレンジモード（continuous）
- ✅ 12音階モード（12tone）

---

#### 音階方向（scaleDirection）

1セッション内での音階の進行方向を指定：

```javascript
scaleDirectionOptions: {
    'ascending': {
        id: 'ascending',
        name: '上行',
        description: 'ド→レ→ミ→ファ→ソ→ラ→シ→ド（上昇音階）'
    },
    'descending': {
        id: 'descending',
        name: '下行',
        description: 'ド→シ→ラ→ソ→ファ→ミ→レ→ド（下降音階）'
    }
}
```

**適用モード**:
- ✅ ランダム基音モード（random）
- ✅ 連続チャレンジモード（continuous）
- ✅ 12音階モード（12tone）

---

#### 2次元モード組み合わせ例

**ランダム基音モード**:
| chromaticDirection | scaleDirection | 説明 | セッション数 |
|---|---|---|---|
| random | ascending | ランダム基音・上行音階 | 8 |
| random | descending | ランダム基音・下行音階 | 8 |

**12音階モード**:
| chromaticDirection | scaleDirection | 説明 | セッション数 |
|---|---|---|---|
| both | ascending | 半音階両方向・上行音階 | 24 |
| both | descending | 半音階両方向・下行音階 | 24 |
| ascending | ascending | 半音階上昇・上行音階 | 12 |
| descending | descending | 半音階下降・下行音階 | 12 |

---

### lessonIdベースのデータ管理

**v2.0.0の重要な変更**: セッションカウント方式からlessonId方式への移行

#### 旧方式（v1.0.0）の問題点

```javascript
// セッション数でレッスンを判定（問題あり）
const lessonNum = Math.floor((sessionId - 1) / sessionsPerLesson) + 1;

// 問題1: トレーニング中断時に正確なグループ化ができない
// 例: Session 1-3を実行 → 中断 → 翌日Session 4-11実行
// → Session 1-8が同じレッスンと誤判定される

// 問題2: 可変セッション数モード（弱点練習等）に対応できない
```

#### 新方式（v2.0.0）: lessonId方式

```javascript
// レッスンID生成（トレーニング開始時に1回だけ）
const lessonId = `lesson_${timestamp}_${mode}_${chromaticDir}_${scaleDir}`;
// 例: lesson_1699999999999_random_random_ascending

// 全セッションに同じlessonIdを付与
session1.lessonId = lessonId;
session2.lessonId = lessonId;
// ...
session8.lessonId = lessonId;

// レッスングループ化（lessonIdで完全一致判定）
const lessons = sessions.reduce((acc, session) => {
    if (!acc[session.lessonId]) {
        acc[session.lessonId] = [];
    }
    acc[session.lessonId].push(session);
    return acc;
}, {});
```

**利点**:
1. **正確なグループ化**: 中断・再開に関係なく正確にレッスンを識別
2. **可変セッション数対応**: 弱点練習モード等の動的セッション数に対応
3. **メタデータ保持**: lessonIdにモード・方向情報を含められる
4. **トレーサビリティ**: タイムスタンプでレッスンの開始時刻を記録

---

### セッションデータ構造（v2.0.0）

```javascript
{
    sessionId: 123,                                        // セッション固有ID
    lessonId: "lesson_1699999999999_random_random_ascending",  // レッスンID（NEW）
    mode: "random",                                        // トレーニングモード
    chromaticDirection: "random",                          // 基音進行方向（NEW）
    scaleDirection: "ascending",                           // 音階方向（NEW）
    baseNote: "C3",                                        // 基音
    baseFrequency: 130.81,                                // 基音周波数
    startTime: 1699999999999,                             // 開始時刻
    pitchErrors: [...],                                   // 音程誤差データ
    completed: true,                                      // 完了フラグ
    endTime: 1699999999999,                               // 終了時刻
    duration: 8298                                        // 所要時間（ms）
}
```

**後方互換性**:
- `direction`フィールド（旧）→ `chromaticDirection`（新）に自動変換
- `lessonId`がない旧データ → `legacy_lesson_${mode}_${chromaticDir}_${scaleDir}_${lessonNum}`を生成

---

## 🔧 主要機能

### 1. getMode(modeId)

モード設定オブジェクトを取得

**使用例**:
```javascript
const mode = ModeController.getMode('12tone');
console.log(mode.name);  // '12音階モード'
console.log(mode.difficulty);  // 'advanced'
```

**エラーハンドリング**:
```javascript
const unknownMode = ModeController.getMode('invalid');
// → デフォルトで'random'モードを返す
// → コンソール警告: ⚠️ 未知のモードID: invalid
```

---

### 2. getSessionsPerLesson(modeId, options)

セッション数を取得（動的計算対応）

**使用例**:
```javascript
// ランダムモード（固定値）
const sessions1 = ModeController.getSessionsPerLesson('random');
// → 8

// 12音階モード 上昇
const sessions2 = ModeController.getSessionsPerLesson('12tone', { direction: 'ascending' });
// → 12

// 12音階モード 両方向
const sessions3 = ModeController.getSessionsPerLesson('12tone', { direction: 'both' });
// → 24
```

**実装詳細**:
```javascript
getSessionsPerLesson(modeId, options = {}) {
    const mode = this.getMode(modeId);

    // 動的計算関数の場合
    if (typeof mode.sessionsPerLesson === 'function') {
        return mode.sessionsPerLesson(options);
    }

    // 固定値の場合
    return mode.sessionsPerLesson;
}
```

---

### 3. getRequiredBaseNotes(modeId) 【v2.4.0追加】

モードに必要な最小基音数を取得（音域内に最低限必要な基音の数）

**使用例**:
```javascript
// ランダム基音モード
const requiredNotes1 = ModeController.getRequiredBaseNotes('random');
// → 8

// 連続チャレンジモード
const requiredNotes2 = ModeController.getRequiredBaseNotes('continuous');
// → 12

// 12音階モード
const requiredNotes3 = ModeController.getRequiredBaseNotes('12tone');
// → 12
```

**実装詳細**:
```javascript
getRequiredBaseNotes(modeId) {
    const mode = this.getMode(modeId);
    return mode?.requiredBaseNotes || 8; // デフォルト8音
}
```

**用途**:
- 音域不足時の自動拡張処理（trainingController.js）
- 音域テスト結果の妥当性判定

---

### 4. getModeName(modeId, useShortName)

モード名を取得

**使用例**:
```javascript
// 正式名称
const fullName = ModeController.getModeName('continuous');
// → '連続チャレンジモード'

// 短縮名
const shortName = ModeController.getModeName('continuous', true);
// → '連続チャレンジ'
```

**用途**:
- UI表示時のモード名統一
- トレーニング記録の表示名統一

---

### 4. toTrainingConfig()

trainingController.js用のmodeConfig形式に変換

**使用例**:
```javascript
const trainingConfig = ModeController.toTrainingConfig();
// → {
//     'random': {
//         maxSessions: 8,
//         title: 'ランダム基音モード',
//         hasIndividualResults: true,
//         baseNoteSelection: 'random_c3_octave',
//         hasRangeAdjustment: false
//     },
//     ...
// }
```

**既存コードとの互換性**:
```javascript
// 従来のtrainingController.js
const modeConfig = { ... };  // ← ハードコード定義

// ModeController統合後
const modeConfig = ModeController.toTrainingConfig();  // ← 自動生成
```

---

### 5. extractDirection(sessions)

セッションデータから方向性を抽出

**使用例**:
```javascript
const sessions = [
    { sessionId: 1, mode: '12tone', direction: 'both', ... },
    { sessionId: 2, mode: '12tone', direction: 'both', ... }
];

const direction = ModeController.extractDirection(sessions);
// → 'both'
```

**用途**:
- `records-controller.js`でのレッスングループ化時のセッション数判定
- トレーニング記録表示時の方向性表示

---

### 6. getAllModes(filters)

全モードのリストを取得（フィルター対応）

**使用例**:
```javascript
// 全モード取得
const allModes = ModeController.getAllModes();
// → [random, continuous, 12tone]

// 非推奨モード除外
const activeModes = ModeController.getAllModes({ excludeDeprecated: true });

// 難易度でフィルター
const beginnerModes = ModeController.getAllModes({ difficulty: 'beginner' });
// → [random]
```

**用途**:
- モード選択UI生成
- 統計表示時のモードリスト取得

---

### 8. getValidModeIds(excludeDeprecated) 【v2.3.0追加】

有効なモードIDのリストを取得

**使用例**:
```javascript
// 有効なモードIDを取得
const validModes = ModeController.getValidModeIds();
// → ['random', 'continuous', '12tone']

// 非推奨モードを含める
const allModes = ModeController.getValidModeIds(false);
```

**実装詳細**:
```javascript
getValidModeIds(excludeDeprecated = true) {
    return Object.keys(this.modes).filter(id =>
        !excludeDeprecated || !this.modes[id].deprecated
    );
}
```

**用途**:
- パラメータ検証時のモード有効性チェック
- NavigationManager.validateTrainingParams()で使用

---

### 9. validateTrainingParams(params) 【v2.3.0追加】

トレーニングパラメータの一括検証（パラメータ検証の一元管理）

**使用例**:
```javascript
const result = ModeController.validateTrainingParams({
    mode: 'random',
    direction: 'ascending',
    startNote: null,
    chromaticDirection: null
});

// 成功時
// → { isValid: true, reason: 'valid', message: 'パラメータは有効です。', details: {...} }

// 失敗時（モードなし）
// → { isValid: false, reason: 'no-mode', message: 'トレーニングモードが指定されていません。', details: {...} }

// 失敗時（方向なし）
// → { isValid: false, reason: 'no-direction', message: '音階方向（上行/下行）が指定されていません。', details: {...} }

// 失敗時（12音階で基音なし）
// → { isValid: false, reason: 'chromatic-no-startnote', message: '12音階モードには基音の指定が必要です。', details: {...} }
```

**検証項目**:
1. **mode**: 必須、有効なモードIDか
2. **direction**: 必須（全モード共通）、'ascending' or 'descending'
3. **startNote**: 12音階モードのみ必須

**用途**:
- NavigationManager v4.6.1でのダイレクトアクセス検出時のパラメータ検証
- 新モード追加時もModeController.modesの更新のみで対応可能

---

## 📊 統合戦略

### Phase 1: ModeController導入（完了）

**作業内容**:
- [x] `mode-controller.js`ファイル作成
- [x] モード定義の統合
- [x] 主要APIメソッド実装
- [x] グローバル公開 (`window.ModeController`)

---

### Phase 2: 段階的統合（完了 v2.4.0）

#### Step 1: records-controller.js統合（完了 v2.0.1）

**変更前**:
```javascript
const modeSessionCounts = {
    'random': 8,
    'continuous': 12,
    'chromatic': 12,
    '12tone': 12
};

const getSessionsPerLesson = (mode, sessions) => {
    if (mode === 'random') return 8;
    if (mode === 'continuous') return 12;
    if (mode === 'chromatic' || mode === '12tone') {
        const firstSession = sessions[0];
        if (firstSession && firstSession.direction === 'both') {
            return 24;
        }
        return 12;
    }
    return 8;
};
```

**変更後**:
```javascript
// ModeController活用
const getSessionsPerLesson = (mode, sessions) => {
    const direction = ModeController.extractDirection(sessions);
    return ModeController.getSessionsPerLesson(mode, { direction });
};
```

---

#### Step 2: trainingController.js統合（完了 v2.4.0）

**変更前**:
```javascript
const modeConfig = {
    'random': {
        maxSessions: 8,
        title: 'ランダム基音モード',
        hasIndividualResults: true,
        baseNoteSelection: 'random_c3_octave',
        hasRangeAdjustment: false
    },
    'continuous': {
        maxSessions: 12,
        title: '連続チャレンジモード',
        hasIndividualResults: false,
        baseNoteSelection: 'random_chromatic',
        hasRangeAdjustment: false
    },
    '12tone': {
        maxSessions: 12,
        title: '12音階モード',
        hasIndividualResults: false,
        baseNoteSelection: 'sequential_chromatic',
        hasRangeAdjustment: true
    }
};
```

**変更後（v2.4.0完了）**:
```javascript
// 【v2.4.0】ModeController統合 - modeConfig定義を完全削除
// trainingController.jsでは直接ModeControllerメソッドを使用

// モード有効性チェック
if (modeParam && window.ModeController?.getMode(modeParam)) {
    currentMode = modeParam;
}

// モード名取得
const modeName = window.ModeController?.getModeName(currentMode);

// セッション数取得
const maxSessions = sessionManager.getMaxSessions(); // 内部でModeController使用

// hasIndividualResults取得
const modeConfig = window.ModeController?.getMode(currentMode);
if (modeConfig?.hasIndividualResults) { ... }

// 必要基音数取得
const requiredNotes = window.ModeController?.getRequiredBaseNotes(currentMode);
```

**削除されたコード**:
- `const modeConfig = { ... }` 定義（約20行）
- `modeConfig['12tone'].maxSessions = 24;` 動的変更（不要に）

**旧実装（削除済み）**:
```javascript
// 12音階モード両方向の動的調整（削除済み - ModeController.getSessionsPerLesson()で対応）
if (currentMode === '12tone' && directionParam === 'both') {
    modeConfig['12tone'].maxSessions = ModeController.getSessionsPerLesson('12tone', { direction: 'both' });
}
```

---

#### Step 3: 名称統一の完全実施（完了 v2.0.1）

**対象箇所（すべて完了）**:
- ✅ `results-overview-controller.js`: モード名表示
- ✅ `records-controller.js`: 統計表示のモード名
- ✅ `preparationController.js`: リダイレクトメッセージ、サブタイトル
- ✅ `trainingController.js`: ページタイトル、ログ出力

**統一方法**:
```javascript
// 従来（分散定義）- 削除済み
const modeNames = { 'random': 'ランダム基音モード', ... };
const modeName = modeNames[mode];

// ModeController統合後
const modeName = ModeController.getModeName(mode);
```

---

## 🔄 将来的な拡張計画

### 追加予定モード（ロードマップ）

#### 1. 上行モード（Ascending Diatonic Mode）

**概要**: ド→レ→ミ→ファ→ソ→ラ→シ→ド（8音の上昇音階）

**設計ポイント**:
- ダイアトニックスケール（全音・半音の組み合わせ）
- 2オクターブ対応で基音選択の自由度を確保
- 一般的な人の声域（約2オクターブ）に対応

**ModeController定義案**:
```javascript
'ascending': {
    id: 'ascending',
    name: '上行モード',
    shortName: '上行',
    description: 'ド→ド（上昇）全音・半音の組み合わせ',
    sessionsPerLesson: 8,  // 1オクターブ8音
    baseNoteSelection: 'ascending_diatonic_2octave',
    hasIndividualResults: true,
    hasRangeAdjustment: true,
    difficulty: 'intermediate',
    icon: 'arrow-up'
}
```

---

#### 2. 下行モード（Descending Diatonic Mode）

**概要**: ド→シ→ラ→ソ→ファ→ミ→レ→ド（8音の下降音階）

**設計ポイント**:
- 上行モードと対を成すトレーニング
- 下降音階の聴き取り精度向上
- 同じく2オクターブ対応

**ModeController定義案**:
```javascript
'descending': {
    id: 'descending',
    name: '下行モード',
    shortName: '下行',
    description: 'ド→ド（下降）全音・半音の組み合わせ',
    sessionsPerLesson: 8,
    baseNoteSelection: 'descending_diatonic_2octave',
    hasIndividualResults: true,
    hasRangeAdjustment: true,
    difficulty: 'intermediate',
    icon: 'arrow-down'
}
```

---

#### 3. 弱点練習モード（Weakness Training Mode）

**概要**: ユーザーの苦手な音程に特化した練習モード

**設計ポイント**:
- 過去データから苦手音程を自動抽出
- 集中的な反復練習による克服
- プレミアム機能として実装予定

**ModeController定義案**:
```javascript
'weakness': {
    id: 'weakness',
    name: '弱点練習モード',
    shortName: '弱点練習',
    description: '苦手な音程を集中練習',
    sessionsPerLesson: (options = {}) => {
        // ユーザーの弱点数に応じて動的調整
        return options.weaknessCount || 8;
    },
    baseNoteSelection: 'weakness_focused',
    hasIndividualResults: true,
    hasRangeAdjustment: false,
    difficulty: 'custom',  // ユーザーの弱点に依存
    icon: 'target',
    isPremium: true  // プレミアム機能
}
```

**実装要件**:
- 過去レッスンデータの分析機能
- 苦手音程の抽出アルゴリズム
- 弱点音程の選択的出題システム

---

### 新モード追加時の手順

**STEP 1: ModeController更新**
```javascript
// mode-controller.js
modes: {
    // 既存モード...

    'ascending': {  // ← 新規モード
        id: 'ascending',
        name: '上行モード',
        shortName: '上行',
        description: 'ド→ド（上昇）全音・半音の組み合わせ',
        sessionsPerLesson: 8,
        baseNoteSelection: 'ascending_diatonic_2octave',
        hasIndividualResults: true,
        hasRangeAdjustment: true,
        difficulty: 'intermediate',
        icon: 'arrow-up'
    }
}
```

**STEP 2: 基音選択ロジック実装**
- `trainingController.js`に新しい`baseNoteSelection`ロジック追加
- 例: `selectAscendingDiatonic2Octave()`関数

**STEP 3: UIモード選択に追加**
- モード選択画面に新カード追加
- アイコン・説明文の統一

**完了**: 既存の`records-controller.js`、`results-overview-controller.js`等は**変更不要**

---

### 動的セッション数のさらなる拡張

**将来的な要件例**:
- ユーザー設定による可変セッション数
- 習熟度に応じた自動調整

**実装イメージ**:
```javascript
sessionsPerLesson: (options = {}) => {
    // 習熟度ベース調整
    if (options.userLevel === 'expert') return 20;
    if (options.userLevel === 'intermediate') return 12;
    return 8;
}
```

---

## ⚠️ 注意事項

### 後方互換性

**旧モード名 `chromatic` の扱い**:
- データベースには`chromatic`が残っている可能性あり
- `getSessionsPerLesson()`、`getModeName()`は`chromatic`も受け付け、内部で`12tone`にマッピング

**実装例**:
```javascript
getMode(modeId) {
    // 後方互換性対応
    if (modeId === 'chromatic') {
        console.warn('⚠️ chromaticは非推奨です。12toneを使用してください。');
        modeId = '12tone';
    }

    const mode = this.modes[modeId];
    // ...
}
```

---

### グローバル公開の理由

**なぜ`window.ModeController`にするのか**:
1. **複数ファイルからの参照**: trainingController、records-controller等から利用
2. **SPA環境**: ページ遷移時もインスタンスを維持
3. **デバッグ容易性**: ブラウザコンソールから直接アクセス可能

---

## 🔧 データ修復機能

### 誤ったlessonId自動修復システム

**背景**: trainingController.jsの初期実装で、`startTraining()`が毎回lessonIdを生成していたバグが存在。このバグにより、1つのレッスン（8セッション）が8つの異なるlessonIdを持つ状態で保存されていた。

**実装箇所**: `/PitchPro-SPA/pages/js/records-controller.js`
- 関数: `repairIncorrectLessonIds(sessions)`
- 呼び出し: `groupSessionsIntoLessons()` 関数内で最初に実行

---

### 修復判定基準

誤ったlessonIdと判断する**2つの条件**（両方満たす場合のみ修復対象）:

#### 条件1: セッション数が期待値と完全一致
```javascript
currentGroup.length === expectedSessions
```

**期待値**:
- ランダム基音: 8セッション
- 連続チャレンジ: 12セッション
- 12音階（片方向）: 12セッション
- 12音階（両方向）: 24セッション

#### 条件2: すべてのlessonIdが異なる
```javascript
uniqueLessonIds.size === expectedSessions
```

グループ内のlessonIdの種類数がセッション数と同じ（= すべて異なるlessonId）

---

### 修復ロジック

**STEP 1: グループ化**
- sessionIdでソート（連続セッションを検出）
- 同じmode・chromaticDirection・scaleDirectionのセッションをグループ化

**STEP 2: 修復判定**
```javascript
const uniqueLessonIds = new Set(currentGroup.map(s => s.lessonId));
const needsRepair = currentGroup.length === expectedSessions &&
                    uniqueLessonIds.size === expectedSessions;
```

**STEP 3: lessonId統一**
- 最も古いタイムスタンプのlessonIdを基準とする
- グループ内のすべてのセッションに同じlessonIdを割り当て

**STEP 4: 永続化**
- 修復したデータをlocalStorageに自動保存

---

### 修復例

#### ✅ 修復対象（誤ったデータ）
```javascript
// ランダム基音の8セッション（バグによる異常データ）
Session 1: lesson_1762916296329_random_random_ascending
Session 2: lesson_1762916307762_random_random_ascending  // ← タイムスタンプ違い
Session 3: lesson_1762916318254_random_random_ascending  // ← タイムスタンプ違い
...
Session 8: lesson_1762916365123_random_random_ascending  // ← タイムスタンプ違い

// 判定結果
currentGroup.length = 8 (期待値8と一致) ✅
uniqueLessonIds.size = 8 (8個すべて異なる) ✅
→ needsRepair = true（修復実行）

// 修復後
Session 1-8: lesson_1762916296329_random_random_ascending  // ← 最古のIDに統一
```

#### ❌ 修復対象外（正常データ）

**ケース1: 正しくグループ化されたレッスン**
```javascript
// ランダム基音の8セッション（正常）
Session 1-8: lesson_1762916296329_random_random_ascending

// 判定結果
currentGroup.length = 8 (期待値8と一致) ✅
uniqueLessonIds.size = 1 (すべて同じlessonId) ❌
→ needsRepair = false（修復不要）
```

**ケース2: トレーニング中断（不完全なレッスン）**
```javascript
// ランダム基音を5セッションで中断
Session 1-5: 各々異なるlessonId

// 判定結果
currentGroup.length = 5 (期待値8と不一致) ❌
uniqueLessonIds.size = 5
→ needsRepair = false（修復しない - 中断データ）
```

**ケース3: 部分的に正しいレッスン**
```javascript
// ランダム基音8セッション（最初の3つは同じlessonId）
Session 1-3: lesson_1762916296329_random_random_ascending
Session 4: lesson_1762916350000_random_random_ascending  // ← 違うID
Session 5-8: 各々異なるlessonId

// 判定結果
currentGroup.length = 8 (期待値8と一致) ✅
uniqueLessonIds.size = 6 (8個ではない) ❌
→ needsRepair = false（修復しない - 手動確認が必要なケース）
```

---

### 修復ログ出力

**修復実行時**:
```
🔍 [Repair] lessonId修復チェック開始
🔧 [Repair] randomモードのセッション1-8を修復
   修復前: 8個の異なるlessonId
   修復後: lesson_1762916296329_random_random_ascendingに統一
✅ [Repair] 7個のセッションのlessonIdを修復完了
💾 [Repair] 修復済みデータをlocalStorageに保存完了
```

**修復不要時**:
```
🔍 [Repair] lessonId修復チェック開始
✅ [Repair] 修復が必要なセッションはありませんでした
```

---

### 設計方針

**なぜこの基準なのか**:
1. **バグの特徴に基づく**: startTraining()が毎回lessonIdを生成していたバグの特徴
   - 完全なトレーニング完了: セッション数が期待値と一致
   - すべてのセッションで新規生成: すべて異なるlessonId

2. **安全性優先**: 部分的に誤っているデータは手動確認が必要な可能性があるため修復対象外

3. **自動復旧**: ユーザーがlocalStorageを削除する必要なし

**今後の拡張**:
- 部分的に誤ったデータの検出・警告機能
- 修復履歴の記録・ログ機能
- 修復前データのバックアップ機能

---

## 📝 変更履歴

### v2.4.0 (2025-11-22)

**🔗 trainingController.js完全統合**:
- `modeConfig`定義（約20行）を完全削除
- 11箇所のmodeConfig参照をModeControllerメソッドに置換
- maxSessionsの動的変更コードを削除（ModeController.getSessionsPerLesson()で対応）

**🆕 新プロパティ追加**:
- 各モードに`requiredBaseNotes`追加（音域内必要最小基音数）
  - random: 8
  - continuous: 12
  - 12tone: 12

**🆕 新メソッド追加**:
- `getRequiredBaseNotes(modeId)`: 音域内に必要な最小基音数を取得
- `validateTrainingParams(params)`: トレーニングパラメータの一括検証（v2.3.0）
- `getValidModeIds()`: 有効なモードIDリスト取得（v2.3.0）

**🔗 NavigationManager連携（v4.6.1）**:
- ダイレクトアクセス時のパラメータ検証にModeController.validateTrainingParams()使用
- 新モード追加時もModeController.modesの更新のみで対応可能

**📈 保守性向上**:
- モード情報の単一情報源（Single Source of Truth）を完全実現
- 新モード追加時の修正箇所を1箇所に集約
- ハードコードされた分散定義を完全排除

---

### v2.0.0 (2025-11-12)

**🆕 2次元モード管理システム実装**:
- chromaticDirection（基音進行方向）の追加: random, ascending, descending, both
- scaleDirection（音階方向）の追加: ascending（上行）, descending（下行）
- モード × 基音進行方向 × 音階方向の組み合わせ対応

**🔄 lessonIdベースのデータ管理**:
- セッションカウント方式からlessonId方式への移行
- トレーニング中断・再開の正確な管理
- 可変セッション数モードへの対応

**🐛 バグ修正**:
- trainingController.jsのlessonId生成タイミング修正（初回のみ生成）
- トレーニング記録のグループ化ロジック修正
- モード別統計の表示名に基音進行方向を追加

**🔧 データ修復機能追加**:
- 誤ったlessonId自動修復システム実装（repairIncorrectLessonIds関数）
- 2つの条件による修復判定（セッション数一致 + すべて異なるlessonId）
- 修復データの自動localStorage保存
- 詳細な修復ログ出力機能

**📄 仕様書更新**:
- 2次元モード管理の詳細追加
- lessonId方式の設計思想追加
- セッションデータ構造v2.0.0の定義
- データ修復機能の詳細仕様追加

---

### v1.0.0 (2025-11-11)
- 初版作成
- 3つのモード定義統合（random, continuous, 12tone）
- 6つの主要API実装
- 12音階モード両方向対応（24セッション）
- 将来的な拡張計画策定
