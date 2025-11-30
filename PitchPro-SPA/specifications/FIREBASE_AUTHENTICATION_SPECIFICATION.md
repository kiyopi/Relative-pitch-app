# Firebase Authentication 仕様書

**Version:** 1.3.0
**作成日:** 2025-11-30
**最終更新:** 2025-11-30

---

## 1. 概要

### 1.1 目的
8va相対音感トレーニングアプリにFirebase Authenticationを統合し、ユーザー認証機能を提供する。

### 1.2 Firebase プロジェクト情報

| 項目 | 値 |
|------|-----|
| プロジェクトID | `relative-pitch-8va` |
| Hosting URL | https://relative-pitch-8va.web.app |
| Console URL | https://console.firebase.google.com/project/relative-pitch-8va |
| Firestore リージョン | `asia-northeast1`（東京） |

---

## 2. 認証プロバイダ

### 2.1 有効化済みプロバイダ

| プロバイダ | ステータス | 説明 |
|-----------|----------|------|
| メール/パスワード | ✅ 有効 | 標準的なメール認証 |
| Google | ✅ 有効 | Google OAuth 2.0 |
| Apple | ⏸️ 一時無効 | Apple Developer設定完了後に有効化 |

### 2.2 各プロバイダの特徴

#### メール/パスワード
- ユーザーがメールアドレスとパスワードで登録・ログイン
- パスワードは8文字以上を要求
- パスワードリセット機能あり

#### Google OAuth
- Googleアカウントでワンクリックログイン
- ポップアップ形式で認証

#### Apple Sign In
- Appleアカウントでログイン
- iOS/macOSユーザーに便利
- メールアドレスの非公開オプションあり

---

## 3. ファイル構成

### 3.1 Firebase関連ファイル

```
Relative-pitch-app/
├── .firebaserc              # プロジェクト設定
├── firebase.json            # Hosting設定
├── firestore.rules          # Firestoreセキュリティルール
├── firestore.indexes.json   # Firestoreインデックス
└── PitchPro-SPA/
    └── js/
        └── firebase-config.js   # Firebase初期化・認証設定
```

### 3.2 認証UI関連ファイル

```
PitchPro-SPA/
├── pages/
│   ├── login.html           # ログイン画面
│   ├── register.html        # 新規登録画面
│   ├── password-reset.html  # パスワードリセット画面
│   └── js/
│       └── login-controller.js  # 認証コントローラー
└── styles/
    └── login.css            # 認証画面スタイル
```

---

## 4. 実装詳細

### 4.1 Firebase SDK

**使用バージョン:** 12.6.0（compat版）

```html
<!-- index.html -->
<script src="https://www.gstatic.com/firebasejs/12.6.0/firebase-app-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/12.6.0/firebase-auth-compat.js"></script>
```

**compat版を使用する理由:**
- 既存のVanilla JSコードとの互換性
- グローバル`firebase`オブジェクトが使用可能
- モジュール形式への移行が不要

### 4.2 Firebase設定（firebase-config.js）

```javascript
const firebaseConfig = {
    apiKey: "AIzaSyBcKq9IiTsOgVaMrzwMUiEakUzHczQagrE",
    authDomain: "relative-pitch-8va.firebaseapp.com",
    projectId: "relative-pitch-8va",
    storageBucket: "relative-pitch-8va.firebasestorage.app",
    messagingSenderId: "641665295840",
    appId: "1:641665295840:web:6a1ea746d72b6574dc3785"
};

firebase.initializeApp(firebaseConfig);
window.firebaseAuth = firebase.auth();
```

### 4.3 認証状態の監視

```javascript
window.firebaseAuth.onAuthStateChanged((user) => {
    if (user) {
        console.log('ユーザーログイン中:', user.email);
        window.currentUser = user;
    } else {
        console.log('未ログイン');
        window.currentUser = null;
    }
});
```

---

## 5. 認証フロー

### 5.1 ログインフロー

```
[ログイン画面] → [認証処理] → [成功] → [ホーム画面]
                           ↓
                        [失敗] → [エラーメッセージ表示]
```

### 5.2 新規登録フロー

```
[登録画面] → [バリデーション] → [ユーザー作成] → [表示名設定] → [ホーム画面]
                ↓
             [失敗] → [エラーメッセージ表示]
```

### 5.3 ゲストモード

```
[ログイン画面] → [ゲストボタン] → [sessionStorageにフラグ設定] → [ホーム画面]
```

---

## 6. エラーハンドリング

### 6.1 日本語エラーメッセージ対応

| エラーコード | 日本語メッセージ |
|-------------|-----------------|
| `auth/email-already-in-use` | このメールアドレスは既に使用されています。 |
| `auth/invalid-email` | メールアドレスの形式が正しくありません。 |
| `auth/weak-password` | パスワードが弱すぎます。より強力なパスワードを設定してください。 |
| `auth/user-not-found` | このメールアドレスに対応するアカウントが見つかりません。 |
| `auth/wrong-password` | パスワードが正しくありません。 |
| `auth/invalid-credential` | メールアドレスまたはパスワードが正しくありません。 |
| `auth/too-many-requests` | ログイン試行が多すぎます。しばらく待ってから再試行してください。 |
| `auth/network-request-failed` | ネットワークエラーが発生しました。接続を確認してください。 |
| `auth/popup-blocked` | ポップアップがブロックされました。ポップアップを許可してください。 |
| `auth/popup-closed-by-user` | ログインがキャンセルされました。 |

---

## 7. ルーティング設定

### 7.1 SPAルート（router.js）

```javascript
this.routes = {
    // ... 既存ルート
    'login': 'pages/login.html',
    'register': 'pages/register.html',
    'password-reset': 'pages/password-reset.html'
};

this.pageConfigs = {
    'login': {
        init: 'initLoginPage',
        dependencies: [],
        title: 'ログイン'
    },
    'register': {
        init: 'initRegisterPage',
        dependencies: [],
        title: '新規登録'
    },
    'password-reset': {
        init: 'initPasswordResetPage',
        dependencies: [],
        title: 'パスワードリセット'
    }
};
```

### 7.2 アクセスURL

| 画面 | URL |
|------|-----|
| ログイン | `/#login` |
| 新規登録 | `/#register` |
| パスワードリセット | `/#password-reset` |

---

## 8. Firebase Hosting設定

### 8.1 firebase.json

```json
{
  "hosting": {
    "public": "PitchPro-SPA",
    "ignore": [
      "firebase.json",
      "**/.*",
      "**/node_modules/**"
    ],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ]
  }
}
```

### 8.2 デプロイコマンド

```bash
firebase deploy --only hosting
```

---

## 9. セキュリティ考慮事項

### 9.1 APIキーの公開について

Firebase APIキーはクライアントサイドで公開されますが、これは設計上意図されたものです：
- APIキーはプロジェクトの識別にのみ使用
- 実際のセキュリティはFirebaseセキュリティルールで制御
- 不正使用はFirebase Consoleで監視可能

### 9.2 Firestoreセキュリティルール

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

**注意:** 現在はすべてのアクセスを拒否する初期設定。
Firestoreを使用する際は適切なルールに更新が必要。

---

## 10. 課金システム計画

### 10.1 収益化モデル（決定済み）

| 項目 | 内容 |
|------|------|
| **無料機能** | ランダム基音モード |
| **有料機能** | 連続チャレンジ、12音階、プレミアム分析 |
| **無料トライアル** | 1週間 |

### 10.2 課金プラットフォーム

**採用:** RevenueCat

| 項目 | 詳細 |
|------|------|
| 選定理由 | 初心者向け、無料トライアル管理が標準、Firebase連携が簡単 |
| 料金 | 月$10,000収益まで無料 |
| 公式サイト | https://www.revenuecat.com/ |

**RevenueCatを選定した理由:**
1. 無料トライアル管理が標準機能
2. Firebase連携が公式サポート
3. 初心者向けドキュメントが充実
4. 将来のネイティブアプリ化に対応
5. 初期段階ではコストゼロ

### 10.3 課金実装ステータス

| ステップ | ステータス | 説明 |
|----------|----------|------|
| RevenueCatアカウント作成 | ✅ 完了 | https://www.revenuecat.com/ |
| SDK組み込み | ✅ 完了 | unpkg CDN経由で読み込み |
| Firebase連携設定 | ✅ 完了 | onAuthStateChangedで自動初期化 |
| 商品（サブスク）設定 | ✅ 完了 | RevenueCatダッシュボードで設定済み |
| 課金UI実装 | 📋 未着手 | アップグレード画面の実装 |

### 10.4 RevenueCatダッシュボード設定

**プロジェクト名:** 8va Relative Pitch Training

#### Products（商品）
| ID | 価格 | 期間 | 説明 |
|----|------|------|------|
| `premium_monthly` | $4.99/月 | Monthly | プレミアム月額プラン |

#### Entitlements（権限）
| ID | 説明 |
|----|------|
| `premium` | プレミアム機能へのアクセス権限 |

#### Offerings（提供プラン）
| ID | パッケージ | 説明 |
|----|-----------|------|
| `premium_offering` | premium_monthly | プレミアムプランの提供構成 |

**設定完了日:** 2025-11-30
**動作確認:** パッケージ取得成功（`📦 [RevenueCat] premium_offering パッケージ`）

### 10.5 SDK設定

**APIキー（テスト用）:** `test_TOGsPuIHRNyeJNRXHVRwwetnSaY`

**読み込み方法:**
```html
<!-- index.html -->
<script src="https://unpkg.com/@revenuecat/purchases-js"></script>
<script src="js/revenuecat-config.js"></script>
```

**利用可能なAPI:**
```javascript
// 初期化
await window.RevenueCatManager.initialize();

// 課金状態確認
const { isPremium, isTrialing } = await window.RevenueCatManager.checkStatus();

// 機能アクセス確認
const canAccess = await window.RevenueCatManager.canAccess('premium-analysis');

// パッケージ取得
const packages = await window.RevenueCatManager.getPackages();

// 購入
const result = await window.RevenueCatManager.purchase(package);
```

### 10.6 機能制限定義

**無料機能:**
- `random-ascending` - ランダム基音（上行）
- `random-descending` - ランダム基音（下行）

**プレミアム機能:**
- `continuous-ascending` - 連続チャレンジ（上行）
- `continuous-descending` - 連続チャレンジ（下行）
- `chromatic-ascending` - 12音階（上行）
- `chromatic-descending` - 12音階（下行）
- `chromatic-both` - 12音階（両方向）
- `premium-analysis` - プレミアム分析

### 10.8 未決定事項

- 年額プラン（現在は月額$4.99のみ）
- 具体的な課金導線（アップグレード促進画面）
- 詳細な機能制限仕様
- 本番用APIキーへの切り替え

---

## 11. 今後の拡張予定

### 11.1 未実装機能

| 機能 | 優先度 | 説明 |
|------|--------|------|
| ログイン必須化 | 中 | 特定機能へのアクセス制限 |
| ユーザープロフィール | 低 | 表示名・アバター管理 |
| Firestoreデータ同期 | 高 | トレーニング記録のクラウド保存 |
| アカウント削除 | 低 | GDPR対応 |

### 11.2 Firestoreデータ構造（予定）

```
users/
  {userId}/
    profile/
      displayName: string
      createdAt: timestamp
    trainingRecords/
      {recordId}/
        mode: string
        score: number
        timestamp: timestamp
```

---

## 12. トラブルシューティング

### 12.1 よくある問題

**Q: Googleログインでポップアップがブロックされる**
- A: ブラウザのポップアップブロッカーを無効化するか、サイトを許可リストに追加

**Q: Appleログインが動作しない**
- A: Apple Developer Programへの登録とService ID設定が必要

**Q: 「auth/network-request-failed」エラー**
- A: インターネット接続を確認。Firebaseサービスの障害情報も確認

### 12.2 デバッグ方法

```javascript
// コンソールで認証状態を確認
console.log(window.currentUser);
console.log(window.firebaseAuth.currentUser);
```

---

## 13. 変更履歴

| バージョン | 日付 | 変更内容 |
|-----------|------|---------|
| 1.0.0 | 2025-11-30 | 初版作成 |
| 1.1.0 | 2025-11-30 | 課金システム計画（RevenueCat）を追加 |
| 1.2.0 | 2025-11-30 | RevenueCat SDK組み込み、API仕様追加 |
| 1.3.0 | 2025-11-30 | RevenueCatダッシュボード設定完了（商品・権限・提供プラン）|
