# Step2修正要件リスト（2025年1月28日更新）

## 🎯 修正対象ファイル
- **メインファイル**: `/Bolt/v2/pages/preparation-step2.html`
- **JavaScriptファイル**: `/Bolt/v2/pages/js/preparation-step2.js`

## 📋 修正要件（優先度順）

### **1. ステップインジケーター状態修正**
- **現状**: Step1・Step2が完了状態、Step3が実行中表示
- **修正後**: Step1・Step2が完了状態、Step3が実行中表示（適切な状態）
- **対象要素**: 
  - `#step-1` → `class="step-indicator completed"`
  - `#step-2` → `class="step-indicator completed"`
  - `#step-3` → `class="step-indicator active"`
  - `#connector-1` → `class="step-connector completed"`
  - `#connector-2` → `class="step-connector active"`

### **2. マイク許可セクション削除**
- **現状**: デモ用のマイク許可セクションが残存
- **修正後**: Step1で完了済みのため削除
- **対象**: HTML内のマイク許可関連セクション完全削除

### **3. 音域テストボタン有効化**
- **現状**: ボタンが無効状態
- **修正後**: Step1完了確認後に有効化
- **対象**: `#begin-range-test-btn`の状態管理

### **4. メインステータステキスト調整**
- **現状**: デモ用メッセージ
- **修正後**: Step2専用メッセージに変更
- **対象**: `#main-status-text`の初期表示内容

### **5. サブステータステキスト調整**
- **現状**: 「待機中...」
- **修正後**: Step2段階に適したメッセージ
- **対象**: `#sub-info-text`の表示内容

### **6. デバッグ用セクション削除**
- **現状**: デモ・テスト用の不要セクション
- **修正後**: 本番用のみ残存
- **対象**: デバッグ・テスト専用UI要素

### **7. ヘッダー・タイトル調整**
- **現状**: 音域テスト
- **修正後**: Step2に適したタイトル
- **対象**: `<title>`タグ、ページヘッダー

## 🛠️ 実装ステップ（段階的実行）

### **Step 1: ステップインジケーター状態修正**
```html
<!-- 修正前 -->
<div class="step-indicator completed" id="step-1">
<div class="step-indicator completed" id="step-2">  
<div class="step-indicator active" id="step-3">

<!-- 修正後 -->
<div class="step-indicator completed" id="step-1">
<div class="step-indicator completed" id="step-2">
<div class="step-indicator active" id="step-3">
```

### **Step 2: マイク許可セクション削除**
- voice-range-test-demo.html由来のマイク許可UI完全削除
- Step1完了前提のシンプルな構造に変更

### **Step 3: 音域テストボタン有効化**
```javascript
// Step2Manager.enableRangeTestButton()での有効化確認
const beginBtn = document.getElementById('begin-range-test-btn');
if (beginBtn) {
    beginBtn.disabled = false;
    beginBtn.classList.remove('btn-disabled');
}
```

### **Step 4: メインステータステキスト調整**
```javascript
// 初期メッセージをStep2専用に変更
this.updateMainStatusText('Step1完了！音域テストを開始してください');
```

### **Step 5: サブステータステキスト調整**
```javascript
// サブ情報テキストをStep2段階に調整
document.getElementById('sub-info-text').textContent = 'Step1完了・音域測定準備完了';
```

### **Step 6: デバッグ用セクション削除**
- コンソールログの整理
- テスト専用UI要素の削除
- 不要なデバッグ表示の除去

### **Step 7: ヘッダー・タイトル調整**
```html
<!-- 修正後 -->
<title>音域テスト（Step2） - 8va相対音感トレーニング</title>
<h1 class="page-title">音域テスト（Step2）</h1>
<p class="page-subtitle text-purple-200">Step1完了後の音域測定</p>
```

## 🎯 PitchPro v1.3.1活用方針

### **AudioDetectionComponent設定**
```javascript
this.audioDetector = new PitchPro.AudioDetectionComponent({
    volumeBarSelector: '#range-test-volume-bar',
    volumeTextSelector: '#range-test-volume-text', 
    frequencySelector: '#range-test-frequency-value',
    clarityThreshold: 0.4,
    minVolumeAbsolute: 0.003
});
```

### **デバイス最適化**
```javascript
if (this.audioDetector.detectAndOptimizeDevice) {
    await this.audioDetector.detectAndOptimizeDevice();
}
```

## 📋 テスト計画

### **各ステップ完了後の確認項目**
1. **Step 1**: ステップインジケーター表示が正しいか
2. **Step 2**: マイク許可セクションが完全削除されているか
3. **Step 3**: 音域テストボタンが有効化されているか  
4. **Step 4**: メインステータステキストが適切か
5. **Step 5**: サブステータステキストが適切か
6. **Step 6**: デバッグ要素が除去されているか
7. **Step 7**: ヘッダー・タイトルが適切か

### **最終統合テスト**
- Step1からStep2への遷移確認
- localStorage状態確認
- PitchPro初期化確認
- 音域テスト実行確認

## 🚨 重要注意事項

### **作業プロトコル**
- 各ステップ実行前に必ず確認を取る
- 迷った場合は必ず質問する
- 小さなステップで確実に進める
- 各ステップ完了後にテスト実行

### **PitchPro仕様遵守**
- v1.3.1のsetCallbacks()問題は解決済み
- AudioDetectionComponentの適切な活用
- micController.reset()メソッドの活用

## 📅 作成日時
2025年1月28日

## 📝 更新履歴
- 2025年1月28日: 初回作成
- 2025年1月28日: 実装ステップ詳細化完了