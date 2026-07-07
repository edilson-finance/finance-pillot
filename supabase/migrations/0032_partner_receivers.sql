-- 0032_partner_receivers.sql
-- Recebedor Parceiro (repasse): cobranças cujo principal pertence a um
-- terceiro (ex.: dono do lote em imobiliária). O principal não é receita da
-- empresa — só os juros. Função atrás de flag por empresa (default OFF).

-- 1) Flag liga/desliga por empresa (Configurações)
alter table public.companies
  add column if not exists partner_receivers_enabled boolean not null default false;

-- 2) Cadastro de recebedores (parceiros)
create table if not exists public.partners (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null default public.auth_company_id() references public.companies(id) on delete cascade,
  name text not null,
  document text,
  pix_key text,
  notes text,
  status text not null default 'ativo',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.partners enable row level security;
create index if not exists partners_company_id_idx on public.partners(company_id);

drop trigger if exists partners_set_updated_at on public.partners;
create trigger partners_set_updated_at before update on public.partners
  for each row execute function public.set_updated_at();

-- RLS padrão do módulo 'registers' (idêntica aos demais cadastros)
drop policy if exists "partners_select" on public.partners;
create policy "partners_select" on public.partners for select
  using ( public.is_super_admin()
          or (company_id = public.auth_company_id() and public.has_module_access('registers')) );
drop policy if exists "partners_insert" on public.partners;
create policy "partners_insert" on public.partners for insert
  with check ( company_id = public.auth_company_id() and public.has_module_access('registers') );
drop policy if exists "partners_update" on public.partners;
create policy "partners_update" on public.partners for update
  using ( company_id = public.auth_company_id() and public.has_module_access('registers') )
  with check ( company_id = public.auth_company_id() and public.has_module_access('registers') );
drop policy if exists "partners_delete" on public.partners;
create policy "partners_delete" on public.partners for delete
  using ( company_id = public.auth_company_id() and public.has_module_access('registers') );

-- 3) Vínculo nas cobranças e no caixa
alter table public.receivables
  add column if not exists partner_id uuid references public.partners(id) on delete set null;
create index if not exists receivables_partner_idx
  on public.receivables(company_id, partner_id) where partner_id is not null;

alter table public.transactions
  add column if not exists partner_id uuid references public.partners(id) on delete set null;
create index if not exists transactions_partner_idx
  on public.transactions(company_id, partner_id) where partner_id is not null;
