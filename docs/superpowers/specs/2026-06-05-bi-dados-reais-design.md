# BI Financeiro — Ligar tabs mockadas ao banco real (design)

**Data:** 2026-06-05
**Autor:** wiqfy / Edilson
**Status:** Aprovado para implementação

## Problema

A página `app/(app)/bi/page.tsx` mistura dados reais (via RPCs/views) com **dados
mockados hardcoded**. Várias tabs mostram números fixos que não existem no banco,
dando a falsa impressão de que a empresa tem movimento. O objetivo é **ligar tudo
no banco real**, respeitando o filtro de período global.

### O que já é real (não mexer)
- **Visão Geral** — `useKpis`, `useRevenueSeries` (RPCs `fn_kpis`, `fn_revenue_expense`).
- **Valor Líquido**, **Receitas (gráfico)**, **Despesas (gráfico)** — `series`/`kpis` reais.
- **Comparativo Mensal** — montado a partir de `series` (`useRevenueSeries`). Já é real.

### O que está mockado (alvo deste design)
1. **Categorias de Entradas** — `receitaPorCategoria` + `subcat` (consts em `lib/accounts-plan.ts` e no arquivo).
2. **Gastos por Categoria** — `gastoPorCategoria` + `subcat`.
3. **Análise de Períodos** — literais `R(289000)`…, barras fixas, textos de análise fixos.
4. **Drill-down** — array fixo (`Obras`, `Contratos`…), botões sem ação.
5. **Inadimplência** — `inadData`, `agingData`, KPIs fixos (`19,9%`, `R(51800)`…).
6. **Projeção de Caixa** — array fixo de 8 pontos com 3 cenários, KPIs fixos.
7. **Concentração de Receita / Top Clientes / Despesas por Categoria** — views
   `v_top_clients`/`v_top_expenses` que **ignoram o filtro de data**.
8. **KPIs secundários sem base** (Receitas/Despesas tabs): `Clientes Ativos "12"`,
   `Recorrência "35%"`, `Fornecedores Ativos "31"`, `Fixas vs Variáveis "34%/66%"`,
   e tooltips de variação inventados (`"+12,3%"`, `"+R$16.400"`…).

## Decisões (confirmadas com o usuário)

1. **Regime = Caixa (realizado)** para categorias, drill-down, comparativo e
   concentração/top. Tudo baseado em `transactions` (por `date`, `type` ∈
   `entrada`/`saida`). Consistente com KPIs e Fluxo de Caixa.
2. **Inadimplência** vive nos `receivables`: "em atraso" = `due_date < hoje` e
   status não recebido (`status NOT IN ('recebido','recebido_parcial')`).
   Taxa = valor vencido em aberto ÷ total a receber em aberto.
3. **Projeção de Caixa** = **só linha realista** (remover otimista/pessimista da UI).
4. **Top/Concentração** passam para **caixa, filtrados por período**.
5. **KPIs sem base** → **remover** (calcular só os que têm dado real: Clientes
   Ativos, Fornecedores Ativos). Remover Recorrência, Fixas/Variáveis e tooltips
   de variação inventados. Nunca exibir número falso.

## Arquitetura

Padrão já existente no projeto: **funções SQL parametrizadas por período** +
**hooks `useX`** em `lib/analytics-client.ts`. RLS aplica o escopo de empresa
automaticamente (as funções são `STABLE`, `SET search_path = public`, sem
`SECURITY DEFINER`, herdando o RLS do usuário). Toda agregação roda no banco;
o cliente só formata.

### Modelo de dados relevante (confirmado)
- `transactions(type txn_type[entrada|saida], date, amount, category_id, cost_center_id, customer_id, supplier_id, account_id)`
- `receivables(amount, due_date, status receivable_status[a_receber|em_atraso|recebido|recebido_parcial], customer_id, category_id)`
- `payables(amount, due_date, status payable_status[a_pagar|em_atraso|pago|pago_parcial], supplier_id, category_id)`
- `accounts(opening_balance)`
- `categories(id, name, parent_id, kind, grupo)` — hierarquia via `parent_id`.
- `cost_centers(id,name)`, `customers(id,name)`, `suppliers(id,name)`

## Novos RPCs (migração `0031_bi_real_data.sql`)

Convenção de janela anterior (para variação), igual ao `useKpis`:
`prev_end = p_start - 1`, `prev_start = p_start - (p_end - p_start + 1)`.

### 1. `fn_category_breakdown(p_start date, p_end date, p_kind text)` → json
`p_kind` ∈ `'entrada' | 'saida'`. Agrega `transactions` do tipo no período,
agrupando pela categoria **de topo** (sobe via `parent_id`), com filhos.

Retorno (array):
```json
[{ "id":"uuid", "categoria":"Despesas com Pessoal", "valor":141400,
   "pct":49.1, "varPct":3.2,
   "filhos":[{ "nome":"Salários e Ordenados", "valor":98400 }] }]
```
- `valor` = soma das transações cuja categoria é esta categoria-topo **ou
  descendente**. `pct` = `valor / total * 100`. `varPct` = variação % vs janela
  anterior (mesma categoria por id; `null` se anterior = 0).
- `filhos` = categorias com `parent_id` = topo, com `valor > 0`, ordenadas desc.
  Transações lançadas direto na categoria-topo entram como filho sintético
  `"(direto)"` quando houver.
- Ordenado por `valor` desc. Cor é atribuída no cliente por índice (paleta).

### 2. `fn_drilldown(p_start date, p_end date, p_dim text)` → json
`p_dim` ∈ `'categoria' | 'centro_custo' | 'cliente' | 'fornecedor'`.
Agrupa `transactions` no período pela dimensão escolhida.

Retorno (array):
```json
[{ "nome":"Obras", "receita":248000, "despesa":142000, "varPct":8.1 }]
```
- `receita` = `sum(amount) filter (type='entrada')`, `despesa` =
  `sum filter (type='saida')` no grupo. `varPct` = variação do resultado
  (`receita-despesa`) vs janela anterior. Linhas com nome nulo → `'—'`.
- `% Receita` é calculado no cliente (`receita / totalReceita`).
- Ordenado por `(receita+despesa)` desc.

### 3. `fn_period_comparison(p_start date, p_end date)` → json
Compara período atual vs anterior (mesma duração), base caixa.
```json
{ "atual":{"receita":312000,"despesa":288000,"resultado":24000},
  "anterior":{"receita":289000,"despesa":267000,"resultado":22000},
  "labelAtual":"01/05–31/05", "labelAnterior":"01/04–30/04" }
```
A "Análise Automática de Variação" passa a ser computada no cliente a partir
desses números (crescimento receita %, despesa %, variação de margem em pp).

### 4. `fn_inadimplencia(p_today date default current_date)` → json
Base `receivables`. "Em atraso" = `due_date < p_today AND status NOT IN
('recebido','recebido_parcial')`.
```json
{ "taxa":19.9, "valorAtraso":51800, "clientesInad":5, "prazoMedioDias":28,
  "aging":[{"faixa":"0–30 dias","valor":12400,"qtd":4}, ...],
  "evolucao":[{"mes":"Nov","taxa":6.8,"valor":18400}, ...] }
```
- `taxa` = `valorAtraso / totalAReceberEmAberto * 100`
  (denominador = `sum(amount) filter (status NOT IN ('recebido','recebido_parcial'))`).
- `clientesInad` = `count(distinct customer_id)` dos vencidos.
- `prazoMedioDias` = média de `(p_today - due_date)` dos vencidos (arredondado).
- `aging` = buckets por `(p_today - due_date)`: `0–30`, `31–60`, `61–90`, `+90`;
  `valor` = soma, `qtd` = contagem.
- `evolucao` = últimos 7 meses por mês de `due_date`: para o mês M,
  `valor` = soma vencidos não recebidos com `due_date` em M;
  `taxa` = `valor / sum(amount com due_date em M) * 100`. Rótulo `TMMon`.

### 5. `fn_cashflow_projection(p_weeks int default 13)` → json
Saldo atual + projeção semanal (só realista) por vencimento.
```json
{ "saldoAtual":284750,
  "pontos":[{"label":"Sem 1","fim":"2026-06-12","saldo":312400}, ...],
  "menorSaldo":162400,"menorLabel":"Sem 6","menorFim":"2026-07-17",
  "saldoFinal":215000,"dataFinal":"2026-09-04" }
```
- `saldoAtual` = `sum(opening_balance) + sum(delta de transactions até hoje)`
  (delta = `+amount` entrada / `-amount` saída).
- Para cada semana futura `i` (1..p_weeks): saldo acumulado =
  `saldoAtual + Σ receivables a receber (due_date ≤ fim_semana_i)
   − Σ payables a pagar (due_date ≤ fim_semana_i)`, considerando só itens em
  aberto (status não liquidado) com `due_date > hoje`.
- `menor*` = ponto de menor saldo; `saldoFinal`/`dataFinal` = último ponto.
- Ponto 0 (hoje) tem `saldo = saldoAtual` e é o único com a série "Realizado".

### 6. `fn_top_clients(p_start,p_end)` / `fn_top_expenses(p_start,p_end)` → tabela
Substituem `v_top_clients`/`v_top_expenses` (que ignoram data). Base **caixa**:
- `fn_top_clients`: `transactions type='entrada'` agrupado por `customer_id`
  no período → `(nome, valor, percent)`.
- `fn_top_expenses`: `transactions type='saida'` agrupado por `category_id`
  no período → `(nome, valor, percent)`.
As views antigas podem ser dropadas após a migração dos hooks.

## Camada cliente (`lib/analytics-client.ts`)

Novos hooks (mesmo formato dos existentes, `useEffect` + `createClient`):
- `useCategoryBreakdown(range, kind)` → `{ rows, loading }`, `rows: CategoryRow[]`
  (`{ id, categoria, valor, pct, varPct, filhos:{nome,valor}[] }`). Cor atribuída
  por índice de uma paleta exportada.
- `useDrilldown(range, dim)` → `{ rows, loading }`, `rows: DrillRow[]`.
- `usePeriodComparison(range)` → `{ data, loading }`.
- `useInadimplencia()` → `{ data, loading }`.
- `useCashflowProjection(weeks?)` → `{ data, loading }`.
- `useTopClients(range)` / `useTopExpenses(range)` — passam a receber `range` e
  chamar os novos RPCs (assinatura muda; atualizar chamadas no `bi/page.tsx`).

## Mudanças em `app/(app)/bi/page.tsx`

- Remover imports/consts mock: `gastoPorCategoria`, `receitaPorCategoria`,
  `GRUPOS_DRE` (se não usado em outro lugar), `inadData`, `agingData`, os `subcat`
  locais, e os literais das tabs 3–6.
- `CatReceitas`/`CatDespesas` passam a consumir `useCategoryBreakdown`. A cor vem
  da paleta; subcategorias vêm de `filhos`. Botão "Nova categoria de receita" some
  (ou aponta para a tela de Cadastros) — não cria mock em memória.
- **Análise de Períodos**: consome `usePeriodComparison`; cartões, barras e
  análise textual derivados dos números reais.
- **Drill-down**: `useState` para dimensão; os 4 botões viram seletor real
  ligado a `useDrilldown`; `% Receita` calculado com `totalReceita`.
- **Inadimplência**: KPIs, aging e evolução de `useInadimplencia`.
- **Projeção de Caixa**: `useCashflowProjection`; remover séries `otimista`/
  `pessimista` e suas legendas; insight do menor saldo calculado.
- **Concentração de Receita / Top Clientes / Despesas por Categoria**: usar
  `useTopClients(range)`/`useTopExpenses(range)`.
- **KPIs secundários sem base**: remover `Clientes Ativos`/`Recorrência` fixos →
  manter `Clientes Ativos` real (vem junto de um RPC leve ou contagem no hook);
  remover `Recorrência`, `Fornecedores Ativos` fixo (ou calcular real),
  `Fixas vs Variáveis`. Remover os `detail={{...}}` com variação inventada das
  `TableRow` (ou preencher só com dados reais disponíveis).

## Estados vazios

Empresa sem `transactions`/`receivables` no período deve mostrar **vazio honesto**
("Sem lançamentos no período"), nunca número mock. Cada widget trata
`rows.length === 0` / valores 0.

## Testes / verificação

Sem framework de teste no projeto. Verificação:
1. Cada RPC: rodar via `/tmp/fp_runsql.sh` para a empresa Construtora Teste e
   conferir que os totais batem com queries diretas (`sum(amount)` por filtro).
2. Conferir que empresa zerada retorna arrays vazios / zeros.
3. `npm run build` + lint limpos.
4. Smoke manual: cada tab carrega sem erro e reage ao filtro de período.

## Fora de escopo

- Exportação PDF/Excel (botões já existentes, seguem placeholder).
- Classificação fixa/variável de despesas (não há campo no modelo).
- Cenários otimista/pessimista de projeção (removidos por decisão).
