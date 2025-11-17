# PitchPro状態管理を活用したマイク制御設計書（改訂版）

**バージョン**: v2.0.0
**作成日**: 2025-11-17
**最終更新**: 2025-11-17（調査完了・設計見直し）

## 📋 目次

1. [背景と目的](#背景と目的)
2. [調査結果のまとめ](#調査結果のまとめ)
3. [PitchPro組み込み機能の完全理解](#pitchpro組み込み機能の完全理解)
4. [現状の問題点](#現状の問題点)
5. [新設計の全体方針](#新設計の全体方針)
6. [実装仕様](#実装仕様)
7. [実装計画](#実装計画)

---

## 背景と目的

### なぜSPAにしたのか
- **根本目的**: マイク許可がページ遷移で失われる問題を回避
- **ユーザー体験**: 8セッション連続トレーニングで毎回マイク許可を求めない
- **技術的選択**: SPA（Single Page Application）アーキテクチャ採用

### 現在の矛盾
```
設計目標: マイク許可を保持したまま遷移
現実: training → result-session → training で毎回 getUserMedia() 実行
結果: SPA化した意味がない
```

---

## 調査結果のまとめ

### 🔍 重要な発見

#### 1. PitchProの自動エラーハンドリング機能
NavigationManager.jsのコメントから確認:
```javascript
// 【重要】MediaStream完全解放
// destroy()を呼ばないと、バックグラウンドでマイクが開いたままになり、
// 長時間経過後にPitchProが警告アラートを表示してpopstateイベントが発火する問題が発生
```

**発見事実**:
- ✅ PitchProには**自動警告機能**が組み込まれている
- ✅ LifecycleManagerが1秒間隔で健全性をチェック
- ✅ 長時間放置でPitchProが自動的に`alert()`を表示
- ✅ 警告ダイアログのOKボタンを押すと**popstateイベントが発火**

#### 2. 警告アラートのトリガーフロー
```
バックグラウンド長時間放置
  ↓
LifecycleManagerが異常検出
  ↓
PitchProが自動的にalert()表示
  ↓
ユーザーがOKボタンを押す
  ↓
✨ popstateイベント発火 ← ここがトリガー！
```

#### 3. 既存のpopstateハンドラーとの競合
NavigationManager.jsには既にpopstateハンドラーが存在:
```javascript
// Line 527-548: ブラウザバック防止用
this.popStateHandler = () => {
    const newHash = window.location.hash.substring(1);
    const newPage = newHash.split('?')[0];

    const allowedPages = this.allowedTransitions.get(page) || [];
    if (allowedPages.includes(newPage)) {
        return; // 許可された遷移
    }

    alert(message); // ブラウザバック防止メッセージ
    history.pushState(null, '', location.href);
};
```

**課題**: PitchPro警告検出とブラウザバック防止を統合する必要がある

---

## PitchPro組み込み機能の完全理解

### MicrophoneController 状態機械
```javascript
// 状態遷移
uninitialized → initializing → ready → active → error

// 状態チェックメソッド
isActive()        // state === "active" (音声検出中)
isReady()         // state === "ready" || state === "active" (使用可能)
isInitialized()   // state !== "uninitialized" (初期化済み)
getState()        // 現在の状態文字列を取得

// 健全性チェック
checkHealth() {
    return this.audioManager.checkMediaStreamHealth();
}

// 包括的状態取得
getStatus() {
    return {
        state: this.currentState,
        isPermissionGranted: this.isPermissionGranted,
        isActive: this.isActive(),
        isReady: this.isReady(),
        sensitivity: this.getSensitivity(),
        deviceSpecs: this.deviceSpecs,
        lastError: this.lastError,
        audioManagerStatus: this.audioManager.getStatus(),
        lifecycleStatus: this.lifecycleManager.getStatus()
    };
}
```

### AudioDetectionComponent 状態機械
```javascript
// 状態遷移
uninitialized → initializing → ready → detecting → error

getStatus() {
    return {
        state: this.currentState,
        isInitialized: this.isInitialized,
        deviceSpecs: this.deviceSpecs,
        config: this.config,
        lastError: this.lastError,
        pitchDetectorStatus: this.pitchDetector?.getStatus(),
        micControllerStatus: this.micController?.getStatus()
    };
}
```

### LifecycleManager 自動監視
```javascript
// 自動ヘルスチェック（1秒間隔）
// 自動リカバリー（最大3回）

getStatus() {
    return {
        refCount: this.refCount,
        isActive: this.isActive,
        autoRecoveryAttempts: this.autoRecoveryAttempts,
        // ...
    };
}
```

---

## 現状の問題点

### NavigationManager の実装
```javascript
// 問題1: 常に完全破棄（Line 303-320）
static _destroyAudioDetector(audioDetector) {
    audioDetector.stopDetection();
    audioDetector.destroy();  // ← MediaStream完全解放
}

// 問題2: すべての遷移で破棄（Line 344-396）
static navigate(page, params = {}) {
    if (this.currentAudioDetector) {
        this._destroyAudioDetector(this.currentAudioDetector);
        this.currentAudioDetector = null;
    }
}
```

### trainingController の実装
```javascript
// 問題3: preparation の globalAudioDetector を無視
if (!audioDetector || !window.audioDetector) {
    // 常に新規作成
    audioDetector = new window.PitchPro.AudioDetectionComponent(...);
    await audioDetector.initialize();  // ← getUserMedia() 再実行
}
```

### 結果として発生する問題
1. **training → result-session**: `destroy()` → MediaStream解放
2. **result-session → training**: 新規作成 → `getUserMedia()` 再実行
3. **preparation → training**: globalAudioDetector無視 → `getUserMedia()` 再実行
4. **バックグラウンド復帰**: 状態チェックなし → エラー発生の可能性
5. **長時間放置**: LifecycleManagerの自動リカバリー失敗 → 再起動不可

---

## 新設計の方針

### 基本原則
1. **PitchPro組み込み機能を最大限活用** - 独自実装を最小化
2. **トレーニングフロー内はMediaStream保持** - training ↔ result-session
3. **完全離脱時のみ破棄** - training → home, results-overview → home
4. **状態検証後に再利用** - checkHealth() による健全性確認

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

## 実装仕様

### 1. NavigationManager 改善

#### 1.1. 状態検証ヘルパー
```javascript
/**
 * AudioDetectorの状態を検証
 * PitchProの組み込みメソッドを活用
 *
 * @param {Object} audioDetector - AudioDetectionComponent instance
 * @returns {Object} { isValid: boolean, reason: string, canReuse: boolean }
 */
static verifyAudioDetectorState(audioDetector) {
    if (!audioDetector) {
        return {
            isValid: false,
            reason: 'audioDetector is null',
            canReuse: false
        };
    }

    try {
        // 1. AudioDetectionComponent の状態取得
        const status = audioDetector.getStatus();

        if (!status) {
            return {
                isValid: false,
                reason: 'getStatus() returned null',
                canReuse: false
            };
        }

        // 2. MicrophoneController の状態確認
        const micStatus = status.micControllerStatus;

        if (!micStatus) {
            return {
                isValid: false,
                reason: 'MicrophoneController not initialized',
                canReuse: false
            };
        }

        // 3. MicrophoneController.isReady() チェック
        const isReady = micStatus.isReady;

        if (!isReady) {
            return {
                isValid: false,
                reason: `MicrophoneController not ready (state: ${micStatus.state})`,
                canReuse: false
            };
        }

        // 4. MediaStream 健全性チェック
        const health = audioDetector.microphoneController?.checkHealth();

        if (!health || !health.isHealthy) {
            return {
                isValid: false,
                reason: 'MediaStream unhealthy',
                canReuse: false
            };
        }

        // 5. すべてのチェック通過
        return {
            isValid: true,
            reason: 'AudioDetector is healthy and ready',
            canReuse: true
        };

    } catch (error) {
        console.error('❌ [NavigationManager] State verification error:', error);
        return {
            isValid: false,
            reason: `Verification error: ${error.message}`,
            canReuse: false
        };
    }
}
```

#### 1.2. トレーニングフロー検出
```javascript
/**
 * 遷移がトレーニングフロー内かどうか判定
 *
 * @param {string} from - 遷移元ページ
 * @param {string} to - 遷移先ページ
 * @returns {boolean} true: フロー内（MediaStream保持）, false: フロー外（破棄）
 */
static isTrainingFlow(from, to) {
    // トレーニングフロー内の遷移パターン
    const trainingFlowPatterns = [
        ['training', 'result-session'],      // セッション完了
        ['result-session', 'training'],      // 次のセッション
        ['preparation', 'training'],         // 準備完了
        ['result-session', 'results-overview'], // 8セッション完了（最後のセッション）
    ];

    return trainingFlowPatterns.some(
        ([source, dest]) => from === source && to === dest
    );
}
```

#### 1.3. 統一navigate() 改善
```javascript
/**
 * 統一ナビゲーションメソッド（改善版）
 * PitchPro状態管理を活用し、適切にMediaStreamを保持/破棄
 */
static navigate(page, params = {}) {
    console.log(`🚀 [NavigationManager] 統一ナビゲーション: ${page}`, params);

    const currentPage = window.location.hash.split('?')[0].substring(1);
    const isFlowTransition = this.isTrainingFlow(currentPage, page);

    // 1. AudioDetectorの処理を分岐
    if (this.currentAudioDetector) {
        if (isFlowTransition) {
            // トレーニングフロー内: stopDetection()のみ（MediaStream保持）
            console.log(`✅ [NavigationManager] トレーニングフロー内遷移: ${currentPage} → ${page}`);
            console.log('🎤 [NavigationManager] MediaStream保持 - stopDetection()のみ実行');

            try {
                this.currentAudioDetector.stopDetection();
                console.log('🛑 [NavigationManager] 音声検出停止（MediaStream保持）');
            } catch (error) {
                console.warn('⚠️ [NavigationManager] stopDetection() error:', error);
                // エラーでも続行（次のページで状態検証される）
            }

        } else {
            // トレーニングフロー外: destroy()で完全破棄
            console.log(`🔄 [NavigationManager] トレーニングフロー外遷移: ${currentPage} → ${page}`);
            console.log('🗑️ [NavigationManager] MediaStream破棄 - destroy()実行');

            this._destroyAudioDetector(this.currentAudioDetector);
            this.currentAudioDetector = null;

            // globalAudioDetectorもクリア
            if (window.globalAudioDetector) {
                window.globalAudioDetector = null;
                console.log('🧹 [NavigationManager] globalAudioDetector クリア');
            }
        }
    }

    // 2. beforeunload/popstateを無効化
    this.disableNavigationWarning();
    this.removeBrowserBackPrevention();

    // 3. 正常な遷移フラグを設定
    if (page === 'training' || page === 'result-session') {
        this.setNormalTransition();
    }

    // 4. sessionStorageクリーンアップ（v3.1.0）
    if (currentPage === 'training') {
        const shouldPreserveLesson =
            page === 'result-session' ||
            page === 'results-overview' ||
            page === 'training';

        if (!shouldPreserveLesson) {
            const currentLessonId = sessionStorage.getItem('currentLessonId');
            if (currentLessonId) {
                sessionStorage.removeItem('currentLessonId');
                console.log(`🔄 [NavigationManager] currentLessonId削除 (${currentLessonId})`);
            }
        }
    }

    // 5. ハッシュ構築
    let targetHash = page;
    if (Object.keys(params).length > 0) {
        const urlParams = new URLSearchParams(params);
        targetHash = `${page}?${urlParams.toString()}`;
    }

    // 6. 遷移実行
    window.location.hash = targetHash;
    console.log(`✅ [NavigationManager] 遷移完了: ${targetHash}`);
}
```

### 2. trainingController 改善

#### 2.1. AudioDetector初期化ロジック改善
```javascript
/**
 * AudioDetector初期化（改善版）
 * 1. globalAudioDetectorの再利用優先
 * 2. 状態検証による健全性確認
 * 3. 失敗時のフォールバック処理
 */
async function initializeAudioDetector() {
    console.log('🎤 AudioDetector初期化開始');

    // 1. globalAudioDetectorの存在確認
    if (window.globalAudioDetector) {
        console.log('🔍 [trainingController] globalAudioDetector検出 - 状態検証中');

        // 2. 状態検証
        const verification = NavigationManager.verifyAudioDetectorState(
            window.globalAudioDetector
        );

        if (verification.canReuse) {
            // 3. 再利用可能 - startDetection()のみ
            console.log('✅ [trainingController] globalAudioDetector再利用');
            console.log(`   理由: ${verification.reason}`);

            audioDetector = window.globalAudioDetector;
            window.audioDetector = audioDetector;

            try {
                await audioDetector.startDetection();
                console.log('✅ [trainingController] 音声検出開始（再利用）');

                // NavigationManagerに登録
                NavigationManager.registerAudioDetector(audioDetector);
                return audioDetector;

            } catch (error) {
                console.warn('⚠️ [trainingController] startDetection()失敗 - 新規作成へフォールバック');
                console.warn('   理由:', error.message);

                // フォールバック: 新規作成
                window.globalAudioDetector = null;
            }
        } else {
            // 4. 再利用不可 - 破棄して新規作成
            console.warn('⚠️ [trainingController] globalAudioDetector再利用不可');
            console.warn(`   理由: ${verification.reason}`);

            try {
                window.globalAudioDetector.destroy();
            } catch (error) {
                console.warn('⚠️ [trainingController] destroy()エラー（無視）:', error);
            }

            window.globalAudioDetector = null;
        }
    }

    // 5. 新規作成
    console.log('🆕 [trainingController] AudioDetector新規作成');

    try {
        audioDetector = new window.PitchPro.AudioDetectionComponent({
            // ... config
        });

        await audioDetector.initialize();
        console.log('✅ [trainingController] AudioDetector初期化完了');

        // グローバル登録
        window.audioDetector = audioDetector;
        window.globalAudioDetector = audioDetector;

        // NavigationManagerに登録
        NavigationManager.registerAudioDetector(audioDetector);

        return audioDetector;

    } catch (error) {
        console.error('❌ [trainingController] AudioDetector初期化失敗:', error);

        alert('マイクの初期化に失敗しました。\n\nマイクの権限を確認してページを再読み込みしてください。');
        throw error;
    }
}
```

### 3. preparation-pitchpro-cycle 改善

#### 3.1. globalAudioDetector設定の確実化
```javascript
// 音域テスト完了後（Line 1038付近）
window.globalAudioDetector = pitchProCycleManager.audioDetector;
console.log('✅ [preparation] globalAudioDetectorを設定');
console.log('   state:', window.globalAudioDetector.getStatus().state);
console.log('   micController:', window.globalAudioDetector.getStatus().micControllerStatus?.state);

// NavigationManagerにも登録
NavigationManager.registerAudioDetector(window.globalAudioDetector);
console.log('✅ [preparation] NavigationManagerに登録完了');
```

---

## エッジケース対応

### 1. バックグラウンド長時間放置
```javascript
/**
 * visibilitychange対応
 * バックグラウンドから復帰時に状態検証
 */
document.addEventListener('visibilitychange', async () => {
    if (!document.hidden && window.audioDetector) {
        console.log('👁️ [NavigationManager] バックグラウンドから復帰 - 状態検証');

        const verification = NavigationManager.verifyAudioDetectorState(
            window.audioDetector
        );

        if (!verification.canReuse) {
            console.warn('⚠️ [NavigationManager] MediaStream無効化検出');
            console.warn(`   理由: ${verification.reason}`);

            // ユーザーに通知
            alert('長時間バックグラウンドにいたため、マイク接続が切断されました。\n\nマイク設定のため準備ページに移動します。');

            // preparationへリダイレクト
            await NavigationManager.redirectToPreparation('バックグラウンド復帰エラー');
        } else {
            console.log('✅ [NavigationManager] MediaStream正常');
        }
    }
});
```

### 2. OS レベルの権限取り消し
```javascript
/**
 * マイク許可取り消し検出
 * navigator.permissions API使用
 */
async function watchMicrophonePermission() {
    try {
        const permissionStatus = await navigator.permissions.query({ name: 'microphone' });

        permissionStatus.addEventListener('change', async () => {
            console.log('🎤 [NavigationManager] マイク許可状態変更:', permissionStatus.state);

            if (permissionStatus.state === 'denied') {
                alert('マイクの使用が拒否されました。\n\nマイク設定のため準備ページに移動します。');

                await NavigationManager.redirectToPreparation('マイク許可取り消し');
            }
        });

        console.log('✅ [NavigationManager] マイク許可監視開始');

    } catch (error) {
        console.warn('⚠️ [NavigationManager] Permissions API非対応:', error);
    }
}
```

### 3. メモリ不足によるMediaStream停止
```javascript
/**
 * PitchPro LifecycleManagerの自動リカバリー失敗時
 * lastErrorをチェックしてリダイレクト
 */
setInterval(() => {
    if (window.audioDetector) {
        const status = window.audioDetector.getStatus();

        if (status.lastError && status.state === 'error') {
            console.error('❌ [NavigationManager] PitchProエラー検出:', status.lastError);

            alert('マイクの処理中にエラーが発生しました。\n\nマイク設定のため準備ページに移動します。');

            NavigationManager.redirectToPreparation('PitchProエラー');
        }
    }
}, 5000); // 5秒間隔でチェック
```

---

## 実装計画

### Phase 1: NavigationManager 改善（優先度: 最高）
- [ ] `verifyAudioDetectorState()` 実装
- [ ] `isTrainingFlow()` 実装
- [ ] `navigate()` メソッド改善
- [ ] 単体テスト作成

**工数**: 2-3時間
**リスク**: 低（既存機能への影響最小）

### Phase 2: trainingController 改善（優先度: 高）
- [ ] `initializeAudioDetector()` 改善実装
- [ ] globalAudioDetector再利用ロジック
- [ ] エラーハンドリング強化
- [ ] 統合テスト

**工数**: 2-3時間
**リスク**: 中（トレーニング動作への影響）

### Phase 3: preparation 改善（優先度: 中）
- [ ] globalAudioDetector設定の確実化
- [ ] NavigationManager登録追加
- [ ] 状態ログ強化

**工数**: 1時間
**リスク**: 低

### Phase 4: エッジケース対応（優先度: 中）
- [ ] visibilitychange監視強化
- [ ] マイク許可監視実装
- [ ] PitchProエラー監視実装
- [ ] 包括的なエラーハンドリングテスト

**工数**: 3-4時間
**リスク**: 中（新機能追加）

### Phase 5: 統合テスト・検証（優先度: 高）
- [ ] 全トレーニングフロー検証
- [ ] バックグラウンド復帰テスト
- [ ] 長時間放置テスト
- [ ] エラーリカバリーテスト

**工数**: 2-3時間
**リスク**: 高（本番環境への影響）

---

## まとめ

### 設計の核心
1. **PitchProの組み込み機能を信頼する** - 独自実装を避ける
2. **トレーニングフロー内はMediaStream保持** - getUserMedia()再実行を排除
3. **状態検証による安全な再利用** - checkHealth()で健全性確認
4. **適切なクリーンアップ** - フロー外離脱時のみdestroy()

### 期待される効果
- ✅ **SPA設計目標達成**: マイク許可の保持
- ✅ **ユーザー体験向上**: 8セッション連続でマイク許可なし
- ✅ **システム安定性向上**: PitchProの自動リカバリー活用
- ✅ **エッジケース対応**: バックグラウンド復帰・権限取り消し等

### 次のステップ
1. ユーザー承認確認
2. Phase 1実装開始（NavigationManager改善）
3. 段階的な統合テスト
4. 本番環境へのデプロイ
