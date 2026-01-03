import { useState, useEffect, useRef } from 'react';
import { X, Settings, Loader2, AlertCircle, RefreshCw, Database, Plug, Search, ChevronDown, Check, Eye, Code, Brain, Sparkles, Wrench, Shield } from 'lucide-react';
import { Theme } from '../../hooks/useTheme';
import { AIConfiguration, ChutesModel, EnrichedModel, ModelCapability, ModelProvider } from '../../types/ai-assistant';
import {
  getConfiguration,
  updateConfiguration,
  getAvailableModels,
} from '../../services/ai-assistant-service';
import { toast } from 'sonner';
import { RagManagementTab } from './RagManagementTab';
import { McpServersTab } from './McpServersTab';
import { cn } from '../ui/utils';

type TabId = 'general' | 'rag' | 'mcp';

interface AIConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  userId: string;
  theme: Theme;
  initialTab?: TabId;
}

// Helper para formatar context length
function formatContextLength(tokens?: number): string {
  if (!tokens) return '';
  if (tokens >= 1000000) return `${(tokens / 1000000).toFixed(1)}M`;
  if (tokens >= 1000) return `${Math.round(tokens / 1000)}K`;
  return String(tokens);
}

// Extrair nome amigável do modelo
function extractModelName(id: string): string {
  const nameParts = id.split('/');
  let name = nameParts[nameParts.length - 1];

  // Detectar características antes de limpar
  const hasInstruct = name.includes('-Instruct');
  const hasTEE = name.includes('-TEE');
  const hasThinking = name.includes('-Thinking');
  const hasFP8 = name.includes('-FP8');

  // Extrair ÚLTIMA versão numérica
  const versionMatches = name.match(/-(\d{4})(?=-|$)/g);
  const version = versionMatches ? versionMatches[versionMatches.length - 1].replace('-', '') : null;

  // Remover sufixos
  name = name
    .replace(/-Instruct/gi, '')
    .replace(/-Thinking/gi, '')
    .replace(/-FP8/gi, '')
    .replace(/-TEE/gi, '')
    .replace(/-\d{4}/g, '')
    .replace(/-it$/i, '')
    .replace(/-Preview$/i, '')
    .replace(/-Chimera$/i, ' Chimera')
    .replace(/^unsloth-/, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .replace(/-/g, ' ');

  // Adicionar sufixos de volta
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
  if (id.includes('mistral') || ownedBy.includes('mistral')) return 'mistral';
  if (id.includes('llama') || id.includes('meta') || ownedBy.includes('meta')) return 'meta';
  if (id.includes('gemma') || id.includes('google') || ownedBy.includes('google')) return 'google';
  if (id.includes('nous') || ownedBy.includes('nous')) return 'nous';
  if (id.includes('phi') || id.includes('microsoft') || ownedBy.includes('microsoft')) return 'microsoft';
  if (id.includes('unsloth')) return 'other'; // unsloth é um wrapper, não provider

  return 'other';
}

// Função para extrair capacidades do modelo
function getModelCapabilities(model: ChutesModel): ModelCapability[] {
  const capabilities: ModelCapability[] = ['general'];
  const features = model.supported_features || [];
  const inputModalities = model.input_modalities || [];

  if (inputModalities.includes('image') || features.includes('vision')) {
    capabilities.push('vision');
  }
  if (features.includes('reasoning') || model.id.toLowerCase().includes('r1')) {
    capabilities.push('reasoning');
  }
  if (features.includes('tools') || features.includes('json_mode')) {
    capabilities.push('tools');
  }
  const contextLength = model.context_length || model.max_model_len || 0;
  if (contextLength >= 32000 || model.id.toLowerCase().includes('code')) {
    capabilities.push('coding');
  }

  return [...new Set(capabilities)];
}

// Função para enriquecer modelo
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
    speed: 'medium',
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

export function AIConfigModal({
  isOpen,
  onClose,
  workspaceId,
  userId,
  theme,
  initialTab,
}: AIConfigModalProps) {
  const isDark = theme === 'dark';

  const [activeTab, setActiveTab] = useState<TabId>(initialTab || 'general');
  const [config, setConfig] = useState<AIConfiguration | null>(null);
  const [availableModels, setAvailableModels] = useState<ChutesModel[]>([]);
  const [enrichedModels, setEnrichedModels] = useState<EnrichedModel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Form state
  const [modelId, setModelId] = useState('');
  const [systemMessage, setSystemMessage] = useState('');
  const [temperature, setTemperature] = useState(0.7);
  const [dataToolsEnabled, setDataToolsEnabled] = useState(false);

  // Model selector state
  const [isModelSelectorOpen, setIsModelSelectorOpen] = useState(false);
  const [modelSearchQuery, setModelSearchQuery] = useState('');
  const [selectedCapability, setSelectedCapability] = useState<ModelCapability | 'all'>('all');
  const [selectedProvider, setSelectedProvider] = useState<ModelProvider | 'all'>('all');
  const modelSelectorRef = useRef<HTMLDivElement>(null);

  // Modelo selecionado para mostrar info dinâmica
  const selectedModel = availableModels.find(m => m.id === modelId);
  const currentEnrichedModel = enrichedModels.find(m => m.id === modelId);

  // Set initial tab when prop changes
  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  useEffect(() => {
    if (isOpen && workspaceId) {
      loadData();
    }
  }, [isOpen, workspaceId]);

  // Fechar model selector ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (modelSelectorRef.current && !modelSelectorRef.current.contains(event.target as Node)) {
        setIsModelSelectorOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      // Buscar configuração e modelos em paralelo
      const [configData, modelsData] = await Promise.all([
        getConfiguration(workspaceId),
        getAvailableModels()
      ]);

      if (configData) {
        setConfig(configData);
        setModelId(configData.model_id);
        setSystemMessage(configData.system_message);
        setTemperature(configData.temperature);
        setDataToolsEnabled(configData.data_tools_enabled ?? false);
      }

      setAvailableModels(modelsData);
      // Enriquecer modelos para exibição avançada
      setEnrichedModels(modelsData.map(enrichModel));
    } catch (error) {
      console.error('Error loading config:', error);
      setLoadError(error instanceof Error ? error.message : 'Erro ao carregar configurações');
      toast.error('Erro ao carregar configurações');
    } finally {
      setIsLoading(false);
    }
  };

  // Filtrar modelos
  const filteredModels = enrichedModels.filter(model => {
    const matchesSearch = !modelSearchQuery ||
      model.name.toLowerCase().includes(modelSearchQuery.toLowerCase()) ||
      model.id.toLowerCase().includes(modelSearchQuery.toLowerCase());

    const matchesCapability = selectedCapability === 'all' ||
      model.capabilities.includes(selectedCapability);

    const matchesProvider = selectedProvider === 'all' ||
      model.provider === selectedProvider;

    return matchesSearch && matchesCapability && matchesProvider;
  });

  // Providers disponíveis
  const availableProviders = [...new Set(enrichedModels.map(m => m.provider))];

  const handleSave = async () => {
    if (!config) return;

    setIsSaving(true);
    try {
      // Não salvamos max_tokens - agora é calculado dinamicamente pela API do modelo
      const { config: updatedConfig, error } = await updateConfiguration(workspaceId, {
        model_id: modelId,
        system_message: systemMessage,
        temperature,
        data_tools_enabled: dataToolsEnabled,
      });

      if (error || !updatedConfig) {
        toast.error('Erro ao salvar configurações');
        return;
      }

      toast.success('Configurações atualizadas!');
      onClose();
    } catch (error) {
      console.error('Error saving config:', error);
      toast.error('Erro ao salvar configurações');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className={`relative w-full max-w-2xl mx-4 rounded-lg shadow-xl ${
        isDark ? 'bg-true-black border border-white/[0.08]' : 'bg-white border border-border-light'
      }`}>
        {/* Header */}
        <div className={`flex items-center justify-between p-6 border-b ${
          isDark ? 'border-white/[0.08]' : 'border-border-light'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${
              isDark ? 'bg-[#0169D9]/10' : 'bg-[#0169D9]/10'
            }`}>
              <Settings className="w-5 h-5 text-[#0169D9]" />
            </div>
            <div>
              <h2 className={`text-lg font-semibold ${
                isDark ? 'text-white' : 'text-text-primary-light'
              }`}>
                Configurações do Assistente IA
              </h2>
              <p className={`text-sm ${
                isDark ? 'text-white/50' : 'text-text-secondary-light'
              }`}>
                Personalize o comportamento da IA
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className={`p-2 rounded-lg transition-colors ${
              isDark
                ? 'hover:bg-white/[0.05] text-white/50 hover:text-white'
                : 'hover:bg-light-elevated text-text-secondary-light hover:text-text-primary-light'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className={`flex border-b ${isDark ? 'border-white/[0.08]' : 'border-border-light'}`}>
          <button
            onClick={() => setActiveTab('general')}
            className={`flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === 'general'
                ? isDark
                  ? 'text-[#0169D9] border-[#0169D9]'
                  : 'text-[#0169D9] border-[#0169D9]'
                : isDark
                  ? 'text-white/50 border-transparent hover:text-white/70'
                  : 'text-gray-500 border-transparent hover:text-gray-700'
            }`}
          >
            <Settings className="w-4 h-4" />
            Geral
          </button>
          <button
            onClick={() => setActiveTab('rag')}
            className={`flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === 'rag'
                ? isDark
                  ? 'text-[#0169D9] border-[#0169D9]'
                  : 'text-[#0169D9] border-[#0169D9]'
                : isDark
                  ? 'text-white/50 border-transparent hover:text-white/70'
                  : 'text-gray-500 border-transparent hover:text-gray-700'
            }`}
          >
            <Database className="w-4 h-4" />
            Conhecimento
          </button>
          <button
            onClick={() => setActiveTab('mcp')}
            className={`flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === 'mcp'
                ? isDark
                  ? 'text-[#0169D9] border-[#0169D9]'
                  : 'text-[#0169D9] border-[#0169D9]'
                : isDark
                  ? 'text-white/50 border-transparent hover:text-white/70'
                  : 'text-gray-500 border-transparent hover:text-gray-700'
            }`}
          >
            <Plug className="w-4 h-4" />
            Integrações MCP
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {activeTab === 'mcp' ? (
            <McpServersTab workspaceId={workspaceId} theme={theme} />
          ) : activeTab === 'rag' ? (
            <RagManagementTab workspaceId={workspaceId} theme={theme} />
          ) : isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className={`w-8 h-8 animate-spin ${
                isDark ? 'text-white/50' : 'text-text-secondary-light'
              }`} />
            </div>
          ) : loadError ? (
            <div className="flex flex-col items-center justify-center py-12">
              <AlertCircle className={`w-12 h-12 mb-4 ${
                isDark ? 'text-red-400' : 'text-red-500'
              }`} />
              <p className={`text-center mb-2 font-medium ${
                isDark ? 'text-red-400' : 'text-red-600'
              }`}>
                Erro ao carregar configurações
              </p>
              <p className={`text-center text-sm mb-4 ${
                isDark ? 'text-white/50' : 'text-gray-500'
              }`}>
                {loadError}
              </p>
              <button
                onClick={loadData}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  isDark
                    ? 'bg-white/10 hover:bg-white/20 text-white'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                }`}
              >
                <RefreshCw className="w-4 h-4" />
                Tentar novamente
              </button>
            </div>
          ) : (
            <>
              {/* Model Selection - Advanced Selector */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  isDark ? 'text-white' : 'text-text-primary-light'
                }`}>
                  Modelo de IA Padrão
                </label>

                {/* Model Selector Dropdown */}
                <div className="relative" ref={modelSelectorRef}>
                  {/* Trigger Button */}
                  <button
                    type="button"
                    onClick={() => setIsModelSelectorOpen(!isModelSelectorOpen)}
                    className={cn(
                      "w-full flex items-center justify-between px-3 py-2.5 rounded-lg border transition-all text-left",
                      isDark
                        ? "bg-[#0a0a0a] border-white/[0.08] text-white hover:border-white/20"
                        : "bg-white border-border-light text-text-primary-light hover:border-gray-300",
                      isModelSelectorOpen && (isDark ? "border-[#0169D9]" : "border-[#0169D9]")
                    )}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {/* Provider badge */}
                      {currentEnrichedModel && (
                        <div className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold uppercase flex-shrink-0",
                          isDark ? "bg-white/[0.08] text-white/60" : "bg-gray-200 text-gray-600"
                        )}>
                          {currentEnrichedModel.provider.slice(0, 2)}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium truncate">
                            {currentEnrichedModel?.name || extractModelName(modelId) || 'Selecionar modelo'}
                          </span>
                          {currentEnrichedModel?.hasTEE && (
                            <Shield className={cn(
                              "w-3.5 h-3.5 flex-shrink-0",
                              isDark ? "text-green-400" : "text-green-600"
                            )} title="Computação Confidencial (TEE)" />
                          )}
                        </div>
                        {currentEnrichedModel && (
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className={cn(
                              "text-xs font-mono",
                              isDark ? "text-purple-400" : "text-purple-600"
                            )}>
                              {formatContextLength(currentEnrichedModel.contextLength)}
                            </span>
                            {currentEnrichedModel.quantization && (
                              <span className={cn(
                                "text-xs uppercase",
                                isDark ? "text-white/40" : "text-gray-500"
                              )}>
                                {currentEnrichedModel.quantization}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    <ChevronDown className={cn(
                      "w-4 h-4 flex-shrink-0 transition-transform",
                      isDark ? "text-white/50" : "text-gray-400",
                      isModelSelectorOpen && "rotate-180"
                    )} />
                  </button>

                  {/* Dropdown */}
                  {isModelSelectorOpen && (
                    <div className={cn(
                      "absolute top-full left-0 right-0 mt-2 rounded-xl shadow-2xl z-50 flex flex-col max-h-[400px]",
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
                            placeholder="Buscar modelos..."
                            value={modelSearchQuery}
                            onChange={(e) => setModelSearchQuery(e.target.value)}
                            className={cn(
                              "flex-1 bg-transparent outline-none text-sm",
                              isDark ? "text-white placeholder:text-white/40" : "text-gray-900 placeholder:text-gray-400"
                            )}
                            autoFocus
                          />
                          {modelSearchQuery && (
                            <button onClick={() => setModelSearchQuery('')}>
                              <X className={cn(
                                "w-4 h-4",
                                isDark ? "text-white/40 hover:text-white/60" : "text-gray-400 hover:text-gray-600"
                              )} />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Capability Filters */}
                      <div className={cn(
                        "px-3 py-2 border-b flex flex-wrap gap-2",
                        isDark ? "border-white/10" : "border-gray-200"
                      )}>
                        <button
                          type="button"
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
                          Todos
                        </button>
                        {(['vision', 'coding', 'reasoning', 'tools'] as ModelCapability[]).map(cap => {
                          const Icon = CAPABILITY_ICONS[cap];
                          return (
                            <button
                              type="button"
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

                      {/* Provider Filters */}
                      <div className={cn(
                        "px-3 py-2 border-b flex flex-wrap gap-2",
                        isDark ? "border-white/10" : "border-gray-200"
                      )}>
                        <button
                          type="button"
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
                          Todos Providers
                        </button>
                        {availableProviders.map(provider => (
                          <button
                            type="button"
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

                      {/* Model List */}
                      <div className="flex-1 overflow-y-auto scrollbar-thin">
                        {filteredModels.length === 0 ? (
                          <div className={cn(
                            "py-8 text-center text-sm",
                            isDark ? "text-white/50" : "text-gray-500"
                          )}>
                            Nenhum modelo encontrado
                          </div>
                        ) : (
                          filteredModels.map(model => (
                            <button
                              type="button"
                              key={model.id}
                              onClick={() => {
                                setModelId(model.id);
                                setIsModelSelectorOpen(false);
                                setModelSearchQuery('');
                              }}
                              className={cn(
                                "w-full flex items-center gap-3 px-3 py-3 transition-all text-left",
                                isDark
                                  ? "hover:bg-white/[0.05]"
                                  : "hover:bg-gray-50",
                                modelId === model.id && (
                                  isDark ? "bg-white/[0.08]" : "bg-gray-100"
                                )
                              )}
                            >
                              {/* Provider icon/badge */}
                              <div className={cn(
                                "w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold uppercase flex-shrink-0",
                                isDark ? "bg-white/[0.08] text-white/60" : "bg-gray-200 text-gray-600"
                              )}>
                                {model.provider.slice(0, 2)}
                              </div>

                              {/* Model info */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className={cn(
                                    "font-medium text-sm truncate",
                                    isDark ? "text-white" : "text-gray-900"
                                  )}>
                                    {model.name}
                                  </span>
                                  <span className={cn(
                                    "text-[10px] px-1.5 py-0.5 rounded font-mono flex-shrink-0",
                                    isDark ? "bg-purple-500/20 text-purple-400" : "bg-purple-100 text-purple-600"
                                  )}>
                                    {formatContextLength(model.contextLength)}
                                  </span>
                                  {model.quantization && (
                                    <span className={cn(
                                      "text-[10px] px-1.5 py-0.5 rounded uppercase flex-shrink-0",
                                      isDark ? "bg-white/10 text-white/50" : "bg-gray-100 text-gray-500"
                                    )}>
                                      {model.quantization}
                                    </span>
                                  )}
                                  {model.hasTEE && (
                                    <Shield className={cn(
                                      "w-3 h-3 flex-shrink-0",
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
                                      </div>
                                    );
                                  })}
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
                              {modelId === model.id && (
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

                {/* Info do modelo selecionado */}
                {currentEnrichedModel && (
                  <p className={`text-xs mt-2 ${
                    isDark ? 'text-white/40' : 'text-gray-500'
                  }`}>
                    O max_tokens é calculado automaticamente baseado no contexto do modelo
                  </p>
                )}
              </div>

              {/* System Message */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  isDark ? 'text-white' : 'text-text-primary-light'
                }`}>
                  Mensagem do Sistema
                </label>
                <textarea
                  value={systemMessage}
                  onChange={(e) => setSystemMessage(e.target.value)}
                  rows={4}
                  placeholder="Ex: Você é um assistente especializado em..."
                  className={`w-full px-3 py-2 rounded-lg border outline-none transition-colors resize-none ${
                    isDark
                      ? 'bg-white/[0.03] border-white/[0.08] text-white placeholder:text-white/30 focus:border-[#0169D9]'
                      : 'bg-white border-border-light text-text-primary-light placeholder:text-text-secondary-light focus:border-[#0169D9]'
                  }`}
                />
                <p className={`text-xs mt-1 ${
                  isDark ? 'text-white/30' : 'text-text-secondary-light'
                }`}>
                  Define o comportamento e personalidade da IA
                </p>
              </div>

              {/* Temperature */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  isDark ? 'text-white' : 'text-text-primary-light'
                }`}>
                  Temperatura: {temperature.toFixed(1)}
                </label>
                <input
                  type="range"
                  min="0"
                  max="2"
                  step="0.1"
                  value={temperature}
                  onChange={(e) => setTemperature(parseFloat(e.target.value))}
                  className="w-full"
                />
                <div className={`flex justify-between text-xs mt-1 ${
                  isDark ? 'text-white/30' : 'text-text-secondary-light'
                }`}>
                  <span>Preciso (0.0)</span>
                  <span>Criativo (2.0)</span>
                </div>
              </div>

              {/* Data Tools Toggle */}
              <div className={`p-4 rounded-lg border ${
                isDark
                  ? 'bg-white/[0.02] border-white/[0.08]'
                  : 'bg-gray-50 border-border-light'
              }`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${
                      dataToolsEnabled
                        ? 'bg-[#0169D9]/20 text-[#0169D9]'
                        : isDark
                          ? 'bg-white/[0.05] text-white/50'
                          : 'bg-gray-200 text-gray-500'
                    }`}>
                      <Database className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className={`font-medium ${
                        isDark ? 'text-white' : 'text-text-primary-light'
                      }`}>
                        Data Tools
                      </h3>
                      <p className={`text-sm mt-0.5 ${
                        isDark ? 'text-white/50' : 'text-text-secondary-light'
                      }`}>
                        Permite a IA consultar e atualizar dados do pipeline de forma segura
                      </p>
                    </div>
                  </div>

                  {/* Toggle Switch */}
                  <button
                    type="button"
                    onClick={() => setDataToolsEnabled(!dataToolsEnabled)}
                    className={cn(
                      "relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#0169D9] focus:ring-offset-2",
                      dataToolsEnabled
                        ? 'bg-[#0169D9]'
                        : isDark
                          ? 'bg-white/20'
                          : 'bg-gray-200'
                    )}
                  >
                    <span
                      className={cn(
                        "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                        dataToolsEnabled ? 'translate-x-5' : 'translate-x-0'
                      )}
                    />
                  </button>
                </div>

                {/* Capabilities list */}
                {dataToolsEnabled && (
                  <div className={`mt-4 pt-4 border-t ${
                    isDark ? 'border-white/[0.08]' : 'border-border-light'
                  }`}>
                    <p className={`text-xs font-medium mb-2 ${
                      isDark ? 'text-white/70' : 'text-text-primary-light'
                    }`}>
                      Capacidades habilitadas:
                    </p>
                    <ul className={`text-xs space-y-1 ${
                      isDark ? 'text-white/50' : 'text-text-secondary-light'
                    }`}>
                      <li className="flex items-center gap-2">
                        <span className="w-1 h-1 rounded-full bg-green-500" />
                        Buscar leads por nome, valor, status e etapa
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="w-1 h-1 rounded-full bg-green-500" />
                        Ver estatísticas do pipeline
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="w-1 h-1 rounded-full bg-green-500" />
                        Atualizar valor e etapa de leads
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="w-1 h-1 rounded-full bg-green-500" />
                        Buscar conversas por lead
                      </li>
                    </ul>

                    <div className={`flex items-center gap-2 mt-3 p-2 rounded-lg ${
                      isDark ? 'bg-amber-500/10' : 'bg-amber-50'
                    }`}>
                      <Shield className={`w-4 h-4 flex-shrink-0 ${
                        isDark ? 'text-amber-400' : 'text-amber-600'
                      }`} />
                      <p className={`text-xs ${
                        isDark ? 'text-amber-400' : 'text-amber-700'
                      }`}>
                        Acesso restrito ao seu workspace. Todas as ações são registradas.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer - Only show on General tab */}
        {activeTab === 'general' && (
          <div className={`flex items-center justify-end gap-3 p-6 border-t ${
            isDark ? 'border-white/[0.08]' : 'border-border-light'
          }`}>
            <button
              onClick={onClose}
              disabled={isSaving}
              className={`px-4 py-2 rounded-lg transition-colors ${
                isDark
                  ? 'hover:bg-white/[0.05] text-white/70'
                  : 'hover:bg-light-elevated text-text-secondary-light'
              }`}
            >
              Cancelar
            </button>

            <button
              onClick={handleSave}
              disabled={isSaving || isLoading}
              className={`px-4 py-2 rounded-lg transition-colors ${
                isSaving || isLoading
                  ? isDark
                    ? 'bg-white/[0.05] text-white/30 cursor-not-allowed'
                    : 'bg-light-elevated text-text-secondary-light cursor-not-allowed'
                  : 'bg-[#0169D9] hover:bg-[#0159c9] text-white'
              }`}
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 inline mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Salvar Configurações'
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
