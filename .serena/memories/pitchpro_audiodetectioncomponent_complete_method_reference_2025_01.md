# PitchPro AudioDetectionComponent 完全メソッドリファレンス

## 📋 9つの主要メソッド完全一覧

| メソッド | 機能 | 使用例 | 重要度 |
|---------|------|--------|--------|
| ✅ `initialize()` | コンポーネント初期化 | `await audioDetector.initialize()` | 🔴 必須 |
| ✅ `startDetection()` | 音声検出開始 | `audioDetector.startDetection()` | 🔴 必須 |
| ✅ `stopDetection()` | 音声検出停止 | `audioDetector.stopDetection()` | 🔴 必須 |
| ✅ `destroy()` | リソース完全破棄 | `audioDetector.destroy()` | 🔴 必須 |
| ✅ `updateSelectors()` | UI要素セレクター変更 | `audioDetector.updateSelectors({...})` | 🟠 重要 |
| ✅ `setCallbacks()` | イベントコールバック設定 | `audioDetector.setCallbacks({...})` | 🟠 重要 |
| ✅ `updateUI()` | 手動UI更新 | `audioDetector.updateUI(result)` | 🟡 任意 |
| ✅ `getStatus()` | 現在状態取得 | `const status = audioDetector.getStatus()` | 🟡 任意 |
| ✅ `resetRecoveryAttempts()` | エラー回復処理リセット | `audioDetector.resetRecoveryAttempts()` | 🟡 任意 |

## 🔴 必須メソッド（ライフサイクル管理）

### 1. initialize()
```javascript
// 基本的な初期化
await audioDetector.initialize();

// エラーハンドリング付き
try {
    await audioDetector.initialize();
    console.log('✅ 初期化成功');
} catch (error) {
    console.error('❌ 初期化失敗:', error);
}
```

### 2. startDetection()
```javascript
// 音声検出開始
audioDetector.startDetection();

// コールバック設定後に開始（推奨）
audioDetector.setCallbacks({
    onPitchUpdate: (result) => { /* 処理 */ }
});
audioDetector.startDetection();
```

### 3. stopDetection()
```javascript
// 音声検出停止
audioDetector.stopDetection();

// 状態確認付き停止
if (audioDetector.getStatus().isDetecting) {
    audioDetector.stopDetection();
    console.log('🛑 音声検出停止完了');
}
```

### 4. destroy()
```javascript
// 基本的な破棄
audioDetector.destroy();

// 完全なクリーンアップ（推奨）
audioDetector.stopDetection();
audioDetector.destroy();
audioDetector = null;
```

## 🟠 重要メソッド（動的制御）

### 5. updateSelectors()
```javascript
// UI要素の動的切り替え
audioDetector.updateSelectors({
    volumeBarSelector: '#range-test-volume-bar',
    volumeTextSelector: '#range-test-volume-text',
    frequencySelector: '#range-test-frequency-value',
    noteSelector: '#range-test-note-display'
});

// セクション切り替え時の使用例
// マイクテスト → 音域テスト
audioDetector.updateSelectors({
    volumeBarSelector: '#range-test-volume-bar',
    frequencySelector: '#range-test-frequency-value'
});
```

### 6. setCallbacks()
```javascript
// 基本的なコールバック設定
audioDetector.setCallbacks({
    onPitchUpdate: (result) => {
        console.log('周波数:', result.frequency);
        console.log('音量:', result.volume);
        console.log('音名:', result.note);
        console.log('明瞭度:', result.clarity);
    },
    onError: (error) => {
        console.error('検出エラー:', error);
    }
});

// モード別コールバック動的変更
// マイクテストモード
audioDetector.setCallbacks({
    onPitchUpdate: handleMicTestUpdate,
    onError: handleMicTestError
});

// 音域テストモード
audioDetector.setCallbacks({
    onPitchUpdate: handleRangeTestUpdate,
    onError: handleRangeTestError
});
```

## 🟡 任意メソッド（高度な制御）

### 7. updateUI()
```javascript
// 手動UI更新（特殊用途）
const result = {
    frequency: 261.6,
    note: 'C4',
    volume: 0.5,
    clarity: 0.8
};
audioDetector.updateUI(result);
```

### 8. getStatus()
```javascript
// 現在状態の取得
const status = audioDetector.getStatus();
console.log('検出中:', status.isDetecting);
console.log('初期化済み:', status.isInitialized);
console.log('エラー状態:', status.hasError);

// 状態に基づく条件分岐
if (status.isDetecting) {
    audioDetector.stopDetection();
}
if (status.hasError) {
    audioDetector.resetRecoveryAttempts();
}
```

### 9. resetRecoveryAttempts()
```javascript
// エラー回復リセット
audioDetector.resetRecoveryAttempts();

// エラー発生時の回復処理
audioDetector.setCallbacks({
    onError: (error) => {
        console.error('エラー発生:', error);
        audioDetector.resetRecoveryAttempts();
        // 再試行処理
    }
});
```

## 🎯 実践的な使用パターン

### パターンA: マイクテスト（Step1）
```javascript
// 1. 初期化
const audioDetector = new AudioDetectionComponent({
    volumeBarSelector: '#volume-progress',
    volumeTextSelector: '#volume-value',
    frequencySelector: '#frequency-value'
});

// 2. 初期化とコールバック設定
await audioDetector.initialize();
audioDetector.setCallbacks({
    onPitchUpdate: handleMicTestUpdate
});

// 3. 検出開始
audioDetector.startDetection();

// 4. 成功時の処理
function onMicTestSuccess() {
    audioDetector.stopDetection();
    audioDetector.resetDisplayElements(); // ※存在するかは要確認
}
```

### パターンB: 音域テスト（Step2）への切り替え
```javascript
// 1. UI要素の切り替え
audioDetector.updateSelectors({
    volumeBarSelector: '#range-test-volume-bar',
    frequencySelector: '#range-test-frequency-value'
});

// 2. コールバックの切り替え
audioDetector.setCallbacks({
    onPitchUpdate: handleRangeTestUpdate
});

// 3. 検出再開
audioDetector.startDetection();
```

### パターンC: 完全なクリーンアップ
```javascript
// ページ離脱時
window.addEventListener('beforeunload', () => {
    if (audioDetector) {
        audioDetector.stopDetection();
        audioDetector.destroy();
        audioDetector = null;
    }
});
```

## ⚠️ 重要な注意点

### 推奨使用順序
1. **new AudioDetectionComponent()** - インスタンス作成
2. **initialize()** - 初期化
3. **setCallbacks()** - コールバック設定
4. **startDetection()** - 検出開始
5. **updateSelectors()** - UI切り替え（必要時）
6. **stopDetection()** - 検出停止
7. **destroy()** - リソース解放

### 禁止パターン
- ❌ initialize()前のstartDetection()
- ❌ stopDetection()なしでのdestroy()
- ❌ 複数インスタンスの同時使用

### 推奨パターン
- ✅ 単一インスタンスでのupdateSelectors()使用
- ✅ 適切なエラーハンドリング
- ✅ 確実なリソース解放

## 📅 分析完了日
2025年1月28日

## 📝 次のステップ
1. resetDisplayElements()メソッドの存在確認
2. 実際のコードでの適切な使用方法実装
3. エラーハンドリングの強化