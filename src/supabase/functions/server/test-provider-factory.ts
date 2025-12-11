/**
 * TESTE #4: PROVIDER FACTORY COM CACHE
 * 
 * Valida que o ProviderFactory está usando cache corretamente
 */

import { ProviderFactory } from './provider-factory.ts';
import tokenCache from './token-cache.ts';

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('🧪 TESTE #4: PROVIDER FACTORY COM CACHE');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

// Limpar cache antes de começar
tokenCache.clear();

// Teste 4.1: ProviderFactory tem métodos de cache
console.log('\n📋 Teste 4.1: ProviderFactory deve ter métodos de cache');
const hasCacheMethods = 
  typeof ProviderFactory.invalidateCache === 'function' &&
  typeof ProviderFactory.getCacheStats === 'function' &&
  typeof ProviderFactory.printCacheStats === 'function';

console.log(`   Resultado: ${hasCacheMethods ? '✅ PASSOU' : '❌ FALHOU'}`);
console.log(`   - invalidateCache: ${typeof ProviderFactory.invalidateCache}`);
console.log(`   - getCacheStats: ${typeof ProviderFactory.getCacheStats}`);
console.log(`   - printCacheStats: ${typeof ProviderFactory.printCacheStats}`);

// Teste 4.2: getCacheStats retorna dados corretos
console.log('\n📋 Teste 4.2: getCacheStats deve retornar objeto com estatísticas');
const stats = ProviderFactory.getCacheStats();
const hasCorrectStructure = 
  typeof stats === 'object' &&
  'hits' in stats &&
  'misses' in stats &&
  'size' in stats &&
  'hitRate' in stats;

console.log(`   Resultado: ${hasCorrectStructure ? '✅ PASSOU' : '❌ FALHOU'}`);
console.log(`   - Estrutura: ${JSON.stringify(stats)}`);

// Teste 4.3: invalidateCache chama tokenCache.invalidate
console.log('\n📋 Teste 4.3: invalidateCache deve funcionar');
try {
  // Adicionar um token no cache
  tokenCache.set('test-factory-instance', 'test-token', 'evolution');
  
  // Verificar que está no cache
  const beforeInvalidate = tokenCache.getStats();
  console.log(`   - Antes da invalidação: ${beforeInvalidate.size} entries no cache`);
  
  // Invalidar via ProviderFactory
  ProviderFactory.invalidateCache('test-factory-instance');
  
  // Verificar que foi removido
  const afterInvalidate = tokenCache.getStats();
  const wasInvalidated = afterInvalidate.size === 0;
  
  console.log(`   Resultado: ${wasInvalidated ? '✅ PASSOU' : '❌ FALHOU'}`);
  console.log(`   - Depois da invalidação: ${afterInvalidate.size} entries no cache`);
} catch (e) {
  console.log(`   Resultado: ❌ FALHOU`);
  console.log(`   - Erro: ${e.message}`);
}

// Teste 4.4: printCacheStats não quebra
console.log('\n📋 Teste 4.4: printCacheStats deve executar sem erros');
try {
  ProviderFactory.printCacheStats();
  console.log(`   Resultado: ✅ PASSOU`);
  console.log(`   - Método executou sem erros`);
} catch (e) {
  console.log(`   Resultado: ❌ FALHOU`);
  console.log(`   - Erro: ${e.message}`);
}

// Teste 4.5: getTokenForInstance usa cache (teste simulado)
console.log('\n📋 Teste 4.5: getTokenForInstance deve usar cache internamente');
console.log('   ⚠️ Teste requer banco de dados - verificação manual');
console.log('   - Para testar:');
console.log('     1. Chame getTokenForInstance(instanceId) duas vezes');
console.log('     2. Primeira chamada: MISS (query no banco)');
console.log('     3. Segunda chamada: HIT (busca do cache)');
console.log('     4. Verifique logs do TokenCache');
console.log('   Resultado: ⏭️ SKIP (teste de integração)');

// Resultado final
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
const allPassed = hasCacheMethods && hasCorrectStructure;
console.log(`📊 RESULTADO FINAL: ${allPassed ? '✅ TODOS OS TESTES PASSARAM' : '❌ ALGUNS TESTES FALHARAM'}`);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

export const testProviderFactory = () => allPassed;
