#!/bin/bash

# PitchPro関連ファイル移行スクリプト
# 使用方法: ./PITCHPRO_MIGRATION_SCRIPT.sh /path/to/new/pitchpro/repository

if [ $# -eq 0 ]; then
    echo "使用方法: $0 <移行先ディレクトリパス>"
    echo "例: $0 /Users/isao/Documents/PitchPro.js"
    exit 1
fi

DEST_DIR="$1"
SOURCE_DIR="/Users/isao/Documents/Relative-pitch-app"

echo "🎵 PitchPro関連ファイル移行スクリプト"
echo "移行元: $SOURCE_DIR"
echo "移行先: $DEST_DIR"
echo ""

# 移行先ディレクトリの確認
if [ ! -d "$DEST_DIR" ]; then
    echo "❌ 移行先ディレクトリが存在しません: $DEST_DIR"
    exit 1
fi

cd "$DEST_DIR"

echo "📁 ディレクトリ構造を作成中..."
# 必要なディレクトリを作成
mkdir -p src/core
mkdir -p src/components  
mkdir -p examples
mkdir -p docs
mkdir -p dist

echo "📋 Coreライブラリをコピー中..."
# PitchPro coreライブラリ
cp -r "$SOURCE_DIR/js/pitchpro-audio/" "dist/"

echo "🔧 AudioDetectionComponentをコピー中..."
# AudioDetectionComponent
cp "$SOURCE_DIR/js/audio-detection-component.js" "src/components/"

echo "📄 デモページをコピー中..."
# デモページ
cp "$SOURCE_DIR/pitchpro-complete-demo.html" "examples/complete-demo.html"
cp "$SOURCE_DIR/test-pitchpro-ui-auto-update.html" "examples/ui-comparison-demo.html"

echo "📚 ドキュメントをコピー中..."
# ドキュメント
cp "$SOURCE_DIR/AudioDetectionComponent-Documentation.md" "docs/README.md"
cp "$SOURCE_DIR/specifications/AUDIO_LIBRARY_DESIGN.md" "docs/LIBRARY_DESIGN.md"

echo "🎨 スタイルシートをコピー中..."
# 必要なCSS (デモページ用)
mkdir -p "examples/styles"
cp "$SOURCE_DIR/Bolt/v2/styles/base.css" "examples/styles/"
cp "$SOURCE_DIR/Bolt/v2/styles/results.css" "examples/styles/"

echo "📝 README.mdを作成中..."
# メインREADME作成
cat > README.md << 'EOF'
# PitchPro.js

高精度音程検出ライブラリ - Web Audio API + FFT解析によるリアルタイム音響処理

## 🎯 特徴

- **高精度音程検出**: Web Audio API + FFT解析
- **UI自動更新**: DOM要素の自動更新機能  
- **マルチデバイス対応**: PC/iPhone/iPad最適化
- **iPadOS 13+完全対応**: タッチデバイス検出
- **統一API**: シンプルで一貫性のあるAPI設計

## 🚀 クイックスタート

```javascript
// 基本的な使用方法
const audioDetector = new AudioDetectionComponent({
    frequencySelector: '#frequency-display',
    noteSelector: '#note-display',
    volumeBarSelector: '#volume-bar'
});

await audioDetector.initialize();

audioDetector.setCallbacks({
    onPitchUpdate: (result) => {
        console.log('周波数:', result.frequency);
        console.log('音名:', result.note);
        console.log('音量:', result.volume);
    }
});

audioDetector.startDetection();
```

## 📁 ファイル構成

- `src/components/` - AudioDetectionComponent
- `dist/` - ビルド済みライブラリ
- `examples/` - デモページ・使用例
- `docs/` - 完全ドキュメント

## 📋 デモページ

- [完全デモページ](examples/complete-demo.html) - 全機能を実証
- [UI比較デモ](examples/ui-comparison-demo.html) - 手動vs自動UI更新の比較

## 📚 ドキュメント

- [完全ドキュメント](docs/README.md) - APIリファレンス・使用例
- [ライブラリ設計書](docs/LIBRARY_DESIGN.md) - 設計思想・技術仕様

## 🔧 インストール

```bash
# npm経由 (将来対応予定)
npm install pitchpro

# CDN経由
<script src="dist/pitchpro-audio/index.umd.js"></script>
<script src="src/components/audio-detection-component.js"></script>
```

## 💡 実用例

### 楽器チューナー
```javascript
const tuner = new AudioDetectionComponent({
    clarityThreshold: 0.7
});
// 詳細は docs/README.md を参照
```

### 音域テスト
```javascript
const rangeTest = new AudioDetectionComponent({
    minVolumeAbsolute: 0.001
});
// 詳細実装例は docs/README.md を参照
```

## 📄 ライセンス

MIT License

## 🤝 貢献

バグレポート・機能リクエストはIssuesまでお願いします。
EOF

echo "📦 package.jsonを作成中..."
# package.json作成
cat > package.json << 'EOF'
{
  "name": "pitchpro",
  "version": "2.0.0", 
  "description": "高精度音程検出ライブラリ - Web Audio API + FFT解析によるリアルタイム音響処理",
  "main": "dist/pitchpro-audio/index.umd.js",
  "module": "dist/pitchpro-audio/index.esm.js",
  "types": "dist/pitchpro-audio/index.d.ts",
  "scripts": {
    "dev": "python -m http.server 8080",
    "test": "echo \"テスト実装予定\" && exit 0"
  },
  "keywords": [
    "audio",
    "pitch-detection", 
    "web-audio-api",
    "fft",
    "music",
    "tuner"
  ],
  "author": "PitchPro.js Contributors",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "https://github.com/[ユーザー名]/PitchPro.js.git"
  },
  "files": [
    "dist/",
    "src/",
    "examples/",
    "docs/"
  ]
}
EOF

echo ""
echo "✅ ファイル移行完了!"
echo ""
echo "📋 次の手順:"
echo "1. cd $DEST_DIR"
echo "2. git add ."
echo "3. git commit -m 'feat: PitchPro.js初期バージョン - 完全デモ・ドキュメント付き'"
echo "4. git push origin main"
echo ""
echo "🌐 デモページテスト:"
echo "1. cd $DEST_DIR && python -m http.server 8080"
echo "2. http://localhost:8080/examples/complete-demo.html を開く"
echo ""
echo "🎉 移行完了! PitchPro.jsリポジトリの準備ができました。"