// =============================================================================
// EDGE FUNCTION: enrich-cnpj V2 (COM MERGE DE ARRAYS)
// =============================================================================
import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { workspace_id, batch_size = 10 } = await req.json()
    
    console.log(`🏢 [CNPJ V2] Processando ${batch_size} leads`)
    
    const query = supabase
      .from('lead_extraction_staging')
      .select('id, cnpj_normalized, cnpj_data, phones, emails')
      .not('cnpj_normalized', 'is', null)
      .eq('cnpj_enriched', false)
      .limit(batch_size)
    
    if (workspace_id) {
      query.eq('workspace_id', workspace_id)
    }
    
    const { data: leads, error } = await query
    
    if (error) throw error
    if (!leads || leads.length === 0) {
      console.log('✅ Nenhum CNPJ pendente')
      return new Response(JSON.stringify({ success: true, enriched: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    
    console.log(`📋 Encontrados ${leads.length} CNPJs`)
    
    let enriched = 0
    
    for (const lead of leads) {
      try {
        const cnpj = lead.cnpj_normalized
        console.log(`\n🔍 Consultando CNPJ: ${cnpj}`)
        
        const cnpjData = await fetchCNPJData(cnpj)
        
        if (!cnpjData || cnpjData.error) {
          console.log(`⏭️  CNPJ não encontrado ou erro`)
          
          await supabase
            .from('lead_extraction_staging')
            .update({
              cnpj_enriched: true,
              cnpj_checked_at: new Date().toISOString(),
              cnpj_provider: 'none'
            })
            .eq('id', lead.id)
          
          continue
        }
        
        console.log(`✅ CNPJ encontrado:`)
        console.log(`   Razão Social: ${cnpjData.razao_social}`)
        console.log(`   Telefone: ${cnpjData.telefone || 'N/A'}`)
        console.log(`   Email: ${cnpjData.email || 'N/A'}`)
        
        const cnpjPhones = []
        if (cnpjData.telefone) {
          cnpjPhones.push({
            number: cnpjData.telefone,
            source: 'cnpj',
            type: cnpjData.telefone.length === 10 ? 'landline' : 'mobile',
            verified: true
          })
        }
        
        if (cnpjData.ddd && cnpjData.telefone_fixo) {
          const fullPhone = cnpjData.ddd + cnpjData.telefone_fixo
          cnpjPhones.push({
            number: fullPhone,
            source: 'cnpj',
            type: 'landline',
            verified: true
          })
        }
        
        const cnpjEmails = []
        if (cnpjData.email && cnpjData.email.includes('@')) {
          cnpjEmails.push({
            address: cnpjData.email.toLowerCase().trim(),
            source: 'cnpj',
            type: 'main',
            verified: true
          })
        }
        
        const cnpjDataToSave = {
          ...cnpjData,
          phones: cnpjPhones,
          emails: cnpjEmails
        }
        
        const { error: updateError } = await supabase
          .from('lead_extraction_staging')
          .update({
            cnpj_data: cnpjDataToSave,
            cnpj_enriched: true,
            cnpj_checked_at: new Date().toISOString(),
            cnpj_provider: cnpjData.provider || 'opencnpj'
          })
          .eq('id', lead.id)
        
        if (updateError) {
          console.error(`❌ Erro ao atualizar ${lead.id}:`, updateError.message)
        } else {
          enriched++
          console.log(`✅ CNPJ salvo - Trigger V2 vai consolidar!`)
        }
        
        await new Promise(resolve => setTimeout(resolve, 3000))
        
      } catch (leadError) {
        console.error(`❌ Erro no lead ${lead.id}:`, leadError.message)
        
        await supabase
          .from('lead_extraction_staging')
          .update({
            cnpj_enriched: true,
            cnpj_checked_at: new Date().toISOString(),
            cnpj_provider: 'error'
          })
          .eq('id', lead.id)
      }
    }
    
    console.log(`\n✅ [CNPJ V2] Enriquecidos: ${enriched}`)
    
    return new Response(JSON.stringify({
      success: true,
      enriched
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('❌ [CNPJ V2] Erro:', error)
    return new Response(JSON.stringify({
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

async function fetchCNPJData(cnpj: string): Promise<any> {
  const cleanCNPJ = cnpj.replace(/\\D/g, '')
  
  try {
    console.log('  Tentando OpenCNPJ...')
    const openResponse = await fetch(
      `https://api.cnpja.com.br/office/${cleanCNPJ}`,
      {
        headers: {
          'Authorization': Deno.env.get('OPENCNPJ_API_KEY') || ''
        }
      }
    )
    
    if (openResponse.ok) {
      const data = await openResponse.json()
      console.log('  ✅ OpenCNPJ')
      return {
        ...data,
        provider: 'opencnpj',
        cnpj: cleanCNPJ,
        razao_social: data.company?.name || data.razao_social,
        nome_fantasia: data.alias || data.nome_fantasia,
        telefone: data.phone || data.telefone,
        email: data.email,
        situacao: data.status?.text || data.situacao,
        atividade_principal: data.mainActivity?.text || data.atividade_principal,
        logradouro: data.address?.street || data.logradouro,
        numero: data.address?.number || data.numero,
        complemento: data.address?.details || data.complemento,
        bairro: data.address?.district || data.bairro,
        municipio: data.address?.city || data.municipio,
        uf: data.address?.state || data.uf,
        cep: data.address?.zip || data.cep
      }
    }
  } catch (error) {
    console.log(`  ❌ OpenCNPJ: ${error.message}`)
  }
  
  try {
    console.log('  Tentando BrasilAPI...')
    const brasilResponse = await fetch(
      `https://brasilapi.com.br/api/cnpj/v1/${cleanCNPJ}`
    )
    
    if (brasilResponse.ok) {
      const data = await brasilResponse.json()
      console.log('  ✅ BrasilAPI')
      return {
        ...data,
        provider: 'brasilapi',
        cnpj: cleanCNPJ,
        telefone: data.ddd_telefone_1 || data.telefone,
        ddd: data.ddd_telefone_1?.substring(0, 2),
        telefone_fixo: data.ddd_telefone_1?.substring(2)
      }
    }
  } catch (error) {
    console.log(`  ❌ BrasilAPI: ${error.message}`)
  }
  
  return null
}