#!/bin/bash

# Claude-Gemini Bridge Script
# Claude Plan modeの内容をGeminiで保存・管理

export GEMINI_API_KEY="AIzaSyAtMxDy8DWBZVxvjDfaqxzerL32jdWaroQ"

# ログファイル設定
PLAN_LOG="plans.log"
CLAUDE_PLANS="claude-plans.json"

# JSONファイルが存在しない場合は初期化
if [ ! -f "$CLAUDE_PLANS" ]; then
    cat > "$CLAUDE_PLANS" << 'EOF'
{
  "project": "相対音感トレーニングアプリ",
  "plans": [],
  "last_updated": ""
}
EOF
fi

# 関数: Plan内容をGeminiで解析・保存
save_plan_with_gemini() {
    local plan_content="$1"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Plan保存開始" >> $PLAN_LOG
    
    # Geminiに計画内容を分析させてJSONに追加
    echo "$plan_content" | gemini "
この計画内容を分析して、以下のJSON形式で返してください：
{
  \"id\": \"PLAN-$(date +%Y%m%d-%H%M%S)\",
  \"timestamp\": \"$timestamp\",
  \"title\": \"計画のタイトル（自動生成）\",
  \"category\": \"実装カテゴリ（audio/ui/training/core等）\",
  \"priority\": \"high/medium/low\",
  \"estimated_hours\": \"推定工数（数値）\",
  \"tasks\": [
    \"タスク1\",
    \"タスク2\"
  ],
  \"dependencies\": [\"依存関係\"],
  \"risks\": [\"リスク要因\"],
  \"notes\": \"詳細メモ\",
  \"original_plan\": \"$plan_content\"
}

JSONのみを返してください。説明は不要です。
" > temp_plan.json
    
    # 既存のplans.jsonに新しい計画を追加
    python3 -c "
import json
import sys

# 新しい計画を読み込み
try:
    with open('temp_plan.json', 'r', encoding='utf-8') as f:
        new_plan = json.load(f)
except:
    print('Error: Gemini response parsing failed')
    sys.exit(1)

# 既存データに追加
try:
    with open('$CLAUDE_PLANS', 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    data['plans'].append(new_plan)
    data['last_updated'] = '$timestamp'
    
    with open('$CLAUDE_PLANS', 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    
    print('Plan saved successfully')
except Exception as e:
    print(f'Error: {e}')
    sys.exit(1)
"
    
    # テンポラリファイル削除
    rm -f temp_plan.json
    
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Plan保存完了" >> $PLAN_LOG
}

# 関数: 保存された計画一覧表示
list_plans() {
    echo "🗂️ 保存された計画一覧"
    cat "$CLAUDE_PLANS" | gemini "このJSONファイルから計画一覧を整形して表示。各計画のID、タイトル、カテゴリ、優先度、推定工数を表形式で"
}

# 関数: 計画をタスクに変換
plan_to_tasks() {
    local plan_id="$1"
    echo "📋 計画をタスクに変換: $plan_id"
    cat "$CLAUDE_PLANS" | gemini "ID: $plan_id の計画を、tasks.jsonに追加可能なタスク形式に変換してください"
}

# 関数: 進捗レポート生成
progress_report() {
    echo "📊 Claude Plan進捗レポート"
    cat "$CLAUDE_PLANS" | gemini "
これらの計画の進捗状況を分析し、以下を含むレポートを生成：
1. 完了した計画の数
2. 進行中の計画
3. 未着手の計画
4. 全体の進捗率
5. 次に取り組むべき優先計画
6. リスク評価とボトルネック
"
}

# メイン処理
case "$1" in
    save)
        if [ -z "$2" ]; then
            echo "Usage: $0 save \"<plan_content>\""
            exit 1
        fi
        save_plan_with_gemini "$2"
        ;;
    
    list)
        list_plans
        ;;
    
    convert)
        if [ -z "$2" ]; then
            echo "Usage: $0 convert <plan_id>"
            exit 1
        fi
        plan_to_tasks "$2"
        ;;
    
    report)
        progress_report
        ;;
    
    hook)
        # Claude hookから呼び出される際の処理
        if [ -p /dev/stdin ]; then
            HOOK_DATA=$(cat)
            echo "$HOOK_DATA" | jq -r '.content // .plan // .message' | head -1000 | {
                read PLAN_CONTENT
                if [[ "$PLAN_CONTENT" == *"plan"* ]] || [[ "$PLAN_CONTENT" == *"計画"* ]]; then
                    save_plan_with_gemini "$PLAN_CONTENT"
                    echo "✅ Plan content saved by Gemini"
                fi
            }
        fi
        ;;
    
    *)
        echo "Claude-Gemini Bridge Commands:"
        echo "  save \"<content>\"  - Save plan content"
        echo "  list             - List all saved plans"
        echo "  convert <id>     - Convert plan to tasks"
        echo "  report           - Generate progress report"
        echo "  hook             - Hook integration mode"
        ;;
esac