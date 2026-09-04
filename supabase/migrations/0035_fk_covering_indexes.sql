-- 0035_fk_covering_indexes.sql
--
-- [PERF] Índices de cobertura para as 25 chaves estrangeiras sem índice
-- (advisor `unindexed_foreign_keys`). Sem eles, joins e verificações de FK
-- (inclusive cascata de delete) fazem seq scan — degrada linear com o volume.
-- CREATE INDEX IF NOT EXISTS é idempotente e não bloqueia leitura.

create index if not exists idx_accounts_plan_parent_id      on public.accounts_plan(parent_id);
create index if not exists idx_categories_grupo             on public.categories(grupo);
create index if not exists idx_categories_parent_id         on public.categories(parent_id);
create index if not exists idx_company_members_user_id      on public.company_members(user_id);
create index if not exists idx_member_permissions_company_id on public.member_permissions(company_id);

create index if not exists idx_payables_account_id     on public.payables(account_id);
create index if not exists idx_payables_category_id    on public.payables(category_id);
create index if not exists idx_payables_cost_center_id on public.payables(cost_center_id);
create index if not exists idx_payables_parent_id      on public.payables(parent_id);
create index if not exists idx_payables_supplier_id    on public.payables(supplier_id);

create index if not exists idx_receivables_account_id     on public.receivables(account_id);
create index if not exists idx_receivables_category_id    on public.receivables(category_id);
create index if not exists idx_receivables_cost_center_id on public.receivables(cost_center_id);
create index if not exists idx_receivables_customer_id    on public.receivables(customer_id);
create index if not exists idx_receivables_parent_id      on public.receivables(parent_id);
create index if not exists idx_receivables_partner_id     on public.receivables(partner_id);

create index if not exists idx_transaction_items_product_id on public.transaction_items(product_id);

create index if not exists idx_transactions_category_id    on public.transactions(category_id);
create index if not exists idx_transactions_cost_center_id on public.transactions(cost_center_id);
create index if not exists idx_transactions_customer_id    on public.transactions(customer_id);
create index if not exists idx_transactions_partner_id     on public.transactions(partner_id);
create index if not exists idx_transactions_payable_id     on public.transactions(payable_id);
create index if not exists idx_transactions_receivable_id  on public.transactions(receivable_id);
create index if not exists idx_transactions_supplier_id    on public.transactions(supplier_id);
create index if not exists idx_transactions_to_account_id  on public.transactions(to_account_id);
