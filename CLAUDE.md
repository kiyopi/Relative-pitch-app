# CLAUDE.md - 新リポジトリ開発ガイドライン

## 📋 **作業実行サマリー（一回確認用）**

### 🎯 **アプリの目的**
**8va相対音感トレーニングアプリ** - 科学的根拠に基づく相対音感トレーニングシステム
- **主要ユーザー**: 音楽学習者（初級〜中級）、カラオケ愛好家
- **コア価値**: 歌唱力向上 + コミュニケーション能力向上（脳内ピアノ理論）
- **3つのモード**: ランダム基音（初級8回）→連続チャレンジ（中級12回）→12音階（上級S級判定）

### 🚧 **現在の作業内容**
- ✅ **完了**: v2環境index.html実装完了（base.css大幅拡張1,108行、全UIコンポーネント統合済み）
- ✅ **完了**: preparation.html音域テスト最終調整（テキスト役割分担、レイアウト統一、iPhone対応）
- ✅ **完了**: UIレイアウト調整80%完成（モバイル対応、インライン削除、プログレスバー統一）
- ✅ **完了**: データ設計フェーズ（DATA_MANAGEMENT_SPECIFICATION.md + data-manager.js実装）
- ✅ **完了**: PitchPro音声処理統合・2秒リセット問題修正・エラーループ防止
- ✅ **完了**: デバイス検出システム完全修正（iPadOS 13+バグ対策）
- ✅ **完了**: 安定版マイクロフォンシステム復活（audio-manager-stable.js + microphone-manager-stable.js）
- ✅ **完了**: VolumeBarController統合音量制御システム実装完了（実機テスト済み設定統合）
- ✅ **完了**: 音域テストv4.0包括設計完成（PitchPro役割分担・エラーハンドリング・収録制御統合）
- 🔄 **進行中**: voice-range-test-v4フォルダでの段階的実装（4回目チャレンジ）
- 📋 **次期作業**: Phase1-3での確実な音域テスト完成・本番統合

### 🌿 **現在のブランチ**
- **作業ブランチ**: `feature/preparation-test-system`
- **実装内容**: 音域テストv4.0包括設計・PitchPro統合・エラーハンドリング完成
- **次期フェーズ**: voice-range-test-v4での段階的実装フェーズ

### ⚠️ **注意すべきこと（最重要）**
1. **🚨 インライン記述禁止**: HTMLのstyle属性、JavaScriptでのインラインCSS絶対禁止（例外: Lucideアイコンサイズ、プログレスバー幅のみ）
2. **📋 作業開始前必須チェック**: UIカタログ→base.css→類似実装の順で確認（新規CSS作成前）
3. **📝 データ管理統合**: `/js/data-manager.js`活用でlocalStorage統一管理
4. **🎚️ 音量バー制御**: `VolumeBarController`統一使用・**必ずコールバック方式**で`result.volume`取得
5. **📝 トレーニングJS**: 開発段階ではページ内記述許可、本番実装時に外部ファイル化
6. **🌿 Git自動化**: 作業完了時のみコミット・プッシュ実行（修正中は禁止）

### 🎯 **作業のポイント**
- **データ管理モジュール完了**: `/js/data-manager.js`実装済み（pitchpro-audio統合、課金制御対応）
- **PitchProオーディオ統合完了**: 2秒リセット問題修正、エラーループ防止、高度デバイス検出実装
- **VolumeBarController統合完了**: 実機テスト済み設定統合・統一音量制御システム実装
- **iPadOS 13+バグ修正完了**: 仕様書準拠のデバイス判定システム実装（`CRITICAL_DECISIONS_AND_INSIGHTS.md`参照）
- **テスト環境整備**: `test-ui-integration.html`でUIカタログ準拠の統合テスト環境完成
- **安定版マイクシステム**: `audio-manager-stable.js` + `microphone-manager-stable.js` + `test-stable-microphone.html`実装完了
- **UIカタログ最優先**: 新しいスタイル作成前に`ui-catalog-essentials.html`で既存コンポーネント確認
- **ユーティリティクラス活用**: `.flex .items-center .gap-3` `.heading-md` 等で統一
- **プログレスバー統一**: `.progress-bar` + `.progress-fill-[type]` + 色クラス
- **Glass Cardホバーエフェクト**: 既存の`.glass-card`クラス使用
- **レスポンシブ対応**: モバイルファースト、PWA対応

### 🔍 **よく使う実装例**

```html
<!-- 見出し + アイコン -->
<h4 class="heading-md"><i data-lucide="bar-chart-3" class="text-blue-300"></i><span>評価分布</span></h4>
<!-- プログレスバー -->
<div class="progress-bar"><div class="progress-fill gradient-catalog-green" style="width: 75%;"></div></div>
<!-- レイアウト -->
<div class="flex items-center gap-3"><!-- コンテンツ --></div>
```

### 🎚️ **VolumeBarController実装例**

```javascript
// シンプル実装
const controller = await VolumeBarController.createSimple(['volume-bar-1']);
await controller.start();

// ❌ 間違った音量取得方法（動作しない）
const volume = pitchProInstance.rawVolume; // 存在しない

// ✅ 正しい音量取得方法（必須）
pitchDetector.setCallbacks({
    onPitchUpdate: (result) => {
        const volume = result.volume; // これを使用
    }
});
```

---

## 🔍 **詳細リファレンス（具体例・実装パターン）**

### 📍 **作業に関する具体例 - すぐに確認したい場合**
- **[プログレスバー実装パターン](#🎯-プログレスバー統一システムクイックリファレンス)** - 進行バー、評価分布バーの完全コード例
- **[インライン排除の作業手順](#🚨-インライン排除の作業手順最重要)** - STEP 1-4の具体的手順
- **[ユーティリティクラス一覧](#既存ユーティリティクラス一覧)** - レイアウトクラス、見出しクラス
- **[CSS設計アーキテクチャ](#🎨-css設計アーキテクチャ重要)** - system.css → base.css → results.css構造
- **[作業開始前チェック](#🚨-作業開始前チェック絶対に省略禁止)** - UIカタログ確認、共通スタイル確認手順

### 🎯 **よく使う実装例**
```html
<!-- プログレスバー -->
<div class="progress-bar">
    <div class="progress-fill gradient-catalog-green" style="width: 75%;"></div>
</div>

<!-- 見出し + アイコン -->
<h4 class="heading-md">
    <i data-lucide="bar-chart-3" class="text-blue-300"></i>
    <span>評価分布</span>
</h4>

<!-- レイアウトクラス組み合わせ -->
<div class="flex items-center gap-3">
    <!-- コンテンツ -->
</div>
```

---

## 📋 プロジェクト概要

**リポジトリ**: https://github.com/kiyopi/Relative-pitch-app.git  
**作業ディレクトリ**: `/Users/isao/Documents/Relative-pitch-app`  
**プロジェクト名**: 8va相対音感トレーニングアプリ

## 🎯 アプリの目的・価値

### 解決する課題
- **背景**: 相対音感は音楽学習において重要な能力であり、系統的なトレーニングが求められている
- **目的**: 科学的根拠に基づいた効果的な相対音感トレーニングシステムの提供
- **ビジョン**: 誰もが楽しく継続的に相対音感を向上できるWebアプリケーション

### ターゲットユーザー
- **主要ターゲット**: 音楽学習者（初級〜中級）
- **副次ターゲット**: カラオケ愛好家、合唱団メンバー、音楽教育関係者
- **拡張ターゲット**: コミュニケーション能力向上を目指す一般ユーザー

### 提供価値・期待効果
- **音楽的効果**: 歌唱力向上、音程精度改善、楽曲理解深化
- **副次的効果**: コミュニケーション能力向上、人間関係改善（脳内ピアノ理論）
- **教育的効果**: 体系的な音感学習、進捗の可視化、モチベーション維持

### コア機能（3つのトレーニングモード）
1. **ランダム基音モード（初級）**: 8セッション、音域内ランダム基音
2. **連続チャレンジモード（中級）**: 12セッション連続、クロマチック12音
3. **12音階モード（上級）**: 12-24セッション、全半音順次使用でS級判定

## 🛠 開発方針

### 基本原則
- 相対音感トレーニングに特化
- モバイル・PC両対応のレスポンシブUI
- フックなし設計（直線的フロー）

### 技術スタック
- フロントエンド: Vanilla TypeScript + Vite（確定）
- 音声処理: Web Audio API + Pitchy
- デプロイ: GitHub Pages
- PWA対応: Service Worker + Manifest

## 📄 重要ファイル

- `APP_SPECIFICATION.md`: アプリケーション仕様書（v1.3.0）
- `REQUIREMENTS_SPECIFICATION.md`: 要件定義書（v1.0.0）
- `TECHNICAL_SPECIFICATIONS.md`: 技術仕様書（v1.0.0）
- `RELEASE_AND_MONETIZATION_PLAN.md`: リリース計画・収益化戦略書（v1.0.0）
- `GLOSSARY.md`: プロジェクト用語集（v1.0.0）
- `CLAUDE.md`: 開発ガイドライン（本ファイル）

## 🎨 **CSS・UI設計方針**

### **UIカタログシステム活用**
- **基本方針**: `ui-catalog-essentials.html`で既存コンポーネント確認後に実装
- **分離設計**: ui-catalog.css（表示専用）と base.css（実装用）完全分離
- **統一コンポーネント**: Glass Card・プログレスバー・ボタン等の既存活用

### **base.css活用状況（v2.0.0）**
- **サイズ**: 1,108行（7カテゴリの機能統合完了）
- **主要コンポーネント**: ページヘッダー・特化カード・インタラクティブ要素・バッジ等
- **活用方針**: 新規CSS作成前に既存クラス確認必須

## 🌿 Git運用方針

### 🚀 **Git操作許可設定（重要）**
**Claudeは以下の作業を許可なしで実行できます:**

#### **許可される操作**
- ✅ **`git status`**, **`git diff`**, **`git log`** - 状態確認コマンド
- ✅ **`git add [ファイル]`** - ファイルのステージング
- ✅ **`git commit -m "..."`** - コミット作成
- ✅ **`git push origin [ブランチ]`** - リモートリポジトリへのプッシュ

#### **実行タイミング**
- **作業完全完了時のみ** - 修正中・作業中は実行しない
- **ユーザーからの明示的な指示時** - 「コミット」「プッシュ」等の指示
- **作業セッション終了時** - 全ての修正が完了し動作確認済み

#### **コミットメッセージ形式**
```
[作業内容要約]: [具体的な変更内容]

- [変更項目1]
- [変更項目2] 
- [主要な新機能や改善]

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

#### **重要な制約**
- ❌ **修正作業中のコミット禁止** - 作業が途中の場合は実行しない
- ❌ **テスト未完了時のコミット禁止** - 動作確認前は実行しない
- ✅ **完了時の効率化** - Bashコマンド確認の省略で作業効率向上
- ✅ **適切なタイミング** - 作業完了時のみの実行で履歴管理最適化

### ブランチ保護
- **mainブランチ**: 直接更新禁止・安定版のみ
- **開発作業**: 個別ブランチで実施
- **統合**: Pull Request経由のみ

### ブランチ命名規則
```
{type}/{scope}-{description}
```

**Type（種類）**:
- `feature/` - 新機能開発
- `fix/` - バグ修正  
- `refactor/` - リファクタリング
- `docs/` - ドキュメント更新
- `style/` - UI/スタイル変更
- `test/` - テスト追加・修正
- `chore/` - 設定変更・ツール更新

**Scope（対象領域）**:
- `audio` - 音声処理関連
- `ui` - ユーザーインターフェース
- `training` - トレーニングモード
- `data` - データ管理・localStorage
- `deploy` - デプロイ・ビルド設定
- `core` - 核心システム

**命名例**:
```bash
feature/audio-pitchy-integration
fix/ui-mobile-layout  
refactor/core-typescript-migration
docs/glossary-update
```

---

## 🎵 **2024年9月4日 重要更新**: PitchProオーディオ統合・デバイス検出完全修正

### **🔧 PitchPro音声処理統合完了**
- **2秒リセット問題修正**: 音量閾値を30% → 1.5%に調整、15フレーム無音検出追加
- **エラーループ防止**: MicrophoneController・ErrorNotificationSystemの3秒クールダウンタイマー実装
- **初期安定化短縮**: 10秒 → 2-3秒に改善（5フレーム → 3フレーム調整）
- **デバイス別最適化**: PC(2.5x)・iPhone(3.5x)・iPad(5.0x)の感度設定実装

### **📱 iPadOS 13+ デバイス判定バグ完全修正**
- **根本問題**: iPadOS 13+で`navigator.userAgent`が"Macintosh"と偽装報告される
- **修正手法**: `'ontouchend' in document`による確実な検出実装
- **仕様書参照**: `CRITICAL_DECISIONS_AND_INSIGHTS.md`の完全対応ロジック適用
- **複数方式検出**: UserAgent・タッチサポート・Navigator.platform確認によるフォールバック

### **🧪 統合テスト環境完成**
- **ファイル**: `test-ui-integration.html`
- **UIカタログ準拠**: base.css・results.css・training.cssを完全活用
- **詳細ログ**: iPadOS検出・デバイス最適化・音程検出の完全ログ機能
- **リアルタイム調整**: ノイズレベル・明瞭度・感度のスライダー調整機能

### **📋 実装済み重要機能**
```javascript
// iPadOS 13+ 完全検出ロジック
const isIPhone = /iPhone/.test(userAgent);
const isIPad = /iPad/.test(userAgent);
const isIPadOS = /Macintosh/.test(userAgent) && 'ontouchend' in document;
const hasIOSNavigator = /iPad|iPhone|iPod/.test(userAgent);

// デバイス別最適化設定（実機テスト済み）
PC: 感度 2.5x, 音量バー 4.0x
iPhone: 感度 3.5x, 音量バー 4.5x  
iPad: 感度 5.0x, 音量バー 7.0x
```

### **🎯 次期実装フェーズ**
- iPhone/iPad実機テスト実行
- preparation.html・training.html本番統合実装
- results-overview.html動的機能統合

### **📋 VolumeBarController統合完了（2025年1月7日追加）**
- **VolumeBarController実装**: 統一音量制御システム完成（`/js/volume-bar-controller.js`）
- **音量バー統合仕様書**: 完全なドキュメント作成（`/specifications/VOLUME_BAR_INTEGRATION_SPECIFICATION.md`）
- **重要な教訓**: PitchProからの音量値取得は必ずコールバック方式`result.volume`を使用
- **実機テスト済み設定**: PC(4.0x)・iPhone(4.5x)・iPad(7.0x)の音量バー感度設定確定

---

## 🎯 **2025年1月9日 重要更新**: 音域テストv4.0包括設計完成

### **🏗️ 4回目チャレンジのための完全準備**
- **専用フォルダ構築**: `/voice-range-test-v4/`で完全分離管理
- **PitchPro仕様理解**: AudioDetectionComponentの適切な活用方法確立
- **役割分担明確化**: PitchPro・VoiceRangeTesterV113・収録制御メソッドの責任範囲統一
- **エラーハンドリング包括設計**: 測定失敗6パターンの完全対応設計

### **📁 voice-range-test-v4フォルダ構成**
```
voice-range-test-v4/
├── docs/                              # 設計ドキュメント統合管理
│   ├── PITCHPRO_ROLE_ASSIGNMENT.md    # PitchPro役割分担明確化  
│   ├── RECORDING_CONTROL_METHODS.md   # 収録制御メソッド設計
│   ├── IMPLEMENTATION_PLAN_V4.md      # v4.0実装計画（Phase1-3）
│   ├── FLOW_GAP_ANALYSIS.md          # ユーザーフロー実装ギャップ分析
│   └── MEASUREMENT_FAILURE_HANDLING.md # 測定失敗時エラーハンドリング
├── src/{css,js}/                     # 構造化実装ファイル
├── test/                             # 単体・統合・アニメーションテスト
└── backup/original-files/            # 安全なバックアップ管理
```

### **🎯 確立された設計原則**
1. **AudioDetectionComponent単一責任**: PitchPro統合音声処理専門
2. **収録制御メソッド統合**: UI状態・アニメーション・フロー制御の一元化
3. **段階的エラーハンドリング**: 即座対応→警告強化→代替手段の3段階
4. **測定失敗パターン対応**: 音量不足・明瞭度不足・雑音干渉・システムエラー等
5. **ユーザービリティ最優先**: 具体的メッセージ・視覚フィードバック・進捗保持

### **🚀 実装フェーズ戦略**
- **Phase 1**: HTMLベースファイル作成・CSS基本アニメーション（低リスク）
- **Phase 2**: 収録制御メソッドJavaScript実装・PitchPro統合（中リスク）
- **Phase 3**: アニメーション統合・エラーハンドリング実装（高リスク）

### **⚠️ 重要な教訓（4回目成功のために）**
- **PitchPro推奨値使用**: `clarityThreshold: 0.4`, `minVolumeAbsolute: 0.003`
- **単一インスタンス運用**: AudioDetectionComponentの使い回し、セレクター変更で対応
- **測定失敗への備え**: 音量不足・音程不明瞭・雑音干渉の包括的対応
- **段階的実装**: 各Phase完了時の確実な動作確認で安全性確保

---

## 🧠 重要な設計思想リファレンス

### **必須確認ドキュメント（毎セッション開始時）**
セッション開始時は必ずこれらのドキュメントを確認して、設計思想を再確認すること:

1. **`CORE_INSIGHTS_REFERENCE.md`** - 中核リファレンス
   - 4つの核心的洞察の詳細
   - 長期データ収益化戦略
   - モード別差別化の必要性
   - 技術制約を前提とした設計
   - 12音律理論による具体的フィードバック

2. **`OVERALL_EVALUATION_MOCKUP_ANALYSIS.md`** - 分析書
   - 総合評価システムの設計基盤
   - 5つの重要検証項目
   - 収益化との関係性分析

3. **`DYNAMIC_GRADE_LOGIC_SPECIFICATION.md`** - 動的グレード計算ロジック
   - 完全な計算フロー定義
   - 詳細実装仕様
   - エラーハンドリング戦略

### **設計忘却防止のための原則**
- これらの洞察を忘れると1から設計をやり直すことになる
- 短期的な問題解決に集中せず、常に長期データ価値を意識
- 技術的制約を受容した現実的なアプローチを維持
- モード別の差別化を徹底し、一律的な評価を避ける

---

## 🚨 作業開始前チェック（絶対に省略禁止）

### **新しい作業を始める前に必須の3ステップ**
1. **UIカタログ確認**: `Read ui-catalog-essentials.html` で既存コンポーネント確認（最優先）
2. **共通スタイル確認**: `Grep base.css [関連キーワード]` で既存スタイル検索
3. **類似実装確認**: 類似機能のページを`Read`して実装パターン確認

### **TodoWrite必須項目**
全ての作業でtodoリストに以下を含める：
- [ ] UIカタログでコンポーネント確認完了
- [ ] system.css共通スタイル確認完了  
- [ ] 他ページとの一貫性確認完了

### **禁止事項**
- ❌ 新しいCSSを既存確認なしで書く
- ❌ ボタンをui-catalog確認なしで作る
- ❌ スタイルをUIカタログ確認なしで追加
- ❌ system.cssを先に確認する（混乱の元）
- ❌ 要求を曖昧なまま作業開始
- ❌ HTMLファイル内でのstyleタグ使用（CSS分離原則違反）

### **強制確認ポイント**
```
新しいスタイル作成前 → 「UIカタログに既存しませんか？」
ボタン作成前 → 「ui-catalog-essentials.htmlのボタンセクションを確認しましたか？」
レイアウト変更前 → 「UIカタログで同じパターンはありませんか？」
system.css確認 → 「UIカタログとbase.cssを先に確認しましたか？」
```

---

## 🎨 CSS設計アーキテクチャ（重要）

### **CSS階層構造**
```
system.css (基盤)
├── CSS変数定義
├── 共通ユーティリティクラス
└── 全体で使用する基本スタイル

↓ (必要なもののみ抽出・再構築)

base.css (アプリ基本)
├── system.cssから必要な要素のみ
└── クリーンな状態での実装

results.css (結果表示専用)
├── system.cssから必要な要素のみ
└── 結果表示に特化したスタイル
```

### **UIカタログ独立設計**
- **ui-catalog.css**: カタログ表示専用スタイルシート
- **完全分離**: 実際のUIパーツには一切影響しない
- **カタログ専用**: 視覚的確認・デモンストレーション目的のみ

### **CSS再構築作業の原則**
1. **system.css**: 全ての基盤・変更禁止
2. **base.css/results.css**: system.cssを元にクリーンに再構築
3. **ui-catalog.css**: 独立したカタログ専用スタイル
4. **分離設計**: カタログスタイルは実装に影響しない

### **作業時の注意点**
- UIカタログでの視覚確認はui-catalog.css内で実装
- 実際のアプリスタイルはbase.css/results.cssで管理
- system.cssの変数・ユーティリティを最大活用
- 重複コードを避けクリーンなCSS構造を維持

### **CSS調査・修正の正しい手順**
1. **UIカタログを最初に確認** - ui-catalog-essentials.htmlで既存コンポーネント確認
2. **base.cssを確認** - 既存の定義・上書きを確認
3. **results.cssを確認** - ページ固有のスタイルを確認
4. **現状報告** - 既存実装の状態を把握・報告
5. **system.cssを最後に確認** - 基盤となる定義を確認（変更禁止）
6. **修正方針決定** - UIカタログのコンポーネントを優先使用

### **🚨 インライン記述禁止原則（最重要）**

#### **問題の背景**
- HTMLのstyle属性やJavaScriptでのインラインCSS記述が多用されていた
- ファイルサイズが異常に増大し、保守が困難になった
- スタイルの管理が分散し、一貫性が保てなくなった

#### **厳格なルール**
- ❌ **HTMLでのstyle属性使用禁止** (`<div style="...">`)
- ❌ **JavaScriptでのインラインCSS禁止** (`element.style.xxx = "..."`)
- ❌ **HTMLファイル内<style>タグ記述禁止** (ページ内スタイル定義禁止)
- ❌ **HTMLファイル内<script>タグ記述禁止** (インラインJavaScript禁止)
- ❌ **どうしても必要な場合以外は例外なし**

#### **📝 JavaScript実装時の必須原則**
- ✅ **スクリプト記述場所の事前確認必須**: 新規ファイル作成 or 既存ファイル修正かを明確化
- ✅ **外部ファイル管理の徹底**: `/js/`ディレクトリでの個別ファイル管理
- ✅ **機能別ファイル分離**: モジュール設計による保守性確保
- ✅ **共通機能の統一**: `lucide-init.js`等の共通モジュール活用

#### **🚧 開発フェーズ特例（トレーニング実装期間）**
**現在のフェーズ**: トレーニング機能実装・最適化期間

**一時的な許可事項**:
- ⚠️ **インラインJavaScript許可**: トレーニング機能のプロトタイプ実装時のみ
- ⚠️ **条件**: 必ず`<!-- TODO: 外部ファイル化 /js/[ファイル名].js -->`コメントを記載
- ⚠️ **期限**: 本番機能実装時に外部ファイル化を実施

**例**:
```html
<!-- TODO: 外部ファイル化 /js/preparation.js -->
<script>
    // 開発期間中の一時的なインライン記述
    // スタイル実装完了後に外部ファイル化必須
</script>
```

**移行計画**:
1. スタイル実装完了時点で全インラインJSを調査
2. 機能別に`/js/`ディレクトリへファイル作成
3. HTMLファイルから外部ファイル参照に変更
4. インラインコード完全削除

#### **🚨 無駄作業防止チェック（必須）**
**作業開始前に以下を厳格に確認すること:**

1. **📍 既存スタイル存在確認**
   ```bash
   # 必須実行: 既存クラス検索
   Grep base.css [作成予定のクラス名]
   ```
   - **結果**: 既存 → そのまま使用（新規作成禁止）
   - **結果**: なし → 新規作成可能

2. **🎯 修正対象の明確化**
   - **UIカタログ表示部分**: ui-catalog.css管理、修正不要
   - **UIカタログ実装例**: `<div class="code-sample">` 内、修正必要
   - **実際のページ**: 本番実装、修正必要

3. **🔍 インライン許可判定**
   ```
   Lucideアイコン → サイズ指定許可
   プログレスバー幅 → 動的値許可
   固定レイアウト値 → 例外的許可
   その他 → 削除必要
   ```

4. **⛔ 作業実行前の最終確認**
   - 「この修正は本当に必要ですか？」
   - 「既存のスタイルで対応できませんか？」
   - 「修正対象を正しく特定していますか？」

#### **正しいアプローチ**
- ✅ **CSSクラスでスタイル定義** (ui-catalog.css、base.css等)
- ✅ **JavaScriptではクラス追加/削除のみ** (`classList.add/remove`)
- ✅ **CSS変数の活用** (system.css定義の変数使用)
- ✅ **状態管理はクラス切り替え** (`active`, `disabled`等)
- ✅ **専用CSSファイルでのスタイル管理** (HTMLとCSSの完全分離)
- ✅ **既存スタイル最優先使用** (新規作成より既存活用)

#### **例外が許可される場合**
- **Lucideアイコン**: 表示に必要なインラインスタイル
- 動的に計算される値（座標、サイズ等）
- 外部APIから取得するデータに基づく値
- ユーザー設定による動的カラー変更

---

## 🎯 プログレスバー統一システム（クイックリファレンス）

### 基本構造
```html
<!-- 外枠 -->
<div class="progress-bar [modifier]">
    <!-- 内側（色付きバー） -->
    <div class="progress-fill-[type] [color-class]" style="width: X%;"></div>
</div>
```

### モディファイアクラス
- `.progress-bar.flex` - フレックスレイアウト内で使用（評価分布バー等）
- `.progress-bar.with-margin` - 下マージン付き（進行バーセクション等）

### 内側バーの種類
- `.progress-fill` - グラデーション用（基本フィル）
- `.progress-fill-custom` - カスタム色用（評価分布バー等）

### 色クラス一覧

#### グラデーション（進行バー用）
- `.gradient-catalog-blue` - 青グラデーション（セッション進行バー）
- `.gradient-catalog-green` - 緑グラデーション（基本プログレスバー）
- `.gradient-catalog-purple` / `.gradient-catalog-orange` / `.gradient-catalog-red`

#### 評価カラー（評価分布バー用）
- `.color-eval-gold` - 金色（Excellent）
- `.color-eval-good` - 緑色（Good）  
- `.color-eval-pass` - 青色（Pass）
- `.color-eval-practice` - 赤色（Practice）

### 実装パターン

#### 進行バーセクション
```html
<!-- セッション完了時・セッション中 -->
<div class="progress-bar with-margin">
    <div class="progress-fill gradient-catalog-blue" style="width: 25%;"></div>
</div>
<div>セッション 2 / 8</div>
```

#### 基本プログレスバー
```html
<div class="progress-bar">
    <div class="progress-fill gradient-catalog-green" style="width: 75%;"></div>
</div>
```

#### 評価分布バー
```html
<div style="display: flex; align-items: center; gap: 0.75rem;">
    <i data-lucide="trophy" class="text-yellow-300"></i>
    <div class="progress-bar flex">
        <div class="progress-fill-custom color-eval-gold" style="width: 37.5%;"></div>
    </div>
    <span>3</span>
</div>
```

### 重要な原則
- **インラインスタイルは `width` のみ**（幅の指定以外禁止）
- **高さは10px統一**（すべてのプログレスバー）
- **アニメーションは `transition: width 0.5s ease`**（軽量化）
- **色はCSSクラスで管理**（グラデーション・評価カラー）

## 🚨 インライン排除の作業手順（最重要）

### 絶対に守る優先順位
1. **📍 STEP 1: インラインスタイル確認**（最優先！）
   - HTMLファイル内のすべての `style=` を探す
   - 排除可能なインラインを特定

2. **🔍 STEP 2: 既存クラス検索**
   - 対応するCSSクラスが存在するか確認
   - base.cssのユーティリティクラスを優先使用

3. **✏️ STEP 3: クラス置き換え**
   - インラインスタイルをCSSクラスに変更
   - 動的値（width等）のみインライン許可

4. **✅ STEP 4: 動作確認**
   - レイアウト崩れがないか確認

### 既存ユーティリティクラス一覧

#### レイアウトクラス
```css
.flex                /* display: flex */
.flex-col            /* flex-direction: column */
.items-center        /* align-items: center */
.justify-center      /* justify-content: center */
.justify-between     /* justify-content: space-between */
.gap-3               /* gap: 0.75rem (12px) */
.gap-4               /* gap: 1rem (16px) */
```

#### 見出しクラス
```css
.heading-sm          /* 小見出し: flex + icon 20px */
.heading-md          /* 中見出し: flex + icon 24px */  
.heading-lg          /* 大見出し: flex + icon 28px */
```

#### 許可されるインライン（例外）
- **Lucideアイコンサイズ**: `style="width: 20px; height: 20px;"`
- **プログレスバー幅**: `style="width: 37.5%;"`
- **動的計算値**: 座標、サイズ等
- **レイアウト固定値**: `flex-shrink: 0;` `min-width: 20px;` `text-align: right;`

### 評価分布バーの標準レイアウト

#### 完全版（見出し + 評価バー）
```html
<div class="glass-card">
    <!-- 見出し -->
    <h4 class="heading-md">
        <i data-lucide="bar-chart-3" class="text-blue-300"></i>
        <span>評価分布</span>
    </h4>
    
    <!-- 評価バー項目 -->
    <div class="flex items-center gap-3">
        <i data-lucide="trophy" class="text-yellow-300" style="width: 20px; height: 20px; flex-shrink: 0;"></i>
        <div class="progress-bar flex">
            <div class="progress-fill-custom color-eval-gold" style="width: 37.5%;"></div>
        </div>
        <span class="text-sm text-white-60" style="min-width: 20px; text-align: right;">3</span>
    </div>
</div>
```

### 🔄 作業忘却防止チェックリスト
毎回作業前に以下を確認：
- [ ] インラインスタイル `style=` を最初に探したか？
- [ ] 既存のユーティリティクラス（flex、gap-3等）を確認したか？
- [ ] `.heading-md` 等の見出しクラスに重複クラスを付けていないか？
- [ ] 動的値以外のインラインを排除できたか？

---

## 🎨 **CSS特化モード**

### **起動方法**
```
「CSS特化モードで開始してください」
```

### **CSS特化時の厳格な制約**
- ❌ **HTML構造変更禁止** - 要素の追加・削除・移動は一切行わない
- ❌ **JavaScript追加・変更禁止** - スクリプト関連は無視
- ❌ **既存クラス名変更禁止** - class名の変更は行わない
- ❌ **新規ファイル作成禁止** - 既存CSSファイルの編集のみ
- ❌ **CSS変数以外の値使用禁止** - ハードコード値は使用しない

### **CSS特化時の許可範囲**
- ✅ **CSSファイルの読み取り・編集のみ**
- ✅ **CSS変数の活用**
- ✅ **既存クラスへのスタイル追加**
- ✅ **レスポンシブ対応**
- ✅ **アニメーション調整**

### **必須確認プロセス**
1. **対象CSSファイル読み取り完了**
2. **既存クラス・変数の検索完了**
3. **変更影響範囲の特定完了**
4. **修正計画のユーザー承認完了**

### **CSS特化モード確認文**
「CSS特化モードを了解しました。HTML・JavaScript変更は行わず、CSSのみの調整を実行します。」

---

---

## 🎚️ **2025年1月7日 重要更新**: VolumeBarController統合システム完成

### **🔧 VolumeBarController統合完成**
- **統一音量制御システム**: 実機テスト済み設定を統合した完全な音量バー制御システム実装完了
- **実機テスト済み設定統合**: PC(4.0x)・iPhone(4.5x)・iPad(7.0x)の最適設定を統合
- **音量取得方式統一**: コールバック方式(`result.volume`)での正しい音量値取得を完全実装
- **仕様書完備**: `VOLUME_BAR_INTEGRATION_SPECIFICATION.md`で詳細実装方法を文書化

### **⚠️ 重要な注意事項（今後の実装者向け）**

**❌ 絶対に使ってはいけない方法:**
```javascript
// これらのプロパティは存在しないか更新されない
const volume = pitchProInstance.rawVolume;
const volume = pitchProInstance.currentVolume;
const volume = pitchProInstance.stableVolume;
```

**✅ 必ず使う正しい方法:**
```javascript
pitchDetector.setCallbacks({
    onPitchUpdate: (result) => {
        const volume = result.volume; // 必ずこれを使用
        // VolumeBarControllerで処理
    }
});
```

### **📋 実装済み統合システム**
- **VolumeBarController**: `/js/volume-bar-controller.js`
- **実装例**: `/test-volume-controller.html`（シンプル実装例）
- **統合テスト**: `/test-ui-integration.html`（完全統合テスト）
- **仕様書**: `/specifications/VOLUME_BAR_INTEGRATION_SPECIFICATION.md`

### **🎯 次期実装フェーズ**
- preparation.html・training.htmlへのVolumeBarController統合
- トレーニング機能の完全統合実装
- リリース準備・最終調整

---

## 🎯 **2025年1月9日 重要更新**: AudioDetectionComponent UI切り替え問題の解決

### **🔧 問題の概要**
- **症状**: 音域テスト開始時、マイクテスト用の音量バー（`volume-progress`）が動作し続け、音域テスト用の音量バー（`range-test-volume-bar`）が更新されない
- **原因**: AudioDetectionComponentが初期化時のセレクターを内部でキャッシュし、後から変更できない仕様
- **影響**: マイクテストから音域テストへの切り替え時にUI要素が正しく更新されない

### **❌ 試行錯誤した方法（すべて無効）**
1. ID重複を疑って複数要素を一括更新
2. コールバックの上書き防止処理
3. DOM要素のID動的変更
4. styleプロパティの読み取り専用化
5. セレクター変更メソッドの探索（存在しなかった）

### **✅ 正しい解決方法**
```javascript
// 音域テスト開始時の処理
if (audioDetector) {
    // 1. 既存のAudioDetectorを停止
    audioDetector.stopDetection();
    
    // 2. リソースを完全に破棄（重要！）
    audioDetector.destroy();
    
    // 3. 音域テスト用のセレクターで新規作成
    audioDetector = new AudioDetectionComponent({
        volumeBarSelector: '#range-test-volume-bar',
        volumeTextSelector: '#range-test-volume-text',
        frequencySelector: '#range-test-frequency-value',
        // その他の設定...
    });
    
    // 4. 再初期化
    await audioDetector.initialize();
}
```

### **📋 AudioDetectionComponent利用可能メソッド**
- ✅ `stopDetection()` - 音声検出を停止
- ✅ `destroy()` - リソースを完全に破棄
- ❌ `cleanup()` - 存在しない
- ❌ `release()` - 存在しない
- ❌ `updateSelectors()` - 存在しない

### **🎯 重要な教訓**
- AudioDetectionComponentは**一度初期化したらセレクターを変更できない**
- UI要素を切り替える場合は**destroy() → 再作成**が必須
- PitchProのドキュメントが不足している場合は、テストページでメソッドを確認する

---

**このファイルは開発進行に応じて更新されます**