INSERT INTO public.user_roles (user_id, role)
VALUES ('cf691854-b583-4e22-8a46-e3123ba9576d', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;

UPDATE public.subscriptions
SET plan = 'pro', status = 'active', updated_at = now()
WHERE user_id = 'cf691854-b583-4e22-8a46-e3123ba9576d';