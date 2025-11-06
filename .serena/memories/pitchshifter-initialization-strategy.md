# PitchShifter初期化戦略メモ

## 📋 概要
PitchShifter音声処理ライブラリの2段階初期化システム（v1.0.0実装完了）

## 🏗️ アーキテクチャ

### Phase 1: router.js（事前初期化）
- **タイミング**: ホームページの「始める」ボタンクリック時
- **処理**: バックグラウンドで初期化開始、完了を待たずページ遷移
- **保存先**: `window.pitchShifterInstance`（グローバル）
- **目的**: 通常フローでの遅延完全排除

### Phase 2: trainingController.js（フォールバック）
- **タイミング**: 基音ボタンクリック時
- **4段階チェック**:
  1. グローバルインスタンス確認 → 既に初期化済みなら即使用
  2. ローカルインスタンス確認 → 既にフォールバック初期化済みなら再利用
  3. 初期化中チェック → 二重初期化防止
  4. 新規初期化 → 直接アクセス/リダイレクト後のフォールバック

## 🎯 対応シナリオ

| シナリオ | 初期化 | 遅延 |
|---------|-------|-----|
| 通常フロー | Phase 1 | なし ✅ |
| 直接アクセス | Phase 2 | 初回のみ |
| リダイレクト復帰 | Phase 2 | 初回のみ |
| ページリロード | Phase 2 | 初回のみ |

## 📱 デバイス別設定

```javascript
// デバイス検出（iPadOS 13+対応）
const isIPhone = /iPhone/.test(userAgent);
const isIPad = /iPad/.test(userAgent) || (/Macintosh/.test(userAgent) && 'ontouchend' in document);

// 音量設定
pc: -6dB, iphone: -4dB, ipad: -5dB
```

## 🔧 実装ファイル

- `/js/router.js:142-197` - initializePitchShifterBackground()
- `/js/controllers/trainingController.js:85-151` - initializePitchShifter()
- `/specifications/PITCHSHIFTER_INITIALIZATION_STRATEGY.md` - 完全仕様書

## ⚠️ 重要ポイント

1. **グローバルインスタンス中心設計**: `window.pitchShifterInstance`で状態共有
2. **AudioContext制約**: ユーザーインタラクション必須（Web Audio API仕様）
3. **バックグラウンド初期化**: Phase 1は完了を待たない（ページ遷移優先）
4. **確実性保証**: Phase 2が全シナリオで動作を保証
5. **デバッグログ充実**: トラブルシューティング容易

## 🧪 検証済み動作

- ✅ 通常フロー: 遅延なし即座再生
- ✅ 直接アクセス: 初期化後再生
- ✅ 二重初期化防止: Promise再利用
- ✅ デバイス検出: PC/iPhone/iPad対応
- ✅ エラーハンドリング: タイムアウト・診断情報完備
