import { useState, useEffect } from 'react';
import {
  X,
  Loader2,
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
} from 'lucide-react';
import { Theme } from '../../hooks/useTheme';
import { AICustomAgent, AGENT_COLORS, ChutesModel } from '../../types/ai-assistant';
import {
  createAgent,
  updateAgent,
} from '../../services/ai-agents-service';
import { getAvailableModels } from '../../services/ai-assistant-service';
import { RagKnowledgeBase } from '../RagKnowledgeBase';
import { toast } from 'sonner';

interface AgentEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  userId: string;
  theme: Theme;
  editingAgent: AICustomAgent | null;
  onAgentUpdated?: () => void;
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

export function AgentEditModal({
  isOpen,
  onClose,
  workspaceId,
  userId,
  theme,
  editingAgent,
  onAgentUpdated,
}: AgentEditModalProps) {
  const isDark = theme === 'dark';

  const [availableModels, setAvailableModels] = useState<ChutesModel[]>([]);
  const [formData, setFormData] = useState<AgentFormData>(defaultFormData);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingModels, setIsLoadingModels] = useState(true);

  // Load models on mount
  useEffect(() => {
    if (isOpen) {
      loadModels();
    }
  }, [isOpen]);

  // Set form data when editing agent changes
  useEffect(() => {
    if (editingAgent) {
      setFormData({
        name: editingAgent.name,
        description: editingAgent.description || '',
        icon: editingAgent.icon,
        color: editingAgent.color,
        system_prompt: editingAgent.system_prompt,
        model_id: editingAgent.model_id || '',
        temperature: editingAgent.temperature || 0.7,
        web_search_enabled: editingAgent.web_search_enabled,
        is_public: editingAgent.is_public,
      });
    } else {
      setFormData(defaultFormData);
    }
  }, [editingAgent]);

  const loadModels = async () => {
    setIsLoadingModels(true);
    try {
      const modelsData = await getAvailableModels();
      setAvailableModels(modelsData);
    } catch (error) {
      console.error('Error loading models:', error);
    } finally {
      setIsLoadingModels(false);
    }
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

        toast.success('Agente criado!');
        onAgentUpdated?.();
      }

      onClose();
    } catch (error) {
      console.error('Error saving agent:', error);
      toast.error('Erro ao salvar agente');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

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
            onClick={onClose}
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
              placeholder="Defina o comportamento e personalidade do agente..."
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
                disabled={isLoadingModels}
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
              <div className="flex justify-between text-xs mt-1">
                <span className={isDark ? 'text-white/30' : 'text-gray-400'}>Preciso</span>
                <span className={isDark ? 'text-white/30' : 'text-gray-400'}>Criativo</span>
              </div>
            </div>
          </div>

          {/* RAG Knowledge Base */}
          {editingAgent && (
            <div className={`p-4 rounded-lg border ${
              isDark ? 'bg-white/[0.02] border-white/[0.08]' : 'bg-gray-50 border-gray-200'
            }`}>
              <RagKnowledgeBase
                agentId={editingAgent.id}
                isDark={isDark}
                onDocumentCountChange={() => {}}
              />
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className={`sticky bottom-0 flex items-center justify-end gap-3 p-4 border-t ${
          isDark ? 'border-white/[0.08] bg-true-black' : 'border-gray-200 bg-white'
        }`}>
          <button
            onClick={onClose}
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
  );
}
