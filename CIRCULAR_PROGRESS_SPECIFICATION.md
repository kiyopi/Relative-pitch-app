# 音域テストバッジ仕様書

**ファイル**: preparation-test.html  
**作成日**: 2025年1月9日  
**目的**: 音域テスト時の安定度・状態表示

---

## 📊 HTML構造

### SVG要素の構成
```html
<svg class="voice-stability-svg" width="160" height="160" id="stability-ring">
    <!-- 背景円（固定） -->
    <circle cx="80" cy="80" r="72" 
            fill="none" 
            stroke="rgba(255,255,255,0.2)" 
            stroke-width="16"/>
    
    <!-- プログレス円（可変） -->
    <circle cx="80" cy="80" r="72" 
            fill="none" 
            stroke="#3b82f6" 
            stroke-width="16" 
            stroke-dasharray="452" 
            stroke-dashoffset="452" 
            transform="rotate(-90 80 80)" 
            class="voice-progress-circle"/>
</svg>

<!-- 中央のアイコン表示 -->
<div class="voice-note-badge">
    <i data-lucide="arrow-down" 
       id="range-icon" 
       style="width: 80px; height: 80px; color: white; display: block;"></i>
</div>
```

---

## 🎯 技術仕様

### 円形計算
- **半径**: 72px
- **円周**: `2 * π * 72 = 452.39` (約452)
- **座標**: 中心 (80, 80)
- **サイズ**: 160px × 160px

### 安定度表示方式
- **開始位置**: 12時方向 (`transform="rotate(-90 80 80)"`)
- **進行方向**: 時計回り
- **表示範囲**: 0% ～ 100% (安定度に対応)

### stroke-dashoffset計算式
```javascript
const circumference = 2 * Math.PI * 72; // 452.39
const progress = Math.min(100, Math.max(0, inputProgress)); // 0-100に制限
const offset = circumference - (progress / 100) * circumference;
```

**例**:
- 0%: offset = 452 (見えない)
- 25%: offset = 339 (1/4円)
- 50%: offset = 226 (半円)
- 100%: offset = 0 (完全な円)

---

## 🔧 JavaScript実装

### 更新関数
```javascript
function updateRangeTestBadge(stability) {
    const stabilityRing = document.getElementById('stability-ring');
    const progressCircle = stabilityRing?.querySelector('.voice-progress-circle');
    
    if (progressCircle) {
        const circumference = 2 * Math.PI * 72; // r=72
        const offset = circumference - (Math.min(100, Math.max(0, stability)) / 100) * circumference;
        progressCircle.style.strokeDashoffset = offset.toString();
        
        console.log(`🔄 音域テストバッジ更新: ${stability}% (offset: ${offset.toFixed(1)})`);
        return true;
    } else {
        console.error('❌ 音域テストバッジ要素が見つかりません');
        return false;
    }
}

// グローバル関数として公開
window.updateRangeTestBadge = updateRangeTestBadge;
```

### 初期化・テスト
```javascript
// 動作確認（10%表示でテスト）
if (updateRangeTestBadge(10)) {
    console.log('✅ 音域テストバッジ要素確認完了');
}
```

---

## 🔗 VoiceRangeTesterV113との連携

### コールバック設定
```javascript
if (voiceRangeTester && typeof voiceRangeTester.setProgressCallback === 'function') {
    voiceRangeTester.setProgressCallback((stability) => {
        updateRangeTestBadge(stability);
    });
    console.log('✅ VoiceRangeTesterV113に音域テストバッジ更新関数を設定');
}
```

### 呼び出し元
- **VoiceRangeTesterV113**: 音域テスト安定度に応じて0-100%の値を渡す
- **手動テスト**: `updateRangeTestBadge(10)` で10%表示確認

---

## 🎨 デザイン・スタイル

### 色設定
- **背景円**: `rgba(255,255,255,0.2)` (半透明白)
- **プログレス円**: `#3b82f6` (青色)
- **線幅**: 16px
- **中央アイコン**: 白色 (80px × 80px)

### レスポンシブ対応
- **固定サイズ**: 160px × 160px
- **位置**: 音域テスト画面の中央配置

---

## 🔍 デバッグ・確認方法

### 確認すべき要素
1. **SVG要素**: `#stability-ring`が存在するか
2. **プログレス円**: `.voice-progress-circle`が存在するか
3. **計算値**: offset値が正しく計算されているか

### デバッグログ
```javascript
// 正常時
🔄 円形プログレスバー更新: 25% (offset: 339.3)

// エラー時
❌ 円形プログレスバー要素が見つかりません
```

### 手動テスト
```javascript
// ブラウザコンソールで実行
updateRangeTestBadge(0);   // 見えない
updateRangeTestBadge(25);  // 1/4円
updateRangeTestBadge(50);  // 半円
updateRangeTestBadge(75);  // 3/4円
updateRangeTestBadge(100); // 完全な円
```

---

## ⚠️ 既知の問題・注意点

### 要素の存在確認
- SVG要素やclass要素の存在を必ず確認
- querySelector失敗時のエラーハンドリング実装済み

### 値の範囲制限
- 入力値を0-100%に制限 (`Math.min(100, Math.max(0, progress))`)
- 異常値による表示崩れを防止

### グローバル関数
- `window.updateRangeTestBadge`でグローバルに公開
- VoiceRangeTesterV113から呼び出し可能

---

## 📋 今後の改善案

### パフォーマンス最適化
- 頻繁な更新時のthrottling検討
- アニメーション追加時のCSS transition活用

### 機能拡張
- 色の動的変更（進捗に応じた色変化）
- パルス効果やグロー効果の追加
- 複数の円による多重プログレス表示

---

**この仕様書は implementation cleanup 前の基準として使用する**