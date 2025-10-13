-- Allow accountants to update companies they manage
CREATE POLICY "Accountants can update managed companies fiscal params"
ON public.companies
FOR UPDATE
USING (auth.uid() = managed_by_accountant_id)
WITH CHECK (auth.uid() = managed_by_accountant_id);