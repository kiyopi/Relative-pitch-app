import React from 'react';
import { Container, Title, Text, Card, Button, Stack, Group, Badge, Grid, Progress, Center } from '@mantine/core';
import { Trophy, Star, ThumbsUp, AlertTriangle as TriangleAlert, ArrowRight, Home, RotateCcw } from 'lucide-react';

interface SessionResultPageProps {
  data: {
    sessionId: number;
    baseNote: string;
    results: Array<{
      note: string;
      targetFreq: number;
      detectedFreq: number;
      error: number;
      score: number;
      grade: 'excellent' | 'good' | 'pass' | 'practice';
    }>;
    averageError: number;
    score: number;
    grade: 'excellent' | 'good' | 'pass' | 'practice';
  };
  onNext: () => void;
  onHome: () => void;
}

export function SessionResultPage({ data, onNext, onHome }: SessionResultPageProps) {
  const getGradeIcon = (grade: string) => {
    switch (grade) {
      case 'excellent': return <Trophy size={24} color="gold" />;
      case 'good': return <Star size={24} color="var(--mantine-color-green-6)" />;
      case 'pass': return <ThumbsUp size={24} color="var(--mantine-color-blue-6)" />;
      case 'practice': return <TriangleAlert size={24} color="var(--mantine-color-gray-6)" />;
      default: return <ThumbsUp size={24} />;
    }
  };

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'excellent': return 'yellow';
      case 'good': return 'green';
      case 'pass': return 'blue';
      case 'practice': return 'gray';
      default: return 'blue';
    }
  };

  const getGradeText = (grade: string) => {
    switch (grade) {
      case 'excellent': return '優秀';
      case 'good': return '良好';
      case 'pass': return '合格';
      case 'practice': return '要練習';
      default: return '合格';
    }
  };

  const excellentCount = data.results.filter(r => r.grade === 'excellent').length;
  const goodCount = data.results.filter(r => r.grade === 'good').length;
  const passCount = data.results.filter(r => r.grade === 'pass').length;
  const practiceCount = data.results.filter(r => r.grade === 'practice').length;

  return (
    <Container size="lg" py={60}>
      <Stack gap="xl">
        <Center>
          <Stack align="center" gap="md">
            <div style={{ fontSize: '64px' }}>🎉</div>
            <Title order={1} c="white" ta="center">
              セッション {data.sessionId} 完了！
            </Title>
            <Badge size="xl" color={getGradeColor(data.grade)} variant="light">
              {getGradeText(data.grade)}
            </Badge>
          </Stack>
        </Center>

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
          <Stack gap="xl">
            {/* 総合スコア */}
            <Center>
              <Stack align="center" gap="md">
                {getGradeIcon(data.grade)}
                <Title order={2} c={`var(--mantine-color-${getGradeColor(data.grade)}-7)`}>
                  {data.score.toFixed(1)}点
                </Title>
                <Text c="dimmed" size="lg">
                  平均誤差: ±{data.averageError.toFixed(1)}セント
                </Text>
              </Stack>
            </Center>

            {/* 評価分布 */}
            <Card padding="md" radius="md" style={{ background: 'var(--mantine-color-gray-0)' }}>
              <Stack gap="md">
                <Text fw={600} ta="center">音階別評価</Text>
                <Grid>
                  <Grid.Col span={3}>
                    <Stack align="center" gap="xs">
                      <Trophy size={20} color="gold" />
                      <Text size="sm" fw={500}>優秀</Text>
                      <Text size="lg" fw={700} c="yellow">{excellentCount}</Text>
                    </Stack>
                  </Grid.Col>
                  <Grid.Col span={3}>
                    <Stack align="center" gap="xs">
                      <Star size={20} color="var(--mantine-color-green-6)" />
                      <Text size="sm" fw={500}>良好</Text>
                      <Text size="lg" fw={700} c="green">{goodCount}</Text>
                    </Stack>
                  </Grid.Col>
                  <Grid.Col span={3}>
                    <Stack align="center" gap="xs">
                      <ThumbsUp size={20} color="var(--mantine-color-blue-6)" />
                      <Text size="sm" fw={500}>合格</Text>
                      <Text size="lg" fw={700} c="blue">{passCount}</Text>
                    </Stack>
                  </Grid.Col>
                  <Grid.Col span={3}>
                    <Stack align="center" gap="xs">
                      <TriangleAlert size={20} color="var(--mantine-color-gray-6)" />
                      <Text size="sm" fw={500}>要練習</Text>
                      <Text size="lg" fw={700} c="gray">{practiceCount}</Text>
                    </Stack>
                  </Grid.Col>
                </Grid>
              </Stack>
            </Card>

            {/* 詳細結果 */}
            <Stack gap="md">
              <Text fw={600}>音階別詳細結果</Text>
              <Grid>
                {data.results.map((result, index) => (
                  <Grid.Col key={index} span={3}>
                    <Card padding="sm" radius="md" style={{ 
                      background: `var(--mantine-color-${getGradeColor(result.grade)}-0)`,
                      border: `1px solid var(--mantine-color-${getGradeColor(result.grade)}-3)`
                    }}>
                      <Stack align="center" gap="xs">
                        <Text fw={600} size="sm">{result.note}</Text>
                        <div style={{ fontSize: '16px' }}>
                          {getGradeIcon(result.grade)}
                        </div>
                        <Text size="xs" c="dimmed">
                          {result.error > 0 ? '+' : ''}{result.error}¢
                        </Text>
                        <Text size="xs" fw={500} c={getGradeColor(result.grade)}>
                          {result.score}点
                        </Text>
                      </Stack>
                    </Card>
                  </Grid.Col>
                ))}
              </Grid>
            </Stack>

            {/* アクションボタン */}
            <Group justify="center" gap="md">
              <Button
                size="lg"
                variant="outline"
                leftSection={<Home size={20} />}
                onClick={onHome}
              >
                ホームに戻る
              </Button>
              <Button
                size="lg"
                rightSection={<ArrowRight size={20} />}
                onClick={onNext}
                style={{
                  background: 'linear-gradient(135deg, var(--mantine-color-blue-5), var(--mantine-color-blue-7))',
                }}
              >
                次のセッション
              </Button>
            </Group>
          </Stack>
        </Card>
      </Stack>
    </Container>
  );
}