/**
 * PitchPro統一設定モジュール
 *
 * 全ページで同一のPitchPro設定を使用するための統一管理モジュール
 * - 倍音補正・周波数範囲・明瞭度閾値を一元管理
 * - オクターブ誤認識・外れ値検出の問題を防止
 * - 保守性・拡張性の向上
 *
 * @version 1.2.3
 * @date 2025-11-25
 *
 * Changelog:
 *   v1.2.3 (2025-11-25) - ノイズ検出問題の包括的修正
 *     - clarityThreshold: 0.75 → 0.85 (正常な発声0.97-0.99との明確な区別)
 *     - minVolumeAbsolute: 0.012 → 0.020 (環境ノイズ1.7%音量バー表示を排除)
 *   v1.2.2 (2025-11-25) - iPhone低音域ノイズ対策のさらなる強化
 *     - clarityThreshold: 0.65 → 0.75 (環境ノイズの高明瞭度検出に対応)
 *   v1.2.1 (2025-11-25) - iPhone低音域ノイズ対策の微調整
 *     - clarityThreshold: 0.60 → 0.65 (さらにノイズ排除強化)
 *     - minVolumeAbsolute: 0.010 → 0.012 (環境ノイズ排除強化)
 *   v1.2.0 (2025-11-25) - 仕様書準拠の設定値に修正
 *     - clarityThreshold: 0.4 → 0.6 (ノイズ排除強化)
 *     - minVolumeAbsolute: 0.003 → 0.01 (環境ノイズ排除)
 *     - iPhoneでの低音域ノイズ検出問題を修正
 */

(function() {
    'use strict';

    /**
     * PitchPro統一設定オブジェクト
     */
    window.PitchProConfig = {
        /**
         * デフォルト設定を取得
         * @param {Object} options - カスタマイズオプション
         * @returns {Object} AudioDetectionComponentに渡す設定オブジェクト
         */
        getDefaultConfig(options = {}) {
            return {
                // ========================================
                // UI要素セレクター（ページごとにカスタマイズ）
                // ========================================
                volumeBarSelector: options.volumeBarSelector || null,
                volumeTextSelector: options.volumeTextSelector || null,
                frequencySelector: options.frequencySelector || null,
                noteSelector: options.noteSelector || null,

                // ========================================
                // PitchPro推奨設定（全ページ統一）
                // ========================================

                /**
                 * 明瞭度閾値
                 * - 85% - 極めて高い信頼性閾値（正常な発声との明確な区別）
                 * - 正常な発声: 0.97-0.99の明瞭度、環境ノイズ: 0.67-0.90
                 * - iPhone低音域ノイズ対策で0.75→0.85に最終調整
                 */
                clarityThreshold: 0.85,

                /**
                 * 最小音量（絶対値）
                 * - 2.0% - 環境ノイズ音量バー表示を排除
                 * - 実測値: 環境ノイズ1.7%を確実に排除
                 * - 音量バーとHz表示の不一致問題を解決
                 */
                minVolumeAbsolute: 0.020,

                /**
                 * FFTサイズ
                 * - 2048 - 標準精度FFT（推奨）
                 * - 周波数分解能と処理速度のバランスが最適
                 * - 4096は高精度だがCPU負荷が高くFPS低下の原因
                 */
                fftSize: 2048,

                /**
                 * 平滑化係数
                 * - 0.1 - 最小限の平滑化
                 * - リアルタイム性を重視、過度な平滑化を避ける
                 */
                smoothing: 0.1,

                /**
                 * 最低周波数
                 * - 60Hz - F3 (174.6Hz) のオクターブ下 (87.3Hz) もカバー
                 * - 倍音補正が低音域のオクターブ誤検出を修正できるよう範囲拡大
                 */
                minFrequency: 60,

                /**
                 * 最高周波数
                 * - 800Hz - E5 (659.3Hz) 以上をカバー
                 * - 1オクターブトレーニングの最高音をカバー
                 * - 基音検出範囲を制限し、倍音誤検出を防止
                 */
                maxFrequency: 800,

                /**
                 * 倍音補正の有効化
                 * - true - 倍音誤検出を自動補正
                 * - 🔥 重要: オクターブ誤認識（233Hz → 120Hz等）を防止
                 * - C3倍音誤検出対策
                 */
                enableHarmonicCorrection: true,

                /**
                 * 倍音補正の詳細設定
                 * - enabled: 倍音補正の有効化
                 * - historyWindow: 履歴の時間窓（ミリ秒）
                 * - minHistorySize: 最小履歴サンプル数
                 */
                harmonicConfig: {
                    enabled: true,
                    historyWindow: 2000,  // 2秒の履歴を使用
                    minHistorySize: 8      // 最小8サンプル
                },

                // ========================================
                // システム設定
                // ========================================

                /**
                 * UI自動更新
                 * - デフォルトfalse
                 * - VolumeUIHelperで統一管理するため無効化
                 * - 【v1.2.4】autoUpdateUI:trueで音量2倍バグ発生のため
                 */
                autoUpdateUI: options.autoUpdateUI !== undefined ? options.autoUpdateUI : false,

                /**
                 * デバッグモード
                 * - デフォルトfalse
                 * - 開発時のみtrueに設定
                 */
                debug: options.debug || false,

                // ========================================
                // 通知システム設定（PitchPro ErrorNotificationSystem）
                // ========================================

                /**
                 * 通知表示設定
                 * - enabled: 通知システムの有効化
                 * - position: 通知の表示位置
                 * - theme: 通知のテーマ
                 */
                notifications: {
                    enabled: true,
                    position: 'top-right',
                    theme: 'dark'
                },

                // ========================================
                // カスタム設定の上書き許可
                // ========================================
                ...options
            };
        },

        /**
         * 設定の説明を取得（デバッグ用）
         * @returns {string} 設定の詳細説明
         */
        getConfigDescription() {
            return `
PitchPro統一設定:
  - 明瞭度閾値: 85% (極めて高い信頼性・正常な発声との明確な区別)
  - 最小音量: 2.0% (環境ノイズ音量バー表示を排除)
  - FFTサイズ: 2048 (標準精度・最適パフォーマンス)
  - 平滑化: 0.1 (最小限)
  - 周波数範囲: 60-800Hz (人間の声 + 倍音誤検出防止)
  - 倍音補正: 有効 (オクターブ誤認識防止)
            `.trim();
        },

        /**
         * 設定の妥当性チェック
         * @param {Object} config - チェック対象の設定
         * @returns {boolean} 妥当性
         */
        validateConfig(config) {
            const errors = [];

            if (config.clarityThreshold < 0 || config.clarityThreshold > 1) {
                errors.push('clarityThreshold must be between 0 and 1');
            }

            if (config.minVolumeAbsolute < 0 || config.minVolumeAbsolute > 1) {
                errors.push('minVolumeAbsolute must be between 0 and 1');
            }

            if (config.minFrequency >= config.maxFrequency) {
                errors.push('minFrequency must be less than maxFrequency');
            }

            if (errors.length > 0) {
                console.error('❌ PitchProConfig validation errors:', errors);
                return false;
            }

            return true;
        }
    };

    console.log('✅ PitchProConfig loaded');
    console.log(window.PitchProConfig.getConfigDescription());

})();
