import { useState, useEffect, useRef } from 'react';
import { Theme } from '../../hooks/useTheme';
import { ChevronDown, Search, Eye, Code, Brain, Sparkles, Check, X, Loader2, Wrench, Shield } from 'lucide-react';
import { EnrichedModel, ModelCapability, ModelProvider, ChutesModel } from '../../types/ai-assistant';
import { cn } from '../ui/utils';

interface ModelSelectorProps {
  selectedModelId: string | null;
  onModelChange: (modelId: string) => void;
  theme: Theme;
  defaultModelId?: string; // Modelo padrão da configuração
}

// Helper para formatar context length
function formatContextLength(tokens: number): string {
  if (tokens >= 1000000) return `${(tokens / 1000000).toFixed(1)}M`;
  if (tokens >= 1000) return `${Math.round(tokens / 1000)}K`;
  return String(tokens);
}

// Função para extrair nome amigável do ID do modelo
function extractModelName(id: string): string {
  const nameParts = id.split('/');
  let name = nameParts[nameParts.length - 1];

  // Detectar características antes de limpar (uma vez só, mesmo que apareça múltiplas vezes)
  const hasInstruct = name.includes('-Instruct');
  const hasTEE = name.includes('-TEE');
  const hasThinking = name.includes('-Thinking');
  const hasFP8 = name.includes('-FP8');

  // Extrair ÚLTIMA versão numérica (ex: 2507, 0528, 2503)
  const versionMatches = name.match(/-(\d{4})(?=-|$)/g);
  const version = versionMatches ? versionMatches[versionMatches.length - 1].replace('-', '') : null;

  // Remover TODOS os sufixos conhecidos de qualquer posição (não só do final)
  name = name
    .replace(/-Instruct/gi, '') // Remove TODOS os -Instruct
    .replace(/-Thinking/gi, '') // Remove TODOS os -Thinking
    .replace(/-FP8/gi, '')      // Remove TODOS os -FP8
    .replace(/-TEE/gi, '')      // Remove TODOS os -TEE
    .replace(/-\d{4}/g, '')     // Remove TODAS as versões numéricas (4 dígitos)
    .replace(/-it$/i, '')
    .replace(/-Preview$/i, '')
    .replace(/-Chimera$/i, ' Chimera')
    .replace(/^unsloth-/, '')
    .replace(/-+/g, '-')        // Colapsar múltiplos hífens
    .replace(/^-|-$/g, '')      // Remover hífens no início/fim
    .replace(/-/g, ' ');

  // Adicionar sufixos relevantes de volta (apenas uma vez cada)
  const suffixes: string[] = [];
  if (hasInstruct) suffixes.push('Instruct');
  if (hasThinking) suffixes.push('Thinking');
  if (hasFP8) suffixes.push('FP8');
  if (version) suffixes.push(version);
  if (hasTEE) suffixes.push('TEE');

  if (suffixes.length > 0) {
    name += ' ' + suffixes.join(' ');
  }

  return name;
}

// Função para determinar provider do modelo
function getModelProvider(model: ChutesModel): ModelProvider {
  const id = model.id.toLowerCase();
  const ownedBy = model.owned_by?.toLowerCase() || '';

  if (id.includes('deepseek') || ownedBy.includes('deepseek')) return 'deepseek';
  if (id.includes('qwen') || ownedBy.includes('qwen')) return 'qwen';
  if (id.includes('mistral') || id.includes('unsloth') || ownedBy.includes('mistral')) return 'mistral';
  if (id.includes('llama') || id.includes('meta') || ownedBy.includes('meta')) return 'meta';
  if (id.includes('gemma') || id.includes('google') || ownedBy.includes('google')) return 'google';
  if (id.includes('nous') || ownedBy.includes('nous')) return 'nous';
  if (id.includes('phi') || id.includes('microsoft') || ownedBy.includes('microsoft')) return 'microsoft';

  return 'other';
}

// Função para extrair capacidades do modelo baseado em supported_features e input_modalities
function getModelCapabilities(model: ChutesModel): ModelCapability[] {
  const capabilities: ModelCapability[] = ['general'];
  const features = model.supported_features || [];
  const inputModalities = model.input_modalities || [];

  // Vision - se suporta imagem como input
  if (inputModalities.includes('image') || features.includes('vision')) {
    capabilities.push('vision');
  }

  // Reasoning - se tem feature de raciocínio
  if (features.includes('reasoning') || model.id.toLowerCase().includes('r1')) {
    capabilities.push('reasoning');
  }

  // Tools - se suporta function calling
  if (features.includes('tools') || features.includes('json_mode')) {
    capabilities.push('tools');
  }

  // Coding - modelos grandes geralmente são bons em código
  const contextLength = model.context_length || model.max_model_len || 0;
  if (contextLength >= 32000 || model.id.toLowerCase().includes('code')) {
    capabilities.push('coding');
  }

  return [...new Set(capabilities)]; // Remove duplicatas
}

// Função para determinar velocidade baseada no context_length e quantization
function getModelSpeed(model: ChutesModel): 'fast' | 'medium' | 'slow' {
  const contextLength = model.context_length || model.max_model_len || 0;
  const quantization = model.quantization?.toLowerCase() || '';

  // Modelos com quantização int4/int8 são mais rápidos
  if (quantization.includes('int4') || quantization.includes('int8')) {
    return 'fast';
  }

  // Modelos com contexto muito grande tendem a ser mais lentos
  if (contextLength >= 128000) return 'slow';
  if (contextLength >= 64000) return 'medium';

  return 'fast';
}

// Função para enriquecer modelo com dados reais da API
function enrichModel(model: ChutesModel): EnrichedModel {
  const contextLength = model.context_length || model.max_model_len || 32768;

  return {
    id: model.id,
    name: extractModelName(model.id),
    provider: getModelProvider(model),
    capabilities: getModelCapabilities(model),
    contextLength,
    maxOutputLength: model.max_output_length,
    quantization: model.quantization,
    speed: getModelSpeed(model),
    pricing: model.pricing ? {
      input: model.pricing.prompt,
      output: model.pricing.completion,
    } : undefined,
    supportedFeatures: model.supported_features,
    hasVision: model.input_modalities?.includes('image'),
    hasTEE: model.confidential_compute,
  };
}

// Ícones por capacidade
const CAPABILITY_ICONS: Record<ModelCapability, typeof Eye> = {
  vision: Eye,
  coding: Code,
  reasoning: Brain,
  general: Sparkles,
  tools: Wrench,
};

const CAPABILITY_LABELS: Record<ModelCapability, string> = {
  vision: 'Vision',
  coding: 'Coding',
  reasoning: 'Reasoning',
  general: 'General',
  tools: 'Tools',
};

const PROVIDER_LABELS: Record<ModelProvider, string> = {
  deepseek: 'Deepseek',
  qwen: 'Qwen',
  mistral: 'Mistral',
  meta: 'Meta',
  google: 'Google',
  nous: 'Nous',
  microsoft: 'Microsoft',
  other: 'Other',
};

export function ModelSelector({
  selectedModelId,
  onModelChange,
  theme,
  defaultModelId,
}: ModelSelectorProps) {
  const isDark = theme === 'dark';
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [models, setModels] = useState<EnrichedModel[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCapability, setSelectedCapability] = useState<ModelCapability | 'all'>('all');
  const [selectedProvider, setSelectedProvider] = useState<ModelProvider | 'all'>('all');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Buscar modelos da API - sempre da API, sem fallback
  useEffect(() => {
    async function fetchModels() {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch('https://llm.chutes.ai/v1/models');
        if (!response.ok) {
          throw new Error(`Erro ao buscar modelos: ${response.statusText}`);
        }
        const data = await response.json();

        if (!data.data || !Array.isArray(data.data)) {
          throw new Error('Resposta inválida da API de modelos');
        }

        const enrichedModels = data.data.map(enrichModel);
        setModels(enrichedModels);
      } catch (err) {
        console.error('Error fetching models:', err);
        setError(err instanceof Error ? err.message : 'Erro ao carregar modelos');
        setModels([]);
      }
      setLoading(false);
    }
    fetchModels();
  }, []);

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filtrar modelos
  const filteredModels = models.filter(model => {
    // Filtro de busca
    const matchesSearch = !searchQuery ||
      model.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      model.id.toLowerCase().includes(searchQuery.toLowerCase());

    // Filtro de capacidade
    const matchesCapability = selectedCapability === 'all' ||
      model.capabilities.includes(selectedCapability);

    // Filtro de provider
    const matchesProvider = selectedProvider === 'all' ||
      model.provider === selectedProvider;

    return matchesSearch && matchesCapability && matchesProvider;
  });

  // Modelo atualmente selecionado
  const currentModel = models.find(m => m.id === (selectedModelId || defaultModelId));
  const isUsingDefault = !selectedModelId && defaultModelId;

  // Providers disponíveis nos modelos
  const availableProviders = [...new Set(models.map(m => m.provider))];

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Botão trigger */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all text-sm",
          isDark
            ? "bg-white/[0.05] hover:bg-white/[0.08] text-white/80 border border-white/[0.08]"
            : "bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-200"
        )}
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <>
            <span className="truncate max-w-[150px]">
              {currentModel?.name || 'Selecionar modelo'}
            </span>
            {isUsingDefault && (
              <span className={cn(
                "text-[10px] px-1.5 py-0.5 rounded",
                isDark ? "bg-blue-500/20 text-blue-400" : "bg-blue-100 text-blue-600"
              )}>
                Padrão
              </span>
            )}
            <ChevronDown className={cn(
              "w-4 h-4 transition-transform",
              isOpen && "rotate-180"
            )} />
          </>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className={cn(
          "absolute top-full right-0 mt-2 w-[380px] max-h-[70vh] rounded-xl shadow-2xl z-50 flex flex-col",
          isDark
            ? "bg-[#1a1a1a] border border-white/10"
            : "bg-white border border-gray-200"
        )}>
          {/* Search */}
          <div className={cn(
            "p-3 border-b",
            isDark ? "border-white/10" : "border-gray-200"
          )}>
            <div className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-lg",
              isDark ? "bg-white/[0.05]" : "bg-gray-100"
            )}>
              <Search className={cn(
                "w-4 h-4",
                isDark ? "text-white/40" : "text-gray-400"
              )} />
              <input
                type="text"
                placeholder="Search models..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={cn(
                  "flex-1 bg-transparent outline-none text-sm",
                  isDark ? "text-white placeholder:text-white/40" : "text-gray-900 placeholder:text-gray-400"
                )}
                autoFocus
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')}>
                  <X className={cn(
                    "w-4 h-4",
                    isDark ? "text-white/40 hover:text-white/60" : "text-gray-400 hover:text-gray-600"
                  )} />
                </button>
              )}
            </div>
          </div>

          {/* Filtros de capacidade */}
          <div className={cn(
            "px-3 py-2 border-b flex flex-wrap gap-2",
            isDark ? "border-white/10" : "border-gray-200"
          )}>
            {/* All Models */}
            <button
              onClick={() => setSelectedCapability('all')}
              className={cn(
                "px-3 py-1 rounded-full text-xs font-medium transition-all",
                selectedCapability === 'all'
                  ? isDark
                    ? "bg-white/20 text-white"
                    : "bg-gray-900 text-white"
                  : isDark
                    ? "bg-white/[0.05] text-white/60 hover:bg-white/10"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              )}
            >
              All Models
            </button>

            {/* Capability filters */}
            {(['vision', 'coding', 'reasoning'] as ModelCapability[]).map(cap => {
              const Icon = CAPABILITY_ICONS[cap];
              return (
                <button
                  key={cap}
                  onClick={() => setSelectedCapability(cap)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all",
                    selectedCapability === cap
                      ? isDark
                        ? "bg-white/20 text-white"
                        : "bg-gray-900 text-white"
                      : isDark
                        ? "bg-white/[0.05] text-white/60 hover:bg-white/10"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  )}
                >
                  <Icon className="w-3 h-3" />
                  {CAPABILITY_LABELS[cap]}
                </button>
              );
            })}
          </div>

          {/* Filtros de provider */}
          <div className={cn(
            "px-3 py-2 border-b flex flex-wrap gap-2",
            isDark ? "border-white/10" : "border-gray-200"
          )}>
            <button
              onClick={() => setSelectedProvider('all')}
              className={cn(
                "px-3 py-1 rounded-full text-xs font-medium transition-all",
                selectedProvider === 'all'
                  ? isDark
                    ? "bg-blue-500/20 text-blue-400"
                    : "bg-blue-100 text-blue-600"
                  : isDark
                    ? "bg-white/[0.05] text-white/60 hover:bg-white/10"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              )}
            >
              All Providers
            </button>
            {availableProviders.map(provider => (
              <button
                key={provider}
                onClick={() => setSelectedProvider(provider)}
                className={cn(
                  "px-3 py-1 rounded-full text-xs font-medium transition-all",
                  selectedProvider === provider
                    ? isDark
                      ? "bg-blue-500/20 text-blue-400"
                      : "bg-blue-100 text-blue-600"
                    : isDark
                      ? "bg-white/[0.05] text-white/60 hover:bg-white/10"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                )}
              >
                {PROVIDER_LABELS[provider]}
              </button>
            ))}
          </div>

          {/* Chutes Auto option */}
          <div className={cn(
            "px-3 py-2 border-b",
            isDark ? "border-white/10" : "border-gray-200"
          )}>
            <button
              onClick={() => {
                onModelChange(''); // String vazia significa usar padrão
                setIsOpen(false);
              }}
              className={cn(
                "w-full flex items-center gap-3 p-3 rounded-lg transition-all",
                isDark
                  ? "hover:bg-white/[0.05]"
                  : "hover:bg-gray-50"
              )}
            >
              <div className={cn(
                "w-8 h-8 rounded-lg flex items-center justify-center",
                isDark ? "bg-gradient-to-br from-blue-500/20 to-purple-500/20" : "bg-gradient-to-br from-blue-100 to-purple-100"
              )}>
                <Sparkles className={cn(
                  "w-4 h-4",
                  isDark ? "text-blue-400" : "text-blue-600"
                )} />
              </div>
              <div className="flex-1 text-left">
                <div className={cn(
                  "font-medium text-sm",
                  isDark ? "text-white" : "text-gray-900"
                )}>
                  Usar Padrão do Workspace
                </div>
                <div className={cn(
                  "text-xs",
                  isDark ? "text-white/50" : "text-gray-500"
                )}>
                  {defaultModelId ? `Atualmente: ${models.find(m => m.id === defaultModelId)?.name || defaultModelId}` : 'Configurado nas configurações'}
                </div>
              </div>
              {isUsingDefault && (
                <Check className={cn(
                  "w-4 h-4",
                  isDark ? "text-blue-400" : "text-blue-600"
                )} />
              )}
            </button>
          </div>

          {/* Lista de modelos */}
          <div className="flex-1 overflow-y-auto scrollbar-thin min-h-0">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className={cn(
                  "w-6 h-6 animate-spin",
                  isDark ? "text-white/50" : "text-gray-400"
                )} />
              </div>
            ) : error ? (
              <div className={cn(
                "py-8 px-4 text-center text-sm",
                isDark ? "text-red-400" : "text-red-600"
              )}>
                <p className="font-medium mb-1">Erro ao carregar modelos</p>
                <p className={cn(
                  "text-xs",
                  isDark ? "text-red-400/70" : "text-red-500"
                )}>
                  {error}
                </p>
                <button
                  onClick={() => window.location.reload()}
                  className={cn(
                    "mt-3 px-3 py-1.5 text-xs rounded-lg transition-colors",
                    isDark
                      ? "bg-white/10 hover:bg-white/20 text-white"
                      : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                  )}
                >
                  Tentar novamente
                </button>
              </div>
            ) : filteredModels.length === 0 ? (
              <div className={cn(
                "py-8 text-center text-sm",
                isDark ? "text-white/50" : "text-gray-500"
              )}>
                Nenhum modelo encontrado
              </div>
            ) : (
              filteredModels.map(model => (
                <button
                  key={model.id}
                  onClick={() => {
                    onModelChange(model.id);
                    setIsOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-3 transition-all",
                    isDark
                      ? "hover:bg-white/[0.05]"
                      : "hover:bg-gray-50",
                    selectedModelId === model.id && (
                      isDark ? "bg-white/[0.08]" : "bg-gray-100"
                    )
                  )}
                >
                  {/* Provider icon/badge */}
                  <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold uppercase",
                    isDark ? "bg-white/[0.08] text-white/60" : "bg-gray-200 text-gray-600"
                  )}>
                    {model.provider.slice(0, 2)}
                  </div>

                  {/* Model info */}
                  <div className="flex-1 text-left min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "font-medium text-sm truncate",
                        isDark ? "text-white" : "text-gray-900"
                      )}>
                        {model.name}
                      </span>
                      {/* Context length badge */}
                      <span className={cn(
                        "text-[10px] px-1.5 py-0.5 rounded font-mono",
                        isDark ? "bg-purple-500/20 text-purple-400" : "bg-purple-100 text-purple-600"
                      )}>
                        {formatContextLength(model.contextLength)}
                      </span>
                      {/* Quantization badge */}
                      {model.quantization && (
                        <span className={cn(
                          "text-[10px] px-1.5 py-0.5 rounded uppercase",
                          isDark ? "bg-white/10 text-white/50" : "bg-gray-100 text-gray-500"
                        )}>
                          {model.quantization}
                        </span>
                      )}
                      {/* TEE badge */}
                      {model.hasTEE && (
                        <Shield className={cn(
                          "w-3 h-3",
                          isDark ? "text-green-400" : "text-green-600"
                        )} title="Computação Confidencial (TEE)" />
                      )}
                    </div>

                    {/* Capabilities + Pricing */}
                    <div className="flex items-center gap-1.5 mt-1">
                      {model.capabilities.filter(c => c !== 'general').map(cap => {
                        const Icon = CAPABILITY_ICONS[cap];
                        return (
                          <div
                            key={cap}
                            className={cn(
                              "flex items-center gap-0.5 text-[10px] px-1 py-0.5 rounded",
                              isDark ? "bg-white/5 text-white/50" : "bg-gray-100 text-gray-500"
                            )}
                            title={CAPABILITY_LABELS[cap]}
                          >
                            <Icon className="w-2.5 h-2.5" />
                            <span className="hidden sm:inline">{CAPABILITY_LABELS[cap]}</span>
                          </div>
                        );
                      })}
                      {/* Pricing */}
                      {model.pricing && (
                        <span className={cn(
                          "text-[9px] ml-auto",
                          isDark ? "text-white/30" : "text-gray-400"
                        )}>
                          ${model.pricing.input.toFixed(2)}/M in · ${model.pricing.output.toFixed(2)}/M out
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Selected check */}
                  {selectedModelId === model.id && (
                    <Check className={cn(
                      "w-4 h-4 flex-shrink-0",
                      isDark ? "text-blue-400" : "text-blue-600"
                    )} />
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
