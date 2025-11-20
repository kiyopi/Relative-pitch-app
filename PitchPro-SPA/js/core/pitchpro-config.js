/**
 * PitchPro統一設定モジュール
 *
 * 全ページで同一のPitchPro設定を使用するための統一管理モジュール
 * - 倍音補正・周波数範囲・明瞭度閾値を一元管理
 * - オクターブ誤認識・外れ値検出の問題を防止
 * - 保守性・拡張性の向上
 *
 * @version 1.1.0
 * @date 2025-11-20
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
                 * - 40% - 実用的な信頼性閾値
                 * - これ以下の明瞭度の検出結果は不安定
                 */
                clarityThreshold: 0.4,

                /**
                 * 最小音量（絶対値）
                 * - 0.3% - 適切な最小音量
                 * - ノイズレベルを排除しつつ、小さな声も検出
                 */
                minVolumeAbsolute: 0.003,

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
                 * - デフォルトtrue
                 * - 音量バー・周波数表示の自動更新
                 */
                autoUpdateUI: options.autoUpdateUI !== undefined ? options.autoUpdateUI : true,

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
  - 明瞭度閾値: 40% (実用的な信頼性)
  - 最小音量: 0.3% (ノイズ排除)
  - FFTサイズ: 2048 (標準精度・最適パフォーマンス)
  - 平滑化: 0.1 (最小限)
  - 周波数範囲: 80-800Hz (人間の声 + 倍音誤検出防止)
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
