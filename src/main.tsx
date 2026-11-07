import { QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { AuthProvider } from './auth/AuthProvider';
import { DesignSystemProvider } from './design-system';
import { queryClient } from './lib/api';

const root = document.getElementById('root')!;
root.replaceChildren(); // drop the server-rendered crawler fallback

createRoot(root).render(
  <StrictMode>
    <DesignSystemProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </QueryClientProvider>
    </DesignSystemProvider>
  </StrictMode>,
);
