# PitchPro-SPA 仕様書ディレクトリ

**最終更新日**: 2025-10-24
**バージョン**: 2.0.0

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
- [ ] 結果表示機能仕様書（results-overview詳細仕様）
- [ ] 音域テスト機能仕様書（SPA版v4.0）
- [x] データ管理仕様書（完了・移動済み）
- [x] 評価システム仕様書（完了・移動済み）
- [x] 音量バー統合仕様書（完了・移動済み）
- [x] Lucideアイコン運用ガイドライン（完了・新規作成）

### 2025-10-24 更新履歴
- 5つの仕様書を`/specifications/`から移動
  1. `DATA_MANAGEMENT_SPECIFICATION.md`
  2. `EVALUATION_SYSTEM_SPECIFICATION.md`
  3. `DYNAMIC_GRADE_LOGIC_SPECIFICATION.md`
  4. `VOLUME_BAR_INTEGRATION_SPECIFICATION.md`
  5. `LUCIDE_ICON_GUIDELINES.md`（新規作成・移動）
- README.mdを v2.0.0 にアップデート
- SPA関連仕様書の一元管理開始
