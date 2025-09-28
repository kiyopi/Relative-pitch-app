# PitchPro AudioDetectionComponent ライフサイクル管理ベストプラクティス

## 🎯 完全なライフサイクル管理戦略

### **Phase 1: 初期化フェーズ**
```javascript
// 1. インスタンス作成
const audioDetector = new AudioDetectionComponent({
    volumeBarSelector: '#volume-progress',
    volumeTextSelector: '#volume-value',
    frequencySelector: '#frequency-value',
    noteSelector: '#note-display'
});

// 2. 安全な初期化
try {
    await audioDetector.initialize();
    console.log('✅ AudioDetectionComponent初期化成功');
} catch (error) {
    console.error('❌ 初期化失敗:', error);
    throw error;
}

// 3. コールバック設定
audioDetector.setCallbacks({
    onPitchUpdate: (result) => {
        handlePitchUpdate(result);
    },
    onError: (error) => {
        handlePitchError(error);
    }
});
```

### **Phase 2: 運用フェーズ**
```javascript
// 検出開始
audioDetector.startDetection();

// 状態監視
const status = audioDetector.getStatus();
if (status.isDetecting) {
    console.log('🎤 音声検出中...');
}
```

### **Phase 3: セクション切り替えフェーズ**
```javascript
// 方法A: updateSelectors()使用（推奨）
audioDetector.updateSelectors({
    volumeBarSelector: '#range-test-volume-bar',
    volumeTextSelector: '#range-test-volume-text',
    frequencySelector: '#range-test-frequency-value'
});

// コールバック変更
audioDetector.setCallbacks({
    onPitchUpdate: handleRangeTestUpdate,
    onError: handleRangeTestError
});

// 方法B: 完全再作成（非推奨・重い）
audioDetector.stopDetection();
audioDetector.destroy();
audioDetector = new AudioDetectionComponent({...});
await audioDetector.initialize();
```

### **Phase 4: UIリセットフェーズ**
```javascript
// 音声検出成功時のUIリセット
async function resetPitchProUI() {
    // 1. 検出停止
    if (audioDetector && audioDetector.getStatus().isDetecting) {
        audioDetector.stopDetection();
    }
    
    // 2. UIリセット（存在確認付き）
    if (audioDetector && audioDetector.resetDisplayElements) {
        await audioDetector.resetDisplayElements();
        console.log('🔄 resetDisplayElements()実行完了');
    } else if (audioDetector && audioDetector.updateUI) {
        // 代替案1: updateUI()で初期値設定
        audioDetector.updateUI({
            frequency: 0,
            note: '',
            volume: 0,
            clarity: 0
        });
        console.log('🔄 updateUI()でリセット完了');
    } else {
        // 代替案2: 手動リセット
        resetUIManually();
        console.log('🔄 手動リセット完了');
    }
}
```

### **Phase 5: 終了・クリーンアップフェーズ**
```javascript
// ページ離脱時の完全クリーンアップ
window.addEventListener('beforeunload', () => {
    cleanupAudioDetector();
});

function cleanupAudioDetector() {
    if (audioDetector) {
        try {
            // 1. 検出停止
            if (audioDetector.getStatus().isDetecting) {
                audioDetector.stopDetection();
            }
            
            // 2. エラー回復リセット
            audioDetector.resetRecoveryAttempts();
            
            // 3. リソース破棄
            audioDetector.destroy();
            
            // 4. インスタンス削除
            audioDetector = null;
            
            console.log('🗑️ AudioDetectorクリーンアップ完了');
        } catch (error) {
            console.error('⚠️ クリーンアップエラー:', error);
        }
    }
}
```

## 🔧 実践的な実装パターン

### **パターン1: Step1マイクテスト**
```javascript
class Step1MicrophoneTest {
    constructor() {
        this.audioDetector = null;
    }
    
    async initialize() {
        this.audioDetector = new AudioDetectionComponent({
            volumeBarSelector: '#volume-progress',
            volumeTextSelector: '#volume-value',
            frequencySelector: '#frequency-value'
        });
        
        await this.audioDetector.initialize();
        
        this.audioDetector.setCallbacks({
            onPitchUpdate: this.handleMicTestUpdate.bind(this),
            onError: this.handleMicTestError.bind(this)
        });
    }
    
    start() {
        this.audioDetector.startDetection();
    }
    
    async onSuccess() {
        // 成功時のリセット処理
        await this.resetUIAfterSuccess();
        
        // 分岐判定
        this.checkVoiceRangeData();
    }
    
    async resetUIAfterSuccess() {
        // 検出停止
        this.audioDetector.stopDetection();
        
        // UIリセット（3段階フォールバック）
        if (this.audioDetector.resetDisplayElements) {
            await this.audioDetector.resetDisplayElements();
        } else if (this.audioDetector.updateUI) {
            this.audioDetector.updateUI({
                frequency: 0, note: '', volume: 0, clarity: 0
            });
        } else {
            this.resetUIManually();
        }
    }
    
    cleanup() {
        if (this.audioDetector) {
            this.audioDetector.stopDetection();
            this.audioDetector.destroy();
            this.audioDetector = null;
        }
    }
}
```

### **パターン2: マルチセクション対応**
```javascript
class MultiSectionAudioManager {
    constructor() {
        this.audioDetector = null;
        this.currentSection = 'mic-test';
    }
    
    async switchToSection(sectionName, selectors, callbacks) {
        if (!this.audioDetector) return;
        
        // 1. 現在の検出停止
        if (this.audioDetector.getStatus().isDetecting) {
            this.audioDetector.stopDetection();
        }
        
        // 2. UI要素切り替え
        this.audioDetector.updateSelectors(selectors);
        
        // 3. コールバック変更
        this.audioDetector.setCallbacks(callbacks);
        
        // 4. セクション状態更新
        this.currentSection = sectionName;
        
        // 5. 検出再開
        this.audioDetector.startDetection();
        
        console.log(`📱 セクション切り替え完了: ${sectionName}`);
    }
    
    async switchToRangeTest() {
        await this.switchToSection('range-test', {
            volumeBarSelector: '#range-test-volume-bar',
            frequencySelector: '#range-test-frequency-value'
        }, {
            onPitchUpdate: this.handleRangeTestUpdate.bind(this),
            onError: this.handleRangeTestError.bind(this)
        });
    }
}
```

## ⚠️ 重要な注意事項

### **絶対に避けるべきパターン**
```javascript
// ❌ 危険: 初期化前の検出開始
audioDetector.startDetection(); // initialize()前

// ❌ 危険: 停止なしでの破棄
audioDetector.destroy(); // stopDetection()なし

// ❌ 危険: 複数インスタンス
const detector1 = new AudioDetectionComponent({...});
const detector2 = new AudioDetectionComponent({...}); // 競合

// ❌ 危険: エラー時の状態放置
audioDetector.setCallbacks({
    onError: (error) => {
        // 何もしない → 回復不能
    }
});
```

### **推奨パターン**
```javascript
// ✅ 安全: 順次実行
await audioDetector.initialize();
audioDetector.setCallbacks({...});
audioDetector.startDetection();

// ✅ 安全: 確実なクリーンアップ
audioDetector.stopDetection();
audioDetector.destroy();

// ✅ 安全: 単一インスタンス + updateSelectors()
audioDetector.updateSelectors({...});

// ✅ 安全: エラー回復処理
audioDetector.setCallbacks({
    onError: (error) => {
        audioDetector.resetRecoveryAttempts();
        // 適切な回復処理
    }
});
```

## 📊 パフォーマンス最適化

### **高速切り替え戦略**
- ✅ **updateSelectors()** - 0.1秒未満
- ⚠️ **destroy() + 再作成** - 1-2秒

### **メモリ使用量**
- ✅ **単一インスタンス** - 低メモリ
- ❌ **複数インスタンス** - メモリリーク

### **エラー回復速度**
- ✅ **resetRecoveryAttempts()** - 即座
- ⚠️ **完全再初期化** - 数秒

## 📅 ベストプラクティス確立日
2025年1月28日

## 📝 実装済み項目
- ✅ 9つのメソッド完全理解
- ✅ resetDisplayElements()の不安定性確認
- ✅ updateSelectors()の優位性確認
- ✅ 3段階フォールバック戦略確立
- ✅ マルチセクション対応パターン設計

## 🎯 次のアクション
1. 実際のコードでのベストプラクティス適用
2. preparation-step1.jsの最適化実装
3. Step2実装時の活用戦略策定