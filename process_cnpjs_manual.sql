-- Script para processar CNPJs manualmente da extração 8a2fa261-b0e8-43b1-9f72-f595f287184a
-- Executar via Supabase SQL Editor

-- Processar todos os CNPJs de uma vez chamando a API
-- Nota: Este script deve ser executado no SQL Editor do Supabase

SELECT
  id,
  cnpj_normalized,
  client_name,
  'Processar via: curl https://nlbcwaxkeaddfocigwuk.supabase.co/functions/v1/cnpj-api?cnpj=' || cnpj_normalized as api_call
FROM lead_extraction_staging
WHERE extraction_run_id = '8a2fa261-b0e8-43b1-9f72-f595f287184a'
  AND cnpj_normalized IS NOT NULL
  AND (cnpj_enriched = false OR cnpj_enriched IS NULL)
ORDER BY cnpj_normalized
LIMIT 34;
