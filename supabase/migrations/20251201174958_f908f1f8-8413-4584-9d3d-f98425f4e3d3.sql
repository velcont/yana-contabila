-- 🔴 CRITIC: Remediază vulnerabilitatea ai_response_cache
-- Șterge politica publică vulnerabilă
DROP POLICY IF EXISTS "Cache is accessible by system only" ON ai_response_cache;

-- Adaugă politică securizată (doar service_role)
CREATE POLICY "ai_cache_service_role_only"
  ON ai_response_cache
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ⚠️ MEDIU: Creează view public pentru accountant_profiles fără user_id sensibil
CREATE OR REPLACE VIEW public_accountant_profiles AS
SELECT 
  id, firm_name, location, specializations, years_experience,
  total_clients, rating, reviews_count, response_time_hours, 
  verified, created_at
FROM accountant_profiles;

-- Permite accesul public la view
GRANT SELECT ON public_accountant_profiles TO anon, authenticated;

-- ⚠️ SCĂZUT: Creează view public pentru subscription_plans fără Stripe IDs
CREATE OR REPLACE VIEW public_subscription_plans AS
SELECT 
  id, plan_type, name, description, price_monthly_eur, 
  features, created_at
FROM subscription_plans;

-- Permite accesul public la view
GRANT SELECT ON public_subscription_plans TO anon, authenticated;