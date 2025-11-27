import { useState, useEffect } from 'react';
import {
  Database,
  Plus,
  FileText,
  Clock,
  Zap,
  MessageSquare,
  GitBranch,
  Mic,
  Image as ImageIcon,
  X,
  Trash2,
  Key,
  Inbox,
  Users,
  Save,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { supabase } from '../utils/supabase/client';
import { toast } from 'sonner@2.0.3';
import {
  fetchAIAgent,
  createAIAgent,
  updateAIAgent,
  maskApiKey,
  type AIAgent,
  type SpecialistAgent,
  type BehaviorConfig,
  DEFAULT_BEHAVIOR_CONFIG,
} from '../services/ai-agent-service';
import {
  fetchAgentInboxes,
  updateAgentInboxes,
} from '../services/ai-agent-inboxes-service';
import {
  fetchAgentAttendants,
  updateAgentAttendants,
  type AttendantConfig,
} from '../services/ai-agent-attendants-service';
import { RagKnowledgeBase } from './RagKnowledgeBase';

interface AgentConfigFormProps {
  isDark: boolean;
  agentId?: string | null; // null = criar novo, string = editar existente
  onSaved?: (agentId: string) => void;
}

interface InboxItem {
  id: string;
  name: string;
  description: string | null;
}

interface AttendantItem {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

export function AgentConfigForm({ isDark, agentId, onSaved }: AgentConfigFormProps) {
  // Estados do formulário
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Configurações Básicas
  const [agentName, setAgentName] = useState('Atendente Virtual');
  const [apiKey, setApiKey] = useState('');
  const [apiKeyMasked, setApiKeyMasked] = useState('');
  const [model, setModel] = useState('gpt-4o');
  const [isActive, setIsActive] = useState(true);
  const [systemPrompt, setSystemPrompt] = useState(
    'Você é um assistente virtual especialista em triagem de leads. Seu objetivo é qualificar clientes potenciais e agendar reuniões. Seja cordial, direto e profissional. Use o conhecimento fornecido para responder com precisão.'
  );

  // Agentes Especialistas
  const [specialistAgents, setSpecialistAgents] = useState<SpecialistAgent[]>([
    { id: crypto.randomUUID(), name: 'Especialista em Produtos', description: 'Conhecimento profundo sobre catálogo e especificações técnicas' },
    { id: crypto.randomUUID(), name: 'Especialista em Vendas', description: 'Técnicas de negociação e fechamento de contratos' },
  ]);

  // Behavior Config
  const [debounceSeconds, setDebounceSeconds] = useState(15);
  const [transcribeAudio, setTranscribeAudio] = useState(true);
  const [transcribeImage, setTranscribeImage] = useState(true);
  const [workingHoursMode, setWorkingHoursMode] = useState<BehaviorConfig['working_hours']['mode']>('24h');
  const [splitMessages, setSplitMessages] = useState(false);

  // CRM Update
  const [crmAutoUpdate, setCrmAutoUpdate] = useState(false);
  const [crmUpdatePrompt, setCrmUpdatePrompt] = useState(
    'Extraia informações relevantes da conversa para atualizar o lead: nome, email, telefone, empresa, cargo, interesse.'
  );

  // Inboxes e Atendentes
  const [availableInboxes, setAvailableInboxes] = useState<InboxItem[]>([]);
  const [availableAttendants, setAvailableAttendants] = useState<AttendantItem[]>([]);
  const [loadingInboxes, setLoadingInboxes] = useState(true);
  const [loadingAttendants, setLoadingAttendants] = useState(true);
  const [selectedInboxes, setSelectedInboxes] = useState<string[]>([]);
  const [selectedAttendants, setSelectedAttendants] = useState<string[]>([]);
  const [attendantConfigs, setAttendantConfigs] = useState<Record<string, AttendantConfig>>({});

  // Workspace ID
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);

  // Carregar dados iniciais
  useEffect(() => {
    loadInitialData();
  }, [agentId]);

  const loadInitialData = async () => {
    try {
      setLoading(true);

      // Buscar workspace do usuário
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Usuário não autenticado. Faça login novamente.');
        return;
      }

      const { data: memberData } = await supabase
        .from('workspace_members')
        .select('workspace_id')
        .eq('user_id', user.id)
        .single();

      if (!memberData) {
        toast.error('Você não está vinculado a nenhum workspace');
        return;
      }

      const wsId = memberData.workspace_id;
      setWorkspaceId(wsId);

      // Carregar inboxes
      loadInboxes(wsId);

      // Carregar atendentes
      loadAttendants(wsId);

      // Se tem agentId, carregar dados do agente
      if (agentId) {
        await loadAgentData(agentId);
      }
    } catch (error: any) {
      console.error('[AgentConfigForm] Error loading initial data:', error);
      toast.error(error?.message || 'Erro ao carregar dados iniciais');
    } finally {
      setLoading(false);
    }
  };

  const loadInboxes = async (wsId: string) => {
    try {
      const { data: inboxes } = await supabase
        .from('inboxes')
        .select('id, name, description')
        .eq('workspace_id', wsId)
        .order('created_at', { ascending: false });

      setAvailableInboxes(inboxes || []);
    } catch (error) {
      console.log('⚠️ Error loading inboxes (silent):', error);
    } finally {
      setLoadingInboxes(false);
    }
  };

  const loadAttendants = async (wsId: string) => {
    try {
      const { data: members } = await supabase
        .from('workspace_members')
        .select(`
          user_id,
          users:users!workspace_members_user_id_fkey (
            id,
            name,
            email
          )
        `)
        .eq('workspace_id', wsId);

      const attendants = members
        ?.filter(m => m.users)
        .map(m => {
          const user = m.users as any;
          const nameParts = user.name?.split(' ') || ['?'];
          const avatar = nameParts.length >= 2
            ? `${nameParts[0][0]}${nameParts[1][0]}`.toUpperCase()
            : nameParts[0][0].toUpperCase();

          return {
            id: user.id,
            name: user.name || 'Sem nome',
            email: user.email || '',
            avatar
          };
        }) || [];

      setAvailableAttendants(attendants);
    } catch (error) {
      console.log('⚠️ Error loading attendants (silent):', error);
    } finally {
      setLoadingAttendants(false);
    }
  };

  const loadAgentData = async (id: string) => {
    try {
      console.log('[AgentConfigForm] 📥 Carregando dados do agente:', id);
      const agent = await fetchAIAgent(id);
      if (!agent) {
        console.error('[AgentConfigForm] ❌ Agente não encontrado:', id);
        toast.error('Agente não encontrado');
        return;
      }
      console.log('[AgentConfigForm] ✅ Agente carregado:', agent.name);

      // Configurações Básicas
      setAgentName(agent.name);
      setApiKeyMasked(maskApiKey(agent.api_key_encrypted));
      setApiKey(''); // Não carregar a key real por segurança
      setModel(agent.model);
      setIsActive(agent.is_active);
      setSystemPrompt(agent.system_prompt);

      // Especialistas
      setSpecialistAgents(agent.specialist_agents || []);

      // Behavior Config
      const config = agent.behavior_config || DEFAULT_BEHAVIOR_CONFIG;
      setDebounceSeconds(config.timing?.debounce_seconds || 15);
      setTranscribeAudio(config.transcription?.audio_enabled ?? true);
      setTranscribeImage(config.transcription?.image_enabled ?? true);
      setWorkingHoursMode(config.working_hours?.mode || '24h');
      setSplitMessages(config.response?.split_long_messages || false);

      // CRM
      setCrmAutoUpdate(agent.crm_auto_update || false);
      setCrmUpdatePrompt(agent.crm_update_prompt || '');

      // Inboxes
      const inboxIds = await fetchAgentInboxes(id);
      setSelectedInboxes(inboxIds);

      // Atendentes
      const attendants = await fetchAgentAttendants(id);
      const selectedIds = attendants.map(a => a.user_id);
      setSelectedAttendants(selectedIds);

      const configs: Record<string, AttendantConfig> = {};
      attendants.forEach(att => {
        configs[att.user_id] = {
          user_id: att.user_id,
          trigger_conditions: att.trigger_conditions,
          message_to_attendant: att.message_to_attendant,
          message_to_customer: att.message_to_customer,
        };
      });
      setAttendantConfigs(configs);

      setHasChanges(false);
    } catch (error: any) {
      console.error('[AgentConfigForm] Error loading agent:', error);
      toast.error(error?.message || 'Erro ao carregar agente');
    }
  };

  // Handlers
  const handleSave = async () => {
    try {
      setSaving(true);

      if (!workspaceId) {
        toast.error('Workspace não encontrado');
        return;
      }

      if (!agentName.trim()) {
        toast.error('Nome do agente é obrigatório');
        return;
      }

      if (!agentId && !apiKey.trim()) {
        toast.error('API Key é obrigatória');
        return;
      }

      const agentData = {
        workspace_id: workspaceId,
        name: agentName,
        api_key_encrypted: apiKey || undefined, // Só atualizar se foi modificada
        model,
        is_active: isActive,
        system_prompt: systemPrompt,
        specialist_agents: specialistAgents,
        crm_auto_update: crmAutoUpdate,
        crm_update_prompt: crmUpdatePrompt || null,
        behavior_config: {
          timing: {
            debounce_seconds: debounceSeconds,
          },
          transcription: {
            audio_enabled: transcribeAudio,
            image_enabled: transcribeImage,
          },
          working_hours: {
            mode: workingHoursMode,
          },
          response: {
            split_long_messages: splitMessages,
          },
        },
      };

      let savedAgentId: string;

      if (agentId) {
        // Atualizar agente existente
        console.log('[AgentConfigForm] 🔄 MODO UPDATE - Agente ID:', agentId);
        const updated = await updateAIAgent(agentId, agentData);
        savedAgentId = updated.id;
        console.log('[AgentConfigForm] ✅ Agente atualizado:', savedAgentId);
        toast.success('Agente atualizado com sucesso');
      } else {
        // Criar novo agente
        console.log('[AgentConfigForm] ➕ MODO INSERT - Criando novo agente');
        const created = await createAIAgent(agentData as any);
        savedAgentId = created.id;
        console.log('[AgentConfigForm] ✅ Novo agente criado:', savedAgentId);
        toast.success('Agente criado com sucesso');
      }

      // Atualizar inboxes
      await updateAgentInboxes(savedAgentId, selectedInboxes);

      // Atualizar atendentes
      const attendantsList: AttendantConfig[] = selectedAttendants.map(userId => ({
        user_id: userId,
        trigger_conditions: attendantConfigs[userId]?.trigger_conditions || '',
        message_to_attendant: attendantConfigs[userId]?.message_to_attendant || 'Você foi solicitado para atender um novo lead.',
        message_to_customer: attendantConfigs[userId]?.message_to_customer || 'Um momento, vou transferir você para um de nossos especialistas.',
      }));
      await updateAgentAttendants(savedAgentId, attendantsList);

      setHasChanges(false);

      if (onSaved) {
        onSaved(savedAgentId);
      }
    } catch (error: any) {
      console.error('[AgentConfigForm] Error saving:', error);
      toast.error(error?.message || 'Erro ao salvar agente');
    } finally {
      setSaving(false);
    }
  };



  const addSpecialistAgent = () => {
    setSpecialistAgents([
      ...specialistAgents,
      { id: crypto.randomUUID(), name: '', description: '' },
    ]);
    setHasChanges(true);
  };

  const updateSpecialistAgent = (id: string, field: keyof SpecialistAgent, value: string) => {
    setSpecialistAgents(prev =>
      prev.map(agent => (agent.id === id ? { ...agent, [field]: value } : agent))
    );
    setHasChanges(true);
  };

  const removeSpecialistAgent = (id: string) => {
    setSpecialistAgents(prev => prev.filter(agent => agent.id !== id));
    setHasChanges(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className={`w-8 h-8 animate-spin ${isDark ? 'text-white/60' : 'text-gray-600'}`} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header com Botão Salvar */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {agentId ? 'Editar Agente de IA' : 'Novo Agente de IA'}
          </h2>
          {hasChanges && (
            <p className={`text-sm mt-1 ${isDark ? 'text-yellow-400' : 'text-yellow-600'}`}>
              <AlertCircle className="w-4 h-4 inline mr-1" />
              Alterações não salvas
            </p>
          )}
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-[#0169D9] text-white rounded-lg hover:bg-[#0159C1] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Salvando...
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Salvar Alterações
            </>
          )}
        </button>
      </div>

      {/* Configurações Básicas */}
      <div className={`p-6 rounded-xl border ${isDark ? 'bg-white/[0.02] border-white/[0.08]' : 'bg-white border-gray-200'}`}>
        <div className="flex items-center gap-3 mb-6">
          <Database className={`w-5 h-5 ${isDark ? 'text-white/60' : 'text-gray-600'}`} />
          <h3 className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Configurações Básicas
          </h3>
        </div>

        <div className="space-y-4">
          <div>
            <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Nome do Agente
            </label>
            <input
              type="text"
              value={agentName}
              onChange={(e) => { setAgentName(e.target.value); setHasChanges(true); }}
              placeholder="Ex: Atendente Virtual"
              className={`w-full px-3 py-2 rounded-lg border outline-none transition-colors ${
                isDark
                  ? 'bg-white/[0.05] border-white/[0.1] text-white placeholder-white/40 focus:border-[#0169D9]'
                  : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400 focus:border-[#0169D9]'
              }`}
            />
          </div>

          <div>
            <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Chave API OpenRouter
            </label>
            <div className="relative">
              <Key className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isDark ? 'text-white/40' : 'text-gray-400'}`} />
              <input
                type="password"
                value={apiKey}
                onChange={(e) => { setApiKey(e.target.value); setHasChanges(true); }}
                placeholder={apiKeyMasked || 'sk-or-v1-...'}
                className={`w-full pl-10 pr-3 py-2 rounded-lg border outline-none transition-colors ${
                  isDark
                    ? 'bg-white/[0.05] border-white/[0.1] text-white placeholder-white/40 focus:border-[#0169D9]'
                    : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400 focus:border-[#0169D9]'
                }`}
              />
            </div>
            {apiKeyMasked && (
              <p className={`text-xs mt-1 ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
                Deixe em branco para manter a chave atual: {apiKeyMasked}
              </p>
            )}
          </div>

          <div>
            <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Modelo de IA
            </label>
            <select
              value={model}
              onChange={(e) => { setModel(e.target.value); setHasChanges(true); }}
              className={`w-full px-3 py-2 rounded-lg border outline-none transition-colors ${
                isDark
                  ? 'bg-white/[0.05] border-white/[0.1] text-white focus:border-[#0169D9]'
                  : 'bg-white border-gray-200 text-gray-900 focus:border-[#0169D9]'
              }`}
            >
              <option value="gpt-4o">GPT-4o (Recomendado)</option>
              <option value="gpt-4o-mini">GPT-4o Mini (Econômico)</option>
              <option value="claude-3.5-sonnet">Claude 3.5 Sonnet</option>
              <option value="claude-3-haiku">Claude 3 Haiku (Rápido)</option>
              <option value="gemini-pro">Gemini Pro</option>
            </select>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <label className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Status do Agente
              </label>
              <p className={`text-xs ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
                Agente ativo e disponível para atender
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => { setIsActive(e.target.checked); setHasChanges(true); }}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-[#0169D9]"></div>
            </label>
          </div>

          <div>
            <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Prompt Principal do Agente
            </label>
            <textarea
              value={systemPrompt}
              onChange={(e) => { setSystemPrompt(e.target.value); setHasChanges(true); }}
              rows={10}
              placeholder="Você é um assistente virtual..."
              className={`w-full px-3 py-2 rounded-lg border resize-y outline-none transition-colors ${
                isDark
                  ? 'bg-white/[0.05] border-white/[0.1] text-white placeholder-white/40 focus:border-[#0169D9]'
                  : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400 focus:border-[#0169D9]'
              }`}
            />
          </div>
        </div>
      </div>

      {/* Divisória */}
      <div className={`border-t ${isDark ? 'border-white/[0.08]' : 'border-gray-200'}`} />

      {/* Agentes Especialistas */}
      <div className={`p-6 rounded-xl border ${isDark ? 'bg-white/[0.02] border-white/[0.08]' : 'bg-white border-gray-200'}`}>
        <div className="flex items-center gap-3 mb-6">
          <GitBranch className={`w-5 h-5 ${isDark ? 'text-white/60' : 'text-gray-600'}`} />
          <h3 className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Agentes Especialistas (Orquestrador)
          </h3>
        </div>

        <p className={`text-sm mb-4 ${isDark ? 'text-white/60' : 'text-gray-600'}`}>
          Configure agentes especializados que podem ser acionados pelo orquestrador principal
        </p>

        <div className="space-y-3 mb-4">
          {specialistAgents.map((agent) => (
            <div
              key={agent.id}
              className={`p-4 rounded-xl border ${isDark ? 'bg-white/[0.02] border-white/[0.08]' : 'bg-white border-gray-200'}`}
            >
              <div className="flex items-start gap-3">
                <GitBranch className={`w-5 h-5 mt-1 flex-shrink-0 ${isDark ? 'text-purple-400' : 'text-purple-600'}`} />

                <div className="flex-1 space-y-3">
                  <input
                    type="text"
                    value={agent.name}
                    onChange={(e) => updateSpecialistAgent(agent.id, 'name', e.target.value)}
                    placeholder="Nome do agente especialista"
                    className={`w-full px-3 py-2 rounded-lg border text-sm font-medium outline-none transition-colors ${
                      isDark
                        ? 'bg-white/[0.05] border-white/[0.1] text-white placeholder-white/40 focus:border-[#0169D9]'
                        : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400 focus:border-[#0169D9]'
                    }`}
                  />

                  <textarea
                    value={agent.description}
                    onChange={(e) => updateSpecialistAgent(agent.id, 'description', e.target.value)}
                    rows={2}
                    placeholder="Descreva a expertise deste agente (ex: conhecimento sobre produtos, vendas, suporte técnico...)"
                    className={`w-full px-3 py-2 rounded-lg border text-sm resize-y outline-none transition-colors ${
                      isDark
                        ? 'bg-white/[0.05] border-white/[0.1] text-white placeholder-white/40 focus:border-[#0169D9]'
                        : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400 focus:border-[#0169D9]'
                    }`}
                  />
                </div>

                <button
                  onClick={() => removeSpecialistAgent(agent.id)}
                  className={`p-2 rounded-lg transition-colors flex-shrink-0 ${
                    isDark
                      ? 'hover:bg-red-500/10 text-white/40 hover:text-red-400'
                      : 'hover:bg-red-50 text-gray-400 hover:text-red-600'
                  }`}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={addSpecialistAgent}
          className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg border border-dashed transition-colors ${
            isDark
              ? 'border-white/[0.1] hover:bg-white/[0.03] text-white/60 hover:text-white/80'
              : 'border-gray-300 hover:bg-gray-50 text-gray-600 hover:text-gray-900'
          }`}
        >
          <Plus className="w-4 h-4" />
          <span className="text-sm font-medium">Adicionar Agente Especialista</span>
        </button>
      </div>

      {/* Divisória */}
      <div className={`border-t ${isDark ? 'border-white/[0.08]' : 'border-gray-200'}`} />

      {/* Caixas de Entrada */}
      <div className={`p-6 rounded-xl border ${isDark ? 'bg-white/[0.02] border-white/[0.08]' : 'bg-white border-gray-200'}`}>
        <div className="flex items-center gap-3 mb-6">
          <Inbox className={`w-5 h-5 ${isDark ? 'text-white/60' : 'text-gray-600'}`} />
          <h3 className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Caixas de Entrada
          </h3>
        </div>

        <p className={`text-sm mb-4 ${isDark ? 'text-white/60' : 'text-gray-600'}`}>
          Selecione as caixas de entrada onde o agente deve atuar
        </p>

        {loadingInboxes ? (
          <div className="text-center py-8">
            <Loader2 className={`w-8 h-8 animate-spin mx-auto ${isDark ? 'text-white/40' : 'text-gray-400'}`} />
          </div>
        ) : availableInboxes.length === 0 ? (
          <div className={`text-center py-8 ${isDark ? 'text-white/40' : 'text-gray-400'}`}>
            <Inbox className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Nenhuma caixa de entrada encontrada</p>
          </div>
        ) : (
          <div className="space-y-2">
            {availableInboxes.map((inbox) => (
              <label
                key={inbox.id}
                className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
                  selectedInboxes.includes(inbox.id)
                    ? isDark
                      ? 'border-[#0169D9] bg-[#0169D9]/10'
                      : 'border-[#0169D9] bg-blue-50'
                    : isDark
                      ? 'border-white/[0.08] hover:bg-white/[0.03]'
                      : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedInboxes.includes(inbox.id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedInboxes([...selectedInboxes, inbox.id]);
                    } else {
                      setSelectedInboxes(selectedInboxes.filter(id => id !== inbox.id));
                    }
                    setHasChanges(true);
                  }}
                  className="w-4 h-4 rounded accent-[#0169D9]"
                />

                <Inbox className={`w-5 h-5 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />

                <div className="flex-1">
                  <div className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {inbox.name}
                  </div>
                  {inbox.description && (
                    <div className={`text-xs mt-0.5 ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
                      {inbox.description}
                    </div>
                  )}
                </div>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Divisória */}
      <div className={`border-t ${isDark ? 'border-white/[0.08]' : 'border-gray-200'}`} />

      {/* Atendentes Disponíveis */}
      <div className={`p-6 rounded-xl border ${isDark ? 'bg-white/[0.02] border-white/[0.08]' : 'bg-white border-gray-200'}`}>
        <div className="flex items-center gap-3 mb-6">
          <Users className={`w-5 h-5 ${isDark ? 'text-white/60' : 'text-gray-600'}`} />
          <h3 className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Atendentes Disponíveis
          </h3>
        </div>

        <p className={`text-sm mb-4 ${isDark ? 'text-white/60' : 'text-gray-600'}`}>
          Selecione os atendentes que a IA pode chamar durante a conversa
        </p>

        {loadingAttendants ? (
          <div className="text-center py-8">
            <Loader2 className={`w-8 h-8 animate-spin mx-auto ${isDark ? 'text-white/40' : 'text-gray-400'}`} />
          </div>
        ) : availableAttendants.length === 0 ? (
          <div className={`text-center py-8 ${isDark ? 'text-white/40' : 'text-gray-400'}`}>
            <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Nenhum atendente encontrado</p>
          </div>
        ) : (
          <div className="space-y-3">
            {availableAttendants.map((attendant) => (
              <div key={attendant.id} className="space-y-3">
                <label
                  className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
                    selectedAttendants.includes(attendant.id)
                      ? isDark
                        ? 'border-[#0169D9] bg-[#0169D9]/10'
                        : 'border-[#0169D9] bg-blue-50'
                      : isDark
                        ? 'border-white/[0.08] hover:bg-white/[0.03]'
                        : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedAttendants.includes(attendant.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedAttendants([...selectedAttendants, attendant.id]);
                        setAttendantConfigs({
                          ...attendantConfigs,
                          [attendant.id]: {
                            user_id: attendant.id,
                            trigger_conditions: '',
                            message_to_attendant: 'Você foi solicitado para atender um novo lead.',
                            message_to_customer: 'Um momento, vou transferir você para um de nossos especialistas.',
                          },
                        });
                      } else {
                        setSelectedAttendants(selectedAttendants.filter(id => id !== attendant.id));
                        const newConfigs = { ...attendantConfigs };
                        delete newConfigs[attendant.id];
                        setAttendantConfigs(newConfigs);
                      }
                      setHasChanges(true);
                    }}
                    className="w-4 h-4 rounded accent-[#0169D9]"
                  />

                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium ${
                    isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-700'
                  }`}>
                    {attendant.avatar || '?'}
                  </div>

                  <div className="flex-1">
                    <div className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      {attendant.name}
                    </div>
                    <div className={`text-xs ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
                      {attendant.email}
                    </div>
                  </div>
                </label>

                {/* Configurações do Atendente */}
                {selectedAttendants.includes(attendant.id) && (
                  <div className={`ml-16 p-4 rounded-xl space-y-3 ${isDark ? 'bg-white/[0.02]' : 'bg-gray-50'}`}>
                    <div>
                      <label className={`block text-xs font-medium mb-1 ${isDark ? 'text-white/70' : 'text-gray-700'}`}>
                        Quando acionar este atendente?
                      </label>
                      <textarea
                        value={attendantConfigs[attendant.id]?.trigger_conditions || ''}
                        onChange={(e) => {
                          setAttendantConfigs({
                            ...attendantConfigs,
                            [attendant.id]: {
                              ...attendantConfigs[attendant.id],
                              trigger_conditions: e.target.value,
                            },
                          });
                          setHasChanges(true);
                        }}
                        rows={2}
                        placeholder="Ex: Quando o cliente perguntar sobre preços ou contratos"
                        className={`w-full px-3 py-2 rounded-lg border text-xs resize-y outline-none transition-colors ${
                          isDark
                            ? 'bg-white/[0.05] border-white/[0.1] text-white placeholder-white/40 focus:border-[#0169D9]'
                            : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400 focus:border-[#0169D9]'
                        }`}
                      />
                    </div>

                    <div>
                      <label className={`block text-xs font-medium mb-1 ${isDark ? 'text-white/70' : 'text-gray-700'}`}>
                        Mensagem para o Atendente
                      </label>
                      <input
                        type="text"
                        value={attendantConfigs[attendant.id]?.message_to_attendant || ''}
                        onChange={(e) => {
                          setAttendantConfigs({
                            ...attendantConfigs,
                            [attendant.id]: {
                              ...attendantConfigs[attendant.id],
                              message_to_attendant: e.target.value,
                            },
                          });
                          setHasChanges(true);
                        }}
                        placeholder="Mensagem de notificação interna"
                        className={`w-full px-3 py-2 rounded-lg border text-xs outline-none transition-colors ${
                          isDark
                            ? 'bg-white/[0.05] border-white/[0.1] text-white placeholder-white/40 focus:border-[#0169D9]'
                            : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400 focus:border-[#0169D9]'
                        }`}
                      />
                    </div>

                    <div>
                      <label className={`block text-xs font-medium mb-1 ${isDark ? 'text-white/70' : 'text-gray-700'}`}>
                        Mensagem para o Cliente
                      </label>
                      <input
                        type="text"
                        value={attendantConfigs[attendant.id]?.message_to_customer || ''}
                        onChange={(e) => {
                          setAttendantConfigs({
                            ...attendantConfigs,
                            [attendant.id]: {
                              ...attendantConfigs[attendant.id],
                              message_to_customer: e.target.value,
                            },
                          });
                          setHasChanges(true);
                        }}
                        placeholder="O que o cliente verá ao transferir"
                        className={`w-full px-3 py-2 rounded-lg border text-xs outline-none transition-colors ${
                          isDark
                            ? 'bg-white/[0.05] border-white/[0.1] text-white placeholder-white/40 focus:border-[#0169D9]'
                            : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400 focus:border-[#0169D9]'
                        }`}
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Divisória */}
      <div className={`border-t ${isDark ? 'border-white/[0.08]' : 'border-gray-200'}`} />

      {/* Horários de Atendimento */}
      <div className={`p-6 rounded-xl border ${isDark ? 'bg-white/[0.02] border-white/[0.08]' : 'bg-white border-gray-200'}`}>
        <div className="flex items-center gap-3 mb-6">
          <Clock className={`w-5 h-5 ${isDark ? 'text-white/60' : 'text-gray-600'}`} />
          <h3 className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Horários de Atendimento
          </h3>
        </div>

        <div className="space-y-2">
          {[
            { value: '24h', label: '24 horas por dia', description: 'Sempre ativo' },
            { value: 'business', label: 'Horário Comercial', description: 'Segunda a Sexta, 9h às 18h' },
            { value: 'night_only', label: 'Apenas Noturno', description: 'Diariamente, 18h às 9h' },
            { value: 'weekends', label: 'Apenas Finais de Semana', description: 'Sábado e Domingo, qualquer horário' },
            { value: 'night_weekends', label: 'Noturno + Finais de Semana', description: 'Combinação das duas anteriores' },
          ].map((option) => (
            <label
              key={option.value}
              className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
                workingHoursMode === option.value
                  ? isDark
                    ? 'border-[#0169D9] bg-[#0169D9]/10'
                    : 'border-[#0169D9] bg-blue-50'
                  : isDark
                    ? 'border-white/[0.08] hover:bg-white/[0.03]'
                    : 'border-gray-200 hover:bg-gray-50'
              }`}
            >
              <input
                type="radio"
                name="working_hours"
                value={option.value}
                checked={workingHoursMode === option.value}
                onChange={(e) => {
                  setWorkingHoursMode(e.target.value as any);
                  setHasChanges(true);
                }}
                className="mt-0.5 w-4 h-4 accent-[#0169D9]"
              />
              <div className="flex-1">
                <div className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {option.label}
                </div>
                <div className={`text-xs mt-0.5 ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
                  {option.description}
                </div>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Divisória */}
      <div className={`border-t ${isDark ? 'border-white/[0.08]' : 'border-gray-200'}`} />

      {/* Processamento de Mensagens */}
      <div className={`p-6 rounded-xl border ${isDark ? 'bg-white/[0.02] border-white/[0.08]' : 'bg-white border-gray-200'}`}>
        <div className="flex items-center gap-3 mb-6">
          <Zap className={`w-5 h-5 ${isDark ? 'text-white/60' : 'text-gray-600'}`} />
          <h3 className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Processamento de Mensagens
          </h3>
        </div>

        <div className="space-y-4">
          <div>
            <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Tempo de Espera (Debouncer)
            </label>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min="5"
                max="30"
                value={debounceSeconds}
                onChange={(e) => {
                  setDebounceSeconds(Number(e.target.value));
                  setHasChanges(true);
                }}
                className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#0169D9]"
              />
              <div className={`text-sm font-medium w-16 text-center ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {debounceSeconds}s
              </div>
            </div>
            <p className={`text-xs mt-1 ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
              Recomendado: 10-20 segundos
            </p>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Mic className={`w-5 h-5 ${isDark ? 'text-white/60' : 'text-gray-600'}`} />
              <div>
                <label className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  Transcrever Áudios
                </label>
                <p className={`text-xs ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
                  Converte mensagens de voz em texto
                </p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={transcribeAudio}
                onChange={(e) => {
                  setTranscribeAudio(e.target.checked);
                  setHasChanges(true);
                }}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-[#0169D9]"></div>
            </label>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ImageIcon className={`w-5 h-5 ${isDark ? 'text-white/60' : 'text-gray-600'}`} />
              <div>
                <label className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  Descrever Imagens
                </label>
                <p className={`text-xs ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
                  Analisa e descreve imagens enviadas
                </p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={transcribeImage}
                onChange={(e) => {
                  setTranscribeImage(e.target.checked);
                  setHasChanges(true);
                }}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-[#0169D9]"></div>
            </label>
          </div>
        </div>
      </div>

      {/* Divisória */}
      <div className={`border-t ${isDark ? 'border-white/[0.08]' : 'border-gray-200'}`} />

      {/* Base de Conhecimento (RAG) - Novo Componente */}
      <RagKnowledgeBase agentId={agentId} isDark={isDark} />

      {/* Divisória */}
      <div className={`border-t ${isDark ? 'border-white/[0.08]' : 'border-gray-200'}`} />

      {/* Formatação de Mensagens */}
      <div className={`p-6 rounded-xl border ${isDark ? 'bg-white/[0.02] border-white/[0.08]' : 'bg-white border-gray-200'}`}>
        <div className="flex items-center gap-3 mb-6">
          <MessageSquare className={`w-5 h-5 ${isDark ? 'text-white/60' : 'text-gray-600'}`} />
          <h3 className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Formatação de Mensagens
          </h3>
        </div>

        <div className="space-y-2">
          <label
            className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
              !splitMessages
                ? isDark
                  ? 'border-[#0169D9] bg-[#0169D9]/10'
                  : 'border-[#0169D9] bg-blue-50'
                : isDark
                  ? 'border-white/[0.08] hover:bg-white/[0.03]'
                  : 'border-gray-200 hover:bg-gray-50'
            }`}
          >
            <input
              type="radio"
              name="message_format"
              checked={!splitMessages}
              onChange={() => {
                setSplitMessages(false);
                setHasChanges(true);
              }}
              className="mt-0.5 w-4 h-4 accent-[#0169D9]"
            />
            <div className="flex-1">
              <div className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Mensagem Direta
              </div>
              <div className={`text-xs mt-0.5 ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
                Resposta completa em uma única mensagem (mais formal)
              </div>
            </div>
          </label>

          <label
            className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
              splitMessages
                ? isDark
                  ? 'border-[#0169D9] bg-[#0169D9]/10'
                  : 'border-[#0169D9] bg-blue-50'
                : isDark
                  ? 'border-white/[0.08] hover:bg-white/[0.03]'
                  : 'border-gray-200 hover:bg-gray-50'
            }`}
          >
            <input
              type="radio"
              name="message_format"
              checked={splitMessages}
              onChange={() => {
                setSplitMessages(true);
                setHasChanges(true);
              }}
              className="mt-0.5 w-4 h-4 accent-[#0169D9]"
            />
            <div className="flex-1">
              <div className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Mensagens Fracionadas
              </div>
              <div className={`text-xs mt-0.5 ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
                Divide em múltiplas mensagens (mais natural e humano)
              </div>
            </div>
          </label>
        </div>
      </div>

      {/* Divisória */}
      <div className={`border-t ${isDark ? 'border-white/[0.08]' : 'border-gray-200'}`} />

      {/* Atualização Automática do CRM */}
      <div className={`p-6 rounded-xl border ${isDark ? 'bg-white/[0.02] border-white/[0.08]' : 'bg-white border-gray-200'}`}>
        <div className="flex items-center gap-3 mb-6">
          <Database className={`w-5 h-5 ${isDark ? 'text-white/60' : 'text-gray-600'}`} />
          <h3 className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Atualização Automática do CRM
          </h3>
        </div>

        <div className="flex items-center justify-between mb-4">
          <div>
            <label className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Ativar Atualização Automática
            </label>
            <p className={`text-xs ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
              A IA extrai informações e atualiza o lead automaticamente
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={crmAutoUpdate}
              onChange={(e) => {
                setCrmAutoUpdate(e.target.checked);
                setHasChanges(true);
              }}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-[#0169D9]"></div>
          </label>
        </div>

        {crmAutoUpdate && (
          <div>
            <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Prompt de Atualização
            </label>
            <textarea
              value={crmUpdatePrompt}
              onChange={(e) => {
                setCrmUpdatePrompt(e.target.value);
                setHasChanges(true);
              }}
              rows={4}
              placeholder="Instruções para extrair dados..."
              className={`w-full px-3 py-2 rounded-lg border resize-y outline-none transition-colors ${
                isDark
                  ? 'bg-white/[0.05] border-white/[0.1] text-white placeholder-white/40 focus:border-[#0169D9]'
                  : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400 focus:border-[#0169D9]'
              }`}
            />
          </div>
        )}
      </div>
    </div>
  );
}
