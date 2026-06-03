-- 0005_core_rls.sql — RLS for core tables + onboarding RPC
alter table public.companies enable row level security;
alter table public.profiles enable row level security;
alter table public.member_permissions enable row level security;
alter table public.invites enable row level security;

-- companies
create policy companies_select on public.companies for select
  using ( id = public.auth_company_id() or public.is_super_admin() );
create policy companies_update on public.companies for update
  using ( id = public.auth_company_id() and public.auth_role() in ('admin','super_admin') );

-- profiles
create policy profiles_select on public.profiles for select
  using ( company_id = public.auth_company_id() or id = auth.uid() or public.is_super_admin() );
create policy profiles_update on public.profiles for update
  using ( id = auth.uid()
          or (company_id = public.auth_company_id() and public.auth_role() in ('admin','super_admin')) );

-- member_permissions
create policy mp_select on public.member_permissions for select
  using ( user_id = auth.uid()
          or exists (select 1 from public.profiles p where p.id = member_permissions.user_id
                     and (p.company_id = public.auth_company_id() or public.is_super_admin())) );
create policy mp_write on public.member_permissions for all
  using ( public.auth_role() in ('admin','super_admin')
          and exists (select 1 from public.profiles p where p.id = member_permissions.user_id
                      and (p.company_id = public.auth_company_id() or public.is_super_admin())) )
  with check ( public.auth_role() in ('admin','super_admin') );

-- invites
create policy invites_all on public.invites for all
  using ( company_id = public.auth_company_id() and public.auth_role() in ('admin','super_admin') )
  with check ( company_id = public.auth_company_id() and public.auth_role() in ('admin','super_admin') );

-- Onboarding: signed-in user with no profile creates company + admin profile.
create or replace function public.create_company_and_profile(
  p_name text, p_type public.company_type, p_user_name text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_company uuid;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  if exists (select 1 from public.profiles where id = auth.uid()) then
    raise exception 'profile already exists';
  end if;
  insert into public.companies(name, type) values (p_name, p_type) returning id into v_company;
  insert into public.profiles(id, company_id, name, role)
    values (auth.uid(), v_company, coalesce(p_user_name, ''), 'admin');
  return v_company;
end $$;
revoke all on function public.create_company_and_profile(text, public.company_type, text) from public;
grant execute on function public.create_company_and_profile(text, public.company_type, text) to authenticated;
