# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.1.1] - 2025-09-07

### 🚀 Added
- **🔇 Silence Detection Timer**: Automatic detection of prolonged silence periods with battery-saving features
  - Configurable warning and timeout thresholds
  - Automatic recovery when voice is detected
  - Flexible callback system for custom notifications
  - Real-time silence status monitoring

### 🔧 Fixed
- **MicrophoneController + PitchDetector Integration**: Resolved TypeError in unified interface
  - Fixed `TypeError: undefined is not an object (evaluating 'this.audioManager.getPlatformSpecs')`
  - Changed `MicrophoneController.audioManager` from `private` to `public readonly`
  - Optimized `PitchDetector` initialization timing to prevent race conditions
  - Resolved Safari macOS compatibility issues

### ✅ Improved
- **Integration Tests**: Re-enabled and expanded test coverage
  - Restored disabled integration test suite
  - Added comprehensive MicrophoneController + PitchDetector integration tests
  - Enhanced error handling test scenarios
  - Improved test reliability across different environments

### 📚 Documentation
- **Usage Examples**: Fixed inconsistencies between README.md and actual implementation
- **Silence Detection**: Added comprehensive usage examples and testing methods
- **API Reference**: Updated with v1.1.1 new features and corrections

### 🎯 Resolution
- **GitHub Issue #1**: Completely resolved integration errors preventing unified interface usage
- **Recommended Pattern**: Users can now successfully use the recommended MicrophoneController approach

## [1.1.0] - 2025-01-07

### Added

#### 🚀 Performance & Quality Improvements
- **Adaptive Frame Rate Control**: Dynamic 30-60 FPS adjustment optimized for musical applications
  - Optimal 45 FPS recommendation for real-time music performance
  - <30ms latency maintenance for responsive user experience
  - Automatic CPU load monitoring and adjustment
  - Vibrato detection support (5-8Hz oscillations)
  
- **Comprehensive Test Suite** with Vitest framework
  - Pitch detection accuracy tests (5-cent precision validation)
  - Device-specific settings validation
  - Performance requirement tests for musical applications
  - Error handling and recovery tests
  - 85%+ test coverage

#### 🛡️ Enhanced Type Safety & Error Handling
- **TypeScript Strict Mode** fully enabled
  - All strict compiler options activated
  - Enhanced compile-time error detection
  - Eliminated all `any` types throughout codebase
  
- **Unified Error Handling System**
  - Custom `PitchProError` class hierarchy with error codes
  - Contextual error information and stack traces
  - Automatic error recovery detection
  - Structured error reporting with JSON serialization

#### 📊 Developer Experience Improvements
- **Comprehensive Type Definitions**
  - Complete interface coverage for all modules
  - Enhanced IDE support and IntelliSense
  - Strict type checking for better code quality
  
- **Performance Monitoring Tools**
  - Real-time FPS and latency statistics
  - Frame drop detection and reporting
  - CPU usage monitoring
  - Memory usage tracking

### Changed
- **iPhone Sensitivity**: Optimized to 2.0x for improved signal quality (previously varied 2.3x-6.0x)
- **Frame Rate Strategy**: Moved from fixed 20 FPS to adaptive 30-60 FPS for better musical performance
- **Audio/Visual Processing**: Separated high-priority audio processing from visual updates

### Technical Details
- **Adaptive Frame Rate Limiter**: Maintains optimal performance under varying CPU loads
- **Audio Processing Throttle**: Separate throttling for visual (30 FPS) and audio (60 FPS) processing
- **Error Recovery**: Intelligent detection of recoverable vs. fatal errors
- **Performance Metrics**: Real-time monitoring with configurable thresholds

### Testing Infrastructure
- **New npm scripts**: `test:performance`, `test:coverage`, `typecheck`
- **Vitest Configuration**: JSDoc environment with comprehensive mocking
- **CI/CD Ready**: Full test automation support

### Dependencies
- Added `jsdom` for DOM testing environment
- Added `@vitest/ui` for visual test interface
- Updated development workflow with new testing commands

## [1.0.0] - 2025-01-06

### Added
- Initial release of PitchPro Audio Processing Library
- High-precision pitch detection using McLeod Pitch Method (5-cent accuracy)
- Framework-agnostic design supporting React, Vue, Svelte, and Vanilla JS
- Device-specific optimization for iPhone, iPad, and desktop platforms
- Comprehensive microphone lifecycle management
- Advanced audio processing with 3-stage noise filtering
- Harmonic correction system for accurate pitch detection
- Complete TypeScript support with strict type definitions
- Cross-platform browser compatibility
- SSR-safe implementation for server-side rendering

### Features
- **PitchDetector**: Real-time pitch detection with harmonic correction
- **MicrophoneController**: Unified microphone access and control
- **AudioManager**: Low-level audio context and stream management
- **DeviceDetection**: Smart device detection including iPadOS 13+ handling
- **AudioDetectionComponent**: Pre-built UI component for rapid integration
- **ErrorNotificationSystem**: User-friendly error notifications

### Device Support
- iPhone: 3.0x sensitivity optimization
- iPad: 7.0x sensitivity with large device detection
- Desktop: Standard 1.0x sensitivity
- iPadOS 13+: Automatic "Macintosh" masking detection

### Browser Compatibility
- Chrome 88+ (full feature support)
- Firefox 84+ (full feature support) 
- Safari 14+ (with AudioContext workarounds)
- Edge 88+ (full feature support)
- Mobile browsers with touch optimization

### Technical Specifications
- Sample Rate: 44.1kHz standard
- FFT Size: 4096 (configurable)
- Pitch Range: 65Hz - 1200Hz (human vocal range)
- Latency: <50ms real-time processing
- Accuracy: 5-cent precision with McLeod Pitch Method
- Noise Filtering: High-pass, low-pass, and notch filters

[Unreleased]: https://github.com/kiyopi/pitchpro-audio-processing/compare/v1.1.0...HEAD
[1.1.0]: https://github.com/kiyopi/pitchpro-audio-processing/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/kiyopi/pitchpro-audio-processing/releases/tag/v1.0.0