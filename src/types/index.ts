export type CategoryId =
  | 'food'
  | 'coffee'
  | 'transport'
  | 'market'
  | 'leisure'
  | 'health'
  | 'shopping'
  | 'other';

export interface Category {
  id: CategoryId;
  name: string;
  icon: string;
  color: string;
  bgColor: string;
}

export interface Expense {
  id: string;
  amount: number;
  category: CategoryId;
  note?: string;
  date: string; // YYYY-MM-DD
  timestamp: number;
}

export interface FinancialConfig {
  monthlyIncome: number;      // Renda Mensal (default: 6000.00)
  fixedExpenses: number;      // Despesas Fixas (default: 3000.00)
  monthlyGoal: number;        // Meta Poupança / Reserva (default: 1200.00)
  daysInMonth: number;        // Dias no mês (default: 30)
  compensationMode: 'next_day' | 'distribute_month'; // 'next_day' is SDD default
  soundEnabled: boolean;
  hapticEnabled: boolean;
  rolloverSavings: boolean;   // Se sobrar cota, acumula no cofre
}

export interface DayCalculation {
  date: string;
  baseQuota: number;
  overrunFromYesterday: number;
  effectiveQuota: number;
  totalSpent: number;
  remainingBalance: number;
  isOverrun: boolean;
  overrunAmount: number;
  percentSpent: number;
  projectedTomorrowQuota: number;
  statusColor: 'green' | 'yellow' | 'red';
}
