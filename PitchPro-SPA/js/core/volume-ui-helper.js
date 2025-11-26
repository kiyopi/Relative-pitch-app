/**
 * VolumeUIHelper - 音量バー・周波数表示の統一更新モジュール
 *
 * PitchProのautoUpdateUI機能を使わず、アプリ側で統一的にUI更新を行う
 *
 * 背景:
 *   - autoUpdateUI: true では音量が2倍になるバグが発生
 *   - autoUpdateUI: false に統一し、このヘルパーで一元管理
 *
 * @version 1.0.0
 * @date 2025-11-26
 * @dependencies DeviceDetector (device-detector.js)
 * @usedBy preparation-pitchpro-cycle.js, trainingController.js, voice-range-test.js
 */

(function() {
    'use strict';

    /**
     * 音量バー・周波数表示の統一更新ヘルパー
     */
    window.VolumeUIHelper = {
        /**
         * デバイス別volumeMultiplierを取得
         * DeviceDetector.getDeviceSensitivity()を使用
         * @returns {number} 音量表示倍率
         */
        getVolumeMultiplier() {
            if (window.DeviceDetector && typeof window.DeviceDetector.getDeviceSensitivity === 'function') {
                return window.DeviceDetector.getDeviceSensitivity();
            }
            // フォールバック: デフォルト値
            console.warn('⚠️ VolumeUIHelper: DeviceDetector not found, using default multiplier');
            return 4.0;
        },

        /**
         * 生の音量値を表示用パーセントに変換
         * @param {number} rawVolume - result.volume (0-1の範囲、実際は0-0.3程度)
         * @returns {number} 表示用パーセント (0-100)
         *
         * 【計算式】PitchProの自動UI更新と同じ:
         *   displayPercent = rawVolume * volumeMultiplier
         *   (volumeMultiplierはデバイス別: PC=4.0, iPhone=4.5, iPad=7.0)
         */
        calculateVolumePercent(rawVolume) {
            // result.volumeは0-1の範囲（実際は0〜0.5程度）
            // 単純に100倍して0-100%に変換
            // 注: multiplierは使用しない（PitchPro内部で既に正規化されているため）
            const result = Math.min(100, Math.max(0, rawVolume * 100));
            // 【デバッグ】10回に1回だけログ出力
            if (Math.random() < 0.1) {
                console.log(`🔊 [VolumeUIHelper] rawVolume=${rawVolume.toFixed(4)} → ${result.toFixed(1)}%`);
            }
            return result;
        },

        /**
         * 音量バーを更新
         * @param {string|Element} selector - CSSセレクター or DOM要素
         * @param {number} rawVolume - result.volume (0-1の範囲)
         * @returns {number} 設定したパーセント値
         */
        updateVolumeBar(selector, rawVolume) {
            const percent = this.calculateVolumePercent(rawVolume);
            const el = typeof selector === 'string' ? document.querySelector(selector) : selector;
            if (el) {
                el.style.width = `${percent}%`;
            }
            return percent;
        },

        /**
         * 音量テキストを更新
         * @param {string|Element} selector - CSSセレクター or DOM要素
         * @param {number} rawVolume - result.volume (0-1の範囲)
         * @returns {number} 設定したパーセント値
         */
        updateVolumeText(selector, rawVolume) {
            const percent = this.calculateVolumePercent(rawVolume);
            const el = typeof selector === 'string' ? document.querySelector(selector) : selector;
            if (el) {
                el.textContent = `${percent.toFixed(1)}%`;
            }
            return percent;
        },

        /**
         * 音量バーとテキストを同時に更新
         * @param {Object} options - 更新オプション
         * @param {string|Element} [options.barSelector] - 音量バーのセレクター
         * @param {string|Element} [options.textSelector] - 音量テキストのセレクター
         * @param {number} options.rawVolume - result.volume (0-1の範囲)
         * @returns {number} 設定したパーセント値
         */
        updateVolume(options) {
            const { barSelector, textSelector, rawVolume } = options;
            const percent = this.calculateVolumePercent(rawVolume);

            if (barSelector) {
                const barEl = typeof barSelector === 'string' ? document.querySelector(barSelector) : barSelector;
                if (barEl) {
                    barEl.style.width = `${percent}%`;
                }
            }

            if (textSelector) {
                const textEl = typeof textSelector === 'string' ? document.querySelector(textSelector) : textSelector;
                if (textEl) {
                    textEl.textContent = `${percent.toFixed(1)}%`;
                }
            }

            return percent;
        },

        /**
         * 周波数から音名を取得
         * @param {number} frequency - 周波数 (Hz)
         * @returns {string} 音名 (例: "C4", "A#3")
         */
        frequencyToNoteName(frequency) {
            if (!frequency || frequency <= 0) return '';

            const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
            const A4 = 440;
            const semitones = Math.round(12 * Math.log2(frequency / A4));
            const noteIndex = ((semitones % 12) + 12 + 9) % 12; // A=0から始まるのでC=0に変換
            const octave = Math.floor((semitones + 9) / 12) + 4;
            return `${noteNames[noteIndex]}${octave}`;
        },

        /**
         * 周波数表示を更新
         * @param {string|Element} selector - CSSセレクター or DOM要素
         * @param {number} frequency - 周波数 (Hz)
         * @param {Object} [options] - オプション
         * @param {boolean} [options.showNote=true] - 音名を表示するか
         * @param {string} [options.zeroText='0.0 Hz'] - 周波数0時のテキスト
         */
        updateFrequency(selector, frequency, options = {}) {
            const { showNote = true, zeroText = '0.0 Hz' } = options;
            const el = typeof selector === 'string' ? document.querySelector(selector) : selector;

            if (!el) return;

            if (frequency && frequency > 0) {
                if (showNote) {
                    const noteName = this.frequencyToNoteName(frequency);
                    el.textContent = `${frequency.toFixed(1)} Hz (${noteName})`;
                } else {
                    el.textContent = `${frequency.toFixed(1)} Hz`;
                }
            } else {
                el.textContent = zeroText;
            }
        },

        /**
         * PitchProのresultオブジェクトから一括でUI更新
         * @param {Object} result - PitchProコールバックのresult
         * @param {Object} selectors - 各UIのセレクター
         * @param {string|Element} [selectors.volumeBar] - 音量バー
         * @param {string|Element} [selectors.volumeText] - 音量テキスト
         * @param {string|Element} [selectors.frequency] - 周波数表示
         */
        updateFromResult(result, selectors) {
            const { volumeBar, volumeText, frequency } = selectors;

            // 音量更新
            if (result.volume !== undefined) {
                if (volumeBar) {
                    this.updateVolumeBar(volumeBar, result.volume);
                }
                if (volumeText) {
                    this.updateVolumeText(volumeText, result.volume);
                }
            }

            // 周波数更新
            if (frequency) {
                this.updateFrequency(frequency, result.frequency);
            }
        }
    };

    console.log('✅ VolumeUIHelper loaded (v1.0.0)');

})();
