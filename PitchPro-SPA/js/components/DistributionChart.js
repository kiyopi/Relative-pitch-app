/**
 * DistributionChart Component
 *
 * @description
 * 評価分布を統一的に表示するコンポーネント。
 * セッション評価・総合評価・トレーニング記録の3ページで共通使用。
 *
 * @version 1.0.0
 * @date 2025-11-15
 *
 * @features
 * - 評価分布計算（Excellent/Good/Pass/Practice）
 * - 改善トレンド計算（過去1週間 vs 全体平均）
 * - アニメーション付きプログレスバー
 * - Lucideアイコン統合
 *
 * @dependencies
 * - window.EvaluationCalculator（評価計算）
 * - window.initializeLucideIcons（アイコン初期化）
 * - base.css（スタイル）
 */

class DistributionChart {
    /**
     * 評価分布を計算
     *
     * @param {Array} sessionData - セッションデータ配列
     * @returns {Object} 評価分布オブジェクト
     */
    static calculateDistribution(sessionData) {
        const distribution = {
            excellent: 0,
            good: 0,
            pass: 0,
            practice: 0,
            total: 0
        };

        if (!sessionData || sessionData.length === 0) {
            return distribution;
        }

        sessionData.forEach(session => {
            if (!session.pitchErrors || !Array.isArray(session.pitchErrors)) {
                return;
            }

            session.pitchErrors.forEach(error => {
                const absError = Math.abs(error.errorInCents);

                // 800¢超は評価分布から除外（測定エラーとして扱う）
                if (absError > 800) {
                    return;
                }

                distribution.total++;

                const evaluation = window.EvaluationCalculator.evaluatePitchError(absError);
                distribution[evaluation.level]++;
            });
        });

        return distribution;
    }

    /**
     * 改善トレンドを計算
     *
     * @param {Array} allSessions - 全セッションデータ
     * @param {string} period - 期間（'week' or 'month'）
     * @returns {Object|null} トレンドオブジェクト（データ不足時はnull）
     */
    static calculateTrend(allSessions, period = 'week') {
        if (!allSessions || allSessions.length === 0) {
            return null;
        }

        const now = Date.now();
        const periodMs = period === 'week' ? 7 * 24 * 60 * 60 * 1000 : 30 * 24 * 60 * 60 * 1000;
        const cutoff = now - periodMs;

        // 全体の分布計算
        const allDistribution = this.calculateDistribution(allSessions);

        // 期間内のセッションフィルタリング
        const recentSessions = allSessions.filter(s => s.startTime >= cutoff);

        if (recentSessions.length === 0) {
            return null;
        }

        const recentDistribution = this.calculateDistribution(recentSessions);

        // A以上（Excellent + Good）の獲得率計算
        const allExcellentGoodRate = allDistribution.total > 0
            ? ((allDistribution.excellent + allDistribution.good) / allDistribution.total * 100)
            : 0;

        const recentExcellentGoodRate = recentDistribution.total > 0
            ? ((recentDistribution.excellent + recentDistribution.good) / recentDistribution.total * 100)
            : 0;

        const rateChange = recentExcellentGoodRate - allExcellentGoodRate;

        // Practice数の変化（期待値との差分）
        const expectedPracticeCount = allDistribution.total > 0
            ? Math.round((allDistribution.practice / allDistribution.total) * recentDistribution.total)
            : 0;
        const practiceChange = recentDistribution.practice - expectedPracticeCount;

        return {
            excellentGoodRate: Math.round(recentExcellentGoodRate * 10) / 10, // 小数点第1位
            rateChange: Math.round(rateChange * 10) / 10,
            practiceCount: recentDistribution.practice,
            practiceChange,
            trend: rateChange > 0 ? 'improving' : rateChange < 0 ? 'declining' : 'stable',
            periodLabel: period === 'week' ? '過去1週間' : '過去1ヶ月',
            recentSessionCount: recentSessions.length
        };
    }

    /**
     * HTMLを生成
     *
     * @param {Object} distribution - 評価分布
     * @param {Object|null} trend - トレンドデータ
     * @param {boolean} showDescription - 説明文表示
     * @param {boolean} animate - アニメーション有効化
     * @param {boolean} showHelpButton - ヘルプボタン表示
     * @param {string} containerId - コンテナID（ポップオーバーID生成用）
     * @returns {string} HTML文字列
     */
    static generateHTML(distribution, trend, showDescription, animate, showHelpButton, containerId) {
        const total = distribution.total;

        if (total === 0) {
            return `
                <div class="flex flex-col items-center gap-3 py-8">
                    <i data-lucide="inbox" class="text-white-40" style="width: 48px; height: 48px;"></i>
                    <p class="text-white-60">まだ評価データがありません</p>
                </div>
            `;
        }

        // 各評価の割合計算
        const excellentPercent = (distribution.excellent / total * 100).toFixed(1);
        const goodPercent = (distribution.good / total * 100).toFixed(1);
        const passPercent = (distribution.pass / total * 100).toFixed(1);
        const practicePercent = (distribution.practice / total * 100).toFixed(1);

        // トレンドメッセージ生成
        let trendHTML = '';
        if (trend) {
            const trendIcon = trend.trend === 'improving' ? 'trending-up' : trend.trend === 'declining' ? 'trending-down' : 'minus';
            const trendColor = trend.trend === 'improving' ? 'text-green-300' : trend.trend === 'declining' ? 'text-orange-300' : 'text-blue-300';
            const trendSymbol = trend.rateChange > 0 ? '+' : '';

            trendHTML = `
                <div class="trend-card mt-4">
                    <div class="flex items-center gap-2">
                        <i data-lucide="${trendIcon}" class="${trendColor}" style="width: 20px; height: 20px; flex-shrink: 0;"></i>
                        <div class="flex-1">
                            <div class="text-sm text-white-80">${trend.periodLabel}の改善トレンド</div>
                            <div class="text-xs text-white-60">A以上獲得率 ${trendSymbol}${trend.rateChange}%</div>
                        </div>
                    </div>
                </div>
            `;
        }

        return `
            ${showDescription ? '<p class="text-sm text-white-60 mb-4">全セッションの各音の精度評価を集計した分布です。Excellentが多いほど高精度です。</p>' : ''}

            <!-- 評価分布バー -->
            <div class="flex flex-col gap-3">
                <!-- Excellent -->
                <div class="flex items-center gap-3">
                    <i data-lucide="trophy" class="text-yellow-300" style="width: 20px; height: 20px; flex-shrink: 0;"></i>
                    <div class="progress-bar flex">
                        <div class="distribution-bar progress-fill-custom color-eval-gold" ${animate ? `data-width="${excellentPercent}" style="width: 0%;"` : `style="width: ${excellentPercent}%;"`}></div>
                    </div>
                    <span class="text-sm text-white-60" style="min-width: 40px; text-align: right;">${distribution.excellent}</span>
                </div>

                <!-- Good -->
                <div class="flex items-center gap-3">
                    <i data-lucide="star" class="text-green-300" style="width: 20px; height: 20px; flex-shrink: 0;"></i>
                    <div class="progress-bar flex">
                        <div class="distribution-bar progress-fill-custom color-eval-good" ${animate ? `data-width="${goodPercent}" style="width: 0%;"` : `style="width: ${goodPercent}%;"`}></div>
                    </div>
                    <span class="text-sm text-white-60" style="min-width: 40px; text-align: right;">${distribution.good}</span>
                </div>

                <!-- Pass -->
                <div class="flex items-center gap-3">
                    <i data-lucide="thumbs-up" class="text-blue-300" style="width: 20px; height: 20px; flex-shrink: 0;"></i>
                    <div class="progress-bar flex">
                        <div class="distribution-bar progress-fill-custom color-eval-pass" ${animate ? `data-width="${passPercent}" style="width: 0%;"` : `style="width: ${passPercent}%;"`}></div>
                    </div>
                    <span class="text-sm text-white-60" style="min-width: 40px; text-align: right;">${distribution.pass}</span>
                </div>

                <!-- Practice -->
                <div class="flex items-center gap-3">
                    <i data-lucide="alert-triangle" class="text-red-300" style="width: 20px; height: 20px; flex-shrink: 0;"></i>
                    <div class="progress-bar flex">
                        <div class="distribution-bar progress-fill-custom color-eval-practice" ${animate ? `data-width="${practicePercent}" style="width: 0%;"` : `style="width: ${practicePercent}%;"`}></div>
                    </div>
                    <span class="text-sm text-white-60" style="min-width: 40px; text-align: right;">${distribution.practice}</span>
                </div>
            </div>

            ${trendHTML}
        `;
    }

    /**
     * 評価分布をレンダリング
     *
     * @param {Object} options - オプション
     * @param {string} options.containerId - コンテナ要素のID
     * @param {Array} options.sessionData - セッションデータ配列
     * @param {boolean} [options.showTrend=false] - トレンド表示
     * @param {string} [options.trendPeriod='week'] - トレンド期間
     * @param {boolean} [options.animate=true] - アニメーション有効化
     * @param {boolean} [options.showDescription=true] - 説明文表示
     * @param {boolean} [options.showHelpButton=false] - ヘルプボタン表示
     */
    static render(options) {
        const {
            containerId,
            sessionData,
            showTrend = false,
            trendPeriod = 'week',
            animate = true,
            showDescription = true,
            showHelpButton = false
        } = options;

        const container = document.getElementById(containerId);
        if (!container) {
            console.error(`[DistributionChart] コンテナが見つかりません: ${containerId}`);
            return;
        }

        // 分布計算
        const distribution = this.calculateDistribution(sessionData);

        // トレンド計算
        const trend = showTrend ? this.calculateTrend(sessionData, trendPeriod) : null;

        // HTML生成
        const html = this.generateHTML(distribution, trend, showDescription, animate, showHelpButton, containerId);

        // レンダリング
        container.innerHTML = html;

        // ポップオーバーをbody直下に追加（ヘルプボタン有効時のみ）
        if (showHelpButton) {
            const popoverId = `${containerId}-popover`;

            // 既存のポップオーバーを削除
            const existingPopover = document.getElementById(popoverId);
            if (existingPopover) {
                existingPopover.remove();
            }

            // 新しいポップオーバーを追加
            const popoverHTML = this.generateEvaluationPopoverHTML(popoverId);
            document.body.insertAdjacentHTML('beforeend', popoverHTML);
        }

        // アニメーション実行
        if (animate && distribution.total > 0) {
            this.animateBars(container);
        }

        // Lucideアイコン初期化
        if (typeof window.initializeLucideIcons === 'function') {
            window.initializeLucideIcons({ immediate: true });
        }

        console.log(`✅ [DistributionChart] レンダリング完了: ${distribution.total}件の評価データ`);
    }

    /**
     * プログレスバーをアニメーション
     *
     * @param {HTMLElement} container - コンテナ要素
     */
    static animateBars(container) {
        requestAnimationFrame(() => {
            const bars = container.querySelectorAll('.distribution-bar');
            bars.forEach(bar => {
                const targetWidth = bar.getAttribute('data-width');
                if (targetWidth !== null) {
                    bar.style.transition = 'width 0.8s ease-out';
                    bar.style.width = targetWidth + '%';
                }
            });
        });
    }

    /**
     * ヘルプボタンHTMLを生成（内部使用）
     *
     * @param {string} popoverId - ポップオーバーID
     * @returns {string} ヘルプボタンHTML
     */
    static generateHelpButtonHTML(popoverId) {
        return `
            <button class="help-icon-btn-inline" onclick="window.DistributionChart.togglePopover('${popoverId}')">
                <i data-lucide="help-circle" style="width: 16px; height: 16px;"></i>
            </button>
        `;
    }

    /**
     * ヘルプボタンHTMLを取得（外部使用 - 見出し行に配置用）
     *
     * @param {string} containerId - コンテナID
     * @returns {string} ヘルプボタンHTML
     */
    static getHelpButton(containerId) {
        return this.generateHelpButtonHTML(`${containerId}-popover`);
    }

    /**
     * 精度評価ランク説明ポップオーバーHTMLを生成
     *
     * @param {string} popoverId - ポップオーバーID
     * @returns {string} ポップオーバーHTML
     */
    static generateEvaluationPopoverHTML(popoverId) {
        return `
            <div id="${popoverId}" class="rank-popover">
                <button class="popover-close-btn" onclick="window.DistributionChart.togglePopover('${popoverId}')">
                    <i data-lucide="x" class="icon-help"></i>
                </button>
                <h4 class="popover-title">精度ランク</h4>

                <div class="rank-item">
                    <i data-lucide="trophy" class="text-yellow-300 icon-md flex-shrink-0"></i>
                    <div>
                        <div class="rank-name rank-name-excellent">Excellent</div>
                        <div class="rank-range">±20セント以内</div>
                    </div>
                </div>

                <div class="rank-item">
                    <i data-lucide="star" class="text-green-300 icon-md flex-shrink-0"></i>
                    <div>
                        <div class="rank-name rank-name-good">Good</div>
                        <div class="rank-range">±35セント以内</div>
                    </div>
                </div>

                <div class="rank-item">
                    <i data-lucide="thumbs-up" class="text-blue-300 icon-md flex-shrink-0"></i>
                    <div>
                        <div class="rank-name rank-name-pass">Pass</div>
                        <div class="rank-range">±50セント以内</div>
                    </div>
                </div>

                <div class="rank-item">
                    <i data-lucide="alert-triangle" class="text-red-300 icon-md flex-shrink-0"></i>
                    <div>
                        <div class="rank-name rank-name-practice">Practice</div>
                        <div class="rank-range">50セント以上</div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * ポップオーバーの表示切り替え
     *
     * @param {string} popoverId - ポップオーバーID
     */
    static togglePopover(popoverId) {
        const popover = document.getElementById(popoverId);
        if (!popover) {
            console.error(`[DistributionChart] ポップオーバーが見つかりません: ${popoverId}`);
            return;
        }

        popover.classList.toggle('show');

        // Lucideアイコン再初期化
        if (typeof window.initializeLucideIcons === 'function') {
            window.initializeLucideIcons({ immediate: true });
        }
    }
}

// グローバルエクスポート
window.DistributionChart = DistributionChart;
