-- 0026_admin_user_companies.sql — Super admin: ver TODAS as empresas de um usuário.
-- fn_admin_list_users mostra só a empresa ATIVA (profiles.company_id). Para o
-- super admin gerenciar os vínculos, precisamos listar todas as participações
-- de company_members por usuário, com o papel em cada empresa e qual é a ativa.

create or replace function public.fn_admin_user_companies(p_user_id uuid)
returns table(company_id uuid, company_name text, role public.user_role, is_active boolean)
language sql stable security definer set search_path = public as $$
  select cm.company_id,
         c.name::text as company_name,
         cm.role,
         (p.company_id = cm.company_id) as is_active
  from public.company_members cm
  join public.companies c on c.id = cm.company_id
  left join public.profiles p on p.id = cm.user_id
  where public.is_super_admin() and cm.user_id = p_user_id
  order by c.name
$$;
revoke all on function public.fn_admin_user_companies(uuid) from public;
grant execute on function public.fn_admin_user_companies(uuid) to authenticated;
