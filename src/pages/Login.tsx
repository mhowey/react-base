import { Alert, Button, Card, Center, Divider, Stack, Text, TextInput, Title } from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconAlertCircle } from '@tabler/icons-react';
import { useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/auth/AuthProvider';
import { ProviderIcon } from '@/auth/ProviderIcon';
import { Logo } from '@/design-system';
import { errorMessage } from '@/lib/api';

const errors: Record<string, string> = {
  invalid_state: 'Your sign-in session expired. Please try again.',
  access_denied: 'Sign-in was cancelled.',
  provider_error: 'The sign-in provider returned an error.',
};

export default function Login() {
  const { user, providers, devLoginEnabled, loginWith, devLogin } = useAuth();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const returnTo = params.get('returnTo') ?? '/dashboard';
  const [devError, setDevError] = useState<string | null>(null);
  const form = useForm({
    initialValues: { email: 'admin@example.com', name: '' },
    validate: { email: (v) => (/^\S+@\S+\.\S+$/.test(v) ? null : 'Enter a valid email') },
  });

  if (user) return <Navigate to={returnTo} replace />;
  const error = params.get('error');

  return (
    <Center py={80} px="md">
      <Card w="100%" maw={420} p="xl" shadow="md">
        <Stack align="center" gap="xs" mb="lg">
          <Logo withText={false} size={40} />
          <Title order={3}>Sign in</Title>
          <Text c="dimmed" size="sm">
            Continue with your preferred account
          </Text>
        </Stack>

        {error && (
          <Alert color="danger" icon={<IconAlertCircle />} mb="md">
            {errors[error] ?? 'Sign-in failed.'}
          </Alert>
        )}

        <Stack gap="sm">
          {providers.map((p) => (
            <Button key={p.id} variant="default" size="md" leftSection={<ProviderIcon id={p.id} />} onClick={() => loginWith(p.id, returnTo)} fullWidth>
              Continue with {p.name}
            </Button>
          ))}
          {providers.length === 0 && (
            <Alert color="warning" variant="light">
              No OAuth providers are configured. Add <code>GOOGLE_*</code>, <code>FACEBOOK_*</code> or <code>GITHUB_*</code> credentials to <code>.env</code>.
            </Alert>
          )}
        </Stack>

        {devLoginEnabled && (
          <>
            <Divider label="Development login" labelPosition="center" my="lg" />
            <form
              onSubmit={form.onSubmit(async (v) => {
                setDevError(null);
                try {
                  await devLogin(v.email, v.name);
                  navigate(returnTo, { replace: true });
                } catch (e) {
                  setDevError(errorMessage(e));
                }
              })}
            >
              <Stack gap="sm">
                <TextInput label="Email" {...form.getInputProps('email')} />
                <TextInput label="Name (optional)" {...form.getInputProps('name')} />
                {devError && <Text c="red" size="sm">{devError}</Text>}
                <Button type="submit" variant="light">
                  Sign in without a provider
                </Button>
                <Text size="xs" c="dimmed">
                  Disabled automatically in production. The first account created becomes admin.
                </Text>
              </Stack>
            </form>
          </>
        )}
      </Card>
    </Center>
  );
}
