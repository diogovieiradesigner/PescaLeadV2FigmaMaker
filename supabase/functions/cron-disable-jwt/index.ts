import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const SUPABASE_ACCESS_TOKEN = Deno.env.get('SUPABASE_ACCESS_TOKEN')!;
const PROJECT_REF = 'nlbcwaxkeaddfocigwuk';

interface EdgeFunction {
  id: string;
  slug: string;
  name: string;
  verify_jwt: boolean;
}

Deno.serve(async (req: Request) => {
  try {
    // Verificar autorização (cron interno ou chamada manual)
    const authHeader = req.headers.get('Authorization');
    const cronSecret = req.headers.get('x-cron-secret');
    const expectedSecret = Deno.env.get('CRON_SECRET');
    
    // Aceita Bearer token do Supabase ou secret do cron
    if (!authHeader && cronSecret !== expectedSecret) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    console.log('🔍 Buscando Edge Functions...');
    
    // Listar todas as Edge Functions
    const listResponse = await fetch(
      `https://api.supabase.com/v1/projects/${PROJECT_REF}/functions`,
      {
        headers: {
          'Authorization': `Bearer ${SUPABASE_ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!listResponse.ok) {
      const error = await listResponse.text();
      console.error('Erro ao listar funções:', error);
      return new Response(JSON.stringify({ error: 'Falha ao listar funções', details: error }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const functions: EdgeFunction[] = await listResponse.json();
    console.log(`📋 Total de funções: ${functions.length}`);

    // Filtrar funções com JWT habilitado
    const functionsWithJwt = functions.filter(f => f.verify_jwt === true);
    console.log(`⚠️ Funções com JWT habilitado: ${functionsWithJwt.length}`);

    if (functionsWithJwt.length === 0) {
      console.log('✅ Todas as funções já estão com JWT desabilitado!');
      return new Response(JSON.stringify({
        success: true,
        message: 'Todas as funções já estão com JWT desabilitado',
        total_functions: functions.length,
        functions_with_jwt: 0,
        updated: []
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Desabilitar JWT em cada função
    const results: { slug: string; success: boolean; error?: string }[] = [];
    
    for (const func of functionsWithJwt) {
      console.log(`🔧 Desabilitando JWT para: ${func.slug}`);
      
      try {
        const updateResponse = await fetch(
          `https://api.supabase.com/v1/projects/${PROJECT_REF}/functions/${func.slug}`,
          {
            method: 'PATCH',
            headers: {
              'Authorization': `Bearer ${SUPABASE_ACCESS_TOKEN}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              verify_jwt: false
            })
          }
        );

        if (updateResponse.ok) {
          console.log(`✅ JWT desabilitado: ${func.slug}`);
          results.push({ slug: func.slug, success: true });
        } else {
          const error = await updateResponse.text();
          console.error(`❌ Erro ao atualizar ${func.slug}:`, error);
          results.push({ slug: func.slug, success: false, error });
        }
      } catch (err) {
        console.error(`❌ Exceção ao atualizar ${func.slug}:`, err);
        results.push({ slug: func.slug, success: false, error: String(err) });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    console.log(`\n📊 Resumo: ${successCount} atualizadas, ${failCount} falharam`);

    return new Response(JSON.stringify({
      success: failCount === 0,
      message: `${successCount} funções atualizadas, ${failCount} falharam`,
      total_functions: functions.length,
      functions_with_jwt: functionsWithJwt.length,
      updated: results
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Erro geral:', error);
    return new Response(JSON.stringify({ 
      error: 'Erro interno', 
      details: String(error) 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});