-- Permite que o super admin renomeie uma empresa pelo painel.
create or replace function public.fn_admin_update_company(p_company_id uuid, p_name text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_super_admin() then raise exception 'forbidden'; end if;
  if coalesce(trim(p_name), '') = '' then raise exception 'name required'; end if;
  update public.companies set name = trim(p_name) where id = p_company_id;
  if not found then raise exception 'company not found'; end if;
end $$;
revoke all on function public.fn_admin_update_company(uuid, text) from public;
grant execute on function public.fn_admin_update_company(uuid, text) to authenticated;
