# Preparation.html ファイル分割ソリューション

## 問題の背景
- preparation.htmlの統合が非常に複雑で困難
- preparation-pitchpro-cycle.jsとvoice-range-test-demo.jsの競合
- PitchProの二重初期化問題が継続的に発生
- リファクタリング作業でマイク許可ボタンが動作しなくなる問題

## 解決策：2ファイル分割アプローチ

### ファイル構成
```
preparation-step1.html (マイク許可・音声テスト)
├── preparation-step1.js
├── PitchProインスタンス #1
└── 完了後 → localStorage保存 → step2へ

preparation-step2.html (音域テスト・結果表示)
├── preparation-step2.js  
├── PitchProインスタンス #2（完全に独立）
└── 完了後 → training.htmlへ
```

### メリット

#### 技術的な問題解決
- **PitchPro二重初期化の完全解決**: 各ページで独立したインスタンス管理
- **複雑な依存関係の解消**: ファイル間の競合がなくなる
- **デバッグの容易さ**: 問題の原因特定が簡単

#### 保守性の向上
- **単一責任原則**: 各ページが明確な役割を持つ
- **コードの簡潔化**: 各ファイルが小さくなり理解しやすい
- **独立したテスト**: 各機能を個別にテスト可能

#### 開発効率
- **並行開発可能**: 各ページを独立して開発・修正できる
- **リスク低減**: 一つの修正が他に影響しない
- **段階的な実装**: 一つずつ確実に実装できる

### データ受け渡し方法
```javascript
// Step1完了時
localStorage.setItem('micPermissionGranted', 'true');
localStorage.setItem('audioTestCompleted', 'true');
window.location.href = 'preparation-step2.html';

// Step2開始時
if (!localStorage.getItem('micPermissionGranted')) {
    window.location.href = 'preparation-step1.html';
}
```

### 実装上の注意点
1. localStorage（またはDataManager）を使用したステート管理
2. 各ページ間のナビゲーション処理
3. ユーザーが直接Step2にアクセスした場合のリダイレクト処理
4. PitchProインスタンスは各ページで独立して初期化

### 結論
このアプローチは現在直面している統合の複雑さを回避し、シンプルで保守しやすい実装を実現する。既存のコードを大幅に変更することなく、各機能を独立したページに移植できるため、実装リスクが低く、開発効率が高い。

## 関連ファイル
- /Users/isao/Documents/Relative-pitch-app/Bolt/v2/pages/test-pitchpro-cycle.html
- /Users/isao/Documents/Relative-pitch-app/voice-range-test-v4/src/voice-range-test-demo.html
- preparation-pitchpro-cycle.js
- voice-range-test-demo.js

## 決定日
2025年1月28日

## 状態
- 現在のブランチ: feature/microphone-permission-fix
- 安定版コミット: a685e2f