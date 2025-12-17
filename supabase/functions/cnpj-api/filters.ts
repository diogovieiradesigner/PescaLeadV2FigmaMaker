// =============================================================================
// FILTERS: cnpj-api - Definições de Filtros Disponíveis
// =============================================================================

import type { FiltersResponse, FilterDefinition } from './types.ts';

// Estados brasileiros
const UF_OPTIONS = [
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
  { value: 'TO', label: 'Tocantins' }
];

// Porte da empresa
const PORTE_OPTIONS = [
  { value: '00', label: 'Não Informado' },
  { value: '01', label: 'Micro Empresa' },
  { value: '03', label: 'Empresa de Pequeno Porte' },
  { value: '05', label: 'Demais' }
];

// Situação cadastral
const SITUACAO_OPTIONS = [
  { value: '01', label: 'Nula' },
  { value: '02', label: 'Ativa' },
  { value: '03', label: 'Suspensa' },
  { value: '04', label: 'Inapta' },
  { value: '08', label: 'Baixada' }
];

// Tipo (Matriz/Filial)
const TIPO_OPTIONS = [
  { value: '1', label: 'Matriz' },
  { value: '2', label: 'Filial' }
];

// Divisões CNAE principais (2 dígitos)
const CNAE_DIVISAO_OPTIONS = [
  // Indústria
  { value: '10', label: 'Alimentos' },
  { value: '11', label: 'Bebidas' },
  { value: '13', label: 'Têxteis' },
  { value: '14', label: 'Confecção e vestuário' },
  { value: '15', label: 'Couro e calçados' },
  { value: '16', label: 'Madeira' },
  { value: '17', label: 'Celulose e papel' },
  { value: '18', label: 'Impressão e reprodução' },
  { value: '20', label: 'Produtos químicos' },
  { value: '21', label: 'Farmoquímicos' },
  { value: '22', label: 'Borracha e plástico' },
  { value: '23', label: 'Minerais não-metálicos' },
  { value: '24', label: 'Metalurgia' },
  { value: '25', label: 'Produtos de metal' },
  { value: '26', label: 'Informática e eletrônicos' },
  { value: '27', label: 'Máquinas elétricas' },
  { value: '28', label: 'Máquinas e equipamentos' },
  { value: '29', label: 'Veículos automotores' },
  { value: '30', label: 'Outros equipamentos de transporte' },
  { value: '31', label: 'Móveis' },
  { value: '32', label: 'Produtos diversos' },
  { value: '33', label: 'Manutenção de máquinas' },

  // Utilities
  { value: '35', label: 'Eletricidade e gás' },
  { value: '36', label: 'Captação de água' },
  { value: '37', label: 'Esgoto' },
  { value: '38', label: 'Coleta de resíduos' },
  { value: '39', label: 'Descontaminação' },

  // Construção
  { value: '41', label: 'Construção de edifícios' },
  { value: '42', label: 'Obras de infraestrutura' },
  { value: '43', label: 'Serviços de construção' },

  // Comércio
  { value: '45', label: 'Comércio de veículos' },
  { value: '46', label: 'Comércio atacadista' },
  { value: '47', label: 'Comércio varejista' },

  // Transporte
  { value: '49', label: 'Transporte terrestre' },
  { value: '50', label: 'Transporte aquaviário' },
  { value: '51', label: 'Transporte aéreo' },
  { value: '52', label: 'Armazenamento e auxiliar' },
  { value: '53', label: 'Correio e outras entregas' },

  // Hospedagem e alimentação
  { value: '55', label: 'Alojamento' },
  { value: '56', label: 'Alimentação' },

  // Informação e comunicação
  { value: '58', label: 'Edição e edição integrada' },
  { value: '59', label: 'Audiovisual' },
  { value: '60', label: 'Rádio e televisão' },
  { value: '61', label: 'Telecomunicações' },
  { value: '62', label: 'Tecnologia da informação' },
  { value: '63', label: 'Prestação de serviços de informação' },

  // Financeiro
  { value: '64', label: 'Serviços financeiros' },
  { value: '65', label: 'Seguros e previdência' },
  { value: '66', label: 'Auxiliares financeiros' },

  // Imobiliário
  { value: '68', label: 'Atividades imobiliárias' },

  // Profissionais e científicos
  { value: '69', label: 'Jurídicas e contabilidade' },
  { value: '70', label: 'Sedes de empresas e consultoria' },
  { value: '71', label: 'Arquitetura e engenharia' },
  { value: '72', label: 'Pesquisa e desenvolvimento' },
  { value: '73', label: 'Publicidade e pesquisa de mercado' },
  { value: '74', label: 'Outras atividades profissionais' },
  { value: '75', label: 'Veterinária' },

  // Administrativos
  { value: '77', label: 'Aluguel de máquinas e objetos' },
  { value: '78', label: 'Seleção e agenciamento de mão-de-obra' },
  { value: '79', label: 'Agências de viagem' },
  { value: '80', label: 'Vigilância e segurança' },
  { value: '81', label: 'Serviços para edifícios e paisagismo' },
  { value: '82', label: 'Serviços de escritório e apoio' },

  // Público
  { value: '84', label: 'Administração pública' },

  // Educação
  { value: '85', label: 'Educação' },

  // Saúde
  { value: '86', label: 'Saúde humana' },
  { value: '87', label: 'Assistência social com alojamento' },
  { value: '88', label: 'Assistência social sem alojamento' },

  // Cultura e esporte
  { value: '90', label: 'Artes e cultura' },
  { value: '91', label: 'Bibliotecas, museus' },
  { value: '92', label: 'Jogos de azar' },
  { value: '93', label: 'Esporte e recreação' },

  // Outros serviços
  { value: '94', label: 'Organizações associativas' },
  { value: '95', label: 'Reparação de equipamentos' },
  { value: '96', label: 'Serviços pessoais' },
  { value: '97', label: 'Serviços domésticos' },

  // Extraterritorial
  { value: '99', label: 'Organismos internacionais' }
];

// Natureza jurídica mais comuns
const NATUREZA_JURIDICA_OPTIONS = [
  { value: '2011', label: 'Empresa Pública' },
  { value: '2038', label: 'Sociedade de Economia Mista' },
  { value: '2046', label: 'Sociedade Anônima Aberta' },
  { value: '2054', label: 'Sociedade Anônima Fechada' },
  { value: '2062', label: 'Sociedade Empresária Limitada' },
  { value: '2070', label: 'Sociedade Empresária em Nome Coletivo' },
  { value: '2089', label: 'Sociedade Empresária em Comandita Simples' },
  { value: '2097', label: 'Sociedade Empresária em Comandita por Ações' },
  { value: '2127', label: 'Sociedade Simples Pura' },
  { value: '2135', label: 'Sociedade Simples Limitada' },
  { value: '2143', label: 'Sociedade Simples em Nome Coletivo' },
  { value: '2151', label: 'Sociedade Simples em Comandita Simples' },
  { value: '2160', label: 'Empresa Individual de Responsabilidade Limitada (EIRELI)' },
  { value: '2305', label: 'Empresa Individual Imobiliária' },
  { value: '2313', label: 'Empresário (Individual)' },
  { value: '3034', label: 'Serviço Notarial e Registral (Cartório)' },
  { value: '3069', label: 'Fundação Privada' },
  { value: '3077', label: 'Serviço Social Autônomo' },
  { value: '3085', label: 'Condomínio Edilício' },
  { value: '3115', label: 'Organização Religiosa' },
  { value: '3220', label: 'Organização da Sociedade Civil' },
  { value: '3999', label: 'Associação Privada' },
  { value: '4014', label: 'Empresa Domiciliada no Exterior' },
  { value: '4120', label: 'Cooperativa' },
  { value: '2232', label: 'Microempreendedor Individual (MEI)' }
];

// DDDs principais
const DDD_OPTIONS = [
  // SP
  { value: '11', label: 'São Paulo (Capital e região)' },
  { value: '12', label: 'São José dos Campos' },
  { value: '13', label: 'Santos' },
  { value: '14', label: 'Bauru' },
  { value: '15', label: 'Sorocaba' },
  { value: '16', label: 'Ribeirão Preto' },
  { value: '17', label: 'São José do Rio Preto' },
  { value: '18', label: 'Presidente Prudente' },
  { value: '19', label: 'Campinas' },
  // RJ
  { value: '21', label: 'Rio de Janeiro' },
  { value: '22', label: 'Campos dos Goytacazes' },
  { value: '24', label: 'Volta Redonda' },
  // ES
  { value: '27', label: 'Vitória' },
  { value: '28', label: 'Cachoeiro de Itapemirim' },
  // MG
  { value: '31', label: 'Belo Horizonte' },
  { value: '32', label: 'Juiz de Fora' },
  { value: '33', label: 'Governador Valadares' },
  { value: '34', label: 'Uberlândia' },
  { value: '35', label: 'Poços de Caldas' },
  { value: '37', label: 'Divinópolis' },
  { value: '38', label: 'Montes Claros' },
  // PR
  { value: '41', label: 'Curitiba' },
  { value: '42', label: 'Ponta Grossa' },
  { value: '43', label: 'Londrina' },
  { value: '44', label: 'Maringá' },
  { value: '45', label: 'Foz do Iguaçu' },
  { value: '46', label: 'Francisco Beltrão' },
  // SC
  { value: '47', label: 'Joinville' },
  { value: '48', label: 'Florianópolis' },
  { value: '49', label: 'Chapecó' },
  // RS
  { value: '51', label: 'Porto Alegre' },
  { value: '53', label: 'Pelotas' },
  { value: '54', label: 'Caxias do Sul' },
  { value: '55', label: 'Santa Maria' },
  // DF e GO
  { value: '61', label: 'Brasília' },
  { value: '62', label: 'Goiânia' },
  { value: '64', label: 'Rio Verde' },
  // MT e MS
  { value: '65', label: 'Cuiabá' },
  { value: '66', label: 'Rondonópolis' },
  { value: '67', label: 'Campo Grande' },
  // AC, RO, AM
  { value: '68', label: 'Rio Branco' },
  { value: '69', label: 'Porto Velho' },
  { value: '92', label: 'Manaus' },
  { value: '97', label: 'Manaus (interior)' },
  // RR, AP, PA
  { value: '95', label: 'Boa Vista' },
  { value: '96', label: 'Macapá' },
  { value: '91', label: 'Belém' },
  { value: '93', label: 'Santarém' },
  { value: '94', label: 'Marabá' },
  // TO
  { value: '63', label: 'Palmas' },
  // MA
  { value: '98', label: 'São Luís' },
  { value: '99', label: 'Imperatriz' },
  // PI
  { value: '86', label: 'Teresina' },
  { value: '89', label: 'Picos' },
  // CE
  { value: '85', label: 'Fortaleza' },
  { value: '88', label: 'Juazeiro do Norte' },
  // RN
  { value: '84', label: 'Natal' },
  // PB
  { value: '83', label: 'João Pessoa' },
  // PE
  { value: '81', label: 'Recife' },
  { value: '87', label: 'Petrolina' },
  // AL
  { value: '82', label: 'Maceió' },
  // SE
  { value: '79', label: 'Aracaju' },
  // BA
  { value: '71', label: 'Salvador' },
  { value: '73', label: 'Ilhéus' },
  { value: '74', label: 'Juazeiro' },
  { value: '75', label: 'Feira de Santana' },
  { value: '77', label: 'Barreiras' }
];

/**
 * Retorna as definições de todos os filtros disponíveis
 * NOTA: Filtros devem estar sincronizados com search.ts (buildSearchQuery)
 */
export function getFiltersDefinition(): FiltersResponse {
  const filters: Record<string, FilterDefinition> = {
    // =========================================================================
    // FILTROS DE TEXTO
    // =========================================================================
    termo: {
      type: 'text'
      // Busca em nome_fantasia OU razao_social (ILIKE)
    },

    // =========================================================================
    // FILTROS DE LOCALIZAÇÃO
    // =========================================================================
    uf: {
      type: 'select_multiple',
      options: UF_OPTIONS
    },
    municipio: {
      type: 'select_multiple',
      options: []
      // Carregado dinamicamente - use código IBGE (ex: "3550308" = São Paulo)
      // Frontend deve buscar lista de municípios filtrada por UF selecionado
    },
    cep_prefixo: {
      type: 'text'
      // Prefixo do CEP (2-5 dígitos) para filtrar por região
      // Ex: "01" = Centro de SP, "040" = Região Sul de SP
    },
    ddd: {
      type: 'select_multiple',
      options: DDD_OPTIONS
    },

    // =========================================================================
    // FILTROS DE ATIVIDADE ECONÔMICA
    // =========================================================================
    cnae_divisao: {
      type: 'select_multiple',
      options: CNAE_DIVISAO_OPTIONS
      // Divisão CNAE (2 primeiros dígitos) - filtra por setor
    },
    cnae: {
      type: 'select_multiple',
      options: []
      // CNAE específico (7 dígitos) - carregado dinamicamente
      // Frontend deve buscar lista de CNAEs filtrada por divisão selecionada
    },
    porte: {
      type: 'select_multiple',
      options: PORTE_OPTIONS
    },
    situacao: {
      type: 'select_multiple',
      options: SITUACAO_OPTIONS
    },
    tipo: {
      type: 'select_multiple',
      options: TIPO_OPTIONS
    },
    natureza_juridica: {
      type: 'select_multiple',
      options: NATUREZA_JURIDICA_OPTIONS
    },
    capital_social: {
      type: 'range',
      min: 0,
      max: 999999999999,
      presets: [
        { label: 'Até R$ 10 mil', min: 0, max: 10000 },
        { label: 'R$ 10 mil - R$ 50 mil', min: 10000, max: 50000 },
        { label: 'R$ 50 mil - R$ 100 mil', min: 50000, max: 100000 },
        { label: 'R$ 100 mil - R$ 500 mil', min: 100000, max: 500000 },
        { label: 'R$ 500 mil - R$ 1 milhão', min: 500000, max: 1000000 },
        { label: 'Acima de R$ 1 milhão', min: 1000000, max: null }
      ]
    },
    simples: {
      type: 'boolean'
    },
    mei: {
      type: 'boolean'
    },
    com_email: {
      type: 'boolean'
    },
    com_telefone: {
      type: 'boolean'
    },
    data_abertura: {
      type: 'range',
      presets: [
        { label: 'Último mês', min: null, max: null },
        { label: 'Últimos 3 meses', min: null, max: null },
        { label: 'Últimos 6 meses', min: null, max: null },
        { label: 'Último ano', min: null, max: null },
        { label: 'Últimos 2 anos', min: null, max: null },
        { label: 'Últimos 5 anos', min: null, max: null }
      ]
    },
    idade_empresa: {
      type: 'range',
      presets: [
        { label: 'Empresas novas (até 30 dias)', min: 0, max: 30 },
        { label: 'Até 3 meses', min: 0, max: 90 },
        { label: 'Até 6 meses', min: 0, max: 180 },
        { label: 'Até 1 ano', min: 0, max: 365 },
        { label: 'Até 2 anos', min: 0, max: 730 },
        { label: 'Mais de 5 anos', min: 1825, max: null }
      ]
    }
  };

  return {
    success: true,
    filters
  };
}

/**
 * Handler para o endpoint GET /filters
 */
export function handleFilters(): FiltersResponse {
  return getFiltersDefinition();
}
