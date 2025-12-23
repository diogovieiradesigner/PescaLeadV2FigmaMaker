-- Adicionar coluna para armazenar o valor formatado do capital social
ALTER TABLE cnpj_extraction_staging
ADD COLUMN IF NOT EXISTS capital_social_formatado TEXT;

-- Comentário explicativo
COMMENT ON COLUMN cnpj_extraction_staging.capital_social_formatado IS 'Valor do capital social formatado como moeda brasileira (R$ X.XXX,XX)';