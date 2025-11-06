import { vi } from 'vitest';

// Mock Web Audio API
global.AudioContext = vi.fn(() => ({
  sampleRate: 44100,
  createAnalyser: vi.fn(() => ({
    fftSize: 2048,
    getFloatTimeDomainData: vi.fn(),
    connect: vi.fn(),
    disconnect: vi.fn()
  })),
  createMediaStreamSource: vi.fn(() => ({
    connect: vi.fn(),
    disconnect: vi.fn()
  })),
  state: 'running',
  resume: vi.fn(),
  suspend: vi.fn(),
  close: vi.fn()
})) as any;

// Mock MediaDevices API
global.navigator = {
  ...global.navigator,
  mediaDevices: {
    getUserMedia: vi.fn(() => 
      Promise.resolve({
        getTracks: () => [],
        getAudioTracks: () => [],
        getVideoTracks: () => [],
        active: true
      } as any)
    ),
    enumerateDevices: vi.fn(() => Promise.resolve([]))
  } as any
};

// Mock performance API if not available
if (!global.performance) {
  global.performance = {
    now: () => Date.now(),
    mark: vi.fn(),
    measure: vi.fn(),
    clearMarks: vi.fn(),
    clearMeasures: vi.fn()
  } as any;
}

// Mock requestAnimationFrame
global.requestAnimationFrame = vi.fn((callback) => {
  return setTimeout(callback, 16) as any;
});

global.cancelAnimationFrame = vi.fn((id) => {
  clearTimeout(id);
});