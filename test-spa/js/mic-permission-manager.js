/**
 * MicPermissionManager - マイク許可取得を管理するコンポーネント
 * @version 1.0.0
 *
 * ユーザー操作起点でマイク許可を取得し、PitchProインスタンスを初期化する
 * ブラウザセキュリティポリシーに準拠した2段階アプローチを実装
 */

class MicPermissionManager {
    constructor(options = {}) {
        this.options = {
            debugMode: options.debugMode || false,
            onPermissionGranted: options.onPermissionGranted || null,
            onPermissionDenied: options.onPermissionDenied || null,
            onPitchProReady: options.onPitchProReady || null,
            onError: options.onError || null
        };

        this.stream = null;
        this.pitchProInstance = null;
        this.isPermissionGranted = false;
        this.isInitialized = false;
    }

    /**
     * デバッグログ出力
     */
    log(message, type = 'info') {
        if (!this.options.debugMode) return;

        const icons = {
            info: '📝',
            success: '✅',
            error: '❌',
            warning: '⚠️'
        };

        const icon = icons[type] || icons.info;
        console.log(`${icon} [MicPermissionManager] ${message}`);
    }

    /**
     * マイク許可状態をチェック
     */
    async checkPermissionStatus() {
        try {
            // permissions APIが利用可能な場合
            if (navigator.permissions && navigator.permissions.query) {
                const result = await navigator.permissions.query({ name: 'microphone' });
                this.log(`マイク許可状態: ${result.state}`);
                return result.state; // 'granted', 'denied', 'prompt'
            }
        } catch (error) {
            this.log('Permissions APIが利用できません', 'warning');
        }
        return 'prompt'; // デフォルト
    }

    /**
     * ステップ1: 基本的なgetUserMediaでマイク許可を取得
     */
    async requestMicPermission() {
        this.log('ステップ1: 基本的なgetUserMediaでマイク許可を要求中...');

        try {
            // 既に許可済みの場合はスキップ
            if (this.stream && this.isPermissionGranted) {
                this.log('既にマイク許可済みです', 'success');
                return this.stream;
            }

            // マイク許可要求
            this.stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                }
            });

            this.isPermissionGranted = true;
            this.log('✅ マイク許可成功！', 'success');
            this.log(`ストリーム情報: ${this.stream.constructor.name}`);
            this.log(`オーディオトラック数: ${this.stream.getAudioTracks().length}`);

            // コールバック実行
            if (this.options.onPermissionGranted) {
                this.options.onPermissionGranted(this.stream);
            }

            return this.stream;

        } catch (error) {
            this.isPermissionGranted = false;
            this.log(`マイク許可拒否: ${error.message}`, 'error');

            // コールバック実行
            if (this.options.onPermissionDenied) {
                this.options.onPermissionDenied(error);
            }

            throw error;
        }
    }

    /**
     * ステップ2: PitchProインスタンスを作成・初期化
     */
    async initializePitchPro() {
        this.log('ステップ2: PitchProインスタンス初期化中...');

        try {
            // GlobalAudioManagerが存在するか確認
            if (!window.globalAudioManager) {
                throw new Error('GlobalAudioManagerが利用できません');
            }

            // 既に初期化済みの場合はスキップ
            if (this.pitchProInstance && this.isInitialized) {
                this.log('PitchProは既に初期化済みです', 'success');
                return this.pitchProInstance;
            }

            // PitchProインスタンス取得
            this.pitchProInstance = await window.globalAudioManager.getInstance();

            if (!this.pitchProInstance) {
                throw new Error('PitchProインスタンスの取得に失敗しました');
            }

            this.isInitialized = true;
            this.log('PitchProインスタンス初期化完了', 'success');
            this.log(`インスタンスタイプ: ${this.pitchProInstance.constructor.name}`);

            // コールバック実行
            if (this.options.onPitchProReady) {
                this.options.onPitchProReady(this.pitchProInstance);
            }

            return this.pitchProInstance;

        } catch (error) {
            this.isInitialized = false;
            this.log(`PitchPro初期化エラー: ${error.message}`, 'error');

            if (this.options.onError) {
                this.options.onError(error);
            }

            throw error;
        }
    }

    /**
     * 完全な初期化プロセス（2段階アプローチ）
     * ユーザー操作（ボタンクリック等）から呼び出すこと
     */
    async initialize() {
        this.log('完全初期化プロセス開始');

        try {
            // ステップ1: マイク許可取得
            await this.requestMicPermission();

            // ステップ2: PitchPro初期化
            const pitchPro = await this.initializePitchPro();

            this.log('✅ 完全初期化成功！', 'success');
            return {
                stream: this.stream,
                pitchPro: pitchPro,
                isReady: true
            };

        } catch (error) {
            this.log(`初期化失敗: ${error.message}`, 'error');
            throw error;
        }
    }

    /**
     * UIセレクターを設定
     */
    setUISelectors(selectors) {
        if (!this.pitchProInstance) {
            this.log('PitchProインスタンスが未初期化です', 'warning');
            return false;
        }

        if (this.pitchProInstance.updateSelectors) {
            this.pitchProInstance.updateSelectors(selectors);
            this.log('UIセレクター設定完了', 'success');
            return true;
        }

        this.log('updateSelectorsメソッドが利用できません', 'warning');
        return false;
    }

    /**
     * 音声検出を開始
     */
    async startDetection() {
        if (!this.pitchProInstance) {
            throw new Error('PitchProインスタンスが初期化されていません');
        }

        this.log('音声検出開始中...');
        await this.pitchProInstance.startDetection();
        this.log('音声検出開始成功', 'success');
    }

    /**
     * 音声検出を停止
     */
    async stopDetection() {
        if (!this.pitchProInstance) {
            this.log('PitchProインスタンスが未初期化です', 'warning');
            return;
        }

        this.log('音声検出停止中...');
        await this.pitchProInstance.stopDetection();
        this.log('音声検出停止完了', 'success');
    }

    /**
     * コールバックを設定
     */
    setCallbacks(callbacks) {
        if (!this.pitchProInstance) {
            this.log('PitchProインスタンスが未初期化です', 'warning');
            return false;
        }

        if (this.pitchProInstance.setCallbacks) {
            this.pitchProInstance.setCallbacks(callbacks);
            this.log('コールバック設定完了', 'success');
            return true;
        }

        return false;
    }

    /**
     * リソースを解放
     */
    async cleanup() {
        this.log('リソース解放中...');

        // 音声検出停止とPitchProインスタンスの破棄
        if (this.pitchProInstance) {
            try {
                await this.stopDetection();

                // PitchProインスタンスのdestroyメソッドが存在する場合は呼び出す
                if (typeof this.pitchProInstance.destroy === 'function') {
                    await this.pitchProInstance.destroy();
                    this.log('PitchProインスタンスを破棄しました', 'success');
                }
            } catch (error) {
                this.log(`PitchPro破棄中のエラー: ${error.message}`, 'warning');
            }

            this.pitchProInstance = null;
        }

        // ストリーム停止
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
            this.log('オーディオストリームを停止しました', 'success');
        }

        // 状態リセット
        this.isPermissionGranted = false;
        this.isInitialized = false;

        this.log('リソース解放完了', 'success');
    }

    /**
     * 現在の状態を取得
     */
    getStatus() {
        return {
            isPermissionGranted: this.isPermissionGranted,
            isInitialized: this.isInitialized,
            hasPitchProInstance: !!this.pitchProInstance,
            hasStream: !!this.stream
        };
    }

    /**
     * 使用準備ができているかチェック
     */
    isReady() {
        return this.isPermissionGranted && this.isInitialized && !!this.pitchProInstance;
    }

    /**
     * 簡単な初期化ヘルパー（コールバック不要版）
     * 基本的な使用ケース向け
     */
    static async createAndInitialize(options = {}) {
        const manager = new MicPermissionManager({
            debugMode: options.debugMode || true,
            ...options
        });

        await manager.initialize();
        return manager;
    }
}

// グローバルに公開
if (typeof window !== 'undefined') {
    window.MicPermissionManager = MicPermissionManager;
    console.log('🎤 MicPermissionManager: コンポーネント登録完了');
}