/**
 * login-controller.js
 * ログイン・登録・パスワードリセットページのコントローラー
 * @version 2.0.0
 * @date 2025-11-30
 *
 * 【責任範囲】
 * - ログインフォームの処理
 * - 新規登録フォームの処理
 * - パスワードリセットの処理
 * - ソーシャルログイン（Google/Apple）
 * - ゲストモード処理
 *
 * 【依存関係】
 * - Firebase Authentication (firebase-config.js)
 */

console.log('🔐 [login-controller] Script loaded');

// ========================================
// ログインページ初期化
// ========================================

window.initLoginPage = function() {
    console.log('🔐 ログインページ初期化開始');

    // フォーム要素
    const loginForm = document.getElementById('login-form');
    const passwordToggle = document.getElementById('password-toggle');
    const googleLoginBtn = document.getElementById('google-login-btn');
    const appleLoginBtn = document.getElementById('apple-login-btn');
    const guestModeBtn = document.getElementById('guest-mode-btn');

    // パスワード表示/非表示トグル
    if (passwordToggle) {
        passwordToggle.addEventListener('click', () => {
            const passwordInput = document.getElementById('login-password');
            const icon = passwordToggle.querySelector('i');

            if (passwordInput.type === 'password') {
                passwordInput.type = 'text';
                icon.setAttribute('data-lucide', 'eye-off');
            } else {
                passwordInput.type = 'password';
                icon.setAttribute('data-lucide', 'eye');
            }

            // Lucideアイコン再初期化
            if (typeof window.initializeLucideIcons === 'function') {
                window.initializeLucideIcons({ immediate: true });
            }
        });
    }

    // ログインフォーム送信
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            hideLoginError();

            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;
            const submitBtn = document.getElementById('login-submit-btn');

            console.log('📧 ログイン試行:', email);

            // ボタンを無効化
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i data-lucide="loader-2" class="animate-spin"></i><span>ログイン中...</span>';
            if (typeof window.initializeLucideIcons === 'function') {
                window.initializeLucideIcons({ immediate: true });
            }

            try {
                await window.firebaseAuth.signInWithEmailAndPassword(email, password);
                console.log('✅ ログイン成功');
                window.location.hash = 'home';
            } catch (error) {
                console.error('❌ ログインエラー:', error);
                showLoginError(getFirebaseErrorMessage(error.code));
            } finally {
                // ボタンを復元
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i data-lucide="log-in"></i><span>ログイン</span>';
                if (typeof window.initializeLucideIcons === 'function') {
                    window.initializeLucideIcons({ immediate: true });
                }
            }
        });
    }

    // Googleログイン
    if (googleLoginBtn) {
        googleLoginBtn.addEventListener('click', async () => {
            console.log('🔵 Googleログイン開始');
            hideLoginError();

            try {
                const provider = new firebase.auth.GoogleAuthProvider();
                await window.firebaseAuth.signInWithPopup(provider);
                console.log('✅ Googleログイン成功');
                window.location.hash = 'home';
            } catch (error) {
                console.error('❌ Googleログインエラー:', error);
                if (error.code !== 'auth/popup-closed-by-user') {
                    showLoginError(getFirebaseErrorMessage(error.code));
                }
            }
        });
    }

    // Appleログイン
    if (appleLoginBtn) {
        appleLoginBtn.addEventListener('click', async () => {
            console.log('⚫ Appleログイン開始');
            hideLoginError();

            try {
                const provider = new firebase.auth.OAuthProvider('apple.com');
                provider.addScope('email');
                provider.addScope('name');
                await window.firebaseAuth.signInWithPopup(provider);
                console.log('✅ Appleログイン成功');
                window.location.hash = 'home';
            } catch (error) {
                console.error('❌ Appleログインエラー:', error);
                if (error.code !== 'auth/popup-closed-by-user') {
                    showLoginError(getFirebaseErrorMessage(error.code));
                }
            }
        });
    }

    // ゲストモード
    if (guestModeBtn) {
        guestModeBtn.addEventListener('click', () => {
            console.log('👤 ゲストモードで開始');

            // ゲストモードフラグを設定
            sessionStorage.setItem('guestMode', 'true');

            // ホームに遷移
            window.location.hash = 'home';
        });
    }

    // Lucideアイコン初期化
    if (typeof window.initializeLucideIcons === 'function') {
        window.initializeLucideIcons({ immediate: true });
    }

    console.log('✅ ログインページ初期化完了');
};

// ========================================
// 新規登録ページ初期化
// ========================================

window.initRegisterPage = function() {
    console.log('📝 新規登録ページ初期化開始');

    const registerForm = document.getElementById('register-form');
    const passwordToggle = document.getElementById('password-toggle');
    const passwordConfirmToggle = document.getElementById('password-confirm-toggle');
    const googleRegisterBtn = document.getElementById('google-register-btn');
    const appleRegisterBtn = document.getElementById('apple-register-btn');

    // パスワード表示/非表示トグル
    setupPasswordToggle(passwordToggle, 'register-password');
    setupPasswordToggle(passwordConfirmToggle, 'register-password-confirm');

    // 登録フォーム送信
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            hideRegisterError();

            const name = document.getElementById('register-name').value;
            const email = document.getElementById('register-email').value;
            const password = document.getElementById('register-password').value;
            const passwordConfirm = document.getElementById('register-password-confirm').value;
            const termsAgree = document.getElementById('terms-agree').checked;
            const submitBtn = document.getElementById('register-submit-btn');

            // バリデーション
            if (password !== passwordConfirm) {
                showRegisterError('パスワードが一致しません。');
                return;
            }

            if (password.length < 8) {
                showRegisterError('パスワードは8文字以上で入力してください。');
                return;
            }

            if (!termsAgree) {
                showRegisterError('利用規約への同意が必要です。');
                return;
            }

            console.log('📝 新規登録試行:', email);

            // ボタンを無効化
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i data-lucide="loader-2" class="animate-spin"></i><span>登録中...</span>';
            if (typeof window.initializeLucideIcons === 'function') {
                window.initializeLucideIcons({ immediate: true });
            }

            try {
                // ユーザー作成
                const userCredential = await window.firebaseAuth.createUserWithEmailAndPassword(email, password);

                // 表示名を設定
                await userCredential.user.updateProfile({
                    displayName: name
                });

                console.log('✅ 新規登録成功');
                window.location.hash = 'home';
            } catch (error) {
                console.error('❌ 新規登録エラー:', error);
                showRegisterError(getFirebaseErrorMessage(error.code));
            } finally {
                // ボタンを復元
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i data-lucide="user-plus"></i><span>アカウントを作成</span>';
                if (typeof window.initializeLucideIcons === 'function') {
                    window.initializeLucideIcons({ immediate: true });
                }
            }
        });
    }

    // Googleで登録
    if (googleRegisterBtn) {
        googleRegisterBtn.addEventListener('click', async () => {
            console.log('🔵 Google登録開始');
            hideRegisterError();

            try {
                const provider = new firebase.auth.GoogleAuthProvider();
                await window.firebaseAuth.signInWithPopup(provider);
                console.log('✅ Google登録成功');
                window.location.hash = 'home';
            } catch (error) {
                console.error('❌ Google登録エラー:', error);
                if (error.code !== 'auth/popup-closed-by-user') {
                    showRegisterError(getFirebaseErrorMessage(error.code));
                }
            }
        });
    }

    // Appleで登録
    if (appleRegisterBtn) {
        appleRegisterBtn.addEventListener('click', async () => {
            console.log('⚫ Apple登録開始');
            hideRegisterError();

            try {
                const provider = new firebase.auth.OAuthProvider('apple.com');
                provider.addScope('email');
                provider.addScope('name');
                await window.firebaseAuth.signInWithPopup(provider);
                console.log('✅ Apple登録成功');
                window.location.hash = 'home';
            } catch (error) {
                console.error('❌ Apple登録エラー:', error);
                if (error.code !== 'auth/popup-closed-by-user') {
                    showRegisterError(getFirebaseErrorMessage(error.code));
                }
            }
        });
    }

    // Lucideアイコン初期化
    if (typeof window.initializeLucideIcons === 'function') {
        window.initializeLucideIcons({ immediate: true });
    }

    console.log('✅ 新規登録ページ初期化完了');
};

// ========================================
// パスワードリセットページ初期化
// ========================================

window.initPasswordResetPage = function() {
    console.log('🔑 パスワードリセットページ初期化開始');

    const resetForm = document.getElementById('password-reset-form');

    if (resetForm) {
        resetForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            hideResetError();

            const email = document.getElementById('reset-email').value;
            const submitBtn = document.getElementById('reset-submit-btn');

            console.log('🔑 パスワードリセット試行:', email);

            // ボタンを無効化
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i data-lucide="loader-2" class="animate-spin"></i><span>送信中...</span>';
            if (typeof window.initializeLucideIcons === 'function') {
                window.initializeLucideIcons({ immediate: true });
            }

            try {
                await window.firebaseAuth.sendPasswordResetEmail(email);
                console.log('✅ パスワードリセットメール送信成功');
                showResetSuccess();
            } catch (error) {
                console.error('❌ パスワードリセットエラー:', error);
                showResetError(getFirebaseErrorMessage(error.code));
            } finally {
                // ボタンを復元
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i data-lucide="send"></i><span>リセットメールを送信</span>';
                if (typeof window.initializeLucideIcons === 'function') {
                    window.initializeLucideIcons({ immediate: true });
                }
            }
        });
    }

    // Lucideアイコン初期化
    if (typeof window.initializeLucideIcons === 'function') {
        window.initializeLucideIcons({ immediate: true });
    }

    console.log('✅ パスワードリセットページ初期化完了');
};

// ========================================
// ヘルパー関数
// ========================================

/**
 * パスワード表示トグルのセットアップ
 */
function setupPasswordToggle(toggleBtn, inputId) {
    if (!toggleBtn) return;

    toggleBtn.addEventListener('click', () => {
        const input = document.getElementById(inputId);
        const icon = toggleBtn.querySelector('i');

        if (input.type === 'password') {
            input.type = 'text';
            icon.setAttribute('data-lucide', 'eye-off');
        } else {
            input.type = 'password';
            icon.setAttribute('data-lucide', 'eye');
        }

        if (typeof window.initializeLucideIcons === 'function') {
            window.initializeLucideIcons({ immediate: true });
        }
    });
}

/**
 * Firebaseエラーコードを日本語メッセージに変換
 */
function getFirebaseErrorMessage(errorCode) {
    const errorMessages = {
        'auth/email-already-in-use': 'このメールアドレスは既に使用されています。',
        'auth/invalid-email': 'メールアドレスの形式が正しくありません。',
        'auth/operation-not-allowed': 'この認証方法は現在利用できません。',
        'auth/weak-password': 'パスワードが弱すぎます。より強力なパスワードを設定してください。',
        'auth/user-disabled': 'このアカウントは無効化されています。',
        'auth/user-not-found': 'このメールアドレスに対応するアカウントが見つかりません。',
        'auth/wrong-password': 'パスワードが正しくありません。',
        'auth/invalid-credential': 'メールアドレスまたはパスワードが正しくありません。',
        'auth/too-many-requests': 'ログイン試行が多すぎます。しばらく待ってから再試行してください。',
        'auth/network-request-failed': 'ネットワークエラーが発生しました。接続を確認してください。',
        'auth/popup-blocked': 'ポップアップがブロックされました。ポップアップを許可してください。',
        'auth/popup-closed-by-user': 'ログインがキャンセルされました。',
        'auth/account-exists-with-different-credential': 'このメールアドレスは別の認証方法で登録されています。'
    };

    return errorMessages[errorCode] || `エラーが発生しました (${errorCode})`;
}

/**
 * ログインエラー表示
 */
function showLoginError(message) {
    const errorDiv = document.getElementById('login-error');
    const errorMessage = document.getElementById('login-error-message');

    if (errorDiv && errorMessage) {
        errorMessage.textContent = message;
        errorDiv.style.display = 'flex';

        // Lucideアイコン再初期化
        if (typeof window.initializeLucideIcons === 'function') {
            window.initializeLucideIcons({ immediate: true });
        }
    }
}

/**
 * ログインエラー非表示
 */
function hideLoginError() {
    const errorDiv = document.getElementById('login-error');
    if (errorDiv) {
        errorDiv.style.display = 'none';
    }
}

/**
 * 登録エラー表示
 */
function showRegisterError(message) {
    const errorDiv = document.getElementById('register-error');
    const errorMessage = document.getElementById('register-error-message');

    if (errorDiv && errorMessage) {
        errorMessage.textContent = message;
        errorDiv.style.display = 'flex';

        if (typeof window.initializeLucideIcons === 'function') {
            window.initializeLucideIcons({ immediate: true });
        }
    }
}

/**
 * 登録エラー非表示
 */
function hideRegisterError() {
    const errorDiv = document.getElementById('register-error');
    if (errorDiv) {
        errorDiv.style.display = 'none';
    }
}

/**
 * パスワードリセット成功表示
 */
function showResetSuccess() {
    const form = document.getElementById('password-reset-form');
    const successDiv = document.getElementById('reset-success');

    if (form && successDiv) {
        form.style.display = 'none';
        successDiv.style.display = 'block';

        if (typeof window.initializeLucideIcons === 'function') {
            window.initializeLucideIcons({ immediate: true });
        }
    }
}

/**
 * パスワードリセットエラー表示
 */
function showResetError(message) {
    const errorDiv = document.getElementById('reset-error');
    const errorMessage = document.getElementById('reset-error-message');

    if (errorDiv && errorMessage) {
        errorMessage.textContent = message;
        errorDiv.style.display = 'flex';

        if (typeof window.initializeLucideIcons === 'function') {
            window.initializeLucideIcons({ immediate: true });
        }
    }
}

/**
 * パスワードリセットエラー非表示
 */
function hideResetError() {
    const errorDiv = document.getElementById('reset-error');
    if (errorDiv) {
        errorDiv.style.display = 'none';
    }
}
