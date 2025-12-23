#!/usr/bin/env node

/**
 * SCRIPT DE TESTES INTEGRADOS DO SISTEMA CNPJ
 * 
 * Este script complementa o validate-cnpj-system.js com testes mais específicos
 * e detalhados para identificar problemas específicos do ambiente real.
 */

const fs = require('fs');
const path = require('path');

// Importar o script de validação principal
const validationScript = require('./validate-cnpj-system.js');

// Configurações específicas para testes integrados
const INTEGRATED_TEST_CONFIG = {
  // Testes de performance
  performance: {
    concurrentRequests: 5,
    timeoutPerRequest: 10000
  },
  
  // Testes de carga
  load: {
    requestsPerMinute: 60,
    durationMinutes: 2
  },
  
  // Testes de integração
  integration: {
    testWorkspaceId: 'ws-integration-test',
    testFunnelId: 'fn-integration-funnel',
    testColumnId: 'cl-integration-column'
  }
};

/**
 * Teste de performance: múltiplas requisições simultâneas
 */
async function testConcurrentRequests() {
  console.log('\n⚡ Teste de Performance: Requisições Concorrentes');
  
  const promises = [];
  const startTime = Date.now();
  
  for (let i = 0; i < INTEGRATED_TEST_CONFIG.performance.concurrentRequests; i++) {
    promises.push(
      validationScript.testStatsEndpoint()
        .then(result => ({ id: i, success: result.success, duration: Date.now() - startTime }))
        .catch(error => ({ id: i, success: false, error: error.message, duration: Date.now() - startTime }))
    );
  }
  
  const results = await Promise.all(promises);
  const endTime = Date.now();
  
  console.log(`   Tempo total: ${endTime - startTime}ms`);
  console.log(`   Média por requisição: ${results.reduce((sum, r) => sum + r.duration, 0) / results.length}ms`);
  console.log(`   Sucesso: ${results.filter(r => r.success).length}/${results.length}`);
  
  return results;
}

/**
 * Teste de carga: requisições contínuas
 */
async function testLoad() {
  console.log('\n🔄 Teste de Carga: Requisições Contínuas');
  
  const results = [];
  const startTime = Date.now();
  const duration = INTEGRATED_TEST_CONFIG.load.durationMinutes * 60 * 1000;
  const interval = 60000 / INTEGRATED_TEST_CONFIG.load.requestsPerMinute; // ms entre requisições
  
  console.log(`   Duração: ${INTEGRATED_TEST_CONFIG.load.durationMinutes} minutos`);
  console.log(`   Frequência: 1 requisição a cada ${interval}ms`);
  
  let requestCount = 0;
  const intervalId = setInterval(async () => {
    requestCount++;
    const startTime = Date.now();
    
    try {
      const result = await validationScript.testStatsEndpoint();
      const duration = Date.now() - startTime;
      
      results.push({
        request: requestCount,
        success: result.success,
        duration: duration,
        timestamp: new Date().toISOString()
      });
      
      if (!result.success) {
        console.log(`   Requisição ${requestCount}: FALHOU - ${result.error}`);
      }
    } catch (error) {
      results.push({
        request: requestCount,
        success: false,
        duration: Date.now() - startTime,
        error: error.message,
        timestamp: new Date().toISOString()
      });
      console.log(`   Requisição ${requestCount}: ERRO - ${error.message}`);
    }
    
    if (Date.now() - startTime >= duration) {
      clearInterval(intervalId);
    }
  }, interval);
  
  // Aguardar término do teste
  await new Promise(resolve => setTimeout(resolve, duration + 5000));
  
  const successRate = (results.filter(r => r.success).length / results.length) * 100;
  const avgDuration = results.reduce((sum, r) => sum + r.duration, 0) / results.length;
  
  console.log(`   Total de requisições: ${results.length}`);
  console.log(`   Taxa de sucesso: ${successRate.toFixed(2)}%`);
  console.log(`   Tempo médio: ${avgDuration.toFixed(2)}ms`);
  
  return results;
}

/**
 * Teste de integração: fluxo completo com dados reais
 */
async function testIntegrationFlow() {
  console.log('\n🔗 Teste de Integração: Fluxo Completo');
  
  const steps = [];
  
  // Passo 1: Obter CNAEs reais
  console.log('   Passo 1: Obtendo CNAEs reais...');
  try {
    const cnaesResult = await validationScript.testCnaesEndpoint();
    if (cnaesResult.success && cnaesResult.data.length > 0) {
      const realCnaes = cnaesResult.data.slice(0, 3).map(c => c.value);
      steps.push({ step: 'Obter CNAEs reais', success: true, data: realCnaes });
      console.log(`   CNAEs obtidos: ${realCnaes.join(', ')}`);
    } else {
      throw new Error('Não foi possível obter CNAEs reais');
    }
  } catch (error) {
    steps.push({ step: 'Obter CNAEs reais', success: false, error: error.message });
    console.log(`   ❌ Falha ao obter CNAEs: ${error.message}`);
  }
  
  // Passo 2: Testar estatísticas com CNAEs reais
  if (steps[0]?.success) {
    console.log('   Passo 2: Testando estatísticas com CNAEs reais...');
    try {
      const statsResult = await validationScript.testStatsEndpoint();
      steps.push({ step: 'Testar estatísticas', success: statsResult.success });
      console.log(`   Estatísticas: ${statsResult.success ? 'Sucesso' : 'Falha'}`);
    } catch (error) {
      steps.push({ step: 'Testar estatísticas', success: false, error: error.message });
      console.log(`   ❌ Falha nas estatísticas: ${error.message}`);
    }
  }
  
  // Passo 3: Simular extração completa
  console.log('   Passo 3: Simulando extração completa...');
  try {
    const extractionResult = await validationScript.testStartExtraction();
    steps.push({ step: 'Simular extração', success: extractionResult.success });
    console.log(`   Extração: ${extractionResult.success ? 'Sucesso' : 'Falha'}`);
  } catch (error) {
    steps.push({ step: 'Simular extração', success: false, error: error.message });
    console.log(`   ❌ Falha na extração: ${error.message}`);
  }
  
  const allStepsPassed = steps.every(step => step.success);
  
  return {
    success: allStepsPassed,
    steps: steps,
    summary: {
      totalSteps: steps.length,
      passedSteps: steps.filter(s => s.success).length,
      failedSteps: steps.filter(s => !s.success).length
    }
  };
}

/**
 * Teste de resiliência: falhas e recuperação
 */
async function testResilience() {
  console.log('\n🛡️ Teste de Resiliência: Falhas e Recuperação');
  
  const results = [];
  
  // Teste 1: Timeout
  console.log('   Teste 1: Simulando timeout...');
  try {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 100); // Timeout rápido
    
    const response = await fetch('https://httpbin.org/delay/10', {
      signal: controller.signal
    });
    
    results.push({ test: 'Timeout', success: false, error: 'Timeout não ocorreu' });
  } catch (error) {
    if (error.name === 'AbortError') {
      results.push({ test: 'Timeout', success: true, message: 'Timeout detectado corretamente' });
    } else {
      results.push({ test: 'Timeout', success: false, error: error.message });
    }
  }
  
  // Teste 2: Erro de rede
  console.log('   Teste 2: Simulando erro de rede...');
  try {
    const response = await fetch('https://invalid-url-that-does-not-exist-12345.com');
    results.push({ test: 'Erro de rede', success: false, error: 'Erro de rede não ocorreu' });
  } catch (error) {
    results.push({ test: 'Erro de rede', success: true, message: 'Erro de rede detectado corretamente' });
  }
  
  // Teste 3: Erro 500
  console.log('   Teste 3: Simulando erro 500...');
  try {
    const response = await fetch('https://httpbin.org/status/500');
    results.push({ test: 'Erro 500', success: response.status === 500, status: response.status });
  } catch (error) {
    results.push({ test: 'Erro 500', success: false, error: error.message });
  }
  
  return results;
}

/**
 * Gerar relatório detalhado de testes integrados
 */
function generateIntegratedReport(performanceResults, loadResults, integrationResult, resilienceResults) {
  const report = {
    timestamp: new Date().toISOString(),
    type: 'Integrated Tests Report',
    performance: {
      totalRequests: performanceResults.length,
      successRate: (performanceResults.filter(r => r.success).length / performanceResults.length) * 100,
      avgDuration: performanceResults.reduce((sum, r) => sum + r.duration, 0) / performanceResults.length,
      maxDuration: Math.max(...performanceResults.map(r => r.duration)),
      minDuration: Math.min(...performanceResults.map(r => r.duration))
    },
    load: {
      totalRequests: loadResults.length,
      successRate: (loadResults.filter(r => r.success).length / loadResults.length) * 100,
      avgDuration: loadResults.reduce((sum, r) => sum + r.duration, 0) / loadResults.length,
      errors: loadResults.filter(r => !r.success).map(r => r.error)
    },
    integration: integrationResult,
    resilience: resilienceResults,
    recommendations: []
  };
  
  // Gerar recomendações baseadas nos resultados
  if (report.performance.successRate < 100) {
    report.recommendations.push('⚡ Otimizar performance das requisições - taxa de sucesso abaixo de 100%');
  }
  
  if (report.performance.avgDuration > 5000) {
    report.recommendations.push('⏱️ Reduzir tempo de resposta das Edge Functions');
  }
  
  if (report.load.successRate < 95) {
    report.recommendations.push('🔄 Melhorar estabilidade sob carga - taxa de sucesso abaixo de 95%');
  }
  
  if (!integrationResult.success) {
    report.recommendations.push('🔗 Investigar falhas no fluxo de integração');
  }
  
  return report;
}

/**
 * Função principal de testes integrados
 */
async function main() {
  console.log('🚀 INICIANDO TESTES INTEGRADOS DO SISTEMA CNPJ');
  console.log('='.repeat(60));
  
  // Executar testes
  console.log('\n📊 Executando Testes de Performance...');
  const performanceResults = await testConcurrentRequests();
  
  console.log('\n📊 Executando Testes de Carga...');
  const loadResults = await testLoad();
  
  console.log('\n📊 Executando Testes de Integração...');
  const integrationResult = await testIntegrationFlow();
  
  console.log('\n📊 Executando Testes de Resiliência...');
  const resilienceResults = await testResilience();
  
  // Gerar relatório
  console.log('\n📊 GERANDO RELATÓRIO DETALHADO');
  console.log('='.repeat(60));
  
  const report = generateIntegratedReport(performanceResults, loadResults, integrationResult, resilienceResults);
  
  // Exibir resumo
  console.log('\n📈 RESUMO DOS TESTES INTEGRADOS:');
  console.log(`   Performance - Sucesso: ${report.performance.successRate.toFixed(2)}% (Média: ${report.performance.avgDuration.toFixed(0)}ms)`);
  console.log(`   Carga - Sucesso: ${report.load.successRate.toFixed(2)}% (Média: ${report.load.avgDuration.toFixed(0)}ms)`);
  console.log(`   Integração - Sucesso: ${integrationResult.success ? 'SIM' : 'NÃO'} (${integrationResult.summary.passedSteps}/${integrationResult.summary.totalSteps} passos)`);
  console.log(`   Resiliência - Testes: ${resilienceResults.length} (Falhas detectadas: ${resilienceResults.filter(r => r.success).length})`);
  
  if (report.recommendations.length > 0) {
    console.log('\n💡 RECOMENDAÇÕES:');
    report.recommendations.forEach((rec, index) => {
      console.log(`   ${index + 1}. ${rec}`);
    });
  }
  
  // Salvar relatório detalhado
  const reportPath = path.join(__dirname, `cnpj-integrated-tests-report-${Date.now()}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n📄 Relatório detalhado salvo em: ${reportPath}`);
  
  // Resultado final
  const overallSuccess = report.performance.successRate >= 95 && 
                        report.load.successRate >= 90 && 
                        integrationResult.success;
  
  console.log(`\n${overallSuccess ? '✅' : '❌'} TESTES INTEGRADOS ${overallSuccess ? 'CONCLUÍDOS COM SUCESSO' : 'IDENTIFICARAM PROBLEMAS CRÍTICOS'}`);
  
  process.exit(overallSuccess ? 0 : 1);
}

// Executar script
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Erro ao executar testes integrados:', error);
    process.exit(1);
  });
}

module.exports = {
  testConcurrentRequests,
  testLoad,
  testIntegrationFlow,
  testResilience,
  generateIntegratedReport
};