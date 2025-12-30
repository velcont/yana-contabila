-- Create yana_conversations table for unified chat interface
CREATE TABLE public.yana_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT DEFAULT 'Conversație nouă',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create yana_messages table for conversation messages with artifacts
CREATE TABLE public.yana_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.yana_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  artifacts JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create yana_uploaded_documents table for tracking uploaded files
CREATE TABLE public.yana_uploaded_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.yana_conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT,
  document_type TEXT NOT NULL CHECK (document_type IN ('balance_excel', 'pdf', 'docx', 'other')),
  analysis_id UUID REFERENCES public.analyses(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.yana_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.yana_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.yana_uploaded_documents ENABLE ROW LEVEL SECURITY;

-- RLS Policies for yana_conversations
CREATE POLICY "Users can view their own conversations"
ON public.yana_conversations FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own conversations"
ON public.yana_conversations FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own conversations"
ON public.yana_conversations FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own conversations"
ON public.yana_conversations FOR DELETE
USING (auth.uid() = user_id);

-- RLS Policies for yana_messages
CREATE POLICY "Users can view messages in their conversations"
ON public.yana_messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.yana_conversations 
    WHERE id = conversation_id AND user_id = auth.uid()
  )
);

CREATE POLICY "Users can create messages in their conversations"
ON public.yana_messages FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.yana_conversations 
    WHERE id = conversation_id AND user_id = auth.uid()
  )
);

-- RLS Policies for yana_uploaded_documents
CREATE POLICY "Users can view their own documents"
ON public.yana_uploaded_documents FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can upload their own documents"
ON public.yana_uploaded_documents FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX idx_yana_conversations_user_id ON public.yana_conversations(user_id);
CREATE INDEX idx_yana_conversations_updated_at ON public.yana_conversations(updated_at DESC);
CREATE INDEX idx_yana_messages_conversation_id ON public.yana_messages(conversation_id);
CREATE INDEX idx_yana_uploaded_documents_conversation_id ON public.yana_uploaded_documents(conversation_id);

-- Create trigger for auto-updating updated_at
CREATE TRIGGER update_yana_conversations_updated_at
BEFORE UPDATE ON public.yana_conversations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();