#!/bin/bash

# Claude-Gemini統合テストスクリプト

export GEMINI_API_KEY="AIzaSyAtMxDy8DWBZVxvjDfaqxzerL32jdWaroQ"

echo "🧪 Claude-Gemini統合テスト開始"

# テスト用のサンプル計画
SAMPLE_PLAN="
## 音声処理システム実装計画

### 目標
相対音感トレーニングアプリの音声処理コア機能を実装

### 実装項目
1. マイク入力の設定とPermission管理
2. Web Audio APIを使用したリアルタイム音声処理
3. Pitchyライブラリによるピッチ検出
4. 音程精度の計算とフィードバック

### 推定工数
- 設計: 4時間
- 実装: 12時間  
- テスト: 6時間
- 合計: 22時間

### リスク
- ブラウザ間の音声処理差異
- レイテンシの問題
- 音質の劣化

### 優先度
High - アプリの核心機能のため
"

echo "📝 サンプル計画をGeminiで保存テスト"
./claude-gemini-bridge.sh save "$SAMPLE_PLAN"

echo ""
echo "📋 保存された計画の確認"
./claude-gemini-bridge.sh list

echo ""
echo "📊 進捗レポートのテスト"
./claude-gemini-bridge.sh report

echo ""
echo "🔄 タスクへの変換テスト"
PLAN_ID=$(cat claude-plans.json | python3 -c "import json,sys; data=json.load(sys.stdin); print(data['plans'][-1]['id'])" 2>/dev/null)
if [ ! -z "$PLAN_ID" ]; then
    echo "最新計画ID: $PLAN_ID"
    ./claude-gemini-bridge.sh convert "$PLAN_ID"
fi

echo ""
echo "✅ Claude-Gemini統合テスト完了"
echo ""
echo "使用可能なコマンド:"
echo "  ./plan-watcher.sh watch     - Plan監視開始"
echo "  ./plan-watcher.sh manual    - 手動Plan保存"
echo "  ./claude-gemini-bridge.sh list - 計画一覧"
echo "  ./claude-gemini-bridge.sh report - 進捗レポート"