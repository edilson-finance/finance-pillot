-- 0029_account_prior_balance.sql — saldo realizado por conta ANTES de um período.
-- O Extrato de Movimentação precisa do "Saldo anterior" de cada conta: o saldo
-- realizado acumulado até (exclusive) a data de início do período. Realizado =
-- apenas transações de caixa (entrada/saída); transferências e itens em aberto
-- não entram (espelhando o Balancete). Função SECURITY INVOKER: a RLS de
-- transactions já escopa as linhas à empresa ativa do chamador.

create or replace function public.fn_account_prior_balance(p_before date)
returns table(account_id uuid, net numeric)
language sql stable security invoker set search_path = public as $$
  select t.account_id,
         sum(case
               when t.type = 'entrada' then t.amount
               when t.type = 'saida'   then -t.amount
               else 0
             end) as net
  from public.transactions t
  where t.date < p_before
    and t.type in ('entrada', 'saida')
  group by t.account_id
$$;

grant execute on function public.fn_account_prior_balance(date) to authenticated;
