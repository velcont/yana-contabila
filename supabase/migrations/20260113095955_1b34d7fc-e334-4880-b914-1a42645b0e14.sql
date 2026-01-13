-- Add foreign key constraint between ai_corrections.user_id and profiles.id
-- This allows Supabase PostgREST to automatically join the tables
ALTER TABLE ai_corrections 
ADD CONSTRAINT ai_corrections_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;