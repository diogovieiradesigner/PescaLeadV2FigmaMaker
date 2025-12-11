-- =============================================================================
-- MIGRATION: Inserir configuração inicial do sistema de bairros com IA
-- =============================================================================

INSERT INTO ai_neighborhood_config (
  is_active,
  model,
  fallback_models,
  max_tokens,
  temperature,
  timeout_seconds,
  max_retries,
  max_ai_rounds,
  max_total_pages,
  system_prompt,
  user_prompt_city,
  user_prompt_state,
  user_prompt_additional,
  cache_ttl_days
) VALUES (
  true,
  'perplexity/sonar-pro',
  ARRAY['anthropic/claude-3-haiku', 'openai/gpt-4o-mini'],
  2000,
  0.3,
  60,
  3,
  3,
  500,
  -- System Prompt
  'Voce e um especialista em geografia brasileira. Sua tarefa e sugerir bairros para buscas no Google Maps.

REGRAS OBRIGATORIAS DE FORMATACAO:
1. Retorne APENAS JSON valido, sem explicacoes ou texto adicional
2. Cada localizacao DEVE seguir EXATAMENTE este formato:
   "Bairro, Cidade, State of Estado, Brazil"
3. SEM acentos (use Joao em vez de João, Sao em vez de São, Paraiba em vez de Paraíba)
4. Use "State of" antes do estado (em ingles)
5. Use "Brazil" no final (em ingles)
6. Capitalizacao correta (primeira letra maiuscula de cada palavra, exceto preposicoes)

EXEMPLOS CORRETOS:
- "Copacabana, Rio de Janeiro, State of Rio de Janeiro, Brazil"
- "Pinheiros, Sao Paulo, State of Sao Paulo, Brazil"
- "Manaira, Joao Pessoa, State of Paraiba, Brazil"
- "Boa Viagem, Recife, State of Pernambuco, Brazil"

EXEMPLOS INCORRETOS (NAO USE ESTES FORMATOS):
- "Copacabana, Rio de Janeiro, RJ" (falta State of e Brazil)
- "COPACABANA, RIO DE JANEIRO" (tudo maiusculo)
- "Copacabana, Rio de Janeiro, Estado do Rio de Janeiro, Brasil" (portugues)
- "Centro, São Paulo, SP, Brasil" (tem acento e usa abreviacoes)',

  -- User Prompt City
  'Preciso de bairros para buscar "{search_term}" em {city}, {state}.

BAIRROS JA PESQUISADOS (NAO INCLUA ESTES):
{already_searched_locations}

Meta: Aproximadamente {quantity_needed} bairros diferentes.

Criterios para selecao:
- Priorize bairros comerciais onde provavelmente encontrarei "{search_term}"
- Inclua bairros de diferentes regioes da cidade (zona norte, sul, leste, oeste, centro)
- Se for comercio de luxo (joalherias, boutiques), priorize bairros nobres
- Se for comercio popular (lojas de construcao, supermercados), inclua bairros residenciais
- Se for alimentacao (pizzarias, restaurantes), inclua areas com vida noturna e centros comerciais
- Considere bairros com maior densidade populacional e atividade comercial

Retorne JSON no formato:
{
  "locations": ["Bairro1, {city}, State of {state}, Brazil", "Bairro2, {city}, State of {state}, Brazil"],
  "has_more_neighborhoods": true
}

IMPORTANTE: has_more_neighborhoods deve ser false apenas se voce ja listou TODOS os bairros relevantes da cidade.',

  -- User Prompt State
  'Preciso de cidades e bairros no estado de {state} para buscar "{search_term}".

LOCAIS JA PESQUISADOS (NAO INCLUA ESTES):
{already_searched_locations}

Meta: Aproximadamente {quantity_needed} localizacoes diferentes.

Criterios para selecao:
- Inclua as principais cidades do estado (capital e cidades com mais de 100mil habitantes)
- Para cada cidade, sugira os principais bairros comerciais
- Considere o tipo de negocio "{search_term}" para escolher os melhores locais
- Distribua as sugestoes entre diferentes cidades para maximizar cobertura
- Priorize capitais e cidades com maior PIB

Retorne JSON no formato:
{
  "locations": [
    "Bairro1, Cidade1, State of {state}, Brazil",
    "Bairro2, Cidade1, State of {state}, Brazil",
    "Bairro1, Cidade2, State of {state}, Brazil"
  ],
  "has_more_neighborhoods": true
}

IMPORTANTE: has_more_neighborhoods deve ser false apenas se voce ja listou TODOS os bairros relevantes do estado.',

  -- User Prompt Additional (para rodadas 2, 3, etc)
  'Preciso de MAIS bairros para buscar "{search_term}".

JA PESQUISEI TODOS ESTES LOCAIS (NAO REPITA NENHUM):
{all_searched_locations}

Quantidade atual de leads: {current_leads}
Meta: {target_quantity} leads
Faltam: {leads_needed} leads

Sugira bairros DIFERENTES dos ja listados acima. Considere:
- Bairros menores ou menos conhecidos que ainda podem ter "{search_term}"
- Areas comerciais secundarias
- Bairros residenciais com comercio local
- Regioes metropolitanas ou cidades vizinhas

Se nao houver mais bairros relevantes, retorne has_more_neighborhoods: false.

Retorne JSON no formato:
{
  "locations": ["Bairro1, Cidade, State of Estado, Brazil", ...],
  "has_more_neighborhoods": true/false
}',

  30 -- cache_ttl_days
)
ON CONFLICT DO NOTHING;

