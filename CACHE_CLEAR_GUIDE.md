# キャッシュクリア完全ガイド

## 🎯 目的
PitchPro v1.3.4統合後、JavaScriptキャッシュを完全にクリアする

## 📋 手順

### **方法1: Chrome/Edge（最も確実）**

1. **開発者ツールを開く**: `Cmd+Option+I` (Mac) / `F12` (Windows)
2. **Networkタブを開く**
3. **「Disable cache」にチェック** ← 重要！
4. **開発者ツールを開いたまま、ページリロード**
5. **音域テストを実行**

### **方法2: Safari**

1. **開発メニューを有効化**: 
   - Safari → 環境設定 → 詳細 → 「メニューバーに"開発"メニューを表示」
2. **キャッシュを空にする**: 
   - 開発 → キャッシュを空にする
3. **ハードリロード**: `Cmd+Option+R`

### **方法3: 完全リセット（最終手段）**

1. **開発者ツール → Application タブ**
2. **Storage → Clear site data** をクリック
3. **すべてにチェックを入れて「Clear site data」**
4. **ページリロード**

## ✅ 確認方法

### **確認1: Networkタブで確認**
```
voice-range-test.js のステータス:
- ✅ 200 (from disk cache) → 正しいファイル
- ❌ 304 (Not Modified) → 古いキャッシュの可能性
```

### **確認2: Consoleで確認**
```javascript
// 測定後のログで確認
// 期待: "F#2 - F#4" のようなオクターブ番号付き
// 問題: "F# - F#" のようなオクターブ番号なし
```

### **確認3: LocalStorageで確認**
```javascript
const data = JSON.parse(localStorage.getItem('voiceRangeData'));
console.log('Range:', data.results.range);
// 期待: "F#2 - F#4"
```

## 🔧 トラブルシューティング

### **それでもキャッシュが残る場合**

キャッシュバスターのタイムスタンプを変更：

```bash
# 新しいタイムスタンプを生成
date +%s

# HTMLファイルでバージョンを更新
?v=1762760859 → ?v=[新しいタイムスタンプ]
```
