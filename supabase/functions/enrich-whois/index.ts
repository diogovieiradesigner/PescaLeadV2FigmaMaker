// =============================================================================
// EDGE FUNCTION: enrich-whois V2 (COM MERGE DE ARRAYS)
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
    
    console.log(`🌐 [WHOIS V2] Processando ${batch_size} leads`)
    
    const query = supabase
      .from('lead_extraction_staging')
      .select('id, domain, whois_data, phones, emails, websites')
      .not('domain', 'is', null)
      .eq('whois_enriched', false)
      .like('domain', '%.br')
      .limit(batch_size)
    
    if (workspace_id) {
      query.eq('workspace_id', workspace_id)
    }
    
    const { data: leads, error } = await query
    
    if (error) throw error
    if (!leads || leads.length === 0) {
      console.log('✅ Nenhum domínio .br pendente')
      return new Response(JSON.stringify({ success: true, enriched: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    
    console.log(`📋 Encontrados ${leads.length} domínios .br`)
    
    let enriched = 0
    
    for (const lead of leads) {
      try {
        const domain = lead.domain
        console.log(`\n🔍 Consultando WHOIS: ${domain}`)
        
        const whoisData = await fetchWhoisData(domain)
        
        if (!whoisData || !whoisData.dominio) {
          console.log(`⏭️  Sem dados WHOIS`)
          
          await supabase
            .from('lead_extraction_staging')
            .update({
              whois_enriched: true,
              whois_checked_at: new Date().toISOString()
            })
            .eq('id', lead.id)
          
          continue
        }
        
        console.log(`✅ WHOIS encontrado:`)
        console.log(`   CNPJ: ${whoisData.cnpj || 'N/A'}`)
        console.log(`   Telefone: ${whoisData.telefone || 'N/A'}`)
        console.log(`   Emails: ${whoisData.emails?.length || 0}`)
        
        const whoisPhones = []
        if (whoisData.telefone) {
          whoisPhones.push({
            number: whoisData.telefone,
            source: 'whois',
            verified: false
          })
        }
        
        const whoisEmails = []
        if (whoisData.emails && Array.isArray(whoisData.emails)) {
          whoisData.emails.forEach((email: string) => {
            if (email && email.includes('@')) {
              whoisEmails.push({
                address: email.toLowerCase().trim(),
                source: 'whois',
                verified: false
              })
            }
          })
        }
        
        const whoisWebsites = []
        if (whoisData.dominio) {
          whoisWebsites.push({
            url: `https://${whoisData.dominio}`,
            domain: whoisData.dominio,
            source: 'whois',
            type: 'main'
          })
        }
        
        const whoisDataToSave = {
          ...whoisData,
          phones: whoisPhones,
          emails: whoisEmails,
          websites: whoisWebsites
        }
        
        const { error: updateError } = await supabase
          .from('lead_extraction_staging')
          .update({
            whois_data: whoisDataToSave,
            whois_enriched: true,
            whois_checked_at: new Date().toISOString()
          })
          .eq('id', lead.id)
        
        if (updateError) {
          console.error(`❌ Erro ao atualizar ${lead.id}:`, updateError.message)
        } else {
          enriched++
          console.log(`✅ WHOIS salvo - Trigger V2 vai consolidar!`)
        }
        
        await new Promise(resolve => setTimeout(resolve, 3000))
        
      } catch (leadError) {
        console.error(`❌ Erro no lead ${lead.id}:`, leadError.message)
        
        await supabase
          .from('lead_extraction_staging')
          .update({
            whois_enriched: true,
            whois_checked_at: new Date().toISOString()
          })
          .eq('id', lead.id)
      }
    }
    
    console.log(`\n✅ [WHOIS V2] Enriquecidos: ${enriched}`)
    
    return new Response(JSON.stringify({
      success: true,
      enriched
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('❌ [WHOIS V2] Erro:', error)
    return new Response(JSON.stringify({
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

async function fetchWhoisData(domain: string): Promise<any> {
  const workerUrl = 'https://whois-br-api.your-worker.workers.dev'
  
  try {
    const response = await fetch(`${workerUrl}?domain=${domain}`, {
      headers: {
        'User-Agent': 'Supabase-Edge-Function/1.0'
      }
    })
    
    if (!response.ok) {
      throw new Error(`WHOIS API error: ${response.status}`)
    }
    
    return await response.json()
  } catch (error) {
    console.error(`Erro ao buscar WHOIS ${domain}:`, error.message)
    return null
  }
}