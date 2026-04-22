-- Tabela dispozitive locale
CREATE TABLE public.yana_local_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  device_name TEXT NOT NULL DEFAULT 'My Laptop',
  os_info TEXT,
  pairing_code TEXT UNIQUE,
  pairing_code_expires_at TIMESTAMPTZ,
  device_token TEXT UNIQUE,
  allowed_paths TEXT[] DEFAULT ARRAY[]::TEXT[],
  allow_bash BOOLEAN DEFAULT true,
  allow_write BOOLEAN DEFAULT true,
  status TEXT NOT NULL DEFAULT 'pending', -- pending | active | revoked
  last_seen_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_yana_local_devices_user ON public.yana_local_devices(user_id);
CREATE INDEX idx_yana_local_devices_token ON public.yana_local_devices(device_token) WHERE device_token IS NOT NULL;
CREATE INDEX idx_yana_local_devices_pairing ON public.yana_local_devices(pairing_code) WHERE pairing_code IS NOT NULL;

ALTER TABLE public.yana_local_devices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own devices" ON public.yana_local_devices
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own devices" ON public.yana_local_devices
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own devices" ON public.yana_local_devices
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own devices" ON public.yana_local_devices
  FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER set_yana_local_devices_updated_at
  BEFORE UPDATE ON public.yana_local_devices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Tabela queue de comenzi
CREATE TABLE public.yana_local_commands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id UUID NOT NULL REFERENCES public.yana_local_devices(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  command_type TEXT NOT NULL, -- fs_read | fs_write | fs_list | bash_exec | desktop_cmd
  command_params JSONB NOT NULL DEFAULT '{}'::jsonb,
  result JSONB,
  error TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- pending | executing | completed | failed | timeout
  duration_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_yana_local_commands_device ON public.yana_local_commands(device_id, status);
CREATE INDEX idx_yana_local_commands_user ON public.yana_local_commands(user_id, created_at DESC);

ALTER TABLE public.yana_local_commands ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own commands" ON public.yana_local_commands
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own commands" ON public.yana_local_commands
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Realtime pentru comenzi (agentul ascultă)
ALTER PUBLICATION supabase_realtime ADD TABLE public.yana_local_commands;
ALTER PUBLICATION supabase_realtime ADD TABLE public.yana_local_devices;