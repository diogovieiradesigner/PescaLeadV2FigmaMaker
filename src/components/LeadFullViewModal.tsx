import { useState, useEffect, useCallback } from 'react';
import { X, MessageSquare, FileText, Activity, Save, User, Building2, Calendar, Tag, DollarSign, Phone, Mail, MoreVertical, CheckCircle, XCircle, Globe, Send } from 'lucide-react';
import { CRMLead, CustomField } from '../types/crm';
import { Theme } from '../hooks/useTheme';
import { Avatar } from './Avatar';
import { ChatArea } from './chat/ChatArea';
import { useSingleConversation } from '../hooks/useSingleConversation';
import { useAuth } from '../contexts/AuthContext';
import { loadCustomFieldsForLead } from '../services/custom-fields-service';
import { getLeadActivities, updateLead } from '../services/leads-service';
import { toast } from 'sonner';
import { createConversation } from '../services/chat-service';
import { supabase } from '../utils/supabase/client';

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

interface LeadFullViewModalProps {
  lead: CRMLead | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedLead: CRMLead) => void;
  theme: Theme;
  onNavigateNext?: () => void; // ✅ Navegação para próximo lead
  onNavigatePrev?: () => void; // ✅ Navegação para lead anterior
  navigationState?: {
    hasPrev: boolean;
    hasNext: boolean;
    currentIndex: number;
    total: number;
  };
}

type ActiveTab = 'chat' | 'data' | 'activities';

function formatActivityTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);

  if (diffSeconds < 60) {
    return "Há alguns segundos";
  }
  
  if (diffMinutes < 60) {
    return `Há ${diffMinutes} minutos`;
  }
  
  if (diffHours < 24) {
    return `Há ${diffHours} horas`;
  }
  
  // Formato completo: dd/MM/yyyy às HH:mm
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  
  return `${day}/${month}/${year} às ${hours}:${minutes}`;
}

// ✅ Função para renderizar valores de campos especiais
function renderFieldValue(field: CustomField, isDark: boolean) {
  const fieldNameLower = field.fieldName.toLowerCase();
  
  // Debug: log para ver o que está sendo processado
  console.log('[renderFieldValue] Campo:', field.fieldName, 'Valor:', field.fieldValue.substring(0, 100));
  
  // ✅ Tentar fazer parse do JSON
  let parsedValue = null;
  try {
    parsedValue = JSON.parse(field.fieldValue);
  } catch {
    // Não é JSON, retornar valor normal
    return field.fieldValue || '-';
  }

  // Se não é objeto, retornar valor normal
  if (typeof parsedValue !== 'object' || parsedValue === null) {
    return field.fieldValue || '-';
  }

  // ✅ Detectar Email do Domínio (objeto único com address, source, verified)
  if (!Array.isArray(parsedValue) && parsedValue.address && parsedValue.source !== undefined) {
    const domainEmail = parsedValue as DomainEmailEntry;
    return (
      <div className={`flex items-start gap-2 p-2 rounded border ${
        isDark ? 'border-white/[0.05] bg-white/[0.02]' : 'border-gray-100 bg-gray-50'
      }`}>
        <Mail className="w-4 h-4 opacity-50 mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className={`text-sm break-all ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {domainEmail.address}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs px-1.5 py-0.5 rounded bg-orange-500/10 text-orange-500">
              Domínio
            </span>
            <span className={`text-xs ${isDark ? 'text-white/40' : 'text-gray-400'}`}>
              {domainEmail.source}
            </span>
            {domainEmail.verified && (
              <CheckCircle className="w-3 h-3 text-green-500" />
            )}
          </div>
        </div>
      </div>
    );
  }

  // ✅ Detectar array de emails
  if (Array.isArray(parsedValue) && parsedValue.length > 0 && parsedValue[0].address && parsedValue[0].type) {
    const emails = parsedValue as EmailEntry[];
    return (
      <div className="space-y-2">
        {emails.map((email, idx) => (
          <div key={idx} className={`flex items-start gap-2 p-2 rounded border ${
            isDark ? 'border-white/[0.05] bg-white/[0.02]' : 'border-gray-100 bg-gray-50'
          }`}>
            <Mail className="w-4 h-4 opacity-50 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className={`text-sm break-all ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {email.address}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className={`text-xs px-1.5 py-0.5 rounded ${
                  email.type === 'main' 
                    ? 'bg-blue-500/10 text-blue-500' 
                    : 'bg-gray-500/10 text-gray-500'
                }`}>
                  {email.type === 'main' ? 'Principal' : 'Contato'}
                </span>
                <span className={`text-xs ${isDark ? 'text-white/40' : 'text-gray-400'}`}>
                  {email.source}
                </span>
                {email.verified && (
                  <CheckCircle className="w-3 h-3 text-green-500" />
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }
  
  // ✅ Detectar array de telefones
  if (Array.isArray(parsedValue) && parsedValue.length > 0 && parsedValue[0].with_country && parsedValue[0].type) {
    const phones = parsedValue as PhoneEntry[];
    return (
      <div className="space-y-2">
        {phones.map((phone, idx) => (
          <div key={idx} className={`flex items-start gap-2 p-2 rounded border ${
            isDark ? 'border-white/[0.05] bg-white/[0.02]' : 'border-gray-100 bg-gray-50'
          }`}>
            <Phone className="w-4 h-4 opacity-50 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className={`text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {phone.with_country}
              </div>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className={`text-xs px-1.5 py-0.5 rounded ${
                  phone.type === 'mobile' 
                    ? 'bg-purple-500/10 text-purple-500' 
                    : 'bg-gray-500/10 text-gray-500'
                }`}>
                  {phone.type === 'mobile' ? 'Celular' : 'Fixo'}
                </span>
                <span className={`text-xs ${isDark ? 'text-white/40' : 'text-gray-400'}`}>
                  {phone.source}
                </span>
                {phone.whatsapp && (
                  <span className="text-xs px-1.5 py-0.5 rounded bg-green-500/10 text-green-500">
                    WhatsApp
                  </span>
                )}
                {phone.verified && (
                  <CheckCircle className="w-3 h-3 text-green-500" />
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }
  
  // ✅ Detectar array de websites
  if (Array.isArray(parsedValue) && parsedValue.length > 0 && parsedValue[0].url && parsedValue[0].domain) {
    const websites = parsedValue as WebsiteEntry[];
    return (
      <div className="space-y-2">
        {websites.map((website, idx) => (
          <div key={idx} className={`flex items-start gap-2 p-2 rounded border ${
            isDark ? 'border-white/[0.05] bg-white/[0.02]' : 'border-gray-100 bg-gray-50'
          }`}>
            <Globe className="w-4 h-4 opacity-50 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <a 
                href={website.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className={`text-sm break-all hover:underline ${isDark ? 'text-blue-400' : 'text-blue-600'}`}
              >
                {website.url}
              </a>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className={`text-xs px-1.5 py-0.5 rounded ${
                  website.type === 'main' 
                    ? 'bg-blue-500/10 text-blue-500' 
                    : website.type === 'social'
                    ? 'bg-pink-500/10 text-pink-500'
                    : 'bg-gray-500/10 text-gray-500'
                }`}>
                  {website.type === 'main' ? 'Principal' : website.type === 'social' ? 'Rede Social' : website.type}
                </span>
                <span className={`text-xs ${isDark ? 'text-white/40' : 'text-gray-400'}`}>
                  {website.domain}
                </span>
                <span className={`text-xs ${isDark ? 'text-white/40' : 'text-gray-400'}`}>
                  • {website.source}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }
  
  // ✅ JSON desconhecido - mostrar como texto
  return <pre className="text-xs whitespace-pre-wrap break-all">{JSON.stringify(parsedValue, null, 2)}</pre>;
}

export function LeadFullViewModal({ lead, isOpen, onClose, onSave, theme, onNavigateNext, onNavigatePrev, navigationState }: LeadFullViewModalProps) {
  console.log('[LeadFullViewModal] RENDERIZADO:', {
    isOpen,
    hasLead: !!lead,
    leadId: lead?.id,
    hasNavigateNext: !!onNavigateNext,
    hasNavigatePrev: !!onNavigatePrev,
    navigationState
  });
  
  const { currentWorkspace } = useAuth();
  const [activeTab, setActiveTab] = useState<ActiveTab>('chat');
  const [formData, setFormData] = useState<CRMLead | null>(lead);
  const [activities, setActivities] = useState<any[]>([]);
  const [loadingActivities, setLoadingActivities] = useState(false);
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [isSaving, setIsSaving] = useState(false); // Bloqueio de múltiplos cliques
  const [isCreatingConversation, setIsCreatingConversation] = useState(false);
  const [availableInboxes, setAvailableInboxes] = useState<any[]>([]);
  const [selectedInboxId, setSelectedInboxId] = useState<string>('');
  const [loadingInboxes, setLoadingInboxes] = useState(false);
  const [selectedPhone, setSelectedPhone] = useState<string>(''); // ✅ Telefone selecionado
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null); // ✅ Controle de qual campo está em edição
  
  // Hook do chat para a aba de Chat
  const { 
    conversation, 
    sendMessage, 
    markAsResolved, 
    clearHistory, 
    deleteConversation, 
    deleteMessage,
    refresh,
    setConversation
  } = useSingleConversation(lead?.id || null, currentWorkspace?.id || '');

  const isDark = theme === 'dark';

  // ✅ Navegação com teclado (setas esquerda/direita)
  useEffect(() => {
    if (!isOpen) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' && onNavigatePrev) {
        e.preventDefault();
        onNavigatePrev();
      } else if (e.key === 'ArrowRight' && onNavigateNext) {
        e.preventDefault();
        onNavigateNext();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onNavigateNext, onNavigatePrev]);

  // ✅ Obter TODOS os telefones disponíveis (principal + campos personalizados)
  const getAllPhones = (): Array<{ label: string; value: string; source: string }> => {
    const phones: Array<{ label: string; value: string; source: string }> = [];

    // 1. Telefone principal
    if (formData?.phone) {
      phones.push({
        label: `Telefone Principal: ${formData.phone}`,
        value: formData.phone,
        source: 'principal'
      });
    }

    // 2. Telefones de campos personalizados simples (tipo 'phone')
    customFields
      .filter(field => field.fieldType === 'phone' && field.fieldValue && field.fieldValue.trim() !== '')
      .forEach(field => {
        phones.push({
          label: `${field.fieldName}: ${field.fieldValue}`,
          value: field.fieldValue,
          source: field.fieldName
        });
      });

    // 3. Telefones de campos JSON
    customFields
      .filter(field => field.fieldName.toLowerCase().includes('telefone') && field.fieldName.toLowerCase().includes('json'))
      .forEach(field => {
        try {
          const phoneEntries: PhoneEntry[] = JSON.parse(field.fieldValue);
          phoneEntries.forEach((phone, idx) => {
            phones.push({
              label: `${phone.with_country} (${phone.type === 'mobile' ? 'Celular' : 'Fixo'}${phone.whatsapp ? ' - WhatsApp' : ''})`,
              value: phone.with_country,
              source: `${field.fieldName} #${idx + 1}`
            });
          });
        } catch (e) {
          // Ignorar se não for JSON válido
        }
      });

    return phones;
  };

  const availablePhones = getAllPhones();
  const hasPhone = availablePhones.length > 0;

  // Inicializar dados quando abrir
  useEffect(() => {
    if (isOpen && lead) {
      setFormData(lead);
      
      // Carregar Custom Fields se necessário
      if (!lead.customFields || lead.customFields.length === 0) {
        if (currentWorkspace?.id) {
           loadCustomFieldsForLead(lead.id, currentWorkspace.id).then(({ customFields }) => {
             setCustomFields(customFields);
             setFormData(prev => {
               if (!prev) return null;
               const newData = { ...prev, customFields };
               
               return newData;
             });
           });
        }
      } else {
        setCustomFields(lead.customFields);
      }
      
      // Carregar atividades
      fetchActivities();
      
      // ✅ Carregar inboxes disponíveis
      if (currentWorkspace?.id) {
        loadAvailableInboxes();
      }
    }
  }, [isOpen, lead, currentWorkspace?.id]); // ✅ Agora reage a mudanças no lead

  // ✅ Gerenciar seleção de telefone
  useEffect(() => {
    const phones = getAllPhones();
    if (phones.length > 0) {
      // Se não tem selecionado ou o selecionado não existe mais na lista (troca de lead)
      const currentExists = phones.some(p => p.value === selectedPhone);
      if (!selectedPhone || !currentExists) {
        setSelectedPhone(phones[0].value);
      }
    } else {
      setSelectedPhone('');
    }
  }, [formData, customFields]);

  // ✅ Handler para alteração de campos personalizados
  const handleCustomFieldChange = (fieldId: string, value: string) => {
    const updatedFields = customFields.map(f => 
      f.id === fieldId ? { ...f, fieldValue: value } : f
    );
    setCustomFields(updatedFields);
    setFormData(prev => prev ? ({ ...prev, customFields: updatedFields }) : null);
  };

  // ✅ Carregar inboxes disponíveis
  const loadAvailableInboxes = async () => {
    if (!currentWorkspace?.id) return;
    
    setLoadingInboxes(true);
    try {
      // ✅ JOIN para pegar o provider da instance
      const { data, error } = await supabase
        .from('inboxes')
        .select(`
          id, 
          name,
          inbox_instances!inner(
            instances!inner(
              provider
            )
          )
        `)
        .eq('workspace_id', currentWorkspace.id)
        .order('name');
      
      if (error) throw error;
      
      // ✅ Mapear dados para formato mais simples
      const mappedInboxes = (data || []).map((inbox: any) => ({
        id: inbox.id,
        name: inbox.name,
        channel: inbox.inbox_instances?.[0]?.instances?.provider || 'desconhecido'
      }));
      
      setAvailableInboxes(mappedInboxes);
      // Selecionar primeira inbox por padrão
      if (mappedInboxes.length > 0) {
        setSelectedInboxId(mappedInboxes[0].id);
      }
    } catch (error) {
      console.error('[LeadFullViewModal] Erro ao carregar inboxes:', error);
      toast.error('Erro ao carregar caixas de entrada.');
    } finally {
      setLoadingInboxes(false);
    }
  };

  const fetchActivities = () => {
    if (!lead) return;
    setLoadingActivities(true);
    getLeadActivities(lead.id).then(({ activities }) => {
      setActivities(activities);
    }).finally(() => setLoadingActivities(false));
  };

  // Salvar alterações na Sidebar Direita
  const handleSidebarSave = async () => {
    if (!formData || !currentWorkspace) return;
    
    try {
      setIsSaving(true);
      
      console.log('[LeadFullViewModal] Salvando alterações:', formData);
      
      // Chamar onSave para que o componente pai gerencie a atualização
      await onSave(formData);
      
      // Recarregar atividades para mostrar logs de alteração
      fetchActivities();
      
      toast.success('Lead atualizado com sucesso!');
    } catch (error) {
      console.error('[LeadFullViewModal] Erro ao salvar lead:', error);
      toast.error('Erro ao salvar lead. Tente novamente.');
    } finally {
      setIsSaving(false);
    }
  };

  // ✅ Criar conversa manual com o lead
  const handleCreateConversation = async () => {
    console.log('🔵 [LeadFullViewModal] BOTÃO CLICADO - handleCreateConversation executado');
    
    if (!formData || !currentWorkspace?.id) {
      console.log('❌ [LeadFullViewModal] formData ou currentWorkspace ausente', { formData, currentWorkspace });
      return;
    }

    const inboxId = selectedInboxId;
    if (!inboxId) {
      console.error('[LeadFullViewModal] Inbox não selecionada');
      toast.error('Nenhuma caixa de entrada selecionada.');
      return;
    }

    // ✅ Obter telefone do lead
    const phone = selectedPhone;
    if (!phone) {
      console.error('[LeadFullViewModal] Lead sem telefone');
      toast.error('Lead precisa ter um telefone para criar conversa.');
      return;
    }

    console.log('[LeadFullViewModal] Iniciando criação de conversa...');
    setIsCreatingConversation(true);

    try {
      // Limpar telefone (apenas números)
      const cleanPhone = phone.replace(/\D/g, '');

      console.log('[LeadFullViewModal] Dados da conversa:', {
        workspace_id: currentWorkspace.id,
        inbox_id: inboxId,
        contact_name: formData.clientName,
        contact_phone: cleanPhone,
        lead_id: formData.id,
      });

      const newConversation = await createConversation({
        workspace_id: currentWorkspace.id,
        inbox_id: inboxId,
        contact_name: formData.clientName,
        contact_phone: cleanPhone,
        status: 'waiting',
        channel: 'chat',
        lead_id: formData.id,
      });

      console.log('[LeadFullViewModal] Conversa criada com sucesso:', newConversation);

      // ✅ Atualizar o estado diretamente para feedback imediato
      setConversation(newConversation);
      
      toast.success('Conversa iniciada com sucesso!');
    } catch (error) {
      console.error('[LeadFullViewModal] Erro ao criar conversa:', error);
      toast.error('Erro ao criar conversa. Tente novamente.');
    } finally {
      setIsCreatingConversation(false);
    }
  };

  if (!isOpen || !formData) return null;

  // ✅ Debug: verificar se as props de navegação estão chegando
  console.log('[LeadFullViewModal] Navigation props:', {
    hasNavigateNext: !!onNavigateNext,
    hasNavigatePrev: !!onNavigatePrev,
    navigationState
  });

  console.log('[LeadFullViewModal] RENDERIZANDO JSX');

  return (
    <div 
      className="fixed inset-0 flex items-center justify-center p-4 sm:p-6 overflow-hidden"
      style={{ zIndex: 9999 }}
    >
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div 
        className={`relative w-full max-w-[95vw] h-[90vh] flex flex-col rounded-xl shadow-2xl overflow-hidden ${
          isDark ? 'bg-elevated border border-white/[0.08]' : 'bg-white border border-border-light'
        }`}
        style={{ zIndex: 10000 }}
      >
        
        {/* Header */}
        <div className={`flex items-center justify-between px-6 py-4 border-b ${
           isDark ? 'border-white/[0.08] bg-true-black' : 'border-border-light bg-gray-50'
        }`}>
           <div className="flex items-center gap-4">
              <Avatar imageUrl={formData.avatar} name={formData.clientName} size="md" />
              <div>
                 <h2 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-text-primary-light'}`}>
                    {formData.clientName}
                 </h2>
                 <p className={`text-sm ${isDark ? 'text-white/50' : 'text-text-secondary-light'}`}>
                    {formData.company || 'Sem empresa'}
                 </p>
              </div>
              {/* Status Badge */}
              <div className={`px-3 py-1 rounded-full text-xs font-medium border ${
                 formData.priority === 'high' 
                   ? 'bg-red-500/10 text-red-500 border-red-500/20' 
                   : formData.priority === 'medium'
                   ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
                   : 'bg-green-500/10 text-green-500 border-green-500/20'
              }`}>
                 Prioridade {formData.priority === 'high' ? 'Alta' : formData.priority === 'medium' ? 'Média' : 'Baixa'}
              </div>
           </div>

           <div className="flex items-center gap-3">
              <button 
                onClick={handleSidebarSave}
                disabled={isSaving}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors ${
                  isSaving 
                    ? 'bg-gray-400 cursor-not-allowed opacity-60' 
                    : 'bg-[#0169D9] hover:bg-[#0169D9]/90'
                } text-white`}
              >
                 <Save className={`w-4 h-4 ${isSaving ? 'animate-spin' : ''}`} />
                 {isSaving ? 'Salvando...' : 'Salvar Alterações'}
              </button>
              <button 
                onClick={onClose}
                className={`p-2 rounded-lg transition-colors ${
                   isDark ? 'hover:bg-white/[0.05] text-white/60' : 'hover:bg-gray-100 text-gray-500'
                }`}
              >
                 <X className="w-5 h-5" />
              </button>
           </div>
        </div>

        {/* Main Body */}
        <div className="flex flex-1 overflow-hidden">
           
           {/* Left Column - Main Content (Tabs) */}
           <div className="flex-1 flex flex-col min-w-0 border-r border-border-light dark:border-white/[0.08]">
              {/* Tabs Header */}
              <div className={`flex items-center px-6 border-b ${
                 isDark ? 'border-white/[0.08] bg-true-black' : 'border-border-light bg-white'
              }`}>
                 <button
                    onClick={() => setActiveTab('chat')}
                    className={`flex items-center gap-2 px-4 py-3 border-b-2 text-sm font-medium transition-colors ${
                       activeTab === 'chat'
                          ? 'border-[#0169D9] text-[#0169D9]'
                          : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                    }`}
                 >
                    <MessageSquare className="w-4 h-4" />
                    Chat
                 </button>
                 <button
                    onClick={() => setActiveTab('data')}
                    className={`flex items-center gap-2 px-4 py-3 border-b-2 text-sm font-medium transition-colors ${
                       activeTab === 'data'
                          ? 'border-[#0169D9] text-[#0169D9]'
                          : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                    }`}
                 >
                    <FileText className="w-4 h-4" />
                    Campos Personalizados
                 </button>
                 <button
                    onClick={() => setActiveTab('activities')}
                    className={`flex items-center gap-2 px-4 py-3 border-b-2 text-sm font-medium transition-colors ${
                       activeTab === 'activities'
                          ? 'border-[#0169D9] text-[#0169D9]'
                          : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                    }`}
                 >
                    <Activity className="w-4 h-4" />
                    Atividades
                 </button>
              </div>

              {/* Tab Content */}
              <div className={`flex-1 overflow-hidden relative ${
                 isDark ? 'bg-true-black' : 'bg-gray-50'
              }`}>
                 {activeTab === 'chat' && (
                    <div className={`w-full h-full flex flex-col ${
                      isDark ? 'bg-true-black' : 'bg-light-bg'
                    }`}>
                       {conversation ? (
                          <ChatArea 
                             conversation={conversation}
                             theme={theme}
                             onSendMessage={sendMessage}
                             onMarkAsResolved={markAsResolved}
                             onClearHistory={clearHistory}
                             onDeleteConversation={deleteConversation}
                             onDeleteMessage={deleteMessage}
                             // onNavigateToPipeline ignorado pois já estamos no contexto do lead
                          />
                       ) : (
                          <div className="flex-1 flex items-center justify-center flex-col gap-4 p-6">
                             <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
                                isDark ? 'bg-white/10' : 'bg-gray-200'
                             }`}>
                                <MessageSquare className={`w-8 h-8 ${isDark ? 'text-white/50' : 'text-gray-400'}`} />
                             </div>
                             <p className={`text-center ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
                                Nenhuma conversa iniciada com este lead.
                             </p>
                             
                             {/* ✅ Seletor de Inbox */}
                             <div className="w-full max-w-sm space-y-3">
                                {!hasPhone ? (
                                   <div className={`p-4 rounded-lg border text-center space-y-2 ${
                                      isDark ? 'bg-yellow-500/10 border-yellow-500/20' : 'bg-yellow-50 border-yellow-200'
                                   }`}>
                                      <Phone className={`w-8 h-8 mx-auto ${isDark ? 'text-yellow-400' : 'text-yellow-600'}`} />
                                      <p className={`text-sm font-medium ${isDark ? 'text-yellow-400' : 'text-yellow-700'}`}>
                                         Telefone necessário
                                      </p>
                                      <p className={`text-xs ${isDark ? 'text-yellow-400/70' : 'text-yellow-600'}`}>
                                         Para iniciar uma conversa, adicione um telefone ao lead nos campos principais ou personalizados.
                                      </p>
                                   </div>
                                ) : (
                                   <>
                                      <div>
                                         <label className={`block text-xs font-medium mb-2 ${isDark ? 'text-white/60' : 'text-gray-600'}`}>
                                            Selecione a Caixa de Entrada:
                                         </label>
                                         {loadingInboxes ? (
                                            <div className={`text-sm text-center py-2 ${isDark ? 'text-white/40' : 'text-gray-400'}`}>
                                               Carregando caixas...
                                            </div>
                                         ) : availableInboxes.length > 0 ? (
                                            <select
                                               value={selectedInboxId}
                                               onChange={(e) => setSelectedInboxId(e.target.value)}
                                               className={`w-full px-3 py-2 rounded-lg text-sm border transition-colors ${
                                                  isDark 
                                                     ? 'bg-white/[0.05] text-white border-white/[0.08] focus:border-[#0169D9]' 
                                                     : 'bg-white text-gray-900 border-gray-300 focus:border-[#0169D9]'
                                               } focus:outline-none focus:ring-1 focus:ring-[#0169D9]`}
                                            >
                                               {availableInboxes.map(inbox => (
                                                  <option key={inbox.id} value={inbox.id}>
                                                     {inbox.name} ({inbox.channel})
                                                  </option>
                                               ))}
                                            </select>
                                         ) : (
                                            <div className={`text-sm text-center py-2 ${isDark ? 'text-red-400' : 'text-red-600'}`}>
                                               Nenhuma caixa de entrada disponível
                                            </div>
                                         )}
                                      </div>
                                      
                                      <div>
                                         <label className={`block text-xs font-medium mb-2 ${isDark ? 'text-white/60' : 'text-gray-600'}`}>
                                            Selecione o Telefone:
                                         </label>
                                         {availablePhones.length > 0 ? (
                                            <select
                                               value={selectedPhone}
                                               onChange={(e) => setSelectedPhone(e.target.value)}
                                               className={`w-full px-3 py-2 rounded-lg text-sm border transition-colors ${
                                                  isDark 
                                                     ? 'bg-white/[0.05] text-white border-white/[0.08] focus:border-[#0169D9]' 
                                                     : 'bg-white text-gray-900 border-gray-300 focus:border-[#0169D9]'
                                               } focus:outline-none focus:ring-1 focus:ring-[#0169D9]`}
                                            >
                                               {availablePhones.map(phone => (
                                                  <option key={phone.value} value={phone.value}>
                                                     {phone.label}
                                                  </option>
                                               ))}
                                            </select>
                                         ) : (
                                            <div className={`text-sm text-center py-2 ${isDark ? 'text-red-400' : 'text-red-600'}`}>
                                               Nenhum telefone disponível
                                            </div>
                                         )}
                                      </div>
                                      
                                      <button
                                         onClick={handleCreateConversation}
                                         disabled={isCreatingConversation || !selectedInboxId || loadingInboxes || !hasPhone}
                                         className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                                            isCreatingConversation || !selectedInboxId || loadingInboxes || !hasPhone
                                               ? 'bg-gray-400 cursor-not-allowed opacity-60'
                                               : 'bg-[#0169D9] hover:bg-[#0169D9]/90'
                                         } text-white`}
                                      >
                                         <Send className={`w-4 h-4 ${isCreatingConversation ? 'animate-spin' : ''}`} />
                                         {isCreatingConversation ? 'Criando...' : 'Iniciar Conversa'}
                                      </button>
                                   </>
                                )}
                             </div>
                          </div>
                       )}
                    </div>
                 )}

                 {activeTab === 'data' && (
                    <div className="p-6 overflow-y-auto h-full">
                       <div className="max-w-3xl mx-auto">
                          <h3 className={`text-lg font-medium mb-6 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                             Campos Personalizados
                          </h3>
                          {customFields.length > 0 ? (
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {customFields.map(field => {
                                   const isJsonField = field.fieldName.toLowerCase().includes('json');
                                   return (
                                      <div key={field.id} className={`p-4 rounded-lg border ${
                                         isDark ? 'bg-white/[0.02] border-white/[0.08]' : 'bg-white border-gray-200'
                                      } ${isJsonField ? 'md:col-span-2' : ''}`}>
                                         <label className={`block text-xs font-medium mb-1.5 ${
                                            isDark ? 'text-white/60' : 'text-gray-500'
                                         }`}>
                                            {field.fieldName}
                                         </label>
                                         {(() => {
                                            // ✅ NOVA LÓGICA: Tentar detectar JSON automaticamente
                                            let isComplex = false;
                                            let parsedValue = null;
                                            
                                            try {
                                               parsedValue = JSON.parse(field.fieldValue);
                                               // Verificar se é um objeto ou array (não string/number/boolean)
                                               isComplex = typeof parsedValue === 'object' && parsedValue !== null;
                                            } catch {
                                               isComplex = false;
                                            }
                                            
                                            // Se for um campo complexo (JSON), renderizar inline editável
                                            if (isComplex) {
                                               const isEditing = editingFieldId === field.id;
                                               
                                               // ===== EMAIL DO DOMÍNIO (objeto único) =====
                                               if (!Array.isArray(parsedValue) && parsedValue.address && parsedValue.source !== undefined) {
                                                  const domainEmail = parsedValue as DomainEmailEntry;
                                                  const updateField = (key: keyof DomainEmailEntry, value: any) => {
                                                     const updated = { ...domainEmail, [key]: value };
                                                     handleCustomFieldChange(field.id, JSON.stringify(updated));
                                                  };
                                                  
                                                  return (
                                                     <div 
                                                        onClick={() => !isEditing && setEditingFieldId(field.id)}
                                                        className={`flex items-start gap-2 p-2 rounded border cursor-pointer transition-all ${
                                                           isDark ? 'border-white/[0.05] bg-white/[0.02] hover:bg-white/[0.05]' : 'border-gray-100 bg-gray-50 hover:bg-gray-100'
                                                        } ${isEditing ? 'ring-2 ring-[#0169D9]' : ''}`}
                                                     >
                                                        <Mail className="w-4 h-4 opacity-50 mt-0.5 flex-shrink-0" />
                                                        <div className="flex-1 min-w-0">
                                                           {isEditing ? (
                                                              <input
                                                                 type="email"
                                                                 value={domainEmail.address}
                                                                 onChange={(e) => updateField('address', e.target.value)}
                                                                 onBlur={() => setEditingFieldId(null)}
                                                                 autoFocus
                                                                 onClick={(e) => e.stopPropagation()}
                                                                 className={`w-full text-sm bg-transparent border-none outline-none ${isDark ? 'text-white' : 'text-gray-900'}`}
                                                              />
                                                           ) : (
                                                              <div className={`text-sm break-all ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                                                 {domainEmail.address}
                                                              </div>
                                                           )}
                                                           <div className="flex items-center gap-2 mt-1">
                                                              <span className="text-xs px-1.5 py-0.5 rounded bg-orange-500/10 text-orange-500">
                                                                 Domínio
                                                              </span>
                                                              <span className={`text-xs ${isDark ? 'text-white/40' : 'text-gray-400'}`}>
                                                                 {domainEmail.source}
                                                              </span>
                                                              {domainEmail.verified && (
                                                                 <CheckCircle className="w-3 h-3 text-green-500" />
                                                              )}
                                                           </div>
                                                        </div>
                                                     </div>
                                                  );
                                               }
                                               
                                               // ===== ARRAY DE EMAILS =====
                                               if (Array.isArray(parsedValue) && parsedValue.length > 0 && parsedValue[0].address && parsedValue[0].type) {
                                                  const emails = parsedValue as EmailEntry[];
                                                  const updateEmail = (index: number, key: keyof EmailEntry, value: any) => {
                                                     const updated = [...emails];
                                                     updated[index] = { ...updated[index], [key]: value };
                                                     handleCustomFieldChange(field.id, JSON.stringify(updated));
                                                  };
                                                  
                                                  return (
                                                     <div className="space-y-2">
                                                        {emails.map((email, idx) => {
                                                           const itemId = `${field.id}-${idx}`;
                                                           const isItemEditing = editingFieldId === itemId;
                                                           
                                                           return (
                                                              <div 
                                                                 key={idx}
                                                                 onClick={() => !isItemEditing && setEditingFieldId(itemId)}
                                                                 className={`flex items-start gap-2 p-2 rounded border cursor-pointer transition-all ${
                                                                    isDark ? 'border-white/[0.05] bg-white/[0.02] hover:bg-white/[0.05]' : 'border-gray-100 bg-gray-50 hover:bg-gray-100'
                                                                 } ${isItemEditing ? 'ring-2 ring-[#0169D9]' : ''}`}
                                                              >
                                                                 <Mail className="w-4 h-4 opacity-50 mt-0.5 flex-shrink-0" />
                                                                 <div className="flex-1 min-w-0">
                                                                    {isItemEditing ? (
                                                                       <input
                                                                          type="email"
                                                                          value={email.address}
                                                                          onChange={(e) => updateEmail(idx, 'address', e.target.value)}
                                                                          onBlur={() => setEditingFieldId(null)}
                                                                          autoFocus
                                                                          onClick={(e) => e.stopPropagation()}
                                                                          className={`w-full text-sm bg-transparent border-none outline-none ${isDark ? 'text-white' : 'text-gray-900'}`}
                                                                       />
                                                                    ) : (
                                                                       <div className={`text-sm break-all ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                                                          {email.address}
                                                                       </div>
                                                                    )}
                                                                    <div className="flex items-center gap-2 mt-1">
                                                                       <span className={`text-xs px-1.5 py-0.5 rounded ${
                                                                          email.type === 'main' ? 'bg-blue-500/10 text-blue-500' : 'bg-gray-500/10 text-gray-500'
                                                                       }`}>
                                                                          {email.type === 'main' ? 'Principal' : 'Contato'}
                                                                       </span>
                                                                       <span className={`text-xs ${isDark ? 'text-white/40' : 'text-gray-400'}`}>
                                                                          {email.source}
                                                                       </span>
                                                                       {email.verified && (
                                                                          <CheckCircle className="w-3 h-3 text-green-500" />
                                                                       )}
                                                                    </div>
                                                                 </div>
                                                              </div>
                                                           );
                                                        })}
                                                     </div>
                                                  );
                                               }
                                               
                                               // ===== ARRAY DE TELEFONES =====
                                               if (Array.isArray(parsedValue) && parsedValue.length > 0 && parsedValue[0].with_country) {
                                                  const phones = parsedValue as PhoneEntry[];
                                                  const updatePhone = (index: number, key: keyof PhoneEntry, value: any) => {
                                                     const updated = [...phones];
                                                     updated[index] = { ...updated[index], [key]: value };
                                                     handleCustomFieldChange(field.id, JSON.stringify(updated));
                                                  };
                                                  
                                                  return (
                                                     <div className="space-y-2">
                                                        {phones.map((phone, idx) => {
                                                           const itemId = `${field.id}-${idx}`;
                                                           const isItemEditing = editingFieldId === itemId;
                                                           
                                                           return (
                                                              <div 
                                                                 key={idx}
                                                                 onClick={() => !isItemEditing && setEditingFieldId(itemId)}
                                                                 className={`flex items-start gap-2 p-2 rounded border cursor-pointer transition-all ${
                                                                    isDark ? 'border-white/[0.05] bg-white/[0.02] hover:bg-white/[0.05]' : 'border-gray-100 bg-gray-50 hover:bg-gray-100'
                                                                 } ${isItemEditing ? 'ring-2 ring-[#0169D9]' : ''}`}
                                                              >
                                                                 <Phone className="w-4 h-4 opacity-50 mt-0.5 flex-shrink-0" />
                                                                 <div className="flex-1 min-w-0">
                                                                    {isItemEditing ? (
                                                                       <input
                                                                          type="text"
                                                                          value={phone.with_country}
                                                                          onChange={(e) => updatePhone(idx, 'with_country', e.target.value)}
                                                                          onBlur={() => setEditingFieldId(null)}
                                                                          autoFocus
                                                                          onClick={(e) => e.stopPropagation()}
                                                                          className={`w-full text-sm bg-transparent border-none outline-none ${isDark ? 'text-white' : 'text-gray-900'}`}
                                                                       />
                                                                    ) : (
                                                                       <div className={`text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                                                          {phone.with_country}
                                                                       </div>
                                                                    )}
                                                                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                                                                       <span className={`text-xs px-1.5 py-0.5 rounded ${
                                                                          phone.type === 'mobile' ? 'bg-purple-500/10 text-purple-500' : 'bg-gray-500/10 text-gray-500'
                                                                       }`}>
                                                                          {phone.type === 'mobile' ? 'Celular' : 'Fixo'}
                                                                       </span>
                                                                       <span className={`text-xs ${isDark ? 'text-white/40' : 'text-gray-400'}`}>
                                                                          {phone.source}
                                                                       </span>
                                                                       {phone.whatsapp && (
                                                                          <span className="text-xs px-1.5 py-0.5 rounded bg-green-500/10 text-green-500">
                                                                             WhatsApp
                                                                          </span>
                                                                       )}
                                                                       {phone.verified && (
                                                                          <CheckCircle className="w-3 h-3 text-green-500" />
                                                                       )}
                                                                    </div>
                                                                 </div>
                                                              </div>
                                                           );
                                                        })}
                                                     </div>
                                                  );
                                               }
                                               
                                               // ===== ARRAY DE WEBSITES =====
                                               if (Array.isArray(parsedValue) && parsedValue.length > 0 && parsedValue[0].url && parsedValue[0].domain) {
                                                  const websites = parsedValue as WebsiteEntry[];
                                                  const updateWebsite = (index: number, key: keyof WebsiteEntry, value: any) => {
                                                     const updated = [...websites];
                                                     updated[index] = { ...updated[index], [key]: value };
                                                     handleCustomFieldChange(field.id, JSON.stringify(updated));
                                                  };
                                                  
                                                  return (
                                                     <div className="space-y-2">
                                                        {websites.map((website, idx) => {
                                                           const itemId = `${field.id}-${idx}`;
                                                           const isItemEditing = editingFieldId === itemId;
                                                           
                                                           return (
                                                              <div 
                                                                 key={idx}
                                                                 onClick={() => !isItemEditing && setEditingFieldId(itemId)}
                                                                 className={`flex items-start gap-2 p-2 rounded border cursor-pointer transition-all ${
                                                                    isDark ? 'border-white/[0.05] bg-white/[0.02] hover:bg-white/[0.05]' : 'border-gray-100 bg-gray-50 hover:bg-gray-100'
                                                                 } ${isItemEditing ? 'ring-2 ring-[#0169D9]' : ''}`}
                                                              >
                                                                 <Globe className="w-4 h-4 opacity-50 mt-0.5 flex-shrink-0" />
                                                                 <div className="flex-1 min-w-0">
                                                                    {isItemEditing ? (
                                                                       <input
                                                                          type="url"
                                                                          value={website.url}
                                                                          onChange={(e) => updateWebsite(idx, 'url', e.target.value)}
                                                                          onBlur={() => setEditingFieldId(null)}
                                                                          autoFocus
                                                                          onClick={(e) => e.stopPropagation()}
                                                                          className={`w-full text-sm bg-transparent border-none outline-none ${isDark ? 'text-blue-400' : 'text-blue-600'}`}
                                                                       />
                                                                    ) : (
                                                                       <a 
                                                                          href={website.url} 
                                                                          target="_blank" 
                                                                          rel="noopener noreferrer"
                                                                          onClick={(e) => e.stopPropagation()}
                                                                          className={`text-sm break-all hover:underline ${isDark ? 'text-blue-400' : 'text-blue-600'}`}
                                                                       >
                                                                          {website.url}
                                                                       </a>
                                                                    )}
                                                                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                                                                       <span className={`text-xs px-1.5 py-0.5 rounded ${
                                                                          website.type === 'main' 
                                                                             ? 'bg-blue-500/10 text-blue-500' 
                                                                             : website.type === 'social'
                                                                             ? 'bg-pink-500/10 text-pink-500'
                                                                             : 'bg-gray-500/10 text-gray-500'
                                                                       }`}>
                                                                          {website.type === 'main' ? 'Principal' : website.type === 'social' ? 'Rede Social' : website.type}
                                                                       </span>
                                                                       <span className={`text-xs ${isDark ? 'text-white/40' : 'text-gray-400'}`}>
                                                                          {website.domain}
                                                                       </span>
                                                                       <span className={`text-xs ${isDark ? 'text-white/40' : 'text-gray-400'}`}>
                                                                          • {website.source}
                                                                       </span>
                                                                    </div>
                                                                 </div>
                                                              </div>
                                                           );
                                                        })}
                                                     </div>
                                                  );
                                               }
                                               
                                               // JSON desconhecido - fallback
                                               return (
                                                  <div className={`text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                                     {renderFieldValue(field, isDark)}
                                                  </div>
                                               );
                                            }
                                            
                                            // Caso contrário, renderizar como campo editável
                                            return field.fieldType === 'textarea' ? (
                                                <textarea
                                                   value={field.fieldValue}
                                                   onChange={(e) => handleCustomFieldChange(field.id, e.target.value)}
                                                   rows={3}
                                                   className={`w-full px-3 py-2 rounded-lg border text-sm transition-all focus:outline-none focus:border-[#0169D9] ${
                                                      isDark
                                                         ? 'bg-transparent border-transparent text-white placeholder-white/30 hover:bg-white/[0.05] hover:border-white/[0.1] focus:bg-white/[0.05]'
                                                         : 'bg-transparent border-transparent text-gray-900 placeholder-gray-400 hover:bg-gray-50 hover:border-gray-200 focus:bg-white'
                                                   }`}
                                                   placeholder="Vazio"
                                                />
                                            ) : (
                                                <input
                                                   type={field.fieldType === 'number' ? 'number' : field.fieldType === 'date' ? 'date' : 'text'}
                                                   value={field.fieldValue}
                                                   onChange={(e) => handleCustomFieldChange(field.id, e.target.value)}
                                                   className={`w-full px-3 py-2 rounded-lg border text-sm transition-all focus:outline-none focus:border-[#0169D9] ${
                                                      isDark
                                                         ? 'bg-transparent border-transparent text-white placeholder-white/30 hover:bg-white/[0.05] hover:border-white/[0.1] focus:bg-white/[0.05]'
                                                         : 'bg-transparent border-transparent text-gray-900 placeholder-gray-400 hover:bg-gray-50 hover:border-gray-200 focus:bg-white'
                                                   }`}
                                                   placeholder="Vazio"
                                                />
                                            );
                                         })()}
                                      </div>
                                   );
                                })}
                             </div>
                          ) : (
                             <div className={`text-center py-12 rounded-lg border border-dashed ${
                                isDark ? 'border-white/[0.08] text-white/40' : 'border-gray-300 text-gray-500'
                             }`}>
                                Nenhum campo personalizado configurado.
                             </div>
                          )}
                       </div>
                    </div>
                 )}

                 {activeTab === 'activities' && (
                    <div className="p-6 overflow-y-auto h-full">
                       <div className="max-w-3xl mx-auto">
                          <h3 className={`text-lg font-medium mb-6 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                             Timeline de Atividades
                          </h3>
                          <div className="space-y-6">
                             {loadingActivities ? (
                                <div className="text-center py-4">Carregando...</div>
                             ) : activities.length > 0 ? (
                                activities.map((activity) => (
                                   <div key={activity.id} className="flex gap-4">
                                      <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                                         isDark ? 'bg-white/10' : 'bg-gray-200'
                                      }`}>
                                         <Activity className="w-5 h-5 opacity-50" />
                                      </div>
                                      <div className="flex-1">
                                         <div className={`text-sm font-medium mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                            {activity.description || activity.message || activity.activity_type || activity.type || "Atividade registrada"}
                                         </div>
                                         <div className={`text-xs flex items-center gap-1 ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
                                            <span>{formatActivityTime(activity.created_at)}</span>
                                            {activity.users && (
                                               <>
                                                  <span>•</span>
                                                  <span>por {activity.users.name}</span>
                                               </>
                                            )}
                                         </div>
                                      </div>
                                   </div>
                                ))
                             ) : (
                                <div className={`text-center py-12 rounded-lg border border-dashed ${
                                   isDark ? 'border-white/[0.08] text-white/40' : 'border-gray-300 text-gray-500'
                                }`}>
                                   Nenhuma atividade registrada.
                                </div>
                             )}
                          </div>
                       </div>
                    </div>
                 )}
              </div>
           </div>

           {/* Right Column - Sidebar */}
           <div className={`w-80 flex-shrink-0 border-l overflow-y-auto scrollbar-thin ${
              isDark ? 'border-white/[0.08] bg-elevated' : 'border-border-light bg-white'
           }`}>
              <div className="p-6 space-y-6">
                 
                 {/* Section: Details */}
                 <div>
                    <h4 className={`text-xs font-bold uppercase tracking-wider mb-4 ${
                       isDark ? 'text-white/40' : 'text-gray-500'
                    }`}>
                       Detalhes
                    </h4>
                    
                    <div className="space-y-4">
                       <div className="group">
                          <label className={`block text-xs mb-1 ${isDark ? 'text-white/60' : 'text-gray-500'}`}>Organização</label>
                          <div className="flex items-center gap-2">
                             <Building2 className="w-4 h-4 opacity-50" />
                             <input 
                                type="text"
                                value={formData.company || ''}
                                onChange={e => setFormData({...formData, company: e.target.value})}
                                className={`bg-transparent border-none p-0 w-full text-sm focus:ring-0 ${
                                   isDark ? 'text-white' : 'text-gray-900'
                                }`}
                                placeholder="Adicionar empresa..."
                             />
                          </div>
                       </div>

                       <div className="group">
                          <label className={`block text-xs mb-1 ${isDark ? 'text-white/60' : 'text-gray-500'}`}>Valor do Negócio</label>
                          <div className="flex items-center gap-2">
                             <DollarSign className="w-4 h-4 opacity-50" />
                             <input 
                                type="number"
                                value={formData.dealValue || ''}
                                onChange={e => setFormData({...formData, dealValue: Number(e.target.value)})}
                                className={`bg-transparent border-none p-0 w-full text-sm focus:ring-0 ${
                                   isDark ? 'text-white' : 'text-gray-900'
                                }`}
                                placeholder="R$ 0,00"
                             />
                          </div>
                       </div>

                       <div className="group">
                          <label className={`block text-xs mb-1 ${isDark ? 'text-white/60' : 'text-gray-500'}`}>Previsão de Fechamento</label>
                          <div className="flex items-center gap-2">
                             <Calendar className="w-4 h-4 opacity-50" />
                             <input 
                                type="date"
                                value={formData.dueDate || ''}
                                onChange={e => setFormData({...formData, dueDate: e.target.value})}
                                className={`bg-transparent border-none p-0 w-full text-sm focus:ring-0 ${
                                   isDark ? 'text-white' : 'text-gray-900'
                                }`}
                             />
                          </div>
                       </div>
                    </div>
                 </div>

                 <div className={`h-px ${isDark ? 'bg-white/[0.08]' : 'bg-gray-200'}`} />

                 {/* Section: Person */}
                 <div>
                    <h4 className={`text-xs font-bold uppercase tracking-wider mb-4 ${
                       isDark ? 'text-white/40' : 'text-gray-500'
                    }`}>
                       Pessoa
                    </h4>
                    
                    <div className="space-y-4">
                       <div className="group">
                          <label className={`block text-xs mb-1 ${isDark ? 'text-white/60' : 'text-gray-500'}`}>Nome Completo</label>
                          <div className="flex items-center gap-2">
                             <User className="w-4 h-4 opacity-50" />
                             <input 
                                type="text"
                                value={formData.clientName}
                                onChange={e => setFormData({...formData, clientName: e.target.value})}
                                className={`bg-transparent border-none p-0 w-full text-sm focus:ring-0 ${
                                   isDark ? 'text-white' : 'text-gray-900'
                                }`}
                             />
                          </div>
                       </div>
                    </div>
                 </div>

                 <div className={`h-px ${isDark ? 'bg-white/[0.08]' : 'bg-gray-200'}`} />

                 {/* Notes */}
                 <div>
                    <h4 className={`text-xs font-bold uppercase tracking-wider mb-4 ${
                       isDark ? 'text-white/40' : 'text-gray-500'
                    }`}>
                       Notas
                    </h4>
                    <textarea
                       value={formData.notes || ''}
                       onChange={e => setFormData({...formData, notes: e.target.value})}
                       className={`w-full p-3 rounded-lg text-sm resize-none h-32 focus:outline-none focus:ring-1 focus:ring-[#0169D9] ${
                          isDark 
                            ? 'bg-white/[0.05] text-white placeholder-white/30 border border-white/[0.08]' 
                            : 'bg-gray-50 text-gray-900 border border-gray-200'
                       }`}
                       placeholder="Adicionar notas sobre o lead..."
                    />
                 </div>

              </div>
           </div>

        </div>
      </div>
    </div>
  );
}