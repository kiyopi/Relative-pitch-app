# Preparation Step1 完全フロー図

## 🎯 概要
preparation-step1.htmlの完全な処理フローとUI状態遷移を図式化したドキュメント

## 📋 初期状態
```
ページロード時:
├── マイクロフォンの許可セクション (表示)
├── 音声テストセクション (非表示)
└── 音域設定済み表示 (非表示)

ステータス表示:
├── Step1: マイク許可 (pending)
├── Step2: 音声テスト (pending)  
└── Step3: 音域テスト (pending)
```

## 🔄 メインフロー

### Phase 1: ページロード時の判定
```mermaid
flowchart TD
    A[ページロード] --> B{localStorage確認}
    B --> C{micPermissionGranted?}
    B --> D{voiceRangeData?}
    
    C -->|true| E[Step1インジケーター完了]
    C -->|false| F[Step1インジケーター待機]
    
    D -->|あり + マイク許可済み| G[音域設定済み状態]
    D -->|あり + マイク未許可| H[インジケーターのみ更新]
    D -->|なし| I[通常状態]
    
    G --> J[マイク許可セクション非表示]
    G --> K[音声テストセクション表示]
    G --> L[音声テスト中エリア非表示]
    G --> M[音域設定済み表示]
    G --> N[Step2/3完了状態]
```

### Phase 2: マイクボタンクリック処理
```mermaid
flowchart TD
    A[マイクボタンクリック] --> B[ボタン無効化]
    B --> C[PitchPro初期化]
    C --> D[音声検出開始]
    D --> E[UI状態更新]
    E --> F[localStorage保存]
    F --> G[音域設定済み表示強制非表示]
    G --> H[Step1完了]
    H --> I[マイク許可セクション非表示]
    I --> J[音声テストセクション表示]
    J --> K[音声検出処理開始]
```

### Phase 3: 音声認識処理
```mermaid
flowchart TD
    A[音声検出中] --> B{100Hz以上検出?}
    B -->|Yes| C[タイマー開始/継続]
    B -->|No| D[タイマーリセット]
    
    C --> E{1秒間継続?}
    E -->|Yes| F[showSuccess実行]
    E -->|No| G[進捗表示更新]
    
    D --> H[指示テキスト復元]
    G --> B
    H --> B
```

### Phase 4: 音声認識成功時の分岐
```mermaid
flowchart TD
    A[showSuccess実行] --> B[音声検出停止]
    B --> C[PitchPro UI リセット]
    C --> D[Step2完了]
    D --> E{音域データ存在?}
    
    E -->|あり| F[音域設定済みフロー]
    E -->|なし| G[通常フロー]
    
    F --> H[音声テスト中エリア非表示]
    F --> I[音域設定済み表示]
    F --> J[Step3完了]
    F --> K[音域データ詳細表示]
    
    G --> L[成功アラート表示]
    G --> M[音域テスト開始ボタン表示]
```

## 🎮 ボタン機能

### 音域設定済み表示のボタン
```
音域を再測定ボタン:
├── localStorage: step1Completed = true
├── 遷移先: preparation-step2.html
└── 用途: 音域を測定し直す

トレーニング開始ボタン:
├── localStorage: step1Completed = true
├── localStorage: step2Completed = true
├── 遷移先: ../training.html
└── 用途: Step2をスキップして直接トレーニング
```

### 通常フローのボタン
```
音域テストを開始ボタン:
├── localStorage: step1Completed = true
├── 遷移先: preparation-step2.html
└── 用途: Step2へ進む
```

## 🏗️ UI要素の状態管理

### マイクロフォン許可セクション (permission-section)
```
初期状態: 表示
マイク許可後: 非表示
音域データ + マイク許可済み: 非表示
```

### 音声テストセクション (audio-test-section)
```
初期状態: 非表示
マイク許可後: 表示
音域データ + マイク許可済み: 表示
```

### 音声テスト中表示エリア (audio-test-content)
```
初期状態: N/A (親が非表示)
マイク許可後: 表示
音声認識成功後(音域データあり): 非表示
音域データ + マイク許可済み: 非表示
```

### 音域設定済み表示 (range-saved-display)
```
初期状態: 非表示
音声認識成功後(音域データあり): 表示
音域データ + マイク許可済み: 表示
```

## 📊 ステータスインジケーター

### Step1 (マイク許可)
```
初期状態: pending
マイク許可済み: completed
```

### Step2 (音声テスト)
```
初期状態: pending
音声認識成功: completed
音域データ存在: completed
```

### Step3 (音域テスト)
```
初期状態: pending
音域データ存在: completed
```

## 🧠 重要な処理ポイント

### 1. localStorage管理
```javascript
// 保存されるデータ
micPermissionGranted: 'true'
micPermissionTimestamp: ISO文字列
voiceRangeData: JSON文字列 {
  range: { lowest: "A2", highest: "F5" },
  octaveRange: "2.6",
  timestamp: ISO文字列
}
```

### 2. PitchPro統合
```javascript
// 正しい音量取得方法
audioDetector.setCallbacks({
  onPitchUpdate: (result) => {
    const volume = result.volume; // 必須
  }
});

// UIリセット
audioDetector.resetDisplayElements();
```

### 3. 音声検出ロジック
```javascript
// 検出条件
MIN_FREQUENCY = 100; // Hz以上
REQUIRED_DURATION = 1000; // ms継続

// 判定処理
if (result.frequency >= MIN_FREQUENCY && !successTriggered) {
  // 1秒間継続で成功
}
```

## 🎯 設計思想

### 責務分離
- **GlobalAudioManager**: PitchProインスタンス提供のみ
- **preparation-step1.html**: UI制御とイベント処理専門

### 状態管理
- **localStorage**: 永続化データ
- **DOM要素**: UI状態の直接制御
- **PitchPro**: 音声処理状態

### エラー対応
- **音域データ解析エラー**: 通常フローにフォールバック
- **PitchPro初期化失敗**: エラーメッセージ表示
- **音声検出失敗**: 30秒後自動成功

## 📝 今後の拡張ポイント

1. **音域データバリデーション**: 不正データの検証強化
2. **エラーハンドリング**: より詳細なエラー分岐
3. **アニメーション**: UI状態遷移の視覚的フィードバック
4. **アクセシビリティ**: スクリーンリーダー対応

---

作成日: 2025年1月29日
バージョン: v1.0.0
関連ファイル: preparation-step1.html, global-audio-manager.js