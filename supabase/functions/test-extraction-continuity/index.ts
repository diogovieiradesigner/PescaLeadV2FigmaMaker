// Teste de continuidade - Chama start-extraction
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

serve(async (req) => {
  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    console.log('=== TESTE DE CONTINUIDADE ===');
    console.log('Run ID: 9803dbb1-6da7-4502-9ab7-d0ed2e18ae19');
    
    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/start-extraction`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SERVICE_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          run_id: '9803dbb1-6da7-4502-9ab7-d0ed2e18ae19'
        })
      }
    );
    
    const result = await response.json();
    console.log('Resposta:', JSON.stringify(result, null, 2));
    
    // Verificar se começou da página correta
    const expectedStartPage = 5; // Baseado no histórico = 4
    const actualStartPage = result.history?.start_page || 0;
    
    return new Response(JSON.stringify({
      test: 'CONTINUITY_CHECK',
      expected_start_page: expectedStartPage,
      actual_start_page: actualStartPage,
      passed: actualStartPage === expectedStartPage,
      full_response: result
    }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500
    });
  }
});