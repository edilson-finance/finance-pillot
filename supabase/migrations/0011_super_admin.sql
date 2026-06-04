-- 0011_super_admin.sql — Central Super Admin: leitura de uso + criação/vínculo.
-- Todas as funções são security definer e barram não-super-admin no próprio banco.

-- 1) Visão geral de TODAS as empresas (uma linha por empresa).
create or replace function public.fn_admin_companies_overview()
returns table(
  id uuid,
  name text,
  type text,
  created_at timestamptz,
  user_count int,
  last_sign_in timestamptz,
  last_transaction_at date,
  transaction_count int,
  faturamento numeric,
  despesa numeric,
  saldo numeric,
  a_receber numeric,
  a_pagar numeric,
  customers_count int,
  suppliers_count int,
  products_count int,
  transactions_count int
)
language sql stable security definer set search_path = public as $$
  with ms as (select date_trunc('month', current_date)::date as m0,
                     (date_trunc('month', current_date) + interval '1 month - 1 day')::date as m1)
  select
    c.id,
    c.name,
    c.type::text,
    c.created_at,
    (select count(*) from public.profiles p where p.company_id = c.id)::int as user_count,
    (select max(u.last_sign_in_at) from public.profiles p
       join auth.users u on u.id = p.id where p.company_id = c.id) as last_sign_in,
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
revoke all on function public.fn_admin_companies_overview() from public;
grant execute on function public.fn_admin_companies_overview() to authenticated;

-- 2) Detalhe de UMA empresa: números + usuários. Retorna json.
create or replace function public.fn_admin_company_detail(p_company_id uuid)
returns json
language plpgsql stable security definer set search_path = public as $$
declare v_result json;
begin
  if not public.is_super_admin() then raise exception 'forbidden'; end if;
  select json_build_object(
    'id', c.id,
    'name', c.name,
    'type', c.type::text,
    'created_at', c.created_at,
    'user_count', (select count(*) from public.profiles p where p.company_id = c.id),
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
         'id', p.id, 'name', p.name, 'role', p.role,
         'email', u.email, 'last_sign_in', u.last_sign_in_at
       ) order by p.created_at)
       from public.profiles p join auth.users u on u.id = p.id
       where p.company_id = c.id), '[]'::json)
  ) into v_result
  from public.companies c where c.id = p_company_id;
  if v_result is null then raise exception 'company not found'; end if;
  return v_result;
end $$;
revoke all on function public.fn_admin_company_detail(uuid) from public;
grant execute on function public.fn_admin_company_detail(uuid) to authenticated;

-- 3) Criar uma empresa (sem vincular o chamador). Retorna o id.
-- company_type válido: industria, comercio, servicos, construcao, agro,
-- tecnologia, saude_educacao, misto. Se p_type vier vazio, usa o default da
-- coluna ('construcao').
create or replace function public.fn_admin_create_company(p_name text, p_type text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if not public.is_super_admin() then raise exception 'forbidden'; end if;
  if coalesce(trim(p_name), '') = '' then raise exception 'name required'; end if;
  if coalesce(trim(p_type), '') = '' then
    insert into public.companies(name) values (trim(p_name)) returning id into v_id;
  else
    insert into public.companies(name, type)
      values (trim(p_name), trim(p_type)::public.company_type) returning id into v_id;
  end if;
  return v_id;
end $$;
revoke all on function public.fn_admin_create_company(text, text) from public;
grant execute on function public.fn_admin_create_company(text, text) to authenticated;

-- 4) Vincular/trocar a empresa e o papel de um usuário (modelo 1:1).
create or replace function public.fn_admin_set_user_company(
  p_user_id uuid, p_company_id uuid, p_role public.user_role)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_super_admin() then raise exception 'forbidden'; end if;
  if not exists (select 1 from public.companies where id = p_company_id) then
    raise exception 'company not found';
  end if;
  update public.profiles set company_id = p_company_id, role = p_role
    where id = p_user_id;
  if not found then raise exception 'user not found'; end if;
  if p_role <> 'member' then
    delete from public.member_permissions where user_id = p_user_id;
  end if;
end $$;
revoke all on function public.fn_admin_set_user_company(uuid, uuid, public.user_role) from public;
grant execute on function public.fn_admin_set_user_company(uuid, uuid, public.user_role) to authenticated;

-- 5) Listar TODOS os usuários do sistema com a empresa atual.
create or replace function public.fn_admin_list_users()
returns table(
  id uuid, email text, name text,
  company_id uuid, company_name text,
  role public.user_role, last_sign_in timestamptz
)
language sql stable security definer set search_path = public as $$
  select p.id, u.email::text, p.name, p.company_id, c.name as company_name,
         p.role, u.last_sign_in_at
  from public.profiles p
  join auth.users u on u.id = p.id
  left join public.companies c on c.id = p.company_id
  where public.is_super_admin()
  order by p.created_at desc
$$;
revoke all on function public.fn_admin_list_users() from public;
grant execute on function public.fn_admin_list_users() to authenticated;
