/**
 * 音楽理論ユーティリティ
 *
 * 周波数から音名への変換など、音楽理論に関連する共通処理を提供
 *
 * @version 1.0.0
 * @date 2025-11-10
 */

(function() {
    'use strict';

    /**
     * 音楽理論ユーティリティクラス
     */
    class MusicTheory {
        /**
         * 基準周波数定数
         */
        static A4_FREQUENCY = 440.0;  // A4の周波数（Hz）
        static C0_FREQUENCY = 16.35159783128741;  // C0の周波数（Hz） = A4 * 2^(-4.75)

        /**
         * 音名配列（Cから始まる12音）
         */
        static NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

        /**
         * 周波数から音名+オクターブ番号を取得
         *
         * @param {number} frequency - 周波数（Hz）
         * @returns {string} 音名+オクターブ番号（例: "C4", "F2", "C#5"）
         *
         * @example
         * MusicTheory.frequencyToNote(261.63); // "C4"
         * MusicTheory.frequencyToNote(87.3);   // "F2"
         * MusicTheory.frequencyToNote(440);    // "A4"
         */
        static frequencyToNote(frequency) {
            if (!frequency || frequency <= 0) {
                return 'N/A';
            }

            // C0からの半音数を計算
            const halfStepsFromC0 = Math.round(12 * Math.log2(frequency / this.C0_FREQUENCY));

            // オクターブ番号を計算
            const octave = Math.floor(halfStepsFromC0 / 12);

            // オクターブ内の半音位置（0-11）
            const noteIndex = ((halfStepsFromC0 % 12) + 12) % 12; // 負の値を防ぐ

            return `${this.NOTE_NAMES[noteIndex]}${octave}`;
        }

        /**
         * 周波数から音名のみを取得（オクターブ番号なし）
         *
         * @param {number} frequency - 周波数（Hz）
         * @returns {string} 音名のみ（例: "C", "F", "C#"）
         *
         * @example
         * MusicTheory.frequencyToNoteName(261.63); // "C"
         * MusicTheory.frequencyToNoteName(87.3);   // "F"
         */
        static frequencyToNoteName(frequency) {
            if (!frequency || frequency <= 0) {
                return 'N/A';
            }

            const halfStepsFromC0 = Math.round(12 * Math.log2(frequency / this.C0_FREQUENCY));
            const noteIndex = ((halfStepsFromC0 % 12) + 12) % 12;

            return this.NOTE_NAMES[noteIndex];
        }

        /**
         * 周波数からオクターブ番号のみを取得
         *
         * @param {number} frequency - 周波数（Hz）
         * @returns {number} オクターブ番号（例: 4, 2, 5）
         *
         * @example
         * MusicTheory.frequencyToOctave(261.63); // 4
         * MusicTheory.frequencyToOctave(87.3);   // 2
         */
        static frequencyToOctave(frequency) {
            if (!frequency || frequency <= 0) {
                return 0;
            }

            const halfStepsFromC0 = Math.round(12 * Math.log2(frequency / this.C0_FREQUENCY));
            return Math.floor(halfStepsFromC0 / 12);
        }

        /**
         * 音名+オクターブから周波数を計算
         *
         * @param {string} note - 音名+オクターブ（例: "C4", "F2", "C#5"）
         * @returns {number} 周波数（Hz）
         *
         * @example
         * MusicTheory.noteToFrequency("C4");  // 261.63
         * MusicTheory.noteToFrequency("A4");  // 440.0
         */
        static noteToFrequency(note) {
            if (!note || typeof note !== 'string') {
                return 0;
            }

            // 音名とオクターブを分離（例: "C#4" → ["C#", "4"]）
            const match = note.match(/^([A-G]#?)(\d+)$/);
            if (!match) {
                return 0;
            }

            const noteName = match[1];
            const octave = parseInt(match[2], 10);

            // 音名のインデックスを取得
            const noteIndex = this.NOTE_NAMES.indexOf(noteName);
            if (noteIndex === -1) {
                return 0;
            }

            // C0からの半音数を計算
            const halfStepsFromC0 = octave * 12 + noteIndex;

            // 周波数を計算
            return this.C0_FREQUENCY * Math.pow(2, halfStepsFromC0 / 12);
        }

        /**
         * 2つの周波数のオクターブ差を計算
         *
         * @param {number} freq1 - 周波数1（Hz）
         * @param {number} freq2 - 周波数2（Hz）
         * @returns {number} オクターブ差（例: 1.5, 2.0）
         *
         * @example
         * MusicTheory.calculateOctaves(100, 400); // 2.0
         * MusicTheory.calculateOctaves(100, 200); // 1.0
         */
        static calculateOctaves(freq1, freq2) {
            if (!freq1 || !freq2 || freq1 <= 0 || freq2 <= 0) {
                return 0;
            }

            const higherFreq = Math.max(freq1, freq2);
            const lowerFreq = Math.min(freq1, freq2);

            return Math.log2(higherFreq / lowerFreq);
        }

        /**
         * 2つの周波数の半音数差を計算
         *
         * @param {number} freq1 - 周波数1（Hz）
         * @param {number} freq2 - 周波数2（Hz）
         * @returns {number} 半音数差（例: 12, 24）
         *
         * @example
         * MusicTheory.calculateSemitones(100, 200); // 12
         */
        static calculateSemitones(freq1, freq2) {
            return Math.round(this.calculateOctaves(freq1, freq2) * 12);
        }

        /**
         * 音域範囲の文字列表現を生成
         *
         * @param {number} lowFreq - 最低周波数（Hz）
         * @param {number} highFreq - 最高周波数（Hz）
         * @returns {string} 音域範囲文字列（例: "F2 - C#4"）
         *
         * @example
         * MusicTheory.getRangeString(87.3, 329.6); // "F2 - E4"
         */
        static getRangeString(lowFreq, highFreq) {
            if (!lowFreq || !highFreq) {
                return '-';
            }

            const lowNote = this.frequencyToNote(lowFreq);
            const highNote = this.frequencyToNote(highFreq);

            return `${lowNote} - ${highNote}`;
        }

        /**
         * 音域情報オブジェクトを生成
         *
         * @param {number} lowFreq - 最低周波数（Hz）
         * @param {number} highFreq - 最高周波数（Hz）
         * @returns {Object} 音域情報オブジェクト
         *
         * @example
         * MusicTheory.getRangeInfo(87.3, 329.6);
         * // {
         * //   lowNote: "F2",
         * //   highNote: "E4",
         * //   range: "F2 - E4",
         * //   octaves: 1.93,
         * //   semitones: 23
         * // }
         */
        static getRangeInfo(lowFreq, highFreq) {
            const octaves = this.calculateOctaves(lowFreq, highFreq);
            const semitones = this.calculateSemitones(lowFreq, highFreq);

            return {
                lowNote: this.frequencyToNote(lowFreq),
                highNote: this.frequencyToNote(highFreq),
                range: this.getRangeString(lowFreq, highFreq),
                octaves: parseFloat(octaves.toFixed(2)),
                semitones: semitones,
                lowFreq: lowFreq,
                highFreq: highFreq
            };
        }
    }

    // グローバルに公開
    window.MusicTheory = MusicTheory;

    console.log('✅ MusicTheory utility loaded (v1.0.0)');
})();
