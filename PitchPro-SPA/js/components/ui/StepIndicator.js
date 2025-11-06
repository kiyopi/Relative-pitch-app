/**
 * StepIndicator - ステップ表示コンポーネント
 * 3段階ステップ（マイク許可→音声テスト→音域テスト）のUI表示
 */

import { BaseComponent } from '../base/BaseComponent.js';

export class StepIndicator extends BaseComponent {
    get defaultOptions() {
        return {
            ...super.defaultOptions,
            steps: [
                { id: 'step-1', icon: 'mic', label: 'マイク許可' },
                { id: 'step-2', icon: 'speech', label: '音声テスト' },
                { id: 'step-3', icon: 'music', label: '音域テスト' }
            ],
            currentStep: 0,
            className: 'step-indicator-container'
        };
    }

    createElement() {
        const container = document.createElement('div');
        container.className = `${this.options.className} mb-4`;

        const stepContainer = document.createElement('div');
        stepContainer.className = 'flex items-center justify-between gap-4';

        this.options.steps.forEach((step, index) => {
            // Step circle
            const stepDiv = document.createElement('div');
            stepDiv.className = 'flex-1 text-center';

            const indicator = document.createElement('div');
            indicator.className = 'step-indicator';
            indicator.id = step.id;

            const icon = document.createElement('i');
            icon.setAttribute('data-lucide', step.icon);
            icon.style.width = '24px';
            icon.style.height = '24px';

            const label = document.createElement('p');
            label.className = 'text-xs text-white-60 mt-2';
            label.textContent = step.label;

            indicator.appendChild(icon);
            stepDiv.appendChild(indicator);
            stepDiv.appendChild(label);
            stepContainer.appendChild(stepDiv);

            // Connector line (except for last step)
            if (index < this.options.steps.length - 1) {
                const connector = document.createElement('div');
                connector.className = 'step-connector';
                connector.id = `connector-${index + 1}`;
                stepContainer.appendChild(connector);
            }
        });

        container.appendChild(stepContainer);
        return container;
    }

    afterRender() {
        super.afterRender();
        this.setCurrentStep(this.options.currentStep);
    }

    /**
     * 現在のステップを設定
     * @param {number} stepIndex - ステップインデックス（0から始まる）
     */
    setCurrentStep(stepIndex) {
        if (stepIndex < 0 || stepIndex >= this.options.steps.length) {
            console.warn(`Invalid step index: ${stepIndex}`);
            return this;
        }

        // Remove all active states
        this.querySelectorAll('.step-indicator').forEach(el => {
            el.classList.remove('active', 'completed');
        });
        this.querySelectorAll('.step-connector').forEach(el => {
            el.classList.remove('active');
        });

        // Set current and completed steps
        this.options.steps.forEach((step, index) => {
            const stepEl = this.querySelector(`#${step.id}`);
            if (!stepEl) return;

            if (index < stepIndex) {
                stepEl.classList.add('completed');
            } else if (index === stepIndex) {
                stepEl.classList.add('active');
            }

            // Activate connectors for completed steps
            if (index < stepIndex) {
                const connector = this.querySelector(`#connector-${index + 1}`);
                if (connector) {
                    connector.classList.add('active');
                }
            }
        });

        this.options.currentStep = stepIndex;

        // イベント発火
        this.onStepChange(stepIndex);

        return this;
    }

    /**
     * 次のステップに進む
     */
    nextStep() {
        if (this.options.currentStep < this.options.steps.length - 1) {
            this.setCurrentStep(this.options.currentStep + 1);
        }
        return this;
    }

    /**
     * 前のステップに戻る
     */
    previousStep() {
        if (this.options.currentStep > 0) {
            this.setCurrentStep(this.options.currentStep - 1);
        }
        return this;
    }

    /**
     * 特定のステップを完了済みにマーク
     * @param {number} stepIndex - ステップインデックス
     */
    completeStep(stepIndex) {
        if (stepIndex < 0 || stepIndex >= this.options.steps.length) {
            return this;
        }

        const step = this.options.steps[stepIndex];
        const stepEl = this.querySelector(`#${step.id}`);
        if (stepEl) {
            stepEl.classList.add('completed');
            stepEl.classList.remove('active');
        }

        // Activate connector for completed step
        if (stepIndex < this.options.steps.length - 1) {
            const connector = this.querySelector(`#connector-${stepIndex + 1}`);
            if (connector) {
                connector.classList.add('active');
            }
        }

        return this;
    }

    /**
     * 現在のステップを取得
     */
    getCurrentStep() {
        return this.options.currentStep;
    }

    /**
     * ステップの詳細情報を取得
     */
    getStepInfo(stepIndex) {
        return this.options.steps[stepIndex] || null;
    }

    /**
     * 全ステップを取得
     */
    getAllSteps() {
        return [...this.options.steps];
    }

    /**
     * ステップが完了済みかチェック
     */
    isStepCompleted(stepIndex) {
        const step = this.options.steps[stepIndex];
        if (!step) return false;

        const stepEl = this.querySelector(`#${step.id}`);
        return stepEl ? stepEl.classList.contains('completed') : false;
    }

    /**
     * ステップ変更時のコールバック（オーバーライド可能）
     */
    onStepChange(stepIndex) {
        // コールバックオプションがあれば実行
        if (typeof this.options.onStepChange === 'function') {
            this.options.onStepChange(stepIndex, this.getStepInfo(stepIndex));
        }

        console.log(`Step changed to: ${stepIndex} (${this.getStepInfo(stepIndex)?.label})`);
    }

    /**
     * ステップを追加
     */
    addStep(step) {
        this.options.steps.push(step);

        if (this.isRendered) {
            // 再レンダリングが必要
            this.destroy();
            this.render();
        }

        return this;
    }

    /**
     * すべてのステップをリセット
     */
    reset() {
        this.setCurrentStep(0);

        this.querySelectorAll('.step-indicator').forEach(el => {
            el.classList.remove('active', 'completed');
        });
        this.querySelectorAll('.step-connector').forEach(el => {
            el.classList.remove('active');
        });

        return this;
    }
}