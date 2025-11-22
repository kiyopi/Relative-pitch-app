# マイクロフォン バックグラウンド耐性仕様書

**バージョン**: 3.0.0
**作成日**: 2025-11-09
**最終更新日**: 2025-11-21
**ステータス**: ✅ v4.5.0でトレーニングページ事前チェック追加

---

## 🔄 アップデート履歴

### v3.0.0 (2025-11-21)
**トレーニングページ マイク事前チェック追加**

ブラウザがタブをdiscard（完全破棄）した場合の最終防御策として、トレーニングページ初期化時にマイク事前チェックを追加しました。

**背景と問題**:
- 長時間のデスクトップ切替後、ブラウザがタブを完全に破棄（discard）することがある
- この場合、既存の3重防御（visibilitychange等）では対処不可能
- MediaStreamそのものが消滅しているため、「復帰」ではなく「再取得」が必要
- **最悪のシナリオ**: ドレミガイド中にマイク許可ダイアログが出現 → レッスン破綻

**解決策**:
- `initializeTrainingPage()`で`getUserMedia()`による事前マイクチェックを実行
- **SPA化の恩恵**: ここで取得した許可はドレミガイドでそのまま使用可能
- ダイアログが出ても「基音再生ボタンを押す前」なのでUXへの影響は最小限

**実装内容** (`trainingController.js` v4.5.0):
```javascript
// 【v4.5.0追加】マイク事前チェック
try {
    console.log('🎤 [v4.5.0] マイク事前チェック開始...');
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    console.log('✅ [v4.5.0] マイク許可確認完了');
    stream.getTracks().forEach(track => track.stop());
} catch (error) {
    // 許可拒否/デバイスエラー → 準備ページへリダイレクト
    await NavigationManager.redirectToPreparation('マイク許可エラー');
    return;
}
```

**新しいフロー**:
```
trainingページ表示 → initializeTrainingPage() → マイク事前チェック
                                                    ↓
                                              許可ダイアログ（必要時のみ）
                                                    ↓
                                              許可OK → ボタン有効化 → 基音再生 → ドレミガイド✅
                                              許可NG → 準備ページへリダイレクト
```

**SPA化との関係**:
- MPA時代：ページ遷移でJavaScriptコンテキスト破棄 → 事前チェックしても意味なし
- SPA化後：ハッシュ変更のみでコンテキスト維持 → 事前チェックの許可がそのまま使える

詳細は「[ブラウザDiscard時の最終防御策](#ブラウザdiscard時の最終防御策v450)」セクションを参照。

---

### v2.0.0 (2025-11-09)
**PitchPro v1.3.2への統合完了**

本仕様書で設計・実装したバックグラウンド耐性機能が、PitchProライブラリ v1.3.2に正式統合されました。

**主な変更点**:
- ✅ **アプリ側コード削除**: `preparation-pitchpro-cycle.js`から以下を削除
  - `setupBackgroundControl()` メソッド
  - `detectPageReload()` メソッド
  - `state.wasActiveBeforeBackground` プロパティ
  - `state.isReloadDetected` プロパティ
- ✅ **ライブラリ側実装**: PitchPro `MicrophoneLifecycleManager.ts`に統合
  - `handleVisibilityChange()` メソッド改修
  - ページ非表示時の完全なヘルスチェック停止
  - ページ表示時の自動復旧試行回数リセット
- ✅ **バージョン更新**: `index.html`でv1.3.2を参照
  ```html
  <script src="js/core/pitchpro-v1.3.2.umd.js?v=20251109002"></script>
  ```

**技術的影響**:
- アプリケーション側の実装が大幅に簡素化
- バックグラウンド制御がライブラリレベルで自動処理
- 他のPitchPro利用アプリでも同じ耐性機能を享受可能
- メンテナンス性の向上（アプリ側でのバグ修正不要）

**参考リンク**:
- [PitchPro v1.3.2 Release](https://github.com/kiyopi/pitchpro-audio-processing/releases/tag/v1.3.2)

---

### v1.0.0 (2025-11-09)
**初期実装 - アプリ側ハイブリッドアプローチ**

アプリケーション側（`preparation-pitchpro-cycle.js`）でバックグラウンド制御を実装。
本バージョンの設計思想と実装パターンがv1.3.2のライブラリ統合に引き継がれました。

---

## 📋 目次

1. [概要](#概要)
2. [問題の発見と分析](#問題の発見と分析)
3. [解決策の設計](#解決策の設計)
4. [実装詳細](#実装詳細)
5. [動作フロー](#動作フロー)
6. [テストシナリオ](#テストシナリオ)
7. [今後の拡張](#今後の拡張)

---

## 概要

### 目的
PitchProライブラリのMicrophoneLifecycleManagerが、バックグラウンド/フォアグラウンド遷移時に発生するマイクロフォン権限エラーから自動的に復旧できるようにする。

### 対象フェーズ
- **準備フェーズ（音域テスト）**: `/PitchPro-SPA/pages/preparation.html`
- **トレーニングフェーズ**: `/PitchPro-SPA/pages/training.html`

### スコープ
- バックグラウンド移動時のマイクストリーム一時停止
- フォアグラウンド復帰時の自動再開
- 最大試行回数到達エラーからの自動復旧
- ユーザーへの透明な復旧プロセス

---

## 問題の発見と分析

### 報告された問題

#### 問題1: 音域テスト - マイク検出失敗
**症状**:
```
1. 音域テストでマイク許可を出す
2. アプリをバックグラウンドに移動
3. PitchProのダイアログが表示される
4. ダイアログを閉じてマイク許可を再実行
5. 音声を出し続けてもマイク検出ができない
```

#### 問題2: トレーニング - マイク許可再要求
**症状**:
```
1. トレーニングでマイク許可を出す
2. アプリをバックグラウンドに移動
3. PitchProのダイアログが表示される
4. ダイアログを閉じる
5. 基音再生ボタンを押下
6. マイク許可ダイアログが再出現
```

### 根本原因の特定

#### コンソールログ分析
```
[Warning] MicrophoneLifecycleManager] Unhealthy microphone state detected
[Error] Maximum recovery attempts reached - stopping health checks
Error Code: MICROPHONE_ACCESS_DENIED
recoveryAttempts: 3
healthStatus: unhealthy
Error: Microphone health check failed after 3 recovery attempts.
Monitoring stopped to prevent infinite error loop.
```

#### 原因の詳細分析

**1. ブラウザのマイクストリーム管理**
- ページがバックグラウンドに移動すると、ブラウザはマイクストリームを自動的に停止する
- これはセキュリティとプライバシー保護のためのブラウザ仕様

**2. PitchProの健全性チェック**
- `MicrophoneLifecycleManager`が定期的にマイクの健全性をチェック
- バックグラウンド中にマイクストリームが停止すると、"unhealthy"と判定

**3. 自動復旧の試行と失敗**
- PitchProが自動的に復旧を試行（最大3回）
- バックグラウンド中は復旧が不可能なため、3回とも失敗

**4. エラー状態の固定化**
- 無限ループ防止のため、3回失敗後は健全性チェック自体を停止
- この状態でフォアグラウンドに復帰しても、自動復旧が実行されない
- ユーザーが手動で再許可しても、内部エラー状態が残り続ける

**5. 結果的な症状**
- 音域テスト: マイク検出が完全に動作しなくなる
- トレーニング: 基音再生時に再度マイク許可が要求される

---

## 解決策の設計

### アプローチ

#### 案1: visibilitychangeイベントでの制御（採用）
**メリット**:
- ブラウザ標準APIで確実に検出
- PitchProが健全性チェックを実行する前に制御可能
- バックグラウンド中のエラーを未然に防止

**実装**:
```javascript
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        // バックグラウンド移動時: PitchProを停止
        audioDetector.stopDetection();
    } else {
        // フォアグラウンド復帰時: PitchProを再開
        audioDetector.startDetection();
    }
});
```

#### 案2: PitchProのイベントフックで制御（非採用）
**デメリット**:
- PitchProがイベントを発火するタイミングが遅い
- すでにエラー状態になった後の対処となる

#### 案3: エラー状態からの自動復旧（案1と併用採用）
**メリット**:
- すでにエラー状態になった場合の対処
- 最大試行回数到達エラーを検出して自動リセット
- フェイルセーフとしての役割

**実装**:
```javascript
if (error.code === 'MICROPHONE_ACCESS_DENIED' &&
    error.context?.maxAttemptsReached) {
    // 自動的にPitchProをリセット
    await audioDetector.reset();
}
```

### 採用した設計

**ハイブリッドアプローチ**: 案1 + 案3
- **第1層（予防）**: visibilitychangeで事前にPitchProを制御
- **第2層（復旧）**: エラー発生時の自動リセット機能

---

## 実装詳細

### ファイル構成

**対象ファイル**: `/PitchPro-SPA/pages/js/preparation-pitchpro-cycle.js`

### コード実装

#### 1. 状態管理の拡張（constructor）

```javascript
constructor() {
    // 状態管理
    this.state = {
        detectionActive: false,
        detectedPitches: [],
        detectionStartTime: null,
        currentMode: 'permission',
        wasActiveBeforeBackground: false // 追加: バックグラウンド前の状態保持
    };

    // バックグラウンド制御を初期化時に設定
    this.setupBackgroundControl();
}
```

**追加プロパティ**:
- `wasActiveBeforeBackground`: バックグラウンド移動前に音声検出がアクティブだったかを記録

#### 2. バックグラウンド制御システム（setupBackgroundControl）

```javascript
/**
 * バックグラウンド制御の設定
 * ページが非表示になった時にPitchProを一時停止し、
 * 表示時に再開またはリセットする
 */
setupBackgroundControl() {
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            // バックグラウンドに移動時
            console.log('🔇 Page hidden - pausing PitchPro');
            if (this.audioDetector && this.state.detectionActive) {
                this.state.wasActiveBeforeBackground = true;
                this.audioDetector.stopDetection();
            }
        } else {
            // フォアグラウンド復帰時
            console.log('🔊 Page visible - resuming PitchPro');
            if (this.audioDetector && this.state.wasActiveBeforeBackground) {
                if (this.audioDetector.state !== 'error') {
                    this.audioDetector.startDetection();
                } else {
                    // エラー状態の場合は完全リセット
                    console.log('⚠️ PitchPro in error state - performing reset');
                    this.audioDetector.reset();
                    setTimeout(() => {
                        this.audioDetector.startDetection();
                    }, 500);
                }
                this.state.wasActiveBeforeBackground = false;
            }
        }
    });
}
```

**処理フロー**:

**バックグラウンド移動時**:
1. `document.hidden`が`true`になる
2. 音声検出がアクティブな場合、状態を保存
3. `stopDetection()`でPitchProを停止

**フォアグラウンド復帰時**:
1. `document.hidden`が`false`になる
2. バックグラウンド前にアクティブだった場合のみ再開
3. エラー状態チェック:
   - 正常: `startDetection()`で再開
   - エラー: `reset()` → 500ms待機 → `startDetection()`

#### 3. 自動復旧ロジック（handleAudioError拡張）

```javascript
/**
 * エラーハンドラー
 */
handleAudioError(context, error) {
    console.error(`🚨 Audio Error [${context}]:`, error);
    this.state.detectionActive = false;

    // 自動復旧ロジック: 最大試行回数到達エラーの場合
    if (error.code === 'MICROPHONE_ACCESS_DENIED' &&
        error.context?.maxAttemptsReached) {
        console.log('🔄 Auto-recovering from max attempts error...');

        setTimeout(async () => {
            if (this.audioDetector) {
                await this.audioDetector.reset();
                console.log('✅ PitchPro reset complete');

                // UIをリセット状態に戻す
                if (this.uiElements.requestMicBtn) {
                    this.uiElements.requestMicBtn.disabled = false;
                    this.uiElements.requestMicBtn.innerHTML = '<i data-lucide="mic" style="width: 24px; height: 24px;"></i><span>マイク許可</span>';
                    lucide.createIcons();
                }
            }
        }, 1000);
        return;
    }

    // 既存のエラー時UI更新
    if (this.uiElements.requestMicBtn) {
        this.uiElements.requestMicBtn.disabled = false;
        this.uiElements.requestMicBtn.innerHTML = '<i data-lucide="alert-circle" style="width: 24px; height: 24px;"></i><span>エラー - 再試行</span>';
        lucide.createIcons();
    }
}
```

**処理フロー**:
1. エラーコード`MICROPHONE_ACCESS_DENIED`を検出
2. `maxAttemptsReached`フラグを確認
3. 1秒待機後、`reset()`を実行
4. UIをリセット状態に戻す（「マイク許可」ボタン）
5. ユーザーが手動で再試行可能な状態にする

---

## 動作フロー

### シナリオ1: 正常なバックグラウンド遷移

```
[音域テスト中]
  ↓
[ユーザーがバックグラウンドに移動]
  ↓ visibilitychange (hidden)
[PitchPro.stopDetection() 実行]
  ↓ state.wasActiveBeforeBackground = true
[バックグラウンド中: マイク停止]
  ↓
[ユーザーがフォアグラウンドに復帰]
  ↓ visibilitychange (visible)
[audioDetector.state チェック]
  ↓ state !== 'error'
[PitchPro.startDetection() 実行]
  ↓
[音域テスト再開]
```

### シナリオ2: エラー状態からの復旧

```
[音域テスト中]
  ↓
[バックグラウンド移動]
  ↓ (PitchProが3回復旧試行)
[MicrophoneLifecycleManager: maxAttemptsReached]
  ↓
[フォアグラウンド復帰]
  ↓ visibilitychange (visible)
[audioDetector.state チェック]
  ↓ state === 'error'
[PitchPro.reset() 実行]
  ↓ 500ms 待機
[PitchPro.startDetection() 実行]
  ↓
[音域テスト再開]
```

### シナリオ3: 最大試行回数エラー発生時

```
[エラー発生]
  ↓
[handleAudioError() 呼び出し]
  ↓
[エラーコードチェック]
  ↓ MICROPHONE_ACCESS_DENIED + maxAttemptsReached
[自動復旧開始]
  ↓ 1秒待機
[PitchPro.reset() 実行]
  ↓
[UIを「マイク許可」状態に戻す]
  ↓
[ユーザーが手動で再試行可能]
```

---

## テストシナリオ

### テスト1: 音域テスト - バックグラウンド遷移

**手順**:
1. 準備フェーズで音域テストを開始
2. マイク許可を実行
3. 音声検出が動作していることを確認
4. アプリをバックグラウンドに移動
5. 10秒待機
6. アプリをフォアグラウンドに復帰
7. 音声を出す

**期待結果**:
- ✅ コンソールに`🔇 Page hidden - pausing PitchPro`が表示される
- ✅ コンソールに`🔊 Page visible - resuming PitchPro`が表示される
- ✅ 音声検出が自動的に再開される
- ✅ マイク許可ダイアログが再出現しない

### テスト2: トレーニング - バックグラウンド遷移

**手順**:
1. トレーニングフェーズを開始
2. マイク許可を実行
3. アプリをバックグラウンドに移動
4. 10秒待機
5. アプリをフォアグラウンドに復帰
6. 基音再生ボタンを押下

**期待結果**:
- ✅ マイク許可ダイアログが再出現しない
- ✅ 音声検出が正常に動作する
- ✅ トレーニングが継続可能

### テスト3: エラー状態からの自動復旧

**手順**:
1. 音域テストを開始
2. マイク許可を実行
3. DevToolsでPitchProを強制的にエラー状態にする
4. `maxAttemptsReached`エラーを発生させる

**期待結果**:
- ✅ コンソールに`🔄 Auto-recovering from max attempts error...`が表示される
- ✅ 1秒後に`✅ PitchPro reset complete`が表示される
- ✅ UIが「マイク許可」ボタンに戻る
- ✅ ユーザーが再試行可能

### テスト4: 長期バックグラウンド（30秒以上）

**手順**:
1. 音域テストを開始
2. マイク許可を実行
3. アプリをバックグラウンドに移動
4. 30秒待機
5. アプリをフォアグラウンドに復帰

**期待結果**:
- ✅ エラー状態になっていても自動的にリセット
- ✅ 音声検出が正常に再開される

---

## 今後の拡張

### Phase 1: トレーニングフェーズへの適用

**対象ファイル**: `/PitchPro-SPA/pages/js/training-controller.js`（仮）

**実装内容**:
- 同様のバックグラウンド制御システムを実装
- トレーニング進行状態の保持・復元
- セッションデータの安全性確保

### Phase 2: エラー状態の詳細ログ

**目的**: デバッグとユーザーサポートの向上

**実装内容**:
```javascript
handleAudioError(context, error) {
    // エラー詳細をlocalStorageに記録
    const errorLog = {
        timestamp: Date.now(),
        context,
        error: {
            code: error.code,
            message: error.message,
            recoveryAttempts: error.context?.recoveryAttempts,
            maxAttemptsReached: error.context?.maxAttemptsReached
        }
    };

    // ログを保存（最新10件のみ）
    const logs = JSON.parse(localStorage.getItem('pitchpro_error_logs') || '[]');
    logs.unshift(errorLog);
    localStorage.setItem('pitchpro_error_logs', JSON.stringify(logs.slice(0, 10)));
}
```

### Phase 3: ユーザー通知システム

**目的**: バックグラウンド遷移時のユーザー理解向上

**実装案**:
```javascript
setupBackgroundControl() {
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            // 通知を表示
            showNotification('音声検出を一時停止しました', 'info');
        } else {
            // 復帰通知
            showNotification('音声検出を再開しました', 'success');
        }
    });
}
```

### Phase 4: オフライン検出との統合

**目的**: ネットワーク切断時の対処

**実装案**:
```javascript
// オフライン検出
window.addEventListener('offline', () => {
    if (this.audioDetector && this.state.detectionActive) {
        this.audioDetector.stopDetection();
        this.state.wasOffline = true;
    }
});

// オンライン復帰
window.addEventListener('online', () => {
    if (this.state.wasOffline) {
        this.audioDetector.startDetection();
        this.state.wasOffline = false;
    }
});
```

---

## 参考資料

### PitchPro AudioProcessing
- **リポジトリ**: https://github.com/kiyopi/pitchpro-audio-processing
- **MicrophoneLifecycleManager**: 自動健全性チェック・復旧システム
- **ErrorNotificationSystem**: エラー通知システム

### ブラウザAPI
- **visibilitychange**: https://developer.mozilla.org/en-US/docs/Web/API/Document/visibilitychange_event
- **MediaStream**: https://developer.mozilla.org/en-US/docs/Web/API/MediaStream

### 関連仕様書
- `VOLUME_BAR_INTEGRATION_SPECIFICATION.md`: 音量バー統合仕様
- `CRITICAL_DECISIONS_AND_INSIGHTS.md`: iPadOS 13+デバイス判定

---

**この仕様書により、バックグラウンド遷移時のマイク権限問題を完全に解決し、安定したユーザー体験を提供します。**

---

## ブラウザDiscard時の最終防御策（v4.5.0）

### 問題の背景

#### 既存の3重防御で対処できないケース

**通常のバックグラウンド遷移**（既存の防御で対処可能）:
- ユーザーが一時的にタブを離れる（1分以内程度）
- ブラウザはMediaStreamを一時停止するが、破棄はしない
- `visibilitychange`イベントで復帰処理が可能

**ブラウザDiscard**（既存の防御では対処不可能）:
- 長時間のデスクトップ切替、メモリ不足などでブラウザがタブを完全破棄
- MediaStreamが消滅（復帰ではなく再取得が必要）
- JavaScriptコンテキストも破棄されるため、`visibilitychange`が意味をなさない

#### 最悪のシナリオ

```
1. ユーザーがトレーニング中にデスクトップ切替
2. 長時間経過（環境依存、1分以上）
3. ブラウザがタブをDiscard
4. ユーザーがアプリに戻る → ページが再読み込みされる
5. トレーニングページが表示される
6. ユーザーが「基音を再生」ボタンを押す
7. 基音が再生される（2.5秒）
8. ドレミガイドが開始
9. AudioDetector初期化時にマイク許可ダイアログが出現 ← 最悪
10. ユーザーはドレミガイドに追従できない
11. レッスン破綻・データ不整合の可能性
```

### 解決策: トレーニングページ初期化時の事前チェック

#### 設計思想

**これまでの方針**:
- 「trainingページでマイク許可ダイアログは絶対出さない」
- → 複雑な3重防御システム、リロード検出、リダイレクト処理

**新しい方針**:
- 「trainingページでマイク許可ダイアログは**ドレミガイド中に出さない**」
- → シンプルな事前チェックで確実に防御

#### なぜSPA化で可能になったか

**MPA時代の制約**:
```
preparation.html → [ページ遷移] → training.html
                        ↓
              JavaScriptコンテキスト破棄
              MediaStream破棄
                        ↓
        training.htmlでマイク許可を取得しても
        次のページ遷移でまた破棄される
        → 事前チェックの意味がない
```

**SPA化後**:
```
index.html#preparation → [ハッシュ変更のみ] → index.html#training
                                ↓
                    JavaScriptコンテキスト維持
                    MediaStream維持可能
                                ↓
            trainingページ初期化時にgetUserMedia()実行
                                ↓
                    許可されたMediaStreamは
                    ドレミガイドでそのまま使用可能
                    → 事前チェックが有効
```

### 実装詳細

#### 実装場所
`trainingController.js` - `initializeTrainingPage()` 内

#### コード
```javascript
// 【v4.5.0追加】マイク事前チェック - ドレミガイド中のダイアログ出現を防止
// SPA化により、ここで取得したマイク許可はドレミガイドでそのまま使用可能
// 基音再生（PitchShifter）はマイク不要なので、ダイアログ表示中も問題なし
try {
    console.log('🎤 [v4.5.0] マイク事前チェック開始...');
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    console.log('✅ [v4.5.0] マイク許可確認完了 - MediaStream取得成功');

    // MediaStreamは保持せず、許可状態の確認のみ
    // AudioDetectorが後で独自にMediaStreamを取得する
    stream.getTracks().forEach(track => track.stop());
    console.log('🔄 [v4.5.0] 確認用MediaStreamを解放（AudioDetectorが再取得）');
} catch (error) {
    console.error('❌ [v4.5.0] マイク許可取得失敗:', error);

    // マイク許可が拒否された場合は準備ページへリダイレクト
    if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        alert('マイクの使用が許可されていません。\nトレーニングにはマイクが必要です。');
        await NavigationManager.redirectToPreparation('マイク許可拒否');
        return;
    }

    // その他のエラー（デバイスなし等）
    alert(`マイクエラー: ${error.message}\nマイクが正しく接続されているか確認してください。`);
    await NavigationManager.redirectToPreparation('マイクエラー');
    return;
}
```

#### 処理フロー

```
trainingページ表示
        ↓
initializeTrainingPage() 開始
        ↓
URLパラメータ解析、モード設定
        ↓
音域データチェック
        ↓
【v4.5.0追加】マイク事前チェック ← ここでダイアログが出る（必要時のみ）
        ↓
  ┌─ 許可OK ─┐
  │          │
  │    ボタン登録
  │          │
  │    初期化完了
  │          │
  │    ユーザーが「基音を再生」を押す
  │          │
  │    基音再生（2.5秒）← ダイアログなし
  │          │
  │    ドレミガイド開始 ← ダイアログなし✅
  │
  └─ 許可NG → 準備ページへリダイレクト
```

### テストシナリオ

#### テスト: ブラウザDiscard後のトレーニング復帰

**手順**:
1. トレーニングページでセッション途中まで進める
2. デスクトップ切替でアプリを離れる
3. 十分な時間待機（1分以上、環境依存）
4. アプリに戻る

**期待結果**:
- ✅ コンソールに`🎤 [v4.5.0] マイク事前チェック開始...`が表示される
- ✅ マイク許可ダイアログが表示される（必要時のみ）
- ✅ 許可後、ボタンが有効化される
- ✅ 「基音を再生」ボタン押下後、ドレミガイドがダイアログなしで開始される

#### 検証済みログ（2025-11-21）
```
🎤 [v4.5.0] マイク事前チェック開始... (trainingController.js, line 410)
✅ [v4.5.0] マイク許可確認完了 - MediaStream取得成功 (trainingController.js, line 412)
🔄 [v4.5.0] 確認用MediaStreamを解放（AudioDetectorが再取得） (trainingController.js, line 417)
✅ ボタン発見: ... (trainingController.js, line 437)
```

### 防御層の全体像

| 層 | 対象 | 手法 | 対処可能なケース |
|---|---|---|---|
| **第1層** | 短時間バックグラウンド | visibilitychange + stopDetection/startDetection | 一時的なタブ切替 |
| **第2層** | エラー状態からの復旧 | PitchPro MicrophoneLifecycleManager自動復旧 | 3回試行で復旧可能なケース |
| **第3層** | 最大試行回数到達 | handleAudioError + reset() | エラー状態固定化 |
| **第4層（v4.5.0）** | ブラウザDiscard | initializeTrainingPage() 事前チェック | MediaStream完全消滅 |

### まとめ

v4.5.0のマイク事前チェックにより、以下を実現：

1. **最悪のシナリオを完全回避**: ドレミガイド中のマイク許可ダイアログは絶対に発生しない
2. **SPA化の恩恵を最大活用**: ページ遷移なしでコンテキスト維持
3. **シンプルで確実な実装**: 複雑な状態管理なしで防御
4. **既存の防御層と共存**: 第1-3層の防御はそのまま有効
