-- Fix RLS policy causing "more than one row returned by a subquery used as an expression"
-- Root cause: WITH CHECK used a subquery over companies returning multiple rows
-- Solution: constrain strictly to the owner user id, no subqueries

ALTER POLICY "Users can update only their own companies"
ON public.companies
USING ((auth.uid() IS NOT NULL) AND (auth.uid() = user_id))
WITH CHECK ((auth.uid() IS NOT NULL) AND (auth.uid() = user_id));
