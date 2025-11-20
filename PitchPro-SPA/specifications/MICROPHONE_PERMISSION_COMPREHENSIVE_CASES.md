# マイク許可ダイアログ出現パターン 完全ケース一覧

**作成日**: 2025-11-20
**最終更新日**: 2025-11-20
**バージョン**: v2.0.0
**ステータス**: ✅ Layer 4実装完了（v4.4.0）
**対象問題**: records → home → continuous challenge → skip preparation → training でマイク許可ダイアログが再出現する問題

---

## 🔄 アップデート履歴

### v2.0.0 (2025-11-20) - ✅ Layer 4実装完了
**実装内容**:
- `canSkipPreparation()`に Layer 4（AudioDetector存在・有効性確認）を追加
- 4層防御システム完成（リロード・localStorage・Permissions API・AudioDetector）
- recordsページ「新しいトレーニングを開始」ボタン削除
- ケース8-11の問題パターンを完全解決

**変更ファイル**:
- `/PitchPro-SPA/js/navigation-manager.js` - Layer 4追加
- `/PitchPro-SPA/pages/records.html` - ボタンセクション削除
- `/PitchPro-SPA/pages/js/records-controller.js` - 表示制御削除

**実装記録**: Serenaメモリ `PERM-microphone-permission-layer4-implementation-20251120-1700`

### v1.0.0 (2025-11-20) - 初期分析
**調査内容**:
- 13ケースの完全洗い出し
- 問題パターン（ケース8-11）の根本原因特定
- Layer 4追加の解決策設計

---

## 🎯 問題の要約

### ユーザーからの報告
> トレーニング記録ページから「新しいトレーニングを開始」ボタンをクリック →
> ホームページで連続チャレンジモードを選択 →
> 準備ページがスキップされる →
> トレーニングページで基音再生ボタンを押下 →
> **❌ マイク許可ダイアログが再出現** ← これは絶対に防がなければならないパターン

### 期待される動作
- マイク許可は既に取得済み
- 音域データも既に取得済み
- AudioDetectorは再利用可能な状態
- **マイク許可ダイアログは出現してはいけない**

---

## 🔍 根本原因の詳細分析

### 原因1: records page cleanupでのAudioDetector破棄
```javascript
// router.js Line 143-154
'records': {
    cleanup: async () => {
        if (window.NavigationManager?.currentAudioDetector) {
            window.NavigationManager._destroyAudioDetector(
                window.NavigationManager.currentAudioDetector
            );
            window.NavigationManager.currentAudioDetector = null;
        }
    }
}
```

**結果**: `NavigationManager.currentAudioDetector = null`

### 原因2: NavigationManager.navigate()でglobalAudioDetector破棄
```javascript
// navigation-manager.js Line 845-856
else {
    // トレーニングフロー外の遷移: MediaStream完全解放
    this._destroyAudioDetector(this.currentAudioDetector);
    this.currentAudioDetector = null;

    // globalAudioDetectorもクリア
    if (window.globalAudioDetector) {
        window.globalAudioDetector = null;
    }
}
```

**結果**: `window.globalAudioDetector = null`

### 原因3: canSkipPreparation()にLayer 4がない
```javascript
// navigation-manager.js Line 324-361
static async canSkipPreparation() {
    // Layer 1: リロード検出 ✅
    // Layer 2: localStorage確認 ✅
    // Layer 3: Permissions API確認 ✅
    // Layer 4: AudioDetector存在確認 ❌ 未実装

    return true; // 3層パスで準備スキップ許可
}
```

**結果**: AudioDetectorが存在しないのに準備スキップが許可される

### 原因4: startDoremiGuide()での新規AudioDetector作成
```javascript
// trainingController.js Line 843-896
if (window.NavigationManager?.currentAudioDetector) {
    // ❌ nullなのでスキップ
} else if (window.globalAudioDetector) {
    // ❌ nullなのでスキップ
} else {
    shouldCreateNew = true; // ✅ 新規作成フラグ
}

if (shouldCreateNew) {
    audioDetector = new window.PitchPro.AudioDetectionComponent(...);
    await audioDetector.initialize(); // ← マイク許可ダイアログ
}
```

**結果**: マイク許可ダイアログが再出現

---

## 📊 全マイク許可パターン一覧表

### 凡例
- ✅ : マイク許可ダイアログが出ない（正常）
- ❌ : マイク許可ダイアログが出る（問題）
- ⚠️ : 状況依存（要注意）

| # | 遷移経路 | AudioDetector状態 | canSkipPreparation | マイク許可 | 問題 |
|---|---------|------------------|-------------------|-----------|------|
| 1 | **home → preparation → training** | 新規作成（preparation） | N/A | ✅ 初回のみ | 正常 |
| 2 | **results-overview → practice → preparation → training** | 保持（トレーニングフロー） | N/A | ✅ なし | 正常 |
| 3 | **results-overview → upgrade → preparation → training** | 保持（トレーニングフロー） | N/A | ✅ なし | 正常 |
| 4 | **results-overview → next → continuous → preparation → training** | 保持（トレーニングフロー） | N/A | ✅ なし | 正常 |
| 5 | **results-overview → home → mode → preparation → training** | 破棄（フロー外） | N/A | ✅ 再作成 | 正常 |
| 6 | **results-overview → next → continuous → skip prep → training** | 保持 | ✅ パス | ✅ 再利用 | **想定動作** |
| 7 | **records → home → mode → preparation → training** | 破棄 | N/A | ✅ 再作成 | 正常 |
| 8 | **records → home → mode → skip prep → training** | 破棄 | ✅ パス | ❌ **再要求** | **問題** |
| 9 | **premium-analysis → home → mode → skip prep → training** | 破棄（フロー外） | ✅ パス | ❌ **再要求** | **問題** |
| 10 | **settings → home → mode → skip prep → training** | 破棄（フロー外） | ✅ パス | ❌ **再要求** | **問題** |
| 11 | **results-overview → home → mode → skip prep → training** | 破棄（フロー外） | ✅ パス | ❌ **再要求** | **問題** |
| 12 | **リロード → training** | 破棄 | ❌ Layer 1 | ✅ 再作成 | 正常 |
| 13 | **ダイレクトアクセス → training** | なし | ❌ 検出 | ✅ 再作成 | 正常 |

---

## 🚨 問題パターンの詳細分析（ケース8-11）

### 共通の根本原因

**ケース8-11はすべて同じ問題**です：
- **ケース8**: records → home → mode → skip prep → training
- **ケース9**: premium-analysis → home → mode → skip prep → training
- **ケース10**: settings → home → mode → skip prep → training
- **ケース11**: results-overview → home → mode → skip prep → training

**共通点**:
1. すべて「→ home →」を経由（トレーニングフロー外）
2. NavigationManager.navigate()でAudioDetector破棄
3. canSkipPreparation()がLayer 1-3をパス
4. Layer 4未実装でAudioDetector未初期化を検出できない
5. startDoremiGuide()で新規作成 → マイク許可ダイアログ

### フロー図（ケース8の例）
```
[records page]
  ↓ 「新しいトレーニングを開始」ボタン
[router.js records cleanup]
  ├─ currentAudioDetector.destroy() ✅
  └─ currentAudioDetector = null ✅
  ↓
[NavigationManager.navigate('home')]
  ├─ isTraining = false (records → homeはフロー外)
  ├─ currentAudioDetector = null（既に破棄済み）
  └─ globalAudioDetector = null ✅
  ↓
[home page]
  ↓ 連続チャレンジモード選択
[NavigationManager.navigate('training')]
  ↓
[NavigationManager.canSkipPreparation()] ← チェック実行
  ├─ Layer 1: リロード検出 → false（リロードではない）✅
  ├─ Layer 2: localStorage → true（micGranted & voiceRangeData）✅
  ├─ Layer 3: Permissions API → 'granted' ✅
  └─ ❌ Layer 4: AudioDetector存在確認 → **未実装**
  ↓
  ✅ return true（準備スキップ許可）
  ↓
[Router直接training初期化]
  ↓
[TrainingController.initialize()]
  ↓ ユーザーが基音再生ボタン押下
[startDoremiGuide()]
  ├─ NavigationManager.currentAudioDetector → null ❌
  ├─ window.globalAudioDetector → null ❌
  └─ shouldCreateNew = true
  ↓
[新規AudioDetector作成]
  ├─ new window.PitchPro.AudioDetectionComponent(...)
  └─ await audioDetector.initialize()
  ↓
❌ マイク許可ダイアログ再出現
```

### なぜこのパターンが問題なのか

1. **UX最悪**: ユーザーは既にマイク許可を出しているのに再度要求される
2. **ロジック矛盾**: `canSkipPreparation()`が「準備スキップ可能」と判定したのに、結果的に準備ページと同じ処理（マイク許可）が必要になる
3. **混乱**: 「なぜまたマイク許可が必要なの？」とユーザーが困惑する
4. **データ不整合**: localStorageには「マイク許可済み」とあるのに実態は未初期化
5. **影響範囲の広さ**: 4つの異なるページ（records/premium-analysis/settings/results-overview）から同じ問題が発生

---

## ✅ 解決策

### 解決策1: canSkipPreparation()にLayer 4追加（推奨）

**実装場所**: `/PitchPro-SPA/js/navigation-manager.js` Line 324-361

```javascript
static async canSkipPreparation() {
    // === Layer 1: リロード検出（最も確実な防御） ===
    if (performance.navigation && performance.navigation.type === 1) {
        console.log('⚠️ [NavigationManager] Layer 1: ページリロード検出 → 準備ページ必須');
        return false;
    }

    // === Layer 2: localStorage確認（基本チェック） ===
    const micGranted = localStorage.getItem('micPermissionGranted') === 'true';
    const voiceRangeData = localStorage.getItem('voiceRangeData');
    const hasVoiceRange = voiceRangeData && voiceRangeData !== 'null';

    if (!micGranted || !hasVoiceRange) {
        console.log(`⚠️ [NavigationManager] Layer 2: localStorage不足 (mic: ${micGranted}, range: ${hasVoiceRange}) → 準備ページ必須`);
        return false;
    }

    // === Layer 3: Permissions API（実際の権限状態確認） ===
    try {
        const permissionStatus = await navigator.permissions.query({ name: 'microphone' });

        if (permissionStatus.state !== 'granted') {
            console.log(`⚠️ [NavigationManager] Layer 3: マイク許可が失効 (state: ${permissionStatus.state}) → 準備ページ必須`);
            return false;
        }

        // === Layer 4: AudioDetector存在・有効性確認（NEW） ===
        if (!this.currentAudioDetector) {
            console.log('⚠️ [NavigationManager] Layer 4: AudioDetector未初期化 → 準備ページ必須');
            return false;
        }

        const verification = this.verifyAudioDetectorState(this.currentAudioDetector);
        if (!verification.canReuse) {
            console.log(`⚠️ [NavigationManager] Layer 4: AudioDetector異常 (${verification.reason}) → 準備ページ必須`);
            return false;
        }

        // すべてのチェックをパス
        console.log('✅ [NavigationManager] 4層すべてパス → 準備スキップ可能');
        return true;

    } catch (error) {
        console.warn('⚠️ [NavigationManager] Layer 3: Permissions API未サポート → 安全のため準備ページへ', error);
        return false;
    }
}
```

**メリット**:
- ✅ シンプルで確実
- ✅ 既存ロジックの自然な拡張
- ✅ リスク最小
- ✅ テスト容易

**デメリット**:
- ⚠️ records → home → modeの場合、準備ページが必須になる（が、これは正常動作）

### 解決策2: records cleanupでAudioDetectorを保持（非推奨）

**理由**: recordsページはマイク不要、保持するとメモリリーク

### 解決策3: isTrainingFlow()にrecords → homeパターン追加（非推奨）

**理由**: records → homeはトレーニングフロー外、保持する理由がない

---

## 🧪 テストシナリオ

### テスト1: ケース8-11（問題パターン）の修正確認

#### テスト1-1: ケース8（records → home）
1. recordsページから「新しいトレーニングを開始」
2. homeページで連続チャレンジモード選択
3. **期待**: 準備ページが表示される（Layer 4でfalse）
4. 準備ページでマイク許可・音域テスト実施
5. トレーニング開始
6. **期待**: マイク許可ダイアログが出ない

#### テスト1-2: ケース9（premium-analysis → home）
1. premium-analysisページからヘッダー「ホーム」ボタン
2. homeページで連続チャレンジモード選択
3. **期待**: 準備ページが表示される（Layer 4でfalse）
4. **期待**: マイク許可ダイアログが出ない

#### テスト1-3: ケース10（settings → home）
1. settingsページからヘッダー「ホーム」ボタン
2. homeページでランダム基音モード選択
3. **期待**: 準備ページが表示される（Layer 4でfalse）
4. **期待**: マイク許可ダイアログが出ない

#### テスト1-4: ケース11（results-overview → home）
1. results-overviewページからヘッダー「ホーム」ボタン
2. homeページで12音階モード選択
3. **期待**: 準備ページが表示される（Layer 4でfalse）
4. **期待**: マイク許可ダイアログが出ない

### テスト2: ケース6（正常動作）の維持確認
1. results-overviewから「次のステップ」で連続チャレンジ
2. **期待**: 準備ページがスキップされる（Layer 4でtrue）
3. トレーニング開始
4. **期待**: マイク許可ダイアログが出ない、AudioDetector再利用

### テスト3: ケース5（正常動作）の維持確認
1. results-overviewから「ホームに戻る」
2. homeページでモード選択
3. **期待**: 準備ページが表示される（Layer 4でfalse）
4. 準備ページでマイク許可・音域テスト実施
5. **期待**: マイク許可ダイアログが出ない

---

## 📝 実装チェックリスト

- [x] Layer 4追加実装（navigation-manager.js） - ✅ 完了
- [x] console.logメッセージ追加（デバッグ用） - ✅ 完了
- [x] recordsページボタン削除（UXシンプル化） - ✅ 完了
- [x] docstringコメント更新（3層→4層） - ✅ 完了
- [ ] テスト1-1〜1-4実施・確認（ケース8-11）
- [ ] テスト2実施・確認（ケース6）
- [ ] テスト3実施・確認（ケース5）
- [ ] 仕様書更新（NAVIGATION_HANDLING_SPECIFICATION.md）
- [ ] コミット・プッシュ

---

## 📚 関連ドキュメント

- **MICROPHONE_BACKGROUND_RESILIENCE.md**: バックグラウンド遷移時のマイク権限対処
- **PERM-microphone-permission-skip-analysis-20251119**: マイク許可スキップ機能の詳細分析
- **NAVIGATION_HANDLING_SPECIFICATION.md**: ナビゲーション処理の完全仕様

---

**この仕様書により、全マイク許可ケースを網羅し、問題パターンを完全に解決します。**
