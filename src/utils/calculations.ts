import { FinancialConfig, Expense, DayCalculation } from '../types';

export function formatBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatBRLCompact(value: number): string {
  return `R$ ${value.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + days);
  const nextY = date.getFullYear();
  const nextM = String(date.getMonth() + 1).padStart(2, '0');
  const nextD = String(date.getDate()).padStart(2, '0');
  return `${nextY}-${nextM}-${nextD}`;
}

export function formatDatePortuguese(dateStr: string): string {
  const today = getTodayDateString();
  const yesterday = addDays(today, -1);
  const tomorrow = addDays(today, 1);

  if (dateStr === today) return 'Hoje';
  if (dateStr === yesterday) return 'Ontem';
  if (dateStr === tomorrow) return 'Amanhã';

  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString('pt-BR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

export function calculateBaseQuota(config: FinancialConfig): number {
  const discretionary = config.monthlyIncome - config.fixedExpenses - config.monthlyGoal;
  const days = config.daysInMonth > 0 ? config.daysInMonth : 30;
  const base = discretionary / days;
  return Math.max(0, Math.round(base * 100) / 100);
}

/**
 * Calculates expenses and compensation for a target date.
 */
export function calculateDay(
  targetDate: string,
  allExpenses: Expense[],
  config: FinancialConfig
): DayCalculation {
  const baseQuota = calculateBaseQuota(config);

  // Check overrun from previous day
  const yesterdayDate = addDays(targetDate, -1);
  const yesterdayExpenses = allExpenses.filter((e) => e.date === yesterdayDate);
  const yesterdaySpent = yesterdayExpenses.reduce((sum, e) => sum + e.amount, 0);

  // For yesterday, its effective quota would be baseQuota (or cascading from day before)
  // To keep calculation predictable and aligned with SDD:
  const dayBeforeYesterday = addDays(yesterdayDate, -1);
  const dayBeforeExpenses = allExpenses.filter((e) => e.date === dayBeforeYesterday);
  const dayBeforeSpent = dayBeforeExpenses.reduce((sum, e) => sum + e.amount, 0);
  const dayBeforeOverrun = Math.max(0, dayBeforeSpent - baseQuota);
  const yesterdayEffectiveQuota = Math.max(0, baseQuota - dayBeforeOverrun);

  const overrunFromYesterday = Math.max(0, yesterdaySpent - yesterdayEffectiveQuota);

  // Effective quota for target date
  let effectiveQuota = baseQuota;
  if (config.compensationMode === 'next_day') {
    effectiveQuota = Math.max(0, baseQuota - overrunFromYesterday);
  } else {
    // distribute across remaining days
    const currentDayNum = parseInt(targetDate.split('-')[2], 10) || 1;
    const remainingDays = Math.max(1, config.daysInMonth - currentDayNum + 1);
    const deduction = overrunFromYesterday / remainingDays;
    effectiveQuota = Math.max(0, baseQuota - deduction);
  }

  // Today's spending
  const todayExpenses = allExpenses.filter((e) => e.date === targetDate);
  const totalSpent = todayExpenses.reduce((sum, e) => sum + e.amount, 0);

  const isOverrun = totalSpent > effectiveQuota;
  const overrunAmount = isOverrun ? totalSpent - effectiveQuota : 0;
  const remainingBalance = isOverrun ? 0 : effectiveQuota - totalSpent;

  // Percentage
  const percentSpent = effectiveQuota > 0 ? (totalSpent / effectiveQuota) * 100 : totalSpent > 0 ? 100 : 0;

  // Status color according to SDD:
  // Verde (<80%), Amarelo (80-99%) e Vermelho (>=100%)
  let statusColor: 'green' | 'yellow' | 'red' = 'green';
  if (percentSpent >= 100 || isOverrun) {
    statusColor = 'red';
  } else if (percentSpent >= 80) {
    statusColor = 'yellow';
  } else {
    statusColor = 'green';
  }

  // Projected Tomorrow Quota (SDD Gherkin rule):
  // Cenário: Dado que a Cota de hoje é R$ 60,00; Quando gasto de R$ 95,00;
  // Cota Ajustada projetada para amanhã passa a ser R$ 25,00 (R$ 60,00 - R$ 35,00).
  let projectedTomorrowQuota = baseQuota;
  if (isOverrun) {
    if (config.compensationMode === 'next_day') {
      projectedTomorrowQuota = Math.max(0, baseQuota - overrunAmount);
    } else {
      const currentDayNum = parseInt(targetDate.split('-')[2], 10) || 1;
      const remainingDays = Math.max(1, config.daysInMonth - currentDayNum);
      const dailyDeduction = overrunAmount / remainingDays;
      projectedTomorrowQuota = Math.max(0, baseQuota - dailyDeduction);
    }
  }

  return {
    date: targetDate,
    baseQuota,
    overrunFromYesterday,
    effectiveQuota,
    totalSpent,
    remainingBalance,
    isOverrun,
    overrunAmount,
    percentSpent,
    projectedTomorrowQuota,
    statusColor,
  };
}
