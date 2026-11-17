-- ==============================================================================
-- CotaDiária - Schema SQL para Supabase (PostgreSQL)
-- Copie e cole este script no painel do Supabase: SQL Editor > New query > Run
-- ==============================================================================

-- 1. Criação da Tabela de Despesas Diárias (expenses)
CREATE TABLE IF NOT EXISTS public.expenses (
  id TEXT PRIMARY KEY,
  amount NUMERIC(10, 2) NOT NULL,
  category TEXT NOT NULL,
  note TEXT DEFAULT '',
  date DATE NOT NULL,
  timestamp BIGINT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para consultas rápidas por data e ordenação temporal
CREATE INDEX IF NOT EXISTS idx_expenses_date ON public.expenses (date);
CREATE INDEX IF NOT EXISTS idx_expenses_timestamp ON public.expenses (timestamp DESC);

-- 2. Criação da Tabela de Configuração Financeira (financial_config)
CREATE TABLE IF NOT EXISTS public.financial_config (
  id TEXT PRIMARY KEY DEFAULT 'default',
  monthly_income NUMERIC(10, 2) NOT NULL DEFAULT 6000.00,
  fixed_expenses NUMERIC(10, 2) NOT NULL DEFAULT 3000.00,
  monthly_goal NUMERIC(10, 2) NOT NULL DEFAULT 1200.00,
  days_in_month INT NOT NULL DEFAULT 30,
  compensation_mode TEXT NOT NULL DEFAULT 'next_day',
  sound_enabled BOOLEAN NOT NULL DEFAULT true,
  haptic_enabled BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inserir registro padrão se ainda não existir
INSERT INTO public.financial_config (id, monthly_income, fixed_expenses, monthly_goal, days_in_month, compensation_mode, sound_enabled, haptic_enabled)
VALUES ('default', 6000.00, 3000.00, 1200.00, 30, 'next_day', true, true)
ON CONFLICT (id) DO NOTHING;

-- 3. Habilitação de Row Level Security (RLS)
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_config ENABLE ROW LEVEL SECURITY;

-- 4. Políticas RLS para Acesso com Chave Anônima Compartilhada (Anon Key)
-- Permite leitura, inserção, atualização e exclusão públicas
DROP POLICY IF EXISTS "Permissao publica anon para expenses" ON public.expenses;
CREATE POLICY "Permissao publica anon para expenses"
  ON public.expenses
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Permissao publica anon para financial_config" ON public.financial_config;
CREATE POLICY "Permissao publica anon para financial_config"
  ON public.financial_config
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- 5. Habilitar Realtime (REPLICA IDENTITY FULL + Publication) para sincronização entre aparelhos
ALTER TABLE public.expenses REPLICA IDENTITY FULL;
ALTER TABLE public.financial_config REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'expenses'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.expenses;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'financial_config'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.financial_config;
  END IF;
END $$;

-- 6. Atualiza o cache da API PostgREST
NOTIFY pgrst, 'reload schema';

-- Comentários
COMMENT ON TABLE public.expenses IS 'Tabela de despesas do CotaDiária';
COMMENT ON TABLE public.financial_config IS 'Tabela de parâmetros da cota financeira diária';
