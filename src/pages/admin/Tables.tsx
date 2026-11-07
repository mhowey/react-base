import { Badge, Button, Card, Code, FileButton, Group, Modal, Select, SimpleGrid, Stack, Text, Textarea, TextInput } from '@mantine/core';
import { useForm } from '@mantine/form';
import { useDisclosure } from '@mantine/hooks';
import { modals } from '@mantine/modals';
import { notifications } from '@mantine/notifications';
import { IconCode, IconDatabase, IconDownload, IconPlus, IconUpload } from '@tabler/icons-react';
import { Link, useNavigate } from 'react-router-dom';
import { IDENTIFIER_RE, type TableDef } from '@shared/schema-types';
import { EmptyState, PageHeader } from '@/design-system';
import { Page } from '@/layouts/AppLayout';
import { api, errorMessage } from '@/lib/api';
import { useSchemaMutation, useTables } from './hooks';

export const readAccessOptions = [
  { value: 'public', label: 'Public — anyone, incl. anonymous' },
  { value: 'authenticated', label: 'Signed-in users' },
  { value: 'admin', label: 'Admins only' },
];
export const writeAccessOptions = [
  { value: 'authenticated', label: 'Any signed-in user' },
  { value: 'owner', label: 'Owner — users edit only their own rows' },
  { value: 'admin', label: 'Admins only' },
];

const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').replace(/^(\d)/, 't_$1');

function NewTableModal({ opened, onClose }: { opened: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const form = useForm({
    initialValues: { label: '', name: '', description: '', readAccess: 'authenticated', writeAccess: 'admin' },
    validate: { name: (v) => (IDENTIFIER_RE.test(v) ? null : 'lowercase letters, digits, underscores; start with a letter') },
  });
  const create = useSchemaMutation((v: typeof form.values) => api.post<TableDef>('/api/schema/tables', v), 'Table created');

  return (
    <Modal opened={opened} onClose={onClose} title="New table">
      <form
        onSubmit={form.onSubmit(async (v) => {
          const t = (await create.mutateAsync(v)) as TableDef;
          form.reset();
          onClose();
          navigate(`/admin/data/${t.name}`);
        })}
      >
        <Stack>
          <TextInput
            label="Label"
            placeholder="Blog posts"
            data-autofocus
            {...form.getInputProps('label')}
            onChange={(e) => {
              const label = e.currentTarget.value;
              form.setFieldValue('label', label);
              if (!form.isTouched('name')) form.setFieldValue('name', slugify(label));
            }}
          />
          <TextInput label="Table name" description="Used in the API URL and SQL" {...form.getInputProps('name')} onFocus={() => form.setTouched({ name: true })} />
          <Textarea label="Description" {...form.getInputProps('description')} />
          <Select label="Who can read" data={readAccessOptions} {...form.getInputProps('readAccess')} />
          <Select label="Who can write" data={writeAccessOptions} {...form.getInputProps('writeAccess')} />
          <Group justify="flex-end">
            <Button variant="default" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" loading={create.isPending}>
              Create table
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}

export default function Tables() {
  const tables = useTables();
  const [opened, { open, close }] = useDisclosure();
  const importSchema = useSchemaMutation((doc: unknown) => api.post<{ createdTables: string[]; addedFields: string[] }>('/api/schema/import', doc));

  const onImport = async (file: File | null) => {
    if (!file) return;
    try {
      const res = await importSchema.mutateAsync(JSON.parse(await file.text()));
      const r = res as { createdTables: string[]; addedFields: string[] };
      notifications.show({ color: 'success', message: `Imported: ${r.createdTables.length} tables, ${r.addedFields.length} fields added` });
    } catch (e) {
      notifications.show({ color: 'danger', message: errorMessage(e) });
    }
  };

  const showTypes = async () => {
    const ts = await api.get<string>('/api/schema/types.ts');
    modals.open({
      title: 'Generated TypeScript types',
      size: 'xl',
      children: (
        <Code block style={{ maxHeight: 500, overflow: 'auto' }}>
          {ts}
        </Code>
      ),
    });
  };

  return (
    <Page>
      <PageHeader
        eyebrow="Admin"
        title="Data builder"
        description="Define the tables and fields your application needs. Changes apply to the SQLite database immediately."
        actions={
          <>
            <Button variant="default" leftSection={<IconCode size={16} />} onClick={showTypes}>
              Types
            </Button>
            <Button variant="default" leftSection={<IconDownload size={16} />} component="a" href="/api/schema/export">
              Export
            </Button>
            <FileButton onChange={onImport} accept="application/json">
              {(props) => (
                <Button variant="default" leftSection={<IconUpload size={16} />} {...props}>
                  Import
                </Button>
              )}
            </FileButton>
            <Button leftSection={<IconPlus size={16} />} onClick={open}>
              New table
            </Button>
          </>
        }
      />
      {tables.data?.length === 0 && (
        <Card>
          <EmptyState
            icon={<IconDatabase />}
            title="No tables yet"
            description="Create your first table, or import a schema.json exported from another environment."
            action={<Button onClick={open}>Create a table</Button>}
          />
        </Card>
      )}
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }}>
        {tables.data?.map((t) => (
          <Card key={t.name} component={Link} to={`/admin/data/${t.name}`} style={{ textDecoration: 'none' }}>
            <Group justify="space-between" mb={4}>
              <Text fw={700}>{t.label}</Text>
              <Badge variant="outline">{t.fields.length} fields</Badge>
            </Group>
            <Code mb="sm">{t.name}</Code>
            <Text size="sm" c="dimmed" lineClamp={2} mb="sm">
              {t.description || 'No description'}
            </Text>
            <Group gap={6}>
              <Badge color="accent">read: {t.readAccess}</Badge>
              <Badge color="warning">write: {t.writeAccess}</Badge>
            </Group>
          </Card>
        ))}
      </SimpleGrid>
      <NewTableModal opened={opened} onClose={close} />
    </Page>
  );
}
