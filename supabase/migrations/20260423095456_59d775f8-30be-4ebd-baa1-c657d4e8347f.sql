
CREATE OR REPLACE FUNCTION public.increment_wa_message_counters(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today date := current_date;
  v_existing_date date;
BEGIN
  SELECT updated_at::date INTO v_existing_date
  FROM public.wa_bot_status WHERE user_id = p_user_id;

  IF v_existing_date IS NULL THEN
    INSERT INTO public.wa_bot_status (user_id, is_online, last_heartbeat_at, total_messages_today, total_messages_all_time, updated_at)
    VALUES (p_user_id, true, now(), 1, 1, now());
  ELSIF v_existing_date < v_today THEN
    UPDATE public.wa_bot_status
       SET total_messages_today = 1,
           total_messages_all_time = total_messages_all_time + 1,
           is_online = true,
           last_heartbeat_at = now(),
           updated_at = now()
     WHERE user_id = p_user_id;
  ELSE
    UPDATE public.wa_bot_status
       SET total_messages_today = total_messages_today + 1,
           total_messages_all_time = total_messages_all_time + 1,
           is_online = true,
           last_heartbeat_at = now(),
           updated_at = now()
     WHERE user_id = p_user_id;
  END IF;
END;
$$;
