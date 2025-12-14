-- ============================================
-- POPULAR TABELA ai_system_tools
-- Execute este script no SQL Editor do Supabase
-- ============================================

-- Inserir tools padrão (com UUIDs fixos para consistência)
INSERT INTO ai_system_tools (id, name, display_name, description, category, is_active)
VALUES
  -- Categoria: handoff (Transferência)
  ('e9005e6c-92aa-494e-bd62-ad4882930b86', 'transferir_para_humano', 'Transferir para Atendente Humano', 'Transfere o atendimento para um atendente humano. Use quando o cliente solicitar falar com uma pessoa, quando não conseguir ajudar, ou em situações delicadas.', 'handoff', true),

  -- Categoria: general (Geral)
  ('6f2143ec-5e38-4798-934d-1c6fdf1a86c0', 'finalizar_atendimento', 'Finalizar Atendimento', 'Finaliza o atendimento com o cliente. Use quando a conversa chegou ao fim natural, o cliente foi atendido ou não deseja mais continuar.', 'general', true),

  -- Categoria: crm (CRM)
  ('decba5eb-3880-4ef3-9ae7-8e877ca41df3', 'atualizar_crm', 'Atualizar Dados do Cliente', 'Atualiza informações do lead/cliente no CRM. Use quando o cliente fornecer novos dados como email, telefone ou empresa.', 'crm', true),

  -- Categoria: scheduling (Agendamento)
  ('76f758a8-f27e-41af-a9f6-bc602cb58037', 'agendar_reuniao', 'Agendar Reunião/Compromisso', 'Agenda uma reunião/compromisso no calendário. Use quando o cliente quiser marcar uma reunião, visita, demonstração ou qualquer tipo de compromisso.', 'scheduling', true),
  ('c6a7f72d-fab1-45c5-940b-68858a839c49', 'consultar_disponibilidade', 'Consultar Horários Disponíveis', 'Consulta horários disponíveis no calendário para agendamento. Use quando o cliente perguntar sobre horários disponíveis.', 'scheduling', true),

  -- Categoria: communication (Comunicação)
  ('8042f679-95aa-4cea-aed5-9d5bd5bb8495', 'enviar_documento', 'Enviar Documento ou Arquivo', 'Envia um documento ou arquivo para o cliente. Use quando precisar compartilhar catálogos, propostas, contratos ou outros materiais.', 'communication', true)

ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  is_active = EXCLUDED.is_active;

-- Verificar inserção
SELECT id, name, display_name, category, is_active FROM ai_system_tools ORDER BY category, name;
