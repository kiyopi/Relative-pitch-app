# 音域テストフロー図

**ファイル**: preparation-test.html  
**作成日**: 2025年1月9日  
**目的**: 音域テスト完全フロー可視化図

---

## 🎯 全体フロー概要

```mermaid
flowchart TD
    A[ページ読み込み] --> B[UIカタログ・base.css読み込み]
    B --> C[PreparationTestUI初期化]
    C --> D[ステップ1: デバイス検出完了]
    
    D --> E[ステップ2: マイクテスト開始]
    E --> F{マイクテスト結果}
    F -->|成功| G[ステップ3: 音域テスト移行]
    F -->|失敗| H[エラーメッセージ表示]
    
    G --> I[AudioDetectionComponent再初期化]
    I --> J[VoiceRangeTesterV113初期化]
    J --> K[音域テスト実行フロー]
    
    K --> L[低音テストフェーズ]
    L --> M[高音テストフェーズ]
    M --> N[結果保存・表示]
    N --> O[ステップ4: トレーニング準備完了]
```

---

## 🔄 AudioDetectionComponent初期化フロー

```mermaid
flowchart TD
    A[startRangeTest呼び出し] --> B{既存audioDetector確認}
    B -->|存在| C[既存audioDetector破棄]
    C --> D[audioDetector.stopDetection]
    D --> E[audioDetector.destroy]
    E --> F[audioDetector = null]
    
    B -->|なし| G[新規AudioDetectionComponent作成]
    F --> G
    
    G --> H[音域テスト用セレクター設定]
    H --> I{設定内容}
    
    I --> J["volumeBarSelector: '#range-test-volume-bar'"]
    I --> K["volumeTextSelector: '#range-test-volume-text'"]
    I --> L["frequencySelector: '#range-test-frequency-value'"]
    I --> M["clarityThreshold: 0.4"]
    I --> N["minVolumeAbsolute: 0.01 (調整予定)"]
    I --> O["deviceOptimization: true"]
    
    J --> P[audioDetector.initialize実行]
    K --> P
    L --> P
    M --> P
    N --> P
    O --> P
    
    P --> Q[VoiceRangeTesterV113初期化]
    Q --> R[プログレスコールバック設定]
    R --> S[音域テスト準備完了]
```

---

## 🎵 VoiceRangeTesterV113動作フロー

```mermaid
flowchart TD
    A[VoiceRangeTesterV113.startRangeTest] --> B[内部状態初期化]
    B --> C["currentTestPhase = 'ready'"]
    C --> D[低音テストフェーズ開始]
    
    D --> E["currentTestPhase = 'low'"]
    E --> F[音域テストバッジ: 下矢印表示]
    F --> G[ステータス: '低い声を出してください']
    G --> H[音声検出待機開始]
    
    H --> I{音声検出条件チェック}
    I -->|条件未達| J[待機継続]
    J --> I
    
    I -->|条件達成| K[音声検出開始]
    K --> L[stabilityStartTime記録]
    L --> M[音域テストバッジ: アイコン非表示]
    M --> N[カウントアップ表示開始]
    
    N --> O[3秒測定実行]
    O --> P{安定度チェック}
    P -->|不安定| Q[測定リセット]
    Q --> H
    
    P -->|安定| R[低音測定完了]
    R --> S[高音テストフェーズ開始]
    
    S --> T["currentTestPhase = 'high'"]
    T --> U[音域テストバッジ: 上矢印表示]
    U --> V[ステータス: '高い声を出してください']
    V --> W[高音測定実行: 同様のフロー]
    
    W --> X[高音測定完了]
    X --> Y["currentTestPhase = 'completed'"]
    Y --> Z[結果保存・表示]
```

---

## 🎯 音域テストバッジ更新フロー

```mermaid
flowchart TD
    A[VoiceRangeTesterV113内部処理] --> B[プログレス計算]
    B --> C[progressCallback実行]
    C --> D[updateRangeTestBadge呼び出し]
    
    D --> E{stability値範囲チェック}
    E -->|0-100範囲外| F[値を0-100に制限]
    F --> G[offset計算実行]
    E -->|正常範囲| G
    
    G --> H["offset = 452 - (progress/100) * 452"]
    H --> I[SVG円弧のstrokeDashOffset更新]
    I --> J[視覚的プログレス表示]
    
    J --> K{中央アイコン状態判定}
    K -->|音声検出前| L[アイコン表示: arrow-down/up]
    K -->|音声検出後| M[アイコン非表示・カウント表示]
    
    L --> N[バッジ更新完了]
    M --> N
```

---

## 🔄 コールバック連携フロー

```mermaid
flowchart TD
    A[PitchDetector音程検出] --> B[AudioDetectionComponent内部処理]
    B --> C[VoiceRangeTesterV113コールバック設定]
    C --> D["window.rangeTestUIUpdate呼び出し"]
    
    D --> E[PreparationTestUI.updateRangeTestUI]
    E --> F[音量バー更新]
    E --> G[音量テキスト更新]
    E --> H[周波数表示更新]
    
    F --> I[VoiceRangeTesterV113.handlePitchDetection]
    G --> I
    H --> I
    
    I --> J{音程検出結果判定}
    J -->|有効な音程| K[安定度計算実行]
    J -->|無効| L[待機状態継続]
    
    K --> M[updateRangeTestBadge実行]
    M --> N[バッジプログレス表示]
    
    L --> O[アイコン表示維持]
    N --> P[カウント・プログレス表示]
```

---

## 🎤 音声検出判定フロー

```mermaid
flowchart TD
    A[音程検出結果受信] --> B{基本条件チェック}
    B -->|NG| C[検出失敗]
    B -->|OK| D{詳細条件チェック}
    
    D --> E["frequency > 0"]
    D --> F["clarity > 0.6"]
    D --> G["volume > 0.02"]
    
    E --> H{全条件達成?}
    F --> H
    G --> H
    
    H -->|No| I[音声検出継続]
    H -->|Yes| J[音声検出成功]
    
    J --> K[stabilityStartTime設定]
    K --> L[測定モード開始]
    L --> M[安定性監視開始]
    
    M --> N{安定性チェック}
    N -->|±8Hz以内| O[安定フレーム蓄積]
    N -->|範囲外| P[測定リセット]
    
    O --> Q{3秒経過?}
    Q -->|No| R[継続測定]
    Q -->|Yes| S[測定完了]
    
    P --> I
    R --> N
    S --> T[最終結果確定]
```

---

## 📱 デバイス最適化フロー

```mermaid
flowchart TD
    A[AudioDetectionComponent初期化] --> B[DeviceDetection実行]
    B --> C{デバイス判定}
    
    C -->|PC| D[PC設定適用]
    D --> E["volumeMultiplier: 3.0"]
    D --> F["sensitivityMultiplier: 2.5"]
    D --> G["minVolumeAbsolute: 0.003"]
    
    C -->|iPhone| H[iPhone設定適用]
    H --> I["volumeMultiplier: 4.5"]
    H --> J["sensitivityMultiplier: 3.5"]
    H --> K["minVolumeAbsolute: 0.002"]
    
    C -->|iPad| L[iPad設定適用]
    L --> M["volumeMultiplier: 7.0"]
    L --> N["sensitivityMultiplier: 5.0"]
    L --> O["minVolumeAbsolute: 0.001 (要調整)"]
    
    E --> P[PitchDetector設定更新]
    F --> P
    G --> P
    I --> P
    J --> P
    K --> P
    M --> P
    N --> P
    O --> P
    
    P --> Q[MicrophoneController感度設定]
    Q --> R[デバイス最適化完了]
```

---

## ⚠️ エラーハンドリングフロー

```mermaid
flowchart TD
    A[エラー発生] --> B{エラー種別判定}
    
    B -->|初期化エラー| C[AudioDetectionComponent初期化失敗]
    B -->|マイクアクセスエラー| D[MicrophoneAccessError]
    B -->|音程検出エラー| E[PitchDetectionError]
    B -->|UI更新エラー| F[DOM要素未発見エラー]
    
    C --> G[ErrorMessageBuilder.logError]
    D --> G
    E --> G
    F --> G
    
    G --> H[構造化エラー作成]
    H --> I[コールバック通知]
    I --> J[ユーザー向けメッセージ表示]
    
    J --> K{復旧可能?}
    K -->|Yes| L[自動復旧試行]
    K -->|No| M[ユーザー操作待機]
    
    L --> N{復旧成功?}
    N -->|Yes| O[正常動作復帰]
    N -->|No| M
```

---

## 🔧 リソース管理フロー

```mermaid
flowchart TD
    A[コンポーネント使用開始] --> B[AudioDetectionComponent作成]
    B --> C[MicrophoneController初期化]
    C --> D[AudioManager初期化]
    D --> E[PitchDetector初期化]
    
    E --> F[リソース使用中]
    F --> G{終了条件}
    
    G -->|手動停止| H[stopDetection呼び出し]
    G -->|エラー発生| I[エラーハンドリング]
    G -->|テスト完了| J[正常終了]
    
    H --> K[destroy実行]
    I --> K
    J --> K
    
    K --> L[PitchDetector.destroy]
    L --> M[MicrophoneController.destroy]
    M --> N[AudioManager.destroy]
    N --> O[DOM要素キャッシュクリア]
    O --> P[コールバッククリア]
    P --> Q[状態リセット]
    Q --> R[リソース解放完了]
```

---

## 📋 データフローとUI連携

```mermaid
flowchart LR
    A[音声入力] --> B[AudioManager処理]
    B --> C[PitchDetector解析]
    C --> D[周波数・音量・明瞭度算出]
    
    D --> E[AudioDetectionComponent]
    E --> F[UI要素更新]
    E --> G[コールバック通知]
    
    F --> H["#range-test-volume-bar"]
    F --> I["#range-test-volume-text"]
    F --> J["#range-test-frequency-value"]
    
    G --> K[window.rangeTestUIUpdate]
    K --> L[PreparationTestUI処理]
    K --> M[VoiceRangeTesterV113処理]
    
    M --> N[音域テストバッジ更新]
    M --> O[測定状態管理]
    M --> P[結果データ保存]
    
    P --> Q[DataManager]
    Q --> R[LocalStorage保存]
```

---

## 🎯 クリーンアップ対象の特定

### 削除すべき古いコード
```mermaid
flowchart TD
    A[preparation-test.html解析] --> B{コード分類}
    
    B -->|削除対象| C[古いPitchProバージョン対応コード]
    B -->|削除対象| D[重複したデバイス検出処理]  
    B -->|削除対象| E[未使用のテスト用コード]
    B -->|削除対象| F[不適切なコールバック処理]
    
    B -->|保持対象| G[AudioDetectionComponent統合]
    B -->|保持対象| H[VoiceRangeTesterV113連携]
    B -->|保持対象| I[音域テストバッジ機能]
    B -->|保持対象| J[PreparationTestUI機能]
    
    C --> K[クリーンアップ実行]
    D --> K
    E --> K
    F --> K
    
    G --> L[機能保持・最適化]
    H --> L
    I --> L
    J --> L
```

---

## 🚀 実装優先度マップ

```mermaid
flowchart TD
    A[最優先: 動作保証] --> B[AudioDetectionComponent再初期化]
    B --> C[VoiceRangeTesterV113連携]
    C --> D[音域テストバッジ更新]
    
    A --> E[高優先: 安定性] --> F[エラーハンドリング強化]
    F --> G[リソース管理徹底]
    G --> H[デバイス最適化調整]
    
    A --> I[中優先: 最適化] --> J[不要コード削除]  
    J --> K[パフォーマンス改善]
    K --> L[コード構造整理]
    
    A --> M[低優先: 拡張] --> N[新機能追加検討]
    N --> O[UI改善検討]
```

---

**このフロー図を基準にクリーンアップ作業を実行する**