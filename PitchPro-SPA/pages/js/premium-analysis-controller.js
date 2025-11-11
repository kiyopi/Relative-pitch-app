/**
 * premium-analysis-controller.js
 * プレミアム分析ページコントローラー
 * Version: 1.0.0
 *
 * 【責任範囲】
 * - セッションデータの読み込みとフィルタリング
 * - 4タブ（音程精度・エラーパターン・練習プラン・成長記録）のUI更新
 * - タブ切り替え機能
 * - Lucideアイコン初期化
 *
 * 【依存関係】
 * - DataManager: セッションデータ取得
 * - PremiumAnalysisCalculator: 分析計算ロジック
 * - window.initializeLucideIcons: アイコン初期化
 */

console.log('🚀 [premium-analysis-controller] Script loaded');

/**
 * プレミアム分析ページの初期化
 */
window.initPremiumAnalysis = async function() {
    console.log('📊 プレミアム分析ページ初期化開始');

    // DataManagerから全セッションデータを取得
    const allSessionData = loadAllSessionDataForPremium();

    if (!allSessionData || allSessionData.length === 0) {
        console.warn('⚠️ セッションデータが見つかりません');
        showNoDataMessage();
        return;
    }

    // URLパラメータからモードを取得
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash.split('?')[1] || '');
    const currentMode = params.get('mode') || 'continuous';

    // 現在のモードのセッションのみフィルタリング
    const sessionData = allSessionData.filter(s => s.mode === currentMode);
    console.log(`✅ セッションデータ取得: ${currentMode}モード=${sessionData.length}セッション`);

    if (sessionData.length === 0) {
        console.warn(`⚠️ ${currentMode}モードのセッションデータが見つかりません`);
        showNoDataMessage();
        return;
    }

    // 分析計算の実行
    console.log('🔢 分析計算開始...');
    const intervalAccuracy = window.PremiumAnalysisCalculator.calculateIntervalAccuracy(sessionData);
    const brainProcessing = window.PremiumAnalysisCalculator.calculateBrainProcessingPattern(sessionData);
    const errorPatterns = window.PremiumAnalysisCalculator.calculateErrorPatterns(sessionData);
    const growthRecords = window.PremiumAnalysisCalculator.calculateGrowthRecords(sessionData);
    const practicePlan = window.PremiumAnalysisCalculator.generatePracticePlan(
        intervalAccuracy,
        errorPatterns,
        growthRecords
    );
    const modeAnalysis = window.PremiumAnalysisCalculator.calculateModeAnalysis(allSessionData);

    console.log('✅ 分析計算完了:', {
        intervalAccuracy,
        brainProcessing,
        errorPatterns,
        growthRecords,
        practicePlan,
        modeAnalysis
    });

    // UI更新
    updateTab1UI(intervalAccuracy, brainProcessing);
    updateTab2UI(errorPatterns);
    updateTab3UI(practicePlan);
    updateTab4UI(growthRecords);
    updateModeAnalysisUI(modeAnalysis);

    // タブ切り替え機能の初期化
    initTabSwitching();

    // Lucideアイコン再初期化
    if (typeof window.initializeLucideIcons === 'function') {
        window.initializeLucideIcons({ immediate: true });
    }

    console.log('✅ プレミアム分析ページ初期化完了');
};

/**
 * Tab 1: 音程精度分析のUI更新
 */
function updateTab1UI(data, brainProcessing) {
    if (!data) return;

    // 平均音程精度
    const avgElement = document.getElementById('average-accuracy');
    if (avgElement) {
        avgElement.textContent = `±${data.averageError}¢`;
        avgElement.style.color = data.averageError < 30 ? '#10b981' : data.averageError < 50 ? '#f59e0b' : '#ef4444';
    }

    // データポイント数
    const totalElement = document.getElementById('total-data-points');
    if (totalElement) {
        totalElement.textContent = data.totalDataPoints;
    }

    // 音程間隔別精度
    const listElement = document.getElementById('interval-accuracy-list');
    if (listElement && data.intervalAccuracy) {
        listElement.innerHTML = '';
        Object.entries(data.intervalAccuracy).forEach(([interval, accuracy]) => {
            const percentage = Math.min((accuracy / 100) * 100, 100);
            const color = accuracy < 30 ? '#10b981' : accuracy < 50 ? '#f59e0b' : '#ef4444';

            listElement.innerHTML += `
                <div class="flex items-center gap-3">
                    <div style="color: white; font-weight: 600; min-width: 40px; font-size: 1rem;">
                        ${interval}度
                    </div>
                    <div class="progress-bar flex">
                        <div class="progress-fill-custom" style="width: ${percentage}%; background: ${color};"></div>
                    </div>
                    <span style="color: #cbd5e1; min-width: 60px; text-align: right; font-size: 0.875rem;">
                        ±${accuracy.toFixed(1)}¢
                    </span>
                </div>
            `;
        });
    }

    // 脳内処理パターン分析
    updateBrainProcessingUI(brainProcessing);
}

/**
 * 脳内処理パターン分析のUI更新
 */
function updateBrainProcessingUI(data) {
    if (!data) {
        console.warn('⚠️ 脳内処理パターン分析データがありません');
        return;
    }

    // 左脳処理音
    const leftBrainAvgElement = document.getElementById('left-brain-avg');
    const leftBrainProgressElement = document.getElementById('left-brain-progress');
    const leftBrainCountElement = document.getElementById('left-brain-count');

    if (leftBrainAvgElement && data.leftBrain) {
        leftBrainAvgElement.textContent = `±${data.leftBrain.avgError}¢`;
        leftBrainAvgElement.style.color = data.leftBrain.avgError < 30 ? '#10b981' : data.leftBrain.avgError < 50 ? '#f59e0b' : '#ef4444';
    }

    if (leftBrainProgressElement && data.leftBrain) {
        const percentage = Math.max(0, 100 - data.leftBrain.avgError);
        leftBrainProgressElement.style.width = `${percentage}%`;
    }

    if (leftBrainCountElement && data.leftBrain) {
        leftBrainCountElement.textContent = `測定回数: ${data.leftBrain.count}`;
    }

    // 両脳処理音
    const bothBrainAvgElement = document.getElementById('both-brain-avg');
    const bothBrainProgressElement = document.getElementById('both-brain-progress');
    const bothBrainCountElement = document.getElementById('both-brain-count');

    if (bothBrainAvgElement && data.bothBrain) {
        bothBrainAvgElement.textContent = `±${data.bothBrain.avgError}¢`;
        bothBrainAvgElement.style.color = data.bothBrain.avgError < 30 ? '#10b981' : data.bothBrain.avgError < 50 ? '#f59e0b' : '#ef4444';
    }

    if (bothBrainProgressElement && data.bothBrain) {
        const percentage = Math.max(0, 100 - data.bothBrain.avgError);
        bothBrainProgressElement.style.width = `${percentage}%`;
    }

    if (bothBrainCountElement && data.bothBrain) {
        bothBrainCountElement.textContent = `測定回数: ${data.bothBrain.count}`;
    }

    // 処理難易度の差
    const difficultyValueElement = document.getElementById('brain-difficulty-value');
    const difficultyAnalysisElement = document.getElementById('brain-difficulty-analysis');

    if (difficultyValueElement && data.difficulty) {
        const { difference, percentage, isHarder } = data.difficulty;
        const sign = isHarder ? '+' : '';
        difficultyValueElement.textContent = `両脳処理音は左脳処理音より ${sign}${difference}¢ (${percentage.toFixed(0)}%) ${isHarder ? '難しい' : '同等'}`;
        difficultyValueElement.style.color = isHarder ? '#f59e0b' : '#10b981';
    }

    if (difficultyAnalysisElement && data.difficulty) {
        difficultyAnalysisElement.textContent = data.difficulty.analysis;
    }

    // 両脳処理音の詳細分析
    const notesDetailListElement = document.getElementById('brain-notes-detail-list');
    if (notesDetailListElement && data.bothBrain && data.bothBrain.noteStats) {
        notesDetailListElement.innerHTML = '';

        const notes = ['G', 'G#', 'A', 'B♭', 'B'];
        notes.forEach(note => {
            const stats = data.bothBrain.noteStats[note];
            if (!stats || stats.count === 0) return;

            const avgError = stats.avgError.toFixed(1);
            const percentage = Math.max(0, 100 - stats.avgError);
            const color = stats.avgError < 30 ? '#10b981' : stats.avgError < 50 ? '#f59e0b' : '#ef4444';

            notesDetailListElement.innerHTML += `
                <div class="brain-notes-detail-item">
                    <span class="brain-notes-detail-note">${note}:</span>
                    <div class="progress-bar" style="flex: 1;">
                        <div class="progress-fill-custom" style="width: ${percentage}%; background: ${color};"></div>
                    </div>
                    <span class="brain-notes-detail-value" style="color: ${color};">±${avgError}¢</span>
                </div>
            `;
        });
    }

    console.log('✅ 脳内処理パターン分析UI更新完了');
}

/**
 * Tab 2: エラーパターン分析のUI更新
 */
function updateTab2UI(data) {
    if (!data) return;

    // シャープ・フラット傾向
    const sharpPercentElement = document.getElementById('sharp-percentage');
    if (sharpPercentElement) {
        sharpPercentElement.textContent = `${data.sharpPercentage}%`;
    }

    // 円グラフの更新
    const chartElement = document.getElementById('sharp-flat-chart');
    if (chartElement) {
        chartElement.style.setProperty('--sharp-percent', `${data.sharpPercentage}%`);
    }

    // 音程拡大・縮小パターン
    const expansionElement = document.getElementById('interval-expansion-list');
    if (expansionElement && data.intervalExpansion) {
        expansionElement.innerHTML = '';
        Object.entries(data.intervalExpansion).forEach(([interval, info]) => {
            const tendencyClass = info.tendency === '拡大' ? 'expand' : info.tendency === '縮小' ? 'contract' : 'accurate';
            const icon = info.tendency === '拡大' ? 'arrow-up' : info.tendency === '縮小' ? 'arrow-down' : 'check';

            expansionElement.innerHTML += `
                <div class="expansion-item">
                    <div class="expansion-interval">
                        ${interval}度
                    </div>
                    <div class="expansion-tendency-container">
                        <i data-lucide="${icon}" style="width: 16px; height: 16px;"></i>
                        <span class="expansion-tendency ${tendencyClass}">
                            ${info.tendency}
                        </span>
                        <span class="expansion-semitones">
                            (${info.semitones > 0 ? '+' : ''}${info.semitones}半音)
                        </span>
                    </div>
                </div>
            `;
        });
    }
}

/**
 * Tab 3: 練習プランのUI更新
 */
function updateTab3UI(plan) {
    if (!plan || !Array.isArray(plan)) return;

    const container = document.getElementById('practice-plan-container');
    if (!container) return;

    container.innerHTML = '';

    plan.forEach((item) => {
        const priorityIcons = {
            1: 'flame',
            2: 'zap',
            3: 'check-circle'
        };

        const icon = priorityIcons[item.priority] || 'info';

        container.innerHTML += `
            <div class="practice-plan-card priority-${item.priority}">
                <h4 class="practice-plan-title priority-${item.priority}">
                    <i data-lucide="${icon}" style="width: 16px; height: 16px;"></i>
                    優先度${item.priority}：${item.title}
                </h4>
                <div class="practice-plan-content">
                    <p class="practice-plan-meta">
                        <strong>目標</strong>: ${item.description}<br>
                        <strong>期間</strong>: ${item.priority === 1 ? '4週間' : item.priority === 2 ? '6週間' : '継続'}
                    </p>
                    <div class="practice-plan-exercises">
                        <p class="practice-plan-exercises-title">具体的練習法</p>
                        <ul>
                            ${item.exercises.map(ex => `<li>${ex}</li>`).join('')}
                        </ul>
                    </div>
                </div>
            </div>
        `;
    });
}

/**
 * Tab 4: 成長記録のUI更新
 */
function updateTab4UI(data) {
    if (!data) return;

    // 月間成長比較
    const oldAvgElement = document.getElementById('old-average');
    const recentAvgElement = document.getElementById('recent-average');
    const improvementElement = document.getElementById('monthly-improvement');

    if (oldAvgElement && data.monthlyComparison) {
        oldAvgElement.textContent = `±${data.monthlyComparison.oldAverage}¢`;
    }
    if (recentAvgElement && data.monthlyComparison) {
        recentAvgElement.textContent = `±${data.monthlyComparison.recentAverage}¢`;
    }
    if (improvementElement && data.monthlyComparison) {
        const improvement = data.monthlyComparison.improvement;
        const isPositive = improvement > 0;
        improvementElement.innerHTML = `
            <span style="color: ${isPositive ? '#10b981' : '#ef4444'}; font-weight: 600; font-size: 1.125rem;">
                改善: ${isPositive ? '' : ''}${improvement.toFixed(1)}¢
                <i data-lucide="${isPositive ? 'trending-up' : 'trending-down'}" style="width: 20px; height: 20px; display: inline;"></i>
            </span>
        `;
    }

    // TOP3改善
    const top3ImprovedElement = document.getElementById('top3-improved');
    if (top3ImprovedElement && data.top3Improved) {
        top3ImprovedElement.innerHTML = '';
        data.top3Improved.forEach((item, index) => {
            top3ImprovedElement.innerHTML += `
                <div style="position: relative; text-align: center; padding: 1rem; background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 8px;">
                    <div style="position: absolute; top: 0.5rem; left: 0.5rem; color: white; font-weight: 700; font-size: 1rem;">
                        ${index + 1}
                    </div>
                    <div style="color: white; font-weight: 700; font-size: 1rem; margin-top: 1rem; margin-bottom: 0.5rem;">
                        ${item.interval}度
                    </div>
                    <div style="color: #10b981; font-size: 0.8rem; margin-bottom: 0.25rem;">
                        3ヶ月前: ±${item.oldAverage}¢
                    </div>
                    <div style="color: #10b981; font-size: 0.8rem; margin-bottom: 0.25rem;">
                        現在: ±${item.recentAverage}¢
                    </div>
                    <div style="color: white; font-weight: 600; font-size: 0.875rem;">
                        改善幅: -${item.improvement}¢
                    </div>
                </div>
            `;
        });
    }

    // TOP3停滞
    const top3StagnantElement = document.getElementById('top3-stagnant');
    if (top3StagnantElement && data.top3Stagnant) {
        top3StagnantElement.innerHTML = '';
        data.top3Stagnant.forEach((item, index) => {
            const color = item.improvement < 5 ? '#ef4444' : item.improvement < 10 ? '#f59e0b' : '#10b981';
            const borderColor = item.improvement < 5 ? 'rgba(239, 68, 68, 0.3)' : item.improvement < 10 ? 'rgba(245, 158, 11, 0.3)' : 'rgba(16, 185, 129, 0.3)';
            const bgColor = item.improvement < 5 ? 'rgba(239, 68, 68, 0.1)' : item.improvement < 10 ? 'rgba(245, 158, 11, 0.1)' : 'rgba(16, 185, 129, 0.1)';

            top3StagnantElement.innerHTML += `
                <div style="position: relative; text-align: center; padding: 1rem; background: ${bgColor}; border: 1px solid ${borderColor}; border-radius: 8px;">
                    <div style="position: absolute; top: 0.5rem; left: 0.5rem; color: white; font-weight: 700; font-size: 1rem;">
                        ${index + 1}
                    </div>
                    <div style="color: white; font-weight: 700; font-size: 1rem; margin-top: 1rem; margin-bottom: 0.5rem;">
                        ${item.interval}度
                    </div>
                    <div style="color: ${color}; font-size: 0.8rem; margin-bottom: 0.25rem;">
                        3ヶ月前: ±${item.oldAverage}¢
                    </div>
                    <div style="color: ${color}; font-size: 0.8rem; margin-bottom: 0.25rem;">
                        現在: ±${item.recentAverage}¢
                    </div>
                    <div style="color: white; font-weight: 600; font-size: 0.875rem;">
                        改善幅: -${item.improvement}¢
                    </div>
                </div>
            `;
        });
    }

    // 時系列パフォーマンス分析
    const timeSeriesElement = document.getElementById('time-series-analysis');
    if (timeSeriesElement && data.timeSeriesAnalysis) {
        const { learningEffect, fatiguePattern } = data.timeSeriesAnalysis;

        timeSeriesElement.innerHTML = `
            <div style="background: rgba(255, 255, 255, 0.05); padding: 1rem; border-radius: 8px;">
                <h5 style="color: white; font-weight: 600; margin-bottom: 0.5rem; font-size: 0.9rem;">学習効果</h5>
                <p style="color: #cbd5e1; font-size: 0.875rem; margin: 0; line-height: 1.5;">
                    前半±${learningEffect.earlyAverage}¢から後半±${learningEffect.lateAverage}¢へと
                    ±${learningEffect.improvement}¢の${learningEffect.improvement > 0 ? '顕著な改善' : '変化'}が見られます。
                </p>
            </div>

            <div style="background: rgba(255, 255, 255, 0.05); padding: 1rem; border-radius: 8px;">
                <h5 style="color: white; font-weight: 600; margin-bottom: 0.5rem; font-size: 0.9rem;">疲労パターン</h5>
                <p style="color: #cbd5e1; font-size: 0.875rem; margin: 0; line-height: 1.5;">
                    セッション内で平均±${Math.abs(fatiguePattern.averageFatigue)}¢の精度${fatiguePattern.averageFatigue > 0 ? '低下' : '向上'}が検出されています。
                </p>
            </div>

            <div style="background: rgba(255, 255, 255, 0.05); padding: 1rem; border-radius: 8px;">
                <h5 style="color: white; font-weight: 600; margin-bottom: 0.5rem; font-size: 0.9rem;">練習最適化</h5>
                <p style="color: #cbd5e1; font-size: 0.875rem; margin: 0; line-height: 1.5;">
                    ${fatiguePattern.recommendation}
                </p>
            </div>
        `;
    }

    // 音程間隔別成長グラフ（Chart.js）
    renderIntervalGrowthChart(data.intervalGrowth);
}

/**
 * モード別分析のUI更新
 */
function updateModeAnalysisUI(modeAnalysis) {
    if (!modeAnalysis || !modeAnalysis.parentModeStats) {
        console.warn('⚠️ モード別分析データがありません');
        return;
    }

    const { parentModeStats } = modeAnalysis;

    // クイックジャンプナビゲーション（モード別熟練度）
    const modeQuickNavElement = document.getElementById('mode-quick-nav');
    if (modeQuickNavElement) {
        modeQuickNavElement.innerHTML = '';
        Object.keys(parentModeStats).forEach(parentMode => {
            const mode = parentModeStats[parentMode];
            const colorClass = mode.color === 'blue' ? 'text-blue-300' :
                              mode.color === 'green' ? 'text-green-300' :
                              'text-purple-300';

            modeQuickNavElement.innerHTML += `
                <button class="mode-quick-jump-btn" onclick="document.getElementById('mode-section-${parentMode}').scrollIntoView({behavior: 'smooth'})">
                    <i data-lucide="${mode.icon}" class="${colorClass}"></i>
                    <span>${mode.name}</span>
                </button>
            `;
        });
    }

    // モード別熟練度コンテンツ（全展開）
    const modeMasteryElement = document.getElementById('mode-mastery-content');
    if (modeMasteryElement) {
        modeMasteryElement.innerHTML = '';

        Object.keys(parentModeStats).forEach(parentMode => {
            const mode = parentModeStats[parentMode];
            const colorClass = mode.color === 'blue' ? 'text-blue-300' :
                              mode.color === 'green' ? 'text-green-300' :
                              'text-purple-300';

            modeMasteryElement.innerHTML += `
                <div class="mode-section" id="mode-section-${parentMode}">
                    <div class="mode-section-header">
                        <i data-lucide="${mode.icon}" class="${colorClass}"></i>
                        <h4 class="mode-section-title">${mode.name}</h4>
                    </div>

                    <div class="mode-variants-list">
                        ${mode.variants.map(variantKey => {
                            const variant = mode.modeStats[variantKey];
                            if (!variant || variant.totalSessions === 0) return '';

                            const masteryLevel = variant.masteryLevel || 0;
                            const masteryRate = variant.masteryRate || 0;
                            const masteryColor = masteryLevel >= 8 ? '#10b981' : masteryLevel >= 5 ? '#f59e0b' : '#ef4444';

                            return `
                                <div class="glass-card-sm">
                                    <div class="flex items-center justify-between" style="margin-bottom: 0.75rem;">
                                        <div class="flex items-center gap-2">
                                            <i data-lucide="${variant.icon}" class="${colorClass}" style="width: 20px; height: 20px;"></i>
                                            <h5 style="color: white; font-weight: 600; font-size: 0.95rem; margin: 0;">${variant.displayName}</h5>
                                        </div>
                                        <div style="background: rgba(255, 255, 255, 0.1); padding: 0.25rem 0.75rem; border-radius: 12px; font-size: 0.8rem; font-weight: 600; color: ${masteryColor};">
                                            Lv.${masteryLevel}
                                        </div>
                                    </div>

                                    <div class="progress-bar" style="margin-bottom: 0.5rem;">
                                        <div class="progress-fill gradient-catalog-${mode.color}" style="width: ${masteryRate}%;"></div>
                                    </div>
                                    <p style="color: #94a3b8; font-size: 0.8rem; margin: 0 0 0.75rem 0;">熟練度: ${masteryRate.toFixed(1)}%</p>

                                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; font-size: 0.8rem;">
                                        <div>
                                            <p style="color: #94a3b8; margin: 0;">セッション数</p>
                                            <p style="color: white; font-weight: 600; margin: 0; font-size: 1.1rem;">${variant.totalSessions}</p>
                                        </div>
                                        <div>
                                            <p style="color: #94a3b8; margin: 0;">平均誤差</p>
                                            <p style="color: ${variant.avgError < 30 ? '#10b981' : variant.avgError < 50 ? '#f59e0b' : '#ef4444'}; font-weight: 600; margin: 0; font-size: 1.1rem;">±${variant.avgError}¢</p>
                                        </div>
                                    </div>

                                    ${variant.bestRecord ? `
                                        <div style="margin-top: 0.75rem; padding: 0.5rem; background: rgba(16, 185, 129, 0.1); border-radius: 6px;">
                                            <p style="color: #10b981; font-size: 0.75rem; margin: 0;">ベスト記録: ±${variant.bestRecord.error}¢</p>
                                            <p style="color: #94a3b8; font-size: 0.7rem; margin: 0;">${variant.bestRecord.date}</p>
                                        </div>
                                    ` : ''}

                                    ${variant.characteristics ? `
                                        <p style="color: #cbd5e1; font-size: 0.8rem; margin: 0.75rem 0 0 0; line-height: 1.4;">
                                            ${variant.characteristics}
                                        </p>
                                    ` : ''}
                                </div>
                            `;
                        }).filter(html => html !== '').join('')}
                    </div>
                </div>
            `;
        });
    }

    // クイックジャンプナビゲーション（モード別詳細統計）
    const modeStatsQuickNavElement = document.getElementById('mode-stats-quick-nav');
    if (modeStatsQuickNavElement) {
        modeStatsQuickNavElement.innerHTML = '';
        Object.keys(parentModeStats).forEach(parentMode => {
            const mode = parentModeStats[parentMode];
            const colorClass = mode.color === 'blue' ? 'text-blue-300' :
                              mode.color === 'green' ? 'text-green-300' :
                              'text-purple-300';

            modeStatsQuickNavElement.innerHTML += `
                <button class="mode-quick-jump-btn" onclick="document.getElementById('mode-stats-section-${parentMode}').scrollIntoView({behavior: 'smooth'})">
                    <i data-lucide="${mode.icon}" class="${colorClass}"></i>
                    <span>${mode.name}</span>
                </button>
            `;
        });
    }

    // モード別詳細統計コンテンツ（全展開）
    const modeStatsElement = document.getElementById('mode-stats-content');
    if (modeStatsElement) {
        modeStatsElement.innerHTML = '';

        Object.keys(parentModeStats).forEach(parentMode => {
            const mode = parentModeStats[parentMode];
            const colorClass = mode.color === 'blue' ? 'text-blue-300' :
                              mode.color === 'green' ? 'text-green-300' :
                              'text-purple-300';

            modeStatsElement.innerHTML += `
                <div class="mode-stats-section" id="mode-stats-section-${parentMode}">
                    <div class="mode-section-header">
                        <i data-lucide="${mode.icon}" class="${colorClass}"></i>
                        <h4 class="mode-section-title">${mode.name}</h4>
                    </div>

                    ${mode.variants.map(variantKey => {
                        const variant = mode.modeStats[variantKey];
                        if (!variant || variant.totalSessions === 0) return '';

                        return `
                            <div class="glass-card-sm" style="margin-bottom: 1rem;">
                                <div class="flex items-center gap-2" style="margin-bottom: 1rem;">
                                    <i data-lucide="${variant.icon}" class="${colorClass}" style="width: 20px; height: 20px;"></i>
                                    <h5 style="color: white; font-weight: 600; font-size: 0.95rem; margin: 0;">${variant.displayName}</h5>
                                </div>

                                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.75rem; margin-bottom: 1rem;">
                                    <div style="text-align: center; padding: 0.75rem; background: rgba(255, 255, 255, 0.05); border-radius: 8px;">
                                        <p style="color: #94a3b8; font-size: 0.75rem; margin: 0 0 0.25rem 0;">総セッション数</p>
                                        <p style="color: white; font-weight: 700; font-size: 1.5rem; margin: 0;">${variant.totalSessions}</p>
                                    </div>
                                    <div style="text-align: center; padding: 0.75rem; background: rgba(255, 255, 255, 0.05); border-radius: 8px;">
                                        <p style="color: #94a3b8; font-size: 0.75rem; margin: 0 0 0.25rem 0;">成功率</p>
                                        <p style="color: ${variant.successRate >= 80 ? '#10b981' : variant.successRate >= 60 ? '#f59e0b' : '#ef4444'}; font-weight: 700; font-size: 1.5rem; margin: 0;">${variant.successRate}%</p>
                                    </div>
                                    <div style="text-align: center; padding: 0.75rem; background: rgba(255, 255, 255, 0.05); border-radius: 8px;">
                                        <p style="color: #94a3b8; font-size: 0.75rem; margin: 0 0 0.25rem 0;">平均誤差</p>
                                        <p style="color: ${variant.avgError < 30 ? '#10b981' : variant.avgError < 50 ? '#f59e0b' : '#ef4444'}; font-weight: 700; font-size: 1.25rem; margin: 0;">±${variant.avgError}¢</p>
                                    </div>
                                    <div style="text-align: center; padding: 0.75rem; background: rgba(255, 255, 255, 0.05); border-radius: 8px;">
                                        <p style="color: #94a3b8; font-size: 0.75rem; margin: 0 0 0.25rem 0;">熟練度</p>
                                        <p style="color: #10b981; font-weight: 700; font-size: 1.25rem; margin: 0;">Lv.${variant.masteryLevel}</p>
                                    </div>
                                </div>

                                ${variant.intervalStats && Object.keys(variant.intervalStats).length > 0 ? `
                                    <div style="background: rgba(255, 255, 255, 0.05); padding: 0.75rem; border-radius: 8px;">
                                        <h6 style="color: white; font-weight: 600; font-size: 0.85rem; margin: 0 0 0.5rem 0;">音程間隔別統計</h6>
                                        <div style="display: flex; flex-direction: column; gap: 0.5rem;">
                                            ${Object.keys(variant.intervalStats).sort((a, b) => parseInt(a) - parseInt(b)).map(interval => {
                                                const stats = variant.intervalStats[interval];
                                                return `
                                                    <div style="display: flex; align-items: center; gap: 0.5rem;">
                                                        <span style="color: #94a3b8; font-size: 0.75rem; min-width: 30px;">${interval}度:</span>
                                                        <div class="progress-bar" style="flex: 1;">
                                                            <div class="progress-fill-custom" style="width: ${Math.min(100, (100 - stats.avgError) / 100 * 100)}%; background: ${stats.avgError < 30 ? '#10b981' : stats.avgError < 50 ? '#f59e0b' : '#ef4444'};"></div>
                                                        </div>
                                                        <span style="color: ${stats.avgError < 30 ? '#10b981' : stats.avgError < 50 ? '#f59e0b' : '#ef4444'}; font-size: 0.75rem; font-weight: 600; min-width: 50px; text-align: right;">±${stats.avgError}¢</span>
                                                    </div>
                                                `;
                                            }).join('')}
                                        </div>
                                    </div>
                                ` : ''}
                            </div>
                        `;
                    }).filter(html => html !== '').join('')}
                </div>
            `;
        });
    }

    console.log('✅ モード別分析UI更新完了');
}

/**
 * Chart.js: 音程間隔別成長グラフを描画
 */
function renderIntervalGrowthChart(intervalGrowth) {
    const canvas = document.getElementById('interval-growth-chart');
    if (!canvas || !intervalGrowth) return;

    const ctx = canvas.getContext('2d');

    // 既存のチャートを破棄
    if (window.intervalGrowthChartInstance) {
        window.intervalGrowthChartInstance.destroy();
    }

    // データ準備（intervalGrowthはオブジェクト形式: {2: {oldAverage, recentAverage}, ...}）
    const intervals = [2, 3, 4, 5, 6, 7, 8];
    const oldData = intervals.map(interval => {
        return intervalGrowth[interval] ? intervalGrowth[interval].oldAverage : 0;
    });
    const recentData = intervals.map(interval => {
        return intervalGrowth[interval] ? intervalGrowth[interval].recentAverage : 0;
    });

    // Chart.js設定
    window.intervalGrowthChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['2度', '3度', '4度', '5度', '6度', '7度', '8度'],
            datasets: [
                {
                    label: '3ヶ月前',
                    data: oldData,
                    borderColor: '#f59e0b',
                    backgroundColor: 'rgba(245, 158, 11, 0.1)',
                    borderWidth: 2,
                    tension: 0.3,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    pointBackgroundColor: '#f59e0b',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2
                },
                {
                    label: '現在',
                    data: recentData,
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    borderWidth: 2,
                    tension: 0.3,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    pointBackgroundColor: '#10b981',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        color: '#ffffff',
                        font: {
                            size: 12,
                            weight: 600
                        },
                        padding: 15,
                        usePointStyle: true,
                        pointStyle: 'circle'
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                    titleColor: '#ffffff',
                    bodyColor: '#cbd5e1',
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                    borderWidth: 1,
                    padding: 12,
                    displayColors: true,
                    callbacks: {
                        label: function(context) {
                            return `${context.dataset.label}: ±${context.parsed.y.toFixed(1)}¢`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)',
                        drawBorder: false
                    },
                    ticks: {
                        color: '#cbd5e1',
                        font: {
                            size: 11
                        }
                    }
                },
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)',
                        drawBorder: false
                    },
                    ticks: {
                        color: '#cbd5e1',
                        font: {
                            size: 11
                        },
                        callback: function(value) {
                            return '±' + value + '¢';
                        }
                    }
                }
            },
            interaction: {
                mode: 'index',
                intersect: false
            }
        }
    });
}

/**
 * タブ切り替え機能の初期化
 */
function initTabSwitching() {
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            // 全タブをリセット
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));

            // クリックされたタブをアクティブ化
            button.classList.add('active');
            const tabId = button.getAttribute('data-tab');
            const targetTab = document.getElementById(tabId);
            if (targetTab) {
                targetTab.classList.add('active');
            }

            // Lucideアイコン再初期化
            if (typeof window.initializeLucideIcons === 'function') {
                window.initializeLucideIcons({ immediate: true });
            }
        });
    });
}

/**
 * データなしメッセージの表示
 */
function showNoDataMessage() {
    // タブコンテンツのみを「データなし」メッセージに置き換え（ヘッダーは保持）
    const tabContents = [
        'tab-accuracy',
        'tab-patterns',
        'tab-practice',
        'tab-growth'
    ];

    const noDataHTML = `
        <div class="glass-card" style="text-align: center; padding: 3rem;">
            <i data-lucide="alert-triangle" style="width: 64px; height: 64px; color: #f59e0b; margin-bottom: 1.5rem;"></i>
            <h2 style="color: white; font-size: 1.5rem; margin-bottom: 1rem;">データがありません</h2>
            <p style="color: #cbd5e1; margin-bottom: 2rem;">
                分析するためのトレーニングデータが見つかりませんでした。<br>
                まずはトレーニングを実施してください。
            </p>
            <button class="btn btn-primary" onclick="window.location.hash='home'">
                <i data-lucide="home"></i>
                <span>ホームに戻る</span>
            </button>
        </div>
    `;

    // 全タブのコンテンツを「データなし」メッセージに置き換え
    tabContents.forEach(tabId => {
        const tabElement = document.getElementById(tabId);
        if (tabElement) {
            tabElement.innerHTML = noDataHTML;
        }
    });

    // モード分析セクションを非表示
    const modeAnalysisSection = document.getElementById('mode-analysis-section');
    if (modeAnalysisSection) {
        modeAnalysisSection.style.display = 'none';
    }

    if (typeof window.initializeLucideIcons === 'function') {
        window.initializeLucideIcons({ immediate: true });
    }
}

/**
 * 全セッションデータの読み込み（DataManager使用）
 * premium-analysis専用
 */
function loadAllSessionDataForPremium() {
    if (typeof window.DataManager !== 'undefined' && typeof window.DataManager.getFromStorage === 'function') {
        return window.DataManager.getFromStorage('sessionData') || [];
    }

    // DataManagerが利用できない場合はlocalStorageから直接取得
    const historyData = localStorage.getItem('sessionData');
    if (historyData) {
        try {
            return JSON.parse(historyData);
        } catch (e) {
            console.error('❌ データ読み込みエラー:', e);
            return [];
        }
    }

    return [];
}

console.log('✅ premium-analysis-controller loaded');
