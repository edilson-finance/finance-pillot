-- 0014_reconciliation.sql
-- Conciliação bancária: marca transações como conciliadas contra extrato OFX.
-- Idempotente (pode rodar mais de uma vez).

alter table public.transactions
  add column if not exists reconciled    boolean     not null default false,
  add column if not exists reconciled_at timestamptz,
  add column if not exists ofx_fitid     text;

-- Acelera a busca de transações por conta + data durante o matching.
create index if not exists idx_transactions_account_date
  on public.transactions (account_id, date);

-- Evita conciliar a mesma linha do extrato (FITID) duas vezes na mesma empresa.
create unique index if not exists uq_transactions_company_fitid
  on public.transactions (company_id, ofx_fitid)
  where ofx_fitid is not null;
