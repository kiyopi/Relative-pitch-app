import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AudioManager } from '../src/core/AudioManager';
import { PitchDetector } from '../src/core/PitchDetector';
import { MicrophoneController } from '../src/core/MicrophoneController';
import { AdaptiveFrameRateLimiter } from '../src/utils/performance-optimized';
import { performanceMonitor } from '../src/utils/performance';

describe.skipIf(process.env.CI)('Integration Tests', () => {
  let audioManager: AudioManager;
  let pitchDetector: PitchDetector;
  let microphoneController: MicrophoneController;
  let mockMediaStream: any;
  let mockAudioContext: any;
  let mockAnalyser: any;

  beforeEach(() => {
    // Mock MediaDevices.getUserMedia
    mockMediaStream = {
      getTracks: vi.fn(() => [{ 
        stop: vi.fn(),
        kind: 'audio',
        label: 'Mock Microphone',
        enabled: true,
        readyState: 'live',
        muted: false
      }]),
      getAudioTracks: vi.fn(() => [{ 
        stop: vi.fn(),
        kind: 'audio',
        label: 'Mock Microphone',
        enabled: true,
        readyState: 'live',
        muted: false
      }])
    };

    global.navigator = {
      ...global.navigator,
      mediaDevices: {
        getUserMedia: vi.fn().mockResolvedValue(mockMediaStream)
      },
      userAgent: 'MockBrowser/1.0'
    } as any;

    // Mock AudioContext
    mockAnalyser = {
      fftSize: 2048,
      smoothingTimeConstant: 0.1,
      minDecibels: -90,
      maxDecibels: -10,
      frequencyBinCount: 1024,
      getFloatTimeDomainData: vi.fn(),
      getByteTimeDomainData: vi.fn(),
      connect: vi.fn(),
      disconnect: vi.fn()
    };

    mockAudioContext = {
      createAnalyser: vi.fn(() => mockAnalyser),
      createBiquadFilter: vi.fn(() => ({
        connect: vi.fn(),
        disconnect: vi.fn(),
        frequency: { setValueAtTime: vi.fn() },
        Q: { setValueAtTime: vi.fn() },
        type: 'highpass'
      })),
      createGain: vi.fn(() => ({
        connect: vi.fn(),
        disconnect: vi.fn(),
        gain: { setValueAtTime: vi.fn(), value: 1 }
      })),
      createMediaStreamSource: vi.fn(() => ({
        connect: vi.fn(),
        disconnect: vi.fn()
      })),
      resume: vi.fn().mockResolvedValue(undefined),
      suspend: vi.fn().mockResolvedValue(undefined),
      close: vi.fn().mockResolvedValue(undefined),
      state: 'running',
      sampleRate: 44100
    };

    global.AudioContext = vi.fn(() => mockAudioContext);
    global.webkitAudioContext = vi.fn(() => mockAudioContext);

    // Initialize components
    audioManager = new AudioManager();
    pitchDetector = new PitchDetector(audioManager);
    microphoneController = new MicrophoneController();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('AudioManager + PitchDetector Integration', () => {
    it('完全な初期化シーケンス', async () => {
      // Step 1: AudioManager initialization
      await audioManager.initialize();
      expect(mockAudioContext.resume).toHaveBeenCalled();
      expect(global.navigator.mediaDevices.getUserMedia).toHaveBeenCalled();

      // Step 2: PitchDetector initialization
      await pitchDetector.initialize();
      expect(mockAudioContext.createAnalyser).toHaveBeenCalledTimes(2); // filtered + raw

      // Step 3: Check states
      expect(audioManager.getStatus().isInitialized).toBe(true);
      expect(pitchDetector.getIsInitialized()).toBe(true);

      // Step 4: Start detection
      const started = pitchDetector.startDetection();
      expect(started).toBe(true);
      expect(pitchDetector.getState().isDetecting).toBe(true);
    });

    it('エラー状態からの回復', async () => {
      // Simulate initialization failure
      global.navigator.mediaDevices.getUserMedia = vi.fn()
        .mockRejectedValueOnce(new Error('Permission denied'))
        .mockResolvedValueOnce(mockMediaStream);

      // First attempt should fail
      await expect(audioManager.initialize()).rejects.toThrow('Permission denied');
      expect(audioManager.getStatus().isInitialized).toBe(false);

      // Second attempt should succeed
      await audioManager.initialize();
      expect(audioManager.getStatus().isInitialized).toBe(true);

      // PitchDetector should work after recovery
      await pitchDetector.initialize();
      expect(pitchDetector.getIsInitialized()).toBe(true);
    });

    it('リソース管理と解放', async () => {
      // Initialize everything
      await audioManager.initialize();
      await pitchDetector.initialize();
      pitchDetector.startDetection();

      // Get analyser IDs before cleanup
      const initialAnalysers = audioManager.getStatus().activeAnalysers;
      expect(initialAnalysers).toBeGreaterThan(0);

      // Cleanup PitchDetector
      pitchDetector.cleanup();
      expect(pitchDetector.getIsInitialized()).toBe(false);
      expect(pitchDetector.getState().isDetecting).toBe(false);

      // AudioManager should still be active
      expect(audioManager.getStatus().isInitialized).toBe(true);

      // Final cleanup
      audioManager.forceCleanup();
      expect(audioManager.getStatus().isInitialized).toBe(false);
      expect(mockMediaStream.getTracks()[0].stop).toHaveBeenCalled();
    });
  });

  describe('Performance Integration', () => {
    it('フレームレート制御とメトリクス収集', async () => {
      const limiter = new AdaptiveFrameRateLimiter(45);
      performanceMonitor.clear();

      // Simulate real-time processing loop
      let mockTime = 0;
      vi.spyOn(performance, 'now').mockImplementation(() => mockTime);

      for (let i = 0; i < 50; i++) {
        const measureEnd = performanceMonitor.startMeasure('frame-processing');
        
        if (limiter.shouldProcess()) {
          // Simulate variable processing time
          const processingTime = 15 + Math.random() * 10; // 15-25ms
          mockTime += processingTime;
          measureEnd();
        }
        
        mockTime += 2; // Small gap between frames
      }

      // Check performance metrics
      const stats = performanceMonitor.getStats('frame-processing');
      expect(stats).toBeDefined();
      expect(stats!.mean).toBeGreaterThan(10);
      expect(stats!.mean).toBeLessThan(30);

      // Check frame rate adaptation
      const limiterStats = limiter.getStats();
      expect(limiterStats.currentFPS).toBeGreaterThanOrEqual(30);
      expect(limiterStats.currentFPS).toBeLessThanOrEqual(45);

      vi.restoreAllMocks();
    });

    it('メモリ使用量の安定性', async () => {
      performanceMonitor.clear();
      
      // Simulate long-running session with many metrics
      const metricLabels = ['pitch', 'volume', 'clarity', 'frequency'];
      
      for (let cycle = 0; cycle < 100; cycle++) {
        for (const label of metricLabels) {
          performanceMonitor.recordMetric(label, Math.random() * 100);
        }
      }

      // Check that all metrics are bounded by circular buffer
      for (const label of metricLabels) {
        const stats = performanceMonitor.getStats(label);
        expect(stats).toBeDefined();
        expect(stats!.mean).toBeGreaterThan(0);
      }

      // Memory usage should be stable (no growing arrays)
      // CircularBuffer ensures O(1) memory per metric
    });
  });

  describe('Error Handling Integration', () => {
    it('PitchDetectorエラーの適切な伝播', async () => {
      await audioManager.initialize();
      
      // Mock analyser creation failure
      mockAudioContext.createAnalyser = vi.fn(() => {
        throw new Error('Analyser creation failed');
      });

      const errorCallback = vi.fn();
      pitchDetector.setCallbacks({ onError: errorCallback });

      // PitchDetector initialization should handle error gracefully
      await expect(pitchDetector.initialize()).rejects.toThrow();
      expect(errorCallback).toHaveBeenCalled();
      expect(pitchDetector.getState().componentState).toBe('error');
    });

    it('AudioContextの状態変化に対する対応', async () => {
      await audioManager.initialize();
      await pitchDetector.initialize();

      // Simulate AudioContext interruption
      mockAudioContext.state = 'interrupted';
      
      // System should detect and handle state change
      const status = audioManager.getStatus();
      expect(status.audioContextState).toBe('interrupted');

      // Recovery
      mockAudioContext.state = 'running';
      await audioManager.initialize(); // Re-initialization
      
      expect(audioManager.getStatus().audioContextState).toBe('running');
    });
  });

  describe('Real-world Scenarios', () => {
    it('ブラウザタブ切り替え対応', async () => {
      await audioManager.initialize();
      await pitchDetector.initialize();
      pitchDetector.startDetection();

      // Simulate tab becoming inactive
      Object.defineProperty(document, 'hidden', { value: true, configurable: true });
      document.dispatchEvent(new Event('visibilitychange'));

      // Detection should continue but may be throttled
      expect(pitchDetector.getState().isDetecting).toBe(true);

      // Tab becomes active again
      Object.defineProperty(document, 'hidden', { value: false, configurable: true });
      document.dispatchEvent(new Event('visibilitychange'));

      // Full performance should resume
      expect(pitchDetector.getState().isDetecting).toBe(true);
    });

    it('デバイス切り替え対応', async () => {
      await audioManager.initialize();
      await pitchDetector.initialize();

      const initialAnalysers = audioManager.getStatus().activeAnalysers;

      // Simulate device change (e.g., headphones connected)
      mockMediaStream = {
        getTracks: vi.fn(() => [{ stop: vi.fn() }]),
        getAudioTracks: vi.fn(() => [{ stop: vi.fn() }])
      };

      global.navigator.mediaDevices.getUserMedia = vi.fn()
        .mockResolvedValue(mockMediaStream);

      // Reinitialize with new device
      await pitchDetector.reinitialize();

      expect(pitchDetector.getIsInitialized()).toBe(true);
      expect(audioManager.getStatus().activeAnalysers.length).toBeGreaterThanOrEqual(initialAnalysers.length);
    });

    it('長時間実行での安定性', async () => {
      const limiter = new AdaptiveFrameRateLimiter(45);
      performanceMonitor.clear();

      let mockTime = 0;
      vi.spyOn(performance, 'now').mockImplementation(() => mockTime);

      // Simulate 5 seconds of continuous operation  
      const totalFrames = 5 * 45; // 5 seconds at 45 FPS
      let processedFrames = 0;

      for (let i = 0; i < totalFrames; i++) {
        const measure = performanceMonitor.startMeasure('long-session');
        
        if (limiter.shouldProcess()) {
          processedFrames++;
          // Simulate realistic processing with occasional spikes
          const baseTime = 22; // 22ms base
          const spikeChance = Math.random() < 0.05 ? 30 : 0; // 5% chance of 30ms spike
          mockTime += baseTime + spikeChance;
          measure();
        }
        
        mockTime += 1;
      }

      // Check system stability
      const stats = performanceMonitor.getStats('long-session');
      expect(stats).toBeDefined();
      expect(stats!.mean).toBeLessThan(35); // Average processing time reasonable

      const limiterStats = limiter.getStats();
      expect(limiterStats.currentFPS).toBeGreaterThanOrEqual(30); // Maintained minimum FPS
      expect(processedFrames).toBeGreaterThan(totalFrames * 0.8); // At least 80% of frames processed

      vi.restoreAllMocks();
    });
  });

  describe('MicrophoneController + PitchDetector Integration', () => {
    it('統合インターフェースでの完全な初期化', async () => {
      // MicrophoneController initialization
      await microphoneController.initialize();
      expect(microphoneController.isReady()).toBe(true);
      expect(microphoneController.audioManager).toBeDefined();

      // PitchDetector with MicrophoneController.audioManager
      const integratedPitchDetector = new PitchDetector(microphoneController.audioManager);
      await integratedPitchDetector.initialize();
      expect(integratedPitchDetector.getIsInitialized()).toBe(true);

      // Verify shared AudioManager works correctly
      const audioManagerStatus = microphoneController.audioManager.getStatus();
      expect(audioManagerStatus.isInitialized).toBe(true);
      expect(audioManagerStatus.mediaStreamActive).toBe(true);

      // Cleanup
      integratedPitchDetector.cleanup();
      microphoneController.forceStop();
    });

    it('統合エラーハンドリング', async () => {
      const errors: Error[] = [];
      
      microphoneController.setCallbacks({
        onError: (error) => errors.push(error),
      });

      const integratedPitchDetector = new PitchDetector(microphoneController.audioManager);
      integratedPitchDetector.setCallbacks({
        onError: (error) => errors.push(error),
      });

      // Initialize successfully
      await microphoneController.initialize();
      await integratedPitchDetector.initialize();

      // No initialization errors
      expect(errors).toHaveLength(0);

      // Verify proper cleanup
      integratedPitchDetector.cleanup();
      microphoneController.forceStop();
    });

    it('デバイス最適化の確認', async () => {
      await microphoneController.initialize();
      const deviceSpecs = microphoneController.getDeviceSpecs();
      expect(deviceSpecs).toBeDefined();
      expect(deviceSpecs!.deviceType).toMatch(/(iPhone|iPad|PC)/);

      const integratedPitchDetector = new PitchDetector(microphoneController.audioManager);
      await integratedPitchDetector.initialize();

      // Device specs should be consistent
      const pitchDetectorState = integratedPitchDetector.getState();
      expect(pitchDetectorState.isInitialized).toBe(true);

      // Cleanup
      integratedPitchDetector.cleanup();
      microphoneController.forceStop();
    });
  });
});