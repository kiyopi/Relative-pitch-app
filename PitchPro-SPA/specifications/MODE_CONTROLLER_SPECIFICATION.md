# ModeController仕様書

**バージョン**: 1.0.0
**作成日**: 2025-11-11
**最終更新**: 2025-11-11

---

## 📋 概要

全トレーニングモードの定義と設定を一元管理する統合コントローラー。モード情報の分散を防ぎ、将来的なモード追加に対応できるスケーラブルな設計を実現する。

### 対象ファイル
- `/PitchPro-SPA/js/mode-controller.js`

### 使用箇所
- `trainingController.js`: トレーニング実行時のモード設定取得
- `records-controller.js`: レッスングループ化時のセッション数取得
- `session-data-recorder.js`: セッションデータ保存時のモード情報取得

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
    baseNoteSelection: string,     // 基音選択方式
    hasIndividualResults: boolean, // セッション個別結果表示の有無
    hasRangeAdjustment: boolean,   // 音域調整機能の有無
    difficulty: string,            // 難易度（'beginner', 'intermediate', 'advanced'）
    icon: string,                  // Lucideアイコン名
    directions?: object            // 12音階モード専用：方向性設定
}
```

#### 12音階モード専用フィールド

```javascript
directions: {
    'ascending': {
        name: '上昇',
        sessions: 12
    },
    'descending': {
        name: '下降',
        sessions: 12
    },
    'both': {
        name: '両方向',
        sessions: 24
    }
}
```

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

### 3. getModeName(modeId, useShortName)

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

## 📊 統合戦略

### Phase 1: ModeController導入（完了）

**作業内容**:
- [x] `mode-controller.js`ファイル作成
- [x] モード定義の統合
- [x] 主要APIメソッド実装
- [x] グローバル公開 (`window.ModeController`)

---

### Phase 2: 段階的統合（次回作業）

#### Step 1: records-controller.js統合

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

#### Step 2: trainingController.js統合

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

**変更後**:
```javascript
// ModeController活用
const modeConfig = ModeController.toTrainingConfig();

// 12音階モード両方向の動的調整
if (currentMode === '12tone' && directionParam === 'both') {
    modeConfig['12tone'].maxSessions = ModeController.getSessionsPerLesson('12tone', { direction: 'both' });
}
```

---

#### Step 3: 名称統一の完全実施

**対象箇所**:
- `results-overview-controller.js`: モード名表示
- `records-controller.js`: 統計表示のモード名
- `session-data-recorder.js`: モード名ロギング

**統一方法**:
```javascript
// 従来（分散定義）
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

## 📝 変更履歴

### v1.0.0 (2025-11-11)
- 初版作成
- 3つのモード定義統合（random, continuous, 12tone）
- 6つの主要API実装
- 12音階モード両方向対応（24セッション）
- 将来的な拡張計画策定
