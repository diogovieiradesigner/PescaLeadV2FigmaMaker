/**
 * Script de teste para validar a geração de nomes personalizados para extrações CNPJ
 * Testa diferentes cenários de filtros e verifica se os nomes gerados estão corretos
 */

// Função de geração de nomes (copiada do código da Edge Function)
function generateExtractionName(filters, fallbackName) {
  // Se já temos um nome do frontend, usar ele
  if (fallbackName && fallbackName !== `CNPJ - ${new Date().toLocaleDateString('pt-BR')}`) {
    return fallbackName;
  }
  
  const parts = [];
  
  // Adicionar localização
  if (filters.uf && filters.uf.length > 0) {
    parts.push(filters.uf.join(', '));
  } else {
    parts.push('Brasil');
  }
  
  // Adicionar município, se disponível
  if (filters.municipio && filters.municipio.length > 0) {
    parts.push(filters.municipio.join(', '));
  }
  
  // Adicionar CNAE, se disponível
  if (filters.cnae && filters.cnae.length > 0) {
    const cnaeStr = filters.cnae.slice(0, 2).join(', ');
    parts.push(`CNAE: ${cnaeStr}${filters.cnae.length > 2 ? '...' : ''}`);
  }
  
  // Adicionar termo de busca, se disponível
  if (filters.termo && filters.termo.trim()) {
    parts.push(`Termo: ${filters.termo.trim()}`);
  }
  
  // Adicionar data/hora
  const now = new Date();
  const dateStr = now.toLocaleDateString('pt-BR');
  const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  parts.push(`${dateStr} ${timeStr}`);
  
  return parts.length > 0 ? `${parts.join(' | ')}` : `${dateStr}`;
}

// Cenários de teste
const testCases = [
  {
    name: 'Teste 1: Apenas UF',
    filters: { uf: ['PB'] },
    expectedPattern: /PB.*\d{2}\/\d{2}\/\d{4}.*\d{2}:\d{2}/
  },
  {
    name: 'Teste 2: UF + Município',
    filters: { uf: ['PB'], municipio: ['Campina Grande'] },
    expectedPattern: /PB \| Campina Grande.*\d{2}\/\d{2}\/\d{4}.*\d{2}:\d{2}/
  },
  {
    name: 'Teste 3: UF + CNAE único',
    filters: { uf: ['PB'], cnae: ['5611201'] },
    expectedPattern: /PB.*CNAE: 5611201.*\d{2}\/\d{2}\/\d{4}.*\d{2}:\d{2}/
  },
  {
    name: 'Teste 4: UF + CNAE múltiplos',
    filters: { uf: ['PB'], cnae: ['5611201', '5612103', '5613104'] },
    expectedPattern: /PB.*CNAE: 5611201, 5612103\.\.\..*\d{2}\/\d{2}\/\d{4}.*\d{2}:\d{2}/
  },
  {
    name: 'Teste 5: UF + Termo de busca',
    filters: { uf: ['PB'], termo: 'restaurante' },
    expectedPattern: /PB.*Termo: restaurante.*\d{2}\/\d{2}\/\d{4}.*\d{2}:\d{2}/
  },
  {
    name: 'Teste 6: Todos os filtros',
    filters: { 
      uf: ['PB'], 
      municipio: ['Campina Grande'], 
      cnae: ['5611201'], 
      termo: 'restaurante' 
    },
    expectedPattern: /PB \| Campina Grande.*CNAE: 5611201.*Termo: restaurante.*\d{2}\/\d{2}\/\d{4}.*\d{2}:\d{2}/
  },
  {
    name: 'Teste 7: Apenas data (sem filtros)',
    filters: {},
    expectedPattern: /\d{2}\/\d{2}\/\d{4}/
  },
  {
    name: 'Teste 8: Nome customizado do frontend',
    filters: { uf: ['PB'] },
    fallbackName: 'Minha Extração Personalizada',
    expectedPattern: /Minha Extração Personalizada/
  }
];

// Executar testes
console.log('=== TESTE DE GERAÇÃO DE NOMES PARA EXTRAÇÕES CNPJ ===\n');

let allTestsPassed = true;

testCases.forEach(test => {
  const name = generateExtractionName(test.filters, test.fallbackName);
  const passed = test.expectedPattern.test(name);
  
  if (!passed) {
    allTestsPassed = false;
    console.log(`❌ ${test.name} - FALHOU`);
    console.log(`   Nome gerado: ${name}`);
    console.log(`   Padrão esperado: ${test.expectedPattern}`);
  } else {
    console.log(`✅ ${test.name} - PASSOU`);
    console.log(`   Nome gerado: ${name}`);
  }
  console.log('');
});

if (allTestsPassed) {
  console.log('🎉 TODOS OS TESTES PASSARAM! 🎉');
} else {
  console.log('⚠️ ALGUNS TESTES FALHARAM. Verifique os logs acima. ⚠️');
}