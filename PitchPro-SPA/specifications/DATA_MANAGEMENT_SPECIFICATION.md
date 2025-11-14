# データ管理仕様書 - pitchpro-audio統合版

**バージョン**: 2.1.0
**作成日**: 2025-09-03
**最終更新**: 2025-11-12
**用途**: pitchpro-audio-processing統合によるlocalStorageデータ管理仕様
**課金モデル**: ランダム無料・その他月額課金対応

---

## 🎯 設計方針

### **基盤ライブラリ**
- **音声処理**: pitchpro-audio-processing
- **出力形式**: `{frequency, clarity, note, cents}`
- **精度**: McLeod Pitch Method（5セント精度）
- **信頼度**: 80%以上の検出結果のみ使用

### **課金モデル対応**
- 🆓 **無料**: ランダム基音モード（8セッション）
- 💰 **月額課金**: 連続チャレンジ・12音階・弱点練習モード

### **評価システム統合**
- **4段階評価**: Excellent(±15¢)/Good(±25¢)/Pass(±40¢)/Practice(±40¢+)
- **動的グレード**: S/A/B/C/D/E級（デバイス品質考慮）
- **統計データ**: 長期進捗・弱点分析対応

---

## 📊 統一データスキーマ

### **1. ユーザー設定 (userSettings)**
```json
{
  "version": "2.0.0",
  "userId": "uuid-v4",
  "subscription": {
    "status": "free|premium",
    "planType": "basic|monthly",
    "startDate": "2025-09-03T00:00:00Z",
    "expiresAt": "2025-10-03T00:00:00Z"
  },
  "deviceCalibration": {
    "micSensitivity": 1.0,
    "noiseThreshold": 0.1,
    "deviceQuality": "high|medium|low"
  },
  "preferences": {
    "volume": 0.7,
    "guideVolume": 0.8,
    "theme": "dark|light"
  },
  "createdAt": "2025-09-03T00:00:00Z",
  "updatedAt": "2025-09-03T00:00:00Z"
}
```

### **2. 音域データ (voiceRangeData)**
```json
{
  "version": "2.0.0",
  "testDate": "2025-09-03T00:00:00Z",
  "results": {
    "lowestNote": {
      "frequency": 98.0,
      "note": "G2",
      "clarity": 0.95
    },
    "highestNote": {
      "frequency": 523.25,
      "note": "C5", 
      "clarity": 0.92
    },
    "comfortableRange": {
      "octaveSpan": 2.6,
      "recommendedRoot": "C3"
    }
  },
  "isValid": true,
  "expiresAt": "2025-09-10T00:00:00Z"
}
```

### **3. セッションデータ (sessionData)**
```json
{
  "version": "2.0.0",
  "sessionId": "uuid-v4",
  "mode": "random|continuous|twelve|weakness",
  "sessionNumber": 1,
  "startTime": "2025-09-03T10:00:00Z",
  "endTime": "2025-09-03T10:05:30Z",
  "baseNote": {
    "frequency": 261.63,
    "note": "C4",
    "rangeOffset": 0
  },
  "detectionResults": [
    {
      "targetInterval": "do",
      "targetFrequency": 261.63,
      "detectedData": {
        "frequency": 262.1,
        "clarity": 0.94,
        "note": "C4",
        "cents": 3.1
      },
      "evaluation": {
        "centError": 3.1,
        "grade": "Excellent",
        "score": 100
      },
      "timestamp": "2025-09-03T10:01:15Z"
    }
  ],
  "sessionSummary": {
    "totalScore": 85.5,
    "averageCentError": 18.3,
    "excellentCount": 4,
    "goodCount": 2,
    "passCount": 1,
    "practiceCount": 1,
    "successRate": 0.875,
    "stabilityFactor": 0.92
  },
  "completed": true
}
```

### **4. 総合評価データ (overallEvaluation)**
```json
{
  "version": "2.0.0",
  "evaluationId": "uuid-v4",
  "mode": "random|continuous|twelve|weakness",
  "completedAt": "2025-09-03T11:00:00Z",
  "sessionData": [
    "sessionId1",
    "sessionId2"
  ],
  "finalEvaluation": {
    "dynamicGrade": "A",
    "rawGrade": "B",
    "adjustmentApplied": true,
    "deviceQuality": "medium",
    "finalScore": 92.3,
    "averageScore": 89.1,
    "stabilityFactor": 0.95,
    "excellenceRatio": 0.65
  },
  "statistics": {
    "totalSessions": 8,
    "totalDuration": 42400,
    "noteStatistics": {
      "C": { "attempts": 8, "avgError": 12.5, "successRate": 1.0 },
      "D": { "attempts": 8, "avgError": 18.3, "successRate": 0.875 }
    },
    "progressTrend": "improving|stable|declining"
  }
}
```

### **5. 課金・アクセス制御 (subscriptionData)**
```json
{
  "version": "2.0.0",
  "userId": "uuid-v4",
  "freeAccess": {
    "randomMode": {
      "totalSessions": 156,
      "lastAccess": "2025-09-03T00:00:00Z"
    }
  },
  "premiumAccess": {
    "status": "active|expired|trial",
    "unlockedModes": ["continuous", "twelve", "weakness"],
    "subscriptionStart": "2025-09-03T00:00:00Z",
    "subscriptionEnd": "2025-10-03T00:00:00Z",
    "autoRenew": true
  },
  "usageHistory": {
    "monthlySessionCount": 45,
    "lastBillingDate": "2025-09-01T00:00:00Z"
  }
}
```

---

## 🔧 データ管理API設計

### **DataManager クラス**
```javascript
class DataManager {
  // セッション管理
  static saveSessionResult(sessionData) { ... }
  static getSessionHistory(mode, limit = 10) { ... }
  
  // 評価管理  
  static saveOverallEvaluation(evaluationData) { ... }
  static getLatestEvaluation(mode) { ... }
  
  // 課金・アクセス制御
  static checkModeAccess(mode) { ... }
  static updateSubscriptionStatus(status) { ... }
  
  // 統計・分析
  static generateUserStatistics() { ... }
  static getWeakIntervals() { ... }
  
  // 弱点練習モード（次期バージョン）
  static analyzeWeaknesses() { ... }
  static generateCustomTrainingPlan(weaknessProfile) { ... }
  static updateWeaknessProgress(sessionResult) { ... }
}
```

---

## 📱 実装優先度

### **Phase 1: 基本データ管理**
- [x] 音域データ（既存）
- [ ] セッション結果保存
- [ ] 評価計算統合

### **Phase 2: 課金システム**  
- [ ] アクセス制御
- [ ] サブスクリプション管理
- [ ] 使用制限実装

### **Phase 3: 高度分析**
- [ ] 長期統計
- [ ] 弱点分析
- [ ] 進捗可視化

---

## 🎵 pitchpro-audio統合仕様

### **データフロー**
```
pitchpro-audio検出結果 → セッションデータ蓄積 → 評価計算 → 総合判定
{frequency, clarity, note, cents} → sessionData → overallEvaluation
```

### **品質保証**
- **信頼度閾値**: clarity ≥ 0.8
- **検出精度**: ±5セント以内
- **リアルタイム性**: 60FPS処理対応

---

## 🧠 弱点練習モード対応（次期バージョン）

### **6. 弱点分析データ (weaknessAnalysis)**
```json
{
  "version": "2.0.0",
  "analysisDate": "2025-09-03T00:00:00Z",
  "userId": "uuid-v4",
  "weaknessProfile": {
    "intervals": {
      "re": {
        "averageError": 28.5,
        "successRate": 0.62,
        "attempts": 24,
        "difficulty": "high",
        "improvementTrend": "stable"
      },
      "fa": {
        "averageError": 35.2,
        "successRate": 0.45,
        "attempts": 18,
        "difficulty": "very_high",
        "improvementTrend": "declining"
      }
    },
    "overallWeakness": ["fa", "si", "re"],
    "strengthIntervals": ["do", "so", "mi"]
  },
  "customTrainingPlan": {
    "focusIntervals": ["fa", "si"],
    "sessionStructure": {
      "warmup": ["do", "so"],
      "practice": ["fa", "si", "re"],
      "validation": "random_all"
    },
    "progressThresholds": {
      "improvement": "15%_success_rate_increase",
      "mastery": "80%_success_rate_sustained"
    }
  },
  "generatedAt": "2025-09-03T00:00:00Z",
  "nextUpdateDue": "2025-09-10T00:00:00Z"
}
```

### **7. カスタムセッション設定 (customModeSettings)**
```json
{
  "version": "2.0.0",
  "modeId": "weakness_fa_si_focus",
  "createdAt": "2025-09-03T00:00:00Z",
  "configuration": {
    "targetIntervals": ["fa", "si", "re"],
    "sessionCount": 16,
    "difficultyLevel": "adaptive",
    "baseNoteStrategy": "user_comfortable_range",
    "repetitionLogic": "error_weighted"
  },
  "aiRecommendations": {
    "suggestedDuration": "5-8 minutes",
    "optimalFrequency": "daily",
    "expectedImprovement": "25% in 2 weeks"
  }
}
```

---

## 🔄 データ連携フロー

### **弱点分析生成**
```
セッション履歴 → 音程別エラー分析 → 弱点特定 → カスタムプラン生成
```

### **動的調整**
```
リアルタイム結果 → 進捗評価 → プラン調整 → 次回セッション最適化
```

**この拡張仕様でデータ管理モジュールの実装を進めますか？**

---

## 📝 更新履歴

### v2.1.0 (2025-11-12)

**廃止キー自動クリーンアップ機能追加**

#### 追加機能
- `DEPRECATED_KEYS`配列の追加
  - 廃止されたlocalStorageキーを一元管理
  - 将来のバージョンアップ時のメンテナンス性向上
  
- `cleanupDeprecatedKeys()`メソッドの実装
  - アプリ起動時に自動実行
  - 廃止キーを自動検出・削除
  - 削除ログの出力（キー名・削除数）

- `resetAllData()`の改善
  - `DEPRECATED_KEYS`に登録されたキーも削除
  - 完全なデータクリーンアップを保証

#### 対象キー
- `pitchpro_sessions`: v2.0.0以前で使用（現在は`sessionData`に統一）

#### 実装ファイル
- `/js/data-manager.js`: DataManagerクラス（v2.1.0）
- `/js/router.js`: アプリ起動時の自動クリーンアップ実行

#### 動作フロー
1. アプリ起動時（router.js初期化）
2. `DataManager.cleanupDeprecatedKeys()`を自動実行
3. `DEPRECATED_KEYS`に登録されたキーをチェック
4. 存在すれば削除、ログ出力
5. 全データリセット時も同様に削除

#### メリット
- 🔄 自動メンテナンス：ユーザーが何もしなくても古いキーが削除
- 📋 一元管理：廃止キーを`DEPRECATED_KEYS`配列で管理
- 🚀 将来対応：新しい廃止キーを配列に追加するだけ

---

## 🔧 データ修復機能の廃止 (v2.1.0)

### 背景

#### SessionManager導入前の問題
SessionManager導入前、`startTraining()`にバグがあり、**1つのレッスン内の各セッションに異なるlessonIdが割り当てられる**問題が発生していた。

**具体例**:
```
【正常】1つのレッスン（8セッション）
lessonId: lesson_1234567890_random_chromatic_ascending
├── Session 1 (ド)
├── Session 2 (ド#)
├── ...
└── Session 8 (シ)

【バグ発生時】1つのレッスンなのに8つのlessonId
├── Session 1 (ド) → lesson_1234567890_...
├── Session 2 (ド#) → lesson_1234567891_...
├── ...
└── Session 8 (シ) → lesson_1234567897_...
```

この問題を修復するため、`repairIncorrectLessonIds()`関数が`records-controller.js`に実装されていた。

#### 修復関数のロジック（lines 387-486）
```javascript
// Line 426の判定条件
const needsRepair = currentGroup.length === expectedSessions
                 && uniqueLessonIds.size === expectedSessions;

// 例: 8セッションあって、8つの異なるlessonIdがある場合
// → "1つのレッスンのはずが8つに分裂している"と判断
// → 最初のlessonIdに統合して修復
```

### 発見された致命的な問題

#### 正常データの誤統合
修復関数は以下の2つのケースを区別できない:

**ケース1（バグ）**: 修復が必要
```
- 8セッション（1つのレッスン）
- 8つの異なるlessonId
→ 修復して1つに統合 ✅
```

**ケース2（正常）**: 修復不要
```
- 8セッション（8つの独立したレッスン）
- 8つの異なるlessonId
→ 修復して1つに統合 ❌ データ損失！
```

#### 実際に発生した問題（2025-11-14）
- ユーザーがPhase 1時点で**10件以上の独立したレッスン**を持っていた
- Phase 2でLucideアイコン統合作業後、トレーニング記録ページを開いた
- 修復関数が実行され、10件以上のレッスンが**4件に統合**された
- Line 457で`SessionDataManager.saveAllSessions(sessions)`により**localStorage上書き**
- **元のデータは永久に失われた**（バックアップなし）

### 廃止の理由

#### 理由1: SessionManager導入後はバグが発生しない
`trainingController.js` Lines 252-260:
```javascript
} else if (!currentLessonId) {
    // 初回のみ生成
    const timestamp = Date.now();
    const chromaticDir = directionParam || 'random';
    currentLessonId = `lesson_${timestamp}_${currentMode}_${chromaticDir}_${currentScaleDirection}`;
    console.log(`✅ レッスンID生成（初回）: ${currentLessonId}`);

    // sessionStorageに保存（個別結果画面から戻る際の保持用）
    sessionStorage.setItem('currentLessonId', currentLessonId);
}
```

**重要**: `if (!currentLessonId)`により、lessonIdは**1回だけ生成**される。

**リセットタイミング**:
- Line 1021: レッスン完了時 `currentLessonId = null;`
- Line 1681: トレーニング中断時 `currentLessonId = null;`

SessionManager導入後、元のバグは**構造的に発生不可能**になった。

#### 理由2: 正常データの誤統合リスク
上記の通り、独立した複数レッスンを1つに統合してしまう致命的な問題がある。

#### 理由3: 将来の仕様変更への対応困難
今後、以下のような仕様変更があった場合、修復関数が誤動作する:
- モードのセッション数変更（例: 8 → 10）
- 新しいモード追加
- lessonIdフォーマット変更

ユーザーからのフィードバック:
> "それよりも今後仕様が変更になった場合過去のデータ構造を修復だと判断したりしないかの方が心配"

### 実装詳細 (records-controller.js v2.1.0)

#### 修正内容
**Lines 395-403**: 修復処理を完全に無効化
```javascript
window.repairIncorrectLessonIds = function repairIncorrectLessonIds(sessions) {
    console.log('ℹ️ [Repair] lessonId修復機能は無効化されています（SessionManager導入済み）');
    console.log('   理由: 正常なデータを誤って統合するリスクを回避');

    // 修復せずにそのまま返す
    return sessions;

    /* ===== 以下、無効化されたコード（参照用に保持） =====
    ... (元のコード404-487行目にコメントアウトで保持)
    */
};
```

**Line 43**: バージョンログ更新
```javascript
console.log('📊 [Records] トレーニング記録ページ初期化開始 v2.1.0 (2025-11-14)');
```

**Lines 1-10**: バージョン情報とチェンジログ更新
```javascript
/**
 * @version 2.1.0
 * @date 2025-11-14
 * @changelog
 *   v2.1.0 (2025-11-14) - repairIncorrectLessonIds()修復機能を無効化
 *                         理由: SessionManager導入後はバグ発生せず、正常データを誤統合するリスクを回避
 */
```

#### 修正結果
- 修復関数実行時: `ℹ️ [Repair] lessonId修復機能は無効化されています`とログ出力
- セッションデータは**そのまま返却**（修復しない）
- 元のコードは**コメントで保持**（参照・将来の検証用）

#### 関連ファイル
**`records.html` Line 124**: キャッシュバスティング
```html
<script src="pages/js/records-controller.js?v=20251114004" onload="initRecordsPage()"></script>
```

### データ保護の保証

#### エラーハンドリング体制
不完全なセッションデータが存在しても、アプリは正常動作する:

**`records-controller.js`**:
- Lines 42-66: 全体をtry-catchでラップ
- Lines 606-613: 評価エラー時のフォールバック

**`results-overview-controller.js`**:
- Lines 250-272: データロード時のエラーハンドリング
- Lines 45-49: データなし時のフォールバック

**`evaluation-calculator.js`**:
- Lines 160-163: pitchErrors検証（空配列でもエラーなし）

ユーザーからの質問に対する回答:
> "トレーニング中にホームにもどった場合やリロードはそのレッスンデータは放棄するようにしているがその他の予期せぬアクションで放棄できなかった場合 データが欠損して読み込みエラーで全てが動かなくなるなどの重大なエラーに発展する可能性はありますか？"

**回答**: データ欠損があっても、完全なエラーハンドリングにより**アプリがクラッシュすることはない**。

### 今後の方針

#### 修復機能を再導入しない
- SessionManagerが正しく動作している限り、修復機能は**永久に不要**
- 元のコードはコメントで保持されており、参照可能
- 将来的に類似機能が必要になった場合は、より安全な設計で再実装

#### データ整合性の維持
- lessonId生成ロジック（trainingController.js）の厳格な管理
- SessionManagerの単一責任原則の維持
- 定期的なデータ構造の検証（開発時）

#### 教訓
1. **データ修復は最終手段**: 自動修復は予期せぬデータ損失を引き起こす
2. **根本原因の解決を優先**: バグの修復ではなく、バグの発生防止
3. **ユーザーデータは神聖**: 自動的な上書きは極力避ける

---

