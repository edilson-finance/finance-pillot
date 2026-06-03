# FinancePilot — Backend Real (Supabase) — Design

**Data:** 2026-06-03
**Status:** Aprovado (design), pendente implementação
**Autor:** Edils (via Claude)

## Objetivo

Transformar o frontend atual do FinancePilot (Next.js 16, dados mocados) em um
sistema SaaS multi-tenant completo e funcional, com backend inteiramente no
Supabase: autenticação real, todos os CRUDs persistindo, e todas as telas
analíticas calculando sobre dados reais. Sem dados mock em produção. Foco em
robustez, segurança e fluidez.

## Decisões fundamentais (travadas com o usuário)

1. **Multi-tenant (SaaS):** cada empresa tem dados 100% isolados via `company_id` + RLS.
2. **Auth:** e-mail/senha. O signup cria a empresa e o usuário vira `admin` (dono).
   Admin pode convidar membros para a mesma empresa.
3. **Papéis:**
   - `super_admin` — vê tudo de todas as empresas (cross-tenant); definido manualmente no banco.
   - `admin` — vê e gerencia tudo da própria empresa.
   - `member` — vê apenas os módulos que o admin da empresa liberar (permissões granulares).
4. **Dados:** todas as telas (CRUD e analíticas) usam dados reais. Nenhum mock.
5. **Backend 100% no Supabase:** Next.js é só frontend (auth por cookie via `@supabase/ssr`).
   Lógica vive no Supabase: tabelas + RLS, views/funções SQL para agregações,
   Edge Functions para segredos (CFO AI/Gemini, convites).

## Projeto Supabase

- URL: `https://wrskpolxgtchnqjpygqd.supabase.co`
- Acesso via MCP Supabase. O projeto tem objetos pré-existentes que **devem ser
  limpos** antes de aplicar o novo schema.

## 1. Arquitetura

```
Next.js 16 (frontend)  ──cookie/session──►  Supabase Auth
        │                                         │
        │  @supabase/ssr (browser + server)       │
        ▼                                         ▼
   Supabase Postgres  ◄── RLS (company_id + papel/permissão)
        │
        ├── Tabelas (cadastros, transações, config)
        ├── Views/Functions SQL (DRE, fluxo, BI, saúde, KPIs…)
        └── Edge Functions (CFO AI→Gemini, convite de usuário)
```

Segurança em profundidade:
- **Isolamento por empresa** → RLS (inviolável, mesmo via acesso direto do cliente).
- **Permissões de módulo do membro** → também no RLS, via função `has_module_access(module)`,
  para que um membro não burle pela API direta.
- **Super admin** → política de bypass que ignora `company_id`.

## 2. Modelo de dados

Todas as tabelas de negócio carregam `company_id uuid not null` e
`created_at`/`updated_at`. FKs ligam transações aos cadastros.

### Identidade / tenant
- `companies` — `id`, `name`, `type` (enum dos 8 perfis), `logo_url`, `created_at`.
- `profiles` — 1:1 com `auth.users`: `id` (= auth uid), `company_id`, `name`,
  `role` (`super_admin` | `admin` | `member`), `created_at`.
- `member_permissions` — `user_id`, `module` (texto: `dashboard`, `cashflow`,
  `payables`, `receivables`, `dre`, `bi`, `reports`, `reconciliation`, `health`,
  `diagnostic`, `delinquent`, `alerts`, `transactions`, `registers`, `users`,
  `settings`, …), `allowed bool`. PK (user_id, module).
- `invites` — `id`, `company_id`, `email`, `role`, `token`, `status`
  (`pending`|`accepted`|`revoked`), `created_at`, `expires_at`.

### Cadastros (CRUD)
- `customers` — clientes (nome, doc/CNPJ, contato, telefone, e-mail, status).
- `suppliers` — fornecedores (nome, doc, contato).
- `products` — produtos/serviços (nome, tipo, preço, unidade).
- `categories` — categorias de receita/despesa (nome, tipo).
- `cost_centers` — centros de custo (nome, código).
- `accounts` — contas bancárias (nome, banco, tipo, saldo inicial).
- `accounts_plan` — plano de contas (estrutura hierárquica: código, nome, parent_id, tipo).

### Transações (CRUD)
- `transactions` — lançamentos: `type` (entrada/saída), `date`, `amount`,
  `description`, `category_id`, `account_id`, `cost_center_id`, `customer_id?`,
  `supplier_id?`.
- `payables` — contas a pagar: `supplier_id`, `description`, `category_id`,
  `due_date`, `installment`, `amount`, `status` (`a_pagar`|`em_atraso`|`pago`),
  `account_id`, `paid_at?`.
- `receivables` — contas a receber: `customer_id`, `description`, `category_id`,
  `due_date`, `installment`, `amount`, `status` (`a_receber`|`em_atraso`|`recebido`),
  `account_id`, `received_at?`. `days_overdue` calculado.

## 3. Autenticação e papéis

- **Signup:** e-mail/senha → cria `auth.user`. Trigger `handle_new_user` (ou fluxo
  de Server Action no onboarding) cria `company` + `profile` (`admin`) e seleciona
  o tipo de empresa. (Decisão de implementação: usar Server Action de onboarding
  pós-signup para coletar nome da empresa + tipo de forma confiável, em vez de
  trigger cego — detalhar no plano.)
- **Login:** e-mail/senha, sessão por cookie SSR. Middleware Next protege `(app)/*`
  e redireciona não autenticados para `/login`.
- **Convites:** admin convida e-mail → Edge Function gera token/envia link →
  convidado se cadastra já vinculado à empresa como `member`.
- **Tela Usuários:** admin lista membros, ajusta papel e marca módulos permitidos
  (`member_permissions`).

## 4. Camada analítica (views/functions SQL)

Substitui `lib/mock-data.ts` e `lib/filtered-mock.ts`. Cada agregação respeita RLS.
Funções com parâmetro de período (`p_start date, p_end date`) para o seletor de datas.

- `fn_kpis(p_start, p_end)` — saldo atual/projetado, faturamento, lucro líquido,
  margem, a receber/pagar (e vencidos), inadimplência, ponto de equilíbrio,
  ticket médio, margem de contribuição, EBITDA, capital de giro.
- `fn_dre(p_start, p_end)` — DRE hierárquico (receita bruta → deduções → receita
  líquida → custos variáveis → margem de contribuição → despesas fixas → resultado
  operacional → despesas financeiras → retiradas → lucro líquido).
- `fn_cashflow(p_start, p_end)` — extrato realizado + saldo corrente.
- `fn_cashflow_projection(p_start, p_end)` — projeção por semana (realizado + projetado).
- `fn_revenue_expense(p_start, p_end)` — série temporal receita/despesa por período.
- `v_top_clients`, `v_top_expenses` — concentração de receita/despesa.
- `v_health_dimensions` — 10 dimensões de saúde com nota/status.
- `v_delinquents` — inadimplentes com dias de atraso, status de cobrança, contato.
- Views/funções adicionais conforme as demais telas analíticas (margens, tendências,
  comparativos, indicadores, projeções, cenários, metas, orçamentos, radar, timeline,
  insights, explorar) — cada uma deriva das tabelas-base.

## 5. Wiring do frontend

- `lib/supabase/client.ts` e `lib/supabase/server.ts` — clients via `@supabase/ssr`.
- `middleware.ts` — refresh de sessão + guarda de rotas `(app)/*`.
- Trocar imports de `mock-data`/`filtered-mock` por chamadas reais: leitura em
  Server Components, escrita via Server Actions. **Layout/visual atual preservado.**
- `company-context` reflete a empresa do usuário logado; `date-context` alimenta o
  parâmetro de período das funções SQL.
- CFO AI: mover `app/api/cfo-ai/route.ts` para Edge Function Supabase, com
  `GEMINI_API_KEY` como secret no Supabase. Manter o fallback atual.
- **Seed:** popular uma empresa-demo com o equivalente aos dados mock atuais, para
  que todas as telas já apareçam preenchidas em desenvolvimento.

## 6. Estratégia de testes

- **Migrations versionadas** aplicadas via MCP; cada uma validada após aplicar.
- **RLS:** criar 2 empresas; provar isolamento total (A não vê B). Membro sem
  permissão é bloqueado no banco, não só na UI. Super admin enxerga ambas.
- **CRUD:** cada tela testada criar → editar → excluir, persistindo no Supabase.
- **Build/lint** Next a cada camada. Rodar o app e navegar (golden path + bordas).
- **Smoke das views:** conferir que os números calculados batem com o seed.

## 7. Ordem de execução

1. **Fundação:** limpar Supabase → schema núcleo (`companies`, `profiles`,
   `member_permissions`, `invites`) + RLS + função `has_module_access` + fluxo de
   signup/onboarding + clients `@supabase/ssr` + `middleware.ts` + telas login/signup.
2. **Cadastros:** 7 tabelas + RLS + Server Actions + telas reais.
3. **Transações:** `transactions`, `payables`, `receivables` + RLS + telas.
4. **Analítico:** views/functions SQL + ligar todas as telas de análise.
5. **Usuários & permissões:** tela de usuários, convites (Edge Function), enforcement.
6. **CFO AI:** Edge Function + Gemini.
7. **Seed + testes finais + polish.**

Cada bloco é uma camada testável e fechada antes de avançar para a próxima.

## Riscos / observações

- **Next 16** tem mudanças de API (ver `AGENTS.md` / `node_modules/next/dist/docs/`).
  Consultar os docs locais antes de escrever código de framework.
- **Token Supabase** foi exposto em chat; recomendar rotação após a entrega.
- **Permissão de membro** distingue isolamento de tenant (RLS forte) de visibilidade
  de módulo (também no RLS via `has_module_access`, mas conceitualmente autorização).
- **Onboarding pós-signup**: confirmar no plano se via trigger ou Server Action.
