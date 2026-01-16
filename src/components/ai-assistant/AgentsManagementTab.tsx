import { useState, useEffect } from 'react';
import {
  Loader2,
  Plus,
  Trash2,
  Edit2,
  Copy,
  Globe,
  Lock,
  Bot,
  Brain,
  Sparkles,
  Zap,
  Rocket,
  Lightbulb,
  Code,
  Pencil,
  BookOpen,
  GraduationCap,
  Briefcase,
  Calculator,
  BarChart3,
  Globe2,
  Heart,
  MessageCircle,
  Search,
  Shield,
  Star,
  Target,
  Terminal,
  User,
  Users,
  Wand2,
  AlertCircle,
  Check,
  X,
} from 'lucide-react';
import { Theme } from '../../hooks/useTheme';
import { AICustomAgent, AGENT_COLORS, CreateAgentInput, UpdateAgentInput, ChutesModel } from '../../types/ai-assistant';
import {
  getAgents,
  createAgent,
  updateAgent,
  deleteAgent,
  duplicateAgent,
} from '../../services/ai-agents-service';
import { getAvailableModels } from '../../services/ai-assistant-service';
import { RagKnowledgeBase } from '../RagKnowledgeBase';
import { toast } from 'sonner';

interface AgentsManagementTabProps {
  workspaceId: string;
  userId: string;
  theme: Theme;
  initialEditAgent?: AICustomAgent | null; // Agente para editar ao abrir
  initialCreateNew?: boolean; // Se true, abre modal de criação
  onAgentUpdated?: () => void; // Callback quando agente é atualizado
}

// Mapeamento de nome do ícone para componente
const iconComponents: Record<string, React.ComponentType<{ className?: string }>> = {
  'bot': Bot,
  'brain': Brain,
  'sparkles': Sparkles,
  'zap': Zap,
  'rocket': Rocket,
  'lightbulb': Lightbulb,
  'code': Code,
  'pencil': Pencil,
  'book-open': BookOpen,
  'graduation-cap': GraduationCap,
  'briefcase': Briefcase,
  'calculator': Calculator,
  'chart-bar': BarChart3,
  'globe': Globe2,
  'heart': Heart,
  'message-circle': MessageCircle,
  'search': Search,
  'shield': Shield,
  'star': Star,
  'target': Target,
  'terminal': Terminal,
  'user': User,
  'users': Users,
  'wand-2': Wand2,
};

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

interface AgentFormData {
  name: string;
  description: string;
  icon: string;
  color: string;
  system_prompt: string;
  model_id: string;
  temperature: number;
  web_search_enabled: boolean;
  is_public: boolean;
}

const defaultFormData: AgentFormData = {
  name: '',
  description: '',
  icon: 'bot',
  color: '#0169D9',
  system_prompt: '',
  model_id: '',
  temperature: 0.7,
  web_search_enabled: false,
  is_public: false,
};

export function AgentsManagementTab({
  workspaceId,
  userId,
  theme,
  initialEditAgent,
  initialCreateNew,
  onAgentUpdated,
}: AgentsManagementTabProps) {
  const isDark = theme === 'dark';

  // State
  const [agents, setAgents] = useState<AICustomAgent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [availableModels, setAvailableModels] = useState<ChutesModel[]>([]);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingAgent, setEditingAgent] = useState<AICustomAgent | null>(null);
  const [formData, setFormData] = useState<AgentFormData>(defaultFormData);
  const [isSaving, setIsSaving] = useState(false);
  const [initialHandled, setInitialHandled] = useState(false);

  // Delete confirmation
  const [deletingAgent, setDeletingAgent] = useState<AICustomAgent | null>(null);

  // Load data
  useEffect(() => {
    loadData();
  }, [workspaceId]);

  // Handle initial edit/create props
  useEffect(() => {
    if (initialHandled || isLoading) return;

    if (initialEditAgent) {
      handleOpenModal(initialEditAgent);
      setInitialHandled(true);
    } else if (initialCreateNew) {
      handleOpenModal();
      setInitialHandled(true);
    }
  }, [initialEditAgent, initialCreateNew, isLoading, initialHandled]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [agentsData, modelsData] = await Promise.all([
        getAgents(workspaceId),
        getAvailableModels(),
      ]);
      setAgents(agentsData);
      setAvailableModels(modelsData);
    } catch (error) {
      console.error('Error loading agents:', error);
      toast.error('Erro ao carregar agentes');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenModal = async (agent?: AICustomAgent) => {
    if (agent) {
      setEditingAgent(agent);
      setFormData({
        name: agent.name,
        description: agent.description || '',
        icon: agent.icon,
        color: agent.color,
        system_prompt: agent.system_prompt,
        model_id: agent.model_id || '',
        temperature: agent.temperature || 0.7,
        web_search_enabled: agent.web_search_enabled,
        is_public: agent.is_public,
      });
    } else {
      setEditingAgent(null);
      setFormData(defaultFormData);
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingAgent(null);
    setFormData(defaultFormData);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error('Nome é obrigatório');
      return;
    }
    if (!formData.system_prompt.trim()) {
      toast.error('Prompt do sistema é obrigatório');
      return;
    }

    setIsSaving(true);
    try {
      if (editingAgent) {
        // Update
        const { agent, error } = await updateAgent(editingAgent.id, {
          name: formData.name,
          description: formData.description || undefined,
          icon: formData.icon,
          color: formData.color,
          system_prompt: formData.system_prompt,
          model_id: formData.model_id || undefined,
          temperature: formData.temperature,
          web_search_enabled: formData.web_search_enabled,
          is_public: formData.is_public,
        });

        if (error || !agent) {
          toast.error('Erro ao atualizar agente');
          return;
        }

        setAgents(prev => prev.map(a => a.id === agent.id ? agent : a));
        toast.success('Agente atualizado!');
        onAgentUpdated?.();
      } else {
        // Create
        const { agent, error } = await createAgent({
          workspace_id: workspaceId,
          user_id: userId,
          name: formData.name,
          description: formData.description || undefined,
          icon: formData.icon,
          color: formData.color,
          system_prompt: formData.system_prompt,
          model_id: formData.model_id || undefined,
          temperature: formData.temperature,
          web_search_enabled: formData.web_search_enabled,
          is_public: formData.is_public,
        });

        if (error || !agent) {
          toast.error('Erro ao criar agente');
          return;
        }

        setAgents(prev => [agent, ...prev]);
        toast.success('Agente criado!');
        onAgentUpdated?.();
      }

      handleCloseModal();
    } catch (error) {
      console.error('Error saving agent:', error);
      toast.error('Erro ao salvar agente');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingAgent) return;

    try {
      const { error } = await deleteAgent(deletingAgent.id);
      if (error) {
        toast.error('Erro ao deletar agente');
        return;
      }

      setAgents(prev => prev.filter(a => a.id !== deletingAgent.id));
      toast.success('Agente deletado!');
    } catch (error) {
      console.error('Error deleting agent:', error);
      toast.error('Erro ao deletar agente');
    } finally {
      setDeletingAgent(null);
    }
  };

  const handleDuplicate = async (agent: AICustomAgent) => {
    try {
      const { agent: newAgent, error } = await duplicateAgent(agent.id, userId);
      if (error || !newAgent) {
        toast.error('Erro ao duplicar agente');
        return;
      }

      setAgents(prev => [newAgent, ...prev]);
      toast.success('Agente duplicado!');
    } catch (error) {
      console.error('Error duplicating agent:', error);
      toast.error('Erro ao duplicar agente');
    }
  };

  const renderAgentIcon = (iconName: string, color: string, size: 'sm' | 'md' | 'lg' = 'md') => {
    const IconComponent = iconComponents[iconName] || Bot;
    const sizeClasses = {
      sm: 'w-4 h-4',
      md: 'w-5 h-5',
      lg: 'w-6 h-6',
    };

    return (
      <div
        className="rounded-lg flex items-center justify-center"
        style={{
          backgroundColor: `${color}20`,
          width: size === 'sm' ? 28 : size === 'md' ? 36 : 44,
          height: size === 'sm' ? 28 : size === 'md' ? 36 : 44,
        }}
      >
        <IconComponent className={sizeClasses[size]} style={{ color }} />
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className={`w-8 h-8 animate-spin ${isDark ? 'text-white/50' : 'text-gray-400'}`} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Agentes Personalizados
          </h3>
          <p className={`text-sm ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
            Crie agentes com prompts pré-definidos
          </p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#0169D9] hover:bg-[#0159c9] text-white text-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          Novo Agente
        </button>
      </div>

      {/* Agents List */}
      {agents.length === 0 ? (
        <div className={`text-center py-12 rounded-lg border ${
          isDark ? 'border-white/[0.08] bg-white/[0.02]' : 'border-gray-200 bg-gray-50'
        }`}>
          <Bot className={`w-12 h-12 mx-auto mb-4 ${isDark ? 'text-white/20' : 'text-gray-300'}`} />
          <p className={`text-sm ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
            Nenhum agente criado ainda
          </p>
          <button
            onClick={() => handleOpenModal()}
            className={`mt-4 text-sm ${isDark ? 'text-[#0169D9] hover:text-[#0159c9]' : 'text-[#0169D9] hover:text-[#0159c9]'}`}
          >
            Criar primeiro agente
          </button>
        </div>
      ) : (
        <div className="grid gap-3">
          {agents.map(agent => (
            <div
              key={agent.id}
              className={`group p-4 rounded-lg border transition-colors ${
                isDark
                  ? 'border-white/[0.08] hover:border-white/[0.15] bg-white/[0.02]'
                  : 'border-gray-200 hover:border-gray-300 bg-white'
              }`}
            >
              <div className="flex items-start gap-3">
                {renderAgentIcon(agent.icon, agent.color, 'lg')}

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className={`font-medium truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      {agent.name}
                    </h4>
                    {agent.is_public ? (
                      <Globe className={`w-3.5 h-3.5 flex-shrink-0 ${isDark ? 'text-white/40' : 'text-gray-400'}`} />
                    ) : (
                      <Lock className={`w-3.5 h-3.5 flex-shrink-0 ${isDark ? 'text-white/40' : 'text-gray-400'}`} />
                    )}
                  </div>
                  {agent.description && (
                    <p className={`text-sm mt-0.5 line-clamp-1 ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
                      {agent.description}
                    </p>
                  )}
                  <div className={`flex items-center gap-3 mt-2 text-xs ${isDark ? 'text-white/30' : 'text-gray-400'}`}>
                    <span>{agent.usage_count} uso{agent.usage_count !== 1 ? 's' : ''}</span>
                    {agent.model_id && (
                      <span className={`px-1.5 py-0.5 rounded ${isDark ? 'bg-white/10' : 'bg-gray-100'}`}>
                        {extractModelName(agent.model_id)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleDuplicate(agent)}
                    className={`p-1.5 rounded-lg transition-colors ${
                      isDark
                        ? 'hover:bg-white/10 text-white/50 hover:text-white'
                        : 'hover:bg-gray-100 text-gray-400 hover:text-gray-600'
                    }`}
                    title="Duplicar"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleOpenModal(agent)}
                    className={`p-1.5 rounded-lg transition-colors ${
                      isDark
                        ? 'hover:bg-white/10 text-white/50 hover:text-white'
                        : 'hover:bg-gray-100 text-gray-400 hover:text-gray-600'
                    }`}
                    title="Editar"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setDeletingAgent(agent)}
                    className={`p-1.5 rounded-lg transition-colors ${
                      isDark
                        ? 'hover:bg-red-500/10 text-white/50 hover:text-red-400'
                        : 'hover:bg-red-50 text-gray-400 hover:text-red-500'
                    }`}
                    title="Deletar"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={handleCloseModal} />

          <div className={`relative w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto rounded-lg shadow-xl ${
            isDark ? 'bg-true-black border border-white/[0.08]' : 'bg-white'
          }`}>
            {/* Modal Header */}
            <div className={`sticky top-0 z-10 flex items-center justify-between p-4 border-b ${
              isDark ? 'border-white/[0.08] bg-true-black' : 'border-gray-200 bg-white'
            }`}>
              <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {editingAgent ? 'Editar Agente' : 'Novo Agente'}
              </h3>
              <button
                onClick={handleCloseModal}
                className={`p-2 rounded-lg transition-colors ${
                  isDark ? 'hover:bg-white/10 text-white/50' : 'hover:bg-gray-100 text-gray-400'
                }`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-4 space-y-5">
              {/* Name & Description */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-white' : 'text-gray-700'}`}>
                    Nome *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Ex: Assistente de Vendas"
                    className={`w-full px-3 py-2 rounded-lg border outline-none transition-colors ${
                      isDark
                        ? 'bg-white/[0.03] border-white/[0.08] text-white placeholder:text-white/30 focus:border-[#0169D9]'
                        : 'bg-white border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-[#0169D9]'
                    }`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-white' : 'text-gray-700'}`}>
                    Descrição
                  </label>
                  <input
                    type="text"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Descrição curta do agente"
                    className={`w-full px-3 py-2 rounded-lg border outline-none transition-colors ${
                      isDark
                        ? 'bg-white/[0.03] border-white/[0.08] text-white placeholder:text-white/30 focus:border-[#0169D9]'
                        : 'bg-white border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-[#0169D9]'
                    }`}
                  />
                </div>
              </div>

              {/* Icon & Color */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-white' : 'text-gray-700'}`}>
                    Ícone
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.keys(iconComponents).map(iconName => {
                      const IconComp = iconComponents[iconName];
                      return (
                        <button
                          key={iconName}
                          onClick={() => setFormData(prev => ({ ...prev, icon: iconName }))}
                          className={`p-2 rounded-lg transition-colors ${
                            formData.icon === iconName
                              ? isDark
                                ? 'bg-[#0169D9]/20 text-[#0169D9] ring-1 ring-[#0169D9]'
                                : 'bg-[#0169D9]/10 text-[#0169D9] ring-1 ring-[#0169D9]'
                              : isDark
                                ? 'hover:bg-white/10 text-white/50'
                                : 'hover:bg-gray-100 text-gray-400'
                          }`}
                        >
                          <IconComp className="w-4 h-4" />
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-white' : 'text-gray-700'}`}>
                    Cor
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {AGENT_COLORS.map(color => (
                      <button
                        key={color}
                        onClick={() => setFormData(prev => ({ ...prev, color }))}
                        className={`w-8 h-8 rounded-lg transition-all ${
                          formData.color === color ? 'ring-2 ring-offset-2 ring-white/50 scale-110' : ''
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* System Prompt */}
              <div>
                <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-white' : 'text-gray-700'}`}>
                  Prompt do Sistema *
                </label>
                <textarea
                  value={formData.system_prompt}
                  onChange={(e) => setFormData(prev => ({ ...prev, system_prompt: e.target.value }))}
                  rows={6}
                  placeholder="Defina o comportamento e personalidade do agente. Este prompt será usado em todas as conversas com este agente.

Exemplo:
Você é um assistente de vendas especializado em ajudar leads a entender nossos produtos e serviços. Seja amigável, profissional e focado em resolver dúvidas e objeções."
                  className={`w-full px-3 py-2 rounded-lg border outline-none transition-colors resize-none ${
                    isDark
                      ? 'bg-white/[0.03] border-white/[0.08] text-white placeholder:text-white/30 focus:border-[#0169D9]'
                      : 'bg-white border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-[#0169D9]'
                  }`}
                />
                <p className={`text-xs mt-1 ${isDark ? 'text-white/30' : 'text-gray-400'}`}>
                  Este prompt será combinado com o prompt master das configurações gerais
                </p>
              </div>

              {/* Model & Temperature */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-white' : 'text-gray-700'}`}>
                    Modelo (opcional)
                  </label>
                  <select
                    value={formData.model_id}
                    onChange={(e) => setFormData(prev => ({ ...prev, model_id: e.target.value }))}
                    className={`w-full px-3 py-2 rounded-lg border outline-none transition-colors ${
                      isDark
                        ? 'bg-[#0a0a0a] border-white/[0.08] text-white focus:border-[#0169D9]'
                        : 'bg-white border-gray-200 text-gray-900 focus:border-[#0169D9]'
                    }`}
                    style={isDark ? { colorScheme: 'dark' } : undefined}
                  >
                    <option value="">Usar modelo padrão</option>
                    {availableModels.map(model => (
                      <option key={model.id} value={model.id}>
                        {extractModelName(model.id)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-white' : 'text-gray-700'}`}>
                    Temperatura: {formData.temperature.toFixed(1)}
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="2"
                    step="0.1"
                    value={formData.temperature}
                    onChange={(e) => setFormData(prev => ({ ...prev, temperature: parseFloat(e.target.value) }))}
                    className="w-full mt-2"
                  />
                  <div className={`flex justify-between text-xs ${isDark ? 'text-white/30' : 'text-gray-400'}`}>
                    <span>Preciso</span>
                    <span>Criativo</span>
                  </div>
                </div>
              </div>

              {/* Toggles */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer ${
                  formData.web_search_enabled
                    ? isDark
                      ? 'border-[#0169D9] bg-[#0169D9]/10'
                      : 'border-[#0169D9] bg-[#0169D9]/5'
                    : isDark
                      ? 'border-white/[0.08] hover:border-white/[0.15]'
                      : 'border-gray-200 hover:border-gray-300'
                }`}>
                  <input
                    type="checkbox"
                    checked={formData.web_search_enabled}
                    onChange={(e) => setFormData(prev => ({ ...prev, web_search_enabled: e.target.checked }))}
                    className="sr-only"
                  />
                  <div className={`w-5 h-5 rounded flex items-center justify-center ${
                    formData.web_search_enabled ? 'bg-[#0169D9] text-white' : isDark ? 'bg-white/10' : 'bg-gray-100'
                  }`}>
                    {formData.web_search_enabled && <Check className="w-3 h-3" />}
                  </div>
                  <div>
                    <span className={`block text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      Busca Web
                    </span>
                    <span className={`text-xs ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
                      Habilitar pesquisa na internet
                    </span>
                  </div>
                </label>

                <label className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer ${
                  formData.is_public
                    ? isDark
                      ? 'border-[#0169D9] bg-[#0169D9]/10'
                      : 'border-[#0169D9] bg-[#0169D9]/5'
                    : isDark
                      ? 'border-white/[0.08] hover:border-white/[0.15]'
                      : 'border-gray-200 hover:border-gray-300'
                }`}>
                  <input
                    type="checkbox"
                    checked={formData.is_public}
                    onChange={(e) => setFormData(prev => ({ ...prev, is_public: e.target.checked }))}
                    className="sr-only"
                  />
                  <div className={`w-5 h-5 rounded flex items-center justify-center ${
                    formData.is_public ? 'bg-[#0169D9] text-white' : isDark ? 'bg-white/10' : 'bg-gray-100'
                  }`}>
                    {formData.is_public && <Check className="w-3 h-3" />}
                  </div>
                  <div>
                    <span className={`block text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      Público
                    </span>
                    <span className={`text-xs ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
                      Visível para todo o workspace
                    </span>
                  </div>
                </label>
              </div>

              {/* Knowledge Base Section - Only show when editing */}
              {editingAgent && (
                <div className={`mt-6 pt-5 border-t ${isDark ? 'border-white/[0.08]' : 'border-gray-200'}`}>
                  <RagKnowledgeBase agentId={editingAgent.id} isDark={isDark} />
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className={`sticky bottom-0 flex items-center justify-end gap-3 p-4 border-t ${
              isDark ? 'border-white/[0.08] bg-true-black' : 'border-gray-200 bg-white'
            }`}>
              <button
                onClick={handleCloseModal}
                disabled={isSaving}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  isDark
                    ? 'hover:bg-white/[0.05] text-white/70'
                    : 'hover:bg-gray-100 text-gray-600'
                }`}
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  isSaving
                    ? 'bg-[#0169D9]/50 cursor-not-allowed'
                    : 'bg-[#0169D9] hover:bg-[#0159c9]'
                } text-white`}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 inline mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : editingAgent ? (
                  'Salvar Alterações'
                ) : (
                  'Criar Agente'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingAgent && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setDeletingAgent(null)} />

          <div className={`relative w-full max-w-md mx-4 rounded-lg shadow-xl p-6 ${
            isDark ? 'bg-true-black border border-white/[0.08]' : 'bg-white'
          }`}>
            <div className="flex items-start gap-4">
              <div className={`p-3 rounded-full ${isDark ? 'bg-red-500/10' : 'bg-red-50'}`}>
                <AlertCircle className={`w-6 h-6 ${isDark ? 'text-red-400' : 'text-red-500'}`} />
              </div>
              <div>
                <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  Deletar agente
                </h3>
                <p className={`text-sm mt-1 ${isDark ? 'text-white/70' : 'text-gray-600'}`}>
                  Tem certeza que deseja deletar "{deletingAgent.name}"? Esta ação não pode ser desfeita.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                onClick={() => setDeletingAgent(null)}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  isDark
                    ? 'hover:bg-white/[0.05] text-white/70'
                    : 'hover:bg-gray-100 text-gray-600'
                }`}
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white transition-colors"
              >
                Deletar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
