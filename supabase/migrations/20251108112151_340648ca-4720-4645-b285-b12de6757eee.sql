-- ═══════════════════════════════════════════════════════════════
-- MARKETPLACE YANA - TABLES & POLICIES
-- ═══════════════════════════════════════════════════════════════

-- TABEL 1: job_postings (Anunțuri de la ANTREPRENORI)
CREATE TABLE IF NOT EXISTS job_postings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  company_name text NOT NULL,
  cui text NOT NULL,
  is_vat_payer boolean DEFAULT false,
  tax_type text CHECK (tax_type IN ('microenterprise', 'profit', 'other')),
  documents_per_month text CHECK (documents_per_month IN ('<50', '50-100', '100-200', '200-500', '>500')),
  employees_count text CHECK (employees_count IN ('0', '1-5', '6-10', '>10')),
  budget_min integer,
  budget_max integer,
  special_requirements text,
  prefer_email boolean DEFAULT true,
  prefer_whatsapp boolean DEFAULT false,
  prefer_phone boolean DEFAULT false,
  status text DEFAULT 'active' CHECK (status IN ('active', 'closed', 'paused')),
  offers_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT (now() + interval '30 days')
);

-- TABEL 2: job_offers (Oferte de la CONTABILI)
CREATE TABLE IF NOT EXISTS job_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_posting_id uuid REFERENCES job_postings(id) ON DELETE CASCADE NOT NULL,
  accountant_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  price_per_month integer NOT NULL,
  services_included text[] DEFAULT ARRAY['contabilitate', 'tva', 'salarii'],
  message text NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'withdrawn')),
  created_at timestamptz DEFAULT now(),
  viewed_at timestamptz,
  responded_at timestamptz
);

-- TABEL 3: accountant_profiles (Profile contabili)
CREATE TABLE IF NOT EXISTS accountant_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  firm_name text NOT NULL,
  location text,
  years_experience integer,
  specializations text[],
  total_clients integer DEFAULT 0,
  rating numeric(3,2) DEFAULT 0.0 CHECK (rating >= 0 AND rating <= 5),
  reviews_count integer DEFAULT 0,
  verified boolean DEFAULT false,
  response_time_hours integer DEFAULT 24,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- INDEXES
CREATE INDEX idx_job_postings_user_id ON job_postings(user_id);
CREATE INDEX idx_job_postings_status ON job_postings(status) WHERE status = 'active';
CREATE INDEX idx_job_postings_created_at ON job_postings(created_at DESC);
CREATE INDEX idx_job_offers_job_posting_id ON job_offers(job_posting_id);
CREATE INDEX idx_job_offers_accountant_id ON job_offers(accountant_id);
CREATE INDEX idx_job_offers_status ON job_offers(status);
CREATE INDEX idx_accountant_profiles_user_id ON accountant_profiles(user_id);

-- ENABLE RLS
ALTER TABLE job_postings ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE accountant_profiles ENABLE ROW LEVEL SECURITY;

-- ═══════════════════════════════════════════════════════════════
-- RLS POLICIES pentru job_postings
-- ═══════════════════════════════════════════════════════════════

-- Entrepreneurs can view own postings
CREATE POLICY "Entrepreneurs can view own postings"
  ON job_postings FOR SELECT
  USING (auth.uid() = user_id);

-- Entrepreneurs can create postings (only if subscription_type = 'entrepreneur' AND status = 'active')
CREATE POLICY "Entrepreneurs can create postings"
  ON job_postings FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND subscription_type = 'entrepreneur'
      AND subscription_status = 'active'
    )
  );

-- Entrepreneurs can update own postings
CREATE POLICY "Entrepreneurs can update own postings"
  ON job_postings FOR UPDATE
  USING (auth.uid() = user_id);

-- Accountants can view active postings (only if subscription_type = 'accounting_firm' AND status = 'active')
CREATE POLICY "Accountants can view active postings"
  ON job_postings FOR SELECT
  USING (
    status = 'active' AND
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND subscription_type = 'accounting_firm'
      AND subscription_status = 'active'
    )
  );

-- ═══════════════════════════════════════════════════════════════
-- RLS POLICIES pentru job_offers
-- ═══════════════════════════════════════════════════════════════

-- Accountants can view own offers
CREATE POLICY "Accountants can view own offers"
  ON job_offers FOR SELECT
  USING (auth.uid() = accountant_id);

-- Entrepreneurs can view received offers
CREATE POLICY "Entrepreneurs can view received offers"
  ON job_offers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM job_postings 
      WHERE id = job_posting_id 
      AND user_id = auth.uid()
    )
  );

-- Accountants can create offers (only if subscription_type = 'accounting_firm' AND status = 'active')
CREATE POLICY "Accountants can create offers"
  ON job_offers FOR INSERT
  WITH CHECK (
    auth.uid() = accountant_id AND
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND subscription_type = 'accounting_firm'
      AND subscription_status = 'active'
    )
  );

-- Accountants can update own offers
CREATE POLICY "Accountants can update own offers"
  ON job_offers FOR UPDATE
  USING (auth.uid() = accountant_id);

-- Entrepreneurs can update offer status
CREATE POLICY "Entrepreneurs can update offer status"
  ON job_offers FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM job_postings 
      WHERE id = job_posting_id 
      AND user_id = auth.uid()
    )
  );

-- ═══════════════════════════════════════════════════════════════
-- RLS POLICIES pentru accountant_profiles
-- ═══════════════════════════════════════════════════════════════

-- Anyone can view accountant profiles
CREATE POLICY "Anyone can view accountant profiles"
  ON accountant_profiles FOR SELECT
  USING (true);

-- Accountants can update own profile
CREATE POLICY "Accountants can update own profile"
  ON accountant_profiles FOR UPDATE
  USING (auth.uid() = user_id);

-- Accountants can insert own profile
CREATE POLICY "Accountants can insert own profile"
  ON accountant_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════════════
-- TRIGGER pentru increment offers_count
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION increment_offers_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE job_postings 
  SET offers_count = offers_count + 1,
      updated_at = now()
  WHERE id = NEW.job_posting_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trigger_increment_offers_count
  AFTER INSERT ON job_offers
  FOR EACH ROW
  EXECUTE FUNCTION increment_offers_count();

-- Enable realtime for job_postings
ALTER PUBLICATION supabase_realtime ADD TABLE job_postings;