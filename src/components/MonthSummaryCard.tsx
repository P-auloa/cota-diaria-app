import React, { useState } from 'react';
import { PiggyBank, Wallet, ChevronDown, ChevronUp, Target } from 'lucide-react';
import { FinancialConfig, Expense } from '../types';
import { formatBRL, calculateBaseQuota } from '../utils/calculations';

interface MonthSummaryCardProps {
  config: FinancialConfig;
  allExpenses: Expense[];
}

export const MonthSummaryCard: React.FC<MonthSummaryCardProps> = ({
  config,
  allExpenses,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const baseQuota = calculateBaseQuota(config);
  const discretionaryBudget = config.monthlyIncome - config.fixedExpenses - config.monthlyGoal;

  // Total spent across all recorded days in current month
  const totalSpentMonth = allExpenses.reduce((sum, e) => sum + e.amount, 0);
  const remainingDiscretionary = Math.max(0, discretionaryBudget - totalSpentMonth);
  const percentMonthSpent = discretionaryBudget > 0 ? (totalSpentMonth / discretionaryBudget) * 100 : 0;

  return (
    <div className="bg-[#121520] border border-slate-800/80 rounded-2xl overflow-hidden shadow-md">
      {/* Header bar that toggles breakdown */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-900/40 transition"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-indigo-500/15 text-indigo-400 flex items-center justify-center shrink-0">
            <Wallet className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Visão Mensal
            </div>
            <div className="text-sm font-bold text-white">
              Livre no Mês: <span className="text-emerald-400 font-mono">{formatBRL(remainingDiscretionary)}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 text-slate-400">
          <span className="text-xs font-medium">
            {Math.round(percentMonthSpent)}% usado
          </span>
          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {/* Expanded detailed breakdown */}
      {isOpen && (
        <div className="px-4 pb-4 pt-1 border-t border-slate-800/80 space-y-3 text-xs animate-fadeIn">
          {/* Progress bar */}
          <div className="space-y-1">
            <div className="flex justify-between text-[11px] text-slate-400 font-medium">
              <span>Gasto no mês: {formatBRL(totalSpentMonth)}</span>
              <span>Teto variável: {formatBRL(discretionaryBudget)}</span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  percentMonthSpent >= 100
                    ? 'bg-rose-500'
                    : percentMonthSpent >= 80
                    ? 'bg-amber-500'
                    : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.min(100, percentMonthSpent)}%` }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1 font-mono">
            <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800/80">
              <div className="text-[10px] uppercase font-sans text-slate-400 flex items-center gap-1">
                <Target className="w-3 h-3 text-emerald-400" />
                Meta Poupança
              </div>
              <div className="text-sm font-bold text-emerald-300 mt-1">
                {formatBRL(config.monthlyGoal)}
              </div>
              <div className="text-[10px] font-sans text-slate-400 mt-0.5">
                100% blindada
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800/80">
              <div className="text-[10px] uppercase font-sans text-slate-400 flex items-center gap-1">
                <PiggyBank className="w-3 h-3 text-cyan-400" />
                Cota Base / Dia
              </div>
              <div className="text-sm font-bold text-white mt-1">
                {formatBRL(baseQuota)}
              </div>
              <div className="text-[10px] font-sans text-slate-400 mt-0.5">
                {config.daysInMonth} dias no ciclo
              </div>
            </div>
          </div>

          <div className="text-[11px] text-slate-400 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/60 leading-relaxed">
            💡 <strong className="text-slate-300">Como funciona:</strong> Renda (
            {formatBRL(config.monthlyIncome)}) menos Despesas Fixas (
            {formatBRL(config.fixedExpenses)}) e Meta de Poupança (
            {formatBRL(config.monthlyGoal)}) resulta em{' '}
            <strong className="text-white">{formatBRL(discretionaryBudget)}</strong> para gastos livres, distribuídos em{' '}
            <strong className="text-white">{formatBRL(baseQuota)}/dia</strong>.
          </div>
        </div>
      )}
    </div>
  );
};
