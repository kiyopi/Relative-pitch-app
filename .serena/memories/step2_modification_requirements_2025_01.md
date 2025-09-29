# Step2 修正要件・実装メモリー

## 📅 作成日時
2025年1月29日

## 🎯 Step2実装の核心的要件

### **最重要: Step1→Step2状態引き継ぎ**
- **問題の本質**: "step2の最重要要素でこれがなん度も失敗している"
- **Step1完了状態**: マイク許可済み・音声検出成功・PitchProインスタンス準備完了
- **Step2要件**: マイク許可ボタン削除・Step1状態を完全に引き継ぎ
- **危険**: 再度マイク許可フローを実行すること（これが失敗の原因）

## 🏗️ 実装した厳格状態検証システム

### **Triple State Validation（三重状態確認）**
```javascript
// 1. DataManager状態確認
const progressData = DataManager?.getFromStorage('preparationProgress');

// 2. PitchPro実際の状態確認  
const actualMicStatus = await audioDetector.isMicrophoneGranted?.() || false;

// 3. 状態整合性の厳格確認
if (!dataStep1 || !dataMicPermission || !realMicPermission) {
    throw new Error(`状態不整合検出`);
}
```

### **自動修復機能**
```javascript
// 状態不整合時の処理
async function handleStep2InitializationError(error) {
    // 1. 状態データクリア
    DataManager.saveToStorage('preparationProgress', null);
    
    // 2. エラー表示とStep1自動リダイレクト（3秒）
    setTimeout(() => {
        window.location.href = 'preparation-step1.html';
    }, 3000);
}
```

## 📁 ファイル統合完了

### **移動済みファイル**
- `/js/global-audio-manager.js` → `/Bolt/v2/pages/js/global-audio-manager.js`
- `/js/data-manager.js` → `/Bolt/v2/pages/js/data-manager.js`

### **準備済みファイル**
- `preparation-step1.html`: goToStep2()関数でDataManager統一・PitchPro状態保持
- `preparation-step2.html`: 厳格状態検証・自動修復機能・音域テスト統合

## 🔧 Phase2実装完了内容

### **1. 状態検証システム**
- DataManager・PitchPro・実際の状態の三重確認
- 不整合時の詳細ログ出力
- 自動的な状態クリアとStep1リダイレクト

### **2. Step2初期化システム**
```javascript
async function initializeStep2(progressData, audioDetector) {
    // UIセレクター設定（Step1確立パターン）
    if (audioDetector.updateSelectors) {
        audioDetector.updateSelectors({
            volumeBarSelector: '#range-test-volume-bar',
            volumeTextSelector: '#range-test-volume-text', 
            frequencySelector: '#range-test-frequency-value'
        });
    }
    
    // 音域テスト開始ボタン有効化
    const beginBtn = document.getElementById('begin-range-test-btn');
    beginBtn.disabled = false;
    
    // 既存のvoice-range-test-demo.js統合
    beginBtn.addEventListener('click', async () => {
        if (typeof window.startVoiceRangeTest === 'function') {
            await window.startVoiceRangeTest();
        }
    });
}
```

### **3. エラーハンドリング**
- 状態不整合の詳細診断
- ユーザーフレンドリーなエラー表示
- 確実なStep1復帰機能

## ⚠️ 設計上の重要ポイント

### **避けるべき危険な実装**
- ❌ Step2でのマイク許可ボタン表示
- ❌ Step2でのマイク許可フロー再実行
- ❌ PitchPro新規初期化（既存インスタンス破棄）
- ❌ localStorage直接操作（DataManager統一）

### **必須の安全な実装**
- ✅ Step1完了状態の厳格確認
- ✅ 既存PitchProインスタンス再利用
- ✅ updateSelectors()でUI要素切り替え
- ✅ DataManager統一状態管理

## 📋 次期フェーズ（Phase3）
- Step1→Step2遷移の統合テスト
- 実際のブラウザでの動作確認
- エラーシナリオの完全検証
- 音域テスト機能の完全統合

## 🧠 学んだ教訓
- **状態引き継ぎは複雑**: 単純なフラグ管理では不十分
- **三重確認の重要性**: データ・実際の状態・整合性すべて必要
- **自動修復の価値**: ユーザーが迷わない確実な復旧手段
- **段階的実装の効果**: 慎重な設計により過去の失敗を回避

## 🏷️ タグ
`#Step2実装` `#状態引き継ぎ` `#PitchPro統合` `#DataManager` `#エラー処理`