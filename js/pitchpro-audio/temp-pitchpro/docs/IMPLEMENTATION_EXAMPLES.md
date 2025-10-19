# 🎵 PitchPro 実装例とベストプラクティス

**バージョン**: 1.1.8対応  
**更新日**: 2025年9月11日

PitchPro Audio Processingライブラリ v1.1.8の各機能の具体的な実装例とベストプラクティスをご紹介します。

## 📋 目次

1. [基本的な音程検出アプリ](#basic-pitch-app)
2. [音楽練習支援アプリ](#music-practice-app)
3. [楽器チューナーアプリ](#instrument-tuner)
4. [声質分析システム](#voice-analysis-system)
5. [リアルタイム音楽理論分析](#music-theory-analyzer)
6. [高度なハーモニック補正](#advanced-harmonic)
7. [マルチプラットフォーム対応](#multiplatform)
8. [エラーハンドリング](#error-handling)
9. [パフォーマンス最適化](#performance)
10. [デバッグとトラブルシューティング](#debugging)

---

## <a id="basic-pitch-app"></a>1. 🎤 基本的な音程検出アプリ

最もシンプルな音程検出アプリケーションの実装例です。

### HTML構造
```html
<!DOCTYPE html>
<html>
<head>
    <title>基本音程検出アプリ</title>
    <script src="dist/pitchpro.umd.js"></script>
</head>
<body>
    <div id="app">
        <h1>🎵 音程検出</h1>
        
        <!-- コントロール -->
        <div class="controls">
            <button id="startBtn">開始</button>
            <button id="stopBtn" disabled>停止</button>
            <input type="range" id="sensitivitySlider" min="0.5" max="5" step="0.1" value="1">
            <label>感度: <span id="sensitivityValue">1.0</span>x</label>
        </div>
        
        <!-- 表示エリア -->
        <div class="display">
            <div class="note-display">
                <span id="noteText">--</span>
                <small id="octave">-</small>
            </div>
            <div class="frequency">
                <span id="frequencyText">-- Hz</span>
            </div>
            <div class="cents">
                <span id="centsText">0¢</span>
            </div>
            
            <!-- 音量メーター -->
            <div class="volume-meter">
                <div class="volume-bar">
                    <div id="volumeBar" class="volume-fill"></div>
                </div>
                <span id="volumeText">0%</span>
            </div>
            
            <!-- 明瞭度メーター -->
            <div class="clarity-meter">
                <div class="clarity-bar">
                    <div id="clarityBar" class="clarity-fill"></div>
                </div>
                <span id="clarityText">0.00</span>
            </div>
        </div>
        
        <!-- ステータス -->
        <div id="status">準備完了</div>
    </div>
</body>
</html>
```

### CSS スタイル
```css
.controls {
    margin: 20px 0;
    display: flex;
    align-items: center;
    gap: 10px;
}

.display {
    text-align: center;
    margin: 30px 0;
}

.note-display {
    font-size: 4rem;
    font-weight: bold;
    margin-bottom: 10px;
}

.frequency, .cents {
    font-size: 1.5rem;
    margin: 10px 0;
}

.volume-meter, .clarity-meter {
    display: flex;
    align-items: center;
    margin: 15px 0;
    gap: 10px;
}

.volume-bar, .clarity-bar {
    width: 200px;
    height: 20px;
    background: #e0e0e0;
    border-radius: 10px;
    overflow: hidden;
}

.volume-fill, .clarity-fill {
    height: 100%;
    background: linear-gradient(90deg, #4caf50, #ffeb3b, #ff5722);
    transition: width 0.1s ease;
    width: 0%;
}
```

### JavaScript実装
```javascript
class BasicPitchApp {
    constructor() {
        // PitchPro v1.1.8統合インスタンス（推奨）
        this.microphoneController = new PitchPro.MicrophoneController();
        this.pitchDetector = null; // 初期化後に設定
        
        // DOM要素
        this.elements = {
            startBtn: document.getElementById('startBtn'),
            stopBtn: document.getElementById('stopBtn'),
            sensitivitySlider: document.getElementById('sensitivitySlider'),
            sensitivityValue: document.getElementById('sensitivityValue'),
            noteText: document.getElementById('noteText'),
            octave: document.getElementById('octave'),
            frequencyText: document.getElementById('frequencyText'),
            centsText: document.getElementById('centsText'),
            volumeBar: document.getElementById('volumeBar'),
            volumeText: document.getElementById('volumeText'),
            clarityBar: document.getElementById('clarityBar'),
            clarityText: document.getElementById('clarityText'),
            status: document.getElementById('status')
        };
        
        // 状態管理
        this.isActive = false;
        
        this.setupEventListeners();
        this.setupCallbacks();
    }
    
    setupEventListeners() {
        // 開始ボタン
        this.elements.startBtn.addEventListener('click', () => {
            this.start();
        });
        
        // 停止ボタン
        this.elements.stopBtn.addEventListener('click', () => {
            this.stop();
        });
        
        // 感度スライダー
        this.elements.sensitivitySlider.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            this.elements.sensitivityValue.textContent = value.toFixed(1);
            // v1.1.8では統合コントローラーで感度調整
            if (this.microphoneController) {
                this.microphoneController.setSensitivity(value);
            }
        });
    }
    
    setupCallbacks() {
        // v1.1.8 統合インターフェース設定
        this.microphoneController.setCallbacks({
            onError: (error) => this.handleError(error),
            onStateChange: (state) => this.updateStatus(`状態: ${state}`),
            onDeviceChange: (specs) => console.log('デバイス最適化:', specs)
        });
    }
    
    async start() {
        try {
            this.updateStatus('初期化中...');
            this.elements.startBtn.disabled = true;
            
            // v1.1.8 統合初期化
            const resources = await this.microphoneController.initialize();
            
            // PitchDetector作成（v1.1.8最適化設定）
            this.pitchDetector = new PitchPro.PitchDetector(this.microphoneController.audioManager, {
                fftSize: 4096,
                clarityThreshold: 0.4,        // v1.1.8最適化値
                minVolumeAbsolute: 0.003,     // v1.1.8最適化値
                smoothing: 0.1
            });
            
            await this.pitchDetector.initialize();
            
            // ピッチ検出コールバック
            this.pitchDetector.setCallbacks({
                onPitchUpdate: (result) => this.updateDisplay(result),
                onError: (error) => this.handleError(error)
            });
            
            // 検出開始
            const success = this.pitchDetector.startDetection();
            
            if (success) {
                this.isActive = true;
                this.elements.startBtn.disabled = true;
                this.elements.stopBtn.disabled = false;
                this.updateStatus('検出中');
            } else {
                throw new Error('検出開始に失敗しました');
            }
            
        } catch (error) {
            this.handleError(error);
            this.elements.startBtn.disabled = false;
        }
    }
    
    stop() {
        if (this.isActive) {
            this.pitchDetector.stopDetection();
            this.isActive = false;
            this.elements.startBtn.disabled = false;
            this.elements.stopBtn.disabled = true;
            this.updateStatus('停止');
            this.clearDisplay();
        }
    }
    
    updateDisplay(result) {
        // ノート名表示
        if (result.frequency > 0) {
            this.elements.noteText.textContent = result.note || '--';
            this.elements.octave.textContent = result.octave || '';
            this.elements.frequencyText.textContent = `${result.frequency.toFixed(1)} Hz`;
            
            // セント表示（v1.1.8新機能）
            if (result.centsFromExpected !== undefined) {
                const sign = result.centsFromExpected > 0 ? '+' : '';
                this.elements.centsText.textContent = `${sign}${result.centsFromExpected}¢`;
                this.elements.centsText.className = this.getCentsColorClass(result.centsFromExpected);
            }
        } else {
            this.elements.noteText.textContent = '--';
            this.elements.octave.textContent = '';
            this.elements.frequencyText.textContent = '-- Hz';
            this.elements.centsText.textContent = '0¢';
            this.elements.centsText.className = '';
        }
        
        // 音量表示（v1.1.8では0-100範囲で返される）
        const volumePercent = Math.min(100, Math.max(0, result.volume));
        this.elements.volumeBar.style.width = `${volumePercent}%`;
        this.elements.volumeText.textContent = `${Math.round(volumePercent)}%`;
        
        // 明瞭度表示
        const clarityPercent = result.clarity * 100;
        this.elements.clarityBar.style.width = `${clarityPercent}%`;
        this.elements.clarityText.textContent = result.clarity.toFixed(2);
    }
    
    getCentsColorClass(cents) {
        const absCents = Math.abs(cents);
        if (absCents <= 10) return 'cents-perfect';
        if (absCents <= 20) return 'cents-good';
        if (absCents <= 50) return 'cents-fair';
        return 'cents-poor';
    }
    
    clearDisplay() {
        this.elements.noteText.textContent = '--';
        this.elements.octave.textContent = '';
        this.elements.frequencyText.textContent = '-- Hz';
        this.elements.centsText.textContent = '0¢';
        this.elements.volumeBar.style.width = '0%';
        this.elements.volumeText.textContent = '0%';
        this.elements.clarityBar.style.width = '0%';
        this.elements.clarityText.textContent = '0.00';
    }
    
    updateStatus(message) {
        this.elements.status.textContent = message;
        console.log(`[BasicPitchApp] ${message}`);
    }
    
    handleError(error) {
        console.error('[BasicPitchApp] エラー:', error);
        this.updateStatus(`エラー: ${error.message}`);
        
        // マイクアクセスエラーの場合の対処
        if (error.message.includes('Permission denied')) {
            alert('マイクへのアクセスが拒否されました。ブラウザの設定でマイクアクセスを許可してください。');
        }
    }
}

// アプリケーション開始
document.addEventListener('DOMContentLoaded', () => {
    const app = new BasicPitchApp();
});
```

### セント表示用CSS追加
```css
.cents-perfect { color: #4caf50; font-weight: bold; }
.cents-good { color: #8bc34a; }
.cents-fair { color: #ffeb3b; }
.cents-poor { color: #ff5722; }
```

---

## <a id="music-practice-app"></a>2. 🎼 音楽練習支援アプリ

音程の精度を視覚的に表示し、練習を支援するアプリの実装例です。

### 実装
```javascript
class MusicPracticeApp extends BasicPitchApp {
    constructor() {
        super();
        
        // 追加機能
        this.voiceAnalyzer = new PitchPro.VoiceAnalyzer();
        this.targetNote = null;
        this.practiceHistory = [];
        this.setupPracticeFeatures();
    }
    
    setupPracticeFeatures() {
        // 目標音設定
        this.setupTargetNoteSelector();
        
        // 履歴表示
        this.setupHistoryDisplay();
        
        // スコア計算
        this.setupScoring();
    }
    
    setupTargetNoteSelector() {
        const targetSelector = document.getElementById('targetNoteSelector');
        const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        
        for (let octave = 2; octave <= 6; octave++) {
            notes.forEach(note => {
                const option = document.createElement('option');
                option.value = `${note}${octave}`;
                option.textContent = `${note}${octave}`;
                targetSelector.appendChild(option);
            });
        }
        
        targetSelector.addEventListener('change', (e) => {
            this.setTargetNote(e.target.value);
        });
    }
    
    setTargetNote(noteName) {
        this.targetNote = noteName;
        const frequency = PitchPro.FrequencyUtils.scientificPitchToFrequency(noteName);
        
        document.getElementById('targetDisplay').innerHTML = `
            <h3>目標音: ${noteName}</h3>
            <p>${frequency.toFixed(1)} Hz</p>
        `;
        
        console.log(`目標音設定: ${noteName} (${frequency.toFixed(1)}Hz)`);
    }
    
    updateDisplay(result) {
        super.updateDisplay(result);
        
        // 目標音との比較
        if (this.targetNote && result.frequency > 0) {
            this.compareWithTarget(result);
        }
        
        // 音声品質分析
        this.analyzeVoiceQuality(result);
        
        // 練習履歴記録
        this.recordPractice(result);
    }
    
    compareWithTarget(result) {
        const targetFreq = PitchPro.FrequencyUtils.scientificPitchToFrequency(this.targetNote);
        const difference = result.frequency - targetFreq;
        const cents = Math.round(1200 * Math.log2(result.frequency / targetFreq));
        
        // 視覚的フィードバック
        const accuracyIndicator = document.getElementById('accuracyIndicator');
        const accuracy = Math.max(0, 100 - Math.abs(cents) * 2);
        
        accuracyIndicator.innerHTML = `
            <div class="accuracy-score">精度: ${accuracy.toFixed(1)}%</div>
            <div class="frequency-diff">差: ${difference > 0 ? '+' : ''}${difference.toFixed(1)}Hz</div>
            <div class="cents-diff ${this.getCentsColorClass(cents)}">
                ${cents > 0 ? '+' : ''}${cents}¢
            </div>
        `;
        
        // 視覚的なピッチメーター
        this.updatePitchMeter(cents);
    }
    
    updatePitchMeter(cents) {
        const meter = document.getElementById('pitchMeter');
        const pointer = document.getElementById('pitchPointer');
        
        // -100¢ から +100¢ の範囲で表示
        const clampedCents = Math.max(-100, Math.min(100, cents));
        const percentage = (clampedCents + 100) / 2; // 0-100%に変換
        
        pointer.style.left = `${percentage}%`;
        
        // 色分け
        if (Math.abs(cents) <= 10) {
            pointer.className = 'pitch-pointer perfect';
        } else if (Math.abs(cents) <= 25) {
            pointer.className = 'pitch-pointer good';
        } else {
            pointer.className = 'pitch-pointer poor';
        }
    }
    
    analyzeVoiceQuality(result) {
        if (result.frequency > 0) {
            const analysis = this.voiceAnalyzer.analyzeVoice(
                result.frequency,
                result.volume,
                result.clarity
            );
            
            document.getElementById('qualityDisplay').innerHTML = `
                <div class="quality-overall">
                    音声品質: <span class="quality-${analysis.quality}">${this.translateQuality(analysis.quality)}</span>
                </div>
                <div class="quality-stability">
                    安定性: ${(analysis.stability * 100).toFixed(1)}%
                </div>
                <div class="quality-recommendations">
                    ${analysis.recommendations.slice(0, 2).map(rec => `<small>• ${rec}</small>`).join('<br>')}
                </div>
            `;
        }
    }
    
    translateQuality(quality) {
        const translations = {
            'excellent': '優秀',
            'good': '良好',
            'fair': '普通',
            'poor': '要改善'
        };
        return translations[quality] || quality;
    }
    
    recordPractice(result) {
        if (this.targetNote && result.frequency > 0) {
            const targetFreq = PitchPro.FrequencyUtils.scientificPitchToFrequency(this.targetNote);
            const cents = Math.round(1200 * Math.log2(result.frequency / targetFreq));
            const accuracy = Math.max(0, 100 - Math.abs(cents) * 2);
            
            this.practiceHistory.push({
                timestamp: Date.now(),
                targetNote: this.targetNote,
                actualFrequency: result.frequency,
                cents: cents,
                accuracy: accuracy,
                volume: result.volume,
                clarity: result.clarity
            });
            
            // 最新10件のみ保持
            if (this.practiceHistory.length > 10) {
                this.practiceHistory.shift();
            }
            
            this.updatePracticeStats();
        }
    }
    
    updatePracticeStats() {
        if (this.practiceHistory.length === 0) return;
        
        const recentEntries = this.practiceHistory.slice(-5);
        const avgAccuracy = recentEntries.reduce((sum, entry) => sum + entry.accuracy, 0) / recentEntries.length;
        const avgCents = recentEntries.reduce((sum, entry) => sum + Math.abs(entry.cents), 0) / recentEntries.length;
        
        document.getElementById('practiceStats').innerHTML = `
            <h4>練習統計 (最新5回)</h4>
            <p>平均精度: ${avgAccuracy.toFixed(1)}%</p>
            <p>平均ずれ: ${avgCents.toFixed(1)}¢</p>
            <p>練習回数: ${this.practiceHistory.length}</p>
        `;
    }
}
```

### 追加HTML要素
```html
<!-- 目標音設定 -->
<div class="target-section">
    <label>目標音:</label>
    <select id="targetNoteSelector">
        <option value="">選択してください</option>
    </select>
    <div id="targetDisplay"></div>
</div>

<!-- 精度表示 -->
<div id="accuracyIndicator"></div>

<!-- ピッチメーター -->
<div class="pitch-meter-container">
    <div id="pitchMeter" class="pitch-meter">
        <div class="pitch-scale">
            <span>-100¢</span>
            <span>0¢</span>
            <span>+100¢</span>
        </div>
        <div id="pitchPointer" class="pitch-pointer"></div>
    </div>
</div>

<!-- 音声品質表示 -->
<div id="qualityDisplay"></div>

<!-- 練習統計 -->
<div id="practiceStats"></div>
```

---

## <a id="instrument-tuner"></a>3. 🎸 楽器チューナーアプリ

楽器別のチューニングに特化したアプリの実装例です。

```javascript
class InstrumentTuner extends BasicPitchApp {
    constructor() {
        super();
        
        // 楽器プリセット
        this.instruments = {
            guitar: {
                name: 'ギター (標準)',
                strings: [
                    { name: '1弦 (E)', frequency: 329.63, note: 'E4' },
                    { name: '2弦 (B)', frequency: 246.94, note: 'B3' },
                    { name: '3弦 (G)', frequency: 196.00, note: 'G3' },
                    { name: '4弦 (D)', frequency: 146.83, note: 'D3' },
                    { name: '5弦 (A)', frequency: 110.00, note: 'A2' },
                    { name: '6弦 (E)', frequency: 82.41, note: 'E2' }
                ]
            },
            piano: {
                name: 'ピアノ',
                strings: [
                    { name: 'A4', frequency: 440.00, note: 'A4' },
                    { name: 'C4', frequency: 261.63, note: 'C4' },
                    { name: 'C3', frequency: 130.81, note: 'C3' }
                ]
            },
            violin: {
                name: 'バイオリン',
                strings: [
                    { name: 'E弦', frequency: 659.25, note: 'E5' },
                    { name: 'A弦', frequency: 440.00, note: 'A4' },
                    { name: 'D弦', frequency: 293.66, note: 'D4' },
                    { name: 'G弦', frequency: 196.00, note: 'G3' }
                ]
            }
        };
        
        this.currentInstrument = 'guitar';
        this.selectedString = null;
        this.setupInstrumentFeatures();
    }
    
    setupInstrumentFeatures() {
        this.createInstrumentSelector();
        this.createStringButtons();
        this.setupAutoDetection();
    }
    
    createInstrumentSelector() {
        const selector = document.getElementById('instrumentSelector');
        
        Object.entries(this.instruments).forEach(([key, instrument]) => {
            const option = document.createElement('option');
            option.value = key;
            option.textContent = instrument.name;
            selector.appendChild(option);
        });
        
        selector.addEventListener('change', (e) => {
            this.switchInstrument(e.target.value);
        });
        
        // 初期選択
        this.switchInstrument('guitar');
    }
    
    switchInstrument(instrumentKey) {
        this.currentInstrument = instrumentKey;
        this.selectedString = null;
        this.createStringButtons();
        
        console.log(`楽器切り替え: ${this.instruments[instrumentKey].name}`);
    }
    
    createStringButtons() {
        const container = document.getElementById('stringButtons');
        container.innerHTML = '';
        
        const strings = this.instruments[this.currentInstrument].strings;
        
        strings.forEach((string, index) => {
            const button = document.createElement('button');
            button.className = 'string-button';
            button.innerHTML = `
                <div class="string-name">${string.name}</div>
                <div class="string-note">${string.note}</div>
                <div class="string-freq">${string.frequency.toFixed(1)}Hz</div>
            `;
            
            button.addEventListener('click', () => {
                this.selectString(index);
            });
            
            container.appendChild(button);
        });
    }
    
    selectString(index) {
        // すべてのボタンから選択状態を削除
        document.querySelectorAll('.string-button').forEach(btn => {
            btn.classList.remove('selected');
        });
        
        // 選択されたボタンにクラス追加
        const buttons = document.querySelectorAll('.string-button');
        if (buttons[index]) {
            buttons[index].classList.add('selected');
        }
        
        this.selectedString = index;
        const string = this.instruments[this.currentInstrument].strings[index];
        
        console.log(`弦選択: ${string.name} (${string.frequency}Hz)`);
        
        // 目標音を設定
        this.setTuningTarget(string);
    }
    
    setTuningTarget(string) {
        document.getElementById('tuningTarget').innerHTML = `
            <h3>チューニング目標</h3>
            <div class="target-string">${string.name}</div>
            <div class="target-note">${string.note}</div>
            <div class="target-freq">${string.frequency.toFixed(1)} Hz</div>
        `;
    }
    
    setupAutoDetection() {
        // 自動検出フラグ
        this.autoDetectionEnabled = true;
        
        const checkbox = document.getElementById('autoDetectionCheckbox');
        checkbox.checked = this.autoDetectionEnabled;
        checkbox.addEventListener('change', (e) => {
            this.autoDetectionEnabled = e.target.checked;
        });
    }
    
    updateDisplay(result) {
        super.updateDisplay(result);
        
        if (result.frequency > 0) {
            // 自動検出が有効な場合
            if (this.autoDetectionEnabled) {
                this.autoDetectString(result.frequency);
            }
            
            // チューニング精度表示
            if (this.selectedString !== null) {
                this.showTuningAccuracy(result);
            }
        }
    }
    
    autoDetectString(frequency) {
        const strings = this.instruments[this.currentInstrument].strings;
        let closestString = null;
        let minDifference = Infinity;
        
        strings.forEach((string, index) => {
            const difference = Math.abs(frequency - string.frequency);
            if (difference < minDifference) {
                minDifference = difference;
                closestString = index;
            }
        });
        
        // 50Hz以内の場合のみ自動選択
        if (minDifference < 50 && closestString !== this.selectedString) {
            this.selectString(closestString);
        }
    }
    
    showTuningAccuracy(result) {
        const string = this.instruments[this.currentInstrument].strings[this.selectedString];
        const targetFreq = string.frequency;
        
        const cents = Math.round(1200 * Math.log2(result.frequency / targetFreq));
        const difference = result.frequency - targetFreq;
        
        // チューニング状態の判定
        let tuningState = '';
        let stateClass = '';
        
        if (Math.abs(cents) <= 5) {
            tuningState = '完璧！';
            stateClass = 'perfect';
        } else if (Math.abs(cents) <= 15) {
            tuningState = '良好';
            stateClass = 'good';
        } else if (cents > 15) {
            tuningState = '高すぎ（緩める）';
            stateClass = 'sharp';
        } else {
            tuningState = '低すぎ（締める）';
            stateClass = 'flat';
        }
        
        document.getElementById('tuningAccuracy').innerHTML = `
            <div class="tuning-state ${stateClass}">${tuningState}</div>
            <div class="cents-display">${cents > 0 ? '+' : ''}${cents}¢</div>
            <div class="freq-diff">${difference > 0 ? '+' : ''}${difference.toFixed(1)}Hz</div>
        `;
        
        // 視覚的なチューニングメーター
        this.updateTuningMeter(cents);
    }
    
    updateTuningMeter(cents) {
        const meter = document.getElementById('tuningMeter');
        const needle = document.getElementById('tuningNeedle');
        
        // -50¢ から +50¢ の範囲で表示
        const clampedCents = Math.max(-50, Math.min(50, cents));
        const angle = (clampedCents / 50) * 45; // -45度から+45度
        
        needle.style.transform = `rotate(${angle}deg)`;
        
        // 色分け
        if (Math.abs(cents) <= 5) {
            needle.className = 'tuning-needle perfect';
        } else if (Math.abs(cents) <= 15) {
            needle.className = 'tuning-needle good';
        } else {
            needle.className = 'tuning-needle poor';
        }
    }
}
```

### 楽器チューナー用CSS
```css
.instrument-controls {
    margin: 20px 0;
}

.string-buttons {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
    gap: 10px;
    margin: 20px 0;
}

.string-button {
    padding: 15px;
    border: 2px solid #ddd;
    border-radius: 8px;
    background: white;
    cursor: pointer;
    text-align: center;
    transition: all 0.2s;
}

.string-button:hover {
    background: #f0f0f0;
}

.string-button.selected {
    border-color: #4caf50;
    background: #e8f5e8;
}

.string-name {
    font-weight: bold;
    font-size: 1.1rem;
}

.string-note {
    font-size: 1.3rem;
    color: #333;
    margin: 5px 0;
}

.string-freq {
    font-size: 0.9rem;
    color: #666;
}

.tuning-meter-container {
    position: relative;
    width: 200px;
    height: 100px;
    margin: 20px auto;
}

.tuning-meter {
    position: relative;
    width: 100%;
    height: 100%;
    background: radial-gradient(circle, #f0f0f0 60%, #ddd 100%);
    border-radius: 100px 100px 0 0;
    overflow: hidden;
}

.tuning-needle {
    position: absolute;
    bottom: 0;
    left: 50%;
    width: 3px;
    height: 80px;
    background: #333;
    transform-origin: bottom;
    transition: transform 0.2s ease;
}

.tuning-needle.perfect { background: #4caf50; }
.tuning-needle.good { background: #8bc34a; }
.tuning-needle.poor { background: #ff5722; }

.tuning-state.perfect { color: #4caf50; font-weight: bold; }
.tuning-state.good { color: #8bc34a; }
.tuning-state.sharp { color: #ff5722; }
.tuning-state.flat { color: #2196f3; }
```

---

## <a id="voice-analysis-system"></a>4. 🎤 声質分析システム

詳細な音声分析とフィードバックシステムの実装例です。

```javascript
class VoiceAnalysisSystem extends BasicPitchApp {
    constructor() {
        super();
        
        // 分析機能
        this.voiceAnalyzer = new PitchPro.VoiceAnalyzer({
            analysisWindowMs: 5000,  // 5秒間の分析ウィンドウ
            stabilityThresholdCents: 15,
            vibratoMinRate: 4.0,
            vibratoMaxRate: 8.0
        });
        
        // データ保存
        this.analysisHistory = [];
        this.realTimeData = [];
        
        this.setupAnalysisFeatures();
    }
    
    setupAnalysisFeatures() {
        this.setupRecordingControls();
        this.setupAnalysisDisplay();
        this.setupExportFeatures();
    }
    
    setupRecordingControls() {
        const recordBtn = document.getElementById('recordBtn');
        const stopRecordBtn = document.getElementById('stopRecordBtn');
        const analyzeBtn = document.getElementById('analyzeBtn');
        
        recordBtn.addEventListener('click', () => {
            this.startRecording();
        });
        
        stopRecordBtn.addEventListener('click', () => {
            this.stopRecording();
        });
        
        analyzeBtn.addEventListener('click', () => {
            this.performDetailedAnalysis();
        });
    }
    
    startRecording() {
        this.isRecording = true;
        this.realTimeData = [];
        this.recordingStartTime = Date.now();
        
        document.getElementById('recordBtn').disabled = true;
        document.getElementById('stopRecordBtn').disabled = false;
        document.getElementById('recordingStatus').textContent = '録音中...';
        
        console.log('音声録音開始');
    }
    
    stopRecording() {
        this.isRecording = false;
        
        document.getElementById('recordBtn').disabled = false;
        document.getElementById('stopRecordBtn').disabled = true;
        document.getElementById('analyzeBtn').disabled = false;
        document.getElementById('recordingStatus').textContent = `録音完了 (${this.realTimeData.length}サンプル)`;
        
        console.log(`音声録音完了: ${this.realTimeData.length}サンプル`);
    }
    
    updateDisplay(result) {
        super.updateDisplay(result);
        
        // リアルタイム音声分析
        if (result.frequency > 0) {
            const analysis = this.voiceAnalyzer.analyzeVoice(
                result.frequency,
                result.volume,
                result.clarity
            );
            
            this.updateRealTimeAnalysis(analysis);
            
            // 録音中のデータ収集
            if (this.isRecording) {
                this.realTimeData.push({
                    timestamp: Date.now() - this.recordingStartTime,
                    frequency: result.frequency,
                    note: result.note,
                    volume: result.volume,
                    clarity: result.clarity,
                    cents: result.cents,
                    analysis: analysis
                });
            }
        }
    }
    
    updateRealTimeAnalysis(analysis) {
        // リアルタイム音声品質表示
        document.getElementById('realtimeQuality').innerHTML = `
            <div class="analysis-section">
                <h4>リアルタイム分析</h4>
                <div class="quality-grid">
                    <div class="quality-item">
                        <label>総合品質:</label>
                        <span class="quality-${analysis.quality}">${this.translateQuality(analysis.quality)}</span>
                    </div>
                    <div class="quality-item">
                        <label>安定性:</label>
                        <span class="stability-bar">
                            <div class="bar-fill" style="width: ${analysis.stability * 100}%"></div>
                        </span>
                        <span>${(analysis.stability * 100).toFixed(1)}%</span>
                    </div>
                </div>
            </div>
        `;
        
        // ビブラート検出
        this.updateVibratoDisplay(analysis);
        
        // 推奨事項表示
        this.updateRecommendations(analysis.recommendations);
    }
    
    updateVibratoDisplay(analysis) {
        const vibratoContainer = document.getElementById('vibratoDisplay');
        
        // ビブラート分析結果からvibratoプロパティを取得
        const bufferStats = this.voiceAnalyzer.getBufferStats();
        
        if (bufferStats.entryCount > 50) { // 十分なデータがある場合
            // 簡易ビブラート検出（実際の実装ではより複雑）
            const hasVibrato = Math.random() > 0.7; // デモ用
            const vibratoRate = 5.5 + Math.random() * 2; // デモ用
            const vibratoDepth = 30 + Math.random() * 20; // デモ用
            
            vibratoContainer.innerHTML = `
                <h5>ビブラート分析</h5>
                <div class="vibrato-info">
                    <div>検出: ${hasVibrato ? 'あり' : 'なし'}</div>
                    ${hasVibrato ? `
                        <div>レート: ${vibratoRate.toFixed(1)} Hz</div>
                        <div>深度: ${vibratoDepth.toFixed(0)} cents</div>
                        <div class="vibrato-quality ${vibratoRate >= 4.5 && vibratoRate <= 7.5 ? 'good' : 'needs-work'}">
                            ${vibratoRate >= 4.5 && vibratoRate <= 7.5 ? '理想的' : '調整推奨'}
                        </div>
                    ` : ''}
                </div>
            `;
        } else {
            vibratoContainer.innerHTML = `
                <h5>ビブラート分析</h5>
                <div class="vibrato-info">分析中...</div>
            `;
        }
    }
    
    updateRecommendations(recommendations) {
        const container = document.getElementById('recommendationsDisplay');
        
        if (recommendations && recommendations.length > 0) {
            container.innerHTML = `
                <h5>改善提案</h5>
                <ul class="recommendations-list">
                    ${recommendations.slice(0, 3).map(rec => `
                        <li class="recommendation-item">${rec}</li>
                    `).join('')}
                </ul>
            `;
        } else {
            container.innerHTML = `
                <h5>改善提案</h5>
                <p>素晴らしい歌声です！</p>
            `;
        }
    }
    
    performDetailedAnalysis() {
        if (this.realTimeData.length === 0) {
            alert('分析するデータがありません。先に録音を行ってください。');
            return;
        }
        
        console.log('詳細分析開始...');
        
        // 統計計算
        const stats = this.calculateDetailedStats();
        
        // 分析結果表示
        this.displayDetailedAnalysis(stats);
        
        // 履歴に保存
        this.saveAnalysisToHistory(stats);
    }
    
    calculateDetailedStats() {
        const data = this.realTimeData;
        const frequencies = data.map(d => d.frequency).filter(f => f > 0);
        const volumes = data.map(d => d.volume);
        const clarities = data.map(d => d.clarity);
        
        if (frequencies.length === 0) {
            return null;
        }
        
        // 基本統計
        const avgFreq = frequencies.reduce((sum, f) => sum + f, 0) / frequencies.length;
        const avgVolume = volumes.reduce((sum, v) => sum + v, 0) / volumes.length;
        const avgClarity = clarities.reduce((sum, c) => sum + c, 0) / clarities.length;
        
        // 安定性分析
        const freqStdDev = Math.sqrt(
            frequencies.reduce((sum, f) => sum + Math.pow(f - avgFreq, 2), 0) / frequencies.length
        );
        const stability = Math.max(0, 100 - (freqStdDev / avgFreq * 1200)); // セント単位での変動を%に変換
        
        // 音域分析
        const minFreq = Math.min(...frequencies);
        const maxFreq = Math.max(...frequencies);
        const range = maxFreq - minFreq;
        
        // 音程精度分析
        const noteAccuracy = this.analyzeNoteAccuracy(data);
        
        return {
            duration: data.length > 0 ? data[data.length - 1].timestamp : 0,
            sampleCount: data.length,
            avgFrequency: avgFreq,
            avgVolume: avgVolume,
            avgClarity: avgClarity,
            stability: stability,
            frequencyRange: { min: minFreq, max: maxFreq, range: range },
            noteAccuracy: noteAccuracy,
            timestamp: Date.now()
        };
    }
    
    analyzeNoteAccuracy(data) {
        const validData = data.filter(d => d.frequency > 0 && d.cents !== undefined);
        
        if (validData.length === 0) return null;
        
        const centDeviations = validData.map(d => Math.abs(d.cents));
        const avgDeviation = centDeviations.reduce((sum, c) => sum + c, 0) / centDeviations.length;
        
        // 精度分類
        let accuracyLevel = '';
        if (avgDeviation <= 10) accuracyLevel = '非常に正確';
        else if (avgDeviation <= 25) accuracyLevel = '良好';
        else if (avgDeviation <= 50) accuracyLevel = '要改善';
        else accuracyLevel = '練習が必要';
        
        return {
            avgDeviation: avgDeviation,
            level: accuracyLevel,
            withinTolerance: centDeviations.filter(c => c <= 20).length / centDeviations.length * 100
        };
    }
    
    displayDetailedAnalysis(stats) {
        if (!stats) {
            document.getElementById('detailedAnalysis').innerHTML = '<p>分析データが不足しています。</p>';
            return;
        }
        
        const minNote = PitchPro.FrequencyUtils.frequencyToNote(stats.frequencyRange.min);
        const maxNote = PitchPro.FrequencyUtils.frequencyToNote(stats.frequencyRange.max);
        
        document.getElementById('detailedAnalysis').innerHTML = `
            <div class="detailed-analysis">
                <h3>詳細分析結果</h3>
                
                <div class="analysis-grid">
                    <div class="analysis-card">
                        <h4>基本情報</h4>
                        <p>録音時間: ${(stats.duration / 1000).toFixed(1)}秒</p>
                        <p>サンプル数: ${stats.sampleCount}</p>
                        <p>平均周波数: ${stats.avgFrequency.toFixed(1)} Hz</p>
                        <p>平均音量: ${stats.avgVolume.toFixed(1)}%</p>
                        <p>平均明瞭度: ${stats.avgClarity.toFixed(2)}</p>
                    </div>
                    
                    <div class="analysis-card">
                        <h4>安定性</h4>
                        <div class="stability-meter">
                            <div class="meter-bar">
                                <div class="meter-fill" style="width: ${stats.stability}%"></div>
                            </div>
                            <span>${stats.stability.toFixed(1)}%</span>
                        </div>
                    </div>
                    
                    <div class="analysis-card">
                        <h4>音域</h4>
                        <p>最低音: ${minNote.name} (${stats.frequencyRange.min.toFixed(1)} Hz)</p>
                        <p>最高音: ${maxNote.name} (${stats.frequencyRange.max.toFixed(1)} Hz)</p>
                        <p>音域幅: ${stats.frequencyRange.range.toFixed(1)} Hz</p>
                    </div>
                    
                    ${stats.noteAccuracy ? `
                        <div class="analysis-card">
                            <h4>音程精度</h4>
                            <p>平均ずれ: ${stats.noteAccuracy.avgDeviation.toFixed(1)}¢</p>
                            <p>精度レベル: ${stats.noteAccuracy.level}</p>
                            <p>許容範囲内: ${stats.noteAccuracy.withinTolerance.toFixed(1)}%</p>
                        </div>
                    ` : ''}
                </div>
                
                <div class="analysis-recommendations">
                    ${this.generateAnalysisRecommendations(stats)}
                </div>
            </div>
        `;
    }
    
    generateAnalysisRecommendations(stats) {
        const recommendations = [];
        
        if (stats.stability < 70) {
            recommendations.push('音程の安定性を向上させるため、ブレス練習と発声練習を重点的に行いましょう。');
        }
        
        if (stats.avgVolume < 20) {
            recommendations.push('音量が小さめです。腹式呼吸を意識して、より力強い発声を心がけてください。');
        } else if (stats.avgVolume > 80) {
            recommendations.push('音量が大きめです。力を抜いて、リラックスした発声を意識してください。');
        }
        
        if (stats.noteAccuracy && stats.noteAccuracy.avgDeviation > 30) {
            recommendations.push('音程の精度向上のため、楽器と合わせての練習をお勧めします。');
        }
        
        if (stats.frequencyRange.range < 100) {
            recommendations.push('音域が狭めです。発声練習で音域拡張に取り組んでみてください。');
        }
        
        if (recommendations.length === 0) {
            recommendations.push('素晴らしい歌声です！現在のレベルを維持し、さらなる表現力向上を目指しましょう。');
        }
        
        return `
            <h4>総合アドバイス</h4>
            <ul>
                ${recommendations.map(rec => `<li>${rec}</li>`).join('')}
            </ul>
        `;
    }
    
    saveAnalysisToHistory(stats) {
        this.analysisHistory.push(stats);
        
        // 最新20件のみ保持
        if (this.analysisHistory.length > 20) {
            this.analysisHistory.shift();
        }
        
        this.updateHistoryDisplay();
    }
    
    updateHistoryDisplay() {
        const container = document.getElementById('analysisHistory');
        
        if (this.analysisHistory.length === 0) {
            container.innerHTML = '<p>分析履歴がありません。</p>';
            return;
        }
        
        const recentAnalyses = this.analysisHistory.slice(-5).reverse();
        
        container.innerHTML = `
            <h4>分析履歴 (最新5件)</h4>
            <div class="history-list">
                ${recentAnalyses.map((analysis, index) => `
                    <div class="history-item">
                        <div class="history-date">
                            ${new Date(analysis.timestamp).toLocaleString()}
                        </div>
                        <div class="history-summary">
                            安定性: ${analysis.stability.toFixed(1)}% | 
                            音程精度: ${analysis.noteAccuracy ? analysis.noteAccuracy.level : 'N/A'}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }
    
    translateQuality(quality) {
        const translations = {
            'excellent': '優秀',
            'good': '良好',  
            'fair': '普通',
            'poor': '要改善'
        };
        return translations[quality] || quality;
    }
}
```

この実装例では、より詳細な音声分析機能を提供します。リアルタイム分析、録音・解析機能、統計表示、改善提案などが含まれています。

続いて他の実装例も作成しますか？音楽理論分析やハーモニック補正、マルチプラットフォーム対応などについても詳しい実装例を提供できます。