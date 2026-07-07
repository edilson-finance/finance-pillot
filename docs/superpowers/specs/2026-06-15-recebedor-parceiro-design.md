# Recebedor Parceiro (repasse) — Design

**Data:** 2026-06-15 · **Status:** aprovado pelo usuário (chat) · **Commits:** só quando o usuário mandar.

## Problema

Em imobiliárias (e negócios de repasse), parte das cobranças recebidas não é receita da empresa: o **principal pertence a um terceiro** (ex.: dono do lote) e apenas os **juros/multa** pertencem à empresa. Hoje o sistema trata tudo como receita própria, e não há como saber quanto repassar a cada parceiro.

## Decisões (confirmadas com o usuário)

1. **Fluxo do dinheiro:** o valor cai na conta da empresa e é repassado depois. Principal **não** conta como receita/faturamento; **juros sim**. O relatório mostra quanto repassar.
2. **Cadastro próprio:** nova entidade "Recebedores (Parceiros)" — não reaproveita Fornecedores.
3. **Composição do valor:** `receivables.amount` = **bruto do parceiro** (repasse). Juros vão no campo `interest` que já existe. Repasse = `amount`, sem subtração.
4. **Liga/desliga:** flag por empresa em Configurações (`companies.partner_receivers_enabled`, default OFF). Desligada → nenhuma mudança visível em nenhuma tela.
5. **Relatório:** "Recebimento Parceiro" na aba Relatórios, com valor bruto por parceiro (sem juros). Sem controle de "repasse pago/pendente" nesta fase (só informativo).

## Modelo de dados (migração `0032_partner_receivers.sql`)

- `companies.partner_receivers_enabled boolean not null default false`
- Tabela `partners`: `id, company_id (default auth_company_id()), name, document, pix_key, notes, status ('ativo'), created_at, updated_at` + RLS padrão do módulo `registers` (mesmas 4 policies dos demais cadastros) + trigger `set_updated_at`.
- `receivables.partner_id uuid references partners(id) on delete set null`
- `transactions.partner_id uuid references partners(id) on delete set null` (marca dinheiro "de passagem" no caixa)

## Comportamento

**Baixa (receita com parceiro já recebida na criação):** em vez de 1 lançamento espelho de entrada, cria **2**:
1. entrada `amount` **com** `partner_id` → sobe saldo, mas é repasse (não é receita);
2. entrada `interest` (se > 0) **sem** `partner_id` → receita da empresa (juros).

**"Marcar como recebido" depois:** hoje não gera lançamento no caixa (comportamento pré-existente do sistema, fora de escopo mudar). O relatório de repasse lê de `receivables` (não depende do espelho no caixa).

**Indicadores (base caixa):** RPCs de receita/faturamento passam a filtrar `partner_id is null` — `fn_kpis` (faturamento/numEntradas/ticketMedio), `fn_revenue_expense` (receita), `fn_top_clients`, `fn_category_breakdown` (entrada), `fn_period_comparison` (receita), `fn_drilldown` (receita). **Saldo e fluxo de caixa continuam contando tudo** (o dinheiro está na conta). `fn_dre` (competência): receivable com `partner_id` conta como receita apenas o `interest`, não o `amount`.

## UI (somente com a flag ligada)

- **Configurações:** seção "Funções" com toggle "Recebedor parceiro (repasse)" persistido via `updateCompany`.
- **Cadastros:** página "Recebedores (Parceiros)" (CRUD no padrão de Clientes: nome, CPF/CNPJ, chave PIX, observações, status).
- **Form de Receita/cobrança:** select "Recebedor (parceiro)" opcional (lista `partners` ativos).
- **Contas a Receber:** badge/chip com o nome do parceiro na linha (desktop) e no card (mobile).

## Relatório "Recebimento Parceiro"

Na aba Relatórios (padrão `REPORT_METAS`/`buildReport`, com PDF/Excel de graça):
- **Base:** `receivables` com `partner_id` e status `recebido`/`recebido_parcial`, `received_at` no período.
- **Filtros:** período (global) + parceiro.
- **Colunas:** Parceiro, Cliente, Descrição, Recebido em, Bruto (a repassar), Juros (informativo, da empresa).
- **Agrupamento:** subtotal de **bruto** por parceiro (linha bold) — é o valor a pagar ao parceiro.
- Visível só com a flag ligada (senão o relatório não aparece na lista).

## Fora de escopo (por ora)

- Controle de repasse pago/pendente (baixa do repasse, geração automática de conta a pagar).
- Espelho no caixa para "Marcar como recebido" tardio (gap pré-existente do sistema).
- Rateio de uma cobrança entre múltiplos parceiros.

## Processo

Implementação em 6 partes testadas localmente (SQL via runner + `npm run build` + teste manual no localhost pelo usuário). **Nenhum commit/push até ordem expressa do usuário.**
