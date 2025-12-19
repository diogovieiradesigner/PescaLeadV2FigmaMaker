// =============================================================================
// CNPJ-EXTRACTION-CRON
// Processa fila de migração de leads CNPJ automaticamente
// Chamada pelo pg_cron a cada 30 segundos
// =============================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface QueueMessage {
  run_id: string;
  workspace_id: string;
  funnel_id: string;
  column_id: string;
  batch_size?: number;
}

interface StagingLead {
  id: string;
  run_id: string;
  workspace_id: string;
  cnpj: string;
  razao_social: string | null;
  nome_fantasia: string | null;
  email: string | null;
  telefone: string | null;
  uf: string | null;
  municipio: string | null;
  cnae: string | null;
  cnae_descricao: string | null;
  porte: string | null;
  capital_social: number | null;
  situacao: string | null;
  data_abertura: string | null;
  tipo: string | null;
  simples: boolean | null;
  mei: boolean | null;
  raw_data: any;
  funnel_id: string;
  column_id: string;
}

// Mapeamento de campos CNPJ para custom_fields
interface CustomFieldMapping {
  cnpj?: string;
  razao_social?: string;
  nome_fantasia?: string;
  porte?: string;
  capital_social?: string;
  cidade_uf?: string;
  cnae?: string;
  simples?: string;
  situacao?: string;
  data_abertura?: string;
  email?: string;
  telefone?: string;
  tipo?: string; // Matriz/Filial
}

// Definição dos campos CNPJ que devem existir
const CNPJ_CUSTOM_FIELDS = [
  { name: 'CNPJ', field_type: 'text', mappingKey: 'cnpj' },
  { name: 'Razão Social', field_type: 'text', mappingKey: 'razao_social' },
  { name: 'Nome Fantasia', field_type: 'text', mappingKey: 'nome_fantasia' },
  { name: 'Porte da Empresa', field_type: 'text', mappingKey: 'porte' },
  { name: 'Capital Social', field_type: 'text', mappingKey: 'capital_social' },
  { name: 'Cidade/UF', field_type: 'text', mappingKey: 'cidade_uf' },
  { name: 'CNAE Principal', field_type: 'text', mappingKey: 'cnae' },
  { name: 'Simples Nacional', field_type: 'text', mappingKey: 'simples' },
  { name: 'Situação Cadastral', field_type: 'text', mappingKey: 'situacao' },
  { name: 'Data Abertura', field_type: 'text', mappingKey: 'data_abertura' },
  { name: 'Email Principal', field_type: 'email', mappingKey: 'email' },
  { name: 'Telefone Principal', field_type: 'phone', mappingKey: 'telefone' },
  { name: 'Tipo (Matriz/Filial)', field_type: 'text', mappingKey: 'tipo' },
] as const;

// Função para buscar ou criar campos personalizados
async function getOrCreateCustomFields(supabase: any, workspaceId: string): Promise<CustomFieldMapping> {
  const fieldNames = CNPJ_CUSTOM_FIELDS.map(f => f.name);

  // 1. Buscar campos existentes
  const { data: existingFields, error: fetchError } = await supabase
    .from('custom_fields')
    .select('id, name')
    .eq('workspace_id', workspaceId)
    .in('name', fieldNames);

  if (fetchError) {
    console.error('[getOrCreateCustomFields] Error fetching custom fields:', fetchError);
    return {};
  }

  // 2. Criar mapa de campos existentes
  const existingMap = new Map<string, string>();
  for (const field of existingFields || []) {
    existingMap.set(field.name, field.id);
  }

  // 3. Identificar campos que precisam ser criados
  const fieldsToCreate = CNPJ_CUSTOM_FIELDS.filter(f => !existingMap.has(f.name));

  if (fieldsToCreate.length > 0) {
    console.log(`[cnpj-cron] Creating ${fieldsToCreate.length} missing custom fields...`);

    // Buscar a última posição usada no workspace
    const { data: lastField } = await supabase
      .from('custom_fields')
      .select('position')
      .eq('workspace_id', workspaceId)
      .order('position', { ascending: false })
      .limit(1)
      .single();

    let nextPosition = (lastField?.position || 0) + 1;

    // Criar campos em batch
    const newFields = fieldsToCreate.map(f => ({
      workspace_id: workspaceId,
      name: f.name,
      field_type: f.field_type,
      is_required: false,
      position: nextPosition++,
    }));

    const { data: createdFields, error: createError } = await supabase
      .from('custom_fields')
      .insert(newFields)
      .select('id, name');

    if (createError) {
      console.error('[cnpj-cron] Error creating custom fields:', createError);
    } else if (createdFields) {
      for (const field of createdFields) {
        existingMap.set(field.name, field.id);
      }
    }
  }

  // 4. Construir mapeamento final
  const mapping: CustomFieldMapping = {};

  for (const fieldDef of CNPJ_CUSTOM_FIELDS) {
    const fieldId = existingMap.get(fieldDef.name);
    if (fieldId) {
      (mapping as any)[fieldDef.mappingKey] = fieldId;
    }
  }

  return mapping;
}

// Função para inserir valores nos campos personalizados
async function insertCustomFieldValues(
  supabase: any,
  leadId: string,
  staging: StagingLead,
  fieldMapping: CustomFieldMapping
): Promise<void> {
  const customValues: { lead_id: string; custom_field_id: string; value: string }[] = [];

  // Formatar CNPJ: 00.000.000/0000-00
  const formatCnpj = (cnpj: string) => {
    const clean = cnpj.replace(/\D/g, '');
    return clean.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
  };

  // Adicionar valores apenas se o campo existir e houver valor
  if (fieldMapping.cnpj && staging.cnpj) {
    customValues.push({ lead_id: leadId, custom_field_id: fieldMapping.cnpj, value: formatCnpj(staging.cnpj) });
  }
  if (fieldMapping.razao_social && staging.razao_social) {
    customValues.push({ lead_id: leadId, custom_field_id: fieldMapping.razao_social, value: staging.razao_social });
  }
  if (fieldMapping.nome_fantasia && staging.nome_fantasia) {
    customValues.push({ lead_id: leadId, custom_field_id: fieldMapping.nome_fantasia, value: staging.nome_fantasia });
  }
  if (fieldMapping.porte && staging.porte) {
    customValues.push({ lead_id: leadId, custom_field_id: fieldMapping.porte, value: staging.porte });
  }
  if (fieldMapping.capital_social && staging.capital_social) {
    const capitalFormatted = `R$ ${staging.capital_social.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
    customValues.push({ lead_id: leadId, custom_field_id: fieldMapping.capital_social, value: capitalFormatted });
  }
  if (fieldMapping.cidade_uf && (staging.municipio || staging.uf)) {
    const cidadeUf = [staging.municipio, staging.uf].filter(Boolean).join('/');
    customValues.push({ lead_id: leadId, custom_field_id: fieldMapping.cidade_uf, value: cidadeUf });
  }
  if (fieldMapping.cnae && staging.cnae) {
    const cnaeValue = staging.cnae_descricao ? `${staging.cnae} - ${staging.cnae_descricao}` : staging.cnae;
    customValues.push({ lead_id: leadId, custom_field_id: fieldMapping.cnae, value: cnaeValue });
  }
  if (fieldMapping.simples) {
    const simplesValue = staging.simples ? 'Sim' : (staging.mei ? 'MEI' : 'Não');
    customValues.push({ lead_id: leadId, custom_field_id: fieldMapping.simples, value: simplesValue });
  }
  if (fieldMapping.situacao && staging.situacao) {
    customValues.push({ lead_id: leadId, custom_field_id: fieldMapping.situacao, value: staging.situacao });
  }
  if (fieldMapping.data_abertura && staging.data_abertura) {
    const [year, month, day] = staging.data_abertura.split('-');
    const dataFormatted = `${day}/${month}/${year}`;
    customValues.push({ lead_id: leadId, custom_field_id: fieldMapping.data_abertura, value: dataFormatted });
  }
  if (fieldMapping.email && staging.email) {
    customValues.push({ lead_id: leadId, custom_field_id: fieldMapping.email, value: staging.email });
  }
  if (fieldMapping.telefone && staging.telefone) {
    customValues.push({ lead_id: leadId, custom_field_id: fieldMapping.telefone, value: staging.telefone });
  }
  if (fieldMapping.tipo && staging.tipo) {
    customValues.push({ lead_id: leadId, custom_field_id: fieldMapping.tipo, value: staging.tipo });
  }

  if (customValues.length > 0) {
    const { error } = await supabase
      .from('lead_custom_values')
      .insert(customValues);

    if (error) {
      console.error(`[cnpj-cron] Error inserting custom values for lead ${leadId}:`, error);
    }
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    console.log('[cnpj-cron] === CRON STARTED ===');

    // Criar cliente Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Ler mensagem da fila
    const { data: messages, error: readError } = await supabase.rpc('pgmq_read', {
      queue_name: 'cnpj_extraction_queue',
      vt_seconds: 300, // 5 minutos de visibility timeout
      qty: 1,
    });

    if (readError) {
      console.error('[cnpj-cron] Error reading queue:', readError);
      throw readError;
    }

    if (!messages || messages.length === 0) {
      console.log('[cnpj-cron] No messages in queue');
      return new Response(
        JSON.stringify({ success: true, message: 'No messages in queue' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const queueMsg = messages[0];
    const msgId = queueMsg.msg_id;
    const payload: QueueMessage = queueMsg.message;
    const readCount = queueMsg.read_ct || 1;

    console.log(`[cnpj-cron] Processing message ${msgId}, run_id: ${payload.run_id}, read_count: ${readCount}`);

    // Verificar se excedeu tentativas (DLQ)
    if (readCount > 3) {
      console.log(`[cnpj-cron] Message ${msgId} exceeded retries, sending to DLQ`);

      await supabase.rpc('pgmq_archive', {
        queue_name: 'cnpj_extraction_queue',
        msg_id: msgId,
      });

      await supabase.from('extraction_logs').insert({
        run_id: payload.run_id,
        source: 'cnpj',
        step_number: 99,
        step_name: 'dlq',
        level: 'error',
        message: 'Mensagem enviada para DLQ após 3 tentativas',
        details: { msg_id: msgId, read_count: readCount },
      });

      await supabase
        .from('lead_extraction_runs')
        .update({
          status: 'failed',
          error_message: 'Processamento falhou após múltiplas tentativas',
          finished_at: new Date().toISOString(),
        })
        .eq('id', payload.run_id);

      return new Response(
        JSON.stringify({ success: false, message: 'Message sent to DLQ' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { run_id, workspace_id, funnel_id, column_id } = payload;
    const batchSize = payload.batch_size || 50;

    // Buscar ou criar campos personalizados para este workspace
    const customFieldMapping = await getOrCreateCustomFields(supabase, workspace_id);

    // Buscar leads pendentes em staging
    const { data: stagingLeads, error: stagingError } = await supabase
      .from('cnpj_extraction_staging')
      .select('*')
      .eq('run_id', run_id)
      .eq('status', 'pending')
      .limit(batchSize) as { data: StagingLead[] | null; error: any };

    if (stagingError) {
      console.error('[cnpj-cron] Error fetching staging:', stagingError);
      throw stagingError;
    }

    if (!stagingLeads || stagingLeads.length === 0) {
      console.log(`[cnpj-cron] No pending leads for run ${run_id}`);

      // Verificar se processamento está completo
      const { data: statusData } = await supabase.rpc('get_cnpj_extraction_status', {
        p_run_id: run_id,
      });

      const status = statusData || { pending: 0, migrated: 0, failed: 0 };

      if (status.pending === 0) {
        // Processamento completo
        await supabase
          .from('lead_extraction_runs')
          .update({
            status: status.failed > 0 ? 'partial' : 'completed',
            created_quantity: status.migrated,
            finished_at: new Date().toISOString(),
          })
          .eq('id', run_id);

        await supabase.from('extraction_logs').insert({
          run_id,
          source: 'cnpj',
          step_number: 10,
          step_name: 'complete',
          level: 'success',
          message: `Extração concluída: ${status.migrated} leads migrados`,
          details: status,
        });

        // Deletar mensagem da fila
        await supabase.rpc('pgmq_delete', {
          queue_name: 'cnpj_extraction_queue',
          msg_id: msgId,
        });

        return new Response(
          JSON.stringify({
            success: true,
            message: 'Extraction completed',
            migrated: status.migrated,
            failed: status.failed,
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Processar leads
    let migratedCount = 0;
    let failedCount = 0;

    for (const staging of stagingLeads || []) {
      try {
        // Verificar duplicata por CNPJ no workspace
        const { data: existingLead } = await supabase
          .from('leads')
          .select('id')
          .eq('workspace_id', workspace_id)
          .eq('cnpj', staging.cnpj)
          .maybeSingle();

        if (existingLead) {
          await supabase
            .from('cnpj_extraction_staging')
            .update({
              status: 'failed',
              error_message: 'Duplicata: CNPJ já existe no workspace',
            })
            .eq('id', staging.id);

          failedCount++;
          continue;
        }

        // Normalizar telefone para formato brasileiro
        let phoneNormalized: string | null = null;
        if (staging.telefone) {
          const cleanPhone = staging.telefone.replace(/\D/g, '');
          if (cleanPhone.length >= 10) {
            phoneNormalized = cleanPhone.length <= 11 ? `55${cleanPhone}` : cleanPhone;
          }
        }

        const leadData = {
          workspace_id,
          funnel_id: staging.funnel_id,
          column_id: staging.column_id,
          client_name: staging.nome_fantasia || staging.razao_social || `CNPJ ${staging.cnpj}`,
          company: staging.razao_social,
          cnpj: staging.cnpj,
          phone: phoneNormalized,
          tags: ['cnpj-extraction', staging.uf || 'BR'].filter(Boolean),
          lead_extraction_run_id: staging.run_id,
        };

        const { data: newLead, error: insertError } = await supabase
          .from('leads')
          .insert(leadData)
          .select('id')
          .single();

        if (insertError) {
          console.error(`[cnpj-cron] Error inserting lead ${staging.cnpj}:`, insertError);

          await supabase
            .from('cnpj_extraction_staging')
            .update({
              status: 'failed',
              error_message: insertError.message,
            })
            .eq('id', staging.id);

          failedCount++;
          continue;
        }

        // Inserir valores nos campos personalizados
        if (Object.keys(customFieldMapping).length > 0) {
          await insertCustomFieldValues(supabase, newLead.id, staging, customFieldMapping);
        }

        // Marcar staging como migrado
        await supabase
          .from('cnpj_extraction_staging')
          .update({
            status: 'migrated',
            migrated_at: new Date().toISOString(),
            lead_id: newLead.id,
          })
          .eq('id', staging.id);

        migratedCount++;
      } catch (error) {
        console.error(`[cnpj-cron] Error processing lead ${staging.cnpj}:`, error);

        await supabase
          .from('cnpj_extraction_staging')
          .update({
            status: 'failed',
            error_message: error instanceof Error ? error.message : 'Unknown error',
          })
          .eq('id', staging.id);

        failedCount++;
      }
    }

    console.log(`[cnpj-cron] Batch processed: ${migratedCount} migrated, ${failedCount} failed`);

    // Atualizar contadores na run
    const { data: runData } = await supabase
      .from('lead_extraction_runs')
      .select('created_quantity')
      .eq('id', run_id)
      .single();

    const currentCreated = runData?.created_quantity || 0;

    await supabase
      .from('lead_extraction_runs')
      .update({
        created_quantity: currentCreated + migratedCount,
      })
      .eq('id', run_id);

    // Log do batch
    await supabase.from('extraction_logs').insert({
      run_id,
      source: 'cnpj',
      step_number: 5,
      step_name: 'migrate_batch',
      level: 'info',
      message: `Batch processado: ${migratedCount} migrados, ${failedCount} falhas`,
      details: { migrated: migratedCount, failed: failedCount, batch_size: batchSize },
    });

    // Verificar se há mais leads pendentes
    const { count: pendingCount } = await supabase
      .from('cnpj_extraction_staging')
      .select('*', { count: 'exact', head: true })
      .eq('run_id', run_id)
      .eq('status', 'pending');

    if (pendingCount && pendingCount > 0) {
      // Ainda há leads pendentes, re-enfileirar
      console.log(`[cnpj-cron] ${pendingCount} leads still pending, re-queuing`);

      await supabase.rpc('pgmq_delete', {
        queue_name: 'cnpj_extraction_queue',
        msg_id: msgId,
      });

      await supabase.rpc('pgmq_send', {
        queue_name: 'cnpj_extraction_queue',
        message: payload,
      });
    } else {
      // Processamento completo
      const { data: finalStatus } = await supabase.rpc('get_cnpj_extraction_status', {
        p_run_id: run_id,
      });

      const status = finalStatus || { migrated: 0, failed: 0 };

      await supabase
        .from('lead_extraction_runs')
        .update({
          status: status.failed > 0 ? 'partial' : 'completed',
          finished_at: new Date().toISOString(),
        })
        .eq('id', run_id);

      await supabase.from('extraction_logs').insert({
        run_id,
        source: 'cnpj',
        step_number: 10,
        step_name: 'complete',
        level: 'success',
        message: `Extração concluída: ${status.migrated} leads migrados`,
        details: finalStatus,
      });

      await supabase.rpc('pgmq_delete', {
        queue_name: 'cnpj_extraction_queue',
        msg_id: msgId,
      });
    }

    const responseTime = Date.now() - startTime;

    return new Response(
      JSON.stringify({
        success: true,
        run_id,
        migrated: migratedCount,
        failed: failedCount,
        pending: pendingCount || 0,
        response_time_ms: responseTime,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[cnpj-cron] Error:', error);

    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
