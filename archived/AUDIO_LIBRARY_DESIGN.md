# PitchPro.js - 音響ライブラリ完全コンポーネント化設計書

**バージョン**: 1.0.0  
**作成日**: 2025-08-07  
**用途**: 音響関連技術の完全コンポーネント化・ライブラリ設計・技術共用戦略

---

## 🎯 ライブラリ化戦略概要

### **目的**
- **技術共用**: 音響処理技術を他プロジェクトで再利用可能にする
- **コンポーネント化**: モジュラー設計による柔軟性・拡張性確保
- **品質保証**: 統一されたAPIと徹底したテスト環境
- **開発効率**: npm/CDN配信による簡単導入

### **設計原則**
1. **フレームワーク非依存**: Vanilla JavaScript/TypeScriptでの実装
2. **モジュラー構成**: 必要機能のみ選択的インポート可能
3. **TypeScript完全対応**: 型安全性と開発効率の両立
4. **メモリリーク防止**: 適切なリソース管理と cleanup 機能
5. **パフォーマンス最優先**: 60FPS リアルタイム処理保証

---

## 🏗️ アーキテクチャ設計

### **ライブラリ構成**
```
PitchPro.js/
├── core/                    # コア機能（必須）
│   ├── AudioManager.js      # 音声リソース統一管理
│   ├── PitchDetector.js     # 高精度音程検出
│   └── NoiseFilter.js       # 3段階ノイズリダクション
├── advanced/                # 高度機能（オプション）
│   ├── HarmonicCorrection.js # 倍音誤検出補正
│   ├── VoiceAnalyzer.js     # 音声品質分析
│   └── CalibrationSystem.js # デバイス別最適化
├── utils/                   # ユーティリティ（便利機能）
│   ├── FrequencyUtils.js    # 周波数↔音名変換
│   ├── MusicTheory.js       # 音楽理論計算
│   └── DeviceDetection.js   # デバイス・ブラウザ判定
└── integrations/            # 外部連携（フレームワーク別）
    ├── react/               # React ラッパー
    ├── vue/                 # Vue ラッパー
    └── svelte/              # Svelte ラッパー
```

### **依存関係図**
```
┌─────────────────┐    ┌─────────────────┐
│   PitchPro.js   │    │     Pitchy      │
│   (ライブラリ)    │◄───┤  (音程検出エンジン)  │
└─────────────────┘    └─────────────────┘
         │
         ▼
┌─────────────────┐    ┌─────────────────┐
│  AudioManager   │◄───┤  Web Audio API  │
└─────────────────┘    └─────────────────┘
         │
         ▼
┌─────────────────┐
│ アプリケーション  │
│ (相対音感アプリ)  │
└─────────────────┘
```

---

## 📦 コアモジュール詳細設計

### **1. AudioManager - 音声リソース統一管理**
```typescript
class AudioManager {
  private static instance: AudioManager;
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private referenceCount: number = 0;

  // シングルトンパターンで全アプリケーション統一管理
  static getInstance(): AudioManager {
    if (!AudioManager.instance) {
      AudioManager.instance = new AudioManager();
    }
    return AudioManager.instance;
  }

  async initialize(constraints?: MediaStreamConstraints): Promise<void> {
    this.referenceCount++;
    
    if (this.audioContext && this.mediaStream) {
      return; // 既に初期化済み
    }

    try {
      // AudioContext 初期化
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      
      // マイクアクセス（MicrophoneControllerに委譲）
      const micController = MicrophoneController.getInstance();
      this.mediaStream = await micController.requestMicrophone({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          ...constraints?.audio
        }
      });

      // SourceNode 作成
      this.sourceNode = this.audioContext.createMediaStreamSource(this.mediaStream);

    } catch (error) {
      throw new AudioManagerError(`初期化失敗: ${error.message}`);
    }
  }

  // 他のコンポーネントがアクセス用のメソッド
  getAudioContext(): AudioContext {
    if (!this.audioContext) {
      throw new AudioManagerError('AudioContext未初期化');
    }
    return this.audioContext;
  }

  getSourceNode(): MediaStreamAudioSourceNode {
    if (!this.sourceNode) {
      throw new AudioManagerError('SourceNode未初期化');
    }
    return this.sourceNode;
  }

  // リソース解放（参照カウント管理）
  cleanup(): void {
    this.referenceCount--;
    
    if (this.referenceCount <= 0) {
      this.mediaStream?.getTracks().forEach(track => track.stop());
      this.audioContext?.close();
      
      this.mediaStream = null;
      this.audioContext = null;
      this.sourceNode = null;
      this.referenceCount = 0;
    }
  }
}
```

### **2. PitchDetector - 高精度音程検出**
```typescript
class PitchDetector {
  private audioManager: AudioManager;
  private analyser: AnalyserNode;
  private pitchDetector: PitchDetector<Float32Array>;
  private isActive: boolean = false;
  private animationFrame: number | null = null;

  constructor(options: PitchDetectorOptions = {}) {
    this.audioManager = AudioManager.getInstance();
    this.setupAnalyser(options);
    this.setupPitchDetection(options);
  }

  private setupAnalyser(options: PitchDetectorOptions): void {
    const context = this.audioManager.getAudioContext();
    this.analyser = context.createAnalyser();
    this.analyser.fftSize = options.fftSize || 4096;
    this.analyser.smoothingTimeConstant = options.smoothing || 0.1;
  }

  private setupPitchDetection(options: PitchDetectorOptions): void {
    // Pitchy ライブラリ統合
    this.pitchDetector = PitchDetector.forFloat32Array(this.analyser.fftSize);
  }

  async start(callback: PitchCallback): Promise<void> {
    if (this.isActive) return;

    await this.audioManager.initialize();
    
    // オーディオチェーン構築
    const sourceNode = this.audioManager.getSourceNode();
    const noiseFilter = new NoiseFilter();
    
    sourceNode
      .connect(noiseFilter.getFilterChain())
      .connect(this.analyser);

    this.isActive = true;
    this.detectPitch(callback);
  }

  private detectPitch(callback: PitchCallback): void {
    if (!this.isActive) return;

    const buffer = new Float32Array(this.analyser.fftSize);
    this.analyser.getFloatTimeDomainData(buffer);

    // McLeod Pitch Method による高精度検出
    const [pitch, clarity] = this.pitchDetector.findPitch(
      buffer, 
      this.audioManager.getAudioContext().sampleRate
    );

    if (pitch && clarity > 0.8) { // 信頼度80%以上のみ
      callback({
        frequency: pitch,
        clarity: clarity,
        note: FrequencyUtils.frequencyToNote(pitch),
        cents: FrequencyUtils.frequencyToCents(pitch)
      });
    }

    this.animationFrame = requestAnimationFrame(() => this.detectPitch(callback));
  }

  stop(): void {
    this.isActive = false;
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
  }

  destroy(): void {
    this.stop();
    this.audioManager.cleanup();
  }
}
```

### **3. MicrophoneLifecycleManager - ライフサイクル管理コンポーネント**
**役割**: マイクロフォンライフサイクルの完全制御（ページ遷移・idle・リダイレクト対応）
**実装**: 参照カウント管理、健康監視、セッション間使い回し、自動異常検知・復旧

```typescript
class MicrophoneLifecycleManager {
  private static instance: MicrophoneLifecycleManager;
  private refCount = 0;
  private mediaStreamListeners = new Map();
  private healthMonitorInterval = null;
  private audioManager: AudioManager;

  static getInstance(): MicrophoneLifecycleManager {
    if (!MicrophoneLifecycleManager.instance) {
      MicrophoneLifecycleManager.instance = new MicrophoneLifecycleManager();
    }
    return MicrophoneLifecycleManager.instance;
  }

  // 参照カウント管理（安全なリソース共有）
  acquire(): Promise<MediaStreamResources> {
    this.refCount++;
    console.log(`🔄 [LifecycleManager] 参照カウント増加: ${this.refCount}`);
    return this.audioManager.initialize();
  }

  release(): void {
    this.refCount = Math.max(0, this.refCount - 1);
    console.log(`📉 [LifecycleManager] 参照カウント減少: ${this.refCount}`);
    
    if (this.refCount <= 0) {
      this.safeCleanup();
    }
  }

  // MediaStream健康監視（自動異常検知・復旧）
  setupMediaStreamMonitoring(mediaStream: MediaStream): void {
    mediaStream.getTracks().forEach(track => {
      const endedHandler = () => this.handleTrackEnded(track);
      const muteHandler = () => this.handleTrackMuted(track);
      const unmuteHandler = () => this.handleTrackUnmuted(track);
      
      track.addEventListener('ended', endedHandler);
      track.addEventListener('mute', muteHandler);
      track.addEventListener('unmute', unmuteHandler);
      
      this.mediaStreamListeners.set(track, { endedHandler, muteHandler, unmuteHandler });
    });
    
    console.log(`🔍 [LifecycleManager] MediaStream監視開始: ${mediaStream.getTracks().length} tracks`);
  }

  // 3層状態管理（Page Level / Component Level / Health Monitoring）
  checkHealthStatus(): HealthStatus {
    return {
      mediaStreamActive: this.audioManager.mediaStream?.active || false,
      audioContextState: this.audioManager.audioContext?.state || 'none',
      trackStates: this.getTrackStates(),
      healthy: this.isSystemHealthy(),
      refCount: this.refCount
    };
  }

  private handleTrackEnded(track: MediaStreamTrack): void {
    console.error('🚨 [LifecycleManager] MediaStreamTrack終了検出:', track.kind);
    this.dispatchEvent('trackEnded', { track });
    // 自動復旧試行
    this.attemptAutoRecovery();
  }

  private handleTrackMuted(track: MediaStreamTrack): void {
    console.warn('⚠️ [LifecycleManager] MediaStreamTrack muted:', track.kind);
    this.dispatchEvent('trackMuted', { track });
  }

  private handleTrackUnmuted(track: MediaStreamTrack): void {
    console.log('✅ [LifecycleManager] MediaStreamTrack unmuted:', track.kind);
    this.dispatchEvent('trackUnmuted', { track });
  }

  private async attemptAutoRecovery(): Promise<boolean> {
    console.log('🔧 [LifecycleManager] 自動復旧試行開始');
    try {
      await this.audioManager.forceReinitialize();
      console.log('✅ [LifecycleManager] 自動復旧成功');
      this.dispatchEvent('autoRecoverySuccess');
      return true;
    } catch (error) {
      console.error('❌ [LifecycleManager] 自動復旧失敗:', error);
      this.dispatchEvent('autoRecoveryFailed', { error });
      return false;
    }
  }

  private safeCleanup(): void {
    console.log('🧹 [LifecycleManager] 安全クリーンアップ実行');
    
    // MediaStreamイベントリスナーをクリーンアップ
    this.mediaStreamListeners.forEach((handlers, track) => {
      track.removeEventListener('ended', handlers.endedHandler);
      track.removeEventListener('mute', handlers.muteHandler);
      track.removeEventListener('unmute', handlers.unmuteHandler);
    });
    this.mediaStreamListeners.clear();
    
    // AudioManager経由でリソース解放
    this.audioManager.cleanup();
    
    console.log('✅ [LifecycleManager] クリーンアップ完了');
  }

  private dispatchEvent(type: string, detail?: any): void {
    window.dispatchEvent(new CustomEvent(`pitchpro:lifecycle:${type}`, { detail }));
  }

  // SSR環境対応チェック（ブラウザ専用API安全実行）
  static isBrowserEnvironment(): boolean {
    return typeof window !== 'undefined' && 
           typeof navigator !== 'undefined' && 
           typeof AudioContext !== 'undefined';
  }

  // 安全な初期化（SSR環境では実行しない）
  static safeInitialize(): Promise<MicrophoneLifecycleManager | null> {
    if (!this.isBrowserEnvironment()) {
      console.warn('🚫 [LifecycleManager] SSR環境では初期化をスキップ');
      return Promise.resolve(null);
    }
    
    return Promise.resolve(this.getInstance());
  }
}
```

### **4. MicrophoneController - デバイス制御コンポーネント**
```typescript
class MicrophoneController {
  private static instance: MicrophoneController;
  private mediaStream: MediaStream | null = null;
  private isActive: boolean = false;
  private permissionState: PermissionState = 'prompt';
  private deviceId: string | null = null;
  private sensitivity: number = 1.0;
  private noiseGate: number = -60; // dB
  
  // デバイス別デフォルト設定（実機検証値適用）
  private deviceDefaults = {
    iPhone: { sensitivity: 3.0, noiseGate: -50 },
    iPad: { sensitivity: 7.0, noiseGate: -55 },    // 実機検証値に更新
    PC: { sensitivity: 1.0, noiseGate: -60 }
  };

  static getInstance(): MicrophoneController {
    if (!MicrophoneController.instance) {
      MicrophoneController.instance = new MicrophoneController();
    }
    return MicrophoneController.instance;
  }

  // マイク許可チェック（非侵入的）
  async checkPermission(): Promise<PermissionState> {
    if ('permissions' in navigator) {
      try {
        const result = await navigator.permissions.query({ 
          name: 'microphone' as PermissionName 
        });
        this.permissionState = result.state;
        return result.state;
      } catch (error) {
        console.warn('Permission API not available:', error);
      }
    }
    
    // フォールバック: localStorage チェック
    const cachedPermission = localStorage.getItem('mic-permission');
    if (cachedPermission === 'granted') {
      this.permissionState = 'granted';
      return 'granted';
    }
    
    return 'prompt';
  }

  // マイクアクセス要求
  async requestMicrophone(
    constraints?: MediaStreamConstraints
  ): Promise<MediaStream> {
    if (this.mediaStream && this.isActive) {
      return this.mediaStream;
    }

    try {
      // デバイス検出と最適化
      const deviceType = this.detectDeviceType();
      this.applyDeviceDefaults(deviceType);
      
      // 制約設定
      const audioConstraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: false, // 手動制御
          sampleRate: 48000,
          channelCount: 1,
          ...(this.deviceId && { deviceId: this.deviceId }),
          ...(constraints?.audio || {})
        },
        video: false
      };

      // マイクアクセス
      this.mediaStream = await navigator.mediaDevices.getUserMedia(
        audioConstraints
      );
      
      this.isActive = true;
      this.permissionState = 'granted';
      
      // 許可状態を保存
      localStorage.setItem('mic-permission', 'granted');
      localStorage.setItem('mic-permission-timestamp', Date.now().toString());
      
      // イベント発火
      this.dispatchEvent('microphoneGranted', { stream: this.mediaStream });
      
      return this.mediaStream;
      
    } catch (error) {
      this.permissionState = 'denied';
      this.dispatchEvent('microphoneDenied', { error });
      throw error;
    }
  }

  // マイク停止
  async stopMicrophone(): Promise<void> {
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
      this.isActive = false;
      this.dispatchEvent('microphoneStopped');
    }
  }

  // 感度調整
  setSensitivity(value: number): void {
    this.sensitivity = Math.max(0.1, Math.min(10.0, value));
    this.dispatchEvent('sensitivityChanged', { sensitivity: this.sensitivity });
  }

  // ノイズゲート設定
  setNoiseGate(threshold: number): void {
    this.noiseGate = Math.max(-80, Math.min(-20, threshold));
    this.dispatchEvent('noiseGateChanged', { threshold: this.noiseGate });
  }

  // デバイス切り替え
  async switchDevice(deviceId: string): Promise<void> {
    this.deviceId = deviceId;
    
    if (this.isActive) {
      await this.stopMicrophone();
      await this.requestMicrophone();
    }
  }

  // 利用可能デバイスリスト取得
  async getAvailableDevices(): Promise<MediaDeviceInfo[]> {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.filter(device => device.kind === 'audioinput');
  }

  // デバイス判定（iPadOS 13+ 完全対応、実装済み知見活用）
  private detectDeviceType(): 'iPhone' | 'iPad' | 'PC' {
    const ua = navigator.userAgent;
    const isIPhone = /iPhone/.test(ua);
    const isIPad = /iPad/.test(ua);
    const isIPadOS = /Macintosh/.test(ua) && 'ontouchend' in document;
    
    if (isIPhone) return 'iPhone';
    if (isIPad || isIPadOS) return 'iPad';
    return 'PC';
  }

  // デバイス別デフォルト適用（実機検証値使用）
  private applyDeviceDefaults(deviceType: 'iPhone' | 'iPad' | 'PC'): void {
    const defaults = this.deviceDefaults[deviceType];
    this.sensitivity = defaults.sensitivity;
    this.noiseGate = defaults.noiseGate;
    
    console.log(`🎤 Device: ${deviceType}, Defaults applied (実機検証値):`, defaults);
  }

  // ミュート制御（シンプル化成功事例を活用）
  setMuted(gainNode: GainNode, muted: boolean): void {
    gainNode.gain.value = muted ? 0 : this.sensitivity;
    console.log(`🔇 [MicrophoneController] Mute ${muted ? 'ON' : 'OFF'}`);
  }

  // イベントディスパッチャー
  private dispatchEvent(type: string, detail?: any): void {
    window.dispatchEvent(new CustomEvent(`pitchpro:${type}`, { detail }));
  }

  // 自動再接続機能
  async autoReconnect(): Promise<boolean> {
    const maxRetries = 3;
    let retryCount = 0;
    
    while (retryCount < maxRetries) {
      try {
        await this.requestMicrophone();
        return true;
      } catch (error) {
        retryCount++;
        console.warn(`Microphone reconnect attempt ${retryCount} failed`);
        await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
      }
    }
    
    return false;
  }

  // 権限キャッシュ管理
  isPermissionCacheValid(): boolean {
    const timestamp = localStorage.getItem('mic-permission-timestamp');
    if (!timestamp) return false;
    
    const age = Date.now() - parseInt(timestamp, 10);
    const CACHE_DURATION = 30 * 60 * 1000; // 30分
    
    return age < CACHE_DURATION;
  }

  // クリーンアップ
  cleanup(): void {
    this.stopMicrophone();
    localStorage.removeItem('mic-permission');
    localStorage.removeItem('mic-permission-timestamp');
  }
}

// TypeScript型定義
interface MicrophoneControllerEvents {
  'pitchpro:microphoneGranted': CustomEvent<{ stream: MediaStream }>;
  'pitchpro:microphoneDenied': CustomEvent<{ error: Error }>;
  'pitchpro:microphoneStopped': CustomEvent;
  'pitchpro:sensitivityChanged': CustomEvent<{ sensitivity: number }>;
  'pitchpro:noiseGateChanged': CustomEvent<{ threshold: number }>;
}
```

### **4. ErrorNotificationSystem - エラーメッセージ表示システム**
**役割**: リアルタイムエラー通知とユーザーフィードバック（ページ内表示）
**実装**: イベントドリブン通知、視覚的フィードバック、解決方法提示、段階的制御

```typescript
class ErrorNotificationSystem {
  private static instance: ErrorNotificationSystem;
  private notificationContainer: HTMLElement | null = null;
  private activeNotifications: Map<string, NotificationElement> = new Map();

  static getInstance(): ErrorNotificationSystem {
    if (!ErrorNotificationSystem.instance) {
      ErrorNotificationSystem.instance = new ErrorNotificationSystem();
    }
    return ErrorNotificationSystem.instance;
  }

  // 通知表示（shadcn/ui風スタイル）
  showNotification(notification: NotificationConfig): string {
    const id = `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const element = this.createNotificationElement(notification, id);
    
    if (!this.notificationContainer) {
      this.createNotificationContainer();
    }
    
    this.notificationContainer!.appendChild(element);
    this.activeNotifications.set(id, element);
    
    // 自動消去（エラー以外）
    if (notification.type !== 'error' && notification.autoHide !== false) {
      setTimeout(() => this.hideNotification(id), notification.duration || 5000);
    }
    
    console.log(`📢 [ErrorNotification] ${notification.type.toUpperCase()}: ${notification.message}`);
    return id;
  }

  // マイク健康状態エラー専用（SvelteKit実装準拠）
  showMicrophoneHealthError(errors: string[], details?: any): string {
    return this.showNotification({
      type: 'error',
      title: '⚠️ マイク接続に問題があります',
      message: 'マイクが正常に動作していません。以下の問題が検出されました：',
      details: errors,
      solution: 'ページを再読み込みしてマイク許可を再度取得してください。',
      autoHide: false,
      priority: 'high'
    });
  }

  // 通知要素作成（shadcn/ui風デザイン）
  private createNotificationElement(config: NotificationConfig, id: string): NotificationElement {
    const element = document.createElement('div');
    element.className = `notification-card ${config.type}-card`;
    element.setAttribute('data-notification-id', id);
    
    element.innerHTML = `
      <div class="card-header">
        <h3 class="section-title">${config.title}</h3>
        <button class="close-button" onclick="window.pitchpro.notifications.hideNotification('${id}')" aria-label="通知を閉じる">×</button>
      </div>
      <div class="card-content">
        <p class="${config.type}-message">${config.message}</p>
        ${config.details ? `
          <ul class="error-list">
            ${config.details.map(detail => `<li>${detail}</li>`).join('')}
          </ul>
        ` : ''}
        ${config.solution ? `
          <p class="fix-instruction">
            <strong>解決方法:</strong> ${config.solution}
          </p>
        ` : ''}
      </div>
    `;

    return element as NotificationElement;
  }

  // 通知コンテナ作成
  private createNotificationContainer(): void {
    this.notificationContainer = document.createElement('div');
    this.notificationContainer.className = 'notification-container';
    this.notificationContainer.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 9999;
      max-width: 400px;
      pointer-events: none;
    `;
    
    document.body.appendChild(this.notificationContainer);
  }

  // 通知非表示
  hideNotification(id: string): void {
    const element = this.activeNotifications.get(id);
    if (element) {
      element.style.opacity = '0';
      element.style.transform = 'translateX(100%)';
      
      setTimeout(() => {
        element.remove();
        this.activeNotifications.delete(id);
      }, 300);
    }
  }

  // 全通知クリア
  clearAll(): void {
    this.activeNotifications.forEach((element, id) => {
      this.hideNotification(id);
    });
  }

  // イベントリスナー統合（AudioManager等との連携）
  setupEventListeners(): void {
    // マイクライフサイクル管理との連携
    window.addEventListener('pitchpro:lifecycle:trackEnded', (event) => {
      this.showMicrophoneHealthError(['MediaStreamTrack が終了しました'], event.detail);
    });

    window.addEventListener('pitchpro:lifecycle:autoRecoveryFailed', (event) => {
      this.showNotification({
        type: 'error',
        title: '🔧 自動復旧失敗',
        message: 'マイクの自動復旧に失敗しました。手動での復旧が必要です。',
        solution: 'ページをリロードしてマイク許可を再取得してください。',
        autoHide: false
      });
    });

    window.addEventListener('pitchpro:microphoneDenied', (event) => {
      this.showNotification({
        type: 'error',
        title: '🚫 マイクアクセス拒否',
        message: 'マイクへのアクセスが拒否されました。',
        solution: 'ブラウザの設定でマイク許可を有効にしてください。',
        autoHide: false
      });
    });
  }

  // CSS スタイル注入（shadcn/ui風）
  injectStyles(): void {
    const style = document.createElement('style');
    style.textContent = `
      .notification-card {
        pointer-events: auto;
        margin-bottom: 12px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        transition: all 0.3s ease;
        transform: translateX(0);
        opacity: 1;
      }

      .error-card {
        border: 2px solid #fbbf24 !important;
        background: #fef3c7 !important;
      }

      .warning-card {
        border: 2px solid #f59e0b !important;
        background: #fef3c7 !important;
      }

      .success-card {
        border: 2px solid #10b981 !important;
        background: #d1fae5 !important;
      }

      .info-card {
        border: 2px solid #3b82f6 !important;
        background: #dbeafe !important;
      }

      .card-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px 16px;
        border-bottom: 1px solid rgba(0, 0, 0, 0.1);
      }

      .section-title {
        margin: 0;
        font-size: 16px;
        font-weight: 600;
      }

      .close-button {
        background: none;
        border: none;
        font-size: 18px;
        cursor: pointer;
        padding: 4px;
        border-radius: 4px;
        opacity: 0.7;
        transition: opacity 0.2s;
      }

      .close-button:hover {
        opacity: 1;
        background: rgba(0, 0, 0, 0.1);
      }

      .card-content {
        padding: 16px;
      }

      .error-message {
        color: #92400e;
        margin-bottom: 12px;
        font-weight: 500;
      }

      .warning-message {
        color: #92400e;
        margin-bottom: 12px;
      }

      .success-message {
        color: #047857;
        margin-bottom: 12px;
      }

      .info-message {
        color: #1d4ed8;
        margin-bottom: 12px;
      }

      .error-list {
        margin: 8px 0;
        padding-left: 20px;
        color: #92400e;
      }

      .fix-instruction {
        margin-top: 12px;
        padding: 8px;
        background: rgba(0, 0, 0, 0.05);
        border-radius: 4px;
        font-size: 14px;
      }
    `;
    
    document.head.appendChild(style);
  }
}

// TypeScript型定義
interface NotificationConfig {
  type: 'error' | 'warning' | 'success' | 'info';
  title: string;
  message: string;
  details?: string[];
  solution?: string;
  autoHide?: boolean;
  duration?: number;
  priority?: 'low' | 'medium' | 'high';
}

interface NotificationElement extends HTMLElement {
  'data-notification-id': string;
}
```

### **5. NoiseFilter - 3段階ノイズリダクション**
```typescript
class NoiseFilter {
  private filterChain: AudioNode[];
  private highpass: BiquadFilterNode;
  private lowpass: BiquadFilterNode;
  private notch: BiquadFilterNode;

  constructor(options: NoiseFilterOptions = {}) {
    const context = AudioManager.getInstance().getAudioContext();
    this.buildFilterChain(context, options);
  }

  private buildFilterChain(context: AudioContext, options: NoiseFilterOptions): void {
    // ハイパスフィルター（80Hz以下カット）
    this.highpass = context.createBiquadFilter();
    this.highpass.type = 'highpass';
    this.highpass.frequency.value = options.highpassFreq || 80;
    this.highpass.Q.value = options.highpassQ || 0.7;

    // ローパスフィルター（800Hz以上カット）
    this.lowpass = context.createBiquadFilter();
    this.lowpass.type = 'lowpass';
    this.lowpass.frequency.value = options.lowpassFreq || 800;
    this.lowpass.Q.value = options.lowpassQ || 0.7;

    // ノッチフィルター（60Hz電源ノイズカット）
    this.notch = context.createBiquadFilter();
    this.notch.type = 'notch';
    this.notch.frequency.value = options.notchFreq || 60;
    this.notch.Q.value = options.notchQ || 10;

    // チェーン接続
    this.highpass.connect(this.lowpass);
    this.lowpass.connect(this.notch);

    this.filterChain = [this.highpass, this.lowpass, this.notch];
  }

  getFilterChain(): AudioNode {
    return this.highpass;
  }

  // 動的フィルタリング調整
  updateSettings(settings: NoiseFilterSettings): void {
    if (settings.highpass) {
      this.highpass.frequency.value = settings.highpass.frequency;
      this.highpass.Q.value = settings.highpass.Q;
    }
    // ... 他のフィルター設定更新
  }
}
```

---

## 🔧 高度機能モジュール

### **1. HarmonicCorrection - 倍音誤検出補正**
```typescript
class HarmonicCorrection {
  private harmonicPatterns: HarmonicPattern[] = [
    { ratio: 2.0, weight: 0.5 },   // 1オクターブ上
    { ratio: 0.5, weight: 0.3 },   // 1オクターブ下
    { ratio: 3.0, weight: 0.2 },   // 完全5度上
    { ratio: 1.5, weight: 0.15 }   // 完全5度上（1オクターブ内）
  ];

  process(detectedFreq: number, targetFreq: number): CorrectionResult {
    const candidates = this.generateCandidates(detectedFreq);
    const bestCandidate = this.selectBestCandidate(candidates, targetFreq);
    
    return {
      correctedFreq: bestCandidate.frequency,
      confidence: bestCandidate.confidence,
      correctionApplied: bestCandidate.frequency !== detectedFreq
    };
  }

  private generateCandidates(freq: number): FrequencyCandidate[] {
    const candidates: FrequencyCandidate[] = [
      { frequency: freq, confidence: 1.0 } // 原音
    ];

    // 各倍音パターンで候補生成
    this.harmonicPatterns.forEach(pattern => {
      candidates.push({
        frequency: freq / pattern.ratio,
        confidence: pattern.weight
      });
    });

    return candidates;
  }

  private selectBestCandidate(candidates: FrequencyCandidate[], target: number): FrequencyCandidate {
    return candidates.reduce((best, current) => {
      const currentScore = this.calculateScore(current, target);
      const bestScore = this.calculateScore(best, target);
      return currentScore > bestScore ? current : best;
    });
  }

  private calculateScore(candidate: FrequencyCandidate, target: number): number {
    const cents = Math.abs(FrequencyUtils.frequencyToCents(candidate.frequency, target));
    const proximityScore = Math.max(0, 100 - cents) / 100; // セント差によるスコア
    return candidate.confidence * proximityScore;
  }
}
```

### **2. VoiceAnalyzer - 音声品質分析**
```typescript
class VoiceAnalyzer {
  private analysisBuffer: AnalysisFrame[] = [];
  private readonly bufferSize = 30; // 30フレーム保持

  analyze(audioData: Float32Array): VoiceAnalysis {
    const frame: AnalysisFrame = {
      timestamp: performance.now(),
      rms: this.calculateRMS(audioData),
      zcr: this.calculateZCR(audioData),
      spectralCentroid: this.calculateSpectralCentroid(audioData),
      pitch: this.detectPitch(audioData)
    };

    this.analysisBuffer.push(frame);
    if (this.analysisBuffer.length > this.bufferSize) {
      this.analysisBuffer.shift();
    }

    return {
      quality: this.assessVoiceQuality(frame),
      stability: this.calculateStability(),
      recommendations: this.generateRecommendations(frame)
    };
  }

  private calculateRMS(data: Float32Array): number {
    const sum = data.reduce((acc, val) => acc + val * val, 0);
    return Math.sqrt(sum / data.length);
  }

  private calculateZCR(data: Float32Array): number {
    let crossings = 0;
    for (let i = 1; i < data.length; i++) {
      if ((data[i] >= 0) !== (data[i - 1] >= 0)) {
        crossings++;
      }
    }
    return crossings / (2 * data.length);
  }

  private assessVoiceQuality(frame: AnalysisFrame): VoiceQuality {
    const rmsScore = Math.min(frame.rms * 10, 1); // 音量スコア
    const stabilityScore = this.calculateStability(); // 安定性スコア
    const clarityScore = frame.pitch.clarity; // 音程明瞭度

    const overallScore = (rmsScore + stabilityScore + clarityScore) / 3;

    if (overallScore >= 0.8) return VoiceQuality.EXCELLENT;
    if (overallScore >= 0.6) return VoiceQuality.GOOD;
    if (overallScore >= 0.4) return VoiceQuality.FAIR;
    return VoiceQuality.POOR;
  }

  private generateRecommendations(frame: AnalysisFrame): string[] {
    const recommendations: string[] = [];

    if (frame.rms < 0.05) {
      recommendations.push("もう少し大きな声で歌ってください");
    }
    if (frame.rms > 0.3) {
      recommendations.push("声が大きすぎます。少し抑えて歌ってください");
    }
    if (frame.pitch.clarity < 0.6) {
      recommendations.push("より明瞭に発声してください");
    }

    return recommendations;
  }
}
```

---

## 🛠️ ユーティリティモジュール

### **FrequencyUtils - 周波数↔音名変換**
```typescript
class FrequencyUtils {
  private static readonly A4_FREQ = 440.0;
  private static readonly NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

  static frequencyToNote(freq: number): MusicalNote {
    const midiNumber = this.frequencyToMidi(freq);
    const noteIndex = midiNumber % 12;
    const octave = Math.floor(midiNumber / 12) - 1;
    
    return {
      name: this.NOTE_NAMES[noteIndex],
      octave: octave,
      midi: midiNumber,
      frequency: freq
    };
  }

  static frequencyToMidi(freq: number): number {
    return 69 + 12 * Math.log2(freq / this.A4_FREQ);
  }

  static midiToFrequency(midi: number): number {
    return this.A4_FREQ * Math.pow(2, (midi - 69) / 12);
  }

  static frequencyToCents(freq: number, reference: number): number {
    return 1200 * Math.log2(freq / reference);
  }

  static centsToRatio(cents: number): number {
    return Math.pow(2, cents / 1200);
  }

  // 相対音感専用: 基音からの音程計算
  static getIntervalFromRoot(freq: number, rootFreq: number): MusicalInterval {
    const cents = this.frequencyToCents(freq, rootFreq);
    const semitones = Math.round(cents / 100);
    
    const intervalNames = ['ド', 'ド#', 'レ', 'レ#', 'ミ', 'ファ', 'ファ#', 'ソ', 'ソ#', 'ラ', 'ラ#', 'シ'];
    const intervalIndex = ((semitones % 12) + 12) % 12;
    
    return {
      name: intervalNames[intervalIndex],
      semitones: semitones,
      cents: cents,
      ratio: freq / rootFreq
    };
  }
}
```

### **MusicTheory - 音楽理論計算**
```typescript
class MusicTheory {
  // 音程関係定義
  private static readonly INTERVALS = {
    'ド': 0, 'レ': 2, 'ミ': 4, 'ファ': 5, 'ソ': 7, 'ラ': 9, 'シ': 11
  };

  // スケール定義
  private static readonly SCALES = {
    major: [0, 2, 4, 5, 7, 9, 11],
    minor: [0, 2, 3, 5, 7, 8, 10],
    pentatonic: [0, 2, 4, 7, 9]
  };

  static generateScale(root: number, scaleType: string = 'major'): number[] {
    const intervals = this.SCALES[scaleType];
    if (!intervals) {
      throw new Error(`未知のスケール: ${scaleType}`);
    }

    return intervals.map(interval => 
      FrequencyUtils.midiToFrequency(root + interval)
    );
  }

  static getExpectedFrequencies(baseFreq: number): ScaleFrequencies {
    const baseMidi = FrequencyUtils.frequencyToMidi(baseFreq);
    const scale = this.generateScale(Math.round(baseMidi));
    
    return {
      'ド': scale[0],
      'レ': scale[1], 
      'ミ': scale[2],
      'ファ': scale[3],
      'ソ': scale[4],
      'ラ': scale[5],
      'シ': scale[6],
      'ド（高）': scale[0] * 2
    };
  }

  // 音程精度判定
  static evaluatePitchAccuracy(detected: number, expected: number): AccuracyResult {
    const cents = Math.abs(FrequencyUtils.frequencyToCents(detected, expected));
    
    let accuracy: AccuracyLevel;
    if (cents <= 10) accuracy = AccuracyLevel.PERFECT;
    else if (cents <= 25) accuracy = AccuracyLevel.EXCELLENT;
    else if (cents <= 50) accuracy = AccuracyLevel.GOOD;
    else if (cents <= 100) accuracy = AccuracyLevel.FAIR;
    else accuracy = AccuracyLevel.POOR;

    return {
      accuracy,
      centsOff: cents,
      score: Math.max(0, 100 - cents * 2) // セント誤差×2をスコアから減点
    };
  }
}
```

---

## 📚 パッケージ化・配布戦略

### **NPM パッケージ設定**
```json
{
  "name": "@pitchpro/audio-processing",
  "version": "1.0.0",
  "description": "High-precision pitch detection and audio processing library",
  "main": "dist/index.js",
  "module": "dist/index.esm.js",
  "types": "dist/index.d.ts",
  "files": [
    "dist/**/*",
    "README.md",
    "CHANGELOG.md"
  ],
  
  "exports": {
    ".": {
      "import": "./dist/index.esm.js",
      "require": "./dist/index.js",
      "types": "./dist/index.d.ts"
    },
    "./core": {
      "import": "./dist/core.esm.js",
      "require": "./dist/core.js"
    },
    "./advanced": {
      "import": "./dist/advanced.esm.js", 
      "require": "./dist/advanced.js"
    },
    "./utils": {
      "import": "./dist/utils.esm.js",
      "require": "./dist/utils.js"
    }
  },

  "scripts": {
    "build": "rollup -c",
    "test": "vitest",
    "lint": "eslint src/",
    "docs": "typedoc src/",
    "prepublishOnly": "npm run build && npm test"
  },

  "peerDependencies": {
    "pitchy": "^4.0.0"
  },

  "devDependencies": {
    "@types/node": "^20.0.0",
    "rollup": "^4.0.0",
    "@rollup/plugin-typescript": "^11.0.0",
    "typescript": "^5.0.0",
    "vitest": "^1.0.0",
    "eslint": "^8.0.0",
    "typedoc": "^0.25.0"
  },

  "keywords": [
    "audio", "pitch-detection", "music", "webaudio",
    "typescript", "relative-pitch", "music-education"
  ],

  "repository": {
    "type": "git",
    "url": "https://github.com/pitchpro/audio-processing.git"
  },

  "license": "MIT"
}
```

### **CDN 配布設定**
```javascript
// Cloudflare CDN での配布
const cdnDistribution = {
  base_url: "https://cdn.pitchpro.io/",
  
  bundles: {
    core: {
      file: "pitchpro-core.min.js",
      size: "~20KB",
      includes: ["AudioManager", "PitchDetector", "NoiseFilter"]
    },
    
    full: {
      file: "pitchpro-full.min.js", 
      size: "~45KB",
      includes: ["all modules"]
    },
    
    modular: {
      pattern: "pitchpro-{module}.min.js",
      modules: ["core", "advanced", "utils"],
      allows: "selective loading"
    }
  },

  versioning: {
    latest: "https://cdn.pitchpro.io/latest/pitchpro.min.js",
    stable: "https://cdn.pitchpro.io/v1/pitchpro.min.js",
    specific: "https://cdn.pitchpro.io/v1.0.0/pitchpro.min.js"
  }
};
```

### **使用例**
```html
<!-- CDN経由 -->
<script src="https://cdn.pitchpro.io/v1/pitchpro.min.js"></script>
<script>
  const detector = new PitchPro.PitchDetector();
  detector.start((result) => {
    console.log(`検出周波数: ${result.frequency}Hz`);
  });
</script>
```

```javascript
// NPM経由 - 基本使用例
import { PitchDetector, AudioManager, ErrorNotificationSystem } from '@pitchpro/audio-processing';

const detector = new PitchDetector({
  fftSize: 4096,
  smoothing: 0.1
});

const notifications = ErrorNotificationSystem.getInstance();
notifications.injectStyles();
notifications.setupEventListeners();

detector.start((result) => {
  console.log(`音程: ${result.note}, 精度: ${result.clarity}`);
});
```

```javascript
// マイク制御コンポーネント使用例
import { MicrophoneController, PitchDetector, ErrorNotificationSystem } from '@pitchpro/audio-processing';

// マイクコントローラー初期化
const micController = MicrophoneController.getInstance();

// マイク許可チェック
const permission = await micController.checkPermission();
if (permission !== 'granted') {
  // マイク許可リクエスト
  await micController.requestMicrophone();
}

// デバイス別最適化が自動適用される
// iPhone: 感度3.0x, iPad: 感度5.0x, PC: 感度1.0x

// イベントリスナー
window.addEventListener('pitchpro:microphoneGranted', (event) => {
  console.log('マイク許可完了', event.detail.stream);
  
  // 音程検出開始
  const detector = new PitchDetector();
  detector.start((result) => {
    console.log(`検出: ${result.frequency}Hz`);
  });
});

// 感度調整
micController.setSensitivity(2.0); // 2倍に設定

// ノイズゲート設定
micController.setNoiseGate(-45); // -45dB以下をカット

// デバイス切り替え
const devices = await micController.getAvailableDevices();
if (devices.length > 1) {
  await micController.switchDevice(devices[1].deviceId);
}

// クリーンアップ
micController.cleanup();
```

```typescript
// TypeScript 型安全使用例
import { 
  MicrophoneController, 
  PitchDetector,
  PitchDetectionResult,
  MicrophoneControllerEvents,
  ErrorNotificationSystem 
} from '@pitchpro/audio-processing';

// 型安全なイベントリスナー
interface ExtendedWindow extends Window {
  addEventListener<K extends keyof MicrophoneControllerEvents>(
    type: K,
    listener: (this: Window, ev: MicrophoneControllerEvents[K]) => any,
    options?: boolean | AddEventListenerOptions
  ): void;
}

declare const window: ExtendedWindow;

window.addEventListener('pitchpro:sensitivityChanged', (event) => {
  // TypeScriptが型を正しく推論
  const sensitivity: number = event.detail.sensitivity;
  console.log(`新しい感度: ${sensitivity}`);
});
```

---

## ✅ 完成後の展開戦略

### **技術共用推進**
1. **オープンソース公開**: MIT ライセンスでの GitHub 公開
2. **npm パッケージ**: 週間ダウンロード 100+ 目標
3. **CDN 配信**: グローバル高速配信（Cloudflare）
4. **ドキュメント**: 完全 API ドキュメント + 使用例

### **コミュニティ構築**
1. **技術ブログ**: 実装解説記事執筆
2. **カンファレンス**: 音響処理技術の発表
3. **コントリビューター**: 外部開発者の参加促進
4. **エコシステム**: React/Vue/Svelte ラッパー作成

### **商用展開**
1. **エンタープライズ版**: 高度機能・サポート付き
2. **技術コンサルティング**: 音響処理の技術顧問
3. **カスタマイゼーション**: 特定用途向けカスタム開発

---

**この設計書により、音響関連技術を完全にコンポーネント化し、技術共用可能なライブラリとして展開する完全な戦略が確立されます。**