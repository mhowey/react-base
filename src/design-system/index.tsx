import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import './global.css';

import { MantineProvider } from '@mantine/core';
import { ModalsProvider } from '@mantine/modals';
import { Notifications } from '@mantine/notifications';
import type { ReactNode } from 'react';
import { cssVariablesResolver, theme } from './theme';

export function DesignSystemProvider({ children }: { children: ReactNode }) {
  return (
    <MantineProvider theme={theme} cssVariablesResolver={cssVariablesResolver} defaultColorScheme="auto">
      <Notifications position="top-right" />
      <ModalsProvider>{children}</ModalsProvider>
    </MantineProvider>
  );
}

export * from './components';
export * as tokens from './tokens';
export { theme } from './theme';
