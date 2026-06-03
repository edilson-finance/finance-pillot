-- 0006_registers.sql — 7 cadastro tables + RLS (module 'registers')
-- All tables: company_id defaults to auth_company_id() so clients never send it.

-- helper: apply the standard registers RLS to a table
create or replace function public._mk_registers_rls(p_table text)
returns void language plpgsql as $$
begin
  execute format($f$
    create policy "%1$s_select" on public.%1$s for select
      using ( public.is_super_admin()
              or (company_id = public.auth_company_id() and public.has_module_access('registers')) );
    create policy "%1$s_insert" on public.%1$s for insert
      with check ( company_id = public.auth_company_id() and public.has_module_access('registers') );
    create policy "%1$s_update" on public.%1$s for update
      using ( company_id = public.auth_company_id() and public.has_module_access('registers') )
      with check ( company_id = public.auth_company_id() and public.has_module_access('registers') );
    create policy "%1$s_delete" on public.%1$s for delete
      using ( company_id = public.auth_company_id() and public.has_module_access('registers') );
  $f$, p_table);
end $$;

-- 1) customers
create table public.customers (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null default public.auth_company_id() references public.companies(id) on delete cascade,
  name text not null,
  document text,
  email text,
  phone text,
  status text not null default 'ativo',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.customers enable row level security;
create index customers_company_id_idx on public.customers(company_id);
create trigger customers_set_updated_at before update on public.customers
  for each row execute function public.set_updated_at();
select public._mk_registers_rls('customers');

-- 2) suppliers
create table public.suppliers (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null default public.auth_company_id() references public.companies(id) on delete cascade,
  name text not null,
  document text,
  email text,
  phone text,
  status text not null default 'ativo',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.suppliers enable row level security;
create index suppliers_company_id_idx on public.suppliers(company_id);
create trigger suppliers_set_updated_at before update on public.suppliers
  for each row execute function public.set_updated_at();
select public._mk_registers_rls('suppliers');

-- 3) products
create table public.products (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null default public.auth_company_id() references public.companies(id) on delete cascade,
  name text not null,
  kind text not null default 'produto',
  price numeric(14,2) not null default 0,
  unit text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.products enable row level security;
create index products_company_id_idx on public.products(company_id);
create trigger products_set_updated_at before update on public.products
  for each row execute function public.set_updated_at();
select public._mk_registers_rls('products');

-- 4) categories
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null default public.auth_company_id() references public.companies(id) on delete cascade,
  name text not null,
  kind text not null default 'despesa',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.categories enable row level security;
create index categories_company_id_idx on public.categories(company_id);
create trigger categories_set_updated_at before update on public.categories
  for each row execute function public.set_updated_at();
select public._mk_registers_rls('categories');

-- 5) cost_centers
create table public.cost_centers (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null default public.auth_company_id() references public.companies(id) on delete cascade,
  name text not null,
  code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.cost_centers enable row level security;
create index cost_centers_company_id_idx on public.cost_centers(company_id);
create trigger cost_centers_set_updated_at before update on public.cost_centers
  for each row execute function public.set_updated_at();
select public._mk_registers_rls('cost_centers');

-- 6) accounts
create table public.accounts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null default public.auth_company_id() references public.companies(id) on delete cascade,
  name text not null,
  bank text,
  kind text not null default 'corrente',
  opening_balance numeric(14,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.accounts enable row level security;
create index accounts_company_id_idx on public.accounts(company_id);
create trigger accounts_set_updated_at before update on public.accounts
  for each row execute function public.set_updated_at();
select public._mk_registers_rls('accounts');

-- 7) accounts_plan (chart of accounts, self-referencing)
create table public.accounts_plan (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null default public.auth_company_id() references public.companies(id) on delete cascade,
  code text not null,
  name text not null,
  parent_id uuid references public.accounts_plan(id) on delete set null,
  kind text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.accounts_plan enable row level security;
create index accounts_plan_company_id_idx on public.accounts_plan(company_id);
create trigger accounts_plan_set_updated_at before update on public.accounts_plan
  for each row execute function public.set_updated_at();
select public._mk_registers_rls('accounts_plan');

drop function public._mk_registers_rls(text);
