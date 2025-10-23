# PitchPro-SPA 仕様書ディレクトリ

**最終更新日**: 2025-10-23
**バージョン**: 1.0.0

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

## 📚 参照情報

### 関連ドキュメント
- **プロジェクトルート仕様書**: `/specifications/` (レガシー仕様書)
- **ナビゲーション仕様**: `/specifications/NAVIGATION_HANDLING_SPECIFICATION.md`
- **音量バー統合仕様**: `/specifications/VOLUME_BAR_INTEGRATION_SPECIFICATION.md`

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
- [ ] 結果表示機能仕様書
- [ ] 音域テスト機能仕様書（SPA版）
- [ ] データ管理仕様書
