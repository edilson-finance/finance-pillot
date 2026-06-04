-- =====================================================================
-- Onboarding multi-empresa: ao criar empresa + perfil no onboarding,
-- registrar também a participação em company_members (fonte de verdade
-- das participações). Sem isto, o usuário recém-criado ficaria sem
-- participação ativa (seletor de empresas vazio, fora de fn_company_users).
-- =====================================================================

create or replace function public.create_company_and_profile(
  p_name text, p_type public.company_type, p_user_name text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_company uuid;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  if exists (select 1 from public.profiles where id = auth.uid()) then
    raise exception 'profile already exists';
  end if;
  insert into public.companies(name, type) values (p_name, p_type) returning id into v_company;
  insert into public.profiles(id, company_id, name, role)
    values (auth.uid(), v_company, coalesce(p_user_name, ''), 'admin');
  insert into public.company_members(company_id, user_id, role)
    values (v_company, auth.uid(), 'admin')
    on conflict (company_id, user_id) do nothing;
  return v_company;
end $$;
