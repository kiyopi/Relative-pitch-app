# 総合評価ページ仕様書

**作成日**: 2025-11-09
**バージョン**: 1.0.0
**最終更新日**: 2025-11-09

---

## 📋 概要

総合評価ページ（results-overview.html）の機能仕様を定義する。トレーニングセッション完了後に表示され、ユーザーの習熟度を包括的に評価し、次のステップを提案する。

### 対象ファイル
- `/PitchPro-SPA/pages/results-overview.html`
- `/PitchPro-SPA/pages/js/results-overview-controller.js`
- `/PitchPro-SPA/styles/results.css`
- `/PitchPro-SPA/styles/base.css`（次のステップカード）

---

## 🎯 ページの目的

### 主要機能
1. **総合評価表示**: グレード・平均誤差・成功率の視覚的表示
2. **詳細分析**: 音程別誤差・評価分布・正答率の詳細データ
3. **次のステップ提案**: ユーザーの次のアクションを明確に誘導

### 設計思想
- **Phase 2-1（現在）**: シンプルな評価表示 + アクション誘導に特化
- **Phase 3（今後）**: 12音律理論に基づく詳細分析レポートの追加

---

## 🏗️ 次のステップセクション仕様

### 設計コンセプト

#### Phase分離の原則
| Phase | 役割 | 内容 |
|---|---|---|
| **Phase 2-1（現在）** | アクション誘導 | シンプルな3カード（練習・挑戦・記録） |
| **Phase 3（今後）** | 詳細分析 | 12音律理論・弱点特定・改善提案 |

#### 旧実装との差異（意図的）
**旧実装（Bolt/results-freemium-basic-8sessions.html）**:
- 「現在の成果」「次の目標」「おすすめの練習方法」の3カード
- 情報提供型（振り返り + 目標設定 + アドバイス）
- 固定的な内容

**新実装（results-overview.html）**:
- 「もっと練習する」「次のレベルに挑戦」「成長の軌跡を確認」の3カード
- アクション誘導型（明確なCTAボタン）
- モード別の動的対応

**差異の理由**:
1. **Phase分離**: 総合評価はアクション、詳細分析は洞察（Phase 3）
2. **UX改善**: 明確なCTAで迷わない導線設計
3. **モード対応**: 各モード専用の最適な次ステップ提案
4. **将来拡張**: 下行モード・グレード別カスタマイズへの対応準備

---

## 📐 UIコンポーネント仕様

### 次のステップカード

#### レイアウト構造
```html
<div class="next-steps-grid">
  <div class="next-step-card">
    <div class="next-step-card-icon" style="background: [gradient]">
      <i data-lucide="[icon]"></i>
    </div>
    <h3 class="next-step-card-title">[タイトル]</h3>
    <p class="next-step-card-description">[説明文]</p>
    <button class="btn btn-primary">[ボタンテキスト]</button>
  </div>
</div>
```

#### CSS設計原則

**レスポンシブグリッド**:
```css
.next-steps-grid {
  display: grid;
  grid-template-columns: 1fr;        /* モバイル: 1列 */
  gap: 1rem;
}

@media (min-width: 768px) {
  .next-steps-grid {
    grid-template-columns: repeat(3, 1fr); /* PC: 3列 */
  }
}
```

**カードレイアウト（重要）**:
```css
.next-step-card {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  min-height: 280px;  /* カード最小高さを確保 */
}

.next-step-card-description {
  flex-grow: 1;       /* 説明文が可変領域を占める */
}

.next-step-card .btn {
  margin-top: auto;   /* ボタンを常に下部に配置 */
}
```

**設計ポイント**:
- `min-height: 280px` でカード高さを統一
- `flex-grow: 1` で説明文が可変領域を占める
- `margin-top: auto` でボタンを常に下部に配置
- **結果**: 説明文の長さに関わらず、全カードのボタン位置が揃う

#### 無効化カード（準備中機能用）
```css
.next-step-card.disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.next-step-card.disabled:hover {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(255, 255, 255, 0.1);
  transform: none; /* ホバーエフェクト無効化 */
}
```

---

## 🔧 JavaScript実装仕様

### モード別設定オブジェクト

```javascript
const nextStepsConfig = {
  'random': {
    practice: {
      icon: 'repeat',
      iconBg: 'linear-gradient(135deg, #3b82f6, #2563eb)',
      title: 'もっと練習する',
      description: '毎日5分の継続練習でさらなる上達を目指しましょう',
      buttonText: '同じモードで再挑戦',
      action: () => window.location.hash = 'training?mode=random'
    },
    upgrade: {
      icon: 'arrow-up-circle',
      iconBg: 'linear-gradient(135deg, #10b981, #059669)',
      title: '次のレベルに挑戦',
      description: '連続チャレンジモードで半音を含む12音に挑戦',
      buttonText: '連続チャレンジを開始',
      action: () => window.location.hash = 'training?mode=continuous'
    },
    records: {
      icon: 'trending-up',
      iconBg: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
      title: '成長の軌跡を確認',
      description: 'トレーニング記録であなたの上達を可視化',
      buttonText: '記録を見る',
      action: () => window.location.hash = 'records'
    }
  },
  'continuous': { /* 同様の構造 */ },
  'random-down': { /* 将来の下行モード対応 */ },
  'continuous-down': { /* 将来の下行モード対応 */ }
};
```

### 関数仕様: displayNextSteps

**シグネチャ**:
```javascript
function displayNextSteps(currentMode, evaluation)
```

**パラメータ**:
- `currentMode` (string): 現在のモード（'random', 'continuous', 'random-down', 'continuous-down'）
- `evaluation` (object): 評価結果（将来の拡張用、現在未使用）

**処理フロー**:
1. コンテナ要素の取得（`#next-steps-container`）
2. 現在のモードに対応する設定を取得（フォールバック: 'random'）
3. 3つのカード（practice, upgrade, records）を生成
4. Lucideアイコンの再初期化

**将来の拡張計画**:
```javascript
// Phase 3で実装予定
if (evaluation.grade === 'S' || evaluation.grade === 'A') {
  // S/A級ユーザーには上位モードを強調表示
  config.upgrade.description += '（優秀な成績です！）';
} else if (evaluation.grade === 'D' || evaluation.grade === 'E') {
  // D/E級ユーザーには練習継続を強調
  config.practice.description = '基礎を固めるために集中練習を続けましょう';
}
```

---

## 🎨 アイコン・カラー設計

### カードタイプ別アイコン

| カードタイプ | アイコン | カラー | 用途 |
|---|---|---|---|
| **practice** | `repeat` | 青グラデーション (#3b82f6 → #2563eb) | 同じモードで再挑戦 |
| **upgrade** | `arrow-up-circle` | 緑グラデーション (#10b981 → #059669) | 上位モードへの挑戦 |
| **upgrade (disabled)** | `lock` | グレーグラデーション (#6b7280 → #4b5563) | 準備中機能 |
| **records** | `trending-up` | 紫グラデーション (#8b5cf6 → #7c3aed) | トレーニング記録表示 |

### グラデーション設計原則
- **135度の対角線グラデーション**: `linear-gradient(135deg, [start], [end])`
- **同系色の明暗**: 視覚的に統一感を保つ
- **機能別色分け**: 練習=青、挑戦=緑、記録=紫、無効=グレー

---

## 🚀 将来拡張計画

### Phase 3: グレード別カスタマイズ

**S/A級ユーザー**:
- 上位モードへの挑戦を強調
- 「優秀な成績です！次のステージへ」等のメッセージ追加

**B/C級ユーザー**:
- バランスの取れた提案（練習継続 + 挑戦）
- 「着実に成長しています」等の励ましメッセージ

**D/E級ユーザー**:
- 練習継続を最優先で提案
- 「基礎を固めるために集中練習を」等のアドバイス強化

### Phase 4: 下行モード対応

**random-down**:
- 「下行での音程感覚をさらに磨きましょう」
- 連続チャレンジ（下行）への誘導

**continuous-down**:
- 「下行での12音律システム習得を完成させましょう」
- 12音階モード（下行）への誘導（準備中）

### Phase 5: 総合分析レポート連携

**現在の「次のステップ」**:
- シンプルなアクション誘導（3カード）

**Phase 3追加予定**:
- 詳細分析レポートセクション
- 12音律理論に基づく弱点特定
- AI による個別アドバイス
- 音程別集計・基音別習熟度マップ

---

## 📝 実装チェックリスト

### HTML実装
- [x] `#next-steps-container` コンテナの配置
- [x] `.next-steps-grid` クラスの適用
- [x] JavaScript動的生成の準備

### CSS実装
- [x] レスポンシブグリッド（1列 → 3列）
- [x] カードレイアウト（min-height, flex-grow, margin-top: auto）
- [x] ホバーエフェクト
- [x] 無効化スタイル（.disabled）
- [x] アイコングラデーション背景

### JavaScript実装
- [x] `displayNextSteps()` 関数実装
- [x] `nextStepsConfig` オブジェクト定義
- [x] 4モード対応（random, continuous, random-down, continuous-down）
- [x] Lucideアイコン再初期化
- [x] ハッシュルーティング連携

### UIカタログ
- [x] ui-catalog-components.html への追加
- [x] 3カードグリッドレイアウト例
- [x] 無効化カード例
- [x] 使用ガイドライン
- [x] 完全なコードサンプル

---

## 🔗 関連ドキュメント

- **設計思想**: `/CORE_INSIGHTS_REFERENCE.md`（モード別差別化）
- **アプリ仕様**: `/APP_SPECIFICATION.md`（モード定義）
- **評価システム**: `/PitchPro-SPA/specifications/EVALUATION_SYSTEM_SPECIFICATION.md`
- **動的グレード**: `/PitchPro-SPA/specifications/DYNAMIC_GRADE_LOGIC_SPECIFICATION.md`
- **UIカタログ**: `/UI-Catalog/ui-catalog-components.html`（次のステップカードセクション）

---

## 📊 変更履歴

### v1.0.0 (2025-11-09)
- 初版作成
- 次のステップセクション仕様の文書化
- 旧実装との差異説明の追加
- CSS設計原則の明文化（ボタン位置統一）
- 将来拡張計画の策定

---

## 📌 メモ

### 重要な設計判断
1. **Phase分離**: アクション誘導（Phase 2-1）と詳細分析（Phase 3）を明確に分離
2. **UX優先**: 明確なCTAボタンで次の行動を即座に実行可能
3. **モード対応**: 設定オブジェクトによる柔軟な管理で将来拡張に対応
4. **レイアウト最適化**: flex-grow + margin-top: auto でボタン位置を統一

### 今後の実装予定
- [ ] Phase 3: グレード別カスタマイズ実装
- [ ] Phase 4: 下行モード対応（設定は準備完了、モード実装待ち）
- [ ] Phase 5: 総合分析レポートとの連携
- [ ] A/Bテスト: カードデザイン・メッセージ最適化
