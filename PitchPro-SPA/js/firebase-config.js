/**
 * firebase-config.js
 * Firebase設定・初期化
 * @version 1.1.0
 * @date 2025-11-30
 */

// Firebase設定
const firebaseConfig = {
    apiKey: "AIzaSyBcKq9IiTsOgVaMrzwMUiEakUzHczQagrE",
    authDomain: "relative-pitch-8va.firebaseapp.com",
    projectId: "relative-pitch-8va",
    storageBucket: "relative-pitch-8va.firebasestorage.app",
    messagingSenderId: "641665295840",
    appId: "1:641665295840:web:6a1ea746d72b6574dc3785"
};

// Firebase初期化
firebase.initializeApp(firebaseConfig);

// Auth インスタンスをグローバルに公開
window.firebaseAuth = firebase.auth();

// 認証状態の監視
window.firebaseAuth.onAuthStateChanged(async (user) => {
    if (user) {
        console.log('🔥 [Firebase] ユーザーログイン中:', user.email);
        window.currentUser = user;
        updateAuthUI(user);

        // RevenueCat初期化（ユーザーIDを紐付け）
        if (window.RevenueCatManager) {
            await window.RevenueCatManager.initialize();
        }
    } else {
        console.log('🔥 [Firebase] 未ログイン');
        window.currentUser = null;
        updateAuthUI(null);

        // 匿名ユーザーとしてRevenueCat初期化
        if (window.RevenueCatManager) {
            await window.RevenueCatManager.initialize();
        }
    }
});

/**
 * 認証UIを更新
 * @param {Object|null} user - Firebaseユーザーオブジェクト
 */
function updateAuthUI(user) {
    const loginBtn = document.getElementById('nav-login-btn');
    const userInfo = document.getElementById('nav-user-info');
    const userName = document.getElementById('nav-user-name');

    if (!loginBtn || !userInfo) {
        // DOM要素がまだ読み込まれていない場合はスキップ
        return;
    }

    if (user) {
        // ログイン状態
        loginBtn.style.display = 'none';
        userInfo.style.display = 'flex';

        // 表示名を設定（displayName > email の優先順）
        const displayName = user.displayName || user.email.split('@')[0];
        userName.textContent = displayName;

        // Lucideアイコン再初期化
        if (typeof window.initializeLucideIcons === 'function') {
            window.initializeLucideIcons({ immediate: true });
        }
    } else {
        // 未ログイン状態
        loginBtn.style.display = 'flex';
        userInfo.style.display = 'none';
        userName.textContent = '';
    }
}

/**
 * ログアウト処理
 */
window.handleLogout = async function() {
    try {
        await window.firebaseAuth.signOut();
        console.log('✅ ログアウト成功');

        // ゲストモードフラグもクリア
        sessionStorage.removeItem('guestMode');

        // ログイン画面に遷移
        window.location.hash = 'login';
    } catch (error) {
        console.error('❌ ログアウトエラー:', error);
        alert('ログアウトに失敗しました。');
    }
};

console.log('🔥 [Firebase] 初期化完了');
