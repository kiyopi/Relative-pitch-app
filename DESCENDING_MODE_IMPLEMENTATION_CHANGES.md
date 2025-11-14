# 下行モード実装　変更箇所一覧

**作成日**: 2025-11-14
**バージョン**: 1.0.0

## 📋 変更が必要なファイル

### 1. ✅ home-direction-tabs.js（変更不要）
**状態**: すでに実装済み
- ✅ sessionStorageに `trainingDirection` を保存（line 56）
- ✅ デフォルト値 'ascending' 設定（line 37）

### 2. ✅ router.js（変更不要）
**状態**: 変更不要
- router.jsは12音階モードの`direction`パラメータのみ処理
- 上行・下行の`scaleDirection`はsessionStorageから取得

### 3. ✅ NavigationManager.js（変更不要）
**状態**: 変更不要
- NavigationManager.navigateToTraining()は12音階用
- 上行・下行はsessionStorageから取得

### 4. ⚠️ preparation-pitchpro-cycle.js（軽微な変更）
**ファイルパス**: `/PitchPro-SPA/pages/js/preparation-pitchpro-cycle.js`

**変更内容**: トレーニング開始時にsessionStorageから取得したscaleDirectionをURLパラメータに追加

#### 変更箇所1: line 1295-1300あたり

**現在の実装**:
```javascript
const finalMode = redirectInfo?.mode || window.preparationRedirectInfo?.mode || 'random';
const finalSession = redirectInfo?.session || window.preparationRedirectInfo?.session || null;
const finalDirection = redirectInfo?.direction || window.preparationRedirectInfo?.direction || null;

console.log(`📍 モード情報を保持して遷移: mode=${finalMode}, session=${finalSession || 'なし'}, direction=${finalDirection || 'なし'}`);
NavigationManager.navigateToTraining(finalMode, finalSession, finalDirection);
```

**修正後**:
```javascript
const finalMode = redirectInfo?.mode || window.preparationRedirectInfo?.mode || 'random';
const finalSession = redirectInfo?.session || window.preparationRedirectInfo?.session || null;
const finalDirection = redirectInfo?.direction || window.preparationRedirectInfo?.direction || null;

// 上行・下行の方向をsessionStorageから取得
const scaleDirection = sessionStorage.getItem('trainingDirection') || 'ascending';

console.log(`📍 モード情報を保持して遷移: mode=${finalMode}, session=${finalSession || 'なし'}, direction=${finalDirection || 'なし'}, scaleDirection=${scaleDirection}`);

// NavigationManagerではなく、直接URLを構築してscaleDirectionを追加
const params = new URLSearchParams({ mode: finalMode });
if (finalSession) params.set('session', finalSession);
if (finalDirection) params.set('direction', finalDirection);
params.set('scaleDirection', scaleDirection); // 上行・下行パラメータを追加

window.location.hash = `training?${params.toString()}`;
```

#### 変更箇所2: line 1545-1548あたり（同様の変更）

**現在の実装**:
```javascript
// NavigationManager.navigateToTraining()内でremoveBrowserBackPrevention()が自動的に呼ばれる
NavigationManager.navigateToTraining(finalMode, finalSession, finalDirection);
```

**修正後**:
```javascript
// 上行・下行の方向をsessionStorageから取得
const scaleDirection = sessionStorage.getItem('trainingDirection') || 'ascending';

// 直接URLを構築してscaleDirectionを追加
const params = new URLSearchParams({ mode: finalMode });
if (finalSession) params.set('session', finalSession);
if (finalDirection) params.set('direction', finalDirection);
params.set('scaleDirection', scaleDirection);

window.location.hash = `training?${params.toString()}`;
```

**⚠️ 注意**: NavigationManager.navigateToTraining()を使わない場合、以下を手動で呼び出す必要があります:
```javascript
NavigationManager.setNormalTransition();
NavigationManager.removeBrowserBackPrevention();
```

### 5. 🔧 trainingController.js（主要な変更）
**ファイルパス**: `/PitchPro-SPA/js/controllers/trainingController.js`

#### 変更箇所1: ドレミガイドの動的生成（新規関数追加、line 30あたり）

**追加するコード**:
```javascript
/**
 * ドレミガイドのHTMLを動的に生成
 * @param {string[]} intervals - 音程名の配列 ['ド', 'レ', 'ミ', ...] または ['ド', 'シ', 'ラ', ...]
 */
function updateDoremiGuide(intervals) {
    const noteCirclesContainer = document.querySelector('.note-circles');
    if (!noteCirclesContainer) {
        console.warn('⚠️ .note-circles要素が見つかりません');
        return;
    }

    // 既存のnote-circleを全削除
    noteCirclesContainer.innerHTML = '';

    // 新しいnote-circleを生成
    intervals.forEach((noteName, index) => {
        const noteCircle = document.createElement('div');
        noteCircle.className = 'note-circle';
        noteCircle.setAttribute('data-note', noteName);
        noteCircle.textContent = noteName;
        noteCirclesContainer.appendChild(noteCircle);
    });

    console.log(`🎵 ドレミガイド更新: ${intervals.join('→')}`);
}
```

#### 変更箇所2: line 28-29（定数→変数）

**現在の実装**:
```javascript
const intervals = ['ド', 'レ', 'ミ', 'ファ', 'ソ', 'ラ', 'シ', 'ド'];
const semitoneSteps = [0, 2, 4, 5, 7, 9, 11, 12]; // ド=0, レ=+2半音, ミ=+4半音...
```

**修正後**:
```javascript
let intervals = ['ド', 'レ', 'ミ', 'ファ', 'ソ', 'ラ', 'シ', 'ド'];
let semitoneSteps = [0, 2, 4, 5, 7, 9, 11, 12]; // ド=0, レ=+2半音, ミ=+4半音...
```

#### 変更箇所2: line 30（新規関数追加）

**追加するコード**:
```javascript
/**
 * 音階方向に応じた音階ステップを生成
 * @param {string} direction - 'ascending' または 'descending'
 * @returns {Object} { intervals: string[], semitoneSteps: number[] }
 */
function getScaleSteps(direction) {
    if (direction === 'descending') {
        return {
            intervals: ['ド', 'シ', 'ラ', 'ソ', 'ファ', 'ミ', 'レ', 'ド'],
            semitoneSteps: [0, -2, -4, -5, -7, -9, -11, -12]
        };
    } else {
        return {
            intervals: ['ド', 'レ', 'ミ', 'ファ', 'ソ', 'ラ', 'シ', 'ド'],
            semitoneSteps: [0, 2, 4, 5, 7, 9, 11, 12]
        };
    }
}
```

#### 変更箇所4: line 86の直後（音階ステップの動的生成 + ドレミガイド更新）

**現在の実装**:
```javascript
// 音階方向の設定
currentScaleDirection = scaleDirectionParam || 'ascending';
console.log(`✅ 音階方向設定: ${currentScaleDirection}`);
```

**修正後**:
```javascript
// 音階方向の設定
// まずURLパラメータをチェック、なければsessionStorageから取得
const scaleDirectionFromStorage = sessionStorage.getItem('trainingDirection');
currentScaleDirection = scaleDirectionParam || scaleDirectionFromStorage || 'ascending';
console.log(`✅ 音階方向設定: ${currentScaleDirection} (URLパラメータ: ${scaleDirectionParam}, sessionStorage: ${scaleDirectionFromStorage})`);

// 音階ステップの動的生成
const scaleSteps = getScaleSteps(currentScaleDirection);
intervals = scaleSteps.intervals;
semitoneSteps = scaleSteps.semitoneSteps;
console.log(`🎵 音階ステップ設定: ${intervals.join('→')}`);
console.log(`🎵 半音ステップ: ${semitoneSteps.join(', ')}`);

// ドレミガイドを更新（DOM読み込み後に実行）
setTimeout(() => {
    updateDoremiGuide(intervals);
}, 100);
```

#### 変更箇所4: line 730あたり（ログメッセージの改善）

**現在の実装**:
```javascript
const expectedFreq = baseNoteInfo.frequency * Math.pow(2, semitoneSteps[i] / 12);
console.log(`🎵 音程: ${intervals[i]} (+${semitoneSteps[i]}半音, 期待: ${expectedFreq.toFixed(1)}Hz)`);
```

**修正後**:
```javascript
const expectedFreq = baseNoteInfo.frequency * Math.pow(2, semitoneSteps[i] / 12);
const semitoneDiff = semitoneSteps[i];
const sign = semitoneDiff >= 0 ? '+' : '';
console.log(`🎵 音程: ${intervals[i]} (${sign}${semitoneDiff}半音, 期待: ${expectedFreq.toFixed(1)}Hz)`);
```

### 6. ✅ result-session-controller.js（変更不要）
**状態**: 変更不要
- すでにセッションデータに `scaleDirection` が保存されている
- 結果画面は自動的に表示される

### 7. ✅ results-overview-controller.js（変更不要）
**状態**: 変更不要
- 総合評価画面も `scaleDirection` を読み取って表示

---

## 📝 変更箇所サマリー

### 変更が必要なファイル（2ファイル）

| ファイル | 変更内容 | 行数 | 難易度 |
|---------|---------|------|--------|
| **preparation-pitchpro-cycle.js** | sessionStorageからscaleDirection取得 | 約10行 | 低 |
| **trainingController.js** | 音階ステップ動的生成 | 約30行 | 低 |

### 変更不要なファイル（5ファイル）

- ✅ home-direction-tabs.js（すでに実装済み）
- ✅ router.js（12音階用のみ処理）
- ✅ NavigationManager.js（12音階用のみ処理）
- ✅ result-session-controller.js（自動対応）
- ✅ results-overview-controller.js（自動対応）

---

## 🧪 テスト項目

### 1. 上行モードのテスト
- [ ] ホームで上行タブ選択
- [ ] ランダム基音モード開始
- [ ] 音階が「ド→レ→ミ→ファ→ソ→ラ→シ→ド」と表示
- [ ] 周波数が上昇（例: 261Hz → 523Hz）
- [ ] セッション結果に「上行モード」と表示

### 2. 下行モードのテスト
- [ ] ホームで下行タブ選択
- [ ] ランダム基音モード開始
- [ ] 音階が「ド→シ→ラ→ソ→ファ→ミ→レ→ド」と表示
- [ ] 周波数が下降（例: 261Hz → 130Hz）
- [ ] セッション結果に「下行モード」と表示

### 3. sessionStorage永続性のテスト
- [ ] 下行タブ選択
- [ ] ページリロード
- [ ] 下行タブがactive状態を維持
- [ ] トレーニング開始で下行モードが適用

### 4. モード切り替えのテスト
- [ ] 上行でセッション開始
- [ ] 途中中断してホームに戻る
- [ ] 下行に切り替え
- [ ] 新しいセッション開始
- [ ] 正しく下行が適用

### 5. 連続チャレンジ・12音階モードのテスト
- [ ] 各モードで上行・下行の切り替えテスト
- [ ] 12音階モードは「上行＋上昇」「下行＋下降」の組み合わせテスト

---

## ⚠️ 重要な注意事項

### NavigationManager.navigateToTraining()を使わない理由

NavigationManager.navigateToTraining()は以下の3つのパラメータしか受け取りません:
- mode
- session
- direction（12音階用）

**scaleDirectionパラメータは対応していません**。

そのため、preparation-pitchpro-cycle.jsでは直接URLを構築する必要があります。

ただし、NavigationManagerの以下の機能は手動で呼び出す必要があります:
```javascript
NavigationManager.setNormalTransition();
NavigationManager.removeBrowserBackPrevention();
```

### sessionStorageのフォールバック

trainingController.jsでは、以下の優先順位でscaleDirectionを決定:
1. URLパラメータ `scaleDirection`（最優先）
2. sessionStorage `trainingDirection`
3. デフォルト値 `'ascending'`

これにより、パラメータが渡されない場合でも正常に動作します。
