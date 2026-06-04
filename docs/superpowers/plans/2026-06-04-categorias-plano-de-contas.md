# Categorias = Plano de Contas + DRE — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transformar a aba Categorias no plano de contas real (código, hierarquia, posição na DRE), persistido por empresa, espelhando os prints do Conta Azul e alimentando a DRE gerencial.

**Architecture:** Migração SQL enriquece `categories` (code, parent_id, grupo, is_synthetic, active, sort_order, description) + tabela de referência `dre_groups` semeada de `GRUPOS_DRE`. Função `fn_seed_default_categories` materializa o `planoDeConta` por empresa preservando os IDs das 8 categorias já vinculadas a 81 transações. `fn_dre` reescrita agrega por posição-DRE. Frontend (server page → `lib/db/categories` → client → actions) reconstrói a UV em 3 abas com árvore, badges DRE e CRUD hierárquico.

**Tech Stack:** Supabase Postgres (Management API via `/tmp/fp_runsql.sh`), Next.js 16 App Router, React 19, server actions, inline styles + CSS vars. Sem test runner — verificação via SQL + `npx tsc --noEmit` + `npx next build`.

**Convenções de execução:**
- Backend SQL roda em produção via `echo "SQL" | bash /tmp/fp_runsql.sh -` (Management API, role postgres, RLS bypass). Toda migração também é salva em `supabase/migrations/`.
- Build sempre `cd /Users/victorhugosantanaalmeida/pillot-edilson-version/Finance && npx tsc --noEmit && npx next build`.
- Comunicação com usuário em pt-BR. Strings de UI em pt-BR.
- Projeto Supabase: `wrskpolxgtchnqjpygqd`. Empresa de teste: `4c854109-6ac5-469c-890a-03cc64aa53ac`.

---

## File Structure

- `supabase/migrations/0016_categorias_dre_groups.sql` — **Create.** Tabela `dre_groups` + seed dos 17 grupos + RLS leitura.
- `supabase/migrations/0017_categorias_enrich.sql` — **Create.** ALTER `categories` (novas colunas + índices) + função `fn_seed_default_categories` + chamada para a empresa existente + relink das 8 categorias.
- `supabase/migrations/0018_fn_dre_estruturada.sql` — **Create.** Reescreve `fn_dre(date,date)` para DRE estruturada por posição.
- `lib/db/categories.ts` — **Rewrite.** `CategoryNode` + `listCategoryTree()` agrupado por aba.
- `lib/db/dre.ts` — **Modify** (se existir) / consumido pela página DRE: tipo do retorno estruturado.
- `app/(app)/registers/categories/page.tsx` — **Modify.** Passa árvore agrupada por aba.
- `app/(app)/registers/categories/categories-client.tsx` — **Rewrite.** UI dos prints.
- `app/(app)/registers/categories/actions.ts` — **Rewrite.** CRUD hierárquico + seedDefaults.
- `app/(app)/dre/page.tsx` — **Modify.** Renderiza DRE estruturada de `fn_dre`.
- `app/(app)/registers/accounts-plan/page.tsx` — **Modify.** Redirect para `/registers/categories`.
- `components/layout/sidebar.tsx` — **Modify.** Remove item "Plano de Contas".
- Seletor de categoria em lançamentos (localizar: provável `app/(app)/transactions/*` e/ou componentes de form de payables/receivables) — **Modify.** Só folhas analíticas.
- `/tmp/verify_categorias.py` — **Create.** Script de verificação E2E (auth + leitura árvore + CRUD + DRE + cleanup).

---

## Task 1: Tabela de referência `dre_groups`

**Files:**
- Create: `supabase/migrations/0016_categorias_dre_groups.sql`

- [ ] **Step 1: Escrever a migração**

Criar `supabase/migrations/0016_categorias_dre_groups.sql` com EXATAMENTE este conteúdo (os 17 grupos vêm de `lib/accounts-plan.ts` `GRUPOS_DRE`; coluna `aba` e `ordem` derivadas da separação dos prints):

```sql
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
```

- [ ] **Step 2: Aplicar a migração em produção**

Run:
```bash
cat supabase/migrations/0016_categorias_dre_groups.sql | bash /tmp/fp_runsql.sh -
```
Expected: resposta JSON sem erro (array vazio ou `[]`).

- [ ] **Step 3: Verificar seed e separação por aba**

Run:
```bash
echo "select aba, count(*) from public.dre_groups group by aba order by aba;" | bash /tmp/fp_runsql.sh -
```
Expected: `despesa=9`, `neutra=4`, `receita=4` (total 17).

- [ ] **Step 4: Commit**

```bash
cd /Users/victorhugosantanaalmeida/pillot-edilson-version/Finance
git add supabase/migrations/0016_categorias_dre_groups.sql
git commit -m "feat(categorias): tabela de referência dre_groups com os 17 grupos da DRE"
```

---

## Task 2: Enriquecer `categories` + função de seed

**Files:**
- Create: `supabase/migrations/0017_categorias_enrich.sql`

- [ ] **Step 1: Escrever ALTER + função de seed**

Criar `supabase/migrations/0017_categorias_enrich.sql`. A função `fn_seed_default_categories` recebe o plano inteiro como literal JSON embutido (grupos + folhas, derivados de `planoDeConta`). Conteúdo EXATO:

```sql
-- 0017_categorias_enrich.sql — Categorias viram plano de contas hierárquico.
-- Preserva IDs existentes (81 transações dependem deles). Idempotente.

-- 1) Novas colunas (nullable/default para não quebrar linhas existentes)
alter table public.categories add column if not exists code         text;
alter table public.categories add column if not exists parent_id    uuid references public.categories(id) on delete cascade;
alter table public.categories add column if not exists grupo        text references public.dre_groups(grupo);
alter table public.categories add column if not exists is_synthetic boolean not null default false;
alter table public.categories add column if not exists active       boolean not null default true;
alter table public.categories add column if not exists sort_order   integer not null default 0;
alter table public.categories add column if not exists description  text;

create unique index if not exists categories_company_code_uidx on public.categories(company_id, code) where code is not null;
create index if not exists categories_company_parent_idx on public.categories(company_id, parent_id);

-- 2) Plano de contas como dado (grupos + folhas). Cada item: code,name,grupo,is_synthetic,parent_code,sort.
create or replace function public.fn_seed_default_categories(p_company uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  rec record;
  v_parent uuid;
  v_kind text;
  v_legacy uuid;
begin
  for rec in
    select * from (values
      -- (code, name, grupo, is_synthetic, parent_code, sort)
      ('3.1','Receita Bruta de Vendas e Serviços','receita_bruta',true ,null ,1),
      ('3.1.1','Venda de Mercadorias / Produtos','receita_bruta',false,'3.1',1),
      ('3.1.2','Prestação de Serviços','receita_bruta',false,'3.1',2),
      ('3.1.3','Contratos e Projetos','receita_bruta',false,'3.1',3),
      ('3.1.4','Receita de Locações','receita_bruta',false,'3.1',4),
      ('3.1.5','Contratos Mensais / Recorrentes','receita_bruta',false,'3.1',5),
      ('3.2','Deduções da Receita Bruta','deducoes',true,null,2),
      ('3.2.1','ISS — Imposto sobre Serviços','deducoes',false,'3.2',1),
      ('3.2.2','PIS e COFINS sobre Faturamento','deducoes',false,'3.2',2),
      ('3.2.3','ICMS sobre Vendas','deducoes',false,'3.2',3),
      ('3.2.4','Devoluções e Abatimentos','deducoes',false,'3.2',4),
      ('3.2.5','Simples Nacional — Parcela s/ Receita','deducoes',false,'3.2',5),
      ('4.1','Custo dos Serviços Prestados (CSP)','cst_servicos',true,null,3),
      ('4.1.1','Mão de Obra Direta','cst_servicos',false,'4.1',1),
      ('4.1.2','Subcontratados e Terceiros','cst_servicos',false,'4.1',2),
      ('4.1.3','Materiais e Insumos de Produção','cst_servicos',false,'4.1',3),
      ('4.1.4','Fretes e Logística (Custo)','cst_servicos',false,'4.1',4),
      ('4.2','Custo das Mercadorias Vendidas (CMV)','cst_mercadorias',true,null,4),
      ('4.2.1','Custo de Aquisição de Mercadorias','cst_mercadorias',false,'4.2',1),
      ('4.2.2','Fretes de Compra','cst_mercadorias',false,'4.2',2),
      ('4.2.3','Embalagens','cst_mercadorias',false,'4.2',3),
      ('5.1','Despesas com Pessoal','desp_pessoal',true,null,5),
      ('5.1.1','Salários e Ordenados','desp_pessoal',false,'5.1',1),
      ('5.1.2','Encargos Sociais (INSS, FGTS)','desp_pessoal',false,'5.1',2),
      ('5.1.3','Vale-Transporte','desp_pessoal',false,'5.1',3),
      ('5.1.4','Vale-Refeição / Alimentação','desp_pessoal',false,'5.1',4),
      ('5.1.5','Plano de Saúde e Odonto','desp_pessoal',false,'5.1',5),
      ('5.1.6','Pró-labore dos Sócios','desp_pessoal',false,'5.1',6),
      ('5.1.7','Treinamentos e Capacitação','desp_pessoal',false,'5.1',7),
      ('5.1.8','Rescisões Trabalhistas','desp_pessoal',false,'5.1',8),
      ('5.2','Despesas Administrativas','desp_administrativa',true,null,6),
      ('5.2.1','Aluguel e Condomínio','desp_administrativa',false,'5.2',1),
      ('5.2.2','Energia Elétrica e Água','desp_administrativa',false,'5.2',2),
      ('5.2.3','Telefonia e Internet','desp_administrativa',false,'5.2',3),
      ('5.2.4','Material de Escritório e Limpeza','desp_administrativa',false,'5.2',4),
      ('5.2.5','Honorários Contábeis e Jurídicos','desp_administrativa',false,'5.2',5),
      ('5.2.6','Seguros','desp_administrativa',false,'5.2',6),
      ('5.2.7','Manutenção e Conservação','desp_administrativa',false,'5.2',7),
      ('5.2.8','Softwares, Sistemas e Assinaturas','desp_administrativa',false,'5.2',8),
      ('5.2.9','Despesas com Viagens e Diárias','desp_administrativa',false,'5.2',9),
      ('5.2.10','Serviços de Limpeza e Conservação','desp_administrativa',false,'5.2',10),
      ('5.3','Despesas Comerciais e Marketing','desp_comercial',true,null,7),
      ('5.3.1','Comissões sobre Vendas','desp_comercial',false,'5.3',1),
      ('5.3.2','Marketing e Publicidade Digital','desp_comercial',false,'5.3',2),
      ('5.3.3','Eventos e Feiras','desp_comercial',false,'5.3',3),
      ('5.3.4','Brindes e Amostras Grátis','desp_comercial',false,'5.3',4),
      ('5.3.5','Fretes de Entrega (Venda)','desp_comercial',false,'5.3',5),
      ('5.4','Impostos, Taxas e Contribuições','desp_impostos',true,null,8),
      ('5.4.1','Simples Nacional — Parcela Apurada','desp_impostos',false,'5.4',1),
      ('5.4.2','IPTU','desp_impostos',false,'5.4',2),
      ('5.4.3','IPVA','desp_impostos',false,'5.4',3),
      ('5.4.4','Taxas Municipais e Licenças','desp_impostos',false,'5.4',4),
      ('5.5','Outras Receitas Operacionais','outras_receitas',true,null,9),
      ('5.5.1','Juros e Rendimentos Ativos','outras_receitas',false,'5.5',1),
      ('5.5.2','Recuperação de Despesas','outras_receitas',false,'5.5',2),
      ('5.5.3','Venda de Ativo Imobilizado','outras_receitas',false,'5.5',3),
      ('5.6','Depreciação e Amortização','depreciacao',true,null,10),
      ('5.6.1','Depreciação de Imobilizado','depreciacao',false,'5.6',1),
      ('5.6.2','Amortização de Intangíveis','depreciacao',false,'5.6',2),
      ('6.1','Receitas Financeiras','rec_financeira',true,null,11),
      ('6.1.1','Rendimentos de Aplicações Financeiras','rec_financeira',false,'6.1',1),
      ('6.1.2','Juros Ativos Recebidos','rec_financeira',false,'6.1',2),
      ('6.1.3','Descontos Obtidos de Fornecedores','rec_financeira',false,'6.1',3),
      ('6.2','Despesas Financeiras','desp_financeira',true,null,12),
      ('6.2.1','Juros sobre Empréstimos e Financiamentos','desp_financeira',false,'6.2',1),
      ('6.2.2','IOF','desp_financeira',false,'6.2',2),
      ('6.2.3','Tarifas Bancárias e CET','desp_financeira',false,'6.2',3),
      ('6.2.4','Multas e Juros de Mora','desp_financeira',false,'6.2',4),
      ('6.2.5','Descontos Concedidos a Clientes','desp_financeira',false,'6.2',5),
      ('7.1','IR e CSLL','ir_csll',true,null,13),
      ('7.1.1','IRPJ — Imposto de Renda','ir_csll',false,'7.1',1),
      ('7.1.2','CSLL — Contribuição Social','ir_csll',false,'7.1',2),
      ('8.1','Investimentos e Imobilizado','investimento',true,null,14),
      ('8.1.1','Compra de Equipamentos e Máquinas','investimento',false,'8.1',1),
      ('8.1.2','Compra de Veículos','investimento',false,'8.1',2),
      ('8.1.3','Reformas e Benfeitorias','investimento',false,'8.1',3),
      ('8.2','Empréstimos e Financiamentos','emprestimo',true,null,15),
      ('8.2.1','Captação de Empréstimos (entrada)','emprestimo',false,'8.2',1),
      ('8.2.2','Amortização de Principal','emprestimo',false,'8.2',2),
      ('8.3','Movimentações de Sócios','socio',true,null,16),
      ('8.3.1','Aporte de Capital dos Sócios','socio',false,'8.3',1),
      ('8.3.2','Retirada de Lucros / Dividendos','socio',false,'8.3',2),
      ('8.4','Transferências Internas','transferencia',true,null,17),
      ('8.4.1','Transferência entre Contas Próprias','transferencia',false,'8.4',1)
    ) as t(code,name,grupo,is_synthetic,parent_code,sort)
    order by code
  loop
    v_kind := case (select natureza from public.dre_groups g where g.grupo = rec.grupo)
                when 'receita' then 'receita' when 'neutro' then 'neutro' else 'despesa' end;
    v_parent := null;
    if rec.parent_code is not null then
      select id into v_parent from public.categories
        where company_id = p_company and code = rec.parent_code;
    end if;

    -- relink de categoria legada por nome só na primeira semeadura das folhas mapeadas
    v_legacy := null;
    if not rec.is_synthetic then
      select id into v_legacy from public.categories
        where company_id = p_company and code is null and lower(name) = lower(
          case rec.code
            when '3.1.2' then 'Serviços'
            when '3.1.1' then 'Vendas'
            when '5.2.1' then 'Aluguel'
            when '5.1.1' then 'Folha Salarial'
            when '5.4.1' then 'Impostos'
            when '4.1.1' then 'Mão de obra'
            when '5.3.2' then 'Marketing'
            when '4.1.3' then 'Materiais'
            else '\x00' end)
        limit 1;
    end if;

    if v_legacy is not null then
      update public.categories set
        code = rec.code, name = rec.name, grupo = rec.grupo, parent_id = v_parent,
        is_synthetic = false, active = true, sort_order = rec.sort, kind = v_kind
      where id = v_legacy;
    else
      insert into public.categories (company_id, code, name, grupo, parent_id, is_synthetic, active, sort_order, kind)
      values (p_company, rec.code, rec.name, rec.grupo, v_parent, rec.is_synthetic, true, rec.sort, v_kind)
      on conflict (company_id, code) do update set
        name = excluded.name, grupo = excluded.grupo, parent_id = excluded.parent_id,
        is_synthetic = excluded.is_synthetic, sort_order = excluded.sort_order, kind = excluded.kind;
    end if;
  end loop;
end $$;

revoke execute on function public.fn_seed_default_categories(uuid) from anon;
grant execute on function public.fn_seed_default_categories(uuid) to authenticated;

-- 3) Semear a empresa existente (relink das 8 + plano completo)
select public.fn_seed_default_categories('4c854109-6ac5-469c-890a-03cc64aa53ac');
```

- [ ] **Step 2: Aplicar a migração em produção**

Run:
```bash
cat supabase/migrations/0017_categorias_enrich.sql | bash /tmp/fp_runsql.sh -
```
Expected: JSON sem erro.

- [ ] **Step 3: Verificar relink (IDs preservados) e contagem**

Run:
```bash
echo "select count(*) total, count(*) filter (where is_synthetic) grupos, count(*) filter (where not is_synthetic) folhas from public.categories where company_id='4c854109-6ac5-469c-890a-03cc64aa53ac';" | bash /tmp/fp_runsql.sh -
echo "select id, code, name, kind from public.categories where company_id='4c854109-6ac5-469c-890a-03cc64aa53ac' and code in ('3.1.2','5.2.1','4.1.1') order by code;" | bash /tmp/fp_runsql.sh -
```
Expected: `grupos=17`; total = 17 + nº de folhas (84 folhas no plano → total 101); os 3 códigos mostram os IDs LEGADOS originais (`f57c7ba8…` para 3.1.2 Serviços, `12584ea3…` para 5.2.1 Aluguel, `1bf84427…` para 4.1.1 Mão de obra).

- [ ] **Step 4: Verificar que as 81 transações continuam válidas**

Run:
```bash
echo "select count(*) orfas from public.transactions t left join public.categories c on c.id=t.category_id where t.category_id is not null and c.id is null;" | bash /tmp/fp_runsql.sh -
```
Expected: `orfas=0`.

- [ ] **Step 5: Commit**

```bash
cd /Users/victorhugosantanaalmeida/pillot-edilson-version/Finance
git add supabase/migrations/0017_categorias_enrich.sql
git commit -m "feat(categorias): enriquecer categories com hierarquia + fn_seed_default_categories preservando FKs"
```

---

## Task 3: `fn_dre` estruturada por posição

**Files:**
- Create: `supabase/migrations/0018_fn_dre_estruturada.sql`

> **Contexto:** ler antes `supabase/migrations/0013_dre_competencia.sql` para reaproveitar a fonte de dados (receivables/payables liquidados no período). A reescrita troca o agrupamento por `categories.name` por agrupamento por `dre_groups.dre_position` aplicando `sinal`.

- [ ] **Step 1: Ler a fn_dre atual**

Run:
```bash
echo "select pg_get_functiondef('public.fn_dre(date,date)'::regprocedure);" | bash /tmp/fp_runsql.sh -
```
Expected: definição atual (fonte das somas). Usar a MESMA fonte (mesmas tabelas/filtros de período e status liquidado) na reescrita.

- [ ] **Step 2: Escrever a nova fn_dre**

Criar `supabase/migrations/0018_fn_dre_estruturada.sql`. Estrutura (ajustar nomes de tabela/coluna de valor conforme o que o Step 1 revelar — `receivables.amount`/`payables.amount`, coluna de data de liquidação e filtro de status):

```sql
-- 0018_fn_dre_estruturada.sql — DRE gerencial estruturada por posição.
-- Substitui o agrupamento por nome (0013) por posição-DRE com sinal,
-- devolvendo subtotais (Receita Líquida, Lucro Bruto, EBITDA, LAIR, Lucro Líquido).

create or replace function public.fn_dre(p_start date, p_end date)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company uuid := auth_company_id();
  v_pos jsonb;
  v_rb numeric; v_ded numeric; v_cst numeric; v_despop numeric;
  v_dep numeric; v_resfin numeric; v_ircsll numeric;
  v_rl numeric; v_lb numeric; v_ebitda numeric; v_lair numeric; v_ll numeric;
begin
  -- soma realizada por posição-DRE aplicando o sinal do grupo
  create temp table _mov on commit drop as
  select g.dre_position, sum(m.valor * g.sinal) as total
  from (
    select r.category_id, r.amount as valor
      from public.receivables r
      where r.company_id = v_company and r.status = 'recebido'
        and r.settled_at >= p_start and r.settled_at <= p_end
    union all
    select p.category_id, p.amount as valor
      from public.payables p
      where p.company_id = v_company and p.status = 'pago'
        and p.settled_at >= p_start and p.settled_at <= p_end
  ) m
  join public.categories c on c.id = m.category_id
  join public.dre_groups g on g.grupo = c.grupo
  group by g.dre_position;

  select coalesce(sum(total) filter (where dre_position='receita_bruta'),0),
         coalesce(sum(total) filter (where dre_position='deducoes'),0),
         coalesce(sum(total) filter (where dre_position='lucro_bruto'),0),
         coalesce(sum(total) filter (where dre_position='desp_operacional'),0),
         coalesce(sum(total) filter (where dre_position='ebitda'),0),
         coalesce(sum(total) filter (where dre_position='resultado_financeiro'),0),
         coalesce(sum(total) filter (where dre_position='lair'),0)
    into v_rb, v_ded, v_cst, v_despop, v_dep, v_resfin, v_ircsll
    from _mov;

  v_rl     := v_rb + v_ded;            -- deduções já têm sinal -1
  v_lb     := v_rl + v_cst;            -- custos sinal -1
  v_ebitda := v_lb + v_despop;         -- desp. op. sinal -1, outras receitas +1
  v_lair   := v_ebitda + v_dep + v_resfin;
  v_ll     := v_lair + v_ircsll;

  -- detalhamento por grupo (drill-down da página)
  select coalesce(jsonb_agg(jsonb_build_object(
            'grupo', g.grupo, 'label', g.label, 'cor', g.cor,
            'dre_position', g.dre_position, 'total', d.total) order by g.ordem), '[]'::jsonb)
    into v_pos
  from (
    select c.grupo, sum(m.valor) as total
    from (
      select r.category_id, r.amount as valor from public.receivables r
        where r.company_id=v_company and r.status='recebido' and r.settled_at between p_start and p_end
      union all
      select p.category_id, p.amount as valor from public.payables p
        where p.company_id=v_company and p.status='pago' and p.settled_at between p_start and p_end
    ) m join public.categories c on c.id=m.category_id
    group by c.grupo
  ) d join public.dre_groups g on g.grupo = d.grupo;

  return jsonb_build_object(
    'receita_bruta', v_rb, 'deducoes', v_ded, 'receita_liquida', v_rl,
    'custos', v_cst, 'lucro_bruto', v_lb, 'despesas_operacionais', v_despop,
    'depreciacao', v_dep, 'ebitda', v_ebitda, 'resultado_financeiro', v_resfin,
    'lair', v_lair, 'ir_csll', v_ircsll, 'lucro_liquido', v_ll,
    'grupos', v_pos
  );
end $$;

revoke execute on function public.fn_dre(date,date) from anon;
grant execute on function public.fn_dre(date,date) to authenticated;
```

> **Atenção do implementador:** se o Step 1 mostrar nomes diferentes (`due_date` vs `settled_at`, `status` com outros valores, tabela `transactions` em vez de receivables/payables), AJUSTE as duas subqueries para refletir exatamente a fonte usada na fn_dre original. O contrato de saída (chaves do JSON) NÃO muda.

- [ ] **Step 3: Aplicar e verificar**

Run:
```bash
cat supabase/migrations/0018_fn_dre_estruturada.sql | bash /tmp/fp_runsql.sh -
echo "select public.fn_dre('2020-01-01','2030-12-31');" | bash /tmp/fp_runsql.sh -
```
Expected: aplica sem erro; o SELECT (rodando como postgres, sem auth_company_id → pode dar null company; aceitável aqui). A verificação real de valores vem no script E2E da Task 9 autenticado como usuário da empresa.

- [ ] **Step 4: Commit**

```bash
cd /Users/victorhugosantanaalmeida/pillot-edilson-version/Finance
git add supabase/migrations/0018_fn_dre_estruturada.sql
git commit -m "feat(dre): fn_dre estruturada por posição com subtotais gerenciais"
```

---

## Task 4: `lib/db/categories.ts` — árvore agrupada por aba

**Files:**
- Rewrite: `lib/db/categories.ts`

> **Contexto:** ler `lib/db/admin.ts` e outro arquivo em `lib/db/` para seguir o padrão de cliente Supabase usado (server client `@/lib/supabase/server`). O client anon auto-escopa por RLS (company_id).

- [ ] **Step 1: Reescrever o módulo**

Substituir TODO o conteúdo de `lib/db/categories.ts` por:

```ts
import { createClient } from "@/lib/supabase/server"

export type CategoryAba = "receita" | "despesa" | "neutra"

export interface CategoryNode {
  id: string
  code: string | null
  name: string
  grupo: string | null
  kind: string
  parent_id: string | null
  is_synthetic: boolean
  active: boolean
  sort_order: number
  description: string | null
  dre_label: string | null
  dre_cor: string | null
  dre_position: string | null
  aba: CategoryAba | null
  children: CategoryNode[]
}

interface Row {
  id: string; code: string | null; name: string; grupo: string | null
  kind: string; parent_id: string | null; is_synthetic: boolean
  active: boolean; sort_order: number; description: string | null
  dre_groups: { label: string; cor: string; dre_position: string; aba: CategoryAba } | null
}

export interface CategoryTree {
  receita: CategoryNode[]
  despesa: CategoryNode[]
  neutra: CategoryNode[]
}

export async function listCategoryTree(): Promise<CategoryTree> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("categories")
    .select("id, code, name, grupo, kind, parent_id, is_synthetic, active, sort_order, description, dre_groups(label, cor, dre_position, aba)")
    .order("code", { ascending: true, nullsFirst: false })
  if (error) throw new Error(error.message)

  const rows = (data ?? []) as unknown as Row[]
  const byId = new Map<string, CategoryNode>()
  for (const r of rows) {
    byId.set(r.id, {
      id: r.id, code: r.code, name: r.name, grupo: r.grupo, kind: r.kind,
      parent_id: r.parent_id, is_synthetic: r.is_synthetic, active: r.active,
      sort_order: r.sort_order, description: r.description,
      dre_label: r.dre_groups?.label ?? null, dre_cor: r.dre_groups?.cor ?? null,
      dre_position: r.dre_groups?.dre_position ?? null, aba: r.dre_groups?.aba ?? null,
      children: [],
    })
  }
  const roots: CategoryNode[] = []
  for (const node of byId.values()) {
    if (node.parent_id && byId.has(node.parent_id)) byId.get(node.parent_id)!.children.push(node)
    else roots.push(node)
  }
  const sortRec = (ns: CategoryNode[]) => {
    ns.sort((a, b) => (a.sort_order - b.sort_order) || (a.code ?? "").localeCompare(b.code ?? ""))
    ns.forEach((n) => sortRec(n.children))
  }
  sortRec(roots)
  return {
    receita: roots.filter((n) => n.aba === "receita"),
    despesa: roots.filter((n) => n.aba === "despesa"),
    neutra: roots.filter((n) => n.aba === "neutra"),
  }
}

// Folhas analíticas selecionáveis em lançamentos (não sintéticas, ativas)
export async function listSelectableCategories(): Promise<CategoryNode[]> {
  const tree = await listCategoryTree()
  const out: CategoryNode[] = []
  const walk = (ns: CategoryNode[]) => ns.forEach((n) => {
    if (!n.is_synthetic && n.active) out.push(n)
    walk(n.children)
  })
  walk([...tree.receita, ...tree.despesa, ...tree.neutra])
  return out.sort((a, b) => (a.code ?? "").localeCompare(b.code ?? ""))
}
```

- [ ] **Step 2: Verificar compilação**

Run:
```bash
cd /Users/victorhugosantanaalmeida/pillot-edilson-version/Finance && npx tsc --noEmit 2>&1 | grep -E "categories.ts" || echo "OK sem erros em categories.ts"
```
Expected: `OK sem erros em categories.ts` (pode haver erros em outros arquivos que importam o tipo antigo `Category` — serão corrigidos nas tasks seguintes).

- [ ] **Step 3: Commit**

```bash
cd /Users/victorhugosantanaalmeida/pillot-edilson-version/Finance
git add lib/db/categories.ts
git commit -m "feat(categorias): listCategoryTree e listSelectableCategories com join em dre_groups"
```

---

## Task 5: `actions.ts` — CRUD hierárquico + seedDefaults

**Files:**
- Rewrite: `app/(app)/registers/categories/actions.ts`

> **Contexto:** ler o `actions.ts` atual e `app/(app)/admin/actions.ts` para seguir o padrão ("use server", createClient de `@/lib/supabase/server`, retorno `{ ok, error }`, `revalidatePath`).

- [ ] **Step 1: Reescrever as actions**

Substituir TODO o conteúdo de `app/(app)/registers/categories/actions.ts` por:

```ts
"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

type Result = { ok: boolean; error?: string }

function revalidate() {
  revalidatePath("/registers/categories")
  revalidatePath("/dre")
}

async function nextChildCode(supabase: Awaited<ReturnType<typeof createClient>>, parentId: string): Promise<string | null> {
  const { data: parent } = await supabase.from("categories").select("code").eq("id", parentId).single()
  if (!parent?.code) return null
  const { data: sibs } = await supabase.from("categories").select("code").eq("parent_id", parentId)
  let max = 0
  for (const s of sibs ?? []) {
    const last = Number((s.code ?? "").split(".").pop())
    if (!Number.isNaN(last) && last > max) max = last
  }
  return `${parent.code}.${max + 1}`
}

export async function createCategory(input: {
  parent_id?: string | null
  grupo: string
  name: string
  is_synthetic?: boolean
}): Promise<Result> {
  const name = input.name?.trim()
  if (!name) return { ok: false, error: "Informe o nome da categoria." }
  if (!input.grupo) return { ok: false, error: "Selecione o grupo da DRE." }
  const supabase = await createClient()

  const { data: grp } = await supabase.from("dre_groups").select("natureza").eq("grupo", input.grupo).single()
  const kind = grp?.natureza === "receita" ? "receita" : grp?.natureza === "neutro" ? "neutro" : "despesa"

  let code: string | null = null
  if (input.parent_id) code = await nextChildCode(supabase, input.parent_id)

  const { error } = await supabase.from("categories").insert({
    name, grupo: input.grupo, parent_id: input.parent_id ?? null,
    is_synthetic: input.is_synthetic ?? false, kind, code, active: true,
  })
  if (error) return { ok: false, error: error.message }
  revalidate()
  return { ok: true }
}

export async function updateCategory(input: {
  id: string
  name?: string
  grupo?: string
  active?: boolean
  description?: string | null
}): Promise<Result> {
  const supabase = await createClient()
  const patch: Record<string, unknown> = {}
  if (input.name !== undefined) {
    const n = input.name.trim()
    if (!n) return { ok: false, error: "O nome não pode ficar vazio." }
    patch.name = n
  }
  if (input.grupo !== undefined) {
    patch.grupo = input.grupo
    const { data: grp } = await supabase.from("dre_groups").select("natureza").eq("grupo", input.grupo).single()
    patch.kind = grp?.natureza === "receita" ? "receita" : grp?.natureza === "neutro" ? "neutro" : "despesa"
  }
  if (input.active !== undefined) patch.active = input.active
  if (input.description !== undefined) patch.description = input.description
  const { error } = await supabase.from("categories").update(patch).eq("id", input.id)
  if (error) return { ok: false, error: error.message }
  revalidate()
  return { ok: true }
}

export async function deleteCategory(id: string): Promise<Result> {
  const supabase = await createClient()
  const { count: childCount } = await supabase
    .from("categories").select("id", { count: "exact", head: true }).eq("parent_id", id)
  if ((childCount ?? 0) > 0) return { ok: false, error: "Remova ou mova as subcategorias antes de excluir este grupo." }

  for (const tbl of ["transactions", "payables", "receivables"] as const) {
    const { count } = await supabase.from(tbl).select("id", { count: "exact", head: true }).eq("category_id", id)
    if ((count ?? 0) > 0) return { ok: false, error: "Esta categoria possui lançamentos vinculados e não pode ser excluída." }
  }
  const { error } = await supabase.from("categories").delete().eq("id", id)
  if (error) return { ok: false, error: error.message }
  revalidate()
  return { ok: true }
}

export async function seedDefaults(): Promise<Result> {
  const supabase = await createClient()
  const { data: prof } = await supabase.from("profiles").select("company_id").single()
  if (!prof?.company_id) return { ok: false, error: "Empresa não identificada." }
  const { error } = await supabase.rpc("fn_seed_default_categories", { p_company: prof.company_id })
  if (error) return { ok: false, error: error.message }
  revalidate()
  return { ok: true }
}
```

> **Atenção:** confirmar no Step 2 que `profiles` tem coluna `company_id` (o padrão do projeto). Se o nome for outro, ajustar a query em `seedDefaults`.

- [ ] **Step 2: Verificar schema de profiles e compilação**

Run:
```bash
echo "select column_name from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='company_id';" | bash /tmp/fp_runsql.sh -
cd /Users/victorhugosantanaalmeida/pillot-edilson-version/Finance && npx tsc --noEmit 2>&1 | grep -E "actions.ts" || echo "OK sem erros em actions.ts"
```
Expected: query retorna `company_id`; `OK sem erros em actions.ts`.

- [ ] **Step 3: Commit**

```bash
cd /Users/victorhugosantanaalmeida/pillot-edilson-version/Finance
git add app/\(app\)/registers/categories/actions.ts
git commit -m "feat(categorias): CRUD hierárquico + seedDefaults nas server actions"
```

---

## Task 6: `categories-client.tsx` — UI dos prints

**Files:**
- Rewrite: `app/(app)/registers/categories/categories-client.tsx`
- Modify: `app/(app)/registers/categories/page.tsx`

> **Contexto:** este é o coração visual. Seguir os prints (descritos no spec). Inline styles + CSS vars. ler o `categories-client.tsx` atual para reaproveitar helpers de estilo/botão e o padrão de form. As cores dos badges DRE vêm de `dre_cor` no nó.

- [ ] **Step 1: Atualizar a page para passar a árvore**

Substituir TODO o conteúdo de `app/(app)/registers/categories/page.tsx` por:

```tsx
import { listCategoryTree } from "@/lib/db/categories"
import CategoriesClient from "./categories-client"

export default async function CategoriesPage() {
  const tree = await listCategoryTree()
  return <CategoriesClient tree={tree} />
}
```

- [ ] **Step 2: Reescrever o client (estrutura + abas + árvore + ações)**

Substituir TODO o conteúdo de `app/(app)/registers/categories/categories-client.tsx` pela UI dos prints. Requisitos concretos a implementar (componente "use client" recebendo `tree: CategoryTree`):

1. Estado: `activeAba` ("receita" | "despesa" | "neutra"), `query` (busca), `expanded` (Set de ids), `editing`/`creating` (modal/inline form), `pending` (transição).
2. Header: título `Categorias financeiras`, subtítulo `Estrutura inspirada no Conta Azul, conectada ao plano de contas e à DRE gerencial.`
3. Barra de ações: botão `Configurar categorias padrão` (ícone engrenagem) à esquerda → chama `seedDefaults()`; à direita botão azul `+ Novo registro`; input de busca placeholder `Buscar categoria ou código...`.
4. Três abas clicáveis: `Categorias de receita` / `Categorias de despesa` / `Categorias que não afetam DRE`.
5. Card da aba ativa com título grande + subtítulo correto + botão colorido:
   - receita: subtítulo `Entradas, deduções e receitas financeiras posicionadas na DRE.`, botão verde `Nova categoria de receita`.
   - despesa: subtítulo `Custos, despesas operacionais, impostos e resultado financeiro.`, botão vermelho `Nova categoria de despesa`.
   - neutra: subtítulo `Investimentos, empréstimos, sócios e transferências internas.`, botão roxo `Nova categoria neutra`.
6. Cabeçalho de colunas: `CATEGORIA | DRE | AÇÕES`.
7. Render recursivo das linhas:
   - Linha sintética (`is_synthetic`): negrito, bolinha `dre_cor` (12px), `code + name`, subtítulo cinza (`description` ou label do grupo), chevron expandir/colapsar (toggle no `expanded`).
   - Folha (indentada ~24px por nível): bolinha menor (8px), `code + name`.
   - Coluna DRE: pill colorido com `dre_label` em fundo `dre_cor` + transparência (usar `dre_cor` com alpha, texto na cor ou branco).
   - Coluna Ações: botão `+` (cria filho sob a linha → abre form com `parent_id` e `grupo` herdado), lápis (editar nome/grupo), lixeira (excluir → confirm + chama `deleteCategory`).
8. Busca: filtra nós cujo `name` ou `code` contém `query` (case-insensitive), mantendo ancestrais visíveis e auto-expandindo.
9. Form de criar/editar: campos `nome` (texto) e, quando raiz, seletor de `grupo` (lista de `dre_groups` da aba); ao criar filho, grupo herdado do pai. Submete via `createCategory`/`updateCategory` dentro de `startTransition`; em erro, exibe `error` em pt-BR; em sucesso, `router.refresh()`.

Implementar com os mesmos componentes de botão/spacing já usados no arquivo atual. O grupo selecionável no form raiz precisa da lista de grupos por aba — derivar de uma constante local `GRUPOS_POR_ABA` espelhando `dre_groups` (grupo → label) OU buscar via uma action. Para evitar round-trip, embutir a constante:

```ts
const GRUPOS_POR_ABA: Record<"receita"|"despesa"|"neutra", {grupo:string; label:string}[]> = {
  receita: [
    {grupo:"receita_bruta",label:"Receita Bruta"},
    {grupo:"deducoes",label:"Deduções da Receita"},
    {grupo:"outras_receitas",label:"Outras Receitas Operacionais"},
    {grupo:"rec_financeira",label:"Receitas Financeiras"},
  ],
  despesa: [
    {grupo:"cst_servicos",label:"CSP — Custo dos Serviços"},
    {grupo:"cst_mercadorias",label:"CMV — Custo das Mercadorias"},
    {grupo:"desp_pessoal",label:"Despesas com Pessoal"},
    {grupo:"desp_administrativa",label:"Despesas Administrativas"},
    {grupo:"desp_comercial",label:"Despesas Comerciais / Marketing"},
    {grupo:"desp_impostos",label:"Impostos e Taxas sobre Resultado"},
    {grupo:"depreciacao",label:"Depreciação e Amortização"},
    {grupo:"desp_financeira",label:"Despesas Financeiras"},
    {grupo:"ir_csll",label:"IR e CSLL"},
  ],
  neutra: [
    {grupo:"investimento",label:"Investimentos / Imobilizado"},
    {grupo:"emprestimo",label:"Empréstimos e Financiamentos"},
    {grupo:"socio",label:"Movimentações de Sócios"},
    {grupo:"transferencia",label:"Transferências Internas"},
  ],
}
```

- [ ] **Step 3: Verificar compilação e build**

Run:
```bash
cd /Users/victorhugosantanaalmeida/pillot-edilson-version/Finance && npx tsc --noEmit 2>&1 | grep -E "categories-client|categories/page" || echo "OK"
```
Expected: `OK`.

- [ ] **Step 4: Commit**

```bash
cd /Users/victorhugosantanaalmeida/pillot-edilson-version/Finance
git add app/\(app\)/registers/categories/categories-client.tsx app/\(app\)/registers/categories/page.tsx
git commit -m "feat(categorias): UI em 3 abas com árvore, badges DRE e ações (espelho dos prints)"
```

---

## Task 7: Página DRE consome `fn_dre` estruturada

**Files:**
- Modify: `app/(app)/dre/page.tsx`
- Modify (se existir): `lib/db/dre.ts`

> **Contexto:** ler `app/(app)/dre/page.tsx` e o helper que chama `fn_dre`. Hoje renderiza o formato antigo (agrupado por nome). Trocar para o JSON estruturado: chaves `receita_bruta, deducoes, receita_liquida, custos, lucro_bruto, despesas_operacionais, depreciacao, ebitda, resultado_financeiro, lair, ir_csll, lucro_liquido, grupos[]`.

- [ ] **Step 1: Ler a página e o helper atuais**

Run:
```bash
cd /Users/victorhugosantanaalmeida/pillot-edilson-version/Finance && ls lib/db/dre.ts app/\(app\)/dre/page.tsx 2>/dev/null
```
Expected: caminhos existentes. Ler ambos com Read antes de editar.

- [ ] **Step 2: Atualizar o tipo de retorno e a renderização**

No helper que chama `supabase.rpc("fn_dre", …)`, tipar o retorno como:

```ts
export interface DreResult {
  receita_bruta: number; deducoes: number; receita_liquida: number
  custos: number; lucro_bruto: number; despesas_operacionais: number
  depreciacao: number; ebitda: number; resultado_financeiro: number
  lair: number; ir_csll: number; lucro_liquido: number
  grupos: { grupo: string; label: string; cor: string; dre_position: string; total: number }[]
}
```

Na página, renderizar as linhas na ordem gerencial com os subtotais em destaque (Receita Líquida, Lucro Bruto, EBITDA, LAIR, Lucro Líquido em negrito/linha separadora), mantendo formatação BRL (`toLocaleString("pt-BR", {style:"currency",currency:"BRL"})`) e o layout atual. Drill-down opcional usa `grupos[]`.

- [ ] **Step 3: Verificar build**

Run:
```bash
cd /Users/victorhugosantanaalmeida/pillot-edilson-version/Finance && npx tsc --noEmit 2>&1 | grep -E "dre" || echo "OK"
```
Expected: `OK`.

- [ ] **Step 4: Commit**

```bash
cd /Users/victorhugosantanaalmeida/pillot-edilson-version/Finance
git add app/\(app\)/dre/page.tsx lib/db/dre.ts
git commit -m "feat(dre): página consome DRE estruturada de fn_dre com subtotais gerenciais"
```

---

## Task 8: Lançamentos só com folhas + aposentar Plano de Contas

**Files:**
- Modify: seletor de categoria nos forms de lançamento (localizar)
- Modify: `app/(app)/registers/accounts-plan/page.tsx`
- Modify: `components/layout/sidebar.tsx`

- [ ] **Step 1: Localizar os seletores de categoria**

Run:
```bash
cd /Users/victorhugosantanaalmeida/pillot-edilson-version/Finance && grep -rln "listCategories\|category_id" app/\(app\)/transactions app/\(app\)/registers 2>/dev/null
```
Expected: lista de arquivos que usam categorias em lançamentos. Ler cada um.

- [ ] **Step 2: Trocar a fonte do picker para folhas analíticas**

Onde os forms listam categorias para escolha, trocar `listCategories()` por `listSelectableCategories()` (de `lib/db/categories.ts`) e exibir `code + name` agrupado por grupo. Categorias sintéticas não aparecem. Atualizar imports e tipos (`CategoryNode`).

- [ ] **Step 3: Redirect da página Plano de Contas**

Substituir TODO o conteúdo de `app/(app)/registers/accounts-plan/page.tsx` por:

```tsx
import { redirect } from "next/navigation"

export default function AccountsPlanPage() {
  redirect("/registers/categories")
}
```

- [ ] **Step 4: Remover item "Plano de Contas" do menu**

Em `components/layout/sidebar.tsx`, remover o item de navegação que aponta para `/registers/accounts-plan` (manter apenas `Categorias`).

- [ ] **Step 5: Verificar build completo**

Run:
```bash
cd /Users/victorhugosantanaalmeida/pillot-edilson-version/Finance && npx tsc --noEmit && npx next build 2>&1 | tail -20
```
Expected: build verde (sem erros TS; "Compiled successfully").

- [ ] **Step 6: Commit**

```bash
cd /Users/victorhugosantanaalmeida/pillot-edilson-version/Finance
git add -A
git commit -m "feat(lancamentos): picker só com folhas analíticas; aposenta página Plano de Contas"
```

---

## Task 9: Verificação E2E + push

**Files:**
- Create: `/tmp/verify_categorias.py`

- [ ] **Step 1: Escrever o script E2E**

Criar `/tmp/verify_categorias.py` (espelha o padrão de `/tmp/fp_smoke.py`): autentica como usuário admin da Construtora Teste, e valida:
1. `listCategoryTree` via REST: `categories` tem 17 sintéticas + folhas, agrupadas corretamente por aba (join dre_groups).
2. Cria uma folha de teste sob `5.2` (Despesas Administrativas) via RPC/insert, confirma que recebeu code `5.2.x`.
3. `fn_dre('2020-01-01','2030-12-31')` retorna JSON com `lucro_liquido` numérico e `grupos[]` não vazio; valores das 81 transações refletidos.
4. Negativo: excluir uma sintética com filhos retorna erro.
5. Cleanup: remove a folha de teste.

Usar env já conhecido: `FP_ANON`, e a senha do admin da empresa (`Admin@2026` para o usuário admin@construtora — confirmar o e-mail real via `select email from auth.users` se necessário). Reaproveitar `mgmt_sql` para cleanup.

- [ ] **Step 2: Rodar o script**

Run:
```bash
FP_ANON="$ANON" FP_REF=wrskpolxgtchnqjpygqd FP_PAT="$PAT" python3 /tmp/verify_categorias.py
```
Expected: `Verificação OK` com todos os checks PASS.

- [ ] **Step 3: Build final + push**

Run:
```bash
cd /Users/victorhugosantanaalmeida/pillot-edilson-version/Finance && npx tsc --noEmit && npx next build 2>&1 | tail -5
git push "https://$GITHUB_TOKEN@github.com/edilson-finance/finance-pillot.git" HEAD:main
```
Expected: build verde; push aceito.

---

## Self-Review (preenchido)

**1. Spec coverage:**
- dre_groups → Task 1. ✔
- categories enrich + seed + relink preservando FKs → Task 2. ✔
- fn_dre estruturada → Task 3. ✔
- listCategoryTree/CategoryNode → Task 4. ✔
- CRUD hierárquico + seedDefaults → Task 5. ✔
- UI 3 abas/árvore/badges/ações → Task 6. ✔
- DRE page estruturada → Task 7. ✔
- picker só folhas + aposentar plano de contas → Task 8. ✔
- critérios de aceite (build, E2E, FKs) → Task 9. ✔

**2. Placeholder scan:** Sem TBD/TODO. As duas ressalvas marcadas ("Atenção do implementador") são instruções de adaptação a nomes reais de coluna, não placeholders de conteúdo — exigidas porque a fn_dre original precisa ser lida (Task 3 Step 1) antes de fixar os nomes. Aceitável e explícito.

**3. Type consistency:** `CategoryNode`/`CategoryTree` definidos na Task 4 e reusados nas Tasks 6 e 8. `DreResult` (Task 7) casa com as chaves do JSON de `fn_dre` (Task 3). `Result {ok,error}` consistente em todas as actions. Grupos/labels da constante `GRUPOS_POR_ABA` (Task 6) batem com `dre_groups` seed (Task 1).
