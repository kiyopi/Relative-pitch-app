/**
 * UIカタログ - 相対音感トレーニングアプリ
 * 全画面で使用するUIコンポーネントのテンプレート集
 */

// ===== 評価カード =====
export const evaluationCard = (value: string, label: string, icon?: string) => `
  <div class="evaluation-card">
    ${icon ? `<div class="evaluation-value" style="font-size: 32px;">${icon}</div>` 
           : `<div class="evaluation-value">${value}</div>`}
    <div class="evaluation-label">${label}</div>
  </div>
`;

// ===== セッション評価アイコン =====
export const getEvaluationIcon = (cents: number): string => {
  const absCents = Math.abs(cents);
  if (absCents <= 10) return '🏆'; // Excellent
  if (absCents <= 25) return '🎉'; // Good  
  if (absCents <= 50) return '👍'; // Pass
  return '😭'; // Need Work
};

// ===== セッション履歴アイテム =====
export const sessionHistoryItem = (
  sessionNum: number, 
  cents: number,
  baseNote?: string
) => {
  const icon = getEvaluationIcon(cents);
  return `
    <div class="session-item" onclick="toggleSessionDetail(${sessionNum})">
      <span>セッション ${sessionNum}</span>
      <div style="display: flex; gap: 8px; align-items: center;">
        <span class="session-score">±${Math.abs(cents)}セント</span>
        <span style="font-size: 20px;">${icon}</span>
        <span class="expand-icon">▼</span>
      </div>
    </div>
    <div class="session-detail" id="session-${sessionNum}-detail" style="display: none;">
      <div style="padding: 12px; background: var(--mantine-color-gray-0); border-radius: 4px;">
        <p>平均精度: ±${Math.abs(cents)}セント</p>
        <p>評価: ${icon} ${cents <= 10 ? 'Excellent' : cents <= 25 ? 'Good' : cents <= 50 ? 'Pass' : 'Need Work'}</p>
        ${baseNote ? `<p style="color: var(--mantine-color-gray-6);">※基音情報は相対音感トレーニングのため非表示</p>` : ''}
      </div>
    </div>
  `;
};

// ===== 音階別評価アイテム =====
export const noteEvaluationItem = (
  noteName: string,
  cents: number,
  colorVar: string
) => {
  const icon = getEvaluationIcon(cents);
  return `
    <div class="session-item" style="flex-direction: column; text-align: center;">
      <div style="font-weight: 600; color: var(${colorVar});">${noteName}</div>
      <div style="font-size: 24px;">${icon}</div>
      <div style="font-size: 12px; color: var(--mantine-color-gray-6);">
        ${cents >= 0 ? '+' : ''}${cents}¢
      </div>
    </div>
  `;
};

// ===== プログレスバー =====
export const progressBar = (percentage: number, label?: string) => `
  <div class="progress-container">
    ${label ? `<div class="progress-label">${label}</div>` : ''}
    <div class="progress-bar">
      <div class="progress-fill" style="width: ${percentage}%;"></div>
    </div>
  </div>
`;

// ===== ボタン =====
export const button = (
  text: string, 
  variant: 'primary' | 'secondary' | 'success' | 'danger' = 'primary',
  icon?: string,
  size: 'small' | 'medium' | 'large' = 'medium'
) => `
  <button class="btn btn-${variant} btn-${size}">
    ${icon ? `${icon} ` : ''}${text}
  </button>
`;

// ===== アラート/通知 =====
export const alert = (
  message: string,
  type: 'info' | 'success' | 'warning' | 'error' = 'info',
  title?: string
) => {
  const colors = {
    info: 'blue',
    success: 'green',
    warning: 'yellow',
    error: 'red'
  };
  const color = colors[type];
  
  return `
    <div style="background: var(--mantine-color-${color}-0); 
                border-radius: 8px; 
                padding: var(--training-spacing); 
                margin: var(--session-spacing) 0; 
                border-left: 4px solid var(--mantine-color-${color}-6);">
      ${title ? `<h4 style="color: var(--mantine-color-${color}-8); margin-bottom: 8px;">${title}</h4>` : ''}
      <p style="color: var(--mantine-color-${color}-7); font-size: 14px; margin: 0;">
        ${message}
      </p>
    </div>
  `;
};

// ===== S-E級評価表示 =====
export const gradeDisplay = (grade: string, message: string) => `
  <div style="text-align: center; padding: var(--session-spacing) 0;">
    <div style="font-size: 72px; 
                font-weight: 900; 
                color: var(--mantine-color-${getGradeColor(grade)}-6); 
                margin-bottom: 8px;">
      ${grade}級
    </div>
    <div style="font-size: 18px; color: var(--mantine-color-gray-7);">
      ${message}
    </div>
  </div>
`;

// ===== ヘルパー関数 =====
const getGradeColor = (grade: string): string => {
  switch(grade) {
    case 'S': return 'yellow';
    case 'A': return 'green';
    case 'B': return 'green';
    case 'C': return 'blue';
    case 'D': return 'gray';
    case 'E': return 'gray';
    default: return 'gray';
  }
};

// ===== モード選択カード =====
export const modeCard = (
  title: string,
  emoji: string,
  difficulty: string,
  description: string,
  badge?: string
) => `
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

// ===== ドレミガイド円 =====
export const noteCircle = (
  note: string,
  isActive: boolean = false,
  isCompleted: boolean = false
) => `
  <div class="note-circle ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}">
    ${note}
  </div>
`;

// ===== 統合進行バー =====
export const integratedProgressBar = () => `
  <div class="integrated-progress">
    <div class="progress-sections">
      <div class="section base-tone">基音再生(2.0秒)</div>
      <div class="section rest">休憩</div>
      <div class="section start-marker">🎯開始</div>
    </div>
    <div class="progress-bar">
      <div class="progress-fill" id="progress-fill"></div>
    </div>
  </div>
`;

// ===== 設定項目 =====
export const settingItem = (label: string, control: string) => `
  <div class="setting-item">
    <span>${label}</span>
    ${control}
  </div>
`;

// ===== 全体的なコンポーネント作成関数 =====
export class UiCatalog {
  /**
   * 評価画面を生成
   */
  static createEvaluationScreen(data: {
    mode: string;
    avgCents: number;
    passedNotes: number;
    totalNotes: number;
    excellentCount: number;
  }): string {
    return `
      <div class="evaluation-grid">
        ${evaluationCard(getEvaluationIcon(data.avgCents), `総合評価 (${this.getEvaluationLabel(data.avgCents)})`)}
        ${evaluationCard(`±${data.avgCents}セント`, '平均精度')}
        ${evaluationCard(`${data.passedNotes}/${data.totalNotes}音`, '合格音数')}
      </div>
    `;
  }

  private static getEvaluationLabel(cents: number): string {
    const absCents = Math.abs(cents);
    if (absCents <= 10) return 'Excellent';
    if (absCents <= 25) return 'Good';
    if (absCents <= 50) return 'Pass';
    return 'Need Work';
  }

  /**
   * セッション履歴を生成
   */
  static createSessionHistory(sessions: Array<{num: number; cents: number}>): string {
    return sessions.map(s => sessionHistoryItem(s.num, s.cents)).join('');
  }
}

export default UiCatalog;