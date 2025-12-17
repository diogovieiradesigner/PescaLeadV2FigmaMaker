// =============================================================================
// QUERIES: cnpj-api - SQL Queries Otimizadas
// =============================================================================

// Query principal: busca dados completos do CNPJ com JOINs otimizados
export const QUERY_CNPJ_COMPLETO = `
SELECT
  -- Dados da empresa
  emp.cnpj_basico,
  emp.razao_social,
  emp.natureza_juridica,
  nj.descricao as natureza_juridica_descricao,
  emp.capital_social,
  emp.porte_empresa,

  -- Dados do estabelecimento
  est.cnpj_ordem,
  est.cnpj_dv,
  est.nome_fantasia,
  est.situacao_cadastral,
  est.data_situacao_cadastral,
  est.data_inicio_atividade,
  est.cnae_fiscal_principal,
  cn.descricao as cnae_descricao,
  est.tipo_logradouro,
  est.logradouro,
  est.numero,
  est.complemento,
  est.bairro,
  est.cep,
  est.uf,
  est.municipio as municipio_codigo,
  mun.descricao as municipio_nome,
  est.ddd_1,
  est.telefone_1,
  est.ddd_2,
  est.telefone_2,
  est.ddd_fax,
  est.fax,
  est.correio_eletronico,
  est.identificador_matriz_filial,

  -- Dados do Simples
  sim.opcao_pelo_simples,
  sim.data_opcao_simples,
  sim.data_exclusao_simples,
  sim.opcao_mei,
  sim.data_opcao_mei,
  sim.data_exclusao_mei

FROM estabelecimento est
LEFT JOIN empresa emp ON est.cnpj_basico = emp.cnpj_basico
LEFT JOIN simples sim ON est.cnpj_basico = sim.cnpj_basico
LEFT JOIN cnae cn ON est.cnae_fiscal_principal = cn.codigo
LEFT JOIN munic mun ON est.municipio = mun.codigo
LEFT JOIN natju nj ON emp.natureza_juridica = nj.codigo

WHERE est.cnpj_basico = $1
  AND est.cnpj_ordem = $2
  AND est.cnpj_dv = $3
LIMIT 1;
`;

// Query para buscar sócios (QSA) de um CNPJ
export const QUERY_SOCIOS = `
SELECT
  s.nome_socio_razao_social,
  s.cpf_cnpj_socio,
  s.qualificacao_socio,
  q.descricao as qualificacao_descricao,
  s.data_entrada_sociedade,
  s.faixa_etaria,
  p.descricao as pais,
  s.representante_legal,
  s.nome_do_representante
FROM socios s
LEFT JOIN quals q ON s.qualificacao_socio = q.codigo
LEFT JOIN pais p ON s.pais = p.codigo
WHERE s.cnpj_basico = $1
ORDER BY s.data_entrada_sociedade DESC
LIMIT 20;
`;

// Query simplificada para busca rápida (sem sócios nem simples)
export const QUERY_CNPJ_BASICO = `
SELECT
  emp.cnpj_basico,
  emp.razao_social,
  emp.natureza_juridica,
  emp.capital_social,
  emp.porte_empresa,
  est.cnpj_ordem,
  est.cnpj_dv,
  est.nome_fantasia,
  est.situacao_cadastral,
  est.data_situacao_cadastral,
  est.correio_eletronico,
  est.ddd_1,
  est.telefone_1,
  est.identificador_matriz_filial
FROM estabelecimento est
LEFT JOIN empresa emp ON est.cnpj_basico = emp.cnpj_basico
WHERE est.cnpj_basico = $1
  AND est.cnpj_ordem = $2
  AND est.cnpj_dv = $3
LIMIT 1;
`;

// Query para verificar se o CNPJ existe (health check rápido)
export const QUERY_CNPJ_EXISTS = `
SELECT EXISTS(
  SELECT 1 FROM estabelecimento
  WHERE cnpj_basico = $1
    AND cnpj_ordem = $2
    AND cnpj_dv = $3
) as exists;
`;

// Query para dados do Simples Nacional
export const QUERY_SIMPLES = `
SELECT
  opcao_pelo_simples,
  data_opcao_simples,
  data_exclusao_simples,
  opcao_mei,
  data_opcao_mei,
  data_exclusao_mei
FROM simples
WHERE cnpj_basico = $1
LIMIT 1;
`;
