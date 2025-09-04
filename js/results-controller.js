/**
 * 結果表示コントローラー - セッション・総合評価画面制御
 * 
 * @version 1.0.0
 * @description DataManagerと連携した評価結果表示・グラフ描画
 * @author Claude Code
 * @features セッション評価・総合評価・統計グラフ・ランク表示
 */

class ResultsController {
  constructor(type = 'session') {
    this.type = type; // 'session' | 'overall'
    this.currentData = null;
    this.chartInstances = [];
    
    // 評価ランク定義
    this.RANKS = {
      excellent: {
        name: 'Excellent',
        icon: 'trophy',
        color: 'text-yellow-300',
        threshold: 15,
        score: 100
      },
      good: {
        name: 'Good',
        icon: 'star',
        color: 'text-green-300',
        threshold: 25,
        score: 80
      },
      pass: {
        name: 'Pass',
        icon: 'thumbs-up',
        color: 'text-blue-300',
        threshold: 40,
        score: 60
      },
      practice: {
        name: 'Practice',
        icon: 'triangle-alert',
        color: 'text-red-300',
        threshold: Infinity,
        score: 30
      }
    };
    
    // 総合グレード定義
    this.GRADES = {
      S: { min: 95, label: 'S級', color: '#fbbf24', icon: 'crown' },
      A: { min: 85, label: 'A級', color: '#86efac', icon: 'trophy' },
      B: { min: 75, label: 'B級', color: '#60a5fa', icon: 'star' },
      C: { min: 65, label: 'C級', color: '#c084fc', icon: 'check-circle' },
      D: { min: 50, label: 'D級', color: '#fda4af', icon: 'target' },
      E: { min: 0, label: 'E級', color: '#cbd5e1', icon: 'book-open' }
    };
  }

  /**
   * 初期化
   */
  async initialize() {
    try {
      if (this.type === 'session') {
        await this.loadSessionResult();
      } else {
        await this.loadOverallEvaluation();
      }
      
      this.renderResults();
      
      // 静的コンテンツの動的置換
      if (this.type === 'session') {
        this.replaceStaticSessionContent();
      } else {
        this.replaceStaticOverallContent();
      }
      
      this.attachEventListeners();
      
      console.log('📊 ResultsController初期化完了:', this.type);
      return { success: true };
      
    } catch (error) {
      console.error('ResultsController初期化失敗:', error);
      this.showError('結果の読み込みに失敗しました');
      return { success: false, error: error.message };
    }
  }

  /**
   * セッション結果読み込み
   */
  async loadSessionResult() {
    // URLパラメータからセッションIDを取得
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get('session');
    
    console.log('🔍 セッションデータ検索中...', { sessionId });
    
    if (sessionId) {
      // 特定セッション取得
      const sessions = DataManager.getSessionHistory();
      console.log('📋 セッション履歴:', sessions);
      this.currentData = sessions.find(s => s.sessionId === sessionId);
    } else {
      // 最新セッション取得
      this.currentData = DataManager.getLatestSession();
      console.log('📊 最新セッション:', this.currentData);
    }
    
    if (!this.currentData) {
      console.warn('⚠️ セッションデータなし - テストデータを作成してください');
      // テストデータがない場合の警告表示
      this.showError('テストデータを作成してください。test-data-setup.htmlで「セッション評価データ作成」を実行してください。');
      return;
    }
    
    console.log('✅ セッションデータ読み込み成功:', this.currentData);
  }

  /**
   * 総合評価読み込み
   */
  async loadOverallEvaluation() {
    // URLパラメータからモードを取得
    const params = new URLSearchParams(window.location.search);
    const mode = params.get('mode') || 'random';
    
    console.log('🔍 総合評価データ検索中...', { mode });
    
    this.currentData = DataManager.getLatestEvaluation(mode);
    console.log('📊 総合評価データ:', this.currentData);
    
    if (!this.currentData) {
      console.warn('⚠️ 総合評価データなし - テストデータを作成してください');
      this.showError('テストデータを作成してください。test-data-setup.htmlで「総合評価データ作成」を実行してください。');
      return;
    }
    
    console.log('✅ 総合評価データ読み込み成功:', this.currentData);
  }

  /**
   * 結果表示レンダリング
   */
  renderResults() {
    if (this.type === 'session') {
      this.renderSessionResults();
    } else {
      this.renderOverallResults();
    }
  }

  /**
   * セッション結果表示
   */
  renderSessionResults() {
    const data = this.currentData;
    const summary = data.sessionSummary;
    
    // ヘッダー更新
    this.updateSessionHeader(data);
    
    // 進行バー更新
    this.updateProgressBar(data);
    
    // スコア・評価表示
    this.displaySessionScore(summary);
    
    // 音程別結果表示
    this.displayNoteResults(data.detectionResults);
    
    // 統計情報表示
    this.displaySessionStats(summary);
  }

  /**
   * セッションヘッダー更新（統一コンポーネント）
   */
  updateSessionHeader(data) {
    this.renderPageHeader({
      title: `セッション ${data.sessionNumber} 完了！`,
      subtitle: `基音 ${data.baseNote?.note || 'C4'} - 8音の評価結果`,
      icon: 'circle-check-big',
      iconClass: 'gradient-catalog-blue'
    });
  }

  /**
   * 総合評価ヘッダー更新
   */
  updateOverallHeader(data) {
    const mode = data.mode || 'random';
    const sessionCount = this.getMaxSessionsForMode(mode);
    const totalNotes = sessionCount * 8;
    
    this.renderPageHeader({
      title: '総合評価',
      subtitle: `${sessionCount}セッション (${totalNotes}音) の総合評価`,
      icon: 'file-chart-column-increasing',
      iconClass: 'gradient-catalog-purple'
    });
  }

  /**
   * ページヘッダー統一レンダリング
   */
  renderPageHeader({ title, subtitle, icon, iconClass }) {
    const titleEl = document.querySelector('.page-title');
    const subtitleEl = document.querySelector('.page-subtitle');
    const iconEl = document.querySelector('.page-header-icon i[data-lucide]');
    const iconWrapperEl = document.querySelector('.page-header-icon');
    
    if (titleEl) titleEl.textContent = title;
    if (subtitleEl) subtitleEl.textContent = subtitle;
    if (iconEl) iconEl.setAttribute('data-lucide', icon);
    if (iconWrapperEl) {
      iconWrapperEl.className = `page-header-icon ${iconClass}`;
    }
    
    if (window.lucide) {
      lucide.createIcons();
    }
  }

  /**
   * 進行バー更新
   */
  updateProgressBar(data) {
    const progressFill = document.querySelector('.progress-fill');
    const sessionBadge = document.querySelector('.session-badge');
    
    const mode = data.mode || 'random';
    const maxSessions = this.getMaxSessionsForMode(mode);
    const progressPercent = Math.round((data.sessionNumber / maxSessions) * 100);
    
    if (progressFill) {
      progressFill.style.width = progressPercent + '%';
    }
    
    if (sessionBadge) {
      sessionBadge.textContent = `セッション ${data.sessionNumber}/${maxSessions}`;
    }
  }

  /**
   * セッションスコア表示
   */
  displaySessionScore(summary) {
    // メインスコア
    const scoreElement = document.querySelector('.score-number');
    if (scoreElement) {
      scoreElement.textContent = Math.round(summary.totalScore);
    }
    
    // 評価ランク
    const rank = this.getScoreRank(summary.totalScore);
    this.updateRankDisplay(rank);
    
    // 評価テキスト
    const evaluationText = document.querySelector('.evaluation-text');
    if (evaluationText) {
      evaluationText.textContent = this.getEvaluationMessage(rank);
    }
  }

  /**
   * ランク表示更新
   */
  updateRankDisplay(rank) {
    // トロフィーアイコン更新
    const trophyIcon = document.querySelector('.accuracy-badge i[data-lucide]');
    if (trophyIcon) {
      trophyIcon.setAttribute('data-lucide', rank.icon);
      trophyIcon.className = rank.color + ' accuracy-icon';
    }
    
    // 評価メッセージ更新
    const evaluationText = document.querySelector('.trophy-section p');
    if (evaluationText) {
      evaluationText.textContent = this.getEvaluationMessage(rank);
    }
    
    // バッジのクラス更新
    const accuracyBadge = document.querySelector('.accuracy-badge');
    if (accuracyBadge) {
      // 既存のクラスをクリア
      accuracyBadge.className = accuracyBadge.className.replace(/accuracy-badge-(excellent|good|pass|practice)/, '');
      // 新しいクラスを追加
      accuracyBadge.classList.add(`accuracy-badge-${rank.name.toLowerCase()}`);
    }
    
    // Lucideアイコン再初期化
    if (window.lucide) {
      lucide.createIcons();
    }
  }

  /**
   * 音程別結果表示（統一コンポーネント）
   */
  displayNoteResults(detectionResults, containerSelector = '#note-results') {
    const container = document.querySelector(containerSelector);
    if (!container) return;
    
    const notes = ['ド', 'レ', 'ミ', 'ファ', 'ソ', 'ラ', 'シ', 'ド'];
    
    container.innerHTML = this.renderNoteResultItems(detectionResults, notes);
    
    if (window.lucide) {
      lucide.createIcons();
    }
  }

  /**
   * 音程別結果アイテム統一レンダリング
   */
  renderNoteResultItems(detectionResults, notes) {
    return detectionResults.map((result, index) => {
      const noteName = notes[index] || result.targetInterval;
      const rank = this.getCentErrorRank(Math.abs(result.evaluation.centError));
      const centError = result.evaluation.centError;
      const targetFreq = result.targetFrequency || 0;
      const actualFreq = result.detectedFrequency || 0;
      
      return `
        <div class="note-result-item">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-4">
              <div>
                <div class="text-sub-title">${noteName}</div>
              </div>
              <div>
                <div class="text-body">目標 ${Math.round(targetFreq)}Hz</div>
                <div class="text-body">実音 ${Math.round(actualFreq)}Hz</div>
              </div>
            </div>
            <div class="flex items-center gap-3">
              <div class="${centError >= 0 ? 'text-pitch-deviation-plus' : 'text-pitch-deviation-minus'}">
                ${centError > 0 ? '+' : ''}${centError.toFixed(1)}¢
              </div>
              <div class="flex items-center justify-center">
                <i data-lucide="${rank.icon}" class="${rank.color}" style="width: 28px; height: 28px;${rank.icon === 'thumbs-up' ? ' transform: translateY(-2px) translateX(2px);' : ''}"></i>
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  /**
   * セッション統計表示
   */
  displaySessionStats(summary) {
    // 平均誤差
    const avgError = document.querySelector('.avg-error');
    if (avgError) {
      avgError.textContent = `±${summary.averageCentError.toFixed(1)}¢`;
    }
    
    // 成功率
    const successRate = document.querySelector('.success-rate');
    if (successRate) {
      successRate.textContent = `${(summary.successRate * 100).toFixed(0)}%`;
    }
    
    // 評価分布
    this.displayEvaluationDistribution(summary);
  }

  /**
   * 評価分布表示（統一コンポーネント）
   */
  displayEvaluationDistribution(summary, containerSelector = '.evaluation-distribution') {
    const container = document.querySelector(containerSelector);
    if (!container) return;
    
    const total = 8; // 8音
    const distributions = [
      { rank: 'excellent', count: summary.excellentCount || 0 },
      { rank: 'good', count: summary.goodCount || 0 },
      { rank: 'pass', count: summary.passCount || 0 },
      { rank: 'practice', count: summary.practiceCount || 0 }
    ];
    
    container.innerHTML = this.renderEvaluationDistributionBars(distributions, total);
    
    if (window.lucide) {
      lucide.createIcons();
    }
  }

  /**
   * 評価分布バー統一レンダリング
   */
  renderEvaluationDistributionBars(distributions, total = 8) {
    return distributions.map(dist => {
      const rank = this.RANKS[dist.rank];
      const percentage = total > 0 ? (dist.count / total * 100).toFixed(0) : 0;
      
      return `
        <div class="flex items-center gap-3">
          <i data-lucide="${rank.icon}" class="${rank.color}" style="width: 20px; height: 20px; flex-shrink: 0;"></i>
          <div class="progress-bar flex">
            <div class="progress-fill-custom ${this.getRankColorClass(dist.rank)}" style="width: ${percentage}%;"></div>
          </div>
          <span class="text-sm text-white-60" style="min-width: 20px; text-align: right;">${dist.count}</span>
        </div>
      `;
    }).join('');
  }

  /**
   * 総合評価結果表示
   */
  renderOverallResults() {
    const data = this.currentData;
    const evaluation = data.finalEvaluation;
    
    // ヘッダー更新
    this.updateOverallHeader(data);
    
    // グレード表示
    this.displayGrade(evaluation.dynamicGrade);
    
    // スコア表示
    this.displayOverallScore(evaluation);
    
    // 評価分布表示（総合評価ページ用）
    this.displayEvaluationDistribution(evaluation, '.flex.flex-col.gap-3');
    
    // 統計グラフ描画
    this.renderStatisticsCharts(data.statistics);
    
    // セッション履歴表示
    this.displaySessionHistory(data.sessionData);
    
    // セッショングリッド表示
    this.displaySessionGrid(data.sessionData);
    
    // 詳細分析表示
    this.displayDetailedAnalysis(data);
  }

  /**
   * グレード表示
   */
  displayGrade(gradeKey) {
    const grade = this.GRADES[gradeKey];
    if (!grade) return;
    
    const gradeElement = document.querySelector('.grade-display');
    if (gradeElement) {
      gradeElement.innerHTML = `
        <div class="grade-icon-wrapper">
          <i data-lucide="${grade.icon}" class="grade-icon" style="color: ${grade.color}; width: 80px; height: 80px;"></i>
        </div>
        <div class="grade-label">${grade.label}</div>
      `;
      
      if (window.lucide) {
        lucide.createIcons();
      }
    }
  }

  /**
   * 総合スコア表示
   */
  displayOverallScore(evaluation) {
    const scoreElement = document.querySelector('.overall-score');
    if (scoreElement) {
      scoreElement.textContent = Math.round(evaluation.finalScore);
    }
    
    // Excellence率
    const excellenceRatio = document.querySelector('.excellence-ratio');
    if (excellenceRatio) {
      excellenceRatio.textContent = `${(evaluation.excellenceRatio * 100).toFixed(0)}%`;
    }
  }

  /**
   * 統計グラフ描画
   */
  renderStatisticsCharts(statistics) {
    // セント誤差推移グラフ
    this.renderErrorTrendChart(statistics);
    
    // 音程別精度グラフ
    this.renderNoteAccuracyChart(statistics.noteStatistics);
  }

  /**
   * エラー推移グラフ
   */
  renderErrorTrendChart(_statistics) {
    const canvas = document.getElementById('error-trend-chart');
    if (!canvas) return;
    
    // TODO: Chart.js統合
    // 仮実装：Canvas描画
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#86efac';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  /**
   * 音程別精度グラフ
   */
  renderNoteAccuracyChart(noteStats) {
    const container = document.querySelector('.note-accuracy-chart');
    if (!container) return;
    
    const notes = Object.keys(noteStats);
    container.innerHTML = notes.map(note => {
      const stats = noteStats[note];
      const accuracy = (stats.successRate * 100).toFixed(0);
      
      return `
        <div class="note-accuracy-item">
          <div class="note-label">${note}</div>
          <div class="progress-bar">
            <div class="progress-fill gradient-catalog-green" style="width: ${accuracy}%;"></div>
          </div>
          <div class="accuracy-value">${accuracy}%</div>
        </div>
      `;
    }).join('');
  }

  /**
   * セッショングリッド表示
   */
  displaySessionGrid(sessionIds) {
    const container = document.querySelector('#session-grid-container');
    if (!container) return;
    
    const sessions = sessionIds.map(id => {
      const allSessions = DataManager.getSessionHistory();
      return allSessions.find(s => s.sessionId === id);
    }).filter(Boolean);
    
    const gridClass = sessionIds.length <= 8 ? 'sessions-grid-8' : 'sessions-grid-12';
    
    container.innerHTML = `
      <div class="${gridClass}">
        ${sessions.map((session, index) => {
          const rank = this.getScoreRank(session.sessionSummary.totalScore);
          const rankClass = this.getSessionBoxClass(rank);
          
          return `
            <div class="session-box ${rankClass}">
              <div class="session-number">${index + 1}</div>
              <div class="session-icon">
                <i data-lucide="${rank.icon}" class="${rank.color}"></i>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
    
    if (window.lucide) {
      lucide.createIcons();
    }
  }

  /**
   * セッションボックスのクラス取得
   */
  getSessionBoxClass(rank) {
    const classMap = {
      excellent: 'session-excellent',
      good: 'session-good', 
      pass: 'session-pass',
      practice: 'session-practice'
    };
    return classMap[rank.name.toLowerCase()] || 'session-pass';
  }

  /**
   * 詳細分析表示
   */
  displayDetailedAnalysis(data) {
    // 最初のセッションを表示
    const sessions = data.sessionData.map(id => {
      const allSessions = DataManager.getSessionHistory();
      return allSessions.find(s => s.sessionId === id);
    }).filter(Boolean);
    
    if (sessions.length === 0) return;
    
    // デフォルトで最初のセッションを表示
    this.showDetailedSession(sessions[0], 1);
    
    // セッション切り替えボタンの設定
    this.setupDetailNavigation(sessions);
  }
  
  /**
   * 詳細セッション表示
   */
  showDetailedSession(sessionData, sessionNumber) {
    // セッション番号更新
    const titleEl = document.querySelector('.detail-analysis-title span:last-child');
    if (titleEl) {
      titleEl.textContent = `セッション${sessionNumber}`;
    }
    
    // 基音表示
    const baseNoteEl = document.querySelector('.score-base-note');
    if (baseNoteEl) {
      baseNoteEl.textContent = sessionData.baseNote?.note || 'C4';
    }
    
    // 平均誤差表示
    const avgErrorEl = document.querySelector('.score-average');
    if (avgErrorEl) {
      avgErrorEl.textContent = `±${sessionData.sessionSummary?.averageCentError?.toFixed(1) || '0.0'}¢`;
    }
    
    // トロフィーアイコンと評価メッセージ
    const rank = this.getScoreRank(sessionData.sessionSummary?.totalScore || 0);
    const trophyIcon = document.querySelector('.accuracy-badge i[data-lucide]');
    if (trophyIcon) {
      trophyIcon.setAttribute('data-lucide', rank.icon);
      trophyIcon.className = rank.color + ' accuracy-icon';
    }
    
    const evaluationMsg = document.querySelector('.accuracy-badge-container + p');
    if (evaluationMsg) {
      evaluationMsg.textContent = this.getEvaluationMessage(rank);
    }
    
    // 詳細音程結果表示
    this.displayNoteResults(sessionData.detectionResults, '#detail-note-results');
    
    if (window.lucide) {
      lucide.createIcons();
    }
  }
  
  /**
   * 詳細分析ナビゲーション設定
   */
  setupDetailNavigation(sessions) {
    let currentIndex = 0;
    
    const prevBtn = document.querySelector('.section-header button:first-child');
    const nextBtn = document.querySelector('.section-header button:last-child');
    
    const updateNav = () => {
      if (prevBtn) prevBtn.disabled = currentIndex === 0;
      if (nextBtn) nextBtn.disabled = currentIndex === sessions.length - 1;
    };
    
    if (prevBtn) {
      prevBtn.onclick = () => {
        if (currentIndex > 0) {
          currentIndex--;
          this.showDetailedSession(sessions[currentIndex], currentIndex + 1);
          updateNav();
        }
      };
    }
    
    if (nextBtn) {
      nextBtn.onclick = () => {
        if (currentIndex < sessions.length - 1) {
          currentIndex++;
          this.showDetailedSession(sessions[currentIndex], currentIndex + 1);
          updateNav();
        }
      };
    }
    
    updateNav();
  }

  /**
   * セッション履歴表示
   */
  displaySessionHistory(sessionIds) {
    const container = document.querySelector('.session-history');
    if (!container) return;
    
    const sessions = sessionIds.map(id => {
      const allSessions = DataManager.getSessionHistory();
      return allSessions.find(s => s.sessionId === id);
    }).filter(Boolean);
    
    container.innerHTML = sessions.map((session, index) => {
      const rank = this.getScoreRank(session.sessionSummary.totalScore);
      
      return `
        <div class="session-history-item">
          <div class="session-number">セッション ${index + 1}</div>
          <div class="session-score">
            <i data-lucide="${rank.icon}" class="${rank.color}"></i>
            <span>${Math.round(session.sessionSummary.totalScore)}</span>
          </div>
        </div>
      `;
    }).join('');
    
    if (window.lucide) {
      lucide.createIcons();
    }
  }

  /**
   * 共通: 静的HTMLの置き換え（セッション評価ページ）
   */
  replaceStaticSessionContent() {
    // 評価分布バー部分を動的化
    const distribContainer = document.querySelector('.flex.flex-col.gap-3');
    if (distribContainer && this.currentData) {
      distribContainer.innerHTML = this.renderEvaluationDistributionBars([
        { rank: 'excellent', count: this.currentData.sessionSummary.excellentCount || 0 },
        { rank: 'good', count: this.currentData.sessionSummary.goodCount || 0 },
        { rank: 'pass', count: this.currentData.sessionSummary.passCount || 0 },
        { rank: 'practice', count: this.currentData.sessionSummary.practiceCount || 0 }
      ]);
    }
    
    // 音程別結果を動的化
    if (this.currentData?.detectionResults) {
      this.displayNoteResults(this.currentData.detectionResults);
    }
  }

  /**
   * 共通: 静的HTMLの置き換え（総合評価ページ）
   */
  replaceStaticOverallContent() {
    // セッショングリッドを動的化
    if (this.currentData?.sessionData) {
      this.displaySessionGrid(this.currentData.sessionData);
    }
    
    // 評価分布を動的化
    const distribContainer = document.querySelector('.flex.flex-col.gap-3');
    if (distribContainer && this.currentData) {
      distribContainer.innerHTML = this.renderEvaluationDistributionBars([
        { rank: 'excellent', count: this.currentData.finalEvaluation.excellentCount || 0 },
        { rank: 'good', count: this.currentData.finalEvaluation.goodCount || 0 },
        { rank: 'pass', count: this.currentData.finalEvaluation.passCount || 0 },
        { rank: 'practice', count: this.currentData.finalEvaluation.practiceCount || 0 }
      ]);
    }
  }

  /**
   * スコアランク取得
   */
  getScoreRank(score) {
    if (score >= 90) return this.RANKS.excellent;
    if (score >= 75) return this.RANKS.good;
    if (score >= 60) return this.RANKS.pass;
    return this.RANKS.practice;
  }

  /**
   * セント誤差ランク取得
   */
  getCentErrorRank(centError) {
    if (centError <= 15) return this.RANKS.excellent;
    if (centError <= 25) return this.RANKS.good;
    if (centError <= 40) return this.RANKS.pass;
    return this.RANKS.practice;
  }

  /**
   * ランクカラークラス取得
   */
  getRankColorClass(rank) {
    const colors = {
      excellent: 'color-eval-gold',
      good: 'color-eval-good',
      pass: 'color-eval-pass',
      practice: 'color-eval-practice'
    };
    return colors[rank] || 'color-eval-pass';
  }

  /**
   * 評価メッセージ取得
   */
  getEvaluationMessage(rank) {
    const messages = {
      excellent: '素晴らしい精度です！この調子で続けましょう。',
      good: '良い精度です！もう少しで完璧です。',
      pass: '合格レベルです。練習を続けましょう。',
      practice: 'もう少し練習が必要です。頑張りましょう！'
    };
    return messages[rank.name.toLowerCase()] || '';
  }

  /**
   * モード別最大セッション数
   */
  getMaxSessionsForMode(mode) {
    const maxSessions = {
      random: 8,
      continuous: 12,
      twelve: 12,
      weakness: 16
    };
    return maxSessions[mode] || 8;
  }

  /**
   * イベントリスナー設定
   */
  attachEventListeners() {
    // 次へボタン
    const nextButton = document.querySelector('.btn-next');
    if (nextButton) {
      nextButton.addEventListener('click', () => {
        this.navigateNext();
      });
    }
    
    // 共有ボタン
    const shareButton = document.querySelector('.btn-share');
    if (shareButton) {
      shareButton.addEventListener('click', () => {
        this.shareResults();
      });
    }
    
    // ランク説明ポップオーバー
    const rankInfoBtn = document.querySelector('.rank-info-btn');
    if (rankInfoBtn) {
      rankInfoBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleRankPopover();
      });
    }
  }

  /**
   * 次へナビゲート
   */
  navigateNext() {
    if (this.type === 'session') {
      const mode = this.currentData.mode || 'random';
      const nextSession = this.currentData.sessionNumber + 1;
      const maxSessions = this.getMaxSessionsForMode(mode);
      
      if (nextSession <= maxSessions) {
        window.location.href = `training.html?mode=${mode}&session=${nextSession}`;
      } else {
        window.location.href = `results-overview.html?mode=${mode}`;
      }
    } else {
      window.location.href = 'index.html';
    }
  }

  /**
   * 結果共有
   */
  async shareResults() {
    try {
      const shareData = {
        title: '8va相対音感トレーニング結果',
        text: this.generateShareText(),
        url: window.location.href
      };
      
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        // フォールバック: クリップボードにコピー
        await navigator.clipboard.writeText(shareData.text);
        this.showToast('結果をクリップボードにコピーしました');
      }
    } catch (error) {
      console.error('共有エラー:', error);
    }
  }

  /**
   * 共有テキスト生成
   */
  generateShareText() {
    if (this.type === 'session') {
      const summary = this.currentData.sessionSummary;
      return `8va相対音感トレーニング\nセッション ${this.currentData.sessionNumber} 完了！\nスコア: ${Math.round(summary.totalScore)}\n平均誤差: ±${summary.averageCentError.toFixed(1)}¢`;
    } else {
      const evaluation = this.currentData.finalEvaluation;
      return `8va相対音感トレーニング\n総合評価: ${evaluation.dynamicGrade}級\nスコア: ${Math.round(evaluation.finalScore)}`;
    }
  }

  /**
   * ランクポップオーバー切り替え
   */
  toggleRankPopover() {
    const popover = document.getElementById('rank-popover');
    if (popover) {
      popover.classList.toggle('show');
    }
  }

  /**
   * トースト表示
   */
  showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast toast-info';
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.classList.add('toast-fade-out');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  /**
   * エラー表示
   */
  showError(message) {
    const errorContainer = document.querySelector('.error-container');
    if (errorContainer) {
      errorContainer.innerHTML = `
        <div class="error-message">
          <i data-lucide="alert-circle" class="text-red-300"></i>
          <span>${message}</span>
        </div>
      `;
      
      if (window.lucide) {
        lucide.createIcons();
      }
    }
  }
}

// グローバル公開
window.ResultsController = ResultsController;

// ページ読み込み時に自動初期化
document.addEventListener('DOMContentLoaded', () => {
  // DataManagerの存在確認
  if (typeof DataManager === 'undefined') {
    console.error('DataManager が読み込まれていません');
    return;
  }
  
  // ページ判定（URLから判断）
  const path = window.location.pathname;
  const type = path.includes('session') ? 'session' : 'overall';
  
  window.resultsController = new ResultsController(type);
  window.resultsController.initialize();
});