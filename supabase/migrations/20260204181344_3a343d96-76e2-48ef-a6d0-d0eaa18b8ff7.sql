-- Moltbook Integration Tables for YANA

-- Table: moltbook_agent - Stores YANA's agent data on Moltbook
CREATE TABLE public.moltbook_agent (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_name TEXT NOT NULL DEFAULT 'Yana',
  agent_id TEXT, -- ID from Moltbook after registration
  status TEXT NOT NULL DEFAULT 'not_registered', -- not_registered / pending_claim / claimed / active
  claim_url TEXT,
  verification_code TEXT,
  karma INTEGER DEFAULT 0,
  description TEXT,
  last_heartbeat TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table: moltbook_posts_queue - Posts awaiting approval or already posted
CREATE TABLE public.moltbook_posts_queue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  content_type TEXT NOT NULL DEFAULT 'post', -- 'post' / 'comment' / 'reply'
  submolt TEXT DEFAULT 'general',
  title TEXT,
  content TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending / approved / rejected / posted
  target_post_id TEXT, -- For comments/replies, the Moltbook post ID to respond to
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  rejected_reason TEXT,
  moltbook_post_id TEXT, -- ID received after posting
  upvotes INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  posted_at TIMESTAMPTZ
);

-- Table: moltbook_activity_log - Complete activity history
CREATE TABLE public.moltbook_activity_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  action_type TEXT NOT NULL, -- 'register' / 'claim' / 'post' / 'comment' / 'upvote' / 'karma_update'
  details JSONB,
  moltbook_response JSONB,
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.moltbook_agent ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moltbook_posts_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moltbook_activity_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Only admins can access these tables
CREATE POLICY "Admins can view moltbook_agent" 
ON public.moltbook_agent 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Admins can manage moltbook_agent" 
ON public.moltbook_agent 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Admins can view moltbook_posts_queue" 
ON public.moltbook_posts_queue 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Admins can manage moltbook_posts_queue" 
ON public.moltbook_posts_queue 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Admins can view moltbook_activity_log" 
ON public.moltbook_activity_log 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Admins can insert moltbook_activity_log" 
ON public.moltbook_activity_log 
FOR INSERT 
WITH CHECK (true);

-- Trigger for updated_at on moltbook_agent
CREATE TRIGGER update_moltbook_agent_updated_at
BEFORE UPDATE ON public.moltbook_agent
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();