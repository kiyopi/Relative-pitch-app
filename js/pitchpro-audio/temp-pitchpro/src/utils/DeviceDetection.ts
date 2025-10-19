/**
 * DeviceDetection - Cross-platform device detection and optimization
 * 
 * Detects device types, capabilities, and provides optimized settings
 * Handles iPadOS 13+ detection issues and provides device-specific configurations
 */

import type { DeviceSpecs } from '../types';

export class DeviceDetection {
  private static cachedSpecs: DeviceSpecs | null = null;

  /**
   * Detect current device and return optimized specifications
   */
  static getDeviceSpecs(): DeviceSpecs {
    // Return cached result if available
    if (DeviceDetection.cachedSpecs) {
      return DeviceDetection.cachedSpecs;
    }

    // SSR compatibility
    if (typeof window === 'undefined' || typeof navigator === 'undefined') {
      return DeviceDetection.getDefaultSpecs();
    }

    const userAgent = navigator.userAgent;
    const deviceSpecs = DeviceDetection.analyzeUserAgent(userAgent);
    
    // Cache the result
    DeviceDetection.cachedSpecs = deviceSpecs;
    
    console.log('📱 [DeviceDetection] Device analysis:', {
      userAgent: userAgent.substring(0, 100) + '...',
      deviceType: deviceSpecs.deviceType,
      isIOS: deviceSpecs.isIOS,
      sensitivity: deviceSpecs.sensitivity,
      divisor: deviceSpecs.divisor
    });

    return deviceSpecs;
  }

  /**
   * Analyze user agent string and determine device specifications
   */
  private static analyzeUserAgent(userAgent: string): DeviceSpecs {
    // iOS device detection (including iPadOS 13+ workaround)
    const isIPhone = /iPhone/.test(userAgent);
    const isIPad = /iPad/.test(userAgent);
    
    // iPadOS 13+ reports as "Macintosh" but has touch support
    const isIPadOS = /Macintosh/.test(userAgent) && 'ontouchend' in document;
    
    // Additional iOS detection methods
    const hasIOSNavigator = /iPad|iPhone|iPod/.test(userAgent);
    const hasIOSPlatform = /iPad|iPhone|iPod/.test((navigator as any).platform || '');
    
    // Combined iOS detection
    const isIOS = isIPhone || isIPad || isIPadOS || hasIOSNavigator || hasIOSPlatform;
    
    // More specific device type detection
    let deviceType: 'iPhone' | 'iPad' | 'PC' = 'PC';
    
    if (isIPhone) {
      deviceType = 'iPhone';
    } else if (isIPad || isIPadOS) {
      deviceType = 'iPad';
    } else if (isIOS) {
      // Fallback iOS device - could be iPhone or iPad
      deviceType = DeviceDetection.detectIOSDeviceType();
    }

    // Get device-specific optimizations
    const optimizations = DeviceDetection.getDeviceOptimizations(deviceType, isIOS);

    return {
      deviceType,
      isIOS,
      sensitivity: optimizations.sensitivity,
      noiseGate: optimizations.noiseGate,
      divisor: optimizations.divisor,
      gainCompensation: optimizations.gainCompensation,
      noiseThreshold: optimizations.noiseThreshold,
      smoothingFactor: optimizations.smoothingFactor
    };
  }

  /**
   * Detect iOS device type when specific detection fails
   */
  private static detectIOSDeviceType(): 'iPhone' | 'iPad' {
    // Use screen size as a heuristic
    const screenWidth = window.screen.width;
    const screenHeight = window.screen.height;
    const maxDimension = Math.max(screenWidth, screenHeight);
    const minDimension = Math.min(screenWidth, screenHeight);
    
    // iPad generally has larger screens
    // iPhone 6 Plus and newer have screens around 414x736 or similar
    // iPad screens are typically 768+ in at least one dimension
    if (maxDimension >= 768 || (maxDimension >= 700 && minDimension >= 500)) {
      return 'iPad';
    }
    
    return 'iPhone';
  }

  /**
   * Get device-specific optimization parameters
   */
  private static getDeviceOptimizations(deviceType: 'iPhone' | 'iPad' | 'PC', _isIOS: boolean) {
    switch (deviceType) {
      case 'iPad':
        return {
          sensitivity: 7.0,        // High sensitivity for iPad microphones
          noiseGate: 0.025,        // v1.1.8: Increased noise gate for better noise rejection
          divisor: 4.0,            // Volume calculation divisor
          gainCompensation: 1.5,   // Gain compensation for low-frequency cut
          noiseThreshold: 8.0,     // v1.1.8: Increased noise threshold to prevent ambient noise pickup
          smoothingFactor: 0.3     // v1.1.8: Increased smoothing to reduce noise fluctuations
        };
        
      case 'iPhone':
        return {
          sensitivity: 2.0,        // Lower sensitivity for cleaner signal
          noiseGate: 0.03,         // v1.1.8: Increased noise gate to filter out background noise
          divisor: 4.0,            // Keep original divisor
          gainCompensation: 1.5,   // Keep original gain compensation
          noiseThreshold: 6.0,     // v1.1.8: Increased noise threshold for better noise rejection
          smoothingFactor: 0.25    // v1.1.8: Increased smoothing to reduce noise spikes
        };
        
      case 'PC':
      default:
        return {
          sensitivity: 1.0,        // Standard sensitivity for PC
          noiseGate: 0.035,        // v1.1.8: Increased noise gate for better ambient noise filtering
          divisor: 6.0,            // Different volume calculation for PC
          gainCompensation: 1.0,   // No additional gain compensation needed
          noiseThreshold: 7.0,     // v1.1.8: Increased noise threshold for cleaner detection
          smoothingFactor: 0.25    // v1.1.8: Increased smoothing for more stable readings
        };
    }
  }

  /**
   * Get default specifications for SSR or fallback
   */
  private static getDefaultSpecs(): DeviceSpecs {
    return {
      deviceType: 'PC',
      isIOS: false,
      sensitivity: 1.0,
      noiseGate: 0.035,        // v1.1.8: Improved default noise gate
      divisor: 6.0,
      gainCompensation: 1.0,
      noiseThreshold: 7.0,     // v1.1.8: Improved default noise threshold
      smoothingFactor: 0.25    // v1.1.8: Improved default smoothing
    };
  }

  /**
   * Check if device supports Web Audio API
   */
  static supportsWebAudio(): boolean {
    return typeof window !== 'undefined' && 
           (typeof window.AudioContext !== 'undefined' || typeof (window as any).webkitAudioContext !== 'undefined');
  }

  /**
   * Check if device supports MediaDevices API
   */
  static supportsMediaDevices(): boolean {
    return typeof navigator !== 'undefined' && 
           typeof navigator.mediaDevices !== 'undefined' && 
           typeof navigator.mediaDevices.getUserMedia !== 'undefined';
  }

  /**
   * Check if device supports MediaRecorder API
   */
  static supportsMediaRecorder(): boolean {
    return typeof window !== 'undefined' && typeof (window as any).MediaRecorder !== 'undefined';
  }

  /**
   * Get comprehensive device capabilities
   */
  static getDeviceCapabilities() {
    const specs = DeviceDetection.getDeviceSpecs();
    
    return {
      deviceSpecs: specs,
      webAudioSupport: DeviceDetection.supportsWebAudio(),
      mediaDevicesSupport: DeviceDetection.supportsMediaDevices(),
      mediaRecorderSupport: DeviceDetection.supportsMediaRecorder(),
      touchSupport: 'ontouchend' in document,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown',
      screenSize: typeof window !== 'undefined' ? {
        width: window.screen.width,
        height: window.screen.height,
        pixelRatio: window.devicePixelRatio
      } : null,
      language: typeof navigator !== 'undefined' ? navigator.language : 'Unknown',
      platform: typeof navigator !== 'undefined' ? (navigator as any).platform || 'Unknown' : 'Unknown'
    };
  }

  /**
   * Check if current device is mobile
   */
  static isMobile(): boolean {
    const specs = DeviceDetection.getDeviceSpecs();
    return specs.isIOS || /Android|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator?.userAgent || '');
  }

  /**
   * Check if current device is tablet
   */
  static isTablet(): boolean {
    const specs = DeviceDetection.getDeviceSpecs();
    if (specs.deviceType === 'iPad') return true;
    
    // Android tablet detection
    const userAgent = navigator?.userAgent || '';
    return /Android/i.test(userAgent) && !/Mobile/i.test(userAgent);
  }

  /**
   * Check if current device is desktop
   */
  static isDesktop(): boolean {
    return !DeviceDetection.isMobile() && !DeviceDetection.isTablet();
  }

  /**
   * Get recommended audio constraints for current device
   */
  static getOptimalAudioConstraints(): MediaStreamConstraints {
    const specs = DeviceDetection.getDeviceSpecs();
    
    const baseConstraints: MediaStreamConstraints = {
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
        sampleRate: 44100,
        channelCount: 1,
        sampleSize: 16,
        // latency: 0.1, // Not supported in MediaTrackConstraints
        // volume: 1.0, // Not supported in MediaTrackConstraints
        deviceId: { ideal: 'default' }
      }
    };

    // Add iOS-specific optimizations
    if (specs.isIOS && baseConstraints.audio && typeof baseConstraints.audio === 'object') {
      (baseConstraints.audio as any) = {
        ...baseConstraints.audio,
        // Disable all browser-level processing for iOS
        googAutoGainControl: false,
        googNoiseSuppression: false,
        googEchoCancellation: false,
        googHighpassFilter: false,
        googTypingNoiseDetection: false,
        googBeamforming: false,
        mozAutoGainControl: false,
        mozNoiseSuppression: false
      };
    }

    return baseConstraints;
  }

  /**
   * Clear cached device specifications (for testing)
   */
  static clearCache(): void {
    DeviceDetection.cachedSpecs = null;
  }

  /**
   * Get device-specific debugging information
   */
  static getDebugInfo() {
    const capabilities = DeviceDetection.getDeviceCapabilities();
    
    return {
      ...capabilities,
      detectionMethods: {
        userAgentIPhone: /iPhone/.test(navigator?.userAgent || ''),
        userAgentIPad: /iPad/.test(navigator?.userAgent || ''),
        userAgentMacintosh: /Macintosh/.test(navigator?.userAgent || ''),
        touchSupport: 'ontouchend' in document,
        navigatorPlatform: (navigator as any)?.platform || 'Unknown',
        screenAspectRatio: typeof window !== 'undefined' ? 
          (window.screen.width / window.screen.height).toFixed(2) : 'Unknown'
      }
    };
  }
}