import { Button, Group, JsonInput, Modal, NumberInput, Select, Stack, Switch, Textarea, TextInput } from '@mantine/core';
import { useForm } from '@mantine/form';
import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import type { DataRow, FieldDef, Paginated, TableDef } from '@shared/schema-types';
import { api } from '@/lib/api';
import { useSchemaMutation } from './hooks';

type Values = Record<string, unknown>;

/** Select populated from the related table, labelled by its display field. */
function RelationSelect({ field, ...props }: { field: FieldDef } & Record<string, unknown>) {
  const target = field.options.relationTable!;
  const meta = useQuery({
    queryKey: ['schema', target, 'public'],
    queryFn: () => api.get<TableDef>(`/api/data/${target}/schema`),
    enabled: target !== 'users',
  });
  const rows = useQuery({
    queryKey: ['data', target, 'options'],
    queryFn: () =>
      target === 'users'
        ? api.get<{ id: number; name: string | null; email: string | null }[]>('/api/users').then((u) => u.map((x) => ({ id: x.id, label: x.name ?? x.email ?? `#${x.id}` })))
        : api.get<Paginated<DataRow>>(`/api/data/${target}?pageSize=200`).then((r) => r.rows.map((x) => ({ id: x.id, label: String(x[meta.data?.displayField ?? 'id'] ?? `#${x.id}`) }))),
    enabled: target === 'users' || !!meta.data,
  });
  return <Select searchable clearable data={(rows.data ?? []).map((r) => ({ value: String(r.id), label: `${r.label} (#${r.id})` }))} {...props} />;
}

function FieldInput({ field, inputProps }: { field: FieldDef; inputProps: object }) {
  const common = { label: field.label, description: field.description ?? undefined, withAsterisk: field.required };
  switch (field.type) {
    case 'longtext':
      return <Textarea {...common} {...inputProps} />;
    case 'integer':
    case 'number':
      return <NumberInput {...common} allowDecimal={field.type === 'number'} {...inputProps} />;
    case 'boolean':
      return <Switch label={field.label} description={field.description ?? undefined} {...inputProps} />;
    case 'date':
      return <TextInput type="date" {...common} {...inputProps} />;
    case 'datetime':
      return <TextInput type="datetime-local" {...common} {...inputProps} />;
    case 'email':
      return <TextInput type="email" {...common} {...inputProps} />;
    case 'url':
      return <TextInput type="url" {...common} {...inputProps} />;
    case 'select':
      return <Select clearable={!field.required} data={field.options.choices ?? []} {...common} {...inputProps} />;
    case 'json':
      return <JsonInput formatOnBlur autosize minRows={3} {...common} {...inputProps} />;
    case 'relation':
      return <RelationSelect field={field} {...common} {...inputProps} />;
    default:
      return <TextInput {...common} {...inputProps} />;
  }
}

function toFormValue(f: FieldDef, v: unknown): unknown {
  if (f.type === 'boolean') return !!v;
  if (v == null) return f.type === 'integer' || f.type === 'number' ? '' : f.type === 'relation' ? null : '';
  if (f.type === 'json') return JSON.stringify(v, null, 2);
  if (f.type === 'relation') return String(v);
  if (f.type === 'datetime') return String(v).slice(0, 16);
  return v;
}

function toPayload(f: FieldDef, v: unknown): unknown {
  if (f.type === 'boolean') return !!v;
  if (v === '' || v == null) return null;
  if (f.type === 'json') return JSON.parse(String(v));
  if (f.type === 'relation' || f.type === 'integer' || f.type === 'number') return Number(v);
  return v;
}

export function RecordModal({ table, record, opened, onClose }: { table: TableDef; record: DataRow | null; opened: boolean; onClose: () => void }) {
  const form = useForm<Values>({ initialValues: {} });

  useEffect(() => {
    if (!opened) return;
    const vals: Values = {};
    for (const f of table.fields) vals[f.name] = toFormValue(f, record ? record[f.name] : f.defaultValue);
    form.setValues(vals);
    form.clearErrors();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opened, record, table]);

  const save = useSchemaMutation(
    (body: Values) => (record ? api.patch(`/api/data/${table.name}/${record.id}`, body) : api.post(`/api/data/${table.name}`, body)),
    record ? 'Record updated' : 'Record created',
  );

  return (
    <Modal opened={opened} onClose={onClose} title={record ? `Edit ${table.label} #${record.id}` : `New ${table.label}`} size="lg">
      <form
        onSubmit={form.onSubmit(async (vals) => {
          const body: Values = {};
          for (const f of table.fields) {
            try {
              body[f.name] = toPayload(f, vals[f.name]);
            } catch {
              form.setFieldError(f.name, 'Invalid JSON');
              return;
            }
            if (f.required && body[f.name] == null && f.type !== 'boolean') {
              form.setFieldError(f.name, 'Required');
              return;
            }
          }
          await save.mutateAsync(body);
          onClose();
        })}
      >
        <Stack>
          {table.fields.map((f) => (
            <FieldInput key={f.name} field={f} inputProps={form.getInputProps(f.name, f.type === 'boolean' ? { type: 'checkbox' } : undefined)} />
          ))}
          <Group justify="flex-end">
            <Button variant="default" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" loading={save.isPending}>
              Save
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
