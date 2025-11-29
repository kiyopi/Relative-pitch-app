/**
 * premium-analysis-controller.js
 * プレミアム分析ページコントローラー
 * Version: 2.0.0
 *
 * 【責任範囲】
 * - セッションデータの読み込みとフィルタリング
 * - フィルターUI（モード・方向・基音進行）の状態管理
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
 * フィルター状態管理
 */
const FilterState = {
    mode: 'all',           // all, random, continuous, 12tone
    direction: 'all',      // all, ascending, descending
    chromatic: 'all',      // all, ascending, descending, both（12音階専用）

    // フィルター状態を更新
    update(key, value) {
        this[key] = value;
        console.log(`🔧 FilterState.${key} = ${value}`);
    },

    // 現在のフィルター状態を取得
    getState() {
        return {
            mode: this.mode,
            direction: this.direction,
            chromatic: this.chromatic
        };
    }
};

/**
 * モードアイコンマッピング（ホームページのモードカードと統一）
 */
const MODE_ICONS = {
    'all': 'bar-chart-3',
    'random': 'shuffle',      // ランダム基音
    'continuous': 'zap',      // 連続チャレンジ
    '12tone': 'music'         // 12音階
};

/**
 * モード表示名マッピング
 */
const MODE_DISPLAY_NAMES = {
    'all': '全体統計',
    'random': 'ランダム基音',
    'continuous': '連続チャレンジ',
    '12tone': '12音階'
};

/**
 * 方向表示名マッピング
 */
const DIRECTION_DISPLAY_NAMES = {
    'all': '',
    'ascending': '上行',
    'descending': '下行'
};

/**
 * 基音進行表示名マッピング
 */
const CHROMATIC_DISPLAY_NAMES = {
    'all': '',
    'ascending': '上昇',
    'descending': '下降',
    'both': '両方向'
};

/**
 * 全セッションデータのグローバル参照
 */
let allSessionDataCache = null;

/**
 * プレミアム分析ページの初期化
 */
window.initPremiumAnalysis = async function() {
    console.log('📊 プレミアム分析ページ初期化開始');

    // DataManagerから全セッションデータを取得
    allSessionDataCache = loadAllSessionDataForPremium();

    if (!allSessionDataCache || allSessionDataCache.length === 0) {
        console.warn('⚠️ セッションデータが見つかりません');
        showNoDataMessage();
        return;
    }

    console.log(`✅ セッションデータ取得: 全モード=${allSessionDataCache.length}セッション`);

    // フィルターUIの初期化
    initFilterUI();

    // フィルター適用してUI更新
    applyFiltersAndUpdateUI();

    // タブ切り替え機能の初期化
    initTabSwitching();

    // Lucideアイコン再初期化
    if (typeof window.initializeLucideIcons === 'function') {
        window.initializeLucideIcons({ immediate: true });
    }

    console.log('✅ プレミアム分析ページ初期化完了');
};

/**
 * フィルターUIの初期化
 */
function initFilterUI() {
    console.log('🔧 フィルターUI初期化');

    // モード選択
    const modeSelect = document.getElementById('filter-mode');
    if (modeSelect) {
        modeSelect.addEventListener('change', (e) => {
            FilterState.update('mode', e.target.value);

            // 12音階モード選択時のみ基音進行フィルターを表示
            const chromaticGroup = document.getElementById('filter-chromatic-group');
            if (chromaticGroup) {
                chromaticGroup.style.display = e.target.value === '12tone' ? 'flex' : 'none';
            }

            // フィルター適用
            applyFiltersAndUpdateUI();
        });
    }

    // 方向選択
    const directionSelect = document.getElementById('filter-direction');
    if (directionSelect) {
        directionSelect.addEventListener('change', (e) => {
            FilterState.update('direction', e.target.value);
            applyFiltersAndUpdateUI();
        });
    }

    // 基音進行選択（12音階専用）
    const chromaticSelect = document.getElementById('filter-chromatic');
    if (chromaticSelect) {
        chromaticSelect.addEventListener('change', (e) => {
            FilterState.update('chromatic', e.target.value);
            applyFiltersAndUpdateUI();
        });
    }

    // タイトル表示の初期化
    updateFilterTitle();
}

/**
 * フィルタータイトル表示の更新
 */
function updateFilterTitle() {
    const titleIcon = document.getElementById('filter-title-icon');
    const titleText = document.getElementById('filter-title-text');

    if (!titleIcon || !titleText) return;

    const { mode, direction, chromatic } = FilterState.getState();

    // アイコン更新
    const iconName = MODE_ICONS[mode] || 'bar-chart-3';
    titleIcon.setAttribute('data-lucide', iconName);

    // タイトルテキスト構築
    let titleParts = [];

    // モード名
    titleParts.push(MODE_DISPLAY_NAMES[mode] || '全体統計');

    // 方向（all以外の場合）
    if (direction !== 'all') {
        titleParts.push(DIRECTION_DISPLAY_NAMES[direction]);
    }

    // 基音進行（12音階モードでall以外の場合）
    if (mode === '12tone' && chromatic !== 'all') {
        titleParts.push(CHROMATIC_DISPLAY_NAMES[chromatic]);
    }

    titleText.textContent = titleParts.join(' / ');

    // Lucideアイコン再初期化
    if (typeof window.initializeLucideIcons === 'function') {
        window.initializeLucideIcons({ immediate: true });
    }

    console.log(`📝 タイトル更新: ${titleParts.join(' / ')}`);
}

/**
 * フィルター適用してUI更新
 */
function applyFiltersAndUpdateUI() {
    console.log('🔄 フィルター適用開始', FilterState.getState());

    // フィルター適用
    const filteredData = filterSessionData(allSessionDataCache);

    console.log(`📊 フィルター後データ数: ${filteredData.length}セッション`);

    // タイトル更新
    updateFilterTitle();

    // フィルター後データが0件の場合
    if (filteredData.length === 0) {
        showNoDataMessage();
        return;
    }

    // 分析計算の実行
    console.log('🔢 分析計算開始...');
    const intervalAccuracy = window.PremiumAnalysisCalculator.calculateIntervalAccuracy(filteredData);
    const brainProcessing = window.PremiumAnalysisCalculator.calculateBrainProcessingPattern(filteredData);
    const errorPatterns = window.PremiumAnalysisCalculator.calculateErrorPatterns(filteredData);
    const growthRecords = window.PremiumAnalysisCalculator.calculateGrowthRecords(filteredData);
    const practicePlan = window.PremiumAnalysisCalculator.generatePracticePlan(
        intervalAccuracy,
        errorPatterns,
        growthRecords
    );

    console.log('✅ 分析計算完了');

    // UI更新
    updateTab1UI(intervalAccuracy, brainProcessing);
    updateTab2UI(errorPatterns);
    updateTab3UI(practicePlan);
    updateTab4UI(growthRecords);
    // 親モード別分析もフィルター連動
    updateModeAnalysisUI(filteredData);
    updateBrainBalanceMeter(brainProcessing);

    // Lucideアイコン再初期化
    if (typeof window.initializeLucideIcons === 'function') {
        window.initializeLucideIcons({ immediate: true });
    }
}

/**
 * セッションデータのフィルタリング
 */
function filterSessionData(sessionData) {
    if (!sessionData || sessionData.length === 0) return [];

    const { mode, direction, chromatic } = FilterState.getState();

    return sessionData.filter(session => {
        // モードフィルター
        if (mode !== 'all' && session.mode !== mode) {
            return false;
        }

        // 方向フィルター（scaleDirection）
        if (direction !== 'all' && session.scaleDirection !== direction) {
            return false;
        }

        // 基音進行フィルター（12音階モードのみ）
        if (mode === '12tone' && chromatic !== 'all') {
            if (session.chromaticDirection !== chromatic) {
                return false;
            }
        }

        return true;
    });
}

/**
 * 脳バランスメーターの更新
 */
function updateBrainBalanceMeter(brainProcessing) {
    if (!brainProcessing) return;

    const valueEl = document.getElementById('brain-balance-value');
    const indicatorEl = document.getElementById('brain-balance-indicator');
    const commentEl = document.getElementById('brain-balance-comment');

    if (!valueEl || !indicatorEl || !commentEl) return;

    const { leftBrain, bothBrain, difficulty } = brainProcessing;

    if (!leftBrain || !bothBrain || !difficulty) {
        valueEl.textContent = '--';
        commentEl.textContent = 'データが不足しています';
        return;
    }

    // A-B精度差の計算（Bブロック - Aブロック）
    const diff = bothBrain.avgError - leftBrain.avgError;
    const absDiff = Math.abs(diff);

    // 値表示
    const sign = diff >= 0 ? '+' : '';
    valueEl.textContent = `${sign}${diff.toFixed(1)}¢`;

    // 色分けクラス
    valueEl.classList.remove('excellent', 'good', 'warning', 'poor');
    if (absDiff < 5) {
        valueEl.classList.add('excellent');
    } else if (absDiff < 15) {
        valueEl.classList.add('good');
    } else if (absDiff < 30) {
        valueEl.classList.add('warning');
    } else {
        valueEl.classList.add('poor');
    }

    // インジケーター位置（-50¢ ～ +50¢ を 0% ～ 100% にマッピング）
    const clampedDiff = Math.max(-50, Math.min(50, diff));
    const indicatorPercent = ((clampedDiff + 50) / 100) * 100;
    indicatorEl.style.left = `${indicatorPercent}%`;

    // コメント生成
    let comment = '';
    if (absDiff < 5) {
        comment = '素晴らしい！左脳と両脳の処理バランスが理想的です。';
    } else if (diff > 0) {
        comment = `Bブロック（両脳処理）が${absDiff.toFixed(0)}¢苦手です。ソ〜ドの練習を強化しましょう。`;
    } else {
        comment = `Aブロック（左脳処理）が${absDiff.toFixed(0)}¢苦手です。ド〜ファ#の練習を強化しましょう。`;
    }
    commentEl.textContent = comment;

    console.log('✅ 脳バランスメーター更新完了', { diff, indicatorPercent });
}

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

    // 音域ブロック分析
    updateBrainProcessingUI(brainProcessing);
}

/**
 * 音域ブロック分析のUI更新
 */
function updateBrainProcessingUI(data) {
    if (!data) {
        console.warn('⚠️ 音域ブロック分析データがありません');
        return;
    }

    // Aブロック（C〜F#）
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

    // Bブロック（G〜B）
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

    // ブロック間の誤差
    const difficultyValueElement = document.getElementById('brain-difficulty-value');
    const difficultyAnalysisElement = document.getElementById('brain-difficulty-analysis');

    if (difficultyValueElement && data.difficulty) {
        const { difference, percentage, isHarder } = data.difficulty;
        const sign = isHarder ? '+' : '';
        difficultyValueElement.textContent = `BブロックはAブロックより ${sign}${difference}¢ (${percentage.toFixed(0)}%) ${isHarder ? '難しい' : '同等'}`;
        difficultyValueElement.style.color = isHarder ? '#f59e0b' : '#10b981';
    }

    if (difficultyAnalysisElement && data.difficulty) {
        difficultyAnalysisElement.textContent = data.difficulty.analysis;
    }

    // Bブロックの詳細分析（相対音名で表示）
    const notesDetailListElement = document.getElementById('brain-notes-detail-list');
    if (notesDetailListElement && data.bothBrain && data.bothBrain.noteStats) {
        notesDetailListElement.innerHTML = '';

        // 絶対音名 → 相対音名マッピング（Bブロック：ソ〜ド）
        const noteMapping = {
            'G': 'ソ',
            'G#': 'ソ#',
            'A': 'ラ',
            'B♭': 'シ♭',
            'B': 'シ'
        };
        const notes = ['G', 'G#', 'A', 'B♭', 'B'];

        notes.forEach(note => {
            const stats = data.bothBrain.noteStats[note];
            if (!stats || stats.count === 0) return;

            const displayName = noteMapping[note] || note;
            const avgError = stats.avgError.toFixed(1);
            const percentage = Math.max(0, 100 - stats.avgError);
            const color = stats.avgError < 30 ? '#10b981' : stats.avgError < 50 ? '#f59e0b' : '#ef4444';

            notesDetailListElement.innerHTML += `
                <div class="brain-notes-detail-item">
                    <span class="brain-notes-detail-note">${displayName}:</span>
                    <div class="progress-bar" style="flex: 1;">
                        <div class="progress-fill-custom" style="width: ${percentage}%; background: ${color};"></div>
                    </div>
                    <span class="brain-notes-detail-value" style="color: ${color};">±${avgError}¢</span>
                </div>
            `;
        });
    }

    console.log('✅ 音域ブロック分析UI更新完了');
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
 * モード別分析のUI更新（親モードカードアコーディオン方式）
 * フィルター連動: 選択されたモードのみ表示
 */
function updateModeAnalysisUI(sessionData) {
    console.log('📊 モード別分析UI更新開始', { dataCount: sessionData?.length || 0 });

    // モード別熟練度コンテンツ（親モードカードアコーディオン）
    const modeMasteryElement = document.getElementById('mode-mastery-content');
    if (!modeMasteryElement) {
        console.warn('⚠️ #mode-mastery-content要素が見つかりません');
        return;
    }

    // データがない場合
    if (!sessionData || sessionData.length === 0) {
        modeMasteryElement.innerHTML = `
            <div class="parent-mode-no-data" style="text-align: center; padding: 2rem;">
                <p style="color: #94a3b8;">データがありません。トレーニングを実施してください。</p>
            </div>
        `;
        return;
    }

    // PremiumAnalysisCalculatorのMODE_DEFINITIONSを取得
    const MODE_DEFINITIONS = window.PremiumAnalysisCalculator.MODE_DEFINITIONS;
    if (!MODE_DEFINITIONS || !MODE_DEFINITIONS.parentModes) {
        console.error('❌ MODE_DEFINITIONSが見つかりません');
        return;
    }

    // フィルター状態を取得
    const { mode: filterMode } = FilterState.getState();

    // フィルターモード → parentModeKeyマッピング
    const FILTER_TO_PARENT_MODE = {
        'random': 'beginner',
        'continuous': 'intermediate',
        '12tone': 'advanced'
    };

    // 表示する親モードを決定
    let parentModeKeys;
    if (filterMode === 'all') {
        // 全体表示時は全モード
        parentModeKeys = ['beginner', 'intermediate', 'advanced'];
    } else {
        // 特定モード選択時はそのモードのみ
        const targetParentMode = FILTER_TO_PARENT_MODE[filterMode];
        parentModeKeys = targetParentMode ? [targetParentMode] : [];
    }

    console.log(`📊 表示対象親モード: ${parentModeKeys.join(', ')} (フィルター: ${filterMode})`);

    // フィルター時（1モード選択）はフラット表示、全体表示時はアコーディオン
    const isFiltered = filterMode !== 'all';

    if (isFiltered) {
        // === フィルター時: 子モードカードのみフラット表示 ===
        modeMasteryElement.innerHTML = '<div class="mode-flat-container"></div>';
        const flatContainer = modeMasteryElement.querySelector('.mode-flat-container');

        parentModeKeys.forEach(parentModeKey => {
            const parentMode = MODE_DEFINITIONS.parentModes[parentModeKey];
            if (!parentMode) return;

            // 親モード統計を計算（子モード情報を取得するため）
            const stats = window.PremiumAnalysisCalculator.calculateParentModeStats(sessionData, parentModeKey);
            console.log(`📊 ${parentModeKey}統計（フラット表示）:`, stats);

            // 子モードカードのみ直接表示
            const childCardsHTML = generateChildModeCards(stats.childModes, parentMode.color);
            flatContainer.innerHTML += childCardsHTML;
        });
    } else {
        // === 全体表示時: アコーディオン構造 ===
        modeMasteryElement.innerHTML = '<div class="mode-mastery-accordion"></div>';
        const accordion = modeMasteryElement.querySelector('.mode-mastery-accordion');

        parentModeKeys.forEach(parentModeKey => {
            const parentMode = MODE_DEFINITIONS.parentModes[parentModeKey];
            if (!parentMode) return;

            // 親モード統計を計算（フィルター後のデータを使用）
            const stats = window.PremiumAnalysisCalculator.calculateParentModeStats(sessionData, parentModeKey);
            console.log(`📊 ${parentModeKey}統計:`, stats);

            // 親モードカードHTML生成
            const cardHTML = generateParentModeCard(parentModeKey, parentMode, stats);
            accordion.innerHTML += cardHTML;
        });

        // アコーディオン展開/折りたたみイベントを設定
        initParentModeAccordion();
    }

    // Lucideアイコン初期化
    if (window.initializeLucideIcons) {
        window.initializeLucideIcons({ immediate: true });
    }

    console.log('✅ モード別分析UI更新完了');
}

/**
 * 親モードカードHTML生成
 */
function generateParentModeCard(parentModeKey, parentMode, stats) {
    const { color, levelIcon } = parentMode;
    // ModeControllerを使用して表示名を統一取得
    const displayName = getParentModeDisplayName(parentModeKey);
    const { totalSessions, avgError, childModes } = stats;

    // データがない場合
    if (totalSessions === 0) {
        return `
            <div class="parent-mode-card" data-mode="${parentModeKey}">
                <div class="parent-mode-header" data-mode="${parentModeKey}">
                    <div class="parent-mode-header-top">
                        <div class="parent-mode-header-left">
                            <i data-lucide="${levelIcon}" class="parent-mode-level-icon text-${color}-300" style="width: 20px; height: 20px;"></i>
                            <h3 class="parent-mode-title">${displayName}</h3>
                        </div>
                        <i data-lucide="chevron-down" class="parent-mode-chevron"></i>
                    </div>
                </div>
                <div class="parent-mode-no-data">
                    <p class="parent-mode-no-data-title">まだデータがありません</p>
                    <p>トレーニングを始めましょう</p>
                </div>
            </div>
        `;
    }

    // 熟練度計算（暫定: 100 - avgError, 0-100%）
    const masteryRate = Math.max(0, Math.min(100, 100 - avgError));
    const masteryLevel = Math.floor(masteryRate / 10);

    return `
        <div class="parent-mode-card" data-mode="${parentModeKey}">
            <div class="parent-mode-header" data-mode="${parentModeKey}">
                <div class="parent-mode-header-top">
                    <div class="parent-mode-header-left">
                        <i data-lucide="${levelIcon}" class="parent-mode-level-icon text-${color}-300" style="width: 20px; height: 20px;"></i>
                        <h3 class="parent-mode-title">${displayName}</h3>
                    </div>
                    <i data-lucide="chevron-down" class="parent-mode-chevron"></i>
                </div>

                <div class="parent-mode-stats">
                    <div class="parent-mode-stat">
                        <span class="parent-mode-stat-label">総セッション</span>
                        <span class="parent-mode-stat-value">${totalSessions}</span>
                    </div>
                    <div class="parent-mode-stat">
                        <span class="parent-mode-stat-label">平均誤差</span>
                        <span class="parent-mode-stat-value">±${avgError}¢</span>
                    </div>
                    <div class="parent-mode-stat">
                        <span class="parent-mode-stat-label">総合レベル</span>
                        <span class="parent-mode-stat-value">Lv.${masteryLevel}</span>
                    </div>
                    <div class="parent-mode-stat">
                        <span class="parent-mode-stat-label">熟練度</span>
                        <span class="parent-mode-stat-value">${masteryRate.toFixed(0)}%</span>
                    </div>
                </div>

                <div class="parent-mode-progress-section">
                    <div class="parent-mode-progress-label">
                        <span>熟練度</span>
                        <span class="parent-mode-progress-percent">${masteryRate.toFixed(0)}%</span>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill gradient-catalog-${color}" style="width: ${masteryRate}%;"></div>
                    </div>
                </div>
            </div>

            <div class="mode-mastery-variants" data-mode="${parentModeKey}">
                ${generateChildModeCards(childModes, color)}
            </div>
        </div>
    `;
}

/**
 * modeKeyからModeController用のパラメータを解析
 * @param {string} modeKey - 正規化されたモードキー (例: 'random-ascending', 'twelve-asc-descending')
 * @returns {object} { modeId, scaleDirection, chromaticDirection }
 */
function parseModeKey(modeKey) {
    // 12音階モード
    if (modeKey.startsWith('twelve-')) {
        const parts = modeKey.split('-'); // ['twelve', 'asc', 'ascending']
        const chromaticMap = { 'asc': 'ascending', 'desc': 'descending', 'both': 'both' };
        return {
            modeId: '12tone',
            chromaticDirection: chromaticMap[parts[1]] || 'ascending',
            scaleDirection: parts[2] || 'ascending'
        };
    }

    // random/continuousモード
    const parts = modeKey.split('-'); // ['random', 'ascending']
    return {
        modeId: parts[0],
        scaleDirection: parts[1] || 'ascending',
        chromaticDirection: null
    };
}

/**
 * modeKeyからModeControllerを使用して表示名を取得（子モード用）
 * @param {string} modeKey - 正規化されたモードキー
 * @returns {string} 表示名
 */
function getDisplayNameFromModeKey(modeKey) {
    if (!window.ModeController) {
        // フォールバック: MODE_DEFINITIONSから取得
        const MODE_DEFINITIONS = window.PremiumAnalysisCalculator?.MODE_DEFINITIONS;
        return MODE_DEFINITIONS?.modes?.[modeKey]?.displayName || modeKey;
    }

    const { modeId, scaleDirection, chromaticDirection } = parseModeKey(modeKey);

    return window.ModeController.getDisplayName(modeId, {
        scaleDirection: scaleDirection,
        direction: chromaticDirection,
        useShortName: true
    });
}

/**
 * 親モードキーからModeControllerを使用して表示名を取得
 * @param {string} parentModeKey - 親モードキー ('beginner', 'intermediate', 'advanced')
 * @returns {string} 表示名
 */
function getParentModeDisplayName(parentModeKey) {
    // 親モードキーからModeController modeIdへのマッピング
    const PARENT_TO_MODE_ID = {
        'beginner': 'random',
        'intermediate': 'continuous',
        'advanced': '12tone'
    };

    const modeId = PARENT_TO_MODE_ID[parentModeKey];

    if (!modeId || !window.ModeController) {
        // フォールバック: MODE_DEFINITIONSから取得
        const MODE_DEFINITIONS = window.PremiumAnalysisCalculator?.MODE_DEFINITIONS;
        return MODE_DEFINITIONS?.parentModes?.[parentModeKey]?.displayName || parentModeKey;
    }

    // ModeController.getModeName()でshortNameを取得
    return window.ModeController.getModeName(modeId, true);
}

/**
 * 子モードカードHTML生成
 */
function generateChildModeCards(childModes, color) {
    let html = '';

    Object.keys(childModes).forEach(modeKey => {
        const mode = childModes[modeKey];
        if (!mode || mode.totalSessions === 0) return;

        const { totalSessions, avgError } = mode;
        // ModeControllerを使用して表示名を取得
        const displayName = getDisplayNameFromModeKey(modeKey);
        const masteryRate = Math.max(0, Math.min(100, 100 - avgError));
        const masteryLevel = Math.floor(masteryRate / 10);
        const masteryColor = masteryLevel >= 8 ? '#10b981' : masteryLevel >= 5 ? '#f59e0b' : '#ef4444';

        // アイコンを方向に応じて設定
        const { scaleDirection } = parseModeKey(modeKey);
        const iconName = scaleDirection === 'descending' ? 'arrow-down' : 'arrow-up';

        html += `
            <div class="glass-card-sm mode-variant-item">
                <div class="mode-variant-header">
                    <i data-lucide="${iconName}" style="width: 18px; height: 18px;"></i>
                    <span>${displayName}</span>
                </div>

                <div class="mode-variant-stats">
                    <div class="variant-level" style="color: ${masteryColor};">Lv.${masteryLevel}</div>
                    <div class="variant-rate">精度: ±${avgError}¢</div>
                    <div class="variant-sessions">${totalSessions}セッション</div>
                </div>

                <div class="progress-bar" style="margin-top: 0.5rem;">
                    <div class="progress-fill gradient-catalog-${color}" style="width: ${masteryRate}%;"></div>
                </div>
            </div>
        `;
    });

    return html;
}

/**
 * 親モードアコーディオンの展開/折りたたみ初期化
 */
function initParentModeAccordion() {
    const headers = document.querySelectorAll('.parent-mode-header');

    headers.forEach(header => {
        header.addEventListener('click', () => {
            const modeKey = header.getAttribute('data-mode');
            const variantsContainer = document.querySelector(`.mode-mastery-variants[data-mode="${modeKey}"]`);

            if (!variantsContainer) return;

            // トグル処理
            const isActive = header.classList.contains('active');

            if (isActive) {
                // 折りたたむ
                header.classList.remove('active');
                variantsContainer.classList.remove('active');
            } else {
                // 展開する
                header.classList.add('active');
                variantsContainer.classList.add('active');
            }

            // Lucideアイコン再初期化
            if (typeof window.initializeLucideIcons === 'function') {
                window.initializeLucideIcons({ immediate: true });
            }
        });
    });
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
