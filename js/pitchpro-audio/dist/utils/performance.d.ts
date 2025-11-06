interface ThrottleOptions {
    leading?: boolean;
    trailing?: boolean;
}
export declare function throttle<T extends (...args: any[]) => any>(func: T, wait: number, options?: ThrottleOptions): (...args: Parameters<T>) => void;
export declare function debounce<T extends (...args: any[]) => any>(func: T, wait: number, immediate?: boolean): (...args: Parameters<T>) => void;
export declare class PerformanceMonitor {
    private metrics;
    private readonly maxSamples;
    startMeasure(label: string): () => void;
    recordMetric(label: string, value: number): void;
    getStats(label: string): {
        mean: number;
        median: number;
        p95: number;
        min: number;
        max: number;
    } | null;
    clear(label?: string): void;
}
export declare const performanceMonitor: PerformanceMonitor;
export declare class FrameRateLimiter {
    private lastFrameTime;
    private readonly frameInterval;
    constructor(targetFPS?: number);
    shouldProcess(): boolean;
    reset(): void;
}
export {};
//# sourceMappingURL=performance.d.ts.map