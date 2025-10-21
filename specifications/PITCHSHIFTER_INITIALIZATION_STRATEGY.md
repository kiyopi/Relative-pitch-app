# PitchShifter初期化戦略仕様書

**バージョン**: 2.0.0
**最終更新**: 2025-10-21
**ステータス**: 実装完了（デバイス判定・音量最適化v2.0）

## 📋 目的

PitchShifter音声処理ライブラリの初期化を最適化し、以下を実現する：

1. **通常フロー**: トレーニング開始時の遅延を最小化（初回から即座に再生）
2. **直接アクセス**: URL直接入力でも正常に動作
3. **リダイレクト対応**: マイク許可リダイレクト後の復帰にも対応
4. **フォールバック**: あらゆるエッジケースで確実に初期化

---

## 🏗️ アーキテクチャ概要

### 2段階初期化システム

```
Phase 1: ホームページからの事前初期化（最適パス）
         ↓
Phase 2: trainingControllerのフォールバック（セーフティネット）
```

---

## 📊 初期化フロー

### **通常フロー（最適）**

```
1. ホームページ表示
2. ユーザーが「始める」ボタンをクリック
3. router.js: PitchShifter初期化開始（バックグラウンド）
4. すぐにページ遷移（完了を待たない）
5. training.html表示
6. ユーザーが「基音スタート」ボタンをクリック
7. trainingController: グローバルインスタンス確認 → 既に初期化済み
8. 即座に基音再生（遅延なし）
```

**結果**: ✅ 初回から遅延なしで再生可能

### **直接アクセスフロー（フォールバック）**

```
1. ユーザーがtraining.html URLを直接入力/ブックマーク
2. training.html直接表示
3. ユーザーが「基音スタート」ボタンをクリック
4. trainingController: グローバルインスタンス確認 → 存在しない
5. フォールバック初期化開始
6. 初期化完了後に基音再生
```

**結果**: ✅ 初回のみ遅延、2回目以降は即座に再生

### **リダイレクト復帰フロー（レアケース）**

```
1. ホームページから「始める」クリック
2. router.js: PitchShifter初期化開始
3. マイク許可チェックでリダイレクト発生
4. 初期化処理が中断・放棄
5. マイク許可後、training.htmlに復帰
6. ユーザーが「基音スタート」ボタンをクリック
7. trainingController: グローバルインスタンス確認 → 未初期化
8. フォールバック初期化開始
9. 初期化完了後に基音再生
```

**結果**: ✅ リダイレクト後も確実に動作

---

## 🔧 実装詳細

### **Phase 1: router.js（事前初期化）**

**ファイル**: `/PitchPro-SPA/js/router.js`

#### setupHomeEvents()
```javascript
setupHomeEvents() {
    const trainingButtons = document.querySelectorAll('[data-route]');

    trainingButtons.forEach(button => {
        button.addEventListener('click', async (e) => {
            const route = e.currentTarget.getAttribute('data-route');

            // トレーニング/準備ページへの遷移時、PitchShifter初期化を開始
            if (route === 'training' || route === 'preparation') {
                console.log('🎹 トレーニング開始 - PitchShifter初期化開始...');
                this.initializePitchShifterBackground();
            }

            // パラメータ付きでページ遷移
            let hash = route;
            if (mode && session) {
                hash += `?mode=${mode}&session=${session}`;
            }
            window.location.hash = hash;
        });
    });
}
```

#### initializePitchShifterBackground() v2.0
```javascript
async initializePitchShifterBackground() {
    try {
        // PitchShifterライブラリのロード待機（最大5秒）
        let attempts = 0;
        while (!window.PitchShifter && attempts < 50) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }

        if (!window.PitchShifter) {
            console.warn('⚠️ PitchShifterがロードされていません（5秒タイムアウト）');
            return;
        }

        // 既に初期化済みならスキップ
        if (window.pitchShifterInstance && window.pitchShifterInstance.isInitialized) {
            console.log('✅ PitchShifter already initialized');
            return;
        }

        // デバイス検出と音量設定（v2.0: PitchPro準拠）
        const userAgent = navigator.userAgent || navigator.vendor || window.opera;

        // 複数の判定方法を組み合わせた包括的な検出（PitchPro方式）
        const isIPhone = /iPhone/.test(userAgent);
        const isIPad = /iPad/.test(userAgent);
        const isMacintoshWithTouch = /Macintosh/.test(userAgent) && 'ontouchend' in document;
        const isIOSUserAgent = /iPad|iPhone|iPod/.test(userAgent);
        const isIOSPlatform = /iPad|iPhone|iPod/.test(navigator.platform || '');
        const isIOS = isIPhone || isIPad || isMacintoshWithTouch || isIOSUserAgent || isIOSPlatform;

        // デバイスタイプ判定
        let deviceType = 'pc';
        if (isIPhone) {
            deviceType = 'iphone';
        } else if (isIPad || isMacintoshWithTouch) {
            deviceType = 'ipad';
        } else if (isIOS) {
            // スクリーンサイズで判定（PitchPro方式）
            const screenWidth = window.screen.width;
            const screenHeight = window.screen.height;
            const maxDimension = Math.max(screenWidth, screenHeight);
            const minDimension = Math.min(screenWidth, screenHeight);

            // iPad判定: 長辺768px以上、または長辺700px以上かつ短辺500px以上
            if (maxDimension >= 768 || (maxDimension >= 700 && minDimension >= 500)) {
                deviceType = 'ipad';
            } else {
                deviceType = 'iphone';
            }
        }

        // v2.0音量設定（デバイス音量50%基準）
        const volumeSettings = {
            pc: +8,      // +8dB: デバイス音量50%時に最適化
            iphone: +18, // +18dB: デバイス音量50%時に最適化
            ipad: +20    // +20dB: デバイス音量50%時に最適化（Tone.js推奨上限）
        };
        const deviceVolume = volumeSettings[deviceType] || +8;

        console.log(`📱 デバイス: ${deviceType}, 音量: ${deviceVolume}dB`);

        // インスタンス作成
        window.pitchShifterInstance = new window.PitchShifter({
            baseUrl: 'audio/piano/',
            release: 2.5,
            volume: deviceVolume
        });

        // バックグラウンドで初期化（完了を待たない）
        window.pitchShifterInstance.initialize()
            .then(() => {
                console.log('✅ PitchShifter初期化完了（バックグラウンド）');
            })
            .catch(error => {
                console.warn('⚠️ PitchShifter初期化失敗（バックグラウンド）:', error);
            });

    } catch (error) {
        console.warn('⚠️ PitchShifter初期化エラー（バックグラウンド）:', error);
    }
}
```

**重要ポイント**:
- ✅ バックグラウンド初期化（ページ遷移をブロックしない）
- ✅ グローバルインスタンス `window.pitchShifterInstance` に保存
- ✅ エラーでも処理を継続（フォールバックに委ねる）

---

### **Phase 2: trainingController.js（フォールバック）**

**ファイル**: `/PitchPro-SPA/js/controllers/trainingController.js`

#### initializePitchShifter() v2.0
```javascript
async function initializePitchShifter() {
    // 1. グローバルインスタンスが既に初期化済みなら使用
    if (window.pitchShifterInstance && window.pitchShifterInstance.isInitialized) {
        console.log('✅ Using global PitchShifter instance (initialized from home page)');
        pitchShifter = window.pitchShifterInstance;

        // v2.0新機能: デバイス別音量設定を適用（グローバルインスタンスの音量を更新）
        const deviceVolume = getDeviceVolume();
        const deviceType = getDeviceType();
        console.log(`🔊 音量更新: ${deviceType}用に${deviceVolume}dBに設定`);
        pitchShifter.setVolume(deviceVolume);

        return pitchShifter;
    }

    // 2. ローカルインスタンスが既に初期化済みならそのまま返す
    if (pitchShifter && pitchShifter.isInitialized) {
        console.log('✅ PitchShifter already initialized (local instance)');
        return pitchShifter;
    }

    // 3. 初期化中なら同じPromiseを返す（二重初期化防止）
    if (initializationPromise) {
        console.log('⏳ PitchShifter initialization in progress, waiting...');
        return initializationPromise;
    }

    // 4. 新規初期化開始（フォールバック: 直接アクセス/リダイレクト後等）
    initializationPromise = (async () => {
        console.log('🎹 PitchShifter初期化中（フォールバック: 直接アクセス or リダイレクト後）...');

        // PitchShifterライブラリのロード待機（最大10秒）
        let attempts = 0;
        while (!window.PitchShifter && attempts < 100) {
            if (attempts === 0 || attempts % 10 === 0) {
                console.log(`⏳ PitchShifter待機中... (${attempts + 1}/100)`);
            }
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }

        if (!window.PitchShifter) {
            console.error('❌ PitchShifterが読み込まれませんでした');
            console.error('window.PitchShifter:', window.PitchShifter);
            console.error('利用可能なグローバル変数:', Object.keys(window).filter(k => k.includes('Pitch') || k.includes('Tone')));
            initializationPromise = null;
            throw new Error('PitchShifterライブラリが読み込まれていません（10秒タイムアウト）');
        }

        console.log('✅ PitchShifter利用可能:', typeof window.PitchShifter);

        // v2.0: PitchPro準拠のデバイス判定と音量設定
        const deviceVolume = getDeviceVolume();
        const deviceType = getDeviceType();
        console.log(`📱 デバイス: ${deviceType}, 音量: ${deviceVolume}dB`);

        pitchShifter = new window.PitchShifter({
            baseUrl: 'audio/piano/',
            release: 2.5,
            volume: deviceVolume
        });

        await pitchShifter.initialize();
        console.log('✅ PitchShifter初期化完了（フォールバック）');

        // v2.0: iOS/iPadOS対応 - AudioContext確実起動
        if (typeof Tone !== 'undefined' && Tone.context) {
            if (Tone.context.state !== 'running') {
                console.log('🔊 AudioContext起動中（初期化後）... (state:', Tone.context.state + ')');
                await Tone.context.resume();
                console.log('✅ AudioContext起動完了（初期化後） (state:', Tone.context.state + ')');
            } else {
                console.log('✅ AudioContext既に起動済み (state:', Tone.context.state + ')');
            }
        }

        // グローバルインスタンスとして登録
        window.pitchShifterInstance = pitchShifter;

        initializationPromise = null;
        return pitchShifter;
    })();

    return initializationPromise;
}
```

**v2.0の4段階チェックロジック**:
1. **グローバルインスタンス確認**: ホームから初期化済みなら即座に使用 + **setVolume()で音量更新**
2. **ローカルインスタンス確認**: 既にフォールバック初期化済みなら再利用
3. **初期化中チェック**: 二重初期化を防止
4. **新規初期化**: 直接アクセス/リダイレクト後のフォールバック + **AudioContext確実起動**

---

## 🎯 対応シナリオ一覧

| シナリオ | 初期化タイミング | 基音再生遅延 | 処理フロー |
|---------|---------------|------------|----------|
| **通常フロー** | ホームページのボタンクリック時 | ✅ なし | Phase 1 → グローバルインスタンス使用 |
| **直接アクセス** | 基音ボタンクリック時 | ⚠️ 初回のみあり | Phase 2 → フォールバック初期化 |
| **ページリロード** | 基音ボタンクリック時 | ⚠️ 初回のみあり | Phase 2 → フォールバック初期化 |
| **リダイレクト復帰** | 基音ボタンクリック時 | ⚠️ 初回のみあり | Phase 2 → フォールバック初期化 |
| **ブックマーク** | 基音ボタンクリック時 | ⚠️ 初回のみあり | Phase 2 → フォールバック初期化 |

---

## 📱 デバイス別設定

### デバイス検出ロジック v2.0（PitchPro準拠）

**更新日**: 2025-10-21
**実装バージョン**: v2.0.0（PitchPro実装準拠）

#### 包括的デバイス判定実装

```javascript
// デバイス検出（PitchPro実装準拠）
function getDeviceType() {
    const userAgent = navigator.userAgent || navigator.vendor || window.opera;

    // 複数の判定方法を組み合わせた包括的な検出（PitchPro方式）
    const isIPhone = /iPhone/.test(userAgent);
    const isIPad = /iPad/.test(userAgent);
    const isMacintoshWithTouch = /Macintosh/.test(userAgent) && 'ontouchend' in document;
    const isIOSUserAgent = /iPad|iPhone|iPod/.test(userAgent);
    const isIOSPlatform = /iPad|iPhone|iPod/.test(navigator.platform || '');
    const isIOS = isIPhone || isIPad || isMacintoshWithTouch || isIOSUserAgent || isIOSPlatform;

    // デバイスタイプ判定
    if (isIPhone) {
        return 'iphone';
    } else if (isIPad || isMacintoshWithTouch) {
        return 'ipad';
    } else if (isIOS) {
        // スクリーンサイズで判定（PitchPro方式）
        return detectIOSDeviceTypeByScreen();
    } else {
        return 'pc';
    }
}

// スクリーンサイズによるiOSデバイスタイプ判定（PitchPro実装）
function detectIOSDeviceTypeByScreen() {
    const screenWidth = window.screen.width;
    const screenHeight = window.screen.height;
    const maxDimension = Math.max(screenWidth, screenHeight);
    const minDimension = Math.min(screenWidth, screenHeight);

    // iPad判定: 長辺768px以上、または長辺700px以上かつ短辺500px以上
    if (maxDimension >= 768 || (maxDimension >= 700 && minDimension >= 500)) {
        return 'ipad';
    } else {
        return 'iphone';
    }
}
```

#### v2.0の改善点

1. **複数判定方式の組み合わせ**
   - UserAgent判定（従来方式）
   - タッチサポート判定（`'ontouchend' in document`）
   - Navigator.platform判定（フォールバック）
   - スクリーンサイズ判定（最終フォールバック）

2. **iPadOS 13+完全対応**
   - Macintosh偽装への対策強化
   - スクリーンサイズによる確実な判定
   - 複数の判定条件でフォールバック

3. **誤判定防止**
   - iPad判定: 長辺768px以上 OR (長辺700px+ AND 短辺500px+)
   - iPhone/iPad境界の明確化
   - PC誤判定の完全排除

### 音量設定 v2.0（デバイス音量50%基準）

**更新日**: 2025-10-21
**最適化方針**: デバイス音量50%時に最適な聞きやすさを実現

```javascript
const volumeSettings = {
    pc: +8,      // +8dB: デバイス音量50%時に最適化
    iphone: +18, // +18dB: デバイス音量50%時に最適化
    ipad: +20    // +20dB: デバイス音量50%時に最適化（Tone.js推奨上限）
};
```

#### v2.0の音量設定変更履歴

| バージョン | PC | iPhone | iPad | 最適化基準 |
|-----------|-----|--------|------|----------|
| **v1.0** | -6dB | -4dB | -5dB | デフォルト設定 |
| **v1.5** | +6dB | +16dB | +18dB | 音量不足対策 |
| **v2.0** | +8dB | +18dB | +20dB | デバイス音量50%基準 |

#### 実機テスト結果（v2.0）

| デバイス音量 | 体感 | 判定 |
|------------|------|-----|
| **50%** | ちょうど良い聞きやすさ | ✅ 最適 |
| **100%** | 少しうるさい程度 | ✅ 許容範囲 |

#### 音量範囲の妥当性

- **Tone.js推奨範囲**: -20dB 〜 +20dB
- **現在の設定**: +8dB（PC）、+18dB（iPhone）、+20dB（iPad）
- **判定**: ✅ すべて推奨範囲内

### iOS 17対応のベストプラクティス

#### 既知の問題（iOS 17）

1. **通話スピーカー問題**
   - 症状: 音が通話スピーカーから出て極端に小さい
   - 影響機種: iPhone 14 Pro等
   - 原因: マイク許可時のデフォルトスピーカー選択

2. **マイク許可時の音量低下**
   - 症状: マイク許可後に音量が劇的に低下
   - 原因: エコーキャンセレーション自動有効化
   - WebKit Bug: bugs.webkit.org/show_bug.cgi?id=282939

#### 実装済み対策

```javascript
// PitchProのAudioManager設定（既に適用済み）
{
    echoCancellation: false,    // ✅ iOS音量低下対策
    noiseSuppression: false,    // ✅ iOS音量低下対策
    autoGainControl: false,     // ✅ iOS音量低下対策
    sampleRate: 44100,
    channelCount: 1
}
```

### 動的音量更新（v2.0新機能）

#### グローバルインスタンス使用時の音量更新

**実装**: `trainingController.js` - `initializePitchShifter()`

```javascript
// 1. グローバルインスタンスが既に初期化済みなら使用
if (window.pitchShifterInstance && window.pitchShifterInstance.isInitialized) {
    console.log('✅ Using global PitchShifter instance (initialized from home page)');
    pitchShifter = window.pitchShifterInstance;

    // デバイス別音量設定を適用（グローバルインスタンスの音量を更新）
    const deviceVolume = getDeviceVolume();
    const deviceType = getDeviceType();
    console.log(`🔊 音量更新: ${deviceType}用に${deviceVolume}dBに設定`);
    pitchShifter.setVolume(deviceVolume);

    return pitchShifter;
}
```

#### 動的音量更新の必要性

**問題**: ホームページで古い音量設定でインスタンス作成 → トレーニングページで最新音量が適用されない

**解決**: `setVolume()` メソッドで動的に音量を更新

**効果**:
- ✅ ホームページ → トレーニングページ遷移時も正しい音量
- ✅ リロードしなくても常に最新の音量設定が適用
- ✅ router.jsとtrainingController.jsの音量設定統一

---

## 🔍 デバッグログ

### 通常フロー
```
🎹 トレーニング開始 - PitchShifter初期化開始...
📱 デバイス: pc, 音量: -6dB
✅ PitchShifter初期化完了（バックグラウンド）
🚀 トレーニング開始
✅ Using global PitchShifter instance (initialized from home page)
🎵 基音再生: {note: "C4", frequency: 261.63, japaneseName: "ド（低）"}
```

### 直接アクセスフロー
```
🚀 トレーニング開始
🎹 PitchShifter初期化中（フォールバック: 直接アクセス or リダイレクト後）...
⏳ PitchShifter待機中... (1/100)
✅ PitchShifter利用可能: function
📱 デバイス: pc, 音量: -6dB
✅ PitchShifter初期化完了（フォールバック）
🎵 基音再生: {note: "D4", frequency: 293.66, japaneseName: "レ（低）"}
```

---

## ⚠️ エラーハンドリング

### タイムアウト
- **Phase 1**: 5秒タイムアウト → 警告ログ出力、Phase 2に委ねる
- **Phase 2**: 10秒タイムアウト → エラースロー、ユーザーにアラート表示

### エラー時の診断情報
```javascript
console.error('window.PitchShifter:', window.PitchShifter);
console.error('利用可能なグローバル変数:', Object.keys(window).filter(k => k.includes('Pitch') || k.includes('Tone')));
```

---

## 🧪 テスト項目

### v1.0基本機能
- [x] 通常フロー: ホーム → トレーニング → 即座に再生
- [x] 直接アクセス: URL直接入力 → 初期化 → 再生
- [x] ページリロード: F5キー → 再初期化 → 再生
- [x] リダイレクト: マイク許可 → 復帰 → 再初期化 → 再生
- [x] ブックマーク: ブックマークから → 初期化 → 再生
- [x] 二重初期化防止: 連続クリックで初期化が1回のみ

### v2.0新機能・改善
- [x] **PitchPro準拠デバイス判定**: iPadOS 13+で正しくiPad検出
- [x] **スクリーンサイズ判定**: UserAgent偽装時も正確に判定
- [x] **音量設定v2.0**: PC +8dB, iPhone +18dB, iPad +20dB
- [x] **デバイス音量50%最適化**: 50%音量で聞きやすい
- [x] **動的音量更新**: ホーム→トレーニング遷移時も正しい音量
- [x] **setVolume()動作**: グローバルインスタンス使用時に音量更新
- [x] **AudioContext確実起動**: iPad音が鳴らない問題解決
- [x] **iOS 17対応**: echoCancellation/autoGainControl無効化確認

---

## 📚 関連ファイル

- `/PitchPro-SPA/js/router.js` - Phase 1実装
- `/PitchPro-SPA/js/controllers/trainingController.js` - Phase 2実装
- `/PitchPro-SPA/index.html` - PitchShifter/Tone.jsライブラリ読み込み
- `/PitchPro-SPA/pages/js/core/reference-tones.js` - PitchShifterライブラリ本体
- `/PitchPro-SPA/audio/piano/C4.mp3` - 基音サンプル

---

## 🎓 設計思想

1. **ユーザー体験最優先**: 通常フローでは遅延を完全に排除
2. **堅牢性**: あらゆるエッジケースでフォールバック動作
3. **デバッグ容易性**: 詳細なログでトラブルシューティング支援
4. **保守性**: 責任分離（Phase 1: 事前最適化、Phase 2: セーフティネット）

---

**実装者へのメモ**:
- グローバルインスタンス `window.pitchShifterInstance` を中心とした設計
- router.jsはベストエフォート、trainingControllerが確実性を保証
- AudioContext初期化にはユーザーインタラクション必須（Web Audio API制約）
- v2.0: PitchPro準拠デバイス判定で誤判定を完全排除
- v2.0: setVolume()による動的音量更新で常に最新音量適用

---

## 📝 変更履歴

### v2.0.0（2025-10-21）

#### デバイス判定の包括的改善
- **PitchPro実装準拠**: 複数の判定方法を組み合わせた包括的検出
- **iPadOS 13+完全対応**: Macintosh偽装への対策強化
- **スクリーンサイズ判定追加**: 長辺768px以上またはそれに近い画面サイズでiPad判定
- **誤判定完全排除**: UserAgent・タッチサポート・Platform・スクリーンサイズの4重チェック

#### 音量設定の最適化
- **デバイス音量50%基準**: 実機テストに基づく最適化
- **全デバイス+2dB増加**: PC +8dB, iPhone +18dB, iPad +20dB
- **Tone.js推奨範囲準拠**: すべて-20〜+20dBの推奨範囲内
- **実機テスト結果**: 50%で聞きやすい、100%で許容範囲内

#### 動的音量更新機能追加
- **setVolume()メソッド活用**: グローバルインスタンス使用時に音量を動的更新
- **ホーム→トレーニング遷移対応**: 古い音量設定が残る問題を解決
- **リロード不要**: 常に最新の音量設定が適用される

#### iOS 17対応強化
- **AudioContext確実起動**: 初期化後とplayNote()前の2段階確認
- **Tone.start()追加**: suspended状態から確実に起動
- **100ms安定化待機**: AudioContext起動後の安定性向上

#### ベストプラクティス適用
- **echoCancellation: false**: iOS音量低下対策
- **autoGainControl: false**: iOS音量低下対策
- **noiseSuppression: false**: iOS音量低下対策

### v1.0.0（2025-01-12）

#### 初期実装
- 2段階初期化システム（Phase 1: router.js, Phase 2: trainingController.js）
- 通常フロー最適化（ホームからの遷移で即座に再生）
- フォールバック機構（直接アクセス・リダイレクト対応）
- 基本的なデバイス判定（UserAgent + タッチサポート）
- 音量設定v1.0（PC -6dB, iPhone -4dB, iPad -5dB）

---

## 🔗 関連仕様書

- **音域テスト仕様**: `/specifications/voice-range-test/VOICE_RANGE_TEST_SPECIFICATION_V3.md`
- **音量バー統合仕様**: `/specifications/VOLUME_BAR_INTEGRATION_SPECIFICATION.md`
- **トレーニングフロー仕様**: `/specifications/TRAINING_FLOW_SPECIFICATION.md`
- **PitchProリファレンス**: `https://github.com/kiyopi/pitchpro-audio-processing`
- **PitchShifterリファレンス**: `https://github.com/kiyopi/pitchpro-reference-tones`
