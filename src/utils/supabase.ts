import { createClient, SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import { Expense, FinancialConfig, CategoryId } from '../types';

const SUPABASE_STORAGE_KEY = 'cotadiaria_supabase_credentials_v1';
const SYNC_QUEUE_STORAGE_KEY = 'cotadiaria_sync_queue_v1';

export interface SupabaseCredentials {
  url: string;
  anonKey: string;
}

export interface SyncQueueState {
  pendingUpserts: string[];
  pendingDeletes: string[];
  syncedIds: string[];
  pendingConfigSync: boolean;
}

export const DEVICE_TAB_ID = `tab_${Math.random().toString(36).substring(2, 10)}_${Date.now()}`;

export function loadSyncQueue(): SyncQueueState {
  const empty: SyncQueueState = {
    pendingUpserts: [],
    pendingDeletes: [],
    syncedIds: [],
    pendingConfigSync: false,
  };
  if (typeof window === 'undefined') return empty;
  try {
    const raw = localStorage.getItem(SYNC_QUEUE_STORAGE_KEY);
    if (!raw) return empty;
    const parsed = JSON.parse(raw);
    return {
      pendingUpserts: Array.isArray(parsed.pendingUpserts) ? parsed.pendingUpserts : [],
      pendingDeletes: Array.isArray(parsed.pendingDeletes) ? parsed.pendingDeletes : [],
      syncedIds: Array.isArray(parsed.syncedIds) ? parsed.syncedIds : [],
      pendingConfigSync: Boolean(parsed.pendingConfigSync),
    };
  } catch {
    return empty;
  }
}

export function saveSyncQueue(queue: SyncQueueState): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(SYNC_QUEUE_STORAGE_KEY, JSON.stringify(queue));
  } catch {
    // Ignore storage quota errors
  }
}

/**
 * Validates that a string is a proper HTTP or HTTPS URL.
 */
export function isValidSupabaseUrl(rawUrl: string): boolean {
  const trimmed = rawUrl.trim();
  if (
    !trimmed ||
    trimmed.includes('your-project') ||
    trimmed.includes('seu-projeto')
  ) {
    return false;
  }
  try {
    const parsed = new URL(trimmed);
    return (
      (parsed.protocol === 'http:' || parsed.protocol === 'https:') &&
      Boolean(parsed.hostname) &&
      parsed.hostname.includes('.')
    );
  } catch {
    return false;
  }
}

/**
 * Normalizes user-entered URLs (e.g. prepends https:// if omitted for *.supabase.co).
 */
export function normalizeSupabaseUrl(rawUrl: string): string {
  const trimmed = rawUrl.trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed.replace(/\/+$/, '');
  }
  if (trimmed.includes('.')) {
    return `https://${trimmed}`.replace(/\/+$/, '');
  }
  return trimmed;
}

/**
 * Retrieves Supabase credentials from Vite environment variables or localStorage fallback.
 */
export function getSupabaseCredentials(): SupabaseCredentials {
  const envUrl = normalizeSupabaseUrl(import.meta.env.VITE_SUPABASE_URL || '');
  const envKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

  if (isValidSupabaseUrl(envUrl) && envKey && !envKey.includes('your-anon')) {
    return { url: envUrl, anonKey: envKey };
  }

  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(SUPABASE_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        const storedUrl = normalizeSupabaseUrl(String(parsed.url || ''));
        const storedKey = String(parsed.anonKey || '').trim();
        if (storedUrl && storedKey) {
          return { url: storedUrl, anonKey: storedKey };
        }
      }
    } catch {
      // Ignore
    }
  }

  return { url: '', anonKey: '' };
}

export function saveSupabaseCredentials(creds: SupabaseCredentials): void {
  if (typeof window === 'undefined') return;
  try {
    const normalized: SupabaseCredentials = {
      url: normalizeSupabaseUrl(creds.url),
      anonKey: creds.anonKey.trim(),
    };
    localStorage.setItem(SUPABASE_STORAGE_KEY, JSON.stringify(normalized));
    cachedClient = null;
    activeRealtimeChannel = null;
  } catch {
    // Ignore
  }
}

export function clearSupabaseCredentials(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(SUPABASE_STORAGE_KEY);
    cachedClient = null;
    activeRealtimeChannel = null;
  } catch {
    // Ignore
  }
}

let cachedClient: SupabaseClient | null = null;
let lastUrl = '';
let lastKey = '';

export function getSupabaseClient(): SupabaseClient | null {
  const { url, anonKey } = getSupabaseCredentials();

  if (!isValidSupabaseUrl(url) || !anonKey) {
    return null;
  }

  if (cachedClient && lastUrl === url && lastKey === anonKey) {
    return cachedClient;
  }

  try {
    cachedClient = createClient(url, anonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    });
    lastUrl = url;
    lastKey = anonKey;
    return cachedClient;
  } catch (e) {
    console.warn('Supabase client initialization skipped:', e);
    return null;
  }
}

export async function checkSupabaseHealth(): Promise<{ ok: boolean; message: string }> {
  const { url, anonKey } = getSupabaseCredentials();
  if (!url || !anonKey) {
    return { ok: false, message: 'Credenciais do Supabase não configuradas.' };
  }
  if (!isValidSupabaseUrl(url)) {
    return {
      ok: false,
      message: 'URL do Supabase inválida. Use o formato https://seu-projeto.supabase.co',
    };
  }

  const client = getSupabaseClient();
  if (!client) {
    return { ok: false, message: 'Não foi possível inicializar o cliente Supabase.' };
  }

  try {
    const { error } = await client.from('expenses').select('id').limit(1);
    if (error) {
      if (
        error.code === '42P01' ||
        error.code === 'PGRST205' ||
        error.message.includes('schema cache')
      ) {
        return {
          ok: false,
          message: 'Tabelas não encontradas no Supabase. Execute o script SQL no SQL Editor.',
        };
      }
      return { ok: false, message: `Erro ao conectar: ${error.message}` };
    }
    return { ok: true, message: 'Conectado ao Supabase com sucesso!' };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, message: `Falha na requisição: ${msg}` };
  }
}

export async function fetchRemoteExpenses(): Promise<Expense[] | null> {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    const { data, error } = await client
      .from('expenses')
      .select('id, amount, category, note, date, timestamp')
      .order('timestamp', { ascending: false });

    if (error) {
      console.warn('Supabase fetch expenses error:', error);
      return null;
    }

    return (data || []).map((row) => ({
      id: String(row.id),
      amount: Number(row.amount),
      category: row.category as CategoryId,
      note: row.note || '',
      date: String(row.date),
      timestamp: Number(row.timestamp),
    }));
  } catch (e) {
    console.warn('Supabase fetch failed:', e);
    return null;
  }
}

export async function upsertRemoteExpense(expense: Expense): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  try {
    const { error } = await client.from('expenses').upsert(
      {
        id: expense.id,
        amount: expense.amount,
        category: expense.category,
        note: expense.note || '',
        date: expense.date,
        timestamp: expense.timestamp,
      },
      { onConflict: 'id' }
    );
    if (error) {
      console.warn('Supabase upsert expense error:', error);
      return false;
    }
    return true;
  } catch (e) {
    console.warn('Supabase upsert expense failed:', e);
    return false;
  }
}

export async function deleteRemoteExpense(id: string): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  try {
    const { error } = await client.from('expenses').delete().eq('id', id);
    if (error) {
      console.warn('Supabase delete expense error:', error);
      return false;
    }
    return true;
  } catch (e) {
    console.warn('Supabase delete expense failed:', e);
    return false;
  }
}

export async function fetchRemoteConfig(): Promise<FinancialConfig | null> {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    const { data, error } = await client
      .from('financial_config')
      .select('*')
      .eq('id', 'default')
      .single();

    if (error || !data) return null;

    return {
      monthlyIncome: Number(data.monthly_income),
      fixedExpenses: Number(data.fixed_expenses),
      monthlyGoal: Number(data.monthly_goal),
      daysInMonth: Number(data.days_in_month),
      compensationMode: data.compensation_mode as 'next_day' | 'distribute_month',
      soundEnabled: Boolean(data.sound_enabled),
      hapticEnabled: Boolean(data.haptic_enabled),
    };
  } catch {
    return null;
  }
}

export async function saveRemoteConfig(config: FinancialConfig): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  try {
    const { error } = await client.from('financial_config').upsert(
      {
        id: 'default',
        monthly_income: config.monthlyIncome,
        fixed_expenses: config.fixedExpenses,
        monthly_goal: config.monthlyGoal,
        days_in_month: config.daysInMonth,
        compensation_mode: config.compensationMode,
        sound_enabled: config.soundEnabled,
        haptic_enabled: config.hapticEnabled,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    );
    if (error) {
      console.warn('Supabase save config error:', error);
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

/* ==========================================================================
   REALTIME SYNC & BROADCAST ENGINE (Multi-Device Instant Sync)
   ========================================================================== */

export type SyncBroadcastPayload =
  | { senderId: string; type: 'expense_upserted'; expense: Expense }
  | { senderId: string; type: 'expense_deleted'; id: string }
  | { senderId: string; type: 'config_updated'; config: FinancialConfig }
  | { senderId: string; type: 'force_sync' };

let activeRealtimeChannel: RealtimeChannel | null = null;

export function broadcastSyncSignal(
  payload:
    | { type: 'expense_upserted'; expense: Expense }
    | { type: 'expense_deleted'; id: string }
    | { type: 'config_updated'; config: FinancialConfig }
    | { type: 'force_sync' }
): void {
  if (!activeRealtimeChannel) return;
  try {
    activeRealtimeChannel
      .send({
        type: 'broadcast',
        event: 'sync_signal',
        payload: { ...payload, senderId: DEVICE_TAB_ID },
      })
      .catch(() => {});
  } catch {
    // Ignore if channel is closing
  }
}

export interface RealtimeCallbacks {
  onExpenseUpserted: (expense: Expense) => void;
  onExpenseDeleted: (id: string) => void;
  onConfigUpdated: (config: FinancialConfig) => void;
  onRemoteSyncRequested: () => void;
}

export function subscribeToRealtimeSync(callbacks: RealtimeCallbacks): () => void {
  const client = getSupabaseClient();
  if (!client) return () => {};

  // Clean up any previous channel on this client
  if (activeRealtimeChannel) {
    client.removeChannel(activeRealtimeChannel).catch(() => {});
    activeRealtimeChannel = null;
  }

  const channel = client
    .channel('cotadiaria-sync-v1', {
      config: {
        broadcast: { self: false },
      },
    })
    // 1. Instant Broadcast Events (Works immediately without SQL Publication setup)
    .on('broadcast', { event: 'sync_signal' }, ({ payload }) => {
      const msg = payload as SyncBroadcastPayload | undefined;
      if (!msg || msg.senderId === DEVICE_TAB_ID) return;

      if (msg.type === 'expense_upserted') {
        callbacks.onExpenseUpserted(msg.expense);
      } else if (msg.type === 'expense_deleted') {
        callbacks.onExpenseDeleted(msg.id);
      } else if (msg.type === 'config_updated') {
        callbacks.onConfigUpdated(msg.config);
      } else if (msg.type === 'force_sync') {
        callbacks.onRemoteSyncRequested();
      }
    })
    // 2. Postgres Changes for Expenses (Works when SQL Publication is enabled)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'expenses' },
      (payload) => {
        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
          const row = payload.new as Record<string, unknown>;
          if (row && row.id) {
            callbacks.onExpenseUpserted({
              id: String(row.id),
              amount: Number(row.amount),
              category: row.category as CategoryId,
              note: String(row.note || ''),
              date: String(row.date),
              timestamp: Number(row.timestamp),
            });
          }
        } else if (payload.eventType === 'DELETE') {
          const oldRow = payload.old as Record<string, unknown> | undefined;
          if (oldRow && oldRow.id) {
            callbacks.onExpenseDeleted(String(oldRow.id));
          } else {
            // Fallback if REPLICA IDENTITY wasn't FULL: fetch fresh state from DB
            callbacks.onRemoteSyncRequested();
          }
        }
      }
    )
    // 3. Postgres Changes for Financial Config
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'financial_config' },
      (payload) => {
        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
          const row = payload.new as Record<string, unknown>;
          if (row && row.id === 'default') {
            callbacks.onConfigUpdated({
              monthlyIncome: Number(row.monthly_income),
              fixedExpenses: Number(row.fixed_expenses),
              monthlyGoal: Number(row.monthly_goal),
              daysInMonth: Number(row.days_in_month),
              compensationMode: row.compensation_mode as 'next_day' | 'distribute_month',
              soundEnabled: Boolean(row.sound_enabled),
              hapticEnabled: Boolean(row.haptic_enabled),
            });
          }
        }
      }
    )
    .subscribe();

  activeRealtimeChannel = channel;

  return () => {
    if (activeRealtimeChannel === channel) {
      activeRealtimeChannel = null;
    }
    client.removeChannel(channel).catch(() => {});
  };
}
