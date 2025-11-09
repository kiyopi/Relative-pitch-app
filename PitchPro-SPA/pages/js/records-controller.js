/**
 * トレーニング記録ページコントローラー
 *
 * @version 1.0.0
 * @description トレーニング履歴の表示・統計計算・グラフ描画
 */

(function() {
    'use strict';

    console.log('[Records] Controller initializing...');

    // ページロード時の初期化
    document.addEventListener('DOMContentLoaded', function() {
        console.log('[Records] DOM loaded');
        initializeRecordsPage();
    });

    /**
     * 記録ページ初期化
     */
    function initializeRecordsPage() {
        console.log('[Records] Initializing records page...');

        // データ取得と表示
        loadTrainingRecords();

        // Lucideアイコン初期化
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
            console.log('[Records] Lucide icons initialized');
        }
    }

    /**
     * トレーニング記録を読み込んで表示
     */
    function loadTrainingRecords() {
        console.log('[Records] Loading training records...');

        try {
            // DataManagerからセッション履歴を取得
            const sessions = DataManager.getSessionHistory(null, 50); // 全モード、最大50件
            console.log(`[Records] Loaded ${sessions ? sessions.length : 0} sessions`);

            if (!sessions || sessions.length === 0) {
                showNoDataMessage();
                return;
            }

            // 統計を計算
            const stats = calculateStatistics(sessions);
            console.log('[Records] Statistics:', stats);

            // UIを更新
            displayStatistics(stats);
            displaySessionList(sessions);
            displayAccuracyChart(sessions);

        } catch (error) {
            console.error('[Records] Error loading records:', error);
            showNoDataMessage();
        }
    }

    /**
     * 統計を計算
     */
    function calculateStatistics(sessions) {
        const totalSessions = sessions.length;

        // 平均誤差を計算（絶対値）
        const avgErrors = sessions.map(s => Math.abs(s.averageError || 0));
        const avgAccuracy = avgErrors.length > 0
            ? Math.round(avgErrors.reduce((a, b) => a + b, 0) / avgErrors.length)
            : 0;

        // 最高グレード
        const gradeOrder = ['S+', 'S', 'A+', 'A', 'B+', 'B', 'C+', 'C', 'D'];
        const bestGrade = sessions.reduce((best, session) => {
            const currentIdx = gradeOrder.indexOf(session.grade);
            const bestIdx = gradeOrder.indexOf(best);
            return (currentIdx !== -1 && (bestIdx === -1 || currentIdx < bestIdx))
                ? session.grade
                : best;
        }, '-');

        // 連続記録日数を計算
        const streak = calculateStreak(sessions);

        return {
            totalSessions,
            avgAccuracy,
            bestGrade,
            streak
        };
    }

    /**
     * 連続記録日数を計算
     */
    function calculateStreak(sessions) {
        if (sessions.length === 0) return 0;

        // セッションを日付でグループ化
        const dates = sessions.map(s => {
            const date = new Date(s.completedAt);
            return date.toDateString();
        });

        const uniqueDates = [...new Set(dates)].sort((a, b) =>
            new Date(b) - new Date(a)
        );

        // 今日から遡って連続日数をカウント
        const today = new Date().toDateString();
        let streak = 0;

        for (let i = 0; i < uniqueDates.length; i++) {
            const checkDate = new Date();
            checkDate.setDate(checkDate.getDate() - i);
            const checkDateStr = checkDate.toDateString();

            if (uniqueDates.includes(checkDateStr)) {
                streak++;
            } else {
                break;
            }
        }

        return streak;
    }

    /**
     * 統計を表示
     */
    function displayStatistics(stats) {
        document.getElementById('streak-count').textContent = stats.streak;
        document.getElementById('total-sessions').textContent = stats.totalSessions;
        document.getElementById('avg-accuracy').textContent = `±${stats.avgAccuracy}`;
        document.getElementById('best-grade').textContent = stats.bestGrade;

        // 改善状況メッセージ
        const statusEl = document.getElementById('improvement-status');
        if (stats.avgAccuracy <= 20) {
            statusEl.textContent = `平均誤差: ±${stats.avgAccuracy}¢ (素晴らしい！↗️)`;
            statusEl.className = 'text-lg text-green-300';
        } else if (stats.avgAccuracy <= 40) {
            statusEl.textContent = `平均誤差: ±${stats.avgAccuracy}¢ (良好！)`;
            statusEl.className = 'text-lg text-blue-300';
        } else {
            statusEl.textContent = `平均誤差: ±${stats.avgAccuracy}¢ (練習を続けよう！)`;
            statusEl.className = 'text-lg text-yellow-300';
        }
    }

    /**
     * セッション一覧を表示
     */
    function displaySessionList(sessions) {
        const container = document.getElementById('recent-sessions');
        const countEl = document.getElementById('records-count');

        countEl.textContent = `${sessions.length}件`;
        container.innerHTML = '';

        // 最新10件のみ表示
        const displaySessions = sessions.slice(0, 10);

        displaySessions.forEach(session => {
            const sessionCard = createSessionCard(session);
            container.appendChild(sessionCard);
        });
    }

    /**
     * セッションカードを作成
     */
    function createSessionCard(session) {
        const card = document.createElement('div');
        card.className = 'glass-card';
        card.style.cursor = 'pointer';
        card.onclick = () => viewSessionDetail(session);

        const date = new Date(session.completedAt);
        const dateStr = `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;

        // グレードに応じた色
        const gradeColors = {
            'S+': 'text-purple-300',
            'S': 'text-yellow-300',
            'A+': 'text-green-300',
            'A': 'text-green-300',
            'B+': 'text-blue-300',
            'B': 'text-blue-300',
            'C+': 'text-orange-300',
            'C': 'text-orange-300',
            'D': 'text-red-300'
        };
        const gradeColor = gradeColors[session.grade] || 'text-white';

        card.innerHTML = `
            <div class="flex items-center justify-between">
                <div class="flex items-center gap-3">
                    <i data-lucide="music" class="text-blue-300" style="width: 20px; height: 20px;"></i>
                    <div>
                        <div class="text-white font-medium">${session.mode === 'random' ? 'ランダム' : session.mode === 'continuous' ? '連続' : '12音階'}モード</div>
                        <div class="text-white-60 text-sm">${dateStr}</div>
                    </div>
                </div>
                <div class="flex items-center gap-4">
                    <div class="text-center">
                        <div class="${gradeColor} text-xl font-bold">${session.grade}</div>
                        <div class="text-white-60 text-xs">グレード</div>
                    </div>
                    <div class="text-center">
                        <div class="text-white text-lg">±${Math.abs(session.averageError).toFixed(1)}¢</div>
                        <div class="text-white-60 text-xs">平均誤差</div>
                    </div>
                    <i data-lucide="chevron-right" class="text-white-40" style="width: 20px; height: 20px;"></i>
                </div>
            </div>
        `;

        // Lucideアイコン再初期化
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }

        return card;
    }

    /**
     * セッション詳細を表示
     */
    function viewSessionDetail(session) {
        console.log('[Records] Viewing session detail:', session);
        // TODO: 詳細表示実装（将来のフェーズ）
        alert('セッション詳細表示は今後実装予定です');
    }

    /**
     * 精度推移グラフを表示
     */
    function displayAccuracyChart(sessions) {
        const canvas = document.getElementById('accuracyChart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');

        // 最新20件を取得して逆順（古い→新しい）
        const chartSessions = sessions.slice(0, 20).reverse();

        const labels = chartSessions.map((s, idx) => `${idx + 1}`);
        const data = chartSessions.map(s => Math.abs(s.averageError).toFixed(1));

        new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: '平均誤差（¢）',
                    data: data,
                    borderColor: 'rgba(52, 211, 153, 1)',
                    backgroundColor: 'rgba(52, 211, 153, 0.1)',
                    tension: 0.3,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: '誤差（セント）',
                            color: 'rgba(255, 255, 255, 0.7)'
                        },
                        ticks: {
                            color: 'rgba(255, 255, 255, 0.7)'
                        },
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'セッション',
                            color: 'rgba(255, 255, 255, 0.7)'
                        },
                        ticks: {
                            color: 'rgba(255, 255, 255, 0.7)'
                        },
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        }
                    }
                }
            }
        });
    }

    /**
     * データなしメッセージを表示
     */
    function showNoDataMessage() {
        document.getElementById('streak-count').textContent = '0';
        document.getElementById('total-sessions').textContent = '0';
        document.getElementById('avg-accuracy').textContent = '-';
        document.getElementById('best-grade').textContent = '-';
        document.getElementById('improvement-status').textContent = 'トレーニングを開始しましょう';
        document.getElementById('no-data-message').style.display = 'flex';
        document.getElementById('recent-sessions').style.display = 'none';

        // グラフセクションを非表示
        const chartSection = document.getElementById('accuracyChart').closest('.glass-card');
        if (chartSection) {
            chartSection.style.display = 'none';
        }
    }

    console.log('[Records] Controller loaded');
})();
