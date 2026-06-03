# FinancePilot — Backend Real (Supabase) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the mocked FinancePilot frontend into a working multi-tenant SaaS with all backend on Supabase: real auth, all CRUDs persisting, and every analytical screen computed from real data.

**Architecture:** Next.js 16 frontend talks to Supabase via `@supabase/ssr` (cookie sessions). All logic lives in Supabase: tables + RLS for tenant isolation and member permissions, SQL views/functions for analytics, Edge Functions for secrets (CFO AI/Gemini, invites). Security in depth: tenant isolation and member-module access both enforced by RLS so direct API calls can't bypass the UI.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind 4, Supabase (Postgres 17, Auth, Edge Functions), `@supabase/ssr`, `@supabase/supabase-js`.

**Project:** `wrskpolxgtchnqjpygqd` (`https://wrskpolxgtchnqjpygqd.supabase.co`).

**Execution mechanism for SQL:** The connected Supabase MCP is authed to a different account and cannot see this project. Run all SQL via the Supabase Management API with the user's PAT:

```bash
curl -s -X POST "https://api.supabase.com/v1/projects/wrskpolxgtchnqjpygqd/database/query" \
  -H "Authorization: Bearer $SUPABASE_PAT" \
  -H "Content-Type: application/json" \
  -d @- <<'JSON'
{"query":"<SQL HERE>"}
JSON
```
`SUPABASE_PAT=***REDACTED-ROTATE-THIS-TOKEN***` (export in shell; rotate after delivery).
Migrations are also tracked by writing each one to `supabase/migrations/NNNN_name.sql` in the repo for version history.

---

## File Structure

**Supabase (SQL migrations, repo copy under `supabase/migrations/`):**
- `0001_reset.sql` — drop all existing public objects + clean auth.users
- `0002_extensions_enums.sql` — extensions + enum types
- `0003_core_tables.sql` — companies, profiles, member_permissions, invites
- `0004_auth_helpers.sql` — `auth_company_id()`, `auth_role()`, `is_super_admin()`, `has_module_access()`
- `0005_core_rls.sql` — RLS for core tables + onboarding RPC
- `0006_registers.sql` — 7 cadastro tables + RLS
- `0007_transactions.sql` — transactions, payables, receivables + RLS
- `0008_analytics.sql` — analytics views/functions
- `0009_seed.sql` — demo company seed (idempotent, dev only)

**Next.js frontend:**
- `lib/supabase/client.ts` — browser client
- `lib/supabase/server.ts` — server client (async cookies)
- `lib/supabase/middleware.ts` — session refresh helper
- `middleware.ts` (root) — route guard
- `lib/auth.ts` — `getSessionProfile()` helper (server)
- `lib/db/*.ts` — typed query helpers per domain (registers, transactions, analytics)
- `app/(auth)/login/page.tsx` — wire to real auth (exists)
- `app/(auth)/signup/page.tsx` — new
- `app/(app)/onboarding/page.tsx` — new (company name + type)
- Server Actions colocated under each route (`actions.ts`)
- `lib/mock-data.ts` / `lib/filtered-mock.ts` — deleted at the end once all screens migrated

**Edge Functions:**
- `supabase/functions/cfo-ai/index.ts` — Gemini call (port of current route)
- `supabase/functions/invite-user/index.ts` — create invite + (later) email

---

## Conventions used by every CRUD task

Each cadastro/transaction entity follows the SAME shape. Defined once here; per-entity tasks only specify columns.

**Table template (every business table):**
```sql
create table public.<entity> (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  -- entity-specific columns here --
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.<entity> enable row level security;
create index <entity>_company_id_idx on public.<entity>(company_id);
create trigger <entity>_set_updated_at before update on public.<entity>
  for each row execute function public.set_updated_at();
```

**RLS policy template (module = the sidebar module key gating this table):**
```sql
create policy "<entity>_select" on public.<entity> for select
  using ( public.is_super_admin()
          or (company_id = public.auth_company_id() and public.has_module_access('<module>')) );
create policy "<entity>_insert" on public.<entity> for insert
  with check ( company_id = public.auth_company_id() and public.has_module_access('<module>') );
create policy "<entity>_update" on public.<entity> for update
  using ( company_id = public.auth_company_id() and public.has_module_access('<module>') )
  with check ( company_id = public.auth_company_id() and public.has_module_access('<module>') );
create policy "<entity>_delete" on public.<entity> for delete
  using ( company_id = public.auth_company_id() and public.has_module_access('<module>') );
```

**Server Action template (`actions.ts` in the route folder):**
```ts
"use server"
import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function create<Entity>(formData: FormData) {
  const supabase = await createClient()
  const payload = { /* parse fields from formData */ }
  const { error } = await supabase.from("<entity>").insert(payload)
  if (error) return { error: error.message }
  revalidatePath("/<route>")
  return { error: null }
}
// update<Entity>(id, formData) and delete<Entity>(id) follow the same shape.
```
`company_id` is never sent from the client; it is filled by a column default? No — RLS `with check` requires it. Instead, the insert payload sets `company_id` via the `auth_company_id()` default below, so the client never provides it:
```sql
alter table public.<entity> alter column company_id set default public.auth_company_id();
```
This keeps inserts simple and RLS-safe.

**Reading data:** Server Component calls a `lib/db/*.ts` helper that uses the server client. RLS scopes rows automatically.

**Testing a CRUD entity (manual + SQL):**
1. Insert via SQL as a known company → row appears.
2. From the app (logged in as that company's admin) the list shows it.
3. Edit + delete in the UI persist (re-query SQL confirms).
4. RLS proof: a second company cannot see it (SQL `set request.jwt.claims` test, see Task 5.x).

---

## Phase 1 — Foundation

### Task 1.1: Reset the database

**Files:** Create `supabase/migrations/0001_reset.sql`

- [ ] **Step 1: Write the reset SQL**

```sql
-- 0001_reset.sql — wipe prior schema and auth users (DESTRUCTIVE, authorized)
do $$
declare r record;
begin
  for r in (select tablename from pg_tables where schemaname='public') loop
    execute format('drop table if exists public.%I cascade', r.tablename);
  end loop;
  for r in (select routine_name from information_schema.routines where specific_schema='public') loop
    execute format('drop routine if exists public.%I cascade', r.routine_name);
  end loop;
  for r in (select typname from pg_type t join pg_namespace n on n.oid=t.typnamespace
            where n.nspname='public' and t.typtype='e') loop
    execute format('drop type if exists public.%I cascade', r.typname);
  end loop;
end $$;
delete from auth.users;
```

- [ ] **Step 2: Apply via Management API**

Run the curl block from the header with this file's contents as `query`.
Expected: `[]` (success, no rows).

- [ ] **Step 3: Verify clean**

Run: `select count(*) from information_schema.tables where table_schema='public';` and `select count(*) from auth.users;`
Expected: both `0`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/0001_reset.sql
git commit -m "chore(db): reset schema and auth users"
```

### Task 1.2: Extensions + enums

**Files:** Create `supabase/migrations/0002_extensions_enums.sql`

- [ ] **Step 1: Write SQL**

```sql
create extension if not exists pgcrypto;

create type public.company_type as enum
  ('industria','comercio','servicos','construcao','agro','tecnologia','saude_educacao','misto');
create type public.user_role as enum ('super_admin','admin','member');
create type public.txn_type as enum ('entrada','saida');
create type public.payable_status as enum ('a_pagar','em_atraso','pago');
create type public.receivable_status as enum ('a_receber','em_atraso','recebido');
create type public.invite_status as enum ('pending','accepted','revoked');

create or replace function public.set_updated_at() returns trigger
language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
```

- [ ] **Step 2: Apply + verify** — query `select typname from pg_type where typname='company_type';` → 1 row.
- [ ] **Step 3: Commit** — `git commit -m "feat(db): extensions, enums, updated_at trigger fn"`

### Task 1.3: Core tables (companies, profiles, member_permissions, invites)

**Files:** Create `supabase/migrations/0003_core_tables.sql`

- [ ] **Step 1: Write SQL**

```sql
create table public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type public.company_type not null default 'construcao',
  logo_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger companies_set_updated_at before update on public.companies
  for each row execute function public.set_updated_at();

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  company_id uuid references public.companies(id) on delete cascade,
  name text not null default '',
  role public.user_role not null default 'admin',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index profiles_company_id_idx on public.profiles(company_id);
create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

create table public.member_permissions (
  user_id uuid not null references public.profiles(id) on delete cascade,
  module text not null,
  allowed boolean not null default true,
  primary key (user_id, module)
);

create table public.invites (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  email text not null,
  role public.user_role not null default 'member',
  token text not null unique default encode(gen_random_bytes(24),'hex'),
  status public.invite_status not null default 'pending',
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '7 days'
);
create index invites_company_id_idx on public.invites(company_id);
```

- [ ] **Step 2: Apply + verify** — `list_tables`-style query shows the 4 tables.
- [ ] **Step 3: Commit** — `git commit -m "feat(db): core identity/tenant tables"`

### Task 1.4: Auth helper functions

**Files:** Create `supabase/migrations/0004_auth_helpers.sql`

These are `security definer` and `stable`, used by every RLS policy. The module list defaults to "allowed unless explicitly denied" for admins; members are "denied unless allowed".

- [ ] **Step 1: Write SQL**

```sql
create or replace function public.auth_company_id() returns uuid
language sql stable security definer set search_path = public as $$
  select company_id from public.profiles where id = auth.uid()
$$;

create or replace function public.auth_role() returns public.user_role
language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.is_super_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select role = 'super_admin' from public.profiles where id = auth.uid()), false)
$$;

-- Admin/super_admin: full module access. Member: only modules explicitly allowed.
create or replace function public.has_module_access(p_module text) returns boolean
language sql stable security definer set search_path = public as $$
  select case
    when public.auth_role() in ('super_admin','admin') then true
    else coalesce(
      (select allowed from public.member_permissions
       where user_id = auth.uid() and module = p_module), false)
  end
$$;
```

- [ ] **Step 2: Apply + verify** — `select public.has_module_access('dre');` runs (returns false with no session).
- [ ] **Step 3: Commit** — `git commit -m "feat(db): RLS auth helper functions"`

### Task 1.5: Core RLS + onboarding RPC

**Files:** Create `supabase/migrations/0005_core_rls.sql`

- [ ] **Step 1: Write SQL**

```sql
alter table public.companies enable row level security;
alter table public.profiles enable row level security;
alter table public.member_permissions enable row level security;
alter table public.invites enable row level security;

-- companies: members see their own; super_admin sees all; admin updates own
create policy companies_select on public.companies for select
  using ( id = public.auth_company_id() or public.is_super_admin() );
create policy companies_update on public.companies for update
  using ( id = public.auth_company_id() and public.auth_role() in ('admin','super_admin') );

-- profiles: see profiles in same company; super_admin all; self always
create policy profiles_select on public.profiles for select
  using ( company_id = public.auth_company_id() or id = auth.uid() or public.is_super_admin() );
create policy profiles_update on public.profiles for update
  using ( id = auth.uid()
          or (company_id = public.auth_company_id() and public.auth_role() in ('admin','super_admin')) );

-- member_permissions: company admins manage; members read own
create policy mp_select on public.member_permissions for select
  using ( user_id = auth.uid()
          or exists(select 1 from public.profiles p where p.id = member_permissions.user_id
                    and (p.company_id = public.auth_company_id() or public.is_super_admin())) );
create policy mp_write on public.member_permissions for all
  using ( public.auth_role() in ('admin','super_admin')
          and exists(select 1 from public.profiles p where p.id = member_permissions.user_id
                     and (p.company_id = public.auth_company_id() or public.is_super_admin())) )
  with check ( public.auth_role() in ('admin','super_admin') );

-- invites: company admins manage
create policy invites_all on public.invites for all
  using ( company_id = public.auth_company_id() and public.auth_role() in ('admin','super_admin') )
  with check ( company_id = public.auth_company_id() and public.auth_role() in ('admin','super_admin') );

-- Onboarding: signed-in user with no profile creates company + admin profile.
create or replace function public.create_company_and_profile(p_name text, p_type public.company_type, p_user_name text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_company uuid;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  if exists(select 1 from public.profiles where id = auth.uid()) then
    raise exception 'profile already exists';
  end if;
  insert into public.companies(name, type) values (p_name, p_type) returning id into v_company;
  insert into public.profiles(id, company_id, name, role)
    values (auth.uid(), v_company, coalesce(p_user_name,''), 'admin');
  return v_company;
end $$;
revoke all on function public.create_company_and_profile(text, public.company_type, text) from public;
grant execute on function public.create_company_and_profile(text, public.company_type, text) to authenticated;
```

- [ ] **Step 2: Apply + verify** — query `select count(*) from pg_policies where schemaname='public';` → ≥ 8.
- [ ] **Step 3: Commit** — `git commit -m "feat(db): core RLS policies + onboarding RPC"`

### Task 1.6: Install Supabase libs + env

**Files:** Create `.env.local`, modify `package.json`

- [ ] **Step 1: Install**

Run: `npm install @supabase/supabase-js @supabase/ssr`
Expected: added to dependencies.

- [ ] **Step 2: Write `.env.local`** (fetch publishable key value via Management API `/api-keys`)

```
NEXT_PUBLIC_SUPABASE_URL=https://wrskpolxgtchnqjpygqd.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<sb_publishable_... value>
```

- [ ] **Step 3: Confirm `.env.local` is gitignored** — `grep -q ".env" .gitignore` (Next's default ignores `.env*`). Expected: match.
- [ ] **Step 4: Commit** — `git commit -m "chore: add supabase deps"` (note: `.env.local` not committed)

### Task 1.7: Supabase clients + middleware

**Files:** Create `lib/supabase/client.ts`, `lib/supabase/server.ts`, `lib/supabase/middleware.ts`, `middleware.ts`

> Before writing, check Next 16 cookie API in `node_modules/next/dist/docs/` per AGENTS.md (`cookies()` is async).

- [ ] **Step 1: `lib/supabase/client.ts`**

```ts
import { createBrowserClient } from "@supabase/ssr"

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

- [ ] **Step 2: `lib/supabase/server.ts`**

```ts
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(toSet) {
          try { toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) }
          catch { /* called from a Server Component; middleware refreshes */ }
        },
      },
    }
  )
}
```

- [ ] **Step 3: `lib/supabase/middleware.ts`**

```ts
import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request })
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(toSet) {
          toSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          toSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
        },
      },
    }
  )
  const { data: { user } } = await supabase.auth.getUser()
  const path = request.nextUrl.pathname
  const isAuthRoute = path.startsWith("/login") || path.startsWith("/signup")
  if (!user && !isAuthRoute) {
    return NextResponse.redirect(new URL("/login", request.url))
  }
  if (user && isAuthRoute) {
    return NextResponse.redirect(new URL("/dashboard", request.url))
  }
  return response
}
```

- [ ] **Step 4: root `middleware.ts`**

```ts
import { type NextRequest } from "next/server"
import { updateSession } from "@/lib/supabase/middleware"

export async function middleware(request: NextRequest) {
  return await updateSession(request)
}
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
}
```

- [ ] **Step 5: Build** — `npm run build`. Expected: compiles (pages still mock-driven).
- [ ] **Step 6: Commit** — `git commit -m "feat(auth): supabase ssr clients + route-guard middleware"`

### Task 1.8: Auth helper + login/signup/onboarding wiring

**Files:** Create `lib/auth.ts`, `app/(auth)/login/actions.ts`, `app/(auth)/signup/page.tsx`, `app/(auth)/signup/actions.ts`, `app/(app)/onboarding/page.tsx`, `app/(app)/onboarding/actions.ts`; modify `app/(auth)/login/page.tsx`

- [ ] **Step 1: `lib/auth.ts`**

```ts
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

export async function getSessionProfile() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")
  const { data: profile } = await supabase
    .from("profiles").select("*, companies(*)").eq("id", user.id).single()
  if (!profile) redirect("/onboarding")
  return { user, profile }
}
```

- [ ] **Step 2: `app/(auth)/login/actions.ts`**

```ts
"use server"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

export async function login(formData: FormData) {
  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({
    email: String(formData.get("email")),
    password: String(formData.get("password")),
  })
  if (error) return { error: error.message }
  redirect("/dashboard")
}
```

- [ ] **Step 3: `app/(auth)/signup/actions.ts`**

```ts
"use server"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

export async function signup(formData: FormData) {
  const supabase = await createClient()
  const { error } = await supabase.auth.signUp({
    email: String(formData.get("email")),
    password: String(formData.get("password")),
  })
  if (error) return { error: error.message }
  redirect("/onboarding")
}
```

- [ ] **Step 4: `app/(app)/onboarding/actions.ts`**

```ts
"use server"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

export async function completeOnboarding(formData: FormData) {
  const supabase = await createClient()
  const { error } = await supabase.rpc("create_company_and_profile", {
    p_name: String(formData.get("company_name")),
    p_type: String(formData.get("company_type")),
    p_user_name: String(formData.get("user_name")),
  })
  if (error) return { error: error.message }
  redirect("/dashboard")
}
```

- [ ] **Step 5: Build forms** — `login/page.tsx` (wire existing form to `login` action), new `signup/page.tsx` (mirror login styling), `onboarding/page.tsx` (company name input + 8-type selector reusing `COMPANY_PROFILES` + user name). Each is a client form calling its action and showing `error`.

- [ ] **Step 6: Manual test** — `npm run dev`; sign up a test user → onboarding → dashboard loads; sign out; sign in again. Verify in SQL: `select email from auth.users;` and `select name,role from public.profiles;` show the new user as `admin` with a company.

- [ ] **Step 7: Commit** — `git commit -m "feat(auth): login, signup, onboarding flows"`

---

## Phase 2 — Cadastros (7 CRUD entities)

All follow the **Conventions** section. One reference task is fully written (2.1 customers); the rest list only columns + module + route and reuse the templates.

### Task 2.1: customers (REFERENCE — full detail)

**Files:** Create `supabase/migrations/0006a_customers.sql`, `lib/db/customers.ts`, `app/(app)/registers/customers/actions.ts`; modify `app/(app)/registers/customers/page.tsx`

- [ ] **Step 1: Table + RLS SQL** (module `registers`)

```sql
create table public.customers (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null default public.auth_company_id() references public.companies(id) on delete cascade,
  name text not null,
  document text,
  email text,
  phone text,
  status text not null default 'ativo',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.customers enable row level security;
create index customers_company_id_idx on public.customers(company_id);
create trigger customers_set_updated_at before update on public.customers
  for each row execute function public.set_updated_at();
-- policies: paste the RLS template with <entity>=customers, <module>='registers'
```

- [ ] **Step 2: Apply + verify** — insert a row via SQL under a test company; `select count(*)` → 1.

- [ ] **Step 3: `lib/db/customers.ts`**

```ts
import { createClient } from "@/lib/supabase/server"
export async function listCustomers() {
  const supabase = await createClient()
  const { data } = await supabase.from("customers").select("*").order("name")
  return data ?? []
}
```

- [ ] **Step 4: `actions.ts`** — `createCustomer`/`updateCustomer`/`deleteCustomer` using the Server Action template; `revalidatePath("/registers/customers")`.

- [ ] **Step 5: Wire `page.tsx`** — Server Component reads `listCustomers()`; a client table with “Novo”, edit, delete using a Radix Dialog form. Keep current visual style.

- [ ] **Step 6: Manual test** — create/edit/delete in UI; confirm via SQL.

- [ ] **Step 7: Commit** — `git commit -m "feat(registers): customers CRUD"`

### Tasks 2.2–2.7 (same pattern, module `registers`)

For each: write `0006x_<entity>.sql` (table template + RLS template), `lib/db/<entity>.ts`, `actions.ts`, wire `page.tsx`, manual test, commit.

| Task | Entity | Route | Columns (beyond company_id + timestamps) |
|---|---|---|---|
| 2.2 | `suppliers` | `/registers/suppliers` | `name text not null, document text, email text, phone text, status text default 'ativo'` |
| 2.3 | `products` | `/registers/products` | `name text not null, kind text default 'produto', price numeric(14,2) default 0, unit text` |
| 2.4 | `categories` | `/registers/categories` | `name text not null, kind text not null default 'despesa'` (receita/despesa) |
| 2.5 | `cost_centers` | `/registers/cost-centers` | `name text not null, code text` |
| 2.6 | `accounts` | `/registers/accounts` | `name text not null, bank text, kind text default 'corrente', opening_balance numeric(14,2) default 0` |
| 2.7 | `accounts_plan` | `/registers/accounts-plan` | `code text not null, name text not null, parent_id uuid references public.accounts_plan(id), kind text` |

- [ ] One checkbox per entity covering its full pattern (SQL → db helper → actions → page → test → commit).

---

## Phase 3 — Transactions

### Task 3.1: transactions (lançamentos)

**Files:** `supabase/migrations/0007a_transactions.sql`, `lib/db/transactions.ts`, `app/(app)/transactions/actions.ts`, modify `app/(app)/transactions/page.tsx`

- [ ] **Step 1: Table + RLS** (module `transactions`)

```sql
create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null default public.auth_company_id() references public.companies(id) on delete cascade,
  type public.txn_type not null,
  date date not null default current_date,
  amount numeric(14,2) not null,
  description text,
  category_id uuid references public.categories(id) on delete set null,
  account_id uuid references public.accounts(id) on delete set null,
  cost_center_id uuid references public.cost_centers(id) on delete set null,
  customer_id uuid references public.customers(id) on delete set null,
  supplier_id uuid references public.suppliers(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.transactions enable row level security;
create index transactions_company_id_idx on public.transactions(company_id);
create index transactions_date_idx on public.transactions(company_id, date);
create trigger transactions_set_updated_at before update on public.transactions
  for each row execute function public.set_updated_at();
-- RLS template with <entity>=transactions, <module>='transactions'
```

- [ ] **Step 2–6:** db helper (`listTransactions(range)` with `.gte/.lte` on date), actions, wire page (filterable table + form with selects populated from cadastros), manual test, commit.

### Task 3.2: payables (module `payables`)

Columns: `supplier_id uuid references suppliers, description text, category_id uuid references categories, due_date date not null, installment text, amount numeric(14,2) not null, status public.payable_status not null default 'a_pagar', account_id uuid references accounts, paid_at date`.

- [ ] Full pattern: SQL → `lib/db/payables.ts` (`listPayables`) → actions (incl. `markPaid`) → wire `app/(app)/payables/page.tsx` → test → commit.

### Task 3.3: receivables (module `receivables`)

Columns: `customer_id uuid references customers, description text, category_id uuid references categories, due_date date not null, installment text, amount numeric(14,2) not null, status public.receivable_status not null default 'a_receber', account_id uuid references accounts, received_at date`. `days_overdue` computed in queries as `greatest(0, current_date - due_date)` when not settled.

- [ ] Full pattern: SQL → `lib/db/receivables.ts` → actions (incl. `markReceived`) → wire `app/(app)/receivables/page.tsx` and `app/(app)/delinquent/page.tsx` (filter status `em_atraso`) → test → commit.

---

## Phase 4 — Analytics (views/functions)

All functions are `security definer`? No — they must respect RLS, so they are **plain SQL** functions marked `stable` and run as invoker, OR views with `security_invoker=on`. Use `security_invoker` views and invoker functions so the caller's RLS applies.

### Task 4.1: KPIs function

**Files:** `supabase/migrations/0008a_kpis.sql`, `lib/db/analytics.ts`, modify `app/(app)/dashboard/page.tsx`

- [ ] **Step 1: SQL**

```sql
create or replace function public.fn_kpis(p_start date, p_end date)
returns json language sql stable
set search_path = public as $$
  with t as (
    select * from public.transactions where date between p_start and p_end
  )
  select json_build_object(
    'faturamento', coalesce((select sum(amount) from t where type='entrada'),0),
    'despesaTotal', coalesce((select sum(amount) from t where type='saida'),0),
    'lucroLiquido', coalesce((select sum(case when type='entrada' then amount else -amount end) from t),0),
    'aReceber', coalesce((select sum(amount) from public.receivables where status<>'recebido'),0),
    'aReceberVencido', coalesce((select sum(amount) from public.receivables where status='em_atraso'),0),
    'aPagar', coalesce((select sum(amount) from public.payables where status<>'pago'),0),
    'aPagarVencido', coalesce((select sum(amount) from public.payables where status='em_atraso'),0),
    'saldoAtual', coalesce((select sum(opening_balance) from public.accounts),0)
      + coalesce((select sum(case when type='entrada' then amount else -amount end) from public.transactions),0)
  )
$$;
```
(Derived ratios — margem, inadimplência %, ponto de equilíbrio, ticket médio, EBITDA, capital de giro — computed in `lib/db/analytics.ts` from these primitives so the function stays simple.)

- [ ] **Step 2:** `lib/db/analytics.ts` → `getKpis(range)` calls `supabase.rpc("fn_kpis", { p_start, p_end })`, then derives ratios.
- [ ] **Step 3:** Wire `dashboard/page.tsx` to real KPIs (replace `kpiData`).
- [ ] **Step 4:** Manual test against seed; numbers match expected. Commit.

### Task 4.2: revenue/expense series + cashflow

**Files:** `0008b_series.sql`, extend `lib/db/analytics.ts`, modify `cashflow/page.tsx`, `dashboard` chart.

- [ ] `fn_revenue_expense(p_start,p_end)` returns rows `{label, receita, despesa}` grouped by month (`to_char(date,'Mon')`). `fn_cashflow(p_start,p_end)` returns ordered transactions with running `saldo` via window `sum() over (order by date)`. Wire charts. Test. Commit.

### Task 4.3: DRE function

**Files:** `0008c_dre.sql`, extend analytics, modify `dre/page.tsx`.

- [ ] `fn_dre(p_start,p_end)` returns the hierarchical JSON the DRE page expects (receita bruta → deduções → líquida → custos variáveis → margem contribuição → despesas fixas → resultado operacional → financeiras → retiradas → lucro), aggregating `transactions` by `categories.kind`/category. Wire page. Test. Commit.

### Task 4.4: BI, health, top clients/expenses, delinquents

**Files:** `0008d_bi.sql`, extend analytics, modify `bi/page.tsx`, `health/page.tsx`.

- [ ] `v_top_clients` / `v_top_expenses` (`security_invoker=on`) aggregate receivables/payables by customer/category with percent. `fn_health_dimensions()` computes the 10 health scores from KPIs (margem, inadimplência, concentração, etc.) returning `{nome,nota,status,descricao}`. Wire BI + health pages. Test. Commit.

### Task 4.5: Remaining analytical screens

The secondary analytical pages (`projecoes`, `cenarios`, `simulador`, `radar`, `timeline`, `tendencias`, `comparativos`, `indicadores`, `margens`, `metas`, `orcamentos`, `explorar`, `insights`, `reports`, `reconciliation`, `alerts`) each read from the primitives already built (`fn_kpis`, `fn_revenue_expense`, `fn_dre`, transactions/payables/receivables).

- [ ] For each page: replace its mock import with the appropriate analytics helper(s); where a page needs a new aggregation, add a small invoker function in `0008e_misc.sql`. One checkbox per page: wire → test render with seed → commit. (`alerts` derives from threshold checks over KPIs; `reconciliation` lists transactions vs. account; `reports` composes existing functions.)

---

## Phase 5 — Users & permissions

### Task 5.1: Users screen

**Files:** `lib/db/users.ts`, `app/(app)/users/actions.ts`, modify `app/(app)/users/page.tsx`

- [ ] List company profiles + their `member_permissions`. Admin can: change a member's role, toggle module permissions (writes `member_permissions`), revoke a member (delete profile). Module list = sidebar module keys. Test as admin. Commit.

### Task 5.2: Invite Edge Function

**Files:** `supabase/functions/invite-user/index.ts`

- [ ] Edge Function (verifies caller is admin via JWT) inserts an `invites` row and returns the invite link `/$signup?invite=<token>`. (Email sending deferred — SendGrid is open in the user's browser; wire later if a key is provided.) Signup action, when `invite` token present, calls a `accept_invite(token)` RPC that attaches the new user to the inviting company as `member` instead of onboarding. Add `0005b_accept_invite.sql` with that `security definer` RPC. Test: admin generates link → second user signs up via link → lands in same company as member. Commit.

### Task 5.3: RLS permission enforcement test

- [ ] **Step 1:** Create company A (admin) and company B (admin) + a member M in A with only `dashboard` allowed.
- [ ] **Step 2:** Simulate M's JWT in SQL and assert: `select * from public.payables` returns 0 rows (no `payables` permission); `select * from public.customers` (module `registers`) returns 0 rows. Assert A's admin sees A only, not B. Document the SQL test in `supabase/tests/rls.sql`.
- [ ] **Step 3:** Commit.

---

## Phase 6 — CFO AI Edge Function

### Task 6.1: Port CFO AI to Edge Function

**Files:** `supabase/functions/cfo-ai/index.ts`; modify `app/(app)/diagnostic/page.tsx` to call the function; delete `app/api/cfo-ai/route.ts`

- [ ] Move the Gemini logic + system prompt + fallback into the Edge Function. Read `GEMINI_API_KEY` from Edge secret (set later by user). Page calls `supabase.functions.invoke("cfo-ai", { body: { question, context } })`, passing real KPIs from `fn_kpis`. Keep the fallback so it works without the key. Test the fallback path now. Commit.

---

## Phase 7 — Seed, cleanup, final verification

### Task 7.1: Demo seed

**Files:** `supabase/migrations/0009_seed.sql`

- [ ] Idempotent seed: create a demo company + admin profile bound to a real auth user (the user's signup), then insert customers, suppliers, categories, accounts, cost_centers, products, plus ~12 months of transactions and the payables/receivables matching the original mock figures, so all analytics render populated. Run once. Verify dashboard/DRE/BI numbers are plausible. Commit.

### Task 7.2: Remove mock modules

**Files:** delete `lib/mock-data.ts`, `lib/filtered-mock.ts`

- [ ] **Step 1:** `grep -rn "mock-data\|filtered-mock" app lib components` → expect no remaining imports.
- [ ] **Step 2:** Delete both files. `npm run build` passes.
- [ ] **Step 3:** Commit `git commit -m "chore: remove mock data layer"`.

### Task 7.3: Full smoke + lint

- [ ] `npm run lint` clean. `npm run build` passes. `npm run dev`: walk every sidebar item logged in as the seeded admin — each screen renders real data, no console errors. Fix any regressions. Commit.

---

## Self-review notes

- **Spec coverage:** auth/roles (1.x, 5.x), multi-tenant RLS (1.4–1.5, 2–3, 5.3), 7 cadastros (2.x), 3 transactions (3.x), all analytics on real data (4.x), users+permissions+invites (5.x), CFO AI edge (6.x), seed + de-mock (7.x). Covered.
- **Member permission enforcement** is in RLS via `has_module_access` (1.4) and proven in 5.3.
- **Onboarding** uses Server Action + `create_company_and_profile` RPC (decided over trigger).
- **CFO AI** kept on Gemini, ported to Edge Function, key plugged later; fallback keeps it functional now.
- **Next 16 caveat:** check `node_modules/next/dist/docs/` before framework code (async `cookies()`); flagged in 1.7.
