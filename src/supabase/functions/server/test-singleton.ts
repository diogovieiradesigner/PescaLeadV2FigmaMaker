/**
 * TESTE #1: SINGLETON DO SUPABASE CLIENT
 * 
 * Valida que apenas uma instância do client é criada e reutilizada
 */

import { getSupabaseServiceClient, getSupabaseAnonClient } from './supabase-client.ts';

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('🧪 TESTE #1: SINGLETON DO SUPABASE CLIENT');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

// Teste 1.1: Service Client é singleton
console.log('\n📋 Teste 1.1: Service Client deve ser singleton');
const serviceClient1 = getSupabaseServiceClient();
const serviceClient2 = getSupabaseServiceClient();
const serviceClient3 = getSupabaseServiceClient();

const isSameInstance = serviceClient1 === serviceClient2 && serviceClient2 === serviceClient3;
console.log(`   Resultado: ${isSameInstance ? '✅ PASSOU' : '❌ FALHOU'}`);
console.log(`   - Cliente 1: ${serviceClient1 ? 'criado' : 'null'}`);
console.log(`   - Cliente 2: ${serviceClient2 ? 'criado' : 'null'}`);
console.log(`   - Cliente 3: ${serviceClient3 ? 'criado' : 'null'}`);
console.log(`   - Mesma instância: ${isSameInstance}`);

// Teste 1.2: Anon Client é singleton
console.log('\n📋 Teste 1.2: Anon Client deve ser singleton');
const anonClient1 = getSupabaseAnonClient();
const anonClient2 = getSupabaseAnonClient();
const anonClient3 = getSupabaseAnonClient();

const isSameAnonInstance = anonClient1 === anonClient2 && anonClient2 === anonClient3;
console.log(`   Resultado: ${isSameAnonInstance ? '✅ PASSOU' : '❌ FALHOU'}`);
console.log(`   - Cliente 1: ${anonClient1 ? 'criado' : 'null'}`);
console.log(`   - Cliente 2: ${anonClient2 ? 'criado' : 'null'}`);
console.log(`   - Cliente 3: ${anonClient3 ? 'criado' : 'null'}`);
console.log(`   - Mesma instância: ${isSameAnonInstance}`);

// Teste 1.3: Service e Anon são instâncias diferentes
console.log('\n📋 Teste 1.3: Service e Anon devem ser instâncias diferentes');
const areDifferent = serviceClient1 !== anonClient1;
console.log(`   Resultado: ${areDifferent ? '✅ PASSOU' : '❌ FALHOU'}`);
console.log(`   - São diferentes: ${areDifferent}`);

// Resultado final
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
const allPassed = isSameInstance && isSameAnonInstance && areDifferent;
console.log(`📊 RESULTADO FINAL: ${allPassed ? '✅ TODOS OS TESTES PASSARAM' : '❌ ALGUNS TESTES FALHARAM'}`);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

export const testSingleton = () => allPassed;
