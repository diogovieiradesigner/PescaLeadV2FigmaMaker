import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CNPJData {
  cnpj: string;
  razao_social?: string;
  nome_fantasia?: string;
  situacao_cadastral?: string;
  data_inicio_atividade?: string;
  cnae_principal?: string;
  porte_empresa?: string;
  capital_social?: string;
  natureza_juridica?: string;
  email?: string;
  telefones?: string[];
  endereco?: {
    logradouro?: string;
    numero?: string;
    complemento?: string;
    bairro?: string;
    cep?: string;
    municipio?: string;
    uf?: string;
  };
  qsa?: Array<{
    nome: string;
    qualificacao: string;
  }>;
  provider: 'opencnpj' | 'brasilapi';
}

// Normalizar dados do OpenCNPJ
function normalizeOpenCNPJ(data: any): CNPJData {
  return {
    cnpj: data.cnpj,
    razao_social: data.razao_social,
    nome_fantasia: data.nome_fantasia,
    situacao_cadastral: data.situacao_cadastral,
    data_inicio_atividade: data.data_inicio_atividade,
    cnae_principal: data.cnae_principal,
    porte_empresa: data.porte_empresa,
    capital_social: data.capital_social,
    natureza_juridica: data.natureza_juridica,
    email: data.email,
    telefones: data.telefones?.map((t: any) => 
      `(${t.ddd}) ${t.numero}${t.is_fax ? ' (Fax)' : ''}`
    ) || [],
    endereco: {
      logradouro: data.logradouro,
      numero: data.numero,
      complemento: data.complemento,
      bairro: data.bairro,
      cep: data.cep,
      municipio: data.municipio,
      uf: data.uf,
    },
    qsa: data.QSA?.slice(0, 5).map((q: any) => ({
      nome: q.nome_socio,
      qualificacao: q.qualificacao_socio,
    })) || [],
    provider: 'opencnpj',
  };
}

// Normalizar dados do BrasilAPI
function normalizeBrasilAPI(data: any): CNPJData {
  return {
    cnpj: data.cnpj,
    razao_social: data.razao_social,
    nome_fantasia: data.nome_fantasia,
    situacao_cadastral: data.descricao_situacao_cadastral,
    data_inicio_atividade: data.data_inicio_atividade,
    cnae_principal: data.cnae_fiscal ? 
      `${data.cnae_fiscal} - ${data.cnae_fiscal_descricao}` : undefined,
    porte_empresa: data.porte,
    capital_social: data.capital_social?.toString(),
    natureza_juridica: data.natureza_juridica,
    email: data.email,
    telefones: [
      data.ddd_telefone_1 ? `(${data.ddd_telefone_1.slice(0, 2)}) ${data.ddd_telefone_1.slice(2)}` : null,
      data.ddd_telefone_2 ? `(${data.ddd_telefone_2.slice(0, 2)}) ${data.ddd_telefone_2.slice(2)}` : null,
    ].filter(Boolean) as string[],
    endereco: {
      logradouro: data.logradouro,
      numero: data.numero,
      complemento: data.complemento,
      bairro: data.bairro,
      cep: data.cep,
      municipio: data.municipio,
      uf: data.uf,
    },
    qsa: data.qsa?.slice(0, 5).map((q: any) => ({
      nome: q.nome_socio,
      qualificacao: q.qualificacao_socio,
    })) || [],
    provider: 'brasilapi',
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Extrair CNPJ da URL
    const url = new URL(req.url);
    const cnpj = url.searchParams.get('cnpj');

    if (!cnpj) {
      return new Response(JSON.stringify({ 
        error: 'CNPJ is required',
        usage: 'GET /cnpj?cnpj=00000000000000'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Normalizar CNPJ (remover pontuação)
    const cnpjClean = cnpj.replace(/[^0-9]/g, '');

    if (cnpjClean.length !== 14) {
      return new Response(JSON.stringify({ 
        error: 'Invalid CNPJ format',
        hint: 'CNPJ must have 14 digits'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`🔍 [CNPJ-API] Fetching CNPJ ${cnpjClean}`);

    // Chamar a função enrich-cnpj interna
    const enrichResponse = await fetch(
      `${Deno.env.get('SUPABASE_URL')}/functions/v1/enrich-cnpj`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
        },
        body: JSON.stringify({ cnpj: cnpjClean }),
      }
    );

    if (!enrichResponse.ok) {
      const errorText = await enrichResponse.text();
      throw new Error(`Enrich-cnpj failed: ${enrichResponse.status} - ${errorText}`);
    }

    const enrichData = await enrichResponse.json();

    if (!enrichData.success) {
      return new Response(JSON.stringify({ 
        error: 'CNPJ not found or unavailable',
        details: enrichData.error
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Normalizar resposta baseado no provider
    let normalizedData: CNPJData;
    
    if (enrichData.provider === 'opencnpj') {
      normalizedData = normalizeOpenCNPJ(enrichData.data);
    } else if (enrichData.provider === 'brasilapi') {
      normalizedData = normalizeBrasilAPI(enrichData.data);
    } else {
      throw new Error('Unknown provider');
    }

    console.log(`✅ [CNPJ-API] CNPJ ${cnpjClean} found via ${enrichData.provider}`);

    return new Response(JSON.stringify(normalizedData), {
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/json',
        'X-Provider': enrichData.provider,
      },
    });

  } catch (error) {
    console.error('❌ [CNPJ-API] Error:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      message: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
