
-- Fix security definer views by explicitly setting SECURITY INVOKER
-- This ensures views run with the permissions of the querying user, not the view creator

-- Drop and recreate public_accountant_profiles with SECURITY INVOKER
DROP VIEW IF EXISTS public.public_accountant_profiles;
CREATE VIEW public.public_accountant_profiles 
WITH (security_invoker = true)
AS
SELECT 
    id,
    firm_name,
    location,
    specializations,
    years_experience,
    total_clients,
    rating,
    reviews_count,
    response_time_hours,
    verified,
    created_at
FROM public.accountant_profiles;

-- Drop and recreate public_subscription_plans with SECURITY INVOKER
DROP VIEW IF EXISTS public.public_subscription_plans;
CREATE VIEW public.public_subscription_plans
WITH (security_invoker = true)
AS
SELECT 
    id,
    plan_type,
    name,
    description,
    price_monthly_eur,
    features,
    created_at
FROM public.subscription_plans;

-- Drop and recreate strategic_facts_summary with SECURITY INVOKER
DROP VIEW IF EXISTS public.strategic_facts_summary;
CREATE VIEW public.strategic_facts_summary
WITH (security_invoker = true)
AS
SELECT 
    conversation_id,
    user_id,
    fact_category,
    count(*) AS total_facts,
    count(CASE WHEN status = 'validated' THEN 1 ELSE NULL END) AS validated_count,
    count(CASE WHEN status = 'conflicted' THEN 1 ELSE NULL END) AS conflicted_count,
    count(CASE WHEN status = 'outdated' THEN 1 ELSE NULL END) AS outdated_count,
    avg(confidence) AS avg_confidence,
    max(updated_at) AS last_updated
FROM public.strategic_advisor_facts
GROUP BY conversation_id, user_id, fact_category;

-- Add comment explaining the security model
COMMENT ON VIEW public.public_accountant_profiles IS 'Public view of accountant profiles - uses security_invoker for RLS enforcement';
COMMENT ON VIEW public.public_subscription_plans IS 'Public view of subscription plans - uses security_invoker for RLS enforcement';
COMMENT ON VIEW public.strategic_facts_summary IS 'Aggregated facts summary - uses security_invoker for RLS enforcement';
