# モジュール型シングルページフロー設計仕様書

## 📋 概要

8va相対音感トレーニングアプリを、拡張性と保守性に優れたモジュール型シングルページアプリケーション（SPA）として再設計する。

## 🎯 設計目的

### 解決すべき課題
1. **ページ遷移によるマイク許可再要求問題**
   - `window.location.href`による遷移でPitchProインスタンスが破棄される
   - マイク許可ダイアログが再表示される問題

2. **複雑化したコード構造**
   - preparation-step1.html + preparation-step2.html の重複コード
   - 複数のコントローラーファイル間の依存関係
   - UI状態管理の分散

3. **将来の拡張性**
   - 新しいトレーニングモードの追加
   - 結果表示画面の改善
   - PWA化・オフライン対応

### 設計原則
- **単一責任**: 各モジュールは明確に定義された責任を持つ
- **疎結合**: モジュール間の依存関係を最小限に抑制
- **再利用性**: 共通機能を複数ページで活用
- **拡張性**: 新機能追加時の影響を局所化

## 🏗️ アーキテクチャ設計

### システム構成図
```
app.html (アプリケーションの器)
├── app.js (司令塔コントローラー)
├── templates/ (UI部品)
│   ├── preparation.html
│   ├── training-random.html
│   ├── training-sequence.html
│   └── results.html
├── controllers/ (ページ専用ロジック)
│   ├── preparation.js
│   ├── training-random.js
│   ├── training-sequence.js
│   └── results.js
└── shared/ (共通機能)
    ├── global-audio-manager.js
    ├── data-manager.js
    └── navigation.js
```

### データフロー
```
User Action → app.js → Template Loading → Controller Initialization → UI Update
     ↑                                                                    ↓
     ←── Navigation ←─── Controller Logic ←─── PitchPro/DataManager ←─────┘
```

## 📁 ファイル構造詳細

### メインアプリケーション
```
app.html                    # アプリケーションの器（最小限のHTML）
└─ #app-main               # 動的コンテンツが挿入されるメインエリア
```

### JavaScript階層構造
```
js/
├── app.js                 # 司令塔（ページ切り替え・状態管理）
├── controllers/           # ページ専用コントローラー
│   ├── preparation.js     # 準備ページ（マイク許可・音域テスト）
│   ├── training-random.js # ランダム基音モード
│   ├── training-sequence.js # 連続チャレンジモード
│   └── results.js         # 結果表示・統計
├── shared/                # 共通モジュール
│   ├── global-audio-manager.js # PitchPro統合管理
│   ├── data-manager.js    # データ永続化
│   └── navigation.js      # ページ遷移管理
└── utils/                 # ユーティリティ
    ├── ui-helpers.js      # UI操作ヘルパー
    └── audio-utils.js     # 音声処理ユーティリティ
```

### テンプレート構造
```
templates/
├── preparation.html       # 準備ページUI（3ステップ統合）
├── training-random.html   # ランダム基音モードUI
├── training-sequence.html # 連続チャレンジモードUI
└── results.html          # 結果表示UI（統計・グラフ）
```

## 🔄 ページフロー設計

### 1. アプリケーション初期化
```javascript
app.js:
1. DOM読み込み完了待機
2. 共通ライブラリ初期化
3. 初期ページ（preparation）表示
4. グローバル状態管理開始
```

### 2. ページ切り替え処理
```javascript
showPage(pageName):
1. テンプレートHTMLを動的読み込み（fetch）
2. #app-mainにHTML挿入
3. 対応コントローラーのimport・初期化
4. PitchProインスタンス引き継ぎ（重要！）
5. ページ遷移完了通知
```

### 3. 状態継承メカニズム
```javascript
// 全ページ共通でPitchProインスタンスを保持
window.sharedAudioManager = {
  instance: null,
  isInitialized: false,
  micPermissionGranted: false
}

// ページ間でインスタンスを引き継ぎ
preparationController.onComplete = (audioInstance) => {
  window.sharedAudioManager.instance = audioInstance;
  app.showPage('training-random');
}
```

## 📋 実装手順

### Phase 1: 基盤構築
1. **app.html作成**
   - 最小限のHTMLスケルトン
   - CSS・共通ライブラリ読み込み

2. **app.js司令塔作成**
   - ページ切り替え機能
   - テンプレート動的読み込み
   - グローバル状態管理

3. **共通モジュール整備**
   - global-audio-manager.js統合
   - data-manager.js最適化
   - navigation.js新規作成

### Phase 2: テンプレート分離
1. **preparation.htmlテンプレート化**
   - 既存preparation-step1.htmlから抽出
   - 3ステップ統合UI
   - 音域テストUI完全版

2. **training-random.htmlテンプレート化**
   - ランダム基音モードUI
   - プログレスバー・結果表示

3. **results.htmlテンプレート化**
   - 結果統計表示
   - グラフ・評価分布

### Phase 3: コントローラーモジュール化
1. **preparation.js**
   - マイク許可フロー
   - 音域テスト制御
   - 状態管理・次ページ遷移

2. **training-random.js**
   - ランダム基音ロジック
   - 音程判定・評価
   - セッション管理

3. **results.js**
   - 結果計算・統計
   - データ可視化
   - 再開・継続オプション

### Phase 4: 統合テスト・最適化
1. **フロー統合テスト**
   - preparation → training → results
   - マイク許可状態の完全継承
   - エラーハンドリング

2. **パフォーマンス最適化**
   - テンプレート読み込み高速化
   - 不要な再初期化排除
   - メモリリーク防止

## 🎯 期待される効果

### 1. 根本的問題解決
- **マイク許可ダイアログ再表示なし**: 単一ページ内でのUI切り替えのみ
- **PitchProインスタンス継続**: 初期化は1回のみ、全セッション通じて使い回し

### 2. 開発効率向上
- **明確な責任分離**: 各ページの機能が独立
- **デバッグ容易性**: 問題の局所化
- **テスト可能性**: 各モジュールの単体テスト

### 3. 将来拡張性
- **新トレーニングモード追加**: テンプレート+コントローラー追加のみ
- **UI改善**: テンプレート修正のみで影響局所化
- **PWA化対応**: Service Worker統合準備完了

## ⚠️ 実装時の注意点

### 1. PitchProインスタンス管理
```javascript
// ❌ 各ページで個別初期化（従来）
// ✅ グローバル管理・引き継ぎ（新設計）
```

### 2. テンプレート読み込み非同期処理
```javascript
// fetch()エラーハンドリング必須
// ローディング状態の適切な表示
```

### 3. メモリ管理
```javascript
// ページ切り替え時の適切なクリーンアップ
// イベントリスナーの削除
```

### 4. 既存CSS継承
```javascript
// base.css、results.cssをそのまま活用
// 新規CSSは最小限に抑制
```

---

**作成日**: 2025年1月30日  
**バージョン**: v1.0.0  
**対象**: 8va相対音感トレーニングアプリ  
**実装優先度**: 最高（★★★★★）