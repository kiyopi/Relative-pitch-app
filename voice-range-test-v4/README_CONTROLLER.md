# VoiceRangeTestController - 統合音域テストパッケージ

**バージョン**: v1.0.0  
**作成日**: 2025年1月9日  
**成功実装のパッケージ化**: 完全動作する音域テストをワンメソッドで呼び出し可能

---

## 🎯 概要

VoiceRangeTestControllerは、成功した音域テスト実装を統合パッケージ化し、**たった1行のメソッド呼び出し**で完全な音域テストを実行できるシステムです。

### ✨ 主な特徴
- **ワンメソッド実行**: `startVoiceRangeTest()` だけで完全動作
- **PitchPro統合**: AudioDetectionComponentと完全統合
- **完全自動化**: UI制御・アニメーション・測定フローを自動実行
- **コールバック対応**: 各フェーズでカスタムコールバック実行
- **エラーハンドリング**: 包括的なエラー処理と復旧機能

---

## 🚀 基本使用方法

### 1. **最もシンプルな使用例**
```javascript
import VoiceRangeTestController from './js/voice-range-test-controller.js';

// コントローラー作成
const controller = new VoiceRangeTestController();

// 🎯 ワンメソッドで音域テスト開始！
await controller.startVoiceRangeTest();
```

### 2. **コールバック付き使用例**
```javascript
const controller = new VoiceRangeTestController({
    debugMode: true,
    
    onLowPitchComplete: (result) => {
        console.log('低音測定完了:', result.note, result.frequency);
    },
    
    onHighPitchComplete: (result) => {
        console.log('高音測定完了:', result.note, result.frequency);
    },
    
    onTestComplete: (results) => {
        console.log('音域:', results.range);
        console.log('オクターブ数:', results.octaves);
        // 結果をサーバーに送信、次画面に遷移等
    },
    
    onError: (error) => {
        alert('エラー: ' + error.message);
    }
});

await controller.startVoiceRangeTest();
```

### 3. **完全カスタマイズ使用例**
```javascript
const controller = new VoiceRangeTestController({
    // UI要素セレクターのカスタマイズ
    rangeIconSelector: '#my-range-icon',
    countdownDisplaySelector: '#my-countdown',
    volumeBarSelector: '#my-volume-bar',
    
    // 測定設定のカスタマイズ
    measurementDuration: 5000,  // 5秒測定
    intervalDuration: 2000,     // 2秒インターバル
    
    // デバッグ有効化
    debugMode: true
});

await controller.startVoiceRangeTest();
```

---

## 📋 コンストラクターオプション

### **UI要素セレクター**
| オプション | デフォルト | 説明 |
|---|---|---|
| `rangeIconSelector` | `#range-icon` | メインアイコン要素 |
| `countdownDisplaySelector` | `#countdown-display` | カウントダウン数字要素 |
| `progressCircleSelector` | `.voice-progress-circle` | 円形プログレスバー |
| `volumeBarSelector` | `#range-test-volume-bar` | 音量バー |
| `mainStatusSelector` | `#main-status-text` | メインステータス表示 |
| `micContainerSelector` | `#mic-status-container` | マイクアイコンコンテナ |

### **測定設定**
| オプション | デフォルト | 説明 |
|---|---|---|
| `measurementDuration` | `3000` | 各フェーズ測定時間（ms） |
| `intervalDuration` | `3000` | フェーズ間インターバル（ms） |
| `progressUpdateInterval` | `100` | プログレスバー更新間隔（ms） |

### **コールバック関数**
| オプション | パラメータ | 説明 |
|---|---|---|
| `onLowPitchComplete` | `{phase, frequency, note}` | 低音測定完了時 |
| `onHighPitchComplete` | `{phase, frequency, note}` | 高音測定完了時 |
| `onTestComplete` | `{lowPitch, highPitch, range, octaves}` | テスト完了時 |
| `onError` | `Error` | エラー発生時 |

---

## 🎯 メソッドAPI

### **主要メソッド**
```javascript
// 🎯 メイン実行メソッド
await controller.startVoiceRangeTest()

// 測定結果取得
const results = controller.getResults()

// 現在のフェーズ確認
const phase = controller.getCurrentPhase() // 'idle', 'low-measuring', 'high-measuring', 'completed'

// テスト停止
controller.stopTest()

// リソース破棄
controller.destroy()
```

### **結果オブジェクト構造**
```javascript
{
    lowPitch: {
        frequency: 130,  // Hz
        note: 'C3'       // 音程名
    },
    highPitch: {
        frequency: 523,  // Hz 
        note: 'C5'       // 音程名
    },
    range: 'C3 - C5',    // 音域範囲
    octaves: 2.0         // オクターブ数
}
```

---

## 🔧 必要なHTML構造

VoiceRangeTestControllerが動作するには、以下のHTML要素が必要です：

```html
<!-- 音域テストバッジ -->
<div class="voice-range-display-container">
    <svg class="voice-stability-svg" width="160" height="160">
        <circle cx="80" cy="80" r="72" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="16"/>
        <circle cx="80" cy="80" r="72" fill="none" stroke="#3b82f6" stroke-width="16" 
                stroke-dasharray="452" stroke-dashoffset="452" 
                transform="rotate(-90 80 80)" class="voice-progress-circle"/>
    </svg>
    <div class="voice-note-badge">
        <i data-lucide="arrow-down" id="range-icon" class="icon-4xl text-white"></i>
        <p class="countdown-text" id="countdown-display" style="display: none;">3</p>
    </div>
</div>

<!-- ステータス表示 -->
<h4 id="main-status-text">音域テストを開始してください</h4>
<p id="sub-info-text">待機中...</p>

<!-- マイクステータス -->
<div class="mic-status-container standby" id="mic-status-container">
    <i data-lucide="mic" id="mic-status-icon"></i>
</div>

<!-- 音量・周波数表示 -->
<div id="range-test-volume-bar" style="width: 0%"></div>
<span id="range-test-volume-text">0%</span>
<span id="range-test-frequency-value">0 Hz</span>

<!-- 開始ボタン（オプション） -->
<button id="begin-range-test-btn">音域テスト開始</button>
```

---

## 🎨 CSS依存関係

以下のCSSクラスが必要です：

```css
/* 音域テストバッジアニメーション */
.voice-note-badge.measuring { /* 測定中のパルスアニメーション */ }
.voice-note-badge.confirmed { /* 完了時の緑色バウンスアニメーション */ }

/* マイクステータス */
.mic-status-container.standby { /* 待機状態 */ }
.mic-status-container.recording { /* 録音中状態 */ }
```

---

## 🌟 実際の使用例

### **React/Vue等での統合**
```javascript
// React コンポーネント内
useEffect(() => {
    const controller = new VoiceRangeTestController({
        onTestComplete: (results) => {
            setVoiceRange(results.range);
            setOctaves(results.octaves);
            navigate('/training'); // 次画面に遷移
        }
    });
    
    return () => controller.destroy();
}, []);

const startTest = async () => {
    await controller.startVoiceRangeTest();
};
```

### **フォーム送信との統合**
```javascript
const controller = new VoiceRangeTestController({
    onTestComplete: async (results) => {
        // サーバーに結果送信
        await fetch('/api/voice-range', {
            method: 'POST',
            body: JSON.stringify(results)
        });
        
        // UI更新
        showSuccessMessage('音域測定完了！');
    }
});
```

---

## 🔍 デモページ

実際の動作確認は以下で可能：
```
http://localhost:8000/voice-range-test-v4/src/voice-range-test-demo.html
```

---

## 📝 注意事項

1. **PitchPro依存**: AudioDetectionComponentが必要
2. **HTTPS必須**: マイクアクセスのためHTTPS環境が必要
3. **モダンブラウザ**: ES6+ Modules対応ブラウザが必要
4. **Lucideアイコン**: アイコン表示にLucide.jsが必要

---

## 🏆 成功の証明

このVoiceRangeTestControllerは、**4回目のチャレンジで完璧に動作**した実装をパッケージ化したものです。

- ✅ カウントダウン数字表示
- ✅ 円形プログレスバーの滑らかな更新  
- ✅ 音域テストバッジアニメーション
- ✅ 完璧な表示制御（数字とアイコンの混在なし）
- ✅ PitchPro完全統合
- ✅ エラーフリー動作

**たった1行で、完全な音域テストが実行できます！**

```javascript
await controller.startVoiceRangeTest(); // これだけ！
```