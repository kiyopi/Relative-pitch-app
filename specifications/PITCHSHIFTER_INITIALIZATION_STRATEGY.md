# PitchShifter初期化戦略仕様書

**バージョン**: 1.0.0
**最終更新**: 2025-01-12
**ステータス**: 実装完了

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

#### initializePitchShifterBackground()
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

        // デバイス検出と音量設定
        const userAgent = navigator.userAgent || navigator.vendor || window.opera;
        const isIPhone = /iPhone/.test(userAgent);
        const isIPad = /iPad/.test(userAgent) || (/Macintosh/.test(userAgent) && 'ontouchend' in document);
        const deviceType = isIPhone ? 'iphone' : isIPad ? 'ipad' : 'pc';

        const volumeSettings = {
            pc: -6,
            iphone: -4,
            ipad: -5
        };
        const deviceVolume = volumeSettings[deviceType] || -6;

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

#### initializePitchShifter()
```javascript
async function initializePitchShifter() {
    // 1. グローバルインスタンスが既に初期化済みなら使用
    if (window.pitchShifterInstance && window.pitchShifterInstance.isInitialized) {
        console.log('✅ Using global PitchShifter instance (initialized from home page)');
        pitchShifter = window.pitchShifterInstance;
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

        // グローバルインスタンスとして登録
        window.pitchShifterInstance = pitchShifter;

        initializationPromise = null;
        return pitchShifter;
    })();

    return initializationPromise;
}
```

**4段階チェックロジック**:
1. **グローバルインスタンス確認**: ホームから初期化済みなら即座に使用
2. **ローカルインスタンス確認**: 既にフォールバック初期化済みなら再利用
3. **初期化中チェック**: 二重初期化を防止
4. **新規初期化**: 直接アクセス/リダイレクト後のフォールバック

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

### デバイス検出ロジック
```javascript
const userAgent = navigator.userAgent || navigator.vendor || window.opera;
const isIPhone = /iPhone/.test(userAgent);
const isIPad = /iPad/.test(userAgent) || (/Macintosh/.test(userAgent) && 'ontouchend' in document);
const deviceType = isIPhone ? 'iphone' : isIPad ? 'ipad' : 'pc';
```

**iPadOS 13+ 対応**: `'ontouchend' in document` でタッチデバイス判定

### 音量設定
```javascript
const volumeSettings = {
    pc: -6,      // PC: -6dB
    iphone: -4,  // iPhone: -4dB
    ipad: -5     // iPad: -5dB
};
```

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

- [ ] 通常フロー: ホーム → トレーニング → 即座に再生
- [ ] 直接アクセス: URL直接入力 → 初期化 → 再生
- [ ] ページリロード: F5キー → 再初期化 → 再生
- [ ] リダイレクト: マイク許可 → 復帰 → 再初期化 → 再生
- [ ] ブックマーク: ブックマークから → 初期化 → 再生
- [ ] デバイス検出: PC/iPhone/iPad で正しい音量設定
- [ ] 二重初期化防止: 連続クリックで初期化が1回のみ

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
