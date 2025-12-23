#!/usr/bin/env node

/**
 * Script de Teste Rápido para Validação de Filtros CNPJ
 * 
 * Este script executa testes rápidos para validar funcionalidades críticas
 * sem a necessidade de executar todos os testes.
 */

const fetch = require('node-fetch');

// Configurações rápidas
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:54321/functions/v1/cnpj-api';
const SUPABASE_URL = process.env.SUPABASE_URL || 'http://localhost:54321';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

let quickTests = 0;
let passedQuickTests = 0;

async function quickTest(name, testFn) {
  quickTests++;
  console.log(`\n⚡ Teste rápido: ${name}`);
  
  try {
    const result = await testFn();
    if (result.success) {
      passedQuickTests++;
      console.log(`✅ PASSOU: ${name}`);
      return true;
    } else {
      console.log(`❌ FALHOU: ${name} - ${result.message}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ ERRO: ${name} - ${error.message}`);
    return false;
  }
}

async function apiRequest(endpoint, method = 'GET', body = null) {
  const headers = {
    'Content-Type': 'application/json',
    'apikey': SUPABASE_ANON_KEY
  };

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
      data
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

async function runQuickTests() {
  console.log('⚡ Iniciando Testes Rápidos CNPJ');
  console.log('='.repeat(40));

  // Teste 1: Health Check
  await quickTest('Health Check', async () => {
    const result = await apiRequest('/health', 'GET');
    return result.success && result.data.status === 'healthy'
      ? { success: true, message: 'API está saudável' }
      : { success: false, message: 'API não está saudável' };
  });

  // Teste 2: Filtros Disponíveis
  await quickTest('Filtros Disponíveis', async () => {
    const result = await apiRequest('/filters', 'GET');
    const hasFilters = result.success && result.data.success && result.data.filters;
    return hasFilters
      ? { success: true, message: 'Filtros disponíveis' }
      : { success: false, message: 'Filtros não disponíveis' };
  });

  // Teste 3: CNAEs Disponíveis
  await quickTest('CNAEs Disponíveis', async () => {
    const result = await apiRequest('/cnaes?q=comercio&limit=5', 'GET');
    const hasCNAEs = result.success && result.data.success && result.data.cnaes && result.data.cnaes.length > 0;
    return hasCNAEs
      ? { success: true, message: 'CNAEs disponíveis' }
      : { success: false, message: 'CNAEs não disponíveis' };
  });

  // Teste 4: Estatísticas Básicas
  await quickTest('Estatísticas Básicas', async () => {
    const result = await apiRequest('/stats', 'POST', {
      filters: {
        situacao: ['02'], // Ativa
        uf: ['SP']
      }
    });
    const hasStats = result.success && result.data.success && result.data.preview;
    return hasStats
      ? { success: true, message: 'Estatísticas disponíveis' }
      : { success: false, message: 'Estatísticas não disponíveis' };
  });

  // Teste 5: Consulta CNPJ Simples
  await quickTest('Consulta CNPJ Simples', async () => {
    const result = await apiRequest('/basico?cnpj=00000000000191', 'GET');
    const hasData = result.success && result.data.success && result.data.data;
    return hasData
      ? { success: true, message: 'Consulta CNPJ funciona' }
      : { success: false, message: 'Consulta CNPJ falhou' };
  });

  // Resumo rápido
  console.log('\n' + '='.repeat(40));
  console.log('📊 RESUMO RÁPIDO');
  console.log('='.repeat(40));
  console.log(`Total: ${quickTests}`);
  console.log(`Aprovados: ${passedQuickTests}`);
  console.log(`Falhados: ${quickTests - passedQuickTests}`);
  console.log(`Taxa: ${((passedQuickTests / quickTests) * 100).toFixed(1)}%`);

  if (passedQuickTests === quickTests) {
    console.log('\n✅ Todos os testes rápidos passaram!');
    console.log('O sistema está pronto para testes completos.');
  } else {
    console.log('\n⚠️  Alguns testes falharam.');
    console.log('Verifique a configuração antes de prosseguir.');
  }

  console.log('='.repeat(40));
}

if (require.main === module) {
  runQuickTests().catch(console.error);
}

module.exports = { runQuickTests };