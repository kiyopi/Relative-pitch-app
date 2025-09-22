# コードスタイル・規約

## CSS設計原則
- **インライン記述完全禁止**: HTMLのstyle属性、JavaScriptでのインラインCSS禁止
- **例外のみ許可**: Lucideアイコンサイズ、プログレスバー幅の動的値のみ
- **UIカタログ優先**: 新規スタイル作成前に必ずui-catalog-essentials.html確認
- **CSS階層**: system.css（基盤） → base.css（アプリ基本） → 個別CSS

## JavaScript規約
- **外部ファイル管理**: /js/ディレクトリで機能別ファイル分離
- **モジュール設計**: 機能単位でのモジュール化
- **データ管理統一**: data-manager.js経由でlocalStorage操作
- **PitchPro音量取得**: 必ずコールバック方式でresult.volume使用

## 命名規則
- **CSSクラス**: kebab-case（例: progress-bar, glass-card）
- **JavaScript変数**: camelCase（例: audioDetector, volumeBar）
- **定数**: UPPER_SNAKE_CASE（例: MIN_VOLUME_THRESHOLD）

## Git規約
- **ブランチ命名**: {type}/{scope}-{description}（例: feature/audio-pitchy-integration）
- **コミット**: 作業完全完了時のみ、日本語メッセージ可

## 重要な制約
- **相対音感原則**: トレーニング中の基音音名・周波数表示禁止
- **フックなし設計**: 直線的なユーザーフロー維持