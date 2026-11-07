import { Avatar, Badge, Card, Group, Stack, Table, Text, Title } from '@mantine/core';
import { useAuth } from '@/auth/AuthProvider';
import { ProviderIcon } from '@/auth/ProviderIcon';
import { PageHeader } from '@/design-system';
import { Page } from '@/layouts/AppLayout';

export default function Profile() {
  const { user, identities } = useAuth();
  if (!user) return null;
  return (
    <Page size="md">
      <PageHeader title="Profile" />
      <Card mb="lg">
        <Group>
          <Avatar src={user.avatarUrl} name={user.name ?? user.email ?? '?'} color="initials" size={72} radius="xl" />
          <Stack gap={2}>
            <Title order={3}>{user.name ?? 'Unnamed user'}</Title>
            <Text c="dimmed">{user.email}</Text>
            <Group gap="xs" mt={4}>
              <Badge color={user.role === 'admin' ? 'brand' : 'gray'}>{user.role}</Badge>
              <Text size="xs" c="dimmed">
                Member since {new Date(user.createdAt).toLocaleDateString()}
              </Text>
            </Group>
          </Stack>
        </Group>
      </Card>
      <Card>
        <Title order={4} mb="md">
          Linked sign-in methods
        </Title>
        <Table>
          <Table.Tbody>
            {identities.map((i) => (
              <Table.Tr key={i.provider + i.createdAt}>
                <Table.Td>
                  <Group gap="xs">
                    <ProviderIcon id={i.provider} />
                    <Text tt="capitalize">{i.provider}</Text>
                  </Group>
                </Table.Td>
                <Table.Td c="dimmed">{i.email}</Table.Td>
                <Table.Td c="dimmed" ta="right">
                  linked {new Date(i.createdAt).toLocaleDateString()}
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Card>
    </Page>
  );
}
