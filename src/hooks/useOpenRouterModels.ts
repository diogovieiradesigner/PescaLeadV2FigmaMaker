import { useState, useEffect } from 'react';

export interface OpenRouterModel {
  id: string;
  name: string;
  description?: string;
  context_length?: number;
  pricing?: {
    prompt: string;
    completion: string;
  };
  isFree?: boolean;
}

/**
 * Verifica se um modelo é adequado para messageria/chat
 * (text-in → text-out, excluindo embeddings e rerankers)
 */
function isMessagingModel(m: any): boolean {
  const arch = m.architecture || {};
  const modality: string = arch.modality || '';
  const inputModalities: string[] = arch.input_modalities || [];
  const outputModalities: string[] = arch.output_modalities || [];

  // Verificar se a entrada suporta texto
  const inputHasText =
    inputModalities.includes('text') ||
    modality.split('->')[0]?.split('+').includes('text');

  // Verificar se a saída é texto
  const outputIsText =
    outputModalities.includes('text') ||
    modality.split('->')[1]?.split('+').includes('text');

  // Verificar se é modelo de embedding ou reranker (deve ser excluído)
  const isEmbeddingOutput =
    outputModalities.includes('embeddings') ||
    modality.includes('embeddings') ||
    /embedding|rerank/i.test(m.id || '') ||
    /embedding|rerank/i.test(m.name || '');

  return inputHasText && outputIsText && !isEmbeddingOutput;
}

export function useOpenRouterModels() {
  const [models, setModels] = useState<OpenRouterModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchModels = async () => {
      try {
        const response = await fetch('https://openrouter.ai/api/v1/models', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        if (!response.ok) {
          throw new Error(`Erro HTTP: ${response.status}`);
        }

        const data = await response.json();
        
        if (!data.data || !Array.isArray(data.data)) {
          throw new Error('Formato de resposta inválido');
        }
        
        // Filtrar e formatar modelos
        const formattedModels = data.data
          .filter((m: any) => isMessagingModel(m))
          .map((m: any) => ({
            id: m.id,
            name: m.name || m.id,
            description: m.description,
            context_length: m.context_length,
            pricing: m.pricing,
            isFree: m.id.endsWith(':free') || 
                    (m.pricing?.prompt === '0' && m.pricing?.completion === '0')
          }))
          .sort((a: OpenRouterModel, b: OpenRouterModel) => {
            // Ordenar: gratuitos primeiro, depois por nome
            if (a.isFree && !b.isFree) return -1;
            if (!a.isFree && b.isFree) return 1;
            return a.name.localeCompare(b.name);
          });

        setModels(formattedModels);
        setError(null);
      } catch (err) {
        console.error('[useOpenRouterModels] Erro ao buscar modelos:', err);
        const errorMessage = err instanceof Error ? err.message : 'Erro ao conectar com OpenRouter';
        setError(errorMessage);
        
        // Fallback: modelos básicos populares
        setModels([
          {
            id: 'openai/gpt-4o-mini',
            name: 'GPT-4o Mini',
            context_length: 128000,
            pricing: { prompt: '0.00015', completion: '0.0006' },
            isFree: false,
          },
          {
            id: 'anthropic/claude-3.5-sonnet',
            name: 'Claude 3.5 Sonnet',
            context_length: 200000,
            pricing: { prompt: '0.003', completion: '0.015' },
            isFree: false,
          },
          {
            id: 'google/gemini-2.0-flash-exp:free',
            name: 'Gemini 2.0 Flash (Free)',
            context_length: 1000000,
            pricing: { prompt: '0', completion: '0' },
            isFree: true,
          },
          {
            id: 'meta-llama/llama-3.2-3b-instruct:free',
            name: 'Llama 3.2 3B Instruct (Free)',
            context_length: 131072,
            pricing: { prompt: '0', completion: '0' },
            isFree: true,
          },
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchModels();
  }, []);

  return { models, loading, error };
}
