/**
 * TypeScript type definitions for Lucide Icons
 * 8va相対音感トレーニングアプリ用
 */

export type LucideIconName = 
  // Navigation & UI
  | 'users'
  | 'trophy' 
  | 'settings'
  | 'upload'
  
  // Training modes
  | 'zap'
  | 'target'
  
  // Statistics & Charts
  | 'bar-chart-3'
  | 'trending-up'
  
  // Audio & Media
  | 'mic'
  | 'volume-2'
  | 'music-note'
  | 'headphones'
  
  // UI Elements
  | 'check-circle'
  | 'users-2'
  
  // Progress & Status
  | 'clock'
  | 'activity'
  
  // Additional UI Icons
  | 'arrow-up'
  | 'arrow-down'
  | 'chevron-down'
  | 'chevron-up'
  | 'play'
  | 'pause'
  | 'stop'
  | 'rotate-ccw'
  | 'home'
  | 'x';

export interface LucideIconOptions {
  /** アイコン名 */
  name: LucideIconName;
  /** CSSクラス名 (デフォルト: 'icon') */
  className?: string;
  /** アイコンサイズ (デフォルト: 24) */
  size?: number;
}

export interface LucideIconConfig {
  /** アイコンのSVGパス */
  [key: string]: string;
}

/**
 * Lucideアイコンを生成
 * @param name アイコン名
 * @param className CSSクラス名
 * @param size アイコンサイズ
 * @returns SVG HTML文字列
 */
export declare function lucideIcon(
  name: LucideIconName, 
  className?: string, 
  size?: number
): string;

/**
 * 既存のSVGアイコンをLucideアイコンに置換
 * @param containerSelector 対象コンテナのセレクタ
 */
export declare function replaceLucideIcons(containerSelector?: string): void;

/**
 * 利用可能なLucideアイコンの設定
 */
export declare const LUCIDE_ICONS: LucideIconConfig;

/**
 * アイコンユーティリティクラス
 */
export declare class LucideIconHelper {
  /**
   * アイコンが存在するかチェック
   * @param name アイコン名
   * @returns 存在するかどうか
   */
  static exists(name: string): name is LucideIconName;
  
  /**
   * 利用可能なアイコン名の一覧を取得
   * @returns アイコン名の配列
   */
  static getAvailableIcons(): LucideIconName[];
  
  /**
   * アイコンのプレビューHTMLを生成
   * @param name アイコン名
   * @returns プレビュー用HTML
   */
  static generatePreview(name: LucideIconName): string;
}

/**
 * グローバル関数の型定義 (window オブジェクト用)
 */
declare global {
  interface Window {
    lucideIcon: typeof lucideIcon;
    replaceLucideIcons: typeof replaceLucideIcons;
  }
}

/**
 * 音楽アプリ専用のアイコンセット
 */
export type MusicAppIconName = 
  | 'mic'
  | 'volume-2' 
  | 'music-note'
  | 'headphones'
  | 'play'
  | 'pause'
  | 'stop';

export type UIIconName =
  | 'settings'
  | 'home' 
  | 'x'
  | 'arrow-up'
  | 'arrow-down'
  | 'chevron-up'
  | 'chevron-down';

export type StatIconName = 
  | 'trophy'
  | 'bar-chart-3'
  | 'trending-up'
  | 'activity'
  | 'check-circle';

/**
 * アイコンテーマ設定
 */
export interface IconTheme {
  /** デフォルトサイズ */
  defaultSize: number;
  /** デフォルトクラス */
  defaultClass: string;
  /** カラーバリアント */
  colors: {
    primary: string;
    secondary: string;
    success: string;
    warning: string;
    danger: string;
  };
}

export declare const DEFAULT_ICON_THEME: IconTheme;