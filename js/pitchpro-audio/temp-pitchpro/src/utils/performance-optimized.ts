/**
 * 音響処理に最適化されたパフォーマンス制御
 * 音質を維持しながらCPU負荷を削減
 */

export class AdaptiveFrameRateLimiter {
  private lastFrameTime = 0;
  private nextFrameTime = 0;
  private targetFPS: number;
  private frameInterval: number;
  private frameDrops = 0;
  
  // 音楽用途に適した範囲
  private readonly MIN_FPS = 30;  // 最低30FPS（33ms以下のレイテンシー）
  private readonly MAX_FPS = 60;  // 最高60FPS（ブラウザ標準）
  private readonly OPTIMAL_FPS = 45; // 推奨45FPS（22ms、音楽演奏に適切）
  
  constructor(initialFPS = 45) {
    this.targetFPS = Math.max(this.MIN_FPS, Math.min(initialFPS, this.MAX_FPS));
    this.frameInterval = 1000 / this.targetFPS;
  }
  
  shouldProcess(): boolean {
    const now = performance.now();
    
    // 初回実行時の初期化
    if (this.nextFrameTime === 0) {
      this.nextFrameTime = now + this.frameInterval;
      this.lastFrameTime = now;
      return true;
    }
    
    // 次フレーム時刻に到達したかチェック
    if (now >= this.nextFrameTime) {
      const actualElapsed = now - this.lastFrameTime;
      
      // フレーム落ちを検出（期待間隔の1.5倍を超過）
      if (actualElapsed > this.frameInterval * 1.5) {
        this.frameDrops++;
        this.adjustFrameRate();
      }
      
      // 次フレーム時刻を絶対時刻で設定（累積誤差を回避）
      this.nextFrameTime = now + this.frameInterval;
      this.lastFrameTime = now;
      
      return true;
    }
    
    return false;
  }
  
  // CPU負荷に応じて動的にFPSを調整
  private adjustFrameRate(): void {
    if (this.frameDrops > 5 && this.targetFPS > this.MIN_FPS) {
      // 負荷が高い場合はFPSを下げる
      this.targetFPS = Math.max(this.MIN_FPS, this.targetFPS - 5);
      this.frameInterval = 1000 / this.targetFPS;
      this.frameDrops = 0;
      
      // 次フレーム時刻を新しい間隔で再計算
      const now = performance.now();
      this.nextFrameTime = now + this.frameInterval;
      
      console.log(`Adjusted FPS to ${this.targetFPS} due to high load`);
    }
  }
  
  // パフォーマンス回復時にFPSを戻す
  recoverPerformance(): void {
    if (this.frameDrops === 0 && this.targetFPS < this.OPTIMAL_FPS) {
      this.targetFPS = Math.min(this.OPTIMAL_FPS, this.targetFPS + 5);
      this.frameInterval = 1000 / this.targetFPS;
      
      // 次フレーム時刻を新しい間隔で再計算
      const now = performance.now();
      this.nextFrameTime = now + this.frameInterval;
    }
  }
  
  reset(): void {
    this.lastFrameTime = 0;
    this.nextFrameTime = 0;
    this.frameDrops = 0;
    this.targetFPS = this.OPTIMAL_FPS;
    this.frameInterval = 1000 / this.targetFPS;
  }
  
  getStats() {
    return {
      currentFPS: this.targetFPS,
      frameDrops: this.frameDrops,
      latency: this.frameInterval
    };
  }
}

/**
 * 音響処理専用のスロットリング
 * 視覚更新と音声処理を分離
 */
export class AudioProcessingThrottle {
  private visualUpdateThrottle: number;
  private audioProcessingThrottle: number;
  
  constructor() {
    // 視覚更新は30FPS（33ms）で十分
    this.visualUpdateThrottle = 33;
    
    // 音声処理は高頻度を維持（60FPS相当）
    this.audioProcessingThrottle = 16;
  }
  
  // UI更新用（メーター、グラフなど）
  throttleVisual<T extends (...args: any[]) => any>(
    func: T,
    customWait?: number
  ): (...args: Parameters<T>) => void {
    const wait = customWait || this.visualUpdateThrottle;
    return throttle(func, wait, { leading: true, trailing: true });
  }
  
  // 音声処理用（ピッチ検出など）
  throttleAudio<T extends (...args: any[]) => any>(
    func: T,
    customWait?: number
  ): (...args: Parameters<T>) => void {
    const wait = customWait || this.audioProcessingThrottle;
    return throttle(func, wait, { leading: true, trailing: false });
  }
}

// 既存のthrottle関数を再利用
function throttle<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
  options: { leading?: boolean; trailing?: boolean } = {}
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  let previous = 0;
  let lastArgs: Parameters<T> | null = null;
  
  const { leading = true, trailing = true } = options;
  
  return function throttled(...args: Parameters<T>) {
    const now = Date.now();
    
    if (!previous && !leading) {
      previous = now;
    }
    
    const remaining = wait - (now - previous);
    lastArgs = args;
    
    if (remaining <= 0 || remaining > wait) {
      if (timeout) {
        clearTimeout(timeout);
        timeout = null;
      }
      previous = now;
      func.apply(null, args);
      lastArgs = null;
    } else if (!timeout && trailing) {
      timeout = setTimeout(() => {
        previous = leading ? Date.now() : 0;
        timeout = null;
        if (lastArgs) {
          func.apply(null, lastArgs);
          lastArgs = null;
        }
      }, remaining);
    }
  };
}