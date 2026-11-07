import { Center, Loader } from '@mantine/core';
import { IconLock } from '@tabler/icons-react';
import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { EmptyState } from '@/design-system';
import { useAuth } from './AuthProvider';

/** Redirects anonymous visitors to /login and back again after sign-in. */
export function RequireAuth({ children, admin = false }: { children: ReactNode; admin?: boolean }) {
  const { user, isLoading, isAdmin } = useAuth();
  const location = useLocation();
  if (isLoading)
    return (
      <Center h={240}>
        <Loader />
      </Center>
    );
  if (!user) return <Navigate to={`/login?returnTo=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  if (admin && !isAdmin)
    return <EmptyState icon={<IconLock />} title="Admins only" description="You need the admin role to view this page." />;
  return <>{children}</>;
}
