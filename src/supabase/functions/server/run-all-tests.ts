/**
 * TEST RUNNER - Executa todos os testes das correções
 * 
 * Para executar:
 * deno run --allow-env --allow-net run-all-tests.ts
 */

import { testSingleton } from './test-singleton.ts';
import { testInterfaces } from './test-interfaces.ts';
import { testCache } from './test-cache.ts';
import { testProviderFactory } from './test-provider-factory.ts';
import { testCacheEndpoint } from './test-cache-endpoint.ts';

console.log('\n');
console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║                                                            ║');
console.log('║       🧪 SUITE DE TESTES DAS CORREÇÕES CRÍTICAS 🧪        ║');
console.log('║                                                            ║');
console.log('╚════════════════════════════════════════════════════════════╝');
console.log('\n');

// Executar todos os testes
const results = {
  singleton: false,
  interfaces: false,
  cache: false,
  providerFactory: false,
  cacheEndpoint: false
};

try {
  console.log('🚀 Iniciando execução dos testes...\n');
  
  // Teste 1: Singleton
  results.singleton = testSingleton();
  
  // Teste 2: Interfaces
  results.interfaces = testInterfaces();
  
  // Teste 3: Cache
  results.cache = testCache();
  
  // Teste 4: Provider Factory
  results.providerFactory = testProviderFactory();
  
  // Teste 5: Cache Endpoint
  results.cacheEndpoint = testCacheEndpoint();
  
} catch (error) {
  console.error('❌ Erro fatal durante execução dos testes:', error);
}

// Resumo final
console.log('\n');
console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║                   RESUMO DOS TESTES                        ║');
console.log('╚════════════════════════════════════════════════════════════╝');
console.log('\n');

const formatResult = (passed: boolean) => passed ? '✅ PASSOU' : '❌ FALHOU';

console.log(`📋 Teste #1 - Singleton do Supabase:      ${formatResult(results.singleton)}`);
console.log(`📋 Teste #2 - Interface Consistente:      ${formatResult(results.interfaces)}`);
console.log(`📋 Teste #3 - Cache de Tokens:            ${formatResult(results.cache)}`);
console.log(`📋 Teste #4 - Provider Factory com Cache: ${formatResult(results.providerFactory)}`);
console.log(`📋 Teste #5 - Endpoint de Estatísticas:   ${formatResult(results.cacheEndpoint)}`);

console.log('\n');

// Estatísticas
const total = Object.keys(results).length;
const passed = Object.values(results).filter(r => r === true).length;
const failed = total - passed;
const successRate = ((passed / total) * 100).toFixed(1);

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('📊 ESTATÍSTICAS:');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`   Total de testes:    ${total}`);
console.log(`   Testes aprovados:   ${passed}`);
console.log(`   Testes falhados:    ${failed}`);
console.log(`   Taxa de sucesso:    ${successRate}%`);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

console.log('\n');

if (passed === total) {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║                                                            ║');
  console.log('║          🎉 TODOS OS TESTES PASSARAM! 🎉                  ║');
  console.log('║                                                            ║');
  console.log('║     As correções estão funcionando perfeitamente!         ║');
  console.log('║                                                            ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
} else {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║                                                            ║');
  console.log('║          ⚠️  ALGUNS TESTES FALHARAM  ⚠️                   ║');
  console.log('║                                                            ║');
  console.log('║     Revise os logs acima para detalhes dos erros.         ║');
  console.log('║                                                            ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
}

console.log('\n');

// Exit code
Deno.exit(failed === 0 ? 0 : 1);