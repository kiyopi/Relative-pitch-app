/**
 * PitchPro統一設定モジュール
 *
 * 全ページで同一のPitchPro設定を使用するための統一管理モジュール
 * - 倍音補正・周波数範囲・明瞭度閾値を一元管理
 * - オクターブ誤認識・外れ値検出の問題を防止
 * - 保守性・拡張性の向上
 *
 * @version 1.0.0
 * @date 2025-11-09
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
                 * - 4096 - 高精度FFT
                 * - 周波数分解能が高く、音程検出精度が向上
                 */
                fftSize: 4096,

                /**
                 * 平滑化係数
                 * - 0.1 - 最小限の平滑化
                 * - リアルタイム性を重視、過度な平滑化を避ける
                 */
                smoothing: 0.1,

                /**
                 * 最低周波数
                 * - 80Hz - F2 (87.3Hz) 以下をカバー
                 * - 人間の声の下限をカバー
                 */
                minFrequency: 80,

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
  - FFTサイズ: 4096 (高精度)
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
