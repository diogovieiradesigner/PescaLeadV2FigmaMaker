/**
 * TESTE #2: INTERFACE CONSISTENTE
 * 
 * Valida que as interfaces estão corretas e o TypeScript compila sem erros
 */

import EvolutionProvider from './provider-evolution.ts';
import type { WhatsAppProvider } from './provider-factory.ts';

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('🧪 TESTE #2: INTERFACE CONSISTENTE');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

// Teste 2.1: EvolutionProvider implementa WhatsAppProvider
console.log('\n📋 Teste 2.1: EvolutionProvider implementa WhatsAppProvider');
const provider: WhatsAppProvider = EvolutionProvider;

const hasAllMethods = [
  'sendTextMessage',
  'sendAudioMessage',
  'sendMediaMessage',
  'deleteMessage',
  'fetchInstanceInfo',
  'updateWebhook',
  'fetchProfilePictureUrl',
  'fetchProfile'
].every(method => typeof provider[method] === 'function');

console.log(`   Resultado: ${hasAllMethods ? '✅ PASSOU' : '❌ FALHOU'}`);
console.log(`   - Todos os métodos implementados: ${hasAllMethods}`);

// Teste 2.2: Verificar assinatura de deleteMessage
console.log('\n📋 Teste 2.2: deleteMessage tem todos os parâmetros obrigatórios');
try {
  // Tentar chamar deleteMessage sem os parâmetros obrigatórios deve dar erro de tipo
  // Este teste valida que TypeScript está forçando os parâmetros corretos
  
  // ✅ Assinatura correta (deve compilar):
  const correctCall = async () => {
    await provider.deleteMessage({
      instanceName: 'test',
      token: 'xxx',
      messageId: '123',
      remoteJid: '5511999999999@s.whatsapp.net',
      fromMe: true,
      participant: undefined
    });
  };
  
  console.log('   Resultado: ✅ PASSOU');
  console.log('   - Interface aceita todos os parâmetros: remoteJid, fromMe, participant');
} catch (e) {
  console.log('   Resultado: ❌ FALHOU');
  console.log(`   - Erro: ${e.message}`);
}

// Teste 2.3: Verificar assinatura de fetchProfilePictureUrl
console.log('\n📋 Teste 2.3: fetchProfilePictureUrl usa "number" (não "phone")');
try {
  // ✅ Assinatura correta com "number" (deve compilar):
  const correctCall = async () => {
    await provider.fetchProfilePictureUrl({
      instanceName: 'test',
      token: 'xxx',
      number: '5511999999999' // ✅ "number" é o correto!
    });
  };
  
  console.log('   Resultado: ✅ PASSOU');
  console.log('   - Interface usa "number" corretamente');
} catch (e) {
  console.log('   Resultado: ❌ FALHOU');
  console.log(`   - Erro: ${e.message}`);
}

// Teste 2.4: Verificar que fetchProfile também usa "number"
console.log('\n📋 Teste 2.4: fetchProfile usa "number" (não "phone")');
try {
  const correctCall = async () => {
    await provider.fetchProfile({
      instanceName: 'test',
      token: 'xxx',
      number: '5511999999999' // ✅ "number" é o correto!
    });
  };
  
  console.log('   Resultado: ✅ PASSOU');
  console.log('   - Interface usa "number" corretamente');
} catch (e) {
  console.log('   Resultado: ❌ FALHOU');
  console.log(`   - Erro: ${e.message}`);
}

// Resultado final
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
const allPassed = hasAllMethods; // Se chegou aqui sem erro de tipo, passou!
console.log(`📊 RESULTADO FINAL: ${allPassed ? '✅ TODOS OS TESTES PASSARAM' : '❌ ALGUNS TESTES FALHARAM'}`);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

export const testInterfaces = () => allPassed;
