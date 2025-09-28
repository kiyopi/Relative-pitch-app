# PitchPro二重初期化問題 - 理論検証分析

## 🔍 分析対象
PitchPro Audio Processing Library v1.3.1
GitHub: https://github.com/kiyopi/pitchpro-audio-processing

## 📋 検証すべき理論的ポイント

### 1. PitchProの初期化仕様
#### 確認項目:
- AudioDetectionComponentの初期化プロセス
- AudioContextの管理方法（グローバル vs インスタンス）
- MediaDevicesアクセスの排他制御有無
- 複数インスタンス同時存在時の動作仕様

#### 予想される実装パターン:
```javascript
// パターンA: グローバル管理（問題あり）
class AudioDetectionComponent {
  constructor() {
    if (globalAudioContext) {
      throw new Error('Already initialized');
    }
    globalAudioContext = new AudioContext();
  }
}

// パターンB: インスタンス管理（安全）
class AudioDetectionComponent {
  constructor() {
    this.audioContext = new AudioContext();
  }
}
```

### 2. ブラウザリソース競合の可能性
#### Web Audio API制約:
- AudioContextの同時作成制限
- MediaStreamの排他アクセス
- マイクロフォンリソースの競合

#### 検証ポイント:
- 同一ページ内での複数AudioContext作成時の動作
- MediaDevices.getUserMedia()の重複呼び出し時の動作
- AudioContextの破棄（close()）タイミング

### 3. ページ分割戦略の理論的効果

#### 期待される分離効果:
```
Step1 (preparation-step1.html)
├── 独立したJavaScript実行コンテキスト
├── 独立したDOMツリー
├── 独立したAudioContext
└── ページ終了時の完全なリソース解放

↓ ページ遷移（物理的分離）

Step2 (preparation-step2.html)
├── 新しいJavaScript実行コンテキスト
├── 新しいDOMツリー
├── 新しいAudioContext
└── 前ページの影響なし
```

#### ブラウザレベルでの分離保証:
- ページ遷移によるガベージコレクション
- DOM要素の完全な破棄
- イベントリスナーの自動削除
- メモリリークの防止

### 4. 現在の統合実装での問題推定

#### 想定される問題シナリオ:
```javascript
// 現在のpreparation.htmlでの推定問題
// Step1: マイク許可時
const detector1 = new AudioDetectionComponent({
  volumeBarSelector: '#volume-progress'
});

// Step2: 音域テスト時（同一ページ内）
const detector2 = new AudioDetectionComponent({
  volumeBarSelector: '#range-volume-progress'  
});

// 問題: 同一ページ内での複数インスタンス
// → AudioContext競合 or MediaStream競合
```

### 5. 分割戦略のリスク評価

#### 低リスク要因:
- ページ物理分離による確実なコンテキスト分離
- ブラウザのガベージコレクション活用
- 既存の動作確認済みコードの活用

#### 中リスク要因:
- PitchProのブラウザレベルグローバル状態依存（未確認）
- 短時間遷移でのリソース解放タイミング（unlikely）
- localStorage連携でのタイミング問題（manageable）

#### 高リスク要因:
- PitchProライブラリの未知のグローバル状態管理（要確認）

### 6. READMEから確認すべき仕様

#### 必須確認項目:
- [ ] 複数インスタンス同時存在の可否
- [ ] AudioContextの管理方針
- [ ] リソース解放（cleanup/destroy）メソッドの有無
- [ ] 推奨使用パターン
- [ ] 既知の制限事項

#### 実装詳細確認項目:
- [ ] Constructor内でのグローバル状態変更
- [ ] Singleton パターンの使用有無
- [ ] エラーハンドリング方針
- [ ] デバッグ・ログ出力仕様

## 🎯 理論検証の結論（仮説）

### 高確率で解決可能な理由:
1. **物理的分離の効果**: ページ遷移による確実なコンテキスト分離
2. **既存コードの安定性**: 各ベースファイルが単独で動作確認済み
3. **Web標準の活用**: ブラウザのページライフサイクル管理活用

### 検証の次ステップ:
1. PitchPro READMEでの仕様確認
2. test-pitchpro-cycle.htmlでの実際の問題箇所特定
3. 分割戦略のプロトタイプ実装

## 📅 分析日
2025年1月28日

## 📝 状態
理論分析完了 - README確認待ち

## 🔗 次の確認対象
- PitchPro README仕様書
- 既存実装の問題箇所特定
- 分割戦略の技術的妥当性確認