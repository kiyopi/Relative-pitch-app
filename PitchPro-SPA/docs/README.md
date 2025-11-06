# PitchPro SPA - 次世代アーキテクチャ

## 🎯 概要

PitchPro SPAは、**MicPermissionManagerコンポーネント**を中心とした新しいアーキテクチャで、従来のマイク許可ダイアログ再表示問題を完全に解決したシングルページアプリケーションです。

## 🚀 主な特徴

### ✅ 解決された問題
- **マイク許可ダイアログの再表示**: ページ遷移時にダイアログが再度表示される問題を根本解決
- **PitchProインスタンス管理**: グローバルな単一インスタンス管理による安定性向上
- **非同期処理の競合**: ユーザー操作起点の初期化による競合状態の排除

### 🎤 MicPermissionManagerコンポーネント
```javascript
// 基本的な使用方法
const micManager = new MicPermissionManager({
    debugMode: true,
    onPermissionGranted: (stream) => console.log('許可成功'),
    onPitchProReady: (pitchPro) => console.log('準備完了')
});

// ユーザー操作時に初期化
await micManager.initialize();
await micManager.startDetection();
```

### 🏗️ アーキテクチャ

```
PitchPro-SPA/
├── pages/
│   ├── preparation-step1.html    # 初回マイク許可取得
│   ├── preparation-step2.html    # 許可継承確認
│   └── js/core/
│       ├── mic-permission-manager.js    # 核心コンポーネント
│       ├── global-audio-manager.js     # PitchPro管理
│       └── pitchpro-v1.3.1.umd.js     # PitchProライブラリ
├── styles/
│   ├── system.css               # システム定義
│   └── base.css                 # 基本スタイル
└── docs/
    └── README.md               # 本ドキュメント
```

## 🔧 技術仕様

### 2段階初期化アプローチ
1. **ステップ1**: `getUserMedia()`で基本的なマイク許可を取得
2. **ステップ2**: 許可取得後にPitchProインスタンスを安全に初期化

### ブラウザ対応
- ✅ Safari (iOS/macOS)
- ✅ Chrome (Android/Desktop)
- ✅ Firefox (Desktop)
- ✅ Edge (Desktop)

### セキュリティ要件
- ユーザー操作起点の初期化（ブラウザセキュリティポリシー準拠）
- 適切なエラーハンドリング
- リソースの確実な解放

## 📋 使用方法

### 1. 開発サーバー起動
```bash
cd PitchPro-SPA
python3 -m http.server 8000
```

### 2. ブラウザでアクセス
```
http://localhost:8000
```

### 3. テストフロー
1. **準備ステップ1**: 「マイクテスト開始」ボタンでマイク許可取得
2. **準備ステップ2**: ページ遷移後、許可ダイアログが出ないことを確認
3. **音声検出確認**: インスタンス継承により正常動作

## 🛠️ 開発ガイド

### コンポーネントの統合
```javascript
// HTML
<script src="pages/js/core/pitchpro-v1.3.1.umd.js"></script>
<script src="pages/js/core/global-audio-manager.js"></script>
<script src="pages/js/core/mic-permission-manager.js"></script>

// JavaScript
const micManager = new MicPermissionManager({ debugMode: true });
button.addEventListener('click', () => micManager.initialize());
```

### エラーハンドリング
```javascript
try {
    await micManager.initialize();
} catch (error) {
    console.error('初期化エラー:', error.message);
}
```

### リソース解放
```javascript
// ページ離脱時やアプリ終了時
await micManager.cleanup();
```

## 📊 パフォーマンス

- **初期化時間**: < 2秒 (標準的な環境)
- **メモリ使用量**: PitchProライブラリ + 管理オーバーヘッド
- **CPU使用量**: 音声処理によるリアルタイム計算

## 🔄 従来版からの移行

### Bolt/v2からの主な変更点
- `MicPermissionManager`コンポーネントの追加
- ユーザー操作起点の初期化方式
- エラーハンドリングの統一
- 詳細なログ出力機能

### 移行手順
1. 新しいコンポーネントをプロジェクトに統合
2. 既存のマイク許可取得ロジックを置き換え
3. エラーハンドリングの確認
4. ブラウザでの動作テスト

## 🤝 貢献

このプロジェクトは相対音感トレーニングアプリの基盤技術として開発されています。

## 📄 ライセンス

プロジェクト内部使用

---

**作成日**: 2025年9月30日
**バージョン**: 1.0.0
**ステータス**: ✅ 動作確認済み