export declare enum ErrorCode {
    AUDIO_CONTEXT_ERROR = "AUDIO_CONTEXT_ERROR",
    MICROPHONE_ACCESS_DENIED = "MICROPHONE_ACCESS_DENIED",
    PITCH_DETECTION_ERROR = "PITCH_DETECTION_ERROR",
    BUFFER_OVERFLOW = "BUFFER_OVERFLOW",
    INVALID_SAMPLE_RATE = "INVALID_SAMPLE_RATE",
    DEVICE_NOT_SUPPORTED = "DEVICE_NOT_SUPPORTED",
    PROCESSING_TIMEOUT = "PROCESSING_TIMEOUT"
}
export declare class PitchProError extends Error {
    readonly code: ErrorCode;
    readonly timestamp: Date;
    readonly context?: Record<string, any>;
    constructor(message: string, code: ErrorCode, context?: Record<string, any>);
    toJSON(): {
        name: string;
        message: string;
        code: ErrorCode;
        timestamp: Date;
        context: Record<string, any> | undefined;
        stack: string | undefined;
    };
}
export declare class AudioContextError extends PitchProError {
    constructor(message: string, context?: Record<string, any>);
}
export declare class MicrophoneAccessError extends PitchProError {
    constructor(message: string, context?: Record<string, any>);
}
export declare class PitchDetectionError extends PitchProError {
    constructor(message: string, context?: Record<string, any>);
}
export declare function handleError(error: unknown): PitchProError;
export declare function isRecoverableError(error: PitchProError): boolean;
/**
 * User-friendly error message generator for different error types
 *
 * @description Converts technical error messages into user-friendly Japanese messages
 * with actionable guidance for resolution.
 */
export declare class ErrorMessageBuilder {
    /**
     * Generates user-friendly error messages with resolution steps
     *
     * @param error - PitchProError instance
     * @returns Object containing user message and suggested actions
     */
    static getUserFriendlyMessage(error: PitchProError): {
        title: string;
        message: string;
        actions: string[];
        severity: 'low' | 'medium' | 'high' | 'critical';
        canRetry: boolean;
    };
    /**
     * Generates detailed technical error information for developers
     *
     * @param error - PitchProError instance
     * @returns Formatted technical error details
     */
    static getTechnicalDetails(error: PitchProError): {
        errorCode: string;
        timestamp: string;
        context: Record<string, any>;
        stackTrace?: string;
        diagnosticInfo: Record<string, any>;
    };
    /**
     * Creates formatted console error messages for development
     *
     * @param error - PitchProError instance
     * @param context - Additional context information
     */
    static logError(error: PitchProError, context?: string): void;
    /**
     * Creates recovery suggestions based on error type and context
     *
     * @param error - PitchProError instance
     * @param deviceType - Device type for specific recommendations
     * @returns Recovery strategy object
     */
    static getRecoveryStrategy(error: PitchProError, deviceType?: string): {
        immediate: string[];
        fallback: string[];
        preventive: string[];
    };
}
//# sourceMappingURL=errors.d.ts.map