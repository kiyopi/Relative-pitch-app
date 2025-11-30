/**
 * firebase-config.js
 * Firebase設定・初期化
 * @version 1.0.0
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
window.firebaseAuth.onAuthStateChanged((user) => {
    if (user) {
        console.log('🔥 [Firebase] ユーザーログイン中:', user.email);
        window.currentUser = user;
    } else {
        console.log('🔥 [Firebase] 未ログイン');
        window.currentUser = null;
    }
});

console.log('🔥 [Firebase] 初期化完了');
