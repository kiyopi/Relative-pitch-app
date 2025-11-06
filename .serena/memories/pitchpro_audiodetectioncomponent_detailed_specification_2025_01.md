# PitchPro AudioDetectionComponent 詳細仕様分析

## 📋 クラス概要
AudioDetectionComponent は PitchPro Audio Processing Library v1.3.1 の中核クラスで、リアルタイム音程・音量検出とUI要素の自動同期を提供します。

## 🔧 主要メソッド一覧

### 初期化・ライフサイクル管理
- `initialize()` - 音声検出リソースの準備
- `startDetection()` - リアルタイム音程・音量追跡開始
- `stopDetection()` - 音声検出の停止
- `destroy()` - リソースの完全解放

### UI管理メソッド
- `resetDisplayElements()` - UI要素のクリア・リセット
- `updateSelectors()` - UI要素参照の動的更新
- `setCallbacks()` - コールバック関数の設定

## 🎯 Constructor設定項目

### 基本セレクター設定
```javascript
const audioDetector = new AudioDetectionComponent({
  volumeBarSelector: '#volume-bar',        // 音量バー要素
  volumeTextSelector: '#volume-text',      // 音量テキスト要素
  frequencySelector: '#frequency-display', // 周波数表示要素
  noteSelector: '#note-display'            // 音名表示要素
});
```

### サポートされるUI要素
- 音量バー（プログレスバー）
- 音量テキスト（パーセント表示）
- 周波数表示（Hz値）
- 音名表示（C4、D#5等）

## 📞 コールバック設定

### onPitchUpdate コールバック
```javascript
audioDetector.setCallbacks({
  onPitchUpdate: (result) => {
    // 各音声検出サイクルで呼び出される
    console.log('周波数:', result.frequency);
    console.log('音名:', result.note);
    console.log('音量:', result.volume);
    console.log('明瞭度:', result.clarity);
  }
});
```

### onError コールバック
```javascript
audioDetector.setCallbacks({
  onError: (error) => {
    // 検出エラー時の処理
    console.error('音声検出エラー:', error);
  }
});
```

## 🔄 ライフサイクル管理パターン

### 基本的な使用フロー
```javascript
// 1. インスタンス作成
const audioDetector = new AudioDetectionComponent(config);

// 2. 初期化
await audioDetector.initialize();

// 3. コールバック設定
audioDetector.setCallbacks({...});

// 4. 検出開始
await audioDetector.startDetection();

// 5. 検出停止
await audioDetector.stopDetection();

// 6. リソース解放
audioDetector.destroy();
```

## 🔧 重要メソッドの詳細

### resetDisplayElements()
- **目的**: UI要素を初期状態にクリア・リセット
- **使用タイミング**: 音声検出成功後、セクション切り替え時
- **効果**: 音量バー、周波数表示、音名表示等を初期値に戻す

### updateSelectors()
- **目的**: UI要素セレクターの動的更新
- **使用タイミング**: セクション切り替え時（マイクテスト→音域テスト等）
- **効果**: 同一インスタンスで異なるUI要素を制御可能

### setCallbacks()
- **目的**: イベントコールバック関数の設定・更新
- **使用タイミング**: 初期化後、モード切り替え時
- **効果**: onPitchUpdate、onErrorコールバックの動的変更

## 🎯 実装上の重要ポイント

### 1. 単一インスタンス運用推奨
- 同一ページで複数インスタンス作成は避ける
- updateSelectors()でUI要素を切り替えて使い回す

### 2. 適切なリソース管理
- 必ずstopDetection()→destroy()の順で解放
- ページ遷移前の確実なクリーンアップ

### 3. UI要素の自動同期
- セレクターで指定した要素は自動更新される
- 手動でのDOM操作は不要

### 4. クロスデバイス最適化
- PC、iPhone、iPad等のデバイス固有最適化済み
- 統一的なAPIで各デバイスに対応

## ⚠️ 注意事項

### 使用禁止パターン
- 複数AudioDetectionComponentの同時生成
- stopDetection()なしでのdestroy()実行
- 初期化前のstartDetection()実行

### 推奨パターン
- 単一インスタンスでのupdateSelectors()使用
- 適切なライフサイクル管理
- エラーハンドリングの実装

## 🔗 関連ドキュメント
- GitHub: https://github.com/kiyopi/pitchpro-audio-processing
- Version: v1.3.1
- 分析日: 2025年1月28日