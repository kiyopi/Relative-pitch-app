/**
 * デバイス検出モジュール
 *
 * 全ページで統一したデバイス判定・設定を提供
 * - iOS（iPhone/iPad）、Android、PC判定
 * - iPadOS 13+の"Macintosh"偽装対策
 * - デバイス別最適化設定（音量・感度）
 *
 * @version 1.0.1
 * @date 2025-11-17
 * @dependencies なし
 * @usedBy trainingController.js, preparation-pitchpro-cycle.js
 */

(function() {
    'use strict';

    /**
     * デバイス検出統一モジュール
     */
    window.DeviceDetector = {
        /**
         * デバイスタイプを取得
         * @returns {'iphone'|'ipad'|'android'|'pc'} デバイスタイプ
         */
        getDeviceType() {
            const userAgent = navigator.userAgent || navigator.vendor || window.opera;

            // Android判定（最優先）
            if (/android/i.test(userAgent)) {
                return this.detectAndroidDeviceType();
            }

            // iOS判定（複数の判定方法を組み合わせた包括的な検出）
            const isIPhone = /iPhone/.test(userAgent);
            const isIPad = /iPad/.test(userAgent);
            const isMacintoshWithTouch = /Macintosh/.test(userAgent) && 'ontouchend' in document;
            const isIOSUserAgent = /iPad|iPhone|iPod/.test(userAgent);
            const isIOSPlatform = /iPad|iPhone|iPod/.test(navigator.platform || '');
            const isIOS = isIPhone || isIPad || isMacintoshWithTouch || isIOSUserAgent || isIOSPlatform;

            // デバイスタイプ判定
            if (isIPhone) {
                return 'iphone';
            } else if (isIPad || isMacintoshWithTouch) {
                return 'ipad';
            } else if (isIOS) {
                // スクリーンサイズで判定
                return this.detectIOSDeviceTypeByScreen();
            } else {
                return 'pc';
            }
        },

        /**
         * スクリーンサイズによるiOSデバイスタイプ判定
         * iPadOS 13+の"Macintosh"偽装対策
         * @returns {'iphone'|'ipad'} デバイスタイプ
         */
        detectIOSDeviceTypeByScreen() {
            const screenWidth = window.screen.width;
            const screenHeight = window.screen.height;
            const maxDimension = Math.max(screenWidth, screenHeight);
            const minDimension = Math.min(screenWidth, screenHeight);

            // iPad判定: 長辺768px以上、または長辺700px以上かつ短辺500px以上
            if (maxDimension >= 768 || (maxDimension >= 700 && minDimension >= 500)) {
                return 'ipad';
            } else {
                return 'iphone';
            }
        },

        /**
         * Androidデバイスタイプを判定（タブレット vs スマートフォン）
         * @returns {'android'} デフォルトは'android'（将来的にandroid-tablet等に拡張可能）
         */
        detectAndroidDeviceType() {
            // 現時点ではAndroid統一
            // 将来的にタブレット判定を追加する場合はここで実装
            // 例: screenサイズ、userAgentの"Mobile"有無等で判定
            const screenWidth = window.screen.width;
            const screenHeight = window.screen.height;
            const maxDimension = Math.max(screenWidth, screenHeight);
            const minDimension = Math.min(screenWidth, screenHeight);

            // タブレット判定の基準（参考実装、将来的に有効化）
            // if (maxDimension >= 768 || (maxDimension >= 700 && minDimension >= 500)) {
            //     return 'android-tablet';
            // }

            return 'android';
        },

        /**
         * デバイス別音量設定を取得
         * PitchShifterのマスターボリューム設定値（dB）
         * @returns {number} 音量設定値（dB）
         */
        getDeviceVolume() {
            const device = this.getDeviceType();
            // 【実機テスト確認済み】デバイス別音量設定
            // iPad/iPhone/Androidはスピーカー出力が小さいため増幅が必要
            const volumeSettings = {
                pc: -12,       // -12dB: Mac音量50%環境での適切な音量
                iphone: +18,   // +18dB: デバイス音量50%時に最適化
                ipad: +12,     // +12dB: play-and-record統一後の適切な音量
                android: +18   // +18dB: iPhoneと同等の設定
            };
            return volumeSettings[device] || -12;
        },

        /**
         * デバイス別感度設定を取得
         * PitchProの音量バー表示倍率
         * @returns {number} 感度倍率
         */
        getDeviceSensitivity() {
            const device = this.getDeviceType();
            const sensitivitySettings = {
                pc: 4.0,       // 4.0x: PC内蔵マイク
                iphone: 4.5,   // 4.5x: iPhone最適化（edf9fc0で正常動作確認）
                ipad: 7.0,     // 7.0x: iPad最適化
                android: 4.5   // 4.5x: iPhoneと同等
            };
            return sensitivitySettings[device] || 4.0;
        },

        /**
         * デバイス情報を取得（デバッグ用）
         * @returns {Object} デバイス情報
         */
        getDeviceInfo() {
            const deviceType = this.getDeviceType();
            return {
                type: deviceType,
                volume: this.getDeviceVolume(),
                sensitivity: this.getDeviceSensitivity(),
                userAgent: navigator.userAgent,
                platform: navigator.platform || 'unknown',
                screen: {
                    width: window.screen.width,
                    height: window.screen.height
                },
                hasTouch: 'ontouchend' in document
            };
        },

        /**
         * デバイス判定結果をコンソール出力（デバッグ用）
         */
        logDeviceInfo() {
            const info = this.getDeviceInfo();
            console.log('📱 DeviceDetector Info:');
            console.log(`  Device Type: ${info.type}`);
            console.log(`  Volume: ${info.volume}dB`);
            console.log(`  Sensitivity: ${info.sensitivity}x`);
            console.log(`  UserAgent: ${info.userAgent}`);
            console.log(`  Platform: ${info.platform}`);
            console.log(`  Screen: ${info.screen.width}x${info.screen.height}`);
            console.log(`  Touch Support: ${info.hasTouch}`);
        }
    };

    console.log('✅ DeviceDetector loaded (v1.0.0 - iOS/Android/PC support)');

})();
