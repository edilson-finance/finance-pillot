-- rls.sql — RLS enforcement test for multi-tenant isolation + member module gating.
-- Run with: /tmp/fp_runsql.sh supabase/tests/rls.sql
-- Creates throwaway fixtures (fixed UUIDs), impersonates users via role + JWT
-- claims, asserts visibility, then cleans up. RAISES on any failure.

do $$
declare
  c_a uuid := '00000000-0000-0000-0000-0000000000aa';
  c_b uuid := '00000000-0000-0000-0000-0000000000bb';
  admin_a uuid := '00000000-0000-0000-0000-0000000a0001';
  member_a uuid := '00000000-0000-0000-0000-0000000a0002';
  admin_b uuid := '00000000-0000-0000-0000-0000000b0001';
  n int;
  ok boolean;
begin
  -- reset role for setup
  perform set_config('role', 'postgres', true);

  -- cleanup any prior run
  delete from public.member_permissions where user_id in (admin_a, member_a, admin_b);
  delete from public.transactions where company_id in (c_a, c_b);
  delete from public.profiles where id in (admin_a, member_a, admin_b);
  delete from auth.users where id in (admin_a, member_a, admin_b);
  delete from public.companies where id in (c_a, c_b);

  -- fixtures
  insert into auth.users (id, email) values
    (admin_a, 'admin_a@test.local'),
    (member_a, 'member_a@test.local'),
    (admin_b, 'admin_b@test.local');
  insert into public.companies (id, name, type) values
    (c_a, 'Empresa A (test)', 'servicos'),
    (c_b, 'Empresa B (test)', 'servicos');
  insert into public.profiles (id, company_id, name, role) values
    (admin_a, c_a, 'Admin A', 'admin'),
    (member_a, c_a, 'Member A', 'member'),
    (admin_b, c_b, 'Admin B', 'admin');
  -- member_a may access only the BI module
  insert into public.member_permissions (user_id, module, allowed) values
    (member_a, 'bi', true);
  insert into public.transactions (company_id, type, amount, description) values
    (c_a, 'entrada', 100, 'A income'),
    (c_b, 'entrada', 200, 'B income');

  ---------------------------------------------------------------------------
  -- 1. Tenant isolation: admin A sees only company A profiles
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', admin_a)::text, true);
  select count(*) into n from public.profiles where company_id = c_b;
  if n <> 0 then raise exception 'FAIL: admin A can see company B profiles (%).', n; end if;
  select count(*) into n from public.profiles where company_id = c_a;
  if n < 2 then raise exception 'FAIL: admin A cannot see own company profiles (%).', n; end if;

  -- 2. Tenant isolation on transactions (admin has transactions access)
  select count(*) into n from public.transactions;
  if n <> 1 then raise exception 'FAIL: admin A should see exactly 1 (own) transaction, saw %.', n; end if;

  -- 3. Module gating helper for member A
  perform set_config('request.jwt.claims', json_build_object('sub', member_a)::text, true);
  select public.has_module_access('bi') into ok;
  if not ok then raise exception 'FAIL: member A should have BI access.'; end if;
  select public.has_module_access('transactions') into ok;
  if ok then raise exception 'FAIL: member A should NOT have transactions access.'; end if;

  -- 4. Module gating at the data layer: member A without transactions perm sees none
  select count(*) into n from public.transactions;
  if n <> 0 then raise exception 'FAIL: member A without transactions module saw % rows.', n; end if;

  -- 5. Cross-tenant: admin B cannot see company A data
  perform set_config('request.jwt.claims', json_build_object('sub', admin_b)::text, true);
  select count(*) into n from public.transactions;
  if n <> 1 then raise exception 'FAIL: admin B should see only B transaction, saw %.', n; end if;
  select count(*) into n from public.profiles where company_id = c_a;
  if n <> 0 then raise exception 'FAIL: admin B can see company A profiles (%).', n; end if;

  ---------------------------------------------------------------------------
  -- cleanup
  perform set_config('role', 'postgres', true);
  delete from public.member_permissions where user_id in (admin_a, member_a, admin_b);
  delete from public.transactions where company_id in (c_a, c_b);
  delete from public.profiles where id in (admin_a, member_a, admin_b);
  delete from auth.users where id in (admin_a, member_a, admin_b);
  delete from public.companies where id in (c_a, c_b);

  raise notice 'RLS TESTS PASSED';
exception when others then
  perform set_config('role', 'postgres', true);
  delete from public.member_permissions where user_id in (admin_a, member_a, admin_b);
  delete from public.transactions where company_id in (c_a, c_b);
  delete from public.profiles where id in (admin_a, member_a, admin_b);
  delete from auth.users where id in (admin_a, member_a, admin_b);
  delete from public.companies where id in (c_a, c_b);
  raise;
end $$;

select 'RLS TESTS PASSED' as result;
