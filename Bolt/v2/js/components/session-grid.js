/**
 * セッショングリッドコンポーネント
 * UIカタログ準拠のセッション表示を管理
 */

import { ICON_SIZES, SESSION_LEVELS } from '../constants.js';

export class SessionGrid {
    constructor(container, options = {}) {
        this.container = container;
        this.sessions = options.sessions || [];
        this.columns = options.columns || 8;
        this.selectedIndex = options.selectedIndex || 0;
        this.onSessionClick = options.onSessionClick || null;
    }

    /**
     * セッショングリッドをレンダリング
     */
    render() {
        const gridClass = `session-grid session-grid-${this.columns}`;
        const sessionsHtml = this.sessions.map((session, index) => 
            this.createSessionBox(session, index)
        ).join('');

        this.container.innerHTML = `
            <div class="${gridClass}">
                ${sessionsHtml}
            </div>
        `;

        this.attachEventListeners();
        this.updateLucideIcons();
    }

    /**
     * セッションボックスを作成（UIカタログ準拠）
     */
    createSessionBox(session, index) {
        const level = this.getSessionLevel(session);
        const levelClass = SESSION_LEVELS[level].class;
        const isSelected = index === this.selectedIndex;
        const selectedClass = isSelected ? 'selected' : '';

        // Lucideアイコンはインラインスタイル必須
        return `
            <div class="session-box ${levelClass} ${selectedClass}" 
                 data-session-index="${index}"
                 data-session-id="${session.id}">
                <div class="session-number">セッション${session.id}</div>
                <div class="session-icon">
                    <i data-lucide="${SESSION_LEVELS[level].icon}" 
                       style="${ICON_SIZES.md}"></i>
                </div>
                ${session.score ? `
                    <div class="session-score">${session.score}%</div>
                ` : ''}
            </div>
        `;
    }

    /**
     * セッションレベルを判定
     */
    getSessionLevel(session) {
        if (!session.avgError) return 'practice';
        
        const error = Math.abs(session.avgError);
        if (error <= 10) return 'excellent';
        if (error <= 20) return 'good';
        if (error <= 30) return 'pass';
        return 'practice';
    }

    /**
     * イベントリスナーを設定
     */
    attachEventListeners() {
        const boxes = this.container.querySelectorAll('.session-box');
        boxes.forEach(box => {
            box.addEventListener('click', (e) => {
                const index = parseInt(box.dataset.sessionIndex);
                this.selectSession(index);
            });
        });
    }

    /**
     * セッションを選択
     */
    selectSession(index) {
        // 選択状態を更新
        const boxes = this.container.querySelectorAll('.session-box');
        boxes.forEach((box, i) => {
            if (i === index) {
                box.classList.add('selected');
            } else {
                box.classList.remove('selected');
            }
        });

        this.selectedIndex = index;

        // コールバック実行
        if (this.onSessionClick) {
            this.onSessionClick(this.sessions[index], index);
        }
    }

    /**
     * Lucideアイコンを更新
     */
    updateLucideIcons() {
        if (typeof lucide !== 'undefined' && lucide.createIcons) {
            lucide.createIcons();
        }
    }

    /**
     * セッションデータを更新
     */
    updateSessions(sessions) {
        this.sessions = sessions;
        this.render();
    }

    /**
     * 現在選択中のセッションを取得
     */
    getSelectedSession() {
        return this.sessions[this.selectedIndex];
    }
}