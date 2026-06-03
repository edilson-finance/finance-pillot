-- 0003_core_tables.sql
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
  token text not null unique default encode(gen_random_bytes(24), 'hex'),
  status public.invite_status not null default 'pending',
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '7 days'
);
create index invites_company_id_idx on public.invites(company_id);
