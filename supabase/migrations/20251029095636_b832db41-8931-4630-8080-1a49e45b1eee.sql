-- 🗑️ CLEANUP: Ștergere plăți manuale invalid din subscription_payments
DELETE FROM subscription_payments 
WHERE stripe_invoice_id LIKE 'manual_fix_%';