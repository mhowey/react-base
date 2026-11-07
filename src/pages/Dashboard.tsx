import { Button, Card, Group, SimpleGrid, Text, Title } from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import { IconDatabase, IconShieldCheck, IconTable, IconUser } from '@tabler/icons-react';
import { Link } from 'react-router-dom';
import type { TableDef } from '@shared/schema-types';
import { useAuth } from '@/auth/AuthProvider';
import { PageHeader, StatCard } from '@/design-system';
import { Page } from '@/layouts/AppLayout';
import { api } from '@/lib/api';

export default function Dashboard() {
  const { user, isAdmin } = useAuth();
  const tables = useQuery({ queryKey: ['data', 'tables'], queryFn: () => api.get<TableDef[]>('/api/data') });

  return (
    <Page>
      <PageHeader eyebrow="Dashboard" title={`Welcome${user?.name ? `, ${user.name}` : ''}`} description="This is your app's home once signed in — replace it with your product." />
      <SimpleGrid cols={{ base: 1, sm: 3 }} mb="xl">
        <StatCard label="Role" value={user?.role} icon={<IconShieldCheck size={18} />} />
        <StatCard label="Tables you can read" value={tables.data?.length ?? '—'} icon={<IconTable size={18} />} color="accent" />
        <StatCard label="Fields defined" value={tables.data?.reduce((n, t) => n + t.fields.length, 0) ?? '—'} icon={<IconDatabase size={18} />} color="success" />
      </SimpleGrid>
      <SimpleGrid cols={{ base: 1, md: 2 }}>
        {isAdmin && (
          <Card>
            <Title order={4} mb={6}>
              Model your data
            </Title>
            <Text c="dimmed" size="sm" mb="md">
              Create tables and fields in the Data Builder. Each one gets a REST API at <code>/api/data/&lt;table&gt;</code>.
            </Text>
            <Button component={Link} to="/admin/data" leftSection={<IconDatabase size={16} />}>
              Open Data Builder
            </Button>
          </Card>
        )}
        <Card>
          <Title order={4} mb={6}>
            Your account
          </Title>
          <Text c="dimmed" size="sm" mb="md">
            See your linked sign-in providers and account details.
          </Text>
          <Group>
            <Button variant="default" component={Link} to="/profile" leftSection={<IconUser size={16} />}>
              View profile
            </Button>
          </Group>
        </Card>
      </SimpleGrid>
    </Page>
  );
}
