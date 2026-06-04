-- 0007_transactions.sql — transactions, payables, receivables + RLS

create or replace function public._mk_module_rls(p_table text, p_module text)
returns void language plpgsql as $$
begin
  execute format($f$
    create policy "%1$s_select" on public.%1$s for select
      using ( public.is_super_admin()
              or (company_id = public.auth_company_id() and public.has_module_access(%2$L)) );
    create policy "%1$s_insert" on public.%1$s for insert
      with check ( company_id = public.auth_company_id() and public.has_module_access(%2$L) );
    create policy "%1$s_update" on public.%1$s for update
      using ( company_id = public.auth_company_id() and public.has_module_access(%2$L) )
      with check ( company_id = public.auth_company_id() and public.has_module_access(%2$L) );
    create policy "%1$s_delete" on public.%1$s for delete
      using ( company_id = public.auth_company_id() and public.has_module_access(%2$L) );
  $f$, p_table, p_module);
end $$;

-- transactions (lançamentos)
create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null default public.auth_company_id() references public.companies(id) on delete cascade,
  type public.txn_type not null,
  date date not null default current_date,
  amount numeric(14,2) not null,
  description text,
  category_id uuid references public.categories(id) on delete set null,
  account_id uuid references public.accounts(id) on delete set null,
  cost_center_id uuid references public.cost_centers(id) on delete set null,
  customer_id uuid references public.customers(id) on delete set null,
  supplier_id uuid references public.suppliers(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.transactions enable row level security;
create index transactions_company_id_idx on public.transactions(company_id);
create index transactions_date_idx on public.transactions(company_id, date);
create trigger transactions_set_updated_at before update on public.transactions
  for each row execute function public.set_updated_at();
select public._mk_module_rls('transactions','transactions');

-- payables (contas a pagar)
create table public.payables (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null default public.auth_company_id() references public.companies(id) on delete cascade,
  supplier_id uuid references public.suppliers(id) on delete set null,
  description text,
  category_id uuid references public.categories(id) on delete set null,
  due_date date not null,
  installment text,
  amount numeric(14,2) not null,
  status public.payable_status not null default 'a_pagar',
  account_id uuid references public.accounts(id) on delete set null,
  paid_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.payables enable row level security;
create index payables_company_id_idx on public.payables(company_id);
create index payables_due_date_idx on public.payables(company_id, due_date);
create trigger payables_set_updated_at before update on public.payables
  for each row execute function public.set_updated_at();
select public._mk_module_rls('payables','payables');

-- receivables (contas a receber)
create table public.receivables (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null default public.auth_company_id() references public.companies(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  description text,
  category_id uuid references public.categories(id) on delete set null,
  due_date date not null,
  installment text,
  amount numeric(14,2) not null,
  status public.receivable_status not null default 'a_receber',
  account_id uuid references public.accounts(id) on delete set null,
  received_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.receivables enable row level security;
create index receivables_company_id_idx on public.receivables(company_id);
create index receivables_due_date_idx on public.receivables(company_id, due_date);
create trigger receivables_set_updated_at before update on public.receivables
  for each row execute function public.set_updated_at();
select public._mk_module_rls('receivables','receivables');

drop function public._mk_module_rls(text, text);
