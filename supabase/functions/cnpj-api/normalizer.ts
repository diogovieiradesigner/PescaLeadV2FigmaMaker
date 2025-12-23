// =============================================================================
// NORMALIZER: cnpj-api - Formatação e Normalização de Dados
// =============================================================================

import type {
  CNPJData,
  CNPJEndereco,
  CNPJContato,
  CNPJAtividade,
  CNPJSimples,
  CNPJSocio,
  DBRawResult,
  DBSocioResult
} from './types.ts';

// Decodifica o código de situação cadastral para texto legível
export function decodeSituacaoCadastral(codigo: string | null): string | null {
  if (!codigo) return null;

  const situacoes: Record<string, string> = {
    '01': 'Nula',
    '02': 'Ativa',
    '03': 'Suspensa',
    '04': 'Inapta',
    '08': 'Baixada'
  };

  return situacoes[codigo] || `Código ${codigo}`;
}

// Decodifica o código de porte da empresa para texto legível
export function decodePorteEmpresa(codigo: string | null): string | null {
  if (!codigo) return null;

  const portes: Record<string, string> = {
    '00': 'Não Informado',
    '01': 'Micro Empresa',
    '03': 'Empresa de Pequeno Porte',
    '05': 'Demais'
  };

  return portes[codigo] || `Código ${codigo}`;
}

// Decodifica a faixa etária do sócio
export function decodeFaixaEtaria(codigo: string | null): string | null {
  if (!codigo) return null;

  const faixas: Record<string, string> = {
    '0': 'Não se aplica',
    '1': '0-12 anos',
    '2': '13-20 anos',
    '3': '21-30 anos',
    '4': '31-40 anos',
    '5': '41-50 anos',
    '6': '51-60 anos',
    '7': '61-70 anos',
    '8': '71-80 anos',
    '9': 'Maior de 80 anos'
  };

  return faixas[codigo] || null;
}

// Formata telefone para padrão brasileiro
export function formatPhone(ddd: string | null, numero: string | null): string | null {
  if (!ddd || !numero) return null;

  const dddClean = ddd.replace(/\D/g, '');
  const numClean = numero.replace(/\D/g, '');

  if (!dddClean || !numClean) return null;

  // Formata conforme tamanho (8 ou 9 dígitos)
  if (numClean.length === 9) {
    return `(${dddClean}) ${numClean.substring(0, 5)}-${numClean.substring(5)}`;
  } else if (numClean.length === 8) {
    return `(${dddClean}) ${numClean.substring(0, 4)}-${numClean.substring(4)}`;
  }

  return `(${dddClean}) ${numClean}`;
}

// Formata telefone para número limpo (DDD + número)
export function formatPhoneClean(ddd: string | null, numero: string | null): string | null {
  if (!ddd || !numero) return null;

  const dddClean = ddd.replace(/\D/g, '');
  const numClean = numero.replace(/\D/g, '');

  if (!dddClean || !numClean) return null;

  return `${dddClean}${numClean}`;
}

// Formata data do formato YYYYMMDD para YYYY-MM-DD
export function formatDate(date: string | Date | null | undefined): string | null {
  if (!date) return null;

  // Se for objeto Date, converte para ISO string
  if (date instanceof Date) {
    return date.toISOString().split('T')[0];
  }

  // Converte para string se necessário
  const dateStr = String(date);

  // Se já está no formato correto, retorna
  if (dateStr.includes('-')) return dateStr.split('T')[0];

  // Converte YYYYMMDD para YYYY-MM-DD
  if (dateStr.length === 8 && /^\d{8}$/.test(dateStr)) {
    return `${dateStr.substring(0, 4)}-${dateStr.substring(4, 6)}-${dateStr.substring(6, 8)}`;
  }

  return dateStr;
}

// Formata capital social
export function formatCapitalSocial(value: string | number | null): number | null {
  if (value === null || value === undefined) return null;

  if (typeof value === 'number') return value;

  // O banco retorna numeric como string (ex: "900.00")
  // Se contiver ponto e vírgula, é formato brasileiro (1.500,00)
  if (value.includes('.') && value.includes(',')) {
    const clean = value.replace(/\./g, '').replace(',', '.');
    return parseFloat(clean);
  }
  
  // Se contiver apenas vírgula, troca por ponto
  if (value.includes(',') && !value.includes('.')) {
    return parseFloat(value.replace(',', '.'));
  }

  // Caso padrão (incluindo "900.00" do Postgres)
  const num = parseFloat(value);
  return isNaN(num) ? null : num;
}

// Normaliza os dados brutos do banco para o formato da API
export function normalizeDBResult(raw: DBRawResult, socios?: DBSocioResult[]): CNPJData {
  const cnpjCompleto = `${raw.cnpj_basico}${raw.cnpj_ordem}${raw.cnpj_dv}`;

  const endereco: CNPJEndereco = {
    tipo_logradouro: raw.tipo_logradouro?.trim() || null,
    logradouro: raw.logradouro?.trim() || null,
    numero: raw.numero?.trim() || null,
    complemento: raw.complemento?.trim() || null,
    bairro: raw.bairro?.trim() || null,
    municipio: raw.municipio_nome?.trim() || null,
    municipio_codigo: raw.municipio_codigo || null,
    uf: raw.uf?.trim() || null,
    cep: raw.cep?.replace(/\D/g, '') || null
  };

  const contato: CNPJContato = {
    email: raw.correio_eletronico?.toLowerCase().trim() || null,
    telefone_1: formatPhoneClean(raw.ddd_1, raw.telefone_1),
    telefone_1_formatted: formatPhone(raw.ddd_1, raw.telefone_1),
    telefone_2: formatPhoneClean(raw.ddd_2, raw.telefone_2),
    telefone_2_formatted: formatPhone(raw.ddd_2, raw.telefone_2),
    fax: formatPhoneClean(raw.ddd_fax, raw.fax)
  };

  const atividade: CNPJAtividade = {
    cnae_principal: raw.cnae_fiscal_principal || null,
    cnae_descricao: raw.cnae_descricao?.trim() || null
  };

  const simples: CNPJSimples = {
    opcao_simples: raw.opcao_pelo_simples === 'S',
    data_opcao_simples: formatDate(raw.data_opcao_simples),
    data_exclusao_simples: formatDate(raw.data_exclusao_simples),
    opcao_mei: raw.opcao_mei === 'S',
    data_opcao_mei: formatDate(raw.data_opcao_mei),
    data_exclusao_mei: formatDate(raw.data_exclusao_mei)
  };

  const normalizedSocios: CNPJSocio[] | undefined = socios?.map(s => ({
    nome: s.nome_socio_razao_social?.trim() || null,
    cpf_cnpj: s.cpf_cnpj_socio || null,
    qualificacao: s.qualificacao_descricao?.trim() || null,
    qualificacao_codigo: s.qualificacao_socio || null,
    data_entrada: formatDate(s.data_entrada_sociedade),
    faixa_etaria: decodeFaixaEtaria(s.faixa_etaria),
    pais: s.pais || null,
    representante_legal: s.representante_legal || null,
    nome_representante: s.nome_do_representante?.trim() || null
  }));

  return {
    cnpj: cnpjCompleto,
    cnpj_basico: raw.cnpj_basico,
    cnpj_ordem: raw.cnpj_ordem,
    cnpj_dv: raw.cnpj_dv,
    razao_social: raw.razao_social?.trim() || null,
    nome_fantasia: raw.nome_fantasia?.trim() || null,
    porte: decodePorteEmpresa(raw.porte_empresa),
    porte_codigo: raw.porte_empresa || null,
    natureza_juridica: raw.natureza_juridica_descricao?.trim() || null,
    natureza_juridica_codigo: raw.natureza_juridica || null,
    situacao_cadastral: decodeSituacaoCadastral(raw.situacao_cadastral),
    situacao_cadastral_codigo: raw.situacao_cadastral || null,
    data_situacao_cadastral: formatDate(raw.data_situacao_cadastral),
    data_inicio_atividade: formatDate(raw.data_inicio_atividade),
    tipo: raw.identificador_matriz_filial === '1' ? 'MATRIZ' : raw.identificador_matriz_filial === '2' ? 'FILIAL' : null,
    capital_social: formatCapitalSocial(raw.capital_social),
    endereco,
    contato,
    atividade,
    simples,
    socios: normalizedSocios
  };
}

// Valida e normaliza um CNPJ (remove formatação)
export function normalizeCNPJ(cnpj: string): string {
  return cnpj.replace(/[^\d]/g, '');
}

// Valida se um CNPJ é válido (apenas formato, não dígitos verificadores)
export function isValidCNPJ(cnpj: string): boolean {
  const cleaned = normalizeCNPJ(cnpj);

  // Deve ter 14 dígitos
  if (cleaned.length !== 14) return false;

  // Não pode ser todos zeros ou dígitos repetidos
  if (/^(\d)\1{13}$/.test(cleaned)) return false;

  return true;
}

// Extrai as partes do CNPJ (basico, ordem, dv)
export function parseCNPJ(cnpj: string): { basico: string; ordem: string; dv: string } {
  const cleaned = normalizeCNPJ(cnpj);

  return {
    basico: cleaned.substring(0, 8),
    ordem: cleaned.substring(8, 12),
    dv: cleaned.substring(12, 14)
  };
}
