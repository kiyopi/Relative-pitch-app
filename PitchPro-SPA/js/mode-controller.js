/**
 * モード管理統合コントローラー
 * @version 2.1.0
 * @description 全トレーニングモードの定義と設定を一元管理
 *
 * 【責任範囲】
 * - モード定義の一元管理
 * - セッション数の動的計算
 * - モード名の統一管理
 * - 方向別表示名の管理（12音階モード） ★v2.1.0追加
 * - 基音選択方式の定義
 * - UI表示（アイコン・色・タイトル）の統一管理 ★v2.0.0追加
 * - 1セッション標準時間の定義 ★v2.0.1追加
 *
 * 【使用箇所】
 * - trainingController.js: トレーニング実行
 * - records-controller.js: レッスングループ化、総トレーニング時間計算 ★v2.0.1更新
 * - session-data-recorder.js: セッションデータ保存
 * - results-overview-controller.js: 総合評価ページ ★v2.0.0追加
 * - preparation-pitchpro-cycle.js: 準備ページサブタイトル表示 ★v2.1.0追加
 *
 * 【変更履歴】
 * v2.1.0 (2025-11-18): getDisplayName()メソッド追加
 *                      12音階モードの方向別表示名を一元管理（上昇/下降/両方向）
 * v2.0.1 (2025-11-16): standardDurationPerSession追加（全モード13秒）
 *                      純粋なトレーニング時間（基音2.5s+ガイド5.3s+発声5.6s）のみカウント
 * v2.0.0 (2025-11-14): UI色設定追加（アイコン背景・サブタイトル色）
 */

const ModeController = {
    /**
     * モード定義マスターデータ
     */
    modes: {
        'random': {
            id: 'random',
            name: 'ランダム基音モード',
            shortName: 'ランダム基音',
            description: '音域内ランダム基音、連続重複なし',
            sessionsPerLesson: 8,
            baseNoteSelection: 'random_c3_octave',
            hasIndividualResults: true,
            hasRangeAdjustment: false,
            difficulty: 'beginner',
            icon: 'shuffle',
            // 1セッションの標準時間（秒）: 基音2.5s + ガイド5.3s + 発声5.6s = 13.4s
            standardDurationPerSession: 13,
            // UI色設定（ホームページのmode-iconと統一）
            colors: {
                iconBg: 'gradient-catalog-green',
                subtitle: 'text-green-200'
            }
        },
        'continuous': {
            id: 'continuous',
            name: '連続チャレンジモード',
            shortName: '連続チャレンジ',
            description: 'クロマチック12音、連続重複防止',
            sessionsPerLesson: 12,
            baseNoteSelection: 'random_chromatic',
            hasIndividualResults: false,
            hasRangeAdjustment: false,
            difficulty: 'intermediate',
            icon: 'zap',
            // 1セッションの標準時間（秒）: 基音2.5s + ガイド5.3s + 発声5.6s = 13.4s
            standardDurationPerSession: 13,
            colors: {
                iconBg: 'gradient-catalog-orange',
                subtitle: 'text-orange-200'
            }
        },
        '12tone': {
            id: '12tone',
            name: '12音階モード',
            shortName: '12音階',
            description: '12音階順次使用（上昇/下降/両方向）',
            // セッション数は方向性で動的に決定
            sessionsPerLesson: (options = {}) => {
                if (options.direction === 'both') return 24;
                return 12; // ascending or descending
            },
            baseNoteSelection: 'sequential_chromatic',
            hasIndividualResults: false,
            hasRangeAdjustment: true,
            difficulty: 'advanced',
            icon: 'music',
            // 1セッションの標準時間（秒）: 基音2.5s + ガイド5.3s + 発声5.6s = 13.4s
            standardDurationPerSession: 13,
            colors: {
                iconBg: 'gradient-catalog-purple',
                subtitle: 'text-purple-200'
            },
            // 12音階モード専用オプション
            directions: {
                'ascending': { name: '上昇', sessions: 12 },
                'descending': { name: '下降', sessions: 12 },
                'both': { name: '両方向', sessions: 24 }
            }
        },
        // 将来の拡張用（コメントアウト）
        // 'chromatic': {
        //     id: 'chromatic',
        //     name: '12音階モード',
        //     shortName: '12音階',
        //     description: '旧名称（互換性のため残す）',
        //     sessionsPerLesson: 12,
        //     baseNoteSelection: 'sequential_chromatic',
        //     hasIndividualResults: false,
        //     hasRangeAdjustment: true,
        //     difficulty: 'advanced',
        //     icon: 'music',
        //     deprecated: true,
        //     replacedBy: '12tone'
        // }
    },

    /**
     * モード設定を取得
     * @param {string} modeId - モードID
     * @returns {object} モード設定オブジェクト
     */
    getMode(modeId) {
        const mode = this.modes[modeId];
        if (!mode) {
            console.warn(`⚠️ 未知のモードID: ${modeId}`);
            return this.modes['random']; // デフォルト
        }
        return mode;
    },

    /**
     * セッション数を取得（動的計算対応）
     * @param {string} modeId - モードID
     * @param {object} options - オプション設定（direction等）
     * @returns {number} セッション数
     */
    getSessionsPerLesson(modeId, options = {}) {
        const mode = this.getMode(modeId);

        if (typeof mode.sessionsPerLesson === 'function') {
            return mode.sessionsPerLesson(options);
        }

        return mode.sessionsPerLesson;
    },

    /**
     * モード名を取得
     * @param {string} modeId - モードID
     * @param {boolean} useShortName - 短縮名を使用するか
     * @returns {string} モード名
     */
    getModeName(modeId, useShortName = false) {
        const mode = this.getMode(modeId);
        return useShortName ? mode.shortName : mode.name;
    },

    /**
     * モード表示名を取得（方向パラメータ対応）
     * @param {string} modeId - モードID
     * @param {object} options - オプション設定（direction等）
     * @returns {string} 表示名
     */
    getDisplayName(modeId, options = {}) {
        const mode = this.getMode(modeId);

        // 12音階モードの場合は方向別の表示名を返す
        if (modeId === '12tone' && options.direction && mode.directions) {
            const directionInfo = mode.directions[options.direction];
            if (directionInfo) {
                return `12音階${directionInfo.name}モード`;
            }
        }

        // その他のモードは通常のモード名を返す
        return mode.name;
    },

    /**
     * trainingController用のmodeConfig形式に変換
     * @returns {object} modeConfig形式のオブジェクト
     */
    toTrainingConfig() {
        const config = {};

        Object.keys(this.modes).forEach(modeId => {
            const mode = this.modes[modeId];

            config[modeId] = {
                maxSessions: typeof mode.sessionsPerLesson === 'function'
                    ? 12 // デフォルト値（動的に変更される）
                    : mode.sessionsPerLesson,
                title: mode.name,
                hasIndividualResults: mode.hasIndividualResults,
                baseNoteSelection: mode.baseNoteSelection,
                hasRangeAdjustment: mode.hasRangeAdjustment || false
            };
        });

        return config;
    },

    /**
     * セッションデータから方向性を抽出
     * @param {array} sessions - セッション配列
     * @returns {string|null} 方向性（'ascending', 'descending', 'both'）
     */
    extractDirection(sessions) {
        if (!sessions || sessions.length === 0) return null;

        const firstSession = sessions[0];
        return firstSession.direction || null;
    },

    /**
     * 全モードのリストを取得
     * @param {object} filters - フィルター条件
     * @returns {array} モード配列
     */
    getAllModes(filters = {}) {
        let modes = Object.values(this.modes);

        // 非推奨モードを除外
        if (filters.excludeDeprecated) {
            modes = modes.filter(m => !m.deprecated);
        }

        // 難易度でフィルター
        if (filters.difficulty) {
            modes = modes.filter(m => m.difficulty === filters.difficulty);
        }

        return modes;
    },

    /**
     * ページタイトルを生成
     * @param {string} modeId - モードID
     * @param {object} options - オプション設定
     * @param {string} options.chromaticDirection - 基音方向（12音階モード専用: 'ascending', 'descending', 'both'）
     * @param {string} options.scaleDirection - 音階方向（'ascending', 'descending'）
     * @returns {string} 完全なページタイトル
     */
    generatePageTitle(modeId, options = {}) {
        const mode = this.getMode(modeId);
        let titleText = mode.name;

        const scaleDirection = options.scaleDirection || 'ascending';
        const scaleDirectionLabel = scaleDirection === 'ascending' ? '上行' : '下行';

        // 12音階モードの場合、基音方向も追加
        if (modeId === '12tone' && options.chromaticDirection) {
            const chromaticDirectionLabels = {
                'ascending': '上昇',
                'descending': '下降',
                'both': '両方向'
            };
            const chromaticLabel = chromaticDirectionLabels[options.chromaticDirection] || '';
            titleText += ` ${chromaticLabel}・${scaleDirectionLabel}`;
        } else {
            // ランダム基音・連続チャレンジモードの場合、音階方向のみ
            titleText += ` ${scaleDirectionLabel}`;
        }

        return titleText;
    },

    /**
     * ページヘッダーUIを更新（アイコン・色・タイトル・サブタイトル）
     * @param {string} modeId - モードID
     * @param {object} options - オプション設定
     * @param {string} options.chromaticDirection - 基音方向（12音階モード専用）
     * @param {string} options.scaleDirection - 音階方向
     * @param {string} options.subtitleText - サブタイトルテキスト（省略時は更新しない）
     * @returns {boolean} 更新成功可否
     */
    updatePageHeader(modeId, options = {}) {
        console.log(`🎨 [ModeController] ページヘッダー更新: ${modeId}`, options);

        const mode = this.getMode(modeId);

        // アイコン背景色を更新
        const iconWrapper = document.querySelector('.page-header-icon');
        if (iconWrapper) {
            // 既存のグラデーションクラスを削除
            iconWrapper.classList.remove('gradient-catalog-green', 'gradient-catalog-orange', 'gradient-catalog-purple');
            // 新しいグラデーションクラスを追加
            iconWrapper.classList.add(mode.colors.iconBg);
            console.log(`✅ アイコン背景色更新: ${mode.colors.iconBg}`);
        }

        // アイコンを更新（統一関数を使用）
        if (iconWrapper && typeof window.updateLucideIcon === 'function') {
            window.updateLucideIcon(iconWrapper, mode.icon);
        } else {
            console.warn('⚠️ updateLucideIcon関数が見つかりません');
        }

        // ページタイトルを更新
        const pageTitle = document.getElementById('training-mode-title') || document.querySelector('.page-title');
        if (pageTitle) {
            const titleText = this.generatePageTitle(modeId, options);
            pageTitle.textContent = titleText;
            console.log(`✅ タイトル更新: ${titleText}`);
        }

        // サブタイトルの色を更新
        const pageSubtitle = document.querySelector('.page-subtitle');
        if (pageSubtitle) {
            // 既存の色クラスを削除
            pageSubtitle.classList.remove('text-green-200', 'text-orange-200', 'text-purple-200');
            // 新しい色クラスを追加
            pageSubtitle.classList.add(mode.colors.subtitle);
            console.log(`✅ サブタイトル色更新: ${mode.colors.subtitle}`);

            // サブタイトルテキストが指定されている場合は更新
            if (options.subtitleText) {
                pageSubtitle.textContent = options.subtitleText;
                console.log(`✅ サブタイトルテキスト更新: ${options.subtitleText}`);
            }
        }

        // Lucideアイコンは updateLucideIcon() 内で自動的に再初期化される
        return true;
    }
};

// グローバルに公開
window.ModeController = ModeController;

console.log('✅ ModeController初期化完了');
console.log('📋 登録モード:', Object.keys(ModeController.modes).join(', '));
