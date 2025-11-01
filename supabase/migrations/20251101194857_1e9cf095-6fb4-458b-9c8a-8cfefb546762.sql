-- Add index on user_id for better query performance on analyses table
CREATE INDEX IF NOT EXISTS idx_analyses_user_id ON public.analyses(user_id);

-- Add comment explaining the index purpose
COMMENT ON INDEX idx_analyses_user_id IS 'Improves performance for filtering analyses by user_id in Dashboard and other user-specific queries';