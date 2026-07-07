# Recebedor Parceiro — Plano de Implementação

> Execução inline nesta sessão, por partes, com teste local a cada parte (ordem do usuário: nada de commit até ele mandar). Spec: `docs/superpowers/specs/2026-06-15-recebedor-parceiro-design.md`.

**Goal:** cobranças podem ter um recebedor parceiro; principal não é receita (só juros); relatório "Recebimento Parceiro" mostra o bruto a repassar; tudo atrás de flag em Configurações.

**Verificação:** SQL via `/tmp/fp_runsql.sh` (comparando com agregados diretos), `npm run build`, e teste manual do usuário no localhost a cada parte. Build/SQL sempre com `cd /Users/victorhugosantanaalmeida/pillot-edilson-version/Finance`.

---

### Parte 1: Migração `0032_partner_receivers.sql`

- Criar `supabase/migrations/0032_partner_receivers.sql`: flag em `companies`, tabela `partners` (+RLS registers, +trigger updated_at), `receivables.partner_id`, `transactions.partner_id` (com índices parciais). Idempotente (drop policy/trigger if exists antes de criar).
- Aplicar com o runner; verificar colunas via `information_schema` e insert/select/delete de um parceiro de teste (com `company_id` explícito da Construtora Teste).

### Parte 2: Toggle em Configurações

- `lib/db/company.ts`: `partner_receivers_enabled: boolean` no `CompanySettings` + em `COLS`.
- `app/(app)/settings/actions.ts`: campo booleano em `CompanyInput` + patch dedicado (não entra em `TEXT_FIELDS`).
- `app/(app)/settings/settings-client.tsx`: seção "Funções" com toggle persistido (estado inicial da prop `company`, chama `updateCompany({ partner_receivers_enabled })` no clique, com feedback de salvo/erro).
- Teste: ligar/desligar no localhost, conferir no banco via runner.

### Parte 3: Cadastro "Recebedores (Parceiros)"

- `lib/db/partners.ts` (tipo + fetch) seguindo padrão dos cadastros existentes.
- `app/(app)/registers/partners/page.tsx` + `partners-client.tsx` + `actions.ts` (CRUD) no padrão de Clientes (`registers/customers`).
- Card no hub de Cadastros (`app/(app)/registers/page.tsx`) — visível só com flag ligada.
- Teste: criar/editar/excluir parceiro no localhost.

### Parte 4: Campo no form + baixa em 2 transações

- `app/(app)/transactions/transactions-client.tsx`: `FormReceita` ganha select "Recebedor (parceiro)" (visível se flag ligada e houver `partners`; `Options` ganha `partners` + flag).
- `app/(app)/transactions/actions.ts` (`createReceita`): gravar `partner_id` no receivable; no espelho de baixa (status recebido na criação), gerar 2 transações: entrada `amount` com `partner_id` + entrada `interest` sem `partner_id` (se `interest > 0`, descrição "Juros — …").
- `updateReceivable` (receivables/actions.ts): aceitar `partner_id`.
- Páginas que montam `Options` (transactions, receivables, payables) passam `partners`/flag (server-side fetch).
- Contas a Receber: chip do parceiro na linha/card.
- Teste: criar cobrança com parceiro (já recebida) → conferir no banco as 2 transações; criar sem parceiro → 1 transação como hoje.

### Parte 5: Indicadores ignoram repasse (migração `0033_partner_revenue_filter.sql`)

- `create or replace` com filtro `partner_id is null` nas agregações de **entrada**: `fn_kpis` (faturamento, numEntradas, ticketMedio), `fn_revenue_expense` (receita), `fn_top_clients`, `fn_category_breakdown` (kind entrada continua genérico — filtro em `curtx/prevtx`), `fn_period_comparison` (receita), `fn_drilldown` (receita). `fn_dre`: receivable com `partner_id` → receita = `interest`.
- Saldo (`fn_kpis.saldoAtual`), `fn_cashflow` e `fn_cashflow_projection` NÃO mudam.
- Verificação: inserir cobrança-parceiro de teste recebida, comparar faturamento antes/depois (não muda) e saldo (muda) via runner.

### Parte 6: Relatório "Recebimento Parceiro"

- `lib/reports-build.ts`: novo `ReportId "recebimento_parceiro"` em `REPORT_METAS` (ícone Users; filtro por parceiro) + builder: linhas de `receivables` recebidas no período com `partner_id`, agrupadas por parceiro, subtotal bruto (bold) por parceiro; colunas Parceiro, Cliente, Descrição, Recebido em, Bruto (R$), Juros (R$).
- `lib/reports-data.ts`: buscar receivables com `partner:partners(name)` + lista de parceiros pro filtro.
- `app/(app)/reports/page.tsx`: select de parceiro quando o relatório for este; meta só listada com flag ligada.
- Teste: gerar relatório no localhost com dados de teste; conferir soma bruto = soma `amount` via runner; PDF/Excel.

### Encerramento

- `npm run build` + `npm run lint` limpos; teste ponta-a-ponta pelo usuário no localhost. **Commits só quando o usuário autorizar.**
