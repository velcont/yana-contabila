-- Extinde funcția generate_proactive_insights cu noi verificări automate
CREATE OR REPLACE FUNCTION public.generate_proactive_insights()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  indicators JSONB;
  dso_value NUMERIC;
  dpo_value NUMERIC;
  ebitda_value NUMERIC;
  profit_value NUMERIC;
  ca_value NUMERIC;
  cheltuieli_value NUMERIC;
  casa_value NUMERIC;
  clienti_value NUMERIC;
  furnizori_value NUMERIC;
  dio_value NUMERIC;
BEGIN
  -- Extrage indicatori din metadata
  indicators := NEW.metadata;
  
  -- Verifică DSO ridicat
  IF indicators ? 'dso' THEN
    dso_value := (indicators->>'dso')::NUMERIC;
    IF dso_value > 60 THEN
      INSERT INTO public.chat_insights (user_id, insight_type, title, description, severity, analysis_id, metadata)
      VALUES (
        NEW.user_id,
        'high_dso',
        'DSO Ridicat Detectat',
        'DSO-ul tău de ' || dso_value || ' zile depășește pragul recomandat. Banii sunt blocați în creanțe.',
        'warning',
        NEW.id,
        jsonb_build_object('dso', dso_value, 'threshold', 60)
      );
    END IF;
  END IF;
  
  -- Verifică EBITDA negativ
  IF indicators ? 'ebitda' THEN
    ebitda_value := (indicators->>'ebitda')::NUMERIC;
    IF ebitda_value < 0 THEN
      INSERT INTO public.chat_insights (user_id, insight_type, title, description, severity, analysis_id, metadata)
      VALUES (
        NEW.user_id,
        'negative_ebitda',
        'EBITDA Negativ - Pierderi Operaționale',
        'EBITDA-ul negativ de ' || ebitda_value || ' RON indică pierderi la nivel operațional.',
        'critical',
        NEW.id,
        jsonb_build_object('ebitda', ebitda_value)
      );
    END IF;
  END IF;
  
  -- Verifică profit negativ
  IF indicators ? 'profit' THEN
    profit_value := (indicators->>'profit')::NUMERIC;
    IF profit_value < 0 THEN
      INSERT INTO public.chat_insights (user_id, insight_type, title, description, severity, analysis_id, metadata)
      VALUES (
        NEW.user_id,
        'negative_profit',
        'Profit Negativ Detectat',
        'Pierderile de ' || ABS(profit_value) || ' RON necesită atenție urgentă.',
        'critical',
        NEW.id,
        jsonb_build_object('profit', profit_value)
      );
    END IF;
  END IF;
  
  -- NOUĂ: Verifică cheltuieli > venituri (pierdere garantată)
  IF indicators ? 'ca' AND indicators ? 'cheltuieli' THEN
    ca_value := (indicators->>'ca')::NUMERIC;
    cheltuieli_value := (indicators->>'cheltuieli')::NUMERIC;
    IF cheltuieli_value > ca_value THEN
      INSERT INTO public.chat_insights (user_id, insight_type, title, description, severity, analysis_id, metadata)
      VALUES (
        NEW.user_id,
        'expenses_exceed_revenue',
        '🔴 Pierdere Garantată',
        'Cheltuielile (' || cheltuieli_value::TEXT || ' RON) depășesc veniturile (' || ca_value::TEXT || ' RON). Situație critică!',
        'critical',
        NEW.id,
        jsonb_build_object('ca', ca_value, 'cheltuieli', cheltuieli_value, 'pierdere', cheltuieli_value - ca_value)
      );
    END IF;
  END IF;
  
  -- NOUĂ: Verifică cash flow negativ (creanțe < datorii)
  IF indicators ? 'clienti' AND indicators ? 'furnizori' THEN
    clienti_value := (indicators->>'clienti')::NUMERIC;
    furnizori_value := (indicators->>'furnizori')::NUMERIC;
    IF clienti_value < furnizori_value AND furnizori_value > 0 THEN
      INSERT INTO public.chat_insights (user_id, insight_type, title, description, severity, analysis_id, metadata)
      VALUES (
        NEW.user_id,
        'negative_cash_flow',
        '⚠️ Risc Cash Flow',
        'Creanțe clienți (' || clienti_value::TEXT || ' RON) < Datorii furnizori (' || furnizori_value::TEXT || ' RON). Riscați să nu aveți bani pentru plăți.',
        'warning',
        NEW.id,
        jsonb_build_object('clienti', clienti_value, 'furnizori', furnizori_value)
      );
    END IF;
  END IF;
  
  -- NOUĂ: Verifică plafonul casei depășit (NELEGAL)
  IF indicators ? 'casa' THEN
    casa_value := (indicators->>'casa')::NUMERIC;
    IF casa_value > 50000 THEN
      INSERT INTO public.chat_insights (user_id, insight_type, title, description, severity, analysis_id, metadata)
      VALUES (
        NEW.user_id,
        'casa_limit_exceeded',
        '⛔ NELEGAL: Plafon Casă Depășit',
        'Aveți ' || casa_value::TEXT || ' RON în casă. Maximum legal: 50.000 RON. Riscați amenzi!',
        'critical',
        NEW.id,
        jsonb_build_object('casa', casa_value, 'plafon', 50000, 'depasire', casa_value - 50000)
      );
    END IF;
  END IF;
  
  -- NOUĂ: Verifică stocuri cu rotație lentă (DIO mare)
  IF indicators ? 'dio' THEN
    dio_value := (indicators->>'dio')::NUMERIC;
    IF dio_value > 180 THEN
      INSERT INTO public.chat_insights (user_id, insight_type, title, description, severity, analysis_id, metadata)
      VALUES (
        NEW.user_id,
        'slow_inventory',
        '🔴 Stocuri cu Mișcare Lentă',
        'Stocurile stau ' || dio_value::TEXT || ' zile în depozit (DIO). Risc de depreciere și costuri mari de depozitare.',
        'critical',
        NEW.id,
        jsonb_build_object('dio', dio_value, 'threshold', 180)
      );
    ELSIF dio_value > 90 THEN
      INSERT INTO public.chat_insights (user_id, insight_type, title, description, severity, analysis_id, metadata)
      VALUES (
        NEW.user_id,
        'slow_inventory',
        '⚠️ Rotație Stocuri Lentă',
        'Stocurile stau ' || dio_value::TEXT || ' zile în depozit. Optimizați gestionarea stocurilor.',
        'warning',
        NEW.id,
        jsonb_build_object('dio', dio_value, 'threshold', 90)
      );
    END IF;
  END IF;
  
  -- NOUĂ: Verifică DPO foarte scăzut (plătim prea repede)
  IF indicators ? 'dpo' THEN
    dpo_value := (indicators->>'dpo')::NUMERIC;
    IF dpo_value < 30 AND dpo_value > 0 THEN
      INSERT INTO public.chat_insights (user_id, insight_type, title, description, severity, analysis_id, metadata)
      VALUES (
        NEW.user_id,
        'low_dpo',
        '💡 Oportunitate: DPO Scăzut',
        'Plătiți furnizorii în ' || dpo_value::TEXT || ' zile. Negociați termene mai lungi (45-60 zile) pentru a îmbunătăți cash flow-ul.',
        'info',
        NEW.id,
        jsonb_build_object('dpo', dpo_value, 'recomandat', '45-60')
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;