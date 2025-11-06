# PitchPro v1.1.5 アップデートガイド - 音程トレーニングアプリ向け

## 📋 概要

このドキュメントは、PitchProライブラリを使用した音程トレーニングアプリをv1.1.5にアップデートするための開発者向けガイドです。

**対象読者**: 音程トレーニングアプリの開発者・メンテナー  
**アップデート日**: 2025年9月9日  
**PitchProバージョン**: v1.1.5

## 🚀 v1.1.5の主要な新機能

### ✨ UIリセット機能付きupdateSelectors()
- **問題解決**: 音量バー切り替え時の表示残留バグを完全解決
- **自動リセット**: モード変更時にすべてのUI要素が初期状態(0値)に自動リセット
- **包括対応**: progress要素とdivスタイル両方に対応

### 🎯 音程トレーニングアプリでのメリット
- ✅ **スムーズなモード切り替え**: 音程練習↔音階練習↔和音練習の移行が自然に
- ✅ **UI同期の改善**: 前モードの音量バーが残る問題を解消
- ✅ **ユーザー体験向上**: ストレスフリーなトレーニング環境を実現

## 📦 アップデート手順

### 1. ファイル更新方法

#### **GitHubから直接利用している場合**
```bash
# リポジトリの最新版を取得
git pull origin main

# 特定バージョンの取得
wget https://github.com/kiyopi/pitchpro-audio-processing/releases/download/v1.1.5/pitchpro-v1.1.5.zip
```

#### **CDN経由で利用している場合**
```html
<!-- 旧バージョン -->
<script src="https://cdn.example.com/pitchpro@1.1.4/dist/pitchpro.umd.js"></script>

<!-- v1.1.5に更新 -->
<script src="https://cdn.example.com/pitchpro@1.1.5/dist/pitchpro.umd.js"></script>
```

#### **ローカルファイルを使用している場合**
1. [GitHubリリースページ](https://github.com/kiyopi/pitchpro-audio-processing/releases/tag/v1.1.5)から最新版をダウンロード
2. `dist/`フォルダ内のファイルを既存ファイルと置き換え

### 2. キャッシュクリア対策

```javascript
// ブラウザキャッシュ回避
const PITCHPRO_VERSION = '1.1.5';
const script = document.createElement('script');
script.src = `./dist/pitchpro.umd.js?v=${PITCHPRO_VERSION}`;
document.head.appendChild(script);
```

## 🎵 音程トレーニングアプリでの実装

### HTMLセットアップ例

```html
<!DOCTYPE html>
<html lang="ja">
<head>
    <title>音程トレーニングアプリ</title>
    <style>
        .training-mode {
            display: none;
            padding: 20px;
            margin: 10px;
            border: 2px solid #4CAF50;
            border-radius: 8px;
        }
        .training-mode.active {
            display: block;
        }
        .volume-bar {
            width: 100%;
            height: 20px;
            background: #f0f0f0;
            border-radius: 10px;
            overflow: hidden;
        }
        .volume-fill {
            height: 100%;
            background: linear-gradient(90deg, #4CAF50 0%, #FF5722 100%);
            width: 0%;
            transition: width 0.1s ease;
        }
    </style>
</head>
<body>
    <!-- コントロールボタン -->
    <div class="controls">
        <button id="init-btn">🎤 初期化</button>
        <button id="start-btn" disabled>▶️ 開始</button>
        <button id="stop-btn" disabled>⏹ 停止</button>
    </div>

    <!-- モード切り替えボタン -->
    <div class="mode-buttons">
        <button id="interval-mode-btn">🎵 音程練習</button>
        <button id="scale-mode-btn">🎼 音階練習</button>
        <button id="chord-mode-btn">🎹 和音練習</button>
    </div>

    <!-- 音程練習モード -->
    <div id="interval-training" class="training-mode active">
        <h3>🎵 音程練習モード</h3>
        <div class="volume-bar">
            <div class="volume-fill" id="interval-volume-bar"></div>
        </div>
        <p>音量: <span id="interval-volume-text">0.0%</span></p>
        <p>周波数: <span id="interval-frequency">0.0 Hz</span></p>
        <p>音符: <span id="interval-note">-</span></p>
    </div>

    <!-- 音階練習モード -->
    <div id="scale-training" class="training-mode">
        <h3>🎼 音階練習モード</h3>
        <div class="volume-bar">
            <div class="volume-fill" id="scale-volume-bar"></div>
        </div>
        <p>音量: <span id="scale-volume-text">0.0%</span></p>
        <p>周波数: <span id="scale-frequency">0.0 Hz</span></p>
        <p>音符: <span id="scale-note">-</span></p>
    </div>

    <!-- 和音練習モード -->
    <div id="chord-training" class="training-mode">
        <h3>🎹 和音練習モード</h3>
        <div class="volume-bar">
            <div class="volume-fill" id="chord-volume-bar"></div>
        </div>
        <p>音量: <span id="chord-volume-text">0.0%</span></p>
        <p>周波数: <span id="chord-frequency">0.0 Hz</span></p>
        <p>音符: <span id="chord-note">-</span></p>
    </div>

    <!-- PitchPro v1.1.5 -->
    <script src="./dist/pitchpro.umd.js"></script>
    <script src="./pitch-training-app.js"></script>
</body>
</html>
```

### JavaScript実装例

```javascript
// pitch-training-app.js - v1.1.5対応版

class PitchTrainingApp {
    constructor() {
        this.audioDetector = null;
        this.currentMode = 'interval';
        this.isInitialized = false;
        
        // UI要素の取得
        this.elements = {
            initBtn: document.getElementById('init-btn'),
            startBtn: document.getElementById('start-btn'),
            stopBtn: document.getElementById('stop-btn'),
            intervalModeBtn: document.getElementById('interval-mode-btn'),
            scaleModeBtn: document.getElementById('scale-mode-btn'),
            chordModeBtn: document.getElementById('chord-mode-btn'),
            
            // トレーニングモードセクション
            intervalTraining: document.getElementById('interval-training'),
            scaleTraining: document.getElementById('scale-training'),
            chordTraining: document.getElementById('chord-training')
        };
        
        this.setupEventListeners();
    }

    setupEventListeners() {
        // 初期化ボタン
        this.elements.initBtn.addEventListener('click', () => this.initialize());
        
        // 開始・停止ボタン
        this.elements.startBtn.addEventListener('click', () => this.startDetection());
        this.elements.stopBtn.addEventListener('click', () => this.stopDetection());
        
        // モード切り替えボタン（v1.1.5新機能活用）
        this.elements.intervalModeBtn.addEventListener('click', () => this.switchToIntervalMode());
        this.elements.scaleModeBtn.addEventListener('click', () => this.switchToScaleMode());
        this.elements.chordModeBtn.addEventListener('click', () => this.switchToChordMode());
    }

    async initialize() {
        try {
            console.log('🎤 音程トレーニングアプリを初期化中...');
            
            // AudioDetectionComponent初期化（デフォルトは音程練習モード）
            this.audioDetector = new PitchPro.AudioDetectionComponent({
                volumeBarSelector: '#interval-volume-bar',
                volumeTextSelector: '#interval-volume-text',
                frequencySelector: '#interval-frequency',
                noteSelector: '#interval-note',
                
                // トレーニングアプリ向け設定
                clarityThreshold: 0.4,
                minVolumeAbsolute: 0.003,
                deviceOptimization: true,
                debug: true
            });

            // イベントコールバック設定
            this.audioDetector.setCallbacks({
                onPitchUpdate: (result) => this.handlePitchUpdate(result),
                onVolumeUpdate: (volume) => this.handleVolumeUpdate(volume),
                onError: (error) => this.handleError(error),
                onStateChange: (state) => console.log(`🔄 状態変更: ${state}`)
            });

            await this.audioDetector.initialize();
            
            this.isInitialized = true;
            console.log('✅ 初期化完了');
            
            // ボタン状態更新
            this.elements.initBtn.disabled = true;
            this.elements.startBtn.disabled = false;
            
        } catch (error) {
            console.error('❌ 初期化エラー:', error);
            alert(`初期化に失敗しました: ${error.message}`);
        }
    }

    startDetection() {
        if (!this.isInitialized) {
            alert('先に初期化を行ってください');
            return;
        }

        const started = this.audioDetector.startDetection();
        if (started) {
            console.log('🎵 音声検出開始');
            this.elements.startBtn.disabled = true;
            this.elements.stopBtn.disabled = false;
        }
    }

    stopDetection() {
        if (this.audioDetector) {
            this.audioDetector.stopDetection();
            console.log('⏹ 音声検出停止');
            this.elements.startBtn.disabled = false;
            this.elements.stopBtn.disabled = true;
        }
    }

    // 🎵 音程練習モード（v1.1.5新機能活用）
    switchToIntervalMode() {
        if (!this.audioDetector) return;

        console.log('🔄 音程練習モードに切り替え中...');
        
        // v1.1.5新機能：自動UIリセット付きセレクター変更
        this.audioDetector.updateSelectors({
            volumeBarSelector: '#interval-volume-bar',
            volumeTextSelector: '#interval-volume-text',
            frequencySelector: '#interval-frequency',
            noteSelector: '#interval-note'
        });

        this.updateModeDisplay('interval');
        this.currentMode = 'interval';
        console.log('✅ 音程練習モードに切り替え完了');
    }

    // 🎼 音階練習モード
    switchToScaleMode() {
        if (!this.audioDetector) return;

        console.log('🔄 音階練習モードに切り替え中...');
        
        this.audioDetector.updateSelectors({
            volumeBarSelector: '#scale-volume-bar',
            volumeTextSelector: '#scale-volume-text',
            frequencySelector: '#scale-frequency',
            noteSelector: '#scale-note'
        });

        this.updateModeDisplay('scale');
        this.currentMode = 'scale';
        console.log('✅ 音階練習モードに切り替え完了');
    }

    // 🎹 和音練習モード
    switchToChordMode() {
        if (!this.audioDetector) return;

        console.log('🔄 和音練習モードに切り替え中...');
        
        this.audioDetector.updateSelectors({
            volumeBarSelector: '#chord-volume-bar',
            volumeTextSelector: '#chord-volume-text',
            frequencySelector: '#chord-frequency',
            noteSelector: '#chord-note'
        });

        this.updateModeDisplay('chord');
        this.currentMode = 'chord';
        console.log('✅ 和音練習モードに切り替え完了');
    }

    // モード表示の更新
    updateModeDisplay(mode) {
        // すべてのモードを非表示
        this.elements.intervalTraining.classList.remove('active');
        this.elements.scaleTraining.classList.remove('active');
        this.elements.chordTraining.classList.remove('active');

        // 選択されたモードを表示
        if (mode === 'interval') {
            this.elements.intervalTraining.classList.add('active');
        } else if (mode === 'scale') {
            this.elements.scaleTraining.classList.add('active');
        } else if (mode === 'chord') {
            this.elements.chordTraining.classList.add('active');
        }

        // ボタンのアクティブ状態更新
        document.querySelectorAll('[id$="-mode-btn"]').forEach(btn => {
            btn.classList.remove('active');
        });
        document.getElementById(`${mode}-mode-btn`).classList.add('active');
    }

    // ピッチ更新ハンドラー
    handlePitchUpdate(result) {
        if (result.frequency > 0) {
            console.log(`🎵 [${this.currentMode}] ${result.note} - ${result.frequency.toFixed(1)}Hz (音量: ${result.volume.toFixed(1)}%)`);
            
            // モード固有の処理
            if (this.currentMode === 'interval') {
                this.processIntervalTraining(result);
            } else if (this.currentMode === 'scale') {
                this.processScaleTraining(result);
            } else if (this.currentMode === 'chord') {
                this.processChordTraining(result);
            }
        }
    }

    // 音量更新ハンドラー
    handleVolumeUpdate(volume) {
        // 必要に応じて音量に基づく処理を追加
        if (volume < 5) {
            console.log('💡 もう少し大きな声で歌ってみてください');
        }
    }

    // エラーハンドラー
    handleError(error) {
        console.error('❌ PitchPro エラー:', error);
        
        // ユーザーフレンドリーなエラー処理
        if (error.message.includes('Permission denied')) {
            alert('マイクのアクセス許可が必要です。ブラウザの設定を確認してください。');
        } else {
            alert(`エラーが発生しました: ${error.message}`);
        }
    }

    // トレーニングモード固有の処理メソッド
    processIntervalTraining(result) {
        // 音程練習固有のロジック
        // 例: 目標音程との差を計算・表示
    }

    processScaleTraining(result) {
        // 音階練習固有のロジック
        // 例: スケール内の音符かチェック
    }

    processChordTraining(result) {
        // 和音練習固有のロジック
        // 例: 和音構成音の検出・表示
    }

    // アプリケーション終了時のクリーンアップ
    destroy() {
        if (this.audioDetector) {
            this.audioDetector.destroy();
            console.log('🗑️ PitchTrainingApp クリーンアップ完了');
        }
    }
}

// アプリケーション初期化
document.addEventListener('DOMContentLoaded', () => {
    window.pitchTrainingApp = new PitchTrainingApp();
    console.log('🎵 音程トレーニングアプリ準備完了');
});

// ページ離脱時のクリーンアップ
window.addEventListener('beforeunload', () => {
    if (window.pitchTrainingApp) {
        window.pitchTrainingApp.destroy();
    }
});
```

## ⚠️ アップデート時の注意事項

### 1. 後方互換性の確認

```javascript
// v1.1.5機能の有無を確認
if (typeof audioDetector.updateSelectors === 'function') {
    console.log('✅ v1.1.5の新機能が利用可能');
    // 新機能を使用したモード切り替え
    audioDetector.updateSelectors(newSelectors);
} else {
    console.log('⚠️ 旧バージョン検出 - 手動UIリセットを実行');
    // 従来の手動リセット処理
    resetUIElementsManually();
    // セレクター更新（リセットなし）
    audioDetector.updateSelectors(newSelectors);
}
```

### 2. 既存のUIリセット処理の削除

```javascript
// ❌ v1.1.5以降は不要 - 削除推奨
function resetVolumeBarManually() {
    document.getElementById('old-volume-bar').style.width = '0%';
    document.getElementById('old-volume-text').textContent = '0.0%';
    // ... その他のリセット処理
}

// ✅ v1.1.5では自動実行されるため削除
// audioDetector.updateSelectors() 内で自動処理
```

### 3. デバッグとテスト

```javascript
// デバッグ用状態確認
console.log('📊 AudioDetectionComponent状態:', audioDetector.getStatus());

// 新機能のテスト
function testUpdateSelectors() {
    const testSelectors = {
        volumeBarSelector: '#test-volume-bar',
        volumeTextSelector: '#test-volume-text',
        frequencySelector: '#test-frequency'
    };
    
    try {
        audioDetector.updateSelectors(testSelectors);
        console.log('✅ updateSelectors テスト成功');
    } catch (error) {
        console.error('❌ updateSelectors テスト失敗:', error);
    }
}
```

## 🎯 期待される効果

### Before（v1.1.4以前）
```
音程練習 → 音階練習切り替え時:
❌ 音程練習の音量バーが動き続ける
❌ 複数の音量バーが同時に動作
❌ ユーザーの混乱とストレス
```

### After（v1.1.5）
```
音程練習 → 音階練習切り替え時:
✅ 音程練習の音量バーが自動で0にリセット
✅ 音階練習の音量バーのみが動作
✅ クリーンで直感的な切り替え体験
```

## 📚 関連ドキュメント

- **[CHANGELOG.md](./CHANGELOG.md)** - v1.1.5の詳細変更履歴
- **[README.md](./README.md)** - AudioDetectionComponentの完全ガイド  
- **[updateSelectors-demo.html](./updateSelectors-demo.html)** - 実際の動作デモ
- **[CLAUDE.md](./CLAUDE.md)** - 開発ガイドライン

## 🔧 トラブルシューティング

### Q1: updateSelectors()が見つからないエラー
```javascript
// 解決方法: バージョン確認
console.log('PitchProバージョン:', PitchPro.VERSION || 'バージョン情報なし');

// ファイル更新の確認
const script = document.querySelector('script[src*="pitchpro"]');
console.log('読み込み中のスクリプト:', script?.src);
```

### Q2: 音量バーがリセットされない
```javascript
// 解決方法: セレクターが正しいか確認
const element = document.querySelector('#your-volume-bar');
console.log('要素の存在確認:', !!element);

// updateSelectorsの呼び出し確認
audioDetector.updateSelectors({
    volumeBarSelector: '#your-volume-bar', // 正しいセレクターか確認
    // ...
});
```

### Q3: 複数モード間の切り替えが不安定
```javascript
// 解決方法: モード切り替え前に一時停止
stopDetection();
switchToNewMode();
startDetection();
```

## 📞 サポート

**技術的な質問やバグ報告**:
- GitHub Issues: [https://github.com/kiyopi/pitchpro-audio-processing/issues](https://github.com/kiyopi/pitchpro-audio-processing/issues)
- 開発チーム: [担当者連絡先]

---

**最終更新**: 2025年9月9日  
**ドキュメントバージョン**: 1.0  
**対象PitchProバージョン**: v1.1.5+