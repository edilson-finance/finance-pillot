-- =====================================================================
-- Baixa de caixa órfã ao excluir conta a pagar/receber.
--
-- Sintoma: o usuário cria uma despesa "paga" (ou receita "recebida"),
-- exclui a conta depois, mas o lançamento continua aparecendo no Fluxo de
-- Caixa e inflando o Dashboard.
--
-- Causa: createDespesa/createReceita inserem a conta em payables/receivables
-- E um lançamento espelho em transactions (a "baixa" de caixa, com
-- payable_id/receivable_id apontando para o pai). As FKs
-- transactions_payable_id_fkey e transactions_receivable_id_fkey estavam
-- como ON DELETE SET NULL: ao excluir o pai, o Postgres apenas zerava o
-- vínculo e DEIXAVA o lançamento em transactions — virando um órfão que
-- segue contando no caixa.
--
-- Correção: a baixa é um registro DEPENDENTE da conta que a gerou; quando a
-- conta é excluída, a baixa deve ir junto. Trocamos as duas FKs para
-- ON DELETE CASCADE. Cobre todos os caminhos de exclusão (deletePayable,
-- deleteReceivable, exclusões em cascata de empresa), sem precisar duplicar
-- a lógica no código da aplicação.
-- =====================================================================

alter table public.transactions
  drop constraint if exists transactions_payable_id_fkey,
  add  constraint transactions_payable_id_fkey
       foreign key (payable_id) references public.payables(id) on delete cascade;

alter table public.transactions
  drop constraint if exists transactions_receivable_id_fkey,
  add  constraint transactions_receivable_id_fkey
       foreign key (receivable_id) references public.receivables(id) on delete cascade;
