import {
  ActionIcon,
  Anchor,
  Badge,
  Breadcrumbs,
  Button,
  Card,
  Center,
  Code,
  Group,
  Loader,
  Pagination,
  Select,
  Stack,
  Table,
  Tabs,
  Text,
  Textarea,
  TextInput,
  Tooltip,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { useDebouncedValue, useDisclosure } from '@mantine/hooks';
import { modals } from '@mantine/modals';
import {
  IconArrowDown,
  IconArrowUp,
  IconEdit,
  IconPlus,
  IconSearch,
  IconSortAscending,
  IconSortDescending,
  IconTrash,
} from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { FIELD_TYPES, type DataRow, type FieldDef, type TableDef } from '@shared/schema-types';
import { EmptyState, PageHeader } from '@/design-system';
import { Page } from '@/layouts/AppLayout';
import { api } from '@/lib/api';
import { FieldModal } from './FieldModal';
import { RecordModal } from './RecordModal';
import { readAccessOptions, writeAccessOptions } from './Tables';
import { useRows, useSchemaMutation, useTable } from './hooks';

function FieldsTab({ table }: { table: TableDef }) {
  const [editing, setEditing] = useState<FieldDef | null>(null);
  const [opened, { open, close }] = useDisclosure();
  const remove = useSchemaMutation((name: string) => api.delete(`/api/schema/tables/${table.name}/fields/${name}`), 'Field removed');
  const reorder = useSchemaMutation((names: string[]) => api.put(`/api/schema/tables/${table.name}/field-order`, { names }));

  const move = (i: number, dir: -1 | 1) => {
    const names = table.fields.map((f) => f.name);
    [names[i], names[i + dir]] = [names[i + dir], names[i]];
    reorder.mutate(names);
  };

  return (
    <Card p={0}>
      <Group justify="space-between" p="md">
        <Text c="dimmed" size="sm">
          Every table also has <Code>id</Code>, <Code>created_at</Code>, <Code>updated_at</Code> and <Code>created_by</Code>.
        </Text>
        <Button
          leftSection={<IconPlus size={16} />}
          onClick={() => {
            setEditing(null);
            open();
          }}
        >
          Add field
        </Button>
      </Group>
      {table.fields.length === 0 ? (
        <EmptyState title="No fields yet" description="Add fields to define what each record contains." />
      ) : (
        <Table.ScrollContainer minWidth={640}>
          <Table>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Field</Table.Th>
                <Table.Th>Type</Table.Th>
                <Table.Th>Constraints</Table.Th>
                <Table.Th />
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {table.fields.map((f, i) => (
                <Table.Tr key={f.name}>
                  <Table.Td>
                    <Text fw={600}>{f.label}</Text>
                    <Code>{f.name}</Code>
                  </Table.Td>
                  <Table.Td>
                    <Badge>{FIELD_TYPES[f.type].label}</Badge>
                    {f.type === 'relation' && (
                      <Text size="xs" c="dimmed" mt={4}>
                        → {f.options.relationTable}
                      </Text>
                    )}
                    {f.type === 'select' && (
                      <Text size="xs" c="dimmed" mt={4}>
                        {f.options.choices?.join(', ')}
                      </Text>
                    )}
                  </Table.Td>
                  <Table.Td>
                    <Group gap={4}>
                      {f.required && <Badge color="danger">required</Badge>}
                      {f.unique && <Badge color="warning">unique</Badge>}
                      {f.defaultValue != null && <Badge color="gray">default: {JSON.stringify(f.defaultValue)}</Badge>}
                      {table.displayField === f.name && <Badge color="accent">display</Badge>}
                    </Group>
                  </Table.Td>
                  <Table.Td>
                    <Group gap={2} justify="flex-end" wrap="nowrap">
                      <ActionIcon aria-label="Move up" disabled={i === 0} onClick={() => move(i, -1)}>
                        <IconArrowUp size={16} />
                      </ActionIcon>
                      <ActionIcon aria-label="Move down" disabled={i === table.fields.length - 1} onClick={() => move(i, 1)}>
                        <IconArrowDown size={16} />
                      </ActionIcon>
                      <ActionIcon
                        aria-label="Edit field"
                        onClick={() => {
                          setEditing(f);
                          open();
                        }}
                      >
                        <IconEdit size={16} />
                      </ActionIcon>
                      <ActionIcon
                        aria-label="Delete field"
                        color="red"
                        onClick={() =>
                          modals.openConfirmModal({
                            title: `Delete field “${f.label}”?`,
                            children: <Text size="sm">The column and all of its data will be permanently removed.</Text>,
                            labels: { confirm: 'Delete', cancel: 'Cancel' },
                            confirmProps: { color: 'red' },
                            onConfirm: () => remove.mutate(f.name),
                          })
                        }
                      >
                        <IconTrash size={16} />
                      </ActionIcon>
                    </Group>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      )}
      <FieldModal table={table} field={editing} opened={opened} onClose={close} />
    </Card>
  );
}

function formatCell(f: FieldDef | undefined, v: unknown): string {
  if (v == null || v === '') return '—';
  if (f?.type === 'boolean') return v ? 'Yes' : 'No';
  if (f?.type === 'json') return JSON.stringify(v);
  const s = String(v);
  return s.length > 60 ? `${s.slice(0, 57)}…` : s;
}

function DataTab({ table }: { table: TableDef }) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debounced] = useDebouncedValue(search, 300);
  const [sort, setSort] = useState<{ by: string; order: 'asc' | 'desc' }>({ by: 'id', order: 'desc' });
  const [record, setRecord] = useState<DataRow | null>(null);
  const [opened, { open, close }] = useDisclosure();
  const pageSize = 20;
  const rows = useRows(table.name, { page, pageSize, search: debounced, sort: sort.by, order: sort.order });
  const remove = useSchemaMutation((id: number) => api.delete(`/api/data/${table.name}/${id}`), 'Record deleted');
  useEffect(() => setPage(1), [debounced]);

  const cols = table.fields.slice(0, 6);
  const header = (name: string, label: string) => (
    <Table.Th key={name} style={{ cursor: 'pointer', whiteSpace: 'nowrap' }} onClick={() => setSort((s) => ({ by: name, order: s.by === name && s.order === 'asc' ? 'desc' : 'asc' }))}>
      <Group gap={4} wrap="nowrap">
        {label}
        {sort.by === name && (sort.order === 'asc' ? <IconSortAscending size={14} /> : <IconSortDescending size={14} />)}
      </Group>
    </Table.Th>
  );

  if (table.fields.length === 0) return <EmptyState title="Add fields first" description="This table has no fields yet." />;

  return (
    <Card p={0}>
      <Group justify="space-between" p="md">
        <TextInput leftSection={<IconSearch size={16} />} placeholder="Search text fields…" value={search} onChange={(e) => setSearch(e.currentTarget.value)} w={280} />
        <Button
          leftSection={<IconPlus size={16} />}
          onClick={() => {
            setRecord(null);
            open();
          }}
        >
          New record
        </Button>
      </Group>
      <Table.ScrollContainer minWidth={720}>
        <Table>
          <Table.Thead>
            <Table.Tr>
              {header('id', 'ID')}
              {cols.map((f) => header(f.name, f.label))}
              {header('updated_at', 'Updated')}
              <Table.Th />
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {rows.data?.rows.map((r) => (
              <Table.Tr key={r.id}>
                <Table.Td c="dimmed">{r.id}</Table.Td>
                {cols.map((f) => (
                  <Table.Td key={f.name}>{formatCell(f, r[f.name])}</Table.Td>
                ))}
                <Table.Td c="dimmed" style={{ whiteSpace: 'nowrap' }}>
                  {new Date(r.updated_at).toLocaleString()}
                </Table.Td>
                <Table.Td>
                  <Group gap={2} justify="flex-end" wrap="nowrap">
                    <ActionIcon
                      aria-label="Edit record"
                      onClick={() => {
                        setRecord(r);
                        open();
                      }}
                    >
                      <IconEdit size={16} />
                    </ActionIcon>
                    <ActionIcon
                      aria-label="Delete record"
                      color="red"
                      onClick={() =>
                        modals.openConfirmModal({
                          title: `Delete record #${r.id}?`,
                          labels: { confirm: 'Delete', cancel: 'Cancel' },
                          confirmProps: { color: 'red' },
                          onConfirm: () => remove.mutate(r.id),
                        })
                      }
                    >
                      <IconTrash size={16} />
                    </ActionIcon>
                  </Group>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>
      {rows.data?.total === 0 && <EmptyState title={debounced ? 'No matches' : 'No records yet'} />}
      <Group justify="space-between" p="md">
        <Text size="sm" c="dimmed">
          {rows.data?.total ?? 0} records
        </Text>
        <Pagination total={Math.max(1, Math.ceil((rows.data?.total ?? 0) / pageSize))} value={page} onChange={setPage} size="sm" />
      </Group>
      <RecordModal table={table} record={record} opened={opened} onClose={close} />
    </Card>
  );
}

function SettingsTab({ table }: { table: TableDef }) {
  const navigate = useNavigate();
  const form = useForm({
    initialValues: {
      label: table.label,
      description: table.description ?? '',
      readAccess: table.readAccess as string,
      writeAccess: table.writeAccess as string,
      displayField: table.displayField ?? 'id',
    },
  });
  const save = useSchemaMutation((v: typeof form.values) => api.patch(`/api/schema/tables/${table.name}`, v), 'Settings saved');
  const drop = useSchemaMutation(() => api.delete(`/api/schema/tables/${table.name}`), 'Table deleted');

  return (
    <Stack>
      <Card>
        <form onSubmit={form.onSubmit((v) => save.mutate(v))}>
          <Stack>
            <TextInput label="Label" {...form.getInputProps('label')} />
            <Textarea label="Description" {...form.getInputProps('description')} />
            <Select label="Who can read" data={readAccessOptions} {...form.getInputProps('readAccess')} />
            <Select label="Who can write" data={writeAccessOptions} {...form.getInputProps('writeAccess')} />
            <Select
              label="Display field"
              description="Used as the label when other tables reference this one"
              data={[{ value: 'id', label: 'id' }, ...table.fields.map((f) => ({ value: f.name, label: f.label }))]}
              {...form.getInputProps('displayField')}
            />
            <Group justify="flex-end">
              <Button type="submit" loading={save.isPending}>
                Save settings
              </Button>
            </Group>
          </Stack>
        </form>
      </Card>
      <Card style={{ borderColor: 'var(--mantine-color-danger-4)' }}>
        <Group justify="space-between">
          <div>
            <Text fw={700}>Delete table</Text>
            <Text size="sm" c="dimmed">
              Permanently drops <Code>{table.name}</Code> and all of its records.
            </Text>
          </div>
          <Button
            color="red"
            variant="light"
            onClick={() =>
              modals.openConfirmModal({
                title: `Delete table “${table.label}”?`,
                children: <Text size="sm">This cannot be undone.</Text>,
                labels: { confirm: 'Delete table', cancel: 'Cancel' },
                confirmProps: { color: 'red' },
                onConfirm: async () => {
                  await drop.mutateAsync(undefined);
                  navigate('/admin/data');
                },
              })
            }
          >
            Delete
          </Button>
        </Group>
      </Card>
    </Stack>
  );
}

function ApiTab({ table }: { table: TableDef }) {
  const base = `/api/data/${table.name}`;
  const endpoints = [
    ['GET', base, 'List — ?page, pageSize, sort, order=asc|desc, search, filter[field]=value'],
    ['POST', base, 'Create'],
    ['GET', `${base}/:id`, 'Read one'],
    ['PATCH', `${base}/:id`, 'Partial update'],
    ['DELETE', `${base}/:id`, 'Delete'],
    ['GET', `${base}/schema`, 'Field metadata (for generic UIs)'],
  ];
  const example = Object.fromEntries(table.fields.map((f) => [f.name, f.defaultValue ?? `<${f.type}>`]));
  return (
    <Card>
      <Table mb="lg">
        <Table.Tbody>
          {endpoints.map(([m, p, d]) => (
            <Table.Tr key={m + p}>
              <Table.Td w={90}>
                <Badge color={m === 'GET' ? 'accent' : m === 'DELETE' ? 'danger' : 'success'}>{m}</Badge>
              </Table.Td>
              <Table.Td>
                <Code>{p}</Code>
              </Table.Td>
              <Table.Td c="dimmed">{d}</Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
      <Text fw={600} mb={6}>
        Example body
      </Text>
      <Code block>{JSON.stringify(example, null, 2)}</Code>
    </Card>
  );
}

export default function TableDetail() {
  const { table: name = '' } = useParams();
  const table = useTable(name);
  if (table.isLoading)
    return (
      <Center h={300}>
        <Loader />
      </Center>
    );
  if (!table.data) return <EmptyState title="Table not found" action={<Anchor component={Link} to="/admin/data">Back to tables</Anchor>} />;
  const t = table.data;
  return (
    <Page>
      <Breadcrumbs mb="md">
        <Anchor component={Link} to="/admin/data" size="sm">
          Data builder
        </Anchor>
        <Text size="sm">{t.label}</Text>
      </Breadcrumbs>
      <PageHeader
        title={t.label}
        description={t.description || undefined}
        actions={
          <Tooltip label="Table name used in SQL and the API">
            <Code fz="sm">{t.name}</Code>
          </Tooltip>
        }
      />
      <Tabs defaultValue="fields" keepMounted={false}>
        <Tabs.List mb="lg">
          <Tabs.Tab value="fields">Fields ({t.fields.length})</Tabs.Tab>
          <Tabs.Tab value="data">Data</Tabs.Tab>
          <Tabs.Tab value="settings">Settings</Tabs.Tab>
          <Tabs.Tab value="api">API</Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value="fields">
          <FieldsTab table={t} />
        </Tabs.Panel>
        <Tabs.Panel value="data">
          <DataTab table={t} />
        </Tabs.Panel>
        <Tabs.Panel value="settings">
          <SettingsTab key={t.updatedAt} table={t} />
        </Tabs.Panel>
        <Tabs.Panel value="api">
          <ApiTab table={t} />
        </Tabs.Panel>
      </Tabs>
    </Page>
  );
}
