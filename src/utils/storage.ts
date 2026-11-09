import { FinancialConfig, Expense } from '../types';
import { DEFAULT_CONFIG } from './constants';
import { getTodayDateString } from './calculations';

const CONFIG_KEY = 'cotadiaria_config_v1';
const EXPENSES_KEY = 'cotadiaria_expenses_v1';

export function loadConfig(): FinancialConfig {
  if (typeof window === 'undefined') return DEFAULT_CONFIG;
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    if (!raw) return DEFAULT_CONFIG;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_CONFIG, ...parsed };
  } catch (e) {
    console.error('Failed to parse financial config', e);
    return DEFAULT_CONFIG;
  }
}

export function saveConfig(config: FinancialConfig): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
  } catch (e) {
    console.error('Failed to save financial config', e);
  }
}

export function loadExpenses(): Expense[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(EXPENSES_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load expenses', e);
    return [];
  }
}

export function saveExpenses(expenses: Expense[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(EXPENSES_KEY, JSON.stringify(expenses));
  } catch (e) {
    console.error('Failed to save expenses', e);
  }
}

/**
 * Provides a clean starting state or demo scenarios for immediate testing
 */
export function seedDemoData(scenario?: 'scenario1' | 'scenario2' | 'empty'): Expense[] {
  const today = getTodayDateString();
  const currentExpenses = loadExpenses();
  const filtered = currentExpenses.filter((e) => e.date !== today);

  if (scenario === 'scenario1') {
    // Cenário 1: Gasto de R$ 25,00 dentro da cota de R$ 60,00 -> Restante R$ 35,00
    const sc1Expense: Expense = {
      id: `sc1_${Date.now()}`,
      amount: 25.0,
      category: 'food',
      note: 'Almoço Executivo (Cenário 1)',
      date: today,
      timestamp: Date.now(),
    };
    const updated = [sc1Expense, ...filtered];
    saveExpenses(updated);
    return updated;
  }

  if (scenario === 'scenario2') {
    // Cenário 2: Gasto de R$ 95,00 -> Estouro de R$ 35,00 -> Cota de amanhã passa para R$ 25,00
    const sc2Expense: Expense = {
      id: `sc2_${Date.now()}`,
      amount: 95.0,
      category: 'shopping',
      note: 'Compras e Jantar (Cenário 2)',
      date: today,
      timestamp: Date.now(),
    };
    const updated = [sc2Expense, ...filtered];
    saveExpenses(updated);
    return updated;
  }

  // Clear today's expenses
  saveExpenses(filtered);
  return filtered;
}
