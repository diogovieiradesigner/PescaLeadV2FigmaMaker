#!/usr/bin/env node

/**
 * SCRIPT DE VALIDAÇÃO PRÁTICA DO SISTEMA CNPJ
 * 
 * Este script realiza testes reais no ambiente de produção/teste para validar
 * o funcionamento completo do sistema de extração CNPJ.
 * 
 * Funcionalidades:
 * - Testar chamadas à API CNPJ (filters, stats, cnaes)
 * - Testar a chamada ao start-cnpj-extraction edge function
 * - Validar o fluxo completo de extração
 * - Testar diferentes combinações de filtros
 * - Gerar relatório detalhado dos resultados
 */

const fs = require('fs');
const path = require('path');

// Configurações do ambiente
const CONFIG = {
  // Supabase
  projectId: 'nlbcwaxkeaddfocigwuk',
  publicAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5sYmN3YXhrZWFkZGZvY2lnd3VrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM1NjkyNDksImV4cCI6MjA3OTE0NTI0OX0.BoTSbJgFVb2XWNBVOcNv75JAKrwwMlNGJWETQYyMNFg',
  
  // URLs das Edge Functions
  supabaseUrl: 'https://nlbcwaxkeaddfocigwuk.supabase.co',
  cnpjApiUrl: 'https://nlbcwaxkeaddfocigwuk.supabase.co/functions/v1/cnpj-api',
  startExtractionUrl: 'https://nlbcwaxkeaddfocigwuk.supabase.co/functions/v1/start-cnpj-extraction',
  
  // Configurações de teste
  testWorkspaceId: 'ws-test-validation', // ID de workspace para testes
  testFunnelId: 'fn-test-funnel',        // ID de funil para testes
  testColumnId: 'cl-test-column',        // ID de coluna para testes
  
  // Timeout das requisições
  timeout: 30000
};

// Contador de testes
let testResults = {
  total: 0,
  passed: 0,
  failed: 0,
  errors: []
};

/**
 * Helper para fazer requisições HTTP
 */
async function makeRequest(url, options = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), CONFIG.timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'apikey': CONFIG.publicAnonKey,
        ...options.headers
      }
    });

    clearTimeout(timeoutId);
    
    const data = await response.json();
    
    return {
      ok: response.ok,
      status: response.status,
      data: data,
      headers: response.headers
    };
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

/**
 * Teste 1: Verificar disponibilidade da API CNPJ
 */
async function testApiAvailability() {
  console.log('\n🔍 Teste 1: Verificando disponibilidade da API CNPJ');
  
  try {
    const result = await makeRequest(`${CONFIG.cnpjApiUrl}/filters`);
    
    if (result.ok && result.data.success) {
      console.log('✅ API CNPJ está disponível');
      return { success: true, data: result.data };
    } else {
      console.log('❌ API CNPJ retornou erro:', result.data);
      return { success: false, error: result.data.error || 'API indisponível' };
    }
  } catch (error) {
    console.log('❌ Erro ao conectar à API CNPJ:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Teste 2: Testar endpoint /filters
 */
async function testFiltersEndpoint() {
  console.log('\n🔍 Teste 2: Testando endpoint /filters');
  
  try {
    const result = await makeRequest(`${CONFIG.cnpjApiUrl}/filters`);
    
    if (result.ok && result.data.success) {
      const filters = result.data.filters;
      const expectedFilters = ['uf', 'municipio', 'cnae', 'porte', 'situacao', 'tipo'];
      const availableFilters = Object.keys(filters);
      
      console.log('✅ Endpoint /filters retornou com sucesso');
      console.log(`   Filtros disponíveis: ${availableFilters.join(', ')}`);
      
      // Verificar filtros essenciais
      const missingFilters = expectedFilters.filter(f => !availableFilters.includes(f));
      if (missingFilters.length > 0) {
        console.log(`⚠️  Filtros faltando: ${missingFilters.join(', ')}`);
        return { success: false, error: `Filtros faltando: ${missingFilters.join(', ')}` };
      }
      
      return { success: true, data: filters };
    } else {
      console.log('❌ Endpoint /filters falhou:', result.data);
      return { success: false, error: result.data.error || 'Falha no endpoint' };
    }
  } catch (error) {
    console.log('❌ Erro no endpoint /filters:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Teste 3: Testar endpoint /stats
 */
async function testStatsEndpoint() {
  console.log('\n🔍 Teste 3: Testando endpoint /stats');
  
  const testFilters = {
    uf: ['SP'],
    porte: ['01', '03'],
    situacao: ['02']
  };
  
  try {
    const result = await makeRequest(`${CONFIG.cnpjApiUrl}/stats`, {
      method: 'POST',
      body: JSON.stringify({ filters: testFilters })
    });
    
    if (result.ok && result.data.success) {
      const stats = result.data.preview;
      console.log('✅ Endpoint /stats retornou com sucesso');
      console.log(`   Total matches: ${stats.total_matches}`);
      console.log(`   Com email: ${stats.com_email}`);
      console.log(`   Com telefone: ${stats.com_telefone}`);
      
      return { success: true, data: stats };
    } else {
      console.log('❌ Endpoint /stats falhou:', result.data);
      return { success: false, error: result.data.error || 'Falha no endpoint' };
    }
  } catch (error) {
    console.log('❌ Erro no endpoint /stats:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Teste 4: Testar endpoint /cnaes
 */
async function testCnaesEndpoint() {
  console.log('\n🔍 Teste 4: Testando endpoint /cnaes');
  
  try {
    const result = await makeRequest(`${CONFIG.cnpjApiUrl}/cnaes?q=restaurante&limit=10`);
    
    if (result.ok && result.data.success) {
      const cnaes = result.data.cnaes;
      console.log('✅ Endpoint /cnaes retornou com sucesso');
      console.log(`   CNAEs retornados: ${cnaes.length}`);
      console.log(`   Primeiros 3: ${cnaes.slice(0, 3).map(c => `${c.value} - ${c.label}`).join('; ')}`);
      
      return { success: true, data: cnaes };
    } else {
      console.log('❌ Endpoint /cnaes falhou:', result.data);
      return { success: false, error: result.data.error || 'Falha no endpoint' };
    }
  } catch (error) {
    console.log('❌ Erro no endpoint /cnaes:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Teste 5: Testar combinações de filtros problemáticas
 */
async function testProblematicFilterCombinations() {
  console.log('\n🔍 Teste 5: Testando combinações de filtros problemáticas');
  
  const problematicCombinations = [
    {
      name: 'Filtros muito restritivos',
      filters: {
        uf: ['AC'], // Estado com poucas empresas
        porte: ['01'], // Micro empresa
        situacao: ['08'], // Baixada
        cnae: ['6202300'] // Atividade específica
      }
    },
    {
      name: 'Filtros com valores inválidos',
      filters: {
        uf: ['XX'], // UF inválida
        porte: ['99'], // Porte inválido
        situacao: ['99'] // Situação inválida
      }
    },
    {
      name: 'Filtros sem nenhum filtro',
      filters: {}
    },
    {
      name: 'Filtros com CNAE inexistente',
      filters: {
        uf: ['SP'],
        cnae: ['99999999'] // CNAE inexistente
      }
    }
  ];
  
  const results = [];
  
  for (const combo of problematicCombinations) {
    console.log(`   Testando: ${combo.name}`);
    
    try {
      const result = await makeRequest(`${CONFIG.cnpjApiUrl}/stats`, {
        method: 'POST',
        body: JSON.stringify({ filters: combo.filters })
      });
      
      if (result.ok && result.data.success) {
        console.log(`   ✅ Respondeu com sucesso (total: ${result.data.preview.total_matches})`);
        results.push({ name: combo.name, success: true, total: result.data.preview.total_matches });
      } else {
        console.log(`   ⚠️  Respondeu com erro: ${result.data.error || 'Erro desconhecido'}`);
        results.push({ name: combo.name, success: false, error: result.data.error });
      }
    } catch (error) {
      console.log(`   ❌ Erro na requisição: ${error.message}`);
      results.push({ name: combo.name, success: false, error: error.message });
    }
  }
  
  return { success: true, data: results };
}

/**
 * Teste 6: Testar chamada ao start-cnpj-extraction
 */
async function testStartExtraction() {
  console.log('\n🔍 Teste 6: Testando chamada ao start-cnpj-extraction');
  
  const testExtraction = {
    workspace_id: CONFIG.testWorkspaceId,
    extraction_name: 'Teste de Validação - ' + new Date().toISOString(),
    filters: {
      uf: ['SP'],
      porte: ['01', '03'],
      situacao: ['02']
    },
    target_quantity: 10,
    funnel_id: CONFIG.testFunnelId,
    column_id: CONFIG.testColumnId
  };
  
  try {
    const result = await makeRequest(CONFIG.startExtractionUrl, {
      method: 'POST',
      body: JSON.stringify(testExtraction)
    });
    
    if (result.ok) {
      console.log('✅ start-cnpj-extraction respondeu');
      console.log(`   Status: ${result.status}`);
      console.log(`   Resposta: ${JSON.stringify(result.data, null, 2)}`);
      
      return { success: true, data: result.data };
    } else {
      console.log('❌ start-cnpj-extraction falhou');
      console.log(`   Status: ${result.status}`);
      console.log(`   Erro: ${JSON.stringify(result.data, null, 2)}`);
      
      return { success: false, error: result.data.error || 'Falha na extração' };
    }
  } catch (error) {
    console.log('❌ Erro ao chamar start-cnpj-extraction:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Teste 7: Testar fluxo completo de extração (simulado)
 */
async function testCompleteExtractionFlow() {
  console.log('\n🔍 Teste 7: Testando fluxo completo de extração (simulado)');
  
  const steps = [];
  
  // Passo 1: Obter filtros
  console.log('   Passo 1: Obtendo filtros...');
  const filtersResult = await testFiltersEndpoint();
  steps.push({ step: 'Obter filtros', success: filtersResult.success });
  
  if (!filtersResult.success) {
    console.log('   ❌ Fluxo interrompido - falha ao obter filtros');
    return { success: false, steps: steps, error: 'Falha ao obter filtros' };
  }
  
  // Passo 2: Validar estatísticas
  console.log('   Passo 2: Validando estatísticas...');
  const statsResult = await testStatsEndpoint();
  steps.push({ step: 'Validar estatísticas', success: statsResult.success });
  
  if (!statsResult.success) {
    console.log('   ❌ Fluxo interrompido - falha ao validar estatísticas');
    return { success: false, steps: steps, error: 'Falha ao validar estatísticas' };
  }
  
  // Passo 3: Iniciar extração
  console.log('   Passo 3: Iniciando extração...');
  const extractionResult = await testStartExtraction();
  steps.push({ step: 'Iniciar extração', success: extractionResult.success });
  
  const allStepsPassed = steps.every(step => step.success);
  
  if (allStepsPassed) {
    console.log('✅ Fluxo completo de extração testado com sucesso');
  } else {
    console.log('❌ Fluxo completo de extração falhou em alguns passos');
  }
  
  return { success: allStepsPassed, steps: steps };
}

/**
 * Função para registrar resultados de testes
 */
function recordTest(testName, result) {
  testResults.total++;
  
  if (result.success) {
    testResults.passed++;
    console.log(`✅ ${testName}: PASSOU`);
  } else {
    testResults.failed++;
    testResults.errors.push({ test: testName, error: result.error });
    console.log(`❌ ${testName}: FALHOU - ${result.error}`);
  }
}

/**
 * Gerar relatório de validação
 */
function generateReport() {
  const report = {
    timestamp: new Date().toISOString(),
    environment: {
      projectId: CONFIG.projectId,
      testWorkspaceId: CONFIG.testWorkspaceId,
      testFunnelId: CONFIG.testFunnelId,
      testColumnId: CONFIG.testColumnId
    },
    summary: {
      total: testResults.total,
      passed: testResults.passed,
      failed: testResults.failed,
      successRate: testResults.total > 0 ? (testResults.passed / testResults.total * 100).toFixed(2) + '%' : '0%'
    },
    errors: testResults.errors,
    recommendations: []
  };
  
  // Gerar recomendações baseadas nos erros
  if (testResults.failed > 0) {
    report.recommendations.push('🔍 Investigar falhas nos testes e corrigir os problemas identificados');
    report.recommendations.push('📝 Verificar logs detalhados das Edge Functions');
    report.recommendations.push('🔧 Testar manualmente os endpoints que falharam');
  }
  
  if (testResults.errors.some(e => e.error.includes('timeout'))) {
    report.recommendations.push('⏱️  Verificar timeout das Edge Functions - podem estar demorando muito');
  }
  
  if (testResults.errors.some(e => e.error.includes('404'))) {
    report.recommendations.push('🔗 Verificar URLs das Edge Functions - podem estar incorretas');
  }
  
  if (testResults.errors.some(e => e.error.includes('401') || e.error.includes('403'))) {
    report.recommendations.push('🔐 Verificar autenticação e permissões das Edge Functions');
  }
  
  return report;
}

/**
 * Função principal de execução
 */
async function main() {
  console.log('🚀 INICIANDO VALIDAÇÃO PRÁTICA DO SISTEMA CNPJ');
  console.log('='.repeat(60));
  console.log(`Ambiente: ${CONFIG.projectId}`);
  console.log(`Workspace de teste: ${CONFIG.testWorkspaceId}`);
  console.log(`Timeout: ${CONFIG.timeout}ms`);
  console.log('='.repeat(60));
  
  // Executar todos os testes
  const tests = [
    { name: 'Disponibilidade da API CNPJ', fn: testApiAvailability },
    { name: 'Endpoint /filters', fn: testFiltersEndpoint },
    { name: 'Endpoint /stats', fn: testStatsEndpoint },
    { name: 'Endpoint /cnaes', fn: testCnaesEndpoint },
    { name: 'Combinações de filtros problemáticas', fn: testProblematicFilterCombinations },
    { name: 'Chamada ao start-cnpj-extraction', fn: testStartExtraction },
    { name: 'Fluxo completo de extração', fn: testCompleteExtractionFlow }
  ];
  
  for (const test of tests) {
    console.log(`\n${'='.repeat(60)}`);
    const result = await test.fn();
    recordTest(test.name, result);
  }
  
  // Gerar e salvar relatório
  console.log(`\n${'='.repeat(60)}`);
  console.log('📊 GERANDO RELATÓRIO DE VALIDAÇÃO');
  console.log('='.repeat(60));
  
  const report = generateReport();
  
  // Exibir resumo
  console.log(`\n📈 RESUMO DOS TESTES:`);
  console.log(`   Total: ${report.summary.total}`);
  console.log(`   Passaram: ${report.summary.passed}`);
  console.log(`   Falharam: ${report.summary.failed}`);
  console.log(`   Taxa de sucesso: ${report.summary.successRate}`);
  
  if (report.errors.length > 0) {
    console.log(`\n❌ ERROS DETECTADOS:`);
    report.errors.forEach((error, index) => {
      console.log(`   ${index + 1}. ${error.test}: ${error.error}`);
    });
  }
  
  if (report.recommendations.length > 0) {
    console.log(`\n💡 RECOMENDAÇÕES:`);
    report.recommendations.forEach((rec, index) => {
      console.log(`   ${index + 1}. ${rec}`);
    });
  }
  
  // Salvar relatório em arquivo
  const reportPath = path.join(__dirname, `cnpj-validation-report-${Date.now()}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n📄 Relatório salvo em: ${reportPath}`);
  
  // Resultado final
  const success = testResults.failed === 0;
  console.log(`\n${success ? '✅' : '❌'} VALIDAÇÃO ${success ? 'CONCLUÍDA COM SUCESSO' : 'IDENTIFICOU PROBLEMAS'}`);
  
  process.exit(success ? 0 : 1);
}

// Executar script
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Erro ao executar validação:', error);
    process.exit(1);
  });
}

module.exports = {
  testApiAvailability,
  testFiltersEndpoint,
  testStatsEndpoint,
  testCnaesEndpoint,
  testProblematicFilterCombinations,
  testStartExtraction,
  testCompleteExtractionFlow,
  generateReport
};