-- =====================================================================
-- Multi-empresa (trocador de empresas)
-- Um login pode participar de várias empresas (admin/membro) e alternar
-- entre elas. profiles.company_id passa a ser a "empresa ativa" e
-- profiles.role o papel na empresa ativa (espelho de company_members).
-- auth_company_id()/auth_role() e toda a RLS existente seguem inalterados.
-- =====================================================================

-- 1) Tabela de participações ------------------------------------------
create table if not exists public.company_members (
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id    uuid not null references public.profiles(id)  on delete cascade,
  role       public.user_role not null default 'member',
  created_at timestamptz not null default now(),
  primary key (company_id, user_id)
);

alter table public.company_members enable row level security;

-- Leitura: o próprio usuário, admins da empresa, ou super admin.
drop policy if exists cm_select on public.company_members;
create policy cm_select on public.company_members for select
  using (
    user_id = auth.uid()
    or company_id = public.auth_company_id()
    or public.is_super_admin()
  );
-- Escrita só por RPC (security definer); sem policies de escrita.

-- Backfill: participação atual de cada perfil.
insert into public.company_members (company_id, user_id, role)
select company_id, id, role from public.profiles where company_id is not null
on conflict (company_id, user_id) do nothing;

-- 2) member_permissions por empresa -----------------------------------
alter table public.member_permissions
  add column if not exists company_id uuid references public.companies(id) on delete cascade;

update public.member_permissions mp
  set company_id = p.company_id
  from public.profiles p
  where p.id = mp.user_id and mp.company_id is null;

-- Remove órfãs (perfis sem empresa) que não conseguiram backfill.
delete from public.member_permissions where company_id is null;

alter table public.member_permissions alter column company_id set not null;

alter table public.member_permissions drop constraint if exists member_permissions_pkey;
alter table public.member_permissions
  add constraint member_permissions_pkey primary key (user_id, company_id, module);

-- 3) Trocar de empresa -------------------------------------------------
create or replace function public.fn_switch_company(p_company_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_role public.user_role;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  -- super admin enxerga qualquer empresa e mantém o papel super_admin.
  if public.is_super_admin() then
    update public.profiles set company_id = p_company_id where id = auth.uid();
    return;
  end if;
  select role into v_role from public.company_members
    where user_id = auth.uid() and company_id = p_company_id;
  if v_role is null then raise exception 'forbidden'; end if;
  update public.profiles set company_id = p_company_id, role = v_role where id = auth.uid();
end $$;
revoke all on function public.fn_switch_company(uuid) from public;
grant execute on function public.fn_switch_company(uuid) to authenticated;

-- 4) Vincular usuário a uma empresa (ADICIONA participação) ------------
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
end $$;

-- 5) Desvincular usuário de uma empresa --------------------------------
create or replace function public.fn_admin_unlink_user_company(
  p_user_id uuid, p_company_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_other uuid; v_other_role public.user_role;
begin
  if not public.is_super_admin() then raise exception 'forbidden'; end if;
  delete from public.company_members where user_id = p_user_id and company_id = p_company_id;
  delete from public.member_permissions where user_id = p_user_id and company_id = p_company_id;
  -- Se era a empresa ativa, repontar para outra participação (ou limpar).
  if exists (select 1 from public.profiles where id = p_user_id and company_id = p_company_id) then
    select company_id, role into v_other, v_other_role
      from public.company_members where user_id = p_user_id limit 1;
    if v_other is null then
      update public.profiles set company_id = null where id = p_user_id;
    else
      update public.profiles set company_id = v_other, role = v_other_role where id = p_user_id;
    end if;
  end if;
end $$;
revoke all on function public.fn_admin_unlink_user_company(uuid, uuid) from public;
grant execute on function public.fn_admin_unlink_user_company(uuid, uuid) to authenticated;

-- 6) Permissões de módulo por empresa ativa ----------------------------
create or replace function public.set_member_permissions(p_user_id uuid, p_modules text[])
returns void language plpgsql security definer set search_path = public as $$
declare v_company uuid := public.auth_company_id(); v_module text;
begin
  if public.auth_role() not in ('admin','super_admin') then raise exception 'forbidden'; end if;
  if v_company is null then raise exception 'no active company'; end if;
  if not public.is_super_admin()
     and not exists (select 1 from public.company_members
                     where user_id = p_user_id and company_id = v_company)
  then raise exception 'forbidden'; end if;
  delete from public.member_permissions where user_id = p_user_id and company_id = v_company;
  foreach v_module in array p_modules loop
    insert into public.member_permissions(user_id, company_id, module, allowed)
      values (p_user_id, v_company, v_module, true)
      on conflict (user_id, company_id, module) do update set allowed = true;
  end loop;
end $$;

-- 7) Mudar papel do usuário na empresa ativa ---------------------------
create or replace function public.set_user_role(p_user_id uuid, p_role public.user_role)
returns void language plpgsql security definer set search_path = public as $$
declare v_caller public.user_role := public.auth_role();
        v_company uuid := public.auth_company_id();
begin
  if v_caller not in ('admin','super_admin') then raise exception 'forbidden'; end if;
  if v_company is null then raise exception 'no active company'; end if;
  if not exists (select 1 from public.company_members
                 where user_id = p_user_id and company_id = v_company)
  then raise exception 'user not found'; end if;
  if not public.is_super_admin() and p_role = 'super_admin' then
    raise exception 'cannot grant super_admin';
  end if;
  if p_user_id = auth.uid() and p_role <> v_caller then
    raise exception 'cannot change your own role';
  end if;
  update public.company_members set role = p_role
    where user_id = p_user_id and company_id = v_company;
  -- Espelha no profile se a empresa ativa do alvo for esta.
  update public.profiles set role = p_role
    where id = p_user_id and company_id = v_company;
  if p_role <> 'member' then
    delete from public.member_permissions where user_id = p_user_id and company_id = v_company;
  end if;
end $$;

-- 8) Remover usuário da empresa ativa ----------------------------------
create or replace function public.remove_company_user(p_user_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_company uuid := public.auth_company_id();
        v_target_role public.user_role; v_admin_count int;
        v_other uuid; v_other_role public.user_role;
begin
  if public.auth_role() not in ('admin','super_admin') then raise exception 'forbidden'; end if;
  if v_company is null then raise exception 'no active company'; end if;
  if p_user_id = auth.uid() then raise exception 'cannot remove yourself'; end if;
  select role into v_target_role from public.company_members
    where user_id = p_user_id and company_id = v_company;
  if v_target_role is null then raise exception 'user not found'; end if;
  if v_target_role in ('admin','super_admin') then
    select count(*) into v_admin_count from public.company_members
      where company_id = v_company and role in ('admin','super_admin');
    if v_admin_count <= 1 then raise exception 'cannot remove the last admin'; end if;
  end if;
  delete from public.company_members where user_id = p_user_id and company_id = v_company;
  delete from public.member_permissions where user_id = p_user_id and company_id = v_company;
  -- Se era a empresa ativa do alvo, repontar ou apagar o perfil se não sobrar nada.
  if exists (select 1 from public.profiles where id = p_user_id and company_id = v_company) then
    select company_id, role into v_other, v_other_role
      from public.company_members where user_id = p_user_id limit 1;
    if v_other is null then
      delete from public.profiles where id = p_user_id;
    else
      update public.profiles set company_id = v_other, role = v_other_role where id = p_user_id;
    end if;
  end if;
end $$;

-- 9) Aceitar convite (cria perfil OU adiciona participação) ------------
create or replace function public.accept_invite(p_token text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_invite public.invites; v_uid uuid := auth.uid();
        v_email text; v_name text; v_module text; v_has_profile boolean;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  select * into v_invite from public.invites
    where token = p_token and status = 'pending' and expires_at > now();
  if v_invite.id is null then raise exception 'invite invalid or expired'; end if;
  select email, coalesce(raw_user_meta_data->>'name','')
    into v_email, v_name from auth.users where id = v_uid;
  if lower(v_email) <> lower(v_invite.email) then raise exception 'invite email mismatch'; end if;

  v_has_profile := exists (select 1 from public.profiles where id = v_uid);
  if not v_has_profile then
    insert into public.profiles(id, company_id, name, role)
      values (v_uid, v_invite.company_id, v_name, v_invite.role);
  end if;

  insert into public.company_members(company_id, user_id, role)
    values (v_invite.company_id, v_uid, v_invite.role)
    on conflict (company_id, user_id) do update set role = excluded.role;

  if v_invite.role = 'member' then
    foreach v_module in array v_invite.modules loop
      insert into public.member_permissions(user_id, company_id, module, allowed)
        values (v_uid, v_invite.company_id, v_module, true)
        on conflict (user_id, company_id, module) do update set allowed = true;
    end loop;
  end if;

  update public.invites set status = 'accepted' where id = v_invite.id;
  return v_invite.company_id;
end $$;

-- 10) Listar usuários da EMPRESA ATIVA (participações), papel de company_members
-- Antes lia profiles.company_id, o que escondia membros cuja empresa ativa fosse
-- outra. Agora a fonte é company_members, escopada à empresa ativa do chamador.
create or replace function public.fn_company_users()
returns table(id uuid, name text, role public.user_role, email text,
              active boolean, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select p.id, p.name, cm.role, u.email::text, p.active, p.created_at
  from public.company_members cm
  join public.profiles p on p.id = cm.user_id
  join auth.users u on u.id = p.id
  where cm.company_id = public.auth_company_id()
  order by p.created_at
$$;

-- 11) RLS de member_permissions por company_id da própria linha ---------
-- As policies antigas escopavam pela empresa ATIVA do usuário-alvo
-- (profiles.company_id), escondendo/expondo linhas de forma errada agora
-- que cada permissão pertence a uma empresa. Reescopar pelo company_id da
-- própria linha mantém o isolamento por empresa ativa do chamador.
drop policy if exists mp_select on public.member_permissions;
create policy mp_select on public.member_permissions for select
  using (company_id = public.auth_company_id() or public.is_super_admin());

drop policy if exists mp_write on public.member_permissions;
create policy mp_write on public.member_permissions for all
  using (
    public.is_super_admin()
    or (public.auth_role() in ('admin','super_admin')
        and company_id = public.auth_company_id())
  )
  with check (
    public.is_super_admin()
    or (public.auth_role() in ('admin','super_admin')
        and company_id = public.auth_company_id())
  );

-- 12) Detalhe da empresa (admin) por participações (company_members) ----
-- user_count e lista de usuários passam a refletir company_members, com o
-- papel da participação naquela empresa (não profiles.role da empresa ativa).
create or replace function public.fn_admin_company_detail(p_company_id uuid)
returns json language plpgsql stable security definer set search_path = public as $$
declare v_result json;
begin
  if not public.is_super_admin() then raise exception 'forbidden'; end if;
  select json_build_object(
    'id', c.id,
    'name', c.name,
    'type', c.type::text,
    'created_at', c.created_at,
    'user_count', (select count(*) from public.company_members m where m.company_id = c.id),
    'transaction_count', (select count(*) from public.transactions t where t.company_id = c.id),
    'last_transaction_at', (select max(t.date) from public.transactions t where t.company_id = c.id),
    'a_receber', coalesce((select sum(r.amount) from public.receivables r
        where r.company_id = c.id and r.status <> 'recebido'), 0),
    'a_pagar', coalesce((select sum(pp.amount) from public.payables pp
        where pp.company_id = c.id and pp.status <> 'pago'), 0),
    'saldo', (coalesce((select sum(a.opening_balance) from public.accounts a where a.company_id = c.id), 0)
        + coalesce((select sum(case when t.type='entrada' then t.amount else -t.amount end)
                    from public.transactions t where t.company_id = c.id), 0)),
    'users', coalesce((
       select json_agg(json_build_object(
         'id', p.id, 'name', p.name, 'role', m.role,
         'email', u.email, 'last_sign_in', u.last_sign_in_at
       ) order by p.created_at)
       from public.company_members m
       join public.profiles p on p.id = m.user_id
       join auth.users u on u.id = p.id
       where m.company_id = c.id), '[]'::json)
  ) into v_result
  from public.companies c where c.id = p_company_id;
  if v_result is null then raise exception 'company not found'; end if;
  return v_result;
end $$;

-- 13) Overview do admin: user_count e last_sign_in por participações -----
create or replace function public.fn_admin_companies_overview()
returns table(id uuid, name text, type text, created_at timestamptz, user_count integer,
  last_sign_in timestamptz, last_transaction_at date, transaction_count integer,
  faturamento numeric, despesa numeric, saldo numeric, a_receber numeric, a_pagar numeric,
  customers_count integer, suppliers_count integer, products_count integer, transactions_count integer)
language sql stable security definer set search_path = public as $$
  with ms as (select date_trunc('month', current_date)::date as m0,
                     (date_trunc('month', current_date) + interval '1 month - 1 day')::date as m1)
  select
    c.id,
    c.name,
    c.type::text,
    c.created_at,
    (select count(*) from public.company_members m where m.company_id = c.id)::int as user_count,
    (select max(u.last_sign_in_at) from public.company_members m
       join auth.users u on u.id = m.user_id where m.company_id = c.id) as last_sign_in,
    (select max(t.date) from public.transactions t where t.company_id = c.id) as last_transaction_at,
    (select count(*) from public.transactions t where t.company_id = c.id)::int as transaction_count,
    coalesce((select sum(t.amount) from public.transactions t, ms
       where t.company_id = c.id and t.type = 'entrada' and t.date between ms.m0 and ms.m1), 0) as faturamento,
    coalesce((select sum(t.amount) from public.transactions t, ms
       where t.company_id = c.id and t.type = 'saida' and t.date between ms.m0 and ms.m1), 0) as despesa,
    (coalesce((select sum(a.opening_balance) from public.accounts a where a.company_id = c.id), 0)
       + coalesce((select sum(case when t.type='entrada' then t.amount else -t.amount end)
                   from public.transactions t where t.company_id = c.id), 0)) as saldo,
    coalesce((select sum(r.amount) from public.receivables r
       where r.company_id = c.id and r.status <> 'recebido'), 0) as a_receber,
    coalesce((select sum(pp.amount) from public.payables pp
       where pp.company_id = c.id and pp.status <> 'pago'), 0) as a_pagar,
    (select count(*) from public.customers x where x.company_id = c.id)::int as customers_count,
    (select count(*) from public.suppliers x where x.company_id = c.id)::int as suppliers_count,
    (select count(*) from public.products x where x.company_id = c.id)::int as products_count,
    (select count(*) from public.transactions x where x.company_id = c.id)::int as transactions_count
  from public.companies c
  where public.is_super_admin()
  order by c.created_at desc
$$;

-- 14) RLS de companies: permitir ver empresas das quais participa --------
-- Sem isto, o seletor de empresas não consegue ler o nome das empresas em
-- que o usuário participa mas não é a ativa (companies_select só liberava a
-- empresa ativa). Mantém a leitura da ativa e o acesso de super admin.
drop policy if exists companies_select on public.companies;
create policy companies_select on public.companies for select
  using (
    id = public.auth_company_id()
    or public.is_super_admin()
    or exists (select 1 from public.company_members m
               where m.company_id = companies.id and m.user_id = auth.uid())
  );
