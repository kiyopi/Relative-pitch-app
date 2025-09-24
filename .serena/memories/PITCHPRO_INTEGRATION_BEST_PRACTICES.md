# PitchPro v1.3.1統合ベストプラクティス（voice-range-test-v4から抽出）

## 主要なベストプラクティス

### 1. AudioDetectionComponent設定の最適化

```javascript
// 推奨設定パラメータ
audioDetector = new AudioDetectionComponent({
    // UI要素セレクター
    volumeBarSelector: '#volume-bar',
    volumeTextSelector: '#volume-text', 
    frequencySelector: '#frequency-display',
    
    // PitchPro推奨設定（音程検出精度重視）
    clarityThreshold: 0.4,        // 音程明瞭度閾値（0.6 → 0.4で検出しやすく）
    minVolumeAbsolute: 0.003,     // 最小音量閾値（0.01 → 0.003で感度向上）
    
    // デバイス別最適化
    sensitivityMultiplier: 3.0,   // iPhone/Android向け感度
    volumeBarScale: 4.5          // 音量バー表示倍率
});
```

### 2. 初期化パターン

```javascript
// 推奨初期化手順
async function initializePitchPro() {
    try {
        // 1. AudioDetectionComponent作成
        audioDetector = new AudioDetectionComponent(config);
        
        // 2. 必須初期化処理
        await audioDetector.initialize();
        
        // 3. コールバック設定
        audioDetector.setCallbacks({
            onPitchUpdate: (result) => {
                // result.volume, result.frequency, result.noteを活用
            },
            onError: (error) => {
                console.error('PitchPro Error:', error);
            }
        });
        
        console.log('✅ PitchPro初期化完了');
    } catch (error) {
        console.error('❌ PitchPro初期化エラー:', error);
    }
}
```

### 3. UI切り替え最適化（重要）

```javascript
// UI要素切り替え時の正しい手順
async function switchToRangeTest() {
    if (audioDetector) {
        // 1. 検出停止
        audioDetector.stopDetection();
        
        // 2. リソース破棄（重要）
        audioDetector.destroy();
        
        // 3. 新しいセレクターで再作成
        audioDetector = new AudioDetectionComponent({
            volumeBarSelector: '#range-test-volume-bar',
            volumeTextSelector: '#range-test-volume-text',
            frequencySelector: '#range-test-frequency',
            clarityThreshold: 0.4,
            minVolumeAbsolute: 0.003
        });
        
        // 4. 再初期化
        await audioDetector.initialize();
    }
}
```

### 4. エラーハンドリング

```javascript
// 堅牢なエラーハンドリング
audioDetector.setCallbacks({
    onPitchUpdate: (result) => {
        try {
            // 必須チェック
            if (!result || typeof result.volume === 'undefined') {
                console.warn('無効なresultオブジェクト');
                return;
            }
            
            // 安全な数値処理
            const volume = Math.max(0, Math.min(100, result.volume || 0));
            const frequency = Math.max(0, result.frequency || 0);
            
            updateUI(volume, frequency);
        } catch (error) {
            console.error('コールバック処理エラー:', error);
        }
    },
    onError: (error) => {
        console.error('PitchProエラー:', error);
        showUserFriendlyError('音声処理でエラーが発生しました');
    }
});
```

### 5. 音声検出条件の最適化

```javascript
// より幅広い人声検出（preparation.html最適化）
function processPitchData(result) {
    const { frequency, volume } = result;
    
    // 人の声の範囲を拡大：男性(80-180Hz), 女性(165-330Hz), 子供(250-400Hz)
    const isHumanVoiceRange = frequency >= 80 && frequency <= 400;
    const hasMinVolume = volume >= 15; // 音量閾値を15%に下げて検出しやすく
    
    if (isHumanVoiceRange && hasMinVolume) {
        console.log(`✅ 人声検出: ${frequency.toFixed(1)}Hz, ${volume.toFixed(1)}%`);
        onVoiceDetected(frequency, volume);
    }
}
```

### 6. リソース管理

```javascript
// 適切なクリーンアップ
function cleanup() {
    if (audioDetector) {
        audioDetector.stopDetection();
        audioDetector.destroy();
        audioDetector = null;
    }
}

// ページ離脱時のクリーンアップ
window.addEventListener('beforeunload', cleanup);
```

## 重要な教訓

1. **clarityThreshold: 0.4** と **minVolumeAbsolute: 0.003** がPitchPro推奨設定
2. **destroy() → 再作成** がUI切り替えの正しい方法
3. **人声検出範囲を80-400Hzに拡大** でより検出しやすく  
4. **音量閾値を15-20%** に下げて実用的な検出レベルに
5. **必須エラーハンドリング** でresultオブジェクトの検証を実施

これらのベストプラクティスを適用することで、preparation.htmlの音声検出精度と安定性が大幅に向上する。