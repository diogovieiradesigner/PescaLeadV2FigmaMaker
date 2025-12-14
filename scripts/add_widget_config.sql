-- =====================================================
-- EXECUTE ESTE SQL NO SUPABASE SQL EDITOR
-- https://supabase.com/dashboard/project/nlbcwaxkeaddfocigwuk/sql/new
-- =====================================================

-- Adicionar coluna widget_config para personalização do widget embeddable
ALTER TABLE ai_public_chat_links
ADD COLUMN IF NOT EXISTS widget_config JSONB DEFAULT '{
  "primaryColor": "#0169D9",
  "position": "right",
  "buttonIcon": "chat",
  "buttonText": ""
}'::jsonb;

-- Comentário explicativo
COMMENT ON COLUMN ai_public_chat_links.widget_config IS 'Configurações visuais do widget embeddable: primaryColor, position (left/right), buttonIcon (chat/whatsapp), buttonText';

-- Verificar
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'ai_public_chat_links'
AND column_name = 'widget_config';

SELECT 'Coluna widget_config adicionada com sucesso!' as status;
