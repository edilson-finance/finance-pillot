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
