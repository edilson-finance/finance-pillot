# BI Financeiro — Dados Reais Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Substituir todos os dados mockados das tabs do BI Financeiro por dados reais do Supabase (base caixa), respeitando o filtro de período global.

**Architecture:** 6 RPCs SQL novos (migração `0031_bi_real_data.sql`) parametrizados por período + hooks `useX` em `lib/analytics-client.ts`, seguindo o padrão existente (`fn_kpis`/`useKpis`). As views `v_top_clients`/`v_top_expenses` (que ignoram a data) são substituídas por funções. A UI (`app/(app)/bi/page.tsx`) passa a consumir os hooks; consts mock são removidas.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Supabase Postgres (RLS), recharts, inline styles + CSS variables.

**Verificação (sem framework de teste):** cada RPC é validado via `/tmp/fp_runsql.sh` comparando com query direta; cada mudança de hook/UI é validada com `npm run build` + `npm run lint` rodados **de dentro de** `/Users/victorhugosantanaalmeida/pillot-edilson-version/Finance`. Empresa de teste: Construtora Teste.

**Convenção da janela anterior (variação):** `prev_end = p_start - 1`, `prev_start = p_start - ((p_end - p_start) + 1)`.

**Como aplicar SQL:** o arquivo de migração `supabase/migrations/0031_bi_real_data.sql` vai crescendo a cada task (todas as funções usam `CREATE OR REPLACE`, idempotente). Aplicar com `/tmp/fp_runsql.sh supabase/migrations/0031_bi_real_data.sql`.

---

### Task 1: RPCs `fn_top_clients` / `fn_top_expenses` (substituem as views)

**Files:**
- Create: `supabase/migrations/0031_bi_real_data.sql`

- [ ] **Step 1: Criar a migração com as duas funções**

Criar `supabase/migrations/0031_bi_real_data.sql` com o conteúdo:

```sql
-- 0031_bi_real_data.sql
-- RPCs do BI Financeiro: substituem dados mockados por agregações reais (base caixa).

-- Top clientes por receita realizada (transactions entrada) no período.
create or replace function public.fn_top_clients(p_start date, p_end date)
returns table(nome text, valor numeric, percent numeric)
language sql stable set search_path to 'public' as $$
  with totals as (
    select coalesce(cu.name, '—') as nome, sum(t.amount) as valor
    from public.transactions t
    left join public.customers cu on cu.id = t.customer_id
    where t.type = 'entrada' and t.date between p_start and p_end
    group by cu.name
  ), grand as (select coalesce(sum(valor), 0) as g from totals)
  select nome, valor,
         round((valor / nullif((select g from grand), 0)) * 100, 1) as percent
  from totals
  order by valor desc
$$;

-- Top despesas por categoria realizada (transactions saida) no período.
create or replace function public.fn_top_expenses(p_start date, p_end date)
returns table(nome text, valor numeric, percent numeric)
language sql stable set search_path to 'public' as $$
  with totals as (
    select coalesce(c.name, 'Outros') as nome, sum(t.amount) as valor
    from public.transactions t
    left join public.categories c on c.id = t.category_id
    where t.type = 'saida' and t.date between p_start and p_end
    group by c.name
  ), grand as (select coalesce(sum(valor), 0) as g from totals)
  select nome, valor,
         round((valor / nullif((select g from grand), 0)) * 100, 1) as percent
  from totals
  order by valor desc
$$;
```

- [ ] **Step 2: Aplicar e verificar contra agregado direto**

Run:
```bash
cd /Users/victorhugosantanaalmeida/pillot-edilson-version/Finance
/tmp/fp_runsql.sh supabase/migrations/0031_bi_real_data.sql
echo "select * from public.fn_top_clients('2026-01-01','2026-12-31');" | /tmp/fp_runsql.sh -
echo "select coalesce(cu.name,'—') nome, sum(t.amount) valor from transactions t left join customers cu on cu.id=t.customer_id where t.type='entrada' and t.date between '2026-01-01' and '2026-12-31' group by cu.name order by valor desc;" | /tmp/fp_runsql.sh -
```
Expected: as somas por cliente do RPC batem com a query direta; `percent` soma ~100.

- [ ] **Step 3: Commit**

```bash
cd /Users/victorhugosantanaalmeida/pillot-edilson-version/Finance
git add supabase/migrations/0031_bi_real_data.sql
git commit -m "feat(bi): fn_top_clients/fn_top_expenses por periodo (base caixa)"
```

---

### Task 2: RPC `fn_category_breakdown`

**Files:**
- Modify: `supabase/migrations/0031_bi_real_data.sql` (append)

- [ ] **Step 1: Adicionar a função ao fim da migração**

Append em `supabase/migrations/0031_bi_real_data.sql`:

```sql
-- Quebra por categoria (topo) com filhos e variacao vs janela anterior. Base caixa.
-- p_kind: 'entrada' | 'saida'
create or replace function public.fn_category_breakdown(p_start date, p_end date, p_kind text)
returns json
language sql stable set search_path to 'public' as $$
  with k as (select p_kind::txn_type as kind),
  curtx as (
    select t.category_id, t.amount
    from public.transactions t, k
    where t.type = k.kind and t.date between p_start and p_end
  ),
  prevtx as (
    select t.category_id, t.amount
    from public.transactions t, k
    where t.type = k.kind
      and t.date between (p_start - ((p_end - p_start) + 1)) and (p_start - 1)
  ),
  cmap as (
    select c.id, c.name, coalesce(c.parent_id, c.id) as top_id
    from public.categories c
  ),
  cur as (
    select cm.top_id, sum(ct.amount) as valor
    from curtx ct join cmap cm on cm.id = ct.category_id
    group by cm.top_id
  ),
  prev as (
    select cm.top_id, sum(pt.amount) as valor
    from prevtx pt join cmap cm on cm.id = pt.category_id
    group by cm.top_id
  ),
  tot as (select coalesce(sum(valor), 0) as g from cur),
  filhos as (
    select cm.top_id,
           case when cm.id = cm.top_id then '(direto)' else cm.name end as nome,
           sum(ct.amount) as valor
    from curtx ct join cmap cm on cm.id = ct.category_id
    group by cm.top_id, case when cm.id = cm.top_id then '(direto)' else cm.name end
  )
  select coalesce(json_agg(obj order by ord desc), '[]'::json)
  from (
    select c.valor as ord,
      json_build_object(
        'id', c.top_id,
        'categoria', (select name from public.categories where id = c.top_id),
        'valor', c.valor,
        'pct', round((c.valor / nullif((select g from tot), 0)) * 100, 1),
        'varPct', case when coalesce(p.valor, 0) > 0
                       then round(((c.valor - p.valor) / p.valor) * 100, 1) else null end,
        'filhos', (select coalesce(json_agg(json_build_object('nome', f.nome, 'valor', f.valor) order by f.valor desc), '[]'::json)
                   from filhos f where f.top_id = c.top_id and f.valor > 0)
      ) as obj
    from cur c
    left join prev p on p.top_id = c.top_id
    where c.valor <> 0
  ) s
$$;
```

- [ ] **Step 2: Aplicar e verificar**

Run:
```bash
cd /Users/victorhugosantanaalmeida/pillot-edilson-version/Finance
/tmp/fp_runsql.sh supabase/migrations/0031_bi_real_data.sql
echo "select public.fn_category_breakdown('2026-01-01','2026-12-31','saida');" | /tmp/fp_runsql.sh -
echo "select sum(amount) from transactions where type='saida' and date between '2026-01-01' and '2026-12-31';" | /tmp/fp_runsql.sh -
```
Expected: a soma dos `valor` dos itens retornados = soma direta de `saida`; `pct` soma ~100; cada item traz `filhos`.

- [ ] **Step 3: Commit**

```bash
cd /Users/victorhugosantanaalmeida/pillot-edilson-version/Finance
git add supabase/migrations/0031_bi_real_data.sql
git commit -m "feat(bi): fn_category_breakdown com filhos e variacao"
```

---

### Task 3: RPC `fn_drilldown`

**Files:**
- Modify: `supabase/migrations/0031_bi_real_data.sql` (append)

- [ ] **Step 1: Adicionar a função**

Append:

```sql
-- Drill-down por dimensao. Base caixa. p_dim: 'categoria'|'centro_custo'|'cliente'|'fornecedor'
create or replace function public.fn_drilldown(p_start date, p_end date, p_dim text)
returns json
language sql stable set search_path to 'public' as $$
  with cur as (
    select
      case p_dim
        when 'categoria'    then (select name from public.categories   where id = t.category_id)
        when 'centro_custo' then (select name from public.cost_centers  where id = t.cost_center_id)
        when 'cliente'      then (select name from public.customers     where id = t.customer_id)
        when 'fornecedor'   then (select name from public.suppliers     where id = t.supplier_id)
      end as nome,
      coalesce(sum(amount) filter (where type = 'entrada'), 0) as receita,
      coalesce(sum(amount) filter (where type = 'saida'), 0)   as despesa
    from public.transactions t
    where t.date between p_start and p_end
    group by 1
  ),
  prev as (
    select
      case p_dim
        when 'categoria'    then (select name from public.categories   where id = t.category_id)
        when 'centro_custo' then (select name from public.cost_centers  where id = t.cost_center_id)
        when 'cliente'      then (select name from public.customers     where id = t.customer_id)
        when 'fornecedor'   then (select name from public.suppliers     where id = t.supplier_id)
      end as nome,
      coalesce(sum(amount) filter (where type = 'entrada'), 0)
        - coalesce(sum(amount) filter (where type = 'saida'), 0) as resultado
    from public.transactions t
    where t.date between (p_start - ((p_end - p_start) + 1)) and (p_start - 1)
    group by 1
  )
  select coalesce(json_agg(obj order by ord desc), '[]'::json)
  from (
    select (c.receita + c.despesa) as ord,
      json_build_object(
        'nome', coalesce(c.nome, '—'),
        'receita', c.receita,
        'despesa', c.despesa,
        'varPct', case when coalesce(p.resultado, 0) <> 0
                       then round((((c.receita - c.despesa) - p.resultado) / abs(p.resultado)) * 100, 1)
                       else null end
      ) as obj
    from cur c
    left join prev p on coalesce(p.nome, '') = coalesce(c.nome, '')
    where (c.receita + c.despesa) <> 0
  ) s
$$;
```

- [ ] **Step 2: Aplicar e verificar**

Run:
```bash
cd /Users/victorhugosantanaalmeida/pillot-edilson-version/Finance
/tmp/fp_runsql.sh supabase/migrations/0031_bi_real_data.sql
echo "select public.fn_drilldown('2026-01-01','2026-12-31','categoria');" | /tmp/fp_runsql.sh -
```
Expected: linhas com `nome`, `receita`, `despesa`; soma das receitas = total entrada do período.

- [ ] **Step 3: Commit**

```bash
cd /Users/victorhugosantanaalmeida/pillot-edilson-version/Finance
git add supabase/migrations/0031_bi_real_data.sql
git commit -m "feat(bi): fn_drilldown por dimensao"
```

---

### Task 4: RPC `fn_period_comparison`

**Files:**
- Modify: `supabase/migrations/0031_bi_real_data.sql` (append)

- [ ] **Step 1: Adicionar a função**

Append:

```sql
-- Comparativo periodo atual vs anterior (mesma duracao). Base caixa.
create or replace function public.fn_period_comparison(p_start date, p_end date)
returns json
language sql stable set search_path to 'public' as $$
  with cur as (
    select coalesce(sum(amount) filter (where type = 'entrada'), 0) as receita,
           coalesce(sum(amount) filter (where type = 'saida'), 0)   as despesa
    from public.transactions where date between p_start and p_end
  ),
  prev as (
    select coalesce(sum(amount) filter (where type = 'entrada'), 0) as receita,
           coalesce(sum(amount) filter (where type = 'saida'), 0)   as despesa
    from public.transactions
    where date between (p_start - ((p_end - p_start) + 1)) and (p_start - 1)
  )
  select json_build_object(
    'atual',    json_build_object('receita', cur.receita,  'despesa', cur.despesa,  'resultado', cur.receita - cur.despesa),
    'anterior', json_build_object('receita', prev.receita, 'despesa', prev.despesa, 'resultado', prev.receita - prev.despesa),
    'labelAtual',    to_char(p_start, 'DD/MM') || '–' || to_char(p_end, 'DD/MM'),
    'labelAnterior', to_char((p_start - ((p_end - p_start) + 1)), 'DD/MM') || '–' || to_char((p_start - 1), 'DD/MM')
  )
  from cur, prev
$$;
```

- [ ] **Step 2: Aplicar e verificar**

Run:
```bash
cd /Users/victorhugosantanaalmeida/pillot-edilson-version/Finance
/tmp/fp_runsql.sh supabase/migrations/0031_bi_real_data.sql
echo "select public.fn_period_comparison('2026-05-01','2026-05-31');" | /tmp/fp_runsql.sh -
```
Expected: objeto com `atual`, `anterior`, `labelAtual`, `labelAnterior` (labels `01/05–31/05` e `01/04–30/04`).

- [ ] **Step 3: Commit**

```bash
cd /Users/victorhugosantanaalmeida/pillot-edilson-version/Finance
git add supabase/migrations/0031_bi_real_data.sql
git commit -m "feat(bi): fn_period_comparison atual vs anterior"
```

---

### Task 5: RPC `fn_inadimplencia`

**Files:**
- Modify: `supabase/migrations/0031_bi_real_data.sql` (append)

- [ ] **Step 1: Adicionar a função**

Append:

```sql
-- Inadimplencia: vencido nao recebido / total a receber em aberto. Base receivables.
create or replace function public.fn_inadimplencia(p_today date default current_date)
returns json
language sql stable set search_path to 'public' as $$
  with aberto as (
    select * from public.receivables
    where status not in ('recebido', 'recebido_parcial')
  ),
  venc as (
    select *, (p_today - due_date) as dias
    from aberto where due_date < p_today
  ),
  tot as (select coalesce(sum(amount), 0) as total_aberto from aberto),
  ag as (
    select case when dias <= 30 then '0–30 dias'
                when dias <= 60 then '31–60 dias'
                when dias <= 90 then '61–90 dias'
                else '+90 dias' end as faixa,
           sum(amount) as valor, count(*) as qtd
    from venc group by 1
  ),
  meses as (
    select date_trunc('month', (p_today - (s || ' months')::interval))::date as m
    from generate_series(6, 0, -1) s
  ),
  evo as (
    select me.m,
      coalesce(sum(r.amount) filter (
        where r.status not in ('recebido','recebido_parcial') and r.due_date < p_today), 0) as valor,
      coalesce(sum(r.amount), 0) as total
    from meses me
    left join public.receivables r on date_trunc('month', r.due_date) = me.m
    group by me.m
  )
  select json_build_object(
    'taxa', round(((select coalesce(sum(amount),0) from venc) / nullif((select total_aberto from tot), 0)) * 100, 1),
    'valorAtraso', (select coalesce(sum(amount), 0) from venc),
    'clientesInad', (select count(distinct customer_id) from venc),
    'prazoMedioDias', (select coalesce(round(avg(dias)), 0) from venc),
    'aging', (select coalesce(json_agg(json_build_object('faixa', faixa, 'valor', valor, 'qtd', qtd)
              order by case faixa when '0–30 dias' then 1 when '31–60 dias' then 2
                                  when '61–90 dias' then 3 else 4 end), '[]'::json) from ag),
    'evolucao', (select coalesce(json_agg(json_build_object(
                  'mes', to_char(m, 'TMMon'),
                  'taxa', round((valor / nullif(total, 0)) * 100, 1),
                  'valor', valor) order by m), '[]'::json) from evo)
  )
$$;
```

- [ ] **Step 2: Aplicar e verificar**

Run:
```bash
cd /Users/victorhugosantanaalmeida/pillot-edilson-version/Finance
/tmp/fp_runsql.sh supabase/migrations/0031_bi_real_data.sql
echo "select public.fn_inadimplencia();" | /tmp/fp_runsql.sh -
echo "select sum(amount) from receivables where status not in ('recebido','recebido_parcial') and due_date < current_date;" | /tmp/fp_runsql.sh -
```
Expected: `valorAtraso` do RPC = soma direta dos vencidos; `aging` com 4 faixas possíveis; `evolucao` com 7 meses.

- [ ] **Step 3: Commit**

```bash
cd /Users/victorhugosantanaalmeida/pillot-edilson-version/Finance
git add supabase/migrations/0031_bi_real_data.sql
git commit -m "feat(bi): fn_inadimplencia (taxa, aging, evolucao)"
```

---

### Task 6: RPC `fn_cashflow_projection`

**Files:**
- Modify: `supabase/migrations/0031_bi_real_data.sql` (append)

- [ ] **Step 1: Adicionar a função**

Append:

```sql
-- Projecao de caixa semanal (so realista). saldo atual + a receber - a pagar por vencimento.
create or replace function public.fn_cashflow_projection(p_weeks int default 13)
returns json
language sql stable set search_path to 'public' as $$
  with saldo as (
    select coalesce((select sum(opening_balance) from public.accounts), 0)
         + coalesce((select sum(case when type = 'entrada' then amount else -amount end)
                     from public.transactions where date <= current_date), 0) as atual
  ),
  weeks as (
    select gs as wk, (current_date + (gs * 7))::date as fim
    from generate_series(1, p_weeks) gs
  ),
  rec as (
    select due_date, amount from public.receivables
    where status not in ('recebido', 'recebido_parcial') and due_date > current_date
  ),
  pay as (
    select due_date, amount from public.payables
    where status not in ('pago', 'pago_parcial') and due_date > current_date
  ),
  pts as (
    select w.wk, w.fim,
      (select atual from saldo)
      + coalesce((select sum(amount) from rec where due_date <= w.fim), 0)
      - coalesce((select sum(amount) from pay where due_date <= w.fim), 0) as saldo
    from weeks w
  )
  select json_build_object(
    'saldoAtual', (select atual from saldo),
    'pontos', (select coalesce(json_agg(json_build_object('label', 'Sem ' || wk, 'fim', fim, 'saldo', saldo) order by wk), '[]'::json) from pts),
    'menorSaldo', (select min(saldo) from pts),
    'menorLabel', (select 'Sem ' || wk from pts order by saldo asc limit 1),
    'menorFim', (select fim from pts order by saldo asc limit 1),
    'saldoFinal', (select saldo from pts order by wk desc limit 1),
    'dataFinal', (select fim from pts order by wk desc limit 1)
  )
$$;
```

- [ ] **Step 2: Aplicar e verificar**

Run:
```bash
cd /Users/victorhugosantanaalmeida/pillot-edilson-version/Finance
/tmp/fp_runsql.sh supabase/migrations/0031_bi_real_data.sql
echo "select public.fn_cashflow_projection(13);" | /tmp/fp_runsql.sh -
```
Expected: objeto com `saldoAtual`, `pontos` (13 itens), `menorSaldo`, `saldoFinal`.

- [ ] **Step 3: Commit**

```bash
cd /Users/victorhugosantanaalmeida/pillot-edilson-version/Finance
git add supabase/migrations/0031_bi_real_data.sql
git commit -m "feat(bi): fn_cashflow_projection (so realista)"
```

---

### Task 7: Hooks no `lib/analytics-client.ts`

**Files:**
- Modify: `lib/analytics-client.ts` (adicionar hooks novos; trocar assinatura de `useTopClients`/`useTopExpenses`)

- [ ] **Step 1: Adicionar paleta + hooks novos ao fim do arquivo**

Append ao fim de `lib/analytics-client.ts`:

```ts
// ── Paleta de cores do BI (atribuída por índice) ──
export const BI_PALETTE = [
  "var(--accent)", "var(--success)", "var(--purple)", "var(--warning)",
  "var(--danger)", "var(--info)",
]

export interface CategoryChild { nome: string; valor: number }
export interface CategoryRow {
  id: string; categoria: string; valor: number; pct: number
  varPct: number | null; filhos: CategoryChild[]; cor: string
}

export function useCategoryBreakdown(range: DateRange, kind: "entrada" | "saida") {
  const [rows, setRows] = useState<CategoryRow[]>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    let active = true
    setLoading(true)
    const supabase = createClient()
    supabase
      .rpc("fn_category_breakdown", { p_start: isoDate(range.start), p_end: isoDate(range.end), p_kind: kind })
      .then(({ data }) => {
        if (!active) return
        setRows(((data ?? []) as any[]).map((r, i) => ({
          id: r.id, categoria: r.categoria, valor: Number(r.valor ?? 0),
          pct: Number(r.pct ?? 0), varPct: r.varPct === null ? null : Number(r.varPct),
          filhos: ((r.filhos ?? []) as any[]).map((f) => ({ nome: f.nome, valor: Number(f.valor ?? 0) })),
          cor: BI_PALETTE[i % BI_PALETTE.length],
        })))
        setLoading(false)
      })
    return () => { active = false }
  }, [range.start.getTime(), range.end.getTime(), kind])
  return { rows, loading }
}

export interface DrillRow { nome: string; receita: number; despesa: number; varPct: number | null }

export function useDrilldown(range: DateRange, dim: "categoria" | "centro_custo" | "cliente" | "fornecedor") {
  const [rows, setRows] = useState<DrillRow[]>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    let active = true
    setLoading(true)
    const supabase = createClient()
    supabase
      .rpc("fn_drilldown", { p_start: isoDate(range.start), p_end: isoDate(range.end), p_dim: dim })
      .then(({ data }) => {
        if (!active) return
        setRows(((data ?? []) as any[]).map((r) => ({
          nome: r.nome, receita: Number(r.receita ?? 0), despesa: Number(r.despesa ?? 0),
          varPct: r.varPct === null ? null : Number(r.varPct),
        })))
        setLoading(false)
      })
    return () => { active = false }
  }, [range.start.getTime(), range.end.getTime(), dim])
  return { rows, loading }
}

export interface PeriodSide { receita: number; despesa: number; resultado: number }
export interface PeriodComparison { atual: PeriodSide; anterior: PeriodSide; labelAtual: string; labelAnterior: string }
const ZERO_SIDE: PeriodSide = { receita: 0, despesa: 0, resultado: 0 }

export function usePeriodComparison(range: DateRange) {
  const [data, setData] = useState<PeriodComparison>({ atual: ZERO_SIDE, anterior: ZERO_SIDE, labelAtual: "", labelAnterior: "" })
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    let active = true
    setLoading(true)
    const supabase = createClient()
    supabase
      .rpc("fn_period_comparison", { p_start: isoDate(range.start), p_end: isoDate(range.end) })
      .then(({ data: d }) => {
        if (!active) return
        const r = (d ?? {}) as any
        setData({
          atual: { receita: Number(r.atual?.receita ?? 0), despesa: Number(r.atual?.despesa ?? 0), resultado: Number(r.atual?.resultado ?? 0) },
          anterior: { receita: Number(r.anterior?.receita ?? 0), despesa: Number(r.anterior?.despesa ?? 0), resultado: Number(r.anterior?.resultado ?? 0) },
          labelAtual: r.labelAtual ?? "", labelAnterior: r.labelAnterior ?? "",
        })
        setLoading(false)
      })
    return () => { active = false }
  }, [range.start.getTime(), range.end.getTime()])
  return { data, loading }
}

export interface AgingRow { faixa: string; valor: number; qtd: number }
export interface InadEvoRow { mes: string; taxa: number; valor: number }
export interface InadData {
  taxa: number; valorAtraso: number; clientesInad: number; prazoMedioDias: number
  aging: AgingRow[]; evolucao: InadEvoRow[]
}
const ZERO_INAD: InadData = { taxa: 0, valorAtraso: 0, clientesInad: 0, prazoMedioDias: 0, aging: [], evolucao: [] }

export function useInadimplencia() {
  const [data, setData] = useState<InadData>(ZERO_INAD)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    let active = true
    const supabase = createClient()
    supabase.rpc("fn_inadimplencia").then(({ data: d }) => {
      if (!active) return
      const r = (d ?? {}) as any
      setData({
        taxa: Number(r.taxa ?? 0), valorAtraso: Number(r.valorAtraso ?? 0),
        clientesInad: Number(r.clientesInad ?? 0), prazoMedioDias: Number(r.prazoMedioDias ?? 0),
        aging: ((r.aging ?? []) as any[]).map((a) => ({ faixa: a.faixa, valor: Number(a.valor ?? 0), qtd: Number(a.qtd ?? 0) })),
        evolucao: ((r.evolucao ?? []) as any[]).map((e) => ({ mes: e.mes, taxa: Number(e.taxa ?? 0), valor: Number(e.valor ?? 0) })),
      })
      setLoading(false)
    })
    return () => { active = false }
  }, [])
  return { data, loading }
}

export interface ProjPonto { label: string; fim: string; saldo: number }
export interface CashflowProjection {
  saldoAtual: number; pontos: ProjPonto[]; menorSaldo: number
  menorLabel: string; menorFim: string; saldoFinal: number; dataFinal: string
}
const ZERO_PROJ: CashflowProjection = { saldoAtual: 0, pontos: [], menorSaldo: 0, menorLabel: "", menorFim: "", saldoFinal: 0, dataFinal: "" }

export function useCashflowProjection(weeks = 13) {
  const [data, setData] = useState<CashflowProjection>(ZERO_PROJ)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    let active = true
    const supabase = createClient()
    supabase.rpc("fn_cashflow_projection", { p_weeks: weeks }).then(({ data: d }) => {
      if (!active) return
      const r = (d ?? {}) as any
      setData({
        saldoAtual: Number(r.saldoAtual ?? 0),
        pontos: ((r.pontos ?? []) as any[]).map((pt) => ({ label: pt.label, fim: pt.fim, saldo: Number(pt.saldo ?? 0) })),
        menorSaldo: Number(r.menorSaldo ?? 0), menorLabel: r.menorLabel ?? "", menorFim: r.menorFim ?? "",
        saldoFinal: Number(r.saldoFinal ?? 0), dataFinal: r.dataFinal ?? "",
      })
      setLoading(false)
    })
    return () => { active = false }
  }, [weeks])
  return { data, loading }
}
```

- [ ] **Step 2: Trocar `useTopClients`/`useTopExpenses` para receber `range`**

Em `lib/analytics-client.ts`, localizar o bloco existente:

```ts
function useView(view: "v_top_clients" | "v_top_expenses") {
  const [rows, setRows] = useState<RankRow[]>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    let active = true
    const supabase = createClient()
    supabase.from(view).select("*").then(({ data }) => {
      if (!active) return
      setRows(((data ?? []) as any[]).map((r) => ({
        nome: r.nome, valor: Number(r.valor ?? 0), percent: Number(r.percent ?? 0),
      })))
      setLoading(false)
    })
    return () => { active = false }
  }, [view])
  return { rows, loading }
}

export const useTopClients = () => useView("v_top_clients")
export const useTopExpenses = () => useView("v_top_expenses")
```

e substituir **todo** esse bloco por:

```ts
function useRankRpc(fn: "fn_top_clients" | "fn_top_expenses", range: DateRange) {
  const [rows, setRows] = useState<RankRow[]>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    let active = true
    setLoading(true)
    const supabase = createClient()
    supabase.rpc(fn, { p_start: isoDate(range.start), p_end: isoDate(range.end) }).then(({ data }) => {
      if (!active) return
      setRows(((data ?? []) as any[]).map((r) => ({
        nome: r.nome, valor: Number(r.valor ?? 0), percent: Number(r.percent ?? 0),
      })))
      setLoading(false)
    })
    return () => { active = false }
  }, [fn, range.start.getTime(), range.end.getTime()])
  return { rows, loading }
}

export const useTopClients = (range: DateRange) => useRankRpc("fn_top_clients", range)
export const useTopExpenses = (range: DateRange) => useRankRpc("fn_top_expenses", range)
```

- [ ] **Step 3: Build (vai falhar no `bi/page.tsx` — esperado até a Task 13)**

Run:
```bash
cd /Users/victorhugosantanaalmeida/pillot-edilson-version/Finance
npx tsc --noEmit -p tsconfig.json 2>&1 | grep "analytics-client" || echo "analytics-client OK"
```
Expected: nenhum erro de tipo dentro de `lib/analytics-client.ts` (os erros de `bi/page.tsx` por `useTopClients()` sem arg são esperados e corrigidos na Task 13).

- [ ] **Step 4: Commit**

```bash
cd /Users/victorhugosantanaalmeida/pillot-edilson-version/Finance
git add lib/analytics-client.ts
git commit -m "feat(bi): hooks reais (category/drilldown/comparison/inadimplencia/projection) + top por periodo"
```

---

### Task 8: UI — Categorias de Entradas + Gastos por Categoria

**Files:**
- Modify: `app/(app)/bi/page.tsx` (imports; helper `EmptyState`; reescrever `CatDespesas` e `CatReceitas`; remover consts `inadData`/`agingData`; atualizar call-site de `CatReceitas`)

- [ ] **Step 1: Ajustar imports no topo**

Em `app/(app)/bi/page.tsx`, trocar a linha 13–15:

```ts
import { useRevenueSeries, useKpis } from "@/lib/analytics-client"
import { daysBetween } from "@/lib/date-utils"
import { gastoPorCategoria, receitaPorCategoria, GRUPOS_DRE } from "@/lib/accounts-plan"
```

por:

```ts
import {
  useRevenueSeries, useKpis, useCategoryBreakdown, useDrilldown,
  usePeriodComparison, useInadimplencia, useCashflowProjection,
} from "@/lib/analytics-client"
import { daysBetween } from "@/lib/date-utils"
```

(remove o import de `accounts-plan`; `useTopClients`/`useTopExpenses` continuam importados na linha 10.)

- [ ] **Step 2: Remover as consts mock `inadData` e `agingData`**

Apagar as linhas 98–110 (os blocos `const inadData = [...]` e `const agingData = [...]`).

- [ ] **Step 3: Adicionar helper `EmptyState` logo após o componente `TableRow`**

Inserir após o fechamento da função `TableRow` (antes de `const TABS`):

```tsx
function EmptyState({ texto }: { texto: string }) {
  return (
    <div style={{ background:"var(--bg-secondary)",border:"1px solid var(--border)",borderRadius:"var(--radius)",padding:"40px 18px",textAlign:"center",fontSize:"12.5px",color:"var(--text-muted)" }}>
      {texto}
    </div>
  )
}
```

- [ ] **Step 4: Substituir TODA a função `CatDespesas` (linhas ~112–255)**

Substituir por:

```tsx
/* ─── Gastos por Categoria de Despesa ─── */
function CatDespesas({ range, kpis }: { range: any; kpis: any }) {
  const [sortBy, setSortBy] = useState<"valor"|"pct">("valor")
  const [detalhe, setDetalhe] = useState<string|null>(null)
  const { rows } = useCategoryBreakdown(range, "saida")
  const totalDesp = rows.reduce((s,c)=>s+c.valor,0)
  const sorted = [...rows].sort((a,b)=>sortBy==="valor"?b.valor-a.valor:b.pct-a.pct)
  const fmtVar = (v:number|null) => v===null ? "—" : (v>=0?"+":"")+v.toFixed(1).replace(".",",")+"%"

  if (rows.length === 0) return <EmptyState texto="Sem despesas lançadas no período." />

  return (
    <div style={{ display:"flex",flexDirection:"column",gap:"14px" }}>
      <div style={{ background:"var(--bg-secondary)",border:"1px solid var(--border)",borderRadius:"var(--radius)",padding:"14px 18px",display:"flex",alignItems:"center",gap:"14px",flexWrap:"wrap" }}>
        <div>
          <div style={{ fontSize:"13px",fontWeight:700,color:"var(--text-primary)" }}>Onde o Dinheiro Sai</div>
          <div style={{ fontSize:"11px",color:"var(--text-muted)",marginTop:"1px" }}>{range.label} · Total saído: {R(totalDesp)}</div>
        </div>
        <div style={{ marginLeft:"auto",display:"flex",gap:"6px" }}>
          {[["valor","Maior valor"],["pct","Maior %"]].map(([k,l])=>(
            <button key={k} onClick={()=>setSortBy(k as any)} style={{ padding:"5px 12px",borderRadius:"20px",border:"1px solid",borderColor:sortBy===k?"var(--danger)":"var(--border)",background:sortBy===k?"var(--danger-soft)":"transparent",color:sortBy===k?"var(--danger)":"var(--text-secondary)",fontSize:"11.5px",fontWeight:sortBy===k?700:400,cursor:"pointer",fontFamily:"inherit" }}>{l}</button>
          ))}
        </div>
      </div>

      <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:"14px" }}>
        <div style={{ background:"var(--bg-secondary)",border:"1px solid var(--border)",borderRadius:"var(--radius)",padding:"18px" }}>
          <div style={{ fontSize:"13px",fontWeight:700,color:"var(--text-primary)",marginBottom:"16px" }}>Distribuição por Categoria</div>
          {sorted.map((c)=>(
            <div key={c.id} style={{ marginBottom:"14px",cursor:"pointer" }} onClick={()=>setDetalhe(detalhe===c.id?null:c.id)}>
              <div style={{ display:"flex",justifyContent:"space-between",marginBottom:"5px" }}>
                <div style={{ display:"flex",alignItems:"center",gap:"7px" }}>
                  <div style={{ width:"10px",height:"10px",borderRadius:"3px",background:c.cor,flexShrink:0 }}/>
                  <span style={{ fontSize:"12.5px",color:"var(--text-primary)",fontWeight:detalhe===c.id?700:400 }}>{c.categoria}</span>
                </div>
                <div style={{ display:"flex",gap:"12px",alignItems:"center" }}>
                  <span style={{ fontSize:"12px",color:"var(--text-secondary)" }}>{R(c.valor)}</span>
                  <span style={{ fontSize:"12px",fontWeight:700,color:c.cor,minWidth:"40px",textAlign:"right" }}>{c.pct.toFixed(1)}%</span>
                </div>
              </div>
              <div style={{ background:"var(--bg-tertiary)",borderRadius:"4px",height:"7px" }}>
                <div style={{ height:"100%",borderRadius:"4px",background:c.cor,width:`${c.pct}%`,transition:"width 0.3s" }}/>
              </div>
              {detalhe===c.id && c.filhos.length>0 && (
                <div style={{ marginTop:"8px",paddingLeft:"17px",borderLeft:`2px solid ${c.cor}` }}>
                  {c.filhos.map(s=>(
                    <div key={s.nome} style={{ display:"flex",justifyContent:"space-between",padding:"3px 0",fontSize:"11.5px" }}>
                      <span style={{ color:"var(--text-secondary)" }}>{s.nome}</span>
                      <span style={{ fontWeight:600,color:"var(--text-primary)" }}>{R(s.valor)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        <div style={{ background:"var(--bg-secondary)",border:"1px solid var(--border)",borderRadius:"var(--radius)",padding:"18px" }}>
          <div style={{ fontSize:"13px",fontWeight:700,color:"var(--text-primary)",marginBottom:"6px" }}>Relatório de Gastos</div>
          <div style={{ fontSize:"10px",color:"var(--text-muted)",marginBottom:"14px" }}>Clique numa categoria no gráfico para ver subcategorias</div>
          <table style={{ width:"100%",borderCollapse:"collapse" }}>
            <thead>
              <tr style={{ borderBottom:"2px solid var(--border)" }}>
                {["Categoria","Valor","% Total","% Receita","Vs. Anterior"].map(h=>(
                  <th key={h} style={{ padding:"7px 10px",textAlign:h==="Categoria"?"left":"right",fontSize:"10px",color:"var(--text-muted)",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.4px" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map(c=>(
                <TableRow key={c.id}
                  cols={[c.categoria, c.valor, `${c.pct.toFixed(1)}%`, `${((c.valor/Math.max(kpis.faturamento,1))*100).toFixed(1)}%`, fmtVar(c.varPct)]}
                  detail={{ "Valor no período": R(c.valor), "% do total despesas": `${c.pct.toFixed(1)}%`, "% da receita": `${((c.valor/Math.max(kpis.faturamento,1))*100).toFixed(1)}%`, "Variação": fmtVar(c.varPct) }}
                />
              ))}
              <tr style={{ borderTop:"2px solid var(--border)",background:"var(--bg-tertiary)" }}>
                <td style={{ padding:"9px 10px",fontSize:"13px",fontWeight:800,color:"var(--text-primary)" }}>TOTAL</td>
                <td style={{ padding:"9px 10px",textAlign:"right",fontSize:"13px",fontWeight:800,color:"var(--danger)" }}>{R(totalDesp)}</td>
                <td style={{ padding:"9px 10px",textAlign:"right",fontSize:"13px",fontWeight:700,color:"var(--text-primary)" }}>100%</td>
                <td style={{ padding:"9px 10px",textAlign:"right",fontSize:"13px",fontWeight:700,color:"var(--text-primary)" }}>{((totalDesp/Math.max(kpis.faturamento,1))*100).toFixed(1)}%</td>
                <td style={{ padding:"9px 10px",textAlign:"right",fontSize:"12px",color:"var(--text-muted)" }}>—</td>
              </tr>
            </tbody>
          </table>
          {sorted[0] && (
            <div style={{ marginTop:"14px",padding:"12px",background:"var(--danger-soft)",borderRadius:"8px" }}>
              <div style={{ fontSize:"12px",fontWeight:700,color:"var(--danger)",marginBottom:"4px" }}>Onde está o maior custo</div>
              <div style={{ fontSize:"11.5px",color:"var(--text-secondary)",lineHeight:1.6 }}>
                <strong>{sorted[0].categoria}</strong> representa {sorted[0].pct.toFixed(0)}% de todos os gastos ({R(sorted[0].valor)}) no período.
              </div>
            </div>
          )}
        </div>
      </div>

      <div style={{ background:"var(--bg-secondary)",border:"1px solid var(--border)",borderRadius:"var(--radius)",padding:"18px" }}>
        <div style={{ fontSize:"13px",fontWeight:700,color:"var(--text-primary)",marginBottom:"14px" }}>Proporção Visual dos Gastos</div>
        <div style={{ display:"flex",height:"80px",borderRadius:"8px",overflow:"hidden",gap:"2px" }}>
          {sorted.map(c=>(
            <div key={c.id} title={`${c.categoria}: ${R(c.valor)} (${c.pct.toFixed(1)}%)`} style={{ flex:`${c.pct}`,background:c.cor,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"10px",fontWeight:700,color:"#fff",overflow:"hidden",cursor:"pointer",transition:"flex 0.3s" }}>
              {c.pct > 8 && c.pct.toFixed(0)+"%"}
            </div>
          ))}
        </div>
        <div style={{ display:"flex",gap:"14px",marginTop:"10px",flexWrap:"wrap" }}>
          {sorted.map(c=>(
            <div key={c.id} style={{ display:"flex",alignItems:"center",gap:"5px" }}>
              <div style={{ width:"10px",height:"10px",borderRadius:"2px",background:c.cor,flexShrink:0 }}/>
              <span style={{ fontSize:"11px",color:"var(--text-secondary)" }}>{c.categoria.split(" ")[0]} ({c.pct.toFixed(1)}%)</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Substituir TODA a função `CatReceitas` (linhas ~257–393)**

Substituir por:

```tsx
/* ─── Categorias de Entradas (Receitas) ─── */
function CatReceitas({ range }: { range: any }) {
  const { rows } = useCategoryBreakdown(range, "entrada")
  const totalRec = rows.reduce((s,c)=>s+c.valor,0)
  const fmtVar = (v:number|null) => v===null ? "—" : (v>=0?"+":"")+v.toFixed(1).replace(".",",")+"%"
  const top = rows[0]

  if (rows.length === 0) return <EmptyState texto="Sem receitas lançadas no período." />

  return (
    <div style={{ display:"flex",flexDirection:"column",gap:"14px" }}>
      <div style={{ background:"var(--bg-secondary)",border:"1px solid var(--border)",borderRadius:"var(--radius)",padding:"14px 18px",display:"flex",alignItems:"center",gap:"14px",flexWrap:"wrap" }}>
        <div>
          <div style={{ fontSize:"13px",fontWeight:700,color:"var(--text-primary)" }}>De Onde Vem o Dinheiro</div>
          <div style={{ fontSize:"11px",color:"var(--text-muted)",marginTop:"1px" }}>{range.label} · Total recebido: {R(totalRec)}</div>
        </div>
      </div>

      <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:"14px" }}>
        <div style={{ background:"var(--bg-secondary)",border:"1px solid var(--border)",borderRadius:"var(--radius)",padding:"18px" }}>
          <div style={{ fontSize:"13px",fontWeight:700,color:"var(--text-primary)",marginBottom:"16px" }}>Receita por Categoria</div>
          {rows.map((c)=>(
            <div key={c.id} style={{ marginBottom:"16px" }}>
              <div style={{ display:"flex",justifyContent:"space-between",marginBottom:"5px" }}>
                <div style={{ display:"flex",alignItems:"center",gap:"7px" }}>
                  <div style={{ width:"10px",height:"10px",borderRadius:"3px",background:c.cor,flexShrink:0 }}/>
                  <span style={{ fontSize:"12.5px",fontWeight:600,color:"var(--text-primary)" }}>{c.categoria}</span>
                </div>
                <div style={{ display:"flex",gap:"10px" }}>
                  <span style={{ fontSize:"12px",color:"var(--text-secondary)" }}>{R(c.valor)}</span>
                  <span style={{ fontSize:"12px",fontWeight:700,color:c.cor }}>{c.pct.toFixed(1)}%</span>
                </div>
              </div>
              <div style={{ background:"var(--bg-tertiary)",borderRadius:"4px",height:"7px" }}>
                <div style={{ height:"100%",borderRadius:"4px",background:c.cor,width:`${c.pct}%` }}/>
              </div>
              {c.filhos.length>0 && (
                <div style={{ marginTop:"6px",paddingLeft:"17px",borderLeft:`2px solid ${c.cor}40` }}>
                  {c.filhos.map(s=>(
                    <div key={s.nome} style={{ display:"flex",justifyContent:"space-between",padding:"2px 0",fontSize:"11px" }}>
                      <span style={{ color:"var(--text-muted)" }}>{s.nome}</span>
                      <span style={{ color:"var(--text-secondary)",fontWeight:600 }}>{R(s.valor)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        <div style={{ display:"flex",flexDirection:"column",gap:"12px" }}>
          <div style={{ background:"var(--bg-secondary)",border:"1px solid var(--border)",borderRadius:"var(--radius)",padding:"18px" }}>
            <div style={{ fontSize:"13px",fontWeight:700,color:"var(--text-primary)",marginBottom:"12px" }}>Tabela de Receitas por Categoria</div>
            <table style={{ width:"100%",borderCollapse:"collapse" }}>
              <thead>
                <tr style={{ borderBottom:"2px solid var(--border)" }}>
                  {["Categoria","Valor","% Total","Variação"].map(h=>(
                    <th key={h} style={{ padding:"7px 10px",textAlign:h==="Categoria"?"left":"right",fontSize:"10px",color:"var(--text-muted)",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.4px" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((c)=>(
                  <tr key={c.id} style={{ borderBottom:"1px solid var(--border)" }}
                    onMouseEnter={e=>(e.currentTarget.style.background="var(--bg-tertiary)")}
                    onMouseLeave={e=>(e.currentTarget.style.background="transparent")}>
                    <td style={{ padding:"9px 10px",fontSize:"12.5px",fontWeight:500,color:"var(--text-primary)",display:"flex",alignItems:"center",gap:"7px" }}>
                      <div style={{ width:"8px",height:"8px",borderRadius:"2px",background:c.cor,flexShrink:0 }}/>
                      {c.categoria}
                    </td>
                    <td style={{ padding:"9px 10px",textAlign:"right",fontSize:"12.5px",fontWeight:700,color:"var(--success)" }}>{R(c.valor)}</td>
                    <td style={{ padding:"9px 10px",textAlign:"right",fontSize:"12px",color:"var(--text-secondary)" }}>{c.pct.toFixed(1)}%</td>
                    <td style={{ padding:"9px 10px",textAlign:"right",fontSize:"11px",color:c.varPct===null?"var(--text-muted)":c.varPct>=0?"var(--success)":"var(--danger)",fontWeight:600 }}>{fmtVar(c.varPct)}</td>
                  </tr>
                ))}
                <tr style={{ borderTop:"2px solid var(--border)",background:"var(--bg-tertiary)" }}>
                  <td style={{ padding:"9px 10px",fontSize:"13px",fontWeight:800,color:"var(--text-primary)" }}>TOTAL</td>
                  <td style={{ padding:"9px 10px",textAlign:"right",fontSize:"13px",fontWeight:800,color:"var(--success)" }}>{R(totalRec)}</td>
                  <td style={{ padding:"9px 10px",textAlign:"right",fontSize:"12px",fontWeight:700,color:"var(--text-primary)" }}>100%</td>
                  <td style={{ padding:"9px 10px",textAlign:"right",fontSize:"12px",color:"var(--text-muted)" }}>—</td>
                </tr>
              </tbody>
            </table>
          </div>

          {top && (
            <div style={{ background:"var(--bg-secondary)",border:"1px solid var(--border)",borderRadius:"var(--radius)",padding:"16px" }}>
              <div style={{ fontSize:"12px",fontWeight:700,color:"var(--text-primary)",marginBottom:"10px" }}>Análise Automática</div>
              <div style={{ padding:"10px 12px",background:"var(--bg-tertiary)",borderRadius:"7px",borderLeft:`3px solid var(--warning)` }}>
                <div style={{ fontSize:"11.5px",fontWeight:700,color:"var(--warning)",marginBottom:"3px" }}>Concentração de receita</div>
                <div style={{ fontSize:"11px",color:"var(--text-secondary)",lineHeight:1.6 }}>
                  {top.pct.toFixed(1)}% da receita vem de <strong>{top.categoria}</strong>. Diversificar reduz risco e melhora a previsibilidade de caixa.
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 6: Atualizar o call-site de `CatReceitas`**

Localizar (linha ~681):

```tsx
{tab==="cat_receitas" && <CatReceitas range={range} kpis={kpis}/>}
```

e trocar por:

```tsx
{tab==="cat_receitas" && <CatReceitas range={range}/>}
```

- [ ] **Step 7: Build (ainda haverá erros de tabs não migradas — focar nestes 2 componentes)**

Run:
```bash
cd /Users/victorhugosantanaalmeida/pillot-edilson-version/Finance
npm run build 2>&1 | tail -30
```
Expected: nenhum erro citando `CatDespesas`, `CatReceitas`, `gastoPorCategoria`, `receitaPorCategoria`, `inadData`, `agingData`. (Erros remanescentes só de `useTopClients()`/tabs ainda não migradas — corrigidos nas Tasks 9–13.)

- [ ] **Step 8: Commit**

```bash
cd /Users/victorhugosantanaalmeida/pillot-edilson-version/Finance
git add app/\(app\)/bi/page.tsx
git commit -m "feat(bi): categorias de entradas/saidas com dados reais"
```

---

### Task 9: UI — hooks de topo do BiPage + Análise de Períodos

> **Regra dos Hooks:** todos os hooks devem ser chamados no topo de `BiPage`, nunca dentro de `{tab===... && ...}`. Este passo adiciona as chamadas de topo que as Tasks 9–12 consomem.

**Files:**
- Modify: `app/(app)/bi/page.tsx`

- [ ] **Step 1: Atualizar as chamadas de hooks no topo de `BiPage`**

Localizar (linhas ~400–403):

```tsx
  const { series } = useRevenueSeries(range)
  const { kpis }   = useKpis(range)
  const { rows: topClients }  = useTopClients()
  const { rows: topExpenses } = useTopExpenses()
```

e substituir por:

```tsx
  const { series } = useRevenueSeries(range)
  const { kpis }   = useKpis(range)
  const { rows: topClients }  = useTopClients(range)
  const { rows: topExpenses } = useTopExpenses(range)
  const { data: periodCmp }   = usePeriodComparison(range)
  const { data: inad }        = useInadimplencia()
  const { data: projection }  = useCashflowProjection(13)
  const [drillDim, setDrillDim] = useState<"categoria"|"centro_custo"|"cliente"|"fornecedor">("categoria")
  const { rows: drillRows }   = useDrilldown(range, drillDim)
```

- [ ] **Step 2: Substituir TODO o bloco `{tab==="analise" && <>...</>}` (linhas ~733–781)**

```tsx
      {/* ─── ANÁLISE DE PERÍODOS ─── */}
      {tab==="analise" && <>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"16px", marginBottom:"14px" }}>
          <div style={{ background:"var(--bg-secondary)", border:"1px solid var(--border)", borderRadius:"var(--radius)", padding:"18px" }}>
            <div style={{ fontSize:"13px",fontWeight:700,color:"var(--text-primary)",marginBottom:"4px" }}>Período Atual vs Anterior</div>
            <div style={{ fontSize:"10px",color:"var(--text-muted)",marginBottom:"14px" }}>{periodCmp.labelAnterior} → {periodCmp.labelAtual}</div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"10px", marginBottom:"16px" }}>
              {[
                { l:"Receita",   p1:periodCmp.anterior.receita,   p2:periodCmp.atual.receita,   c:"var(--success)" },
                { l:"Despesa",   p1:periodCmp.anterior.despesa,   p2:periodCmp.atual.despesa,   c:"var(--danger)" },
                { l:"Resultado", p1:periodCmp.anterior.resultado, p2:periodCmp.atual.resultado, c:"var(--accent)" },
              ].map(k=>{
                const diff = k.p2 - k.p1
                return (
                <div key={k.l} style={{ background:"var(--bg-tertiary)",borderRadius:"8px",padding:"10px 12px" }}>
                  <div style={{ fontSize:"10px",color:"var(--text-muted)",marginBottom:"4px" }}>{k.l}</div>
                  <div style={{ fontSize:"11px",color:"var(--text-secondary)",marginBottom:"2px" }}>Ant.: {R(k.p1)}</div>
                  <div style={{ fontSize:"11px",color:"var(--text-secondary)",marginBottom:"4px" }}>Atual: {R(k.p2)}</div>
                  <div style={{ fontSize:"13px",fontWeight:800,color:k.c }}>{(diff>=0?"+":"-")+"R$"+Math.abs(Math.round(diff/1000))+"k"}</div>
                </div>
                )
              })}
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={[
                { p:periodCmp.labelAnterior, receita:periodCmp.anterior.receita, despesa:periodCmp.anterior.despesa },
                { p:periodCmp.labelAtual,    receita:periodCmp.atual.receita,    despesa:periodCmp.atual.despesa },
              ]} barGap={8}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false}/>
                <XAxis dataKey="p" tick={{fill:"var(--text-muted)",fontSize:11}} axisLine={false} tickLine={false}/>
                <YAxis hide/>
                <Tooltip content={<Tip/>}/>
                <Bar dataKey="receita" name="Receita" fill="var(--success)" radius={[4,4,0,0]}/>
                <Bar dataKey="despesa" name="Despesa" fill="var(--danger)"  radius={[4,4,0,0]} opacity={0.8}/>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div style={{ background:"var(--bg-secondary)", border:"1px solid var(--border)", borderRadius:"var(--radius)", padding:"18px" }}>
            <div style={{ fontSize:"13px",fontWeight:700,color:"var(--text-primary)",marginBottom:"14px" }}>Análise Automática de Variação</div>
            {(() => {
              const pctv = (a:number,b:number) => b>0 ? ((a-b)/b)*100 : 0
              const recVar = pctv(periodCmp.atual.receita, periodCmp.anterior.receita)
              const despVar = pctv(periodCmp.atual.despesa, periodCmp.anterior.despesa)
              const margAtual = periodCmp.atual.receita>0 ? (periodCmp.atual.resultado/periodCmp.atual.receita)*100 : 0
              const margAnt = periodCmp.anterior.receita>0 ? (periodCmp.anterior.resultado/periodCmp.anterior.receita)*100 : 0
              const fp = (v:number) => (v>=0?"+":"")+v.toFixed(1).replace(".",",")+"%"
              const fpp = (v:number) => (v>=0?"+":"")+v.toFixed(1).replace(".",",")+"pp"
              return [
                { titulo:`Receita ${recVar>=0?"cresceu":"caiu"} ${fp(recVar)}`, desc:`Passou de ${R(periodCmp.anterior.receita)} para ${R(periodCmp.atual.receita)} em relação ao período anterior.`, c:recVar>=0?"var(--success)":"var(--danger)" },
                { titulo:`Despesas ${despVar>=0?"subiram":"caíram"} ${fp(despVar)}`, desc:`Passaram de ${R(periodCmp.anterior.despesa)} para ${R(periodCmp.atual.despesa)}.`, c:despVar<=recVar?"var(--success)":"var(--warning)" },
                { titulo:`Margem ${margAtual>=margAnt?"melhorou":"piorou"} ${fpp(margAtual-margAnt)}`, desc:`Margem líquida passou de ${margAnt.toFixed(1)}% para ${margAtual.toFixed(1)}%.`, c:margAtual>=margAnt?"var(--success)":"var(--danger)" },
              ].map((obs,i)=>(
                <div key={i} style={{ padding:"12px", background:"var(--bg-tertiary)", borderRadius:"8px", borderLeft:`3px solid ${obs.c}`, marginBottom:"10px" }}>
                  <div style={{ fontSize:"12px",fontWeight:700,color:"var(--text-primary)",marginBottom:"4px" }}>{obs.titulo}</div>
                  <div style={{ fontSize:"11px",color:"var(--text-secondary)",lineHeight:1.6 }}>{obs.desc}</div>
                </div>
              ))
            })()}
          </div>
        </div>
      </>}
```

- [ ] **Step 3: Build**

Run:
```bash
cd /Users/victorhugosantanaalmeida/pillot-edilson-version/Finance
npm run build 2>&1 | tail -30
```
Expected: sem erros citando `analise`, `periodCmp`, `useTopClients`, `useTopExpenses`. (Restam só `drilldown`/`inad`/`projecao` que ainda usam literais — corrigidos nas próximas tasks.)

- [ ] **Step 4: Commit**

```bash
cd /Users/victorhugosantanaalmeida/pillot-edilson-version/Finance
git add app/\(app\)/bi/page.tsx
git commit -m "feat(bi): analise de periodos com comparativo real + top por periodo"
```

---

### Task 10: UI — Drill-down por dimensão

**Files:**
- Modify: `app/(app)/bi/page.tsx`

- [ ] **Step 1: Substituir TODO o bloco `{tab==="drilldown" && <>...</>}` (linhas ~783–818)**

```tsx
      {/* ─── DRILL-DOWN ─── */}
      {tab==="drilldown" && <>
        <div style={{ background:"var(--bg-secondary)", border:"1px solid var(--border)", borderRadius:"var(--radius)", padding:"18px" }}>
          <div style={{ display:"flex", alignItems:"center", gap:"12px", marginBottom:"16px", flexWrap:"wrap" }}>
            <div style={{ fontSize:"13px",fontWeight:700,color:"var(--text-primary)" }}>Drill-down por Dimensão</div>
            <div style={{ display:"flex", gap:"6px", marginLeft:"auto", flexWrap:"wrap" }}>
              {([["categoria","Categoria"],["centro_custo","Centro de Custo"],["cliente","Cliente"],["fornecedor","Fornecedor"]] as const).map(([dim,label])=>(
                <button key={dim} onClick={()=>setDrillDim(dim)} style={{ padding:"5px 12px", border:"1px solid", borderColor:drillDim===dim?"var(--accent)":"var(--border)", borderRadius:"6px", background:drillDim===dim?"var(--accent-soft)":"var(--bg-tertiary)", fontSize:"11px", color:drillDim===dim?"var(--accent)":"var(--text-secondary)", fontWeight:drillDim===dim?700:400, cursor:"pointer", fontFamily:"inherit" }}>{label}</button>
              ))}
            </div>
          </div>
          {drillRows.length === 0 ? <EmptyState texto="Sem lançamentos no período para esta dimensão." /> : (
          <table style={{ width:"100%",borderCollapse:"collapse" }}>
            <thead>
              <tr style={{ borderBottom:"2px solid var(--border)" }}>
                {["Nome","Receita","Despesa","Resultado","% Receita","Variação"].map(h=>(
                  <th key={h} style={{ padding:"9px 14px",textAlign:h==="Nome"?"left":"right",fontSize:"10px",color:"var(--text-muted)",textTransform:"uppercase",letterSpacing:"0.4px",fontWeight:700,background:"var(--bg-tertiary)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(() => {
                const totalRec = drillRows.reduce((s,r)=>s+r.receita,0)
                const fv = (v:number|null) => v===null ? "—" : (v>=0?"+":"")+v.toFixed(1).replace(".",",")+"%"
                return drillRows.map(r=>(
                  <TableRow key={r.nome}
                    cols={[r.nome, r.receita>0?r.receita:"—", r.despesa, r.receita-r.despesa, totalRec>0?`${((r.receita/totalRec)*100).toFixed(1)}%`:"—", fv(r.varPct)]}
                    detail={{ "Margem bruta": r.receita>0?`${(((r.receita-r.despesa)/r.receita)*100).toFixed(1)}%`:"—", "Variação resultado": fv(r.varPct), "Participação receita": totalRec>0?`${((r.receita/totalRec)*100).toFixed(1)}%`:"—" }}
                  />
                ))
              })()}
            </tbody>
          </table>
          )}
        </div>
      </>}
```

- [ ] **Step 2: Build**

Run:
```bash
cd /Users/victorhugosantanaalmeida/pillot-edilson-version/Finance
npm run build 2>&1 | tail -30
```
Expected: sem erros citando `drilldown`/`drillRows`/`drillDim`.

- [ ] **Step 3: Commit**

```bash
cd /Users/victorhugosantanaalmeida/pillot-edilson-version/Finance
git add app/\(app\)/bi/page.tsx
git commit -m "feat(bi): drill-down por dimensao com dados reais"
```

---

### Task 11: UI — Inadimplência

**Files:**
- Modify: `app/(app)/bi/page.tsx`

- [ ] **Step 1: Substituir TODO o bloco `{tab==="inad" && <>...</>}` (linhas ~820–886)**

Substituir por (consome `inad` já disponível no topo do `BiPage`, vindo de `useInadimplencia()`):

```tsx
      {/* ─── INADIMPLÊNCIA ─── */}
      {tab==="inad" && <>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:"10px", marginBottom:"16px" }}>
          {[
            { l:"Taxa de Inadimplência", v:`${inad.taxa.toFixed(1).replace(".",",")}%`, c:"var(--danger)" },
            { l:"Valor Total em Atraso",  v:R(inad.valorAtraso), c:"var(--danger)" },
            { l:"Clientes Inadimplentes", v:String(inad.clientesInad), c:"var(--warning)" },
            { l:"Prazo Médio de Atraso",  v:`${inad.prazoMedioDias} dias`, c:"var(--warning)" },
          ].map(k=>(
            <div key={k.l} style={{ background:"var(--bg-secondary)", border:`1px solid ${k.c}28`, borderLeft:`3px solid ${k.c}`, borderRadius:"var(--radius)", padding:"12px 14px" }}>
              <div style={{ fontSize:"10px",color:"var(--text-muted)",textTransform:"uppercase",marginBottom:"5px" }}>{k.l}</div>
              <div style={{ fontSize:"19px",fontWeight:800,color:k.c }}>{k.v}</div>
            </div>
          ))}
        </div>
        {inad.valorAtraso === 0 && inad.aging.length === 0 ? (
          <EmptyState texto="Nenhum título a receber vencido em aberto. Inadimplência zerada." />
        ) : (
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"14px" }}>
          <div style={{ background:"var(--bg-secondary)", border:"1px solid var(--border)", borderRadius:"var(--radius)", padding:"18px" }}>
            <div style={{ fontSize:"13px",fontWeight:700,color:"var(--text-primary)",marginBottom:"14px" }}>Evolução da Taxa de Inadimplência</div>
            <ResponsiveContainer width="100%" height={220}>
              <ComposedChart data={inad.evolucao}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false}/>
                <XAxis dataKey="mes" tick={{fill:"var(--text-muted)",fontSize:10}} axisLine={false} tickLine={false}/>
                <YAxis yAxisId="taxa" tick={{fill:"var(--text-muted)",fontSize:10}} axisLine={false} tickLine={false} tickFormatter={v=>`${v}%`}/>
                <YAxis yAxisId="valor" orientation="right" hide/>
                <Tooltip content={<Tip/>}/>
                <ReferenceLine yAxisId="taxa" y={5} stroke="var(--success)" strokeDasharray="5 3" label={{value:"Limite 5%",fill:"var(--success)",fontSize:10}}/>
                <Bar  yAxisId="valor" dataKey="valor" name="Valor (R$)" fill="var(--danger)" opacity={0.3} radius={[3,3,0,0]}/>
                <Line yAxisId="taxa" type="monotone" dataKey="taxa" name="Taxa %" stroke="var(--danger)" strokeWidth={2.5} dot={{r:5,fill:"var(--danger)"}}/>
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <div style={{ background:"var(--bg-secondary)", border:"1px solid var(--border)", borderRadius:"var(--radius)", padding:"18px" }}>
            <div style={{ fontSize:"13px",fontWeight:700,color:"var(--text-primary)",marginBottom:"14px" }}>Aging Report — Tempo em Atraso</div>
            {inad.aging.length === 0 ? <EmptyState texto="Sem títulos vencidos." /> : <>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={inad.aging} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false}/>
                <XAxis type="number" hide/>
                <YAxis type="category" dataKey="faixa" tick={{fill:"var(--text-muted)",fontSize:11}} axisLine={false} tickLine={false} width={90}/>
                <Tooltip content={<Tip/>}/>
                <Bar dataKey="valor" name="Valor em Atraso" fill="var(--danger)" radius={[0,4,4,0]}/>
              </BarChart>
            </ResponsiveContainer>
            <div style={{ marginTop:"12px" }}>
              <table style={{ width:"100%",borderCollapse:"collapse" }}>
                <thead>
                  <tr style={{ borderBottom:"1px solid var(--border)" }}>
                    {["Faixa","Valor","Qtd"].map(h=>(
                      <th key={h} style={{ padding:"6px 10px",textAlign:h==="Faixa"?"left":"right",fontSize:"10px",color:"var(--text-muted)",fontWeight:700 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {inad.aging.map(a=>(
                    <TableRow key={a.faixa}
                      cols={[a.faixa, a.valor, `${a.qtd} cobranças`]}
                      detail={{ "Risco de perda": a.faixa==="+90 dias"?"Alto":"Médio", "% do total em atraso": inad.valorAtraso>0?`${((a.valor/inad.valorAtraso)*100).toFixed(1)}%`:"—" }}
                    />
                  ))}
                </tbody>
              </table>
            </div>
            </>}
          </div>
        </div>
        )}
      </>}
```

> **Nota:** os imports de recharts (`ComposedChart`, `ReferenceLine`, `BarChart`, `Line`, `Bar`, `Area`, `AreaChart`, etc.) já existem no topo do arquivo (usados pelas tabs reais). Nenhum novo import de gráfico é necessário.

- [ ] **Step 2: Build**

Run:
```bash
cd /Users/victorhugosantanaalmeida/pillot-edilson-version/Finance
npm run build 2>&1 | tail -30
```
Expected: sem erros citando `inad`, `inadData`, `agingData`.

- [ ] **Step 3: Commit**

```bash
cd /Users/victorhugosantanaalmeida/pillot-edilson-version/Finance
git add app/\(app\)/bi/page.tsx
git commit -m "feat(bi): inadimplencia com dados reais (taxa, aging, evolucao)"
```

---

### Task 12: UI — Projeção de Caixa (só realista)

**Files:**
- Modify: `app/(app)/bi/page.tsx`

- [ ] **Step 1: Substituir TODO o bloco `{tab==="projecao" && <>...</>}` (linhas ~888–950)**

Substituir por (consome `projection` já disponível no topo do `BiPage`, vindo de `useCashflowProjection(13)`; remove os cenários otimista/pessimista e a série mock):

```tsx
      {/* ─── PROJEÇÃO DE CAIXA ─── */}
      {tab==="projecao" && <>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:"10px", marginBottom:"16px" }}>
          {[
            { l:"Saldo Atual",           v:R(projection.saldoAtual), d:"", c:"var(--accent)" },
            { l:"Menor Saldo Projetado", v:R(projection.menorSaldo), d:projection.menorFim ? fmtDM(projection.menorFim) : "", c:projection.menorSaldo<0?"var(--danger)":"var(--warning)" },
            { l:"Saldo Final Projetado", v:R(projection.saldoFinal), d:projection.dataFinal ? fmtDM(projection.dataFinal) : "", c:projection.saldoFinal>=projection.saldoAtual?"var(--success)":"var(--warning)" },
          ].map(k=>(
            <div key={k.l} style={{ background:"var(--bg-secondary)", border:`1px solid ${k.c}28`, borderLeft:`3px solid ${k.c}`, borderRadius:"var(--radius)", padding:"14px 16px" }}>
              <div style={{ fontSize:"10px",color:"var(--text-muted)",textTransform:"uppercase",marginBottom:"5px" }}>{k.l}</div>
              <div style={{ fontSize:"20px",fontWeight:800,color:k.c }}>{k.v}</div>
              {k.d && <div style={{ fontSize:"10px",color:"var(--text-muted)",marginTop:"3px" }}>{k.d}</div>}
            </div>
          ))}
        </div>
        <div style={{ background:"var(--bg-secondary)", border:"1px solid var(--border)", borderRadius:"var(--radius)", padding:"18px", marginBottom:"14px" }}>
          <div style={{ fontSize:"13px",fontWeight:700,color:"var(--text-primary)",marginBottom:"6px" }}>Projeção de Saldo — {projection.pontos.length} semanas</div>
          <div style={{ display:"flex", gap:"16px", marginBottom:"14px" }}>
            {[["—","Saldo Atual","var(--success)"],["---","Projetado (realista)","var(--accent)"]].map(([s,l,c])=>(
              <div key={l as string} style={{ display:"flex",alignItems:"center",gap:"5px" }}>
                <div style={{ width:"24px",height:"2px",background:c as string, borderRadius:"2px" }}/>
                <span style={{ fontSize:"10px",color:"var(--text-secondary)" }}>{l}</span>
              </div>
            ))}
          </div>
          {projection.pontos.length === 0 ? <EmptyState texto="Sem dados suficientes para projetar o caixa." /> : (
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={[
              { label:"Hoje", real:projection.saldoAtual, proj:projection.saldoAtual },
              ...projection.pontos.map(p=>({ label:p.label, real:null as number|null, proj:p.saldo })),
            ]}>
              <defs>
                <linearGradient id="projAreaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.15}/>
                  <stop offset="95%" stopColor="var(--accent)" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false}/>
              <XAxis dataKey="label" tick={{fill:"var(--text-muted)",fontSize:10}} axisLine={false} tickLine={false}/>
              <YAxis tick={{fill:"var(--text-muted)",fontSize:10}} axisLine={false} tickLine={false} tickFormatter={v=>`R$${(v/1000).toFixed(0)}k`}/>
              <Tooltip content={<Tip/>}/>
              <ReferenceLine y={0} stroke="var(--danger)" strokeDasharray="6 3" label={{value:"Zona de risco",fill:"var(--danger)",fontSize:10}}/>
              <Area type="monotone" dataKey="real" name="Saldo Atual" stroke="var(--success)" fill="none"              strokeWidth={2.5}/>
              <Area type="monotone" dataKey="proj" name="Realista"    stroke="var(--accent)"  fill="url(#projAreaGrad)" strokeWidth={2} strokeDasharray="5 3"/>
            </AreaChart>
          </ResponsiveContainer>
          )}
        </div>
        {projection.menorSaldo < projection.saldoAtual && projection.menorFim && (
          <div style={{ background:"var(--warning-soft)", border:"1px solid rgba(245,158,11,0.3)", borderRadius:"var(--radius)", padding:"12px 16px" }}>
            <div style={{ display:"flex", alignItems:"center", gap:"8px" }}>
              <Info size={14} style={{ color:"var(--warning)", flexShrink:0 }}/>
              <span style={{ fontSize:"12px",color:"var(--warning)" }}>
                O saldo atingirá o menor valor em <strong>{projection.menorLabel} ({fmtDM(projection.menorFim)}): {R(projection.menorSaldo)}</strong>. Considere antecipar recebimentos ou postergar pagamentos não essenciais nessa semana.
              </span>
            </div>
          </div>
        )}
      </>}
```

- [ ] **Step 2: Adicionar o helper `fmtDM` (formata `YYYY-MM-DD` → `DD/MM`) logo após o helper `EmptyState`**

Inserir após a função `EmptyState` (Task 8 Step 3):

```tsx
function fmtDM(iso: string): string {
  const [, m, d] = iso.split("-")
  return `${d}/${m}`
}
```

- [ ] **Step 3: Build**

Run:
```bash
cd /Users/victorhugosantanaalmeida/pillot-edilson-version/Finance
npm run build 2>&1 | tail -30
```
Expected: sem erros citando `projecao`, `projection`, `otimista`, `pessimista`.

- [ ] **Step 4: Commit**

```bash
cd /Users/victorhugosantanaalmeida/pillot-edilson-version/Finance
git add app/\(app\)/bi/page.tsx
git commit -m "feat(bi): projecao de caixa real (so realista, 13 semanas)"
```

---

### Task 13: Limpeza final — KPIs secundários mock, views antigas, build/lint/push

**Files:**
- Modify: `app/(app)/bi/page.tsx` (remover KPIs secundários mock e tooltips de variação inventados)
- Modify: `supabase/migrations/0031_bi_real_data.sql` (drop das views antigas)

- [ ] **Step 1: Remover os KPIs secundários mock na tab Receitas**

Localizar (linhas ~566–568, dentro de `{tab==="receitas" && ...}`):

```tsx
            { l:"Clientes Ativos",  v:"12",  s:"" },
            { l:"Recorrência",      v:"35%", s:"da receita" },
```

Apagar essas duas linhas do array de KPIs secundários (mantendo os KPIs com base real, como Faturamento/Ticket Médio). Se a remoção deixar o array com formatação quebrada (vírgula sobrando), ajustar a vírgula.

- [ ] **Step 2: Remover os KPIs secundários mock na tab Despesas**

Localizar (linhas ~626–628, dentro de `{tab==="despesas" && ...}`):

```tsx
            { l:"Fornecedores Ativos", v:"31", s:"" },
            { l:"Fixas vs Variáveis",  v:"34%/66%", s:"" },
```

Apagar essas duas linhas. Ajustar vírgula remanescente se necessário.

- [ ] **Step 3: Remover os tooltips de variação inventados no `TableRow` (Receitas/Despesas)**

Localizar nas tabs Receitas/Despesas os `detail={{ ... }}` que contêm chaves de variação com valores hardcoded (ex.: linhas ~610–611 e ~671: `"Variação vs anterior": "+12%"` e similares). Substituir o valor literal por `"—"` quando não houver base real disponível naquele ponto, OU remover a chave de variação do objeto `detail`. Manter as demais chaves reais.

> Como cada `detail` é específico, a regra é: **nenhum número de variação literal pode permanecer**. Se a linha já tem acesso à variação real (ex.: via `c.varPct`), usar; senão, `"—"`.

- [ ] **Step 4: Verificar que NÃO restou nenhum dado mock no arquivo**

Run:
```bash
cd /Users/victorhugosantanaalmeida/pillot-edilson-version/Finance
grep -nE "284750|162400|295100|51800|19,9|Clientes Ativos|Fornecedores Ativos|Fixas vs|otimista|pessimista|inadData|agingData|gastoPorCategoria|receitaPorCategoria|accounts-plan" app/\(app\)/bi/page.tsx || echo "LIMPO — nenhum mock remanescente"
```
Expected: `LIMPO — nenhum mock remanescente`.

- [ ] **Step 5: Drop das views antigas (substituídas por `fn_top_clients`/`fn_top_expenses`)**

Append em `supabase/migrations/0031_bi_real_data.sql`:

```sql
-- Views antigas (ignoravam o filtro de data) substituidas pelas RPCs acima.
drop view if exists public.v_top_clients;
drop view if exists public.v_top_expenses;
```

Aplicar:
```bash
cd /Users/victorhugosantanaalmeida/pillot-edilson-version/Finance
/tmp/fp_runsql.sh supabase/migrations/0031_bi_real_data.sql
echo "select table_name from information_schema.views where table_schema='public' and table_name in ('v_top_clients','v_top_expenses');" | /tmp/fp_runsql.sh -
```
Expected: a última query retorna vazio (views removidas).

- [ ] **Step 6: Build + Lint finais**

Run:
```bash
cd /Users/victorhugosantanaalmeida/pillot-edilson-version/Finance
npm run build 2>&1 | tail -20
npm run lint 2>&1 | tail -20
```
Expected: build sem erros; lint sem erros novos.

- [ ] **Step 7: Commit**

```bash
cd /Users/victorhugosantanaalmeida/pillot-edilson-version/Finance
git add app/\(app\)/bi/page.tsx supabase/migrations/0031_bi_real_data.sql
git commit -m "chore(bi): remove KPIs mock e dropa views antigas; BI 100% dados reais"
```

- [ ] **Step 8: Push para `main` e `feat/supabase-backend`**

```bash
cd /Users/victorhugosantanaalmeida/pillot-edilson-version/Finance
PAT='<GITHUB_PAT>'; SHA=$(git rev-parse HEAD)
git -c credential.helper= push "https://${PAT}@github.com/edilson-finance/finance-pillot.git" ${SHA}:refs/heads/main ${SHA}:refs/heads/feat/supabase-backend
```
Expected: ambos os refs atualizados. (Usar o GitHub PAT de `/tmp/fp_runsql.sh`/ambiente; NUNCA commitar o token.)

---

## Self-Review (writing-plans)

**1. Cobertura da spec:** As 7 frentes mockadas da spec estão cobertas — Top/Concentração (Tasks 1,7,9), Categorias entrada/saída (Tasks 2,7,8), Drill-down (Tasks 3,7,10), Comparativo/Análise de Períodos (Tasks 4,7,9), Inadimplência (Tasks 5,7,11), Projeção (Tasks 6,7,12), KPIs secundários mock (Task 13). Comparativo Mensal já era real (fora de escopo, conforme spec).

**2. Placeholders:** Nenhum "TBD"/"TODO"/"etc." em passos de código. Cada Step traz SQL/TSX completo ou comando exato com saída esperada.

**3. Consistência de tipos:** Hooks (Task 7) expõem `CategoryRow{id,categoria,valor,pct,varPct,filhos,cor}`, `DrillRow{nome,receita,despesa,varPct}`, `PeriodComparison{atual,anterior,labelAtual,labelAnterior}`, `InadData{taxa,valorAtraso,clientesInad,prazoMedioDias,aging,evolucao}`, `CashflowProjection{saldoAtual,pontos,menorSaldo,menorLabel,menorFim,saldoFinal,dataFinal}` — e o JSON dos RPCs (Tasks 2–6) usa exatamente essas chaves. UI (Tasks 8–12) consome os mesmos nomes. `useTopClients(range)`/`useTopExpenses(range)` recebem `range` e o call-site (Task 9 Step 1) passa `range`.

**4. Regra dos Hooks:** Todos os hooks novos são chamados no topo de `BiPage` (Task 9 Step 1); os blocos `{tab===... && ...}` apenas leem variáveis derivadas e IIFEs sem hooks.

---

## Execution Handoff

Plano completo e salvo em `docs/superpowers/plans/2026-06-05-bi-dados-reais.md`. Duas opções de execução:

**1. Subagent-Driven (recomendado)** — despacho um subagente novo por task, com revisão entre tasks (spec + qualidade), iteração rápida.

**2. Inline Execution** — executo as tasks nesta sessão, com checkpoints para revisão.

Qual abordagem você prefere?
