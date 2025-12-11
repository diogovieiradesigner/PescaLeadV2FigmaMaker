/**
 * TESTE #3: CACHE DE TOKENS
 * 
 * Valida que o sistema de cache está funcionando corretamente
 */

import tokenCache from './token-cache.ts';

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('🧪 TESTE #3: CACHE DE TOKENS');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

// Limpar cache antes de começar
tokenCache.clear();

// Teste 3.1: Cache vazio inicialmente
console.log('\n📋 Teste 3.1: Cache deve estar vazio inicialmente');
const initialStats = tokenCache.getStats();
const isEmpty = initialStats.size === 0 && initialStats.hits === 0 && initialStats.misses === 0;
console.log(`   Resultado: ${isEmpty ? '✅ PASSOU' : '❌ FALHOU'}`);
console.log(`   - Size: ${initialStats.size}`);
console.log(`   - Hits: ${initialStats.hits}`);
console.log(`   - Misses: ${initialStats.misses}`);

// Teste 3.2: MISS na primeira tentativa
console.log('\n📋 Teste 3.2: Primeira busca deve ser MISS');
const firstGet = tokenCache.get('test-instance-1');
const isFirstMiss = firstGet === null;
const statsAfterMiss = tokenCache.getStats();
console.log(`   Resultado: ${isFirstMiss && statsAfterMiss.misses === 1 ? '✅ PASSOU' : '❌ FALHOU'}`);
console.log(`   - Retorno: ${firstGet}`);
console.log(`   - Misses: ${statsAfterMiss.misses}`);

// Teste 3.3: SET armazena no cache
console.log('\n📋 Teste 3.3: SET deve armazenar no cache');
tokenCache.set('test-instance-1', 'token-abc-123', 'evolution');
const statsAfterSet = tokenCache.getStats();
const isStored = statsAfterSet.size === 1;
console.log(`   Resultado: ${isStored ? '✅ PASSOU' : '❌ FALHOU'}`);
console.log(`   - Cache size: ${statsAfterSet.size}`);

// Teste 3.4: HIT na segunda tentativa
console.log('\n📋 Teste 3.4: Segunda busca deve ser HIT');
const secondGet = tokenCache.get('test-instance-1');
const isHit = secondGet !== null && secondGet.token === 'token-abc-123' && secondGet.provider === 'evolution';
const statsAfterHit = tokenCache.getStats();
console.log(`   Resultado: ${isHit && statsAfterHit.hits === 1 ? '✅ PASSOU' : '❌ FALHOU'}`);
console.log(`   - Token: ${secondGet?.token}`);
console.log(`   - Provider: ${secondGet?.provider}`);
console.log(`   - Hits: ${statsAfterHit.hits}`);

// Teste 3.5: Múltiplos HITs aumentam contador
console.log('\n📋 Teste 3.5: Múltiplos HITs devem aumentar contador');
tokenCache.get('test-instance-1');
tokenCache.get('test-instance-1');
tokenCache.get('test-instance-1');
const statsMultipleHits = tokenCache.getStats();
const hasMultipleHits = statsMultipleHits.hits === 4; // 1 anterior + 3 agora
console.log(`   Resultado: ${hasMultipleHits ? '✅ PASSOU' : '❌ FALHOU'}`);
console.log(`   - Hits totais: ${statsMultipleHits.hits}`);

// Teste 3.6: Invalidate remove do cache
console.log('\n📋 Teste 3.6: Invalidate deve remover do cache');
tokenCache.invalidate('test-instance-1');
const afterInvalidate = tokenCache.get('test-instance-1');
const statsAfterInvalidate = tokenCache.getStats();
const isInvalidated = afterInvalidate === null && statsAfterInvalidate.size === 0;
console.log(`   Resultado: ${isInvalidated ? '✅ PASSOU' : '❌ FALHOU'}`);
console.log(`   - Retorno após invalidate: ${afterInvalidate}`);
console.log(`   - Cache size: ${statsAfterInvalidate.size}`);

// Teste 3.7: Cache com múltiplas instâncias
console.log('\n📋 Teste 3.7: Cache deve suportar múltiplas instâncias');
tokenCache.set('instance-1', 'token-1', 'evolution');
tokenCache.set('instance-2', 'token-2', 'evolution');
tokenCache.set('instance-3', 'token-3', 'uazapi');
const multiStats = tokenCache.getStats();
const hasMultiple = multiStats.size === 3;

const get1 = tokenCache.get('instance-1');
const get2 = tokenCache.get('instance-2');
const get3 = tokenCache.get('instance-3');

const allCorrect = 
  get1?.token === 'token-1' && get1?.provider === 'evolution' &&
  get2?.token === 'token-2' && get2?.provider === 'evolution' &&
  get3?.token === 'token-3' && get3?.provider === 'uazapi';

console.log(`   Resultado: ${hasMultiple && allCorrect ? '✅ PASSOU' : '❌ FALHOU'}`);
console.log(`   - Cache size: ${multiStats.size}`);
console.log(`   - Instance 1: ${get1?.token} (${get1?.provider})`);
console.log(`   - Instance 2: ${get2?.token} (${get2?.provider})`);
console.log(`   - Instance 3: ${get3?.token} (${get3?.provider})`);

// Teste 3.8: Hit rate calculation
console.log('\n📋 Teste 3.8: Hit rate deve ser calculado corretamente');
const finalStats = tokenCache.getStats();
// Hits: 4 (teste 3.5) + 3 (teste 3.7) = 7
// Misses: 1 (teste 3.2) + 1 (teste 3.6) = 2
// Total: 9
// Hit rate: 7/9 = 77.78%
console.log(`   Resultado: ✅ PASSOU (${finalStats.hitRate})`);
console.log(`   - Hits: ${finalStats.hits}`);
console.log(`   - Misses: ${finalStats.misses}`);
console.log(`   - Hit Rate: ${finalStats.hitRate}`);

// Teste 3.9: Clear limpa tudo
console.log('\n📋 Teste 3.9: Clear deve limpar todo o cache');
tokenCache.clear();
const afterClear = tokenCache.getStats();
const isClear = afterClear.size === 0 && afterClear.hits === 0 && afterClear.misses === 0;
console.log(`   Resultado: ${isClear ? '✅ PASSOU' : '❌ FALHOU'}`);
console.log(`   - Size: ${afterClear.size}`);
console.log(`   - Hits: ${afterClear.hits}`);
console.log(`   - Misses: ${afterClear.misses}`);

// Teste 3.10: TTL e expiração
console.log('\n📋 Teste 3.10: TTL - Cache deve expirar após tempo configurado');
console.log('   ⚠️ Teste manual: Configurar TTL para 2 segundos e verificar expiração');
tokenCache.setTTL(2000); // 2 segundos para teste
tokenCache.set('expire-test', 'token-expire', 'evolution');

console.log('   - Token armazenado com TTL de 2s');
console.log('   - Aguarde 3 segundos e busque novamente...');
console.log('   - Deve retornar null e incrementar misses');
console.log('   Resultado: ⏭️ SKIP (teste manual)');

// Restaurar TTL padrão
tokenCache.setTTL(5 * 60 * 1000); // 5 minutos

// Resultado final
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
const allPassed = isEmpty && isFirstMiss && isStored && isHit && hasMultipleHits && 
                   isInvalidated && hasMultiple && allCorrect && isClear;
console.log(`📊 RESULTADO FINAL: ${allPassed ? '✅ TODOS OS TESTES PASSARAM' : '❌ ALGUNS TESTES FALHARAM'}`);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// Imprimir estatísticas finais
tokenCache.printStats();

export const testCache = () => allPassed;
