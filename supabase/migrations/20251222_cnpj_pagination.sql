-- Tabela para rastrear o progresso das buscas de CNPJ e permitir continuação
CREATE TABLE IF NOT EXISTS public.cnpj_search_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id),
    filters_hash TEXT NOT NULL, -- Hash SHA256 dos filtros para identificação única
    filters JSONB NOT NULL,     -- Filtros aplicados (para referência/debug)
    last_offset INTEGER DEFAULT 0, -- Último offset processado
    total_extracted INTEGER DEFAULT 0, -- Total de leads extraídos com estes filtros
    last_run_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Garante que só existe um progresso por workspace + filtros
    CONSTRAINT unique_cnpj_search_progress UNIQUE (workspace_id, filters_hash)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_cnpj_search_progress_lookup 
ON public.cnpj_search_progress(workspace_id, filters_hash);

-- Função para obter ou criar progresso de busca
CREATE OR REPLACE FUNCTION public.get_or_create_cnpj_search_progress(
    p_workspace_id UUID,
    p_filters JSONB,
    p_filters_hash TEXT
)
RETURNS TABLE (
    current_offset INTEGER,
    total_extracted INTEGER
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_progress_id UUID;
    v_offset INTEGER;
    v_total INTEGER;
BEGIN
    -- Tentar encontrar progresso existente
    SELECT id, last_offset, total_extracted
    INTO v_progress_id, v_offset, v_total
    FROM public.cnpj_search_progress
    WHERE workspace_id = p_workspace_id
      AND filters_hash = p_filters_hash;
      
    -- Se não existir, criar novo
    IF v_progress_id IS NULL THEN
        INSERT INTO public.cnpj_search_progress (
            workspace_id, 
            filters_hash, 
            filters, 
            last_offset, 
            total_extracted
        ) VALUES (
            p_workspace_id,
            p_filters_hash,
            p_filters,
            0,
            0
        )
        RETURNING last_offset, total_extracted INTO v_offset, v_total;
    ELSE
        -- Atualizar data da última execução
        UPDATE public.cnpj_search_progress
        SET last_run_at = NOW()
        WHERE id = v_progress_id;
    END IF;
    
    RETURN QUERY SELECT v_offset, v_total;
END;
$$;

-- Função para atualizar progresso após extração
CREATE OR REPLACE FUNCTION public.update_cnpj_search_progress(
    p_workspace_id UUID,
    p_filters_hash TEXT,
    p_items_count INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.cnpj_search_progress
    SET 
        last_offset = last_offset + p_items_count,
        total_extracted = total_extracted + p_items_count,
        last_run_at = NOW()
    WHERE workspace_id = p_workspace_id
      AND filters_hash = p_filters_hash;
END;
$$;