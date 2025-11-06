/**
 * ProgressBar - プログレスバーコンポーネント
 * 評価分布表示、進行状況表示、音量バー等に使用
 */

import { BaseComponent } from '../base/BaseComponent.js';

export class ProgressBar extends BaseComponent {
    get defaultOptions() {
        return {
            ...super.defaultOptions,
            value: 0,               // 現在値 (0-100)
            max: 100,              // 最大値
            variant: 'default',     // 'default', 'gradient', 'volume', 'evaluation'
            color: 'green',         // 'green', 'blue', 'purple', 'orange', 'red', 'gold'
            size: 'medium',         // 'small', 'medium', 'large'
            showText: false,        // テキスト表示の有無
            animated: false,        // アニメーション有無
            className: 'progress-bar-container'
        };
    }

    createElement() {
        const container = document.createElement('div');
        container.className = `${this.options.className} ${this.getSizeClass()}`;

        // プログレスバー本体
        const progressBar = document.createElement('div');
        progressBar.className = this.getProgressBarClass();

        // 進行部分
        const progressFill = document.createElement('div');
        progressFill.className = this.getProgressFillClass();
        progressFill.style.width = '0%';

        progressBar.appendChild(progressFill);
        container.appendChild(progressBar);

        // テキスト表示
        if (this.options.showText) {
            const textElement = document.createElement('div');
            textElement.className = 'progress-text text-sm text-white-60 mt-1';
            textElement.textContent = `${this.options.value}%`;
            container.appendChild(textElement);
        }

        return container;
    }

    afterRender() {
        super.afterRender();
        this.updateProgress(this.options.value);
    }

    /**
     * サイズクラスを取得
     */
    getSizeClass() {
        const sizeMap = {
            small: 'progress-small',
            medium: 'progress-medium',
            large: 'progress-large'
        };
        return sizeMap[this.options.size] || sizeMap.medium;
    }

    /**
     * プログレスバーのクラスを取得
     */
    getProgressBarClass() {
        let baseClass = 'progress-bar';

        if (this.options.variant === 'volume') {
            baseClass += ' volume-bar';
        }

        return baseClass;
    }

    /**
     * プログレスフィルのクラスを取得
     */
    getProgressFillClass() {
        const { variant, color } = this.options;
        let fillClass = '';

        switch (variant) {
            case 'gradient':
                fillClass = `progress-fill gradient-catalog-${color}`;
                break;
            case 'evaluation':
                fillClass = `progress-fill-custom color-eval-${color}`;
                break;
            case 'volume':
                fillClass = `volume-fill volume-fill-${color}`;
                break;
            default:
                fillClass = `progress-fill progress-${color}`;
                break;
        }

        if (this.options.animated) {
            fillClass += ' progress-animated';
        }

        return fillClass;
    }

    /**
     * 進行状況を更新
     * @param {number} value - 新しい値 (0-100)
     * @param {boolean} animate - アニメーション有無
     */
    updateProgress(value, animate = false) {
        if (value < 0) value = 0;
        if (value > this.options.max) value = this.options.max;

        this.options.value = value;
        const percentage = (value / this.options.max) * 100;

        const progressFill = this.querySelector('.progress-fill, .progress-fill-custom, .volume-fill');
        if (progressFill) {
            if (animate && !this.options.animated) {
                progressFill.style.transition = 'width 0.3s ease';
                setTimeout(() => {
                    progressFill.style.transition = '';
                }, 300);
            }

            progressFill.style.width = `${percentage}%`;
        }

        // テキスト更新
        if (this.options.showText) {
            const textElement = this.querySelector('.progress-text');
            if (textElement) {
                textElement.textContent = `${Math.round(percentage)}%`;
            }
        }

        // イベント発火
        this.onProgressUpdate(value, percentage);

        return this;
    }

    /**
     * 色を変更
     * @param {string} color - 新しい色
     */
    setColor(color) {
        const progressFill = this.querySelector('.progress-fill, .progress-fill-custom, .volume-fill');
        if (progressFill) {
            // 既存の色クラスを削除
            const colorClasses = Array.from(progressFill.classList).filter(cls =>
                cls.includes('gradient-catalog-') ||
                cls.includes('color-eval-') ||
                cls.includes('volume-fill-') ||
                cls.includes('progress-')
            );

            colorClasses.forEach(cls => progressFill.classList.remove(cls));

            // 新しい色クラスを追加
            this.options.color = color;
            const newClasses = this.getProgressFillClass().split(' ');
            newClasses.forEach(cls => {
                if (cls && !progressFill.classList.contains(cls)) {
                    progressFill.classList.add(cls);
                }
            });
        }

        return this;
    }

    /**
     * バリアントを変更
     * @param {string} variant - 新しいバリアント
     */
    setVariant(variant) {
        this.options.variant = variant;

        // プログレスバーのクラスを更新
        const progressBar = this.querySelector('.progress-bar, .volume-bar');
        if (progressBar) {
            progressBar.className = this.getProgressBarClass();
        }

        // プログレスフィルのクラスを更新
        const progressFill = this.querySelector('.progress-fill, .progress-fill-custom, .volume-fill');
        if (progressFill) {
            progressFill.className = this.getProgressFillClass();
            progressFill.style.width = `${(this.options.value / this.options.max) * 100}%`;
        }

        return this;
    }

    /**
     * アニメーションの有効/無効を切り替え
     * @param {boolean} enabled - アニメーション有効化
     */
    setAnimated(enabled) {
        this.options.animated = enabled;
        const progressFill = this.querySelector('.progress-fill, .progress-fill-custom, .volume-fill');

        if (progressFill) {
            if (enabled) {
                progressFill.classList.add('progress-animated');
            } else {
                progressFill.classList.remove('progress-animated');
                progressFill.style.transition = '';
            }
        }

        return this;
    }

    /**
     * 現在の値を取得
     */
    getValue() {
        return this.options.value;
    }

    /**
     * 現在のパーセンテージを取得
     */
    getPercentage() {
        return (this.options.value / this.options.max) * 100;
    }

    /**
     * 最大値を設定
     * @param {number} max - 新しい最大値
     */
    setMax(max) {
        this.options.max = max;
        this.updateProgress(this.options.value);
        return this;
    }

    /**
     * テキスト表示の切り替え
     * @param {boolean} show - 表示するかどうか
     */
    setShowText(show) {
        this.options.showText = show;

        let textElement = this.querySelector('.progress-text');

        if (show && !textElement) {
            // テキスト要素を作成
            textElement = document.createElement('div');
            textElement.className = 'progress-text text-sm text-white-60 mt-1';
            textElement.textContent = `${Math.round(this.getPercentage())}%`;
            this.element.appendChild(textElement);
        } else if (!show && textElement) {
            // テキスト要素を削除
            textElement.remove();
        } else if (show && textElement) {
            // テキストを更新
            textElement.textContent = `${Math.round(this.getPercentage())}%`;
        }

        return this;
    }

    /**
     * プログレスを段階的に増加
     * @param {number} increment - 増加量
     */
    increment(increment = 1) {
        const newValue = this.options.value + increment;
        this.updateProgress(newValue, true);
        return this;
    }

    /**
     * プログレスを段階的に減少
     * @param {number} decrement - 減少量
     */
    decrement(decrement = 1) {
        const newValue = this.options.value - decrement;
        this.updateProgress(newValue, true);
        return this;
    }

    /**
     * 0にリセット
     */
    reset() {
        this.updateProgress(0, true);
        return this;
    }

    /**
     * 最大値に設定
     */
    complete() {
        this.updateProgress(this.options.max, true);
        return this;
    }

    /**
     * 進行状況更新時のコールバック（オーバーライド可能）
     */
    onProgressUpdate(value, percentage) {
        // コールバックオプションがあれば実行
        if (typeof this.options.onProgressUpdate === 'function') {
            this.options.onProgressUpdate(value, percentage, this);
        }

        console.log(`Progress updated: ${value}/${this.options.max} (${percentage.toFixed(1)}%)`);
    }

    /**
     * 音量バー専用の更新メソッド（VolumeBarController互換）
     * @param {number} volume - 音量値 (0-100)
     */
    updateVolume(volume) {
        if (this.options.variant === 'volume') {
            this.updateProgress(volume);
        }
        return this;
    }

    /**
     * 評価分布バー用の設定メソッド
     * @param {string} evaluationType - 評価タイプ ('gold', 'good', 'pass', 'practice')
     * @param {number} count - カウント数
     * @param {number} total - 全体数
     */
    setEvaluationData(evaluationType, count, total) {
        this.setVariant('evaluation');
        this.setColor(evaluationType);

        const percentage = total > 0 ? (count / total) * 100 : 0;
        this.updateProgress(percentage);

        // カスタムテキスト表示
        if (this.options.showText) {
            const textElement = this.querySelector('.progress-text');
            if (textElement) {
                textElement.textContent = count.toString();
            }
        }

        return this;
    }
}