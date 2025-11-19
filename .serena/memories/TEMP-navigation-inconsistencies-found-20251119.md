# NavigationManager未使用箇所の完全調査レポート

**調査日**: 2025-11-19  
**調査範囲**: sessionStorage.clear()とwindow.location.hash直接使用の全箇所

---

## 🔴 発見された問題（5箇所）

### 問題1: records-controller.js - sessionStorage.clear()の不適切な使用
**ファイル**: `/PitchPro-SPA/pages/js/records-controller.js`  
**行番号**: Line 999  
**問題コード**:
```javascript
function viewLessonDetail(lesson) {
    // sessionStorageをクリア（古いlessonIdが残らないように）
    sessionStorage.clear();  // ❌ 全フラグ削除
    
    // 総合評価ページへ遷移
    window.NavigationManager.navigate('results-overview', {
        mode: lesson.mode,
        scaleDirection: lesson.scaleDirection || 'ascending',
        lessonId: lesson.lessonId,
        fromRecords: 'true'
    });
}
```

**問題点**:
- NavigationManager.navigate()を使っている ✅
- しかしsessionStorage.clear()で全フラグを削除 ❌
- preparationPageActiveなど重要なフラグまで削除される

**影響**:
- トレーニング記録から総合評価へ遷移時にsessionStorageが空になる
- 他の機能に影響する可能性（ただしfromRecords=trueなので現状は問題なし）

**修正案**:
```javascript
// sessionStorage.clear()を完全削除
// 理由: NavigationManagerが適切に管理する
```

---

### 問題2: preparation-pitchpro-cycle.js - 音域テスト完了後の遷移
**ファイル**: `/PitchPro-SPA/pages/js/preparation-pitchpro-cycle.js`  
**行番号**: Line 1572  
**問題コード**:
```javascript
// 音域テスト完了後、トレーニングへ遷移
const params = new URLSearchParams({ mode: finalMode });
if (finalSession) params.set('session', finalSession);
if (finalDirection) params.set('direction', finalDirection);
params.set('scaleDirection', scaleDirection);

window.location.hash = `training?${params.toString()}`;  // ❌
```

**問題点**:
- NavigationManagerを使っていない ❌
- preparation → training はトレーニングフロー内の遷移
- isTrainingFlow()に含まれている（Line 545）
- AudioDetectorを保持すべき遷移

**影響**:
- **重大**: AudioDetectorが保持されない可能性
- preparationPageActiveフラグが設定されない
- NavigationManagerの一元管理から外れる

**修正案**:
```javascript
if (window.NavigationManager) {
    NavigationManager.navigate('training', {
        mode: finalMode,
        session: finalSession,
        direction: finalDirection,
        scaleDirection: scaleDirection
    });
} else {
    window.location.hash = `training?${params.toString()}`;
}
```

---

### 問題3: results-overview-controller.js - 下行モードボタン（将来実装）
**ファイル**: `/PitchPro-SPA/pages/js/results-overview-controller.js`  
**行番号**: Line 1471, 1472, 1481  
**問題コード**:
```javascript
// 下行モード（将来実装）
'next-step-random-down-practice': () => window.location.hash = 'preparation?mode=random-down',  // ❌
'next-step-random-down-upgrade': () => window.location.hash = 'preparation?mode=continuous-down',  // ❌
'next-step-continuous-down-practice': () => window.location.hash = 'preparation?mode=continuous-down',  // ❌
```

**問題点**:
- NavigationManagerを使っていない ❌
- 他の全ボタンはNavigationManagerを使用
- コードの一貫性がない

**影響**:
- 中程度: 下行モードは未実装なので現状は影響なし
- 将来実装時に問題が発生

**修正案**:
```javascript
'next-step-random-down-practice': () => {
    if (window.NavigationManager) {
        NavigationManager.navigate('preparation', { mode: 'random-down', direction: 'descending' });
    } else {
        window.location.hash = 'preparation?mode=random-down';
    }
},
```

---

### 問題4: premium-analysis-controller.js - データなし時のホームボタン
**ファイル**: `/PitchPro-SPA/pages/js/premium-analysis-controller.js`  
**行番号**: Line 817  
**問題コード**:
```javascript
const html = `
    <div style="text-align: center; padding: 3rem;">
        <h2>データがありません</h2>
        <button class="btn btn-primary" onclick="window.location.hash='home'">
            <i data-lucide="home"></i>
            <span>ホームに戻る</span>
        </button>
    </div>
`;
```

**問題点**:
- inlineイベントハンドラーでwindow.location.hash使用 ❌
- NavigationManagerを使っていない

**影響**:
- 低: premium-analysis → home はトレーニングフロー外
- AudioDetectorは正しく破棄される（router.jsのcleanupで）
- しかしコードの一貫性がない

**修正案**:
```javascript
const html = `
    <div style="text-align: center; padding: 3rem;">
        <h2>データがありません</h2>
        <button class="btn btn-primary" id="premium-no-data-home-btn">
            <i data-lucide="home"></i>
            <span>ホームに戻る</span>
        </button>
    </div>
`;

// イベントリスナー追加
setTimeout(() => {
    const btn = document.getElementById('premium-no-data-home-btn');
    if (btn) {
        btn.addEventListener('click', () => {
            if (window.NavigationManager) {
                NavigationManager.navigate('home');
            } else {
                window.location.hash = 'home';
            }
        });
    }
}, 0);
```

---

### 問題5: index.html - ヘッダーナビゲーションボタン
**ファイル**: `/PitchPro-SPA/index.html`  
**行番号**: Line 106, 110, 114  
**問題コード**:
```html
<nav class="header-nav" id="header-nav">
    <button class="nav-button" onclick="location.hash='records'" title="トレーニング記録を見る">
        <i data-lucide="history" class="icon-md"></i>
        <span class="nav-text">記録</span>
    </button>
    <button class="nav-button" onclick="location.hash='premium-analysis'" title="詳細分析">
        <i data-lucide="bar-chart-3" class="icon-md"></i>
        <span class="nav-text">詳細分析</span>
    </button>
    <button class="nav-button" onclick="location.hash='settings'" title="設定・データ管理">
        <i data-lucide="settings" class="icon-md"></i>
        <span class="nav-text">設定</span>
    </button>
</nav>
```

**問題点**:
- 3つのボタン全てがlocation.hash直接使用 ❌
- NavigationManagerを使っていない
- inlineイベントハンドラー使用

**影響**:
- 中: トレーニングフロー外の遷移
- AudioDetectorは破棄される（ヘッダーからの遷移時）
- しかしコードの一貫性がない

**修正案**:
```html
<nav class="header-nav" id="header-nav">
    <button class="nav-button" id="nav-records-btn" title="トレーニング記録を見る">
        <i data-lucide="history" class="icon-md"></i>
        <span class="nav-text">記録</span>
    </button>
    <button class="nav-button" id="nav-premium-btn" title="詳細分析">
        <i data-lucide="bar-chart-3" class="icon-md"></i>
        <span class="nav-text">詳細分析</span>
    </button>
    <button class="nav-button" id="nav-settings-btn" title="設定・データ管理">
        <i data-lucide="settings" class="icon-md"></i>
        <span class="nav-text">設定</span>
    </button>
</nav>

<script>
// DOMContentLoaded後にイベントリスナー追加
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('nav-records-btn')?.addEventListener('click', () => {
        if (window.NavigationManager) {
            NavigationManager.navigate('records');
        } else {
            location.hash = 'records';
        }
    });
    
    document.getElementById('nav-premium-btn')?.addEventListener('click', () => {
        if (window.NavigationManager) {
            NavigationManager.navigate('premium-analysis');
        } else {
            location.hash = 'premium-analysis';
        }
    });
    
    document.getElementById('nav-settings-btn')?.addEventListener('click', () => {
        if (window.NavigationManager) {
            NavigationManager.navigate('settings');
        } else {
            location.hash = 'settings';
        }
    });
});
</script>
```

---

## 📊 問題の優先度評価

| 問題 | ファイル | 影響度 | 優先度 | 理由 |
|------|---------|--------|--------|------|
| **問題2** | preparation-pitchpro-cycle.js | 🔴 **高** | **最優先** | トレーニングフロー内遷移でAudioDetector保持が必要 |
| **問題1** | records-controller.js | 🟡 中 | 高 | sessionStorage.clear()の不適切な使用 |
| **問題3** | results-overview-controller.js | 🟡 中 | 中 | 将来実装用、コード一貫性 |
| **問題5** | index.html | 🟡 中 | 中 | コード一貫性、inlineハンドラー排除 |
| **問題4** | premium-analysis-controller.js | 🟢 低 | 低 | コード一貫性のみ |

---

## 🎯 推奨修正順序

### Phase A: 最優先修正（30分）
1. **問題2** - preparation → training 遷移修正（10分）
2. **問題1** - records sessionStorage.clear()削除（5分）
3. **問題3** - 下行モードボタン修正（3箇所、10分）

### Phase B: 一貫性改善（30分）
4. **問題5** - ヘッダーボタン修正（3箇所、20分）
5. **問題4** - premium-analysisホームボタン修正（10分）

**合計実装時間**: 1時間

---

## ✅ 既に正しく実装されている箇所（参考）

以下の箇所は適切にNavigationManagerを使用：
- ✅ index.html - フッターボタン（handleFooterHomeButtonClick）
- ✅ trainingController.js - result-session/results-overview遷移
- ✅ result-session-controller.js - results-overview遷移
- ✅ results-overview-controller.js - practice/upgradeボタン（9箇所）

---

**次のアクション**: Phase Aの3つの修正から開始することを推奨
