# プレミアムデータ保存期間管理仕様書

**バージョン**: v1.2.0
**作成日**: 2025年10月27日
**最終更新**: 2025年10月27日
**実装対象**: data-manager.js v2.1.0 + SocialShareManager（新規実装予定）

---

## 📋 目次

1. [概要](#概要)
2. [背景と目的](#背景と目的)
3. [バイラルマーケティング戦略](#バイラルマーケティング戦略)
4. [データサイズ分析](#データサイズ分析)
5. [保存期間仕様](#保存期間仕様)
6. [実装設計](#実装設計)
7. [SNSシェア機能実装](#snsシェア機能実装)
8. [容量管理システム](#容量管理システム)
9. [Phase 2拡張計画](#phase-2拡張計画)

---

## 概要

### 目的
フリーミアム収益モデルにおける、無料プラン・プレミアムプランのデータ保存期間差別化を実現する。

### 設計方針
- **バックエンド不要**: localStorage完結型（コスト最小化）
- **シンプル実装**: Phase 1で基本機能実装（デバッグ優先）
- **段階的拡張**: Phase 2でPDF/CSV出力追加

### 対象範囲
- **無料プラン**: 7日分データ保存
- **プレミアムプラン**: 無制限データ保存（容量制限内）

---

## 背景と目的

### 収益化戦略との整合性

#### フリーミアムモデル（RELEASE_AND_MONETIZATION_PLAN.md準拠）

**重要な戦略変更（v1.2.0）**:
- ✅ **無料プランでも総合評価を完全表示** - シェア促進のため
- ✅ **SNSシェア機能を最優先実装** - バイラルマーケティングの核心
- ✅ **データは保存しない** - プレミアムへの動機付け

```typescript
const pricingModel = {
  free: {
    price: "¥0",
    features: [
      "ランダム基音モード無制限利用",
      "セッション完了時に総合評価表示",    // ← 重要変更
      "SNSシェア機能（Twitter/LINE等）",  // ← 新規追加
      "データ保存なし（履歴非表示）",      // ← 本仕様で実装
      "広告表示あり"
    ],
    restrictions: [
      "連続チャレンジモード: アクセス不可",
      "12音階モード: アクセス不可",
      "練習履歴: 保存されない",
      "総合評価画面（履歴）: データなし"
    ]
  },

  premium: {
    price: "¥480/月 or ¥4,800/年",
    features: [
      "全モード無制限利用",
      "全ての練習データを自動保存",       // ← 差別化ポイント
      "総合評価画面で履歴確認",
      "詳細分析レポート",               // ← Phase 2で実装
      "結果のPDF/CSV出力",             // ← Phase 2で実装
      "広告完全除去",
      "カスタムトレーニング作成",
      "オフライン練習対応",
      "優先サポート"
    ]
  }
};
```

### バイラルマーケティング戦略

#### 成長ループの設計
```
無料ユーザー（練習）
↓
総合評価表示（美しいデザイン）
↓
SNSシェアボタンをクリック
↓
Twitter/Instagram/LINEで投稿
↓
フォロワーが見る
↓
「このアプリ面白そう！」
↓
リンクからアプリへアクセス
↓
新規ユーザー獲得 🎉
↓
無料ユーザー（練習）→ループ継続
```

#### SNSシェアの重要性
1. **認知拡大**: 無料で最大のマーケティング効果
2. **社会的証明**: 友達が使っているアプリは信頼される
3. **競争心理**: 「自分も挑戦したい」という欲求
4. **自然な流入**: 広告費ゼロでユーザー獲得

#### シェアしたくなる要素
- ✅ 美しいグラデーション背景
- ✅ 大きく目立つグレード表示（S/A/B/C）
- ✅ 評価分布の視覚化
- ✅ アプリURL・ハッシュタグ自動挿入
- ✅ ワンタップでシェア可能

### なぜバックエンドを使わないのか

#### 1. アプリの特性
- **完全クライアント完結型**: 音声処理・評価・保存すべてブラウザ内で完結
- **ユーザー間データ共有不要**: 個人練習データのみ管理
- **リアルタイム同期不要**: オフライン完全対応が強み

#### 2. コスト面の優位性
| 項目 | バックエンドなし | バックエンドあり |
|------|-----------------|-----------------|
| ホスティング | GitHub Pages（無料） | サーバー月額¥5,000+ |
| データベース | 不要 | 月額¥3,000+ |
| 運用監視 | 不要 | 月額¥2,000+ |
| スケール対応 | 不要（ユーザー増加でも無料） | 必要（従量課金） |
| **月額合計** | **¥0** | **¥10,000+** |

#### 3. 技術的メリット
- ✅ **オフライン完全対応**: ネットワーク不要で練習可能
- ✅ **高速レスポンス**: サーバー通信なしで即座にデータ保存
- ✅ **プライバシー保護**: データがデバイス内のみに保存
- ✅ **スケールの心配なし**: ユーザー増加でもインフラコストなし

#### 4. 将来的な拡張性
- 必要になったら段階的にバックエンド導入可能
- Phase 2で**ダウンロード機能**実装（ユーザー自己管理）
- ユーザー要望に応じて段階的にクラウド同期検討

---

## データサイズ分析

### セッションデータ構造

#### 実際のJSONデータ例
```json
{
  "sessionId": 1,
  "mode": "random",
  "baseNote": "C4",
  "baseFrequency": 261.63,
  "startTime": 1730000000000,
  "endTime": 1730000180000,
  "duration": 180000,
  "completed": true,
  "pitchErrors": [
    {
      "step": 0,
      "expectedNote": "C4",
      "expectedFrequency": 261.63,
      "detectedFrequency": 263.45,
      "errorInCents": 12.5,
      "clarity": 0.985,
      "volume": 0.745,
      "timestamp": 1730000010000
    }
    // ... 7回分（ド～ド）
  ]
}
```

### サイズ内訳

#### セッション基本情報: 約200バイト
```
sessionId: 4バイト
mode: 15バイト
baseNote: 10バイト
baseFrequency: 8バイト
startTime: 13バイト
endTime: 13バイト
duration: 8バイト
completed: 5バイト
JSON構造（括弧・カンマ等）: 約140バイト
```

#### 1ステップ（音程データ）: 約150バイト
```
step: 4バイト
expectedNote: 10バイト
expectedFrequency: 8バイト
detectedFrequency: 8バイト
errorInCents: 8バイト
clarity: 8バイト
volume: 8バイト
timestamp: 13バイト
JSON構造（括弧・カンマ等）: 約83バイト
```

#### 8ステップ分: 1,200バイト
```
150バイト × 8ステップ = 1,200バイト
```

### **1セッション合計**: 約 **1,400バイト（1.4KB）**

---

## 容量シミュレーション

### 無料プラン（7日分保存）
```
想定利用: 1日3セッション × 7日 = 21セッション
データ量: 21セッション × 1.4KB = 29.4KB

→ localStorage制限5MBの約0.6%使用（全く問題なし）
```

### プレミアムプラン（無制限）

#### 1年間の利用
```
想定利用: 1日5セッション × 365日 = 1,825セッション
データ量: 1,825セッション × 1.4KB = 2,555KB（約2.5MB）

→ localStorage制限5MBの約50%使用（十分な余裕）
```

#### 2年間の利用
```
想定利用: 1日5セッション × 730日 = 3,650セッション
データ量: 3,650セッション × 1.4KB = 5,110KB（約5MB）

→ localStorage制限5MBの約100%使用（上限到達）
```

### 最大保存可能セッション数
```
5MB（localStorage上限） ÷ 1.4KB（1セッション） = 約3,571セッション

→ 1日5セッションで約714日分（約2年分）保存可能
```

### 結論

| プラン | 保存期間 | データ量 | localStorage使用率 | 評価 |
|-------|---------|---------|-------------------|------|
| 無料 | 7日分 | 約30KB | 0.6% | ✅ 全く問題なし |
| プレミアム | 1年分 | 約2.5MB | 50% | ✅ 十分な余裕 |
| プレミアム | 2年分 | 約5MB | 100% | ⚠️ 上限到達 |

**判断**:
- 無料プランは容量心配なし
- プレミアムプランは1年以上余裕で保存可能
- 4MB到達時に警告表示（推奨安全マージン）

---

## 保存期間仕様

### プラン別保存ポリシー（v1.2.0更新）

#### 無料プラン（ランダム基音モード）
```typescript
{
  mode: 'random',
  accessControl: 'unlimited', // アクセス無制限
  sessionEvaluation: 'full_display', // 総合評価を完全表示
  socialShare: 'enabled', // SNSシェア機能利用可能
  dataRetention: 'no_save', // データは保存しない
  historyAccess: 'no_data', // 履歴画面にデータなし
  upgradeIncentive: '練習履歴を記録したい → プレミアムへ'
}
```

**重要な戦略的変更点（v1.2.0）**:
- ✅ **総合評価を完全表示** - シェア促進のため、評価は全て見せる
- ✅ **SNSシェア機能利用可能** - バイラルマーケティングの核心
- ✅ **データは保存しない** - プレミアムへの明確な動機付け
- ✅ **履歴は空っぽ** - 「過去と比較したい」という欲求を生む

#### 無料プラン（連続・12音階モード）
```typescript
{
  mode: 'continuous' | '12-tone',
  accessControl: 'locked', // アクセス不可（プレミアム限定）
  upgradeRequired: true
}
```

#### プレミアムプラン
```typescript
{
  retentionPeriod: 'unlimited',
  dataRetention: 'keep_all', // 全データ保持
  displayPolicy: 'show_all', // 全データ表示
  maxSessions: 3571, // localStorage容量制限（約2年分）
  autoCleanup: 'on_capacity_warning', // 容量警告時のみ
  cleanupLogic: '4MB超過時、古い順に削除（最新100件保持）'
}
```

### クリーンアップトリガー

#### 無料プラン: データ削除なし
```typescript
// セッション保存 → クリーンアップチェック
saveSessionResult(sessionData) → cleanupSessionData()

// データは削除されない、表示制限のみ適用
// ログ: "📊 無料プラン: 100件保存中、10件表示可能（7日以内のみ）"
```

#### プレミアムプラン: 容量警告時のみ
```typescript
// セッション保存 → 容量チェック → 必要に応じてクリーンアップ
saveSessionResult(sessionData) → checkStorageUsage()
  ↓ (容量 > 4MB時)
cleanupSessionData() // 最新100件のみ保持
```

---

## 実装設計

### 拡張メソッド一覧

#### 1. `cleanupSessionData()`
**目的**: プラン別の自動データクリーンアップ

```typescript
/**
 * セッションデータの自動クリーンアップ
 * 無料: 7日より古いデータを削除
 * プレミアム: 容量超過時のみ削除
 *
 * @returns {number} クリーンアップ後のセッション数
 */
static cleanupSessionData() {
  const subscriptionData = this.getSubscriptionData();
  const isPremium = subscriptionData.premiumAccess.status === 'active';
  const sessions = this.getFromStorage(this.KEYS.SESSION_DATA) || [];

  if (!isPremium) {
    // 無料: 7日より古いデータを削除
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const filteredSessions = sessions.filter(session =>
      new Date(session.startTime) > sevenDaysAgo
    );

    this.saveToStorage(this.KEYS.SESSION_DATA, filteredSessions);
    console.log(`🗑️ 無料プラン: ${sessions.length - filteredSessions.length}件の古いセッションを削除`);
    return filteredSessions.length;

  } else {
    // プレミアム: 容量チェックのみ
    const storageUsage = this.getStorageUsage();

    if (storageUsage.totalSize > 4 * 1024 * 1024) { // 4MB超過
      // 古い順に削除（最新100件を保持）
      const sortedSessions = sessions.sort((a, b) =>
        new Date(b.startTime) - new Date(a.startTime)
      );
      const trimmedSessions = sortedSessions.slice(0, 100);

      this.saveToStorage(this.KEYS.SESSION_DATA, trimmedSessions);
      console.log(`⚠️ プレミアム: 容量超過のため${sessions.length - 100}件削除`);
      return trimmedSessions.length;
    }

    console.log(`✅ プレミアム: ${sessions.length}件保持中（容量正常）`);
    return sessions.length;
  }
}
```

#### 2. `saveSessionResultWithCleanup()`
**目的**: 保存時に自動クリーンアップを実行

```typescript
/**
 * データ保存時の自動クリーンアップ付き保存
 *
 * @param {Object} sessionData - セッションデータ
 * @returns {Object} 保存されたセッション
 */
static saveSessionResultWithCleanup(sessionData) {
  // 通常の保存処理
  const savedSession = this.saveSessionResult(sessionData);

  // 自動クリーンアップ実行
  this.cleanupSessionData();

  return savedSession;
}
```

#### 3. `getDataRetentionInfo()`
**目的**: 保存状況の可視化（設定画面・デバッグ用）

```typescript
/**
 * プレミアム専用: 保存可能期間を取得
 *
 * @returns {Object} データ保存状況
 */
static getDataRetentionInfo() {
  const subscriptionData = this.getSubscriptionData();
  const isPremium = subscriptionData.premiumAccess.status === 'active';
  const sessions = this.getFromStorage(this.KEYS.SESSION_DATA) || [];

  if (sessions.length === 0) {
    return {
      retentionPeriod: isPremium ? 'unlimited' : '7days',
      oldestSession: null,
      totalSessions: 0,
      storageUsage: this.getStorageUsage()
    };
  }

  const sortedSessions = sessions.sort((a, b) =>
    new Date(a.startTime) - new Date(b.startTime)
  );
  const oldestSession = sortedSessions[0];
  const daysSinceOldest = Math.floor(
    (new Date() - new Date(oldestSession.startTime)) / (1000 * 60 * 60 * 24)
  );

  return {
    retentionPeriod: isPremium ? 'unlimited' : '7days',
    oldestSession: oldestSession.startTime,
    oldestSessionDate: new Date(oldestSession.startTime).toLocaleDateString('ja-JP'),
    daysSinceOldest,
    totalSessions: sessions.length,
    storageUsage: this.getStorageUsage(),
    isPremium
  };
}
```

#### 4. `checkStorageWarning()`
**目的**: 容量警告チェック（UI表示用）

```typescript
/**
 * 容量警告チェック
 *
 * @returns {Object} 警告情報
 */
static checkStorageWarning() {
  const usage = this.getStorageUsage();
  const usagePercent = usage.usage;

  if (usagePercent >= 80) {
    return {
      level: 'critical',
      message: 'ストレージ容量が80%を超えています。古いデータが自動削除されます。',
      usagePercent,
      totalMB: usage.totalMB,
      shouldCleanup: true
    };
  } else if (usagePercent >= 60) {
    return {
      level: 'warning',
      message: 'ストレージ容量が60%を超えています。',
      usagePercent,
      totalMB: usage.totalMB,
      shouldCleanup: false
    };
  }

  return {
    level: 'normal',
    message: 'ストレージ容量は正常です。',
    usagePercent,
    totalMB: usage.totalMB,
    shouldCleanup: false
  };
}
```

---

## SNSシェア機能実装

### 設計方針

#### 戦略的重要性
SNSシェア機能は**バイラルマーケティングの核心**であり、以下の理由で最優先実装:

1. **ゼロコストマーケティング**: 広告費なしで新規ユーザー獲得
2. **社会的証明効果**: 友達が使っているアプリは信頼される
3. **競争心理の活用**: 他人の成績を見て「自分も挑戦したい」
4. **自然な流入**: SNSから直接アプリへ誘導

#### 実装優先度
```
Phase 1: SNSシェア機能（最優先）
  ↓
Phase 2: データ出力機能（次優先）
  ↓
Phase 3: 詳細分析機能（将来）
```

### SocialShareManager クラス設計

#### クラス構成
```typescript
/**
 * SNSシェア統合管理クラス
 *
 * 機能:
 * - シェアテキスト生成
 * - Twitter/LINE/Instagram対応
 * - 結果画像生成（OGP対応）
 * - Web Share API統合
 */
class SocialShareManager {
  // テキスト生成
  static generateShareText(sessionResult)

  // プラットフォーム別シェア
  static shareToTwitter(sessionResult)
  static shareToLine(sessionResult)
  static shareToInstagram(sessionResult)

  // ネイティブシェア（モバイル対応）
  static async shareNative(sessionResult)

  // 画像生成（OGP対応）
  static async generateResultImage(sessionResult)
}
```

### シェアテキスト生成

#### テンプレート設計
```typescript
static generateShareText(sessionResult) {
  const { grade, totalScore, excellentCount, goodCount, passCount } = sessionResult;

  // グレード別絵文字
  const gradeEmoji = {
    'S': '🏆',
    'A': '⭐',
    'B': '👍',
    'C': '💪'
  };

  return `${gradeEmoji[grade]} 相対音感トレーニング結果

グレード: ${grade}
スコア: ${totalScore}点
────────────
✨ Excellent: ${excellentCount}個
✅ Good: ${goodCount}個
📊 Pass: ${passCount}個
────────────
あなたも挑戦してみよう！
👉 https://pitch-training.app

#相対音感 #音感トレーニング #カラオケ上達 #8va`;
}
```

#### テキスト例（実際の表示）
```
🏆 相対音感トレーニング結果

グレード: S
スコア: 95点
────────────
✨ Excellent: 6個
✅ Good: 2個
📊 Pass: 0個
────────────
あなたも挑戦してみよう！
👉 https://pitch-training.app

#相対音感 #音感トレーニング #カラオケ上達 #8va
```

### プラットフォーム別実装

#### Twitter シェア
```typescript
static shareToTwitter(sessionResult) {
  const text = this.generateShareText(sessionResult);
  const url = 'https://pitch-training.app';
  const hashtags = '相対音感,音感トレーニング,カラオケ上達';

  // Twitter Intent URL（公式API）
  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}&hashtags=${hashtags}`;

  // 新しいウィンドウで開く（モバイル対応）
  window.open(twitterUrl, '_blank', 'width=600,height=400');

  console.log('🐦 Twitterシェア実行');
}
```

#### LINE シェア
```typescript
static shareToLine(sessionResult) {
  const text = this.generateShareText(sessionResult);
  const url = 'https://pitch-training.app';

  // LINE Social Plugins（公式API）
  const lineUrl = `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;

  window.open(lineUrl, '_blank', 'width=600,height=400');

  console.log('💬 LINEシェア実行');
}
```

#### Instagram シェア（画像ダウンロード方式）
```typescript
static async shareToInstagram(sessionResult) {
  // Instagram: 直接シェアAPIなし → 画像ダウンロード方式

  // 1. 結果画像を生成
  const imageDataUrl = await this.generateResultImage(sessionResult);

  // 2. ダウンロードリンク作成
  const link = document.createElement('a');
  link.href = imageDataUrl;
  link.download = `pitch-training-result-${new Date().toISOString().split('T')[0]}.png`;
  link.click();

  // 3. ユーザーに説明表示
  alert('画像を保存しました！\\nInstagramアプリで投稿してください。\\n\\nキャプション例:\\n🎵 相対音感トレーニング結果\\nあなたも挑戦してみよう！\\n👉 https://pitch-training.app\\n\\n#相対音感 #音感トレーニング #カラオケ上達');

  console.log('📸 Instagram用画像ダウンロード完了');
}
```

### Web Share API（ネイティブシェア）

#### モバイル最適化実装
```typescript
static async shareNative(sessionResult) {
  // Web Share API対応チェック
  if (!navigator.share) {
    console.warn('⚠️ Web Share API非対応 - フォールバック実行');
    return this.shareToTwitter(sessionResult); // Twitterにフォールバック
  }

  try {
    // ネイティブシェア実行
    await navigator.share({
      title: '🎵 相対音感トレーニング結果',
      text: this.generateShareText(sessionResult),
      url: 'https://pitch-training.app'
    });

    console.log('✅ ネイティブシェア成功');
    return true;

  } catch (error) {
    if (error.name === 'AbortError') {
      console.log('ℹ️ ユーザーがシェアをキャンセル');
    } else {
      console.error('❌ シェアエラー:', error);
    }
    return false;
  }
}
```

### 結果画像生成（OGP対応）

#### Canvas描画実装
```typescript
static async generateResultImage(sessionResult) {
  const { grade, totalScore, excellentCount, goodCount, passCount } = sessionResult;

  // Canvas作成（OGP標準サイズ）
  const canvas = document.createElement('canvas');
  canvas.width = 1200;
  canvas.height = 630;

  const ctx = canvas.getContext('2d');

  // 1. グラデーション背景
  const gradient = ctx.createLinearGradient(0, 0, 1200, 630);
  gradient.addColorStop(0, '#667eea'); // 紫
  gradient.addColorStop(1, '#764ba2'); // 濃紫
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 1200, 630);

  // 2. タイトル描画
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 80px Inter';
  ctx.textAlign = 'center';
  ctx.fillText('🎵 結果発表 🎵', 600, 120);

  // 3. グレード表示（大）
  ctx.font = 'bold 160px Inter';
  ctx.fillText(`グレード: ${grade}`, 600, 280);

  // 4. スコア表示
  ctx.font = 'bold 100px Inter';
  ctx.fillText(`${totalScore}点`, 600, 400);

  // 5. 評価分布
  ctx.font = '40px Inter';
  ctx.fillText(`✨ Excellent: ${excellentCount}  ✅ Good: ${goodCount}  📊 Pass: ${passCount}`, 600, 500);

  // 6. アプリURL
  ctx.font = 'bold 36px Inter';
  ctx.fillText('pitch-training.app', 600, 580);

  // 7. PNG形式で出力
  return canvas.toDataURL('image/png');
}
```

#### 画像サンプル（視覚イメージ）
```
┌─────────────────────────────────────────┐
│  グラデーション背景（紫〜濃紫）           │
│                                         │
│         🎵 結果発表 🎵                   │
│                                         │
│         グレード: S                      │
│                                         │
│            95点                          │
│                                         │
│  ✨ Excellent: 6  ✅ Good: 2  📊 Pass: 0 │
│                                         │
│       pitch-training.app                │
└─────────────────────────────────────────┘
サイズ: 1200×630px（Twitter/Facebook OGP標準）
```

### UI実装例

#### 結果画面へのシェアボタン統合
```html
<!-- トレーニング結果画面（trainingController.js） -->
<div class="glass-card result-summary">
  <h2 class="heading-lg">
    <i data-lucide="trophy"></i>
    <span>トレーニング結果</span>
  </h2>

  <!-- グレード表示 -->
  <div class="grade-display">
    <span class="grade-badge grade-S">グレード: S</span>
    <span class="score-value">95点</span>
  </div>

  <!-- 評価分布 -->
  <div class="evaluation-distribution">
    <!-- 省略 -->
  </div>

  <!-- SNSシェアボタン（重要！） -->
  <div class="share-section">
    <h4 class="heading-md">
      <i data-lucide="share-2"></i>
      <span>結果をシェア</span>
    </h4>

    <div class="share-buttons">
      <!-- ネイティブシェア（モバイル優先） -->
      <button class="btn-primary btn-share" onclick="shareResult('native')">
        <i data-lucide="share-2"></i>
        <span>シェア</span>
      </button>

      <!-- Twitter -->
      <button class="btn-twitter btn-share" onclick="shareResult('twitter')">
        <i data-lucide="twitter"></i>
        <span>Twitter</span>
      </button>

      <!-- LINE -->
      <button class="btn-line btn-share" onclick="shareResult('line')">
        <svg><!-- LINE icon --></svg>
        <span>LINE</span>
      </button>

      <!-- Instagram -->
      <button class="btn-instagram btn-share" onclick="shareResult('instagram')">
        <i data-lucide="instagram"></i>
        <span>Instagram</span>
      </button>
    </div>

    <!-- 無料ユーザーへの注意 -->
    <p class="text-sm text-white-60">
      ℹ️ この結果は保存されません。履歴を記録するにはプレミアムプランへ。
    </p>
  </div>
</div>
```

#### JavaScript実装例
```typescript
// trainingController.js 内
async function shareResult(platform) {
  // 現在のセッション結果を取得
  const sessionResult = {
    grade: currentSession.grade,
    totalScore: currentSession.totalScore,
    excellentCount: currentSession.excellentCount,
    goodCount: currentSession.goodCount,
    passCount: currentSession.passCount
  };

  // プラットフォーム別シェア実行
  switch (platform) {
    case 'native':
      await SocialShareManager.shareNative(sessionResult);
      break;
    case 'twitter':
      SocialShareManager.shareToTwitter(sessionResult);
      break;
    case 'line':
      SocialShareManager.shareToLine(sessionResult);
      break;
    case 'instagram':
      await SocialShareManager.shareToInstagram(sessionResult);
      break;
    default:
      console.error('❌ 不明なシェアプラットフォーム:', platform);
  }

  // アナリティクス記録（将来実装）
  console.log(`📊 シェア実行: ${platform}`);
}
```

### CSS実装例

#### シェアボタンスタイル
```css
/* シェアセクション */
.share-section {
  margin-top: 2rem;
  padding: 1.5rem;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
}

/* シェアボタングリッド */
.share-buttons {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 1rem;
  margin-top: 1rem;
}

/* 基本シェアボタンスタイル */
.btn-share {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  border: none;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  transition: transform 0.2s;
}

.btn-share:hover {
  transform: translateY(-2px);
}

/* プラットフォーム別カラー */
.btn-twitter {
  background: #1DA1F2;
  color: white;
}

.btn-line {
  background: #00B900;
  color: white;
}

.btn-instagram {
  background: linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%);
  color: white;
}

/* レスポンシブ対応 */
@media (max-width: 640px) {
  .share-buttons {
    grid-template-columns: 1fr;
  }
}
```

### テスト計画

#### 単体テスト
```typescript
// テストケース1: テキスト生成
const result = {
  grade: 'S',
  totalScore: 95,
  excellentCount: 6,
  goodCount: 2,
  passCount: 0
};
const text = SocialShareManager.generateShareText(result);
assert(text.includes('グレード: S'));
assert(text.includes('95点'));

// テストケース2: 画像生成
const imageDataUrl = await SocialShareManager.generateResultImage(result);
assert(imageDataUrl.startsWith('data:image/png;base64,'));

// テストケース3: Web Share API検出
if (navigator.share) {
  console.log('✅ Web Share API対応');
} else {
  console.log('⚠️ フォールバック必要');
}
```

#### 統合テスト
```
1. トレーニング完了
2. 結果画面表示
3. Twitterシェアボタンクリック
4. 新しいウィンドウでTwitter投稿画面表示確認
5. テキスト・URL・ハッシュタグ正常表示確認
```

### 実装優先度

#### Phase 1: 基本実装（1-2日）
- ✅ `SocialShareManager` クラス作成
- ✅ `generateShareText()` 実装
- ✅ `shareToTwitter()` 実装
- ✅ `shareToLine()` 実装
- ✅ 結果画面へのシェアボタン追加

#### Phase 2: 高度機能（2-3日）
- ⏳ `generateResultImage()` Canvas実装
- ⏳ `shareToInstagram()` 画像ダウンロード実装
- ⏳ `shareNative()` Web Share API統合
- ⏳ レスポンシブUI調整

#### Phase 3: 最適化（1日）
- ⏳ OGPメタタグ設定
- ⏳ シェア画像プレビュー機能
- ⏳ アナリティクス統合

---

## 容量管理システム

### 警告レベル定義

| 容量使用率 | レベル | 表示 | 自動削除 | ユーザーアクション |
|-----------|--------|------|---------|-------------------|
| 0-59% | `normal` | なし | なし | なし |
| 60-79% | `warning` | ⚠️ 警告バナー | なし | データバックアップ推奨 |
| 80-100% | `critical` | 🚨 重要警告 | あり | 古いデータ自動削除 |

### 自動削除ロジック

#### 無料プラン
```
トリガー: 毎回のセッション保存時
削除対象: 7日より古いセッション
保持件数: 期間内すべて（通常21件程度）
```

#### プレミアムプラン
```
トリガー: 容量80%超過時
削除対象: 古い順に削除
保持件数: 最新100件（約3.5ヶ月分）
```

### UI表示例

#### 設定画面での表示
```typescript
// データ保存状況カード
const retentionInfo = DataManager.getDataRetentionInfo();

// 無料プラン表示例
<div class="glass-card">
  <h4>データ保存状況</h4>
  <div class="retention-info">
    <p>保存期間: 直近7日分</p>
    <p>保存セッション数: 21件</p>
    <p>最古のセッション: 2025年10月20日</p>
    <p>ストレージ使用量: 0.03MB / 5MB (0.6%)</p>
  </div>
  <button class="btn-premium">
    プレミアムにアップグレードして無制限保存
  </button>
</div>

// プレミアムプラン表示例
<div class="glass-card">
  <h4>データ保存状況</h4>
  <div class="retention-info">
    <p>保存期間: 無制限</p>
    <p>保存セッション数: 1,250件</p>
    <p>最古のセッション: 2024年4月15日 (195日前)</p>
    <p>ストレージ使用量: 1.75MB / 5MB (35%)</p>
  </div>
  <p class="text-success">✅ プレミアム会員 - すべてのデータを保存中</p>
</div>
```

#### 容量警告バナー
```typescript
const warning = DataManager.checkStorageWarning();

// warning表示例
<div class="alert alert-warning">
  <i data-lucide="alert-triangle"></i>
  <span>⚠️ ストレージ容量が60%を超えています。データのバックアップを推奨します。</span>
</div>

// critical表示例
<div class="alert alert-critical">
  <i data-lucide="alert-triangle"></i>
  <span>🚨 ストレージ容量が80%を超えています。古いデータが自動削除されます。</span>
</div>
```

---

## Phase 2拡張計画

### データ出力機能（プレミアム限定）

#### CSV出力
```typescript
/**
 * セッションデータをCSV形式でエクスポート
 *
 * @param {string} mode - モードフィルター（null = 全て）
 * @returns {string} CSV文字列
 */
static exportSessionDataAsCSV(mode = null) {
  const sessions = this.getSessionHistory(mode, 9999);

  // CSVヘッダー
  let csv = 'セッションID,日時,モード,基音,平均誤差,Excellent,Good,Pass,Practice\n';

  sessions.forEach(session => {
    const summary = session.sessionSummary || {};
    const avgError = session.pitchErrors.reduce((sum, err) =>
      sum + Math.abs(err.errorInCents), 0) / session.pitchErrors.length;

    csv += `${session.sessionId},`;
    csv += `${new Date(session.startTime).toLocaleString('ja-JP')},`;
    csv += `${session.mode},`;
    csv += `${session.baseNote},`;
    csv += `${avgError.toFixed(1)},`;
    csv += `${summary.excellentCount || 0},`;
    csv += `${summary.goodCount || 0},`;
    csv += `${summary.passCount || 0},`;
    csv += `${summary.practiceCount || 0}\n`;
  });

  return csv;
}

/**
 * CSVダウンロード実行
 */
static downloadSessionDataAsCSV(mode = null) {
  const csv = this.exportSessionDataAsCSV(mode);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = `pitch-training-data-${new Date().toISOString().split('T')[0]}.csv`;
  link.click();

  URL.revokeObjectURL(url);
  console.log('✅ CSVダウンロード完了');
}
```

#### JSON出力
```typescript
/**
 * セッションデータをJSON形式でエクスポート
 *
 * @param {string} mode - モードフィルター（null = 全て）
 * @returns {string} JSON文字列
 */
static exportSessionDataAsJSON(mode = null) {
  const sessions = this.getSessionHistory(mode, 9999);
  return JSON.stringify(sessions, null, 2);
}

/**
 * JSONダウンロード実行
 */
static downloadSessionDataAsJSON(mode = null) {
  const json = this.exportSessionDataAsJSON(mode);
  const blob = new Blob([json], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = `pitch-training-data-${new Date().toISOString().split('T')[0]}.json`;
  link.click();

  URL.revokeObjectURL(url);
  console.log('✅ JSONダウンロード完了');
}
```

#### UI実装例
```html
<!-- 設定画面 - データ出力セクション -->
<div class="glass-card premium-only">
  <h4 class="heading-md">
    <i data-lucide="download"></i>
    <span>データ出力（プレミアム限定）</span>
  </h4>

  <div class="export-options">
    <button class="btn-secondary" onclick="DataManager.downloadSessionDataAsCSV()">
      <i data-lucide="file-text"></i>
      CSV形式でダウンロード
    </button>

    <button class="btn-secondary" onclick="DataManager.downloadSessionDataAsJSON()">
      <i data-lucide="code"></i>
      JSON形式でダウンロード
    </button>
  </div>

  <p class="text-sm text-white-60">
    すべてのトレーニングデータをバックアップできます。
    Excelなどで詳細分析も可能です。
  </p>
</div>
```

---

## 実装タイムライン

### Phase 1: シンプル実装（1-2日）
- ✅ `cleanupSessionData()` 実装
- ✅ `saveSessionResultWithCleanup()` 実装
- ✅ `getDataRetentionInfo()` 実装
- ✅ `checkStorageWarning()` 実装
- ✅ 設定画面でのデータ保存状況表示
- ✅ 容量警告バナー実装

### Phase 2: データ出力機能（3-4日）
- ⏳ CSV出力機能実装
- ⏳ JSON出力機能実装
- ⏳ 出力UI実装
- ⏳ プレミアム限定アクセス制御

### Phase 3: 詳細分析機能（将来）
- ⏳ PDF出力機能
- ⏳ グラフ付きレポート生成
- ⏳ 長期進捗トレンド分析

---

## テスト計画

### 単体テスト項目

#### 1. cleanupSessionData()
```typescript
// テストケース1: 無料プラン - 7日より古いデータ削除
const sessions = [
  { startTime: Date.now() - 10 * 24 * 60 * 60 * 1000 }, // 10日前 → 削除
  { startTime: Date.now() - 5 * 24 * 60 * 60 * 1000 },  // 5日前 → 保持
];

// テストケース2: プレミアムプラン - 容量正常時は全て保持
const sessions = Array(1000).fill({ startTime: Date.now() }); // 1000件
// 容量 < 4MB → 全て保持

// テストケース3: プレミアムプラン - 容量超過時は100件保持
const sessions = Array(3000).fill({ startTime: Date.now() }); // 3000件
// 容量 > 4MB → 最新100件のみ保持
```

#### 2. getDataRetentionInfo()
```typescript
// テストケース1: セッション0件
const info = DataManager.getDataRetentionInfo();
assert(info.totalSessions === 0);

// テストケース2: 無料プラン - 7日分表示
const info = DataManager.getDataRetentionInfo();
assert(info.retentionPeriod === '7days');
assert(info.daysSinceOldest <= 7);

// テストケース3: プレミアムプラン - 無制限表示
const info = DataManager.getDataRetentionInfo();
assert(info.retentionPeriod === 'unlimited');
assert(info.isPremium === true);
```

#### 3. checkStorageWarning()
```typescript
// テストケース1: 容量正常（0-59%）
const warning = DataManager.checkStorageWarning();
assert(warning.level === 'normal');

// テストケース2: 容量警告（60-79%）
// 手動で3MBデータを保存
const warning = DataManager.checkStorageWarning();
assert(warning.level === 'warning');

// テストケース3: 容量重大（80-100%）
// 手動で4.5MBデータを保存
const warning = DataManager.checkStorageWarning();
assert(warning.level === 'critical');
assert(warning.shouldCleanup === true);
```

### 統合テスト項目

#### 1. セッション保存フロー
```
1. セッション開始
2. 8ステップ記録
3. セッション完了 → saveSessionResultWithCleanup()
4. 自動クリーンアップ実行確認
5. データ保存状況確認
```

#### 2. プラン切り替えフロー
```
1. 無料プランで7日分保存
2. プレミアムにアップグレード
3. 7日より古いデータが保持されることを確認
4. プレミアム解除
5. 7日より古いデータが削除されることを確認
```

#### 3. 容量超過フロー
```
1. プレミアムプランで大量セッション保存
2. 4MB超過確認
3. 自動削除実行確認
4. 最新100件のみ保持確認
```

---

## 既知の制限事項

### 1. localStorage容量制限
- **制限**: 5MB（ブラウザ標準）
- **影響**: プレミアムユーザーで約2年分のデータが上限
- **対処**: 自動削除 + CSV/JSONダウンロード推奨

### 2. デバイス依存性
- **制限**: localStorageはデバイス内のみ
- **影響**: マルチデバイス同期なし
- **対処**: Phase 2でデータ出力機能実装 → 手動移行可能

### 3. ブラウザキャッシュクリア
- **制限**: ユーザーがブラウザキャッシュをクリアするとデータ消失
- **影響**: 予告なくデータが失われる可能性
- **対処**: 定期的なバックアップ推奨（CSV/JSON出力）

### 4. プライベートブラウジング
- **制限**: プライベートモードではlocalStorage非永続
- **影響**: セッション終了時にデータ消失
- **対処**: 警告メッセージ表示 + 通常モード推奨

---

## 変更履歴

### v1.2.0（2025年10月27日）
- ✅ **バイラルマーケティング戦略追加**: SNSシェア機能を最優先実装
- ✅ **無料プラン仕様変更**: データ保存なし、総合評価は完全表示
- ✅ **SNSシェア機能設計**: `SocialShareManager` クラス設計完了
- ✅ **プラットフォーム別実装**: Twitter/LINE/Instagram対応
- ✅ **OGP画像生成**: Canvas描画による結果画像生成（1200×630px）
- ✅ **Web Share API統合**: ネイティブシェア機能対応（モバイル最適化）
- ✅ **UI実装例追加**: 結果画面へのシェアボタン統合設計
- ✅ **実装優先度変更**: Phase 1 SNSシェア → Phase 2 データ出力

### v1.1.0（2025年10月27日）
- ✅ **フィルター方式実装**: データ削除せず、表示のみ制限
- ✅ `getSessionHistory()`: 無料プランで7日以内のみ表示
- ✅ `cleanupSessionData()`: 削除処理を削除、表示制限のみ
- ✅ `getDataRetentionInfo()`: `visibleSessions`と`hiddenSessions`を追加
- ✅ プレミアム再加入時の全データ復元機能

### v1.0.0（2025年10月27日）
- ✅ 初版作成
- ✅ バックエンド不要の設計方針決定
- ✅ データサイズ分析完了
- ✅ Phase 1実装設計完了
- ✅ Phase 2拡張計画策定

---

## 関連ドキュメント

### 実装ファイル
- **データ管理**: `/PitchPro-SPA/js/data-manager.js` (v2.1.0)
- **SNSシェア**: `/PitchPro-SPA/js/social-share-manager.js` (新規実装予定)
- **トレーニング制御**: `/PitchPro-SPA/js/controllers/trainingController.js`
- **テストページ**: `/PitchPro-SPA/test-premium-data-retention.html`

### 設計ドキュメント
- **収益化戦略**: `/RELEASE_AND_MONETIZATION_PLAN.md`
- **アプリ仕様書**: `/APP_SPECIFICATION.md`
- **技術仕様書**: `/TECHNICAL_SPECIFICATIONS.md`
- **開発ガイドライン**: `/CLAUDE.md`

### 参考資料
- **Twitter Web Intent API**: https://developer.twitter.com/en/docs/twitter-for-websites/tweet-button/guides/web-intent
- **LINE Social Plugins**: https://developers.line.biz/ja/docs/line-social-plugins/
- **Web Share API**: https://developer.mozilla.org/en-US/docs/Web/API/Navigator/share
- **Canvas API**: https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API
- **OGP仕様**: https://ogp.me/

---

**このドキュメントは、プレミアムデータ保存期間管理システムとバイラルマーケティング戦略の仕様・実装・テスト計画を包括的に記録します。**
