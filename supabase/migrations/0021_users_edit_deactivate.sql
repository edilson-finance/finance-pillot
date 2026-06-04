-- 0021_users_edit_deactivate.sql — edição de nome e ativação/desativação de usuários
-- Admins podem editar o nome e desativar/reativar usuários da própria empresa.
-- Usuário desativado mantém o cadastro, mas é bloqueado no acesso (ver lib/auth.ts).

-- Coluna de status. Default true para não afetar usuários existentes.
alter table public.profiles add column if not exists active boolean not null default true;

-- Passa a expor o status na listagem da empresa.
-- Drop necessário: o tipo de retorno mudou (nova coluna active).
drop function if exists public.fn_company_users();
create or replace function public.fn_company_users()
returns table(id uuid, name text, role public.user_role, email text, active boolean, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select p.id, p.name, p.role, u.email::text, p.active, p.created_at
  from public.profiles p
  join auth.users u on u.id = p.id
  where public.is_super_admin() or p.company_id = public.auth_company_id()
  order by p.created_at
$$;
revoke all on function public.fn_company_users() from public;
grant execute on function public.fn_company_users() to authenticated;

-- Admin edita o nome de um usuário da própria empresa.
create or replace function public.set_user_name(p_user_id uuid, p_name text)
returns void language plpgsql security definer set search_path = public as $$
declare v_target_company uuid; v_name text := btrim(coalesce(p_name, ''));
begin
  if public.auth_role() not in ('admin','super_admin') then raise exception 'forbidden'; end if;
  if v_name = '' then raise exception 'nome não pode ser vazio'; end if;
  if length(v_name) > 120 then raise exception 'nome muito longo'; end if;
  select company_id into v_target_company from public.profiles where id = p_user_id;
  if v_target_company is null then raise exception 'user not found'; end if;
  if not public.is_super_admin() and v_target_company <> public.auth_company_id() then
    raise exception 'forbidden';
  end if;
  update public.profiles set name = v_name, updated_at = now() where id = p_user_id;
end $$;
revoke all on function public.set_user_name(uuid, text) from public;
grant execute on function public.set_user_name(uuid, text) to authenticated;

-- Admin ativa/desativa um usuário da própria empresa. Não pode desativar a si
-- mesmo nem o último admin/super_admin ativo da empresa.
create or replace function public.set_user_active(p_user_id uuid, p_active boolean)
returns void language plpgsql security definer set search_path = public as $$
declare v_target_company uuid; v_target_role public.user_role; v_active_admins int;
begin
  if public.auth_role() not in ('admin','super_admin') then raise exception 'forbidden'; end if;
  select company_id, role into v_target_company, v_target_role
    from public.profiles where id = p_user_id;
  if v_target_company is null then raise exception 'user not found'; end if;
  if not public.is_super_admin() and v_target_company <> public.auth_company_id() then
    raise exception 'forbidden';
  end if;
  if p_active = false then
    if p_user_id = auth.uid() then raise exception 'cannot deactivate yourself'; end if;
    if v_target_role in ('admin','super_admin') then
      select count(*) into v_active_admins from public.profiles
        where company_id = v_target_company and role in ('admin','super_admin') and active = true;
      if v_active_admins <= 1 then raise exception 'cannot deactivate the last admin'; end if;
    end if;
  end if;
  update public.profiles set active = p_active, updated_at = now() where id = p_user_id;
end $$;
revoke all on function public.set_user_active(uuid, boolean) from public;
grant execute on function public.set_user_active(uuid, boolean) to authenticated;
