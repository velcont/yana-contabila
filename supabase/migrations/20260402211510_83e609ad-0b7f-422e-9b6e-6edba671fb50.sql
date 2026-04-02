-- Tiered memory system
CREATE TABLE public.yana_semantic_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  memory_type TEXT NOT NULL DEFAULT 'episodic',
  content TEXT NOT NULL,
  embedding_key TEXT,
  relevance_score NUMERIC DEFAULT 0.5,
  access_count INTEGER DEFAULT 0,
  last_accessed_at TIMESTAMPTZ DEFAULT now(),
  source_conversation_id UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_semantic_memory_user_type ON public.yana_semantic_memory(user_id, memory_type);
CREATE INDEX idx_semantic_memory_relevance ON public.yana_semantic_memory(relevance_score DESC);

-- Delegation log
CREATE TABLE public.yana_delegation_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID,
  coordinator_decision JSONB DEFAULT '{}',
  agents_involved JSONB DEFAULT '[]',
  delegation_type TEXT DEFAULT 'sequential',
  execution_time_ms INTEGER,
  success BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_delegation_log_created ON public.yana_delegation_log(created_at DESC);

-- Execution plans
CREATE TABLE public.yana_execution_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_steps JSONB NOT NULL DEFAULT '[]',
  current_step INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending',
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_execution_plans_status ON public.yana_execution_plans(status);

-- Agent traces
CREATE TABLE public.yana_agent_traces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trace_id UUID NOT NULL,
  agent_name TEXT NOT NULL,
  input_summary TEXT,
  output_summary TEXT,
  duration_ms INTEGER,
  tokens_used INTEGER DEFAULT 0,
  cost_cents INTEGER DEFAULT 0,
  parent_trace_id UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_agent_traces_trace_id ON public.yana_agent_traces(trace_id);
CREATE INDEX idx_agent_traces_agent ON public.yana_agent_traces(agent_name, created_at DESC);

-- RLS
ALTER TABLE public.yana_semantic_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.yana_delegation_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.yana_execution_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.yana_agent_traces ENABLE ROW LEVEL SECURITY;

-- Semantic memory: admin full + users read own
CREATE POLICY "Admin full access on semantic memory" ON public.yana_semantic_memory
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users read own memory" ON public.yana_semantic_memory
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Delegation log: admin only
CREATE POLICY "Admin full access on delegation log" ON public.yana_delegation_log
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Execution plans: admin only
CREATE POLICY "Admin full access on execution plans" ON public.yana_execution_plans
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Agent traces: admin only
CREATE POLICY "Admin full access on agent traces" ON public.yana_agent_traces
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));