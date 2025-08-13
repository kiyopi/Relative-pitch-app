import React from 'react';
import { Container, Title, Text, Card, Group, Button, Stack, Badge, Center, Grid } from '@mantine/core';
import { Music, Shuffle, Zap, Crown, Sparkles } from 'lucide-react';
import type { TrainingMode } from '../App';

interface HomePageProps {
  onSelectMode: (mode: TrainingMode) => void;
}

export function HomePage({ onSelectMode }: HomePageProps) {
  const modes = [
    {
      id: 'random' as TrainingMode,
      title: 'ランダム基音モード',
      subtitle: '初級者向け',
      description: 'カラオケなどで音程を合わせて歌えるようになる基礎トレーニング',
      icon: <Shuffle size={32} />,
      color: 'blue',
      sessions: '8セッション',
      features: ['基本的な相対音感', '音程の安定化', 'セッション別評価'],
      badge: '初級',
      badgeColor: 'green'
    },
    {
      id: 'continuous' as TrainingMode,
      title: '連続チャレンジモード',
      subtitle: '中級者向け',
      description: '半音も含めた音を聞き分け、集中力を維持しながら相対音感を鍛える',
      icon: <Zap size={32} />,
      color: 'orange',
      sessions: '12セッション連続',
      features: ['クロマチック12音', '連続集中練習', '総合評価'],
      badge: '中級',
      badgeColor: 'yellow'
    },
    {
      id: 'chromatic' as TrainingMode,
      title: '12音階モード',
      subtitle: '上級者向け',
      description: 'すべての音に対して完璧な相対音感を習得するプロレベル練習',
      icon: <Crown size={32} />,
      color: 'grape',
      sessions: '12-24セッション',
      features: ['上昇・下降・両方向', 'プロレベル判定', 'S級認定'],
      badge: '上級',
      badgeColor: 'grape'
    }
  ];

  return (
    <Container size="lg" py={60}>
      <Center mb={60}>
        <Stack align="center" gap="md">
          <Group gap="sm">
            <Music size={40} color="#fff" />
            <Title order={1} c="white" size="h1">
              8va相対音感トレーニング
            </Title>
          </Group>
          <Text c="white" size="lg" ta="center" maw={600}>
            科学的根拠に基づいた効果的な相対音感トレーニングシステム
            <br />
            基準音に対する音程の関係を正確に認識する能力を向上させます
          </Text>
        </Stack>
      </Center>

      <Grid>
        {modes.map((mode) => (
          <Grid.Col key={mode.id} span={{ base: 12, md: 4 }}>
            <Card
              shadow="xl"
              padding="xl"
              radius="lg"
              style={{
                height: '100%',
                background: 'rgba(255, 255, 255, 0.95)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                transition: 'all 0.3s ease',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-8px)';
                e.currentTarget.style.boxShadow = '0 20px 40px rgba(0,0,0,0.2)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 10px 30px rgba(0,0,0,0.1)';
              }}
            >
              <Stack gap="md" h="100%">
                <Group justify="space-between" align="flex-start">
                  <div style={{ color: `var(--mantine-color-${mode.color}-6)` }}>
                    {mode.icon}
                  </div>
                  <Badge color={mode.badgeColor} variant="light">
                    {mode.badge}
                  </Badge>
                </Group>

                <Stack gap="xs">
                  <Title order={3} size="h4">
                    {mode.title}
                  </Title>
                  <Text c="dimmed" size="sm" fw={500}>
                    {mode.subtitle}
                  </Text>
                  <Text size="sm" c="dark.6">
                    {mode.description}
                  </Text>
                </Stack>

                <Stack gap="xs" style={{ flex: 1 }}>
                  <Group gap="xs">
                    <Sparkles size={16} color="var(--mantine-color-blue-6)" />
                    <Text size="sm" fw={500}>
                      {mode.sessions}
                    </Text>
                  </Group>
                  
                  <Stack gap={4}>
                    {mode.features.map((feature, index) => (
                      <Text key={index} size="xs" c="dimmed">
                        • {feature}
                      </Text>
                    ))}
                  </Stack>
                </Stack>

                <Button
                  fullWidth
                  color={mode.color}
                  size="md"
                  radius="md"
                  onClick={() => onSelectMode(mode.id)}
                  style={{
                    background: `linear-gradient(135deg, var(--mantine-color-${mode.color}-5), var(--mantine-color-${mode.color}-7))`,
                    border: 'none',
                    fontWeight: 600
                  }}
                >
                  始める
                </Button>
              </Stack>
            </Card>
          </Grid.Col>
        ))}
      </Grid>

      <Center mt={60}>
        <Card
          padding="lg"
          radius="md"
          style={{
            background: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
          }}
        >
          <Text c="white" size="sm" ta="center">
            💡 <strong>脳内ピアノ理論</strong>: 相対音感の向上は歌唱力だけでなく、
            <br />
            円滑な人間関係構築にも効果があることが知られています
          </Text>
        </Card>
      </Center>
    </Container>
  );
}