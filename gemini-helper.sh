#!/bin/bash

# Gemini Helper Script for Relative Pitch App
# 使用法: ./gemini-helper.sh [command] [file]

# APIキー読み込み
source .env.gemini

case "$1" in
    review)
        echo "コードレビュー: $2"
        cat "$2" | gemini "このコードをレビューして、特に相対音感トレーニングアプリの文脈で改善点を提案してください"
        ;;
    
    explain)
        echo "コード説明: $2"
        cat "$2" | gemini "このコードの機能を説明し、相対音感トレーニングアプリでどのように使われるか解説してください"
        ;;
    
    test)
        echo "テスト生成: $2"
        cat "$2" | gemini "このコードのテストをTypeScript/Jestで生成してください"
        ;;
    
    optimize)
        echo "最適化提案: $2"
        cat "$2" | gemini "このコードのパフォーマンスを最適化する方法を提案してください。特にWeb Audio APIの使用について"
        ;;
    
    audio)
        echo "音声処理アドバイス: $2"
        cat "$2" | gemini "このWeb Audio APIコードをレビューして、音質やレイテンシの改善点を提案してください"
        ;;
    
    ui)
        echo "UI/UX改善: $2"
        cat "$2" | gemini "このUIコードのユーザビリティとアクセシビリティを改善する方法を提案してください"
        ;;
    
    spec)
        echo "仕様確認"
        cat APP_SPECIFICATION.md | gemini "$2"
        ;;
    
    ask)
        shift
        echo "$@" | gemini
        ;;
    
    *)
        echo "使用可能なコマンド:"
        echo "  review <file>  - コードレビュー"
        echo "  explain <file> - コード説明"
        echo "  test <file>    - テスト生成"
        echo "  optimize <file>- 最適化提案"
        echo "  audio <file>   - 音声処理レビュー"
        echo "  ui <file>      - UI/UX改善提案"
        echo "  spec <質問>    - 仕様書について質問"
        echo "  ask <質問>     - 自由質問"
        ;;
esac