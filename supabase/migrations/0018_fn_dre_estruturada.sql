-- 0018_fn_dre_estruturada.sql — DRE gerencial estruturada por posição.
-- Substitui o agrupamento por nome (0013) por posição-DRE com sinal de dre_groups.
-- Mantém regime de competência (due_date, sem filtro de status) como a versão anterior.
-- Saída: array JSON de linhas {id,label,tipo,valor,percent,filhos[{label,valor,percent}]}
-- — mesmo contrato que a página DRE já consome via useDre().

create or replace function public.fn_dre(p_start date, p_end date)
returns json
language sql
stable
set search_path to 'public'
as $function$
  with mov as (
    select r.category_id, r.amount from public.receivables r where r.due_date between p_start and p_end
    union all
    select p.category_id, p.amount from public.payables p where p.due_date between p_start and p_end
  ),
  g as (
    select dg.dre_position, dg.grupo, dg.label, dg.ordem, dg.sinal,
           coalesce(sum(m.amount), 0) as bruto
    from public.dre_groups dg
    left join public.categories c on c.grupo = dg.grupo
    left join mov m on m.category_id = c.id
    group by dg.dre_position, dg.grupo, dg.label, dg.ordem, dg.sinal
  ),
  gv as (
    select dre_position, grupo, label, ordem, (bruto * sinal) as v
    from g
    where bruto <> 0
  ),
  pos as (
    select dre_position, coalesce(sum(v), 0) as v from gv group by dre_position
  ),
  t as (
    select
      coalesce((select v from pos where dre_position = 'receita_bruta'), 0)        as rb,
      coalesce((select v from pos where dre_position = 'deducoes'), 0)             as ded,
      coalesce((select v from pos where dre_position = 'lucro_bruto'), 0)          as cst,
      coalesce((select v from pos where dre_position = 'desp_operacional'), 0)     as despop,
      coalesce((select v from pos where dre_position = 'ebitda'), 0)               as dep,
      coalesce((select v from pos where dre_position = 'resultado_financeiro'), 0) as resfin,
      coalesce((select v from pos where dre_position = 'lair'), 0)                 as ircsll
  )
  select json_build_array(
    json_build_object('id','receita_bruta','label','Receita Bruta de Vendas e Serviços','tipo','total',
      'valor', t.rb, 'percent', 100,
      'filhos', (select coalesce(json_agg(json_build_object('label',label,'valor',v,
                  'percent', round((v/nullif(t.rb,0))*100,1)) order by ordem),'[]'::json)
                 from gv where dre_position='receita_bruta')),
    json_build_object('id','deducoes','label','(–) Deduções da Receita','tipo','negativo',
      'valor', t.ded, 'percent', round((t.ded/nullif(t.rb,0))*100,1),
      'filhos', (select coalesce(json_agg(json_build_object('label',label,'valor',v,
                  'percent', round((v/nullif(t.rb,0))*100,1)) order by ordem),'[]'::json)
                 from gv where dre_position='deducoes')),
    json_build_object('id','receita_liquida','label','= Receita Líquida','tipo','resultado',
      'valor', t.rb + t.ded, 'percent', round(((t.rb+t.ded)/nullif(t.rb,0))*100,1)),
    json_build_object('id','custos','label','(–) Custos (CSP / CMV)','tipo','negativo',
      'valor', t.cst, 'percent', round((t.cst/nullif(t.rb,0))*100,1),
      'filhos', (select coalesce(json_agg(json_build_object('label',label,'valor',v,
                  'percent', round((v/nullif(t.rb,0))*100,1)) order by ordem),'[]'::json)
                 from gv where dre_position='lucro_bruto')),
    json_build_object('id','lucro_bruto','label','= Lucro Bruto','tipo','destaque',
      'valor', t.rb + t.ded + t.cst, 'percent', round(((t.rb+t.ded+t.cst)/nullif(t.rb,0))*100,1)),
    json_build_object('id','despesas_operacionais','label','(–) Despesas Operacionais','tipo','negativo',
      'valor', t.despop, 'percent', round((t.despop/nullif(t.rb,0))*100,1),
      'filhos', (select coalesce(json_agg(json_build_object('label',label,'valor',v,
                  'percent', round((v/nullif(t.rb,0))*100,1)) order by ordem),'[]'::json)
                 from gv where dre_position='desp_operacional')),
    json_build_object('id','ebitda','label','= EBITDA','tipo','destaque',
      'valor', t.rb + t.ded + t.cst + t.despop, 'percent', round(((t.rb+t.ded+t.cst+t.despop)/nullif(t.rb,0))*100,1)),
    json_build_object('id','depreciacao','label','(–) Depreciação e Amortização','tipo','negativo',
      'valor', t.dep, 'percent', round((t.dep/nullif(t.rb,0))*100,1),
      'filhos', (select coalesce(json_agg(json_build_object('label',label,'valor',v,
                  'percent', round((v/nullif(t.rb,0))*100,1)) order by ordem),'[]'::json)
                 from gv where dre_position='ebitda')),
    json_build_object('id','ebit','label','= EBIT — Resultado Operacional','tipo','resultado',
      'valor', t.rb + t.ded + t.cst + t.despop + t.dep, 'percent', round(((t.rb+t.ded+t.cst+t.despop+t.dep)/nullif(t.rb,0))*100,1)),
    json_build_object('id','resultado_financeiro','label','(±) Resultado Financeiro','tipo','negativo',
      'valor', t.resfin, 'percent', round((t.resfin/nullif(t.rb,0))*100,1),
      'filhos', (select coalesce(json_agg(json_build_object('label',label,'valor',v,
                  'percent', round((v/nullif(t.rb,0))*100,1)) order by ordem),'[]'::json)
                 from gv where dre_position='resultado_financeiro')),
    json_build_object('id','lair','label','= LAIR — Antes do IR e CSLL','tipo','resultado',
      'valor', t.rb + t.ded + t.cst + t.despop + t.dep + t.resfin,
      'percent', round(((t.rb+t.ded+t.cst+t.despop+t.dep+t.resfin)/nullif(t.rb,0))*100,1)),
    json_build_object('id','ir_csll','label','(–) IR e CSLL','tipo','negativo',
      'valor', t.ircsll, 'percent', round((t.ircsll/nullif(t.rb,0))*100,1),
      'filhos', (select coalesce(json_agg(json_build_object('label',label,'valor',v,
                  'percent', round((v/nullif(t.rb,0))*100,1)) order by ordem),'[]'::json)
                 from gv where dre_position='lair')),
    json_build_object('id','lucro_liquido','label','= LUCRO LÍQUIDO DO EXERCÍCIO','tipo','lucro',
      'valor', t.rb + t.ded + t.cst + t.despop + t.dep + t.resfin + t.ircsll,
      'percent', round(((t.rb+t.ded+t.cst+t.despop+t.dep+t.resfin+t.ircsll)/nullif(t.rb,0))*100,1))
  )
  from t
$function$;

revoke execute on function public.fn_dre(date, date) from anon;
grant execute on function public.fn_dre(date, date) to authenticated;
