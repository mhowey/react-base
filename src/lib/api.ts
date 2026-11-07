import { QueryClient } from '@tanstack/react-query';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(path, {
    method,
    credentials: 'same-origin',
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (res.status === 204) return undefined as T;
  const type = res.headers.get('content-type') ?? '';
  const data = type.includes('application/json') ? await res.json() : await res.text();
  if (!res.ok) {
    const err = typeof data === 'object' && data ? (data as { error?: string; details?: unknown }) : {};
    throw new ApiError(res.status, err.error ?? res.statusText, err.details);
  }
  return data as T;
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body ?? {}),
  patch: <T>(path: string, body: unknown) => request<T>('PATCH', path, body),
  put: <T>(path: string, body: unknown) => request<T>('PUT', path, body),
  delete: <T = void>(path: string) => request<T>('DELETE', path),
};

/** Human readable message incl. zod validation details. */
export function errorMessage(e: unknown): string {
  if (e instanceof ApiError) {
    const details = Array.isArray(e.details)
      ? (e.details as { path?: string; message: string }[]).map((d) => (d.path ? `${d.path}: ${d.message}` : d.message)).join('; ')
      : '';
    return details ? `${e.message} — ${details}` : e.message;
  }
  return e instanceof Error ? e.message : String(e);
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: (count, e) => !(e instanceof ApiError && e.status < 500) && count < 2,
      refetchOnWindowFocus: false,
    },
  },
});
