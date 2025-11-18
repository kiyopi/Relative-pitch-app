# リロード検出システムの根本的問題分析

## 日付
2025-11-18

## 問題の発見
ホームから準備ページへの正常な遷移時に、リロードダイアログが誤表示される問題が繰り返し発生。何度もタイミング調整を行っても再発。

## 根本原因

### trainingページの正しい設計（正常に動作中）

**2フラグシステム**:

1. **`normalTransitionToTraining`**（一時的な遷移証明フラグ）
   - 設定: 遷移前（`NavigationManager.navigateToTraining()`内）
   - チェック: 遷移後（`detectReload()`内）
   - 削除: チェック時に即座に削除
   - 役割: 「この遷移は正常」という証明書

2. **`trainingPageActive`**（永続的なページ状態フラグ）
   - 設定: ページ初期化完了後
   - 削除: ページ離脱時
   - 役割: リロード検出の基準

**フロー**:
```
遷移前: normalTransitionToTraining = true
  ↓
遷移開始: window.location.hash = 'training'
  ↓
遷移後: detectReload()
  ↓
normalTransitionToTraining === true
  → 正常な遷移と判定
  → normalTransitionToTrainingを削除
  → trainingPageActiveを削除（クリーンアップ）
  → リロードチェックをスキップ
  ↓
ページ初期化完了後: trainingPageActive = true（次回のリロード検出用）
```

### preparationページの誤った設計（問題の原因）

**1フラグシステム（矛盾）**:

1. **`preparationPageActive`**のみ
   - 役割A: ダイレクトアクセス検出（フラグがない → ダイレクトアクセス）
   - 役割B: リロード検出（フラグがある → リロード）
   - **矛盾**: 同じフラグで「ある/なし」の両方の状態を判定

**問題のフロー（log4.txt実例）**:
```
Line 74: preparationPageActive = true（router.jsで設定）
  ↓
Line 75-76: window.location.hash = 'preparation'（遷移開始）
  ↓
Line 77: checkPageAccess('preparation')実行
  ↓
Line 79: preparationPageActiveフラグ検出 → リロード誤判定！
```

**なぜ何度も修正しても失敗したか**:
- 設定タイミングを「遷移前」にすると → 遷移直後のチェックで誤検出
- 設定タイミングを「遷移後」にすると → ダイレクトアクセスと区別できない
- **設計レベルの矛盾なので、タイミング調整では解決不可能**

## 正しい修正方法

### 1. preparationページもtrainingと同じ2フラグシステムに統一

**新設フラグ**:
- `normalTransitionToPreparation`（一時的な遷移証明フラグ）

**既存フラグ**:
- `preparationPageActive`（永続的なページ状態フラグ）

### 2. 修正箇所

#### navigation-manager.js

**KEYS定数に追加**:
```javascript
static KEYS = {
    NORMAL_TRANSITION: 'normalTransitionToTraining',
    NORMAL_TRANSITION_PREPARATION: 'normalTransitionToPreparation', // 新設
    REDIRECT_COMPLETED: 'reloadRedirected'
};
```

**checkPageAccess()修正**:
```javascript
static async checkPageAccess(page) {
    const config = this.PAGE_CONFIG[page];

    // 0. 正常な遷移フラグをチェック（preparationページ専用）
    if (page === 'preparation') {
        const normalTransition = sessionStorage.getItem(this.KEYS.NORMAL_TRANSITION_PREPARATION);
        if (normalTransition === 'true') {
            sessionStorage.removeItem(this.KEYS.NORMAL_TRANSITION_PREPARATION);
            console.log('✅ [NavigationManager] 正常な遷移検出（preparation）');
            
            // 正常な遷移なので preparationPageActive フラグを設定
            sessionStorage.setItem('preparationPageActive', 'true');
            
            return { shouldContinue: true, reason: 'continue' };
        }
    }

    // 1. preparationページのダイレクトアクセス検出
    // （normalTransitionフラグがない場合のみここに到達）
    if (page === 'preparation' && config?.directAccessRedirectTo) {
        const wasPreparationActive = sessionStorage.getItem('preparationPageActive') === 'true';
        if (!wasPreparationActive) {
            console.log('⚠️ [NavigationManager] preparationページへのダイレクトアクセス検出');
            // ... リダイレクト処理
        }
    }

    // 2. training/result-sessionページのダイレクトアクセス検出
    // ... 既存のまま

    // 3. リロード検出
    // ... 既存のまま
}
```

**setNormalTransitionToPreparation()新設**:
```javascript
static setNormalTransitionToPreparation() {
    sessionStorage.setItem(this.KEYS.NORMAL_TRANSITION_PREPARATION, 'true');
    console.log('✅ [NavigationManager] 正常な遷移フラグを設定（preparation）');
}
```

#### router.js

**ホームからの遷移時**:
```javascript
if (route === 'preparation') {
    // 正常な遷移フラグを設定（preparationPageActiveは設定しない）
    NavigationManager.setNormalTransitionToPreparation();
}
```

### 3. フロー図（修正後）

**正常な遷移**:
```
ホーム → 準備ボタンクリック
  ↓
NavigationManager.setNormalTransitionToPreparation()
  ↓
window.location.hash = 'preparation'
  ↓
checkPageAccess('preparation')
  ↓
normalTransitionToPreparation === true
  → フラグ削除
  → preparationPageActive = true（ここで設定）
  → 続行
  ↓
準備ページ初期化成功
```

**ダイレクトアクセス**:
```
新規タブ → #preparation を直接開く
  ↓
checkPageAccess('preparation')
  ↓
normalTransitionToPreparation === null
  ↓
preparationPageActive === null
  → ダイレクトアクセス判定
  → ホームへリダイレクト
```

**リロード**:
```
準備ページでリロード
  ↓
checkPageAccess('preparation')
  ↓
normalTransitionToPreparation === null
  ↓
preparationPageActive === true（前回の初期化で設定済み）
  ↓
detectReload('preparation')
  ↓
リロード判定
  → ホームへリダイレクト
```

## 重要な教訓

1. **フラグの役割を明確に分離**:
   - 遷移証明フラグ: 一時的、遷移の正当性を証明
   - ページ状態フラグ: 永続的、ページのライフサイクル管理

2. **既存の正常パターンを踏襲**:
   - trainingページのパターンが正しく動作している
   - 同じパターンをpreparationページにも適用

3. **タイミング問題は設計の symptom**:
   - 何度もタイミング調整が必要 = 設計が間違っている証拠
   - 根本的な設計を見直すべき

## 影響範囲

### 修正対象ファイル
- `/PitchPro-SPA/js/navigation-manager.js`
- `/PitchPro-SPA/js/router.js`

### 既存機能への影響
- なし（trainingページは変更なし、preparationページの修正のみ）

### テストシナリオ
1. ホーム → 準備ページ（正常遷移）
2. 準備ページでリロード（リロード検出）
3. 準備ページへダイレクトアクセス（ダイレクトアクセス検出）
4. ホーム → 準備 → トレーニング → リロード（既存機能維持）
