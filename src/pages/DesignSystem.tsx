import {
  Alert,
  Badge,
  Box,
  Button,
  Card,
  Code,
  Group,
  NumberInput,
  Paper,
  SegmentedControl,
  Select,
  SimpleGrid,
  Stack,
  Switch,
  Tabs,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconBell, IconChartBar, IconInfoCircle, IconPalette, IconUsers } from '@tabler/icons-react';
import { EmptyState, FeatureCard, PageHeader, StatCard, tokens } from '@/design-system';
import { Page } from '@/layouts/AppLayout';

function Swatches({ name, scale }: { name: string; scale: readonly string[] }) {
  return (
    <div>
      <Text fw={600} size="sm" mb={6}>
        {name}
      </Text>
      <Group gap={0} wrap="nowrap" style={{ borderRadius: 8, overflow: 'hidden', border: '1px solid var(--app-border)' }}>
        {scale.map((c, i) => (
          <Box key={c} h={44} style={{ flex: 1, background: c }} title={`${name}.${i} ${c}`} />
        ))}
      </Group>
    </div>
  );
}

export default function DesignSystem() {
  return (
    <Page>
      <PageHeader eyebrow="Reference" title="Design system" description="Tokens live in src/design-system/tokens.ts; component defaults in theme.ts." />
      <Tabs defaultValue="tokens" keepMounted={false}>
        <Tabs.List mb="lg">
          <Tabs.Tab value="tokens">Tokens</Tabs.Tab>
          <Tabs.Tab value="components">Components</Tabs.Tab>
          <Tabs.Tab value="patterns">Patterns</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="tokens">
          <Stack gap="xl">
            <Card>
              <Title order={4} mb="md">
                Colour scales
              </Title>
              <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
                {Object.entries(tokens.palette).map(([n, s]) => (
                  <Swatches key={n} name={n} scale={s} />
                ))}
              </SimpleGrid>
            </Card>
            <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
              <Card>
                <Title order={4} mb="md">
                  Typography
                </Title>
                {(['h1', 'h2', 'h3', 'h4'] as const).map((h, i) => (
                  <Title key={h} order={(i + 1) as 1 | 2 | 3 | 4} mb={4}>
                    Heading {h.toUpperCase()}
                  </Title>
                ))}
                <Text mt="sm">Body text — the quick brown fox jumps over the lazy dog.</Text>
                <Text size="sm" c="dimmed">
                  Muted small text
                </Text>
                <Code mt="sm">monospace code</Code>
              </Card>
              <Card>
                <Title order={4} mb="md">
                  Radius, shadow & semantic tokens
                </Title>
                <Group mb="lg">
                  {Object.entries(tokens.radius).map(([k, v]) => (
                    <Paper key={k} w={56} h={56} withBorder style={{ borderRadius: v, display: 'grid', placeItems: 'center' }}>
                      <Text size="xs">{k}</Text>
                    </Paper>
                  ))}
                </Group>
                <Group mb="lg">
                  {Object.keys(tokens.shadows).map((k) => (
                    <Paper key={k} w={56} h={56} shadow={k} style={{ display: 'grid', placeItems: 'center' }}>
                      <Text size="xs">{k}</Text>
                    </Paper>
                  ))}
                </Group>
                <Stack gap={6}>
                  {Object.keys(tokens.semantic.light).map((v) => (
                    <Group key={v} gap="sm">
                      <Box w={20} h={20} style={{ background: `var(${v})`, borderRadius: 4, border: '1px solid var(--app-border)' }} />
                      <Code>{v}</Code>
                    </Group>
                  ))}
                </Stack>
              </Card>
            </SimpleGrid>
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="components">
          <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
            <Card>
              <Title order={4} mb="md">
                Buttons & badges
              </Title>
              <Group mb="md">
                <Button>Primary</Button>
                <Button variant="light">Light</Button>
                <Button variant="outline">Outline</Button>
                <Button variant="default">Default</Button>
                <Button color="danger">Danger</Button>
              </Group>
              <Group>
                <Badge>Brand</Badge>
                <Badge color="accent">Accent</Badge>
                <Badge color="success">Success</Badge>
                <Badge color="warning">Warning</Badge>
                <Badge color="danger">Danger</Badge>
              </Group>
            </Card>
            <Card>
              <Title order={4} mb="md">
                Inputs
              </Title>
              <Stack>
                <TextInput label="Text input" placeholder="Type something" />
                <Select label="Select" data={['React', 'Vue', 'Svelte']} defaultValue="React" />
                <NumberInput label="Number" defaultValue={42} />
                <Group>
                  <Switch label="Switch" defaultChecked />
                  <SegmentedControl data={['Day', 'Week', 'Month']} />
                </Group>
              </Stack>
            </Card>
            <Card>
              <Title order={4} mb="md">
                Feedback
              </Title>
              <Stack>
                <Alert icon={<IconInfoCircle />} title="Heads up">
                  Alerts use the brand colour by default.
                </Alert>
                <Alert color="success" title="Saved" variant="light">
                  Your changes were saved.
                </Alert>
                <Button
                  variant="light"
                  leftSection={<IconBell size={16} />}
                  onClick={() => notifications.show({ title: 'Notification', message: 'Triggered from the design system page' })}
                >
                  Show notification
                </Button>
              </Stack>
            </Card>
            <Card>
              <Title order={4} mb="md">
                Empty state
              </Title>
              <EmptyState icon={<IconPalette />} title="Nothing here yet" description="Use EmptyState for blank lists and first-run screens." action={<Button size="xs">Create</Button>} />
            </Card>
          </SimpleGrid>
        </Tabs.Panel>

        <Tabs.Panel value="patterns">
          <Stack gap="lg">
            <SimpleGrid cols={{ base: 1, sm: 3 }}>
              <StatCard label="Users" value="1,204" icon={<IconUsers size={18} />} hint="+12% this month" />
              <StatCard label="Revenue" value="$8.4k" icon={<IconChartBar size={18} />} color="success" />
              <StatCard label="Alerts" value="3" icon={<IconBell size={18} />} color="warning" />
            </SimpleGrid>
            <SimpleGrid cols={{ base: 1, sm: 3 }}>
              <FeatureCard icon={<IconPalette />} title="FeatureCard">
                Icon, title and body for marketing grids.
              </FeatureCard>
            </SimpleGrid>
          </Stack>
        </Tabs.Panel>
      </Tabs>
    </Page>
  );
}
