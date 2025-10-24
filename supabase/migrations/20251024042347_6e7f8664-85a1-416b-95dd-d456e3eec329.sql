-- Corectare: Setează subscription_status = 'inactive' pentru toți utilizatorii
-- care NU au stripe_subscription_id valid (nu au abonament plătit)
UPDATE profiles
SET subscription_status = 'inactive'
WHERE stripe_subscription_id IS NULL
  AND subscription_status = 'active';