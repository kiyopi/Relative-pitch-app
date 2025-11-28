# 詳細分析ページ テストデータ仕様書

**バージョン**: 1.0.0
**作成日**: 2025-11-27
**目的**: 詳細分析ページ（premium-analysis）の動作検証用ダミーデータの仕様定義

---

## 1. 概要

### 1.1 目的
詳細分析ページの全機能を検証するためのテストデータを、コンソールから生成できるようにする。

### 1.2 対象ページ
- `/PitchPro-SPA/pages/premium-analysis.html`
- `/PitchPro-SPA/pages/js/premium-analysis-controller.js`
- `/PitchPro-SPA/pages/js/premium-analysis-calculator.js`

### 1.3 検証対象機能
| タブ | 機能 | 検証項目 |
|------|------|----------|
| Tab 1 | 音程精度分析 | 平均誤差、音程間隔別精度、音域ブロック分析 |
| Tab 2 | エラーパターン | シャープ/フラット傾向、音程拡大・縮小パターン |
| Tab 3 | 練習プラン | 優先度別プラン生成、弱点音程の特定 |
| Tab 4 | 成長記録 | 月間比較、TOP3改善/停滞、時系列分析、モード別熟練度 |

---

## 2. トレーニングモード定義

### 2.1 全10モード一覧

| カテゴリ | モードキー | 表示名 | セッション数/レッスン | session.mode | session.chromaticDirection | session.scaleDirection |
|---------|-----------|--------|---------------------|--------------|---------------------------|------------------------|
| **初級** | `random-ascending` | ランダム基音（上行） | 8 | `random` | `random` | `ascending` |
| **初級** | `random-descending` | ランダム基音（下行） | 8 | `random` | `random` | `descending` |
| **中級** | `continuous-ascending` | 連続チャレンジ（上行） | 12 | `continuous` | `ascending` | `ascending` |
| **中級** | `continuous-descending` | 連続チャレンジ（下行） | 12 | `continuous` | `ascending` | `descending` |
| **上級** | `twelve-asc-ascending` | 12音階 上昇順（上行） | 12 | `twelve` | `ascending` | `ascending` |
| **上級** | `twelve-asc-descending` | 12音階 上昇順（下行） | 12 | `twelve` | `ascending` | `descending` |
| **上級** | `twelve-desc-ascending` | 12音階 下降順（上行） | 12 | `twelve` | `descending` | `ascending` |
| **上級** | `twelve-desc-descending` | 12音階 下降順（下行） | 12 | `twelve` | `descending` | `descending` |
| **上級** | `twelve-both-ascending` | 12音階 両方向（上行） | 24 | `twelve` | `both` | `ascending` |
| **上級** | `twelve-both-descending` | 12音階 両方向（下行） | 24 | `twelve` | `both` | `descending` |

### 2.2 モード正規化ロジック

詳細分析ページ内部での正規化（`PremiumAnalysisCalculator.normalizeSessionMode()`）：

```javascript
// 12音階の場合
if (mode === 'twelve' || mode === '12tone') {
    let orderKey = 'asc'; // デフォルト
    if (chromaticDirection === 'ascending') orderKey = 'asc';
    else if (chromaticDirection === 'descending') orderKey = 'desc';
    else if (chromaticDirection === 'both') orderKey = 'both';
    return `twelve-${orderKey}-${scaleDirection}`;
}

// それ以外（random, continuous）
return `${mode}-${scaleDirection}`;
```

---

## 3. セッションデータ構造

### 3.1 セッションオブジェクト

```javascript
{
  sessionId: number,              // セッションID（ユニーク、連番）
  lessonId: string,               // レッスンID（同一レッスン内で共通）
                                  // 形式: "lesson_{timestamp}_{mode}_{chromaticDirection}_{scaleDirection}"

  // モード情報
  mode: string,                   // "random" | "continuous" | "twelve"
  chromaticDirection: string,     // "random" | "ascending" | "descending" | "both"
  scaleDirection: string,         // "ascending" | "descending"

  // 基音情報
  baseNote: string,               // 基音の音名（例: "C4", "E3", "F#4"）
  baseFrequency: number,          // 基音の周波数（Hz）

  // タイムスタンプ
  startTime: number,              // セッション開始時刻（Date.now()）
  endTime: number,                // セッション終了時刻
  timestamp: number,              // データ作成時刻（通常はstartTimeと同じ）
  duration: number,               // セッション時間（ms）

  // 状態
  completed: boolean,             // 完了フラグ（trueのみ保存）

  // 音程データ（8ステップ）
  pitchErrors: [
    {
      step: number,               // ステップ番号（0-7）
      expectedNote: string,       // 期待される音名（実際の音名、基音から計算）
      expectedFrequency: number,  // 期待される周波数（Hz）
      detectedFrequency: number,  // 検出された周波数（Hz）
      errorInCents: number,       // セント誤差（正=シャープ、負=フラット）
      clarity: number,            // 明瞭度（0.0-1.0）
      volume: number,             // 音量（0.0-1.0）
      timestamp: number           // ステップのタイムスタンプ
    },
    // ... 8ステップ分
  ]
}
```

### 3.2 基音と音程の関係

**重要**: 基音はランダムに選ばれ、その音を「ド」として発声する。

#### 上行（ascending）の場合

| step | ソルフェージュ | 半音数 | 周波数比 | 例: 基音E3 (164.81Hz) |
|------|---------------|--------|----------|----------------------|
| 0 | ド（1度） | 0 | 1.0000 | E3 (164.81Hz) |
| 1 | レ（2度） | 2 | 1.1225 | F#3 (184.99Hz) |
| 2 | ミ（3度） | 4 | 1.2599 | G#3 (207.65Hz) |
| 3 | ファ（4度） | 5 | 1.3348 | A3 (220.00Hz) |
| 4 | ソ（5度） | 7 | 1.4983 | B3 (246.94Hz) |
| 5 | ラ（6度） | 9 | 1.6818 | C#4 (277.18Hz) |
| 6 | シ（7度） | 11 | 1.8877 | D#4 (311.13Hz) |
| 7 | ド（8度） | 12 | 2.0000 | E4 (329.63Hz) |

#### 下行（descending）の場合

| step | ソルフェージュ | 半音数 | 周波数比 | 例: 基音E4 (329.63Hz) |
|------|---------------|--------|----------|----------------------|
| 0 | ド（1度） | 0 | 1.0000 | E4 (329.63Hz) |
| 1 | シ（7度） | -1 | 0.9439 | D#4 (311.13Hz) |
| 2 | ラ（6度） | -3 | 0.8409 | C#4 (277.18Hz) |
| 3 | ソ（5度） | -5 | 0.7492 | B3 (246.94Hz) |
| 4 | ファ（4度） | -7 | 0.6674 | A3 (220.00Hz) |
| 5 | ミ（3度） | -8 | 0.6300 | G#3 (207.65Hz) |
| 6 | レ（2度） | -10 | 0.5612 | F#3 (184.99Hz) |
| 7 | ド（1度） | -12 | 0.5000 | E3 (164.81Hz) |

### 3.3 音名と周波数の対応表

```javascript
const NOTE_FREQUENCIES = {
  'C2': 65.41,   'C#2': 69.30,  'D2': 73.42,   'D#2': 77.78,
  'E2': 82.41,   'F2': 87.31,   'F#2': 92.50,  'G2': 98.00,
  'G#2': 103.83, 'A2': 110.00,  'A#2': 116.54, 'B2': 123.47,

  'C3': 130.81,  'C#3': 138.59, 'D3': 146.83,  'D#3': 155.56,
  'E3': 164.81,  'F3': 174.61,  'F#3': 185.00, 'G3': 196.00,
  'G#3': 207.65, 'A3': 220.00,  'A#3': 233.08, 'B3': 246.94,

  'C4': 261.63,  'C#4': 277.18, 'D4': 293.66,  'D#4': 311.13,
  'E4': 329.63,  'F4': 349.23,  'F#4': 369.99, 'G4': 392.00,
  'G#4': 415.30, 'A4': 440.00,  'A#4': 466.16, 'B4': 493.88,

  'C5': 523.25,  'C#5': 554.37, 'D5': 587.33,  'D#5': 622.25,
  'E5': 659.25,  'F5': 698.46,  'F#5': 739.99, 'G5': 783.99
};
```

### 3.4 音域ブロック分類

詳細分析の「音域ブロック分析」で使用する分類：

| ブロック | 音名 | 説明 |
|----------|------|------|
| Aブロック | C, C#, D, D#, E, F, F# | 低〜中音域 |
| Bブロック | G, G#, A, A#(B♭), B | 中〜高音域 |

**注意**: 分類は`expectedNote`からオクターブ番号を除いた音名で判定。

---

## 4. テストシナリオ定義

### 4.1 シナリオA: 初心者→中級への成長ストーリー（推奨）

**概要**: 3ヶ月間の成長過程を再現。最もリアルなユーザー体験。

#### データ構成

| 期間 | 経過日数 | モード | レッスン数 | 平均誤差 | 特徴 |
|------|---------|--------|-----------|----------|------|
| 1ヶ月目 | 60-90日前 | ランダム基音（上行）のみ | 8 | ±50-60¢ | 初心者、フラット傾向（60%） |
| 1.5ヶ月目 | 45-60日前 | ランダム基音（上行・下行） | 各4 | ±40-50¢ | 改善開始、7度が苦手 |
| 2ヶ月目 | 30-45日前 | ランダム + 連続チャレンジ開始 | 各3 | ±30-40¢ | 中級挑戦、2度・7度に課題 |
| 3ヶ月目 | 0-30日前 | 全モード挑戦 | 各2-3 | ±20-35¢ | 中級到達、バランス改善 |

#### 誤差パターン（1ヶ月目）

| step | 音程 | 平均誤差 | 傾向 |
|------|------|----------|------|
| 0 | 1度 | ±15¢ | 基音は比較的正確 |
| 1 | 2度 | ±55¢ | 苦手（シャープ傾向） |
| 2 | 3度 | ±40¢ | やや苦手 |
| 3 | 4度 | ±35¢ | 普通 |
| 4 | 5度 | ±30¢ | 比較的得意 |
| 5 | 6度 | ±45¢ | やや苦手 |
| 6 | 7度 | ±65¢ | 最も苦手（フラット傾向） |
| 7 | 8度 | ±25¢ | オクターブは比較的正確 |

#### 検証できる機能

- ✅ Tab 1: 音程間隔別精度（弱点可視化）
- ✅ Tab 1: 音域ブロック分析（Bブロックが弱い）
- ✅ Tab 2: シャープ/フラット傾向の変化
- ✅ Tab 2: 音程拡大・縮小パターン
- ✅ Tab 3: 練習プラン生成（2度・7度が優先度1）
- ✅ Tab 4: 月間成長比較（改善傾向）
- ✅ Tab 4: TOP3改善音程
- ✅ Tab 4: 時系列分析（学習効果）
- ✅ Tab 4: モード別熟練度（段階的上昇）

---

### 4.2 シナリオB: 特定音程に弱点を持つユーザー

**概要**: 7度と2度が苦手、他は良好。弱点分析機能のテスト向け。

#### 誤差パターン

| step | 音程 | 平均誤差 | 傾向 | 特記 |
|------|------|----------|------|------|
| 0 | 1度 | ±10¢ | 正確 | Excellent |
| 1 | 2度 | ±55¢ | シャープ傾向（+40¢平均） | 弱点 |
| 2 | 3度 | ±18¢ | 正確 | Good |
| 3 | 4度 | ±22¢ | やや正確 | Good |
| 4 | 5度 | ±15¢ | 正確 | Excellent |
| 5 | 6度 | ±25¢ | やや正確 | Good |
| 6 | 7度 | ±60¢ | フラット傾向（-45¢平均） | 弱点 |
| 7 | 8度 | ±12¢ | 正確 | Excellent |

#### データ構成

- モード: ランダム基音（上行・下行）、連続チャレンジ（上行）
- 期間: 過去30日間
- レッスン数: 各5レッスン

#### 検証できる機能

- ✅ Tab 1: 音程間隔別精度の極端な差
- ✅ Tab 2: 音程別のシャープ/フラット傾向
- ✅ Tab 3: 練習プラン（優先度1に2度・7度が表示されるか）

---

### 4.3 シナリオC: 上級者（S級チャレンジャー）

**概要**: 12音階モードを中心に高精度。上級機能のテスト向け。

#### データ構成

| モード | レッスン数 | 平均誤差 | 熟練度目安 |
|--------|-----------|----------|-----------|
| ランダム基音（上行） | 15 | ±12¢ | Lv.8-9 |
| ランダム基音（下行） | 12 | ±15¢ | Lv.7-8 |
| 連続チャレンジ（上行） | 10 | ±18¢ | Lv.6-7 |
| 連続チャレンジ（下行） | 8 | ±20¢ | Lv.5-6 |
| 12音階 上昇順（上行） | 5 | ±22¢ | Lv.4-5 |
| 12音階 上昇順（下行） | 4 | ±25¢ | Lv.3-4 |
| 12音階 下降順（上行） | 3 | ±28¢ | Lv.3-4 |
| 12音階 下降順（下行） | 3 | ±30¢ | Lv.2-3 |
| 12音階 両方向（上行） | 2 | ±26¢ | Lv.2-3 |
| 12音階 両方向（下行） | 2 | ±28¢ | Lv.2-3 |

#### 検証できる機能

- ✅ Tab 4: 高レベル熟練度表示
- ✅ Tab 4: 12音階サブグループ比較（上昇順/下降順/両方向）
- ✅ Tab 4: 上行/下行の精度差分析
- ✅ Tab 4: 成長停滞パターン（すでに高精度で改善幅小）

---

### 4.4 シナリオD: データ不足状態

**概要**: 始めたばかりのユーザー。エッジケース表示のテスト。

#### データ構成

- ランダム基音（上行）: 1レッスン（3セッションのみ、不完全）
- 他モード: データなし

#### 検証できる機能

- ✅ データ不足時のUI表示
- ✅ 「まだデータがありません」カードの表示
- ✅ 成長記録の代替表示（データ中央分割）
- ✅ モード別熟練度の「データなし」表示

---

### 4.5 シナリオE: エッジケース（バグ検出用）

**概要**: 極端なデータでエラーハンドリングを検証。

#### 含めるパターン

| パターン | 内容 | 検証目的 |
|----------|------|----------|
| 外れ値 | errorInCents: ±850¢ | 800¢超の警告表示 |
| 同一誤差 | 全ステップ同じ誤差（±25¢） | 平均計算の正確性 |
| 不完全レッスン | 8セッション中3セッションのみ | フィルタリング処理 |
| 古いデータ | 180日前のセッション | 時系列分析の境界 |
| 誤差ゼロ | errorInCents: 0 | 完璧な精度の表示 |

---

## 5. テストデータ生成インターフェース

### 5.1 コンソールAPI設計

```javascript
// グローバル関数として公開
window.TestDataGenerator = {
  // 全シナリオ生成
  generateAll: function() { ... },

  // 個別シナリオ生成
  generateScenarioA: function() { ... },  // 成長ストーリー
  generateScenarioB: function() { ... },  // 弱点パターン
  generateScenarioC: function() { ... },  // 上級者
  generateScenarioD: function() { ... },  // データ不足
  generateScenarioE: function() { ... },  // エッジケース

  // カスタム生成
  generateCustom: function(options) { ... },

  // データクリア
  clearTestData: function() { ... },

  // 現在のデータ確認
  inspectData: function() { ... }
};
```

### 5.2 使用例

```javascript
// コンソールから実行

// シナリオA（成長ストーリー）を生成
TestDataGenerator.generateScenarioA();

// 生成されたデータを確認
TestDataGenerator.inspectData();

// データをクリア
TestDataGenerator.clearTestData();

// 全シナリオを生成（包括テスト用）
TestDataGenerator.generateAll();

// カスタム生成
TestDataGenerator.generateCustom({
  scenarios: ['A', 'B'],  // 生成するシナリオ
  startDate: Date.now() - 90 * 24 * 60 * 60 * 1000,  // 開始日
  errorMultiplier: 1.2  // 誤差を1.2倍に
});
```

---

## 6. 実装ファイル

### 6.1 ファイル構成

```
PitchPro-SPA/
├── test/
│   └── premium-analysis-test-data-generator.js  # テストデータ生成スクリプト
└── specifications/
    └── PREMIUM_ANALYSIS_TEST_DATA_SPECIFICATION.md  # 本仕様書
```

### 6.2 読み込み方法

```html
<!-- 開発時のみ読み込み -->
<script src="test/premium-analysis-test-data-generator.js"></script>
```

または、コンソールから直接ペースト実行。

---

## 7. 推奨テスト手順

### 7.1 基本テスト

1. `TestDataGenerator.generateScenarioA()` を実行
2. 詳細分析ページを開く
3. 全タブの表示を確認
4. `TestDataGenerator.clearTestData()` でクリア

### 7.2 包括テスト

1. `TestDataGenerator.generateAll()` を実行
2. 詳細分析ページを開く
3. 以下を確認：
   - Tab 1: 音程精度グラフ、音域ブロック分析
   - Tab 2: シャープ/フラット円グラフ、拡大/縮小パターン
   - Tab 3: 練習プラン3項目
   - Tab 4: 月間比較、成長グラフ、モード別熟練度カード
4. モード別熟練度の展開/折りたたみを確認
5. `TestDataGenerator.clearTestData()` でクリア

### 7.3 エッジケーステスト

1. `TestDataGenerator.generateScenarioD()` を実行（データ不足）
2. 「データがありません」表示を確認
3. `TestDataGenerator.generateScenarioE()` を実行（エッジケース）
4. 800¢超の警告表示を確認
5. コンソールにエラーが出ていないことを確認

---

## 8. 関連ドキュメント

- `PREMIUM_ANALYSIS_DESIGN_SPECIFICATION.md` - 詳細分析ページ設計仕様書
- `DATA_MANAGEMENT_SPECIFICATION.md` - データ管理仕様書
- `EVALUATION_SYSTEM_SPECIFICATION.md` - 評価システム仕様書
- `TRAINING_SPECIFICATION.md` - トレーニング機能仕様書

---

## 9. 更新履歴

| 日付 | バージョン | 内容 |
|------|-----------|------|
| 2025-11-27 | 1.0.0 | 初版作成 |
