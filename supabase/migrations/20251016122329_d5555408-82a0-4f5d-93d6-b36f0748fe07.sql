-- Create enum for council roles
CREATE TYPE public.council_role AS ENUM ('advisor', 'partner', 'accountant', 'observer');

-- Create strategic_invitations table
CREATE TABLE public.strategic_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entrepreneur_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  member_email TEXT NOT NULL,
  member_name TEXT,
  role council_role NOT NULL DEFAULT 'advisor',
  message TEXT,
  invitation_token UUID NOT NULL DEFAULT gen_random_uuid(),
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days')
);

-- Create strategic_council_members table
CREATE TABLE public.strategic_council_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entrepreneur_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  member_email TEXT NOT NULL,
  member_name TEXT,
  role council_role NOT NULL DEFAULT 'advisor',
  status TEXT NOT NULL DEFAULT 'pending',
  invited_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  joined_at TIMESTAMPTZ,
  last_active_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(entrepreneur_id, member_email)
);

-- Enable RLS
ALTER TABLE public.strategic_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.strategic_council_members ENABLE ROW LEVEL SECURITY;

-- RLS Policies for strategic_invitations
CREATE POLICY "Users can view their own invitations"
  ON public.strategic_invitations
  FOR SELECT
  USING (auth.uid() = entrepreneur_id);

CREATE POLICY "Users can create their own invitations"
  ON public.strategic_invitations
  FOR INSERT
  WITH CHECK (auth.uid() = entrepreneur_id);

CREATE POLICY "Users can update their own invitations"
  ON public.strategic_invitations
  FOR UPDATE
  USING (auth.uid() = entrepreneur_id);

CREATE POLICY "Users can delete their own invitations"
  ON public.strategic_invitations
  FOR DELETE
  USING (auth.uid() = entrepreneur_id);

-- RLS Policies for strategic_council_members
CREATE POLICY "Users can view their council members"
  ON public.strategic_council_members
  FOR SELECT
  USING (auth.uid() = entrepreneur_id);

CREATE POLICY "Users can create council members"
  ON public.strategic_council_members
  FOR INSERT
  WITH CHECK (auth.uid() = entrepreneur_id);

CREATE POLICY "Users can update their council members"
  ON public.strategic_council_members
  FOR UPDATE
  USING (auth.uid() = entrepreneur_id);

CREATE POLICY "Users can delete their council members"
  ON public.strategic_council_members
  FOR DELETE
  USING (auth.uid() = entrepreneur_id);

-- Create indexes for better performance
CREATE INDEX idx_strategic_invitations_entrepreneur ON public.strategic_invitations(entrepreneur_id);
CREATE INDEX idx_strategic_invitations_token ON public.strategic_invitations(invitation_token);
CREATE INDEX idx_strategic_invitations_status ON public.strategic_invitations(status);
CREATE INDEX idx_strategic_council_members_entrepreneur ON public.strategic_council_members(entrepreneur_id);
CREATE INDEX idx_strategic_council_members_email ON public.strategic_council_members(member_email);

-- Create trigger for updating updated_at
CREATE TRIGGER update_strategic_council_members_updated_at
  BEFORE UPDATE ON public.strategic_council_members
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();