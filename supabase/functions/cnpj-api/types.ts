// =============================================================================
// TYPES: cnpj-api
// =============================================================================

export interface CNPJResponse {
  success: boolean;
  provider: 'banco_local';
  data?: CNPJData;
  error?: string;
  cached?: boolean;
  response_time_ms?: number;
}

export interface CNPJData {
  cnpj: string;
  cnpj_basico: string;
  cnpj_ordem: string;
  cnpj_dv: string;
  razao_social: string | null;
  nome_fantasia: string | null;
  porte: string | null;
  porte_codigo: string | null;
  natureza_juridica: string | null;
  natureza_juridica_codigo: string | null;
  situacao_cadastral: string | null;
  situacao_cadastral_codigo: string | null;
  data_situacao_cadastral: string | null;
  data_inicio_atividade: string | null;
  tipo: 'MATRIZ' | 'FILIAL' | null;
  capital_social: number | null;
  endereco: CNPJEndereco;
  contato: CNPJContato;
  atividade: CNPJAtividade;
  simples: CNPJSimples;
  socios?: CNPJSocio[];
}

export interface CNPJEndereco {
  tipo_logradouro: string | null;
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  municipio: string | null;
  municipio_codigo: string | null;
  uf: string | null;
  cep: string | null;
}

export interface CNPJContato {
  email: string | null;
  telefone_1: string | null;
  telefone_1_formatted: string | null;
  telefone_2: string | null;
  telefone_2_formatted: string | null;
  fax: string | null;
}

export interface CNPJAtividade {
  cnae_principal: string | null;
  cnae_descricao: string | null;
}

export interface CNPJSimples {
  opcao_simples: boolean;
  data_opcao_simples: string | null;
  data_exclusao_simples: string | null;
  opcao_mei: boolean;
  data_opcao_mei: string | null;
  data_exclusao_mei: string | null;
}

export interface CNPJSocio {
  nome: string | null;
  cpf_cnpj: string | null;
  qualificacao: string | null;
  qualificacao_codigo: string | null;
  data_entrada: string | null;
  faixa_etaria: string | null;
  pais: string | null;
  representante_legal: string | null;
  nome_representante: string | null;
}

export interface DBRawResult {
  // Empresa
  cnpj_basico: string;
  razao_social: string | null;
  natureza_juridica: string | null;
  natureza_juridica_descricao: string | null;
  capital_social: string | null;
  porte_empresa: string | null;

  // Estabelecimento
  cnpj_ordem: string;
  cnpj_dv: string;
  nome_fantasia: string | null;
  situacao_cadastral: string | null;
  data_situacao_cadastral: string | null;
  data_inicio_atividade: string | null;
  cnae_fiscal_principal: string | null;
  cnae_descricao: string | null;
  tipo_logradouro: string | null;
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cep: string | null;
  uf: string | null;
  municipio_codigo: string | null;
  municipio_nome: string | null;
  ddd_1: string | null;
  telefone_1: string | null;
  ddd_2: string | null;
  telefone_2: string | null;
  ddd_fax: string | null;
  fax: string | null;
  correio_eletronico: string | null;
  identificador_matriz_filial: string | null;

  // Simples
  opcao_pelo_simples: string | null;
  data_opcao_simples: string | null;
  data_exclusao_simples: string | null;
  opcao_mei: string | null;
  data_opcao_mei: string | null;
  data_exclusao_mei: string | null;
}

export interface DBSocioResult {
  nome_socio_razao_social: string | null;
  cpf_cnpj_socio: string | null;
  qualificacao_socio: string | null;
  qualificacao_descricao: string | null;
  data_entrada_sociedade: string | null;
  faixa_etaria: string | null;
  pais: string | null;
  representante_legal: string | null;
  nome_do_representante: string | null;
}

// =============================================================================
// TIPOS PARA PROSPECÇÃO
// =============================================================================

export interface SearchFilters {
  // Busca por texto
  termo?: string;                    // Busca em nome_fantasia OU razao_social

  // Localização
  uf?: string[];                     // Estados (array)
  municipio?: string[];              // Códigos IBGE
  cep_prefixo?: string;              // Prefixo CEP (região)
  ddd?: string[];                    // DDDs (array)

  // Atividade Econômica (Nicho)
  cnae_divisao?: string[];           // Divisão CNAE (2 dígitos)
  cnae?: string[];                   // CNAEs específicos (array)

  // Porte e Financeiro
  porte?: string[];                  // 01=Micro, 05=Pequena, 03=Demais
  capital_social_min?: number;       // Capital mínimo em R$
  capital_social_max?: number;       // Capital máximo em R$

  // Situação e Tipo
  situacao?: string[];               // 02=Ativa, 08=Baixada
  tipo?: string[];                   // 1=Matriz, 2=Filial
  natureza_juridica?: string[];      // MEI, Ltda, etc

  // Regime Tributário
  simples?: boolean;                 // Optante do Simples
  mei?: boolean;                     // É MEI

  // Contato
  com_email?: boolean;               // Apenas com email
  com_telefone?: boolean;            // Apenas com telefone

  // Data
  data_abertura_min?: string;        // Empresas abertas após
  data_abertura_max?: string;        // Empresas abertas antes
  idade_max_dias?: number;           // Empresas com menos de X dias
  idade_min_dias?: number;           // Empresas com mais de X dias
}

export interface SearchRequest {
  filters: SearchFilters;
  fields?: string[];                 // Campos a retornar
  order_by?: string;                 // Ordenação
  order_dir?: 'asc' | 'desc';        // Direção
  limit?: number;                    // Máx registros (default 100, max 10000)
  offset?: number;                   // Paginação
}

export interface SearchResultItem {
  cnpj: string;
  razao_social: string | null;
  nome_fantasia: string | null;
  email: string | null;
  telefone: string | null;
  uf: string | null;
  municipio: string | null;
  cnae: string | null;
  cnae_descricao: string | null;
  porte: string | null;
  capital_social: number | null;
  situacao: string | null;
  data_abertura: string | null;
  tipo: string | null;
  simples: boolean | null;
  mei: boolean | null;
}

export interface SearchResponse {
  success: boolean;
  total: number;
  returned: number;
  page: number;
  total_pages: number;
  filters_applied: Partial<SearchFilters>;
  data: SearchResultItem[];
  response_time_ms?: number;
  error?: string;
}

export interface FilterOption {
  value: string;
  label: string;
  count?: number;
}

export interface FilterDefinition {
  type: 'select_multiple' | 'boolean' | 'range' | 'text';
  options?: FilterOption[];
  min?: number;
  max?: number;
  presets?: { label: string; min: number | null; max: number | null }[];
}

export interface FiltersResponse {
  success: boolean;
  filters: Record<string, FilterDefinition>;
  response_time_ms?: number;
}

export interface StatsPreview {
  total_matches: number;
  com_email: number;
  com_telefone: number;
  com_email_e_telefone: number;
  distribuicao_uf?: Record<string, number>;
  distribuicao_porte?: Record<string, number>;
}

export interface StatsResponse {
  success: boolean;
  preview: StatsPreview;
  response_time_ms?: number;
  error?: string;
}
