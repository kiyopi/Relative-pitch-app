# グレード一覧表（統合リファレンス）

**バージョン**: 1.1.0
**作成日**: 2025-11-09
**最終更新**: 2025-11-09
**目的**: グレード評価システムの完全な仕様を一覧表で管理
**重要性**: 実装・UI・仕様書間の一貫性を保証

---

## 📊 グレード総合一覧表

### 基本情報

| グレード | レベル | 評価 | 説明メッセージ |
|---------|--------|------|---------------|
| **S** | プロレベル | 最高評価 | プロレベル！レコーディング品質の精度です |
| **A** | 優秀 | 高評価 | 素晴らしい！楽器アンサンブルに対応できます |
| **B** | 良好 | 合格 | 実用レベル！合唱や弾き語りに最適です |
| **C** | 基礎習得 | 合格 | 基礎習得！カラオケや趣味演奏を楽しめます |
| **D** | 要練習 | 不合格 | 練習中！基礎をしっかり身につけましょう |
| **E** | 基礎レベル | 不合格 | 基礎から！一歩ずつ確実に向上していきます |

---

## 🎨 UI表示情報

### カラー定義

| グレード | TailwindCSSクラス | 色コード | 色名 | 用途 |
|---------|------------------|---------|------|------|
| **S** | `text-yellow-300` | #FCD34D | 金色 | プロフェッショナルを表現 |
| **A** | `text-green-300` | #86EFAC | 緑色 | 優秀・成功を表現 |
| **B** | `text-blue-300` | #93C5FD | 青色 | 良好・安定を表現 |
| **C** | `text-orange-300` | #FDBA74 | オレンジ色 | 合格ラインを表現 |
| **D** | `text-red-300` | #FCA5A5 | 赤色 | 要改善を表現 |
| **E** | `text-gray-300` | #D1D5DB | グレー | 基礎レベルを表現 |

### Lucideアイコン

| グレード | アイコン名 | アイコン表示 | 意味 |
|---------|-----------|------------|------|
| **S** | `crown` | 👑 | 王冠（最高の栄誉） |
| **A** | `award` | 🏅 | メダル（優秀な成果） |
| **B** | `star` | ⭐ | 星（良好な評価） |
| **C** | `smile` | 😊 | 笑顔（基礎習得） |
| **D** | `meh` | 😐 | 普通（要練習） |
| **E** | `frown` | 😞 | 困り顔（基礎から） |

**注意**: Lucide v0.263.0を使用（Safari互換性のため）

---

## 🎯 セッション評価（4ランク）

### 基本情報

| ランク | レベル | 評価範囲 | 説明メッセージ |
|---------|--------|---------|---------------|
| **Excellent** | 優秀 | ≤20¢ | 素晴らしい精度！ |
| **Good** | 良好 | 21-35¢ | 良好な精度！ |
| **Pass** | 合格 | 36-50¢ | 合格ライン達成！ |
| **Practice** | 要練習 | >50¢ | 練習を続けましょう！ |

### UI表示情報

| ランク | TailwindCSSクラス | 色コード | Lucideアイコン | CSSクラス |
|---------|------------------|---------|---------------|-----------|
| **Excellent** | `text-yellow-300` | #FCD34D | `trophy` | `color-eval-gold` |
| **Good** | `text-green-300` | #86EFAC | `star` | `color-eval-good` |
| **Pass** | `text-blue-300` | #93C5FD | `thumbs-up` | `color-eval-pass` |
| **Practice** | `text-red-300` | #FCA5A5 | `alert-triangle` | `color-eval-practice` |

### 評価基準の詳細

**Excellent（優秀）**:
- **誤差範囲**: ±20¢以下
- **音楽的意味**: プロフェッショナルレベル、音程がほぼ完璧
- **対象**: レコーディング品質、楽器アンサンブル対応可能

**Good（良好）**:
- **誤差範囲**: ±21〜35¢
- **音楽的意味**: 実用レベル、合唱や弾き語りに十分
- **対象**: 一般的な音楽活動で問題なし

**Pass（合格）**:
- **誤差範囲**: ±36〜50¢
- **音楽的意味**: 基礎習得、カラオケや趣味演奏で楽しめる
- **対象**: 初心者〜中級者の目標ライン

**Practice（要練習）**:
- **誤差範囲**: ±50¢超
- **音楽的意味**: さらなる練習が必要
- **対象**: 基礎トレーニング継続推奨

### JavaScript実装リファレンス

#### evaluatePitchError関数（個別音程評価）
```javascript
static evaluatePitchError(absError) {
    if (absError <= 20) {
        return {
            level: 'excellent',
            icon: 'trophy',
            color: 'text-yellow-300',
            cssClass: 'color-eval-gold',
            message: '素晴らしい精度！'
        };
    } else if (absError <= 35) {
        return {
            level: 'good',
            icon: 'star',
            color: 'text-green-300',
            cssClass: 'color-eval-good',
            message: '良好な精度！'
        };
    } else if (absError <= 50) {
        return {
            level: 'pass',
            icon: 'thumbs-up',
            color: 'text-blue-300',
            cssClass: 'color-eval-pass',
            message: '合格ライン達成！'
        };
    } else {
        return {
            level: 'practice',
            icon: 'alert-triangle',
            color: 'text-red-300',
            cssClass: 'color-eval-practice',
            message: '練習を続けましょう！'
        };
    }
}
```

#### evaluateAverageError関数（セッションバッジ用）
```javascript
static evaluateAverageError(avgError) {
    return this.evaluatePitchError(avgError);
}
```

**用途**:
- 総合評価ページのセッショングリッド表示
- セッション詳細分析の精度バッジ
- 音別詳細結果の評価アイコン
- 評価分布グラフの集計

---

## 📏 評価基準（モード別）

### ランダム基音モード（初級・8セッション）

| グレード | 平均誤差 | 優秀音割合 | 対象レベル |
|---------|---------|-----------|-----------|
| **S** | ≤25¢ | ≥70% | カラオケ上級 |
| **A** | ≤35¢ | ≥60% | カラオケ中級 |
| **B** | ≤45¢ | ≥50% | カラオケ初級 |
| **C** | ≤55¢ | ≥40% | 趣味レベル |
| **D** | ≤65¢ | ≥30% | 練習中 |
| **E** | ≤80¢ | ≥20% | 基礎から |

**基準の考え方**:
- 技術制約考慮の寛容基準
- デバイス測定誤差（±10〜15¢）を加味
- 初心者でも達成可能なライン設定

### 連続チャレンジモード（中級・12セッション）

| グレード | 平均誤差 | 優秀音割合 | 対象レベル |
|---------|---------|-----------|-----------|
| **S** | ≤20¢ | ≥75% | 合唱上級 |
| **A** | ≤30¢ | ≥65% | 合唱中級 |
| **B** | ≤40¢ | ≥55% | 合唱初級 |
| **C** | ≤50¢ | ≥45% | 実用レベル |
| **D** | ≤60¢ | ≥35% | 練習中 |
| **E** | ≤75¢ | ≥25% | 基礎から |

**基準の考え方**:
- 標準的な相対音感基準
- 実用レベルの音感を目標
- プロ歌手の実測データ（20〜30¢）を参考

### 12音階モード（上級・24セッション）

| グレード | 平均誤差 | 優秀音割合 | 対象レベル |
|---------|---------|-----------|-----------|
| **S** | ≤15¢ | ≥80% | プロレベル |
| **A** | ≤25¢ | ≥70% | セミプロ |
| **B** | ≤35¢ | ≥60% | 楽器演奏可能 |
| **C** | ≤45¢ | ≥50% | アンサンブル可能 |
| **D** | ≤55¢ | ≥40% | 練習中 |
| **E** | ≤70¢ | ≥30% | 基礎から |

**基準の考え方**:
- より厳格な基準
- プロフェッショナルレベルを目標
- 楽器アンサンブル対応を想定

---

## 💻 実装リファレンス

### JavaScript定数定義

#### 1. gradeOrder配列（優先順位）
```javascript
const gradeOrder = ['S', 'A', 'B', 'C', 'D', 'E'];
```

**用途**: 最高グレード判定時の比較順序

#### 2. gradeColors定義（UI表示）
```javascript
const gradeColors = {
    'S': 'text-yellow-300',    // プロレベル（金色）
    'A': 'text-green-300',     // 優秀（緑色）
    'B': 'text-blue-300',      // 良好（青色）
    'C': 'text-orange-300',    // 合格（オレンジ色）
    'D': 'text-red-300',       // 要練習（赤色）
    'E': 'text-gray-300'       // 基礎レベル（グレー）
};
```

**用途**: セッションカード・統計表示での色分け

#### 3. gradeDescriptions定義（メッセージ）
```javascript
const gradeDescriptions = {
    'S': {
        message: 'プロレベル！レコーディング品質の精度です',
        icon: 'crown',
        color: 'gold'
    },
    'A': {
        message: '素晴らしい！楽器アンサンブルに対応できます',
        icon: 'award',
        color: 'silver'
    },
    'B': {
        message: '実用レベル！合唱や弾き語りに最適です',
        icon: 'star',
        color: 'orange'
    },
    'C': {
        message: '基礎習得！カラオケや趣味演奏を楽しめます',
        icon: 'smile',
        color: 'green'
    },
    'D': {
        message: '練習中！基礎をしっかり身につけましょう',
        icon: 'meh',
        color: 'blue'
    },
    'E': {
        message: '基礎から！一歩ずつ確実に向上していきます',
        icon: 'frown',
        color: 'red'
    }
};
```

**用途**: 総合評価ページでの詳細メッセージ表示

#### 4. モード別評価基準（EvaluationCalculator）
```javascript
static getModeSpecificThresholds(actualSessions) {
    let sessionCount;
    if (actualSessions <= 8) sessionCount = 8;
    else if (actualSessions <= 12) sessionCount = 12;
    else sessionCount = 24;

    const thresholds = {
        8: {  // ランダム基音（初級）
            S: { avgError: 25, excellence: 0.70 },
            A: { avgError: 35, excellence: 0.60 },
            B: { avgError: 45, excellence: 0.50 },
            C: { avgError: 55, excellence: 0.40 },
            D: { avgError: 65, excellence: 0.30 },
            E: { avgError: 80, excellence: 0.20 }
        },
        12: { // 連続チャレンジ（中級）
            S: { avgError: 20, excellence: 0.75 },
            A: { avgError: 30, excellence: 0.65 },
            B: { avgError: 40, excellence: 0.55 },
            C: { avgError: 50, excellence: 0.45 },
            D: { avgError: 60, excellence: 0.35 },
            E: { avgError: 75, excellence: 0.25 }
        },
        24: { // 12音階（上級）
            S: { avgError: 15, excellence: 0.80 },
            A: { avgError: 25, excellence: 0.70 },
            B: { avgError: 35, excellence: 0.60 },
            C: { avgError: 45, excellence: 0.50 },
            D: { avgError: 55, excellence: 0.40 },
            E: { avgError: 70, excellence: 0.30 }
        }
    };

    return {
        thresholds: thresholds[sessionCount],
        sessionCount,
        explanation: `${sessionCount}セッション${sessionCount === 8 ? '（初級）' : sessionCount === 12 ? '（中級）' : '（上級）'}基準適用`
    };
}
```

---

## 📝 実装ファイル一覧

### 参照すべきファイル

| ファイル | 内容 | グレード関連箇所 |
|---------|------|----------------|
| `evaluation-calculator.js` | 評価計算エンジン | Line 275-313: モード別基準<br>Line 318-347: グレード判定<br>Line 352-363: 説明文<br>Line 376-423: セッション評価4ランク |
| `records-controller.js` | 記録ページ | Line 130: gradeOrder<br>Line 267-274: gradeColors |
| `results-overview-controller.js` | 総合評価ページ | グレード表示UI<br>セッション評価バッジ表示<br>評価分布グラフ |
| `DYNAMIC_GRADE_LOGIC_SPECIFICATION.md` | 仕様書 | 完全な評価ロジック |
| `EVALUATION_SYSTEM_SPECIFICATION.md` | 仕様書 | 評価基準の科学的根拠 |

---

## ⚠️ 重要な注意事項

### 禁止事項

❌ **プラス記号付きグレードの使用禁止**
- `S+`, `A+`, `B+`, `C+`は存在しません
- EvaluationCalculatorは6段階（S/A/B/C/D/E）のみ返します
- UI実装時にプラス記号を追加しないでください

❌ **独自の色定義禁止**
- 必ず本仕様書の色定義を使用
- 勝手な色変更は一貫性を損ないます

❌ **独自のアイコン使用禁止**
- Lucide v0.263.0の指定アイコンのみ使用
- Safari互換性のため最新版は使用不可

### 推奨事項

✅ **このファイルを唯一の真実の情報源（Single Source of Truth）とする**
- グレード関連の実装時は必ずこのファイルを参照
- 仕様変更時はこのファイルを最初に更新

✅ **実装前の確認**
- 新しいグレード表示UIを作る前にこの表を確認
- 色・アイコン・メッセージの一貫性を保つ

✅ **変更時の手順**
1. 本ファイル（GRADE_REFERENCE_TABLE.md）を更新
2. evaluation-calculator.jsを更新
3. 関連するコントローラーを更新
4. UIを更新

---

## 📊 グレード分布の目安

### 理想的な分布（ランダム基音モード）

| グレード | 想定割合 | ユーザー層 |
|---------|---------|-----------|
| **S** | 5% | 音楽経験豊富・才能あり |
| **A** | 15% | 練習を積んだユーザー |
| **B** | 30% | 一般的なユーザー（目標） |
| **C** | 30% | 初心者〜中級者 |
| **D** | 15% | 初心者 |
| **E** | 5% | 完全初心者 |

**設計意図**: B〜C級が最多となるよう基準を設定

---

## 🔄 更新履歴

### v1.1.0 (2025-11-09)
- セッション評価4ランク（Excellent/Good/Pass/Practice）を追加
- セッション評価のUI表示情報を追加
- 評価基準の詳細（音楽的意味・対象）を追加
- JavaScript実装リファレンス（evaluatePitchError/evaluateAverageError）を追加
- セッション評価の用途を明記

### v1.0.0 (2025-11-09)
- 初版作成
- S/A/B/C/D/E級の6段階に統一
- プラス記号付きグレード（S+, A+等）を削除
- モード別評価基準を明記
- UI表示情報（色・アイコン）を統合
- 実装リファレンスを追加

---

## 📚 関連ドキュメント

- **DYNAMIC_GRADE_LOGIC_SPECIFICATION.md**: 動的グレード計算ロジックの詳細
- **EVALUATION_SYSTEM_SPECIFICATION.md**: 評価システムの科学的根拠
- **evaluation-calculator.js**: 実装コード
- **records-controller.js**: 記録ページ実装
- **results-overview-controller.js**: 総合評価ページ実装
