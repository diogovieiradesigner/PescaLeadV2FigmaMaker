-- ============================================
-- FIX: RPC get_agent_tools para usar ai_agent_system_tools
-- Esta RPC retorna as tools habilitadas para um agente no formato OpenAI
-- ============================================

-- Dropar função antiga se existir (pode ter assinatura diferente)
DROP FUNCTION IF EXISTS get_agent_tools(UUID);

-- Criar função atualizada
CREATE OR REPLACE FUNCTION get_agent_tools(p_agent_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSONB := '[]'::JSONB;
  tool_record RECORD;
BEGIN
  -- Buscar tools habilitadas para este agente
  FOR tool_record IN
    SELECT st.name, st.description, st.category
    FROM ai_system_tools st
    INNER JOIN ai_agent_system_tools ast ON ast.system_tool_id = st.id
    WHERE ast.agent_id = p_agent_id
      AND ast.is_enabled = true
      AND st.is_active = true
    ORDER BY st.category, st.name
  LOOP
    -- Construir tool no formato OpenAI/OpenRouter
    CASE tool_record.name
      WHEN 'transferir_para_humano' THEN
        result := result || jsonb_build_array(
          jsonb_build_object(
            'type', 'function',
            'function', jsonb_build_object(
              'name', 'transferir_para_humano',
              'description', 'Transfere a conversa para um atendente humano quando o cliente solicita ou em situações que exigem atenção humana. Use quando: cliente pede explicitamente, reclamação grave, situação complexa, cliente muito insatisfeito.',
              'parameters', jsonb_build_object(
                'type', 'object',
                'properties', jsonb_build_object(
                  'motivo', jsonb_build_object(
                    'type', 'string',
                    'description', 'Motivo claro da transferência (ex: "Cliente solicitou falar com gerente")'
                  ),
                  'resumo_conversa', jsonb_build_object(
                    'type', 'string',
                    'description', 'Resumo breve do que foi conversado até agora para contexto do atendente'
                  ),
                  'prioridade', jsonb_build_object(
                    'type', 'string',
                    'enum', jsonb_build_array('low', 'normal', 'high', 'urgent'),
                    'description', 'Urgência: urgent (pediu humano/reclamação grave), high (insatisfeito), normal (oportunidade), low (informativo)'
                  )
                ),
                'required', jsonb_build_array('motivo', 'resumo_conversa')
              )
            )
          )
        );

      WHEN 'finalizar_atendimento' THEN
        result := result || jsonb_build_array(
          jsonb_build_object(
            'type', 'function',
            'function', jsonb_build_object(
              'name', 'finalizar_atendimento',
              'description', 'Marca o atendimento como concluído quando a demanda do cliente foi totalmente resolvida e o cliente não precisa de mais nada.',
              'parameters', jsonb_build_object(
                'type', 'object',
                'properties', jsonb_build_object(
                  'resumo', jsonb_build_object(
                    'type', 'string',
                    'description', 'Resumo do que foi resolvido no atendimento'
                  )
                ),
                'required', jsonb_build_array('resumo')
              )
            )
          )
        );

      WHEN 'atualizar_crm' THEN
        result := result || jsonb_build_array(
          jsonb_build_object(
            'type', 'function',
            'function', jsonb_build_object(
              'name', 'atualizar_crm',
              'description', 'Atualiza informações do lead no CRM quando o cliente fornece dados importantes durante a conversa (nome, email, telefone, empresa, cargo).',
              'parameters', jsonb_build_object(
                'type', 'object',
                'properties', jsonb_build_object(
                  'campo', jsonb_build_object(
                    'type', 'string',
                    'description', 'Nome do campo a atualizar (ex: "empresa", "cargo", "email", "telefone")'
                  ),
                  'valor', jsonb_build_object(
                    'type', 'string',
                    'description', 'Novo valor para o campo'
                  ),
                  'observacao', jsonb_build_object(
                    'type', 'string',
                    'description', 'Observação adicional sobre a atualização (opcional)'
                  )
                ),
                'required', jsonb_build_array('campo', 'valor')
              )
            )
          )
        );

      WHEN 'agendar_reuniao' THEN
        result := result || jsonb_build_array(
          jsonb_build_object(
            'type', 'function',
            'function', jsonb_build_object(
              'name', 'agendar_reuniao',
              'description', 'Agenda uma reunião ou compromisso no calendário. Use quando o cliente quiser marcar uma reunião, visita, demonstração ou qualquer tipo de compromisso.',
              'parameters', jsonb_build_object(
                'type', 'object',
                'properties', jsonb_build_object(
                  'titulo', jsonb_build_object(
                    'type', 'string',
                    'description', 'Título do evento (ex: "Reunião com João da Empresa X")'
                  ),
                  'data', jsonb_build_object(
                    'type', 'string',
                    'description', 'Data do evento no formato YYYY-MM-DD'
                  ),
                  'hora_inicio', jsonb_build_object(
                    'type', 'string',
                    'description', 'Hora de início no formato HH:MM (ex: "14:30")'
                  ),
                  'hora_fim', jsonb_build_object(
                    'type', 'string',
                    'description', 'Hora de término no formato HH:MM (ex: "15:30")'
                  ),
                  'descricao', jsonb_build_object(
                    'type', 'string',
                    'description', 'Descrição ou notas adicionais sobre a reunião (opcional)'
                  )
                ),
                'required', jsonb_build_array('titulo', 'data', 'hora_inicio', 'hora_fim')
              )
            )
          )
        );

      WHEN 'consultar_disponibilidade' THEN
        result := result || jsonb_build_array(
          jsonb_build_object(
            'type', 'function',
            'function', jsonb_build_object(
              'name', 'consultar_disponibilidade',
              'description', 'Consulta horários disponíveis no calendário para agendamento. Use quando o cliente perguntar sobre horários disponíveis para reunião.',
              'parameters', jsonb_build_object(
                'type', 'object',
                'properties', jsonb_build_object(
                  'data', jsonb_build_object(
                    'type', 'string',
                    'description', 'Data para verificar disponibilidade no formato YYYY-MM-DD'
                  ),
                  'periodo', jsonb_build_object(
                    'type', 'string',
                    'enum', jsonb_build_array('manha', 'tarde', 'dia_todo'),
                    'description', 'Período do dia para buscar (manha: 8h-12h, tarde: 13h-18h, dia_todo: 8h-18h)'
                  )
                ),
                'required', jsonb_build_array('data')
              )
            )
          )
        );

      WHEN 'enviar_documento' THEN
        result := result || jsonb_build_array(
          jsonb_build_object(
            'type', 'function',
            'function', jsonb_build_object(
              'name', 'enviar_documento',
              'description', 'Envia um documento ou arquivo para o cliente. Use quando precisar compartilhar catálogos, propostas, contratos ou outros materiais.',
              'parameters', jsonb_build_object(
                'type', 'object',
                'properties', jsonb_build_object(
                  'tipo_documento', jsonb_build_object(
                    'type', 'string',
                    'enum', jsonb_build_array('catalogo', 'proposta', 'contrato', 'apresentacao', 'outro'),
                    'description', 'Tipo de documento a ser enviado'
                  ),
                  'nome_documento', jsonb_build_object(
                    'type', 'string',
                    'description', 'Nome específico do documento (opcional)'
                  ),
                  'mensagem', jsonb_build_object(
                    'type', 'string',
                    'description', 'Mensagem para acompanhar o documento (opcional)'
                  )
                ),
                'required', jsonb_build_array('tipo_documento')
              )
            )
          )
        );

      ELSE
        -- Tool desconhecida - não adicionar
        NULL;
    END CASE;
  END LOOP;

  RETURN result;
END;
$$;

-- Comentário explicativo
COMMENT ON FUNCTION get_agent_tools(UUID) IS
'Retorna as ferramentas habilitadas para um agente no formato OpenAI/OpenRouter.
Busca as tools da tabela ai_agent_system_tools que estejam habilitadas (is_enabled=true)
e cujas tools base em ai_system_tools estejam ativas (is_active=true).';

-- Garantir permissões
GRANT EXECUTE ON FUNCTION get_agent_tools(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION get_agent_tools(UUID) TO authenticated;
