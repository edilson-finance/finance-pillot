-- 0002_extensions_enums.sql
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
begin
  new.updated_at = now();
  return new;
end $$;
