# visibilitychange時のAudioContext resume問題 - 調査中断メモ

**日付**: 2025-11-25
**ステータス**: 修正実装済み・キャッシュ問題で検証未完了

## 問題の概要

### 報告された症状
1. 準備ページで発声中にホームボタン押下→キャンセル後、音量バーが動かない時がある
2. ノイズがない場所なのに音量バーがいきなり動いている

### 原因分析（ログから特定）
- confirmダイアログ表示時に`Page became hidden`発生
- iOSがAudioContextをsuspend状態にする
- キャンセル後`Page became visible`で復帰
- **しかし** PitchProのMicrophoneLifecycleManagerは「monitoring」再開のみで`AudioContext.resume()`を呼ばない
- AudioContextがsuspendedのまま音量値が低く（1.9%〜4%程度）
- ノイズゲート閾値（5.60%）以下のためBLOCKEDとなり音量バー更新されない

## 実装した修正

### 変更ファイル
- `/PitchPro-SPA/js/navigation-manager.js` (v4.5.0)

### 修正内容
`initVisibilityTracking()`のvisibilitychangeハンドラーに以下を追加：

```javascript
// 【v4.5.0】ページ可視状態復帰時にAudioContextをresumeする（iOS Safari対応）
// PitchProのMicrophoneLifecycleManagerはモニタリング再開のみでAudioContext.resume()を呼ばないため
// confirmダイアログ表示→キャンセル後に音量バーが動かなくなる問題を解決
if (!document.hidden && window.globalAudioDetector) {
    try {
        const audioManager = window.globalAudioDetector.audioManager ||
                            window.globalAudioDetector._audioManager ||
                            window.globalAudioDetector.microphoneController?.audioManager;

        if (audioManager?.audioContext && audioManager.audioContext.state === 'suspended') {
            console.log('🔄 [NavigationManager] AudioContext suspended検出 - resume実行');
            await audioManager.audioContext.resume();
            console.log('✅ [NavigationManager] AudioContext resume完了');
        }
    } catch (e) {
        console.warn('⚠️ [NavigationManager] AudioContext resume失敗:', e);
    }
}
```

### 影響範囲
- 準備ページ・トレーニングページ・音域テストすべてで有効
- NavigationManagerのvisibilitychangeハンドラーはグローバルに1回だけ登録
- `window.globalAudioDetector`は準備ページで設定され、全ページで参照可能

## コミット情報
- **コミットハッシュ**: 3f8ddc3
- **コミットメッセージ**: `fix(navigation): visibilitychange時のAudioContext自動resume機能追加 (v4.5.0)`
- **プッシュ済み**: はい

## キャッシュバスター
- `/PitchPro-SPA/index.html`: `navigation-manager.js?v=1764055387`

## 検証状況
- **GitHub Pages**: 最新コードがデプロイ済み（WebFetchで確認）
- **iPhoneテスト**: キャッシュ問題で修正が反映されない
  - プライベートブラウズモードでも古いキャッシュが残っている
  - 電源再起動でも解消せず
  
## 次回アクション
1. 時間を置いてキャッシュが更新されるのを待つ
2. 別のデバイスでテストする
3. Service Workerのキャッシュをクリアする必要がある可能性

## 仕様書更新
- `NAVIGATION_RELOAD_DETECTION_SPECIFICATION.md` v2.5.0に更新履歴追記済み

## 問題2「ノイズがない場所で音量バーが動く」について
- ログを確認すると`vol:5.8%`でノイズゲート(5.60%)をギリギリ超えている
- `clarity:0.00`なので有効な音声ではないが、音量がノイズゲートを超えているためPASSED
- これは環境ノイズが若干高い、または感度設定の問題の可能性
- 別途調査が必要
