-- 0009_seed_demo.sql — realistic ~12 month demo dataset for the test company.
-- Idempotent-ish: safe to re-run (clears generated rows by a marker tag in description).
-- Runs as postgres (RLS bypassed) so company_id is set explicitly.

do $$
declare
  v_company uuid := '4c854109-6ac5-469c-890a-03cc64aa53ac';
  v_acc_main uuid;
  v_acc_caixa uuid;
  v_cat_vendas uuid;
  v_cat_servicos uuid;
  v_cat_materiais uuid;
  v_cat_maodeobra uuid;
  v_cat_aluguel uuid;
  v_cat_impostos uuid;
  v_cat_marketing uuid;
  v_cust1 uuid; v_cust2 uuid; v_cust3 uuid; v_cust4 uuid;
  v_sup1 uuid; v_sup2 uuid; v_sup3 uuid;
  m int;
  mdate date;
  base_rev numeric;
  base_exp numeric;
begin
  -- Clean previously generated demo rows (tagged) so re-running stays clean.
  delete from public.transactions where company_id = v_company and description like '[seed]%';
  delete from public.payables    where company_id = v_company and description like '[seed]%';
  delete from public.receivables where company_id = v_company and description like '[seed]%';

  -- Extra categories
  v_cat_vendas := (select id from public.categories where company_id=v_company and name='Vendas' limit 1);
  v_cat_materiais := (select id from public.categories where company_id=v_company and name='Materiais' limit 1);

  insert into public.categories (company_id,name,kind) values (v_company,'Serviços','receita') returning id into v_cat_servicos;
  insert into public.categories (company_id,name,kind) values (v_company,'Mão de obra','despesa') returning id into v_cat_maodeobra;
  insert into public.categories (company_id,name,kind) values (v_company,'Aluguel','despesa') returning id into v_cat_aluguel;
  insert into public.categories (company_id,name,kind) values (v_company,'Impostos','despesa') returning id into v_cat_impostos;
  insert into public.categories (company_id,name,kind) values (v_company,'Marketing','despesa') returning id into v_cat_marketing;

  -- Extra account (caixa)
  v_acc_main := (select id from public.accounts where company_id=v_company and name='Bradesco Principal' limit 1);
  insert into public.accounts (company_id,name,bank,kind,opening_balance)
    values (v_company,'Caixa Interno','—','caixa',2500) returning id into v_acc_caixa;

  -- Extra customers
  v_cust1 := (select id from public.customers where company_id=v_company and name='Cliente Demo SA' limit 1);
  insert into public.customers (company_id,name,document,email,phone,status) values
    (v_company,'Incorporadora Vale Verde','12.345.678/0001-90','contato@valeverde.com','(11) 3344-5566','ativo') returning id into v_cust2;
  insert into public.customers (company_id,name,document,email,phone,status) values
    (v_company,'Condomínio Solar','98.765.432/0001-10','financeiro@solar.com','(11) 2233-4455','ativo') returning id into v_cust3;
  insert into public.customers (company_id,name,document,email,phone,status) values
    (v_company,'Prefeitura Municipal','11.222.333/0001-44','obras@prefeitura.gov','(11) 4000-1000','ativo') returning id into v_cust4;

  -- Extra suppliers
  v_sup1 := (select id from public.suppliers where company_id=v_company and name='Fornecedor Demo SA' limit 1);
  insert into public.suppliers (company_id,name,document,email,phone,status) values
    (v_company,'Cimentos União','22.333.444/0001-55','vendas@cimentosuniao.com','(11) 5000-2000','ativo') returning id into v_sup2;
  insert into public.suppliers (company_id,name,document,email,phone,status) values
    (v_company,'Aços do Brasil','33.444.555/0001-66','comercial@acosbrasil.com','(11) 6000-3000','ativo') returning id into v_sup3;

  -- 12 months of transactions: from 11 months ago through current month
  for m in 0..11 loop
    mdate := (date_trunc('month', current_date) - (make_interval(months => 11 - m)))::date;
    -- gentle growth + seasonal wobble
    base_rev := 14000 + m*900 + (case when m % 3 = 0 then 4000 else 0 end);
    base_exp := 9000 + m*500 + (case when m % 4 = 0 then 2500 else 0 end);

    -- Revenue (entrada)
    insert into public.transactions (company_id,type,date,amount,description,category_id,account_id,customer_id) values
      (v_company,'entrada', mdate + 5,  round(base_rev*0.6,2), '[seed] Medição obra mensal', v_cat_servicos, v_acc_main, v_cust2),
      (v_company,'entrada', mdate + 18, round(base_rev*0.4,2), '[seed] Venda de unidades',    v_cat_vendas,   v_acc_main, v_cust3);

    -- Expenses (saida)
    insert into public.transactions (company_id,type,date,amount,description,category_id,account_id,supplier_id) values
      (v_company,'saida', mdate + 3,  round(base_exp*0.45,2), '[seed] Compra de materiais', v_cat_materiais,  v_acc_main,  v_sup2),
      (v_company,'saida', mdate + 10, round(base_exp*0.30,2), '[seed] Folha mão de obra',    v_cat_maodeobra,  v_acc_main,  v_sup1),
      (v_company,'saida', mdate + 12, 3200,                    '[seed] Aluguel galpão',       v_cat_aluguel,    v_acc_main,  null),
      (v_company,'saida', mdate + 20, round(base_exp*0.12,2), '[seed] Impostos',             v_cat_impostos,   v_acc_caixa, null);

    -- One marketing spend every other month
    if m % 2 = 0 then
      insert into public.transactions (company_id,type,date,amount,description,category_id,account_id,supplier_id) values
        (v_company,'saida', mdate + 22, 1800, '[seed] Campanha marketing', v_cat_marketing, v_acc_caixa, v_sup3);
    end if;
  end loop;

  -- Receivables: mix of received / open / overdue
  insert into public.receivables (company_id,customer_id,description,category_id,due_date,installment,amount,status,account_id,received_at) values
    (v_company,v_cust2,'[seed] Parcela contrato obra 1/3', v_cat_servicos, current_date - 40, '1/3', 18000,'recebido', v_acc_main, current_date - 38),
    (v_company,v_cust2,'[seed] Parcela contrato obra 2/3', v_cat_servicos, current_date - 5,  '2/3', 18000,'a_receber', null, null),
    (v_company,v_cust3,'[seed] Reforma condomínio',        v_cat_vendas,   current_date + 12, '1/1', 9500, 'a_receber', null, null),
    (v_company,v_cust4,'[seed] Empenho prefeitura',        v_cat_servicos, current_date - 18, '1/2', 24000,'em_atraso', null, null),
    (v_company,v_cust1,'[seed] Serviço avulso',            v_cat_servicos, current_date - 9,  '1/1', 4200, 'em_atraso', null, null);

  -- Payables: mix of paid / open / overdue
  insert into public.payables (company_id,supplier_id,description,category_id,due_date,installment,amount,status,account_id,paid_at) values
    (v_company,v_sup2,'[seed] Cimento lote grande',   v_cat_materiais, current_date - 30, '1/1', 8600, 'pago',     v_acc_main, current_date - 29),
    (v_company,v_sup3,'[seed] Vergalhões de aço',      v_cat_materiais, current_date + 8,  '1/2', 12400,'a_pagar',  null, null),
    (v_company,v_sup1,'[seed] Serviços terceirizados', v_cat_maodeobra, current_date - 6,  '1/1', 5300, 'em_atraso', null, null),
    (v_company,v_sup2,'[seed] Argamassa e acabamento', v_cat_materiais, current_date + 20, '1/1', 3700, 'a_pagar',  null, null),
    (v_company,null,  '[seed] Impostos trimestrais',   v_cat_impostos,  current_date - 12, '1/1', 6900, 'em_atraso', null, null);
end $$;
