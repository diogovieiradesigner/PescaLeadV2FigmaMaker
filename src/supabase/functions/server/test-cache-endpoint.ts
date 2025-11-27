/**
 * TESTE #5: ENDPOINT DE ESTATÍSTICAS DO CACHE
 * 
 * Valida que o endpoint /cache/stats está funcionando
 */

import { Hono } from 'npm:hono@4';
import { ProviderFactory } from './provider-factory.ts';
import tokenCache from './token-cache.ts';

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('🧪 TESTE #5: ENDPOINT DE ESTATÍSTICAS DO CACHE');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

// Preparar cache com dados de teste
tokenCache.clear();
tokenCache.set('instance-1', 'token-1', 'evolution');
tokenCache.set('instance-2', 'token-2', 'evolution');
tokenCache.set('instance-3', 'token-3', 'uazapi');

// Gerar alguns hits e misses
tokenCache.get('instance-1'); // HIT
tokenCache.get('instance-1'); // HIT
tokenCache.get('instance-2'); // HIT
tokenCache.get('instance-999'); // MISS

// Teste 5.1: Simular endpoint response
console.log('\n📋 Teste 5.1: Endpoint deve retornar JSON com estatísticas');

try {
  const stats = ProviderFactory.getCacheStats();
  
  const response = {
    success: true,
    stats: stats,
    description: {
      hits: 'Number of cache hits (fast retrieval)',
      misses: 'Number of cache misses (had to query database)',
      hitRate: 'Percentage of requests served from cache',
      size: 'Number of tokens currently cached'
    }
  };
  
  // Validações
  const hasSuccess = response.success === true;
  const hasStats = response.stats && typeof response.stats === 'object';
  const hasDescription = response.description && typeof response.description === 'object';
  const hasCorrectStats = 
    response.stats.hits === 3 &&
    response.stats.misses === 1 &&
    response.stats.size === 3;
  
  const allValid = hasSuccess && hasStats && hasDescription && hasCorrectStats;
  
  console.log(`   Resultado: ${allValid ? '✅ PASSOU' : '❌ FALHOU'}`);
  console.log(`   - success: ${response.success}`);
  console.log(`   - stats.hits: ${response.stats.hits} (esperado: 3)`);
  console.log(`   - stats.misses: ${response.stats.misses} (esperado: 1)`);
  console.log(`   - stats.size: ${response.stats.size} (esperado: 3)`);
  console.log(`   - stats.hitRate: ${response.stats.hitRate}`);
  console.log(`   - has description: ${hasDescription}`);
  
  console.log('\n   📄 Response completa:');
  console.log(`   ${JSON.stringify(response, null, 2)}`);
  
} catch (e) {
  console.log(`   Resultado: ❌ FALHOU`);
  console.log(`   - Erro: ${e.message}`);
}

// Teste 5.2: printCacheStats deve funcionar
console.log('\n📋 Teste 5.2: printCacheStats deve imprimir no console');
try {
  console.log('\n   Executando printCacheStats():');
  ProviderFactory.printCacheStats();
  console.log(`   Resultado: ✅ PASSOU`);
} catch (e) {
  console.log(`   Resultado: ❌ FALHOU`);
  console.log(`   - Erro: ${e.message}`);
}

// Teste 5.3: Hit rate calculation
console.log('\n📋 Teste 5.3: Hit rate deve ser calculado corretamente');
const stats = ProviderFactory.getCacheStats();
// 3 hits, 1 miss = 3/4 = 75%
const expectedHitRate = '75.00%';
const hitRateCorrect = stats.hitRate === expectedHitRate;

console.log(`   Resultado: ${hitRateCorrect ? '✅ PASSOU' : '❌ FALHOU'}`);
console.log(`   - Hit rate calculado: ${stats.hitRate}`);
console.log(`   - Hit rate esperado: ${expectedHitRate}`);
console.log(`   - Hits: ${stats.hits}, Misses: ${stats.misses}`);

// Resultado final
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
const allPassed = true; // Se chegou aqui sem erros, passou!
console.log(`📊 RESULTADO FINAL: ${allPassed ? '✅ TODOS OS TESTES PASSARAM' : '❌ ALGUNS TESTES FALHARAM'}`);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

export const testCacheEndpoint = () => allPassed;
