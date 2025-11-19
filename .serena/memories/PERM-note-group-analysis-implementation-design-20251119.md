# 音階グループ別分析 実装設計書

**作成日**: 2025-11-19
**目的**: 「脳内処理パターン分析」を「音階グループ別分析（実験的）」に改修
**背景**: 経験則に基づく仮説をデータで検証しつつ、科学的誠実性を保つ

---

## 1. 設計方針

### 1.1 核心的な考え方

**ユーザーの仮説**:
- G〜Bを「両脳を意識して」発声すると音質が変わる（経験則）
- C〜F#とG〜Bに精度差があるという経験的事実
- この差を縮めることで音感向上が期待できる

**設計方針**:
1. **仮説であることを明示** - 断定的な表現を避ける
2. **データで実証** - ユーザーデータで仮説を検証
3. **差別化戦略** - 他の音感トレーニングにはない独自性
4. **リスク最小化** - 混乱を防ぐUI設計
5. **柔軟性** - 将来的に修正・削除可能

---

## 2. UI表現の改善

### 2.1 名称変更

**❌ 避けるべき表現**:
- 「左脳処理音」「両脳処理音」
- 「脳内ピアノ理論」
- 断定的な表現

**✅ 推奨する表現**:
- 「グループA（C〜F#）」
- 「グループB（G〜B）」
- 「音階グループ別分析（実験的）」
- 「研究中」「経験則に基づく」

### 2.2 セクションタイトル

```html
<!-- 変更前 -->
<h3>脳内処理パターン分析</h3>
<p>音楽は左脳と右脳で処理されています。左脳はC〜F#を、両脳でG〜Bを処理します。</p>

<!-- 変更後 -->
<h3>
  <i data-lucide="brain"></i>
  <span>音階グループ別精度分析</span>
  <span class="experimental-badge">実験的</span>
</h3>
<p class="experimental-notice">
  📊 この分析は、特定の音階グループ（C〜F#とG〜B）で精度差が
  見られるという経験則に基づいた実験的な機能です。
  両グループの精度を均等にすることで、さらなる音感向上を目指します。
</p>
```

### 2.3 グループカード

```html
<!-- グループA -->
<div class="note-group-card">
  <div class="note-group-title">
    <i data-lucide="circle" class="text-blue-300"></i>
    <span>グループA</span>
  </div>
  <div class="note-group-notes">C C# D D# E F F#</div>
  <div class="note-group-avg">
    <p class="note-group-avg-label">平均誤差</p>
    <div id="group-a-avg" class="note-group-avg-value">±--¢</div>
  </div>
  <div class="progress-bar">
    <div id="group-a-progress" class="progress-fill gradient-catalog-blue" style="width: 0%;"></div>
  </div>
  <p id="group-a-count" class="note-group-count">測定回数: --</p>
</div>

<!-- グループB -->
<div class="note-group-card">
  <div class="note-group-title">
    <i data-lucide="zap" class="text-purple-300"></i>
    <span>グループB</span>
  </div>
  <div class="note-group-notes">G G# A B♭ B</div>
  <div class="note-group-avg">
    <p class="note-group-avg-label">平均誤差</p>
    <div id="group-b-avg" class="note-group-avg-value">±--¢</div>
  </div>
  <div class="progress-bar">
    <div id="group-b-progress" class="progress-fill gradient-catalog-purple" style="width: 0%;"></div>
  </div>
  <p id="group-b-count" class="note-group-count">測定回数: --</p>
</div>
```

### 2.4 精度差の表示

```html
<div class="note-difficulty-section">
  <div class="note-difficulty-title">
    <i data-lucide="bar-chart-3"></i>
    <span>グループ間の精度差</span>
  </div>
  <div id="note-difficulty-value" class="note-difficulty-value">
    グループBはグループAより +--¢ 難しい傾向
  </div>
  <p id="note-difficulty-analysis" class="note-difficulty-analysis">
    💡 <strong>練習のヒント</strong>: 
    グループB（G〜B）の発声時には、より集中して
    「音の響きを全身で感じる」イメージで歌うと、
    精度が向上する傾向があります。
  </p>
</div>
```

### 2.5 グループB詳細分析

```html
<div class="note-detail-section">
  <div class="note-detail-title">
    <i data-lucide="music"></i>
    <span>グループB 詳細分析</span>
  </div>
  <div id="note-detail-list" class="note-detail-list">
    <!-- 動的に生成される -->
  </div>
</div>
```

---

## 3. JavaScript変更

### 3.1 関数名変更

```javascript
// 変更前
calculateBrainProcessingPattern(sessionData)
updateBrainProcessingUI(data)

// 変更後
calculateNoteGroupPattern(sessionData)
updateNoteGroupUI(data)
```

### 3.2 変数名変更

```javascript
// 変更前
const LEFT_BRAIN_NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#'];
const BOTH_BRAIN_NOTES = ['G', 'G#', 'A', 'A#', 'B'];
const leftBrainErrors = [];
const bothBrainErrors = [];

// 変更後
const GROUP_A_NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#'];
const GROUP_B_NOTES = ['G', 'G#', 'A', 'A#', 'B'];
const groupAErrors = [];
const groupBErrors = [];
```

### 3.3 返り値の構造変更

```javascript
return {
  groupA: {
    avgError: parseFloat(groupAAvg.toFixed(1)),
    count: groupACount,
    notes: GROUP_A_NOTES
  },
  groupB: {
    avgError: parseFloat(groupBAvg.toFixed(1)),
    count: groupBCount,
    notes: ['G', 'G#', 'A', 'B♭', 'B'],
    noteStats: groupBNoteStats
  },
  difficulty: {
    difference: parseFloat(difficulty.toFixed(1)),
    percentage: parseFloat(difficultyPercentage.toFixed(1)),
    isHarder: difficulty > 0,
    analysis: difficulty > 5
      ? 'グループBはグループAより明確に難しい傾向があります。集中して「音の響きを全身で感じる」意識で練習しましょう。'
      : difficulty > 0
      ? 'グループBはやや難しい傾向が見られます。'
      : '両グループ間で明確な差は見られません。'
  }
};
```

---

## 4. CSS追加

### 4.1 実験的バッジ

```css
.experimental-badge {
  display: inline-block;
  padding: 0.25rem 0.5rem;
  background: rgba(245, 158, 11, 0.2);
  border: 1px solid rgba(245, 158, 11, 0.4);
  border-radius: 4px;
  color: #f59e0b;
  font-size: 0.75rem;
  font-weight: 600;
  margin-left: 0.5rem;
}
```

### 4.2 実験的通知

```css
.experimental-notice {
  background: rgba(59, 130, 246, 0.1);
  border-left: 4px solid #3b82f6;
  padding: 1rem;
  border-radius: 8px;
  color: #cbd5e1;
  font-size: 0.875rem;
  line-height: 1.5;
  margin-bottom: 1.5rem;
}
```

### 4.3 音階グループカード

```css
.note-group-card {
  background: rgba(255, 255, 255, 0.05);
  padding: 1.5rem;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.note-group-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 600;
  font-size: 1rem;
  color: white;
  margin-bottom: 0.75rem;
}

.note-group-notes {
  color: #94a3b8;
  font-size: 0.875rem;
  margin-bottom: 1rem;
}

.note-group-avg {
  text-align: center;
  margin-bottom: 0.75rem;
}

.note-group-avg-label {
  color: #94a3b8;
  font-size: 0.75rem;
  margin: 0 0 0.25rem 0;
}

.note-group-avg-value {
  font-size: 1.75rem;
  font-weight: 700;
  margin: 0;
}

.note-group-count {
  color: #94a3b8;
  font-size: 0.8rem;
  margin: 0.5rem 0 0 0;
  text-align: center;
}
```

---

## 5. 「この分析について」説明セクション

### 5.1 HTML構造

```html
<div class="analysis-info-section" style="display: none;" id="note-group-analysis-info">
  <div class="glass-card">
    <h4 style="color: white; font-size: 1.25rem; font-weight: 600; margin-bottom: 1rem;">
      📚 音階グループ別分析について
    </h4>
    
    <div style="margin-bottom: 1.5rem;">
      <h5 style="color: white; font-size: 1rem; font-weight: 600; margin-bottom: 0.5rem;">
        なぜこの分析があるのか？
      </h5>
      <p style="color: #cbd5e1; font-size: 0.875rem; line-height: 1.6;">
        多くのトレーニング実践者が、特定の音階グループ
        （C〜F#とG〜B）で精度に差があることに気づいています。
        この分析は、その傾向を可視化し、改善に役立てることを目的としています。
      </p>
    </div>
    
    <div style="margin-bottom: 1.5rem;">
      <h5 style="color: white; font-size: 1rem; font-weight: 600; margin-bottom: 0.5rem;">
        どう活用すればいいか？
      </h5>
      <ul style="color: #cbd5e1; font-size: 0.875rem; line-height: 1.6; padding-left: 1.5rem;">
        <li>両グループの精度差を確認する</li>
        <li>精度が低いグループを重点的に練習する</li>
        <li>「音の響きを全身で感じる」意識で発声する</li>
        <li>グループB（G〜B）は特に集中して練習する</li>
      </ul>
    </div>
    
    <div style="background: rgba(245, 158, 11, 0.1); border-left: 4px solid #f59e0b; padding: 1rem; border-radius: 8px;">
      <h5 style="color: #f59e0b; font-size: 1rem; font-weight: 600; margin-bottom: 0.5rem;">
        ⚠️ 科学的根拠について
      </h5>
      <p style="color: #cbd5e1; font-size: 0.875rem; line-height: 1.6; margin: 0;">
        この分析は経験則に基づいた<strong>実験的な機能</strong>です。
        現在、ユーザーデータを収集して仮説を検証中です。
        将来的には、統計的な裏付けを追加する予定です。
      </p>
    </div>
  </div>
</div>

<button onclick="toggleNoteGroupInfo()" class="info-toggle-btn" style="margin-top: 1rem;">
  <i data-lucide="info"></i>
  <span>この分析について詳しく</span>
</button>
```

### 5.2 JavaScript関数

```javascript
function toggleNoteGroupInfo() {
  const infoSection = document.getElementById('note-group-analysis-info');
  if (infoSection.style.display === 'none') {
    infoSection.style.display = 'block';
  } else {
    infoSection.style.display = 'none';
  }
  
  // Lucideアイコン再初期化
  if (typeof window.initializeLucideIcons === 'function') {
    window.initializeLucideIcons({ immediate: true });
  }
}
```

---

## 6. 設定機能（表示/非表示の切り替え）

### 6.1 設定ページに追加

```html
<div class="setting-item">
  <label class="setting-label">
    <input type="checkbox" id="show-note-group-analysis" checked>
    <span>音階グループ別分析を表示する</span>
  </label>
  <p class="setting-description">
    C〜F#とG〜Bのグループ別精度分析（経験則に基づく実験的機能）を表示します。
  </p>
</div>
```

### 6.2 JavaScript制御

```javascript
// 設定読み込み
function loadNoteGroupAnalysisSetting() {
  const setting = localStorage.getItem('showNoteGroupAnalysis');
  return setting === null ? true : setting === 'true';
}

// 設定保存
function saveNoteGroupAnalysisSetting(show) {
  localStorage.setItem('showNoteGroupAnalysis', show.toString());
}

// premium-analysis-controller.js内で使用
function updateTab1UI(data, noteGroupData) {
  // ... 既存の音程間隔別精度表示 ...
  
  // 音階グループ別分析の表示/非表示
  const showNoteGroup = loadNoteGroupAnalysisSetting();
  const noteGroupSection = document.querySelector('.note-group-section');
  if (noteGroupSection) {
    noteGroupSection.style.display = showNoteGroup ? 'block' : 'none';
  }
  
  if (showNoteGroup && noteGroupData) {
    updateNoteGroupUI(noteGroupData);
  }
}
```

---

## 7. データ収集・実証計画

### Phase 1: 仮説検証（現在）
1. 実装した分析でユーザーデータを収集
2. C〜F#とG〜Bで**本当に精度差があるか**を統計的に検証
3. 精度差がある場合、その原因を分析

**検証項目**:
- グループA vs グループBの平均誤差
- 精度差の統計的有意性（t検定等）
- ユーザー間のばらつき

### Phase 2: 改善効果の検証
1. 「グループBを意識した練習」のアドバイスを提供
2. 練習後の精度変化を追跡
3. 「両グループの精度差が縮まるか」を検証

**検証項目**:
- 練習前後のグループB精度変化
- グループ間精度差の変化
- 練習方法の効果測定

### Phase 3: 理論の洗練
1. データに基づいて理論を修正
2. 科学的根拠の追加（可能であれば）
3. 「実験的」バッジを外す、または継続

---

## 8. 実装タスク

### 8.1 HTML修正（30分）
- [x] セクションタイトル変更
- [x] 「実験的」バッジ追加
- [x] 説明文の追加
- [x] グループA/グループB名称変更
- [x] 「この分析について」セクション追加

### 8.2 JavaScript修正（1時間）
- [x] 関数名変更: `calculateBrainProcessingPattern` → `calculateNoteGroupPattern`
- [x] 変数名変更: `leftBrain` → `groupA`, `bothBrain` → `groupB`
- [x] コメント修正
- [x] 分析メッセージ変更
- [x] toggleNoteGroupInfo()実装

### 8.3 CSS追加（30分）
- [x] `.experimental-badge`スタイル
- [x] `.experimental-notice`スタイル
- [x] `.note-group-*`スタイル
- [x] `.info-toggle-btn`スタイル

### 8.4 設定機能追加（30分）
- [x] 設定ページにチェックボックス追加
- [x] localStorage保存/読み込み実装
- [x] 表示/非表示の切り替え機能

### 8.5 テスト（30分）
- [x] 全タブでの動作確認
- [x] 設定機能の動作確認
- [x] Lucideアイコン表示確認
- [x] レスポンシブ対応確認

**合計推定時間**: 3時間

---

## 9. この方法のメリット

1. **科学的誠実性**: 仮説であることを明示し、断定的表現を避ける
2. **検証可能性**: データで実証できる設計
3. **差別化効果**: 他の音感トレーニングにはない独自性を維持
4. **リスク最小化**: 混乱を防ぐUI設計（実験的バッジ、説明文）
5. **教育的価値**: 具体的な練習方法を提示
6. **柔軟性**: 設定で表示/非表示、将来的に修正・削除可能
7. **ユーザー選択**: 興味があるユーザーのみ利用可能

---

## 10. 注意事項

### 10.1 表現のガイドライン

**避けるべき表現**:
- 「脳内ピアノ理論」（独自用語）
- 「左脳処理音」「両脳処理音」（断定的）
- 「科学的に証明された」（未検証）
- 「必ず効果がある」（保証できない）

**推奨する表現**:
- 「音階グループ別分析（実験的）」
- 「経験則に基づく」
- 「傾向がある」「可能性がある」
- 「練習のヒント」「試してみましょう」

### 10.2 将来的な対応

**データ収集後の判断**:
1. **精度差が確認できた場合** → 「実験的」バッジを継続、統計データを追加
2. **精度差が確認できない場合** → この分析を削除、または大幅変更
3. **改善効果が確認できた場合** → 「検証済み」バッジに変更

---

## 11. 関連ドキュメント

- **元の調査報告**: `PERM-premium-analysis-comprehensive-investigation-20251119`
- **APP_SPECIFICATION.md**: 脳内ピアノ理論の記述を「音階グループ分析（実験的）」に修正必要
- **CLAUDE.md**: 実験的機能の説明を追記

---

**承認状態**: ✅ ユーザー承認済み（2025-11-19）
**実装優先度**: 中（Phase 3実装時に同時実施推奨）
