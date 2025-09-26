# preparation.js 構造分析結果

## 基本情報
- **ファイルサイズ**: 1420行
- **問題**: モジュール化前の責任分離未実施
- **課題**: グローバル変数・関数の乱立、責任境界不明

## 責任領域の特定

### 1. デバイス検出 (Device Detection)
**関数:**
- `detectDeviceWithSpecs` - メイン検出関数（iPadOS 13+対応）

**変数:**
- `deviceSpecs` - グローバル設定オブジェクト
- `userAgent`, `touchSupport`, `iPadUA`, `macintoshUA` - 検出変数

**責任:** デバイス種別判定と感度設定の提供

### 2. UI制御 (UI Control)
**DOM要素:**
- `requestMicBtn`, `audioTestSection`, `permissionSection`, `rangeTestSection`, `resultSection`
- `startRangeTestBtn`, `startTrainingBtn`, `remeasureRangeBtn`, `retestRangeBtn`, `skipRangeTestBtn`

**関数:**
- `showSection` - セクション切り替え
- `updateStepStatus` - ステップ表示更新
- `displaySavedRangeData` - 保存データ表示

**責任:** DOM操作、セクション管理、UI状態制御

### 3. 音声処理 (Audio Processing)
**オブジェクト:**
- `audioProcessor` - メイン音声処理オブジェクト
- `volumeBarController` - 音量バー制御

**関数:**
- `startRealAudioDetection` - 音声検出開始
- `handleRealPitchUpdate` - 音程更新処理
- `handleVolumeUpdate` - 音量更新処理
- `handleAudioError` - エラーハンドリング
- `frequencyToNote` - 音程変換
- `startVolumeSimulation` - ボリューム表示

**責任:** 音声入力処理、音程検出、音量制御

### 4. 状態管理 (State Management)
**状態変数:**
- `detectionActive` - 検出状態フラグ
- `detectedCDoPitches` - 検出済み音程配列
- `detectionStartTime` - 検出開始時刻

**定数:**
- `MIN_DETECTION_TIME` - 最小検出時間
- `MIN_PITCH_DETECTIONS` - 最小検出回数

**責任:** アプリケーション状態の管理と検出条件制御

### 5. フロー制御 (Flow Control)
**イベントハンドラー:**
- 各ボタンのaddEventListener callbacks
- DOMContentLoaded初期化

**フロー関数:**
- `startRangeTest` - 音域テスト開始
- `showDetectionSuccess` - 成功表示
- `updateDetectionProgress` - 進捗更新

**責任:** アプリケーションフロー制御、イベント処理、初期化

## モジュール分割設計

### 推奨5モジュール構成:
1. **`device-manager.js`** - デバイス検出と設定管理
2. **`ui-controller.js`** - DOM操作とセクション管理  
3. **`audio-manager.js`** - 音声処理と検出ロジック
4. **`state-manager.js`** - アプリケーション状態管理
5. **`preparation-controller.js`** - メイン制御とフロー管理

## 抽出優先順位
1. **デバイス管理** - 他モジュールから参照される基盤機能
2. **状態管理** - 各モジュール間で共有される状態
3. **UI制御** - DOM依存を分離
4. **音声処理** - 複雑な処理ロジックを分離
5. **フロー制御** - 最終的な統合制御

## 注意点
- グローバル変数の段階的移行が必要
- DOM要素アクセスの初期化タイミング調整必要
- イベントリスナーの重複設定回避
- 既存機能を壊さない段階的抽出が重要