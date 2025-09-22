# プロジェクト構造

## ルートディレクトリ構成
```
/Users/isao/Documents/Relative-pitch-app/
├── Bolt/v2/               # メインアプリケーション
│   ├── styles/            # CSS（base.css, results.css等）
│   └── pages/             # HTMLページ
├── voice-range-test-v4/    # 音域テストv4.0実装
│   ├── docs/              # 設計ドキュメント
│   ├── src/               # 実装ファイル
│   └── test/              # テストファイル
├── js/                     # JavaScriptモジュール
│   ├── pitchpro-audio/    # PitchPro音声処理
│   ├── data-manager.js    # データ管理統合
│   └── volume-bar-controller.js  # 音量制御
├── specifications/         # 仕様書
└── mockups/               # モックアップ

## 主要ファイル
- APP_SPECIFICATION.md: アプリケーション仕様書 v1.4.0
- REQUIREMENTS_SPECIFICATION.md: 要件定義書 v1.1.2
- CLAUDE.md: 開発ガイドライン（必読）
- ui-catalog-essentials.html: UIコンポーネントカタログ

## 現在の作業ブランチ
feature/preparation-test-system

## 重要な統合済みシステム
- PitchPro v1.2.1: 音声処理エンジン
- VolumeBarController: 統一音量制御
- AudioDetectionComponent: PitchPro統合インターフェース
- data-manager.js: localStorage統一管理