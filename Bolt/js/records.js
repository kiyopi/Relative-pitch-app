// ==========================================================================
// 相対音感トレーニングアプリ - 記録管理システム
// ==========================================================================

class TrainingRecordsManager {
    constructor() {
        this.storageKey = 'training-records-v1';
        this.maxFreeRecords = 7; // 無料版は7日間のみ
        this.records = this.loadRecords();
        this.isPremium = this.checkPremiumStatus();
        
        this.init();
    }

    init() {
        this.updateUI();
        this.setupEventListeners();
        this.renderAccuracyChart();
        this.renderRecentSessions();
    }

    // ローカルストレージから記録を読み込み
    loadRecords() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            if (!stored) return this.createDefaultRecords();
            
            const data = JSON.parse(stored);
            return this.validateRecords(data);
        } catch (error) {
            console.error('記録の読み込みに失敗:', error);
            return this.createDefaultRecords();
        }
    }

    // デフォルト記録データを生成
    createDefaultRecords() {
        const records = [];
        const today = new Date();
        
        // 直近7日間のサンプルデータを生成
        for (let i = 6; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(today.getDate() - i);
            
            const sessionCount = Math.floor(Math.random() * 3) + 1; // 1-3セッション
            for (let j = 0; j < sessionCount; j++) {
                records.push(this.generateSampleSession(date, j));
            }
        }
        
        this.saveRecords(records);
        return records;
    }

    // サンプルセッションデータを生成
    generateSampleSession(date, sessionIndex) {
        const modes = ['random', 'continuous', 'chromatic'];
        const mode = modes[Math.floor(Math.random() * modes.length)];
        
        // 徐々に改善する傾向を持たせる
        const dayIndex = Math.floor((new Date() - date) / (1000 * 60 * 60 * 24));
        const baseAccuracy = 25 - (7 - dayIndex) * 2; // 日が新しいほど精度向上
        const accuracy = Math.max(8, baseAccuracy + (Math.random() - 0.5) * 10);
        
        const passedNotes = Math.floor((8 * (50 - accuracy)) / 50); // 精度に応じて合格音数
        const score = this.calculateScore(accuracy, passedNotes);
        
        return {
            id: `session_${date.getTime()}_${sessionIndex}`,
            date: date.toISOString(),
            mode: mode,
            accuracy: Math.round(accuracy * 10) / 10,
            passedNotes: Math.max(3, Math.min(8, passedNotes)),
            totalNotes: 8,
            score: score,
            grade: this.calculateGrade(score),
            duration: Math.floor(Math.random() * 300) + 120 // 2-7分
        };
    }

    // スコア計算
    calculateScore(accuracy, passedNotes) {
        const accuracyScore = Math.max(0, (50 - accuracy) / 50 * 100);
        const passScore = (passedNotes / 8) * 100;
        return Math.round((accuracyScore + passScore) / 2);
    }

    // グレード計算
    calculateGrade(score) {
        if (score >= 90) return 'Excellent';
        if (score >= 75) return 'Good';
        if (score >= 60) return 'Pass';
        return 'Practice';
    }

    // 記録の検証
    validateRecords(records) {
        return records.filter(record => {
            return record.date && record.mode && 
                   typeof record.accuracy === 'number' && 
                   typeof record.score === 'number';
        });
    }

    // 記録を保存
    saveRecords(records) {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(records));
        } catch (error) {
            console.error('記録の保存に失敗:', error);
        }
    }

    // プレミアム状態をチェック
    checkPremiumStatus() {
        // 実装時はサーバーサイドで認証するが、今回はローカルストレージで擬似的に
        return localStorage.getItem('premium-status') === 'active';
    }

    // 新しい記録を追加
    addRecord(sessionData) {
        const record = {
            id: `session_${Date.now()}`,
            date: new Date().toISOString(),
            mode: sessionData.mode,
            accuracy: sessionData.accuracy,
            passedNotes: sessionData.passedNotes,
            totalNotes: sessionData.totalNotes,
            score: sessionData.score,
            grade: this.calculateGrade(sessionData.score),
            duration: sessionData.duration
        };

        this.records.unshift(record);
        
        // 無料版は最大数を超えた場合は古い記録を削除
        if (!this.isPremium && this.records.length > 50) {
            this.records = this.records.slice(0, 50);
        }

        this.saveRecords(this.records);
        this.updateUI();
    }

    // 統計情報を計算
    calculateStats() {
        const recentRecords = this.getRecentRecords();
        
        if (recentRecords.length === 0) {
            return {
                totalSessions: 0,
                avgAccuracy: 0,
                passRate: 0,
                streak: 0,
                improvement: 'データなし'
            };
        }

        const totalSessions = this.records.length;
        const avgAccuracy = recentRecords.reduce((sum, r) => sum + r.accuracy, 0) / recentRecords.length;
        const passedSessions = recentRecords.filter(r => r.grade !== 'Practice').length;
        const passRate = (passedSessions / recentRecords.length) * 100;
        
        // 連続記録の計算
        const streak = this.calculateStreak();
        
        // 改善傾向の計算
        const improvement = this.calculateImprovement();

        return {
            totalSessions,
            avgAccuracy: Math.round(avgAccuracy * 10) / 10,
            passRate: Math.round(passRate),
            streak,
            improvement
        };
    }

    // 最近の記録を取得（無料版は7日間のみ）
    getRecentRecords() {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - (this.isPremium ? 365 : 7));
        
        return this.records.filter(record => {
            return new Date(record.date) >= cutoffDate;
        });
    }

    // 連続記録を計算
    calculateStreak() {
        const today = new Date();
        let streak = 0;
        let currentDate = new Date(today);
        
        while (true) {
            const dateStr = currentDate.toDateString();
            const hasRecord = this.records.some(record => {
                return new Date(record.date).toDateString() === dateStr;
            });
            
            if (hasRecord) {
                streak++;
                currentDate.setDate(currentDate.getDate() - 1);
            } else {
                break;
            }
        }
        
        return streak;
    }

    // 改善傾向を計算
    calculateImprovement() {
        const recentRecords = this.getRecentRecords();
        if (recentRecords.length < 3) return '分析中...';

        const firstHalf = recentRecords.slice(-Math.ceil(recentRecords.length / 2));
        const secondHalf = recentRecords.slice(0, Math.floor(recentRecords.length / 2));
        
        const firstAvg = firstHalf.reduce((sum, r) => sum + r.accuracy, 0) / firstHalf.length;
        const secondAvg = secondHalf.reduce((sum, r) => sum + r.accuracy, 0) / secondHalf.length;
        
        const diff = firstAvg - secondAvg; // 精度が小さくなるほど改善
        
        if (diff < -2) return '改善中↗️';
        if (diff > 2) return '要注意↘️';
        return '安定📊';
    }

    // UIを更新
    updateUI() {
        const stats = this.calculateStats();
        
        // 統計情報の更新
        document.getElementById('streak-count').textContent = stats.streak;
        document.getElementById('total-sessions').textContent = stats.totalSessions;
        document.getElementById('avg-accuracy').textContent = `±${stats.avgAccuracy}`;
        document.getElementById('pass-rate').textContent = `${stats.passRate}%`;
        document.getElementById('improvement-status').textContent = 
            `平均精度: ±${stats.avgAccuracy}セント (${stats.improvement})`;
    }

    // 精度推移チャートを描画
    renderAccuracyChart() {
        const ctx = document.getElementById('accuracyChart').getContext('2d');
        const recentRecords = this.getRecentRecords().slice(-14); // 最新14日分
        
        // 日別の平均精度を計算
        const dailyData = this.groupByDate(recentRecords);
        const labels = Object.keys(dailyData).slice(-7); // 直近7日
        const data = labels.map(date => {
            const records = dailyData[date];
            const avgAccuracy = records.reduce((sum, r) => sum + r.accuracy, 0) / records.length;
            return avgAccuracy;
        });

        new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels.map(date => {
                    const d = new Date(date);
                    return `${d.getMonth() + 1}/${d.getDate()}`;
                }),
                datasets: [{
                    label: '平均精度（セント）',
                    data: data,
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: '#3b82f6',
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 2,
                    pointRadius: 6
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
                        beginAtZero: false,
                        reverse: true, // 小さい値（良い精度）が上に
                        title: {
                            display: true,
                            text: '精度（セント）',
                            color: '#ffffff'
                        },
                        ticks: {
                            color: '#ffffff',
                            callback: function(value) {
                                return `±${value}`;
                            }
                        },
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        }
                    },
                    x: {
                        ticks: {
                            color: '#ffffff'
                        },
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        }
                    }
                }
            }
        });
    }

    // 日付別にグループ化
    groupByDate(records) {
        return records.reduce((groups, record) => {
            const date = new Date(record.date).toDateString();
            if (!groups[date]) groups[date] = [];
            groups[date].push(record);
            return groups;
        }, {});
    }

    // 最近のセッションを描画
    renderRecentSessions() {
        const container = document.getElementById('recent-sessions');
        const recentRecords = this.getRecentRecords().slice(0, this.maxFreeRecords);
        
        container.innerHTML = recentRecords.map(record => {
            const date = new Date(record.date);
            const dateStr = `${date.getMonth() + 1}/${date.getDate()}`;
            const modeNames = {
                random: 'ランダム基音',
                continuous: '連続8回',
                chromatic: '12音階'
            };
            const gradeColors = {
                'Excellent': 'text-green-300',
                'Good': 'text-blue-300', 
                'Pass': 'text-yellow-300',
                'Practice': 'text-red-300'
            };
            const gradeIcons = {
                'Excellent': 'award',
                'Good': 'thumbs-up',
                'Pass': 'check',
                'Practice': 'frown'
            };

            return `
                <div class="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                    <div class="flex items-center space-x-3">
                        <div class="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                            <i data-lucide="${gradeIcons[record.grade]}" class="icon-sm ${gradeColors[record.grade]}"></i>
                        </div>
                        <div>
                            <div class="text-white font-medium">
                                ${dateStr} ${modeNames[record.mode]}
                            </div>
                            <div class="text-white-70 text-sm">
                                ${record.score}点 ±${record.accuracy}セント (${record.passedNotes}/${record.totalNotes}音)
                            </div>
                        </div>
                    </div>
                    <div class="text-right">
                        <div class="text-sm ${gradeColors[record.grade]} font-medium">
                            ${record.grade}
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        // Lucideアイコンを再初期化
        setTimeout(() => {
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
        }, 100);
    }

    // イベントリスナーを設定
    setupEventListeners() {
        // プレミアム版ボタン
        const premiumButtons = document.querySelectorAll('[id*="premium"], [onclick*="premium"]');
        premiumButtons.forEach(btn => {
            btn.addEventListener('click', () => this.showPremiumModal());
        });
    }

    // プレミアム版モーダルを表示
    showPremiumModal() {
        alert('🎉 プレミアム版の詳細機能を準備中です！\n\n✨ 全履歴表示\n📊 詳細分析\n🤖 AI推奨機能\n🎯 目標達成管理\n\nお楽しみに！');
    }
}

// 進捗共有機能
function shareProgress() {
    const stats = recordsManager.calculateStats();
    const text = `🎵 相対音感トレーニング記録\n\n🔥 ${stats.streak}日間連続達成！\n📊 平均精度: ±${stats.avgAccuracy}セント\n📈 合格率: ${stats.passRate}%\n\n#相対音感 #音楽トレーニング`;
    
    if (navigator.share) {
        navigator.share({
            title: '相対音感トレーニング記録',
            text: text,
            url: window.location.href
        });
    } else {
        // フォールバック: クリップボードにコピー
        navigator.clipboard.writeText(text).then(() => {
            alert('記録をクリップボードにコピーしました！');
        });
    }
}

// 目標設定機能
function setGoal() {
    alert('🎯 目標設定機能はプレミアム版限定です！\n\n💎 プレミアム版では以下が可能:\n• カスタム精度目標\n• 連続日数目標\n• 達成バッジシステム\n• 個別カリキュラム');
}

// 初期化
let recordsManager;
document.addEventListener('DOMContentLoaded', () => {
    // Lucideアイコンを初期化
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
    
    recordsManager = new TrainingRecordsManager();
    
    // 初期化後にもう一度アイコンを確認
    setTimeout(() => {
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }, 500);
});