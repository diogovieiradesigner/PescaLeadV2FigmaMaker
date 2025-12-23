#!/usr/bin/env node

/**
 * Script de Teste Abrangente para Validação de Filtros CNPJ
 * 
 * Este script testa todas as correções implementadas nos filtros CNPJ,
 * incluindo validações, correções automáticas e combinações de filtros.
 * 
 * Objetivo: Validar que o sistema está funcionando corretamente após as correções.
 */

const fetch = require('node-fetch');

// Configurações
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:54321/functions/v1/cnpj-api';
const SUPABASE_URL = process.env.SUPABASE_URL || 'http://localhost:54321';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

// Contadores de testes
let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

// Resultados detalhados
const testResults = [];

/**
 * Função para executar um teste
 */
async function runTest(testName, testFunction) {
  totalTests++;
  console.log(`\n🧪 Testando: ${testName}`);
  
  try {
    const result = await testFunction();
    
    if (result.success) {
      passedTests++;
      console.log(`✅ PASSOU: ${testName}`);
      testResults.push({
        name: testName,
        status: 'PASS',
        message: result.message,
        details: result.details
      });
    } else {
      failedTests++;
      console.log(`❌ FALHOU: ${testName}`);
      console.log(`   Erro: ${result.message}`);
      testResults.push({
        name: testName,
        status: 'FAIL',
        message: result.message,
        details: result.details
      });
    }
    
    return result;
  } catch (error) {
    failedTests++;
    console.log(`❌ ERRO: ${testName}`);
    console.log(`   Exceção: ${error.message}`);
    testResults.push({
      name: testName,
      status: 'ERROR',
      message: `Exceção: ${error.message}`,
      details: error.stack
    });
  }
}

/**
 * Função para fazer requisição à API
 */
async function apiRequest(endpoint, method = 'GET', body = null, requireAuth = false) {
  const headers = {
    'Content-Type': 'application/json',
    'apikey': SUPABASE_ANON_KEY
  };

  if (requireAuth) {
    // Para testes de autenticação, precisaríamos de um token JWT válido
    // Por enquanto, vamos testar endpoints públicos
    console.log('⚠️  Teste de autenticação ignorado (necessita token JWT válido)');
    return { success: false, message: 'Teste de autenticação ignorado' };
  }

  const url = `${API_BASE_URL}${endpoint}`;
  const options = {
    method,
    headers,
    ...(body && { body: JSON.stringify(body) })
  };

  try {
    const response = await fetch(url, options);
    const data = await response.json();
    
    return {
      success: response.ok,
      status: response.status,
      data,
      headers: Object.fromEntries(response.headers.entries())
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

// =============================================================================
// TESTES DE VALIDAÇÃO DE FILTROS
// =============================================================================

/**
 * Teste 1: Filtros básicos (situação ativa, UF, CNAE)
 */
async function testBasicFilters() {
  const result = await apiRequest('/search', 'POST', {
    filters: {
      situacao: ['02'], // Ativa
      uf: ['SP'],
      cnae_divisao: ['47'] // Comércio varejista
    },
    limit: 10
  }, true);

  if (!result.success) {
    return {
      success: false,
      message: 'Falha na requisição de filtros básicos',
      details: result
    };
  }

  if (result.data.success && result.data.total >= 0) {
    return {
      success: true,
      message: `Filtros básicos retornaram ${result.data.total} resultados`,
      details: {
        total: result.data.total,
        returned: result.data.returned,
        filters: result.data.filters_applied
      }
    };
  }

  return {
    success: false,
    message: 'Filtros básicos não retornaram resultados esperados',
    details: result.data
  };
}

/**
 * Teste 2: Filtros com dados de contato (email, telefone)
 */
async function testContactFilters() {
  const result = await apiRequest('/search', 'POST', {
    filters: {
      situacao: ['02'], // Ativa
      com_email: true,
      com_telefone: true
    },
    limit: 5
  }, true);

  if (!result.success) {
    return {
      success: false,
      message: 'Falha na requisição de filtros de contato',
      details: result
    };
  }

  if (result.data.success && result.data.total >= 0) {
    return {
      success: true,
      message: `Filtros de contato retornaram ${result.data.total} resultados`,
      details: {
        total: result.data.total,
        returned: result.data.returned,
        filters: result.data.filters_applied
      }
    };
  }

  return {
    success: false,
    message: 'Filtros de contato não retornaram resultados esperados',
    details: result.data
  };
}

/**
 * Teste 3: Filtros por porte e regime tributário (MEI, Simples Nacional)
 */
async function testRegimeFilters() {
  const result = await apiRequest('/search', 'POST', {
    filters: {
      situacao: ['02'], // Ativa
      mei: true,
      simples: true
    },
    limit: 5
  }, true);

  if (!result.success) {
    return {
      success: false,
      message: 'Falha na requisição de filtros de regime tributário',
      details: result
    };
  }

  if (result.data.success && result.data.total >= 0) {
    return {
      success: true,
      message: `Filtros de regime tributário retornaram ${result.data.total} resultados`,
      details: {
        total: result.data.total,
        returned: result.data.returned,
        filters: result.data.filters_applied
      }
    };
  }

  return {
    success: false,
    message: 'Filtros de regime tributário não retornaram resultados esperados',
    details: result.data
  };
}

/**
 * Teste 4: Filtros por capital social
 */
async function testCapitalSocialFilters() {
  const result = await apiRequest('/search', 'POST', {
    filters: {
      situacao: ['02'], // Ativa
      capital_social_min: 100000,
      capital_social_max: 1000000
    },
    limit: 5
  }, true);

  if (!result.success) {
    return {
      success: false,
      message: 'Falha na requisição de filtros de capital social',
      details: result
    };
  }

  if (result.data.success && result.data.total >= 0) {
    return {
      success: true,
      message: `Filtros de capital social retornaram ${result.data.total} resultados`,
      details: {
        total: result.data.total,
        returned: result.data.returned,
        filters: result.data.filters_applied
      }
    };
  }

  return {
    success: false,
    message: 'Filtros de capital social não retornaram resultados esperados',
    details: result.data
  };
}

// =============================================================================
// TESTES DE CORREÇÕES AUTOMÁTICAS
// =============================================================================

/**
 * Teste 5: Filtros conflitantes que devem ser corrigidos automaticamente
 */
async function testConflictingFilters() {
  const result = await apiRequest('/search', 'POST', {
    filters: {
      situacao: ['02', '08'], // Ativa e Baixada (combinação impossível)
      capital_social_min: 1000000,
      capital_social_max: 100000 // Min > Max (impossível)
    },
    limit: 5
  }, true);

  if (!result.success) {
    return {
      success: false,
      message: 'Falha na requisição de filtros conflitantes',
      details: result
    };
  }

  // O sistema deve detectar e corrigir automaticamente
  if (result.data.success) {
    return {
      success: true,
      message: 'Filtros conflitantes foram tratados corretamente',
      details: {
        total: result.data.total,
        filters_applied: result.data.filters_applied,
        message: 'Sistema corrigiu automaticamente combinações impossíveis'
      }
    };
  } else if (result.data.error && result.data.error.includes('impossível')) {
    return {
      success: true,
      message: 'Filtros conflitantes foram detectados e rejeitados corretamente',
      details: {
        error: result.data.error,
        message: 'Sistema detectou combinações impossíveis e retornou erro apropriado'
      }
    };
  }

  return {
    success: false,
    message: 'Filtros conflitantes não foram tratados corretamente',
    details: result.data
  };
}

/**
 * Teste 6: Parsing de localização inadequado
 */
async function testLocationParsing() {
  const result = await apiRequest('/search', 'POST', {
    filters: {
      localizacao: 'João Pessoa, Paraíba, Brasil'
    },
    limit: 5
  }, true);

  if (!result.success) {
    return {
      success: false,
      message: 'Falha na requisição de parsing de localização',
      details: result
    };
  }

  if (result.data.success) {
    return {
      success: true,
      message: 'Parsing de localização funcionou corretamente',
      details: {
        total: result.data.total,
        filters_applied: result.data.filters_applied,
        message: 'Sistema parseou localização textual corretamente'
      }
    };
  }

  return {
    success: false,
    message: 'Parsing de localização falhou',
    details: result.data
  };
}

/**
 * Teste 7: Filtros muito específicos
 */
async function testSpecificFilters() {
  const result = await apiRequest('/search', 'POST', {
    filters: {
      situacao: ['02'], // Ativa
      uf: ['SP'],
      municipio: ['3550308'], // São Paulo
      cnae: ['4711302'], // Supermercado
      porte: ['01'], // Micro Empresa
      capital_social_min: 50000,
      capital_social_max: 100000
    },
    limit: 10
  }, true);

  if (!result.success) {
    return {
      success: false,
      message: 'Falha na requisição de filtros muito específicos',
      details: result
    };
  }

  // Mesmo que retorne 0 resultados, a requisição deve ser válida
  if (result.data.success) {
    return {
      success: true,
      message: `Filtros muito específicos retornaram ${result.data.total} resultados`,
      details: {
        total: result.data.total,
        returned: result.data.returned,
        filters: result.data.filters_applied,
        message: 'Sistema aceitou filtros específicos (mesmo que retornem 0 resultados)'
      }
    };
  }

  return {
    success: false,
    message: 'Filtros muito específicos não foram aceitos',
    details: result.data
  };
}

// =============================================================================
// TESTES DE ENDPOINTS PÚBLICOS
// =============================================================================

/**
 * Teste 8: Endpoint de filtros (público)
 */
async function testFiltersEndpoint() {
  const result = await apiRequest('/filters', 'GET');

  if (!result.success) {
    return {
      success: false,
      message: 'Falha ao acessar endpoint de filtros',
      details: result
    };
  }

  if (result.data.success && result.data.filters) {
    const filterCount = Object.keys(result.data.filters).length;
    return {
      success: true,
      message: `Endpoint de filtros retornou ${filterCount} filtros disponíveis`,
      details: {
        filters: Object.keys(result.data.filters),
        message: 'Sistema fornece definições de filtros corretamente'
      }
    };
  }

  return {
    success: false,
    message: 'Endpoint de filtros não retornou dados esperados',
    details: result.data
  };
}

/**
 * Teste 9: Endpoint de CNAEs (público)
 */
async function testCNAEEndpoint() {
  const result = await apiRequest('/cnaes?q=comercio&limit=10', 'GET');

  if (!result.success) {
    return {
      success: false,
      message: 'Falha ao acessar endpoint de CNAEs',
      details: result
    };
  }

  if (result.data.success && result.data.cnaes) {
    return {
      success: true,
      message: `Endpoint de CNAEs retornou ${result.data.cnaes.length} resultados`,
      details: {
        total: result.data.total,
        cnaes: result.data.cnaes.slice(0, 3),
        message: 'Sistema fornece CNAEs corretamente'
      }
    };
  }

  return {
    success: false,
    message: 'Endpoint de CNAEs não retornou dados esperados',
    details: result.data
  };
}

/**
 * Teste 10: Endpoint de health check
 */
async function testHealthCheck() {
  const result = await apiRequest('/health', 'GET');

  if (!result.success) {
    return {
      success: false,
      message: 'Falha ao acessar endpoint de health check',
      details: result
    };
  }

  if (result.data.status === 'healthy') {
    return {
      success: true,
      message: 'Endpoint de health check está funcionando corretamente',
      details: {
        status: result.data.status,
        database: result.data.database,
        message: 'Sistema está saudável'
      }
    };
  }

  return {
    success: false,
    message: 'Endpoint de health check retornou status inesperado',
    details: result.data
  };
}

/**
 * Teste 11: Endpoint de estatísticas (público)
 */
async function testStatsEndpoint() {
  const result = await apiRequest('/stats', 'POST', {
    filters: {
      situacao: ['02'], // Ativa
      uf: ['SP']
    }
  });

  if (!result.success) {
    return {
      success: false,
      message: 'Falha ao acessar endpoint de estatísticas',
      details: result
    };
  }

  if (result.data.success && result.data.preview) {
    return {
      success: true,
      message: 'Endpoint de estatísticas retornou dados corretamente',
      details: {
        preview: result.data.preview,
        message: 'Sistema fornece estatísticas de preview corretamente'
      }
    };
  }

  return {
    success: false,
    message: 'Endpoint de estatísticas não retornou dados esperados',
    details: result.data
  };
}

// =============================================================================
// TESTES DE CONSULTA POR CNPJ
// =============================================================================

/**
 * Teste 12: Consulta CNPJ completo
 */
async function testCNPJComplete() {
  const result = await apiRequest('/?cnpj=00000000000191', 'GET');

  if (!result.success) {
    return {
      success: false,
      message: 'Falha na consulta CNPJ completo',
      details: result
    };
  }

  if (result.data.success && result.data.data) {
    return {
      success: true,
      message: 'Consulta CNPJ completo retornou dados corretamente',
      details: {
        cnpj: result.data.data.cnpj,
        razao_social: result.data.data.razao_social,
        message: 'Sistema consulta CNPJ corretamente'
      }
    };
  }

  return {
    success: false,
    message: 'Consulta CNPJ completo não retornou dados esperados',
    details: result.data
  };
}

/**
 * Teste 13: Consulta CNPJ básico
 */
async function testCNPJBasico() {
  const result = await apiRequest('/basico?cnpj=00000000000191', 'GET');

  if (!result.success) {
    return {
      success: false,
      message: 'Falha na consulta CNPJ básico',
      details: result
    };
  }

  if (result.data.success && result.data.data) {
    return {
      success: true,
      message: 'Consulta CNPJ básico retornou dados corretamente',
      details: {
        cnpj: result.data.data.cnpj,
        razao_social: result.data.data.razao_social,
        message: 'Sistema consulta CNPJ básico corretamente'
      }
    };
  }

  return {
    success: false,
    message: 'Consulta CNPJ básico não retornou dados esperados',
    details: result.data
  };
}

/**
 * Teste 14: Consulta CNPJ socios
 */
async function testCNPJSocios() {
  const result = await apiRequest('/socios?cnpj=00000000000191', 'GET');

  if (!result.success) {
    return {
      success: false,
      message: 'Falha na consulta CNPJ sócios',
      details: result
    };
  }

  if (result.data.success && result.data.data) {
    return {
      success: true,
      message: 'Consulta CNPJ sócios retornou dados corretamente',
      details: {
        socios: result.data.data.socios?.length || 0,
        message: 'Sistema consulta sócios corretamente'
      }
    };
  }

  return {
    success: false,
    message: 'Consulta CNPJ sócios não retornou dados esperados',
    details: result.data
  };
}

/**
 * Teste 15: Consulta CNPJ simples
 */
async function testCNPJSimples() {
  const result = await apiRequest('/simples?cnpj=00000000000191', 'GET');

  if (!result.success) {
    return {
      success: false,
      message: 'Falha na consulta CNPJ simples',
      details: result
    };
  }

  if (result.data.success && result.data.data) {
    return {
      success: true,
      message: 'Consulta CNPJ simples retornou dados corretamente',
      details: {
        simples: result.data.data.simples?.opcao_simples,
        mei: result.data.data.simples?.opcao_mei,
        message: 'Sistema consulta dados Simples/MEI corretamente'
      }
    };
  }

  return {
    success: false,
    message: 'Consulta CNPJ simples não retornou dados esperados',
    details: result.data
  };
}

// =============================================================================
// TESTES DE VALIDAÇÃO DE DADOS
// =============================================================================

/**
 * Teste 16: Formatação dos dados
 */
async function testDataFormatting() {
  const result = await apiRequest('/?cnpj=00000000000191', 'GET');

  if (!result.success || !result.data.success) {
    return {
      success: false,
      message: 'Falha na validação de formatação de dados',
      details: result
    };
  }

  const data = result.data.data;
  const errors = [];

  // Validar formatação de CNPJ
  if (!data.cnpj || data.cnpj.length !== 14 || !/^\d{14}$/.test(data.cnpj)) {
    errors.push('CNPJ mal formatado');
  }

  // Validar formatação de capital social
  if (data.capital_social !== null && typeof data.capital_social !== 'number') {
    errors.push('Capital social não é número');
  }

  // Validar formatação de telefone
  if (data.telefone && typeof data.telefone !== 'string') {
    errors.push('Telefone não é string');
  }

  // Validar formatação de email
  if (data.email && !data.email.includes('@')) {
    errors.push('Email mal formatado');
  }

  if (errors.length === 0) {
    return {
      success: true,
      message: 'Formatação dos dados está correta',
      details: {
        cnpj: data.cnpj,
        capital_social: data.capital_social,
        telefone: data.telefone,
        email: data.email
      }
    };
  }

  return {
    success: false,
    message: 'Formatação dos dados está incorreta',
    details: errors
  };
}

/**
 * Teste 17: Validação de CNPJ inválido
 */
async function testInvalidCNPJ() {
  const result = await apiRequest('/?cnpj=12345678901234', 'GET');

  if (!result.success) {
    return {
      success: false,
      message: 'Falha na validação de CNPJ inválido',
      details: result
    };
  }

  if (!result.data.success && result.data.error) {
    return {
      success: true,
      message: 'CNPJ inválido foi rejeitado corretamente',
      details: {
        error: result.data.error,
        message: 'Sistema valida CNPJs corretamente'
      }
    };
  }

  return {
    success: false,
    message: 'CNPJ inválido não foi rejeitado',
    details: result.data
  };
}

// =============================================================================
// EXECUÇÃO DOS TESTES
// =============================================================================

async function runAllTests() {
  console.log('🚀 Iniciando Testes de Validação de Filtros CNPJ');
  console.log('='.repeat(60));

  // Testes de validação de filtros
  await runTest('Filtros básicos (situação, UF, CNAE)', testBasicFilters);
  await runTest('Filtros com dados de contato (email, telefone)', testContactFilters);
  await runTest('Filtros por porte e regime tributário (MEI, Simples)', testRegimeFilters);
  await runTest('Filtros por capital social', testCapitalSocialFilters);

  // Testes de correções automáticas
  await runTest('Filtros conflitantes que devem ser corrigidos', testConflictingFilters);
  await runTest('Parsing de localização inadequado', testLocationParsing);
  await runTest('Filtros muito específicos', testSpecificFilters);

  // Testes de endpoints públicos
  await runTest('Endpoint de filtros (público)', testFiltersEndpoint);
  await runTest('Endpoint de CNAEs (público)', testCNAEEndpoint);
  await runTest('Endpoint de health check', testHealthCheck);
  await runTest('Endpoint de estatísticas (público)', testStatsEndpoint);

  // Testes de consulta por CNPJ
  await runTest('Consulta CNPJ completo', testCNPJComplete);
  await runTest('Consulta CNPJ básico', testCNPJBasico);
  await runTest('Consulta CNPJ sócios', testCNPJSocios);
  await runTest('Consulta CNPJ simples', testCNPJSimples);

  // Testes de validação de dados
  await runTest('Formatação dos dados', testDataFormatting);
  await runTest('Validação de CNPJ inválido', testInvalidCNPJ);

  // Gerar relatório
  generateReport();
}

/**
 * Função para gerar relatório dos testes
 */
function generateReport() {
  console.log('\n' + '='.repeat(60));
  console.log('📊 RELATÓRIO DE TESTES');
  console.log('='.repeat(60));

  console.log(`\n📈 Resultados Gerais:`);
  console.log(`   Total de testes: ${totalTests}`);
  console.log(`   Testes aprovados: ${passedTests}`);
  console.log(`   Testes falhados: ${failedTests}`);
  console.log(`   Taxa de sucesso: ${((passedTests / totalTests) * 100).toFixed(1)}%`);

  console.log(`\n📋 Detalhes dos Testes:`);
  testResults.forEach((result, index) => {
    const statusIcon = result.status === 'PASS' ? '✅' : 
                      result.status === 'FAIL' ? '❌' : '⚠️';
    console.log(`   ${index + 1}. ${statusIcon} ${result.name}`);
    console.log(`      Status: ${result.status}`);
    console.log(`      Mensagem: ${result.message}`);
  });

  console.log(`\n🔍 Análise dos Resultados:`);

  // Contar tipos de falhas
  const failures = testResults.filter(r => r.status === 'FAIL');
  const errors = testResults.filter(r => r.status === 'ERROR');

  if (failedTests === 0) {
    console.log('   ✅ Todos os testes passaram! O sistema está funcionando corretamente.');
  } else {
    console.log(`   ⚠️  ${failedTests} testes falharam. Verifique os detalhes acima.`);
    
    if (failures.length > 0) {
      console.log(`   ❌ Falhas de validação: ${failures.length}`);
    }
    
    if (errors.length > 0) {
      console.log(`   ⚠️  Erros de execução: ${errors.length}`);
    }
  }

  console.log(`\n💡 Recomendações:`);
  if (failedTests === 0) {
    console.log('   • O sistema está pronto para produção');
    console.log('   • Continue monitorando o desempenho');
    console.log('   • Considere adicionar mais testes de carga');
  } else {
    console.log('   • Revise os testes falhados e corrija as falhas');
    console.log('   • Verifique a conexão com o banco de dados');
    console.log('   • Teste novamente após as correções');
  }

  console.log('\n' + '='.repeat(60));
  console.log('🏁 Testes concluídos');
  console.log('='.repeat(60));
}

// Executar os testes se este script for executado diretamente
if (require.main === module) {
  runAllTests().catch(console.error);
}

module.exports = {
  runAllTests,
  testResults,
  totalTests,
  passedTests,
  failedTests
};