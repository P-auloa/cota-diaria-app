import React from 'react';
import { Calendar, ArrowRight, ShieldCheck, AlertOctagon, Sparkles } from 'lucide-react';
import { DayCalculation } from '../types';
import { formatBRL } from '../utils/calculations';

interface TomorrowCardProps {
  calculation: DayCalculation;
}

export const TomorrowCard: React.FC<TomorrowCardProps> = ({ calculation }) => {
  const {
    baseQuota,
    isOverrun,
    overrunAmount,
    projectedTomorrowQuota,
  } = calculation;

  return (
    <div
      className={`relative overflow-hidden rounded-2xl p-4 transition-all duration-300 border ${
        isOverrun
          ? 'bg-gradient-to-br from-rose-950/40 via-[#16121C] to-[#12151E] border-rose-500/40 shadow-lg shadow-rose-950/30'
          : 'bg-gradient-to-br from-slate-900/90 via-[#131722] to-[#0F131D] border-slate-800 shadow-md'
      }`}
    >
      {/* Background ambient corner glow */}
      {isOverrun && (
        <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/10 rounded-full blur-2xl pointer-events-none" />
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className={`p-2 rounded-xl flex items-center justify-center ${
              isOverrun
                ? 'bg-rose-500/20 text-rose-400'
                : 'bg-emerald-500/15 text-emerald-400'
            }`}
          >
            {isOverrun ? (
              <AlertOctagon className="w-5 h-5 animate-pulse" />
            ) : (
              <Calendar className="w-5 h-5" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Compensação Dinâmica
              </span>
              <span
                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                  isOverrun
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    : 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                }`}
              >
                {isOverrun ? 'Ajuste Ativo' : 'Ritmo Ideal'}
              </span>
            </div>
            <h3 className="text-sm font-bold text-white flex items-center gap-1">
              Cota Projetada para Amanhã
            </h3>
          </div>
        </div>

        {/* Big Tomorrow Quota Display */}
        <div className="text-right">
          <div className="text-xl font-extrabold font-mono text-white tracking-tight">
            {formatBRL(projectedTomorrowQuota)}
          </div>
          <div className="text-[11px] text-slate-400">
            {isOverrun ? (
              <span className="text-rose-400 font-medium">Recalculada</span>
            ) : (
              <span>Cota integral</span>
            )}
          </div>
        </div>
      </div>

      {/* Recalculation Breakdown & Context */}
      <div className="mt-3 pt-3 border-t border-slate-800/80">
        {isOverrun ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs bg-slate-900/80 rounded-lg p-2 border border-rose-500/20 font-mono">
              <div className="flex items-center gap-1.5 text-slate-300">
                <span>Cota Base {formatBRL(baseQuota)}</span>
                <span className="text-rose-400">-</span>
                <span className="text-rose-400">Estouro {formatBRL(overrunAmount)}</span>
              </div>
              <div className="flex items-center gap-1 text-white font-bold">
                <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-rose-300">{formatBRL(projectedTomorrowQuota)}</span>
              </div>
            </div>

            <p className="text-[11px] text-slate-300 leading-relaxed flex items-start gap-1.5">
              <span className="text-rose-400 font-bold shrink-0">⚠️</span>
              <span>
                O excesso de <strong className="text-rose-300">{formatBRL(overrunAmount)}</strong>{' '}
                foi descontado da cota de amanhã para manter sua poupança intocada.
              </span>
            </p>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-xs text-slate-300">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="leading-snug">
              Gastos sob controle! Sua cota de amanhã está 100% preservada em{' '}
              <strong className="text-white">{formatBRL(baseQuota)}</strong>.
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
