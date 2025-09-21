# 音域テストUI表示テキスト仕様書 v1.0.0

**ファイル**: voice-range-test-v4/docs/UI_TEXT_SPECIFICATION.md
**更新日**: 2025年1月21日
**目的**: 音域テストアプリケーションのUI表示テキスト完全仕様
**対象**: PitchPro v1.3.0統合版・実装者向けリファレンス

---

## 📋 目次

1. [音域テストバッジ上部テキスト](#音域テストバッジ上部テキスト)
2. [バッジ状態表示（下部）](#バッジ状態表示下部)
3. [マイクステータス表示](#マイクステータス表示)
4. [フェーズ別表示パターン](#フェーズ別表示パターン)
5. [実装コード対応表](#実装コード対応表)

---

## 🎯 音域テストバッジ上部テキスト

### Main Status Text (`#main-status-text`)

#### **初期化・準備フェーズ**
| 状況 | 表示テキスト | 実装箇所 |
|------|-------------|----------|
| マイク許可待ち | `マイク入力を検出中...` | line 573 |
| 準備完了 | `音域テスト開始ボタンを押してください` | line 620 |

#### **低音測定フェーズ**
| 状況 | 表示テキスト | 実装箇所 |
|------|-------------|----------|
| 低音待機 | `３秒間できるだけ低い声で「あー」と発声しましょう` | lines 707, 1516 |
| 低音測定中 | `そのまま声をキープしましょう` | line 1197 |
| 低音リトライ | `低音測定失敗 - 再測定します (${retryCount}/${maxRetries})` | line 1265 |
| 低音リトライ待機 | `３秒間できるだけ低い声で「あー」と発声しましょう` | lines 1307, 1623 |
| 低音スキップ | `低音測定をスキップします` | line 1286 |

#### **高音測定フェーズ**
| 状況 | 表示テキスト | 実装箇所 |
|------|-------------|----------|
| 高音待機 | `３秒間できるだけ高い声で「あー」と発声しましょう` | line 1516 |
| 高音測定中 | `そのまま声をキープしましょう` | line 1526 |
| 高音リトライ | `高音測定失敗 - 再測定します (${highRetryCount}/${maxRetries})` | line 1382 |
| 高音リトライ待機 | `３秒間できるだけ高い声で「あー」と発声しましょう` | lines 1332, 1627 |

#### **結果・エラーフェーズ**
| 状況 | 表示テキスト | 実装箇所 |
|------|-------------|----------|
| 低音測定完了 | `低音測定完了！高音測定に進みます...` | line 1238 |
| 測定完了 | `音域テスト完了！結果を確認してください` | line 1598 |
| 部分結果 | `測定完了！低音域の結果を表示します` | line 1431 |
| 完全失敗 | `音域測定に失敗しました` | line 1463 |
| テスト停止 | `テスト停止` | line 1675 |
| 検出停止 | `音声検出停止中（プログレス継続）` | line 1709 |

### Sub Info Text (`#sub-info-text`)

#### **基本ガイダンス**
| 状況 | 表示テキスト | 実装箇所 |
|------|-------------|----------|
| マイクテスト | `声を出してテストしてください` | line 574 |
| 音声検出待機 | `安定した声を認識したら自動で測定開始します` | lines 708, 1517 |

#### **測定実行中のガイダンス**
| 状況 | 表示テキスト | 実装箇所 |
|------|-------------|----------|
| 低音測定実行中 | `低音測定中...` | line 1198 |
| 高音測定実行中 | `高音測定中...` | line 1528 |

#### **リトライ時の具体的指導**
| 状況 | 表示テキスト | 実装箇所 |
|------|-------------|----------|
| 低音失敗直後 | `より大きな声で低い音を出してください` | line 1271 |
| 低音再測定開始時 | `より大きく、より低い音で歌ってください` | line 1313 |
| 高音失敗直後 | `より大きな声で高い音を出してください` | line 1388 |
| 高音再測定開始時 | `より大きく、より高い音で歌ってください` | line 1338 |

#### **進行・結果メッセージ**
| 状況 | 表示テキスト | 実装箇所 |
|------|-------------|----------|
| 低音完了待機 | `待機中...` | line 1239 |
| 測定完了 | `結果画面で詳細をご確認いただけます` | line 1599 |
| 高音進行 | `高音測定に進みます` | line 1287 |
| 部分結果利用可能 | `低音域のデータでトレーニング開始可能です` | line 1432 |
| 再測定指示 | `再測定ボタンを押してやり直してください` | line 1464 |
| 停止状態 | `待機中...` | line 1676 |
| プログレス継続 | `測定中...` | line 1710 |

---

## 🎵 バッジ状態表示（下部）

### 音域テストバッジアイコン状態

#### **待機状態（Waiting）**
```javascript
function updateBadgeForWaiting(iconType)
```

| アイコン種類 | 画像ファイル | 表示タイミング | 実装箇所 |
|-------------|-------------|---------------|----------|
| 低音待機 | `./icons/arrow-down.png` | 低音測定待機中 | lines 1311, 1624, 1677 |
| 高音待機 | `./icons/arrow-up.png` | 高音測定待機中 | lines 1336, 1518, 1628 |

**CSS状態**:
- `rangeIcon.style.display = 'block'`
- `countdownDisplay.style.display = 'none'`
- `badge.classList.remove('measuring', 'confirmed')`

#### **測定状態（Measuring）**
```javascript
function updateBadgeForMeasuring()
```

**表示変更**:
- バッジに`measuring`クラス追加
- `confirmed`クラス削除
- リトライボタン表示: `retry-measurement-btn.style.display = 'inline-block'`

**実装箇所**: lines 1879-1886

#### **完了状態（Confirmed）**
```javascript
function updateBadgeForConfirmed()
```

**表示変更**:
- バッジに`confirmed`クラス追加
- `measuring`クラス削除

**実装箇所**: lines 1230, 1560, 1841, 1889

#### **失敗状態（Failure）**
```javascript
function updateBadgeForFailure()
```

**表示タイミング**: 測定失敗時の警告表示
**実装箇所**: lines 1264, 1381, 1343

#### **エラー状態（Error）**
```javascript
function updateBadgeForError()
```

**表示タイミング**: 致命的エラー・完全測定失敗時
**実装箇所**: lines 1285, 1481, 1462, 1353
**注意**: 部分結果時（line 1430）は `updateBadgeForConfirmed()` を使用

---

## 🎤 マイクステータス表示

### マイクステータスコンテナ (`#mic-status-container`)

```javascript
function updateMicStatus(status)
```

#### **ステータス種類**

| 状態 | CSSクラス | 表示効果 | 実装箇所 |
|------|----------|----------|----------|
| 待機中 | `standby` | 通常表示 | lines 623, 726, 1435, 1472, 1598, 1673 |
| 録音中 | `recording` | 赤エフェクト | line 658 |

#### **マイクボタン状態連動**

| マイクステータス | ボタンクラス | 条件 |
|-----------------|------------|------|
| 待機中 | `mic-permitted` | `globalState.micPermissionGranted = true` |
| 待機中 | `mic-idle` | `globalState.micPermissionGranted = false` |
| 録音中 | `mic-active` | 音声検出・測定中 |

**実装詳細**: lines 211-254

---

## 🔄 フェーズ別表示パターン

### 完全な測定フロー

#### **1. 初期化フェーズ**
```
Main Status: "マイク入力を検出中..."
Sub Info: "声を出してテストしてください"
Badge: (初期状態)
Mic Status: standby
```

#### **2. 低音測定待機フェーズ**
```
Main Status: "できるだけ低い声で「あー」と発声しましょう"
Sub Info: "安定した声を認識したら自動で測定開始します"
Badge: arrow-down (waiting)
Mic Status: recording
```

#### **3. 低音測定実行フェーズ**
```
Main Status: "そのまま声をキープしましょう"
Sub Info: "低音測定中..."
Badge: measuring (プログレスバー表示)
Mic Status: recording
```

#### **4. 低音測定失敗時**
```
Main Status: "低音測定失敗 - 再測定します (1/3)"
Sub Info: "より大きな声で低い音を出してください"
Badge: failure (警告表示)
Mic Status: recording
```

#### **4-2. 低音測定完了・待機フェーズ**
```
Main Status: "低音測定完了！高音測定に進みます..."
Sub Info: "待機中..."
Badge: confirmed (完了表示)
Mic Status: recording
```

#### **5. 高音測定フェーズ（成功時）**
```
Main Status: "できるだけ高い声で「あー」と発声しましょう"
Sub Info: "安定した声を認識したら自動で測定開始します"
Badge: arrow-up (waiting)
Mic Status: recording
```

#### **5-2. 高音測定実行フェーズ**
```
Main Status: "そのまま声をキープしましょう"
Sub Info: "高音測定中..."
Badge: measuring (プログレスバー表示)
Mic Status: recording
```

#### **6. 測定完了・結果表示**
```
Main Status: (結果表示画面に遷移)
Sub Info: (結果表示画面に遷移)
Badge: confirmed (完了表示)
Mic Status: standby
```

---

## 📋 実装コード対応表

### 主要関数とテキスト更新箇所

#### **メインステータス更新関数**
| 関数名 | 更新内容 | 行番号 |
|--------|----------|--------|
| `startVoiceRangeTest()` | 低音測定開始メッセージ | 707 |
| `startLowPitchMeasurement()` | 測定中メッセージ | 1197 |
| `handleLowPitchMeasurementFailure()` | 失敗・リトライメッセージ | 1265, 1286 |
| `retryLowPitchMeasurement()` | リトライ待機メッセージ | 1307 |
| `startHighPitchPhase()` | 高音測定開始メッセージ | 1516 |
| `startHighPitchMeasurement()` | 高音測定中メッセージ | 1526 |
| `handleHighPitchMeasurementFailure()` | 高音失敗・リトライメッセージ | 1382, 1412 |

#### **バッジ状態更新関数**
| 関数名 | 更新内容 | 呼び出し箇所 |
|--------|----------|-------------|
| `updateBadgeForWaiting()` | 待機アイコン表示 | 1311, 1336, 1518, 1624, 1628, 1677 |
| `updateBadgeForMeasuring()` | 測定プログレス表示 | (暗黙的：測定開始時) |
| `updateBadgeForConfirmed()` | 完了チェックマーク | 1230, 1430, 1560, 1841 |
| `updateBadgeForFailure()` | 失敗警告表示 | 1264, 1381 |
| `updateBadgeForError()` | エラー表示 | 1285, 1481, 1462 |

#### **マイクステータス更新箇所**
| 状況 | ステータス | 行番号 |
|------|----------|--------|
| 初期化完了 | `standby` | 623 |
| 測定開始 | `recording` | 658 |
| 測定完了・停止 | `standby` | 726, 1435, 1472, 1598, 1673 |

---

## 🔍 特記事項・注意点

### **1. 動的変数の表示**
- **リトライカウント**: `${globalState.retryCount}/${globalState.maxRetries}`
- **高音リトライカウント**: `${globalState.highRetryCount}/${globalState.maxRetries}`
- 最大リトライ回数: `3回`（`globalState.maxRetries = 3`）

### **2. フェーズ管理との連動**
- `globalState.currentPhase`の値に基づいて適切なメッセージを表示
- フェーズ遷移時に必ずテキスト更新を実行

### **3. PitchPro v1.3.0統合**
- UI状態管理はアプリケーション側で実行
- PitchProライブラリは音声処理のみ担当
- マイクステータスは独立してアプリケーション側で管理

### **4. エラーハンドリング階層**
1. **Failure**: 測定失敗（リトライ可能）
2. **Error**: 致命的エラー（スキップ・完全失敗）
3. **段階的対応**: 即座対応 → 警告強化 → 代替手段

### **5. CSS連携**
- バッジ状態: `.measuring`, `.confirmed`クラスによる視覚効果
- マイクステータス: `.standby`, `.recording`クラスによる色変化
- アイコン切り替え: `arrow-down.png` ⇔ `arrow-up.png`

---

**Version**: 1.0.0
**Last Updated**: 2025年1月21日
**Based on**: voice-range-test-demo.js実装 + フロー図v2.0.0仕様
**Related Documents**:
- [VOICE_RANGE_TEST_FLOW_DIAGRAM.md](../VOICE_RANGE_TEST_FLOW_DIAGRAM.md)
- [voice-range-test-demo.js](../src/js/voice-range-test-demo.js)