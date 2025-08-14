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
    'S': 'プロレベル！レコーディング品質の精度です',
    'A': '素晴らしい！楽器アンサンブルに対応できます', 
    'B': '実用レベル！合唱や弾き語りに最適です',
    'C': '基礎習得！カラオケや趣味演奏を楽しめます',
    'D': '練習中！基礎をしっかり身につけましょう',
    'E': '基礎から！一歩ずつ確実に向上していきます'
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

**このロジック仕様により、4つの核心洞察に完全対応した科学的で公平な動的グレード計算システムが実現されます。**