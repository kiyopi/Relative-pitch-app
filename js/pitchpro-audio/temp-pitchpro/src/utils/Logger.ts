/**
 * PitchPro Logger - Structured logging with levels and context
 * 
 * Provides structured logging functionality with different levels,
 * prefixes, and context information for better debugging and monitoring.
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  SILENT = 4
}

export interface LogContext {
  component?: string;
  operation?: string;
  userId?: string;
  sessionId?: string;
  timestamp?: number;
  [key: string]: any;
}

export interface LogEntry {
  level: LogLevel;
  message: string;
  context?: LogContext;
  timestamp: number;
  prefix?: string;
}

export class Logger {
  private level: LogLevel;
  private prefix: string;
  private context: LogContext;
  private listeners: ((entry: LogEntry) => void)[] = [];

  constructor(
    level: LogLevel = LogLevel.INFO,
    prefix: string = '',
    defaultContext: LogContext = {}
  ) {
    this.level = level;
    this.prefix = prefix;
    this.context = defaultContext;
  }

  /**
   * Set the minimum log level
   */
  setLevel(level: LogLevel): void {
    this.level = level;
  }

  /**
   * Add a log listener for custom handling
   */
  addListener(listener: (entry: LogEntry) => void): void {
    this.listeners.push(listener);
  }

  /**
   * Remove a log listener
   */
  removeListener(listener: (entry: LogEntry) => void): void {
    const index = this.listeners.indexOf(listener);
    if (index !== -1) {
      this.listeners.splice(index, 1);
    }
  }

  /**
   * Create a child logger with additional context
   */
  child(prefix: string, additionalContext: LogContext = {}): Logger {
    const childPrefix = this.prefix ? `${this.prefix}:${prefix}` : prefix;
    const childContext = { ...this.context, ...additionalContext };
    const child = new Logger(this.level, childPrefix, childContext);
    
    // Forward entries to parent listeners
    child.addListener((entry) => {
      this.listeners.forEach(listener => listener(entry));
    });
    
    return child;
  }

  /**
   * Log a debug message
   */
  debug(message: string, context?: LogContext): void {
    this.log(LogLevel.DEBUG, message, context);
  }

  /**
   * Log an info message
   */
  info(message: string, context?: LogContext): void {
    this.log(LogLevel.INFO, message, context);
  }

  /**
   * Log a warning message
   */
  warn(message: string, context?: LogContext): void {
    this.log(LogLevel.WARN, message, context);
  }

  /**
   * Log an error message
   */
  error(message: string, error?: Error, context?: LogContext): void {
    const errorContext = error ? {
      errorName: error.name,
      errorMessage: error.message,
      stack: error.stack,
      ...context
    } : context;

    this.log(LogLevel.ERROR, message, errorContext);
  }

  /**
   * Core logging method
   */
  private log(level: LogLevel, message: string, additionalContext?: LogContext): void {
    if (level < this.level) {
      return;
    }

    const entry: LogEntry = {
      level,
      message,
      context: { ...this.context, ...additionalContext },
      timestamp: Date.now(),
      prefix: this.prefix
    };

    // Send to console
    this.logToConsole(entry);

    // Send to listeners
    this.listeners.forEach(listener => {
      try {
        listener(entry);
      } catch (error) {
        // Prevent listener errors from breaking logging
        console.error('Logger listener error:', error);
      }
    });
  }

  /**
   * Format and output to console
   */
  private logToConsole(entry: LogEntry): void {
    const timestamp = new Date(entry.timestamp).toISOString();
    const levelStr = LogLevel[entry.level];
    const prefix = entry.prefix ? `[${entry.prefix}]` : '';
    const baseMessage = `${timestamp} ${levelStr} ${prefix} ${entry.message}`;

    const consoleMethod = this.getConsoleMethod(entry.level);

    if (entry.context && Object.keys(entry.context).length > 0) {
      consoleMethod(baseMessage, entry.context);
    } else {
      consoleMethod(baseMessage);
    }
  }

  /**
   * Get appropriate console method for log level
   */
  private getConsoleMethod(level: LogLevel): (...args: any[]) => void {
    switch (level) {
      case LogLevel.DEBUG:
        return console.debug;
      case LogLevel.INFO:
        return console.info;
      case LogLevel.WARN:
        return console.warn;
      case LogLevel.ERROR:
        return console.error;
      default:
        return console.log;
    }
  }

  /**
   * Get current log level
   */
  getLevel(): LogLevel {
    return this.level;
  }

  /**
   * Check if a level is enabled
   */
  isLevelEnabled(level: LogLevel): boolean {
    return level >= this.level;
  }
}

// Default logger instance
export const defaultLogger = new Logger(LogLevel.INFO, 'PitchPro');

// Convenience functions using default logger
export const debug = (message: string, context?: LogContext) => 
  defaultLogger.debug(message, context);

export const info = (message: string, context?: LogContext) => 
  defaultLogger.info(message, context);

export const warn = (message: string, context?: LogContext) => 
  defaultLogger.warn(message, context);

export const error = (message: string, err?: Error, context?: LogContext) => 
  defaultLogger.error(message, err, context);