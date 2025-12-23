/**
 * Teste funcional da Edge Function start-cnpj-extraction
 * Verifica se a função está funcionando corretamente no ambiente Supabase
 * 
 * Exemplos atualizados com casos práticos por segmento:
 * - Restaurantes (CNAE 5611201)
 * - Comércio varejista (CNAE 4711301/4711302)
 * - Serviços de informática (CNAE 6201501)
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nlbcwaxkeaddfocigwuk.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseKey) {
  console.error('Erro: A variável de ambiente SUPABASE_SERVICE_ROLE_KEY não está definida.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Configurações de teste por segmento
const testConfigs = {
  restaurantes: {
    name: 'Extração de Restaurantes - Fortaleza',
    filters: {
      uf: ['CE'],
      municipio: ['1389'], // Fortaleza
      cnae: ['5611201'],   // Restaurantes e similares
      situacao: ['02'],    // Ativas
      com_email: true,
      com_telefone: true
    },
    target_quantity: 50,
    description: 'Restaurantes em Fortaleza com contato'
  },
  
  comercio: {
    name: 'Extração de Supermercados - Brasília',
    filters: {
      uf: ['DF'],
      municipio: ['9701'], // Brasília
      cnae: ['4711301', '4711302'], // Hipermercados e Supermercados
      situacao: ['02'],    // Ativas
      porte: ['03', '05'], // Pequeno Porte e Demais
      capital_social_min: 100000
    },
    target_quantity: 30,
    description: 'Supermercados em Brasília com capital social'
  },
  
  ti: {
    name: 'Extração de Empresas de TI - São Paulo',
    filters: {
      uf: ['SP'],
      municipio: ['7107'], // São Paulo
      cnae_divisao: ['62'], // TI
      situacao: ['02'],    // Ativas
      idade_max_dias: 730  // Abertas nos últimos 2 anos
    },
    target_quantity: 100,
    description: 'Empresas de TI em São Paulo recentes'
  }
};

async function testStartCnpjExtraction(config, segmento) {
  console.log(`=== TESTE FUNCIONAL DA EDGE FUNCTION START-CNPJ-EXTRACTION ===`);
  console.log(`_SEGMENTO: ${segmento.toUpperCase()}_\n`);
  
  try {
    // Dados de teste
    const testData = {
      workspace_id: 'e4f9d774-7b8c-4b1e-b5f1-8d2a9b6e5c1f',
      extraction_name: `${config.name} - ${new Date().toISOString().split('T')[0]}`,
      filters: config.filters,
      target_quantity: config.target_quantity,
      funnel_id: 'f1a2b3c4-d5e6-7890-abcd-ef1234567890',
      column_id: 'c1a2b3c4-d5e6-7890-abcd-ef1234567890'
    };
    
    console.log('📋 Descrição:', config.description);
    console.log('📊 Quantidade alvo:', config.target_quantity);
    console.log('🔍 Filtros aplicados:');
    console.log(JSON.stringify(config.filters, null, 2));
    console.log('\n🚀 Enviando requisição para a Edge Function...\n');
    
    // Fazer a chamada para a Edge Function
    const response = await fetch(`${supabaseUrl}/functions/v1/start-cnpj-extraction`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`,
        'apikey': supabaseKey,
      },
      body: JSON.stringify(testData),
    });
    
    // Verificar o status da resposta
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Erro na resposta:', response.status);
      console.error('Detalhes:', errorText);
      return false;
    }
    
    // Parsear a resposta
    const result = await response.json();
    console.log('✅ Resposta recebida com sucesso!');
    console.log(JSON.stringify(result, null, 2));
    
    // Verificar se a extração foi criada corretamente
    if (result.success) {
      console.log('\n✅ Extração criada com sucesso!');
      console.log(`   Run ID: ${result.run_id}`);
      console.log(`   Extraction ID: ${result.extraction_id}`);
      console.log(`   Nome gerado: ${result.extraction_name}`);
      
      // Verificar o nome da extração
      const expectedCnae = config.filters.cnae ? config.filters.cnae[0] : 'divisão ' + config.filters.cnae_divisao[0];
      if (result.extraction_name && result.extraction_name.includes(config.name)) {
        console.log('✅ Nome da extração gerado corretamente!');
      } else {
        console.log('⚠️ Nome da extração não está no formato esperado.');
        console.log(`   Esperado: "${config.name}"`);
        console.log(`   Recebido: "${result.extraction_name}"`);
      }
      
      return true;
    } else {
      console.log('❌ Falha na criação da extração');
      console.log(`   Erro: ${result.error}`);
      if (result.details) {
        console.log(`   Detalhes: ${JSON.stringify(result.details)}`);
      }
      return false;
    }
    
  } catch (error) {
    console.error('❌ Erro durante o teste:', error);
    return false;
  }
}

// Função para testar todos os segmentos
async function runAllTests() {
  console.log('=== TESTE COMPLETO DE EXTRAÇÃO CNPJ POR SEGMENTO ===\n');
  
  let successCount = 0;
  const totalTests = Object.keys(testConfigs).length;
  
  // Testar cada segmento
  for (const [segmento, config] of Object.entries(testConfigs)) {
    console.log(`\n${'='.repeat(60)}`);
    const success = await testStartCnpjExtraction(config, segmento);
    if (success) {
      successCount++;
    }
    
    // Pequena pausa entre testes
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  // Resumo final
  console.log(`\n${'='.repeat(60)}`);
  console.log('=== RESUMO DOS TESTES ===');
  console.log(`✅ Testes bem sucedidos: ${successCount}/${totalTests}`);
  
  if (successCount === totalTests) {
    console.log('🎉 Todos os testes passaram! A função está funcionando corretamente.');
  } else {
    console.log('⚠️ Alguns testes falharam. Verifique os logs acima.');
  }
  
  console.log('\n📝 PRÓXIMOS PASSOS:');
  console.log('1. Verificar os resultados das extrações no sistema');
  console.log('2. Validar que os dados foram coletados corretamente');
  console.log('3. Confirmar que os filtros por segmento estão funcionando');
  
  console.log('\n📊 RECOMENDAÇÕES:');
  console.log('- Para produção, aumente target_quantity conforme necessário');
  console.log('- Monitore o desempenho das extrações grandes');
  console.log('- Consulte a documentação atualizada em DOCUMENTACAO_API_CNPJ.md');
  console.log('  para mais exemplos de combinações de filtros');
}

// Função para testar um segmento específico
async function runSingleTest(segmento) {
  if (!testConfigs[segmento]) {
    console.error(`❌ Segmento "${segmento}" não encontrado. Opções disponíveis:`, Object.keys(testConfigs).join(', '));
    return;
  }
  
  console.log(`=== TESTE INDIVIDUAL: ${segmento.toUpperCase()} ===\n`);
  await testStartCnpjExtraction(testConfigs[segmento], segmento);
}

// Executar o teste
// Opção 1: Testar todos os segmentos
runAllTests();

// Opção 2: Testar segmento específico (descomente para usar)
// runSingleTest('restaurantes'); // ou 'comercio' ou 'ti'