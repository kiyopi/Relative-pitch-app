import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Container, Title, Text, Card, Button, Stack, Progress, Group, Badge, Center, Grid } from '@mantine/core';
import { Play, Pause, Home, Volume2, Music } from 'lucide-react';
import type { TrainingMode } from '../App';
import * as Tone from 'tone';

interface TrainingPageProps {
  mode: TrainingMode;
  onSessionComplete: (data: any) => void;
  onFinalComplete: (data: any) => void;
  onBack: () => void;
}

interface SessionData {
  sessionId: number;
  baseNote: string;
  results: NoteResult[];
  averageError: number;
  score: number;
  grade: 'excellent' | 'good' | 'pass' | 'practice';
}

interface NoteResult {
  note: string;
  targetFreq: number;
  detectedFreq: number;
  error: number;
  score: number;
  grade: 'excellent' | 'good' | 'pass' | 'practice';
}

const SCALE_NOTES = ['ド', 'レ', 'ミ', 'ファ', 'ソ', 'ラ', 'シ', 'ド'];
const SCALE_INTERVALS = [0, 2, 4, 5, 7, 9, 11, 12]; // 半音単位

export function TrainingPage({ mode, onSessionComplete, onFinalComplete, onBack }: TrainingPageProps) {
  const [currentSession, setCurrentSession] = useState(1);
  const [currentNoteIndex, setCurrentNoteIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [baseFreq, setBaseFreq] = useState(261.63); // C4
  const [detectedFreq, setDetectedFreq] = useState<number | null>(null);
  const [audioLevel, setAudioLevel] = useState(0);
  const [sessionResults, setSessionResults] = useState<SessionData[]>([]);
  const [currentNoteResults, setCurrentNoteResults] = useState<NoteResult[]>([]);
  const [phase, setPhase] = useState<'ready' | 'playing-base' | 'guiding' | 'recording' | 'completed'>('ready');
  const [guideProgress, setGuideProgress] = useState(0);

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const synthRef = useRef<Tone.Synth | null>(null);

  const getMaxSessions = () => {
    switch (mode) {
      case 'random': return 8;
      case 'continuous': return 12;
      case 'chromatic': return 12;
      default: return 8;
    }
  };

  const getModeTitle = () => {
    switch (mode) {
      case 'random': return 'ランダム基音モード';
      case 'continuous': return '連続チャレンジモード';
      case 'chromatic': return '12音階モード';
      default: return 'トレーニング';
    }
  };

  const initializeAudio = useCallback(async () => {
    try {
      // Web Audio API setup
      audioContextRef.current = new AudioContext();
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        }
      });
      
      streamRef.current = stream;
      const source = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 2048;
      source.connect(analyserRef.current);

      // Tone.js setup
      await Tone.start();
      synthRef.current = new Tone.Synth().toDestination();

      startAudioMonitoring();
    } catch (error) {
      console.error('Audio initialization failed:', error);
    }
  }, []);

  const startAudioMonitoring = useCallback(() => {
    if (!analyserRef.current) return;

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    const timeDataArray = new Float32Array(analyserRef.current.fftSize);

    const updateAudioData = () => {
      if (!analyserRef.current) return;

      // 音量レベル取得
      analyserRef.current.getByteFrequencyData(dataArray);
      const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
      setAudioLevel(Math.min(100, (average / 128) * 100));

      // 簡易ピッチ検出
      analyserRef.current.getFloatTimeDomainData(timeDataArray);
      const freq = detectPitch(timeDataArray, audioContextRef.current!.sampleRate);
      if (freq > 80 && freq < 1000) {
        setDetectedFreq(freq);
      }

      if (isRecording) {
        requestAnimationFrame(updateAudioData);
      }
    };

    updateAudioData();
  }, [isRecording]);

  const detectPitch = (buffer: Float32Array, sampleRate: number): number => {
    let maxCorrelation = 0;
    let bestOffset = -1;
    const minPeriod = Math.floor(sampleRate / 1000);
    const maxPeriod = Math.floor(sampleRate / 80);

    for (let offset = minPeriod; offset < maxPeriod; offset++) {
      let correlation = 0;
      for (let i = 0; i < buffer.length - offset; i++) {
        correlation += Math.abs(buffer[i] - buffer[i + offset]);
      }
      correlation = 1 - (correlation / (buffer.length - offset));
      
      if (correlation > maxCorrelation) {
        maxCorrelation = correlation;
        bestOffset = offset;
      }
    }

    if (maxCorrelation > 0.3 && bestOffset !== -1) {
      return sampleRate / bestOffset;
    }
    return 0;
  };

  const calculateNoteFrequency = (baseFreq: number, semitones: number): number => {
    return baseFreq * Math.pow(2, semitones / 12);
  };

  const calculateCentError = (detected: number, target: number): number => {
    return Math.round(1200 * Math.log2(detected / target));
  };

  const evaluateNote = (error: number): { score: number; grade: 'excellent' | 'good' | 'pass' | 'practice' } => {
    const absError = Math.abs(error);
    if (absError <= 15) return { score: 100, grade: 'excellent' };
    if (absError <= 25) return { score: 80, grade: 'good' };
    if (absError <= 40) return { score: 60, grade: 'pass' };
    return { score: 30, grade: 'practice' };
  };

  const playBaseNote = async () => {
    if (!synthRef.current) return;
    
    setPhase('playing-base');
    setIsPlaying(true);
    
    // ランダム基音選択（音域データがあれば使用）
    const voiceRangeData = localStorage.getItem('voice-range-data');
    let selectedBaseFreq = 261.63; // デフォルトC4
    
    if (voiceRangeData) {
      const range = JSON.parse(voiceRangeData);
      const recommendedNotes = range.recommendedNotes || ['C3', 'D3', 'E3', 'F3'];
      const randomNote = recommendedNotes[Math.floor(Math.random() * recommendedNotes.length)];
      selectedBaseFreq = noteToFrequency(randomNote);
    }
    
    setBaseFreq(selectedBaseFreq);
    
    // 基音を2秒再生
    synthRef.current.triggerAttackRelease(selectedBaseFreq, '2n');
    
    setTimeout(() => {
      setIsPlaying(false);
      startGuideSequence();
    }, 2000);
  };

  const noteToFrequency = (note: string): number => {
    const noteMap: { [key: string]: number } = {
      'C3': 130.81, 'D3': 146.83, 'E3': 164.81, 'F3': 174.61,
      'G3': 196.00, 'A3': 220.00, 'B3': 246.94, 'C4': 261.63
    };
    return noteMap[note] || 261.63;
  };

  const startGuideSequence = () => {
    setPhase('guiding');
    setCurrentNoteIndex(0);
    setGuideProgress(0);
    
    const totalDuration = 5300; // 5.3秒
    const noteInterval = totalDuration / 8;
    let currentIndex = 0;
    
    const guideInterval = setInterval(() => {
      if (currentIndex < 8) {
        setCurrentNoteIndex(currentIndex);
        setGuideProgress((currentIndex + 1) / 8 * 100);
        
        currentIndex++;
      } else {
        clearInterval(guideInterval);
        startRecording();
      }
    }, noteInterval);
  };

  const startRecording = () => {
    setPhase('recording');
    setIsRecording(true);
    setCurrentNoteIndex(0);
    setCurrentNoteResults([]);
    
    // 8音を順次録音
    recordNote(0);
  };

  const recordNote = (noteIndex: number) => {
    if (noteIndex >= 8) {
      completeSession();
      return;
    }
    
    setCurrentNoteIndex(noteIndex);
    const targetFreq = calculateNoteFrequency(baseFreq, SCALE_INTERVALS[noteIndex]);
    
    // 3秒間録音
    setTimeout(() => {
      if (detectedFreq && detectedFreq > 80) {
        const error = calculateCentError(detectedFreq, targetFreq);
        const evaluation = evaluateNote(error);
        
        const noteResult: NoteResult = {
          note: SCALE_NOTES[noteIndex],
          targetFreq,
          detectedFreq,
          error,
          score: evaluation.score,
          grade: evaluation.grade
        };
        
        setCurrentNoteResults(prev => [...prev, noteResult]);
      }
      
      recordNote(noteIndex + 1);
    }, 3000);
  };

  const completeSession = () => {
    setIsRecording(false);
    setPhase('completed');
    
    // セッション評価計算
    const averageScore = currentNoteResults.reduce((sum, note) => sum + note.score, 0) / 8;
    const averageError = currentNoteResults.reduce((sum, note) => sum + Math.abs(note.error), 0) / 8;
    
    let sessionGrade: 'excellent' | 'good' | 'pass' | 'practice';
    if (averageScore >= 90) sessionGrade = 'excellent';
    else if (averageScore >= 75) sessionGrade = 'good';
    else if (averageScore >= 60) sessionGrade = 'pass';
    else sessionGrade = 'practice';
    
    const sessionData: SessionData = {
      sessionId: currentSession,
      baseNote: frequencyToNote(baseFreq),
      results: currentNoteResults,
      averageError,
      score: averageScore,
      grade: sessionGrade
    };
    
    const newSessionResults = [...sessionResults, sessionData];
    setSessionResults(newSessionResults);
    
    // セッション完了処理
    if (mode === 'random') {
      onSessionComplete(sessionData);
    } else if (currentSession >= getMaxSessions()) {
      // 最終セッション完了
      onFinalComplete({
        mode,
        sessions: newSessionResults,
        totalSessions: getMaxSessions(),
        overallScore: newSessionResults.reduce((sum, s) => sum + s.score, 0) / newSessionResults.length
      });
    } else {
      // 次のセッションへ
      setCurrentSession(prev => prev + 1);
      setPhase('ready');
      setCurrentNoteIndex(0);
      setCurrentNoteResults([]);
    }
  };

  const frequencyToNote = (freq: number): string => {
    const A4 = 440;
    const semitones = Math.round(12 * Math.log2(freq / A4));
    const noteNames = ['A', 'A#', 'B', 'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#'];
    const octave = Math.floor((semitones + 9) / 12) + 4;
    const noteIndex = ((semitones % 12) + 12) % 12;
    return `${noteNames[noteIndex]}${octave}`;
  };

  useEffect(() => {
    initializeAudio();
    
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [initializeAudio]);

  return (
    <Container size="lg" py={40}>
      <Stack gap="xl">
        {/* ヘッダー */}
        <Group justify="space-between">
          <Group gap="md">
            <Button
              variant="subtle"
              leftSection={<Home size={20} />}
              onClick={onBack}
              c="white"
            >
              ホーム
            </Button>
            <Badge size="lg" variant="light" color="blue">
              セッション {currentSession}/{getMaxSessions()}
            </Badge>
          </Group>
          <Title order={2} c="white">
            {getModeTitle()}
          </Title>
        </Group>

        {/* メインカード */}
        <Card
          shadow="xl"
          padding="xl"
          radius="lg"
          style={{
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            minHeight: '500px'
          }}
        >
          <Stack gap="lg" h="100%">
            {/* 基音エリア */}
            {phase === 'ready' && (
              <Center style={{ flex: 1 }}>
                <Stack align="center" gap="xl">
                  <Music size={64} color="var(--mantine-color-blue-6)" />
                  <Title order={3} ta="center">
                    基音を聞いてトレーニングを開始
                  </Title>
                  <Text c="dimmed" ta="center" size="lg">
                    基音を「ド」として、ドレミファソラシドを歌ってください
                  </Text>
                  <Button
                    size="xl"
                    leftSection={<Play size={24} />}
                    onClick={playBaseNote}
                    disabled={isPlaying}
                    style={{
                      background: 'linear-gradient(135deg, var(--mantine-color-blue-5), var(--mantine-color-blue-7))',
                      fontSize: '18px',
                      padding: '16px 32px'
                    }}
                  >
                    {isPlaying ? '基音再生中...' : '🔊 基音スタート'}
                  </Button>
                </Stack>
              </Center>
            )}

            {/* 進行表示 */}
            {(phase === 'playing-base' || phase === 'guiding') && (
              <Stack gap="md">
                <Group justify="space-between">
                  <Text fw={600}>
                    {phase === 'playing-base' ? '基音再生中...' : 'ガイド進行中...'}
                  </Text>
                  <Text c="dimmed">
                    {phase === 'guiding' && `${Math.round(guideProgress)}%`}
                  </Text>
                </Group>
                
                {phase === 'guiding' && (
                  <>
                    <Progress value={guideProgress} color="blue" size="lg" radius="md" />
                    
                    {/* ドレミガイド */}
                    <Grid>
                      {SCALE_NOTES.map((note, index) => (
                        <Grid.Col key={index} span={1.5}>
                          <Center>
                            <div
                              style={{
                                width: '50px',
                                height: '50px',
                                borderRadius: '50%',
                                background: index === currentNoteIndex 
                                  ? 'linear-gradient(135deg, #ff6b6b, #feca57)'
                                  : index < currentNoteIndex 
                                    ? 'var(--mantine-color-green-5)'
                                    : 'var(--mantine-color-gray-3)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'white',
                                fontWeight: 600,
                                transform: index === currentNoteIndex ? 'scale(1.2)' : 'scale(1)',
                                transition: 'all 0.3s ease'
                              }}
                            >
                              {note}
                            </div>
                          </Center>
                        </Grid.Col>
                      ))}
                    </Grid>
                  </>
                )}
              </Stack>
            )}

            {/* 録音中 */}
            {phase === 'recording' && (
              <Stack gap="lg">
                <Group justify="space-between">
                  <Text fw={600} size="lg">
                    🎤 {SCALE_NOTES[currentNoteIndex]} を歌ってください
                  </Text>
                  <Badge color="red" variant="light">
                    録音中
                  </Badge>
                </Group>

                {/* 音量メーター */}
                <Stack gap="sm">
                  <Group justify="space-between">
                    <Group gap="xs">
                      <Volume2 size={16} />
                      <Text size="sm">音量レベル</Text>
                    </Group>
                    <Text size="sm" c="dimmed">{Math.round(audioLevel)}%</Text>
                  </Group>
                  <Progress value={audioLevel} color="green" size="md" radius="md" />
                </Stack>

                {/* 検出周波数 */}
                {detectedFreq && (
                  <Group justify="space-between">
                    <Text size="sm">検出周波数</Text>
                    <Text size="sm" fw={500}>{detectedFreq.toFixed(1)} Hz</Text>
                  </Group>
                )}

                {/* 進行状況 */}
                <Grid>
                  {SCALE_NOTES.map((note, index) => (
                    <Grid.Col key={index} span={1.5}>
                      <Center>
                        <div
                          style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '50%',
                            background: index === currentNoteIndex 
                              ? 'linear-gradient(135deg, #ff69b4, #ff1493)'
                              : index < currentNoteIndex 
                                ? 'linear-gradient(135deg, rgba(255, 105, 180, 0.6), rgba(255, 20, 147, 0.4))'
                                : 'var(--mantine-color-gray-3)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                            fontSize: '12px',
                            fontWeight: 600
                          }}
                        >
                          {note}
                        </div>
                      </Center>
                    </Grid.Col>
                  ))}
                </Grid>
              </Stack>
            )}
          </Stack>
        </Card>
      </Stack>
    </Container>
  );
}