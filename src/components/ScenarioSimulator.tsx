import React from 'react';
import { Play, RotateCcw, CheckCircle, AlertTriangle } from 'lucide-react';
import { FinancialConfig } from '../types';
import { playKeyClick, triggerHaptic } from '../utils/audio';

interface ScenarioSimulatorProps {
  onRunScenario1: () => void;
  onRunScenario2: () => void;
  onResetToday: () => void;
  config: FinancialConfig;
}

export const ScenarioSimulator: React.FC<ScenarioSimulatorProps> = ({
  onRunScenario1,
  onRunScenario2,
  onResetToday,
  config,
}) => {
  return (
    <div className="bg-[#121520] border border-slate-800/80 rounded-2xl p-3.5 shadow-md">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-300">
          <Play className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400" />
          <span>Simulação de Cenários SDD</span>
        </div>
        <button
          type="button"
          onClick={() => {
            playKeyClick(config.soundEnabled);
            triggerHaptic(10, config.hapticEnabled);
            onResetToday();
          }}
          className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-white px-2 py-0.5 rounded-md hover:bg-slate-800 transition"
          title="Zerar lançamentos de hoje"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Resetar Hoje</span>
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {/* Scenario 1 Button */}
        <button
          type="button"
          onClick={() => {
            playKeyClick(config.soundEnabled);
            triggerHaptic(15, config.hapticEnabled);
            onRunScenario1();
          }}
          className="flex flex-col text-left p-2.5 rounded-xl bg-slate-900/90 hover:bg-emerald-950/30 border border-slate-800 hover:border-emerald-500/40 transition active:scale-98 group"
        >
          <div className="flex items-center justify-between w-full mb-1">
            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
              Cenário 1
            </span>
            <CheckCircle className="w-3.5 h-3.5 text-emerald-400 group-hover:scale-110 transition" />
          </div>
          <span className="text-xs font-bold text-white">Gasto de R$ 25,00</span>
          <span className="text-[11px] text-slate-400 mt-0.5">
            Saldo Restante: <strong className="text-emerald-300">R$ 35,00</strong>
          </span>
        </button>

        {/* Scenario 2 Button */}
        <button
          type="button"
          onClick={() => {
            playKeyClick(config.soundEnabled);
            triggerHaptic(20, config.hapticEnabled);
            onRunScenario2();
          }}
          className="flex flex-col text-left p-2.5 rounded-xl bg-slate-900/90 hover:bg-rose-950/30 border border-slate-800 hover:border-rose-500/40 transition active:scale-98 group"
        >
          <div className="flex items-center justify-between w-full mb-1">
            <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider">
              Cenário 2
            </span>
            <AlertTriangle className="w-3.5 h-3.5 text-rose-400 group-hover:scale-110 transition" />
          </div>
          <span className="text-xs font-bold text-white">Gasto de R$ 95,00</span>
          <span className="text-[11px] text-slate-400 mt-0.5">
            Estouro de <strong className="text-rose-300">R$ 35</strong> → Amanhã <strong className="text-white">R$ 25</strong>
          </span>
        </button>
      </div>
    </div>
  );
};
