# スクリプト二重読み込み防止機能のバグレポート

**作成日**: 2025-11-22
**対象コミット**: 44b927a5401a121337c8862eaf0bdc40fe071bf9
**対象ブランチ**: `feature/modular-spa-architecture`
**ステータス**: 🔴 重大なバグ - 修正必須

---

## 1. 概要

### 1.1 問題の発見経緯

コミット44b927aで導入された「外部スクリプトの二重読み込み防止」機能に、**初回ナビゲーション時にもスクリプトがスキップされてしまう**という重大なバグが存在することが判明。

### 1.2 症状

- ホームページからpreparationページに遷移しても、preparationページのスクリプトが実行されない
- ページ機能が停止し、ユーザーはトップページ以外に遷移できない
- コンソールに`⏭️ [Router] スクリプト既読み込み済み、スキップ`のログが表示される

---

## 2. 技術的分析

### 2.1 問題のコード

```javascript
// router.js loadPage() 内（v2.11.0修正）
scriptTags.forEach(oldScript => {
    const scriptSrc = oldScript.getAttribute('src');

    if (scriptSrc) {
        const baseSrc = scriptSrc.split('?')[0];

        // 問題: document.scripts には innerHTML で追加直後のスクリプトも含まれる
        const alreadyLoaded = Array.from(document.scripts).some(existingScript => {
            const existingSrc = existingScript.getAttribute('src');
            if (!existingSrc) return false;
            const existingBaseSrc = existingSrc.split('?')[0];
            return existingBaseSrc === baseSrc || existingBaseSrc.endsWith(baseSrc);
        });

        if (alreadyLoaded) {
            console.log(`⏭️ [Router] スクリプト既読み込み済み、スキップ: ${baseSrc}`);
            oldScript.remove();
            return; // ← 初回でもスキップしてしまう！
        }
    }
    // ...
});
```

### 2.2 バグの根本原因

```
【実行フロー】

1. this.appRoot.innerHTML = html
   → テンプレートのスクリプトタグがDOMに追加される
   → document.scripts にも即座に含まれる（ただし未実行）

2. querySelectorAll('script') でスクリプトを取得

3. 各スクリプトに対してチェック:
   「このスクリプトは document.scripts にある?」
   → YES（自分自身が含まれている！）

4. alreadyLoaded = true → スキップ

【結果】
初回ナビゲーションでもスクリプトがスキップされ、ページ機能が停止
```

### 2.3 チェックが区別できないもの

| 種類 | 状態 | 正しい処理 | 現在の処理 |
|------|------|-----------|-----------|
| head スクリプト | 実行済み | スキップ | スキップ ✅ |
| テンプレートスクリプト（再訪問）| 以前実行済み | スキップ | スキップ ✅ |
| **テンプレートスクリプト（初回）** | **未実行** | **実行** | **スキップ ❌** |

---

## 3. 影響範囲

### 3.1 影響を受けるファイル

| ページ | テンプレート内スクリプト | index.html内 | 種別 | 影響度 |
|--------|------------------------|--------------|------|--------|
| **preparation** | `preparation-pitchpro-cycle.js` | ❌ | 通常 | **重大** |
| **training** | `trainingController.js` | ❌ | module | 中程度 |
| premium-analysis | `premium-analysis-*.js` | ✅ | 通常 | なし |
| records | コメントアウト | ✅ | - | なし |
| results-overview | コメントアウト | ✅ | - | なし |
| settings | コメントアウト | ✅ | - | なし |

### 3.2 ES6モジュールの特殊性

`trainingController.js`は`type="module"`で読み込まれるため、ブラウザのモジュールキャッシュ機能により動作する可能性がある。ただし挙動は不確定。

---

## 4. NavigationManagerとの相互作用

### 4.1 シナリオ別分析

| シナリオ | NavigationManager処理 | スクリプト処理 | 結果 |
|----------|----------------------|---------------|------|
| preparation リロード | home へリダイレクト | 実行されない | ✅ |
| training リロード | PitchProに委譲、続行 | スキップ（バグ）| ⚠️ |
| ダイレクトアクセス | リダイレクト | 実行されない | ✅ |
| ブラウザバック | popstate制御 | 実行されない | ✅ |
| **通常遷移（初回）** | 許可 | **スキップ（バグ）** | **❌** |

### 4.2 保護されているシナリオ

NavigationManagerのリダイレクト処理により、以下のシナリオではバグが顕在化しない：
- ページリロード（preparation）
- ダイレクトアクセス
- ブラウザバック

### 4.3 問題が発生するシナリオ

- **通常のSPA遷移（home → preparation → training）**
- **再ナビゲーション（training → preparation）**- ただし初回も壊れているため再ナビゲーションに到達しない

---

## 5. 修正案

### 5.1 推奨案: 実行済みスクリプトを明示的に追跡

```javascript
class SimpleRouter {
    constructor() {
        // 実行済みスクリプトURLを追跡するSet
        this.executedScripts = new Set();
        // ... 既存コード
    }

    async loadPage(page, fullHash = '', signal = null) {
        // ... 既存コード（innerHTML まで）

        const scriptTags = this.appRoot.querySelectorAll('script');
        scriptTags.forEach(oldScript => {
            const scriptSrc = oldScript.getAttribute('src');

            if (scriptSrc) {
                const baseSrc = scriptSrc.split('?')[0];

                // 【修正】実行済みSetでチェック（document.scriptsではなく）
                if (this.executedScripts.has(baseSrc)) {
                    console.log(`⏭️ [Router] スクリプト既実行済み、スキップ: ${baseSrc}`);
                    oldScript.remove();
                    return;
                }

                // 【追加】これから実行するのでSetに追加
                this.executedScripts.add(baseSrc);
                console.log(`📜 [Router] スクリプト実行: ${baseSrc}`);
            }

            // 既存の replaceChild 処理
            const newScript = document.createElement('script');
            Array.from(oldScript.attributes).forEach(attr => {
                newScript.setAttribute(attr.name, attr.value);
            });
            newScript.textContent = oldScript.textContent;
            oldScript.parentNode.replaceChild(newScript, oldScript);
        });
        // ...
    }
}
```

### 5.2 修正の利点

| 項目 | 説明 |
|------|------|
| **正確性** | 「実行した」という事実を追跡するので誤判定なし |
| **シンプル** | クラス内プロパティで完結 |
| **自然なリセット** | ページリロード → インスタンス再作成 → Set リセット |
| **NavigationManager互換** | 独立した仕組みで競合しない |

### 5.3 シナリオ別検証（修正後）

| シナリオ | 期待動作 | 修正後 |
|----------|---------|--------|
| home → preparation（初回）| スクリプト実行 | ✅ |
| preparation → training | スクリプト実行 | ✅ |
| training → preparation（再訪問）| スキップ | ✅ |
| preparation リロード | NavigationManagerでリダイレクト | ✅ |
| training リロード | スクリプト再実行 | ✅ |

---

## 6. 代替案

### 6.1 案B: コミットをrevert

```bash
git revert 44b927a5401a121337c8862eaf0bdc40fe071bf9
```

**利点**: 即座に問題解決
**欠点**: 元の問題（再ナビゲーション時のduplicate variable エラー）が復活

### 6.2 案C: head スクリプトのみチェック

```javascript
const headScripts = document.querySelectorAll('head script[src]');
const headScriptSrcs = new Set(
    Array.from(headScripts).map(s => s.getAttribute('src')?.split('?')[0])
);

if (headScriptSrcs.has(baseSrc)) {
    // head で読み込み済みならスキップ
}
```

**利点**: シンプル
**欠点**: 再ナビゲーション問題を解決しない

---

## 7. 結論

### 7.1 問題の深刻度

🔴 **重大** - アプリケーションの基本機能（ページ遷移）が停止

### 7.2 推奨アクション

1. **即座に**: `feature/modular-spa-architecture`ブランチに修正案5.1を適用
2. **mainへのマージ**: 修正完了後にPR作成
3. **テスト**: 全ナビゲーションシナリオの検証

### 7.3 教訓

- `document.scripts`はリアルタイムでDOMを反映するため、innerHTML直後のチェックには不適
- スクリプト実行状態の追跡は明示的なデータ構造で行うべき
- SPAでのスクリプト管理は複雑なため、十分なテストが必要

---

## 8. 関連ドキュメント

- `SPA_DEVELOPMENT_JOURNEY_AND_ARCHITECTURE.md` - SPAアーキテクチャ全体
- `NAVIGATION_HANDLING_SPECIFICATION.md` - ナビゲーション管理仕様
- `ROUTER_PAGE_INITIALIZATION_GUIDE.md` - Router初期化ガイド

---

**レポート作成**: Claude Code
**レビュー日**: 2025-11-22
