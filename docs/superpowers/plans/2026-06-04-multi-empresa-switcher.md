# Multi-empresa (trocador de empresas) — Plano de Implementação

> **Para executores:** implementar tarefa a tarefa. A parte de banco roda em produção (Supabase ref `wrskpolxgtchnqjpygqd`) via `/tmp/fp_runsql.sh`. Testar funções em simulação (`set_config('request.jwt.claims', ...)` + `set local role authenticated`) antes de confiar.

**Goal:** Permitir que um mesmo login participe de várias empresas (como admin ou membro) e alterne entre elas por um seletor no topo, com permissões de módulo por empresa.

**Architecture:** Nova tabela `company_members(company_id, user_id, role)` é a fonte de verdade das participações. `profiles.company_id` passa a ser a **empresa ativa** e `profiles.role` o **papel na empresa ativa** (espelho). Assim `auth_company_id()`/`auth_role()` e toda a RLS existente continuam funcionando sem reescrita. `member_permissions` ganha `company_id` (permissões por empresa). Troca de empresa via `fn_switch_company`. Gestão de usuários e convites passam a operar sobre participações da empresa ativa.

**Tech Stack:** Next.js 16 App Router, Supabase Postgres (RLS + RPC security definer), edge functions Deno.

---

## Modelo de dados (decisões)

- `company_members(company_id uuid, user_id uuid, role user_role, created_at, PK(company_id,user_id))`.
- `profiles.company_id` = empresa ativa (mantido). `profiles.role` = papel na ativa (mantido, espelhado de company_members).
- `member_permissions` passa a `(user_id, company_id, module, allowed)` PK `(user_id, company_id, module)`.
- `auth_company_id()` e `auth_role()` **inalterados** (leem profiles). RLS de todas as tabelas **inalterada**.
- super_admin: ao trocar de empresa, `profiles.company_id` muda mas `profiles.role` permanece `super_admin`.

---

## Tarefa 1 — Migração 0023: tabela, backfill, RLS (aditivo, não quebra nada)

**Files:** Create `supabase/migrations/0023_multi_company.sql`

- [ ] `company_members` + RLS:
  - SELECT: `user_id = auth.uid() OR company_id = auth_company_id() OR is_super_admin()`.
  - escrita só por RPC (sem policy de INSERT/UPDATE/DELETE para authenticated; funções são security definer).
- [ ] Backfill participações a partir de profiles:
  ```sql
  insert into public.company_members(company_id,user_id,role)
  select company_id,id,role from public.profiles where company_id is not null
  on conflict do nothing;
  ```
- [ ] `member_permissions.company_id`: adicionar nullable → backfill (`= profiles.company_id`) → not null → trocar PK para `(user_id,company_id,module)`. FK `company_id → companies(id) on delete cascade`.
- [ ] Aplicar e **verificar**: contagem de company_members == nº de profiles com company; member_permissions todas com company_id.

## Tarefa 2 — Migração 0023 (cont.): RPC de troca e listagem

- [ ] `fn_switch_company(p_company_id uuid)` security definer:
  - se `is_super_admin()`: `update profiles set company_id=p_company_id where id=auth.uid()` (mantém role super_admin); return.
  - senão: ler role em company_members(user=auth.uid(), company=p_company_id); se nulo → `raise 'forbidden'`; `update profiles set company_id=p_company_id, role=v_role`.
  - `revoke from public; grant execute to authenticated`.
- [ ] Testar em simulação com o Amauri (depois de ter 2 participações): trocar entre as duas funciona; trocar para empresa onde não é membro → erro.

## Tarefa 3 — Migração 0023 (cont.): vincular/desvincular (corrige o bug)

- [ ] `fn_admin_set_user_company(p_user_id,p_company_id,p_role)` vira **ADD/UPDATE** participação:
  - guard super_admin; valida empresa e usuário existem.
  - upsert em company_members (role=p_role).
  - se o usuário não tem empresa ativa (`profiles.company_id is null`) → define ativa = p_company_id e role.
  - **não remove** a outra participação.
- [ ] Novo `fn_admin_unlink_user_company(p_user_id,p_company_id)`:
  - guard super_admin; remove de company_members e member_permissions daquela empresa.
  - se era a empresa ativa: repontar para outra participação (qualquer) ou, se não houver, `company_id=null`.
- [ ] Testar: vincular Amauri à 2ª empresa como admin → mantém as duas; desvincular → some só uma.

## Tarefa 4 — Migração 0023 (cont.): RPCs de gestão por empresa

- [ ] `set_member_permissions(p_user_id,p_modules)`: escopar à empresa ativa do admin (`v_company := auth_company_id()`); exige que alvo seja membro dessa empresa (ou super_admin); delete+insert em member_permissions filtrando `company_id = v_company`.
- [ ] `set_user_role(p_user_id,p_role)`: atualizar `company_members.role` onde `(user=p_user_id, company=auth_company_id())`; se a empresa ativa do alvo == auth_company_id() → espelhar `profiles.role`; se `p_role <> 'member'` → apagar member_permissions de `(p_user_id, auth_company_id())`. Manter guardas (não rebaixar super_admin, não mudar o próprio papel).
- [ ] `remove_company_user(p_user_id)`: remover participação `(p_user_id, auth_company_id())` + member_permissions dessa empresa. Guarda "último admin" contando admins em company_members daquela empresa. Se era a empresa ativa do alvo → repontar para outra participação ou, se nenhuma, apagar o profile.
- [ ] `accept_invite(p_token)`: se profile NÃO existe → cria profile (ativa = convite.company) + company_members + (se member) member_permissions por empresa. Se profile JÁ existe → apenas adiciona company_members + member_permissions da empresa do convite (permite usuário existente entrar em nova empresa). Marca convite aceito.
- [ ] Testar cada um em simulação.

## Tarefa 5 — Edge function admin-create-user

**Files:** Modify `supabase/functions/admin-create-user/index.ts`

- [ ] Após inserir profile, inserir também em `company_members(company_id,user_id,role)` quando `company_id` informado.
- [ ] Deploy via `/tmp/fp_deploy_fn.sh admin-create-user` (ou script equivalente). Testar criação.

## Tarefa 6 — Sessão: carregar empresas e permissões por empresa ativa

**Files:** Modify `lib/session-context.tsx`, `lib/auth.ts`

- [ ] `SessionInfo`: adicionar `companyId: string` e `companies: { id: string; name: string; role: UserRole }[]`.
- [ ] `getSessionContext`: 
  - `companyId = profile.company_id`.
  - membros: `member_permissions` filtrado por `company_id = profile.company_id`.
  - `companies`: query `company_members` join `companies` para o usuário (super_admin: pode ser só as participações dele — manter simples).
- [ ] Build ok.

## Tarefa 7 — Middleware por empresa ativa

**Files:** Modify `lib/supabase/middleware.ts`

- [ ] Buscar `role, company_id` do profile; para member, `member_permissions` filtrado por `company_id`.

## Tarefa 8 — Seletor de empresa funcional (topbar)

**Files:** Modify `components/layout/topbar.tsx`; Create server action `switchCompany` (ex.: `app/(app)/actions.ts`)

- [ ] `switchCompany(companyId)`: chama rpc `fn_switch_company`, `revalidatePath('/', 'layout')`, redirect `/dashboard`.
- [ ] Topbar: transformar o botão em dropdown listando `session.companies` (destacando a ativa `session.companyId`); ao escolher outra, chamar `switchCompany`. Esconder dropdown se só houver 1 empresa.

## Tarefa 9 — Lista de usuários por empresa ativa

**Files:** Modify `app/(app)/users/page.tsx`

- [ ] Listar usuários da empresa ativa via `company_members` (não `profiles.company_id`), com role de company_members; member_permissions filtradas por `company_id = empresa ativa`.

## Tarefa 10 — UI vincular usuário (admin) com papel

**Files:** Modify `app/(app)/admin/companies/[id]/company-detail-client.tsx`

- [ ] No bloco "Vincular usuário existente", adicionar select de papel (Membro/Administrador) e passar a `setUserCompany(linkUserId, detail.id, role)`. Texto deixa claro que adiciona participação.

## Tarefa 11 — Validação final e deploy

- [ ] `npx tsc --noEmit` e `npx next build` limpos.
- [ ] Cenário Amauri ponta a ponta: vincular à 2ª empresa como admin; logar; trocar de empresa pelo seletor; ver dados/menus corretos em cada uma.
- [ ] Commit + push para `main`.

---

## Riscos / cuidados
- DB em produção com usuários reais. A Tarefa 1 é aditiva e retrocompatível (app antigo continua funcionando). Reordenar para aplicar todo o banco antes do app.
- Não quebrar RLS: como `auth_company_id()`/`auth_role()` não mudam, as policies seguem válidas.
- `member_permissions` PK muda: garantir backfill de `company_id` antes de tornar NOT NULL.
