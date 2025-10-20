# 音域テストフロー図 v2.0.0

**ファイル**: voice-range-test-v4
**更新日**: 2025年1月21日
**目的**: 音域テスト最新実装フロー可視化図
**対象**: PitchPro v1.3.0統合版・測定失敗ハンドリング・リトライ機能完備版

---

## 🎯 全体フロー概要

```mermaid
flowchart TD
    A[ページ読み込み] --> B[PitchPro v1.3.0読み込み]
    B --> C[voice-range-test-demo.js初期化]
    C --> D[マイク許可要求]

    D --> E{マイク許可}
    E -->|許可| F[音域テスト開始ボタン有効化]
    E -->|拒否| G[エラーメッセージ表示]

    F --> H[音域テスト開始]
    H --> I[AudioDetectionComponent初期化]
    I --> J[低音測定フェーズ]

    J --> K{低音測定結果}
    K -->|成功| L[高音測定フェーズ]
    K -->|失敗| M[低音測定リトライ（最大3回）]
    M -->|リトライ成功| L
    M -->|最大リトライ到達| N[高音測定にスキップ]

    L --> O{高音測定結果}
    O -->|成功| P[完全な音域結果表示]
    O -->|失敗| Q[高音測定リトライ（最大3回）]
    Q -->|リトライ成功| P
    Q -->|最大リトライ到達| R[部分結果表示（低音のみ）]

    N --> S[高音測定フェーズ（低音失敗後）]
    S --> T{高音測定結果}
    T -->|成功| U[部分結果表示（高音のみ）]
    T -->|失敗| V[測定完全失敗・再測定推奨]
```

---

## 🔄 測定フェーズ詳細フロー

```mermaid
flowchart TD
    A[測定フェーズ開始] --> B[globalState.currentPhase設定]
    B --> C{フェーズ種別}

    C -->|waiting-for-voice| D[低音待機状態]
    C -->|waiting-for-voice-high| E[高音待機状態]

    D --> F[updateBadgeForWaiting: arrow-down]
    E --> G[updateBadgeForWaiting: arrow-up]

    F --> H[音声検出待機開始]
    G --> H

    H --> I{音声検出条件}
    I --> J["volume >= 15% (voiceDetectionThreshold)"]
    I --> K["frequency > 0"]
    I --> L["安定性チェック（isStableVoiceDetection）"]

    J --> M{全条件達成?}
    K --> M
    L --> M

    M -->|No| N[待機継続]
    N --> I

    M -->|Yes| O[測定開始]
    O --> P["currentPhase = 'measuring-low/high'"]
    P --> Q[runMeasurementPhase開始]

    Q --> R[3秒測定実行]
    R --> S[requestAnimationFrame統合進捗表示]
    S --> T[recordMeasurementData記録]

    T --> U[測定完了]
    U --> V{測定成功判定}
    V --> W["dataCount >= 20 && 最低/最高音検出"]

    W -->|成功| X[次フェーズまたは結果表示]
    W -->|失敗| Y[失敗処理・リトライ]
```

---

## 🎯 測定失敗ハンドリングフロー

```mermaid
flowchart TD
    A[測定失敗検出] --> B{フェーズ判定}

    B -->|低音測定失敗| C[handleLowPitchMeasurementFailure]
    B -->|高音測定失敗| D[handleHighPitchMeasurementFailure]

    C --> E{retryCount < 3?}
    E -->|Yes| F[retryCount++]
    F --> G[updateCircularProgressInstantly: 0%]
    G --> H[失敗UI表示・警告通知]
    H --> I[2秒後自動リトライ]
    I --> J[retryLowPitchMeasurement]
    J --> K[waiting-for-voice状態に復帰]

    E -->|No| L[最大リトライ到達]
    L --> M[高音測定に強制進行]
    M --> N[startHighPitchPhase]

    D --> O{highRetryCount < 3?}
    O -->|Yes| P[highRetryCount++]
    P --> Q[updateCircularProgressInstantly: 0%]
    Q --> R[失敗UI表示・警告通知]
    R --> S[2秒後自動リトライ]
    S --> T[retryHighPitchMeasurement]
    T --> U[waiting-for-voice-high状態に復帰]

    O -->|No| V[最大リトライ到達]
    V --> W{低音データ存在?}
    W -->|Yes| X[部分結果表示（低音のみ）]
    W -->|No| Y[測定完全失敗]

    Y --> Z[再測定ボタン表示・エラー通知]
```

---

## 🔄 PitchPro v1.3.0統合フロー

```mermaid
flowchart TD
    A[AudioDetectionComponent初期化] --> B[コンストラクタパターン使用]
    B --> C[設定オブジェクト作成]

    C --> D["volumeBarSelector: '#range-test-volume-bar'"]
    C --> E["volumeTextSelector: '#range-test-volume-text'"]
    C --> F["frequencySelector: '#range-test-frequency-value'"]
    C --> G["debugMode: false（本番）"]

    D --> H[onPitchUpdateコールバック設定]
    E --> H
    F --> H
    G --> H

    H --> I[updateDebugData実行]
    H --> J[handleVoiceDetection実行]

    I --> K[リアルタイムデバッグ情報更新]
    J --> L{currentPhase判定}

    L -->|waiting系| M[厳格な雑音排除適用]
    L -->|measuring系| N[緩い音量チェックのみ]

    M --> O[isStableVoiceDetection実行]
    O --> P{安定性判定}
    P -->|安定| Q[測定開始処理]
    P -->|不安定| R[待機継続]

    N --> S[recordMeasurementData実行]
    S --> T[有効データのみ記録]

    Q --> U[音域測定進行]
    R --> V[音声検出継続]
    T --> W[測定データ蓄積]
```

---

## 📊 データ記録・検証フロー

```mermaid
flowchart TD
    A[recordMeasurementData呼び出し] --> B{データ有効性チェック}
    B -->|無効| C[スキップログ出力]
    B -->|有効| D[currentPhase判定]

    D -->|measuring-low| E[低音データ記録]
    D -->|measuring-high| F[高音データ記録]

    E --> G[frequencies配列に追加]
    E --> H[lowestFreq更新チェック]
    E --> I[avgVolume計算]
    E --> J{5個おき?}
    J -->|Yes| K[進捗ログ出力]

    F --> L[frequencies配列に追加]
    F --> M[highestFreq更新チェック]
    F --> N[avgVolume計算]
    F --> O{5個おき?}
    O -->|Yes| P[進捗ログ出力]

    G --> Q[測定完了時検証]
    L --> Q

    Q --> R{成功条件チェック}
    R --> S["dataCount >= 20"]
    R --> T["lowestFreq/highestFreq存在"]

    S --> U{成功判定}
    T --> U

    U -->|成功| V[次フェーズ進行]
    U -->|失敗| W[詳細検証ログ出力]
    W --> X[失敗処理呼び出し]
```

---

## 🎨 UI状態管理フロー

```mermaid
flowchart TD
    A[UI状態変更要求] --> B{変更対象}

    B -->|円形プログレスバー| C[updateCircularProgressInstantly]
    B -->|バッジ状態| D[updateBadgeFor系関数]
    B -->|ボタン表示| E[DOM要素style.display変更]
    B -->|ステータステキスト| F[textContent更新]

    C --> G[アニメーション無効化]
    G --> H[strokeDashOffset即座更新]
    H --> I[200ms後アニメーション再有効化]

    D --> J{状態種別}
    J -->|waiting| K[updateBadgeForWaiting]
    J -->|measuring| L[updateBadgeForMeasuring]
    J -->|confirmed| M[updateBadgeForConfirmed]
    J -->|failure| N[updateBadgeForFailure]
    J -->|error| O[updateBadgeForError]

    K --> P[アイコン表示・プログレス非表示]
    L --> Q[アイコン非表示・プログレス表示]
    M --> R[チェックマーク表示]
    N --> S[警告表示]
    O --> T[エラー表示]

    E --> U[ボタン表示/非表示切り替え]
    F --> V[ユーザー向けメッセージ更新]

    P --> W[UI状態同期完了]
    Q --> W
    R --> W
    S --> W
    T --> W
    U --> W
    V --> W
```

---

## 🔄 PitchProメソッド活用フロー

```mermaid
flowchart TD
    A[音域テスト終了/失敗] --> B[PitchPro停止処理]

    B --> C{stopメソッド存在?}
    C -->|Yes| D[audioDetector.stop実行]
    C -->|No| E[audioDetector.stopDetection実行]

    D --> F[PitchProによる自動リセット]
    E --> F

    F --> G[音量バー自動リセット]
    F --> H[マイク状態自動リセット]
    F --> I[周波数表示自動リセット]

    G --> J[アプリケーション側処理]
    H --> J
    I --> J

    J --> K[updateMicStatus: 'standby']
    J --> L[UI要素表示切り替え]
    J --> M[円形プログレスバーリセット]

    K --> N[表示状態のみ更新]
    L --> O[ボタン・テキスト表示調整]
    M --> P[updateCircularProgressInstantly: 0%]

    N --> Q[完全なUI状態リセット完了]
    O --> Q
    P --> Q
```

---

## 🧪 デバッグ・ログフロー

```mermaid
flowchart TD
    A[デバッグデータ更新] --> B[updateDebugData実行]
    B --> C[グローバルデバッグデータ蓄積]

    C --> D{デバッグ表示ON?}
    D -->|Yes| E[updateDebugDisplay実行]
    D -->|No| F[データのみ蓄積]

    E --> G[HTML要素更新]
    G --> H[リアルタイム検出情報表示]
    G --> I[音域範囲情報表示]
    G --> J[検出回数カウント表示]

    F --> K[測定ログ出力]
    K --> L{ログ種別}

    L -->|データ記録| M[5個おき進捗ログ]
    L -->|測定検証| N[成功/失敗詳細ログ]
    L -->|失敗処理| O[リトライ状況ログ]
    L -->|PitchPro連携| P[メソッド使用ログ]

    M --> Q[コンソール出力]
    N --> Q
    O --> Q
    P --> Q

    H --> R[開発者向け情報提供]
    I --> R
    J --> R
    Q --> R
```

---

## ⚠️ エラーハンドリング詳細フロー

```mermaid
flowchart TD
    A[エラー発生] --> B{エラー種別}

    B -->|初期化エラー| C[AudioDetectionComponent初期化失敗]
    B -->|測定データ不足| D[データ数 < 20個]
    B -->|音声検出失敗| E[音量・周波数検出不可]
    B -->|システムエラー| F[PitchPro内部エラー]

    C --> G[エラーログ出力]
    D --> H[測定失敗処理]
    E --> I[音声検出継続]
    F --> J[AudioDetector再初期化]

    H --> K{リトライ可能?}
    K -->|Yes| L[自動リトライ開始]
    K -->|No| M[部分結果表示/完全失敗]

    L --> N[リトライカウンター増加]
    N --> O[UI状態リセット]
    O --> P[測定再開]

    M --> Q[適切なユーザー通知]
    Q --> R[再測定ボタン表示]

    G --> S[開発者向けログ]
    I --> T[検出条件緩和検討]
    J --> U[システム復旧処理]

    S --> V[問題診断情報提供]
    T --> W[音声検出継続]
    U --> X[正常動作復帰]
```

---

## 🎯 成功シナリオフロー

```mermaid
flowchart TD
    A[音域テスト開始] --> B[マイク許可確認]
    B --> C[AudioDetectionComponent初期化成功]
    C --> D[低音測定フェーズ開始]

    D --> E[音声検出待機]
    E --> F[安定した低音検出]
    F --> G[3秒測定実行]
    G --> H[20個以上データ記録]
    H --> I[低音測定成功]

    I --> J[3秒待機（idle-low）]
    J --> K[高音測定フェーズ開始]
    K --> L[音声検出待機]
    L --> M[安定した高音検出]
    M --> N[3秒測定実行]
    N --> O[20個以上データ記録]
    O --> P[高音測定成功]

    P --> Q[PitchPro自動停止]
    Q --> R[音域計算実行]
    R --> S[結果表示画面]
    S --> T[測定完了通知]

    T --> U[ユーザー満足度向上]
```

---

## 📋 実装状況サマリー

### ✅ 完了済み機能
- PitchPro v1.3.0統合（コンストラクタパターン）
- 最小データ数要件（20個）による厳格な成功判定
- 低音・高音測定の独立したリトライシステム（各最大3回）
- 円形プログレスバーの即座リセット機能
- PitchProメソッドを活用したUI状態管理
- 詳細なログ出力・デバッグ機能

### 🔄 現在の動作フロー
1. **初期化**: AudioDetectionComponent作成・設定
2. **低音測定**: 待機→検出→測定→検証→成功/リトライ
3. **高音測定**: 待機→検出→測定→検証→成功/リトライ
4. **結果表示**: 完全結果/部分結果/失敗表示
5. **クリーンアップ**: PitchPro停止・UI状態リセット

### 🎯 技術的特徴
- **責任分離**: PitchPro（音声処理）+ アプリ（UI状態管理）
- **堅牢性**: 多層的エラーハンドリング・自動リトライ
- **ユーザビリティ**: 明確な進捗表示・詳細なフィードバック
- **保守性**: 構造化されたデバッグ・ログシステム

---

**Version**: 2.0.0
**Last Updated**: 2025年1月21日
**Based on**: voice-range-test-v4実装 + 測定失敗ハンドリング + リトライ機能