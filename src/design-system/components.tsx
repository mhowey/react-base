import {
  ActionIcon,
  Box,
  Card,
  Group,
  Stack,
  Text,
  ThemeIcon,
  Title,
  Tooltip,
  useComputedColorScheme,
  useMantineColorScheme,
  type MantineColor,
} from '@mantine/core';
import { IconMoon, IconSun } from '@tabler/icons-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

/** Shared, app-level building blocks composed from Mantine primitives. */

export function Logo({ size = 28, withText = true }: { size?: number; withText?: boolean }) {
  return (
    <Link to="/" style={{ textDecoration: 'none', color: 'inherit' }} aria-label="App Starter home">
      <Group gap={8} wrap="nowrap">
        <img src="/logo.svg" width={size} height={size} alt="" />
        {withText && (
          <Text fw={800} size="lg">
            App Starter
          </Text>
        )}
      </Group>
    </Link>
  );
}

export function PageHeader({ title, description, actions, eyebrow }: { title: ReactNode; description?: ReactNode; actions?: ReactNode; eyebrow?: ReactNode }) {
  return (
    <Group justify="space-between" align="flex-end" mb="xl" gap="md">
      <Stack gap={4}>
        {eyebrow && (
          <Text size="xs" fw={700} tt="uppercase" c="brand" lts={0.5}>
            {eyebrow}
          </Text>
        )}
        <Title order={2}>{title}</Title>
        {description && <Text c="dimmed">{description}</Text>}
      </Stack>
      {actions && <Group gap="sm">{actions}</Group>}
    </Group>
  );
}

export function EmptyState({ icon, title, description, action }: { icon?: ReactNode; title: string; description?: string; action?: ReactNode }) {
  return (
    <Stack align="center" gap="sm" py={48} px="md" ta="center">
      {icon && (
        <ThemeIcon size={56} radius="xl" variant="light">
          {icon}
        </ThemeIcon>
      )}
      <Title order={4}>{title}</Title>
      {description && (
        <Text c="dimmed" maw={420}>
          {description}
        </Text>
      )}
      {action}
    </Stack>
  );
}

export function StatCard({ label, value, icon, color = 'brand', hint }: { label: string; value: ReactNode; icon?: ReactNode; color?: MantineColor; hint?: string }) {
  return (
    <Card>
      <Group justify="space-between" align="flex-start">
        <Stack gap={2}>
          <Text size="xs" tt="uppercase" fw={700} c="dimmed">
            {label}
          </Text>
          <Text fw={800} fz={28}>
            {value}
          </Text>
          {hint && (
            <Text size="xs" c="dimmed">
              {hint}
            </Text>
          )}
        </Stack>
        {icon && (
          <ThemeIcon size="lg" radius="md" variant="light" color={color}>
            {icon}
          </ThemeIcon>
        )}
      </Group>
    </Card>
  );
}

export function FeatureCard({ icon, title, children, color = 'brand' }: { icon: ReactNode; title: string; children: ReactNode; color?: MantineColor }) {
  return (
    <Card h="100%">
      <ThemeIcon size={44} radius="md" variant="light" color={color} mb="md">
        {icon}
      </ThemeIcon>
      <Title order={4} mb={6}>
        {title}
      </Title>
      <Text c="dimmed" size="sm">
        {children}
      </Text>
    </Card>
  );
}

export function Section({ children, py = 64, ...rest }: { children: ReactNode; py?: number; id?: string }) {
  return (
    <Box component="section" py={py} {...rest}>
      {children}
    </Box>
  );
}

export function ColorSchemeToggle() {
  const { setColorScheme } = useMantineColorScheme();
  const computed = useComputedColorScheme('light', { getInitialValueInEffect: true });
  const next = computed === 'dark' ? 'light' : 'dark';
  return (
    <Tooltip label={`Switch to ${next} mode`}>
      <ActionIcon size="lg" variant="default" onClick={() => setColorScheme(next)} aria-label={`Switch to ${next} mode`}>
        {computed === 'dark' ? <IconSun size={18} /> : <IconMoon size={18} />}
      </ActionIcon>
    </Tooltip>
  );
}
