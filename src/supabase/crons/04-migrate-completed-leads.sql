-- =====================================================
-- CRON JOB: migrate-completed-leads
-- =====================================================
-- 
-- DESCRIÇÃO:
--   Migra leads prontos da tabela staging para a tabela leads definitiva
--
-- SCHEDULE: 
--   */2 * * * * (A cada 2 minutos)
--
-- COMANDO:
--   CTE complexo que faz SELECT + INSERT + UPDATE
--
-- O QUE FAZ:
--   1. Busca leads prontos para migrar (should_migrate = true)
--   2. Filtra por status_extraction = 'google_fetched'
--   3. NÃO exige status_enrichment = 'completed' (pode migrar sem enriquecimento)
--   4. Insere na tabela leads (com funnel_id, column_id, etc)
--   5. Atualiza lead_extraction_staging com migrated_at e migrated_lead_id
--   6. Limita a 100 leads por execução
--
-- DEPENDÊNCIAS:
--   - Tabela: lead_extraction_staging
--   - Tabela: lead_extraction_runs
--   - Tabela: lead_extractions
--   - Tabela: leads (destino final)
--
-- STATUS ATUAL:
--   🔴 FAILED (Falhando no Dashboard)
--
-- PROBLEMAS CONHECIDOS:
--   1. Não está no arquivo de migração SQL (criado manualmente?)
--   2. Query complexa com múltiplos JOINs pode ter bugs
--   3. Pode ter conflitos de chave primária/unique
--   4. Pode estar faltando índices nas tabelas
--
-- OBSERVAÇÕES:
--   ⚠️ Este cron NÃO está no arquivo sql-migrations/03-google-maps-queue.sql
--   ⚠️ Leads podem ser migrados SEM enriquecimento (status_enrichment não é verificado)
--   ⚠️ Isso pode ser intencional (permitir migração antes do enriquecimento)
--
-- DECISÃO NECESSÁRIA:
--   🤔 Devemos exigir status_enrichment = 'completed'?
--   🤔 Ou permitir migração antes do enriquecimento?
--   🤔 Qual é o comportamento desejado?
--
-- =====================================================

WITH ready_to_migrate AS (
    SELECT 
      s.*,
      e.funnel_id,
      e.column_id
    FROM lead_extraction_staging s
    JOIN lead_extraction_runs r ON r.id = s.extraction_run_id
    JOIN lead_extractions e ON e.id = r.extraction_id
    WHERE s.should_migrate = true
      AND s.migrated_at IS NULL
      AND s.status_extraction = 'google_fetched'
      -- Removemos a condição status_enrichment = 'completed'
    LIMIT 100
  ),
  inserted_leads AS (
    INSERT INTO leads (
      workspace_id,
      funnel_id,
      column_id,
      client_name,
      company,
      lead_extraction_id,
      lead_extraction_run_id,
      created_at
    )
    SELECT
      s.workspace_id,
      s.funnel_id,
      s.column_id,
      s.client_name,
      s.company,
      (SELECT extraction_id FROM lead_extraction_runs WHERE id = s.extraction_run_id),
      s.extraction_run_id,
      s.created_at
    FROM ready_to_migrate s
    RETURNING id, lead_extraction_run_id, workspace_id
  )
  UPDATE lead_extraction_staging s
  SET 
    migrated_at = NOW(),
    migrated_lead_id = i.id
  FROM inserted_leads i
  WHERE s.extraction_run_id = i.lead_extraction_run_id
    AND s.workspace_id = i.workspace_id;
