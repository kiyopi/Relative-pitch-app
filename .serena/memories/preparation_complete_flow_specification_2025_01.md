# トレーニング準備 - 完全フロー仕様書

## 🎯 概要
preparation.htmlを2つのファイルに分割し、PitchPro二重初期化問題を解決しつつ、ユーザーの状況に応じた適切なフローを提供する。

**重要な設計方針:**
- **ユーザーには一つの流れる体験として提供**
- **Step1/Step2の分割は技術的解決策（ユーザーに意識させない）**
- **ページタイトル・ステップインジケーターは統一維持**

## 📁 ファイル構成
```
preparation-step1.html  # マイク許可・音声テスト
preparation-step2.html  # 音域テスト・結果表示
```

## 🌊 完全フロー図

### **Step1: マイク許可・音声テスト**

#### **1-1. 初期状態**
- ✅ **ページタイトル**: 「トレーニング前の準備 - 8va相対音感トレーニング」（変更なし）
- ✅ **ステップインジケーター**: 元の3ステップ表示のまま（変更なし）
- ✅ マイク許可セクション表示
- ❌ 音声テストセクション非表示

#### **1-2. マイク許可実行**
```
ユーザーアクション: 「マイクを許可」ボタンクリック
↓
navigator.mediaDevices.getUserMedia() 実行
↓
成功時: localStorage.setItem('micPermissionGranted', 'true')
↓
UI更新: 既存のステップインジケーター動作（変更なし）
↓
音声テストセクション表示
```

#### **1-3. 音声テスト実行**
```
PitchPro AudioDetectionComponent 初期化
↓
音量バー・周波数検出表示
↓
ユーザー発声確認
↓
音声検出成功
↓
localStorage.setItem('audioTestCompleted', 'true')
```

#### **1-4. 音声テスト完了時の分岐処理**
```
音声テスト完了
↓
localStorage確認: voiceRangeData の存在チェック
```

**分岐A: 音域データなし**
```
voiceRangeData が null/undefined
↓
「音域テストを開始」ボタン表示（既存ボタンのテキスト変更）
↓
ユーザークリック
↓
window.location.href = 'preparation-step2.html'
```

**分岐B: 音域データ保存済み**
```
voiceRangeData が存在
↓
既存の音域データ表示セクション表示:
- 音域範囲 (例: A2 - F5)
- オクターブ数 (例: 2.6オクターブ)
- 設定日時
↓
既存の2つのボタン表示:
1. 「音域を再測定」→ preparation-step2.html
2. 「この結果でトレーニング開始」→ training.html
```

---

### **Step2: 音域テスト・結果表示**

#### **2-1. 初期状態・前提チェック**
```
ページ読み込み
↓
localStorage確認:
- micPermissionGranted
- audioTestCompleted
↓
未完了の場合: window.location.href = 'preparation-step1.html'
↓
完了済みの場合: Step2開始
```

#### **2-2. Step2 UI状態**
- ✅ **ページタイトル**: 「トレーニング前の準備 - 8va相対音感トレーニング」（変更なし）
- ✅ **ステップインジケーター**: 元の3ステップ表示のまま（変更なし）
- ✅ Step1完了状態の表示
- ✅ 音域テスト実行エリア表示

#### **2-3. 音域テスト実行**
```
独立したPitchPro AudioDetectionComponent初期化
↓
音域テスト開始
↓
最低音・最高音測定
↓
測定完了
↓
結果表示・localStorage保存
```

#### **2-4. 音域テスト完了**
```
測定結果保存:
localStorage.setItem('voiceRangeData', JSON.stringify({
  lowNote: 'A2',
  highNote: 'F5',
  octaves: 2.6,
  timestamp: new Date().toISOString()
}))
↓
「この結果でトレーニング開始」ボタン表示
↓
ユーザークリック
↓
window.location.href = '../training.html'
```

---

## 🗂️ localStorage データ仕様

### **Step1で保存するデータ**
```javascript
localStorage.setItem('micPermissionGranted', 'true');
localStorage.setItem('audioTestCompleted', 'true');
localStorage.setItem('micPermissionTimestamp', new Date().toISOString());
localStorage.setItem('audioTestTimestamp', new Date().toISOString());
```

### **Step2で保存するデータ**
```javascript
localStorage.setItem('voiceRangeData', JSON.stringify({
  lowNote: 'A2',        // 最低音
  highNote: 'F5',       // 最高音
  octaves: 2.6,         // オクターブ数
  range: 'A2 - F5',     // 音域範囲文字列
  timestamp: '2025-01-28T15:30:00.000Z'
}));
localStorage.setItem('rangeTestCompleted', 'true');
```

---

## 🔄 エラーハンドリング・特殊ケース

### **直接Step2アクセス**
```
preparation-step2.html に直接アクセス
↓
localStorage確認
↓
Step1未完了: preparation-step1.html へリダイレクト
↓
エラーメッセージ: 「まずマイク許可と音声テストを完了してください」
```

### **マイク許可拒否**
```
getUserMedia() エラー
↓
エラーメッセージ表示
↓
「再試行」ボタン表示
↓
ブラウザ設定ガイド表示
```

### **音域データ不整合**
```
voiceRangeData 存在するが不正なデータ
↓
データ削除: localStorage.removeItem('voiceRangeData')
↓
「音域テストを再実行してください」表示
↓
Step2へ遷移
```

---

## 🎯 PitchPro統合仕様

### **Step1: AudioDetectionComponent**
```javascript
// Step1専用インスタンス
const audioDetector1 = new AudioDetectionComponent({
  volumeBarSelector: '#volume-progress',
  volumeTextSelector: '#volume-value',
  frequencySelector: '#frequency-value'
});
```

### **Step2: AudioDetectionComponent**
```javascript
// Step2専用インスタンス（完全に独立）
const audioDetector2 = new AudioDetectionComponent({
  volumeBarSelector: '#range-volume-progress',
  volumeTextSelector: '#range-volume-value',
  frequencySelector: '#range-frequency-value'
});
```

### **独立性保証**
- 各ページで独立したPitchProインスタンス
- ページ遷移時に前のインスタンスを完全に破棄
- 二重初期化エラーの完全回避

---

## 📱 UI/UX仕様

### **ユーザー体験の一貫性**
- **ページタイトル統一**: 両ページとも「トレーニング前の準備」
- **ステップインジケーター統一**: 3ステップ表示を維持
- **自然な流れ**: Step1/Step2の分割をユーザーに意識させない

### **ステップインジケーター動作**
- 既存の動作を維持（test-pitchpro-cycle.htmlの動作そのまま）
- Step1完了時: Step1 → 完了、Step2 → アクティブ
- Step2完了時: Step2 → 完了、Step3 → アクティブ

### **アニメーション・フィードバック**
- セクション切り替え: 既存のフェードイン/アウト維持
- ボタン状態: 既存のローディング表示維持
- 音量バー: 既存のリアルタイム更新維持
- 成功表示: 既存のチェックマークアニメーション維持

---

## 🧪 テスト項目

### **Step1単体テスト**
- [ ] マイク許可動作確認
- [ ] 音声テスト動作確認
- [ ] localStorage保存確認
- [ ] 分岐A: Step2遷移確認
- [ ] 分岐B: 音域データ表示確認
- [ ] 分岐B: トレーニング開始確認

### **Step2単体テスト**
- [ ] Step1完了チェック動作確認
- [ ] 音域テスト動作確認
- [ ] 結果表示確認
- [ ] localStorage保存確認
- [ ] training.html遷移確認

### **統合テスト**
- [ ] Step1→Step2完全フロー
- [ ] 音域データあり→分岐B→再測定フロー
- [ ] 音域データあり→分岐B→トレーニング開始フロー
- [ ] エラーケース処理確認

---

## 📋 実装優先度

### **Phase 1: Step1最小限修正**
1. **音声テスト完了時の分岐処理実装**
2. **localStorage連携強化**
3. **Step2遷移処理追加**

### **Phase 2: Step2最小限修正**
1. **Step1完了チェック実装**
2. **直接アクセス時のリダイレクト**
3. **training.html遷移確認**

### **Phase 3: 統合・最適化**
1. **フロー統合テスト**
2. **エラーハンドリング強化**
3. **既存機能の動作確認**

---

## 🎯 重要な修正方針

### **変更しないもの（UX一貫性維持）**
- ❌ ページタイトル変更
- ❌ ステップインジケーター構造変更
- ❌ 既存UI要素の大幅変更
- ❌ 既存アニメーション・フィードバック変更

### **最小限の変更で実現**
- ✅ 分岐処理ロジック追加
- ✅ localStorage確認処理追加
- ✅ ページ遷移処理追加
- ✅ 不要セクションの非表示制御

---

## 📅 作成日
2025年1月28日

## 📝 状態
仕様確定（UX一貫性重視版） - 実装準備完了

## 🔗 関連ファイル
- ベースファイル: test-pitchpro-cycle.html
- ベースファイル: voice-range-test-demo.html
- バックアップ: backup-base-files-20250128/