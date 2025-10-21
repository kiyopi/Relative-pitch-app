# 音域テスト挙動仕様書

**ファイル**:
- **スタンドアロン版**: preparation-step1.html + preparation-pitchpro-cycle.js + voice-range-test.js
- **SPA版**: templates/preparation.html + preparationController.js + preparation-pitchpro-cycle.js (SPA対応) + voice-range-test.js

**作成日**: 2025年1月9日
**最終更新**: 2025年10月21日（SPA統合仕様追加）
**目的**: 音域テスト時の完全な動作フロー定義

---

## 🔄 SPA統合時の動作フロー（2025年10月21日追加）

### **アーキテクチャ概要**

#### **スタンドアロン版（正規版）**
```
preparation-step1.html
├── preparation-pitchpro-cycle.js (1,443行) - 完全なロジック
├── voice-range-test.js (2,500+行) - 音域テストコア
└── 完全自己完結型（ページリロードで初期化）
```

#### **SPA版（本番環境）**
```
templates/preparation.html (HTMLテンプレート)
├── preparationController.js (34行) - 軽量ラッパー
├── preparation-pitchpro-cycle.js (SPA対応版) - 正規版ロジック
├── voice-range-test.js (共通) - 音域テストコア
└── window.globalAudioDetector - AudioDetectorインスタンス永続化
```

### **SPA化の設計思想**

#### **最小変更の原則**
- ✅ **正規版の完全なロジック（3,000+行）をそのまま活用**
- ✅ **preparation-pitchpro-cycle.jsの変更は3箇所のみ**（ページ遷移をハッシュルーティングに）
- ✅ **スタンドアロン版の後方互換性を維持**
- ✅ **voice-range-test.jsは完全共通使用**（バージョン分岐なし）

#### **主要な変更点**
1. **ページ遷移**: `window.location.href = 'training.html'` → `window.location.hash = '#/training'`
2. **初期化関数**: DOMContentLoadedラッパーを`window.initializePreparationPitchProCycle()`として公開
3. **AudioDetectorインスタンス**: `window.globalAudioDetector`で永続化（ページ間共有）

### **SPA Controller実装**

#### **preparationController.js（軽量ラッパー）**
```javascript
// /js/controllers/preparationController.js

export async function initializePreparationPage() {
    console.log('🚀 PreparationController initializing (SPA version)...');

    // 正規版の初期化関数を呼び出す
    if (typeof window.initializePreparationPitchProCycle === 'function') {
        await window.initializePreparationPitchProCycle();
        console.log('✅ 正規版の初期化完了（preparation-pitchpro-cycle.js）');
    } else {
        console.error('❌ window.initializePreparationPitchProCycle が見つかりません');
        console.error('確認: pages/js/preparation-pitchpro-cycle.js が正しく読み込まれていますか？');
    }
}

// リセット関数（router.jsから呼び出される）
export function resetPreparationPageFlag() {
    console.log('PreparationController reset (SPA version)');
    // window.globalAudioDetectorはSPA全体で共有されるため、リセット不要
}
```

**設計ポイント**:
- **34行のみ** - 最小限のラッパーコード
- **正規版を呼び出すだけ** - ロジックの重複を完全排除
- **エラーハンドリング** - 正規版が読み込まれているか確認

### **AudioDetector永続化の実装**

#### **スタンドアロン版（ページ内スコープ）**
```javascript
// preparation-pitchpro-cycle.js（スタンドアロン版）

let audioDetector = null; // ページ内スコープ

document.addEventListener('DOMContentLoaded', async () => {
    // AudioDetector初期化
    audioDetector = new AudioDetectionComponent({
        volumeBarSelector: '#volume-progress',
        volumeTextSelector: '#volume-value',
        // ...
    });

    await audioDetector.initialize();

    // ページ遷移（リロード）
    window.location.href = 'training.html';
    // → マイク許可が失われる
});
```

#### **SPA版（グローバルスコープ）**
```javascript
// preparation-pitchpro-cycle.js（SPA対応版）

// グローバルスコープで永続化
if (!window.globalAudioDetector) {
    window.globalAudioDetector = null;
}

window.initializePreparationPitchProCycle = async function() {
    // AudioDetector初期化（グローバル変数に保存）
    window.globalAudioDetector = new AudioDetectionComponent({
        volumeBarSelector: '#volume-progress',
        volumeTextSelector: '#volume-value',
        // ...
    });

    await window.globalAudioDetector.initialize();

    // ページ遷移（ハッシュルーティング）
    window.location.hash = '#/training';
    // → マイク許可が維持される
};
```

**メリット**:
- ✅ **マイク許可の永続化** - 準備ページ→トレーニングページで引き継ぎ
- ✅ **高速画面遷移** - ページリロードなしの即座切り替え
- ✅ **パフォーマンス向上** - AudioDetectorインスタンスの使い回し

### **ページ遷移の実装比較**

#### **スタンドアロン版（3箇所）**
```javascript
// 1. 音域テスト完了→トレーニング開始
completeRangeTestBtn.addEventListener('click', () => {
    window.location.href = 'training.html';
});

// 2. 音域データ保存済み→スキップ
skipRangeTestBtn.addEventListener('click', () => {
    window.location.href = 'training.html';
});

// 3. 音声テスト完了→音域テスト開始
startRangeTestBtn.addEventListener('click', () => {
    showSection(rangeTestSection);
});
```

#### **SPA版（3箇所のみ変更）**
```javascript
// 1. 音域テスト完了→トレーニング開始
completeRangeTestBtn.addEventListener('click', () => {
    window.location.hash = '#/training'; // ← 変更
});

// 2. 音域データ保存済み→スキップ
skipRangeTestBtn.addEventListener('click', () => {
    window.location.hash = '#/training'; // ← 変更
});

// 3. 音声テスト完了→音域テスト開始（変更なし）
startRangeTestBtn.addEventListener('click', () => {
    showSection(rangeTestSection); // ← 同じ
});
```

**変更箇所**: `window.location.href` → `window.location.hash` のみ

### **HTMLテンプレートの統一**

#### **Button ID統一問題の修正**
```html
<!-- 修正前（SPA版で不一致） -->
<button class="btn btn-primary hidden" id="goto-range-test-btn">
    <span>音域テストを開始</span>
</button>

<!-- 修正後（正規版に統一） -->
<button class="btn btn-primary hidden" id="start-range-test-btn">
    <span>音域テストを開始</span>
</button>
```

**修正理由**:
- `preparation-pitchpro-cycle.js:540`が`#start-range-test-btn`を期待
- SPA版テンプレートのID不一致によりボタンが表示されなかった

### **アイコンパス解決（SPA環境対応）**

#### **問題: 相対パスの不正解決**
```javascript
// voice-range-test.js（修正前）
const iconSrc = iconType === 'arrow-up'
    ? './icons/arrow-up.png'    // ← SPA環境で解決できない
    : './icons/arrow-down.png';
```

#### **解決: 絶対パスに変更**
```javascript
// voice-range-test.js（修正後）
const iconSrc = iconType === 'arrow-up'
    ? 'pages/icons/arrow-up.png'    // ← SPA環境で正しく解決
    : 'pages/icons/arrow-down.png';
```

**修正箇所**: 2箇所（`voice-range-test.js:2602, 2648`）

### **状態管理の完全性**

#### **測定完了時のUI状態同期**
```javascript
// 高音域測定完了時の処理（voice-range-test.js:2216-2250）

// ✅ 1. バッジ状態更新
setTimeout(() => {
    updateBadgeForConfirmed(); // チェックマーク表示
}, 100);

// ✅ 2. プログレスバーリセット
updateCircularProgressInstantly(0);

// ✅ 3. 検出停止→音量リセット→マイク状態更新（順序重要）
if (window.globalAudioDetector && window.globalAudioDetector.stopDetection) {
    window.globalAudioDetector.stopDetection();
}
resetVolumeDisplay();
updateMicStatus('standby');

// ✅ 4. 遅延後に結果表示（UX配慮）
setTimeout(() => {
    const results = calculateVoiceRange();
    if (results) {
        displayVoiceRangeResults(results);
    }
}, 1500);
```

**重要な修正ポイント**:
- **修正前**: チェックマーク表示後、即座に結果画面へ遷移（チェックマークが見えない）
- **修正後**: 1500ms遅延でユーザーがチェックマークを確認できる
- **順序重要**: `stopDetection()` → `resetVolumeDisplay()` → `updateMicStatus()`

### **測定失敗時のリトライ機能**

#### **問題: マイクミュート状態でリトライ不可**
```javascript
// 修正前（マイク起動忘れ）
function retryLowPitchMeasurement() {
    resetVoiceStability();
    updateCircularProgressInstantly(0);
    // ← startDetection()がない
    // ← updateMicStatus()がない
}
```

#### **修正後（完全な状態復帰）**
```javascript
// 修正後（voice-range-test.js:1858-1886）
function retryLowPitchMeasurement() {
    resetVoiceStability();

    // データクリーンアップ
    globalState.silentFrameCount = 0;
    globalState.hasContinuityFailure = false;

    updateCircularProgressInstantly(0);

    // マイク再起動（重要）
    if (window.globalAudioDetector && window.globalAudioDetector.startDetection) {
        setTimeout(() => {
            window.globalAudioDetector.startDetection();
            updateMicStatus('recording');
        }, 100);
    }
}
```

**修正箇所**: 2箇所（低音リトライ・高音リトライ）

### **高音測定フェーズの非同期処理修正**

#### **問題: 非同期タイミングずれ**
```javascript
// 修正前（voice-range-test.js:2112-2131）
function startHighPitchPhase() {
    setTimeout(() => {
        if (window.globalAudioDetector.startDetection) {
            window.globalAudioDetector.startDetection();
        }
    }, 100);

    updateMicStatus('recording'); // ← タイミングが早すぎる
}
```

#### **修正後（同期化）**
```javascript
// 修正後
function startHighPitchPhase() {
    setTimeout(() => {
        if (window.globalAudioDetector.startDetection) {
            window.globalAudioDetector.startDetection();
        }
        updateMicStatus('recording'); // ← setTimeout内に移動
    }, 100);
}
```

**修正理由**: `startDetection()`完了前に`updateMicStatus()`が呼ばれる問題を解決

### **データクリーンアップの完全性**

#### **測定失敗時のデータリリース**
```javascript
// リトライ関数でのデータリセット（voice-range-test.js:1858-1927）

function retryLowPitchMeasurement() {
    // 基本リセット
    resetVoiceStability();

    // 追加リセット（重要）
    globalState.silentFrameCount = 0;        // 無音フレームカウントリセット
    globalState.hasContinuityFailure = false; // 連続性失敗フラグリセット

    updateCircularProgressInstantly(0);
}

function retryHighPitchMeasurement() {
    // 同様のリセット処理
    resetVoiceStability();
    globalState.silentFrameCount = 0;
    globalState.hasContinuityFailure = false;
    updateCircularProgressInstantly(0);
}
```

**検証結果**: 失敗時の音域データが完全にリリースされることを確認

### **SPA統合のベストプラクティス**

#### **1. グローバル変数管理**
- ✅ **window.globalAudioDetector**: AudioDetectorインスタンス永続化
- ✅ **window.initializePreparationPitchProCycle**: 初期化関数の公開
- ⚠️ **注意**: グローバル変数の最小化、必要な場合のみ使用

#### **2. ハッシュルーティング統一**
- ✅ **ページ遷移**: `window.location.hash` 使用
- ✅ **外部遷移**: `window.location.href` 維持（必要時）
- ⚠️ **注意**: 遷移後のページ初期化処理を適切に実装

#### **3. 状態同期の厳格性**
- ✅ **順序遵守**: `stopDetection()` → `resetVolumeDisplay()` → `updateMicStatus()`
- ✅ **非同期処理**: setTimeout内で状態更新を同期
- ✅ **UX配慮**: 視覚フィードバックのための適切な遅延（1500ms等）

#### **4. リソース管理**
- ✅ **AudioDetector永続化**: ページ間でインスタンス使い回し
- ✅ **データクリーンアップ**: 失敗時の完全なリセット
- ✅ **メモリリーク防止**: 不要なイベントリスナーの適切な削除

### **次回スタンドアロン版を作成する場合の移植手順**

#### **Step 1: ファイル取得**
1. `/pages/preparation-step1.html` - 完全版リファレンス（変更なし使用可能）
2. `/pages/js/voice-range-test.js` - そのまま使用可能
3. `/pages/js/preparation-pitchpro-cycle.js` - SPA対応部分を削除（3箇所）

#### **Step 2: preparation-pitchpro-cycle.jsの修正**
```javascript
// 修正箇所1: グローバル関数化を削除
// 修正前（SPA版）
window.initializePreparationPitchProCycle = async function() {
    // ...
};

// 修正後（スタンドアロン版）
document.addEventListener('DOMContentLoaded', async () => {
    // ...
});

// 修正箇所2-4: ハッシュルーティングを元に戻す
// 修正前（SPA版）
window.location.hash = '#/training';

// 修正後（スタンドアロン版）
window.location.href = 'training.html';
```

#### **Step 3: AudioDetectorスコープ変更**
```javascript
// 修正前（SPA版 - グローバル）
window.globalAudioDetector = new AudioDetectionComponent({ ... });

// 修正後（スタンドアロン版 - ページ内）
let audioDetector = new AudioDetectionComponent({ ... });
```

#### **Step 4: 動作確認**
- ✅ マイク許可フロー正常動作
- ✅ 音声テスト完了→音域テスト遷移
- ✅ 音域テスト完了→トレーニングページ遷移
- ✅ 画像パス解決（`pages/icons/`は共通使用可能）

---

## 🚀 テスト開始フロー

### 1. 前提条件チェック
```javascript
// 必須要素の存在確認
if (!voiceRangeTester || !audioDetector) {
    showErrorMessage('音域テスト用システムが正常に初期化されていません');
    return;
}
```

### 2. AudioDetectionComponent初期化
```javascript
// 既存のAudioDetectorを破棄（重要）
if (audioDetector) {
    audioDetector.stopDetection();
    audioDetector.destroy();
    audioDetector = null;
}

// 音域テスト用の新しいAudioDetector作成
audioDetector = new AudioDetectionComponent({
    volumeBarSelector: '#range-test-volume-bar',
    volumeTextSelector: '#range-test-volume-text', 
    frequencySelector: '#range-test-frequency-value',
    clarityThreshold: 0.4,
    minVolumeAbsolute: 0.01,  // 雑音対策で調整予定
    deviceOptimization: true,
    debug: true,
    logPrefix: '🎵 RangeTest'
});

await audioDetector.initialize();
```

### 3. UI表示切り替え
```javascript
console.log('🎵 音域テスト開始（VoiceRangeTesterV113使用）');
showSection(rangeTestSection);  // 音域テスト画面を表示
updateStepStatus(3, 'active'); // ステップ3をアクティブに
```

---

## 🎯 VoiceRangeTesterV113の動作

### 初期化時の設定
- **テストフェーズ管理**: `'idle' → 'ready' → 'low' → 'high' → 'completed'`
- **独立タイマー制御**: 円形プログレス専用タイマー（3秒固定）
- **音程検出**: 最低音・最高音の検出と記録

### 主要メソッド
```javascript
// テスト開始
const success = voiceRangeTester.startRangeTest();

// プログレスコールバック設定
voiceRangeTester.setProgressCallback((stability) => {
    updateRangeTestBadge(stability);
});
```

### 内部処理フロー
1. **準備フェーズ**:
   - UI要素の確認
   - タイマーの初期化
   - プログレスバー0%表示

2. **低音テストフェーズ**:
   - 最低音の検出開始
   - 3秒間の測定
   - 音域テストバッジの進捗表示

3. **高音テストフェーズ**:
   - 最高音の検出開始
   - 3秒間の測定
   - 音域テストバッジの進捗表示

4. **完了フェーズ**:
   - 結果の保存
   - UIの状態更新

---

## 🎨 UI要素の更新

### 音量表示（リアルタイム）
```javascript
// 音量バー更新
elements.rangeVolumeBar.style.setProperty('width', `${volume}%`, 'important');

// 音量テキスト更新
elements.rangeVolumeText.textContent = `${Math.round(volume)}%`;
```

### 周波数表示（リアルタイム）
```javascript
// 周波数値更新
elements.rangeFrequencyValue.textContent = `${result.frequency.toFixed(1)} Hz`;
elements.rangeFrequencyValue.style.color = '#60a5fa';
```

### 音域テストバッジ（進捗表示）
```javascript
// 安定度表示更新
updateRangeTestBadge(stability); // 0-100%

// 中央アイコンの状態変更
const rangeIcon = document.getElementById('range-icon');
// フェーズに応じてアイコン変更（arrow-down, arrow-up等）
```

---

## 🔄 コールバック管理

### window.rangeTestUIUpdate
```javascript
window.rangeTestUIUpdate = function(result) {
    // PreparationTestUIクラスを使用してUI更新
    preparationUI.updateRangeTestUI(result);
    
    // VoiceRangeTesterV113に音程検出結果を転送
    if (voiceRangeTester && typeof voiceRangeTester.handlePitchDetection === 'function') {
        voiceRangeTester.handlePitchDetection(result);
    }
};
```

### VoiceRangeTesterV113の内部コールバック
```javascript
// PitchPro v1.1.3コールバック設定で window.rangeTestUIUpdate を呼び出し
this.pitchDetector.setCallbacks({
    ...originalCallbacks,
    onPitchUpdate: (result) => {
        // 【最優先】preparation-test.htmlのUI更新を強制実行
        if (window.rangeTestUIUpdate) {
            window.rangeTestUIUpdate(result);
        }
        // VoiceRangeTesterV113の内部処理...
    }
});
```

---

## 🎵 音程検出の詳細

### 検出条件
- **clarityThreshold**: 0.4（音程の明瞭度）
- **minVolumeAbsolute**: 0.01（最小音量閾値、雑音対策）
- **デバイス最適化**: 有効（PC/iPhone/iPad別設定）

### デバイス別設定（自動適用）
```javascript
PC: {
  volumeMultiplier: 3.0,
  sensitivityMultiplier: 2.5,
  minVolumeAbsolute: 0.003
},
iPhone: {
  volumeMultiplier: 4.5,
  sensitivityMultiplier: 3.5,
  minVolumeAbsolute: 0.002
},
iPad: {
  volumeMultiplier: 7.0,
  sensitivityMultiplier: 5.0,
  minVolumeAbsolute: 0.001  // 要調整（雑音の原因）
}
```

---

## 📊 テスト結果の管理

### データ保存
- **最低音**: 検出された最低周波数（Hz）
- **最高音**: 検出された最高周波数（Hz）
- **音域幅**: 最高音 - 最低音（セント単位）
- **測定時刻**: テスト完了時刻

### LocalStorage連携
```javascript
// dataManagerを使用してlocalStorageに保存
if (this.dataManager) {
    this.dataManager.saveRangeTestResult({
        lowNote: this.detectedLowNote,
        highNote: this.detectedHighNote,
        range: this.calculatedRange,
        timestamp: Date.now()
    });
}
```

---

## 🎨 v3.1.x UI改善アップデート

### v3.1.25: エラーメッセージ視認性向上（2025年1月20日）

#### 背景・課題
- 低音域測定時、ユーザーが無意識に音量を下げてしまい失敗することが多発
- 失敗時のメッセージが青字のままで目立たず、原因に気づきにくい
- 測定失敗の理由を明確に伝える必要性

#### 実装内容
**CSS追加** (`/styles/voice-range.css:204-208`):
```css
/* サブテキスト状態別バリエーション */
.voice-range-sub-text.error {
    color: #fca5a5; /* text-red-300 - 失敗・エラー時 */
    font-weight: 500;
}
```

**JavaScript修正**:
```javascript
// 失敗時の処理（22箇所で適用）
const subInfoText = document.getElementById('sub-info-text');
if (!lowestFreqValidation.isValid) {
    subInfoText.textContent = lowestFreqValidation.suggestion || lowestFreqValidation.reason;
    subInfoText.classList.add('error'); // 赤字に変更
}

// 成功・待機時の処理（4箇所で適用）
if (subInfoText) {
    subInfoText.textContent = '安定した声を認識したら自動で測定開始します';
    subInfoText.classList.remove('error'); // 青字に戻す
}
```

#### 改善効果
- ✅ 失敗メッセージが赤字で目立つようになり、ユーザーが原因を即座に認識
- ✅ 低音域測定時の音量不足に気づきやすくなる
- ✅ 再測定時の視覚的フィードバックが明確化

---

### v3.1.26: 安定最高音自動判定機能（2025年1月20日）

#### 背景・課題
**実測ログからの問題発見**:
```
データ90: 最高音 230.1 Hz (A#) - 85個のデータで安定
データ95: 最高音 288.4 Hz (D) - 測定終了直前に瞬間的にヒット
検証結果: 288.4 Hz付近に15個以上のデータが必要 → 1個のみ → 失敗
```

**ユーザーの実際の挙動**:
- 高音域測定中、288 Hzを瞬間的にヒット
- その後230 Hzで安定して維持（85個のデータ）
- しかしシステムは288 Hzを「最高音」と判定し、データ不足で失敗判定

**根本原因**: 瞬間的なピーク値を「最高音」として扱い、維持可能な安定周波数を無視していた

#### 実装内容

**新規関数**: `findStableHighestFrequency()` (`voice-range-test.js:1536-1582`)

```javascript
/**
 * 🎵 v3.1.26新機能: 安定した最高音を自動判定
 * 瞬間的なピーク値を無視し、十分なデータ数がある周波数を最高音とする
 */
function findStableHighestFrequency(highData) {
    const minRequiredNearHighest = 15;  // 安定判定の最低データ数
    const tolerance = 0.05;  // ±5%の範囲

    // 周波数を降順にソート（高い順）
    const sortedFreqs = [...highData.frequencies]
        .map(d => d.frequency)
        .filter(f => f > 0)
        .sort((a, b) => b - a);

    // 最高音から順に、安定した音域を探す
    const candidateFreqs = [...new Set(sortedFreqs)];

    for (const candidateFreq of candidateFreqs) {
        const candidateTolerance = candidateFreq * tolerance;
        const nearCandidateData = highData.frequencies.filter(d =>
            d.frequency >= (candidateFreq - candidateTolerance) &&
            d.frequency <= (candidateFreq + candidateTolerance)
        );

        if (nearCandidateData.length >= minRequiredNearHighest) {
            // 安定した音域を発見
            const avgFreq = nearCandidateData.reduce((sum, d) => sum + d.frequency, 0) / nearCandidateData.length;
            return {
                frequency: avgFreq,
                dataCount: nearCandidateData.length,
                isStable: true
            };
        }
    }

    // 安定した音域が見つからなかった
    return {
        frequency: sortedFreqs[0],
        dataCount: 1,
        isStable: false
    };
}
```

**適用箇所**: 高音域測定完了時に自動適用
```javascript
// 🎵 v3.1.26新機能: 瞬間的なピークを無視して安定した最高音を探す
const stableHighest = findStableHighestFrequency(highData);
if (stableHighest && stableHighest.isStable && stableHighest.frequency !== highData.highestFreq) {
    const originalHighest = highData.highestFreq;
    highData.highestFreq = stableHighest.frequency;
    highData.highestNote = frequencyToNoteName(stableHighest.frequency);
    console.log('🔄 安定した最高音に自動調整:', {
        '瞬間最高音': `${originalHighest.toFixed(1)} Hz（データ数不足）`,
        '安定最高音': `${stableHighest.frequency.toFixed(1)} Hz (${highData.highestNote})`,
        '安定音域データ数': stableHighest.dataCount + '個'
    });
}
```

#### アルゴリズム詳細

**検索戦略**:
1. 全周波数データを降順でソート（高い順）
2. 最高周波数から順に候補として検証
3. 各候補周波数に対して:
   - ±5%の範囲内のデータ数をカウント
   - 15個以上のデータがあれば「安定」と判定
   - その周波数を最高音として採用
4. 安定周波数が見つからなければ、元の最高周波数を維持

**判定基準**:
- **データ数要件**: 15個以上（既存の検証基準と統一）
- **周波数範囲**: ±5%以内（既存の検証基準と統一）
- **平均値計算**: 範囲内データの平均周波数を採用（精度向上）

#### 設計哲学
- 低音域の検証ロジックは変更なし（仕様通り厳密に）
- 高音域のみ自動調整（人間の発声特性に配慮）
- 既存の検証基準（15個、±5%）を再利用（一貫性）

#### 改善効果
- ✅ 高音域測定の成功率向上（瞬間ピークによる不合理な失敗を防止）
- ✅ ユーザーの自然な発声パターンに対応（瞬間的なピーク＋安定維持）
- ✅ 音楽的に妥当な評価（持続可能な最高音を正しく判定）
- ✅ 既存ロジックとの一貫性（15個、±5%基準の再利用）

**コミット**: `768df2c`

---

## ⚠️ 既知の問題・対策

### 1. 雑音検出問題
**問題**: iPadでminVolumeAbsolute: 0.001により微細な雑音を拾う
**対策**: 手動で0.01以上に設定（クリーンアップ時に実装）

### 2. マイクリソース管理
**問題**: AudioDetectionComponentの破棄忘れ
**対策**: 必ずdestroy()を呼んでからnullに設定

### 3. コールバック競合
**問題**: VoiceRangeTesterV113がコールバックを上書き
**対策**: window.rangeTestUIUpdateを通じた統一処理

### 4. UI要素の重複ID
**問題**: 同じIDの要素が複数存在する可能性
**対策**: PreparationTestUIクラスでキャッシュ管理

### 5. iPad 低周波数制約（ハードウェア制限）
**実測データ**:
- **検出最低周波数**: 78.8 Hz (D#)
- **80Hz以下の音量**: 1-2%範囲（極めて低い）
- **音量バー反応**: 80Hz以下では視覚的にほぼ動かない

**原因**: iPadマイクロフォンのハードウェア特性による物理的制約

**対応方針**:
- ソフトウェアでの調整は困難
- 実用的な下限を78-80Hzとして受容
- ユーザーへの説明・ガイダンス提供を検討

---

## 🚀 クリーンアップ時の保持すべき機能

### 必須機能
- ✅ AudioDetectionComponentの適切な初期化・破棄
- ✅ 音域テストバッジの更新
- ✅ リアルタイム音量・周波数表示
- ✅ VoiceRangeTesterV113との連携
- ✅ データ保存機能

### 削除対象（古いコード）
- ❌ 古いPitchProバージョンの対応コード
- ❌ 重複したデバイス検出処理
- ❌ 不要なコールバック保持処理
- ❌ 使用されていないテスト用コード

---

## 🎭 音域テストバッジ中央アイコンの挙動

### アイコン状態の変遷
```javascript
// 1. 初期状態（idle）
rangeIcon.setAttribute('data-lucide', 'arrow-down');
rangeIcon.style.display = 'block';
rangeIcon.style.color = 'white';

// 2. 低音テスト中
rangeIcon.setAttribute('data-lucide', 'arrow-down');  // 下矢印
rangeIcon.style.display = 'block';  // 声検出前は表示
rangeIcon.style.display = 'none';   // 声検出後は非表示

// 3. 高音テスト中
rangeIcon.setAttribute('data-lucide', 'arrow-up');    // 上矢印
rangeIcon.style.display = 'block';  // 声検出前は表示
rangeIcon.style.display = 'none';   // 声検出後は非表示
```

### カウントアップ表示との連動
```javascript
// 音声検出前：アイコン表示
rangeIcon.style.display = 'block';
countdownDisplay.style.display = 'none';

// 音声検出後：カウント表示（1→2→3）
rangeIcon.style.display = 'none';
countdownDisplay.style.display = 'block';
countdownDisplay.textContent = elapsedTime + 1; // 1, 2, 3

// 音声停止：アイコン復帰
rangeIcon.style.display = 'block';
countdownDisplay.style.display = 'none';
```

---

## 🎤 音声検出からの測定開始フロー

### フェーズ管理
```javascript
// VoiceRangeTesterV113の状態遷移
this.currentTestPhase = 'idle';     // 初期状態
this.currentTestPhase = 'ready';    // 準備完了
this.currentTestPhase = 'low';      // 低音テスト
this.currentTestPhase = 'high';     // 高音テスト
this.currentTestPhase = 'completed'; // 完了
```

### 音声検出による測定開始
```javascript
// 1. 待機状態（声検出前）
this.isWaitingForVoice = true;
this.isCollectingData = true;        // 音声監視開始
updateTestStatus('できるだけ低い声を出してください（声を検出すると3秒測定が始まります）');

// 2. 音声検出条件
if (result.frequency && result.frequency > 0 && 
    result.clarity > 0.6 && result.volume > 0.02) {
    
    // 初回音声検出
    if (!voiceDetectionStarted) {
        voiceDetectionStarted = true;
        console.log('🎤 ユーザーの声を検出 - 測定開始');
        testStatus.textContent = '測定中...';
        stabilityStartTime = Date.now();  // 測定開始時刻記録
    }
}
```

### 3秒カウントアップシステム
```javascript
// 音声安定性チェック（±8Hz以内）
if (Math.abs(detectedHz - lastFrequency) <= 8) {
    stableFrequencies.push(detectedHz);
    
    // 経過時間計算
    const stabilityDuration = Date.now() - stabilityStartTime;
    const elapsedSeconds = Math.floor(stabilityDuration / 1000);
    
    // プログレス計算（0-100%）
    const stabilityPercent = Math.min(100, (stabilityDuration / 3000) * 100);
    
    // カウントアップ表示（1, 2, 3）
    countdownDisplay.textContent = Math.min(elapsedSeconds + 1, 3);
    
    // 音域テストバッジの進捗更新
    updateRangeTestBadge(stabilityPercent);
    
    // 3秒完了チェック
    if (stabilityDuration >= 3000) {
        // 測定完了処理...
    }
}
```

---

## 🔄 測定中の動的表示制御

### 音声検出時の表示切り替え
```javascript
// 音声検出前の状態
- 中央アイコン: 表示（arrow-down/arrow-up）
- カウント数字: 非表示
- プログレスリング: 0%
- ステータス: 'できるだけ低い声を出してください'

// 音声検出後の状態  
- 中央アイコン: 非表示
- カウント数字: 表示（1→2→3）
- プログレスリング: 0%→33%→66%→100%
- ステータス: '測定中...'

// 音声途切れ時の状態
- 中央アイコン: 表示（元の矢印に戻る）
- カウント数字: 非表示
- プログレスリング: 0%にリセット
- ステータス: 'できるだけ低い声を出してください'（元に戻る）
```

### 音程安定度判定
```javascript
// 安定条件：±8Hz以内で同じ音程を維持
const STABILITY_THRESHOLD = 8; // Hz

// 不安定時の処理
if (Math.abs(currentFreq - lastFreq) > STABILITY_THRESHOLD) {
    // 測定リセット
    stableFrequencies = [];
    stabilityStartTime = null;
    
    // UI状態をリセット
    countdownDisplay.style.display = 'none';
    rangeIcon.style.display = 'block';
    updateRangeTestBadge(0);
}
```

---

## 📱 各テストフェーズの詳細挙動

### 低音テストフェーズ
```javascript
// 準備
showRangeIcon('low');                    // 下矢印表示
updateTestStatus('できるだけ低い声を出してください');
updateMicStatus('active');               // 赤色マイクアイコン

// 音声検出→測定開始
voiceDetectionStarted = true;
stabilityStartTime = Date.now();
rangeIcon.style.display = 'none';       // アイコン非表示
countdownDisplay.style.display = 'block'; // 数字表示

// 3秒測定完了
detectedLowFrequency = averageFrequency;
showRangeTestComplete('低', note, frequency);
setTimeout(() => startHighRangeTest(), 1500); // 1.5秒後に高音テストへ
```

### 高音テストフェーズ
```javascript
// 準備
showRangeIcon('high');                   // 上矢印表示
updateTestStatus('できるだけ高い声を出してください');
updateMicStatus('active');               // 赤色マイクアイコン

// 音声検出→測定開始
voiceDetectionStarted = true;
stabilityStartTime = Date.now();
rangeIcon.style.display = 'none';       // アイコン非表示
countdownDisplay.style.display = 'block'; // 数字表示

// 3秒測定完了
detectedHighFrequency = averageFrequency;
showRangeTestComplete('高', note, frequency);
// テスト完了処理へ
```

### 完了フェーズ
```javascript
// 結果表示
currentTestPhase = 'completed';
updateTestStatus('音域測定が完了しました');
updateMicStatus('success');              // 緑色マイクアイコン

// 最終的なバッジ表示
updateRangeTestBadge(100);              // 完了状態
rangeIcon.style.display = 'none';      // アイコン非表示維持
```

---

## 🎯 重要な実装ポイント

### 1. 音声検出の判定条件
```javascript
// 厳格な判定条件（雑音除去）
const isValidVoice = (
    result.frequency && result.frequency > 0 &&     // 周波数検出
    result.clarity > 0.6 &&                        // 明瞭度60%以上
    result.volume > 0.02                           // 音量2%以上（雑音除去）
);
```

### 2. 測定の連続性管理
```javascript
// 連続測定のための状態管理
let voiceDetectionStarted = false;        // 初回音声検出フラグ
let stabilityStartTime = null;           // 測定開始時刻
let stableFrequencies = [];              // 安定した周波数の履歴
```

### 3. UI状態の即座反映
```javascript
// リアルタイムUI更新（50ms間隔）
setInterval(() => {
    if (voiceDetectionStarted && stabilityStartTime) {
        const elapsed = Date.now() - stabilityStartTime;
        const progress = Math.min(100, (elapsed / 3000) * 100);
        
        updateRangeTestBadge(progress);
        updateCountdownDisplay(Math.floor(elapsed / 1000) + 1);
    }
}, 50);
```

---

**この詳細仕様書を基準にcleanup作業を実行する**