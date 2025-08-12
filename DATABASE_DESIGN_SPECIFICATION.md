# 8va相対音感トレーニングアプリ - データベース設計書（localStorage）

**バージョン**: 1.0.0  
**作成日**: 2025-08-12  
**更新日**: 2025-08-12  
**用途**: localStorageデータ構造・管理仕様

---

## 🗄️ 1. データベース概要

### 1.1 選定理由
- **クライアントサイド完結型**: サーバー不要で即座に利用開始可能
- **プライバシー保護**: 個人データがローカルに保存される安心感
- **高速アクセス**: ネットワーク遅延なしでデータ読み書き
- **容量制限**: 5-10MBで十分な設計（音声データは保存しない）

### 1.2 設計原則
- **JSONベース**: 全データをJSON形式で保存
- **キー設計**: 名前空間付きのキー（`pitchpro_`プレフィックス）
- **バージョニング**: データ構造バージョン管理
- **自動バックアップ**: 重要データの定期保存

---

## 📊 2. データ構造定義

### 2.1 ユーザー設定（pitchpro_userSettings）
```json
{
  "version": "1.0.0",
  "userId": "uuid-v4",
  "createdAt": "2025-08-12T10:00:00Z",
  "updatedAt": "2025-08-12T10:00:00Z",
  "settings": {
    "volume": 0.7,
    "guideVolume": 0.8,
    "micSensitivity": 1.0,
    "deviceType": "PC",
    "theme": "light",
    "language": "ja"
  }
}
```

### 2.2 音域テスト結果（pitchpro_voiceRange）
```json
{
  "version": "1.0.0",
  "testDate": "2025-08-12T10:00:00Z",
  "results": {
    "lowestNote": {
      "noteName": "G2",
      "frequency": 98.0,
      "octave": 2,
      "midiNumber": 43
    },
    "highestNote": {
      "noteName": "C5",
      "frequency": 523.25,
      "octave": 5,
      "midiNumber": 72
    },
    "comfortableRange": {
      "low": "C3",
      "high": "G4",
      "octaveSpan": 1.5
    },
    "recommendedRootNotes": {
      "random": ["C3", "D3", "E3", "F3", "G3", "A3", "B3", "C4"],
      "continuous": ["C3", "C#3", "D3", "D#3", "E3", "F3", "F#3", "G3", "G#3", "A3", "A#3", "B3"],
      "chromatic": {
        "ascending": "C3",
        "descending": "C4",
        "both": "G3"
      }
    }
  },
  "isValid": true,
  "expiresAt": "2025-08-19T10:00:00Z"
}
```

### 2.3 セッション履歴（pitchpro_sessionHistory）
```json
{
  "version": "1.0.0",
  "sessions": [
    {
      "sessionId": "uuid-v4",
      "mode": "random",
      "date": "2025-08-12T10:00:00Z",
      "rootNote": "C3",
      "sessionNumber": 1,
      "totalSessions": 8,
      "results": {
        "notes": [
          {
            "targetNote": "C",
            "targetFreq": 130.81,
            "detectedFreq": 131.5,
            "centError": 9.1,
            "evaluation": "Excellent",
            "score": 100,
            "duration": 650
          },
          // ... 他の7音
        ],
        "sessionScore": 85.5,
        "sessionEvaluation": "Good",
        "averageCentError": 18.3,
        "excellenceCount": 4,
        "successRate": 0.875
      },
      "duration": 5300,
      "completed": true
    }
  ],
  "currentCycle": 1,
  "currentSessionInCycle": 1
}
```

### 2.4 総合評価記録（pitchpro_overallEvaluation）
```json
{
  "version": "1.0.0",
  "evaluations": [
    {
      "evaluationId": "uuid-v4",
      "date": "2025-08-12T11:00:00Z",
      "mode": "random",
      "totalSessions": 8,
      "results": {
        "finalScore": 92.3,
        "rank": "A",
        "sessionScores": [85, 90, 88, 92, 95, 93, 91, 94],
        "averageScore": 91.0,
        "excellenceRatio": 0.65,
        "stabilityFactor": 0.95,
        "totalDuration": 42400,
        "noteStatistics": {
          "C": { "attempts": 8, "avgError": 12.5, "successRate": 1.0 },
          "D": { "attempts": 8, "avgError": 18.3, "successRate": 0.875 },
          // ... 他の音階
        },
        "chartData": {
          "errorTrendData": [
            // セッション×音階の96データポイント（12セッション × 8音階）
            { "sessionId": 1, "noteIndex": 0, "centError": 12.5, "noteName": "C" },
            { "sessionId": 1, "noteIndex": 1, "centError": -8.2, "noteName": "D" },
            // ... 残り94データポイント
          ],
          "evaluationDistribution": {
            "excellent": 45,  // Excellentの音階数
            "good": 32,       // Goodの音階数  
            "pass": 15,       // Passの音階数
            "practice": 4     // Practiceの音階数
          }
        }
      },
      "shared": false
    }
  ],
  "bestRank": "S",
  "bestScore": 96.5,
  "totalEvaluations": 15
}
```

### 2.5 トレーニング統計（pitchpro_statistics）
```json
{
  "version": "1.0.0",
  "overall": {
    "totalSessions": 120,
    "totalTrainingTime": 636000,
    "averageAccuracy": 82.5,
    "bestStreak": 12,
    "currentStreak": 3,
    "lastTrainingDate": "2025-08-12T10:00:00Z",
    "firstTrainingDate": "2025-08-01T10:00:00Z"
  },
  "daily": {
    "2025-08-12": {
      "sessions": 8,
      "duration": 42400,
      "averageScore": 85.5,
      "bestScore": 92.0
    }
  },
  "weekly": {
    "2025-W32": {
      "sessions": 35,
      "duration": 185500,
      "averageScore": 83.2,
      "improvement": 5.3
    }
  },
  "monthly": {
    "2025-08": {
      "sessions": 120,
      "duration": 636000,
      "averageScore": 82.5,
      "rankProgression": ["E", "D", "C", "B", "A"]
    }
  }
}
```

### 2.6 マイク許可状態（pitchpro_micPermission）
```json
{
  "version": "1.0.0",
  "status": "granted",
  "grantedAt": "2025-08-12T09:00:00Z",
  "lastCheckedAt": "2025-08-12T10:00:00Z",
  "deviceLabel": "MacBook Pro Microphone",
  "deviceId": "default",
  "expiresAt": "2025-08-12T10:30:00Z"
}
```

### 2.7 アプリメタデータ（pitchpro_metadata）
```json
{
  "version": "1.0.0",
  "appVersion": "1.0.0",
  "lastUpdated": "2025-08-12T10:00:00Z",
  "dataVersion": 1,
  "migrations": [
    {
      "from": null,
      "to": "1.0.0",
      "date": "2025-08-12T09:00:00Z"
    }
  ],
  "healthCheck": {
    "lastCheck": "2025-08-12T10:00:00Z",
    "status": "healthy",
    "errors": []
  }
}
```

---

## 🔄 3. データライフサイクル

### 3.1 データ作成
- **初回起動時**: メタデータ、ユーザー設定の初期化
- **音域テスト完了時**: 音域データの保存
- **セッション完了時**: セッション履歴の追加
- **総合評価完了時**: 評価記録の保存

### 3.2 データ更新
- **設定変更時**: ユーザー設定の即時保存
- **統計計算時**: 日次・週次・月次統計の更新
- **ヘルスチェック時**: メタデータの更新

### 3.3 データ削除
- **手動リセット**: ユーザー操作による全データ削除
- **期限切れデータ**: 30日以上古いセッション詳細の自動削除
- **容量管理**: 5MB超過時の古いデータ自動削除

### 3.4 データバックアップ
```javascript
// 自動バックアップ（8セッション完了ごと）
pitchpro_backup_[timestamp]: {
  sessionHistory: {...},
  overallEvaluation: {...},
  statistics: {...}
}
```

---

## 🛡️ 4. データ整合性

### 4.1 バリデーション
- **スキーマ検証**: 保存前のJSONスキーマ検証
- **範囲チェック**: 周波数、セント誤差の妥当性確認
- **参照整合性**: sessionIdなどの参照整合性チェック

### 4.2 エラーハンドリング
```javascript
try {
  localStorage.setItem(key, JSON.stringify(data));
} catch (e) {
  if (e.name === 'QuotaExceededError') {
    // 古いデータの削除
    cleanupOldData();
    // リトライ
    localStorage.setItem(key, JSON.stringify(data));
  }
}
```

### 4.3 データ修復
- **破損データ検出**: JSON.parseエラーのキャッチ
- **デフォルト値復元**: 必須フィールドの自動補完
- **バックアップからの復元**: 最新バックアップの使用

---

## 📈 5. パフォーマンス最適化

### 5.1 読み込み最適化
- **キャッシュ戦略**: 頻繁アクセスデータのメモリキャッシュ
- **遅延読み込み**: 統計データの必要時のみ読み込み
- **バッチ読み込み**: 複数キーの一括取得

### 5.2 書き込み最適化
- **デバウンス**: 設定変更の遅延保存（500ms）
- **差分更新**: 変更部分のみの更新
- **非同期保存**: UIブロッキングの回避

### 5.3 容量管理
```javascript
// 使用容量の監視
const getStorageSize = () => {
  let total = 0;
  for (let key in localStorage) {
    if (key.startsWith('pitchpro_')) {
      total += localStorage[key].length;
    }
  }
  return total;
};

// 容量警告（4MB超過時）
if (getStorageSize() > 4 * 1024 * 1024) {
  showStorageWarning();
}
```

---

## 🔐 6. セキュリティ考慮事項

### 6.1 データ保護
- **音声データ非保存**: プライバシー保護のため音声は保存しない
- **個人情報最小化**: UUIDのみ使用、実名等は保存しない
- **暗号化検討**: 将来的な機密データの暗号化準備

### 6.2 アクセス制御
- **同一オリジンポリシー**: ブラウザによる自動保護
- **キープレフィックス**: 他アプリとの名前空間分離
- **読み取り専用フラグ**: 重要データの保護

---

## 🔮 7. 将来の拡張

### 7.1 クラウド同期
- **エクスポート機能**: JSON形式でのデータエクスポート
- **インポート機能**: バックアップからの復元
- **同期API準備**: クラウド同期用のデータ構造

### 7.2 IndexedDB移行
- **大容量対応**: 音声録音機能追加時
- **高度なクエリ**: 複雑な検索・集計
- **トランザクション**: ACID特性の保証

### 7.3 プレミアム機能
```json
// プレミアムユーザーデータ
pitchpro_premium: {
  "isPremium": true,
  "subscribedAt": "2025-08-12T10:00:00Z",
  "expiresAt": "2025-09-12T10:00:00Z",
  "features": {
    "unlimitedHistory": true,
    "advancedAnalytics": true,
    "cloudBackup": true,
    "aiCoaching": true
  }
}
```

---

**作成日**: 2025-08-12  
**対象**: localStorage実装仕様  
**重要**: このデータ設計書は実装の基準となる文書です