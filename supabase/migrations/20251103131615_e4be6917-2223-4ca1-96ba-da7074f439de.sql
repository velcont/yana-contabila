-- Create table for multiple files per chapter
CREATE TABLE doctorate_chapter_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  chapter_number INT NOT NULL,
  chapter_title TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  word_count INT DEFAULT 0,
  content TEXT,
  uploaded_at TIMESTAMPTZ DEFAULT now(),
  is_final_version BOOLEAN DEFAULT false,
  
  CONSTRAINT chapter_number_valid CHECK (chapter_number BETWEEN 1 AND 6)
);

-- Index for fast lookup
CREATE INDEX idx_doctorate_chapter_files_user_chapter 
ON doctorate_chapter_files(user_id, chapter_number);

-- Enable RLS
ALTER TABLE doctorate_chapter_files ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can manage their own chapter files
CREATE POLICY "Users can manage their own chapter files"
ON doctorate_chapter_files
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);