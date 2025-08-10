# 相対音感トレーニングアプリ - 技術仕様書

**バージョン**: 2.0.0  
**作成日**: 2025-08-07  
**更新日**: 2025-08-07  
**用途**: 新技術スタック統合版 - Mantine採用・Cloudflare・ライブラリ化対応

---

## 🎯 技術概要（v2.0.0 統合版）

### 音声処理技術スタック
- **音程検出**: Pitchy v4 (McLeod Pitch Method)
- **音声処理**: Web Audio API
- **フィルタリング**: 3段階ノイズリダクション
- **基音補正**: 動的オクターブ補正システム
- **品質保証**: ±5セント精度達成

### 新技術スタック追加（v2.0.0）
- **✅ デザインシステム**: **Mantine v7.6.0** 採用確定
- **✅ デプロイ**: **Cloudflare Pages** 移行確定
- **✅ ライブラリ化**: **音響技術の完全コンポーネント化** 確定
- **アイコン**: Tabler Icons + 音楽カスタムセット
- **CDN**: Cloudflare CDN（グローバル配信）

---

## 🔧 1. ノイズ除去・フィルタリング仕様

### 1.1 3段階フィルタリングシステム

#### ハイパスフィルター（低周波ノイズ除去）
```javascript
// 80Hz以下の低周波ノイズカット
const highpass = audioContext.createBiquadFilter();
highpass.type = 'highpass';
highpass.frequency.setValueAtTime(80, audioContext.currentTime);
highpass.Q.setValueAtTime(0.7, audioContext.currentTime);
```

#### ローパスフィルター（高周波ノイズ除去）
```javascript
// 800Hz以上の高周波ノイズカット（人間音声特化）
const lowpass = audioContext.createBiquadFilter();
lowpass.type = 'lowpass';
lowpass.frequency.setValueAtTime(800, audioContext.currentTime);
lowpass.Q.setValueAtTime(0.7, audioContext.currentTime);
```

#### ノッチフィルター（電源ノイズ除去）
```javascript
// 60Hz電源ノイズカット
const notch = audioContext.createBiquadFilter();
notch.type = 'notch';
notch.frequency.setValueAtTime(60, audioContext.currentTime);
notch.Q.setValueAtTime(10, audioContext.currentTime);
```

### 1.2 フィルターチェーン構成
```
マイク入力 → ハイパス(80Hz) → ローパス(800Hz) → ノッチ(60Hz) → ゲイン → 音程検出
```

### 1.3 フィルター効果
- **S/N比改善**: 信号対雑音比の向上
- **基音強調**: 倍音に対する基音の相対強度向上
- **周波数特性最適化**: 人間の音声帯域(80-800Hz)への特化
- **環境ノイズ除去**: 風音、振動、電源ノイズの除去

---

## 🎵 2. 倍音・ハーモニクス処理仕様

### 2.1 動的オクターブ補正システム

#### 基音候補生成
```javascript
const fundamentalCandidates = [
  detectedFreq,           // そのまま（基音の可能性）
  detectedFreq / 2.0,     // 1オクターブ下（2倍音 → 基音）
  detectedFreq / 3.0,     // 3倍音 → 基音
  detectedFreq / 4.0,     // 4倍音 → 基音
  detectedFreq * 2.0,     // 1オクターブ上（低く歌った場合）
];
```

#### 補正トリガー条件
```javascript
// 動的しきい値計算
const maxTargetFreq = Math.max(...targetFrequencies);
const correctionThreshold = maxTargetFreq * 0.55;

// オクターブ補正判定
if (pitch < correctionThreshold && pitch * 2 >= correctedMin && pitch * 2 <= correctedMax) {
    correctedPitch = pitch * 2;
}
```

### 2.2 基音評価システム（3要素統合）

#### 人間音域範囲チェック（40%重み）
```javascript
const vocalRange = { min: 130.81, max: 1046.50 }; // C3-C6
const inVocalRange = freq >= vocalRange.min && freq <= vocalRange.max;
const vocalRangeScore = inVocalRange ? 1.0 : 0.0;
```

#### 前回検出との連続性評価（40%重み）
```javascript
const continuityScore = previousFreq 
  ? 1.0 - Math.min(Math.abs(freq - previousFreq) / previousFreq, 1.0)
  : 0.5;
```

#### 音楽的妥当性評価（20%重み）
```javascript
const calculateMusicalScore = (frequency) => {
  const C4 = 261.63; // Middle C
  const semitonesFromC4 = Math.log2(frequency / C4) * 12;
  const nearestSemitone = Math.round(semitonesFromC4);
  const distanceFromSemitone = Math.abs(semitonesFromC4 - nearestSemitone);
  
  // 半音階に近いほど高スコア（±50セント以内で最高点）
  return Math.max(0, 1.0 - (distanceFromSemitone / 0.5));
};
```

### 2.3 基音安定化システム
```javascript
const stabilizeFrequency = (currentFreq, historyBuffer, stabilityThreshold = 0.1) => {
  // 履歴バッファに追加（最大5フレーム保持）
  historyBuffer.push(currentFreq);
  if (historyBuffer.length > 5) historyBuffer.shift();
  
  // 中央値ベースの安定化（外れ値除去）
  const sorted = [...historyBuffer].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  
  // 急激な変化を抑制（段階的変化）
  const maxChange = median * stabilityThreshold;
  return Math.abs(currentFreq - median) > maxChange 
    ? median + Math.sign(currentFreq - median) * maxChange
    : currentFreq;
};
```

---

## 🎤 3. Pitchy音程検出ライブラリ仕様

### 3.1 ライブラリ概要
- **バージョン**: Pitchy v4
- **アルゴリズム**: McLeod Pitch Method (MPM)
- **特徴**: 高精度基音検出、倍音誤検出の自動回避
- **CDN**: `https://esm.sh/pitchy@4`

### 3.2 初期化・検出処理
```javascript
// ライブラリ読み込み
import { PitchDetector } from "https://esm.sh/pitchy@4";

// PitchDetector初期化
const pitchDetector = PitchDetector.forFloat32Array(analyzer.fftSize); // fftSize = 2048

// 周波数検出実行
const timeData = new Float32Array(analyzer.fftSize);
analyzer.getFloatTimeDomainData(timeData);
const [pitch, clarity] = pitchDetector.findPitch(timeData, audioContext.sampleRate);
```

### 3.3 検出条件・精度
- **周波数範囲**: 80Hz - 1200Hz
- **確信度しきい値**: 0.1以上
- **検出精度**: ±5セント精度達成
- **フレームレート**: 約60FPS (requestAnimationFrame)
- **FFTサイズ**: 2048

### 3.4 精度達成結果
- **導入前**: FFTピーク検出、1000+セント誤差
- **導入後**: McLeod Pitch Method、5セント精度
- **解決問題**: 倍音誤検出、オクターブエラー、6秒タイムアウト、ノイズ干渉

---

## 🎹 4. 対象音階・周波数仕様

### 4.1 ドレミファソラシド音階（C4-C5）
```javascript
const SCALE_FREQUENCIES = {
  'ド': 261.63,   // C4
  'レ': 293.66,   // D4
  'ミ': 329.63,   // E4
  'ファ': 349.23, // F4
  'ソ': 392.00,   // G4
  'ラ': 440.00,   // A4
  'シ': 493.88,   // B4
  'ド(高)': 523.25 // C5
};
```

### 4.2 相対音程関係（開発者向け）
```javascript
// 基音からの半音間隔
const SCALE_INTERVALS = [
  0,   // ド (基音)
  2,   // レ (基音+2半音) - +200セント
  4,   // ミ (基音+4半音) - +400セント
  5,   // ファ(基音+5半音) - +500セント
  7,   // ソ (基音+7半音) - +700セント
  9,   // ラ (基音+9半音) - +900セント
  11,  // シ (基音+11半音) - +1100セント
  12   // ド (基音+12半音) - +1200セント
];
```

---

## 📊 5. 判定精度・評価基準

### 5.1 段階的評価システム
```javascript
const SCORE_GRADES = {
  PERFECT:   { range: '±5¢',   score: 100, description: '完璧（プロレベル）' },
  EXCELLENT: { range: '±10¢',  score: '90-95', description: '優秀' },
  GOOD:      { range: '±25¢',  score: '60-90', description: '良好' },
  FAIR:      { range: '±50¢',  score: '30-60', description: '可' },
  POOR:      { range: '±100¢', score: '10-30', description: '要改善' },
  FAILED:    { range: '>±100¢', score: '0-10', description: '不合格' }
};
```

### 5.2 モード別判定基準
- **初級モード**: ±50セント以内で合格
- **中級モード**: ±50セント以内で合格
- **上級モード**: ±30セント以内で合格
- **プロレベル**: ±10セント以内

---

## 🎵 6. 統合進行ガイドシステム仕様

### 6.1 マイクテストページ音域テスト機能
- **マイク許可**: ダイアログ表示なしの簡素化
- **音量メーター**: 固定65%表示（気を散らさない設計）
- **音域テスト機能**:
  - **低音テスト**: C3(130Hz)から半音ずつ下降
  - **高音テスト**: C5(523Hz)まで半音ずつ上昇
  - **音域判定**: 快適に歌える範囲を自動検出
  - **推奨基音算出**: 快適音域の中央値±1オクターブ範囲で提案
- **トレーニング開始**: 音域テスト完了後に直接トレーニングページへ遷移

### 6.2 統合進行ガイドフロー
```
基音再生(2.0秒) → 休憩(0.5秒) → ドレミガイド(5.3秒) → 完了
```

#### Phase 1: 準備バー進行（2.5秒）
```javascript
const preparationTime = 2500;  // 基音再生2.0秒 + 休憩0.5秒
let elapsed = 0;
const updateInterval = 50; // 50ms間隔で更新

// 準備バーの進行
const timer = setInterval(() => {
  elapsed += updateInterval;
  const percentage = (elapsed / preparationTime) * 100;
  document.getElementById('preparation-fill').style.width = percentage + '%';
}, updateInterval);
```

#### Phase 2: ドレミガイドアニメーション（5.3秒）
```javascript
const notes = document.querySelectorAll('.note-circle');
let currentIndex = 1; // レから開始（ドは既にアクティブ）
const noteInterval = 662.5; // 5300ms ÷ 8音 = 662.5ms per note

const interval = setInterval(() => {
  // 前の音をピンク固定状態に変更
  if (currentIndex > 0) {
    notes[currentIndex - 1].classList.remove('current');
    notes[currentIndex - 1].classList.add('completed-pink');
  }
  
  // 現在の音をアクティブに
  if (currentIndex < notes.length) {
    notes[currentIndex].classList.add('current');
    currentIndex++;
  }
}, noteInterval);
```

### 6.3 視覚的要素仕様

#### ドレミガイド円（メイン要素）
- **サイズ**: 70px × 70px（PC）/ 55px × 55px（モバイル）
- **アクティブ状態**: ピンク色（#ff69b4）+ 1.4倍拡大 + 光るエフェクト
- **完了状態**: ピンク固定（completed-pink）
- **リップル効果**: 波紋アニメーション（2重）

#### 統合進行ガイド領域
- **境界**: 3-4px青枠（#007bff）
- **フォーカスモード**: 背景色変更（#ffe0f0）
- **レスポンシブ**: iPhone SE（320px）まで対応

### 6.4 リアルタイム処理フロー
```
音声入力 → フィルタリング → Pitchy検出 → 倍音補正 → 安定化 → 評価 → UI更新
```

### 6.5 パフォーマンス要件
- **検出間隔**: requestAnimationFrame（約60FPS）
- **処理時間**: 各フレーム100ms以内
- **安定化**: 5フレーム連続安定検出
- **メモリ効率**: 履歴バッファ最大5フレーム
- **ガイド精度**: 662.5ms間隔の正確なタイミング制御

### 6.6 デバイス最適化
```javascript
// iPad/iPhone検出と最適化
const isIOS = /iPhone|iPad/.test(navigator.userAgent) || 
              (/Macintosh/.test(navigator.userAgent) && 'ontouchend' in document);

const audioConstraints = {
  audio: {
    echoCancellation: false,
    noiseSuppression: false,
    autoGainControl: false,
    sampleRate: 44100,
    channelCount: 1,
    ...(isIOS && {
      // iOS専用最適化設定
      latency: 0.1,
      volume: 1.0
    })
  }
};
```

---

## 🛠️ 7. エラーハンドリング・フォールバック

### 7.1 Pitchyライブラリフォールバック
```javascript
// Pitchy読み込み失敗時は従来のFFTピーク検出に自動フォールバック
let pitchDetector = null;

try {
  pitchDetector = PitchDetector.forFloat32Array(fftSize);
} catch (error) {
  console.warn('Pitchy読み込み失敗 - FFTフォールバック使用');
  // 従来のFFTピーク検出処理
}
```

### 7.2 音程検出エラー対応
- **無効周波数**: clarity < 0.1 または範囲外の場合はスキップ
- **検出不能**: 前回値を使用または「検出中...」表示
- **急激変化**: 安定化システムで段階的変化に制限

---

## 📱 8. ブラウザ・デバイス対応

### 8.1 対応ブラウザ
- **Chrome/Edge**: 完全対応
- **Firefox**: 完全対応  
- **Safari**: 完全対応（出力先接続による対応済み）
- **モバイル Safari**: マイクアクセス許可必要

### 8.2 デバイス別最適化
- **PC**: 標準設定（感度1.0x）
- **iPhone**: 高感度設定（感度3.0x）
- **iPad**: 超高感度設定（感度7.0x）

---

## 🔍 9. デバッグ・監視機能

### 9.1 リアルタイム検出ログ
```javascript
if (frameCount % 60 === 0) { // 1秒に1回
  console.log(`🔍 Pitchy検出: pitch=${pitch?.toFixed(1)}Hz, clarity=${clarity?.toFixed(3)}`);
}
```

### 9.2 補正ログ
```javascript
if (frameCount % 60 === 0) {
  console.log(`🔧 動的オクターブ補正: ${pitch.toFixed(1)}Hz → ${correctedPitch.toFixed(1)}Hz`);
}
```

### 9.3 フィルター効果監視
- フィルター前後の周波数スペクトラム可視化
- ノイズ成分の定量的分析
- 音量レベル改善の数値表示

---

## 📊 10. データ永続化・共有仕様

### 10.1 localStorage データ構造

#### メインデータ (TrainingProgress)
```typescript
interface TrainingProgress {
  // システム情報
  mode: 'random' | 'continuous' | 'chromatic';
  version: string;                    // データバージョン（現在: "1.0.0"）
  createdAt: string;                  // ISO8601形式
  lastUpdatedAt: string;              // ISO8601形式

  // セッション管理
  sessionHistory: SessionResult[];    // 完了セッション履歴（最大8件）
  currentSessionId: number;           // 現在のセッション番号（1-8）
  isCompleted: boolean;               // 8セッション完了判定

  // 基音管理
  availableBaseNotes: BaseNote[];     // 使用可能基音リスト
  usedBaseNotes: BaseNote[];          // 使用済み基音リスト

  // 総合評価（8セッション完了時のみ）
  overallGrade?: Grade;               // S-E級総合評価
  overallAccuracy?: number;           // 全体精度平均
  totalPlayTime?: number;             // 総プレイ時間（秒）
}
```

#### localStorage キー構成
```typescript
// メインデータ
'pitch-training-random-progress-v1'      // ランダムモード進行状況
'pitch-training-continuous-progress-v1'  // 連続モード進行状況
'pitch-training-chromatic-progress-v1'   // 12音階モード進行状況

// システムデータ
'mic-test-completed'                     // マイクテスト完了フラグ

// バックアップデータ
'pitch-training-progress-backup'         // メインデータのバックアップ
'completed-cycle-{timestamp}'            // 完了サイクルの記録
```

### 10.2 S-E級総合評価システム

```javascript
function calculateOverallGrade(sessionHistory: SessionResult[]): Grade {
  const gradeCount = sessionHistory.reduce((acc, session) => {
    acc[session.grade] = (acc[session.grade] || 0) + 1;
    return acc;
  }, { excellent: 0, good: 0, pass: 0, needWork: 0 });

  const excellentRatio = gradeCount.excellent / 8;
  const goodPlusRatio = (gradeCount.excellent + gradeCount.good + gradeCount.pass) / 8;

  // S-E級判定ロジック
  if (excellentRatio >= 0.5 && goodPlusRatio >= 0.875) return 'S';
  if (excellentRatio >= 0.375 && goodPlusRatio >= 0.75) return 'A';
  if (excellentRatio >= 0.25 && goodPlusRatio >= 0.625) return 'B';
  if (goodPlusRatio >= 0.5) return 'C';
  if (goodPlusRatio >= 0.25) return 'D';
  return 'E';
}
```

### 10.3 健康確認システム

#### チェック項目
- **セッションID妥当性**: 1-8の範囲内確認
- **セッション履歴整合性**: 最大8件確認
- **完了状態整合性**: isCompletedフラグと履歴件数の整合性
- **使用基音リスト確認**: 履歴との整合性
- **リロード検出**: セッション途中リロードの検出と処理

---

## 🌐 11. SNS共有機能仕様

### 11.1 対象SNSプラットフォーム
- **Twitter/X**: テキスト + 画像投稿
- **Facebook**: テキスト + 画像投稿  
- **LINE**: テキスト + 画像共有
- **Instagram Stories**: 画像 + テキスト投稿

### 11.2 共有データ構造
```typescript
interface ShareData {
  text: string;           // 共有テキスト
  url: string;           // アプリURL
  imageUrl?: string;     // 生成画像URL
  hashtags?: string[];   // ハッシュタグ
  customMessage?: string; // ユーザーカスタムメッセージ
}

interface TrainingShareContent {
  mode: 'random' | 'continuous' | 'chromatic';
  score: number;
  accuracy: number;
  completionTime: number;
  achievements: Achievement[];
  level: number;
  rank: string;
}
```

### 11.3 結果画像生成システム

#### 画像仕様
- **サイズ**: 1080x1080px（Instagram最適）
- **内容**: スコア、精度、達成バッジ、モード情報
- **テーマ**: light/dark/gradient選択可能
- **QRコード**: アプリURLの埋め込み（オプション）

---

## 🎨 12. Mantineデザインシステム技術仕様（v2.0.0 新採用）

### 12.1 Mantine技術スタック
```javascript
// Mantine v7.6.0 統合設定
const mantineConfig = {
  version: "7.6.0",
  cdn_base: "https://cdn.jsdelivr.net/npm/@mantine/core@7.6.0/",
  styles: "styles.css",
  icons: "tabler-icons@1.35.0",
  
  theme_customization: {
    colors: {
      // 音階専用カラーパレット
      note_do: "#ef4444",     // ド - 赤
      note_re: "#f97316",     // レ - オレンジ
      note_mi: "#eab308",     // ミ - 黄色
      note_fa: "#22c55e",     // ファ - 緑
      note_so: "#06b6d4",     // ソ - シアン
      note_la: "#3b82f6",     // ラ - 青
      note_si: "#8b5cf6",     // シ - 紫
      note_do_high: "#ec4899" // 高ド - ピンク
    },
    
    spacing: {
      training: "16px",
      session: "24px",
      result: "32px"
    },
    
    radius: {
      button: "8px",
      card: "12px",
      modal: "16px"
    }
  }
};
```

### 12.2 音楽教育カスタマイゼーション
```css
/* 音楽教育テーマ CSS */
:root {
  /* Mantineカラーオーバーライド */
  --mantine-color-blue-6: #6366f1;     /* 学習集中色 */
  --mantine-color-green-6: #10b981;    /* 成功・正解色 */
  --mantine-color-yellow-6: #f59e0b;   /* 注意・練習中色 */
  --mantine-color-red-6: #ef4444;      /* エラー・要改善色 */
  
  /* グラデーションテーマ */
  --gradient-learning: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  --gradient-success: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
  --gradient-focus: linear-gradient(135deg, #ff6b6b 0%, #feca57 100%);
}

/* カスタムコンポーネント */
.training-card {
  background: var(--mantine-color-white);
  border: 1px solid var(--mantine-color-gray-3);
  border-radius: var(--mantine-radius-md);
  transition: all 0.2s ease;
}

.note-button {
  border-radius: 50%;
  width: 60px;
  height: 60px;
  font-size: 18px;
  font-weight: 600;
  transition: all 0.15s ease;
}

.progress-indicator {
  background: var(--gradient-learning);
  border-radius: 20px;
  height: 8px;
}
```

---

## 🌍 13. Cloudflareデプロイ技術仕様（v2.0.0 新採用）

### 13.1 Cloudflare Pages設定
```yaml
# wrangler.toml - Cloudflare設定
name = "relative-pitch-app"
compatibility_date = "2024-01-01"

[build]
command = "npm run build"
publish = "dist"

[build.environment_variables]
NODE_ENV = "production"

# カスタムドメイン設定
custom_domain = "pitch.example.com"

# キャッシュ最適化
[cache]
static_assets = "1y"    # 静的アセット
hash_files = "1y"       # JS/CSSファイル  
index_html = "1h"       # HTMLファイル
```

### 13.2 パフォーマンス最適化
```javascript
// Cloudflare最適化設定
const cloudflareOptimization = {
  compression: {
    brotli: true,        // Brotli圧縮有効
    gzip: true,          // Gzipフォールバック
    minify: {
      html: true,
      css: true,
      js: true
    }
  },
  
  caching: {
    browser_cache_ttl: 31536000,  // 1年
    edge_cache_ttl: 86400,        // 24時間
    development_mode: false       // 本番時は無効
  },
  
  security: {
    always_https: true,
    ssl_mode: "full_strict",
    tls_version: "1.3",
    hsts_enabled: true
  },
  
  analytics: {
    web_analytics: true,   // Cloudflare Analytics
    performance_insights: true,
    real_user_monitoring: true
  }
};
```

---

## 🔗 14. ダイレクトアクセス機能仕様（v2.0.0 新機能）

### 14.1 概要とアーキテクチャ
**ダイレクトアクセス機能**: URLを直接入力してトレーニングページにアクセスする機能

```typescript
// ダイレクトアクセス対応URL
const directAccessURLs = [
  '/training/random',      // ランダム基音モード
  '/training/continuous',  // 連続チャレンジモード
  '/training/chromatic',   // 12音階モード
  '/settings',            // 設定ページ
  '/about',              // アプリについて
  '/help'                // ヘルプ
];
```

### 14.2 マイク許可状態管理
```typescript
// マイク許可チェックシステム
class PermissionChecker {
  async checkMicrophonePermission(): Promise<boolean> {
    // navigator.permissions API使用（対応ブラウザ）
    if ('permissions' in navigator) {
      const permission = await navigator.permissions.query({ 
        name: 'microphone' as PermissionName 
      });
      return permission.state === 'granted';
    }
    
    // フォールバック: localStorage チェック
    const hasCompletedMicTest = localStorage.getItem('mic-test-completed');
    return hasCompletedMicTest === 'true';
  }
}
```

### 14.3 自動リダイレクトフロー
```typescript
// SPAルーター実装
class AppRouter {
  async navigate(path: string) {
    // ダイレクトアクセス判定
    if (this.isTrainingPath(path)) {
      const hasPermission = await this.checkMicrophonePermission();
      
      if (!hasPermission) {
        // マイクテストページへリダイレクト
        this.redirectTarget = path;
        this.navigate('/microphone-test?redirect=' + encodeURIComponent(path));
        return;
      }
    }
    
    // 通常のページ遷移
    await this.executeRoute(path);
  }
}
```

### 14.4 URL共有・QRコード生成
```typescript
// 直接アクセスURL生成システム
class URLGenerator {
  generateTrainingURL(mode: TrainingMode, options?: TrainingOptions): string {
    const basePath = `/training/${mode}`;
    const params = new URLSearchParams();
    
    if (options) {
      if (options.baseNote) params.set('base', options.baseNote);
      if (options.difficulty) params.set('level', options.difficulty.toString());
      if (options.sessionLength) params.set('length', options.sessionLength.toString());
    }
    
    return `${window.location.origin}${basePath}${params.toString() ? '?' + params : ''}`;
  }
  
  generateShareURL(mode: TrainingMode, score?: number): string {
    const baseURL = this.generateTrainingURL(mode);
    return score ? `${baseURL}&challenge_score=${score}` : baseURL;
  }
}
```

### 14.5 セキュリティ・検証
```typescript
// URL検証システム
class URLValidator {
  private static readonly ALLOWED_PATHS = [
    '/', '/microphone-test', '/settings', '/about', '/help',
    '/training/random', '/training/continuous', '/training/chromatic'
  ];
  
  static isValidPath(path: string): boolean {
    const basePath = path.split('?')[0];
    return this.ALLOWED_PATHS.includes(basePath);
  }
  
  static sanitizeParameters(params: URLSearchParams): URLSearchParams {
    const allowedParams = ['redirect', 'base', 'level', 'length', 'shared', 'challenge_score'];
    const sanitized = new URLSearchParams();
    
    allowedParams.forEach(param => {
      const value = params.get(param);
      if (value && this.isValidParameterValue(param, value)) {
        sanitized.set(param, value);
      }
    });
    
    return sanitized;
  }
}
```

---

## 📦 15. 音響ライブラリ完全コンポーネント化仕様（v2.0.0 新戦略）

### 15.1 モジュラー設計アーキテクチャ
```typescript
// PitchPro.jsライブラリ構成
interface PitchProLibrary {
  core: {
    AudioManager: AudioManagerClass;          // 音声リソース統一管理
    PitchDetector: PitchDetectorClass;        // 高精度音程検出
    NoiseFilter: NoiseFilterClass;            // 3段階フィルター
  };
  
  advanced: {
    HarmonicCorrection: HarmonicCorrectionClass; // 倍音補正
    VoiceAnalyzer: VoiceAnalyzerClass;           // 音声分析
    CalibrationSystem: CalibrationClass;         // デバイス最適化
  };
  
  utils: {
    FrequencyUtils: FrequencyUtilsClass;      // 周波数↔音名変換
    MusicTheory: MusicTheoryClass;            // 音楽理論ユーティリティ
    DeviceDetection: DeviceDetectionClass;    // デバイス判定
  };
}
```

### 15.2 技術共用ライブラリ化
```json
{
  "name": "@pitchpro/audio-processing",
  "version": "1.0.0",
  "description": "高精度音程検出・音声処理ライブラリ",
  
  "main": "dist/index.js",
  "module": "dist/index.esm.js", 
  "types": "dist/index.d.ts",
  
  "exports": {
    ".": {
      "import": "./dist/index.esm.js",
      "require": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  },
  
  "keywords": [
    "audio", "pitch-detection", "music", "webaudio",
    "relative-pitch", "music-education", "voice-analysis"
  ]
}
```

---

**この技術仕様書は、Mantineデザインシステム、Cloudflareデプロイ、音響ライブラリ完全コンポーネント化を統合した新技術スタックでの実装を完全カバーします。**

#### 生成テキスト例（Twitter）
```
🎵 相対音感トレーニング完了！

📊 スコア: 85
🎯 精度: 92.5%
⏱️ 時間: 3分45秒
🎼 モード: ランダム基音モード

#相対音感 #音楽トレーニング #PitchTraining
```

### 11.4 共有分析・統計
```typescript
interface ShareEvent {
  platform: 'twitter' | 'facebook' | 'line' | 'instagram';
  shareContent: TrainingShareContent;
  timestamp: Date;
  userId?: string;
}

// 共有イベントトラッキング
// Google Analytics連携
// ローカル履歴保存（最新50件）
```

---

**作成日**: 2025-08-07  
**更新日**: 2025-08-07（データ永続化・SNS共有機能追加）  
**対象**: 相対音感トレーニングアプリ技術基盤  
**重要**: これらの技術仕様により高精度な相対音感トレーニング体験を実現