-- 0015_admin_revoke_anon.sql — Hardening: tira o EXECUTE do papel anon nas
-- funções da Central Super Admin. Os default privileges do Supabase concedem
-- execute a anon/authenticated em toda função nova do schema public; aqui
-- garantimos que apenas usuários autenticados (e barrados internamente por
-- is_super_admin()) consigam sequer invocá-las — defesa em profundidade.
-- Idempotente: revoke não falha se o privilégio já não existir.

revoke execute on function public.fn_admin_companies_overview() from anon;
revoke execute on function public.fn_admin_company_detail(uuid) from anon;
revoke execute on function public.fn_admin_create_company(text, text) from anon;
revoke execute on function public.fn_admin_set_user_company(uuid, uuid, public.user_role) from anon;
revoke execute on function public.fn_admin_list_users() from anon;
