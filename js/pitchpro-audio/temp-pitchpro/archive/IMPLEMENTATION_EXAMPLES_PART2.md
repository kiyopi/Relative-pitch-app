# 🎵 PitchPro 実装例とベストプラクティス (Part 2)

## <a id="music-theory-analyzer"></a>5. 🎼 リアルタイム音楽理論分析

演奏中の音楽を理論的に分析するシステムの実装例です。

```javascript
class MusicTheoryAnalyzer extends BasicPitchApp {
    constructor() {
        super();
        
        // 音楽理論分析用のデータ
        this.noteHistory = [];
        this.chordBuffer = [];
        this.scaleAnalysis = null;
        this.keySignature = null;
        
        // 設定
        this.config = {
            noteHistoryLength: 20,     // 分析用ノート履歴の長さ
            chordDetectionWindow: 3000, // コード検出ウィンドウ (ms)
            scaleAnalysisWindow: 10000, // スケール分析ウィンドウ (ms)
            minimumNoteDuration: 200    // 最小ノート継続時間 (ms)
        };
        
        this.setupTheoryAnalysis();
    }
    
    setupTheoryAnalysis() {
        this.setupDisplayElements();
        this.setupAnalysisControls();
    }
    
    setupDisplayElements() {
        // 理論分析表示エリアを作成
        const theoryContainer = document.getElementById('theoryAnalysis');
        theoryContainer.innerHTML = `
            <div class="theory-section">
                <h3>音楽理論分析</h3>
                
                <div class="theory-grid">
                    <div class="theory-card" id="currentKeyCard">
                        <h4>推定調性</h4>
                        <div id="keySignatureDisplay">分析中...</div>
                    </div>
                    
                    <div class="theory-card" id="scaleCard">
                        <h4>スケール分析</h4>
                        <div id="scaleDisplay">分析中...</div>
                    </div>
                    
                    <div class="theory-card" id="chordCard">
                        <h4>コード推定</h4>
                        <div id="chordDisplay">分析中...</div>
                    </div>
                    
                    <div class="theory-card" id="intervalsCard">
                        <h4>音程分析</h4>
                        <div id="intervalsDisplay">分析中...</div>
                    </div>
                </div>
                
                <div class="note-sequence" id="noteSequenceDisplay">
                    <h4>音符系列</h4>
                    <div class="note-timeline" id="noteTimeline"></div>
                </div>
                
                <div class="harmony-analysis" id="harmonyAnalysis">
                    <h4>和声分析</h4>
                    <div id="harmonyDisplay"></div>
                </div>
            </div>
        `;
    }
    
    setupAnalysisControls() {
        // 分析設定コントロール
        const controlsContainer = document.getElementById('theoryControls');
        controlsContainer.innerHTML = `
            <div class="theory-controls">
                <div class="control-group">
                    <label>分析感度:</label>
                    <input type="range" id="analysisThreshold" min="0.1" max="1.0" step="0.1" value="0.5">
                    <span id="thresholdValue">0.5</span>
                </div>
                
                <div class="control-group">
                    <label>コード検出:</label>
                    <input type="checkbox" id="chordDetectionEnabled" checked>
                </div>
                
                <div class="control-group">
                    <label>スケール分析:</label>
                    <input type="checkbox" id="scaleAnalysisEnabled" checked>
                </div>
                
                <div class="control-group">
                    <button id="clearAnalysisBtn">分析履歴クリア</button>
                    <button id="exportAnalysisBtn">分析結果エクスポート</button>
                </div>
            </div>
        `;
        
        // イベントリスナー設定
        this.setupControlListeners();
    }
    
    setupControlListeners() {
        const thresholdSlider = document.getElementById('analysisThreshold');
        const thresholdValue = document.getElementById('thresholdValue');
        
        thresholdSlider.addEventListener('input', (e) => {
            thresholdValue.textContent = e.target.value;
            this.analysisThreshold = parseFloat(e.target.value);
        });
        
        document.getElementById('clearAnalysisBtn').addEventListener('click', () => {
            this.clearAnalysisHistory();
        });
        
        document.getElementById('exportAnalysisBtn').addEventListener('click', () => {
            this.exportAnalysisResults();
        });
        
        this.analysisThreshold = 0.5;
    }
    
    updateDisplay(result) {
        super.updateDisplay(result);
        
        // 音楽理論分析
        if (result.frequency > 0 && result.clarity > this.analysisThreshold) {
            this.addNoteToHistory({
                frequency: result.frequency,
                note: result.note,
                octave: result.octave,
                clarity: result.clarity,
                timestamp: Date.now()
            });
            
            this.performTheoryAnalysis();
        }
    }
    
    addNoteToHistory(noteData) {
        // 重複する近い音符を避けるため、最後の音符と比較
        const lastNote = this.noteHistory[this.noteHistory.length - 1];
        
        if (lastNote) {
            const timeDiff = noteData.timestamp - lastNote.timestamp;
            const freqDiff = Math.abs(noteData.frequency - lastNote.frequency);
            
            // 200ms以内で周波数差が20Hz以内の場合は更新のみ
            if (timeDiff < this.config.minimumNoteDuration && freqDiff < 20) {
                lastNote.timestamp = noteData.timestamp;
                lastNote.clarity = Math.max(lastNote.clarity, noteData.clarity);
                return;
            }
        }
        
        this.noteHistory.push(noteData);
        
        // 履歴長制限
        if (this.noteHistory.length > this.config.noteHistoryLength) {
            this.noteHistory.shift();
        }
        
        // ノートタイムライン更新
        this.updateNoteTimeline();
    }
    
    updateNoteTimeline() {
        const timeline = document.getElementById('noteTimeline');
        
        if (this.noteHistory.length === 0) {
            timeline.innerHTML = '<p>演奏を開始してください...</p>';
            return;
        }
        
        const recentNotes = this.noteHistory.slice(-10);
        
        timeline.innerHTML = recentNotes.map(note => `
            <div class="note-item">
                <span class="note-name">${note.note}</span>
                <span class="note-clarity">${note.clarity.toFixed(2)}</span>
            </div>
        `).join('');
    }
    
    performTheoryAnalysis() {
        if (this.noteHistory.length < 3) return;
        
        // スケール分析
        if (document.getElementById('scaleAnalysisEnabled').checked) {
            this.analyzeScale();
        }
        
        // コード分析
        if (document.getElementById('chordDetectionEnabled').checked) {
            this.analyzeChords();
        }
        
        // 音程分析
        this.analyzeIntervals();
        
        // 調性分析
        this.analyzeKeySignature();
    }
    
    analyzeScale() {
        const recentNotes = this.noteHistory.slice(-8);
        const frequencies = recentNotes.map(note => note.frequency);
        
        // スケール識別
        const scaleResults = PitchPro.MusicTheory.identifyScale(frequencies);
        
        if (scaleResults.length > 0) {
            const topResult = scaleResults[0];
            this.scaleAnalysis = topResult;
            
            document.getElementById('scaleDisplay').innerHTML = `
                <div class="scale-result">
                    <div class="scale-name">${this.translateScaleName(topResult.scale)}</div>
                    <div class="scale-root">ルート: ${topResult.root.name}</div>
                    <div class="scale-confidence">信頼度: ${(topResult.confidence * 100).toFixed(1)}%</div>
                </div>
                
                <div class="scale-alternatives">
                    ${scaleResults.slice(1, 3).map(result => `
                        <div class="alt-scale">
                            ${this.translateScaleName(result.scale)} (${result.root.name}) 
                            - ${(result.confidence * 100).toFixed(1)}%
                        </div>
                    `).join('')}
                </div>
            `;
        }
    }
    
    analyzeChords() {
        // 最近の3-4秒間の音符からコード分析
        const now = Date.now();
        const recentNotes = this.noteHistory.filter(note => 
            now - note.timestamp < this.config.chordDetectionWindow
        );
        
        if (recentNotes.length >= 2) {
            const frequencies = recentNotes.map(note => note.frequency);
            const chordResults = PitchPro.MusicTheory.identifyChord(frequencies);
            
            if (chordResults.length > 0) {
                const topChord = chordResults[0];
                
                document.getElementById('chordDisplay').innerHTML = `
                    <div class="chord-result">
                        <div class="chord-name">${this.formatChordName(topChord)}</div>
                        <div class="chord-root">ルート: ${topChord.root.name}</div>
                        <div class="chord-confidence">信頼度: ${(topChord.confidence * 100).toFixed(1)}%</div>
                        ${topChord.inversion ? `<div class="chord-inversion">転回: ${topChord.inversion}</div>` : ''}
                    </div>
                    
                    <div class="chord-alternatives">
                        ${chordResults.slice(1, 2).map(result => `
                            <div class="alt-chord">
                                ${this.formatChordName(result)} - ${(result.confidence * 100).toFixed(1)}%
                            </div>
                        `).join('')}
                    </div>
                `;
            }
        } else {
            document.getElementById('chordDisplay').innerHTML = `
                <div class="chord-result">
                    <div class="chord-name">単音</div>
                </div>
            `;
        }
    }
    
    analyzeIntervals() {
        if (this.noteHistory.length < 2) return;
        
        const lastTwo = this.noteHistory.slice(-2);
        const interval = PitchPro.FrequencyUtils.getSignedInterval(
            lastTwo[0].frequency,
            lastTwo[1].frequency
        );
        
        const intervalInfo = PitchPro.FrequencyUtils.getIntervalInfo(Math.abs(interval));
        const direction = interval > 0 ? '上行' : interval < 0 ? '下行' : '同音';
        
        document.getElementById('intervalsDisplay').innerHTML = `
            <div class="interval-result">
                <div class="interval-name">${intervalInfo.name}</div>
                <div class="interval-direction">${direction}</div>
                <div class="interval-semitones">${Math.abs(interval)}半音</div>
                <div class="interval-cents">${intervalInfo.cents}¢</div>
            </div>
        `;
        
        // 音程の質を評価
        this.evaluateIntervalQuality(interval, intervalInfo);
    }
    
    evaluateIntervalQuality(interval, intervalInfo) {
        const harmonyDisplay = document.getElementById('harmonyDisplay');
        
        // 協和音程の判定
        const consonantIntervals = [0, 3, 4, 5, 7, 8, 9, 12]; // ユニゾン、長短3度、完全4,5度、長短6度、オクターブ
        const isConsonant = consonantIntervals.includes(Math.abs(interval) % 12);
        
        // 完全協和音程の判定
        const perfectConsonances = [0, 5, 7, 12]; // ユニゾン、完全4,5度、オクターブ
        const isPerfectConsonant = perfectConsonances.includes(Math.abs(interval) % 12);
        
        let harmonyType = '';
        let harmonyClass = '';
        
        if (isPerfectConsonant) {
            harmonyType = '完全協和音程';
            harmonyClass = 'perfect-consonance';
        } else if (isConsonant) {
            harmonyType = '協和音程';
            harmonyClass = 'consonance';
        } else {
            harmonyType = '不協和音程';
            harmonyClass = 'dissonance';
        }
        
        harmonyDisplay.innerHTML = `
            <div class="harmony-result ${harmonyClass}">
                <div class="harmony-type">${harmonyType}</div>
                <div class="harmony-ratio">周波数比: ${intervalInfo.ratio.toFixed(3)}</div>
            </div>
        `;
    }
    
    analyzeKeySignature() {
        if (this.scaleAnalysis) {
            const keySignature = PitchPro.MusicTheory.getKeySignature(
                this.scaleAnalysis.root.name.replace(/\d+$/, ''),
                this.scaleAnalysis.scale === 'major' ? 'major' : 'minor'
            );
            
            this.keySignature = keySignature;
            
            let signatureText = '';
            if (keySignature.sharps.length > 0) {
                signatureText = `♯${keySignature.sharps.length}個: ${keySignature.sharps.join(', ')}`;
            } else if (keySignature.flats.length > 0) {
                signatureText = `♭${keySignature.flats.length}個: ${keySignature.flats.join(', ')}`;
            } else {
                signatureText = '調号なし';
            }
            
            document.getElementById('keySignatureDisplay').innerHTML = `
                <div class="key-result">
                    <div class="key-name">${this.scaleAnalysis.root.name.replace(/\d+$/, '')} ${this.scaleAnalysis.scale === 'major' ? 'メジャー' : 'マイナー'}</div>
                    <div class="key-signature">${signatureText}</div>
                </div>
            `;
        }
    }
    
    translateScaleName(scaleName) {
        const translations = {
            'major': 'メジャー',
            'naturalMinor': 'ナチュラルマイナー',
            'harmonicMinor': 'ハーモニックマイナー',
            'melodicMinor': 'メロディックマイナー',
            'dorian': 'ドリアン',
            'phrygian': 'フリジアン',
            'lydian': 'リディアン',
            'mixolydian': 'ミクソリディアン',
            'locrian': 'ロクリアン',
            'pentatonicMajor': 'メジャーペンタトニック',
            'pentatonicMinor': 'マイナーペンタトニック',
            'blues': 'ブルース',
            'chromatic': 'クロマチック'
        };
        return translations[scaleName] || scaleName;
    }
    
    formatChordName(chord) {
        const chordTypeTranslations = {
            'major': 'M',
            'minor': 'm',
            'diminished': 'dim',
            'augmented': 'aug',
            'sus2': 'sus2',
            'sus4': 'sus4',
            'major7': 'M7',
            'minor7': 'm7',
            'dominant7': '7',
            'majorMaj7': 'M△7',
            'halfDiminished7': 'm7♭5',
            'diminished7': 'dim7',
            'add9': 'add9',
            'major9': 'M9',
            'minor9': 'm9'
        };
        
        const rootName = chord.root.name.replace(/\d+$/, '');
        const chordType = chordTypeTranslations[chord.chord] || chord.chord;
        
        return rootName + chordType;
    }
    
    clearAnalysisHistory() {
        this.noteHistory = [];
        this.scaleAnalysis = null;
        this.keySignature = null;
        
        // 表示をクリア
        document.getElementById('keySignatureDisplay').textContent = '分析中...';
        document.getElementById('scaleDisplay').textContent = '分析中...';
        document.getElementById('chordDisplay').textContent = '分析中...';
        document.getElementById('intervalsDisplay').textContent = '分析中...';
        document.getElementById('noteTimeline').innerHTML = '<p>演奏を開始してください...</p>';
        document.getElementById('harmonyDisplay').textContent = '';
        
        console.log('音楽理論分析履歴をクリアしました');
    }
    
    exportAnalysisResults() {
        if (this.noteHistory.length === 0) {
            alert('エクスポートするデータがありません。');
            return;
        }
        
        const analysisData = {
            timestamp: new Date().toISOString(),
            noteHistory: this.noteHistory,
            scaleAnalysis: this.scaleAnalysis,
            keySignature: this.keySignature,
            summary: {
                totalNotes: this.noteHistory.length,
                timeSpan: this.noteHistory.length > 0 ? 
                    this.noteHistory[this.noteHistory.length - 1].timestamp - this.noteHistory[0].timestamp : 0,
                averageClarity: this.noteHistory.reduce((sum, note) => sum + note.clarity, 0) / this.noteHistory.length
            }
        };
        
        const dataStr = JSON.stringify(analysisData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `pitchpro-analysis-${new Date().getTime()}.json`;
        link.click();
        
        console.log('分析結果をエクスポートしました');
    }
}
```

---

## <a id="advanced-harmonic"></a>6. 🔧 高度なハーモニック補正システム

より精密なハーモニック補正とオクターブエラー検出の実装例です。

```javascript
class AdvancedHarmonicSystem extends BasicPitchApp {
    constructor() {
        super();
        
        // ハーモニック補正システム
        this.harmonicCorrection = new PitchPro.HarmonicCorrection({
            historyWindowMs: 3000,
            minConfidenceThreshold: 0.7,
            harmonicToleranceCents: 20,
            maxHarmonicNumber: 16,
            stabilityWeight: 0.8,
            volumeWeight: 0.2
        });
        
        // 分析データ
        this.harmonicAnalysisData = [];
        this.correctionHistory = [];
        
        this.setupHarmonicFeatures();
    }
    
    setupHarmonicFeatures() {
        this.createHarmonicDisplay();
        this.setupHarmonicControls();
        this.setupVisualization();
    }
    
    createHarmonicDisplay() {
        const container = document.getElementById('harmonicAnalysis');
        container.innerHTML = `
            <div class="harmonic-section">
                <h3>高度ハーモニック分析</h3>
                
                <div class="harmonic-controls">
                    <label>補正感度:</label>
                    <input type="range" id="harmonicSensitivity" min="0.3" max="1.0" step="0.1" value="0.7">
                    <span id="sensitivityDisplay">0.7</span>
                    
                    <label>最大ハーモニック:</label>
                    <input type="range" id="maxHarmonic" min="4" max="32" step="2" value="16">
                    <span id="maxHarmonicDisplay">16</span>
                    
                    <button id="toggleHarmonicCorrection">補正: ON</button>
                </div>
                
                <div class="harmonic-display">
                    <div class="harmonic-card" id="detectionCard">
                        <h4>検出結果</h4>
                        <div id="detectionResults"></div>
                    </div>
                    
                    <div class="harmonic-card" id="correctionCard">
                        <h4>補正結果</h4>
                        <div id="correctionResults"></div>
                    </div>
                    
                    <div class="harmonic-card" id="confidenceCard">
                        <h4>信頼度</h4>
                        <div id="confidenceResults"></div>
                    </div>
                    
                    <div class="harmonic-card" id="statsCard">
                        <h4>統計</h4>
                        <div id="harmonicStats"></div>
                    </div>
                </div>
                
                <div class="harmonic-visualization">
                    <h4>ハーモニック スペクトラム</h4>
                    <canvas id="harmonicSpectrum" width="600" height="200"></canvas>
                </div>
                
                <div class="harmonic-history">
                    <h4>補正履歴</h4>
                    <div id="correctionHistory"></div>
                </div>
            </div>
        `;
    }
    
    setupHarmonicControls() {
        const sensitivitySlider = document.getElementById('harmonicSensitivity');
        const sensitivityDisplay = document.getElementById('sensitivityDisplay');
        const maxHarmonicSlider = document.getElementById('maxHarmonic');
        const maxHarmonicDisplay = document.getElementById('maxHarmonicDisplay');
        const toggleButton = document.getElementById('toggleHarmonicCorrection');
        
        // 補正感度調整
        sensitivitySlider.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            sensitivityDisplay.textContent = value;
            this.harmonicCorrection.updateConfig({
                minConfidenceThreshold: value
            });
        });
        
        // 最大ハーモニック数調整
        maxHarmonicSlider.addEventListener('input', (e) => {
            const value = parseInt(e.target.value);
            maxHarmonicDisplay.textContent = value;
            this.harmonicCorrection.updateConfig({
                maxHarmonicNumber: value
            });
        });
        
        // 補正のON/OFF
        let correctionEnabled = true;
        toggleButton.addEventListener('click', () => {
            correctionEnabled = !correctionEnabled;
            toggleButton.textContent = `補正: ${correctionEnabled ? 'ON' : 'OFF'}`;
            toggleButton.className = correctionEnabled ? 'btn-success' : 'btn-danger';
            
            if (!correctionEnabled) {
                this.harmonicCorrection.resetHistory();
            }
        });
        
        this.correctionEnabled = () => correctionEnabled;
    }
    
    setupVisualization() {
        this.harmonicCanvas = document.getElementById('harmonicSpectrum');
        this.harmonicCtx = this.harmonicCanvas.getContext('2d');
        this.harmonicFrequencies = [];
    }
    
    updateDisplay(result) {
        super.updateDisplay(result);
        
        if (result.frequency > 0) {
            this.performHarmonicAnalysis(result);
        }
    }
    
    performHarmonicAnalysis(result) {
        // ハーモニック補正実行
        let correctionResult = null;
        if (this.correctionEnabled()) {
            correctionResult = this.harmonicCorrection.correctFrequency(
                result.frequency,
                result.volume / 100
            );
        }
        
        // 基本周波数の検出
        const fundamentalAnalysis = this.analyzeFundamental(result.frequency);
        
        // 表示更新
        this.updateDetectionDisplay(result, fundamentalAnalysis);
        this.updateCorrectionDisplay(result, correctionResult);
        this.updateConfidenceDisplay(correctionResult);
        this.updateStatsDisplay();
        this.updateHarmonicVisualization(result.frequency, fundamentalAnalysis);
        
        // 履歴記録
        this.recordAnalysisData(result, correctionResult, fundamentalAnalysis);
    }
    
    analyzeFundamental(frequency) {
        // 可能な基本周波数を計算
        const possibleFundamentals = [];
        
        for (let harmonic = 1; harmonic <= 16; harmonic++) {
            const fundamental = frequency / harmonic;
            
            // 人間の音域内かチェック
            if (fundamental >= 60 && fundamental <= 1200) {
                // ハーモニック系列を生成
                const harmonicSeries = PitchPro.FrequencyUtils.findHarmonics(fundamental, harmonic + 4);
                
                // 入力周波数との一致度を計算
                let bestMatch = 0;
                let matchConfidence = 0;
                
                harmonicSeries.forEach((harmonicFreq, index) => {
                    const cents = Math.abs(1200 * Math.log2(frequency / harmonicFreq));
                    if (cents < 30) { // 30セント以内
                        const confidence = 1 - (cents / 30);
                        if (confidence > matchConfidence) {
                            matchConfidence = confidence;
                            bestMatch = index + 1;
                        }
                    }
                });
                
                if (matchConfidence > 0) {
                    possibleFundamentals.push({
                        fundamental,
                        harmonicNumber: harmonic,
                        matchedHarmonic: bestMatch,
                        confidence: matchConfidence,
                        likelihood: matchConfidence / harmonic // ハーモニック数で重み付け
                    });
                }
            }
        }
        
        // 最も可能性の高い基本周波数を選択
        possibleFundamentals.sort((a, b) => b.likelihood - a.likelihood);
        
        return {
            originalFrequency: frequency,
            possibleFundamentals: possibleFundamentals.slice(0, 5),
            bestFundamental: possibleFundamentals[0] || null
        };
    }
    
    updateDetectionDisplay(result, fundamentalAnalysis) {
        const container = document.getElementById('detectionResults');
        
        let content = `
            <div class="detection-info">
                <div>検出周波数: ${result.frequency.toFixed(2)} Hz</div>
                <div>音符: ${result.note}</div>
                <div>明瞭度: ${result.clarity.toFixed(3)}</div>
            </div>
        `;
        
        if (fundamentalAnalysis.bestFundamental) {
            const best = fundamentalAnalysis.bestFundamental;
            const fundamentalNote = PitchPro.FrequencyUtils.frequencyToNote(best.fundamental);
            
            content += `
                <div class="fundamental-info">
                    <h5>推定基本周波数</h5>
                    <div>周波数: ${best.fundamental.toFixed(2)} Hz</div>
                    <div>音符: ${fundamentalNote.name}</div>
                    <div>ハーモニック: ${best.harmonicNumber}次</div>
                    <div>信頼度: ${(best.confidence * 100).toFixed(1)}%</div>
                </div>
            `;
        }
        
        // 候補の基本周波数
        if (fundamentalAnalysis.possibleFundamentals.length > 1) {
            content += `
                <div class="fundamental-candidates">
                    <h5>候補</h5>
                    ${fundamentalAnalysis.possibleFundamentals.slice(1, 4).map(candidate => {
                        const note = PitchPro.FrequencyUtils.frequencyToNote(candidate.fundamental);
                        return `
                            <div class="candidate">
                                ${note.name}: ${candidate.fundamental.toFixed(1)}Hz (${candidate.harmonicNumber}次, ${(candidate.confidence * 100).toFixed(1)}%)
                            </div>
                        `;
                    }).join('')}
                </div>
            `;
        }
        
        container.innerHTML = content;
    }
    
    updateCorrectionDisplay(result, correctionResult) {
        const container = document.getElementById('correctionResults');
        
        if (!correctionResult) {
            container.innerHTML = '<div>補正: OFF</div>';
            return;
        }
        
        const originalNote = PitchPro.FrequencyUtils.frequencyToNote(result.frequency);
        const correctedNote = PitchPro.FrequencyUtils.frequencyToNote(correctionResult.correctedFreq);
        
        const cents = Math.round(1200 * Math.log2(correctionResult.correctedFreq / result.frequency));
        
        container.innerHTML = `
            <div class="correction-info">
                <div class="original">
                    元の音程: ${originalNote.name} (${result.frequency.toFixed(2)}Hz)
                </div>
                <div class="corrected ${correctionResult.correctionApplied ? 'applied' : 'no-correction'}">
                    補正後: ${correctedNote.name} (${correctionResult.correctedFreq.toFixed(2)}Hz)
                </div>
                ${correctionResult.correctionApplied ? `
                    <div class="correction-amount">
                        補正量: ${cents > 0 ? '+' : ''}${cents}¢
                    </div>
                ` : '<div class="no-correction">補正なし</div>'}
            </div>
        `;
    }
    
    updateConfidenceDisplay(correctionResult) {
        const container = document.getElementById('confidenceResults');
        
        if (!correctionResult) {
            container.innerHTML = '<div>補正無効</div>';
            return;
        }
        
        const confidencePercent = correctionResult.confidence * 100;
        let confidenceLevel = '';
        
        if (confidencePercent >= 80) confidenceLevel = '非常に高い';
        else if (confidencePercent >= 60) confidenceLevel = '高い';
        else if (confidencePercent >= 40) confidenceLevel = '中程度';
        else confidenceLevel = '低い';
        
        container.innerHTML = `
            <div class="confidence-display">
                <div class="confidence-value">${confidencePercent.toFixed(1)}%</div>
                <div class="confidence-level">${confidenceLevel}</div>
                <div class="confidence-bar">
                    <div class="confidence-fill" style="width: ${confidencePercent}%"></div>
                </div>
            </div>
        `;
    }
    
    updateStatsDisplay() {
        const stats = this.harmonicCorrection.getAnalysisStats();
        const container = document.getElementById('harmonicStats');
        
        container.innerHTML = `
            <div class="stats-grid">
                <div class="stat-item">
                    <label>履歴長:</label>
                    <span>${stats.historyLength}</span>
                </div>
                <div class="stat-item">
                    <label>平均信頼度:</label>
                    <span>${(stats.averageConfidence * 100).toFixed(1)}%</span>
                </div>
                <div class="stat-item">
                    <label>安定性:</label>
                    <span>${(stats.stabilityScore * 100).toFixed(1)}%</span>
                </div>
                ${stats.frequencyRange ? `
                    <div class="stat-item">
                        <label>周波数範囲:</label>
                        <span>${stats.frequencyRange.min.toFixed(0)}-${stats.frequencyRange.max.toFixed(0)}Hz</span>
                    </div>
                ` : ''}
            </div>
        `;
    }
    
    updateHarmonicVisualization(frequency, fundamentalAnalysis) {
        const ctx = this.harmonicCtx;
        const canvas = this.harmonicCanvas;
        
        // キャンバスクリア
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        if (!fundamentalAnalysis.bestFundamental) return;
        
        const fundamental = fundamentalAnalysis.bestFundamental.fundamental;
        const harmonics = PitchPro.FrequencyUtils.findHarmonics(fundamental, 16);
        
        // 描画パラメータ
        const margin = 40;
        const width = canvas.width - 2 * margin;
        const height = canvas.height - 2 * margin;
        
        // 周波数範囲 (基音の8倍まで)
        const minFreq = fundamental * 0.8;
        const maxFreq = fundamental * 8;
        
        // 軸の描画
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 1;
        
        // X軸
        ctx.beginPath();
        ctx.moveTo(margin, canvas.height - margin);
        ctx.lineTo(canvas.width - margin, canvas.height - margin);
        ctx.stroke();
        
        // Y軸
        ctx.beginPath();
        ctx.moveTo(margin, margin);
        ctx.lineTo(margin, canvas.height - margin);
        ctx.stroke();
        
        // ハーモニクス描画
        harmonics.forEach((harmonicFreq, index) => {
            if (harmonicFreq <= maxFreq) {
                const x = margin + (Math.log(harmonicFreq / minFreq) / Math.log(maxFreq / minFreq)) * width;
                const amplitude = 1 / (index + 1); // 1/n の振幅
                const y = canvas.height - margin - (amplitude * height * 0.8);
                
                // ハーモニクスバー
                ctx.fillStyle = index === 0 ? '#ff6b6b' : '#4ecdc4';
                ctx.fillRect(x - 2, y, 4, canvas.height - margin - y);
                
                // 周波数ラベル
                if (index < 8) { // 最初の8つのみラベル表示
                    ctx.fillStyle = '#333';
                    ctx.font = '10px Arial';
                    ctx.textAlign = 'center';
                    ctx.fillText(`${(index + 1)}`, x, canvas.height - margin + 15);
                    ctx.fillText(`${harmonicFreq.toFixed(0)}`, x, canvas.height - margin + 28);
                }
            }
        });
        
        // 検出周波数マーカー
        if (frequency >= minFreq && frequency <= maxFreq) {
            const x = margin + (Math.log(frequency / minFreq) / Math.log(maxFreq / minFreq)) * width;
            
            ctx.strokeStyle = '#e74c3c';
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);
            ctx.beginPath();
            ctx.moveTo(x, margin);
            ctx.lineTo(x, canvas.height - margin);
            ctx.stroke();
            ctx.setLineDash([]);
            
            // マーカーラベル
            ctx.fillStyle = '#e74c3c';
            ctx.font = 'bold 12px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('検出', x, margin - 10);
        }
    }
    
    recordAnalysisData(result, correctionResult, fundamentalAnalysis) {
        const analysisEntry = {
            timestamp: Date.now(),
            originalFrequency: result.frequency,
            originalNote: result.note,
            clarity: result.clarity,
            volume: result.volume,
            correctionResult: correctionResult,
            fundamentalAnalysis: fundamentalAnalysis
        };
        
        this.harmonicAnalysisData.push(analysisEntry);
        
        // データサイズ制限
        if (this.harmonicAnalysisData.length > 100) {
            this.harmonicAnalysisData.shift();
        }
        
        // 補正が適用された場合は履歴に記録
        if (correctionResult && correctionResult.correctionApplied) {
            this.correctionHistory.push(analysisEntry);
            
            if (this.correctionHistory.length > 20) {
                this.correctionHistory.shift();
            }
            
            this.updateCorrectionHistory();
        }
    }
    
    updateCorrectionHistory() {
        const container = document.getElementById('correctionHistory');
        
        if (this.correctionHistory.length === 0) {
            container.innerHTML = '<p>補正履歴がありません</p>';
            return;
        }
        
        const recentCorrections = this.correctionHistory.slice(-5).reverse();
        
        container.innerHTML = recentCorrections.map(entry => {
            const correctionCents = Math.round(1200 * Math.log2(
                entry.correctionResult.correctedFreq / entry.originalFrequency
            ));
            
            return `
                <div class="correction-entry">
                    <span class="correction-time">
                        ${new Date(entry.timestamp).toLocaleTimeString()}
                    </span>
                    <span class="correction-change">
                        ${entry.originalNote} → 
                        ${PitchPro.FrequencyUtils.frequencyToNote(entry.correctionResult.correctedFreq).name}
                    </span>
                    <span class="correction-cents">
                        ${correctionCents > 0 ? '+' : ''}${correctionCents}¢
                    </span>
                    <span class="correction-confidence">
                        ${(entry.correctionResult.confidence * 100).toFixed(0)}%
                    </span>
                </div>
            `;
        }).join('');
    }
}
```

---

## <a id="multiplatform"></a>7. 📱 マルチプラットフォーム対応

異なるデバイスやブラウザで最適に動作するための実装例です。

```javascript
class MultiPlatformPitchApp extends BasicPitchApp {
    constructor() {
        super();
        
        // プラットフォーム検出
        this.deviceInfo = this.detectPlatform();
        this.optimizeForPlatform();
        this.setupPlatformFeatures();
    }
    
    detectPlatform() {
        const deviceSpecs = PitchPro.DeviceDetection.getDeviceSpecs();
        const capabilities = PitchPro.DeviceDetection.getDeviceCapabilities();
        
        return {
            deviceType: deviceSpecs.deviceType,
            isIOS: deviceSpecs.isIOS,
            isMobile: PitchPro.DeviceDetection.isMobile(),
            isTablet: PitchPro.DeviceDetection.isTablet(),
            isDesktop: PitchPro.DeviceDetection.isDesktop(),
            touchSupport: capabilities.touchSupport,
            webAudioSupport: capabilities.webAudioSupport,
            mediaDevicesSupport: capabilities.mediaDevicesSupport,
            userAgent: capabilities.userAgent,
            screenSize: capabilities.screenSize,
            language: capabilities.language,
            platform: capabilities.platform
        };
    }
    
    optimizeForPlatform() {
        // デバイス別最適化
        if (this.deviceInfo.deviceType === 'iPad') {
            this.applyIPadOptimizations();
        } else if (this.deviceInfo.deviceType === 'iPhone') {
            this.applyIPhoneOptimizations();
        } else if (this.deviceInfo.isDesktop) {
            this.applyDesktopOptimizations();
        }
        
        // ブラウザ別最適化
        this.applyBrowserOptimizations();
        
        // タッチデバイス最適化
        if (this.deviceInfo.touchSupport) {
            this.applyTouchOptimizations();
        }
    }
    
    applyIPadOptimizations() {
        console.log('🍎 iPad最適化を適用中...');
        
        // 高感度設定
        this.audioManager.setSensitivity(7.0);
        
        // iPadの大画面を活用したUI調整
        document.body.classList.add('platform-ipad');
        
        // 横向きレイアウト対応
        this.setupOrientationHandling();
        
        // iPad特有のマイクアクセス設定
        this.setupIPadAudioConstraints();
    }
    
    applyIPhoneOptimizations() {
        console.log('📱 iPhone最適化を適用中...');
        
        // 中感度設定
        this.audioManager.setSensitivity(3.0);
        
        // 縦向きモバイルレイアウト
        document.body.classList.add('platform-iphone');
        
        // iPhoneのコンパクト表示
        this.setupCompactLayout();
        
        // ノッチ対応
        this.setupSafeAreaHandling();
    }
    
    applyDesktopOptimizations() {
        console.log('🖥️ デスクトップ最適化を適用中...');
        
        // 標準感度
        this.audioManager.setSensitivity(1.0);
        
        // デスクトップレイアウト
        document.body.classList.add('platform-desktop');
        
        // キーボードショートカット
        this.setupKeyboardShortcuts();
        
        // マウス操作最適化
        this.setupMouseOptimizations();
    }
    
    applyBrowserOptimizations() {
        const userAgent = this.deviceInfo.userAgent;
        
        // Safari最適化
        if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
            this.applySafariOptimizations();
        }
        
        // Chrome最適化
        if (userAgent.includes('Chrome')) {
            this.applyChromeOptimizations();
        }
        
        // Firefox最適化
        if (userAgent.includes('Firefox')) {
            this.applyFirefoxOptimizations();
        }
    }
    
    applySafariOptimizations() {
        console.log('🧭 Safari最適化を適用中...');
        
        // Safari特有のAudioContext制限対応
        this.setupSafariAudioContextFix();
        
        // iOS Safari の音声遅延対策
        if (this.deviceInfo.isIOS) {
            this.audioManager.config.latency = 0.05; // 低遅延設定
        }
    }
    
    applyChromeOptimizations() {
        console.log('🌐 Chrome最適化を適用中...');
        
        // Chrome の高精度タイマー活用
        this.enableHighResolutionTiming();
        
        // Web Audio API の最新機能使用
        this.enableAdvancedWebAudioFeatures();
    }
    
    applyFirefoxOptimizations() {
        console.log('🦊 Firefox最適化を適用中...');
        
        // Firefox の MediaStream 制限対応
        this.setupFirefoxMediaStreamFix();
    }
    
    applyTouchOptimizations() {
        console.log('👆 タッチデバイス最適化を適用中...');
        
        // タッチフレンドリーなUI
        this.setupTouchUI();
        
        // ジェスチャー操作
        this.setupGestureHandling();
        
        // バーチャルキーボード対応
        this.setupVirtualKeyboardHandling();
    }
    
    setupPlatformFeatures() {
        this.createPlatformInfo();
        this.setupAdaptiveControls();
        this.setupResponsiveLayout();
    }
    
    createPlatformInfo() {
        const container = document.getElementById('platformInfo');
        container.innerHTML = `
            <div class="platform-info">
                <h4>プラットフォーム情報</h4>
                <div class="info-grid">
                    <div class="info-item">
                        <label>デバイス:</label>
                        <span>${this.deviceInfo.deviceType}</span>
                    </div>
                    <div class="info-item">
                        <label>画面:</label>
                        <span>${this.deviceInfo.screenSize?.width}×${this.deviceInfo.screenSize?.height}</span>
                    </div>
                    <div class="info-item">
                        <label>タッチ:</label>
                        <span>${this.deviceInfo.touchSupport ? '対応' : '非対応'}</span>
                    </div>
                    <div class="info-item">
                        <label>Web Audio:</label>
                        <span class="${this.deviceInfo.webAudioSupport ? 'supported' : 'not-supported'}">
                            ${this.deviceInfo.webAudioSupport ? '対応' : '非対応'}
                        </span>
                    </div>
                    <div class="info-item">
                        <label>MediaDevices:</label>
                        <span class="${this.deviceInfo.mediaDevicesSupport ? 'supported' : 'not-supported'}">
                            ${this.deviceInfo.mediaDevicesSupport ? '対応' : '非対応'}
                        </span>
                    </div>
                </div>
                
                <div class="optimization-status">
                    <h5>適用された最適化</h5>
                    <div id="appliedOptimizations"></div>
                </div>
            </div>
        `;
        
        this.updateOptimizationStatus();
    }
    
    setupOrientationHandling() {
        if (!this.deviceInfo.isMobile && !this.deviceInfo.isTablet) return;
        
        const handleOrientationChange = () => {
            setTimeout(() => {
                const isLandscape = window.innerWidth > window.innerHeight;
                document.body.classList.toggle('landscape', isLandscape);
                document.body.classList.toggle('portrait', !isLandscape);
                
                console.log(`画面向き変更: ${isLandscape ? '横向き' : '縦向き'}`);
                
                // レイアウト再調整
                this.adjustLayoutForOrientation(isLandscape);
            }, 100);
        };
        
        window.addEventListener('orientationchange', handleOrientationChange);
        window.addEventListener('resize', handleOrientationChange);
        
        // 初期設定
        handleOrientationChange();
    }
    
    adjustLayoutForOrientation(isLandscape) {
        const displayArea = document.getElementById('display');
        
        if (isLandscape) {
            // 横向き：左右分割レイアウト
            displayArea.classList.add('landscape-layout');
        } else {
            // 縦向き：上下分割レイアウト
            displayArea.classList.remove('landscape-layout');
        }
    }
    
    setupKeyboardShortcuts() {
        if (!this.deviceInfo.isDesktop) return;
        
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + スペースキー: 開始/停止
            if ((e.ctrlKey || e.metaKey) && e.code === 'Space') {
                e.preventDefault();
                if (this.isActive) {
                    this.stop();
                } else {
                    this.start();
                }
            }
            
            // Ctrl/Cmd + R: リセット
            if ((e.ctrlKey || e.metaKey) && e.code === 'KeyR') {
                e.preventDefault();
                this.resetDisplay();
            }
            
            // Ctrl/Cmd + S: 感度調整
            if ((e.ctrlKey || e.metaKey) && e.code === 'KeyS') {
                e.preventDefault();
                const currentSensitivity = this.audioManager.getSensitivity();
                const newSensitivity = currentSensitivity >= 3 ? 1 : currentSensitivity + 0.5;
                this.audioManager.setSensitivity(newSensitivity);
                this.updateStatus(`感度: ${newSensitivity}x`);
            }
        });
        
        console.log('⌨️ キーボードショートカットを設定しました');
    }
    
    setupTouchUI() {
        // ボタンサイズを拡大
        const buttons = document.querySelectorAll('button');
        buttons.forEach(button => {
            button.classList.add('touch-friendly');
        });
        
        // スライダーをタッチフレンドリーに
        const sliders = document.querySelectorAll('input[type="range"]');
        sliders.forEach(slider => {
            slider.classList.add('touch-slider');
        });
    }
    
    setupGestureHandling() {
        let touchStartY = 0;
        let touchStartX = 0;
        
        document.addEventListener('touchstart', (e) => {
            touchStartY = e.touches[0].clientY;
            touchStartX = e.touches[0].clientX;
        });
        
        document.addEventListener('touchend', (e) => {
            const touchEndY = e.changedTouches[0].clientY;
            const touchEndX = e.changedTouches[0].clientX;
            
            const deltaY = touchEndY - touchStartY;
            const deltaX = touchEndX - touchStartX;
            
            // スワイプジェスチャー検出
            if (Math.abs(deltaY) > 50 || Math.abs(deltaX) > 50) {
                if (Math.abs(deltaX) > Math.abs(deltaY)) {
                    // 横スワイプ
                    if (deltaX > 0) {
                        // 右スワイプ: 感度上げる
                        const current = this.audioManager.getSensitivity();
                        this.audioManager.setSensitivity(Math.min(5, current + 0.5));
                    } else {
                        // 左スワイプ: 感度下げる
                        const current = this.audioManager.getSensitivity();
                        this.audioManager.setSensitivity(Math.max(0.5, current - 0.5));
                    }
                } else {
                    // 縦スワイプ
                    if (deltaY < 0) {
                        // 上スワイプ: 開始
                        if (!this.isActive) this.start();
                    } else {
                        // 下スワイプ: 停止
                        if (this.isActive) this.stop();
                    }
                }
            }
        });
    }
    
    setupSafariAudioContextFix() {
        // Safari の AudioContext 自動再開対策
        const resumeAudioContext = async () => {
            if (this.audioManager.audioContext && this.audioManager.audioContext.state === 'suspended') {
                try {
                    await this.audioManager.audioContext.resume();
                    console.log('🔊 Safari AudioContext を再開しました');
                } catch (error) {
                    console.warn('AudioContext 再開に失敗:', error);
                }
            }
        };
        
        // ユーザーインタラクション時に AudioContext を再開
        const userEvents = ['touchstart', 'touchend', 'mousedown', 'keydown'];
        userEvents.forEach(eventType => {
            document.addEventListener(eventType, resumeAudioContext, { once: true });
        });
    }
    
    setupResponsiveLayout() {
        // CSS カスタムプロパティでレスポンシブ値を設定
        const setResponsiveProperties = () => {
            const root = document.documentElement;
            const width = window.innerWidth;
            
            if (width < 480) {
                // スマートフォン
                root.style.setProperty('--app-padding', '10px');
                root.style.setProperty('--font-size-base', '14px');
                root.style.setProperty('--button-height', '44px');
            } else if (width < 768) {
                // タブレット縦向き
                root.style.setProperty('--app-padding', '15px');
                root.style.setProperty('--font-size-base', '16px');
                root.style.setProperty('--button-height', '40px');
            } else if (width < 1024) {
                // タブレット横向き
                root.style.setProperty('--app-padding', '20px');
                root.style.setProperty('--font-size-base', '16px');
                root.style.setProperty('--button-height', '38px');
            } else {
                // デスクトップ
                root.style.setProperty('--app-padding', '30px');
                root.style.setProperty('--font-size-base', '16px');
                root.style.setProperty('--button-height', '36px');
            }
        };
        
        window.addEventListener('resize', setResponsiveProperties);
        setResponsiveProperties();
    }
    
    updateOptimizationStatus() {
        const container = document.getElementById('appliedOptimizations');
        const optimizations = [];
        
        if (this.deviceInfo.deviceType === 'iPad') {
            optimizations.push('iPad高感度設定 (7.0x)');
            optimizations.push('横向きレイアウト対応');
        } else if (this.deviceInfo.deviceType === 'iPhone') {
            optimizations.push('iPhone中感度設定 (3.0x)');
            optimizations.push('コンパクトレイアウト');
            optimizations.push('セーフエリア対応');
        } else if (this.deviceInfo.isDesktop) {
            optimizations.push('デスクトップ標準設定 (1.0x)');
            optimizations.push('キーボードショートカット');
        }
        
        if (this.deviceInfo.touchSupport) {
            optimizations.push('タッチフレンドリーUI');
            optimizations.push('ジェスチャー操作');
        }
        
        if (this.deviceInfo.userAgent.includes('Safari') && !this.deviceInfo.userAgent.includes('Chrome')) {
            optimizations.push('Safari AudioContext対策');
        }
        
        container.innerHTML = optimizations.length > 0 ? 
            `<ul>${optimizations.map(opt => `<li>${opt}</li>`).join('')}</ul>` : 
            '<p>基本設定のみ</p>';
    }
    
    // プラットフォーム固有のエラーハンドリング
    handleError(error) {
        super.handleError(error);
        
        // iOS Safari の特殊なエラー処理
        if (this.deviceInfo.isIOS && error.message.includes('AudioContext')) {
            this.showIOSAudioContextHelp();
        }
        
        // Android Chrome の MediaStream エラー処理
        if (this.deviceInfo.userAgent.includes('Android') && error.message.includes('getUserMedia')) {
            this.showAndroidPermissionHelp();
        }
    }
    
    showIOSAudioContextHelp() {
        const helpMessage = `
            iOS では画面タッチ後にオーディオが有効化されます。
            画面をタップしてから再度お試しください。
        `;
        
        const helpDialog = document.createElement('div');
        helpDialog.className = 'platform-help-dialog';
        helpDialog.innerHTML = `
            <div class="help-content">
                <h4>🍎 iOS オーディオ設定</h4>
                <p>${helpMessage}</p>
                <button onclick="this.parentElement.parentElement.remove()">了解</button>
            </div>
        `;
        
        document.body.appendChild(helpDialog);
    }
    
    showAndroidPermissionHelp() {
        const helpMessage = `
            Android ではマイクアクセス許可が必要です。
            ブラウザの設定からマイクアクセスを許可してください。
        `;
        
        const helpDialog = document.createElement('div');
        helpDialog.className = 'platform-help-dialog';
        helpDialog.innerHTML = `
            <div class="help-content">
                <h4>🤖 Android マイク設定</h4>
                <p>${helpMessage}</p>
                <button onclick="this.parentElement.parentElement.remove()">了解</button>
            </div>
        `;
        
        document.body.appendChild(helpDialog);
    }
}
```

---

## <a id="error-handling"></a>8. ⚠️ 包括的エラーハンドリング

堅牢なエラー処理とユーザーフレンドリーなエラー表示の実装例です。

```javascript
class RobustPitchApp extends BasicPitchApp {
    constructor() {
        super();
        
        // エラーハンドリングシステム
        this.errorSystem = new PitchPro.ErrorNotificationSystem();
        this.errorRecoveryAttempts = 0;
        this.maxRecoveryAttempts = 3;
        this.lastError = null;
        
        this.setupErrorHandling();
        this.setupHealthMonitoring();
    }
    
    setupErrorHandling() {
        // グローバルエラーハンドラー
        window.addEventListener('error', (e) => {
            this.handleGlobalError(e.error, 'JavaScript Error');
        });
        
        window.addEventListener('unhandledrejection', (e) => {
            this.handleGlobalError(e.reason, 'Unhandled Promise Rejection');
        });
        
        // AudioContext エラーハンドリング
        this.setupAudioContextErrorHandling();
        
        // MediaStream エラーハンドリング
        this.setupMediaStreamErrorHandling();
    }
    
    setupAudioContextErrorHandling() {
        const originalInitialize = this.audioManager.initialize.bind(this.audioManager);
        
        this.audioManager.initialize = async () => {
            try {
                return await originalInitialize();
            } catch (error) {
                return this.handleAudioManagerError(error);
            }
        };
    }
    
    async handleAudioManagerError(error) {
        console.error('AudioManager エラー:', error);
        
        // エラー分類と対処
        if (error.name === 'NotAllowedError') {
            this.errorSystem.showMicrophoneError(error, 'permission');
            throw error;
        }
        
        if (error.name === 'NotFoundError') {
            this.errorSystem.showError(
                'マイクが見つかりません',
                'マイクが接続されていないか、別のアプリケーションで使用されています。',
                {
                    details: [
                        'マイクが正しく接続されているか確認してください',
                        '他のアプリケーションでマイクを使用していないか確認してください',
                        'ブラウザを再起動してみてください'
                    ],
                    solution: 'マイクの接続状態を確認し、他のアプリケーションを閉じてから再試行してください。'
                }
            );
            throw error;
        }
        
        if (error.name === 'OverconstrainedError') {
            // より緩い制約で再試行
            console.log('制約を緩めて再試行中...');
            return this.retryWithRelaxedConstraints();
        }
        
        if (error.message.includes('AudioContext')) {
            return this.handleAudioContextSpecificError(error);
        }
        
        // その他のエラー
        this.errorSystem.showError(
            'オーディオ初期化エラー',
            `音声システムの初期化に失敗しました: ${error.message}`,
            {
                details: [
                    'ブラウザがWeb Audio APIに対応していない可能性があります',
                    'デバイスの音声設定を確認してください'
                ],
                solution: 'ページを再読み込みするか、対応ブラウザをご使用ください。'
            }
        );
        
        throw error;
    }
    
    async retryWithRelaxedConstraints() {
        console.log('🔄 制約を緩めてオーディオ初期化を再試行...');
        
        const relaxedConfig = {
            sampleRate: undefined, // ブラウザのデフォルトを使用
            channelCount: undefined,
            echoCancellation: undefined,
            noiseSuppression: undefined,
            autoGainControl: undefined
        };
        
        const relaxedManager = new PitchPro.AudioManager(relaxedConfig);
        
        try {
            const result = await relaxedManager.initialize();
            
            this.errorSystem.showWarning(
                '制限付きで初期化完了',
                'より制限の少ない設定でオーディオを初期化しました。',
                { duration: 5000 }
            );
            
            // 元のaudioManagerを置き換え
            this.audioManager.cleanup();
            this.audioManager = relaxedManager;
            
            return result;
        } catch (retryError) {
            console.error('制約を緩めても初期化に失敗:', retryError);
            throw retryError;
        }
    }
    
    handleAudioContextSpecificError(error) {
        if (error.message.includes('suspended')) {
            // AudioContext サスペンドエラー
            this.errorSystem.showWarning(
                'オーディオが一時停止中',
                'ユーザーインタラクション後にオーディオを再開します。',
                {
                    details: [
                        'ブラウザのオーディオ自動再生ポリシーにより一時停止されています',
                        '画面をクリックまたはタッチしてください'
                    ],
                    solution: '画面をクリックしてオーディオを再開してください。',
                    duration: 8000
                }
            );
            
            // ユーザーインタラクション待ち
            this.waitForUserInteractionToResume();
            throw error;
        }
        
        throw error;
    }
    
    waitForUserInteractionToResume() {
        const resumeAudio = async (e) => {
            try {
                if (this.audioManager.audioContext?.state === 'suspended') {
                    await this.audioManager.audioContext.resume();
                    this.errorSystem.showSuccess(
                        'オーディオ再開',
                        'オーディオシステムを再開しました。',
                        { duration: 3000 }
                    );
                }
                
                // イベントリスナーを削除
                ['click', 'touchstart', 'keydown'].forEach(eventType => {
                    document.removeEventListener(eventType, resumeAudio);
                });
                
            } catch (resumeError) {
                console.error('AudioContext 再開エラー:', resumeError);
            }
        };
        
        ['click', 'touchstart', 'keydown'].forEach(eventType => {
            document.addEventListener(eventType, resumeAudio, { once: true });
        });
    }
    
    setupMediaStreamErrorHandling() {
        // MediaStream の健全性を定期チェック
        this.mediaStreamHealthCheck = setInterval(() => {
            this.checkMediaStreamHealth();
        }, 5000);
    }
    
    checkMediaStreamHealth() {
        if (!this.audioManager.mediaStream) return;
        
        const tracks = this.audioManager.mediaStream.getTracks();
        const audioTrack = tracks.find(track => track.kind === 'audio');
        
        if (!audioTrack) {
            this.handleMediaStreamError(new Error('Audio track not found'));
            return;
        }
        
        if (audioTrack.readyState === 'ended') {
            this.handleMediaStreamError(new Error('Audio track ended'));
            return;
        }
        
        if (audioTrack.muted) {
            this.handleMediaStreamWarning('Audio track is muted');
        }
    }
    
    handleMediaStreamError(error) {
        console.error('MediaStream エラー:', error);
        
        if (this.errorRecoveryAttempts < this.maxRecoveryAttempts) {
            this.errorRecoveryAttempts++;
            
            this.errorSystem.showWarning(
                'オーディオストリーム復旧中',
                `オーディオストリームの問題を検出しました。復旧を試行中... (${this.errorRecoveryAttempts}/${this.maxRecoveryAttempts})`,
                { duration: 5000 }
            );
            
            this.attemptMediaStreamRecovery();
        } else {
            this.errorSystem.showError(
                'オーディオストリーム失敗',
                'オーディオストリームの復旧に複数回失敗しました。',
                {
                    details: [
                        'マイクが他のアプリケーションで使用されている可能性があります',
                        'デバイスの接続を確認してください',
                        'ブラウザの権限設定を確認してください'
                    ],
                    solution: 'ページを再読み込みして、再度お試しください。'
                }
            );
            
            this.stop();
        }
    }
    
    async attemptMediaStreamRecovery() {
        try {
            console.log('🔄 MediaStream 復旧を試行中...');
            
            // 現在のストリームを停止
            if (this.audioManager.mediaStream) {
                this.audioManager.mediaStream.getTracks().forEach(track => track.stop());
            }
            
            // AudioManager を再初期化
            await this.audioManager.reinitialize();
            
            // PitchDetector も再初期化
            if (this.isActive) {
                await this.pitchDetector.reinitialize();
                this.pitchDetector.startDetection();
            }
            
            this.errorSystem.showSuccess(
                '復旧完了',
                'オーディオストリームを正常に復旧しました。',
                { duration: 3000 }
            );
            
            this.errorRecoveryAttempts = 0;
            
        } catch (recoveryError) {
            console.error('復旧失敗:', recoveryError);
            this.handleMediaStreamError(new Error('Recovery failed'));
        }
    }
    
    handleMediaStreamWarning(message) {
        console.warn('MediaStream 警告:', message);
        
        if (message.includes('muted')) {
            this.errorSystem.showWarning(
                'マイクがミュート中',
                'マイクがミュートされています。デバイスの設定を確認してください。',
                {
                    solution: 'デバイスのマイクミュートを解除してください。',
                    duration: 5000
                }
            );
        }
    }
    
    setupHealthMonitoring() {
        // システム全体の健全性監視
        this.healthMonitorInterval = setInterval(() => {
            this.performHealthCheck();
        }, 10000);
    }
    
    performHealthCheck() {
        const healthIssues = [];
        
        // AudioManager の健全性チェック
        const audioStatus = this.audioManager.getStatus();
        
        if (!audioStatus.isInitialized) {
            healthIssues.push('AudioManager が未初期化です');
        }
        
        if (audioStatus.audioContextState !== 'running') {
            healthIssues.push(`AudioContext 状態: ${audioStatus.audioContextState}`);
        }
        
        if (!audioStatus.mediaStreamActive) {
            healthIssues.push('MediaStream が非アクティブです');
        }
        
        // PitchDetector の健全性チェック
        if (this.isActive) {
            const pitchStatus = this.pitchDetector.getState();
            
            if (pitchStatus.componentState !== 'detecting') {
                healthIssues.push(`PitchDetector 状態: ${pitchStatus.componentState}`);
            }
            
            if (!pitchStatus.hasRequiredComponents) {
                healthIssues.push('PitchDetector の必要コンポーネントが不足');
            }
        }
        
        // 問題があれば報告
        if (healthIssues.length > 0) {
            console.warn('健全性チェックで問題を検出:', healthIssues);
            
            // 重要な問題の場合は通知
            const criticalIssues = healthIssues.filter(issue => 
                issue.includes('未初期化') || issue.includes('非アクティブ')
            );
            
            if (criticalIssues.length > 0) {
                this.errorSystem.showWarning(
                    'システム状態警告',
                    'オーディオシステムで問題を検出しました。',
                    {
                        details: criticalIssues,
                        solution: '問題が続く場合は、アプリケーションを再起動してください。'
                    }
                );
            }
        }
    }
    
    handleGlobalError(error, context) {
        console.error(`グローバルエラー (${context}):`, error);
        
        // 重複エラー防止
        if (this.lastError && this.lastError.message === error.message) {
            return;
        }
        this.lastError = error;
        
        // エラーの分類と処理
        if (error.name === 'SecurityError') {
            this.errorSystem.showError(
                'セキュリティエラー',
                'セキュリティ制限によりアクセスできません。',
                {
                    details: ['HTTPS接続が必要な場合があります'],
                    solution: 'HTTPS環境で再度お試しください。'
                }
            );
        } else if (error.name === 'TypeError' && error.message.includes('AudioContext')) {
            this.errorSystem.showError(
                'ブラウザ非対応',
                'ご使用のブラウザはWeb Audio APIに対応していません。',
                {
                    solution: '最新のブラウザ（Chrome、Firefox、Safari、Edge）をご使用ください。'
                }
            );
        } else {
            // 一般的なエラー
            this.errorSystem.showError(
                '予期しないエラー',
                `アプリケーションでエラーが発生しました: ${error.message}`,
                {
                    details: [`エラータイプ: ${error.name}`, `コンテキスト: ${context}`],
                    solution: 'ページを再読み込みしてください。問題が続く場合はサポートにお問い合わせください。'
                }
            );
        }
    }
    
    // エラー状態からの復旧
    async handleError(error) {
        console.error('アプリケーションエラー:', error);
        
        // 基本エラーハンドリング
        super.handleError(error);
        
        // 自動復旧の試行
        if (this.shouldAttemptAutoRecovery(error)) {
            await this.attemptAutoRecovery(error);
        }
    }
    
    shouldAttemptAutoRecovery(error) {
        // 復旧可能なエラーかどうかを判定
        const recoverableErrors = [
            'AudioContext',
            'MediaStream',
            'NotReadableError',
            'TrackStartError'
        ];
        
        return recoverableErrors.some(keyword => 
            error.message.includes(keyword) || error.name.includes(keyword)
        ) && this.errorRecoveryAttempts < this.maxRecoveryAttempts;
    }
    
    async attemptAutoRecovery(error) {
        this.errorRecoveryAttempts++;
        
        console.log(`🔄 自動復旧を試行中... (${this.errorRecoveryAttempts}/${this.maxRecoveryAttempts})`);
        
        this.errorSystem.showInfo(
            '自動復旧中',
            'システムの復旧を試行しています...',
            { duration: 3000 }
        );
        
        try {
            // 段階的復旧処理
            await this.stop();
            await new Promise(resolve => setTimeout(resolve, 1000));
            await this.start();
            
            this.errorSystem.showSuccess(
                '復旧完了',
                'システムを正常に復旧しました。',
                { duration: 3000 }
            );
            
            this.errorRecoveryAttempts = 0;
            
        } catch (recoveryError) {
            console.error('自動復旧に失敗:', recoveryError);
            
            if (this.errorRecoveryAttempts >= this.maxRecoveryAttempts) {
                this.errorSystem.showError(
                    '復旧失敗',
                    '自動復旧に失敗しました。手動で再起動してください。',
                    { autoHide: false }
                );
            }
        }
    }
    
    // クリーンアップ
    destroy() {
        // エラーハンドリングのクリーンアップ
        if (this.mediaStreamHealthCheck) {
            clearInterval(this.mediaStreamHealthCheck);
        }
        
        if (this.healthMonitorInterval) {
            clearInterval(this.healthMonitorInterval);
        }
        
        this.errorSystem?.destroy();
        
        super.destroy?.();
    }
}
```

このエラーハンドリングシステムは：

1. **包括的エラー検出**: グローバルエラー、AudioContext、MediaStream の各レベルでエラーをキャッチ
2. **自動復旧機能**: 復旧可能なエラーに対して自動的に復旧を試行
3. **ユーザーフレンドリーな通知**: 技術的詳細を含めながらも分かりやすいエラーメッセージ
4. **健全性監視**: システム状態を定期的にチェックし、問題を早期発見
5. **段階的対応**: エラーの種類に応じて適切な対処法を提供

続けて、残りの実装例（パフォーマンス最適化、デバッグ機能など）も作成しますか？