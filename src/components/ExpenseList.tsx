import React from 'react';
import {
  Trash2,
  Receipt,
  UtensilsCrossed,
  Coffee,
  Car,
  ShoppingCart,
  Sparkles,
  HeartPulse,
  ShoppingBag,
  Layers,
} from 'lucide-react';
import { Expense } from '../types';
import { CATEGORIES } from '../utils/constants';
import { formatBRL } from '../utils/calculations';

interface ExpenseListProps {
  expenses: Expense[];
  onDeleteExpense: (id: string) => void;
  dateLabel: string;
}

const CATEGORY_MAP = CATEGORIES.reduce((acc, cat) => {
  acc[cat.id] = cat;
  return acc;
}, {} as Record<string, typeof CATEGORIES[0]>);

const ICONS_MAP: Record<string, React.ReactNode> = {
  UtensilsCrossed: <UtensilsCrossed className="w-4 h-4" />,
  Coffee: <Coffee className="w-4 h-4" />,
  Car: <Car className="w-4 h-4" />,
  ShoppingCart: <ShoppingCart className="w-4 h-4" />,
  Sparkles: <Sparkles className="w-4 h-4" />,
  HeartPulse: <HeartPulse className="w-4 h-4" />,
  ShoppingBag: <ShoppingBag className="w-4 h-4" />,
  Layers: <Layers className="w-4 h-4" />,
};

export const ExpenseList: React.FC<ExpenseListProps> = ({
  expenses,
  onDeleteExpense,
  dateLabel,
}) => {
  if (expenses.length === 0) {
    return (
      <div className="bg-[#121520] border border-slate-800/80 rounded-2xl p-6 text-center shadow-md">
        <div className="mx-auto w-10 h-10 rounded-full bg-slate-800/80 flex items-center justify-center text-slate-400 mb-2">
          <Receipt className="w-5 h-5" />
        </div>
        <h4 className="text-sm font-bold text-slate-200">
          Nenhum gasto em {dateLabel}
        </h4>
        <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
          Use o teclado tátil acima para registrar seu primeiro gasto em menos de 3 segundos!
        </p>
      </div>
    );
  }

  return (
    <div className="bg-[#121520] border border-slate-800/80 rounded-2xl p-4 shadow-md">
      <div className="flex items-center justify-between mb-3 px-1">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Gastos de {dateLabel} ({expenses.length})
        </h4>
        <span className="text-xs font-mono font-bold text-slate-300">
          Total: {formatBRL(expenses.reduce((acc, curr) => acc + curr.amount, 0))}
        </span>
      </div>

      <div className="space-y-2">
        {expenses.map((expense) => {
          const cat = CATEGORY_MAP[expense.category] || CATEGORIES[CATEGORIES.length - 1];
          const time = new Date(expense.timestamp).toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit',
          });

          return (
            <div
              key={expense.id}
              className="flex items-center justify-between p-3 rounded-xl bg-slate-900/90 border border-slate-800/90 hover:border-slate-700 transition group"
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                  style={{
                    backgroundColor: cat.bgColor,
                    color: cat.color,
                  }}
                >
                  {ICONS_MAP[cat.icon]}
                </div>

                <div>
                  <div className="text-sm font-semibold text-white leading-tight">
                    {expense.note || cat.name}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-400">
                    <span>{cat.name}</span>
                    <span>•</span>
                    <span>{time}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="font-mono text-sm font-bold text-white tracking-tight">
                  {formatBRL(expense.amount)}
                </span>
                <button
                  type="button"
                  onClick={() => onDeleteExpense(expense.id)}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition"
                  title="Excluir gasto"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
