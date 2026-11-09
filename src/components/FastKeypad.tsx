import React, { useState } from 'react';
import {
  Delete,
  Plus,
  UtensilsCrossed,
  Coffee,
  Car,
  ShoppingCart,
  Sparkles,
  HeartPulse,
  ShoppingBag,
  Layers,
  Check,
  Tag,
} from 'lucide-react';
import { CategoryId, FinancialConfig, DayCalculation } from '../types';
import { CATEGORIES, QUICK_NOTE_SUGGESTIONS } from '../utils/constants';
import { formatBRL } from '../utils/calculations';
import { playKeyClick, playSuccessSound, playOverrunAlertSound, triggerHaptic } from '../utils/audio';

interface FastKeypadProps {
  onAddExpense: (amount: number, category: CategoryId, note: string) => void;
  config: FinancialConfig;
  calculation: DayCalculation;
}

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

export const FastKeypad: React.FC<FastKeypadProps> = ({
  onAddExpense,
  config,
  calculation,
}) => {
  // Input string state, e.g. "25,00" or "0"
  const [inputVal, setInputVal] = useState<string>('0');
  const [selectedCategory, setSelectedCategory] = useState<CategoryId>('food');
  const [selectedNote, setSelectedNote] = useState<string>('');
  const [customNoteOpen, setCustomNoteOpen] = useState(false);

  // Parse input string to float number
  const parsedAmount = (() => {
    const sanitized = inputVal.replace(/\./g, '').replace(',', '.');
    const num = parseFloat(sanitized);
    return isNaN(num) ? 0 : Math.round(num * 100) / 100;
  })();

  const handleDigit = (digit: string) => {
    playKeyClick(config.soundEnabled);
    triggerHaptic(8, config.hapticEnabled);

    setInputVal((prev) => {
      // If adding comma
      if (digit === ',') {
        if (prev.includes(',')) return prev;
        return `${prev},`;
      }

      // Check max decimal places (max 2 decimals)
      if (prev.includes(',')) {
        const parts = prev.split(',');
        if (parts[1] && parts[1].length >= 2) return prev; // max 2 decimals
        return `${prev}${digit}`;
      }

      // Initial 0 replace
      if (prev === '0') {
        return digit;
      }

      // Max input limit (e.g. 99.999)
      if (prev.length >= 7) return prev;

      return `${prev}${digit}`;
    });
  };

  const handleBackspace = () => {
    playKeyClick(config.soundEnabled);
    triggerHaptic(12, config.hapticEnabled);

    setInputVal((prev) => {
      if (prev.length <= 1) return '0';
      return prev.slice(0, -1);
    });
  };

  const handleClear = () => {
    playKeyClick(config.soundEnabled);
    triggerHaptic(15, config.hapticEnabled);
    setInputVal('0');
    setSelectedNote('');
  };

  const handlePreset = (addition: number) => {
    playKeyClick(config.soundEnabled);
    triggerHaptic(12, config.hapticEnabled);

    const newTotal = parsedAmount + addition;
    setInputVal(
      newTotal.toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    );
  };

  const handleConfirm = () => {
    if (parsedAmount <= 0) return;

    // Check if will cause overrun
    const willCauseOverrun = calculation.remainingBalance < parsedAmount;
    if (willCauseOverrun) {
      playOverrunAlertSound(config.soundEnabled);
      triggerHaptic([30, 50, 30], config.hapticEnabled);
    } else {
      playSuccessSound(config.soundEnabled);
      triggerHaptic(20, config.hapticEnabled);
    }

    const defaultCategoryName = CATEGORIES.find((c) => c.id === selectedCategory)?.name || '';
    const finalNote = selectedNote.trim() || defaultCategoryName;

    onAddExpense(parsedAmount, selectedCategory, finalNote);

    // Reset keypad quickly
    setInputVal('0');
    setSelectedNote('');
    setCustomNoteOpen(false);
  };

  // Forecast on whether this current typing will breach the quota
  const isPendingOverrun = parsedAmount > 0 && parsedAmount > calculation.remainingBalance;
  const pendingOverrunDifference = isPendingOverrun
    ? parsedAmount - calculation.remainingBalance
    : 0;

  return (
    <div className="w-full bg-[#12151F] border border-slate-800 rounded-2xl p-4 shadow-xl">
      {/* Category Pills Slider */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1.5 px-0.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Categoria Rápida
          </span>
          <span className="text-[11px] text-slate-400">
            Toque para selecionar
          </span>
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none no-scrollbar">
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  playKeyClick(config.soundEnabled);
                  triggerHaptic(6, config.hapticEnabled);
                  setSelectedCategory(cat.id);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all shrink-0 active:scale-95 ${
                  isSelected
                    ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20 font-bold'
                    : 'bg-slate-900/90 text-slate-300 border border-slate-800 hover:border-slate-700'
                }`}
              >
                {ICONS_MAP[cat.icon]}
                <span>{cat.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Amount Display with Live Overrun Alert Preview */}
      <div className="relative mb-3 bg-[#0A0C12] border border-slate-800/80 rounded-xl p-3 flex flex-col items-center justify-center">
        <div className="text-[11px] text-slate-400 uppercase font-semibold tracking-wider">
          Novo Lançamento
        </div>

        <div className="flex items-baseline gap-1 mt-0.5">
          <span className="text-sm font-bold text-slate-400 font-mono">R$</span>
          <span
            className={`text-3xl font-extrabold font-mono tracking-tight ${
              parsedAmount > 0
                ? isPendingOverrun
                  ? 'text-rose-400'
                  : 'text-emerald-400'
                : 'text-slate-400'
            }`}
          >
            {inputVal.includes(',')
              ? inputVal
              : parsedAmount > 0
              ? `${inputVal},00`
              : '0,00'}
          </span>
        </div>

        {/* Live Warning if typing exceeds remaining */}
        {isPendingOverrun && (
          <div className="mt-1 text-[11px] font-semibold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20 animate-pulse">
            ⚠️ Estourará a cota de hoje em {formatBRL(pendingOverrunDifference)}
          </div>
        )}
      </div>

      {/* Quick Increment Presets */}
      <div className="grid grid-cols-4 gap-2 mb-3">
        {[5, 10, 20, 50].map((preset) => (
          <button
            key={preset}
            type="button"
            onClick={() => handlePreset(preset)}
            className="flex items-center justify-center py-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 active:bg-slate-700 border border-slate-800/90 text-xs font-bold text-slate-200 transition-all active:scale-95 shadow-sm"
          >
            <Plus className="w-3 h-3 text-emerald-400 mr-0.5" />
            <span>R${preset}</span>
          </button>
        ))}
      </div>

      {/* Tactile On-Screen Numeric Keypad (Fast Entry <3s) */}
      <div className="grid grid-cols-3 gap-2 touch-manipulation select-none">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
          <button
            key={num}
            type="button"
            onClick={() => handleDigit(num)}
            className="h-12 rounded-xl bg-slate-900/90 hover:bg-slate-800/90 active:bg-emerald-500/20 border border-slate-800/80 text-xl font-bold font-mono text-white flex items-center justify-center shadow-sm active:scale-95 transition-transform"
          >
            {num}
          </button>
        ))}

        {/* Comma Button */}
        <button
          type="button"
          onClick={() => handleDigit(',')}
          className="h-12 rounded-xl bg-slate-900/90 hover:bg-slate-800/90 active:bg-slate-700 border border-slate-800/80 text-xl font-extrabold font-mono text-slate-300 flex items-center justify-center active:scale-95 transition-transform"
        >
          ,
        </button>

        {/* Zero Button */}
        <button
          type="button"
          onClick={() => handleDigit('0')}
          className="h-12 rounded-xl bg-slate-900/90 hover:bg-slate-800/90 active:bg-emerald-500/20 border border-slate-800/80 text-xl font-bold font-mono text-white flex items-center justify-center active:scale-95 transition-transform"
        >
          0
        </button>

        {/* Backspace Button (Clear on click or double click) */}
        <button
          type="button"
          onClick={handleBackspace}
          onDoubleClick={handleClear}
          className="h-12 rounded-xl bg-slate-900/90 hover:bg-slate-800/90 active:bg-rose-500/20 border border-slate-800/80 text-slate-300 flex items-center justify-center active:scale-95 transition-transform"
          title="Apagar (clique duplo limpa)"
        >
          <Delete className="w-5 h-5" />
        </button>
      </div>

      {/* Quick Tag / Note Presets (Optional) */}
      <div className="mt-3 flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
        <Tag className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1" />
        {QUICK_NOTE_SUGGESTIONS.map((tag) => {
          const isSelected = selectedNote === tag;
          return (
            <button
              key={tag}
              type="button"
              onClick={() => {
                playKeyClick(config.soundEnabled);
                triggerHaptic(6, config.hapticEnabled);
                setSelectedNote(isSelected ? '' : tag);
              }}
              className={`px-2.5 py-1 rounded-lg shrink-0 font-medium transition-all ${
                isSelected
                  ? 'bg-slate-200 text-slate-900 font-bold'
                  : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800/50'
              }`}
            >
              {tag}
            </button>
          );
        })}
      </div>

      {/* Big Confirm Button */}
      <button
        type="button"
        disabled={parsedAmount <= 0}
        onClick={handleConfirm}
        className={`w-full mt-3 py-3 rounded-xl font-bold text-base flex items-center justify-center gap-2 transition-all shadow-lg active:scale-98 ${
          parsedAmount <= 0
            ? 'bg-slate-800/50 text-slate-500 border border-slate-800 cursor-not-allowed'
            : isPendingOverrun
            ? 'bg-gradient-to-r from-rose-600 to-amber-600 text-white shadow-rose-600/30 hover:opacity-95'
            : 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-extrabold shadow-emerald-500/25 hover:opacity-95'
        }`}
      >
        <Check className="w-5 h-5 stroke-[2.5]" />
        <span>
          {parsedAmount <= 0
            ? 'Digite o valor no teclado'
            : `Lançar Gasto ${formatBRL(parsedAmount)}`}
        </span>
      </button>
    </div>
  );
};
