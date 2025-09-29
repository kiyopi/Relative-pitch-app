# ページ遷移JavaScriptリセット問題の最終解決策

## 📅 作成日時
2025年1月29日

## 🎯 真の根本原因：ページ遷移によるJavaScriptリセット

### **問題の本質**
- preparation-step1.html → preparation-step2.html の`window.location.href`遷移
- ブラウザがページを完全に再読み込み
- **Step1で作成・初期化したPitchProインスタンスを含む、すべてのJavaScriptの状態が完全に破棄**
- Step2で`global-audio-manager.js`が最初から実行、全く新しいPitchProインスタンス作成
- 新しいインスタンスの`initialize()`実行 → ブラウザが「新しいページがマイクを使おうとしている」と判断
- **たとえ以前に許可していても、安全のために再度許可ダイアログを表示**

### **これまでの修正が無効だった理由**
- すべて単一ページ内での動作を前提とした修正
- ページ遷移によるメモリリセットを考慮していなかった
- ブラウザセキュリティポリシーとページ遷移の組み合わせ問題

## 💡 最終解決策：シングルページフローへの最小リファクタリング

### **基本方針**
- **ページ遷移そのものをなくす**
- preparation-step1.html内でUI切り替えによる疑似ページ遷移
- PitchProインスタンスを破棄せずに継続利用
- 最小限のリスクで確実な解決

### **既存リソース活用**
- preparation-step1.htmlに音域テスト要素（#range-test-section等）が既に存在
- 単一HTMLファイル内でのUI表示切り替えのみで実装可能
- 既存のvoice-range-test-demo.jsロジックを最大活用

## 🔧 実装ステップ

### **Step 1: preparation-step2.html廃止**
- このファイルは不要となる
- 今後の作業はpreparation-step1.htmlのみで実施

### **Step 2: preparation-controller.js作成**
```javascript
// js/preparation-controller.js
let audioDetector = null; // グローバルPitchProインスタンス管理

const ui = {
    step1: document.getElementById('step-1'),
    step2: document.getElementById('step-2'),
    step3: document.getElementById('step-3'),
    // UI要素の一元管理
};

// UIセクション表示切り替え
function showSection(sectionIdToShow) {
    ['permission-section', 'audio-test-section', 'range-test-section', 'result-section'].forEach(id => {
        const section = document.getElementById(id);
        if (section) {
            section.classList.toggle('hidden', id !== sectionIdToShow);
        }
    });
}

// Step1: マイク許可処理
async function handleMicRequest() {
    audioDetector = await window.globalAudioManager.getInstance();
    // 音声テスト成功後、音域テストボタン表示
}

// Step2: 音域テスト開始処理
async function handleStartRangeTest() {
    showSection('range-test-section');
    // 既存のaudioDetectorインスタンスを使用
    await window.startVoiceRangeTest(audioDetector);
}
```

### **Step 3: preparation-step1.html修正**
```html
<!-- スクリプト読み込み修正 -->
<script src="js/voice-range-test-demo.js"></script>
<script type="module" src="js/preparation-controller.js"></script>
```

## 🎯 修正による効果

### **1. ダイアログ問題の完全解決**
- ページ遷移がなくなる → PitchProインスタンス破棄されない
- マイク許可が再度求められることがない
- ブラウザセキュリティポリシーに完全準拠

### **2. コードの集約・整理**
- preparation.html関連ロジックがpreparation-controller.jsに集約
- 見通しの良いコード構造
- デバッグ・保守の容易さ

### **3. 最小限のリスク**
- 既存のvoice-range-test-demo.jsロジックをそのまま活用
- 大規模書き換えを回避
- 段階的な移行が可能

## 🧠 重要な技術的洞察

### **ページ遷移 vs SPA設計**
- 従来の複数HTMLファイル構成 → マイク許可状態の引き継ぎ困難
- シングルページアプリケーション → 状態の完全な継続性
- ブラウザセキュリティとの自然な協調

### **UI切り替えによる疑似遷移**
- `showSection()`による表示制御
- ページ遷移の体験を維持
- JavaScript状態の完全保持

## 📋 実装優先度

### **最高優先度**
1. preparation-controller.js作成
2. preparation-step1.htmlのスクリプト読み込み修正
3. UI切り替えロジック実装

### **中優先度**
1. voice-range-test-demo.js引数対応（既に完了）
2. 既存機能の統合テスト

### **低優先度**
1. preparation-step2.htmlの削除・バックアップ
2. コードクリーンアップ

## 🏷️ タグ
`#ページ遷移問題` `#JavaScriptリセット` `#シングルページフロー` `#最終解決策` `#マイク許可ダイアログ`