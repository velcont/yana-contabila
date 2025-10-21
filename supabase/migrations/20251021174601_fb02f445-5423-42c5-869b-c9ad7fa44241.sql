-- Fix migration: use proper EXECUTE quoting in DO blocks

-- 1) Ensure the default on profiles is 30 days
ALTER TABLE public.profiles 
  ALTER COLUMN trial_ends_at SET DEFAULT (NOW() + INTERVAL '30 days');

-- 2) Align companies table default to 30 days (if used for trials)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'companies' AND column_name = 'trial_ends_at'
  ) THEN
    EXECUTE 'ALTER TABLE public.companies ALTER COLUMN trial_ends_at SET DEFAULT (NOW() + INTERVAL ''30 days'')';
  END IF;
END $$;

-- 3) Update handle_new_user() to set 30 days instead of 3 months
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
    NOW() + INTERVAL '30 days',
    desired_type_enum,
    has_type,
    terms_ok,
    CASE WHEN terms_ok THEN NOW() ELSE NULL END
  );
  RETURN NEW;
END;
$function$;

-- 4) Fix existing records that still have 3 months (or >35 days) trials
UPDATE public.profiles p
SET trial_ends_at = p.created_at + INTERVAL '30 days'
WHERE p.trial_ends_at IS NOT NULL
  AND p.created_at IS NOT NULL
  AND p.trial_ends_at > p.created_at + INTERVAL '35 days'
  AND COALESCE(p.subscription_status, 'inactive') != 'active';

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'companies' AND column_name = 'trial_ends_at'
  ) THEN
    EXECUTE 'UPDATE public.companies SET trial_ends_at = created_at + INTERVAL ''30 days''
      WHERE trial_ends_at IS NOT NULL
        AND created_at IS NOT NULL
        AND trial_ends_at > created_at + INTERVAL ''35 days''
        AND COALESCE(subscription_status, ''inactive'') != ''active''';
  END IF;
END $$;