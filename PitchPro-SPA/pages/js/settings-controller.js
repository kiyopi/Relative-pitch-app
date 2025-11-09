/**
 * 設定ページコントローラー
 *
 * @version 1.0.0
 * @date 2025-11-09
 * @description データ管理・デバイス情報表示
 */

(function() {
    'use strict';

    /**
     * 設定ページ初期化
     */
    function initializeSettingsPage() {
        console.log('🔧 設定ページ初期化開始');

        // デバイス情報表示
        displayDeviceInfo();

        // イベントリスナー登録
        registerEventListeners();

        // Lucideアイコン初期化
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }

        console.log('✅ 設定ページ初期化完了');
    }

    /**
     * デバイス情報を表示
     */
    function displayDeviceInfo() {
        if (!window.DeviceDetector) {
            console.error('❌ DeviceDetectorが見つかりません');
            return;
        }

        const deviceInfo = window.DeviceDetector.getDeviceInfo();

        // デバイスタイプ
        const deviceTypeMap = {
            'iphone': 'iPhone',
            'ipad': 'iPad',
            'android': 'Android',
            'pc': 'PC'
        };
        document.getElementById('device-type').textContent =
            deviceTypeMap[deviceInfo.type] || deviceInfo.type;

        // 音量設定
        document.getElementById('device-volume').textContent =
            `${deviceInfo.volume >= 0 ? '+' : ''}${deviceInfo.volume}dB`;

        // 感度設定
        document.getElementById('device-sensitivity').textContent =
            `${deviceInfo.sensitivity}x`;

        // 画面サイズ
        document.getElementById('screen-size').textContent =
            `${deviceInfo.screen.width} × ${deviceInfo.screen.height}`;

        console.log('✅ デバイス情報表示完了:', deviceInfo);
    }

    /**
     * イベントリスナー登録
     */
    function registerEventListeners() {
        // データエクスポート
        const btnExport = document.getElementById('btn-export-data');
        if (btnExport) {
            btnExport.addEventListener('click', handleExportData);
        }

        // データインポート
        const btnImport = document.getElementById('btn-import-data');
        const fileInput = document.getElementById('file-import-data');
        if (btnImport && fileInput) {
            btnImport.addEventListener('click', () => fileInput.click());
            fileInput.addEventListener('change', handleImportData);
        }

        // トレーニング記録削除
        const btnResetTraining = document.getElementById('btn-reset-training');
        if (btnResetTraining) {
            btnResetTraining.addEventListener('click', () =>
                handleResetData('training'));
        }

        // 音域テスト結果削除
        const btnResetVoiceRange = document.getElementById('btn-reset-voice-range');
        if (btnResetVoiceRange) {
            btnResetVoiceRange.addEventListener('click', () =>
                handleResetData('voiceRange'));
        }

        // 全データリセット
        const btnResetAll = document.getElementById('btn-reset-all');
        if (btnResetAll) {
            btnResetAll.addEventListener('click', () =>
                handleResetData('all'));
        }
    }

    /**
     * データエクスポート処理
     */
    function handleExportData() {
        try {
            if (!window.DataManager) {
                throw new Error('DataManagerが見つかりません');
            }

            const success = window.DataManager.downloadExportData();

            if (success) {
                showNotification('データをエクスポートしました', 'success');
            } else {
                throw new Error('エクスポートに失敗しました');
            }
        } catch (error) {
            console.error('❌ データエクスポートエラー:', error);
            showNotification('エクスポートに失敗しました', 'error');
        }
    }

    /**
     * データインポート処理
     */
    async function handleImportData(event) {
        const file = event.target.files[0];
        if (!file) return;

        try {
            if (!window.DataManager) {
                throw new Error('DataManagerが見つかりません');
            }

            // 確認ダイアログ
            const confirmed = confirm(
                '既存のデータは上書きされます。\n' +
                'インポートを続行しますか？\n\n' +
                '※事前にエクスポートでバックアップを取ることを推奨します'
            );

            if (!confirmed) {
                event.target.value = ''; // ファイル選択をリセット
                return;
            }

            const result = await window.DataManager.importDataFromFile(file);

            if (result.success) {
                showNotification(
                    `データをインポートしました\n` +
                    `インポート: ${result.imported.length}件`,
                    'success'
                );

                // ページをリロードして最新データを反映
                setTimeout(() => {
                    location.reload();
                }, 1500);
            } else {
                throw new Error(`インポートエラー: ${result.errors.length}件`);
            }
        } catch (error) {
            console.error('❌ データインポートエラー:', error);
            showNotification(
                'インポートに失敗しました\n' +
                'ファイル形式を確認してください',
                'error'
            );
        } finally {
            event.target.value = ''; // ファイル選択をリセット
        }
    }

    /**
     * データリセット処理
     * @param {string} type - 'training' | 'voiceRange' | 'all'
     */
    function handleResetData(type) {
        const messages = {
            training: {
                confirm: '全てのトレーニング記録を削除します。\nよろしいですか？',
                success: 'トレーニング記録を削除しました',
                error: 'トレーニング記録の削除に失敗しました'
            },
            voiceRange: {
                confirm: '音域テスト結果を削除します。\nよろしいですか？',
                success: '音域テスト結果を削除しました',
                error: '音域テスト結果の削除に失敗しました'
            },
            all: {
                confirm: '⚠️ 警告: 全てのデータを完全に削除します。\n' +
                         'この操作は取り消せません。\n\n' +
                         '本当に削除しますか？',
                success: '全データをリセットしました',
                error: '全データのリセットに失敗しました'
            }
        };

        const msg = messages[type];
        if (!msg) return;

        // 確認ダイアログ
        const confirmed = confirm(msg.confirm);
        if (!confirmed) return;

        // 全データリセットの場合は二重確認
        if (type === 'all') {
            const doubleConfirmed = confirm(
                '最終確認:\n' +
                '全データを完全に削除します。\n' +
                '本当によろしいですか？'
            );
            if (!doubleConfirmed) return;
        }

        try {
            if (!window.DataManager) {
                throw new Error('DataManagerが見つかりません');
            }

            let success = false;

            switch (type) {
                case 'training':
                    success = window.DataManager.resetTrainingData();
                    break;
                case 'voiceRange':
                    success = window.DataManager.resetVoiceRangeData();
                    break;
                case 'all':
                    success = window.DataManager.resetAllData();
                    break;
            }

            if (success) {
                showNotification(msg.success, 'success');

                // ホームに戻る
                setTimeout(() => {
                    location.hash = '';
                    location.reload();
                }, 1500);
            } else {
                throw new Error('削除処理に失敗しました');
            }
        } catch (error) {
            console.error('❌ データリセットエラー:', error);
            showNotification(msg.error, 'error');
        }
    }

    /**
     * 通知メッセージ表示
     * @param {string} message - 表示するメッセージ
     * @param {string} type - 'success' | 'error' | 'info'
     */
    function showNotification(message, type = 'info') {
        // シンプルなalert実装（将来的にトーストUIに拡張可能）
        if (type === 'error') {
            alert(`❌ ${message}`);
        } else if (type === 'success') {
            alert(`✅ ${message}`);
        } else {
            alert(`ℹ️ ${message}`);
        }
    }

    // ページ読み込み時に初期化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeSettingsPage);
    } else {
        initializeSettingsPage();
    }

})();
