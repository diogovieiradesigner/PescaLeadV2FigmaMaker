import { useState, useEffect } from 'react';
import { X, Settings, Loader2, AlertCircle, RefreshCw, Database } from 'lucide-react';
import { Theme } from '../../hooks/useTheme';
import { AIConfiguration, ChutesModel } from '../../types/ai-assistant';
import {
  getConfiguration,
  updateConfiguration,
  getAvailableModels,
} from '../../services/ai-assistant-service';
import { toast } from 'sonner';
import { RagManagementTab } from './RagManagementTab';

type TabId = 'general' | 'rag';

interface AIConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  theme: Theme;
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
  name = name
    .replace(/-Instruct.*$/i, '')
    .replace(/-it$/i, '')
    .replace(/-Preview$/i, '')
    .replace(/-TEE$/i, ' TEE')
    .replace(/-/g, ' ');
  return name;
}

export function AIConfigModal({ isOpen, onClose, workspaceId, theme }: AIConfigModalProps) {
  const isDark = theme === 'dark';

  const [activeTab, setActiveTab] = useState<TabId>('general');
  const [config, setConfig] = useState<AIConfiguration | null>(null);
  const [availableModels, setAvailableModels] = useState<ChutesModel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Form state
  const [modelId, setModelId] = useState('');
  const [systemMessage, setSystemMessage] = useState('');
  const [temperature, setTemperature] = useState(0.7);

  // Modelo selecionado para mostrar info dinâmica
  const selectedModel = availableModels.find(m => m.id === modelId);

  useEffect(() => {
    if (isOpen && workspaceId) {
      loadData();
    }
  }, [isOpen, workspaceId]);

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
      }

      setAvailableModels(modelsData);
    } catch (error) {
      console.error('Error loading config:', error);
      setLoadError(error instanceof Error ? error.message : 'Erro ao carregar configurações');
      toast.error('Erro ao carregar configurações');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!config) return;

    setIsSaving(true);
    try {
      // Não salvamos max_tokens - agora é calculado dinamicamente pela API do modelo
      const { config: updatedConfig, error } = await updateConfiguration(workspaceId, {
        model_id: modelId,
        system_message: systemMessage,
        temperature,
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
            Base de Conhecimento
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {activeTab === 'rag' ? (
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
              {/* Model Selection */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  isDark ? 'text-white' : 'text-text-primary-light'
                }`}>
                  Modelo de IA Padrão
                </label>
                <select
                  value={modelId}
                  onChange={(e) => setModelId(e.target.value)}
                  className={`w-full px-3 py-2 rounded-lg border outline-none transition-colors ${
                    isDark
                      ? 'bg-[#0a0a0a] border-white/[0.08] text-white focus:border-[#0169D9]'
                      : 'bg-white border-border-light text-text-primary-light focus:border-[#0169D9]'
                  }`}
                  style={isDark ? { colorScheme: 'dark' } : undefined}
                >
                  {availableModels.map((model) => (
                    <option
                      key={model.id}
                      value={model.id}
                      className={isDark ? 'bg-[#0a0a0a] text-white' : 'bg-white text-black'}
                    >
                      {extractModelName(model.id)}
                    </option>
                  ))}
                </select>

                {/* Info do modelo selecionado */}
                {selectedModel && (
                  <div className={`mt-2 p-3 rounded-lg ${
                    isDark ? 'bg-white/[0.03] border border-white/[0.08]' : 'bg-gray-50 border border-gray-200'
                  }`}>
                    <div className="flex flex-wrap gap-2">
                      {/* Context Length */}
                      <span className={`text-xs px-2 py-1 rounded font-mono ${
                        isDark ? 'bg-purple-500/20 text-purple-400' : 'bg-purple-100 text-purple-600'
                      }`}>
                        Contexto: {formatContextLength(selectedModel.context_length || selectedModel.max_model_len)}
                      </span>

                      {/* Max Output */}
                      {selectedModel.max_output_length && (
                        <span className={`text-xs px-2 py-1 rounded font-mono ${
                          isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-600'
                        }`}>
                          Max Output: {formatContextLength(selectedModel.max_output_length)}
                        </span>
                      )}

                      {/* Quantization */}
                      {selectedModel.quantization && (
                        <span className={`text-xs px-2 py-1 rounded uppercase ${
                          isDark ? 'bg-white/10 text-white/60' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {selectedModel.quantization}
                        </span>
                      )}

                      {/* Vision */}
                      {selectedModel.input_modalities?.includes('image') && (
                        <span className={`text-xs px-2 py-1 rounded ${
                          isDark ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-600'
                        }`}>
                          Vision
                        </span>
                      )}

                      {/* Pricing */}
                      {selectedModel.pricing && (
                        <span className={`text-xs px-2 py-1 rounded ${
                          isDark ? 'bg-yellow-500/20 text-yellow-400' : 'bg-yellow-100 text-yellow-600'
                        }`}>
                          ${selectedModel.pricing.prompt.toFixed(2)}/M in · ${selectedModel.pricing.completion.toFixed(2)}/M out
                        </span>
                      )}
                    </div>
                    <p className={`text-xs mt-2 ${
                      isDark ? 'text-white/40' : 'text-gray-500'
                    }`}>
                      O max_tokens é calculado automaticamente baseado no contexto do modelo
                    </p>
                  </div>
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
