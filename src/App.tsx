/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Settings,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Sparkles,
  ShieldCheck,
  CalendarDays,
  UtensilsCrossed,
  Coffee,
  Car,
  ShoppingCart,
  HeartPulse,
  ShoppingBag,
  Layers,
  Plus,
  Delete,
  Check,
  Tag,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  AlertOctagon,
  ArrowRight,
  Receipt,
  Trash2,
  Wallet,
  Target,
  PiggyBank,
  ChevronDown,
  ChevronUp,
  Play,
  CheckCircle,
  Sliders,
  Volume2,
  VolumeX,
  Vibrate,
  FileDown,
  FileUp,
  Save,
  X,
  Download,
  Share,
  WifiOff,
} from 'lucide-react';
import confetti from 'canvas-confetti';

/* ==========================================================================
   1. TYPES & DATA INTERFACES
   ========================================================================== */

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
  iconName: string;
  color: string;
  bgColor: string;
}

export interface Expense {
  id: string;
  amount: number;
  category: CategoryId;
  note?: string;
  date: string; // "YYYY-MM-DD"
  timestamp: number;
}

export interface FinancialConfig {
  monthlyIncome: number;      // Renda Mensal (SDD: R$ 6.000,00)
  fixedExpenses: number;      // Despesas Fixas (SDD: R$ 3.000,00)
  monthlyGoal: number;        // Meta Poupança / Reserva (SDD: R$ 1.200,00)
  daysInMonth: number;        // Dias no ciclo (SDD: 30 dias)
  compensationMode: 'next_day' | 'distribute_month'; // 'next_day' (SDD padrão)
  soundEnabled: boolean;
  hapticEnabled: boolean;
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

/* ==========================================================================
   2. CONSTANTS & DEFAULTS (SDD Specification)
   ========================================================================== */

export const DEFAULT_CONFIG: FinancialConfig = {
  monthlyIncome: 6000.0,
  fixedExpenses: 3000.0,
  monthlyGoal: 1200.0,
  daysInMonth: 30,
  compensationMode: 'next_day',
  soundEnabled: true,
  hapticEnabled: true,
};

export const CATEGORIES: Category[] = [
  { id: 'food', name: 'Alimentação', iconName: 'UtensilsCrossed', color: '#10B981', bgColor: 'rgba(16, 185, 129, 0.15)' },
  { id: 'coffee', name: 'Café / Lanche', iconName: 'Coffee', color: '#F59E0B', bgColor: 'rgba(245, 158, 11, 0.15)' },
  { id: 'transport', name: 'Transporte', iconName: 'Car', color: '#06B6D4', bgColor: 'rgba(6, 182, 212, 0.15)' },
  { id: 'market', name: 'Mercado', iconName: 'ShoppingCart', color: '#3B82F6', bgColor: 'rgba(59, 130, 246, 0.15)' },
  { id: 'leisure', name: 'Lazer', iconName: 'Sparkles', color: '#A855F7', bgColor: 'rgba(168, 85, 247, 0.15)' },
  { id: 'health', name: 'Farmácia', iconName: 'HeartPulse', color: '#EC4899', bgColor: 'rgba(236, 72, 153, 0.15)' },
  { id: 'shopping', name: 'Compras', iconName: 'ShoppingBag', color: '#6366F1', bgColor: 'rgba(99, 102, 241, 0.15)' },
  { id: 'other', name: 'Outros', iconName: 'Layers', color: '#94A3B8', bgColor: 'rgba(148, 163, 184, 0.15)' },
];

export const QUICK_NOTE_SUGGESTIONS = [
  'Almoço',
  'Café',
  'Uber',
  'Padaria',
  'Lanche',
  'Mercadinho',
  'Farmácia',
  'Gasolina',
];

const CONFIG_STORAGE_KEY = 'cotadiaria_config_v1';
const EXPENSES_STORAGE_KEY = 'cotadiaria_expenses_v1';

/* ==========================================================================
   3. AUDIO SYNTHESIS & HAPTIC FEEDBACK (Web Audio API - 100% Offline)
   ========================================================================== */

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

export function playKeyClick(enabled = true) {
  if (!enabled) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.04);

    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.04);
  } catch {
    // Autoplay restrictions fallback
  }
}

export function playSuccessSound(enabled = true) {
  if (!enabled) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.04);

      gain.gain.setValueAtTime(0.09, now + idx * 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.04 + 0.2);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + idx * 0.04);
      osc.stop(now + idx * 0.04 + 0.2);
    });
  } catch {
    // Ignored
  }
}

export function playOverrunAlertSound(enabled = true) {
  if (!enabled) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(330, now);
    osc.frequency.setValueAtTime(280, now + 0.1);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.25);
  } catch {
    // Ignored
  }
}

export function triggerHaptic(pattern: number | number[] = 10, enabled = true) {
  if (!enabled) return;
  if (typeof window !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch {
      // Ignored
    }
  }
}

/* ==========================================================================
   4. FINANCIAL CALCULATIONS & FORMATTING (SDD Gherkin Engine)
   ========================================================================== */

export function formatBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
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

/**
 * SDD Rule:
 * Renda Mensal R$ 6.000,00, Despesas Fixas R$ 3.000,00 e Meta R$ 1.200,00 (30 dias)
 * Cota Base diária = (6000 - 3000 - 1200) / 30 = R$ 1800 / 30 = R$ 60,00.
 */
export function calculateBaseQuota(config: FinancialConfig): number {
  const discretionary = config.monthlyIncome - config.fixedExpenses - config.monthlyGoal;
  const days = config.daysInMonth > 0 ? config.daysInMonth : 30;
  const base = discretionary / days;
  return Math.max(0, Math.round(base * 100) / 100);
}

export function calculateDay(
  targetDate: string,
  allExpenses: Expense[],
  config: FinancialConfig
): DayCalculation {
  const baseQuota = calculateBaseQuota(config);

  // Overrun compensation from previous day
  const yesterdayDate = addDays(targetDate, -1);
  const yesterdayExpenses = allExpenses.filter((e) => e.date === yesterdayDate);
  const yesterdaySpent = yesterdayExpenses.reduce((sum, e) => sum + e.amount, 0);

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
    const currentDayNum = parseInt(targetDate.split('-')[2], 10) || 1;
    const remainingDays = Math.max(1, config.daysInMonth - currentDayNum + 1);
    const deduction = overrunFromYesterday / remainingDays;
    effectiveQuota = Math.max(0, baseQuota - deduction);
  }

  // Target date spending
  const todayExpenses = allExpenses.filter((e) => e.date === targetDate);
  const totalSpent = todayExpenses.reduce((sum, e) => sum + e.amount, 0);

  const isOverrun = totalSpent > effectiveQuota;
  const overrunAmount = isOverrun ? totalSpent - effectiveQuota : 0;
  const remainingBalance = isOverrun ? 0 : effectiveQuota - totalSpent;

  const percentSpent =
    effectiveQuota > 0
      ? (totalSpent / effectiveQuota) * 100
      : totalSpent > 0
      ? 100
      : 0;

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

  // SDD Scenario 2 rule:
  // Cota Ajustada projetada para amanhã = R$ 60,00 - R$ 35,00 = R$ 25,00
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

/* ==========================================================================
   5. LOCAL STORAGE PERSISTENCE (100% Offline)
   ========================================================================== */

export function loadConfig(): FinancialConfig {
  if (typeof window === 'undefined') return DEFAULT_CONFIG;
  try {
    const raw = localStorage.getItem(CONFIG_STORAGE_KEY);
    if (!raw) return DEFAULT_CONFIG;
    return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_CONFIG;
  }
}

export function saveConfig(config: FinancialConfig): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config));
  } catch {
    // LocalStorage quota or privacy mode error
  }
}

export function loadExpenses(): Expense[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(EXPENSES_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveExpenses(expenses: Expense[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(EXPENSES_STORAGE_KEY, JSON.stringify(expenses));
  } catch {
    // LocalStorage quota error
  }
}

/* ==========================================================================
   6. PWA HOOKS (Install & Online State)
   ========================================================================== */

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setIsInstalled(isStandalone);

    const userAgent = window.navigator.userAgent.toLowerCase();
    setIsIOS(/iphone|ipad|ipod/.test(userAgent));

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, []);

  const install = async () => {
    if (!deferredPrompt) return false;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
      setDeferredPrompt(null);
      return true;
    }
    return false;
  };

  return { isInstallable: !!deferredPrompt, isInstalled, isIOS, install };
}

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}

/* ==========================================================================
   7. CATEGORY ICON HELPER
   ========================================================================== */

function renderCategoryIcon(iconName: string, className = 'w-4 h-4') {
  switch (iconName) {
    case 'UtensilsCrossed':
      return <UtensilsCrossed className={className} />;
    case 'Coffee':
      return <Coffee className={className} />;
    case 'Car':
      return <Car className={className} />;
    case 'ShoppingCart':
      return <ShoppingCart className={className} />;
    case 'Sparkles':
      return <Sparkles className={className} />;
    case 'HeartPulse':
      return <HeartPulse className={className} />;
    case 'ShoppingBag':
      return <ShoppingBag className={className} />;
    case 'Layers':
    default:
      return <Layers className={className} />;
  }
}

/* ==========================================================================
   8. COMPONENT: GAUGE RING (Circular Progress Gauge)
   ========================================================================== */

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

  const size = 260;
  const strokeWidth = 16;
  const center = size / 2;
  const radius = center - strokeWidth - 6;
  const circumference = 2 * Math.PI * radius;

  const visualPercent = Math.min(100, Math.max(0, percentSpent));
  const strokeDashoffset = circumference - (visualPercent / 100) * circumference;

  const colorMap = {
    green: {
      stroke: '#10B981',
      glow: 'rgba(16, 185, 129, 0.35)',
      badgeBg: 'bg-emerald-500/15',
      badgeBorder: 'border-emerald-500/30',
      badgeText: 'text-emerald-400',
      label: 'Dentro da Cota',
    },
    yellow: {
      stroke: '#F59E0B',
      glow: 'rgba(245, 158, 11, 0.35)',
      badgeBg: 'bg-amber-500/15',
      badgeBorder: 'border-amber-500/30',
      badgeText: 'text-amber-400',
      label: 'Atenção ao Limite',
    },
    red: {
      stroke: '#EF4444',
      glow: 'rgba(239, 68, 68, 0.45)',
      badgeBg: 'bg-rose-500/20',
      badgeBorder: 'border-rose-500/40',
      badgeText: 'text-rose-400',
      label: 'Cota Estourada',
    },
  };

  const currentTheme = colorMap[statusColor];

  return (
    <div className="relative flex flex-col items-center justify-center pt-2 pb-1">
      <div className="relative flex items-center justify-center">
        {/* Soft background glow */}
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

        {/* Center Content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-0.5">
            Gasto Hoje
          </span>

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

      {/* Dynamic Progress indicator */}
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
        <span className="text-slate-400 font-medium">{currentTheme.label}</span>
      </div>
    </div>
  );
};

/* ==========================================================================
   9. COMPONENT: TOMORROW CARD (Dynamic Recalculation & Compensation)
   ========================================================================== */

interface TomorrowCardProps {
  calculation: DayCalculation;
}

export const TomorrowCard: React.FC<TomorrowCardProps> = ({ calculation }) => {
  const { baseQuota, isOverrun, overrunAmount, projectedTomorrowQuota } = calculation;

  return (
    <div
      className={`relative overflow-hidden rounded-2xl p-4 transition-all duration-300 border ${
        isOverrun
          ? 'bg-gradient-to-br from-rose-950/40 via-[#16121C] to-[#12151E] border-rose-500/40 shadow-lg shadow-rose-950/30'
          : 'bg-gradient-to-br from-slate-900/90 via-[#131722] to-[#0F131D] border-slate-800 shadow-md'
      }`}
    >
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
              <CalendarDays className="w-5 h-5" />
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

/* ==========================================================================
   10. COMPONENT: FAST KEYPAD (Tactile Fast Entry < 3 seconds)
   ========================================================================== */

interface FastKeypadProps {
  onAddExpense: (amount: number, category: CategoryId, note: string) => void;
  config: FinancialConfig;
  calculation: DayCalculation;
}

export const FastKeypad: React.FC<FastKeypadProps> = ({
  onAddExpense,
  config,
  calculation,
}) => {
  const [inputVal, setInputVal] = useState<string>('0');
  const [selectedCategory, setSelectedCategory] = useState<CategoryId>('food');
  const [selectedNote, setSelectedNote] = useState<string>('');

  const parsedAmount = useMemo(() => {
    const sanitized = inputVal.replace(/\./g, '').replace(',', '.');
    const num = parseFloat(sanitized);
    return isNaN(num) ? 0 : Math.round(num * 100) / 100;
  }, [inputVal]);

  const handleDigit = (digit: string) => {
    playKeyClick(config.soundEnabled);
    triggerHaptic(8, config.hapticEnabled);

    setInputVal((prev) => {
      if (digit === ',') {
        if (prev.includes(',')) return prev;
        return `${prev},`;
      }
      if (prev.includes(',')) {
        const parts = prev.split(',');
        if (parts[1] && parts[1].length >= 2) return prev;
        return `${prev}${digit}`;
      }
      if (prev === '0') return digit;
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

    const willCauseOverrun = calculation.remainingBalance < parsedAmount;
    if (willCauseOverrun) {
      playOverrunAlertSound(config.soundEnabled);
      triggerHaptic([30, 50, 30], config.hapticEnabled);
    } else {
      playSuccessSound(config.soundEnabled);
      triggerHaptic(20, config.hapticEnabled);
    }

    const defaultCategoryName =
      CATEGORIES.find((c) => c.id === selectedCategory)?.name || '';
    const finalNote = selectedNote.trim() || defaultCategoryName;

    onAddExpense(parsedAmount, selectedCategory, finalNote);

    setInputVal('0');
    setSelectedNote('');
  };

  const isPendingOverrun = parsedAmount > 0 && parsedAmount > calculation.remainingBalance;
  const pendingOverrunDiff = isPendingOverrun ? parsedAmount - calculation.remainingBalance : 0;

  return (
    <div className="w-full bg-[#12151F] border border-slate-800 rounded-2xl p-4 shadow-xl">
      {/* Category Pills Slider */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1.5 px-0.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Categoria Rápida
          </span>
          <span className="text-[11px] text-slate-400">Toque para selecionar</span>
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
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
                {renderCategoryIcon(cat.iconName)}
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

        {isPendingOverrun && (
          <div className="mt-1 text-[11px] font-semibold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20 animate-pulse">
            ⚠️ Estourará a cota de hoje em {formatBRL(pendingOverrunDiff)}
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

      {/* Tactile On-Screen Numeric Keypad (< 3s entry) */}
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

        <button
          type="button"
          onClick={() => handleDigit(',')}
          className="h-12 rounded-xl bg-slate-900/90 hover:bg-slate-800/90 active:bg-slate-700 border border-slate-800/80 text-xl font-extrabold font-mono text-slate-300 flex items-center justify-center active:scale-95 transition-transform"
        >
          ,
        </button>

        <button
          type="button"
          onClick={() => handleDigit('0')}
          className="h-12 rounded-xl bg-slate-900/90 hover:bg-slate-800/90 active:bg-emerald-500/20 border border-slate-800/80 text-xl font-bold font-mono text-white flex items-center justify-center active:scale-95 transition-transform"
        >
          0
        </button>

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

      {/* Quick Tag Presets */}
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

      {/* Confirm Button */}
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

/* ==========================================================================
   11. COMPONENT: SCENARIO SIMULATOR (SDD Validation Bar)
   ========================================================================== */

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

/* ==========================================================================
   12. COMPONENT: EXPENSE LIST
   ========================================================================== */

interface ExpenseListProps {
  expenses: Expense[];
  onDeleteExpense: (id: string) => void;
  dateLabel: string;
}

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

  const categoryMap = CATEGORIES.reduce((acc, cat) => {
    acc[cat.id] = cat;
    return acc;
  }, {} as Record<string, Category>);

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
          const cat = categoryMap[expense.category] || CATEGORIES[CATEGORIES.length - 1];
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
                  {renderCategoryIcon(cat.iconName)}
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

/* ==========================================================================
   13. COMPONENT: MONTH SUMMARY CARD
   ========================================================================== */

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

  const totalSpentMonth = allExpenses.reduce((sum, e) => sum + e.amount, 0);
  const remainingDiscretionary = Math.max(0, discretionaryBudget - totalSpentMonth);
  const percentMonthSpent =
    discretionaryBudget > 0 ? (totalSpentMonth / discretionaryBudget) * 100 : 0;

  return (
    <div className="bg-[#121520] border border-slate-800/80 rounded-2xl overflow-hidden shadow-md">
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
              Livre no Mês:{' '}
              <span className="text-emerald-400 font-mono">
                {formatBRL(remainingDiscretionary)}
              </span>
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

      {isOpen && (
        <div className="px-4 pb-4 pt-1 border-t border-slate-800/80 space-y-3 text-xs">
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

/* ==========================================================================
   14. COMPONENT: SETTINGS MODAL
   ========================================================================== */

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

  useEffect(() => {
    setFormData({ ...config });
  }, [config, isOpen]);

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
                  Desconta 100% de amanhã (SDD Padrão)
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

/* ==========================================================================
   15. COMPONENT: PWA INSTALL BUTTON & OFFLINE INDICATOR
   ========================================================================== */

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) return null;

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={install}
        className="flex items-center gap-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-3 py-1.5 text-xs font-semibold text-emerald-400 shadow-sm hover:bg-emerald-500/25 active:scale-95 transition"
        title="Instalar aplicativo PWA"
      >
        <Download className="w-3.5 h-3.5 text-emerald-400 animate-bounce" />
        <span>Instalar App</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className="flex items-center gap-1.5 rounded-full bg-slate-800/80 border border-slate-700/80 px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-700 active:scale-95 transition"
        >
          <Share className="w-3.5 h-3.5 text-slate-400" />
          <span>Instalar no iOS</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="w-full max-w-sm rounded-2xl bg-[#12151E] border border-slate-800 p-6 shadow-2xl text-slate-100">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Share className="w-4 h-4 text-emerald-400" />
                  Instalar no iPhone / iPad
                </h3>
                <button
                  type="button"
                  onClick={() => setShowIOSGuide(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mt-4 space-y-3 text-sm text-slate-300">
                <div className="flex items-start gap-3 bg-slate-900/60 p-3 rounded-xl border border-slate-800/60">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-xs font-bold text-emerald-400">
                    1
                  </span>
                  <p>
                    No Safari, toque no botão de <strong className="text-white">Compartilhar</strong> (ícone do quadrado com seta para cima).
                  </p>
                </div>

                <div className="flex items-start gap-3 bg-slate-900/60 p-3 rounded-xl border border-slate-800/60">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-xs font-bold text-emerald-400">
                    2
                  </span>
                  <p>
                    Role para baixo e selecione <strong className="text-white">Adicionar à Tela de Início</strong>.
                  </p>
                </div>

                <div className="flex items-start gap-3 bg-slate-900/60 p-3 rounded-xl border border-slate-800/60">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-xs font-bold text-emerald-400">
                    3
                  </span>
                  <p>
                    Pronto! Abra pelo ícone na tela inicial para desfrutar da experiência em tela cheia e 100% offline.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 w-full rounded-xl bg-slate-800 hover:bg-slate-700 py-2.5 text-sm font-semibold text-white transition active:scale-98"
              >
                Entendi
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 rounded-full bg-slate-900/95 border border-amber-500/40 px-3.5 py-1.5 text-xs font-medium text-amber-300 shadow-xl backdrop-blur-md">
      <span className="flex h-2 w-2 relative">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
        <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
      </span>
      <WifiOff className="w-3.5 h-3.5 text-amber-400" />
      <span>Modo Offline — Salvo localmente</span>
    </div>
  );
};

/* ==========================================================================
   16. MAIN APP COMPONENT (Single Unified Functional Component)
   ========================================================================== */

export default function App() {
  const [config, setConfig] = useState<FinancialConfig>(() => loadConfig());
  const [expenses, setExpenses] = useState<Expense[]>(() => loadExpenses());
  const [selectedDate, setSelectedDate] = useState<string>(() => getTodayDateString());
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    saveConfig(config);
  }, [config]);

  useEffect(() => {
    saveExpenses(expenses);
  }, [expenses]);

  const todayStr = getTodayDateString();
  const isViewingToday = selectedDate === todayStr;

  const currentCalculation = useMemo(() => {
    return calculateDay(selectedDate, expenses, config);
  }, [selectedDate, expenses, config]);

  const activeDateExpenses = useMemo(() => {
    return expenses
      .filter((e) => e.date === selectedDate)
      .sort((a, b) => b.timestamp - a.timestamp);
  }, [expenses, selectedDate]);

  const handleAddExpense = useCallback(
    (amount: number, category: CategoryId, note: string) => {
      const newExpense: Expense = {
        id: `exp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        amount,
        category,
        note,
        date: selectedDate,
        timestamp: Date.now(),
      };

      setExpenses((prev) => [newExpense, ...prev]);

      if (currentCalculation.remainingBalance >= amount) {
        confetti({
          particleCount: 25,
          spread: 45,
          origin: { y: 0.75 },
          colors: ['#10B981', '#34D399', '#059669', '#38BDF8'],
          disableForReducedMotion: true,
        });
      }
    },
    [selectedDate, currentCalculation.remainingBalance]
  );

  const handleDeleteExpense = useCallback((id: string) => {
    setExpenses((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const handleRunScenario1 = useCallback(() => {
    const today = getTodayDateString();
    const filtered = expenses.filter((e) => e.date !== today);
    const sc1Expense: Expense = {
      id: `sc1_${Date.now()}`,
      amount: 25.0,
      category: 'food',
      note: 'Almoço Executivo (Cenário 1)',
      date: today,
      timestamp: Date.now(),
    };
    setExpenses([sc1Expense, ...filtered]);
    setSelectedDate(today);

    confetti({
      particleCount: 35,
      spread: 60,
      origin: { y: 0.6 },
      colors: ['#10B981', '#34D399', '#6EE7B7'],
      disableForReducedMotion: true,
    });
  }, [expenses]);

  const handleRunScenario2 = useCallback(() => {
    const today = getTodayDateString();
    const filtered = expenses.filter((e) => e.date !== today);
    const sc2Expense: Expense = {
      id: `sc2_${Date.now()}`,
      amount: 95.0,
      category: 'shopping',
      note: 'Compras e Jantar (Cenário 2)',
      date: today,
      timestamp: Date.now(),
    };
    setExpenses([sc2Expense, ...filtered]);
    setSelectedDate(today);
  }, [expenses]);

  const handleResetToday = useCallback(() => {
    const today = getTodayDateString();
    setExpenses((prev) => prev.filter((e) => e.date !== today));
  }, []);

  return (
    <div className="min-h-screen bg-[#090A0F] text-slate-100 flex flex-col font-sans pb-12 select-none">
      <OfflineIndicator />

      {/* Header */}
      <header className="sticky top-0 z-30 bg-[#090A0F]/90 backdrop-blur-md border-b border-slate-800/80 px-4 py-3">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 p-[1.5px] shadow-sm shadow-emerald-500/20">
              <div className="w-full h-full bg-[#090A0F] rounded-[10px] flex items-center justify-center font-extrabold text-xs text-emerald-400">
                R$
              </div>
            </div>
            <div>
              <h1 className="text-base font-extrabold tracking-tight text-white flex items-center gap-1.5">
                CotaDiária
                <span className="text-[10px] uppercase font-bold px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  Fast
                </span>
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <PWAInstallButton />

            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 transition active:scale-95"
              title="Configurações da Cota e Parâmetros"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-md w-full mx-auto px-4 pt-3 space-y-3.5 flex-1">
        {/* Date Selector */}
        <div className="flex items-center justify-between bg-[#121520] border border-slate-800/80 rounded-2xl p-1.5 shadow-sm">
          <button
            type="button"
            onClick={() => setSelectedDate((prev) => addDays(prev, -1))}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-850 active:scale-95 transition"
            title="Dia anterior"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-emerald-400" />
            <button
              type="button"
              onClick={() => setSelectedDate(todayStr)}
              className="text-xs font-bold text-white hover:text-emerald-300 transition flex items-center gap-1"
            >
              <span>{formatDatePortuguese(selectedDate)}</span>
              <span className="text-[11px] font-mono font-medium text-slate-400">
                ({selectedDate.split('-').reverse().slice(0, 2).join('/')})
              </span>
            </button>

            {!isViewingToday && (
              <button
                type="button"
                onClick={() => setSelectedDate(todayStr)}
                className="text-[10px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full hover:bg-emerald-500/25 transition"
              >
                Ir para Hoje
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => setSelectedDate((prev) => addDays(prev, 1))}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-850 active:scale-95 transition"
            title="Próximo dia"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* 1. Dashboard Principal: Anel de Progresso Circular (Gauge Ring) */}
        <div className="bg-[#121520] border border-slate-800/80 rounded-2xl p-4 shadow-lg">
          <GaugeRing calculation={currentCalculation} />
        </div>

        {/* 2. Card em Destaque: Cota de Amanhã Recalculada em Tempo Real */}
        <TomorrowCard calculation={currentCalculation} />

        {/* 3. Simulação Rápida dos Cenários SDD */}
        <ScenarioSimulator
          onRunScenario1={handleRunScenario1}
          onRunScenario2={handleRunScenario2}
          onResetToday={handleResetToday}
          config={config}
        />

        {/* 4. Teclado Numérico Tátil (Fast Entry < 3s) */}
        <FastKeypad
          onAddExpense={handleAddExpense}
          config={config}
          calculation={currentCalculation}
        />

        {/* 5. Visão e Projeção Mensal */}
        <MonthSummaryCard config={config} allExpenses={expenses} />

        {/* 6. Lista de Gastos do Dia */}
        <ExpenseList
          expenses={activeDateExpenses}
          onDeleteExpense={handleDeleteExpense}
          dateLabel={formatDatePortuguese(selectedDate)}
        />
      </main>

      {/* Modal de Configurações */}
      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        config={config}
        onSaveConfig={setConfig}
        expenses={expenses}
        onImportExpenses={setExpenses}
      />
    </div>
  );
}
