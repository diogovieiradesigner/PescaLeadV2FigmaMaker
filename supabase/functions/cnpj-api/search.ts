// =============================================================================
// SEARCH: cnpj-api - Handler de Prospecção com Query Builder Dinâmica
// =============================================================================
// OTIMIZADO: JOINs condicionais para melhor performance
// Só faz JOIN nas tabelas que são necessárias baseado nos filtros aplicados
// =============================================================================

import type {
  SearchFilters,
  SearchRequest,
  SearchResponse,
  SearchResultItem,
  StatsResponse,
  StatsPreview
} from './types.ts';
import {
  decodeSituacaoCadastral,
  decodePorteEmpresa,
  formatDate,
  formatPhoneClean,
  formatCapitalSocial
} from './normalizer.ts';

const MAX_LIMIT = 10000;
const DEFAULT_LIMIT = 100;

// Mapeamento de nomes de estados para siglas UF
const ESTADO_PARA_UF: Record<string, string> = {
  'acre': 'AC', 'alagoas': 'AL', 'amapa': 'AP', 'amazonas': 'AM',
  'bahia': 'BA', 'ceara': 'CE', 'distrito federal': 'DF', 'espirito santo': 'ES',
  'goias': 'GO', 'maranhao': 'MA', 'mato grosso': 'MT', 'mato grosso do sul': 'MS',
  'minas gerais': 'MG', 'para': 'PA', 'paraiba': 'PB', 'parana': 'PR',
  'pernambuco': 'PE', 'piaui': 'PI', 'rio de janeiro': 'RJ', 'rio grande do norte': 'RN',
  'rio grande do sul': 'RS', 'rondonia': 'RO', 'roraima': 'RR', 'santa catarina': 'SC',
  'sao paulo': 'SP', 'sergipe': 'SE', 'tocantins': 'TO'
};

// Lista de UFs válidas
const UFS_VALIDAS = new Set(Object.values(ESTADO_PARA_UF));

// Mapeamento de códigos de porte para valores mínimos e máximos de capital social
const PORTE_CAPITAL_LIMITES: Record<string, { min: number; max: number }> = {
  '01': { min: 0, max: 360000 }, // Micro Empresa: até 360 mil
  '03': { min: 0, max: 4800000 }, // Empresa de Pequeno Porte: até 4,8 milhões
  '05': { min: 4800000, max: Infinity } // Demais: acima de 4,8 milhões
};

// Combinações de situação cadastral que resultam em 0 registros
const SITUACAO_COMBINACOES_IMPOSSIVEIS: string[][] = [
  ['02', '08'], // Ativa e Baixada ao mesmo tempo
  ['02', '04'], // Ativa e Inapta ao mesmo tempo
  ['02', '03'], // Ativa e Suspensa ao mesmo tempo
];

/**
 * Parseia localização textual para extrair UF e nome do município
 * Ex: "Joao Pessoa, Paraiba, Brasil" -> { uf: 'PB', municipio_nome: 'Joao Pessoa' }
 * 
 * CORREÇÃO: Lida melhor com casos onde município = estado (ex: "Paraiba, Paraiba, Brazil")
 */
function parseLocalizacao(localizacao: string): { uf?: string; municipio_nome?: string } {
  if (!localizacao) return {};

  // Normalizar: remover acentos e lowercase
  const normalizado = localizacao
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/state of /gi, '') // Remover "State of" que pode vir do frontend
    .replace(/^cnpj\s*-\s*/i, '') // Remover prefixo "CNPJ - " do início
    .toLowerCase()
    .trim();

  // Dividir por vírgula (ignorar país em português ou inglês)
  const partes = normalizado.split(',').map(p => p.trim()).filter(p => p && p !== 'brasil' && p !== 'brazil');

  if (partes.length === 0) return {};

  let uf: string | undefined;
  let municipio_nome: string | undefined;

  console.log(`📍 [LOCALIZACAO] Parsing: "${localizacao}" -> partes:`, partes);

  // NOVA LÓGICA: Primeiro, identificar todas as possíveis UFs
  const ufsEncontradas: Array<{parte: string, uf: string, tipo: string}> = [];
  const naoUfs: string[] = [];

  for (let i = 0; i < partes.length; i++) {
    const parte = partes[i];
    
    // Verificar se é uma sigla de UF
    if (parte.length === 2 && UFS_VALIDAS.has(parte.toUpperCase())) {
      ufsEncontradas.push({ parte, uf: parte.toUpperCase(), tipo: 'sigla' });
      continue;
    }

    // Verificar se é nome de estado
    if (ESTADO_PARA_UF[parte]) {
      ufsEncontradas.push({ parte, uf: ESTADO_PARA_UF[parte], tipo: 'nome' });
      continue;
    }

    // Não é UF, é possível município
    naoUfs.push(parte);
  }

  console.log(`📍 [LOCALIZACAO] UFs encontradas:`, ufsEncontradas);
  console.log(`📍 [LOCALIZACAO] Partes que não são UF:`, naoUfs);

  // Se temos exatamente 1 UF encontrada, ela é o estado
  if (ufsEncontradas.length === 1) {
    uf = ufsEncontradas[0].uf;
    console.log(`✅ [LOCALIZACAO] UF definida: ${uf}`);

    // Se temos partes que não são UF, a primeira pode ser município
    if (naoUfs.length > 0) {
      municipio_nome = naoUfs[0]
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
      console.log(`✅ [LOCALIZACAO] Município definido: "${municipio_nome}"`);
    }
  } 
  // Se temos 2+ partes iguais e são UFs (ex: "paraiba, paraiba")
  else if (ufsEncontradas.length >= 2) {
    // Usar a primeira parte como município (caso específico de município = estado)
    // E a segunda como UF
    const primeiraParte = partes[0];
    
    // Verificar se a primeira parte corresponde a uma UF
    const ufMatch = ufsEncontradas.find(u => u.parte === primeiraParte);
    if (ufMatch) {
      uf = ufMatch.uf;
      
      // Se há mais de 2 partes, usar a penúltima como município
      if (partes.length >= 3) {
        municipio_nome = partes[partes.length - 2]
          .split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
      } else {
        // Se há apenas 2 partes iguais, a primeira pode ser município com mesmo nome do estado
        municipio_nome = primeiraParte
          .split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
      }
      
      console.log(`✅ [LOCALIZACAO] UF (caso especial): ${uf}`);
      console.log(`✅ [LOCALIZACAO] Município (caso especial): "${municipio_nome}"`);
    }
  }
  // Se temos 0 UFs, tentar lógica original (menos robusta)
  else {
    // Fallback para lógica original (menos robusta)
    for (let i = partes.length - 1; i >= 0; i--) {
      const parte = partes[i];

      // Verificar se é uma sigla de UF
      if (parte.length === 2 && UFS_VALIDAS.has(parte.toUpperCase())) {
        uf = parte.toUpperCase();
        continue;
      }

      // Verificar se é nome de estado
      if (ESTADO_PARA_UF[parte]) {
        uf = ESTADO_PARA_UF[parte];
        continue;
      }

      // Se ainda não temos município, assumir que é o nome da cidade
      if (!municipio_nome && parte.length > 2) {
        municipio_nome = parte
          .split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
      }
    }
  }

  // Se só temos uma parte e é nome de estado, não é município
  if (partes.length === 1 && uf && !municipio_nome) {
    console.log(`⚠️ [LOCALIZACAO] Apenas UF definida, sem município`);
    return { uf };
  }

  const resultado = { uf, municipio_nome };
  console.log(`📍 [LOCALIZACAO] Resultado final:`, resultado);
  return resultado;
}

// Campos válidos para ordenação (com e sem JOIN)
const VALID_ORDER_FIELDS: Record<string, { field: string; requiresJoin?: string }> = {
  'razao_social': { field: 'emp.razao_social', requiresJoin: 'empresa' },
  'nome_fantasia': { field: 'est.nome_fantasia' },
  'capital_social': { field: 'emp.capital_social', requiresJoin: 'empresa' },
  'data_abertura': { field: 'est.data_inicio_atividade' },
  'uf': { field: 'est.uf' },
  'municipio': { field: 'mun.descricao', requiresJoin: 'munic' },
  'cnae': { field: 'est.cnae_fiscal_principal' }
};

interface QueryBuilderResult {
  sql: string;
  params: unknown[];
  countSql: string;
}

/**
 * Determina quais JOINs são necessários baseado nos filtros e ordenação
 */
function determineRequiredJoins(filters: SearchFilters, orderBy: string): {
  needsEmpresa: boolean;
  needsSimples: boolean;
  needsMunic: boolean;
  needsCnae: boolean;
} {
  const orderConfig = VALID_ORDER_FIELDS[orderBy];

  return {
    // JOIN empresa: SEMPRE - precisamos da razão social e porte para exibição
    // Antes era condicional, mas isso fazia com que razao_social viesse NULL
    needsEmpresa: true,
    // JOIN simples: filtros de simples ou mei
    needsSimples: !!(
      filters.simples !== undefined ||
      filters.mei !== undefined
    ),
    // JOIN munic: ordenação por município (sempre útil para exibir nome da cidade)
    needsMunic: true, // Mantemos sempre para mostrar nome do município
    // JOIN cnae: sempre útil para mostrar descrição do CNAE
    needsCnae: true // Mantemos sempre para mostrar descrição do CNAE
  };
}

/**
 * Validação avançada de filtros para evitar combinações logicamente impossíveis
 * @param filters Filtros a serem validados
 * @returns Objeto com validação e mensagens de erro específicas
 */
export function validateAdvancedFilters(filters: SearchFilters): {
  valid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
  correctedFilters?: SearchFilters
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  const suggestions: string[] = [];
  const correctedFilters = { ...filters };
  let hasCorrections = false;

  console.log('🔍 [VALIDACAO_AVANCADA] Iniciando validação avançada de filtros:', JSON.stringify(filters, null, 2));

  // 1. Verificar combinação MEI + filial (tipo: ["2"]) - raro na prática
  if (filters.mei === true && filters.tipo && filters.tipo.includes('2')) {
    warnings.push('A combinação de MEI com filial é rara na prática e pode resultar em poucos ou nenhum registro.');
    suggestions.push('Considere remover o filtro de filial ou o filtro MEI para obter mais resultados.');
    console.log('⚠️ [VALIDACAO_AVANCADA] Aviso: Combinação MEI + filial detectada');
  }

  // 2. Verificar faixas de capital social incompatíveis com porte da empresa
  if (filters.capital_social_min !== undefined || filters.capital_social_max !== undefined) {
    if (filters.porte && filters.porte.length > 0) {
      // Verificar se as faixas de capital são compatíveis com os portes selecionados
      const incompatibilities: string[] = [];
      
      for (const porte of filters.porte) {
        const limites = PORTE_CAPITAL_LIMITES[porte];
        if (limites) {
          if (filters.capital_social_min !== undefined && filters.capital_social_min > limites.max) {
            incompatibilities.push(`Porte "${decodePorteEmpresa(porte)}" é incompatível com capital mínimo de R$${filters.capital_social_min.toLocaleString('pt-BR')}`);
          }
          if (filters.capital_social_max !== undefined && filters.capital_social_max < limites.min) {
            incompatibilities.push(`Porte "${decodePorteEmpresa(porte)}" é incompatível com capital máximo de R$${filters.capital_social_max.toLocaleString('pt-BR')}`);
          }
        }
      }
      
      if (incompatibilities.length > 0) {
        warnings.push('Faixas de capital social incompatíveis com portes selecionados:');
        warnings.push(...incompatibilities);
        suggestions.push('Ajuste as faixas de capital social ou os portes selecionados para torná-los compatíveis.');
        console.log('⚠️ [VALIDACAO_AVANCADA] Aviso: Faixas de capital incompatíveis com portes - continuando execução');
      }
    }
  }

  // 3. Verificar combinações de situação cadastral que resultariam em 0 registros
  if (filters.situacao && filters.situacao.length > 1) {
    // Verificar se há combinações impossíveis
    for (const combinacao of SITUACAO_COMBINACOES_IMPOSSIVEIS) {
      if (combinacao.every(situacao => filters.situacao!.includes(situacao))) {
        errors.push(`Combinação impossível de situações cadastrais: ${combinacao.map(s => decodeSituacaoCadastral(s)).join(' + ')}`);
        suggestions.push('Remova uma das situações cadastrais incompatíveis.');
        console.log('❌ [VALIDACAO_AVANCADA] Erro: Combinação impossível de situações cadastrais');
      }
    }
  }

  // 4. Verificar filtros conflitantes entre si
  // Capital social mínimo maior que máximo
  if (filters.capital_social_min !== undefined && filters.capital_social_max !== undefined) {
    if (filters.capital_social_min > filters.capital_social_max) {
      warnings.push('Capital social mínimo não pode ser maior que o capital social máximo.');
      // Corrigir automaticamente
      correctedFilters.capital_social_min = filters.capital_social_max;
      correctedFilters.capital_social_max = filters.capital_social_min;
      hasCorrections = true;
      console.log('🔧 [VALIDACAO_AVANCADA] Corrigido: Capital social min/max invertidos');
    }
  }

  // Data de abertura mínima maior que máxima
  if (filters.data_abertura_min && filters.data_abertura_max) {
    const minDate = new Date(filters.data_abertura_min);
    const maxDate = new Date(filters.data_abertura_max);
    
    if (minDate > maxDate) {
      errors.push('Data de abertura mínima não pode ser maior que a data de abertura máxima.');
      // Corrigir automaticamente
      correctedFilters.data_abertura_min = filters.data_abertura_max;
      correctedFilters.data_abertura_max = filters.data_abertura_min;
      hasCorrections = true;
      console.log('🔧 [VALIDACAO_AVANCADA] Corrigido: Datas de abertura min/max invertidas');
    }
  }

  // Idade mínima maior que máxima
  if (filters.idade_min_dias !== undefined && filters.idade_max_dias !== undefined) {
    if (filters.idade_min_dias > filters.idade_max_dias) {
      errors.push('Idade mínima não pode ser maior que a idade máxima.');
      // Corrigir automaticamente
      correctedFilters.idade_min_dias = filters.idade_max_dias;
      correctedFilters.idade_max_dias = filters.idade_min_dias;
      hasCorrections = true;
      console.log('🔧 [VALIDACAO_AVANCADA] Corrigido: Idades min/max invertidas');
    }
  }

  // 5. Verificar filtros logicamente impossíveis
  // MEI e não optante pelo Simples ao mesmo tempo
  if (filters.mei === true && filters.simples === false) {
    errors.push('Uma empresa MEI deve ser optante pelo Simples Nacional.');
    suggestions.push('Remova o filtro "não optante pelo Simples" ou o filtro MEI.');
    console.log('❌ [VALIDACAO_AVANCADA] Erro: MEI e não optante pelo Simples');
  }

  // Filial sem matriz
  if (filters.tipo && filters.tipo.includes('2') && !filters.tipo.includes('1')) {
    // Esta não é uma combinação impossível, mas pode ser rara
    warnings.push('Filtro apenas por filiais sem matrizes pode resultar em dados incompletos.');
    suggestions.push('Considere incluir também matrizes para obter uma visão completa.');
    console.log('⚠️ [VALIDACAO_AVANCADA] Aviso: Apenas filiais selecionadas');
  }

  console.log('🔍 [VALIDACAO_AVANCADA] Validação concluída - Erros:', errors.length, 'Avisos:', warnings.length);

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    suggestions,
    correctedFilters: hasCorrections ? correctedFilters : undefined
  };
}

/**
 * Constrói a query SQL dinamicamente baseada nos filtros
 * OTIMIZADO: Usa JOINs condicionais para melhor performance
 */
export function buildSearchQuery(
  filters: SearchFilters,
  limit: number,
  offset: number,
  orderBy: string,
  orderDir: 'asc' | 'desc'
): QueryBuilderResult {
  const conditions: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  // Determinar quais JOINs são necessários
  const joins = determineRequiredJoins(filters, orderBy);

  // ==========================================================================
  // FILTROS DE TEXTO
  // ==========================================================================
  if (filters.termo) {
    const termo = `%${filters.termo.toUpperCase()}%`;
    // Se temos JOIN com empresa, busca em ambos os campos
    if (joins.needsEmpresa) {
      conditions.push(`(est.nome_fantasia ILIKE $${paramIndex} OR emp.razao_social ILIKE $${paramIndex + 1})`);
      params.push(termo, termo);
      paramIndex += 2;
    } else {
      // Sem JOIN, busca só no nome fantasia
      conditions.push(`est.nome_fantasia ILIKE $${paramIndex}`);
      params.push(termo);
      paramIndex += 1;
    }
  }

  // ==========================================================================
  // FILTROS DE LOCALIZAÇÃO
  // ==========================================================================

  // Processar localização textual (ex: "Joao Pessoa, Paraiba, Brasil")
  if (filters.localizacao) {
    const { uf: parsedUf, municipio_nome: parsedMunicipio } = parseLocalizacao(filters.localizacao);
    console.log(`📍 [LOCALIZACAO] Parsed: "${filters.localizacao}" -> UF: ${parsedUf}, Município: ${parsedMunicipio}`);

    if (parsedUf) {
      conditions.push(`est.uf = $${paramIndex++}`);
      params.push(parsedUf);
    }

    if (parsedMunicipio) {
      // Busca no nome do município (tabela munic) - precisa do JOIN
      conditions.push(`mun.descricao ILIKE $${paramIndex++}`);
      params.push(`%${parsedMunicipio}%`);
    }
  }

  // Filtros específicos de UF (array)
  if (filters.uf && filters.uf.length > 0) {
    const placeholders = filters.uf.map(() => `$${paramIndex++}`).join(', ');
    conditions.push(`est.uf IN (${placeholders})`);
    params.push(...filters.uf);
  }

  // Filtros específicos de município por código
  if (filters.municipio && filters.municipio.length > 0) {
    const placeholders = filters.municipio.map(() => `$${paramIndex++}`).join(', ');
    conditions.push(`est.municipio IN (${placeholders})`);
    params.push(...filters.municipio);
  }

  // Filtro de município por nome (busca LIKE)
  if (filters.municipio_nome) {
    conditions.push(`mun.descricao ILIKE $${paramIndex++}`);
    params.push(`%${filters.municipio_nome}%`);
  }

  if (filters.cep_prefixo) {
    conditions.push(`est.cep LIKE $${paramIndex++}`);
    params.push(`${filters.cep_prefixo}%`);
  }

  if (filters.ddd && filters.ddd.length > 0) {
    const placeholders = filters.ddd.map(() => `$${paramIndex++}`).join(', ');
    conditions.push(`est.ddd_1 IN (${placeholders})`);
    params.push(...filters.ddd);
  }

  // ==========================================================================
  // FILTROS DE ATIVIDADE ECONÔMICA (NICHO)
  // ==========================================================================
  if (filters.cnae_divisao && filters.cnae_divisao.length > 0) {
    // CNAE divisão são os 2 primeiros dígitos
    const divisaoConditions = filters.cnae_divisao.map(() => `est.cnae_fiscal_principal LIKE $${paramIndex++}`);
    conditions.push(`(${divisaoConditions.join(' OR ')})`);
    params.push(...filters.cnae_divisao.map(d => `${d}%`));
  }

  if (filters.cnae && filters.cnae.length > 0) {
    const placeholders = filters.cnae.map(() => `$${paramIndex++}`).join(', ');
    conditions.push(`est.cnae_fiscal_principal IN (${placeholders})`);
    params.push(...filters.cnae);
  }

  // ==========================================================================
  // FILTROS DE PORTE E FINANCEIRO
  // ==========================================================================
  if (filters.porte && filters.porte.length > 0) {
    const placeholders = filters.porte.map(() => `$${paramIndex++}`).join(', ');
    conditions.push(`emp.porte_empresa IN (${placeholders})`);
    params.push(...filters.porte);
  }

  if (filters.capital_social_min !== undefined) {
    // O campo capital_social no banco é NUMERIC
    conditions.push(`emp.capital_social >= $${paramIndex++}`);
    params.push(filters.capital_social_min);
  }

  if (filters.capital_social_max !== undefined) {
    conditions.push(`emp.capital_social <= $${paramIndex++}`);
    params.push(filters.capital_social_max);
  }

  // ==========================================================================
  // FILTROS DE SITUAÇÃO E TIPO
  // ==========================================================================
  if (filters.situacao && filters.situacao.length > 0) {
    const placeholders = filters.situacao.map(() => `$${paramIndex++}`).join(', ');
    conditions.push(`est.situacao_cadastral IN (${placeholders})`);
    params.push(...filters.situacao);
  }

  if (filters.tipo && filters.tipo.length > 0) {
    const placeholders = filters.tipo.map(() => `$${paramIndex++}`).join(', ');
    conditions.push(`est.identificador_matriz_filial IN (${placeholders})`);
    params.push(...filters.tipo);
  }

  if (filters.natureza_juridica && filters.natureza_juridica.length > 0) {
    const placeholders = filters.natureza_juridica.map(() => `$${paramIndex++}`).join(', ');
    conditions.push(`emp.natureza_juridica IN (${placeholders})`);
    params.push(...filters.natureza_juridica);
  }

  // ==========================================================================
  // FILTROS DE REGIME TRIBUTÁRIO
  // ==========================================================================
  if (filters.simples !== undefined) {
    conditions.push(`sim.opcao_pelo_simples = $${paramIndex++}`);
    params.push(filters.simples ? 'S' : 'N');
  }

  if (filters.mei !== undefined) {
    conditions.push(`sim.opcao_mei = $${paramIndex++}`);
    params.push(filters.mei ? 'S' : 'N');
  }

  // ==========================================================================
  // FILTROS DE CONTATO
  // ==========================================================================
  if (filters.com_email === true) {
    conditions.push(`est.correio_eletronico IS NOT NULL AND est.correio_eletronico != '' AND est.correio_eletronico LIKE '%@%'`);
  }

  if (filters.com_telefone === true) {
    conditions.push(`est.telefone_1 IS NOT NULL AND est.telefone_1 != ''`);
  }

  // ==========================================================================
  // FILTROS DE DATA
  // ==========================================================================
  if (filters.data_abertura_min) {
    conditions.push(`est.data_inicio_atividade >= $${paramIndex++}`);
    params.push(filters.data_abertura_min.replace(/-/g, ''));
  }

  if (filters.data_abertura_max) {
    conditions.push(`est.data_inicio_atividade <= $${paramIndex++}`);
    params.push(filters.data_abertura_max.replace(/-/g, ''));
  }

  if (filters.idade_max_dias) {
    const dataMin = new Date();
    dataMin.setDate(dataMin.getDate() - filters.idade_max_dias);
    const dataMinStr = dataMin.toISOString().split('T')[0].replace(/-/g, '');
    conditions.push(`est.data_inicio_atividade >= $${paramIndex++}`);
    params.push(dataMinStr);
  }

  if (filters.idade_min_dias) {
    const dataMax = new Date();
    dataMax.setDate(dataMax.getDate() - filters.idade_min_dias);
    const dataMaxStr = dataMax.toISOString().split('T')[0].replace(/-/g, '');
    conditions.push(`est.data_inicio_atividade <= $${paramIndex++}`);
    params.push(dataMaxStr);
  }

  // ==========================================================================
  // MONTAR WHERE CLAUSE
  // ==========================================================================
  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // ==========================================================================
  // ORDENAÇÃO
  // ==========================================================================
  const orderConfig = VALID_ORDER_FIELDS[orderBy] || VALID_ORDER_FIELDS['data_abertura'];
  const orderField = orderConfig.field;
  const orderDirection = orderDir === 'asc' ? 'ASC' : 'DESC';

  // ==========================================================================
  // CONSTRUIR JOINs CONDICIONAIS
  // ==========================================================================
  const joinClauses: string[] = [];

  if (joins.needsEmpresa) {
    joinClauses.push('LEFT JOIN empresa emp ON est.cnpj_basico = emp.cnpj_basico');
  }
  if (joins.needsSimples) {
    joinClauses.push('LEFT JOIN simples sim ON est.cnpj_basico = sim.cnpj_basico');
  }
  if (joins.needsCnae) {
    joinClauses.push('LEFT JOIN cnae cn ON est.cnae_fiscal_principal = cn.codigo');
  }
  if (joins.needsMunic) {
    joinClauses.push('LEFT JOIN munic mun ON est.municipio = mun.codigo');
  }

  const joinsSql = joinClauses.join('\n');

  // ==========================================================================
  // CONSTRUIR SELECT DINÂMICO
  // ==========================================================================
  const selectFields = [
    "CONCAT(est.cnpj_basico, est.cnpj_ordem, est.cnpj_dv) as cnpj",
    joins.needsEmpresa ? "emp.razao_social" : "NULL as razao_social",
    "est.nome_fantasia",
    "est.correio_eletronico as email",
    "CONCAT(est.ddd_1, est.telefone_1) as telefone",
    "est.uf",
    joins.needsMunic ? "mun.descricao as municipio" : "est.municipio as municipio",
    "est.cnae_fiscal_principal as cnae",
    joins.needsCnae ? "cn.descricao as cnae_descricao" : "NULL as cnae_descricao",
    joins.needsEmpresa ? "emp.porte_empresa as porte" : "NULL as porte",
    joins.needsEmpresa ? "emp.capital_social" : "NULL as capital_social",
    "est.situacao_cadastral as situacao",
    "est.data_inicio_atividade as data_abertura",
    "est.identificador_matriz_filial as tipo",
    joins.needsSimples ? "sim.opcao_pelo_simples as simples" : "NULL as simples",
    joins.needsSimples ? "sim.opcao_mei as mei" : "NULL as mei"
  ];

  // ==========================================================================
  // QUERY PRINCIPAL (LIMIT/OFFSET parametrizados para prevenir SQL Injection)
  // ==========================================================================
  const limitParamIndex = paramIndex++;
  const offsetParamIndex = paramIndex++;

  const sql = `
SELECT
  ${selectFields.join(',\n  ')}
FROM estabelecimento est
${joinsSql}
${whereClause}
ORDER BY ${orderField} ${orderDirection} NULLS LAST
LIMIT $${limitParamIndex}
OFFSET $${offsetParamIndex};
`;

  // Adicionar LIMIT e OFFSET como parâmetros (previne SQL Injection)
  params.push(limit, offset);

  // ==========================================================================
  // QUERY DE CONTAGEM (também com JOINs condicionais)
  // ==========================================================================
  // Para contagem, precisamos de TODOS os JOINs que são usados no WHERE
  const countJoins: string[] = [];
  if (joins.needsEmpresa) {
    countJoins.push('LEFT JOIN empresa emp ON est.cnpj_basico = emp.cnpj_basico');
  }
  if (joins.needsSimples) {
    countJoins.push('LEFT JOIN simples sim ON est.cnpj_basico = sim.cnpj_basico');
  }
  // IMPORTANTE: Se usamos mun.descricao no WHERE (localização com município), precisamos do JOIN
  if (joins.needsMunic) {
    countJoins.push('LEFT JOIN munic mun ON est.municipio = mun.codigo');
  }

  const countSql = `
SELECT COUNT(*) as total
FROM estabelecimento est
${countJoins.join('\n')}
${whereClause};
`;

  console.log(`🔧 [QUERY] JOINs: empresa=${joins.needsEmpresa}, simples=${joins.needsSimples}, munic=${joins.needsMunic}, cnae=${joins.needsCnae}`);

  return { sql, params, countSql };
}

/**
 * Handler principal de busca/prospecção
 */
export async function handleSearch(
  db: ReturnType<typeof import('https://deno.land/x/postgresjs@v3.4.4/mod.js').default>,
  request: SearchRequest
): Promise<SearchResponse> {
  const limit = Math.min(request.limit || DEFAULT_LIMIT, MAX_LIMIT);
  const offset = request.offset || 0;
  const orderBy = request.order_by || 'data_abertura';
  const orderDir = request.order_dir || 'desc';

  const { sql, params, countSql } = buildSearchQuery(
    request.filters,
    limit,
    offset,
    orderBy,
    orderDir
  );

  console.log(`🔍 [SEARCH] Query: ${params.length} params, limit: ${limit}, offset: ${offset}`);

  // Parâmetros para a query de contagem (sem LIMIT e OFFSET)
  // Os últimos 2 parâmetros são LIMIT e OFFSET, que não existem no countSql
  const countParams = params.slice(0, -2);

  // Executar queries em paralelo
  const [dataResult, countResult] = await Promise.all([
    db.unsafe(sql, params),
    db.unsafe(countSql, countParams)
  ]);

  const total = parseInt(countResult[0]?.total || '0', 10);
  const page = Math.floor(offset / limit) + 1;
  const totalPages = Math.ceil(total / limit);

  // Normalizar resultados
  const data: SearchResultItem[] = dataResult.map((row: Record<string, unknown>) => ({
    cnpj: row.cnpj as string,
    razao_social: (row.razao_social as string)?.trim() || null,
    nome_fantasia: (row.nome_fantasia as string)?.trim() || null,
    email: (row.email as string)?.toLowerCase().trim() || null,
    telefone: formatPhoneClean(
      (row.telefone as string)?.substring(0, 2) || null,
      (row.telefone as string)?.substring(2) || null
    ),
    uf: (row.uf as string)?.trim() || null,
    municipio: (row.municipio as string)?.trim() || null,
    cnae: (row.cnae as string) || null,
    cnae_descricao: (row.cnae_descricao as string)?.trim() || null,
    porte: decodePorteEmpresa(row.porte as string),
    capital_social: formatCapitalSocial(row.capital_social as string),
    situacao: decodeSituacaoCadastral(row.situacao as string),
    data_abertura: formatDate(row.data_abertura as string),
    tipo: row.tipo === '1' ? 'MATRIZ' : row.tipo === '2' ? 'FILIAL' : null,
    simples: row.simples === 'S' ? true : row.simples === 'N' ? false : null,
    mei: row.mei === 'S' ? true : row.mei === 'N' ? false : null
  }));

  return {
    success: true,
    total,
    returned: data.length,
    page,
    total_pages: totalPages,
    filters_applied: request.filters,
    data
  };
}

/**
 * Handler de estatísticas/preview
 * OTIMIZADO: Usa JOINs condicionais para melhor performance
 */
export async function handleStats(
  db: ReturnType<typeof import('https://deno.land/x/postgresjs@v3.4.4/mod.js').default>,
  filters: SearchFilters
): Promise<StatsResponse> {
  console.log('📊 [STATS] Received filters:', JSON.stringify(filters, null, 2));

  // Determinar quais JOINs são necessários para os filtros
  const joins = determineRequiredJoins(filters, 'data_abertura');

  // Construir condições WHERE
  const conditions: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  // Processar localização textual (igual ao buildSearchQuery)
  if (filters.localizacao) {
    const { uf: parsedUf, municipio_nome: parsedMunicipio } = parseLocalizacao(filters.localizacao);

    if (parsedUf) {
      conditions.push(`est.uf = $${paramIndex++}`);
      params.push(parsedUf);
    }

    if (parsedMunicipio) {
      conditions.push(`mun.descricao ILIKE $${paramIndex++}`);
      params.push(`%${parsedMunicipio}%`);
    }
  }

  // Aplicar mesma lógica de filtros do buildSearchQuery (simplificado)
  if (filters.uf?.length) {
    const placeholders = filters.uf.map(() => `$${paramIndex++}`).join(', ');
    conditions.push(`est.uf IN (${placeholders})`);
    params.push(...filters.uf);
  }

  if (filters.situacao?.length) {
    const placeholders = filters.situacao.map(() => `$${paramIndex++}`).join(', ');
    conditions.push(`est.situacao_cadastral IN (${placeholders})`);
    params.push(...filters.situacao);
  }

  if (filters.cnae?.length) {
    const placeholders = filters.cnae.map(() => `$${paramIndex++}`).join(', ');
    conditions.push(`est.cnae_fiscal_principal IN (${placeholders})`);
    params.push(...filters.cnae);
  }

  if (filters.cnae_divisao?.length) {
    const divisaoConditions = filters.cnae_divisao.map(() => `est.cnae_fiscal_principal LIKE $${paramIndex++}`);
    conditions.push(`(${divisaoConditions.join(' OR ')})`);
    params.push(...filters.cnae_divisao.map(d => `${d}%`));
  }

  if (filters.municipio?.length) {
    const placeholders = filters.municipio.map(() => `$${paramIndex++}`).join(', ');
    conditions.push(`est.municipio IN (${placeholders})`);
    params.push(...filters.municipio);
  }

  if (filters.ddd?.length) {
    const placeholders = filters.ddd.map(() => `$${paramIndex++}`).join(', ');
    conditions.push(`est.ddd_1 IN (${placeholders})`);
    params.push(...filters.ddd);
  }

  if (filters.porte?.length) {
    const placeholders = filters.porte.map(() => `$${paramIndex++}`).join(', ');
    conditions.push(`emp.porte_empresa IN (${placeholders})`);
    params.push(...filters.porte);
  }

  if (filters.capital_social_min !== undefined) {
    conditions.push(`emp.capital_social >= $${paramIndex++}`);
    params.push(filters.capital_social_min);
  }

  if (filters.capital_social_max !== undefined) {
    conditions.push(`emp.capital_social <= $${paramIndex++}`);
    params.push(filters.capital_social_max);
  }

  if (filters.tipo?.length) {
    const placeholders = filters.tipo.map(() => `$${paramIndex++}`).join(', ');
    conditions.push(`est.identificador_matriz_filial IN (${placeholders})`);
    params.push(...filters.tipo);
  }

  if (filters.simples !== undefined && joins.needsSimples) {
    conditions.push(`sim.opcao_pelo_simples = $${paramIndex++}`);
    params.push(filters.simples ? 'S' : 'N');
  }

  if (filters.mei !== undefined && joins.needsSimples) {
    conditions.push(`sim.opcao_mei = $${paramIndex++}`);
    params.push(filters.mei ? 'S' : 'N');
  }

  if (filters.com_email === true) {
    conditions.push(`est.correio_eletronico IS NOT NULL AND est.correio_eletronico != '' AND est.correio_eletronico LIKE '%@%'`);
  }

  if (filters.com_telefone === true) {
    conditions.push(`est.telefone_1 IS NOT NULL AND est.telefone_1 != ''`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // Construir JOINs condicionais (apenas os necessários para o WHERE)
  const joinClauses: string[] = [];
  if (joins.needsEmpresa) {
    joinClauses.push('LEFT JOIN empresa emp ON est.cnpj_basico = emp.cnpj_basico');
  }
  if (joins.needsSimples) {
    joinClauses.push('LEFT JOIN simples sim ON est.cnpj_basico = sim.cnpj_basico');
  }
  if (joins.needsMunic) {
    joinClauses.push('LEFT JOIN munic mun ON est.municipio = mun.codigo');
  }

  // Query de estatísticas otimizada
  const statsSql = `
SELECT
  COUNT(*) as total,
  COUNT(CASE WHEN est.correio_eletronico IS NOT NULL AND est.correio_eletronico LIKE '%@%' THEN 1 END) as com_email,
  COUNT(CASE WHEN est.telefone_1 IS NOT NULL AND est.telefone_1 != '' THEN 1 END) as com_telefone,
  COUNT(CASE WHEN est.correio_eletronico IS NOT NULL AND est.correio_eletronico LIKE '%@%' AND est.telefone_1 IS NOT NULL AND est.telefone_1 != '' THEN 1 END) as com_email_e_telefone
FROM estabelecimento est
${joinClauses.join('\n')}
${whereClause};
`;

  console.log(`📊 [STATS] Query: ${params.length} params, JOINs: empresa=${joins.needsEmpresa}, simples=${joins.needsSimples}, munic=${joins.needsMunic}`);
  console.log('📊 [STATS] SQL:', statsSql);
  console.log('📊 [STATS] Params:', params);

  const result = await db.unsafe(statsSql, params);
  const row = result[0];

  const preview: StatsPreview = {
    total_matches: parseInt(row?.total || '0', 10),
    com_email: parseInt(row?.com_email || '0', 10),
    com_telefone: parseInt(row?.com_telefone || '0', 10),
    com_email_e_telefone: parseInt(row?.com_email_e_telefone || '0', 10)
  };

  return {
    success: true,
    preview
  };
}

/**
 * Valida os filtros da requisição
 */
export function validateSearchRequest(body: unknown): { valid: boolean; error?: string; request?: SearchRequest } {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Request body is required' };
  }

  const req = body as Record<string, unknown>;

  if (!req.filters || typeof req.filters !== 'object') {
    return { valid: false, error: 'filters object is required' };
  }

  const filters = req.filters as SearchFilters;

  // Validar limite (previne SQL Injection - garante que é número inteiro positivo)
  let limit = DEFAULT_LIMIT;
  if (req.limit !== undefined) {
    if (typeof req.limit !== 'number' || !Number.isInteger(req.limit) || req.limit < 1) {
      return { valid: false, error: 'limit must be a positive integer' };
    }
    limit = req.limit;
  }
  if (limit > MAX_LIMIT) {
    return { valid: false, error: `limit cannot exceed ${MAX_LIMIT}` };
  }

  // Validar offset (previne SQL Injection - garante que é número inteiro não-negativo)
  let offset = 0;
  if (req.offset !== undefined) {
    if (typeof req.offset !== 'number' || !Number.isInteger(req.offset) || req.offset < 0) {
      return { valid: false, error: 'offset must be a non-negative integer' };
    }
    offset = req.offset;
  }

  // Validar order_dir
  const orderDir = req.order_dir === 'asc' ? 'asc' : 'desc';

  // Validar order_by
  const orderBy = typeof req.order_by === 'string' && VALID_ORDER_FIELDS[req.order_by]
    ? req.order_by
    : 'data_abertura';

  // Pelo menos um filtro deve estar presente (para evitar full table scan)
  const hasAnyFilter = Object.values(filters).some(v => {
    if (Array.isArray(v)) return v.length > 0;
    if (typeof v === 'boolean') return true;
    if (typeof v === 'string') return v.length > 0;
    if (typeof v === 'number') return true;
    return false;
  });

  if (!hasAnyFilter) {
    return { valid: false, error: 'At least one filter is required' };
  }

  // Validação avançada de filtros
  const advancedValidation = validateAdvancedFilters(filters);
  
  // Se houver erros na validação avançada, retornar o primeiro erro
  if (!advancedValidation.valid && advancedValidation.errors.length > 0) {
    return { valid: false, error: advancedValidation.errors[0] };
  }
  
  // Se houver correções, usar os filtros corrigidos
  const finalFilters = advancedValidation.correctedFilters || filters;
  
  // Logar avisos e sugestões, se houver
  if (advancedValidation.warnings.length > 0) {
    console.log('⚠️ [VALIDACAO] Avisos na validação avançada:', advancedValidation.warnings);
  }
  
  if (advancedValidation.suggestions.length > 0) {
    console.log('💡 [VALIDACAO] Sugestões de melhoria:', advancedValidation.suggestions);
  }
  
  // Se houve correções, logar isso
  if (advancedValidation.correctedFilters) {
    console.log('🔧 [VALIDACAO] Filtros corrigidos automaticamente:', JSON.stringify(advancedValidation.correctedFilters, null, 2));
  }

  return {
    valid: true,
    request: {
      filters: finalFilters,
      limit,
      offset,
      order_by: orderBy,
      order_dir: orderDir
    }
  };
}
