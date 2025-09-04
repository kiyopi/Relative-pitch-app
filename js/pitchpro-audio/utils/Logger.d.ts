/**
 * Logger - Global logging control for pitchpro-audio
 *
 * Central logging control to prevent console spam in production
 */
export declare class Logger {
    private static DEBUG_ENABLED;
    private static CONSOLE_ENABLED;
    static log(...args: any[]): void;
    static warn(...args: any[]): void;
    static error(...args: any[]): void;
    static debug(...args: any[]): void;
    static setDebugEnabled(enabled: boolean): void;
    static setConsoleEnabled(enabled: boolean): void;
    static getStatus(): {
        debug: boolean;
        console: boolean;
    };
}
//# sourceMappingURL=Logger.d.ts.map