
CREATE TABLE IF NOT EXISTS public.firme_noi_whatsapp (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cui text NOT NULL UNIQUE,
  nume text NOT NULL,
  nr_inmatriculare text,
  judet text,
  localitate text,
  adresa text,
  telefon text,
  mobil text,
  caen text,
  descriere_caen text,
  data_infiintarii date,
  status text NOT NULL DEFAULT 'nou',
  whatsapp_sent_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.firme_noi_whatsapp ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage firme_noi_whatsapp"
ON public.firme_noi_whatsapp
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role full access firme_noi_whatsapp"
ON public.firme_noi_whatsapp
FOR ALL
TO service_role
USING (true) WITH CHECK (true);

CREATE INDEX idx_firme_noi_status ON public.firme_noi_whatsapp(status);
CREATE INDEX idx_firme_noi_judet ON public.firme_noi_whatsapp(judet);

CREATE TRIGGER update_firme_noi_whatsapp_updated_at
BEFORE UPDATE ON public.firme_noi_whatsapp
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
