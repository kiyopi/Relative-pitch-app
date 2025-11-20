# PitchPro通知システムとアプリ側エラー処理の二重管理問題

**作成日**: 2025-11-20 16:30  
**状態**: 未解決・検討中

## 問題の概要

バックグラウンド放置後のSafariリロード時に、PitchProのErrorNotificationSystemとアプリ側のalert()が二重管理になっており、PitchProの「マイク許可が放棄されました」メッセージが表示されない。

## 背景

### Safariのバックグラウンド動作
- バックグラウンド約5分でSafariが積極的にタブをサスペンド
- デスクトップ切り替えでさらに積極化
- ページリロードが発生し、すべての状態（MediaStream含む）が失われる

### PitchProの仕様
- `MicrophoneLifecycleManager`: 10分後に自動リリース設定（`maxIdleTimeBeforeRelease: 600000`）
- `ErrorNotificationSystem`: マイクエラー時に通知を表示する機能を内蔵
- `MicrophoneController`: 初期化エラー時に`showMicrophoneError()`を自動呼び出し（MicrophoneController.ts lines 950-951）

## 現在の実装（Preventiveアプローチ）

```javascript
// navigation-manager.js checkPageAccess()
if (config?.preventReload && this.detectReload(page)) {
    if (config.reloadMessage) {
        alert(config.reloadMessage);  // ← アプリ側のalert()
    }
    
    await this.redirectToPreparation('リロード検出');
    return { shouldContinue: false, reason: 'reload' };
}
```

**フロー**:
```
バックグラウンド放置 → Safariリロード
  ↓
NavigationManager.detectReload() = true
  ↓
alert("トレーニングページは準備ページから...") ← アプリ側
  ↓
preparationページへリダイレクト
  ↓
[PitchProは初期化されず、エラーメッセージなし]
```

## ユーザーが期待する動作（Reactiveアプローチ）

```
バックグラウンド放置 → Safariリロード
  ↓
trainingページ初期化続行
  ↓
基音再生ボタンクリック
  ↓
PitchPro初期化 → マイク許可が失われている
  ↓
ErrorNotificationSystem.showMicrophoneError() ← PitchPro側
  ↓
マイク許可ダイアログ表示
  ↓
ユーザーが許可 → トレーニング継続
```

## 問題点

### 1. PitchProの通知システムが無効化されている可能性

**調査結果**:
- `PitchProConfig.getDefaultConfig()` に `notifications` 設定が含まれていない
- `MicrophoneController` のデフォルト: `notifications.enabled: true`
- しかし、AudioDetectionComponentの設定で上書きされている可能性

### 2. アプリ側とPitchPro側の責任分担が不明確

| システム | 担当 | 実装状況 |
|---|---|---|
| **リロード検出** | NavigationManager | ✅ 実装済み（2フラグシステム） |
| **エラー通知** | アプリ側alert() | ✅ 実装済み |
| **マイクエラー** | PitchPro ErrorNotificationSystem | ❌ 無効化されている？ |

## 解決策の検討

### Option A: PitchProの通知を有効化 + リダイレクトを削除

**実装**:
```javascript
// pitchpro-config.js に追加
notifications: {
    enabled: true,
    position: 'top-right',
    theme: 'dark'
}

// navigation-manager.js checkPageAccess() 修正
if (config?.preventReload && this.detectReload(page)) {
    // alert()削除、リダイレクト削除
    // sessionStorage.removeItem('trainingPageActive') のみ実行
    // shouldContinue: true を返す
}
```

**メリット**:
- PitchProのUIを活用できる
- 自然なエラーハンドリング
- マイク許可ダイアログが適切なタイミングで表示される

**デメリット**:
- 準備ページをスキップすることになる
- セキュリティリスク（マイク許可が必須のページに直接アクセス）

### Option B: リダイレクト先でPitchProのエラーメッセージを表示

**実装**:
- 現在のリダイレクトは維持
- preparationページでPitchProを初期化
- マイク許可がない場合はPitchProがエラーメッセージを表示

**メリット**:
- 安全性（準備ページ経由を維持）
- PitchProのUIを活用
- 段階的な復旧フロー

**デメリット**:
- preparationページの実装が複雑化

### Option C: ハイブリッドアプローチ

**実装**:
- リロード検出時はalert()削除
- preparationページへリダイレクト
- URLパラメータで「リロードから復帰」フラグを渡す
- preparationページで特別な復旧UIを表示

## フラグ動作の検証結果

**質問**: PitchProに任せた場合、リロードは毎回検出できるか？

**回答**: ✅ 問題なく動作する

```
1回目: リロード
  ↓
detectReload() = true（trainingPageActiveフラグ検出）
  ↓
sessionStorage.removeItem('trainingPageActive') ← 削除
  ↓
shouldContinue: true（リダイレクトしない）
  ↓
sessionStorage.setItem('trainingPageActive', 'true') ← 再設定

2回目: リロード
  ↓
detectReload() = true（前回再設定したフラグを検出）← 正常動作
  ↓
以下同じフロー
```

**結論**: フラグは毎回削除→再設定されるため、リロード検出は正常に動作し続ける。

## 次のアクション

1. **PitchProConfig.jsでnotifications設定を確認・有効化**
2. **どのアプローチを採用するか決定**
   - Option A: PitchProに完全に任せる
   - Option B: preparationページでPitchProのエラー表示
   - Option C: ハイブリッド
3. **実装とテスト**

## 関連ファイル

- `/PitchPro-SPA/js/navigation-manager.js` (v4.3.5): リロード検出・リダイレクト
- `/PitchPro-SPA/js/core/pitchpro-config.js`: PitchPro統一設定
- `/Users/isao/Documents/pitchpro-audio-processing/src/core/ErrorNotificationSystem.ts`: PitchPro通知システム
- `/Users/isao/Documents/pitchpro-audio-processing/src/core/MicrophoneController.ts`: マイクエラーハンドリング

## 技術的詳細

### PitchProのErrorNotificationSystem

**機能**:
- 右上に通知カードを表示（z-index: 10000）
- 自動消去または手動クローズ
- エラー種別: error, warning, success, info
- 優先度管理: high, medium, low

**showMicrophoneError()の実装** (ErrorNotificationSystem.ts lines 406-424):
```typescript
showMicrophoneError(error: Error, context?: string): string {
    return this.showError(
        'マイクロフォンエラー',
        `マイクの初期化に失敗しました: ${error.message}`,
        {
            details: context ? [`発生箇所: ${context}`, `エラー詳細: ${error.name}`] : [`エラー詳細: ${error.name}`],
            solution: 'マイクの設定を確認し、ブラウザにマイクアクセスを許可してください。',
            priority: 'high'
        }
    );
}
```

### MicrophoneControllerのエラーハンドリング

**handleError()の実装** (MicrophoneController.ts lines 941-959):
```typescript
private handleError(error: Error, context: string): void {
    // ...
    if (this.errorSystem) {
        if (context === 'initialization' || context === 'lifecycle') {
            this.errorSystem.showMicrophoneError(error, context);  // ← ここで通知表示
        } else {
            this.errorSystem.showError(
                'マイクエラー',
                `${context}でエラーが発生しました: ${error.message}`,
                { priority: 'medium' }
            );
        }
    }
    // ...
}
```

## 疑問点

1. なぜPitchProのエラーメッセージが表示されていないのか？
   - notifications設定が無効化されている？
   - リダイレクトが早すぎてエラーが発生する前に遷移している？
   
2. どのアプローチがユーザー体験として最適か？
   - Preventive（事前に防ぐ）vs Reactive（エラーを見せる）

3. セキュリティと利便性のバランスは？
   - 準備ページスキップのリスク vs ユーザービリティ
