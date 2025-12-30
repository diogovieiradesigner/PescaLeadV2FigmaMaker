-- Migration: Adicionar suporte a mídia (imagens e áudios) nas mensagens do AI Assistant
-- Reutiliza a infraestrutura existente de transcrição (ai_transcription_queue)

-- Adicionar colunas de mídia à tabela ai_messages
ALTER TABLE ai_messages
ADD COLUMN IF NOT EXISTS media_url TEXT,
ADD COLUMN IF NOT EXISTS content_type TEXT,
ADD COLUMN IF NOT EXISTS transcription TEXT,
ADD COLUMN IF NOT EXISTS transcription_status TEXT DEFAULT NULL;

-- Adicionar constraints
DO $$
BEGIN
  -- Constraint para content_type
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ai_messages_content_type_check'
  ) THEN
    ALTER TABLE ai_messages
    ADD CONSTRAINT ai_messages_content_type_check
    CHECK (content_type IS NULL OR content_type IN ('image', 'audio', 'video'));
  END IF;

  -- Constraint para transcription_status
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ai_messages_transcription_status_check'
  ) THEN
    ALTER TABLE ai_messages
    ADD CONSTRAINT ai_messages_transcription_status_check
    CHECK (transcription_status IS NULL OR transcription_status IN ('pending', 'processing', 'completed', 'failed', 'disabled'));
  END IF;
END $$;

-- Índice para busca de mensagens com transcrição pendente
CREATE INDEX IF NOT EXISTS idx_ai_messages_transcription_pending
ON ai_messages(transcription_status)
WHERE transcription_status = 'pending';

-- Comentários nas colunas
COMMENT ON COLUMN ai_messages.media_url IS 'URL do arquivo de mídia no Supabase Storage';
COMMENT ON COLUMN ai_messages.content_type IS 'Tipo de mídia: image, audio, video';
COMMENT ON COLUMN ai_messages.transcription IS 'Transcrição/descrição gerada pela IA';
COMMENT ON COLUMN ai_messages.transcription_status IS 'Status: pending, processing, completed, failed, disabled';

-- ============================================================================
-- Bucket de Storage para mídia do AI Assistant
-- ============================================================================

-- Criar bucket se não existir
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'ai-assistant-media',
  'ai-assistant-media',
  true,
  52428800, -- 50MB
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'audio/webm', 'audio/ogg', 'audio/mp3', 'audio/mpeg', 'audio/wav']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 52428800,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'audio/webm', 'audio/ogg', 'audio/mp3', 'audio/mpeg', 'audio/wav'];

-- Política: usuários autenticados podem fazer upload
DROP POLICY IF EXISTS "Users can upload ai assistant media" ON storage.objects;
CREATE POLICY "Users can upload ai assistant media" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'ai-assistant-media');

-- Política: usuários autenticados podem atualizar seus arquivos
DROP POLICY IF EXISTS "Users can update ai assistant media" ON storage.objects;
CREATE POLICY "Users can update ai assistant media" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'ai-assistant-media');

-- Política: qualquer um pode ler (bucket público)
DROP POLICY IF EXISTS "Anyone can read ai assistant media" ON storage.objects;
CREATE POLICY "Anyone can read ai assistant media" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'ai-assistant-media');

-- Política: usuários autenticados podem deletar seus arquivos
DROP POLICY IF EXISTS "Users can delete ai assistant media" ON storage.objects;
CREATE POLICY "Users can delete ai assistant media" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'ai-assistant-media');
