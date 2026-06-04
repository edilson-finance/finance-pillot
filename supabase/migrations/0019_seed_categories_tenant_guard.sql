-- 0019_seed_categories_tenant_guard.sql — Blinda fn_seed_default_categories contra
-- chamadas cross-tenant. A função é SECURITY DEFINER e tem EXECUTE para 'authenticated',
-- então sem este guard qualquer usuário autenticado poderia semear/religar categorias
-- de outra empresa via RPC direto. Agrega apenas o guard; corpo abaixo é idêntico ao 0017.

create or replace function public.fn_seed_default_categories(p_company uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  rec record;
  v_parent uuid;
  v_kind text;
  v_legacy uuid;
  v_caller uuid;
begin
  -- Guard multi-tenant: usuário autenticado só pode semear a própria empresa.
  -- Em contexto admin/migração (sem JWT) auth_company_id() é null e a operação é liberada.
  v_caller := public.auth_company_id();
  if v_caller is not null and p_company is distinct from v_caller then
    raise exception 'Operação não permitida: empresa não corresponde ao usuário autenticado.';
  end if;

  for rec in
    select * from (values
      ('3.1','Receita Bruta de Vendas e Serviços','receita_bruta',true ,null ,1),
      ('3.1.1','Venda de Mercadorias / Produtos','receita_bruta',false,'3.1',1),
      ('3.1.2','Prestação de Serviços','receita_bruta',false,'3.1',2),
      ('3.1.3','Contratos e Projetos','receita_bruta',false,'3.1',3),
      ('3.1.4','Receita de Locações','receita_bruta',false,'3.1',4),
      ('3.1.5','Contratos Mensais / Recorrentes','receita_bruta',false,'3.1',5),
      ('3.2','Deduções da Receita Bruta','deducoes',true,null,2),
      ('3.2.1','ISS — Imposto sobre Serviços','deducoes',false,'3.2',1),
      ('3.2.2','PIS e COFINS sobre Faturamento','deducoes',false,'3.2',2),
      ('3.2.3','ICMS sobre Vendas','deducoes',false,'3.2',3),
      ('3.2.4','Devoluções e Abatimentos','deducoes',false,'3.2',4),
      ('3.2.5','Simples Nacional — Parcela s/ Receita','deducoes',false,'3.2',5),
      ('4.1','Custo dos Serviços Prestados (CSP)','cst_servicos',true,null,3),
      ('4.1.1','Mão de Obra Direta','cst_servicos',false,'4.1',1),
      ('4.1.2','Subcontratados e Terceiros','cst_servicos',false,'4.1',2),
      ('4.1.3','Materiais e Insumos de Produção','cst_servicos',false,'4.1',3),
      ('4.1.4','Fretes e Logística (Custo)','cst_servicos',false,'4.1',4),
      ('4.2','Custo das Mercadorias Vendidas (CMV)','cst_mercadorias',true,null,4),
      ('4.2.1','Custo de Aquisição de Mercadorias','cst_mercadorias',false,'4.2',1),
      ('4.2.2','Fretes de Compra','cst_mercadorias',false,'4.2',2),
      ('4.2.3','Embalagens','cst_mercadorias',false,'4.2',3),
      ('5.1','Despesas com Pessoal','desp_pessoal',true,null,5),
      ('5.1.1','Salários e Ordenados','desp_pessoal',false,'5.1',1),
      ('5.1.2','Encargos Sociais (INSS, FGTS)','desp_pessoal',false,'5.1',2),
      ('5.1.3','Vale-Transporte','desp_pessoal',false,'5.1',3),
      ('5.1.4','Vale-Refeição / Alimentação','desp_pessoal',false,'5.1',4),
      ('5.1.5','Plano de Saúde e Odonto','desp_pessoal',false,'5.1',5),
      ('5.1.6','Pró-labore dos Sócios','desp_pessoal',false,'5.1',6),
      ('5.1.7','Treinamentos e Capacitação','desp_pessoal',false,'5.1',7),
      ('5.1.8','Rescisões Trabalhistas','desp_pessoal',false,'5.1',8),
      ('5.2','Despesas Administrativas','desp_administrativa',true,null,6),
      ('5.2.1','Aluguel e Condomínio','desp_administrativa',false,'5.2',1),
      ('5.2.2','Energia Elétrica e Água','desp_administrativa',false,'5.2',2),
      ('5.2.3','Telefonia e Internet','desp_administrativa',false,'5.2',3),
      ('5.2.4','Material de Escritório e Limpeza','desp_administrativa',false,'5.2',4),
      ('5.2.5','Honorários Contábeis e Jurídicos','desp_administrativa',false,'5.2',5),
      ('5.2.6','Seguros','desp_administrativa',false,'5.2',6),
      ('5.2.7','Manutenção e Conservação','desp_administrativa',false,'5.2',7),
      ('5.2.8','Softwares, Sistemas e Assinaturas','desp_administrativa',false,'5.2',8),
      ('5.2.9','Despesas com Viagens e Diárias','desp_administrativa',false,'5.2',9),
      ('5.2.10','Serviços de Limpeza e Conservação','desp_administrativa',false,'5.2',10),
      ('5.3','Despesas Comerciais e Marketing','desp_comercial',true,null,7),
      ('5.3.1','Comissões sobre Vendas','desp_comercial',false,'5.3',1),
      ('5.3.2','Marketing e Publicidade Digital','desp_comercial',false,'5.3',2),
      ('5.3.3','Eventos e Feiras','desp_comercial',false,'5.3',3),
      ('5.3.4','Brindes e Amostras Grátis','desp_comercial',false,'5.3',4),
      ('5.3.5','Fretes de Entrega (Venda)','desp_comercial',false,'5.3',5),
      ('5.4','Impostos, Taxas e Contribuições','desp_impostos',true,null,8),
      ('5.4.1','Simples Nacional — Parcela Apurada','desp_impostos',false,'5.4',1),
      ('5.4.2','IPTU','desp_impostos',false,'5.4',2),
      ('5.4.3','IPVA','desp_impostos',false,'5.4',3),
      ('5.4.4','Taxas Municipais e Licenças','desp_impostos',false,'5.4',4),
      ('5.5','Outras Receitas Operacionais','outras_receitas',true,null,9),
      ('5.5.1','Juros e Rendimentos Ativos','outras_receitas',false,'5.5',1),
      ('5.5.2','Recuperação de Despesas','outras_receitas',false,'5.5',2),
      ('5.5.3','Venda de Ativo Imobilizado','outras_receitas',false,'5.5',3),
      ('5.6','Depreciação e Amortização','depreciacao',true,null,10),
      ('5.6.1','Depreciação de Imobilizado','depreciacao',false,'5.6',1),
      ('5.6.2','Amortização de Intangíveis','depreciacao',false,'5.6',2),
      ('6.1','Receitas Financeiras','rec_financeira',true,null,11),
      ('6.1.1','Rendimentos de Aplicações Financeiras','rec_financeira',false,'6.1',1),
      ('6.1.2','Juros Ativos Recebidos','rec_financeira',false,'6.1',2),
      ('6.1.3','Descontos Obtidos de Fornecedores','rec_financeira',false,'6.1',3),
      ('6.2','Despesas Financeiras','desp_financeira',true,null,12),
      ('6.2.1','Juros sobre Empréstimos e Financiamentos','desp_financeira',false,'6.2',1),
      ('6.2.2','IOF','desp_financeira',false,'6.2',2),
      ('6.2.3','Tarifas Bancárias e CET','desp_financeira',false,'6.2',3),
      ('6.2.4','Multas e Juros de Mora','desp_financeira',false,'6.2',4),
      ('6.2.5','Descontos Concedidos a Clientes','desp_financeira',false,'6.2',5),
      ('7.1','IR e CSLL','ir_csll',true,null,13),
      ('7.1.1','IRPJ — Imposto de Renda','ir_csll',false,'7.1',1),
      ('7.1.2','CSLL — Contribuição Social','ir_csll',false,'7.1',2),
      ('8.1','Investimentos e Imobilizado','investimento',true,null,14),
      ('8.1.1','Compra de Equipamentos e Máquinas','investimento',false,'8.1',1),
      ('8.1.2','Compra de Veículos','investimento',false,'8.1',2),
      ('8.1.3','Reformas e Benfeitorias','investimento',false,'8.1',3),
      ('8.2','Empréstimos e Financiamentos','emprestimo',true,null,15),
      ('8.2.1','Captação de Empréstimos (entrada)','emprestimo',false,'8.2',1),
      ('8.2.2','Amortização de Principal','emprestimo',false,'8.2',2),
      ('8.3','Movimentações de Sócios','socio',true,null,16),
      ('8.3.1','Aporte de Capital dos Sócios','socio',false,'8.3',1),
      ('8.3.2','Retirada de Lucros / Dividendos','socio',false,'8.3',2),
      ('8.4','Transferências Internas','transferencia',true,null,17),
      ('8.4.1','Transferência entre Contas Próprias','transferencia',false,'8.4',1)
    ) as t(code,name,grupo,is_synthetic,parent_code,sort)
    order by code
  loop
    v_kind := case (select natureza from public.dre_groups g where g.grupo = rec.grupo)
                when 'receita' then 'receita' when 'neutro' then 'neutro' else 'despesa' end;
    v_parent := null;
    if rec.parent_code is not null then
      select id into v_parent from public.categories
        where company_id = p_company and code = rec.parent_code;
    end if;

    v_legacy := null;
    if not rec.is_synthetic then
      select id into v_legacy from public.categories
        where company_id = p_company and code is null and lower(name) = lower(
          case rec.code
            when '3.1.2' then 'Serviços'
            when '3.1.1' then 'Vendas'
            when '5.2.1' then 'Aluguel'
            when '5.1.1' then 'Folha Salarial'
            when '5.4.1' then 'Impostos'
            when '4.1.1' then 'Mão de obra'
            when '5.3.2' then 'Marketing'
            when '4.1.3' then 'Materiais'
            else '\x00' end)
        limit 1;
    end if;

    if v_legacy is not null then
      update public.categories set
        code = rec.code, name = rec.name, grupo = rec.grupo, parent_id = v_parent,
        is_synthetic = false, active = true, sort_order = rec.sort, kind = v_kind
      where id = v_legacy;
    else
      insert into public.categories (company_id, code, name, grupo, parent_id, is_synthetic, active, sort_order, kind)
      values (p_company, rec.code, rec.name, rec.grupo, v_parent, rec.is_synthetic, true, rec.sort, v_kind)
      on conflict (company_id, code) where code is not null do update set
        name = excluded.name, grupo = excluded.grupo, parent_id = excluded.parent_id,
        is_synthetic = excluded.is_synthetic, sort_order = excluded.sort_order, kind = excluded.kind;
    end if;
  end loop;
end $$;

revoke execute on function public.fn_seed_default_categories(uuid) from anon;
grant execute on function public.fn_seed_default_categories(uuid) to authenticated;
