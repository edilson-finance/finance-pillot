-- 0016_categorias_dre_groups.sql — Taxonomia de grupos da DRE gerencial.
-- Espelha GRUPOS_DRE de lib/accounts-plan.ts. Global (sem company_id):
-- é classificação contábil, não dado de empresa. Idempotente.

create table if not exists public.dre_groups (
  grupo        text primary key,
  label        text not null,
  cor          text not null,
  dre_position text not null,
  sinal        smallint not null,
  natureza     text not null,
  aba          text not null,           -- 'receita' | 'despesa' | 'neutra'
  ordem        smallint not null
);

insert into public.dre_groups (grupo, label, cor, dre_position, sinal, natureza, aba, ordem) values
  ('receita_bruta',      'Receita Bruta',                    '#10B981', 'receita_bruta',       1, 'receita', 'receita',  1),
  ('deducoes',           'Deduções da Receita',              '#F59E0B', 'deducoes',           -1, 'receita', 'receita',  2),
  ('outras_receitas',    'Outras Receitas Operacionais',     '#34D399', 'desp_operacional',    1, 'receita', 'receita',  3),
  ('rec_financeira',     'Receitas Financeiras',             '#60A5FA', 'resultado_financeiro',1, 'receita', 'receita',  4),
  ('cst_servicos',       'CSP — Custo dos Serviços',         '#F87171', 'lucro_bruto',        -1, 'custo',   'despesa',  1),
  ('cst_mercadorias',    'CMV — Custo das Mercadorias',      '#EF4444', 'lucro_bruto',        -1, 'custo',   'despesa',  2),
  ('desp_pessoal',       'Despesas com Pessoal',             '#8B5CF6', 'desp_operacional',   -1, 'despesa', 'despesa',  3),
  ('desp_administrativa','Despesas Administrativas',         '#7C3AED', 'desp_operacional',   -1, 'despesa', 'despesa',  4),
  ('desp_comercial',     'Despesas Comerciais / Marketing',  '#EC4899', 'desp_operacional',   -1, 'despesa', 'despesa',  5),
  ('desp_impostos',      'Impostos e Taxas sobre Resultado', '#6B7280', 'desp_operacional',   -1, 'despesa', 'despesa',  6),
  ('depreciacao',        'Depreciação e Amortização',        '#9CA3AF', 'ebitda',             -1, 'despesa', 'despesa',  7),
  ('desp_financeira',    'Despesas Financeiras',             '#4F46E5', 'resultado_financeiro',-1,'despesa', 'despesa',  8),
  ('ir_csll',            'IR e CSLL',                        '#374151', 'lair',               -1, 'despesa', 'despesa',  9),
  ('investimento',       'Investimentos / Imobilizado',      '#3B82F6', 'nao_afeta',           1, 'neutro',  'neutra',   1),
  ('emprestimo',         'Empréstimos e Financiamentos',     '#FCD34D', 'nao_afeta',           1, 'neutro',  'neutra',   2),
  ('socio',              'Movimentações de Sócios',          '#DB2777', 'nao_afeta',           1, 'neutro',  'neutra',   3),
  ('transferencia',      'Transferências Internas',          '#6B7280', 'nao_afeta',           1, 'neutro',  'neutra',   4)
on conflict (grupo) do update set
  label = excluded.label, cor = excluded.cor, dre_position = excluded.dre_position,
  sinal = excluded.sinal, natureza = excluded.natureza, aba = excluded.aba, ordem = excluded.ordem;

alter table public.dre_groups enable row level security;
drop policy if exists dre_groups_read on public.dre_groups;
create policy dre_groups_read on public.dre_groups for select to authenticated using (true);
grant select on public.dre_groups to authenticated;
