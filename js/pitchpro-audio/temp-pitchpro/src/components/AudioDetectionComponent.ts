/**
 * AudioDetectionComponent - Unified Audio Detection with Automatic UI Updates
 * 
 * @description High-level integration component that combines PitchDetector functionality
 * with automatic UI updates, device optimization, and comprehensive error handling.
 * Designed to simplify audio detection integration in relative pitch training applications.
 * 
 * @example
 * ```typescript
 * const audioDetector = new AudioDetectionComponent({
 *   volumeBarSelector: '#volume-bar',
 *   frequencySelector: '#frequency-display',
 *   clarityThreshold: 0.4,
 *   minVolumeAbsolute: 0.003
 * });
 * 
 * await audioDetector.initialize();
 * 
 * audioDetector.setCallbacks({
 *   onPitchUpdate: (result) => {
 *     console.log('音程検出:', result);
 *     // { frequency: 261.6, note: 'C4', volume: 45.2 }
 *   },
 *   onError: (error) => {
 *     console.error('検出エラー:', error);
 *   }
 * });
 * 
 * audioDetector.startDetection();
 * ```
 * 
 * @version 1.0.0
 * @since 1.0.0
 */

import { AudioManager } from '../core/AudioManager';
import { PitchDetector } from '../core/PitchDetector';
import { MicrophoneController } from '../core/MicrophoneController';
import { DeviceDetection } from '../utils/DeviceDetection';
import { FrequencyUtils } from '../utils/FrequencyUtils';
import { 
  PitchProError, 
  ErrorMessageBuilder, 
  AudioContextError,
  MicrophoneAccessError,
  ErrorCode
} from '../utils/errors';
import type { PitchDetectionResult, DeviceSpecs } from '../types';

/**
 * Configuration interface for AudioDetectionComponent
 */
export interface AudioDetectionConfig {
  // UI Element Selectors
  volumeBarSelector?: string;
  volumeTextSelector?: string;
  frequencySelector?: string;
  noteSelector?: string;
  
  // PitchDetector Settings
  clarityThreshold?: number;
  minVolumeAbsolute?: number;
  fftSize?: number;
  smoothing?: number;
  
  // Device Optimization
  deviceOptimization?: boolean;
  
  // UI Update Settings
  uiUpdateInterval?: number;
  autoUpdateUI?: boolean;
  
  // Debug Settings
  debug?: boolean;
  logPrefix?: string;
}

/**
 * Callback functions for AudioDetectionComponent events
 */
export interface AudioDetectionCallbacks {
  onPitchUpdate?: (result: PitchDetectionResult) => void;
  onVolumeUpdate?: (volume: number) => void;
  onStateChange?: (state: 'uninitialized' | 'initializing' | 'ready' | 'detecting' | 'stopped' | 'error') => void;
  onError?: (error: PitchProError) => void;
  onDeviceDetected?: (deviceSpecs: DeviceSpecs) => void;
}

/**
 * Device-specific optimization settings
 */
interface DeviceSettings {
  volumeMultiplier: number;
  sensitivityMultiplier: number;
  minVolumeAbsolute: number;
}

export class AudioDetectionComponent {
  /** @private UI timing constants */
  private static readonly NOTE_RESET_DELAY_MS = 300;
  private static readonly SELECTOR_UPDATE_DELAY_MS = 50;
  private static readonly UI_RESTART_DELAY_MS = 200;

  /** @private Configuration with applied defaults */
  private config: Required<AudioDetectionConfig>;
  
  /** @private AudioManager instance for resource management */
  private audioManager: AudioManager;
  
  /** @private PitchDetector instance for pitch detection */
  private pitchDetector: PitchDetector | null = null;
  
  /** @private MicrophoneController for high-level microphone management */
  private micController: MicrophoneController | null = null;
  
  /** @private Current component state */
  private currentState: 'uninitialized' | 'initializing' | 'ready' | 'detecting' | 'stopped' | 'error' = 'uninitialized';
  
  /** @private Event callbacks */
  private callbacks: AudioDetectionCallbacks = {};
  
  /** @private Device specifications */
  private deviceSpecs: DeviceSpecs | null = null;
  
  /** @private Device-specific settings */
  private deviceSettings: DeviceSettings | null = null;
  
  /** @private UI update interval ID */
  private uiUpdateTimer: number | null = null;
  
  /** @private Flag to prevent UI updates during selector changes */
  private isUpdatingSelectors: boolean = false;
  
  /** @private UI elements cache */
  private uiElements: {
    volumeBar?: HTMLElement;
    volumeText?: HTMLElement;
    frequency?: HTMLElement;
    note?: HTMLElement;
  } = {};
  
  /** @private Last error encountered */
  private lastError: PitchProError | null = null;
  
  /** @private Initialization state */
  private isInitialized = false;

  /** @private Note display persistence timer */
  private noteResetTimer: number | null = null;

  /** @private Helper method for creating delays */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Creates a new AudioDetectionComponent with automatic device optimization
   * 
   * @param config - Configuration options for the component
   * @param config.volumeBarSelector - CSS selector for volume bar element
   * @param config.volumeTextSelector - CSS selector for volume text element  
   * @param config.frequencySelector - CSS selector for frequency display element
   * @param config.noteSelector - CSS selector for note display element
   * @param config.clarityThreshold - Minimum clarity for pitch detection (0-1, default: 0.4)
   * @param config.minVolumeAbsolute - Minimum volume threshold (default: 0.003)
   * @param config.fftSize - FFT size for analysis (default: 4096)
   * @param config.smoothing - Smoothing factor (default: 0.1)
   * @param config.deviceOptimization - Enable automatic device optimization (default: true)
   * @param config.uiUpdateInterval - UI update interval in ms (default: 50)
   * @param config.autoUpdateUI - Enable automatic UI updates (default: true)
   * @param config.debug - Enable debug logging (default: false)
   * @param config.logPrefix - Prefix for log messages (default: '🎵 AudioDetection')
   * 
   * @example
   * ```typescript
   * // Basic usage with automatic device optimization
   * const audioDetector = new AudioDetectionComponent({
   *   volumeBarSelector: '#volume-bar',
   *   frequencySelector: '#frequency-display'
   * });
   * 
   * // Advanced configuration for range testing
   * const audioDetector = new AudioDetectionComponent({
   *   volumeBarSelector: '#range-test-volume-bar',
   *   volumeTextSelector: '#range-test-volume-text', 
   *   frequencySelector: '#range-test-frequency-value',
   *   clarityThreshold: 0.3,
   *   minVolumeAbsolute: 0.001,
   *   deviceOptimization: true,
   *   debug: true
   * });
   * ```
   */
  constructor(config: AudioDetectionConfig = {}) {
    // Apply default configuration
    this.config = {
      volumeBarSelector: config.volumeBarSelector || '#volume-bar',
      volumeTextSelector: config.volumeTextSelector || '#volume-text',
      frequencySelector: config.frequencySelector || '#frequency-display',
      noteSelector: config.noteSelector || '#note-display',
      
      clarityThreshold: config.clarityThreshold ?? 0.4,
      minVolumeAbsolute: config.minVolumeAbsolute ?? 0.003,
      fftSize: config.fftSize ?? 4096,
      smoothing: config.smoothing ?? 0.1,
      
      deviceOptimization: config.deviceOptimization ?? true,
      
      uiUpdateInterval: config.uiUpdateInterval ?? 50, // 20fps
      autoUpdateUI: config.autoUpdateUI ?? true,
      
      debug: config.debug ?? false,
      logPrefix: config.logPrefix ?? '🎵 AudioDetection'
    };

    // Initialize AudioManager
    this.audioManager = new AudioManager({
      sampleRate: 44100,
      channelCount: 1,
      echoCancellation: false,
      noiseSuppression: false,
      autoGainControl: false
    });

    // Detect device and apply optimization
    if (this.config.deviceOptimization) {
      this.detectAndOptimizeDevice();
    }

    this.debugLog('AudioDetectionComponent created with config:', this.config);
  }

  /**
   * Initializes the audio detection system with device optimization
   * 
   * @description Performs complete initialization including microphone permissions,
   * audio context setup, device detection, and UI element binding.
   * 
   * @returns Promise resolving when initialization is complete
   * @throws {AudioContextError} If audio system initialization fails
   * @throws {MicrophoneAccessError} If microphone permission is denied
   * 
   * @example
   * ```typescript
   * try {
   *   await audioDetector.initialize();
   *   console.log('Audio detection ready!');
   * } catch (error) {
   *   console.error('Initialization failed:', error.message);
   *   // Handle specific error types
   *   if (error instanceof MicrophoneAccessError) {
   *     // Show permission guidance
   *   }
   * }
   * ```
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      this.debugLog('Already initialized');
      return;
    }

    try {
      this.updateState('initializing');
      this.debugLog('Starting initialization...');

      // Initialize MicrophoneController
      this.micController = new MicrophoneController({
        audioManager: {
          sampleRate: 44100,
          echoCancellation: false,
          autoGainControl: false
        },
        lifecycle: {
          maxAutoRecoveryAttempts: 3,
          healthCheckIntervalMs: 1000
        },
        notifications: {
          enabled: this.config.debug
        }
      });

      // Set up MicrophoneController callbacks
      this.micController.setCallbacks({
        onStateChange: (state) => {
          this.debugLog('MicrophoneController state:', state);
        },
        onError: (error) => {
          this.handleError(error, 'microphone_controller');
        },
        onDeviceChange: (specs) => {
          this.deviceSpecs = specs;
          this.callbacks.onDeviceDetected?.(specs);
        }
      });

      // Initialize microphone
      await this.micController.initialize();

      // Initialize PitchDetector with DeviceDetection optimized settings
      this.pitchDetector = new PitchDetector(this.audioManager, {
        clarityThreshold: this.config.clarityThreshold,
        minVolumeAbsolute: this.config.minVolumeAbsolute,
        fftSize: this.config.fftSize,
        smoothing: this.deviceSpecs?.smoothingFactor ?? this.config.smoothing,  // v1.1.8: Use DeviceDetection smoothing
        deviceOptimization: this.config.deviceOptimization
      });

      // Set up PitchDetector callbacks
      this.pitchDetector.setCallbacks({
        onPitchUpdate: (result) => {
          this.handlePitchUpdate(result);
        },
        onError: (error) => {
          this.handleError(error, 'pitch_detector');
        },
        onStateChange: (state) => {
          this.debugLog('PitchDetector state:', state);
        }
      });

      await this.pitchDetector.initialize();

      // ⭐ Register PitchDetector and AudioDetectionComponent with MicrophoneController for unified management
      if (this.micController && this.pitchDetector) {
        this.micController.registerDetector(this.pitchDetector);
        this.micController.registerAudioDetectionComponent(this);
        this.debugLog('✅ PitchDetector and AudioDetectionComponent registered with MicrophoneController for unified management');
      }

      // Cache UI elements
      this.cacheUIElements();

      // Apply device-specific sensitivity
      if (this.deviceSettings && this.micController) {
        this.micController.setSensitivity(this.deviceSettings.sensitivityMultiplier);
        this.debugLog('Applied device-specific sensitivity:', this.deviceSettings.sensitivityMultiplier);
      }

      this.isInitialized = true;
      this.updateState('ready');
      this.debugLog('Initialization complete');

    } catch (error) {
      const structuredError = this.createStructuredError(error as Error, 'initialization');
      ErrorMessageBuilder.logError(structuredError, 'AudioDetectionComponent initialization');
      
      this.lastError = structuredError;
      this.updateState('error');
      
      throw structuredError;
    }
  }

  /**
   * Sets callback functions for audio detection events
   * 
   * @param callbacks - Object containing callback functions
   * @param callbacks.onPitchUpdate - Called when pitch is detected
   * @param callbacks.onVolumeUpdate - Called when volume changes
   * @param callbacks.onStateChange - Called when component state changes
   * @param callbacks.onError - Called when errors occur
   * @param callbacks.onDeviceDetected - Called when device is detected
   * 
   * @example
   * ```typescript
   * audioDetector.setCallbacks({
   *   onPitchUpdate: (result) => {
   *     console.log(`${result.note} - ${result.frequency.toFixed(1)}Hz`);
   *   },
   *   onVolumeUpdate: (volume) => {
   *     console.log(`Volume: ${volume.toFixed(1)}%`);
   *   },
   *   onError: (error) => {
   *     console.error('Detection error:', error.message);
   *   }
   * });
   * ```
   */
  setCallbacks(callbacks: AudioDetectionCallbacks): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
    this.debugLog('Callbacks updated');
  }

  /**
   * Starts pitch detection and automatic UI updates
   * 
   * @returns True if detection started successfully, false otherwise
   * @throws {PitchProError} If component is not initialized or detection fails
   * 
   * @example
   * ```typescript
   * if (audioDetector.startDetection()) {
   *   console.log('Detection started successfully');
   * } else {
   *   console.log('Failed to start detection');
   * }
   * ```
   */
  startDetection(): boolean {
    if (!this.isInitialized || !this.pitchDetector) {
      const error = new PitchProError(
        'AudioDetectionComponentが初期化されていません。initialize()メソッドを先に呼び出してください。',
        ErrorCode.AUDIO_CONTEXT_ERROR,
        {
          operation: 'startDetection',
          isInitialized: this.isInitialized,
          hasPitchDetector: !!this.pitchDetector,
          currentState: this.currentState
        }
      );
      
      ErrorMessageBuilder.logError(error, 'AudioDetection start');
      this.handleError(error, 'start_detection');
      throw error;
    }

    try {
      const started = this.pitchDetector.startDetection();
      
      if (started) {
        this.updateState('detecting');
        
        // Start UI update timer
        if (this.config.autoUpdateUI) {
          this.startUIUpdates();
        }
        
        this.debugLog('Detection started successfully');
        return true;
      } else {
        this.debugLog('Failed to start detection');
        return false;
      }
    } catch (error) {
      const structuredError = this.createStructuredError(error as Error, 'start_detection');
      this.handleError(structuredError, 'start_detection');
      throw structuredError;
    }
  }

  /**
   * Stops pitch detection and UI updates
   * 
   * @example
   * ```typescript
   * audioDetector.stopDetection();
   * console.log('Detection stopped');
   * ```
   */
  stopDetection(): void {
    try {
      if (this.pitchDetector) {
        this.pitchDetector.stopDetection();
      }
      
      this.stopUIUpdates();
      this.updateState('stopped');
      this.debugLog('Detection stopped');
    } catch (error) {
      const structuredError = this.createStructuredError(error as Error, 'stop_detection');
      this.handleError(structuredError, 'stop_detection');
    }
  }

  /**
   * Manually updates UI elements with current audio data
   * 
   * @param result - Pitch detection result to display
   * 
   * @example
   * ```typescript
   * const result = {
   *   frequency: 440,
   *   note: 'A4',
   *   volume: 75.5,
   *   clarity: 0.8
   * };
   * audioDetector.updateUI(result);
   * ```
   */
  updateUI(result: PitchDetectionResult): void {
    // Skip UI updates if selectors are being updated
    if (this.isUpdatingSelectors) {
      this.debugLog('UI update skipped - selectors are being updated');
      return;
    }
    
    try {
      // Update volume bar - verify element matches current selector to prevent cross-mode updates
      if (this.uiElements.volumeBar && this.config.volumeBarSelector) {
        const currentElement = document.querySelector(this.config.volumeBarSelector);
        if (currentElement && currentElement === this.uiElements.volumeBar) {
          const volumePercent = Math.min(100, result.volume * (this.deviceSettings?.volumeMultiplier ?? 1.0));
          if (this.uiElements.volumeBar instanceof HTMLProgressElement) {
            this.uiElements.volumeBar.value = volumePercent;
          } else {
            // Assume it's a div with a width style
            (this.uiElements.volumeBar as HTMLElement).style.width = `${volumePercent}%`;
          }
        }
      }

      // Update volume text - verify element matches current selector to prevent cross-mode updates
      if (this.uiElements.volumeText && this.config.volumeTextSelector) {
        const currentElement = document.querySelector(this.config.volumeTextSelector);
        if (currentElement && currentElement === this.uiElements.volumeText) {
          const volumePercent = Math.min(100, result.volume * (this.deviceSettings?.volumeMultiplier ?? 1.0));
          this.uiElements.volumeText.textContent = `${volumePercent.toFixed(1)}%`;
        }
      }

      // Update frequency display - verify element matches current selector to prevent cross-mode updates
      if (this.uiElements.frequency && this.config.frequencySelector) {
        const currentElement = document.querySelector(this.config.frequencySelector);
        if (currentElement && currentElement === this.uiElements.frequency) {
          if (result.frequency && result.frequency > 0) {
            this.uiElements.frequency.textContent = FrequencyUtils.formatFrequency(result.frequency);
          } else {
            // Reset frequency display when no pitch is detected
            this.uiElements.frequency.textContent = '0.0 Hz';
          }
        }
      }

      // Update note display with persistence - only if noteSelector is configured and matches current cached element
      if (this.uiElements.note && this.config.noteSelector && this.config.noteSelector !== '#note-display') {
        // Verify that cached element matches current selector to prevent cross-mode updates
        const currentElement = document.querySelector(this.config.noteSelector);
        if (currentElement && currentElement === this.uiElements.note) {
          if (result.frequency && result.frequency > 0) {
            // Clear any pending reset timer
            if (this.noteResetTimer) {
              clearTimeout(this.noteResetTimer);
              this.noteResetTimer = null;
            }
            
            const noteInfo = FrequencyUtils.frequencyToNote(result.frequency);
            this.debugLog(`Updating note display: ${this.uiElements.note.id || 'unknown-id'} with note: ${noteInfo.name} (selector: ${this.config.noteSelector})`);
            this.uiElements.note.textContent = noteInfo.name;
          } else {
            // Only reset after a short delay to avoid flickering
            if (!this.noteResetTimer) {
              this.noteResetTimer = window.setTimeout(() => {
                if (this.uiElements.note) {
                  this.debugLog(`Resetting note display: ${this.uiElements.note.id || 'unknown-id'} to "-" (delayed, selector: ${this.config.noteSelector})`);
                  this.uiElements.note.textContent = '-';
                }
                this.noteResetTimer = null;
              }, AudioDetectionComponent.NOTE_RESET_DELAY_MS);
            }
          }
        } else {
          this.debugLog(`Note element mismatch: cached element does not match current selector ${this.config.noteSelector} - skipping update to prevent cross-mode interference`);
        }
      } else {
        if (!this.config.noteSelector) {
          this.debugLog('Note updates skipped - no noteSelector configured');
        } else {
          this.debugLog('Note element not found in uiElements.note - check selector caching');
        }
      }
    } catch (error) {
      this.debugLog('UI update error:', error);
    }
  }

  /**
   * Updates UI element selectors and re-caches DOM elements
   * 
   * @param selectors - Object containing new selector strings
   * @param selectors.volumeBarSelector - New selector for volume bar element
   * @param selectors.volumeTextSelector - New selector for volume text element
   * @param selectors.frequencySelector - New selector for frequency display element
   * @param selectors.noteSelector - New selector for note display element (if not provided, will be cleared to prevent cross-mode interference)
   * 
   * @example
   * ```typescript
   * // Switch volume bar to different element (e.g., range test mode)
   * audioDetector.updateSelectors({
   *   volumeBarSelector: '#range-test-volume-bar',
   *   volumeTextSelector: '#range-test-volume-text',
   *   frequencySelector: '#range-test-frequency-value'
   * });
   * ```
   */
  async updateSelectors(selectors: Partial<Pick<AudioDetectionConfig, 
    'volumeBarSelector' | 'volumeTextSelector' | 'frequencySelector' | 'noteSelector'>>): Promise<void> {
    
    this.debugLog('Updating selectors:', selectors);
    
    // Set flag to prevent UI updates during selector changes
    this.isUpdatingSelectors = true;
    
    // Temporarily stop UI updates to prevent overwriting reset values
    const wasUIUpdating = this.uiUpdateTimer !== null;
    if (wasUIUpdating) {
      this.stopUIUpdates();
    }
    
    // Wait a moment to ensure any pending UI updates are processed
    await this.delay(AudioDetectionComponent.SELECTOR_UPDATE_DELAY_MS);
    
    // Reset all existing UI elements to initial state before switching
    this.resetAllUIElements();
    
    // Update configuration with new selectors
    if (selectors.volumeBarSelector !== undefined) {
      this.config.volumeBarSelector = selectors.volumeBarSelector;
    }
    if (selectors.volumeTextSelector !== undefined) {
      this.config.volumeTextSelector = selectors.volumeTextSelector;
    }
    if (selectors.frequencySelector !== undefined) {
      this.config.frequencySelector = selectors.frequencySelector;
    }
    
    // Handle noteSelector: if explicitly provided, use it; if not provided in a mode switch, clear it to prevent cross-mode interference
    if (selectors.noteSelector !== undefined) {
      this.config.noteSelector = selectors.noteSelector;
    } else {
      // When switching modes without specifying noteSelector, clear it to prevent old note elements from updating
      this.config.noteSelector = '';
      this.debugLog('noteSelector cleared automatically to prevent cross-mode interference');
    }
    
    // Re-cache UI elements with new selectors
    this.cacheUIElements();
    
    // Wait for DOM updates
    await this.delay(AudioDetectionComponent.SELECTOR_UPDATE_DELAY_MS);
    
    // Reset the new UI elements as well to ensure they start clean
    this.resetAllUIElements();
    
    // Clear the flag and resume UI updates if they were running
    this.isUpdatingSelectors = false;
    
    if (wasUIUpdating) {
      // Add longer delay to ensure reset values are visible
      await this.delay(AudioDetectionComponent.UI_RESTART_DELAY_MS);
      this.startUIUpdates();
    }
    
    this.debugLog('Selectors updated, all elements reset, and UI elements re-cached:', Object.keys(this.uiElements));
  }

  /**
   * Destroys the component and cleans up all resources
   * 
   * @example
   * ```typescript
   * // Clean up when component is no longer needed
   * audioDetector.destroy();
   * ```
   */
  
  /**
   * Reset recovery attempts and restart monitoring if needed
   * This method can be used to recover from "Maximum recovery attempts reached" errors
   */
  resetRecoveryAttempts(): void {
    this.debugLog('Resetting recovery attempts...');
    
    try {
      if (this.micController) {
        this.micController.resetRecoveryAttempts();
        this.debugLog('Recovery attempts reset successfully');
      } else {
        this.debugLog('No microphone controller available to reset');
      }
    } catch (error) {
      this.debugLog('Error resetting recovery attempts:', error);
      throw error;
    }
  }

  destroy(): void {
    this.debugLog('Destroying AudioDetectionComponent...');
    
    try {
      // Stop detection and UI updates
      this.stopDetection();
      
      // Clear note reset timer
      if (this.noteResetTimer) {
        clearTimeout(this.noteResetTimer);
        this.noteResetTimer = null;
      }
      
      // Cleanup components
      if (this.pitchDetector) {
        this.pitchDetector.destroy();
        this.pitchDetector = null;
      }
      
      if (this.micController) {
        this.micController.destroy();
        this.micController = null;
      }
      
      // Clear UI elements cache
      this.uiElements = {};
      
      // Reset state
      this.isInitialized = false;
      this.currentState = 'uninitialized';
      this.callbacks = {};
      this.lastError = null;
      
      this.debugLog('AudioDetectionComponent destroyed');
    } catch (error) {
      console.error('Error during AudioDetectionComponent destruction:', error);
    }
  }

  /**
   * Gets current component status for debugging
   * 
   * @returns Status object with current state information
   */
  getStatus() {
    return {
      state: this.currentState,
      isInitialized: this.isInitialized,
      deviceSpecs: this.deviceSpecs,
      deviceSettings: this.deviceSettings,
      config: this.config,
      lastError: this.lastError,
      pitchDetectorStatus: this.pitchDetector?.getStatus(),
      micControllerStatus: this.micController?.getStatus()
    };
  }

  /**
   * Provides access to the MicrophoneController for unified system management
   * 
   * @description Exposes the MicrophoneController instance to enable external access
   * to unified reset operations, mute/unmute functionality, and centralized control
   * of the entire PitchPro system. This is the primary interface for system-wide operations.
   * 
   * @returns The MicrophoneController instance, or null if not initialized
   * 
   * @example
   * ```typescript
   * const micController = audioDetector.microphoneController;
   * if (micController) {
   *   // Perform unified system reset
   *   micController.reset(); // Stops detection, clears UI, mutes mic
   *   
   *   // Control microphone state
   *   micController.toggleMute();
   * }
   * ```
   */
  get microphoneController(): MicrophoneController | null {
    return this.micController;
  }

  // Private methods implementation continues...
  // (Will be implemented in the next part)

  /**
   * Detects device type and applies optimization settings
   * @private
   */
  private detectAndOptimizeDevice(): void {
    this.deviceSpecs = DeviceDetection.getDeviceSpecs();
    
    // v1.1.8: Use DeviceDetection optimized values instead of hardcoded settings
    const deviceSettingsMap: Record<string, DeviceSettings> = {
      PC: {
        volumeMultiplier: 3.0,
        sensitivityMultiplier: 2.5,
        minVolumeAbsolute: this.deviceSpecs.noiseGate * 0.25  // Based on DeviceDetection noiseGate
      },
      iPhone: {
        volumeMultiplier: 4.5,
        sensitivityMultiplier: 3.5,
        minVolumeAbsolute: this.deviceSpecs.noiseGate * 0.27  // Based on DeviceDetection noiseGate
      },
      iPad: {
        volumeMultiplier: 7.0,
        sensitivityMultiplier: 5.0,
        minVolumeAbsolute: this.deviceSpecs.noiseGate * 0.28  // Based on DeviceDetection noiseGate
      }
    };

    this.deviceSettings = deviceSettingsMap[this.deviceSpecs.deviceType] || deviceSettingsMap.PC;
    
    // v1.1.8: Apply DeviceDetection optimized volume threshold
    this.config.minVolumeAbsolute = this.deviceSettings.minVolumeAbsolute;
    
    this.debugLog('Device optimization applied:', {
      device: this.deviceSpecs.deviceType,
      settings: this.deviceSettings
    });
  }

  /**
   * Caches UI elements for efficient updates
   * @private
   */
  private cacheUIElements(): void {
    if (this.config.volumeBarSelector) {
      this.uiElements.volumeBar = document.querySelector(this.config.volumeBarSelector) || undefined;
    }
    if (this.config.volumeTextSelector) {
      this.uiElements.volumeText = document.querySelector(this.config.volumeTextSelector) || undefined;
    }
    if (this.config.frequencySelector) {
      this.uiElements.frequency = document.querySelector(this.config.frequencySelector) || undefined;
    }
    if (this.config.noteSelector) {
      this.uiElements.note = document.querySelector(this.config.noteSelector) || undefined;
      this.debugLog(`Note element cached: selector="${this.config.noteSelector}", found=${!!this.uiElements.note}, id="${this.uiElements.note?.id || 'no-id'}"`);
    }

    this.debugLog('UI elements cached:', Object.keys(this.uiElements));
  }

  /**
   * Publicly accessible method to reset all UI elements to their initial state
   * Provides external access to comprehensive UI reset functionality
   */
  public resetDisplayElements(): void {
    this.resetAllUIElements();
  }

  /**
   * Resets all UI elements to their initial state (0 values)
   * @private
   */
  private resetAllUIElements(): void {
    try {
      // Reset all possible UI elements by querying all selectors that might exist
      const allPossibleSelectors = [
        // Mic mode selectors (all possible variations)
        '#mic-volume-bar', '#mic-volume-text', '#mic-frequency', '#mic-frequency-display',
        // Range mode selectors (all possible variations)
        '#range-volume-bar', '#range-volume-text', '#range-frequency', '#range-frequency-value', '#range-frequency-display',
        // Practice mode selectors (always reset note display when switching modes)
        '#practice-volume-bar', '#practice-volume-text', '#practice-frequency', '#practice-note',
        // Add common frequency display patterns
        '#freq-1', '#freq-2', '#freq-3', '#freq-4', '#freq-5',
        '#frequency-1', '#frequency-2', '#frequency-3',
        '#pitch-1', '#pitch-2', '#pitch-3',
        // Also reset current configuration selectors
        this.config.volumeBarSelector,
        this.config.volumeTextSelector,
        this.config.frequencySelector,
        this.config.noteSelector
      ];
      
      // Additionally, try to find all elements with frequency-related IDs or classes
      // But be more selective to avoid breaking UI elements
      const frequencyElements = document.querySelectorAll('[id*="freq"]:not(.frequency-group):not(.frequency-box), [id*="frequency"]:not(.frequency-group):not(.frequency-box), [id*="pitch"]:not(.frequency-group):not(.frequency-box)');
      frequencyElements.forEach(element => {
        // Only reset if it looks like a frequency display (contains Hz or is a known pattern)
        const text = element.textContent || '';
        if (text.includes('Hz') || text.match(/^\d+\.?\d*$/)) {
          // Only update text content, don't change any other properties
          if (element.classList.contains('frequency-display') || element.id.includes('freq-')) {
            element.textContent = '0.0 Hz';
          }
        }
      });

      allPossibleSelectors.forEach(selector => {
        if (selector) {
          const element = document.querySelector(selector);
          if (element) {
            this.debugLog(`Processing selector: ${selector}, element found: ${!!element}`);
            if (selector.includes('volume-bar')) {
              // Reset volume bar (width style or progress value)
              if (element instanceof HTMLProgressElement) {
                element.value = 0;
              } else {
                (element as HTMLElement).style.width = '0%';
              }
            } else if (selector.includes('volume-text')) {
              // Reset volume text
              element.textContent = '0.0%';
            } else if (selector.includes('frequency')) {
              // Reset frequency display - use multiple approaches for reliability
              element.textContent = '0.0 Hz';
              (element as HTMLElement).innerHTML = '0.0 Hz';
              (element as HTMLElement).setAttribute('data-frequency', '0');
              // Force style refresh to ensure visual update (without breaking display property)
              const originalDisplay = (element as HTMLElement).style.display;
              if (originalDisplay !== 'none') {
                // Only force reflow, don't change display property
                (element as HTMLElement).style.opacity = '0.99';
                (element as HTMLElement).offsetHeight; // Force reflow
                (element as HTMLElement).style.opacity = '';
              }
            } else if (selector.includes('note')) {
              // Reset note display - use multiple approaches for reliability
              const currentText = element.textContent;
              const currentHTML = (element as HTMLElement).innerHTML;
              this.debugLog(`Resetting note element: ${selector}, textContent: "${currentText}", innerHTML: "${currentHTML}"`);
              element.textContent = '-';
              (element as HTMLElement).innerHTML = '-';
              // Force DOM refresh
              (element as HTMLElement).style.opacity = '0.99';
              (element as HTMLElement).offsetHeight; // Force reflow
              (element as HTMLElement).style.opacity = '';
              this.debugLog(`Note reset complete: ${selector}, new textContent: "${element.textContent}", new innerHTML: "${(element as HTMLElement).innerHTML}"`);
            }
          }
        }
      });

      this.debugLog('All UI elements reset to initial state');
    } catch (error) {
      this.debugLog('Error resetting UI elements:', error);
    }
  }

  /**
   * Handles pitch update events from PitchDetector
   * @private
   */
  private handlePitchUpdate(result: PitchDetectionResult): void {
    // Notify callback
    this.callbacks.onPitchUpdate?.(result);
    
    // Notify volume callback
    this.callbacks.onVolumeUpdate?.(result.volume);
    
    // UI updates are handled by the timer for consistent frame rate
  }

  /**
   * Starts UI update timer
   * @private
   */
  private startUIUpdates(): void {
    if (this.uiUpdateTimer) {
      clearInterval(this.uiUpdateTimer);
    }
    
    this.uiUpdateTimer = window.setInterval(() => {
      if (this.pitchDetector && this.currentState === 'detecting') {
        // Get the latest pitch detection result
        const result = this.pitchDetector.getLatestResult();
        if (result) {
          this.updateUI(result);
        } else {
          // When no result, ensure UI shows reset state
          this.updateUI({
            frequency: 0,
            note: '-',
            octave: 0,
            volume: 0,
            clarity: 0
          });
        }
      }
    }, this.config.uiUpdateInterval);
  }

  /**
   * Stops UI update timer
   * @private
   */
  private stopUIUpdates(): void {
    if (this.uiUpdateTimer) {
      clearInterval(this.uiUpdateTimer);
      this.uiUpdateTimer = null;
    }
  }

  /**
   * Updates component state and notifies callbacks
   * @private
   */
  private updateState(newState: typeof this.currentState): void {
    if (this.currentState !== newState) {
      const oldState = this.currentState;
      this.currentState = newState;
      
      this.debugLog(`State changed: ${oldState} → ${newState}`);
      this.callbacks.onStateChange?.(newState);
    }
  }

  /**
   * Handles errors with proper logging and callback notification
   * @private
   */
  private handleError(error: Error | PitchProError, context: string): void {
    const structuredError = error instanceof PitchProError 
      ? error 
      : this.createStructuredError(error, context);

    this.lastError = structuredError;
    this.updateState('error');
    
    this.callbacks.onError?.(structuredError);
    this.debugLog('Error handled:', structuredError.toJSON());
  }

  /**
   * Creates structured error with context information
   * @private
   */
  private createStructuredError(error: Error, operation: string): PitchProError {
    if (error.message.includes('Permission denied') || 
        error.message.includes('NotAllowedError') ||
        error.message.includes('permission')) {
      return new MicrophoneAccessError(
        'マイクへのアクセス許可が拒否されました。ブラウザの設定でマイクアクセスを許可してください。',
        {
          operation,
          originalError: error.message,
          deviceSpecs: this.deviceSpecs,
          componentState: this.currentState
        }
      );
    }
    
    if (error.message.includes('AudioContext') || 
        error.message.includes('audio') ||
        error.message.includes('initialization')) {
      return new AudioContextError(
        'オーディオシステムの初期化に失敗しました。デバイスの音響設定を確認するか、ブラウザを再起動してください。',
        {
          operation,
          originalError: error.message,
          componentState: this.currentState,
          deviceSpecs: this.deviceSpecs
        }
      );
    }
    
    return new PitchProError(
      `${operation}中に予期しないエラーが発生しました: ${error.message}`,
      ErrorCode.PITCH_DETECTION_ERROR,
      {
        operation,
        originalError: error.message,
        stack: error.stack,
        componentState: this.currentState,
        isInitialized: this.isInitialized
      }
    );
  }

  /**
   * Debug logging utility
   * @private
   */
  private debugLog(message: string, ...args: any[]): void {
    if (this.config.debug) {
      console.log(`${this.config.logPrefix} ${message}`, ...args);
    }
  }
}