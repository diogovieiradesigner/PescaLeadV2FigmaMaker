#!/bin/bash
# Script para processar CNPJs diretamente (bypass da fila problemática)
# Uso: ./process_cnpjs_direct.sh

PROJECT_REF="nlbcwaxkeaddfocigwuk"
RUN_ID="8a2fa261-b0e8-43b1-9f72-f595f287184a"

echo "Buscando CNPJs pendentes..."

# Buscar CNPJs via SQL e processar cada um
npx supabase db execute --project-ref $PROJECT_REF "
SELECT
  id::text as staging_id,
  cnpj_normalized,
  client_name
FROM lead_extraction_staging
WHERE extraction_run_id = '$RUN_ID'
  AND cnpj_normalized IS NOT NULL
  AND cnpj_enriched = false
ORDER BY cnpj_normalized
" --output tsv | while IFS=$'\t' read -r staging_id cnpj client_name; do

  if [ -z "$staging_id" ]; then
    continue
  fi

  echo ""
  echo "=========================================="
  echo "Processando: $client_name"
  echo "CNPJ: $cnpj"
  echo "Staging ID: $staging_id"
  echo "=========================================="

  # Chamar API CNPJ
  echo "  Consultando API..."
  response=$(curl -s "https://${PROJECT_REF}.supabase.co/functions/v1/cnpj-api?cnpj=$cnpj")

  # Verificar se foi sucesso
  if echo "$response" | grep -q '"success":true'; then
    echo "  ✅ Dados encontrados"

    # Escapar JSON para SQL
    escaped_json=$(echo "$response" | jq -c '.data' | sed "s/'/''/g")

    # Atualizar no banco
    echo "  Salvando no banco..."
    npx supabase db execute --project-ref $PROJECT_REF "
    UPDATE lead_extraction_staging
    SET
      cnpj_data = '$escaped_json'::jsonb,
      cnpj_enriched = true,
      cnpj_checked_at = NOW(),
      cnpj_provider = 'banco_local'
    WHERE id = '$staging_id'
    " > /dev/null 2>&1

    if [ $? -eq 0 ]; then
      echo "  ✅ Salvo com sucesso"
    else
      echo "  ❌ Erro ao salvar"
    fi
  else
    echo "  ❌ CNPJ não encontrado"
  fi

  # Delay entre requisições
  sleep 0.5
done

echo ""
echo "=========================================="
echo "Processamento concluído!"
echo "=========================================="
