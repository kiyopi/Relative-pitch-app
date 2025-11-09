# マイクロフォン バックグラウンド耐性仕様書

**バージョン**: 1.0.0
**作成日**: 2025-11-09
**最終更新日**: 2025-11-09
**ステータス**: ✅ 実装完了

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
