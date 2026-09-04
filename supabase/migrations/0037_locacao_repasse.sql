-- 0037_locacao_repasse.sql
--
-- LOCAÇÃO / ADMINISTRAÇÃO DE IMÓVEIS
--
-- Modelo: a imobiliária administra imóveis de terceiros. O inquilino paga o
-- aluguel; a imobiliária retém um PERCENTUAL (a comissão, que é a receita dela)
-- e repassa o restante ao proprietário.
--
-- O que muda:
--   1. `products` ganha os campos de imóvel (proprietário, % comissão, inquilino,
--      status de locação, valor, dias de boleto/repasse, término do contrato).
--   2. `receivables` ganha `commission_amount` — quanto daquela cobrança é receita
--      da empresa. O restante (amount - commission_amount) é repasse ao parceiro.
--   3. `payables` ganha `partner_id` e `source_receivable_id` — o repasse vira uma
--      conta a pagar rastreável. O índice único garante UM repasse por cobrança
--      (idempotência: clique duplo não gera repasse dobrado).
--   4. `fn_dre` passa a contar só a comissão como receita e a ignorar o repasse.
--
-- Compatível com o que já existia: cobrança com parceiro e sem comissão (=0)
-- mantém o comportamento antigo (todo o bruto é repasse).

-- ─────────────────────────────────────────────────────────────
-- 1) IMÓVEL (sobre o cadastro de produtos, que já existe)
-- ─────────────────────────────────────────────────────────────
alter table public.products
  add column if not exists partner_id        uuid references public.partners(id) on delete set null,
  add column if not exists tenant_id         uuid references public.customers(id) on delete set null,
  add column if not exists commission_percent numeric(5,2) not null default 0,
  add column if not exists rental_status     text not null default 'vago',
  add column if not exists rent_amount       numeric(14,2) not null default 0,
  add column if not exists billing_day       smallint,
  add column if not exists transfer_day      smallint,
  add column if not exists contract_end      date;

-- percentual coerente e status restrito
alter table public.products drop constraint if exists products_commission_percent_chk;
alter table public.products add constraint products_commission_percent_chk
  check (commission_percent >= 0 and commission_percent <= 100);
alter table public.products drop constraint if exists products_rental_status_chk;
alter table public.products add constraint products_rental_status_chk
  check (rental_status in ('alugado','vago'));

create index if not exists products_partner_idx on public.products(company_id, partner_id) where partner_id is not null;
create index if not exists products_tenant_idx  on public.products(company_id, tenant_id)  where tenant_id  is not null;

-- ─────────────────────────────────────────────────────────────
-- 2) COMISSÃO NA COBRANÇA
-- ─────────────────────────────────────────────────────────────
alter table public.receivables
  add column if not exists commission_amount numeric(14,2) not null default 0;
alter table public.receivables drop constraint if exists receivables_commission_chk;
alter table public.receivables add constraint receivables_commission_chk
  check (commission_amount >= 0);

-- ─────────────────────────────────────────────────────────────
-- 3) REPASSE COMO CONTA A PAGAR
-- ─────────────────────────────────────────────────────────────
alter table public.payables
  add column if not exists partner_id           uuid references public.partners(id) on delete set null,
  add column if not exists source_receivable_id uuid references public.receivables(id) on delete cascade;

create index if not exists payables_partner_idx on public.payables(company_id, partner_id) where partner_id is not null;
-- Idempotência: no máximo um repasse por cobrança de origem.
create unique index if not exists payables_source_receivable_uidx
  on public.payables(source_receivable_id) where source_receivable_id is not null;

-- ─────────────────────────────────────────────────────────────
-- 4) DRE: só a comissão é receita; o repasse não entra
-- ─────────────────────────────────────────────────────────────
-- Mesma estrutura da 0018; muda APENAS o CTE `mov`.
create or replace function public.fn_dre(p_start date, p_end date)
returns json
language sql
stable
set search_path to 'public'
as $function$
  with mov as (
    -- Cobrança com recebedor parceiro: só a COMISSÃO é receita da empresa.
    -- O restante é dinheiro de terceiro (repasse) e não pode inflar o faturamento.
    select r.category_id,
           case when r.partner_id is not null
                then coalesce(r.commission_amount, 0)
                else r.amount
           end as amount
      from public.receivables r
     where r.due_date between p_start and p_end
    union all
    -- O repasse gerado automaticamente é movimento de terceiro: fora da DRE.
    select p.category_id, p.amount
      from public.payables p
     where p.due_date between p_start and p_end
       and p.source_receivable_id is null
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

revoke execute on function public.fn_dre(date, date) from anon, public;
grant execute on function public.fn_dre(date, date) to authenticated;
