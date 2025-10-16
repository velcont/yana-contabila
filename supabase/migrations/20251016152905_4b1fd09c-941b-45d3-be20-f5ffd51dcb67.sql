-- Actualizăm trial_ends_at pentru utilizatorii existenți care au trial activ
-- Setăm la 30 de zile de la data creării contului pentru toți utilizatorii cu trial activ

UPDATE profiles
SET trial_ends_at = created_at + interval '30 days'
WHERE trial_ends_at IS NOT NULL 
  AND trial_ends_at > NOW()
  AND has_free_access = false;