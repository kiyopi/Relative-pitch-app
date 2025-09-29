# DataManagerを活用した安全なページ遷移設計

## 📅 作成日時
2025年1月29日

## 🎯 設計思想：責務の明確化

### **Step1 (preparation-step1.html)の責務**
- ユーザーが「音域テストに進む準備ができた」という意思表示をするところまで
- PitchProインスタンスのリセット・状態保存
- DataManagerへの完了状態記録

### **Step2 (preparation-step2.html)の責務**
- 遷移してきたユーザーを迎え入れ、音域テストの実行に集中
- Step1完了状態の確認
- 既存PitchProインスタンスの再利用

## 🔧 実装要件

### **Step1での遷移ロジック**
```javascript
async function goToNextStep(nextPageUrl) {
    // 1. PitchProインスタンス取得とリセット
    const audioDetector = await window.globalAudioManager.getInstance();
    if (audioDetector && audioDetector.microphoneController) {
        audioDetector.microphoneController.reset();
    }
    
    // 2. DataManagerに完了状態保存
    DataManager.saveSessionData('preparationStep1Completed', true);
    DataManager.saveSessionData('lastCompletedStep', 1);
    
    // 3. ページ遷移
    window.location.href = nextPageUrl;
}
```

### **Step2での状態確認ロジック**
```javascript
document.addEventListener('DOMContentLoaded', async () => {
    // 1. Step1完了状態確認
    const isStep1Completed = DataManager.getSessionData('preparationStep1Completed');
    
    if (!isStep1Completed) {
        // Step1未完了時の処理・リダイレクト
        return;
    }
    
    // 2. 音域テスト初期化
    const audioDetector = await window.globalAudioManager.getInstance();
    await audioDetector.updateSelectors({
        volumeBarSelector: '#range-test-volume-bar'
    });
    
    // 3. ボタン有効化・イベント設定
});
```

## 🚨 重要な問題：マイク許可ダイアログの再表示

### **現在の問題**
- ページ遷移時にJavaScriptの実行環境がリセット
- `window.globalAudioManager`が消失
- Step2で新規PitchProインスタンス作成→マイク再許可が必要

### **根本原因**
- PitchProインスタンス自体はDataManagerに保存されていない
- ページ遷移でメモリ上のインスタンスが消失
- 既存のマイクストリームが失われる

## 💡 解決方針

### **Option 1: PitchPro状態情報のDataManager保存**
```javascript
// Step1でマイク許可状態をDataManagerに保存
DataManager.saveSessionData('microphoneGranted', true);
DataManager.saveSessionData('pitchProInitialized', true);

// Step2で状態確認後、必要に応じて新規作成
const micGranted = DataManager.getSessionData('microphoneGranted');
if (micGranted) {
    // マイク許可済みとして処理
}
```

### **Option 2: マイクストリーム再利用設計**
- Step1でマイクストリームのメタデータ保存
- Step2で既存許可を前提とした初期化
- 失敗時のみ再許可フロー

## 🎯 実装優先度

1. **高優先**: DataManagerを使った状態確認の完全実装
2. **中優先**: マイク許可状態の引き継ぎメカニズム
3. **低優先**: エラー時のフォールバック処理

## 📋 現在の実装状況

### **完了済み**
- DataManagerによる基本的な状態保存・読み取り
- Step1→Step2の基本的な遷移ロジック

### **未完了・要修正**
- PitchProインスタンスの適切な引き継ぎ
- マイク許可ダイアログの重複表示防止
- エラー時の安全なフォールバック

## 🧠 設計上の重要な洞察

### **ページ遷移の本質的課題**
- JavaScriptの実行環境リセットは避けられない
- オブジェインスタンス自体の永続化は困難
- 状態情報の保存・復元によるアプローチが現実的

### **DataManagerの活用価値**
- localStorage直接操作より安全
- 抽象化された層による管理の容易さ
- 状態の明確化と予期しないアクセスの防止

## 🏷️ タグ
`#DataManager` `#ページ遷移` `#状態管理` `#PitchPro統合` `#マイク許可`