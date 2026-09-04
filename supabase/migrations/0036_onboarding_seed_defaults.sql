-- 0036_onboarding_seed_defaults.sql
--
-- [UX/ALTO] Onboarding sem parede. Antes, `create_company_and_profile` criava só
-- empresa+perfil+participação e NÃO semeava nada — mas o formulário de lançamento
-- exige categoria + conta + centro de custo. Resultado: o usuário recém-criado
-- caía num app vazio e não conseguia fazer o 1º lançamento sem descobrir e
-- preencher 3 cadastros. Agora a RPC também semeia o plano de categorias padrão
-- (fn_seed_default_categories, que já existia mas só rodava por um botão manual),
-- uma conta "Caixa" e um centro de custo "Geral".
--
-- Os seeds ficam num bloco com EXCEPTION: se algum falhar, o onboarding
-- (empresa+perfil+participação) continua válido — nunca trava o cadastro.

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

  -- Seeds de primeiro uso (best-effort: nunca quebram o cadastro da empresa).
  begin
    perform public.fn_seed_default_categories(v_company);
    insert into public.accounts(company_id, name, kind)
      values (v_company, 'Caixa', 'corrente');
    insert into public.cost_centers(company_id, name)
      values (v_company, 'Geral');
  exception when others then
    null;
  end;

  return v_company;
end $$;
