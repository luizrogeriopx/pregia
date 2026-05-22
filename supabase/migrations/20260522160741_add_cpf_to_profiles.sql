-- Add CPF column to profiles table
ALTER TABLE public.profiles ADD COLUMN cpf TEXT;

-- Add UNIQUE constraint to profiles.cpf
ALTER TABLE public.profiles ADD CONSTRAINT profiles_cpf_key UNIQUE (cpf);

-- Recreate trigger function to capture CPF from user metadata on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- Extract CPF and check if it already exists to prevent duplicate account abuse
  IF NEW.raw_user_meta_data->>'cpf' IS NULL OR NEW.raw_user_meta_data->>'cpf' = '' THEN
    -- In case of OAuth or older signups, we can allow null, but standard signups will require it
    NULL;
  ELSE
    IF EXISTS (SELECT 1 FROM public.profiles WHERE cpf = NEW.raw_user_meta_data->>'cpf') THEN
      RAISE EXCEPTION 'Este CPF já está cadastrado em outra conta.';
    END IF;
  END IF;

  INSERT INTO public.profiles (id, email, full_name, avatar_url, cpf)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.raw_user_meta_data->>'cpf'
  );

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');

  INSERT INTO public.subscriptions (user_id, plan, status)
  VALUES (NEW.id, 'free', 'active');

  RETURN NEW;
END;
$$;
