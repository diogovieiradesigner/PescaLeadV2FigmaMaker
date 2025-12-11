import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Configuração
const PROJECT_REF = 'nlbcwaxkeaddfocigwuk';

// Funções que DEVEM manter JWT ativo (chamadas pelo frontend com auth do usuário)
const FUNCTIONS_KEEP_JWT = [
  'ai-preview-chat',      // Preview chat usa token do usuário
  'start-extraction',     // Extração iniciada pelo usuário
];

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Obter access token do Supabase Management API
    // Precisa estar configurado no Vault
    const SUPABASE_ACCESS_TOKEN = Deno.env.get('SUPABASE_ACCESS_TOKEN');
    
    if (!SUPABASE_ACCESS_TOKEN) {
      throw new Error('SUPABASE_ACCESS_TOKEN não configurado no ambiente');
    }

    console.log('[disable-jwt] 🔍 Buscando lista de Edge Functions...');

    // Listar todas as Edge Functions
    const listResponse = await fetch(
      `https://api.supabase.com/v1/projects/${PROJECT_REF}/functions`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${SUPABASE_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!listResponse.ok) {
      const error = await listResponse.text();
      throw new Error(`Erro ao listar funções: ${listResponse.status} - ${error}`);
    }

    const functions = await listResponse.json();
    console.log(`[disable-jwt] 📋 Encontradas ${functions.length} funções`);

    const results = {
      total: functions.length,
      updated: 0,
      skipped: 0,
      errors: 0,
      details: [] as any[]
    };

    // Para cada função, verificar e desativar JWT se necessário
    for (const fn of functions) {
      const functionSlug = fn.slug;
      const currentJwtEnabled = fn.verify_jwt;

      // Pular funções que devem manter JWT
      if (FUNCTIONS_KEEP_JWT.includes(functionSlug)) {
        console.log(`[disable-jwt] ⏭️ ${functionSlug}: mantendo JWT (lista de exceções)`);
        results.skipped++;
        results.details.push({
          slug: functionSlug,
          action: 'skipped',
          reason: 'Na lista de exceções (FUNCTIONS_KEEP_JWT)',
          jwt_enabled: currentJwtEnabled
        });
        continue;
      }

      // Se JWT já está desativado, pular
      if (!currentJwtEnabled) {
        console.log(`[disable-jwt] ✅ ${functionSlug}: JWT já desativado`);
        results.skipped++;
        results.details.push({
          slug: functionSlug,
          action: 'skipped',
          reason: 'JWT já estava desativado',
          jwt_enabled: false
        });
        continue;
      }

      // Desativar JWT
      console.log(`[disable-jwt] 🔧 ${functionSlug}: desativando JWT...`);
      
      try {
        const updateResponse = await fetch(
          `https://api.supabase.com/v1/projects/${PROJECT_REF}/functions/${functionSlug}`,
          {
            method: 'PATCH',
            headers: {
              'Authorization': `Bearer ${SUPABASE_ACCESS_TOKEN}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              verify_jwt: false
            })
          }
        );

        if (!updateResponse.ok) {
          const error = await updateResponse.text();
          console.error(`[disable-jwt] ❌ ${functionSlug}: erro - ${error}`);
          results.errors++;
          results.details.push({
            slug: functionSlug,
            action: 'error',
            error: error,
            jwt_enabled: currentJwtEnabled
          });
          continue;
        }

        console.log(`[disable-jwt] ✅ ${functionSlug}: JWT desativado com sucesso`);
        results.updated++;
        results.details.push({
          slug: functionSlug,
          action: 'updated',
          jwt_enabled: false,
          was_enabled: true
        });

      } catch (updateError) {
        console.error(`[disable-jwt] ❌ ${functionSlug}: ${updateError.message}`);
        results.errors++;
        results.details.push({
          slug: functionSlug,
          action: 'error',
          error: updateError.message
        });
      }
    }

    console.log(`[disable-jwt] 📊 Resumo: ${results.updated} atualizadas, ${results.skipped} ignoradas, ${results.errors} erros`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Verificação concluída: ${results.updated} funções atualizadas`,
        results
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('[disable-jwt] ❌ Erro geral:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});