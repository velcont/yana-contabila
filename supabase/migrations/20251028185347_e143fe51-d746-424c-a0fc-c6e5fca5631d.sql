-- BUG FIX #2 și #3: Adaugă constraint-uri unice pentru a preveni duplicate în plăți și credite

-- Fix pentru BUG CRITIC #2: Previne duplicate în credits_purchases
-- Curățăm duplicate existente folosind ROW_NUMBER
DO $$ 
BEGIN
  DELETE FROM credits_purchases
  WHERE id IN (
    SELECT id FROM (
      SELECT id, 
             ROW_NUMBER() OVER (PARTITION BY stripe_checkout_session_id ORDER BY created_at) as rn
      FROM credits_purchases
      WHERE stripe_checkout_session_id IS NOT NULL
    ) t
    WHERE t.rn > 1
  );
END $$;

-- Adaugă constraint unic pe stripe_checkout_session_id
ALTER TABLE credits_purchases 
ADD CONSTRAINT credits_purchases_stripe_session_unique 
UNIQUE (stripe_checkout_session_id);

-- Fix pentru BUG CRITIC #3: Previne duplicate în subscription_payments
-- Curățăm duplicate existente
DO $$ 
BEGIN
  DELETE FROM subscription_payments
  WHERE id IN (
    SELECT id FROM (
      SELECT id, 
             ROW_NUMBER() OVER (PARTITION BY stripe_invoice_id ORDER BY created_at) as rn
      FROM subscription_payments
      WHERE stripe_invoice_id IS NOT NULL
    ) t
    WHERE t.rn > 1
  );
END $$;

-- Adaugă constraint unic pe stripe_invoice_id
ALTER TABLE subscription_payments 
ADD CONSTRAINT subscription_payments_stripe_invoice_unique 
UNIQUE (stripe_invoice_id);

-- Curățăm duplicate pentru payment_intent_id
DO $$ 
BEGIN
  DELETE FROM subscription_payments
  WHERE id IN (
    SELECT id FROM (
      SELECT id, 
             ROW_NUMBER() OVER (PARTITION BY stripe_payment_intent_id ORDER BY created_at) as rn
      FROM subscription_payments
      WHERE stripe_payment_intent_id IS NOT NULL
    ) t
    WHERE t.rn > 1
  );
END $$;

-- Adaugă constraint pe stripe_payment_intent_id
ALTER TABLE subscription_payments 
ADD CONSTRAINT subscription_payments_stripe_payment_intent_unique 
UNIQUE (stripe_payment_intent_id);