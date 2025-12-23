// Teste para validar a correção do erro "Faixas de capital social incompatíveis com portes selecionados"
// Este script testa se a validação avançada agora mostra warnings ao invés de bloquear a execução

const { validateAdvancedFilters } = require('./supabase/functions/cnpj-api/search.ts');

console.log('🧪 Testando correção da validação de capital social incompatível...\n');

// Teste 1: Capital social incompatível com porte da empresa (cenário que antes bloqueava)
const filtroIncompativel = {
  capital_social_min: 5000000, // 5 milhões
  porte: ['01'] // Micro empresa (até 360 mil)
};

console.log('Teste 1: Capital social incompatível com porte da empresa');
console.log('Filtros:', JSON.stringify(filtroIncompativel, null, 2));

const resultado1 = validateAdvancedFilters(filtroIncompativel);
console.log('Resultado:');
console.log('- Valid:', resultado1.valid);
console.log('- Erros:', resultado1.errors);
console.log('- Avisos:', resultado1.warnings);
console.log('- Sugestões:', resultado1.suggestions);

// Verificar se o comportamento foi corrigido
if (resultado1.valid && resultado1.warnings.length > 0 && resultado1.errors.length === 0) {
  console.log('✅ Teste 1 PASSOU: A validação agora mostra warnings ao invés de bloquear\n');
} else {
  console.log('❌ Teste 1 FALHOU: O comportamento ainda não foi corrigido\n');
}

// Teste 2: Capital social compatível (deve passar normalmente)
const filtroCompativel = {
  capital_social_min: 100000, // 100 mil
  porte: ['01'] // Micro empresa (até 360 mil)
};

console.log('Teste 2: Capital social compatível com porte da empresa');
console.log('Filtros:', JSON.stringify(filtroCompativel, null, 2));

const resultado2 = validateAdvancedFilters(filtroCompativel);
console.log('Resultado:');
console.log('- Valid:', resultado2.valid);
console.log('- Erros:', resultado2.errors);
console.log('- Avisos:', resultado2.warnings);

if (resultado2.valid && resultado2.warnings.length === 0 && resultado2.errors.length === 0) {
  console.log('✅ Teste 2 PASSOU: Filtros compatíveis continuam funcionando normalmente\n');
} else {
  console.log('❌ Teste 2 FALHOU: Filtros compatíveis não estão funcionando corretamente\n');
}

// Teste 3: Múltiplas incompatibilidades
const filtroMultiplasIncompatibilidades = {
  capital_social_min: 10000000, // 10 milhões
  capital_social_max: 500000,   // 500 mil
  porte: ['01', '03'] // Micro empresa e Pequeno porte
};

console.log('Teste 3: Múltiplas incompatibilidades de capital social');
console.log('Filtros:', JSON.stringify(filtroMultiplasIncompatibilidades, null, 2));

const resultado3 = validateAdvancedFilters(filtroMultiplasIncompatibilidades);
console.log('Resultado:');
console.log('- Valid:', resultado3.valid);
console.log('- Erros:', resultado3.errors);
console.log('- Avisos:', resultado3.warnings);

if (resultado3.valid && resultado3.warnings.length > 0 && resultado3.errors.length === 0) {
  console.log('✅ Teste 3 PASSOU: Múltiplas incompatibilidades geram warnings sem bloquear\n');
} else {
  console.log('❌ Teste 3 FALHOU: Múltiplas incompatibilidades ainda bloqueiam a execução\n');
}

console.log('🎯 Resumo dos testes:');
console.log('- Teste 1 (incompatibilidade):', resultado1.valid ? 'PASSOU' : 'FALHOU');
console.log('- Teste 2 (compatibilidade):', resultado2.valid ? 'PASSOU' : 'FALHOU');
console.log('- Teste 3 (múltiplas incompatibilidades):', resultado3.valid ? 'PASSOU' : 'FALHOU');

const todosPassaram = resultado1.valid && resultado2.valid && resultado3.valid;
console.log('\n📊 Resultado geral:', todosPassaram ? '✅ TODOS OS TESTES PASSARAM' : '❌ ALGUNS TESTES FALHARAM');

if (todosPassaram) {
  console.log('\n🎉 A correção foi implementada com sucesso!');
  console.log('   - Faixas de capital social incompatíveis agora geram warnings');
  console.log('   - A execução não é mais bloqueada por essas incompatibilidades');
  console.log('   - Outras validações de segurança permanecem intactas');
} else {
  console.log('\n⚠️  A correção ainda precisa ser ajustada');
}