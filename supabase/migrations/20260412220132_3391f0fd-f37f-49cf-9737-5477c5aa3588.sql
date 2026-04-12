-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

-- Add embedding column to yana_semantic_memory
ALTER TABLE public.yana_semantic_memory 
ADD COLUMN IF NOT EXISTS embedding extensions.vector(768);

-- Create index for fast similarity search
CREATE INDEX IF NOT EXISTS idx_yana_semantic_memory_embedding 
ON public.yana_semantic_memory 
USING ivfflat (embedding extensions.vector_cosine_ops) WITH (lists = 100);

-- Function to match semantic memories by embedding similarity
CREATE OR REPLACE FUNCTION public.match_semantic_memories(
  query_embedding extensions.vector(768),
  match_user_id uuid,
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 5
)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  memory_type text,
  content text,
  context jsonb,
  importance_score float,
  similarity float,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT
    m.id,
    m.user_id,
    m.memory_type::text,
    m.content,
    m.context,
    m.importance_score::float,
    (1 - (m.embedding <=> query_embedding))::float AS similarity,
    m.created_at
  FROM public.yana_semantic_memory m
  WHERE m.user_id = match_user_id
    AND m.embedding IS NOT NULL
    AND (1 - (m.embedding <=> query_embedding)) > match_threshold
  ORDER BY m.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;