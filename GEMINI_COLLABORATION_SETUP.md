# Gemini共同作業統合ドキュメント

このドキュメントは相対音感トレーニングアプリ開発におけるGeminiとの効率的な共同作業環境の設定方法を説明します。

## 📋 目次

1. [初期セットアップ](#初期セットアップ)
2. [タスク管理システム](#タスク管理システム)
3. [Claude-Gemini連携](#claude-gemini連携)
4. [VSCode統合](#vscode統合)
5. [日常のワークフロー](#日常のワークフロー)
6. [コマンドリファレンス](#コマンドリファレンス)

---

## 🚀 初期セットアップ

### 1. Gemini CLI設定

APIキーの設定（既に完了）：
```bash
export GEMINI_API_KEY="AIzaSyAtMxDy8DWBZVxvjDfaqxzerL32jdWaroQ"
```

### 2. プロジェクト統合スクリプトの実行
```bash
chmod +x setup-gemini.sh
./setup-gemini.sh
```

### 3. 環境の確認
```bash
# Gemini CLIテスト
echo "Hello Gemini" | gemini

# タスク管理システムの確認
gt list
```

---

## 📋 タスク管理システム

### 基本コマンド（`gt`エイリアス使用）

```bash
# 今日のタスク確認
gt today

# 全タスク一覧
gt list

# プロジェクト進捗
gt progress

# 新しいタスク追加
gt add "音声処理のテスト実装"

# タスク状態更新
gt update TASK-001 in_progress

# 週次レポート生成
gt report
```

### ファイル構成
- `tasks.json` - タスクデータベース
- `tasks.log` - 作業ログ
- `gemini-tasks.sh` - メインスクリプト

---

## 🔗 Claude-Gemini連携

### Plan Mode自動保存

Claude Code Plan modeで「Yes」選択時、自動的にGeminiが計画を保存・構造化

#### 設定ファイル
- `.claude/settings.json` - フック設定
- `claude-gemini-bridge.sh` - 連携スクリプト
- `plan-watcher.sh` - 監視システム

#### 使用方法
```bash
# 手動でPlan内容を保存
./plan-watcher.sh manual

# 保存済み計画の確認
./claude-gemini-bridge.sh list

# 計画をタスクに変換
./claude-gemini-bridge.sh convert PLAN-20250109-123456

# 進捗レポート
./claude-gemini-bridge.sh report
```

---

## 🔧 VSCode統合

### 推奨拡張機能
1. **Gemini Code Assist** (Google公式)
   - インストール：VSCode Marketplace
   - 設定：`Ctrl+Shift+P` → "Gemini: Set API Key"
   - 使用：`Alt+G`でチャットパネル

### VSCodeタスク統合

`Ctrl+Shift+P` → "Tasks: Run Task" で以下が利用可能：

- **Gemini: Today's Tasks** - 今日のタスク表示
- **Gemini: Progress Report** - 進捗レポート
- **Gemini: Weekly Report** - 週次レポート

---

## 🔄 日常のワークフロー

### 1. 朝のスタートアップ
```bash
# 今日のタスク確認
gt today

# プロジェクト全体進捗
gt progress

# 優先タスクの確認
gt plan 1
```

### 2. コード作業中
```bash
# コードレビュー
gmr src/audio.ts

# コード説明
gme src/pitch-detector.ts

# 音声処理特化レビュー
./gemini-helper.sh audio src/web-audio.ts

# テスト生成
gmt src/training-mode.ts
```

### 3. 作業ログの記録
```bash
# 作業ログ記録
gt log "Web Audio API統合完了"

# コミット時は自動でログ記録される（Git Hook設定済み）
```

### 4. 週次レビュー
```bash
# 週次進捗レポート
gt report

# Claude Planの進捗確認
./claude-gemini-bridge.sh report
```

---

## 📚 コマンドリファレンス

### タスク管理 (`gt`)
| コマンド | 説明 |
|----------|------|
| `gt list` | 全タスク一覧 |
| `gt today` | 今日のタスク |
| `gt progress` | 進捗サマリー |
| `gt add <説明>` | 新規タスク追加 |
| `gt update <ID> <状態>` | タスク更新 |
| `gt plan [日数]` | 実行計画作成 |
| `gt report` | 週次レポート |

### コード支援 (エイリアス)
| コマンド | 説明 |
|----------|------|
| `gm` | Gemini CLI短縮 |
| `gmr <file>` | コードレビュー |
| `gme <file>` | コード説明 |
| `gmd <file>` | ドキュメント生成 |
| `gmt <file>` | テスト生成 |
| `gmf <file>` | バグ修正提案 |
| `gmask <file> <質問>` | カスタム質問 |

### プロジェクト専用 (`./gemini-helper.sh`)
| コマンド | 説明 |
|----------|------|
| `review <file>` | プロジェクト文脈でのレビュー |
| `audio <file>` | 音声処理特化レビュー |
| `ui <file>` | UI/UX改善提案 |
| `spec <質問>` | 仕様書について質問 |
| `ask <質問>` | 自由質問 |

### Claude連携 (`./claude-gemini-bridge.sh`)
| コマンド | 説明 |
|----------|------|
| `save "<内容>"` | 計画内容保存 |
| `list` | 保存済み計画一覧 |
| `convert <ID>` | 計画のタスク変換 |
| `report` | 計画進捗レポート |

### 監視システム (`./plan-watcher.sh`)
| コマンド | 説明 |
|----------|------|
| `watch` | バックグラウンド監視開始 |
| `stop` | 監視停止 |
| `manual` | 手動計画保存 |
| `latest` | 最新計画表示 |

---

## 🔧 トラブルシューティング

### よくある問題

1. **APIキーエラー**
   ```bash
   export GEMINI_API_KEY="AIzaSyAtMxDy8DWBZVxvjDfaqxzerL32jdWaroQ"
   ```

2. **スクリプト実行権限**
   ```bash
   chmod +x *.sh
   ```

3. **エイリアス未反映**
   ```bash
   source ~/.zshrc
   ```

4. **JSON解析エラー**
   - `python3`がインストールされていることを確認
   - `jq`コマンドが利用可能か確認

### ログファイル
- `plans.log` - Plan保存ログ
- `tasks.log` - タスク管理ログ
- `plan-watcher.log` - 監視システムログ

---

## ✅ セットアップ確認チェックリスト

- [ ] Gemini CLI が動作する
- [ ] `gt` コマンドでタスク管理が可能
- [ ] `gm*` エイリアスが使用可能
- [ ] `./gemini-helper.sh` が実行可能
- [ ] Claude Plan mode連携が動作
- [ ] VSCodeタスク統合が利用可能

---

このドキュメントにより、Geminiとの効率的な共同作業環境が整います。定期的にコマンドを使用して、プロジェクト進行を最適化してください。