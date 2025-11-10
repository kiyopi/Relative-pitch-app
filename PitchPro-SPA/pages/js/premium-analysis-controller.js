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
    const allSessionData = loadAllSessionData();

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
    const errorPatterns = window.PremiumAnalysisCalculator.calculateErrorPatterns(sessionData);
    const growthRecords = window.PremiumAnalysisCalculator.calculateGrowthRecords(sessionData);
    const practicePlan = window.PremiumAnalysisCalculator.generatePracticePlan(
        intervalAccuracy,
        errorPatterns,
        growthRecords
    );

    console.log('✅ 分析計算完了:', {
        intervalAccuracy,
        errorPatterns,
        growthRecords,
        practicePlan
    });

    // UI更新
    updateTab1UI(intervalAccuracy);
    updateTab2UI(errorPatterns);
    updateTab3UI(practicePlan);
    updateTab4UI(growthRecords);

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
function updateTab1UI(data) {
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
            const color = info.tendency === '拡大' ? '#ef4444' : info.tendency === '縮小' ? '#3b82f6' : '#10b981';
            const icon = info.tendency === '拡大' ? 'arrow-up' : info.tendency === '縮小' ? 'arrow-down' : 'check';

            expansionElement.innerHTML += `
                <div class="flex items-center" style="padding: 1rem; background: rgba(255, 255, 255, 0.05); border-radius: 8px;">
                    <div style="color: white; font-weight: 600; min-width: 60px; font-size: 1rem;">
                        ${interval}度
                    </div>
                    <div class="flex items-center gap-2" style="flex: 1;">
                        <i data-lucide="${icon}" style="width: 16px; height: 16px; color: ${color};"></i>
                        <span style="color: ${color}; font-weight: 600;">
                            ${info.tendency}
                        </span>
                        <span style="color: #94a3b8; font-size: 0.875rem;">
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

    plan.forEach((item, index) => {
        const priorityColors = {
            1: { bg: 'rgba(239, 68, 68, 0.1)', border: 'rgba(239, 68, 68, 0.3)', text: '#ef4444', icon: 'alert-circle' },
            2: { bg: 'rgba(245, 158, 11, 0.1)', border: 'rgba(245, 158, 11, 0.3)', text: '#f59e0b', icon: 'info' },
            3: { bg: 'rgba(16, 185, 129, 0.1)', border: 'rgba(16, 185, 129, 0.3)', text: '#10b981', icon: 'check-circle' }
        };

        const colors = priorityColors[item.priority];
        const cardId = `practice-card-${index}`;
        const detailsId = `practice-details-${index}`;

        // 難易度・推定時間を追加
        const difficulty = item.priority === 1 ? '高' : item.priority === 2 ? '中' : '低';
        const estimatedTime = item.priority === 1 ? '15-20分' : item.priority === 2 ? '10-15分' : '5-10分';

        container.innerHTML += `
            <div class="glass-card practice-plan-card" id="${cardId}" style="margin-bottom: 1.5rem; cursor: pointer; transition: all 0.3s ease;">
                <!-- カードヘッダー（クリック可能） -->
                <div onclick="togglePracticeDetails('${detailsId}', '${cardId}')">
                    <div class="flex items-center gap-3" style="margin-bottom: 1rem;">
                        <div style="background: ${colors.bg}; border: 1px solid ${colors.border}; padding: 0.5rem 1rem; border-radius: 8px;">
                            <i data-lucide="${colors.icon}" style="width: 14px; height: 14px; color: ${colors.text}; margin-right: 0.5rem;"></i>
                            <span style="color: ${colors.text}; font-weight: 600; font-size: 0.875rem;">
                                優先度 ${item.priority} - ${item.level}
                            </span>
                        </div>
                        <div style="flex: 1;"></div>
                        <i data-lucide="chevron-down" id="${cardId}-chevron" style="width: 20px; height: 20px; color: #cbd5e1; transition: transform 0.3s ease;"></i>
                    </div>

                    <h4 style="color: white; font-size: 1.125rem; font-weight: 600; margin-bottom: 0.75rem;">
                        ${item.title}
                    </h4>

                    <p style="color: #cbd5e1; line-height: 1.6; margin-bottom: 1rem;">
                        ${item.description}
                    </p>

                    <!-- メタ情報 -->
                    <div class="flex items-center gap-4" style="margin-bottom: 1rem;">
                        <div class="flex items-center gap-2">
                            <i data-lucide="clock" style="width: 16px; height: 16px; color: #94a3b8;"></i>
                            <span style="color: #94a3b8; font-size: 0.875rem;">推定時間: ${estimatedTime}</span>
                        </div>
                        <div class="flex items-center gap-2">
                            <i data-lucide="trending-up" style="width: 16px; height: 16px; color: #94a3b8;"></i>
                            <span style="color: #94a3b8; font-size: 0.875rem;">難易度: ${difficulty}</span>
                        </div>
                    </div>
                </div>

                <!-- 展開可能な詳細エリア -->
                <div id="${detailsId}" style="display: none; margin-top: 1rem; animation: fadeIn 0.3s ease;">
                    <div style="background: rgba(255, 255, 255, 0.05); padding: 1rem; border-radius: 8px; border-left: 3px solid ${colors.text};">
                        <div class="flex items-center gap-2" style="margin-bottom: 0.75rem;">
                            <i data-lucide="lightbulb" style="width: 16px; height: 16px; color: #fbbf24;"></i>
                            <h5 style="color: #fbbf24; font-weight: 600; margin: 0; font-size: 0.875rem;">具体的な練習方法</h5>
                        </div>
                        <ul style="color: #cbd5e1; font-size: 0.875rem; line-height: 1.6; margin: 0; padding-left: 1.5rem;">
                            ${item.exercises.map(ex => `
                                <li style="margin-bottom: 0.75rem; position: relative;">
                                    <span style="position: absolute; left: -1.5rem; color: ${colors.text};">•</span>
                                    ${ex}
                                </li>
                            `).join('')}
                        </ul>
                    </div>
                </div>
            </div>
        `;
    });
}

/**
 * 練習プラン詳細の展開/折りたたみ
 */
window.togglePracticeDetails = function(detailsId, cardId) {
    const detailsElement = document.getElementById(detailsId);
    const chevronElement = document.getElementById(`${cardId}-chevron`);

    if (!detailsElement || !chevronElement) return;

    if (detailsElement.style.display === 'none') {
        detailsElement.style.display = 'block';
        chevronElement.style.transform = 'rotate(180deg)';
    } else {
        detailsElement.style.display = 'none';
        chevronElement.style.transform = 'rotate(0deg)';
    }

    // Lucideアイコン再初期化
    if (typeof window.initializeLucideIcons === 'function') {
        window.initializeLucideIcons({ immediate: true });
    }
};

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
    const appRoot = document.getElementById('app-root');
    if (appRoot) {
        appRoot.innerHTML = `
            <div class="page-container">
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
            </div>
        `;

        if (typeof window.initializeLucideIcons === 'function') {
            window.initializeLucideIcons({ immediate: true });
        }
    }
}

/**
 * 全セッションデータの読み込み（DataManager使用）
 */
function loadAllSessionData() {
    if (typeof window.DataManager !== 'undefined' && typeof window.DataManager.getAllSessions === 'function') {
        return window.DataManager.getAllSessions();
    }

    // DataManagerが利用できない場合はlocalStorageから直接取得
    const historyData = localStorage.getItem('trainingHistory');
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
