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
