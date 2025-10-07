-- Allow admins to view all conversations
DROP POLICY IF EXISTS "Users can view own conversations" ON public.conversation_history;

CREATE POLICY "Users can view own conversations or admins can view all"
ON public.conversation_history
FOR SELECT
USING (
  auth.uid() = user_id 
  OR 
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

-- Allow admins to view all analyses
DROP POLICY IF EXISTS "Users can view own analyses" ON public.analyses;

CREATE POLICY "Users can view own analyses or admins can view all"
ON public.analyses
FOR SELECT
USING (
  auth.uid() = user_id 
  OR 
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

-- Allow admins to view all profiles
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
USING (
  auth.uid() = id 
  OR 
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);