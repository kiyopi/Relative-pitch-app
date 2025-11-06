# 収録制御メソッド設計書

**作成日**: 2025年1月9日  
**目的**: 音域テスト収録開始・停止の統合制御システム  
**対象**: preparation-test.html の収録制御メソッド

---

## 🎯 設計方針

### **問題の整理**
- 現在：収録開始・停止の処理が分散している
- 課題：UI更新、アニメーション、状態管理が複数箇所に散在
- 解決：統合メソッドで処理を一元化し、保守しやすい構造に

### **設計原則**
1. **単一責任の原則** - 各メソッドは明確な役割を持つ
2. **状態管理の統一** - 収録状態を一元管理
3. **UI更新の集約** - アニメーション・表示更新を統合
4. **エラーハンドリング** - 異常時の安全な処理

---

## 🏗️ メソッド構造設計

### **主要メソッド**

```javascript
// 1. 収録制御の核心メソッド
startRecording(testType)    // 収録開始（低音・高音別）
stopRecording(reason)       // 収録停止（完了・エラー別）

// 2. UI状態管理メソッド
updateRecordingUI(state)    // UI状態の統合更新
updateMainStatus(message)   // メインステータス更新
updateSubInfo(message)      // サブ情報更新

// 3. アニメーション制御メソッド
startRecordingAnimation()   // 収録アニメーション開始
stopRecordingAnimation()    // 収録アニメーション停止
showSuccessAnimation()      // 成功アニメーション表示

// 4. 状態確認メソッド
isRecording()               // 収録状態確認
getCurrentTestPhase()       // 現在のテストフェーズ取得
```

---

## 📋 詳細メソッド仕様

### **1. startRecording(testType)**

#### **目的**
音域テスト（低音・高音）の収録を開始し、関連するUI・アニメーションを統合制御

#### **パラメータ**
- `testType`: 'low' | 'high' - テストの種類

#### **実装内容**
```javascript
/**
 * 収録開始の統合制御
 * @param {string} testType - 'low' | 'high'
 */
function startRecording(testType) {
    try {
        console.log(`🎤 収録開始: ${testType}音テスト`);
        
        // 1. 状態更新
        currentRecordingState = {
            isRecording: true,
            testType: testType,
            startTime: Date.now(),
            phase: 'waiting_for_voice'
        };
        
        // 2. UI更新
        updateRecordingUI('recording');
        updateMainStatus(testType === 'low' ? 'できるだけ低い声を出してください' : 'できるだけ高い声を出してください');
        updateSubInfo('声を検出すると3秒測定が始まります');
        
        // 3. アニメーション開始
        startRecordingAnimation();
        
        // 4. 音域テストバッジ初期化
        resetRangeTestBadge(testType);
        
        // 5. AudioDetection開始
        if (audioDetector) {
            audioDetector.startDetection();
        }
        
        // 6. VoiceRangeTester連携
        if (voiceRangeTester && testType === 'low') {
            voiceRangeTester.startLowTest();
        } else if (voiceRangeTester && testType === 'high') {
            voiceRangeTester.startHighTest();
        }
        
        console.log('✅ 収録開始完了');
        return true;
        
    } catch (error) {
        console.error('❌ 収録開始エラー:', error);
        handleRecordingError('start', error);
        return false;
    }
}
```

### **2. stopRecording(reason, data)**

#### **目的**
収録を停止し、結果に応じたUI更新・アニメーション制御を実行

#### **パラメータ**
- `reason`: 'completed' | 'cancelled' | 'error' - 停止理由
- `data`: Object - 結果データ（周波数、ノート等）

#### **実装内容**
```javascript
/**
 * 収録停止の統合制御
 * @param {string} reason - 停止理由
 * @param {Object} data - 結果データ
 */
function stopRecording(reason, data = null) {
    try {
        console.log(`🛑 収録停止: ${reason}`, data);
        
        // 1. 状態更新
        const previousState = { ...currentRecordingState };
        currentRecordingState.isRecording = false;
        currentRecordingState.stopTime = Date.now();
        currentRecordingState.stopReason = reason;
        
        // 2. AudioDetection停止
        if (audioDetector) {
            audioDetector.stopDetection();
        }
        
        // 3. 理由別処理
        switch (reason) {
            case 'completed':
                handleRecordingSuccess(previousState.testType, data);
                break;
            case 'cancelled':
                handleRecordingCancellation();
                break;
            case 'error':
                handleRecordingError('stop', data);
                break;
        }
        
        // 4. アニメーション停止
        stopRecordingAnimation();
        
        console.log('✅ 収録停止完了');
        return true;
        
    } catch (error) {
        console.error('❌ 収録停止エラー:', error);
        handleRecordingError('stop', error);
        return false;
    }
}
```

### **3. updateRecordingUI(state)**

#### **目的**
収録状態に応じたUI要素の統合更新

#### **実装内容**
```javascript
/**
 * 収録UI状態の統合更新
 * @param {string} state - 'standby' | 'recording' | 'measuring' | 'success' | 'error'
 */
function updateRecordingUI(state) {
    console.log(`🎨 UI状態更新: ${state}`);
    
    // 1. マイクアイコン更新
    updateMicIcon(state);
    
    // 2. 音域テストバッジ更新
    updateRangeTestBadgeState(state);
    
    // 3. 検出メーター表示制御
    updateDetectionMeters(state);
    
    // 4. ボタン状態更新
    updateButtonStates(state);
}

/**
 * マイクアイコン状態更新
 * @param {string} state - UI状態
 */
function updateMicIcon(state) {
    const micContainer = document.getElementById('mic-status-container');
    const micIcon = document.getElementById('mic-status-icon');
    
    if (!micContainer || !micIcon) return;
    
    // 既存クラスをクリア
    micContainer.className = 'mic-status-container';
    
    switch (state) {
        case 'standby':
            micContainer.classList.add('standby');
            // グラス背景 + 白アイコン
            break;
            
        case 'recording':
            micContainer.classList.add('recording');
            // 赤背景 + 赤アイコン + パルスアニメーション
            break;
            
        case 'measuring':
            micContainer.classList.add('measuring');
            // 青背景 + 青アイコン + 測定アニメーション
            break;
            
        case 'success':
            micContainer.classList.add('success');
            // 緑背景 + 緑アイコン
            break;
            
        case 'error':
            micContainer.classList.add('error');
            // 赤背景 + エラーアイコン
            break;
    }
}
```

### **4. アニメーション制御メソッド**

```javascript
/**
 * 収録アニメーション開始
 */
function startRecordingAnimation() {
    console.log('🎬 収録アニメーション開始');
    
    // マイクアイコンパルスアニメーション
    const micContainer = document.getElementById('mic-status-container');
    if (micContainer) {
        micContainer.classList.add('pulse-animation');
    }
    
    // 音域テストバッジ基本アニメーション
    const badge = document.querySelector('.voice-note-badge');
    if (badge) {
        badge.classList.add('recording-pulse');
    }
}

/**
 * 成功アニメーション表示
 * @param {string} testType - 'low' | 'high'
 * @param {Object} result - 測定結果
 */
function showSuccessAnimation(testType, result) {
    console.log('🎉 成功アニメーション表示');
    
    // 1. チェックアイコン表示
    showCheckMark();
    
    // 2. バウンスアニメーション
    const badge = document.querySelector('.voice-note-badge');
    if (badge) {
        badge.classList.add('success-bounce', 'success-background');
    }
    
    // 3. 成功メッセージ
    updateMainStatus(`${testType === 'low' ? '低音' : '高音'}測定完了`);
    updateSubInfo(`${result.note} - ${result.frequency.toFixed(1)}Hz`);
    
    // 4. アニメーション自動リセット（2秒後）
    setTimeout(() => {
        badge?.classList.remove('success-bounce');
    }, 2000);
}

/**
 * チェックマーク表示
 */
function showCheckMark() {
    const rangeIcon = document.getElementById('range-icon');
    const countdownDisplay = document.getElementById('countdown-display');
    
    if (rangeIcon && countdownDisplay) {
        // カウントダウンを非表示
        countdownDisplay.style.display = 'none';
        
        // チェックマークに変更
        rangeIcon.setAttribute('data-lucide', 'check');
        rangeIcon.style.display = 'block';
        
        // Lucideアイコン再描画
        lucide.createIcons();
    }
}
```

### **5. 状態管理システム**

```javascript
/**
 * 収録状態管理オブジェクト
 */
let currentRecordingState = {
    isRecording: false,
    testType: null,         // 'low' | 'high'
    phase: 'idle',          // 'idle' | 'waiting_for_voice' | 'measuring' | 'completed'
    startTime: null,
    stopTime: null,
    stopReason: null,
    measurementData: null
};

/**
 * 収録状態確認
 * @returns {boolean}
 */
function isRecording() {
    return currentRecordingState.isRecording;
}

/**
 * 現在のテストフェーズ取得
 * @returns {string}
 */
function getCurrentTestPhase() {
    return currentRecordingState.phase;
}

/**
 * 状態リセット
 */
function resetRecordingState() {
    currentRecordingState = {
        isRecording: false,
        testType: null,
        phase: 'idle',
        startTime: null,
        stopTime: null,
        stopReason: null,
        measurementData: null
    };
}
```

---

## 🔄 既存コードとの統合方法

### **VoiceRangeTesterV113との連携**

```javascript
// VoiceRangeTesterV113のコールバック設定
if (voiceRangeTester) {
    voiceRangeTester.setProgressCallback((progress) => {
        // 統合制御メソッド経由で更新
        updateRangeTestBadgeProgress(progress);
    });
    
    voiceRangeTester.setCompletionCallback((testType, result) => {
        // 統合制御メソッド経由で停止
        stopRecording('completed', { testType, result });
    });
}
```

### **AudioDetectionComponentとの連携**

```javascript
// window.rangeTestUIUpdateの統合
window.rangeTestUIUpdate = function(result) {
    // 既存のPreparationTestUI更新
    preparationUI.updateRangeTestUI(result);
    
    // 統合制御システムとの連携
    if (isRecording()) {
        handleVoiceDetection(result);
    }
};

function handleVoiceDetection(result) {
    if (result.frequency > 0 && result.clarity > 0.6 && result.volume > 0.02) {
        if (currentRecordingState.phase === 'waiting_for_voice') {
            // 音声検出 → 測定開始
            currentRecordingState.phase = 'measuring';
            updateRecordingUI('measuring');
            updateSubInfo('測定中...');
        }
    }
}
```

---

## 📋 実装のメリット

### **1. 保守性向上**
- 収録制御が一箇所に集約
- 新機能追加時の影響範囲が限定
- デバッグが容易

### **2. 状態管理の明確化**
- 現在の収録状態が一目で分かる
- 状態遷移の制御が統一
- 異常状態の検出が容易

### **3. UI更新の統合**
- アニメーション・表示更新が一元化
- 矛盾した表示状態の回避
- 一貫したユーザー体験

### **4. エラーハンドリング強化**
- 異常時の安全な処理
- 状態復旧の自動化
- デバッグ情報の充実

---

**この設計で混乱のない、管理しやすい収録制御システムを構築する**