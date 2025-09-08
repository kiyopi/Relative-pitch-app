# AudioDetectionComponent 設計仕様書

## 📋 概要

PitchPro v1.1.3に統合する**AudioDetectionComponent**の完全設計仕様書です。音声検出とUI自動更新を統合したオールインワンコンポーネントを実装します。

## 🎯 実装目的

### 解決する課題
1. **UI更新コードの重複**：複数のページで音量バー・周波数表示の重複実装
2. **PitchDetectorの直接操作**：低レベルAPIの複雑な制御が必要
3. **デバイス最適化の分散**：PC・iPhone・iPad別の設定が各所に散らばっている
4. **エラー処理の不統一**：マイク初期化・検出エラーの処理が統一されていない

### 提供価値
- **統一UI自動更新**：音量バー・周波数・音程表示の完全自動化
- **シンプルAPI**：PitchDetectorの複雑さを隠蔽した使いやすいインターフェース
- **デバイス最適化内蔵**：PC・iPhone・iPad別設定の自動適用
- **包括的エラー処理**：マイク・Web Audio API関連の全エラーハンドリング

## 🏗️ アーキテクチャ設計

### クラス構造
```javascript
class AudioDetectionComponent {
    constructor(config = {})
    async initialize()
    startDetection()
    stopDetection()
    setCallbacks(callbacks)
    updateUI(result)
    destroy()
}
```

### 内部コンポーネント
1. **PitchDetector統合**：既存PitchDetectorのラッパー
2. **UI自動更新エンジン**：DOM要素への自動反映
3. **デバイス最適化**：実機テスト済み設定の自動適用
4. **エラー処理システム**：包括的なエラーハンドリング

## 🔧 技術仕様

### 初期化設定
```javascript
const config = {
    // UI要素セレクター
    volumeBarSelector: '#volume-bar',
    volumeTextSelector: '#volume-text', 
    frequencySelector: '#frequency-display',
    
    // PitchDetector設定
    clarityThreshold: 0.4,
    minVolumeAbsolute: 0.003,
    fftSize: 4096,
    smoothing: 0.1,
    
    // デバイス最適化（自動検出）
    deviceOptimization: true,
    
    // UI更新設定
    uiUpdateInterval: 50, // 20fps
    autoUpdateUI: true,
    
    // デバッグ設定
    debug: false,
    logPrefix: '🎵 AudioDetection'
};
```

### デバイス別最適化設定
```javascript
const deviceSettings = {
    PC: {
        volumeMultiplier: 3.0,
        sensitivityMultiplier: 2.5,
        minVolumeAbsolute: 0.003
    },
    iPhone: {
        volumeMultiplier: 4.5,
        sensitivityMultiplier: 3.5,
        minVolumeAbsolute: 0.002
    },
    iPad: {
        volumeMultiplier: 7.0,
        sensitivityMultiplier: 5.0,
        minVolumeAbsolute: 0.001
    }
};
```

## 📱 デバイス検出ロジック

### iPadOS 13+ 完全対応
```javascript
function detectDevice() {
    const userAgent = navigator.userAgent;
    const isIPhone = /iPhone/.test(userAgent);
    const isIPad = /iPad/.test(userAgent);
    const isIPadOS = /Macintosh/.test(userAgent) && 'ontouchend' in document;
    
    if (isIPhone) return 'iPhone';
    if (isIPad || isIPadOS) return 'iPad';
    return 'PC';
}
```

## 🎨 UI自動更新システム

### 対応UI要素
1. **音量バー**：プログレスバー幅の動的更新
2. **音量テキスト**：パーセンテージ表示
3. **周波数表示**：Hz値とNote名の表示
4. **音程バッジ**：検出音程の視覚表示

### 更新頻度制御
- **標準**：20fps（50ms間隔）
- **高精度**：30fps（33ms間隔）
- **省電力**：10fps（100ms間隔）

## 🔄 API インターフェース

### 基本使用例
```javascript
// 1. 初期化
const audioDetector = new AudioDetectionComponent({
    volumeBarSelector: '#volume-bar',
    frequencySelector: '#frequency-display',
    clarityThreshold: 0.4,
    minVolumeAbsolute: 0.003
});

// 2. 初期化完了
await audioDetector.initialize();

// 3. コールバック設定
audioDetector.setCallbacks({
    onPitchUpdate: (result) => {
        console.log('音程検出:', result);
        // { frequency: 261.6, note: 'C4', volume: 45.2 }
    },
    onError: (error) => {
        console.error('検出エラー:', error);
    }
});

// 4. 検出開始
audioDetector.startDetection();

// 5. 検出停止
audioDetector.stopDetection();
```

### 高度な使用例（音域テスト統合）
```javascript
const audioDetector = new AudioDetectionComponent({
    volumeBarSelector: '#range-test-volume-bar',
    volumeTextSelector: '#range-test-volume-text',
    frequencySelector: '#range-test-frequency-value',
    
    // 音域テスト専用最適化
    clarityThreshold: 0.3,
    minVolumeAbsolute: 0.001,
    deviceOptimization: true,
    debug: true
});

await audioDetector.initialize();

// VoiceRangeTesterとの統合
const voiceRangeTester = new VoiceRangeTesterV113(audioDetector);
```

## 🛡️ エラーハンドリング

### エラー種別
1. **マイク許可エラー**：`MicrophonePermissionError`
2. **初期化エラー**：`InitializationError`
3. **Web Audio APIエラー**：`WebAudioError`
4. **デバイス検出エラー**：`DeviceDetectionError`

### エラー処理戦略
```javascript
audioDetector.setCallbacks({
    onError: (error) => {
        switch (error.type) {
            case 'MicrophonePermissionError':
                // マイク許可ダイアログ再表示
                break;
            case 'InitializationError':
                // システム再初期化
                break;
            case 'WebAudioError':
                // Web Audio API再起動
                break;
        }
    }
});
```

## 🧪 テスト仕様

### 単体テスト
1. **デバイス検出テスト**：PC・iPhone・iPad判定
2. **UI更新テスト**：DOM要素への反映確認
3. **設定適用テスト**：デバイス別最適化の検証

### 統合テスト
1. **PitchDetector統合**：既存APIとの互換性
2. **VoiceRangeTester統合**：音域テスト機能との連携
3. **実機テスト**：iPhone・iPad実機での動作確認

## 📂 ファイル構成

```
/js/audio-detection-component.js - AudioDetectionComponent本体
/test-audio-detection-component.html - 単体テスト用ページ
/AudioDetectionComponent-Documentation.md - 本設計書
```

## 🚀 実装フェーズ

### Phase 1：基本機能実装
- [ ] AudioDetectionComponent基本クラス
- [ ] デバイス検出ロジック
- [ ] UI自動更新エンジン

### Phase 2：PitchPro統合
- [ ] PitchDetectorラッパー実装
- [ ] エラーハンドリング統合
- [ ] デバイス最適化設定適用

### Phase 3：テスト・検証
- [ ] 単体テストページ作成
- [ ] 既存ページとの統合テスト
- [ ] 実機テスト（iPhone・iPad）

### Phase 4：本番統合
- [ ] preparation.html統合
- [ ] training.html統合
- [ ] AudioDisplayUtility置き換え

## 🔍 期待効果

### コード削減効果
- **AudioDisplayUtility不要**：300行のユーティリティクラス削除
- **重複UI更新コード削除**：各ページ50-100行の重複削除
- **PitchDetector直接操作削除**：複雑な初期化コード簡略化

### 保守性向上
- **UI更新の統一**：全ページで一貫したUI動作
- **設定の集約**：デバイス最適化設定の一元管理
- **エラー処理の統一**：包括的なエラーハンドリング

### 開発効率向上
- **シンプルAPI**：3行でPitchPro統合完了
- **即座のUI反映**：手動UI更新コード不要
- **実機最適化内蔵**：デバイス別調整作業不要

---

**作成日**: 2025年1月7日  
**バージョン**: v1.0.0  
**作成者**: Claude Code Assistant  
**プロジェクト**: 8va相対音感トレーニングアプリ