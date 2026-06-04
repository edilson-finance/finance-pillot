-- 0028_add_existing_user_create_profile.sql — vincular conta existente SEM perfil.
-- Caso real: a pessoa tem conta no auth (fez signup) mas nunca concluiu o
-- onboarding, então não tem profile. company_members referencia profiles(id),
-- então o vínculo direto falhava e caía no convite por link — que também não
-- funciona (o /signup recusa "usuário já existe"). Solução: criar o profile na
-- hora (nome vindo do metadata do auth) e então vincular à empresa ativa.

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
