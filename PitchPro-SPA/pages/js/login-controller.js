/**
 * login-controller.js
 * ログイン・登録・パスワードリセットページのコントローラー
 * @version 1.0.0
 * @date 2025-11-29
 *
 * 【責任範囲】
 * - ログインフォームの処理
 * - 新規登録フォームの処理
 * - パスワードリセットの処理
 * - ソーシャルログイン（Google/Apple）
 * - ゲストモード処理
 *
 * 【依存関係】
 * - Firebase Authentication（今後追加予定）
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

            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;

            console.log('📧 ログイン試行:', email);

            // TODO: Firebase Authentication 実装
            // 仮実装：成功したらホームに遷移
            showLoginError('Firebase認証は準備中です。ゲストモードをご利用ください。');
        });
    }

    // Googleログイン
    if (googleLoginBtn) {
        googleLoginBtn.addEventListener('click', async () => {
            console.log('🔵 Googleログイン開始');
            // TODO: Firebase Google OAuth 実装
            showLoginError('Googleログインは準備中です。');
        });
    }

    // Appleログイン
    if (appleLoginBtn) {
        appleLoginBtn.addEventListener('click', async () => {
            console.log('⚫ Appleログイン開始');
            // TODO: Firebase Apple OAuth 実装
            showLoginError('Appleログインは準備中です。');
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

            const name = document.getElementById('register-name').value;
            const email = document.getElementById('register-email').value;
            const password = document.getElementById('register-password').value;
            const passwordConfirm = document.getElementById('register-password-confirm').value;
            const termsAgree = document.getElementById('terms-agree').checked;

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

            // TODO: Firebase Authentication 実装
            showRegisterError('Firebase認証は準備中です。');
        });
    }

    // Googleで登録
    if (googleRegisterBtn) {
        googleRegisterBtn.addEventListener('click', async () => {
            console.log('🔵 Google登録開始');
            // TODO: Firebase Google OAuth 実装
            showRegisterError('Googleログインは準備中です。');
        });
    }

    // Appleで登録
    if (appleRegisterBtn) {
        appleRegisterBtn.addEventListener('click', async () => {
            console.log('⚫ Apple登録開始');
            // TODO: Firebase Apple OAuth 実装
            showRegisterError('Appleログインは準備中です。');
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

            const email = document.getElementById('reset-email').value;

            console.log('🔑 パスワードリセット試行:', email);

            // TODO: Firebase パスワードリセット 実装
            // 仮実装：成功メッセージを表示
            showResetSuccess();
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
