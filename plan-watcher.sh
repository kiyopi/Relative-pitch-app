#!/bin/bash

# Claude Plan Watcher - Plan modeの内容を監視してGeminiに保存

# Claude Codeの出力を監視
WATCH_LOG="claude-output.log"

# fswatch（macOS）またはinotify（Linux）でClaude Codeの出力を監視
if command -v fswatch >/dev/null 2>&1; then
    # macOS用
    echo "🔍 Claude Plan mode監視開始 (fswatch)"
    
    # ターミナル出力をキャプチャするための仕組み
    tail -f ~/.zsh_history | while read line; do
        if [[ "$line" == *"claude"* ]] && [[ "$line" == *"plan"* ]]; then
            echo "[$(date)] Plan mode detected" >> $WATCH_LOG
        fi
    done &
    
elif command -v inotifywait >/dev/null 2>&1; then
    # Linux用
    echo "🔍 Claude Plan mode監視開始 (inotify)"
    inotifywait -m ~/.zsh_history | while read line; do
        if [[ "$line" == *"claude"* ]] && [[ "$line" == *"plan"* ]]; then
            echo "[$(date)] Plan mode detected" >> $WATCH_LOG
        fi
    done &
else
    echo "❌ ファイル監視ツールが見つかりません"
    echo "macOSの場合: brew install fswatch"
    echo "Linuxの場合: apt install inotify-tools"
    exit 1
fi

# 手動でPlan内容を保存する関数
manual_save() {
    echo "📝 Plan内容を手動入力してください（Ctrl+Dで終了）:"
    PLAN_CONTENT=$(cat)
    ./claude-gemini-bridge.sh save "$PLAN_CONTENT"
    echo "✅ Geminiに保存完了"
}

# 最新のPlan内容を表示
show_latest() {
    echo "📋 最新のPlan一覧:"
    ./claude-gemini-bridge.sh list | tail -10
}

case "$1" in
    watch)
        # バックグラウンド監視開始
        nohup "$0" background > plan-watcher.log 2>&1 &
        echo $! > plan-watcher.pid
        echo "🚀 Plan監視をバックグラウンドで開始（PID: $(cat plan-watcher.pid)）"
        echo "ログ: tail -f plan-watcher.log"
        ;;
    
    stop)
        if [ -f plan-watcher.pid ]; then
            kill $(cat plan-watcher.pid) 2>/dev/null
            rm plan-watcher.pid
            echo "⏹️ Plan監視を停止しました"
        else
            echo "監視プロセスが見つかりません"
        fi
        ;;
    
    manual)
        manual_save
        ;;
    
    latest)
        show_latest
        ;;
    
    background)
        # バックグラウンド実行用の内部処理
        while true; do
            sleep 10
            # ここで実際の監視ロジックを実装
            if [ -f "$WATCH_LOG" ] && [ -s "$WATCH_LOG" ]; then
                tail -1 "$WATCH_LOG" | grep -q "Plan mode detected" && {
                    echo "[$(date)] Potential plan content detected"
                    # 必要に応じてここで自動保存処理を実行
                }
            fi
        done
        ;;
    
    *)
        echo "Claude Plan Watcher Commands:"
        echo "  watch    - Start background monitoring"
        echo "  stop     - Stop monitoring"
        echo "  manual   - Manually save plan content"
        echo "  latest   - Show latest plans"
        ;;
esac