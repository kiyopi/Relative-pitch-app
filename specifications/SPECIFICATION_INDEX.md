# 相対音感アプリ 仕様書インデックス

**バージョン**: 1.0.0  
**作成日**: 2025-08-14  
**目的**: 仕様書の整理と重要度分類

---

## 📚 仕様書分類

### **🔥 最重要（毎回確認必須）**
1. **`CLAUDE.md`** - 開発ガイドライン
2. **`CORE_INSIGHTS_REFERENCE.md`** - 4つの核心洞察
3. **`OVERALL_EVALUATION_MOCKUP_ANALYSIS.md`** - 総合評価分析
4. **`DYNAMIC_GRADE_LOGIC_SPECIFICATION.md`** - 動的グレード計算ロジック

### **⚡ 重要（プロジェクト基盤）**
5. **`APP_SPECIFICATION.md`** - アプリケーション仕様書（v1.4.0）
6. **`EVALUATION_SYSTEM_SPECIFICATION.md`** - 評価システム仕様書
7. **`TWELVE_TONE_RELATIVE_PITCH_THEORY.md`** - 12音律理論

### **📊 参考（必要時確認）**
8. **`REQUIREMENTS_SPECIFICATION.md`** - 要件定義書
9. **`TECHNICAL_SPECIFICATIONS.md`** - 技術仕様書
10. **`RELEASE_AND_MONETIZATION_PLAN.md`** - リリース・収益化計画

### **🔧 作業用（段階的実装）**
11. **`COMPREHENSIVE_TASK_LIST.md`** - 包括的タスクリスト
12. **`EVALUATION_SYSTEM_IMPROVEMENT_PLAN.md`** - 改善計画書

### **📝 廃止候補（重複・古い内容）**
13. ~~`DYNAMIC_GRADE_CALCULATION_SPECIFICATION.md`~~ → `DYNAMIC_GRADE_LOGIC_SPECIFICATION.md`に統合済み
14. ~~`EVALUATION_SYSTEM_IMPLEMENTATION_STRATEGY.md`~~ → `COMPREHENSIVE_TASK_LIST.md`に統合済み
15. ~~`EVALUATION_SYSTEM_REFACTORING_PLAN.md`~~ → 古い内容のため廃止
16. ~~`ADVANCED_PITCH_ANALYSIS_SPECIFICATION.md`~~ → 古い「上達度」関連のため廃止

### **🏠 その他（特定機能）**
17. **`GLOSSARY.md`** - プロジェクト用語集
18. **`DATABASE_DESIGN_SPECIFICATION.md`** - DB設計
19. **`UI_COMPONENTS_SPECIFICATION.md`** - UI仕様
20. **`VOICE_RANGE_TEST_SPECIFICATION.md`** - 音域テスト
21. **`DIRECT_ACCESS_SPECIFICATION.md`** - 直接アクセス機能

---

## 🎯 今後の仕様書管理方針

### **統合作業**
- 重複している古い仕様書を削除
- 核心的な内容を主要仕様書に統合
- 混乱を避けるため必要最小限に絞る

### **更新ルール**
- 最重要4文書は常に最新状態を維持
- プロジェクト基盤文書は重要変更時のみ更新
- 作業用文書は完了後にアーカイブ

### **アクセス順序**
1. まず `CLAUDE.md` で必須確認文書をチェック
2. 設計思想を `CORE_INSIGHTS_REFERENCE.md` で再確認
3. 具体的作業は該当する仕様書を参照
4. 実装詳細は `DYNAMIC_GRADE_LOGIC_SPECIFICATION.md` を参照

---

**この整理により、仕様書の混乱を防ぎ、効率的な開発を実現します。**