# 相対音感トレーニングアプリ - UIパーツ定義書

**バージョン**: 1.0.0  
**作成日**: 2025-08-08  
**用途**: 統合進行ガイドシステムのUIコンポーネント詳細仕様

---

## 🎵 発声ガイドコンポーネント

### 概要
相対音感トレーニングにおける最重要UI要素。基音再生からドレミガイド開始までの進行と、8音階の発声タイミングを視覚的にガイドする統合システム。

### 主要な役割
1. **タイミング管理**: 基音再生2.5秒後にドレミガイドを自動開始
2. **進行可視化**: 準備時間の残り時間を青色プログレスバーで表示
3. **発声指示**: 8音階（ドレミファソラシド）を順次ピンク色でハイライト
4. **リズム維持**: 各音階662.5msの一定間隔で進行

---

## 📊 進行バー（Preparation Progress Bar）

### HTML構造
```html
<div class="preparation-bar">
  <div class="progress-bar">
    <div class="progress-fill" id="preparation-fill" style="width: 0%;"></div>
  </div>
</div>
```

### CSS定義
```css
.progress-bar {
  height: 20px;
  background: #e9ecef;
  border-radius: 10px;
  overflow: hidden;
  position: relative;
}

.progress-fill {
  height: 100%;
  background: #007bff;  /* 青色統一 */
  transition: width 0.1s linear;
  border-radius: 10px;
  position: relative;
}

.progress-fill.completed {
  background: #007bff;
  animation: completion-glow 0.6s ease;
}

@keyframes completion-glow {
  0% { box-shadow: 0 0 0 rgba(0, 123, 255, 0.5); }
  50% { box-shadow: 0 0 20px rgba(0, 123, 255, 0.8); }
  100% { box-shadow: 0 0 0 rgba(0, 123, 255, 0.5); }
}
```

### 動作仕様
- **開始**: 基音再生ボタン押下時に0%から開始
- **進行**: 2500ms（2.5秒）かけて0%→100%まで線形進行
- **完了**: 100%到達時に光るエフェクトを0.6秒間表示
- **リセット**: アニメーション無効化（`transition: none`）で瞬間リセット

### 色彩定義
- **背景色**: `#e9ecef` (ライトグレー)
- **進行色**: `#007bff` (青色)
- **完了エフェクト**: `rgba(0, 123, 255, 0.8)` (青色グロー)

---

## 🎵 ドレミガイド（Doremi Visual Guide）

### HTML構造
```html
<div class="doremi-main-guide">
  <div class="note-circle" data-note="do">ド</div>
  <div class="note-circle" data-note="re">レ</div>
  <div class="note-circle" data-note="mi">ミ</div>
  <div class="note-circle" data-note="fa">ファ</div>
  <div class="note-circle" data-note="so">ソ</div>
  <div class="note-circle" data-note="la">ラ</div>
  <div class="note-circle" data-note="si">シ</div>
  <div class="note-circle" data-note="do2">ド</div>
</div>
```

### CSS定義

#### 基本スタイル
```css
.doremi-main-guide {
  display: flex;
  gap: 12px;
  justify-content: center;
  align-items: center;
  padding: 25px;
  background: #f8f9ff;
  border-radius: 15px;
  border: 4px solid #007bff;
  margin-top: 20px;
}

.note-circle {
  width: 70px;
  height: 70px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 20px;
  background: #e9ecef;
  color: #6c757d;
  border: 3px solid #dee2e6;
  transition: all 0.4s ease;
  position: relative;
}
```

#### アクティブ状態
```css
.note-circle.current {
  background: #ff69b4;        /* ピンク背景 */
  color: white;               /* 白文字 */
  transform: scale(1.4);      /* 1.4倍拡大 */
  border-color: #ff1493;      /* 濃ピンク枠 */
  box-shadow: 0 0 25px rgba(255, 105, 180, 0.6);
  animation: note-glow 0.8s infinite alternate;
  z-index: 10;
  position: relative;
  font-size: 28px;            /* 文字拡大 */
}
```

#### 二重波紋エフェクト
```css
.note-circle.current::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: rgba(255, 105, 180, 0.2);
  border: 2px solid rgba(255, 105, 180, 0.4);
  animation: ripple 1.2s infinite;
  z-index: -1;
}

.note-circle.current::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: rgba(255, 105, 180, 0.1);
  border: 1px solid rgba(255, 105, 180, 0.3);
  animation: ripple-second 1.2s infinite;
  animation-delay: 0.2s;
  z-index: -2;
}

@keyframes ripple {
  0% {
    transform: translate(-50%, -50%) scale(1);
    opacity: 0.6;
  }
  100% {
    transform: translate(-50%, -50%) scale(3);
    opacity: 0;
  }
}

@keyframes ripple-second {
  0% {
    transform: translate(-50%, -50%) scale(1.2);
    opacity: 0.4;
  }
  100% {
    transform: translate(-50%, -50%) scale(3.5);
    opacity: 0;
  }
}
```

#### 光るエフェクト
```css
@keyframes note-glow {
  from {
    box-shadow: 0 0 25px rgba(255, 105, 180, 0.6);
  }
  to {
    box-shadow: 0 0 35px rgba(255, 105, 180, 0.9);
  }
}
```

#### フォーカスモード（背景変化）
```css
.doremi-main-guide.focus-mode {
  background: #ffe0f0;      /* 薄ピンク背景 */
  border-color: #e91e63;    /* 濃ピンク枠 */
  border-width: 4px;
}
```

### 動作仕様

#### アニメーション開始
1. **準備バー完了**: 2500ms後に進行バー100%到達
2. **同時実行**: バー完了と同時に以下を実行
   - `progress-fill`に`completed`クラス追加
   - `doremi-main-guide`に`focus-mode`クラス追加
   - 最初の`note-circle`（ド）に`current`クラス追加

#### 8音階順次実行
```javascript
// 実装コード抜粋
function startDoremiGuideFromSecondNote() {
  const notes = document.querySelectorAll('.note-circle');
  let currentIndex = 1; // レから開始（ドは既にアクティブ）
  const noteInterval = 662.5; // 5300ms ÷ 8音 = 662.5ms per note
  
  const interval = setInterval(() => {
    // 前の音をリセット（統一タイミング）
    if (currentIndex === 1) {
      notes[0].classList.remove('current'); // ド
    } else {
      notes[currentIndex - 1].classList.remove('current');
    }
    
    // 現在の音をアクティブに
    if (currentIndex < notes.length) {
      notes[currentIndex].classList.add('current');
      currentIndex++;
    } else {
      clearInterval(interval);
      // 完了処理
      notes[notes.length - 1].classList.remove('current');
      setTimeout(() => {
        // 全リセット処理
      }, 500);
    }
  }, noteInterval);
}
```

#### タイミング仕様
- **各音階表示時間**: 662.5ms
- **音階切り替え**: 前の音階の`current`クラス除去と同時に次の音階に`current`クラス追加
- **最終音階**: 8番目の「ド」完了後、0.5秒待機してリセット

#### リセット処理
```javascript
function resetSession() {
  // 準備バーをリセット（アニメーション無効化）
  const preparationFill = document.getElementById('preparation-fill');
  preparationFill.style.transition = 'none';
  preparationFill.style.width = '0%';
  preparationFill.classList.remove('completed');
  // トランジションを元に戻す
  setTimeout(() => {
    preparationFill.style.transition = 'width 0.1s linear';
  }, 50);
  
  // ドレミガイドをリセット
  const notes = document.querySelectorAll('.note-circle');
  notes.forEach(note => {
    note.classList.remove('current');
  });
  document.querySelector('.doremi-main-guide').classList.remove('focus-mode');
  
  // 再生可能状態に戻す
  isPlaying = false;
}
```

### 色彩システム

#### 通常状態
- **背景**: `#e9ecef` (ライトグレー)
- **文字**: `#6c757d` (ミディアムグレー)
- **枠線**: `#dee2e6` (ライトグレー)

#### アクティブ状態
- **背景**: `#ff69b4` (ホットピンク)
- **文字**: `white` (白)
- **枠線**: `#ff1493` (ディープピンク)
- **グロー**: `rgba(255, 105, 180, 0.6)` (ピンクグロー)

#### 波紋エフェクト
- **第1波紋**: `rgba(255, 105, 180, 0.2)` 背景、`rgba(255, 105, 180, 0.4)` 枠線
- **第2波紋**: `rgba(255, 105, 180, 0.1)` 背景、`rgba(255, 105, 180, 0.3)` 枠線

#### フォーカスモード
- **背景**: `#ffe0f0` (薄ピンク)
- **枠線**: `#e91e63` (濃ピンク)

---

## 🎯 統合進行ガイドシステム全体

### コンテナ構造
```html
<div class="integrated-guide">
  <div class="guide-title">🎵 発声ガイド</div>
  <div class="guide-description">ガイドに合わせてドレミファソラシドを発声しましょう</div>
  
  <!-- 進行バー：基音からドレミガイド開始まで -->
  <div class="preparation-bar">
    <div class="progress-bar">
      <div class="progress-fill" id="preparation-fill" style="width: 0%;"></div>
    </div>
  </div>

  <!-- ドレミガイド（メイン視覚要素） -->
  <div class="doremi-main-guide">
    <!-- 8個のnote-circle -->
  </div>
</div>
```

### 最重要要素のスタイル
```css
.integrated-guide {
  background: white;
  border-radius: 12px;
  padding: 25px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  border: 3px solid #007bff;  /* 青枠で重要性を強調 */
}

.guide-title {
  font-weight: 700;
  margin-bottom: 10px;
  color: #2c3e50;
  text-align: center;
  font-size: 18px;
}

.guide-description {
  text-align: center;
  color: #666;
  font-size: 14px;
  margin-bottom: 20px;
  line-height: 1.4;
}
```

### 機能フロー
1. **待機状態**: 準備バー0%、全ドレミ円グレー、白背景
2. **基音再生**: 準備バー0%→100%（2.5秒）
3. **ガイド開始**: バー完了と同時に背景ピンク化、ド円アクティブ化
4. **順次進行**: 662.5ms間隔でレ→ミ→ファ→ソ→ラ→シ→ド（高）
5. **完了**: 最終ド表示後0.5秒でリセット、白背景に復帰

---

## 🔧 実装上の重要ポイント

### 同期タイミング
- 準備バー完了（100%）とドレミガイド開始は**完全同期**
- 一切の遅延やずれは許可しない
- JavaScriptで同一実行フレーム内で全て処理

### アニメーション制御
- 進行バーは`linear`トランジション使用
- ドレミ円は`ease`トランジション使用
- リセット時は`transition: none`で即座実行

### Z-index管理
- アクティブ円: `z-index: 10`
- 第1波紋: `z-index: -1`
- 第2波紋: `z-index: -2`

### レスポンシブ対応
- ドレミ円サイズ: デスクトップ70px、モバイル調整可能
- 文字サイズ: 通常20px、アクティブ28px
- 波紋エフェクトは円サイズに追従

---

**この発声ガイドシステムは相対音感トレーニングの核心であり、正確なタイミングと視覚的明確性が成功の鍵となります。**