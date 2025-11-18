# PitchPro-SPA 仕様書ディレクトリ

**最終更新日**: 2025-11-18
**バージョン**: 2.5.0

## 📋 概要

このディレクトリには、PitchPro-SPAアプリケーションの各機能の仕様書が格納されています。

## 🗂️ 仕様書一覧

### 1. トレーニング機能仕様書
**ファイル**: `TRAINING_SPECIFICATION.md`
**バージョン**: 3.0.0
**最終更新**: 2025-10-23

**内容**:
- SPAアーキテクチャ概要
- SessionDataRecorder仕様
- 適応的基音選択アルゴリズム
- ナビゲーション処理
- リソースライフサイクル管理
- モード別トレーニングフロー

**対象実装**:
- `/PitchPro-SPA/js/controllers/trainingController.js`
- `/PitchPro-SPA/js/controllers/session-data-recorder.js`
- `/PitchPro-SPA/js/router.js`

### 2. データ管理仕様書
**ファイル**: `DATA_MANAGEMENT_SPECIFICATION.md`
**最終更新**: 2025-10-24（移動）

**内容**:
- localStorage統一管理
- データキー構造
- データ保存・取得API
- セッションデータ管理

**対象実装**:
- `/PitchPro-SPA/js/data-manager.js`

### 3. 評価システム仕様書
**ファイル**: `EVALUATION_SYSTEM_SPECIFICATION.md`
**最終更新**: 2025-10-24（移動）

**内容**:
- 評価基準定義
- グレード判定ロジック
- モード別評価システム
- デバイス品質判定

**対象実装**:
- `/PitchPro-SPA/js/evaluation-calculator.js`

### 4. 動的グレード計算ロジック仕様書
**ファイル**: `DYNAMIC_GRADE_LOGIC_SPECIFICATION.md`
**最終更新**: 2025-10-24（移動）

**内容**:
- 完全な計算フロー定義
- 詳細実装仕様
- エラーハンドリング戦略
- モード別差別化

**対象実装**:
- `/PitchPro-SPA/pages/results-overview.html`
- `/PitchPro-SPA/js/evaluation-calculator.js`

### 5. 音量バー統合仕様書
**ファイル**: `VOLUME_BAR_INTEGRATION_SPECIFICATION.md`
**最終更新**: 2025-10-24（移動）

**内容**:
- VolumeBarController統合
- 実機テスト済み設定
- 音量値取得方法（コールバック方式）
- デバイス別最適化設定

**対象実装**:
- `/PitchPro-SPA/js/volume-bar-controller.js`
- `/PitchPro-SPA/pages/js/voice-range-test.js`

### 6. Lucideアイコン運用ガイドライン
**ファイル**: `LUCIDE_ICON_GUIDELINES.md`
**最終更新**: 2025-10-24（作成・移動）

**内容**:
- Safari互換性対応
- バージョン管理（v0.263.0固定）
- アイコン名対応表
- 実装時の必須手順
- UIカタログとの違い

**対象実装**:
- `/PitchPro-SPA/index.html`（Lucide CDN）
- `/PitchPro-SPA/js/lucide-init.js`
- 全HTMLファイルのアイコン実装

### 7. 基音選択仕様書
**ファイル**: `BASE_NOTE_SELECTION_SPECIFICATION.md`
**バージョン**: 2.0.0
**最終更新**: 2025-10-26

**内容**:
- 音域テスト結果に基づく適応的基音選択
- モード別基音選択アルゴリズム
- 安全マージン設計
- 基音候補生成ロジック

**対象実装**:
- `/PitchPro-SPA/js/controllers/trainingController.js`
- `/PitchPro-SPA/pages/js/voice-range-test.js`

### 8. 有料プラン機能仕様書
**ファイル**: `PREMIUM_FEATURES_SPECIFICATION.md`
**バージョン**: 1.0.0
**最終更新**: 2025-10-27（新規作成）

**内容**:
- 有料プラン価値検証サマリー
- 収益化戦略（価格設定・無料版との差別化）
- Phase 1: データ活用基盤の強化
  - 音程別集計機能（2度〜8度）
  - 基音別習熟度マップ（12音律）
  - 長期履歴保存（3ヶ月成長グラフ）
- Phase 2: 弱点克服モードの実装（新機能）
  - 弱点自動検出エンジン
  - 集中練習モード
  - 改善効果の可視化
- Phase 3: プレミアム分析ページの実装
  - 音程精度分析タブ
  - エラーパターン分析タブ
  - AI練習プランタブ
  - 成長記録タブ
- 実装ロードマップ（7週間）
- 成功指標（KPI）
- 競合比較と差別化戦略

**対象実装**:
- 今後実装予定の有料プラン機能全般
- データ分析エンジン
- 弱点克服モード
- プレミアム分析ページ

### 9. 総合評価ページ仕様書
**ファイル**: `RESULTS_OVERVIEW_SPECIFICATION.md`
**バージョン**: 1.0.0
**最終更新**: 2025-11-09（新規作成）

**内容**:
- 総合評価ページの機能仕様
- 次のステップセクション詳細仕様
  - Phase分離の設計思想（アクション vs 分析）
  - 旧実装との差異説明（意図的な変更）
  - モード別設定オブジェクト仕様
- UIコンポーネント仕様
  - レスポンシブグリッドレイアウト
  - カードレイアウト（ボタン位置統一）
  - 無効化カード（準備中機能）
- JavaScript実装仕様
  - `displayNextSteps()` 関数仕様
  - 将来拡張計画（グレード別カスタマイズ）
- アイコン・カラー設計
- Phase 3-5 拡張計画

**対象実装**:
- `/PitchPro-SPA/pages/results-overview.html`
- `/PitchPro-SPA/pages/js/results-overview-controller.js`
- `/PitchPro-SPA/styles/base.css`（次のステップカード）
- `/UI-Catalog/ui-catalog-components.html`

### 10. マイクロフォン バックグラウンド耐性仕様書
**ファイル**: `MICROPHONE_BACKGROUND_RESILIENCE.md`
**バージョン**: 2.0.0
**最終更新**: 2025-11-09（PitchPro v1.3.2統合完了）

**内容**:
- ✅ **v2.0.0 (2025-11-09)**: PitchPro v1.3.2への統合完了
  - ライブラリ側実装への完全移行
  - アプリ側コード削除（setupBackgroundControl等）
  - バックグラウンド制御の自動処理化
- バックグラウンド/フォアグラウンド遷移時のマイク権限問題
- PitchPro MicrophoneLifecycleManagerのエラー状態分析
  - 最大復旧試行回数到達エラーの根本原因
  - ブラウザのマイクストリーム管理
  - 無限ループ防止機構
- 解決策の設計（v1.0.0実装、v1.3.2統合）
  - visibilitychangeイベントによる予防的制御
  - エラー状態からの自動復旧ロジック
  - ハイブリッドアプローチ（予防 + 復旧）
- 動作フロー（3シナリオ）
- テストシナリオ（4パターン）

**対象実装**:
- ✅ **PitchProライブラリ v1.3.2**: `MicrophoneLifecycleManager.ts`
- `/PitchPro-SPA/index.html`（v1.3.2参照）
- `/PitchPro-SPA/pages/js/preparation-pitchpro-cycle.js`（v2.0.0: アプリ側コード削除済み）

### 11. ナビゲーション リロード検出仕様書
**ファイル**: `NAVIGATION_RELOAD_DETECTION_SPECIFICATION.md`
**バージョン**: 2.0.0
**最終更新**: 2025-11-18（2フラグシステム統一完了）

**内容**:
- ✅ **v2.0.0 (2025-11-18)**: 2フラグシステムへの統一完了
  - preparationページとtrainingページの統一設計
  - 1フラグシステムの設計上の問題解決
  - 役割分離による明確な責任境界
- 2フラグシステム設計パターン
  - 一時的遷移証明フラグ（`normalTransitionToXxx`）
  - 永続的ページ状態フラグ（`xxxPageActive`）
  - フラグライフサイクル管理
- リロード検出とダイレクトアクセス防止
  - モード情報の維持（random/continuous/12tone）
  - 準備ページでのマイク許可再要求防止
  - アプリ側ダイアログによるユーザー通知
- NavigationManager統一API
  - `setNormalTransitionToPreparation()`
  - `setNormalTransitionToTraining()`
  - `checkPageAccess()` 統一アクセス制御
- 実装パターンとフロー図
  - 正常遷移フロー（5ステップ）
  - リロード検出フロー（3ステップ）
  - ダイレクトアクセス検出フロー（3ステップ）
- テストシナリオ（5パターン）
- トラブルシューティングガイド

**対象実装**:
- `/PitchPro-SPA/js/navigation-manager.js`（v4.3.2）
- `/PitchPro-SPA/js/router.js`（v4.3.2対応）

## 📚 参照情報

### 関連ドキュメント
- **プロジェクトルート仕様書**: `/specifications/` (共通仕様書)
- **ナビゲーション仕様**: `/specifications/NAVIGATION_HANDLING_SPECIFICATION.md`
- **開発ガイドライン**: `/CLAUDE.md`
- **UIカタログ**: `/UI-Catalog/ui-catalog-essentials.html`

### 実装ファイル構成
```
PitchPro-SPA/
├── index.html                          # エントリーポイント
├── pages/
│   └── training.html                   # トレーニングページテンプレート
├── js/
│   ├── router.js                       # SPAルーター
│   └── controllers/
│       ├── trainingController.js       # トレーニング制御
│       └── session-data-recorder.js    # セッションデータ管理
└── specifications/                     # 本ディレクトリ
    ├── README.md                       # 本ファイル
    └── TRAINING_SPECIFICATION.md       # トレーニング仕様書
```

## 📝 仕様書の更新ルール

### バージョニング
- **メジャー更新 (x.0.0)**: アーキテクチャの大幅変更
- **マイナー更新 (1.x.0)**: 機能追加・仕様変更
- **パッチ更新 (1.0.x)**: 誤字修正・小規模な修正

### 更新時の注意事項
1. 実装変更時は必ず仕様書も同時更新
2. 更新日とバージョンを必ず記載
3. 変更履歴を記録
4. 実装との整合性を確認

## 🔗 リンク

- **GitHubリポジトリ**: https://github.com/kiyopi/Relative-pitch-app
- **プロジェクトREADME**: `/README.md`
- **開発ガイドライン**: `/CLAUDE.md`

## 📌 メモ

### 旧仕様書との違い
- 旧仕様書 (`/specifications/TRAINING_FLOW_SPECIFICATION.md`) は旧アーキテクチャ前提
- 新仕様書はSPAアーキテクチャに完全対応
- クエリパラメータ → ハッシュルーティングへの移行を反映

### 今後の追加予定
- [ ] 音域テスト機能仕様書（SPA版v4.0）
- [ ] 弱点克服モード詳細仕様書（PREMIUM_FEATURES_SPECIFICATIONから分離）
- [x] マイクロフォン バックグラウンド耐性仕様書（完了・2025-11-09）
- [x] 結果表示機能仕様書（完了・2025-11-09）
- [x] データ管理仕様書（完了・移動済み）
- [x] 評価システム仕様書（完了・移動済み）
- [x] 音量バー統合仕様書（完了・移動済み）
- [x] Lucideアイコン運用ガイドライン（完了・新規作成）
- [x] 有料プラン機能仕様書（完了・新規作成）

### 更新履歴

#### 2025-11-18 (v2.5.0)
- `NAVIGATION_RELOAD_DETECTION_SPECIFICATION.md` v2.0.0 新規作成・追加
- リロード検出・ダイレクトアクセス防止の2フラグシステム統一を文書化
- preparationページとtrainingページの統一設計パターンを確立
- 1フラグシステムの設計上の問題と解決策を記録
- NavigationManager統一API仕様を文書化
- 実装パターン・フロー図・テストシナリオ5パターンを記録
- README.mdを v2.5.0 にアップデート

#### 2025-11-09 (v2.4.0)
- `MICROPHONE_BACKGROUND_RESILIENCE.md` v2.0.0にアップデート
- PitchPro v1.3.2への統合完了を文書化
- アプリ側コード削除（setupBackgroundControl, detectPageReload等）を記録
- ライブラリ側実装への完全移行を明記
- 技術的影響（簡素化、自動処理、メンテナンス性向上）を追加
- README.mdを v2.4.0 にアップデート

#### 2025-11-09 (v2.3.0)
- `MICROPHONE_BACKGROUND_RESILIENCE.md` v1.0.0 新規作成・追加
- PitchProマイクロフォン権限問題の完全分析と解決策を文書化
- バックグラウンド/フォアグラウンド遷移時の自動復旧システム仕様化
- ハイブリッドアプローチ（visibilitychange予防 + エラー自動復旧）の実装詳細
- 動作フロー3シナリオ・テストシナリオ4パターンを記録
- README.mdを v2.3.0 にアップデート

#### 2025-11-09 (v2.2.0)
- `RESULTS_OVERVIEW_SPECIFICATION.md` 新規作成・追加
- 総合評価ページの次のステップセクション仕様を文書化
- Phase分離の設計思想・旧実装との差異を明文化
- CSS設計原則（ボタン位置統一）の記録
- README.mdを v2.2.0 にアップデート

#### 2025-10-27 (v2.1.0)
- `PREMIUM_FEATURES_SPECIFICATION.md` 新規作成・追加
- 有料プラン価値検証サマリーを文書化
- データ活用基盤・弱点克服モード・プレミアム分析の実装計画を策定
- README.mdを v2.1.0 にアップデート

#### 2024-10-24 (v2.0.0)
- 5つの仕様書を`/specifications/`から移動
  1. `DATA_MANAGEMENT_SPECIFICATION.md`
  2. `EVALUATION_SYSTEM_SPECIFICATION.md`
  3. `DYNAMIC_GRADE_LOGIC_SPECIFICATION.md`
  4. `VOLUME_BAR_INTEGRATION_SPECIFICATION.md`
  5. `LUCIDE_ICON_GUIDELINES.md`（新規作成・移動）
- README.mdを v2.0.0 にアップデート
- SPA関連仕様書の一元管理開始
