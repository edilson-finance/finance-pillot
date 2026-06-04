# Categorias = Plano de Contas + DRE — Design

**Data:** 2026-06-04
**Status:** Aprovado (brainstorming anterior + prints como referência visual exata)
**Profundidade escolhida pelo usuário:** "Completo e funcional (DB)" — migração que transforma as categorias no plano de contas real (código, hierarquia, posição na DRE); botões criam/editam/excluem de verdade no banco, por empresa; a DRE passa a usar essa estrutura.

## Objetivo

Reconstruir a aba **Categorias** (`/registers/categories`) para ficar **exatamente como nos prints** (modelo Conta Azul): três abas (receita / despesa / não afeta DRE), árvore hierárquica com código, badge de posição na DRE e ações `+ / editar / excluir` por linha — tudo persistido no banco por empresa e alimentando a DRE gerencial.

Hoje a estrutura rica (`lib/accounts-plan.ts`) é **estática/mock**. O alvo é torná-la **dados reais** na tabela `categories`, sem quebrar as 81 transações já vinculadas.

## Verdade do banco (confirmada)

- `categories(id, company_id default auth_company_id(), name, kind text default 'despesa', created_at, updated_at)`. Sem check em `kind`.
- **FKs apontando para `categories.id`:** `transactions.category_id`, `payables.category_id`, `receivables.category_id`. → IDs existentes **devem ser preservados**.
- 1 empresa (`4c854109-…` Construtora Teste LTDA); 8 categorias em uso por 81 transações (todas com `category_id`).
- `dre_groups` não existe. `accounts_plan` vazia (será aposentada conceitualmente; tabela permanece intacta para não quebrar nada, mas deixa de ser usada).

### 8 categorias atuais → folha canônica do plano

| Atual (kind) | Mapeada para |
|---|---|
| Serviços (receita) | 3.1.2 Prestação de Serviços |
| Vendas (receita) | 3.1.1 Venda de Mercadorias / Produtos |
| Aluguel (despesa) | 5.2.1 Aluguel e Condomínio |
| Folha Salarial (despesa) | 5.1.1 Salários e Ordenados |
| Impostos (despesa) | 5.4.1 Simples Nacional — Parcela Apurada |
| Mão de obra (despesa) | 4.1.1 Mão de Obra Direta |
| Marketing (despesa) | 5.3.2 Marketing e Publicidade Digital |
| Materiais (despesa) | 4.1.3 Materiais e Insumos de Produção |

Cada linha existente é **atualizada** (UPDATE in-place, mesmo `id`) para adotar o código/grupo/posição-DRE da folha canônica correspondente. As demais folhas e todos os grupos sintéticos entram como linhas novas. Resultado: 1 linha por código, FKs intactas, histórico já classificado na DRE.

## Modelo de dados

### Migração `0016_categorias_plano_de_contas.sql`

**Tabela de referência `dre_groups`** (estática, sem `company_id` — é taxonomia global, espelha `GRUPOS_DRE`):

```
dre_groups(
  grupo text primary key,          -- 'receita_bruta', 'deducoes', ... (17 grupos)
  label text not null,             -- 'Receita Bruta', ...
  cor text not null,               -- '#10B981'
  dre_position text not null,      -- 'receita_bruta' | 'deducoes' | 'lucro_bruto' | 'desp_operacional' | 'ebitda' | 'resultado_financeiro' | 'lair' | 'lucro_liquido' | 'nao_afeta'
  sinal smallint not null,         -- 1 | -1
  natureza text not null,          -- 'receita' | 'custo' | 'despesa' | 'neutro'
  aba text not null,               -- 'receita' | 'despesa' | 'neutra' (qual aba do print)
  ordem smallint not null          -- ordenação dos grupos dentro da aba
)
```
Seed com os 17 grupos de `GRUPOS_DRE`. `aba` derivada: receita → grupos cujos códigos são 3.1, 3.2, 5.5, 6.1; despesa → 4.1, 4.2, 5.1, 5.2, 5.3, 5.4, 5.6, 6.2, 7.1; neutra → 8.1, 8.2, 8.3, 8.4. RLS: leitura liberada para `authenticated` (taxonomia, não tem dado de empresa).

**Enriquecer `categories`** (todas as novas colunas nullable ou com default, para não quebrar linhas existentes durante o ALTER):

```
code         text       -- '3.1', '3.1.1', ... (único por company)
parent_id    uuid       references categories(id) on delete cascade
grupo        text       references dre_groups(grupo)
is_synthetic boolean    not null default false   -- true = linha de grupo (3.1), false = folha analítica (3.1.1)
active       boolean    not null default true
sort_order   integer    not null default 0
description  text
```
- `kind` mantém-se (texto), mas passa a aceitar também `'neutro'` além de `receita`/`despesa`. Derivado de `dre_groups.natureza` (receita/neutro/ custo+despesa → mapeado para o `kind` da aba). Para a aba, usar **`grupo → dre_groups.aba`**, não `kind`.
- `affects_dre` / `affects_cash`: **não** viram colunas novas em `categories`; derivam da folha do plano. Decisão YAGNI: a DRE usa `dre_position` (via `grupo`), e fluxo de caixa já existe separado. Guardamos só `grupo` + `code` + `parent_id` + `is_synthetic`; o resto deriva de `dre_groups`. (Se no futuro precisar de override por folha, adiciona-se coluna; agora não.)
- Índice único `(company_id, code)`. Índice `(company_id, parent_id)`.

**Função de seed idempotente** `fn_seed_default_categories(p_company uuid)`:
1. Para cada grupo sintético do `planoDeConta` (códigos x.y): upsert por `(company_id, code)` — linha `is_synthetic=true`, `parent_id=null`.
2. Para cada folha (x.y.z): se o código corresponde a uma das 8 folhas mapeadas e já existe linha "legada" (match pela tabela de-para por nome), faz UPDATE dessa linha adotando code/grupo/parent/name; senão upsert nova folha `is_synthetic=false` com `parent_id` = id do grupo sintético.
3. Roda no fim da migração para a empresa existente; fica disponível para o botão "Configurar categorias padrão" e para o provisionamento de empresas novas (chamada futura no `fn_admin_create_company`, fora do escopo desta entrega).

## DRE estruturada

### `fn_dre(p_start date, p_end date)` reescrita

Substitui o agrupamento por `categories.name` (0013) por agrupamento por **posição na DRE**:

1. Soma realizada por categoria no período (de `receivables`/`payables` liquidados, mantendo a fonte que o 0013 já usa).
2. Junta cada categoria ao seu `grupo` → `dre_groups(dre_position, sinal)`.
3. Agrega por `dre_position` aplicando `sinal`, e devolve um JSON com as linhas da DRE na ordem gerencial:
   - Receita Bruta → (−) Deduções → **Receita Líquida** → (−) Custos (lucro_bruto) → **Lucro Bruto** → (−) Despesas Operacionais → **EBITDA** → (−) Depreciação → (±) Resultado Financeiro → **LAIR** → (−) IR/CSLL → **Lucro Líquido**.
4. Retorna também o detalhamento por grupo (para a página DRE drill-down) e ignora `dre_position='nao_afeta'`.

A página `app/(app)/dre/page.tsx` passa a renderizar a partir desse JSON estruturado (subtotais calculados no banco). Mantém formatação BRL e layout atual, só troca a fonte de dados.

## Frontend

### `lib/db/categories.ts` (reescrita)
- `CategoryNode = { id, code, name, grupo, kind, parent_id, is_synthetic, active, sort_order, description, dre_label, dre_cor, dre_position, aba, children: CategoryNode[] }`.
- `listCategoryTree()`: lê `categories` + join `dre_groups`, monta árvore 2 níveis em memória, ordena por `code`. Retorna agrupado por `aba` (receita/despesa/neutra).

### `categories-client.tsx` (reescrita — espelho dos prints)
- Header: "Categorias financeiras" + subtítulo "Estrutura inspirada no Conta Azul, conectada ao plano de contas e à DRE gerencial."
- Topo: botão **"Configurar categorias padrão"** (engrenagem, chama `seedDefaults` action) à esquerda; **"+ Novo registro"** (azul) à direita; busca "Buscar categoria ou código...".
- 3 abas: "Categorias de receita" / "Categorias de despesa" / "Categorias que não afetam DRE". Cada uma = card com título, subtítulo e botão colorido "Nova categoria de X" (verde/vermelho/roxo).
  - Subtítulos: receita "Entradas, deduções e receitas financeiras posicionadas na DRE."; despesa "Custos, despesas operacionais, impostos e resultado financeiro."; neutra "Investimentos, empréstimos, sócios e transferências internas."
- Colunas: **CATEGORIA | DRE | AÇÕES**. Linhas sintéticas em negrito (bolinha colorida, código + nome, subtítulo cinza, chevron expandir/colapsar); folhas indentadas (bolinha menor, código + nome). Badge DRE colorido por `dre_position`. Ações por linha: `+` (criar filho), lápis (editar), lixeira (excluir).
- Busca filtra por nome ou código (mantém ancestrais visíveis).

### `actions.ts` (reescrita — CRUD hierárquico)
- `createCategory({ parent_id?, grupo, name, code?, kind, is_synthetic })` — code auto-gerado se ausente (próximo sob o pai); `company_id` via RLS default.
- `updateCategory({ id, name?, grupo?, active?, description? })`.
- `deleteCategory(id)` — bloqueia se houver filhos ou transações vinculadas (retorna erro amigável em pt-BR).
- `seedDefaults()` — chama `fn_seed_default_categories(auth_company_id())`.
- Todas `revalidatePath("/registers/categories")` e `/dre`.

### Seletor de categoria em Lançamentos
- O picker de categoria (em `transactions`/`payables`/`receivables`) passa a oferecer **apenas folhas analíticas** (`is_synthetic=false, active=true`), agrupadas por grupo. Sintéticas não são selecionáveis.

### Aposentar "Plano de Contas" separado
- A página `/registers/accounts-plan` deixa de fazer sentido (vira a própria aba Categorias). Remover do menu lateral e redirecionar a rota para `/registers/categories`. Não apagar `lib/accounts-plan.ts` ainda — `bi/` e a DRE antiga referenciam dados mock; migrar consumidores ou manter o arquivo como fonte de seed.

## Decisões / YAGNI
- **2 níveis no seed** (grupo + folha). O schema permite profundidade maior via `parent_id`; criação manual de subníveis fica habilitada mas não é semeada.
- `affects_dre`/`affects_cash` **não** persistidos — derivam de `dre_groups`. Evita redundância e divergência.
- `accounts_plan` (tabela) e `lib/accounts-plan.ts` (mock de BI) **não** são apagados nesta entrega; só deixam de ser a fonte das categorias. Limpeza posterior.
- Provisionar plano em empresas novas (hook no `fn_admin_create_company`) fica para entrega futura; `fn_seed_default_categories` já deixa pronto.

## Critérios de aceite
1. Aba Categorias visualmente idêntica aos prints (3 abas, árvore, códigos, badges DRE, ações).
2. Criar/editar/excluir persiste no banco por empresa e reflete na UI após revalidate.
3. As 81 transações continuam válidas (nenhuma FK quebrada); seus valores aparecem na DRE no grupo correto.
4. DRE renderiza subtotais estruturados (Receita Líquida, Lucro Bruto, EBITDA, LAIR, Lucro Líquido) a partir de `fn_dre`.
5. `npx tsc --noEmit && npx next build` verde.
