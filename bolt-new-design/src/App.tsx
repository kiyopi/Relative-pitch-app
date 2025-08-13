import React, { useState } from 'react';
import { Container, Title, Text, Card, Group, Button, Stack, Badge, Center } from '@mantine/core';
import { Music, Mic, Trophy, Target, BookOpen } from 'lucide-react';
import { HomePage } from './components/HomePage';
import { MicrophoneTestPage } from './components/MicrophoneTestPage';
import { TrainingPage } from './components/TrainingPage';
import { SessionResultPage } from './components/SessionResultPage';
import { FinalResultPage } from './components/FinalResultPage';

export type TrainingMode = 'random' | 'continuous' | 'chromatic';
export type AppPage = 'home' | 'mic-test' | 'training' | 'session-result' | 'final-result';

interface AppState {
  currentPage: AppPage;
  selectedMode: TrainingMode | null;
  micTestCompleted: boolean;
  sessionData: any;
  finalData: any;
}

function App() {
  const [appState, setAppState] = useState<AppState>({
    currentPage: 'home',
    selectedMode: null,
    micTestCompleted: localStorage.getItem('mic-test-completed') === 'true',
    sessionData: null,
    finalData: null,
  });

  const navigateTo = (page: AppPage, data?: any) => {
    setAppState(prev => ({
      ...prev,
      currentPage: page,
      ...(data && { sessionData: data.sessionData, finalData: data.finalData }),
    }));
  };

  const selectMode = (mode: TrainingMode) => {
    setAppState(prev => ({ ...prev, selectedMode: mode }));
    
    if (appState.micTestCompleted) {
      navigateTo('training');
    } else {
      navigateTo('mic-test');
    }
  };

  const onMicTestComplete = () => {
    localStorage.setItem('mic-test-completed', 'true');
    setAppState(prev => ({ ...prev, micTestCompleted: true }));
    navigateTo('training');
  };

  const renderCurrentPage = () => {
    switch (appState.currentPage) {
      case 'home':
        return <HomePage onSelectMode={selectMode} />;
      case 'mic-test':
        return (
          <MicrophoneTestPage 
            onComplete={onMicTestComplete}
            targetMode={appState.selectedMode}
          />
        );
      case 'training':
        return (
          <TrainingPage 
            mode={appState.selectedMode!}
            onSessionComplete={(data) => navigateTo('session-result', { sessionData: data })}
            onFinalComplete={(data) => navigateTo('final-result', { finalData: data })}
            onBack={() => navigateTo('home')}
          />
        );
      case 'session-result':
        return (
          <SessionResultPage 
            data={appState.sessionData}
            onNext={() => navigateTo('training')}
            onHome={() => navigateTo('home')}
          />
        );
      case 'final-result':
        return (
          <FinalResultPage 
            data={appState.finalData}
            onRestart={() => navigateTo('training')}
            onHome={() => navigateTo('home')}
          />
        );
      default:
        return <HomePage onSelectMode={selectMode} />;
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
      {renderCurrentPage()}
    </div>
  );
}

export default App;