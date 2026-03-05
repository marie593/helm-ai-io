
CREATE TABLE public.customer_goals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.customer_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Vendor staff can manage customer goals"
  ON public.customer_goals FOR ALL
  TO authenticated
  USING (is_vendor_staff(auth.uid()));

CREATE POLICY "Users with customer access can view goals"
  ON public.customer_goals FOR SELECT
  TO authenticated
  USING (has_customer_access(auth.uid(), customer_id));

CREATE TRIGGER update_customer_goals_updated_at
  BEFORE UPDATE ON public.customer_goals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
