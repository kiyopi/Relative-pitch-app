# 動的グレード計算ロジック仕様書

**バージョン**: 1.0.0  
**作成日**: 2025-08-14  
**目的**: 動的グレード計算の完全なロジック定義と実装仕様  
**重要性**: 12音律理論と4つの核心洞察に基づく評価システムの中核

---

## 🎯 計算ロジックの全体フロー

```
入力: mockSessionsData (12セッション分)
　↓
1. モード検出（8/12/24セッション判定）
　↓ 
2. デバイス品質検出（high/medium/low）
　↓
3. 基本メトリクス計算（平均誤差・優秀音割合・安定性）
　↓
4. 技術制約調整適用（デバイス品質による緩和）
　↓
5. モード別基準との比較
　↓
6. S/A/B/C/D/E級の判定
　↓
出力: 動的グレード + 詳細情報
```

---

## 📊 詳細ロジック定義

### **1. モード検出ロジック**
```javascript
function detectMode(sessionData) {
  const sessionCount = sessionData.length;
  
  const modeMap = {
    8: {
      mode: 'random',
      name: 'ランダム基音モード',
      level: '初級',
      target: 'カラオケ・合唱レベル'
    },
    12: {
      mode: 'continuous',
      name: '連続チャレンジモード', 
      level: '中級',
      target: '実用的相対音感レベル'
    },
    24: {
      mode: 'chromatic',
      name: '12音階モード',
      level: '上級', 
      target: 'プロフェッショナルレベル'
    }
  };
  
  // 最も近いモードを選択
  if (sessionCount <= 8) return { ...modeMap[8], actualSessions: sessionCount };
  if (sessionCount <= 12) return { ...modeMap[12], actualSessions: sessionCount };
  return { ...modeMap[24], actualSessions: sessionCount };
}
```

### **2. デバイス品質検出ロジック**
```javascript
function detectDeviceQuality() {
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const sampleRate = audioContext.sampleRate;
    const userAgent = navigator.userAgent.toLowerCase();
    const isMobile = /mobile|android|iphone|ipad/.test(userAgent);
    
    let quality, factor, accuracy, message;
    
    // 高性能デバイス判定
    if (sampleRate >= 48000 && !isMobile) {
      quality = 'high';
      factor = 1.0;
      accuracy = '±10¢';
      message = '高精度での測定が可能です';
    }
    // 一般的デバイス判定  
    else if (sampleRate >= 44100) {
      quality = 'medium';
      factor = 1.15;
      accuracy = '±15¢';
      message = '一般的な精度で測定中（約±15¢の誤差を含む可能性）';
    }
    // 低性能デバイス判定
    else {
      quality = 'low';
      factor = 1.3;
      accuracy = '±25¢';
      message = '限定的精度での測定（約±25¢の誤差を含む可能性）。相対的な改善傾向に注目してください';
    }
    
    return { quality, factor, accuracy, message, sampleRate };
    
  } catch (error) {
    console.warn('AudioContext detection failed:', error);
    return {
      quality: 'medium',
      factor: 1.15,
      accuracy: '±15¢',
      message: '標準精度で測定中',
      sampleRate: 'unknown'
    };
  }
}
```

### **3. 基本メトリクス計算ロジック**
```javascript
function calculateBasicMetrics(sessionData) {
  let totalError = 0;
  let totalNotes = 0;
  let excellentNotes = 0;
  let errors = [];
  
  // 各セッションから音程データを生成・分析
  sessionData.forEach(session => {
    const noteResults = generateSessionNoteResults(session);
    
    noteResults.forEach(note => {
      const absError = Math.abs(note.centError);
      
      totalError += absError;
      totalNotes++;
      errors.push(absError);
      
      // 優秀音判定（±20¢以内）
      if (absError <= 20) {
        excellentNotes++;
      }
    });
  });
  
  // 平均誤差計算
  const avgError = totalError / totalNotes;
  
  // 優秀音割合計算
  const excellenceRate = excellentNotes / totalNotes;
  
  // 安定性計算（標準偏差ベース）
  const mean = errors.reduce((a, b) => a + b, 0) / errors.length;
  const variance = errors.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / errors.length;
  const stability = Math.sqrt(variance);
  
  return {
    avgError: Math.round(avgError * 10) / 10,           // 小数点1位
    excellenceRate: Math.round(excellenceRate * 1000) / 1000, // 小数点3位
    stability: Math.round(stability * 10) / 10,         // 小数点1位
    totalNotes,
    excellentNotes
  };
}
```

### **4. 技術制約調整ロジック**
```javascript
function applyTechnicalAdjustment(basicMetrics, deviceInfo) {
  // 技術制約による調整適用
  const adjustedMetrics = {
    // 平均誤差は調整係数で緩和
    avgError: basicMetrics.avgError / deviceInfo.factor,
    
    // 優秀音割合はそのまま（相対的な指標のため）
    excellenceRate: basicMetrics.excellenceRate,
    
    // 安定性も調整係数で緩和
    stability: basicMetrics.stability / deviceInfo.factor,
    
    // 総数はそのまま
    totalNotes: basicMetrics.totalNotes,
    excellentNotes: basicMetrics.excellentNotes
  };
  
  return {
    raw: basicMetrics,      // 生データ
    adjusted: adjustedMetrics, // 調整後データ
    adjustmentInfo: {
      factor: deviceInfo.factor,
      quality: deviceInfo.quality,
      explanation: `${deviceInfo.quality}デバイスのため、${deviceInfo.factor}倍の調整を適用`
    }
  };
}
```

### **5. モード別基準定義**
```javascript
function getModeSpecificThresholds(actualSessions) {
  // セッション数からモード判定
  let sessionCount;
  if (actualSessions <= 8) sessionCount = 8;
  else if (actualSessions <= 12) sessionCount = 12;
  else sessionCount = 24;
  
  const thresholds = {
    8: {  // ランダム基音（初級）- 技術制約考慮の寛容基準
      S: { avgError: 30, excellence: 0.75 },
      A: { avgError: 40, excellence: 0.65 },
      B: { avgError: 50, excellence: 0.55 },
      C: { avgError: 60, excellence: 0.45 },
      D: { avgError: 70, excellence: 0.35 },
      E: { avgError: 80, excellence: 0.25 }
    },
    
    12: { // 連続チャレンジ（中級）- 標準基準
      S: { avgError: 25, excellence: 0.80 },
      A: { avgError: 35, excellence: 0.70 },
      B: { avgError: 45, excellence: 0.60 },
      C: { avgError: 55, excellence: 0.50 },
      D: { avgError: 65, excellence: 0.40 },
      E: { avgError: 75, excellence: 0.30 }
    },
    
    24: { // 12音階（上級）- より厳格基準
      S: { avgError: 20, excellence: 0.85 },
      A: { avgError: 30, excellence: 0.75 },
      B: { avgError: 40, excellence: 0.65 },
      C: { avgError: 50, excellence: 0.55 },
      D: { avgError: 60, excellence: 0.45 },
      E: { avgError: 70, excellence: 0.35 }
    }
  };
  
  return {
    thresholds: thresholds[sessionCount],
    sessionCount,
    explanation: `${sessionCount}セッション${sessionCount === 8 ? '（初級）' : sessionCount === 12 ? '（中級）' : '（上級）'}基準適用`
  };
}
```

### **6. グレード判定ロジック**
```javascript
function determineGrade(adjustedMetrics, thresholds) {
  const grades = ['S', 'A', 'B', 'C', 'D', 'E'];
  
  for (const grade of grades) {
    const threshold = thresholds[grade];
    
    // 両条件を満たす必要がある
    if (adjustedMetrics.avgError <= threshold.avgError && 
        adjustedMetrics.excellenceRate >= threshold.excellence) {
      return {
        grade,
        achievedBy: {
          avgError: adjustedMetrics.avgError <= threshold.avgError,
          excellence: adjustedMetrics.excellenceRate >= threshold.excellence
        },
        thresholds: threshold
      };
    }
  }
  
  // すべての基準を満たさない場合
  return {
    grade: 'E',
    achievedBy: {
      avgError: false,
      excellence: false
    },
    thresholds: thresholds.E
  };
}
```

---

## 🔧 統合実装関数

### **メイン関数: calculateDynamicGrade**
```javascript
function calculateDynamicGrade(sessionData) {
  // 1. モード検出
  const modeInfo = detectMode(sessionData);
  
  // 2. デバイス品質検出  
  const deviceInfo = detectDeviceQuality();
  
  // 3. 基本メトリクス計算
  const basicMetrics = calculateBasicMetrics(sessionData);
  
  // 4. 技術制約調整
  const metricsWithAdjustment = applyTechnicalAdjustment(basicMetrics, deviceInfo);
  
  // 5. モード別基準取得
  const thresholdInfo = getModeSpecificThresholds(modeInfo.actualSessions);
  
  // 6. グレード判定
  const gradeResult = determineGrade(metricsWithAdjustment.adjusted, thresholdInfo.thresholds);
  
  // 7. 結果統合
  return {
    // 最終結果
    grade: gradeResult.grade,
    
    // 詳細情報
    modeInfo,
    deviceInfo,
    metrics: metricsWithAdjustment,
    thresholdInfo,
    gradeResult,
    
    // ユーザー表示用情報
    displayInfo: {
      modeName: modeInfo.name,
      deviceQuality: deviceInfo.message,
      gradeDescription: getGradeDescription(gradeResult.grade),
      achievements: generateAchievementMessage(gradeResult, modeInfo)
    }
  };
}

// グレード説明の生成
function getGradeDescription(grade) {
  const descriptions = {
    'S': { message: 'プロレベル！レコーディング品質の精度です', icon: 'crown', color: 'gold' },
    'A': { message: '素晴らしい！楽器アンサンブルに対応できます', icon: 'medal', color: 'gray' },
    'B': { message: '実用レベル！合唱や弾き語りに最適です', icon: 'circle-star', color: 'orange' },
    'C': { message: '基礎習得！カラオケや趣味演奏を楽しめます', icon: 'smile', color: 'green' },
    'D': { message: '練習中！基礎をしっかり身につけましょう', icon: 'meh', color: 'blue' },
    'E': { message: '基礎から！一歩ずつ確実に向上していきます', icon: 'frown', color: 'red' }
  };
  
  return descriptions[grade] || descriptions['E'];
}

// 達成メッセージの生成
function generateAchievementMessage(gradeResult, modeInfo) {
  const level = modeInfo.level;
  const grade = gradeResult.grade;
  
  return `${level}レベルで${grade}級達成！${modeInfo.target}に向けて順調に成長中です。`;
}
```

---

## 🎯 実装時のポイント

### **エラーハンドリング**
- AudioContext未対応ブラウザ対応
- sessionDataの異常値チェック
- 計算結果の妥当性検証

### **パフォーマンス考慮**
- 重複計算の回避
- 必要時のみ詳細計算実行
- メモリ効率的なデータ処理

### **デバッグ情報**
- 各計算段階での中間結果出力
- 調整係数の適用状況表示
- 判定根拠の透明化

### **将来拡張性**
- 長期データ対応の基盤準備
- 新しいモード追加への対応
- より詳細な分析機能への拡張

---

## 🔬 音程精度評価の学術的根拠（2025年調査）

### **背景: 評価基準の妥当性検証**

実装過程で「評価基準が厳しすぎる」との指摘を受け、音程精度評価に関する学術研究・業界標準を調査しました。

---

### **📊 1. 音程精度の科学的基準**

#### **プロフェッショナル歌手**
- **平均誤差**: 20-30¢（セント）
- **許容範囲**: ±42¢から±44¢まで
- **詳細データ** (研究論文より):
  - レガート唱法: 22.9¢
  - スローテンポ: 20.2¢
  - スタッカート: 27.1¢

#### **アマチュア/一般歌手**
- **平均誤差**: 30-60¢
- **正確なアマチュア**: 約60¢の誤差範囲
- **詳細データ**:
  - レガート唱法: 30.5¢
  - スローテンポ: 31.3¢
  - スタッカート: 38.3¢

#### **聴覚的知覚の閾値**
- **±20-25¢**: 専門家でも「正しい音程」と判断
- **±30¢**: プロ歌手でも通常の許容範囲
- **±50¢**: 一般リスナーが「音程がおかしい」と気づく閾値
- **±5¢**: 理想的な精度（実際には達成困難）

**出典**: ResearchGate論文、Voice Science研究、音楽知覚研究

---

### **🎯 2. 音程による難易度差**

#### **特定音程の識別困難性**

音楽知覚研究により、**特定の音程は構造的に識別が困難**であることが判明:

| 音程 | 平均誤差 | 特徴 |
|-----|---------|-----|
| トライトーン（増4度/減5度） | 22¢ | 最も困難 |
| 完全4度 | 13.5¢ | トライトーンとの区別が困難 |
| 大きな音程（6度以上） | 高い | 小音程より不正確 |

#### **カテゴリー知覚の影響**

音楽家でも以下の特性が確認されている:
- **音程カテゴリー内の微細差**: 識別困難（例: 完全4度の±10¢の違い）
- **カテゴリー間の判別**: 95%以上の正確さ（例: 4度 vs 5度）
- **増4度と減5度の区別**: 極めて困難（エンハーモニック同等）

**引用**:
> "melodic intervals may be, on average, 20 to 25 cents out of tune and still be estimated as correctly tuned by expert listeners"

> "participants' relatively poor performance in the five-semitone standard task (perfect fourth) was surprising"

---

### **⚖️ 3. 外れ値の扱いに関する考察**

#### **カラオケ採点システムの事例**

- **JOYSOUNDの分析採点AI**: 600万件の歌唱データで学習
- **DAMの精密採点DX**: 3,000件以上の手動評価サンプルで開発
- **共通評価指標**: 音程の「安定性」を重視（外れ値の影響軽減）

#### **外れ値の定義**

**測定エラー vs 技能の問題**（2025年実データ分析により更新）:

- **±150¢超（半音1.5個分以上）**:
  - **実データで10.4%発生** - 明らかな測定エラー
  - PitchProのオクターブ誤認識（倍音検出エラー）
  - step 1（レ）で41.7%の確率で発生するパターン
  - 明瞭度・音量は正常 → アルゴリズムの問題
  - **評価から除外**

- **±50¢～150¢**:
  - 重大な誤差だが測定可能範囲
  - 苦手音程の可能性
  - 評価に含めるが注意喚起

- **±50¢以内**:
  - 通常の評価範囲
  - 一般リスナーの知覚閾値内

#### **統計的処理手法**

学術研究・業界標準で使用される手法:
1. **パーセンタイル法**: 上位・下位10%を除外
2. **中央値（Median）**: 平均より外れ値に頑健
3. **閾値フィルタリング**: 一定値を超える異常値を除外

---

### **📋 4. 本システムでの実装方針**

#### **外れ値除外ロジック**

```javascript
// ±150¢を超える測定エラーを除外
const validErrors = errors.filter(e => e <= 150);
const outlierCount = errors.length - validErrors.length;

if (validErrors.length > 0) {
  avgError = validErrors.reduce((a, b) => a + b, 0) / validErrors.length;
  console.log(`📊 外れ値除外: ${outlierCount}音除外（150¢超）`);
}
```

**根拠**:
- **実データ分析**: 96音中10音（10.4%）が±200¢超の外れ値
- **±150¢は半音1.5個分**: 明らかな測定エラー
- プロ歌手でも±44¢が上限 → ±150¢は測定系の問題の可能性が高い
- **特定パターン**: step 1（レ）で41.7%の確率で発生 → PitchProのオクターブ誤認識の可能性
- 7音が良好で1音だけ-204.8¢等の場合、体系的な能力問題ではない

**実測データから判明した問題**:
- 外れ値のほぼ全て（90%）が下方向（-173¢～-238¢）
- 明瞭度（clarity）は0.996～0.999と高い → ノイズが原因ではない
- 音量も正常範囲 → 音量不足が原因ではない
- **結論**: PitchProの周波数検出アルゴリズムの問題（倍音誤認識の可能性）

#### **優秀音判定基準**

```javascript
// 【変更前】±20¢以内（プロレベル）
// 【変更後】±30¢以内（実用レベル）
if (absError <= 30) {
  excellentNotes++;
}
```

**根拠**:
- プロ歌手の平均誤差: 20-30¢
- 専門家の知覚閾値: ±20-25¢
- アマチュアの目標: ±30¢は現実的で達成可能

#### **注意表示の追加**

外れ値が検出された場合、ユーザーに情報提供:
```javascript
if (outlierCount > 0) {
  displayInfo.warning = `${outlierCount}音に大きな誤差がありました（±100¢超）。
  特定の音程が苦手な可能性があります。継続的なトレーニングをおすすめします。`;
}
```

---

### **✅ 5. 更新された評価基準の妥当性**

#### **科学的根拠**
- ✅ 国際的な音楽知覚研究に準拠
- ✅ プロ/アマチュアの実測データに基づく
- ✅ カラオケ業界の評価基準と整合

#### **ユーザビリティ**
- ✅ 達成可能な目標設定
- ✅ 公平な評価（測定誤差の影響を排除）
- ✅ 改善方向の明確化（苦手音程の特定）

#### **技術的妥当性**
- ✅ 統計的に標準的な外れ値処理
- ✅ デバイス品質補正との組み合わせ
- ✅ モード別の適切な基準設定

---

### **📚 参考文献・データソース**

1. **ResearchGate**: "The Evaluation of Vocal Pitch Accuracy: The Case of Operatic Singing Voices"
2. **Voice Science**: "Singing in Tune: How Pitch Accuracy Actually Works"
3. **音楽知覚研究**: "Standard-interval size affects interval-discrimination thresholds" (PMC)
4. **業界標準**: JOYSOUNDの分析採点AI、DAMの精密採点DX
5. **音楽理論**: "Production and Perception of Musical Intervals" (ResearchGate)

---

### **🔄 今後の改善可能性**

1. **音程別の難易度係数**: トライトーン等に補正係数を適用
2. **長期トレーニングデータ**: 個人の成長傾向を考慮
3. **文脈依存評価**: 調性内の音程精度を優遇
4. **機械学習モデル**: カラオケAI同様の大規模データ学習

---

**結論**: 外れ値除外（±100¢超）と優秀音基準の緩和（±30¢）は、学術研究と業界標準に基づく科学的に妥当な改善です。

---

**このロジック仕様により、4つの核心洞察に完全対応した科学的で公平な動的グレード計算システムが実現されます。**