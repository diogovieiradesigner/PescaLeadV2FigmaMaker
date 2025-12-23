#!/usr/bin/env node

/**
 * SCRIPT DE TESTES EM AMBIENTE REAL - CNPJ
 * 
 * Este script executa testes específicos no ambiente real para identificar
 * problemas que não foram detectados nos testes teóricos.
 */

const fs = require('fs');
const path = require('path');

// Configurações específicas para ambiente real
const REAL_ENV_CONFIG = {
  // URLs reais das Edge Functions
  supabaseUrl: 'https://nlbcwaxkeaddfocigwuk.supabase.co',
  cnpjApiUrl: 'https://nlbcwaxkeaddfocigwuk.supabase.co/functions/v1/cnpj-api',
  startExtractionUrl: 'https://nlbcwaxkeaddfocigwuk.supabase.co/functions/v1/start-cnpj-extraction',
  
  // Configurações de autenticação
  publicAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5sYmN3YXhrZWFkZGZvY2lnd3VrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM1NjkyNDksImV4cCI6MjA3OTE0NTI0OX0.BoTSbJgFVb2XWNBVOcNv75JAKrwwMlNGJWETQYyMNFg',
  
  // Configurações de workspace real (se houver)
  realWorkspaceId: process.env.REAL_WORKSPACE_ID || 'ws-0eab651228d1c5a5',
  realFunnelId: process.env.REAL_FUNNEL_ID || null,
  realColumnId: process.env.REAL_COLUMN_ID || null,
  
  // Timeout aumentado para ambiente real
  timeout: 60000,
  
  // Configurações de teste
  testConfig: {
    maxRetries: 3,
    retryDelay: 5000,
    verbose: true
  }
};

/**
 * Helper para logs detalhados
 */
function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] ${type.toUpperCase()}:`;
  
  if (REAL_ENV_CONFIG.testConfig.verbose) {
    console.log(`${prefix} ${message}`);
  }
}

/**
 * Helper para tentativas com retry
 */
async function withRetry(fn, maxRetries = 3, delay = 5000) {
  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries) {
        throw error;
      }
      
      log(`Tentativa ${i + 1} falhou: ${error.message}. Tentando novamente em ${delay}ms...`, 'warn');
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

/**
 * Teste 1: Verificar conectividade com Supabase
 */
async function testSupabaseConnectivity() {
  log('Testando conectividade com Supabase...');
  
  try {
    const response = await fetch(`${REAL_ENV_CONFIG.supabaseUrl}/rest/v1/`, {
      method: 'HEAD',
      headers: {
        'apikey': REAL_ENV_CONFIG.publicAnonKey
      }
    });
    
    if (response.ok) {
      log('✅ Conectividade com Supabase: SUCESSO');
      return { success: true, status: response.status };
    } else {
      log(`❌ Conectividade com Supabase: FALHA (status: ${response.status})`, 'error');
      return { success: false, status: response.status };
    }
  } catch (error) {
    log(`❌ Conectividade com Supabase: ERRO (${error.message})`, 'error');
    return { success: false, error: error.message };
  }
}

/**
 * Teste 2: Verificar disponibilidade das Edge Functions
 */
async function testEdgeFunctionsAvailability() {
  log('Testando disponibilidade das Edge Functions...');
  
  const endpoints = [
    { name: 'CNPJ API', url: REAL_ENV_CONFIG.cnpjApiUrl },
    { name: 'Start Extraction', url: REAL_ENV_CONFIG.startExtractionUrl }
  ];
  
  const results = [];
  
  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint.url, {
        method: 'HEAD',
        headers: {
          'apikey': REAL_ENV_CONFIG.publicAnonKey
        }
      });
      
      const success = response.ok;
      results.push({
        name: endpoint.name,
        url: endpoint.url,
        success: success,
        status: response.status
      });
      
      log(`   ${endpoint.name}: ${success ? '✅' : '❌'} (status: ${response.status})`);
    } catch (error) {
      results.push({
        name: endpoint.name,
        url: endpoint.url,
        success: false,
        error: error.message
      });
      
      log(`   ${endpoint.name}: ❌ (${error.message})`, 'error');
    }
  }
  
  return results;
}

/**
 * Teste 3: Testar endpoint /filters com dados reais
 */
async function testFiltersWithRealData() {
  log('Testando endpoint /filters com dados reais...');
  
  try {
    const result = await withRetry(async () => {
      const response = await fetch(`${REAL_ENV_CONFIG.cnpjApiUrl}/filters`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'apikey': REAL_ENV_CONFIG.publicAnonKey
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return await response.json();
    }, REAL_ENV_CONFIG.testConfig.maxRetries, REAL_ENV_CONFIG.testConfig.retryDelay);
    
    if (result.success) {
      const filters = result.filters;
      const filterNames = Object.keys(filters);
      
      log(`✅ Endpoint /filters: SUCESSO (${filterNames.length} filtros disponíveis)`);
      log(`   Filtros: ${filterNames.join(', ')}`);
      
      // Verificar filtros essenciais
      const essentialFilters = ['uf', 'municipio', 'cnae', 'porte', 'situacao'];
      const missingFilters = essentialFilters.filter(f => !filterNames.includes(f));
      
      if (missingFilters.length > 0) {
        log(`⚠️  Filtros essenciais faltando: ${missingFilters.join(', ')}`, 'warn');
        return { success: false, missingFilters, filters: filterNames };
      }
      
      return { success: true, filters: filterNames, data: filters };
    } else {
      log(`❌ Endpoint /filters: FALHA (${result.error || 'Erro desconhecido'})`, 'error');
      return { success: false, error: result.error };
    }
  } catch (error) {
    log(`❌ Endpoint /filters: ERRO (${error.message})`, 'error');
    return { success: false, error: error.message };
  }
}

/**
 * Teste 4: Testar endpoint /stats com combinações reais
 */
async function testStatsWithRealCombinations() {
  log('Testando endpoint /stats com combinações reais...');
  
  const realCombinations = [
    {
      name: 'São Paulo - Micro empresas',
      filters: {
        uf: ['SP'],
        porte: ['01']
      }
    },
    {
      name: 'Rio de Janeiro - Ativas',
      filters: {
        uf: ['RJ'],
        situacao: ['02']
      }
    },
    {
      name: 'Minas Gerais - Restaurantes',
      filters: {
        uf: ['MG'],
        cnae: ['6202300']
      }
    },
    {
      name: 'Todos os estados - Qualquer porte',
      filters: {
        uf: ['SP', 'RJ', 'MG', 'RS', 'BA']
      }
    }
  ];
  
  const results = [];
  
  for (const combo of realCombinations) {
    log(`   Testando: ${combo.name}`);
    
    try {
      const result = await withRetry(async () => {
        const response = await fetch(`${REAL_ENV_CONFIG.cnpjApiUrl}/stats`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': REAL_ENV_CONFIG.publicAnonKey
          },
          body: JSON.stringify({ filters: combo.filters })
        });
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        return await response.json();
      }, REAL_ENV_CONFIG.testConfig.maxRetries, REAL_ENV_CONFIG.testConfig.retryDelay);
      
      if (result.success) {
        const stats = result.preview;
        results.push({
          name: combo.name,
          success: true,
          total_matches: stats.total_matches,
          com_email: stats.com_email,
          com_telefone: stats.com_telefone
        });
        
        log(`     ✅ Sucesso (total: ${stats.total_matches}, email: ${stats.com_email}, telefone: ${stats.com_telefone})`);
      } else {
        results.push({
          name: combo.name,
          success: false,
          error: result.error
        });
        
        log(`     ❌ Falha: ${result.error}`, 'error');
      }
    } catch (error) {
      results.push({
        name: combo.name,
        success: false,
        error: error.message
      });
      
      log(`     ❌ Erro: ${error.message}`, 'error');
    }
  }
  
  return results;
}

/**
 * Teste 5: Testar endpoint /cnaes com busca real
 */
async function testCnaesWithRealSearch() {
  log('Testando endpoint /cnaes com busca real...');
  
  const searchTerms = [
    'restaurante',
    'hotel',
    'comercio',
    'servicos',
    'tecnologia'
  ];
  
  const results = [];
  
  for (const term of searchTerms) {
    log(`   Buscando CNAEs para: "${term}"`);
    
    try {
      const result = await withRetry(async () => {
        const response = await fetch(`${REAL_ENV_CONFIG.cnpjApiUrl}/cnaes?q=${encodeURIComponent(term)}&limit=5`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'apikey': REAL_ENV_CONFIG.publicAnonKey
          }
        });
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        return await response.json();
      }, REAL_ENV_CONFIG.testConfig.maxRetries, REAL_ENV_CONFIG.testConfig.retryDelay);
      
      if (result.success && result.cnaes && result.cnaes.length > 0) {
        results.push({
          term: term,
          success: true,
          count: result.cnaes.length,
          cnaes: result.cnaes.map(c => ({ code: c.value, description: c.label }))
        });
        
        log(`     ✅ Encontrados ${result.cnaes.length} CNAEs`);
        log(`        Exemplos: ${result.cnaes.slice(0, 2).map(c => `${c.value} - ${c.label}`).join('; ')}`);
      } else {
        results.push({
          term: term,
          success: false,
          error: result.error || 'Nenhum CNAE encontrado'
        });
        
        log(`     ❌ Falha: ${result.error || 'Nenhum CNAE encontrado'}`, 'error');
      }
    } catch (error) {
      results.push({
        term: term,
        success: false,
        error: error.message
      });
      
      log(`     ❌ Erro: ${error.message}`, 'error');
    }
  }
  
  return results;
}

/**
 * Teste 6: Testar start-cnpj-extraction com workspace real
 */
async function testStartExtractionWithRealWorkspace() {
  log('Testando start-cnpj-extraction com workspace real...');
  
  if (!REAL_ENV_CONFIG.realWorkspaceId) {
    log('⚠️  Workspace real não configurado - pulando teste', 'warn');
    return { skipped: true, reason: 'Workspace real não configurado' };
  }
  
  const testExtraction = {
    workspace_id: REAL_ENV_CONFIG.realWorkspaceId,
    extraction_name: `Teste Real - ${new Date().toISOString()}`,
    filters: {
      uf: ['SP'],
      porte: ['01', '03'],
      situacao: ['02']
    },
    target_quantity: 5,
    funnel_id: REAL_ENV_CONFIG.realFunnelId || 'fn-test',
    column_id: REAL_ENV_CONFIG.realColumnId || 'cl-test'
  };
  
  try {
    const result = await withRetry(async () => {
      const response = await fetch(REAL_ENV_CONFIG.startExtractionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': REAL_ENV_CONFIG.publicAnonKey
        },
        body: JSON.stringify(testExtraction)
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return await response.json();
    }, REAL_ENV_CONFIG.testConfig.maxRetries, REAL_ENV_CONFIG.testConfig.retryDelay);
    
    log(`✅ start-cnpj-extraction: SUCESSO`);
    log(`   Resposta: ${JSON.stringify(result, null, 2)}`);
    
    return { success: true, data: result };
  } catch (error) {
    log(`❌ start-cnpj-extraction: FALHA (${error.message})`, 'error');
    return { success: false, error: error.message };
  }
}

/**
 * Teste 7: Testar fluxo completo no ambiente real
 */
async function testCompleteRealFlow() {
  log('Testando fluxo completo no ambiente real...');
  
  const steps = [];
  
  // Passo 1: Verificar conectividade
  log('   Passo 1: Verificando conectividade...');
  const connectivity = await testSupabaseConnectivity();
  steps.push({ step: 'Conectividade', success: connectivity.success });
  
  if (!connectivity.success) {
    log('   ❌ Fluxo interrompido - falha na conectividade', 'error');
    return { success: false, steps: steps, error: 'Falha na conectividade' };
  }
  
  // Passo 2: Verificar Edge Functions
  log('   Passo 2: Verificando Edge Functions...');
  const edgeFunctions = await testEdgeFunctionsAvailability();
  const allFunctionsAvailable = edgeFunctions.every(f => f.success);
  steps.push({ step: 'Edge Functions', success: allFunctionsAvailable });
  
  if (!allFunctionsAvailable) {
    log('   ❌ Fluxo interrompido - Edge Functions indisponíveis', 'error');
    return { success: false, steps: steps, error: 'Edge Functions indisponíveis' };
  }
  
  // Passo 3: Testar filtros
  log('   Passo 3: Testando filtros...');
  const filters = await testFiltersWithRealData();
  steps.push({ step: 'Filtros', success: filters.success });
  
  if (!filters.success) {
    log('   ❌ Fluxo interrompido - falha nos filtros', 'error');
    return { success: false, steps: steps, error: 'Falha nos filtros' };
  }
  
  // Passo 4: Testar estatísticas
  log('   Passo 4: Testando estatísticas...');
  const stats = await testStatsWithRealCombinations();
  const statsSuccess = stats.filter(s => s.success).length >= Math.ceil(stats.length * 0.8); // 80% de sucesso
  steps.push({ step: 'Estatísticas', success: statsSuccess });
  
  if (!statsSuccess) {
    log('   ❌ Fluxo interrompido - falha nas estatísticas', 'error');
    return { success: false, steps: steps, error: 'Falha nas estatísticas' };
  }
  
  // Passo 5: Testar CNAEs
  log('   Passo 5: Testando CNAEs...');
  const cnaes = await testCnaesWithRealSearch();
  const cnaesSuccess = cnaes.filter(c => c.success).length >= Math.ceil(cnaes.length * 0.8); // 80% de sucesso
  steps.push({ step: 'CNAEs', success: cnaesSuccess });
  
  if (!cnaesSuccess) {
    log('   ❌ Fluxo interrompido - falha nos CNAEs', 'error');
    return { success: false, steps: steps, error: 'Falha nos CNAEs' };
  }
  
  // Passo 6: Testar extração (se houver workspace real)
  if (REAL_ENV_CONFIG.realWorkspaceId) {
    log('   Passo 6: Testando extração...');
    const extraction = await testStartExtractionWithRealWorkspace();
    const extractionSuccess = extraction.success && !extraction.skipped;
    steps.push({ step: 'Extração', success: extractionSuccess });
    
    if (!extractionSuccess) {
      log('   ⚠️  Extração falhou ou foi pulada', 'warn');
    }
  } else {
    log('   Passo 6: Pulando teste de extração (workspace não configurado)');
    steps.push({ step: 'Extração', success: true, skipped: true });
  }
  
  const allStepsPassed = steps.filter(s => !s.skipped).every(step => step.success);
  
  return {
    success: allStepsPassed,
    steps: steps,
    summary: {
      totalSteps: steps.length,
      passedSteps: steps.filter(s => s.success).length,
      failedSteps: steps.filter(s => !s.success).length,
      skippedSteps: steps.filter(s => s.skipped).length
    }
  };
}

/**
 * Gerar relatório detalhado do ambiente real
 */
function generateRealEnvironmentReport(
  connectivity,
  edgeFunctions,
  filters,
  stats,
  cnaes,
  extraction,
  completeFlow
) {
  const report = {
    timestamp: new Date().toISOString(),
    environment: 'Real Environment',
    config: {
      supabaseUrl: REAL_ENV_CONFIG.supabaseUrl,
      workspaceId: REAL_ENV_CONFIG.realWorkspaceId,
      funnelId: REAL_ENV_CONFIG.realFunnelId,
      columnId: REAL_ENV_CONFIG.realColumnId,
      timeout: REAL_ENV_CONFIG.timeout
    },
    tests: {
      connectivity: connectivity,
      edgeFunctions: edgeFunctions,
      filters: filters,
      stats: stats,
      cnaes: cnaes,
      extraction: extraction,
      completeFlow: completeFlow
    },
    summary: {
      overallSuccess: completeFlow.success,
      totalTests: 6,
      passedTests: Object.values(completeFlow.steps).filter(s => s.success).length,
      failedTests: Object.values(completeFlow.steps).filter(s => !s.success).length
    },
    problems: [],
    recommendations: []
  };
  
  // Identificar problemas
  if (!connectivity.success) {
    report.problems.push('Problemas de conectividade com Supabase');
  }
  
  if (edgeFunctions.some(f => !f.success)) {
    report.problems.push('Edge Functions indisponíveis');
  }
  
  if (!filters.success) {
    report.problems.push('Problemas com endpoint /filters');
  }
  
  if (stats.filter(s => !s.success).length > 0) {
    report.problems.push('Problemas com endpoint /stats');
  }
  
  if (cnaes.filter(c => !c.success).length > 0) {
    report.problems.push('Problemas com endpoint /cnaes');
  }
  
  if (extraction && !extraction.success && !extraction.skipped) {
    report.problems.push('Problemas com start-cnpj-extraction');
  }
  
  // Gerar recomendações
  if (report.problems.length === 0) {
    report.recommendations.push('✅ Ambiente estável - nenhum problema crítico identificado');
  } else {
    report.recommendations.push('🔍 Investigar e corrigir os problemas identificados');
    report.recommendations.push('📝 Verificar logs detalhados das Edge Functions');
    report.recommendations.push('🔧 Testar manualmente os endpoints que falharam');
  }
  
  if (connectivity.success && edgeFunctions.every(f => f.success)) {
    report.recommendations.push('🌐 Infraestrutura de rede e Edge Functions estável');
  }
  
  if (filters.success && stats.filter(s => s.success).length >= stats.length * 0.8) {
    report.recommendations.push('📊 API CNPJ está funcionando corretamente');
  }
  
  return report;
}

/**
 * Função principal
 */
async function main() {
  console.log('🚀 INICIANDO TESTES NO AMBIENTE REAL - CNPJ');
  console.log('='.repeat(60));
  console.log(`Workspace: ${REAL_ENV_CONFIG.realWorkspaceId || 'NÃO CONFIGURADO'}`);
  console.log(`Funil: ${REAL_ENV_CONFIG.realFunnelId || 'NÃO CONFIGURADO'}`);
  console.log(`Coluna: ${REAL_ENV_CONFIG.realColumnId || 'NÃO CONFIGURADO'}`);
  console.log('='.repeat(60));
  
  // Executar testes
  log('Executando testes de ambiente real...');
  
  const connectivity = await testSupabaseConnectivity();
  const edgeFunctions = await testEdgeFunctionsAvailability();
  const filters = await testFiltersWithRealData();
  const stats = await testStatsWithRealCombinations();
  const cnaes = await testCnaesWithRealSearch();
  const extraction = await testStartExtractionWithRealWorkspace();
  const completeFlow = await testCompleteRealFlow();
  
  // Gerar relatório
  console.log('\n📊 GERANDO RELATÓRIO DO AMBIENTE REAL');
  console.log('='.repeat(60));
  
  const report = generateRealEnvironmentReport(
    connectivity,
    edgeFunctions,
    filters,
    stats,
    cnaes,
    extraction,
    completeFlow
  );
  
  // Exibir resumo
  console.log('\n📈 RESUMO DOS TESTES:');
  console.log(`   Conectividade: ${connectivity.success ? '✅' : '❌'}`);
  console.log(`   Edge Functions: ${edgeFunctions.every(f => f.success) ? '✅' : '❌'}`);
  console.log(`   Filtros: ${filters.success ? '✅' : '❌'}`);
  console.log(`   Estatísticas: ${stats.filter(s => s.success).length}/${stats.length} ✅`);
  console.log(`   CNAEs: ${cnaes.filter(c => c.success).length}/${cnaes.length} ✅`);
  console.log(`   Extração: ${extraction.success ? '✅' : extraction.skipped ? '⏭️' : '❌'}`);
  console.log(`   Fluxo Completo: ${completeFlow.success ? '✅' : '❌'}`);
  
  if (report.problems.length > 0) {
    console.log('\n❌ PROBLEMAS IDENTIFICADOS:');
    report.problems.forEach((problem, index) => {
      console.log(`   ${index + 1}. ${problem}`);
    });
  }
  
  if (report.recommendations.length > 0) {
    console.log('\n💡 RECOMENDAÇÕES:');
    report.recommendations.forEach((rec, index) => {
      console.log(`   ${index + 1}. ${rec}`);
    });
  }
  
  // Salvar relatório
  const reportPath = path.join(__dirname, `cnpj-real-environment-report-${Date.now()}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n📄 Relatório salvo em: ${reportPath}`);
  
  // Resultado final
  console.log(`\n${report.summary.overallSuccess ? '✅' : '❌'} TESTES NO AMBIENTE REAL ${report.summary.overallSuccess ? 'CONCLUÍDOS COM SUCESSO' : 'IDENTIFICARAM PROBLEMAS'}`);
  
  process.exit(report.summary.overallSuccess ? 0 : 1);
}

// Executar script
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Erro ao executar testes no ambiente real:', error);
    process.exit(1);
  });
}

module.exports = {
  testSupabaseConnectivity,
  testEdgeFunctionsAvailability,
  testFiltersWithRealData,
  testStatsWithRealCombinations,
  testCnaesWithRealSearch,
  testStartExtractionWithRealWorkspace,
  testCompleteRealFlow,
  generateRealEnvironmentReport
};