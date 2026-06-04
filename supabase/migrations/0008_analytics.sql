-- 0008_analytics.sql — analytics functions + views (invoker rights; RLS of caller applies)

-- KPIs for a period
create or replace function public.fn_kpis(p_start date, p_end date)
returns json language sql stable set search_path = public as $$
  with t as (
    select * from public.transactions where date between p_start and p_end
  ),
  agg as (
    select
      coalesce(sum(amount) filter (where type='entrada'),0)                         as faturamento,
      coalesce(sum(amount) filter (where type='saida'),0)                           as despesa_total,
      coalesce(sum(case when type='entrada' then amount else -amount end),0)         as lucro,
      count(*) filter (where type='entrada')                                         as num_entradas
    from t
  ),
  arec as (
    select coalesce(sum(amount) filter (where status<>'recebido'),0)  as a_receber,
           coalesce(sum(amount) filter (where status='em_atraso'),0)   as a_receber_venc
    from public.receivables
  ),
  apag as (
    select coalesce(sum(amount) filter (where status<>'pago'),0)      as a_pagar,
           coalesce(sum(amount) filter (where status='em_atraso'),0)   as a_pagar_venc
    from public.payables
  ),
  saldo as (
    select coalesce((select sum(opening_balance) from public.accounts),0)
         + coalesce((select sum(case when type='entrada' then amount else -amount end) from public.transactions),0) as saldo_atual
  )
  select json_build_object(
    'faturamento',     agg.faturamento,
    'despesaTotal',    agg.despesa_total,
    'lucroLiquido',    agg.lucro,
    'numEntradas',     agg.num_entradas,
    'ticketMedio',     case when agg.num_entradas>0 then round(agg.faturamento/agg.num_entradas,2) else 0 end,
    'aReceber',        arec.a_receber,
    'aReceberVencido', arec.a_receber_venc,
    'aPagar',          apag.a_pagar,
    'aPagarVencido',   apag.a_pagar_venc,
    'saldoAtual',      saldo.saldo_atual,
    'saldoProjetado',  saldo.saldo_atual + arec.a_receber - apag.a_pagar
  )
  from agg, arec, apag, saldo
$$;

-- Monthly revenue vs expense series
create or replace function public.fn_revenue_expense(p_start date, p_end date)
returns table(mes text, receita numeric, despesa numeric)
language sql stable set search_path = public as $$
  select
    to_char(date_trunc('month', date), 'TMMon') as mes,
    coalesce(sum(amount) filter (where type='entrada'),0) as receita,
    coalesce(sum(amount) filter (where type='saida'),0)   as despesa
  from public.transactions
  where date between p_start and p_end
  group by date_trunc('month', date)
  order by date_trunc('month', date)
$$;

-- Cashflow ledger with running balance
create or replace function public.fn_cashflow(p_start date, p_end date)
returns table(data date, descricao text, categoria text, entrada numeric, saida numeric, saldo numeric)
language sql stable set search_path = public as $$
  with base as (
    select t.date as data,
           coalesce(t.description,'') as descricao,
           coalesce(c.name,'—') as categoria,
           case when t.type='entrada' then t.amount else 0 end as entrada,
           case when t.type='saida'   then t.amount else 0 end as saida,
           case when t.type='entrada' then t.amount else -t.amount end as delta,
           t.created_at
    from public.transactions t
    left join public.categories c on c.id = t.category_id
    where t.date between p_start and p_end
  )
  select data, descricao, categoria, entrada, saida,
         (coalesce((select sum(opening_balance) from public.accounts),0)
          + sum(delta) over (order by data, created_at rows between unbounded preceding and current row)) as saldo
  from base
  order by data desc, created_at desc
$$;

-- DRE (managerial income statement) as hierarchical JSON from real data
create or replace function public.fn_dre(p_start date, p_end date)
returns json language sql stable set search_path = public as $$
  with t as (select * from public.transactions where date between p_start and p_end),
  receita as (select coalesce(sum(amount),0) v from t where type='entrada'),
  despesa_cat as (
    select coalesce(c.name,'Sem categoria') nome, sum(t.amount) v
    from t left join public.categories c on c.id=t.category_id
    where t.type='saida' group by c.name
  ),
  despesa_total as (select coalesce(sum(v),0) v from despesa_cat),
  receita_cat as (
    select coalesce(c.name,'Sem categoria') nome, sum(t.amount) v
    from t left join public.categories c on c.id=t.category_id
    where t.type='entrada' group by c.name
  )
  select json_build_array(
    json_build_object('id','receita_bruta','label','Receita Bruta','tipo','total',
      'valor',(select v from receita),
      'percent',100,
      'filhos',coalesce((select json_agg(json_build_object('label',nome,'valor',v,
                 'percent',round((v/nullif((select v from receita),0))*100,1))) from receita_cat),'[]'::json)),
    json_build_object('id','receita_liquida','label','Receita Líquida','tipo','resultado',
      'valor',(select v from receita),
      'percent',100),
    json_build_object('id','custos_despesas','label','(–) Custos e Despesas','tipo','negativo',
      'valor',-(select v from despesa_total),
      'percent',round(-(select v from despesa_total)/nullif((select v from receita),0)*100,1),
      'filhos',coalesce((select json_agg(json_build_object('label',nome,'valor',-v,
                 'percent',round((-v/nullif((select v from receita),0))*100,1)) order by v desc) from despesa_cat),'[]'::json)),
    json_build_object('id','lucro_liquido','label','= LUCRO LÍQUIDO','tipo','lucro',
      'valor',(select v from receita)-(select v from despesa_total),
      'percent',round(((select v from receita)-(select v from despesa_total))/nullif((select v from receita),0)*100,1))
  )
$$;

-- Top clients by receivable volume
create or replace view public.v_top_clients with (security_invoker=on) as
  with totals as (
    select coalesce(cu.name,'—') nome, sum(r.amount) valor
    from public.receivables r
    left join public.customers cu on cu.id=r.customer_id
    group by cu.name
  ), grand as (select coalesce(sum(valor),0) g from totals)
  select nome, valor, round((valor/nullif((select g from grand),0))*100,1) as percent
  from totals order by valor desc;

-- Top expenses by category (payables + saida transactions)
create or replace view public.v_top_expenses with (security_invoker=on) as
  with totals as (
    select coalesce(c.name,'Outros') nome, sum(p.amount) valor
    from public.payables p left join public.categories c on c.id=p.category_id
    group by c.name
  ), grand as (select coalesce(sum(valor),0) g from totals)
  select nome, valor, round((valor/nullif((select g from grand),0))*100,1) as percent
  from totals order by valor desc;

-- Financial health dimensions derived from KPIs (heuristic notes, real primitives)
create or replace function public.fn_health_dimensions()
returns json language sql stable set search_path = public as $$
  with k as (select public.fn_kpis(date_trunc('month',current_date)::date,
                                    (date_trunc('month',current_date)+interval '1 month -1 day')::date) j),
  m as (
    select (j->>'faturamento')::numeric fat,
           (j->>'despesaTotal')::numeric desp,
           (j->>'lucroLiquido')::numeric lucro,
           (j->>'aReceber')::numeric arec,
           (j->>'aReceberVencido')::numeric avenc,
           (j->>'saldoAtual')::numeric saldo
    from k
  )
  select json_build_array(
    json_build_object('nome','Caixa',
      'nota',least(10,round(greatest(0, saldo / nullif(desp,0))*5,1)),
      'status',case when saldo>desp then 'saudavel' when saldo>0 then 'atencao' else 'critico' end,
      'descricao','Saldo atual de '||to_char(saldo,'FM999G999G990D00')),
    json_build_object('nome','Lucro',
      'nota',least(10,greatest(0,round((lucro/nullif(fat,0))*100/1.0,1))),
      'status',case when fat>0 and lucro/nullif(fat,0)>=0.1 then 'saudavel' when lucro>0 then 'atencao' else 'critico' end,
      'descricao','Margem líquida de '||coalesce(round((lucro/nullif(fat,0))*100,1)::text,'0')||'%'),
    json_build_object('nome','Inadimplência',
      'nota',case when arec>0 then greatest(0,round(10-(avenc/nullif(arec,0))*20,1)) else 8 end,
      'status',case when arec=0 or avenc/nullif(arec,0)<0.05 then 'saudavel' when avenc/nullif(arec,0)<0.15 then 'atencao' else 'critico' end,
      'descricao',coalesce(round((avenc/nullif(arec,0))*100,1)::text,'0')||'% dos recebíveis em atraso'),
    json_build_object('nome','Despesas',
      'nota',case when fat>0 then greatest(0,round(10-(desp/nullif(fat,0))*8,1)) else 5 end,
      'status',case when fat>0 and desp/nullif(fat,0)<0.8 then 'saudavel' else 'atencao' end,
      'descricao','Despesas representam '||coalesce(round((desp/nullif(fat,0))*100,1)::text,'0')||'% da receita')
  ) from m
$$;
