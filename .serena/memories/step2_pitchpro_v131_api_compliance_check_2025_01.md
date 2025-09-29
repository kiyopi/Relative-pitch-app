# Step2 PitchPro v1.3.1 API準拠チェックリスト

## 📅 作成日時
2025年1月29日

## 🎯 目的
Step2（preparation-step2.html）の実装がPitchPro v1.3.1の公式APIに準拠しているか検証

## 📋 公式メソッド一覧との照合結果

### **✅ 正しく実装済みのメソッド**

#### **AudioManager系（マイク制御）**
- ✅ `microphoneController.state` - マイク状態確認プロパティ
- ✅ `microphoneController.reset()` - FAQ推奨の完全リセットメソッド

#### **UI制御系**
- ✅ `updateSelectors()` - UI要素セレクター更新
- ✅ `resetDisplayElements()` - UI表示要素リセット（追加済み）
- ✅ `setCallbacks()` - コールバック設定（追加済み）

### **❌ 未実装の重要メソッド**

#### **音声検出系（最重要）**
- ❌ `startDetection()` - 音声検出開始（音域テスト開始時に必須）
- ❌ `stopDetection()` - 音声検出停止（テスト終了時に必要）

### **⚠️ 実装上の問題点**

#### **1. 音声検出開始の欠如**
```javascript
// 問題: ボタンクリック時にstartDetection()が呼ばれない
beginBtn.addEventListener('click', async () => {
    // window.startVoiceRangeTest()を呼ぶだけ
    // audioDetector.startDetection()が必要
});
```

#### **2. グローバルインスタンスの管理**
```javascript
// 現状: Step2内でローカル変数
const audioDetector = await window.globalAudioManager.getInstance();

// 問題: voice-range-test-demo.jsからアクセスできない
// 解決: window.globalAudioDetectorとして公開が必要
```

## 📊 PitchPro v1.3.1 必須実装パターン

### **正しい初期化フロー**
```javascript
// 1. インスタンス取得
const audioDetector = await window.globalAudioManager.getInstance();

// 2. マイク状態確認
const micState = audioDetector.microphoneController.state;

// 3. リセット実行（FAQ推奨）
await audioDetector.microphoneController.reset();

// 4. UI要素リセット
await audioDetector.resetDisplayElements();

// 5. セレクター設定
audioDetector.updateSelectors({...});

// 6. コールバック設定
audioDetector.setCallbacks({...});

// 7. 検出開始
await audioDetector.startDetection();
```

## 🔧 修正が必要な箇所

### **1. グローバルインスタンス公開**
```javascript
// Step2初期化後に追加必要
window.globalAudioDetector = audioDetector;
```

### **2. ボタンクリック処理の修正**
```javascript
beginBtn.addEventListener('click', async () => {
    // 音声検出を開始
    if (audioDetector.startDetection) {
        await audioDetector.startDetection();
    }
    
    // その後音域テスト開始
    if (typeof window.startVoiceRangeTest === 'function') {
        await window.startVoiceRangeTest();
    }
});
```

### **3. voice-range-test-demo.js側の対応**
```javascript
// グローバルインスタンスを使用
async function startVoiceRangeTest() {
    const audioDetector = window.globalAudioDetector;
    if (!audioDetector) {
        console.error('AudioDetectorが見つかりません');
        return;
    }
    
    // 既に初期化済みのインスタンスを使用
    // 音域テスト処理...
}
```

## 📈 実装完了度

### **現在の状態**
- API準拠度: 60%
- 必須メソッド実装: 5/7
- 動作可能性: 低（音声検出開始が欠如）

### **必要な追加実装**
1. `startDetection()` 呼び出し
2. `window.globalAudioDetector` 公開
3. voice-range-test-demo.js連携修正

## 🎯 次のステップ

### **優先度高**
1. グローバルインスタンス公開実装
2. startDetection()呼び出し追加
3. voice-range-test-demo.js側の修正

### **優先度中**
1. stopDetection()の適切な配置
2. エラーハンドリング強化
3. 状態管理の最適化

## 🏷️ タグ
`#Step2実装` `#PitchPro` `#v1.3.1準拠` `#API照合` `#修正必要`