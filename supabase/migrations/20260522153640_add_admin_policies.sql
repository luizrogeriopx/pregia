-- Enable Admin write permissions for Profiles
CREATE POLICY "Admins update all profiles" ON public.profiles
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Enable Admin write permissions for Subscriptions
CREATE POLICY "Admins update all subscriptions" ON public.subscriptions
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Enable Admin write/delete permissions for Sermons
CREATE POLICY "Admins update all sermons" ON public.sermons
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete all sermons" ON public.sermons
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
