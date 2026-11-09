import { Category, FinancialConfig } from '../types';

export const DEFAULT_CONFIG: FinancialConfig = {
  monthlyIncome: 6000.0,
  fixedExpenses: 3000.0,
  monthlyGoal: 1200.0,
  daysInMonth: 30,
  compensationMode: 'next_day',
  soundEnabled: true,
  hapticEnabled: true,
  rolloverSavings: false,
};

export const CATEGORIES: Category[] = [
  {
    id: 'food',
    name: 'Alimentação',
    icon: 'UtensilsCrossed',
    color: '#10B981', // Emerald
    bgColor: 'rgba(16, 185, 129, 0.15)',
  },
  {
    id: 'coffee',
    name: 'Café / Lanche',
    icon: 'Coffee',
    color: '#F59E0B', // Amber
    bgColor: 'rgba(245, 158, 11, 0.15)',
  },
  {
    id: 'transport',
    name: 'Transporte',
    icon: 'Car',
    color: '#06B6D4', // Cyan
    bgColor: 'rgba(6, 182, 212, 0.15)',
  },
  {
    id: 'market',
    name: 'Mercado',
    icon: 'ShoppingCart',
    color: '#3B82F6', // Blue
    bgColor: 'rgba(59, 130, 246, 0.15)',
  },
  {
    id: 'leisure',
    name: 'Lazer',
    icon: 'Sparkles',
    color: '#A855F7', // Purple
    bgColor: 'rgba(168, 85, 247, 0.15)',
  },
  {
    id: 'health',
    name: 'Farmácia / Saúde',
    icon: 'HeartPulse',
    color: '#EC4899', // Pink
    bgColor: 'rgba(236, 72, 153, 0.15)',
  },
  {
    id: 'shopping',
    name: 'Compras',
    icon: 'ShoppingBag',
    color: '#6366F1', // Indigo
    bgColor: 'rgba(99, 102, 241, 0.15)',
  },
  {
    id: 'other',
    name: 'Outros',
    icon: 'Layers',
    color: '#94A3B8', // Slate
    bgColor: 'rgba(148, 163, 184, 0.15)',
  },
];

export const QUICK_NOTE_SUGGESTIONS = [
  'Almoço',
  'Café',
  'Uber / Táxi',
  'Padaria',
  'Lanche',
  'Mercadinho',
  'Farmácia',
  'Gasolina',
];
