/**
 * AudioDisplayUtility - 音響表示統合ユーティリティクラス
 * 
 * 音量バー、周波数表示、音程表示の統一管理システム
 * 複数のページ・コンポーネントで共通使用
 * 
 * @version 1.0.0
 * @author Claude Code Assistant
 */

class AudioDisplayUtility {
    constructor(config = {}) {
        // 設定のデフォルト値
        this.config = {
            // 音量バー設定
            volumeBarSelector: config.volumeBarSelector || null,
            volumeTextSelector: config.volumeTextSelector || null,
            volumeRange: config.volumeRange || { min: 0, max: 100 },
            
            // 周波数表示設定
            frequencySelector: config.frequencySelector || null,
            frequencyFormat: config.frequencyFormat || 'Hz', // 'Hz' | 'note' | 'both'
            frequencyPrecision: config.frequencyPrecision || 1,
            
            // 音程表示設定
            noteSelector: config.noteSelector || null,
            noteFormat: config.noteFormat || 'simple', // 'simple' | 'detailed' | 'frequency'
            
            // デバッグ設定
            debug: config.debug || false,
            logPrefix: config.logPrefix || '🎵 AudioDisplay'
        };
        
        // DOM要素の取得
        this.elements = this.initializeElements();
        
        if (this.config.debug) {
            console.log(`${this.config.logPrefix}: 初期化完了`, {
                elements: this.elements,
                config: this.config
            });
        }
    }
    
    /**
     * DOM要素の初期化
     */
    initializeElements() {
        const elements = {};
        
        // 音量バー要素
        if (this.config.volumeBarSelector) {
            elements.volumeBar = document.querySelector(this.config.volumeBarSelector);
        }
        
        if (this.config.volumeTextSelector) {
            elements.volumeText = document.querySelector(this.config.volumeTextSelector);
        }
        
        // 周波数表示要素
        if (this.config.frequencySelector) {
            elements.frequency = document.querySelector(this.config.frequencySelector);
        }
        
        // 音程表示要素
        if (this.config.noteSelector) {
            elements.note = document.querySelector(this.config.noteSelector);
        }
        
        return elements;
    }
    
    /**
     * 音量表示更新
     * @param {number} volume - 音量値（0-100）
     */
    updateVolume(volume) {
        const normalizedVolume = Math.min(this.config.volumeRange.max, Math.max(this.config.volumeRange.min, volume));
        
        // 音量バー更新
        if (this.elements.volumeBar) {
            this.elements.volumeBar.style.width = `${normalizedVolume}%`;
        }
        
        // 音量テキスト更新
        if (this.elements.volumeText) {
            this.elements.volumeText.textContent = `${normalizedVolume.toFixed(1)}%`;
        }
        
        if (this.config.debug && volume > 0) {
            console.log(`${this.config.logPrefix}: 音量更新`, normalizedVolume + '%');
        }
    }
    
    /**
     * 周波数表示更新
     * @param {number} frequency - 周波数値（Hz）
     * @param {string|null} note - 音程名（オプション）
     */
    updateFrequency(frequency, note = null) {
        if (!this.elements.frequency) return;
        
        let displayText = '';
        
        if (frequency <= 0) {
            displayText = '0 Hz';
        } else {
            switch (this.config.frequencyFormat) {
                case 'Hz':
                    displayText = `${frequency.toFixed(this.config.frequencyPrecision)} Hz`;
                    break;
                case 'note':
                    if (note) {
                        displayText = note;
                    } else {
                        displayText = this.frequencyToNote(frequency);
                    }
                    break;
                case 'both':
                    const noteName = note || this.frequencyToNote(frequency);
                    displayText = `${frequency.toFixed(this.config.frequencyPrecision)} Hz (${noteName})`;
                    break;
                default:
                    displayText = `${frequency.toFixed(this.config.frequencyPrecision)} Hz`;
            }
        }
        
        this.elements.frequency.textContent = displayText;
        
        if (this.config.debug && frequency > 0) {
            console.log(`${this.config.logPrefix}: 周波数更新`, displayText);
        }
    }
    
    /**
     * 音程表示更新
     * @param {string} note - 音程名
     * @param {number|null} frequency - 周波数値（オプション）
     */
    updateNote(note, frequency = null) {
        if (!this.elements.note) return;
        
        let displayText = '';
        
        if (!note) {
            displayText = '--';
        } else {
            switch (this.config.noteFormat) {
                case 'simple':
                    displayText = note;
                    break;
                case 'detailed':
                    if (frequency) {
                        displayText = `${note} (${frequency.toFixed(1)}Hz)`;
                    } else {
                        displayText = note;
                    }
                    break;
                case 'frequency':
                    if (frequency) {
                        displayText = `${frequency.toFixed(1)}Hz`;
                    } else {
                        displayText = note;
                    }
                    break;
                default:
                    displayText = note;
            }
        }
        
        this.elements.note.textContent = displayText;
        
        if (this.config.debug && note) {
            console.log(`${this.config.logPrefix}: 音程更新`, displayText);
        }
    }
    
    /**
     * 全表示の同時更新
     * @param {Object} data - { volume, frequency, note }
     */
    updateAll(data = {}) {
        if (data.volume !== undefined) {
            this.updateVolume(data.volume);
        }
        
        if (data.frequency !== undefined) {
            this.updateFrequency(data.frequency, data.note);
        }
        
        if (data.note !== undefined && this.elements.note) {
            this.updateNote(data.note, data.frequency);
        }
    }
    
    /**
     * 全表示のリセット
     */
    reset() {
        this.updateVolume(0);
        this.updateFrequency(0);
        this.updateNote('');
        
        if (this.config.debug) {
            console.log(`${this.config.logPrefix}: 全表示リセット完了`);
        }
    }
    
    /**
     * 周波数から音程名への変換（簡易版）
     * @param {number} frequency - 周波数（Hz）
     * @returns {string} 音程名
     */
    frequencyToNote(frequency) {
        if (frequency <= 0) return '--';
        
        // A4 = 440Hz を基準とした12平均律計算
        const A4 = 440;
        const C0 = A4 * Math.pow(2, -4.75); // C0の周波数
        
        const h = Math.round(12 * Math.log2(frequency / C0));
        const octave = Math.floor(h / 12);
        const n = h % 12;
        
        const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        
        return `${noteNames[n]}${octave}`;
    }
    
    /**
     * 設定の動的更新
     * @param {Object} newConfig - 新しい設定
     */
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        this.elements = this.initializeElements(); // 要素を再取得
        
        if (this.config.debug) {
            console.log(`${this.config.logPrefix}: 設定更新完了`, this.config);
        }
    }
    
    /**
     * 要素の存在確認
     */
    checkElements() {
        const status = {
            volumeBar: !!this.elements.volumeBar,
            volumeText: !!this.elements.volumeText,
            frequency: !!this.elements.frequency,
            note: !!this.elements.note
        };
        
        if (this.config.debug) {
            console.log(`${this.config.logPrefix}: 要素状況`, status);
        }
        
        return status;
    }
    
    /**
     * 静的ファクトリーメソッド - シンプルな音量バー用
     */
    static createVolumeOnly(volumeBarSelector, volumeTextSelector, debug = false) {
        return new AudioDisplayUtility({
            volumeBarSelector,
            volumeTextSelector,
            debug,
            logPrefix: '🔊 VolumeDisplay'
        });
    }
    
    /**
     * 静的ファクトリーメソッド - 周波数表示用
     */
    static createFrequencyOnly(frequencySelector, format = 'Hz', debug = false) {
        return new AudioDisplayUtility({
            frequencySelector,
            frequencyFormat: format,
            debug,
            logPrefix: '📊 FrequencyDisplay'
        });
    }
    
    /**
     * 静的ファクトリーメソッド - 完全統合版
     */
    static createComplete(config = {}) {
        return new AudioDisplayUtility({
            ...config,
            debug: config.debug || false,
            logPrefix: config.logPrefix || '🎵 CompleteAudioDisplay'
        });
    }
}

// グローバルエクスポート（ブラウザ環境）
if (typeof window !== 'undefined') {
    window.AudioDisplayUtility = AudioDisplayUtility;
}

// モジュールエクスポート（Node.js環境）
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AudioDisplayUtility;
}