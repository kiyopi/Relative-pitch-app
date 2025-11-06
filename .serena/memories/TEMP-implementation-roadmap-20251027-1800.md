# 実装ロードマップ - 2025年10月27日

## 📋 実装優先順位（ユーザー指定）

### 1. 🎯 データ保存機能の完全実装（最優先）
**目的**: 長期分析用データ収集 + テスト中のデータ蓄積

#### 現状
- ✅ `data-manager.js` v2.1.0実装完了（フィルター方式）
- ✅ `session-data-recorder.js` v1.0.0実装完了（基本保存機能）
- ⚠️ **未統合**: プレミアムプラン判定が実装されていない

#### 実装が必要な修正

##### A. `session-data-recorder.js` の修正
**ファイル**: `/PitchPro-SPA/js/controllers/session-data-recorder.js`

**必要な変更**:
1. プレミアムプラン判定の追加
2. 無料プラン時の保存スキップ（ランダムモードのみ）
3. `saveSessionResultWithCleanup()` の使用

**修正箇所**:
```javascript
// completeSession() メソッド（108-127行目）
completeSession() {
    if (!this.currentSession) {
        console.warn('⚠️ 完了するセッションがありません');
        return null;
    }

    this.currentSession.completed = true;
    this.currentSession.endTime = Date.now();
    this.currentSession.duration = this.currentSession.endTime - this.currentSession.startTime;

    console.log('✅ セッション完了:', this.currentSession);

    // 【新規追加】プレミアムプラン判定
    const subscriptionData = DataManager.getSubscriptionData();
    const isPremium = subscriptionData.premiumAccess.status === 'active';
    const mode = this.currentSession.mode;

    // 無料プラン & ランダムモード → データ保存なし
    if (!isPremium && mode === 'random') {
        console.log('ℹ️ 無料プラン（ランダムモード）: データ保存スキップ');
        const completedSession = { ...this.currentSession };
        this.currentSession = null;
        return completedSession; // 評価表示用に返すが保存はしない
    }

    // localStorageに保存（自動クリーンアップ付き）
    this.saveToStorage(this.currentSession);

    const completedSession = { ...this.currentSession };
    this.currentSession = null;

    return completedSession;
}
```

```javascript
// saveToStorage() メソッドの修正（132-149行目）
saveToStorage(session) {
    try {
        // 【修正】DataManager.saveSessionResultWithCleanup() を使用
        DataManager.saveSessionResultWithCleanup(session);

        console.log(`✅ セッションデータ保存完了（自動クリーンアップ実行済み）`);

    } catch (error) {
        console.error('❌ セッションデータ保存エラー:', error);
    }
}
```

##### B. data-manager.js の確認
**ファイル**: `/PitchPro-SPA/js/data-manager.js`

**確認事項**:
- `saveSessionResultWithCleanup()` が正しく実装されているか
- プレミアムプラン判定ロジックが正常動作するか

---

### 2. 🎵 12音階モード下降実装

#### 現状
- ✅ 上昇実装済み（C3→C#3→D3...）
- ❌ 下降未実装

#### 実装が必要な機能
**ファイル**: `/PitchPro-SPA/js/controllers/trainingController.js`

**必要な変更**:
1. 12音階モードの設定に「上昇/下降」選択を追加
2. 下降時の基音選択ロジック（C4→B3→A#3...）
3. UI表示の対応

**詳細設計**:
```javascript
// modeConfigに上昇/下降設定を追加
const modeConfig = {
    '12tone': {
        maxSessions: 12,
        title: '12音階モード',
        hasIndividualResults: false,
        baseNoteSelection: 'sequential_chromatic',
        hasRangeAdjustment: true,
        direction: 'ascending' // または 'descending'
    }
};

// 下降時の基音選択
function selectBaseNoteFor12ToneMode() {
    const direction = modeConfig['12tone'].direction;
    
    if (direction === 'descending') {
        // 下降: C4→B3→A#3→A3...→C#3
        const descendingNotes = ['C', 'B', 'A#', 'A', 'G#', 'G', 'F#', 'F', 'E', 'D#', 'D', 'C#'];
        // ... 実装
    } else {
        // 上昇: 現在の実装（C3→C#3→D3...）
    }
}
```

---

### 3. 📊 総合評価の誤差遷移グラフのブラッシュアップ

#### 現状
- ✅ 基本的なグラフ表示実装済み
- ⚠️ ブラッシュアップが必要

#### 実装が必要な改善
**ファイル**: `/PitchPro-SPA/pages/results-overview.html` または専用コンポーネント

**改善項目**:
1. グラフの視認性向上（色・サイズ）
2. インタラクティブ機能（ホバー時の詳細表示）
3. レスポンシブ対応（モバイル最適化）
4. アニメーション追加
5. 複数セッション比較機能

**技術スタック**:
- Chart.js または Canvas API
- base.cssのグラデーション活用

---

### 4. ➡️ 次のステップ機能実装

#### 現状
- ❌ 未実装

#### 実装が必要な機能
**詳細不明 - ユーザーに確認が必要**

**推測される機能**:
- トレーニング中の「次へ」ボタン？
- セッション完了後の「次のセッションへ」誘導？
- ステップ間の遷移UI？

**確認事項**:
- どのページ/画面での機能か？
- どのような動作を期待しているか？
- 優先度は？

---

### 5. 📱 モバイル版テスト実行

#### 現状
- ✅ PC版実装完了
- ❌ モバイル実機テスト未実施

#### テストが必要な項目

##### A. デバイステスト
- iPhone (Safari)
- iPad (Safari)
- Android (Chrome)

##### B. 機能テスト
1. **音域テスト**
   - マイク許可フロー
   - 音量バー表示
   - PitchPro音声処理
   - デバイス別感度設定（iPhone: 3.5x, iPad: 5.0x）

2. **トレーニング機能**
   - 基音再生
   - 音程検出精度
   - 倍音補正動作
   - UIタッチ操作

3. **レスポンシブUI**
   - プログレスバー表示
   - Glass Cardレイアウト
   - ボタンサイズ・間隔
   - フォントサイズ

4. **パフォーマンス**
   - PitchPro処理速度
   - メモリ使用量
   - バッテリー消費

##### C. テスト手順
1. GitHub Pagesへデプロイ
2. モバイル実機でURLアクセス
3. 各機能の動作確認
4. 問題点のログ記録
5. 必要に応じて修正

---

### 6. 🔗 SNSシェア機能実装（新規追加）

#### 戦略的重要性
**バイラルマーケティングの核心機能**
- 広告費ゼロでユーザー獲得
- 社会的証明効果の活用
- 無料ユーザーの成果共有でアプリ認知拡大

#### 現状
- ✅ 設計完了（`PREMIUM_DATA_RETENTION_SPECIFICATION.md` v1.2.0）
- ❌ 実装未着手

#### 実装が必要な機能

##### A. SocialShareManager クラス作成
**ファイル**: `/PitchPro-SPA/js/social-share-manager.js`（新規作成）

**実装内容**:
```javascript
class SocialShareManager {
    // シェアテキスト生成
    static generateShareText(sessionResult)
    
    // プラットフォーム別シェア
    static shareToTwitter(sessionResult)
    static shareToLine(sessionResult)
    static shareToInstagram(sessionResult)
    
    // ネイティブシェア（モバイル対応）
    static async shareNative(sessionResult)
    
    // 結果画像生成（OGP対応 1200×630px）
    static async generateResultImage(sessionResult)
}
```

**実装詳細**: `/specifications/PREMIUM_DATA_RETENTION_SPECIFICATION.md` 495-965行目参照

##### B. 結果画面へのシェアボタン統合
**対象ファイル**:
- `/PitchPro-SPA/pages/result-session.html`（ランダムモード個別結果）
- `/PitchPro-SPA/pages/results-overview.html`（総合評価）

**追加要素**:
1. シェアボタンセクション
2. プラットフォーム別ボタン（Twitter/LINE/Instagram/ネイティブ）
3. 無料ユーザー向け注意文言

**HTML例**:
```html
<div class="share-section">
    <h4 class="heading-md">
        <i data-lucide="share-2"></i>
        <span>結果をシェア</span>
    </h4>
    
    <div class="share-buttons">
        <button class="btn-primary btn-share" onclick="shareResult('native')">
            <i data-lucide="share-2"></i>
            <span>シェア</span>
        </button>
        
        <button class="btn-twitter btn-share" onclick="shareResult('twitter')">
            <i data-lucide="twitter"></i>
            <span>Twitter</span>
        </button>
        
        <button class="btn-line btn-share" onclick="shareResult('line')">
            <svg><!-- LINE icon --></svg>
            <span>LINE</span>
        </button>
        
        <button class="btn-instagram btn-share" onclick="shareResult('instagram')">
            <i data-lucide="instagram"></i>
            <span>Instagram</span>
        </button>
    </div>
    
    <p class="text-sm text-white-60">
        ℹ️ この結果は保存されません。履歴を記録するにはプレミアムプランへ。
    </p>
</div>
```

##### C. CSS実装
**ファイル**: `/PitchPro-SPA/styles/base.css`（既存ファイルに追加）

**追加スタイル**:
```css
/* シェアセクション */
.share-section { /* ... */ }
.share-buttons { /* grid layout */ }

/* プラットフォーム別カラー */
.btn-twitter { background: #1DA1F2; }
.btn-line { background: #00B900; }
.btn-instagram { background: linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%); }
```

##### D. 実装フェーズ

**Phase 1: 基本実装（1-2日）**
- ✅ `SocialShareManager` クラス作成
- ✅ `generateShareText()` 実装
- ✅ `shareToTwitter()` 実装
- ✅ `shareToLine()` 実装
- ✅ 結果画面へのシェアボタン追加

**Phase 2: 高度機能（2-3日）**
- ⏳ `generateResultImage()` Canvas実装
- ⏳ `shareToInstagram()` 画像ダウンロード実装
- ⏳ `shareNative()` Web Share API統合
- ⏳ レスポンシブUI調整

**Phase 3: 最適化（1日）**
- ⏳ OGPメタタグ設定
- ⏳ シェア画像プレビュー機能
- ⏳ アナリティクス統合

#### テスト項目
1. Twitter投稿画面正常表示確認
2. LINEシェア動作確認
3. Instagram画像ダウンロード確認
4. モバイルでのWeb Share API動作確認
5. Canvas画像生成（1200×630px）確認

---

### 7. 🧹 PitchPro側の未使用コードを削除（リリース時）

#### 対象
**リポジトリ**: `/Users/isao/Documents/pitchpro-audio-processing`

**削除対象**:
1. `PitchDetector.ts`: `correctLowFrequencyHarmonic()` メソッド
2. `AudioDetectionComponent.ts`: `getPitchDetector()` メソッド

**理由**:
- アプリケーション側（trainingController.js）で倍音補正を完全実装
- PitchPro側の補正機能は使用されていない

**実施タイミング**:
- リリース前の最終クリーンアップ時
- 現時点では保留（様子見期間）

---

## 📌 実装の流れ（推奨順序）

```
1. データ保存機能の完全実装（1-2時間）
   ↓
   ・session-data-recorder.js修正
   ・動作確認（test-premium-data-retention.html）
   ↓
2. 実機テストでデータ収集開始（並行作業可能）
   ↓
3. 12音階モード下降実装（2-3時間）
   ↓
4. 総合評価グラフのブラッシュアップ（3-4時間）
   ↓
5. 次のステップ機能実装（詳細確認後）
   ↓
6. SNSシェア機能実装（3-5日）★新規追加★
   ↓
   ・Phase 1: 基本実装（Twitter/LINE）
   ・Phase 2: 高度機能（Instagram/Canvas画像）
   ・Phase 3: 最適化（OGP/アナリティクス）
   ↓
7. モバイル版テスト実行（1日）
   ↓
8. 最終クリーンアップ
```

---

## 🔍 確認が必要な事項

1. **「次のステップ機能」の詳細**
   - どの画面の機能か？
   - どのような動作を期待しているか？

2. **総合評価グラフの具体的な改善要望**
   - 現状の何が不満か？
   - どのような表示が理想か？

3. **モバイルテストの優先度**
   - データ保存完成後すぐに実施？
   - 他の機能実装後？

4. **SNSシェア機能の優先度**
   - データ保存の次に実装？
   - モバイルテスト後？

---

## 📝 関連ドキュメント

- **プレミアムデータ管理仕様書**: `/specifications/PREMIUM_DATA_RETENTION_SPECIFICATION.md` (v1.2.0)
  - SNSシェア機能詳細設計: 495-965行目
- **倍音補正仕様書**: `/specifications/HARMONIC_CORRECTION_SPECIFICATION.md` (v1.0.0)
- **開発ガイドライン**: `/CLAUDE.md`
- **アプリ仕様書**: `/APP_SPECIFICATION.md`

---

**このメモは作業用の一時的な記録です。実装完了後に削除予定。**
