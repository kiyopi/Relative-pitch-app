# Step1 詳細フロー設計

## 🎯 Step1 (preparation-step1.html) 具体的実装フロー

### 📋 基本前提
- ベースファイル: test-pitchpro-cycle.html
- 既存UI・動作を最大限維持
- 最小限の変更で分岐処理を実現

## 🌊 詳細フロー図

### **Phase 1: ページ初期化**
```javascript
window.addEventListener('DOMContentLoaded', () => {
  // 1. Lucide Icons初期化
  lucide.createIcons();
  
  // 2. localStorage状態確認
  checkExistingData();
  
  // 3. UI初期状態設定
  initializeUI();
});

function checkExistingData() {
  const micPermission = localStorage.getItem('micPermissionGranted');
  const audioTest = localStorage.getItem('audioTestCompleted');
  const voiceRange = localStorage.getItem('voiceRangeData');
  
  console.log('既存データ確認:', { micPermission, audioTest, voiceRange });
  
  // デバッグ用・開発時の状態確認
  return { micPermission, audioTest, voiceRange };
}
```

### **Phase 2: マイク許可フロー**
```javascript
// 既存の動作を完全維持
document.getElementById('request-mic-btn').addEventListener('click', async () => {
  try {
    // 既存のマイク許可処理（変更なし）
    const stream = await navigator.mediaDevices.getUserMedia({...});
    
    // localStorage保存（新規追加）
    localStorage.setItem('micPermissionGranted', 'true');
    localStorage.setItem('micPermissionTimestamp', new Date().toISOString());
    
    // 既存のUI更新処理（変更なし）
    updateStepIndicators();
    showAudioTestSection();
    
    // 既存のPitchPro初期化（変更なし）
    await initializePitchPro();
    
  } catch (error) {
    // 既存のエラーハンドリング（変更なし）
  }
});
```

### **Phase 3: 音声テスト実行フロー**
```javascript
// 既存の音声テスト処理を完全維持
async function startAudioTest() {
  // 既存のPitchPro AudioDetectionComponent使用（変更なし）
  // 音量バー・周波数検出の既存動作（変更なし）
}

// 音声検出成功時の処理
function onAudioDetectionSuccess() {
  // localStorage保存（新規追加）
  localStorage.setItem('audioTestCompleted', 'true');
  localStorage.setItem('audioTestTimestamp', new Date().toISOString());
  
  // ⭐ ここで分岐処理実行
  handleAudioTestCompletion();
}
```

### **Phase 4: 分岐処理（核心部分）**
```javascript
function handleAudioTestCompletion() {
  // 音声テスト成功メッセージ表示（既存）
  showDetectionSuccess();
  
  // ⭐ 音域データ存在確認
  const voiceRangeData = localStorage.getItem('voiceRangeData');
  
  if (voiceRangeData) {
    // 分岐B: 音域データ保存済み
    handleExistingRangeData(JSON.parse(voiceRangeData));
  } else {
    // 分岐A: 音域データなし
    handleNoRangeData();
  }
}

// 分岐A: 音域データなし
function handleNoRangeData() {
  // 既存の「音域テストを開始」ボタンを表示
  const startRangeBtn = document.getElementById('start-range-test-btn');
  startRangeBtn.classList.remove('hidden');
  
  // ボタンテキスト調整
  startRangeBtn.querySelector('span').textContent = 'Step2: 音域テストへ進む';
  
  // クリックイベント: Step2遷移
  startRangeBtn.onclick = () => {
    // Step1完了の最終確認
    ensureStep1Completion();
    
    // Step2へ遷移
    window.location.href = 'preparation-step2.html';
  };
}

// 分岐B: 音域データ保存済み
function handleExistingRangeData(rangeData) {
  // 既存の音域データ表示セクション使用
  const rangeSavedDisplay = document.getElementById('range-saved-display');
  
  // データ表示更新
  updateRangeDataDisplay(rangeData);
  
  // セクション表示
  rangeSavedDisplay.classList.remove('hidden');
  
  // 既存のボタンイベント設定
  setupRangeDataButtons();
}

function updateRangeDataDisplay(rangeData) {
  // 既存のDOM要素に音域データ設定
  document.getElementById('saved-range').textContent = rangeData.range || `${rangeData.lowNote} - ${rangeData.highNote}`;
  document.getElementById('saved-octaves').textContent = `${rangeData.octaves}オクターブ`;
  document.getElementById('saved-date').textContent = new Date(rangeData.timestamp).toLocaleDateString('ja-JP');
}

function setupRangeDataButtons() {
  // 「音域を再測定」ボタン
  document.getElementById('retest-range-btn').onclick = () => {
    // 既存データ削除（再測定のため）
    localStorage.removeItem('voiceRangeData');
    
    // Step2へ遷移
    window.location.href = 'preparation-step2.html';
  };
  
  // 「この結果でトレーニング開始」ボタン
  document.getElementById('skip-range-test-btn').onclick = () => {
    // 音域データ確認済みフラグ
    localStorage.setItem('rangeDataConfirmed', 'true');
    
    // トレーニング開始
    window.location.href = '../training.html';
  };
}
```

### **Phase 5: Step1完了処理**
```javascript
function ensureStep1Completion() {
  // Step1完了の最終確認
  const completionData = {
    micPermissionGranted: localStorage.getItem('micPermissionGranted'),
    audioTestCompleted: localStorage.getItem('audioTestCompleted'),
    step1CompletedAt: new Date().toISOString()
  };
  
  // Step1完了フラグ
  localStorage.setItem('step1Completed', 'true');
  localStorage.setItem('step1CompletionData', JSON.stringify(completionData));
  
  console.log('Step1完了:', completionData);
}
```

### **Phase 6: リソース解放（ページ離脱時）**
```javascript
// ページ離脱時のクリーンアップ
window.addEventListener('beforeunload', () => {
  // PitchProインスタンス解放
  if (window.audioDetector) {
    try {
      // PitchPro推奨の解放メソッド実行
      if (typeof window.audioDetector.destroy === 'function') {
        window.audioDetector.destroy();
      }
      if (typeof window.audioDetector.cleanup === 'function') {
        window.audioDetector.cleanup();
      }
      
      // インスタンス削除
      window.audioDetector = null;
      
      console.log('Step1: PitchProリソース解放完了');
    } catch (error) {
      console.error('リソース解放エラー:', error);
    }
  }
});
```

## 🎯 JavaScript実装構造

### **既存コード保持部分（変更なし）**
- マイク許可処理
- PitchPro初期化
- 音声テスト実行
- UI更新・アニメーション
- エラーハンドリング

### **新規追加部分**
- localStorage連携処理
- 分岐判定ロジック
- Step2遷移処理
- リソース解放処理

### **最小限変更部分**
- 音声テスト成功時のコールバック追加
- ボタンクリックイベントの調整

## 🧪 テスト項目

### **分岐A（音域データなし）テスト**
- [ ] 音声テスト完了 → 「Step2へ進む」ボタン表示
- [ ] ボタンクリック → preparation-step2.html遷移
- [ ] localStorage状態確認

### **分岐B（音域データあり）テスト**
- [ ] 音声テスト完了 → 音域データ表示
- [ ] 「再測定」クリック → Step2遷移
- [ ] 「トレーニング開始」クリック → training.html遷移

### **リソース管理テスト**
- [ ] ページ離脱時のPitchPro解放確認
- [ ] localStorage保存確認
- [ ] コンソールエラーなし確認

## 📋 実装優先順位

### **Step 1: 基本分岐処理**
1. handleAudioTestCompletion() 実装
2. 分岐A・B処理実装
3. localStorage連携実装

### **Step 2: UI調整**
1. ボタンテキスト調整
2. 表示/非表示制御
3. 既存アニメーション維持

### **Step 3: リソース管理**
1. beforeunload実装
2. クリーンアップ処理
3. エラーハンドリング

## 📅 設計完了日
2025年1月28日

## 📝 次のステップ
Step1分岐処理の実装開始