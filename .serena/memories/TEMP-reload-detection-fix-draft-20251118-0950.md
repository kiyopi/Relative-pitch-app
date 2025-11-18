# リロード検出不具合の修正案（ドラフト）

**作成日**: 2025-11-18 09:50
**ステータス**: 精査前ドラフト（実装保留）

## 発見された問題

### 問題1: フラグライフサイクルの設計ミス

router.js loadPage()で初期化成功時にフラグ削除：
```javascript
// Line 318-321
if (config?.preventReload) {
    sessionStorage.removeItem(page + 'PageActive');
    console.log(`✅ [Router] ${page}PageActiveフラグを削除（初期化成功）`);
}
```

**結果**: 初期化成功後にリロードすると、フラグが存在しないためリロード検出できない

### 問題2: detectReload()のステップ順序

現在の順序（navigation-manager.js Line 138-174）:
- Step 3: ページアクティブフラグチェック（Line 138-155）
- Step 4: visibilitychangeチェック（Line 157-174）

**問題**: Step 4で`return false`が先に実行され、Step 3に到達しない

ログ証拠（log2.txt Line 47-49）:
```
Line 47: 最後のvisibilitychangeからの経過時間: 1763426809911ms
Line 48: ✅ visibilitychange未記録
Line 49: ✅ ページ可視状態確認 - バックグラウンドからの復帰
→ Step 4でreturn false、Step 3のログが一切出ない
```

## 提案修正（精査前）

### 修正1: router.jsフラグ削除を削除
- Line 317-321: 初期化成功時のフラグ削除を削除
- Line 329-333: エラー時のフラグ削除を削除

**理由**: フラグは次回detectReload()で削除されるべき

### 修正2: detectReload()のステップ順序変更
Step 3（ページアクティブフラグ）をStep 4（visibilitychange）より優先

### 修正3: REDIRECT_COMPLETEDフラグ追加
redirectTo()とredirectToPreparation()にフラグ設定追加（無限ループ防止）

## 重要な留意事項（ユーザー指摘）

**「完全なSPA化は無理だと判断したはず」**

二重DOMロード問題のリファクタリング時に、完全なSPA化を断念する設計判断があった。
この設計判断を理解せずに修正を進めると、別の問題を引き起こす可能性がある。

## 次のステップ

1. Serenaメモリから昨日のリファクタリング経緯を確認
2. 二重DOMロード問題と完全SPA化断念の経緯を理解
3. その設計判断を踏まえて修正案を再精査
4. 実装可否を判断
