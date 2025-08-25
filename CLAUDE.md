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
- `UI_CATALOG_RESTRUCTURE_PROPOSAL_TEMP.md`: UIカタログ再構築作業の方針・手順
- その他`*_TEMP.md`ファイル: 一時的な作業指示書

### **作業方針ドキュメント**
- `V2_DEVELOPMENT_PROCESS.md`: v2環境開発プロセス・CSS分離方針
- `CSS_ARCHITECTURE_LESSONS_LEARNED.md`: CSS設計の教訓・改善方針

### **作業開始前チェックリスト**
1. 上記の`*_TEMP.md`ファイルの存在確認
2. 現在進行中の作業内容の把握
3. 作業方針・制約事項の確認
4. 既存実装の参照・活用方針の理解

## 🌿 Git運用方針

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
1. **UIカタログ確認**: `Read ui-catalog.html` で既存コンポーネント確認
2. **共通スタイル確認**: `Grep system.css [関連キーワード]` で既存スタイル検索
3. **類似実装確認**: 類似機能のページを`Read`して実装パターン確認

### **TodoWrite必須項目**
全ての作業でtodoリストに以下を含める：
- [ ] UIカタログでコンポーネント確認完了
- [ ] system.css共通スタイル確認完了  
- [ ] 他ページとの一貫性確認完了

### **禁止事項**
- ❌ 新しいCSSを既存確認なしで書く
- ❌ ボタンをui-catalog確認なしで作る
- ❌ スタイルをsystem.css検索なしで追加
- ❌ 要求を曖昧なまま作業開始

### **強制確認ポイント**
```
新しいスタイル作成前 → 「system.cssに既存しませんか？」
ボタン作成前 → 「ui-catalogのボタンセクションを確認しましたか？」
レイアウト変更前 → 「他ページで同じパターンはありませんか？」
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

### **🚨 インライン記述禁止原則（最重要）**

#### **問題の背景**
- HTMLのstyle属性やJavaScriptでのインラインCSS記述が多用されていた
- ファイルサイズが異常に増大し、保守が困難になった
- スタイルの管理が分散し、一貫性が保てなくなった

#### **厳格なルール**
- ❌ **HTMLでのstyle属性使用禁止** (`<div style="...">`)
- ❌ **JavaScriptでのインラインCSS禁止** (`element.style.xxx = "..."`)
- ❌ **どうしても必要な場合以外は例外なし**

#### **正しいアプローチ**
- ✅ **CSSクラスでスタイル定義** (ui-catalog.css、base.css等)
- ✅ **JavaScriptではクラス追加/削除のみ** (`classList.add/remove`)
- ✅ **CSS変数の活用** (system.css定義の変数使用)
- ✅ **状態管理はクラス切り替え** (`active`, `disabled`等)

#### **例外が許可される場合**
- **Lucideアイコン**: 表示に必要なインラインスタイル
- 動的に計算される値（座標、サイズ等）
- 外部APIから取得するデータに基づく値
- ユーザー設定による動的カラー変更

---

**このファイルは開発進行に応じて更新されます**