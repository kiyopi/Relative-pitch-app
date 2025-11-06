# PitchPro コアメソッド・SPA設計用リファレンス

## 📋 実装済みコードから確認されたPitchProメソッド

### 🏗️ インスタンス作成・初期化
```javascript
// 1. インスタンス作成
const detector = new window.PitchPro.AudioDetectionComponent({
    debugMode: true,
    autoUpdateUI: true,
    // UIセレクターは後から設定可能
});

// 2. 初期化（必須・非同期）
await detector.initialize();
```

### 🎛️ UI設定・更新
```javascript
// 3. UIセレクター動的設定（重要！）
detector.updateSelectors({
    volumeBarSelector: '#volume-bar',
    volumeTextSelector: '#volume-text',
    frequencySelector: '#frequency-display'
});
```

### 📞 コールバック設定
```javascript
// 4. コールバック設定
detector.setCallbacks({
    onPitchUpdate: (result) => {
        // result.frequency, result.volume, result.note が利用可能
        console.log(`🎵 ${result.note} - ${result.frequency.toFixed(1)}Hz`);
    },
    onError: (error) => {
        console.error('Detection error:', error.message);
    }
});
```

### 🎤 音声検出制御
```javascript
// 5. 音声検出開始
await detector.startDetection();

// 6. 音声検出停止
await detector.stopDetection();
```

## 🔑 SPA設計のための重要な発見

### 1. **インスタンス継承が可能**
```javascript
// Step1でインスタンス作成・初期化
const detector = await globalAudioManager.getInstance();

// Step2で同じインスタンスを再利用
// updateSelectors()で新しいUI要素に切り替え
detector.updateSelectors({
    volumeBarSelector: '#step2-volume-bar',
    frequencySelector: '#step2-frequency'
});
```

### 2. **updateSelectors()が鍵**
- **用途**: ページ切り替え時にUI要素を動的変更
- **利点**: 新しいインスタンス作成不要
- **結果**: マイク許可状態が継承される

### 3. **GlobalAudioManagerパターン**
```javascript
class GlobalAudioManager {
    async getInstance() {
        if (this.pitchProInstance) {
            return this.pitchProInstance; // 既存インスタンス返却
        }
        // 初回のみ作成・初期化
        this.pitchProInstance = new AudioDetectionComponent();
        await this.pitchProInstance.initialize();
        return this.pitchProInstance;
    }
}
```

## 🏗️ SPA用PitchPro継承設計

### アーキテクチャ設計
```
App起動 → Page1(マイク許可) → Page2(音声検出) → Page3(結果)
   ↓              ↓                ↓              ↓
getInstance()  updateSelectors() updateSelectors() updateSelectors()
   ↓              ↓                ↓              ↓
[新規作成]     [UI要素切替]     [UI要素切替]     [UI要素切替]
   ↓              ↓                ↓              ↓
initialize()   [マイク継承]     [マイク継承]     [マイク継承]
```

### 実装パターン
```javascript
// app.js - 司令塔
let sharedAudioDetector = null;

async function showPage(pageName) {
    // 1. テンプレート読み込み
    const html = await fetch(`templates/${pageName}.html`).then(r => r.text());
    document.getElementById('app-main').innerHTML = html;
    
    // 2. PitchProインスタンス取得・継承
    if (!sharedAudioDetector) {
        sharedAudioDetector = await window.globalAudioManager.getInstance();
    }
    
    // 3. ページ専用コントローラー初期化
    const controller = await import(`./controllers/${pageName}.js`);
    await controller.initialize(sharedAudioDetector);
}
```

## 🧪 ミニマルテストアプリ設計

### ファイル構成
```
test-spa/
├── index.html                 # メインアプリケーション
├── js/
│   └── app.js                # 司令塔
└── templates/
    ├── mic-test.html         # マイク許可テスト
    └── audio-test.html       # 音声検出テスト
```

### テストシナリオ
1. **index.html**: app.js読み込み、最初に mic-test.html 表示
2. **mic-test.html**: マイク許可取得、PitchProインスタンス作成
3. **audio-test.html**: 既存インスタンスで音声検出、**マイク許可ダイアログなし**

### 成功条件
- ✅ mic-test → audio-test 遷移時にマイク許可ダイアログが再表示されない
- ✅ PitchProインスタンスが正しく継承される
- ✅ 音声検出が正常に動作する

## ⚠️ 重要な注意点

### 1. GlobalAudioManager必須
- 全ページでglobalAudioManager.getInstance()を使用
- 直接new AudioDetectionComponent()は禁止

### 2. updateSelectors()活用
- ページ切り替え時は必ずupdateSelectors()実行
- 新しいHTML要素のセレクターを設定

### 3. initialize()は1回のみ
- 最初のgetInstance()でのみ実行
- 2回目以降は既存インスタンス返却

### 4. エラーハンドリング
```javascript
if (!detector.updateSelectors) {
    console.warn('updateSelectors利用不可、フォールバック使用');
    // 代替処理
}
```

---

**作成日**: 2025年1月30日  
**用途**: SPA設計・ミニマルテストアプリ実装用  
**重要度**: 最高（★★★★★）