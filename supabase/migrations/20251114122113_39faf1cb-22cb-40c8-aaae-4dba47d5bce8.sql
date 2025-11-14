-- Creare tabel rapoarte_metadata pentru stocare istorică date financiare
CREATE TABLE IF NOT EXISTS rapoarte_metadata (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  cui TEXT NOT NULL,
  company_name TEXT,
  perioada_start DATE NOT NULL,
  perioada_end DATE NOT NULL,
  
  -- Date financiare
  profit_net DECIMAL(15,2),
  cash_banca DECIMAL(15,2),
  cash_casa DECIMAL(15,2),
  venituri_totale DECIMAL(15,2),
  cheltuieli_totale DECIMAL(15,2),
  marja_neta DECIMAL(5,2),
  
  -- Indicatori lichiditate
  lichiditate_generala DECIMAL(5,2),
  lichiditate_rapida DECIMAL(5,2),
  capital_lucru DECIMAL(15,2),
  
  -- Indicatori eficiență
  dso_zile INT,
  dpo_zile INT,
  ccc_zile INT,
  rotatie_stocuri_zile INT,
  
  -- Top 3 cheltuieli (JSON)
  top_cheltuieli JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT unique_report_per_period UNIQUE (user_id, cui, perioada_end)
);

-- Index pentru căutări rapide
CREATE INDEX IF NOT EXISTS idx_rapoarte_user_cui_perioada 
ON rapoarte_metadata(user_id, cui, perioada_end DESC);

-- RLS policies
ALTER TABLE rapoarte_metadata ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own reports"
ON rapoarte_metadata FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own reports"
ON rapoarte_metadata FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own reports"
ON rapoarte_metadata FOR UPDATE
USING (auth.uid() = user_id);