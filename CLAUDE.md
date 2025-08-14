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

**このファイルは開発進行に応じて更新されます**