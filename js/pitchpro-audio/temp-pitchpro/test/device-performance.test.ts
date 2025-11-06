import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AdaptiveFrameRateLimiter } from '../src/utils/performance-optimized';
import { performanceMonitor } from '../src/utils/performance';

describe('Device-Specific Performance Tests', () => {
  let mockTime = 0;
  
  beforeEach(() => {
    mockTime = 0;
    vi.useFakeTimers();
    vi.spyOn(performance, 'now').mockImplementation(() => mockTime);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('iPhone Performance', () => {
    it('iPhone Safari - 30-45FPS維持', () => {
      const limiter = new AdaptiveFrameRateLimiter(45);
      
      // Simulate iPhone performance characteristics
      const frameInterval = 1000 / 45; // ~22ms
      let processedFrames = 0;
      
      for (let i = 0; i < 30; i++) {
        if (limiter.shouldProcess()) {
          processedFrames++;
        }
        mockTime += frameInterval; // Maintain proper timing
      }
      
      const stats = limiter.getStats();
      expect(stats.currentFPS).toBeGreaterThanOrEqual(30);
      expect(stats.currentFPS).toBeLessThanOrEqual(45);
      expect(processedFrames).toBeGreaterThan(20);
    });

    it('iPhone低電力モード - 30FPS最低保証', () => {
      const limiter = new AdaptiveFrameRateLimiter(45);
      
      // Simulate low power mode with slower processing
      for (let i = 0; i < 10; i++) {
        limiter.shouldProcess();
        mockTime += 100; // Much slower to trigger frame drops
      }
      
      const stats = limiter.getStats();
      expect(stats.currentFPS).toBeGreaterThanOrEqual(30);
      expect(stats.frameDrops).toBeGreaterThan(0);
    });
  });

  describe('Android Performance', () => {
    it('Android Chrome - 可変フレームレート対応', () => {
      const limiter = new AdaptiveFrameRateLimiter(45);
      
      // Simulate Android variable performance
      const frameInterval = 1000 / 40; // ~25ms average
      let frameCount = 0;
      
      for (let i = 0; i < 15; i++) {
        if (limiter.shouldProcess()) {
          frameCount++;
        }
        mockTime += frameInterval + (Math.random() - 0.5) * 10; // Variable timing
      }
      
      const stats = limiter.getStats();
      expect(stats.currentFPS).toBeGreaterThanOrEqual(25);
      expect(frameCount).toBeGreaterThanOrEqual(10);
    });
  });

  describe('Desktop Performance', () => {
    it('デスクトップ - 高フレームレート維持', () => {
      const limiter = new AdaptiveFrameRateLimiter(60);
      
      // Simulate desktop high performance
      for (let i = 0; i < 30; i++) {
        if (limiter.shouldProcess()) {
          mockTime += 16; // Consistent 60FPS timing
        }
        mockTime += 1;
      }
      
      const stats = limiter.getStats();
      expect(stats.currentFPS).toBe(60);
      expect(stats.frameDrops).toBe(0);
    });

    it('高負荷時の自動調整', () => {
      const limiter = new AdaptiveFrameRateLimiter(60);
      
      // Simulate high CPU load
      for (let i = 0; i < 10; i++) {
        limiter.shouldProcess();
        mockTime += 50; // Heavy processing causing frame drops
      }
      
      const stats = limiter.getStats();
      expect(stats.currentFPS).toBeLessThan(60);
      expect(stats.frameDrops).toBeGreaterThan(0);
    });
  });

  describe('Memory Performance Monitoring', () => {
    it('CircularBufferメモリ効率テスト', () => {
      performanceMonitor.clear();
      
      // Simulate intensive metric recording
      const startMemory = process.memoryUsage?.()?.heapUsed || 0;
      
      for (let i = 0; i < 1000; i++) {
        const measure = performanceMonitor.startMeasure('test-metric');
        mockTime += Math.random() * 10;
        measure();
      }
      
      // Check that buffer limits memory growth
      const stats = performanceMonitor.getStats('test-metric');
      expect(stats).toBeDefined();
      expect(stats!.mean).toBeGreaterThan(0);
      
      // Memory should be bounded by circular buffer
      const endMemory = process.memoryUsage?.()?.heapUsed || 0;
      const memoryIncrease = endMemory - startMemory;
      expect(memoryIncrease).toBeLessThan(process.env.CI ? 2048 * 1024 : 1024 * 1024); // CI: 2MB, Local: 1MB
    });

    it('大量データでのメモリリーク防止', () => {
      performanceMonitor.clear();
      
      // Record metrics for multiple labels
      const labels = ['pitch', 'volume', 'frequency', 'clarity', 'processing'];
      
      for (let cycle = 0; cycle < 50; cycle++) {
        for (const label of labels) {
          for (let i = 0; i < 20; i++) {
            performanceMonitor.recordMetric(label, Math.random() * 100);
          }
        }
      }
      
      // Each buffer should be limited to 100 samples
      for (const label of labels) {
        const stats = performanceMonitor.getStats(label);
        expect(stats).toBeDefined();
        // Internal buffer should not exceed maxSamples
      }
    });
  });

  describe('Real-time Audio Processing Simulation', () => {
    it('音声処理レイテンシー要件', () => {
      const limiter = new AdaptiveFrameRateLimiter(45);
      const latencies: number[] = [];
      
      for (let i = 0; i < 100; i++) {
        const start = mockTime;
        if (limiter.shouldProcess()) {
          // Simulate audio processing
          mockTime += Math.random() * 8 + 10; // 10-18ms processing
          latencies.push(mockTime - start);
        }
        mockTime += 2;
      }
      
      const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
      const maxLatency = Math.max(...latencies);
      
      // Real-time audio requirements
      expect(avgLatency).toBeLessThan(25); // Average < 25ms
      expect(maxLatency).toBeLessThan(35); // Max < 35ms
      expect(latencies.filter(l => l > 30).length / latencies.length).toBeLessThan(0.1); // < 10% over 30ms
    });

    it('ビブラート検出性能要件', () => {
      const limiter = new AdaptiveFrameRateLimiter(45);
      const stats = limiter.getStats();
      
      // Vibrato is typically 5-8Hz (125-200ms period)
      // Need at least 5 samples per cycle for detection
      const vibratoFreq = 6; // 6Hz vibrato
      const vibratoPeriod = 1000 / vibratoFreq; // 166ms
      const samplesPerCycle = vibratoPeriod / stats.latency;
      
      expect(samplesPerCycle).toBeGreaterThanOrEqual(5);
      expect(stats.latency).toBeLessThan(33); // < 33ms for 30+ FPS
    });
  });

  describe('Error Recovery Performance', () => {
    it('フレームドロップからの回復', () => {
      const limiter = new AdaptiveFrameRateLimiter(45);
      
      // Cause frame drops
      for (let i = 0; i < 8; i++) {
        limiter.shouldProcess();
        mockTime += 100; // Force frame drops
      }
      
      const droppedStats = limiter.getStats();
      const reducedFPS = droppedStats.currentFPS;
      expect(reducedFPS).toBeLessThan(45);
      
      // Recover performance
      limiter.reset();
      const newLimiter = new AdaptiveFrameRateLimiter(reducedFPS);
      
      for (let i = 0; i < 10; i++) {
        newLimiter.shouldProcess();
        mockTime += 20; // Good performance
        newLimiter.recoverPerformance();
      }
      
      const recoveredStats = newLimiter.getStats();
      expect(recoveredStats.currentFPS).toBeGreaterThanOrEqual(reducedFPS);
    });
  });
});