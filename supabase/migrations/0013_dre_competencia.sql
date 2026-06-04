-- 0013_dre_competencia.sql — DRE por regime de competência.
--
-- Antes: fn_dre lia apenas da tabela `transactions`, que só recebe linhas
-- quando uma receita/despesa é baixada (recebido/pago). Isso fazia o DRE
-- ignorar lançamentos ainda "A Receber"/"A Pagar" (regime de caixa).
--
-- Agora: o DRE conta receitas (receivables) e despesas (payables) pela data
-- de competência (due_date), independentemente da baixa. O Fluxo de Caixa
-- (fn_cashflow) continua sendo apenas o realizado (regime de caixa).

create or replace function public.fn_dre(p_start date, p_end date)
returns json language sql stable set search_path = public as $$
  with rec as (
    select * from public.receivables where due_date between p_start and p_end
  ),
  pay as (
    select * from public.payables where due_date between p_start and p_end
  ),
  receita as (select coalesce(sum(amount),0) v from rec),
  despesa_cat as (
    select coalesce(c.name,'Sem categoria') nome, sum(p.amount) v
    from pay p left join public.categories c on c.id=p.category_id
    group by c.name
  ),
  despesa_total as (select coalesce(sum(v),0) v from despesa_cat),
  receita_cat as (
    select coalesce(c.name,'Sem categoria') nome, sum(r.amount) v
    from rec r left join public.categories c on c.id=r.category_id
    group by c.name
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
