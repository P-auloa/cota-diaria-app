import React, { useState } from 'react';
import {
  X,
  Sliders,
  RotateCcw,
  Volume2,
  VolumeX,
  Vibrate,
  FileDown,
  FileUp,
  Save,
  Info,
} from 'lucide-react';
import { FinancialConfig, Expense } from '../types';
import { DEFAULT_CONFIG } from '../utils/constants';
import { formatBRL, calculateBaseQuota } from '../utils/calculations';
import { playKeyClick, triggerHaptic } from '../utils/audio';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: FinancialConfig;
  onSaveConfig: (newConfig: FinancialConfig) => void;
  expenses: Expense[];
  onImportExpenses: (expenses: Expense[]) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  config,
  onSaveConfig,
  expenses,
  onImportExpenses,
}) => {
  const [formData, setFormData] = useState<FinancialConfig>({ ...config });
  const [importSuccess, setImportSuccess] = useState<string | null>(null);

  if (!isOpen) return null;

  const previewBaseQuota = calculateBaseQuota(formData);
  const previewDiscretionary =
    formData.monthlyIncome - formData.fixedExpenses - formData.monthlyGoal;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    playKeyClick(formData.soundEnabled);
    triggerHaptic(15, formData.hapticEnabled);
    onSaveConfig(formData);
    onClose();
  };

  const handleResetDefaults = () => {
    playKeyClick(config.soundEnabled);
    triggerHaptic(15, config.hapticEnabled);
    setFormData({ ...DEFAULT_CONFIG });
  };

  const handleExportJSON = () => {
    playKeyClick(config.soundEnabled);
    const backup = {
      config: formData,
      expenses,
      exportDate: new Date().toISOString(),
      app: 'CotaDiaria',
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cotadiaria-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);
        if (parsed.config) {
          setFormData(parsed.config);
          onSaveConfig(parsed.config);
        }
        if (Array.isArray(parsed.expenses)) {
          onImportExpenses(parsed.expenses);
        }
        setImportSuccess('Dados importados com sucesso!');
        setTimeout(() => setImportSuccess(null), 3000);
      } catch {
        alert('Erro ao importar arquivo JSON.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="w-full max-w-md rounded-2xl bg-[#121520] border border-slate-800 p-5 shadow-2xl text-slate-100 my-auto max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-slate-800 text-slate-200">
              <Sliders className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Configurações da Cota</h3>
              <p className="text-xs text-slate-400">Parâmetros financeiros & SDD</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Base Quota Real-Time Preview Card */}
          <div className="bg-gradient-to-br from-emerald-950/30 to-slate-900/90 border border-emerald-500/30 rounded-xl p-3">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-300 font-medium">Cota Base Resultante:</span>
              <span className="text-base font-extrabold font-mono text-emerald-400">
                {formatBRL(previewBaseQuota)} / dia
              </span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              Disponível para o mês: <span className="text-white font-mono">{formatBRL(previewDiscretionary)}</span>
            </div>
          </div>

          {/* Renda Mensal */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Renda Mensal (R$)
            </label>
            <input
              type="number"
              step="50"
              min="0"
              value={formData.monthlyIncome}
              onChange={(e) =>
                setFormData({ ...formData, monthlyIncome: parseFloat(e.target.value) || 0 })
              }
              className="w-full rounded-xl bg-slate-900 border border-slate-800 px-3 py-2 text-sm text-white font-mono focus:border-emerald-500 focus:outline-none"
            />
          </div>

          {/* Despesas Fixas */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Despesas Fixas (R$) (Aluguel, Contas, etc.)
            </label>
            <input
              type="number"
              step="50"
              min="0"
              value={formData.fixedExpenses}
              onChange={(e) =>
                setFormData({ ...formData, fixedExpenses: parseFloat(e.target.value) || 0 })
              }
              className="w-full rounded-xl bg-slate-900 border border-slate-800 px-3 py-2 text-sm text-white font-mono focus:border-emerald-500 focus:outline-none"
            />
          </div>

          {/* Meta Poupança / Reserva */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Meta de Economia / Poupança (R$)
            </label>
            <input
              type="number"
              step="50"
              min="0"
              value={formData.monthlyGoal}
              onChange={(e) =>
                setFormData({ ...formData, monthlyGoal: parseFloat(e.target.value) || 0 })
              }
              className="w-full rounded-xl bg-slate-900 border border-slate-800 px-3 py-2 text-sm text-white font-mono focus:border-emerald-500 focus:outline-none"
            />
          </div>

          {/* Dias no Mês */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Dias no Ciclo / Mês
            </label>
            <input
              type="number"
              min="1"
              max="31"
              value={formData.daysInMonth}
              onChange={(e) =>
                setFormData({ ...formData, daysInMonth: parseInt(e.target.value, 10) || 30 })
              }
              className="w-full rounded-xl bg-slate-900 border border-slate-800 px-3 py-2 text-sm text-white font-mono focus:border-emerald-500 focus:outline-none"
            />
          </div>

          {/* Modo de Compensação de Estouro */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Modo de Compensação do Estouro
            </label>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, compensationMode: 'next_day' })}
                className={`p-2.5 rounded-xl border text-left transition ${
                  formData.compensationMode === 'next_day'
                    ? 'bg-emerald-500/15 border-emerald-500 text-emerald-300 font-bold'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="font-bold">Dia Seguinte</div>
                <div className="text-[10px] opacity-80 mt-0.5">
                  Desconta 100% de amanhã (Padrão SDD)
                </div>
              </button>

              <button
                type="button"
                onClick={() => setFormData({ ...formData, compensationMode: 'distribute_month' })}
                className={`p-2.5 rounded-xl border text-left transition ${
                  formData.compensationMode === 'distribute_month'
                    ? 'bg-emerald-500/15 border-emerald-500 text-emerald-300 font-bold'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="font-bold">Diluir no Mês</div>
                <div className="text-[10px] opacity-80 mt-0.5">
                  Divide nos dias restantes
                </div>
              </button>
            </div>
          </div>

          {/* Som & Haptic Feedback Toggles */}
          <div className="pt-2 border-t border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-2 text-slate-300">
                {formData.soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
                Sons do Teclado Tátil
              </span>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, soundEnabled: !formData.soundEnabled })}
                className={`w-11 h-6 rounded-full transition-colors relative ${
                  formData.soundEnabled ? 'bg-emerald-500' : 'bg-slate-800'
                }`}
              >
                <span
                  className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
                    formData.soundEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-2 text-slate-300">
                <Vibrate className="w-4 h-4 text-cyan-400" />
                Vibração Tátil (Haptic)
              </span>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, hapticEnabled: !formData.hapticEnabled })}
                className={`w-11 h-6 rounded-full transition-colors relative ${
                  formData.hapticEnabled ? 'bg-emerald-500' : 'bg-slate-800'
                }`}
              >
                <span
                  className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
                    formData.hapticEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Backup / Export / Import */}
          <div className="pt-2 border-t border-slate-800">
            <div className="text-xs font-semibold text-slate-400 mb-2">
              Backup Offline & Dados
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleExportJSON}
                className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-xs font-medium text-slate-200 transition"
              >
                <FileDown className="w-3.5 h-3.5 text-emerald-400" />
                <span>Exportar JSON</span>
              </button>

              <label className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-xs font-medium text-slate-200 transition cursor-pointer">
                <FileUp className="w-3.5 h-3.5 text-cyan-400" />
                <span>Importar JSON</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportFile}
                  className="hidden"
                />
              </label>
            </div>
            {importSuccess && (
              <p className="text-[11px] text-emerald-400 text-center mt-1.5">
                {importSuccess}
              </p>
            )}
          </div>

          {/* Action buttons */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={handleResetDefaults}
              className="flex items-center gap-1 text-xs text-slate-400 hover:text-white px-3 py-2 rounded-xl hover:bg-slate-800 transition"
              title="Restaurar padrão da especificação SDD"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Padrões SDD</span>
            </button>

            <button
              type="submit"
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-md transition active:scale-95"
            >
              <Save className="w-4 h-4" />
              <span>Salvar Alterações</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
