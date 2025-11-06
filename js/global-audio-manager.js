/**
 * GlobalAudioManager - 最小限のPitchProインスタンス管理
 * @version 2.0.0 (完全簡素化版)
 */

class GlobalAudioManager {
    constructor() {
        this.pitchProInstance = null;
        this.readyPromise = null;
    }

    /**
     * PitchProインスタンスを取得します。
     * 存在しない場合は作成し、初期化します。
     * このメソッドは何度呼び出されても、安全に単一のインスタンスを返します。
     * @returns {Promise<AudioDetectionComponent>} 初期化済みのPitchProインスタンス
     */
    async getInstance() {
        if (this.readyPromise) {
            return this.readyPromise;
        }

        this.readyPromise = (async () => {
            try {
                if (this.pitchProInstance) return this.pitchProInstance;

                console.log('🔄 GlobalAudioManager: PitchProインスタンスを初回初期化中...');

                if (typeof window.PitchPro?.AudioDetectionComponent === 'undefined') {
                    throw new Error('PitchProライブラリまたはAudioDetectionComponentが見つかりません');
                }

                // UIセレクタなしで、純粋なインスタンスを作成
                const detector = new window.PitchPro.AudioDetectionComponent({
                    debugMode: true,
                    autoUpdateUI: true
                });
                await detector.initialize();

                this.pitchProInstance = detector;
                console.log('✅ GlobalAudioManager: PitchProインスタンス準備完了！');
                return this.pitchProInstance;

            } catch (error) {
                console.error('❌ GlobalAudioManager: 初期化に失敗:', error);
                this.readyPromise = null; // 失敗したらリトライできるようにPromiseをリセット
                throw error;
            }
        })();

        return this.readyPromise;
    }
}

// グローバルインスタンスの作成
if (typeof window !== 'undefined') {
    window.globalAudioManager = new GlobalAudioManager();
    console.log('🌍 GlobalAudioManager: グローバルインスタンス作成完了');
}