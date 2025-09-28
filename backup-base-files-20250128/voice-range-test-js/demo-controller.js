/**
 * Voice Range Test Demo Controller
 * GitHub Pages ビルドエラー回避のため外部ファイル化
 */

// VoiceRangeTestControllerの動的インポート
let VoiceRangeTestController;

// 初期化関数
async function initializeDemo() {
    try {
        const module = await import('./voice-range-test-controller.js');
        VoiceRangeTestController = module.VoiceRangeTestController;
        console.log('✅ VoiceRangeTestController loaded successfully');
        return true;
    } catch (error) {
        console.warn('⚠️ VoiceRangeTestController import failed:', error);
        console.log('📋 デモは基本機能のみで動作します');
        return false;
    }
}

// グローバル変数
let controller = null;

// 通知表示関数
function showNotification(message, type = 'info') {
    console.log(`[${type.toUpperCase()}] ${message}`);
    // 簡単な通知機能（実装は省略）
}

// 結果表示関数
function displayResults(results) {
    console.log('🏁 テスト結果:', results);
    // 結果表示ロジック（実装は省略）
}

// デバッグ関数
window.debugBadgeDisplay = function() {
    const badge = document.querySelector('.voice-note-badge');
    const rangeIcon = document.querySelector('#range-icon');
    const countdownDisplay = document.querySelector('#countdown-display');

    console.log('🔍 UI要素デバッグ情報:');
    console.log('  badge:', badge);
    console.log('  badge.classList:', badge ? badge.classList.toString() : 'null');
    console.log('  rangeIcon:', rangeIcon);
    console.log('  rangeIcon.style.display:', rangeIcon ? rangeIcon.style.display : 'null');
    console.log('  countdownDisplay:', countdownDisplay);
    console.log('  countdownDisplay.style.display:', countdownDisplay ? countdownDisplay.style.display : 'null');
    console.log('  countdownDisplay.textContent:', countdownDisplay ? countdownDisplay.textContent : 'null');
};

// DOM読み込み完了時の初期化
document.addEventListener('DOMContentLoaded', async function() {
    // まず初期化を実行
    const demoLoaded = await initializeDemo();

    // PitchProライブラリ読み込み確認
    console.log('🔍 PitchPro読み込み確認:');
    console.log('  PitchPro:', typeof PitchPro);
    console.log('  window.PitchPro:', window.PitchPro);
    console.log('  AudioManager:', typeof AudioManager);
    console.log('  PitchDetector:', typeof PitchDetector);
    console.log('  window.AudioManager:', typeof window.AudioManager);
    console.log('  window.PitchDetector:', typeof window.PitchDetector);

    // PitchProオブジェクトから取得を試行
    if (typeof PitchPro !== 'undefined' && PitchPro) {
        console.log('  PitchPro.AudioManager:', PitchPro.AudioManager);
        console.log('  PitchPro.PitchDetector:', PitchPro.PitchDetector);

        // グローバルスコープに追加
        window.AudioManager = PitchPro.AudioManager;
        window.PitchDetector = PitchPro.PitchDetector;
        console.log('✅ PitchProからAudioManager・PitchDetectorを取得');
    } else {
        console.warn('⚠️ PitchProオブジェクトが見つかりません');
    }

    // 🎯 ワンメソッドデモボタン
    document.getElementById('start-one-method-test').addEventListener('click', async () => {
        console.log('🚀 ワンメソッドテスト開始');

        try {
            // VoiceRangeTestControllerが利用できない場合の処理
            if (!VoiceRangeTestController) {
                showNotification('⚠️ VoiceRangeTestControllerが利用できません', 'warning');
                console.log('📋 基本機能での動作に切り替えます');
                return;
            }

            // 既存のコントローラーを破棄
            if (controller) {
                controller.destroy();
            }

            // UI要素の初期化
            const rangeIcon = document.querySelector('#range-icon');
            const countdownDisplay = document.querySelector('#countdown-display');
            const badge = document.querySelector('.voice-note-badge');

            if (rangeIcon && countdownDisplay && badge) {
                // 初期状態に完全リセット
                rangeIcon.innerHTML = ''; // 既存コンテンツをクリア
                rangeIcon.style.display = 'block';
                countdownDisplay.style.display = 'none';
                badge.classList.remove('measuring', 'confirmed');
                console.log('🔄 UI要素を初期状態にリセット');
            }

            // 新しいコントローラー作成（完全な設定）
            controller = new VoiceRangeTestController({
                debugMode: true,

                // コールバック設定
                onLowPitchComplete: (result) => {
                    console.log('🔽 低音測定完了:', result);
                    showNotification('低音測定完了: ' + result.note, 'success');
                    window.debugBadgeDisplay(); // デバッグ確認
                },

                onHighPitchComplete: (result) => {
                    console.log('🔼 高音測定完了:', result);
                    showNotification('高音測定完了: ' + result.note, 'success');
                    window.debugBadgeDisplay(); // デバッグ確認
                },

                onTestComplete: (results) => {
                    console.log('🏁 音域テスト完了:', results);
                    showNotification('音域測定完了！', 'success');
                    displayResults(results);
                    window.debugBadgeDisplay(); // デバッグ確認
                },

                onError: (error) => {
                    console.error('❌ エラー:', error);
                    showNotification('エラー: ' + error.message, 'error');
                }
            });

            // 🎯 ワンメソッド呼び出し！
            await controller.startVoiceRangeTest();

            // UI更新
            const stopBtn = document.getElementById('stop-range-test-btn');
            if (stopBtn) {
                stopBtn.style.display = 'inline-block';
            }

        } catch (error) {
            console.error('❌ ワンメソッドテストエラー:', error);
            showNotification('テスト開始エラー: ' + error.message, 'error');
        }
    });

    // 通常の開始ボタン（互換性確保）
    const beginBtn = document.getElementById('begin-range-test-btn');
    if (beginBtn) {
        beginBtn.addEventListener('click', async () => {
            document.getElementById('start-one-method-test').click();
        });
    }

    // 停止ボタン
    const stopBtn = document.getElementById('stop-range-test-btn');
    if (stopBtn) {
        stopBtn.addEventListener('click', () => {
            if (controller) {
                controller.destroy();
                controller = null;
                stopBtn.style.display = 'none';
                showNotification('テストを停止しました', 'info');
            }
        });
    }

    // Lucide アイコン初期化
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }

    console.log('✅ VoiceRangeTestController デモ準備完了');
    console.log('🎯 「ワンメソッド音域テスト開始」ボタンを押してテストしてください');
    console.log('🔧 デバッグ用: window.debugBadgeDisplay() で表示状態確認');
});