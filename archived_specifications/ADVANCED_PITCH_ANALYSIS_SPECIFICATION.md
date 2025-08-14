# 高度音程分析機能仕様書

**バージョン**: 1.0.0  
**作成日**: 2025-08-14  
**用途**: 総合評価ページの音程精度分析機能詳細仕様  
**関連文書**: EVALUATION_SYSTEM_SPECIFICATION.md, UI_COMPONENTS_SPECIFICATION.md

---

## 🎯 概要

従来の点数ベース評価から音程精度ベース評価への全面移行に伴い、ユーザーの音感向上に直結する高度な分析機能を総合評価ページに追加します。

### 開発背景
- **問題**: 「95-100点 & Excellence80%以上」等の点数表記が分かりにくい
- **方針**: 周波数誤差の視覚化が相対音感の精度向上につながる
- **目標**: 具体的で実用的な音程精度情報の提供

---

## 📊 新規追加データ

### 1. 音程安定性指標

#### A. 標準偏差（音程のブレ具合）
```javascript
function calculateStandardDeviation(centErrors) {
    const mean = centErrors.reduce((sum, error) => sum + error, 0) / centErrors.length;
    const variance = centErrors.reduce((sum, error) => sum + Math.pow(error - mean, 2), 0) / centErrors.length;
    return Math.sqrt(variance);
}

// 表示例: "標準偏差 ±8.5セント（安定）"
```

#### B. 一貫性スコア（セッション間の精度バラツキ）
```javascript
function calculateConsistencyScore(sessionAverages) {
    const sessionStdDev = calculateStandardDeviation(sessionAverages);
    if (sessionStdDev <= 5) return "非常に安定";
    if (sessionStdDev <= 10) return "安定";
    if (sessionStdDev <= 15) return "やや不安定";
    return "要改善";
}
```

### 2. 音程傾向分析

#### A. シャープ/フラット傾向
```javascript
function analyzePitchTrend(centErrors) {
    const average = centErrors.reduce((sum, error) => sum + error, 0) / centErrors.length;
    const tendency = {
        direction: average > 2 ? "シャープ傾向" : average < -2 ? "フラット傾向" : "バランス良好",
        value: average,
        description: getTrendDescription(average)
    };
    return tendency;
}

function getTrendDescription(avg) {
    if (Math.abs(avg) <= 2) return "音程が中心に安定しています";
    if (avg > 0) return "全体的に高く歌う傾向があります";
    return "全体的に低く歌う傾向があります";
}
```

### 3. 上達度指標

#### A. 精度改善率
```javascript
function calculateImprovementRate(sessions) {
    const earlySessionsAvg = sessions.slice(0, 3).reduce((sum, s) => sum + Math.abs(s.averageError), 0) / 3;
    const lateSessionsAvg = sessions.slice(-3).reduce((sum, s) => sum + Math.abs(s.averageError), 0) / 3;
    const improvementRate = ((earlySessionsAvg - lateSessionsAvg) / earlySessionsAvg) * 100;
    return {
        rate: improvementRate,
        message: getImprovementMessage(improvementRate)
    };
}
```

### 4. 音階別得意・苦手分析

#### A. 音階別精度計算
```javascript
function analyzeNoteAccuracy(allSessions) {
    const noteNames = ['ド', 'レ', 'ミ', 'ファ', 'ソ', 'ラ', 'シ', 'ド\''];
    const noteAnalysis = noteNames.map((name, index) => {
        const noteErrors = allSessions.flatMap(session => 
            session.noteResults.filter(note => note.noteIndex === index)
                               .map(note => Math.abs(note.centError))
        );
        const average = noteErrors.reduce((sum, error) => sum + error, 0) / noteErrors.length;
        return { note: name, averageError: average, count: noteErrors.length };
    });
    
    const bestNote = noteAnalysis.reduce((best, current) => 
        current.averageError < best.averageError ? current : best
    );
    
    const worstNote = noteAnalysis.reduce((worst, current) => 
        current.averageError > worst.averageError ? current : worst
    );
    
    return { noteAnalysis, bestNote, worstNote };
}
```

### 5. 実用性レベル判定

#### A. 用途別適性判定
```javascript
function assessPracticalLevel(averageError, excellenceRatio, stability) {
    const levels = {
        recording: averageError <= 8 && excellenceRatio >= 0.85 && stability <= 5,
        ensemble: averageError <= 12 && excellenceRatio >= 0.70 && stability <= 8,
        choir: averageError <= 18 && excellenceRatio >= 0.50 && stability <= 12,
        karaoke: averageError <= 25 && excellenceRatio >= 0.30
    };
    
    if (levels.recording) return { level: "レコーディング", icon: "crown", color: "gold" };
    if (levels.ensemble) return { level: "楽器アンサンブル", icon: "trophy", color: "green" };
    if (levels.choir) return { level: "合唱・弾き語り", icon: "star", color: "blue" };
    if (levels.karaoke) return { level: "カラオケ・趣味", icon: "check-circle", color: "orange" };
    return { level: "基礎練習", icon: "book-open", color: "gray" };
}
```

---

## 🎯 新S-Eランク判定ロジック

### 判定基準（音程精度ベース）

| ランク | 平均誤差 | 高精度割合 | 安定性 | 実用性レベル | アイコン |
|--------|----------|-----------|--------|-------------|----------|
| **S級** | ±8セント以内 | 85%以上 | ±5セント以内 | レコーディング品質 | `crown` |
| **A級** | ±12セント以内 | 70%以上 | ±8セント以内 | 楽器アンサンブル対応 | `trophy` |
| **B級** | ±18セント以内 | 50%以上 | ±12セント以内 | 合唱・弾き語り対応 | `star` |
| **C級** | ±25セント以内 | 30%以上 | - | カラオケ・趣味レベル | `check-circle` |
| **D級** | ±35セント以内 | - | - | 基礎練習中 | `target` |
| **E級** | ±35セント超 | - | - | 基礎から学習 | `book-open` |

### 実装コード

```javascript
function calculateNewGrade(sessionData) {
    const { averageError, excellenceRatio, standardDeviation } = analyzeAllSessions(sessionData);
    const absAvgError = Math.abs(averageError);
    
    // S級判定
    if (absAvgError <= 8 && excellenceRatio >= 0.85 && standardDeviation <= 5) {
        return {
            grade: 'S',
            message: 'プロレベル！レコーディング品質の精度です',
            practical: 'レコーディング・プロ演奏対応'
        };
    }
    
    // A級判定
    if (absAvgError <= 12 && excellenceRatio >= 0.70 && standardDeviation <= 8) {
        return {
            grade: 'A',
            message: '素晴らしい！楽器アンサンブルに対応できます',
            practical: '楽器アンサンブル・バンド対応'
        };
    }
    
    // B級判定
    if (absAvgError <= 18 && excellenceRatio >= 0.50 && standardDeviation <= 12) {
        return {
            grade: 'B',
            message: '実用レベル！合唱や弾き語りに最適です',
            practical: '合唱・弾き語り・アカペラ対応'
        };
    }
    
    // C級判定
    if (absAvgError <= 25 && excellenceRatio >= 0.30) {
        return {
            grade: 'C',
            message: '基礎習得！カラオケや趣味演奏を楽しめます',
            practical: 'カラオケ・趣味演奏レベル'
        };
    }
    
    // D級判定
    if (absAvgError <= 35) {
        return {
            grade: 'D',
            message: '練習中！基礎をしっかり身につけましょう',
            practical: '基礎練習継続中'
        };
    }
    
    // E級判定
    return {
        grade: 'E',
        message: '基礎から！一歩ずつ確実に向上していきます',
        practical: '基礎学習段階'
    };
}
```

---

## 🏗️ UIレイアウト設計

### 1. 音程分析セクション（新規追加）

#### 配置位置
パフォーマンスチャートの下、セッション詳細グリッドの上

#### PC/タブレット版（768px以上）
```html
<div class="glass-card mb-8">
    <h3 class="text-xl font-bold text-white mb-6">音程分析</h3>
    <div class="grid grid-cols-2 gap-6">
        <!-- 左列：精度指標 -->
        <div>
            <div class="analysis-item">
                <div class="analysis-label">音程安定性</div>
                <div class="analysis-value">±8.5¢ 安定</div>
            </div>
            <div class="analysis-item">
                <div class="analysis-label">音程傾向</div>
                <div class="analysis-value">+2.1¢ 軽度シャープ</div>
            </div>
        </div>
        
        <!-- 右列：上達・実用性 -->
        <div>
            <div class="analysis-item">
                <div class="analysis-label">上達度</div>
                <div class="analysis-value">15%改善 向上中</div>
            </div>
            <div class="analysis-item">
                <div class="analysis-label">実用性</div>
                <div class="analysis-value">楽器アンサンブル対応</div>
            </div>
        </div>
    </div>
</div>
```

#### モバイル版（767px以下）
```html
<div class="glass-card mb-8">
    <h3 class="text-xl font-bold text-white mb-4">音程分析</h3>
    <div class="space-y-3">
        <div class="analysis-item-mobile">
            <span class="analysis-label-mobile">安定性</span>
            <span class="analysis-value-mobile">±8.5¢ 安定</span>
        </div>
        <!-- 他の項目も同様 -->
    </div>
</div>
```

### 2. 音階別詳細分析セクション

#### PC版：レーダーチャート
```html
<div class="glass-card mb-8">
    <h3 class="text-xl font-bold text-white mb-6">音階別精度</h3>
    <div class="grid grid-cols-2 gap-6">
        <div>
            <canvas id="note-accuracy-radar" width="300" height="300"></canvas>
        </div>
        <div>
            <div class="note-analysis-summary">
                <div class="best-note">得意音程：ド（±6.2¢）</div>
                <div class="worst-note">要練習：ファ（±18.7¢）</div>
                <div class="recommendation">ファの音程を意識して練習しましょう</div>
            </div>
        </div>
    </div>
</div>
```

#### モバイル版：シンプルリスト + 折りたたみ
```html
<div class="glass-card mb-8">
    <h3 class="text-xl font-bold text-white mb-4">音階別精度</h3>
    <div class="note-summary-mobile">
        <div class="best-worst-notes">
            <div class="best-note-mobile">得意：ド（±6.2¢）</div>
            <div class="worst-note-mobile">要練習：ファ（±18.7¢）</div>
        </div>
        <button class="toggle-details">詳細を見る</button>
        <div class="note-details-mobile" style="display: none;">
            <!-- 全音階の詳細リスト -->
        </div>
    </div>
</div>
```

---

## 🎨 CSSスタイリング

### 音程分析用クラス

```css
.analysis-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 8px;
    margin-bottom: 8px;
}

.analysis-label {
    color: rgba(255, 255, 255, 0.7);
    font-size: 0.875rem;
    font-weight: 500;
}

.analysis-value {
    color: white;
    font-size: 1rem;
    font-weight: 600;
}

/* モバイル版 */
.analysis-item-mobile {
    display: flex;
    justify-content: space-between;
    padding: 8px 12px;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 6px;
}

.analysis-label-mobile {
    color: rgba(255, 255, 255, 0.7);
    font-size: 0.8rem;
}

.analysis-value-mobile {
    color: white;
    font-size: 0.9rem;
    font-weight: 600;
}

/* 実用性レベル別カラー */
.practical-recording { color: #fcd34d; }
.practical-ensemble { color: #86efac; }
.practical-choir { color: #7dd3fc; }
.practical-karaoke { color: #fb923c; }
.practical-basic { color: #d1d5db; }
```

---

## 📱 レスポンシブ対応

### ブレークポイント
- **モバイル**: 〜767px
- **タブレット**: 768px〜1023px  
- **PC**: 1024px〜

### 表示優先度

#### モバイル（必須表示）
1. 音程安定性
2. 実用性レベル
3. 得意・苦手音程

#### タブレット/PC（全表示）
1. 上記 + 音程傾向
2. 上記 + 上達度
3. 上記 + レーダーチャート

---

## 🔄 実装順序

### Phase 1: 計算ロジック実装
1. 標準偏差計算関数
2. 音程傾向分析関数
3. 上達度計算関数
4. 音階別分析関数

### Phase 2: 新ランク判定システム
1. 新判定ロジック実装
2. ランク説明の更新
3. 実用性レベル判定

### Phase 3: UI実装
1. 音程分析セクション追加
2. レスポンシブ対応
3. アニメーション実装

### Phase 4: 統合・最適化
1. 既存システムとの統合
2. パフォーマンス最適化
3. 仕様書更新

---

## 📋 関連ファイル更新

### 必須更新ファイル
- `results.html`: UI実装
- `EVALUATION_SYSTEM_SPECIFICATION.md`: 判定基準更新
- `UI_COMPONENTS_SPECIFICATION.md`: 新コンポーネント追加

### 参考ファイル
- `TECHNICAL_SPECIFICATIONS.md`: データ構造定義
- `REQUIREMENTS_SPECIFICATION.md`: 要件の更新

---

**この高度音程分析機能により、ユーザーは自分の音感レベルを具体的かつ実用的に把握し、効率的な練習計画を立てることができるようになります。**