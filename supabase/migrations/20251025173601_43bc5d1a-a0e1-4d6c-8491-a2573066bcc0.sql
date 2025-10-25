-- Migration 1: Fix Companies RLS Policies
-- Obiectiv: Rezolvă problema clienților dispăruți pentru TOȚI contabilii

-- Drop politici RLS conflictuale pe tabelul companies
DROP POLICY IF EXISTS "Users can view only their own companies" ON public.companies;
DROP POLICY IF EXISTS "Admins can view all companies" ON public.companies;

-- Verificare: Păstrează doar politica comprehensivă "Accountants can view managed companies"
-- Aceasta este deja corectă și asigură că contabilii văd companiile cu managed_by_accountant_id = auth.uid()