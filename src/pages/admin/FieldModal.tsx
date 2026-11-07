import { Alert, Button, Group, Modal, NumberInput, Select, SimpleGrid, Stack, Switch, TagsInput, Textarea, TextInput } from '@mantine/core';
import { useForm } from '@mantine/form';
import { useEffect } from 'react';
import { FIELD_TYPES, FIELD_TYPE_NAMES, IDENTIFIER_RE, SYSTEM_COLUMNS, type FieldDef, type FieldType, type TableDef } from '@shared/schema-types';
import { api } from '@/lib/api';
import { useSchemaMutation, useTables } from './hooks';

interface Values {
  name: string;
  label: string;
  type: FieldType;
  required: boolean;
  unique: boolean;
  description: string;
  defaultValue: string;
  choices: string[];
  relationTable: string | null;
  min: number | string;
  max: number | string;
}

const empty: Values = {
  name: '',
  label: '',
  type: 'text',
  required: false,
  unique: false,
  description: '',
  defaultValue: '',
  choices: [],
  relationTable: null,
  min: '',
  max: '',
};

function toValues(f: FieldDef): Values {
  return {
    name: f.name,
    label: f.label,
    type: f.type,
    required: f.required,
    unique: f.unique,
    description: f.description ?? '',
    defaultValue: f.defaultValue == null ? '' : typeof f.defaultValue === 'string' ? f.defaultValue : JSON.stringify(f.defaultValue),
    choices: f.options.choices ?? [],
    relationTable: f.options.relationTable ?? null,
    min: f.options.min ?? '',
    max: f.options.max ?? '',
  };
}

function parseDefault(type: FieldType, raw: string): unknown {
  if (raw === '') return null;
  if (type === 'integer' || type === 'number') return Number(raw);
  if (type === 'boolean') return raw === 'true';
  if (type === 'json') return JSON.parse(raw);
  return raw;
}

export function FieldModal({ table, field, opened, onClose }: { table: TableDef; field: FieldDef | null; opened: boolean; onClose: () => void }) {
  const tables = useTables();
  const form = useForm<Values>({
    initialValues: empty,
    validate: {
      name: (v) =>
        !IDENTIFIER_RE.test(v) ? 'lowercase letters, digits, underscores' : (SYSTEM_COLUMNS as readonly string[]).includes(v) ? 'Reserved name' : null,
      choices: (v, all) => (all.type === 'select' && v.length === 0 ? 'Add at least one choice' : null),
      relationTable: (v, all) => (all.type === 'relation' && !v ? 'Choose a table' : null),
    },
  });

  useEffect(() => {
    if (opened) form.setValues(field ? toValues(field) : empty);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opened, field]);

  const save = useSchemaMutation(
    (body: unknown) =>
      field ? api.patch(`/api/schema/tables/${table.name}/fields/${field.name}`, body) : api.post(`/api/schema/tables/${table.name}/fields`, body),
    field ? 'Field updated' : 'Field added',
  );

  const v = form.values;
  const numeric = v.type === 'integer' || v.type === 'number';
  const texty = v.type === 'text' || v.type === 'longtext';

  return (
    <Modal opened={opened} onClose={onClose} title={field ? `Edit field “${field.label}”` : 'Add field'} size="lg">
      <form
        onSubmit={form.onSubmit(async (vals) => {
          const options: Record<string, unknown> = {};
          if (vals.type === 'select') options.choices = vals.choices;
          if (vals.type === 'relation') options.relationTable = vals.relationTable;
          if ((numeric || texty) && vals.min !== '') options.min = Number(vals.min);
          if ((numeric || texty) && vals.max !== '') options.max = Number(vals.max);
          let defaultValue: unknown;
          try {
            defaultValue = parseDefault(vals.type, vals.defaultValue);
          } catch {
            form.setFieldError('defaultValue', 'Invalid JSON');
            return;
          }
          await save.mutateAsync({
            name: vals.name,
            label: vals.label || undefined,
            type: vals.type,
            required: vals.required,
            unique: vals.unique,
            description: vals.description || null,
            defaultValue,
            options,
          });
          onClose();
        })}
      >
        <Stack>
          <SimpleGrid cols={2}>
            <TextInput label="Name" description="Column name" data-autofocus {...form.getInputProps('name')} />
            <TextInput label="Label" description="Shown in forms" placeholder="Auto from name" {...form.getInputProps('label')} />
          </SimpleGrid>
          <Select
            label="Type"
            data={FIELD_TYPE_NAMES.map((t) => ({ value: t, label: `${FIELD_TYPES[t].label} — ${FIELD_TYPES[t].description}` }))}
            {...form.getInputProps('type')}
          />
          {field && v.type !== field.type && (
            <Alert color="warning" variant="light">
              Changing the type rebuilds the table. Existing values are kept as-is and may fail validation on next edit.
            </Alert>
          )}
          {v.type === 'select' && <TagsInput label="Choices" placeholder="Type and press Enter" {...form.getInputProps('choices')} />}
          {v.type === 'relation' && (
            <Select
              label="Related table"
              data={[{ value: 'users', label: 'users (system)' }, ...(tables.data ?? []).map((t) => ({ value: t.name, label: `${t.label} (${t.name})` }))]}
              {...form.getInputProps('relationTable')}
            />
          )}
          {(numeric || texty) && (
            <SimpleGrid cols={2}>
              <NumberInput label={texty ? 'Min length' : 'Min value'} {...form.getInputProps('min')} />
              <NumberInput label={texty ? 'Max length' : 'Max value'} {...form.getInputProps('max')} />
            </SimpleGrid>
          )}
          <TextInput
            label="Default value"
            description={v.type === 'json' ? 'JSON' : v.type === 'boolean' ? 'true or false' : 'Applied when a record is created without a value'}
            {...form.getInputProps('defaultValue')}
          />
          <Textarea label="Description" minRows={2} {...form.getInputProps('description')} />
          <Group>
            <Switch label="Required" {...form.getInputProps('required', { type: 'checkbox' })} />
            <Switch label="Unique" {...form.getInputProps('unique', { type: 'checkbox' })} />
          </Group>
          <Group justify="flex-end">
            <Button variant="default" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" loading={save.isPending}>
              {field ? 'Save field' : 'Add field'}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
