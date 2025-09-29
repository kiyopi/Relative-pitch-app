# GlobalAudioManager実装ガイド

## 📋 概要

**GlobalAudioManager**は、複数のページ間でPitchPro v1.3.1 AudioDetectionComponentを効率的に共有管理するシステムです。

### 🎯 設計思想

1. **単一インスタンス管理**: AudioDetectionComponentを1回だけ初期化
2. **ページ間共有**: Step1 → Step2 → Training での状態継承
3. **PitchPro準拠**: v1.3.1の推奨パターンに完全準拠
4. **シンプル利用**: 各ページでの実装を最小化

## 🏗️ アーキテクチャ

### システム構成

```
GlobalAudioManager (グローバル層)
├── PitchPro AudioDetectionComponent (単一インスタンス)
├── デバイス最適化設定
└── 状態管理

Page Handlers (ページ層)
├── Step1AudioHandler
├── Step2AudioHandler
└── TrainingAudioHandler
```

### 責任分担

| 層 | 責任 |
|---|---|
| **GlobalAudioManager** | 初期化、デバイス検出、インスタンス管理 |
| **Page Handlers** | ページ固有UI、ユーザーインタラクション |

## 📁 ファイル構成

```
/js/
├── global-audio-manager.js          # グローバル管理システム
└── page-handlers/
    ├── step1-audio-handler.js       # Step1専用ハンドラー
    ├── step2-audio-handler.js       # Step2専用ハンドラー
    └── training-audio-handler.js    # トレーニング汎用ハンドラー
```

## 🚀 実装パターン

### 1. HTMLファイルでの読み込み

```html
<!-- 必須: GlobalAudioManager -->
<script src="../js/global-audio-manager.js"></script>

<!-- ページ固有ハンドラー -->
<script src="../js/page-handlers/step1-audio-handler.js"></script>
```

### 2. 基本利用パターン

```javascript
// 1. GlobalAudioManager取得
const audioManager = window.globalAudioManager;

// 2. 初期化（初回のみ実行される）
await audioManager.initialize();

// 3. ページ固有UI接続
await audioManager.connectToPage('PageName', {
    volumeBarSelector: '#volume-bar',
    volumeTextSelector: '#volume-text',
    frequencySelector: '#frequency-display'
});

// 4. コールバック設定
audioManager.setPageCallbacks({
    onPitchUpdate: (result) => { /* 処理 */ },
    onError: (error) => { /* エラー処理 */ }
});

// 5. 音声検出開始
await audioManager.startDetection();
```

### 3. ページ固有ハンドラーパターン

```javascript
class PageAudioHandler {
    constructor() {
        this.audioManager = window.globalAudioManager;
    }

    async initialize() {
        // GlobalAudioManager初期化
        await this.audioManager.initialize();

        // ページ固有UI接続
        await this.audioManager.connectToPage('PageName', selectors);

        // ページ固有初期化
        this.setupPageSpecificFeatures();
    }

    setupPageSpecificFeatures() {
        // ページ固有の機能実装
    }
}
```

## 📝 各ページでの実装例

### Step1 (マイク許可・音声テスト)

```javascript
// step1-audio-handler.js の利用例
const step1Handler = new Step1AudioHandler();
await step1Handler.initialize();

// マイク許可要求
await step1Handler.requestMicrophonePermission();

// 音声テスト開始
await step1Handler.startAudioTest();
```

#### 特徴
- マイク許可処理
- 基本的な音声検出
- localStorage状態管理
- Step2への遷移準備

### Step2 (音域テスト)

```javascript
// step2-audio-handler.js の利用例
const step2Handler = new Step2AudioHandler();
await step2Handler.initialize();

// 音域テスト開始
await step2Handler.startVoiceRangeTest();
```

#### 特徴
- Step1の状態継承
- 音域測定ロジック
- プログレスバー管理
- 結果計算・保存

### Training (トレーニング)

```javascript
// training-audio-handler.js の利用例
const trainingHandler = new TrainingAudioHandler('relative-pitch');
await trainingHandler.initialize();

// リスニングセッション開始
await trainingHandler.startListening(questionData);
```

#### 特徴
- 複数トレーニングモード対応
- セッション管理
- 答え判定ロジック
- 結果保存

## 🔧 GlobalAudioManager API

### 初期化メソッド

| メソッド | 説明 |
|---------|------|
| `initialize()` | システム初期化（初回のみ実行） |
| `detectDeviceWithSpecs()` | デバイス検出・最適化 |
| `optimizeForDevice()` | デバイス固有設定適用 |

### 接続メソッド

| メソッド | 説明 |
|---------|------|
| `connectToPage(pageName, selectors)` | ページ固有UI要素接続 |
| `setPageCallbacks(callbacks)` | コールバック設定 |

### 制御メソッド

| メソッド | 説明 |
|---------|------|
| `startDetection()` | 音声検出開始 |
| `stopDetection()` | 音声検出停止 |
| `reset()` | 完全リセット（緊急時） |

### 状態メソッド

| メソッド | 説明 |
|---------|------|
| `getStatus()` | システム状態取得 |
| `resetError()` | エラー状態リセット |

## 📊 デバイス最適化

### 対応デバイス

| デバイス | 感度倍率 | 音量バー倍率 |
|----------|----------|-------------|
| **PC** | 2.5x | 4.0x |
| **iPhone** | 3.5x | 4.5x |
| **iPad** | 5.0x | 7.0x |

### iPadOS 13+ 対応

```javascript
// 特殊検出ロジック
const isIPadOS = /Macintosh/.test(userAgent) && 'ontouchend' in document;
```

## 🔄 ライフサイクル管理

### 状態遷移

```
未初期化 → 初期化済み → デバイス最適化 → ページ接続 → 検出中
    ↓           ↓            ↓           ↓        ↓
   エラー ← － － － － － － － － － － － － － ← － ←
```

### localStorage管理

| キー | 内容 |
|------|------|
| `micPermissionGranted` | マイク許可状態 |
| `step1Completed` | Step1完了状態 |
| `voiceRangeData` | 音域テスト結果 |
| `step2Completed` | Step2完了状態 |
| `trainingResults` | トレーニング結果履歴 |

## ⚠️ 重要な注意事項

### DO's ✅

1. **GlobalAudioManager経由でのみアクセス**
2. **updateSelectors()でUI要素切り替え**
3. **コールバック方式での音量取得**
4. **適切なエラーハンドリング**

### DON'Ts ❌

1. **直接AudioDetectionComponentを作成しない**
2. **重複初期化を行わない**
3. **rawVolumeプロパティに直接アクセスしない**
4. **PitchPro内部設定を上書きしない**

## 🐛 デバッグ・トラブルシューティング

### ログ確認

```javascript
// システム状態確認
console.log(window.globalAudioManager.getStatus());

// ページハンドラー状態確認
console.log(window.step1AudioHandler?.getStatus());
```

### よくある問題

1. **初期化エラー**: PitchProライブラリ読み込み確認
2. **UI更新されない**: セレクター設定確認
3. **音声検出しない**: マイク許可状態確認
4. **ページ遷移で動作しない**: localStorage状態確認

## 🔄 移行ガイド

### 既存実装からの移行

1. **既存のPitchProCycleManager削除**
2. **GlobalAudioManager読み込み追加**
3. **ページ固有ハンドラー実装**
4. **HTML読み込みスクリプト更新**

### 段階的移行

1. **Phase 1**: GlobalAudioManager導入
2. **Phase 2**: Step1ページ移行
3. **Phase 3**: Step2ページ移行
4. **Phase 4**: Trainingページ移行
5. **Phase 5**: 既存コード削除

## 📈 パフォーマンス最適化

### メモリ効率

- **単一インスタンス**: メモリ使用量削減
- **適切なクリーンアップ**: メモリリーク防止
- **必要時のみアクティブ**: CPU使用量最適化

### ネットワーク効率

- **1回のみライブラリ読み込み**: 初回ページで完了
- **状態の永続化**: ページ遷移時の再初期化不要

## 🎯 今後の拡張

### 追加予定機能

1. **録音機能統合**
2. **リアルタイム音声分析**
3. **クラウド同期対応**
4. **マルチユーザー対応**

### 拡張ポイント

```javascript
// カスタムトレーニングモード追加例
class CustomTrainingHandler extends TrainingAudioHandler {
    constructor() {
        super('custom-mode');
    }

    async initializeTrainingMode() {
        // カスタム初期化
    }
}
```

---

## 📄 関連ドキュメント

- [PitchPro v1.3.1 公式ドキュメント](https://github.com/kiyopi/pitchpro-audio-processing)
- [プロジェクト全体仕様](../APP_SPECIFICATION.md)
- [技術仕様書](../TECHNICAL_SPECIFICATIONS.md)

---

**作成日**: 2025年1月29日
**バージョン**: 1.0.0
**更新者**: Claude Code Assistant