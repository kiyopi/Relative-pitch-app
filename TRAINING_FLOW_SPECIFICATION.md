# トレーニング進行フロー仕様書

## 1. 共通フロー（全モード共通）

### 1.1 基本的な流れ
```
1. training.html?mode={mode}&session={session} にアクセス
2. 基音スタートボタン押下
3. 基音再生（2.5秒）
4. ドレミガイド開始（5.3秒）
5. モード別の完了処理
```

### 1.2 ボタン状態の遷移
```javascript
// 初期状態
<button>🔊 基音スタート</button>

// 基音再生中（0～2.5秒）
<button disabled>🔊 再生中...</button>

// トレーニング中（2.5秒～完了まで）
<button disabled>🧠 トレーニング中</button>
```

## 2. モード別詳細仕様

### 2.1 ランダム基音モード（random）

#### 特徴
- **セッション数**: 8回
- **基音選択**: C3オクターブからランダム
- **評価**: 各セッション後に個別評価
- **進行**: 手動（ユーザーがボタンで次へ）

#### 画面遷移フロー
```
training.html?mode=random&session=1
    ↓ トレーニング完了後1秒で自動遷移
result-session.html（セッション評価）
    ↓ 「次の基音へ」ボタン押下
training.html?mode=random&session=2
    ↓
    ...（セッション8まで繰り返し）
    ↓
result-session.html（セッション8評価）
    ↓ 「総合評価を見る」ボタン押下
results-overview.html（総合評価）
```

#### スクリプト実装
```javascript
function handleTrainingComplete() {
    if (mode === 'random') {
        // セッション評価に自動遷移
        setTimeout(() => {
            window.location.href = 'result-session.html';
        }, 1000);
    }
}
```

### 2.2 連続チャレンジモード（continuous）

#### 特徴
- **セッション数**: 8回
- **基音選択**: クロマチック12音からランダム
- **評価**: 総合評価のみ（個別評価なし）
- **進行**: 自動（休憩なし）

#### 画面遷移フロー
```
training.html?mode=continuous&session=1
    ↓ トレーニング完了後2秒で自動遷移
training.html?mode=continuous&session=2
    ↓ 自動進行
    ...（セッション8まで自動継続）
    ↓
results-overview.html（総合評価のみ）
```

#### スクリプト実装
```javascript
function handleTrainingComplete() {
    if (mode === 'continuous') {
        if (sessionNum < 8) {
            // 次セッションに自動遷移
            setTimeout(() => {
                const nextSession = sessionNum + 1;
                window.location.href = `training.html?mode=continuous&session=${nextSession}`;
            }, 2000);
        } else {
            // 総合評価に自動遷移
            setTimeout(() => {
                window.location.href = 'results-overview.html';
            }, 2000);
        }
    }
}
```

#### ボタン状態（連続モード特有）
```javascript
// セッション2以降の開始時
window.onload = function() {
    if (mode === 'continuous' && sessionNum > 1) {
        // 自動で基音再生開始
        setTimeout(() => {
            startTraining();
        }, 1000);
    }
}
```

### 2.3 12音階モード（twelve）

#### 特徴
- **セッション数**: 12回（または24回）
- **基音選択**: クロマチック12音を順次使用
- **評価**: 総合評価のみ
- **進行**: 自動
- **特別機能**: 音域調整（開始前のみ）

#### 画面遷移フロー
```
training.html?mode=twelve&session=1
    ↓ （音域調整UI表示 - 初回のみ）
    ↓ トレーニング開始
    ↓ 完了後2秒で自動遷移
training.html?mode=twelve&session=2
    ↓ 自動進行
    ...（セッション12まで自動継続）
    ↓
results-overview.html（総合評価・S級判定可能）
```

#### 音域調整機能（12音モード専用）

##### 仕様
- **調整範囲**: -2 〜 +2（半音単位で5段階）
- **表示**: 「低音域」「低め」「標準」「高め」「高音域」
- **UI**: トグルで開閉可能なセクション
- **機能**: 「音域を下げる」「音域を上げる」ボタン
- **テスト**: 「最低音」「最高音」テストボタン
- **データ保持**: LocalStorageに保存

##### 基音データ管理
```javascript
// 12音の基音配列（C4を基準）
const chromaticNotes = [
    { note: 'C', frequency: 261.63 },
    { note: 'C#', frequency: 277.18 },
    { note: 'D', frequency: 293.66 },
    { note: 'D#', frequency: 311.13 },
    { note: 'E', frequency: 329.63 },
    { note: 'F', frequency: 349.23 },
    { note: 'F#', frequency: 369.99 },
    { note: 'G', frequency: 392.00 },
    { note: 'G#', frequency: 415.30 },
    { note: 'A', frequency: 440.00 },
    { note: 'A#', frequency: 466.16 },
    { note: 'B', frequency: 493.88 }
];

// 音域調整の適用
function getAdjustedFrequency(baseFreq, offset) {
    // 半音ごとの周波数比: 2^(1/12) ≈ 1.05946
    const semitoneRatio = Math.pow(2, 1/12);
    return baseFreq * Math.pow(semitoneRatio, offset);
}

// 現在のセッションの基音取得
function getCurrentBaseNote() {
    const noteIndex = (sessionNum - 1) % 12;
    const baseNote = chromaticNotes[noteIndex];
    const adjustedFreq = getAdjustedFrequency(baseNote.frequency, rangeOffset);
    
    return {
        note: baseNote.note,  // 音名は内部管理のみ（表示しない）
        frequency: adjustedFreq,
        offset: rangeOffset
    };
}
```

##### LocalStorageへの保存
```javascript
// 音域設定の保存
function saveRangeSettings() {
    const settings = {
        mode: 'twelve',
        rangeOffset: rangeOffset,
        savedAt: new Date().toISOString()
    };
    localStorage.setItem('twelveRangeSettings', JSON.stringify(settings));
}

// 音域設定の読み込み
function loadRangeSettings() {
    const saved = localStorage.getItem('twelveRangeSettings');
    if (saved) {
        const settings = JSON.parse(saved);
        rangeOffset = settings.rangeOffset || 0;
        updateRangeIndicator();
    }
}
```

#### スクリプト実装
```javascript
function handleTrainingComplete() {
    if (mode === 'twelve') {
        if (sessionNum < 12) {  // または24
            // 次セッションに自動遷移
            setTimeout(() => {
                const nextSession = sessionNum + 1;
                window.location.href = `training.html?mode=twelve&session=${nextSession}`;
            }, 2000);
        } else {
            // 総合評価に自動遷移
            setTimeout(() => {
                window.location.href = 'results-overview.html';
            }, 2000);
        }
    }
}

// 音域調整機能（セッション1のみ表示、全セッションで適用）
if (mode === 'twelve') {
    // 保存された設定を読み込み
    loadRangeSettings();
    
    if (sessionNum === 1) {
        // 初回のみ音域調整UIを表示
        showRangeAdjustmentUI();
    }
    
    // 全セッションで調整された基音を使用
    const currentBase = getCurrentBaseNote();
    // currentBase.frequencyを音源再生に使用
}
```

## 3. セッション間の自動進行

### 3.1 連続・12音モードの自動開始
```javascript
// ページ読み込み時の処理
window.addEventListener('DOMContentLoaded', function() {
    const config = modeConfig[mode];
    
    // 連続・12音モードでセッション2以降は自動開始
    if ((mode === 'continuous' || mode === 'twelve') && sessionNum > 1) {
        const button = document.getElementById('play-base-note');
        
        // ボタンテキストを変更
        button.innerHTML = '<i data-lucide="volume-2"></i><span>基音自動再生</span>';
        button.disabled = true;
        lucide.createIcons();
        
        // 1秒後に自動で開始
        setTimeout(() => {
            startTraining();
        }, 1000);
    }
});
```

## 4. プログレスバー表示

### 4.1 セッション進行表示
```javascript
// ランダムモード
"セッション 2 / 8"

// 連続チャレンジモード
"セッション 5 / 8（連続中）"

// 12音階モード
"セッション 7 / 12"
```

### 4.2 プログレスバー幅計算
```javascript
const progressPercent = (sessionNum / config.totalSessions) * 100;
progressBar.style.width = progressPercent + '%';
```

## 5. エラーハンドリング

### 5.1 不正なURLパラメータ
```javascript
// セッション番号が範囲外の場合
if (sessionNum > config.totalSessions || sessionNum < 1) {
    window.location.href = 'index.html';
}

// モードが存在しない場合
if (!modeConfig[mode]) {
    window.location.href = 'index.html';
}
```

### 5.2 マイク許可エラー
```javascript
// マイク許可が取れていない場合
if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    window.location.href = 'preparation.html';
}
```

## 6. データ保存

### 6.1 セッション結果の保存（ランダムモードのみ）
```javascript
// セッション完了時
const sessionResult = {
    mode: 'random',
    session: sessionNum,
    baseNote: currentBaseNote,  // 音名は表示しない
    accuracy: calculateAccuracy(),
    timestamp: new Date().toISOString()
};

// LocalStorageに保存
const results = JSON.parse(localStorage.getItem('trainingResults') || '[]');
results.push(sessionResult);
localStorage.setItem('trainingResults', JSON.stringify(results));
```

### 6.2 総合結果の集計（連続・12音モード）
```javascript
// 全セッション完了時
const overallResult = {
    mode: mode,
    totalSessions: config.totalSessions,
    averageAccuracy: calculateAverageAccuracy(),
    grade: calculateGrade(),  // S-E級判定
    completedAt: new Date().toISOString()
};

localStorage.setItem('lastOverallResult', JSON.stringify(overallResult));
```

## 7. 重要な注意事項

### 7.1 相対音感原則の遵守
- 基音の音名（C4、A3など）は**絶対に表示しない**
- 周波数（440Hzなど）も**表示しない**
- 「ド」から始まる相対的な音階のみ表示

### 7.2 自動進行のタイミング
- ランダムモード: 手動進行（ユーザー操作）
- 連続モード: 2秒後に自動進行
- 12音モード: 2秒後に自動進行

### 7.3 ボタン状態管理
- 再生中はボタンを無効化
- 自動進行中も操作不可
- 各モードに応じた適切なテキスト表示

## 8. テスト項目

### 8.1 画面遷移テスト
- [ ] ランダムモード: セッション評価への遷移
- [ ] 連続モード: 自動進行の確認
- [ ] 12音モード: 音域調整UIの表示

### 8.2 ボタン状態テスト
- [ ] 初期状態の表示
- [ ] 再生中の状態変化
- [ ] トレーニング中の表示

### 8.3 データ保存テスト
- [ ] LocalStorageへの保存
- [ ] 結果データの整合性
- [ ] グレード計算の正確性