# ダイレクトアクセス機能 - 技術仕様書

**バージョン**: v1.0.0  
**作成日**: 2025-08-07  
**プロジェクト**: 相対音感トレーニングアプリ - Vanilla TypeScript版  
**関連**: Week 5 アプリ基盤構築フェーズ

---

## 🎯 ダイレクトアクセス機能概要

### **機能の目的**
マイクテストページを経由せず、**URLを直接入力してトレーニングページにアクセス**する機能。リピートユーザーの利便性向上と、ブックマーク・共有リンクからの直接アクセスを実現。

### **対象ページ**
```typescript
const directAccessPages = {
  training_random: "/training/random",
  training_continuous: "/training/continuous", 
  training_chromatic: "/training/chromatic",
  settings: "/settings",
  about: "/about",
  help: "/help"
};
```

### **基本動作フロー**
```
1. ユーザーが直接URL入力 (/training/random)
2. マイク許可状態を自動チェック
3. 許可済み → 直接トレーニング開始
4. 未許可 → マイクテストページへ自動誘導
5. 許可完了後 → 元のページへ自動リダイレクト
```

---

## 🔧 技術的実装設計

### **1. ルーター設計（Vanilla TypeScript）**

#### **SPA ルーター実装**
```typescript
// src/router/Router.ts
class AppRouter {
  private routes: Map<string, RouteHandler>;
  private currentRoute: string = '';
  private redirectTarget: string | null = null;

  constructor() {
    this.routes = new Map();
    this.setupRoutes();
    this.handlePopState();
  }

  private setupRoutes() {
    // メインページ
    this.routes.set('/', () => this.loadHomePage());
    this.routes.set('/microphone-test', () => this.loadMicrophoneTest());
    
    // トレーニングページ（ダイレクトアクセス対応）
    this.routes.set('/training/random', () => this.loadTrainingPage('random'));
    this.routes.set('/training/continuous', () => this.loadTrainingPage('continuous'));
    this.routes.set('/training/chromatic', () => this.loadTrainingPage('chromatic'));
    
    // その他のページ
    this.routes.set('/settings', () => this.loadSettingsPage());
    this.routes.set('/about', () => this.loadAboutPage());
    this.routes.set('/help', () => this.loadHelpPage());
  }

  async navigate(path: string) {
    // ダイレクトアクセス判定・処理
    if (this.isTrainingPath(path)) {
      const hasPermission = await this.checkMicrophonePermission();
      if (!hasPermission) {
        this.redirectTarget = path;
        this.navigate('/microphone-test');
        return;
      }
    }

    this.currentRoute = path;
    window.history.pushState({ path }, '', path);
    await this.executeRoute(path);
  }

  private async loadTrainingPage(mode: TrainingMode) {
    const { TrainingPageManager } = await import('./pages/TrainingPageManager');
    const manager = new TrainingPageManager(mode);
    await manager.initialize();
  }
}
```

#### **マイク許可状態チェック**
```typescript
// src/audio/PermissionChecker.ts
class PermissionChecker {
  /**
   * マイク許可状態を確認（非侵入的チェック）
   */
  async checkMicrophonePermission(): Promise<boolean> {
    try {
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
      
    } catch (error) {
      console.warn('マイク許可チェック失敗:', error);
      return false;
    }
  }

  /**
   * マイク許可取得（ユーザーアクション必須）
   */
  async requestMicrophonePermission(): Promise<boolean> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // 即座にストリーム停止（テスト目的のため）
      stream.getTracks().forEach(track => track.stop());
      
      // 成功をlocalStorageに記録
      localStorage.setItem('mic-test-completed', 'true');
      localStorage.setItem('mic-permission-timestamp', Date.now().toString());
      
      return true;
    } catch (error) {
      console.error('マイク許可取得失敗:', error);
      return false;
    }
  }
}
```

### **2. マイクテストページ統合設計**

#### **リダイレクト処理統合**
```typescript
// src/pages/MicrophoneTestPage.ts
class MicrophoneTestPage {
  private redirectTarget: string | null = null;

  constructor() {
    this.detectRedirectIntent();
  }

  private detectRedirectIntent() {
    // URLパラメータからリダイレクト先を取得
    const urlParams = new URLSearchParams(window.location.search);
    this.redirectTarget = urlParams.get('redirect') || urlParams.get('return');
    
    if (this.redirectTarget) {
      this.showRedirectMessage(this.redirectTarget);
    }
  }

  private showRedirectMessage(target: string) {
    const targetName = this.getPageName(target);
    const messageElement = document.getElementById('redirect-message');
    
    if (messageElement) {
      messageElement.innerHTML = `
        <div class="redirect-info">
          📍 <strong>${targetName}</strong> へのアクセスのため、マイクテストが必要です
          <br>テスト完了後、自動的に移動します
        </div>
      `;
      messageElement.style.display = 'block';
    }
  }

  async onMicrophoneTestCompleted() {
    // 基本的なマイクテスト完了処理
    await this.completeMicrophoneTest();
    
    // リダイレクト処理
    if (this.redirectTarget) {
      console.log(`✅ マイクテスト完了 → ${this.redirectTarget} へリダイレクト`);
      
      // 0.5秒待機してからリダイレクト（ユーザビリティ向上）
      setTimeout(() => {
        window.location.href = this.redirectTarget!;
      }, 500);
    } else {
      // 通常のマイクテスト完了フロー
      this.showTrainingModeSelection();
    }
  }

  private getPageName(path: string): string {
    const pageNames: { [key: string]: string } = {
      '/training/random': 'ランダム基音トレーニング',
      '/training/continuous': '連続チャレンジモード',
      '/training/chromatic': '12音階モード',
      '/settings': '設定',
      '/about': 'アプリについて',
      '/help': 'ヘルプ'
    };
    return pageNames[path] || path;
  }
}
```

### **3. URL生成・共有システム**

#### **直接アクセスURL生成**
```typescript
// src/utils/URLGenerator.ts
class URLGenerator {
  private baseURL: string;

  constructor() {
    this.baseURL = window.location.origin;
  }

  /**
   * トレーニングページ直接アクセスURL生成
   */
  generateTrainingURL(mode: TrainingMode, options?: TrainingOptions): string {
    const basePath = `/training/${mode}`;
    const params = new URLSearchParams();

    if (options) {
      // 高度なオプションをURL パラメータに含める
      if (options.baseNote) params.set('base', options.baseNote);
      if (options.difficulty) params.set('level', options.difficulty.toString());
      if (options.sessionLength) params.set('length', options.sessionLength.toString());
    }

    const queryString = params.toString();
    return `${this.baseURL}${basePath}${queryString ? '?' + queryString : ''}`;
  }

  /**
   * ソーシャル共有用URL生成
   */
  generateShareURL(mode: TrainingMode, score?: number): string {
    const baseURL = this.generateTrainingURL(mode);
    const params = new URLSearchParams();
    
    params.set('shared', 'true');
    if (score !== undefined) {
      params.set('challenge_score', score.toString());
    }
    
    return `${baseURL}${baseURL.includes('?') ? '&' : '?'}${params.toString()}`;
  }

  /**
   * QRコード用短縮URL生成
   */
  generateQRURL(mode: TrainingMode): string {
    // プロダクション環境では短縮URLサービス使用を検討
    return this.generateTrainingURL(mode);
  }
}
```

---

## 🎨 UI/UX設計（Mantine統合）

### **1. ダイレクトアクセス誘導UI**

#### **マイク許可待ちページ**
```typescript
// ダイレクトアクセス時のマイク許可UI
const DirectAccessMicPrompt = () => {
  return `
    <div class="direct-access-container">
      <div class="mantine-card">
        <div class="card-header">
          <h2 class="card-title">
            🎵 相対音感トレーニング
          </h2>
          <p class="card-subtitle">
            トレーニング開始前にマイク許可が必要です
          </p>
        </div>

        <div class="permission-status">
          <div class="status-icon">
            🎤
          </div>
          <div class="status-text">
            マイクロフォンへのアクセスを許可してください
          </div>
        </div>

        <div class="button-group">
          <button class="mantine-button primary" id="grant-permission">
            マイクを許可
          </button>
          <button class="mantine-button secondary" id="go-mic-test">
            詳細テストへ
          </button>
        </div>

        <div class="info-section">
          <div class="info-item">
            <span class="info-icon">🔒</span>
            <span class="info-text">音声データは外部に送信されません</span>
          </div>
          <div class="info-item">
            <span class="info-icon">⚡</span>
            <span class="info-text">ブラウザ内でリアルタイム処理</span>
          </div>
        </div>
      </div>
    </div>
  `;
};
```

#### **リダイレクト進行UI**
```typescript
const RedirectProgressUI = () => {
  return `
    <div class="redirect-progress">
      <div class="progress-icon">
        <div class="loading-spinner"></div>
      </div>
      <div class="progress-text">
        <h3>マイク許可完了 ✅</h3>
        <p>トレーニングページに移動しています...</p>
      </div>
      <div class="progress-bar">
        <div class="progress-fill"></div>
      </div>
    </div>
  `;
};
```

### **2. 共有機能統合UI**

#### **直接アクセスURL共有パネル**
```typescript
const SharePanel = () => {
  return `
    <div class="share-panel">
      <div class="share-header">
        <h3>このトレーニングを共有</h3>
      </div>
      
      <div class="share-options">
        <div class="url-share">
          <label>直接アクセスURL</label>
          <div class="url-input-group">
            <input type="text" class="url-input" id="direct-url" readonly>
            <button class="copy-button" data-target="direct-url">
              📋 コピー
            </button>
          </div>
        </div>

        <div class="social-share">
          <button class="social-button twitter">
            🐦 Twitter
          </button>
          <button class="social-button line">
            💬 LINE
          </button>
          <button class="social-button qr">
            📱 QR コード
          </button>
        </div>
      </div>
    </div>
  `;
};
```

---

## 📊 状態管理・データ永続化

### **1. ダイレクトアクセス状態管理**

#### **SessionManager拡張**
```typescript
// src/state/SessionManager.ts
class SessionManager {
  private directAccessState: DirectAccessState;

  interface DirectAccessState {
    lastAccessPath: string | null;
    micPermissionGranted: boolean;
    micPermissionTimestamp: number | null;
    preferredTrainingMode: TrainingMode | null;
    redirectHistory: string[];
  }

  constructor() {
    this.loadDirectAccessState();
  }

  private loadDirectAccessState() {
    const saved = localStorage.getItem('direct-access-state');
    if (saved) {
      this.directAccessState = JSON.parse(saved);
    } else {
      this.directAccessState = {
        lastAccessPath: null,
        micPermissionGranted: false,
        micPermissionTimestamp: null,
        preferredTrainingMode: null,
        redirectHistory: []
      };
    }
  }

  updateLastAccess(path: string) {
    this.directAccessState.lastAccessPath = path;
    this.saveDirectAccessState();
  }

  setMicPermissionGranted(granted: boolean) {
    this.directAccessState.micPermissionGranted = granted;
    this.directAccessState.micPermissionTimestamp = granted ? Date.now() : null;
    this.saveDirectAccessState();
  }

  addToRedirectHistory(path: string) {
    this.directAccessState.redirectHistory.unshift(path);
    // 履歴は最大10件まで保持
    this.directAccessState.redirectHistory = 
      this.directAccessState.redirectHistory.slice(0, 10);
    this.saveDirectAccessState();
  }

  private saveDirectAccessState() {
    localStorage.setItem(
      'direct-access-state', 
      JSON.stringify(this.directAccessState)
    );
  }
}
```

### **2. マイク許可状態キャッシュ**

#### **許可状態の信頼性管理**
```typescript
// src/audio/PermissionCache.ts
class PermissionCache {
  private static readonly CACHE_DURATION = 30 * 60 * 1000; // 30分

  static isPermissionCacheValid(): boolean {
    const timestamp = localStorage.getItem('mic-permission-timestamp');
    if (!timestamp) return false;

    const age = Date.now() - parseInt(timestamp, 10);
    return age < this.CACHE_DURATION;
  }

  static async refreshPermissionCache(): Promise<boolean> {
    try {
      // 非侵入的な許可状態チェック（実際のストリーム取得はしない）
      if ('permissions' in navigator) {
        const permission = await navigator.permissions.query({ 
          name: 'microphone' as PermissionName 
        });
        
        const isGranted = permission.state === 'granted';
        
        if (isGranted) {
          localStorage.setItem('mic-permission-timestamp', Date.now().toString());
          localStorage.setItem('mic-test-completed', 'true');
        }
        
        return isGranted;
      }
      
      return false;
    } catch (error) {
      console.warn('許可状態更新失敗:', error);
      return false;
    }
  }

  static invalidateCache() {
    localStorage.removeItem('mic-permission-timestamp');
    localStorage.removeItem('mic-test-completed');
  }
}
```

---

## 🔒 セキュリティ・エラーハンドリング

### **1. 不正アクセス対策**

#### **URL検証システム**
```typescript
// src/security/URLValidator.ts
class URLValidator {
  private static readonly ALLOWED_PATHS = [
    '/', '/microphone-test', '/settings', '/about', '/help',
    '/training/random', '/training/continuous', '/training/chromatic'
  ];

  static isValidPath(path: string): boolean {
    // 基本パスの検証
    const basePath = path.split('?')[0]; // クエリパラメータを除去
    return this.ALLOWED_PATHS.includes(basePath);
  }

  static sanitizeParameters(params: URLSearchParams): URLSearchParams {
    const sanitized = new URLSearchParams();
    
    // 許可されたパラメータのみ通す
    const allowedParams = ['redirect', 'return', 'base', 'level', 'length', 'shared', 'challenge_score'];
    
    allowedParams.forEach(param => {
      const value = params.get(param);
      if (value && this.isValidParameterValue(param, value)) {
        sanitized.set(param, value);
      }
    });

    return sanitized;
  }

  private static isValidParameterValue(param: string, value: string): boolean {
    switch (param) {
      case 'redirect':
      case 'return':
        return this.isValidPath(value);
      case 'base':
        return /^[A-G](#|b)?[0-9]$/.test(value); // C4, F#3 etc.
      case 'level':
        return /^[1-5]$/.test(value);
      case 'length':
        return /^(5|8|10|15|20)$/.test(value);
      case 'shared':
        return value === 'true';
      case 'challenge_score':
        return /^\d+$/.test(value) && parseInt(value) <= 1000;
      default:
        return false;
    }
  }
}
```

### **2. エラーリカバリー**

#### **ダイレクトアクセス失敗時の対応**
```typescript
// src/error/DirectAccessErrorHandler.ts
class DirectAccessErrorHandler {
  static async handleAccessFailure(
    originalPath: string, 
    error: DirectAccessError
  ): Promise<void> {
    console.error('ダイレクトアクセス失敗:', error);

    switch (error.type) {
      case 'PERMISSION_DENIED':
        await this.handlePermissionDenied(originalPath);
        break;
        
      case 'INVALID_PATH':
        await this.handleInvalidPath(originalPath);
        break;
        
      case 'TIMEOUT':
        await this.handleTimeout(originalPath);
        break;
        
      default:
        await this.handleGenericError(originalPath, error);
    }
  }

  private static async handlePermissionDenied(originalPath: string) {
    // マイクテストページへの誘導UI表示
    const redirectURL = `/microphone-test?redirect=${encodeURIComponent(originalPath)}`;
    
    showErrorDialog({
      title: 'マイク許可が必要です',
      message: `
        ${this.getPageName(originalPath)}を利用するには
        マイクロフォンへのアクセス許可が必要です。
      `,
      actions: [
        {
          label: 'マイクテストへ',
          action: () => window.location.href = redirectURL,
          primary: true
        },
        {
          label: 'ホームに戻る',
          action: () => window.location.href = '/'
        }
      ]
    });
  }

  private static async handleInvalidPath(originalPath: string) {
    showErrorDialog({
      title: '無効なページです',
      message: `アクセスしようとしたページ（${originalPath}）は存在しません。`,
      actions: [
        {
          label: 'ホームに戻る',
          action: () => window.location.href = '/',
          primary: true
        }
      ]
    });
  }

  private static getPageName(path: string): string {
    const names: { [key: string]: string } = {
      '/training/random': 'ランダム基音トレーニング',
      '/training/continuous': '連続チャレンジモード',
      '/training/chromatic': '12音階モード',
      '/settings': '設定',
      '/about': 'アプリについて',
      '/help': 'ヘルプ'
    };
    return names[path] || 'トレーニング';
  }
}

interface DirectAccessError {
  type: 'PERMISSION_DENIED' | 'INVALID_PATH' | 'TIMEOUT' | 'GENERIC';
  message: string;
  originalPath: string;
}
```

---

## 🧪 テスト・品質保証

### **1. ダイレクトアクセステストスイート**

#### **自動テスト項目**
```typescript
// tests/direct-access.test.ts
describe('ダイレクトアクセス機能', () => {
  describe('URL検証', () => {
    test('有効なトレーニングパスを受け入れる', () => {
      expect(URLValidator.isValidPath('/training/random')).toBe(true);
      expect(URLValidator.isValidPath('/training/continuous')).toBe(true);
      expect(URLValidator.isValidPath('/training/chromatic')).toBe(true);
    });

    test('無効なパスを拒否する', () => {
      expect(URLValidator.isValidPath('/invalid')).toBe(false);
      expect(URLValidator.isValidPath('/training/invalid')).toBe(false);
      expect(URLValidator.isValidPath('/../etc/passwd')).toBe(false);
    });
  });

  describe('マイク許可チェック', () => {
    test('許可済み状態を正しく検出', async () => {
      // モック設定
      mockNavigatorPermissions('granted');
      
      const checker = new PermissionChecker();
      const hasPermission = await checker.checkMicrophonePermission();
      
      expect(hasPermission).toBe(true);
    });

    test('未許可状態を正しく検出', async () => {
      mockNavigatorPermissions('denied');
      
      const checker = new PermissionChecker();
      const hasPermission = await checker.checkMicrophonePermission();
      
      expect(hasPermission).toBe(false);
    });
  });

  describe('リダイレクト機能', () => {
    test('未許可時にマイクテストページへリダイレクト', async () => {
      mockNavigatorPermissions('denied');
      const router = new AppRouter();
      
      await router.navigate('/training/random');
      
      expect(window.location.pathname).toBe('/microphone-test');
      expect(window.location.search).toContain('redirect=%2Ftraining%2Frandom');
    });

    test('許可済み時に直接アクセス成功', async () => {
      mockNavigatorPermissions('granted');
      const router = new AppRouter();
      
      await router.navigate('/training/random');
      
      expect(window.location.pathname).toBe('/training/random');
    });
  });
});
```

### **2. ユーザビリティテスト項目**

#### **手動テストチェックリスト**
```typescript
const usabilityTests = [
  {
    scenario: "初回ユーザーのダイレクトアクセス",
    steps: [
      "1. ブラウザでシークレットモードを開く",
      "2. /training/random に直接アクセス",
      "3. マイク許可プロンプトが表示されることを確認",
      "4. 許可後、トレーニングページに自動遷移することを確認"
    ],
    expected: "スムーズなマイク許可 → トレーニング開始フロー"
  },
  
  {
    scenario: "リピートユーザーのダイレクトアクセス",
    steps: [
      "1. 事前にマイクテストを完了しておく",
      "2. 新しいタブで /training/continuous に直接アクセス",
      "3. マイク許可チェックなしで即座にトレーニング開始"
    ],
    expected: "即座にトレーニング開始（マイク許可スキップ）"
  },
  
  {
    scenario: "共有URLからのアクセス",
    steps: [
      "1. 共有機能でURL生成",
      "2. 別デバイス・ブラウザで共有URLアクセス",
      "3. 適切なリダイレクト・許可フローを確認"
    ],
    expected: "共有されたトレーニング内容に適切にアクセス"
  }
];
```

---

## 📈 パフォーマンス・最適化

### **1. 初期読み込み最適化**

#### **コード分割（Dynamic Import）**
```typescript
// src/router/Router.ts - パフォーマンス最適化版
class AppRouter {
  private async executeRoute(path: string) {
    if (path.startsWith('/training/')) {
      // トレーニングページの遅延読み込み
      const { TrainingPageManager } = await import('./pages/TrainingPageManager');
      const manager = new TrainingPageManager();
      await manager.initialize();
    } else if (path === '/microphone-test') {
      // マイクテストページの遅延読み込み
      const { MicrophoneTestPage } = await import('./pages/MicrophoneTestPage');
      const page = new MicrophoneTestPage();
      await page.initialize();
    }
    // 他のページも同様に動的インポート
  }
}
```

#### **プリロード戦略**
```typescript
// src/preloader/DirectAccessPreloader.ts
class DirectAccessPreloader {
  static async preloadTrainingAssets() {
    // 高頻度アクセスページのプリロード
    const trainingPages = [
      '/training/random',
      '/training/continuous'
    ];

    // Service Worker でのバックグラウンドプリロード
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(registration => {
        registration.active?.postMessage({
          type: 'PRELOAD_PAGES',
          pages: trainingPages
        });
      });
    }

    // 音声ライブラリの事前初期化
    const { PitchPro } = await import('@/lib/PitchPro');
    PitchPro.preloadAudioAssets();
  }
}
```

### **2. キャッシュ戦略**

#### **マイク許可状態キャッシュ最適化**
```typescript
// src/cache/PermissionCache.ts - 最適化版
class OptimizedPermissionCache {
  private static cache = new Map<string, CacheEntry>();
  
  interface CacheEntry {
    value: boolean;
    timestamp: number;
    hits: number;
  }

  static async get(key: string): Promise<boolean | null> {
    const entry = this.cache.get(key);
    
    if (!entry) return null;
    
    // 期限チェック
    if (Date.now() - entry.timestamp > 30 * 60 * 1000) {
      this.cache.delete(key);
      return null;
    }
    
    // ヒット数増加
    entry.hits++;
    
    return entry.value;
  }

  static set(key: string, value: boolean): void {
    this.cache.set(key, {
      value,
      timestamp: Date.now(),
      hits: 0
    });
    
    // 古いエントリの自動クリーンアップ
    this.cleanupOldEntries();
  }

  private static cleanupOldEntries(): void {
    const now = Date.now();
    const expiredEntries: string[] = [];
    
    this.cache.forEach((entry, key) => {
      if (now - entry.timestamp > 30 * 60 * 1000) {
        expiredEntries.push(key);
      }
    });
    
    expiredEntries.forEach(key => this.cache.delete(key));
  }
}
```

---

## 🚀 デプロイ・運用考慮事項

### **1. Cloudflare Pages対応**

#### **リダイレクトルール設定**
```toml
# _redirects ファイル (Cloudflare Pages用)
# SPA のために全ての未定義ルートをindex.htmlにリダイレクト
/*    /index.html   200

# 特定のエラーハンドリング
/training/*  /index.html  200
/microphone-test  /index.html  200
```

#### **ヘッダー最適化**
```toml
# _headers ファイル (Cloudflare Pages用)
/*
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  
/assets/*
  Cache-Control: public, max-age=31536000, immutable
  
/index.html
  Cache-Control: public, max-age=0, must-revalidate
```

### **2. 運用監視**

#### **ダイレクトアクセス分析**
```typescript
// src/analytics/DirectAccessAnalytics.ts
class DirectAccessAnalytics {
  static trackDirectAccess(path: string, hadPermission: boolean) {
    const event = {
      type: 'direct_access',
      path,
      had_permission: hadPermission,
      timestamp: Date.now(),
      user_agent: navigator.userAgent,
      referrer: document.referrer
    };

    // Cloudflare Web Analytics への送信
    if (window.cloudflare) {
      window.cloudflare.track('direct_access', event);
    }

    // 内部分析用ログ
    console.log('📊 Direct Access Event:', event);
  }

  static trackPermissionFlow(fromPath: string, toPath: string, duration: number) {
    const event = {
      type: 'permission_flow',
      from_path: fromPath,
      to_path: toPath,
      duration,
      timestamp: Date.now()
    };

    if (window.cloudflare) {
      window.cloudflare.track('permission_flow', event);
    }
  }
}
```

---

## 📋 実装チェックリスト

### **Phase 1: 基本実装**
- [ ] SPA ルーター実装（AppRouter クラス）
- [ ] マイク許可チェック機能（PermissionChecker クラス）
- [ ] URLValidator 実装（セキュリティ）
- [ ] 基本的なリダイレクト機能

### **Phase 2: UI/UX実装**
- [ ] ダイレクトアクセス誘導UI（Mantine統合）
- [ ] リダイレクト進行表示
- [ ] エラーハンドリングUI
- [ ] 共有機能パネル

### **Phase 3: 状態管理・永続化**
- [ ] SessionManager 拡張（DirectAccessState）
- [ ] PermissionCache 実装
- [ ] localStorage 統合
- [ ] URL生成システム（URLGenerator）

### **Phase 4: テスト・品質保証**
- [ ] 自動テストスイート作成
- [ ] ユーザビリティテスト実行
- [ ] セキュリティテスト
- [ ] パフォーマンステスト

### **Phase 5: 最適化・デプロイ**
- [ ] コード分割・遅延読み込み
- [ ] キャッシュ戦略実装
- [ ] Cloudflare Pages 設定
- [ ] 分析・監視システム

---

**この仕様書により、相対音感トレーニングアプリのダイレクトアクセス機能を完全に実装できます。ユーザビリティ・セキュリティ・パフォーマンスのすべてを考慮した設計で、Vanilla TypeScript + Mantine環境での実装準備が完了しました。**

---

**作成日**: 2025-08-07  
**ステータス**: 設計完了・実装準備完了  
**次の作業**: Vanilla TypeScript + Vite プロジェクト基盤作成