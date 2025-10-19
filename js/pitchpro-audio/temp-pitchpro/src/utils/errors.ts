export enum ErrorCode {
  AUDIO_CONTEXT_ERROR = 'AUDIO_CONTEXT_ERROR',
  MICROPHONE_ACCESS_DENIED = 'MICROPHONE_ACCESS_DENIED',
  PITCH_DETECTION_ERROR = 'PITCH_DETECTION_ERROR',
  BUFFER_OVERFLOW = 'BUFFER_OVERFLOW',
  INVALID_SAMPLE_RATE = 'INVALID_SAMPLE_RATE',
  DEVICE_NOT_SUPPORTED = 'DEVICE_NOT_SUPPORTED',
  PROCESSING_TIMEOUT = 'PROCESSING_TIMEOUT'
}

export class PitchProError extends Error {
  public readonly code: ErrorCode;
  public readonly timestamp: Date;
  public readonly context?: Record<string, any>;

  constructor(
    message: string,
    code: ErrorCode,
    context?: Record<string, any>
  ) {
    super(message);
    this.name = 'PitchProError';
    this.code = code;
    this.timestamp = new Date();
    this.context = context;
    
    // Maintain proper stack trace for where our error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, PitchProError);
    }
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      timestamp: this.timestamp,
      context: this.context,
      stack: this.stack
    };
  }
}

export class AudioContextError extends PitchProError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, ErrorCode.AUDIO_CONTEXT_ERROR, context);
    this.name = 'AudioContextError';
  }
}

export class MicrophoneAccessError extends PitchProError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, ErrorCode.MICROPHONE_ACCESS_DENIED, context);
    this.name = 'MicrophoneAccessError';
  }
}

export class MicrophoneHealthError extends PitchProError {
  constructor(
    message: string, 
    healthStatus: any, 
    recoveryAttempts: number,
    context?: Record<string, any>
  ) {
    super(
      message, 
      ErrorCode.MICROPHONE_ACCESS_DENIED, 
      { 
        healthStatus, 
        recoveryAttempts,
        timestamp: Date.now(),
        ...context 
      }
    );
    this.name = 'MicrophoneHealthError';
  }

  getHealthStatus() {
    return this.context?.healthStatus;
  }

  getRecoveryAttempts() {
    return this.context?.recoveryAttempts;
  }
}

export class PitchDetectionError extends PitchProError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, ErrorCode.PITCH_DETECTION_ERROR, context);
    this.name = 'PitchDetectionError';
  }
}

export function handleError(error: unknown): PitchProError {
  if (error instanceof PitchProError) {
    return error;
  }
  
  if (error instanceof Error) {
    return new PitchProError(
      error.message,
      ErrorCode.PITCH_DETECTION_ERROR,
      { originalError: error.name }
    );
  }
  
  return new PitchProError(
    'An unknown error occurred',
    ErrorCode.PITCH_DETECTION_ERROR,
    { error: String(error) }
  );
}

export function isRecoverableError(error: PitchProError): boolean {
  const recoverableErrors = [
    ErrorCode.BUFFER_OVERFLOW,
    ErrorCode.PROCESSING_TIMEOUT,
    ErrorCode.PITCH_DETECTION_ERROR
  ];
  
  return recoverableErrors.includes(error.code);
}

/**
 * User-friendly error message generator for different error types
 * 
 * @description Converts technical error messages into user-friendly Japanese messages
 * with actionable guidance for resolution.
 */
export class ErrorMessageBuilder {
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
  } {
    switch (error.code) {
      case ErrorCode.MICROPHONE_ACCESS_DENIED:
        return {
          title: 'マイクアクセスが拒否されました',
          message: 'ピッチ検出を行うには、マイクへのアクセス許可が必要です。',
          actions: [
            'ブラウザのアドレスバーにあるマイクアイコンをクリック',
            '「このサイトでマイクを許可する」を選択',
            'ページを再読み込みしてもう一度試す',
            'プライベートブラウジングモードを無効にする（Safariの場合）'
          ],
          severity: 'high',
          canRetry: true
        };

      case ErrorCode.AUDIO_CONTEXT_ERROR:
        return {
          title: 'オーディオシステムエラー',
          message: 'オーディオの初期化に失敗しました。デバイスの音響設定を確認してください。',
          actions: [
            '他のアプリケーションでマイクが使用中でないか確認',
            'ブラウザを再起動してもう一度試す',
            'システムの音響設定でマイクが有効になっているか確認',
            '外部マイクを使用している場合は接続を確認'
          ],
          severity: 'high',
          canRetry: true
        };

      case ErrorCode.PITCH_DETECTION_ERROR:
        return {
          title: 'ピッチ検出エラー',
          message: '音程の検出中に一時的な問題が発生しました。',
          actions: [
            'マイクに向かって明確に歌ってみる',
            '周囲のノイズを減らす',
            '感度設定を調整する',
            '数秒待ってからもう一度試す'
          ],
          severity: 'medium',
          canRetry: true
        };

      case ErrorCode.BUFFER_OVERFLOW:
        return {
          title: 'バッファオーバーフロー',
          message: 'オーディオデータの処理が追いついていません。',
          actions: [
            '他のタブやアプリケーションを閉じる',
            'ブラウザのハードウェアアクセラレーションを有効にする',
            'より高性能なデバイスを使用する',
            'ページを再読み込みする'
          ],
          severity: 'medium',
          canRetry: true
        };

      case ErrorCode.PROCESSING_TIMEOUT:
        return {
          title: '処理タイムアウト',
          message: 'オーディオ処理の応答時間が長すぎます。',
          actions: [
            'デバイスの負荷を減らす（他のアプリを閉じる）',
            'ネットワーク接続を確認する',
            'ブラウザを再起動する',
            'しばらく待ってからもう一度試す'
          ],
          severity: 'medium',
          canRetry: true
        };

      case ErrorCode.INVALID_SAMPLE_RATE:
        return {
          title: 'サンプリングレート不適合',
          message: 'お使いのデバイスのサンプリングレートがサポートされていません。',
          actions: [
            'システムの音響設定で44.1kHz または 48kHzに設定',
            '外部オーディオインターフェースの設定を確認',
            'デバイスドライバを更新',
            '別のマイクを試す'
          ],
          severity: 'high',
          canRetry: false
        };

      case ErrorCode.DEVICE_NOT_SUPPORTED:
        return {
          title: 'デバイス非対応',
          message: 'お使いのデバイスまたはブラウザはサポートされていません。',
          actions: [
            'Chrome、Firefox、Safari の最新版を使用',
            'より新しいデバイスを使用',
            'ブラウザの互換性情報を確認',
            '技術サポートにお問い合わせ'
          ],
          severity: 'critical',
          canRetry: false
        };

      default:
        return {
          title: '予期しないエラー',
          message: 'システムで予期しない問題が発生しました。',
          actions: [
            'ページを再読み込み',
            'ブラウザを再起動',
            'しばらく時間をおいて再試行',
            '問題が続く場合はサポートへ連絡'
          ],
          severity: 'medium',
          canRetry: true
        };
    }
  }

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
  } {
    return {
      errorCode: error.code,
      timestamp: error.timestamp.toISOString(),
      context: error.context || {},
      stackTrace: error.stack,
      diagnosticInfo: {
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
        timestamp: Date.now(),
        url: typeof window !== 'undefined' ? window.location.href : 'unknown',
        isRecoverable: isRecoverableError(error)
      }
    };
  }

  /**
   * Creates formatted console error messages for development
   * 
   * @param error - PitchProError instance
   * @param context - Additional context information
   */
  static logError(error: PitchProError, context?: string): void {
    const friendlyMessage = this.getUserFriendlyMessage(error);
    const technicalDetails = this.getTechnicalDetails(error);

    console.group(`🚨 [PitchPro Error] ${friendlyMessage.title}`);
    
    // User-friendly information
    console.log('👤 User Message:', friendlyMessage.message);
    console.log('📋 Suggested Actions:', friendlyMessage.actions);
    console.log('⚠️ Severity:', friendlyMessage.severity);
    console.log('🔄 Can Retry:', friendlyMessage.canRetry);
    
    // Technical details
    console.log('🔧 Error Code:', technicalDetails.errorCode);
    console.log('⏰ Timestamp:', technicalDetails.timestamp);
    
    if (context) {
      console.log('📍 Context:', context);
    }
    
    if (technicalDetails.context && Object.keys(technicalDetails.context).length > 0) {
      console.log('🔍 Additional Context:', technicalDetails.context);
    }
    
    if (technicalDetails.stackTrace) {
      console.log('📜 Stack Trace:', technicalDetails.stackTrace);
    }
    
    console.groupEnd();
  }

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
  } {
    const base = this.getUserFriendlyMessage(error);
    
    const immediate = base.actions.slice(0, 2);
    const fallback = base.actions.slice(2);
    
    // Device-specific preventive measures
    let preventive: string[] = [];
    
    if (deviceType === 'iPhone' || deviceType === 'iPad') {
      preventive = [
        '感度を高めに設定（7.0x推奨）',
        'Safari使用を推奨',
        'iOS 14以上で使用',
        '低電力モードを無効にする'
      ];
    } else if (deviceType === 'Android') {
      preventive = [
        'Chrome使用を推奨',
        'バックグラウンドアプリを制限',
        '省電力モードを無効にする',
        'マイク権限を常に許可に設定'
      ];
    } else {
      preventive = [
        '安定したネットワーク環境で使用',
        'ブラウザを最新版に更新',
        'ハードウェアアクセラレーションを有効化',
        '外部ノイズの少ない環境で使用'
      ];
    }
    
    return {
      immediate,
      fallback,
      preventive
    };
  }
}