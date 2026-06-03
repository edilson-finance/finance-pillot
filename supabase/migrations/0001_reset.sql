-- 0001_reset.sql — wipe prior schema and auth users (DESTRUCTIVE, authorized)
do $$
declare r record;
begin
  for r in (select tablename from pg_tables where schemaname = 'public') loop
    execute format('drop table if exists public.%I cascade', r.tablename);
  end loop;
  for r in (select routine_name from information_schema.routines where specific_schema = 'public') loop
    execute format('drop routine if exists public.%I cascade', r.routine_name);
  end loop;
  for r in (
    select t.typname from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' and t.typtype = 'e'
  ) loop
    execute format('drop type if exists public.%I cascade', r.typname);
  end loop;
end $$;

delete from auth.users;
