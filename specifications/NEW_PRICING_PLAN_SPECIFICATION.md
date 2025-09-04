# 新課金プラン仕様書

**バージョン**: 1.0.0  
**作成日**: 2025-08-21  
**目的**: カスタムモード導入に伴う課金プラン再設計  
**適用**: 次期バージョンリリース時

---

## 🎯 課金プラン概要

### **基本方針**
```
無料プラン：ランダムモード（基本体験）
有料プラン：連続・12音・カスタムモード（本格上達）
```

### **戦略的意図**
- **間口を広げる**: 誰でも音感トレーニングを体験可能
- **価値で課金**: 上達支援機能で明確な付加価値提供
- **継続利用**: 分析・記録機能で解約抑制

---

## 📊 プラン詳細

### **🆓 無料プラン: ベーシック**

#### **利用可能機能**
```
✅ ランダム基音モード
  - 8セッション基音ランダム
  - 基本的な総合評価グラフ
  - セッション別成績表示
  - S-E級グレード判定

✅ 基本UI機能
  - トレーニング実行
  - 即時フィードバック
  - 基本統計情報
```

#### **制限事項**
```
❌ 詳細分析レポート
❌ 長期進捗トラッキング
❌ 音程別精密分析
❌ 改善提案・アドバイス
❌ データエクスポート
❌ 連続・12音・カスタムモード
```

### **💎 有料プラン: プレミアム**

#### **利用可能機能**
```
✅ 全モード利用可能
  - ランダム基音モード（8セッション）
  - 連続チャレンジモード（12セッション）
  - 12音階マスターモード（24セッション）
  - カスタム弱点克服モード（新機能）

✅ 高度分析機能
  - 詳細音程分析
  - 弱点特定システム
  - 長期進捗トラッキング
  - AI改善提案

✅ データ管理
  - 無制限データ保存
  - CSV/PDFエクスポート
  - バックアップ・復元

✅ 専用機能
  - カスタム練習設定
  - 進捗予測
  - 優先サポート
```

---

## 💰 価格設定

### **料金体系**
```javascript
const pricingPlan = {
  free: {
    name: 'ベーシック',
    price: 0,
    period: '永続無料',
    limitations: ['ランダムモードのみ', '基本評価のみ']
  },
  premium: {
    name: 'プレミアム',
    monthlyPrice: 480, // 月額
    yearlyPrice: 3600, // 年額（25%割引）
    yearlyDiscount: '25%オフ',
    period: '月額/年額選択可能'
  }
};
```

### **価格設定根拠**
1. **競合調査**: 音楽アプリ平均400-600円
2. **価値提供**: 詳細分析+カスタムモードの独自価値
3. **継続性**: 手頃な価格での継続利用促進

---

## 🔄 課金フロー設計

### **無料→有料転換ポイント**

#### **1. ランダムモード完了時**
```
┌─────────────────────────────┐
│   🎉 ランダムモード完了！   │
├─────────────────────────────┤
│ あなたの総合評価：B級       │
│ 平均誤差：18.5¢            │
│                             │
│ 🚀 さらなる上達を目指す？   │
│                             │
│ プレミアムで利用可能：      │
│ • より詳しい分析結果        │
│ • 弱点を集中克服           │
│ • 12音階マスター練習       │
│                             │
│ ［プレミアムを試す］        │
│ ［続けて無料で練習］        │
└─────────────────────────────┘
```

#### **2. 分析結果表示時**
```
┌─────────────────────────────┐
│     📊 基本分析結果         │
├─────────────────────────────┤
│ 総合グレード：C級           │
│ 今回のスコア：65.2点        │
│                             │
│ 💡 プレミアム限定           │
│ ［詳細分析を見る］          │
│ ・音程別の詳しい成績        │
│ ・具体的な改善アドバイス    │
│ ・弱点克服のカスタム練習    │
│                             │
│ ［7日間無料で試す］         │
└─────────────────────────────┘
```

### **課金完了後の体験**
```javascript
const premiumOnboarding = {
  step1: '詳細分析結果の表示',
  step2: '弱点音程の特定',
  step3: 'カスタムモード設定提案',
  step4: '初回カスタム練習実行',
  step5: '改善効果の実感'
};
```

---

## 🎨 UI/UX変更点

### **トップページの更新**
```html
<!-- index.html更新箇所 -->
<section class="upgrade-promotion">
  <div class="promotion-card">
    <h2>🎯 次期アップデート予告</h2>
    <h3>カスタム弱点克服モード 近日登場！</h3>
    <p>あなたの苦手な音程を集中的に練習。詳細分析で見つけた弱点を効率的に克服できる革新的モードです。</p>
    <ul class="feature-list">
      <li>10種類の音程から選択可能</li>
      <li>詳細分析結果から自動提案</li>
      <li>集中練習で効率的な上達</li>
    </ul>
    <div class="cta-buttons">
      <button class="btn-premium">プレミアムで先行体験予約</button>
      <button class="btn-learn-more">詳しく見る</button>
    </div>
  </div>
</section>
```

### **モード選択画面の更新**
```javascript
// mode-selection.html の構造
const modeCards = [
  {
    id: 'random',
    name: 'ランダム基音',
    status: 'free',
    description: '基本の相対音感トレーニング',
    sessions: 8
  },
  {
    id: 'continuous', 
    name: '連続チャレンジ',
    status: 'premium',
    description: '中級レベルの継続練習',
    sessions: 12
  },
  {
    id: 'chromatic',
    name: '12音階マスター', 
    status: 'premium',
    description: '全12音での上級練習',
    sessions: 24
  },
  {
    id: 'custom',
    name: 'カスタム弱点克服',
    status: 'premium-coming-soon',
    description: '苦手音程の集中トレーニング',
    badge: '近日公開'
  }
];
```

### **課金促進UI要素**
```css
.premium-badge {
  background: linear-gradient(135deg, #fbbf24, #d97706);
  color: white;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 0.75rem;
}

.coming-soon-badge {
  background: linear-gradient(135deg, #3b82f6, #1d4ed8);
  color: white;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 0.75rem;
  animation: pulse 2s infinite;
}

.upgrade-promotion {
  background: linear-gradient(135deg, #1e1b4b, #312e81);
  padding: 2rem;
  border-radius: 12px;
  margin: 2rem 0;
  border: 2px solid #fbbf24;
}
```

---

## 📈 収益予測・KPI

### **ターゲットメトリクス**
```javascript
const revenueTargets = {
  monthlyActiveUsers: 10000,
  freeToTrialConversion: 0.15, // 15%
  trialToPaidConversion: 0.25, // 25%
  monthlyChurn: 0.05, // 5%
  
  projectedMonthlyRevenue: {
    subscribers: 375, // 10000 * 0.15 * 0.25
    averageRevenue: 420, // 月額+年額の平均
    totalRevenue: 157500 // 月額約16万円
  }
};
```

### **成功指標**
1. **フリートライアル転換率**: 15%以上
2. **有料転換率**: 25%以上  
3. **月次解約率**: 5%以下
4. **平均利用期間**: 8ヶ月以上

---

## 🎯 マーケティング戦略

### **リリース前（予告期間）**
```
期間：4週間
目標：期待値醸成・事前登録獲得

施策：
- トップページでの告知
- SNSでの段階的情報公開
- β版テスター募集
- プレミアム先行体験予約受付
```

### **リリース時**
```
期間：リリース後2週間
目標：初期ユーザー獲得・話題化

施策：
- 7日間無料トライアル
- 「弱点克服チャレンジ」キャンペーン
- 使用事例・成功体験の紹介
- インフルエンサー連携
```

### **リリース後（定着期間）**
```
期間：継続的
目標：継続率向上・口コミ拡散

施策：
- 定期的な機能追加告知
- ユーザーコミュニティ形成
- 成果報告会・オンラインイベント
- レビュー促進施策
```

---

## 🔧 技術実装要件

### **課金システム連携**
```javascript
// 既存システムとの統合
const subscriptionManager = {
  checkPremiumStatus: (userId) => boolean,
  restrictPremiumFeatures: (feature) => void,
  showUpgradePrompt: (context) => void,
  
  // 新機能
  trackFeatureUsage: (userId, feature) => void,
  suggestUpgrade: (userBehavior) => object
};
```

### **A/Bテスト基盤**
```javascript
const abTestConfig = {
  pricingDisplay: {
    variants: ['monthly-first', 'yearly-first', 'discount-emphasis'],
    metric: 'conversion-rate'
  },
  upgradePrompt: {
    variants: ['immediate', 'after-analysis', 'progressive'],
    metric: 'trial-signup-rate'  
  }
};
```

---

## ⚠️ リスク管理

### **収益リスク**
1. **競合価格競争**: 価格調整余地の確保
2. **機能価値の低下**: 継続的な機能向上
3. **解約率上昇**: ユーザー満足度モニタリング

### **技術リスク**  
1. **課金システム障害**: 冗長化・監視強化
2. **データ移行問題**: 段階的移行計画
3. **パフォーマンス劣化**: 負荷テスト強化

### **UXリスク**
1. **課金圧迫感**: 自然な誘導設計
2. **機能複雑化**: シンプルさの維持
3. **既存ユーザー離反**: 丁寧な移行サポート

---

## 🚀 ロードマップ

### **Phase 1: 基盤整備（4週間）**
- カスタムモード開発
- 課金システム統合
- UI/UX実装

### **Phase 2: β版リリース（2週間）**
- 限定ユーザーでのテスト
- フィードバック収集・改善
- 最終調整

### **Phase 3: 正式リリース（継続）**
- 全ユーザー向け公開
- マーケティング展開
- 継続改善・機能追加

---

**この新課金プランにより、アプリは「基本無料・価値課金」モデルで持続可能な収益構造を確立し、ユーザーには明確な価値を提供する革新的な相対音感トレーニングプラットフォームとして発展します。**