-- 0004_auth_helpers.sql — RLS helper functions (security definer, stable)
create or replace function public.auth_company_id() returns uuid
language sql stable security definer set search_path = public as $$
  select company_id from public.profiles where id = auth.uid()
$$;

create or replace function public.auth_role() returns public.user_role
language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.is_super_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select role = 'super_admin' from public.profiles where id = auth.uid()), false)
$$;

-- Admin/super_admin: full module access. Member: only modules explicitly allowed.
create or replace function public.has_module_access(p_module text) returns boolean
language sql stable security definer set search_path = public as $$
  select case
    when public.auth_role() in ('super_admin','admin') then true
    else coalesce(
      (select allowed from public.member_permissions
       where user_id = auth.uid() and module = p_module), false)
  end
$$;
