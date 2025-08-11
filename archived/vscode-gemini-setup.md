# VSCode Gemini CLI Chat セットアップガイド

## 📋 設定完了内容

### 1. **環境変数の自動設定**
VSCodeのターミナルが起動時に自動的にGemini環境変数を設定します。

### 2. **タスク設定**
以下のタスクが利用可能：
- **Gemini Chat**: インタラクティブチャット起動
- **Gemini: 相対音感アプリ質問**: プロジェクト固有の質問
- **Gemini: コードレビュー**: 開いているファイルのレビュー

### 3. **キーボードショートカット**
- `Cmd+Shift+G`: Gemini Chat起動
- `Cmd+Shift+Q`: 質問入力ダイアログ
- `Cmd+Shift+R`: 現在のファイルをレビュー

---

## 🚀 使い方

### 方法1: コマンドパレット
1. `Cmd+Shift+P` でコマンドパレット開く
2. `Tasks: Run Task` を選択
3. `Gemini Chat` を選択

### 方法2: ターミナル直接実行
```bash
source .env
gemini
```

### 方法3: キーボードショートカット
- `Cmd+Shift+G` を押すだけ

---

## 🛠️ カスタマイズ

### 拡張機能の推奨
```json
{
  "recommendations": [
    "ms-vscode.live-server",
    "esbenp.prettier-vscode"
  ]
}
```

### スニペット作成例
`.vscode/snippets.code-snippets`
```json
{
  "Gemini Query": {
    "prefix": "gemini",
    "body": [
      "gemini -p \"$1\""
    ],
    "description": "Gemini CLIクエリ"
  }
}
```

---

## 🔧 トラブルシューティング

### 環境変数が設定されない場合
1. VSCodeを完全に再起動
2. ターミナルで手動実行:
   ```bash
   source .env
   ```

### 認証エラーの場合
```bash
gcloud auth application-default login
```

---

## 📝 プロジェクト専用コマンド例

```bash
# アプリ仕様について質問
gemini -p "相対音感トレーニングアプリの統合進行ガイドシステムについて説明して"

# コードレビュー
cat index-mantine.html | gemini -p "このMantineベースのコードをレビューして"

# 実装提案
gemini -p "セッション評価システムの実装方法を提案して"
```