import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import App from './App.tsx';
import './index.css';
import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';

const theme = {
  colors: {
    // 音階専用カラーパレット
    note: [
      '#fef2f2', // 0
      '#fecaca', // 1
      '#f87171', // 2
      '#ef4444', // 3 - ド (赤)
      '#dc2626', // 4
      '#b91c1c', // 5
      '#991b1b', // 6
      '#7f1d1d', // 7
      '#450a0a', // 8
      '#1c0a0a', // 9
    ],
  },
  primaryColor: 'blue',
  fontFamily: 'Inter, system-ui, Avenir, Helvetica, Arial, sans-serif',
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MantineProvider theme={theme}>
      <Notifications />
      <App />
    </MantineProvider>
  </StrictMode>
);