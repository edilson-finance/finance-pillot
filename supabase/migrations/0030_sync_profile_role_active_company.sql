-- 0030_sync_profile_role_active_company.sql
-- Bug: usuário travado em /no-access ("Sem módulos liberados").
--
-- profiles.role é um cache denormalizado do papel do usuário na EMPRESA ATIVA
-- (profiles.company_id). O middleware lê profiles.role para liberar/bloquear
-- módulos. A fonte de verdade é company_members.role por empresa.
--
-- As RPCs fn_company_add_existing_user e fn_admin_set_user_company só
-- sincronizavam profiles.role quando company_id ERA NULL (primeiro vínculo).
-- Se o usuário já tinha empresa ativa e era promovido/alterado nessa mesma
-- empresa, o company_members virava 'admin' mas o profiles.role ficava preso
-- em 'member' — e, sem linhas em member_permissions, o middleware mandava para
-- /no-access. Pior: o único reparo (fn_switch_company) é inalcançável porque a
-- pessoa não passa do /no-access. Deadlock.
--
-- set_user_role já fazia o espelhamento correto (atualiza profiles.role quando
-- a empresa modificada é a ativa). Esta migração:
--   1) repara o desvio existente nos dados;
--   2) aplica o mesmo espelhamento nas duas RPCs de vínculo.

-- 1) Reparo de dados: alinhar profiles.role ao papel da empresa ativa ----------
--    (super_admin é preservado — seu papel não depende de company_members).
update public.profiles p
set role = cm.role
from public.company_members cm
where cm.user_id = p.id
  and cm.company_id = p.company_id
  and p.role is distinct from cm.role
  and p.role <> 'super_admin';

-- 2) fn_company_add_existing_user: espelhar role na empresa ativa ---------------
create or replace function public.fn_company_add_existing_user(
  p_email text, p_role public.user_role, p_modules text[] default '{}')
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_company uuid := public.auth_company_id();
  v_uid uuid;
  v_meta_name text;
  v_name text;
  v_module text;
begin
  if public.auth_role() not in ('admin','super_admin') then raise exception 'forbidden'; end if;
  if v_company is null then raise exception 'no active company'; end if;
  if coalesce(btrim(p_email), '') = '' then raise exception 'email required'; end if;

  -- Procura conta existente pelo e-mail (case-insensitive) e o nome do metadata.
  select u.id, coalesce(u.raw_user_meta_data->>'name', '')
    into v_uid, v_meta_name
    from auth.users u
    where lower(u.email) = lower(btrim(p_email)) limit 1;
  if v_uid is null then
    return jsonb_build_object('status', 'not_found');
  end if;

  -- Garante um profile: se a conta nunca concluiu o onboarding, cria agora com
  -- esta empresa como ativa (sem isso, o vínculo em company_members falha na FK).
  if not exists (select 1 from public.profiles where id = v_uid) then
    insert into public.profiles(id, company_id, name, role)
      values (v_uid, v_company, v_meta_name, p_role);
    v_name := v_meta_name;
  else
    select name into v_name from public.profiles where id = v_uid;
  end if;

  if exists (select 1 from public.company_members
             where user_id = v_uid and company_id = v_company) then
    return jsonb_build_object('status', 'already_member', 'name', coalesce(v_name, ''));
  end if;

  insert into public.company_members(company_id, user_id, role)
    values (v_company, v_uid, p_role)
    on conflict (company_id, user_id) do update set role = excluded.role;

  -- Se a pessoa ainda não tinha empresa ativa, define esta.
  update public.profiles set company_id = v_company, role = p_role
    where id = v_uid and company_id is null;
  -- Espelha profiles.role se a empresa vinculada já for a ativa do usuário.
  update public.profiles set role = p_role
    where id = v_uid and company_id = v_company;

  -- Permissões de módulo (apenas para membro).
  if p_role = 'member' then
    delete from public.member_permissions where user_id = v_uid and company_id = v_company;
    foreach v_module in array coalesce(p_modules, '{}') loop
      insert into public.member_permissions(user_id, company_id, module, allowed)
        values (v_uid, v_company, v_module, true)
        on conflict (user_id, company_id, module) do update set allowed = true;
    end loop;
  end if;

  return jsonb_build_object('status', 'added', 'name', coalesce(v_name, ''));
end $$;
revoke all on function public.fn_company_add_existing_user(text, public.user_role, text[]) from public;
grant execute on function public.fn_company_add_existing_user(text, public.user_role, text[]) to authenticated;

-- 3) fn_admin_set_user_company: espelhar role na empresa ativa ------------------
create or replace function public.fn_admin_set_user_company(
  p_user_id uuid, p_company_id uuid, p_role public.user_role)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_super_admin() then raise exception 'forbidden'; end if;
  if not exists (select 1 from public.companies where id = p_company_id) then
    raise exception 'company not found';
  end if;
  if not exists (select 1 from public.profiles where id = p_user_id) then
    raise exception 'user not found';
  end if;
  insert into public.company_members (company_id, user_id, role)
    values (p_company_id, p_user_id, p_role)
    on conflict (company_id, user_id) do update set role = excluded.role;
  -- Se o usuário ainda não tem empresa ativa, define esta.
  update public.profiles set company_id = p_company_id, role = p_role
    where id = p_user_id and company_id is null;
  -- Espelha profiles.role se a empresa alterada já for a ativa do usuário.
  update public.profiles set role = p_role
    where id = p_user_id and company_id = p_company_id;
end $$;
