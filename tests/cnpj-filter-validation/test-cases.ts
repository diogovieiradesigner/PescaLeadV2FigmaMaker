import { CNPJFilters } from '../../src/types/cnpj-extraction';

export interface TestCase {
  id: string;
  name: string;
  description: string;
  filters: CNPJFilters;
  expectedResults: {
    shouldReturnResults: boolean;
    expectedMinResults?: number;
    expectedMaxResults?: number;
    validationChecks: Array<{
      field: string;
      condition: string;
      expectedValue: any;
    }>;
  };
  tags: string[];
}

export const testCases: TestCase[] = [
  // Filtros Básicos
  {
    id: 'basic-01',
    name: 'Filtro por UF e Situação Ativa',
    description: 'Testar filtro por UF específica (SP) e situação ativa',
    filters: {
      uf: ['SP'],
      situacao: ['02'] // Ativa
    },
    expectedResults: {
      shouldReturnResults: true,
      expectedMinResults: 100,
      validationChecks: [
        { field: 'uf', condition: 'equals', expectedValue: 'SP' },
        { field: 'situacao', condition: 'equals', expectedValue: '02' }
      ]
    },
    tags: ['basic', 'uf', 'situacao']
  },
  {
    id: 'basic-02',
    name: 'Filtro por CNAE Específico',
    description: 'Testar filtro por CNAE de restaurantes',
    filters: {
      cnae: ['5611201'], // Restaurantes e similares
      situacao: ['02']
    },
    expectedResults: {
      shouldReturnResults: true,
      expectedMinResults: 50,
      validationChecks: [
        { field: 'cnae', condition: 'equals', expectedValue: '5611201' },
        { field: 'situacao', condition: 'equals', expectedValue: '02' }
      ]
    },
    tags: ['basic', 'cnae', 'situacao']
  },
  {
    id: 'basic-03',
    name: 'Filtro por Múltiplas UFs',
    description: 'Testar filtro por múltiplas UFs (SP e RJ)',
    filters: {
      uf: ['SP', 'RJ'],
      situacao: ['02']
    },
    expectedResults: {
      shouldReturnResults: true,
      expectedMinResults: 200,
      validationChecks: [
        { field: 'uf', condition: 'in', expectedValue: ['SP', 'RJ'] },
        { field: 'situacao', condition: 'equals', expectedValue: '02' }
      ]
    },
    tags: ['basic', 'uf', 'multiple']
  },

  // Filtros com Dados de Contato
  {
    id: 'contact-01',
    name: 'Filtro por Empresas com Email',
    description: 'Testar filtro para empresas com email preenchido',
    filters: {
      uf: ['SP'],
      com_email: true
    },
    expectedResults: {
      shouldReturnResults: true,
      expectedMinResults: 50,
      validationChecks: [
        { field: 'uf', condition: 'equals', expectedValue: 'SP' },
        { field: 'email', condition: 'not_null', expectedValue: null }
      ]
    },
    tags: ['contact', 'email']
  },
  {
    id: 'contact-02',
    name: 'Filtro por Empresas com Telefone',
    description: 'Testar filtro para empresas com telefone preenchido',
    filters: {
      uf: ['RJ'],
      com_telefone: true
    },
    expectedResults: {
      shouldReturnResults: true,
      expectedMinResults: 50,
      validationChecks: [
        { field: 'uf', condition: 'equals', expectedValue: 'RJ' },
        { field: 'telefone', condition: 'not_null', expectedValue: null }
      ]
    },
    tags: ['contact', 'telefone']
  },
  {
    id: 'contact-03',
    name: 'Filtro por Empresas com Email e Telefone',
    description: 'Testar filtro para empresas com ambos email e telefone',
    filters: {
      uf: ['MG'],
      com_email: true,
      com_telefone: true
    },
    expectedResults: {
      shouldReturnResults: true,
      expectedMinResults: 30,
      validationChecks: [
        { field: 'uf', condition: 'equals', expectedValue: 'MG' },
        { field: 'email', condition: 'not_null', expectedValue: null },
        { field: 'telefone', condition: 'not_null', expectedValue: null }
      ]
    },
    tags: ['contact', 'email', 'telefone']
  },

  // Filtros por Porte e Regime Tributário
  {
    id: 'regime-01',
    name: 'Filtro por Empresas MEI',
    description: 'Testar filtro para empresas MEI',
    filters: {
      uf: ['SP'],
      mei: true
    },
    expectedResults: {
      shouldReturnResults: true,
      expectedMinResults: 100,
      validationChecks: [
        { field: 'uf', condition: 'equals', expectedValue: 'SP' },
        { field: 'mei', condition: 'equals', expectedValue: true }
      ]
    },
    tags: ['regime', 'mei']
  },
  {
    id: 'regime-02',
    name: 'Filtro por Empresas Simples Nacional',
    description: 'Testar filtro para empresas optantes pelo Simples Nacional',
    filters: {
      uf: ['RJ'],
      simples: true
    },
    expectedResults: {
      shouldReturnResults: true,
      expectedMinResults: 100,
      validationChecks: [
        { field: 'uf', condition: 'equals', expectedValue: 'RJ' },
        { field: 'simples', condition: 'equals', expectedValue: true }
      ]
    },
    tags: ['regime', 'simples']
  },
  {
    id: 'regime-03',
    name: 'Filtro por Porte Específico',
    description: 'Testar filtro por porte de empresa (Micro Empresa)',
    filters: {
      uf: ['MG'],
      porte: ['01'] // Micro Empresa
    },
    expectedResults: {
      shouldReturnResults: true,
      expectedMinResults: 100,
      validationChecks: [
        { field: 'uf', condition: 'equals', expectedValue: 'MG' },
        { field: 'porte', condition: 'equals', expectedValue: '01' }
      ]
    },
    tags: ['regime', 'porte']
  },

  // Filtros por Capital Social
  {
    id: 'capital-01',
    name: 'Filtro por Capital Social Mínimo',
    description: 'Testar filtro por capital social mínimo',
    filters: {
      uf: ['SP'],
      capital_social_min: 10000
    },
    expectedResults: {
      shouldReturnResults: true,
      expectedMinResults: 50,
      validationChecks: [
        { field: 'uf', condition: 'equals', expectedValue: 'SP' },
        { field: 'capital_social', condition: 'gte', expectedValue: 10000 }
      ]
    },
    tags: ['capital', 'min']
  },
  {
    id: 'capital-02',
    name: 'Filtro por Capital Social Máximo',
    description: 'Testar filtro por capital social máximo',
    filters: {
      uf: ['RJ'],
      capital_social_max: 50000
    },
    expectedResults: {
      shouldReturnResults: true,
      expectedMinResults: 50,
      validationChecks: [
        { field: 'uf', condition: 'equals', expectedValue: 'RJ' },
        { field: 'capital_social', condition: 'lte', expectedValue: 50000 }
      ]
    },
    tags: ['capital', 'max']
  },
  {
    id: 'capital-03',
    name: 'Filtro por Faixa de Capital Social',
    description: 'Testar filtro por faixa de capital social',
    filters: {
      uf: ['MG'],
      capital_social_min: 10000,
      capital_social_max: 100000
    },
    expectedResults: {
      shouldReturnResults: true,
      expectedMinResults: 30,
      validationChecks: [
        { field: 'uf', condition: 'equals', expectedValue: 'MG' },
        { field: 'capital_social', condition: 'gte', expectedValue: 10000 },
        { field: 'capital_social', condition: 'lte', expectedValue: 100000 }
      ]
    },
    tags: ['capital', 'range']
  },

  // Filtros Conflitantes/Edge Cases
  {
    id: 'conflict-01',
    name: 'Filtro MEI com Capital Social Alto',
    description: 'Testar filtro MEI com capital social alto (deve ser corrigido)',
    filters: {
      uf: ['SP'],
      mei: true,
      capital_social_min: 100000 // MEI não pode ter capital tão alto
    },
    expectedResults: {
      shouldReturnResults: true, // Sistema deve corrigir automaticamente
      validationChecks: [
        { field: 'uf', condition: 'equals', expectedValue: 'SP' }
      ]
    },
    tags: ['conflict', 'mei', 'capital']
  },
  {
    id: 'conflict-02',
    name: 'Filtro com UF Inexistente',
    description: 'Testar filtro com UF inexistente',
    filters: {
      uf: ['ZZ'], // UF inexistente
      situacao: ['02']
    },
    expectedResults: {
      shouldReturnResults: false, // Deve retornar vazio
      validationChecks: []
    },
    tags: ['conflict', 'uf']
  },
  {
    id: 'conflict-03',
    name: 'Filtro com CNAE Inexistente',
    description: 'Testar filtro com CNAE inexistente',
    filters: {
      cnae: ['9999999'], // CNAE inexistente
      situacao: ['02']
    },
    expectedResults: {
      shouldReturnResults: false, // Deve retornar vazio
      validationChecks: []
    },
    tags: ['conflict', 'cnae']
  },

  // Filtros Combinados Complexos
  {
    id: 'complex-01',
    name: 'Filtro Complexo - Restaurante MEI em SP com Email',
    description: 'Combinação de filtros complexos',
    filters: {
      uf: ['SP'],
      cnae: ['5611201'], // Restaurantes
      mei: true,
      com_email: true,
      situacao: ['02']
    },
    expectedResults: {
      shouldReturnResults: true,
      expectedMinResults: 10,
      validationChecks: [
        { field: 'uf', condition: 'equals', expectedValue: 'SP' },
        { field: 'cnae', condition: 'equals', expectedValue: '5611201' },
        { field: 'mei', condition: 'equals', expectedValue: true },
        { field: 'email', condition: 'not_null', expectedValue: null },
        { field: 'situacao', condition: 'equals', expectedValue: '02' }
      ]
    },
    tags: ['complex', 'mei', 'email', 'cnae']
  },
  {
    id: 'complex-02',
    name: 'Filtro Complexo - EPP com Capital Específico',
    description: 'Empresa de Pequeno Porte com capital específico',
    filters: {
      uf: ['RJ'],
      porte: ['03'], // EPP
      capital_social_min: 50000,
      capital_social_max: 200000,
      com_telefone: true
    },
    expectedResults: {
      shouldReturnResults: true,
      expectedMinResults: 20,
      validationChecks: [
        { field: 'uf', condition: 'equals', expectedValue: 'RJ' },
        { field: 'porte', condition: 'equals', expectedValue: '03' },
        { field: 'capital_social', condition: 'gte', expectedValue: 50000 },
        { field: 'capital_social', condition: 'lte', expectedValue: 200000 },
        { field: 'telefone', condition: 'not_null', expectedValue: null }
      ]
    },
    tags: ['complex', 'porte', 'capital', 'telefone']
  },

  // Testes de Correção de Parsing
  {
    id: 'parsing-01',
    name: 'Parsing - Paraiba, Paraiba, Brazil',
    description: 'Testar parsing corrigido para caso especial onde município = estado',
    filters: {
      localizacao: 'Paraiba, Paraiba, Brazil',
      situacao: ['02']
    },
    expectedResults: {
      shouldReturnResults: true,
      expectedMinResults: 10,
      validationChecks: [
        { field: 'uf', condition: 'equals', expectedValue: 'PB' }
      ]
    },
    tags: ['parsing', 'localizacao', 'especial']
  },
  {
    id: 'parsing-02',
    name: 'Parsing - CNPJ - Joao Pessoa, Paraiba, Brazil',
    description: 'Testar parsing com prefixo CNPJ removido corretamente',
    filters: {
      localizacao: 'CNPJ - Joao Pessoa, Paraiba, Brazil',
      situacao: ['02']
    },
    expectedResults: {
      shouldReturnResults: true,
      expectedMinResults: 10,
      validationChecks: [
        { field: 'uf', condition: 'equals', expectedValue: 'PB' }
      ]
    },
    tags: ['parsing', 'localizacao', 'prefixo']
  },

  // Testes de Correção Automática de Filtros
  {
    id: 'correcao-01',
    name: 'Correção - Capital Social Invertido',
    description: 'Testar correção automática de capital social mínimo > máximo',
    filters: {
      uf: ['SP'],
      capital_social_min: 100000,
      capital_social_max: 50000
    },
    expectedResults: {
      shouldReturnResults: true,
      validationChecks: [
        { field: 'uf', condition: 'equals', expectedValue: 'SP' }
      ]
    },
    tags: ['correcao', 'capital', 'automatica']
  },
  {
    id: 'correcao-02',
    name: 'Correção - Data Abertura Invertida',
    description: 'Testar correção automática de data abertura mínima > máxima',
    filters: {
      uf: ['RJ'],
      data_abertura_min: '2024-01-01',
      data_abertura_max: '2023-01-01'
    },
    expectedResults: {
      shouldReturnResults: true,
      validationChecks: [
        { field: 'uf', condition: 'equals', expectedValue: 'RJ' }
      ]
    },
    tags: ['correcao', 'data', 'automatica']
  },

  // Testes de Validação de Combinações Impossíveis
  {
    id: 'validacao-01',
    name: 'Validação - MEI e não Simples',
    description: 'Testar validação de combinação impossível MEI e não optante pelo Simples',
    filters: {
      uf: ['SP'],
      mei: true,
      simples: false
    },
    expectedResults: {
      shouldReturnResults: false,
      validationChecks: []
    },
    tags: ['validacao', 'mei', 'simples', 'impossivel']
  },
  {
    id: 'validacao-02',
    name: 'Validação - Situações Incompatíveis',
    description: 'Testar validação de situações cadastrais incompatíveis',
    filters: {
      uf: ['RJ'],
      situacao: ['02', '08'] // Ativa e Baixada
    },
    expectedResults: {
      shouldReturnResults: false,
      validationChecks: []
    },
    tags: ['validacao', 'situacao', 'impossivel']
  },

  // Testes de Resultados Vazios
  {
    id: 'vazio-01',
    name: 'Resultados Vazios - UF Inexistente',
    description: 'Testar tratamento de resultados vazios com UF inexistente',
    filters: {
      uf: ['ZZ'], // UF inexistente
      situacao: ['02']
    },
    expectedResults: {
      shouldReturnResults: false,
      validationChecks: []
    },
    tags: ['vazio', 'uf', 'inexistente']
  },
  {
    id: 'vazio-02',
    name: 'Resultados Vazios - CNAE Inexistente',
    description: 'Testar tratamento de resultados vazios com CNAE inexistente',
    filters: {
      cnae: ['9999999'], // CNAE inexistente
      situacao: ['02']
    },
    expectedResults: {
      shouldReturnResults: false,
      validationChecks: []
    },
    tags: ['vazio', 'cnae', 'inexistente']
  }
];