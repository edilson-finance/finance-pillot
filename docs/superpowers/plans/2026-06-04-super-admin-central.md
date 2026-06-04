# Central Super Admin — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir a central exclusiva de super admin: ver uso de todas as empresas, criar empresas (+admin opcional), criar usuários com senha e vincular usuários a empresas.

**Architecture:** Abordagem A — leituras e escritas em tabelas públicas via funções SQL `security definer` liberadas por `is_super_admin()`; apenas a criação de usuário com senha numa edge function `admin-create-user` com `service_role` (já injetado pelo Supabase). Frontend em `app/(app)/admin/` no padrão server page → `lib/db/admin` → client → `actions.ts`. Modelo 1:1 mantido (`profiles.company_id` único).

**Tech Stack:** Next.js 16.2 (App Router, server components, server actions), React 19, Supabase Postgres + Edge Functions (Deno), inline styles + CSS vars.

**Deploy backend (local-only, segura PAT):**
- SQL: `echo "<sql>" | bash /tmp/fp_runsql.sh -`
- Edge fn: `bash /tmp/fp_deploy_fn.sh <slug> <path/index.ts> <verify_jwt>`

**Observações de ambiente:**
- O `cwd` da sessão volta para a raiz a cada comando Bash; **sempre** prefixe `cd /Users/victorhugosantanaalmeida/pillot-edilson-version/Finance &&`.
- Git repo está em `Finance/`. Branch atual: `feat/supabase-backend`.
- Sem suíte automatizada: validação = `tsc`/`next build` + execução SQL + smoke no navegador (padrão das fases anteriores).
- Edge functions do Supabase recebem `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` automaticamente; não é preciso setar secret manual.

---

## File Structure

**Backend:**
- Create: `supabase/migrations/0011_super_admin.sql` — 5 funções SQL `security definer`.
- Create: `supabase/functions/admin-create-user/index.ts` — edge function de criação de usuário.

**Frontend (camada de dados / ações):**
- Create: `lib/db/admin.ts` — wrappers server-side das RPCs + tipos.
- Create: `app/(app)/admin/actions.ts` — server actions (criar empresa, criar usuário, vincular).

**Frontend (telas):**
- Create: `app/(app)/admin/page.tsx` + `app/(app)/admin/overview-client.tsx` — visão geral.
- Create: `app/(app)/admin/companies/new/page.tsx` + `.../new-company-client.tsx` — criar empresa.
- Create: `app/(app)/admin/companies/[id]/page.tsx` + `.../company-detail-client.tsx` — detalhe.
- Create: `app/(app)/admin/users/page.tsx` + `.../admin-users-client.tsx` — usuários global.

**Frontend (navegação):**
- Modify: `components/layout/sidebar.tsx` — item "Central Admin" só para `super_admin`.

---

## Task 1: Funções SQL de leitura (overview + detalhe)

**Files:**
- Create: `supabase/migrations/0011_super_admin.sql`

- [ ] **Step 1: Escrever as duas funções de leitura no arquivo de migração**

Criar `supabase/migrations/0011_super_admin.sql` com:

```sql
-- 0011_super_admin.sql — Central Super Admin: leitura de uso + criação/vínculo.
-- Todas as funções são security definer e barram não-super-admin no próprio banco.

-- 1) Visão geral de TODAS as empresas (uma linha por empresa).
create or replace function public.fn_admin_companies_overview()
returns table(
  id uuid,
  name text,
  type text,
  created_at timestamptz,
  user_count int,
  last_sign_in timestamptz,
  last_transaction_at date,
  transaction_count int,
  faturamento numeric,
  despesa numeric,
  saldo numeric,
  a_receber numeric,
  a_pagar numeric,
  customers_count int,
  suppliers_count int,
  products_count int,
  transactions_count int
)
language sql stable security definer set search_path = public as $$
  with ms as (select date_trunc('month', current_date)::date as m0,
                     (date_trunc('month', current_date) + interval '1 month - 1 day')::date as m1)
  select
    c.id,
    c.name,
    c.type::text,
    c.created_at,
    (select count(*) from public.profiles p where p.company_id = c.id)::int as user_count,
    (select max(u.last_sign_in_at) from public.profiles p
       join auth.users u on u.id = p.id where p.company_id = c.id) as last_sign_in,
    (select max(t.date) from public.transactions t where t.company_id = c.id) as last_transaction_at,
    (select count(*) from public.transactions t where t.company_id = c.id)::int as transaction_count,
    coalesce((select sum(t.amount) from public.transactions t, ms
       where t.company_id = c.id and t.type = 'entrada' and t.date between ms.m0 and ms.m1), 0) as faturamento,
    coalesce((select sum(t.amount) from public.transactions t, ms
       where t.company_id = c.id and t.type = 'saida' and t.date between ms.m0 and ms.m1), 0) as despesa,
    (coalesce((select sum(a.opening_balance) from public.accounts a where a.company_id = c.id), 0)
       + coalesce((select sum(case when t.type='entrada' then t.amount else -t.amount end)
                   from public.transactions t where t.company_id = c.id), 0)) as saldo,
    coalesce((select sum(r.amount) from public.receivables r
       where r.company_id = c.id and r.status <> 'recebido'), 0) as a_receber,
    coalesce((select sum(pp.amount) from public.payables pp
       where pp.company_id = c.id and pp.status <> 'pago'), 0) as a_pagar,
    (select count(*) from public.customers x where x.company_id = c.id)::int as customers_count,
    (select count(*) from public.suppliers x where x.company_id = c.id)::int as suppliers_count,
    (select count(*) from public.products x where x.company_id = c.id)::int as products_count,
    (select count(*) from public.transactions x where x.company_id = c.id)::int as transactions_count
  from public.companies c
  where public.is_super_admin()
  order by c.created_at desc
$$;
revoke all on function public.fn_admin_companies_overview() from public;
grant execute on function public.fn_admin_companies_overview() to authenticated;

-- 2) Detalhe de UMA empresa: números + usuários. Retorna json.
create or replace function public.fn_admin_company_detail(p_company_id uuid)
returns json
language plpgsql stable security definer set search_path = public as $$
declare v_result json;
begin
  if not public.is_super_admin() then raise exception 'forbidden'; end if;
  select json_build_object(
    'id', c.id,
    'name', c.name,
    'type', c.type::text,
    'created_at', c.created_at,
    'user_count', (select count(*) from public.profiles p where p.company_id = c.id),
    'transaction_count', (select count(*) from public.transactions t where t.company_id = c.id),
    'last_transaction_at', (select max(t.date) from public.transactions t where t.company_id = c.id),
    'a_receber', coalesce((select sum(r.amount) from public.receivables r
        where r.company_id = c.id and r.status <> 'recebido'), 0),
    'a_pagar', coalesce((select sum(pp.amount) from public.payables pp
        where pp.company_id = c.id and pp.status <> 'pago'), 0),
    'saldo', (coalesce((select sum(a.opening_balance) from public.accounts a where a.company_id = c.id), 0)
        + coalesce((select sum(case when t.type='entrada' then t.amount else -t.amount end)
                    from public.transactions t where t.company_id = c.id), 0)),
    'users', coalesce((
       select json_agg(json_build_object(
         'id', p.id, 'name', p.name, 'role', p.role,
         'email', u.email, 'last_sign_in', u.last_sign_in_at
       ) order by p.created_at)
       from public.profiles p join auth.users u on u.id = p.id
       where p.company_id = c.id), '[]'::json)
  ) into v_result
  from public.companies c where c.id = p_company_id;
  if v_result is null then raise exception 'company not found'; end if;
  return v_result;
end $$;
revoke all on function public.fn_admin_company_detail(uuid) from public;
grant execute on function public.fn_admin_company_detail(uuid) to authenticated;
```

- [ ] **Step 2: Aplicar a migração no banco**

Run:
```bash
cd /Users/victorhugosantanaalmeida/pillot-edilson-version/Finance && cat supabase/migrations/0011_super_admin.sql | bash /tmp/fp_runsql.sh -
```
Expected: `[]` (ou JSON sem erro). Sem linha `HTTP 4xx`.

- [ ] **Step 3: Verificar a função de overview**

Run:
```bash
echo "select id, name, user_count, transaction_count, faturamento, saldo from fn_admin_companies_overview();" | bash /tmp/fp_runsql.sh -
```
Expected: ao menos a empresa existente (`companies=1`), com colunas preenchidas (zeros se não houver dados). Sem erro.

- [ ] **Step 4: Commit**

```bash
cd /Users/victorhugosantanaalmeida/pillot-edilson-version/Finance && git add supabase/migrations/0011_super_admin.sql && git commit -m "feat(admin): add super admin read functions (overview + detail)"
```

---

## Task 2: Funções SQL de criação e vínculo

**Files:**
- Modify: `supabase/migrations/0011_super_admin.sql` (append)

- [ ] **Step 1: Adicionar as três funções de escrita/listagem ao final do arquivo**

Append em `supabase/migrations/0011_super_admin.sql`:

```sql
-- 3) Criar uma empresa (sem vincular o chamador). Retorna o id.
-- company_type válido: industria, comercio, servicos, construcao, agro,
-- tecnologia, saude_educacao, misto. Se p_type vier vazio, usa o default da
-- coluna ('construcao').
create or replace function public.fn_admin_create_company(p_name text, p_type text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if not public.is_super_admin() then raise exception 'forbidden'; end if;
  if coalesce(trim(p_name), '') = '' then raise exception 'name required'; end if;
  if coalesce(trim(p_type), '') = '' then
    insert into public.companies(name) values (trim(p_name)) returning id into v_id;
  else
    insert into public.companies(name, type)
      values (trim(p_name), trim(p_type)::public.company_type) returning id into v_id;
  end if;
  return v_id;
end $$;
revoke all on function public.fn_admin_create_company(text, text) from public;
grant execute on function public.fn_admin_create_company(text, text) to authenticated;

-- 4) Vincular/trocar a empresa e o papel de um usuário (modelo 1:1).
create or replace function public.fn_admin_set_user_company(
  p_user_id uuid, p_company_id uuid, p_role public.user_role)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_super_admin() then raise exception 'forbidden'; end if;
  if not exists (select 1 from public.companies where id = p_company_id) then
    raise exception 'company not found';
  end if;
  update public.profiles set company_id = p_company_id, role = p_role
    where id = p_user_id;
  if not found then raise exception 'user not found'; end if;
  if p_role <> 'member' then
    delete from public.member_permissions where user_id = p_user_id;
  end if;
end $$;
revoke all on function public.fn_admin_set_user_company(uuid, uuid, public.user_role) from public;
grant execute on function public.fn_admin_set_user_company(uuid, uuid, public.user_role) to authenticated;

-- 5) Listar TODOS os usuários do sistema com a empresa atual.
create or replace function public.fn_admin_list_users()
returns table(
  id uuid, email text, name text,
  company_id uuid, company_name text,
  role public.user_role, last_sign_in timestamptz
)
language sql stable security definer set search_path = public as $$
  select p.id, u.email::text, p.name, p.company_id, c.name as company_name,
         p.role, u.last_sign_in_at
  from public.profiles p
  join auth.users u on u.id = p.id
  left join public.companies c on c.id = p.company_id
  where public.is_super_admin()
  order by p.created_at desc
$$;
revoke all on function public.fn_admin_list_users() from public;
grant execute on function public.fn_admin_list_users() to authenticated;
```

- [ ] **Step 2: (Referência) valores do enum `company_type`**

Os valores válidos já foram confirmados: `industria, comercio, servicos, construcao, agro, tecnologia, saude_educacao, misto` (default `construcao`). A função do Step 1 já trata tipo vazio caindo no default da coluna — nenhuma ação necessária aqui.

- [ ] **Step 3: Aplicar as novas funções**

Run:
```bash
cd /Users/victorhugosantanaalmeida/pillot-edilson-version/Finance && cat supabase/migrations/0011_super_admin.sql | bash /tmp/fp_runsql.sh -
```
Expected: sem `HTTP 4xx`. (Reaplicar o arquivo inteiro é idempotente — todas as funções são `create or replace`.)

- [ ] **Step 4: Verificar listagem e criação**

Run:
```bash
echo "select id, email, role, company_name from fn_admin_list_users();" | bash /tmp/fp_runsql.sh -
```
Expected: lista de usuários (ao menos o super admin existente). Sem erro.

- [ ] **Step 5: Commit**

```bash
cd /Users/victorhugosantanaalmeida/pillot-edilson-version/Finance && git add supabase/migrations/0011_super_admin.sql && git commit -m "feat(admin): add super admin create-company, set-user-company, list-users functions"
```

---

## Task 3: Edge function `admin-create-user`

**Files:**
- Create: `supabase/functions/admin-create-user/index.ts`

- [ ] **Step 1: Escrever a edge function**

Criar `supabase/functions/admin-create-user/index.ts`:

```ts
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  })
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors })
  try {
    const url = Deno.env.get("SUPABASE_URL")!
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!
    const authHeader = req.headers.get("Authorization") ?? ""

    // Passo 1 — validar que o chamador é super admin (client com o JWT do chamador).
    const caller = createClient(url, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: isAdmin, error: chkErr } = await caller.rpc("is_super_admin")
    if (chkErr) return json({ created: false, error: chkErr.message }, 400)
    if (isAdmin !== true) return json({ created: false, error: "forbidden" }, 403)

    const { email, password, name, company_id, role } = await req.json()
    if (!email || !password) return json({ created: false, error: "email e senha são obrigatórios" }, 400)
    const finalRole = role === "admin" || role === "super_admin" || role === "member" ? role : "member"

    // Passo 2 — criar o usuário com service_role (Admin API).
    const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name: name ?? "" },
    })
    if (createErr || !created?.user) {
      return json({ created: false, error: createErr?.message ?? "falha ao criar usuário" }, 400)
    }
    const userId = created.user.id

    // Passo 3 — criar o profile vinculado (ou sem empresa).
    const { error: profErr } = await admin.from("profiles").insert({
      id: userId,
      company_id: company_id ?? null,
      name: name ?? "",
      role: finalRole,
    })
    if (profErr) {
      // rollback: remove o auth user para não deixar órfão.
      await admin.auth.admin.deleteUser(userId)
      return json({ created: false, error: profErr.message }, 400)
    }

    return json({ created: true, user_id: userId })
  } catch (e) {
    return json({ created: false, error: String(e) }, 400)
  }
})
```

- [ ] **Step 2: Deployar a edge function (verify_jwt = true)**

Run:
```bash
cd /Users/victorhugosantanaalmeida/pillot-edilson-version/Finance && bash /tmp/fp_deploy_fn.sh admin-create-user supabase/functions/admin-create-user/index.ts true
```
Expected: JSON com o slug `admin-create-user` e `version`. Sem `HTTP 4xx`.

- [ ] **Step 3: Smoke negativo (sem JWT → 401 do gateway)**

Run:
```bash
echo "select 1;" | bash /tmp/fp_runsql.sh - >/dev/null && echo "skip-http-smoke (testado via UI na Task 11)"
```
Expected: imprime `skip-http-smoke...`. (O teste real de 403/criação acontece no smoke da Task 11, logado como super admin pela UI. Chamar via curl exigiria um JWT válido, fora de escopo aqui.)

- [ ] **Step 4: Commit**

```bash
cd /Users/victorhugosantanaalmeida/pillot-edilson-version/Finance && git add supabase/functions/admin-create-user/index.ts && git commit -m "feat(admin): add admin-create-user edge function (service_role, super-admin gated)"
```

---

## Task 4: Camada de dados `lib/db/admin.ts`

**Files:**
- Create: `lib/db/admin.ts`

- [ ] **Step 1: Escrever os wrappers e tipos**

Criar `lib/db/admin.ts`:

```ts
import { createClient } from "@/lib/supabase/server"

export type CompanyOverview = {
  id: string
  name: string
  type: string
  created_at: string
  user_count: number
  last_sign_in: string | null
  last_transaction_at: string | null
  transaction_count: number
  faturamento: number
  despesa: number
  saldo: number
  a_receber: number
  a_pagar: number
  customers_count: number
  suppliers_count: number
  products_count: number
  transactions_count: number
}

export type CompanyUserRow = {
  id: string
  name: string
  role: string
  email: string
  last_sign_in: string | null
}

export type CompanyDetail = {
  id: string
  name: string
  type: string
  created_at: string
  user_count: number
  transaction_count: number
  last_transaction_at: string | null
  a_receber: number
  a_pagar: number
  saldo: number
  users: CompanyUserRow[]
}

export type AdminUser = {
  id: string
  email: string
  name: string
  company_id: string | null
  company_name: string | null
  role: string
  last_sign_in: string | null
}

const num = (v: unknown) => Number(v ?? 0)

export async function listCompaniesOverview(): Promise<CompanyOverview[]> {
  const supabase = await createClient()
  const { data } = await supabase.rpc("fn_admin_companies_overview")
  return ((data ?? []) as Record<string, unknown>[]).map((r) => ({
    id: String(r.id),
    name: String(r.name ?? ""),
    type: String(r.type ?? ""),
    created_at: String(r.created_at ?? ""),
    user_count: num(r.user_count),
    last_sign_in: (r.last_sign_in as string) ?? null,
    last_transaction_at: (r.last_transaction_at as string) ?? null,
    transaction_count: num(r.transaction_count),
    faturamento: num(r.faturamento),
    despesa: num(r.despesa),
    saldo: num(r.saldo),
    a_receber: num(r.a_receber),
    a_pagar: num(r.a_pagar),
    customers_count: num(r.customers_count),
    suppliers_count: num(r.suppliers_count),
    products_count: num(r.products_count),
    transactions_count: num(r.transactions_count),
  }))
}

export async function getCompanyDetail(id: string): Promise<CompanyDetail | null> {
  const supabase = await createClient()
  const { data } = await supabase.rpc("fn_admin_company_detail", { p_company_id: id })
  if (!data) return null
  const d = data as Record<string, unknown>
  return {
    id: String(d.id),
    name: String(d.name ?? ""),
    type: String(d.type ?? ""),
    created_at: String(d.created_at ?? ""),
    user_count: num(d.user_count),
    transaction_count: num(d.transaction_count),
    last_transaction_at: (d.last_transaction_at as string) ?? null,
    a_receber: num(d.a_receber),
    a_pagar: num(d.a_pagar),
    saldo: num(d.saldo),
    users: ((d.users ?? []) as Record<string, unknown>[]).map((u) => ({
      id: String(u.id),
      name: String(u.name ?? ""),
      role: String(u.role ?? ""),
      email: String(u.email ?? ""),
      last_sign_in: (u.last_sign_in as string) ?? null,
    })),
  }
}

export async function listAllUsers(): Promise<AdminUser[]> {
  const supabase = await createClient()
  const { data } = await supabase.rpc("fn_admin_list_users")
  return ((data ?? []) as Record<string, unknown>[]).map((r) => ({
    id: String(r.id),
    email: String(r.email ?? ""),
    name: String(r.name ?? ""),
    company_id: (r.company_id as string) ?? null,
    company_name: (r.company_name as string) ?? null,
    role: String(r.role ?? ""),
    last_sign_in: (r.last_sign_in as string) ?? null,
  }))
}
```

- [ ] **Step 2: Checar tipos**

Run:
```bash
cd /Users/victorhugosantanaalmeida/pillot-edilson-version/Finance && npx tsc --noEmit 2>&1 | grep -i "lib/db/admin" || echo "OK sem erros em lib/db/admin.ts"
```
Expected: `OK sem erros em lib/db/admin.ts`.

- [ ] **Step 3: Commit**

```bash
cd /Users/victorhugosantanaalmeida/pillot-edilson-version/Finance && git add lib/db/admin.ts && git commit -m "feat(admin): add lib/db/admin data layer"
```

---

## Task 5: Server actions `app/(app)/admin/actions.ts`

**Files:**
- Create: `app/(app)/admin/actions.ts`

- [ ] **Step 1: Escrever as actions**

Criar `app/(app)/admin/actions.ts`:

```ts
"use server"
import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

type Result = { error: string | null }
type CreateUserResult = Result & { userId?: string }
type CreateCompanyResult = Result & { companyId?: string }

async function assertSuperAdmin(): Promise<{ ok: boolean; error: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "Não autenticado" }
  const { data: profile } = await supabase
    .from("profiles").select("role").eq("id", user.id).single()
  if (profile?.role !== "super_admin") return { ok: false, error: "Acesso restrito" }
  return { ok: true, error: null }
}

export async function createCompany(formData: FormData): Promise<CreateCompanyResult> {
  const guard = await assertSuperAdmin()
  if (!guard.ok) return { error: guard.error }

  const name = String(formData.get("name") ?? "").trim()
  const type = String(formData.get("type") ?? "").trim()
  if (!name) return { error: "Nome da empresa é obrigatório" }

  const supabase = await createClient()
  const { data: companyId, error } = await supabase.rpc("fn_admin_create_company", {
    p_name: name, p_type: type,
  })
  if (error) return { error: error.message }

  // Admin opcional no mesmo formulário.
  const withAdmin = String(formData.get("with_admin") ?? "") === "on"
  if (withAdmin) {
    const adminEmail = String(formData.get("admin_email") ?? "").trim().toLowerCase()
    const adminPassword = String(formData.get("admin_password") ?? "")
    const adminName = String(formData.get("admin_name") ?? "").trim()
    if (!adminEmail || !adminPassword) {
      revalidatePath("/admin")
      return { error: "Empresa criada, mas e-mail/senha do admin faltaram", companyId: String(companyId) }
    }
    const { data, error: fnErr } = await supabase.functions.invoke("admin-create-user", {
      body: { email: adminEmail, password: adminPassword, name: adminName, company_id: companyId, role: "admin" },
    })
    if (fnErr) return { error: `Empresa criada, mas falhou ao criar admin: ${fnErr.message}`, companyId: String(companyId) }
    if (data && data.created === false) {
      return { error: `Empresa criada, mas falhou ao criar admin: ${data.error}`, companyId: String(companyId) }
    }
  }

  revalidatePath("/admin")
  return { error: null, companyId: String(companyId) }
}

export async function createUser(formData: FormData): Promise<CreateUserResult> {
  const guard = await assertSuperAdmin()
  if (!guard.ok) return { error: guard.error }

  const email = String(formData.get("email") ?? "").trim().toLowerCase()
  const password = String(formData.get("password") ?? "")
  const name = String(formData.get("name") ?? "").trim()
  const companyId = String(formData.get("company_id") ?? "").trim() || null
  const role = String(formData.get("role") ?? "member")
  if (!email || !password) return { error: "E-mail e senha são obrigatórios" }

  const supabase = await createClient()
  const { data, error } = await supabase.functions.invoke("admin-create-user", {
    body: { email, password, name, company_id: companyId, role },
  })
  if (error) return { error: error.message }
  if (data && data.created === false) return { error: data.error ?? "Falha ao criar usuário" }

  revalidatePath("/admin")
  revalidatePath("/admin/users")
  return { error: null, userId: data?.user_id }
}

export async function setUserCompany(
  userId: string, companyId: string, role: string,
): Promise<Result> {
  const guard = await assertSuperAdmin()
  if (!guard.ok) return { error: guard.error }
  const supabase = await createClient()
  const { error } = await supabase.rpc("fn_admin_set_user_company", {
    p_user_id: userId, p_company_id: companyId, p_role: role,
  })
  if (error) return { error: error.message }
  revalidatePath("/admin")
  revalidatePath("/admin/users")
  return { error: null }
}
```

- [ ] **Step 2: Checar tipos**

Run:
```bash
cd /Users/victorhugosantanaalmeida/pillot-edilson-version/Finance && npx tsc --noEmit 2>&1 | grep -i "admin/actions" || echo "OK sem erros em admin/actions.ts"
```
Expected: `OK sem erros em admin/actions.ts`.

- [ ] **Step 3: Commit**

```bash
cd /Users/victorhugosantanaalmeida/pillot-edilson-version/Finance && git add "app/(app)/admin/actions.ts" && git commit -m "feat(admin): add super admin server actions"
```

---

## Task 6: Tela de visão geral `/admin`

**Files:**
- Create: `app/(app)/admin/page.tsx`
- Create: `app/(app)/admin/overview-client.tsx`

- [ ] **Step 1: Escrever a page (server, com guard)**

Criar `app/(app)/admin/page.tsx`:

```tsx
import { getSessionContext } from "@/lib/auth"
import { redirect } from "next/navigation"
import { listCompaniesOverview } from "@/lib/db/admin"
import OverviewClient from "./overview-client"

export default async function AdminPage() {
  const session = await getSessionContext()
  if (session.role !== "super_admin") redirect("/dashboard")

  const companies = await listCompaniesOverview()
  return <OverviewClient companies={companies} />
}
```

- [ ] **Step 2: Escrever o client (cards + tabela)**

Criar `app/(app)/admin/overview-client.tsx`:

```tsx
"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import type { CompanyOverview } from "@/lib/db/admin"

const brl = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })

function fmtDate(s: string | null): string {
  if (!s) return "—"
  const d = new Date(s)
  return d.toLocaleDateString("pt-BR")
}

function isActive30d(lastSignIn: string | null): boolean {
  if (!lastSignIn) return false
  return Date.now() - new Date(lastSignIn).getTime() < 30 * 24 * 3600 * 1000
}

export default function OverviewClient({ companies }: { companies: CompanyOverview[] }) {
  const router = useRouter()
  const totalUsers = companies.reduce((s, c) => s + c.user_count, 0)
  const active30 = companies.filter((c) => isActive30d(c.last_sign_in)).length

  const cardStyle: React.CSSProperties = {
    background: "var(--bg-secondary)", border: "1px solid var(--border)",
    borderRadius: "var(--radius)", padding: "16px",
  }
  const th: React.CSSProperties = {
    textAlign: "left", padding: "8px 10px", fontSize: "10px", fontWeight: 700,
    color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px",
    borderBottom: "1px solid var(--border)",
  }
  const td: React.CSSProperties = {
    padding: "10px", fontSize: "12.5px", color: "var(--text-primary)",
    borderBottom: "1px solid var(--border)",
  }

  return (
    <div style={{ padding: "22px", display: "flex", flexDirection: "column", gap: "18px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ fontSize: "20px", fontWeight: 800, color: "var(--text-primary)" }}>Central Admin</h1>
          <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "4px" }}>
            Visão geral de todas as empresas clientes.
          </p>
        </div>
        <Link href="/admin/companies/new" style={{
          background: "var(--accent)", color: "#fff", textDecoration: "none",
          padding: "9px 14px", borderRadius: "8px", fontSize: "12.5px", fontWeight: 600,
        }}>+ Nova empresa</Link>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px" }}>
        <div style={cardStyle}>
          <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>Empresas</div>
          <div style={{ fontSize: "24px", fontWeight: 800, color: "var(--text-primary)", marginTop: "4px" }}>{companies.length}</div>
        </div>
        <div style={cardStyle}>
          <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>Usuários</div>
          <div style={{ fontSize: "24px", fontWeight: 800, color: "var(--text-primary)", marginTop: "4px" }}>{totalUsers}</div>
        </div>
        <div style={cardStyle}>
          <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>Ativas (30d)</div>
          <div style={{ fontSize: "24px", fontWeight: 800, color: "var(--success)", marginTop: "4px" }}>{active30}</div>
        </div>
      </div>

      <div style={{ ...cardStyle, padding: 0, overflow: "hidden" }}>
        {companies.length === 0 ? (
          <div style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)", fontSize: "13px" }}>
            Nenhuma empresa ainda. Clique em “+ Nova empresa” para começar.
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={th}>Empresa</th>
                <th style={th}>Usuários</th>
                <th style={th}>Último acesso</th>
                <th style={th}>Lançamentos</th>
                <th style={th}>Faturamento (mês)</th>
                <th style={th}>Saldo</th>
                <th style={th}>Criada em</th>
              </tr>
            </thead>
            <tbody>
              {companies.map((c) => (
                <tr key={c.id}
                  onClick={() => router.push(`/admin/companies/${c.id}`)}
                  style={{ cursor: "pointer" }}>
                  <td style={td}>
                    <div style={{ fontWeight: 600 }}>{c.name}</div>
                    <div style={{ fontSize: "10px", color: "var(--text-muted)" }}>{c.type}</div>
                  </td>
                  <td style={td}>{c.user_count}</td>
                  <td style={td}>{fmtDate(c.last_sign_in)}</td>
                  <td style={td}>{c.transaction_count}</td>
                  <td style={td}>{brl(c.faturamento)}</td>
                  <td style={td}>{brl(c.saldo)}</td>
                  <td style={td}>{fmtDate(c.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Checar tipos**

Run:
```bash
cd /Users/victorhugosantanaalmeida/pillot-edilson-version/Finance && npx tsc --noEmit 2>&1 | grep -i "admin/page\|overview-client" || echo "OK sem erros na tela /admin"
```
Expected: `OK sem erros na tela /admin`.

- [ ] **Step 4: Commit**

```bash
cd /Users/victorhugosantanaalmeida/pillot-edilson-version/Finance && git add "app/(app)/admin/page.tsx" "app/(app)/admin/overview-client.tsx" && git commit -m "feat(admin): add overview screen"
```

---

## Task 7: Tela criar empresa `/admin/companies/new`

**Files:**
- Create: `app/(app)/admin/companies/new/page.tsx`
- Create: `app/(app)/admin/companies/new/new-company-client.tsx`

- [ ] **Step 1: Escrever a page (server, com guard)**

Criar `app/(app)/admin/companies/new/page.tsx`:

```tsx
import { getSessionContext } from "@/lib/auth"
import { redirect } from "next/navigation"
import NewCompanyClient from "./new-company-client"

export default async function NewCompanyPage() {
  const session = await getSessionContext()
  if (session.role !== "super_admin") redirect("/dashboard")
  return <NewCompanyClient />
}
```

- [ ] **Step 2: Escrever o client (form com toggle de admin)**

Criar `app/(app)/admin/companies/new/new-company-client.tsx`:

```tsx
"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { createCompany } from "../../actions"

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "9px 11px", fontSize: "13px",
  border: "1px solid var(--border)", borderRadius: "8px",
  background: "var(--bg-primary)", color: "var(--text-primary)",
}
const labelStyle: React.CSSProperties = {
  fontSize: "11px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "4px", display: "block",
}

export default function NewCompanyClient() {
  const router = useRouter()
  const [withAdmin, setWithAdmin] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()

  function onSubmit(formData: FormData) {
    setError(null)
    start(async () => {
      const res = await createCompany(formData)
      if (res.error) { setError(res.error); return }
      router.push("/admin")
    })
  }

  return (
    <div style={{ padding: "22px", maxWidth: "520px" }}>
      <h1 style={{ fontSize: "20px", fontWeight: 800, color: "var(--text-primary)" }}>Nova empresa</h1>
      <form action={onSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px", marginTop: "18px" }}>
        <div>
          <label style={labelStyle}>Nome da empresa</label>
          <input name="name" required style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Tipo</label>
          <select name="type" defaultValue="construcao" style={inputStyle}>
            <option value="industria">Indústria</option>
            <option value="comercio">Comércio</option>
            <option value="servicos">Serviços</option>
            <option value="construcao">Construção</option>
            <option value="agro">Agro</option>
            <option value="tecnologia">Tecnologia</option>
            <option value="saude_educacao">Saúde / Educação</option>
            <option value="misto">Misto</option>
          </select>
        </div>

        <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12.5px", color: "var(--text-primary)", cursor: "pointer" }}>
          <input type="checkbox" name="with_admin" checked={withAdmin} onChange={(e) => setWithAdmin(e.target.checked)} />
          Criar usuário administrador agora
        </label>

        {withAdmin && (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px", padding: "14px", border: "1px solid var(--border)", borderRadius: "8px" }}>
            <div>
              <label style={labelStyle}>Nome do admin</label>
              <input name="admin_name" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>E-mail do admin</label>
              <input name="admin_email" type="email" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Senha do admin</label>
              <input name="admin_password" type="text" style={inputStyle} />
            </div>
          </div>
        )}

        {error && <div style={{ color: "var(--danger)", fontSize: "12px" }}>{error}</div>}

        <div style={{ display: "flex", gap: "10px" }}>
          <button type="submit" disabled={pending} style={{
            background: "var(--accent)", color: "#fff", border: "none",
            padding: "9px 16px", borderRadius: "8px", fontSize: "12.5px", fontWeight: 600,
            cursor: pending ? "default" : "pointer", opacity: pending ? 0.6 : 1,
          }}>{pending ? "Criando..." : "Criar empresa"}</button>
          <button type="button" onClick={() => router.push("/admin")} style={{
            background: "transparent", color: "var(--text-secondary)", border: "1px solid var(--border)",
            padding: "9px 16px", borderRadius: "8px", fontSize: "12.5px", cursor: "pointer",
          }}>Cancelar</button>
        </div>
      </form>
    </div>
  )
}
```

- [ ] **Step 3: Checar tipos**

Run:
```bash
cd /Users/victorhugosantanaalmeida/pillot-edilson-version/Finance && npx tsc --noEmit 2>&1 | grep -i "companies/new" || echo "OK sem erros na tela nova empresa"
```
Expected: `OK sem erros na tela nova empresa`.

- [ ] **Step 4: Commit**

```bash
cd /Users/victorhugosantanaalmeida/pillot-edilson-version/Finance && git add "app/(app)/admin/companies/new" && git commit -m "feat(admin): add create-company screen"
```

---

## Task 8: Tela detalhe da empresa `/admin/companies/[id]`

**Files:**
- Create: `app/(app)/admin/companies/[id]/page.tsx`
- Create: `app/(app)/admin/companies/[id]/company-detail-client.tsx`

- [ ] **Step 1: Escrever a page (server, com guard; `params` é Promise no Next 16)**

Criar `app/(app)/admin/companies/[id]/page.tsx`:

```tsx
import { getSessionContext } from "@/lib/auth"
import { redirect, notFound } from "next/navigation"
import { getCompanyDetail, listAllUsers } from "@/lib/db/admin"
import CompanyDetailClient from "./company-detail-client"

export default async function CompanyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionContext()
  if (session.role !== "super_admin") redirect("/dashboard")

  const { id } = await params
  const [detail, allUsers] = await Promise.all([getCompanyDetail(id), listAllUsers()])
  if (!detail) notFound()

  return <CompanyDetailClient detail={detail} allUsers={allUsers} />
}
```

- [ ] **Step 2: Escrever o client (números + usuários + criar/vincular)**

Criar `app/(app)/admin/companies/[id]/company-detail-client.tsx`:

```tsx
"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import type { CompanyDetail, AdminUser } from "@/lib/db/admin"
import { createUser, setUserCompany } from "../../actions"

const brl = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "8px 10px", fontSize: "12.5px",
  border: "1px solid var(--border)", borderRadius: "8px",
  background: "var(--bg-primary)", color: "var(--text-primary)",
}

export default function CompanyDetailClient({ detail, allUsers }: { detail: CompanyDetail; allUsers: AdminUser[] }) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [pending, start] = useTransition()
  const [showCreate, setShowCreate] = useState(false)
  const [linkUserId, setLinkUserId] = useState("")

  const card: React.CSSProperties = {
    background: "var(--bg-secondary)", border: "1px solid var(--border)",
    borderRadius: "var(--radius)", padding: "16px",
  }
  const td: React.CSSProperties = {
    padding: "9px 10px", fontSize: "12.5px", color: "var(--text-primary)",
    borderBottom: "1px solid var(--border)",
  }

  function onCreateUser(formData: FormData) {
    setError(null); setMsg(null)
    formData.set("company_id", detail.id)
    start(async () => {
      const res = await createUser(formData)
      if (res.error) { setError(res.error); return }
      setMsg("Usuário criado."); setShowCreate(false); router.refresh()
    })
  }

  function onLink() {
    if (!linkUserId) return
    setError(null); setMsg(null)
    start(async () => {
      const res = await setUserCompany(linkUserId, detail.id, "member")
      if (res.error) { setError(res.error); return }
      setMsg("Usuário vinculado."); setLinkUserId(""); router.refresh()
    })
  }

  const linkable = allUsers.filter((u) => u.company_id !== detail.id)

  return (
    <div style={{ padding: "22px", display: "flex", flexDirection: "column", gap: "18px" }}>
      <div>
        <button onClick={() => router.push("/admin")} style={{
          background: "transparent", border: "none", color: "var(--accent)",
          cursor: "pointer", fontSize: "12px", padding: 0, marginBottom: "8px",
        }}>← Voltar</button>
        <h1 style={{ fontSize: "20px", fontWeight: 800, color: "var(--text-primary)" }}>{detail.name}</h1>
        <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "4px" }}>{detail.type}</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px" }}>
        {[
          { l: "Saldo", v: brl(detail.saldo) },
          { l: "A receber", v: brl(detail.a_receber) },
          { l: "A pagar", v: brl(detail.a_pagar) },
          { l: "Lançamentos", v: String(detail.transaction_count) },
        ].map((k) => (
          <div key={k.l} style={card}>
            <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>{k.l}</div>
            <div style={{ fontSize: "18px", fontWeight: 800, color: "var(--text-primary)", marginTop: "4px" }}>{k.v}</div>
          </div>
        ))}
      </div>

      {error && <div style={{ color: "var(--danger)", fontSize: "12px" }}>{error}</div>}
      {msg && <div style={{ color: "var(--success)", fontSize: "12px" }}>{msg}</div>}

      <div style={{ ...card, padding: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 16px", borderBottom: "1px solid var(--border)" }}>
          <strong style={{ fontSize: "13px", color: "var(--text-primary)" }}>Usuários ({detail.users.length})</strong>
          <button onClick={() => setShowCreate((v) => !v)} style={{
            background: "var(--accent)", color: "#fff", border: "none",
            padding: "7px 12px", borderRadius: "7px", fontSize: "12px", fontWeight: 600, cursor: "pointer",
          }}>+ Criar usuário</button>
        </div>

        {showCreate && (
          <form action={onCreateUser} style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "10px", padding: "14px 16px", borderBottom: "1px solid var(--border)" }}>
            <input name="name" placeholder="Nome" style={inputStyle} />
            <select name="role" defaultValue="member" style={inputStyle}>
              <option value="member">Membro</option>
              <option value="admin">Administrador</option>
            </select>
            <input name="email" type="email" placeholder="E-mail" required style={inputStyle} />
            <input name="password" type="text" placeholder="Senha" required style={inputStyle} />
            <button type="submit" disabled={pending} style={{
              gridColumn: "1 / -1", background: "var(--accent)", color: "#fff", border: "none",
              padding: "8px", borderRadius: "7px", fontSize: "12px", fontWeight: 600,
              cursor: pending ? "default" : "pointer", opacity: pending ? 0.6 : 1,
            }}>{pending ? "Criando..." : "Criar"}</button>
          </form>
        )}

        <div style={{ display: "flex", gap: "8px", padding: "12px 16px", borderBottom: "1px solid var(--border)", alignItems: "center" }}>
          <select value={linkUserId} onChange={(e) => setLinkUserId(e.target.value)} style={{ ...inputStyle, maxWidth: "320px" }}>
            <option value="">Vincular usuário existente…</option>
            {linkable.map((u) => (
              <option key={u.id} value={u.id}>{u.email} {u.company_name ? `(${u.company_name})` : "(sem empresa)"}</option>
            ))}
          </select>
          <button onClick={onLink} disabled={!linkUserId || pending} style={{
            background: "var(--bg-tertiary)", color: "var(--text-primary)", border: "1px solid var(--border)",
            padding: "8px 12px", borderRadius: "7px", fontSize: "12px", cursor: linkUserId ? "pointer" : "default",
          }}>Vincular</button>
        </div>

        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <tbody>
            {detail.users.map((u) => (
              <tr key={u.id}>
                <td style={td}>
                  <div style={{ fontWeight: 600 }}>{u.name || "—"}</div>
                  <div style={{ fontSize: "10px", color: "var(--text-muted)" }}>{u.email}</div>
                </td>
                <td style={td}>{u.role}</td>
                <td style={td}>{u.last_sign_in ? new Date(u.last_sign_in).toLocaleDateString("pt-BR") : "nunca"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Checar tipos**

Run:
```bash
cd /Users/victorhugosantanaalmeida/pillot-edilson-version/Finance && npx tsc --noEmit 2>&1 | grep -i "companies/\[id\]" || echo "OK sem erros na tela de detalhe"
```
Expected: `OK sem erros na tela de detalhe`.

- [ ] **Step 4: Commit**

```bash
cd /Users/victorhugosantanaalmeida/pillot-edilson-version/Finance && git add "app/(app)/admin/companies/[id]" && git commit -m "feat(admin): add company detail screen with create/link user"
```

---

## Task 9: Tela usuários global `/admin/users`

**Files:**
- Create: `app/(app)/admin/users/page.tsx`
- Create: `app/(app)/admin/users/admin-users-client.tsx`

- [ ] **Step 1: Escrever a page (server, com guard)**

Criar `app/(app)/admin/users/page.tsx`:

```tsx
import { getSessionContext } from "@/lib/auth"
import { redirect } from "next/navigation"
import { listAllUsers, listCompaniesOverview } from "@/lib/db/admin"
import AdminUsersClient from "./admin-users-client"

export default async function AdminUsersPage() {
  const session = await getSessionContext()
  if (session.role !== "super_admin") redirect("/dashboard")

  const [users, companies] = await Promise.all([listAllUsers(), listCompaniesOverview()])
  const companyOptions = companies.map((c) => ({ id: c.id, name: c.name }))
  return <AdminUsersClient users={users} companies={companyOptions} />
}
```

- [ ] **Step 2: Escrever o client (tabela + criar usuário + trocar empresa)**

Criar `app/(app)/admin/users/admin-users-client.tsx`:

```tsx
"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import type { AdminUser } from "@/lib/db/admin"
import { createUser, setUserCompany } from "../actions"

type CompanyOption = { id: string; name: string }

const inputStyle: React.CSSProperties = {
  padding: "8px 10px", fontSize: "12.5px",
  border: "1px solid var(--border)", borderRadius: "8px",
  background: "var(--bg-primary)", color: "var(--text-primary)",
}

export default function AdminUsersClient({ users, companies }: { users: AdminUser[]; companies: CompanyOption[] }) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [pending, start] = useTransition()
  const [showCreate, setShowCreate] = useState(false)

  const card: React.CSSProperties = {
    background: "var(--bg-secondary)", border: "1px solid var(--border)",
    borderRadius: "var(--radius)",
  }
  const th: React.CSSProperties = {
    textAlign: "left", padding: "8px 10px", fontSize: "10px", fontWeight: 700,
    color: "var(--text-muted)", textTransform: "uppercase", borderBottom: "1px solid var(--border)",
  }
  const td: React.CSSProperties = {
    padding: "9px 10px", fontSize: "12.5px", color: "var(--text-primary)",
    borderBottom: "1px solid var(--border)",
  }

  function onCreate(formData: FormData) {
    setError(null); setMsg(null)
    start(async () => {
      const res = await createUser(formData)
      if (res.error) { setError(res.error); return }
      setMsg("Usuário criado."); setShowCreate(false); router.refresh()
    })
  }

  function onChangeCompany(userId: string, companyId: string, role: string) {
    if (!companyId) return
    setError(null); setMsg(null)
    start(async () => {
      const res = await setUserCompany(userId, companyId, role)
      if (res.error) { setError(res.error); return }
      setMsg("Empresa atualizada."); router.refresh()
    })
  }

  return (
    <div style={{ padding: "22px", display: "flex", flexDirection: "column", gap: "16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ fontSize: "20px", fontWeight: 800, color: "var(--text-primary)" }}>Usuários</h1>
        <button onClick={() => setShowCreate((v) => !v)} style={{
          background: "var(--accent)", color: "#fff", border: "none",
          padding: "9px 14px", borderRadius: "8px", fontSize: "12.5px", fontWeight: 600, cursor: "pointer",
        }}>+ Criar usuário</button>
      </div>

      {error && <div style={{ color: "var(--danger)", fontSize: "12px" }}>{error}</div>}
      {msg && <div style={{ color: "var(--success)", fontSize: "12px" }}>{msg}</div>}

      {showCreate && (
        <form action={onCreate} style={{ ...card, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px", padding: "14px" }}>
          <input name="name" placeholder="Nome" style={inputStyle} />
          <input name="email" type="email" placeholder="E-mail" required style={inputStyle} />
          <input name="password" type="text" placeholder="Senha" required style={inputStyle} />
          <select name="company_id" defaultValue="" style={inputStyle}>
            <option value="">Sem empresa</option>
            {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select name="role" defaultValue="member" style={inputStyle}>
            <option value="member">Membro</option>
            <option value="admin">Administrador</option>
          </select>
          <button type="submit" disabled={pending} style={{
            background: "var(--accent)", color: "#fff", border: "none",
            padding: "8px", borderRadius: "7px", fontSize: "12px", fontWeight: 600,
            cursor: pending ? "default" : "pointer", opacity: pending ? 0.6 : 1,
          }}>{pending ? "Criando..." : "Criar"}</button>
        </form>
      )}

      <div style={{ ...card, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={th}>Usuário</th>
              <th style={th}>Empresa</th>
              <th style={th}>Papel</th>
              <th style={th}>Último login</th>
              <th style={th}>Trocar empresa</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td style={td}>
                  <div style={{ fontWeight: 600 }}>{u.name || "—"}</div>
                  <div style={{ fontSize: "10px", color: "var(--text-muted)" }}>{u.email}</div>
                </td>
                <td style={td}>{u.company_name ?? "—"}</td>
                <td style={td}>{u.role}</td>
                <td style={td}>{u.last_sign_in ? new Date(u.last_sign_in).toLocaleDateString("pt-BR") : "nunca"}</td>
                <td style={td}>
                  <select defaultValue="" disabled={pending}
                    onChange={(e) => onChangeCompany(u.id, e.target.value, u.role === "super_admin" ? "admin" : u.role)}
                    style={{ ...inputStyle, padding: "5px 8px" }}>
                    <option value="">—</option>
                    {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Checar tipos**

Run:
```bash
cd /Users/victorhugosantanaalmeida/pillot-edilson-version/Finance && npx tsc --noEmit 2>&1 | grep -i "admin/users" || echo "OK sem erros na tela de usuários"
```
Expected: `OK sem erros na tela de usuários`.

- [ ] **Step 4: Commit**

```bash
cd /Users/victorhugosantanaalmeida/pillot-edilson-version/Finance && git add "app/(app)/admin/users" && git commit -m "feat(admin): add global users screen"
```

---

## Task 10: Item de menu na sidebar (só super admin)

**Files:**
- Modify: `components/layout/sidebar.tsx`

- [ ] **Step 1: Adicionar a seção "Super Admin" e filtrá-la por papel**

Em `components/layout/sidebar.tsx`:

1. No import de ícones (linhas 5-10), adicionar `ShieldCheck`:

```tsx
import {
  LayoutDashboard, ArrowLeftRight, CreditCard, Wallet,
  BarChart3, TrendingUp, FileText, RefreshCw, Activity,
  BrainCircuit, Bell, Settings, Users, Package, Zap, LogOut,
  AlertTriangle, ShieldCheck,
} from "lucide-react"
```

2. Marcar a seção "Gestão" com a flag e adicionar uma nova seção `superAdmin` logo após o array `sections` (após a linha 57). Trocar a abertura `const sections = [` por uma versão tipada e adicionar a seção exclusiva:

Substituir o fechamento do array `sections` (linha 56-57, o `]` final) por:

```tsx
  },
]

const superAdminSection = {
  label: "Super Admin",
  items: [
    { href: "/admin", label: "Central Admin", icon: ShieldCheck },
  ],
}
```

3. Na função `Sidebar`, logo após calcular `visibleSections` (linhas 114-119), anexar a seção exclusiva quando o papel for super admin:

```tsx
  const allSections = session.role === "super_admin"
    ? [...visibleSections, superAdminSection]
    : visibleSections
```

4. Trocar o `.map` de render (linha 162) de `visibleSections.map` para `allSections.map`.

- [ ] **Step 2: Checar tipos**

Run:
```bash
cd /Users/victorhugosantanaalmeida/pillot-edilson-version/Finance && npx tsc --noEmit 2>&1 | grep -i "sidebar" || echo "OK sem erros na sidebar"
```
Expected: `OK sem erros na sidebar`.

- [ ] **Step 3: Commit**

```bash
cd /Users/victorhugosantanaalmeida/pillot-edilson-version/Finance && git add components/layout/sidebar.tsx && git commit -m "feat(admin): add super admin nav item to sidebar"
```

---

## Task 11: Validação final (build + smoke)

**Files:** nenhum (validação)

- [ ] **Step 1: Type check completo**

Run:
```bash
cd /Users/victorhugosantanaalmeida/pillot-edilson-version/Finance && npx tsc --noEmit
```
Expected: sem saída de erro (exit 0).

- [ ] **Step 2: Build de produção**

Run:
```bash
cd /Users/victorhugosantanaalmeida/pillot-edilson-version/Finance && npx next build 2>&1 | tail -30
```
Expected: build conclui; as rotas `/admin`, `/admin/companies/new`, `/admin/companies/[id]`, `/admin/users` aparecem na listagem. Sem erro de compilação.

- [ ] **Step 3: Smoke no navegador (logado como super admin)**

Subir o dev server (`npx next dev`), logar com o super admin existente e validar manualmente:
1. A sidebar mostra "Central Admin" (seção Super Admin).
2. `/admin` lista a(s) empresa(s) com métricas; cards de totais corretos.
3. `/admin/companies/new`: criar uma empresa de teste **com** admin (email+senha). Volta para `/admin` e a nova empresa aparece.
4. Abrir o detalhe da nova empresa: o admin criado aparece na lista de usuários.
5. `/admin/users`: criar um usuário avulso (sem empresa) e depois trocar a empresa dele pelo dropdown.
6. Abrir aba anônima e logar com o admin recém-criado: entra direto (sem onboarding) na empresa correta.

Expected: todos os passos sem erro de runtime nem no console.

- [ ] **Step 4: Smoke negativo (usuário comum não acessa)**

Logado como um usuário `member` ou `admin` comum, navegar manualmente para `/admin`.
Expected: redireciona para `/dashboard`. A sidebar não mostra "Central Admin".

- [ ] **Step 5: Commit final (se houver ajustes pendentes)**

```bash
cd /Users/victorhugosantanaalmeida/pillot-edilson-version/Finance && git add -A && git commit -m "test(admin): final validation of super admin central" || echo "nada a commitar"
```

---

## Notas finais

- **Rotacionar a PAT** `sbp_...` exposta no chat após a entrega (lembrete carregado de sessões anteriores).
- **Fora de escopo (futuro):** multi-empresa por usuário (tabela `company_members`, empresa ativa, dropdown switcher, reescrita de RLS); período configurável no resumo financeiro; suspender/reativar empresas.
