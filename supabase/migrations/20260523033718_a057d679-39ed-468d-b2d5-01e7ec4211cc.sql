
-- 1. Add cpf column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS cpf text UNIQUE;

-- 2. Create invoices table
CREATE TABLE IF NOT EXISTS public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  stripe_invoice_id text UNIQUE,
  amount integer NOT NULL,
  currency text NOT NULL DEFAULT 'brl',
  status text NOT NULL,
  invoice_pdf text,
  hosted_invoice_url text,
  period_start timestamptz,
  period_end timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON public.invoices(user_id);

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own invoices" ON public.invoices
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Admins view all invoices" ON public.invoices
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- 3. Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
