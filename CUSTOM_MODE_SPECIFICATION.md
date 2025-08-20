# カスタム弱点克服モード仕様書

**バージョン**: 1.0.0  
**作成日**: 2025-08-21  
**目的**: 個別音程の集中練習による弱点克服システム  
**リリース**: 次期バージョンメイン機能

---

## 🎯 モードコンセプト

### **基本理念**
既存の詳細分析で特定された弱点音程を集中的に練習し、効率的な相対音感向上を実現する。

### **ターゲットユーザー**
- 詳細分析で弱点を認識したユーザー
- 特定音程の上達を望む中級〜上級者
- 効率的な練習を求めるユーザー

---

## 🎵 技術仕様

### **対応音程（10種類）**
```javascript
const intervalTypes = {
  'minor2nd': { name: '短2度', semitones: 1, difficulty: 5 },
  'major2nd': { name: '長2度', semitones: 2, difficulty: 3 },
  'minor3rd': { name: '短3度', semitones: 3, difficulty: 3 },
  'major3rd': { name: '長3度', semitones: 4, difficulty: 2 },
  'perfect4th': { name: '完全4度', semitones: 5, difficulty: 2 },
  'tritone': { name: '増4度', semitones: 6, difficulty: 5 },
  'perfect5th': { name: '完全5度', semitones: 7, difficulty: 1 },
  'minor6th': { name: '短6度', semitones: 8, difficulty: 4 },
  'major6th': { name: '長6度', semitones: 9, difficulty: 3 },
  'minor7th': { name: '短7度', semitones: 10, difficulty: 4 }
};
```

### **セッション設定**
```javascript
const sessionConfig = {
  baseNoteCount: [8, 12], // 基音数選択
  baseNoteGeneration: 'random', // ランダム生成
  targetInterval: 'single', // 単一音程集中
  evaluationMethod: 'standard' // 既存評価システム準拠
};
```

### **練習フロー**
```
1. 基音再生（ランダム選択）
2. ユーザー：基音からドレミファソラシド歌唱
3. 目標音程の基音再生（例：完全4度上）
4. ユーザー：新基音からドレミファソラシド歌唱
5. 既存システムによる音程精度評価
6. 次の基音へ（設定回数分繰り返し）
```

---

## 🎨 UI/UX仕様

### **モード選択画面の追加**
```html
<!-- mode-selection.html -->
<div class="mode-grid">
  <!-- 既存3モード -->
  <div class="mode-card">...</div>
  
  <!-- 新規：カスタムモード -->
  <div class="mode-card mode-premium">
    <div class="mode-header">
      <i data-lucide="target" class="mode-icon"></i>
      <h3>カスタムモード</h3>
      <div class="coming-soon-badge">近日公開</div>
    </div>
    <p class="mode-description">苦手な音程を集中克服</p>
    <ul class="mode-features">
      <li>10種類の音程から選択</li>
      <li>弱点に特化した練習</li>
      <li>効率的な上達を実現</li>
    </ul>
    <div class="mode-status">
      <span class="premium-badge">プレミアム</span>
      <span class="release-info">次期バージョンで公開予定</span>
    </div>
  </div>
</div>
```

### **カスタム設定画面**
```
┌─────────────────────────────┐
│     🎯 カスタム練習設定     │
├─────────────────────────────┤
│ 練習する音程を選択：        │
│ ○ 短2度  ○ 長2度  ○ 短3度 │
│ ○ 長3度  ○ 完全4度 ○ 増4度 │
│ ○ 完全5度 ○ 短6度 ○ 長6度  │
│ ○ 短7度                    │
│                             │
│ 基音数：○ 8回  ○ 12回      │
│                             │
│ 推奨設定：                  │
│ └ 詳細分析から自動提案      │
│                             │
│ ［ 練習開始 ］              │
└─────────────────────────────┘
```

### **結果表示の拡張**
```javascript
// 既存システム + カスタムモード専用情報
const customResults = {
  targetInterval: '完全4度',
  totalSessions: 8,
  averageError: 12.3, // セント
  improvement: '+5.2¢', // 前回比
  weakestNote: 'D→G',
  strongestNote: 'C→F',
  recommendation: '継続練習推奨。特にD→G区間を重点的に'
};
```

---

## ⚙️ 技術実装詳細

### **音程計算システム**
```javascript
class IntervalTraining {
  constructor(interval, baseNotes) {
    this.targetInterval = interval;
    this.baseNotes = baseNotes;
    this.currentSession = 0;
  }
  
  generateNextBase() {
    // ランダム基音生成
    const baseNote = this.getRandomNote();
    const targetNote = this.calculateTargetNote(baseNote, this.targetInterval);
    
    return {
      baseFreq: this.noteToFreq(baseNote),
      targetFreq: this.noteToFreq(targetNote),
      interval: this.targetInterval
    };
  }
  
  evaluatePerformance(userSinging) {
    // 既存評価システムを活用
    return StandardEvaluator.evaluate(userSinging);
  }
}
```

### **データ構造**
```javascript
// セッションデータ
const customSessionData = {
  mode: 'custom',
  targetInterval: 'perfect4th',
  baseNoteCount: 8,
  sessions: [
    {
      baseNote: 'C',
      targetNote: 'F', 
      userPerformance: [...], // 既存形式
      evaluation: {...} // 既存形式
    }
    // ... 8または12セッション分
  ],
  overallStats: {
    averageError: 15.2,
    excellenceRate: 0.65,
    improvement: '+3.1¢'
  }
};
```

---

## 🔗 既存システムとの統合

### **詳細分析との連携**
```javascript
// 詳細分析結果からカスタム設定を提案
function suggestCustomSettings(analysisResults) {
  const weakestIntervals = analysisResults.intervalAnalysis
    .filter(interval => interval.averageError > 25)
    .sort((a, b) => b.averageError - a.averageError)
    .slice(0, 3);
    
  return {
    recommendedInterval: weakestIntervals[0].type,
    sessionCount: 12, // 弱点克服には多めの練習
    reason: `${weakestIntervals[0].type}の精度向上に集中することで、全体的な相対音感の向上が期待できます`
  };
}
```

### **進捗トラッキング**
```javascript
const progressTracking = {
  intervalProgress: {
    'perfect4th': {
      sessions: 3,
      initialError: 23.1,
      currentError: 15.8,
      improvement: 7.3,
      trend: 'improving'
    }
  },
  overallImpact: {
    totalSessions: 36,
    intervalsImproved: 4,
    averageImprovement: 8.2
  }
};
```

---

## 📊 評価システム

### **カスタムモード専用メトリクス**
1. **音程特化精度**: 選択音程での平均誤差
2. **改善度**: 前回セッションとの比較
3. **一貫性**: 同一音程内でのばらつき
4. **習熟度**: 選択音程のマスターレベル

### **グレード判定の調整**
```javascript
// カスタムモードは単一音程に特化しているため、
// より厳密な基準を適用
const customGradeThresholds = {
  'S': { avgError: 8, excellence: 0.90 },
  'A': { avgError: 12, excellence: 0.80 },
  'B': { avgError: 18, excellence: 0.70 },
  'C': { avgError: 25, excellence: 0.60 },
  'D': { avgError: 35, excellence: 0.50 },
  'E': { avgError: 50, excellence: 0.40 }
};
```

---

## 🎯 マーケティング・課金戦略

### **差別化ポイント**
1. **他アプリにない独自機能**
2. **科学的な弱点克服アプローチ**
3. **既存分析機能との完璧な連携**

### **課金価値の訴求**
```
「詳細分析で弱点発見」→「カスタムモードで集中克服」
完璧な課金動線
```

### **リリース告知文案**
```
🎯 次期アップデート予告
「カスタム弱点克服モード」登場！

あなたの苦手な音程を集中的に練習。
10種類の音程から選んで、弱点を徹底克服。
詳細分析の結果から最適な練習を自動提案。

効率的な上達への新しいステップを、
プレミアムプランでお楽しみください。

［詳しく見る］
```

---

## 🔄 将来拡張計画

### **Phase 2拡張機能**
1. **複数音程同時練習**: 2-3個の音程を組み合わせ
2. **AI推奨練習**: 機械学習による最適練習提案
3. **進捗予測**: 「あと○回で習得予定」

### **Phase 3高度機能**
1. **協調練習**: 複数人での同時練習
2. **楽曲連携**: 実際の楽曲での音程練習
3. **コンペティション**: 音程別ランキング

---

## ⚠️ 開発上の注意点

### **技術的制約**
1. **既存評価システムの活用**: 新規開発コストを最小化
2. **音程計算の正確性**: セント単位での精密計算が必要
3. **パフォーマンス**: リアルタイム処理の最適化

### **UX設計の重要点**
1. **設定の簡潔性**: 複雑すぎない選択肢
2. **進捗の可視化**: 改善を実感できる表示
3. **モチベーション維持**: 継続したくなる仕組み

### **QA重要項目**
1. **全音程での正確な評価**
2. **デバイス間での一貫性**
3. **長時間使用での安定性**

---

**このカスタム弱点克服モードにより、相対音感トレーニングアプリは業界初の「科学的弱点克服システム」を備えた革新的アプリとして差別化されます。**