-- 0012_transactions_full.sql
-- Lançamentos completo: Receita / Despesa / Transferência.
-- Estende receivables, payables e transactions com os campos do novo modelo,
-- adiciona itens de lançamento (transaction_items) e anexos (attachments + Storage).

-- ── Novos valores de enum (rodam fora de transação) ─────────────────────────
alter type public.txn_type           add value if not exists 'transferencia';
alter type public.receivable_status  add value if not exists 'recebido_parcial';
alter type public.payable_status     add value if not exists 'pago_parcial';

-- ── receivables: campos do formulário de Receita ────────────────────────────
alter table public.receivables
  add column if not exists competence_date  date,
  add column if not exists document_number  text,
  add column if not exists payment_method   text,
  add column if not exists discount         numeric(14,2) not null default 0,
  add column if not exists interest         numeric(14,2) not null default 0,
  add column if not exists notes            text,
  add column if not exists contact          text,
  add column if not exists email            text,
  add column if not exists counterparty_doc text,
  add column if not exists payment_term_days integer,
  add column if not exists cost_center_id   uuid references public.cost_centers(id) on delete set null,
  add column if not exists recurrence       text,
  add column if not exists parent_id        uuid references public.receivables(id) on delete set null;

-- ── payables: campos do formulário de Despesa ───────────────────────────────
alter table public.payables
  add column if not exists competence_date  date,
  add column if not exists document_number  text,
  add column if not exists payment_method   text,
  add column if not exists discount         numeric(14,2) not null default 0,
  add column if not exists interest         numeric(14,2) not null default 0,
  add column if not exists notes            text,
  add column if not exists counterparty_doc text,
  add column if not exists counterparty_bank text,
  add column if not exists cost_center_id   uuid references public.cost_centers(id) on delete set null,
  add column if not exists recurrence       text,
  add column if not exists parent_id        uuid references public.payables(id) on delete set null;

-- ── transactions: transferência + vínculo com baixa de CR/CP ────────────────
alter table public.transactions
  add column if not exists to_account_id   uuid references public.accounts(id) on delete set null,
  add column if not exists fee             numeric(14,2) not null default 0,
  add column if not exists tax             numeric(14,2) not null default 0,
  add column if not exists payment_method  text,
  add column if not exists document_number text,
  add column if not exists notes           text,
  add column if not exists receivable_id   uuid references public.receivables(id) on delete set null,
  add column if not exists payable_id      uuid references public.payables(id) on delete set null;

-- ── helper de RLS por módulo (recriado; removido no fim) ─────────────────────
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

-- ── transaction_items: "Detalhar produto/serviço" ───────────────────────────
create table if not exists public.transaction_items (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null default public.auth_company_id() references public.companies(id) on delete cascade,
  receivable_id uuid references public.receivables(id) on delete cascade,
  payable_id    uuid references public.payables(id) on delete cascade,
  product_id    uuid references public.products(id) on delete set null,
  description text not null,
  quantity   numeric(14,3) not null default 1,
  unit_price numeric(14,2) not null default 0,
  total      numeric(14,2) not null default 0,
  created_at timestamptz not null default now()
);
alter table public.transaction_items enable row level security;
create index if not exists transaction_items_company_idx on public.transaction_items(company_id);
create index if not exists transaction_items_recv_idx on public.transaction_items(receivable_id);
create index if not exists transaction_items_pay_idx on public.transaction_items(payable_id);
select public._mk_module_rls('transaction_items','transactions');

-- ── attachments: NF / boleto / comprovante (metadados; arquivo no Storage) ───
create table if not exists public.attachments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null default public.auth_company_id() references public.companies(id) on delete cascade,
  owner_type text not null check (owner_type in ('receivable','payable','transaction')),
  owner_id   uuid not null,
  bucket     text not null default 'attachments',
  file_path  text not null,
  file_name  text not null,
  mime_type  text,
  size_bytes bigint,
  created_at timestamptz not null default now()
);
alter table public.attachments enable row level security;
create index if not exists attachments_company_idx on public.attachments(company_id);
create index if not exists attachments_owner_idx on public.attachments(owner_type, owner_id);
select public._mk_module_rls('attachments','transactions');

drop function public._mk_module_rls(text, text);

-- ── Storage: bucket privado 'attachments' com RLS por empresa ────────────────
-- Convenção de path: {company_id}/{owner_type}/{owner_id}/{filename}
insert into storage.buckets (id, name, public)
  values ('attachments', 'attachments', false)
  on conflict (id) do nothing;

drop policy if exists "attachments_select" on storage.objects;
drop policy if exists "attachments_insert" on storage.objects;
drop policy if exists "attachments_update" on storage.objects;
drop policy if exists "attachments_delete" on storage.objects;

create policy "attachments_select" on storage.objects for select
  using ( bucket_id = 'attachments'
          and (public.is_super_admin()
               or (storage.foldername(name))[1] = public.auth_company_id()::text) );
create policy "attachments_insert" on storage.objects for insert
  with check ( bucket_id = 'attachments'
               and (storage.foldername(name))[1] = public.auth_company_id()::text );
create policy "attachments_update" on storage.objects for update
  using ( bucket_id = 'attachments'
          and (storage.foldername(name))[1] = public.auth_company_id()::text );
create policy "attachments_delete" on storage.objects for delete
  using ( bucket_id = 'attachments'
          and (storage.foldername(name))[1] = public.auth_company_id()::text );
