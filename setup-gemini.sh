#!/bin/bash

# Gemini Task Management Setup Script

echo "🤖 Geminiタスク管理システムのセットアップ"

# 1. GitHooksの設定（コミット時にタスクログを記録）
mkdir -p .git/hooks

cat > .git/hooks/post-commit << 'EOF'
#!/bin/bash
# Geminiタスク管理: コミット時の自動ログ
COMMIT_MSG=$(git log -1 --pretty=%B)
./gemini-tasks.sh log "コミット: $COMMIT_MSG"
EOF

chmod +x .git/hooks/post-commit

# 2. VS Codeタスク設定
mkdir -p .vscode

cat > .vscode/tasks.json << 'EOF'
{
    "version": "2.0.0",
    "tasks": [
        {
            "label": "Gemini: Today's Tasks",
            "type": "shell",
            "command": "./gemini-tasks.sh",
            "args": ["today"],
            "group": "build",
            "presentation": {
                "echo": true,
                "reveal": "always",
                "panel": "new"
            }
        },
        {
            "label": "Gemini: Progress Report",
            "type": "shell",
            "command": "./gemini-tasks.sh",
            "args": ["progress"],
            "group": "test"
        },
        {
            "label": "Gemini: Weekly Report",
            "type": "shell",
            "command": "./gemini-tasks.sh",
            "args": ["report"],
            "group": "test"
        }
    ]
}
EOF

# 3. エイリアス追加（既存の.zshrcに追加）
cat >> ~/.zshrc << 'EOF'

# Gemini Task Management Aliases
alias gt="./gemini-tasks.sh"
alias gtl="./gemini-tasks.sh list"
alias gtt="./gemini-tasks.sh today"
alias gtp="./gemini-tasks.sh progress"
alias gtr="./gemini-tasks.sh report"
EOF

echo "✅ セットアップ完了！"
echo ""
echo "使用方法:"
echo "  gt today     - 今日のタスク"
echo "  gt list      - 全タスク一覧"
echo "  gt progress  - 進捗確認"
echo "  gt plan 7    - 7日間計画"
echo ""
echo "VS Codeでは Ctrl+Shift+P → 'Tasks: Run Task' から利用可能"