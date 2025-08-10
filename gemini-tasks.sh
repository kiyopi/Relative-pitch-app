#!/bin/bash

# Gemini Task Management System
# 使用法: ./gemini-tasks.sh [command] [args]

source .env.gemini

TASKS_FILE="tasks.json"
TASKS_LOG="tasks.log"

# カラー出力用
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

case "$1" in
    list)
        echo -e "${BLUE}=== 現在のタスク一覧 ===${NC}"
        cat $TASKS_FILE | gemini "このJSONからタスク一覧を整形して表示。各タスクのID、タイトル、ステータス、優先度、期限を表形式で"
        ;;
    
    today)
        echo -e "${GREEN}=== 今日のタスク ===${NC}"
        cat $TASKS_FILE | gemini "今日取り組むべきタスクを優先度順に提案。期限が近いものと高優先度のものを考慮"
        ;;
    
    add)
        shift
        TASK_DESC="$*"
        echo -e "${YELLOW}新しいタスクを追加: $TASK_DESC${NC}"
        cat $TASKS_FILE | gemini "次のタスクをJSONに追加: '$TASK_DESC'. 適切なID、カテゴリ、優先度を自動設定してJSON全体を出力" > temp_tasks.json
        mv temp_tasks.json $TASKS_FILE
        echo "タスクを追加しました"
        ;;
    
    update)
        TASK_ID="$2"
        NEW_STATUS="$3"
        echo -e "${YELLOW}タスク $TASK_ID を $NEW_STATUS に更新${NC}"
        cat $TASKS_FILE | gemini "タスクID: $TASK_ID のステータスを $NEW_STATUS に変更してJSON全体を出力" > temp_tasks.json
        mv temp_tasks.json $TASKS_FILE
        echo "タスクを更新しました"
        ;;
    
    progress)
        echo -e "${BLUE}=== プロジェクト進捗状況 ===${NC}"
        cat $TASKS_FILE | gemini "全タスクの進捗状況をサマリー。完了率、残タスク数、次の重要なマイルストーンを表示"
        ;;
    
    plan)
        DAYS="${2:-7}"
        echo -e "${GREEN}=== 次の${DAYS}日間の計画 ===${NC}"
        cat $TASKS_FILE | gemini "次の${DAYS}日間のタスク実行計画を提案。依存関係と優先度を考慮した日次計画を作成"
        ;;
    
    review)
        echo -e "${BLUE}=== タスクレビュー ===${NC}"
        cat $TASKS_FILE | gemini "現在のタスク構成をレビュー。ボトルネック、リスク、最適化の提案を含める"
        ;;
    
    sprint)
        echo -e "${GREEN}=== スプリント計画 ===${NC}"
        cat $TASKS_FILE | gemini "現在のスプリント（v1.0.0）の状況と、次スプリントの計画提案"
        ;;
    
    assign)
        TASK_ID="$2"
        echo -e "${YELLOW}タスク $TASK_ID の実行方法を提案${NC}"
        cat $TASKS_FILE | gemini "タスクID: $TASK_ID を実装するための具体的な手順とコード例を提供"
        ;;
    
    log)
        shift
        LOG_MSG="$*"
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] $LOG_MSG" >> $TASKS_LOG
        echo "ログを記録しました: $LOG_MSG"
        ;;
    
    report)
        echo -e "${BLUE}=== 週次レポート ===${NC}"
        cat $TASKS_FILE | gemini "週次進捗レポートを生成。完了タスク、進行中タスク、次週の計画、課題と解決策を含める"
        ;;
    
    *)
        echo "使用可能なコマンド:"
        echo "  list           - 全タスク一覧"
        echo "  today          - 今日のタスク提案"
        echo "  add <説明>     - 新規タスク追加"
        echo "  update <ID> <状態> - タスク状態更新"
        echo "  progress       - 進捗サマリー"
        echo "  plan [日数]    - 実行計画作成"
        echo "  review         - タスクレビュー"
        echo "  sprint         - スプリント状況"
        echo "  assign <ID>    - タスク実装方法"
        echo "  log <メッセージ> - 作業ログ記録"
        echo "  report         - 週次レポート"
        ;;
esac