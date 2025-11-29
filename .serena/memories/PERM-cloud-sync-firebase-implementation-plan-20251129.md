# Firebase クラウド同期機能 実装計画

## 作成日: 2025-11-29
## ステータス: 計画済み（未実装）

---

## 概要

ユーザーのトレーニングデータをFirebaseクラウドに保存し、デバイス間で同期する機能。
現在のエクスポート/インポート機能を拡張する形で実装。

---

## 見積もり

- **工数**: 12-16時間
- **難易度**: 中程度
- **コスト**: 無料（数千ユーザー規模まで）

---

## 技術選定: Firebase

### 選定理由
- Google認証/Apple認証が簡単に統合可能
- 無料枠で十分（1GB保存、5万読み取り/日）
- リアルタイム同期も可能
- PWAとの相性が良い

### 使用サービス
- Firebase Authentication（認証）
- Cloud Firestore（データベース）

---

## 実装フェーズ

### Phase 1: Firebase プロジェクト設定（1時間）
1. Firebase Console で新規プロジェクト「8va-pitchtraining」作成
2. Firestore Database 有効化（リージョン: asia-northeast1）
3. Authentication 有効化（Google/Apple サインイン）
4. ウェブアプリ登録、設定情報取得

### Phase 2: SDK導入（1時間）
```html
<!-- index.html に追加 -->
<script type="module">
  import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js';
  import { getAuth, signInWithPopup, GoogleAuthProvider } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js';
  import { getFirestore, doc, setDoc, getDoc } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';

  const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "8va-pitchtraining.firebaseapp.com",
    projectId: "8va-pitchtraining"
  };

  window.firebaseApp = initializeApp(firebaseConfig);
  window.firebaseAuth = getAuth(window.firebaseApp);
  window.firebaseDb = getFirestore(window.firebaseApp);
</script>
```

### Phase 3: 認証実装（3-4時間）
- 新規ファイル: `/js/cloud-sync.js`
- CloudSyncクラス実装
- signIn(), signOut(), isSignedIn() メソッド

### Phase 4: データ同期ロジック（4-5時間）
- uploadData(): DataManager.prepareExportData()を流用してFirestoreに保存
- downloadData(): Firestoreから取得してDataManager.importData()で復元
- getLastSyncTime(): 最終同期日時取得

### Phase 5: 設定ページUI実装（2-3時間）
- settings.htmlにクラウド同期セクション追加
- 未ログイン時: Googleサインインボタン
- ログイン時: アップロード/ダウンロードボタン、サインアウト

### Phase 6: セキュリティルール設定
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

---

## ユーザーフロー

### 初回セットアップ
設定ページ → Googleでサインイン → 認証完了

### アップロード
設定ページ → アップロード → 確認ダイアログ → 完了通知

### ダウンロード（機種変更時）
新デバイス → 設定ページ → Googleでサインイン → ダウンロード → データ復元

---

## 新規作成ファイル

| ファイル | 内容 |
|---------|------|
| `/js/cloud-sync.js` | CloudSyncクラス（認証・同期ロジック） |

## 修正ファイル

| ファイル | 変更内容 |
|---------|---------|
| `index.html` | Firebase SDK読み込み追加 |
| `pages/settings.html` | クラウド同期UIセクション追加 |
| `js/controllers/settingsController.js` | クラウド同期ボタンイベント追加 |

---

## 注意事項

1. **プライバシーポリシー更新必須** - クラウドにデータ保存することを明記
2. **Apple審査対応** - App Store公開時はApple Sign Inも実装必要
3. **オフライン対応** - ネットワークエラー時のハンドリング実装

---

## コスト（Firebase無料枠）

| 項目 | 無料枠 | 想定使用量 |
|------|--------|-----------|
| Firestore保存 | 1GB | 1ユーザー約10KB |
| 読み取り | 5万回/日 | 1ユーザー数回/日 |
| 書き込み | 2万回/日 | 1ユーザー1-2回/日 |
| 認証 | 無制限 | - |

**結論**: 数千ユーザー規模なら完全無料で運用可能

---

## 関連ドキュメント

- DATABASE_DESIGN_SPECIFICATION.md - セクション7.2「クラウド同期（将来）」
- data-manager.js - exportData(), importData() を流用
