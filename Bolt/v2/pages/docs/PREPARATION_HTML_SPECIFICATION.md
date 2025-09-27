# preparation.html 詳細仕様書

## 📋 概要

**ファイル**: `/Bolt/v2/pages/preparation.html`
**目的**: 8va相対音感トレーニングアプリのトレーニング前準備ページ
**機能**: マイク許可 → 音声テスト → 音域テスト → 結果表示の完全フロー
**最終更新**: 2025年1月（globalAudioDetectorスコープ問題解決済み）

## 🎯 主要機能

### 1. 4段階の準備フロー
1. **マイク許可**: ユーザーの音声入力許可取得
2. **音声テスト**: 基本的な音声検出機能確認
3. **音域テスト**: ユーザーの音域測定（低音・高音）
4. **結果表示**: 測定結果とトレーニング開始準備

### 2. リアルタイム音声処理
- **PitchPro v1.3.1**: 最新音声処理ライブラリ統合
- **音量バー**: リアルタイム音量表示
- **周波数検出**: 音程の正確な検出と表示
- **3秒円形プログレスバー**: 測定タイマーの視覚的表示

## 🏗️ HTML構造分析

### ページ構成
```
preparation.html
├── ヘッダー (page-header)
├── 進捗ステップ表示 (step-indicator)
├── ガラスカード (glass-card)
│   ├── マイク許可セクション (permission-section)
│   ├── 音声テストセクション (audio-test-section)
│   ├── 音域テストセクション (range-test-section)
│   └── 結果表示セクション (result-section)
└── JavaScriptライブラリ群
```

### セクション別詳細

#### 1. ヘッダー部分 (lines 16-28)
```html
<header class="page-header">
    <div class="page-header-content">
        <div class="page-header-icon-wrapper">
            <div class="page-header-icon gradient-catalog-blue">
                <i data-lucide="mic" class="text-white"></i>
            </div>
        </div>
        <div class="page-header-text">
            <h1 class="page-title">トレーニング前の準備</h1>
            <p class="page-subtitle text-green-200">ランダム基音モード へのアクセス</p>
        </div>
    </div>
</header>
```

**用途**: ページタイトル・アイコン表示
**スタイル**: `page-header`, `gradient-catalog-blue`
**アイコン**: Lucide `mic` アイコン

#### 2. 進捗ステップ表示 (lines 34-66)
```html
<div class="flex items-center justify-between gap-4">
    <!-- Step 1: マイク許可 -->
    <div class="flex-1 text-center">
        <div class="step-indicator" id="step-1">
            <i data-lucide="mic"></i>
        </div>
        <p class="text-xs text-white-60 mt-2">マイク許可</p>
    </div>
    <!-- 接続線 -->
    <div class="step-connector" id="connector-1"></div>
    <!-- Step 2: 音声テスト -->
    <!-- Step 3: 音域テスト -->
</div>
```

**JavaScript制御**:
- `step-1`, `step-2`, `step-3`: 進捗状態表示
- `connector-1`, `connector-2`: 接続線の状態
- 状態クラス: `pending`, `active`, `completed`

#### 3. マイク許可セクション (lines 70-88)
```html
<section class="test-section" id="permission-section">
    <div class="section-header">
        <h3 class="text-section-title">マイクロフォンの許可</h3>
        <p class="section-description">音程検出のためマイクロフォンへのアクセスが必要です</p>
    </div>

    <div class="info-alert">
        <i data-lucide="shield-check"></i>
        <p>音声データは外部に送信されません。ブラウザ内でリアルタイム処理されます。</p>
    </div>

    <button class="btn btn-primary" id="request-mic-btn">
        <i data-lucide="mic"></i>
        <span>マイクを許可</span>
    </button>
</section>
```

**機能**:
- **初期表示**: デフォルトで表示
- **ボタン**: `#request-mic-btn` - マイク許可要求
- **セキュリティ**: プライバシー保護メッセージ

#### 4. 音声テストセクション (lines 91-168)
```html
<section class="test-section hidden" id="audio-test-section">
    <!-- 音声テスト中表示エリア -->
    <div class="audio-test-content" id="audio-test-content">
        <div class="voice-instruction">
            <div class="voice-instruction-icon">
                <i data-lucide="music"></i>
            </div>
            <p class="voice-instruction-text" id="voice-instruction-text">「ド」を発声してください</p>
            <div class="voice-instruction-pulse"></div>
        </div>

        <!-- 音量レベル -->
        <div class="meter-group">
            <div class="meter-label">
                <span>音量レベル</span>
                <span class="meter-value" id="volume-value">0%</span>
            </div>
            <div class="progress-bar">
                <div class="progress-fill gradient-catalog-green" id="volume-progress"></div>
            </div>
        </div>

        <!-- 検出周波数 -->
        <div class="meter-group">
            <div class="meter-label">
                <span>検出周波数</span>
                <span class="meter-value" id="frequency-value">261.6 Hz (C4)</span>
            </div>
        </div>
    </div>

    <!-- 成功表示 -->
    <div class="success-alert hidden" id="detection-success">
        <i data-lucide="check-circle"></i>
        <p id="detection-success-message">「ド」の音程を検出できました！音域テストに進みましょう。</p>
    </div>

    <!-- 音域設定済み表示 -->
    <div class="glass-card hidden" id="range-saved-display">
        <!-- 既存の音域データ表示 -->
    </div>

    <!-- 音域テスト開始ボタン -->
    <button class="btn btn-primary hidden" id="start-range-test-btn">
        <span>音域テストを開始</span>
        <i data-lucide="arrow-right"></i>
    </button>
</section>
```

**重要な要素**:
- `#volume-value`: 音量パーセント表示
- `#volume-progress`: 音量バー（width動的変更）
- `#frequency-value`: 検出周波数・音程名表示
- `#detection-success`: 音声検出成功時表示
- `#start-range-test-btn`: 次ステップへの進行ボタン

#### 5. 音域テストセクション (lines 171-249)
```html
<section class="test-section hidden" id="range-test-section">
    <!-- マイクステータスアイコン -->
    <div class="mic-status-container standby" id="mic-status-container">
        <i data-lucide="mic" id="mic-status-icon"></i>
    </div>

    <!-- メインステータス -->
    <h4 class="voice-range-main-text" id="main-status-text">音域テストを開始してください</h4>

    <!-- 音域テストバッジ -->
    <div class="range-test-layout-flex">
        <div class="range-test-item">
            <div class="voice-range-display-container">
                <!-- 3秒円形プログレスバー -->
                <svg class="voice-stability-svg" width="160" height="160" id="stability-ring">
                    <circle cx="80" cy="80" r="72" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="16"/>
                    <circle cx="80" cy="80" r="72" fill="none" stroke="#3b82f6" stroke-width="16"
                            stroke-dasharray="452" stroke-dashoffset="452"
                            transform="rotate(-90 80 80)" class="voice-progress-circle"/>
                </svg>
                <div class="voice-note-badge">
                    <div id="range-icon" class="icon-4xl text-white">
                        <img src="./icons/arrow-down.png" alt="下向き矢印">
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- サブ情報 -->
    <p class="text-sm voice-range-sub-text" id="sub-info-text">待機中...</p>

    <!-- 検出状況表示 -->
    <div class="detection-meters">
        <!-- 音量レベル（音域テスト用） -->
        <div class="meter-group" id="range-volume-container">
            <div class="meter-label">
                <span>音量レベル</span>
                <span class="volume-text meter-value" id="range-test-volume-text">0%</span>
            </div>
            <div class="progress-bar">
                <div class="progress-fill gradient-catalog-green" id="range-test-volume-bar"></div>
            </div>
        </div>

        <!-- 検出周波数（音域テスト用） -->
        <div class="meter-group">
            <div class="meter-label">
                <span>検出周波数</span>
                <span class="meter-value" id="range-test-frequency-value">0 Hz</span>
            </div>
        </div>
    </div>

    <!-- コントロールボタン -->
    <button class="btn btn-primary voice-range-btn" id="begin-range-test-btn">
        <i data-lucide="play"></i>
        <span>音域テスト開始</span>
    </button>

    <button class="btn btn-outline ml-3 voice-range-btn hidden" id="retry-measurement-btn">
        <i data-lucide="refresh-cw"></i>
        <span>再測定</span>
    </button>
</section>
```

**重要な要素**:
- **円形プログレスバー**: `.voice-progress-circle` - 3秒測定タイマー
- **マイクステータス**: `#mic-status-container` - 録音状態表示
- **ステータステキスト**: `#main-status-text`, `#sub-info-text`
- **音域テスト用メーター**: `#range-test-volume-bar`, `#range-test-frequency-value`
- **アイコン切り替え**: `#range-icon` - 低音(arrow-down)・高音(arrow-up)切り替え

#### 6. 結果表示セクション (lines 252-303)
```html
<section class="test-section hidden" id="result-section">
    <div class="result-card">
        <h4 class="heading-sm">
            <i data-lucide="music" class="text-orange-400"></i>
            <span>あなたの音域</span>
        </h4>
        <div class="range-info-container">
            <div class="range-info-row">
                <span>音域範囲</span>
                <span class="range-info-value" id="result-range">A2 - F5</span>
            </div>
            <div class="range-info-row">
                <span>オクターブ数</span>
                <span class="range-info-value" id="result-octaves">2.6オクターブ</span>
            </div>
            <div class="range-info-row">
                <span>低音域</span>
                <span class="range-info-value" id="result-low-freq">110.0 Hz (A2)</span>
            </div>
            <div class="range-info-row">
                <span>高音域</span>
                <span class="range-info-value" id="result-high-freq">698.5 Hz (F5)</span>
            </div>
        </div>

        <!-- 詳細統計表示エリア -->
        <div class="range-info-container" id="result-details">
            <!-- JavaScriptで動的に挿入される詳細統計 -->
        </div>
    </div>

    <div class="success-alert">
        <i data-lucide="check-circle"></i>
        <p>音域測定が完了しデータが保存されました。この結果でトレーニングを開始できます。次回から音域測定はスキップ可能です。</p>
    </div>

    <div class="flex gap-3 mt-4">
        <button class="btn btn-outline" id="remeasure-range-btn">
            <span>再測定</span>
            <i data-lucide="refresh-cw"></i>
        </button>
        <button class="btn btn-success" id="start-training-btn">
            <span>この結果でトレーニング開始</span>
            <i data-lucide="arrow-right"></i>
        </button>
    </div>
</section>
```

**動的更新要素**:
- `#result-range`: 音域範囲（例：A2 - F5）
- `#result-octaves`: オクターブ数（例：2.6オクターブ）
- `#result-low-freq`: 低音域（例：110.0 Hz (A2)）
- `#result-high-freq`: 高音域（例：698.5 Hz (F5)）
- `#result-details`: 快適音域等の詳細統計

## 📚 依存関係

### CSSファイル
```html
<link rel="stylesheet" href="../styles/base.css">          <!-- 基本スタイル -->
<link rel="stylesheet" href="../styles/results.css">      <!-- 結果表示スタイル -->
<link rel="stylesheet" href="../styles/training.css">     <!-- トレーニングスタイル -->
<link rel="stylesheet" href="css/preparation-range-test.css"> <!-- 音域テスト専用 -->
```

### JavaScriptライブラリ
```html
<!-- 1. 基盤システム -->
<script src="../../../js/data-manager.js"></script>

<!-- 2. 音声処理ライブラリ（v1.3.1版） -->
<script src="../../../js/pitchpro-audio/pitchpro-v1.3.1.umd.js"></script>

<!-- 3. UIライブラリ -->
<script src="https://unpkg.com/lucide@latest/dist/umd/lucide.js"></script>

<!-- 4. メインアプリケーション（PitchProサイクル実装） -->
<script src="js/preparation.js"></script>

<!-- 5. 音域テスト統合スクリプト（完全動作版） -->
<script type="module" src="js/voice-range-test-demo.js"></script>
```

## 🎮 JavaScript制御

### 主要JavaScript関数

#### 1. preparation.js（メインコントローラー）
- **マイク許可処理**: `#request-mic-btn`イベント
- **PitchPro初期化**: AudioDetectionComponent作成
- **音声テスト管理**: 音量・周波数検出
- **セクション切り替え**: `hidden`クラス制御

#### 2. voice-range-test-demo.js（音域テスト統合）
- **音域テスト開始**: `#begin-range-test-btn`イベント
- **測定フロー制御**: 低音測定 → 高音測定
- **円形プログレスバー**: 3秒アニメーション制御
- **結果計算・表示**: `displayVoiceRangeResults()`

### 重要なグローバル変数
- `window.globalAudioDetector`: 共有AudioDetectionComponentインスタンス
- `window.pitchProCycleManager`: PitchProサイクル管理

## 🔧 重要な修正履歴

### globalAudioDetectorスコープ問題（2025年1月解決）
**問題**: ローカル変数`globalAudioDetector`が`window.globalAudioDetector`をシャドウイング
**解決**: 55箇所の参照を`window.globalAudioDetector`に統一

### 円形プログレスバー問題
**問題**: 3秒アニメーションが動作しない
**解決**: `handleVoiceDetection()`コールバック正常実行により解決

### 結果表示問題
**問題**: 音域テスト完了後に結果セクションが表示されない
**解決**: 必要なHTML要素追加・セクション切り替え処理実装

## 📋 重要なID・クラス一覧

### セクション制御
- `#permission-section`: マイク許可セクション
- `#audio-test-section`: 音声テストセクション
- `#range-test-section`: 音域テストセクション
- `#result-section`: 結果表示セクション

### 進捗表示
- `#step-1`, `#step-2`, `#step-3`: 進捗ステップ
- `#connector-1`, `#connector-2`: 接続線

### 音声テスト関連
- `#volume-value`: 音量パーセント表示
- `#volume-progress`: 音量プログレスバー
- `#frequency-value`: 周波数・音程表示

### 音域テスト関連
- `#main-status-text`: メインステータステキスト
- `#sub-info-text`: サブステータステキスト
- `#range-test-volume-text`: 音域テスト音量表示
- `#range-test-volume-bar`: 音域テスト音量バー
- `#range-test-frequency-value`: 音域テスト周波数表示
- `.voice-progress-circle`: 3秒円形プログレスバー
- `#range-icon`: 測定対象アイコン（低音・高音切り替え）

### 結果表示関連
- `#result-range`: 音域範囲結果
- `#result-octaves`: オクターブ数結果
- `#result-low-freq`: 低音域結果
- `#result-high-freq`: 高音域結果
- `#result-details`: 詳細統計エリア

### ボタン関連
- `#request-mic-btn`: マイク許可ボタン
- `#start-range-test-btn`: 音域テスト開始ボタン
- `#begin-range-test-btn`: 音域テスト実行ボタン
- `#retry-measurement-btn`: 再測定ボタン
- `#remeasure-range-btn`: 再測定ボタン（結果画面）
- `#start-training-btn`: トレーニング開始ボタン

## 🚀 リファクタリング推奨事項

### 1. コンポーネント分離
現在の単一HTMLファイルを以下に分離することを推奨：
- `MicPermissionComponent.js`: マイク許可処理
- `VoiceTestComponent.js`: 音声テスト処理
- `VoiceRangeTestComponent.js`: 音域テスト処理
- `ResultDisplayComponent.js`: 結果表示処理

### 2. 状態管理統一
- 進捗状態の集中管理
- セクション表示/非表示の統一API
- 測定データの構造化

### 3. エラーハンドリング強化
- マイク許可失敗時の対応
- 音声検出失敗時の代替フロー
- 測定データ不足時の警告

### 4. アクセシビリティ改善
- スクリーンリーダー対応
- キーボードナビゲーション
- 色彩以外の視覚的フィードバック

### 5. パフォーマンス最適化
- 不要なリアルタイム処理の削減
- 音声処理の効率化
- DOM操作の最小化

## 📊 測定仕様

### 音域テスト仕様
- **測定時間**: 低音3秒・高音3秒
- **サンプリング**: 30-60FPS（PitchPro依存）
- **音量閾値**: 1.5%以上
- **明瞭度閾値**: 0.4以上（PitchPro推奨値）
- **最小データ点数**: 設定可能（デフォルト値要確認）

### 結果計算
- **音域範囲**: 最低音〜最高音の音程名表示
- **オクターブ数**: 半音数÷12での算出
- **快適音域**: 全音域の80%範囲（推奨練習範囲）

## 🔗 関連ファイル

- `js/preparation.js`: メインロジック
- `js/voice-range-test-demo.js`: 音域テスト統合
- `js/voice-range-test-controller.js`: コントローラー
- `css/preparation-range-test.css`: 専用スタイル
- `../../../js/pitchpro-audio/pitchpro-v1.3.1.umd.js`: 音声処理ライブラリ

---

**作成日**: 2025年1月
**作成者**: Claude Code Assistant
**バージョン**: 1.0.0（統合完了版）