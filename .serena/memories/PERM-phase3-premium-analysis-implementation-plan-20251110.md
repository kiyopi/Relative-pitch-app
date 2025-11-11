# Phase 3: プレミアム分析実装計画

**作成日**: 2025-11-10
**対象**: 連続チャレンジモード・12音階モード（有料版）
**工数**: 6-8時間
**優先順位**: 高（Phase 3の核心機能）

---

## 1. 実装方針の確定

### **無料版分析の扱い**
- ❌ **Phase 3では実装しない**
- ⏸️ **Phase 5まで判断を保留**
- ✅ **プレミアム版完成後に差別化を検討**

### **プレミアム版実装の優先理由**
1. 実装効率: 全機能実装→削減の方が、拡張より簡単
2. 差別化明確化: 完成形を見てから無料版の範囲を決定
3. 収益化戦略: コアユーザー向けに価値の高い機能を先行提供
4. データ活用: 12-24セッションの長期データで分析精度最大化

---

## 2. 実装対象の4タブ構成

### **Tab 1: 音程精度分析（2時間）**

#### **表示内容**
1. 平均音程精度: ±XX¢
2. 音程間隔別精度: 2度〜8度の各精度
3. 上行・下行比較（Phase 4で有効化）

#### **データソース**
- `localStorage`: セッション履歴データ
- 各ステップの`pitchError`（セント誤差）
- 音程間隔情報（2度=2, 3度=3, ...）

#### **計算ロジック**
```javascript
// 平均音程精度
const allErrors = sessions.flatMap(s => s.steps.map(step => step.pitchError));
const averageError = Math.abs(allErrors.reduce((sum, e) => sum + Math.abs(e), 0) / allErrors.length);

// 音程間隔別精度
const intervalErrors = {
  2: [], 3: [], 4: [], 5: [], 6: [], 7: [], 8: []
};
sessions.forEach(session => {
  session.steps.forEach(step => {
    const interval = step.interval; // 2-8
    intervalErrors[interval].push(Math.abs(step.pitchError));
  });
});

const intervalAccuracy = {};
Object.keys(intervalErrors).forEach(interval => {
  intervalAccuracy[interval] = 
    intervalErrors[interval].reduce((sum, e) => sum + e, 0) / intervalErrors[interval].length;
});
```

#### **UI実装**
- Glass Cardコンポーネント使用
- プログレスバー（`.progress-bar` + `.progress-fill-custom`）
- Lucideアイコン: `music`, `bar-chart-3`

---

### **Tab 2: エラーパターン分析（2時間）**

#### **表示内容**
1. シャープ・フラット傾向: X%シャープ傾向
2. 音程拡大・縮小パターン: 各音程の正負傾向

#### **データソース**
- セント誤差の正負（プラス=シャープ、マイナス=フラット）

#### **計算ロジック**
```javascript
// シャープ・フラット傾向
const allErrors = sessions.flatMap(s => s.steps.map(step => step.pitchError));
const sharpCount = allErrors.filter(e => e > 0).length;
const flatCount = allErrors.filter(e => e < 0).length;
const sharpPercentage = (sharpCount / (sharpCount + flatCount)) * 100;

// 音程拡大・縮小パターン
const intervalTendency = {};
Object.keys(intervalErrors).forEach(interval => {
  const errors = intervalErrors[interval];
  const avgError = errors.reduce((sum, e) => sum + e, 0) / errors.length; // 正負込み
  const semitones = avgError / 100; // セントから半音へ変換
  intervalTendency[interval] = {
    semitones: semitones,
    tendency: semitones > 0 ? '拡大' : '縮小'
  };
});
```

#### **UI実装**
- 円グラフ風の表示（CSSベース、Chart.js不使用で軽量化）
- 色分け: シャープ=オレンジ、フラット=青
- 音程別の拡大・縮小をバッジ表示

---

### **Tab 4: 成長記録（2.5時間）**

#### **表示内容**
1. 月間成長比較: 1ヶ月前 vs 現在
2. 音程間隔別成長グラフ: 改善TOP3・停滞TOP3
3. 時系列パフォーマンス分析: 学習効果・疲労パターン
4. 練習最適化アドバイス

#### **データソース**
- localStorage長期履歴（3ヶ月分）
- セッションのタイムスタンプで期間分割

#### **計算ロジック**
```javascript
// 月間成長比較
const oneMonthAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
const oldSessions = sessions.filter(s => s.timestamp < oneMonthAgo);
const recentSessions = sessions.filter(s => s.timestamp >= oneMonthAgo);

const oldAverage = calculateAverageError(oldSessions);
const recentAverage = calculateAverageError(recentSessions);
const improvement = oldAverage - recentAverage;

// 音程間隔別成長
const intervalGrowth = {};
Object.keys(intervalErrors).forEach(interval => {
  const oldErrors = oldSessions.flatMap(s => 
    s.steps.filter(step => step.interval === interval).map(step => Math.abs(step.pitchError))
  );
  const recentErrors = recentSessions.flatMap(s => 
    s.steps.filter(step => step.interval === interval).map(step => Math.abs(step.pitchError))
  );
  
  const oldAvg = oldErrors.reduce((sum, e) => sum + e, 0) / oldErrors.length;
  const recentAvg = recentErrors.reduce((sum, e) => sum + e, 0) / recentErrors.length;
  
  intervalGrowth[interval] = oldAvg - recentAvg; // 正=改善、負=悪化
});

// TOP3抽出
const sortedGrowth = Object.entries(intervalGrowth).sort((a, b) => b[1] - a[1]);
const top3Improved = sortedGrowth.slice(0, 3);
const top3Stagnant = sortedGrowth.slice(-3).reverse();

// 時系列パフォーマンス（セッション前半 vs 後半）
const earlySteps = sessions.flatMap(s => s.steps.slice(0, 4)); // 前半4音
const lateSteps = sessions.flatMap(s => s.steps.slice(4, 8)); // 後半4音
const earlyAvg = calculateAverageError(earlySteps);
const lateAvg = calculateAverageError(lateSteps);
const learningEffect = earlyAvg - lateAvg; // 正=改善、負=疲労

// 疲労パターン（セッション内の精度低下）
const fatiguePattern = sessions.map(session => {
  const firstHalf = session.steps.slice(0, 4);
  const secondHalf = session.steps.slice(4, 8);
  const firstAvg = calculateAverageError(firstHalf);
  const secondAvg = calculateAverageError(secondHalf);
  return secondAvg - firstAvg; // 正=疲労あり
});
const avgFatigue = fatiguePattern.reduce((sum, f) => sum + f, 0) / fatiguePattern.length;
```

#### **UI実装**
- 成長グラフ: Chart.js使用（折れ線グラフ）
- TOP3カード: Glass Card + 順位バッジ
- 時系列分析: テキストベースの洞察表示

---

### **Tab 3: 練習プラン（1.5時間）**

#### **表示内容**
1. 優先度1（緊急）: 最も精度が低い音程の強化
2. 優先度2（重要）: シャープ・フラット傾向の修正
3. 優先度3（推奨）: 成長が停滞している音程

#### **データソース**
- Tab 1の音程別精度
- Tab 2のエラーパターン
- Tab 4の成長記録

#### **計算ロジック（ルールベース）**
```javascript
// 優先度1: 精度が最も低い音程TOP2
const worstIntervals = Object.entries(intervalAccuracy)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 2);

// 優先度2: シャープ傾向が強い（60%以上）
const hasSharpTendency = sharpPercentage > 60;
const hasFlatTendency = sharpPercentage < 40;

// 優先度3: 成長が停滞（改善幅が-5¢未満）
const stagnantIntervals = Object.entries(intervalGrowth)
  .filter(([interval, growth]) => growth < 5)
  .map(([interval]) => interval);

// 練習プラン生成
const practicePlan = {
  priority1: {
    title: `${worstIntervals.map(i => i[0] + '度').join('・')}の大きな音程強化`,
    description: 'ピアノ音源と比較しながら、ゆっくり正確に歌う練習を重点的に行いましょう。',
    exercises: [
      'ピアノで基音を鳴らし、目標音程をゆっくり歌う',
      'メトロノームで4拍かけて音程を移動する練習',
      '半音階で音程感覚を確認'
    ]
  },
  priority2: hasSharpTendency ? {
    title: 'シャープ傾向の修正トレーニング',
    description: '音程を高めに歌う癖があります。意識的に低めを狙う練習をしましょう。',
    exercises: [
      'チューナーアプリで視覚的に確認しながら練習',
      '下行音程（高→低）を重点的に練習',
      '基音を長く聴いてから歌い始める'
    ]
  } : null,
  priority3: stagnantIntervals.length > 0 ? {
    title: `${stagnantIntervals.slice(0, 2).join('度・')}度の改善強化`,
    description: '成長が停滞しています。新しいアプローチで練習しましょう。',
    exercises: [
      '異なる基音で同じ音程を練習',
      '目を閉じて音程イメージを強化',
      '録音して自己分析'
    ]
  } : null
};
```

#### **UI実装**
- アコーディオン形式（優先度別に展開）
- 練習方法はリスト表示
- Lucideアイコン: `target`, `alert-triangle`, `lightbulb`

---

## 3. 技術実装の詳細

### **データ管理**

#### **localStorage構造（既存）**
```javascript
{
  "trainingHistory": [
    {
      "sessionId": 1,
      "timestamp": 1699564800000,
      "mode": "continuous",
      "baseNote": "F#3",
      "steps": [
        {
          "stepNumber": 1,
          "interval": 2,
          "targetNote": "G#3",
          "detectedFrequency": 207.65,
          "pitchError": -3.2,
          "clarity": 0.95,
          "timestamp": 1699564820000
        },
        // ... 8ステップ
      ]
    },
    // ... 複数セッション
  ]
}
```

#### **新規計算結果のキャッシュ**
```javascript
{
  "analysisCache": {
    "lastCalculated": 1699564800000,
    "validUntil": 1699651200000, // 24時間有効
    "averageError": 32.5,
    "intervalAccuracy": { 2: 18.3, 3: 24.1, ... },
    "sharpPercentage": 62,
    "intervalGrowth": { 2: -14, 3: -24, ... }
  }
}
```

### **ファイル構成**

#### **新規作成ファイル**
```
PitchPro-SPA/
├── pages/
│   ├── premium-analysis.html          # メインHTML
│   └── js/
│       ├── premium-analysis-controller.js  # コントローラー
│       └── analysis-calculator.js          # 計算ロジック
└── styles/
    └── premium-analysis.css            # 専用スタイル
```

#### **既存ファイル活用**
- `data-manager.js`: データ取得・保存
- `evaluation-calculator.js`: 一部の計算ロジック拡張
- `base.css`: Glass Card・プログレスバー等

---

## 4. 実装順序（段階的アプローチ）

### **Phase 3-1: Tab 1実装（2時間）**
1. HTML構造作成（30分）
2. 計算ロジック実装（1時間）
3. UI表示・テスト（30分）

### **Phase 3-2: Tab 2実装（2時間）**
1. エラーパターン計算（1時間）
2. UI表示（円グラフ風CSS）（1時間）

### **Phase 3-3: Tab 4実装（2.5時間）**
1. 成長記録計算（1時間）
2. Chart.js統合（1時間）
3. UI表示・テスト（30分）

### **Phase 3-4: Tab 3実装（1.5時間）**
1. ルールベース練習プラン生成（1時間）
2. UI表示（30分）

### **Phase 3-5: 統合・テスト（1時間）**
1. 4タブ間の連携確認
2. ルーター統合
3. 動作テスト

**合計: 8時間**

---

## 5. 下行モード対応の準備

### **Phase 4で有効化する項目**
- Tab 1の「上行・下行比較」セクション
- 方向別のデータ分割計算ロジック

### **現時点での実装方針**
- UI構造は完成させる（非表示状態）
- 計算ロジックは条件分岐で準備
- Phase 4で`if (hasDescendingData) { show(); }`で有効化

---

## 6. 成功基準

### **機能要件**
- ✅ 4タブすべてが動作する
- ✅ 計算結果が正確である
- ✅ UI/UXがデモページと同等以上

### **非機能要件**
- ✅ ページロード3秒以内
- ✅ モバイル対応完璧
- ✅ Chart.jsアニメーション滑らか

### **教育的要件**
- ✅ 相対音感向上に役立つ洞察を提供
- ✅ 具体的な練習方法が明確
- ✅ モチベーション向上につながる

---

## 7. Phase 5への引き継ぎ事項

### **無料版分析の判断材料**
- プレミアム版の完成形
- どの機能が最も価値が高いか
- ユーザーフィードバック（あれば）

### **無料版実装の推奨方針**
- プレミアム版コードから機能削除
- 総合精度＋シンプルメッセージのみ
- 工数: 0.5-1時間

---

**次のアクション**: Phase 3-1（Tab 1実装）の開始
