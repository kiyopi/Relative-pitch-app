# preparation.html リファクタリングガイド

## 🎯 目的
preparation.htmlの保守性・拡張性・テスタビリティを向上させるためのリファクタリング指針

## 📋 現状分析

### 🟢 良い点
- ✅ **完全機能実装**: マイク許可〜結果表示まで完全動作
- ✅ **globalAudioDetectorスコープ問題解決済み**: 安定した音声処理
- ✅ **PitchPro v1.3.1完全対応**: 最新ライブラリとの統合
- ✅ **本番品質ログ**: デバッグコード整理済み
- ✅ **レスポンシブUI**: モバイル・PC両対応

### 🟡 改善が必要な点
- ⚠️ **単一ファイル肥大化**: HTMLが325行、複雑な構造
- ⚠️ **JavaScript分散**: preparation.js + voice-range-test-demo.js
- ⚠️ **状態管理分散**: セクション表示制御が各所に散在
- ⚠️ **テスタビリティ**: 単体テストが困難な構造
- ⚠️ **再利用性**: 他ページでの音域テスト機能再利用が困難

## 🏗️ リファクタリング戦略

### Phase 1: コンポーネント分離（優先度: 高）

#### 1.1 セクションコンポーネント化
```javascript
// 提案構造
class MicPermissionSection {
    constructor(container) { /* ... */ }
    show() { /* 表示制御 */ }
    hide() { /* 非表示制御 */ }
    requestPermission() { /* マイク許可処理 */ }
}

class VoiceTestSection {
    constructor(container, audioDetector) { /* ... */ }
    startTest() { /* 音声テスト開始 */ }
    updateMeters(result) { /* メーター更新 */ }
    onTestComplete(callback) { /* 完了時コールバック */ }
}

class VoiceRangeTestSection {
    constructor(container, audioDetector) { /* ... */ }
    startMeasurement() { /* 測定開始 */ }
    updateProgress(percentage) { /* プログレスバー更新 */ }
    onMeasurementComplete(callback) { /* 完了時コールバック */ }
}

class ResultDisplaySection {
    constructor(container) { /* ... */ }
    displayResults(results) { /* 結果表示 */ }
    onTrainingStart(callback) { /* トレーニング開始コールバック */ }
}
```

#### 1.2 ステートマシン導入
```javascript
class PreparationFlowManager {
    constructor() {
        this.state = 'PERMISSION_REQUIRED';
        this.sections = {
            permission: new MicPermissionSection('#permission-section'),
            voiceTest: new VoiceTestSection('#audio-test-section'),
            rangeTest: new VoiceRangeTestSection('#range-test-section'),
            result: new ResultDisplaySection('#result-section')
        };
    }

    transition(newState) {
        // 状態遷移ロジック
        // PERMISSION_REQUIRED → VOICE_TEST → RANGE_TEST → RESULT
    }

    updateStepIndicators() {
        // 進捗表示統一更新
    }
}
```

### Phase 2: データ層分離（優先度: 中）

#### 2.1 測定データストア
```javascript
class MeasurementDataStore {
    constructor() {
        this.voiceTestResult = null;
        this.rangeTestResult = null;
        this.finalResult = null;
    }

    saveVoiceTestResult(result) { /* 音声テスト結果保存 */ }
    saveRangeTestResult(result) { /* 音域テスト結果保存 */ }
    calculateFinalResult() { /* 最終結果計算 */ }

    // localStorageとの統合
    persistToStorage() { /* データ永続化 */ }
    loadFromStorage() { /* データ復元 */ }
}
```

#### 2.2 音声処理インターフェース
```javascript
class AudioProcessorInterface {
    constructor(pitchProInstance) {
        this.pitchPro = pitchProInstance;
        this.eventBus = new EventEmitter();
    }

    startDetection(config) { /* 統一された音声検出開始 */ }
    stopDetection() { /* 音声検出停止 */ }
    updateSelectors(selectors) { /* UI要素更新 */ }

    // イベント駆動型
    on(event, callback) { /* onVolumeUpdate, onPitchDetected等 */ }
}
```

### Phase 3: テスタビリティ向上（優先度: 中）

#### 3.1 依存性注入
```javascript
// Before: 直接依存
class VoiceRangeTestSection {
    constructor() {
        this.audioDetector = window.globalAudioDetector; // 直接依存
    }
}

// After: 依存性注入
class VoiceRangeTestSection {
    constructor(container, audioDetector) {
        this.container = container;
        this.audioDetector = audioDetector; // 注入
    }
}
```

#### 3.2 モック対応
```javascript
// テスト用モック
class MockAudioDetector {
    startDetection() { /* モック実装 */ }
    setCallbacks(callbacks) { /* モック実装 */ }
    updateSelectors(selectors) { /* モック実装 */ }
}

// ユニットテスト例
describe('VoiceRangeTestSection', () => {
    it('should start measurement correctly', () => {
        const mockAudioDetector = new MockAudioDetector();
        const section = new VoiceRangeTestSection('#test-container', mockAudioDetector);

        section.startMeasurement();
        expect(mockAudioDetector.startDetection).toHaveBeenCalled();
    });
});
```

## 📁 推奨ファイル構造

### リファクタリング後の理想構造
```
/pages/preparation/
├── preparation.html                    # シンプル化されたHTML
├── css/
│   ├── preparation-base.css           # 基本スタイル
│   ├── preparation-sections.css       # セクション別スタイル
│   └── preparation-animations.css     # アニメーション専用
├── js/
│   ├── components/
│   │   ├── MicPermissionSection.js    # マイク許可コンポーネント
│   │   ├── VoiceTestSection.js        # 音声テストコンポーネント
│   │   ├── VoiceRangeTestSection.js   # 音域テストコンポーネント
│   │   └── ResultDisplaySection.js    # 結果表示コンポーネント
│   ├── managers/
│   │   ├── PreparationFlowManager.js  # フロー管理
│   │   ├── MeasurementDataStore.js    # データ管理
│   │   └── AudioProcessorInterface.js # 音声処理インターフェース
│   ├── utils/
│   │   ├── stepIndicatorUtils.js      # 進捗表示ユーティリティ
│   │   └── measurementCalculator.js   # 測定結果計算
│   └── preparation-main.js            # メインエントリーポイント
└── tests/
    ├── unit/
    │   ├── MicPermissionSection.test.js
    │   ├── VoiceTestSection.test.js
    │   └── VoiceRangeTestSection.test.js
    └── integration/
        └── preparation-flow.test.js
```

## 🚀 段階的移行プラン

### ステップ 1: 準備（1-2日）
- [ ] 現在のpreparation.htmlを`preparation-legacy.html`として保存
- [ ] ディレクトリ構造作成
- [ ] 基本的なコンポーネントクラス骨格作成

### ステップ 2: MicPermissionSection移行（1日）
- [ ] `MicPermissionSection`クラス実装
- [ ] HTMLからマイク許可部分を抽出
- [ ] 単体テスト作成
- [ ] 動作確認

### ステップ 3: VoiceTestSection移行（2日）
- [ ] `VoiceTestSection`クラス実装
- [ ] 音量バー・周波数表示ロジック移行
- [ ] PitchPro統合テスト
- [ ] 単体テスト作成

### ステップ 4: VoiceRangeTestSection移行（2-3日）
- [ ] `VoiceRangeTestSection`クラス実装
- [ ] 円形プログレスバーロジック移行
- [ ] 測定フロー（低音→高音）の移行
- [ ] 単体テスト作成

### ステップ 5: ResultDisplaySection移行（1日）
- [ ] `ResultDisplaySection`クラス実装
- [ ] 結果表示ロジック移行
- [ ] 動的データ表示テスト

### ステップ 6: 統合とテスト（2日）
- [ ] `PreparationFlowManager`実装
- [ ] 全体統合テスト
- [ ] パフォーマンステスト
- [ ] レガシー版との動作比較

### ステップ 7: 本番移行（1日）
- [ ] 新バージョンを`preparation.html`に置き換え
- [ ] 最終動作確認
- [ ] ドキュメント更新

## ✅ 成功指標

### 機能要件
- [ ] 全ての既存機能が正常動作（マイク許可〜結果表示）
- [ ] PitchPro v1.3.1との完全互換性
- [ ] モバイル・PC両対応の維持
- [ ] 円形プログレスバー3秒アニメーション正常動作

### 非機能要件
- [ ] ページ読み込み時間 < 3秒
- [ ] JavaScript実行エラー = 0
- [ ] コードカバレッジ > 80%
- [ ] ESLintエラー = 0

### 保守性指標
- [ ] 単一責任原則の遵守（各コンポーネント50行以下）
- [ ] 依存関係の明確化
- [ ] 状態管理の集約化
- [ ] テストしやすい構造

## ⚠️ リスク管理

### 高リスク要素
1. **PitchPro統合**: 音声処理の複雑性
2. **globalAudioDetector共有**: インスタンス管理
3. **円形プログレスバー**: アニメーション制御
4. **セクション切り替え**: タイミング制御

### リスク軽減策
- 各ステップでの十分な動作確認
- レガシー版の並行保持
- 段階的移行による影響範囲限定
- 豊富な単体テスト・統合テスト

## 📚 参考資料

- [preparation.html詳細仕様書](./PREPARATION_HTML_SPECIFICATION.md)
- [PitchPro v1.3.1ライブラリ仕様](https://github.com/kiyopi/pitchpro-audio-processing)
- [globalAudioDetectorスコープ問題修正記録](../.serena/memories/globalAudioDetector_scope_fix_2025_01.md)

---

**作成日**: 2025年1月
**作成者**: Claude Code Assistant
**バージョン**: 1.0.0
**対象**: preparation.html（統合完了版）