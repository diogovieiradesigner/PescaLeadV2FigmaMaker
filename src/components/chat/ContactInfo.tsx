import { MessageSquare, X, User, Bot, ChevronDown, ChevronUp, DollarSign, Calendar, Tag, User as UserIcon, Mail, Phone, CheckCircle, Globe } from 'lucide-react';
import { Theme } from '../../hooks/useTheme';
import { Conversation } from '../../types/chat';
import { useState, useRef, useEffect } from 'react';
import { TagSelector } from './TagSelector';
import { DbUser } from '../../types/database-chat';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import { getLeadById } from '../../services/leads-service';
import { CRMLead } from '../../utils/supabase/converters';
import { AddLeadToKanbanModal } from './AddLeadToKanbanModal';
import { updateConversation } from '../../services/chat-service';

// ✅ Tipos para campos JSONB
interface EmailEntry {
  type: string;
  source: string;
  address: string;
  verified: boolean;
}

interface PhoneEntry {
  type: string;
  number: string;
  source: string;
  verified: boolean;
  whatsapp: boolean;
  formatted: string;
  with_country: string;
}

interface WebsiteEntry {
  url: string;
  type: string;
  domain: string;
  source: string;
}

interface DomainEmailEntry {
  source: string;
  address: string;
  verified: boolean;
}

interface ContactInfoProps {
  conversation: Conversation | null;
  theme: Theme;
  agents?: DbUser[]; // ✅ Lista de agentes do banco
  onStatusChange?: (conversationId: string, status: string) => void;
  onAssigneeChange?: (conversationId: string, assigneeId: string) => void;
  onTagsChange?: (conversationId: string, tags: string[]) => void;
  onAttendantTypeChange?: (conversationId: string, attendantType: 'human' | 'ai') => void; // ✅ Novo callback
  onNavigateToPipeline?: (leadId: string) => void;
  onNavigateToSettings?: () => void;
  onKanbanRefresh?: () => void; // ✅ Callback para refresh do kanban
}

// Função helper para obter informações do canal
const getChannelInfo = (channel: string) => {
  const channelMap: Record<string, { icon: any; name: string; color: string }> = {
    whatsapp: { icon: MessageSquare, name: 'WhatsApp', color: 'text-green-500' },
    instagram: { icon: MessageSquare, name: 'Instagram', color: 'text-pink-500' },
    facebook: { icon: MessageSquare, name: 'Facebook', color: 'text-blue-500' },
    telegram: { icon: MessageSquare, name: 'Telegram', color: 'text-blue-400' },
    email: { icon: MessageSquare, name: 'Email', color: 'text-gray-500' },
    webchat: { icon: MessageSquare, name: 'Web Chat', color: 'text-purple-500' },
  };
  
  return channelMap[channel?.toLowerCase()] || { icon: MessageSquare, name: channel || 'Desconhecido', color: 'text-gray-500' };
};

// ✅ Função para renderizar valores de campos especiais (compacta para sidebar)
function renderFieldValueCompact(fieldName: string, fieldValue: string, isDark: boolean) {
  const fieldNameLower = fieldName.toLowerCase();
  
  // ✅ Detectar campos JSON de emails
  if (fieldNameLower.includes('email') && fieldNameLower.includes('json')) {
    try {
      const emails: EmailEntry[] = JSON.parse(fieldValue);
      const mainEmail = emails.find(e => e.type === 'main') || emails[0];
      if (!mainEmail) return '-';
      
      return (
        <div className="space-y-1">
          <div className={`text-sm flex items-center gap-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            <Mail className="w-3 h-3 opacity-50" />
            <span className="truncate">{mainEmail.address}</span>
          </div>
          {emails.length > 1 && (
            <span className="text-xs text-blue-500">
              +{emails.length - 1} {emails.length === 2 ? 'outro' : 'outros'}
            </span>
          )}
        </div>
      );
    } catch (e) {
      return fieldValue;
    }
  }
  
  // ✅ Detectar campos JSON de telefones
  if (fieldNameLower.includes('telefone') && fieldNameLower.includes('json')) {
    try {
      const phones: PhoneEntry[] = JSON.parse(fieldValue);
      const mainPhone = phones.find(p => p.type === 'mobile') || phones[0];
      if (!mainPhone) return '-';
      
      return (
        <div className="space-y-1">
          <div className={`text-sm flex items-center gap-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            <Phone className="w-3 h-3 opacity-50" />
            <span>{mainPhone.formatted}</span>
            {mainPhone.whatsapp && (
              <span className="text-xs text-green-500">WhatsApp</span>
            )}
          </div>
          {phones.length > 1 && (
            <span className="text-xs text-blue-500">
              +{phones.length - 1} {phones.length === 2 ? 'outro' : 'outros'}
            </span>
          )}
        </div>
      );
    } catch (e) {
      return fieldValue;
    }
  }
  
  // ✅ Detectar campos JSON de websites
  if ((fieldNameLower.includes('website') || fieldNameLower.includes('site')) && fieldNameLower.includes('json')) {
    try {
      const websites: WebsiteEntry[] = JSON.parse(fieldValue);
      const mainSite = websites.find(w => w.type === 'main') || websites[0];
      if (!mainSite) return '-';
      
      return (
        <div className="space-y-1">
          <a 
            href={mainSite.url} 
            target="_blank" 
            rel="noopener noreferrer"
            className={`text-sm flex items-center gap-1 hover:underline ${isDark ? 'text-blue-400' : 'text-blue-600'}`}
          >
            <Globe className="w-3 h-3 opacity-50" />
            <span className="truncate">{mainSite.domain}</span>
          </a>
          {websites.length > 1 && (
            <span className="text-xs text-blue-500">
              +{websites.length - 1} {websites.length === 2 ? 'outro' : 'outros'}
            </span>
          )}
        </div>
      );
    } catch (e) {
      return fieldValue;
    }
  }
  
  // ✅ Detectar Email do Domínio (objeto único, não array)
  if (fieldNameLower.includes('email') && fieldNameLower.includes('domínio')) {
    try {
      const domainEmail: DomainEmailEntry = JSON.parse(fieldValue);
      return (
        <div className={`text-sm flex items-center gap-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
          <Mail className="w-3 h-3 opacity-50" />
          <span className="truncate">{domainEmail.address}</span>
          {domainEmail.verified && (
            <CheckCircle className="w-3 h-3 text-green-500" />
          )}
        </div>
      );
    } catch (e) {
      return fieldValue;
    }
  }
  
  // ✅ Valores normais
  return fieldValue || '-';
}

export function ContactInfo({ 
  conversation, 
  theme, 
  agents = [],
  onStatusChange, 
  onAssigneeChange, 
  onTagsChange, 
  onAttendantTypeChange, // ✅ Novo callback
  onNavigateToPipeline,
  onNavigateToSettings,
  onKanbanRefresh
}: ContactInfoProps) {
  const isDark = theme === 'dark';
  const [isHumanAttendant, setIsHumanAttendant] = useState(true);
  const [showPipelineData, setShowPipelineData] = useState(false);
  const [width, setWidth] = useState(320); // Largura inicial (w-80 = 320px)
  const [isResizing, setIsResizing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // ✅ Estado para armazenar dados reais do lead
  const [leadData, setLeadData] = useState<CRMLead | null>(null);
  const [loadingLead, setLoadingLead] = useState(false);
  
  // ✅ Estado para controlar o modal de adicionar lead
  const [showAddLeadModal, setShowAddLeadModal] = useState(false);

  const MIN_WIDTH = 280; // Largura mínima
  const MAX_WIDTH = 500; // Largura máxima

  // ✅ Sincronizar estado local com a conversa quando ela mudar de ID ou attendantType
  useEffect(() => {
    if (conversation) {
      setIsHumanAttendant(conversation.attendantType !== 'ai'); // Default: human se não definido
    }
  }, [conversation?.id, conversation?.attendantType]); // ✅ Dependências específicas

  // ✅ Buscar dados do lead quando leadId mudar
  useEffect(() => {
    const fetchLead = async () => {
      if (!conversation?.leadId) {
        setLeadData(null);
        return;
      }

      setLoadingLead(true);
      try {
        const { lead, error } = await getLeadById(conversation.leadId);
        if (lead && !error) {
          console.log('[ContactInfo] Lead carregado com sucesso:', {
            leadId: lead.id,
            clientName: lead.clientName,
            customFieldsCount: lead.customFields?.length || 0,
            customFields: lead.customFields
          });
          setLeadData(lead);
        } else {
          console.error('[ContactInfo] Erro ao buscar lead:', error);
          setLeadData(null);
        }
      } catch (err) {
        console.error('[ContactInfo] Erro ao buscar lead:', err);
        setLeadData(null);
      } finally {
        setLoadingLead(false);
      }
    };

    fetchLead();
  }, [conversation?.leadId]);

  // ✅ Handler para vincular o lead à conversa após criação
  const handleLeadCreated = async (leadId: string) => {
    try {
      console.log('[ContactInfo] Vinculando lead à conversa:', leadId);
      await updateConversation(conversation.id, { lead_id: leadId });
      
      // Atualizar o leadId localmente (forçar re-busca dos dados)
      if (conversation) {
        conversation.leadId = leadId;
        // Forçar busca dos dados do novo lead
        const { lead } = await getLeadById(leadId);
        if (lead) {
          setLeadData(lead);
        }
      }
      
      console.log('[ContactInfo] Lead vinculado com sucesso!');
      // ✅ Refresh do kanban após adicionar lead
      onKanbanRefresh && onKanbanRefresh();
    } catch (err) {
      console.error('[ContactInfo] Erro ao vincular lead:', err);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing || !containerRef.current) return;

      const containerRight = containerRef.current.getBoundingClientRect().right;
      const newWidth = containerRight - e.clientX;

      // Aplicar limites
      if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) {
        setWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  if (!conversation) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      style={{ width: `${width}px` }}
      className={`border-l flex flex-col transition-colors relative ${
        isDark ? 'bg-true-black border-white/[0.08]' : 'bg-light-bg border-border-light'
      }`}
    >
      {/* Resize Handle */}
      <div
        onMouseDown={handleMouseDown}
        className={`absolute top-0 left-0 w-1 h-full cursor-col-resize group hover:w-1.5 transition-all ${
          isResizing ? 'bg-[#0169D9]' : isDark ? 'hover:bg-white/20' : 'hover:bg-gray-300'
        }`}
        style={{ zIndex: 10 }}
      >
        <div className={`absolute inset-y-0 -left-1 w-3 ${isResizing ? 'cursor-col-resize' : ''}`} />
      </div>

      {/* Header */}
      <div
        className={`px-6 py-4 border-b ${
          isDark ? 'border-white/[0.08]' : 'border-border-light'
        }`}
      >
        <h2 className={isDark ? 'text-white' : 'text-text-primary-light'}>
          Informações do Contato
        </h2>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
        {/* Avatar and Name */}
        <div className="text-center">
          <div
            className={`w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center overflow-hidden ${
              isDark ? 'bg-white/[0.05]' : 'bg-light-elevated'
            }`}
          >
            <ImageWithFallback
              src={conversation.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(conversation.contactName)}&background=random`}
              alt={conversation.contactName}
              className="w-full h-full rounded-full object-cover"
            />
          </div>
          <h3
            className={`mb-1 ${
              isDark ? 'text-white' : 'text-text-primary-light'
            }`}
          >
            {conversation.contactName}
          </h3>
          <p
            className={`text-sm ${
              isDark ? 'text-white/50' : 'text-text-secondary-light'
            }`}
          >
            {conversation.contactPhone}
          </p>
        </div>

        {/* Canal */}
        <div>
          <label
            className={`block text-xs mb-2 ${
              isDark ? 'text-white/50' : 'text-text-secondary-light'
            }`}
          >
            Canal
          </label>
          <div
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${
              isDark
                ? 'bg-elevated border-white/[0.08]'
                : 'bg-light-elevated border-border-light'
            }`}
          >
            {(() => {
              const channelInfo = getChannelInfo(conversation.channel);
              const ChannelIcon = channelInfo.icon;
              return (
                <>
                  <ChannelIcon className={`w-4 h-4 ${channelInfo.color}`} />
                  <span
                    className={`text-sm ${
                      isDark ? 'text-white' : 'text-text-primary-light'
                    }`}
                  >
                    {channelInfo.name}
                  </span>
                </>
              );
            })()}
          </div>
        </div>

        {/* Tipo de Atendimento */}
        <div>
          <label
            className={`block text-xs mb-2 ${
              isDark ? 'text-white/50' : 'text-text-secondary-light'
            }`}
          >
            Tipo de Atendimento
          </label>
          <div className="flex gap-2">
            <button
              onClick={() => {
                setIsHumanAttendant(true);
                onAttendantTypeChange && onAttendantTypeChange(conversation.id, 'human');
              }}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors border ${
                isHumanAttendant
                  ? 'bg-[#0169D9] border-[#0169D9] text-white'
                  : isDark
                  ? 'bg-elevated border-white/[0.08] text-white/50 hover:bg-white/[0.05]'
                  : 'bg-light-elevated border-border-light text-text-secondary-light hover:bg-light-elevated-hover'
              }`}
            >
              <User className="w-4 h-4" />
              Humano
            </button>
            <button
              onClick={() => {
                setIsHumanAttendant(false);
                onAttendantTypeChange && onAttendantTypeChange(conversation.id, 'ai');
              }}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors border ${
                !isHumanAttendant
                  ? 'bg-purple-600 border-purple-600 text-white'
                  : isDark
                  ? 'bg-elevated border-white/[0.08] text-white/50 hover:bg-white/[0.05]'
                  : 'bg-light-elevated border-border-light text-text-secondary-light hover:bg-light-elevated-hover'
              }`}
            >
              <Bot className="w-4 h-4" />
              I.A
            </button>
          </div>
        </div>

        {/* Status de Atendimento */}
        <div>
          <label
            className={`block text-xs mb-2 ${
              isDark ? 'text-white/50' : 'text-text-secondary-light'
            }`}
          >
            Status de Atendimento
          </label>
          <select
            className={`w-full border px-3 py-2 rounded-lg text-sm transition-all focus:outline-none focus:border-[#0169D9] ${
              isDark
                ? 'bg-elevated border-white/[0.08] text-white'
                : 'bg-light-elevated border-border-light text-text-primary-light'
            }`}
            value={conversation.status}
            onChange={(e) => onStatusChange && onStatusChange(conversation.id, e.target.value)}
          >
            <option value="waiting">Aguardando</option>
            <option value="in-progress">Em Atendimento</option>
            <option value="resolved">Resolvido</option>
          </select>
        </div>

        {/* Atendente Responsável */}
        <div>
          <label
            className={`block text-xs mb-2 ${
              isDark ? 'text-white/50' : 'text-text-secondary-light'
            }`}
          >
            Atendente Responsável
          </label>
          <select
            className={`w-full border px-3 py-2 rounded-lg text-sm transition-all focus:outline-none focus:border-[#0169D9] ${
              isDark
                ? 'bg-elevated border-white/[0.08] text-white'
                : 'bg-light-elevated border-border-light text-text-primary-light'
            }`}
            value={conversation.assignedTo || ""}
            onChange={(e) => onAssigneeChange && onAssigneeChange(conversation.id, e.target.value)}
          >
            <option value="">Não atribuído</option>
            {agents.map(agent => (
              <option key={agent.id} value={agent.id}>{agent.name}</option>
            ))}
          </select>
        </div>

        {/* Tags */}
        <div>
          <label
            className={`block text-xs mb-2 ${
              isDark ? 'text-white/50' : 'text-text-secondary-light'
            }`}
          >
            Tags (sincronizadas com Pipeline)
          </label>
          <TagSelector
            theme={theme}
            selectedTags={conversation.tags || []}
            onTagsChange={(tags) => onTagsChange && onTagsChange(conversation.id, tags)}
          />
        </div>

        {/* Dados da Pipeline */}
        <div>
          <button
            onClick={() => setShowPipelineData(!showPipelineData)}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors border ${
              isDark
                ? 'bg-elevated border-white/[0.08] hover:bg-white/[0.08] text-white'
                : 'bg-light-elevated border-border-light hover:bg-light-elevated-hover text-text-primary-light'
            }`}
          >
            <span>Dados da Pipeline</span>
            {showPipelineData ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showPipelineData && (
            <div className={`mt-3 p-3 rounded-lg border space-y-3 ${
              isDark ? 'bg-elevated border-white/[0.08]' : 'bg-light-elevated border-border-light'
            }`}>
              {/* Verificar se há lead vinculado */}
              {!conversation.leadId ? (
                <div className="text-center py-4 space-y-3">
                  <p className={`text-sm ${isDark ? 'text-white/50' : 'text-text-secondary-light'}`}>
                    Nenhum lead vinculado a esta conversa
                  </p>
                  <button
                    onClick={() => setShowAddLeadModal(true)}
                    className="w-full px-3 py-2 rounded-lg text-sm transition-colors bg-[#0169D9] text-white hover:bg-[#0169D9]/90"
                  >
                    Adicionar ao Kanban
                  </button>
                </div>
              ) : loadingLead ? (
                <div className="text-center py-4">
                  <p className={`text-sm ${isDark ? 'text-white/50' : 'text-text-secondary-light'}`}>
                    Carregando dados do lead...
                  </p>
                </div>
              ) : !leadData ? (
                <div className="text-center py-4">
                  <p className={`text-sm ${isDark ? 'text-white/50' : 'text-text-secondary-light'}`}>
                    Lead não encontrado
                  </p>
                </div>
              ) : (
                <>
                  {/* Valor do Negócio */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <DollarSign className={`w-4 h-4 ${isDark ? 'text-green-400' : 'text-green-600'}`} />
                      <span className={`text-xs ${isDark ? 'text-white/50' : 'text-text-secondary-light'}`}>
                        Valor
                      </span>
                    </div>
                    <span className={`text-sm ${isDark ? 'text-white' : 'text-text-primary-light'}`}>
                      R$ {leadData.dealValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>

                  {/* Etapa */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Tag className={`w-4 h-4 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
                      <span className={`text-xs ${isDark ? 'text-white/50' : 'text-text-secondary-light'}`}>
                        Etapa
                      </span>
                    </div>
                    <span className={`text-sm ${isDark ? 'text-white' : 'text-text-primary-light'}`}>
                      {{ new: 'Novo', contacted: 'Contatado', qualified: 'Qualificado', proposal: 'Proposta', negotiation: 'Negociação' }[leadData.status] || leadData.status}
                    </span>
                  </div>

                  {/* Prioridade */}
                  <div className="flex items-center justify-between">
                    <span className={`text-xs ${isDark ? 'text-white/50' : 'text-text-secondary-light'}`}>
                      Prioridade
                    </span>
                    <span className={`text-xs px-2 py-1 rounded ${
                      leadData.priority === 'high'
                        ? 'bg-red-500/10 text-red-500 border border-red-500/20'
                        : leadData.priority === 'medium'
                        ? 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20'
                        : 'bg-green-500/10 text-green-500 border border-green-500/20'
                    }`}>
                      {{ high: 'Alta', medium: 'Média', low: 'Baixa' }[leadData.priority]}
                    </span>
                  </div>

                  {/* Data de Fechamento */}
                  {leadData.dueDate && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Calendar className={`w-4 h-4 ${isDark ? 'text-orange-400' : 'text-orange-600'}`} />
                        <span className={`text-xs ${isDark ? 'text-white/50' : 'text-text-secondary-light'}`}>
                          Fechamento
                        </span>
                      </div>
                      <span className={`text-sm ${isDark ? 'text-white' : 'text-text-primary-light'}`}>
                        {new Date(leadData.dueDate).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                  )}

                  {/* Responsável */}
                  {leadData.assignee?.name && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <UserIcon className={`w-4 h-4 ${isDark ? 'text-purple-400' : 'text-purple-600'}`} />
                        <span className={`text-xs ${isDark ? 'text-white/50' : 'text-text-secondary-light'}`}>
                          Responsável
                        </span>
                      </div>
                      <span className={`text-sm ${isDark ? 'text-white' : 'text-text-primary-light'}`}>
                        {leadData.assignee.name}
                      </span>
                    </div>
                  )}

                  {/* Campos Personalizados - usando leadData.customFields */}
                  {leadData.customFields && leadData.customFields.length > 0 && (
                    <>
                      <div className={`border-t pt-3 ${isDark ? 'border-white/[0.08]' : 'border-border-light'}`}>
                        <span className={`text-xs block mb-2 font-medium ${isDark ? 'text-white/70' : 'text-text-primary-light'}`}>
                          Campos Personalizados
                        </span>
                      </div>
                      {leadData.customFields.map((field) => (
                        <div key={field.id}>
                          <span className={`text-xs block mb-1 ${isDark ? 'text-white/50' : 'text-text-secondary-light'}`}>
                            {field.fieldName}
                          </span>
                          <span className={`text-sm ${isDark ? 'text-white' : 'text-text-primary-light'}`}>
                            {renderFieldValueCompact(field.fieldName, field.fieldValue || '-', isDark)}
                          </span>
                        </div>
                      ))}
                    </>
                  )}

                  {/* Tags */}
                  {leadData.tags && leadData.tags.length > 0 && (
                    <div>
                      <span className={`text-xs block mb-2 ${isDark ? 'text-white/50' : 'text-text-secondary-light'}`}>
                        Tags
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {leadData.tags.map((tag, index) => (
                          <span
                            key={index}
                            className="text-xs px-2 py-1 rounded bg-[#0169D9]/10 text-[#0169D9] border border-[#0169D9]/20"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Empresa */}
                  {leadData.company && (
                    <div>
                      <span className={`text-xs block mb-1 ${isDark ? 'text-white/50' : 'text-text-secondary-light'}`}>
                        Empresa
                      </span>
                      <span className={`text-sm ${isDark ? 'text-white' : 'text-text-primary-light'}`}>
                        {leadData.company}
                      </span>
                    </div>
                  )}

                  {/* Email */}
                  {leadData.email && (
                    <div>
                      <span className={`text-xs block mb-1 ${isDark ? 'text-white/50' : 'text-text-secondary-light'}`}>
                        Email
                      </span>
                      <span className={`text-sm ${isDark ? 'text-white' : 'text-text-primary-light'}`}>
                        {leadData.email}
                      </span>
                    </div>
                  )}

                  {/* Telefone */}
                  {leadData.phone && (
                    <div>
                      <span className={`text-xs block mb-1 ${isDark ? 'text-white/50' : 'text-text-secondary-light'}`}>
                        Telefone
                      </span>
                      <span className={`text-sm ${isDark ? 'text-white' : 'text-text-primary-light'}`}>
                        {leadData.phone}
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* Estatísticas */}
        <div>
          <h4
            className={`text-sm mb-3 ${
              isDark ? 'text-white/70' : 'text-text-secondary-light'
            }`}
          >
            Estatísticas
          </h4>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span
                className={`text-sm ${
                  isDark ? 'text-white/50' : 'text-text-secondary-light'
                }`}
              >
                Total de mensagens
              </span>
              <span
                className={`text-sm ${
                  isDark ? 'text-white' : 'text-text-primary-light'
                }`}
              >
                {conversation.totalMessages}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span
                className={`text-sm ${
                  isDark ? 'text-white/50' : 'text-text-secondary-light'
                }`}
              >
                Última atualização
              </span>
              <span
                className={`text-sm ${
                  isDark ? 'text-white' : 'text-text-primary-light'
                }`}
              >
                {conversation.lastUpdate}
              </span>
            </div>
          </div>
        </div>

        {/* Ações Rápidas */}
        <div>
          <h4
            className={`text-sm mb-3 ${
              isDark ? 'text-white/70' : 'text-text-secondary-light'
            }`}
          >
            Ações Rápidas
          </h4>
          <div className="space-y-2">
            <button
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors border border-red-500/20 ${
                isDark
                  ? 'bg-red-500/10 hover:bg-red-500/20 text-red-400'
                  : 'bg-red-500/5 hover:bg-red-500/10 text-red-600'
              }`}
            >
              <X className="w-4 h-4" />
              Encerrar Atendimento
            </button>
          </div>
        </div>
      </div>

      {/* Modal de Adicionar Lead ao Kanban */}
      <AddLeadToKanbanModal
        isOpen={showAddLeadModal}
        onClose={() => setShowAddLeadModal(false)}
        theme={theme}
        workspaceId={conversation.workspaceId || ''}
        contactName={conversation.contactName}
        contactPhone={conversation.contactPhone}
        conversationId={conversation.id} // ✅ Passar conversationId para buscar perfil
        onLeadCreated={handleLeadCreated}
        onKanbanRefresh={onKanbanRefresh} // ✅ Passar callback para refresh do kanban
      />
    </div>
  );
}