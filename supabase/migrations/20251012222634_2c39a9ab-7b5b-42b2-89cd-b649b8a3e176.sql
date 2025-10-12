-- Update handle_new_user to respect desired subscription_type from metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  desired_type TEXT;
  desired_type_enum public.subscription_type;
  full_name TEXT;
  has_type BOOLEAN;
  terms_ok BOOLEAN;
BEGIN
  full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', '');

  desired_type := COALESCE(
    NEW.raw_user_meta_data->>'subscription_type',
    NEW.raw_user_meta_data->>'desired_subscription_type',
    'entrepreneur'
  );

  has_type := desired_type IN ('entrepreneur','accounting_firm');
  IF has_type THEN
    desired_type_enum := desired_type::public.subscription_type;
  ELSE
    desired_type_enum := 'entrepreneur'::public.subscription_type;
  END IF;

  terms_ok := COALESCE((NEW.raw_user_meta_data->>'terms_accepted')::boolean, false);

  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    trial_ends_at,
    subscription_type,
    account_type_selected,
    terms_accepted,
    terms_accepted_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    full_name,
    NOW() + INTERVAL '3 months',
    desired_type_enum,
    has_type,
    terms_ok,
    CASE WHEN terms_ok THEN NOW() ELSE NULL END
  );
  RETURN NEW;
END;
$$;