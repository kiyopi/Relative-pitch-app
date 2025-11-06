/**
 * 音響処理に最適化されたパフォーマンス制御
 * 音質を維持しながらCPU負荷を削減
 */
export declare class AdaptiveFrameRateLimiter {
    private lastFrameTime;
    private nextFrameTime;
    private targetFPS;
    private frameInterval;
    private frameDrops;
    private readonly MIN_FPS;
    private readonly MAX_FPS;
    private readonly OPTIMAL_FPS;
    constructor(initialFPS?: number);
    shouldProcess(): boolean;
    private adjustFrameRate;
    recoverPerformance(): void;
    reset(): void;
    getStats(): {
        currentFPS: number;
        frameDrops: number;
        latency: number;
    };
}
/**
 * 音響処理専用のスロットリング
 * 視覚更新と音声処理を分離
 */
export declare class AudioProcessingThrottle {
    private visualUpdateThrottle;
    private audioProcessingThrottle;
    constructor();
    throttleVisual<T extends (...args: any[]) => any>(func: T, customWait?: number): (...args: Parameters<T>) => void;
    throttleAudio<T extends (...args: any[]) => any>(func: T, customWait?: number): (...args: Parameters<T>) => void;
}
//# sourceMappingURL=performance-optimized.d.ts.map