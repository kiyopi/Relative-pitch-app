# Firebase Authentication 仕様書

**Version:** 1.0.0
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
| Apple | ✅ 有効 | Apple Sign In |

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

## 10. 今後の拡張予定

### 10.1 未実装機能

| 機能 | 優先度 | 説明 |
|------|--------|------|
| ログイン必須化 | 中 | 特定機能へのアクセス制限 |
| ユーザープロフィール | 低 | 表示名・アバター管理 |
| Firestoreデータ同期 | 高 | トレーニング記録のクラウド保存 |
| アカウント削除 | 低 | GDPR対応 |

### 10.2 Firestoreデータ構造（予定）

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

## 11. トラブルシューティング

### 11.1 よくある問題

**Q: Googleログインでポップアップがブロックされる**
- A: ブラウザのポップアップブロッカーを無効化するか、サイトを許可リストに追加

**Q: Appleログインが動作しない**
- A: Apple Developer Programへの登録とService ID設定が必要

**Q: 「auth/network-request-failed」エラー**
- A: インターネット接続を確認。Firebaseサービスの障害情報も確認

### 11.2 デバッグ方法

```javascript
// コンソールで認証状態を確認
console.log(window.currentUser);
console.log(window.firebaseAuth.currentUser);
```

---

## 12. 変更履歴

| バージョン | 日付 | 変更内容 |
|-----------|------|---------|
| 1.0.0 | 2025-11-30 | 初版作成 |
