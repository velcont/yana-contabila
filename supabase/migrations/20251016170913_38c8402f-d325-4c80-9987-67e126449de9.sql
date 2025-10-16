-- Fix security issues: Enable RLS on profiles and client_portal_access tables
-- Drop existing policies if they exist to avoid conflicts

-- 1. Enable RLS on profiles table (if not already enabled)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies on profiles if they exist
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can read all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;

-- 3. Create RLS policies for profiles
CREATE POLICY "Users can read own profile"
ON profiles FOR SELECT
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
ON profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can read all profiles"
ON profiles FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

CREATE POLICY "Admins can update all profiles"
ON profiles FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

-- 4. Enable RLS on client_portal_access table
ALTER TABLE client_portal_access ENABLE ROW LEVEL SECURITY;

-- 5. Drop existing policies on client_portal_access if they exist
DROP POLICY IF EXISTS "Accountants can view their clients portal access" ON client_portal_access;
DROP POLICY IF EXISTS "Accountants can create portal access" ON client_portal_access;
DROP POLICY IF EXISTS "Accountants can update portal access" ON client_portal_access;
DROP POLICY IF EXISTS "Accountants can delete portal access" ON client_portal_access;
DROP POLICY IF EXISTS "Admins can manage all portal access" ON client_portal_access;

-- 6. Create RLS policies for client_portal_access
CREATE POLICY "Accountants can view their clients portal access"
ON client_portal_access FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM companies c
    WHERE c.id = client_portal_access.company_id
    AND c.managed_by_accountant_id = auth.uid()
  )
);

CREATE POLICY "Accountants can create portal access"
ON client_portal_access FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM companies c
    WHERE c.id = client_portal_access.company_id
    AND c.managed_by_accountant_id = auth.uid()
  )
);

CREATE POLICY "Accountants can update portal access"
ON client_portal_access FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM companies c
    WHERE c.id = client_portal_access.company_id
    AND c.managed_by_accountant_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM companies c
    WHERE c.id = client_portal_access.company_id
    AND c.managed_by_accountant_id = auth.uid()
  )
);

CREATE POLICY "Accountants can delete portal access"
ON client_portal_access FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM companies c
    WHERE c.id = client_portal_access.company_id
    AND c.managed_by_accountant_id = auth.uid()
  )
);

CREATE POLICY "Admins can manage all portal access"
ON client_portal_access FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);