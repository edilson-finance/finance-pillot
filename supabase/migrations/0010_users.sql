-- 0010_users.sql — invite acceptance, company user listing, role & permission management

-- Carry the intended member module permissions on the invite itself.
alter table public.invites add column if not exists modules text[] not null default '{}';

-- List the users of the caller's company together with their auth email.
create or replace function public.fn_company_users()
returns table(id uuid, name text, role public.user_role, email text, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select p.id, p.name, p.role, u.email::text, p.created_at
  from public.profiles p
  join auth.users u on u.id = p.id
  where public.is_super_admin() or p.company_id = public.auth_company_id()
  order by p.created_at
$$;
revoke all on function public.fn_company_users() from public;
grant execute on function public.fn_company_users() to authenticated;

-- Accept an invite: attach the signed-in (profile-less) user to the inviting company.
create or replace function public.accept_invite(p_token text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_invite public.invites;
  v_uid uuid := auth.uid();
  v_email text;
  v_name text;
  v_module text;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  if exists (select 1 from public.profiles where id = v_uid) then
    raise exception 'profile already exists';
  end if;

  select * into v_invite from public.invites
    where token = p_token and status = 'pending' and expires_at > now();
  if v_invite.id is null then raise exception 'invite invalid or expired'; end if;

  select email, coalesce(raw_user_meta_data->>'name','')
    into v_email, v_name from auth.users where id = v_uid;
  if lower(v_email) <> lower(v_invite.email) then
    raise exception 'invite email mismatch';
  end if;

  insert into public.profiles(id, company_id, name, role)
    values (v_uid, v_invite.company_id, v_name, v_invite.role);

  if v_invite.role = 'member' then
    foreach v_module in array v_invite.modules loop
      insert into public.member_permissions(user_id, module, allowed)
        values (v_uid, v_module, true)
        on conflict (user_id, module) do update set allowed = true;
    end loop;
  end if;

  update public.invites set status = 'accepted' where id = v_invite.id;
  return v_invite.company_id;
end $$;
revoke all on function public.accept_invite(text) from public;
grant execute on function public.accept_invite(text) to authenticated;

-- Admin sets a user's role. Regular admins may only assign admin/member within
-- their own company; only a super_admin may grant super_admin or cross company.
create or replace function public.set_user_role(p_user_id uuid, p_role public.user_role)
returns void language plpgsql security definer set search_path = public as $$
declare v_caller public.user_role := public.auth_role();
declare v_target_company uuid;
begin
  if v_caller not in ('admin','super_admin') then raise exception 'forbidden'; end if;
  select company_id into v_target_company from public.profiles where id = p_user_id;
  if v_target_company is null then raise exception 'user not found'; end if;
  if not public.is_super_admin() then
    if v_target_company <> public.auth_company_id() then raise exception 'forbidden'; end if;
    if p_role = 'super_admin' then raise exception 'cannot grant super_admin'; end if;
  end if;
  if p_user_id = auth.uid() and p_role <> v_caller then
    raise exception 'cannot change your own role';
  end if;
  update public.profiles set role = p_role where id = p_user_id;
  if p_role <> 'member' then
    delete from public.member_permissions where user_id = p_user_id;
  end if;
end $$;
revoke all on function public.set_user_role(uuid, public.user_role) from public;
grant execute on function public.set_user_role(uuid, public.user_role) to authenticated;

-- Replace the full set of module permissions for a member in the caller's company.
create or replace function public.set_member_permissions(p_user_id uuid, p_modules text[])
returns void language plpgsql security definer set search_path = public as $$
declare v_target_company uuid; declare v_module text;
begin
  if public.auth_role() not in ('admin','super_admin') then raise exception 'forbidden'; end if;
  select company_id into v_target_company from public.profiles where id = p_user_id;
  if v_target_company is null then raise exception 'user not found'; end if;
  if not public.is_super_admin() and v_target_company <> public.auth_company_id() then
    raise exception 'forbidden';
  end if;
  delete from public.member_permissions where user_id = p_user_id;
  foreach v_module in array p_modules loop
    insert into public.member_permissions(user_id, module, allowed)
      values (p_user_id, v_module, true)
      on conflict (user_id, module) do update set allowed = true;
  end loop;
end $$;
revoke all on function public.set_member_permissions(uuid, text[]) from public;
grant execute on function public.set_member_permissions(uuid, text[]) to authenticated;

-- Detach a user from the company (deletes profile + permissions). Cannot remove
-- self or the last remaining admin/super_admin of the company.
create or replace function public.remove_company_user(p_user_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_target_company uuid; declare v_target_role public.user_role; declare v_admin_count int;
begin
  if public.auth_role() not in ('admin','super_admin') then raise exception 'forbidden'; end if;
  if p_user_id = auth.uid() then raise exception 'cannot remove yourself'; end if;
  select company_id, role into v_target_company, v_target_role
    from public.profiles where id = p_user_id;
  if v_target_company is null then raise exception 'user not found'; end if;
  if not public.is_super_admin() and v_target_company <> public.auth_company_id() then
    raise exception 'forbidden';
  end if;
  if v_target_role in ('admin','super_admin') then
    select count(*) into v_admin_count from public.profiles
      where company_id = v_target_company and role in ('admin','super_admin');
    if v_admin_count <= 1 then raise exception 'cannot remove the last admin'; end if;
  end if;
  delete from public.profiles where id = p_user_id;
end $$;
revoke all on function public.remove_company_user(uuid) from public;
grant execute on function public.remove_company_user(uuid) to authenticated;
