/**
 * 相対音感トレーニングアプリ専用UIカタログ
 * Vanilla TypeScript用のUIコンポーネント集
 */

// ===== 型定義 =====
export interface EvaluationData {
  cents: number;
  label?: string;
  icon?: string;
}

export interface SessionData {
  num: number;
  cents: number;
  baseNote?: string; // 表示しない（相対音感原則）
}

export interface NoteData {
  name: string;
  cents: number;
  colorVar: string;
}

// ===== 評価アイコン判定 =====
export const getEvaluationIcon = (cents: number): string => {
  const absCents = Math.abs(cents);
  if (absCents <= 10) return '🏆'; // Excellent (±10セント以内)
  if (absCents <= 25) return '🎉'; // Good (±25セント以内)
  if (absCents <= 50) return '👍'; // Pass (±50セント以内)
  return '😭'; // Need Work (±50セント超)
};

export const getEvaluationLabel = (cents: number): string => {
  const absCents = Math.abs(cents);
  if (absCents <= 10) return 'Excellent';
  if (absCents <= 25) return 'Good';
  if (absCents <= 50) return 'Pass';
  return 'Need Work';
};

// ===== 1. 評価カード =====
export const evaluationCard = (value: string, label: string, isIcon: boolean = false): string => `
  <div class="evaluation-card">
    <div class="evaluation-value" ${isIcon ? 'style="font-size: 32px;"' : ''}>${value}</div>
    <div class="evaluation-label">${label}</div>
  </div>
`;

// ===== 2. セッション履歴アイテム（展開式） =====
export const sessionHistoryItem = (data: SessionData): string => {
  const icon = getEvaluationIcon(data.cents);
  const label = getEvaluationLabel(data.cents);
  
  return `
    <div class="session-item" onclick="toggleSessionDetail(${data.num})">
      <span>セッション ${data.num}</span>
      <div style="display: flex; gap: 8px; align-items: center;">
        <span class="session-score">±${Math.abs(data.cents)}セント</span>
        <span style="font-size: 20px;">${icon}</span>
        <span class="expand-icon">▼</span>
      </div>
    </div>
    <div class="session-detail" id="session-${data.num}-detail" style="display: none;">
      <div style="padding: 12px; background: var(--mantine-color-gray-0); border-radius: 4px;">
        <p><strong>評価:</strong> ${icon} ${label}</p>
        <p><strong>平均精度:</strong> ±${Math.abs(data.cents)}セント</p>
        <p style="color: var(--mantine-color-gray-6); font-size: 12px;">
          ※相対音感トレーニングのため基音情報は非表示
        </p>
      </div>
    </div>
  `;
};

// ===== 3. 音階別評価アイテム =====
export const noteEvaluationItem = (data: NoteData): string => {
  const icon = getEvaluationIcon(data.cents);
  
  return `
    <div class="session-item" style="flex-direction: column; text-align: center;">
      <div style="font-weight: 600; color: var(${data.colorVar});">${data.name}</div>
      <div style="font-size: 24px;">${icon}</div>
      <div style="font-size: 12px; color: var(--mantine-color-gray-6);">
        ${data.cents >= 0 ? '+' : ''}${data.cents}¢
      </div>
    </div>
  `;
};

// ===== 4. 統合進行バー =====
export const integratedProgressBar = (percentage: number = 0): string => `
  <div class="integrated-progress">
    <div class="progress-sections">
      <div class="section base-tone">基音再生(2.0秒)</div>
      <div class="section rest">休憩</div>
      <div class="section start-marker">🎯開始</div>
    </div>
    <div class="progress-bar">
      <div class="progress-fill" style="width: ${percentage}%;"></div>
    </div>
    <div class="time-indicator">
      <span>0.0秒</span>
      <span>2.5秒</span>
    </div>
  </div>
`;

// ===== 5. ドレミガイド円 =====
export const noteCircles = (activeIndex: number = -1): string => {
  const notes = ['ド', 'レ', 'ミ', 'ファ', 'ソ', 'ラ', 'シ', 'ド'];
  
  return `
    <div class="note-circles-container">
      ${notes.map((note, index) => `
        <div class="note-circle ${index === activeIndex ? 'active' : ''} ${index < activeIndex ? 'completed' : ''}">
          ${note}
        </div>
      `).join('')}
    </div>
  `;
};

// ===== 6. S-E級総合評価 =====
export const gradeDisplay = (grade: string, message: string): string => {
  const colors: Record<string, string> = {
    'S': 'yellow',
    'A': 'green',
    'B': 'green',
    'C': 'blue',
    'D': 'gray',
    'E': 'gray'
  };
  
  const color = colors[grade] || 'gray';
  
  return `
    <div style="text-align: center; padding: var(--session-spacing) 0;">
      <div style="font-size: 72px; font-weight: 900; color: var(--mantine-color-${color}-6); margin-bottom: 8px;">
        ${grade}級
      </div>
      <div style="font-size: 18px; color: var(--mantine-color-gray-7);">
        ${message}
      </div>
    </div>
  `;
};

// ===== 7. モード選択カード =====
export const modeCard = (
  emoji: string,
  title: string,
  difficulty: string,
  description: string,
  badge?: string
): string => `
  <div class="mode-card">
    <div class="mode-header">
      <span class="mode-emoji">${emoji}</span>
      <span class="mode-title">${title}</span>
    </div>
    ${badge ? `<div class="mode-badge">${badge}</div>` : ''}
    <div class="mode-difficulty">難易度: ${difficulty}</div>
    <div class="mode-description">${description}</div>
    <button class="btn btn-primary btn-large">このモードで始める</button>
  </div>
`;

// ===== 8. アラート/通知 =====
export const alert = (
  title: string,
  message: string,
  type: 'info' | 'success' | 'warning' | 'error' = 'info'
): string => {
  const colors = {
    info: 'blue',
    success: 'green',
    warning: 'yellow',
    error: 'red'
  };
  const color = colors[type];
  const icons = {
    info: '💡',
    success: '✅',
    warning: '⚠️',
    error: '❌'
  };
  const icon = icons[type];
  
  return `
    <div style="background: var(--mantine-color-${color}-0); 
                border-radius: 8px; 
                padding: var(--training-spacing); 
                margin: var(--session-spacing) 0; 
                border-left: 4px solid var(--mantine-color-${color}-6);">
      <h4 style="color: var(--mantine-color-${color}-8); margin-bottom: 8px;">
        ${icon} ${title}
      </h4>
      <p style="color: var(--mantine-color-${color}-7); font-size: 14px; margin: 0;">
        ${message}
      </p>
    </div>
  `;
};

// ===== 9. ボタン =====
export const button = (
  text: string,
  variant: 'primary' | 'secondary' | 'success' | 'danger' = 'primary',
  icon?: string,
  size: 'small' | 'medium' | 'large' = 'medium'
): string => `
  <button class="btn btn-${variant} btn-${size}">
    ${icon ? `${icon} ` : ''}${text}
  </button>
`;

// ===== 10. プログレスバー =====
export const progressBar = (percentage: number, label?: string): string => `
  <div class="progress-container">
    ${label ? `<div class="progress-label">${label}</div>` : ''}
    <div class="progress-bar">
      <div class="progress-fill" style="width: ${percentage}%;"></div>
    </div>
    <div class="progress-percentage">${percentage}%</div>
  </div>
`;

// ===== 11. 設定項目 =====
export const settingItem = (label: string, control: string): string => `
  <div class="setting-item">
    <span>${label}</span>
    ${control}
  </div>
`;

// ===== 12. 音量メーター =====
export const volumeMeter = (level: number = 60): string => `
  <div class="volume-meter">
    <div class="volume-label">音量確認</div>
    <div class="volume-bar">
      <div class="volume-fill" style="width: ${level}%;"></div>
    </div>
    <div class="volume-status">
      ${level < 30 ? '音量が小さすぎます' : 
        level > 80 ? '音量が大きすぎます' : 
        '適切な音量です'}
    </div>
  </div>
`;

// ===== 複合コンポーネント生成クラス =====
export class AppUiCatalog {
  /**
   * セッション評価画面を生成
   */
  static createSessionEvaluation(data: {
    avgCents: number;
    passedNotes: number;
    totalNotes: number;
    needWorkCount: number;
  }): string {
    const icon = getEvaluationIcon(data.avgCents);
    const label = getEvaluationLabel(data.avgCents);
    
    return `
      <div class="evaluation-grid">
        ${evaluationCard(icon, `総合評価 (${label})`, true)}
        ${evaluationCard(`±${data.avgCents}セント`, '平均精度')}
        ${evaluationCard(`${data.needWorkCount}音`, '要改善（±50セント超）')}
      </div>
    `;
  }

  /**
   * 総合評価画面を生成
   */
  static createOverallEvaluation(data: {
    grade: string;
    avgCents: number;
    passedNotes: number;
    totalNotes: number;
    excellentCount: number;
    sessions: SessionData[];
  }): string {
    const gradeMessages: Record<string, string> = {
      'S': '完璧な相対音感です！',
      'A': '優秀な相対音感です！',
      'B': '素晴らしい相対音感です！',
      'C': '良好な相対音感です',
      'D': '練習を続けましょう',
      'E': '基礎から練習しましょう'
    };
    
    return `
      ${gradeDisplay(data.grade, gradeMessages[data.grade])}
      
      <div class="evaluation-grid">
        ${evaluationCard(`±${data.avgCents}セント`, '平均音程精度')}
        ${evaluationCard(`${data.passedNotes}/${data.totalNotes}音`, '合格音数')}
        ${evaluationCard(`${data.excellentCount}音`, 'Excellent数')}
      </div>
      
      <div class="session-history">
        <h3>📋 セッション履歴</h3>
        ${data.sessions.map(s => sessionHistoryItem(s)).join('')}
      </div>
    `;
  }

  /**
   * 音階別詳細評価を生成
   */
  static createNoteEvaluation(notes: NoteData[]): string {
    const noteColors = [
      '--note-do', '--note-re', '--note-mi', '--note-fa',
      '--note-so', '--note-la', '--note-si', '--note-do-high'
    ];
    
    return `
      <div class="note-evaluation-grid">
        ${notes.map((note, index) => 
          noteEvaluationItem({
            ...note,
            colorVar: noteColors[index] || '--mantine-color-gray-7'
          })
        ).join('')}
      </div>
    `;
  }

  /**
   * トレーニング画面のガイド部分を生成
   */
  static createTrainingGuide(progressPercentage: number = 0, activeNoteIndex: number = -1): string {
    return `
      <div class="training-guide">
        ${integratedProgressBar(progressPercentage)}
        ${noteCircles(activeNoteIndex)}
      </div>
    `;
  }
}

// ===== ユーティリティ関数 =====
export const toggleSessionDetail = (sessionNum: number): void => {
  const detailElement = document.getElementById(`session-${sessionNum}-detail`);
  const sessionItem = (event as any)?.currentTarget;
  const expandIcon = sessionItem?.querySelector('.expand-icon');
  
  if (detailElement) {
    const isHidden = detailElement.style.display === 'none' || !detailElement.style.display;
    detailElement.style.display = isHidden ? 'block' : 'none';
    
    if (sessionItem) {
      if (isHidden) {
        sessionItem.classList.add('expanded');
      } else {
        sessionItem.classList.remove('expanded');
      }
    }
    
    if (expandIcon) {
      expandIcon.style.transform = isHidden ? 'rotate(180deg)' : 'rotate(0deg)';
    }
  }
};

// グローバルに関数を公開（HTMLから呼び出し可能にする）
if (typeof window !== 'undefined') {
  (window as any).toggleSessionDetail = toggleSessionDetail;
}

export default AppUiCatalog;