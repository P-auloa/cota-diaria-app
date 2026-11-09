import React from 'react';
import { AlertTriangle, CheckCircle2, TrendingUp } from 'lucide-react';
import { DayCalculation } from '../types';
import { formatBRL } from '../utils/calculations';

interface GaugeRingProps {
  calculation: DayCalculation;
}

export const GaugeRing: React.FC<GaugeRingProps> = ({ calculation }) => {
  const {
    effectiveQuota,
    totalSpent,
    remainingBalance,
    isOverrun,
    overrunAmount,
    percentSpent,
    statusColor,
  } = calculation;

  // SVG dimensions
  const size = 260;
  const strokeWidth = 16;
  const center = size / 2;
  const radius = center - strokeWidth - 6;
  const circumference = 2 * Math.PI * radius;

  // Cap gauge visually at 100% for stroke, but show full overrun in styling
  const visualPercent = Math.min(100, Math.max(0, percentSpent));
  const strokeDashoffset = circumference - (visualPercent / 100) * circumference;

  // Color config based on SDD rules
  const colorMap = {
    green: {
      stroke: '#10B981',
      glow: 'rgba(16, 185, 129, 0.35)',
      badgeBg: 'bg-emerald-500/15',
      badgeBorder: 'border-emerald-500/30',
      badgeText: 'text-emerald-400',
      textHighlight: 'text-emerald-400',
      label: 'Dentro da Cota',
    },
    yellow: {
      stroke: '#F59E0B',
      glow: 'rgba(245, 158, 11, 0.35)',
      badgeBg: 'bg-amber-500/15',
      badgeBorder: 'border-amber-500/30',
      badgeText: 'text-amber-400',
      textHighlight: 'text-amber-400',
      label: 'Atenção ao Limite',
    },
    red: {
      stroke: '#EF4444',
      glow: 'rgba(239, 68, 68, 0.45)',
      badgeBg: 'bg-rose-500/20',
      badgeBorder: 'border-rose-500/40',
      badgeText: 'text-rose-400',
      textHighlight: 'text-rose-400',
      label: 'Cota Estourada',
    },
  };

  const currentTheme = colorMap[statusColor];

  return (
    <div className="relative flex flex-col items-center justify-center pt-2 pb-1">
      {/* SVG Container with subtle ambient backdrop glow */}
      <div className="relative flex items-center justify-center">
        {/* Soft background ambient glow */}
        <div
          className="absolute inset-0 rounded-full blur-2xl transition-all duration-700 pointer-events-none opacity-40"
          style={{ backgroundColor: currentTheme.glow }}
        />

        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="relative transform -rotate-90"
        >
          {/* Subtle definitions for gradient and shadow */}
          <defs>
            <filter id="gaugeShadow" x="-10%" y="-10%" width="120%" height="120%">
              <feDropShadow
                dx="0"
                dy="0"
                stdDeviation="4"
                floodColor={currentTheme.stroke}
                floodOpacity="0.4"
              />
            </filter>
          </defs>

          {/* Background Track Circle */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="#1E2333"
            strokeWidth={strokeWidth}
            className="transition-colors duration-300"
          />

          {/* Progress Active Ring */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={currentTheme.stroke}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            filter="url(#gaugeShadow)"
            className="transition-all duration-700 ease-out"
          />
        </svg>

        {/* Center Content Inside Ring */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-0.5">
            Gasto Hoje
          </span>

          {/* High-visibility amount */}
          <div className="flex items-baseline justify-center gap-1 font-mono">
            <span className="text-3xl font-extrabold text-white tracking-tight drop-shadow-sm">
              {formatBRL(totalSpent)}
            </span>
          </div>

          <div className="text-xs text-slate-400 mt-0.5 font-medium">
            de <span className="text-slate-200 font-semibold">{formatBRL(effectiveQuota)}</span>
          </div>

          {/* Status Badge */}
          <div
            className={`mt-2 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${currentTheme.badgeBg} ${currentTheme.badgeBorder} ${currentTheme.badgeText} transition-all duration-300 shadow-sm`}
          >
            {isOverrun ? (
              <AlertTriangle className="w-3.5 h-3.5 animate-pulse shrink-0" />
            ) : percentSpent >= 80 ? (
              <TrendingUp className="w-3.5 h-3.5 shrink-0" />
            ) : (
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            )}
            <span>
              {isOverrun
                ? `Estourada em ${formatBRL(overrunAmount)}`
                : `${formatBRL(remainingBalance)} livre`}
            </span>
          </div>
        </div>
      </div>

      {/* Dynamic Progress percentage bar footer info */}
      <div className="mt-3 flex items-center gap-3 text-xs">
        <div className="flex items-center gap-1.5 text-slate-300">
          <span
            className="h-2 w-2 rounded-full inline-block"
            style={{ backgroundColor: currentTheme.stroke }}
          />
          <span className="font-semibold">{Math.round(percentSpent)}%</span>
          <span className="text-slate-400">utilizado</span>
        </div>

        <span className="text-slate-700">•</span>

        <span className="text-slate-400 font-medium">
          {currentTheme.label}
        </span>
      </div>
    </div>
  );
};
