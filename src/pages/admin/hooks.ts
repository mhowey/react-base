import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { notifications } from '@mantine/notifications';
import type { DataRow, FieldDef, Paginated, TableDef } from '@shared/schema-types';
import { api, errorMessage } from '@/lib/api';

export const schemaKeys = { all: ['schema'] as const, table: (t: string) => ['schema', t] as const };
export const dataKeys = { table: (t: string) => ['data', t] as const };

export const useTables = () => useQuery({ queryKey: schemaKeys.all, queryFn: () => api.get<TableDef[]>('/api/schema/tables') });

export const useTable = (name: string) =>
  useQuery({ queryKey: schemaKeys.table(name), queryFn: () => api.get<TableDef>(`/api/schema/tables/${name}`) });

export function useRows(table: string, params: { page: number; pageSize: number; search: string; sort: string; order: 'asc' | 'desc' }) {
  const qs = new URLSearchParams({ page: String(params.page), pageSize: String(params.pageSize), sort: params.sort, order: params.order });
  if (params.search) qs.set('search', params.search);
  return useQuery({
    queryKey: [...dataKeys.table(table), params],
    queryFn: () => api.get<Paginated<DataRow>>(`/api/data/${table}?${qs}`),
    placeholderData: (prev) => prev,
  });
}

/** Wraps a mutation with cache invalidation + success/error toasts. */
export function useSchemaMutation<TVars>(fn: (v: TVars) => Promise<unknown>, success?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['schema'] });
      qc.invalidateQueries({ queryKey: ['data'] });
      if (success) notifications.show({ color: 'success', message: success });
    },
    onError: (e) => notifications.show({ color: 'danger', title: 'Something went wrong', message: errorMessage(e) }),
  });
}

export type FieldPayload = Omit<FieldDef, 'position'>;
