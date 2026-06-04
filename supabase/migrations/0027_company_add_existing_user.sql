-- 0027_company_add_existing_user.sql — Convite inteligente: usuário já existente.
-- Quando um admin "convida" por e-mail alguém que JÁ tem conta no sistema (em
-- outra empresa), o fluxo antigo mandava para /signup e o Supabase recusava com
-- "User already registered". Esta função detecta a conta existente pelo e-mail e
-- vincula a pessoa diretamente à empresa ATIVA do admin (company_members), sem
-- precisar criar conta nova. Se não houver conta, devolve 'not_found' para o app
-- cair no fluxo normal de convite por link.

create or replace function public.fn_company_add_existing_user(
  p_email text, p_role public.user_role, p_modules text[] default '{}')
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_company uuid := public.auth_company_id();
  v_uid uuid;
  v_name text;
  v_module text;
begin
  if public.auth_role() not in ('admin','super_admin') then raise exception 'forbidden'; end if;
  if v_company is null then raise exception 'no active company'; end if;
  if coalesce(btrim(p_email), '') = '' then raise exception 'email required'; end if;

  -- Procura conta existente pelo e-mail (case-insensitive).
  select u.id into v_uid from auth.users u
    where lower(u.email) = lower(btrim(p_email)) limit 1;
  if v_uid is null then
    return jsonb_build_object('status', 'not_found');
  end if;

  -- company_members.user_id referencia profiles(id): sem profile não dá para
  -- vincular direto. Cai no fluxo de convite por link.
  if not exists (select 1 from public.profiles where id = v_uid) then
    return jsonb_build_object('status', 'no_profile');
  end if;

  select name into v_name from public.profiles where id = v_uid;

  if exists (select 1 from public.company_members
             where user_id = v_uid and company_id = v_company) then
    return jsonb_build_object('status', 'already_member', 'name', coalesce(v_name, ''));
  end if;

  insert into public.company_members(company_id, user_id, role)
    values (v_company, v_uid, p_role)
    on conflict (company_id, user_id) do update set role = excluded.role;

  -- Se a pessoa não tinha empresa ativa, define esta.
  update public.profiles set company_id = v_company, role = p_role
    where id = v_uid and company_id is null;

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
