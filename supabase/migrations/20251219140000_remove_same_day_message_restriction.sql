-- Migration: Remove same-day message restriction from campaign
-- Created: 2025-12-19
-- Description: Removes the restriction that prevents sending messages to the same lead on the same day.
--              The client wants to control this themselves.

CREATE OR REPLACE FUNCTION public.get_campaign_eligible_leads(p_workspace_id uuid, p_source_column_id uuid, p_inbox_id uuid, p_limit integer DEFAULT 100)
 RETURNS TABLE(lead_id uuid, phone_number text, phone_normalized text, client_name text, email text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_provider text := 'whatsapp';
  v_phone_field_id uuid;
  v_whatsapp_valid_field_id uuid;
  v_email_field_id uuid;
BEGIN
  -- Identificar o provider baseado no inbox
  SELECT COALESCE(i.provider, 'whatsapp') INTO v_provider
  FROM inbox_instances ii
  JOIN instances i ON ii.instance_id = i.id
  WHERE ii.inbox_id = p_inbox_id
  LIMIT 1;

  -- Buscar campo de TELEFONE (prioriza "Telefone Principal", depois "Telefone", depois field_type=phone)
  SELECT id INTO v_phone_field_id
  FROM custom_fields
  WHERE workspace_id = p_workspace_id
    AND (
      name ILIKE 'telefone principal'
      OR name ILIKE 'telefone'
      OR name ILIKE '%phone%'
      OR field_type = 'phone'
    )
  ORDER BY
    CASE
      WHEN name ILIKE 'telefone principal' THEN 1
      WHEN name ILIKE 'telefone' THEN 2
      WHEN field_type = 'phone' THEN 3
      ELSE 4
    END
  LIMIT 1;

  -- Buscar campo WHATSAPP VÁLIDO
  SELECT id INTO v_whatsapp_valid_field_id
  FROM custom_fields
  WHERE workspace_id = p_workspace_id
    AND (name ILIKE '%whatsapp válido%' OR name ILIKE '%whatsapp valido%')
  LIMIT 1;

  -- Buscar campo EMAIL (prioriza "Email Principal", depois field_type=email)
  SELECT id INTO v_email_field_id
  FROM custom_fields
  WHERE workspace_id = p_workspace_id
    AND (
      name ILIKE 'email principal'
      OR name ILIKE '%email%'
      OR field_type = 'email'
    )
  ORDER BY
    CASE
      WHEN name ILIKE 'email principal' THEN 1
      WHEN field_type = 'email' THEN 2
      ELSE 3
    END
  LIMIT 1;

  RETURN QUERY
  SELECT
    l.id as lead_id,
    lcv_phone.value as phone_number,
    -- Normalizar telefone: remover tudo exceto números e adicionar 55 se necessário
    CASE
      WHEN lcv_phone.value IS NULL OR lcv_phone.value = '' THEN NULL
      ELSE
        CASE
          -- Se já começa com 55 e tem 12-13 dígitos, usar como está
          WHEN regexp_replace(lcv_phone.value, '[^0-9]', '', 'g') ~ '^55[0-9]{10,11}$'
            THEN regexp_replace(lcv_phone.value, '[^0-9]', '', 'g')
          -- Se tem 10-11 dígitos (DDD + número), adicionar 55
          WHEN regexp_replace(lcv_phone.value, '[^0-9]', '', 'g') ~ '^[0-9]{10,11}$'
            THEN '55' || regexp_replace(lcv_phone.value, '[^0-9]', '', 'g')
          -- Caso contrário, apenas limpar caracteres não numéricos
          ELSE regexp_replace(lcv_phone.value, '[^0-9]', '', 'g')
        END
    END as phone_normalized,
    l.client_name,
    lcv_email.value as email
  FROM leads l
  LEFT JOIN lead_custom_values lcv_phone
    ON lcv_phone.lead_id = l.id
    AND lcv_phone.custom_field_id = v_phone_field_id
  LEFT JOIN lead_custom_values lcv_whatsapp
    ON lcv_whatsapp.lead_id = l.id
    AND lcv_whatsapp.custom_field_id = v_whatsapp_valid_field_id
  LEFT JOIN lead_custom_values lcv_email
    ON lcv_email.lead_id = l.id
    AND lcv_email.custom_field_id = v_email_field_id
  WHERE l.workspace_id = p_workspace_id
    AND l.column_id = p_source_column_id
    AND l.status = 'active'
    -- WhatsApp válido: usa leads.whatsapp_valid OU custom field "Sim"
    AND (
      v_provider != 'whatsapp'
      OR l.whatsapp_valid = TRUE
      OR LOWER(COALESCE(lcv_whatsapp.value, '')) IN ('sim', 'yes', 'true', '1')
    )
    -- Email válido se provider for email
    AND (
      v_provider != 'email'
      OR (lcv_email.value IS NOT NULL AND lcv_email.value != '')
    )
    -- Deve ter telefone para WhatsApp
    AND (
      v_provider != 'whatsapp'
      OR (lcv_phone.value IS NOT NULL AND lcv_phone.value != '')
    )
    -- REMOVIDO: Restrição de mensagem no mesmo dia
    -- O cliente quer controlar isso manualmente

    -- Excluir leads em campanha running (mantém para evitar duplicatas simultâneas)
    AND NOT EXISTS (
      SELECT 1
      FROM campaign_messages cm2
      JOIN campaign_runs cr2 ON cm2.run_id = cr2.id
      WHERE cm2.lead_id = l.id
        AND cr2.status = 'running'
        AND cm2.status IN ('pending', 'queued', 'generating', 'sending')
    )
  ORDER BY l.created_at DESC
  LIMIT p_limit;
END;
$function$;
