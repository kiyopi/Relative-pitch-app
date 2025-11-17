# PitchPro警告アラート・popstateトリガー・マイク状態管理設計（完全版）

**作成日**: 2025-11-17 21:00
**重要度**: 🔥 最高（SPA設計の根幹）
**ステータス**: 調査完了・設計確定・実装待ち

---

## 📊 調査の経緯

### 問題の発見

**セッション2でピッチ検出失敗の根本原因調査中に発見**:

```
問題: training → result-session → training で毎回 getUserMedia() 実行
症状: 1セッション目は動作、2セッション目で全ステップ「⚠️ 音程データが記録されていません」
原因: NavigationManager.navigate()がすべての遷移でdestroy()を実行
結果: SPA設計目標（マイク許可保持）と完全矛盾
```

### ユーザーの重要な指摘

> "ここは非常に重要な観点です。マイク許可がページ遷移で放棄されてしまうのでSPAにせざるおえなかったのでこの問題が他にないか確認しましょう"

→ この指摘により、SPA設計の根本目的を再確認

### 調査の展開

1. **Phase 1**: NavigationManager・trainingControllerの問題特定
2. **Phase 2**: エッジケース分析（バックグラウンド・権限取り消し等）
3. **Phase 3**: PitchPro状態管理システムの理解
4. **Phase 4（重要）**: ユーザーの指摘「PitchProではバックグラウンドで長時間放置などでマイク状態が変化した時に自身でエラーダイアログを出してマイク許可を求めるような設計になってるはずです」
5. **Phase 5**: popstateトリガーの発見 → 包括的設計完成

---

## 🔍 最重要な発見: PitchPro警告アラートとpopstateトリガー

### NavigationManager.js Line 312-313のコメント

```javascript
// 【重要】MediaStream完全解放
// destroy()を呼ばないと、バックグラウンドでマイクが開いたままになり、
// 長時間経過後にPitchProが警告アラートを表示してpopstateイベントが発火する問題が発生
```

### PitchProの自動エラーハンドリングフロー

```
1. バックグラウンドでマイクが開いたまま長時間放置
   ↓
2. LifecycleManagerが1秒間隔で健全性チェック
   ↓
3. 異常検出 → 最大3回の自動リカバリー試行
   ↓
4. リカバリー失敗
   ↓
5. PitchProが自動的にalert()を表示（警告メッセージ）
   ↓
6. ユーザーがOKボタンを押す
   ↓
7. ✨ popstateイベント発火 ← ここがトリガー！
```

### PitchProが自動で行うこと（アプリ側実装不要）

- ✅ 1秒間隔でMediaStream健全性チェック（LifecycleManager）
- ✅ 異常検出時に最大3回の自動リカバリー
- ✅ リカバリー失敗時に警告アラート表示
- ✅ アラート閉鎖時にpopstateイベント発火

### アプリ側で対応すべきこと

- ✅ popstateイベントでPitchProエラー状態を検出
- ✅ preparationへ自動リダイレクト

---

## 🎯 新設計の全体像

### 基本原則

1. **PitchPro組み込み機能を最大限活用** - 独自実装を最小化
2. **トレーニングフロー内はMediaStream保持** - training ↔ result-session
3. **完全離脱時のみ破棄** - training → home, results-overview → home
4. **状態検証後に再利用** - checkHealth() による健全性確認
5. **PitchPro警告をトリガーに自動リダイレクト** - popstateイベント活用

### 遷移パターン分類

```javascript
// パターン1: MediaStream保持（stopDetection()のみ）
training → result-session     // セッション間遷移
result-session → training     // 次のセッション開始
preparation → training        // globalAudioDetector引き継ぎ

// パターン2: MediaStream破棄（destroy()実行）
training → home               // トレーニング中断
result-session → home         // トレーニング中断
results-overview → home       // 完了後のホーム
preparation → home            // 準備中断
```

---

## 🔧 実装の核心コード

### 1. トレーニングフロー検出

```javascript
/**
 * 遷移がトレーニングフロー内かどうか判定
 */
static isTrainingFlow(from, to) {
    const trainingFlowPatterns = [
        ['training', 'result-session'],
        ['result-session', 'training'],
        ['preparation', 'training'],
        ['result-session', 'results-overview'],
    ];

    return trainingFlowPatterns.some(
        ([source, dest]) => from === source && to === dest
    );
}
```

### 2. 統一navigate()（MediaStream保持/破棄分岐）

```javascript
static navigate(page, params = {}) {
    const currentPage = window.location.hash.split('?')[0].substring(1);
    const isFlowTransition = this.isTrainingFlow(currentPage, page);

    if (this.currentAudioDetector) {
        if (isFlowTransition) {
            // トレーニングフロー内: stopDetection()のみ（MediaStream保持）
            this.currentAudioDetector.stopDetection();
            console.log('🎤 MediaStream保持');
        } else {
            // フロー外: destroy()で完全破棄
            this._destroyAudioDetector(this.currentAudioDetector);
            this.currentAudioDetector = null;
            
            if (window.globalAudioDetector) {
                window.globalAudioDetector = null;
            }
            console.log('🗑️ MediaStream破棄');
        }
    }

    // 遷移実行
    window.location.hash = page;
}
```

### 3. 統合popstateハンドラー（PitchPro警告検出）

```javascript
static preventBrowserBack(page) {
    // ... setup code ...

    this.popStateHandler = async () => {
        // 1. PitchPro警告チェック（最優先）
        if (window.audioDetector) {
            const status = window.audioDetector.getStatus();

            if (status.lastError || status.state === 'error') {
                console.warn('⚠️ PitchPro警告検出');
                await this.redirectToPreparation('PitchPro警告アラート検出');
                return; // ブラウザバック防止処理をスキップ
            }
        }

        // 2. 通常のブラウザバック防止処理
        const newHash = window.location.hash.substring(1);
        const newPage = newHash.split('?')[0];

        const allowedPages = this.allowedTransitions.get(page) || [];
        if (allowedPages.includes(newPage)) {
            return;
        }

        alert(message);
        history.pushState(null, '', location.href);
    };

    window.addEventListener('popstate', this.popStateHandler);
}
```

### 4. 状態検証ヘルパー

```javascript
static verifyAudioDetectorState(audioDetector) {
    if (!audioDetector) {
        return { isValid: false, canReuse: false };
    }

    const status = audioDetector.getStatus();
    const micStatus = status.micControllerStatus;
    
    if (!micStatus?.isReady) {
        return { isValid: false, canReuse: false };
    }

    const health = audioDetector.microphoneController?.checkHealth();
    
    if (!health?.isHealthy) {
        return { isValid: false, canReuse: false };
    }

    return { isValid: true, canReuse: true };
}
```

### 5. trainingController改善（globalAudioDetector再利用）

```javascript
async function initializeAudioDetector() {
    // 1. globalAudioDetectorの存在確認
    if (window.globalAudioDetector) {
        const verification = NavigationManager.verifyAudioDetectorState(
            window.globalAudioDetector
        );

        if (verification.canReuse) {
            // 再利用可能 - startDetection()のみ
            audioDetector = window.globalAudioDetector;
            await audioDetector.startDetection();
            NavigationManager.registerAudioDetector(audioDetector);
            return audioDetector;
        } else {
            // 再利用不可 - 破棄
            window.globalAudioDetector.destroy();
            window.globalAudioDetector = null;
        }
    }

    // 2. 新規作成
    audioDetector = new window.PitchPro.AudioDetectionComponent({...});
    await audioDetector.initialize();
    
    window.audioDetector = audioDetector;
    window.globalAudioDetector = audioDetector;
    
    NavigationManager.registerAudioDetector(audioDetector);
    return audioDetector;
}
```

---

## ❌ 削除された不要な実装

以下は **PitchProが自動で行う** ため、アプリ側での実装は不要:

### 1. visibilitychangeでの手動状態チェック（不要）

```javascript
// ❌ 不要（PitchProが自動でやる）
document.addEventListener('visibilitychange', async () => {
    if (!document.hidden && window.audioDetector) {
        const verification = NavigationManager.verifyAudioDetectorState(...);
        if (!verification.canReuse) {
            alert('長時間バックグラウンド...');
        }
    }
});
```

### 2. setInterval()での定期的なエラー監視（不要）

```javascript
// ❌ 不要（PitchProが自動でやる）
setInterval(() => {
    const status = window.audioDetector?.getStatus();
    if (status?.lastError && status.state === 'error') {
        NavigationManager.redirectToPreparation('PitchProエラー');
    }
}, 5000);
```

### 3. navigator.permissions監視（不要）

```javascript
// ❌ 不要（PitchProが自動でやる）
const permissionStatus = await navigator.permissions.query({ name: 'microphone' });
permissionStatus.addEventListener('change', async () => {
    if (permissionStatus.state === 'denied') {
        await NavigationManager.redirectToPreparation('マイク許可取り消し');
    }
});
```

**理由**: PitchProのLifecycleManagerが1秒間隔で自動実行し、問題発生時は警告アラート+**popstateイベント**でアプリに通知してくれる

---

## 📊 期待される効果

### SPA設計目標の達成

- ✅ **マイク許可の保持**: training ↔ result-session で getUserMedia() 不要
- ✅ **ユーザー体験向上**: 8セッション連続でマイク許可ダイアログなし
- ✅ **システム安定性向上**: PitchProの自動リカバリー活用
- ✅ **完全な自動対応**: PitchPro警告 → preparationリダイレクト

### コード削減

- ❌ visibilitychange監視: 削除（20-30行削減）
- ❌ setInterval()監視: 削除（10-15行削減）
- ❌ permissions監視: 削除（15-20行削減）
- ✅ popstateハンドラー統合: 既存コード活用（追加10行のみ）

**合計**: 約45-65行のコード削減 + 保守性向上

---

## 🎯 実装計画

### Phase 1: NavigationManager改善（3-4時間）

- [ ] `isTrainingFlow()` 実装
- [ ] `verifyAudioDetectorState()` 実装
- [ ] `navigate()` メソッド改善
- [ ] 統合popstateハンドラー実装
- [ ] 単体テスト

### Phase 2: trainingController改善（2-3時間）

- [ ] `initializeAudioDetector()` 改善
- [ ] globalAudioDetector再利用ロジック
- [ ] エラーハンドリング強化
- [ ] 統合テスト

### Phase 3: preparation改善（1時間）

- [ ] globalAudioDetector設定の確実化
- [ ] NavigationManager登録追加

### Phase 4: 統合テスト・検証（2-3時間）

- [ ] 全トレーニングフロー検証
- [ ] MediaStream保持確認
- [ ] PitchPro警告アラート動作確認
- [ ] バックグラウンド復帰テスト

**合計工数**: 8-11時間

---

## 🔗 関連ドキュメント

- **詳細設計書**: `/PitchPro-SPA/docs/MICROPHONE_STATE_MANAGEMENT_DESIGN_V2.md`
- **NavigationManager**: `/PitchPro-SPA/js/navigation-manager.js`
- **trainingController**: `/PitchPro-SPA/js/controllers/trainingController.js`
- **PitchPro v1.3.4**: `/PitchPro-SPA/js/core/pitchpro-v1.3.4.umd.js`

---

## 💡 重要な教訓

### 1. ライブラリの仕様を完全に理解する

- PitchProには既に完全な自動エラーハンドリングが実装されていた
- 独自実装を避け、ライブラリの機能を最大限活用すべき

### 2. トリガーポイントの発見

- `alert()`閉鎖時のpopstateイベント発火という挙動を発見
- 既存のpopstateハンドラーを活用して統合可能

### 3. コード削減 = 保守性向上

- 45-65行のコード削減
- PitchProが自動で行うことをアプリ側で再実装していた無駄を排除

### 4. ユーザーの指摘の重要性

> "PitchProではバックグラウンドで長時間放置などでマイク状態が変化した時に自身でエラーダイアログを出してマイク許可を求めるような設計になってるはずです"

この指摘が調査の方向を決定づけた

---

## 📝 次のアクション

1. ユーザー承認確認
2. Phase 1実装開始（NavigationManager改善）
3. 段階的な統合テスト
4. 本番環境へのデプロイ
