import React from 'react';
import { Container, Title, Text, Card, Button, Stack, Group, Badge, Grid, Center } from '@mantine/core';
import { Crown, Trophy, Star, CheckCircle, Target, BookOpen, Share, RotateCcw, Home, TrendingUp } from 'lucide-react';

interface FinalResultPageProps {
  data: {
    mode: string;
    sessions: Array<{
      sessionId: number;
      score: number;
      grade: 'excellent' | 'good' | 'pass' | 'practice';
    }>;
    totalSessions: number;
    overallScore: number;
  };
  onRestart: () => void;
  onHome: () => void;
}

export function FinalResultPage({ data, onRestart, onHome }: FinalResultPageProps) {
  const calculateOverallGrade = () => {
    const excellentCount = data.sessions.filter(s => s.grade === 'excellent').length;
    const goodCount = data.sessions.filter(s => s.grade === 'good').length;
    const passCount = data.sessions.filter(s => s.grade === 'pass').length;
    
    const excellentRatio = excellentCount / data.totalSessions;
    const goodPlusRatio = (excellentCount + goodCount + passCount) / data.totalSessions;
    
    if (data.overallScore >= 95 && excellentRatio >= 0.8) return { grade: 'S', icon: Crown, color: 'yellow' };
    if (data.overallScore >= 85 && excellentRatio >= 0.6) return { grade: 'A', icon: Trophy, color: 'green' };
    if (data.overallScore >= 75 || excellentRatio >= 0.4) return { grade: 'B', icon: Star, color: 'blue' };
    if (data.overallScore >= 65 || excellentRatio >= 0.2) return { grade: 'C', icon: CheckCircle, color: 'orange' };
    if (data.overallScore >= 50) return { grade: 'D', icon: Target, color: 'yellow' };
    return { grade: 'E', icon: BookOpen, color: 'gray' };
  };

  const getModeTitle = () => {
    switch (data.mode) {
      case 'random': return 'ランダム基音モード';
      case 'continuous': return '連続チャレンジモード';
      case 'chromatic': return '12音階モード';
      default: return 'トレーニング';
    }
  };

  const overallGrade = calculateOverallGrade();
  const GradeIcon = overallGrade.icon;

  const excellentCount = data.sessions.filter(s => s.grade === 'excellent').length;
  const goodCount = data.sessions.filter(s => s.grade === 'good').length;
  const passCount = data.sessions.filter(s => s.grade === 'pass').length;
  const practiceCount = data.sessions.filter(s => s.grade === 'practice').length;

  const getGradeMessage = () => {
    switch (overallGrade.grade) {
      case 'S': return '完璧！プロレベルの精度です！';
      case 'A': return '素晴らしい！とても正確です';
      case 'B': return '良好！安定した音感です';
      case 'C': return '合格！基礎は身についています';
      case 'D': return 'もう少し！練習を続けましょう';
      case 'E': return '基礎から練習しましょう';
      default: return '練習を続けましょう';
    }
  };

  return (
    <Container size="lg" py={60}>
      <Stack gap="xl">
        <Center>
          <Stack align="center" gap="md">
            <div style={{ fontSize: '64px' }}>🎊</div>
            <Title order={1} c="white" ta="center">
              {getModeTitle()} 完了！
            </Title>
            <Badge size="xl" color={overallGrade.color} variant="light">
              {data.totalSessions}セッション完了
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
            {/* 総合ランク */}
            <Center>
              <Stack align="center" gap="lg">
                <div
                  style={{
                    width: '120px',
                    height: '120px',
                    borderRadius: '50%',
                    background: `linear-gradient(135deg, var(--mantine-color-${overallGrade.color}-4), var(--mantine-color-${overallGrade.color}-6))`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 10px 30px rgba(0,0,0,0.2)'
                  }}
                >
                  <GradeIcon size={48} color="white" />
                </div>
                <Stack align="center" gap="xs">
                  <Title order={1} c={`var(--mantine-color-${overallGrade.color}-7)`}>
                    {overallGrade.grade}級
                  </Title>
                  <Text size="xl" fw={600}>
                    {data.overallScore.toFixed(1)}点
                  </Text>
                  <Text c="dimmed" ta="center">
                    {getGradeMessage()}
                  </Text>
                </Stack>
              </Stack>
            </Center>

            {/* 統計情報 */}
            <Grid>
              <Grid.Col span={6}>
                <Card padding="md" radius="md" style={{ background: 'var(--mantine-color-blue-0)' }}>
                  <Stack align="center" gap="xs">
                    <TrendingUp size={24} color="var(--mantine-color-blue-6)" />
                    <Text size="sm" fw={500}>総セッション数</Text>
                    <Text size="xl" fw={700} c="blue">{data.totalSessions}</Text>
                  </Stack>
                </Card>
              </Grid.Col>
              <Grid.Col span={6}>
                <Card padding="md" radius="md" style={{ background: 'var(--mantine-color-green-0)' }}>
                  <Stack align="center" gap="xs">
                    <Trophy size={24} color="var(--mantine-color-green-6)" />
                    <Text size="sm" fw={500}>優秀セッション</Text>
                    <Text size="xl" fw={700} c="green">{excellentCount}</Text>
                  </Stack>
                </Card>
              </Grid.Col>
            </Grid>

            {/* セッション評価分布 */}
            <Card padding="md" radius="md" style={{ background: 'var(--mantine-color-gray-0)' }}>
              <Stack gap="md">
                <Text fw={600} ta="center">セッション評価分布</Text>
                <Grid>
                  <Grid.Col span={3}>
                    <Stack align="center" gap="xs">
                      <Trophy size={20} color="gold" />
                      <Text size="sm" fw={500}>優秀</Text>
                      <Text size="lg" fw={700} c="yellow">{excellentCount}</Text>
                      <Text size="xs" c="dimmed">
                        {((excellentCount / data.totalSessions) * 100).toFixed(0)}%
                      </Text>
                    </Stack>
                  </Grid.Col>
                  <Grid.Col span={3}>
                    <Stack align="center" gap="xs">
                      <Star size={20} color="var(--mantine-color-green-6)" />
                      <Text size="sm" fw={500}>良好</Text>
                      <Text size="lg" fw={700} c="green">{goodCount}</Text>
                      <Text size="xs" c="dimmed">
                        {((goodCount / data.totalSessions) * 100).toFixed(0)}%
                      </Text>
                    </Stack>
                  </Grid.Col>
                  <Grid.Col span={3}>
                    <Stack align="center" gap="xs">
                      <CheckCircle size={20} color="var(--mantine-color-blue-6)" />
                      <Text size="sm" fw={500}>合格</Text>
                      <Text size="lg" fw={700} c="blue">{passCount}</Text>
                      <Text size="xs" c="dimmed">
                        {((passCount / data.totalSessions) * 100).toFixed(0)}%
                      </Text>
                    </Stack>
                  </Grid.Col>
                  <Grid.Col span={3}>
                    <Stack align="center" gap="xs">
                      <Target size={20} color="var(--mantine-color-gray-6)" />
                      <Text size="sm" fw={500}>要練習</Text>
                      <Text size="lg" fw={700} c="gray">{practiceCount}</Text>
                      <Text size="xs" c="dimmed">
                        {((practiceCount / data.totalSessions) * 100).toFixed(0)}%
                      </Text>
                    </Stack>
                  </Grid.Col>
                </Grid>
              </Stack>
            </Card>

            {/* セッション履歴 */}
            <Stack gap="md">
              <Text fw={600}>セッション履歴</Text>
              <Grid>
                {data.sessions.map((session, index) => (
                  <Grid.Col key={index} span={2}>
                    <Card 
                      padding="xs" 
                      radius="md" 
                      style={{ 
                        background: session.grade === 'excellent' ? 'var(--mantine-color-yellow-0)' :
                                   session.grade === 'good' ? 'var(--mantine-color-green-0)' :
                                   session.grade === 'pass' ? 'var(--mantine-color-blue-0)' :
                                   'var(--mantine-color-gray-0)',
                        border: `1px solid ${
                          session.grade === 'excellent' ? 'var(--mantine-color-yellow-3)' :
                          session.grade === 'good' ? 'var(--mantine-color-green-3)' :
                          session.grade === 'pass' ? 'var(--mantine-color-blue-3)' :
                          'var(--mantine-color-gray-3)'
                        }`
                      }}
                    >
                      <Stack align="center" gap={4}>
                        <Text size="xs" fw={600}>S{session.sessionId}</Text>
                        <Text size="xs">{session.score.toFixed(0)}点</Text>
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
                variant="outline"
                leftSection={<Share size={20} />}
                color="green"
              >
                結果を共有
              </Button>
              <Button
                size="lg"
                leftSection={<RotateCcw size={20} />}
                onClick={onRestart}
                style={{
                  background: 'linear-gradient(135deg, var(--mantine-color-blue-5), var(--mantine-color-blue-7))',
                }}
              >
                もう一度挑戦
              </Button>
            </Group>
          </Stack>
        </Card>
      </Stack>
    </Container>
  );
}