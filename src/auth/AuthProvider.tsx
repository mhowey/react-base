import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react';
import type { AppUser, AuthProviderInfo } from '@shared/schema-types';
import { api } from '@/lib/api';

interface Identity {
  provider: string;
  email: string | null;
  createdAt: string;
}

interface AuthContextValue {
  user: AppUser | null;
  identities: Identity[];
  isLoading: boolean;
  isAdmin: boolean;
  providers: AuthProviderInfo[];
  devLoginEnabled: boolean;
  /** Full-page redirect to the provider's OAuth flow. */
  loginWith: (providerId: string, returnTo?: string) => void;
  devLogin: (email: string, name?: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const me = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: () => api.get<{ user: AppUser | null; identities: Identity[] }>('/api/auth/me'),
    staleTime: 5 * 60_000,
  });
  const providers = useQuery({
    queryKey: ['auth', 'providers'],
    queryFn: () => api.get<{ providers: AuthProviderInfo[]; devLogin: boolean }>('/api/auth/providers'),
    staleTime: Infinity,
  });

  const loginWith = useCallback((providerId: string, returnTo = '/dashboard') => {
    window.location.href = `/api/auth/${providerId}?returnTo=${encodeURIComponent(returnTo)}`;
  }, []);

  const devLogin = useCallback(
    async (email: string, name?: string) => {
      await api.post('/api/auth/dev-login', { email, name: name || undefined });
      await qc.invalidateQueries({ queryKey: ['auth'] });
    },
    [qc],
  );

  const logout = useCallback(async () => {
    await api.post('/api/auth/logout');
    qc.clear();
    await qc.invalidateQueries({ queryKey: ['auth'] });
  }, [qc]);

  const value = useMemo<AuthContextValue>(() => {
    const user = me.data?.user ?? null;
    return {
      user,
      identities: me.data?.identities ?? [],
      isLoading: me.isLoading,
      isAdmin: user?.role === 'admin',
      providers: providers.data?.providers ?? [],
      devLoginEnabled: providers.data?.devLogin ?? false,
      loginWith,
      devLogin,
      logout,
    };
  }, [me.data, me.isLoading, providers.data, loginWith, devLogin, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
