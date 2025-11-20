# 外れ値戦略の根本的再設計 - 完全記録

## 📋 概要

**日付**: 2025-11-20  
**作業**: 外れ値処理ロジックの包括的再設計  
**結論**: 外れ値自動除外を廃止し、警告表示 + ユーザー判断（レッスン削除）に移行

---

## 🔍 歴史的経緯と背景

### Phase 1: 初期実装（レッスン削除機能なし時代）

**背景:**
- レッスン削除機能が存在しなかった
- 測定エラーが評価に混入すると統計が歪む問題
- **解決策**: 外れ値を自動除外して評価精度を保つ

**初期実装:**
```javascript
// evaluation-calculator.js
const deviceErrorMargin = deviceInfo ? this.getDeviceErrorMargin(deviceInfo.quality) : 10;
const outlierThreshold = 150 + deviceErrorMargin;  // 160-175¢

// results-overview-controller.js
const outlierThreshold = 180; // 固定閾値
```

**問題点:**
1. ✅ 2箇所で異なる閾値を使用（160-175¢ vs 180¢）
2. ✅ デバイス品質による動的閾値が複雑

### Phase 2: 下行モード追加による影響

**変更点:**
- 初期: 上行ドレミファソラシドのみ
- 追加: 全モードに下行を追加

**影響:**
- 下行はトレーニング難易度が大幅に上がる
- 上行より明らかに成績が落ちる
- **500¢のずれが実際の実力として頻繁に起こりうる**

**教訓:**
- 閾値150-180¢では実際の弱点音まで除外してしまう
- 下行モードの存在を考慮した閾値設計が必要

### Phase 3: レッスン削除機能の実装

**機能追加:**
- ユーザーが任意のレッスンを削除可能
- localStorage から完全削除
- 統計計算から除外

**設計思想の転換点:**
- **当初**: 削除機能なし → システムが自動除外
- **現在**: 削除機能あり → **ユーザーが判断して削除すべき**

---

## 💡 設計思想の変遷

### 提案1: 800¢閾値での自動除外（最初の提案）

**閾値**: 500¢ → 800¢に変更

**理由:**
- 下行モードでは500¢のずれが頻繁に起こる
- 800¢（8半音）以上は明らかに異常

**ユーザーからの重要な指摘:**
> "下行でトレーニングを行うとかなり難易度が上がり上行よりも明らかに成績が落ちる。  
> 下行の追加により500¢のずれは頻繁に起こりうる可能性があります"

### 提案2: 根本的な問い直し（転換点）

**ユーザーからの本質的な問い:**
> "現在は削除できる機能があるのでそもそも除外する必要があるのかも考察"

**考察結果:**

| アプローチ | メリット | デメリット |
|-----------|---------|-----------|
| **自動除外継続** | ・明らかなエラーを排除<br>・ユーザーが何もしなくても安全 | ・システムが「エラーか実力か」を判断する難しさ<br>・実装の複雑さ |
| **除外廃止（警告のみ）** | ・シンプルな実装<br>・ユーザーが全情報を見て判断<br>・レッスン削除との役割分担が明確 | ・ユーザーが削除を忘れる可能性 |

**結論: 除外廃止・警告のみ（Option C）を採用**

---

## ✅ 最終的な実装方針

### 1. 外れ値自動除外を完全廃止

**評価計算:**
- すべてのデータで平均誤差を計算（除外なし）
- 統計情報も全データで計算

**評価分布:**
- 800¢超のデータは評価分布（Excellent/Good/Pass/Practice）から除外
- 評価分布は4段階のみ維持

### 2. 警告表示システム

**800¢超の音が存在する場合:**

**表示位置:** 詳細分析セクションの後

**警告メッセージ（確定版）:**
```
大きな誤差が検出されました。
正常に測定できなかった可能性があります。
詳細分析で確認し、必要に応じてレッスン削除機能をご利用ください。
```

**文言決定の経緯:**
- 当初案: "マイクの誤動作の可能性"
- **問題**: 原因を「マイク」だけに狭めすぎ
- **実際の原因**: マイク、環境ノイズ、測定システム、ユーザー側（声が出なかった等）
- **最終案**: 「正常に測定できなかった可能性」（包括的・中立的）

### 3. UI視覚表示

**詳細分析での800¢超の音:**
- ❌ 従来: `!`マーク + amber色
- ✅ 新規: 赤背景 + `alert-circle`アイコン + 赤色

**評価分布での扱い:**
- Option A採用: 評価分布から完全除外
- 5段階目（Alert）は追加しない
- 理由: 統計の純粋性を保つ、レッスン削除で対処すべき

---

## 🔧 実装の詳細

### 修正対象ファイル

#### 1. evaluation-calculator.js

**変更前（160-175¢除外）:**
```javascript
// 外れ値フィルタリング（デバイス品質に応じた閾値）
const deviceErrorMargin = deviceInfo ? this.getDeviceErrorMargin(deviceInfo.quality) : 10;
const outlierThreshold = 150 + deviceErrorMargin;

const validErrors = errors.filter(e => e <= outlierThreshold);
const outlierCount = errors.length - validErrors.length;
const outlierFiltered = outlierCount > 0;

// 外れ値除外後の平均誤差計算
let avgError;
if (validErrors.length > 0) {
    avgError = validErrors.reduce((a, b) => a + b, 0) / validErrors.length;
} else {
    avgError = totalError / totalNotes;
}
```

**変更後（除外なし）:**
```javascript
// すべてのデータで平均誤差を計算（除外なし）
const avgError = totalError / totalNotes;

// 800¢超の警告用フラグ（評価計算には影響しない）
const outlierThreshold = 800;
const outlierCount = errors.filter(e => e > outlierThreshold).length;
const outlierFiltered = outlierCount > 0;
```

#### 2. results-overview-controller.js

**変更1: 平均誤差計算（除外なし）**
```javascript
// 変更前
const validErrors = errors.filter(e => e <= outlierThreshold);
const outlierCount = errors.length - validErrors.length;
let avgError;
if (validErrors.length > 0) {
    avgError = validErrors.reduce((sum, e) => sum + e, 0) / validErrors.length;
} else {
    avgError = errors.reduce((sum, e) => sum + e, 0) / errors.length;
}

// 変更後
const outlierThreshold = 800;
const avgError = errors.reduce((sum, e) => sum + e, 0) / errors.length;
const outlierCount = errors.filter(e => e > outlierThreshold).length;
const outlierFiltered = outlierCount > 0;
```

**変更2: 詳細分析UI（赤背景 + alert-circle）**
```javascript
// 800¢超の音の判定
const isOutlier = absError > 800;

// 外れ値の場合
if (isOutlier) {
    evaluation = {
        icon: 'alert-circle',
        color: 'text-red-400',  // amber → red
        label: '測定エラー'
    };
    noteElement.classList.add('bg-red-900', 'bg-opacity-20');  // 赤背景追加
}
```

**変更3: 警告メッセージ**
```javascript
function displayOutlierExplanationOverview(outlierFiltered, outlierCount, outlierThreshold) {
    if (outlierFiltered) {
        explanationContainer.innerHTML = `
            <div class="warning-alert">
                <i data-lucide="alert-circle" class="text-red-400"></i>
                <div>
                    <p><strong>大きな誤差について</strong></p>
                    <p>大きな誤差が検出されました。正常に測定できなかった可能性があります。詳細分析で確認し、必要に応じてレッスン削除機能をご利用ください。</p>
                </div>
            </div>
        `;
    }
}
```

#### 3. DistributionChart.js

**変更: 800¢超を評価分布から除外**
```javascript
static calculateDistribution(sessionData) {
    const distribution = {
        excellent: 0,
        good: 0,
        pass: 0,
        practice: 0,
        total: 0
    };

    sessionData.forEach(session => {
        if (!session.pitchErrors || !Array.isArray(session.pitchErrors)) {
            return;
        }

        session.pitchErrors.forEach(error => {
            const absError = Math.abs(error.errorInCents);
            
            // 800¢超は評価分布から除外
            if (absError > 800) {
                return;
            }
            
            distribution.total++;
            const evaluation = window.EvaluationCalculator.evaluatePitchError(absError);
            distribution[evaluation.level]++;
        });
    });

    return distribution;
}
```

---

## 🎯 重要な設計判断

### 判断1: なぜ除外を廃止したのか？

**理由:**
1. **レッスン削除機能の存在**: ユーザーが判断して削除できる
2. **透明性**: すべてのデータを見せることで信頼性向上
3. **シンプルさ**: 複雑な閾値ロジック不要
4. **役割分担**: システムは警告、ユーザーが判断・削除

### 判断2: なぜ800¢なのか？

**根拠:**
1. **8半音（半オクターブ以上）**: 明らかに異常
2. **下行モード対応**: 500¢は実力として起こりうる
3. **データ収集前提**: 実データを元に最適化予定

### 判断3: なぜ評価分布からは除外するのか？

**理由:**
1. **統計の純粋性**: 測定エラーを含めると分布が歪む
2. **4段階評価の維持**: Excellent/Good/Pass/Practiceの明確性
3. **削除前提**: レッスンごと削除すべきデータ

### 判断4: 文言はなぜ「正常に測定できなかった可能性」なのか？

**考慮した要因:**
- マイクの誤動作（マイクに触れた、衣擦れ）
- 環境ノイズ（周囲の音の混入）
- 測定システム（PitchProの誤検出）
- ユーザー側（声が出なかった、途中で途切れた）

**結論:**
- 特定の原因を断定しない
- 包括的で中立的な表現
- ユーザーの実力を否定しない配慮

---

## 📊 データ収集と今後の最適化

### 収集すべきデータ

1. **800¢超の発生頻度**: 全音の何%か
2. **モード別の発生率**: 上行 vs 下行
3. **ユーザーの削除率**: 警告を見て実際に削除した割合
4. **最適閾値の検証**: 800¢が適切か、調整が必要か

### 最適化の方向性

**閾値の見直し:**
- 800¢で測定エラーを十分カバーできているか
- 実際の弱点音（500-800¢）の分布を確認

**UXの改善:**
- 警告メッセージの効果測定
- レッスン削除への誘導率

---

## ✅ 実装チェックリスト

- [ ] evaluation-calculator.js: 外れ値除外ロジック削除
- [ ] results-overview-controller.js: 平均誤差計算を全データに変更
- [ ] results-overview-controller.js: 800¢超の音を赤背景表示
- [ ] results-overview-controller.js: 警告メッセージ更新
- [ ] DistributionChart.js: 800¢超を評価分布から除外
- [ ] 動作確認: 800¢超のデータで警告表示
- [ ] 動作確認: 評価分布に800¢超が含まれないことを確認
- [ ] Git commit: 変更を記録

---

## 📝 まとめ

**設計思想の転換:**
- 旧: システムが自動除外 → ユーザーを守る
- 新: システムは警告のみ → ユーザーが判断・削除

**メリット:**
- シンプルで透明性の高い実装
- レッスン削除機能との明確な役割分担
- データ収集による継続的な最適化が可能

**重要な教訓:**
- 機能追加（レッスン削除）により既存機能（外れ値除外）の存在意義が変わる
- 「測定エラーか実力か」の判断は本来ユーザーが行うべき
- 下行モードの難易度を考慮した閾値設計が必要
