import { Avatar, Badge, Card, Group, Select, Table, Text } from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import type { AppUser } from '@shared/schema-types';
import { useAuth } from '@/auth/AuthProvider';
import { PageHeader } from '@/design-system';
import { Page } from '@/layouts/AppLayout';
import { api } from '@/lib/api';
import { useSchemaMutation } from './hooks';

type UserRow = AppUser & { providers: string[] };

export default function Users() {
  const { user: me } = useAuth();
  const users = useQuery({ queryKey: ['users'], queryFn: () => api.get<UserRow[]>('/api/users') });
  const setRole = useSchemaMutation(({ id, role }: { id: number; role: string }) => api.patch(`/api/users/${id}`, { role }), 'Role updated');

  return (
    <Page>
      <PageHeader eyebrow="Admin" title="Users" description="Everyone who has signed in. Promote users to admin to give them access to the data builder." />
      <Card p={0}>
        <Table.ScrollContainer minWidth={640}>
          <Table>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>User</Table.Th>
                <Table.Th>Sign-in methods</Table.Th>
                <Table.Th>Last login</Table.Th>
                <Table.Th w={160}>Role</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {users.data?.map((u) => (
                <Table.Tr key={u.id}>
                  <Table.Td>
                    <Group gap="sm" wrap="nowrap">
                      <Avatar src={u.avatarUrl} name={u.name ?? u.email ?? '?'} color="initials" radius="xl" size={32} />
                      <div>
                        <Text size="sm" fw={600}>
                          {u.name}
                        </Text>
                        <Text size="xs" c="dimmed">
                          {u.email}
                        </Text>
                      </div>
                    </Group>
                  </Table.Td>
                  <Table.Td>
                    <Group gap={4}>
                      {u.providers.map((p) => (
                        <Badge key={p} color="gray">
                          {p}
                        </Badge>
                      ))}
                    </Group>
                  </Table.Td>
                  <Table.Td c="dimmed">{u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString() : '—'}</Table.Td>
                  <Table.Td>
                    <Select
                      size="xs"
                      data={['user', 'admin']}
                      value={u.role}
                      disabled={u.id === me?.id}
                      onChange={(role) => role && setRole.mutate({ id: u.id, role })}
                    />
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      </Card>
    </Page>
  );
}
