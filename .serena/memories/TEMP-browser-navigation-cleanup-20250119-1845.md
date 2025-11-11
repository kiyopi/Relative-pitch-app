
# ブラウザナビゲーション・クリーンアップ処理タスク

**作成日時**: 2025年1月19日 18:45  
**ステータス**: 未実装・要検討  
**優先度**: 中（準備ページ最終確認後に実装）

## 📋 検討が必要な項目

### **1. 音域データ有効期限**
**決定**: なし（シンプル実装）
- 音域は急激に変わらない
- 再測定はユーザー判断に委ねる

### **2. pagehide クリーンアップ処理**
**決定**: pagehide で実装
- 対象ファイル: `preparation-pitchpro-cycle.js`
- 処理内容: AudioDetector の stopDetection() + destroy()
- 発火タイミング: ブラウザバック・進む・遷移・タブ閉じる・ブラウザ閉じる・**リロード**

### **3. トレーニングページからのブラウザバック**
**要検討**: より細かい分析が必要
- トレーニング開始ページ（training.html 初期表示）
- トレーニング中（セッション進行中）
- それぞれのブラウザバック動作を定義

### **4. リロードボタン処理**
**要検討**: F5・Ctrl+R・ブラウザリロードボタン
- 音域テスト中のリロード → データ消失の扱い
- トレーニング中のリロード → セッションデータ保存？破棄？
- 準備ページのリロード → Step1からやり直し？状態保持？

## 🎯 実装すべきコード（準備ページ）

```javascript
// preparation-pitchpro-cycle.js に追加
window.addEventListener('pagehide', async () => {
    console.log('🧹 ページ離脱検出 - クリーンアップ開始');
    
    if (audioDetector) {
        try {
            await audioDetector.stopDetection();
            await audioDetector.destroy();
            console.log('✅ AudioDetector クリーンアップ完了');
        } catch (error) {
            console.error('❌ クリーンアップエラー:', error);
        }
    }
});
```

## 📊 詳細シナリオ分析

### **シナリオC: 音域テスト中にブラウザバック**
- 現状: PitchPro継続・メモリリーク
- 対策: pagehide でクリーンアップ実装（必須）

### **シナリオD: トレーニング開始後にブラウザバック**
- 要検討: training.html の状態を細分化
  - 状態A: トレーニング開始画面（セッション未開始）
  - 状態B: トレーニング中（セッション進行中）
  - 状態C: セッション終了後
- ブラウザバック時の期待動作を定義

### **シナリオE: リロード（F5・Ctrl+R）**
- pagehide 発火 → クリーンアップ実行
- ページ再読み込み → localStorage から状態復元？
- 要検討:
  - 音域テスト中リロード → Step1やり直し？Step3から再開？
  - トレーニング中リロード → セッションデータ保存？破棄？

## 🔄 次のアクションアイテム

### **Phase 1: 準備ページクリーンアップ（優先度: 高）**
- [ ] preparation-pitchpro-cycle.js に pagehide リスナー追加
- [ ] voice-range-test.js に pagehide リスナー追加（必要に応じて）
- [ ] テスト: ブラウザバック・タブ閉じる・リロードで動作確認

### **Phase 2: トレーニングページ分析（優先度: 中）**
- [ ] training.html の状態遷移を詳細分析
- [ ] 各状態でのブラウザバック動作を定義
- [ ] リロード時のセッションデータ扱いを決定

### **Phase 3: リロード処理実装（優先度: 中）**
- [ ] 各ページでのリロード動作を定義
- [ ] localStorage による状態復元の要否を判断
- [ ] 実装・テスト

## 📝 重要な設計判断

### **pagehide の特性**
- ブラウザバック・進む・遷移・タブ閉じる・ブラウザ閉じる・リロード、すべてで発火
- 非同期処理（async/await）可能
- ユーザー操作を妨げない（確認ダイアログなし）

### **CLAUDE.md 準拠**
- フックなし設計の原則に従う
- シンプルな実装を優先
- ユーザー体験を損なわない

## 🔗 関連ファイル

- `/pages/js/preparation-pitchpro-cycle.js` - 準備ページメインスクリプト
- `/pages/js/voice-range-test.js` - 音域テスト機能
- `/js/core/pitchpro-v1.3.1.umd.js` - PitchPro音声処理ライブラリ
- `/js/data-manager.js` - localStorage 管理
- `/pages/training.html` - トレーニングページ（要分析）

## ⏰ 実装タイミング

**準備ページ最終確認完了後に実装**
