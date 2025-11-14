# PitchPro-SPA モジュールアーキテクチャドキュメント

**作成日**: 2025-11-09
**最終更新**: 2025-11-14
**バージョン**: 1.1.0
**目的**: 全JavaScriptモジュールの役割・依存関係・モジュール化候補の管理

## 📝 **更新履歴**

### v1.1.0 (2025-11-14)
- ✅ **ModeController v2.0.0実装完了**
  - モード管理統合モジュール追加
  - タイトル表示ロジックの一元管理
  - trainingController.js 63行削減
  - 新モード追加時の修正箇所を最小化

---

## 📋 目次

1. [現在のモジュール構成](#現在のモジュール構成)
2. [モジュール化候補（優先度順）](#モジュール化候補優先度順)
3. [依存関係マップ](#依存関係マップ)
4. [モジュール設計原則](#モジュール設計原則)
5. [今後の実装計画](#今後の実装計画)

---

## 📦 現在のモジュール構成

### **コアモジュール（Core）**
アプリケーション全体で使用される基盤機能

| ファイル | 役割 | グローバルオブジェクト | 状態 |
|---------|------|---------------------|------|
| `js/core/pitchpro-v1.3.1.umd.js` | PitchPro音声検出ライブラリ | `window.PitchPro` | ✅ 安定 |
| `js/core/pitchpro-config.js` | **PitchPro統一設定** | `window.PitchProConfig` | ✅ **Phase 1-1実装** |
| `js/core/device-detector.js` | **デバイス検出統合モジュール** | `window.DeviceDetector` | ✅ **Phase 1.5実装** |
| `js/core/reference-tones.js` | PitchShifter音程生成ライブラリ | `window.PitchShifter` | ✅ 安定 |
| `js/core/global-audio-manager.js` | グローバル音声管理（未使用） | - | ⚠️ 要調査 |
| `js/core/mic-permission-manager.js` | マイク許可管理（未使用） | - | ⚠️ 要調査 |

**モジュール化の成功例**:
- ✅ `pitchpro-config.js` - Phase 1-1で実装完了、オクターブ誤認識を完全修正
- ✅ `device-detector.js` - Phase 1.5で実装完了、iOS/Android/PC統一判定、約50行削減

---

### **データ管理モジュール（Data Management）**
データの永続化・評価計算・セッション記録

| ファイル | 役割 | グローバルオブジェクト | 状態 |
|---------|------|---------------------|------|
| `js/data-manager.js` | localStorage統一管理 | `window.DataManager` | ✅ 安定 |
| `js/evaluation-calculator.js` | 動的グレード計算 | `window.EvaluationCalculator` | ✅ 安定 |
| `js/controllers/session-data-recorder.js` | セッションデータ記録 | `window.SessionDataRecorder` | ✅ 安定 |
| `js/mode-controller.js` | **モード定義・UI表示統一管理** | `window.ModeController` | ✅ **v2.0.0実装完了** |

**モジュール化の成功例**:
- ✅ `mode-controller.js` - v2.0.0で実装完了、タイトル表示ロジック集約、約63行削減

---

### **ナビゲーション・ルーティング**
SPA画面遷移・履歴管理

| ファイル | 役割 | グローバルオブジェクト | 状態 |
|---------|------|---------------------|------|
| `js/router.js` | SPAルーティングシステム | - | ✅ 安定 |
| `js/navigation-manager.js` | ページ遷移・履歴管理 | `window.NavigationManager` | ✅ 安定 |

---

### **UIコンポーネント（UI Components）**
UI表示・アイコン管理

| ファイル | 役割 | グローバルオブジェクト | 状態 |
|---------|------|---------------------|------|
| `js/lucide-init.js` | Lucideアイコン初期化 | `window.initializeLucideIcons` | ✅ 安定 |
| `js/components/ui/ProgressBar.js` | プログレスバーコンポーネント（未使用） | - | ⚠️ 要調査 |
| `js/components/ui/StepIndicator.js` | ステップ表示コンポーネント（未使用） | - | ⚠️ 要調査 |
| `js/components/base/BaseComponent.js` | 基底コンポーネントクラス（未使用） | - | ⚠️ 要調査 |

---

### **ページコントローラー（Page Controllers）**
各ページの制御・ビジネスロジック

| ファイル | 役割 | 主な機能 | 状態 |
|---------|------|---------|------|
| `js/controllers/trainingController.js` | トレーニングページ制御 | ドレミガイド、音程検出、セッション管理 | ✅ 安定（Phase 1-1修正済み） |
| `pages/js/preparation-pitchpro-cycle.js` | 準備ページ制御 | マイクテスト、音域テスト | ✅ 安定（Phase 1-1修正済み） |
| `pages/js/voice-range-test.js` | 音域テスト専用ロジック | 低音/高音フェーズ測定 | ✅ 安定 |
| `pages/js/result-session-controller.js` | セッション結果表示 | 詳細分析、音程別評価 | ✅ 安定 |
| `pages/js/results-overview-controller.js` | 総合評価表示 | グレード表示、統計分析 | ✅ 安定 |

---

## 🎯 モジュール化候補（優先度順）

### **🔴 優先度: 高（即座に実装推奨）**

#### **1. デバイス検出モジュール** ✅ **Phase 1.5実装完了**

**実装内容**:
- ✅ `/js/core/device-detector.js` 作成完了
- ✅ iOS/Android/PC統一判定
- ✅ Android暫定対応（+18dB, 4.5x）
- ✅ trainingController.js約50行削減

**実装済みAPI**:
```javascript
window.DeviceDetector = {
    getDeviceType(),                    // 'iphone' | 'ipad' | 'android' | 'pc'
    detectIOSDeviceTypeByScreen(),      // iOS専用判定
    detectAndroidDeviceType(),          // Android専用判定（将来拡張用）
    getDeviceVolume(),                  // PitchShifter音量（dB）
    getDeviceSensitivity(),             // PitchPro感度（倍率）
    getDeviceInfo(),                    // デバッグ情報
    logDeviceInfo()                     // デバッグ出力
};
```

**影響範囲**:
- ✅ `index.html` - 読み込み追加完了
- ✅ `trainingController.js` - ラッパー関数化完了（@deprecated）
- 📋 詳細分析: `DEVICE_DETECTOR_IMPACT_ANALYSIS.md`

**次期作業**:
- ⏳ Android実機テスト実施
- ⏳ 音量・感度設定の最適化

---

#### **2. モード管理統合モジュール** ✅ **v2.0.0実装完了**

**実装内容**:
- ✅ `/js/mode-controller.js` 作成完了
- ✅ モード定義の一元管理（色・アイコン・名称）
- ✅ タイトル生成関数（`generatePageTitle`）
- ✅ ページヘッダー統一更新関数（`updatePageHeader`）
- ✅ trainingController.js約63行削減

**実装済みAPI**:
```javascript
window.ModeController = {
    getMode(modeId),                        // モード設定取得
    getSessionsPerLesson(modeId, options),  // セッション数取得
    getModeName(modeId, useShortName),      // モード名取得
    generatePageTitle(modeId, options),     // タイトル生成
    updatePageHeader(modeId, options)       // UI一括更新
};
```

**モード定義（Single Source of Truth）**:
```javascript
modes: {
    'random': {
        name: 'ランダム基音モード',
        icon: 'shuffle',
        colors: {
            iconBg: 'gradient-catalog-green',
            subtitle: 'text-green-200'
        },
        // ...
    },
    // continuous, 12tone...
}
```

**影響範囲**:
- ✅ `trainingController.js` - タイトル表示ロジック集約（83行→20行）
- ✅ `results-overview-controller.js` - ページヘッダー統一更新
- ✅ `records-controller.js` - レッスンカード表示でも活用可能

**効果**:
- ✅ タイトル表示ロジックの一元管理完了（重複コード削減）
- ✅ 新モード追加時の修正箇所を最小化（1箇所のみ）
- ✅ ホームページmode-iconカラーとの完全統一
- ✅ 全ページで一貫したUI体験

---

#### **3. 基音選定モジュール**
**現状の問題**:
- `trainingController.js`に基音選定ロジックが集中（800行以上）
- 3つのモード別ロジック + 音域データ処理が複雑化

**提案**: `/js/modules/base-note-selector.js`

```javascript
window.BaseNoteSelector = {
    selectAllBaseNotesForMode(config) { ... },
    selectRandomMode(availableNotes, maxSessions) { ... },
    selectContinuousMode(availableNotes, maxSessions) { ... },
    selectSequentialMode(availableNotes, maxSessions) { ... },
    getAvailableNotes() { ... },
    getVoiceRangeOctaves() { ... },
    loadVoiceRangeData() { ... }
};
```

**効果**:
- ✅ trainingController.jsの行数削減（約300行減）
- ✅ 基音選定ロジックの独立テスト可能
- ✅ 下行モード実装時の拡張容易性

**仕様書参照**: `BASE_NOTE_SELECTION_SPECIFICATION.md`

---

### **🟠 優先度: 中（Phase 2-3で実装推奨）**

#### **3. 音程誤差計算モジュール**
**現状の問題**:
- `trainingController.js`・`result-session-controller.js`で重複
- セント計算ロジックが散在

**提案**: `/js/modules/pitch-error-calculator.js`

```javascript
window.PitchErrorCalculator = {
    calculateCentsError(expectedFreq, detectedFreq) { ... },
    calculateAverageError(pitchErrors) { ... },
    filterOutliers(pitchErrors, threshold) { ... },
    classifyErrorMagnitude(cents) { ... } // Excellent/Good/Pass/Practice
};
```

---

#### **4. UI更新ヘルパーモジュール**
**現状の問題**:
- ドレミガイドのUI更新ロジックが複雑
- プログレスバー・バッジ更新が複数箇所に散在

**提案**: `/js/modules/ui-helpers.js`

```javascript
window.UIHelpers = {
    updateProgressBar(selector, percentage) { ... },
    updateSessionBadge(current, total) { ... },
    highlightActiveNote(noteElement) { ... },
    showNotification(message, type) { ... }
};
```

---

### **🟢 優先度: 低（将来的に検討）**

#### **5. コンポーネントシステムの再活用**
**現状**: `js/components/`配下のファイルが未使用

**選択肢**:
- **A案**: 削除（現在のバニラJSアプローチを継続）
- **B案**: 再設計して活用（将来的なReact/Vue移行を見据える）

**推奨**: A案（現在のアーキテクチャを維持）

---

## 🔗 依存関係マップ

### **レイヤー構造**

```
┌─────────────────────────────────────────────────────┐
│ ページコントローラー（Page Controllers）              │
│ - trainingController.js                             │
│ - preparation-pitchpro-cycle.js                     │
│ - result-session-controller.js                      │
│ - results-overview-controller.js                    │
└─────────────────────┬───────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────┐
│ ビジネスロジックモジュール（Modules）                │
│ ⚠️ 未実装:                                          │
│ - device-detector.js（提案）                        │
│ - base-note-selector.js（提案）                     │
│ - pitch-error-calculator.js（提案）                 │
│ - ui-helpers.js（提案）                             │
└─────────────────────┬───────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────┐
│ データ管理（Data Management）                        │
│ - data-manager.js                                   │
│ - evaluation-calculator.js                          │
│ - session-data-recorder.js                          │
└─────────────────────┬───────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────┐
│ コアライブラリ（Core）                               │
│ - pitchpro-v1.3.1.umd.js                            │
│ - pitchpro-config.js ✅                             │
│ - reference-tones.js                                │
│ - navigation-manager.js                             │
│ - router.js                                         │
│ - lucide-init.js                                    │
└─────────────────────────────────────────────────────┘
```

---

## 🎨 モジュール設計原則

### **1. 単一責任の原則（SRP）**
- 1つのモジュールは1つの責任のみを持つ
- 例: `pitchpro-config.js` → PitchPro設定のみ管理

### **2. グローバル名前空間の統一**
```javascript
// ✅ 推奨パターン
window.ModuleName = { ... };

// ❌ 避けるパターン
const moduleName = { ... }; // グローバル汚染
```

### **3. 依存関係の明示**
```javascript
/**
 * デバイス検出モジュール
 *
 * @dependencies なし
 * @usedBy trainingController.js, preparation-pitchpro-cycle.js
 */
```

### **4. 後方互換性の保持**
- 既存コードを段階的に移行
- 古い関数は`@deprecated`タグで警告

### **5. テスト可能性**
- 純粋関数を優先（副作用を最小化）
- モック可能な設計

---

## 📅 今後の実装計画

### **Phase 1.5: デバイス検出モジュール** ✅ **完了**
- **工数**: 1-2時間 → 実際: 1.5時間
- **ファイル**: `/js/core/device-detector.js` ✅ 実装完了
- **効果**: trainingController.js約50行削減 ✅ 達成
- **追加成果**: Android対応、影響範囲分析ドキュメント作成

### **Phase 2.5: 基音選定モジュール（Phase 2後に実施）**
- **工数**: 3-4時間
- **ファイル**: `/js/modules/base-note-selector.js`
- **効果**: trainingController.js約300行削減、下行モード実装の準備

### **Phase 3.5: 音程誤差計算モジュール（Phase 3後に実施）**
- **工数**: 2-3時間
- **ファイル**: `/js/modules/pitch-error-calculator.js`
- **効果**: ロジックの重複削除、テスト容易性向上

---

## 🔍 調査が必要なファイル

以下のファイルは現在未使用の可能性があり、調査が必要:

| ファイル | 理由 |
|---------|------|
| `js/core/global-audio-manager.js` | PitchProと役割が重複？ |
| `js/core/mic-permission-manager.js` | PitchProのMicrophoneControllerと重複？ |
| `js/components/**/*.js` | 全て未使用の可能性 |
| `js/controllers/trainingController.old.js` | 旧バージョン、削除候補 |
| `js/controllers/preparationController.js` | preparation-pitchpro-cycle.jsと重複？ |

**推奨アクション**: Phase 1-2実装前にファイル調査・削除を実施

---

## 📊 モジュール化による期待効果

### **コード品質の向上**
- ✅ trainingController.jsの行数: 1200行 → 600行（予想）
- ✅ 重複コードの削減: 約500行
- ✅ テストカバレッジの向上

### **保守性の向上**
- ✅ 修正箇所の特定が容易
- ✅ バグの局所化
- ✅ 新規機能追加の容易性

### **拡張性の確保**
- ✅ 下行モード実装の準備完了
- ✅ 新規トレーニングモード追加が容易
- ✅ 他ページでのロジック再利用

---

## 🎯 推奨実装順序（まとめ）

1. ✅ **Phase 1.5（完了）**: デバイス検出モジュール
2. **Phase 1-2（次）**: 設定ページ実装
3. **Phase 2**: 総合評価・記録ページ実装
4. **Phase 2.5**: 基音選定モジュール
5. **Phase 3**: 総合分析レポート実装
6. **Phase 3.5**: 音程誤差計算モジュール
7. **Phase 4**: 下行モード実装
8. **Phase 5**: UI・SNS機能実装

---

**更新履歴**:
- 2025-11-09 14:00: 初版作成（Phase 1-1完了後）
- 2025-11-09 15:30: Phase 1.5完了（device-detector.js実装、Android対応）
