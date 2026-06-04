-- 0020_company_settings.sql — Persistência do perfil da empresa (Configurações).
-- Adiciona os campos de "Dados da Empresa" na tabela companies e cria o bucket
-- público de logos com RLS por empresa. Idempotente.

-- 1) Campos cadastrais da empresa (todos opcionais)
alter table public.companies add column if not exists razao_social       text;
alter table public.companies add column if not exists cnpj               text;
alter table public.companies add column if not exists inscricao_estadual text;
alter table public.companies add column if not exists segmento           text;
alter table public.companies add column if not exists regime_tributario  text;
alter table public.companies add column if not exists regime_financeiro  text not null default 'Caixa';
alter table public.companies add column if not exists telefone           text;
alter table public.companies add column if not exists whatsapp           text;
alter table public.companies add column if not exists email              text;
alter table public.companies add column if not exists site               text;
alter table public.companies add column if not exists cep                text;
alter table public.companies add column if not exists endereco           text;
alter table public.companies add column if not exists cidade             text;
alter table public.companies add column if not exists estado             text;

-- 2) Bucket público de logos (read público; escrita por empresa via RLS abaixo)
insert into storage.buckets (id, name, public)
values ('company-logos', 'company-logos', true)
on conflict (id) do update set public = true;

-- 3) RLS no storage: admin só escreve na pasta da própria empresa ({company_id}/...)
drop policy if exists company_logos_insert on storage.objects;
create policy company_logos_insert on storage.objects for insert to authenticated
  with check (
    bucket_id = 'company-logos'
    and (storage.foldername(name))[1] = auth_company_id()::text
    and auth_role() = any (array['admin'::user_role, 'super_admin'::user_role])
  );

drop policy if exists company_logos_update on storage.objects;
create policy company_logos_update on storage.objects for update to authenticated
  using (
    bucket_id = 'company-logos'
    and (storage.foldername(name))[1] = auth_company_id()::text
    and auth_role() = any (array['admin'::user_role, 'super_admin'::user_role])
  );

drop policy if exists company_logos_delete on storage.objects;
create policy company_logos_delete on storage.objects for delete to authenticated
  using (
    bucket_id = 'company-logos'
    and (storage.foldername(name))[1] = auth_company_id()::text
    and auth_role() = any (array['admin'::user_role, 'super_admin'::user_role])
  );
