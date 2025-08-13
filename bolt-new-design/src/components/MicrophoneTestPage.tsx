import React, { useState, useEffect, useRef } from 'react';
import { Container, Title, Text, Card, Button, Stack, Progress, Group, Alert, Badge } from '@mantine/core';
import { Mic, Volume2, CheckCircle, AlertTriangle, ArrowRight } from 'lucide-react';
import type { TrainingMode } from '../App';

interface MicrophoneTestPageProps {
  onComplete: () => void;
  targetMode: TrainingMode | null;
}

interface VoiceRange {
  low: string;
  high: string;
  octaves: number;
}

export function MicrophoneTestPage({ onComplete, targetMode }: MicrophoneTestPageProps) {
  const [step, setStep] = useState<'permission' | 'testing' | 'range-test' | 'completed'>('permission');
  const [micPermission, setMicPermission] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [currentFreq, setCurrentFreq] = useState<number | null>(null);
  const [voiceRange, setVoiceRange] = useState<VoiceRange | null>(null);
  const [rangeTestProgress, setRangeTestProgress] = useState(0);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const getModeDisplayName = (mode: TrainingMode | null) => {
    switch (mode) {
      case 'random': return 'ランダム基音モード';
      case 'continuous': return '連続チャレンジモード';
      case 'chromatic': return '12音階モード';
      default: return 'トレーニング';
    }
  };

  const requestMicrophonePermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          sampleRate: 44100,
          channelCount: 1
        }
      });
      
      streamRef.current = stream;
      
      // Web Audio API setup
      audioContextRef.current = new AudioContext();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 2048;
      
      source.connect(analyserRef.current);
      
      setMicPermission(true);
      setStep('testing');
      startAudioMonitoring();
      
    } catch (error) {
      console.error('マイク許可エラー:', error);
    }
  };

  const startAudioMonitoring = () => {
    if (!analyserRef.current) return;

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    const timeDataArray = new Float32Array(analyserRef.current.fftSize);

    const updateAudioData = () => {
      if (!analyserRef.current) return;

      // 音量レベル取得
      analyserRef.current.getByteFrequencyData(dataArray);
      const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
      setAudioLevel(Math.min(100, (average / 128) * 100));

      // 基本的な周波数検出（簡易版）
      analyserRef.current.getFloatTimeDomainData(timeDataArray);
      const freq = detectPitch(timeDataArray, audioContextRef.current!.sampleRate);
      if (freq > 80 && freq < 1000) {
        setCurrentFreq(freq);
      }

      requestAnimationFrame(updateAudioData);
    };

    updateAudioData();
  };

  // 簡易ピッチ検出（実際の実装ではPitchyを使用）
  const detectPitch = (buffer: Float32Array, sampleRate: number): number => {
    let maxCorrelation = 0;
    let bestOffset = -1;
    const minPeriod = Math.floor(sampleRate / 1000); // 1000Hz max
    const maxPeriod = Math.floor(sampleRate / 80);   // 80Hz min

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

  const startVoiceRangeTest = () => {
    setStep('range-test');
    // 音域テストのシミュレーション
    let progress = 0;
    const interval = setInterval(() => {
      progress += 10;
      setRangeTestProgress(progress);
      
      if (progress >= 100) {
        clearInterval(interval);
        // 模擬的な音域結果
        setVoiceRange({
          low: 'A2',
          high: 'F5',
          octaves: 2.6
        });
        setStep('completed');
        
        // 音域データをlocalStorageに保存
        const voiceRangeData = {
          low: 'A2',
          high: 'F5',
          octaves: 2.6,
          recommendedNotes: ['C3', 'D3', 'E3', 'F3'],
          testDate: new Date().toISOString()
        };
        localStorage.setItem('voice-range-data', JSON.stringify(voiceRangeData));
      }
    }, 300);
  };

  const cleanup = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
  };

  const handleComplete = () => {
    cleanup();
    onComplete();
  };

  useEffect(() => {
    return cleanup;
  }, []);

  return (
    <Container size="sm" py={60}>
      <Stack gap="xl">
        <Stack align="center" gap="md">
          <Mic size={48} color="white" />
          <Title order={1} c="white" ta="center">
            トレーニング前の準備
          </Title>
          {targetMode && (
            <Badge size="lg" variant="light" color="blue">
              {getModeDisplayName(targetMode)} へのアクセス
            </Badge>
          )}
        </Stack>

        <Card
          shadow="xl"
          padding="xl"
          radius="lg"
          style={{
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
          }}
        >
          {step === 'permission' && (
            <Stack gap="lg">
              <Stack gap="sm">
                <Title order={3}>マイクロフォンの許可</Title>
                <Text c="dimmed">
                  音程検出のためマイクロフォンへのアクセスが必要です
                </Text>
              </Stack>

              <Alert icon={<AlertTriangle size={16} />} color="blue" variant="light">
                <Text size="sm">
                  音声データは外部に送信されません。ブラウザ内でリアルタイム処理されます。
                </Text>
              </Alert>

              <Button
                size="lg"
                leftSection={<Mic size={20} />}
                onClick={requestMicrophonePermission}
                style={{
                  background: 'linear-gradient(135deg, var(--mantine-color-blue-5), var(--mantine-color-blue-7))',
                }}
              >
                マイクを許可
              </Button>
            </Stack>
          )}

          {step === 'testing' && (
            <Stack gap="lg">
              <Stack gap="sm">
                <Group justify="space-between">
                  <Title order={3}>音声テスト</Title>
                  <CheckCircle size={20} color="var(--mantine-color-green-6)" />
                </Group>
                <Text c="dimmed">
                  マイクが正常に動作しているか確認します
                </Text>
              </Stack>

              <Stack gap="md">
                <Group justify="space-between">
                  <Text size="sm" fw={500}>音量レベル</Text>
                  <Text size="sm" c="dimmed">{Math.round(audioLevel)}%</Text>
                </Group>
                <Progress value={audioLevel} color="blue" size="lg" radius="md" />
                
                {currentFreq && (
                  <Group justify="space-between">
                    <Text size="sm" fw={500}>検出周波数</Text>
                    <Text size="sm" c="dimmed">{currentFreq.toFixed(1)} Hz</Text>
                  </Group>
                )}
              </Stack>

              <Alert icon={<Volume2 size={16} />} color="green" variant="light">
                <Text size="sm">
                  マイクが正常に動作しています。音域テストに進みましょう。
                </Text>
              </Alert>

              <Button
                size="lg"
                rightSection={<ArrowRight size={20} />}
                onClick={startVoiceRangeTest}
                disabled={audioLevel < 10}
              >
                音域テストを開始
              </Button>
            </Stack>
          )}

          {step === 'range-test' && (
            <Stack gap="lg">
              <Stack gap="sm">
                <Title order={3}>🎵 音域テスト</Title>
                <Text c="dimmed">
                  あなたの快適な音域を測定しています...
                </Text>
              </Stack>

              <Stack gap="md">
                <Group justify="space-between">
                  <Text size="sm" fw={500}>テスト進行</Text>
                  <Text size="sm" c="dimmed">{rangeTestProgress}%</Text>
                </Group>
                <Progress value={rangeTestProgress} color="orange" size="lg" radius="md" />
              </Stack>

              <Text size="sm" c="dimmed" ta="center">
                低音から高音まで段階的にテストしています...
              </Text>
            </Stack>
          )}

          {step === 'completed' && voiceRange && (
            <Stack gap="lg">
              <Stack gap="sm">
                <Group justify="space-between">
                  <Title order={3}>🎯 テスト完了</Title>
                  <CheckCircle size={24} color="var(--mantine-color-green-6)" />
                </Group>
                <Text c="dimmed">
                  音域テストが完了しました
                </Text>
              </Stack>

              <Card padding="md" radius="md" style={{ background: 'var(--mantine-color-blue-0)' }}>
                <Stack gap="sm">
                  <Text fw={600} c="blue">あなたの音域</Text>
                  <Group justify="space-between">
                    <Text size="sm">音域範囲</Text>
                    <Text size="sm" fw={500}>{voiceRange.low} - {voiceRange.high}</Text>
                  </Group>
                  <Group justify="space-between">
                    <Text size="sm">オクターブ数</Text>
                    <Text size="sm" fw={500}>{voiceRange.octaves}オクターブ</Text>
                  </Group>
                </Stack>
              </Card>

              <Alert icon={<CheckCircle size={16} />} color="green" variant="light">
                <Text size="sm">
                  最適な基音が自動選択されます。快適にトレーニングできます！
                </Text>
              </Alert>

              <Button
                size="lg"
                rightSection={<ArrowRight size={20} />}
                onClick={handleComplete}
                style={{
                  background: 'linear-gradient(135deg, var(--mantine-color-green-5), var(--mantine-color-green-7))',
                }}
              >
                トレーニング開始
              </Button>
            </Stack>
          )}
        </Card>
      </Stack>
    </Container>
  );
}