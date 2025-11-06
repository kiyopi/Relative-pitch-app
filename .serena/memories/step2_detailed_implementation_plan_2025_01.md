# Step2詳細実装計画 - 3つのPhase戦略

## 📋 Phase 1: Step1遷移ロジック改善

### 1.1 DataManager活用による安全な状態保存
```javascript
// preparation-step1.html内に追加する関数
async function goToStep2(skipRangeTest = false) {
    console.log('🚀 Step2への安全な遷移を開始');
    
    try {
        // 1. PitchProクリーンアップ
        const audioDetector = await window.globalAudioManager.getInstance();
        if (audioDetector && audioDetector.microphoneController) {
            await audioDetector.microphoneController.reset();
            console.log('✅ PitchPro状態リセット完了');
        }
        
        // 2. DataManagerに状態保存
        const sessionData = {
            step1Completed: true,
            micPermissionGranted: true,
            completedAt: new Date().toISOString(),
            skipRangeTest: skipRangeTest,
            lastCompletedStep: 1
        };
        
        DataManager.saveToStorage('preparationProgress', sessionData);
        console.log('💾 Step1完了状態保存完了');
        
        // 3. 安全な遷移実行
        window.location.href = 'preparation-step2.html';
        
    } catch (error) {
        console.error('❌ Step2遷移処理エラー:', error);
        alert('次のページへの移動中にエラーが発生しました。');
    }
}
```

### 1.2 既存ボタンイベントの修正
```javascript
// 音域テスト開始ボタン
startRangeTestBtn.addEventListener('click', () => {
    goToStep2(false); // 音域テストを実行
});

// 音域テストスキップボタン  
skipRangeTestBtn.addEventListener('click', () => {
    goToStep2(true); // 音域テストをスキップ
});
```

## 📋 Phase 2: Step2受け入れロジック実装

### 2.1 Step1完了状態の検証
```javascript
// preparation-step2.html のDOMContentLoaded内
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // 1. Step1完了状態確認
        const progressData = DataManager.getFromStorage('preparationProgress');
        
        if (!progressData || !progressData.step1Completed) {
            console.warn('⚠️ Step1未完了: Step1にリダイレクト');
            showErrorAndRedirect('準備が完了していません', 'preparation-step1.html');
            return;
        }
        
        console.log('✅ Step1完了確認済み:', progressData);
        
        // 2. Step2専用初期化実行
        await initializeStep2(progressData);
        
    } catch (error) {
        console.error('❌ Step2初期化エラー:', error);
        showErrorAndRedirect('初期化に失敗しました', 'preparation-step1.html');
    }
});
```

### 2.2 Step1確立パターンの適用
```javascript
async function initializeStep2(progressData) {
    // Step1で確立した成功パターンを使用
    const audioDetector = await window.globalAudioManager.getInstance();
    
    // Step2用UIセレクター設定
    if (audioDetector.updateSelectors) {
        audioDetector.updateSelectors({
            volumeBarSelector: '#range-test-volume-bar',
            volumeTextSelector: '#range-test-volume-text',
            frequencySelector: '#range-test-frequency-value'
        });
    }
    
    // 音域テスト用コールバック設定
    audioDetector.setCallbacks({
        onPitchUpdate: (result) => {
            handleRangePitchUpdate(result);
        }
    });
    
    // UI状態を「準備完了」に更新
    updateStep2UI('ready');
    
    console.log('✅ Step2初期化完了');
}
```

## 📋 Phase 3: Step2-audio-handler完全書き換え

### 3.1 既存voice-range-test-demo.js機能の統合
```javascript
// 新しいStep2専用ハンドラー（簡素化版）
class Step2Handler {
    constructor() {
        this.audioDetector = null;
        this.isRangeTesting = false;
        this.rangeData = {
            frequencies: [],
            lowestFreq: null,
            highestFreq: null
        };
    }
    
    async startRangeTest() {
        // Step1確立パターンを使用
        this.audioDetector = await window.globalAudioManager.getInstance();
        
        // 既存のstartVoiceRangeTest()機能を活用
        if (typeof window.startVoiceRangeTest === 'function') {
            await window.startVoiceRangeTest();
        } else {
            // フォールバック: 独自実装
            await this.fallbackRangeTest();
        }
    }
}
```

### 3.2 古いAPI呼び出しの完全削除
```javascript
// ❌ 削除対象（存在しないメソッド）
// await this.audioManager.initialize();
// await this.audioManager.connectToPage();
// this.audioManager.setPageCallbacks();

// ✅ Step1確立パターンで置き換え
const audioDetector = await window.globalAudioManager.getInstance();
audioDetector.updateSelectors(selectors);
audioDetector.setCallbacks(callbacks);
await audioDetector.startDetection();
```

## 🔄 実装順序と検証方法

### 段階的実装アプローチ
1. **Phase 1実装 → Step1単体テスト**
   - 遷移時のDataManager保存確認
   - PitchProリセット動作確認

2. **Phase 2実装 → Step1→Step2遷移テスト**
   - Step1からStep2への正常遷移確認
   - Step2の状態検証動作確認

3. **Phase 3実装 → Step2音域テスト機能テスト**
   - 音域テスト実行確認
   - 結果保存・表示確認

## 🎯 重要な設計原則

### Step1確立パターンの厳格な適用
- `window.globalAudioManager.getInstance()` のみ使用
- ページ側での完全制御
- 責務分離アーキテクチャの維持

### DataManager活用による堅牢な状態管理
- localStorage直接操作の廃止
- セッションデータによる安全な引き継ぎ
- 自動バージョン管理・有効期限管理

### 既存機能の最大限活用
- voice-range-test-demo.jsの`startVoiceRangeTest()`活用
- 重複コードの排除
- 実証済み機能の再利用

## 📝 次の実装ターゲット

### 優先度 High
1. Phase 1の実装（Step1遷移ロジック改善）
2. Phase 1の動作確認・検証
3. Phase 2の詳細設計

### 優先度 Medium
1. Phase 2の実装
2. Phase 3の詳細設計
3. エラーハンドリングの強化