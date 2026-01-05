/**
 * Script para testar Edge Functions do Supabase Self-Hosted
 *
 * Uso:
 * node test-edge-function.mjs
 */

const SUPABASE_URL = 'https://supabase.pescalead.com.br';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5sYmN3YXhrZWFkZGZvY2lnd3VrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzM4NTY2NDQsImV4cCI6MjA0OTQzMjY0NH0.olWUrjDiqE2RFnT2kUC9ncToRgcIiHp04Tk7jg3b6I8';

console.log('🧪 Testando Edge Functions do Supabase Self-Hosted\n');
console.log('📍 URL:', SUPABASE_URL);
console.log('🔑 ANON_KEY:', ANON_KEY.substring(0, 50) + '...\n');

// =============================================================================
// TESTE 1: Health Check da Edge Function kanban-api (sem auth)
// =============================================================================
async function testHealthCheck() {
  console.log('─────────────────────────────────────────────────────');
  console.log('📋 TESTE 1: Health Check (sem autenticação)');
  console.log('─────────────────────────────────────────────────────');

  const url = `${SUPABASE_URL}/functions/v1/kanban-api/health`;
  console.log('URL:', url);

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'apikey': ANON_KEY, // ✅ Incluir apikey (exigido pelo Kong)
      }
    });

    console.log('Status:', response.status, response.statusText);
    console.log('Headers:', Object.fromEntries(response.headers));

    const contentType = response.headers.get('content-type');

    if (contentType && contentType.includes('application/json')) {
      const data = await response.json();
      console.log('✅ Resposta JSON:', JSON.stringify(data, null, 2));
    } else {
      const text = await response.text();
      console.log('⚠️  Resposta não-JSON:');
      console.log(text.substring(0, 500));
    }

    return response.ok;
  } catch (error) {
    console.error('❌ Erro na requisição:', error.message);
    return false;
  }
}

// =============================================================================
// TESTE 2: Login e obter access token
// =============================================================================
async function testLogin() {
  console.log('\n─────────────────────────────────────────────────────');
  console.log('📋 TESTE 2: Login para obter access token');
  console.log('─────────────────────────────────────────────────────');

  const url = `${SUPABASE_URL}/auth/v1/token?grant_type=password`;
  console.log('URL:', url);

  // Credenciais de teste
  const email = 'contato@pescalead.com.br';
  const password = 'Ctba2002';

  console.log('Email:', email);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': ANON_KEY,
      },
      body: JSON.stringify({ email, password })
    });

    console.log('Status:', response.status, response.statusText);

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Login bem-sucedido!');
      console.log('Access Token:', data.access_token.substring(0, 50) + '...');
      console.log('Token Type:', data.token_type);
      console.log('Expires In:', data.expires_in, 'segundos');
      return data.access_token;
    } else {
      const errorData = await response.json();
      console.log('❌ Erro no login:', errorData);
      return null;
    }
  } catch (error) {
    console.error('❌ Erro na requisição:', error.message);
    return null;
  }
}

// =============================================================================
// TESTE 3: Chamar kanban-api com autenticação
// =============================================================================
async function testKanbanApi(accessToken) {
  console.log('\n─────────────────────────────────────────────────────');
  console.log('📋 TESTE 3: Chamada à kanban-api (com auth)');
  console.log('─────────────────────────────────────────────────────');

  if (!accessToken) {
    console.log('⚠️  Pulando teste - sem access token');
    return;
  }

  // Substituir com IDs reais do seu workspace/funnel
  const workspaceId = '5adbffd6-830e-4737-b415-39b291f3c940'; // ⚠️ SUBSTITUIR
  const funnelId = 'f85e4ece-9f2a-445f-8979-bf2ab600e9e0'; // ⚠️ SUBSTITUIR

  const url = `${SUPABASE_URL}/functions/v1/kanban-api/workspaces/${workspaceId}/funnels/${funnelId}/leads?mode=kanban&limit=10`;
  console.log('URL:', url);

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'apikey': ANON_KEY, // ✅ Incluir apikey (exigido pelo Kong)
      }
    });

    console.log('Status:', response.status, response.statusText);
    console.log('Headers:', Object.fromEntries(response.headers));

    const contentType = response.headers.get('content-type');

    if (contentType && contentType.includes('application/json')) {
      const data = await response.json();
      console.log('✅ Resposta JSON:');
      console.log(JSON.stringify(data, null, 2).substring(0, 500));
    } else {
      const text = await response.text();
      console.log('⚠️  Resposta não-JSON:');
      console.log(text.substring(0, 500));
    }
  } catch (error) {
    console.error('❌ Erro na requisição:', error.message);
  }
}

// =============================================================================
// TESTE 4: Verificar outras Edge Functions
// =============================================================================
async function testMakeServer() {
  console.log('\n─────────────────────────────────────────────────────');
  console.log('📋 TESTE 4: Verificar make-server-e4f9d774');
  console.log('─────────────────────────────────────────────────────');

  const url = `${SUPABASE_URL}/functions/v1/make-server-e4f9d774/health`;
  console.log('URL:', url);

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'apikey': ANON_KEY, // ✅ Incluir apikey (exigido pelo Kong)
      }
    });

    console.log('Status:', response.status, response.statusText);

    const contentType = response.headers.get('content-type');

    if (contentType && contentType.includes('application/json')) {
      const data = await response.json();
      console.log('✅ Resposta JSON:', JSON.stringify(data, null, 2));
    } else {
      const text = await response.text();
      console.log('⚠️  Resposta não-JSON:');
      console.log(text.substring(0, 500));
    }
  } catch (error) {
    console.error('❌ Erro na requisição:', error.message);
  }
}

// =============================================================================
// EXECUTAR TESTES
// =============================================================================
async function main() {
  console.log('═════════════════════════════════════════════════════');
  console.log('🚀 INICIANDO DIAGNÓSTICO DE EDGE FUNCTIONS');
  console.log('═════════════════════════════════════════════════════\n');

  const healthOk = await testHealthCheck();

  if (healthOk) {
    console.log('\n✅ Health check passou! Edge Function está respondendo.');

    // Tentar login
    const accessToken = await testLogin();

    if (accessToken) {
      await testKanbanApi(accessToken);
    }
  } else {
    console.log('\n❌ Health check falhou! Possíveis causas:');
    console.log('   1. Edge Function não deployada');
    console.log('   2. Kong não está roteando corretamente');
    console.log('   3. Container edge-functions offline');
    console.log('   4. Variáveis de ambiente faltando');
  }

  await testMakeServer();

  console.log('\n═════════════════════════════════════════════════════');
  console.log('✅ DIAGNÓSTICO CONCLUÍDO');
  console.log('═════════════════════════════════════════════════════');
  console.log('\n📝 PRÓXIMOS PASSOS:');
  console.log('   1. Se health check falhou: verificar logs do Kong');
  console.log('   2. Se login falhou: verificar credenciais');
  console.log('   3. Se kanban-api falhou: verificar logs da função');
  console.log('\n💡 COMANDOS ÚTEIS (via Termius):');
  console.log('   docker logs kong-e400cgo4408ockg8oco4sk8w --tail 50');
  console.log('   docker logs 41abcf296a3e_supabase-edge-functions-e400cgo4408ockg8oco4sk8w --tail 50');
  console.log('   docker ps | grep supabase');
}

main().catch(console.error);
