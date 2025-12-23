// =============================================================================
// TYPES: CNPJ Extraction
// =============================================================================

// Filtros disponíveis para busca CNPJ
export interface CNPJFilters {
  // Localização (texto livre - como no Google Maps)
  localizacao?: string;
  // Localização específica (alternativa)
  uf?: string[];
  municipio?: string[];
  ddd?: string[];
  cep_prefixo?: string;

  // Atividade Econômica
  cnae?: string[];
  cnae_divisao?: string[];

  // Porte e Financeiro
  porte?: string[];
  capital_social_min?: number;
  capital_social_max?: number;

  // Situação e Tipo
  situacao?: string[];
  tipo?: string[];
  natureza_juridica?: string[];

  // Regime Tributário (novo campo mutuamente exclusivo)
  regime_tributario?: 'todos' | 'simples' | 'mei';
  
  // Regime Tributário (campos mantidos para compatibilidade)
  simples?: boolean;
  mei?: boolean;

  // Contato
  com_email?: boolean;
  com_telefone?: boolean;

  // Data
  data_abertura_min?: string;
  data_abertura_max?: string;
  idade_max_dias?: number;
  idade_min_dias?: number;

  // Busca por texto
  termo?: string;
}

// Configuração de extração CNPJ
export interface CNPJExtractionConfig {
  id: string;
  workspace_id: string;
  extraction_name: string;
  source: 'cnpj';
  filters: CNPJFilters;
  target_quantity: number;
  funnel_id: string;
  column_id: string;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

// Run de extração CNPJ
export interface CNPJExtractionRun {
  id: string;
  extraction_id: string;
  workspace_id: string;
  source: 'cnpj';
  status: 'pending' | 'running' | 'completed' | 'partial' | 'failed' | 'cancelled';
  target_quantity: number;
  found_quantity: number;
  created_quantity: number;
  started_at: string;
  finished_at?: string;
  error_message?: string;
  progress_data?: {
    filters_applied?: CNPJFilters;
    funnel_id?: string;
    column_id?: string;
    staging_count?: number;
    api_total?: number;
  };
}

// Lead em staging (antes de migrar para leads)
export interface CNPJStagingLead {
  id: string;
  run_id: string;
  workspace_id: string;
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
  raw_data: any;
  status: 'pending' | 'migrated' | 'failed';
  error_message?: string;
  migrated_at?: string;
  funnel_id: string;
  column_id: string;
  lead_id?: string;
  created_at: string;
}

// Opções de filtro (retornado por /filters)
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

// Preview de estatísticas
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

// Request para iniciar extração
export interface StartCNPJExtractionRequest {
  extraction_id?: string;
  workspace_id: string;
  extraction_name: string;
  filters: CNPJFilters;
  target_quantity: number;
  funnel_id: string;
  column_id: string;
}

// Response da extração
export interface StartCNPJExtractionResponse {
  success: boolean;
  run_id: string;
  extraction_id: string;
  found_quantity: number;
  total_available: number;
  message: string;
  response_time_ms: number;
}

// Mapeamento de códigos para labels
export const PORTE_LABELS: Record<string, string> = {
  '00': 'Não informado',
  '01': 'Micro Empresa',
  '03': 'Empresa de Pequeno Porte',
  '05': 'Demais',
};

export const SITUACAO_LABELS: Record<string, string> = {
  '01': 'Nula',
  '02': 'Ativa',
  '03': 'Suspensa',
  '04': 'Inapta',
  '08': 'Baixada',
};

export const TIPO_LABELS: Record<string, string> = {
  '1': 'Matriz',
  '2': 'Filial',
};

// Estados brasileiros
export const UF_OPTIONS: FilterOption[] = [
  { value: 'AC', label: 'Acre' },
  { value: 'AL', label: 'Alagoas' },
  { value: 'AP', label: 'Amapá' },
  { value: 'AM', label: 'Amazonas' },
  { value: 'BA', label: 'Bahia' },
  { value: 'CE', label: 'Ceará' },
  { value: 'DF', label: 'Distrito Federal' },
  { value: 'ES', label: 'Espírito Santo' },
  { value: 'GO', label: 'Goiás' },
  { value: 'MA', label: 'Maranhão' },
  { value: 'MT', label: 'Mato Grosso' },
  { value: 'MS', label: 'Mato Grosso do Sul' },
  { value: 'MG', label: 'Minas Gerais' },
  { value: 'PA', label: 'Pará' },
  { value: 'PB', label: 'Paraíba' },
  { value: 'PR', label: 'Paraná' },
  { value: 'PE', label: 'Pernambuco' },
  { value: 'PI', label: 'Piauí' },
  { value: 'RJ', label: 'Rio de Janeiro' },
  { value: 'RN', label: 'Rio Grande do Norte' },
  { value: 'RS', label: 'Rio Grande do Sul' },
  { value: 'RO', label: 'Rondônia' },
  { value: 'RR', label: 'Roraima' },
  { value: 'SC', label: 'Santa Catarina' },
  { value: 'SP', label: 'São Paulo' },
  { value: 'SE', label: 'Sergipe' },
  { value: 'TO', label: 'Tocantins' },
];

// Opções de porte
export const PORTE_OPTIONS: FilterOption[] = [
  { value: '01', label: 'Micro Empresa' },
  { value: '03', label: 'Empresa de Pequeno Porte' },
  { value: '05', label: 'Demais (Médio/Grande)' },
];

// Opções de situação
export const SITUACAO_OPTIONS: FilterOption[] = [
  { value: '02', label: 'Ativa' },
  { value: '03', label: 'Suspensa' },
  { value: '04', label: 'Inapta' },
  { value: '08', label: 'Baixada' },
];

// Opções de tipo
export const TIPO_OPTIONS: FilterOption[] = [
  { value: '1', label: 'Matriz' },
  { value: '2', label: 'Filial' },
];
