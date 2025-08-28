# CLAUDE.md - 新リポジトリ開発ガイドライン

## 📋 プロジェクト概要

**リポジトリ**: https://github.com/kiyopi/Relative-pitch-app.git  
**作業ディレクトリ**: `/Users/isao/Documents/Relative-pitch-app`  
**プロジェクト名**: 相対音感トレーニングアプリ

## 🎯 開発方針

### 基本原則
- 相対音感トレーニングに特化
- モバイル・PC両対応のレスポンシブUI
- 統合進行ガイドシステム採用

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

## 🚧 進行中作業の参照ファイル（一時的）

**注意**: 以下のファイルは現在進行中の作業専用で、作業完了後に削除されます。作業開始前に必ず確認してください。

### **必須確認ファイル（*_TEMP.md）**
- `OVERALL_RESULTS_UI_ANALYSIS_TEMP.md`: 総合評価ページUI分析結果（統一作業用）
- その他`*_TEMP.md`ファイル: 一時的な作業指示書

### **作業方針ドキュメント**
- `V2_DEVELOPMENT_PROCESS.md`: v2環境開発プロセス・CSS分離方針
- `CSS_ARCHITECTURE_LESSONS_LEARNED.md`: CSS設計の教訓・改善方針

### **作業開始前チェックリスト**
1. 上記の`*_TEMP.md`ファイルの存在確認
2. 現在進行中の作業内容の把握
3. 作業方針・制約事項の確認
4. 既存実装の参照・活用方針の理解

## 🎨 **2024年8月27日 重要更新**: base.css大幅拡張完了

### **base.css統合状況（v2.0.0）**
- **サイズ**: 749行 → **1,108行** (+359行の大幅拡張)
- **bolt-new-design統合**: 7カテゴリの機能移植完了
- **移植元識別**: `/* === bolt-new-design移植: *** === */`でマーク済み

### **新機能カテゴリ**
1. **ページヘッダーシステム**: `.page-header`, `.page-title` 等
2. **特化カードシステム**: `.mode-card`, `.base-note-card` 等  
3. **インタラクティブ要素**: `.note-circle`, `.volume-meter` 等
4. **バッジシステム**: `.difficulty-badge`, `.session-badge` 等
5. **グリッドレイアウト**: `.modes-grid`, `.session-grid` 等
6. **高度なアニメーション**: `@keyframes shine, ripple` 等
7. **デバッグナビゲーション**: `.debug-nav` 等

### **今後の作業方針**
- ✅ **base.css**: 機能拡張完了・今後は本格活用フェーズ
- 🔄 **results-overview.html**: 構造統一完了・スクリプト実装待ち
- 📋 **次期作業**: results.css最適化とJavaScript機能実装

## 🌿 Git運用方針

### 🚀 **自動Git操作許可設定（重要）**
**Claudeは以下の作業を許可なしで自動実行できます:**

#### **許可される自動操作**
- ✅ **`git add [ファイル]`** - 作業完了ファイルのステージング
- ✅ **`git commit -m "..."`** - 作業完了時の自動コミット
- ✅ **`git push origin [ブランチ]`** - リモートリポジトリへの自動プッシュ
- ✅ **`git status`**, **`git diff`**, **`git log`** - 状態確認コマンド

#### **自動コミットの条件**
- 作業が完了し、動作確認済みの場合のみ
- 意味のある単位での作業完了時
- ユーザーから明示的に「コミットしないで」と指示がない場合

#### **コミットメッセージ形式**
```
[作業内容要約]: [具体的な変更内容]

- [変更項目1]
- [変更項目2] 
- [主要な新機能や改善]

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

#### **自動操作の利点**
- 作業の完了と同時にバックアップ・履歴保存
- 作業単位での適切なコミット分割
- リモートリポジトリでの作業進捗共有
- 作業中断時の状態保存

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
- ❌ **どうしても必要な場合以外は例外なし**

#### **正しいアプローチ**
- ✅ **CSSクラスでスタイル定義** (ui-catalog.css、base.css等)
- ✅ **JavaScriptではクラス追加/削除のみ** (`classList.add/remove`)
- ✅ **CSS変数の活用** (system.css定義の変数使用)
- ✅ **状態管理はクラス切り替え** (`active`, `disabled`等)
- ✅ **専用CSSファイルでのスタイル管理** (HTMLとCSSの完全分離)

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

**このファイルは開発進行に応じて更新されます**