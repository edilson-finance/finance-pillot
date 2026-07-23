-- 0034_revoke_anon_execute_security_definer.sql
--
-- [ALTO] Fecha A-1 e A-2. ~14 funções SECURITY DEFINER estavam executáveis por
-- `anon` porque as migrations usaram `REVOKE ... FROM public` em vez de
-- `REVOKE ... FROM anon` (o Supabase concede EXECUTE explicitamente a `anon`, não
-- via PUBLIC — só a 0015 acertou). Efeito explorável (A-1): um atacante anônimo,
-- de posse da anon key (pública no bundle), chamava `set_user_active` /
-- `set_user_name` sobre qualquer usuário — a guarda `auth_role() not in (...)`
-- falha-aberto para chamador sem perfil (NULL). As demais falhavam-fechado, mas a
-- superfície é grande demais (A-2): qualquer relaxamento futuro viraria brecha.
--
-- Correção: revogar EXECUTE de `anon` E de `public` em TODAS as funções SECURITY
-- DEFINER do schema public, EXCETO os 4 helpers que a RLS precisa avaliar em
-- qualquer papel (`auth_company_id`, `auth_role`, `is_super_admin`,
-- `has_module_access`). Revogar de `public` também é necessário porque algumas
-- funções (ex.: `fn_seed_default_categories`) têm o EXECUTE concedido a PUBLIC, do
-- qual `anon` herda. `authenticated` mantém o EXECUTE (grant explícito próprio);
-- `service_role` não é afetado. Idempotente.

do $$
declare r record;
begin
  for r in
    select p.oid::regprocedure as sig
    from pg_proc p
    where p.pronamespace = 'public'::regnamespace
      and p.prosecdef
      and p.proname not in ('auth_company_id','auth_role','is_super_admin','has_module_access')
  loop
    execute format('revoke execute on function %s from anon, public', r.sig);
  end loop;
end $$;
