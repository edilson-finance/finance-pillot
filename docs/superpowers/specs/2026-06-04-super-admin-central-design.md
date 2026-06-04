# Central Super Admin — Design

**Data:** 2026-06-04
**Status:** Aprovado (aguardando revisão do arquivo pelo usuário)

## Objetivo

Construir uma central exclusiva de super admin no FinancePilot onde o operador da
plataforma possa: (1) ver o uso/atividade de todas as empresas clientes, (2) criar
novas empresas, (3) criar novos usuários com e-mail e senha, e (4) vincular usuários
a empresas.

## Decisões de escopo (confirmadas com o usuário)

- **Criar usuário:** direto com e-mail + senha (usuário já ativo, loga na hora). Exige
  edge function com `service_role` (Admin API do Supabase).
- **Ver uso dos clientes:** tudo — cadastro/status, atividade real, resumo financeiro
  e volume de dados por empresa.
- **Criar empresa:** empresa + admin juntos, com opção de pular o admin.
- **Modelo de vínculo:** **1 empresa por usuário** (mantém `profiles.company_id`
  único). Multi-empresa foi deliberadamente adiado para uma fase futura.
- **Abordagem técnica (A):** leituras e escritas em tabelas públicas via funções SQL
  `security definer` liberadas por `is_super_admin()`; apenas a criação de usuário com
  senha vai numa edge function com `service_role`.

## Fundação já existente (não refazer)

- Enum `user_role('super_admin','admin','member')`.
- Função `is_super_admin()` (lê `profiles.role`).
- RLS com cláusula `or is_super_admin()` nas tabelas core (acesso cross-company).
- Funções existentes: `fn_company_users`, `set_user_role`, `remove_company_user`,
  `create_company_and_profile`.
- Edge function `invite-user` (envio de e-mail opcional via Resend) — não é alterada
  por esta spec; criação direta é um caminho novo.
- `mailer_autoconfirm = true` no projeto (não exige confirmação de e-mail).

## Arquitetura geral

**Rota e proteção.** Nova seção `app/(app)/admin/`. Toda page é server component e
checa no topo: se `session.role !== "super_admin"`, `redirect("/dashboard")`.

**Camadas (segue o padrão dos CRUDs do projeto):**

```
app/(app)/admin/.../page.tsx   (server: busca dados via lib/db/admin)
  -> lib/db/admin.ts           (server: chama as RPCs/funções SQL)
  -> *-client.tsx              (client: tabela/forms com inline styles + CSS vars)
  -> actions.ts ("use server") (mutações: criar empresa, vincular, disparar edge fn)
```

**Onde mora cada poder:**

- Ler uso de todas as empresas → funções SQL `security definer` (gated `is_super_admin()`).
- Criar empresa / vincular usuário → funções SQL `security definer` (tabelas públicas).
- Criar usuário com senha → edge function `admin-create-user` com `service_role`.

**Navegação.** Item "Central Admin" no menu lateral, visível só quando
`role === "super_admin"`.

## Backend

Migração nova: `supabase/migrations/0011_super_admin.sql`. Toda função `fn_admin_*`
inicia com `if not public.is_super_admin() then raise exception 'forbidden'`.

### Funções SQL

1. **`fn_admin_companies_overview()`** — uma linha por empresa:
   - Cadastro/status: `id, name, type, created_at, user_count`.
   - Atividade real: `last_sign_in` (de `auth.users.last_sign_in_at`),
     `last_transaction_at`, `transaction_count`.
   - Resumo financeiro (mês corrente): `faturamento, despesa, saldo, a_receber, a_pagar`.
   - Volume de dados: `customers_count, suppliers_count, products_count, transactions_count`.

2. **`fn_admin_company_detail(p_company_id uuid)`** — os mesmos números de uma empresa
   + lista de usuários dela (`user_id, name, email, role, last_sign_in`).

3. **`fn_admin_create_company(p_name text, p_type text) returns uuid`** — cria a empresa
   (sem vincular o chamador) e devolve o `id`.

4. **`fn_admin_set_user_company(p_user_id uuid, p_company_id uuid, p_role user_role)`** —
   vincula/troca a empresa de um usuário (modelo 1:1: seta `profiles.company_id` e `role`).

5. **`fn_admin_list_users()`** — todos os usuários: `user_id, email, name, company_id,
   company_name, role, last_sign_in`.

### Edge function `admin-create-user` (única com `service_role`)

- Entrada: `{ email, password, name, company_id?, role }` + JWT do chamador no header
  `Authorization`.
- Passo 1 (segurança): cria client com o JWT do chamador e confirma `is_super_admin()`.
  Se não for, retorna 403 e **não** usa a `service_role`.
- Passo 2: com `service_role`, cria o usuário via `auth.admin.createUser`
  (`email_confirm: true`).
- Passo 3: insere/atualiza o `profile` ligando `company_id` + `role` (ou sem empresa se
  `company_id` nulo).
- Saída: `{ created: true, user_id }` ou erro tratado.

**Segredos:** `service_role` só como env var da edge function no Supabase. Nunca no
front nem no git (mesmo padrão da CFO AI).

## Telas (UI)

Visual atual: inline styles + CSS vars, mesma pegada das demais páginas.

1. **`/admin` — Visão geral.** Cards de totais (nº empresas, nº usuários, ativas em 30d)
   + tabela: empresa, tipo, nº usuários, último acesso, lançamentos, faturamento/saldo do
   mês, criada em. Linha clica → detalhe. Botão "+ Nova empresa".

2. **`/admin/companies/new` — Criar empresa (+admin opcional).** Form nome + tipo. Toggle
   "criar admin agora" revela nome/email/senha. Submeter: sem toggle →
   `fn_admin_create_company`; com toggle → `fn_admin_create_company` e depois
   `admin-create-user` (role admin, vinculado à empresa criada).

3. **`/admin/companies/[id]` — Detalhe da empresa.** `fn_admin_company_detail`: números +
   lista de usuários. Ações: "+ Criar usuário nesta empresa" (form → edge function) e
   "Vincular usuário existente" (dropdown via `fn_admin_list_users` →
   `fn_admin_set_user_company`).

4. **`/admin/users` — Usuários (global).** Tabela de todos os usuários
   (`fn_admin_list_users`): nome, email, empresa atual, role, último login. Ações: criar
   usuário (escolhe empresa+role) e trocar empresa/role de um usuário existente.

**Estados:** loading (skeleton como nas outras telas), vazio, erro (mensagem amigável em
PT), e feedback de sucesso ao criar/vincular.

## Fluxo de dados e segurança (defesa em profundidade)

1. **UI/rota:** page server checa `session.role === "super_admin"`; senão redireciona.
   Item de menu só aparece pra super admin.
2. **Funções SQL:** cada `fn_admin_*` barra não-admin no banco (`raise exception`).
3. **Edge function:** valida super admin antes de tocar na `service_role`; senão 403.
4. **Segredos:** `service_role` só na edge function.

**Fluxo criar empresa + admin (caminho mais complexo):**
`/admin/companies/new` → `actions.ts` → `fn_admin_create_company` devolve `company_id`
→ action chama `admin-create-user` (passa JWT do super admin) → edge valida → cria auth
user + profile vinculado → `revalidatePath("/admin")` → UI confirma e redireciona.

**Erros tratados (mensagem amigável em PT):** email já existe, senha fraca, super admin
inválido, falha de rede da edge.

## Testes

Sem suíte automatizada no projeto; validação manual como nas fases anteriores:

- **Build/tipos:** `tsc` sem erros + `next build` passando com as novas rotas.
- **Funções SQL:** rodar cada `fn_admin_*` como super admin (sucesso) e como usuário
  comum (recebe `forbidden`).
- **Edge function:** `admin-create-user` com JWT de super admin (cria) e com JWT comum (403).
- **Smoke no navegador:** logar como super admin, abrir as 4 telas, criar empresa de teste
  com admin, criar usuário avulso, vincular, confirmar que o novo admin loga na empresa
  certa. Depois, logar como usuário comum e confirmar que `/admin` redireciona.

## Fora de escopo (futuro)

- Multi-empresa por usuário (tabela `company_members`, empresa ativa, seletor dropdown,
  reescrita de RLS).
- Período configurável no resumo financeiro (começa fixo no mês corrente).
- Suspender/reativar empresas, billing/uso por plano.
