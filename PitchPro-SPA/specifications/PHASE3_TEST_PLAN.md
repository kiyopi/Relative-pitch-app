# Phase 3: 統一ページ初期化システム動作テスト計画

**作成日**: 2025-11-17
**バージョン**: 1.0.0
**対象ブランチ**: refactor/unified-page-initialization

## 📋 テスト概要

Phase 1-2で実装した統一ページ初期化システムの動作を検証します。

### 実装済み機能
- Router.js統一初期化システム (pageConfigs設定レジストリ)
- 依存関係待機システム (Chart.js, DistributionChart, PitchPro)
- 二重初期化防止機能 (results-overview)
- 全8ページのSPA対応統合

## 🎯 テスト目標

### 1. 全ページ正常動作確認
- SPA遷移での初期化が正しく実行される
- リロード・ダイレクトアクセスでも正しく動作する
- エラーが発生しない

### 2. 依存関係管理検証
- Chart.js/DistributionChart/PitchPro読み込み待機が機能する
- タイムアウト処理が適切に動作する
- エラーメッセージが適切に表示される

### 3. 二重初期化防止検証
- results-overviewページで二重初期化が発生しない
- preventDoubleInitフラグが正しく機能する
- ページ離脱時のフラグリセットが動作する

## 📝 テスト項目一覧

### テスト1: SPA遷移テスト (8ページ)

| # | ページ | 遷移元 | 確認項目 | 期待結果 | 実施 | 結果 |
|---|---|---|---|---|---|---|
| 1.1 | home | - | 初回読み込み | setupHomeEvents()実行、ボタンイベント設定 | ☐ | |
| 1.2 | preparation | home | PitchPro待機 | initializePreparationPitchProCycle()実行 | ☐ | |
| 1.3 | training | preparation | PitchPro待機 | initializeTrainingPage()実行 | ☐ | |
| 1.4 | result-session | training | 初期化実行 | initializeResultSessionPage()実行 | ☐ | |
| 1.5 | results-overview | result-session | Chart.js待機 | initResultsOverview()実行、グラフ表示 | ☐ | |
| 1.6 | records | home | Chart.js待機 | initRecords()実行、統計表示 | ☐ | |
| 1.7 | premium-analysis | home | Chart.js待機 | initPremiumAnalysis()実行、分析表示 | ☐ | |
| 1.8 | settings | home | 初期化実行 | initSettings()実行、デバイス情報表示 | ☐ | |

### テスト2: リロード・ダイレクトアクセステスト

| # | ページ | 操作 | 確認項目 | 期待結果 | 実施 | 結果 |
|---|---|---|---|---|---|---|
| 2.1 | home | F5リロード | 初期化実行 | 正常動作 | ☐ | |
| 2.2 | results-overview | F5リロード | Chart.js待機→初期化 | グラフ正常表示 | ☐ | |
| 2.3 | records | F5リロード | Chart.js待機→初期化 | 統計正常表示 | ☐ | |
| 2.4 | settings | F5リロード | 初期化実行 | デバイス情報正常表示 | ☐ | |
| 2.5 | home | URL直接入力 | 初期化実行 | 正常動作 | ☐ | |
| 2.6 | results-overview | URL直接入力 | Chart.js待機→初期化 | グラフ正常表示 | ☐ | |
| 2.7 | records | URL直接入力 | Chart.js待機→初期化 | 統計正常表示 | ☐ | |
| 2.8 | settings | URL直接入力 | 初期化実行 | デバイス情報正常表示 | ☐ | |

### テスト3: 依存関係待機機能テスト

| # | テストケース | 操作 | 確認項目 | 期待結果 | 実施 | 結果 |
|---|---|---|---|---|---|---|
| 3.1 | Chart.js正常読み込み | results-overview遷移 | コンソールログ確認 | "✅ [Router] Dependency ready: Chart" | ☐ | |
| 3.2 | DistributionChart待機 | results-overview遷移 | コンソールログ確認 | "✅ [Router] Dependency ready: DistributionChart" | ☐ | |
| 3.3 | PitchPro待機 | preparation遷移 | コンソールログ確認 | "✅ [Router] Dependency ready: PitchPro" | ☐ | |
| 3.4 | 依存関係なしページ | settings遷移 | 即座初期化 | 待機なしで初期化実行 | ☐ | |

### テスト4: 二重初期化防止テスト

| # | テストケース | 操作 | 確認項目 | 期待結果 | 実施 | 結果 |
|---|---|---|---|---|---|---|
| 4.1 | results-overview初回 | 初回遷移 | コンソールログ確認 | "🎯 [Router] Initializing page..." | ☐ | |
| 4.2 | results-overview 2回目 | 他ページ→戻る | コンソールログ確認 | "✅ [Router] Page ... already initialized, skipping" | ☐ | |
| 4.3 | フラグリセット確認 | 離脱→再訪問 | 初期化フラグ確認 | "🔄 [Router] Reset initialization flag" | ☐ | |
| 4.4 | 他ページ影響なし | records遷移 | 毎回初期化実行 | preventDoubleInitなしで毎回初期化 | ☐ | |

### テスト5: エラーハンドリングテスト

| # | テストケース | 操作 | 確認項目 | 期待結果 | 実施 | 結果 |
|---|---|---|---|---|---|---|
| 5.1 | 初期化関数なしエラー | pageConfig不正設定 | コンソールエラー確認 | "❌ [Router] Init function ... not found" | ☐ | |
| 5.2 | 依存関係タイムアウト | Chart.js読み込み失敗 | エラーUI表示 | "ページの読み込みに失敗しました" | ☐ | |
| 5.3 | 設定なしページ | 未定義ページ遷移 | コンソール警告確認 | "⚠️ [Router] No config found for page" | ☐ | |

## 🔍 テスト手順

### 準備
1. ローカルサーバー起動
2. ブラウザ開発者ツールを開く（Console, Network, Application タブ）
3. キャッシュクリア実行

### 実施方法

#### テスト1: SPA遷移テスト
```
1. ホームページを開く
2. 各ページへのナビゲーションボタンをクリック
3. Consoleでログメッセージを確認
4. ページコンテンツが正しく表示されることを確認
5. Lucideアイコンが正しく表示されることを確認
```

#### テスト2: リロード・ダイレクトアクセステスト
```
1. 対象ページに遷移
2. F5キーでリロード
3. Consoleでログメッセージを確認
4. ページコンテンツが正しく表示されることを確認

5. 新しいタブを開く
6. URLバーに直接URLを入力（例: http://localhost:8080/#results-overview）
7. Consoleでログメッセージを確認
8. ページコンテンツが正しく表示されることを確認
```

#### テスト3: 依存関係待機機能テスト
```
1. Networkタブを開く
2. 対象ページに遷移
3. Chart.js, DistributionChart.js の読み込みを確認
4. Consoleで依存関係待機ログを確認
5. タイムスタンプで待機時間を確認（5秒以内）
```

#### テスト4: 二重初期化防止テスト
```
1. results-overviewページに遷移
2. Consoleで "🎯 [Router] Initializing page..." を確認
3. homeページに戻る
4. 再度results-overviewページに遷移
5. Consoleで "✅ [Router] Page ... already initialized, skipping" を確認
6. 他ページに遷移
7. Consoleで "🔄 [Router] Reset initialization flag" を確認
8. 再度results-overviewページに遷移
9. 再初期化されることを確認
```

#### テスト5: エラーハンドリングテスト
```
1. Chrome DevToolsでChart.jsをブロック（Network → Block request URL）
2. results-overviewページに遷移
3. Consoleでタイムアウトエラーを確認
4. エラーUIが表示されることを確認
5. ブロックを解除して再読み込みボタンをクリック
6. 正常に読み込まれることを確認
```

## 📊 合格基準

### 必須項目（すべて合格必要）
- ✅ テスト1: 全8ページが正常動作（8/8）
- ✅ テスト2: リロード・ダイレクトアクセス正常動作（8/8）
- ✅ テスト3: 依存関係待機機能正常動作（4/4）
- ✅ テスト4: 二重初期化防止機能正常動作（4/4）

### 推奨項目（80%以上合格推奨）
- ✅ テスト5: エラーハンドリング正常動作（2/3以上）

## 📝 テスト結果記録テンプレート

### テスト実施情報
- **実施日時**: YYYY-MM-DD HH:MM
- **実施者**:
- **ブラウザ**: Chrome/Safari/Firefox バージョン
- **OS**: macOS/Windows/iOS バージョン
- **コミットハッシュ**:

### テスト結果サマリー
- テスト1: ✅/❌ (X/8項目合格)
- テスト2: ✅/❌ (X/8項目合格)
- テスト3: ✅/❌ (X/4項目合格)
- テスト4: ✅/❌ (X/4項目合格)
- テスト5: ✅/❌ (X/3項目合格)

### 発見された問題
1. **問題タイトル**
   - **重要度**: 高/中/低
   - **現象**:
   - **再現手順**:
   - **期待動作**:
   - **実際の動作**:
   - **コンソールログ**:

### 次のアクション
- [ ] Phase 4に進む
- [ ] 問題修正が必要
- [ ] 追加テストが必要

## 🚀 Phase 4への移行条件

以下の条件をすべて満たした場合、Phase 4に移行:
1. テスト1-4の必須項目がすべて合格
2. 重大なバグが0件
3. 軽微なバグは Issue 登録済み

---

**参照ドキュメント**:
- `SPA_INITIALIZATION_COMPREHENSIVE_SOLUTION.md` - 実装仕様
- `SPA_INITIALIZATION_ANALYSIS_REPORT.md` - 問題分析
- `router.js` - 実装コード
