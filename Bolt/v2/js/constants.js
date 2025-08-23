/**
 * 定数定義モジュール
 * UIカタログ準拠の値を一元管理
 */

// Lucideアイコンサイズ（インラインスタイル用）
export const ICON_SIZES = {
    xs: 'width: 16px; height: 16px;',
    sm: 'width: 20px; height: 20px;',
    md: 'width: 24px; height: 24px;',
    lg: 'width: 32px; height: 32px;',
    xl: 'width: 64px; height: 64px;',
    xxl: 'width: 80px; height: 80px;'
};

// グレード定義
export const GRADES = {
    S: { label: 'S級', minScore: 95, maxError: 5, color: 'grade-s', icon: 'crown' },
    A: { label: 'A級', minScore: 90, maxError: 10, color: 'grade-a', icon: 'crown' },
    B: { label: 'B級', minScore: 80, maxError: 20, color: 'grade-b', icon: 'medal' },
    C: { label: 'C級', minScore: 70, maxError: 30, color: 'grade-c', icon: 'circle-star' },
    D: { label: 'D級', minScore: 60, maxError: 40, color: 'grade-d', icon: 'smile' },
    E: { label: 'E級', minScore: 0, maxError: Infinity, color: 'grade-e', icon: 'meh' }
};

// セッション評価レベル
export const SESSION_LEVELS = {
    excellent: {
        label: 'Excellent',
        class: 'session-excellent',
        icon: 'trophy',
        color: '#fbbf24'
    },
    good: {
        label: 'Good',
        class: 'session-good',
        icon: 'star',
        color: '#22c55e'
    },
    pass: {
        label: 'Pass',
        class: 'session-pass',
        icon: 'thumbs-up',
        color: '#3b82f6'
    },
    practice: {
        label: 'Practice',
        class: 'session-practice',
        icon: 'triangle-alert',
        color: '#ef4444'
    }
};

// セッション設定
export const SESSION_CONFIG = {
    notesPerSession: 8,
    maxSessions: 12,
    freeSessionLimit: 8
};

// チャート設定（Chart.js）
export const CHART_CONFIG = {
    colors: {
        line: 'rgba(139, 92, 246, 1)',
        fill: 'rgba(139, 92, 246, 0.1)',
        grid: 'rgba(255, 255, 255, 0.1)',
        text: 'rgba(255, 255, 255, 0.7)',
        zeroLine: 'rgba(255, 255, 255, 0.5)'
    },
    animation: {
        duration: 1000,
        easing: 'easeInOutQuart'
    }
};

// アニメーション設定
export const ANIMATION_CONFIG = {
    slideIn: {
        duration: 800,
        delay: 100
    },
    fadeIn: {
        duration: 500,
        delay: 50
    },
    countUp: {
        duration: 2000,
        fps: 60
    }
};