# 音域テスト仕様書ディレクトリ

**作成日**: 2025年1月20日
**目的**: 音域テスト機能に関する全ての仕様書を統合管理

---

## 📁 ファイル構成

### 1. VOICE_RANGE_TEST_SPECIFICATION_V3.md
**バージョン**: 3.1.26
**サイズ**: 54KB
**役割**: 音域テスト機能の完全仕様書

**内容**:
- 理論・アルゴリズム詳細
- 検証ロジック（低音・高音）
- バージョン履歴（v3.0.0 〜 v3.1.26）
- PitchPro v1.3.0統合仕様
- デバイス別最適化設定
- 既知の制約・デバイス特性

**対象読者**: 開発者、企画者、アルゴリズム設計者

**最新変更** (v3.1.26):
- 安定最高音自動判定機能
- エラーメッセージ視認性向上（v3.1.25）
- iPad低周波数制約の文書化

---

### 2. RANGE_TEST_BEHAVIOR_SPECIFICATION.md
**サイズ**: 20KB
**役割**: 実装時の具体的な動作フロー定義

**内容**:
- テスト開始フロー
- AudioDetectionComponent初期化手順
- UI要素の更新方法
- コールバック管理
- 音程検出の詳細条件
- デバイス別設定値
- 既知の問題・対策

**対象読者**: 実装担当者、デバッグ担当者

**特徴**:
- 実装コード例を豊富に含む
- UI更新の具体的な手順
- PitchProとの統合方法

---

### 3. VOICE_RANGE_TEST_FLOW_DIAGRAM.md
**バージョン**: 2.0.0
**サイズ**: 12KB
**役割**: システム全体フローの可視化

**内容**:
- Mermaidフロー図による全体フロー
- 測定フェーズ詳細フロー
- 測定失敗ハンドリングフロー
- PitchPro v1.3.0統合フロー
- データ記録・検証フロー
- UI状態管理フロー
- エラーハンドリング詳細フロー

**対象読者**: 開発者全般、システム設計者、レビュアー

**特徴**:
- 視覚的なフロー図
- 高レベルのシステム理解に最適
- 複雑な処理フローの俯瞰

---

## 🎯 使い方ガイド

### 新規開発者向け
1. **まず読む**: `VOICE_RANGE_TEST_FLOW_DIAGRAM.md` - 全体像を把握
2. **次に読む**: `VOICE_RANGE_TEST_SPECIFICATION_V3.md` - 詳細仕様を理解
3. **実装時**: `RANGE_TEST_BEHAVIOR_SPECIFICATION.md` - 具体的な実装方法を確認

### バグ修正・デバッグ時
1. `RANGE_TEST_BEHAVIOR_SPECIFICATION.md` - 動作フローと既知の問題を確認
2. `VOICE_RANGE_TEST_SPECIFICATION_V3.md` - アルゴリズムと検証ロジックを確認

### 機能追加・改善時
1. `VOICE_RANGE_TEST_SPECIFICATION_V3.md` - 現在の仕様を確認
2. `VOICE_RANGE_TEST_FLOW_DIAGRAM.md` - 影響範囲を俯瞰
3. `RANGE_TEST_BEHAVIOR_SPECIFICATION.md` - 実装への影響を確認

---

## 📋 バージョン管理方針

### VOICE_RANGE_TEST_SPECIFICATION_V3.md
- **メジャーバージョン更新時**: アルゴリズムの根本的変更
- **マイナーバージョン更新時**: 機能追加・重要な改善
- **パッチバージョン更新時**: バグ修正・微調整

### RANGE_TEST_BEHAVIOR_SPECIFICATION.md
- 実装フローの変更時に随時更新
- バージョン番号は記載せず、更新日のみ管理

### VOICE_RANGE_TEST_FLOW_DIAGRAM.md
- システムフロー構造の変更時に更新
- v2.0形式でバージョン管理

---

## 🔄 更新履歴

### 2025年1月20日
- v3.1.26: 安定最高音自動判定機能追加
- v3.1.25: エラーメッセージ視認性向上
- iPad低周波数制約の文書化
- 仕様書ディレクトリの整理・統合

### 2025年1月21日
- フロー図v2.0.0更新（測定失敗ハンドリング強化）

---

## 📞 関連リソース

### 実装ファイル
- `/PitchPro-SPA/pages/js/voice-range-test.js` - メイン実装
- `/PitchPro-SPA/js/core/pitchpro-v1.3.1.umd.js` - PitchProライブラリ
- `/PitchPro-SPA/styles/voice-range.css` - 専用CSS

### 開発用ファイル
- `/voice-range-test-v4/` - v4.0実装計画・ドキュメント

---

**このディレクトリは音域テスト機能の唯一の真実の情報源（Single Source of Truth）です。**
